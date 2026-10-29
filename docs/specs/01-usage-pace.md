# Mod 01: usage-pace

## Problem
The user keeps opening the settings to check their usage. They want it always visible, with an indication of pace.

## Display
A band above the prompt (`ui.render` on `AbovePrompt`): three separate framed cards, side by side, wrapping on a narrow terminal.

```
╭─────────────────────────────────────╮ ╭──────────────────────────────────────╮ ╭───────────────────────────────────────╮
│ 5h session ████████░░░░ 64%          │ │ Week ██████░░░░░░ 48%                 │ │ Pace At this pace, ~90% at reset       │
│ Resets in: 01h42 (at 13:42)          │ │ Resets in: 3d 06h (Sunday at 18:00)   │ │ limit not reached this week            │
╰─────────────────────────────────────╯ ╰──────────────────────────────────────╯ ╰───────────────────────────────────────╯
```

- **5h session** and **Week** cards: a 12-character bar and the percentage, always shown, then "Resets in: <duration> (<moment>)".
  - Duration: `00h42`, `01h42`, `3d 06h`.
  - Moment, local time: `at 13:42` (today), `tomorrow at 13:42`, `Sunday at 18:00`.
- Color of the filled part of the bar and of the %: white (theme text color) < 50%, yellow 50-75%, orange 75-90%, red ≥ 90%. Empty part dimmed.
- **Pace** card (weekly only), separate from the Week card.
- Display language: `language` option (en, fr, ja, zh), or `/langmod` for every mod at once.

## Data
- 5-hour and weekly windows: percentage and reset time.
- Source: the `session.measure` event (`rateLimits`, kinds `five_hour` and `seven_day`) and `$.session.usage()` at start. Never estimate or recompute usage.

## Pace computation (weekly only)
- `elapsed` = time since the last reset (reset - 7 days).
- `rate` = weekly % used / elapsed.
- `projected` = % used + rate × time left before the reset.
- Display:
  - projected ≥ 100%: "At this pace, limit reached <day> around <hour>" in red, then "i.e. <duration> before reset". Day: `today`, `tomorrow` or the weekday.
  - otherwise: "At this pace, ~X% at reset", colored by X with the scale above, then "limit not reached this week".
  - elapsed < `paceMinHours`: "Not enough data yet to estimate", dimmed.
- Never use words like "ahead" or "behind": ambiguous (being "ahead" on usage is bad news).

## Degraded cases
- No window at all (no subscription, before the first measurement, API failure): band hidden.
- One window missing: its card shows `n/a`.

## Config (`userConfig`)
- `language` (en): display language.
- `paceMinHours` (3): hours elapsed since the weekly reset before a projection is shown.
- `refreshSeconds` (60): countdown redraw between turns; 0 = only after each turn.
- v2, not now: active days of the week for a non-linear pace.

## Out of scope
Cost in dollars, history, charts.
