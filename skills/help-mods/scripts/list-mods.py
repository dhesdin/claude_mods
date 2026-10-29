#!/usr/bin/env python3
"""Lists the claude-mods mods on this machine: installed or not, enabled or not, what each does. Reads only."""

import json
import re
import shutil
import subprocess
import sys

MARKETPLACE = "claude-mods"
REPO = "https://github.com/dhesdin/claude_mods.git"
CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f]")


def claude(*args: str) -> str:
    try:
        return subprocess.run(["claude", "plugin", *args], capture_output=True, text=True, timeout=60).stdout
    except (OSError, subprocess.TimeoutExpired):
        return ""


def clean(text: object, limit: int = 140) -> str:
    out = CONTROL.sub(" ", str(text)).strip()
    return out if len(out) <= limit else out[: limit - 1] + "…"


def installed_mods() -> dict:
    """`claude plugin list` blocks: "❯ name@marketplace", then "Key: value" lines."""
    mods, current = {}, None
    for line in claude("list").splitlines():
        head = re.match(r"^\s*❯\s+(\S+)@(\S+)\s*$", line)
        if head:
            current = head.group(1) if head.group(2) == MARKETPLACE else None
            if current:
                mods[current] = {}
            continue
        field = re.match(r"^\s+([A-Za-z ]+):\s*(.*)$", line)
        if current and field:
            mods[current][field.group(1).strip().lower()] = field.group(2).strip()
    return mods


def main() -> None:
    if not shutil.which("claude"):
        print("Claude Code (claude) is not on PATH.")
        return
    if MARKETPLACE not in claude("marketplace", "list"):
        print(f"The {MARKETPLACE} mods are not set up on this machine. To get them:")
        print(f"  git clone {REPO} ~/claude-mods && cd ~/claude-mods && make install")
        return

    installed = installed_mods()
    descriptions = {}
    try:
        available = json.loads(claude("list", "--available", "--json") or "{}").get("available", [])
    except ValueError:
        available = []
    for plugin in available:
        if plugin.get("marketplaceName") == MARKETPLACE:
            descriptions[plugin.get("name")] = plugin.get("description", "")
    for name, info in installed.items():
        folder = info.get("read from")
        if folder and name not in descriptions:
            try:
                with open(f"{folder}/.claude-plugin/plugin.json", encoding="utf-8") as f:
                    descriptions[name] = json.load(f).get("description", "")
            except (OSError, ValueError):
                pass

    print(f"Mods ({MARKETPLACE})")
    for name in sorted(set(descriptions) | set(installed), key=str):
        info = installed.get(name)
        state = "not installed" if info is None else ("enabled" if "enabled" in info.get("status", "") else "disabled")
        print(f"  {clean(name, 20):<16} {state:<14} {clean(descriptions.get(name, ''))}")
    print()
    print("Install: make install <mod> (in the claude-mods clone)  ·  options: /config  ·  disable: claude plugin disable <mod>@claude-mods")


if __name__ == "__main__":
    sys.exit(main())
