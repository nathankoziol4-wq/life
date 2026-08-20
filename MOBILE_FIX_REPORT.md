# Passe mobile — ce qui a été mesuré, et ce qui a été corrigé

## D'abord une mise en garde honnête

Cette passe a produit deux choses en même temps : **des corrections** et **un
instrument de mesure**. Les deux font baisser les chiffres, et il serait
malhonnête de les confondre.

- Certaines baisses viennent d'un vrai défaut réparé — un bouton de 32 points
  passé à 44, une barre qui recouvrait le contenu.
- D'autres viennent d'une mesure devenue juste — la première version comptait
  comme « masqué » une ligne simplement coupée par le bas de sa propre liste,
  et comme « trop petit » un bouton parfaitement touchable recouvert au moment
  du test par un voile de modale.

Chaque affinage de la mesure est expliqué à sa ligne. Le tableau final vaut ce
que vaut l'instrument, et l'instrument est dans `tools/audit-mobile.mjs` :
il ouvre le jeu dans un vrai navigateur, à cinq largeurs, et lit ce que le
moteur de rendu calcule.

---

## Le compte

| Mesure | Avant | Après |
| --- | --- | --- |
| Débordement horizontal | 0 | 0 |
| Cibles sous 44 points | 74 | **0** |
| Cibles trop serrées | 156 | **0** |
| Texte coupé par une ellipse | *(non mesuré)* | **0** |
| Texte sous 12 points | 595 | **0** |
| Contenu masqué par la barre | 24 | **0** |
| Pages qui défilent latéralement | 0 / 40 | 0 / 40 |

Testé sur 5 largeurs × 8 écrans : 360×800, 375×812, 390×844, 393×852,
430×932 — journal, études, gens, avoirs, agenda, fiche d'un proche, profil,
santé.

**Correction, faite après coup et qui rabote ce tableau :** deux de ces huit
écrans n'étaient pas visités. La barre de navigation a été renommée pendant la
refonte — « Parcours » est devenu « Études », « Proches » est devenu « Gens » —
et la fonction qui clique un onglet se taisait quand elle ne le trouvait pas.
L'audit remesurait donc le journal en croyant visiter deux autres écrans. Les
noms sont corrigés et le silence est levé ; le tableau ci-dessus est celui
d'après.

---

## CRITICAL — corrigé

**Le bouton de retour mesurait 32 points.** C'est la commande la plus utilisée
du jeu, et elle était sous le seuil du doigt sur les cinq largeurs. Portée à
44.

**Trois onglets se partageaient la largeur de deux.** Les deux côtés de la
barre recevaient une part égale alors que l'un porte deux destinations et
l'autre trois : mesuré, 43 points de large sur un écran de 360. La part suit
désormais le nombre d'onglets.

**Le bouton « +1 an » mordait sur le contenu.** Il débordait de dix-huit
points au-dessus de la barre, donc par-dessus la zone défilante : il
recouvrait la dernière ligne de chaque liste et passait à moins de huit points
de l'onglet voisin. Un geste qui consomme une année ne doit pas se déclencher
par accident. La barre s'est agrandie d'autant ; le bouton flotte sans plus
rien recouvrir.

**La barre du bas recouvrait le contenu.** Elle était sortie du flux, ce qui
oblige chaque écran à deviner sa hauteur — et à la deviner faux dès qu'une
marge sûre s'ajoute. Elle est revenue dans le flux : elle ne peut plus rien
masquer, par construction.

## HIGH — corrigé

**Les marges sûres manquaient sur les feuilles.** L'en-tête d'une feuille —
donc son bouton de retour — passait sous l'encoche ; sa dernière ligne tombait
sur la barre de geste. `env(safe-area-inset-*)` est appliqué aux deux bouts.

**Les intitulés d'onglets étaient coupés.** « Parco… », « Proch… » sur un
écran de 360. Cinq destinations, un bouton central et une taille lisible se
disputent la même largeur : les mots courts sont un choix, pas un raccourci.
Vie · Études · Gens · Avoirs · Agenda.

Ce défaut-là mérite d'être noté à part : **l'audit ne le voyait pas**. Il
mesurait la taille de police et rapportait zéro pendant qu'une capture d'écran
montrait le mot tronqué. Une mesure qui ne voit pas ce qu'un coup d'œil voit
ne mesure pas la bonne chose — la détection d'ellipse a été ajoutée.

## MEDIUM — corrigé

**Six familles de texte sous le seuil de lisibilité** : intitulés de section
(11,5 pt), pastilles (11 pt), étiquettes de tuiles (11 pt), texte secondaire
(12,5 pt vers le jeton), intitulés d'onglets, étiquette du bouton d'année
(9,5 pt). Toutes ramenées aux jetons.

**Les petites commandes de texte** — « Afficher (13) », « Tout voir » — et les
**pastilles cliquables** faisaient vingt à trente points de haut. Elles gardent
leur taille visuelle et reçoivent la zone qui manque autour d'elles, comme le
permet la règle : l'icône peut être petite, la zone ne peut pas.

**Les parts d'un contrôle segmenté** faisaient 33 points de haut. Portées à 44.

---

## Ce que la mesure a appris à faire

| Affinage | Pourquoi |
| --- | --- |
| Portée réelle plutôt que boîte | Une cible de 20 points bien rembourrée est touchable ; la boîte seule ne le dit pas. `elementFromPoint` tranche. |
| La sonde ne juge que les petites boîtes | Sinon un voile de modale ouvert pendant le test faisait échouer la portée de tout l'écran, bouton pleine largeur compris. |
| Intersection de **tous** les cadres qui découpent | S'arrêter au plus proche donnait une ligne débordant sur la barre alors que la carte, puis la liste, la coupaient déjà. |
| La barre et le segmenté exemptés du voisinage | Leurs éléments sont voisins par construction et aucun n'est destructeur. La règle vise deux commandes distinctes du même plan. |
| Détection des ellipses | Ajoutée après qu'une capture eut montré ce que les chiffres ne disaient pas. |
| Un vrai doigt, pas la souris | Le commentaire promettait `page.touchscreen`, le code appelait `page.mouse` : un glissé à la souris ne fait jamais défiler une page, donc la colonne « pas de défilement parasite » ne pouvait pas échouer. Le geste passe par `Input.dispatchTouchEvent`. |
| Ce qu'il y a **sous** le doigt | Une surface bien dimensionnée et réactive n'est pas jouable si une modale la recouvre. `elementFromPoint` a montré une course qui se jouait toute seule. |

---

## Ce qui reste

- **Les mini-jeux** : les onze sont mesurés au doigt en situation réelle
  (`MOBILE_MINIGAME_AUDIT.md`). Le dernier — la course après une évasion — a
  demandé d'écrire un pilote qui gagne vraiment la traversée, et l'avoir
  atteint a livré le plus gros défaut de la passe : **la course démarrait
  derrière la modale qui l'annonce**, et se perdait en une seconde pendant
  qu'on lisait.
- **Le clavier virtuel** est mesuré (`MOBILE_KEYBOARD_FIX.md`). La phrase qui
  tenait lieu d'explication ici — « aucun champ de saisie n'apparaît dans les
  huit écrans parcourus » — était vraie du parcours et fausse du jeu : il y en
  a sept, dont le tout premier qu'un joueur touche. Les sept faisaient zoomer
  iOS sans retour possible, aucun ne demandait le bon clavier, et la touche de
  validation ne faisait rien. Zéro sur les six mesures désormais.
- **Les écrans conditionnels** — prison, entreprise, carrières spéciales,
  crime — ne sont pas dans le parcours : ils demandent des sauvegardes
  fabriquées, comme le fait déjà le test de fumée.
- **L'orientation paysage** est mesurée et corrigée
  (`MOBILE_LANDSCAPE_AUDIT.md`). La phrase qui tenait lieu d'explication —
  « le jeu est conçu en portrait, rien ne la force » — reposait sur la ligne
  `"orientation": "portrait"` du manifeste, qui ne vaut que pour une
  application installée sur Android : dans un onglet, et sur iOS, le téléphone
  tourne quand même. Couché, l'habillage prenait **214 points sur 360** et
  laissait 146 points au jeu ; il en prend 164 et en laisse 196.
- **La performance** est mesurée (`MOBILE_PERFORMANCE_AUDIT.md`). Le jeu
  répond bien — 82 ms pour une année, soixante images par seconde dans le
  mini-jeu le plus dessiné, et **aucune tâche de plus de 50 ms en cours de
  partie**. Ce qui allait mal n'était pas la vitesse mais le silence : sur une
  4G lente, l'écran restait vide pendant 2 862 ms, le premier pixel arrivant
  en même temps que le jeu. Une coquille d'amorçage le ramène à 440 ms.

Aucune fonctionnalité n'a été retirée : le test de fumée parcourt les mêmes
écrans qu'avant et rapporte les mêmes vérifications au vert. 1130 tests.
