import { createHash, randomUUID } from 'node:crypto'
import { gzip, gunzip } from 'node:zlib'
import { promisify } from 'node:util'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'
import type { SessionSummary } from '@/shared/types.js'
import { getSessionsRoot, saveSession } from './session-service.js'
import { readHistory, rebuildSessionState, validateHistory, writeHistory, type SessionHistory } from './session-history.js'

const compress = promisify(gzip)
const decompress = promisify(gunzip)
const maximumBytes = 1024 * 1024 * 1024
interface SessionArchive {
  version: 1
  name: string
  createdAt: string
  history: SessionHistory
  original: string
  practice: string
}

export async function encodeSessionKey(archive: SessionArchive): Promise<string> {
  const bytes = Buffer.from(JSON.stringify(archive))
  if (bytes.length > maximumBytes) throw new Error('Session exceeds the 1 GiB export limit')
  const compressed = await compress(bytes)
  return `SQLR1.${createHash('sha256').update(compressed).digest('hex')}.${compressed.toString('base64url')}`
}

export async function decodeSessionKey(key: string): Promise<SessionArchive> {
  if (typeof key !== 'string' || key.length > maximumBytes) throw new Error('Invalid session key size')
  const parts = key.trim().split('.')
  if (parts.length !== 3 || parts[0] !== 'SQLR1' || !/^[a-f0-9]{64}$/.test(parts[1]!)
    || !/^[A-Za-z0-9_-]+$/.test(parts[2]!)) throw new Error('Invalid session key format')
  const compressed = Buffer.from(parts[2]!, 'base64url')
  if (createHash('sha256').update(compressed).digest('hex') !== parts[1]) throw new Error('Session key checksum mismatch')
  const archive = JSON.parse((await decompress(compressed, { maxOutputLength: maximumBytes })).toString()) as SessionArchive
  if (archive.version !== 1 || typeof archive.name !== 'string' || !archive.name.trim() || archive.name.length > 100
    || typeof archive.createdAt !== 'string' || !Number.isFinite(Date.parse(archive.createdAt))) throw new Error('Invalid session metadata')
  validateHistory(archive.history)
  for (const value of [archive.original, archive.practice]) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
      || Buffer.from(value, 'base64').subarray(0, 16).toString() !== 'SQLite format 3\0') throw new Error('Invalid database in session key')
  }
  return archive
}

export async function exportSessionKey(session: SessionSummary): Promise<string> {
  if (session.status !== 'ready') throw new Error('Only ready sessions can be exported')
  const history = await readHistory(session)
  const databases: string[] = []
  for (const source of [session.databasePath, session.workingDatabasePath]) {
    const temporary = path.join(session.folderPath, `export-${randomUUID()}.sqlite`)
    const db = new Database(source, { readonly: true })
    try {
      await db.backup(temporary)
      databases.push((await readFile(temporary)).toString('base64'))
    } finally {
      db.close()
      await rm(temporary, { force: true })
    }
  }
  return encodeSessionKey({ version: 1, name: session.name, createdAt: session.createdAt,
    history, original: databases[0]!, practice: databases[1]! })
}

export async function importSessionKey(key: string): Promise<SessionSummary> {
  const archive = await decodeSessionKey(key)
  const id = `session-${randomUUID()}`
  const folderPath = path.join(getSessionsRoot(), id)
  const session: SessionSummary = { id, seed: archive.history.seed, name: archive.name,
    createdAt: archive.createdAt, lastUsedAt: new Date().toISOString(), status: 'ready', folderPath,
    databasePath: path.join(folderPath, 'olist.sqlite'), workingDatabasePath: path.join(folderPath, 'practice.sqlite') }
  await mkdir(folderPath, { recursive: true })
  try {
    for (const [file, value] of [[session.databasePath, archive.original], [session.workingDatabasePath, archive.practice]]) {
      await writeFile(file!, Buffer.from(value!, 'base64'))
      const db = new Database(file!, { readonly: true })
      try {
        if (db.pragma('quick_check', { simple: true }) !== 'ok') throw new Error('Session database is corrupt')
      } finally { db.close() }
    }
    await writeHistory(session, archive.history)
    await rebuildSessionState(session, archive.history)
    await saveSession(session)
    return session
  } catch (error) {
    await rm(folderPath, { recursive: true, force: true })
    throw error
  }
}
