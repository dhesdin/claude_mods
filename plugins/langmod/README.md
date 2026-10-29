# langmod

One command for the display language of every mod:

```
/langmod fr        set French for every mod
/langmod           show each mod's current language
```

Available: `en`, `fr`, `ja`, `zh`. The choice is kept on this machine: at each start, mods installed since (for example synced from your claude.ai account later) are switched to it too. Run it once per machine. It changes each `/config` row named `<plugin>.language` whose options include all four codes (the convention of this repo, see [docs/architecture.md](../../docs/architecture.md#internationalization)); a locked row is left as is. Each mod's language can also be picked in `/config`.

What it does: reads the `/config` rows and changes the `<plugin>.language` ones when you run `/langmod <code>` and at each start; keeps the chosen code in its own store (`$.store`, this machine). Nothing else: no program, no network, nothing sent to the model.

Disable: `claude plugin disable langmod@claude-mods` (the `language` rows in `/config` keep working).
