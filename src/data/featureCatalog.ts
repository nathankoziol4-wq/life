/**
 * Le catalogue de fonctionnalités.
 *
 * Ce fichier remplace la méthode de travail précédente. Jusqu'ici, chaque
 * chantier partait d'une liste écrite à la main : on ajoutait les gros
 * systèmes et on oubliait des dizaines de petites mécaniques, simplement
 * parce qu'elles n'étaient sur aucune liste.
 *
 * Désormais **c'est le catalogue qui décide du travail**. Il énumère, feuille
 * par feuille, ce qu'un simulateur de vie de cette famille permet de faire —
 * pas « Éducation », mais « Éducation > Lycée > Camarades > Inviter à
 * sortir ». Chaque feuille porte son état réel et les preuves de cet état.
 *
 * ## Les six états
 *
 * | État | Ce que ça veut dire |
 * | --- | --- |
 * | `MISSING` | N'existe pas. |
 * | `PLACEHOLDER` | Un bouton, un texte, presque rien derrière. |
 * | `BASIC` | Fonctionne, mais c'est un tirage et un effet. |
 * | `PARTIAL` | Un vrai système, dont des branches manquent. |
 * | `COMPLETE` | Interface, logique, persistance, conséquences, tests. |
 * | `INTERACTIVE` | Le joueur agit lui-même et sa performance compte. |
 *
 * ## Ce qui empêche ce fichier de mentir
 *
 * Les règles sont vérifiées mécaniquement par `catalogue.test.ts` :
 *
 * 1. dès `BASIC`, une feuille doit citer un symbole **réellement exporté** ;
 * 2. `COMPLETE` exige en plus une interface, de la persistance, des
 *    conséquences **et un fichier de tests qui existe** ;
 * 3. `INTERACTIVE` exige un mini-jeu **inscrit au registre** ;
 * 4. une feuille sans dépendance ni conséquence est signalée comme orpheline ;
 * 5. le score de couverture est calculé depuis ce fichier, jamais écrit à la
 *    main.
 *
 * On ne peut donc pas s'auto-décerner une fonctionnalité : la case verte
 * exige une preuve, et le test échoue si la preuve est fausse.
 */

/* ------------------------------------------------------------------ */
/* Le format                                                           */
/* ------------------------------------------------------------------ */

export type Status =
  | 'MISSING' | 'PLACEHOLDER' | 'BASIC' | 'PARTIAL' | 'COMPLETE' | 'INTERACTIVE';

/** Poids de chaque état dans le score de couverture, sur 1. */
export const STATUS_WEIGHT: Record<Status, number> = {
  MISSING: 0,
  PLACEHOLDER: 0.08,
  BASIC: 0.35,
  PARTIAL: 0.6,
  COMPLETE: 0.92,
  INTERACTIVE: 1,
};

/** Raccourcis d'écriture. Une feuille doit tenir sur une ligne ou deux. */
export interface Evidence {
  /** `fichier#symbole` du système qui porte la logique. */
  src?: string;
  /** Fichier d'interface où l'action est atteignable. */
  ui?: string;
  /** Identifiant du mini-jeu, si la feuille est jouée. */
  mg?: string;
  /** Fichier de test (base, sans `.test.ts`). */
  test?: string;
  /** Des événements référencent cette feuille. */
  ev?: 1;
  /** Des PNJ y participent réellement. */
  npc?: 1;
  /** L'action a des suites durables. */
  cons?: 1;
  /** L'état est écrit dans la sauvegarde. */
  pers?: 1;
  /** Ce que la feuille alimente : autres feuilles ou systèmes. */
  deps?: string[];
  /** 1 = anecdotique, 5 = structurant. */
  impact?: number;
  /** Ce qui manque, ou ce qu'il faut savoir. */
  note?: string;
  /**
   * Règle interne : elle agit sans écran, et c'est voulu.
   *
   * Une espérance de vie ou un calcul d'impôt n'a pas de bouton ; exiger une
   * interface pour ces feuilles reviendrait à interdire au moteur d'avoir
   * des règles.
   */
  internal?: 1;
  /**
   * Outillage : ce qui garantit le reste sans être une capacité du joueur.
   * Ni interface, ni conséquence, ni test attendus — c'est le test.
   */
  tooling?: 1;
}

export interface Feature extends Evidence {
  /** Chemin complet dans l'arbre, séparé par des `/`. */
  path: string;
  status: Status;
}

/** Catégorie de rapport (les dix-huit du tableau final). */
export function categoryOf(feature: Feature): string {
  return feature.path.split('/')[0];
}

const f = (path: string, status: Status, e: Evidence = {}): Feature => ({
  path, status, impact: 3, ...e,
});

/* ================================================================== */
/* 1. VIE — naissance, personnage, âge, mort                           */
/* ================================================================== */

const CORE: Feature[] = [
  /* --- Création --- */
  f('Vie/Création/Choisir le prénom', 'COMPLETE', { src: 'engine/newLife.ts#createNewLife', ui: 'screens/CreationScreen.tsx', pers: 1, cons: 1, test: 'naissance', deps: ['Vie/Identité'], impact: 4 }),
  f('Vie/Création/Choisir le nom de famille', 'COMPLETE', { src: 'engine/newLife.ts#createNewLife', ui: 'screens/CreationScreen.tsx', pers: 1, cons: 1, test: 'naissance', deps: ['Héritage/Lignée'], impact: 4 }),
  f('Vie/Création/Choisir le sexe', 'COMPLETE', { src: 'engine/newLife.ts#createNewLife', ui: 'screens/CreationScreen.tsx', pers: 1, cons: 1, test: 'naissance', deps: ['Relations/Amour'], impact: 4 }),
  f('Vie/Création/Choisir le pays', 'COMPLETE', { src: 'systems/originGen.ts#resolveDraft', ui: 'screens/CreationScreen.tsx', pers: 1, cons: 1, test: 'naissance', deps: ['Finance/Fiscalité', 'Justice/Sévérité'], impact: 5 }),
  f('Vie/Création/Choisir la ville', 'COMPLETE', { src: 'systems/originGen.ts#resolveDraft', ui: 'screens/CreationScreen.tsx', pers: 1, cons: 1, test: 'naissance', deps: ['Vie/Environnement'], impact: 4 }),
  f('Vie/Création/Choisir le milieu social', 'COMPLETE', { src: 'data/originPresets.ts', ui: 'screens/CreationScreen.tsx', pers: 1, cons: 1, test: 'naissance', deps: ['Éducation', 'Finance'], impact: 5 }),
  f('Vie/Création/Aperçu avant validation', 'COMPLETE', { tooling: 1, src: 'systems/originGen.ts#previewOrigin', ui: 'screens/CreationScreen.tsx', cons: 1, test: 'naissance', deps: ['Vie/Création'], impact: 3 }),
  f('Vie/Création/Avertissements de cohérence', 'COMPLETE', { tooling: 1, src: 'systems/originGen.ts#coherenceWarnings', ui: 'screens/CreationScreen.tsx', test: 'naissance', deps: ['Vie/Création'], impact: 2 }),
  f('Vie/Création/Vie entièrement aléatoire', 'COMPLETE', { src: 'engine/newLife.ts#createNewLife', ui: 'screens/StartScreen.tsx', pers: 1, cons: 1, test: 'naissance', deps: ['Vie/Création'], impact: 4 }),
  f('Vie/Création/Régler les statistiques de départ', 'MISSING', { impact: 3, note: 'mode avancé : fixer intelligence, allure, santé à la création' }),
  f('Vie/Création/Régler le tempérament', 'PARTIAL', { src: 'systems/psycheGen.ts#buildPsyche', ui: 'screens/CreationScreen.tsx', pers: 1, cons: 1, deps: ['Vie/Personnalité'], impact: 3, note: 'le tempérament se transmet au générateur mais n’est pas choisissable feuille à feuille' }),
  f('Vie/Création/Composer sa famille', 'MISSING', { impact: 4, note: 'choisir parents, fratrie, métiers, âges — le mode bac à sable' }),
  f('Vie/Création/Composer son apparence', 'MISSING', { impact: 3, note: 'l’apparence est tirée, jamais choisie' }),
  f('Vie/Création/Villes personnalisées', 'MISSING', { impact: 1, note: 'ajouter ses propres villes au catalogue' }),
  f('Vie/Création/Listes de prénoms personnalisées', 'MISSING', { impact: 1 }),

  /* --- Naissance --- */
  f('Vie/Naissance/Parents générés avec métier et âge', 'COMPLETE', { src: 'systems/household.ts#buildHousehold', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'naissance', deps: ['Relations/Famille', 'Finance/Aide familiale'], impact: 5 }),
  f('Vie/Naissance/Fratrie générée', 'COMPLETE', { src: 'systems/household.ts#buildHousehold', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'naissance', deps: ['Relations/Famille'], impact: 4 }),
  f('Vie/Naissance/Grands-parents et famille élargie', 'COMPLETE', { src: 'systems/household.ts#buildHousehold', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'naissance', deps: ['Relations/Famille', 'Héritage/Succession'], impact: 3 }),
  f('Vie/Naissance/Richesse et revenus du foyer', 'COMPLETE', { internal: 1, src: 'systems/originGen.ts#recomputeFinance', ui: 'screens/ProfileScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Finance', 'Éducation'], impact: 5 }),
  f('Vie/Naissance/Logement de départ', 'COMPLETE', { src: 'data/housing.ts', ui: 'screens/ProfileScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Vie/Environnement', 'Santé'], impact: 4 }),
  f('Vie/Naissance/Quartier de départ', 'COMPLETE', { src: 'data/neighborhoods.ts', ui: 'screens/ProfileScreen.tsx', pers: 1, cons: 1, test: 'environnement', deps: ['Crime', 'Éducation'], impact: 5 }),
  f('Vie/Naissance/Circonstances familiales particulières', 'COMPLETE', { src: 'data/originPresets.ts', ui: 'screens/ProfileScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Relations/Famille'], impact: 4 }),
  f('Vie/Naissance/Prédispositions héréditaires', 'COMPLETE', { src: 'systems/originGen.ts#randomGenetics', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'naissance', deps: ['Santé/Maladies'], impact: 4 }),
  f('Vie/Naissance/Animal déjà dans le foyer', 'MISSING', { impact: 2, note: 'naître dans une maison avec un chien change l’enfance' }),
  f('Vie/Naissance/Événements de naissance rares', 'MISSING', { impact: 3, note: 'jumeau, naissance prématurée, né en voyage, enfant trouvé' }),
  f('Vie/Naissance/Naître dans une famille célèbre', 'MISSING', { impact: 3, note: 'hériter d’une notoriété au berceau' }),

  /* --- Attributs --- */
  f('Vie/Attributs/Bonheur', 'COMPLETE', { src: 'engine/types.ts#Stats', ui: 'components/StatsBar.tsx', pers: 1, cons: 1, test: 'engine', deps: ['tout'], impact: 5 }),
  f('Vie/Attributs/Santé', 'COMPLETE', { internal: 1, src: 'systems/health.ts#healthSummary', ui: 'components/StatsBar.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Santé', 'Vie/Mort'], impact: 5 }),
  f('Vie/Attributs/Intelligence', 'COMPLETE', { src: 'engine/types.ts#Stats', ui: 'components/StatsBar.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Éducation', 'Carrière'], impact: 5 }),
  f('Vie/Attributs/Allure', 'COMPLETE', { src: 'engine/types.ts#Stats', ui: 'components/StatsBar.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Relations/Amour', 'Notoriété'], impact: 4 }),
  f('Vie/Attributs/Forme physique', 'COMPLETE', { src: 'systems/activities.ts#doSport', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Santé'], impact: 4 }),
  f('Vie/Attributs/Discipline', 'COMPLETE', { src: 'engine/types.ts#Stats', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['Éducation', 'Carrière'], impact: 4 }),
  f('Vie/Attributs/Karma', 'COMPLETE', { src: 'engine/types.ts#Stats', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Justice', 'Notoriété'], impact: 3 }),
  f('Vie/Attributs/Réputation', 'COMPLETE', { src: 'engine/types.ts#Stats', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Carrière', 'Relations'], impact: 4 }),
  f('Vie/Attributs/Stress', 'COMPLETE', { src: 'engine/types.ts#Stats', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Santé', 'Carrière'], impact: 4 }),
  f('Vie/Attributs/Fertilité', 'COMPLETE', { src: 'systems/relationships.ts#tryForBaby', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'life', deps: ['Relations/Enfants'], impact: 3 }),
  f('Vie/Attributs/Dépendance', 'BASIC', { src: 'engine/types.ts#Stats', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, deps: ['Santé'], impact: 3, note: 'une jauge qui monte : ni cure, ni rechute, ni entourage qui réagit' }),
  f('Vie/Attributs/Criminalité', 'COMPLETE', { src: 'systems/crime.ts#commitCrime', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'life', deps: ['Crime'], impact: 4 }),
  f('Vie/Attributs/Notoriété publique', 'COMPLETE', { src: 'systems/fame.ts#advanceFame', ui: 'screens/FameScreen.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Notoriété'], impact: 4 }),

  /* --- Personnalité --- */
  f('Vie/Personnalité/Tempérament inné', 'COMPLETE', { src: 'systems/psycheGen.ts#rollTemperament', ui: 'components/PersonalityPanel.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['tout'], impact: 5 }),
  f('Vie/Personnalité/Axes de caractère', 'COMPLETE', { src: 'systems/psycheGen.ts#initialAxes', ui: 'components/PersonalityPanel.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['Relations', 'Carrière'], impact: 5 }),
  f('Vie/Personnalité/Valeurs', 'COMPLETE', { src: 'systems/psycheGen.ts#initialValues', ui: 'components/PersonalityPanel.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['Vie/Satisfaction'], impact: 4 }),
  f('Vie/Personnalité/Dérive annuelle', 'COMPLETE', { internal: 1, src: 'systems/psyche.ts#updatePersonality', pers: 1, cons: 1, test: 'personnalite', deps: ['Vie/Personnalité'], impact: 5 }),
  f('Vie/Personnalité/Intérêts qui naissent et meurent', 'COMPLETE', { src: 'systems/psyche.ts#advanceInterests', ui: 'components/PersonalityPanel.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['Éducation', 'Travail/Indépendant'], impact: 4 }),
  f('Vie/Personnalité/Peurs acquises', 'COMPLETE', { src: 'systems/psyche.ts#addFear', ui: 'components/PersonalityPanel.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['Vie/Personnalité'], impact: 3 }),
  f('Vie/Personnalité/Habitudes qui coûtent', 'PARTIAL', { src: 'systems/psyche.ts#advanceHabits', ui: 'components/PersonalityPanel.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['Finance', 'Santé'], impact: 3, note: 'on ne peut pas prendre ni perdre une habitude délibérément' }),
  f('Vie/Personnalité/Ambitions', 'PARTIAL', { src: 'systems/psycheGen.ts#pickAmbitions', ui: 'components/PersonalityPanel.tsx', pers: 1, cons: 1, deps: ['Vie/Satisfaction'], impact: 3, note: 'affichées et alimentées, mais le joueur ne s’en fixe aucune' }),
  f('Vie/Personnalité/Souvenirs marquants', 'PARTIAL', { src: 'systems/psyche.ts#applyExperience', ui: 'components/PersonalityPanel.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['Vie/Personnalité'], impact: 3, note: 'le joueur les lit ; les PNJ ne s’en servent pas' }),
  f('Vie/Personnalité/Compatibilité entre caractères', 'COMPLETE', { internal: 1, src: 'systems/psyche.ts#calculateCompatibility', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'personnalite', deps: ['Relations/Amour'], impact: 4 }),
  f('Vie/Personnalité/Aucun paramètre décoratif', 'COMPLETE', { tooling: 1, src: 'systems/psycheAudit.ts#validatePsycheImpact', test: 'personnalite', deps: ['Méta/Tests'], impact: 4 }),
  f('Vie/Personnalité/Talents découverts', 'PLACEHOLDER', { src: 'data/events/childhood.ts', ui: 'components/EventModal.tsx', deps: ['Vie/Personnalité'], impact: 3, note: 'un événement « don caché » qui ne mène nulle part : le talent n’est ni stocké, ni cultivable, ni utilisable' }),
  f('Vie/Personnalité/Compétences explicites et progressives', 'MISSING', { impact: 4, note: 'les compétences sont des statistiques diffuses ; rien à faire monter délibérément' }),

  /* --- Apparence --- */
  f('Vie/Apparence/Apparence générée', 'COMPLETE', { src: 'systems/originGen.ts#randomAppearance', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'naissance', deps: ['Relations/Amour'], impact: 3 }),
  f('Vie/Apparence/Vieillissement visible', 'PARTIAL', { src: 'systems/aging.ts#ageUpPlayer', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, deps: ['Vie/Attributs/Allure'], impact: 2, note: 'l’allure baisse avec l’âge mais l’apparence décrite ne change pas' }),
  f('Vie/Apparence/Coiffure et style', 'MISSING', { impact: 2 }),
  f('Vie/Apparence/Salon et soins', 'MISSING', { impact: 2, note: 'coupe, manucure, massage, soins — petites actions récurrentes' }),
  f('Vie/Apparence/Chirurgie esthétique', 'BASIC', { src: 'systems/activities.ts#cosmeticSurgery', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Vie/Attributs/Allure'], impact: 3, note: 'une action, un tirage : ni choix de procédure, ni complication, ni recours' }),
  f('Vie/Apparence/Tatouages et marques', 'MISSING', { impact: 1 }),

  /* --- Environnement --- */
  f('Vie/Environnement/Quartier vivant', 'COMPLETE', { src: 'systems/environment.ts#advanceEnvironment', ui: 'screens/ProfileScreen.tsx', pers: 1, cons: 1, test: 'environnement', deps: ['Crime', 'Éducation', 'Finance'], impact: 5 }),
  f('Vie/Environnement/Économie locale', 'COMPLETE', { internal: 1, src: 'systems/contexts.ts#getLocalOpportunities', pers: 1, cons: 1, test: 'environnement', deps: ['Carrière', 'Patrimoine'], impact: 4 }),
  f('Vie/Environnement/Déménager de ville', 'PARTIAL', { src: 'systems/activities.ts#moveToCity', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Vie/Environnement'], impact: 3, note: 'le quartier, le logement et le marché local suivent bien (`relocatePlayer`) ; l’entourage, lui, reste intact — on ne perd personne en déménageant' }),
  f('Vie/Environnement/Émigrer', 'COMPLETE', { src: 'systems/activities.ts#immigrate', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'langues', deps: ['Finance/Fiscalité', 'Vie/Langues'], impact: 4, note: 'la note « ni dossier, ni refus » était périmée : le visa dépend de l’ouverture, du diplôme, de la fortune et du casier, et se refuse — un test le vérifie désormais au lieu de le croire' }),
  f('Vie/Langues/Langue natale du pays de naissance', 'COMPLETE', { src: 'systems/languages.ts#nativeLanguages', ui: 'screens/LanguageScreen.tsx', test: 'langues', pers: 1, cons: 1, impact: 4, note: 'quinze langues, une par pays jouable, plus les langues de secours qui rendent certaines destinations abordables' }),
  f('Vie/Langues/Apprendre en vivant sur place', 'COMPLETE', { src: 'systems/languages.ts#immersionGain', ui: 'screens/LanguageScreen.tsx', test: 'langues', pers: 1, cons: 1, impact: 5, note: 'l’âge décide : le seul endroit du jeu où le moment d’un choix pèse autant que le choix' }),
  f('Vie/Langues/Parenté entre langues', 'COMPLETE', { src: 'data/languages.ts#kinship', ui: 'screens/LanguageScreen.tsx', test: 'langues', cons: 1, impact: 3, note: 'une langue proche s’apprend vite ; choisir où partir devient une décision et pas une comparaison de salaires' }),
  f('Vie/Langues/Prendre des cours', 'COMPLETE', { src: 'systems/languages.ts#study', ui: 'screens/LanguageScreen.tsx', test: 'langues', pers: 1, cons: 1, impact: 3, note: 'bien moins efficace que d’y vivre, et le seul moyen d’apprendre ce qu’on n’entend pas autour de soi' }),
  f('Vie/Langues/Ce que ça coûte de ne pas parler', 'COMPLETE', { src: 'systems/languages.ts#workFactor', ui: 'screens/LanguageScreen.tsx', test: 'langues', cons: 1, deps: ['Carrière', 'Relations'], impact: 5, note: 'sous le seuil, le marché ne propose que des premiers échelons et les liens se nouent mal — vérifié sur les offres, pas seulement annoncé' }),
  f('Vie/Langues/L’oubli', 'COMPLETE', { src: 'systems/languages.ts#advanceLanguages', ui: 'screens/LanguageScreen.tsx', test: 'langues', pers: 1, cons: 1, impact: 3, note: 'ce qu’on n’emploie plus se perd, sans jamais descendre sous ce qu’on a vraiment su' }),
  f('Vie/Langues/Accent et registre', 'MISSING', { impact: 1, note: 'une langue est un seul nombre : ni accent, ni écrit contre oral, ni registre' }),
  f('Vie/Environnement/Aucun paramètre décoratif', 'COMPLETE', { tooling: 1, src: 'systems/environmentAudit.ts#validateEnvironmentImpact', test: 'environnement', deps: ['Méta/Tests'], impact: 4 }),
  f('Vie/Environnement/Événements mondiaux', 'PARTIAL', { src: 'systems/markets.ts#refreshMarkets', pers: 1, cons: 1, test: 'placements', deps: ['Finance', 'Carrière'], impact: 3, note: 'récession et croissance existent ; ni crise du logement, ni bouleversement technique, ni événement local majeur' }),

  /* --- Âge et mort --- */
  f('Vie/Âge/Passage d’année', 'COMPLETE', { src: 'engine/simulateYear.ts#simulateYear', ui: 'components/Navigation.tsx', pers: 1, cons: 1, test: 'engine', deps: ['tout'], impact: 5 }),
  f('Vie/Âge/Espérance de vie contextuelle', 'COMPLETE', { internal: 1, src: 'engine/probability.ts#lifeExpectancy', pers: 1, cons: 1, test: 'engine', deps: ['Vie/Mort'], impact: 4 }),
  f('Vie/Mort/Causes multiples', 'COMPLETE', { src: 'systems/aging.ts#checkPlayerDeath', ui: 'screens/SummaryScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Héritage'], impact: 5 }),
  f('Vie/Mort/Récapitulatif de fin de vie', 'COMPLETE', { src: 'engine/simulateYear.ts#buildSummary', ui: 'screens/SummaryScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Héritage'], impact: 4 }),
  f('Vie/Mort/Score de vie', 'COMPLETE', { src: 'engine/simulateYear.ts#buildSummary', ui: 'screens/SummaryScreen.tsx', cons: 1, test: 'engine', deps: ['Héritage'], impact: 3 }),
  f('Vie/Mort/Obsèques', 'MISSING', { impact: 2, note: 'qui vient, ce qui se dit, ce que ça coûte' }),
  f('Vie/Bilan/Titre de fin de vie', 'COMPLETE', { src: 'data/ribbons.ts#RIBBONS', ui: 'screens/SummaryScreen.tsx', test: 'titres', pers: 1, cons: 1, impact: 4, note: '36 titres, chacun lu sur au moins trois dimensions croisées — un test le vérifie mécaniquement en poussant chaque statistique seule. S’appuie sur une chronique de seize compteurs et sur les lieux vus, sans quoi l’état final ne dirait pas ce qui s’est passé' }),
  f('Vie/Bilan/Mentions', 'COMPLETE', { src: 'systems/ribbons.ts#awardRibbon', ui: 'screens/SummaryScreen.tsx', test: 'titres', pers: 1, cons: 1, impact: 2, note: 'une vie en mérite souvent plusieurs ; le plus rare devient le titre, les autres restent en mentions' }),
  f('Vie/Bilan/Épitaphe', 'COMPLETE', { src: 'systems/ribbons.ts#obituary', ui: 'screens/SummaryScreen.tsx', test: 'titres', pers: 1, cons: 1, impact: 3, note: 'écrite depuis le dossier et non depuis un modèle : une vie sans travail n’a pas de phrase sur le travail' }),
  f('Héritage/Objets de famille/Les trouver', 'INTERACTIVE', { src: 'systems/minigames/attic.ts#attic', ui: 'screens/CollectionScreen.tsx', mg: 'attic', test: 'heritage', pers: 1, cons: 1, impact: 3, note: 'une pièce noire, une lampe qui s’avive quand on approche, trois fouilles et des leurres qui répondent comme le bon objet' }),
  f('Héritage/Objets de famille/L’âge fait la valeur', 'COMPLETE', { src: 'data/heirlooms.ts#ageFactor', ui: 'screens/CollectionScreen.tsx', test: 'heritage', pers: 1, cons: 1, deps: ['Finance/Patrimoine'], impact: 4, note: 'le seul placement du jeu qui demande de la patience et non de l’argent : un carnet gardé deux siècles et demi dépasse un tableau acheté hier' }),
  f('Héritage/Objets de famille/Les tenir', 'COMPLETE', { src: 'systems/heirlooms.ts#restore', ui: 'screens/CollectionScreen.tsx', test: 'heritage', pers: 1, cons: 1, impact: 3, note: 'l’état baisse tout seul à une vitesse propre à l’objet ; reprendre coûte de l’argent et de l’authenticité, et cinq reprises font une copie' }),
  f('Héritage/Objets de famille/Vendre, donner', 'COMPLETE', { src: 'systems/heirlooms.ts#sell', ui: 'screens/CollectionScreen.tsx', test: 'heritage', npc: 1, pers: 1, cons: 1, impact: 3, note: 'vendre ce que la famille a tenu cent ans se paie ailleurs qu’en argent ; donner le fait sortir de la lignée pour de bon' }),
  f('Héritage/Objets de famille/Traverser les générations', 'COMPLETE', { src: 'systems/lineage.ts#continueAs', ui: 'screens/CollectionScreen.tsx', test: 'heritage', pers: 1, cons: 1, deps: ['Héritage/Lignée'], impact: 4, note: 'la seule chose du jeu qui passe en gardant son identité ; chaque génération ajoute une ligne à son histoire, même celles qui n’y ont pas touché' }),
  f('Héritage/Collections/Ce qu’une vie a rassemblé', 'COMPLETE', { src: 'screens/CollectionScreen.tsx', ui: 'screens/CollectionScreen.tsx', test: 'heritage', pers: 1, cons: 1, impact: 2, note: 'métiers tenus, diplômes, distinctions, titres, biens, véhicules, animaux, lieux vus — rassemblés là où le jeu les savait déjà sans jamais les montrer' }),
  f('Vie/Satisfaction/Bilan de satisfaction de vie', 'COMPLETE', { internal: 1, src: 'systems/psyche.ts#lifeSatisfaction', ui: 'screens/TrajectoryScreen.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['Vie/Personnalité'], impact: 3 }),
  f('Vie/Causalité/D’où vient ce qu’on est devenu', 'COMPLETE', { tooling: 1, src: 'systems/causality.ts#explainTrajectory', ui: 'screens/TrajectoryScreen.tsx', pers: 1, cons: 1, test: 'personnalite', deps: ['Vie/Personnalité'], impact: 4 }),
];

/* ================================================================== */
/* 2. ÉDUCATION                                                        */
/* ================================================================== */

const EDUCATION: Feature[] = [
  /* --- Établissement --- */
  f('Éducation/Établissement/Cycles successifs', 'COMPLETE', { src: 'systems/education.ts#advanceEducation', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Carrière'], impact: 5 }),
  f('Éducation/Établissement/Établissement nommé et situé', 'COMPLETE', { src: 'data/schools.ts', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Vie/Environnement'], impact: 4 }),
  f('Éducation/Établissement/Qualité qui dépend du quartier', 'COMPLETE', { internal: 1, src: 'systems/contexts.ts#getEducationContext', pers: 1, cons: 1, test: 'environnement', deps: ['Éducation/Notes'], impact: 5 }),
  f('Éducation/Établissement/Année en cours affichée', 'COMPLETE', { tooling: 1, src: 'systems/education.ts#isInSchool', ui: 'screens/OccupationScreen.tsx', pers: 1, test: 'ecole', deps: ['Éducation'], impact: 3 }),
  f('Éducation/Établissement/Changer d’établissement', 'COMPLETE', { src: 'systems/education.ts#changeSchool', ui: 'screens/SchoolScreen.tsx', test: 'ecole', pers: 1, cons: 1, npc: 1, impact: 3, note: 'dérogation, privé, internat — chacun avec son prix, et tout ce qu’on avait construit reste derrière' }),
  f('Éducation/Établissement/Ce que la famille peut payer', 'COMPLETE', { src: 'systems/education.ts#transferOptions', ui: 'screens/SchoolScreen.tsx', test: 'ecole', cons: 1, deps: ['Finance'], impact: 3, note: 'le privé et l’internat dépendent du revenu du foyer, pas de ce que l’enfant veut' }),
  f('Éducation/Établissement/Redoubler', 'COMPLETE', { src: 'systems/education.ts#advanceEducation', ui: 'screens/OccupationScreen.tsx', test: 'ecole', pers: 1, cons: 1, impact: 3, note: 'la moyenne, l’assiduité et ce que l’établissement fait des élèves en difficulté ; la classe monte sans toi' }),

  /* --- Notes et performance --- */
  f('Éducation/Notes/Moyenne générale', 'COMPLETE', { src: 'systems/education.ts#advanceEducation', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Université'], impact: 5 }),
  f('Éducation/Notes/Rythme de travail choisi', 'COMPLETE', { src: 'systems/education.ts#setEffort', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Notes', 'Vie/Attributs/Stress'], impact: 4 }),
  f('Éducation/Notes/Travailler davantage ponctuellement', 'COMPLETE', { src: 'systems/schoolActions.ts#studyHarder', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Notes'], impact: 4 }),
  f('Éducation/Notes/Matières distinctes', 'COMPLETE', { src: 'data/subjects.ts#SUBJECTS', ui: 'screens/SchoolScreen.tsx', test: 'examens', pers: 1, cons: 1, impact: 3, note: 'dix matières ; le talent brut et le travail régulier n’y rendent pas la même chose' }),
  f('Éducation/Notes/Points forts et points faibles', 'COMPLETE', { src: 'systems/exams.ts#strengths', ui: 'screens/SchoolScreen.tsx', test: 'examens', pers: 1, cons: 1, impact: 3, note: 'deux élèves de même moyenne peuvent avoir des bulletins opposés' }),
  f('Éducation/Notes/Facilités propres à chacun', 'COMPLETE', { src: 'systems/exams.ts#aptitudeFor', ui: 'screens/SchoolScreen.tsx', test: 'examens', pers: 1, cons: 1, impact: 3, note: 'tirées une fois par vie et stables : on est bon en langues à douze ans comme à dix-sept' }),
  f('Éducation/Notes/Orientation par le bulletin', 'COMPLETE', { src: 'systems/exams.ts#majorFit', ui: 'screens/OccupationScreen.tsx', test: 'examens', cons: 1, deps: ['Éducation/Université'], impact: 4, note: 'une filière lit ses trois matières à elle, pas la moyenne générale' }),
  f('Éducation/Notes/Examen jouable', 'INTERACTIVE', { src: 'systems/exams.ts#settleExam', ui: 'screens/SchoolScreen.tsx', mg: 'exam', test: 'examens', pers: 1, cons: 1, impact: 4, note: 'ce qui s’y joue est le temps, pas le savoir : quelles questions attaquer, et quand lâcher' }),
  f('Éducation/Notes/Session manquée', 'COMPLETE', { src: 'systems/exams.ts#advanceExams', ui: 'screens/SchoolScreen.tsx', test: 'examens', pers: 1, cons: 1, impact: 3, note: 'ne pas s’y présenter compte comme un zéro, y compris après avoir quitté l’école' }),
  f('Éducation/Notes/Bulletins et mentions', 'COMPLETE', { src: 'systems/exams.ts#report', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'examens', deps: ['Éducation/Université'], impact: 3, note: 'le bulletin est tenu année par année et remis à zéro à chaque cycle' }),
  f('Éducation/Notes/Triche à un examen', 'COMPLETE', { src: 'systems/exams.ts#setCheating', ui: 'screens/SchoolScreen.tsx', mg: 'exam', test: 'examens', pers: 1, cons: 1, impact: 3, note: 'un raccourci abstrait — une jauge d’attention qui monte — et une copie annulée si l’on est pris' }),

  /* --- Comportement --- */
  f('Éducation/Comportement/Dossier disciplinaire persistant', 'COMPLETE', { src: 'systems/schoolActions.ts#discipline', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Direction'], impact: 4 }),
  f('Éducation/Comportement/Sécher les cours', 'COMPLETE', { src: 'systems/schoolActions.ts#skipSchool', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Notes', 'Éducation/Comportement'], impact: 4 }),
  f('Éducation/Comportement/Manquer de respect', 'COMPLETE', { src: 'systems/schoolActions.ts#disrespect', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Professeurs'], impact: 4 }),
  f('Éducation/Comportement/Escalade des sanctions', 'COMPLETE', { src: 'systems/schoolActions.ts#discipline', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Direction'], impact: 4 }),
  f('Éducation/Comportement/Exclusion définitive', 'COMPLETE', { src: 'systems/schoolActions.ts#discipline', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Établissement'], impact: 4 }),
  f('Éducation/Comportement/Abandonner l’école', 'COMPLETE', { src: 'systems/education.ts#dropOut', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Carrière'], impact: 4 }),
  f('Éducation/Comportement/Convocation des parents', 'PARTIAL', { src: 'systems/schoolActions.ts#discipline', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Relations/Famille'], impact: 3, note: 'la convocation existe dans le dossier ; les parents ne réagissent pas comme une scène' }),

  /* --- Camarades --- */
  f('Éducation/Camarades/Classe peuplée de PNJ persistants', 'COMPLETE', { src: 'systems/school.ts#buildSchoolClass', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Relations'], impact: 5 }),
  f('Éducation/Camarades/Parler', 'COMPLETE', { src: 'systems/schoolActions.ts#classmateAction', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Relations'], impact: 4 }),
  f('Éducation/Camarades/Complimenter', 'COMPLETE', { src: 'systems/schoolActions.ts#classmateAction', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Relations'], impact: 3 }),
  f('Éducation/Camarades/Taquiner', 'COMPLETE', { src: 'systems/schoolActions.ts#classmateAction', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Relations'], impact: 3 }),
  f('Éducation/Camarades/Se lier d’amitié', 'COMPLETE', { src: 'systems/school.ts#friendshipChance', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Relations/Amis'], impact: 4 }),
  f('Éducation/Camarades/Passer du temps ensemble', 'COMPLETE', { src: 'systems/relationships.ts#interact', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Relations'], impact: 3 }),
  f('Éducation/Camarades/Insulter', 'COMPLETE', { src: 'systems/relationships.ts#interact', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Relations'], impact: 3 }),
  f('Éducation/Camarades/Devenir meilleur ami', 'PARTIAL', { src: 'systems/relationships.ts#makeFriend', npc: 1, pers: 1, cons: 1, deps: ['Relations/Amis'], impact: 3, note: 'le lien « meilleur ami » existe mais rien ne permet d’y accéder délibérément' }),
  f('Éducation/Camarades/Inviter à sortir', 'COMPLETE', { src: 'systems/schoolActions.ts#classmateAction', ui: 'screens/SchoolScreen.tsx', test: 'ecole', npc: 1, pers: 1, cons: 1, deps: ['Relations/Amour'], impact: 4, note: 'le premier amour scolaire ; un refus devant témoins coûte davantage qu’un refus discret' }),
  f('Éducation/Camarades/Offrir quelque chose', 'COMPLETE', { src: 'systems/schoolActions.ts#classmateAction', ui: 'screens/SchoolScreen.tsx', test: 'ecole', npc: 1, cons: 1, impact: 2, note: 'ça coûte, et à lien faible le geste se lit pour ce qu’il est' }),
  f('Éducation/Camarades/Faire une farce', 'COMPLETE', { src: 'systems/schoolActions.ts#classmateAction', ui: 'screens/SchoolScreen.tsx', test: 'ecole', npc: 1, cons: 1, impact: 2, note: 'un pari sur le groupe : drôle si la classe rit avec toi, sanctionnée sinon' }),
  f('Éducation/Camarades/Se réconcilier', 'COMPLETE', { src: 'systems/schoolActions.ts#classmateAction', ui: 'screens/SchoolScreen.tsx', test: 'ecole', npc: 1, cons: 1, impact: 3, note: 'le temps fait la moitié du travail ; sans cela une classe ne pouvait que se vider' }),
  f('Éducation/Camarades/Dénoncer à un adulte', 'COMPLETE', { src: 'systems/schoolActions.ts#classmateAction', ui: 'screens/SchoolScreen.tsx', test: 'ecole', npc: 1, cons: 1, impact: 3, note: 'ce qu’ils en font dépend d’eux ; non entendu, ça se sait et ça coûte' }),

  /* --- Harcèlement --- */
  f('Éducation/Harcèlement/Être victime', 'COMPLETE', { src: 'systems/bullying.ts#openHarassment', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', npc: 1, pers: 1, cons: 1, ev: 1, impact: 4, note: 'une situation qui dure, avec quelqu’un dedans, et non un souvenir' }),
  f('Éducation/Harcèlement/Un harceleur identifié', 'COMPLETE', { src: 'systems/bullying.ts#pickBully', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', npc: 1, pers: 1, cons: 1, impact: 4, note: 'un camarade choisi pour ce qu’il est, qui reste dans la partie après' }),
  f('Éducation/Harcèlement/Registres distincts', 'COMPLETE', { src: 'data/bullying.ts#BULLYING_KINDS', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', pers: 1, cons: 1, impact: 3, note: 'moqueries, mise à l’écart, rumeurs, racket, bousculades — chacun abîme autre chose' }),
  f('Éducation/Harcèlement/Ça s’aggrave si on ne fait rien', 'COMPLETE', { src: 'systems/bullying.ts#advanceHarassment', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', pers: 1, cons: 1, impact: 4, note: 'l’ampleur monte seule, et déborde sur les notes et l’assiduité' }),
  f('Éducation/Harcèlement/Ignorer', 'COMPLETE', { src: 'systems/bullying.ts#respond', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', cons: 1, pers: 1, impact: 3, note: 'la meilleure réponse au tout début, la pire ensuite' }),
  f('Éducation/Harcèlement/Affronter', 'COMPLETE', { src: 'systems/bullying.ts#respond', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', cons: 1, pers: 1, impact: 3, note: 'dépend de s’il est seul ; sanctionné par l’établissement dans les deux cas' }),
  f('Éducation/Harcèlement/Signaler à l’établissement', 'COMPLETE', { src: 'systems/bullying.ts#respond', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', cons: 1, pers: 1, impact: 3, note: 'dépend de ce que cet établissement-là en fait ; se paie quand ça n’aboutit pas' }),
  f('Éducation/Harcèlement/En parler à ses parents', 'COMPLETE', { src: 'systems/bullying.ts#respond', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', npc: 1, cons: 1, pers: 1, impact: 3, note: 'la réponse la moins risquée, donc pas la plus forte' }),
  f('Éducation/Harcèlement/S’appuyer sur les autres', 'COMPLETE', { src: 'systems/bullying.ts#alliesOf', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', npc: 1, cons: 1, pers: 1, impact: 4, note: 'la meilleure sortie, et la seule qui exige d’avoir déjà quelqu’un' }),
  f('Éducation/Harcèlement/Aucune réponse universelle', 'COMPLETE', { src: 'systems/bullying.ts#responseOdds', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', cons: 1, impact: 5, note: 'chacune des cinq est la meilleure dans un contexte et la pire dans un autre — vérifié par test' }),
  f('Éducation/Harcèlement/Être témoin', 'COMPLETE', { src: 'systems/bullying.ts#witness', ui: 'components/EventModal.tsx', test: 'harcelement', ev: 1, npc: 1, cons: 1, pers: 1, impact: 3, note: 'quatre choix dont ne rien faire et s’y mettre aussi ; le silence coûte à l’intérieur' }),
  f('Éducation/Harcèlement/Être soi-même le harceleur', 'COMPLETE', { src: 'systems/bullying.ts#pickOn', ui: 'screens/SchoolScreen.tsx', test: 'harcelement', npc: 1, cons: 1, pers: 1, impact: 3, note: 'possible, et compté : karma, amitiés, et le dossier au bout de deux fois' }),

  /* --- Professeurs et direction --- */
  f('Éducation/Professeurs/Personnel persistant', 'COMPLETE', { src: 'systems/school.ts#staffOf', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Relations'], impact: 4 }),
  f('Éducation/Professeurs/Demander de l’aide', 'COMPLETE', { src: 'systems/schoolActions.ts#teacherAction', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Notes'], impact: 4 }),
  f('Éducation/Professeurs/Se faire bien voir', 'COMPLETE', { src: 'systems/schoolActions.ts#teacherAction', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Notes'], impact: 3 }),
  f('Éducation/Professeurs/Signaler un problème', 'COMPLETE', { src: 'systems/schoolActions.ts#teacherAction', ui: 'screens/SchoolScreen.tsx', test: 'ecole', npc: 1, cons: 1, impact: 3, note: 'existait déjà et était classé absent à tort : l’audit avait sa propre erreur' }),
  f('Éducation/Direction/Convocation et sanction', 'PARTIAL', { src: 'systems/schoolActions.ts#discipline', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Comportement'], impact: 3, note: 'les sanctions tombent ; le chef d’établissement n’est pas un PNJ à qui parler' }),
  f('Éducation/Direction/Plaider sa cause', 'COMPLETE', { src: 'systems/schoolActions.ts#teacherAction', ui: 'screens/SchoolScreen.tsx', test: 'ecole', npc: 1, pers: 1, cons: 1, impact: 3, note: 'la seule action qui efface une ligne du dossier ; dépend du dossier, pas de la sympathie' }),

  /* --- Groupes et clubs --- */
  f('Éducation/Groupes/Groupes sociaux de la classe', 'COMPLETE', { src: 'systems/school.ts#peersSharing', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Popularité'], impact: 4 }),
  f('Éducation/Groupes/Demander à rejoindre', 'COMPLETE', { src: 'systems/schoolActions.ts#joinPeerGroup', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Popularité'], impact: 4 }),
  f('Éducation/Groupes/Être refusé', 'COMPLETE', { src: 'systems/schoolActions.ts#joinPeerGroup', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Popularité'], impact: 3 }),
  f('Éducation/Groupes/Quitter un groupe', 'COMPLETE', { src: 'systems/schoolActions.ts#leavePeerGroup', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Popularité'], impact: 3 }),
  f('Éducation/Groupes/L’accès dépend de ce qu’on est', 'COMPLETE', { internal: 1, src: 'systems/schoolActions.ts#joinPeerGroup', pers: 1, cons: 1, test: 'ecole', deps: ['Vie/Personnalité', 'Éducation/Notes'], impact: 4 }),
  f('Éducation/Clubs/Catalogue de clubs', 'COMPLETE', { src: 'systems/education.ts#availableClubs', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Vie/Personnalité'], impact: 4 }),
  f('Éducation/Clubs/Rejoindre', 'COMPLETE', { src: 'systems/education.ts#joinClub', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Popularité'], impact: 4 }),
  f('Éducation/Clubs/Quitter', 'COMPLETE', { src: 'systems/schoolActions.ts#leaveClub', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Clubs'], impact: 3 }),
  f('Éducation/Clubs/Ancienneté et rang', 'COMPLETE', { src: 'systems/schoolActions.ts#advanceClubs', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Popularité'], impact: 3 }),
  f('Éducation/Clubs/Devenir responsable', 'COMPLETE', { src: 'systems/schoolActions.ts#advanceClubs', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Vie/Attributs/Réputation'], impact: 3 }),

  /* --- Sport scolaire --- */
  f('Éducation/Sport/Équipe de l’établissement', 'PARTIAL', { src: 'systems/education.ts#availableClubs', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Vie/Attributs/Forme physique'], impact: 4, note: 'les clubs sportifs existent comme clubs ; ni sélection, ni entraînement, ni compétition' }),
  f('Éducation/Sport/Passer une sélection', 'COMPLETE', { src: 'systems/schoolSport.ts#trySelection', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', pers: 1, cons: 1, impact: 4, note: 'on peut être écarté, et l’être coûte ; le nombre de places compte autant que le niveau' }),
  f('Éducation/Sport/Ce que l’établissement propose', 'COMPLETE', { src: 'systems/schoolSport.ts#offeredSports', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', cons: 1, impact: 3, note: 'le champ `sports` de l’établissement décidait de rien ; il ouvre ou ferme des sports entiers' }),
  f('Éducation/Sport/Entraînements', 'COMPLETE', { src: 'systems/schoolSport.ts#train', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', pers: 1, cons: 1, impact: 3, note: 'deux séances par an, à rendements décroissants, et ça prend sur les devoirs' }),
  f('Éducation/Sport/Groupes et temps de jeu', 'COMPLETE', { src: 'data/schoolSports.ts#SQUADS', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', pers: 1, cons: 1, impact: 3, note: 'espoirs, réserve, première, sélection — monter est le seul progrès qui se voit du dehors' }),
  f('Éducation/Sport/Saison et résultat', 'COMPLETE', { src: 'systems/schoolSport.ts#advanceSchoolSport', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', pers: 1, cons: 1, ev: 1, impact: 4, note: 'soldée chaque année ; une bonne année personnelle peut être gâchée par l’équipe' }),
  f('Éducation/Sport/Dépendre de ses coéquipiers', 'COMPLETE', { src: 'systems/schoolSport.ts#teammateQuality', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', npc: 1, cons: 1, impact: 3, note: 'seulement dans les sports collectifs : c’est ce qui les distingue d’une épreuve individuelle' }),
  f('Éducation/Sport/Devenir capitaine', 'COMPLETE', { src: 'systems/schoolSport.ts#runForCaptain', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', pers: 1, cons: 1, impact: 3, note: 'le brassard va à celui qu’on suit, pas au meilleur ; un test le vérifie' }),
  f('Éducation/Sport/Blessure', 'COMPLETE', { src: 'systems/schoolSport.ts#train', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', ev: 1, pers: 1, cons: 1, impact: 3, note: 'proportionnelle au contact du sport ; fait perdre ce qu’on avait construit' }),
  f('Éducation/Sport/Être remarqué', 'COMPLETE', { src: 'systems/schoolSport.ts#advanceSchoolSport', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', pers: 1, cons: 1, impact: 4, note: 'les recruteurs viennent voir ce qui se voit : un excellent joueur d’aviron reste inconnu' }),
  f('Éducation/Sport/Bourse sportive', 'COMPLETE', { src: 'systems/schoolSport.ts#scholarshipGap', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', pers: 1, cons: 1, deps: ['Éducation/Université'], impact: 4, note: 'niveau, recruteurs et moyenne ; elle paie réellement les frais d’université' }),

  /* --- Popularité --- */
  f('Éducation/Popularité/Popularité dans l’établissement', 'COMPLETE', { src: 'systems/school.ts#advanceClassLife', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Groupes'], impact: 4 }),
  f('Éducation/Popularité/Standing dans son groupe', 'COMPLETE', { src: 'systems/schoolActions.ts#joinPeerGroup', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Éducation/Groupes'], impact: 3 }),
  f('Éducation/Popularité/Réputation scolaire distincte', 'PARTIAL', { src: 'systems/school.ts#advanceClassLife', pers: 1, cons: 1, test: 'ecole', deps: ['Vie/Attributs/Réputation'], impact: 3, note: 'popularité et réputation générale se confondent en partie' }),

  /* --- Supérieur --- */
  f('Éducation/Supérieur/Candidater à l’université', 'COMPLETE', { src: 'systems/education.ts#enrollUniversity', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Carrière'], impact: 5 }),
  f('Éducation/Supérieur/Choisir une filière', 'COMPLETE', { src: 'data/degrees.ts', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Carrière'], impact: 5 }),
  f('Éducation/Supérieur/Être refusé', 'COMPLETE', { tooling: 1, src: 'systems/education.ts#enrollUniversity', ui: 'screens/OccupationScreen.tsx', cons: 1, test: 'ecole', deps: ['Éducation/Supérieur'], impact: 4 }),
  f('Éducation/Supérieur/Bourse', 'COMPLETE', { src: 'systems/education.ts#applyScholarship', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Finance'], impact: 4 }),
  f('Éducation/Supérieur/Prêt étudiant', 'COMPLETE', { src: 'systems/finance.ts#addLoan', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Finance/Dette'], impact: 4 }),
  f('Éducation/Supérieur/Les parents paient', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#familySupport', pers: 1, cons: 1, test: 'milieu', deps: ['Relations/Famille'], impact: 4 }),
  f('Éducation/Supérieur/Formation professionnelle', 'COMPLETE', { src: 'systems/education.ts#enrollVocational', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Carrière'], impact: 4 }),
  f('Éducation/Supérieur/Cycle supérieur', 'COMPLETE', { src: 'systems/education.ts#enrollGraduate', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Carrière'], impact: 4 }),
  f('Éducation/Supérieur/Écoles spécialisées par pays', 'PARTIAL', { src: 'data/degrees.ts', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, deps: ['Carrière'], impact: 3, note: 'les cursus existent ; ils ne varient pas selon le pays' }),
  f('Éducation/Supérieur/Vie étudiante', 'MISSING', { impact: 4, note: 'ni camarades de promotion, ni professeurs, ni clubs, ni logement étudiant' }),
  f('Éducation/Supérieur/Abandonner ses études supérieures', 'COMPLETE', { src: 'systems/education.ts#dropOut', ui: 'screens/SchoolScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Carrière'], impact: 3 }),
];

/* ================================================================== */
/* 3. RELATIONS                                                        */
/* ================================================================== */

const RELATIONS: Feature[] = [
  /* --- Le registre --- */
  f('Relations/Registre/Une bibliothèque d’actions filtrée par contexte', 'COMPLETE', { src: 'systems/actions.ts#getAvailableActions', ui: 'screens/RelationshipsScreen.tsx', npc: 1, cons: 1, test: 'travail', deps: ['Relations'], impact: 5 }),
  f('Relations/Registre/Chaque action bloquée dit pourquoi', 'COMPLETE', { tooling: 1, src: 'systems/actions.ts#getAvailableActions', ui: 'screens/RelationshipsScreen.tsx', test: 'travail', deps: ['Relations'], impact: 4 }),
  f('Relations/Registre/Lien et opinion distincts', 'COMPLETE', { src: 'engine/types.ts#Person', ui: 'components/RelationshipCard.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations'], impact: 4 }),

  /* --- Types de liens --- */
  f('Relations/Types/Mère et père', 'COMPLETE', { src: 'systems/household.ts#buildHousehold', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'milieu', deps: ['Enfance'], impact: 5 }),
  f('Relations/Types/Beaux-parents', 'COMPLETE', { src: 'systems/household.ts#buildHousehold', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'milieu', deps: ['Relations/Famille'], impact: 3 }),
  f('Relations/Types/Frères et sœurs', 'COMPLETE', { src: 'systems/household.ts#buildHousehold', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'milieu', deps: ['Enfance'], impact: 4 }),
  f('Relations/Types/Grands-parents', 'COMPLETE', { src: 'systems/childhood.ts#grandparents', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'enfance', deps: ['Enfance'], impact: 3 }),
  f('Relations/Types/Oncles, tantes, cousins', 'COMPLETE', { src: 'systems/lineage.ts#relationTo', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'lignee', deps: ['Relations/Famille'], impact: 2 }),
  f('Relations/Types/Amis', 'COMPLETE', { src: 'systems/relationships.ts#makeFriend', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations'], impact: 4 }),
  f('Relations/Types/Meilleur ami', 'PARTIAL', { src: 'systems/relationships.ts#advanceRelationships', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, deps: ['Relations/Amis'], impact: 3, note: 'le statut existe ; rien ne permet de le viser' }),
  f('Relations/Types/Ennemis', 'MISSING', { impact: 4, note: 'une relation peut baisser, jamais devenir une inimitié avec ses propres actions' }),
  f('Relations/Types/Conjoint', 'COMPLETE', { src: 'systems/relationships.ts#marry', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Finance/Patrimoine'], impact: 5 }),
  f('Relations/Types/Partenaire', 'COMPLETE', { src: 'systems/relationships.ts#startRelationship', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations/Amour'], impact: 4 }),
  f('Relations/Types/Ex', 'COMPLETE', { src: 'systems/relationships.ts#breakUp', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations/Amour'], impact: 3 }),
  f('Relations/Types/Enfants', 'COMPLETE', { src: 'systems/relationships.ts#deliverBaby', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'lignee', deps: ['Héritage/Lignée'], impact: 5 }),
  f('Relations/Types/Petits-enfants', 'COMPLETE', { src: 'systems/lineage.ts#relationTo', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'lignee', deps: ['Héritage/Lignée'], impact: 3 }),
  f('Relations/Types/Collègues', 'COMPLETE', { src: 'systems/workplace.ts#buildTeam', ui: 'screens/WorkScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'travail', deps: ['Carrière'], impact: 4 }),
  f('Relations/Types/Supérieur', 'COMPLETE', { src: 'systems/workplace.ts#bossOf', ui: 'screens/WorkScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'travail', deps: ['Carrière/Promotion'], impact: 4 }),
  f('Relations/Types/Camarades de classe', 'COMPLETE', { src: 'systems/school.ts#classmatesOf', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Éducation'], impact: 4 }),
  f('Relations/Types/Professeurs', 'COMPLETE', { src: 'systems/school.ts#staffOf', ui: 'screens/SchoolScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'ecole', deps: ['Éducation'], impact: 3 }),
  f('Relations/Types/Codétenus', 'COMPLETE', { src: 'systems/prison.ts#inmateAction', ui: 'screens/PrisonScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'evasion', deps: ['Prison'], impact: 3 }),
  f('Relations/Types/Voisins', 'PARTIAL', { src: 'systems/childhood.ts#neighbourhoodFriends', ui: 'screens/ChildhoodScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'enfance', deps: ['Enfance'], impact: 3, note: 'les enfants du quartier existent avant douze ans ; aucun voisin adulte' }),
  f('Relations/Types/Locataires', 'COMPLETE', { src: 'systems/tenancy.ts#acceptTenant', ui: 'screens/TenancyScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'locataires', deps: ['Patrimoine/Locatif'], impact: 3 }),
  f('Relations/Types/Contacts du milieu', 'COMPLETE', { src: 'systems/underworld.ts#contactsOf', ui: 'screens/UnderworldScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'milieu', deps: ['Crime/Organisé'], impact: 3 }),

  /* --- Actions communes --- */
  f('Relations/Actions/Passer du temps', 'COMPLETE', { src: 'systems/relationships.ts#interact', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations'], impact: 4 }),
  f('Relations/Actions/Complimenter', 'COMPLETE', { src: 'systems/relationships.ts#interact', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations'], impact: 3 }),
  f('Relations/Actions/Insulter', 'COMPLETE', { src: 'systems/relationships.ts#interact', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations'], impact: 3 }),
  f('Relations/Actions/Se disputer', 'COMPLETE', { src: 'systems/relationships.ts#interact', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations'], impact: 3 }),
  f('Relations/Actions/Offrir un cadeau', 'COMPLETE', { src: 'systems/relationships.ts#interact', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Finance'], impact: 3 }),
  f('Relations/Actions/Donner de l’argent', 'COMPLETE', { src: 'systems/finance.ts#giveMoney', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Finance'], impact: 3 }),
  f('Relations/Actions/Demander de l’argent', 'COMPLETE', { src: 'systems/finance.ts#askForMoney', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'demander', deps: ['Finance'], impact: 3 }),
  f('Relations/Actions/Demander conseil', 'COMPLETE', { src: 'systems/relationships.ts#interact', ui: 'screens/WorkScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'travail', deps: ['Carrière'], impact: 3 }),
  f('Relations/Actions/S’excuser', 'MISSING', { impact: 3, note: 'une dispute ne se répare jamais volontairement' }),
  f('Relations/Actions/Se réconcilier', 'MISSING', { impact: 3 }),
  f('Relations/Actions/Faire une farce', 'MISSING', { impact: 2 }),
  f('Relations/Actions/Partir en voyage ensemble', 'MISSING', { impact: 3, note: 'les vacances existent mais sans compagnon' }),
  f('Relations/Actions/Emprunter et rembourser', 'PARTIAL', { src: 'systems/finance.ts#askForMoney', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, deps: ['Finance/Dette'], impact: 3, note: 'demander existe ; aucune dette envers un proche à rembourser' }),
  f('Relations/Actions/Couper les ponts', 'PARTIAL', { src: 'systems/relationships.ts#advanceRelationships', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations'], impact: 3, note: 'le PNJ peut couper les ponts ; le joueur ne le décide jamais' }),

  /* --- Enfance et parents --- */
  f('Enfance/Activités/Faire quelque chose avec sa famille', 'COMPLETE', { src: 'systems/childhood.ts#doFamilyActivity', ui: 'screens/ChildhoodScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'enfance', deps: ['Vie/Personnalité'], impact: 5 }),
  f('Enfance/Activités/Choisir avec qui', 'COMPLETE', { src: 'systems/childhood.ts#companionsFor', ui: 'screens/ChildhoodScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'enfance', deps: ['Relations/Famille'], impact: 5 }),
  f('Enfance/Activités/L’engagement de l’adulte compte', 'COMPLETE', { src: 'systems/childhood.ts#engagementOf', ui: 'screens/ChildhoodScreen.tsx', npc: 1, cons: 1, test: 'enfance', deps: ['Relations/Famille'], impact: 4 }),
  f('Enfance/Activités/Ça sème des goûts', 'COMPLETE', { internal: 1, src: 'systems/exposure.ts#exposureTo', pers: 1, cons: 1, test: 'enfance', deps: ['Vie/Personnalité', 'Éducation'], impact: 5 }),
  f('Enfance/Activités/Sortir voir les enfants du quartier', 'COMPLETE', { src: 'systems/childhood.ts#meetNeighbourChild', ui: 'screens/ChildhoodScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'enfance', deps: ['Relations/Amis'], impact: 4 }),
  f('Enfance/Demander/Demander un objet', 'COMPLETE', { src: 'systems/asking.ts#askParent', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'demander', deps: ['Relations/Famille'], impact: 4 }),
  f('Enfance/Demander/Demander une permission', 'COMPLETE', { src: 'systems/asking.ts#availableRequests', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'demander', deps: ['Relations/Famille'], impact: 4 }),
  f('Enfance/Demander/Demander de l’argent de poche', 'COMPLETE', { src: 'systems/finance.ts#allowance', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'demander', deps: ['Finance'], impact: 4 }),
  f('Enfance/Demander/Demander un animal', 'COMPLETE', { src: 'systems/asking.ts#availableRequests', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'demander', deps: ['Activités/Animaux'], impact: 3 }),
  f('Enfance/Demander/Négocier une contrepartie', 'COMPLETE', { src: 'systems/asking.ts#settleConditions', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'demander', deps: ['Éducation/Notes'], impact: 5 }),
  f('Enfance/Densité/Événements avant six ans', 'PARTIAL', { src: 'data/events/childhood.ts', ui: 'components/EventModal.tsx', pers: 1, cons: 1, test: 'enfance', deps: ['Événements'], impact: 4, note: 'quatorze événements éligibles avant cinq ans, contre une quarantaine à l’âge adulte' }),

  /* --- Amour --- */
  f('Relations/Amour/Rencontrer quelqu’un', 'COMPLETE', { src: 'systems/relationships.ts#meetRomanticProspect', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations/Amour'], impact: 5 }),
  f('Relations/Amour/Application de rencontre', 'BASIC', { src: 'systems/activities.ts#useDatingApp', ui: 'components/ActivityMenu.tsx', npc: 1, pers: 1, cons: 1, deps: ['Relations/Amour'], impact: 4, note: 'un bouton qui produit un prétendant : ni profils à comparer, ni compatibilité affichée, ni refus' }),
  f('Relations/Amour/Orientation respectée', 'COMPLETE', { internal: 1, src: 'systems/relationships.ts#isRomanticallyCompatible', npc: 1, cons: 1, test: 'life', deps: ['Relations/Amour'], impact: 4 }),
  f('Relations/Amour/Se mettre en couple', 'COMPLETE', { src: 'systems/relationships.ts#startRelationship', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations/Types/Partenaire'], impact: 5 }),
  f('Relations/Amour/Demander en mariage', 'COMPLETE', { src: 'systems/relationships.ts#propose', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Finance'], impact: 5 }),
  f('Relations/Amour/Bague de fiançailles', 'COMPLETE', { src: 'systems/activities.ts#buyEngagementRing', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'life', deps: ['Finance'], impact: 3 }),
  f('Relations/Amour/Se marier', 'COMPLETE', { src: 'systems/relationships.ts#marry', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Finance/Patrimoine'], impact: 5 }),
  f('Relations/Amour/Contrat de mariage', 'COMPLETE', { src: 'systems/relationships.ts#signPrenup', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Finance/Patrimoine'], impact: 4 }),
  f('Relations/Amour/Rompre', 'COMPLETE', { src: 'systems/relationships.ts#breakUp', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations/Types/Ex'], impact: 4 }),
  f('Relations/Amour/Divorcer', 'COMPLETE', { src: 'systems/relationships.ts#divorce', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Finance/Patrimoine'], impact: 5 }),
  f('Relations/Amour/Choisir un avocat de divorce', 'MISSING', { impact: 3, note: 'le partage se calcule seul : aucun avocat, aucune garde à négocier' }),
  f('Relations/Amour/Garde des enfants', 'MISSING', { impact: 4, note: 'un divorce ne décide jamais de qui garde les enfants' }),
  f('Relations/Amour/Mariage : lieu, budget, invités', 'MISSING', { impact: 3, note: 'se marier est instantané et gratuit' }),
  f('Relations/Amour/Rendez-vous galant', 'MISSING', { impact: 4, note: 'aucun rendez-vous : la séduction est une suite de clics sans scène' }),
  f('Relations/Amour/Infidélité', 'PARTIAL', { src: 'data/events/relationships.ts', ui: 'components/EventModal.tsx', npc: 1, pers: 1, cons: 1, deps: ['Relations/Amour'], impact: 3, note: 'des événements de tromperie existent ; le joueur ne peut pas en décider' }),
  f('Relations/Amour/Renouveler ses vœux', 'MISSING', { impact: 1 }),

  /* --- Enfants --- */
  f('Relations/Enfants/Essayer d’avoir un enfant', 'COMPLETE', { src: 'systems/relationships.ts#tryForBaby', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations/Types/Enfants'], impact: 5 }),
  f('Relations/Enfants/Naissance', 'COMPLETE', { src: 'systems/relationships.ts#deliverBaby', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'lignee', deps: ['Héritage/Lignée'], impact: 5 }),
  f('Relations/Enfants/Traitement de fertilité', 'BASIC', { src: 'systems/activities.ts#fertilityTreatment', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Relations/Enfants'], impact: 3, note: 'un bouton, un coût, un bonus permanent' }),
  f('Relations/Enfants/Adopter', 'BASIC', { src: 'systems/activities.ts#adoptChild', ui: 'components/ActivityMenu.tsx', npc: 1, pers: 1, cons: 1, deps: ['Relations/Types/Enfants'], impact: 4, note: 'ni profils, ni dossier, ni délai, ni refus' }),
  f('Relations/Enfants/Élever : discipline et attention', 'COMPLETE', { src: 'systems/upbringing.ts#rear', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'elever', deps: ['Héritage/Lignée'], impact: 5, note: 'six gestes, deux par enfant et par an ; la main donnée agit chaque année et les deux extrêmes sont mesurément pires que la bande du milieu' }),
  f('Relations/Enfants/Payer les études de son enfant', 'COMPLETE', { src: 'data/upbringing.ts#REARINGS', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'elever', deps: ['Finance'], impact: 3, note: 'l’argent compte et perd contre la présence — mesuré sur sept façons d’élever, pas affirmé' }),
  f('Relations/Enfants/Suivre sa scolarité', 'COMPLETE', { src: 'systems/upbringing.ts#advanceUpbringing', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'elever', deps: ['Éducation'], impact: 3, note: 'une moyenne qui suit ce qu’on suit et ce qu’il vaut' }),
  f('Relations/Enfants/L’enfant élevé devient le personnage suivant', 'COMPLETE', { src: 'systems/upbringing.ts#settleChildhood', ui: 'screens/SummaryScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'elever', deps: ['Héritage/Lignée'], impact: 5, note: 'la seule boucle complète du jeu : ce qu’on écrit dans une enfance est ce que `continueAs` reprend' }),
  f('Relations/Enfants/Choisir son école', 'MISSING', { impact: 2, note: 'on paie « ce qu’il faut » sans choisir d’établissement' }),
  f('Relations/Enfants/Coût des enfants', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#familyCost', pers: 1, cons: 1, test: 'life', deps: ['Finance'], impact: 4 }),
];

/* ================================================================== */
/* 4. CARRIÈRE                                                         */
/* ================================================================== */

const CAREER: Feature[] = [
  f('Carrière/Recherche/Marché d’offres persistant', 'COMPLETE', { src: 'systems/careers.ts#applyToJob', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Finance'], impact: 5 }),
  f('Carrière/Recherche/Offres renouvelées chaque année', 'COMPLETE', { src: 'systems/markets.ts#refreshMarkets', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Carrière'], impact: 4 }),
  f('Carrière/Recherche/Conditions d’accès vérifiées', 'COMPLETE', { src: 'systems/careers.ts#offerBlocker', ui: 'screens/OccupationScreen.tsx', cons: 1, test: 'travail', deps: ['Éducation'], impact: 5 }),
  f('Carrière/Recherche/Refus expliqué', 'COMPLETE', { tooling: 1, src: 'systems/careers.ts#offerBlocker', ui: 'screens/OccupationScreen.tsx', test: 'travail', deps: ['Carrière'], impact: 4 }),
  f('Carrière/Recherche/Temps partiel', 'PARTIAL', { src: 'systems/workplace.ts#setHours', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Travail/Temps'], impact: 3, note: 'on réduit ses heures dans un poste ; aucune offre à temps partiel dédiée' }),
  f('Carrière/Recherche/Petits boulots adolescents', 'PARTIAL', { src: 'data/jobs.ts', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Éducation'], impact: 3, note: 'les métiers existent dès quatorze ans mais rien n’arbitre école contre travail' }),
  f('Carrière/Entretien/Entretien jouable', 'MISSING', { impact: 4, note: 'l’embauche est un tirage : l’entretien n’existe pas comme moment' }),
  f('Carrière/Poste/Salaire, heures, performance', 'COMPLETE', { src: 'systems/workplace.ts#setHours', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Finance', 'Santé'], impact: 5 }),
  f('Carrière/Poste/Implication choisie', 'COMPLETE', { src: 'systems/careers.ts#setWorkEffort', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Carrière/Promotion'], impact: 4 }),
  f('Carrière/Poste/Satisfaction distincte de la performance', 'COMPLETE', { src: 'systems/workplace.ts#computeSatisfaction', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Carrière/Sortie'], impact: 4 }),
  f('Carrière/Poste/Congés', 'COMPLETE', { src: 'systems/workplace.ts#takeLeave', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Vie/Attributs/Stress'], impact: 3 }),
  f('Carrière/Poste/Changer d’horaires', 'COMPLETE', { src: 'systems/workplace.ts#setHours', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Travail/Temps'], impact: 3 }),
  f('Carrière/Poste/Demander une mutation', 'COMPLETE', { src: 'systems/workplace.ts#requestTransfer', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Vie/Environnement'], impact: 3 }),
  f('Carrière/Équipe/Collègues, rivaux, mentor', 'COMPLETE', { src: 'systems/workplace.ts#buildTeam', ui: 'screens/WorkScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'travail', deps: ['Relations'], impact: 5 }),
  f('Carrière/Équipe/Actions de bureau', 'COMPLETE', { src: 'systems/workplace.ts#workAction', ui: 'screens/WorkScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'travail', deps: ['Carrière/Promotion'], impact: 5 }),
  f('Carrière/Équipe/Le soutien pèse sur la carrière', 'COMPLETE', { internal: 1, src: 'systems/workplace.ts#workplaceSupport', ui: 'screens/WorkScreen.tsx', npc: 1, cons: 1, test: 'travail', deps: ['Carrière/Promotion'], impact: 5 }),
  f('Carrière/Promotion/Demander une augmentation', 'COMPLETE', { src: 'systems/careers.ts#askForRaise', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Finance'], impact: 4 }),
  f('Carrière/Promotion/Demander une promotion', 'COMPLETE', { src: 'systems/workplace.ts#askPromotion', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Carrière'], impact: 4 }),
  f('Carrière/Promotion/Échelle hiérarchique complète', 'COMPLETE', { src: 'systems/careers.ts#promote', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Finance'], impact: 5 }),
  f('Carrière/Promotion/Rétrogradation', 'COMPLETE', { internal: 1, src: 'systems/careers.ts#demote', pers: 1, cons: 1, test: 'travail', deps: ['Finance'], impact: 3 }),
  f('Carrière/Sortie/Démissionner', 'COMPLETE', { src: 'systems/careers.ts#quitJob', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Finance'], impact: 4 }),
  f('Carrière/Sortie/Avertissements au dossier', 'COMPLETE', { src: 'systems/workplace.ts#advanceWorkplace', ui: 'screens/WorkScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Carrière/Sortie'], impact: 4 }),
  f('Carrière/Sortie/Licenciement', 'COMPLETE', { internal: 1, src: 'systems/careers.ts#fire', pers: 1, cons: 1, test: 'travail', deps: ['Finance'], impact: 4 }),
  f('Carrière/Sortie/Contester un licenciement', 'MISSING', { impact: 3, note: 'aucun entretien préalable, aucun recours, aucune seconde chance' }),
  f('Carrière/Retraite/Liquider sa pension', 'COMPLETE', { src: 'systems/careers.ts#retire', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Finance'], impact: 4 }),
  f('Carrière/Retraite/Pension calculée sur la carrière', 'COMPLETE', { internal: 1, src: 'systems/careers.ts#retire', pers: 1, cons: 1, test: 'travail', deps: ['Finance'], impact: 4 }),
  f('Carrière/Retraite/Vie de retraité', 'PARTIAL', { src: 'data/events/misc.ts', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Activités'], impact: 3, note: 'des événements de senior existent ; aucune activité propre à la retraite' }),
  f('Carrière/Cumul/Deuxième employeur', 'MISSING', { impact: 3, note: 'un seul contrat de travail à la fois' }),
  f('Carrière/Cumul/Budget de temps partagé', 'COMPLETE', { src: 'systems/venture.ts#timeBudget', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Travail/Indépendant'], impact: 4 }),
  f('Carrière/Historique/Parcours conservé', 'COMPLETE', { src: 'engine/types.ts#Player', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'travail', deps: ['Héritage'], impact: 3 }),
  f('Carrière/Collection/Registre des métiers exercés', 'MISSING', { impact: 3, note: 'aucune collection de carrières : exercer trente métiers ne laisse aucune trace' }),
  f('Carrière/Événements/Banque d’événements professionnels', 'PARTIAL', { src: 'data/events/adult.ts', ui: 'components/EventModal.tsx', pers: 1, cons: 1, deps: ['Événements'], impact: 3, note: 'une dizaine d’événements de travail pour quarante ans de carrière' }),

  /* --- Indépendant et entreprise --- */
  f('Travail/Indépendant/Vingt métiers à son compte', 'COMPLETE', { src: 'systems/venture.ts#startFreelance', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance', 'Notoriété'], impact: 5 }),
  f('Travail/Indépendant/Fixer son tarif', 'COMPLETE', { src: 'systems/venture.ts#setFee', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance'], impact: 5 }),
  f('Travail/Indépendant/Clientèle qui se construit et s’érode', 'COMPLETE', { src: 'systems/venture.ts#expectedMissions', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance'], impact: 5 }),
  f('Travail/Indépendant/Commandes nommées à prendre ou laisser', 'COMPLETE', { src: 'systems/venture.ts#takeGig', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance', 'Vie/Attributs/Réputation'], impact: 5 }),
  f('Travail/Indépendant/Litiges et impayés', 'COMPLETE', { internal: 1, src: 'systems/venture.ts#advanceVentures', pers: 1, cons: 1, test: 'independant', deps: ['Vie/Attributs/Réputation'], impact: 3 }),
  f('Travail/Temps/Le temps est fini', 'COMPLETE', { tooling: 1, src: 'systems/venture.ts#timeBudget', ui: 'screens/VentureScreen.tsx', cons: 1, test: 'independant', deps: ['Carrière', 'Éducation'], impact: 4 }),

  f('Entreprise/Création/Dix-huit modèles', 'COMPLETE', { src: 'systems/venture.ts#foundBusiness', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance/Dette'], impact: 5 }),
  f('Entreprise/Création/Apport et emprunt professionnel', 'COMPLETE', { tooling: 1, src: 'systems/venture.ts#borrowable', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance/Dette'], impact: 4 }),
  f('Entreprise/Gestion/Arbitrer capacité et demande', 'COMPLETE', { src: 'systems/venture.ts#forecast', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance'], impact: 5 }),
  f('Entreprise/Gestion/Embaucher et licencier', 'COMPLETE', { src: 'systems/venture.ts#hireStaff', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance', 'Vie/Attributs/Karma'], impact: 4 }),
  f('Entreprise/Gestion/Politique de prix', 'COMPLETE', { src: 'systems/venture.ts#setPricing', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Entreprise/Gestion'], impact: 4 }),
  f('Entreprise/Gestion/Présence du patron', 'COMPLETE', { src: 'systems/venture.ts#setInvolvement', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Travail/Temps'], impact: 4 }),
  f('Entreprise/Gestion/Investir en qualité ou en notoriété', 'COMPLETE', { src: 'systems/venture.ts#investInBusiness', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Entreprise/Gestion'], impact: 4 }),
  f('Entreprise/Gestion/Trésorerie propre et prélèvements', 'COMPLETE', { src: 'systems/venture.ts#drawFromBusiness', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance/Fiscalité'], impact: 4 }),
  f('Entreprise/Gestion/Gérant salarié', 'COMPLETE', { src: 'systems/venture.ts#hireManager', ui: 'screens/VentureScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'independant', deps: ['Relations'], impact: 4 }),
  f('Entreprise/Sortie/Repreneurs et clauses', 'COMPLETE', { src: 'systems/venture.ts#listBusiness', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance'], impact: 4 }),
  f('Entreprise/Sortie/Dépôt de bilan et caution personnelle', 'COMPLETE', { src: 'systems/venture.ts#closeBusiness', ui: 'screens/VentureScreen.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Finance/Dette'], impact: 4 }),
  f('Entreprise/Produit/Un produit avec qualité et demande propres', 'MISSING', { impact: 3, note: 'l’entreprise vend « du chiffre » : aucun produit nommé, aucun lancement' }),
  f('Entreprise/Employés/Salariés comme PNJ', 'MISSING', { impact: 3, note: 'l’effectif est un nombre ; seul le gérant est une personne' }),
  f('Entreprise/Événements/Fournisseur, concurrent, conflit social', 'COMPLETE', { src: 'data/events/venture.ts', ui: 'components/EventModal.tsx', pers: 1, cons: 1, test: 'independant', deps: ['Événements'], impact: 4 }),
];

/* ================================================================== */
/* 5. CARRIÈRES SPÉCIALES                                              */
/* ================================================================== */

const SPECIAL: Feature[] = [
  /* --- Le cadre commun aux cinq métiers de scène --- */
  f('Carrières spéciales/Scène/Choisir une discipline', 'COMPLETE', { src: 'systems/stage.ts#startDiscipline', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, deps: ['Carrière'], impact: 4, note: 'cinq métiers, un seul cadre : on ne postule pas, on est appelé' }),
  f('Carrières spéciales/Scène/Métier acquis', 'COMPLETE', { src: 'systems/stage.ts#craftLabel', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 4, note: 'c’est lui qui décide de ce qu’on vous propose ; il se perd quand on ne travaille pas' }),
  f('Carrières spéciales/Scène/Propositions filtrées par le niveau', 'COMPLETE', { src: 'systems/stage.ts#rollOffers', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 5, note: 'on ne voit pas ce qu’on ne mérite pas, ni ce qu’on a dépassé' }),
  f('Carrières spéciales/Scène/Accepter ou refuser', 'COMPLETE', { src: 'systems/stage.ts#acceptOffer', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 4, note: 'refuser n’est pas gratuit ; deux engagements par an au plus' }),
  f('Carrières spéciales/Scène/Accueil du public', 'COMPLETE', { src: 'systems/stage.ts#settleJob', ui: 'screens/StageScreen.tsx', test: 'scene', ev: 1, cons: 1, pers: 1, impact: 5, note: 'décide du cachet, du métier gagné, du nom et de ce qu’on proposera ensuite' }),
  f('Carrières spéciales/Scène/Prendre plus grand que soi', 'COMPLETE', { src: 'systems/stage.ts#settleJob', ui: 'screens/StageScreen.tsx', test: 'scene', cons: 1, impact: 4, note: 'l’enjeu module l’accueil : réussir un rôle facile n’impressionne personne' }),
  f('Carrières spéciales/Scène/Tenir devant un public', 'INTERACTIVE', { src: 'systems/stage.ts#performanceContext', ui: 'screens/StageScreen.tsx', mg: 'performance', test: 'scene', cons: 1, pers: 1, impact: 5, note: 'suivre une ligne, tenir les moments ; ne rien tenter est le pire résultat' }),
  f('Carrières spéciales/Scène/Résolution sans jouer', 'COMPLETE', { src: 'systems/stage.ts#autoPerform', ui: 'screens/StageScreen.tsx', test: 'scene', cons: 1, impact: 3, note: 'même chemin de conséquences, jamais plus favorable que bien jouer' }),
  f('Carrières spéciales/Scène/Fatigue et usure', 'COMPLETE', { src: 'systems/stage.ts#advanceStage', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 3, note: 'retranche à la prestation, se récupère lentement' }),
  f('Carrières spéciales/Scène/Déclin par l’âge', 'COMPLETE', { src: 'systems/stage.ts#ageFactor', ui: 'screens/StageScreen.tsx', test: 'scene', cons: 1, impact: 4, note: 'pente propre à chaque métier : brutale au sport, nulle en politique' }),
  f('Carrières spéciales/Scène/Engagement non honoré', 'COMPLETE', { src: 'systems/stage.ts#advanceStage', ui: 'screens/StageScreen.tsx', test: 'scene', cons: 1, impact: 3, note: 'se solde tout seul à la fin de l’année, et mal' }),
  f('Carrières spéciales/Scène/Changer de voie', 'COMPLETE', { src: 'systems/stage.ts#quitDiscipline', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 3, note: 'ce qu’on savait faire ailleurs compte un peu, jamais entièrement' }),
  f('Carrières spéciales/Scène/Cachets imposés', 'COMPLETE', { src: 'systems/stage.ts#stageEarnings', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, deps: ['Finance/Fiscalité'], impact: 3, note: 'crédités à la signature, imposés au bilan, jamais encaissés deux fois' }),
  f('Carrières spéciales/Scène/Ceux avec qui on exerce', 'COMPLETE', { src: 'systems/stage.ts#crewQuality', ui: 'screens/StageScreen.tsx', test: 'scene', npc: 1, pers: 1, cons: 1, impact: 4, note: 'un seul entourage pour les cinq métiers, avec un poids propre à chacun' }),
  f('Carrières spéciales/Scène/Entente du groupe', 'COMPLETE', { src: 'systems/stage.ts#rehearse', ui: 'screens/StageScreen.tsx', test: 'scene', npc: 1, pers: 1, cons: 1, impact: 3, note: 'on ne garde pas les gens en les recrutant ; cinq très bons qui se détestent jouent moins bien que trois qui s’écoutent' }),
  f('Carrières spéciales/Scène/Départs et débauchages', 'COMPLETE', { src: 'systems/stage.ts#advanceStage', ui: 'screens/StageScreen.tsx', test: 'scene', ev: 1, npc: 1, cons: 1, impact: 3, note: 'on perd celui qu’on ne fait pas jouer et on use celui qu’on ne fait pas travailler' }),
  f('Carrières spéciales/Scène/Ce que l’entourage prend', 'COMPLETE', { src: 'systems/stage.ts#crewCut', ui: 'screens/StageScreen.tsx', test: 'scene', cons: 1, impact: 3, note: 'un grand groupe joue mieux et laisse moins' }),
  f('Carrières spéciales/Scène/Sur scène depuis le Parcours', 'COMPLETE', { src: 'systems/stage.ts#stageOf', ui: 'screens/OccupationScreen.tsx', test: 'scene', cons: 1, impact: 2, note: 'la carrière est visible depuis l’écran principal, pas cachée dans un menu' }),

  /* --- Ce que chaque métier apporte en propre --- */
  f('Carrières spéciales/Acteur/Le métier', 'COMPLETE', { src: 'data/stage.ts#DISCIPLINES', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 2, note: 'le poste salarié « Comédien » a quitté la grille : le métier est la carrière jouée, et il n’existe plus en double' }),
  f('Carrières spéciales/Acteur/Auditions', 'INTERACTIVE', { src: 'systems/casting.ts#askTryout', ui: 'screens/StageScreen.tsx', mg: 'performance', test: 'essai', pers: 1, cons: 1, impact: 4, note: 'une deuxième liste : ce pour quoi on peut essayer, jusqu’à trente points au-dessus de soi. L’essai se joue, il est court, et l’on peut rentrer les mains vides' }),
  f('Carrières spéciales/Acteur/Manière de jouer l’essai', 'COMPLETE', { src: 'data/casting.ts#APPROACHES', ui: 'screens/StageScreen.tsx', test: 'essai', pers: 1, cons: 1, impact: 3, note: 'jouer ce qu’on attend passe souvent et ne mène nulle part ; jouer contre son type passe rarement et change une carrière' }),
  f('Carrières spéciales/Acteur/Rôles à choisir', 'COMPLETE', { src: 'data/stage.ts#JOB_TEMPLATES', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 4, note: 'neuf rôles, de la figuration au premier rôle ; le mieux payé n’est pas le plus utile' }),
  f('Carrières spéciales/Acteur/Agent', 'COMPLETE', { src: 'systems/stage.ts#hireAgent', ui: 'screens/StageScreen.tsx', test: 'scene', npc: 1, pers: 1, cons: 1, impact: 3, note: 'un vrai PNJ : plus de propositions, mieux payées, quinze pour cent de tout' }),
  f('Carrières spéciales/Acteur/Progression du talent', 'COMPLETE', { src: 'systems/stage.ts#settleJob', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 3, note: 'on progresse d’autant plus qu’on s’est étiré' }),
  f('Carrières spéciales/Acteur/Récompenses', 'COMPLETE', { src: 'data/stage.ts#ACCOLADES', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 3, note: 'trois prix, chacun avec ses conditions ; jamais deux fois' }),
  f('Carrières spéciales/Acteur/Mini-jeu de jeu d’acteur', 'INTERACTIVE', { src: 'systems/minigames/performance.ts#performance', ui: 'screens/StageScreen.tsx', mg: 'performance', test: 'scene', cons: 1, impact: 4, note: 'suivre l’émotion, tenir les répliques ; le jeu est commun aux cinq métiers' }),
  f('Carrières spéciales/Musique/Le métier', 'COMPLETE', { src: 'data/stage.ts#DISCIPLINES', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 2, note: 'le poste salarié « Musicien » a quitté la grille : plus de carrière fantôme payée au mois à côté de celle qu’on joue' }),
  f('Carrières spéciales/Musique/Apprendre un instrument', 'COMPLETE', { src: 'systems/stage.ts#craftLabel', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 3, note: 'l’instrument est le métier acquis : il monte en jouant, il se perd sans' }),
  f('Carrières spéciales/Musique/Groupe et compagnons', 'COMPLETE', { src: 'systems/stage.ts#crewOf', ui: 'screens/StageScreen.tsx', test: 'scene', npc: 1, pers: 1, cons: 1, impact: 4, note: 'auditions, répétitions et départs ; un groupe qui joue mal tire la prestation vers le bas' }),
  f('Carrières spéciales/Musique/Maison de disques', 'COMPLETE', { src: 'data/records.ts#LABELS', ui: 'screens/RecordsScreen.tsx', test: 'disque', pers: 1, cons: 1, impact: 3, note: 'quatre niveaux ; elle avance, elle pousse, elle prend sa part et elle impose le format — plus elle est grande, moins on choisit' }),
  f('Carrières spéciales/Musique/Sortir un titre ou un album', 'COMPLETE', { src: 'systems/records.ts#startRecording', ui: 'screens/RecordsScreen.tsx', test: 'disque', pers: 1, cons: 1, impact: 4, note: 'six formats, un classement qui monte puis retombe à la vitesse du format, et des droits qui tombent chaque année tant qu’on est classé' }),
  f('Carrières spéciales/Musique/Droits et revenus du catalogue', 'COMPLETE', { src: 'systems/records.ts#royaltyFor', ui: 'screens/RecordsScreen.tsx', test: 'disque', pers: 1, cons: 1, deps: ['Finance'], impact: 3, note: 'le premier revenu d’une carrière de scène qui tombe sans qu’on travaille ; la première place vaut plusieurs fois la dixième' }),
  f('Carrières spéciales/Musique/Tournée', 'COMPLETE', { src: 'systems/records.ts#hitTheRoad', ui: 'screens/RecordsScreen.tsx', test: 'disque', pers: 1, cons: 1, impact: 4, note: 'on pose ses dates salle par salle ; réserver plus grand paie si le public suit et coûte la salle vide sinon, et trop de dates finissent par sauter' }),
  f('Carrières spéciales/Musique/Mini-jeu de rythme', 'INTERACTIVE', { src: 'systems/minigames/performance.ts#performance', ui: 'screens/StageScreen.tsx', mg: 'performance', test: 'scene', cons: 1, impact: 4, note: 'suivre la note, tenir les envolées ; pas un jeu de rythme propre à la musique' }),
  f('Carrières spéciales/Sport/Le métier', 'COMPLETE', { src: 'data/stage.ts#DISCIPLINES', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 2, note: 'le poste salarié « Sportif professionnel » a quitté la grille : la filière scolaire mène à la carrière jouée, pas à une fiche de paie' }),
  f('Carrières spéciales/Sport/Filière scolaire vers le professionnel', 'COMPLETE', { src: 'systems/schoolSport.ts#sportHeadStart', ui: 'screens/SchoolScreen.tsx', test: 'sportScolaire', pers: 1, cons: 1, deps: ['Éducation/Sport'], impact: 4, note: 'dix ans de lycée démarrent la carrière ailleurs qu’à zéro : c’est le raccord qui manquait' }),
  f('Carrières spéciales/Sport/Équipe, entraîneur, coéquipiers', 'COMPLETE', { src: 'systems/stage.ts#hireCoach', ui: 'screens/StageScreen.tsx', test: 'scene', npc: 1, pers: 1, cons: 1, impact: 4, note: 'de vrais coéquipiers et un entraîneur ; c’est au sport qu’ils pèsent le plus' }),
  f('Carrières spéciales/Sport/Contrats pluriannuels', 'COMPLETE', { src: 'systems/stage.ts#signContract', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 3, note: 'la sécurité contre la liberté : garanti chaque année, et interdit de prendre mieux ailleurs' }),
  f('Carrières spéciales/Sport/Blessures', 'COMPLETE', { src: 'systems/stage.ts#settleJob', ui: 'screens/StageScreen.tsx', test: 'scene', ev: 1, pers: 1, cons: 1, impact: 3, note: 'propre au sport, liée à l’usure ; écarte plusieurs années et coûte de la santé' }),
  f('Carrières spéciales/Sport/Titres et récompenses', 'COMPLETE', { src: 'data/stage.ts#ACCOLADES', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 3 }),
  f('Carrières spéciales/Sport/Mini-jeux sportifs', 'PARTIAL', { src: 'systems/minigames/performance.ts#performance', ui: 'screens/StageScreen.tsx', mg: 'performance', test: 'scene', cons: 1, impact: 4, note: 'une épreuve jouable, mais la même pour tous les sports' }),
  f('Carrières spéciales/Politique/Le métier', 'COMPLETE', { src: 'data/stage.ts#DISCIPLINES', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 2, note: 'le poste salarié « Politique » a quitté la grille : on ne devient pas maire en postulant, on se présente' }),
  f('Carrières spéciales/Politique/Campagne électorale', 'COMPLETE', { src: 'systems/politics.ts#declareRun', ui: 'screens/CampaignScreen.tsx', test: 'tribune', npc: 1, pers: 1, cons: 1, impact: 4, note: 'cinq sièges, six coups à jouer, un programme de trois axes au plus et un adversaire nommé' }),
  f('Carrières spéciales/Politique/Programme et promesses', 'COMPLETE', { src: 'data/politics.ts#PLANKS', ui: 'screens/CampaignScreen.tsx', test: 'tribune', pers: 1, cons: 1, impact: 4, note: 'aucun axe ne plaît à tout le monde, et deux axes peuvent se contredire — ceux qui lisent le programme le remarquent' }),
  f('Carrières spéciales/Politique/Budget de campagne', 'COMPLETE', { src: 'data/politics.ts#FUNDING', ui: 'screens/CampaignScreen.tsx', test: 'tribune', pers: 1, cons: 1, deps: ['Finance'], impact: 3, note: 'collecte, gros donateurs, fortune personnelle ; l’argent facile se paie en casseroles pendant le mandat' }),
  f('Carrières spéciales/Politique/Sondages et adversaire', 'COMPLETE', { src: 'data/politics.ts#BLOCS', ui: 'screens/CampaignScreen.tsx', test: 'tribune', npc: 1, pers: 1, cons: 1, impact: 3, note: 'six blocs qui pèsent leur taille fois leur participation ; l’adversaire est un PNJ qui fait sa propre campagne' }),
  f('Carrières spéciales/Politique/Débat télévisé', 'INTERACTIVE', { src: 'systems/politics.ts#settleDebate', ui: 'screens/CampaignScreen.tsx', mg: 'performance', test: 'tribune', cons: 1, impact: 3, note: 'le seul coup qui dépende du joueur et non de sa caisse ; il déplace dans les deux sens' }),
  f('Carrières spéciales/Politique/Exercer le mandat', 'COMPLETE', { src: 'data/politics.ts#DECISIONS', ui: 'screens/CampaignScreen.tsx', test: 'tribune', pers: 1, cons: 1, impact: 4, note: 'une décision par an, et aucune option ne contente tout le monde — un test le vérifie sur tout le catalogue' }),
  f('Carrières spéciales/Politique/Réélection et scandales', 'COMPLETE', { src: 'systems/politics.ts#holdElection', ui: 'screens/CampaignScreen.tsx', test: 'tribune', pers: 1, cons: 1, deps: ['Notoriété'], impact: 3, note: 'un vrai scrutin, et l’opinion laissée par le mandat en est le point de départ ; une affaire peut sortir avant le vote' }),
  f('Carrières spéciales/Mannequin/Le métier', 'COMPLETE', { src: 'data/stage.ts#DISCIPLINES', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 2, note: 'le poste salarié « Mannequin » a quitté la grille : les contrats se prennent un par un, pas au mois' }),
  f('Carrières spéciales/Mannequin/Agence et book', 'COMPLETE', { src: 'systems/casting.ts#bookStrength', ui: 'screens/StageScreen.tsx', test: 'essai', npc: 1, pers: 1, cons: 1, impact: 3, note: 'un book qui vaut par sa variété et non son épaisseur, qui vieillit, et sans lequel aucune agence ne vous reçoit' }),
  f('Carrières spéciales/Mannequin/Castings et défilés', 'COMPLETE', { src: 'data/stage.ts#JOB_TEMPLATES', ui: 'screens/StageScreen.tsx', test: 'scene', pers: 1, cons: 1, impact: 3, note: 'six contrats, du catalogue à l’égérie, sur une carrière volontairement courte' }),
  f('Carrières spéciales/Mannequin/Mini-jeu de pose', 'INTERACTIVE', { src: 'systems/minigames/performance.ts#performance', ui: 'screens/StageScreen.tsx', mg: 'performance', test: 'scene', cons: 1, impact: 3, note: 'tenir la ligne du corps, tenir les passages' }),
  f('Carrières spéciales/Astronaute/Sélection et formation', 'COMPLETE', { src: 'systems/service.ts#enlist', ui: 'screens/ServiceScreen.tsx', test: 'service', pers: 1, cons: 1, deps: ['Éducation/Supérieur'], impact: 3, note: 'diplôme, condition physique et casier vide ; trois ans d’entraînement avant qu’on ne confie quoi que ce soit' }),
  f('Carrières spéciales/Astronaute/Missions', 'COMPLETE', { src: 'data/service.ts#DUTIES', ui: 'screens/ServiceScreen.tsx', test: 'service', pers: 1, cons: 1, impact: 3, note: 'huit affectations, du simulateur à la mission lointaine ; certaines durent des années et l’on peut ne pas revenir' }),
  f('Carrières spéciales/Astronaute/Mini-jeux de mission', 'INTERACTIVE', { src: 'systems/minigames/docking.ts#docking', ui: 'screens/ServiceScreen.tsx', mg: 'docking', test: 'service', cons: 1, impact: 3, note: 'un problème d’inertie : on pousse, la machine continue, et il faut arriver aligné et lent' }),
  f('Carrières spéciales/Agent secret/Agence fictive', 'COMPLETE', { src: 'data/service.ts#CORPS', ui: 'screens/ServiceScreen.tsx', test: 'service', pers: 1, cons: 1, impact: 3, note: 'une maison sans nom réel, où l’on ne postule pas : elle approche qui a déjà le profil, et donne une couverture' }),
  f('Carrières spéciales/Agent secret/Missions', 'COMPLETE', { src: 'data/service.ts#DUTIES', ui: 'screens/ServiceScreen.tsx', test: 'service', pers: 1, cons: 1, impact: 3, note: 'huit opérations entièrement fictives, sans lieu ni méthode ; c’est le métier le plus dangereux des trois' }),
  f('Carrières spéciales/Agent secret/Mini-jeux d’infiltration', 'INTERACTIVE', { src: 'systems/minigames/infiltration.ts#infiltration', ui: 'screens/ServiceScreen.tsx', mg: 'infiltration', test: 'service', cons: 1, impact: 3, note: 'une jauge d’attention et des passages : attendre son moment ou pousser. Abstrait de bout en bout, rien d’applicable' }),
  f('Carrières spéciales/Militaire/Engagement', 'COMPLETE', { src: 'systems/service.ts#enlist', ui: 'screens/ServiceScreen.tsx', test: 'service', pers: 1, cons: 1, deps: ['Carrière'], impact: 3, note: 'une sélection qu’on peut rater, des classes, et une solde réduite tant qu’elles durent' }),
  f('Carrières spéciales/Militaire/Grades et avancement', 'COMPLETE', { src: 'data/service.ts#RANKS', ui: 'screens/ServiceScreen.tsx', test: 'service', pers: 1, cons: 1, impact: 3, note: 'sept échelons ; il faut la réputation *et* l’ancienneté, et l’on ne monte que d’un par an' }),
  f('Carrières spéciales/Militaire/Déploiements', 'COMPLETE', { src: 'systems/service.ts#rollDuties', ui: 'screens/ServiceScreen.tsx', test: 'service', pers: 1, cons: 1, impact: 4, note: 'ce qu’on vous propose dépend du grade et de la préparation ; décliner coûte de la réputation' }),
  f('Carrières spéciales/Militaire/Blessures et pertes', 'COMPLETE', { src: 'systems/service.ts#settleDuty', ui: 'screens/ServiceScreen.tsx', test: 'service', ev: 1, pers: 1, cons: 1, deps: ['Santé'], impact: 4, note: 'une mission peut écarter plusieurs années ou tuer ; bien la mener réduit ce qu’elle coûte' }),
  f('Carrières spéciales/Militaire/Décorations', 'COMPLETE', { src: 'data/service.ts#DECORATIONS', ui: 'screens/ServiceScreen.tsx', test: 'service', pers: 1, cons: 1, impact: 2, note: 'quatre par maison ; certaines ne se donnent qu’aux blessés' }),
  f('Carrières spéciales/Militaire/Fin de service et pension', 'COMPLETE', { src: 'systems/service.ts#leaveService', ui: 'screens/ServiceScreen.tsx', test: 'service', pers: 1, cons: 1, deps: ['Carrière/Retraite'], impact: 3, note: 'honneurs, fin de contrat ou réforme ; le dossier et la pension survivent à la sortie' }),
  f('Carrières spéciales/Médecine/Cursus long', 'COMPLETE', { src: 'data/degrees.ts', ui: 'screens/OccupationScreen.tsx', pers: 1, cons: 1, test: 'ecole', deps: ['Carrière'], impact: 4 }),
  f('Carrières spéciales/Course automobile/Écurie et championnat', 'MISSING', { impact: 2 }),
  f('Carrières spéciales/Zoo/Gérer un parc animalier', 'MISSING', { impact: 2 }),
  f('Carrières spéciales/Casino/Exploiter un casino', 'MISSING', { impact: 2 }),
  f('Carrières spéciales/Royauté/Naître dans une maison régnante', 'COMPLETE', { src: 'systems/royalty.ts#maybeBornRoyal', ui: 'screens/CrownScreen.tsx', test: 'couronne', pers: 1, cons: 1, deps: ['Vie/Création'], impact: 3, note: 'rare et tiré de la graine seule ; jamais directement sur le trône' }),
  f('Carrières spéciales/Royauté/Entrer par le mariage', 'COMPLETE', { src: 'systems/royalty.ts#seekPresentation', ui: 'screens/CrownScreen.tsx', test: 'couronne', npc: 1, pers: 1, cons: 1, deps: ['Relations/Amour'], impact: 3, note: 'une présentation crée un PNJ ; le reste est un mariage ordinaire, et un conjoint n’a jamais de place dans l’ordre' }),
  f('Carrières spéciales/Royauté/Être anobli pour services rendus', 'COMPLETE', { src: 'systems/royalty.ts#ennoble', ui: 'screens/CrownScreen.tsx', test: 'couronne', pers: 1, cons: 1, deps: ['Carrières spéciales/Militaire', 'Carrière'], impact: 3, note: 'six services possibles, trois exigés ; la fortune seule n’ouvre rien' }),
  f('Carrières spéciales/Royauté/Titres et rangs', 'COMPLETE', { src: 'data/royalty.ts#TITLES', ui: 'screens/CrownScreen.tsx', test: 'couronne', cons: 1, impact: 3, note: 'cinq rangs fictifs ; la rente, le devoir attendu et l’exposition montent ensemble' }),
  f('Carrières spéciales/Royauté/Ordre de succession', 'COMPLETE', { src: 'systems/royalty.ts#succession', ui: 'screens/CrownScreen.tsx', test: 'couronne', cons: 1, deps: ['Héritage/Lignée'], impact: 4, note: 'aucune action ne fait monter d’une place ; la file se vide par les morts et se remplit par les naissances' }),
  f('Carrières spéciales/Royauté/Accession au trône', 'COMPLETE', { src: 'systems/royalty.ts#advanceRoyalty', ui: 'screens/CrownScreen.tsx', test: 'couronne', ev: 1, pers: 1, cons: 1, impact: 4 }),
  f('Carrières spéciales/Royauté/Devoirs et engagements', 'COMPLETE', { src: 'data/royalty.ts#DUTIES', ui: 'screens/CrownScreen.tsx', test: 'couronne', pers: 1, cons: 1, impact: 4, note: 'huit engagements, cinq aptitudes distinctes, et un quota annuel que le rang fixe' }),
  f('Carrières spéciales/Royauté/Le bain de foule', 'COMPLETE', { src: 'systems/minigames/walkabout.ts#walkabout', ui: 'screens/CrownScreen.tsx', test: 'couronne', mg: 'walkabout', cons: 1, impact: 4, note: 'l’allure et le choix de qui l’on fait attendre ; il faut arriver au bout' }),
  f('Carrières spéciales/Royauté/Opinion sur soi et sur la couronne', 'COMPLETE', { src: 'systems/royalty.ts#advanceRoyalty', ui: 'screens/CrownScreen.tsx', test: 'couronne', cons: 1, impact: 4, note: 'deux jauges jamais confondues ; la lente décide de la survie de l’institution' }),
  f('Carrières spéciales/Royauté/Affaires à trancher', 'COMPLETE', { src: 'data/royalty.ts#AFFAIRS', ui: 'screens/CrownScreen.tsx', test: 'couronne', ev: 1, pers: 1, cons: 1, impact: 4, note: 'sept affaires ; aucune option sans perdant, et le silence coûte' }),
  f('Carrières spéciales/Royauté/Scandales et retrait du rang', 'COMPLETE', { src: 'systems/royalty.ts#disgrace', ui: 'screens/CrownScreen.tsx', test: 'couronne', cons: 1, deps: ['Notoriété', 'Justice'], impact: 3, note: 'le poids récent des affaires, pas leur nombre ; une maison protège qui la sert' }),
  f('Carrières spéciales/Royauté/Abdication', 'COMPLETE', { src: 'systems/royalty.ts#abdicate', ui: 'screens/CrownScreen.tsx', test: 'couronne', pers: 1, cons: 1, impact: 3, note: 'on sort de la file définitivement et l’on descend de deux rangs' }),
  f('Carrières spéciales/Royauté/Abolition de la couronne', 'COMPLETE', { src: 'systems/royalty.ts#advanceRoyalty', ui: 'screens/CrownScreen.tsx', test: 'couronne', ev: 1, cons: 1, impact: 3, note: 'quatre années consécutives sous le seuil ; personne ne la retrouve' }),
  f('Carrières spéciales/Royauté/Transmission du rang à l’héritier', 'COMPLETE', { src: 'systems/royalty.ts#inheritCrown', ui: 'screens/SummaryScreen.tsx', test: 'couronne', cons: 1, deps: ['Héritage/Lignée'], impact: 4, note: 'la seule chose du jeu qui se transmette en montant ; un titre d’anobli s’éteint en trois générations' }),
  f('Carrières spéciales/Royauté/Cour et vie de palais', 'MISSING', { impact: 2, note: 'aucune intrigue interne : la maison n’a pas de factions ni de rivalités nommées' }),
  f('Carrières spéciales/Royauté/Diplomatie entre maisons', 'MISSING', { impact: 2, note: 'les visites au-dehors sont un engagement, pas une relation suivie avec une autre maison' }),
  f('Carrières spéciales/Communauté/Fonder un mouvement', 'MISSING', { impact: 2 }),
];

/* ================================================================== */
/* 6. ACTIVITÉS                                                        */
/* ================================================================== */

const ACTIVITIES: Feature[] = [
  f('Activités/Corps/Faire du sport', 'COMPLETE', { src: 'systems/activities.ts#doSport', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Santé'], impact: 4 }),
  f('Activités/Corps/L’accès dépend du quartier', 'COMPLETE', { tooling: 1, src: 'systems/activities.ts#sportAvailable', ui: 'components/ActivityMenu.tsx', cons: 1, test: 'environnement', deps: ['Vie/Environnement'], impact: 4 }),
  f('Activités/Corps/Bien-être et détente', 'COMPLETE', { src: 'systems/activities.ts#doWellness', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Vie/Attributs/Stress'], impact: 3 }),
  f('Activités/Corps/Méditation', 'PARTIAL', { src: 'data/activities.ts', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Vie/Attributs/Stress'], impact: 2, note: 'une entrée du catalogue bien-être, sans progression propre' }),
  f('Activités/Corps/Régime alimentaire', 'MISSING', { impact: 3, note: 'aucun régime à suivre, aucun effet progressif' }),
  f('Activités/Corps/Arts martiaux avec grades', 'MISSING', { impact: 3 }),
  f('Activités/Corps/Lecture avec progression', 'MISSING', { impact: 3, note: 'aucun livre, aucune bibliothèque, aucune progression de lecture' }),
  f('Activités/Corps/Jardinage', 'PARTIAL', { src: 'data/childhood.ts', ui: 'screens/ChildhoodScreen.tsx', pers: 1, cons: 1, test: 'enfance', deps: ['Vie/Personnalité'], impact: 2, note: 'seulement comme activité d’enfance' }),
  f('Activités/Sorties/Sortir le soir', 'COMPLETE', { src: 'systems/activities.ts#goOut', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Relations'], impact: 3 }),
  f('Activités/Sorties/Vacances', 'BASIC', { src: 'systems/activities.ts#takeVacation', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Finance'], impact: 3, note: 'destination et budget existent ; ni classe de voyage, ni compagnon, ni événement de séjour' }),
  f('Activités/Sorties/Activités de plein air', 'MISSING', { impact: 2, note: 'randonnée, camping, pêche, escalade' }),
  f('Activités/Animaux/Adopter un animal', 'COMPLETE', { src: 'systems/activities.ts#adoptPetSpecies', ui: 'components/ActivityMenu.tsx', npc: 1, pers: 1, cons: 1, test: 'engine', deps: ['Relations'], impact: 3 }),
  f('Activités/Animaux/Jouer avec son animal', 'COMPLETE', { src: 'systems/activities.ts#playWithPet', ui: 'components/ActivityMenu.tsx', npc: 1, pers: 1, cons: 1, test: 'engine', deps: ['Vie/Attributs/Bonheur'], impact: 3 }),
  f('Activités/Animaux/Vétérinaire', 'COMPLETE', { src: 'systems/activities.ts#vetVisit', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 3 }),
  f('Activités/Animaux/Vieillissement et mort', 'COMPLETE', { internal: 1, src: 'systems/activities.ts#advancePets', pers: 1, cons: 1, test: 'engine', deps: ['Vie/Attributs/Bonheur'], impact: 3 }),
  f('Activités/Animaux/Provenance : refuge, éleveur, animalerie', 'MISSING', { impact: 2 }),
  f('Activités/Animaux/Promener, laver, dresser', 'MISSING', { impact: 2 }),
  f('Activités/Animaux/Donner ou rendre un animal', 'MISSING', { impact: 2 }),
  f('Activités/Animaux/Événements d’animaux', 'PARTIAL', { src: 'data/events/everyday.ts', ui: 'components/EventModal.tsx', pers: 1, cons: 1, deps: ['Événements'], impact: 2, note: 'quelques événements ; loin d’une vraie banque' }),
  f('Activités/Achats/Boutique d’objets', 'COMPLETE', { src: 'systems/activities.ts#buyItem', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance/Patrimoine'], impact: 3 }),
  f('Activités/Achats/Revendre un objet', 'COMPLETE', { src: 'systems/activities.ts#sellValuable', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 3 }),
  f('Activités/Achats/Canaux de revente différents', 'COMPLETE', { src: 'data/activities.ts', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 3 }),
  f('Activités/Achats/Offrir un objet à quelqu’un', 'MISSING', { impact: 3 }),
  f('Activités/Administratif/Changer de nom', 'BASIC', { src: 'systems/activities.ts#changeName', ui: 'components/ActivityMenu.tsx', pers: 1, deps: ['Vie/Identité'], impact: 2, note: 'aucune conséquence : ni réputation, ni réaction des proches' }),
  f('Activités/Administratif/Permis de conduire', 'BASIC', { src: 'systems/activities.ts#getDrivingLicense', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Patrimoine/Véhicules'], impact: 3, note: 'un tirage : aucun examen jouable' }),
  f('Activités/Administratif/Permis bateau et pilote', 'MISSING', { impact: 2 }),
  f('Activités/Administratif/Testament', 'COMPLETE', { src: 'systems/activities.ts#updateWill', ui: 'components/ActivityMenu.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Héritage/Succession'], impact: 4 }),
  f('Activités/Jeu/Loterie', 'BASIC', { src: 'systems/activities.ts#playLottery', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Finance'], impact: 3, note: 'un tirage : ni billet, ni numéros, ni tirage à regarder' }),
  f('Activités/Jeu/Casino', 'BASIC', { src: 'systems/activities.ts#playCasino', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Finance', 'Vie/Attributs/Dépendance'], impact: 3, note: 'une mise et un tirage : aucun jeu de table jouable' }),
  f('Activités/Jeu/Blackjack jouable', 'MISSING', { impact: 3 }),
  f('Activités/Jeu/Roulette jouable', 'MISSING', { impact: 2 }),
  f('Activités/Jeu/Machine à sous jouable', 'MISSING', { impact: 2 }),
  f('Activités/Jeu/Courses hippiques', 'MISSING', { impact: 2 }),
  f('Activités/Jeu/Paris sportifs', 'MISSING', { impact: 2 }),

  /* --- Santé --- */
  f('Santé/Maladies/Catalogue de pathologies', 'COMPLETE', { src: 'data/diseases.ts', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Vie/Mort'], impact: 5 }),
  f('Santé/Maladies/Apparition contextuelle', 'COMPLETE', { internal: 1, src: 'systems/health.ts#rollNewIllness', pers: 1, cons: 1, test: 'engine', deps: ['Vie/Environnement'], impact: 5 }),
  f('Santé/Maladies/Gravité et progression', 'COMPLETE', { src: 'systems/health.ts#advanceDiseases', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Vie/Mort'], impact: 4 }),
  f('Santé/Maladies/Se soigner', 'COMPLETE', { src: 'systems/health.ts#treatDisease', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 4 }),
  f('Santé/Maladies/Coût des soins selon le pays', 'COMPLETE', { src: 'systems/health.ts#treatmentCost', ui: 'components/ActivityMenu.tsx', cons: 1, test: 'engine', deps: ['Finance'], impact: 4 }),
  f('Santé/Maladies/Consultation', 'COMPLETE', { src: 'systems/health.ts#consult', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Santé'], impact: 3 }),
  f('Santé/Maladies/Blessures', 'COMPLETE', { internal: 1, src: 'systems/health.ts#injure', pers: 1, cons: 1, test: 'engine', deps: ['Santé'], impact: 3 }),
  f('Santé/Praticiens/Choisir son médecin', 'MISSING', { impact: 3, note: 'les soins sont anonymes : ni praticien, ni réputation, ni prix comparés' }),
  f('Santé/Praticiens/Spécialistes', 'MISSING', { impact: 3 }),
  f('Santé/Urgences/Événement médical urgent', 'PARTIAL', { src: 'data/events/adult.ts', ui: 'components/EventModal.tsx', pers: 1, cons: 1, deps: ['Santé'], impact: 3, note: 'des événements de santé existent ; aucune urgence à trancher dans l’instant' }),
  f('Santé/Mental/Stress suivi et soigné', 'PARTIAL', { src: 'systems/activities.ts#doWellness', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Vie/Attributs/Stress'], impact: 4, note: 'le stress baisse avec le bien-être ; aucun suivi psychologique dédié' }),
  f('Santé/Mental/Accompagnement psychologique', 'MISSING', { impact: 3 }),
  f('Santé/Mental/Dépendance : cure et rechute', 'MISSING', { impact: 3 }),
  f('Santé/Recours/Procédure après un soin raté', 'MISSING', { impact: 2 }),
];

/* ================================================================== */
/* 7. PATRIMOINE                                                       */
/* ================================================================== */

const ASSETS: Feature[] = [
  f('Patrimoine/Immobilier/Marché de biens', 'COMPLETE', { src: 'systems/properties.ts#buyProperty', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'locataires', deps: ['Finance/Dette'], impact: 5 }),
  f('Patrimoine/Immobilier/Acheter comptant ou à crédit', 'COMPLETE', { src: 'systems/properties.ts#mortgageRate', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'locataires', deps: ['Finance/Dette'], impact: 5 }),
  f('Patrimoine/Immobilier/Vendre', 'COMPLETE', { src: 'systems/properties.ts#sellProperty', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'locataires', deps: ['Finance'], impact: 4 }),
  f('Patrimoine/Immobilier/Travaux et rénovation', 'COMPLETE', { src: 'systems/properties.ts#renovate', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'locataires', deps: ['Finance'], impact: 4 }),
  f('Patrimoine/Immobilier/État qui se dégrade', 'COMPLETE', { src: 'systems/properties.ts#advanceProperties', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'locataires', deps: ['Finance'], impact: 4 }),
  f('Patrimoine/Immobilier/Sinistres', 'COMPLETE', { internal: 1, src: 'systems/properties.ts#advanceProperties', pers: 1, cons: 1, test: 'locataires', deps: ['Finance'], impact: 3 }),
  f('Patrimoine/Immobilier/Changer de résidence', 'COMPLETE', { src: 'systems/properties.ts#setResidence', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'locataires', deps: ['Vie/Environnement'], impact: 4 }),
  f('Patrimoine/Immobilier/Confort du logement', 'COMPLETE', { internal: 1, src: 'systems/properties.ts#housingComfort', pers: 1, cons: 1, test: 'locataires', deps: ['Santé', 'Vie/Attributs/Bonheur'], impact: 3 }),
  f('Patrimoine/Immobilier/Offrir un bien', 'MISSING', { impact: 2 }),
  f('Patrimoine/Locatif/Fixer son loyer', 'COMPLETE', { src: 'systems/tenancy.ts#setAskingRent', ui: 'screens/TenancyScreen.tsx', pers: 1, cons: 1, test: 'locataires', deps: ['Finance'], impact: 5 }),
  f('Patrimoine/Locatif/Publier une annonce', 'COMPLETE', { src: 'systems/tenancy.ts#listForRent', ui: 'screens/TenancyScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'locataires', deps: ['Relations/Types/Locataires'], impact: 4 }),
  f('Patrimoine/Locatif/Choisir parmi des dossiers', 'COMPLETE', { src: 'systems/tenancy.ts#acceptTenant', ui: 'screens/TenancyScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'locataires', deps: ['Finance'], impact: 5 }),
  f('Patrimoine/Locatif/Impayés', 'COMPLETE', { src: 'systems/tenancy.ts#advanceTenancy', ui: 'screens/TenancyScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'locataires', deps: ['Finance'], impact: 4 }),
  f('Patrimoine/Locatif/Vacance locative', 'COMPLETE', { src: 'systems/tenancy.ts#advanceTenancy', ui: 'screens/TenancyScreen.tsx', pers: 1, cons: 1, test: 'locataires', deps: ['Finance'], impact: 4 }),
  f('Patrimoine/Locatif/Demandes de travaux à trancher', 'COMPLETE', { src: 'systems/tenancy.ts#handleRepair', ui: 'screens/TenancyScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'locataires', deps: ['Finance', 'Relations'], impact: 5 }),
  f('Patrimoine/Locatif/Renouvellement et hausse de loyer', 'COMPLETE', { src: 'systems/tenancy.ts#renewLease', ui: 'screens/TenancyScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'locataires', deps: ['Finance'], impact: 4 }),
  f('Patrimoine/Locatif/Procédure de départ', 'COMPLETE', { src: 'systems/tenancy.ts#evictTenant', ui: 'screens/TenancyScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'locataires', deps: ['Vie/Attributs/Karma'], impact: 4 }),
  f('Patrimoine/Locatif/Parler à son locataire', 'MISSING', { impact: 3, note: 'on décide pour lui, on ne lui parle jamais' }),
  f('Patrimoine/Locatif/Gestion déléguée', 'MISSING', { impact: 2 }),
  f('Patrimoine/Véhicules/Marché de véhicules', 'COMPLETE', { src: 'systems/vehicles.ts#buyVehicle', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 4 }),
  f('Patrimoine/Véhicules/Revendre', 'COMPLETE', { src: 'systems/vehicles.ts#sellVehicle', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 3 }),
  f('Patrimoine/Véhicules/Entretien et pannes', 'COMPLETE', { src: 'systems/vehicles.ts#serviceVehicle', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 3 }),
  f('Patrimoine/Véhicules/Kilométrage et fiabilité', 'COMPLETE', { src: 'systems/vehicles.ts#advanceVehicles', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 3 }),
  f('Patrimoine/Véhicules/Concessionnaires distincts', 'MISSING', { impact: 2 }),
  f('Patrimoine/Véhicules/Offrir un véhicule', 'MISSING', { impact: 2 }),
  f('Patrimoine/Bateaux/Marché dédié', 'MISSING', { impact: 2 }),
  f('Patrimoine/Aéronefs/Marché dédié', 'MISSING', { impact: 1 }),
  f('Patrimoine/Objets/Objets de valeur', 'COMPLETE', { src: 'systems/activities.ts#advanceValuables', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance/Patrimoine'], impact: 3 }),
  f('Patrimoine/Objets/Authenticité et expertise', 'MISSING', { impact: 3, note: 'aucun objet ne peut être une copie' }),
  f('Patrimoine/Objets/Ventes aux enchères', 'MISSING', { impact: 3 }),
  f('Patrimoine/Objets/Marché parallèle', 'MISSING', { impact: 3 }),
  f('Patrimoine/Objets/Œuvres d’art avec provenance', 'MISSING', { impact: 2 }),
  f('Patrimoine/Objets/Objets de famille transmis', 'MISSING', { impact: 3 }),
  f('Patrimoine/Collections/Collectionner', 'MISSING', { impact: 3, note: 'aucune notion de collection : les objets sont une liste plate' }),
];

/* ================================================================== */
/* 8. FINANCE ET PLACEMENTS                                            */
/* ================================================================== */

const FINANCE: Feature[] = [
  f('Finance/Bilan/Revenus, charges, net annuel', 'COMPLETE', { src: 'systems/finance.ts#runAnnualFinance', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['tout'], impact: 5 }),
  f('Finance/Bilan/Patrimoine net', 'COMPLETE', { src: 'systems/finance.ts#netWorth', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Héritage'], impact: 5 }),
  f('Finance/Bilan/Historique sur plusieurs exercices', 'COMPLETE', { src: 'engine/types.ts#FinanceSnapshot', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 3 }),
  f('Finance/Coût de la vie/Loyer', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#annualRent', pers: 1, cons: 1, test: 'engine', deps: ['Patrimoine'], impact: 4 }),
  f('Finance/Coût de la vie/Train de vie ajusté aux revenus', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#livingCost', pers: 1, cons: 1, test: 'engine', deps: ['Vie/Personnalité'], impact: 4 }),
  f('Finance/Coût de la vie/Charges familiales', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#familyCost', pers: 1, cons: 1, test: 'engine', deps: ['Relations/Enfants'], impact: 4 }),
  f('Finance/Coût de la vie/Privations quand ça ne rentre pas', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#runAnnualFinance', pers: 1, cons: 1, test: 'engine', deps: ['Santé', 'Vie/Attributs/Stress'], impact: 4 }),
  f('Finance/Fiscalité/Impôt progressif par pays', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#computeTax', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 4 }),
  f('Finance/Fiscalité/Optimisation fiscale', 'MISSING', { impact: 2 }),
  f('Finance/Aide/Aide sociale', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#socialSupport', pers: 1, cons: 1, test: 'engine', deps: ['Vie/Environnement'], impact: 4 }),
  f('Finance/Aide/Aide familiale pendant les études', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#familySupport', pers: 1, cons: 1, test: 'milieu', deps: ['Relations/Famille'], impact: 4 }),
  f('Finance/Dette/Prêt personnel', 'COMPLETE', { src: 'systems/finance.ts#takePersonalLoan', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 4 }),
  f('Finance/Dette/Rembourser par anticipation', 'COMPLETE', { src: 'systems/finance.ts#repayLoan', ui: 'screens/AssetsScreen.tsx', pers: 1, cons: 1, test: 'engine', deps: ['Finance'], impact: 3 }),
  f('Finance/Dette/Capacité d’emprunt', 'COMPLETE', { tooling: 1, src: 'systems/finance.ts#borrowingCapacity', ui: 'screens/AssetsScreen.tsx', cons: 1, test: 'engine', deps: ['Patrimoine'], impact: 4 }),
  f('Finance/Dette/Dépôt de bilan', 'COMPLETE', { internal: 1, src: 'systems/finance.ts#declareBankruptcy', pers: 1, cons: 1, test: 'balance', deps: ['Vie/Attributs/Réputation'], impact: 4 }),
  f('Placements/Marché/Cours qui évoluent', 'COMPLETE', { src: 'systems/investing.ts#advanceMarkets', ui: 'screens/PortfolioScreen.tsx', pers: 1, cons: 1, test: 'placements', deps: ['Finance'], impact: 5 }),
  f('Placements/Marché/Supports variés', 'COMPLETE', { src: 'data/assets.ts', ui: 'screens/PortfolioScreen.tsx', pers: 1, cons: 1, test: 'placements', deps: ['Finance'], impact: 4 }),
  f('Placements/Marché/Acheter', 'COMPLETE', { src: 'systems/investing.ts#invest', ui: 'screens/PortfolioScreen.tsx', pers: 1, cons: 1, test: 'placements', deps: ['Finance'], impact: 5 }),
  f('Placements/Marché/Vendre', 'COMPLETE', { src: 'systems/investing.ts#divest', ui: 'screens/PortfolioScreen.tsx', pers: 1, cons: 1, test: 'placements', deps: ['Finance'], impact: 5 }),
  f('Placements/Marché/Prix de revient et plus-value', 'COMPLETE', { src: 'systems/investing.ts#unrealizedGain', ui: 'screens/PortfolioScreen.tsx', pers: 1, cons: 1, test: 'placements', deps: ['Finance'], impact: 4 }),
  f('Placements/Marché/Ticket minimum', 'COMPLETE', { tooling: 1, src: 'systems/investing.ts#minimumTicket', ui: 'screens/PortfolioScreen.tsx', cons: 1, test: 'placements', deps: ['Placements'], impact: 3 }),
  f('Placements/Marché/Blocage de certains supports', 'COMPLETE', { src: 'systems/investing.ts#isLocked', ui: 'screens/PortfolioScreen.tsx', pers: 1, cons: 1, test: 'placements', deps: ['Placements'], impact: 3 }),
  f('Placements/Marché/Revenus du portefeuille', 'COMPLETE', { internal: 1, src: 'systems/investing.ts#portfolioIncome', pers: 1, cons: 1, test: 'placements', deps: ['Finance'], impact: 4 }),
  f('Placements/Marché/Concentration et diversification', 'COMPLETE', { tooling: 1, src: 'systems/investing.ts#concentration', ui: 'screens/PortfolioScreen.tsx', cons: 1, test: 'placements', deps: ['Placements'], impact: 4 }),
  f('Placements/Compréhension/Culture financière', 'COMPLETE', { src: 'systems/investing.ts#literacy', ui: 'screens/PortfolioScreen.tsx', pers: 1, cons: 1, test: 'placements', deps: ['Éducation'], impact: 4 }),
  f('Placements/Compréhension/Ce qu’on voit avant d’acheter', 'COMPLETE', { tooling: 1, src: 'systems/investing.ts#assetInsight', ui: 'screens/PortfolioScreen.tsx', cons: 1, test: 'placements', deps: ['Placements'], impact: 4 }),
  f('Placements/Sociétés/Entreprises cotées nommées', 'MISSING', { impact: 4, note: 'les supports sont des indices abstraits : aucune société n’a de secteur, de dette ni de résultats' }),
  f('Placements/Sociétés/Quantité de titres détenus', 'MISSING', { impact: 3, note: 'on investit une somme, on ne détient pas un nombre de parts' }),
  f('Placements/Historique/Graphique de cours', 'MISSING', { impact: 3, note: 'aucun historique visible : on ne voit que le prix du jour' }),
  f('Placements/Information/Actualité financière', 'MISSING', { impact: 3 }),
  f('Placements/Information/Conseiller', 'MISSING', { impact: 3 }),
  f('Placements/Cryptomonnaie/Marché volatil', 'PARTIAL', { src: 'data/assets.ts', ui: 'screens/PortfolioScreen.tsx', pers: 1, cons: 1, test: 'placements', deps: ['Finance'], impact: 3, note: 'un support très volatil existe ; ni portefeuille propre, ni cycles' }),
  f('Placements/Obligations/Émetteur, échéance, rendement', 'PARTIAL', { src: 'data/assets.ts', ui: 'screens/PortfolioScreen.tsx', pers: 1, cons: 1, test: 'placements', deps: ['Finance'], impact: 2, note: 'une ligne « obligations » sans émetteur ni maturité' }),
  f('Placements/Transmission/Portefeuille transmissible', 'PARTIAL', { src: 'systems/inheritance.ts#settleEstate', pers: 1, cons: 1, test: 'lignee', deps: ['Héritage/Succession'], impact: 3, note: 'la valeur est transmise en espèces ; les positions ne survivent pas' }),
];

/* ================================================================== */
/* 9. CRIME, JUSTICE, PRISON                                           */
/* ================================================================== */

const CRIME: Feature[] = [
  f('Crime/Catalogue/Délits variés', 'COMPLETE', { src: 'data/crimes.ts', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'life', deps: ['Justice'], impact: 5 }),
  f('Crime/Catalogue/Conditions d’accès', 'COMPLETE', { tooling: 1, src: 'systems/crime.ts#crimeBlocker', ui: 'components/ActivityMenu.tsx', cons: 1, test: 'life', deps: ['Crime'], impact: 4 }),
  f('Crime/Vol à la tire/Choisir sa cible', 'INTERACTIVE', { src: 'systems/pickpocketing.ts#availableTargets', ui: 'screens/PickpocketScreen.tsx', mg: 'pickpocket', pers: 1, cons: 1, test: 'minijeux', deps: ['Crime/Détection'], impact: 5 }),
  f('Crime/Vol à la tire/Mini-jeu jouable', 'INTERACTIVE', { src: 'systems/pickpocketing.ts#resolvePickpocket', ui: 'screens/PickpocketScreen.tsx', mg: 'pickpocket', pers: 1, cons: 1, test: 'minijeux', deps: ['Crime/Détection'], impact: 5 }),
  f('Crime/Vol à la tire/Simuler au lieu de jouer', 'COMPLETE', { src: 'systems/pickpocketing.ts#autoPickpocket', ui: 'screens/PickpocketScreen.tsx', pers: 1, cons: 1, test: 'minijeux', deps: ['Crime'], impact: 3 }),
  f('Crime/Cambriolage/Repérage des maisons', 'INTERACTIVE', { src: 'systems/burglary.ts#availableHouses', ui: 'screens/BurglaryScreen.tsx', mg: 'burglary', pers: 1, cons: 1, test: 'minijeux', deps: ['Crime/Détection'], impact: 5 }),
  f('Crime/Cambriolage/Mini-jeu de plan', 'INTERACTIVE', { src: 'systems/burglary.ts#resolveBurglary', ui: 'screens/BurglaryScreen.tsx', mg: 'burglary', pers: 1, cons: 1, test: 'minijeux', deps: ['Crime/Fuite'], impact: 5 }),
  f('Crime/Fuite/Poursuite jouable', 'INTERACTIVE', { src: 'systems/burglary.ts#chaseContext', ui: 'screens/BurglaryScreen.tsx', mg: 'chase', pers: 1, cons: 1, test: 'minijeux', deps: ['Justice/Arrestation'], impact: 5 }),
  f('Crime/Détection/Chaleur policière', 'COMPLETE', { src: 'systems/underworld.ts#heatOf', ui: 'screens/UnderworldScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Justice/Arrestation'], impact: 5 }),
  f('Crime/Détection/Enquêtes ouvertes', 'COMPLETE', { src: 'systems/underworld.ts#openInvestigation', ui: 'screens/UnderworldScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Justice'], impact: 4 }),
  f('Crime/Détection/Un visage connu se fait reconnaître', 'COMPLETE', { internal: 1, src: 'systems/fame.ts#recognitionFactor', pers: 1, cons: 1, test: 'notoriete', deps: ['Notoriété'], impact: 4 }),
  f('Crime/Historique/Casier judiciaire', 'COMPLETE', { src: 'engine/types.ts#CriminalRecord', ui: 'screens/CharacterScreen.tsx', pers: 1, cons: 1, test: 'life', deps: ['Carrière'], impact: 5 }),
  f('Crime/Historique/Notoriété criminelle', 'COMPLETE', { internal: 1, src: 'systems/crime.ts#commitCrime', ui: 'screens/UnderworldScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Notoriété'], impact: 4 }),
  f('Crime/Vol de véhicule/Mini-jeu dédié', 'BASIC', { src: 'data/crimes.ts', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Crime'], impact: 4, note: 'un délit du catalogue résolu par tirage : aucun puzzle' }),
  f('Crime/Vol à l’étalage/Mini-jeu dédié', 'BASIC', { src: 'data/crimes.ts', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Crime'], impact: 3, note: 'un délit du catalogue résolu par tirage' }),
  f('Crime/Braquage/Minutage et niveau d’alerte', 'BASIC', { src: 'data/crimes.ts', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Crime'], impact: 4, note: 'un délit du catalogue résolu par tirage' }),
  f('Crime/Colis/Récupération opportuniste', 'MISSING', { impact: 2 }),
  f('Crime/Bureau/Délit financier au travail', 'MISSING', { impact: 3, note: 'travailler quelque part n’ouvre aucune possibilité criminelle' }),
  f('Crime/Délinquance/Petites infractions d’adolescent', 'PARTIAL', { src: 'data/crimes.ts', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Éducation/Comportement'], impact: 3, note: 'les délits sont ouverts par âge mais rien n’est propre à l’adolescence' }),
  f('Crime/Blanchiment/Faire disparaître l’origine', 'COMPLETE', { src: 'systems/crime.ts#launderMoney', ui: 'screens/UnderworldScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Finance'], impact: 3 }),

  f('Crime/Organisé/Rejoindre une organisation', 'COMPLETE', { src: 'systems/underworld.ts#joinOrganization', ui: 'screens/UnderworldScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'milieu', deps: ['Crime'], impact: 4 }),
  f('Crime/Organisé/Rangs et progression', 'COMPLETE', { src: 'systems/underworld.ts#rankOf', ui: 'screens/UnderworldScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Crime/Organisé'], impact: 4 }),
  f('Crime/Organisé/Membres persistants', 'COMPLETE', { src: 'systems/underworld.ts#underworldPeople', ui: 'screens/UnderworldScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'milieu', deps: ['Relations'], impact: 4 }),
  f('Crime/Organisé/Missions', 'COMPLETE', { src: 'systems/underworld.ts#runMission', ui: 'screens/UnderworldScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Finance', 'Crime/Détection'], impact: 4 }),
  f('Crime/Organisé/Missions imposées et refus', 'COMPLETE', { src: 'systems/underworld.ts#refuseMission', ui: 'screens/UnderworldScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Crime/Organisé'], impact: 4 }),
  f('Crime/Organisé/Carnet de contacts', 'COMPLETE', { src: 'systems/underworld.ts#contactsOf', ui: 'screens/UnderworldScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'milieu', deps: ['Crime'], impact: 4 }),
  f('Crime/Organisé/Services rendus par les contacts', 'COMPLETE', { src: 'systems/underworld.ts#askService', ui: 'screens/UnderworldScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'milieu', deps: ['Crime/Détection'], impact: 4 }),
  f('Crime/Organisé/Quitter la maison', 'COMPLETE', { src: 'systems/underworld.ts#leaveOrganization', ui: 'screens/UnderworldScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Crime/Organisé'], impact: 3 }),
  f('Crime/Organisé/Mini-jeux de mission', 'MISSING', { impact: 4, note: 'les missions se résolvent par tirage' }),
  f('Crime/Organisé/Luttes internes', 'MISSING', { impact: 3 }),
  f('Crime/Organisé/Prendre la tête', 'PARTIAL', { src: 'systems/underworld.ts#rankOf', ui: 'screens/UnderworldScreen.tsx', pers: 1, cons: 1, test: 'milieu', deps: ['Crime/Organisé'], impact: 3, note: 'le rang de patron existe ; il n’ouvre aucun gameplay de direction' }),
  f('Crime/Trafic/Économie de contrebande fictive', 'MISSING', { impact: 3 }),

  f('Justice/Arrestation/Séquence d’arrestation', 'COMPLETE', { src: 'systems/justice.ts#arrest', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'life', deps: ['Justice/Procès'], impact: 5 }),
  f('Justice/Procès/Choisir un avocat', 'COMPLETE', { src: 'systems/justice.ts#goToTrial', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'life', deps: ['Finance', 'Prison'], impact: 5 }),
  f('Justice/Procès/Verdict et peine', 'COMPLETE', { src: 'systems/justice.ts#incarcerate', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'life', deps: ['Prison'], impact: 5 }),
  f('Justice/Procès/Faire appel', 'COMPLETE', { src: 'systems/justice.ts#appeal', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'life', deps: ['Prison'], impact: 4 }),
  f('Justice/Casier/Effacement', 'COMPLETE', { src: 'systems/justice.ts#requestExpungement', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'life', deps: ['Carrière'], impact: 3 }),
  f('Justice/Procès/Audience jouable', 'MISSING', { impact: 3, note: 'le procès est un calcul : aucune scène, aucune plaidoirie à conduire' }),
  f('Justice/Sévérité/Variation par pays', 'COMPLETE', { internal: 1, src: 'data/countries.ts', cons: 1, test: 'life', deps: ['Justice'], impact: 4 }),

  f('Prison/Détention/Niveaux de sécurité', 'COMPLETE', { src: 'systems/prison.ts#advancePrison', ui: 'screens/PrisonScreen.tsx', pers: 1, cons: 1, test: 'evasion', deps: ['Prison'], impact: 4 }),
  f('Prison/Détention/Activités carcérales', 'COMPLETE', { src: 'systems/prison.ts#doPrisonActivity', ui: 'screens/PrisonScreen.tsx', pers: 1, cons: 1, test: 'evasion', deps: ['Vie/Attributs'], impact: 4 }),
  f('Prison/Détention/Codétenus persistants', 'COMPLETE', { src: 'systems/prison.ts#inmateAction', ui: 'screens/PrisonScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'evasion', deps: ['Relations'], impact: 4 }),
  f('Prison/Détention/Se faire protéger', 'COMPLETE', { src: 'systems/prison.ts#inmateAction', ui: 'screens/PrisonScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'evasion', deps: ['Prison'], impact: 4 }),
  f('Prison/Libération/Conditionnelle', 'COMPLETE', { src: 'systems/prison.ts#requestParole', ui: 'screens/PrisonScreen.tsx', pers: 1, cons: 1, test: 'evasion', deps: ['Prison'], impact: 4 }),
  f('Prison/Libération/Sortie en fin de peine', 'COMPLETE', { internal: 1, src: 'systems/prison.ts#release', pers: 1, cons: 1, test: 'evasion', deps: ['Carrière'], impact: 4 }),
  f('Prison/Évasion/Préparer', 'COMPLETE', { src: 'systems/escape.ts#prepareEscape', ui: 'screens/PrisonScreen.tsx', pers: 1, cons: 1, test: 'evasion', deps: ['Prison/Évasion'], impact: 5 }),
  f('Prison/Évasion/Mini-jeu jouable', 'INTERACTIVE', { src: 'systems/escape.ts#resolveEscapeAttempt', ui: 'screens/PrisonScreen.tsx', mg: 'escape', pers: 1, cons: 1, test: 'evasion', deps: ['Crime/Fuite'], impact: 5 }),
  f('Prison/Évasion/Cavale', 'COMPLETE', { src: 'systems/escape.ts#goOnTheRun', ui: 'screens/PrisonScreen.tsx', pers: 1, cons: 1, test: 'evasion', deps: ['Justice'], impact: 4 }),
  f('Prison/Évasion/Se rendre', 'COMPLETE', { src: 'systems/escape.ts#surrender', ui: 'screens/PrisonScreen.tsx', pers: 1, cons: 1, test: 'evasion', deps: ['Justice'], impact: 3 }),
  f('Prison/Détention/Visites', 'COMPLETE', { src: 'systems/lives.ts#visit', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'leurs', deps: ['Relations'], impact: 3, note: 'une fois l’an, au parloir ; elle ne raccourcit rien — elle change l’état dans lequel il en sort et tient le lien pendant qu’il est hors d’atteinte' }),
  f('Prison/Détention/Travail en détention', 'PARTIAL', { src: 'systems/prison.ts#doPrisonActivity', ui: 'screens/PrisonScreen.tsx', pers: 1, cons: 1, test: 'evasion', deps: ['Finance'], impact: 2, note: 'une activité parmi d’autres, sans rémunération réelle' }),
  f('Prison/Émeute/Mini-jeu dédié', 'MISSING', { impact: 3 }),
];

/* ================================================================== */
/* 10. NOTORIÉTÉ                                                       */
/* ================================================================== */

const FAME: Feature[] = [
  f('Notoriété/Axes/Combien de gens te connaissent', 'COMPLETE', { src: 'systems/fame.ts#advanceFame', ui: 'screens/FameScreen.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Carrière', 'Crime'], impact: 5 }),
  f('Notoriété/Axes/Ce qu’on a à te reprocher', 'COMPLETE', { src: 'systems/fame.ts#heatLabel', ui: 'screens/FameScreen.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Notoriété'], impact: 5 }),
  f('Notoriété/Axes/Ce que le public retient de bon', 'COMPLETE', { src: 'systems/fame.ts#publicStanding', ui: 'screens/FameScreen.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Notoriété'], impact: 4 }),
  f('Notoriété/Entretien/Ce qui rend connu, ligne par ligne', 'COMPLETE', { tooling: 1, src: 'systems/fame.ts#fameSources', ui: 'screens/FameScreen.tsx', cons: 1, test: 'notoriete', deps: ['Carrière', 'Travail/Indépendant'], impact: 5 }),
  f('Notoriété/Entretien/Ça retombe si on n’entretient pas', 'COMPLETE', { src: 'systems/fame.ts#fameDecay', ui: 'screens/FameScreen.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Notoriété'], impact: 5 }),
  f('Notoriété/Apparitions/Dix apparitions échelonnées', 'COMPLETE', { src: 'systems/fame.ts#doGig', ui: 'screens/FameScreen.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Finance'], impact: 5 }),
  f('Notoriété/Apparitions/Interview jouable', 'COMPLETE', { src: 'systems/fame.ts#answerInterview', ui: 'screens/FameScreen.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Notoriété'], impact: 5 }),
  f('Notoriété/Affaires/Scandales', 'COMPLETE', { src: 'systems/fame.ts#openScandal', ui: 'screens/FameScreen.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Notoriété'], impact: 5 }),
  f('Notoriété/Affaires/Quatre réponses, aucune bonne', 'COMPLETE', { src: 'systems/fame.ts#respondToScandal', ui: 'screens/FameScreen.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Vie/Attributs/Réputation'], impact: 5 }),
  f('Notoriété/Coût/Vie privée et reconnaissance', 'COMPLETE', { internal: 1, src: 'systems/fame.ts#recognitionFactor', pers: 1, cons: 1, test: 'notoriete', deps: ['Crime/Détection', 'Santé'], impact: 4 }),
  f('Notoriété/Réseaux/Publier', 'BASIC', { src: 'systems/activities.ts#postOnSocial', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, deps: ['Notoriété'], impact: 4, note: 'un tirage de viralité : ni plateformes distinctes, ni sujet, ni format' }),
  f('Notoriété/Réseaux/Monétiser son audience', 'COMPLETE', { src: 'systems/activities.ts#monetizeAudience', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Finance'], impact: 3 }),
  f('Notoriété/Réseaux/Plusieurs réseaux distincts', 'MISSING', { impact: 3 }),
  f('Notoriété/Réseaux/Choisir le sujet d’une publication', 'MISSING', { impact: 3 }),
  f('Notoriété/Réseaux/Suspension de compte', 'MISSING', { impact: 2 }),
  f('Notoriété/Réseaux/Offres de partenariat selon l’audience', 'PARTIAL', { src: 'systems/activities.ts#monetizeAudience', ui: 'components/ActivityMenu.tsx', pers: 1, cons: 1, test: 'notoriete', deps: ['Finance'], impact: 3, note: 'une seule offre générique par an, sans marque ni négociation' }),
];

/* ================================================================== */
/* 11. HÉRITAGE ET MÉTA                                                */
/* ================================================================== */

const LEGACY: Feature[] = [
  f('Héritage/Succession/Testament et parts', 'COMPLETE', { src: 'systems/activities.ts#updateWill', ui: 'components/ActivityMenu.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Héritage/Lignée'], impact: 4 }),
  f('Héritage/Succession/Ordre légal à défaut', 'COMPLETE', { internal: 1, src: 'systems/inheritance.ts#settleEstate', pers: 1, cons: 1, test: 'lignee', deps: ['Héritage/Lignée'], impact: 4 }),
  f('Héritage/Succession/Hériter d’un proche', 'COMPLETE', { internal: 1, src: 'systems/inheritance.ts#handleRelativeDeath', pers: 1, cons: 1, test: 'life', deps: ['Finance'], impact: 4 }),
  f('Héritage/Lignée/Continuer par un descendant', 'COMPLETE', { src: 'systems/lineage.ts#continueAs', ui: 'screens/SummaryScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'lignee', deps: ['tout'], impact: 5 }),
  f('Héritage/Lignée/Parenté recalculée', 'COMPLETE', { internal: 1, src: 'systems/lineage.ts#relationTo', pers: 1, cons: 1, test: 'lignee', deps: ['Relations'], impact: 5 }),
  f('Héritage/Lignée/Le milieu de départ hérité', 'COMPLETE', { internal: 1, src: 'systems/lineage.ts#tierFromWealth', pers: 1, cons: 1, test: 'lignee', deps: ['Vie/Naissance', 'Éducation'], impact: 5 }),
  f('Héritage/Lignée/Générations enregistrées', 'COMPLETE', { src: 'systems/lineage.ts#heirsOf', ui: 'screens/SummaryScreen.tsx', pers: 1, cons: 1, test: 'lignee', deps: ['Héritage'], impact: 4 }),
  f('Héritage/Lignée/Arbre généalogique', 'MISSING', { impact: 3, note: 'la lignée est une liste ; aucun arbre à parcourir' }),
  f('Héritage/Lignée/Patrimoine cumulé des générations', 'MISSING', { impact: 2 }),
  f('Héritage/Titres/Titres symboliques de fin de vie', 'MISSING', { impact: 3, note: 'rien ne résume une trajectoire en un titre' }),
  f('Héritage/Succès/Système de succès', 'MISSING', { impact: 4, note: 'aucun succès, aucun palier, aucune trace d’une vie remarquable' }),
  f('Héritage/Défis/Objectifs multiples à remplir', 'COMPLETE', { src: 'data/challenges.ts#CHALLENGES', ui: 'screens/ChallengeScreen.tsx', test: 'defis', pers: 1, cons: 1, impact: 4, note: 'dix-sept défis sur cinq paliers ; ce que le joueur décide de faire d’une vie, distinct des ambitions du personnage et des titres de fin de vie' }),
  f('Héritage/Défis/Suivi de progression', 'COMPLETE', { src: 'systems/challenges.ts#stepsOf', ui: 'screens/ChallengeScreen.tsx', test: 'defis', pers: 1, cons: 1, impact: 3, note: 'les étapes se lisent pendant la vie et ne se reperdent jamais' }),
  f('Héritage/Défis/Serments', 'COMPLETE', { src: 'systems/vows.ts#vowActive', ui: 'screens/ChallengeScreen.tsx', test: 'defis', pers: 1, cons: 1, deps: ['Héritage/Succession', 'Finance/Dette', 'Éducation/Supérieur'], impact: 4, note: 'accepter interdit quelque chose pour le reste de la vie, et le moteur refuse ce qui est juré au lieu de le faire arriver' }),
  f('Héritage/Défis/Chasses à indices', 'COMPLETE', { src: 'systems/challenges.ts#stepsOf', ui: 'screens/ChallengeScreen.tsx', test: 'defis', cons: 1, impact: 3, note: 'trois pistes dont on ne voit que le pas suivant, et qui se suivent dans l’ordre' }),
  f('Héritage/Défis/Défis de lignée', 'COMPLETE', { src: 'systems/challenges.ts#carryChallenges', ui: 'screens/ChallengeScreen.tsx', test: 'defis', pers: 1, cons: 1, deps: ['Héritage/Lignée'], impact: 3, note: 'le seul compte du jeu que la mort fait avancer' }),
  f('Héritage/Cabinet/Trophées conservés entre les parties', 'COMPLETE', { src: 'engine/save.ts#loadVault', ui: 'screens/ChallengeScreen.tsx', test: 'defis', pers: 1, cons: 1, impact: 3, note: 'la seule mémoire qui survit à une partie neuve ; elle garde la vie qui a gagné chaque pièce' }),
  f('Héritage/Cabinet/Paliers ouverts par le cabinet', 'COMPLETE', { src: 'systems/challenges.ts#tierOpen', ui: 'screens/ChallengeScreen.tsx', test: 'defis', cons: 1, impact: 3, note: 'il n’accorde aucun avantage — c’est vérifié par un test — et n’ouvre que les défis suivants' }),
  f('Héritage/Défis/Défis à durée limitée', 'MISSING', { impact: 2, note: 'aucun défi saisonnier ni daté : tous restent disponibles indéfiniment' }),
  f('Héritage/Collections/Registre des collections', 'MISSING', { impact: 3 }),
  f('Héritage/Chasses/Chasses aux objets saisonnières', 'MISSING', { impact: 2 }),

  f('Événements/Format/Format déclaratif de données', 'COMPLETE', { src: 'data/events/types.ts', ui: 'components/EventModal.tsx', pers: 1, cons: 1, test: 'inventory', deps: ['tout'], impact: 5 }),
  f('Événements/Format/Conditions riches', 'COMPLETE', { internal: 1, src: 'systems/randomEvents.ts#matchesCondition', cons: 1, test: 'inventory', deps: ['Événements'], impact: 5 }),
  f('Événements/Format/Choix multiples et issues pondérées', 'COMPLETE', { src: 'systems/randomEvents.ts#resolvePending', ui: 'components/EventModal.tsx', pers: 1, cons: 1, test: 'inventory', deps: ['Événements'], impact: 5 }),
  f('Événements/Format/Effets spéciaux délégués au moteur', 'COMPLETE', { internal: 1, src: 'systems/randomEvents.ts#applyEffects', pers: 1, cons: 1, test: 'inventory', deps: ['tout'], impact: 4 }),
  f('Événements/Volume/Banque d’événements', 'PARTIAL', { src: 'data/events/index.ts', ui: 'components/EventModal.tsx', pers: 1, cons: 1, test: 'inventory', deps: ['Événements'], impact: 5, note: 'moins de deux cents événements écrits à la main : l’architecture tient, le volume non' }),
  f('Événements/Calendrier/Occasions datées et récurrentes', 'COMPLETE', { src: 'data/occasions.ts#OCCASIONS', ui: 'components/EventModal.tsx', test: 'occasions', pers: 1, cons: 1, ev: 1, impact: 5, note: 'quatorze occasions fictives réparties sur l’année ; le mois décide, et le parcours du calendrier tourne d’une année sur l’autre' }),
  f('Événements/Calendrier/Cinq degrés de rareté', 'COMPLETE', { src: 'data/occasions.ts#RARITY_ODDS', ui: 'components/EventModal.tsx', test: 'occasions', cons: 1, impact: 3, note: 'du banal au presque unique ; la comète passe une fois par quatre-vingts ans' }),
  f('Événements/Calendrier/Souvenirs sans valeur', 'COMPLETE', { src: 'data/occasions.ts#KEEPSAKES', ui: 'screens/CollectionScreen.tsx', test: 'occasions', pers: 1, cons: 1, deps: ['Héritage/Objets de famille'], impact: 2, note: 'des objets qui ne valent rien, à côté de ceux qui valent de l’argent — la différence est le propos' }),
  f('Événements/Densité/Aucune année vide', 'COMPLETE', { internal: 1, src: 'systems/occasions.ts#advanceOccasions', test: 'occasions', cons: 1, impact: 4, note: 'mesuré : 3,4 % d’années vides et 14 % entre six et treize ans, ramenés à 0,1 % — l’occasion ne se pose que si l’année n’a rien produit d’autre' }),
  f('Événements/Volume/Génération procédurale', 'MISSING', { impact: 4, note: 'aucun événement composé à la volée : tout est écrit à la main' }),
  f('Événements/Densité/Audit d’âge automatique', 'MISSING', { impact: 3, note: 'la densité par tranche d’âge se mesure à la main, pas en continu' }),

  f('Simulation PNJ/Vie propre/Les PNJ vieillissent et meurent', 'COMPLETE', { internal: 1, src: 'systems/npc.ts#agePerson', pers: 1, cons: 1, test: 'life', deps: ['Relations'], impact: 5 }),
  f('Simulation PNJ/Vie propre/Caractère qui évolue', 'COMPLETE', { internal: 1, src: 'systems/psyche.ts#advanceNpcPsyche', pers: 1, cons: 1, test: 'personnalite', deps: ['Relations'], impact: 4 }),
  f('Simulation PNJ/Vie propre/Initiatives des PNJ', 'COMPLETE', { src: 'systems/lives.ts#advanceLives', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'leurs', deps: ['Relations'], impact: 4, note: 'quatorze tournants, un par personne et par an au plus ; le caractère et les statistiques poussent, et 98 % des gens du jeu ont désormais une histoire contre 51 % avant' }),
  f('Simulation PNJ/Vie propre/Se marier de leur côté', 'COMPLETE', { src: 'systems/lives.ts#takeTurn', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'leurs', deps: ['Relations'], impact: 3, note: 'rencontre, puis mariage d’autant plus probable que l’histoire dure ; le conjoint d’un frère existe vraiment et devient de la belle-famille' }),
  f('Simulation PNJ/Vie propre/Avoir des enfants', 'COMPLETE', { src: 'systems/lives.ts#childRelation', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'leurs', deps: ['Relations'], impact: 3, note: 'un vrai PNJ enregistré, neveu ou nièce, qui grandit et prendra ses propres tournants ; chaque enfant rend le suivant moins probable' }),
  f('Simulation PNJ/Vie propre/Changer de métier, s’enrichir, tomber', 'COMPLETE', { src: 'systems/lives.ts#nextRung', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'leurs', deps: ['Relations', 'Carrière'], impact: 4, note: 'embauche, échelon nommé, reconversion, licenciement, belle affaire et revers ; leur patrimoine décide de ce qu’on hérite, et la ruine est passée de 53,9 % à moins de 5 %' }),
  f('Simulation PNJ/Vie propre/Tomber malade, aller en prison', 'COMPLETE', { src: 'systems/lives.ts#advanceLife', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'leurs', deps: ['Relations', 'Santé'], impact: 3, note: 'une maladie use tant qu’elle dure et peut emporter ; une peine se purge année par année et rien ne l’abrège' }),
  f('Simulation PNJ/Demandes/Un PNJ demande de l’aide', 'COMPLETE', { src: 'systems/lives.ts#askAmount', ui: 'components/EventModal.tsx', npc: 1, pers: 1, cons: 1, test: 'leurs', deps: ['Relations'], impact: 3, note: 'qui perd son travail, tombe malade ou entre en prison se tourne vers le premier cercle ; le montant est plafonné à une part de ce qu’on a, sinon on répond qu’on n’a rien' }),
  f('Simulation PNJ/Historique/Chaque PNJ garde son histoire', 'COMPLETE', { src: 'systems/npc.ts#noteHistory', ui: 'screens/RelationshipsScreen.tsx', npc: 1, pers: 1, cons: 1, test: 'life', deps: ['Relations'], impact: 4 }),

  f('Méta/Équilibrage/Plafond cognitif propre à chacun', 'COMPLETE', { internal: 1, src: 'systems/stats.ts#cognitiveCeilingOf', test: 'derive', pers: 1, cons: 1, impact: 4, note: 'l’héritage, le capital culturel du foyer et le goût de l’étude ; l’intelligence ne monte plus jusqu’à cent en attendant' }),
  f('Méta/Équilibrage/Point de passage unique des statistiques', 'COMPLETE', { internal: 1, src: 'systems/stats.ts#shiftStat', test: 'derive', cons: 1, impact: 4, note: 'sept canaux faisaient monter l’intelligence et vingt-six le karma, chacun avec ses règles ou sans règle' }),
  f('Méta/Équilibrage/Karma à rendements décroissants', 'COMPLETE', { internal: 1, src: 'systems/stats.ts#shiftStat', test: 'derive', cons: 1, impact: 3, note: 'il valait 99,9 de moyenne à quarante ans ; il revient vers l’ordinaire et répond de moins en moins aux extrêmes' }),
  f('Méta/Équilibrage/Moyenne scolaire centrée', 'COMPLETE', { internal: 1, src: 'engine/probability.ts#computeGrade', test: 'derive', cons: 1, deps: ['Éducation/Notes'], impact: 4, note: 'elle valait 15,2 sur 20 : un élève ordinaire obtient désormais une note ordinaire, et le haut reste atteignable' }),
  f('Méta/Sauvegarde/Tout est persisté', 'COMPLETE', { internal: 1, src: 'engine/save.ts#saveGame', pers: 1, cons: 1, test: 'transfert', deps: ['tout'], impact: 5 }),
  f('Méta/Sauvegarde/Export et import', 'COMPLETE', { tooling: 1, src: 'engine/save.ts#exportSave', ui: 'components/Navigation.tsx', pers: 1, cons: 1, test: 'transfert', deps: ['Méta/Sauvegarde'], impact: 3 }),
  f('Méta/Sauvegarde/Générateur déterministe dans la sauvegarde', 'COMPLETE', { internal: 1, src: 'engine/rng.ts#Rng', pers: 1, cons: 1, test: 'transfert', deps: ['tout'], impact: 5 }),
  f('Méta/Sauvegarde/Revenir à un état antérieur', 'MISSING', { impact: 2, note: 'aucun historique d’états : la sauvegarde est un point unique' }),
  f('Méta/Tests/Audits mécaniques anti-décoratifs', 'COMPLETE', { tooling: 1, src: 'systems/environmentAudit.ts#validateEnvironmentImpact', test: 'environnement', deps: ['Méta/Tests'], impact: 4 }),
  f('Méta/Tests/Catalogue ancré au code', 'COMPLETE', { tooling: 1, src: 'data/featureCatalog.ts#ALL_FEATURES', test: 'catalogue', deps: ['Méta/Tests'], impact: 5 }),
  f('Méta/Tests/Détection des boutons morts', 'COMPLETE', { tooling: 1, src: 'data/gameplayAudit.ts#auditProblems', test: 'audit', deps: ['Méta/Tests'], impact: 4 }),
  f('Méta/Tests/Test de fumée en navigateur', 'COMPLETE', { tooling: 1, src: 'engine/save.ts#parseSave', test: 'transfert', deps: ['Méta/Tests'], impact: 4 }),
  f('Méta/Interface/Retour visuel des actions', 'COMPLETE', { tooling: 1, src: 'components/Modal.tsx#Modal', ui: 'components/Modal.tsx', cons: 1, deps: ['Méta/Interface'], impact: 3 }),
  f('Méta/Interface/Sons', 'MISSING', { impact: 1, note: 'aucun point d’accroche audio' }),
];

/* ================================================================== */
/* Assemblage et lecture                                               */
/* ================================================================== */

export const ALL_FEATURES: Feature[] = [
  ...CORE, ...EDUCATION, ...RELATIONS, ...CAREER, ...SPECIAL,
  ...ACTIVITIES, ...ASSETS, ...FINANCE, ...CRIME, ...FAME, ...LEGACY,
];

/** Score de couverture d'un ensemble de feuilles, pondéré par l'impact. */
export function coverage(features: Feature[] = ALL_FEATURES): number {
  const total = features.reduce((s, x) => s + (x.impact ?? 3), 0);
  if (total === 0) return 0;
  const got = features.reduce(
    (s, x) => s + STATUS_WEIGHT[x.status] * (x.impact ?? 3),
    0,
  );
  return got / total;
}

/** Les catégories, dans l'ordre du rapport. */
export function categories(): string[] {
  return [...new Set(ALL_FEATURES.map(categoryOf))];
}

export function byCategory(category: string): Feature[] {
  return ALL_FEATURES.filter((x) => categoryOf(x) === category);
}

export function byStatus(status: Status): Feature[] {
  return ALL_FEATURES.filter((x) => x.status === status);
}

/**
 * L'ordre de travail.
 *
 * On ne trie pas par état mais par **impact perdu** : une feuille à fort
 * impact et absente pèse plus qu'une feuille anecdotique. C'est ce chiffre,
 * et non une intuition, qui décide du prochain chantier.
 */
export function lostImpact(feature: Feature): number {
  return (feature.impact ?? 3) * (1 - STATUS_WEIGHT[feature.status]);
}

export function workOrder(limit = 40): Feature[] {
  return [...ALL_FEATURES]
    .filter((x) => lostImpact(x) > 0)
    .sort((a, b) => lostImpact(b) - lostImpact(a) || a.path.localeCompare(b.path))
    .slice(0, limit);
}

/**
 * La catégorie qui perd le plus.
 *
 * C'est elle qu'il faut traiter ensuite : la consigne est de terminer un
 * domaine en profondeur plutôt que d'effleurer trente feuilles.
 */
export function worstCategory(): { category: string; lost: number; missing: number }[] {
  return categories()
    .map((category) => {
      const items = byCategory(category);
      return {
        category,
        lost: items.reduce((s, x) => s + lostImpact(x), 0),
        missing: items.filter((x) => x.status === 'MISSING').length,
      };
    })
    .sort((a, b) => b.lost - a.lost);
}

/** Feuilles orphelines : ni dépendance déclarée, ni conséquence. */
export function orphans(): Feature[] {
  return ALL_FEATURES.filter(
    (x) => x.status !== 'MISSING' && !x.tooling
      && !x.cons && (x.deps ?? []).length === 0,
  );
}
