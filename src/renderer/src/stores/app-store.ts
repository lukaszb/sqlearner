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
    activeSessionId: undefined,
    activeView: 'database',
    tables: [],
    selectedTable: undefined,
    tablePreview: undefined,
    queryTabs: [createQueryTab(1)],
    activeQueryTabId: undefined,
    progress: undefined,
    loading: false,
    databaseLoading: false,
    databaseError: undefined,
    electronReady: Boolean(window.sqlearner),
    error: undefined
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
      const activeSessionExists = this.sessions.some((session) => session.id === this.activeSessionId)

      if (this.activeSessionId && !activeSessionExists) {
        this.activeSessionId = undefined
        this.tables = []
        this.tablePreview = undefined
        this.selectedTable = undefined
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
        this.progress = undefined
        this.error = error instanceof Error ? error.message : 'Database setup failed'
      } finally {
        this.loading = false
      }
    },
    async selectSession(sessionId: string) {
      this.activeSessionId = sessionId
      await this.loadTables()
    },
    closeSession() {
      this.activeSessionId = undefined
      this.tables = []
      this.selectedTable = undefined
      this.tablePreview = undefined
      this.databaseError = undefined
    },
    async renameActiveSession(name: string) {
      if (!this.activeSessionId || !window.sqlearner) return false
      this.error = undefined
      try {
        const updated = await window.sqlearner.renameSession(this.activeSessionId, name)
        const index = this.sessions.findIndex((session) => session.id === updated.id)
        if (index !== -1) this.sessions[index] = updated
        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to rename session'
        return false
      }
    },
    async selectView(view: 'database' | 'queries') {
      this.activeView = view
      if (view === 'queries' && this.queryTabs.length === 0) {
        this.addQueryTab()
      }
      if (view === 'database' && this.activeSessionId && this.tables.length === 0) {
        await this.loadTables()
      }
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
    async loadTables(options: { clearBeforeLoad?: boolean } = {}) {
      if (!this.activeSessionId || !window.sqlearner) return
      const previousSelectedTable = this.selectedTable
      this.databaseLoading = true
      this.databaseError = undefined
      if (options.clearBeforeLoad) {
        this.tables = []
        this.tablePreview = undefined
        this.selectedTable = undefined
      }
      try {
        const nextTables = await window.sqlearner.listTables(this.activeSessionId)
        this.tables = nextTables
        if (nextTables[0]) {
          const tableName = previousSelectedTable && nextTables.some((table) => table.name === previousSelectedTable)
            ? previousSelectedTable
            : nextTables[0].name
          const table = nextTables.find((item) => item.name === tableName)
          this.selectedTable = tableName
          this.tablePreview = table ? { columns: table.columns, rows: [] } : undefined
          await this.selectTable(tableName)
        } else {
          this.tablePreview = undefined
          this.selectedTable = undefined
        }
      } catch (error) {
        this.databaseError = error instanceof Error ? error.message : 'Failed to open database'
      } finally {
        this.databaseLoading = false
      }
    },
    async selectTable(tableName: string) {
      if (!this.activeSessionId || !window.sqlearner) return
      this.selectedTable = tableName
      const table = this.tables.find((item) => item.name === tableName)
      this.tablePreview = table ? { columns: table.columns, rows: [] } : this.tablePreview
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
