# Audit tactile des mini-jeux

§115 : **aucun mini-jeu n'est terminé s'il ne marche qu'à la souris.**

Ce document ne liste pas des impressions. Le test de fumée joue sur un vrai
téléphone — 360×800, `hasTouch`, `isMobile` — et mesure, sur chaque surface de
jeu qu'il ouvre, les six choses qui empêchent réellement de jouer au doigt.

Une correction de compte d'abord : le dossier contient douze fichiers, mais
**`grid.ts` n'est pas un mini-jeu** — c'est la géométrie partagée du
cambriolage et de l'évasion, sans identifiant ni objectif propres. Le registre
en compte donc **onze**.

## Ce qui est mesuré, et pourquoi

| Mesure | Ce qu'elle attrape |
| --- | --- |
| Taille de la surface | Une aire de jeu qui ne tient pas dans l'écran étroit |
| Le doigt change l'état | Le jeu ne réagit qu'à la souris — le défaut que §115 vise |
| Pas de défilement parasite | Le glissé fait défiler la page au lieu de jouer |
| Geste capté (`touch-action: none`) | La cause du précédent, vérifiée à la source |
| Sélection bloquée | Un glissé qui surligne du texte au lieu de jouer |
| Quitter atteignable | §120 : ce qui empêche de sortir est CRITICAL |
| Aucun débordement | La surface pousse la page hors de l'écran |

Chaque jeu **se nomme lui-même** : la sonde lit l'objectif affiché dans sa
barre, qui lui est propre. Deviner d'après l'endroit du parcours donnait de
faux noms dès qu'un écran en ouvrait deux.

## Le tableau

| Mini-jeu | Surface | Doigt | Défilement | Geste | Sélection | Quitter | Débordement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pickpocket` | 328×434 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `burglary` | 328×346 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `exam` | 328×389 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `performance` | 328×464 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `infiltration` | 328×334 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `docking` | 328×334 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `table` | 328×294 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `walkabout` | 328×217 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `attic` | 328×444 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `escape` | 328×311 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `chase` | — | — | — | — | — | — | — |

**Dix sur onze**, mesurés en situation réelle, sur un écran de 360 points.

### Le onzième

`chase` ne s'ouvre qu'après avoir franchi le périmètre d'une évasion — il n'y
a pas d'autre chemin. La sonde est posée là où il apparaîtrait et se
déclenchera le jour où une partie du fumigène y arrive ; en attendant, il est
le seul dont on ne peut rien affirmer par la mesure.

Ce qu'on peut dire sans mesurer : il partage `MiniGameHost` avec les dix
autres, donc le même chemin d'entrée tactile, et `grid.ts` avec l'évasion,
donc la même géométrie. Ce n'est pas une preuve, et ce document ne le compte
pas comme telle.

## Ce que la mesure a trouvé

### Le socle, et ce qui allait déjà

`components/MiniGameHost.tsx` était correct sur l'essentiel, et il faut le
dire parce que c'est ce qui a évité une réécriture : **événements de
pointeur** — pas `mousemove` et `touchmove` séparément — avec
`setPointerCapture` dès l'appui, donc un glissé qui survit au doigt sortant de
la zone. `touch-action: none` et `user-select: none` étaient déjà posés.
Souris, doigt et stylet passent par le même chemin.

### Trois défauts réels

**Le bouton « Partir » faisait trente points.** C'est la seule sortie d'un
mini-jeu ; on le rate au doigt. §120 range en CRITICAL tout ce qui empêche de
sortir.

**Un appui long ouvrait le menu du navigateur** — copier, partager, aperçu
d'image — au milieu d'un geste de jeu.

**L'examen était injouable, et le joueur en était puni.** Mesuré sur cent
vingt vies :

```
sessions ouvertes ET atteignables (encore scolarisé) : 133
sessions ouvertes MAIS injouables (déjà diplômé)     : 117
« tu ne t'es pas présenté » au journal               : 2,08 par vie
```

Le cycle se termine et l'étape passe à « études terminées » **dans la même
année** que l'ouverture de la session. Le panneau de l'école disparaissait
avec le statut d'élève, emportant la salle d'examen ; l'année suivante, le
moteur comptait l'absence comme un zéro — moins 3,5 de moyenne et un échec
scolaire au dossier. Presque une session sur deux, et deux sanctions par vie,
pour une porte qui n'existait pas.

La session se rejoint désormais depuis l'onglet Études, scolarisé ou non.

### Deux défauts de la sonde elle-même

**Elle devinait le nom du jeu d'après l'endroit du parcours** : faux dès qu'un
écran en ouvrait deux. Chaque jeu se nomme maintenant par son objectif.

**Elle visait « le premier bouton Partir de la page »** : l'écran de détention
monte la fuite derrière l'évasion, et la sonde tombait sur celui d'un jeu
masqué, de hauteur nulle. Elle vise maintenant le bouton du jeu qu'elle
mesure.

## Ce qui n'est pas traité

- **L'orientation paysage** : le jeu est conçu en portrait (§105) et rien ne
  la force ; sa gestion n'est pas vérifiée.
- **La reprise après rotation** (§42) : non testée.
- **Le retour haptique** (§113) : aucun point d'accroche n'existe encore.
- **La performance en jeu** : `MOBILE_PERFORMANCE_AUDIT.md` reste à faire.
