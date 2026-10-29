# Install guide (by hand)

Everything `/install-mods` does for you, step by step, with no AI involved. Ten minutes on a new machine.

## How it works

- A **mod** is a Claude Code plugin: TypeScript code that Claude Code runs on your machine (it draws a band or a pane, adds a command, guards a tool call).
- The code is the same everywhere; **each machine runs it locally** and sees its own hardware. sysmon on your laptop reads the laptop, on your workstation it reads the workstation's GPU. Nothing is sent anywhere: no mod makes a network request.
- You get the code onto a machine in one of two ways:
  - **from your claude.ai account**: you upload each mod once, and Claude Code downloads it on every machine where you sign in;
  - **from this repository, on one machine**: `make install` registers the clone as a marketplace and installs from it.
- What stays per machine either way: each mod's options (`/config`) and the hardware tools sysmon reads (a GPU driver).

## 1. Requirements

| | Needed for |
| --- | --- |
| [Claude Code](https://code.claude.com/docs) 2.1.287 or later (tested on 2.1.312) | every mod |
| signed in with a claude.ai account (not an API key), Claude Code 2.1.273 or later | the account route only |
| `git`, `make` (or bash for `scripts/install.sh`), `python3` | cloning and installing |
| Linux or WSL2 | sysmon (it reads `/proc`); the other mods run anywhere Claude Code runs |

## 2. Check your machine

```bash
git clone https://github.com/dhesdin/claude_mods.git && cd claude_mods
make doctor
```

What each section tells you:

| Section | Read it as |
| --- | --- |
| Machine | system, architecture, cores, RAM; WSL2 if detected |
| Claude Code | installed version; a line under Next if it is too old for mods |
| GPU (sysmon) | graphics found, the tool found (`nvidia-smi`, `tegrastats`, `rocm-smi`) and the source sysmon will use; `none` = no GPU card, the rest of sysmon works |
| Tools | git, make, python3, df |
| Mods | each mod and where it comes from: `installed` (this machine), `account` (synced from claude.ai), `-` (not there) |
| Next | what to fix before or after installing; "nothing to fix" otherwise |

## 3. Choose where to install

| | On your claude.ai account | On this machine |
| --- | --- | --- |
| Reaches | every machine where you sign in with that account | this machine only |
| Updates | upload the new zip once | `git pull` on each machine |
| Needs | a claude.ai account | the clone stays on the machine (the marketplace points at it) |
| Best for | your own machines | development, a shared or offline machine, no claude.ai account |

Do not use both for the same mod on one machine: the machine copy takes precedence and you get a duplicate. `make install` skips a mod that already comes from the account.

## 4a. Install on your claude.ai account

```bash
make dist        # one zip per mod in dist/plugins/, built from the last commit
```

1. On claude.ai: **Customize > Plugins > Add > Upload plugin**, choose `dist/plugins/<mod>.zip`, then **Import**. Repeat for each mod you want.
2. Start Claude Code (or restart it) on any machine where you are signed in: the mods sync in the background and load as `<mod>@synced`. If a session was already open: `/reload-plugins`.
3. Set the language on each machine: `/langmod fr` (or `en`, `ja`, `zh`).

## 4b. Install on this machine

```bash
make install                         # every mod
make install sysmon usage-pace       # the mods you name, any number, any order
make sysmon usage-pace               # the same, shorter
make install MOD_LANG=fr             # with a display language: en, fr, ja, zh
```

Then `/reload-plugins` in a session that was already open.

| Command | Does |
| --- | --- |
| `make help` | every target and variable |
| `make doctor` | the machine check of step 2 |
| `make list` | each mod, its description, where it comes from |
| `make setup` | only register this clone as a marketplace |
| `make uninstall <mod>...` | uninstall the mods you name (all without names) |
| `make teardown` | uninstall every mod and remove the marketplace |

Variables, on the command line, in the environment, or in a git-ignored `config.mk` (copy `config.mk.example`):

| Variable | Values | Default |
| --- | --- | --- |
| `MOD_LANG` | `en`, `fr`, `ja`, `zh` | each mod's default (`en`) |
| `MOD_SCOPE` | `user` (you, every project), `project`, `local` | `user` |
| `CLAUDE` | the Claude Code binary; `CLAUDE=echo` prints the commands without running them | `claude` |

Without `make`: `scripts/install.sh [--lang fr] [--scope user] [<mod>...]` takes the same options. With Claude Code alone:

```bash
claude plugin marketplace add "$PWD"
claude plugin install sysmon@claude-mods        # one line per mod
```

## 5. Prepare the hardware (sysmon only)

If `make doctor` lists a GPU under Next (driver or tool missing), follow the matching row of [docs/hardware.md](hardware.md#start-here-your-machine-in-one-table): NVIDIA driver per distribution, WSL2, Jetson, AMD (ROCm), Raspberry Pi. Run `make doctor` again afterwards: "sysmon will use" should name your GPU's source.

## 6. Check that it works

In a Claude Code session (`/plugin` lists the loaded mods on its dim line under the tabs):

| Mod | You should see |
| --- | --- |
| usage-pace | three cards above the prompt after your first message (5-hour session, week, pace); nothing without a Claude subscription |
| sysmon | `/sysmon` opens the Machine panel (it opens by itself from 144 terminal columns) |
| teacher-guard | `/teacher-mode activate` in a repo: the status line shows `TEACHER MODE · <repo>`; ask Claude to edit a file, it is refused |
| langmod | `/langmod` lists each mod's language; `/langmod fr` switches them |

## Configure

Every option is in `/config`, in each mod's section, with its default; each mod's README (`plugins/<mod>/README.md`) explains them. Options are stored per machine in `~/.claude/settings.json`.

## Update

- **Account**: in the repository, `git pull`, `make dist`, upload the zip again (same name = new version). Each machine picks it up at its next start.
- **This machine**: `git pull --ff-only` in the clone, then `/reload-plugins`. Read what changed first (`git log -p ORIG_HEAD..`): a mod runs code on your machine ([SECURITY.md](../SECURITY.md)).

## Disable or remove

| | Account | This machine |
| --- | --- | --- |
| Turn one off on this machine | `/plugin`, Installed tab, or `claude plugin disable <mod>@synced` | `claude plugin disable <mod>@claude-mods` |
| Remove | claude.ai, Customize > Plugins, the mod's menu | `make uninstall <mod>` |
| Everything | remove each on claude.ai | `make teardown` |

## What follows you from one machine to another

| What | Where it lives | On a new machine |
| --- | --- | --- |
| Mods uploaded to your account | your account (synced to `~/.claude/plugins/synced/`) | there at the next start after you sign in |
| Mods installed with `make install` | that machine | clone and install again |
| Skills of your claude.ai account | your account (synced to `~/.claude/skills/synced/`) | there as soon as you sign in |
| Skills in `~/.claude/skills/` | that machine | not synced: upload them on claude.ai (Customize > Skills) to have them everywhere |
| `~/.claude/CLAUDE.md`, `~/.claude/settings.json` (mod options) | that machine | not synced: copy them |
| A repository's `.claude/skills/` and `CLAUDE.md` | the repository | there after `git clone` |

## Troubleshooting

| Symptom | Check |
| --- | --- |
| A mod does not appear | `/plugin`: is it on the dim "mods active" line? Its **Errors** tab says why a plugin did not load. After an install: `/reload-plugins`. `claude --version` ≥ 2.1.287 |
| Account mods never arrive | signed in with claude.ai (`/login`), not with an API key; Claude Code ≥ 2.1.273; restarted since the upload; `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` and `--safe-mode` turn the sync off; `syncClaudeAiPlugins` not set to `false` |
| A mod is listed twice | it is both on the account and installed here: `make uninstall <mod>` keeps the account copy |
| The sysmon panel does not open by itself | the terminal is narrower than 144 columns: run `/sysmon` |
| sysmon says "No supported GPU" | `make doctor`, then [docs/hardware.md](hardware.md) for your GPU |
| The language went back to English | options are per machine: `/langmod fr` on that machine |
| The usage band stays empty | it needs a Claude subscription and appears after the first reply of the session |
