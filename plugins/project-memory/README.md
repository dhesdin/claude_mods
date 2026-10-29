# project-memory

Keeps Claude's memory of your project across sessions and compactions, the same on every machine:

1. **Your rules for every project** (the mod's [rules.md](rules.md)): given to Claude at the start of each conversation and after each compaction.
2. **The project's hand-off notes** (`.claude/contexte.md`, kept by the `project-handoff` skill) with a git snapshot (branch, uncommitted changes, last 5 commits): loaded at the same moments, so Claude does not re-read them.
3. **A reminder before compaction**: when the context reaches `handoffTokens` (default 250,000), Claude is told once to run the `project-handoff` skill, so the notes hold the current state before the conversation is summarized. After the compaction, point 2 loads them back.

The chain with the default settings: 250k tokens, reminder and notes updated; 300k, automatic compaction (`autoCompactWindow`, set per machine by `scripts/user-settings.sh`); after it, rules and notes loaded again.

Uploaded to your claude.ai account, it replaces the per-machine `~/.claude/CLAUDE.md` rules and the `charger-contexte.sh` SessionStart hook: `scripts/user-settings.sh` removes that hook once the mod is installed.

## Changing the rules

Edit [rules.md](rules.md) in this repository, then `make dist` and upload `dist/plugins/project-memory.zip` again: every machine gets the new rules at its next start. Keep them short: they are read at each conversation start.

## Tokens

This mod is the one that writes to the model, by design:

| What | When | Size |
| --- | --- | --- |
| rules + notes + git snapshot | first message of a conversation, and after each compaction | rules (~100 tokens) + notes (at most 6,000 characters, ~1,500 tokens) |
| the reminder | once per compaction cycle, past `handoffTokens` | ~40 tokens |

Without `.claude/contexte.md` in the project, only the rules are sent. Outside a git repo and without notes, no reminder.

## What it does on your machine

Reads `.claude/contexte.md` (the session folder's, otherwise the git root's) and the mod's own `rules.md`; runs `git -C <session folder>` with `rev-parse --show-toplevel`, `status --short`, `branch --show-current`, `log --oneline -5`. Control characters are removed and lengths capped before the text reaches Claude. No network, no file written.

## Options (`/config`, or `scripts/configure.sh project-memory key=value`)

| Option | Default | Role |
| --- | --- | --- |
| `globalRules` | true | give Claude the rules of `rules.md` |
| `handoffTokens` | 250000 | context size of the hand-off reminder, below the auto-compact window; `0` = never |

## Disable

`claude plugin disable project-memory@claude-mods` (or `@synced`). Then keep your rules in `~/.claude/CLAUDE.md` on each machine.

Spec: [docs/specs/06-project-memory.md](../../docs/specs/06-project-memory.md)
