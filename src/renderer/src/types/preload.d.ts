import type { CourseProgress, ProgressUpdate, QueryResult, SessionSummary, TablePreview, TableSummary } from '@/shared/types'

interface SQLearnerApi {
  listSessions: () => Promise<SessionSummary[]>
  prepareDatabase: () => Promise<SessionSummary>
  renameSession: (sessionId: string, name: string) => Promise<SessionSummary>
  openSessionFolder: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  listTables: (sessionId: string) => Promise<TableSummary[]>
  previewTable: (sessionId: string, tableName: string) => Promise<TablePreview>
  runQuery: (sessionId: string, sql: string) => Promise<QueryResult>
  runLessonQuery: (sessionId: string, sql: string, useSandbox: boolean) => Promise<QueryResult>
  resetSandbox: (sessionId: string) => Promise<void>
  loadLessonProgress: (sessionId: string) => Promise<CourseProgress>
  saveLessonProgress: (sessionId: string, progress: CourseProgress) => Promise<CourseProgress>
  onProgress: (callback: (update: ProgressUpdate) => void) => () => void
}

declare global {
  interface Window {
    sqlearner: SQLearnerApi
  }
}

export {}
