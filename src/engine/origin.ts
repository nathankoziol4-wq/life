/**
 * Modèle de données de l'environnement de naissance (« WorldOrigin »).
 *
 * Tout ce qui décrit *où* et *dans quoi* le personnage naît et grandit vit
 * ici. Aucune logique : uniquement des formes de données sérialisables.
 *
 * Règle de conception : chaque champ déclaré dans ce fichier doit être
 * consommé quelque part par le moteur. L'audit `validateEnvironmentImpact()`
 * (voir `systems/environmentAudit.ts`) échoue si un champ n'a aucune
 * conséquence — c'est ce qui empêche les « réglages décoratifs ».
 */

import type { Person, Sex } from './types.ts';

/* ------------------------------------------------------------------ */
/* Région et ville                                                     */
/* ------------------------------------------------------------------ */

export type CitySize = 'village' | 'petite ville' | 'ville moyenne' | 'grande ville' | 'métropole' | 'capitale';

/** Profil d'une région. Toutes les valeurs 0-100 sauf mention contraire. */
export interface RegionProfile {
  id: string;
  name: string;
  /** Vitalité économique locale. */
  economy: number;
  /** Multiplicateur du coût de la vie régional (1 = moyenne nationale). */
  costMult: number;
  /** Densité de population. */
  density: number;
  /** 0 = froid et rude, 100 = doux toute l'année. */
  climate: number;
  /** Secteurs dominants — oriente les offres d'emploi locales. */
  dominantSectors: string[];
  /** Tension du marché immobilier (multiplicateur de prix). */
  propertyMult: number;
  /** Qualité des infrastructures publiques. */
  infrastructure: number;
  /** Densité et qualité du réseau de transport. */
  transport: number;
  /** Présence d'universités. */
  universities: number;
  /** Part urbaine de la région. */
  urbanisation: number;
}

/** Profil d'une ville, dérivé de sa taille et de sa région. */
export interface CityProfile {
  name: string;
  size: CitySize;
  /** Population approximative. */
  population: number;
  density: number;
  costMult: number;
  /** Multiplicateur des prix à l'achat. */
  propertyMult: number;
  /** Multiplicateur des loyers. */
  rentMult: number;
  /** Multiplicateur des salaires locaux. */
  salaryMult: number;
  /** Taux de chômage local, en pourcentage. */
  unemployment: number;
  safety: number;
  transport: number;
  pollution: number;
  greenSpace: number;
  entertainment: number;
  universities: number;
  schools: number;
  employers: number;
  healthcare: number;
  shops: number;
  sports: number;
  culture: number;
  nightlife: number;
  /** Diversité et volume des débouchés professionnels. */
  jobOpportunity: number;
}

/* ------------------------------------------------------------------ */
/* Quartier                                                            */
/* ------------------------------------------------------------------ */

export type ResidentialZone =
  | 'centre-ville'
  | 'banlieue résidentielle'
  | 'quartier pavillonnaire'
  | 'logement social'
  | 'zone rurale'
  | 'quartier étudiant'
  | 'périphérie'
  | 'quartier huppé';

/**
 * Le quartier est l'un des systèmes centraux du jeu. Ses valeurs évoluent
 * année après année et alimentent presque tous les contextes.
 */
export interface NeighborhoodProfile {
  archetypeId: string;
  name: string;
  zone: ResidentialZone;

  /** Revenu médian du quartier, en monnaie de référence annuelle. */
  medianIncome: number;
  /** Multiplicateur local des prix immobiliers. */
  propertyMult: number;
  /** Multiplicateur local des loyers. */
  rentMult: number;

  safety: number;
  schoolQuality: number;
  density: number;
  cleanliness: number;
  pollution: number;
  noise: number;
  greenSpace: number;
  transport: number;
  shops: number;
  sportsFacilities: number;
  childActivities: number;
  healthAccess: number;
  socialLife: number;
  localEmployment: number;
  /** Stabilité résidentielle : 100 = personne ne déménage jamais. */
  residentialStability: number;
  /** Réputation du quartier auprès du reste de la ville. */
  reputation: number;

  /* Axes synthétiques utilisés directement par les systèmes. */
  socialOpportunity: number;
  economicOpportunity: number;
  educationAccess: number;
  crimeExposure: number;
  communityCohesion: number;
}

/* ------------------------------------------------------------------ */
/* Logement et conditions de vie                                       */
/* ------------------------------------------------------------------ */

export type HousingType =
  | 'chambre'
  | 'studio'
  | 'petit appartement'
  | 'appartement'
  | 'grande résidence'
  | 'maison mitoyenne'
  | 'maison'
  | 'pavillon'
  | 'villa'
  | 'ferme'
  | 'propriété de luxe';

export type Tenure = 'locataire' | 'propriétaire' | 'accédant' | 'logé' | 'logement social';

export interface HousingProfile {
  type: HousingType;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  /** État général 0-100. */
  condition: number;
  /** Isolation thermique et phonique. */
  insulation: number;
  /** Confort perçu, dérivé de la surface, de l'état et des équipements. */
  comfort: number;
  value: number;
  tenure: Tenure;
  /** Mensualité annuelle (loyer ou crédit). */
  annualHousingCost: number;
  occupants: number;
}

/**
 * Conditions de vie concrètes. Chaque booléen a une conséquence mesurable —
 * modeste isolément, significative en s'accumulant (cf. §33 et §34).
 */
export interface LivingConditions {
  /** Chambre pour soi tout seul. */
  ownBedroom: boolean;
  /** Un endroit calme pour travailler. */
  studySpace: boolean;
  computer: boolean;
  internet: boolean;
  heating: boolean;
  airConditioning: boolean;
  familyCar: boolean;
  garden: boolean;
  outdoorSpace: boolean;
  booksAtHome: boolean;
  musicalInstrument: boolean;
}

/* ------------------------------------------------------------------ */
/* Infrastructures de proximité                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce qui se trouve à distance de marche. Les valeurs sont des *minutes de
 * trajet* ; `null` signifie « pas d'accès raisonnable ».
 */
export interface NearbyInfrastructure {
  park: number | null;
  stadium: number | null;
  gym: number | null;
  library: number | null;
  cinema: number | null;
  mall: number | null;
  shops: number | null;
  publicTransport: number | null;
  sportsClub: number | null;
  musicSchool: number | null;
  pool: number | null;
  nature: number | null;
}

export type CommuteMode = 'à pied' | 'vélo' | 'bus' | 'métro' | 'train' | 'voiture';

export interface TransportProfile {
  /** Mode principal pour aller à l'école. */
  schoolMode: CommuteMode;
  /** Minutes de trajet jusqu'à l'école. */
  schoolMinutes: number;
  /** Minutes de trajet moyen des parents jusqu'au travail. */
  parentCommuteMinutes: number;
  /** Accessibilité du centre-ville, 0-100. */
  cityCenterAccess: number;
}

/* ------------------------------------------------------------------ */
/* École                                                               */
/* ------------------------------------------------------------------ */

export interface SchoolProfile {
  archetypeId: string;
  name: string;
  /** Niveau académique moyen. */
  academic: number;
  /** Nombre d'élèves dans l'établissement. */
  students: number;
  /** Élèves par classe. */
  classSize: number;
  budget: number;
  reputation: number;
  discipline: number;
  safety: number;
  facilities: number;
  clubs: number;
  sports: number;
  teacherQuality: number;
  /** Diversité des programmes proposés. */
  programBreadth: number;
  /** Pression scolaire exercée sur les élèves. */
  pressure: number;
  /** Milieu social moyen des élèves. */
  socialMix: number;
  /** Frais de scolarité annuels (0 pour le public). */
  tuition: number;
}

/* ------------------------------------------------------------------ */
/* Foyer et famille                                                    */
/* ------------------------------------------------------------------ */

export type FamilyStructure =
  | 'deux parents'
  | 'parent seul'
  | 'parents séparés'
  | 'famille recomposée'
  | 'adoption'
  | 'famille d’accueil'
  | 'grands-parents';

export type FinancialBehaviour = 'très économe' | 'prudent' | 'équilibré' | 'dépensier' | 'très dépensier';

/** Style parental, un jeu de valeurs par parent. */
export interface ParentingStyle {
  affection: number;
  authority: number;
  discipline: number;
  control: number;
  supervision: number;
  freedom: number;
  academicExpectation: number;
  encouragement: number;
  communication: number;
  emotionalSupport: number;
  financialSupport: number;
  patience: number;
}

/** Disponibilité d'un parent. */
export interface ParentAvailability {
  /** Heures travaillées par semaine. */
  workHours: number;
  /** Heures de présence effective à la maison, par semaine. */
  homeHours: number;
  /** Implication dans le quotidien de l'enfant, 0-100. */
  involvement: number;
  /** Disponibilité émotionnelle, 0-100. */
  emotionalAvailability: number;
  /** Participation aux activités de l'enfant, 0-100. */
  activityParticipation: number;
}

/** Ce que la famille valorise. Influence lentement l'enfant. */
export interface FamilyValues {
  school: number;
  sport: number;
  money: number;
  work: number;
  autonomy: number;
  family: number;
  manners: number;
  creativity: number;
  achievement: number;
  leisure: number;
}

/** Climat du foyer, réévalué chaque année. */
export interface HouseholdAtmosphere {
  calm: number;
  conflict: number;
  affection: number;
  communication: number;
  stability: number;
  stress: number;
  organisation: number;
  privacy: number;
}

/** Relation entre les deux parents. */
export interface CoupleBond {
  love: number;
  trust: number;
  conflict: number;
  communication: number;
  fidelity: number;
  stability: number;
  /** Dépendance financière du parent le moins rémunéré, 0-100. */
  financialDependence: number;
  sharedProjects: number;
}

/** Économie du foyer, recalculée chaque année. */
export interface HouseholdFinance {
  /** Salaires par identifiant de PNJ. */
  salaries: Record<string, number>;
  otherIncome: number;
  benefits: number;
  assets: number;
  savings: number;
  debt: number;
  /** Coût annuel du logement. */
  housingCost: number;
  livingExpenses: number;
  dependents: number;
  behaviour: FinancialBehaviour;
  /** Stabilité de l'emploi des parents, 0-100. */
  jobSecurity: number;
  /** Revenu disponible après charges — la vraie mesure du niveau de vie. */
  disposableIncome: number;
  /** Tension financière ressentie, 0-100. */
  financialStress: number;
}

/** Environnement social autour du foyer. */
export interface SocialEnvironment {
  communityCohesion: number;
  neighbourTrust: number;
  localActivities: number;
  isolation: number;
  residentialMobility: number;
  socialOpportunities: number;
  /** Nombre d'enfants du même âge dans le voisinage. */
  peersNearby: number;
}

/** Conjoncture économique locale, distincte de la conjoncture nationale. */
export interface LocalEconomy {
  unemployment: number;
  growth: number;
  /** Indice local des prix, 1 = référence à la naissance. */
  priceIndex: number;
  housingMarket: number;
  businessCreation: number;
  businessClosure: number;
}

/* ------------------------------------------------------------------ */
/* Opportunités et difficultés                                         */
/* ------------------------------------------------------------------ */

/** Axes d'opportunité. Multidimensionnels à dessein (§29). */
export interface OpportunityAxes {
  education: number;
  career: number;
  financial: number;
  social: number;
  cultural: number;
  sport: number;
}

/** Axes de difficulté. Ils ne condamnent rien, ils compliquent (§30). */
export interface DifficultyAxes {
  financial: number;
  familyInstability: number;
  education: number;
  social: number;
  geographicIsolation: number;
}

/* ------------------------------------------------------------------ */
/* Apparence et génétique                                              */
/* ------------------------------------------------------------------ */

export interface Appearance {
  faceShape: string;
  eyeColor: string;
  hairColor: string;
  hairStyle: string;
  skinTone: string;
  /** Taille adulte projetée, en cm. */
  targetHeight: number;
  build: 'mince' | 'athlétique' | 'moyenne' | 'robuste' | 'ronde';
  features: string[];
}

/** Prédispositions héritées. Elles modulent, elles ne décident pas. */
export interface Genetics {
  /** Potentiel cognitif hérité, 0-100. */
  cognitivePotential: number;
  /** Potentiel athlétique hérité, 0-100. */
  athleticPotential: number;
  /** Robustesse générale, 0-100. */
  constitution: number;
  /** Longévité familiale, en années d'écart par rapport à la moyenne. */
  longevityBonus: number;
  /** Identifiants de maladies pour lesquelles le risque est accru. */
  predispositions: string[];
}

/**
 * Tempérament de naissance : stable toute la vie, à distinguer de la
 * personnalité acquise qui, elle, se construit par l'expérience (§39).
 */
export interface Temperament {
  /** Réactivité émotionnelle. */
  reactivity: number;
  /** Sociabilité innée. */
  sociability: number;
  /** Persévérance naturelle. */
  persistence: number;
  /** Goût du risque. */
  boldness: number;
  /** Sensibilité aux autres. */
  sensitivity: number;
  /** Curiosité. */
  curiosity: number;
}

/** Traits acquis, qui évoluent avec l'environnement et les choix. */
export interface AcquiredTraits {
  ambition: number;
  discipline: number;
  confidence: number;
  empathy: number;
  independence: number;
  materialism: number;
  studiousness: number;
  athleticism: number;
  creativity: number;
  sociability: number;
}

/* ------------------------------------------------------------------ */
/* Assemblage                                                          */
/* ------------------------------------------------------------------ */

/** Un parent, avec tout ce qui le distingue d'un PNJ ordinaire. */
export interface ParentRole {
  personId: string;
  role: 'mère' | 'père' | 'belle-mère' | 'beau-père' | 'tuteur';
  education: number;
  employer: string | null;
  style: ParentingStyle;
  availability: ParentAvailability;
  behaviour: FinancialBehaviour;
  /** Le parent vit-il au foyer ? */
  inHousehold: boolean;
}

/** Instantané de l'environnement à une période donnée (§37). */
export interface EnvironmentSnapshot {
  fromAge: number;
  toAge: number | null;
  cityName: string;
  neighborhoodName: string;
  zone: ResidentialZone;
  housingType: HousingType;
  reason: string;
}

/** Un souvenir marquant, rattaché à l'environnement (§38). */
export interface Memory {
  id: string;
  age: number;
  kind: 'lieu' | 'personne' | 'épreuve' | 'joie' | 'rupture';
  text: string;
  /** Intensité 0-100 : détermine la probabilité de resurgir. */
  weight: number;
}

/** Racine de l'environnement de naissance et de son évolution. */
export interface WorldOrigin {
  countryId: string;
  region: RegionProfile;
  city: CityProfile;
  neighborhood: NeighborhoodProfile;
  housing: HousingProfile;
  living: LivingConditions;
  infrastructure: NearbyInfrastructure;
  transport: TransportProfile;
  school: SchoolProfile | null;
  structure: FamilyStructure;
  parents: ParentRole[];
  couple: CoupleBond | null;
  values: FamilyValues;
  atmosphere: HouseholdAtmosphere;
  finance: HouseholdFinance;
  social: SocialEnvironment;
  economy: LocalEconomy;
  opportunities: OpportunityAxes;
  difficulties: DifficultyAxes;
  /** Explication d'une situation atypique choisie par le joueur (§44). */
  anomalyExplanation: string | null;
  /** Historique des environnements traversés. */
  history: EnvironmentSnapshot[];
  /** Souvenirs marquants. */
  memories: Memory[];
}

/** Brouillon de création, manipulé par l'interface avant de lancer la vie. */
export interface OriginDraft {
  seed: number;
  presetId: string;
  countryId: string;
  regionId: string;
  cityName: string;
  neighborhoodId: string;
  zone: ResidentialZone;
  housingType: HousingType;
  tenure: Tenure;
  structure: FamilyStructure;
  siblings: { sex: Sex; ageGap: number; kind: 'plein' | 'demi' | 'adoptif' }[];
  /** Surcharges explicites du joueur, par chemin de champ. */
  overrides: Record<string, number | string | boolean>;
  firstName: string | null;
  lastName: string | null;
  sex: Sex | null;
  appearance: Partial<Appearance>;
  temperament: Partial<Temperament>;
  anomalyExplanation: string | null;
}

/** Un parent tel que manipulé par l'interface de création. */
export type ParentSummary = ParentRole & { person: Person };
