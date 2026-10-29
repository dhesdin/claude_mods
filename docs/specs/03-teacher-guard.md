# Mod 03: teacher-guard

## Problem
In some repositories (learning projects, portfolio projects), the user must write the code themselves: they have to understand and defend every line. The risk is letting Claude code "just this once". This mod makes that slide impossible without a conscious step.

## Activation: a command, per repo and per session
- `/teacher-mode activate` protects the current repo (its git root, or the current folder outside git) for the session. `/teacher-mode deactivate` turns it off; `/teacher-mode` alone says what is protected.
- Only the person at the prompt can deactivate (`origin.kind === 'composer'`): the same command from a plugin or the model is refused.
- State in `$.state` (session): it survives a reload of the mod, and a new session starts with everything off.
- Nothing is written in the repository: no marker file to keep out of commits.
- (v0.1 used a `.teacher-mode` marker file. Replaced at the user's request: a command is more modular, per repo and per session.)

## Behavior in a protected repo
1. **Refuse** tool calls that write files into the repo: `Write`, `Edit`, `NotebookEdit`.
2. **Bash, best effort**: refuse commands whose write target is in the repo. Write commands: `>` and `>>` redirections, `tee`, `rm`, `mv`, `cp` (destination), `touch`, `mkdir`, `ln`, `chmod`, `sed -i`, `perl -i`, `dd of=`, `patch`. Git commands that change the repo or its history: `add`, `commit`, `push`, `apply`, `merge`, `rebase`, `reset`, `restore`, `checkout`, `stash`, `rm`, `mv`, `clean`, `pull`, `tag`, `clone`, `init`, `worktree`, `am`, `cherry-pick`, `revert`, `switch`. Quotes, `cd`, `git -C`, `~`, `$HOME`, `$TMPDIR` and heredocs are understood; an unknown target is judged by the folder the command runs in.
   - Allowed: reading and running (`ls`, `cat`, `git status/diff/log`, tests, existing scripts), and anything outside protected repos (temporary folders, copying code out to `/tmp`).
   - This filter is **not a security barrier**, only a guard against autopilot. Documented as such in the README.
3. Clear refusal message sent back to Claude: "Repo in teacher mode: no writes. Explain, ask questions, give hints, do not provide complete code."
4. Permanent discreet indicator: the status line `TEACHER MODE · <repo>` (does not compete with other mods' bands).
5. The guard fails closed: if a check throws before the call is let through, the call is refused.

## Only token spending allowed
While a repo is protected, a short instruction (2 lines) is added to the system prompt (`prompt.compose`, scope `session`) so Claude acts as a reviewer rather than attempting refused writes. Removed as soon as nothing is protected.

## Cases to test
- Off by default: nothing refused, no status, no instruction.
- After `activate`: Edit refused, `cat` allowed, `echo x > f` refused, `pytest` allowed, `git commit` refused, writes in `/tmp` allowed, a write aimed at the repo from elsewhere refused.
- Subfolder of a protected repo: protected too (the git root is protected).
- `deactivate` from a plugin refused; from the prompt, everything writable again.

## Config
`language` (en): status line and command replies.

## Out of scope
Detecting code pasted by the user, statistics, persisting the mode across sessions.
