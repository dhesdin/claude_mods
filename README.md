# claude-mods

[![ci](https://github.com/dhesdin/claude_mods/actions/workflows/ci.yml/badge.svg)](https://github.com/dhesdin/claude_mods/actions/workflows/ci.yml)

A Claude Code marketplace of small, independent mods. Each mod is a plugin you can install, configure and disable on its own. No mod makes a network request, and the display costs no tokens.

| Mod | What it does | Docs |
| --- | --- | --- |
| [usage-pace](plugins/usage-pace) | Band above the prompt: 5-hour and weekly usage, time to reset, projected weekly pace | [spec](docs/specs/01-usage-pace.md) |
| [sysmon](plugins/sysmon) | "Machine" panel: GPU (NVIDIA; Jetson and AMD [to validate]), CPU, RAM, disk; `machine_status` tool for Claude | [spec](docs/specs/02-sysmon.md), [hardware](docs/hardware.md) |
| [teacher-guard](plugins/teacher-guard) | Teacher mode: in a repo holding a `.teacher-mode` file, Claude cannot write your code; it explains and reviews | [spec](docs/specs/03-teacher-guard.md) |
| [langmod](plugins/langmod) | `/langmod en\|fr\|ja\|zh`: display language of every mod at once | [architecture](docs/architecture.md#internationalization) |

Display languages available: **English (en), French (fr), Japanese (ja), Chinese (zh)**. Other languages can be added (see [Internationalization](docs/architecture.md#internationalization)).

## Requirements

- [Claude Code](https://code.claude.com/docs) 2.1.312 or later
- Linux (or WSL2) for `sysmon`; `usage-pace` and `langmod` run anywhere Claude Code runs
- `git`

## Install

```bash
git clone https://github.com/dhesdin/claude_mods.git ~/claude-mods
~/claude-mods/scripts/install.sh            # or: scripts/install.sh --lang fr
```

Then, in a Claude Code session that was already open: `/reload-plugins`.

The same steps by hand:

```bash
claude plugin marketplace add ~/claude-mods
claude plugin install usage-pace@claude-mods
claude plugin install sysmon@claude-mods
claude plugin install teacher-guard@claude-mods
claude plugin install langmod@claude-mods
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
claude plugin uninstall sysmon@claude-mods
claude plugin marketplace remove claude-mods
```

## Develop

```bash
scripts/check.sh                       # lint, format, validate, surface snapshots, tests, type-check
scripts/check.sh --fix                 # format and apply safe lint fixes
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
