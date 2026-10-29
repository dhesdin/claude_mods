import type { Register } from 'claude-code'

// Text from files and git reaches the model: no control characters, a bounded length.
// biome-ignore lint/suspicious/noControlCharactersInRegex: removing control characters is the point.
const clean = (s: string, max: number) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '').slice(0, max)

export const REMINDER =
  'The context is approaching the compaction threshold: run the project-handoff skill now, so .claude/contexte.md holds the current state before the conversation is summarized.'

export type Snapshot = { notes: string | null; branch: string; status: string; log: string }

// The block Claude reads at the start of a conversation and again after each compaction.
export function memoryText(rules: string | null, s: Snapshot | null): string {
  const parts: string[] = []
  if (rules) parts.push(`Rules for every project (project-memory mod):\n${clean(rules, 4000).trim()}`)
  if (s?.notes) {
    const status = s.status.trim() ? `- uncommitted changes:\n${s.status.trimEnd().replace(/^/gm, '  ')}` : '- no uncommitted change'
    const git = s.branch
      ? `\n\nGit at load time:\n- branch: ${s.branch}\n${status}\n- last commits:\n${s.log.trimEnd().replace(/^/gm, '  ')}`
      : ''
    parts.push(
      `Project hand-off notes (.claude/contexte.md, already loaded here: do not read it again):\n\n${clean(s.notes, 6000).trim()}${git}`,
    )
  }
  return parts.join('\n\n')
}

// System access, built in session.start from `$` (which can never be passed around as a value).
type Machine = { rules: () => Promise<string | null>; snapshot: () => Promise<Snapshot | null> }

export const register: Register = (on, options) => {
  const withRules = Boolean(options.globalRules ?? true)
  const handoffTokens = Math.max(0, Number(options.handoffTokens ?? 250000))
  let machine: Machine | null = null
  // The block, computed once per conversation and again after a compaction or a /clear.
  let block: string | null = null
  // Hand-off reminder: due once the threshold is passed, sent once per compaction cycle.
  let due = false
  let reminded = false
  let hasProject = false

  const reset = () => {
    block = null
    due = false
    reminded = false
  }

  on('session.start', async ($, e, next) => {
    reset()
    try {
      const git = (args: string[]) =>
        $.process.run(['git', '-C', e.cwd, ...args], { timeoutMs: 5000 }).then(
          r => (r.exitCode === 0 ? clean(r.stdout, 3000) : null),
          () => null,
        )
      const read = (path: string) => $.fs.read(path).catch(() => null)
      const root = (await git(['rev-parse', '--show-toplevel']))?.trim() ?? null
      const notesPath = async () =>
        (await read(`${e.cwd}/.claude/contexte.md`)) !== null ? `${e.cwd}/.claude/contexte.md` : `${root ?? e.cwd}/.claude/contexte.md`
      hasProject = root !== null || (await read(`${e.cwd}/.claude/contexte.md`)) !== null
      const rulesPath = `${$.plugin.root}/rules.md`
      machine = {
        rules: () => read(rulesPath),
        snapshot: async () => {
          const notes = await read(await notesPath())
          if (notes === null) return null
          const status = ((await git(['status', '--short'])) ?? '').split('\n').slice(0, 25).join('\n')
          return {
            notes,
            branch: (await git(['branch', '--show-current']))?.trim() ?? '',
            status,
            log: (await git(['log', '--oneline', '-5'])) ?? '',
          }
        },
      }
    } catch {
      // No git, unreadable files: the conversation starts without the block.
    }
    return next(e)
  })

  on('prompt.context', async (_, e, next) => {
    const r = await next(e)
    const m = machine
    if (!m) return r
    if (block === null) block = memoryText(withRules ? await m.rules() : null, await m.snapshot().catch(() => null))
    return block ? { ...r, blocks: [...r.blocks, { name: 'projectMemory', text: block }] } : r
  })

  on('session.measure', async (_, e, next) => {
    if (handoffTokens > 0 && hasProject && !reminded && (e.context.tokens ?? 0) >= handoffTokens) due = true
    return next(e)
  })

  // The reminder rides on the first tool result or prompt after the threshold, whichever comes first.
  on('tool.call', async (_, e, next) => {
    const r = await next(e)
    if (!due || e.agentId !== undefined || r.deny !== undefined) return r
    due = false
    reminded = true
    return { ...r, context: [...(r.context ?? []), REMINDER] }
  }).catch((_, e, next) => next(e))

  on('prompt.submit', async (_, e, next) => {
    if (!due) return next(e)
    due = false
    reminded = true
    return next({ ...e, context: [...(e.context ?? []), REMINDER] })
  }).catch((_, e, next) => next(e))

  on('session.compact', async (_, e, next) => {
    const r = await next(e)
    if (e.agentId === undefined) reset()
    return r
  }).catch((_, e, next) => next(e))

  on('session.end', async (_, e, next) => {
    reset()
    return next(e)
  })
}
