export const TIMER_MODES = ['focus', 'shortBreak', 'longBreak'] as const
export type TimerMode = (typeof TIMER_MODES)[number]

export const TIMER_STATUSES = ['idle', 'running', 'paused'] as const
export type TimerStatus = (typeof TIMER_STATUSES)[number]

export interface TimerSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakEvery: number
  autoStartNext: boolean
}

export type TimerSettingsPatch = Partial<TimerSettings>

export interface TimerState {
  mode: TimerMode
  status: TimerStatus
  durationMs: number
  remainingMs: number
  completedFocus: number
  settings: TimerSettings
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartNext: false
}

export const TIMER_CHANNELS = {
  getState: 'timer:getState',
  start: 'timer:start',
  pause: 'timer:pause',
  reset: 'timer:reset',
  skip: 'timer:skip',
  setMode: 'timer:setMode',
  updateSettings: 'timer:updateSettings',
  state: 'timer:state'
} as const

export function isTimerMode(value: unknown): value is TimerMode {
  return typeof value === 'string' && TIMER_MODES.includes(value as TimerMode)
}
