import { defineStore } from 'pinia'
import type { ProgressUpdate, QueryResult, SessionSummary, SqlQueryTab, TablePreview, TableSummary } from '@/shared/types'

interface AppState {
  sessions: SessionSummary[]
  activeSessionId?: string
  activeView: 'database' | 'queries'
  tables: TableSummary[]
  selectedTable?: string
  tablePreview?: TablePreview
  queryTabs: SqlQueryTab[]
  activeQueryTabId?: string
  progress?: ProgressUpdate
  loading: boolean
  databaseLoading: boolean
  databaseError?: string
  electronReady: boolean
  error?: string
}

const defaultSql = 'SELECT * FROM customers LIMIT 10;'

function createQueryTab(index: number): SqlQueryTab {
  return {
    id: crypto.randomUUID(),
    title: `Query ${index}`,
    sql: defaultSql
  }
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sessions: [],
    activeView: 'database',
    tables: [],
    queryTabs: [createQueryTab(1)],
    loading: false,
    databaseLoading: false,
    electronReady: Boolean(window.sqlearner)
  }),
  getters: {
    activeSession: (state) => state.sessions.find((session) => session.id === state.activeSessionId),
    activeQueryTab: (state) => state.queryTabs.find((tab) => tab.id === state.activeQueryTabId) ?? state.queryTabs[0]
  },
  actions: {
    async initialize() {
      if (!window.sqlearner) {
        this.error = 'SQLearner must be opened in Electron. Run npm run dev and use the desktop window, not the browser URL.'
        return
      }

      window.sqlearner.onProgress((update) => {
        this.progress = update
      })
      try {
        await this.refreshSessions()
        this.activeQueryTabId = this.queryTabs[0]?.id
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to initialize SQLearner'
      }
    },
    async refreshSessions() {
      if (!window.sqlearner) return
      this.sessions = await window.sqlearner.listSessions()
      if (!this.activeSessionId && this.sessions[0]) {
        await this.selectSession(this.sessions[0].id)
      }
    },
    async prepareDatabase() {
      this.loading = true
      this.error = undefined
      try {
        if (!window.sqlearner) {
          throw new Error('Setup requires Electron preload APIs. Run npm run dev and click the button in the SQLearner desktop window.')
        }
        const session = await window.sqlearner.prepareDatabase()
        await this.refreshSessions()
        await this.selectSession(session.id)
        window.setTimeout(() => {
          if (this.progress?.sessionId === session.id) this.progress = undefined
        }, 1500)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Database setup failed'
      } finally {
        this.loading = false
      }
    },
    async selectSession(sessionId: string) {
      this.activeSessionId = sessionId
      await this.loadTables()
    },
    async openSessionFolder(sessionId: string) {
      if (!window.sqlearner) return
      await window.sqlearner.openSessionFolder(sessionId)
    },
    async deleteSession(sessionId: string) {
      if (!window.sqlearner) return
      await window.sqlearner.deleteSession(sessionId)
      if (this.activeSessionId === sessionId) {
        this.activeSessionId = undefined
        this.tables = []
        this.tablePreview = undefined
      }
      await this.refreshSessions()
    },
    async loadTables() {
      if (!this.activeSessionId || !window.sqlearner) return
      this.databaseLoading = true
      this.databaseError = undefined
      this.tables = []
      this.tablePreview = undefined
      this.selectedTable = undefined
      try {
        this.tables = await window.sqlearner.listTables(this.activeSessionId)
        if (this.tables[0]) await this.selectTable(this.tables[0].name)
      } catch (error) {
        this.databaseError = error instanceof Error ? error.message : 'Failed to open database'
      } finally {
        this.databaseLoading = false
      }
    },
    async selectTable(tableName: string) {
      if (!this.activeSessionId || !window.sqlearner) return
      this.selectedTable = tableName
      this.databaseLoading = true
      this.databaseError = undefined
      try {
        this.tablePreview = await window.sqlearner.previewTable(this.activeSessionId, tableName)
      } catch (error) {
        this.databaseError = error instanceof Error ? error.message : 'Failed to load table preview'
      } finally {
        this.databaseLoading = false
      }
    },
    addQueryTab() {
      const tab = createQueryTab(this.queryTabs.length + 1)
      this.queryTabs.push(tab)
      this.activeQueryTabId = tab.id
    },
    closeQueryTab(tabId: string) {
      if (this.queryTabs.length === 1) return
      this.queryTabs = this.queryTabs.filter((tab) => tab.id !== tabId)
      if (this.activeQueryTabId === tabId) this.activeQueryTabId = this.queryTabs[0]?.id
    },
    async runActiveQuery() {
      const tab = this.activeQueryTab
      if (!this.activeSessionId || !tab || !window.sqlearner) return
      tab.error = undefined
      try {
        tab.result = await window.sqlearner.runQuery(this.activeSessionId, tab.sql) as QueryResult
      } catch (error) {
        tab.error = error instanceof Error ? error.message : 'Query failed'
      }
    }
  }
})
