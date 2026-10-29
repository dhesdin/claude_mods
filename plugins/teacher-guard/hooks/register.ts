import type { Register } from 'claude-code'
import { atom, read, update } from 'claude-code'

import type { Roots } from '../types'
import { bashWrites } from './bash'
import { strings } from './i18n'
import { basename, normalize, resolve } from './paths'

// Repos in teacher mode for this session. $.state: survives a reload of the mod, not a new session.
const roots = atom({ plugin: 'teacher-guard', key: 'roots' } as const, [] as Roots)

// Sent back to the model when a write is refused. English: the reader is the model.
const REFUSAL = 'Repo in teacher mode: no writes. Explain, ask questions, give hints, do not provide complete code.'
const SECTION_ID = 'teacher-guard:instruction'
// The only tokens this mod spends: a short instruction while a repo is in teacher mode.
const instruction = (list: Roots) =>
  `Teacher mode is on for ${list.join(', ')}: the user writes the code there and you cannot change those files. ` +
  'Act as a reviewer: explain, ask questions, give hints; never provide complete code.'

// The protected repo holding `path` (the repo itself or anything below it), or null.
export function protectedRoot(list: Roots, path: string): string | null {
  const p = normalize(path)
  return list.find(root => p === root || p.startsWith(`${root}/`)) ?? null
}

// System access, built in session.start from `$` (which can never be passed around as a value).
type Host = {
  cwd: () => Promise<string>
  vars: () => Promise<Record<string, string>>
  gitRoot: (dir: string) => Promise<string | null>
  roots: () => Promise<Roots>
  setRoots: (fn: (list: Roots) => Roots) => Promise<unknown>
  status: (text: string | undefined) => void
}

export const register: Register = (on, options) => {
  const t = strings(options.language)
  let host: Host | null = null

  const refreshStatus = async (h: Host) => {
    const list = await h.roots()
    h.status(list.length === 0 ? undefined : t.status(list.map(basename).join(', ')))
  }

  // Refuses when one of the writes lands in a repo in teacher mode.
  const judge = async (h: Host, writes: { what: string; path: string }[]) => {
    const list = await h.roots()
    if (list.length === 0) return null
    for (const w of writes) {
      const root = protectedRoot(list, w.path)
      if (root) return { deny: `${REFUSAL} (refused: ${w.what} in ${root})` }
    }
    return null
  }

  const judgeFile = async (tool: string, path: string | undefined) => {
    if (!host || !path) return null
    return judge(host, [{ what: tool, path: resolve(await host.cwd(), path) }])
  }

  on('session.start', async ($, e, next) => {
    const h: Host = {
      cwd: () => $.session.cwd(),
      vars: async () => {
        // $.env.get takes literal names: only the variables paths in commands commonly use.
        const [home, tmpdir] = await Promise.all([$.env.get('HOME'), $.env.get('TMPDIR')])
        return { ...(home ? { HOME: home } : {}), ...(tmpdir ? { TMPDIR: tmpdir } : {}) }
      },
      gitRoot: dir =>
        $.process.run(['git', '-C', dir, 'rev-parse', '--show-toplevel'], { timeoutMs: 5000 }).then(
          r => (r.exitCode === 0 ? normalize(r.stdout.trim()) : null),
          () => null,
        ),
      roots: () => read($, roots),
      setRoots: fn => update($, roots, fn),
      status: text => $.ui.status(text),
    }
    host = h
    try {
      await $.command.register({ name: 'teacher-mode', description: t.commandDescription, argumentHint: 'activate | deactivate' })
      await refreshStatus(h)
    } catch {
      // Command refused: the guard itself still works for repos already on.
    }
    return next(e)
  })

  on('command.run', { command: 'teacher-mode' }, async (_, e) => {
    const h = host
    if (!h) return { text: t.off }
    const cwd = await h.cwd()
    const repo = (await h.gitRoot(cwd)) ?? normalize(cwd)
    const list = await h.roots()
    const action = e.args.trim().toLowerCase()

    if (action === 'activate' || action === 'on') {
      if (protectedRoot(list, repo)) return { text: t.alreadyActive(repo) }
      await h.setRoots(l => [...l, repo])
      await refreshStatus(h)
      return { text: t.activated(repo) }
    }
    if (action === 'deactivate' || action === 'off') {
      // Turning it off is for the person at the prompt, never for a plugin or the model.
      if (e.origin.kind !== 'composer') return { text: t.personOnly }
      const root = protectedRoot(list, repo) ?? protectedRoot(list, cwd)
      if (!root) return { text: t.notActive }
      await h.setRoots(l => l.filter(r => r !== root))
      await refreshStatus(h)
      return { text: t.deactivated(root) }
    }
    return { text: `${list.length === 0 ? t.off : t.current(list.join(', '))}\n${t.usage}` }
  })

  on('prompt.compose', async (_, e, next) => {
    const composed = await next(e)
    const list = host ? await host.roots().catch(() => []) : []
    const rest = composed.sections.filter(s => s.id !== SECTION_ID)
    if (list.length === 0) return rest.length === composed.sections.length ? composed : { sections: rest }
    return { sections: [...rest, { id: SECTION_ID, text: instruction(list), scope: 'session' as const }] }
  })

  // A guard fails closed: if the check itself throws before letting the call through, the call is refused.
  const failClosed = { deny: 'teacher-guard could not check this call, so it was refused. Try again.' }

  on('tool.call', { tool: 'Write' }, async (_, e, next) => (await judgeFile('Write', e.file_path)) ?? next(e)).catch((_, e, next) =>
    next.called ? next(e) : failClosed,
  )

  on('tool.call', { tool: 'Edit' }, async (_, e, next) => (await judgeFile('Edit', e.file_path)) ?? next(e)).catch((_, e, next) =>
    next.called ? next(e) : failClosed,
  )

  on('tool.call', { tool: 'NotebookEdit' }, async (_, e, next) => (await judgeFile('NotebookEdit', e.notebook_path)) ?? next(e)).catch(
    (_, e, next) => (next.called ? next(e) : failClosed),
  )

  on('tool.call', { tool: 'Bash' }, async (_, e, next) => {
    const h = host
    if (!h) return next(e)
    const writes = bashWrites(e.command, await h.cwd(), await h.vars()).map(f => ({
      what: f.reason,
      // A target that cannot be known (command substitution) is judged by the folder the command runs in.
      path: f.target.kind === 'path' ? f.target.path : f.target.cwd,
    }))
    return (await judge(h, writes)) ?? next(e)
  }).catch((_, e, next) => (next.called ? next(e) : failClosed))
}
