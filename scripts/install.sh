#!/usr/bin/env bash
# Adds this folder as a Claude Code marketplace and installs every plugin it holds.
#   scripts/install.sh            install with the defaults (English)
#   scripts/install.sh --lang fr  also set the display language of every mod (en, fr, ja, zh)
# Safe to run again: an existing marketplace or plugin is left as is.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"

lang=""
if [[ "${1:-}" == "--lang" ]]; then
  lang="${2:-}"
  [[ "$lang" =~ ^(en|fr|ja|zh)$ ]] || { echo "Unknown language '$lang' (en, fr, ja, zh)" >&2; exit 2; }
fi

command -v claude >/dev/null || { echo "Claude Code (claude) is not installed" >&2; exit 1; }

if claude plugin marketplace list 2>/dev/null | grep -qF "$repo"; then
  echo "marketplace already added: $repo"
else
  claude plugin marketplace add "$repo"
fi

for dir in "$repo"/plugins/*/; do
  name="$(basename "$dir")"
  args=()
  if [[ -n "$lang" ]] && grep -q '"language"' "$dir/.claude-plugin/plugin.json"; then args+=(--config "language=$lang"); fi
  claude plugin install "$name@claude-mods" "${args[@]}" || echo "  (could not install $name: already installed? see 'claude plugin list')"
done

echo "Done. In a session that was already open: /reload-plugins"
