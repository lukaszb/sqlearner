const { contextBridge, ipcRenderer } = require('electron')

const ipcChannels = {
  sessionsList: 'sessions:list',
  sessionsPrepare: 'sessions:prepare',
  sessionsRename: 'sessions:rename',
  sessionsOpenFolder: 'sessions:open-folder',
  sessionsDelete: 'sessions:delete',
  databaseTables: 'database:tables',
  databasePreview: 'database:preview',
  queryRun: 'query:run',
  lessonsRun: 'lessons:run',
  lessonsSandboxReset: 'lessons:sandbox-reset',
  lessonsProgressGet: 'lessons:progress-get',
  lessonsProgressSet: 'lessons:progress-set',
  progress: 'progress:update'
}

const api = {
  listSessions: () => ipcRenderer.invoke(ipcChannels.sessionsList),
  prepareDatabase: () => ipcRenderer.invoke(ipcChannels.sessionsPrepare),
  renameSession: (sessionId, name) => ipcRenderer.invoke(ipcChannels.sessionsRename, sessionId, name),
  openSessionFolder: (sessionId) => ipcRenderer.invoke(ipcChannels.sessionsOpenFolder, sessionId),
  deleteSession: (sessionId) => ipcRenderer.invoke(ipcChannels.sessionsDelete, sessionId),
  listTables: (sessionId) => ipcRenderer.invoke(ipcChannels.databaseTables, sessionId),
  previewTable: (sessionId, tableName) => ipcRenderer.invoke(ipcChannels.databasePreview, sessionId, tableName),
  runQuery: (sessionId, sql) => ipcRenderer.invoke(ipcChannels.queryRun, sessionId, sql),
  runLessonQuery: (sessionId, sql, useSandbox) => ipcRenderer.invoke(ipcChannels.lessonsRun, sessionId, sql, useSandbox),
  resetSandbox: (sessionId) => ipcRenderer.invoke(ipcChannels.lessonsSandboxReset, sessionId),
  loadLessonProgress: (sessionId) => ipcRenderer.invoke(ipcChannels.lessonsProgressGet, sessionId),
  saveLessonProgress: (sessionId, progress) => ipcRenderer.invoke(ipcChannels.lessonsProgressSet, sessionId, progress),
  onProgress: (callback) => {
    const listener = (_event, update) => callback(update)
    ipcRenderer.on(ipcChannels.progress, listener)
    return () => ipcRenderer.off(ipcChannels.progress, listener)
  }
}

contextBridge.exposeInMainWorld('sqlearner', api)
