import Database from 'better-sqlite3'
import AdmZip from 'adm-zip'
import type { BrowserWindow } from 'electron'
import { createWriteStream, existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
import { ipcChannels } from '@/shared/ipc.js'
import type { ProgressUpdate, QueryResult, SessionSummary, TablePreview, TableSummary } from '@/shared/types.js'
import { createPreparingSession, markSessionUsed, saveSession } from './session-service.js'

const kaggleDatasetUrl = 'https://www.kaggle.com/api/v1/datasets/download/olistbr/brazilian-ecommerce'

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

function downloadFile(
  url: string,
  destination: string,
  authorization: string,
  onProgress: (percent: number) => void,
  redirects = 0
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { authorization } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && response.headers.location) {
        response.resume()
        if (redirects > 5) reject(new Error('Too many redirects while downloading Kaggle dataset'))
        else resolve(downloadFile(response.headers.location, destination, authorization, onProgress, redirects + 1))
        return
      }

      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`Kaggle download failed with HTTP ${response.statusCode}`))
        return
      }

      const total = Number(response.headers['content-length'] ?? 0)
      let downloaded = 0
      const file = createWriteStream(destination)

      response.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        if (total > 0) onProgress(Math.round((downloaded / total) * 100))
      })
      response.pipe(file)
      file.on('finish', () => {
        file.close(() => resolve())
      })
      file.on('error', reject)
    })

    request.on('error', reject)
  })
}

async function downloadKaggleDataset(session: SessionSummary, window: BrowserWindow): Promise<string | undefined> {
  const { KAGGLE_USERNAME, KAGGLE_KEY } = process.env
  if (!KAGGLE_USERNAME || !KAGGLE_KEY) return undefined

  const zipPath = path.join(session.folderPath, 'brazilian-ecommerce.zip')
  const authorization = `Basic ${Buffer.from(`${KAGGLE_USERNAME}:${KAGGLE_KEY}`).toString('base64')}`

  await downloadFile(kaggleDatasetUrl, zipPath, authorization, (percent) => {
    sendProgress(window, {
      sessionId: session.id,
      label: 'Downloading Kaggle dataset',
      percent: Math.min(55, 10 + Math.round(percent * 0.45))
    })
  })

  return zipPath
}

function importKaggleZip(zipPath: string, databasePath: string, window: BrowserWindow, sessionId: string): void {
  const db = new Database(databasePath)
  const zip = new AdmZip(zipPath)
  const csvEntries = zip.getEntries().filter((entry) => !entry.isDirectory && entry.entryName.endsWith('.csv'))

  db.pragma('journal_mode = WAL')

  csvEntries.forEach((entry, index) => {
    const tableName = sanitizeIdentifier(path.basename(entry.entryName))
    const records = parse(entry.getData().toString('utf8'), {
      bom: true,
      columns: true,
      skip_empty_lines: true
    }) as Record<string, string>[]

    if (records.length === 0) return

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
      percent: 55 + Math.round(((index + 1) / csvEntries.length) * 40)
    })
  })

  db.close()
}

function seedDatabase(databasePath: string): void {
  const db = new Database(databasePath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE customers (
      customer_id TEXT PRIMARY KEY,
      city TEXT NOT NULL,
      state TEXT NOT NULL
    );
    CREATE TABLE orders (
      order_id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      status TEXT NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    );
    INSERT INTO customers VALUES
      ('c_001', 'sao paulo', 'SP'),
      ('c_002', 'rio de janeiro', 'RJ'),
      ('c_003', 'curitiba', 'PR');
    INSERT INTO orders VALUES
      ('o_1001', 'c_001', 'delivered', 129.9),
      ('o_1002', 'c_002', 'shipped', 84.5),
      ('o_1003', 'c_003', 'delivered', 212.0);
  `)
  db.close()
}

export async function prepareDatabase(window: BrowserWindow): Promise<SessionSummary> {
  const session = await createPreparingSession()
  sendProgress(window, { sessionId: session.id, label: 'Creating session folder', percent: 15 })

  const zipPath = await downloadKaggleDataset(session, window)
  if (zipPath) {
    sendProgress(window, { sessionId: session.id, label: 'Importing CSV files into SQLite', percent: 55 })
    importKaggleZip(zipPath, session.databasePath, window, session.id)
    await rm(zipPath, { force: true })
  } else {
    sendProgress(window, { sessionId: session.id, label: 'Kaggle credentials missing; creating starter database', percent: 55 })
    seedDatabase(session.databasePath)
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
