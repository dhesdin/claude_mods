## 2026-10-29 — usage-pace, sysmon, repo structure
- Done: usage-pace (3 iterations: text band → framed cards with level colors → explicit reset sentence + separate pace card with projection); sysmon (cards GPU/CPU/RAM/disk, explicit labels, available RAM, core count, throttling, disk, machine_status tool); langmod; i18n en/fr/ja/zh; Jetson and AMD GPU sources [to validate].
- Repo: English everywhere, docs/ (architecture, development, mods-api, hardware, specs), scripts/check.sh and install.sh, GitHub CI, SECURITY.md, MIT license.
- Decisions: data from session.measure only; config via userConfig; pace as a projection instead of a point gap; two nvidia-smi calls per cycle; surface snapshots as review gate; model-facing text in English.
- Security: secret scan and history clean; untrusted names cleaned and JSON-quoted; no shell; SHA-pinned CI actions, read-only token.
- Pitfalls: `$` cannot be passed as a value; types contract without import; test stub ordering; TS2589 on $.tool.call with MCP types.
- Later: Biome lint + format, shellcheck, Trojan Source guard added to check.sh and CI; literal bidi characters found and escaped in sysmon util.ts and its test; formatter JSX-spacing pitfall fixed.
- teacher-guard: path-aware Bash guard (writes into a protected repo refused, temp folders free), fail-closed tool guards, status line with marker warnings, session instruction via prompt.compose.
- Makefile for modular installs (make install sysmon …, MOD_LANG/MOD_SCOPE/CLAUDE, config.mk); teacher-guard v0.2 with /teacher-mode activate|deactivate per session instead of a marker file; a mod-help plugin (later removed). An install smoke test without a dry run installed every mod once: undone, CLAUDE=echo documented.
- make <mod>... shortcut.
- mod-help plugin removed from the repo.
- Distribution moved to the claude.ai account: 4 mods uploaded as plugins (synced as <mod>@synced, verified after a start); skills/ removed from the repo; make dist kept; make install stays for per-machine installs.
- Onboarding: make doctor, /install-mods project skill, machine table in docs/hardware.md; laptop copies of passation-projet and travail-econome removed (now from the account).
- Docs restructured for two audiences: AGENTS.md + /install-mods for agents, docs/install.md for humans; README slimmed to how it works + paths; doc link check in CI.

## 2026-10-30 — public repo, account distribution, directory
- Repo made public by the user; protections set (ruleset, CODEOWNERS, Actions restrictions, secret scanning, PVR, Dependabot). CI was red since several commits (shellcheck SC2100 in install.sh): fixed, green.
- Mods and user skills moved to the claude.ai account (synced, verified). Skills removed from the repo.
- Docs for two audiences (AGENTS.md + /install-mods; docs/install.md), make doctor, icons, directory metadata.
- sysmon submitted to the Anthropic directory (auto-publish off). usage-pace submission not started.
- project-hours 0.1.0 coded, not finished (README, icon, integration tests, screen check, upload).
- Pitfalls: variable `h` in .tsx blocked by the directory; a commit was pushed with failing checks once (now: check before commit).

## 2026-10-29 (evening) — project-hours finished in code, usage-pace submission
- Done: project-hours README, dedicated clock icon, integration tests (session, reload, /hours, pane, degraded), root README row; committed 07b767a and pushed. Linked for hot reload.
- usage-pace directory submission: steps 1-3 filled (validation passed, 1 `types` warning); step 4 left to the user.
- Decision: project-hours weeks fixed to Monday (ISO), no option.

## 2026-10-29 (night) — options, sync, docs for humans and agents
- Done: usage-pace 0.3 (/usage-pace toggle); /hours panel; project-hours reads only needed weeks, dataFolder option (sync via Syncthing), rolling alerts; docs/mods.md catalog; scripts/configure.sh; /install-mods asks options per mod; AGENTS.md rewritten; CI docs-coverage check; help-mods skill fixed (v2 on the account).
- Measures: a session file is 1-3 KB (~170 B per segment); 2,000 sessions = a few MB. Reads were the real cost (every file every turn), now bounded by the weeks shown.
- Pitfalls: `claude plugin configure --values-stdin` takes string values and asks for a restart; a network share as dataFolder is refused by $.fs.

## 2026-10-29 (late night) — notify, project-memory, per-machine settings
- Done: notify 0.1.0 and project-memory 0.1.0 (tests, icons, READMEs, specs 05/06), scripts/user-settings.sh, docs; both mods uploaded; laptop settings applied (backup settings.json.20261029-214415.bak).
- Decisions: test-before-done and retry-intelligence deferred (low value now); notify always notifies, replies under 15 s skipped; reminder at 250k, compaction at 300k.
- Found: autoCompactEnabled was false and CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70 set; the default notification channel does nothing in GNOME Terminal.
- Pitfalls: test stubs must return a full result (turn.complete `{ text }`, session.measure `{ changed }`, session.compact needs one message with `toolUses`); process.run's stdin is under `init`.

## 2026-10-29 (23:00) : rules and notes back to Claude Code, langmod memory, sysmon RAM programs
- Done: user/CLAUDE.md + user/hooks/load-context.sh installed by make user-settings (RULES=1); project-memory 0.2 reminder only; langmod 0.2 ($.store, applied at start); sysmon 0.3 (top 3 RAM programs, ps every 15 s); langmod, sysmon, project-memory re-uploaded.
- Decisions: plugin-injected context can be skipped by another plugin (cc-plugin-sec-default), so rules/notes use CLAUDE.md and a SessionStart hook.
- Pitfalls: auto mode refuses Claude writing ~/.claude/settings.json hooks or CLAUDE.md: the user runs make user-settings; a python `open(p,'w').write(open(p).read())` truncates the file (sysmon register restored from git).

## 2026-10-30 : laptop setup checked
- Done: user ran make user-settings RULES=1 and /langmod fr; make doctor all set; sysmon RAM line and notify checked on screen.
- Decisions: README demo GIF recorded on the GPU workstation, so the sysmon GPU card shows.
- Done: notes, log and docs keep only this repository (no account skills); bash requirement and Windows route in docs/install.md; project-memory 0.2.1: the reminder names .claude/contexte.md instead of a skill outside the repo.
- Decisions: user/CLAUDE.md stays (global rules, linked from ~/.claude/CLAUDE.md, loaded in every project); it is what ties the notes to the user's own skill.

## 2026-10-30 (evening) : workstation checked, fresh-clone test
- Done: fresh clone from GitHub tested in an isolated CLAUDE_CONFIG_DIR (install, configure, reinstall, uninstall, teardown, user-settings, dist); workstation make user-settings RULES=1 and make doctor all set; sysmon NVIDIA checklist passed on the RTX 3070 Ti (driver 595.99.02), [to validate] removed for NVIDIA.
- Fixed: install.sh gave langmod a language option it lacks (grep matched its keyword); CLAUDE=echo dry run read state through echo and missed account mods; check.sh said "--fix" when npx was missing; docs/install.md (userConfig messages, teardown removes options, autoCompactEnabled, tested 2.1.314), README Develop needs Node.js.
- Measures: under load 100%, 7.3 / 8.0 GB VRAM, ~298 / 310 W, 72 °C, throttle bit 0x4 (power cap) on and off.
- Decisions: no GPU load script in the repository; any CUDA program serves step 3.
- Pitfalls: one ~7 GB cuMemAlloc fails on an 8 GB card (chunks work); an isolated config dir has no login, so mods loading in a session were checked only through the account copies.
