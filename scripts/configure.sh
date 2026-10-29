#!/usr/bin/env bash
# Shows or sets the options of an installed mod, whether it comes from this repository
# (<mod>@claude-mods) or from the claude.ai account (<mod>@synced). Options are per machine.
#   scripts/configure.sh <mod>                      show its options and their current state
#   scripts/configure.sh <mod> key=value [...]      set some options; the others keep their values
# Keys are checked against the mod's manifest. Values are single-line text.
# [CLAUDE] the Claude Code binary, default `claude`; CLAUDE=echo prints instead of running.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
claude="${CLAUDE:-claude}"
mod="${1:-}"
[[ -n "$mod" ]] || { sed -n '2,7s/^# \{0,1\}//p' "$0" >&2; exit 2; }
shift
manifest="$repo/plugins/$mod/.claude-plugin/plugin.json"
if [[ ! -f "$manifest" ]]; then
  available=("$repo"/plugins/*/)
  available=("${available[@]%/}")
  echo "No mod named '$mod'. Available: ${available[*]##*/}" >&2
  exit 2
fi

if [[ "$claude" == echo ]]; then
  id="$mod@<installed copy>"
else
  command -v "$claude" >/dev/null || { echo "Claude Code ($claude) is not installed" >&2; exit 1; }
  plugins="$("$claude" plugin list 2>/dev/null || true)"
  if grep -qF "$mod@claude-mods" <<<"$plugins"; then
    id="$mod@claude-mods"
  elif grep -qF "$mod@synced" <<<"$plugins"; then
    id="$mod@synced"
  else
    echo "$mod is not installed on this machine (make install $mod, or upload it to your account)" >&2
    exit 1
  fi
fi

if (($# == 0)); then
  "$claude" plugin configure "$id"
  exit 0
fi

json=""
for pair in "$@"; do
  [[ "$pair" == *=* ]] || { echo "Expected key=value, got '$pair'" >&2; exit 2; }
  key="${pair%%=*}"
  value="${pair#*=}"
  if ! [[ "$key" =~ ^[A-Za-z][A-Za-z0-9]*$ ]] || ! grep -qE "^    \"$key\": \{" "$manifest"; then
    echo "$mod has no option '$key'. Its options: $(sed -n -E 's/^    "([A-Za-z0-9]+)": \{$/\1/p' "$manifest" | tr '\n' ' ')" >&2
    exit 2
  fi
  [[ "$value" != *[[:cntrl:]]* ]] || { echo "The value of '$key' must be one line of text" >&2; exit 2; }
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  json+="${json:+,}\"$key\":\"$value\""
done

if [[ "$claude" == echo ]]; then
  echo "echo '{$json}' | claude plugin configure $id --values-stdin"
else
  printf '{%s}' "$json" | "$claude" plugin configure "$id" --values-stdin
fi
