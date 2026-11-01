#!/usr/bin/env bash
# Per-machine Claude Code setup that no plugin can carry. Run once per machine, again after a `git pull`
# that changes user/ (safe to run again: it only changes what differs, after a timestamped backup).
#   scripts/user-settings.sh              compaction window + hand-off notes hook + status line
#   scripts/user-settings.sh --rules      also link ~/.claude/CLAUDE.md to this repository's user/CLAUDE.md
#   scripts/user-settings.sh --dry-run    show what would change, write nothing
#   scripts/user-settings.sh --window N   auto-compact window in tokens (default 300000)
#   scripts/user-settings.sh --lang fr    status line language: en, fr, ja, zh (default $MOD_LANG, else en)
#   scripts/user-settings.sh --statusline replace a status line that is not this repository's
# What it does, in ~/.claude (or $CLAUDE_CONFIG_DIR):
#   - settings.json, merged, every other key kept: autoCompactEnabled true, autoCompactWindow N;
#     env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE removed (it can only lower the threshold);
#     one SessionStart hook (startup, resume, /clear, compaction) running hooks/load-context.sh,
#     replacing an older charger-contexte.sh or load-context.sh entry;
#     statusLine running statusline.py, unless the user already has a status line of their own (--statusline);
#   - hooks/load-context.sh: a copy of user/hooks/load-context.sh (a copy keeps working if the clone moves);
#   - statusline.py: a copy of user/statusline.py;
#   - with --rules, CLAUDE.md: a symbolic link to user/CLAUDE.md (one source: an edit on either side is the
#     same file, a `git pull` updates the rules); a different existing file is backed up first.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
window=300000
dry=0
rules=0
lang="${MOD_LANG:-en}"
force_line=0
while (($# > 0)); do
  case "$1" in
    --dry-run) dry=1; shift ;;
    --rules) rules=1; shift ;;
    --window) window="${2:-}"; shift 2 ;;
    --lang) lang="${2:-}"; shift 2 ;;
    --statusline) force_line=1; shift ;;
    *) sed -n '2,7s/^# \{0,1\}//p' "$0" >&2; exit 2 ;;
  esac
done
if ! [[ "$window" =~ ^[0-9]+$ ]] || ((window < 100000 || window > 1000000)); then
  echo "--window: 100000 to 1000000 tokens" >&2
  exit 2
fi
case "$lang" in en | fr | ja | zh) ;; *) echo "--lang: en, fr, ja or zh" >&2; exit 2 ;; esac
command -v python3 >/dev/null || { echo "python3 is needed (it edits the JSON safely)" >&2; exit 1; }

stamp="$(date +%Y%m%d-%H%M%S)"
say() { if ((dry)); then echo "  would: $*"; else echo "  $*"; fi; }
mkdir -p "$dir/hooks"

# 1. The hook script, copied.
hook="$dir/hooks/load-context.sh"
if ! cmp -s "$repo/user/hooks/load-context.sh" "$hook"; then
  say "copy user/hooks/load-context.sh -> $hook"
  if ((!dry)); then
    [[ -f "$hook" ]] && cp -p "$hook" "$hook.$stamp.bak"
    install -m 755 "$repo/user/hooks/load-context.sh" "$hook"
  fi
fi

# 2. The status line script, copied.
line="$dir/statusline.py"
if ! cmp -s "$repo/user/statusline.py" "$line"; then
  say "copy user/statusline.py -> $line"
  if ((!dry)); then
    [[ -f "$line" ]] && cp -p "$line" "$line.$stamp.bak"
    install -m 755 "$repo/user/statusline.py" "$line"
  fi
fi

# 3. settings.json.
settings="$dir/settings.json"
[[ -f "$settings" ]] || ((dry)) || echo '{}' >"$settings"
python3 -I - "$settings" "$window" "$hook" "$dry" "$stamp" "$line" "$lang" "$force_line" <<'PY'
import json, os, shlex, shutil, sys
path, window, hook, dry, stamp = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4] == "1", sys.argv[5]
line, lang, force_line = sys.argv[6], sys.argv[7], sys.argv[8] == "1"
data = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
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

ours = lambda h: str(h.get("command", "")).endswith(("charger-contexte.sh", "load-context.sh"))
wanted = {"matcher": "startup|resume|clear|compact",
          "hooks": [{"type": "command", "command": hook, "timeout": 10, "statusMessage": "Loading the project's hand-off notes…"}]}
hooks = data.get("hooks") or {}
others = [g for g in ({**g, "hooks": [h for h in g.get("hooks", []) if not ours(h)]} for g in hooks.get("SessionStart", [])) if g["hooks"]]
if hooks.get("SessionStart", []) != others + [wanted]:
    changes.append(f"hooks.SessionStart: runs {hook}")
    hooks["SessionStart"] = others + [wanted]
    data["hooks"] = hooks

current = data.get("statusLine")
if current and "statusline.py" not in str(current.get("command", "")) and not force_line:
    print("  statusLine: kept your own (--statusline replaces it)")
else:
    put("statusLine", {"type": "command", "command": f"python3 -I {shlex.quote(line)} {lang}", "refreshInterval": 60})

if json.dumps(data, sort_keys=True) == before:
    print(f"  {path}: up to date")
    sys.exit(0)
for c in changes:
    print(("  would: " if dry else "  ") + c)
if dry:
    sys.exit(0)
if os.path.exists(path):
    shutil.copy2(path, f"{path}.{stamp}.bak")
with open(path + ".tmp", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")
os.replace(path + ".tmp", path)
print(f"  backup: {path}.{stamp}.bak")
PY

# 4. The global rules, linked (only when asked: they are this repository owner's own rules).
if ((rules)); then
  target="$repo/user/CLAUDE.md"
  link="$dir/CLAUDE.md"
  if [[ -L "$link" && "$(readlink "$link")" == "$target" ]]; then
    echo "  $link: already linked to $target"
  else
    if [[ -e "$link" || -L "$link" ]] && ! cmp -s "$link" "$target"; then
      echo "  $link differs from $target:"
      diff "$link" "$target" | sed 's/^/    /' || true
    fi
    say "link $link -> $target"
    if ((!dry)); then
      [[ -e "$link" || -L "$link" ]] && mv "$link" "$link.$stamp.bak" && echo "  backup: $link.$stamp.bak"
      ln -s "$target" "$link"
    fi
  fi
fi
((dry)) && echo "(dry run: nothing written)"
echo "Applies to sessions started from now on."
