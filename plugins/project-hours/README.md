# project-hours

Time spent per project and per week, to see whether a priority project is being neglected.

```
Week 44 (Claude Code time)
web-shop        4h20  ██████████
vision-app      2h05  █████
claude-mods     1h10  ███  ← tooling
⚠ vision-app/edge: 0h for 3 weeks
Active time in Claude Code only, not time spent in your editor without Claude.
```

**It counts only the time of open Claude Code sessions.** Time in your editor without Claude is not seen.

- **Project** = the Git root of the session's folder (otherwise the folder itself), renamed by `aliases` when one matches.
- **Active time** = the time between session events (session start, your messages, Claude's tool calls, the end of each reply); a pause longer than `idleMinutes` is not counted.
- Projects listed in `toolingProjects` are flagged `← tooling` (time on tools rather than on the substance).
- A project listed in `priorityProjects` with no time during its last N weeks gets a colored alert line. No notification.
- No data yet, no Git repo, unreadable files: the mod shows what it has ("No Claude Code time recorded yet." at worst) and the session goes on.

## Commands

```
/hours           this week, per project
/hours 4         the last 4 weeks, one column per week (1 to 52)
/hours panel     open or close the Hours panel, updated after each reply (pane works too)
```

## Several machines (optional)

Each machine counts its own hours. To add them up (2 h on the laptop + 4 h on the workstation = 6 h on both), the files must reach every machine. The mod never uses the network: a sync tool you install yourself carries the files, for example [Syncthing](https://syncthing.net) (free, machine to machine, no account).

1. Install Syncthing on each machine and share one local folder between them, for example `~/Sync/project-hours`.
2. On each machine, set `dataFolder` to that folder: `scripts/configure.sh project-hours dataFolder=~/Sync/project-hours` from the repository, or `/config`.
3. Optional: copy the old weeks once, from `~/.claude/mod-data/project-hours/` into the shared folder.

Each session writes its own file, so two machines never write the same one. Machines exchange files when they are on at the same time; until then `/hours` shows what has arrived, nothing is lost. A cloud folder (Nextcloud, Dropbox...) works too, but your data then goes through that service. The folder must be on a local disk: Claude Code refuses network shares (NFS, SMB).

## What it does on your machine

Everything stays on the machine: the mod makes no network request, reads no credential, and sends nothing to the model.

| What | Why |
| --- | --- |
| Runs `git -C <session folder> rev-parse --show-toplevel` (once per folder) | the project's name |
| Reads `/etc/hostname` and `$HOME` | the machine name in the data file's name, the data folder |
| Writes `<data folder>/<year>-W<week>/<machine>-<session>.jsonl` | this session's segments: machine, project, start, end |
| Reads the `.jsonl` files of the weeks it shows | the totals per project and per week |

Each session writes only its own file, after each reply and at the end of the session. Only the week folders needed are read (the current week, the alert window, or the weeks `/hours N` asks for), so the cost does not grow with the history. A session is 1 to 3 KB; 2,000 sessions are a few MB.

## Options (`/config`, or `scripts/configure.sh project-hours key=value`)

| Option | Default | Role |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` (or `/langmod`) |
| `idleMinutes` | 10 | a pause longer than this ends the active period |
| `aliases` | empty | `path prefix or repo name=display name`, separated by `;`. Example: `~/code/sip/edge=sip/edge; k4u-erp=ERP` |
| `priorityProjects` | empty | `name=weeks`, separated by `;`. Example: `sip/edge=3` alerts after 3 weeks without time on it |
| `toolingProjects` | `claude-mods` | names flagged as tooling, separated by `;` |
| `dataFolder` | empty | where the hours are stored (absolute or `~/...`); empty = `~/.claude/mod-data/project-hours` |
| `openOnStart` | false | open the Hours panel in every session |

Weeks start on Monday (ISO weeks).

## Disable

`claude plugin disable project-hours@claude-mods` (or `@synced` when it comes from your claude.ai account).

Spec: [docs/specs/04-project-hours.md](../../docs/specs/04-project-hours.md)
