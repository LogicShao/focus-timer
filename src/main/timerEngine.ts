import {
  DEFAULT_TIMER_SETTINGS,
  type TimerMode,
  type TimerSettings,
  type TimerSettingsPatch,
  type TimerState,
  type TimerStatus
} from '../shared/timerTypes'

type TimerStateListener = (state: TimerState) => void

const TICK_INTERVAL_MS = 250
const MS_PER_MINUTE = 60 * 1000

export class TimerEngine {
  private settings: TimerSettings = { ...DEFAULT_TIMER_SETTINGS }
  private mode: TimerMode = 'focus'
  private status: TimerStatus = 'idle'
  private completedFocus = 0
  private remainingMs = this.modeDurationMs('focus')
  private endAtMs: number | null = null
  private tickTimer: NodeJS.Timeout | null = null
  private readonly listeners = new Set<TimerStateListener>()

  getState(): TimerState {
    const changed = this.syncRunningState()
    if (changed) {
      this.emitState()
    }
    return this.snapshot()
  }

  start(): TimerState {
    if (this.status === 'running') {
      return this.snapshot()
    }

    if (this.status === 'idle' || this.remainingMs <= 0) {
      this.remainingMs = this.modeDurationMs(this.mode)
    }

    this.status = 'running'
    this.endAtMs = Date.now() + this.remainingMs
    this.ensureTicker()
    this.emitState()
    return this.snapshot()
  }

  pause(): TimerState {
    if (this.status !== 'running') {
      return this.snapshot()
    }

    this.syncRunningState()
    this.status = 'paused'
    this.endAtMs = null
    this.stopTicker()
    this.emitState()
    return this.snapshot()
  }

  reset(): TimerState {
    this.stopTicker()
    this.status = 'idle'
    this.endAtMs = null
    this.remainingMs = this.modeDurationMs(this.mode)
    this.emitState()
    return this.snapshot()
  }

  skip(): TimerState {
    const nextMode = this.mode === 'focus' ? this.nextBreakMode() : 'focus'
    this.switchSegment(nextMode, this.settings.autoStartNext)
    this.emitState()
    return this.snapshot()
  }

  setMode(mode: TimerMode): TimerState {
    this.switchSegment(mode, false)
    this.emitState()
    return this.snapshot()
  }

  updateSettings(partial: TimerSettingsPatch): TimerState {
    this.settings = {
      focusMinutes: this.normalizePositiveInt(partial.focusMinutes, this.settings.focusMinutes),
      shortBreakMinutes: this.normalizePositiveInt(
        partial.shortBreakMinutes,
        this.settings.shortBreakMinutes
      ),
      longBreakMinutes: this.normalizePositiveInt(
        partial.longBreakMinutes,
        this.settings.longBreakMinutes
      ),
      longBreakEvery: this.normalizePositiveInt(
        partial.longBreakEvery,
        this.settings.longBreakEvery
      ),
      autoStartNext:
        typeof partial.autoStartNext === 'boolean'
          ? partial.autoStartNext
          : this.settings.autoStartNext
    }

    const modeDurationMs = this.modeDurationMs(this.mode)
    if (this.status === 'idle') {
      this.remainingMs = modeDurationMs
    } else if (this.status === 'paused') {
      this.remainingMs = Math.min(this.remainingMs, modeDurationMs)
    } else if (this.status === 'running') {
      this.syncRunningState()
      this.remainingMs = Math.min(this.remainingMs, modeDurationMs)
      this.endAtMs = Date.now() + this.remainingMs
    }

    this.emitState()
    return this.snapshot()
  }

  onStateChanged(listener: TimerStateListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose(): void {
    this.stopTicker()
    this.listeners.clear()
  }

  private syncRunningState(): boolean {
    if (this.status !== 'running' || this.endAtMs === null) {
      return false
    }

    const nextRemainingMs = Math.max(0, this.endAtMs - Date.now())
    if (nextRemainingMs > 0) {
      if (nextRemainingMs === this.remainingMs) {
        return false
      }
      this.remainingMs = nextRemainingMs
      return true
    }

    this.completeCurrentSegment()
    return true
  }

  private completeCurrentSegment(): void {
    if (this.mode === 'focus') {
      this.completedFocus += 1
      this.switchSegment(this.nextBreakMode(), this.settings.autoStartNext)
      return
    }

    this.switchSegment('focus', this.settings.autoStartNext)
  }

  private switchSegment(mode: TimerMode, autoStart: boolean): void {
    this.stopTicker()
    this.mode = mode
    this.remainingMs = this.modeDurationMs(mode)
    this.endAtMs = null

    if (autoStart) {
      this.status = 'running'
      this.endAtMs = Date.now() + this.remainingMs
      this.ensureTicker()
      return
    }

    this.status = 'idle'
  }

  private nextBreakMode(): TimerMode {
    return this.completedFocus % this.settings.longBreakEvery === 0 ? 'longBreak' : 'shortBreak'
  }

  private modeDurationMs(mode: TimerMode): number {
    if (mode === 'focus') {
      return this.settings.focusMinutes * MS_PER_MINUTE
    }
    if (mode === 'shortBreak') {
      return this.settings.shortBreakMinutes * MS_PER_MINUTE
    }
    return this.settings.longBreakMinutes * MS_PER_MINUTE
  }

  private ensureTicker(): void {
    if (this.tickTimer !== null) {
      return
    }

    this.tickTimer = setInterval(() => {
      const changed = this.syncRunningState()
      if (changed) {
        this.emitState()
      }
    }, TICK_INTERVAL_MS)
  }

  private stopTicker(): void {
    if (this.tickTimer === null) {
      return
    }
    clearInterval(this.tickTimer)
    this.tickTimer = null
  }

  private emitState(): void {
    const state = this.snapshot()
    this.listeners.forEach((listener) => {
      listener(state)
    })
  }

  private snapshot(): TimerState {
    return {
      mode: this.mode,
      status: this.status,
      durationMs: this.modeDurationMs(this.mode),
      remainingMs: this.remainingMs,
      completedFocus: this.completedFocus,
      settings: { ...this.settings }
    }
  }

  private normalizePositiveInt(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback
    }
    return Math.max(1, Math.floor(value))
  }
}
