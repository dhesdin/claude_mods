# claude-mods

Marketplace personnelle de mods Claude Code. Chaque mod est un plugin indépendant, activable et désactivable seul.
Aucun mod ne fait de requête réseau ni n'envoie de token au modèle.

## Installation sur une nouvelle machine

```bash
git clone <URL_DU_REPO> ~/claude-mods
claude plugin marketplace add ~/claude-mods
claude plugin install usage-pace@claude-mods
```

Puis, dans une session déjà ouverte : `/reload-plugins`.

La marketplace étant un dossier local, une mise à jour se fait par `git pull` dans `~/claude-mods` puis `/reload-plugins`, sans réinstaller.

## Désactiver / réactiver un mod

```bash
claude plugin disable usage-pace@claude-mods
claude plugin enable usage-pace@claude-mods
```

## Mods

### usage-pace

Bandeau au-dessus du prompt, toujours visible, trois cartes encadrées (elles passent à la ligne si le terminal est étroit) :

```
╭──────────────────────────────────────────╮ ╭──────────────────────────────────────────────╮ ╭────────────────────────────────────────────────────╮
│ Session 5h ████████░░░░ 64 %              │ │ Semaine    ██████░░░░░░ 48 %                  │ │ Rythme À ce rythme, ~90 % à la réinitialisation     │
│ Réinitialisation dans : 01h42 (à 13h42)   │ │ Réinitialisation dans : 3j 06h (dimanche à 18h00) │ │ limite non atteinte cette semaine                   │
╰──────────────────────────────────────────╯ ╰──────────────────────────────────────────────╯ ╰────────────────────────────────────────────────────╯
```

- Les chiffres viennent de l'événement `session.measure` de Claude Code (fenêtres `five_hour` et `seven_day`) : l'usage n'est jamais estimé.
- Couleur de la barre et du % : blanc < 50 %, jaune 50-75 %, orange 75-90 %, rouge ≥ 90 %.
- Rythme : projection linéaire du % hebdo au rythme moyen depuis la dernière réinitialisation.
  Soit « À ce rythme, ~X % à la réinitialisation » (coloré selon X), soit « À ce rythme, limite atteinte samedi vers 15h » en rouge, avec la marge avant la réinitialisation.
- Sans abonnement ou avant la première mesure, le bandeau est masqué ; une fenêtre absente affiche `n/a`.

Config (`/config`, section du plugin, ou `pluginConfigs` dans `~/.claude/settings.json`) :

| Option | Défaut | Rôle |
| --- | --- | --- |
| `paceMinHours` | 3 | heures écoulées depuis la réinitialisation hebdo avant d'afficher une projection |
| `refreshSeconds` | 60 | rafraîchissement du compte à rebours entre deux tours (0 = seulement après chaque tour) |

## Développement

```bash
claude plugin validate ./plugins/<mod>
claude plugin test ./plugins/<mod>
claude --plugin-dir ./plugins/<mod>     # chargement local avec rechargement à chaud
```
