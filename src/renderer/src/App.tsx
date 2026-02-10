import { useEffect, useState } from 'react'
import { TIMER_MODES, type TimerMode, type TimerState } from '../../shared/timerTypes'

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

function App(): React.JSX.Element {
  const [state, setState] = useState<TimerState | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let active = true

    const unsubscribe = window.timer.onState((nextState) => {
      if (active) {
        setState(nextState)
      }
    })

    window.timer
      .getState()
      .then((initialState) => {
        if (active) {
          setState(initialState)
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

  const runAction = async (action: () => Promise<TimerState>): Promise<void> => {
    try {
      const nextState = await action()
      setState(nextState)
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
      <header className="mode-tabs">
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
          <button onClick={() => void runAction(() => window.timer.pause())} type="button">
            Pause
          </button>
        ) : (
          <button onClick={() => void runAction(() => window.timer.start())} type="button">
            Start
          </button>
        )}
        <button onClick={() => void runAction(() => window.timer.reset())} type="button">
          Reset
        </button>
        <button onClick={() => void runAction(() => window.timer.skip())} type="button">
          Skip
        </button>
      </footer>
    </div>
  )
}

export default App
