# Current context: claude-mods

Updated: 2026-10-30 19:17 (workstation checked)

## Current goal
Both machines set up and checked. Remaining: the README demo GIF on the workstation; Windows support under discussion.

## Done
- Account: 7 mods (usage-pace 0.3, sysmon 0.3, teacher-guard 0.2, langmod 0.2, project-hours 0.1, notify 0.1, project-memory 0.2.1); versions match the repository.
- Workstation (Linux Mint 22.3, RTX 3070 Ti, driver 595.99.02): make user-settings RULES=1 run (backup ~/.claude/settings.json.20261030-190808.bak), make doctor all set after restart, hand-off hook seen at resume.
- sysmon NVIDIA checklist passed (docs/hardware.md): idle and loaded values equal nvidia-smi, card red over 90% VRAM, power limit shown, python3 listed; machine_status matches. [to validate] removed for NVIDIA.
- Fresh-clone test in an isolated CLAUDE_CONFIG_DIR: install, configure, reinstall, uninstall, teardown, user-settings, dist all behave as documented.
- Fixed: scripts/install.sh passed language= to langmod (matched its keyword) and its CLAUDE=echo dry run ignored account mods; scripts/check.sh names a missing Node.js; docs/install.md and README gaps filled.

## Recent decisions
- Rules and notes are loaded by Claude Code itself (user/CLAUDE.md, SessionStart hook), not by a mod.
- No GPU load script in the repository: any CUDA program serves the checklist.

## Known pitfalls
- Languages are stored per installed copy: /langmod once per machine (not yet run on the workstation).
- Auto mode refuses Claude editing ~/.claude/settings.json hooks and ~/.claude/CLAUDE.md: the user runs make user-settings.
- An isolated CLAUDE_CONFIG_DIR has no login: install can be tested there, a session cannot.
- One cuMemAlloc of ~7 GB fails on the 8 GB card; allocate in chunks.
- CI was red from b8bc3da to 3fa0f3b: shellcheck SC2088 in scripts/doctor.sh, unseen because shellcheck is missing locally (no Node.js, shellcheck or `gh` installed on the workstation). Check status: GitHub API `commits/<sha>/check-runs` (public, no login); job logs need a login.

## Next action
Answer the Windows question (native Windows: sysmon reads /proc, scripts are bash), then record the README demo GIF.

## Waiting for the user
- Windows: whether to add a native Windows route and a Windows sysmon sampler (needs a Windows machine to validate).

## Missing info
- Whether a Windows machine is available for testing.
