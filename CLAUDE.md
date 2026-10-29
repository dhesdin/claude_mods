# claude-mods: a marketplace of Claude Code mods

> Asked to **install** the mods for someone? Follow `.claude/skills/install-mods/SKILL.md` (or `/install-mods`); the rest of this file is for **working on the code**.

Git repository used as a Claude Code marketplace. Installed on two machines:
- **laptop**: Linux Mint, no NVIDIA GPU
- **workstation**: NVIDIA GPU machine (OS to confirm, Linux assumed)

Each mod is an independent plugin, enabled and disabled on its own. Everything in the repo (code, comments, docs, specs, commit messages) is in English; only the mods' display text is translated (docs/architecture.md, Internationalization).

## Rule 1: never invent the mods API

Mods were released on 1 October 2026. Training knowledge may not cover them, or may be wrong.
Before writing any line:
1. Read `docs/mods-api.md` (the verified subset used here). For anything else, read the official docs (https://code.claude.com/docs/en/plugins/mods/overview, then the `create`, `api`, `interface` pages and the plugins/marketplaces page).
2. Check every call against the type definitions of the installed version (`claude --version`).
3. If a capability a spec describes does not exist in the API, **stop and say so**. Do not work around it, do not simulate it.

A hook has no direct system access. Reading a file, starting a process, drawing, adding a command: everything goes through the mods `$` API. No `require('os')`, no direct `fs`.

## Where things are

- `.claude/contexte.md`: current state, injected at session start (do not re-read it).
- `docs/mods.md`: every mod, its command and its options (the catalog users and `/install-mods` read).
- `docs/install.md`: the install guide for humans (the same steps as `/install-mods`).
- `scripts/configure.sh <mod> key=value`: set options of an installed mod (repo or account copy).
- `scripts/user-settings.sh` (`make user-settings [RULES=1]`): per-machine setup no plugin can carry: compaction window, the SessionStart hook `user/hooks/load-context.sh`, and with RULES=1 `~/.claude/CLAUDE.md` linked to `user/CLAUDE.md` (the owner's global rules).
- `docs/architecture.md`: layout, anatomy of a mod, conventions, i18n, adding a mod.
- `docs/development.md`: dev loop, `scripts/check.sh`, tests and their pitfalls, CI, definition of done.
- `docs/mods-api.md`: verified API. **Read before coding a mod**, instead of exploring the types again.
- `docs/hardware.md`: machine setup per hardware and validation checklists (GPU checks still to run on the workstation, Jetson and AMD marked [to validate]).
- `docs/specs/`: one functional spec per mod.
- `SECURITY.md`: threat model and the controls the repo relies on.
- `suivi.md`: dated session log.

## Mod status

| Mod | Coded | Checked on screen | Committed |
| --- | --- | --- | --- |
| usage-pace | yes | yes | yes |
| sysmon | yes | laptop yes; GPU [to validate] | yes |
| langmod | yes | yes (laptop) | yes |
| teacher-guard | yes (v0.2: /teacher-mode command) | yes | yes |
| project-hours | yes | yes | yes |
| notify | yes | yes (laptop) | yes |
| project-memory | yes | yes (reminder seen) | yes |

## Build order

One mod at a time, in this order. The next one starts only once the user has checked the previous one on screen.

1. `usage-pace` (docs/specs/01-usage-pace.md)
2. `sysmon` (docs/specs/02-sysmon.md)
3. `teacher-guard` (docs/specs/03-teacher-guard.md)
4. `project-hours` (docs/specs/04-project-hours.md)

Added on request along the way: `langmod` (display language), `notify` (05) and `project-memory` (06).

## Constraints common to every mod

- **Zero network.** No mod makes a network request. Data stays on the machine.
- **Zero tokens.** The display sends nothing to the model, unless a spec explicitly asks for it (sysmon's tool, project-memory's reminder).
- **Clean degradation.** When data is unavailable (no GPU, missing file, failing API), show "n/a" or hide the card. Never crash the session.
- **Minimal cost.** No polling while a panel is hidden. Configurable intervals, sensible defaults.
- **Config**: the plugin's `userConfig` (one manifest per mod), paths and thresholds in it, never hard-coded.
- **Persistent data** in `~/.claude/mod-data/<mod-name>/`.
- **Untrusted text** from other programs is cleaned before display or before reaching the model (SECURITY.md).
- Strict TypeScript. Short readable code: the user must be able to review it.

## Definition of done for each mod

- [ ] `scripts/check.sh` passes (lint, format, shellcheck, invisible characters, validate, surface snapshot, tests, type-check); `scripts/check.sh --fix` formats
- [ ] The `hooks:` and `calls:` lines in `plugins/<mod>/surface.txt` match what the spec allows, nothing more
- [ ] Tested loaded from disk with hot reload
- [ ] Degraded cases tested (missing data, errors)
- [ ] `plugins/<mod>/README.md` written and the root README table updated: what it does, its config, how to disable it
- [ ] Clean commit, one mod per commit or small series; no Claude co-author line

## Installing on another machine

Whoever clones the repo can run `/install-mods` (project skill `.claude/skills/install-mods/`), which runs `make doctor` and installs what they choose. The README explains it in copyable commands: on the claude.ai account (`make dist`, upload each zip: synced to every machine), or per machine: clone, `make install [mod...]` (variables `MOD_LANG`, `MOD_SCOPE`, `CLAUDE`, or a git-ignored `config.mk`), then `/reload-plugins` in an open session. Test install changes with `CLAUDE=echo` (prints the commands, changes nothing).
