import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Limits } from '../types'

// Fenêtres reçues de l'engine, et un compteur qui force le redessin du compte à rebours.
const limits = atom({ plugin: 'usage-pace', key: 'limits' } as const, [] as Limits)
const tick = atom({ plugin: 'usage-pace', key: 'tick' } as const, 0)

const HOUR_MS = 3600 * 1000
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS
const BAR_WIDTH = 12
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const pad = (n: number) => String(n).padStart(2, '0')
const resetTime = (limit: SessionRateLimit) => (limit.resetsAt ? Date.parse(limit.resetsAt) : NaN)

export function bar(percent: number): string {
  const full = Math.round((clamp(percent, 0, 100) / 100) * BAR_WIDTH)
  return '█'.repeat(full) + '░'.repeat(BAR_WIDTH - full)
}

// Blanc < 50 %, jaune 50-75, orange 75-90, rouge >= 90 ('text' suit le thème clair/sombre).
export function levelColor(percent: number): string {
  if (percent >= 90) return 'red'
  if (percent >= 75) return '#ff8700'
  if (percent >= 50) return 'yellow'
  return 'text'
}

// Durée : "00h42", "01h42", "3j 06h".
export function duration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return days > 0 ? `${days}j ${pad(hours)}h` : `${pad(hours)}h${pad(minutes % 60)}`
}

// Moment local : "14h30" aujourd'hui, sinon "demain 14h30" ou "dimanche 14h30".
export function moment(atMs: number, nowMs: number, withMinutes = true): string {
  const at = new Date(atMs)
  const time = withMinutes ? `${pad(at.getHours())}h${pad(at.getMinutes())}` : `${at.getHours()}h`
  const today = new Date(nowMs)
  today.setHours(0, 0, 0, 0)
  const dayOffset = Math.round((new Date(atMs).setHours(0, 0, 0, 0) - today.getTime()) / DAY_MS)
  if (dayOffset === 0) return withMinutes ? `à ${time}` : `aujourd'hui vers ${time}`
  if (dayOffset === 1) return withMinutes ? `demain à ${time}` : `demain vers ${time}`
  return withMinutes ? `${DAYS[at.getDay()]} à ${time}` : `${DAYS[at.getDay()]} vers ${time}`
}

export function resetPhrase(limit: SessionRateLimit, nowMs: number): string {
  const at = resetTime(limit)
  if (!Number.isFinite(at)) return 'Réinitialisation : n/a'
  return `Réinitialisation dans : ${duration(at - nowMs)} (${moment(at, nowMs)})`
}

export type Pace =
  | { kind: 'too-early' }
  | { kind: 'hits-limit'; atMs: number; marginMs: number }
  | { kind: 'ok'; projected: number }

// Projection linéaire du % hebdo au rythme moyen depuis le dernier reset.
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
  const minHours = Number(options.paceMinHours ?? 3)
  const refreshMs = Number(options.refreshSeconds ?? 60) * 1000

  on('session.start', async ($, e, next) => {
    try {
      const { rateLimits } = await $.session.usage()
      await update($, limits, () => rateLimits)
    } catch {
      // Pas de figure au démarrage : le bandeau attend le premier session.measure.
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

    // Carte encadrée : titre, barre et % colorés selon le niveau, phrase de réinitialisation.
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
              {Math.round(limit.percentUsed)} %
            </Text>
          </Text>
          <Text>{resetPhrase(limit, nowMs)}</Text>
        </Box>
      )
    }

    const paceCard = () => {
      const p = week ? pace(week, nowMs, minHours) : null
      let main = <Text dimColor>n/a</Text>
      let detail = <Text dimColor> </Text>
      if (p?.kind === 'too-early') {
        main = <Text dimColor>Pas encore assez de recul pour estimer</Text>
        detail = <Text dimColor>(moins de {minHours}h depuis la réinitialisation)</Text>
      } else if (p?.kind === 'hits-limit') {
        main = <Text color="red" bold>À ce rythme, limite atteinte {moment(p.atMs, nowMs, false)}</Text>
        detail = <Text>soit {duration(p.marginMs)} avant la réinitialisation</Text>
      } else if (p?.kind === 'ok') {
        main = (
          <Text color={levelColor(p.projected)} bold>
            À ce rythme, ~{Math.round(p.projected)} % à la réinitialisation
          </Text>
        )
        detail = <Text>limite non atteinte cette semaine</Text>
      }
      return (
        <Box borderStyle="round" borderColor="subtle" paddingX={1} flexDirection="column">
          <Text>
            <Text bold>Rythme </Text>
            {main}
          </Text>
          {detail}
        </Box>
      )
    }

    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        {usageCard('Session 5h', fiveHour)}
        {usageCard('Semaine   ', week)}
        {paceCard()}
      </Box>
    )
  })
}
