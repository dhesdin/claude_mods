# Mods API: what is used here, verified

Checked against Claude Code **2.1.312** (the engine's type definitions, about 22,000 lines). Before using any part of the API not listed here, look it up in those types: never guess. If a capability a spec asks for does not exist, stop and say so.

Where the types are:
- once a plugin has been loaded by a session: `plugins/<mod>/.claude-plugin/types/claude-code/index.d.ts` (generated, git-ignored);
- otherwise: `types/claude-code.d.ts` in the `plugin-authoring` skill folder, whose path is printed when the skill loads.

## Basics

- A hook is `on(event, matcher?, ($, e, next) => ...)`. `return next(e)` lets the event through; returning without `next` answers for it.
- The module has no Node and no DOM: everything outside it goes through `$`. `Date` and `Intl` work and give local time.
- `$` must always be written `$.noun.method(...)` at the call site: assigning, passing or returning `$` is refused by `claude plugin validate`.
- A hook that guards (`tool.call` answering for a tool, `ui.close`) gets a `.catch(...)` handler.
- On reload, `register` and `session.start` run again; `$.state` and `$.store` survive, module variables and timers do not.

## Calls and events used

| Need | API | Notes |
| --- | --- | --- |
| Usage limits | event `session.measure` | `e.rateLimits: { kind, percentUsed, resetsAt? }[]`, kinds `five_hour` / `seven_day`; `e.changed` holds `'rateLimits'` when a window moves a whole point. After each turn. Empty off a subscription. |
| Usage at start | `$.session.usage()` | `{ startedAt, context, rateLimits, cost }`, same figures. |
| Band above the prompt | `on('ui.render', { component: 'AbovePrompt' }, ...)` | Return a tree, or `next(e)` to show nothing. Props: `hasSurvey` (yield), `isWorking`, `maxRows`, `bodyColumns`, `scroll`, `view`. |
| Pane | `$.ui.open({ id, title })`, `$.ui.close({ id })`, `$.ui.panes()`, event `ui.close` | Drawn by `ui.render` on `{ component: 'Pane', requestId: id }`. Opened unasked, a pane is placed from 144 columns; `$.ui.panes()` says `isPlaced` / `isShown`. |
| Elements | `const { Box, Text } = $.ui.resolve(e)` | JSX with `h`. Box: `flexDirection`, `flexWrap`, `columnGap`, `paddingX`, `borderStyle="round"`, `borderColor`. Text: `color`, `bold`, `dimColor`, nested Text. |
| Colors | type `Color` | A theme key (`text`, `subtle`, `warning`, `error`…) that follows the theme, or a raw color (`'red'`, `'#ff8700'`). |
| Redrawn state | `atom(ref, initial, { shape })`, `read($, a)`, `update($, a, fn)` | `read` while drawing subscribes; `update` redraws the readers. Every key is declared in `types/index.d.ts`. |
| Timers | `$.clock.every(ms, fn)`, `$.clock.after(ms, fn)`, `$.clock.sleep(ms)`, `$.clock.now()` | Started from `session.start`; dropped on reload. |
| Processes | `$.process.run(argv, { timeoutMs })`, `$.process.spawn({ argv })` | argv only, never a shell. `run` waits for exit (30 s default timeout) and rejects if the program cannot start; `spawn` streams and is stopped by leaving the loop / `return()`. |
| Files | `$.fs.read(path)` | Text up to 4 MiB; rejects when missing. Works on `/proc`. |
| Slash command | `$.command.register({ name, description, argumentHint })` + `on('command.run', { command }, ...)` returning `{ text }` | `e.args` is everything after the name. |
| Tool for the model | `$.tool.register({ name, description })` + `on('tool.call', { tool: 'mcp__<plugin>__<name>' }, ...)` returning `{ result }` | Deferred behind ToolSearch by default: no prompt cost until used. |
| Settings rows | `$.config.list()`, `$.config.set({ key, value })` | Keys `<plugin>.<field>` for `userConfig`; a plugin can set another plugin's row (refused when locked). |
| Options | `register(on, options)` | Values of the manifest's `userConfig`, defaults filled in; a change in `/config` reloads the module. A string field with `options` is a picker. |
