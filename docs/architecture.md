# Architecture

## Repository layout

```
claude-mods/
├── .claude-plugin/marketplace.json   # the marketplace: one entry per plugin
├── .github/                          # CI (validate + test every plugin) and Dependabot
├── docs/
│   ├── architecture.md               # this file
│   ├── development.md                # dev loop, tests, CI, pitfalls
│   ├── mods-api.md                   # the parts of the mods API used here, verified
│   ├── hardware.md                   # machine setup per hardware, validation checklists
│   └── specs/NN-<mod>.md             # functional spec, one per mod
├── plugins/<mod>/                    # one independent plugin per mod
├── scripts/
│   ├── check.sh                      # everything CI runs, runnable locally (--fix formats)
│   ├── doctor.sh                     # machine check (make doctor): system, Claude Code, GPU, next steps
│   └── install.sh                    # what the Makefile runs: setup, install/uninstall some or all mods
├── biome.json                        # formatter and linter config
├── .editorconfig                     # editor defaults matching the formatter
├── Makefile                          # modular install (make install sysmon …) and checks
├── config.mk.example                 # per-machine make defaults (copy to config.mk, git-ignored)
├── .claude/skills/install-mods/      # project skill: guided install (/install-mods) for whoever clones the repo
├── CLAUDE.md                         # rules for Claude Code working in this repo
├── SECURITY.md                       # threat model and reporting
└── LICENSE                           # MIT
```

`.claude/contexte.md` and `suivi.md` are the session hand-off notes (current state and dated log), kept by the `passation-projet` skill.

## Anatomy of a mod

```
plugins/<mod>/
├── .claude-plugin/plugin.json   # name, version, description, license, types, userConfig
├── hooks/hooks.json             # { "modules": ["./register.tsx"] }
├── hooks/register.tsx           # entry point: export const register: Register = (on, options) => { ... }
├── hooks/i18n.ts                # display strings, one table per language
├── hooks/<topic>.ts             # pure parsers / samplers, unit-tested
├── types/index.d.ts             # $.state contract (self-contained: no import)
├── tests/<mod>.test.tsx         # claude plugin test
├── surface.txt                  # expected hooks/calls snapshot, checked by scripts/check.sh
└── README.md                    # what it does, config, how to disable
```

Rules:
- **One plugin = one mod**, installable and disableable alone. A plugin imports only its own files: shared code is duplicated on purpose (it is small) rather than coupling plugins.
- **Pure core, thin shell.** Parsing and computation live in pure functions (`parseNvidia`, `pace`…) tested directly. `register.tsx` wires events, `$` calls and drawing.
- **`$` is never passed as a value** (the validator refuses it). Code that needs system access outside a hook receives an `Io` object of closures built inside `session.start` (see `plugins/sysmon/hooks/register.tsx`).
- **Config** is the manifest's `userConfig`: defaults in `plugin.json`, values set in `/config` (stored under `pluginConfigs` in `~/.claude/settings.json`). Nothing machine-specific is hard-coded.
- **Persistent data**, when a mod needs it, goes in `~/.claude/mod-data/<mod>/`.
- **Degrade, never crash**: missing data shows `n/a` or hides a card; every `$` call that can fail is caught.

## Distribution

The repository is the source: code, tests, CI, versions. Users get the mods either from their claude.ai account (`make dist`, then upload each zip: synced to every machine where they sign in) or per machine (`make install`). Avoid both on one machine: an installed marketplace copy takes precedence over the synced one.

## Common constraints

- **Zero network.** No mod makes a network request; `scripts/check.sh` fails if a plugin calls `$.http`.
- **Zero tokens** for display. A token cost (a tool the model calls, an injected instruction) must be asked for by the spec.
- **Minimal cost**: no polling while a pane is closed; intervals are configurable.
- **Strict TypeScript**, short readable code, comments in English.

## Internationalization

Each mod with visible text has a `language` field in `userConfig`:

```json
"language": { "type": "string", "options": ["en", "fr", "ja", "zh"], "default": "en" }
```

- `/config` shows it as a picker (clickable). `/langmod <code>` (plugin `langmod`) sets it for every mod at once: it changes each `/config` row named `<plugin>.language` whose options include all four codes.
- Strings live in `hooks/i18n.ts`: a `Strings` type and one table per language; an unknown code falls back to English.
- Text meant for the model (tool results) stays English.
- **Adding a language**: add the code to `language.options` in each plugin.json, a table in each `hooks/i18n.ts`, and the code to `LANGS` in `plugins/langmod/hooks/register.ts`. Available today: `en`, `fr`, `ja`, `zh`.

## Adding a mod

1. Write `docs/specs/NN-<mod>.md`.
2. Create `plugins/<mod>/` with the anatomy above (copy the smallest existing plugin as a start).
3. Add an entry to `.claude-plugin/marketplace.json` (the Makefile and `/help-mods` pick it up from there and from `plugins/`).
4. Generate its surface snapshot: `scripts/check.sh --update-surface <mod>`, then review the diff.
5. `scripts/check.sh` green, then validate on screen (docs/development.md).

## Versioning

Each plugin carries its own `version` (semver) in `plugin.json`: bump the minor version for a new feature or option, the patch version for a fix. A change of a stored `$.state` value's shape also bumps its `shape` tag in code, so values written by an older version are discarded instead of misread.
