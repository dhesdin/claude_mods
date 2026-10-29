import { expect, test } from 'claude-code/testing'

import { memoryText, REMINDER } from '../hooks/register'

const CWD = '/home/u/code/app'
const NOTES = `${CWD}/.claude/contexte.md`

// A fake machine: files in memory, a git repo or not, and what the engine raised.
function machine(files: Map<string, string>, isRepo: boolean) {
  const reads: string[] = []
  const install = (on: (event: string, hook: (...args: never[]) => unknown) => void) => {
    on('session.start', ((_: unknown, e: { cwd: string }) => ({ cwd: e.cwd })) as never)
    on('prompt.context', ((_: unknown, e: { blocks: unknown[] }) => ({ blocks: e.blocks })) as never)
    on('session.measure', ((_: unknown, e: { changed: unknown[] }) => ({ changed: e.changed })) as never)
    on('session.compact', ((_: unknown, e: { messages: unknown[] }) => ({ messages: e.messages })) as never)
    on('tool.call', (() => ({ result: 'ok' })) as never)
    on('fs.read', ((_: unknown, e: { path: string }) => {
      reads.push(e.path)
      const key = e.path.endsWith('/rules.md') ? 'rules' : e.path
      const text = files.get(key)
      if (text === undefined) throw new Error('ENOENT')
      return { value: text }
    }) as never)
    on('process.run', ((_: unknown, e: { argv: readonly string[] }) => {
      const out: Record<string, string> = { 'rev-parse': `${CWD}\n`, branch: 'main\n', status: ' M src/a.py\n', log: 'abc123 First\n' }
      return {
        value: {
          exitCode: isRepo ? 0 : 128,
          stdout: isRepo ? (out[e.argv[3]!] ?? '') : '',
          stderr: '',
          isStdoutTruncated: false,
          isStderrTruncated: false,
        },
      }
    }) as never)
  }
  return { reads, install }
}

// Narrowed view of $.tool: the engine's typing of every tool name is too deep for tsc here.
const bash = ($: unknown) =>
  ($ as { tool: { call: (i: object) => Promise<{ context?: readonly string[] }> } }).tool.call({ tool: 'Bash', command: 'ls' })
const COMPACT = { trigger: 'auto', messages: [{ role: 'user', text: 'summary', toolUses: [] }] } as never
const start = { cwd: CWD, surface: 'terminal', isInteractive: true } as const
const measure = (tokens: number) => ({ context: { tokens, window: 1000000 }, rateLimits: [], changed: [] }) as never
const block = async ($: { prompt: { context: (e: never) => Promise<{ blocks: readonly { name: string; text: string }[] }> } }) =>
  (await $.prompt.context({ blocks: [] } as never)).blocks.find(b => b.name === 'projectMemory')?.text

test('rules and notes at the start, read once, read again after a compaction', async ($, on) => {
  const files = new Map([
    ['rules', '- Apply token-economy.\n'],
    [NOTES, '# Current context\nStep 2 of 5.\u0007\n'],
  ])
  const m = machine(files, true)
  m.install(on as never)
  await $.session.start(start)
  const first = await block($ as never)
  expect(first).toContain('Rules for every project (project-memory mod):\n- Apply token-economy.')
  expect(first).toContain('# Current context\nStep 2 of 5.\n\nGit at load time:\n- branch: main\n- uncommitted changes:\n   M src/a.py')
  expect(first).not.toContain('\u0007')
  const readsBefore = m.reads.length
  await block($ as never)
  expect(m.reads.length).toBe(readsBefore)

  files.set(NOTES, '# Current context\nStep 3 of 5.\n')
  await $.session.compact(COMPACT)
  expect(await block($ as never)).toContain('Step 3 of 5.')
})

test(
  'hand-off reminder: once past the threshold, on the next tool result, again after a compaction',
  { options: { handoffTokens: 1000 } },
  async ($, on) => {
    const m = machine(new Map([[NOTES, 'x']]), true)
    m.install(on as never)
    await $.session.start(start)
    const call = () => bash($)

    await $.session.measure(measure(900))
    expect((await call()).context).toBeUndefined()
    await $.session.measure(measure(1200))
    expect((await call()).context).toEqual([REMINDER])
    await $.session.measure(measure(1300))
    expect((await call()).context).toBeUndefined()

    await $.session.compact(COMPACT)
    await $.session.measure(measure(1500))
    expect((await call()).context).toEqual([REMINDER])
  },
)

test(
  'outside a project: rules only, no reminder; rules off and no notes: no block',
  { options: { handoffTokens: 1000 } },
  async ($, on) => {
    const m = machine(new Map([['rules', '- R.']]), false)
    m.install(on as never)
    await $.session.start(start)
    expect(await block($ as never)).toBe('Rules for every project (project-memory mod):\n- R.')
    await $.session.measure(measure(5000))
    expect((await bash($)).context).toBeUndefined()
    expect(memoryText(null, null)).toBe('')
  },
)
