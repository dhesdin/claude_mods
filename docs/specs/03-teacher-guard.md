# Mod 03: teacher-guard

## Problem
In the portfolio repos (SIP, 3D Vision, etc.), the user must write the code themselves: they will have to defend it in interviews. The risk is letting Claude code "just this once". This mod makes that slide impossible without a conscious effort.

## Activation: marker file
- A repo is protected if it holds a `.teacher-mode` file at its root. The file is created in the current project (SIP) but never committed nor pushed: teacher mode applies to the user, while the portfolio must stay professional and not show Claude's presence.
- No list of paths in config: paths differ between laptop and workstation, the marker travels with the working copy.
- Disabling = deleting the file by hand. **No slash command turns the mode off.** The friction is deliberate.

## Behavior in a protected repo
1. **Block** tool calls that write files: Write, Edit, NotebookEdit (check the exact names in the docs).
2. **Bash, best effort**: block commands that modify repo files (`>` and `>>` redirections, `tee`, `sed -i`, `mv`, `cp`, `rm`, `git commit`, `git push`, `git apply`, `patch`). Allow reading and running: `ls`, `cat`, `git status/diff/log`, running the tests or an existing script.
   - This filter is **not a security barrier**, only a guard against autopilot. Document it as such in the README.
3. Clear refusal message sent back to Claude: "Repo in teacher mode: no writes. Explain, ask questions, give hints, do not provide complete code."
4. Permanent discreet band: `TEACHER MODE` while the session is in a protected repo.

## Only token spending allowed
At the start of a session in a protected repo, inject a short instruction (2 to 3 lines max) so Claude acts as a reviewer from the start, rather than attempting refused writes. If the API does not allow it, skip it: blocking is enough.

## Cases to test
- Protected repo: Edit refused, `cat` allowed, `echo x > f` refused, `pytest` allowed.
- Unprotected repo: no behavior change.
- Subfolder of a protected repo: protected too (look for the marker walking up to the Git root).

## Out of scope
Detecting code pasted by the user, statistics.
