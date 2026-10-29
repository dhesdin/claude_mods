# The mods: what each does, its commands, its options

One page for everything a user can see or set. Each mod is independent: install, configure or disable it alone. None makes a network request, and their display costs no tokens.

| Mod | In one line | Command |
| --- | --- | --- |
| [usage-pace](#usage-pace) | band above the prompt: 5-hour and weekly usage, time to reset, projected pace | `/usage-pace`: hide or show the band |
| [sysmon](#sysmon) | "Machine" panel: GPU, CPU, RAM, disk; a `machine_status` tool Claude can call | `/sysmon`: open or close the panel |
| [teacher-guard](#teacher-guard) | teacher mode: in the protected repo, Claude explains and reviews but cannot write | `/teacher-mode activate` / `deactivate` |
| [langmod](#langmod) | display language of every mod at once | `/langmod en\|fr\|ja\|zh` |
| [project-hours](#project-hours) | Claude Code time per project and per week, alert when a priority project goes quiet | `/hours`, `/hours 4`, `/hours panel` |

## Setting options

Options are **per machine**, even for mods that come from your claude.ai account. Three ways, same result:

- In Claude Code: `/config`, then the mod's section (or `/plugin configure <mod>`).
- From a terminal, in the repository: `scripts/configure.sh <mod>` shows them; `scripts/configure.sh <mod> key=value [key=value...]` sets some, the others keep their values. It finds the installed copy (`<mod>@claude-mods` or `<mod>@synced`) and refuses a key the mod does not have.
- At install time, the language only: `make install MOD_LANG=fr`.

A value set from the terminal applies when Claude Code restarts. Each mod's README (`plugins/<mod>/README.md`) has more detail: what it runs and reads on your machine, its limits.

## usage-pace

Three framed cards above the prompt: the 5-hour session window, the week, and the pace (where the weekly percentage will be at the reset if you keep the same rate). Figures come from Claude Code itself, never estimated. Needs a Claude subscription; without one the band stays hidden.

- `/usage-pace`: hides the band for this session, or shows it again.

| Option | Default | Effect |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` |
| `paceMinHours` | `3` | hours after the weekly reset before the pace card shows a projection |
| `refreshSeconds` | `60` | how often the countdowns are redrawn between replies; `0` = only after each reply |

## sysmon

A "Machine" panel: GPU (NVIDIA; Jetson and AMD not yet validated on real hardware), CPU, RAM, disks, with what is loading the GPU. Measures only while the panel is open. Claude can also call its `machine_status` tool for a one-sentence summary. A GPU machine needs its driver tool (`nvidia-smi`...): [hardware.md](hardware.md).

- `/sysmon`: opens or closes the panel. Opened by itself, it waits for a terminal at least 144 columns wide.

| Option | Default | Effect |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` |
| `gpuBackend` | `auto` | `auto`, `nvidia`, `jetson`, `amd`, `none` |
| `intervalSeconds` | `3` | measurement period while the panel is visible |
| `vramAlertPercent` | `90` | GPU memory use that turns the GPU card red |
| `tempAlertC` | `80` | GPU temperature that turns the GPU card red |
| `hideMissingGpu` | `false` | hide the GPU card when no supported GPU is found |
| `gpuIndex` | `0` | which GPU to follow on a multi-GPU machine |
| `openOnStart` | `true` | open the panel in every session |
| `diskPaths` | `/,/home` | disks to watch, comma-separated |
| `diskIntervalSeconds` | `60` | disk measurement period |
| `diskAlertGb` | `20` | free space under which the disk card turns red |

## teacher-guard

For repos where you write the code yourself (learning, portfolio). In a protected repo Claude cannot change files: it explains, gives hints and reviews. Per session and per repo; nothing is written in the repo. A guard against autopilot, not a security barrier ([its README](../plugins/teacher-guard/README.md#limits-a-guard-against-autopilot-not-a-security-barrier)).

- `/teacher-mode activate`: protects the current repo for this session.
- `/teacher-mode deactivate`: lifts it; only you, from the prompt, can do it.
- `/teacher-mode`: what is protected right now.

| Option | Default | Effect |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` |

## langmod

Sets the display language of every installed mod in one command. No options.

- `/langmod fr` (or `en`, `ja`, `zh`): switches every mod.
- `/langmod`: shows each mod's current language.

## project-hours

Time spent per project and per week, to see whether a priority project is being neglected. **It counts only the time of open Claude Code sessions**: the project is the Git repo of the session's folder, active time runs between your messages, Claude's tool calls and replies, and a pause longer than `idleMinutes` is not counted. Time in your editor without Claude is not seen.

- `/hours`: this week, per project. `/hours 4`: the last 4 weeks, one column per week (1 to 52).
- `/hours panel`: opens or closes the "Hours" panel, updated after each reply.

| Option | Default | Effect |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` |
| `idleMinutes` | `10` | a pause longer than this ends the active period |
| `aliases` | empty | display names, `;`-separated: `path prefix or repo name=name`. Example: `~/code/sip/edge=sip/edge; k4u-erp=ERP` |
| `priorityProjects` | empty | projects to watch, `;`-separated: `name=weeks`. Example: `sip/edge=3` shows an alert line after 3 weeks with no time on it |
| `toolingProjects` | `claude-mods` | projects marked `← tooling` (time on tools rather than on the substance), `;`-separated |
| `dataFolder` | empty | where the hours are stored; empty = `~/.claude/mod-data/project-hours`. See below |
| `openOnStart` | `false` | open the Hours panel in every session |

**Several machines (optional).** Each machine counts its own hours. To add them up (2 h on the laptop + 4 h on the workstation = 6 h everywhere), the files must reach every machine; the mod itself never uses the network. Use a sync tool you install yourself, for example [Syncthing](https://syncthing.net) (free, machine to machine, no account):

1. Install Syncthing on each machine and share one local folder between them, for example `~/Sync/project-hours`.
2. On each machine: `scripts/configure.sh project-hours dataFolder=~/Sync/project-hours` (or `/config`).
3. Optional: copy the old weeks across once, from `~/.claude/mod-data/project-hours/` into the shared folder.

Each session writes its own file, so two machines never write the same file. Machines exchange files when they are on at the same time; until then `/hours` shows what has arrived. A cloud folder (Nextcloud, Dropbox...) works too, but your data then goes through that service. The folder must be local: a network share (NFS, SMB) is refused by Claude Code.
