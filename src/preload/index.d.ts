import { ElectronAPI } from '@electron-toolkit/preload'
import type { TimerMode, TimerSettingsPatch, TimerState } from '../shared/timerTypes'

export interface TimerAPI {
  getState: () => Promise<TimerState>
  start: () => Promise<TimerState>
  pause: () => Promise<TimerState>
  reset: () => Promise<TimerState>
  skip: () => Promise<TimerState>
  setMode: (mode: TimerMode) => Promise<TimerState>
  updateSettings: (partial: TimerSettingsPatch) => Promise<TimerState>
  onState: (listener: (state: TimerState) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    timer?: TimerAPI
  }
}
