export const ipcChannels = {
  sessionsList: 'sessions:list',
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
  progress: 'progress:update'
} as const
