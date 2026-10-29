# Mod 04: project-hours

## Problem
Know how much real time goes to each project per week, to see without fooling oneself whether a priority project is being neglected (for example: 3 weeks without work on a priority part = re-evaluate the plan).

## Limit to state honestly
The mod only measures **active time in Claude Code**, not time spent in the editor without Claude. The label must say so ("Claude Code time"), never "work time".

## Measurement
- Project = Git root of the session folder (fallback: current folder).
- Active time = sum of the intervals between session events (prompts, tool calls, replies), cutting any interval longer than the idle threshold (default 10 min).
- Storage: one JSONL line per segment in `~/.claude/mod-data/project-hours/`, with machine, project, start, end. Local data per machine.

## Display
Collapsible pane:

```
Week 44 (Claude Code time)
vision-app      4h20   ██████████
web-shop        2h05   █████
claude-mods     1h10   ███   ← tooling
⚠ vision-app/edge: 0h for 3 weeks
```

- `/hours` command: current week. `/hours 4`: last 4 weeks, per project.
- Projects marked as "tooling" in config are flagged as such (time spent on tools rather than on the substance).

## Priority project alert
- Config: list of priority projects with a maximum number of weeks without activity.
- If exceeded: an alert line in color. No intrusive notification.

## Config
Idle threshold, aliases (path or repo name to display name), priority projects, "tooling" projects, start of week (Monday).

## Out of scope for v1
- Aggregating laptop + workstation (zero network). v2 option to discuss: manual export and merge.
- Charts, hour targets, export.
