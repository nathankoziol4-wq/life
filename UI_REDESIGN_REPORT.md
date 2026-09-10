# La refonte de l'interface

§160. Ce document raconte ce qui a été refait, ce que cela a coûté, et
surtout **ce que la mesure a trouvé en chemin** — parce que c'est de loin la
partie la plus instructive.

Chaque nombre ici sort d'un outil qui tourne, pas d'un souvenir. Les outils
sont dans `tools/`, ils s'exécutent par `npm run audit:*`, et trois d'entre
eux **échouent** si l'on casse ce qu'ils surveillent.

---

## Ce qui a été refait

| | Avant | Après |
| --- | --- | --- |
| Vocabulaire de listes | `components/Modal.tsx` | `ui/components/list.tsx` |
| Fichiers d'écran sur l'ancien vocabulaire | 36 | **0** |
| Jetons de style | aucun | **188**, en trois blocs de thème |
| Thème | sombre seulement | clair, sombre, ou comme l'appareil |
| Vues sous témoin de parité | 21 | **203** |
| Entrées relevées | 264 | **3 416** |
| Refus muets | 243 mesurés, davantage invisibles | **0**, et une barrière qui échoue |

Trente-six fichiers — trente-deux écrans et quatre composants — ont été
repris un par un, jamais en bloc. Chaque étape a suivi le même ordre, et
l'ordre compte : **vérifier la couverture, puis migrer, puis mesurer.** Les
trois quarts des découvertes de ce document viennent de la première étape.

---

## Ce que la mesure a trouvé

C'est le cœur du sujet. **Les instruments se sont trompés plus souvent que le
jeu.** Une douzaine de défauts d'outillage, chacun trouvé en vérifiant une
mesure qui paraissait bonne.

### L'inventaire ne voyait pas ce qu'il servait à protéger

Le garde-fou de parité relève tout ce qui est touchable et le compare à un
témoin versionné. Il ne cherchait que `button`, `[role=button]` et `a[href]`.

Or un écran qui refuse une ligne écrit couramment
`onClick={raison ? undefined : …}` : la ligne perd son geste, donc sa balise
de bouton, donc sa place dans l'inventaire. **Le garde-fou censé surveiller
les refus était aveugle à la moitié d'entre eux.** Le témoin est passé de 667
à 1 263 entrées le jour où il a appris à viser `[data-row]`.

Et « actionnable » ne suffisait pas non plus : un `button disabled` **est** un
bouton, et n'est lu par aucune voix de synthèse. Sans cette seconde
correction, le rapport aurait annoncé zéro refus muet alors qu'il en restait
cinq.

### Chaque passe écrasait les onglets de la précédente

`inventory[label]`, sans préfixe, alors que les feuilles qu'il ouvre en
portaient un. Le témoin ne contenait pas les onglets de la première partie
*et* ceux de la seconde : il contenait **deux fois ceux de la dernière**, sous
des noms qui laissaient croire au contraire. Cinquante-trois amitiés, une
scolarité et un patrimoine n'étaient comparés à rien.

Le défaut ne pouvait pas se voir avec deux parties — les deux étant
scolarisées, les écrans se ressemblaient assez. La troisième l'a révélé.

### On mesurait des écrans de gestion sur des gens qui n'ont rien à gérer

Le parcours tournait sur des adolescents sans le sou. Conséquence : la moitié
« tenir » de chaque écran — l'entreprise, le portefeuille, la carrière de
scène, la campagne — n'était jamais relevée. On photographiait les
catalogues grisés et l'on croyait avoir vu l'écran.

Il a fallu **treize sauvegardes**, en quatorze passages, pour couvrir ce
qu'une vie jouée n'atteint pas : un détenu, un affilié, un enfant, un patron,
un musicien avec douze sorties, un souverain, une campagne la veille du
scrutin, une famille qui a gardé des choses.

La plus instructive est la plus bête : `ChildhoodScreen` ne s'ouvre qu'entre
trois et quinze ans, et **personne n'était jamais un enfant.**

### Un écran qu'aucune sauvegarde ne peut atteindre

`CreationScreen` s'affiche *avant* qu'une partie existe. Tout le parcours
charge une sauvegarde puis recharge la page : il ne pouvait, par
construction, jamais y arriver. On fait donc l'inverse de tout le reste — on
**efface** la sauvegarde. 308 entrées d'un coup.

Et il a fallu figer `Math.random` dans la page : l'écran tire sa graine au
hasard, et deux exécutions identiques donnaient 33 disparitions et 24
apparitions. **Un témoin qui hurle au faux positif à chaque passage est un
témoin qu'on apprend à ne plus lire.**

### Les corrections ont leurs propres effets de bord

Neuf vues de l'enfance ont disparu du témoin sans qu'une action du jeu ait
bougé. Cause : depuis qu'un refus est un bouton annoncé, les lignes fermées
figurent dans la liste des lignes à ouvrir, et consommaient le budget de
clics à la place de celles qui mènent quelque part. La marche les ignore
désormais — elles n'ouvrent rien, c'est leur définition.

### Un garde-fou qui crie au loup

Un avertissement ajouté en passant se plaignait d'avoir ouvert des lignes
sans relever de vue. C'est indistinguable d'un écran plat, et il se
déclenchait sur deux écrans parfaitement sains. Il a été remplacé par une
condition sans ambiguïté : n'avoir rien trouvé à ouvrir.

---

## Le défaut de conception, et sa correction

Un seul motif revient sur tous ces écrans, sous quatre formes.

**Une ligne que le jeu refuse est presque toujours un « pas encore, et voilà
pourquoi ».** L'explication *est* le contenu. Or :

1. **Le refus muet.** La ligne devient grise et ne dit rien. Sept lignes de
   l'agenda s'éteignaient sur une limite d'âge sans jamais dire laquelle ; le
   joueur ne savait pas s'il fallait attendre un an ou dix.
2. **L'alternance.** `sub={blocage ?? description}` : le refus **remplace** ce
   que la ligne propose, et l'on ne peut jamais lire les deux.
3. **Le bloc inerte.** `onClick={raison ? undefined : …}` retire la balise de
   bouton : hors de l'ordre de tabulation, hors de l'arbre d'accessibilité,
   jamais annoncée.
4. **L'absence.** `{!blocage && <Row …/>}` : la ligne disparaît entièrement.
   C'est le pire des quatre — un refus se lit, une absence ne se lit pas. Le
   joueur ne peut ni apprendre que l'option existe, ni deviner ce qui la
   rouvrirait.

La quatrième forme cachait des actions parfaitement légales. « Refuser un
engagement » disparaissait quand on ne pouvait pas l'accepter — alors que
`declineOffer` ne vérifie rien du tout, et que refuser est précisément ce
qu'on voudrait faire quand on ne peut pas tenir.

`Row` porte désormais `closed` et `because` : la ligne reste présente,
annoncée, refuse l'appui, et sa raison se lit à côté de ce qu'elle propose.

**Résultat mesuré, sur le témoin actuel :**

| | |
| --- | --- |
| Lignes relevées | 2 819 |
| dont fermées | 386 |
| **fermées sans raison affichée** | **0** |

Les sept boutons fermés restants ne sont pas des lignes : « Emprunter 0 kr »
désactivé tant qu'aucun montant n'est saisi est l'usage normal de
l'attribut, et le libellé dit déjà l'état.

### Un usage de `closed` qui n'était pas prévu

`closed` + `because` a été fait pour un refus : *tu ne peux pas encore, voilà
pourquoi*. L'écran des obsèques s'en sert pour autre chose, et cela vaut d'être
noté parce que le motif se reproduira.

La moitié de cet écran est la liste de ceux qui **ne viendront pas**, chacun
avec la raison qui le retient : « Vous ne vous parlez plus », « Tu ne lui as
pas parlé depuis onze ans », « Ce qu'il vous restait : 12 sur 100 ». Ce ne sont
pas des refus de l'interface — rien n'est à débloquer, et il n'y a rien à
faire. C'est le contenu de l'écran : une absence, et son motif.

Le composant convenait sans être touché, parce que la règle qu'il porte —
*une ligne hors d'atteinte reste présente, reste annoncée, et donne sa
raison* — est exactement ce qu'il fallait. La leçon est que la distinction
utile n'est pas « refusé / disponible » mais **« quelque chose manque, et l'on
dit quoi »**, ce qui est plus large que ce pour quoi la propriété a été
écrite.

Une seule chose a dû être ajoutée à l'écran et pas au composant : ces lignes
fermées gardent un geste — on peut aller prévenir la personne soi-même. `Row`
refuse le clic quand `closed` est posé, ce qui est juste dans le cas général ;
ici le geste passe donc par la pastille « y aller » de la colonne de droite,
et non par la ligne. Aucun changement du système : la ligne fermée dit une
absence, la pastille propose la seule chose qui puisse encore y remédier.

---

### Trois tests qui passaient par chance

Ce chantier-ci n'a touché à aucune interface : il a ajouté vingt scènes
d'événements avant six ans. Ajouter des événements ne change pourtant pas
seulement le catalogue — cela redécale toute la suite du générateur, puisqu'un
tirage porte désormais sur une liste plus longue. Quatre tests sont tombés, et
**aucun des quatre ne mesurait ce qu'il croyait mesurer** :

- `boitier` exigeait qu'ouvrir le mini-jeu et le laisser au dé laissent le
  générateur dans le même état — c'est-à-dire que gagner un coup que le dé
  aurait perdu ne change rien à la suite. Impossible, et contraire au propos :
  réussir évite la blessure, l'enquête, l'arrestation, et chacune tire à son
  tour. **Dix-neuf graines sur soixante échouaient déjà** ; la onze passait par
  chance. Ce que le code garantit vraiment — la partie laissée au dé est
  exactement l'une des deux parties forcées — est désormais vérifié sur
  quarante graines, avec l'exigence que les deux issues se produisent.
- `dépendance` échouait sur « 100 n'est pas plus grand que 100 » : l'opinion du
  confident était au plafond. On la pose au milieu, comme on posait déjà la
  chaleur.
- `famille` comparait une solidité de dossier bornée à [0,02 · 0,97] : le
  casier retirait bien ses 0,42 points, mais sous le plancher, où l'on ne voit
  plus rien. On compare la somme des poids, et la borne en plus.
- `pratiques` affirmait qu'un régime tenu vingt ans améliore la santé, sur
  quarante graines. Rebalayé, l'effet n'apparaît qu'à partir de cent cinquante
  paires — à quarante, **le signe lui-même change d'un échantillon à l'autre**.
  L'échantillon passe à cent quatre-vingts, et le compte des survivants, qui
  tolérait « une vie d'écart », devient une comparaison des paires discordantes
  contre ce qu'un pile ou face y produirait.

Rien n'a été affaibli pour faire passer la suite : trois de ces quatre tests
sont plus sévères qu'avant, et le quatrième mesure enfin quelque chose.

## Ce qui empêche le retour

Trois barrières, toutes écrites **après** avoir constaté le défaut qu'elles
interdisent, et toutes dans l'intégration continue.

| Barrière | Ce qu'elle lit | Ce qu'elle rate |
| --- | --- | --- |
| Aucun `<Row disabled>` | le code, **tous** les états | ce qui n'est pas un `<Row>` |
| Aucun `<Row closed>` sans `onClick` | le code, **tous** les états | idem |
| `audit:parite` échoue sur un refus muet | le jeu en marche | **les états qu'il n'atteint pas** |

Aucune ne remplace les autres, et ce n'est pas une précaution de style : la
ligne « retirer le dernier » de la création est muette quand la fratrie est
vide, et le garde-fou d'exécution ne l'a jamais signalée — le brouillon de
départ a des frères et sœurs. Elle s'est trouvée par la lecture.

Les deux premières règles n'étaient pas tenables tant que deux `Row`
coexistaient. **`Row`, `Card` et `Section` ont donc été supprimés de
`components/Modal.tsx`** : c'était la porte par laquelle tous ces défauts
sont revenus, et un écran neuf ne peut plus la retrouver.

---

## Le reste de la refonte

### Le thème

188 jetons, et trois blocs plutôt que deux : `:root` nu, puis
`@media (prefers-color-scheme: dark)` gardé par `:not([data-theme='light'])`,
puis `:root[data-theme='dark']`. Sans le troisième, le choix explicite du
joueur perdait contre la préférence du système dans un sens seulement.

Le thème est lu **avant tout rendu**, dans la coquille d'amorçage : sans
cela, un joueur en thème sombre prenait un éclair blanc à chaque ouverture.

### Le mobile

Cinq largeurs × huit écrans, quatre tailles couchées × six écrans, et un
clavier simulé sur huit champs. Tout est à zéro : débordement horizontal,
cibles sous 44 points, cibles trop serrées, texte coupé, texte sous 12
points, contenu masqué par la barre, bas inatteignable. En paysage, le
contenu garde 196 points au pire sur un petit Android couché.

### Ce qui n'est pas corrigé, et pourquoi

**Le paquet pèse 1 536 ko sur le disque, 478 ko transférés, en un seul
morceau.** Le découpage par écran a été mesuré avant d'être écarté : les
écrans ne pèsent que 12 % des sources et tirent derrière eux le moteur et les
catalogues dont la simulation a besoin de toute façon. Conséquence directe, à
dire même quand la case est verte : « le jeu est touchable » sur 4G lente
vaut **2 938 ms pour un budget de 3 000**. C'est *au* budget, pas en dessous,
et le verdict dépend du jour.

Trois mesures ont bougé depuis le début de la refonte, toutes dans le budget
et aucune à zéro comme elles l'étaient : « prendre un an » passe de 78 à
**98 ms** (budget 200), le mini-jeu le plus dessiné perd **2 images sur 176**
là où il n'en perdait aucune (budget 3), et il reste **une tâche de 54 ms**
en cours de partie là où il n'y en avait aucune (budget 200). Rien d'alarmant
— mais l'écrire est le seul moyen de s'apercevoir, dans six mois, que la
tendance ne s'est pas inversée.

**Les classes CSS `.row`, `.card`, `.section` survivent** dans une centaine
d'endroits qui écrivent leur mise en page à la main. C'est un autre chantier,
et il ne touche pas au comportement.

**Les modales ne sont pas parcourues** par l'inventaire : `clearEvents` les
referme avant tout relevé. Le détail d'un bien, celui d'un véhicule et la
salle des ventes sont relus, pas mesurés.

**`autoSearch` ne vérifie pas son propre verrou** : la porte du grenier
n'existait que dans l'interface. La ligne fermée refuse l'appui, donc le
comportement est identique — mais le garde-fou est au mauvais étage, et cela
regarde le système, pas la refonte.

---

# La passe des treize menus

Cette section prolonge le document sur une campagne menée écran par écran :
les treize menus du jeu, mesurés au rendu, corrigés là où la mesure trouvait
un défaut — et **déclarés sains là où elle n'en trouvait pas**.

## L'instrument avant les conclusions

`npm run audit:menus` ouvre le jeu, joue trente années, puis relève pour
chaque menu sa hauteur en écrans de téléphone, ses lignes, la part qui agit,
et **la distance au premier geste possible**. C'est cette dernière qui compte
le plus : elle dit combien on demande au joueur de faire confiance avant de
lui montrer pourquoi.

L'outil refuse trois choses, chacune apprise à ses dépens : qu'un onglet de
jeu dépasse six écrans, que le journal dépasse seize, et qu'un onglet ne soit
pas mesuré du tout.

## La carte, à trente ans

| Menu | écrans | 1er geste | verdict |
| --- | --- | --- | --- |
| Vie | 10,4 | 24 px | corrigé — était 36,9 et croissait sans fin |
| Paramètres (profil) | 6,7 | 241 px | corrigé — était 2 683 px |
| Relations et famille | 4,5 | 87 px | corrigé — un groupe pesait 46 % |
| Personnage | 4,4 | 84 px | sain |
| Finances, immobilier, véhicules | 2,1 | 357 px | sain |
| Animaux | 1,8 | 217 px | sain |
| Études | 1,8 | 127 px | sain |
| Activités | 1,7 | 52 px | sain |
| Sport | 1,4 | 13 px | sain |
| Santé | 1,0 | 187 px | sain |

Deux échappent encore à la mesure, et il vaut mieux le dire que le masquer :
**Travail** demande un personnage qui ait un emploi — celui de la mesure est
sans emploi à trente ans — et **Événements** vit dans les modales.

**Sur onze menus inspectés, sept sont sains.** Ce n'est pas un défaut de
recherche : les vrais défauts de ce dépôt sont rares et profonds plutôt que
nombreux et superficiels. Trois corrections valent mieux que trente retouches
vendues comme du travail.

## Les trois défauts, et ce qu'il y avait dessous

**Le journal grandissait sans fin.** 29 548 px à trente ans, soit 36,9 écrans,
et une année de plus à chaque tour : près de cent à quatre-vingts ans, sur
l'écran qu'on voit le plus. Il déplie désormais les huit dernières années et
garde le reste à un appui. La preuve n'est pas la réduction mais la borne : à
soixante ans il fait 10,6 écrans, soit **moins** qu'à trente.

**Un groupe écrasait l'écran des proches.** « Amis » pesait 2 602 px — 46 % du
total, 28 personnes. Chaque groupe montre six proches, les plus liés d'abord,
le reste derrière une ligne qui les compte. Plus aucune section ne dépasse
20 %.

**Les réglages étaient enterrés.** Premier geste du profil à 2 683 px, trois
écrans et demi de biographie avant de pouvoir changer de thème. La cause
n'était pas la longueur mais l'ordre : dix sections sans un seul geste
ouvraient l'écran. 2 683 → 212 px, à hauteur totale inchangée.

## Ce que les instruments ont coûté

Cinq fois dans cette campagne, la mesure a menti plus fort que le code. Cela
mérite d'être consigné, parce que corriger un écran qui n'a rien coûte plus
cher que de laisser un défaut.

- Viser `.app-body` en dur rendait **800 px pour 137 lignes** — impossible, et
  publiable tel quel.
- Des libellés d'onglets inventés — « Toi », « Proches », « Argent », qui
  n'existent pas — faisaient passer une boucle **sans rien mesurer, en
  silence**.
- Ne compter que les `[data-row]` déclarait **vides quatre sections qui
  portaient dix-huit tuiles** : j'ai failli refondre l'Agenda, qui n'avait
  rien.
- L'outil a conclu « les menus tiennent leurs plafonds » après avoir échoué à
  mesurer les quatre onglets. **Un vert obtenu en ne mesurant rien.**
- Deux feuilles s'empilent : viser la première rendait l'écran du dessous, et
  « Personnage » a mesuré exactement la même hauteur que « Profil ».

## Le mouvement, et ce qu'on a choisi de ne pas animer

La battue a été menée avec `find-animation-opportunities`, qui est un filtre
et non une liste de souhaits : plafond de sept propositions, obligation de
nommer les rejets.

Retenu : la sortie des feuilles et des modales — elles entraient en glissant
et disparaissaient d'un coup — le retour au doigt sur le bouton de retour et
les contrôles segmentés, l'apparition échelonnée des lignes, les compteurs
sur l'argent, l'âge, l'année et la valeur nette, et une présentation à part
pour les jalons d'une vie.

Rejeté, et c'est le plus important : **la transition entre onglets**. Navigation
centrale, vue cent fois par jour. Elle a été implémentée quand même, a causé
deux régressions — une feuille rétrécie de 28 px par un bloc conteneur, puis
un mini-jeu injouable — et a été retirée. La méthode avait raison avant nous.

## Deux régressions introduites, trouvées par le test de fumée

Aucune n'était visible autrement : le typage passait, les 1 650 tests
passaient, l'audit mobile était à zéro, la CI était verte.

**Un voile fantôme.** La modale en sortie gardait la classe `overlay` tout en
étant `pointer-events: none` : un sélecteur y trouvait un nœud mort. D'où la
règle, écrite dans le code : *un élément en cours de départ ne doit pas
répondre au nom du vivant.*

**Une feuille invisible et traversante.** L'état de sortie restait collé quand
un panneau en ouvrait un autre — React réutilise l'instance — et l'animation
`forwards` laissait le nœud à opacité zéro. Un joueur aurait vu un écran mort.
J'avais anticipé le premier piège et pas le second : raisonner sur les modes
de panne ne remplace pas de les exécuter.

## Les emoji remplacés par un jeu d'icônes dessiné

1 599 usages d'emoji sur 462 formes distinctes. Trois défauts, dont un seul se
voit : un emoji **rend différemment sur chaque plateforme** — un contrat qu'on
ne maîtrise pas ; il **ne prend pas la couleur du texte**, donc une ligne
fermée garde son signe à pleine intensité pendant que le reste s'éteint ; et
son style figuratif jure avec une interface au trait.

`src/ui/components/Icon.tsx` : 134 tracés sur une grille de 24, tous au même
trait de 1,8, sans remplissage, `stroke: currentColor`. Les noms disent le
sens et non la forme — `sortie` et non `porte` — parce qu'un jeu nommé par les
formes finit par contenir deux fois le même dessin.

**134 tracés pour 462 emoji, et c'est voulu.** `🏆 🏅 🎖️ 🎗️` disent tous
« distinction » ; leur donner quatre dessins différents serait quatre fois le
même signe avec du bruit. Le partage est la règle, pas une économie.

`Glyph` tente le dessin et retombe sur l'emoji s'il n'y en a pas. C'est ce
repli qui a permis de migrer par lots sans jamais casser un écran, et il reste
en place pour l'écran suivant. Six surfaces le traversent : les lignes de
liste, les tuiles, le fil de vie, les états vides, la fiche de statistiques et
la barre d'onglets — cette dernière gagne au passage une couleur d'état sur
l'onglet actif, que l'emoji, qui porte la sienne, ne pouvait pas prendre.

### Ce qui n'est pas devenu un dessin

Les puces typographiques — `·`, `•`, `—`, `…` — restent telles quelles. Aucun
des trois défauts ne les touche, et une puce transformée en tiret ne dit plus
la même chose.

Les pastilles d'état — `🟢 🟡 🔴 🔵 ⚪ ⬜` — restent aussi, pour une raison
différente et plus gênante : elles ne disent rien par leur forme, ce sont des
disques identiques ; elles disent tout par leur couleur. Un dessin au trait
qui prend l'encre du texte les rendrait toutes pareilles et supprimerait
l'information. Les remplacer demande de refaire ces indicateurs — une pastille
teintée, ou un mot — ce qui est un autre chantier, et un défaut de conception
signalé ici plutôt que masqué.

Les deux sortent du dénominateur au lieu de peser sur un plancher qu'elles
n'ont aucune raison de faire baisser.

### La sixième erreur d'instrument, et la plus flatteuse

Le recensement ne lisait que les `.tsx`, et n'y cherchait que deux écritures.
Il a annoncé **100 % de couverture** — chiffre rond, plausible, faux, et
annoncé comme tel avant d'être vérifié. Deux populations manquaient :

- les tables en `.ts` (`systems/`, `data/`, `engine/newLife.ts`) — la vraie
  mesure était **72 %** ;
- puis, une fois celles-ci lues, les signes écrits dans une expression
  (`emoji={marge > 14 ? '🟢' : '🔴'}`) : **86 formes de plus**, trouvées
  seulement parce que le test de fumée s'est cassé dessus.

Un dénominateur trop petit ne se voit jamais dans le résultat, parce qu'il ne
produit pas d'anomalie — il produit un bon chiffre. C'est la même faute que
les cinq précédentes de ce rapport, dans sa forme la plus dangereuse : elle ne
fait pas échouer, elle fait réussir, et il a fallu deux corrections
successives avant que le chiffre veuille dire quelque chose.

Le recensement lit maintenant les deux extensions et les trois écritures, et
s'exclut lui-même ainsi que `Icon.tsx` — un outil qui se lit lui-même mesure
son propre commentaire, ce que ce projet a déjà connu deux fois
(`jetons.mjs`, `contraste.mjs`).

### Ce que le test de fumée a attrapé au passage

Deux de ses parcours reconnaissaient une ligne à l'emoji qui l'ouvrait —
`/^💬/` pour une réponse d'entretien. Ce marqueur a disparu du texte le jour
où l'emoji est devenu un dessin, et les deux parcours se sont arrêtés en
silence. `Icon` pose maintenant `data-icon="parole"` dans le DOM et le test
vise le sens : le libellé peut être retraduit, le dessin redessiné, le sens
reste.

### Deux gardes, parce que l'échec est silencieux dans les deux sens

`icones.test.ts` — `Icon` rend `null` quand le nom ne correspond à rien : une
faute de frappe dans la table ne casse pas la page, elle efface le signe. Le
test relie chaque emoji à un tracé existant, signale les tracés que personne
n'emploie, et tient un plancher de couverture. Il est fixé à 95 et non à 100
pour que l'écran suivant puisse s'écrire avec un signe pas encore dessiné sans
faire rougir la suite.

`tools/traces.mjs` (`npm run audit:traces`) — le test précédent vérifie qu'un
tracé *existe*, pas qu'il *se voit*. SVG abandonne l'analyse d'un `d` mal formé
à la première commande illisible et dessine ce qu'il avait compris, sans un
mot. L'outil mesure les 134 tracés dans un vrai navigateur : longueur rendue,
boîte englobante hors grille, taille trop faible pour la case. Vérifié en
cassant un `d` volontairement — il tombe, et nomme le coupable.

## Une palette plus sombre et plus contrastée

Demande : des couleurs plus sombres et plus contrastées. Les deux vont
ensemble — on ne gagne pas du contraste en assombrissant tout, on le gagne en
écartant l'encre du fond.

**Thème clair.** Le fond descend de `#eef0fb` à `#d9dff1` et les surfaces
restent blanches : ce n'est pas la carte qui s'éclaire, c'est le sol qui
s'enfonce, et l'écart se creuse. L'encre passe de `#14132b` à `#0a0918`.

| encre sur une carte | avant | après |
|---|---|---|
| `--ink` | 15,0:1 | **19,7:1** |
| `--ink-soft` | 10,3:1 | **13,5:1** |
| `--ink-muted` | 7,0:1 | **9,0:1** |

**Thème sombre.** `#12122b` devient `#0a0a19` — une nuit, plus un bleu de
minuit. Les couleurs de famille montent en clarté au lieu de descendre : sur
un fond plus noir, un accent plus vif se détache davantage. Les douze
pastilles tiennent entre 6,9 et 10,0:1 là où le plancher est à 4,5.

Les sept familles gardent leur teinte — vert l'argent, rouge la santé, rose
l'amour, bleu la carrière, violet le savoir, ardoise le crime, or la gloire.
Assombrir ne veut pas dire renommer : un écran qui dit « argent » doit
continuer à dire la même chose.

### Le défaut trouvé en chemin, et il touchait de vrais joueurs

Le thème sombre a **deux sources**. Le réglage explicite du joueur pose
`data-theme='dark'` ; « comme le système » ne pose rien et passe par
`@media (prefers-color-scheme: dark)`. Le fichier le disait déjà en
commentaire : *« une couleur qui ne serait que dans l'un des deux manquerait à
l'autre »*.

Elles avaient divergé quand même. Le bloc du `@media` portait la matière d'une
ancienne palette brune **et les couleurs de famille du thème clair** : des
pastilles presque blanches sur un fond presque noir, du vert foncé sur du
brun. Tout joueur n'ayant jamais touché au réglage voyait cette version-là.

Personne ne l'a signalé pendant des semaines parce que **l'outil de contraste
et son test ne lisaient que la variante explicite**. Septième erreur
d'instrument de ce chantier, et la première dont la conséquence était visible
à l'écran plutôt que seulement dans un chiffre.

Trois corrections, parce qu'un commentaire ne tient pas un invariant :

- les deux blocs portent désormais les mêmes valeurs ;
- `contraste.mjs` lit la variante `@media`, compare les deux, et nomme chaque
  jeton qui diffère ;
- `contraste.test.ts` en fait un test — donc la CI, où l'audit ne tourne pas.
  Vérifié en faisant diverger un seul jeton : les deux tombent et le nomment.

Ce même test avait gardé un défaut que l'outil avait déjà corrigé : il
découpait « du premier `:root` jusqu'au premier `@media` » et ne lisait donc
jamais les douze couleurs de famille du thème clair. Corriger à un seul
endroit ne suffit pas.

## Les pastilles d'état : de la couleur seule à la forme

Six écrans distinguaient deux ou trois états avec `🟢 🟡 🔴 🔵 ⚪ ⬜` — des
disques de forme identique dont toute l'information tenait à la teinte. Un
homme sur douze est daltonien : pour lui ces lignes étaient muettes, et elles
l'étaient aussi pour quiconque en noir et blanc. WCAG 1.4.1 le nomme
exactement : la couleur ne doit jamais être le seul véhicule d'une
information.

**Ils ne disaient pas tous la même chose**, et c'est ce qui rendait un
remplacement uniforme impossible. Trois familles :

| ce que la ligne dit | avant | après |
|---|---|---|
| verdict sur une quantité | 🟢 🟡 🔴 | flèche montante · tiret · flèche descendante |
| case franchie ou non | ✅ ⬜ ❔ | coche · cercle vide · point d'interrogation |
| choix effectué | 🔵 ⚪ | cercle plein · cercle vide |

**Un des six était mal classé.** Dans l'écran de campagne, `🔵/⚪` n'indiquait
pas une sélection mais un verdict — « je mène dans ce bloc » ou « je suis
derrière ». Deux disques ne le disaient pas ; deux flèches le disent.

**Les flèches ont été redessinées pour ça.** `gain` et `perte` portaient un
zigzag à trois segments : lisible en couleur, ambigu en gris, où les deux
formes se ressemblaient. Une diagonale franche avec sa pointe lève le doute à
vingt pixels. Le changement profite à tout le jeu — ces deux tracés servent
partout où un chiffre monte ou descend.

### Le prop qui ne faisait rien

`Row` accepte un `tone` depuis sa création et pose une classe `ui-row-<ton>`.
**Rien ne la stylait.** Deux écrans passaient `tone="warn"` en croyant dire
quelque chose ; il ne se passait rien. Un prop inerte est pire qu'un prop
absent — on croit avoir dit quelque chose, et aucun outil ne peut contredire :
ni le typage, qui n'a pas d'opinion sur les feuilles de style, ni le test de
fumée, qui ne sait pas à quoi la ligne aurait dû ressembler.

Il colore maintenant **l'icône**, et pas le titre : la hiérarchie d'encre
reste commune à toutes les lignes, et la teinte s'ajoute à la forme comme
second canal. Une ligne se lit en noir et blanc, et se lit deux fois mieux en
couleur.

### Deux gardes, et l'exclusion qui disparaît

`icones.test.ts` interdit le retour d'une pastille dont la couleur serait la
seule information — rien n'empêcherait un écran neuf d'écrire `emoji="🟢"`.
Il perd du même coup la liste d'exclusion qui existait pour ces six signes :
elle n'avait de sens que tant que le défaut était là.

`mouvement.test.ts` relie le type et la feuille : chaque ton que `Tone`
autorise doit exister en CSS. C'est le test qui aurait signalé `tone` inerte
le jour de sa création. Les deux vérifiés en les cassant — ils tombent et
nomment le coupable.


## La quatrième écriture, trouvée sur une capture d'écran

En photographiant le résultat pour le montrer, une modale s'est ouverte : un
`🎗️` jaune de quarante-deux pixels au centre d'une interface entièrement au
trait. La rupture la plus visible que le jeu pouvait porter, restée là parce
que les événements ne disent pas `emoji` mais **`icon`** — un autre mot pour
la même chose, et une quatrième écriture que le recensement ne lisait pas.

214 usages, dont 39 sans dessin. La couverture réelle n'était pas de 100 %
mais de 97,9 %, et le plancher à 95 laissait passer l'écart sans rien dire.

C'est la quatrième fois que ce recensement se croit complet :

| découverte | ce qui manquait | annoncé | réel |
|---|---|---|---|
| 1 | `emoji: '…'` dans une table | — | — |
| 2 | les fichiers `.ts` | 100 % | 72 % |
| 3 | `emoji={cond ? … : …}` | 100 % | — |
| 4 | `icon:` des événements | 100 % | 97,9 % |

Le motif ne change pas : on cherche les formes qu'on connaît, le chiffre
obtenu est plausible, donc on ne cherche pas plus loin. Ce qui a fini par
trouver la quatrième n'est aucun outil — c'est d'avoir regardé l'écran.

Corrigé : le recensement lit `icon` comme `emoji`, la modale passe par `Glyph`
à quarante-deux pixels avec un trait affiné (l'épaisseur d'une icône de ligne
paraîtrait grasse au centre de l'écran), et les 34 formes manquantes sont
reliées — deux tracés neufs, `goutte` et `pas`, le reste par partage de sens.
**1 835 usages sur 1 835.**


## La profondeur : de la vraie 3D, en CSS

Demande : une navigation dynamique, des couleurs qui accrochent, de la 3D.

**Pas de bibliothèque.** Le projet n'a que `react` et `react-dom` en
dépendances d'exécution, et une bibliothèque 3D pèserait plus lourd que le jeu
entier. `perspective`, `rotateX`, `rotateY` et `translateZ` font de la vraie
profondeur, sur le GPU, sans une ligne de JavaScript.

| élément | avant | après |
|---|---|---|
| onglet actif | l'icône grossissait | elle avance de 14 px, inclinée de 14° |
| ligne pressée | `scale(0.98)` | elle s'enfonce de 22 px dans l'écran |
| tuile pressée | rétrécissait | elle bascule en arrière sur son bord haut |
| modale | `scale(0.82)` | elle arrive du fond et se redresse |
| bouton d'année | descendait | il pivote de 16° en s'enfonçant |
| changement d'écran | glissement latéral | les sections arrivent de profil |
| lignes d'une carte | montaient | elles se lèvent, couchées vers l'arrière |

Un `scale` dit « plus grand » ; un `translateZ` dit « plus près ». C'est toute
la différence entre une image qu'on agrandit et un objet qui vient vers soi.

### La décision qui évite la troisième régression

**La perspective est écrite sur chaque élément, jamais en propriété sur un
parent.** `perspective` en propriété crée un bloc conteneur pour tout
descendant en `position: absolute` — c'est exactement le piège qui a déjà
coûté deux régressions à cette branche : une feuille rétrécie de vingt-huit
pixels, puis un mini-jeu injouable. `transform: perspective(600px) …` sur
l'élément lui-même donne la même profondeur sans établir de bloc conteneur
pour qui que ce soit d'autre.

### Les couleurs : deux jetons là où il n'y en avait qu'un

`--primary` porte du texte sur des surfaces claires : il est contraint par un
plancher de lisibilité, et l'intensité demandée ne pouvait pas venir de lui
sans le casser. D'où `--brand-a` / `--brand-b`, employés uniquement là où de
la couleur *pleine* se pose — bouton d'année, boutons d'action, lueur. Violet
électrique vers magenta ; le blanc y tient **6,2:1 et 6,0:1**, mesuré avant
d'être posé. Le bouton d'année a désormais une lueur qui respire au lieu d'un
anneau.

### Ce que la 3D rend obligatoire

Une carte qui pivote est précisément ce qui déclenche un malaise vestibulaire.
Et **zéroter les durées ne suffit plus** : tant que le mouvement n'était que
des glissements, sans durée il n'y avait pas de trajet. Une rotation n'est pas
un trajet mais un **état** — `rotateX(9deg)` bascule instantanément, durée
nulle ou non.

Sous `prefers-reduced-motion`, tous les appuis redeviennent plats et les
entrées ne gardent que l'opacité. Vérifié dans un vrai navigateur — matrice 3D
en temps normal, `none` en mouvement réduit — puis tenu par un test qui refuse
tout sélecteur d'appui prenant de la profondeur sans repli plat déclaré. Le
test a été vérifié en retirant un sélecteur du bloc : il tombe et le nomme.


## Le dernier emoji : celui qui était collé au texte

Une capture du profil, prise pour montrer le résultat, portait encore
`☀️ Clair · 🌙 Sombre · 📱 Appareil` dans le sélecteur de thème.

Le recensement comptait bien ces signes. Le défaut n'était pas dans la mesure
mais dans le **chemin de rendu** : l'écran écrivait `label: '☀️ Clair'` — le
signe et le mot soudés dans une seule chaîne. Aucune table de correspondance
ne peut migrer ça, puisque le composant ne reçoit pas un signe et un mot mais
une phrase.

`Segmented` accepte désormais un `icon` séparé du `label`, et les trois choix
sont dessinés — soleil, croissant, téléphone.

**Le même défaut ailleurs, traité autrement.** `TrajectoryScreen` interpolait
un signe au milieu d'une demi-phrase : « Fort · 🧠 Son caractère ». Là, il a
été **retiré** plutôt que dessiné — un pictogramme posé au milieu d'un texte
ne s'aligne sur rien et coupe la lecture. Deux cas voisins, deux réponses :
un sélecteur à trois choix gagne une icône, une phrase n'en gagne pas.

### Ce qui reste en emoji, et doit y rester

L'avatar du personnage et le drapeau de son pays. C'est du **contenu** — un
visage, une nationalité — pas de la signalétique. Un dessin au trait leur
ferait perdre l'identité que le joueur reconnaît, et aucun des trois défauts
de l'emoji ne s'y applique de la même façon : personne n'attend d'un visage
qu'il prenne la couleur du texte.


## Le violet de la navigation devient indigo — et l'emplacement est mesuré

Demande : changer le violet du menu.

Ce n'était pas un choix libre. **Les sept familles de sens occupent presque
toute la roue** — vert l'argent, rouge la santé, rose l'amour, bleu la
carrière, violet le savoir, ardoise le crime, or la gloire, turquoise
l'accent. Un bleu franc à 217° serait *exactement* la carrière : mesuré, les
deux n'avaient qu'un écart de luminance de 1,25 — indiscernables.

Le seul créneau libre est l'**indigo, à 234°** : dix-sept degrés du bleu
carrière, trente-huit du violet savoir. La navigation n'est pas une famille de
sens — c'est du mobilier — mais elle traverse tous les écrans, et une teinte
de mobilier qui copie une teinte de contenu finit par brouiller les deux.

| | avant | après |
|---|---|---|
| onglet actif, clair | `#4a15c4` violet | `#1f2eb0` indigo |
| onglet actif, sombre | `#b79fff` | `#8f9cff` |
| bouton d'année | violet → magenta | indigo → azur |
| seuil et bandeau de score | dégradés violets en dur | même lignée que la marque |

### Le défaut trouvé en chemin : 1,65:1 sur le premier bouton du jeu

« Commencer une nouvelle vie » prenait son encre dans `--primary-ink`, qui
bascule avec le thème, alors qu'il est posé sur un blanc **fixe**. En thème
sombre ce jeton est un indigo pâle conçu pour du presque noir : le bouton
tombait à **1,65:1** pour un plancher de 4,5. Illisible, depuis toujours, pour
tout joueur en sombre.

**Aucun audit ne pouvait le voir**, et c'est le point. Celui du contraste
croise les encres avec les surfaces *du thème* ; ce blanc-là n'en est pas une.
Un croisement ne trouve que ce qu'on lui donne à croiser — c'est la même
famille de cécité que le dénominateur trop petit du recensement d'emoji, sous
une autre forme.

La règle qui en sort est structurelle et non numérique : **sur une surface de
marque, seuls des jetons de marque**. `contraste.test.ts` la tient, vérifié en
la cassant — il nomme la règle fautive et le jeton.
