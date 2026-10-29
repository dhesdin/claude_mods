# Current context — claude-mods

Updated: 2026-10-29 19:00

## Current goal
Mod 4 `project-hours` (docs/specs/04-project-hours.md): finished in code (README, clock icon, 6 tests incl. integration: session, reload, /hours, /hours 2, pane, degraded cases), committed and pushed (07b767a). Linked for hot reload in this session (~/.claude/dev-mods/4f3c1696-…/project-hours -> plugins/project-hours). Waiting for the user's on-screen check of /hours and /hours pane.

## Done (repo public on github.com/dhesdin/claude_mods)
- usage-pace 0.2, sysmon 0.2, teacher-guard 0.2, langmod: on the user's claude.ai account, synced as <mod>@synced on every machine.
- User skills (help-skills, help-mods, passation-projet, travail-econome) live on the claude.ai account, not in this repo.
- Repo tooling: docs/, AGENTS.md, /install-mods, make doctor/install/dist, scripts/check.sh, CI, ruleset protect-main (owner bypass), security settings (SECURITY.md).
- Directory (claude.ai/directory/manage): sysmon submitted, waiting for scan + review. usage-pace: steps 1-3 done (repo dhesdin/claude_mods, path plugins/usage-pace, validation passed at 07b767a with the known `types` warning; data handling: no personal data, nothing sent, not retained, not for minors). Step 4 (contact e-mail + 4 compliance ticks) and step 5 are the user's, in the open Chrome tab.

## Decisions
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
- Directory portal re-asks validation whenever main moves; the portal URL is claude.ai/directory/manage.
- tsc type-check of project-hours skipped until a session lays its types (after the hot-reload load).

## Next action
1. User tests /hours, /hours 2, /hours pane in this session. Then run `scripts/check.sh project-hours` again (types now laid) and fix anything tsc reports.
2. After validation: CLAUDE.md status "Checked on screen" = yes, remove the dev-mods link, make dist, upload project-hours to the account.
3. User finishes the usage-pace directory submission (step 4 ticks + e-mail, step 5 send, auto-publish off like sysmon).

## Pending (remind the user)
- Demo GIF for the README (Peek, short script) once all mods are done.

## Missing info
- GPU checks on the workstation (docs/hardware.md); Jetson/AMD on real hardware.
