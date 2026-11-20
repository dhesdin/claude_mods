import { expect, test } from 'claude-code/testing'

import { strings } from '../hooks/i18n'
import { duration, modelName, pace, tokens } from '../hooks/register'

// Thursday 29 October 2026, 12:00 local time.
const NOW = new Date(2026, 9, 29, 12, 0).getTime()
const HOUR = 3600 * 1000
const at = (ms: number) => new Date(NOW + ms).toISOString()

const band = (surface: 'terminal' | 'desktop') =>
  ({
    plugin: 'statusbar',
    component: 'AbovePrompt',
    surface,
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 140, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  }) as const

// Week resetting in 78 h (Sunday 18:00): 90 h elapsed out of 168.
const limits = (weekPercent: number) => [
  { kind: 'five_hour', percentUsed: 3, resetsAt: at(2 * HOUR + 9 * 60000) },
  { kind: 'seven_day', percentUsed: weekPercent, resetsAt: at(78 * HOUR) },
]

type On = Parameters<Parameters<typeof test>[1]>[1]

function engine(on: On, weekPercent: number, branch = 'main\n') {
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({
    value: { startedAt: NOW, context: { window: 1000000, tokens: 243000, percent: 24 }, rateLimits: limits(weekPercent) },
  }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.root', () => ({ value: '/home/me/IUT' }))
  on('session.cwd', () => ({ value: '/home/me/IUT' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: branch, stderr: '' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  // What the engine draws when the band passes.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
}

test('names and figures', () => {
  expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
  expect(modelName('claude-sonnet-5-5[1m]')).toBe('Sonnet 5.5')
  expect(modelName('haiku')).toBe('Haiku')
  expect(modelName('my-model\u001b[31m')).toBe('my-model[31m')
  const fr = strings('fr')
  expect(duration(fr, 2 * HOUR + 9 * 60000)).toBe('2h09')
  expect(duration(fr, 44 * HOUR)).toBe('1j20h')
  expect(tokens(243000)).toBe('243k')
  expect(tokens(1500000)).toBe('1.5M')
  // 48 % in 90 h -> 48 + 48/90*78 = 89.6 %.
  expect(pace({ kind: 'seven_day', percentUsed: 48, resetsAt: at(78 * HOUR) }, NOW, 3)).toEqual({
    kind: 'ok',
    projected: 48 + (48 / (90 * HOUR)) * 78 * HOUR,
  })
  // Too early: 2 h after the reset.
  expect(pace({ kind: 'seven_day', percentUsed: 10, resetsAt: at(166 * HOUR) }, NOW, 3)).toBeNull()
})

test('desktop band: the four status lines', { options: { language: 'fr' } }, async ($, on) => {
  engine(on, 48)
  await $.session.start({ cwd: '/home/me/IUT', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount(band('desktop'))
  const text = async (re: RegExp) => (await ui.find({ type: 'Text', text: re }))?.text
  expect(await text(/^🤖/)).toBe('🤖 Opus 5.5 │ 📁 IUT │ 🌿 main')
  expect(await text(/^🧠/)).toBe('🧠 ctx ■■■■■■■■■■  24% · 243k')
  expect(await text(/^⏳/)).toBe('⏳ 5h ■■■■■■■■■■  3% · 2h09')
  expect(await text(/^📅/)).toBe('📅 7j ■■■■■■■■■■  48% · 3j06h → ~90%')
  await ui.unmount()
})

test('weekly limit reached before the reset', async ($, on) => {
  engine(on, 72, '')
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount(band('desktop'))
  // 72 % in 90 h -> 100 % 35 h later: Friday 23:00.
  expect((await ui.find({ type: 'Text', text: /^📅/ }))?.text).toBe('📅 7d 💀 ■■■■■■■■■■  72% · 3d06h → 100% Fri 23:00')
  expect((await ui.find({ type: 'Text', text: /^🤖/ }))?.text).toBe('🤖 Opus 5.5 │ 📁 IUT')
  await ui.unmount()
})

test('hidden in the terminal, which has the status line', async ($, on) => {
  engine(on, 48)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount(band('terminal'))
  expect(await ui.find({ type: 'Text', text: /^🤖/ })).toBeUndefined()
  await ui.unmount()
})

test('/statusbar hides the band, then shows it again', async ($, on) => {
  engine(on, 48)
  on('command.register', () => ({ value: { command: 'statusbar' } }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const run = () =>
    $.command.run({
      command: 'statusbar',
      args: '',
      origin: { kind: 'composer' } as never,
      presentation: { isFullscreen: false, columns: 120 },
    })
  expect((await run()).text).toBe('Status band hidden for this session (/statusbar to show it again).')
  const ui = await $.ui.mount(band('desktop'))
  expect(await ui.find({ type: 'Text', text: /^🤖/ })).toBeUndefined()
  await ui.unmount()
  expect((await run()).text).toBe('Status band shown.')
})
