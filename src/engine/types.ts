/**
 * Odyssia — modèles de données du moteur.
 * Ce fichier ne contient AUCUNE logique : uniquement les formes de données
 * partagées entre les systèmes (`src/systems`) et l'interface (`src/components`).
 */

export type Sex = 'M' | 'F';
export type Orientation = 'hetero' | 'homo' | 'bi';

/** Statistiques du personnage, toutes bornées entre 0 et 100. */
export interface Stats {
  /** Visible — moral général. */
  happiness: number;
  /** Visible — état physique global. */
  health: number;
  /** Visible — capacités cognitives. */
  intelligence: number;
  /** Visible — apparence physique. */
  looks: number;
  /** Interne — pression mentale accumulée. */
  stress: number;
  /** Interne — capacité à tenir ses engagements. */
  discipline: number;
  /** Interne — équilibre moral des actions passées. */
  karma: number;
  /** Interne — image publique. */
  reputation: number;
  /** Interne — condition physique. */
  fitness: number;
  /** Interne — niveau de dépendance (alcool, jeu, substances). */
  addiction: number;
  /** Interne — propension et compétence criminelle. */
  criminality: number;
  /** Interne — capacité à concevoir un enfant. */
  fertility: number;
}

export type StatKey = keyof Stats;

/** Traits de personnalité d'un PNJ (0-100). Stables dans le temps. */
export interface Personality {
  /** Chaleur humaine, gentillesse. */
  warmth: number;
  /** Ambition professionnelle. */
  ambition: number;
  /** Irascibilité. */
  temper: number;
  /** Loyauté / fidélité. */
  loyalty: number;
  /** Générosité financière. */
  generosity: number;
  /** Instabilité mentale. */
  madness: number;
  /** Rigueur. */
  discipline: number;
  /** Religiosité. */
  religiosity: number;
  /** Sociabilité. */
  sociability: number;
}

export type RelationKind =
  | 'father'
  | 'mother'
  | 'stepfather'
  | 'stepmother'
  | 'brother'
  | 'sister'
  | 'son'
  | 'daughter'
  | 'partner'
  | 'spouse'
  | 'ex'
  | 'crush'
  | 'friend'
  | 'bestFriend'
  | 'coworker'
  | 'boss'
  | 'classmate'
  | 'inmate'
  | 'lawyer'
  | 'acquaintance';

/** Une note dans l'historique personnel d'un PNJ. */
export interface PersonEvent {
  year: number;
  text: string;
}

/**
 * Un PNJ persistant. Chaque personnage rencontré est enregistré durablement
 * dans la sauvegarde : il vieillit, évolue et peut mourir même hors écran.
 */
export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  sex: Sex;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  age: number;
  alive: boolean;
  deathYear?: number;
  deathCause?: string;

  stats: Stats;
  personality: Personality;
  orientation: Orientation;

  /** Nature du lien avec le joueur. */
  relation: RelationKind;
  /** Qualité du lien 0-100 (barre de relation). */
  relationship: number;
  /** Ce que le PNJ pense du joueur, 0-100. Diverge de `relationship`. */
  opinion: number;

  wealth: number;
  jobTitle: string | null;
  salary: number;
  maritalStatus: 'single' | 'dating' | 'engaged' | 'married' | 'divorced' | 'widowed';

  parentIds: string[];
  childrenIds: string[];
  partnerId: string | null;
  exPartnerIds: string[];

  /** Année de rencontre avec le joueur. */
  metYear: number;
  /** Dernière année où le joueur a interagi. */
  lastInteractionYear: number;
  /** Interactions déjà faites cette année (limite l'abus d'actions). */
  interactionsThisYear: number;
  /** Le PNJ a-t-il coupé les ponts ? */
  estranged: boolean;
  /** Est-il en prison ? */
  incarcerated: boolean;
  /** Historique personnel. */
  history: PersonEvent[];
  /** Espèce, si le PNJ est un animal de compagnie. */
  petSpecies?: string;
  /** Marqueurs libres (ex: 'cheated', 'knowsSecret'). */
  flags: Record<string, boolean | number | string>;
}

export type EducationStage =
  | 'none'
  | 'nursery'
  | 'primary'
  | 'middle'
  | 'high'
  | 'university'
  | 'graduate'
  | 'vocational'
  | 'graduated'
  | 'dropout';

export interface EducationState {
  stage: EducationStage;
  /** Nom de l'établissement fréquenté. */
  schoolName: string | null;
  /** Année en cours dans le cycle (1-based). */
  yearInStage: number;
  /** Durée totale du cycle. */
  stageLength: number;
  /** Moyenne générale sur 20. */
  grades: number;
  /** Absences cumulées cette année. */
  absences: number;
  /** Effort d'étude choisi pour l'année à venir. */
  effort: 'none' | 'normal' | 'hard';
  /** Filière universitaire choisie. */
  majorId: string | null;
  /** Diplômes obtenus. */
  degrees: Degree[];
  /** Clubs/activités rejoints. */
  clubs: string[];
  /** Bourse obtenue (couvre les frais). */
  scholarship: boolean;
  /** Dette étudiante restante. */
  studentLoan: number;
  /** Niveau d'éducation maximal atteint (pour les prérequis métier). */
  level: EducationLevel;
}

/** Niveaux ordonnés — utilisés pour les prérequis d'embauche. */
export type EducationLevel = 0 | 1 | 2 | 3 | 4;
export const EDU_LEVEL_NAMES: Record<EducationLevel, string> = {
  0: 'Aucun diplôme',
  1: 'Diplôme du secondaire',
  2: 'Formation professionnelle',
  3: 'Diplôme universitaire',
  4: 'Diplôme supérieur',
};

export interface Degree {
  id: string;
  name: string;
  majorId: string | null;
  level: EducationLevel;
  year: number;
  honors: boolean;
}

export interface JobState {
  jobId: string;
  /** Nom du poste au niveau courant (ex: « Développeuse senior »). */
  title: string;
  /** Index dans l'échelle hiérarchique du métier. */
  level: number;
  salary: number;
  employer: string;
  /** Performance au travail 0-100. */
  performance: number;
  yearsAtJob: number;
  /** Effort choisi pour l'année. */
  effort: 'slack' | 'normal' | 'overtime';
  /** Année de la dernière demande d'augmentation (limite le spam). */
  lastRaiseAskYear: number;
  partTime: boolean;
}

export interface OwnedProperty {
  id: string;
  archetypeId: string;
  name: string;
  cityName: string;
  countryId: string;
  /** Prix d'achat. */
  purchasePrice: number;
  purchaseYear: number;
  /** Valeur de marché actuelle. */
  value: number;
  /** État 0-100. */
  condition: number;
  areaM2: number;
  /** Solde restant du crédit. */
  mortgageBalance: number;
  /** Mensualité (annuelle dans la simulation). */
  annualPayment: number;
  mortgageYearsLeft: number;
  interestRate: number;
  /** Charges annuelles (taxes, entretien). */
  annualCost: number;
  /** Le joueur y habite-t-il ? */
  isResidence: boolean;
  /** Mis en location ? */
  rentedOut: boolean;
  annualRentIncome: number;
}

export interface OwnedVehicle {
  id: string;
  modelId: string;
  brand: string;
  model: string;
  year: number;
  purchasePrice: number;
  purchaseYear: number;
  value: number;
  mileage: number;
  /** État 0-100. */
  condition: number;
  reliability: number;
  annualCost: number;
  broken: boolean;
}

export interface ActiveDisease {
  id: string;
  name: string;
  severity: number;
  yearsIll: number;
  treated: boolean;
  chronic: boolean;
  /** Diagnostiquée ? Sinon le joueur ignore son existence. */
  diagnosed: boolean;
}

export interface Conviction {
  crimeId: string;
  crimeName: string;
  year: number;
  sentenceYears: number;
  fine: number;
  appealed: boolean;
}

export interface CriminalRecord {
  arrests: number;
  convictions: Conviction[];
  /** Notoriété dans le milieu, 0-100. */
  notoriety: number;
  /** Crimes commis sans se faire prendre. */
  successfulCrimes: number;
  wanted: boolean;
}

export interface PrisonState {
  yearsLeft: number;
  totalSentence: number;
  security: 'minimum' | 'medium' | 'maximum';
  /** Comportement 0-100 — influence la conditionnelle. */
  behavior: number;
  /** Réputation auprès des détenus 0-100. */
  respect: number;
  paroleDenials: number;
  facilityName: string;
}

export interface WillState {
  /** id du PNJ -> part en pourcentage. */
  shares: Record<string, number>;
  updatedYear: number;
}

export interface FinanceSnapshot {
  year: number;
  income: number;
  taxes: number;
  livingCost: number;
  housing: number;
  debtPayments: number;
  propertyCosts: number;
  vehicleCosts: number;
  familyCosts: number;
  other: number;
  net: number;
}

export interface Loan {
  id: string;
  kind: 'student' | 'personal' | 'mortgage' | 'shark';
  label: string;
  balance: number;
  rate: number;
  annualPayment: number;
  yearsLeft: number;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  age: number;
  happiness: number;
  health: number;
  annualCost: number;
}

export type TimelineKind =
  | 'life'
  | 'money'
  | 'love'
  | 'school'
  | 'work'
  | 'health'
  | 'crime'
  | 'justice'
  | 'family'
  | 'asset'
  | 'random'
  | 'death'
  | 'action';

export interface TimelineEntry {
  id: string;
  year: number;
  age: number;
  kind: TimelineKind;
  text: string;
  /** Bon / mauvais / neutre — pour la couleur de la puce. */
  tone: 'good' | 'bad' | 'neutral';
}

/** Le personnage joué. */
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  sex: Sex;
  orientation: Orientation;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  age: number;
  alive: boolean;
  deathCause: string | null;
  deathYear: number | null;

  countryId: string;
  cityName: string;
  /** Pays de naissance, conservé même après immigration. */
  originCountryId: string;

  stats: Stats;
  money: number;
  /** Argent gagné cumulé sur la vie (pour le récapitulatif). */
  lifetimeEarnings: number;

  education: EducationState;
  job: JobState | null;
  /** Historique de carrière pour le récapitulatif. */
  careerHistory: { title: string; employer: string; from: number; to: number | null }[];
  retired: boolean;
  pension: number;

  properties: OwnedProperty[];
  vehicles: OwnedVehicle[];
  pets: Pet[];
  loans: Loan[];
  /** Objets divers (bijoux, œuvres…). */
  valuables: { id: string; name: string; value: number; purchaseYear: number; purchasePrice: number }[];

  diseases: ActiveDisease[];
  criminalRecord: CriminalRecord;
  prison: PrisonState | null;
  will: WillState;

  /** Suivi social (nombre d'abonnés). */
  followers: number;
  /** Actions déjà réalisées cette année (clé -> compteur). */
  yearActions: Record<string, number>;
  /** Marqueurs persistants divers. */
  flags: Record<string, boolean | number | string>;
  /** Bilans financiers annuels (5 dernières années). */
  financeHistory: FinanceSnapshot[];
}

/** Choix proposé au joueur lors d'un événement. */
export interface EventChoice {
  label: string;
  /** Identifiant du résultat, résolu par le système d'événements. */
  outcome: string;
}

/** Événement interactif en attente de réponse du joueur. */
export interface PendingEvent {
  id: string;
  eventId: string;
  title: string;
  text: string;
  choices: EventChoice[];
  /** PNJ concerné, si applicable. */
  personId?: string;
  /** Données libres transmises au résolveur. */
  payload?: Record<string, unknown>;
  icon: string;
}

/** État du monde partagé (marchés, inflation…). */
export interface WorldState {
  year: number;
  /** Multiplicateur du marché immobilier (1 = référence). */
  propertyIndex: number;
  /** Multiplicateur du marché de l'emploi. */
  jobMarket: number;
  /** Inflation cumulée depuis la naissance. */
  inflation: number;
  /** Conjoncture : -1 récession, 0 normal, 1 croissance. */
  economy: number;
  /** Offres d'emploi disponibles cette année (persistées). */
  jobOffers: JobOffer[];
  /** Biens immobiliers disponibles (régénérés chaque année). */
  propertyListings: PropertyListing[];
  /** Véhicules disponibles. */
  vehicleListings: VehicleListing[];
  /** Prétendants disponibles sur les applications de rencontre. */
  datingPool: string[];
  /** Résultat du dernier tirage de loterie. */
  lastLotteryYear: number;
}

export interface JobOffer {
  id: string;
  jobId: string;
  title: string;
  employer: string;
  salary: number;
  level: number;
  category: string;
  requiresLevel: EducationLevel;
  requiresMajor: string[] | null;
  minExperience: number;
  stress: number;
  hours: number;
}

export interface PropertyListing {
  id: string;
  archetypeId: string;
  name: string;
  cityName: string;
  countryId: string;
  price: number;
  areaM2: number;
  condition: number;
  annualCost: number;
  annualRentIncome: number;
}

export interface VehicleListing {
  id: string;
  modelId: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  condition: number;
  reliability: number;
  annualCost: number;
  used: boolean;
}

/** Racine de la sauvegarde. */
export interface GameState {
  version: number;
  /** Graine du générateur pseudo-aléatoire. */
  seed: number;
  rngState: number;
  year: number;
  player: Player;
  npcs: Record<string, Person>;
  timeline: TimelineEntry[];
  world: WorldState;
  pending: PendingEvent[];
  /** Compteur pour générer des identifiants uniques. */
  idCounter: number;
  /**
   * Dernière année de déclenchement de chaque événement, pour éviter
   * qu'une même situation ne se répète tous les deux ans.
   */
  eventLog: Record<string, number>;
  /** Vies terminées (mini-historique inter-parties). */
  gameOver: boolean;
}

/** Résultat standard d'une action déclenchée par le joueur. */
export interface ActionResult {
  ok: boolean;
  /** Message affiché dans une modale. */
  message: string;
  /** Titre de la modale. */
  title?: string;
  tone?: 'good' | 'bad' | 'neutral';
  /** Entrées ajoutées à la timeline (déjà appliquées à l'état). */
  entries?: TimelineEntry[];
}
