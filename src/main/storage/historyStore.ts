import type {
  FocusHistoryFile,
  FocusSession,
  RangeSummary,
  TodaySummary
} from '../../shared/sessionTypes'
import { readJsonFile, writeJsonAtomic } from './fileUtils'

const EMPTY_HISTORY: FocusHistoryFile = {
  version: 1,
  sessions: []
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function createSessionId(endedAtMs: number): string {
  return `${endedAtMs}-${Math.random().toString(36).slice(2, 10)}`
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isValidFocusSession(value: unknown): value is FocusSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const session = value as Partial<FocusSession>
  return (
    typeof session.id === 'string' &&
    session.type === 'focus' &&
    isValidDateString(session.startedAt) &&
    isValidDateString(session.endedAt) &&
    typeof session.plannedDurationMs === 'number' &&
    Number.isFinite(session.plannedDurationMs) &&
    session.plannedDurationMs > 0
  )
}

function normalizeHistory(raw: unknown): FocusHistoryFile {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ...EMPTY_HISTORY, sessions: [] }
  }

  const data = raw as Partial<FocusHistoryFile>
  if (data.version !== 1 || !Array.isArray(data.sessions)) {
    return { ...EMPTY_HISTORY, sessions: [] }
  }

  return {
    version: 1,
    sessions: data.sessions.filter(isValidFocusSession)
  }
}

export interface AppendFocusSessionInput {
  endedAtMs: number
  plannedDurationMs: number
}

export class HistoryStore {
  private history: FocusHistoryFile = { ...EMPTY_HISTORY, sessions: [] }

  constructor(private readonly filePath: string) {}

  async load(): Promise<FocusHistoryFile> {
    const raw = await readJsonFile(this.filePath)
    if (raw === null) {
      this.history = { ...EMPTY_HISTORY, sessions: [] }
      await this.persist()
      return this.getHistory()
    }

    this.history = normalizeHistory(raw)
    return this.getHistory()
  }

  async appendFocusSession(input: AppendFocusSessionInput): Promise<FocusSession> {
    if (!Number.isFinite(input.endedAtMs) || !Number.isFinite(input.plannedDurationMs)) {
      throw new Error('Invalid session payload')
    }
    if (input.plannedDurationMs <= 0) {
      throw new Error('Invalid plannedDurationMs')
    }

    const endedAt = new Date(input.endedAtMs).toISOString()
    const startedAt = new Date(input.endedAtMs - input.plannedDurationMs).toISOString()
    const session: FocusSession = {
      id: createSessionId(input.endedAtMs),
      type: 'focus',
      startedAt,
      endedAt,
      plannedDurationMs: input.plannedDurationMs
    }

    this.history.sessions.push(session)
    await this.persist()
    return session
  }

  getTodaySummary(now: Date = new Date()): TodaySummary {
    const today = formatLocalDate(now)
    let pomodoros = 0
    let totalDurationMs = 0

    this.history.sessions.forEach((session) => {
      if (formatLocalDate(new Date(session.endedAt)) === today) {
        pomodoros += 1
        totalDurationMs += session.plannedDurationMs
      }
    })

    return {
      date: today,
      pomodoros,
      focusMinutes: totalDurationMs / 60000
    }
  }

  getRangeSummary(days: number, now: Date = new Date()): RangeSummary {
    const normalizedDays = Math.max(1, Math.floor(days))
    const rangeEnd = now
    const rangeStart = startOfLocalDay(now)
    rangeStart.setDate(rangeStart.getDate() - normalizedDays + 1)

    let pomodoros = 0
    let totalDurationMs = 0

    this.history.sessions.forEach((session) => {
      const endedAt = new Date(session.endedAt)
      if (endedAt >= rangeStart && endedAt <= rangeEnd) {
        pomodoros += 1
        totalDurationMs += session.plannedDurationMs
      }
    })

    return {
      fromDate: formatLocalDate(rangeStart),
      toDate: formatLocalDate(rangeEnd),
      days: normalizedDays,
      pomodoros,
      focusMinutes: totalDurationMs / 60000
    }
  }

  private getHistory(): FocusHistoryFile {
    return {
      version: 1,
      sessions: [...this.history.sessions]
    }
  }

  private async persist(): Promise<void> {
    await writeJsonAtomic(this.filePath, this.history)
  }
}
