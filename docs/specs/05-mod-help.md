# Mod 05: mod-help

## Problem
Skills come from several places (the claude.ai account, the machine, the project) and mods add commands and options: there is no single place listing them with what they do.

## Commands
- `/skill-help`: every skill, in two sections.
  - **Global**: the claude.ai account's skills (synced under `~/.claude/skills/synced/<account>/`, present on every machine where the account is logged in) and this machine's own (`~/.claude/skills/<name>/`, not synced: copy them, or ship them in a plugin, to have them elsewhere).
  - **Project**: `<project root>/.claude/skills/<name>/`.
  - One line per skill: its name and the first sentence of its `description` front matter.
- `/help-mods`: each mod of the claude-mods marketplace: description, enabled or not, its commands, its options with their current values.

## Data
- Skills: `SKILL.md` front matter (`name`, `description`, single-line, quoted or `>` / `|` block), read with `$.fs.list` / `$.fs.read`; `$.env.get('HOME')`, `$.session.root()`.
- Mods: the marketplace file next to the mod (`<plugin root>/../../.claude-plugin/marketplace.json`) and each `./plugins/<name>/.claude-plugin/plugin.json`; status, commands and options from `$.command.list()` and `$.config.list()`.

## Rules
- Zero network, zero tokens: the answer is a command's text, never sent to the model.
- Only plugin folders named `./plugins/<name>` in the marketplace are read; control characters are stripped from printed text.
- Headings translated (`language`); descriptions shown as their authors wrote them.

## Out of scope
Plugin-provided skills of other marketplaces, editing or installing skills.
