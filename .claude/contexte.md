# Current context: claude-mods

Updated: 2026-10-29 23:00

## Current goal
Everything is coded, committed and on the claude.ai account. Remaining: the per-machine step the user runs (auto mode refuses Claude editing ~/.claude/settings.json hooks and ~/.claude/CLAUDE.md), then on-screen checks after a Claude Code restart.

## Done
- Account: 7 mods (usage-pace 0.3, sysmon 0.3 with the 3 biggest RAM programs, teacher-guard 0.2, langmod 0.2 remembering the language per machine, project-hours 0.1, notify 0.1, project-memory 0.2 = reminder only) and skills version-check (versions.sh, supply-chain checks) and init-project (templates ci.yml, dependabot.yml weekly grouped, settings.json, AGENTS.md; /teacher-mode activate proposed after infra; test-command removed).
- Global rules in user/CLAUDE.md, hand-off notes hook user/hooks/load-context.sh; scripts/user-settings.sh installs both (hook copied, CLAUDE.md symlinked with --rules / RULES=1), backups, dry run; make doctor shows the state.
- Laptop: compaction 300k already applied; dev-mods links removed.

## Recent decisions
- Rules and notes are loaded by Claude Code itself (CLAUDE.md, SessionStart hook), not by a mod: another plugin (seen: cc-plugin-sec-default) can pass prompt.context past a mod silently.
- Hook copied (survives a moved clone), rules symlinked (one source, git pull updates); rules only with --rules (owner's own).
- test-before-done and retry-intelligence dropped/deferred.

## Known pitfalls
- Languages are stored per installed copy (`<mod>@synced`, `@inline` for old dev copies): /langmod once per machine; langmod 0.2 then applies it to mods installed later.
- Test stubs need full results; process.run stdin is under `init`; engine types appear after a session loads the mod.
- No local `gh`: CI results unseen locally.

## Next action
User runs, in this repo: `! make user-settings RULES=1`, restarts Claude Code, types `/langmod fr`, then `make doctor` (User settings section all set). Then check: sysmon RAM line "surtout …", notify after a reply ≥ 15 s. On the workstation: clone/pull, `make user-settings RULES=1`, `/langmod fr`.

## Waiting for the user
- Uncommitted CLAUDE.md edits in appli_quotidien/appli_tracker and appli_quotidien/appli_jeu/double-regard (skill rename).
- Reminder: README demo GIF at the end.

## Missing info
- GPU checks on the workstation (docs/hardware.md).
