/**
 * Table centrale des probabilités.
 *
 * Aucun système ne doit inventer ses propres chiffres magiques : toutes les
 * chances passent par ce fichier, ce qui rend l'équilibrage lisible et
 * modifiable en un seul endroit (cf. cahier des charges §25 et §28).
 *
 * Convention : toutes les fonctions renvoient une probabilité en 0-1.
 */

import { clamp, normalize } from './rng.ts';
import type { Person, Player, Stats } from './types.ts';

/** Constantes de base, exprimées en probabilité annuelle. */
export const BASE = {
  /** Chance qu'un événement aléatoire supplémentaire se déclenche. */
  randomEventExtra: 0.45,
  /** Chance de contracter une maladie dans l'année (avant modificateurs). */
  illness: 0.055,
  /** Chance de promotion annuelle. */
  promotion: 0.14,
  /** Chance de licenciement annuel. */
  layoff: 0.035,
  /** Chance qu'un partenaire propose quelque chose de son propre chef. */
  partnerInitiative: 0.22,
  /** Chance de conception par tentative (couple fertile). */
  conception: 0.28,
  /** Chance d'infidélité d'un partenaire. */
  infidelity: 0.05,
  /** Chance qu'un ami se manifeste. */
  friendContact: 0.35,
  /** Chance d'accident grave. */
  accident: 0.012,
  /** Chance qu'une propriété subisse un sinistre. */
  propertyIncident: 0.04,
  /** Chance de panne d'un véhicule. */
  vehicleBreakdown: 0.07,
} as const;

/* ------------------------------------------------------------------ */
/* Mortalité                                                          */
/* ------------------------------------------------------------------ */

/**
 * Probabilité de décès dans l'année.
 * Courbe de Gompertz simplifiée, corrigée par la santé, la forme,
 * les dépendances et les maladies actives.
 */
export function deathChance(
  age: number,
  stats: Stats,
  opts: { diseaseSeverity?: number; inPrison?: boolean } = {},
): number {
  // Mortalité infantile élevée, creux à l'enfance, puis courbe de Gompertz
  // strictement croissante à partir de l'adolescence. Le plancher représente
  // la mortalité accidentelle, qui ne dépend pas de l'âge.
  const accidental = 0.0004;
  let base: number;
  if (age < 1) base = 0.006;
  else if (age < 5) base = 0.0012;
  else if (age < 12) base = 0.0003;
  else base = Math.max(accidental, 0.00008 * Math.exp(0.092 * (age - 20)));

  const healthFactor = 2.1 - (clamp(stats.health) / 100) * 1.8; // 0.3 → 2.1
  const fitnessFactor = 1.25 - (clamp(stats.fitness) / 100) * 0.45;
  const addictionFactor = 1 + (clamp(stats.addiction) / 100) * 1.4;
  const stressFactor = 1 + (clamp(stats.stress) / 100) * 0.4;
  const diseaseFactor = 1 + (opts.diseaseSeverity ?? 0) / 120;
  const prisonFactor = opts.inPrison ? 1.35 : 1;

  const chance =
    base *
    healthFactor *
    fitnessFactor *
    addictionFactor *
    stressFactor *
    diseaseFactor *
    prisonFactor;

  // Personne n'est immortel : le plafond monte avec l'âge extrême.
  return clamp(chance, 0, age > 100 ? 0.6 : 0.95);
}

/* ------------------------------------------------------------------ */
/* Carrière                                                           */
/* ------------------------------------------------------------------ */

/**
 * chancePromotion = base × performance × intelligence × ancienneté ÷ stress
 * (formule conceptuelle du cahier des charges, §25).
 */
export function promotionChance(args: {
  performance: number;
  intelligence: number;
  years: number;
  stress: number;
  reputation: number;
  /** Échelon actuellement occupé (0 = poste d'entrée). */
  currentLevel: number;
  levelsRemaining: number;
  jobMarket: number;
}): number {
  if (args.levelsRemaining <= 0) return 0;
  const perf = normalize(args.performance, 0.9);
  const intel = normalize(args.intelligence, 0.35);
  const rep = normalize(args.reputation, 0.3);
  const seniority = Math.min(1.8, 0.45 + args.years * 0.28);
  const stressPenalty = 1 + (clamp(args.stress) / 100) * 0.8;
  // La pyramide se resserre brutalement vers le sommet : atteindre le dernier
  // échelon d'un métier doit rester l'exception, pas la trajectoire par défaut.
  const scarcity = 1 / (1 + Math.pow(args.currentLevel, 1.8) * 0.95);

  return clamp(
    (BASE.promotion * perf * intel * rep * seniority * scarcity * args.jobMarket) / stressPenalty,
    0,
    0.75,
  );
}

/** Chance d'être retenu après candidature. */
export function hiringChance(args: {
  eduGap: number; // niveau requis - niveau du joueur (négatif = surqualifié)
  experienceGap: number; // années manquantes
  intelligence: number;
  looks: number;
  reputation: number;
  hasRecord: boolean;
  jobMarket: number;
  majorMatch: boolean;
}): number {
  if (args.eduGap > 0) return 0; // diplôme obligatoire
  let p = 0.55;
  p *= normalize(args.intelligence, 0.4);
  p *= normalize(args.looks, 0.12);
  p *= normalize(args.reputation, 0.3);
  if (args.experienceGap > 0) p *= Math.max(0.05, 1 - args.experienceGap * 0.28);
  if (!args.majorMatch) p *= 0.75;
  if (args.hasRecord) p *= 0.45;
  p *= args.jobMarket;
  return clamp(p, 0.01, 0.95);
}

/** Chance d'obtenir une augmentation demandée. */
export function raiseChance(args: {
  performance: number;
  years: number;
  reputation: number;
  askedRecently: boolean;
}): number {
  let p = 0.3 * normalize(args.performance, 1.1) * normalize(args.reputation, 0.4);
  p *= Math.min(1.6, 0.6 + args.years * 0.2);
  if (args.askedRecently) p *= 0.25;
  return clamp(p, 0.02, 0.85);
}

/* ------------------------------------------------------------------ */
/* Études                                                             */
/* ------------------------------------------------------------------ */

/** Note annuelle sur 20, dérivée des statistiques et du comportement. */
export function computeGrade(args: {
  intelligence: number;
  discipline: number;
  effort: 'none' | 'normal' | 'hard';
  absences: number;
  happiness: number;
  stress: number;
  difficulty: number; // 1 = école primaire, 2 = université exigeante
}): number {
  const effortBonus = args.effort === 'hard' ? 2.6 : args.effort === 'none' ? -3.4 : 0;
  // Le terme constant a longtemps été de +2, ce qui plaçait la moyenne d'un
  // élève ordinaire au-dessus de quinze sur vingt et vidait de son sens tout
  // ce qui lit les notes — bourses, admissions, orientation. Un élève moyen
  // doit obtenir une note moyenne ; c'est le rôle de cette constante.
  const base =
    (args.intelligence / 100) * 15 +
    (args.discipline / 100) * 5 +
    (args.happiness / 100) * 2 +
    -4.5;
  const penalty = args.absences * 0.55 + (args.stress / 100) * 2.2;
  const raw = (base + effortBonus - penalty) / args.difficulty + (args.difficulty - 1) * 4;
  return clamp(raw, 0, 20);
}

/**
 * Le plafond cognitif de quelqu'un.
 *
 * Ce que l'école et la vie peuvent faire de cette personne-là, pas plus. Trois
 * termes, et ils disent chacun quelque chose de différent :
 *
 * - le **potentiel hérité**, qui existait déjà dans `Genetics` mais n'était lu
 *   qu'à la naissance et n'a jamais rien décidé ensuite ;
 * - le **capital culturel du foyer**, parce que les livres à la maison et les
 *   conversations à table élèvent réellement ce qu'on peut atteindre ;
 * - le **goût de l'étude**, qui est le seul des trois que l'on construise.
 *
 * Sans ce plafond, treize années d'école poussaient tout le monde à 87 et
 * l'intelligence cessait de distinguer qui que ce soit — ce qui vidait de son
 * sens tout ce qui la lit : les filières, les métiers, les examens.
 */
export function cognitiveCeiling(args: {
  potential: number;
  culturalCapital: number;
  studiousness: number;
}): number {
  return clamp(
    8 + args.potential * 0.85 + args.culturalCapital * 0.22 + args.studiousness * 0.1,
    20, 100,
  );
}

/** Chance d'obtenir une bourse. */
export function scholarshipChance(grades: number, intelligence: number, familyWealth: number): number {
  const merit = clamp((grades - 11) / 9 + (intelligence - 60) / 180, 0, 1);
  const need = clamp(1 - familyWealth / 200000, 0, 1);
  return clamp(0.1 + merit * 0.6 + need * 0.2, 0, 0.92);
}

/* ------------------------------------------------------------------ */
/* Relations                                                          */
/* ------------------------------------------------------------------ */

/**
 * Chance qu'une avance romantique aboutisse.
 * Dépend de l'écart d'apparence, du lien existant et de la personnalité.
 */
export function romanceChance(args: {
  playerLooks: number;
  playerHappiness: number;
  targetLooks: number;
  relationship: number;
  opinion: number;
  targetWarmth: number;
  compatible: boolean;
  targetTaken: boolean;
  targetLoyalty: number;
  ageGapYears: number;
  richness: number; // argent du joueur normalisé 0-100
}): number {
  if (!args.compatible) return 0.02;
  const looksGap = args.playerLooks - args.targetLooks;
  let p = 0.3 + (looksGap / 100) * 0.45;
  p += (args.relationship / 100) * 0.28;
  p += (args.opinion / 100) * 0.22;
  p += (args.targetWarmth / 100) * 0.1;
  p += (args.richness / 100) * 0.12;
  p += (args.playerHappiness / 100) * 0.05;
  p -= Math.max(0, Math.abs(args.ageGapYears) - 8) * 0.02;
  if (args.targetTaken) p *= 0.45 * (1 - (args.targetLoyalty / 100) * 0.8);
  return clamp(p, 0.01, 0.96);
}

/** Chance qu'une demande en mariage soit acceptée. */
export function proposalChance(args: {
  relationship: number;
  yearsTogether: number;
  ringValue: number;
  targetAmbition: number;
  playerWealth: number;
  targetLoyalty: number;
}): number {
  let p = (args.relationship / 100) * 0.7;
  p += Math.min(0.2, args.yearsTogether * 0.05);
  p += clamp(args.ringValue / 12000, 0, 1) * 0.22;
  p += (args.targetLoyalty / 100) * 0.1;
  p -= clamp((args.targetAmbition - 60) / 100, 0, 1) * clamp(1 - args.playerWealth / 120000, 0, 1) * 0.25;
  return clamp(p, 0.02, 0.97);
}

/** Réaction d'un PNJ à une interaction sociale : delta de relation. */
export function socialDelta(args: {
  kind: 'talk' | 'compliment' | 'gift' | 'time' | 'insult' | 'argue' | 'money';
  personality: Personality;
  relationship: number;
  intensity: number; // 0-1, ex: valeur du cadeau
  playerLooks: number;
  roll: number; // tirage 0-1 fourni par l'appelant
}): number {
  const { personality: p } = args;
  const warmth = p.warmth / 100;
  const temper = p.temper / 100;
  const greed = 1 - p.generosity / 100;
  // Une relation déjà excellente progresse plus lentement.
  const ceiling = 1 - Math.pow(args.relationship / 100, 2) * 0.7;

  switch (args.kind) {
    case 'talk':
      return Math.round((1 + args.roll * 5) * (0.5 + warmth) * ceiling);
    case 'compliment':
      return Math.round((1 + args.roll * 7) * (0.4 + warmth + args.playerLooks / 200) * ceiling);
    case 'time':
      return Math.round((3 + args.roll * 8) * (0.5 + warmth) * ceiling);
    case 'gift':
      return Math.round((2 + args.intensity * 16 + args.roll * 4) * (0.5 + greed) * ceiling);
    case 'money':
      return Math.round((1 + args.intensity * 14) * (0.5 + greed) * ceiling);
    case 'insult':
      return -Math.round((6 + args.roll * 16) * (0.6 + temper));
    case 'argue':
      return -Math.round((4 + args.roll * 12) * (0.6 + temper));
  }
}

type Personality = Person['personality'];

/* ------------------------------------------------------------------ */
/* Santé                                                              */
/* ------------------------------------------------------------------ */

/** Chance annuelle de tomber malade. */
export function illnessChance(age: number, stats: Stats): number {
  const ageFactor = age < 12 ? 1.5 : age < 40 ? 0.75 : 0.6 + (age - 40) * 0.055;
  const healthFactor = 1.8 - (clamp(stats.health) / 100) * 1.5;
  const fitFactor = 1.3 - (clamp(stats.fitness) / 100) * 0.6;
  const addiction = 1 + (clamp(stats.addiction) / 100) * 1.6;
  const stress = 1 + (clamp(stats.stress) / 100) * 0.7;
  return clamp(BASE.illness * ageFactor * healthFactor * fitFactor * addiction * stress, 0, 0.85);
}

/** Chance de guérison d'une maladie sur une année. */
export function recoveryChance(args: {
  baseCure: number;
  treated: boolean;
  health: number;
  age: number;
  yearsIll: number;
}): number {
  let p = args.baseCure * (args.treated ? 1 : 0.32);
  p *= normalize(args.health, 0.5);
  p *= args.age > 65 ? 0.75 : args.age < 15 ? 1.15 : 1;
  p *= Math.max(0.4, 1 - args.yearsIll * 0.08);
  return clamp(p, 0, 0.98);
}

/* ------------------------------------------------------------------ */
/* Criminalité et justice                                             */
/* ------------------------------------------------------------------ */

/** Chance de réussir un délit (mécanique abstraite de jeu). */
export function crimeSuccessChance(args: {
  baseDifficulty: number; // 0-1, plus haut = plus dur
  criminality: number;
  intelligence: number;
  fitness: number;
  notoriety: number;
  drunk: boolean;
}): number {
  let p = 1 - args.baseDifficulty;
  p *= normalize(args.criminality, 0.55);
  p *= normalize(args.intelligence, 0.3);
  p *= normalize(args.fitness, 0.2);
  p *= 1 + (args.notoriety / 100) * 0.15;
  if (args.drunk) p *= 0.7;
  return clamp(p, 0.03, 0.94);
}

/** Chance d'arrestation en cas d'échec (ou de réussite bruyante). */
export function arrestChance(args: {
  succeeded: boolean;
  baseHeat: number; // 0-1 selon la gravité
  criminality: number;
  intelligence: number;
  priorArrests: number;
}): number {
  let p = args.succeeded ? args.baseHeat * 0.22 : 0.35 + args.baseHeat * 0.5;
  p /= normalize(args.criminality, 0.4);
  p /= normalize(args.intelligence, 0.25);
  p *= 1 + Math.min(0.6, args.priorArrests * 0.07);
  return clamp(p, 0.01, 0.97);
}

/** Chance d'être acquitté au procès. */
export function acquittalChance(args: {
  evidence: number; // 0-100
  lawyerQuality: number; // 0-100
  priorConvictions: number;
  reputation: number;
  karma: number;
}): number {
  let p = 0.5;
  p -= (args.evidence / 100) * 0.55;
  p += (args.lawyerQuality / 100) * 0.42;
  p += (args.reputation / 100) * 0.12;
  p += (args.karma / 100) * 0.06;
  p -= Math.min(0.25, args.priorConvictions * 0.06);
  return clamp(p, 0.01, 0.93);
}

/** Chance d'obtenir une libération conditionnelle. */
export function paroleChance(args: {
  behavior: number;
  yearsServed: number;
  totalSentence: number;
  denials: number;
  karma: number;
}): number {
  const served = args.totalSentence > 0 ? args.yearsServed / args.totalSentence : 0;
  if (served < 0.3) return 0.02;
  let p = (args.behavior / 100) * 0.55 + served * 0.4;
  p += (args.karma / 100) * 0.08;
  p -= args.denials * 0.1;
  return clamp(p, 0.01, 0.9);
}

/* ------------------------------------------------------------------ */
/* Divers                                                             */
/* ------------------------------------------------------------------ */

/** Chance de conception, selon la fertilité et l'âge des deux parents. */
export function conceptionChance(args: {
  motherAge: number;
  fatherAge: number;
  motherFertility: number;
  fatherFertility: number;
  health: number;
  /**
   * Ce que le protocole de l'année apporte, 1 = aucun.
   *
   * C'était un booléen, et il venait d'un marqueur que rien n'effaçait : un
   * protocole payé une fois multipliait les chances par 2,4 pour le reste de
   * la vie. Un nombre, parce que le deuxième protocole ne vaut pas le premier.
   */
  treatment: number;
}): number {
  const ageFactor =
    args.motherAge < 18
      ? 0.5
      : args.motherAge < 30
        ? 1
        : args.motherAge < 38
          ? 0.7
          : args.motherAge < 45
            ? 0.28
            : args.motherAge < 51
              ? 0.05
              : 0;
  const dadFactor = args.fatherAge > 60 ? 0.6 : args.fatherAge > 45 ? 0.85 : 1;
  let p =
    BASE.conception *
    ageFactor *
    dadFactor *
    (args.motherFertility / 65) *
    (0.5 + args.fatherFertility / 130) *
    normalize(args.health, 0.3);
  if (args.treatment > 1) p = clamp(p * args.treatment + 0.08, 0, 0.75);
  return clamp(p, 0, 0.85);
}

/** Espérance de vie indicative affichée au joueur. */
export function lifeExpectancy(player: Player): number {
  const s = player.stats;
  let base = 72;
  base += ((s.health - 50) / 50) * 9;
  base += ((s.fitness - 50) / 50) * 6;
  base -= (s.addiction / 100) * 14;
  base -= (s.stress / 100) * 6;
  base += ((s.happiness - 50) / 50) * 3;
  base += clamp(player.money / 400000, 0, 1) * 4;
  const severity = player.diseases.reduce((sum, d) => sum + (d.treated ? d.severity * 0.4 : d.severity), 0);
  base -= severity / 6;
  return Math.round(clamp(base, 20, 118));
}
