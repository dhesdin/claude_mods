#!/usr/bin/env bash
# Installs mods of this marketplace, all or some. Used by the Makefile; runnable alone.
#   scripts/install.sh                         add the marketplace, install every mod
#   scripts/install.sh sysmon teacher-guard    install some mods
#   scripts/install.sh --uninstall [mod...]    uninstall some mods (all without names)
#   scripts/install.sh --setup                 only add the marketplace
#   scripts/install.sh --teardown              uninstall every mod and remove the marketplace
#   scripts/install.sh --list                  mods, their description, and where they come from:
#                                              installed (this machine), account (synced from claude.ai), or -
# Options (or the environment variables in brackets):
#   --lang en|fr|ja|zh   display language of the mods installed   [MOD_LANG]
#   --scope user|project|local   where Claude Code records them   [MOD_SCOPE, default user]
#   [CLAUDE]   the Claude Code binary, default `claude`
# Safe to run again: an existing marketplace or plugin is left as is.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
marketplace=claude-mods
claude="${CLAUDE:-claude}"
lang="${MOD_LANG:-}"
scope="${MOD_SCOPE:-user}"
action=install
mods=()

while (($# > 0)); do
  case "$1" in
    --lang) lang="${2:-}"; shift 2 ;;
    --scope) scope="${2:-}"; shift 2 ;;
    --uninstall) action=uninstall; shift ;;
    --setup) action=setup; shift ;;
    --teardown) action=teardown; shift ;;
    --list) action=list; shift ;;
    -*) echo "Unknown option: $1" >&2; exit 2 ;;
    *) mods+=("$1"); shift ;;
  esac
done

[[ -z "$lang" || "$lang" =~ ^(en|fr|ja|zh)$ ]] || { echo "Unknown language '$lang' (en, fr, ja, zh)" >&2; exit 2; }
[[ "$scope" =~ ^(user|project|local)$ ]] || { echo "Unknown scope '$scope' (user, project, local)" >&2; exit 2; }
command -v "$claude" >/dev/null || { echo "Claude Code ($claude) is not installed" >&2; exit 1; }

all_mods=()
for d in "$repo"/plugins/*/; do all_mods+=("$(basename "$d")"); done
((${#mods[@]} > 0)) || mods=("${all_mods[@]}")
for m in "${mods[@]}"; do
  [[ -d "$repo/plugins/$m" ]] || { echo "No mod named '$m'. Available: ${all_mods[*]}" >&2; exit 2; }
done

description() { sed -n -E 's/^  "description": "(.*)",?$/\1/p' "$repo/plugins/$1/.claude-plugin/plugin.json"; }
plugins="$("$claude" plugin list 2>/dev/null || true)"
installed() { grep -qF "$1@$marketplace" <<<"$plugins"; }
# Already coming from the claude.ai account (uploaded there): installing it here too would duplicate it.
synced() { grep -qF "$1@synced" <<<"$plugins"; }

setup() {
  if "$claude" plugin marketplace list 2>/dev/null | grep -qF "$repo"; then
    echo "marketplace already added: $repo"
  else
    "$claude" plugin marketplace add --scope "$scope" "$repo"
  fi
}

case "$action" in
  list)
    for m in "${all_mods[@]}"; do
      if installed "$m"; then state=installed; elif synced "$m"; then state=account; else state='-'; fi
      printf '%-15s %-10s %s\n' "$m" "$state" "$(description "$m")"
    done
    ;;
  setup) setup ;;
  install)
    setup
    for m in "${mods[@]}"; do
      args=(--scope "$scope")
      if [[ -n "$lang" ]] && grep -q '"language"' "$repo/plugins/$m/.claude-plugin/plugin.json"; then args+=(--config "language=$lang"); fi
      if installed "$m"; then
        echo "$m: already installed"
      elif synced "$m"; then
        echo "$m: already on this machine from your claude.ai account ($m@synced), skipped"
      else
        "$claude" plugin install "$m@$marketplace" "${args[@]}"
      fi
    done
    echo "Done. In a session that was already open: /reload-plugins"
    ;;
  uninstall | teardown)
    [[ "$action" == teardown ]] && mods=("${all_mods[@]}")
    for m in "${mods[@]}"; do
      if installed "$m"; then "$claude" plugin uninstall "$m@$marketplace"; else echo "$m: not installed"; fi
    done
    [[ "$action" == teardown ]] && "$claude" plugin marketplace remove "$marketplace"
    echo "Done. In a session that was already open: /reload-plugins"
    ;;
esac
