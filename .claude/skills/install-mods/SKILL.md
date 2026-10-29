---
name: install-mods
description: Guided install of the claude-mods mods on this machine or on the user's claude.ai account, adapted to the machine (OS, GPU, drivers). Use when the user runs /install-mods, or asks to install, set up or update these mods.
---

# install-mods

Guide the person through installing the mods of this repository. Speak their language. Never run `sudo`, install a driver or change system settings yourself: give the commands and let them run them.

1. **Check the machine.** Run `scripts/doctor.sh` from the repository root and give a short summary: system, Claude Code version, GPU found and the source sysmon will use, anything listed under "Next".

2. **Ask what they want**, in one question, with the list from the doctor's "Mods" section (one line per mod):
   - which mods (any subset, or all);
   - display language: `en`, `fr`, `ja` or `zh`;
   - where:
     - **their claude.ai account** (recommended when they use Claude Code on several machines and sign in with claude.ai): the mods then sync to every machine they sign in on;
     - **this machine only**.

3. **Install.**
   - This machine: show the exact command, then run it: `make install <mods> MOD_LANG=<lang>` (all mods: `make install MOD_LANG=<lang>`). Without `make`: `scripts/install.sh --lang <lang> <mods>`. Mods marked `account` in the doctor's list already come from their claude.ai account: do not install them again.
   - Their account: run `make dist`, then tell them to upload each `dist/plugins/<mod>.zip` on claude.ai (Customize > Plugins > Add > Upload plugin). They sync at the next Claude Code start; the language is then set per machine with `/langmod <lang>`.

4. **Hardware, for sysmon.** If the doctor reports a GPU without its tool (NVIDIA driver, ROCm, tegrastats), point to the matching section of `docs/hardware.md` and quote its commands for their distribution. Mention the sections still marked **[to validate]** (Jetson, AMD) and the validation checklist at the end of that file.

5. **Finish.** Tell them to run `/reload-plugins` in an open session (or start a new one), then what to try: the usage band above the prompt, `/sysmon`, `/teacher-mode`, `/langmod`. Each mod's README in `plugins/<mod>/` lists its options (`/config`).
