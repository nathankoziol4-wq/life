# Parité des fonctionnalités pendant la refonte

Ce document existe pour une seule raison : **une refonte d'interface fait
disparaître des fonctionnalités sans que personne s'en aperçoive.** Un écran
réécrit oublie une ligne, et la ligne oubliée est une action que le joueur ne
peut plus faire — alors que le système derrière fonctionne toujours.

La règle : après chaque écran migré, l'ancien proposait *X* actions, le
nouveau doit en proposer *au moins X*. Rien ne se perd, tout se déplace.

Le garde-fou n'est pas ce document — un document ne vérifie rien. C'est
désormais **`npm run audit:parite`**, qui relève tout ce qui est touchable dans
le jeu — le libellé, la section, l'état, la raison d'un refus — et le compare à
un témoin versionné (`tools/parite-temoin.json`).

Le témoin de la migration des relations a été enregistré **sur la version
d'avant**, en remisant les changements le temps de la mesure. C'est la seule
façon d'avoir un avant et un après comparables, plutôt qu'une intuition.

```
inventaire : 264 entrées touchables · témoin : 264
disparues : 0 · ajoutées : 0 · changées d'état : 0
```

---

## Ce qui est migré

| Ancien | Nouveau | Fonctionnalités | État |
| --- | --- | --- | --- |
| `components/CharacterHeader.tsx` | `ui/components/AppHeader.tsx` | avatar, nom, âge, situation, argent, 4 jauges, accès au profil | **migré** — et enrichi : pastilles d'état (détenu, recherché, marié, retraité, connu), une teinte par jauge |
| `components/LifeTimeline.tsx` | `ui/components/LifeFeed.tsx` | regroupement par âge, défilement auto vers l'année jouée, ton par entrée | **migré** — et enrichi : repère d'année lisible, icône et teinte par famille d'événement |
| `components/Navigation.tsx` | `ui/components/TabBar.tsx` | 4 destinations, bouton « +1 an », état bloqué | **migré** — et corrigé : le journal devient une destination fixe au lieu d'un état caché ; repère de position visible autrement que par la couleur |
| — | `screens/ProfileScreen.tsx` → « Apparence » | choix du thème | **ajouté** — clair, sombre, ou comme l'appareil |
| `components/Modal.tsx` → `Row`, `Card`, `Section` | `ui/components/list.tsx` | le vocabulaire dont **tout** le jeu est fait | **migré** — et enrichi : jauge de ligne, raison de refus lisible, phrase de section |
| `components/RelationshipCard.tsx` | idem, réécrit dessus | avatar, nom, relation, âge, métier, jauge, pastille | **migré** — plus une seule balise de mise en page écrite à la main |
| `screens/RelationshipsScreen.tsx` | idem | 264 entrées touchables, vérifiées une à une | **migré** — 0 perdue |
| `screens/OccupationScreen.tsx` | idem | l'onglet Études et ses cinq feuilles — 90 entrées | **migré** — 0 perdue, et 12 refus qui disent enfin pourquoi |

### Pourquoi le vocabulaire d'abord, et pas l'écran

L'ordre du §133 disait « système de design, puis navigation, puis les écrans ».
La mesure a montré qu'il manquait une marche entre les deux. Comptés sur les
trente-quatre écrans :

```
Row      559 usages · 34 fichiers
Card     430 usages · 34 fichiers
Pill     305 usages · 35 fichiers
Section  277 usages · 33 fichiers
```

Quatre composants portent tout le jeu, et ils vivaient encore dans l'ancienne
feuille. Migrer un écran voulait donc dire le **repeindre** : les mêmes
balises, les mêmes classes, dans un autre fichier — exactement ce qu'on ne
voulait pas faire. C'est le même raisonnement que pour les jetons : tant que
les valeurs sont écrites dans les écrans, aucun thème n'existe.

### Un crochet pour les outils, et pourquoi il a fallu trois pannes pour y venir

Renommer `.row` en `.ui-row` sur **un seul** écran a rendu aveugles, en
silence, trois des six outils de mesure : l'audit mobile mesurait la liste des
gens en croyant ouvrir la fiche d'une personne, l'audit paysage annonçait
« aucune fiche de proche dans cette partie » sur quatre tailles d'écran, et
l'inventaire de parité rapportait quatre-vingt-huit disparitions — dont vingt
amitiés — là où rien n'avait bougé.

Il reste vingt-huit écrans à migrer, donc vingt-huit occasions de recommencer.
Les deux `Row`, l'ancienne et la nouvelle, portent désormais **`data-row`** :
un attribut qui ne décrit aucune apparence et dit seulement « ceci est une
ligne ». Les six outils le visent, et 94 sélecteurs de classe ont disparu avec.

Effet de bord immédiat, et il dit quelque chose sur ce que le silence coûtait :
l'audit paysage, une fois recâblé, a cessé d'écrire « feuille non testée » et
a rouvert les quatre écrans qu'il sautait — un angle mort **antérieur** à
cette migration.

### Ce qui a changé pour le joueur

- **Le journal ne se cache plus.** L'onglet actif se transformait en
  « Journal », si bien que le repère se déplaçait sous le doigt. Cinq
  destinations fixes désormais.
- **Les jauges se distinguent.** Quatre barres de la même couleur ne se
  lisaient pas d'un coup d'œil ; chacune porte maintenant sa teinte.
- **Les états se voient.** Détenu, recherché, marié, retraité, connu :
  autant de choses qui changent la partie et qu'il fallait aller chercher.
- **Le thème se choisit.** Les jetons des deux thèmes existaient, mais rien
  ne permettait de demander l'un plutôt que l'autre : un téléphone réglé en
  sombre imposait le sombre. « Appareil » reste le défaut ; ce n'est plus une
  fatalité.
- **Une ligne qui refuse s'entend.** L'ancienne posait l'attribut `disabled`
  du navigateur, qui retire la ligne de l'arbre d'accessibilité : une voix de
  synthèse ne l'annonçait plus du tout. Or ici « indisponible » veut presque
  toujours dire *« pas encore, et voilà pourquoi »*, et les six lignes
  concernées de l'écran des relations mettaient déjà leur raison dans le
  sous-titre — « il peut refuser », « une fois dans l'année ». Elles
  expliquaient à qui voit, et se taisaient pour qui écoute.
- **Six lignes de carrière s'éteignaient sans un mot.** Consulter les offres,
  travailler à son compte, se présenter, servir, monter sur scène, la
  tribune : en détention, toutes devenaient grises et muettes. Le jeu savait
  très bien pourquoi — il ne le disait pas. Elles disent maintenant « pas
  depuis l'intérieur », ce qui est une information de jeu et non un mur.
- **Et six autres cachaient leur raison dans une alternance.** « Bourse déjà
  obtenue », « diplôme universitaire requis », « filière requise » : le
  sous-titre basculait entre l'explication et l'argument de vente, si bien
  qu'on ne pouvait jamais lire les deux. La raison a désormais sa place, et
  le sous-titre garde la sienne.
- **Un défunt n'est plus une ligne barrée.** Sa fiche portait la classe des
  lignes hors d'atteinte tout en restant parfaitement cliquable — et il faut
  qu'elle le reste, c'est là que vivent son histoire et le souvenir qu'on lui
  garde. L'aspect disait le contraire du comportement.

---

## Ce qui reste en ancienne interface

Ces écrans fonctionnent et gardent toutes leurs actions ; ils n'ont pas encore
été repris. Ils héritent déjà des nouveaux jetons — donc du mode sombre — mais
pas encore des nouvelles primitives ni de la nouvelle disposition.

| Écran | Lignes | Ordre de reprise (§133) |
| --- | --- | --- |
| `components/ActivityMenu.tsx` | 1058 | 6 — activités |
| `screens/SchoolScreen.tsx` | 1305 | 5 — carrière |
| `screens/AssetsScreen.tsx` | 930 | 7 — avoirs |
| `screens/CreationScreen.tsx` | 886 | 11 — création |
| `screens/StageScreen.tsx` | 699 | 10 — carrières spéciales |
| `screens/VentureScreen.tsx` | 534 | 8 — entreprise |
| `screens/CampaignScreen.tsx` | 510 | 10 — carrières spéciales |
| `screens/ServiceScreen.tsx` | 503 | 10 — carrières spéciales |
| … 22 autres écrans | | |

Ils héritent tous, sans une ligne de changement chez eux, de ce que la
migration a corrigé dans l'ancienne `Row` : le crochet `data-row`, donc les
outils qui les mesurent encore. Le reste — jauge de ligne, refus lisible,
phrase de section — n'arrive qu'avec leur reprise.

---

## Ce que la mesure disait avant de commencer

```
32 écrans · 12 535 lignes
11 composants · 2 445 lignes
1 771 lignes de CSS · 193 classes
443 `style={{}}` écrits à la main dans 39 fichiers
37 tailles de police en dur · 72 valeurs numériques en dur
jetons : couleurs, rayons, ombres — mais ni typographie, ni espacement,
         ni mouvement, ni mode sombre
```

C'est ce dernier point qui commandait l'ordre des travaux : tant que les
valeurs sont écrites dans les écrans, aucun thème ne peut exister, et chaque
écran repris rouvre la même discussion. Les jetons d'abord, donc.
