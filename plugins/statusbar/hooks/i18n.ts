// Display languages. To add one: add its code to `language.options` in plugin.json and a table below.
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export type Strings = {
  week: string
  // Suffix of the day count in a countdown ("1d20h").
  day: string
  // Sunday first, as Date.getDay() counts.
  weekdays: readonly string[]
  commandDescription: string
  shown: string
  hidden: string
}

const TABLES: Record<Lang, Strings> = {
  en: {
    week: '7d',
    day: 'd',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    commandDescription: 'Hide or show the status band (model, context, usage) for this session',
    shown: 'Status band shown.',
    hidden: 'Status band hidden for this session (/statusbar to show it again).',
  },
  fr: {
    week: '7j',
    day: 'j',
    weekdays: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
    commandDescription: 'Masquer ou afficher la bande d’état (modèle, contexte, usage) pour cette session',
    shown: 'Bande d’état affichée.',
    hidden: 'Bande d’état masquée pour cette session (/statusbar pour la réafficher).',
  },
  ja: {
    week: '7日',
    day: '日',
    weekdays: ['日', '月', '火', '水', '木', '金', '土'],
    commandDescription: 'このセッションのステータス帯（モデル、コンテキスト、使用量）を表示・非表示',
    shown: 'ステータス帯を表示しました。',
    hidden: 'このセッションではステータス帯を非表示にしました（/statusbar で再表示）。',
  },
  zh: {
    week: '7天',
    day: '天',
    weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    commandDescription: '在本会话中隐藏或显示状态栏（模型、上下文、用量）',
    shown: '状态栏已显示。',
    hidden: '本会话已隐藏状态栏（/statusbar 重新显示）。',
  },
}

export function strings(lang: unknown): Strings {
  return TABLES[(LANGS as readonly unknown[]).includes(lang) ? (lang as Lang) : 'en']
}
