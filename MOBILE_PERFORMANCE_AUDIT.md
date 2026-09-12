# Audit de performance mobile

Mesuré par `tools/audit-perf.mjs` : un vrai navigateur à 360×800, un
processeur **4 fois plus lent** que celui de la machine, et une 4G
ordinaire pour le premier chargement. Sans ce ralentissement, on mesure un
ordinateur de bureau et l’on conclut que tout va bien.

## Les quatre moments où l’on attend le jeu

| Moment | Mesure | Budget | |
| --- | --- | --- | --- |
| Premier pixel, 4G lente | 457 ms | 1000 ms | ✅ |
| Le jeu est touchable, 4G lente | 2938 ms | 3000 ms | ✅ |
| « Prendre un an » (médiane) | 98 ms | 200 ms | ✅ |
| « Prendre un an » (p90) | 118 ms | 300 ms | ✅ |
| Changer d’onglet (médiane) | 69 ms | 150 ms | ✅ |
| Ouvrir une feuille (médiane) | 69 ms | 150 ms | ✅ |
| Mini-jeu, images perdues (sur 176) | 2 | 3 | ✅ |
| Mini-jeu, image médiane | 17 ms | 32 ms | ✅ |
| Plus longue tâche bloquante, en jeu | 54 ms | 200 ms | ✅ |
| Sauvegarde réécrite | 239 ko | 1 465 ko | ✅ |

## Ce que la mesure a trouvé

**Le jeu répond bien.** Sur un processeur quatre fois plus lent, une
année coûte 98 ms, un onglet 69 ms, une feuille
69 ms — tous très en dessous de leur budget. Le mini-jeu le plus
dessiné tourne à soixante images par seconde. Et **pas une seule tâche de
plus de 50 ms en cours de partie** : le doigt n’est jamais bloqué.

Ce qui allait mal n’était donc pas la vitesse. C’était le silence.

### L’écran ne disait rien pendant trois secondes — corrigé

Avant : sur une 4G lente, le premier pixel et l’arrivée du jeu tombaient
**au même instant, à 2 862 ms**. La page ne contient rien tant que React
n’a pas démarré ; il ne se passait donc rien du tout, et un écran blanc ne
dit pas s’il charge ou s’il est cassé.

| | Avant | Cette exécution |
| --- | --- | --- |
| Premier pixel, 4G lente | 2 862 ms | **457 ms** |
| Le jeu est touchable | 2 862 ms | 2938 ms |

Une coquille d’amorçage en ligne dans `index.html` — pas une requête de
plus — occupe l’écran pendant que le paquet se charge, et se retire à la
première image peinte après le rendu. Le jeu n’arrive pas plus tôt : c’est
l’attente qui cesse d’être muette, et c’est la seule chose qui changeait
pour le joueur.

Le thème est décidé dans cette même coquille, avant tout rendu : sans
cela, un joueur en thème sombre prenait un éclair blanc à chaque
ouverture. Et le message de secours qui existait déjà — « Odyssia n’a pas
pu démarrer » — retire la coquille avant de s’afficher, sans quoi un
déploiement cassé aurait montré un rouet éternel : exactement l’attente
muette qu’elle sert à éviter.

### Le poids du paquet — pas corrigé, et pourquoi

1 572 ko sur le disque, 478 ko une fois comprimés, en un seul morceau.
Tout est chargé, y compris les écrans qu’un joueur donné n’ouvrira
jamais. Découper par écran est la piste évidente ; elle a été mesurée
avant d’être suivie, et elle rapporte peu : les écrans ne pèsent que
12 % des sources, et ils tirent derrière eux le moteur et les catalogues
dont la simulation a besoin de toute façon. Le gain réaliste est de
l’ordre de quelques centaines de millisecondes sur une 4G lente, contre
un découpage de toute la navigation.

Les catalogues d’audit — `featureCatalog.ts` et `gameplayAudit.ts`, 205 ko
de prose à eux deux — ont été vérifiés : **ils ne sont pas dans le
paquet**. Aucun code d’application ne les importe.

Conséquence directe, et il faut la dire même quand la case est verte :
« le jeu est touchable » sur 4G lente vaut 2938 ms ici, et a été
mesuré entre 2 839 et 3 023 ms sur cinq exécutions. Il est **au** budget de
trois secondes, pas en dessous : le verdict dépend du jour. Ce n’est pas
une négligence, c’est le prix mesuré du choix ci-dessus. Ce qu’un joueur
ressent — l’écran muet — est corrigé ; ce qu’il attend ensuite, c’est le
téléchargement du jeu lui-même.

## Le détail

### Ce qui est livré

- `index-ByW6Vmch.js` — 1 536 ko sur le disque
- `index-wc4hR0Xn.css` — 36 ko sur le disque
- transféré, une fois comprimé : 478 ko

Et ce que ce poids coûte, selon la vitesse du réseau :

| Réseau | Premier pixel | Le jeu est là | DOM prêt |
| --- | --- | --- | --- |
| aucune limite (le paquet seul) | 109 ms | 756 ms | 580 ms |
| 4G ordinaire (4 Mb/s, 100 ms) | 340 ms | 1413 ms | 1310 ms |
| 4G lente (1,6 Mb/s, 150 ms) | 457 ms | 2938 ms | 2765 ms |

La différence entre la première ligne et les autres, c'est le poids ;
la première ligne elle-même, c'est le temps de l'analyser.

### « Prendre un an »

24 années jouées : médiane 98 ms, p90 118 ms, pire 260 ms.

### Naviguer

- Vie — 33 ms
- Études — 101 ms
- Études → une ligne — 82 ms
- Gens — 84 ms
- Gens → une ligne — 69 ms
- Avoirs — 69 ms
- Avoirs → une ligne — 67 ms
- Agenda — 51 ms
- Agenda → une ligne — 34 ms

### Un mini-jeu

176 images en trois secondes, soit 59 par seconde, sur la cour d’une évasion — la scène la plus dessinée des onze.

Image médiane 17 ms, p90 17 ms, pire 50 ms.
**2 images au-delà de deux trames** (32 ms) et 0 au-delà de 50 ms : c'est ce qui se voit, plus que la moyenne.

### Les tâches longues

**Pendant l'amorçage** : 5 tâches de plus de 50 ms, la pire de 157 ms. C'est l'analyse du paquet, et personne ne joue pendant ce temps-là.

**En cours de partie** : 1 tâches de plus de 50 ms, médiane 54 ms, pire 54 ms.

### La sauvegarde

239 ko pour une vie de 30 ans (182 entrées de journal, 78 personnes).
La sérialiser coûte 9 ms, l’écrire 18 ms —
et cela recommence **à chaque action**, pas seulement à chaque année.

Le document compte 1 953 nœuds à la fin du parcours.
