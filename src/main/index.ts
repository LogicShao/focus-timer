import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { TimerEngine } from './timerEngine'
import {
  TIMER_CHANNELS,
  isTimerMode,
  type TimerSettingsPatch,
  type TimerState
} from '../shared/timerTypes'

const timerEngine = new TimerEngine()

function broadcastTimerState(state: TimerState): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(TIMER_CHANNELS.state, state)
    }
  })
}

function registerTimerHandlers(): void {
  ipcMain.handle(TIMER_CHANNELS.getState, () => timerEngine.getState())
  ipcMain.handle(TIMER_CHANNELS.start, () => timerEngine.start())
  ipcMain.handle(TIMER_CHANNELS.pause, () => timerEngine.pause())
  ipcMain.handle(TIMER_CHANNELS.reset, () => timerEngine.reset())
  ipcMain.handle(TIMER_CHANNELS.skip, () => timerEngine.skip())
  ipcMain.handle(TIMER_CHANNELS.setMode, (_event, mode: unknown) => {
    if (!isTimerMode(mode)) {
      throw new Error(`Invalid timer mode: ${String(mode)}`)
    }
    return timerEngine.setMode(mode)
  })
  ipcMain.handle(TIMER_CHANNELS.updateSettings, (_event, partial: unknown) => {
    if (partial === null || typeof partial !== 'object') {
      throw new Error('Invalid timer settings payload')
    }
    return timerEngine.updateSettings(partial as TimerSettingsPatch)
  })
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerTimerHandlers()
  timerEngine.onStateChanged((state) => {
    broadcastTimerState(state)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  timerEngine.dispose()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
