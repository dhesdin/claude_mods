# Mod 04 : project-hours

## Problème
Savoir combien de temps réel va à chaque projet par semaine, pour voir sans s'auto-tromper si un projet prioritaire est délaissé (critère : 3 semaines sans travail sur la partie Jetson/TensorRT de SIP = réévaluation du plan).

## Limite à afficher honnêtement
Le mod ne mesure que le **temps actif dans Claude Code**, pas le temps passé dans l'éditeur sans Claude. Le libellé doit le dire ("temps Claude Code"), jamais "temps de travail".

## Mesure
- Projet = racine Git du dossier de la session (repli : dossier courant).
- Temps actif = somme des intervalles entre événements de session (prompts, appels d'outils, réponses), en coupant tout intervalle supérieur au seuil d'inactivité (défaut 10 min).
- Stockage : une ligne JSONL par segment dans `~/.claude/mod-data/project-hours/`, avec machine, projet, début, fin. Données locales par machine.

## Affichage
Panneau repliable :

```
Semaine 44 (temps Claude Code)
SIP             4h20   ██████████
k4u-erp         2h05   █████
claude-mods     1h10   ███   ← outillage
⚠ sip/edge : 0h depuis 3 semaines
```

- Commande `/hours` : semaine en cours. `/hours 4` : 4 dernières semaines, par projet.
- Les projets marqués "outillage" en config sont signalés comme tels (temps passé sur les outils plutôt que sur le fond).

## Alerte projet prioritaire
- Config : liste de projets prioritaires avec un nombre de semaines max sans activité.
- Si dépassé : ligne d'alerte en couleur. Pas de notification intrusive.

## Config
seuil d'inactivité, alias (chemin ou nom de repo vers nom affiché), projets prioritaires, projets "outillage", début de semaine (lundi).

## Hors périmètre v1
- Agrégation laptop + tour (zéro réseau). Option v2 à discuter : export manuel et fusion.
- Graphiques, objectifs horaires, export.
