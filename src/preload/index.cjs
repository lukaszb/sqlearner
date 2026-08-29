const { contextBridge, ipcRenderer } = require('electron')

const ipcChannels = {
  sessionsList: 'sessions:list',
  sessionsPrepare: 'sessions:prepare',
  sessionsOpenFolder: 'sessions:open-folder',
  sessionsDelete: 'sessions:delete',
  databaseTables: 'database:tables',
  databasePreview: 'database:preview',
  queryRun: 'query:run',
  progress: 'progress:update'
}

const api = {
  listSessions: () => ipcRenderer.invoke(ipcChannels.sessionsList),
  prepareDatabase: () => ipcRenderer.invoke(ipcChannels.sessionsPrepare),
  openSessionFolder: (sessionId) => ipcRenderer.invoke(ipcChannels.sessionsOpenFolder, sessionId),
  deleteSession: (sessionId) => ipcRenderer.invoke(ipcChannels.sessionsDelete, sessionId),
  listTables: (sessionId) => ipcRenderer.invoke(ipcChannels.databaseTables, sessionId),
  previewTable: (sessionId, tableName) => ipcRenderer.invoke(ipcChannels.databasePreview, sessionId, tableName),
  runQuery: (sessionId, sql) => ipcRenderer.invoke(ipcChannels.queryRun, sessionId, sql),
  onProgress: (callback) => {
    const listener = (_event, update) => callback(update)
    ipcRenderer.on(ipcChannels.progress, listener)
    return () => ipcRenderer.off(ipcChannels.progress, listener)
  }
}

contextBridge.exposeInMainWorld('sqlearner', api)
