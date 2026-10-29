import type { Register } from 'claude-code'

import type { Strings } from './i18n'
import { strings } from './i18n'

// Where a notification goes: a desktop tool, the terminal's own (the engine already notifies there),
// or the person's notification channel (`preferredNotifChannel`) when no tool is found.
export type Backend = 'linux' | 'mac' | 'windows' | 'native' | 'channel'

// Notification types worth a desktop alert, and the line they get. idle_prompt is left out: the end of
// the reply was already notified. plugin_notification too: forwarding it could echo another mod.
const TYPES: Record<string, keyof Strings> = {
  permission_prompt: 'permission',
  elicitation_dialog: 'input',
  elicitation_url_dialog: 'input',
  agent_needs_input: 'backgroundInput',
  agent_completed: 'backgroundDone',
  quota_auto_resume_stale: 'quota',
  quota_auto_resume_disabled: 'quota',
}
// What the engine itself notifies in iTerm2, Ghostty and Kitty: not sent twice there.
const ENGINE_NOTIFIES = new Set<keyof Strings>(['done', 'failed', 'permission'])

// A notification server may read markup: keep plain text, one line, short.
// biome-ignore lint/suspicious/noControlCharactersInRegex: removing control characters is the point.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f<>&]/g
export const clean = (s: string) => s.replace(UNSAFE, ' ').trim().slice(0, 80)

// Windows toast, title and body read from stdin (never from the command line). [to validate]
const TOAST = [
  '$l = [Console]::In.ReadToEnd() -split "`n", 2',
  '$m = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]',
  '$x = $m::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)',
  '$t = $x.GetElementsByTagName("text")',
  '[void]$t.Item(0).AppendChild($x.CreateTextNode($l[0]))',
  '[void]$t.Item(1).AppendChild($x.CreateTextNode($l[1]))',
  '$m::CreateToastNotifier("{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe").Show([Windows.UI.Notifications.ToastNotification]::new($x))',
].join('; ')

export function argvFor(backend: Backend, title: string, body: string): { argv: string[]; stdin?: string } | null {
  if (backend === 'linux') return { argv: ['notify-send', '--app-name=Claude Code', title, body] }
  if (backend === 'mac')
    return {
      argv: [
        'osascript',
        '-e',
        'on run argv',
        '-e',
        'display notification (item 2 of argv) with title (item 1 of argv)',
        '-e',
        'end run',
        title,
        body,
      ],
    }
  if (backend === 'windows')
    return { argv: ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', TOAST], stdin: `${title}\n${body}` }
  return null
}

type Machine = { send: (kind: keyof Strings) => Promise<void> }

export const register: Register = (on, options) => {
  const t = strings(options.language)
  const minMs = Math.max(0, Number(options.minTurnSeconds ?? 15)) * 1000
  let machine: Machine | null = null

  on('session.start', async ($, e, next) => {
    try {
      const ok = (argv: string[]) =>
        $.process.run(argv, { timeoutMs: 5000 }).then(
          r => (r.exitCode === 0 ? r.stdout : null),
          () => null,
        )
      let backend: Backend = 'channel'
      if ((await $.env.get('TERM_PROGRAM'))?.match(/^(iTerm\.app|ghostty)$/) || (await $.env.get('KITTY_WINDOW_ID'))) backend = 'native'
      else {
        const proc = await $.fs.read('/proc/version').catch(() => null)
        if (proc !== null)
          backend = /microsoft/i.test(proc) ? 'windows' : (await ok(['notify-send', '--version'])) !== null ? 'linux' : 'channel'
        else if ((await ok(['uname', '-s']))?.trim() === 'Darwin') backend = 'mac'
        else if ((await $.env.get('OS')) === 'Windows_NT') backend = 'windows'
      }
      const root = (await ok(['git', '-C', e.cwd, 'rev-parse', '--show-toplevel']))?.trim() || e.cwd
      const title = `Claude Code · ${clean(root.slice(root.lastIndexOf('/') + 1) || root)}`
      machine = {
        send: async kind => {
          if (backend === 'native' && ENGINE_NOTIFIES.has(kind)) return
          const run = argvFor(backend, title, t[kind])
          const sent = run
            ? await $.process.run(run.argv, { timeoutMs: 5000, stdin: run.stdin }).then(
                r => r.exitCode === 0,
                () => false,
              )
            : false
          if (!sent) await $.ui.notify(t[kind], { title }).catch(() => {})
        },
      }
    } catch {
      // Nothing to notify with: the session goes on silently.
    }
    return next(e)
  })

  on('turn.complete', async (_, e, next) => {
    if (machine && e.agentId === undefined && !e.isAborted && e.durationMs >= minMs) {
      await machine.send(e.reason === 'answer' ? 'done' : 'failed').catch(() => {})
    }
    return next(e)
  })

  on('classic.Notification', async (_, e, next) => {
    const kind = TYPES[e.notification_type]
    if (machine && kind) await machine.send(kind).catch(() => {})
    return next(e)
  }).catch((_, e, next) => next(e))
}
