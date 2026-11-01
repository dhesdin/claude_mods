#!/usr/bin/env python3
# Claude Code status line: model, folder, git branch, context, 5-hour and weekly usage with the weekly pace.
# Claude Code pipes the session JSON on stdin (https://code.claude.com/docs/en/statusline); figures are
# never estimated, only the weekly projection is computed. Usage: statusline.py [en|fr|ja|zh]
import json, re, subprocess, sys, time
from datetime import datetime
from pathlib import Path

BAR = 10
PACE_MIN_HOURS = 3
WEEK = 7 * 86400
STRINGS = {
    "en": {"week": "7d", "day": "d", "days": "Mon Tue Wed Thu Fri Sat Sun"},
    "fr": {"week": "7j", "day": "j", "days": "lun. mar. mer. jeu. ven. sam. dim."},
    "ja": {"week": "7日", "day": "日", "days": "月 火 水 木 金 土 日"},
    "zh": {"week": "7天", "day": "天", "days": "周一 周二 周三 周四 周五 周六 周日"},
}
RESET, BOLD, DIM = "\033[0m", "\033[1m", "\033[2m"
GREEN, BLUE = "\033[32m", "\033[34m"


def level(pct):
    # Green < 50 %, yellow 50-75, orange 75-90, red >= 90 (the usage-pace thresholds).
    if pct >= 90:
        return "\033[31m"
    if pct >= 75:
        return "\033[38;5;208m"
    if pct >= 50:
        return "\033[33m"
    return "\033[32m"


def clean(text):
    # Folder names and model names are outside text: no control or bidi characters reach the terminal.
    return re.sub(r"[\x00-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2066-\u2069]", "", str(text))[:40]


def bar(pct):
    full = round(max(0, min(100, pct)) / 100 * BAR)
    return f"{level(pct)}{'■' * full}{RESET}{DIM}{'■' * (BAR - full)}{RESET}  {level(pct)}{pct:.0f}%{RESET}"


def duration(s, seconds):
    m = max(0, int(seconds) // 60)
    d, h, m = m // 1440, m % 1440 // 60, m % 60
    return f"{d}{s['day']}{h:02d}h" if d else f"{h}h{m:02d}"


def tokens(n):
    return f"{n / 1e6:.1f}M" if n >= 1e6 else f"{n / 1e3:.0f}k" if n >= 1e3 else str(int(n))


def branch(folder):
    try:
        out = subprocess.run(["git", "-C", folder, "branch", "--show-current"], capture_output=True, text=True, timeout=1)
        return clean(out.stdout.strip())
    except (OSError, subprocess.SubprocessError):
        return ""


def window(data, kind):
    w = (data.get("rate_limits") or {}).get(kind) or {}
    pct, at = w.get("used_percentage"), w.get("resets_at")
    return (float(pct), float(at)) if isinstance(pct, (int, float)) and isinstance(at, (int, float)) else None


def pace(s, pct, at, now):
    # Linear projection of the weekly % at the average rate since the last reset.
    elapsed = min(WEEK, max(0, WEEK - (at - now)))
    if elapsed < PACE_MIN_HOURS * 3600 or pct <= 0:
        return "", ""
    rate = pct / elapsed
    projected = pct + rate * (at - now)
    if projected < 100:
        return "", f" {DIM}→{RESET} {level(projected)}~{projected:.0f}%{RESET}"
    hit = datetime.fromtimestamp(now + (100 - pct) / rate)
    day = s["days"].split()[hit.weekday()]
    return "💀 ", f" {DIM}→{RESET} {level(100)}{BOLD}100% {day} {hit:%H:%M}{RESET}"


def main():
    s = STRINGS.get(sys.argv[1] if len(sys.argv) > 1 else "en", STRINGS["en"])
    data = json.load(sys.stdin)
    now = time.time()
    ws = data.get("workspace") or {}
    folder = ws.get("project_dir") or ws.get("current_dir") or data.get("cwd") or ""
    head = [f"🤖 {BOLD}{clean((data.get('model') or {}).get('display_name', '?'))}{RESET}"]
    if folder:
        head.append(f"📁 {BLUE}{clean(Path(folder).name)}{RESET}")
        b = branch(ws.get("current_dir") or folder)
        if b:
            head.append(f"🌿 {GREEN}{b}{RESET}")
    lines = [f" {DIM}│{RESET} ".join(head)]
    cw = data.get("context_window") or {}
    ctx, used = cw.get("used_percentage"), cw.get("total_input_tokens")
    if isinstance(ctx, (int, float)):
        # total_input_tokens is what used_percentage is computed from (input + cache writes + cache reads).
        count = f" {DIM}·{RESET} {tokens(used)}" if isinstance(used, (int, float)) and used > 0 else ""
        lines.append(f"🧠 ctx {bar(float(ctx))}{count}")
    else:
        lines.append(f"🧠 ctx {DIM}n/a{RESET}")
    five = window(data, "five_hour")
    if five:
        lines.append(f"⏳ 5h {bar(five[0])} {DIM}·{RESET} {duration(s, five[1] - now)}")
    week = window(data, "seven_day")
    if week:
        skull, projection = pace(s, week[0], week[1], now)
        lines.append(f"📅 {s['week']} {skull}{bar(week[0])} {DIM}·{RESET} {duration(s, week[1] - now)}{projection}")
    print("\n".join(lines))


try:
    main()
except Exception:
    print("🤖 status line: n/a")
