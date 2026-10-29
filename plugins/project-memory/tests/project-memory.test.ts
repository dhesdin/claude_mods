import { expect, test } from 'claude-code/testing'

import { REMINDER } from '../hooks/register'

const CWD = '/home/u/code/app'

// A fake machine: a git repo or not, a .claude/contexte.md or not.
function machine(isRepo: boolean, hasNotes: boolean) {
  return (on: (event: string, hook: (...args: never[]) => unknown) => void) => {
    on('session.start', ((_: unknown, e: { cwd: string }) => ({ cwd: e.cwd })) as never)
    on('session.measure', ((_: unknown, e: { changed: unknown[] }) => ({ changed: e.changed })) as never)
    on('session.compact', ((_: unknown, e: { messages: unknown[] }) => ({ messages: e.messages })) as never)
    on('tool.call', (() => ({ result: 'ok' })) as never)
    on('fs.read', (() => {
      if (!hasNotes) throw new Error('ENOENT')
      return { value: '# notes' }
    }) as never)
    on('process.run', (() => ({
      value: { exitCode: isRepo ? 0 : 128, stdout: isRepo ? 'true\n' : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    })) as never)
  }
}

// Narrowed view of $.tool: the engine's typing of every tool name is too deep for tsc here.
const bash = ($: unknown) =>
  ($ as { tool: { call: (i: object) => Promise<{ context?: readonly string[] }> } }).tool.call({ tool: 'Bash', command: 'ls' })
const COMPACT = { trigger: 'auto', messages: [{ role: 'user', text: 'summary', toolUses: [] }] } as never
const start = { cwd: CWD, surface: 'terminal', isInteractive: true } as const
const measure = (tokens: number) => ({ context: { tokens, window: 1000000 }, rateLimits: [], changed: [] }) as never

test(
  'reminder: once past the threshold, on the next tool result, again after a compaction',
  { options: { handoffTokens: 1000 } },
  async ($, on) => {
    machine(true, false)(on as never)
    await $.session.start(start)
    await $.session.measure(measure(900))
    expect((await bash($)).context).toBeUndefined()
    await $.session.measure(measure(1200))
    expect((await bash($)).context).toEqual([REMINDER])
    await $.session.measure(measure(1300))
    expect((await bash($)).context).toBeUndefined()

    await $.session.compact(COMPACT)
    await $.session.measure(measure(1500))
    expect((await bash($)).context).toEqual([REMINDER])
  },
)

test('a folder with notes but no git counts as a project', { options: { handoffTokens: 1000 } }, async ($, on) => {
  machine(false, true)(on as never)
  await $.session.start(start)
  await $.session.measure(measure(5000))
  expect((await bash($)).context).toEqual([REMINDER])
})

test('outside a project, or threshold 0: no reminder', { options: { handoffTokens: 0 } }, async ($, on) => {
  machine(true, true)(on as never)
  await $.session.start(start)
  await $.session.measure(measure(900000))
  expect((await bash($)).context).toBeUndefined()
})
