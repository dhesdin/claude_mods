# mod-help

Two commands to see what you have:

```
/skill-help     every skill, global (claude.ai account + this machine) and project, one line each
/help-mods      the mods of claude-mods: what each does, enabled or not, its commands and options
```

Where skills come from:
- **claude.ai account**: synced to `~/.claude/skills/synced/…` on every machine where you are logged in.
- **This machine**: `~/.claude/skills/<name>/`, not synced. To have them on another machine, copy them or ship them in a plugin.
- **Project**: `<repo>/.claude/skills/<name>/`, travels with the repo.

Option (`/config`): `language` (`en`, `fr`, `ja`, `zh`, or `/langmod`) for the headings.

Disable: `claude plugin disable mod-help@claude-mods`. Spec: [docs/specs/05-mod-help.md](../../docs/specs/05-mod-help.md)
