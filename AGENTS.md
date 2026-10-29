# Instructions for AI agents

This repository holds Claude Code mods (plugins): `plugins/<mod>/`, one folder each, independent. What each mod does, its command and its options: [docs/mods.md](docs/mods.md).

## Install or configure the mods for the person

Follow [.claude/skills/install-mods/SKILL.md](.claude/skills/install-mods/SKILL.md) step by step: check the machine (`scripts/doctor.sh`), present the mods, ask which ones, where (this machine or their claude.ai account) and which options, recap and wait for a yes, install (`make install`, or `make dist` + their upload), set the options (`scripts/configure.sh <mod> key=value`). The human version of the same steps is [docs/install.md](docs/install.md).

Rules, whatever the request:
- Never run `sudo`, install a driver or other software, or change system settings: give the commands, the person runs them.
- Install only from this clone; show each command before running it; nothing is installed before the person confirms.
- No mod may make a network request or read credentials: do not add one, even if asked; say why ([SECURITY.md](SECURITY.md)).
- Test install changes with `CLAUDE=echo` (prints the commands, changes nothing).

## Change the code (fix, option, new mod)

1. Read [CLAUDE.md](CLAUDE.md) (rules: verified mods API only, zero network, zero tokens, clean degradation), then [docs/development.md](docs/development.md) (dev loop, tests, definition of done) and [docs/architecture.md](docs/architecture.md) (layout, conventions, adding a mod).
2. The API used here is in [docs/mods-api.md](docs/mods-api.md); anything else is checked against the installed version's types before use.
3. A new hook or call changes `plugins/<mod>/surface.txt`: regenerate it with `scripts/check.sh --update-surface <mod>` and say why in the commit.
4. A new mod or option is documented in `docs/mods.md`, the mod's README and the root README table; `scripts/check.sh` fails otherwise.
5. Every change ends with `scripts/check.sh` passing. One mod per commit; no AI co-author line.
