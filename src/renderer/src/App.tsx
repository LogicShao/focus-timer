import { useEffect, useRef, useState } from 'react'
import type { TodaySummary } from '../../shared/sessionTypes'
import {
  TIMER_MODES,
  type TimerMode,
  type TimerSettings,
  type TimerState,
  type TimerStatus
} from '../../shared/timerTypes'
import { detectLang, t, type Lang } from './i18n'

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

function modeLabel(mode: TimerMode, lang: Lang): string {
  if (mode === 'focus') {
    return t('focus', lang)
  }
  if (mode === 'shortBreak') {
    return t('shortBreak', lang)
  }
  return t('longBreak', lang)
}

function statusLabel(status: TimerStatus, lang: Lang): string {
  if (status === 'running') {
    return t('statusRunning', lang)
  }
  if (status === 'paused') {
    return t('statusPaused', lang)
  }
  return t('statusIdle', lang)
}

function App(): React.JSX.Element {
  const [lang, setLang] = useState<Lang>(() => detectLang())
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
    const onLanguageChange = (): void => {
      setLang(detectLang())
    }

    window.addEventListener('languagechange', onLanguageChange)
    return () => {
      window.removeEventListener('languagechange', onLanguageChange)
    }
  }, [])

  useEffect(() => {
    document.title = t('appTitle', lang)
  }, [lang])

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
    <div className="page-shell">
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
                {modeLabel(modeItem, lang)}
              </button>
            ))}
          </div>
          <button
            className="settings-trigger"
            onClick={() => void openSettings()}
            title={t('settings', lang)}
            type="button"
          >
            ?
          </button>
        </header>

        <section className="display">
          <div className="title">{modeLabel(mode, lang)}</div>
          <div className="time">{formatTime(remaining)}</div>
          <div className="meta">
            {t('status', lang)}: {statusLabel(status, lang)} | {t('completedFocus', lang)}:{' '}
            {currentState?.completedFocus ?? 0}
          </div>
          {error ? <div className="error">{error}</div> : null}
        </section>

        <footer className="controls">
          {status === 'running' ? (
            <button
              onClick={() => void runAction(() => window.timer.pause(), { refreshToday: true })}
              type="button"
            >
              {t('pause', lang)}
            </button>
          ) : (
            <button
              onClick={() => void runAction(() => window.timer.start(), { refreshToday: true })}
              type="button"
            >
              {t('start', lang)}
            </button>
          )}
          <button
            onClick={() => void runAction(() => window.timer.reset(), { refreshToday: true })}
            type="button"
          >
            {t('reset', lang)}
          </button>
          <button
            onClick={() => void runAction(() => window.timer.skip(), { refreshToday: true })}
            type="button"
          >
            {t('skip', lang)}
          </button>
        </footer>

        <section className="today-summary">
          {t('today', lang)}: {todaySummary?.pomodoros ?? 0} {t('pomodoros', lang)},{' '}
          {todaySummary?.focusMinutes ?? 0} {t('minutes', lang)}
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
              <h2>{t('settings', lang)}</h2>
              <label>
                {t('focusMinutes', lang)}
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
                {t('shortBreakMinutes', lang)}
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
                {t('longBreakMinutes', lang)}
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
                {t('longBreakEvery', lang)}
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
                <span>{t('autoStartNext', lang)}</span>
              </label>
              <div className="modal-actions">
                <button onClick={() => setIsSettingsOpen(false)} type="button">
                  {t('cancel', lang)}
                </button>
                <button onClick={() => void saveSettings()} type="button">
                  {t('save', lang)}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default App
