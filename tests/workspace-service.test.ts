import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SessionSummary } from '@/shared/types'
import { createEmptyWorkspace, sanitizeWorkspace, updateWorkspace } from '@/main/services/workspace-service'

describe('sanitizeWorkspace', () => {
  it('creates a safe default for a missing or corrupt file', () => {
    expect(sanitizeWorkspace(undefined)).toEqual(createEmptyWorkspace())
    expect(sanitizeWorkspace('broken')).toEqual(createEmptyWorkspace())
  })

  it('keeps a resumable quiz while dropping malformed values', () => {
    expect(sanitizeWorkspace({
      activeView: 'lessons',
      lessons: {
        expandedModules: ['foundations', 42],
        selection: { type: 'lesson', lessonId: 'foundations-tour' },
        attempts: { 'lesson:foundations-tour': 2, broken: -1 },
        practiceDrafts: { 'foundations-tour': 'SELECT 1;', broken: false },
        quiz: {
          mode: 'lesson',
          targetId: 'foundations-tour',
          title: 'Tour',
          index: 0,
          finished: false,
          passed: false,
          items: [{
            question: {
              id: 'foundations-tour-q1',
              prompt: 'Question?',
              options: ['A', 'B'],
              answer: 'A',
              explanation: 'Because.'
            },
            options: ['B', 'A'],
            selected: 'B',
            queryDraft: ''
          }]
        }
      }
    })).toEqual({
      activeView: 'lessons',
      lessons: {
        expandedModules: ['foundations'],
        selection: { type: 'lesson', lessonId: 'foundations-tour' },
        attempts: { 'lesson:foundations-tour': 2 },
        practiceDrafts: { 'foundations-tour': 'SELECT 1;' },
        quiz: {
          mode: 'lesson',
          targetId: 'foundations-tour',
          title: 'Tour',
          index: 0,
          furthestIndex: 0,
          finished: false,
          passed: false,
          items: [{
            question: {
              id: 'foundations-tour-q1',
              prompt: 'Question?',
              options: ['A', 'B'],
              answer: 'A',
              explanation: 'Because.'
            },
            options: ['B', 'A'],
            selected: 'B',
            queryDraft: ''
          }]
        }
      }
    })
  })

  it('drops an incomplete quiz instead of failing workspace restore', () => {
    const workspace = sanitizeWorkspace({
      activeView: 'lessons',
      lessons: { quiz: { mode: 'lesson', items: [] } }
    })

    expect(workspace.activeView).toBe('lessons')
    expect(workspace.lessons.quiz).toBeUndefined()
  })

  it('serializes concurrent patches without losing either part of the workspace', async () => {
    const folderPath = await mkdtemp(path.join(os.tmpdir(), 'sqlearner-workspace-'))
    const session: SessionSummary = {
      id: 'session-test',
      name: 'Test',
      folderPath,
      databasePath: path.join(folderPath, 'olist.sqlite'),
      workingDatabasePath: path.join(folderPath, 'practice.sqlite'),
      createdAt: '2026-09-06T00:00:00.000Z',
      lastUsedAt: '2026-09-06T00:00:00.000Z',
      status: 'ready'
    }

    try {
      await Promise.all([
        updateWorkspace(session, { activeView: 'lessons' }),
        updateWorkspace(session, {
          lessons: {
            expandedModules: ['foundations'],
            selection: { type: 'lesson', lessonId: 'foundations-tour' },
            attempts: {},
            practiceDrafts: { 'foundations-tour': 'SELECT 1;' }
          }
        })
      ])

      const saved = JSON.parse(await readFile(path.join(folderPath, 'workspace-state.json'), 'utf8'))
      expect(saved.activeView).toBe('lessons')
      expect(saved.lessons.selection).toEqual({ type: 'lesson', lessonId: 'foundations-tour' })
      expect(saved.lessons.practiceDrafts['foundations-tour']).toBe('SELECT 1;')
    } finally {
      await rm(folderPath, { recursive: true, force: true })
    }
  })
})
