import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimerEngine } from '../timerEngine'

const FAST_FOCUS_MINUTES = 0.01
const COMPLETE_FOCUS_ADVANCE_MS = 700

function completeFocus(engine: TimerEngine): void {
  engine.start()
  vi.advanceTimersByTime(COMPLETE_FOCUS_ADVANCE_MS)
}

describe('TimerEngine basics', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('increments completedFocus on natural finish and switches shortBreak/longBreak by rule', () => {
    const engine = new TimerEngine()
    engine.updateSettings({
      focusMinutes: FAST_FOCUS_MINUTES,
      longBreakEvery: 2,
      shortBreakMinutes: 5,
      longBreakMinutes: 15
    })

    completeFocus(engine)
    const firstCycle = engine.getState()
    expect(firstCycle.completedFocus).toBe(1)
    expect(firstCycle.mode).toBe('shortBreak')
    expect(firstCycle.status).toBe('idle')

    engine.setMode('focus')
    completeFocus(engine)
    const secondCycle = engine.getState()
    expect(secondCycle.completedFocus).toBe(2)
    expect(secondCycle.mode).toBe('longBreak')
    expect(secondCycle.status).toBe('idle')

    engine.dispose()
  })

  it('does not increase completedFocus when skipping focus', () => {
    const engine = new TimerEngine()
    engine.updateSettings({
      focusMinutes: FAST_FOCUS_MINUTES,
      longBreakEvery: 4
    })

    engine.start()
    vi.advanceTimersByTime(200)
    const skipped = engine.skip()

    expect(skipped.completedFocus).toBe(0)
    expect(engine.getState().completedFocus).toBe(0)

    engine.dispose()
  })

  it('uses longBreak when longBreakEvery equals 1', () => {
    const engine = new TimerEngine()
    engine.updateSettings({
      focusMinutes: FAST_FOCUS_MINUTES,
      longBreakEvery: 1
    })

    completeFocus(engine)
    const firstFinish = engine.getState()
    expect(firstFinish.completedFocus).toBe(1)
    expect(firstFinish.mode).toBe('longBreak')

    engine.setMode('focus')
    completeFocus(engine)
    const secondFinish = engine.getState()
    expect(secondFinish.completedFocus).toBe(2)
    expect(secondFinish.mode).toBe('longBreak')

    engine.dispose()
  })
})
