import { app, BrowserWindow, ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ipcChannels } from '@/shared/ipc.js'
import type { SessionSummary } from '@/shared/types.js'
import { deleteSession, listSessions, openSessionFolder, renameSession } from './services/session-service.js'
import { listTables, prepareDatabase, previewTable, resetSandbox, runLessonQuery, runQuery } from './services/database-service.js'
import { loadProgress, saveProgress } from './services/lesson-service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
    title: 'SQLearner',
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
  ipcMain.handle(ipcChannels.sessionsList, () => listSessions())
  ipcMain.handle(ipcChannels.sessionsPrepare, async () => {
    if (!mainWindow) throw new Error('Main window is not ready')
    return prepareDatabase(mainWindow)
  })
  ipcMain.handle(ipcChannels.sessionsRename, (_event, sessionId: string, name: string) => renameSession(sessionId, name))
  ipcMain.handle(ipcChannels.sessionsOpenFolder, (_event, sessionId: string) => openSessionFolder(sessionId))
  ipcMain.handle(ipcChannels.sessionsDelete, (_event, sessionId: string) => deleteSession(sessionId))
  ipcMain.handle(ipcChannels.databaseTables, async (_event, sessionId: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return listTables(session)
  })
  ipcMain.handle(ipcChannels.databasePreview, async (_event, sessionId: string, tableName: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return previewTable(session, tableName)
  })
  ipcMain.handle(ipcChannels.queryRun, async (_event, sessionId: string, sql: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return runQuery(session, sql)
  })
  ipcMain.handle(ipcChannels.lessonsRun, async (_event, sessionId: string, sql: string, useSandbox: boolean) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return runLessonQuery(session, sql, Boolean(useSandbox))
  })
  ipcMain.handle(ipcChannels.lessonsSandboxReset, async (_event, sessionId: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    await resetSandbox(session)
  })
  ipcMain.handle(ipcChannels.lessonsProgressGet, async (_event, sessionId: string) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return loadProgress(session)
  })
  ipcMain.handle(ipcChannels.lessonsProgressSet, async (_event, sessionId: string, progress: unknown) => {
    const session = findSessionOrThrow(await listSessions(), sessionId)
    return saveProgress(session, progress)
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
