# Current context — claude-mods

Updated: 2026-10-30 00:15

## Current goal
teacher-guard v0.2 (/teacher-mode), the modular Makefile and account distribution are done and pushed; mods and skills are on the claude.ai account and synced. Next: mod 4 `project-hours` (docs/specs/04-project-hours.md).

## Done
- Docs for both audiences: README = how it works + three paths (agent /install-mods, by hand docs/install.md, develop); docs/install.md (requirements, doctor, account vs machine, steps, what to see, update, remove, troubleshooting); AGENTS.md for any agent; check.sh verifies relative doc links.
- Onboarding for anyone who clones: scripts/doctor.sh (make doctor: system, Claude Code version, GPU + driver, sysmon backend, mods and their origin installed/account, next steps), project skill .claude/skills/install-mods (/install-mods: doctor, choose mods + language + this machine or claude.ai account, install; never sudo), machine table at the top of docs/hardware.md. make install skips mods already synced from the account.
- teacher-guard 0.2.0: /teacher-mode activate|deactivate (repo = git root of the session cwd, per session in $.state; deactivate only from the prompt); hooks/bash.ts path-aware Bash analysis; fail-closed tool guards; status line; prompt.compose instruction. 8 tests.
- Distribution: the 4 mods are uploaded to the user's claude.ai account (make dist, Customize > Plugins > Upload) and load as <mod>@synced on every machine (verified). The user's skills help-skills, help-mods, passation-projet, travail-econome are uploaded to the account (Customize > Skills), synced to ~/.claude/skills/synced (verified), and are no longer in this repo.
- Makefile + scripts/install.sh: make install [mods], make <mod>..., install-<mod>, uninstall, teardown, list, setup, check, fix; MOD_LANG / MOD_SCOPE / CLAUDE from CLI, env or git-ignored config.mk. CLAUDE=echo for a dry run.
- Plugins: usage-pace 0.2.0, sysmon 0.2.0, langmod 0.1.0 (new: `/langmod en|fr|ja|zh` sets `<plugin>.language` rows via $.config.set). Display i18n en/fr/ja/zh in `hooks/i18n.ts` of each mod; `language` userConfig picker (default en).
- sysmon: GPU sources in hooks/gpu.ts (NVIDIA nvidia-smi, Jetson tegrastats [to validate], AMD rocm-smi [to validate]), `gpuBackend` auto detection; system.ts (/proc, df); util.ts `clean()` for untrusted text; throttling written out ("thermal (GPU too hot)" red, "power limit (max power draw reached)" orange).
- Repo: docs/{architecture,development,mods-api,hardware}.md, docs/specs/ (moved from specs/), README, per-plugin README, SECURITY.md, LICENSE (MIT), scripts/check.sh (validate + surface.txt snapshot + zero-network + tests + tsc), scripts/install.sh (--lang), .github CI (SHA-pinned actions, read-only) + Dependabot.
- Security audit: secret scan clean, history clean, names JSON-quoted in machine_status, no shell, option coercion. Details in SECURITY.md.
- Lint/format: Biome 2.5.15 (biome.json), shellcheck in CI, invisible-character (Trojan Source) guard; `scripts/check.sh --fix` formats.
- Checks: 13 tests pass, all surfaces match, tsc ok where engine types are laid.

## Decisions
- teacher-guard: only writes INTO a protected repo are refused; temp folders free; activation by command per session (marker file dropped at the user's request).
- UI language per mod (userConfig `language`), model-facing text stays English.
- Two nvidia-smi calls per cycle (GPU + processes), accepted by the user.
- Surface snapshots (`surface.txt`) are the review gate for new capabilities.
- CI cannot type-check (engine types only exist after a session loads a plugin): local `scripts/check.sh` does.
- Commits: no Claude co-author line (user request); remote SSH git@github.com:dhesdin/claude_mods.git.

## Known pitfalls
- Never smoke-test install targets without CLAUDE=echo: a test once installed every mod in the user's config (undone with teardown).
- Biome collapses double spaces in JSX text: padded labels live in string constants (LABEL_GPU…).
- The Write tool turned `\u202e`-style escapes into literal characters once: the invisible-character guard now catches it.
- shellcheck via npx was refused by auto mode: it runs in CI only.
- `$` can never be passed or stored: sysmon builds an `Host`/`Io` object of closures in session.start.
- Tests: stubs before the first `$` call; `clock.every` → `{ value: undefined }`; `$.tool.call` on an MCP tool name needs a narrowed cast (TS2589 with engine types).
- Contract `types/index.d.ts` must have no import.

## Next action
After the user checks teacher-guard on screen: mod 4 project-hours (read the spec, check session events for active time and $.fs.write/$.store for JSONL storage).

## Missing info
- GPU checks on the workstation (docs/hardware.md checklists); Jetson/AMD on real hardware.
- On-screen check of /langmod and of the ja/zh display.
