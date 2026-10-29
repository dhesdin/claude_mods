// Display languages. To add one: add its code to `language.options` in plugin.json and a table below.
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export type Strings = {
  paneTitle: string
  commandDescription: string
  week: (n: number) => string
  weeks: (n: number) => string
  none: string
  tooling: string
  idleFor: (project: string, weeks: number) => string
  neverSeen: (project: string) => string
  only: string
  total: string
  opened: string
  closed: string
  notReady: string
  usage: string
}

const TABLES: Record<Lang, Strings> = {
  en: {
    paneTitle: 'Hours',
    commandDescription: 'Claude Code time per project: /hours (this week), /hours 4 (last 4 weeks), /hours panel',
    week: n => `Week ${n} (Claude Code time)`,
    weeks: n => `Last ${n} weeks (Claude Code time)`,
    none: 'No Claude Code time recorded yet.',
    tooling: '← tooling',
    idleFor: (p, w) => `⚠ ${p}: 0h for ${w} week${w === 1 ? '' : 's'}`,
    neverSeen: p => `⚠ ${p}: no Claude Code time recorded`,
    only: 'Active time in Claude Code only, not time spent in your editor without Claude.',
    total: 'total',
    opened: 'Hours panel opened.',
    closed: 'Hours panel closed.',
    notReady: 'project-hours is not ready yet.',
    usage: 'Usage: /hours [weeks] | /hours panel',
  },
  fr: {
    paneTitle: 'Heures',
    commandDescription: 'Temps Claude Code par projet : /hours (semaine), /hours 4 (4 semaines), /hours panel',
    week: n => `Semaine ${n} (temps Claude Code)`,
    weeks: n => `${n} dernières semaines (temps Claude Code)`,
    none: 'Aucun temps Claude Code enregistré pour l’instant.',
    tooling: '← outillage',
    idleFor: (p, w) => `⚠ ${p} : 0h depuis ${w} semaine${w > 1 ? 's' : ''}`,
    neverSeen: p => `⚠ ${p} : aucun temps Claude Code enregistré`,
    only: 'Temps actif dans Claude Code seulement, pas le temps passé dans l’éditeur sans Claude.',
    total: 'total',
    opened: 'Panneau Heures ouvert.',
    closed: 'Panneau Heures fermé.',
    notReady: 'project-hours n’est pas encore prêt.',
    usage: 'Usage : /hours [semaines] | /hours panel',
  },
  ja: {
    paneTitle: '時間',
    commandDescription: 'プロジェクト別の Claude Code 時間：/hours（今週）、/hours 4（直近4週）、/hours panel',
    week: n => `第${n}週（Claude Code 時間）`,
    weeks: n => `直近${n}週（Claude Code 時間）`,
    none: 'まだ Claude Code の時間は記録されていません。',
    tooling: '← ツール',
    idleFor: (p, w) => `⚠ ${p}：${w}週間 0h`,
    neverSeen: p => `⚠ ${p}：Claude Code の時間の記録なし`,
    only: 'Claude Code 内のアクティブ時間のみ。Claude なしでエディタにいた時間は含みません。',
    total: '合計',
    opened: '時間パネルを開きました。',
    closed: '時間パネルを閉じました。',
    notReady: 'project-hours はまだ準備中です。',
    usage: '使い方：/hours [週数] | /hours panel',
  },
  zh: {
    paneTitle: '时长',
    commandDescription: '按项目统计的 Claude Code 时间：/hours（本周）、/hours 4（最近4周）、/hours panel',
    week: n => `第${n}周（Claude Code 时间）`,
    weeks: n => `最近${n}周（Claude Code 时间）`,
    none: '尚未记录 Claude Code 时间。',
    tooling: '← 工具',
    idleFor: (p, w) => `⚠ ${p}：已 ${w} 周 0h`,
    neverSeen: p => `⚠ ${p}：没有 Claude Code 时间记录`,
    only: '仅统计 Claude Code 中的活跃时间，不包括不用 Claude 时在编辑器中的时间。',
    total: '合计',
    opened: '时长面板已打开。',
    closed: '时长面板已关闭。',
    notReady: 'project-hours 尚未就绪。',
    usage: '用法：/hours [周数] | /hours panel',
  },
}

export function strings(lang: unknown): Strings {
  return TABLES[(LANGS as readonly unknown[]).includes(lang) ? (lang as Lang) : 'en']
}
