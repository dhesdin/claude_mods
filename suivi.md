## 2026-10-29 — usage-pace, sysmon, repo structure
- Done: usage-pace (3 iterations: text band → framed cards with level colors → explicit reset sentence + separate pace card with projection); sysmon (cards GPU/CPU/RAM/disk, explicit labels, available RAM, core count, throttling, disk, machine_status tool); langmod; i18n en/fr/ja/zh; Jetson and AMD GPU sources [to validate].
- Repo: English everywhere, docs/ (architecture, development, mods-api, hardware, specs), scripts/check.sh and install.sh, GitHub CI, SECURITY.md, MIT license.
- Decisions: data from session.measure only; config via userConfig; pace as a projection instead of a point gap; two nvidia-smi calls per cycle; surface snapshots as review gate; model-facing text in English.
- Security: secret scan and history clean; untrusted names cleaned and JSON-quoted; no shell; SHA-pinned CI actions, read-only token.
- Pitfalls: `$` cannot be passed as a value; types contract without import; test stub ordering; TS2589 on $.tool.call with MCP types.
- Later: Biome lint + format, shellcheck, Trojan Source guard added to check.sh and CI; literal bidi characters found and escaped in sysmon util.ts and its test; formatter JSX-spacing pitfall fixed.
