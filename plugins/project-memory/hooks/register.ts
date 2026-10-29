import type { Register } from 'claude-code'

// The rules (~/.claude/CLAUDE.md) and the hand-off notes (SessionStart hook) are loaded by Claude Code itself,
// both installed by scripts/user-settings.sh: another plugin can never skip them. This mod adds what only a
// mod can do: telling Claude, once per compaction cycle, to update the notes before the automatic compaction.

export const REMINDER =
  'The context is approaching the compaction threshold: update .claude/contexte.md now (current goal, what is done, recent decisions, next action), so it holds the current state before the conversation is summarized.'

export const register: Register = (on, options) => {
  const handoffTokens = Math.max(0, Number(options.handoffTokens ?? 250000))
  // Due once the threshold is passed, sent once per compaction cycle.
  let due = false
  let reminded = false
  // A git repo or a folder with .claude/contexte.md: somewhere notes belong.
  let hasProject = false

  const reset = () => {
    due = false
    reminded = false
  }

  on('session.start', async ($, e, next) => {
    reset()
    const isRepo = await $.process.run(['git', '-C', e.cwd, 'rev-parse', '--is-inside-work-tree'], { timeoutMs: 5000 }).then(
      r => r.exitCode === 0,
      () => false,
    )
    const hasNotes = await $.fs.read(`${e.cwd}/.claude/contexte.md`).then(
      () => true,
      () => false,
    )
    hasProject = isRepo || hasNotes
    return next(e)
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
