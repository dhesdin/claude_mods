#!/usr/bin/env bash
# Every check CI runs, runnable locally.
#   scripts/check.sh                       all plugins
#   scripts/check.sh sysmon usage-pace     some plugins
#   scripts/check.sh --update-surface <mod>...   rewrite surface.txt after a reviewed change
#   scripts/check.sh --fix                 format and apply safe lint fixes, then exit
set -euo pipefail
cd "$(dirname "$0")/.."

# Tool versions, pinned (bump deliberately, never to a release younger than two weeks).
TS_VERSION=5.6.3
BIOME_VERSION=2.5.15
biome() { npx -y "@biomejs/biome@$BIOME_VERSION" "$@"; }

if [[ "${1:-}" == "--fix" ]]; then
  biome check --write --colors=off .
  exit
fi

update=false
if [[ "${1:-}" == "--update-surface" ]]; then
  update=true
  shift
fi
mods=()
if (($# > 0)); then
  mods=("$@")
else
  for d in plugins/*/; do mods+=("$(basename "$d")"); done
fi

failed=0
fail() { echo "  FAIL: $*"; failed=1; }

echo "== lint and format (Biome $BIOME_VERSION)"
if out=$(biome ci --colors=off . 2>&1); then echo "  ok"; else echo "$out" | tail -40; fail "biome (fix with: scripts/check.sh --fix)"; fi

echo "== shell scripts"
if command -v shellcheck >/dev/null; then
  if shellcheck --severity=warning scripts/*.sh; then echo "  ok"; else fail "shellcheck"; fi
else
  echo "  skipped (shellcheck not installed; CI runs it)"
fi

# Trojan Source: invisible bidi / zero-width characters can make code read differently than it runs.
echo "== invisible characters"
if hits=$(git ls-files -z | xargs -0 grep -lP '[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}]' 2>/dev/null); then
  echo "$hits"
  fail "invisible bidi/zero-width characters (write them as \\u escapes)"
else
  echo "  ok"
fi

# hooks / calls / state lines of a validation: what the plugin is allowed to touch.
surface_of() { sed -n -E 's/^ +❯ (\.\/[^ ]+ (hooks|calls|state reads|state writes|env reads|env writes|answers its own command|gating hook)[^:]*:.*)$/\1/p; s/^ +❯ (types \.\/.*)$/\1/p'; }

echo "== docs links"
if out=$(git ls-files -z '*.md' | python3 -I -c '
import os, re, sys
bad = []
for f in sys.stdin.read().split("\0"):
    if not f or not os.path.exists(f):
        continue
    for m in re.finditer(r"\]\(([^)#\s]+)(#[^)]*)?\)", open(f, encoding="utf-8").read()):
        target = m.group(1)
        if not target.startswith(("http", "mailto")) and not os.path.exists(os.path.join(os.path.dirname(f), target)):
            bad.append(f"{f}: {target}")
print("\n".join(bad))
sys.exit(1 if bad else 0)
'); then echo "  ok"; else echo "$out"; fail "broken relative links in docs"; fi

echo "== docs coverage"
# Every mod is in the README table, in docs/mods.md (its own section) and in the marketplace;
# every option of its manifest is named in that section and in the mod's README.
if out=$(python3 -I -c '
import json, os, re
bad = []
readme = open("README.md", encoding="utf-8").read()
catalog = open("docs/mods.md", encoding="utf-8").read()
sections = {m.group(1): m.group(2) for m in re.finditer(r"^## (\S+)\n(.*?)(?=^## |\Z)", catalog, re.M | re.S)}
listed = [p["name"] for p in json.load(open(".claude-plugin/marketplace.json"))["plugins"]]
for mod in sorted(os.listdir("plugins")):
    manifest = json.load(open(f"plugins/{mod}/.claude-plugin/plugin.json"))
    own = open(f"plugins/{mod}/README.md", encoding="utf-8").read() if os.path.exists(f"plugins/{mod}/README.md") else ""
    if f"](plugins/{mod})" not in readme: bad.append(f"README.md: no row for {mod}")
    if mod not in sections: bad.append(f"docs/mods.md: no section ## {mod}")
    if mod not in listed: bad.append(f".claude-plugin/marketplace.json: {mod} missing")
    if not own: bad.append(f"plugins/{mod}/README.md missing")
    for key in manifest.get("userConfig", {}):
        if f"`{key}`" not in sections.get(mod, ""): bad.append(f"docs/mods.md ## {mod}: option `{key}` not described")
        if f"`{key}`" not in own: bad.append(f"plugins/{mod}/README.md: option `{key}` not described")
print("\n".join(bad))
raise SystemExit(1 if bad else 0)
'); then echo "  ok"; else echo "$out"; fail "a mod or an option is missing from the docs"; fi

echo "== doctor"
if scripts/doctor.sh >/dev/null 2>&1; then echo "  runs"; else fail "scripts/doctor.sh fails"; fi

echo "== marketplace"
if out=$(claude plugin validate . 2>&1); then echo "  validate ok"; else echo "$out" | tail -20; fail "marketplace validation"; fi

for mod in "${mods[@]}"; do
  echo "== $mod"
  if [[ ! "$mod" =~ ^[a-z0-9-]+$ || ! -d "plugins/$mod" ]]; then
    fail "no plugin named '$mod'"
    continue
  fi
  dir="plugins/$mod"
  grep -q "\"./plugins/$mod\"" .claude-plugin/marketplace.json || fail "missing from .claude-plugin/marketplace.json"

  if ! out=$(claude plugin validate "$dir" 2>&1); then
    echo "$out" | tail -30
    fail "validate"
    continue
  fi
  echo "  validate ok"

  surface=$(surface_of <<<"$out")
  if $update; then
    printf '%s\n' "$surface" >"$dir/surface.txt"
    echo "  surface.txt written: review the diff before committing"
  elif ! diff -u "$dir/surface.txt" <(printf '%s\n' "$surface") >/dev/null 2>&1; then
    diff -u "$dir/surface.txt" <(printf '%s\n' "$surface") || true
    fail "hooks/calls differ from surface.txt (reviewed change? scripts/check.sh --update-surface $mod)"
  else
    echo "  surface ok"
  fi

  if grep -q '\$\.http\.' <<<"$surface"; then fail "network call (\$.http): forbidden by the zero-network rule"; fi

  if compgen -G "$dir/tests/*.test.*" >/dev/null; then
    if out=$(claude plugin test "$dir" 2>&1); then
      echo "  tests ok ($(grep -Eo '[0-9]+ pass' <<<"$out" | head -1))"
    else
      echo "$out" | grep -E '^\(fail\)|Expected|Received|Error' | head -30
      fail "tests"
    fi
  else
    fail "no tests in $dir/tests"
  fi

  if [[ -f "$dir/.claude-plugin/types/tsconfig.json" && -f "$dir/tsconfig.json" ]]; then
    if out=$(npx -y -p "typescript@$TS_VERSION" tsc -p "$dir" 2>&1); then echo "  types ok"; else echo "$out" | head -30; fail "type-check"; fi
  else
    echo "  types skipped (engine types not laid: load the plugin once in a Claude Code session)"
  fi
done

if ((failed)); then
  echo "== FAILED"
  exit 1
fi
echo "== all checks passed"
