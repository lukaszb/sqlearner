import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  LessonSelectionSnapshot,
  LessonWorkspaceState,
  QuizItemSnapshot,
  QuizSnapshot,
  SessionSummary,
  SessionWorkspacePatch,
  SessionWorkspaceState,
  WorkspaceView
} from '@/shared/types.js'
import { writeJsonAtomically } from './json-file.js'

const workspaceFileName = 'workspace-state.json'
const writeQueues = new Map<string, Promise<SessionWorkspaceState>>()

export function createEmptyWorkspace(): SessionWorkspaceState {
  return {
    activeView: 'database',
    lessons: {
      expandedModules: [],
      attempts: {},
      practiceDrafts: {}
    }
  }
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function stringRecord(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
}

function numberRecord(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0
    )
  )
}

function selection(value: unknown): LessonSelectionSnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  if (raw.type === 'lesson' && typeof raw.lessonId === 'string') return { type: 'lesson', lessonId: raw.lessonId }
  if (raw.type === 'exam' && typeof raw.moduleId === 'string') return { type: 'exam', moduleId: raw.moduleId }
  return undefined
}

function quizItem(value: unknown): QuizItemSnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  if (typeof raw.question !== 'object' || raw.question === null || typeof raw.queryDraft !== 'string') return undefined
  const question = raw.question as Record<string, unknown>
  if (
    typeof question.id !== 'string' ||
    typeof question.prompt !== 'string' ||
    !Array.isArray(question.options) ||
    !question.options.every((item) => typeof item === 'string') ||
    typeof question.answer !== 'string' ||
    typeof question.explanation !== 'string'
  ) return undefined
  return {
    question: question as unknown as QuizItemSnapshot['question'],
    options: strings(raw.options),
    ...(typeof raw.selected === 'string' ? { selected: raw.selected } : {}),
    queryDraft: raw.queryDraft
  }
}

function quiz(value: unknown): QuizSnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  if (
    (raw.mode !== 'lesson' && raw.mode !== 'exam') ||
    typeof raw.targetId !== 'string' ||
    typeof raw.title !== 'string' ||
    !Array.isArray(raw.items) ||
    typeof raw.index !== 'number' ||
    typeof raw.finished !== 'boolean' ||
    typeof raw.passed !== 'boolean'
  ) return undefined
  const items = raw.items.map(quizItem)
  if (items.some((item) => !item) || raw.index < 0 || raw.index >= items.length) return undefined
  const furthestIndex = typeof raw.furthestIndex === 'number'
    ? Math.floor(raw.furthestIndex)
    : Math.floor(raw.index)
  return {
    mode: raw.mode,
    targetId: raw.targetId,
    title: raw.title,
    items: items as QuizItemSnapshot[],
    index: Math.floor(raw.index),
    furthestIndex: Math.max(Math.floor(raw.index), Math.min(items.length - 1, Math.max(0, furthestIndex))),
    finished: raw.finished,
    passed: raw.passed
  }
}

function lessons(value: unknown): LessonWorkspaceState {
  const raw = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  const restoredSelection = selection(raw.selection)
  const restoredQuiz = quiz(raw.quiz)
  return {
    expandedModules: strings(raw.expandedModules),
    ...(restoredSelection ? { selection: restoredSelection } : {}),
    ...(restoredQuiz ? { quiz: restoredQuiz } : {}),
    attempts: numberRecord(raw.attempts),
    practiceDrafts: stringRecord(raw.practiceDrafts)
  }
}

function view(value: unknown): WorkspaceView {
  return value === 'queries' || value === 'lessons' ? value : 'database'
}

export function sanitizeWorkspace(value: unknown): SessionWorkspaceState {
  const raw = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  return { activeView: view(raw.activeView), lessons: lessons(raw.lessons) }
}

function workspacePath(session: SessionSummary): string {
  return path.join(session.folderPath, workspaceFileName)
}

export async function loadWorkspace(session: SessionSummary): Promise<SessionWorkspaceState> {
  try {
    return sanitizeWorkspace(JSON.parse(await readFile(workspacePath(session), 'utf8')))
  } catch {
    return createEmptyWorkspace()
  }
}

/** Serializing patches prevents rapid UI updates from overwriting a newer state with an older write. */
export function updateWorkspace(
  session: SessionSummary,
  patch: SessionWorkspacePatch
): Promise<SessionWorkspaceState> {
  const previous = writeQueues.get(session.id) ?? Promise.resolve(undefined)
  const next = previous
    .catch(() => undefined)
    .then(async (queued) => {
      const current = queued ?? await loadWorkspace(session)
      const updated = sanitizeWorkspace({ ...current, ...patch })
      await writeJsonAtomically(workspacePath(session), updated)
      return updated
    })
  writeQueues.set(session.id, next)
  void next.finally(() => {
    if (writeQueues.get(session.id) === next) writeQueues.delete(session.id)
  }).catch(() => undefined)
  return next
}
