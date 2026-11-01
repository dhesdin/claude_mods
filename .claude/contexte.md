# Current context: claude-mods

Updated: 2026-11-01 12:24 (usage-pace replaced by a status line)

## Current goal
Status line `user/statusline.py` replaces the usage-pace mod; waiting for the user's on-screen check of the square bars, then the workstation.

## Done
- user/statusline.py: model, folder, branch; ctx, 5h, 7j bars of 10 squares (green < 50, yellow 50-75, orange 75-90, red >= 90), % in the same color, time to reset, weekly pace (`→ ~72%`, or 💀 and the day and time of the limit).
- scripts/user-settings.sh copies it to ~/.claude/statusline.py and sets statusLine (`python3 -I ... <lang>`, refreshInterval 60); keeps a status line of one's own unless --statusline (make: STATUSLINE=1); --lang (make: MOD_LANG).
- teacher-guard TEACHER MODE checked next to the custom status line (laptop).
- usage-pace deleted from the repository (plugin, spec 01, marketplace, docs, README, langmod test); disabled on the laptop (`claude plugin disable usage-pace@synced`).
- Detection after a `git pull`: make doctor shows "status line: older than user/statusline.py"; user/hooks/load-context.sh prints a line asking for `make user-settings` when the ~/.claude copies differ from user/ (only in this clone).
- Laptop: make user-settings run with --lang fr --statusline (backup ~/.claude/settings.json.20261101-121743.bak).

## Recent decisions
- Status line, not a mod: a plugin can only set `agent` and `subagentStatusLine` (plugin manifest reference), so it is per machine through make user-settings, not on the claude.ai account.
- Python, not jq: jq is missing on the laptop.
- Rules and notes are loaded by Claude Code itself (user/CLAUDE.md, SessionStart hook), not by a mod.

## Known pitfalls
- Auto mode may refuse Claude editing ~/.claude/settings.json hooks and ~/.claude/CLAUDE.md: the user runs make user-settings.
- Languages are stored per installed copy: /langmod once per machine.
- No Node.js, shellcheck or gh on the workstation; Biome lint runs in CI only there. CI status: GitHub API `commits/<sha>/check-runs`.

## Next action
On the workstation: `git pull`, then `make user-settings MOD_LANG=fr STATUSLINE=1`, restart Claude Code, check the status line.

## Waiting for the user
- On-screen check of the status line (square bars) on the laptop.
- Upload dist/plugins/teacher-guard.zip (0.3: no copyable code in replies) on claude.ai, then check it in teacher mode. usage-pace removed from the account (2026-11-01).
- git push (no GitHub credentials in this shell), then git pull on the workstation.
- Windows question still open (native route, Windows sysmon sampler).
