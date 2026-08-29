import type { ProgressUpdate, QueryResult, SessionSummary, TablePreview, TableSummary } from '@/shared/types'

interface SQLearnerApi {
  listSessions: () => Promise<SessionSummary[]>
  prepareDatabase: () => Promise<SessionSummary>
  openSessionFolder: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  listTables: (sessionId: string) => Promise<TableSummary[]>
  previewTable: (sessionId: string, tableName: string) => Promise<TablePreview>
  runQuery: (sessionId: string, sql: string) => Promise<QueryResult>
  onProgress: (callback: (update: ProgressUpdate) => void) => () => void
}

declare global {
  interface Window {
    sqlearner: SQLearnerApi
  }
}

export {}
