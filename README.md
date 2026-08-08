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
npm run build:single      # → dist-single/odyssia.html (~645 ko)
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
familiale, fratrie — et un 🎲 par catégorie retire le reste au hasard, de
façon cohérente avec ce qui est déjà fixé.

L'aperçu est calculé par le vrai générateur : ce qui s'affiche pendant la
création est exactement ce que la partie utilisera.

### La règle : aucun réglage décoratif

Chaque paramètre d'environnement doit avoir une conséquence mesurable dans la
simulation. Ce n'est pas une intention, c'est un test : `validateEnvironmentImpact()`
perturbe chaque champ un par un et vérifie que quelque chose bouge dans les
six contextes du moteur, dans les axes d'opportunité et dans le bilan du foyer.
Un champ sans effet fait échouer la suite de tests.

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

Le caractère suit le même principe : un **tempérament** fixé à la naissance,
et des **traits acquis** qui dérivent vers ce que le milieu, les rencontres et
les décisions poussent à devenir — d'autant plus vite qu'on est jeune.

## Le jeu en une minute

Le journal de vie occupe l'écran. En bas, quatre menus et un gros bouton
central **+1 an** qui déclenche le moteur : le personnage vieillit, les PNJ
vivent leur vie, les finances se soldent, les maladies évoluent, et une à
trois situations demandent une réponse.

| Menu | Contenu |
| --- | --- |
| **Parcours** | Scolarité, notes, clubs, université, formations, offres d'emploi, carrière, retraite |
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
    household        Parents, fratrie, famille élargie
    contexts         Traduction de l'environnement en effets chiffrés
    environment      Évolution annuelle du décor et déménagements
    environmentAudit Vérification qu'aucun réglage n'est décoratif

  data/            Contenu pur, séparé de la logique (§29)
    countries  names  jobs  degrees  diseases  properties
    vehicles   crimes activities  events/
    regions  neighborhoods  housing  schools  originPresets

  components/      LifeTimeline, StatsBar, CharacterHeader, Navigation,
                   Modal, RelationshipCard, ActivityMenu, EventModal
  screens/         Création, Parcours, Avoirs, Proches, Profil, Accueil,
                   Récapitulatif
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
| Âge au décès | moyenne 72 · médiane 75 · p90 88 · max 98 |
| Patrimoine à la mort | médiane ~94 k · p90 ~1 M · maximum ~5,9 M |
| Faillites par vie | 0,12 |
| Mariage / enfants | ~49 % mariés · ~1 enfant |

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

Les marchés étant générés à la volée à partir de ces archétypes, le nombre
d'annonces immobilières, de véhicules et d'offres d'emploi réellement
rencontrées au cours d'une vie se compte en centaines.

## Tests

```bash
npm test          # moteur, contenu, justice, vie, environnement, équilibrage (68 tests)
npm run smoke     # parcours complet dans un vrai navigateur
npm run build     # typecheck strict + bundle de production
npm run build:single  # version fichier unique pour mobile
```

Parmi eux, `src/engine/__bench__/environnement.test.ts` audite l'impact de
chaque paramètre, joue deux populations de milieux opposés pour vérifier que
l'origine compte sans décider, et génère dix mille naissances pour s'assurer
qu'aucune ne produit d'environnement absurde.

Le test de fumée (`tools/smoke.mjs`) lance Chromium, crée une vie, joue
vingt-deux années, postule à un emploi, visite chaque écran, interagit avec un
proche, fait du sport, puis vieillit jusqu'à la mort et vérifie qu'aucune
erreur n'est apparue en console. Les captures sont écrites dans `.smoke/`.

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
