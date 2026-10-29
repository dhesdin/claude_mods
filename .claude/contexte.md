# Current context: claude-mods

Updated: 2026-10-29 22:00

## Current goal
On-screen check of notify (05) and project-memory (06), loaded in this session through dev-mods links (~/.claude/dev-mods/4f3c1696-…/) and uploaded to the claude.ai account. The projectMemory block and the 250k hand-off reminder both arrived in this session: project-memory works.

## Done
- 7 mods on the claude.ai account (usage-pace 0.3, sysmon, teacher-guard, langmod, project-hours, notify, project-memory); status table in CLAUDE.md.
- scripts/user-settings.sh applied on the laptop (auto-compaction at 300k, CLAUDE_AUTOCOMPACT_PCT_OVERRIDE removed; backup settings.json.20261029-214415.bak). The charger-contexte.sh hook is still there.
- Skills renamed (project-handoff, token-economy, industry-code-review); French duplicates deleted from the account.
- docs/mods.md is the single catalog; check.sh "docs coverage" enforces it.
- Directory: usage-pace and sysmon under Anthropic review; project-hours not submitted.

## Recent decisions
- New mods are TypeScript: notify (classic.Notification + turn.complete, notify-send/osascript/PowerShell by argv); project-memory (prompt.context, session.measure, tool.call/prompt.submit `context`).
- Settings no plugin can carry (autoCompactEnabled, autoCompactWindow): scripts/user-settings.sh, once per machine.
- test-before-done and retry-intelligence deferred (little value today).
- Model-facing text in English; display translated (`language`, /langmod).
- Commits without Claude co-author; scripts/check.sh green before every commit.

## Known pitfalls
- `$` cannot be passed or stored: closures built in session.start.
- Test stubs return a full result (turn.complete `{ text }`, session.measure `{ changed }`, session.compact with one message holding `toolUses`); process.run's stdin is under `init`.
- Engine types are missing until a session loads the mod: copy .claude-plugin/types and tsconfig.json from another mod (git-ignored).
- shellcheck runs in CI only; no local `gh` to read CI results.

## Next action
After a Claude Code restart on the laptop: check notify@synced and project-memory@synced (`claude plugin list`), run `make user-settings` again (removes the hook), remove the 2 rules from ~/.claude/CLAUDE.md, delete the dev-mods links. On the workstation: `make user-settings`.

## Waiting for the user
- Proposed fixes to the version-check and init-project skills (init-project's `.teacher-mode` marker does not exist).
- Uncommitted CLAUDE.md edits: appli_quotidien/appli_tracker, appli_quotidien/appli_jeu/double-regard.
- Reminder: README demo GIF at the end.

## Missing info
- GPU checks on the workstation (docs/hardware.md); Jetson/AMD on real hardware.
