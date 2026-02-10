import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { TimerEngine } from './timerEngine'
import { HistoryStore } from './storage/historyStore'
import { ensureStoragePaths } from './storage/paths'
import { SettingsStore, validateSettingsPatch } from './storage/settingsStore'
import {
  SETTINGS_CHANNELS,
  STATS_CHANNELS,
  TIMER_CHANNELS,
  isTimerMode,
  type TimerState
} from '../shared/timerTypes'

const timerEngine = new TimerEngine()
let settingsStore: SettingsStore | null = null
let historyStore: HistoryStore | null = null

function getSettingsStore(): SettingsStore {
  if (settingsStore === null) {
    throw new Error('Settings store is not initialized')
  }
  return settingsStore
}

function getHistoryStore(): HistoryStore {
  if (historyStore === null) {
    throw new Error('History store is not initialized')
  }
  return historyStore
}

function broadcastTimerState(state: TimerState): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(TIMER_CHANNELS.state, state)
    }
  })
}

async function applySettingsUpdate(partial: unknown): Promise<TimerState> {
  const patch = validateSettingsPatch(partial)
  const state = timerEngine.updateSettings(patch)
  await getSettingsStore().save(state.settings)
  return state
}

function normalizeRangeDays(input: unknown): number {
  if (typeof input !== 'number' || !Number.isInteger(input) || input <= 0) {
    throw new Error('Invalid days: must be an integer > 0')
  }
  return input
}

function registerIpcHandlers(): void {
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
  ipcMain.handle(TIMER_CHANNELS.updateSettings, async (_event, partial: unknown) => {
    return applySettingsUpdate(partial)
  })

  ipcMain.handle(SETTINGS_CHANNELS.get, () => timerEngine.getSettings())
  ipcMain.handle(SETTINGS_CHANNELS.update, async (_event, partial: unknown) => {
    const state = await applySettingsUpdate(partial)
    return state.settings
  })

  ipcMain.handle(STATS_CHANNELS.getTodaySummary, () => getHistoryStore().getTodaySummary())
  ipcMain.handle(STATS_CHANNELS.getRangeSummary, (_event, days: unknown) => {
    const normalizedDays = normalizeRangeDays(days)
    return getHistoryStore().getRangeSummary(normalizedDays)
  })
}

function createWindow(): void {
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const storagePaths = await ensureStoragePaths()
  settingsStore = new SettingsStore(storagePaths.settingsFile)
  historyStore = new HistoryStore(storagePaths.historyFile)

  const loadedSettings = await settingsStore.load()
  timerEngine.updateSettings(loadedSettings)
  await historyStore.load()

  registerIpcHandlers()

  timerEngine.onStateChanged((state) => {
    broadcastTimerState(state)
  })
  timerEngine.onFocusCompleted((payload) => {
    void getHistoryStore()
      .appendFocusSession(payload)
      .catch((error) => {
        console.error('Failed to append focus session:', error)
      })
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  timerEngine.dispose()
})
