# project-hours

Claude Code time per project and per week, so you can see whether a priority project is being neglected.

```
Week 44 (Claude Code time)
web-shop        4h20  ██████████
vision-app      2h05  █████
claude-mods     1h10  ███  ← tooling
⚠ vision-app/edge: 0h for 3 weeks
Active time in Claude Code only, not time spent in your editor without Claude.
```

- **Project** = the Git root of the session's folder (otherwise the folder itself), renamed by `aliases` when one matches.
- **Active time** = the time between session events (session start, prompts, tool calls, end of each reply), cut when a gap is longer than `idleMinutes`. It measures time in Claude Code only, never time in your editor without Claude.
- `/hours`: this week. `/hours 4`: the last 4 weeks, one column per week. `/hours pane`: opens or closes the "Hours" panel (or set `openOnStart`).
- Projects listed in `toolingProjects` are flagged `← tooling` (time on tools rather than on the substance).
- A project listed in `priorityProjects` with no time for more than its number of weeks gets a colored alert line. No notification.
- No data yet, no Git repo, unreadable files: the mod shows what it has ("No Claude Code time recorded yet." at worst) and the session goes on.

## What it does on your machine

Everything stays on the machine: the mod makes no network request, reads no credential, and sends nothing to the model.

| What | Why |
| --- | --- |
| Runs `git -C <session folder> rev-parse --show-toplevel` (once per folder) | the project's name |
| Reads `/etc/hostname` and `$HOME` | the machine name in the data file's name, the data folder |
| Writes `~/.claude/mod-data/project-hours/<year>-W<week>/<machine>-<session>.jsonl` | this session's segments: machine, project, start, end |
| Reads every `.jsonl` file under `~/.claude/mod-data/project-hours/` | the totals per project and per week |

Each session writes only its own file, after each reply and at the end of the session. Data is per machine: copying another machine's files into the folder adds them to the totals.

## Options (`/config`)

| Option | Default | Role |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` (or `/langmod`) |
| `idleMinutes` | 10 | a gap longer than this ends the active segment |
| `aliases` | empty | `path prefix or repo name=display name`, separated by `;`. Example: `~/code/sip/edge=sip/edge; k4u-erp=ERP` |
| `priorityProjects` | empty | `name=max weeks without activity`, separated by `;`. Example: `sip/edge=3` |
| `toolingProjects` | `claude-mods` | names flagged as tooling, separated by `;` |
| `openOnStart` | false | open the Hours panel in every session |

Weeks start on Monday (ISO weeks).

## Disable

`claude plugin disable project-hours@claude-mods`

Spec: [docs/specs/04-project-hours.md](../../docs/specs/04-project-hours.md)
