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

### Le onzième — et pourquoi il résiste

`chase` ne s'ouvre qu'après avoir **franchi le périmètre** d'une évasion. Il
n'y a pas d'autre chemin : ni écran, ni sauvegarde ne peuvent y mener, parce
que la phase vit dans l'état de l'écran et non dans la partie.

Le fumigène joue donc l'évasion pour de bon, et il a fallu quatre corrections
successives pour qu'il la joue vraiment :

1. **Viser la brèche.** L'écran la montre — c'est ce que le joueur vise.
   L'ancienne version tapait six points au hasard en remontant l'écran.
2. **Tenir assez longtemps.** Une traversée réussie prend dix secondes en
   médiane, vingt et une au pire ; le geste durait trois secondes et demie.
3. **Relancer sur plusieurs nuits.** Une tentative par an. Faire passer une
   année demande de refermer la feuille, qui recouvre la barre — sans quoi
   « Prendre un an » n'est pas cliquable et la relance ne relance rien.
4. **Lire le plan.** Foncer droit se plante dans un mur : mesuré sur le
   moteur seul, une réussite sur dix. Le plan est entièrement dessiné dans la
   page — une case par mur, chacune placée en pourcentage — donc le fumigène
   le relit, cherche un chemin et le suit case par case, au rythme du fuyard.
   C'est l'information que le joueur a sous les yeux, pas une triche.

Et il perd quand même. Six nuits préparées, avec un chemin valide :

```
nuit 1 : L'appel — tu n'es pas allé assez vite
nuit 2 : Repéré — une torche, une voix, et tout s'arrête là
nuit 3 : Repéré      nuit 4 : Repéré
nuit 5 : Repéré      nuit 6 : Repéré
```

La première nuit est ma faute : le pilote relit la position à chaque pas, ce
qui le ralentit sous la limite de l'appel. **Les cinq autres sont le jeu qui
fonctionne** : traverser une cour en ligne — même en contournant les murs —
sans s'arrêter sur les abris ni attendre le faisceau, ça se voit. C'est
exactement ce que le mini-jeu demande, et un pilote qui l'ignore se fait
prendre.

Écrire un pilote qui utilise les abris et lit les faisceaux, c'est écrire une
intelligence de jeu — un autre chantier. En attendant, `chase` reste **non
mesuré en situation**, et ce document ne compte pas le partage de
`MiniGameHost` comme une preuve.

La sonde est posée là où il apparaîtra, et le fumigène dit maintenant ce que
chaque nuit a donné plutôt qu'une ligne muette : la prochaine personne n'aura
pas à refaire cette enquête.

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
