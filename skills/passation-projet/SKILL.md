---
name: passation-projet
description: Tenir à jour la synthèse .claude/contexte.md d'un projet (réinjectée automatiquement au démarrage et après compaction) et le journal suivi.md. Utiliser à chaque fin de tâche, checkpoint, décision importante, avant une opération longue, quand l'utilisateur dit qu'on s'arrête, et quand la conversation devient longue.
---

# Passation de projet

But : qu'une session neuve (ou la même après compaction) retrouve tout le
contexte utile en lisant **une page**, sans réexplorer le code.

Deux fichiers, deux rôles :

| Fichier | Rôle | Taille | Comment |
|---|---|---|---|
| `.claude/contexte.md` | état courant, réinjecté automatiquement par le hook SessionStart | ≤ 60 lignes, ≤ 4 000 caractères | **réécrit** entièrement, jamais allongé |
| `suivi.md` (racine) | journal pour l'humain et l'historique | libre | une entrée datée **ajoutée** par session |

## Quand mettre à jour `.claude/contexte.md`

- après chaque tâche terminée ou checkpoint atteint ;
- dès qu'une décision est prise (choix technique, refus, changement de plan) ;
- avant une opération longue (build, gros refactor, import) ;
- quand l'utilisateur dit « on s'arrête », « pause », « à demain » ;
- quand la conversation est longue (beaucoup de fichiers lus, nombreux
  allers-retours) : une compaction automatique peut arriver, ce qui n'est
  pas dans le fichier sera perdu.

Ne pas le mettre à jour pour un détail sans conséquence.

## Modèle (réécrire le fichier entier, phrases factuelles)

```markdown
# Contexte courant — <projet>

Mis à jour : <AAAA-MM-JJ HH:MM>

## Objectif en cours
<étape / tâche, 1 à 2 lignes, référence à la spec si elle existe>

## Fait
- <5 derniers résultats concrets max, les plus anciens partent dans suivi.md>

## En cours
<fichier(s) et fonction(s) précis, état exact : « reste à gérer le cas X »>

## Décisions récentes
- <décision> — <pourquoi, une ligne>

## Pièges connus
- <bug rencontré / comportement surprenant et sa parade>

## Prochaine action
<la toute prochaine chose à faire, assez précise pour être exécutée sans réfléchir>

## Infos manquantes
<ce qu'il faut demander à l'utilisateur, ou « rien »>
```

Règles :
- Phrases **factuelles** (« Le proxy TMDB filtre les chemins par liste
  blanche »), pas d'ordres adressés à l'assistant : le texte est injecté
  comme contexte système.
- Jamais de secret (clé, jeton, mot de passe, identifiants).
- Pas de code recopié : nommer le fichier et la fonction.
- Si une info est déjà dans la spec ou dans CLAUDE.md, y renvoyer au lieu
  de la répéter.
- Si le fichier dépasse 60 lignes : déplacer le plus ancien de « Fait » et
  les décisions stabilisées vers `suivi.md`.

## Journal `suivi.md`

À chaque fin de session (ou checkpoint), ajouter :

```markdown
## <AAAA-MM-JJ> — <titre court>
- Fait : …
- Décisions : … (pourquoi)
- Mesures : … (chiffres si un choix touche perf/quota)
- Pièges : …
```

Quand `suivi.md` dépasse ~300 lignes, résumer les entrées de plus de
2 mois en un bloc « Historique condensé » en tête.

## Au démarrage d'une session

`.claude/contexte.md` est déjà dans le contexte (hook) : ne pas le relire.
N'ouvrir `suivi.md` que si une question porte sur l'historique. Si le
projet n'a pas encore de `.claude/contexte.md`, le créer à partir du
modèle dès la première tâche terminée.
