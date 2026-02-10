import {
  DEFAULT_TIMER_SETTINGS,
  type TimerSettings,
  type TimerSettingsPatch
} from '../../shared/timerTypes'
import { readJsonFile, writeJsonAtomic } from './fileUtils'

const SETTINGS_KEYS = [
  'focusMinutes',
  'shortBreakMinutes',
  'longBreakMinutes',
  'longBreakEvery',
  'autoStartNext'
] as const

type SettingsKey = (typeof SETTINGS_KEYS)[number]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertPositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${fieldName}: must be an integer > 0`)
  }
  return value
}

function assertPositiveNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${fieldName}: must be a number > 0`)
  }
  return value
}

function assertBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid ${fieldName}: must be boolean`)
  }
  return value
}

export function validateSettingsPatch(input: unknown): TimerSettingsPatch {
  if (!isPlainObject(input)) {
    throw new Error('Invalid settings payload: expected object')
  }

  const patch: TimerSettingsPatch = {}

  Object.keys(input).forEach((rawKey) => {
    if (!(SETTINGS_KEYS as readonly string[]).includes(rawKey)) {
      throw new Error(`Unknown settings key: ${rawKey}`)
    }
  })

  const value = input as Record<SettingsKey, unknown>

  if ('focusMinutes' in value) {
    patch.focusMinutes = assertPositiveNumber(value.focusMinutes, 'focusMinutes')
  }
  if ('shortBreakMinutes' in value) {
    patch.shortBreakMinutes = assertPositiveNumber(value.shortBreakMinutes, 'shortBreakMinutes')
  }
  if ('longBreakMinutes' in value) {
    patch.longBreakMinutes = assertPositiveNumber(value.longBreakMinutes, 'longBreakMinutes')
  }
  if ('longBreakEvery' in value) {
    patch.longBreakEvery = assertPositiveInteger(value.longBreakEvery, 'longBreakEvery')
  }
  if ('autoStartNext' in value) {
    patch.autoStartNext = assertBoolean(value.autoStartNext, 'autoStartNext')
  }

  return patch
}

export class SettingsStore {
  private settings: TimerSettings = { ...DEFAULT_TIMER_SETTINGS }

  constructor(private readonly filePath: string) {}

  async load(): Promise<TimerSettings> {
    const raw = await readJsonFile(this.filePath)
    if (raw === null) {
      this.settings = { ...DEFAULT_TIMER_SETTINGS }
      await this.save(this.settings)
      return this.get()
    }

    try {
      const patch = validateSettingsPatch(raw)
      this.settings = { ...DEFAULT_TIMER_SETTINGS, ...patch }
      return this.get()
    } catch {
      this.settings = { ...DEFAULT_TIMER_SETTINGS }
      await this.save(this.settings)
      return this.get()
    }
  }

  get(): TimerSettings {
    return { ...this.settings }
  }

  async save(settings: TimerSettings): Promise<void> {
    this.settings = { ...settings }
    await writeJsonAtomic(this.filePath, this.settings)
  }
}
