# Current context — claude-mods

Updated: 2026-10-29 17:30

## Current goal
Repo restructured to "senior" standards (English everywhere, docs/, scripts/, CI, security audit). Next: mod 3 `teacher-guard` (docs/specs/03-teacher-guard.md), after the user has read the report.

## Done
- Plugins: usage-pace 0.2.0, sysmon 0.2.0, langmod 0.1.0 (new: `/langmod en|fr|ja|zh` sets `<plugin>.language` rows via $.config.set). Display i18n en/fr/ja/zh in `hooks/i18n.ts` of each mod; `language` userConfig picker (default en).
- sysmon: GPU sources in hooks/gpu.ts (NVIDIA nvidia-smi, Jetson tegrastats [to validate], AMD rocm-smi [to validate]), `gpuBackend` auto detection; system.ts (/proc, df); util.ts `clean()` for untrusted text; throttling written out ("thermal (GPU too hot)" red, "power limit (max power draw reached)" orange).
- Repo: docs/{architecture,development,mods-api,hardware}.md, docs/specs/ (moved from specs/), README, per-plugin README, SECURITY.md, LICENSE (MIT), scripts/check.sh (validate + surface.txt snapshot + zero-network + tests + tsc), scripts/install.sh (--lang), .github CI (SHA-pinned actions, read-only) + Dependabot.
- Security audit: secret scan clean, history clean, names JSON-quoted in machine_status, no shell, option coercion. Details in SECURITY.md.
- Checks: 13 tests pass, all surfaces match, tsc ok where engine types are laid.

## Decisions
- UI language per mod (userConfig `language`), model-facing text stays English.
- Two nvidia-smi calls per cycle (GPU + processes), accepted by the user.
- Surface snapshots (`surface.txt`) are the review gate for new capabilities.
- CI cannot type-check (engine types only exist after a session loads a plugin): local `scripts/check.sh` does.
- Commits: no Claude co-author line (user request); remote SSH git@github.com:dhesdin/claude_mods.git.

## Known pitfalls
- `$` can never be passed or stored: sysmon builds an `Host`/`Io` object of closures in session.start.
- Tests: stubs before the first `$` call; `clock.every` → `{ value: undefined }`; `$.tool.call` on an MCP tool name needs a narrowed cast (TS2589 with engine types).
- Contract `types/index.d.ts` must have no import.

## Next action
Mod 3 teacher-guard: read docs/specs/03-teacher-guard.md, check `tool.call` matchers for Write/Edit/NotebookEdit/Bash and `prompt.compose` in the types, then code.

## Missing info
- GPU checks on the workstation (docs/hardware.md checklists); Jetson/AMD on real hardware.
- On-screen check of /langmod and of the ja/zh display.
