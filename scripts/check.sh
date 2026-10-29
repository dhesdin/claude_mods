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
