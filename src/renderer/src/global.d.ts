import type { TimerAPI } from '../../preload/index'

declare global {
  interface Window {
    timer: TimerAPI
  }
}

export {}
