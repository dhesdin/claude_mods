// Active-time tracking and reporting. Pure functions: no I/O here.

export type Segment = { id: string; machine: string; project: string; start: number; end: number }

const DAY_MS = 24 * 3600 * 1000
export const WEEK_MS = 7 * DAY_MS

// Monday-based (ISO 8601) week of a local time: { key: '2026-W44', start }.
export function isoWeek(ms: number): { key: string; week: number; start: number } {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  const weekday = (d.getDay() + 6) % 7 // Monday = 0
  const start = new Date(d)
  start.setDate(d.getDate() - weekday)
  // The ISO year is the year of the week's Thursday.
  const thursday = new Date(start)
  thursday.setDate(start.getDate() + 3)
  const jan4 = new Date(thursday.getFullYear(), 0, 4)
  const week1 = new Date(jan4)
  week1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const week = 1 + Math.round((start.getTime() - week1.getTime()) / WEEK_MS)
  return { key: `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`, week, start: start.getTime() }
}

// The segment of one session: extended while events come less than `idleMs` apart, cut otherwise.
export class Tracker {
  private segments: Segment[]
  private seq: number

  constructor(
    private readonly sessionId: string,
    private readonly machine: string,
    private readonly idleMs: number,
    loaded: Segment[] = [],
  ) {
    this.segments = [...loaded]
    this.seq = loaded.length
  }

  // Records activity at `now` on `project`; returns true when the session's segments changed.
  touch(now: number, project: string): boolean {
    const last = this.segments[this.segments.length - 1]
    if (last && last.project === project && now >= last.end && now - last.end <= this.idleMs) {
      last.end = now
      return true
    }
    this.seq += 1
    this.segments.push({ id: `${this.sessionId}-${this.seq}`, machine: this.machine, project, start: now, end: now })
    return true
  }

  all(): readonly Segment[] {
    return this.segments
  }
}

export function toJsonl(segments: readonly Segment[]): string {
  return segments
    .map(s => JSON.stringify({ ...s, start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString() }))
    .join('\n')
    .concat(segments.length > 0 ? '\n' : '')
}

// Lines that do not parse are skipped; for one id, the line that ends last wins.
export function fromJsonl(text: string): Segment[] {
  const byId = new Map<string, Segment>()
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    try {
      const raw = JSON.parse(line) as Record<string, unknown>
      const s: Segment = {
        id: String(raw.id),
        machine: String(raw.machine ?? ''),
        project: String(raw.project ?? ''),
        start: Date.parse(String(raw.start)),
        end: Date.parse(String(raw.end)),
      }
      if (!Number.isFinite(s.start) || !Number.isFinite(s.end) || s.end < s.start || s.project === '') continue
      const seen = byId.get(s.id)
      if (!seen || s.end > seen.end) byId.set(s.id, s)
    } catch {
      // A broken line never breaks the report.
    }
  }
  return [...byId.values()]
}

// Milliseconds per project for the weeks listed (by key), a segment counted in the week it started.
export function totals(segments: readonly Segment[], weekKeys: readonly string[]): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>()
  for (const s of segments) {
    const key = isoWeek(s.start).key
    if (!weekKeys.includes(key)) continue
    const perWeek = out.get(s.project) ?? new Map<string, number>()
    perWeek.set(key, (perWeek.get(key) ?? 0) + (s.end - s.start))
    out.set(s.project, perWeek)
  }
  return out
}

// The `count` week keys ending with the week of `now`, oldest first.
export function lastWeeks(now: number, count: number): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) keys.push(isoWeek(now - i * WEEK_MS).key)
  return keys
}

export type Alert = { project: string; weeks: number }

// Priority projects with no time during their last `limit` weeks (rolling, up to `now`).
// Only the segments of lastWeeks(now, limit + 1) are needed to decide.
export function alerts(segments: readonly Segment[], priorities: ReadonlyMap<string, number>, now: number): Alert[] {
  const out: Alert[] = []
  for (const [project, limit] of priorities) {
    if (!segments.some(s => s.project === project && s.end >= now - limit * WEEK_MS)) out.push({ project, weeks: limit })
  }
  return out
}

export function hours(ms: number): string {
  const minutes = Math.round(ms / 60000)
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

export function bar(ms: number, maxMs: number, width = 10): string {
  return maxMs <= 0 ? '' : '█'.repeat(Math.max(ms > 0 ? 1 : 0, Math.round((ms / maxMs) * width)))
}

// "a=1; b = 2" -> Map { a: '1', b: '2' }; entries without "=" are kept with an empty value.
export function parsePairs(text: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const part of text.split(';')) {
    const [key, ...rest] = part.split('=')
    const k = (key ?? '').trim()
    if (k !== '') out.set(k, rest.join('=').trim())
  }
  return out
}

// Display name of the folder a session runs in: the longest alias path prefix, else the git root's
// name (or the folder's), renamed by an alias on that name.
export function projectName(cwd: string, gitRoot: string | null, aliases: ReadonlyMap<string, string>, home: string): string {
  const expand = (p: string) => (p.startsWith('~/') ? `${home}${p.slice(1)}` : p)
  let best = ''
  let bestName = ''
  for (const [key, name] of aliases) {
    if (!key.includes('/')) continue
    const prefix = expand(key).replace(/\/+$/, '')
    if ((cwd === prefix || cwd.startsWith(`${prefix}/`)) && prefix.length > best.length) {
      best = prefix
      bestName = name
    }
  }
  if (bestName) return bestName
  const root = gitRoot ?? cwd
  const base = root.slice(root.lastIndexOf('/') + 1) || root
  return aliases.get(base) || base
}
