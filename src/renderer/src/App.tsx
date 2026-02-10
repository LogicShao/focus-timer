import { useEffect, useRef, useState } from 'react'
import type { TodaySummary } from '../../shared/sessionTypes'
import {
  TIMER_MODES,
  type TimerMode,
  type TimerSettings,
  type TimerState
} from '../../shared/timerTypes'

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break'
}

function formatTime(remainingMs: number): string {
  const safeMs = Math.max(0, remainingMs)
  const totalSeconds = Math.floor(safeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function didNaturalFocusComplete(prev: TimerState | null, next: TimerState): boolean {
  if (prev === null) {
    return false
  }

  const switchedToBreak = prev.mode === 'focus' && next.mode !== 'focus'
  const completedIncreased = next.completedFocus === prev.completedFocus + 1
  return switchedToBreak && completedIncreased
}

function App(): React.JSX.Element {
  const [state, setState] = useState<TimerState | null>(null)
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<TimerSettings | null>(null)
  const [error, setError] = useState<string>('')
  const prevStateRef = useRef<TimerState | null>(null)

  const refreshTodaySummary = async (): Promise<void> => {
    try {
      const summary = await window.timer.getTodaySummary()
      setTodaySummary(summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    let active = true

    const unsubscribe = window.timer.onState((nextState) => {
      if (active) {
        setState(nextState)
        if (didNaturalFocusComplete(prevStateRef.current, nextState)) {
          void refreshTodaySummary()
        }
        prevStateRef.current = nextState
      }
    })

    void Promise.all([
      window.timer.getState(),
      window.timer.getSettings(),
      window.timer.getTodaySummary()
    ])
      .then(([initialState, initialSettings, initialSummary]) => {
        if (active) {
          setState(initialState)
          prevStateRef.current = initialState
          setSettingsDraft(initialSettings)
          setTodaySummary(initialSummary)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const runAction = async (
    action: () => Promise<TimerState>,
    options?: { refreshToday?: boolean }
  ): Promise<void> => {
    try {
      await action()
      setError('')
      if (options?.refreshToday) {
        await refreshTodaySummary()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const openSettings = async (): Promise<void> => {
    try {
      const settings = await window.timer.getSettings()
      setSettingsDraft(settings)
      setIsSettingsOpen(true)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const updateDraftNumber = (
    field: 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'longBreakEvery',
    value: number
  ): void => {
    setSettingsDraft((prev) => {
      if (prev === null || !Number.isFinite(value)) {
        return prev
      }
      const normalizedValue =
        field === 'longBreakEvery' ? Math.max(1, Math.floor(value)) : Math.max(0.1, value)
      return { ...prev, [field]: normalizedValue }
    })
  }

  const saveSettings = async (): Promise<void> => {
    if (settingsDraft === null) {
      return
    }

    try {
      await window.timer.updateSettings(settingsDraft)
      setIsSettingsOpen(false)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const currentState = state
  const mode = currentState?.mode ?? 'focus'
  const status = currentState?.status ?? 'idle'
  const remaining = currentState?.remainingMs ?? 0

  return (
    <div className={`app app--${mode}`}>
      <header className="top-row">
        <div className="mode-tabs">
          {TIMER_MODES.map((modeItem) => (
            <button
              key={modeItem}
              className={`mode-tab ${mode === modeItem ? 'is-active' : ''}`}
              onClick={() => void runAction(() => window.timer.setMode(modeItem))}
              type="button"
            >
              {MODE_LABELS[modeItem]}
            </button>
          ))}
        </div>
        <button
          className="settings-trigger"
          onClick={() => void openSettings()}
          title="Settings"
          type="button"
        >
          ⚙
        </button>
      </header>

      <section className="display">
        <div className="title">{MODE_LABELS[mode]}</div>
        <div className="time">{formatTime(remaining)}</div>
        <div className="meta">
          Status: {status} | Completed Focus: {currentState?.completedFocus ?? 0}
        </div>
        {error ? <div className="error">{error}</div> : null}
      </section>

      <footer className="controls">
        {status === 'running' ? (
          <button
            onClick={() => void runAction(() => window.timer.pause(), { refreshToday: true })}
            type="button"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={() => void runAction(() => window.timer.start(), { refreshToday: true })}
            type="button"
          >
            Start
          </button>
        )}
        <button
          onClick={() => void runAction(() => window.timer.reset(), { refreshToday: true })}
          type="button"
        >
          Reset
        </button>
        <button
          onClick={() => void runAction(() => window.timer.skip(), { refreshToday: true })}
          type="button"
        >
          Skip
        </button>
      </footer>

      <section className="today-summary">
        Today: {todaySummary?.pomodoros ?? 0} pomodoros, {todaySummary?.focusMinutes ?? 0} minutes
      </section>

      {isSettingsOpen && settingsDraft ? (
        <div
          className="modal-backdrop"
          onClick={() => setIsSettingsOpen(false)}
          role="presentation"
        >
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2>Settings</h2>
            <label>
              Focus minutes
              <input
                min={0.1}
                onChange={(event) =>
                  updateDraftNumber('focusMinutes', event.currentTarget.valueAsNumber)
                }
                step={0.1}
                type="number"
                value={settingsDraft.focusMinutes}
              />
            </label>
            <label>
              Short break minutes
              <input
                min={0.1}
                onChange={(event) =>
                  updateDraftNumber('shortBreakMinutes', event.currentTarget.valueAsNumber)
                }
                step={0.1}
                type="number"
                value={settingsDraft.shortBreakMinutes}
              />
            </label>
            <label>
              Long break minutes
              <input
                min={0.1}
                onChange={(event) =>
                  updateDraftNumber('longBreakMinutes', event.currentTarget.valueAsNumber)
                }
                step={0.1}
                type="number"
                value={settingsDraft.longBreakMinutes}
              />
            </label>
            <label>
              Long break every
              <input
                min={1}
                onChange={(event) =>
                  updateDraftNumber('longBreakEvery', event.currentTarget.valueAsNumber)
                }
                step={1}
                type="number"
                value={settingsDraft.longBreakEvery}
              />
            </label>
            <label className="checkbox-line">
              <input
                checked={settingsDraft.autoStartNext}
                onChange={(event) => {
                  const checked = event.currentTarget.checked
                  setSettingsDraft((prev) => (prev ? { ...prev, autoStartNext: checked } : prev))
                }}
                type="checkbox"
              />
              Auto start next
            </label>
            <div className="modal-actions">
              <button onClick={() => setIsSettingsOpen(false)} type="button">
                Cancel
              </button>
              <button onClick={() => void saveSettings()} type="button">
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
