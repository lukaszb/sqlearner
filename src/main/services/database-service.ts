import Database from 'better-sqlite3'
import AdmZip from 'adm-zip'
import type { BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
import { ipcChannels } from '@/shared/ipc.js'
import type { ProgressUpdate, QueryResult, SessionSummary, TablePreview, TableSummary } from '@/shared/types.js'
import { createPreparingSession, markSessionUsed, saveSession } from './session-service.js'

const kaggleDatasetHandle = 'olistbr/brazilian-ecommerce'
const kaggleDatasetUrl = `https://www.kaggle.com/api/v1/datasets/download/${kaggleDatasetHandle}`
const expectedCsvFiles = new Set([
  'olist_customers_dataset.csv',
  'olist_geolocation_dataset.csv',
  'olist_order_items_dataset.csv',
  'olist_order_payments_dataset.csv',
  'olist_order_reviews_dataset.csv',
  'olist_orders_dataset.csv',
  'olist_products_dataset.csv',
  'olist_sellers_dataset.csv',
  'product_category_name_translation.csv'
])

function sendProgress(window: BrowserWindow, update: ProgressUpdate): void {
  window.webContents.send(ipcChannels.progress, update)
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

function sanitizeIdentifier(identifier: string): string {
  return identifier
    .replace(/\.csv$/i, '')
    .replace(/^olist_/, '')
    .replace(/_dataset$/, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
}

async function findCsvFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return findCsvFiles(entryPath)
      if (entry.isFile() && entry.name.endsWith('.csv')) return [entryPath]
      return []
    })
  )

  return files.flat().sort()
}

export function assertCompleteKaggleDataset(csvFiles: string[]): void {
  const downloadedFiles = new Set(csvFiles.map((file) => path.basename(file)))
  const missingFiles = [...expectedCsvFiles].filter((file) => !downloadedFiles.has(file))

  if (missingFiles.length > 0) {
    throw new Error(`Kaggle dataset is incomplete. Missing: ${missingFiles.join(', ')}`)
  }
}

async function downloadKaggleDataset(session: SessionSummary, window: BrowserWindow): Promise<string> {
  const outputDir = path.join(session.folderPath, 'kaggle-data')
  const archivePath = path.join(session.folderPath, 'brazilian-ecommerce.zip')
  sendProgress(window, {
    sessionId: session.id,
    label: 'Downloading the complete Olist dataset from Kaggle',
    percent: 25
  })

  const response = await fetch(kaggleDatasetUrl, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`Kaggle download failed with HTTP ${response.status}`)
  }

  await writeFile(archivePath, Buffer.from(await response.arrayBuffer()))
  sendProgress(window, {
    sessionId: session.id,
    label: 'Extracting Kaggle dataset',
    percent: 35
  })

  await mkdir(outputDir, { recursive: true })
  new AdmZip(archivePath).extractAllTo(outputDir, true)
  await rm(archivePath, { force: true })
  return outputDir
}

async function importKaggleDirectory(datasetPath: string, databasePath: string, window: BrowserWindow, sessionId: string): Promise<number> {
  const csvFiles = await findCsvFiles(datasetPath)
  assertCompleteKaggleDataset(csvFiles)
  const db = new Database(databasePath)

  try {
    db.pragma('journal_mode = WAL')

    for (const [index, csvPath] of csvFiles.entries()) {
      const tableName = sanitizeIdentifier(path.basename(csvPath))
      const csv = await readFile(csvPath, 'utf8')
      const records = parse(csv, {
        bom: true,
        columns: true,
        skip_empty_lines: true
      }) as Record<string, string>[]

      if (records.length === 0) continue

      const columns = Object.keys(records[0])
      db.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(tableName)}`)
      db.exec(
        `CREATE TABLE ${quoteIdentifier(tableName)} (${columns
          .map((column) => `${quoteIdentifier(sanitizeIdentifier(column))} TEXT`)
          .join(', ')})`
      )

      const placeholders = columns.map(() => '?').join(', ')
      const insert = db.prepare(
        `INSERT INTO ${quoteIdentifier(tableName)} (${columns
          .map((column) => quoteIdentifier(sanitizeIdentifier(column)))
          .join(', ')}) VALUES (${placeholders})`
      )
      const transaction = db.transaction((rows: Record<string, string>[]) => {
        rows.forEach((row) => insert.run(columns.map((column) => row[column] ?? null)))
      })
      transaction(records)

      sendProgress(window, {
        sessionId,
        label: `Imported ${tableName}`,
        percent: 45 + Math.round(((index + 1) / csvFiles.length) * 50)
      })
    }
  } finally {
    db.close()
  }

  return csvFiles.length
}

export async function prepareDatabase(window: BrowserWindow): Promise<SessionSummary> {
  const session = await createPreparingSession()
  sendProgress(window, { sessionId: session.id, label: 'Creating session folder', percent: 15 })

  try {
    const datasetPath = await downloadKaggleDataset(session, window)
    sendProgress(window, { sessionId: session.id, label: 'Importing CSV files into SQLite', percent: 45 })
    await importKaggleDirectory(datasetPath, session.databasePath, window, session.id)
  } catch (error) {
    await rm(session.folderPath, { recursive: true, force: true })
    const message = error instanceof Error ? error.message : 'Unknown Kaggle download error'
    throw new Error(`Could not create the complete Kaggle database: ${message}`)
  }

  sendProgress(window, { sessionId: session.id, label: 'Finishing session', percent: 95 })

  const readySession: SessionSummary = {
    ...session,
    status: 'ready',
    lastUsedAt: new Date().toISOString()
  }
  await saveSession(readySession)
  sendProgress(window, { sessionId: session.id, label: 'Ready', percent: 100 })
  return readySession
}

export function getTableColumns(db: Database.Database, tableName: string): string[] {
  const columns = db.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all() as { name: string }[]
  return columns.map((column) => column.name)
}

function openSessionDatabase(session: SessionSummary): Database.Database {
  if (!existsSync(session.databasePath)) {
    throw new Error(`Database file is missing: ${session.databasePath}`)
  }

  return new Database(session.databasePath, { readonly: true })
}

export async function listTables(session: SessionSummary): Promise<TableSummary[]> {
  const db = openSessionDatabase(await markSessionUsed(session))
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]
  const result = tables.map((table) => ({
    name: table.name,
    rowCount: (db.prepare(`SELECT COUNT(*) as count FROM ${quoteIdentifier(table.name)}`).get() as { count: number }).count,
    columns: getTableColumns(db, table.name)
  }))
  db.close()
  return result
}

export async function getDatabaseSize(session: SessionSummary): Promise<number> {
  return (await stat(session.databasePath)).size
}

export async function previewTable(session: SessionSummary, tableName: string): Promise<TablePreview> {
  const db = openSessionDatabase(await markSessionUsed(session))
  const rows = db.prepare(`SELECT * FROM ${quoteIdentifier(tableName)} LIMIT 100`).all() as Record<string, unknown>[]
  const columns = getTableColumns(db, tableName)
  db.close()
  return { columns, rows }
}

export async function runQuery(session: SessionSummary, sql: string): Promise<QueryResult> {
  const started = performance.now()
  const db = openSessionDatabase(await markSessionUsed(session))
  const rows = db.prepare(sql).all() as Record<string, unknown>[]
  const columns = rows[0] ? Object.keys(rows[0]) : []
  db.close()
  return { columns, rows, elapsedMs: Math.round(performance.now() - started) }
}
