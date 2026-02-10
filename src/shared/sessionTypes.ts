export interface FocusSession {
  id: string
  type: 'focus'
  startedAt: string
  endedAt: string
  plannedDurationMs: number
}

export interface FocusHistoryFile {
  version: 1
  sessions: FocusSession[]
}

export interface TodaySummary {
  date: string
  pomodoros: number
  focusMinutes: number
}

export interface RangeSummary {
  fromDate: string
  toDate: string
  days: number
  pomodoros: number
  focusMinutes: number
}
