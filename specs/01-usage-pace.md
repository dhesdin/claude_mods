# Mod 01 : usage-pace

## Problème
L'utilisateur va régulièrement dans les paramètres pour voir sa consommation. Il veut la voir en permanence, avec une indication de rythme.

## Affichage
Un bandeau au-dessus du prompt (`ui.render` sur `AbovePrompt`), trois cartes encadrées séparées, côte à côte, qui passent à la ligne si le terminal est étroit :

```
╭──────────────────────────────────────╮ ╭──────────────────────────────────────────────────╮ ╭──────────────────────────────────────────────────╮
│ Session 5h ████████░░░░ 64 %          │ │ Semaine    ██████░░░░░░ 48 %                      │ │ Rythme À ce rythme, ~90 % à la réinitialisation   │
│ Réinitialisation dans : 01h42 (à 13h42)│ │ Réinitialisation dans : 3j 06h (dimanche à 18h00) │ │ limite non atteinte cette semaine                 │
╰──────────────────────────────────────╯ ╰──────────────────────────────────────────────────╯ ╰──────────────────────────────────────────────────╯
```

- Carte **Session 5h** et carte **Semaine** : barre de 12 caractères + pourcentage toujours affiché, puis « Réinitialisation dans : <durée> (<moment>) ».
  - Durée : `00h42`, `01h42`, `3j 06h`.
  - Moment, en heure locale : `à 13h42` (aujourd'hui), `demain à 13h42`, `dimanche à 18h00`.
- Code couleur de la partie pleine de la barre et du % : blanc (couleur de texte du thème) < 50 %, jaune 50-75 %, orange 75-90 %, rouge ≥ 90 %. Partie vide grisée.
- Carte **Rythme** (hebdo uniquement), séparée de la carte Semaine.

## Données
- Fenêtre 5 h et fenêtre hebdo : pourcentage + date de réinitialisation.
- Source : l'événement `session.measure` (`rateLimits`, kinds `five_hour` et `seven_day`) et `$.session.usage()` au démarrage. Ne jamais estimer ou recalculer l'usage soi-même.

## Calcul du rythme (hebdo uniquement)
- `écoulé` = temps depuis la dernière réinitialisation (réinitialisation - 7 jours).
- `vitesse` = % hebdo consommé / écoulé.
- `projeté` = % consommé + vitesse × temps restant avant la réinitialisation.
- Affichage :
  - projeté ≥ 100 % : « À ce rythme, limite atteinte <jour> vers <heure> » en rouge, puis « soit <durée> avant la réinitialisation ». Jour : `aujourd'hui`, `demain` ou nom du jour.
  - sinon : « À ce rythme, ~X % à la réinitialisation », coloré selon X avec le code couleur ci-dessus, puis « limite non atteinte cette semaine ».
  - écoulé < `paceMinHours` : « Pas encore assez de recul pour estimer » en grisé.
- Ne pas utiliser les mots « avance » et « retard » (ambigus).

## Dégradation
- Aucune fenêtre (hors abonnement, avant la première mesure, API en échec) : bandeau masqué.
- Une fenêtre absente : sa carte affiche `n/a`.

## Config (`userConfig`)
- `paceMinHours` (défaut 3) : heures écoulées depuis la réinitialisation hebdo avant d'afficher une projection.
- `refreshSeconds` (défaut 60) : rafraîchissement du compte à rebours entre deux tours ; 0 = seulement après chaque tour.
- v2, pas maintenant : jours actifs de la semaine pour un rythme non linéaire.

## Hors périmètre
Coût en dollars, historique, graphiques.
