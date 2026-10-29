# Mod 01 : usage-pace

## Problème
L'utilisateur va régulièrement dans les paramètres pour voir sa consommation. Il veut la voir en permanence, avec une indication de rythme.

## Affichage
Un bandeau compact au-dessus du prompt (ou un panneau, selon ce que l'API permet le mieux) :

```
5h  ████████░░░░  64%  reset 1h42
Sem ██████░░░░░░  48%  reset 3j 6h   rythme -5 pts (sous le rythme)
```

## Données
- Usage fenêtre 5 h : pourcentage + temps avant reset
- Usage hebdomadaire : pourcentage + temps avant reset
- Source : l'événement de mesure de session fourni par Claude Code (doc mods). Ne jamais estimer ou recalculer l'usage soi-même.

## Calcul du rythme (hebdo uniquement)
- `écoulé` = part de la semaine écoulée depuis le dernier reset (0 à 100 %)
- `consommé` = pourcentage hebdo utilisé
- `écart = consommé - écoulé`, en points
- Affichage :
  - écart > +5 : "rythme +X pts (au-dessus)" en couleur d'alerte
  - écart < -5 : "rythme -X pts (sous le rythme)" en couleur neutre
  - sinon : "dans le rythme"
- **Ne pas utiliser les mots "avance" et "retard"** : ambigus (être "en avance" sur sa conso est une mauvaise nouvelle).

## Config
- seuil d'écart pour l'alerte (défaut 5 pts)
- v2, pas maintenant : jours actifs de la semaine pour un rythme non linéaire

## Hors périmètre
Coût en dollars, historique, graphiques.
