# Mod 03 : teacher-guard

## Problème
Dans les repos du portfolio (SIP, 3D Vision, etc.), l'utilisateur doit écrire son code lui-même : il devra le défendre en entretien. Le risque est de laisser Claude coder "juste cette fois". Ce mod rend ce glissement impossible sans effort conscient.

## Activation : fichier marqueur
- Un repo est protégé s'il contient un fichier `.teacher-mode` à sa racine. Ce fichier sera créer et ajouté au projet en cour (SIP) par contre pas push ni commité dans le repo .git le mode professeur est applicable à l'utilisateur mais le portfolio doit rester professionnel et ne pas montrer la présence de claude.
- Pas de liste de chemins en config : les chemins diffèrent entre laptop et tour, le marqueur voyage avec le repo via Git.
- Désactiver = supprimer le fichier à la main. **Aucune commande slash pour couper le mode.** La friction est volontaire.

## Comportement dans un repo protégé
1. **Bloquer** les appels d'outils qui écrivent des fichiers : Write, Edit, NotebookEdit (vérifier les noms exacts dans la doc).
2. **Bash, en best effort** : bloquer les commandes qui modifient des fichiers du repo (redirections `>` et `>>`, `tee`, `sed -i`, `mv`, `cp`, `rm`, `git commit`, `git push`, `git apply`, `patch`). Autoriser la lecture et l'exécution : `ls`, `cat`, `git status/diff/log`, lancer les tests ou un script existant.
   - Ce filtrage n'est **pas une barrière de sécurité**, juste un garde-fou contre l'automatisme. Le documenter tel quel dans le README.
3. Message de refus clair renvoyé à Claude : "Repo en mode professeur : pas d'écriture. Explique, pose des questions, donne des pistes, ne fournis pas de code complet."
4. Bandeau permanent discret : `MODE PROF` quand la session est dans un repo protégé.

## Seule dépense de tokens autorisée
Au démarrage d'une session dans un repo protégé, injecter une consigne courte (2 à 3 lignes max) pour que Claude se comporte en relecteur dès le départ, plutôt que de tenter des écritures refusées. Si l'API ne le permet pas, s'en passer : le blocage suffit.

## Cas à tester
- Repo protégé : Edit refusé, `cat` autorisé, `echo x > f` refusé, `pytest` autorisé.
- Repo non protégé : aucun changement de comportement.
- Sous-dossier d'un repo protégé : protégé aussi (chercher le marqueur en remontant jusqu'à la racine Git).

## Hors périmètre
Détection de code collé par l'utilisateur, statistiques.
