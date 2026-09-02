export type SessionStatus = 'ready' | 'preparing' | 'failed'

export interface SessionSummary {
  id: string
  name: string
  folderPath: string
  databasePath: string
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

export type { CourseModule, CourseProgress, Lesson, LessonBlock, ModuleLevel, ProgressEntry, QuizQuestion } from './course/types.js'
