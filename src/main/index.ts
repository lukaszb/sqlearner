import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { readFile, writeFile, stat, rename, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ipcChannels } from '@/shared/ipc.js'
import type { SessionSummary, SessionWorkspacePatch } from '@/shared/types.js'
import {
  activateSession,
  deleteSession,
  getLastOpenedSessionId,
  listSessions,
  openSessionFolder,
  renameSession
} from './services/session-service.js'
import { listTables, prepareDatabase, previewTable, resetWorkingDatabase, runQuery } from './services/database-service.js'
import { sanitizeProgress } from './services/lesson-service.js'
import { sanitizeWorkspace } from './services/workspace-service.js'
import { appendEvent, readHistory, replayHistory, withSessionLock } from './services/session-history.js'
import { exportSessionKey, importSessionKey } from './services/session-key.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const applicationName = 'SQLearner'

app.setName(applicationName)

let mainWindow: BrowserWindow | undefined

function getDevelopmentIconPath(): string | undefined {
  if (app.isPackaged) return undefined

  const iconPath = path.join(app.getAppPath(), 'assets', 'icon.png')
  return existsSync(iconPath) ? iconPath : undefined
}

function setDevelopmentAppIcon(): void {
  const iconPath = getDevelopmentIconPath()
  if (process.platform === 'darwin' && iconPath) app.dock?.setIcon(iconPath)
}

function findSessionOrThrow(sessions: SessionSummary[], sessionId: string): SessionSummary {
  const session = sessions.find((item) => item.id === sessionId)
  if (!session) throw new Error(`Session ${sessionId} was not found`)
  return session
}

async function createWindow(): Promise<void> {
  const icon = getDevelopmentIconPath()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: applicationName,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  const unlocked = new Set<string>([ipcChannels.sessionsList, ipcChannels.sessionsLastOpened,
    ipcChannels.sessionsPrepare, ipcChannels.sessionsImport])
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.handle(channel, (event, ...args) => {
      if (unlocked.has(channel)) return listener(event, ...args)
      const id = args[0]
      if (typeof id !== 'string') throw new Error('Invalid session ID')
      return withSessionLock(id, async () => {
        const session = findSessionOrThrow(await listSessions(), id)
        await readHistory(session)
        const recorded = new Set<string>([ipcChannels.queryRun, ipcChannels.databasePreview,
          ipcChannels.databaseReset, ipcChannels.sessionsActivate, ipcChannels.sessionsRename, ipcChannels.sessionsOpenFolder])
        if (recorded.has(channel)) await appendEvent(session, `${channel}.requested`, args.slice(1))
        try {
          const result = await listener(event, ...args)
          if (recorded.has(channel)) await appendEvent(session, `${channel}.succeeded`,
            channel === ipcChannels.queryRun ? result : null)
          return result
        } catch (error) {
          if (recorded.has(channel)) await appendEvent(session, `${channel}.failed`,
            error instanceof Error ? error.message : String(error))
          throw error
        }
      })
    })
  }
  handle(ipcChannels.sessionsExport, async (_event, sessionId: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    const destination = await dialog.showSaveDialog({ title: 'Save session key',
      defaultPath: 'session.sqlr', filters: [{ name: 'SQLearner session key', extensions: ['sqlr'] }] })
    if (destination.canceled || !destination.filePath) return false
    mainWindow?.webContents.send(ipcChannels.progress, { sessionId, label: 'Generating session key…', percent: 0 })
    try {
      const key = await exportSessionKey(session)
      const temporary = `${destination.filePath}.${randomUUID()}.tmp`
      try {
        await writeFile(temporary, key)
        await rename(temporary, destination.filePath)
      } finally { await rm(temporary, { force: true }) }
      return true
    } finally {
      mainWindow?.webContents.send(ipcChannels.progress, { sessionId, label: 'Session export finished', percent: 100 })
    }
  })
  handle(ipcChannels.sessionsImport, async () => {
    const source = await dialog.showOpenDialog({ title: 'Restore session from key', properties: ['openFile'],
      filters: [{ name: 'SQLearner session key', extensions: ['sqlr', 'txt'] }] })
    if (source.canceled || !source.filePaths[0]) return undefined
    if ((await stat(source.filePaths[0])).size > 1024 * 1024 * 1024) throw new Error('Session key exceeds the 1 GiB limit')
    mainWindow?.webContents.send(ipcChannels.progress, { sessionId: 'import', label: 'Restoring session…', percent: 0 })
    try {
      return await importSessionKey(await readFile(source.filePaths[0], 'utf8'))
    } finally {
      mainWindow?.webContents.send(ipcChannels.progress, { sessionId: 'import', label: 'Session import finished', percent: 100 })
    }
  })
  handle(ipcChannels.sessionsEvent, async (_event, sessionId: string, event: { type: string; data: unknown }) => {
    if (!event || typeof event.type !== 'string' || !/^ui\.[a-zA-Z.]+$/.test(event.type)
      || JSON.stringify(event).length > 8 * 1024 * 1024) throw new Error('Invalid interaction event')
    await appendEvent(findSessionOrThrow(await listSessions(), sessionId), event.type, event.data)
  })
  handle(ipcChannels.sessionsList, () => listSessions())
  handle(ipcChannels.sessionsActivate, (_event, sessionId: string) => activateSession(sessionId))
  handle(ipcChannels.sessionsLastOpened, () => getLastOpenedSessionId())
  handle(ipcChannels.sessionsPrepare, async () => {
    if (!mainWindow) throw new Error('Main window is not ready')
    return prepareDatabase(mainWindow)
  })
  handle(ipcChannels.sessionsRename, (_event, sessionId: string, name: string) => renameSession(sessionId, name))
  handle(ipcChannels.sessionsOpenFolder, (_event, sessionId: string) => openSessionFolder(sessionId))
  handle(ipcChannels.sessionsDelete, (_event, sessionId: string) => deleteSession(sessionId))
  handle(ipcChannels.databaseTables, async (_event, sessionId: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return listTables(session)
  })
  handle(ipcChannels.databasePreview, async (_event, sessionId: string, tableName: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return previewTable(session, tableName)
  })
  handle(ipcChannels.queryRun, async (_event, sessionId: string, sql: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return runQuery(session, sql)
  })
  handle(ipcChannels.databaseReset, async (_event, sessionId: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    await resetWorkingDatabase(session)
  })
  handle(ipcChannels.lessonsProgressGet, async (_event, sessionId: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return replayHistory(await readHistory(session)).progress
  })
  handle(ipcChannels.lessonsProgressSet, async (_event, sessionId: string, progress: unknown) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    const updated = sanitizeProgress(progress)
    await appendEvent(session, 'progress.updated', updated)
    return updated
  })
  handle(ipcChannels.workspaceGet, async (_event, sessionId: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return replayHistory(await readHistory(session)).workspace
  })
  handle(ipcChannels.workspaceSet, async (_event, sessionId: string, patch: SessionWorkspacePatch) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    const current = replayHistory(await readHistory(session)).workspace
    const updated = sanitizeWorkspace({ ...current, ...patch })
    await appendEvent(session, 'workspace.updated', updated)
    return updated
  })
}

app.whenReady().then(async () => {
  setDevelopmentAppIcon()
  registerIpc()
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
