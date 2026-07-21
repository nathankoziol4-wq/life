# LifeSim X100

Simulateur de vie textuel façon BitLife, **poussé à l'extrême**. Le cœur du jeu est
un **menu de création massif** où chaque choix a un impact **mécanique, chiffré et
durable** sur toute la vie du personnage — jamais cosmétique.

> Deux personnages créés différemment vivent deux vies radicalement différentes.

## Principe fondateur

Chaque option de création émet un ou plusieurs **modificateurs** `{ target, op, value, label, source }`.
Ils sont empilés puis appliqués de façon déterministe à la génération du perso
(`add → mult → min/max`, avec `set` comme base). L'écran de récap montre, avant de
valider, comment les choix cumulés ont façonné le personnage.

## Démarrer

```bash
npm install
npm run dev      # serveur de dev Vite
npm run build    # typecheck (tsc) + build de production
```

Stack : **React + TypeScript + Vite**, single-page. Sauvegarde en mémoire (état
React, pas de localStorage). UI sombre, mobile-first, tout le texte en français.

### Version autonome (un seul fichier, sans installation)

```bash
npm run standalone   # génère LifeSimX100.html (tout inline)
```

Le fichier `LifeSimX100.html` s'ouvre d'un double-clic dans n'importe quel
navigateur, sans serveur ni dépendances.

## Boucle de jeu

`Accueil → Création → Récap d'impact → Vie année par année → Écran de fin`

Le **menu principal** (`components/HomeScreen.tsx`) est un écran d'accueil animé
(orbes en mouvement, particules d'événements qui s'élèvent, logo scintillant,
tagline qui défile, CTA lumineux) avec deux entrées : **Nouvelle vie** (création
détaillée) et **Vie express** (personnage aléatoire, partie immédiate).

1. **Menu de création** (6 onglets) : Origine & contexte · Génétique & physique ·
   Répartition de stats · Personnalité · Talents & défis · Astrologie/karma.
2. **Récap d'impact** : fiche de personnage avec stats finales, méta-stats
   (espérance de vie, argent, héritage…) et une **phrase de destin** générée.
3. **Vie** : à chaque année, le moteur applique vieillissement, économie, santé,
   carrière, puis tire un événement pondéré par la Chance et les stats.
4. **Fin** : score de vie, verdict et résumé narratif de toute l'existence.

## Architecture

Séparation stricte **données / logique / UI** :

```
src/
├── types.ts              # tous les types du domaine
├── data/                 # contenu pur (JSON-like, extensible)
│   ├── countries.ts      # 32 pays (espérance, revenu, santé, criminalité…)
│   ├── eras.ts           # époques 1950→2025 (événements historiques)
│   ├── socialClasses.ts  # 6 paliers sociaux
│   ├── familyStructures.ts
│   ├── physique.ts       # corpulences, prédispositions, allergies, handicaps
│   ├── traits.ts         # 21 traits de caractère
│   ├── talents.ts        # dons innés + malédictions/défis (mode hardcore)
│   ├── zodiac.ts         # signes + karma
│   ├── careers.ts        # voies (salariat, crime, politique, art, sport…)
│   └── events.ts         # bibliothèque d'événements
├── engine/               # logique pure, sans React
│   ├── rng.ts            # RNG déterministe pondéré par la Chance
│   ├── modifiers.ts      # système de modificateurs empilables
│   ├── character.ts      # génération du perso + calcul d'impact
│   ├── events.ts         # moteur d'événements (conditions, poids, effets)
│   ├── simulation.ts     # boucle de vie année par année
│   └── destiny.ts        # phrases de destin, score et résumé de vie
└── components/           # UI React
    ├── ui.tsx            # primitives (cartes, barres de stats…)
    ├── CreationMenu.tsx  # le menu de création à onglets
    ├── RecapScreen.tsx   # récap d'impact / fiche perso
    ├── GameScreen.tsx    # boucle de vie
    └── EndScreen.tsx     # bilan final
```

### Ajouter du contenu

- **Un pays** → une entrée dans `data/countries.ts`.
- **Un événement** → un objet `GameEvent` dans `data/events.ts` avec ses
  `condition` (âge, tags mémoire, stats, plage d'années), son `weight`, et ses
  `choices` (chacun avec `requires` + `effects`) ou un `autoEffects`.
- **Une carrière** → une entrée dans `data/careers.ts` (stat clé, éducation min,
  échelons, risque).
- **Un trait / talent / défi** → une entrée dans le fichier correspondant. Le tag
  `trait:x` / `talent:x` / `challenge:x` est automatiquement exploitable dans les
  conditions d'événements.

Aucune modification du moteur n'est nécessaire pour étendre le contenu.

## Systèmes implémentés

- **Menu de création massif** (6 onglets) avec customisation très poussée : 32 pays,
  5 époques, 6 milieux sociaux, cadre de vie, religion, apparence détaillée
  (carnation, cheveux, yeux, trait distinctif, voix), 21 traits, tempérament,
  valeurs, peurs, orientation, dons, défis hardcore, vices, objectif de vie,
  astrologie/karma. Générateur de nom aléatoire.
- Système de **modificateurs empilables** + écran de récap d'impact.
- **Barre d'actions façon BitLife** (en bas) : 7 branches — Savoir, Travail, Crime,
  Corps & Esprit, Social, Argent, Loisirs — avec conditions, coûts, cooldowns et
  jets risqués pondérés par la Chance.
- **Crime approfondi à sous-branches** : la branche Crime ouvre 6 sous-menus —
  🌃 Rue, 💻 Arnaques en ligne (phishing → fraude bancaire → cybercasse),
  🔫 Braquages (supérette → banque → fourgon → musée, difficulté croissante),
  💀 Grand banditisme (extorsion, enlèvement, contrat/assassinat), 🎩 Cols blancs
  (fraude fiscale, détournement, délit d'initié, blanchiment), 🛒 Marché noir. La
  **boutique** vend du matériel (cagoule, gants, arme, téléphone crypté, botnet…)
  qui **débloque des crimes** ou **réduit leur difficulté** (taux de réussite
  affiché). ~40 crimes au total.
- **Avatars / têtes** : ton personnage a une tête SVG personnalisable (carnation,
  coiffure, cheveux, yeux, trait, accessoire) qui se met à jour en direct dans la
  création, le récap et le HUD. Chaque connaissance (PNJ) a sa propre tête générée.
- **Relations jouables** (sous-branche Social → Mes relations) : chaque
  connaissance a un avatar, une jauge de complicité et des **activités** dédiées —
  passer du temps, offrir un cadeau, déclarer sa flamme, se marier, fonder une
  famille, rompre, couper les ponts, menacer, agresser ou **éliminer**.
- **Narrateur "IA"** (`engine/narrator.ts`) : décrit *comment* une conséquence se
  produit — la méthode d'un meurtre, le déroulé d'un braquage ou d'une arnaque —
  avec des variantes selon que tu te fais prendre ou non.
- Boucle de vie année par année avec **2 à 4 événements par an** (file résolue une
  à une) parmi ~65 événements scriptés, en grande partie récurrents.
- **Moteur narratif génératif** (`engine/generator.ts`) : une "IA de jeu" 100 %
  hors-ligne qui compose des événements et choix INÉDITS à chaque partie, **cohérents
  avec l'âge** (enfance, ado, adulte, senior : chaque scénario déclare sa tranche
  d'âge). Durée de vie infinie, parties toujours différentes. ~50 % des événements
  annuels sont générés.
- **Aperçu de conséquences** : toucher un choix déploie son explication et ses
  effets chiffrés (gains/pertes de stats, argent, risque de prison, et pour les
  paris la probabilité de réussite + les deux issues) avant de confirmer.
- **Pop-up de conséquences** (`engine/outcome.ts`) : après CHAQUE choix, une
  fenêtre raconte en détail ce qui s'est passé (le narrateur décrit p. ex.
  comment un meurtre a été commis) et liste les **répercussions réelles**
  (calculées par diff avant/après : stats, argent, prison, relations, statuts).
- **Anti-répétition** : l'IA de jeu mémorise les textes déjà affichés (`seen`)
  et régénère une formulation neuve pour ne pas se répéter ; touches d'ambiance
  variées par tonalité.
- Mémoire d'événements (les tags rouvrent/ferment des options futures et des actions).
- Carrières avec échelons, promotions et risques ; économie (salaire, impôts pays).
- **Système de prison** : les crimes graves ratés (arnaque, cambriolage, trafic)
  envoient en détention — perte d'emploi, casier, années à purger. En prison, la
  barre d'actions se restreint aux actions carcérales (se former, muscu, se faire
  respecter, rejoindre un gang, tenter une évasion, demander la conditionnelle),
  avec une jauge de comportement qui conditionne la libération anticipée. Sortie
  avec un statut d'ex-détenu qui pèse sur la réinsertion.
- Santé & vieillissement, maladies déclenchées par la génétique, addictions, désintox.
- Événements historiques liés à l'époque (crise 2008, pandémie 2020, vague IA).
- Relations (famille, partenaire, ami, ennemi, enfant) avec proximité.
- Fin de vie : score + résumé narratif.

### Ajouter une action
Un objet `Action` dans `data/actions.ts` (branche, condition, coût, cooldown, et
`effects` déterministes **ou** un `risky` à résultat aléatoire). Rien d'autre à toucher.

## 3 axes d'extension prioritaires

1. **Relations & généalogie profondes** : donner à chaque PNJ ses propres stats,
   mémoire et objectifs (jalousie, trahison, réconciliation), enfants jouables et
   arbre généalogique multi-générations (hériter des gènes/patrimoine).
2. **Économie & patrimoine avancés** : investissements (immobilier, bourse,
   crypto), dettes, faillite, fiscalité par pays réellement différenciée,
   transmission d'héritage à la mort.
3. **Contenu narratif ramifié à grande échelle** : passer de ~25 à plusieurs
   centaines d'événements, avec des arcs multi-étapes (une décision à 16 ans qui
   ressurgit à 50 ans), des fins multiples scénarisées et des branches complètes
   (crime organisé, politique, célébrité) déjà amorcées par les tags.
