# statusbar

The status line for the Claude desktop app. Its Code tab does not draw the `statusLine` setting (`user/statusline.py`), so this mod draws the same four lines in a band above the prompt:

```
🤖 Opus 5.5 │ 📁 IUT │ 🌿 main
🧠 ctx ■■■■■■■■■■  24% · 243k
⏳ 5h ■■■■■■■■■■  3% · 2h09
📅 7j ■■■■■■■■■■  60% · 1j20h → ~82%
```

- Model, project folder, git branch (left out outside a repository).
- Context: bar, %, tokens in the context (`n/a` before the first reply).
- 5-hour and weekly usage: bar, %, time to reset; the weekly line ends with the pace, a linear projection at the average rate since the reset (`→ ~82%`), or 💀 and `→ 100% <day> <hh:mm>` when the limit comes before the reset.
- Bar and % color: green < 50%, yellow 50-75%, orange 75-90%, red ≥ 90%.
- Hidden in the terminal, which has the real status line (option `showInTerminal`).
- Usage figures missing (no subscription): those lines are left out.
- `/statusbar`: hides the band for this session, or shows it again.

## What it does on your machine

It reads the figures Claude Code already has (`$.session.usage()`, `session.measure`, `$.session.model()`, `$.session.root()`, `$.session.cwd()`) and runs `git -C <folder> branch --show-current` at start and after each reply (2 s timeout). It reads no file or credential, makes no network request, and sends nothing to the model. Model, folder and branch names are cleaned of control characters before display.

## Options (`/config`, or `scripts/configure.sh statusbar key=value`)

| Option | Default | Role |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` (or `/langmod`) |
| `showInTerminal` | `false` | draw the band in the terminal too |
| `paceMinHours` | 3 | hours since the weekly reset before a projection is shown |
| `refreshSeconds` | 60 | countdown and model redraw between turns (0 = only after each turn) |

## Disable

`claude plugin disable statusbar@claude-mods`

Spec: [docs/specs/07-statusbar.md](../../docs/specs/07-statusbar.md)
