import { expect, test } from 'claude-code/testing'

import { duration, levelColor, moment, pace } from '../hooks/register'

// Jeudi 29 octobre 2026, 12h00 heure de Paris.
const NOW = new Date(2026, 9, 29, 12, 0).getTime()
const HOUR = 3600 * 1000
const at = (ms: number) => new Date(NOW + ms).toISOString()

const BAND = {
  plugin: 'usage-pace',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 140, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

// Semaine qui se réinitialise dans 3j 6h (dimanche 18h00) : 90 h écoulées sur 168.
const limits = (weekPercent: number) => [
  { kind: 'five_hour', percentUsed: 64, resetsAt: at(1 * HOUR + 42 * 60000) },
  { kind: 'seven_day', percentUsed: weekPercent, resetsAt: at(78 * HOUR) },
]

test('cartes 5h, semaine et rythme sous la limite', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 200000 }, rateLimits: limits(48) } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Text', text: /^Session 5h/ }))?.text).toContain('████████░░░░ 64 %')
  expect((await ui.find({ type: 'Text', text: /1h42/ }))?.text).toBe('Réinitialisation dans : 01h42 (à 13h42)')
  expect((await ui.find({ type: 'Text', text: /3j/ }))?.text).toBe('Réinitialisation dans : 3j 06h (dimanche à 18h00)')
  // 48 % en 90 h -> 48 + 48/90*78 = 89,6 %.
  expect((await ui.find({ type: 'Text', text: /^Rythme/ }))?.text).toBe('Rythme À ce rythme, ~90 % à la réinitialisation')
  await ui.unmount()
})

test('rythme qui atteint la limite avant la réinitialisation', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 200000 }, rateLimits: [] } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.session.measure({ context: { window: 200000 }, rateLimits: limits(72), changed: ['rateLimits'] })

  const ui = await $.ui.mount(BAND)
  // 72 % en 90 h -> 100 % 35 h plus tard  : demain (vendredi) vers 23h.
  expect((await ui.find({ type: 'Text', text: /^Rythme/ }))?.text).toBe('Rythme À ce rythme, limite atteinte demain vers 23h')
  expect((await ui.find({ type: 'Text', text: /^soit/ }))?.text).toBe('soit 1j 19h avant la réinitialisation')
  await ui.unmount()
})

test('sans données : bandeau masqué, aucun plantage', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => {
    throw new Error('indisponible')
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  // Ce hook tient lieu du dessin de l'engine sous le mod.
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

test('couleur selon le niveau', () => {
  expect([0, 49.9, 50, 74.9, 75, 89.9, 90, 100].map(levelColor)).toEqual(
    ['text', 'text', 'yellow', 'yellow', '#ff8700', '#ff8700', 'red', 'red'],
  )
})

test('formats de durée, de moment et recul minimal', () => {
  expect(duration(42 * 60000)).toBe('00h42')
  expect(duration(26 * HOUR)).toBe('1j 02h')
  expect(moment(NOW + 2 * HOUR, NOW, false)).toBe("aujourd'hui vers 14h")
  expect(moment(NOW + 24 * HOUR, NOW)).toBe('demain à 12h00')
  expect(pace({ kind: 'seven_day', percentUsed: 5, resetsAt: at(166 * HOUR) }, NOW, 3)).toEqual({ kind: 'too-early' })
})
