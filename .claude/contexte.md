# Current context — claude-mods

Updated: 2026-10-30

## Current goal
Finish mod 4 `project-hours` (docs/specs/04-project-hours.md): code exists (plugins/project-hours: hooks/track.ts pure logic, hooks/register.tsx, i18n, 2 unit tests, marketplace entry, surface.txt), validate + tests pass. Missing: README (with "What it does on your machine" section), dedicated icon (currently a copy of usage-pace's), integration tests (session.start/turn.complete/flush, /hours, pane), link into ~/.claude/dev-mods/<session>/ for hot reload, on-screen check by the user, then `make dist` + upload to the claude.ai account.

## Done (state of the repo, public on github.com/dhesdin/claude_mods)
- Mods: usage-pace 0.2, sysmon 0.2 (NVIDIA; Jetson/AMD [to validate]), teacher-guard 0.2 (/teacher-mode activate|deactivate, per session, validated on screen), langmod (/langmod en|fr|ja|zh). All four uploaded to the user's claude.ai account (Customize > Plugins) and synced as <mod>@synced on every machine (verified).
- User skills help-skills, help-mods, passation-projet, travail-econome are on the claude.ai account (not in this repo); laptop copies removed.
- Repo: English everywhere (UI translated per mod), docs/ (install, hardware, architecture, development, mods-api, specs), AGENTS.md, /install-mods project skill, make doctor/install/dist, Biome + shellcheck + invisible-char + doc-link checks, CI green, CODEOWNERS, SECURITY.md.
- GitHub: public; ruleset protect-main (PR + 1 approval, CI `check`, no force push/delete; owner bypass); Actions read-only, SHA-pinned actions required, external PR workflows need approval; secret scanning + push protection, private vulnerability reporting, Dependabot + malware alerts.
- Directory: sysmon submitted (auto-publish off, scheduled checks), waiting for security scan + reviewer (5 policy holds explained in its README).

## Decisions
- Mods distributed through the claude.ai account (make dist + upload); make install = per machine/dev. Never both on one machine.
- Model-facing text in English; display text via `language` option + /langmod.
- Surface snapshots (surface.txt) are the review gate; zero network enforced.
- Commits: no Claude co-author; check before every commit (`scripts/check.sh` must pass, then commit).
- Biome collapses double spaces in JSX text: keep padded labels in string constants.
- Never name a variable `h` or `Fragment` in .tsx (JSX factory; directory blocks it).

## Known pitfalls
- `$` cannot be passed/stored: build a closures object in session.start (`machine`/`host`).
- $.env.get takes literal names only. fs.write rewrites the whole file: project-hours writes one JSONL file per session per week.
- Install smoke tests only with CLAUDE=echo. shellcheck runs in CI only (not installed locally).
- Directory portal re-asks validation whenever main moves.

## Next action
1. project-hours: README, icon, integration tests, `scripts/check.sh`, commit/push, link for hot reload, ask the user to test /hours and /hours pane.
2. After the user validates: bump CLAUDE.md status table, make dist, upload project-hours to the account.
3. usage-pace directory submission: steps 1-3 by Claude, Compliance acknowledgements ticked by the user (do not tick them).

## Pending (remind the user)
- Demo GIF for the README (Peek, short script) once all mods are done.

## Missing info
- GPU checks on the workstation (docs/hardware.md checklists); Jetson/AMD on real hardware.
