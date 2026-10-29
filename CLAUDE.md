# claude-mods : marketplace perso de mods Claude Code

Repo Git privé qui sert de marketplace personnelle. Il est installé sur deux machines :
- **laptop** : Linux Mint, pas de GPU NVIDIA
- **tour** : machine GPU NVIDIA (OS à confirmer, Linux supposé)

Chaque mod est un plugin indépendant, activable et désactivable seul.

## Règle n°1 : ne jamais inventer l'API des mods

Les mods sont sortis le 1er octobre 2026. Tes connaissances d'entraînement peuvent ne pas les couvrir ou être fausses.
Avant d'écrire la moindre ligne :
1. Lis la doc officielle : https://code.claude.com/docs/en/plugins/mods/overview, puis les pages `create`, `api`, `interface` et la page plugins/marketplaces.
2. Vérifie chaque appel contre les définitions de types de la version installée (`claude --version`).
3. Si une capacité décrite dans une spec n'existe pas dans l'API, **arrête-toi et signale-le**. Ne contourne pas, ne simule pas.

Rappel de la doc : un hook n'a aucun accès direct au système. Lire un fichier, lancer un processus, dessiner, ajouter une commande : tout passe par l'API `$` des mods. Pas de `require('os')`, pas de `fs` direct.

## Structure attendue

```
claude-mods/
├── CLAUDE.md
├── README.md                  # installation sur une nouvelle machine
├── .claude-plugin/
│   └── marketplace.json       # format à vérifier dans la doc officielle
├── specs/                     # specs fonctionnelles, une par mod
└── plugins/
    ├── usage-pace/
    ├── sysmon/
    ├── teacher-guard/
    └── project-hours/
```

## Ordre de construction

Un mod à la fois, dans cet ordre. On ne passe au suivant que quand le précédent est validé par l'utilisateur à l'écran.

1. `usage-pace` (specs/01-usage-pace.md)
2. `sysmon` (specs/02-sysmon.md)
3. `teacher-guard` (specs/03-teacher-guard.md)
4. `project-hours` (specs/04-project-hours.md)

## Contraintes communes à tous les mods

- **Zéro réseau.** Aucun mod ne fait de requête réseau. Les données restent sur la machine.
- **Zéro token.** L'affichage ne doit rien envoyer au modèle, sauf si une spec le demande explicitement.
- **Dégradation propre.** Si une donnée est indisponible (pas de GPU, fichier absent, API qui échoue), le mod affiche "n/a" ou masque la carte. Il ne plante jamais la session.
- **Coût minimal.** Pas de polling quand le panneau est masqué si l'API le permet. Intervalles configurables, valeurs par défaut raisonnables.
- **Config** : un fichier de config par mod, chemins et seuils dedans, jamais en dur dans le code.
- **Données persistantes** dans `~/.claude/mod-data/<nom-du-mod>/`.
- TypeScript strict. Code court et lisible, l'utilisateur doit pouvoir le relire.

## Définition de "terminé" pour chaque mod

- [ ] `claude plugin validate ./plugins/<mod>` passe sans erreur
- [ ] Les lignes `hooks:` et `calls:` de la validation correspondent à ce que la spec autorise, rien de plus
- [ ] Testé en chargement local (`--plugin-dir`) avec rechargement à chaud
- [ ] Cas dégradés testés (donnée absente, erreur)
- [ ] Section ajoutée au README : ce que fait le mod, sa config, comment le désactiver
- [ ] Commit propre, un mod par commit ou par petite série

## Installation sur une seconde machine

Le README doit expliquer, en commandes copiables :
1. cloner le repo
2. ajouter la marketplace locale ou Git dans Claude Code
3. installer chaque plugin
4. `/reload-plugins` dans une session ouverte
