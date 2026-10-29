# Mod 04: project-hours

## Problem
Know how much real time goes to each project per week, to see without fooling oneself whether a priority project is being neglected (for example: 3 weeks without work on a priority part = re-evaluate the plan).

## Limit to state honestly
The mod only measures **active time in Claude Code**, not time spent in the editor without Claude. The label must say so ("Claude Code time"), never "work time".

## Measurement
- Project = Git root of the session folder (fallback: current folder).
- Active time = sum of the intervals between session events (prompts, tool calls, replies), cutting any interval longer than the idle threshold (default 10 min).
- Storage: one JSONL line per segment, one file per session and week (`<week>/<machine>-<session>.jsonl`), in `~/.claude/mod-data/project-hours/` or the folder of the `dataFolder` option. Only the week folders a view needs are read.

## Display
Collapsible pane:

```
Week 44 (Claude Code time)
vision-app      4h20   ██████████
web-shop        2h05   █████
claude-mods     1h10   ███   ← tooling
⚠ vision-app/edge: 0h for 3 weeks
```

- `/hours` command: current week. `/hours 4`: last 4 weeks, per project. `/hours panel` (or `pane`): opens or closes the pane.
- Projects marked as "tooling" in config are flagged as such (time spent on tools rather than on the substance).

## Priority project alert
- Config: list of priority projects with a maximum number of weeks without activity.
- If exceeded (no time on it during the last N weeks, rolling): an alert line in color. No intrusive notification.

## Config
Idle threshold, aliases (path or repo name to display name), priority projects, "tooling" projects, data folder. Weeks start on Monday (ISO), not configurable.

## Out of scope for v1
- Network aggregation of laptop + workstation (zero network). Decided on 2026-10-29 instead: the `dataFolder` option, pointed on each machine at a local folder that a sync tool the user installs (Syncthing...) shares; one file per session means no write conflicts. Manual copy of the week folders also works.
- Charts, hour targets, export.
