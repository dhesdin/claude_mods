# Current context: claude-mods

Updated: 2026-10-30 (laptop done)

## Current goal
Laptop fully set up and checked. Remaining: the GPU workstation (setup, GPU checks, README demo GIF).

## Done
- Account: 7 mods (usage-pace 0.3, sysmon 0.3, teacher-guard 0.2, langmod 0.2, project-hours 0.1, notify 0.1, project-memory 0.2) and skills version-check v3, init-project v3.
- Laptop: make user-settings RULES=1 run, /langmod fr, make doctor all set (compaction 300k, hand-off hook, global rules linked); sysmon RAM line "surtout …" and notify checked on screen.
- appli_tracker (a07b91d) and double-regard (cf77a61): skill rename committed; double-regard pushed; appli_tracker not pushed (HTTPS remote without credentials, auto mode refuses repointing it).
- docs checked: install, user settings, mods catalog, hardware checklist up to date (langmod per-machine memory added to docs/mods.md).

## Recent decisions
- Rules and notes are loaded by Claude Code itself (user/CLAUDE.md, SessionStart hook), not by a mod: another plugin can pass prompt.context past a mod silently.
- Hook copied, rules symlinked; rules only with RULES=1.
- README demo GIF recorded on the GPU workstation, so the sysmon GPU card is in it.

## Known pitfalls
- Languages are stored per installed copy: /langmod once per machine; langmod 0.2 applies it to mods installed later.
- Auto mode refuses Claude editing ~/.claude/settings.json hooks and ~/.claude/CLAUDE.md: the user runs make user-settings.
- No local `gh`: CI results unseen locally.

## Next action
On the workstation: clone or pull, `make user-settings RULES=1`, restart Claude Code, `/langmod fr`, `make doctor`, then the GPU checklist in docs/hardware.md (sysmon GPU card), then record the README demo GIF.

## Waiting for the user
- appli_tracker push: the user switches its remote to SSH and pushes (6 commits ahead).

## Missing info
- Workstation OS (Linux assumed) and GPU check results.
