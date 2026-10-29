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
exit 0
