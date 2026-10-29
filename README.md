# claude-mods

[![ci](https://github.com/dhesdin/claude_mods/actions/workflows/ci.yml/badge.svg)](https://github.com/dhesdin/claude_mods/actions/workflows/ci.yml)

Small, independent mods for Claude Code. Each one is a plugin you install, configure and disable on its own. No mod makes a network request, and their display costs no tokens.

| Mod | What it does | Docs |
| --- | --- | --- |
| [usage-pace](plugins/usage-pace) | Band above the prompt: 5-hour and weekly usage, time to reset, projected weekly pace | [spec](docs/specs/01-usage-pace.md) |
| [sysmon](plugins/sysmon) | "Machine" panel: GPU (NVIDIA; Jetson and AMD [to validate]), CPU, RAM, disk; `machine_status` tool for Claude | [spec](docs/specs/02-sysmon.md), [hardware](docs/hardware.md) |
| [teacher-guard](plugins/teacher-guard) | `/teacher-mode activate`: for the current repo and session, Claude cannot write your code; it explains and reviews | [spec](docs/specs/03-teacher-guard.md) |
| [langmod](plugins/langmod) | `/langmod en\|fr\|ja\|zh`: display language of every mod at once | [architecture](docs/architecture.md#internationalization) |

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

The agent checks the machine (system, Claude Code version, GPU and driver), asks which mods, which language, and whether to install on this machine or on your claude.ai account, then installs. It never runs `sudo`: for a missing driver it gives you the commands. Its instructions: [.claude/skills/install-mods/SKILL.md](.claude/skills/install-mods/SKILL.md); other agents: [AGENTS.md](AGENTS.md).

### By hand

```bash
git clone https://github.com/dhesdin/claude_mods.git && cd claude_mods
make doctor                      # what this machine has, what to fix
make install MOD_LANG=fr         # every mod on this machine (or: make install sysmon usage-pace)
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
| [docs/architecture.md](docs/architecture.md) | layout, anatomy of a mod, conventions, i18n, distribution, adding a mod |
| [docs/development.md](docs/development.md) | dev loop, tests and their pitfalls, CI, definition of done |
| [docs/mods-api.md](docs/mods-api.md) | the parts of the mods API used here, verified |
| [docs/specs/](docs/specs) | one functional spec per mod |
| [CLAUDE.md](CLAUDE.md) | rules for an AI agent working on this repository |

## Security

[SECURITY.md](SECURITY.md): threat model, what each mod may touch, the checks CI enforces, how to report a problem.

## License

[MIT](LICENSE)
