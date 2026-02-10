export type Lang = 'en' | 'zh'

export const dict = {
  en: {
    appTitle: 'Focus Timer',
    focus: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset',
    skip: 'Skip',
    status: 'Status',
    completedFocus: 'Completed Focus',
    today: 'Today',
    pomodoros: 'pomodoros',
    minutes: 'minutes',
    settings: 'Settings',
    save: 'Save',
    cancel: 'Cancel',
    focusMinutes: 'Focus minutes',
    shortBreakMinutes: 'Short break minutes',
    longBreakMinutes: 'Long break minutes',
    longBreakEvery: 'Long break every',
    autoStartNext: 'Auto start next',
    statusIdle: 'idle',
    statusRunning: 'running',
    statusPaused: 'paused'
  },
  zh: {
    appTitle: '番茄钟',
    focus: '专注',
    shortBreak: '短休息',
    longBreak: '长休息',
    start: '开始',
    pause: '暂停',
    reset: '重置',
    skip: '跳过',
    status: '状态',
    completedFocus: '已完成专注',
    today: '今日',
    pomodoros: '个番茄钟',
    minutes: '分钟',
    settings: '设置',
    save: '保存',
    cancel: '取消',
    focusMinutes: '专注时长（分钟）',
    shortBreakMinutes: '短休息时长（分钟）',
    longBreakMinutes: '长休息时长（分钟）',
    longBreakEvery: '每多少次专注进入长休息',
    autoStartNext: '自动开始下一段',
    statusIdle: '未开始',
    statusRunning: '进行中',
    statusPaused: '已暂停'
  }
} as const

type I18nKey = keyof typeof dict.en

export function detectLang(): Lang {
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

export function t(key: I18nKey, lang: Lang): string {
  return dict[lang][key]
}
