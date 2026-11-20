import type { Register } from 'claude-code'
import { atom, read, update } from 'claude-code'

import type { Context, Info, Limit, Limits } from '../types'
import type { Strings } from './i18n'
import { strings } from './i18n'

// What the band draws, and a counter that forces the countdowns to redraw.
const limits = atom({ plugin: 'statusbar', key: 'limits' } as const, [] as Limits)
const context = atom({ plugin: 'statusbar', key: 'context' } as const, {} as Context)
const info = atom({ plugin: 'statusbar', key: 'info' } as const, { model: '', folder: '', branch: '' } as Info)
const tick = atom({ plugin: 'statusbar', key: 'tick' } as const, 0)
// Hidden with /statusbar, for this session; kept across reloads.
const hidden = atom({ plugin: 'statusbar', key: 'hidden' } as const, false)

const HOUR_MS = 3600 * 1000
const WEEK_MS = 7 * 24 * HOUR_MS
const BAR = 10

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const pad = (n: number) => String(n).padStart(2, '0')

// Names from outside (model, folder, branch): no control or bidi characters, capped.
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching control characters is the point of this filter.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g
export const clean = (s: string) => s.replace(UNSAFE, '').trim().slice(0, 40)

// "claude-opus-5-5" -> "Opus 5.5"; "opus" -> "Opus"; anything else as given.
export function modelName(id: string): string {
  const base = clean(id).replace(/\[1m\]$/i, '')
  const m = /^(?:claude-)?(opus|sonnet|haiku|fable)(?:-(\d+)-(\d+))?/i.exec(base)
  if (!m?.[1]) return base
  const family = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()
  return m[2] ? `${family} ${m[2]}.${m[3]}` : family
}

export const folderName = (path: string) => clean(path.replace(/\/+$/, '').split('/').pop() ?? '')

// Green < 50 %, yellow 50-75, orange 75-90, red >= 90 (the status line's colors).
export function levelColor(pct: number): string {
  if (pct >= 90) return 'red'
  if (pct >= 75) return '#ff8700'
  if (pct >= 50) return 'yellow'
  return 'green'
}

export function duration(t: Strings, ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  return d > 0 ? `${d}${t.day}${pad(h)}h` : `${h}h${pad(m % 60)}`
}

export const tokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n)))

const resetMs = (l: Limit) => (l.resetsAt ? Date.parse(l.resetsAt) : Number.NaN)

export type Pace = { kind: 'ok'; projected: number } | { kind: 'hits-limit'; atMs: number } | null

// Linear projection of the weekly % at the average rate since the last reset.
export function pace(week: Limit, nowMs: number, minHours: number): Pace {
  const at = resetMs(week)
  if (!Number.isFinite(at)) return null
  const elapsed = clamp(WEEK_MS - (at - nowMs), 0, WEEK_MS)
  if (elapsed < minHours * HOUR_MS || week.percentUsed <= 0) return null
  const rate = week.percentUsed / elapsed
  const projected = week.percentUsed + rate * (at - nowMs)
  if (projected < 100) return { kind: 'ok', projected }
  return { kind: 'hits-limit', atMs: nowMs + (100 - week.percentUsed) / rate }
}

// What the first band line needs from the engine; every call may fail, the band then shows what it has.
export type InfoIo = {
  model: () => Promise<string>
  root: () => Promise<string>
  cwd: () => Promise<string>
  branch: (cwd: string) => Promise<{ exitCode: number | null; stdout: string }>
}

export async function readInfo(io: InfoIo): Promise<Info> {
  const model = await io.model().then(modelName, () => '')
  const folder = await io.root().then(folderName, () => '')
  const cwd = await io.cwd().catch(() => '')
  const branch = cwd
    ? await io.branch(cwd).then(
        r => (r.exitCode === 0 ? clean(r.stdout) : ''),
        () => '',
      )
    : ''
  return { model, folder, branch }
}

export const register: Register = (on, options) => {
  const t = strings(options.language)
  const showInTerminal = options.showInTerminal === true
  const minHours = Number(options.paceMinHours ?? 3)
  const refreshMs = Number(options.refreshSeconds ?? 60) * 1000

  on('session.start', async ($, e, next) => {
    try {
      const usage = await $.session.usage()
      await update($, limits, () => usage.rateLimits)
      await update($, context, () => ({ tokens: usage.context.tokens, percent: usage.context.percent }))
    } catch {
      // No figures at start: the band waits for the first session.measure.
    }
    const i = await readInfo({
      model: () => $.session.model(),
      root: () => $.session.root(),
      cwd: () => $.session.cwd(),
      branch: cwd => $.process.run(['git', '-C', cwd, 'branch', '--show-current'], { timeoutMs: 2000 }),
    })
    await update($, info, () => i)
    await $.command.register({ name: 'statusbar', description: t.commandDescription }).catch(() => {})
    if (refreshMs > 0) {
      $.clock.every(refreshMs, () => {
        void (async () => {
          if (await read($, hidden)) return
          const model = await $.session.model().then(modelName, () => '')
          await update($, info, i => (i.model === model ? i : { ...i, model }))
          await update($, tick, n => n + 1)
        })()
      })
    }
    return next(e)
  })

  // After each turn: new figures, and the branch or model may have changed.
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await update($, limits, () => e.rateLimits)
    if (e.changed.includes('context')) {
      await update($, context, () => ({ tokens: e.context.tokens, percent: e.context.percent }))
      const i = await readInfo({
        model: () => $.session.model(),
        root: () => $.session.root(),
        cwd: () => $.session.cwd(),
        branch: cwd => $.process.run(['git', '-C', cwd, 'branch', '--show-current'], { timeoutMs: 2000 }),
      })
      await update($, info, () => i)
    }
    return next(e)
  })

  on('command.run', { command: 'statusbar' }, async $ => {
    const isHidden = await update($, hidden, x => !x)
    return { text: isHidden ? t.hidden : t.shown }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    await read($, tick)
    if (e.props.hasSurvey || (e.surface === 'terminal' && !showInTerminal) || (await read($, hidden))) return next(e)
    const { model, folder, branch } = await read($, info)
    const ctx = await read($, context)
    const current = await read($, limits)
    const five = current.find(l => l.kind === 'five_hour')
    const week = current.find(l => l.kind === 'seven_day')
    const nowMs = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)

    const sep = <Text dimColor> │ </Text>
    const dot = <Text dimColor> · </Text>
    const bar = (pct: number) => {
      const full = Math.round((clamp(pct, 0, 100) / 100) * BAR)
      return (
        <Text>
          <Text color={levelColor(pct)}>{'■'.repeat(full)}</Text>
          <Text dimColor>{'■'.repeat(BAR - full)}</Text>
          <Text color={levelColor(pct)}>
            {'  '}
            {Math.round(pct)}%
          </Text>
        </Text>
      )
    }
    const usageLine = (icon: string, label: string, limit: Limit | undefined) => {
      if (!limit) return null
      const at = resetMs(limit)
      const p = limit.kind === 'seven_day' ? pace(limit, nowMs, minHours) : null
      let projection = null
      if (p?.kind === 'ok') {
        projection = (
          <Text>
            <Text dimColor> → </Text>
            <Text color={levelColor(p.projected)}>~{Math.round(p.projected)}%</Text>
          </Text>
        )
      } else if (p?.kind === 'hits-limit') {
        const hit = new Date(p.atMs)
        projection = (
          <Text>
            <Text dimColor> → </Text>
            <Text color="red" bold>
              100% {t.weekdays[hit.getDay()]} {pad(hit.getHours())}:{pad(hit.getMinutes())}
            </Text>
          </Text>
        )
      }
      return (
        <Text>
          {icon} {label} {p?.kind === 'hits-limit' ? '💀 ' : ''}
          {bar(limit.percentUsed)}
          {Number.isFinite(at) ? (
            <Text>
              {dot}
              {duration(t, at - nowMs)}
            </Text>
          ) : null}
          {projection}
        </Text>
      )
    }

    return (
      <Box flexDirection="column" paddingX={1}>
        <Text>
          🤖 <Text bold>{model || '?'}</Text>
          {folder ? (
            <Text>
              {sep}📁 <Text color="blue">{folder}</Text>
            </Text>
          ) : null}
          {branch ? (
            <Text>
              {sep}🌿 <Text color="green">{branch}</Text>
            </Text>
          ) : null}
        </Text>
        {typeof ctx.percent === 'number' ? (
          <Text>
            🧠 ctx {bar(ctx.percent)}
            {ctx.tokens ? (
              <Text>
                {dot}
                {tokens(ctx.tokens)}
              </Text>
            ) : null}
          </Text>
        ) : (
          <Text>
            🧠 ctx <Text dimColor>n/a</Text>
          </Text>
        )}
        {usageLine('⏳', '5h', five)}
        {usageLine('📅', t.week, week)}
      </Box>
    )
  })
}
