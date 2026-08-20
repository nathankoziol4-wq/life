# Audit tactile des mini-jeux

§115 : **aucun mini-jeu n'est terminé s'il ne marche qu'à la souris.**

Ce document ne liste pas des impressions. Le test de fumée joue sur un vrai
téléphone — 360×800, `hasTouch`, `isMobile` — et mesure, sur chaque surface de
jeu qu'il ouvre, les sept choses qui empêchent réellement de jouer au doigt.

Une correction de compte d'abord : le dossier contient douze fichiers, mais
**`grid.ts` n'est pas un mini-jeu** — c'est la géométrie partagée du
cambriolage et de l'évasion, sans identifiant ni objectif propres. Le registre
en compte donc **onze**.

## Ce qui est mesuré, et pourquoi

| Mesure | Ce qu'elle attrape |
| --- | --- |
| Taille de la surface | Une aire de jeu qui ne tient pas dans l'écran étroit |
| Rien ne le recouvre | Le jeu tourne, mais derrière une modale — §120 |
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

| Mini-jeu | Surface | Recouvert | Doigt | Défilement | Geste | Sélection | Quitter | Débordement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pickpocket` | 328×434 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `burglary` | 328×346 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `exam` | 328×389 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `performance` | 328×464 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `infiltration` | 328×334 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `docking` | 328×334 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `table` | 328×294 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `walkabout` | 328×217 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `attic` | 328×444 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `escape` | 328×334 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `chase` | 328×303 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Onze sur onze**, mesurés en situation réelle, sur un écran de 360 points,
au cours d'un seul et même parcours.

La dernière ligne s'est gagnée. Ce que le fumigène a joué pour l'obtenir, dit
par lui :

```
nuit 1 : Repéré — une torche, une voix. 5 ans de plus.
nuit 2 : Repéré — 4 ans de plus.
nuit 3 : Repéré — 5 ans de plus.
nuit 4 : le périmètre est franchi — 15,4 s, 229 décisions.
```

Trois échecs, et le régime qui se durcit à chaque fois — c'est le jeu qui
fonctionne, pas un pilote qui trébuche. La quatrième passe.

## Le onzième — comment on y arrive

`chase` ne s'ouvre qu'après avoir **franchi le périmètre** d'une évasion. Il
n'y a pas d'autre chemin : ni écran, ni sauvegarde ne peuvent y mener, parce
que la phase vit dans l'état de l'écran et non dans la partie. Le fumigène doit
donc gagner l'évasion pour de bon — et il perdait toujours.

Le point important est **pourquoi** il perdait, parce que la réponse n'était
pas « le test est mal écrit ». Mesuré sur le moteur seul, sans affichage, cent
vingt plans par politique (`tools/measure-evasion.mjs`) :

| Politique | Sortis | Jauge pleine | Marché sur un gardien | Appel |
| --- | --- | --- | --- | --- |
| Foncer sur la brèche | **6 %** | 65 | 37 | 11 |
| Contourner les murs | **38 %** | 32 | 42 | 0 |
| Se servir de la cour | **63 %** | 36 | 8 | 1 |

Ces trois lignes disent la même chose de trois façons : **la cour se traverse
en la regardant.** Foncer se plante dans un mur ; contourner se fait voir ;
et ce qui fait passer de 38 % à 63 %, ce n'est pas d'aller plus vite, c'est de
s'arrêter — sur un abri, le temps que le faisceau passe, et à distance des
rondes. C'est exactement ce que le mini-jeu demande. Il n'était pas truqué :
il attendait qu'on joue.

Le pilote qui obtient 63 % est dans `tools/pilote-evasion.mjs`. Trois
propriétés le rendent défendable comme preuve :

1. **Il ne voit que ce qui est dessiné.** Les murs et les abris sont des `div`
   placés en pourcentage ; les pions et le cône du projecteur aussi ; la
   vigilance est la largeur d'une barre. Il ne connaît ni l'orientation du
   regard d'un gardien, ni sa portée, ni sa ronde — rien de cela n'est
   affiché — et suppose donc le pire.
2. **C'est le même code des deux côtés.** `measure-evasion.mjs` le mesure sur
   le moteur, où l'on peut jouer mille parties ; le fumigène l'injecte tel
   quel dans la page (il n'a aucun `import`), où l'on n'en joue que six.
3. **Il décide dans la page.** Les versions précédentes télégraphiaient un
   coup par aller-retour réseau, soit trois décisions par seconde là où il en
   faut vingt. Un pilote trop lent rate le passage du faisceau, et l'on
   concluait à tort que le jeu était imprenable.

Sa limite, dite plutôt que cachée : il envoie des mouvements de pointeur et
jamais d'appui, donc il ne court jamais. Le jeu s'en accommode — courir coûte
deux fois et demie plus cher sous un regard qu'il ne fait gagner de vitesse —
mais un appui synthétique ferait échouer `setPointerCapture`, et une erreur de
console ferait échouer tout le test. **Ce que le doigt fait vraiment est
mesuré à part**, par la sonde, avec le vrai tactile du navigateur.

## Ce que la mesure a trouvé

### La course commençait derrière le message qui l'annonce

C'est la trouvaille de cette passe, et elle n'a été possible que parce qu'on
est enfin arrivé jusque-là.

Franchir le périmètre affiche « De l'autre côté — le périmètre est derrière
toi… » et **enchaîne la course dans le même geste**. Le message se pose
par-dessus la scène ; la course, elle, démarrait aussitôt. Pendant que le
joueur lisait, les poursuivants avançaient sur un personnage immobile.

```
la course, si le joueur ne touche à rien
poursuivants   rattrapé sans bouger   au bout de (médiane)   au plus tard
1              80 / 80                1,28 s                 1,92 s
2              80 / 80                1,04 s                 1,72 s
3              80 / 80                1,04 s                 1,36 s
```

Une seconde. Le seul mini-jeu du jeu qui s'ouvre derrière une modale était
donc perdu avant d'être joué — et d'autant plus sûrement que le joueur prenait
le temps de lire. Le même défaut existait sur l'autre chemin qui y mène, le
cambriolage qui tourne mal.

`StartWhenReady` le répare à la racine : rien ne tourne tant que quelque chose
recouvre. Une fois lancée, la partie ne s'interrompt plus — sans ce verrou,
une modale ouverte plus tard démonterait la partie en cours au lieu de la
suspendre.

Le retour du défaut ne serait pas silencieux : la sonde referme le message,
puis cherche la course. Sans le verrou, la course serait déjà perdue et sa
feuille refermée à ce moment-là ; le fumigène dirait « aucune des six nuits
n'a franchi le périmètre » sur une nuit parfaitement réussie.

### Le socle, et ce qui allait déjà

`components/MiniGameHost.tsx` était correct sur l'essentiel, et il faut le
dire parce que c'est ce qui a évité une réécriture : **événements de
pointeur** — pas `mousemove` et `touchmove` séparément — avec
`setPointerCapture` dès l'appui, donc un glissé qui survit au doigt sortant de
la zone. `touch-action: none` et `user-select: none` étaient déjà posés.
Souris, doigt et stylet passent par le même chemin.

### Trois autres défauts réels

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

## Ce que la sonde a dû apprendre

**Elle devinait le nom du jeu d'après l'endroit du parcours** : faux dès qu'un
écran en ouvrait deux. Chaque jeu se nomme maintenant par son objectif.

**Elle visait « le premier bouton Partir de la page »** : l'écran de détention
monte la fuite derrière l'évasion, et la sonde tombait sur celui d'un jeu
masqué, de hauteur nulle. Elle vise maintenant le bouton du jeu qu'elle
mesure.

**Elle disait mesurer au doigt et se servait de la souris.** Le commentaire
promettait `page.touchscreen` ; le code appelait `page.mouse`. Les événements
de pointeur passaient bien, mais avec `pointerType: 'mouse'` — et surtout **un
glissé à la souris ne fait jamais défiler une page**. La colonne « pas de
défilement parasite » ne pouvait donc pas échouer : elle ne mesurait rien. Le
geste passe désormais par le protocole du navigateur
(`Input.dispatchTouchEvent`), c'est-à-dire par un vrai doigt.

**Elle ne regardait pas ce qu'il y a sous le doigt.** Une surface parfaitement
dimensionnée, réactive et sans débordement n'est pas jouable si une modale la
recouvre. Aucune des six autres mesures ne pouvait le voir — c'est
`elementFromPoint` qui a montré la course qui se jouait toute seule.

## Ce qui n'est pas traité

- **L'orientation paysage** : le jeu est conçu en portrait (§105) et rien ne
  la force ; sa gestion n'est pas vérifiée.
- **La reprise après rotation** (§42) : non testée.
- **Le retour haptique** (§113) : aucun point d'accroche n'existe encore.
- **La performance en jeu** : `MOBILE_PERFORMANCE_AUDIT.md` reste à faire.
