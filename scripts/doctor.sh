#!/usr/bin/env bash
# Machine check for the mods: what this machine has, what each mod will see, what to do next.
# Reads only: installs nothing, needs no root.
set -u
repo="$(cd "$(dirname "$0")/.." && pwd)"
claude="${CLAUDE:-claude}"
MIN_MODS=2.1.287   # mods load from this Claude Code version (terminal)
MIN_SYNC=2.1.273   # plugins sync from the claude.ai account from this version
next=()

has() { command -v "$1" >/dev/null 2>&1; }
ok() { printf '  %-22s %s\n' "$1" "$2"; }
version_ge() { [[ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" == "$2" ]]; }

echo "== Machine"
os="$(uname -s)"
if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  distro="$(. /etc/os-release && echo "${PRETTY_NAME:-$ID}")"
else
  distro="$os"
fi
ok "system" "$distro ($(uname -m))"
if [[ "$os" == Linux ]]; then
  ok "CPU cores" "$(nproc 2>/dev/null || echo '?')"
  ok "RAM" "$(awk '/^MemTotal:/ { printf "%.1f GB", $2 / 1048576 }' /proc/meminfo 2>/dev/null)"
  grep -qi microsoft /proc/version 2>/dev/null && ok "WSL2" "yes (install the NVIDIA driver on Windows only)"
else
  next+=("sysmon reads /proc: on $os it shows n/a; teacher-guard, langmod and the others work (docs/hardware.md)")
fi

echo "== Claude Code"
if has "$claude"; then
  v="$("$claude" --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
  ok "version" "${v:-unknown}"
  if [[ -n "$v" ]] && ! version_ge "$v" "$MIN_MODS"; then next+=("update Claude Code: mods need $MIN_MODS or later (claude update)"); fi
  if [[ -n "$v" ]] && ! version_ge "$v" "$MIN_SYNC"; then next+=("account sync needs Claude Code $MIN_SYNC or later"); fi
else
  ok "version" "not installed"
  next+=("install Claude Code: https://code.claude.com/docs")
fi

echo "== GPU (sysmon)"
model="$({ tr -d '\0' </proc/device-tree/model; } 2>/dev/null || true)"
gpus="$(lspci 2>/dev/null | grep -iE 'vga|3d|display' | sed -E 's/^[^ ]+ [^:]+: //' || true)"
[[ -n "$model" ]] && ok "board" "$model"
if [[ -n "$gpus" ]]; then
  while IFS= read -r g; do ok "graphics" "$g"; done <<<"$gpus"
fi
backend=none
if [[ "$model" == *Jetson* ]]; then
  backend=jetson
  if has tegrastats; then ok "tegrastats" "found"; else next+=("Jetson without tegrastats: reinstall JetPack tools (docs/hardware.md, Jetson)"); fi
elif has nvidia-smi && nvidia-smi -L >/dev/null 2>&1; then
  backend=nvidia
  nvidia-smi -L 2>/dev/null | while IFS= read -r l; do ok "nvidia-smi" "$l"; done
elif has rocm-smi && rocm-smi --showid >/dev/null 2>&1; then
  backend=amd
  ok "rocm-smi" "found"
else
  if grep -qi nvidia <<<"$gpus"; then next+=("NVIDIA GPU without a working driver: install it (docs/hardware.md, Linux PC or laptop with an NVIDIA GPU)"); fi
  if grep -qiE 'amd|radeon' <<<"$gpus" && ! grep -qi nvidia <<<"$gpus"; then next+=("AMD GPU without rocm-smi: install ROCm to see it in sysmon (docs/hardware.md, AMD GPU)"); fi
fi
ok "sysmon will use" "$backend (gpuBackend = auto)"

echo "== Tools"
for t in git make df; do if has "$t"; then ok "$t" "found"; else ok "$t" "missing"; fi; done
# A Python 3 that runs: on Windows `python3` is often the Microsoft Store alias, found but unusable.
py=""
for c in python3 python; do
  if "$c" -c 'import sys; sys.exit(sys.version_info < (3, 8))' >/dev/null 2>&1; then py="$c"; break; fi
done
if [[ -n "$py" ]]; then ok "python 3" "$py"; else ok "python 3" "missing"; next+=("Python 3 is needed for make user-settings and the status line"); fi
if [[ "$(uname -s)" == Linux ]]; then
  if has notify-send; then ok "notify-send" "found"; else ok "notify-send" "missing"; next+=("notify needs notify-send: sudo apt install libnotify-bin (or your distribution's libnotify package)"); fi
elif [[ "$(uname -s)" =~ ^(MINGW|MSYS|CYGWIN) ]]; then
  if has powershell.exe; then ok "powershell.exe" "found (notify)"; else ok "powershell.exe" "missing (notify)"; fi
fi
has make || next+=("without make, use scripts/install.sh (same options)")

echo "== User settings (make user-settings)"
cfg="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
window="$("${py:-python3}" -I -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("autoCompactWindow","unset") if d.get("autoCompactEnabled",True) else "auto-compaction off")' "$cfg/settings.json" 2>/dev/null || echo unset)"
ok "compaction window" "$window"
if grep -q 'load-context.sh' "$cfg/settings.json" 2>/dev/null && [[ -x "$cfg/hooks/load-context.sh" ]]; then ok "hand-off notes hook" "installed"; else ok "hand-off notes hook" "missing"; fi
if grep -q 'statusline.py' "$cfg/settings.json" 2>/dev/null && [[ -f "$cfg/statusline.py" ]]; then
  if cmp -s "$repo/user/statusline.py" "$cfg/statusline.py"; then ok "status line" "installed"; else ok "status line" "older than user/statusline.py"; fi
else ok "status line" "missing"; fi
if [[ -L "$cfg/CLAUDE.md" ]]; then
  if [[ -e "$cfg/CLAUDE.md" ]]; then ok "global rules" "linked to $(readlink "$cfg/CLAUDE.md")"; else ok "global rules" "BROKEN link"; next+=("$cfg/CLAUDE.md points to a missing file: make user-settings RULES=1"); fi
elif [[ -f "$cfg/CLAUDE.md" ]] && grep -qE '^@.*user/CLAUDE\.md$' "$cfg/CLAUDE.md"; then ok "global rules" "imports $(grep -m1 -E '^@' "$cfg/CLAUDE.md" | cut -c2-)"
elif [[ -f "$cfg/CLAUDE.md" ]]; then ok "global rules" "own file (not linked to this repository)"; else ok "global rules" "none"; fi
[[ "$window" == 300000 && "$(grep -c 'load-context.sh' "$cfg/settings.json" 2>/dev/null)" != 0 ]] && cmp -s "$repo/user/statusline.py" "$cfg/statusline.py" || next+=("per-machine settings: make user-settings (see docs/install.md)")

echo "== Mods"
CLAUDE="$claude" "$repo/scripts/install.sh" --list 2>/dev/null | sed 's/^/  /' || echo "  (claude not available)"

echo "== Next"
if ((${#next[@]} == 0)); then
  echo "  nothing to fix: make install [<mod>...] MOD_LANG=en|fr|ja|zh, or ask Claude: /install-mods"
else
  for n in "${next[@]}"; do echo "  - $n"; done
fi
