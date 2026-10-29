# notify

A desktop notification when Claude finishes a reply or waits for you, titled with the project's name:

```
Claude Code · web-shop
Claude has finished.
```

| When | Notification |
| --- | --- |
| A reply ends (at least `minTurnSeconds` long; interrupted replies and subagents excluded) | "Claude has finished." or "Claude stopped on an error." |
| Claude waits for a permission (the prompt has waited about 6 s) | "Claude is waiting for your permission." |
| An MCP server asks you something | "Claude is waiting for your answer." |
| A background session waits or ends (agent view) | "A background session is waiting for you." / "...has finished." |
| A usage limit needs you | "Usage limit: Claude Code needs you." |

It notifies even when the terminal is in front. No command: install it to have it, disable it to stop.

## How it sends

| Machine | Tool | Status |
| --- | --- | --- |
| Linux | `notify-send` (package `libnotify-bin` on Debian, Ubuntu, Mint) | tested on Linux Mint |
| macOS | `osascript` | [to validate] |
| Windows, WSL | a PowerShell toast; the text goes on stdin, never on the command line | [to validate] |
| iTerm2, Ghostty, Kitty | nothing for replies and permissions: Claude Code already notifies there; the other events go through your notification channel | |
| none of these, or the tool fails | your notification channel (`preferredNotifChannel` in `/config`, "Local notifications"; `terminal_bell` rings the bell anywhere) | |

## What it does on your machine

Runs `git -C <session folder> rev-parse --show-toplevel` once (the project's name), `notify-send --version` or `uname -s` once (which tool exists), then the notification tool with fixed arguments. Reads `/proc/version` and the variables `TERM_PROGRAM`, `KITTY_WINDOW_ID`, `OS`. No network, nothing sent to the model, no tokens.

## Options (`/config`, or `scripts/configure.sh notify key=value`)

| Option | Default | Role |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` (or `/langmod`) |
| `minTurnSeconds` | 15 | shortest reply notified, in seconds; `0` = every reply |

## Disable

`claude plugin disable notify@claude-mods` (or `@synced` when it comes from your claude.ai account).

Spec: [docs/specs/05-notify.md](../../docs/specs/05-notify.md)
