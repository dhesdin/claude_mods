# project-memory

Reminds Claude, once before the automatic compaction, to update the project's hand-off notes.

When the context reaches `handoffTokens` (default 250,000) in a git repo or a folder with `.claude/contexte.md`, Claude reads, once, on its next tool result or your next message:

> The context is approaching the compaction threshold: run the project-handoff skill now, so .claude/contexte.md holds the current state before the conversation is summarized.

The full chain, with the per-machine settings of `make user-settings`:

| Step | Done by |
| --- | --- |
| 250k tokens: the notes are updated | this mod (reminder) + the `project-handoff` skill |
| 300k tokens: automatic compaction | Claude Code (`autoCompactWindow`, set by `make user-settings`) |
| after it, at each start, `/clear` and resume: the notes and a git snapshot are loaded | the SessionStart hook `load-context.sh` (installed by `make user-settings`) |
| your rules for every project | `~/.claude/CLAUDE.md` (linked to this repository's `user/CLAUDE.md` by `make user-settings RULES=1`) |

The notes and the rules are loaded by Claude Code itself, not by a mod: another plugin can never skip them. Only the reminder, which needs the context size, is a mod; if it is ever skipped, the rule "update the notes after each task" still holds.

## Tokens

About 40 tokens, once per compaction cycle. Nothing otherwise.

## What it does on your machine

At session start: runs `git -C <session folder> rev-parse --is-inside-work-tree` and checks whether `.claude/contexte.md` exists. Reads the context size Claude Code reports after each reply. No file written, no network.

## Options (`/config`, or `scripts/configure.sh project-memory key=value`)

| Option | Default | Role |
| --- | --- | --- |
| `handoffTokens` | 250000 | context size of the reminder, below the auto-compact window; `0` = never |

## Disable

`claude plugin disable project-memory@claude-mods` (or `@synced`).

Spec: [docs/specs/06-project-memory.md](../../docs/specs/06-project-memory.md)
