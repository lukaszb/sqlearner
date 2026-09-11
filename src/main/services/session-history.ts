import { open, readFile, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { CourseProgress, SessionSummary, SessionWorkspaceState } from '@/shared/types.js'
import { loadWorkspace, sanitizeWorkspace } from './workspace-service.js'
import { loadProgress, sanitizeProgress } from './lesson-service.js'
import { writeJsonAtomically } from './json-file.js'

export interface SessionEvent {
  sequence: number
  at: string
  type: string
  data: unknown
}
export interface SessionHistory {
  version: 1
  seed: string
  events: SessionEvent[]
}
const queues = new Map<string, Promise<unknown>>()
const histories = new Map<string, { size: number; modified: number; history: SessionHistory }>()
const projections = new WeakMap<SessionHistory, { count: number; workspace: SessionWorkspaceState; progress: CourseProgress }>()

/** All session I/O, including export and database writes, shares one ordered queue. */
export function withSessionLock<T>(id: string, action: () => Promise<T>): Promise<T> {
  const next = (queues.get(id) ?? Promise.resolve()).catch(() => undefined).then(action)
  queues.set(id, next)
  void next.finally(() => { if (queues.get(id) === next) queues.delete(id) }).catch(() => undefined)
  return next
}

export async function readHistory(session: SessionSummary): Promise<SessionHistory> {
  const file = path.join(session.folderPath, 'session-events.jsonl')
  try {
    const info = await stat(file)
    const cached = histories.get(file)
    if (cached && cached.size === info.size && cached.modified === info.mtimeMs) return cached.history
    const lines = (await readFile(file, 'utf8')).trimEnd().split('\n')
    const header = JSON.parse(lines.shift()!) as { version: 1; seed: string }
    const history = { ...header, events: lines.map((line) => JSON.parse(line) as SessionEvent) }
    validateHistory(history)
    histories.set(file, { size: info.size, modified: info.mtimeMs, history })
    return history
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const history: SessionHistory = {
      version: 1, seed: session.seed ?? randomUUID(), events: [{
        sequence: 1, at: new Date().toISOString(), type: 'session.baseline',
        data: { workspace: await loadWorkspace(session), progress: await loadProgress(session) }
      }]
    }
    await writeHistory(session, history)
    if (!session.seed) await writeJsonAtomically(path.join(session.folderPath, 'session.json'), { ...session, seed: history.seed })
    return history
  }
}

export function validateHistory(value: unknown): asserts value is SessionHistory {
  const history = value as SessionHistory | null
  if (!history || history.version !== 1 || typeof history.seed !== 'string' || !history.seed
    || !Array.isArray(history.events) || history.events[0]?.type !== 'session.baseline') {
    throw new Error('Invalid or unsupported session history')
  }
  history.events.forEach((event, index) => {
    if (!event || event.sequence !== index + 1 || typeof event.type !== 'string'
      || typeof event.at !== 'string' || !Number.isFinite(Date.parse(event.at)) || !('data' in event)) {
      throw new Error('Invalid session event sequence')
    }
  })
}

export async function writeHistory(session: SessionSummary, history: SessionHistory): Promise<void> {
  validateHistory(history)
  const file = path.join(session.folderPath, 'session-events.jsonl')
  const { writeFile, rename } = await import('node:fs/promises')
  const temporary = `${file}.${randomUUID()}.tmp`
  await writeFile(temporary, [JSON.stringify({ version: 1, seed: history.seed }),
    ...history.events.map((event) => JSON.stringify(event))].join('\n') + '\n')
  await rename(temporary, file)
  histories.delete(file)
}

/** Called inside withSessionLock; append succeeds before a projected state is acknowledged. */
export async function appendEvent(session: SessionSummary, type: string, data: unknown): Promise<void> {
  const history = await readHistory(session)
  const event: SessionEvent = { sequence: history.events.length + 1, at: new Date().toISOString(), type, data }
  const file = await open(path.join(session.folderPath, 'session-events.jsonl'), 'a')
  try {
    await file.writeFile(JSON.stringify(event) + '\n')
    await file.sync()
  } finally { await file.close() }
  history.events.push(event)
  const filePath = path.join(session.folderPath, 'session-events.jsonl')
  const info = await stat(filePath)
  histories.set(filePath, { size: info.size, modified: info.mtimeMs, history })
}

export function replayHistory(history: SessionHistory): { workspace: SessionWorkspaceState; progress: CourseProgress } {
  const cached = projections.get(history)
  if (!cached) validateHistory(history)
  let workspace = cached?.workspace ?? sanitizeWorkspace(undefined)
  let progress = cached?.progress ?? sanitizeProgress(undefined)
  for (const event of history.events.slice(cached?.count ?? 0)) {
    if (event.type === 'session.baseline') {
      const baseline = event.data as { workspace: unknown; progress: unknown }
      workspace = sanitizeWorkspace(baseline.workspace)
      progress = sanitizeProgress(baseline.progress)
    } else if (event.type === 'workspace.updated') workspace = sanitizeWorkspace(event.data)
    else if (event.type === 'progress.updated') progress = sanitizeProgress(event.data)
  }
  projections.set(history, { count: history.events.length, workspace, progress })
  return { workspace, progress }
}

export async function rebuildSessionState(session: SessionSummary, history: SessionHistory): Promise<void> {
  const state = replayHistory(history)
  await writeJsonAtomically(path.join(session.folderPath, 'workspace-state.json'), state.workspace)
  await writeJsonAtomically(path.join(session.folderPath, 'lesson-progress.json'), state.progress)
}
