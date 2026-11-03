# Current context: claude-mods

Updated: 2026-11-03 23:30 (Windows install and sysmon Windows committed, not pushed)

## Current goal
Windows 11 native support. Install docs done (approved by the user). sysmon CPU/RAM on Windows done and checked on screen by the user.

Previous: Status line `user/statusline.py` replaces the usage-pace mod; checked on screen on valentin-vivobook; the workstation is next.

## Done
- user/statusline.py: model, folder, branch; ctx, 5h, 7j bars of 10 squares (green < 50, yellow 50-75, orange 75-90, red >= 90), % in the same color, tokens in context after the ctx % (`· 24k`, total_input_tokens), time to reset, weekly pace (`→ ~72%`, or 💀 and the day and time of the limit).
- scripts/user-settings.sh copies it to ~/.claude/statusline.py and sets statusLine (`python3 -I ... <lang>`, refreshInterval 60); keeps a status line of one's own unless --statusline (make: STATUSLINE=1); --lang (make: MOD_LANG).
- teacher-guard TEACHER MODE checked next to the custom status line (laptop).
- usage-pace deleted from the repository (plugin, spec 01, marketplace, docs, README, langmod test); disabled on the laptop (`claude plugin disable usage-pace@synced`).
- Detection after a `git pull`: make doctor shows "status line: older than user/statusline.py"; user/hooks/load-context.sh prints a line asking for `make user-settings` when the ~/.claude copies differ from user/ (only in this clone).
- teacher-guard 0.3: the system prompt instruction forbids code the user could copy (snippet, corrected line, diff, even if asked); on the account (0.3.0 synced on the laptop).
- Laptop: make user-settings run with --lang fr --statusline (backup ~/.claude/settings.json.20261101-121743.bak).
- 2026-11-03, valentin-vivobook (Mint 22.2, Intel GPU): pull to 5b70aa7; status line was missing and usage-pace@synced 0.3.0 still loaded; usage-pace disabled, `make user-settings MOD_LANG=fr` (backup settings.json.20261103-152929.bak); make doctor all set. After a restart: usage-pace gone, teacher-guard 0.3.0 loaded.

- 2026-11-03 Windows : .gitattributes `* text=auto eol=lf` (autocrlf=true checked out CRLF, broke surface snapshots); doctor/user-settings/check.sh find a Python 3 that runs (python3 is the Store alias here, python works); user-settings on Git Bash writes C:/ paths, `bash <hook>`, `python -X utf8 -I` (cp1252 crash on emojis), and without Developer Mode ~/.claude/CLAUDE.md = `@C:/.../user/CLAUDE.md` import instead of a symlink; install.sh recognises the C:\ marketplace path.

- 2026-11-03 sysmon Windows : hooks/system.ts windowsScript/parseWindows/parseWindowsLines (one powershell.exe via $.process.spawn while the pane measures, one JSON line per interval: raw idle counter + 100 ns clock -> existing cpuPercent, AvailableKBytes, page file, cores, top 3 by WorkingSet every 15 s; CIM classes, not localized counter paths); register.tsx: hasProc once at the first shown refresh, sampler started after the await (no double start), stopped by stop(); isWindowsOff after it ends; machine_status without a live sample = one PowerShell run (2 samples 500 ms); Snapshot.isWindows?: Load line = cores only, no swap alert. Tests: 2 new pass (spawn stub must return { value: { code, signal } }); the 2 old /proc tests still fail on Windows only (known artefact).

## Recent decisions
- sysmon Windows: a long-running PowerShell, not one per cycle (cold start ~1.8 s, warm sample ~560 ms, ~130 ms per loop sample).
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
sysmon Windows checked on screen and documented (spec 02, hardware.md, mods.md, install.md, README, CLAUDE.md). Everything Windows is uncommitted: commit when the user asks. GPU process names fixed (split on \ too). Possible follow-up: disk card on Windows (df / diskPaths).

Workstation, still pending: On the workstation: `git pull`, then `make user-settings MOD_LANG=fr STATUSLINE=1`, restart Claude Code, check the status line.

## Waiting for the user
- Check teacher-guard 0.3 in teacher mode: asked for a function's code, Claude answers in words. usage-pace removed from the account (2026-11-01).
- Windows question still open (native route, Windows sysmon sampler).
