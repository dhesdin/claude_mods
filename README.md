# claude-mods

[![ci](https://github.com/dhesdin/claude_mods/actions/workflows/ci.yml/badge.svg)](https://github.com/dhesdin/claude_mods/actions/workflows/ci.yml)

Small, independent mods for Claude Code. Each one is a plugin you install, configure and disable on its own. No mod makes a network request, and their display costs no tokens.

| Mod | What it does | Command | Docs |
| --- | --- | --- | --- |
| [usage-pace](plugins/usage-pace) | Band above the prompt: 5-hour and weekly usage, time to reset, projected weekly pace | `/usage-pace` hides or shows the band | [spec](docs/specs/01-usage-pace.md) |
| [sysmon](plugins/sysmon) | "Machine" panel: GPU (NVIDIA; Jetson and AMD [to validate]), CPU, RAM, disk; `machine_status` tool for Claude | `/sysmon` opens or closes the panel | [spec](docs/specs/02-sysmon.md), [hardware](docs/hardware.md) |
| [teacher-guard](plugins/teacher-guard) | Teacher mode: in the protected repo, Claude cannot write your code; it explains and reviews | `/teacher-mode activate` / `deactivate` | [spec](docs/specs/03-teacher-guard.md) |
| [langmod](plugins/langmod) | Display language of every mod at once | `/langmod en\|fr\|ja\|zh` | [architecture](docs/architecture.md#internationalization) |
| [notify](plugins/notify) | Desktop notification when Claude finishes a reply or waits for you, with the project's name | none | [spec](docs/specs/05-notify.md) |
| [project-memory](plugins/project-memory) | Your rules and the project's hand-off notes loaded at start and after each compaction, on every machine; reminder to update the notes before compaction | none | [spec](docs/specs/06-project-memory.md) |
| [project-hours](plugins/project-hours) | Claude Code time per project and per week (open sessions only), alert when a priority project goes quiet; optional sync between machines | `/hours`, `/hours 4`, `/hours panel` | [spec](docs/specs/04-project-hours.md) |

**Every option of every mod, and how to set it: [docs/mods.md](docs/mods.md).** In short: `/config` in Claude Code, or `scripts/configure.sh <mod> key=value` from the repository. Options are per machine.

Display languages: **English (en), French (fr), Japanese (ja), Chinese (zh)**; others can be added ([how](docs/architecture.md#internationalization)).

## How it works

- A mod is TypeScript code that Claude Code runs **on your machine**: the same code everywhere, each machine sees its own hardware and keeps its own data.
- It reaches a machine either **from your claude.ai account** (upload it once, every machine where you sign in downloads it) or **from this repository** (`make install` on that machine).
- Per machine either way: each mod's options (`/config`) and, for sysmon, the GPU driver.
- This repository is the source: code, tests, docs. It is needed to install by hand, to develop, or to build the zips you upload.

More: [docs/install.md](docs/install.md#how-it-works).

## Install: pick your path

### With an AI agent (Claude Code)

```bash
git clone https://github.com/dhesdin/claude_mods.git && cd claude_mods
claude        # then type: /install-mods
```

The agent checks the machine (system, Claude Code version, GPU and driver), asks which mods, which language, and whether to install on this machine or on your claude.ai account, then installs. It never runs `sudo`: for a missing driver it gives you the commands. It also asks, mod by mod, which options you want, then sets them. Its instructions: [.claude/skills/install-mods/SKILL.md](.claude/skills/install-mods/SKILL.md); other agents (Codex, Cursor, Copilot...): [AGENTS.md](AGENTS.md).

### By hand

```bash
git clone https://github.com/dhesdin/claude_mods.git && cd claude_mods
make doctor                      # what this machine has, what to fix
make user-settings               # once per machine: compaction at 300k tokens (settings no plugin can carry)
make install MOD_LANG=fr         # every mod on this machine (or: make install sysmon usage-pace)
scripts/configure.sh project-hours priorityProjects='sip/edge=3'   # any option, see docs/mods.md
```

Or, for every machine at once: `make dist`, then upload each `dist/plugins/<mod>.zip` on claude.ai (Customize > Plugins > Add > Upload plugin).

Step by step, with what you should see and troubleshooting: **[docs/install.md](docs/install.md)**. Preparing a GPU machine (NVIDIA, WSL2, Jetson, AMD, Raspberry Pi): **[docs/hardware.md](docs/hardware.md)**.

## Develop

```bash
make check                             # lint, format, validate, surface snapshots, tests, type-check
make fix                               # format and apply safe lint fixes
claude --plugin-dir ./plugins/sysmon   # run one plugin from disk, hot reload
```

| Doc | For |
| --- | --- |
| [docs/mods.md](docs/mods.md) | every mod: what it does, its commands, its options |
| [docs/architecture.md](docs/architecture.md) | layout, anatomy of a mod, conventions, i18n, distribution, adding a mod |
| [docs/development.md](docs/development.md) | dev loop, tests and their pitfalls, CI, definition of done |
| [docs/mods-api.md](docs/mods-api.md) | the parts of the mods API used here, verified |
| [docs/specs/](docs/specs) | one functional spec per mod |
| [CLAUDE.md](CLAUDE.md) | rules for an AI agent working on this repository |

## Security

[SECURITY.md](SECURITY.md): threat model, what each mod may touch, the checks CI enforces, how to report a problem.

## License

[MIT](LICENSE)
