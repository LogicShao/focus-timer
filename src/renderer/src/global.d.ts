import type { TodaySummary } from '../../shared/sessionTypes'
import type { TimerMode, TimerSettings, TimerState } from '../../shared/timerTypes'

interface TimerBridge {
  getState: () => Promise<TimerState>
  getSettings: () => Promise<TimerSettings>
  start: () => Promise<TimerState>
  pause: () => Promise<TimerState>
  reset: () => Promise<TimerState>
  skip: () => Promise<TimerState>
  setMode: (mode: TimerMode) => Promise<TimerState>
  updateSettings: (partial: Partial<TimerSettings>) => Promise<TimerState>
  getTodaySummary: () => Promise<TodaySummary>
  onState: (listener: (state: TimerState) => void) => () => void
}

declare global {
  interface Window {
    timer: TimerBridge
  }
}

export {}
