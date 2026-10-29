---
name: install-mods
description: Guided install of the claude-mods mods on this machine or on the user's claude.ai account, adapted to the machine (OS, GPU, drivers), with each mod's options set as the user wants. Use when the user runs /install-mods, or asks to install, set up, configure or update these mods.
---

# install-mods

Guide the person through choosing, installing and configuring the mods of this repository. Speak their language. Keep each message short: lists and tables, no essays.

The facts come from the repository, not from memory: `docs/mods.md` (each mod, its command, its options and defaults), `docs/install.md` (the same steps for a human, troubleshooting), `docs/hardware.md` (GPU drivers).

## Rules

- Never run `sudo`, install a driver or other software (a GPU tool, Syncthing...), or change system settings: give the commands or the link, the person runs them.
- Install only from this clone, with the commands below. Show each command before running it.
- Nothing is installed or configured before the person confirms the recap (step 5).
- The claude.ai upload is done by the person in their browser; do not log in or upload for them.
- Never put a mod both on the account and on this machine: `make install` skips a mod that already comes from the account.
- Options hold paths and project names, never secrets. Do not read other files of the person to guess values: ask.

## Steps

1. **Check the machine.** Run `scripts/doctor.sh` from the repository root. Summarize in a few lines: system, Claude Code version, GPU and the source sysmon will use, the mods already there (`installed`, `account`, `-`), anything under "Next".

2. **Present the mods and ask which ones.** One line per mod from the table at the top of `docs/mods.md`: name, what it does, its command, and whether it is already there. Ask which ones (any subset, or all).

3. **Ask where**, with one line each:
   - **their claude.ai account**: upload once, every machine where they sign in gets the mods (recommended with several machines; needs a claude.ai login, not an API key);
   - **this machine only**: nothing leaves the machine, updated with `git pull` here.

4. **Ask the options**, mod by mod, from the mod's table in `docs/mods.md`: show each option with its default and effect in one line, and ask what to change; "keep the defaults" is a fine answer.
   - Ask the display language once for every mod (`en`, `fr`, `ja`, `zh`).
   - **project-hours**: say first that it counts only the time of open Claude Code sessions. Ask for priority projects (`name=weeks`), aliases, and whether they work on one project from **several machines**. If yes, explain the sync option of `docs/mods.md` (a tool they install themselves, such as Syncthing, shares a folder; then `dataFolder` points to it on each machine). It is optional and can be set later.
   - **sysmon** on a GPU machine: `gpuBackend` stays `auto` unless the doctor found the wrong source.

5. **Recap and confirm**: the mods, where, the language, the options that differ from the defaults, the exact commands you will run. Wait for a yes.

6. **Install.**
   - This machine: `make install <mods> MOD_LANG=<lang>` (without `make`: `scripts/install.sh --lang <lang> <mods>`).
   - Account: `make dist`, then the person uploads each `dist/plugins/<mod>.zip` on claude.ai (Customize > Plugins > Add > Upload plugin) and restarts Claude Code. Wait until `claude plugin list` shows `<mod>@synced` before step 7. The language is an option like the others: set it in step 7.

7. **Configure**, one command per mod, only the options that change: `scripts/configure.sh <mod> key=value [key=value...]` (values with `;` or spaces in single quotes). It finds the installed copy (`@claude-mods` or `@synced`) and refuses an unknown key. Check with `scripts/configure.sh <mod>`; the values apply when Claude Code restarts. Options are per machine: on another machine, run step 7 again there.

8. **Hardware, for sysmon.** If the doctor reports a GPU without its tool, point to the matching section of `docs/hardware.md` and quote its commands for their distribution. Mention the sections still marked **[to validate]** (Jetson, AMD).

9. **Finish.** Tell them to restart Claude Code (or run `/reload-plugins` if no option was set), then what to try, one line per installed mod, from the Command column of `docs/mods.md`. Then: options can be changed any time with `/config` or `scripts/configure.sh`; a mod is turned off with `/plugin` (Installed tab).

## Updating later

`git pull --ff-only`, summarize what changed (`git log --oneline ORIG_HEAD..`), then: this machine, `/reload-plugins`; account, `make dist` and upload the changed zips again. Options are kept.
