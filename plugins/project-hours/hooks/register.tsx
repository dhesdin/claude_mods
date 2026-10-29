import type { Register } from 'claude-code'
import { atom, read, update } from 'claude-code'

import type { Report } from '../types'
import { strings } from './i18n'
import type { Segment } from './track'
import { alerts, bar, fromJsonl, hours, isoWeek, lastWeeks, parsePairs, projectName, Tracker, toJsonl, totals } from './track'

const PANE = 'project-hours'
// Bump the shape tag whenever Report changes: a value stored by an older version is then discarded.
const report = atom({ plugin: 'project-hours', key: 'report' } as const, null, { shape: 'report-1' })

// Names that end up in file names: letters, digits, dot, dash, underscore only.
const safe = (s: string) => s.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 64) || 'unknown'
// biome-ignore lint/suspicious/noControlCharactersInRegex: removing control characters is the point.
const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').slice(0, 48)

// System access, built in session.start from `$` (which can never be passed around as a value).
type Machine = {
  read: (path: string) => Promise<string | null>
  write: (path: string, text: string) => Promise<void>
  list: (path: string) => Promise<string[]>
  gitRoot: (dir: string) => Promise<string | null>
  cwd: () => Promise<string>
  now: () => Promise<number>
  panes: () => Promise<readonly { id: string }[]>
  open: () => Promise<unknown>
  close: () => Promise<void>
  save: (r: Report) => Promise<unknown>
}

export const register: Register = (on, options) => {
  const t = strings(options.language)
  const idleMs = Math.max(1, Number(options.idleMinutes ?? 10)) * 60000
  const aliases = parsePairs(String(options.aliases ?? ''))
  const priorities = new Map(
    [...parsePairs(String(options.priorityProjects ?? ''))]
      .map(([name, weeks]) => [name, Math.max(1, Math.trunc(Number(weeks)) || 3)] as const)
      .filter(([name]) => name !== ''),
  )
  const tooling = new Set(parsePairs(String(options.toolingProjects ?? 'claude-mods')).keys())
  const openOnStart = Boolean(options.openOnStart ?? false)

  let machine: Machine | null = null
  let tracker: Tracker | null = null
  let dir = ''
  let fileName = ''
  let home = ''
  // The project of the session's folder, cached per folder (git is asked once per folder).
  let projectOf: { cwd: string; name: string } | null = null

  const currentProject = async (m: Machine) => {
    const cwd = await m.cwd()
    if (projectOf?.cwd !== cwd) projectOf = { cwd, name: clean(projectName(cwd, await m.gitRoot(cwd), aliases, home)) }
    return projectOf.name
  }

  // Every segment on disk, from every session and machine copied here.
  const loadAll = async (m: Machine): Promise<Segment[]> => {
    const files = (
      await Promise.all((await m.list(dir)).map(async week => (await m.list(`${dir}/${week}`)).map(f => `${dir}/${week}/${f}`)))
    ).flat()
    const texts = await Promise.all(files.filter(f => f.endsWith('.jsonl')).map(f => m.read(f)))
    return fromJsonl(texts.filter((x): x is string => x !== null).join('\n'))
  }

  const refresh = async (m: Machine) => {
    const now = await m.now()
    const all = await loadAll(m)
    const key = isoWeek(now).key
    const rows = [...totals(all, [key])]
      .map(([project, perWeek]) => ({ project, ms: perWeek.get(key) ?? 0, isTooling: tooling.has(project) }))
      .sort((a, b) => b.ms - a.ms)
    return m.save({ week: isoWeek(now).week, rows, alerts: alerts(all, priorities, now) })
  }

  // This session's segments, one file per week: a session never writes another session's file.
  const flush = async (m: Machine) => {
    if (!tracker) return
    const byWeek = new Map<string, Segment[]>()
    for (const s of tracker.all()) {
      const key = isoWeek(s.start).key
      byWeek.set(key, [...(byWeek.get(key) ?? []), s])
    }
    await Promise.all([...byWeek].map(([key, list]) => m.write(`${dir}/${key}/${fileName}`, toJsonl(list))))
  }

  const touch = async (m: Machine) => {
    if (!tracker) return
    tracker.touch(await m.now(), await currentProject(m))
  }

  on('session.start', async ($, e, next) => {
    const m: Machine = {
      read: path => $.fs.read(path).catch(() => null),
      write: (path, text) => $.fs.write(path, text),
      list: path =>
        $.fs.list(path).then(
          entries => entries.map(x => x.name),
          () => [],
        ),
      gitRoot: cwd =>
        $.process.run(['git', '-C', cwd, 'rev-parse', '--show-toplevel'], { timeoutMs: 5000 }).then(
          r => (r.exitCode === 0 ? r.stdout.trim() : null),
          () => null,
        ),
      cwd: () => $.session.cwd(),
      now: () => $.clock.now(),
      panes: () => $.ui.panes(),
      open: () => $.ui.open({ id: PANE, title: t.paneTitle }),
      close: () => $.ui.close({ id: PANE }),
      save: r => update($, report, () => r),
    }
    machine = m
    try {
      home = (await $.env.get('HOME')) ?? ''
      const host = safe(((await m.read('/etc/hostname')) ?? '').trim())
      dir = `${home}/.claude/mod-data/project-hours`
      fileName = `${host}-${safe(await $.session.id())}.jsonl`
      // A reload runs session.start again: pick up what this session already wrote this week.
      const mine = fromJsonl((await m.read(`${dir}/${isoWeek(await m.now()).key}/${fileName}`)) ?? '')
      tracker = new Tracker(safe(await $.session.id()), host, idleMs, mine)
      await $.command.register({ name: 'hours', description: t.commandDescription, argumentHint: '[weeks] | pane' })
      await touch(m)
      await refresh(m)
      if (openOnStart) await m.open()
    } catch {
      // No home, no hostname or a refused command: the session goes on without tracking.
    }
    return next(e)
  })

  on('prompt.submit', async (_, e, next) => {
    if (machine) await touch(machine).catch(() => {})
    return next(e)
  }).catch((_, e, next) => next(e))

  on('tool.call', async (_, e, next) => {
    if (machine) await touch(machine).catch(() => {})
    return next(e)
  }).catch((_, e, next) => next(e))

  on('turn.complete', async (_, e, next) => {
    const m = machine
    if (m) {
      await touch(m)
        .then(() => flush(m))
        .then(() => refresh(m))
        .catch(() => {})
    }
    return next(e)
  })

  on('session.end', async (_, e, next) => {
    if (machine) await flush(machine).catch(() => {})
    return next(e)
  })

  on('command.run', { command: 'hours' }, async (_, e) => {
    const m = machine
    if (!m) return { text: t.notReady }
    const arg = e.args.trim().toLowerCase()
    if (arg === 'pane') {
      if ((await m.panes()).some(p => p.id === PANE)) {
        await m.close()
        return { text: t.closed }
      }
      await m.open()
      return { text: t.opened }
    }
    const weeks = arg === '' ? 1 : Math.trunc(Number(arg))
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) return { text: t.usage }
    await flush(m)
    const now = await m.now()
    const all = await loadAll(m)
    const keys = lastWeeks(now, weeks)
    const perProject = [...totals(all, keys)].map(([project, perWeek]) => ({
      project,
      perWeek,
      sum: [...perWeek.values()].reduce((a, b) => a + b, 0),
    }))
    perProject.sort((a, b) => b.sum - a.sum)
    const width = Math.max(12, ...perProject.map(p => p.project.length))
    const max = Math.max(0, ...perProject.map(p => p.sum))
    const lines = [weeks === 1 ? t.week(isoWeek(now).week) : t.weeks(weeks)]
    if (perProject.length === 0) lines.push(t.none)
    if (weeks > 1) lines.push(`${''.padEnd(width)}  ${keys.map(k => k.slice(5).padStart(6)).join(' ')}  ${t.total.padStart(6)}`)
    for (const p of perProject) {
      const cells = weeks > 1 ? `  ${keys.map(k => hours(p.perWeek.get(k) ?? 0).padStart(6)).join(' ')}` : ''
      const mark = tooling.has(p.project) ? `  ${t.tooling}` : ''
      lines.push(`${p.project.padEnd(width)}${cells}  ${hours(p.sum).padStart(6)}  ${bar(p.sum, max)}${mark}`)
    }
    for (const a of alerts(all, priorities, now)) lines.push(a.weeks === null ? t.neverSeen(a.project) : t.idleFor(a.project, a.weeks))
    lines.push('', t.only)
    return { text: lines.join('\n') }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const r = await read($, report)
    if (!r) return <Text dimColor>{t.none}</Text>
    const width = Math.max(12, ...r.rows.map(x => x.project.length))
    const max = Math.max(0, ...r.rows.map(x => x.ms))
    return (
      <Box flexDirection="column">
        <Text bold>{t.week(r.week)}</Text>
        {r.rows.length === 0 ? <Text dimColor>{t.none}</Text> : null}
        {r.rows.map(row => (
          <Text>
            {`${row.project.padEnd(width)}  ${hours(row.ms).padStart(6)}  `}
            <Text color="claude">{bar(row.ms, max)}</Text>
            {row.isTooling ? <Text dimColor>{`  ${t.tooling}`}</Text> : null}
          </Text>
        ))}
        {r.alerts.map(a => (
          <Text color="warning">{a.weeks === null ? t.neverSeen(a.project) : t.idleFor(a.project, a.weeks)}</Text>
        ))}
        <Text dimColor>{t.only}</Text>
      </Box>
    )
  })
}
