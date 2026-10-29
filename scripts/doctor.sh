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
  next+=("sysmon reads /proc: on $os it shows n/a; usage-pace, teacher-guard and langmod work (docs/hardware.md)")
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
for t in git make python3 df; do if has "$t"; then ok "$t" "found"; else ok "$t" "missing"; fi; done
has make || next+=("without make, use scripts/install.sh (same options)")

echo "== Mods"
CLAUDE="$claude" "$repo/scripts/install.sh" --list 2>/dev/null | sed 's/^/  /' || echo "  (claude not available)"

echo "== Next"
if ((${#next[@]} == 0)); then
  echo "  nothing to fix: make install [<mod>...] MOD_LANG=en|fr|ja|zh, or ask Claude: /install-mods"
else
  for n in "${next[@]}"; do echo "  - $n"; done
fi
