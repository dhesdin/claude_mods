---
name: help-skills
description: List every skill available in this session, one line each, grouped by where it comes from (claude.ai account, this machine, project, Claude Code and plugins). Use when the user runs /help-skills or asks which skills they have.
---

# help-skills

1. Run the bundled script from this skill's base directory and show its output to the user as is, in a code block:

   ```bash
   bash "<base directory of this skill>/scripts/list-skills.sh"
   ```

2. Then add a last section, **Claude Code and plugins**, built from the skills listed in your own context (the available-skills list), leaving out those the script already printed: one line each, the name then the first sentence of its description.

3. Nothing else: no summary or advice unless the user asks. Write the headings in the user's language.
