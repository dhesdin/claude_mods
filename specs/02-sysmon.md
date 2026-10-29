# Mod 02 : sysmon

## Problème
Savoir en un coup d'oeil si la machine est disponible et ce qui la charge : avant de lancer un entraînement, pendant une inférence, ou quand le ventilateur s'emballe.

## Affichage
Un panneau repliable, une carte par ressource :

```
GPU  RTX xxxx      util  87%   VRAM 9.8 / 12.0 Go   182 W / 220 W   71°C
     process : python (PID 4821)  9.1 Go
CPU  34%   load 2.1 / 1.8 / 1.5
RAM  11.2 / 32 Go   swap 0.0 Go
```

Sur le laptop sans GPU NVIDIA : la carte GPU affiche "Pas de GPU NVIDIA" ou se masque (config). Pas d'erreur.

## Données
| Ressource | Champs | Source |
|---|---|---|
| GPU | utilisation %, VRAM utilisée/totale, puissance consommée/limite (W), température | `nvidia-smi --query-gpu=... --format=csv,noheader,nounits` lancé via l'API de processus des mods |
| Process GPU | nom, PID, VRAM par process | `nvidia-smi --query-compute-apps=...` |
| CPU | utilisation % globale, load average | `/proc/stat` (différence entre deux lectures), `/proc/loadavg` |
| RAM | utilisée/totale, swap | `/proc/meminfo` |

Si l'API des mods ne permet pas de lancer un processus ou de lire `/proc`, **s'arrêter et le signaler** (règle n°1 du CLAUDE.md).

## Seuils visuels
- VRAM > 90 % ou température GPU > 80°C : couleur d'alerte
- Swap > 0 pendant un entraînement : couleur d'alerte (signe de saturation RAM)

## Rafraîchissement
- Défaut 3 s quand le panneau est visible, arrêt quand il est replié.
- Un seul appel `nvidia-smi` par cycle (tous les champs dans la même requête).

## Optionnel, uniquement si l'API le permet
Exposer à Claude un outil `machine_status` qui renvoie le même résumé en texte court, pour qu'il vérifie la VRAM libre avant de lancer un entraînement. Ne coûte des tokens que quand Claude l'appelle. Si l'API ne permet pas d'enregistrer un outil, l'omettre et le noter dans le README.

## Config
intervalle, seuils, masquer ou non la carte GPU absente, index du GPU si plusieurs.

## Hors périmètre
- Historique et graphiques de conso.
- **Benchmarks d'inférence (FPS, latence, comparaison CPU/GPU/TensorRT)** : c'est un livrable du projet SIP, mesuré dans le code du projet de façon reproductible, pas dans un mod d'affichage.
