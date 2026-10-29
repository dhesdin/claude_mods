# claude-mods

[![ci](https://github.com/dhesdin/claude_mods/actions/workflows/ci.yml/badge.svg)](https://github.com/dhesdin/claude_mods/actions/workflows/ci.yml)

A Claude Code marketplace of small, independent mods. Each mod is a plugin you can install, configure and disable on its own. No mod makes a network request, and the display costs no tokens.

| Mod | What it does | Docs |
| --- | --- | --- |
| [usage-pace](plugins/usage-pace) | Band above the prompt: 5-hour and weekly usage, time to reset, projected weekly pace | [spec](docs/specs/01-usage-pace.md) |
| [sysmon](plugins/sysmon) | "Machine" panel: GPU (NVIDIA; Jetson and AMD [to validate]), CPU, RAM, disk; `machine_status` tool for Claude | [spec](docs/specs/02-sysmon.md), [hardware](docs/hardware.md) |
| [teacher-guard](plugins/teacher-guard) | `/teacher-mode activate`: for the current repo and session, Claude cannot write your code; it explains and reviews | [spec](docs/specs/03-teacher-guard.md) |
| [mod-help](plugins/mod-help) | `/help-skills` (every available skill: account, Claude Code and plugins, machine, project; one line each) and `/help-mods` (the mods, their commands and options) | [spec](docs/specs/05-mod-help.md) |
| [langmod](plugins/langmod) | `/langmod en\|fr\|ja\|zh`: display language of every mod at once | [architecture](docs/architecture.md#internationalization) |

Display languages available: **English (en), French (fr), Japanese (ja), Chinese (zh)**. Other languages can be added (see [Internationalization](docs/architecture.md#internationalization)).

## Requirements

- [Claude Code](https://code.claude.com/docs) 2.1.312 or later
- Linux (or WSL2) for `sysmon`; `usage-pace` and `langmod` run anywhere Claude Code runs
- `git`, `make` (or run `scripts/install.sh` directly)

## Install

```bash
git clone https://github.com/dhesdin/claude_mods.git ~/claude-mods
cd ~/claude-mods
make install                          # every mod
make install <mod> [<mod>...]         # the mods you name, e.g. make install sysmon
make <mod> [<mod>...]                 # the same, shorter
make install MOD_LANG=fr              # with a display language (en, fr, ja, zh)
```

Then, in a Claude Code session that was already open: `/reload-plugins`.

| Command | Does |
| --- | --- |
| `make help` | every target and variable |
| `make list` | each mod, its description, installed or not |
| `make setup` | only add this folder as a marketplace |
| `make uninstall <mod> [<mod>...]` | uninstall the mods you name (all without names) |
| `make teardown` | uninstall every mod and remove the marketplace |

Variables, from the command line, the environment, or a per-machine `config.mk` (git-ignored, copy `config.mk.example`): `MOD_LANG` (en, fr, ja, zh), `MOD_SCOPE` (user, project, local; default user), `CLAUDE` (the binary; `CLAUDE=echo` prints the commands instead of running them).

Without `make`: `scripts/install.sh [--lang fr] [--scope user] [mod...]`, or by hand:

```bash
claude plugin marketplace add ~/claude-mods
claude plugin install sysmon@claude-mods      # one line per mod
```

Preparing a GPU machine (NVIDIA driver, WSL2, Jetson, AMD): [docs/hardware.md](docs/hardware.md).

## Update

The marketplace is a local folder: plugins are read from it directly.

```bash
git -C ~/claude-mods pull --ff-only
```

Then `/reload-plugins` in an open session. Read what changed (`git -C ~/claude-mods log -p ORIG_HEAD..`) before reloading: a mod runs code on your machine (see [SECURITY.md](SECURITY.md)).

## Configure

- Every option of every mod is in `/config` (each mod's section), with its default. Options are listed in each mod's README.
- Language: pick it in `/config` (`language` row of each mod), or `/langmod fr` for all mods at once.

## Disable or remove

```bash
claude plugin disable sysmon@claude-mods     # enable again: claude plugin enable sysmon@claude-mods
make uninstall sysmon                        # or: claude plugin uninstall sysmon@claude-mods
make teardown                                # every mod and the marketplace
```

In a session, `/help-mods` lists the mods with their commands and options, and `/help-skills` lists every skill.

## What follows you from one machine to another

| What | Where it lives | On a new machine |
| --- | --- | --- |
| Skills of your claude.ai account | your account (synced to `~/.claude/skills/synced/`) | there as soon as you log in |
| Claude Code's built-in skills and commands | Claude Code itself | there once Claude Code is installed |
| **These mods** | plugins installed on each machine (`~/.claude/plugins`) | **not synced**: clone this repo and `make install` |
| Your machine skills | `~/.claude/skills/<name>/` | **not synced**: stay on the machine; to carry them, upload them to claude.ai or ship them in a plugin of this repo |
| Your global instructions | `~/.claude/CLAUDE.md` | **not synced**: copy it |
| Project skills and instructions | `<repo>/.claude/skills/`, `<repo>/CLAUDE.md` | travel with the repo when committed: there after `git clone` |

## Develop

```bash
make check                             # lint, format, validate, surface snapshots, tests, type-check
make fix                               # format and apply safe lint fixes
claude --plugin-dir ./plugins/sysmon   # run one plugin from disk, hot reload
```

- [docs/architecture.md](docs/architecture.md): layout, anatomy of a mod, conventions, i18n
- [docs/development.md](docs/development.md): dev loop, tests, CI, definition of done
- [docs/mods-api.md](docs/mods-api.md): the parts of the mods API used here, verified
- [docs/specs/](docs/specs): one functional spec per mod

## Security

See [SECURITY.md](SECURITY.md): threat model, what each mod may touch, and how to report a problem.

## License

[MIT](LICENSE)
