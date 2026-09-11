import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { appendEvent, readHistory, replayHistory, withSessionLock } from '@/main/services/session-history'
import { seededRandom } from '@/shared/course/quiz'
import type { SessionSummary } from '@/shared/types'

describe('session event history', () => {
  it('migrates existing progress once and replays ordered concurrent updates without losing failed attempts', async () => {
    const folderPath = await mkdtemp(path.join(os.tmpdir(), 'sqlearner-history-'))
    const session = { id: folderPath, folderPath } as SessionSummary
    try {
      await writeFile(path.join(folderPath, 'lesson-progress.json'), JSON.stringify({ lessons: {
        old: { attempts: 3, completedAt: '2026-09-08T00:00:00.000Z' }
      }, exams: {} }))
      const initial = await readHistory(session)
      await Promise.all([1, 2, 3].map((attempt) => withSessionLock(session.id, () => appendEvent(session, 'workspace.updated', {
        activeView: 'lessons', lessons: { expandedModules: [], practiceDrafts: {}, attempts: { lesson: attempt } }
      }))))
      await withSessionLock(session.id, () => appendEvent(session, 'ui.lessons.answerCurrent', {
        questionId: 'q1', selected: 'wrong', correct: false
      }))
      const history = await readHistory(session)
      expect(history.seed).toBe(initial.seed)
      expect(history.events.map((event) => event.sequence)).toEqual([1, 2, 3, 4, 5])
      expect(replayHistory(history).workspace.lessons.attempts).toEqual({ lesson: 3 })
      expect(replayHistory(history).progress.lessons.old?.attempts).toBe(3)
      expect(history.events[4]?.data).toMatchObject({ selected: 'wrong', correct: false })
      // Materialized files can disappear; the journal remains authoritative.
      await rm(path.join(folderPath, 'lesson-progress.json'))
      expect(replayHistory(await readHistory(session))).toEqual(replayHistory(history))
      expect((await readFile(path.join(folderPath, 'session-events.jsonl'), 'utf8')).split('\n')).toHaveLength(7)
    } finally { await rm(folderPath, { recursive: true, force: true }) }
  })

  it('does not replace a corrupt history with an empty session', async () => {
    const folderPath = await mkdtemp(path.join(os.tmpdir(), 'sqlearner-history-'))
    try {
      await writeFile(path.join(folderPath, 'session-events.jsonl'), '{broken')
      await expect(readHistory({ folderPath } as SessionSummary)).rejects.toThrow()
    } finally { await rm(folderPath, { recursive: true, force: true }) }
  })

  it('continues the queue after an error and reproduces seeded draws', async () => {
    await expect(withSessionLock('failure', async () => { throw new Error('disk full') })).rejects.toThrow('disk full')
    await expect(withSessionLock('failure', async () => 42)).resolves.toBe(42)
    const first = seededRandom('seed:3')
    const restored = seededRandom('seed:3')
    expect(Array.from({ length: 20 }, first)).toEqual(Array.from({ length: 20 }, restored))
    expect(seededRandom('seed:4')()).not.toBe(seededRandom('seed:3')())
  })
})
