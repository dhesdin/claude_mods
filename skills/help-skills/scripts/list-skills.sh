#!/usr/bin/env bash
# Lists the skills found on disk, one line each: claude.ai account (synced), this machine, project.
# Reads only. Text from the files is stripped of control characters and cut to one sentence.
set -u

base="${HOME:-}/.claude/skills"
root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# One SKILL.md -> "name<TAB>first sentence of its description".
summary() {
  awk '
    NR == 1 && $0 != "---" { exit }
    NR > 1 && $0 == "---" { done = 1; exit }
    block && /^[ \t]+[^ \t]/ { sub(/^[ \t]+/, ""); desc = desc (desc == "" ? "" : " ") $0; next }
    { block = 0 }
    /^name:/ { sub(/^name:[ \t]*/, ""); gsub(/^["\047]|["\047]$/, ""); name = $0 }
    /^description:/ {
      sub(/^description:[ \t]*/, "")
      if ($0 ~ /^[>|][-+]?$/) { block = 1; desc = "" } else { gsub(/^["\047]|["\047]$/, ""); desc = $0 }
    }
    END {
      gsub(/[[:cntrl:]]/, " ", desc); gsub(/[[:cntrl:]]/, " ", name)
      if (match(desc, /[.!?]( |$)/)) desc = substr(desc, 1, RSTART)
      if (length(desc) > 110) desc = substr(desc, 1, 109) "..."
      print name "\t" desc
    }' "$1"
}

# Prints a section: its title, then one line per SKILL.md among the arguments, or "(none)".
section() {
  local title="$1"
  shift
  echo "$title"
  if (($# == 0)); then
    echo "  (none)"
  else
    local f
    for f in "$@"; do summary "$f"; done |
      sort -u -t $'\t' -k1,1 |
      awk -F '\t' '{ printf "  %-30s %s\n", ($1 == "" ? "?" : $1), $2 }'
  fi
  echo
}

shopt -s nullglob
account=("$base"/synced/*/*/SKILL.md)
machine=("$base"/*/SKILL.md)
project=("$root"/.claude/skills/*/SKILL.md)

section "claude.ai account (synced to every machine you log in on)" "${account[@]}"
section "This machine (~/.claude/skills, not synced)" "${machine[@]}"
section "Project ($root/.claude/skills)" "${project[@]}"
