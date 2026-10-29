// Display languages. To add one: add its code to `language.options` in plugin.json and a table below.
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export type Strings = {
  commandDescription: string
  status: (repos: string) => string
  activated: (root: string) => string
  alreadyActive: (root: string) => string
  deactivated: (root: string) => string
  notActive: string
  personOnly: string
  current: (roots: string) => string
  off: string
  usage: string
}

const TABLES: Record<Lang, Strings> = {
  en: {
    commandDescription: 'Teacher mode for the current repo, this session: Claude reviews, you write the code',
    status: r => `TEACHER MODE · ${r}`,
    activated: r => `Teacher mode on for ${r} (this session): Claude can no longer write in it.`,
    alreadyActive: r => `Teacher mode is already on for ${r}.`,
    deactivated: r => `Teacher mode off for ${r}.`,
    notActive: 'Teacher mode is not on for this repo.',
    personOnly: 'Only you can turn teacher mode off, from the prompt.',
    current: r => `Teacher mode on for: ${r}`,
    off: 'Teacher mode is off.',
    usage: 'Usage: /teacher-mode activate | deactivate',
  },
  fr: {
    commandDescription: 'Mode prof pour le repo courant, le temps de la session : Claude relit, tu écris le code',
    status: r => `MODE PROF · ${r}`,
    activated: r => `Mode prof activé pour ${r} (cette session) : Claude ne peut plus y écrire.`,
    alreadyActive: r => `Le mode prof est déjà actif pour ${r}.`,
    deactivated: r => `Mode prof désactivé pour ${r}.`,
    notActive: "Le mode prof n'est pas actif pour ce repo.",
    personOnly: 'Seul toi peux désactiver le mode prof, depuis le prompt.',
    current: r => `Mode prof actif pour : ${r}`,
    off: 'Le mode prof est inactif.',
    usage: 'Usage : /teacher-mode activate | deactivate',
  },
  ja: {
    commandDescription: '現在のリポジトリでこのセッションの先生モード：Claude はレビュー、コードはあなたが書く',
    status: r => `先生モード · ${r}`,
    activated: r => `${r} の先生モードを有効にしました（このセッション）：Claude はここに書き込めません。`,
    alreadyActive: r => `${r} の先生モードはすでに有効です。`,
    deactivated: r => `${r} の先生モードを無効にしました。`,
    notActive: 'このリポジトリでは先生モードは有効ではありません。',
    personOnly: '先生モードを無効にできるのは、プロンプトからあなただけです。',
    current: r => `先生モード有効：${r}`,
    off: '先生モードは無効です。',
    usage: '使い方：/teacher-mode activate | deactivate',
  },
  zh: {
    commandDescription: '当前仓库、本次会话的教师模式：Claude 负责审阅，代码由你来写',
    status: r => `教师模式 · ${r}`,
    activated: r => `已为 ${r} 开启教师模式（本次会话）：Claude 无法再写入其中。`,
    alreadyActive: r => `${r} 的教师模式已经开启。`,
    deactivated: r => `已关闭 ${r} 的教师模式。`,
    notActive: '此仓库未开启教师模式。',
    personOnly: '只有你本人可以在提示框中关闭教师模式。',
    current: r => `教师模式已开启：${r}`,
    off: '教师模式未开启。',
    usage: '用法：/teacher-mode activate | deactivate',
  },
}

export function strings(lang: unknown): Strings {
  return TABLES[(LANGS as readonly unknown[]).includes(lang) ? (lang as Lang) : 'en']
}
