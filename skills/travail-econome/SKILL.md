---
name: travail-econome
description: Règles pour coder en consommant le moins de tokens possible (lecture ciblée, sorties de commandes courtes, tests ciblés, pas de relecture). Utiliser pendant tout travail de code ou d'exploration de projet, dans tous les projets.
---

# Travail économe en tokens

Chaque fichier lu, chaque sortie de commande et chaque réponse longue reste
dans le contexte et est re-facturé à chaque échange suivant. Le coût d'une
lecture inutile se paie donc plusieurs fois.

## Lire

- Localiser avant de lire : Grep (motif précis) ou Glob, puis Read avec
  `offset`/`limit` sur la zone utile. Lire un fichier entier seulement
  s'il est court (< 200 lignes) ou qu'on va le réécrire.
- Ne jamais relire un fichier déjà dans le contexte, ni après un Edit
  réussi pour « vérifier ».
- Spec découpée : lire l'index puis seulement les parties de la tâche.
- Ne jamais lire : `node_modules/`, `dist/`, `build/`, lockfiles, fichiers
  générés ou volumineux (catalogues JSON, fixtures, données). Pour un gros
  JSON : `jq` sur la structure (`jq 'keys'`, `jq '.[0]'`), `head -c`.
- `.claude/contexte.md` est déjà injecté au démarrage : ne pas le relire.

## Commandes

- Limiter la sortie : `| tail -n 40`, `| head -n 40`, options silencieuses
  (`--silent`, `-q`, `--reporter=dot`), `grep` sur les lignes d'erreur.
- Tests : lancer d'abord le seul fichier concerné
  (`node --test tests/x.test.js`), la suite complète une seule fois en fin
  de tâche, en n'affichant que le résumé et les échecs.
- Builds et serveurs longs : en arrière-plan, sortie redirigée dans un
  fichier de log, lire seulement la fin en cas d'échec.
- Pas de captures d'écran pour vérifier ce qu'un test ou une assertion
  DOM peut vérifier ; si une capture est nécessaire, une seule, zone
  utile, petite taille.

## Écrire

- Edit ciblé plutôt que réécriture d'un fichier entier.
- Plusieurs modifications indépendantes : les faire dans le même tour
  (appels parallèles), pas un aller-retour par modification.
- Ne pas recopier de code dans la réponse : nommer fichier et fonction.

## Répondre

- Réponse finale courte : ce qui a changé, ce qui reste, la prochaine
  action. Pas de récapitulatif des étapes ni de liste des fichiers lus.
- Ne pas narrer entre deux outils.

## Sous-agents

- Seulement pour une recherche large dont seule la conclusion compte
  (balayer beaucoup de fichiers). Brief court et autonome, demander une
  réponse de quelques lignes. Jamais pour une tâche faisable en 2 ou 3
  appels directs : chaque sous-agent repart de zéro.

## Contexte long

- Après chaque tâche terminée : mettre à jour `.claude/contexte.md`
  (skill `passation-projet`) pour qu'une compaction ne perde rien.
- Une tâche nouvelle et sans rapport avec la précédente : le dire à
  l'utilisateur et suggérer `/clear` (le contexte du projet revient tout
  seul par le hook).
