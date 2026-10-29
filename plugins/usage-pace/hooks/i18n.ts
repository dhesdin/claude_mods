// Display languages. To add one: add its code to `language.options` in plugin.json and a table below.
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export type DayKind = 'today' | 'tomorrow' | 'later'

export type Strings = {
  fiveHour: string
  week: string
  pace: string
  pct: (n: number) => string
  resetsIn: (duration: string, moment: string) => string
  resetUnknown: string
  // Countdown: days > 0 shows days + hours, otherwise hours + minutes.
  duration: (days: number, hours: number, minutes: number) => string
  time: (h: number, m: number) => string
  hour: (h: number) => string
  weekdays: readonly string[]
  at: (day: DayKind, weekday: string, time: string) => string
  around: (day: DayKind, weekday: string, hour: string) => string
  projected: (percent: number) => string
  notReached: string
  hitsLimit: (when: string) => string
  margin: (duration: string) => string
  tooEarly: string
  tooEarlyDetail: (hours: number) => string
}

const pad = (n: number) => String(n).padStart(2, '0')

const en: Strings = {
  fiveHour: '5h session',
  week: 'Week',
  pace: 'Pace',
  pct: n => `${n}%`,
  resetsIn: (d, m) => `Resets in: ${d} (${m})`,
  resetUnknown: 'Reset: n/a',
  duration: (d, h, m) => (d > 0 ? `${d}d ${pad(h)}h` : `${pad(h)}h${pad(m)}`),
  time: (h, m) => `${pad(h)}:${pad(m)}`,
  hour: h => `${pad(h)}:00`,
  weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  at: (day, wd, time) => (day === 'today' ? `at ${time}` : day === 'tomorrow' ? `tomorrow at ${time}` : `${wd} at ${time}`),
  around: (day, wd, hour) => `${day === 'today' ? 'today' : day === 'tomorrow' ? 'tomorrow' : wd} around ${hour}`,
  projected: p => `At this pace, ~${p}% at reset`,
  notReached: 'limit not reached this week',
  hitsLimit: when => `At this pace, limit reached ${when}`,
  margin: d => `i.e. ${d} before reset`,
  tooEarly: 'Not enough data yet to estimate',
  tooEarlyDetail: h => `(less than ${h}h since reset)`,
}

const fr: Strings = {
  fiveHour: 'Session 5h',
  week: 'Semaine',
  pace: 'Rythme',
  pct: n => `${n} %`,
  resetsIn: (d, m) => `Réinitialisation dans : ${d} (${m})`,
  resetUnknown: 'Réinitialisation : n/a',
  duration: (d, h, m) => (d > 0 ? `${d}j ${pad(h)}h` : `${pad(h)}h${pad(m)}`),
  time: (h, m) => `${pad(h)}h${pad(m)}`,
  hour: h => `${h}h`,
  weekdays: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  at: (day, wd, time) => (day === 'today' ? `à ${time}` : day === 'tomorrow' ? `demain à ${time}` : `${wd} à ${time}`),
  around: (day, wd, hour) => `${day === 'today' ? "aujourd'hui" : day === 'tomorrow' ? 'demain' : wd} vers ${hour}`,
  projected: p => `À ce rythme, ~${p} % à la réinitialisation`,
  notReached: 'limite non atteinte cette semaine',
  hitsLimit: when => `À ce rythme, limite atteinte ${when}`,
  margin: d => `soit ${d} avant la réinitialisation`,
  tooEarly: 'Pas encore assez de recul pour estimer',
  tooEarlyDetail: h => `(moins de ${h}h depuis la réinitialisation)`,
}

const ja: Strings = {
  fiveHour: '5時間セッション',
  week: '週',
  pace: 'ペース',
  pct: n => `${n}%`,
  resetsIn: (d, m) => `リセットまで：${d}（${m}）`,
  resetUnknown: 'リセット：n/a',
  duration: (d, h, m) => (d > 0 ? `${d}日${h}時間` : `${h}時間${pad(m)}分`),
  time: (h, m) => `${pad(h)}:${pad(m)}`,
  hour: h => `${h}時`,
  weekdays: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  at: (day, wd, time) => (day === 'today' ? time : day === 'tomorrow' ? `明日 ${time}` : `${wd} ${time}`),
  around: (day, wd, hour) => `${day === 'today' ? '今日' : day === 'tomorrow' ? '明日' : wd} ${hour}頃`,
  projected: p => `このペースだと、リセット時に約 ${p}%`,
  notReached: '今週は上限に達しません',
  hitsLimit: when => `このペースだと、${when}に上限に達します`,
  margin: d => `リセットの ${d} 前`,
  tooEarly: 'まだ推定できるほどのデータがありません',
  tooEarlyDetail: h => `（リセットから ${h} 時間未満）`,
}

const zh: Strings = {
  fiveHour: '5小时会话',
  week: '本周',
  pace: '节奏',
  pct: n => `${n}%`,
  resetsIn: (d, m) => `距重置：${d}（${m}）`,
  resetUnknown: '重置：n/a',
  duration: (d, h, m) => (d > 0 ? `${d}天${h}小时` : `${h}小时${pad(m)}分`),
  time: (h, m) => `${pad(h)}:${pad(m)}`,
  hour: h => `${h}点`,
  weekdays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  at: (day, wd, time) => (day === 'today' ? `今天 ${time}` : day === 'tomorrow' ? `明天 ${time}` : `${wd} ${time}`),
  around: (day, wd, hour) => `${day === 'today' ? '今天' : day === 'tomorrow' ? '明天' : wd} ${hour}左右`,
  projected: p => `按此速度，重置时约 ${p}%`,
  notReached: '本周不会达到上限',
  hitsLimit: when => `按此速度，将在${when}达到上限`,
  margin: d => `即重置前 ${d}`,
  tooEarly: '数据不足，暂无法估算',
  tooEarlyDetail: h => `（距重置不足 ${h} 小时）`,
}

const TABLES: Record<Lang, Strings> = { en, fr, ja, zh }

export function strings(lang: unknown): Strings {
  return TABLES[(LANGS as readonly unknown[]).includes(lang) ? (lang as Lang) : 'en']
}
