import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const context = vi.hoisted(() => ({ root: '' }))
vi.mock('electron', () => ({ app: { getPath: () => context.root }, shell: {} }))
import { decodeSessionKey, encodeSessionKey, exportSessionKey, importSessionKey } from '@/main/services/session-key'
import { appendEvent, readHistory, replayHistory } from '@/main/services/session-history'
import { createPreparingSession, saveSession } from '@/main/services/session-service'

afterEach(async () => {
  if (context.root) await rm(context.root, { recursive: true, force: true })
})

describe('portable session keys', () => {
  it('round trips database edits, seed, drafts, historical answers and progress into a new session', async () => {
    context.root = await mkdtemp(path.join(os.tmpdir(), 'sqlearner-key-'))
    const session = await createPreparingSession()
    for (const file of [session.databasePath, session.workingDatabasePath]) {
      const db = new Database(file)
      db.exec('CREATE TABLE example (value TEXT); INSERT INTO example VALUES (\'original\')')
      if (file === session.workingDatabasePath) db.exec("UPDATE example SET value = 'edited'")
      db.close()
    }
    session.status = 'ready'
    await saveSession(session)
    await appendEvent(session, 'workspace.updated', { activeView: 'queries', queryTabs: [
      { id: 'tab', title: 'My query', sql: 'SELECT 42' }
    ], lessons: { attempts: { tour: 2 }, practiceDrafts: {}, expandedModules: [] } })
    await appendEvent(session, 'ui.lessons.answerCurrent', { selected: 'B', correct: false })
    const key = await exportSessionKey(session)
    const restored = await importSessionKey(key)
    expect(restored.id).not.toBe(session.id)
    expect(restored.folderPath).not.toBe(session.folderPath)
    expect(restored.seed).toBe(session.seed)
    expect(await readHistory(restored)).toEqual(await readHistory(session))
    expect(replayHistory(await readHistory(restored)).workspace.queryTabs?.[0]?.sql).toBe('SELECT 42')
    for (const [file, value] of [[restored.databasePath, 'original'], [restored.workingDatabasePath, 'edited']]) {
      const db = new Database(file!)
      expect(db.prepare('SELECT value FROM example').get()).toEqual({ value })
      db.close()
    }
    await expect(decodeSessionKey(key.slice(0, -3) + 'aaa')).rejects.toThrow()
    const archive = await decodeSessionKey(key)
    archive.history.events[0]!.sequence = 10
    await expect(decodeSessionKey(await encodeSessionKey(archive))).rejects.toThrow('sequence')
  })

  it('rejects unsupported and malformed keys', async () => {
    await expect(decodeSessionKey('SQLR2.bad.data')).rejects.toThrow('format')
    await expect(decodeSessionKey('anything')).rejects.toThrow('format')
  })
})
