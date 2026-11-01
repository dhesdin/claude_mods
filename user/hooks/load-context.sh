#!/usr/bin/env bash
# Claude Code SessionStart hook (startup, resume, /clear, compaction), installed by scripts/user-settings.sh.
# Loads the project's hand-off notes and a git snapshot; no model call. What it prints (exit 0) is added
# to the context. A project without .claude/contexte.md gets nothing.
set -u
dir="${CLAUDE_PROJECT_DIR:-$PWD}"
notes="$dir/.claude/contexte.md"
[ -f "$notes" ] || exit 0

echo "Project hand-off notes (.claude/contexte.md, already loaded here: do not read it again):"
echo
head -c 6000 "$notes"
echo

if git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo
  echo "Git at load time:"
  echo "- branch: $(git -C "$dir" branch --show-current 2>/dev/null)"
  changes=$(git -C "$dir" status --short 2>/dev/null | head -n 25)
  if [ -n "$changes" ]; then
    echo "- uncommitted changes:"
    echo "$changes" | sed 's/^/  /'
  else
    echo "- no uncommitted change"
  fi
  echo "- last commits:"
  git -C "$dir" log --oneline -5 2>/dev/null | sed 's/^/  /'
fi

# In the claude-mods clone: say when a `git pull` brought per-machine settings this machine lacks.
cfg="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
if [ -f "$dir/scripts/user-settings.sh" ] && [ -f "$dir/user/statusline.py" ]; then
  if ! cmp -s "$dir/user/statusline.py" "$cfg/statusline.py" || ! cmp -s "$dir/user/hooks/load-context.sh" "$cfg/hooks/load-context.sh" \
    || ! grep -q 'statusline.py' "$cfg/settings.json" 2>/dev/null; then
    echo
    echo "Per-machine settings are behind this repository's user/ (status line or notes hook): tell the user to run"
    echo "\`make user-settings MOD_LANG=<their language>\` (STATUSLINE=1 to replace a status line of their own; docs/install.md)."
  fi
fi
exit 0
