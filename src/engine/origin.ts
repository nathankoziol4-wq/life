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
import type { Memory, Temperament } from './psyche.ts';

export type { Memory, Temperament };

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

  /* --- Ce qui se joue dans les couloirs plutôt que dans les notes --- */

  /** Niveau moyen réel des camarades : on progresse ou on s'ennuie. */
  peerLevel: number;
  /** Compétition entre élèves. */
  competition: number;
  /** Turn-over des enseignants : élevé = personne ne suit les élèves. */
  teacherTurnover: number;
  /** Fréquence du harcèlement dans l'établissement. */
  bullying: number;
  /** Soutien scolaire disponible. */
  tutoring: number;
  /** Présence d'un accompagnement psychologique. */
  counselling: number;
  /** Qualité de l'orientation donnée aux élèves. */
  guidance: number;
  /** Réseau d'anciens élèves mobilisable plus tard. */
  alumniNetwork: number;
  /** Clubs réellement proposés cette année. */
  offeredClubs: string[];
}

/* ------------------------------------------------------------------ */
/* Classe et vie scolaire                                              */
/* ------------------------------------------------------------------ */

/**
 * La classe où le personnage passe ses journées.
 *
 * L'établissement donne le cadre, la classe donne le quotidien : c'est là
 * que se forment les amitiés, les rivalités, et l'impression d'être à sa
 * place ou non.
 */
/** Rôle d'un membre du personnel dans l'établissement. */
export type StaffRole = 'professeur' | 'professeur principal' | 'directeur' | 'conseiller';

/**
 * Un membre du personnel.
 *
 * Il est adossé à un vrai PNJ (`personId`), donc il a un nom, un âge, une
 * personnalité et une relation avec le joueur comme n'importe qui d'autre.
 * Ce qui suit n'est que ce qui le distingue en tant qu'enseignant.
 */
export interface Staff {
  personId: string;
  role: StaffRole;
  /** Matière enseignée, `null` pour la direction. */
  subject: string | null;
  /** Maîtrise de la matière : ce qu'on apprend réellement avec lui. */
  skill: number;
  /** Sévérité : ce qu'il laisse passer. */
  strictness: number;
  /** Popularité auprès des élèves. */
  popularity: number;
  /** Professionnalisme : sa capacité à ne pas avoir de favoris. */
  professionalism: number;
}

export interface SchoolClass {
  /** Identifiant de l'année scolaire, pour repérer les changements. */
  id: string;
  size: number;
  /** Nom du professeur principal. */
  mainTeacherId: string | null;
  /** Le personnel que l'élève côtoie vraiment. */
  staff: Staff[];
  /** Camarades marquants, PNJ persistants. */
  classmateIds: string[];
  /** Ambiance générale, 0-100. */
  atmosphere: number;
  /** Niveau moyen de la classe. */
  level: number;
  /** Tensions internes. */
  conflict: number;
  /** Groupes sociaux émergents. */
  groups: PeerGroup[];
}

/**
 * Un groupe d'affinité, apparu tout seul.
 *
 * Les groupes ne sont pas des catégories imposées : ils se forment à partir
 * des intérêts et des tempéraments réels des élèves présents, et se défont
 * quand ceux-ci changent.
 */
export interface PeerGroup {
  id: string;
  /** Étiquette descriptive, dérivée de ce qui rassemble. */
  label: string;
  /** Intérêt fédérateur, s'il y en a un. */
  interestId: string | null;
  memberIds: string[];
  /** Statut du groupe dans la classe, 0-100. */
  standing: number;
  /** Le joueur en fait-il partie ? */
  playerMember: boolean;
}

/**
 * Popularité, en plusieurs dimensions.
 *
 * Être connu n'est pas être apprécié : un élève peut avoir une réputation
 * considérable et très peu d'amis. Une note unique effacerait exactement ce
 * qui rend l'adolescence compliquée.
 */
export interface Popularity {
  /** Nombre de personnes qui savent qui vous êtes. */
  known: number;
  /** Personnes qui vous apprécient. */
  liked: number;
  /** Personnes qui vous respectent. */
  respected: number;
  /** Capacité à entraîner les autres. */
  influential: number;
  /** Personnes qui vous craignent. */
  intimidating: number;
  /** Réputation d'être drôle. */
  funny: number;
}

/* ------------------------------------------------------------------ */
/* Foyer et famille                                                    */
/* ------------------------------------------------------------------ */

/**
 * Les sept façons d'être élevé.
 *
 * Une liste réelle, dont le type se déduit — et non l'inverse. C'était un type
 * seul, si bien que la liste existait **en double** dans l'écran de création,
 * recopiée à la main. Deux listes qui doivent rester d'accord finissent par ne
 * plus l'être, et surtout : aucun test ne pouvait vérifier qu'une structure
 * déclarée arrive réellement dans une partie. Elles étaient quatre à ne jamais
 * arriver, et rien ne le disait.
 */
export const FAMILY_STRUCTURES = [
  'deux parents',
  'parent seul',
  'parents séparés',
  'famille recomposée',
  'adoption',
  'famille d’accueil',
  'grands-parents',
] as const;

export type FamilyStructure = (typeof FAMILY_STRUCTURES)[number];

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
/**
 * Emploi du temps d'un parent.
 *
 * Ce n'est pas un détail cosmétique : c'est ce qui décide qui récupère
 * l'enfant à l'école, qui est là au dîner, et combien d'heures de surveillance
 * réelle le foyer offre chaque semaine. Deux parents également aimants n'ont
 * pas la même présence si l'un finit à 17 h et l'autre à 22 h.
 */
export interface ParentSchedule {
  /** Heure de début, en heures décimales (7.5 = 7 h 30). */
  start: number;
  /** Heure de fin. */
  end: number;
  /** Jours travaillés par semaine. */
  daysPerWeek: number;
  /** Travail de nuit, de week-end ou en horaires décalés. */
  shifted: boolean;
  /** Trajet quotidien aller-retour, en minutes. */
  commuteMinutes: number;
  /** Le parent peut-il être présent à la sortie des classes ? */
  canCollectChild: boolean;
  /** Soirs par semaine où il est là au dîner. */
  eveningsHome: number;
}

/**
 * Lien parent-enfant, décomposé.
 *
 * Une barre unique à 80 % ne dit rien : on peut admirer un père qu'on ne
 * comprend pas, aimer une mère à qui l'on ne confie rien. La barre visible
 * dans l'interface n'est qu'une synthèse de ces dimensions.
 */
export interface ParentBond {
  affection: number;
  trust: number;
  respect: number;
  communication: number;
  /** Crainte qu'inspire le parent. */
  fear: number;
  admiration: number;
  frustration: number;
  /** Temps réellement partagé, 0-100. */
  closeness: number;
}

export interface ParentRole {
  personId: string;
  role: 'mère' | 'père' | 'belle-mère' | 'beau-père' | 'tuteur';
  education: number;
  employer: string | null;
  /** Domaine professionnel, pour l'exposition et le réseau. */
  field: string | null;
  style: ParentingStyle;
  availability: ParentAvailability;
  behaviour: FinancialBehaviour;
  schedule: ParentSchedule;
  bond: ParentBond;
  /** Le parent vit-il au foyer ? */
  inHousehold: boolean;
}

/**
 * Lien entre frères et sœurs.
 *
 * L'ordre de naissance compte : un aîné sert de modèle ou de rival, un cadet
 * imite puis se démarque. Ces liens évoluent différemment de ceux du couple
 * parental, et durent souvent plus longtemps.
 */
export interface SiblingBond {
  personId: string;
  affection: number;
  rivalry: number;
  jealousy: number;
  /** Le grand protège-t-il le petit ? */
  protection: number;
  /** Le petit copie-t-il le grand ? */
  imitation: number;
  competition: number;
  /** Positif : le PNJ est plus âgé que le joueur. */
  ageGap: number;
  kind: 'plein' | 'demi' | 'adoptif';
}

/* ------------------------------------------------------------------ */
/* Voisinage immédiat                                                  */
/* ------------------------------------------------------------------ */

/**
 * La rue, distincte du quartier.
 *
 * Deux familles du même quartier ne vivent pas la même chose selon qu'elles
 * habitent une impasse pavillonnaire où six enfants du même âge jouent
 * dehors, ou un boulevard passant où personne ne se connaît.
 */
export interface StreetProfile {
  name: string;
  /** Foyers à portée de voix. */
  households: number;
  /** Densité du bâti : 0 = maisons isolées, 100 = immeubles collés. */
  proximity: number;
  /** Enfants d'âge comparable dans la rue. */
  childrenNearby: number;
  /** Qualité des relations entre voisins, 0-100. */
  neighbourRelations: number;
  noise: number;
  traffic: number;
  /** Espace où jouer ou se retrouver dehors, 0-100. */
  outdoorSpace: number;
  /** Commerces de proximité à pied. */
  shopsWithinWalk: number;
  description: string;
}

/** Un voisin, avec sa famille. */
export interface Neighbour {
  personId: string;
  /** Âge des enfants du foyer voisin. */
  childrenAges: number[];
  /** Identifiants des enfants créés comme PNJ. */
  childIds: string[];
  /** Qualité du lien entre les deux foyers, 0-100. */
  rapport: number;
  /** Depuis quel âge du joueur ce voisin est là. */
  since: number;
}

/* ------------------------------------------------------------------ */
/* Distances et temps                                                  */
/* ------------------------------------------------------------------ */

/** Distances réelles, en mètres, depuis le logement. */
export interface Distances {
  school: number;
  park: number;
  library: number;
  sportsClub: number;
  pool: number;
  shops: number;
  cityCentre: number;
  publicTransport: number;
  cinema: number;
  nature: number;
  grandparents: number;
  bestFriend: number;
}

/**
 * Budget de temps hebdomadaire.
 *
 * Le temps est la vraie ressource rare : on ne peut pas cumuler l'école, deux
 * sports, un instrument, trois heures de trajet et une vie sociale. Ce qui
 * dépasse se paie en fatigue et en sommeil.
 */
export interface TimeBudget {
  /** Heures éveillées disponibles par semaine. */
  total: number;
  school: number;
  homework: number;
  commute: number;
  chores: number;
  activities: number;
  family: number;
  social: number;
  habits: number;
  /** Ce qu'il reste. Négatif = surcharge. */
  free: number;
}

/* ------------------------------------------------------------------ */
/* Capitaux                                                            */
/* ------------------------------------------------------------------ */

/**
 * Les trois capitaux d'un foyer, volontairement séparés.
 *
 * Une famille modeste peut avoir un réseau considérable ; une famille riche
 * peut n'avoir aucun livre à la maison. Confondre les trois reviendrait à
 * dire que tout se réduit à l'argent, ce qui est faux et ennuyeux.
 */
export interface Capitals {
  /** Contacts utiles, leur diversité et leur proximité. */
  social: number;
  /** Livres, discussions, sorties, diplômes des parents. */
  cultural: number;
  /** Revenus, patrimoine, épargne, absence de dettes. */
  economic: number;
}

/** Un contact du réseau familial, mobilisable plus tard. */
export interface FamilyContact {
  personId: string;
  /** Domaine professionnel. */
  field: string;
  /** Influence, 0-100. */
  standing: number;
  /** Proximité avec la famille, 0-100. */
  closeness: number;
  /** A-t-il déjà rendu un service ? */
  used: boolean;
}

/* ------------------------------------------------------------------ */
/* Vie de famille concrète                                             */
/* ------------------------------------------------------------------ */

/** Ce que la famille fait réellement ensemble, en fréquences annuelles. */
export interface FamilyLife {
  /** Repas pris tous ensemble, par semaine. */
  mealsPerWeek: number;
  /** Sorties (restaurant, cinéma, parc), par an. */
  outingsPerYear: number;
  /** Vacances hors du domicile, par an. */
  holidaysPerYear: number;
  /** Visites à la famille élargie, par an. */
  familyVisitsPerYear: number;
  /** Sorties culturelles (musée, concert, théâtre), par an. */
  cultureOutingsPerYear: number;
  /** Activités sportives faites ensemble, par an. */
  sportTogetherPerYear: number;
  /** Discussions sérieuses par mois. */
  seriousTalksPerMonth: number;
}

/** Accès numérique du foyer, décisif à partir des années 2000. */
export interface DigitalAccess {
  /** 'aucun' | 'partagé' | 'personnel' */
  phone: 'aucun' | 'partagé' | 'personnel';
  computer: 'aucun' | 'familial' | 'personnel';
  internet: 'aucun' | 'lent' | 'normal' | 'rapide';
  /** Âge auquel l'enfant a obtenu son premier téléphone. */
  phoneAge: number | null;
  /** Limite de temps d'écran imposée, en heures par jour. 0 = aucune limite. */
  screenLimit: number;
}

/** Ce que les parents autorisent, et à partir de quand. */
export interface Freedoms {
  /** Âge autorisé pour sortir seul. */
  goOutAlone: number;
  /** Heure de retour tolérée à l'adolescence. */
  curfew: number;
  /** Contrôle du téléphone, 0-100. */
  phoneControl: number;
  /** Regard sur les fréquentations, 0-100. */
  friendControl: number;
  /** Autonomie financière accordée, 0-100. */
  financialAutonomy: number;
}

/** Corvées et responsabilités confiées à l'enfant. */
export interface Chores {
  /** Heures par semaine. */
  hoursPerWeek: number;
  /** Garde des frères et sœurs. */
  siblingCare: boolean;
  /** Participation au travail familial (ferme, commerce). */
  familyWork: boolean;
  /** Rémunérées ? */
  paid: boolean;
}

/** Langues parlées au foyer et niveau atteint par l'enfant. */
export interface Languages {
  /** Langue du pays. */
  main: string;
  /** Autres langues parlées à la maison. */
  home: string[];
  /** Maîtrise par langue, 0-100. */
  fluency: Record<string, number>;
}

/** Qualité du sommeil, conséquence discrète mais permanente. */
export interface Sleep {
  /** Heures par nuit. */
  hours: number;
  /** Qualité 0-100 : bruit, chambre partagée, stress, écrans. */
  quality: number;
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
  /** La classe fréquentée cette année. */
  schoolClass: SchoolClass | null;
  /** Position sociale au sein de l'établissement. */
  popularity: Popularity;
  structure: FamilyStructure;
  parents: ParentRole[];
  siblings: SiblingBond[];
  couple: CoupleBond | null;
  values: FamilyValues;
  atmosphere: HouseholdAtmosphere;
  finance: HouseholdFinance;
  social: SocialEnvironment;
  economy: LocalEconomy;
  opportunities: OpportunityAxes;
  difficulties: DifficultyAxes;

  /* --- Couches ajoutées : le quotidien réel --- */

  /** La rue, distincte du quartier. */
  street: StreetProfile;
  /** Foyers voisins, avec leurs enfants. */
  neighbours: Neighbour[];
  /** Distances réelles depuis le logement, en mètres. */
  distances: Distances;
  /** Budget de temps hebdomadaire. */
  time: TimeBudget;
  /** Capitaux social, culturel et économique du foyer. */
  capitals: Capitals;
  /** Réseau mobilisable de la famille. */
  contacts: FamilyContact[];
  /** Ce que la famille fait réellement ensemble. */
  familyLife: FamilyLife;
  /** Accès numérique. */
  digital: DigitalAccess;
  /** Ce que les parents autorisent. */
  freedoms: Freedoms;
  /** Responsabilités confiées. */
  chores: Chores;
  /** Langues du foyer. */
  languages: Languages;
  /** Sommeil. */
  sleep: Sleep;
  /** Stabilité globale du foyer, 0-100. */
  stability: number;
  /** Pression exercée par les parents, 0-100. */
  pressure: number;
  /** Argent de poche annuel réellement versé. */
  allowance: number;
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
  /** Tempérament choisi à la création : les douze axes innés. */
  temperament: Partial<Temperament>;
  /**
   * Potentiels hérités répartis à la création.
   *
   * C'était la seule feuille du groupe « création » sans aucun chemin de
   * données : l'intelligence, l'allure et la santé de départ en viennent, et
   * rien ne permettait d'y toucher. Une enveloppe fixe les borne
   * (`data/cradle.ts#POOL`) — composer rend différent, pas plus fort.
   */
  gifts: Partial<Pick<Genetics, 'cognitivePotential' | 'athleticPotential' | 'constitution'>>;
  anomalyExplanation: string | null;
}

/** Un parent tel que manipulé par l'interface de création. */
export type ParentSummary = ParentRole & { person: Person };
