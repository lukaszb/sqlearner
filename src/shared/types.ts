export type SessionStatus = 'ready' | 'preparing' | 'failed'

export interface SessionSummary {
  id: string
  seed?: string
  name: string
  folderPath: string
  /** The untouched database built by the import; only ever read to rebuild the working copy. */
  databasePath: string
  /** The writable copy every table preview, query and lesson runs against. */
  workingDatabasePath: string
  createdAt: string
  lastUsedAt: string
  status: SessionStatus
}

export interface ProgressUpdate {
  sessionId: string
  label: string
  percent: number
}

export interface TableSummary {
  name: string
  rowCount: number
  columns: string[]
}

export interface TablePreview {
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  elapsedMs: number
  /** Number of rows inserted, updated or deleted by a write statement. */
  changes?: number
  /** Human readable outcome for statements that return no rows. */
  message?: string
}

export interface SqlQueryTab {
  id: string
  title: string
  sql: string
  result?: QueryResult
  error?: string
}

export type WorkspaceView = 'database' | 'queries' | 'lessons'

export type LessonSelectionSnapshot =
  | { type: 'lesson'; lessonId: string }
  | { type: 'exam'; moduleId: string }

export interface QuizItemSnapshot {
  question: import('./course/types.js').QuizQuestion
  options: string[]
  selected?: string
  queryDraft: string
  queryResult?: QueryResult
  queryError?: string
}

export interface QuizSnapshot {
  mode: 'lesson' | 'exam'
  targetId: string
  title: string
  items: QuizItemSnapshot[]
  index: number
  /** Highest question index the learner has reached; later questions stay locked. */
  furthestIndex: number
  finished: boolean
  passed: boolean
}

/** The resumable part of the lesson UI. Completion data remains in lesson-progress.json. */
export interface LessonWorkspaceState {
  disclosures?: Record<string, boolean>
  drawCount?: number
  runs?: Record<string, { running: boolean; result?: QueryResult; error?: string }>
  expandedModules: string[]
  selection?: LessonSelectionSnapshot
  quiz?: QuizSnapshot
  attempts: Record<string, number>
  practiceDrafts: Record<string, string>
}

export interface SessionWorkspaceState {
  activeView: WorkspaceView
  queryTabs?: SqlQueryTab[]
  activeQueryTabId?: string
  selectedTable?: string
  lessons: LessonWorkspaceState
}

export type SessionWorkspacePatch = Partial<SessionWorkspaceState>

export type { CourseModule, CourseProgress, Lesson, LessonBlock, ModuleLevel, ProgressEntry, QuizQuestion } from './course/types.js'
