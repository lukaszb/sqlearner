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
}

export interface TablePreview {
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  elapsedMs: number
}

export interface SqlQueryTab {
  id: string
  title: string
  sql: string
  result?: QueryResult
  error?: string
}
