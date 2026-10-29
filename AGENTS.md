# Instructions for AI agents

This repository holds Claude Code mods (plugins). Two kinds of task:

- **Install the mods for the person** (on this machine or on their claude.ai account): follow [.claude/skills/install-mods/SKILL.md](.claude/skills/install-mods/SKILL.md) step by step. It starts with `scripts/doctor.sh`. Never run `sudo`, install a driver or change system settings: give the commands. The human version of the same steps is [docs/install.md](docs/install.md).
- **Change the code** (fix, add a mod): read [CLAUDE.md](CLAUDE.md) first, then [docs/development.md](docs/development.md). Every change ends with `scripts/check.sh` passing.
