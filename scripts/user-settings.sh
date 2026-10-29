#!/usr/bin/env bash
# The Claude Code settings no plugin can carry: run once per machine (safe to run again).
#   scripts/user-settings.sh              apply, after a timestamped backup of settings.json
#   scripts/user-settings.sh --dry-run    show what would change, write nothing
#   scripts/user-settings.sh --window N   auto-compact window in tokens (default 300000)
# It merges into ~/.claude/settings.json (or $CLAUDE_CONFIG_DIR/settings.json) and keeps every other key:
#   - autoCompactEnabled: true, autoCompactWindow: N (docs: settings reference, autoCompactWindow);
#   - removes env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, which can only lower the threshold and hides the window;
#   - once the project-memory mod is installed, removes the SessionStart hook that ran
#     charger-contexte.sh (the mod loads the notes now; keeping both would load them twice).
# [CLAUDE] the Claude Code binary, default `claude`.
set -euo pipefail

claude="${CLAUDE:-claude}"
dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
window=300000
dry=0
while (($# > 0)); do
  case "$1" in
    --dry-run) dry=1; shift ;;
    --window) window="${2:-}"; shift 2 ;;
    *) sed -n '2,5s/^# \{0,1\}//p' "$0" >&2; exit 2 ;;
  esac
done
if ! [[ "$window" =~ ^[0-9]+$ ]] || ((window < 100000 || window > 1000000)); then
  echo "--window: 100000 to 1000000 tokens" >&2
  exit 2
fi
command -v python3 >/dev/null || { echo "python3 is needed (it edits the JSON safely)" >&2; exit 1; }

version="$("$claude" --version 2>/dev/null | cut -d' ' -f1 || true)"
echo "Claude Code: ${version:-not found}"
memory=0
if [[ -n "$version" ]] && "$claude" plugin list 2>/dev/null | grep -q 'project-memory@'; then memory=1; fi

mkdir -p "$dir"
settings="$dir/settings.json"
[[ -f "$settings" ]] || echo '{}' >"$settings"

python3 -I - "$settings" "$window" "$memory" "$dry" <<'PY'
import json, shutil, sys, time
path, window, memory, dry = sys.argv[1], int(sys.argv[2]), sys.argv[3] == "1", sys.argv[4] == "1"
with open(path, encoding="utf-8") as f:
    data = json.load(f)
before = json.dumps(data, sort_keys=True)
changes = []

def put(key, value):
    if data.get(key) != value:
        changes.append(f"{key}: {json.dumps(data.get(key))} -> {json.dumps(value)}")
        data[key] = value

put("autoCompactEnabled", True)
put("autoCompactWindow", window)
env = data.get("env") or {}
if "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE" in env:
    changes.append(f"env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: {json.dumps(env.pop('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE'))} -> removed")
    if env: data["env"] = env
    else: data.pop("env", None)

old_hook = lambda h: str(h.get("command", "")).endswith("charger-contexte.sh")
groups = (data.get("hooks") or {}).get("SessionStart") or []
if any(old_hook(h) for g in groups for h in g.get("hooks", [])):
    if memory:
        kept = [g for g in ({**g, "hooks": [h for h in g.get("hooks", []) if not old_hook(h)]} for g in groups) if g["hooks"]]
        changes.append("hooks.SessionStart: charger-contexte.sh removed (project-memory loads the notes)")
        if kept: data["hooks"]["SessionStart"] = kept
        else:
            data["hooks"].pop("SessionStart")
            if not data["hooks"]: data.pop("hooks")
    else:
        print("Kept the charger-contexte.sh hook: project-memory is not installed here yet (run this again once it is).")

if json.dumps(data, sort_keys=True) == before:
    print(f"{path}: already up to date.")
    sys.exit(0)
print(f"{path}:" + "".join(f"\n  {c}" for c in changes))
if dry:
    print("(dry run: nothing written)")
    sys.exit(0)
backup = f"{path}.{time.strftime('%Y%m%d-%H%M%S')}.bak"
shutil.copy2(path, backup)
with open(path + ".tmp", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")
shutil.move(path + ".tmp", path)
print(f"Backup: {backup}\nApplies to sessions started from now on.")
PY

if [[ -f "$dir/CLAUDE.md" ]] && grep -qE 'token-economy|project-handoff' "$dir/CLAUDE.md" && ((memory)); then
  echo "Note: $dir/CLAUDE.md still holds rules that project-memory now loads; remove them there to avoid reading them twice."
fi
