# Current context: claude-mods

Updated: 2026-11-03 15:45 (valentin-vivobook restarted: synced copies refreshed)

## Current goal
Status line `user/statusline.py` replaces the usage-pace mod; waiting for the user's on-screen check of the square bars, then the workstation.

## Done
- user/statusline.py: model, folder, branch; ctx, 5h, 7j bars of 10 squares (green < 50, yellow 50-75, orange 75-90, red >= 90), % in the same color, tokens in context after the ctx % (`· 24k`, total_input_tokens), time to reset, weekly pace (`→ ~72%`, or 💀 and the day and time of the limit).
- scripts/user-settings.sh copies it to ~/.claude/statusline.py and sets statusLine (`python3 -I ... <lang>`, refreshInterval 60); keeps a status line of one's own unless --statusline (make: STATUSLINE=1); --lang (make: MOD_LANG).
- teacher-guard TEACHER MODE checked next to the custom status line (laptop).
- usage-pace deleted from the repository (plugin, spec 01, marketplace, docs, README, langmod test); disabled on the laptop (`claude plugin disable usage-pace@synced`).
- Detection after a `git pull`: make doctor shows "status line: older than user/statusline.py"; user/hooks/load-context.sh prints a line asking for `make user-settings` when the ~/.claude copies differ from user/ (only in this clone).
- teacher-guard 0.3: the system prompt instruction forbids code the user could copy (snippet, corrected line, diff, even if asked); on the account (0.3.0 synced on the laptop).
- Laptop: make user-settings run with --lang fr --statusline (backup ~/.claude/settings.json.20261101-121743.bak).
- 2026-11-03, valentin-vivobook (Mint 22.2, Intel GPU): pull to 5b70aa7; status line was missing and usage-pace@synced 0.3.0 still loaded; usage-pace disabled, `make user-settings MOD_LANG=fr` (backup settings.json.20261103-152929.bak); make doctor all set. After a restart: usage-pace gone, teacher-guard 0.3.0 loaded.

## Recent decisions
- Status line, not a mod: a plugin can only set `agent` and `subagentStatusLine` (plugin manifest reference), so it is per machine through make user-settings, not on the claude.ai account.
- Python, not jq: jq is missing on the laptop.
- Rules and notes are loaded by Claude Code itself (user/CLAUDE.md, SessionStart hook), not by a mod.

## Known pitfalls
- Synced account plugins (~/.claude/plugins/synced/) refresh only at a Claude Code start: a machine shows deleted or old account versions until it restarts.
- origin is SSH (git@github.com:dhesdin/claude_mods.git) on the laptop: HTTPS asked for a username the shell cannot type. CI green on b69d1b4.
- Auto mode may refuse Claude editing ~/.claude/settings.json hooks and ~/.claude/CLAUDE.md: the user runs make user-settings.
- Languages are stored per installed copy: /langmod once per machine.
- No Node.js, shellcheck or gh on the workstation; Biome lint runs in CI only there. CI status: GitHub API `commits/<sha>/check-runs`.

## Next action
On the workstation: `git pull`, then `make user-settings MOD_LANG=fr STATUSLINE=1`, restart Claude Code, check the status line.

## Waiting for the user
- On-screen check of the status line on valentin-vivobook.
- Check teacher-guard 0.3 in teacher mode: asked for a function's code, Claude answers in words. usage-pace removed from the account (2026-11-01).
- Windows question still open (native route, Windows sysmon sampler).
