import { expect, test } from 'claude-code/testing'
import type { ConfigRow } from 'claude-code'

const row = (key: string, value: string, options = ['en', 'fr', 'ja', 'zh']): ConfigRow => ({
  key,
  label: key,
  kind: 'choice' as const,
  value,
  options,
  provider: { plugin: key.split('.')[0] ?? key, tier: 'user' as const },
  isLocked: false,
})

const run = (args: string) => ({
  command: 'langmod',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 120 },
})

const ROWS = [row('sysmon.language', 'en'), row('usage-pace.language', 'en'), row('other.language', 'en', ['en', 'de']), row('theme', 'dark', [])]

test('sets every mod language row, and only those', async ($, on) => {
  const set: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'langmod' } }))
  on('config.list', () => ({ value: ROWS }))
  on('config.set', (_, e) => {
    set.push(`${e.key}=${String(e.value)}`)
    return { value: e.value }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const r = await $.command.run(run(' FR '))
  expect(set).toEqual(['sysmon.language=fr', 'usage-pace.language=fr'])
  expect(r.text).toBe('Language set to fr for: sysmon, usage-pace.')
})

test('no argument lists the current languages; an unknown one is refused', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'langmod' } }))
  on('config.list', () => ({ value: ROWS }))
  on('config.set', () => {
    throw new Error('must not be called')
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  expect((await $.command.run(run(''))).text).toBe('sysmon: en\nusage-pace: en\nUsage: /langmod en|fr|ja|zh')
  expect((await $.command.run(run('klingon'))).text).toBe('Unknown language. Available: en, fr, ja, zh.')
})
