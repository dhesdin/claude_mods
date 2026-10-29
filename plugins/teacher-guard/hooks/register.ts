import type { ProcessRunResult, Register } from 'claude-code'

import { bashWrites } from './bash'
import { strings } from './i18n'
import { resolve, selfAndAncestors } from './paths'

const MARKER = '.teacher-mode'
// Sent back to the model when a write is refused. English: the reader is the model.
const REFUSAL = 'Repo in teacher mode: no writes. Explain, ask questions, give hints, do not provide complete code.'
// The only tokens this mod spends: a short instruction while the session runs in a protected repo.
const SECTION = {
  id: 'teacher-guard:instruction',
  text:
    'This repository is in teacher mode: the user writes the code and you cannot change its files. ' +
    'Act as a reviewer: explain, ask questions, give hints; never provide complete code.',
  scope: 'session',
} as const

// System access, built in session.start from `$` (which can never be passed around as a value).
type Host = {
  exists: (path: string) => Promise<boolean>
  cwd: () => Promise<string>
  // Only the variables a path in a command commonly uses; $.env.get takes literal names.
  vars: () => Promise<Record<string, string>>
  run: (argv: readonly string[]) => Promise<ProcessRunResult>
  status: (text: string | undefined) => void
}

// The folder holding the marker for `path` (the path itself or a parent), or null.
// The marker is read again on every check: deleting the file turns the mode off at once.
export async function protectedRoot(exists: (path: string) => Promise<boolean>, path: string): Promise<string | null> {
  for (const dir of selfAndAncestors(path)) {
    if (await exists(`${dir === '/' ? '' : dir}/${MARKER}`)) return dir
  }
  return null
}

// One check = one dispatch: a folder is looked up once even when several paths share it.
const memo = (exists: (path: string) => Promise<boolean>) => {
  const seen = new Map<string, Promise<boolean>>()
  return (path: string) => {
    let hit = seen.get(path)
    if (!hit) {
      hit = exists(path)
      seen.set(path, hit)
    }
    return hit
  }
}

export const register: Register = (on, options) => {
  const t = strings(options.language)
  let host: Host | null = null

  const sessionRoot = async (h: Host) => protectedRoot(h.exists, await h.cwd())

  // Status line: the mode, and a warning when the marker could end up in a commit.
  const refreshStatus = async (h: Host) => {
    const root = await sessionRoot(h)
    if (!root) return h.status(undefined)
    const code = (argv: string[]) =>
      h.run(['git', '-C', root, ...argv]).then(
        r => r.exitCode,
        () => 128,
      )
    const [tracked, ignored] = await Promise.all([code(['ls-files', '--error-unmatch', MARKER]), code(['check-ignore', '-q', MARKER])])
    // check-ignore: 0 ignored, 1 not ignored, 128 not a git repo (nothing to commit it into).
    h.status(tracked === 0 ? t.tracked : ignored === 1 ? t.notIgnored : t.active)
  }

  // Refuses when one of `paths` sits in a protected repo; `what` says what tried to write.
  const judge = async (h: Host, writes: { what: string; path: string }[]) => {
    const exists = memo(h.exists)
    for (const w of writes) {
      const root = await protectedRoot(exists, w.path)
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
      exists: path =>
        $.fs.read(path).then(
          () => true,
          () => false,
        ),
      cwd: () => $.session.cwd(),
      vars: async () => {
        const [home, tmpdir] = await Promise.all([$.env.get('HOME'), $.env.get('TMPDIR')])
        return { ...(home ? { HOME: home } : {}), ...(tmpdir ? { TMPDIR: tmpdir } : {}) }
      },
      run: argv => $.process.run(argv, { timeoutMs: 5000 }),
      status: text => $.ui.status(text),
    }
    host = h
    await refreshStatus(h).catch(() => {})
    return next(e)
  })

  on('prompt.submit', async (_, e, next) => {
    if (host) void refreshStatus(host).catch(() => {})
    return next(e)
  }).catch((_, e, next) => next(e))

  on('prompt.compose', async (_, e, next) => {
    const composed = await next(e)
    if (!host || !(await sessionRoot(host).catch(() => null))) return composed
    return { sections: [...composed.sections.filter(s => s.id !== SECTION.id), SECTION] }
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
