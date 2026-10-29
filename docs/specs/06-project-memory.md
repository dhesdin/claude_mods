# Mod 06: project-memory

## Problem
A long session can reach automatic compaction before the hand-off notes (`.claude/contexte.md`) are updated: what is not in them is lost.

## Behavior
- `session.measure` past `handoffTokens` (default 250,000, under the auto-compact window) arms a reminder; the next main-loop tool result (`tool.call` `context`) or prompt (`prompt.submit` `context`) carries it, once; `session.compact` of the main loop resets it. Only in a git repo or a folder with `.claude/contexte.md`.
- About 40 tokens per compaction cycle (exception to the zero-token rule, decided 2026-10-29).

## Not in this mod (decided 2026-10-29)
Version 0.1 also injected the global rules and the notes through `prompt.context`. Another plugin running first can pass that event on past a mod with no visible error (seen: `cc-plugin-sec-default`). So both moved to what Claude Code loads itself, installed per machine by `scripts/user-settings.sh`: `~/.claude/CLAUDE.md` (optionally linked to `user/CLAUDE.md`) and the SessionStart hook `user/hooks/load-context.sh`.

## Config
`handoffTokens`.
