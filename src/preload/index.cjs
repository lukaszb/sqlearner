const { contextBridge, ipcRenderer } = require('electron')

const ipcChannels = {
  sessionsExport: 'sessions:export',
  sessionsImport: 'sessions:import',
  sessionsEvent: 'sessions:event',
  sessionsList: 'sessions:list',
  sessionsActivate: 'sessions:activate',
  sessionsLastOpened: 'sessions:last-opened',
  sessionsPrepare: 'sessions:prepare',
  sessionsRename: 'sessions:rename',
  sessionsOpenFolder: 'sessions:open-folder',
  sessionsDelete: 'sessions:delete',
  databaseTables: 'database:tables',
  databasePreview: 'database:preview',
  databaseReset: 'database:reset',
  queryRun: 'query:run',
  lessonsProgressGet: 'lessons:progress-get',
  lessonsProgressSet: 'lessons:progress-set',
  workspaceGet: 'workspace:get',
  workspaceSet: 'workspace:set',
  progress: 'progress:update'
}

const api = {
  exportSession: (sessionId) => ipcRenderer.invoke(ipcChannels.sessionsExport, sessionId),
  importSession: () => ipcRenderer.invoke(ipcChannels.sessionsImport),
  recordSessionEvent: (sessionId, event) => ipcRenderer.invoke(ipcChannels.sessionsEvent, sessionId, event),
  listSessions: () => ipcRenderer.invoke(ipcChannels.sessionsList),
  activateSession: (sessionId) => ipcRenderer.invoke(ipcChannels.sessionsActivate, sessionId),
  getLastOpenedSessionId: () => ipcRenderer.invoke(ipcChannels.sessionsLastOpened),
  prepareDatabase: () => ipcRenderer.invoke(ipcChannels.sessionsPrepare),
  renameSession: (sessionId, name) => ipcRenderer.invoke(ipcChannels.sessionsRename, sessionId, name),
  openSessionFolder: (sessionId) => ipcRenderer.invoke(ipcChannels.sessionsOpenFolder, sessionId),
  deleteSession: (sessionId) => ipcRenderer.invoke(ipcChannels.sessionsDelete, sessionId),
  listTables: (sessionId) => ipcRenderer.invoke(ipcChannels.databaseTables, sessionId),
  previewTable: (sessionId, tableName) => ipcRenderer.invoke(ipcChannels.databasePreview, sessionId, tableName),
  runQuery: (sessionId, sql) => ipcRenderer.invoke(ipcChannels.queryRun, sessionId, sql),
  resetDatabase: (sessionId) => ipcRenderer.invoke(ipcChannels.databaseReset, sessionId),
  loadLessonProgress: (sessionId) => ipcRenderer.invoke(ipcChannels.lessonsProgressGet, sessionId),
  saveLessonProgress: (sessionId, progress) => ipcRenderer.invoke(ipcChannels.lessonsProgressSet, sessionId, progress),
  loadSessionWorkspace: (sessionId) => ipcRenderer.invoke(ipcChannels.workspaceGet, sessionId),
  saveSessionWorkspace: (sessionId, patch) => ipcRenderer.invoke(ipcChannels.workspaceSet, sessionId, patch),
  onProgress: (callback) => {
    const listener = (_event, update) => callback(update)
    ipcRenderer.on(ipcChannels.progress, listener)
    return () => ipcRenderer.off(ipcChannels.progress, listener)
  }
}

contextBridge.exposeInMainWorld('sqlearner', api)
