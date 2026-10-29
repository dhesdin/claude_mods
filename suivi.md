## 2026-10-29 — usage-pace
- Fait : mod usage-pace, marketplace, README, docs/mods-api.md, repo GitHub (SSH dhesdin/claude_mods), 2 commits poussés.
- Bandeau v1 : deux lignes texte, rythme en écart de points (spec d'origine).
- Bandeau v2 (retour : graphes collés) : cartes encadrées, couleur par niveau (blanc < 50, jaune 50-75, orange 75-90, rouge ≥ 90), % toujours affiché.
- Bandeau v3 (retour : reset trop court, points incompréhensibles) : phrase « Réinitialisation dans : 01h42 (à 13h42) », carte Rythme séparée avec projection (« ~X % à la réinitialisation » ou « limite atteinte <jour> vers <h> »).
- Décisions : données via session.measure ; config via userConfig ; alertThreshold supprimée, paceMinHours ajoutée ; spec 01 réécrite sur le comportement réel.
- Git : remote SSH (HTTPS sans identifiants échoue), commits sans co-auteur Claude (demande utilisateur).
- Pièges : contrat de types sans import ; stubs de test avant le premier appel à $ (détail dans docs/mods-api.md).
