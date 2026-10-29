# Development

## Requirements

- Claude Code (`claude --version`; this repo is checked against 2.1.312).
- Node.js ≥ 20 with `npx` (Biome and the type-check are fetched by `npx` at pinned versions).
- Optional: `shellcheck` (CI always runs it).
- Linux for the sysmon samplers (`/proc`, `df`).

## The loop

```bash
make check                  # = scripts/check.sh
scripts/check.sh            # everything CI runs, on every plugin
scripts/check.sh sysmon     # one plugin
scripts/check.sh --fix      # format and apply safe lint fixes
```

Repository-wide, `scripts/check.sh` first runs:
- **Biome** (`biome.json`): formatter (2 spaces, single quotes, no semicolons, width 140) and linter (recommended rules; `!` assertions allowed in tests only). An exception in code is a `// biome-ignore <rule>: <reason>` comment on the line, never a rule turned off globally.
- **shellcheck** on `scripts/*.sh` (warnings and errors), skipped with a notice when not installed.
- **Invisible characters**: fails if a tracked file holds a bidi-override or zero-width character (Trojan Source). Write such characters as `\u` escapes.

Then, for each plugin:
1. runs `claude plugin validate`;
2. compares the `hooks:` / `calls:` / `state` lines of that validation with `plugins/<mod>/surface.txt`, and fails on any difference (a new hook or call is a reviewed decision, see SECURITY.md);
3. fails if the plugin calls `$.http` (zero-network rule);
4. runs `claude plugin test`;
5. type-checks with `tsc` when the engine's types are present (`plugins/<mod>/.claude-plugin/types/`, laid by a session that loaded the plugin); otherwise it says it skipped.

After a deliberate change of hooks or calls: `scripts/check.sh --update-surface <mod>`, then review the diff of `surface.txt` in the commit.

## Running a plugin from disk

- In a terminal: `claude --plugin-dir ./plugins/<mod>` (repeat the flag for several). Saving a file reloads the plugin.
- In a session where Claude edits the mods: ask Claude to load the `plugin-authoring` skill; it links `plugins/<mod>` into the session's mods folder, and the person accepts "Turn on the mods…" once. Every later edit reloads at the end of the turn.
- From the installed marketplace (a local folder): edit, then `/reload-plugins` in the session.

## Formatting pitfall

The formatter collapses runs of spaces in JSX text (`<Text>GPU  {name}</Text>` becomes `GPU {name}`), which changes what is displayed. Keep significant spacing in strings: `<Text>{`GPU  ${name}`}</Text>` or a constant.

## Tests

Tests use `claude-code/testing`: the test registers hooks that stand for the engine (`on('process.run', ...)`, `on('fs.read', ...)`…), raises events (`$.session.start(...)`), and mounts drawings (`$.ui.mount(...)`). Pitfalls met so far:

- Every stub `on(...)` must be registered **before** the first `$` call of the test.
- `clock.every` / `clock.after` are stubbed with `({ value: undefined })` (a returned object with a function is not clonable).
- `process.run` stubs return `{ exitCode, stdout, stderr, isStdoutTruncated, isStderrTruncated }`.
- Mounting `AbovePrompt` needs `props.view: {}`; `session.usage` needs `context.window`.
- When the plugin lets a drawing through (`next(e)`), stub the engine's own drawing with `on('ui.render', ...)`, or `mount` fails. `ui.find` returns `undefined` when nothing matches.
- A Text holding nested Texts is found with its concatenated text.
- Options for one test: `test(name, { options: { language: 'fr' } }, body)`.
- Hardware-dependent parsers are tested against recorded output; mark samples not yet seen on real hardware `[to validate]`.

## Type-check

`tsc -p plugins/<mod>` uses the `tsconfig.json` the engine writes next to the plugin (both git-ignored) and the types it lays in `.claude-plugin/types/`. They exist once a session has loaded the plugin. CI has no session, so it validates and tests but cannot type-check: run `scripts/check.sh` locally before pushing.

## CI

`.github/workflows/ci.yml` runs `scripts/check.sh` on every push and pull request, with a pinned Claude Code version and read-only permissions. No secret is needed: validation and tests run without an account.

Tool versions are pinned in one place each: Biome and TypeScript in `scripts/check.sh`, Claude Code and the actions in the workflow. Bump them deliberately, never to a release younger than two weeks (a fresh release is the usual window for a compromised package).

## Definition of done for a mod

- [ ] `scripts/check.sh` green (lint, format, shell, invisible characters, validate, surface, tests, type-check)
- [ ] `surface.txt` matches what the spec allows, nothing more
- [ ] Tested on screen with hot reload
- [ ] Degraded cases tested (missing data, errors)
- [ ] `plugins/<mod>/README.md` and the root README table updated
- [ ] One clean commit (or a small series) per mod
