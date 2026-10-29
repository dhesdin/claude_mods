# teacher-guard

Teacher mode for the repos where **you** write the code (learning or portfolio projects you must fully understand). While it is on, Claude cannot change your files there: it explains, asks questions, gives hints and reviews.

## Use

```
/teacher-mode activate      the current repo is protected, for this session
/teacher-mode deactivate    back to normal (only you, from the prompt)
/teacher-mode               what is protected right now
```

- **Scope**: the current git repo (its root, everything below it), or the current folder outside git. Several repos can be on at once.
- **Per session**: a new session starts with teacher mode off everywhere; it survives a reload of the mod within the session. Nothing is written in your repo: no marker, nothing to keep out of commits.
- `/teacher-mode deactivate` coming from a plugin or from the model is refused: only the person at the prompt turns it off.

## What it does while on

| Claude tries to… | Result |
| --- | --- |
| `Write`, `Edit`, `NotebookEdit` a file in the repo | refused |
| a Bash command that writes into the repo: `>` / `>>`, `tee`, `rm`, `mv`, `cp` into it, `touch`, `mkdir`, `ln`, `chmod`, `sed -i`, `perl -i`, `dd of=`, `patch` | refused |
| any git command that changes the repo or its history: `add`, `commit`, `push`, `apply`, `merge`, `rebase`, `reset`, `restore`, `checkout`, `stash`, `rm`, `mv`, `clean`, `pull`, `tag`… | refused |
| read: `ls`, `cat`, `grep`, `git status` / `diff` / `log` | allowed |
| run: tests (`pytest`), an existing script, a build | allowed |
| anything in temporary folders (`/tmp/...`) or outside protected repos, including copying your code out to `/tmp` | allowed |

- A refusal tells Claude: "Repo in teacher mode: no writes. Explain, ask questions, give hints, do not provide complete code."
- Status line under the prompt: `TEACHER MODE · <repo>`.
- While a repo is on, a two-line instruction in the system prompt tells Claude to act as a reviewer. It is the only token this mod spends.
- Subagents are covered: their tool calls go through the same checks.

## Limits: a guard against autopilot, not a security barrier

The Bash check reads the command statically, best effort:
- It cannot see what a program does once started: an inline `python -c "open('x','w')"`, a script, a `make` target or an alias can still write.
- A target it cannot know (an unknown `$VARIABLE`, a `$(command)`) is judged by the folder the command runs in: refused there if that folder is protected.
- The folder a command runs in is the session's folder (plus any `cd` inside the command); a `cd` from an earlier Bash call is not seen.
- Only Claude's tools are checked: your own terminal, editor and git are untouched.

## What it does on your machine

- Reads each `Write`, `Edit`, `NotebookEdit` and `Bash` call Claude makes, to refuse the writes into a protected repo; it never changes a call it lets through.
- Runs `git -C <folder> rev-parse --show-toplevel` when you run `/teacher-mode activate`, to find the repo root.
- Reads `HOME` and `TMPDIR` to resolve `~` and `$TMPDIR` in commands.
- Sends to the model only the two-line reviewer instruction (while a repo is protected) and the refusal message. No network request, no credential.

## Options (`/config`, or `scripts/configure.sh teacher-guard key=value`)

| Option | Default | Role |
| --- | --- | --- |
| `language` | `en` | status line and replies: `en`, `fr`, `ja`, `zh` (or `/langmod`) |

## Disable the mod

`claude plugin disable teacher-guard@claude-mods` or `make uninstall teacher-guard`.

Spec: [docs/specs/03-teacher-guard.md](../../docs/specs/03-teacher-guard.md)
