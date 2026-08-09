/**
 * Odyssia — modèle de la personnalité.
 *
 * Ce fichier ne contient aucune logique : uniquement les formes de données.
 * La génération vit dans `systems/psycheGen.ts`, l'évolution annuelle dans
 * `systems/psyche.ts`, et les conséquences dans `systems/contexts.ts`.
 *
 * La personnalité est construite en couches, de la plus stable à la plus
 * mouvante :
 *
 *   1. `Temperament`   — présent dès la naissance, ne change jamais
 *   2. `PersonalityAxes` — se construit, dérive lentement, peut basculer
 *   3. `Values`        — ce qui compte pour la personne, et donc ce qui la
 *                        rend heureuse ou malheureuse une fois obtenu
 *   4. styles          — comment elle parle, décide, encaisse
 *   5. `SelfImage`     — ce qu'elle pense d'elle-même
 *   6. peurs, intérêts, habitudes, ambitions — ce qu'elle fuit et poursuit
 *
 * Règle de conception, identique à celle de `origin.ts` : chaque champ
 * déclaré ici doit avoir une conséquence mesurable dans la simulation.
 * L'audit `validatePsycheImpact()` (voir `systems/psycheAudit.ts`) échoue si
 * un champ n'en a aucune. C'est ce qui empêche les statistiques décoratives.
 */

import type { RelationKind } from './types.ts';

/* ------------------------------------------------------------------ */
/* 1. Tempérament — inné, immuable                                     */
/* ------------------------------------------------------------------ */

/**
 * Tendances naturelles, visibles dès les premières années.
 *
 * Le tempérament ne dit pas ce que la personne deviendra : un enfant très
 * sensible peut devenir un adulte endurci, un enfant placide peut devenir
 * anxieux. Il dit seulement par où l'expérience va passer.
 */
export interface Temperament {
  /** Niveau d'activité, vitesse de récupération. */
  energy: number;
  /** Intensité du ressenti face à ce qui arrive. */
  sensitivity: number;
  /** Attirance naturelle vers les autres. */
  sociability: number;
  /** Placidité de base, indépendante des circonstances. */
  calm: number;
  /** Aisance face au changement. */
  adaptability: number;
  /** Besoin de comprendre, d'explorer. */
  curiosity: number;
  /** Capacité à rester sur une tâche longue. */
  persistence: number;
  /** Besoin de nouveauté et de sensations. */
  stimulationNeed: number;
  /** Retenue instinctive devant le danger. */
  caution: number;
  /** Vitesse et amplitude de la réaction émotionnelle. */
  emotionalReactivity: number;
  /** Besoin d'être regardé, reconnu. */
  attentionNeed: number;
  /** Seuil avant que la contrariété ne déborde. */
  frustrationTolerance: number;
}

export const TEMPERAMENT_KEYS = [
  'energy', 'sensitivity', 'sociability', 'calm', 'adaptability', 'curiosity',
  'persistence', 'stimulationNeed', 'caution', 'emotionalReactivity',
  'attentionNeed', 'frustrationTolerance',
] as const;

/* ------------------------------------------------------------------ */
/* 2. Axes de personnalité — acquis, évolutifs                         */
/* ------------------------------------------------------------------ */

/**
 * Axes continus, jamais des étiquettes.
 *
 * Aucun de ces axes n'est bon ou mauvais en soi : chacun a un versant utile
 * et un versant coûteux, et les deux sont implémentés. Une très forte
 * ambition fait travailler davantage *et* rend la satisfaction plus difficile ;
 * une très forte prudence évite les catastrophes *et* laisse passer les
 * occasions.
 */
export interface PersonalityAxes {
  extraversion: number;
  confidence: number;
  empathy: number;
  ambition: number;
  discipline: number;
  patience: number;
  impulsivity: number;
  honesty: number;
  loyalty: number;
  generosity: number;
  creativity: number;
  curiosity: number;
  courage: number;
  caution: number;
  aggression: number;
  competitiveness: number;
  jealousy: number;
  independence: number;
  sociability: number;
  sensitivity: number;
  optimism: number;
  adaptability: number;
  organisation: number;
  perseverance: number;
  spontaneity: number;
  emotionalMaturity: number;
  riskTolerance: number;
}

export const AXIS_KEYS = [
  'extraversion', 'confidence', 'empathy', 'ambition', 'discipline', 'patience',
  'impulsivity', 'honesty', 'loyalty', 'generosity', 'creativity', 'curiosity',
  'courage', 'caution', 'aggression', 'competitiveness', 'jealousy',
  'independence', 'sociability', 'sensitivity', 'optimism', 'adaptability',
  'organisation', 'perseverance', 'spontaneity', 'emotionalMaturity',
  'riskTolerance',
] as const;

/** Libellés et double tranchant de chaque axe, pour l'interface. */
export const AXIS_INFO: Record<keyof PersonalityAxes, {
  label: string;
  /** Ce que l'axe apporte quand il est haut. */
  boon: string;
  /** Ce qu'il coûte quand il est haut. */
  cost: string;
}> = {
  extraversion: { label: 'Extraversion', boon: 'se fait remarquer, ose aborder', cost: 'supporte mal la solitude' },
  confidence: { label: 'Assurance', boon: 'tente, demande, négocie', cost: 'se surestime parfois' },
  empathy: { label: 'Empathie', boon: 'liens profonds, karma', cost: 'absorbe la peine des autres' },
  ambition: { label: 'Ambition', boon: 'travaille plus, vise plus haut', cost: 'jamais satisfait, stress' },
  discipline: { label: 'Discipline', boon: 'tient ses engagements', cost: 'rigidité, peu de spontanéité' },
  patience: { label: 'Patience', boon: 'encaisse le long terme', cost: 'laisse traîner ce qui devrait changer' },
  impulsivity: { label: 'Impulsivité', boon: 'saisit l’occasion sans hésiter', cost: 'décisions coûteuses, dépenses' },
  honesty: { label: 'Honnêteté', boon: 'confiance durable', cost: 'refuse des raccourcis rentables' },
  loyalty: { label: 'Loyauté', boon: 'relations qui tiennent', cost: 's’accroche à ce qui la détruit' },
  generosity: { label: 'Générosité', boon: 'aimé, entouré', cost: 'donne ce qu’il n’a pas' },
  creativity: { label: 'Créativité', boon: 'solutions inattendues', cost: 'chemins peu rémunérateurs' },
  curiosity: { label: 'Curiosité', boon: 'apprend vite et partout', cost: 'se disperse' },
  courage: { label: 'Courage', boon: 'affronte, protège', cost: 's’expose au danger' },
  caution: { label: 'Prudence', boon: 'évite les catastrophes', cost: 'manque les occasions' },
  aggression: { label: 'Agressivité', boon: 'ne se laisse pas marcher dessus', cost: 'conflits, réputation' },
  competitiveness: { label: 'Esprit de compétition', boon: 'progresse en se mesurant', cost: 'rivalités, amitiés abîmées' },
  jealousy: { label: 'Jalousie', boon: 'signale ce qui compte vraiment', cost: 'ronge le couple et l’amitié' },
  independence: { label: 'Indépendance', boon: 'se débrouille seul', cost: 'refuse l’aide qui sauverait' },
  sociability: { label: 'Sociabilité', boon: 'réseau large', cost: 'temps englouti' },
  sensitivity: { label: 'Sensibilité', boon: 'perçoit ce que d’autres ratent', cost: 'blessures durables' },
  optimism: { label: 'Optimisme', boon: 'rebondit, ose', cost: 'sous-estime les risques' },
  adaptability: { label: 'Adaptabilité', boon: 'encaisse les changements', cost: 'se dilue, suit le courant' },
  organisation: { label: 'Organisation', boon: 'rien ne se perd', cost: 'supporte mal l’imprévu' },
  perseverance: { label: 'Persévérance', boon: 'finit ce qu’il commence', cost: 's’obstine dans l’impasse' },
  spontaneity: { label: 'Spontanéité', boon: 'vivant, entraînant', cost: 'peu fiable sur la durée' },
  emotionalMaturity: { label: 'Maturité émotionnelle', boon: 'traverse les crises', cost: 'porte tout, ne demande rien' },
  riskTolerance: { label: 'Tolérance au risque', boon: 'investit, entreprend', cost: 'pertes sèches' },
};

/* ------------------------------------------------------------------ */
/* 3. Valeurs — ce qui rend heureux ou malheureux                      */
/* ------------------------------------------------------------------ */

/**
 * Importance accordée à chaque chose, 0-100.
 *
 * Les valeurs ne décrivent pas ce que la personne *a*, mais ce à quoi elle
 * tient. Elles servent à deux choses : orienter les décisions, et décider si
 * une situation donnée rend heureux. Deux personnes dans la même vie n'en
 * tirent pas la même satisfaction.
 */
export interface Values {
  family: number;
  money: number;
  career: number;
  freedom: number;
  stability: number;
  love: number;
  friendship: number;
  achievement: number;
  creativity: number;
  knowledge: number;
  reputation: number;
  power: number;
  tranquillity: number;
  adventure: number;
  solidarity: number;
  status: number;
  independence: number;
}

export const VALUE_KEYS = [
  'family', 'money', 'career', 'freedom', 'stability', 'love', 'friendship',
  'achievement', 'creativity', 'knowledge', 'reputation', 'power',
  'tranquillity', 'adventure', 'solidarity', 'status', 'independence',
] as const;

export const VALUE_LABELS: Record<keyof Values, string> = {
  family: 'La famille', money: 'L’argent', career: 'La carrière',
  freedom: 'La liberté', stability: 'La stabilité', love: 'L’amour',
  friendship: 'L’amitié', achievement: 'La réussite', creativity: 'La création',
  knowledge: 'Le savoir', reputation: 'La réputation', power: 'Le pouvoir',
  tranquillity: 'La tranquillité', adventure: 'L’aventure',
  solidarity: 'La solidarité', status: 'Le statut social',
  independence: 'L’indépendance',
};

/**
 * Paires de valeurs qui se contredisent en pratique.
 *
 * Tenir fortement aux deux ne rend pas incohérent : cela rend *déchiré*, et
 * c'est exactement ce qu'on veut. Une promotion à l'autre bout du pays
 * satisfait la carrière et blesse la famille ; le moteur en tient compte au
 * lieu de faire comme si le choix était gratuit.
 */
export const VALUE_TENSIONS: [keyof Values, keyof Values, string][] = [
  ['family', 'career', 'les heures données au travail sont prises à la maison'],
  ['freedom', 'stability', 'se poser quelque part, c’est renoncer à partir'],
  ['money', 'tranquillity', 'gagner plus se paie en sommeil'],
  ['adventure', 'stability', 'l’imprévu et la sécurité ne vont pas ensemble'],
  ['independence', 'love', 'aimer, c’est dépendre un peu'],
  ['power', 'solidarity', 'monter suppose parfois de passer devant'],
  ['status', 'tranquillity', 'tenir son rang demande d’être vu'],
  ['creativity', 'money', 'ce qui rapporte n’est pas ce qui inspire'],
  ['career', 'friendship', 'les amitiés demandent du temps qu’on n’a plus'],
];

/* ------------------------------------------------------------------ */
/* 4. Styles — comment la personne se comporte                         */
/* ------------------------------------------------------------------ */

/** Aisance et besoins sociaux. */
export interface SocialStyle {
  /** Facilité à aborder un inconnu. */
  approachEase: number;
  /** Besoin de solitude pour se recharger. */
  solitudeNeed: number;
  /** Peur du regard des autres. */
  fearOfJudgement: number;
  /** Besoin d'être approuvé. */
  approvalNeed: number;
  /** Capacité à créer un lien. */
  bondCreation: number;
  /** Capacité à l'entretenir dans la durée. */
  bondMaintenance: number;
  /** Aisance en groupe. */
  groupEase: number;
  /** Aisance en tête-à-tête. */
  oneToOneEase: number;
  humour: number;
  charm: number;
  assertiveness: number;
  /** Tendance à esquiver les conflits. */
  conflictAvoidance: number;
  /** Tendance à les affronter de face. */
  confrontation: number;
}

/**
 * Style de communication, exprimé en valeurs et non en catégorie.
 *
 * On ne range pas quelqu'un dans « diplomate » ou « sarcastique » : on
 * combine des degrés, et l'étiquette n'est qu'un résumé calculé pour
 * l'affichage.
 */
export interface CommunicationStyle {
  directness: number;
  warmth: number;
  assertiveness: number;
  expressiveness: number;
  sarcasm: number;
  composure: number;
  tact: number;
}

/** Manière de trancher. */
export interface DecisionStyle {
  rationality: number;
  impulsivity: number;
  intuition: number;
  caution: number;
  riskTaking: number;
  /** Besoin de l'avis des autres avant de décider. */
  dependence: number;
  /** Confiance dans ses propres décisions une fois prises. */
  selfTrust: number;
}

/** Gestion des émotions et des coups durs. */
export interface EmotionalRegulation {
  stability: number;
  angerControl: number;
  stressManagement: number;
  forgiveness: number;
  grudge: number;
  touchiness: number;
  /** Vitesse de récupération après un échec. */
  resilience: number;
  /** Tenue sous pression. */
  pressureResistance: number;
}

/* ------------------------------------------------------------------ */
/* 5. Image de soi et identité sociale                                 */
/* ------------------------------------------------------------------ */

/**
 * Estime de soi et confiance sont deux choses distinctes.
 *
 * On peut s'estimer et rester mal à l'aise en public ; on peut paraître
 * sûr de soi et se détester. Le jeu tient les deux séparément, et affiche
 * l'écart quand il devient notable.
 */
export interface SelfImage {
  /** Ce que la personne pense valoir, indépendamment du regard des autres. */
  selfEsteem: number;
  /** Ce qu'elle pense de son corps. */
  bodyImage: number;
  /** Sentiment de maîtriser sa propre vie. */
  senseOfControl: number;
  /** Cohérence perçue entre ce qu'elle est et ce qu'elle montre. */
  authenticity: number;
}

export interface SocialIdentity {
  /** Besoin d'appartenir à un groupe. */
  belongingNeed: number;
  /** Volonté de se distinguer. */
  distinction: number;
  /** Importance donnée à l'image renvoyée. */
  imageImportance: number;
  /** Importance donnée à la réputation. */
  reputationImportance: number;
  /** Sensibilité aux critiques. */
  criticismSensitivity: number;
}

/* ------------------------------------------------------------------ */
/* 6. Peurs, intérêts, habitudes, ambitions                            */
/* ------------------------------------------------------------------ */

export type FearId =
  | 'rejection' | 'failure' | 'abandonment' | 'loneliness' | 'conflict'
  | 'poverty' | 'publicSpeaking' | 'change' | 'loss' | 'mediocrity'
  | 'judgement' | 'illness' | 'commitment';

/** Une peur, avec son intensité et son origine. */
export interface Fear {
  id: FearId;
  /** 0-100. En dessous de 15, la peur est considérée éteinte. */
  intensity: number;
  /** Âge auquel elle est apparue. */
  since: number;
  /** Ce qui l'a déclenchée, pour le débogage de trajectoire. */
  origin: string;
}

/** Un centre d'intérêt et le niveau atteint. */
export interface Interest {
  id: string;
  /** Attirance, 0-100. */
  level: number;
  /** Compétence effective, 0-100. Elle suit le goût avec du retard. */
  skill: number;
  /** Années de pratique cumulées. */
  years: number;
  /** Ce qui a déclenché l'intérêt. */
  origin: string;
}

/** Une habitude installée. */
export interface Habit {
  id: string;
  /** Occurrences par an. */
  frequency: number;
  /** Plaisir retiré, 0-100. */
  pleasure: number;
  /** Importance accordée, 0-100 : ce qu'on abandonne en dernier. */
  importance: number;
  /** Âge de début. */
  since: number;
  /** Difficulté à arrêter, 0-100. */
  stickiness: number;
}

/** Un objectif de vie, avec son poids relatif. */
export interface Ambition {
  id: string;
  /** Importance, 0-100. */
  weight: number;
  /** Âge d'apparition. */
  since: number;
  /** L'objectif est-il atteint ? */
  fulfilled: boolean;
  /** Pourquoi il est apparu. */
  origin: string;
}

/* ------------------------------------------------------------------ */
/* 7. Mémoire émotionnelle                                             */
/* ------------------------------------------------------------------ */

export type MemoryKind =
  | 'lieu' | 'personne' | 'épreuve' | 'joie' | 'rupture' | 'humiliation'
  | 'réussite' | 'perte' | 'découverte' | 'peur' | 'injustice';

export type Emotion =
  | 'joie' | 'tristesse' | 'colère' | 'peur' | 'honte' | 'fierté'
  | 'soulagement' | 'nostalgie' | 'amertume';

/**
 * Un souvenir marquant.
 *
 * Un souvenir n'est pas une ligne de journal : il a une charge, il s'estompe
 * ou non, il peut ressurgir des années plus tard et repeser sur l'humeur.
 */
export interface Memory {
  id: string;
  age: number;
  kind: MemoryKind;
  text: string;
  /** Intensité au moment des faits, 0-100. */
  weight: number;
  /** Émotion dominante. */
  emotion: Emotion;
  /** Identifiants des personnes impliquées. */
  people: string[];
  /**
   * Vitesse d'effacement par an. Les souvenirs heureux ordinaires pâlissent,
   * les traumatismes beaucoup moins.
   */
  fade: number;
  /** Nombre de fois où le souvenir est remonté. */
  recalled: number;
}

/* ------------------------------------------------------------------ */
/* 8. L'ensemble                                                       */
/* ------------------------------------------------------------------ */

/**
 * La personnalité complète d'un individu — joueur comme PNJ important.
 *
 * Les PNJ en possèdent une véritable : sans cela, leurs réactions seraient
 * décoratives et les relations sonneraient faux.
 */
export interface Psyche {
  temperament: Temperament;
  axes: PersonalityAxes;
  values: Values;
  social: SocialStyle;
  communication: CommunicationStyle;
  decision: DecisionStyle;
  emotion: EmotionalRegulation;
  self: SelfImage;
  identity: SocialIdentity;
  fears: Fear[];
  interests: Interest[];
  habits: Habit[];
  ambitions: Ambition[];
  memories: Memory[];
  /**
   * Écart entre l'attitude publique et l'état intérieur, -100 à +100.
   * Positif : paraît plus assuré qu'il ne l'est. Négatif : paraît plus
   * fragile qu'il ne l'est réellement.
   */
  facade: number;
}

/* ------------------------------------------------------------------ */
/* 9. Compatibilité                                                    */
/* ------------------------------------------------------------------ */

/**
 * La compatibilité n'est pas une note absolue : elle dépend de ce qu'on
 * attend l'un de l'autre. Deux personnes très compétitives font d'excellents
 * rivaux, des collègues stimulants, et un couple épuisant.
 */
export type BondType = 'amitié' | 'amour' | 'travail' | 'famille';

export interface Compatibility {
  /** Score global pour ce type de lien, 0-100. */
  score: number;
  /** Ce qui rapproche. */
  affinities: string[];
  /** Ce qui frotte. */
  frictions: string[];
}

/** Type de lien attendu selon la nature de la relation. */
export const BOND_OF_RELATION: Partial<Record<RelationKind, BondType>> = {
  mother: 'famille', father: 'famille', stepmother: 'famille', stepfather: 'famille',
  brother: 'famille', sister: 'famille', son: 'famille', daughter: 'famille',
  grandmother: 'famille', grandfather: 'famille', uncle: 'famille', aunt: 'famille',
  cousin: 'famille',
  partner: 'amour', spouse: 'amour', crush: 'amour', ex: 'amour',
  friend: 'amitié', bestFriend: 'amitié', classmate: 'amitié',
  acquaintance: 'amitié', inmate: 'amitié',
  coworker: 'travail', boss: 'travail', lawyer: 'travail',
};
