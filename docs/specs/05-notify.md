# Mod 05: notify

## Problem
On a terminal without native notifications (GNOME Terminal on Linux Mint), nothing signals that Claude has finished or is waiting: the person keeps checking the window.

## Behavior
- A desktop notification, titled `Claude Code · <project>` (git root name, else the folder), when a main-loop reply ends after at least `minTurnSeconds` (default 15), and for the Notification hook types that need the person: `permission_prompt`, `elicitation_dialog`, `elicitation_url_dialog`, `agent_needs_input`, `agent_completed`, `quota_auto_resume_stale`, `quota_auto_resume_disabled`. `idle_prompt` is left out (the end of the reply was notified), `plugin_notification` too (no echo between mods).
- Always, even when the terminal is in front (decided 2026-10-29).
- Tools: `notify-send` (Linux), `osascript` (macOS), PowerShell toast (Windows, WSL; text on stdin). In iTerm2, Ghostty and Kitty, Claude Code notifies replies and permissions itself: not sent twice. No tool or a failure: `$.ui.notify`, the person's `preferredNotifChannel`.
- Never fails the session: every call is caught.

## Config
`language`, `minTurnSeconds`.

## Out of scope
Sounds, per-event toggles, click actions.
