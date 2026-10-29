# Security

## Threat model

A mod is code that runs inside Claude Code with the mods `$` API: depending on what it calls, it can start programs, read files, change settings, register tools the model calls. **Installing or updating a mod means trusting its code.** The risks this repo guards against:

1. **A malicious or careless change** that gives a mod more power than its spec allows (a network call, a write, a new tool).
2. **Untrusted text** from other programs (process names, GPU names, mount points, tool error messages) reaching the terminal (escape-sequence injection) or the model (prompt injection).
3. **Command injection** through configuration values passed to programs.
4. **Supply chain**: CI actions, the Claude Code version used in CI, install scripts.
5. **Leaked secrets** in the repository.

## Controls in this repository

| Risk | Control | Where |
| --- | --- | --- |
| 1 | Each plugin's allowed surface (hooks, `$` calls, state) is snapshotted in `plugins/<mod>/surface.txt`; CI fails on any difference, so a new capability always shows up as a reviewed diff | `scripts/check.sh`, CI |
| 1 | Zero-network rule enforced: CI fails if a plugin calls `$.http` | `scripts/check.sh` |
| 2 | Text from other programs is stripped of control and bidi-override characters and length-capped before display | `plugins/sysmon/hooks/util.ts` (`clean`) |
| 2 | In the model-facing `machine_status` result, names are JSON-quoted (they cannot close their quotes) and the tool description states they are data, not instructions; the tool is deferred and returns only measurements | `plugins/sysmon/hooks/register.tsx` |
| 3 | No shell anywhere: programs run by argument vector (`$.process.run(argv)`); numeric options are coerced (`gpuIndex` to an integer ≥ 0); paths are passed after `--`; languages are checked against an allowlist | sysmon, langmod, `scripts/install.sh` |
| 3 | `/langmod` changes only `<plugin>.language` rows following the repo convention, never a locked row, and never echoes its argument | `plugins/langmod/hooks/register.ts` |
| 4 | CI token read-only, checkout without persisted credentials, no secrets, no `pull_request_target`, actions pinned by commit SHA (Dependabot proposes updates), Claude Code version pinned | `.github/` |
| 4 | `scripts/install.sh` only uses the local clone: nothing is downloaded and executed | `scripts/install.sh` |
| 1 | Trojan Source: CI fails on any bidi-override or zero-width character in a tracked file (they can make code read differently than it runs) | `scripts/check.sh` |
| 1 | Linter (Biome, recommended rules) and shellcheck in CI; exceptions are justified line by line | `biome.json`, `scripts/check.sh` |
| 4 | Biome and TypeScript fetched at pinned versions, never a release younger than two weeks | `scripts/check.sh` |
| 5 | Secrets and keys are git-ignored; the repository is scanned for key formats before publishing | `.gitignore` |

## Known limits

- sysmon runs `nvidia-smi`, `tegrastats`, `rocm-smi` and `df` from your `PATH`, exactly as if you typed them: a malicious program placed earlier in `PATH` would run. Keep `PATH` clean.
- The future `teacher-guard` mod filters Bash commands on a best-effort basis: it is a guard against autopilot, **not** a security barrier.
- The surface snapshot says *which* capabilities a plugin uses, not *how*: review code changes too.

## Updating safely

```bash
git -C ~/claude-mods fetch
git -C ~/claude-mods log -p HEAD..origin/main     # read what changed, surface.txt files first
git -C ~/claude-mods pull --ff-only
```

Then `/reload-plugins`.

## Recommended GitHub settings (repository owner)

- Ruleset on `main`: require a pull request and the `check` CI job, block force pushes and deletion.
- Secret scanning and push protection on; Dependabot alerts on.
- Two-factor authentication on the account; signed commits if you use them elsewhere.

## Reporting a problem

Open a private security advisory on the repository (Security tab, "Report a vulnerability") or contact the owner directly. Please do not open a public issue for a vulnerability.
