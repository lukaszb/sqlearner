import { app, shell } from 'electron'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { SessionSummary } from '@/shared/types.js'

const manifestName = 'session.json'

export const workingDatabaseFileName = 'practice.sqlite'

/** Older sessions were stored without a working copy path, so derive it from the folder. */
function withWorkingDatabasePath(session: SessionSummary, folderPath: string): SessionSummary {
  if (session.workingDatabasePath) return session
  return { ...session, workingDatabasePath: path.join(folderPath, workingDatabaseFileName) }
}

export function getSessionsRoot(): string {
  return path.join(app.getPath('userData'), 'sessions')
}

async function ensureSessionsRoot(): Promise<string> {
  const root = getSessionsRoot()
  await mkdir(root, { recursive: true })
  return root
}

export async function listSessions(): Promise<SessionSummary[]> {
  const root = await ensureSessionsRoot()
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir(root, { withFileTypes: true })
  const sessions = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const manifestPath = path.join(root, entry.name, manifestName)
        try {
          const parsed = JSON.parse(await readFile(manifestPath, 'utf8')) as SessionSummary
          return withWorkingDatabasePath(parsed, path.join(root, entry.name))
        } catch {
          return undefined
        }
      })
  )

  return sessions
    .filter((session): session is SessionSummary => Boolean(session))
    .sort((a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt))
}

export async function createPreparingSession(): Promise<SessionSummary> {
  const root = await ensureSessionsRoot()
  const now = new Date().toISOString()
  const id = `session-${now.replace(/[:.]/g, '-')}`
  const folderPath = path.join(root, id)
  await mkdir(folderPath, { recursive: true })

  const session: SessionSummary = {
    id,
    name: `SQLearner ${new Date().toLocaleString()}`,
    folderPath,
    databasePath: path.join(folderPath, 'olist.sqlite'),
    workingDatabasePath: path.join(folderPath, workingDatabaseFileName),
    createdAt: now,
    lastUsedAt: now,
    status: 'preparing'
  }

  await saveSession(session)
  return session
}

export async function saveSession(session: SessionSummary): Promise<void> {
  await writeFile(path.join(session.folderPath, manifestName), JSON.stringify(session, null, 2))
}

export async function markSessionUsed(session: SessionSummary): Promise<SessionSummary> {
  const updated = { ...session, lastUsedAt: new Date().toISOString() }
  await saveSession(updated)
  return updated
}

export async function renameSession(sessionId: string, name: string): Promise<SessionSummary> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Session name cannot be empty')
  if (trimmedName.length > 100) throw new Error('Session name cannot exceed 100 characters')

  const session = (await listSessions()).find((item) => item.id === sessionId)
  if (!session) throw new Error('Session not found')

  const updated = { ...session, name: trimmedName }
  await saveSession(updated)
  return updated
}

export async function openSessionFolder(sessionId: string): Promise<void> {
  const session = (await listSessions()).find((item) => item.id === sessionId)
  if (!session) throw new Error('Session not found')
  await shell.openPath(session.folderPath)
}

export async function deleteSession(sessionId: string): Promise<void> {
  const session = (await listSessions()).find((item) => item.id === sessionId)
  if (!session) throw new Error('Session not found')
  await rm(session.folderPath, { recursive: true, force: true })
}
