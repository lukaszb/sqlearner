import Database from 'better-sqlite3'
import { app, type BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
import { ipcChannels } from '@/shared/ipc.js'
import type { ProgressUpdate, QueryResult, SessionSummary, TablePreview, TableSummary } from '@/shared/types.js'
import { createPreparingSession, markSessionUsed, saveSession } from './session-service.js'

const kaggleDatasetHandle = 'olistbr/brazilian-ecommerce'

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

function getPythonExecutable(): string {
  const appPath = app.getAppPath()
  const venvPython = process.platform === 'win32'
    ? path.join(appPath, '.venv', 'Scripts', 'python.exe')
    : path.join(appPath, '.venv', 'bin', 'python')

  return existsSync(venvPython) ? venvPython : 'python3'
}

function runPythonKagglehub(outputDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const code = [
      'import json',
      'import sys',
      'try:',
      '    import kagglehub',
      'except ModuleNotFoundError:',
      '    print("Python package kagglehub is not installed.", file=sys.stderr)',
      '    sys.exit(10)',
      `path = kagglehub.dataset_download(${JSON.stringify(kaggleDatasetHandle)}, output_dir=${JSON.stringify(outputDir)})`,
      'print(json.dumps({"path": path}))'
    ].join('\n')

    const child = spawn(getPythonExecutable(), ['-c', code], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `kagglehub exited with code ${code}`))
        return
      }

      try {
        const lines = stdout.trim().split('\n')
        const payload = JSON.parse(lines[lines.length - 1]) as { path: string }
        resolve(payload.path)
      } catch {
        reject(new Error(`Unable to read kagglehub output: ${stdout}`))
      }
    })
  })
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

async function downloadKaggleDataset(session: SessionSummary, window: BrowserWindow): Promise<string> {
  const outputDir = path.join(session.folderPath, 'kaggle-data')
  sendProgress(window, {
    sessionId: session.id,
    label: 'Downloading public Kaggle dataset with kagglehub',
    percent: 25
  })

  return runPythonKagglehub(outputDir)
}

async function importKaggleDirectory(datasetPath: string, databasePath: string, window: BrowserWindow, sessionId: string): Promise<number> {
  const db = new Database(databasePath)
  const csvFiles = await findCsvFiles(datasetPath)

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

async function removeDatabaseFiles(databasePath: string): Promise<void> {
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
    rm(`${databasePath}-shm`, { force: true })
  ])
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

  try {
    const datasetPath = await downloadKaggleDataset(session, window)
    sendProgress(window, { sessionId: session.id, label: 'Importing CSV files into SQLite', percent: 45 })
    const importedFiles = await importKaggleDirectory(datasetPath, session.databasePath, window, session.id)
    if (importedFiles === 0) {
      throw new Error(`kagglehub downloaded no CSV files to ${datasetPath}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown kagglehub error'
    sendProgress(window, {
      sessionId: session.id,
      label: `Using starter database: ${message}`,
      percent: 55
    })
    await removeDatabaseFiles(session.databasePath)
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
