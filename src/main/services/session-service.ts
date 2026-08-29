import { app, shell } from 'electron'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { SessionSummary } from '@shared/types.js'

const manifestName = 'session.json'

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
          return parsed
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
