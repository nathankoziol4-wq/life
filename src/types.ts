/**
 * LifeSim X100 — Types du domaine
 * ---------------------------------
 * Ce fichier centralise TOUS les types partagés entre les données, le moteur
 * et l'UI. Principe fondateur du jeu : rien n'est décoratif. Chaque choix de
 * création pousse un ou plusieurs `Modifier` qui façonnent mécaniquement le
 * personnage puis toute sa vie.
 */

// ---------------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------------

/** Les huit stats de base réparties à la création puis qui évoluent à vie. */
export type StatKey =
  | "intelligence"
  | "charisme"
  | "sante"
  | "physique"
  | "creativite"
  | "discipline"
  | "chance"
  | "bonheur";

export const STAT_KEYS: StatKey[] = [
  "intelligence",
  "charisme",
  "sante",
  "physique",
  "creativite",
  "discipline",
  "chance",
  "bonheur",
];

export const STAT_LABELS: Record<StatKey, string> = {
  intelligence: "Intelligence",
  charisme: "Charisme",
  sante: "Santé",
  physique: "Physique",
  creativite: "Créativité",
  discipline: "Discipline",
  chance: "Chance",
  bonheur: "Bonheur",
};

export type Stats = Record<StatKey, number>;

// ---------------------------------------------------------------------------
// MODIFICATEURS (le cœur du "chaque choix = impact chiffré")
// ---------------------------------------------------------------------------

/**
 * Un modificateur est l'unité atomique d'impact. Chaque option de création,
 * chaque conséquence d'événement, en émet un ou plusieurs. Ils sont empilables
 * et appliqués de façon déterministe (voir engine/modifiers.ts).
 */
export interface Modifier {
  /** Cible : une stat, ou un champ méta (voir MetaKey). */
  target: StatKey | MetaKey;
  /** Type d'application. */
  op: "add" | "mult" | "set" | "min" | "max";
  /** Valeur numérique appliquée. */
  value: number;
  /** Étiquette lisible pour l'écran de récap d'impact. */
  label: string;
  /** Source (catégorie de création ou événement) pour le regroupement UI. */
  source: string;
}

/**
 * Champs "méta" non-stats influencés par la création : espérance de vie de base,
 * argent de départ, plafonds/planchers de stats, multiplicateurs de coûts, etc.
 */
export type MetaKey =
  | "lifeExpectancy" // espérance de vie de base (années)
  | "startingMoney" // argent de départ (€)
  | "incomeMultiplier" // multiplicateur de revenu (contexte pays/social)
  | "educationCostMultiplier" // coût des études
  | "healthcareQuality" // 0–100 qualité système de santé
  | "crimeExposure" // 0–100 exposition à la criminalité
  | "networkQuality" // 0–100 réseau social hérité
  | "inheritance" // héritage potentiel (€)
  | "familyDebt" // dettes familiales (€)
  | "learningMultiplier" // vitesse d'apprentissage globale
  | "fertility" // 0–100
  | "addictionRisk" // 0–100 prédisposition addictions
  | "mentalHealth"; // 0–100 santé mentale de départ

export const META_LABELS: Record<MetaKey, string> = {
  lifeExpectancy: "Espérance de vie",
  startingMoney: "Argent de départ",
  incomeMultiplier: "Mult. de revenu",
  educationCostMultiplier: "Coût des études",
  healthcareQuality: "Qualité santé publique",
  crimeExposure: "Exposition criminalité",
  networkQuality: "Réseau familial",
  inheritance: "Héritage potentiel",
  familyDebt: "Dettes familiales",
  learningMultiplier: "Vitesse d'apprentissage",
  fertility: "Fertilité",
  addictionRisk: "Risque d'addiction",
  mentalHealth: "Santé mentale",
};

export type MetaStats = Record<MetaKey, number>;

// ---------------------------------------------------------------------------
// OPTIONS DE CRÉATION
// ---------------------------------------------------------------------------

/** Une option sélectionnable dans une catégorie de création. */
export interface ChoiceOption {
  id: string;
  label: string;
  /** Courte description affichée dans la carte. */
  description?: string;
  /** Emoji / pictogramme. */
  icon?: string;
  /** Modificateurs émis si cette option est retenue. */
  modifiers: Modifier[];
  /** Tags exploités par le moteur d'événements (requires/unlocks). */
  tags?: string[];
  /** Difficulté additionnelle (pour malédictions/défis). */
  difficulty?: number;
}

// ---------------------------------------------------------------------------
// DONNÉES DE RÉFÉRENCE (pays, époques, etc.)
// ---------------------------------------------------------------------------

export interface Country extends ChoiceOption {
  language: string;
  region: string;
}

export interface Era extends ChoiceOption {
  yearStart: number;
  yearEnd: number;
}

export interface Trait extends ChoiceOption {
  /** Axe moral indicatif : -1 opportuniste … +1 altruiste. */
  moralAxis?: number;
}

// ---------------------------------------------------------------------------
// PERSONNAGE
// ---------------------------------------------------------------------------

export interface Genetics {
  bloodType: string;
  predispositions: string[]; // ids depuis data/genetics
  allergies: string[];
  disability?: string;
}

export interface CharacterCreation {
  // Identité
  firstName: string;
  lastName: string;
  sex: "homme" | "femme" | "non-binaire";
  genderNote?: string;

  // Onglet 1 — Origine & contexte
  countryId: string;
  eraId: string;
  socialClassId: string;
  familyStructureId: string;
  cityTypeId: string; // métropole / ville / campagne
  religionId: string;

  // Onglet 2 — Génétique & physique
  appearance: number; // 0–100
  height: number; // cm
  build: string; // corpulence id
  genetics: Genetics;
  skinToneId: string;
  hairId: string;
  eyesId: string;
  featureId: string; // trait distinctif
  voiceId: string;

  // Onglet 3 — Stats de base (points répartis)
  allocatedStats: Stats;

  // Onglet 4 — Personnalité
  traitIds: string[];
  moralAlignment: number; // -100 opportuniste … +100 altruiste
  orientationId: string; // orientation sexuelle
  valueIds: string[]; // valeurs cardinales (choix multiple)
  fearIds: string[]; // peurs (choix multiple)
  temperamentId: string;

  // Onglet 5 — Talents & défis
  talentIds: string[];
  challengeIds: string[];
  viceIds: string[]; // vices/habitudes de départ

  // Onglet 6 — Rêves & astrologie
  lifeGoalId: string; // objectif de vie (condition de "réussite")
  zodiacId: string;
  startingKarma: number; // -50 … +50
}

/** Personnage vivant, dérivé de CharacterCreation + modificateurs appliqués. */
export interface Character {
  creation: CharacterCreation;
  age: number;
  alive: boolean;
  stats: Stats;
  meta: MetaStats;
  money: number;
  /** Espérance de vie effective, recalculée avec le mode de vie. */
  lifeExpectancy: number;
  /** Journal de mémoire : tags accumulés qui débloquent/verrouillent des events. */
  memory: string[];
  /** Relations (famille, amis, partenaires, ennemis). */
  relationships: Relationship[];
  /** Carrière courante. */
  job?: JobState;
  educationLevel: number; // 0 aucun … 5 doctorat
  /** Historique année par année pour le résumé final. */
  history: LifeLogEntry[];
  /** Traits/tags de santé actifs (maladies déclenchées). */
  conditions: string[];
  addictions: string[];
  /** Actions "once" déjà réalisées (ids). */
  actionsDone: string[];
  /** Cooldowns d'actions : id -> âge de dernière utilisation. */
  actionCooldowns: Record<string, number>;
  /** Patrimoine : biens possédés (immobilier, placements…). */
  assets: Asset[];
  /** État d'incarcération (absent = libre). */
  prison?: PrisonState;
  /** Historique carcéral : nombre de séjours purgés. */
  timesJailed: number;
  /** Inventaire d'objets possédés (ids depuis data/crimeItems & autres). */
  inventory: string[];
}

/** Sous-branche (sous-menu) au sein d'une branche d'actions. */
export interface SubBranchInfo {
  id: string;
  branch: ActionBranch;
  label: string;
  icon: string;
  description?: string;
  /** Rendu spécial "boutique" : liste des objets achetables. */
  shop?: boolean;
}

/** Objet achetable en boutique (marché noir, etc.). */
export interface ShopItem {
  id: string;
  label: string;
  icon: string;
  price: number;
  description: string;
  /** Réduit la difficulté (bonus au taux de réussite) des crimes portant ces tags. */
  helps?: { tags: string[]; bonus: number };
}

/** État d'incarcération courant. */
export interface PrisonState {
  /** Durée totale de la peine (années). */
  sentence: number;
  /** Années déjà purgées. */
  yearsServed: number;
  /** Motif de la condamnation. */
  reason: string;
  /** Comportement en détention 0–100 : conditionne la libération conditionnelle. */
  behavior: number;
}

export interface Asset {
  id: string;
  label: string;
  kind: "immobilier" | "placement" | "vehicule" | "objet";
  value: number;
}

export interface Relationship {
  id: string;
  name: string;
  kind: "parent" | "fratrie" | "ami" | "partenaire" | "ennemi" | "enfant";
  closeness: number; // -100 … +100
  alive: boolean;
  note?: string;
}

export interface JobState {
  careerId: string;
  title: string;
  level: number;
  salary: number;
}

export interface LifeLogEntry {
  age: number;
  text: string;
  tone: "neutre" | "positif" | "negatif" | "special";
}

// ---------------------------------------------------------------------------
// MOTEUR D'ÉVÉNEMENTS
// ---------------------------------------------------------------------------

export interface EventChoice {
  label: string;
  /** Effets appliqués si ce choix est retenu (branche succès si `chance`). */
  effects: EventEffect[];
  /** Condition d'affichage du choix (ex. requiert un trait). */
  requires?: EventCondition;
  /** Texte d'explication du choix, affiché dans l'aperçu de conséquences. */
  detail?: string;
  /** Si défini (0–1), le choix est un pari : proba de succès (pondérée par la Chance). */
  chance?: number;
  /** Effets appliqués en cas d'échec du pari. */
  failEffects?: EventEffect[];
}

export interface EventEffect {
  modifiers?: Modifier[];
  /** Tags ajoutés à la mémoire (déclencheurs futurs). */
  addMemory?: string[];
  /** Argent gagné/perdu. */
  money?: number;
  /** Conditions de santé ajoutées. */
  addCondition?: string[];
  /** Texte de résolution affiché après le choix. */
  outcome: string;
  /** Impact relationnel : id relation -> delta closeness. */
  relationshipDelta?: { kind: Relationship["kind"]; delta: number };
  /** Ajoute un objet à l'inventaire (achat en boutique). */
  addItem?: string;
  /** Envoie le personnage en prison (peine ferme). */
  jail?: { years: number; reason: string };
  /** Réduit/annule la peine en cours (libération, remise de peine). */
  release?: boolean;
}

/** Conditions de déclenchement d'un événement. */
export interface EventCondition {
  minAge?: number;
  maxAge?: number;
  /** Tags requis dans la mémoire OU la création. */
  requiresTags?: string[];
  /** Tags interdits. */
  forbidsTags?: string[];
  /** Contraintes de stat (min). `mentalHealth` (méta) est accepté et géré à part. */
  minStats?: Partial<Stats> & { mentalHealth?: number };
  /** Contraintes de stat (max). `mentalHealth` (méta) est accepté et géré à part. */
  maxStats?: Partial<Stats> & { mentalHealth?: number };
  /** Plage d'années historiques (époque). */
  yearRange?: [number, number];
}

export interface GameEvent {
  id: string;
  title: string;
  /** Corps narratif. Peut contenir des variables interpolées {name}. */
  text: string;
  category: "enfance" | "ado" | "adulte" | "sante" | "carriere" | "relation" | "histoire" | "special";
  /** Poids de base (pondéré ensuite par la Chance et les stats). */
  weight: number;
  condition?: EventCondition;
  /** Choix proposés. Si vide, événement purement narratif à effet direct. */
  choices: EventChoice[];
  /** Effet direct (événement sans choix). */
  autoEffects?: EventEffect[];
  /** Un événement "once" ne se déclenche qu'une fois par vie. */
  once?: boolean;
  /** Événement produit par le moteur génératif (pour badge UI). */
  generated?: boolean;
}

// ---------------------------------------------------------------------------
// ACTIONS (barre du bas façon BitLife)
// ---------------------------------------------------------------------------

/** Branches d'actions affichées dans la barre du bas. */
export type ActionBranch =
  | "savoir"
  | "travail"
  | "crime"
  | "corps"
  | "social"
  | "argent"
  | "loisirs";

export interface ActionBranchInfo {
  id: ActionBranch;
  label: string;
  icon: string;
}

/**
 * Une action initiée par le joueur depuis la barre du bas. Contrairement aux
 * événements (subis), les actions sont choisies activement, autant de fois que
 * voulu par an (sous réserve de coûts, cooldowns et conditions).
 */
export interface Action {
  id: string;
  branch: ActionBranch;
  label: string;
  icon: string;
  description: string;
  /** Coût en argent (positif = dépense). */
  cost?: number;
  condition?: EventCondition;
  /** Ne peut être réalisée qu'une fois dans la vie. */
  once?: boolean;
  /** Nombre d'années avant de pouvoir refaire l'action. */
  cooldown?: number;
  /** Action réservée à la détention (visible/faisable uniquement en prison). */
  prison?: boolean;
  /** Sous-branche (sous-menu) au sein d'une branche, ex. "scam", "braquage". */
  subBranch?: string;
  /** Objet requis dans l'inventaire pour tenter l'action. */
  requiresItem?: string;
  /** Tags de crime : les objets possédés portant ces tags réduisent la difficulté. */
  crimeTags?: string[];
  /** Effet déterministe appliqué immédiatement. */
  effects?: EventEffect[];
  /**
   * Action à résultat aléatoire pondéré par la Chance : `successRate` de base,
   * puis effets `success` / `failure` selon le tirage.
   */
  risky?: { successRate: number; success: EventEffect; failure: EventEffect };
}
