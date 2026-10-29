# mod-help

Two commands to see what you have:

```
/help-skills    every available skill, one line each: claude.ai account, Claude Code and plugins, this machine, project
/help-mods      the mods of claude-mods: what each does, enabled or not, its commands and options
```

Where skills come from:
- **claude.ai account**: synced to `~/.claude/skills/synced/…` on every machine where you are logged in.
- **Claude Code and installed plugins**: built-in skills and commands (the engine does not tell them apart, so both are listed; this repo's mods are in `/help-mods`).
- **This machine**: `~/.claude/skills/<name>/`, not synced. To have them on another machine, upload them to claude.ai or ship them in a plugin.
- **Project**: `<repo>/.claude/skills/<name>/`, travels with the repo.

Option (`/config`): `language` (`en`, `fr`, `ja`, `zh`, or `/langmod`) for the headings.

Disable: `claude plugin disable mod-help@claude-mods`. Spec: [docs/specs/05-mod-help.md](../../docs/specs/05-mod-help.md)
