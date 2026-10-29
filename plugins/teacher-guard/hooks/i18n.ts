// Display languages. To add one: add its code to `language.options` in plugin.json and a table below.
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export type Strings = {
  active: string
  tracked: string
  notIgnored: string
}

const TABLES: Record<Lang, Strings> = {
  en: {
    active: 'TEACHER MODE',
    tracked: 'TEACHER MODE · .teacher-mode is tracked by git: git rm --cached .teacher-mode',
    notIgnored: 'TEACHER MODE · .teacher-mode is not git-ignored: echo .teacher-mode >> .git/info/exclude',
  },
  fr: {
    active: 'MODE PROF',
    tracked: 'MODE PROF · .teacher-mode est suivi par git : git rm --cached .teacher-mode',
    notIgnored: "MODE PROF · .teacher-mode n'est pas ignoré par git : echo .teacher-mode >> .git/info/exclude",
  },
  ja: {
    active: '先生モード',
    tracked: '先生モード · .teacher-mode が git で追跡されています：git rm --cached .teacher-mode',
    notIgnored: '先生モード · .teacher-mode が git で無視されていません：echo .teacher-mode >> .git/info/exclude',
  },
  zh: {
    active: '教师模式',
    tracked: '教师模式 · .teacher-mode 已被 git 跟踪：git rm --cached .teacher-mode',
    notIgnored: '教师模式 · .teacher-mode 未被 git 忽略：echo .teacher-mode >> .git/info/exclude',
  },
}

export function strings(lang: unknown): Strings {
  return TABLES[(LANGS as readonly unknown[]).includes(lang) ? (lang as Lang) : 'en']
}
