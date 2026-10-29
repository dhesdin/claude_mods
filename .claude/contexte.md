# Current context — claude-mods

Updated: 2026-10-29 20:50

## Current goal
All five mods done, validated on screen, on the user's claude.ai account (usage-pace 0.3 and project-hours uploaded 2026-10-29 evening; they sync at the next Claude Code start). No hot-reload link left. Next: the user's new questions.

## Done (repo public on github.com/dhesdin/claude_mods)
- usage-pace 0.2, sysmon 0.2, teacher-guard 0.2, langmod: on the user's claude.ai account, synced as <mod>@synced on every machine.
- User skills (help-skills, help-mods, project-handoff, token-economy) live on the claude.ai account, not in this repo.
- Repo tooling: docs/, AGENTS.md, /install-mods, make doctor/install/dist, scripts/check.sh, CI, ruleset protect-main (owner bypass), security settings (SECURITY.md).
- Directory (claude.ai/directory/manage): sysmon submitted, waiting for scan + review. usage-pace: steps 1-3 done (repo dhesdin/claude_mods, path plugins/usage-pace, validation passed at 07b767a with the known `types` warning; data handling: no personal data, nothing sent, not retained, not for minors). Step 4 (contact e-mail + 4 compliance ticks) and step 5 are the user's, in the open Chrome tab.

## Decisions
- docs/mods.md is the single catalog (commands, every option) read by users and /install-mods; scripts/check.sh "docs coverage" fails when a mod or option is missing from it, the mod README or the root README table.
- Options set from a terminal with scripts/configure.sh (claude plugin configure --values-stdin; works for @synced too); values apply after a Claude Code restart.
- project-hours multi-machine: dataFolder option pointing at a folder a user-installed sync tool shares (Syncthing recommended); the mod stays zero network. Alerts are rolling: no time in the last N weeks.
- Mods distributed through the claude.ai account (make dist + upload); make install = per machine/dev. Never both on one machine.
- Model-facing text in English; display text via `language` option + /langmod.
- surface.txt snapshots are the review gate; zero network enforced.
- Commits: no Claude co-author; scripts/check.sh must pass before every commit.
- project-hours week start is fixed to Monday (ISO weeks), stated in its README, no option.

## Known pitfalls
- `$` cannot be passed/stored: closures object built in session.start (`machine`).
- $.env.get takes literal names only. fs.write rewrites the whole file: one JSONL file per session per week.
- /clear ends the session with a new id and no session.start: project-hours keeps writing under the old file name (harmless).
- Biome collapses double spaces in JSX text: padded labels in string constants. Never name a variable `h` or `Fragment` in .tsx.
- Install smoke tests only with CLAUDE=echo. shellcheck runs in CI only.
- help-mods (account skill) fixed to read `claude plugin list --json` (v2 uploaded); it does not list hot-reload dev mods.
- Directory portal re-asks validation whenever main moves; the portal URL is claude.ai/directory/manage.
- tsc type-check of project-hours skipped until a session lays its types (after the hot-reload load).

## Next action
1. After a Claude Code restart: `claude plugin list` should show usage-pace 0.3.0@synced and project-hours@synced.
2. Directory: usage-pace and sysmon are "En cours d'examen" (held: the plugin includes a mod, Anthropic reviewer). The directory picks new commits about every 6 h (usage-pace 0.3 not yet seen). project-hours not submitted (offer it).
3. CI not checked locally (no gh CLI): look at GitHub Actions.

## Pending (remind the user)
- Demo GIF for the README (Peek, short script) once all mods are done.

## Missing info
- GPU checks on the workstation (docs/hardware.md); Jetson/AMD on real hardware.
