# usage-pace

Band above the prompt with three framed cards:

```
╭─────────────────────────────────────╮ ╭──────────────────────────────────────╮ ╭───────────────────────────────────────╮
│ 5h session ████████░░░░ 64%          │ │ Week ██████░░░░░░ 48%                 │ │ Pace At this pace, ~90% at reset       │
│ Resets in: 01h42 (at 13:42)          │ │ Resets in: 3d 06h (Sunday at 18:00)   │ │ limit not reached this week            │
╰─────────────────────────────────────╯ ╰──────────────────────────────────────╯ ╰───────────────────────────────────────╯
```

- Figures come from Claude Code's own `session.measure` event (`five_hour` and `seven_day` windows): usage is never estimated.
- Bar and % color: white < 50%, yellow 50-75%, orange 75-90%, red ≥ 90%.
- **Pace**: linear projection of the weekly % at the average rate since the last reset: "~X% at reset" (colored by X), or "limit reached <day> around <hour>" in red with the margin before the reset.
- No subscription or no measurement yet: band hidden; one window missing: `n/a`.

## What it does on your machine

It reads the usage figures Claude Code already has (`session.measure`, `$.session.usage()`) and draws them. It runs no program, reads no file or credential, makes no network request, and sends nothing to the model.

## Options (`/config`)

| Option | Default | Role |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` (or `/langmod`) |
| `paceMinHours` | 3 | hours since the weekly reset before a projection is shown |
| `refreshSeconds` | 60 | countdown redraw between turns (0 = only after each turn) |

## Disable

`claude plugin disable usage-pace@claude-mods`

Spec: [docs/specs/01-usage-pace.md](../../docs/specs/01-usage-pace.md)
