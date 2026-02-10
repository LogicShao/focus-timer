import type { TimerMode, TimerSettings, TimerState } from '../shared/timerTypes'

export interface TimerAPI {
  getState: () => Promise<TimerState>
  start: () => Promise<TimerState>
  pause: () => Promise<TimerState>
  reset: () => Promise<TimerState>
  skip: () => Promise<TimerState>
  setMode: (mode: TimerMode) => Promise<TimerState>
  updateSettings: (partial: Partial<TimerSettings>) => Promise<TimerState>
  onState: (listener: (state: TimerState) => void) => () => void
}
