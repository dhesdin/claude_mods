---
name: help-mods
description: List the claude-mods mods on this machine, one line each: installed or not, enabled or not, what each does, and how to install them when they are missing. Use when the user runs /help-mods or asks which mods they have.
---

# help-mods

1. Run the bundled script from this skill's base directory and show its output to the user as is, in a code block:

   ```bash
   python3 -I "<base directory of this skill>/scripts/list-mods.py"
   ```

2. Nothing else: no summary or advice unless the user asks. Write the headings in the user's language. Each mod's options are in `/config`; its README in the claude-mods repository says more.
