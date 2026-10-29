import { expect, test } from 'claude-code/testing'

import { argvFor, clean } from '../hooks/register'

type Run = { argv: readonly string[]; stdin?: string }

// A fake machine: environment variables, /proc/version (null = not Linux), which programs work.
function machine(env: Record<string, string>, proc: string | null, works: (argv: readonly string[]) => boolean) {
  const runs: Run[] = []
  const channel: string[] = []
  const install = (on: (event: string, hook: (...args: never[]) => unknown) => void) => {
    on('session.start', ((_: unknown, e: { cwd: string }) => ({ cwd: e.cwd })) as never)
    on('turn.complete', (() => ({ text: '' })) as never)
    on('classic.Notification', (() => ({})) as never)
    on('env.get', ((_: unknown, e: { name: string }) => ({ value: env[e.name] })) as never)
    on('fs.read', ((_: unknown, e: { path: string }) => {
      if (e.path !== '/proc/version' || proc === null) throw new Error('ENOENT')
      return { value: proc }
    }) as never)
    on('process.run', ((_: unknown, e: { argv: readonly string[]; init?: { stdin?: string } }) => {
      if (e.argv[0] === 'git') return { value: ok(works(e.argv) ? '/home/u/code/web-shop\n' : '', works(e.argv) ? 0 : 128) }
      if (e.argv.includes('--version') || e.argv[0] === 'uname')
        return { value: ok(works(e.argv) ? 'Darwin\n' : '', works(e.argv) ? 0 : 1) }
      runs.push({ argv: e.argv, stdin: e.init?.stdin })
      return { value: ok('', works(e.argv) ? 0 : 1) }
    }) as never)
    on('ui.notify', ((_: unknown, e: { text: string }) => {
      channel.push(e.text)
      return { value: { isSent: true, channel: 'terminal_bell' } }
    }) as never)
  }
  return { runs, channel, install }
}

const ok = (stdout: string, exitCode: number) => ({ exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false })
const start = { cwd: '/home/u/code/web-shop/src', surface: 'terminal', isInteractive: true } as const
const turn = (durationMs: number, extra: object = {}) =>
  ({ turnId: 't', answer: '', text: '', durationMs, isAborted: false, reason: 'answer', ...extra }) as never

test('Linux: notify-send with the project name, for long replies and permission prompts only', async ($, on) => {
  const m = machine({}, 'Linux version 6.8.0', () => true)
  m.install(on as never)
  await $.session.start(start)
  await $.turn.complete(turn(3000))
  await $.turn.complete(turn(20000))
  await $.turn.complete(turn(60000, { agentId: 'sub-1' }))
  await $.turn.complete(turn(60000, { isAborted: true, reason: 'aborted' }))
  await $.classic.Notification({ notification_type: 'permission_prompt', message: 'x' } as never)
  await $.classic.Notification({ notification_type: 'idle_prompt', message: 'x' } as never)
  expect(m.runs.map(r => r.argv.slice(1))).toEqual([
    ['--app-name=Claude Code', 'Claude Code · web-shop', 'Claude has finished.'],
    ['--app-name=Claude Code', 'Claude Code · web-shop', 'Claude is waiting for your permission.'],
  ])
})

test('WSL: a PowerShell toast, the text on stdin; French', { options: { language: 'fr', minTurnSeconds: 0 } }, async ($, on) => {
  const m = machine({}, 'Linux version 5.15.0-microsoft-standard-WSL2', () => true)
  m.install(on as never)
  await $.session.start(start)
  await $.turn.complete(turn(10, { reason: 'error' }))
  expect(m.runs[0]!.argv[0]).toBe('powershell.exe')
  expect(m.runs[0]!.argv.join(' ')).not.toContain('web-shop')
  expect(m.runs[0]!.stdin).toBe('Claude Code · web-shop\nClaude s’est arrêté sur une erreur.')
})

test('iTerm2, Ghostty, Kitty: the engine notifies itself; other events go through the channel', async ($, on) => {
  const m = machine({ TERM_PROGRAM: 'ghostty' }, null, () => true)
  m.install(on as never)
  await $.session.start(start)
  await $.turn.complete(turn(60000))
  await $.classic.Notification({ notification_type: 'permission_prompt', message: 'x' } as never)
  await $.classic.Notification({ notification_type: 'agent_completed', message: 'x' } as never)
  expect(m.runs).toEqual([])
  expect(m.channel).toEqual(['A background session has finished.'])
})

test('no notification tool, or one that fails: the person’s channel, never an error', async ($, on) => {
  const m = machine({}, 'Linux version 6.8.0', argv => argv[0] === 'git')
  m.install(on as never)
  await $.session.start(start)
  await $.turn.complete(turn(60000))
  expect(m.runs).toEqual([])
  expect(m.channel).toEqual(['Claude has finished.'])
})

test('macOS command and text cleaning', () => {
  expect(argvFor('mac', 'T', 'B')?.argv.slice(-2)).toEqual(['T', 'B'])
  expect(argvFor('channel', 'T', 'B')).toBeNull()
  expect(clean('a<b>\u0007c&d\nlong')).toBe('a b  c d long')
})
