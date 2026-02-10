import { contextBridge, ipcRenderer } from 'electron'
import {
  SETTINGS_CHANNELS,
  STATS_CHANNELS,
  TIMER_CHANNELS,
  type TimerMode,
  type TimerSettings,
  type TimerState
} from '../shared/timerTypes'
import type { TodaySummary } from '../shared/sessionTypes'

const timerApi = {
  getState: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.getState),
  getSettings: (): Promise<TimerSettings> => ipcRenderer.invoke(SETTINGS_CHANNELS.get),
  start: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.start),
  pause: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.pause),
  reset: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.reset),
  skip: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.skip),
  setMode: (mode: TimerMode): Promise<TimerState> =>
    ipcRenderer.invoke(TIMER_CHANNELS.setMode, mode),
  updateSettings: (partial: Partial<TimerSettings>): Promise<TimerState> =>
    ipcRenderer.invoke(TIMER_CHANNELS.updateSettings, partial),
  getTodaySummary: (): Promise<TodaySummary> => ipcRenderer.invoke(STATS_CHANNELS.getTodaySummary),
  onState: (cb: (state: TimerState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: TimerState): void => {
      cb(state)
    }
    ipcRenderer.on(TIMER_CHANNELS.state, handler)
    return () => {
      ipcRenderer.removeListener(TIMER_CHANNELS.state, handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('timer', timerApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (defined in d.ts)
  window.timer = timerApi
}
