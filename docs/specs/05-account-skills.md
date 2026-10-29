# 05: account skills

## Problem
Mods are installed per machine. Some help must be there on any machine as soon as the user logs in to Claude Code, before anything is installed: the list of skills, the list of mods (and how to get them), and the user's own working skills.

## Where they live
`skills/<name>/SKILL.md` (+ `scripts/`). `make skills` zips each folder into `dist/skills/<name>.zip`; the user uploads it once on claude.ai (Settings > Capabilities > Skills). claude.ai then syncs it, scripts included, to `~/.claude/skills/synced/<account>/<name>/` on every machine.

## help-skills
- Runs `scripts/list-skills.sh` and shows its output as is: skills found on disk, one line each (name, first sentence of the `description` front matter), in sections: claude.ai account, this machine (`~/.claude/skills`, not synced), project (`<git root>/.claude/skills`).
- Then adds the skills from Claude's own context (Claude Code built-in and plugins) not already printed.

## help-mods
- Runs `scripts/list-mods.py`: the claude-mods mods with their state (enabled, disabled, not installed) and description, from `claude plugin list` (text) and `claude plugin list --available --json`, descriptions of installed mods from their `plugin.json`.
- When the claude-mods marketplace is not set up on the machine: prints the clone + `make install` command.

## passation-projet, travail-econome
The user's own skills, moved from `~/.claude/skills/` into the repo unchanged (original French) so they reach every machine through the account.

## Rules
- Scripts read only, strip control characters, need nothing but bash/awk (help-skills) or python3 (help-mods).
- Token cost: the skill text and the script's output, when the skill is used. No cost otherwise.
- `scripts/check.sh` checks each front matter (name = folder, a description), compiles Python scripts, runs shell scripts.
