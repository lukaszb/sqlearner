import Database from 'better-sqlite3'
import AdmZip from 'adm-zip'
import { app, type BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
import { ipcChannels } from '@/shared/ipc.js'
import { splitSqlStatements } from '@/shared/sql-statements.js'
import type { ProgressUpdate, QueryResult, SessionSummary, TablePreview, TableSummary } from '@/shared/types.js'
import { createPreparingSession, markSessionUsed, saveSession } from './session-service.js'

const kaggleDatasetHandle = 'olistbr/brazilian-ecommerce'
const kaggleDatasetUrl = `https://www.kaggle.com/api/v1/datasets/download/${kaggleDatasetHandle}`
const kaggleCacheMaxAgeMs = 30 * 24 * 60 * 60 * 1000
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

export function isKaggleCacheFresh(modifiedAtMs: number, nowMs = Date.now()): boolean {
  return nowMs - modifiedAtMs <= kaggleCacheMaxAgeMs
}

function assertCompleteKaggleArchive(archivePath: string): void {
  const csvFiles = new AdmZip(archivePath)
    .getEntries()
    .filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.csv'))
    .map((entry) => entry.entryName)
  assertCompleteKaggleDataset(csvFiles)
}

async function hasFreshKaggleCache(archivePath: string): Promise<boolean> {
  try {
    const cacheStat = await stat(archivePath)
    if (!isKaggleCacheFresh(cacheStat.mtimeMs)) return false
    assertCompleteKaggleArchive(archivePath)
    return true
  } catch {
    return false
  }
}

async function downloadKaggleArchive(archivePath: string): Promise<void> {
  const temporaryPath = `${archivePath}.download`

  try {
    const response = await fetch(kaggleDatasetUrl, { redirect: 'follow' })
    if (!response.ok) {
      throw new Error(`Kaggle download failed with HTTP ${response.status}`)
    }

    await writeFile(temporaryPath, Buffer.from(await response.arrayBuffer()))
    assertCompleteKaggleArchive(temporaryPath)
    await rm(archivePath, { force: true })
    await rename(temporaryPath, archivePath)
  } catch (error) {
    await rm(temporaryPath, { force: true })
    throw error
  }
}

async function downloadKaggleDataset(session: SessionSummary, window: BrowserWindow): Promise<string> {
  const outputDir = path.join(session.folderPath, 'kaggle-data')
  const cacheDirectory = path.join(app.getPath('userData'), 'cache', 'kaggle')
  const archivePath = path.join(cacheDirectory, 'brazilian-ecommerce.zip')
  await mkdir(cacheDirectory, { recursive: true })

  if (await hasFreshKaggleCache(archivePath)) {
    sendProgress(window, {
      sessionId: session.id,
      label: 'Using cached Olist dataset',
      percent: 25
    })
  } else {
    sendProgress(window, {
      sessionId: session.id,
      label: 'Downloading the complete Olist dataset from Kaggle',
      percent: 25
    })
    await downloadKaggleArchive(archivePath)
  }

  sendProgress(window, {
    sessionId: session.id,
    label: 'Extracting Kaggle dataset',
    percent: 35
  })

  await mkdir(outputDir, { recursive: true })
  new AdmZip(archivePath).extractAllTo(outputDir, true)
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
    await rm(datasetPath, { recursive: true, force: true })
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

export function executeSql(db: Database.Database, sql: string): QueryResult {
  const started = performance.now()
  const statements = splitSqlStatements(sql)
  if (statements.length === 0) throw new Error('Write a SQL statement before running it')

  let result: QueryResult | undefined
  let changes = 0

  for (const single of statements) {
    const statement = db.prepare(single)
    if (statement.reader) {
      const rows = statement.all() as Record<string, unknown>[]
      const columns = rows[0] ? Object.keys(rows[0]) : statement.columns().map((column) => column.name)
      result = { columns, rows, elapsedMs: 0 }
      continue
    }

    const info = statement.run()
    changes += info.changes
    result = { columns: [], rows: [], elapsedMs: 0, changes: info.changes }
  }

  const elapsedMs = Math.round(performance.now() - started)
  const last = result ?? { columns: [], rows: [], elapsedMs }
  const parts: string[] = []
  if (statements.length > 1) parts.push(`${statements.length} statements executed`)
  if (changes > 0) parts.push(changes === 1 ? '1 row affected' : `${changes} rows affected`)
  else if (last.columns.length === 0 && statements.length === 1) parts.push('0 rows affected')

  return {
    ...last,
    elapsedMs,
    changes: changes > 0 ? changes : last.changes,
    message: parts.length > 0 ? parts.join(', ') : undefined
  }
}

export async function runQuery(session: SessionSummary, sql: string): Promise<QueryResult> {
  const db = openSessionDatabase(await markSessionUsed(session))
  try {
    return executeSql(db, sql)
  } finally {
    db.close()
  }
}

export function getSandboxPath(session: SessionSummary): string {
  return path.join(session.folderPath, 'practice.sqlite')
}

async function createSandbox(session: SessionSummary): Promise<string> {
  const sandboxPath = getSandboxPath(session)
  if (!existsSync(session.databasePath)) {
    throw new Error(`Database file is missing: ${session.databasePath}`)
  }

  const source = new Database(session.databasePath, { readonly: true })
  try {
    await source.backup(sandboxPath)
  } finally {
    source.close()
  }

  return sandboxPath
}

/** The writable copy used by the lessons that change data. */
export async function ensureSandbox(session: SessionSummary): Promise<string> {
  const sandboxPath = getSandboxPath(session)
  if (existsSync(sandboxPath)) return sandboxPath
  return createSandbox(session)
}

export async function resetSandbox(session: SessionSummary): Promise<string> {
  const sandboxPath = getSandboxPath(session)
  await Promise.all([
    rm(sandboxPath, { force: true }),
    rm(`${sandboxPath}-wal`, { force: true }),
    rm(`${sandboxPath}-shm`, { force: true })
  ])
  return createSandbox(session)
}

/**
 * Runs a lesson statement. Read-only lessons use the session database, lessons
 * that change data use the practice sandbox so the imported dataset stays intact.
 */
export async function runLessonQuery(
  session: SessionSummary,
  sql: string,
  useSandbox: boolean
): Promise<QueryResult> {
  const usedSession = await markSessionUsed(session)
  if (!useSandbox) return runQuery(usedSession, sql)

  const db = new Database(await ensureSandbox(usedSession))
  try {
    return executeSql(db, sql)
  } finally {
    db.close()
  }
}
