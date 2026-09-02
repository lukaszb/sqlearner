export const ipcChannels = {
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
} as const
