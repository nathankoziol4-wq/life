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

  data/            Contenu pur, séparé de la logique (§29)
    countries  names  jobs  degrees  diseases  properties
    vehicles   crimes activities  events/

  components/      LifeTimeline, StatsBar, CharacterHeader, Navigation,
                   Modal, RelationshipCard, ActivityMenu, EventModal
  screens/         Parcours, Avoirs, Proches, Profil, Accueil, Récapitulatif
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
  d'apparition, son texte, ses choix et leurs conséquences pondérées.

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

Les marchés étant générés à la volée à partir de ces archétypes, le nombre
d'annonces immobilières, de véhicules et d'offres d'emploi réellement
rencontrées au cours d'une vie se compte en centaines.

## Tests

```bash
npm test          # moteur, contenu, justice, vie et équilibrage (52 tests)
npm run smoke     # parcours complet dans un vrai navigateur
npm run build     # typecheck strict + bundle de production
```

Le test de fumée (`tools/smoke.mjs`) lance Chromium, crée une vie, joue
vingt-deux années, postule à un emploi, visite chaque écran, interagit avec un
proche, fait du sport, puis vieillit jusqu'à la mort et vérifie qu'aucune
erreur n'est apparue en console. Les captures sont écrites dans `.smoke/`.

## Sauvegarde

Tout est enregistré dans `localStorage` après chaque action : personnage, PNJ
et leur historique, relations, carrière, études, biens, véhicules, maladies,
casier, testament, timeline complète et état du générateur aléatoire. Une
partie rechargée poursuit exactement la même suite de tirages.

Les vies terminées sont conservées dans un cimetière consultable depuis
l'accueil.

## Notes

Tous les personnages, marques, entreprises, établissements et lieux fictifs
sont inventés pour ce projet. Les activités illégales sont des mécaniques de
jeu abstraites — un tirage, un gain, un risque — et ne décrivent aucun mode
opératoire.
