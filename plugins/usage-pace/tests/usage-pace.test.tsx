import { expect, test } from 'claude-code/testing'

import { strings } from '../hooks/i18n'
import { duration, levelColor, moment, pace } from '../hooks/register'

// Thursday 29 October 2026, 12:00 local time.
const NOW = new Date(2026, 9, 29, 12, 0).getTime()
const HOUR = 3600 * 1000
const at = (ms: number) => new Date(NOW + ms).toISOString()

const BAND = {
  plugin: 'usage-pace',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 140, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

// Week resetting in 3d 6h (Sunday 18:00): 90 h elapsed out of 168.
const limits = (weekPercent: number) => [
  { kind: 'five_hour', percentUsed: 64, resetsAt: at(1 * HOUR + 42 * 60000) },
  { kind: 'seven_day', percentUsed: weekPercent, resetsAt: at(78 * HOUR) },
]

test('English cards: 5h, week and pace under the limit', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 200000 }, rateLimits: limits(48) } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount(BAND)
  const text = async (re: RegExp) => (await ui.find({ type: 'Text', text: re }))?.text
  expect(await text(/^5h session/)).toContain('████████░░░░ 64%')
  expect(await text(/01h42/)).toBe('Resets in: 01h42 (at 13:42)')
  expect(await text(/3d/)).toBe('Resets in: 3d 06h (Sunday at 18:00)')
  // 48 % in 90 h -> 48 + 48/90*78 = 89.6 %.
  expect(await text(/^Pace/)).toBe('Pace At this pace, ~90% at reset')
  await ui.unmount()
})

test('French: pace that hits the limit before the reset', { options: { language: 'fr' } }, async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 200000 }, rateLimits: [] } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.session.measure({ context: { window: 200000 }, rateLimits: limits(72), changed: ['rateLimits'] })

  const ui = await $.ui.mount(BAND)
  // 72 % in 90 h -> 100 % 35 h later: tomorrow (Friday) around 23:00.
  expect((await ui.find({ type: 'Text', text: /^Rythme/ }))?.text).toBe('Rythme À ce rythme, limite atteinte demain vers 23h')
  expect((await ui.find({ type: 'Text', text: /^soit/ }))?.text).toBe('soit 1j 19h avant la réinitialisation')
  expect((await ui.find({ type: 'Text', text: /^Réinitialisation dans : 3j/ }))?.text).toBe(
    'Réinitialisation dans : 3j 06h (dimanche à 18h00)',
  )
  await ui.unmount()
})

test('no data: band hidden, no crash', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => {
    throw new Error('unavailable')
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  // Stands for the engine's own drawing beneath the mod.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /5h/ })).toBeUndefined()
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})

test('/usage-pace hides the band, then shows it again', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'usage-pace' } }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 200000 }, rateLimits: limits(48) } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const run = () =>
    $.command.run({
      command: 'usage-pace',
      args: '',
      origin: { kind: 'composer' } as never,
      presentation: { isFullscreen: false, columns: 120 },
    })
  expect((await run()).text).toBe('usage-pace band hidden (/usage-pace to show it again).')
  let ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /5h/ })).toBeUndefined()
  await ui.unmount()
  expect((await run()).text).toBe('usage-pace band shown.')
  ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /^5h session/ })).toBeDefined()
  await ui.unmount()
})

test('level colors', () => {
  expect([0, 49.9, 50, 74.9, 75, 89.9, 90, 100].map(levelColor)).toEqual([
    'text',
    'text',
    'yellow',
    'yellow',
    '#ff8700',
    '#ff8700',
    'red',
    'red',
  ])
})

test('durations, moments and the minimum-data rule in every language', () => {
  const [en, fr, ja, zh] = ['en', 'fr', 'ja', 'zh'].map(strings)
  expect(duration(en!, 42 * 60000)).toBe('00h42')
  expect(duration(fr!, 26 * HOUR)).toBe('1j 02h')
  expect(duration(ja!, 26 * HOUR)).toBe('1日2時間')
  expect(duration(zh!, 90 * 60000)).toBe('1小时30分')
  expect(moment(en!, NOW + 2 * HOUR, NOW, true)).toBe('today around 14:00')
  expect(moment(fr!, NOW + 24 * HOUR, NOW)).toBe('demain à 12h00')
  expect(moment(ja!, NOW + 72 * HOUR, NOW)).toBe('日曜日 12:00')
  expect(moment(zh!, NOW + 2 * HOUR, NOW, true)).toBe('今天 14点左右')
  expect(strings('xx')).toBe(en)
  expect(pace({ kind: 'seven_day', percentUsed: 5, resetsAt: at(166 * HOUR) }, NOW, 3)).toEqual({ kind: 'too-early' })
})
