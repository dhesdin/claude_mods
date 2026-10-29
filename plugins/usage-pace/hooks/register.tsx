import type { Register, SessionRateLimit } from 'claude-code'
import { atom, read, update } from 'claude-code'

import type { Limits } from '../types'
import type { DayKind, Strings } from './i18n'
import { strings } from './i18n'

// Windows received from the engine, and a counter that forces the countdown to redraw.
const limits = atom({ plugin: 'usage-pace', key: 'limits' } as const, [] as Limits)
const tick = atom({ plugin: 'usage-pace', key: 'tick' } as const, 0)

const HOUR_MS = 3600 * 1000
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS
const BAR_WIDTH = 12

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const resetTime = (limit: SessionRateLimit) => (limit.resetsAt ? Date.parse(limit.resetsAt) : NaN)

export function bar(percent: number): string {
  const full = Math.round((clamp(percent, 0, 100) / 100) * BAR_WIDTH)
  return '█'.repeat(full) + '░'.repeat(BAR_WIDTH - full)
}

// White < 50 %, yellow 50-75, orange 75-90, red >= 90 ('text' follows the light/dark theme).
export function levelColor(percent: number): string {
  if (percent >= 90) return 'red'
  if (percent >= 75) return '#ff8700'
  if (percent >= 50) return 'yellow'
  return 'text'
}

export function duration(t: Strings, ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60000))
  return t.duration(Math.floor(minutes / 1440), Math.floor((minutes % 1440) / 60), minutes % 60)
}

// Local time ("14:30", "tomorrow at 14:30", "Sunday at 18:00"), or the rounded hour with `isApprox`.
export function moment(t: Strings, atMs: number, nowMs: number, isApprox = false): string {
  const at = new Date(atMs)
  const today = new Date(nowMs).setHours(0, 0, 0, 0)
  const offset = Math.round((new Date(atMs).setHours(0, 0, 0, 0) - today) / DAY_MS)
  const day: DayKind = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : 'later'
  const weekday = t.weekdays[at.getDay()] ?? ''
  return isApprox ? t.around(day, weekday, t.hour(at.getHours())) : t.at(day, weekday, t.time(at.getHours(), at.getMinutes()))
}

export function resetPhrase(t: Strings, limit: SessionRateLimit, nowMs: number): string {
  const at = resetTime(limit)
  if (!Number.isFinite(at)) return t.resetUnknown
  return t.resetsIn(duration(t, at - nowMs), moment(t, at, nowMs))
}

export type Pace = { kind: 'too-early' } | { kind: 'hits-limit'; atMs: number; marginMs: number } | { kind: 'ok'; projected: number }

// Linear projection of the weekly % at the average rate since the last reset.
export function pace(week: SessionRateLimit, nowMs: number, minHours: number): Pace | null {
  const resetAt = resetTime(week)
  if (!Number.isFinite(resetAt)) return null
  const elapsedMs = clamp(WEEK_MS - (resetAt - nowMs), 0, WEEK_MS)
  if (elapsedMs < minHours * HOUR_MS) return { kind: 'too-early' }
  const perMs = week.percentUsed / elapsedMs
  const projected = week.percentUsed + perMs * (resetAt - nowMs)
  if (projected < 100 || perMs <= 0) return { kind: 'ok', projected }
  const atMs = nowMs + (100 - week.percentUsed) / perMs
  return { kind: 'hits-limit', atMs, marginMs: resetAt - atMs }
}

export const register: Register = (on, options) => {
  const t = strings(options.language)
  const minHours = Number(options.paceMinHours ?? 3)
  const refreshMs = Number(options.refreshSeconds ?? 60) * 1000

  on('session.start', async ($, e, next) => {
    try {
      const { rateLimits } = await $.session.usage()
      await update($, limits, () => rateLimits)
    } catch {
      // No figures at start: the band waits for the first session.measure.
    }
    if (refreshMs > 0) {
      $.clock.every(refreshMs, () => {
        void (async () => {
          if ((await read($, limits)).length > 0) await update($, tick, n => n + 1)
        })()
      })
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await update($, limits, () => e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, limits)
    await read($, tick)
    if (e.props.hasSurvey || current.length === 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const nowMs = await $.clock.now()
    const fiveHour = current.find(l => l.kind === 'five_hour')
    const week = current.find(l => l.kind === 'seven_day')

    // Framed card: title, bar and % colored by level, reset sentence.
    const usageCard = (title: string, limit: SessionRateLimit | undefined) => {
      if (!limit) {
        return (
          <Box borderStyle="round" borderColor="subtle" paddingX={1} flexDirection="column">
            <Text bold>{title}</Text>
            <Text dimColor>n/a</Text>
          </Box>
        )
      }
      const color = levelColor(limit.percentUsed)
      const filled = bar(limit.percentUsed)
      const full = filled.replace(/░/g, '')
      return (
        <Box borderStyle="round" borderColor="subtle" paddingX={1} flexDirection="column">
          <Text>
            <Text bold>{title} </Text>
            <Text color={color}>{full}</Text>
            <Text dimColor>{filled.slice(full.length)}</Text>
            <Text color={color} bold>
              {' '}
              {t.pct(Math.round(limit.percentUsed))}
            </Text>
          </Text>
          <Text>{resetPhrase(t, limit, nowMs)}</Text>
        </Box>
      )
    }

    const paceCard = () => {
      const p = week ? pace(week, nowMs, minHours) : null
      let main = <Text dimColor>n/a</Text>
      let detail = <Text dimColor> </Text>
      if (p?.kind === 'too-early') {
        main = <Text dimColor>{t.tooEarly}</Text>
        detail = <Text dimColor>{t.tooEarlyDetail(minHours)}</Text>
      } else if (p?.kind === 'hits-limit') {
        main = (
          <Text color="red" bold>
            {t.hitsLimit(moment(t, p.atMs, nowMs, true))}
          </Text>
        )
        detail = <Text>{t.margin(duration(t, p.marginMs))}</Text>
      } else if (p?.kind === 'ok') {
        main = (
          <Text color={levelColor(p.projected)} bold>
            {t.projected(Math.round(p.projected))}
          </Text>
        )
        detail = <Text>{t.notReached}</Text>
      }
      return (
        <Box borderStyle="round" borderColor="subtle" paddingX={1} flexDirection="column">
          <Text>
            <Text bold>{t.pace} </Text>
            {main}
          </Text>
          {detail}
        </Box>
      )
    }

    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        {usageCard(t.fiveHour, fiveHour)}
        {usageCard(t.week, week)}
        {paceCard()}
      </Box>
    )
  })
}
