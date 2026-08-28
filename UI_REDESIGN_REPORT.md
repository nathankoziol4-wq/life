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
