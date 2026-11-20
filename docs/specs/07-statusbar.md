# Mod 07: statusbar

## Problem
The status line `user/statusline.py` (model, folder, branch, context, 5-hour and weekly usage, weekly pace) is a terminal feature: the Code tab of the Claude desktop app does not draw the `statusLine` setting. Working in the desktop app, those figures are gone.

## Behavior
- A band above the prompt (`ui.render` on `AbovePrompt`) with the same four lines as the status line:
  1. `🤖 <model> │ 📁 <project folder> │ 🌿 <branch>` (branch left out outside a git repository);
  2. `🧠 ctx <bar> <pct>% · <tokens>` (`n/a` before the first reply);
  3. `⏳ 5h <bar> <pct>% · <time to reset>`;
  4. `📅 7d <bar> <pct>% · <time to reset> → ~<projected>%`, or `💀` and `→ 100% <day> <hh:mm>` when the weekly limit is reached before the reset.
- Bars of 10 squares; bar and % colored green < 50, yellow 50-75, orange 75-90, red >= 90, as in the status line. Usage windows missing (no subscription): their line is left out.
- Drawn on every surface except the terminal, which has the real status line; option `showInTerminal` draws it there too.
- Figures come from Claude Code: `$.session.usage()` at start, `session.measure` after each turn, `$.session.model()`, `$.session.root()`, `$.session.cwd()`. Only the weekly projection is computed (linear, at the average rate since the reset, shown after `paceMinHours`).
- The branch: `git -C <cwd> branch --show-current` at start and after each turn (argv, 2 s timeout); failure leaves it out.
- Countdowns and the model redraw every `refreshSeconds` (0: only after each turn).
- `/statusbar`: hides the band for this session, or shows it again.
- Model, folder and branch names are cleaned (control and bidi characters) before display.

## Config
`language`, `showInTerminal` (false), `paceMinHours` (3), `refreshSeconds` (60).

## Out of scope
Cost, session duration, anything the status line does not show.
