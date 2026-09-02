export const ipcChannels = {
  sessionsList: 'sessions:list',
  sessionsPrepare: 'sessions:prepare',
  sessionsRename: 'sessions:rename',
  sessionsOpenFolder: 'sessions:open-folder',
  sessionsDelete: 'sessions:delete',
  databaseTables: 'database:tables',
  databasePreview: 'database:preview',
  queryRun: 'query:run',
  progress: 'progress:update'
} as const
