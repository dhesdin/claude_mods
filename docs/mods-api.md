# API des mods : ce qui est vérifié et utilisé

Référence vérifiée sur Claude Code **2.1.312** (types de l'engine, ~22 000 lignes). Avant d'utiliser un point d'API absent de cette page, le chercher dans les types (`grep -n "'nom.evenement'"` ou `nom: (`) : ne pas l'inventer.

Où sont les types :
- une fois le mod chargé : `plugins/<mod>/.claude-plugin/types/claude-code/index.d.ts` (généré, ignoré par git) ;
- avant : `types/claude-code.d.ts` dans le dossier du skill `plugin-authoring`, dont le chemin est donné au chargement du skill.

## Structure d'un mod

```
plugins/<mod>/
├── .claude-plugin/plugin.json   # name, version, description, author, types, userConfig
├── hooks/hooks.json             # { "modules": ["./register.tsx"] }
├── hooks/register.tsx           # export const register: Register = (on, options) => { ... }
├── types/index.d.ts             # contrat $.state : interface PluginState { '<mod>': {...} }
├── tests/<mod>.test.tsx         # claude plugin test
└── tsconfig.json                # généré par l'engine, étend .claude-plugin/types/tsconfig.json
```

Chaque mod est ajouté à `.claude-plugin/marketplace.json` (racine) avec `"source": "./plugins/<mod>"`.

- **Hook :** `on(event, matcher?, ($, e, next) => ...)`. `return next(e)` laisse passer ; tout ce qui sort du module passe par `$`. Pas de Node ni de DOM, mais `Date` et `Intl` fonctionnent et donnent l'heure locale (Europe/Paris vérifié).
- **Config :** `userConfig` dans plugin.json (`type`, `title`, `description`, `default`). Les valeurs arrivent dans `options` de `register`, sont réglables dans `/config` et stockées dans `pluginConfigs` de `~/.claude/settings.json`. Un changement recharge le module.
- **Rechargement :** `register` et `session.start` sont relancés ; `$.state` (session) et `$.store` (entre sessions) sont conservés ; les variables du module et les timers repartent de zéro.

## Points d'API utilisés

| Besoin | API | Notes |
| --- | --- | --- |
| Limites d'usage | événement `session.measure` | `e.rateLimits: { kind, percentUsed, resetsAt? }[]`, kinds `five_hour` / `seven_day` ; `e.changed` contient `'rateLimits'` quand une fenêtre bouge d'un point. Après chaque tour. Vide hors abonnement. |
| Limites au démarrage | `$.session.usage()` | `{ startedAt, context, rateLimits, cost }`, mêmes figures. |
| Bandeau au-dessus du prompt | `on('ui.render', { component: 'AbovePrompt' }, ...)` | Retourner un arbre, ou `next(e)` pour ne rien afficher. Props : `hasSurvey` (céder la place), `isWorking`, `maxRows`, `bodyColumns`, `scroll`, `view`. |
| Éléments | `const { Box, Text } = $.ui.resolve(e)` | JSX compilé avec `h`. Box : `flexDirection`, `flexWrap`, `columnGap`, `paddingX`, `borderStyle="round"`, `borderColor`. Text : `color`, `bold`, `dimColor`, Text imbriqués. |
| Couleurs | type `Color` | ThemeKey (`text`, `subtle`, `warning`, `error`, `success`…) qui suit le thème, ou couleur brute (`'red'`, `'#ff8700'`). |
| État redessiné | `atom(ref, initial)`, `read($, a)`, `update($, a, fn)` | `read` pendant le dessin abonne ; `update` redessine les lecteurs. Chaque clé est déclarée dans `types/index.d.ts`. |
| Timer | `$.clock.every(ms, fn)` | Lancé depuis `session.start`. Retourne `{ cancel }`. Supprimé au rechargement. |
| Heure | `$.clock.now()` | Promesse en ms ; stubbable dans les tests. |

## Boucle de dev

1. `claude plugin validate ./plugins/<mod>` : liste `hooks:` / `calls:` / `state` à comparer avec la spec. Les erreurs README/LICENSE/icon de la partie « plugin directory » ne bloquent pas.
2. `claude plugin test ./plugins/<mod>`.
3. Type-check : `npx -y -p typescript@5.6.3 tsc -p <tsconfig>`, avec un tsconfig **hors du mod** (scratchpad) qui reprend les options de l'en-tête de `claude-code.d.ts` et inclut ce fichier ainsi que `hooks`, `types` et `tests` du mod.
4. Rechargement à chaud dans la session : charger le skill `plugin-authoring`, puis créer le lien `~/.claude/dev-mods/<id-session>/<mod>` vers `plugins/<mod>` et écrire un fichier à travers ce lien. L'utilisateur accepte « Turn on the mods… » une fois ; ensuite chaque modification recharge le mod à la fin du tour. Hors session : `claude --plugin-dir ./plugins/<mod>`.

## Pièges

- `types/index.d.ts` ne doit contenir **aucun** `import` (validate refuse) : redéclarer les types localement.
- Tests : tous les `on(...)` qui simulent l'engine sont déclarés **avant** le premier appel à `$`.
- Tests : `clock.every` se simule avec `({ value: undefined })` (un objet avec fonction n'est pas clonable).
- Tests : `$.ui.mount` sur AbovePrompt exige `props.view: {}` ; `context` de `session.usage` exige `window`.
- Tests : quand le mod laisse passer (`next(e)`), simuler le dessin de l'engine avec `on('ui.render', ...)`, sinon `mount` échoue ; `ui.find` renvoie `undefined` si rien ne correspond.
- Un `Text` contenant des `Text` imbriqués est trouvé par `ui.find` avec son texte concaténé.
