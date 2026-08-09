# Odyssia

Un simulateur de vie jouable au menu : tu nais quelque part, tu grandis, tu
étudies, tu travailles, tu aimes, tu vieillis, tu meurs. Chaque partie est
différente, chaque décision laisse une trace, et la fin arrive toujours.

Interface mobile verticale, moteur de simulation annuel, aucune dépendance
externe au moment de l'exécution.

```bash
npm install
npm run dev      # http://localhost:5173
```

## Jouer sur téléphone

Le jeu est conçu pour un écran vertical. Il tient dans le navigateur : aucun
serveur, aucune connexion, tout tourne sur l'appareil.

### Un fichier, rien d'autre

```bash
npm run build:single      # → dist-single/odyssia.html (~880 ko)
```

Ce fichier contient tout : code, styles, icônes. Copie-le sur le téléphone
(courriel, cloud, câble, AirDrop) et ouvre-le. Ça marche hors connexion, sans
hébergeur et sans compte nulle part.

### En ligne

Le dépôt contient un workflow GitHub Pages (`.github/workflows/deploy.yml`) :
typage, tests, puis mise en ligne à chaque push. Il faut l'activer une fois
dans *Settings → Pages → Source → GitHub Actions*.

**GitHub Pages n'est gratuit que sur un dépôt public.** Sur un dépôt privé, il
faut GitHub Pro. Si le dépôt doit rester privé, ces hébergeurs acceptent les
dépôts privés sur leur offre gratuite, avec le même déploiement automatique :

| Hébergeur | Réglages |
| --- | --- |
| Cloudflare Pages | commande `npm run build`, dossier `dist` |
| Netlify | commande `npm run build`, dossier `dist` |
| Vercel | détecte Vite tout seul |

Aucun n'a besoin de `BASE_PATH` : ils servent le site à la racine du domaine.

### Installer comme une application

Une fois le jeu ouvert sur mobile, « Ajouter à l'écran d'accueil » (Safari) ou
« Installer l'application » (Chrome) l'installe en plein écran, sans barre de
navigateur, avec son icône et en orientation portrait.

### Sur le même Wi-Fi

`npm run dev` affiche une adresse *Network* du type `http://192.168.x.x:5173` :
ouvre-la depuis le navigateur du téléphone, l'ordinateur servant de serveur.

### Emporter sa partie

*Profil → Transférer la partie* exporte la vie en cours dans un fichier, et la
réimporte ailleurs. Utile pour changer d'appareil, garder une copie, ou si le
navigateur efface ses données — ce que Safari fait parfois sur les pages
ouvertes depuis un fichier local.

## Naître quelque part

Avant la première année, il y a un choix : *où* et *dans quelle famille*.
C'est la partie la plus profonde du jeu, et ce n'est pas un éditeur
d'apparence — l'apparence tient en une carte, l'environnement en occupe une
douzaine.

*Accueil → Choisir son point de départ* ouvre treize contextes de naissance
(campagne modeste, logement social, classe moyenne pavillonnaire, grande
fortune, parent seul, famille nombreuse, arrivée récente…). Le mode
**Détaillé** permet ensuite de reprendre la main sur chaque couche — pays,
région, ville, quartier, sous-zone, logement, mode d'occupation, structure
familiale, fratrie, les douze axes de tempérament, ce que la famille valorise
et le climat du foyer — et un 🎲 par catégorie retire le reste au hasard, de
façon cohérente avec ce qui est déjà fixé.

L'aperçu est calculé par le vrai générateur : ce qui s'affiche pendant la
création est exactement ce que la partie utilisera — y compris la section
« ce que ce départ met à sa portée », qui liste les intérêts auxquels
l'environnement expose réellement l'enfant.

Les conséquences sont dites en mots, jamais en pourcentages : un joueur ne
gagne rien à lire « +7 % de réussite scolaire », il gagne à lire ce qu'un
réglage donne *et* ce qu'il coûte.

### La règle : aucun réglage décoratif

Chaque paramètre d'environnement doit avoir une conséquence mesurable dans la
simulation. Ce n'est pas une intention, c'est un test : `validateEnvironmentImpact()`
perturbe chaque champ un par un et vérifie que quelque chose bouge dans les
sept contextes du moteur, dans les axes d'opportunité et dans le bilan du
foyer. Un champ sans effet fait échouer la suite de tests. Le même mécanisme
protège la personnalité (`validatePsycheImpact()`).

Les conséquences passent toutes par `systems/contexts.ts`, qui traduit
l'environnement en chiffres exploitables — et garde la trace de chaque
contribution, ce qui permet d'expliquer une probabilité plutôt que de
l'asséner :

```
Base 0,00 pt · niveau de l’établissement +0,68 pt · effectif par classe +0,15 pt
· aucun endroit calme −0,45 pt · attentes parentales +0,31 pt
· tension financière −0,42 pt
```

### Des probabilités, pas un destin

L'environnement ouvre six axes d'opportunité (éducation, carrière, moyens,
social, culture, sport) et cinq axes de difficulté (argent, instabilité
familiale, scolarité, isolement, éloignement). Il n'existe aucun score global
« qualité de l'environnement » : un même départ est excellent sur un axe et
mauvais sur un autre, et **aucun préréglage n'est meilleur qu'un autre**.

Deux tests encadrent cet équilibre :

* sur des vies jouées par le même pilote automatique, avec la même graine,
  un départ aisé produit de meilleures études et un patrimoine plus élevé
  qu'un départ en logement social — sinon l'environnement ne servirait à rien ;
* les deux distributions **se recouvrent** : des vies parties du bas dépassent
  la médiane des vies parties du haut, et l'inverse arrive aussi. Si ce
  recouvrement disparaissait, l'origine serait devenue un destin.

### Un environnement vivant

Le décor n'est pas figé à la naissance. Chaque année, le quartier dérive
(embourgeoisement, dégradation), l'économie locale respire, les parents sont
promus, licenciés ou partent à la retraite, le couple parental tient ou se
défait — rien de tout cela n'est programmé à la création, tout découle des
valeurs courantes et des tirages de l'année. La famille déménage quand elle
peut s'offrir mieux, ou quand elle ne peut plus payer ; l'école change avec le
quartier ; les souvenirs marquants et l'historique des lieux se consultent
depuis le profil.

## Une personnalité en couches

Le caractère n'est pas une poignée de curseurs : c'est un empilement de six
couches, de la plus stable à la plus mouvante.

| Couche | Ce que c'est | Bouge ? |
| --- | --- | --- |
| **Tempérament** | 12 tendances innées (énergie, sensibilité, sociabilité, calme, adaptabilité, curiosité, persévérance, besoin de nouveauté, prudence, réactivité émotionnelle, besoin d'attention, tolérance à la frustration) | jamais |
| **Axes de personnalité** | 27 axes continus, jamais des étiquettes | lentement, de moins en moins avec l'âge |
| **Valeurs** | 17 choses auxquelles on tient — donc ce qui rend heureux ou non | rarement, et par grands basculements |
| **Styles** | manière de parler, de décider, d'encaisser | avec l'expérience |
| **Rapport à soi** | estime de soi, sentiment de maîtrise, image du corps, authenticité | au fil des réussites et des échecs |
| **Peurs, intérêts, habitudes, ambitions, souvenirs** | ce qu'on fuit et ce qu'on poursuit | en permanence |

Trois principes tiennent l'ensemble.

**Aucun trait n'est un bonus.** Chaque axe a un versant utile *et* un versant
coûteux, et les deux sont implémentés : une forte ambition fait travailler
davantage et rend la satisfaction plus difficile ; une forte prudence évite
les catastrophes et laisse passer les occasions ; une forte loyauté fait tenir
les relations et fait s'accrocher à celles qui détruisent. La fiche de
caractère affiche les deux versants côte à côte, jamais l'un sans l'autre.

**L'estime de soi n'est pas l'assurance.** Quelqu'un peut paraître sûr de lui
et se détester ; la façade tient, et elle coûte.

**Les valeurs créent de vrais dilemmes.** Une vie ne peut pas servir la
famille et la carrière au même moment, ni la liberté et la stabilité. L'écart
entre ce à quoi le personnage tient et ce que sa vie lui donne réellement est
calculé chaque année : c'est lui qui rend quelqu'un insatisfait sans qu'il
sache pourquoi.

### Les goûts viennent de l'exposition, jamais d'une décision

Le moteur n'écrit jamais « ce personnage devient informaticien ». Il calcule
chaque année à quoi le personnage est *exposé* — un ordinateur à la maison, un
grand frère passionné, un club au lycée, une bibliothèque à deux rues, une
famille qui parle d'argent à table — et laisse les goûts se former si
l'exposition dure. Un goût devient une pratique, une pratique devient une
compétence, une compétence rend certaines études et certains métiers plus
probables. À aucun moment le résultat n'est écrit d'avance : c'est une chaîne
de probabilités, et elle se rompt souvent.

Les 26 intérêts déclarent eux-mêmes les signaux qui les nourrissent ; personne
ne code « si ordinateur alors informatique ».

### Pourquoi il est devenu celui-là

Chaque fois qu'un système produit un effet durable — un goût qui naît, une
peur qui s'installe, une ambition qui apparaît, un déménagement qui bouleverse
tout — il en dépose la trace dans un registre de causalité. *Profil →
Trajectoire* le rend consultable :

```
Peur de manquer : d’où vient-elle ?
  4 ans   L’année où Kaori a perdu son travail.       influence faible

Informatique : d’où lui vient ce goût ?
  11 ans  y a été exposé par un ordinateur à la maison  influence moyenne
  Et aujourd’hui encore, voici ce qui l’y expose :
  • un ordinateur à la maison        influence forte
  • une connexion internet           influence moyenne
  • le club scientifique de l’école  influence faible
```

Le même audit que pour l'environnement s'applique au caractère :
`validatePsycheImpact()` perturbe chaque trait, chaque valeur, chaque style, et
échoue si rien ne bouge dans ce que le moteur consomme. Les PNJ ont la même
personnalité complète — sans quoi les interactions sonneraient faux.

## Parité de gameplay

Le jeu se mesure à ce qu'un joueur attend d'un simulateur de vie complet, non
pour en copier les textes ou les visuels, mais pour atteindre la même
profondeur. `src/data/parity.ts` recense 74 capacités attendues, ce que le jeu
en fait, et ce qui manque ; `npm run parity` en régénère
[l'analyse](BITLIFE_GAMEPLAY_GAP_ANALYSIS.md).

La matrice ne peut pas mentir : chaque ligne qui se déclare présente doit
citer un symbole exporté du projet, et le test échoue s'il n'existe pas. Une
ligne ne peut pas non plus se dire complète tout en listant ses manques.

Parité actuelle : **56 %**. L'école, les relations, l'argent, les propriétés,
la justice et l'héritage sont les domaines les plus aboutis ; les mini-jeux,
les carrières spéciales et le crime sont les plus faibles.

## L'école, vue de l'intérieur

Un personnage passe treize ans à l'école : appuyer sur « +1 an » ne peut pas
être sa seule option. *Parcours → Entrer dans l'établissement* ouvre le
quotidien — l'établissement et son règlement, le dossier de comportement, la
place tenue dans la classe, les camarades, le personnel, les clubs, les
groupes.

Chaque élève et chaque professeur est un PNJ complet, avec sa personnalité,
ses passions et sa relation. Un professeur a en plus une compétence, une
sévérité, une popularité et une intégrité : un professeur intègre juge sur le
travail, un autre a des têtes — savoir lequel est lequel change ce qu'il faut
tenter.

**Aucune action n'a un résultat unique.** Manquer de respect à quelqu'un ne
retire pas dix points de relation : la personne visée ignore, répond, rend
coup pour coup, s'emporte, va le rapporter ou en vient aux mains, selon son
caractère. La classe en fait ce qu'elle veut — s'en prendre à un professeur
détesté fait monter d'un cran, s'en prendre à un camarade apprécié isole.
L'établissement sanctionne ensuite selon son règlement *et selon le dossier* :
le troisième incident de l'année n'est jamais traité comme le premier. Les
parents l'apprennent parfois, et leur réaction dépend d'eux — un parent
autoritaire punit, un parent qui dialogue en fait une discussion.

Ce que le joueur peut faire face à quelqu'un est décidé à un seul endroit,
`getAvailableActions(état, cible, contexte)`. Une action indisponible n'est pas
seulement retirée : elle porte la raison pour laquelle elle l'est, si bien que
le menu explique ce qu'il faudrait pour y accéder. Certaines lignes ne sont
jamais proposées, même grisées — rien de romantique envers un professeur ou,
quand on est mineur, envers un adulte.

## Le jeu en une minute

Le journal de vie occupe l'écran. En bas, quatre menus et un gros bouton
central **+1 an** qui déclenche le moteur : le personnage vieillit, les PNJ
vivent leur vie, les finances se soldent, les maladies évoluent, et une à
trois situations demandent une réponse.

| Menu | Contenu |
| --- | --- |
| **Parcours** | Scolarité, école détaillée, université, formations, offres d'emploi, carrière, retraite |
| **Avoirs** | Compte, budget annuel détaillé, emprunts, immobilier, véhicules, objets de valeur |
| **Proches** | Famille, couple, amis, collègues — et toutes les interactions sociales |
| **Agenda** | Santé, chirurgie, sport, bien-être, voyages, sorties, jeux, réseaux, animaux, démarches, testament, justice, prison, zone grise |

## Architecture

Le moteur ne connaît pas React. `simulateYear(state)` prend une sauvegarde,
la fait avancer d'un an et rend la main. L'interface n'est qu'un afficheur.

```
src/
  engine/          Moteur pur, testable sans navigateur
    types.ts         Modèle de données complet et sérialisable
    origin.ts        Modèle de l'environnement — types seuls, aucune logique
    psyche.ts        Modèle de la personnalité — types seuls, aucune logique
    rng.ts           Générateur déterministe (l'état vit dans la sauvegarde)
    probability.ts   TOUTES les probabilités du jeu, centralisées (§25)
    context.ts       Contexte passé aux systèmes (état + tirages + journal)
    newLife.ts       Génération de la naissance
    simulateYear.ts  Les 13 étapes d'une année, dans l'ordre
    save.ts          Persistance intégrale + historique des vies

  systems/         Un fichier par domaine, sans logique d'affichage
    aging  education  careers  finance  health  relationships
    crime  justice   prison   properties  vehicles  inheritance
    markets  randomEvents  activities  npc
    originGen        Construction de l'environnement de naissance
    originDetail     Rue, voisins, distances, emplois du temps, capitaux
    household        Parents, fratrie, famille élargie
    contexts         Traduction du milieu et du caractère en effets chiffrés
    environment      Évolution annuelle du décor et déménagements
    environmentAudit Vérification qu'aucun réglage n'est décoratif
    psycheGen        Construction du caractère à la naissance
    psyche           Vie annuelle de la personnalité, compatibilités
    psycheAudit      Vérification qu'aucun trait n'est décoratif
    exposure         À quoi la vie expose réellement le personnage
    causality        Registre des causes : pourquoi il est devenu celui-là
    school           Classe, personnel, amitiés naturelles, groupes, popularité
    schoolActions    Ce qu'un élève fait de ses journées, et ce que ça coûte
    actions          getAvailableActions : qui peut faire quoi, et pourquoi pas

  data/            Contenu pur, séparé de la logique (§29)
    countries  names  jobs  degrees  diseases  properties
    vehicles   crimes activities  events/
    regions  neighborhoods  housing  schools  originPresets
    interests  habits  fears  ambitions  experiences

  components/      LifeTimeline, StatsBar, CharacterHeader, Navigation,
                   Modal, RelationshipCard, ActivityMenu, EventModal,
                   PersonalityPanel
  screens/         Création, Parcours, École, Avoirs, Proches, Profil,
                   Caractère, Trajectoire, Accueil, Récapitulatif
  ui/              Pont React ↔ moteur, formatage
```

### Ajouter du contenu sans toucher au moteur

Tout le contenu est déclaratif. Pour enrichir le jeu, il suffit d'ajouter une
entrée dans le fichier de données correspondant :

* **un métier** → `data/jobs.ts` (nom, catégorie, échelle hiérarchique
  complète, diplôme requis, stress, horaires, âge minimum) ;
* **un pays** → `data/countries.ts` (salaires, coût de la vie, fiscalité,
  couverture santé, criminalité, sévérité judiciaire, villes) ;
* **une maladie** → `data/diseases.ts` (rareté, gravité, mortalité,
  symptômes, traitement, coût, effets annuels) ;
* **un événement** → un fichier dans `data/events/`, avec ses conditions
  d'apparition, son texte, ses choix et leurs conséquences pondérées ;
* **un quartier, un logement, une école, un contexte de naissance** →
  `data/neighborhoods.ts`, `data/housing.ts`, `data/schools.ts`,
  `data/originPresets.ts`. Les régions et les villes sont instanciées à partir
  de huit archétypes régionaux : ajouter un pays revient à donner des noms.

Les événements ne contiennent aucun code : le système `randomEvents` évalue
les conditions, tire une situation, applique les effets déclarés et délègue
les cas particuliers (perte d'emploi, arrestation, grossesse…) au moteur.

```ts
ev({
  id: 'ad_wallet', kind: 'random', icon: '👛',
  title: 'Un portefeuille par terre', weight: 30,
  cond: { minAge: 10 },
  text: 'Un portefeuille bien rempli traîne sur le trottoir. Aucun témoin.',
  choices: [
    { label: 'Le rapporter', outcomes: [
      { weight: 3, text: '…', tone: 'good', effects: { stats: { karma: 14 }, money: 120 } },
      { weight: 2, text: '…', tone: 'good', effects: { stats: { karma: 12 } } },
    ] },
    { label: 'Prendre l’argent', outcomes: [/* … */] },
  ],
})
```

## Équilibrage

Les probabilités vivent toutes dans `engine/probability.ts` — mortalité de
Gompertz, promotions, embauche, romance, maladies, criminalité, justice,
conditionnelle. Aucun système n'invente ses propres chiffres.

L'équilibrage est vérifié automatiquement : `src/engine/__bench__` simule
200 vies pilotées par un joueur automatique raisonnable et vérifie que les
distributions restent plausibles.

Valeurs actuelles sur 200 vies :

| Indicateur | Valeur |
| --- | --- |
| Âge au décès | moyenne 77 · médiane 79 · p90 92 · max 100 |
| Patrimoine à la mort | médiane ~157 k · p90 ~1,4 M |
| Faillites par vie | 0,21 |
| Mariage / enfants | ~65 % mariés · ~1,2 enfant |

Devenir riche demande une vraie carrière et du temps ; le sommet de chaque
hiérarchie professionnelle ne s'atteint que par promotions successives, jamais
par petite annonce.

## Contenu

| | |
| --- | --- |
| Événements | 138, soit 368 choix et 509 issues distinctes |
| Métiers | 98 métiers déclinés en 423 postes hiérarchisés |
| Pays | 24 pays, 110 villes |
| Formations | 20 filières universitaires, 12 formations professionnelles, 6 cycles supérieurs |
| Santé | 50 pathologies, 4 types de praticiens |
| Patrimoine | 15 archétypes immobiliers, 56 modèles de véhicules fictifs |
| Activités | 71 (sports, bien-être, voyages, sorties, boutique, animaux, chirurgie) |
| Zone grise | 14 délits, 4 niveaux de défense, 8 activités en détention |
| Environnement | 8 archétypes régionaux, 6 tailles de ville, 12 types de quartier, 8 sous-zones, 11 logements, 11 types d'établissement, 13 contextes de naissance |
| Personnalité | 12 axes de tempérament, 27 axes de personnalité, 17 valeurs, 26 intérêts, 17 habitudes, 13 peurs, 13 ambitions, 22 expériences formatrices |

Les marchés étant générés à la volée à partir de ces archétypes, le nombre
d'annonces immobilières, de véhicules et d'offres d'emploi réellement
rencontrées au cours d'une vie se compte en centaines.

## Tests

```bash
npm test          # moteur, contenu, justice, vie, environnement, personnalité, école, parité (101 tests)
npm run parity    # régénère l'analyse des écarts de gameplay
npm run smoke     # parcours complet dans un vrai navigateur
npm run build     # typecheck strict + bundle de production
npm run build:single  # version fichier unique pour mobile
```

Parmi eux, `src/engine/__bench__/environnement.test.ts` audite l'impact de
chaque paramètre, joue deux populations de milieux opposés pour vérifier que
l'origine compte sans décider, et génère dix mille naissances pour s'assurer
qu'aucune ne produit d'environnement absurde.

`src/engine/__bench__/personnalite.test.ts` fait le pendant pour le caractère,
avec trois exigences qui tirent dans des directions opposées : aucun trait
décoratif, un caractère qui compte (deux tempéraments opposés dans le même
monde doivent produire des scolarités différentes), et un caractère qui ne
décide pas tout (deux vies presque identiques doivent malgré tout diverger).

Le test de fumée (`tools/smoke.mjs`) lance Chromium, règle un tempérament dans
l'écran de création détaillé, crée une vie, joue vingt-deux années, postule à
un emploi, visite chaque écran — y compris la fiche de caractère et la
trajectoire —, interagit avec un proche, fait du sport, puis vieillit jusqu'à
la mort et vérifie qu'aucune erreur n'est apparue en console. Les captures
sont écrites dans `.smoke/`.

## Sauvegarde

Tout est enregistré dans `localStorage` après chaque action : personnage, PNJ
et leur historique, environnement complet et son évolution, relations,
carrière, études, biens, véhicules, maladies, casier, testament, timeline
complète et état du générateur aléatoire. Une
partie rechargée poursuit exactement la même suite de tirages.

Les vies terminées sont conservées dans un cimetière consultable depuis
l'accueil.

## Notes

Tous les personnages, marques, entreprises, établissements et lieux fictifs
sont inventés pour ce projet. Les activités illégales sont des mécaniques de
jeu abstraites — un tirage, un gain, un risque — et ne décrivent aucun mode
opératoire.
