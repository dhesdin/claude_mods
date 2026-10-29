import { expect, test } from 'claude-code/testing'

import { alerts, fromJsonl, hours, isoWeek, parsePairs, projectName, Tracker, toJsonl, totals } from '../hooks/track'

const MIN = 60000
const T0 = new Date(2026, 9, 29, 10, 0).getTime()

test('segments: extended within the idle threshold, cut after it, round-trip through JSONL', () => {
  const t = new Tracker('s1', 'laptop', 10 * MIN)
  t.touch(T0, 'app')
  t.touch(T0 + 5 * MIN, 'app')
  t.touch(T0 + 30 * MIN, 'app')
  t.touch(T0 + 31 * MIN, 'web')
  expect(t.all().map(s => [s.project, (s.end - s.start) / MIN])).toEqual([
    ['app', 5],
    ['app', 0],
    ['web', 0],
  ])
  const back = fromJsonl(`${toJsonl(t.all())}not json\n`)
  expect(back.length).toBe(3)
  const key = isoWeek(T0).key
  expect(totals(back, [key]).get('app')?.get(key)).toBe(5 * MIN)
  expect(hours(125 * MIN)).toBe('2h05')
})

test('weeks, aliases and priority alerts', () => {
  expect(isoWeek(new Date(2026, 9, 29).getTime()).key).toBe('2026-W44')
  const aliases = parsePairs('~/code/sip/edge=sip/edge; k4u-erp=ERP')
  expect(projectName('/h/code/sip/edge/src', '/h/code/sip', aliases, '/h')).toBe('sip/edge')
  expect(projectName('/h/w/k4u-erp', '/h/w/k4u-erp', aliases, '/h')).toBe('ERP')
  const seg = [{ id: 'a', machine: 'm', project: 'sip/edge', start: T0, end: T0 + MIN }]
  expect(alerts(seg, new Map([['sip/edge', 3]]), T0 + 22 * 24 * 60 * MIN)).toEqual([{ project: 'sip/edge', weeks: 3 }])
  expect(alerts(seg, new Map([['sip/edge', 3]]), T0 + 20 * 24 * 60 * MIN)).toEqual([])
  expect(alerts([], new Map([['x', 3]]), T0)).toEqual([{ project: 'x', weeks: 3 }])
})

const HOME = '/h'
const DATA = `${HOME}/.claude/mod-data/project-hours`
const WEEK = `${DATA}/2026-W44`
const PANE = {
  plugin: 'project-hours',
  component: 'Pane',
  requestId: 'project-hours',
  surface: 'terminal',
  props: { title: 'Hours', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

// A fake machine: files in memory, a settable clock, the session folder and its git repo.
function machine(files: Map<string, string>, gitRoot: string | null) {
  const state = { now: T0, panes: [] as { id: string }[], registered: true, listed: [] as string[] }
  const install = (on: (event: string, hook: (...args: never[]) => unknown) => void) => {
    on('session.start', ((_: unknown, e: { cwd: string }) => ({ cwd: e.cwd })) as never)
    on('session.cwd', (() => ({ value: '/h/code/app/src' })) as never)
    on('session.id', (() => ({ value: 's1' })) as never)
    on('env.get', ((_: unknown, e: { name: string }) => ({ value: e.name === 'HOME' ? HOME : undefined })) as never)
    on('clock.now', (() => ({ value: state.now })) as never)
    on('command.register', (() => {
      if (!state.registered) throw new Error('refused')
      return { value: { command: 'hours' } }
    }) as never)
    on('fs.read', ((_: unknown, e: { path: string }) => {
      const text = e.path === '/etc/hostname' ? 'laptop\n' : files.get(e.path)
      if (text === undefined) throw new Error('ENOENT')
      return { value: text }
    }) as never)
    on('fs.write', ((_: unknown, e: { path: string; text: string }) => {
      files.set(e.path, e.text)
      return { value: undefined }
    }) as never)
    on('fs.list', ((_: unknown, e: { path: string }) => {
      state.listed.push(e.path)
      const names = new Set<string>()
      for (const f of files.keys()) if (f.startsWith(`${e.path}/`)) names.add(f.slice(e.path.length + 1).split('/')[0]!)
      if (names.size === 0) throw new Error('ENOENT')
      return { value: [...names].map(name => ({ name, kind: name.endsWith('.jsonl') ? 'file' : 'dir' })) }
    }) as never)
    on('process.run', (() => ({
      value: {
        exitCode: gitRoot ? 0 : 128,
        stdout: gitRoot ? `${gitRoot}\n` : '',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    })) as never)
    on('ui.panes', (() => ({ value: state.panes })) as never)
    on('ui.open', (() => {
      state.panes = [{ id: 'project-hours' }]
      return { value: { isPlaced: true } }
    }) as never)
    on('ui.close', (() => {
      state.panes = []
      return { value: undefined }
    }) as never)
  }
  return { state, install }
}

const hoursCommand = (args: string) => ({
  command: 'hours',
  args,
  origin: { kind: 'composer' } as never,
  presentation: { isFullscreen: false, columns: 120 },
})
const start = { cwd: '/h/code/app/src', surface: 'terminal', isInteractive: true } as const
// Another session on another machine, earlier this week: web 2h, claude-mods 1h.
const earlier = toJsonl([
  { id: 'w-1', machine: 'work', project: 'web', start: T0 - 26 * 60 * MIN, end: T0 - 24 * 60 * MIN },
  { id: 'w-2', machine: 'work', project: 'claude-mods', start: T0 - 23 * 60 * MIN, end: T0 - 22 * 60 * MIN },
])

test('session: tracks the git project, survives a reload, /hours and the pane add up every session', async ($, on) => {
  const files = new Map([[`${WEEK}/work-s0.jsonl`, earlier]])
  const m = machine(files, '/h/code/app')
  m.install(on as never)
  await $.session.start(start)
  await $.command.run(hoursCommand(''))
  expect(fromJsonl(files.get(`${WEEK}/laptop-s1.jsonl`)!).map(s => s.project)).toEqual(['app'])

  // A reload runs session.start again: the segment written before goes on.
  m.state.now = T0 + 5 * MIN
  await $.session.start(start)
  const text = (await $.command.run(hoursCommand(''))).text!
  expect(text.split('\n')).toEqual([
    'Week 44 (Claude Code time)',
    'web             2h00  ██████████',
    'claude-mods     1h00  █████  ← tooling',
    'app             0h05  █',
    '',
    'Active time in Claude Code only, not time spent in your editor without Claude.',
  ])
  expect((await $.command.run(hoursCommand('2'))).text).toContain('app             0h00   0h05    0h05  █')

  const ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text', text: /^Week/ }))?.text).toBe('Week 44 (Claude Code time)')
  expect((await ui.find({ type: 'Text', text: /^claude-mods/ }))?.text).toBe('claude-mods     1h00  █████  ← tooling')
  await ui.unmount()
})

test('/hours panel toggles the panel; bad arguments get the usage line', async ($, on) => {
  const m = machine(new Map(), '/h/code/app')
  m.install(on as never)
  await $.session.start(start)
  expect((await $.command.run(hoursCommand('panel'))).text).toBe('Hours panel opened.')
  expect((await $.command.run(hoursCommand('pane'))).text).toBe('Hours panel closed.')
  for (const bad of ['0', '53', 'abc']) expect((await $.command.run(hoursCommand(bad))).text).toBe('Usage: /hours [weeks] | /hours panel')
})

test(
  'degraded: no git repo, no data folder, a priority never seen; French',
  { options: { language: 'fr', priorityProjects: 'sip/edge=3' } },
  async ($, on) => {
    const files = new Map<string, string>()
    const m = machine(files, null)
    m.install(on as never)
    await $.session.start(start)
    const lines = (await $.command.run(hoursCommand(''))).text!.split('\n')
    expect(lines[1]).toBe('src             0h00  ')
    expect(lines[2]).toBe('⚠ sip/edge : 0h depuis 3 semaines')
    const ui = await $.ui.mount(PANE)
    expect((await ui.find({ type: 'Text', text: /^⚠/ }))?.text).toBe('⚠ sip/edge : 0h depuis 3 semaines')
    await ui.unmount()
  },
)

test('only the week folders needed are read; dataFolder moves the data', { options: { dataFolder: '~/Sync/hours/' } }, async ($, on) => {
  const monthAgo = T0 - 30 * 24 * 60 * MIN
  const files = new Map([
    [
      `${HOME}/Sync/hours/${isoWeek(monthAgo).key}/work-s0.jsonl`,
      toJsonl([{ id: 'o-1', machine: 'work', project: 'web', start: monthAgo, end: monthAgo + MIN }]),
    ],
    [`${HOME}/Sync/hours/2026-W44/work-s0.jsonl`, earlier],
  ])
  const m = machine(files, '/h/code/app')
  m.install(on as never)
  await $.session.start(start)
  expect(m.state.listed).toEqual([`${HOME}/Sync/hours/2026-W44`])
  expect((await $.command.run(hoursCommand(''))).text).toContain('web             2h00')
  expect(files.has(`${HOME}/Sync/hours/2026-W44/laptop-s1.jsonl`)).toBe(true)
  expect((await $.command.run(hoursCommand('6'))).text).toContain('2h01')
})

test('degraded: the command cannot be registered, the session goes on', async ($, on) => {
  const m = machine(new Map(), '/h/code/app')
  m.state.registered = false
  m.install(on as never)
  await $.session.start(start)
  const ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text' }))?.text).toBe('No Claude Code time recorded yet.')
  await ui.unmount()
})
