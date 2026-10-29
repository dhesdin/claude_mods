# Contexte courant : claude-mods

Mis à jour : 2026-10-29 22:00

## Objectif en cours
Vérification à l'écran de notify (05) et project-memory (06), chargés dans cette session par liens dev-mods (~/.claude/dev-mods/4f3c1696-…/) et envoyés sur le compte claude.ai. Le bloc projectMemory et le rappel de passation à 250k sont arrivés dans cette session : project-memory fonctionne.

## Fait
- 7 mods sur le compte claude.ai (usage-pace 0.3, sysmon, teacher-guard, langmod, project-hours, notify, project-memory), statut dans CLAUDE.md.
- scripts/user-settings.sh appliqué sur le laptop (compaction auto à 300k, CLAUDE_AUTOCOMPACT_PCT_OVERRIDE retiré ; sauvegarde settings.json.20261029-214415.bak). Hook charger-contexte.sh encore présent.
- Skills renommées (project-handoff, token-economy, industry-code-review) ; doublons français supprimés du compte.
- docs/mods.md = catalogue unique ; check.sh « docs coverage » l'impose.
- Annuaire : usage-pace et sysmon en examen chez Anthropic ; project-hours non soumis.

## Décisions récentes
- Nouveaux mods en TypeScript : notify (classic.Notification + turn.complete, notify-send/osascript/PowerShell par argv) ; project-memory (prompt.context, session.measure, `context` de tool.call/prompt.submit).
- Réglages hors plugin (autoCompactEnabled, autoCompactWindow) : scripts/user-settings.sh, une fois par machine.
- test-before-done et retry-intelligence reportés (peu utiles aujourd'hui).
- Texte destiné au modèle en anglais ; affichage traduit (`language`, /langmod).
- Commits sans co-auteur Claude ; scripts/check.sh vert avant chaque commit.

## Pièges connus
- `$` ne se passe ni ne se stocke : closures construites dans session.start.
- Stubs de test : renvoyer un résultat complet (turn.complete `{ text }`, session.measure `{ changed }`, session.compact avec un message ayant `toolUses`) ; stdin de process.run est sous `init`.
- Types moteur absents tant qu'une session n'a pas chargé le mod : copier .claude-plugin/types et tsconfig.json d'un autre mod (git-ignorés).
- shellcheck tourne seulement en CI ; pas de `gh` local pour voir la CI.

## Prochaine action
Après redémarrage de Claude Code sur le laptop : vérifier notify@synced et project-memory@synced (`claude plugin list`), relancer `make user-settings` (retire le hook), retirer les 2 règles de ~/.claude/CLAUDE.md, supprimer les liens dev-mods. Sur la tour : `make user-settings`.

## En attente de l'utilisateur
- Corrections proposées pour les skills version-check et init-project (le marqueur `.teacher-mode` d'init-project n'existe pas).
- CLAUDE.md modifiés non commités : appli_quotidien/appli_tracker, appli_quotidien/appli_jeu/double-regard.
- Rappel : GIF de démo du README à la fin.

## Infos manquantes
- Vérifications GPU sur la tour (docs/hardware.md) ; Jetson/AMD sur vrai matériel.
