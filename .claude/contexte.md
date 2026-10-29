# Contexte courant — claude-mods

Mis à jour : 2026-10-29 12:30

## Objectif en cours
Mod 1/4 `usage-pace` (specs/01-usage-pace.md) codé, en attente de validation à l'écran par l'utilisateur. Ordre et définition de « terminé » : CLAUDE.md.

## Fait
- Bandeau v3 (retours utilisateur) : 3 cartes encadrées (Session 5h, Semaine, Rythme), couleur par niveau (levelColor), phrase « Réinitialisation dans : 01h42 (à 13h42) », rythme = projection linéaire (« ~X % à la réinitialisation » ou « limite atteinte <jour> vers <h> »). 5 tests OK.
- `plugins/usage-pace/` : plugin.json (userConfig paceMinHours=3, refreshSeconds=60), hooks/register.tsx (bandeau AbovePrompt), types/index.d.ts (state limits/tick), tests/usage-pace.test.tsx (3 tests).
- `claude plugin validate` OK (hooks: session.start, session.measure, ui.render{AbovePrompt} ; calls: clock.every/now, session.usage, state, ui.resolve). `claude plugin test` 3/3. tsc strict OK.
- `.claude-plugin/marketplace.json` (nom `claude-mods`, source `./plugins/usage-pace`), README.md, .gitignore, `git init -b main` (aucun commit encore).
- Lien symbolique `~/.claude/dev-mods/<session>/usage-pace` -> repo, pour le rechargement à chaud dans la session.

## Décisions récentes
- Source des données : événement `session.measure` (`rateLimits`, kinds `five_hour`/`seven_day`, `percentUsed`, `resetsAt`) + `$.session.usage()` au démarrage. Aucun calcul d'usage maison.
- Config via `userConfig` du manifeste (réglable dans /config), pas un fichier JSON séparé.
- Bandeau masqué si aucune fenêtre ; fenêtre manquante -> `n/a`. Timer `$.clock.every` ne redessine que s'il y a des données.

- Rythme en « écart en points » de la spec remplacé par une projection, à la demande de l'utilisateur ; option alertThreshold supprimée.
- Heure locale : Date/Intl donnent bien Europe/Paris dans l'environnement des mods (vérifié dans claude plugin test).

## Pièges connus
- Contrat `types/index.d.ts` : aucun `import` autorisé (validate refuse) ; type Limit redéfini localement.
- Tests : tous les `on(...)` de stub avant le premier appel à `$` ; `clock.every` stubbé `{ value: undefined }` ; props AbovePrompt exigent `view: {}`.
- Type-check : tsconfig hors du mod, dans le scratchpad, incluant le .d.ts du skill plugin-authoring (`npx -p typescript@5.6.3 tsc`).

## Prochaine action
Après validation à l'écran : commit « usage-pace », demander l'URL du remote GitHub, puis mod 2 `sysmon` (specs/02-sysmon.md).

## Infos manquantes
- Validation visuelle du bandeau par l'utilisateur.
- URL du repo GitHub (privé) pour le remote.
- Licence souhaitée (validate signale LICENSE manquant, non bloquant).
