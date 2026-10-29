# langmod

One command for the display language of every mod:

```
/langmod fr        set French for every mod
/langmod           show each mod's current language
```

Available: `en`, `fr`, `ja`, `zh`. It changes each `/config` row named `<plugin>.language` whose options include all four codes (the convention of this repo, see [docs/architecture.md](../../docs/architecture.md#internationalization)); a locked row is left as is. Each mod's language can also be picked in `/config`.

Disable: `claude plugin disable langmod@claude-mods` (the `language` rows in `/config` keep working).
