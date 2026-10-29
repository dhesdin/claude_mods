# Mod 06: project-memory

## Problem
The person's rules (`~/.claude/CLAUDE.md`) and the SessionStart hook that loads `.claude/contexte.md` live in per-machine files: a second machine lacks them. And a long session can reach automatic compaction before the hand-off notes are updated.

## Behavior
- `prompt.context` adds one block, `projectMemory`: the rules of the mod's `rules.md`, then `.claude/contexte.md` (session folder, else git root; first 6,000 characters) and a git snapshot. The engine sends such a block with a conversation's first request and after each compaction. Computed once per conversation, again after a compaction, a `/clear` or a session start.
- Hand-off reminder: `session.measure` past `handoffTokens` (default 250,000, under the auto-compact window) arms it; the next main-loop tool result (`tool.call` `context`) or prompt (`prompt.submit` `context`) carries it, once; `session.compact` of the main loop resets it. Only in a git repo or a folder with `.claude/contexte.md`.
- Sends text to the model by design (exception to the zero-token rule, decided 2026-10-29); sizes in the README.

## Per machine (cannot be carried by a plugin)
`autoCompactEnabled` and `autoCompactWindow` (300,000): `scripts/user-settings.sh`, which also removes the old `charger-contexte.sh` hook once this mod is installed.

## Config
`globalRules`, `handoffTokens`.
