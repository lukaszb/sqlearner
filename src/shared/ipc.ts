export const ipcChannels = {
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
} as const
