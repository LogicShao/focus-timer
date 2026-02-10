import { contextBridge, ipcRenderer } from 'electron'
import {
  TIMER_CHANNELS,
  type TimerMode,
  type TimerSettingsPatch,
  type TimerState
} from '../shared/timerTypes'

const timerApi = {
  getState: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.getState),
  start: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.start),
  pause: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.pause),
  reset: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.reset),
  skip: (): Promise<TimerState> => ipcRenderer.invoke(TIMER_CHANNELS.skip),
  setMode: (mode: TimerMode): Promise<TimerState> =>
    ipcRenderer.invoke(TIMER_CHANNELS.setMode, mode),
  updateSettings: (partial: TimerSettingsPatch): Promise<TimerState> =>
    ipcRenderer.invoke(TIMER_CHANNELS.updateSettings, partial),
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
