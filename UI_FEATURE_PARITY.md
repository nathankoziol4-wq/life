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
inventaire : 3087 entrées relevées, dont 2242 actionnables · 0 refus muets · témoin : 3087
disparues : 0 · ajoutées : 0 · changées d'état : 0
```

Le témoin a été multiplié par douze en cours de route — **264 → 497 → 667 →
1 263 → 2 050 → 2 669 → 2 764 → 3 087 entrées, 21 → 40 → 68 → 76 → 127 →
168 → 175 → 180 vues** — et chaque fois pour
la même raison : en vérifiant la couverture *avant* de toucher à un écran, on
découvrait qu'il n'était pas surveillé. **Neuf dixièmes de la surface du jeu
étaient hors du filet**, et le plus souvent parce que l'instrument avait un
défaut, pas parce que la marche était trop courte.

### Quatre parties, parce qu'un écran de gestion se mesure sur quelqu'un qui gère

Le parcours tourne sur quatre sauvegardes, et chacune a été ajoutée parce
que la précédente ne pouvait pas montrer quelque chose :

| Partie | Ce qu'elle ouvre |
| --- | --- |
| `fixture-leurs` | la vie ordinaire |
| `fixture-harcele` | la scolarité — 1 305 lignes qui n'étaient dans aucun parcours |
| `fixture-heritage` | le patrimoine et les objets de famille : « mes biens », « mon garage », « mes possessions » étaient fermés dans les deux premières |
| `fixture-patron` | un café tenu depuis six exercices et un métier vendu à côté |

Et cinq visites ciblées. La cinquième est le portefeuille, pour la raison
qui revient à chaque écran de gestion : **les quatre parties ne détiennent
rien.** La moitié haute — ce qu'on détient, la ligne bloquée, la
répartition, la vente — n'était donc jamais relevée.

`fixture-investor.mjs` existait pour cela et ne le faisait pas : elle
s'arrête à « de quoi placer », garde la première vie assez riche, et
n'achète rien. La faire acheter aurait été le geste évident — et le mauvais :
cette sauvegarde est la partie de référence de **cinq autres outils** (audits
mobile, paysage, clavier, performance, test de fumée). L'y faire investir la
laissait plus vieille et sans liquidités, déplaçant en silence leur base de
comparaison. D'où `fixture-placements.mjs`, qui place par `invest` — donc à
travers le ticket, les frais et le blocage de littératie.

Deux réglages ont demandé une mesure plutôt qu'une intuition. Le support à
blocage long doit être acheté **en premier**, sinon rien ne produit jamais
l'état « bloqué jusqu'en … ». Et le seuil de richesse est passé de trois à
huit fois le ticket : à trois, le personnage retenu se trouvait sans emploi
avec trois emprunts, l'année suivante ramenait ses liquidités à zéro, et un
portefeuille sans liquidités grise le marché entier — on gagnait la moitié
haute de l'écran en perdant la moitié basse. Trois vérifications à la fin
tiennent la promesse : une ligne bloquée, trois lignes au moins, et de quoi
acheter encore.

Et quatre visites pour les carrières qui ne s'atteignent pas par hasard : `fixture-scene`, `fixture-elu`, `fixture-couronne`,
`fixture-service`. Quatre écrans — la scène, le service, la tribune, la
couronne — totalisent 2 144 lignes, et voici ce que les quatre parties
ci-dessus en montraient : six entrées de catalogue pour la scène, sept pour
le service, et **rien du tout** pour les deux autres. Leurs sections sont
conditionnelles — sans mandat et sans maison régnante, la tribune et la
couronne ne s'affichent pas, ce qui est le bon comportement et ce qui les
rendait invisibles à la mesure. Un mandat demande un scrutin gagné ; naître
dans une maison régnante tient à la graine, environ une vie sur cent
cinquante.

Ces quatre-là ne refont pas le tour complet : ce serait quatre minutes de
plus pour cinq onglets déjà vus quatre fois. La visite va droit à la
section concernée, et la vise par son **titre** plutôt que par le libellé de
sa ligne — « Te présenter », « Ta campagne » et le nom du mandat détenu sont
la même ligne selon la partie.

La dernière suit le même raisonnement que la troisième.
`VentureScreen.tsx` est quatre écrans en un : on choisit un métier, ou on le
tient ; on choisit une entreprise, ou on la tient. Les trois premières
parties n'en possèdent aucune, si bien que seules les deux moitiés
« choisir » étaient relevées — deux catalogues de lignes grisées. Le tarif,
les commandes, l'effectif, le gérant, la caisse, la revente, la fermeture :
rien de tout cela n'était sous un témoin. Elle apporte en prime le seul
personnage d'âge mûr du lot, les trois autres ayant 17, 17 et 29 ans.

### Le seul écran qu'aucune sauvegarde ne peut atteindre

`CreationScreen.tsx` fait 886 lignes et s'affiche **avant** qu'une partie
existe : `App` montre l'accueil tant que l'état est nul. Tout le parcours
charge une sauvegarde puis recharge la page — il ne pouvait donc, par
construction, jamais y arriver, et ni la marche par onglets ni les visites
ciblées ne conviennent : ces écrans ne vivent pas dans `.app-body` et n'ont
pas d'onglets. On fait donc l'inverse de tout le reste : on **efface** la
sauvegarde. **308 entrées** apparaissent d'un coup, la plus grosse surface
non surveillée trouvée jusqu'ici.

Et il a fallu figer le hasard. L'écran tire sa graine par `randomSeed()`,
donc par `Math.random()`, et tout ce qu'il affiche en découle : la ville, le
logement, les loisirs à portée. Deux exécutions identiques donnaient 33
disparitions et 24 apparitions — un témoin qui hurle au faux positif à
chaque passage est un témoin qu'on apprend à ne plus lire. `Math.random` est
remplacé par une suite fixe dans la page, sans toucher au jeu : l'écran
reste celui du joueur, il montre simplement toujours le même tirage.

### Trois défauts trouvés en ouvrant les collections

**Le préfixe manquait sur l'onglet lui-même.** La ligne s'écrivait
`inventory[label]`, sans préfixe, alors que les feuilles qu'elle ouvre en
portaient un. Chaque passe écrasait donc les cinq écrans d'onglet de la
précédente : le témoin ne contenait pas les onglets de la première partie
*et* ceux de la seconde, il contenait deux fois ceux de la **dernière**, sous
des noms qui laissaient croire au contraire. Cinquante-trois amitiés, une
scolarité et un patrimoine n'étaient comparés à rien. Avec deux parties
scolarisées les écrans se ressemblaient assez pour que rien ne se voie ; la
troisième l'a révélé en même temps qu'elle en aggravait l'effet.

**Deux parties pauvres ne montrent pas ce qu'on possède.** Les deux
sauvegardes étaient celles d'adolescents sans rien : « mes biens », « mon
garage », « mes possessions » et « mes emprunts » fermés dans les deux, donc
quatre panneaux jamais ouverts. On mesurait la parité d'un écran de
patrimoine sur des personnages qui n'ont pas de patrimoine. Une troisième
partie — treize objets de famille, une maison, de quoi vivre — les ouvre.

**Une vue plus profonde n'est pas toujours une feuille de plus.** Le parcours
imbriqué comparait le nombre de feuilles empilées avant et après l'appui.
L'établissement scolaire empile, donc cela marchait ; les collections
*remplacent* la feuille — `if (shown) return <Sheet …>` — si bien que le
compte ne bougeait pas et que la marche relevait **zéro** vue de détail sans
rien signaler. Un parcours qui ne trouve rien et n'en dit rien est le défaut
qu'il est censé attraper. Le titre de la feuille du dessus sert désormais
d'identité, et la marche se plaint quand elle ouvre des lignes sans rien
relever.

### Et avant cela

La quatrième fois est la plus gênante des quatre, parce que le défaut était
dans l'instrument et visait exactement ce qu'il devait protéger. Le relevé ne
cherchait que `button`, `[role=button]` et `a[href]`. Or un écran qui refuse
une ligne écrit couramment `onClick={raison ? undefined : …}` : la ligne perd
son geste, donc sa balise de bouton, donc sa place dans l'inventaire. **Le
garde-fou censé surveiller les refus était aveugle à la moitié d'entre eux.**
Les trois lignes « aller voir ailleurs » de la boutique et les deux du
grenier n'ont jamais figuré dans un témoin. Viser `[data-row]` les rattrape sans rien
supposer de leur balise, et le total passe de 667 à 1 263.

Tout ce qui est relevé n'est pas un geste — le bilan financier est fait de
lignes qui n'affichent qu'un montant — d'où les deux nombres : ce qui est
surveillé, et ce sur quoi on peut appuyer.

La troisième fois, c'était l'onglet Avoirs. Il porte **onze** lignes ; la
marche en ouvrait six. Concession, garage, collections, boutique et
possessions n'étaient dans aucun témoin — et quatre des refus de cet écran
vivent précisément là. Le plafond posé pour borner la durée de la marche
bornait aussi ce qu'elle voyait. Il reste bas pour « Gens », mais pour une
raison différente : cette liste est homogène, la douzième personne montre la
fiche déjà vue onze fois.

La deuxième fois, c'était l'agenda. Il n'est pas fait de lignes mais d'une
grille de **quatorze tuiles** — médecin, chirurgie, sport, bien-être,
voyages, sorties, jeux d'argent, réseaux, renommée, animaux, démarches,
testament, justice, activités illégales — et la marche ne cliquait que
`button[data-row]`. Quatorze panneaux, pas un seul dans le témoin.

La première fois, c'était l'école : **l'écran le plus long du jeu n'était pas
dans le parcours.** `SchoolScreen.tsx` fait 1 305 lignes et ne s'ouvre que
pour un personnage scolarisé ; la partie adulte qui servait à tout le reste
n'y arrivait jamais. Une seconde passe, sur une seconde sauvegarde, couvre
désormais l'établissement, le bulletin, les bousculades et le transfert.

Au passage, la sauvegarde évidente — celle de l'examen — ne convenait pas :
elle tombe pile sur l'année où la session s'ouvre, c'est-à-dire celle où le
cycle se termine et où l'on cesse d'être scolarisé. La ligne « entrer dans
l'établissement » est conditionnée à `inSchool` : ce personnage-là ne la voit
jamais. C'est le revers exact du défaut corrigé pendant la passe mobile, où
la salle d'examen disparaissait avec le statut d'élève.

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
| `screens/SchoolScreen.tsx` | idem | l'établissement, le bulletin, les bousculades, le transfert | **migré** — 0 perdue, et 8 descriptions rendues |
| `components/ActivityMenu.tsx` | idem | l'agenda et ses **quatorze** panneaux de tuiles | **migré** — 0 perdue, et 7 refus muets qui parlent |
| `screens/AssetsScreen.tsx` | idem | banque, emprunts, immobilier, véhicules, collections, boutique, objets | **migré** — 0 perdue, et 5 lignes refusées qui redeviennent annonçables |
| `screens/CollectionScreen.tsx` | idem | objets de famille, grenier, transmission, ce que la partie sait déjà | **migré** — 0 perdue, +1 ligne qui n'existait plus du tout |
| `screens/VentureScreen.tsx` | idem | métier à son compte, entreprise, et les deux catalogues | **migré** — 0 perdue, et **57** lignes refusées qui redeviennent des boutons |
| `screens/StageScreen.tsx` | idem | disciplines, engagements, troupe, agent, essais, distinctions | **migré** — 0 perdue, et une action légale qui disparaissait |
| `screens/PortfolioScreen.tsx` | idem | ce qu'on détient, la ligne bloquée, le marché, l'achat, la vente | **migré** — 0 perdue, 34 refus redevenus des boutons, et un chevron qui mentait |
| `screens/LanguageScreen.tsx` | idem | quatorze langues, l'immersion, le coût d'être étranger | **migré** — 0 perdue, et 32 refus parfaitement muets |
| `screens/SkillScreen.tsx` | idem | ce qu'on sait faire, les dons, ce que ça ouvre | **migré** — 0 perdue, et 20 refus parfaitement muets |
| `screens/ServiceScreen.tsx` | idem | les trois maisons, la formation, les missions, la sortie | **migré** — 0 perdue, et les six derniers refus muets du jeu |
| `screens/CreationScreen.tsx` | idem | le point de départ, les dons, la famille, le foyer — 308 entrées | **migré** — 0 perdue, et un refus qu'aucune mesure ne pouvait voir |

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
- **Huit lignes de l'école perdaient leur description pour dire non.** Le
  motif `sub={blocage ?? description}` revient partout : répondre à une
  bousculade, choisir une option, entrer dans la salle d'examen, viser une
  sélection sportive, se présenter comme capitaine. Le refus **remplaçait**
  ce que la ligne proposait — on ne pouvait jamais lire les deux. La
  description est rendue, la raison a sa place.
- **Sept lignes de l'agenda s'éteignaient sur une limite d'âge muette.**
  Le sport, le bien-être, les sorties, la table de jeu, changer de nom,
  émigrer, le permis : toutes grises avant l'âge, aucune ne disant lequel.
  Le joueur voyait une porte fermée sans savoir s'il fallait attendre un an
  ou dix. Elles annoncent maintenant leur seuil — « pas avant seize ans »,
  « pas avant dix-huit ans » — et le sport distingue enfin ses deux refus,
  l'âge et l'absence d'équipement près de chez soi, qui ne pouvaient pas se
  dire ensemble.
- **Et six autres cachaient leur raison dans une alternance.** « Bourse déjà
  obtenue », « diplôme universitaire requis », « filière requise » : le
  sous-titre basculait entre l'explication et l'argument de vente, si bien
  qu'on ne pouvait jamais lire les deux. La raison a désormais sa place, et
  le sous-titre garde la sienne.
- **Les trois lignes « aller voir ailleurs » n'étaient même plus des
  boutons.** Chiner — la brocante, une vente après décès, un lot fermé —
  s'écrivait `onClick={raison ? undefined : …}`. Privée de son geste, la
  ligne devenait un simple bloc : hors de l'ordre de tabulation, hors de
  l'arbre d'accessibilité, et hors de tout inventaire. Une voix de synthèse
  ne les annonçait pas du tout, alors qu'elles portent le seul texte qui dise
  quand on pourra y aller. Elles redeviennent des boutons refusés, ce qui
  s'annonce — cinq refus rendus lisibles sur les deux parcours mesurés.

  L'inventaire ayant cessé d'être aveugle, il a immédiatement désigné le
  même motif dans `CollectionScreen.tsx` — « monter au grenier », compté
  comme non actionnable. C'est ce qui a décidé de l'écran suivant : celui
  dont le défaut venait d'être prouvé, plutôt que le suivant par la
  taille.
- **Et quatre autres tenaient le refus à la place du chiffre.** « Aucun
  emprunt », « aucun bien », « aucun véhicule », « aucun objet » : le
  sous-titre basculait entre le décompte et la négation. La négation ne
  disait pas quoi faire ; elle indique maintenant la ligne d'à côté qui
  ouvre la porte — le marché immobilier au-dessus du garage vide, la
  boutique au-dessus des possessions vides.
- **Une ligne du grenier n'était pas refusée : elle n'existait plus.**
  « Envoyer quelqu'un chercher » s'écrivait `{!searchBlocker(state) && …}`.
  Tant que le grenier était fermé, la ligne disparaissait entièrement — le
  joueur ne pouvait ni apprendre que cette option existe, ni deviner ce qui
  la rouvrirait. C'est pire qu'un refus muet : un refus se lit, une absence
  ne se lit pas. Elle est maintenant toujours là, fermée par la même raison
  que « monter au grenier », qui est bien la seule chose qui la retenait.

  À noter, parce que la mesure l'a montré et que ce n'est pas corrigé ici :
  `autoSearch` ne vérifie rien de son côté. La porte n'existait que dans
  l'interface. La ligne fermée refuse l'appui, donc le comportement est
  identique — mais le garde-fou reste au mauvais étage, et cela vaut pour le
  système, pas pour la refonte.
- **Et les deux lignes de transmission cachaient leur raison.** « Le faire
  reprendre » et « le donner » basculaient entre l'explication et ce que
  l'action propose ; on ne pouvait jamais lire les deux. Ces deux-là
  n'étaient sous aucun témoin jusqu'à cette étape : le détail d'un objet de
  famille vit un cran plus bas que tout ce que la marche atteignait.
- **Cinquante-sept lignes de « travailler pour soi » n'étaient pas des
  boutons.** Les deux catalogues — vingt métiers, dix-huit entreprises —
  posaient `onClick={blocker ? undefined : …}` et écrivaient
  `sub={blocker ?? pitch}`. Chaque ligne refusée cumulait donc les deux
  défauts : elle sortait de l'arbre d'accessibilité *et* remplaçait par son
  refus la description de ce qu'elle propose. Or ce sont les refus les plus
  utiles du jeu — « il faut avoir 21 ans », « le niveau d'études ne suit
  pas », « ni l'épargne, ni de quoi emprunter la différence » : ils disent
  quoi faire pour y arriver. Les cinquante-sept ont gardé leur raison, et
  retrouvé la description qu'elle recouvrait.
- **La raison d'un refus de commande était écrite ailleurs que sur la
  ligne.** Les prestations à prendre devenaient toutes grises et muettes,
  pendant qu'un paragraphe sous la carte donnait l'explication une fois pour
  toutes. Qui écoute la page ligne à ligne n'entendait que le refus. La
  raison est passée sur les lignes, et le paragraphe ne subsiste que
  lorsqu'il n'y a aucune commande — pour que l'explication atteigne le
  joueur exactement une fois.
- **Refuser un engagement disparaissait quand on ne pouvait pas
  l'accepter.** Les lignes « refuser — ce rôle » étaient rendues sous
  `{stage.offers.length > 0 && !blocker && …}`. Or `offerBlocker` parle de
  l'**acceptation** — déjà engagé, blessé, quota de l'année épuisé — et
  `declineOffer` ne vérifie rien du tout : il retire la proposition de la
  liste, point. Refuser était donc toujours légal, et retiré de l'écran
  précisément aux moments où l'on voudrait faire le ménage dans ce qu'on ne
  peut pas tenir. Les lignes reviennent dès qu'il y a des propositions.

  À dire franchement : ce point-là est **raisonné, pas mesuré**. Aucune des
  huit parties du parcours n'est à la fois sur scène et empêchée d'accepter,
  donc le témoin ne pouvait ni montrer le défaut ni prouver la correction.
  C'est la lecture de `declineOffer` qui l'établit, pas une mesure.
- **Huit lignes de la scène cachaient leur raison dans une alternance**, et
  la raison d'un refus de proposition était écrite sous la carte pendant que
  chaque ligne refusée se taisait — le même motif que l'entreprise, corrigé
  de la même façon.
- **Un refus qu'aucune mesure ne pouvait voir.** « Retirer le dernier », dans
  la fratrie de la création, est grise et muette quand il n'y a personne à
  retirer. Le compte des refus muets ne l'avait pas signalée, et c'était
  exact : la marche n'atteint que les états qu'elle rencontre, et le
  brouillon de départ a des frères et sœurs. Un garde-fou d'exécution dit ce
  qu'il a vu, pas ce qui existe — celui-là s'est trouvé par la lecture, et
  c'est la limite qu'il faut connaître de lui.
- **Cinquante-deux refus ne disaient rien du tout.** Les quatorze langues et
  les compétences avaient la forme la plus pauvre : `studyBlocker` et
  `practiceBlocker` ne servaient qu'à griser la ligne et à changer une
  pastille — leur phrase n'était affichée **nulle part**. Ce n'est même pas
  une alternance, où l'on perd la description au profit de la raison ; ici
  l'écran connaissait la réponse et la gardait pour lui. « Deux séances par
  an » est une règle du jeu, pas un mur — encore faut-il la dire.
- **Un chevron promettait un appui impossible.** Une ligne de placement
  bloquée jusqu'à une année donnée portait quand même sa flèche : la forme
  disait « ouvre-moi », le comportement ne faisait rien. C'est le même
  décalage que le défunt ci-dessous, dans l'autre sens.
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
| `screens/CreationScreen.tsx` | 886 | 11 — création |
| `screens/CampaignScreen.tsx` | 510 | 10 — carrières spéciales |
| `screens/ServiceScreen.tsx` | 503 | 10 — carrières spéciales |
| … 23 autres fichiers | | |

Mesuré : **21 fichiers** importent encore `Row`, `Card` ou `Section`
depuis `components/Modal.tsx`.

### La mesure a désigné la suite, et la suite était derrière moi

L'inventaire, une fois capable de compter ce qui est *actionnable*, a
signalé **243 lignes fermées qui n'étaient pas des boutons** — le plus gros
amas étant le tableau des offres d'emploi. Or ces écrans-là étaient
**déjà migrés**. Le motif corrigé partout était `disabled=` ; celui-ci est
`onClick={raison ? undefined : …}`, et il produit le même résultat par un
autre chemin. Il a traversé quatre passes sans être vu, parce que
l'instrument qui le révèle — la distinction entre relevé et actionnable —
n'existait pas encore quand ces écrans sont passés.

`closed` suffit à lui seul : `Row` ignore déjà le clic d'une ligne fermée.
Retirer le gestionnaire par-dessus ne protège de rien et coûte l'annonce.
Dix-huit lignes corrigées dans quatre écrans, **+151 lignes redevenues des
boutons** — les onze premières trouvées à la main, les deux dernières par la
règle ci-dessous, dès sa première exécution.

Le compte est à **zéro**, et il ne s'agit plus d'un chiffre dans un
rapport : `audit:parite` **échoue** désormais si une ligne fermée cesse
d'être annoncée. Une mesure arrivée à zéro ne vaut que si elle y reste. La
barrière a été vérifiée en réintroduisant volontairement le défaut sur les
langues — 32 refus muets, sortie 1 — puis en le retirant.

Il a fallu d'abord corriger la mesure elle-même. « Actionnable » ne suffit
pas à dire qu'une ligne est annoncée : un `button disabled` **est** un
bouton, et n'est lu par aucune voix de synthèse. Les deux façons de faire
taire une ligne sont donc comptées ensemble, et le compte est restreint aux
lignes — un bouton de formulaire désactivé tant que la saisie est invalide
(« Emprunter 0 kr ») est l'usage normal de l'attribut, et son libellé dit
déjà l'état. Sans cette correction, ce paragraphe aurait annoncé zéro alors
qu'il en restait cinq. Celles-là ne se corrigent pas isolément — l'ancienne `Row` pose
l'attribut `disabled` du navigateur, qui retire la ligne de l'arbre
d'accessibilité tout autant. Elles tomberont avec la migration de leur
écran, et le compte dit exactement combien il en reste.

**La règle qui empêche le retour.** `audit.test.ts` refuse désormais qu'un
même `<Row>` déclare `closed` et retire son `onClick`. Elle ne vise que les
lignes qui se disent fermées : une ligne sans `closed` et sans geste est un
relevé — la note d'un examen déjà passé, une ligne de bilan — et c'est
légitime. Elle a fait son travail immédiatement, en attrapant deux lignes
écrites sur plusieurs lignes que la recherche textuelle avait manquées.

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
