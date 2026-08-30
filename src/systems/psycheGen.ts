/**
 * Génération d'une personnalité.
 *
 * Deux principes tiennent ce module :
 *
 * 1. **Le tempérament vient d'abord.** Il est tiré indépendamment de tout le
 *    reste — ni le quartier ni le compte en banque ne décident si un
 *    nourrisson est placide ou réactif.
 * 2. **Tout le reste en découle, puis se corrige.** Les axes de personnalité,
 *    les valeurs, les styles sociaux et l'estime de soi partent du
 *    tempérament, puis sont infléchis par ce que la famille valorise et par
 *    ce que le milieu rend possible. À la naissance, cette inflexion est
 *    faible : l'écart se creuse ensuite, année après année.
 *
 * Les PNJ importants reçoivent la même chose. Sans cela, leurs réactions
 * seraient décoratives et les relations sonneraient faux.
 */

import type { Rng } from '../engine/rng.ts';
import { clampStat } from '../engine/rng.ts';
import type {
  Ambition, CommunicationStyle, DecisionStyle, EmotionalRegulation, Fear,
  Habit, Interest, PersonalityAxes, Psyche, SelfImage, SocialIdentity,
  SocialStyle, Temperament, Values,
} from '../engine/psyche.ts';
import { AXIS_KEYS, TEMPERAMENT_KEYS, VALUE_KEYS } from '../engine/psyche.ts';
import type { WorldOrigin } from '../engine/origin.ts';
import { AMBITIONS } from '../data/ambitions.ts';
import { FEARS } from '../data/fears.ts';

/* ------------------------------------------------------------------ */
/* Tempérament                                                         */
/* ------------------------------------------------------------------ */

/**
 * Tempérament de naissance.
 *
 * Volontairement indépendant de l'environnement : c'est la seule couche de la
 * personnalité qui ne doit rien au milieu.
 */
export function rollTemperament(rng: Rng, partial: Partial<Temperament> = {}): Temperament {
  const out = {} as Temperament;
  for (const key of TEMPERAMENT_KEYS) {
    // Le tirage a lieu même quand la valeur est imposée : sans cela, bouger
    // un curseur dans l'écran de création décalerait tous les tirages suivants
    // et re-lancerait les onze autres axes.
    const rolled = rng.stat(50, 22);
    out[key] = partial[key] ?? rolled;
  }
  // Quelques corrélations naturelles : un enfant très réactif est rarement
  // très placide, un enfant très curieux cherche plus souvent la nouveauté.
  out.calm = clampStat(out.calm * 0.7 + (100 - out.emotionalReactivity) * 0.3);
  out.stimulationNeed = clampStat(out.stimulationNeed * 0.75 + out.curiosity * 0.25);
  out.frustrationTolerance = clampStat(out.frustrationTolerance * 0.7 + out.calm * 0.3);
  for (const key of TEMPERAMENT_KEYS) {
    if (partial[key] !== undefined) out[key] = partial[key] as number;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Axes de personnalité                                                */
/* ------------------------------------------------------------------ */

/**
 * Axes de départ.
 *
 * Chaque axe part d'une combinaison de traits de tempérament, avec du bruit.
 * Rien n'est encore acquis : c'est un point de départ que la vie déplacera.
 */
export function initialAxes(rng: Rng, t: Temperament): PersonalityAxes {
  const n = (mean: number, spread = 12) => clampStat(rng.gauss(mean, spread, 0, 100));
  return {
    extraversion: n(t.sociability * 0.6 + t.energy * 0.25 + t.attentionNeed * 0.15),
    confidence: n(45 + (t.calm - 50) * 0.2 + (t.frustrationTolerance - 50) * 0.15),
    empathy: n(40 + t.sensitivity * 0.35 + t.sociability * 0.15),
    ambition: n(42 + (t.persistence - 50) * 0.2 + (t.attentionNeed - 50) * 0.15),
    discipline: n(38 + t.persistence * 0.35 + t.calm * 0.1),
    patience: n(35 + t.frustrationTolerance * 0.4 + t.calm * 0.2),
    impulsivity: n(50 + (t.emotionalReactivity - 50) * 0.4 + (t.stimulationNeed - 50) * 0.3 - (t.caution - 50) * 0.3),
    honesty: n(55),
    loyalty: n(52 + (t.sensitivity - 50) * 0.15),
    generosity: n(48 + (t.sensitivity - 50) * 0.2),
    creativity: n(40 + t.curiosity * 0.3 + (t.stimulationNeed - 50) * 0.15),
    curiosity: n(t.curiosity * 0.75 + 12),
    courage: n(45 + (100 - t.caution) * 0.25 + (t.energy - 50) * 0.15),
    caution: n(t.caution * 0.7 + 15),
    aggression: n(30 + (100 - t.frustrationTolerance) * 0.3 + (t.emotionalReactivity - 50) * 0.2),
    competitiveness: n(42 + (t.attentionNeed - 50) * 0.2 + (t.persistence - 50) * 0.2),
    jealousy: n(32 + (t.sensitivity - 50) * 0.25 + (t.attentionNeed - 50) * 0.2),
    independence: n(40 + (100 - t.sociability) * 0.2 + (t.adaptability - 50) * 0.15),
    sociability: n(t.sociability * 0.7 + 14),
    sensitivity: n(t.sensitivity * 0.75 + 10),
    optimism: n(52 + (t.calm - 50) * 0.2 + (t.energy - 50) * 0.15),
    adaptability: n(t.adaptability * 0.7 + 14),
    organisation: n(35 + t.persistence * 0.25 + t.calm * 0.15),
    perseverance: n(t.persistence * 0.7 + 12),
    spontaneity: n(45 + (t.stimulationNeed - 50) * 0.3 - (t.caution - 50) * 0.2),
    emotionalMaturity: n(30 + t.frustrationTolerance * 0.2 + t.calm * 0.15),
    riskTolerance: n(45 + (100 - t.caution) * 0.25 + (t.stimulationNeed - 50) * 0.2),
  };
}

/* ------------------------------------------------------------------ */
/* Valeurs                                                             */
/* ------------------------------------------------------------------ */

/**
 * Valeurs de départ.
 *
 * Un enfant n'a pas encore de valeurs à lui : il hérite d'abord de celles du
 * foyer, avec du bruit — deux enfants d'une même famille n'en retiennent pas
 * la même chose. Elles bougeront ensuite avec l'expérience.
 */
export function initialValues(rng: Rng, origin: WorldOrigin | null, t: Temperament): Values {
  const home = origin?.values;
  const n = (mean: number) => clampStat(rng.gauss(mean, 15, 0, 100));
  return {
    family: n(45 + (home?.family ?? 50) * 0.4),
    money: n(35 + (home?.money ?? 50) * 0.4),
    career: n(30 + (home?.work ?? 50) * 0.35 + (home?.achievement ?? 50) * 0.15),
    freedom: n(40 + (home?.autonomy ?? 50) * 0.3 + (t.stimulationNeed - 50) * 0.15),
    stability: n(45 + (100 - (home?.autonomy ?? 50)) * 0.2 + (t.caution - 50) * 0.2),
    love: n(45 + t.sensitivity * 0.2),
    friendship: n(40 + t.sociability * 0.3),
    achievement: n(30 + (home?.achievement ?? 50) * 0.45),
    creativity: n(30 + (home?.creativity ?? 50) * 0.4 + t.curiosity * 0.15),
    knowledge: n(30 + (home?.school ?? 50) * 0.4 + t.curiosity * 0.2),
    reputation: n(35 + (home?.manners ?? 50) * 0.25 + (t.attentionNeed - 50) * 0.25),
    power: n(25 + (t.attentionNeed - 50) * 0.2),
    tranquillity: n(45 + t.calm * 0.25),
    adventure: n(35 + (t.stimulationNeed - 50) * 0.35 + t.curiosity * 0.15),
    solidarity: n(35 + t.sensitivity * 0.25),
    status: n(28 + (home?.money ?? 50) * 0.2 + (t.attentionNeed - 50) * 0.25),
    independence: n(38 + (home?.autonomy ?? 50) * 0.3 + (100 - t.sociability) * 0.15),
  };
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

export function initialSocialStyle(rng: Rng, t: Temperament, axes: PersonalityAxes): SocialStyle {
  const n = (mean: number, spread = 12) => clampStat(rng.gauss(mean, spread, 0, 100));
  return {
    approachEase: n(axes.extraversion * 0.6 + axes.confidence * 0.3),
    solitudeNeed: n(100 - t.sociability * 0.7 - axes.extraversion * 0.15),
    fearOfJudgement: n(55 - axes.confidence * 0.4 + axes.sensitivity * 0.3),
    approvalNeed: n(t.attentionNeed * 0.5 + (100 - axes.confidence) * 0.25),
    bondCreation: n(axes.extraversion * 0.4 + axes.empathy * 0.3 + t.sociability * 0.2),
    bondMaintenance: n(axes.loyalty * 0.4 + axes.perseverance * 0.3 + axes.empathy * 0.2),
    groupEase: n(axes.extraversion * 0.55 + axes.confidence * 0.25),
    oneToOneEase: n(axes.empathy * 0.4 + axes.confidence * 0.25 + 20),
    humour: n(35 + axes.creativity * 0.25 + axes.extraversion * 0.2),
    charm: n(30 + axes.confidence * 0.3 + axes.empathy * 0.2),
    assertiveness: n(axes.confidence * 0.45 + axes.courage * 0.25 + axes.aggression * 0.1),
    conflictAvoidance: n(70 - axes.aggression * 0.4 - axes.confidence * 0.25),
    confrontation: n(axes.aggression * 0.4 + axes.courage * 0.3 + axes.honesty * 0.15),
  };
}

export function initialCommunication(rng: Rng, axes: PersonalityAxes, social: SocialStyle): CommunicationStyle {
  const n = (mean: number, spread = 12) => clampStat(rng.gauss(mean, spread, 0, 100));
  return {
    directness: n(axes.honesty * 0.35 + social.assertiveness * 0.4),
    warmth: n(axes.empathy * 0.45 + axes.generosity * 0.25 + 10),
    assertiveness: social.assertiveness,
    expressiveness: n(axes.extraversion * 0.4 + axes.sensitivity * 0.25 + axes.spontaneity * 0.2),
    sarcasm: n(20 + social.humour * 0.3 + axes.aggression * 0.2),
    composure: n(axes.emotionalMaturity * 0.4 + axes.patience * 0.3 + 15),
    tact: n(axes.empathy * 0.35 + social.conflictAvoidance * 0.25 + 15),
  };
}

export function initialDecision(rng: Rng, t: Temperament, axes: PersonalityAxes): DecisionStyle {
  const n = (mean: number, spread = 12) => clampStat(rng.gauss(mean, spread, 0, 100));
  return {
    rationality: n(35 + axes.organisation * 0.25 + axes.patience * 0.2),
    impulsivity: axes.impulsivity,
    intuition: n(35 + axes.creativity * 0.3 + axes.sensitivity * 0.2),
    caution: axes.caution,
    riskTaking: axes.riskTolerance,
    dependence: n(55 - axes.independence * 0.4 + (t.attentionNeed - 50) * 0.2),
    selfTrust: n(axes.confidence * 0.5 + axes.independence * 0.2 + 12),
  };
}

export function initialEmotion(rng: Rng, t: Temperament, axes: PersonalityAxes): EmotionalRegulation {
  const n = (mean: number, spread = 12) => clampStat(rng.gauss(mean, spread, 0, 100));
  return {
    stability: n(t.calm * 0.45 + (100 - t.emotionalReactivity) * 0.3),
    angerControl: n(t.frustrationTolerance * 0.5 + (100 - axes.aggression) * 0.25),
    stressManagement: n(t.calm * 0.35 + axes.emotionalMaturity * 0.25 + 12),
    forgiveness: n(axes.empathy * 0.35 + axes.patience * 0.25 + 12),
    grudge: n(55 - axes.empathy * 0.3 + axes.sensitivity * 0.25),
    touchiness: n(axes.sensitivity * 0.45 + (100 - axes.confidence) * 0.2),
    resilience: n(t.frustrationTolerance * 0.35 + axes.optimism * 0.3 + 10),
    pressureResistance: n(t.calm * 0.35 + axes.perseverance * 0.3 + 10),
  };
}

export function initialSelfImage(rng: Rng, axes: PersonalityAxes, origin: WorldOrigin | null): SelfImage {
  const n = (mean: number, spread = 12) => clampStat(rng.gauss(mean, spread, 0, 100));
  // À la naissance, l'estime de soi n'est pas encore construite : elle part
  // d'un niveau moyen que l'affection du foyer relève un peu.
  const warmth = origin ? origin.atmosphere.affection : 55;
  return {
    selfEsteem: n(45 + (warmth - 55) * 0.2 + (axes.optimism - 50) * 0.15),
    bodyImage: n(52),
    senseOfControl: n(42 + (axes.independence - 50) * 0.2 + (axes.confidence - 50) * 0.2),
    authenticity: n(60 + (axes.honesty - 50) * 0.25),
  };
}

export function initialIdentity(rng: Rng, t: Temperament, axes: PersonalityAxes): SocialIdentity {
  const n = (mean: number, spread = 12) => clampStat(rng.gauss(mean, spread, 0, 100));
  return {
    belongingNeed: n(t.sociability * 0.45 + t.attentionNeed * 0.2),
    distinction: n(35 + axes.creativity * 0.25 + axes.independence * 0.25),
    imageImportance: n(30 + t.attentionNeed * 0.35),
    reputationImportance: n(35 + t.attentionNeed * 0.25 + axes.competitiveness * 0.15),
    criticismSensitivity: n(axes.sensitivity * 0.45 + (100 - axes.confidence) * 0.25),
  };
}

/* ------------------------------------------------------------------ */
/* Assemblage                                                          */
/* ------------------------------------------------------------------ */

/**
 * Construit une personnalité complète.
 *
 * `origin` est facultatif : les PNJ rencontrés en cours de vie n'ont pas
 * d'environnement modélisé, seulement un tempérament et ce qui en découle.
 */
export function buildPsyche(rng: Rng, opts: {
  origin?: WorldOrigin | null;
  temperament?: Partial<Temperament>;
  /** Âge de la personne : au-delà de l'enfance, la personnalité est déjà formée. */
  age?: number;
}): Psyche {
  const origin = opts.origin ?? null;
  const temperament = rollTemperament(rng, opts.temperament ?? {});
  const axes = initialAxes(rng, temperament);
  const values = initialValues(rng, origin, temperament);
  const social = initialSocialStyle(rng, temperament, axes);
  const communication = initialCommunication(rng, axes, social);
  const decision = initialDecision(rng, temperament, axes);
  const emotion = initialEmotion(rng, temperament, axes);
  const self = initialSelfImage(rng, axes, origin);
  const identity = initialIdentity(rng, temperament, axes);

  const psyche: Psyche = {
    temperament, axes, values, social, communication, decision, emotion,
    self, identity,
    fears: [],
    interests: [],
    habits: [],
    ambitions: [],
    memories: [],
    // `+ 0` normalise le zéro négatif : `JSON.stringify(-0)` donne « 0 », ce
    // qui casserait l'aller-retour de sauvegarde.
    facade: Math.round(rng.gauss(0, 18, -60, 60)) + 0,
  };

  // Un adulte rencontré en cours de partie n'est pas un nouveau-né : on
  // avance sa personnalité d'un coup, sans simuler ses quarante années.
  const age = opts.age ?? 0;
  if (age >= 12) matureInPlace(rng, psyche, age);
  return psyche;
}

/**
 * Vieillit une personnalité d'un bloc, pour les PNJ créés adultes.
 *
 * On ne rejoue pas leur vie : on applique l'effet moyen du temps — la
 * maturité émotionnelle monte, l'impulsivité descend, quelques peurs et
 * quelques ambitions se sont installées en route.
 */
function matureInPlace(rng: Rng, psyche: Psyche, age: number): void {
  const years = Math.min(45, age - 10);
  const drift = years / 45;
  const a = psyche.axes;
  a.emotionalMaturity = clampStat(a.emotionalMaturity + 34 * drift + rng.float(-6, 6));
  a.patience = clampStat(a.patience + 16 * drift + rng.float(-6, 6));
  a.impulsivity = clampStat(a.impulsivity - 18 * drift + rng.float(-6, 6));
  a.caution = clampStat(a.caution + 12 * drift + rng.float(-6, 6));
  a.riskTolerance = clampStat(a.riskTolerance - 12 * drift + rng.float(-6, 6));
  a.discipline = clampStat(a.discipline + 12 * drift + rng.float(-8, 8));
  a.confidence = clampStat(a.confidence + 10 * drift + rng.float(-12, 12));
  psyche.emotion.resilience = clampStat(psyche.emotion.resilience + 12 * drift + rng.float(-8, 8));
  psyche.self.selfEsteem = clampStat(psyche.self.selfEsteem + rng.float(-14, 16));

  // Une ou deux peurs installées, cohérentes avec le caractère.
  const fearCount = rng.weighted([0, 1, 2, 3], (n) => [22, 38, 27, 13][n]);
  for (const def of rng.sample(FEARS, fearCount)) {
    const fit = Object.entries(def.vulnerability).reduce(
      (sum, [k, w]) => sum + ((a[k as keyof PersonalityAxes] - 50) * (w as number)),
      0,
    );
    const intensity = clampStat(30 + fit * 0.6 + rng.float(-10, 20));
    if (intensity < 18) continue;
    psyche.fears.push({
      id: def.id,
      intensity,
      since: Math.max(6, Math.round(age - rng.int(2, 20))),
      origin: 'quelque chose dont il ne parle pas',
    });
  }

  // Des ambitions cohérentes avec ses valeurs.
  psyche.ambitions = pickAmbitions(rng, psyche, age, 2);
}

/**
 * Choisit les ambitions qui correspondent le mieux aux valeurs actuelles.
 * Une ambition n'est jamais imposée : elle émerge de ce à quoi on tient.
 */
export function pickAmbitions(rng: Rng, psyche: Psyche, age: number, count: number): Ambition[] {
  const eligible = AMBITIONS.filter((a) => a.minAge <= age);
  if (eligible.length === 0) return [];
  const scored = eligible.map((def) => {
    const fit = Object.entries(def.values).reduce(
      (sum, [k, w]) => sum + psyche.values[k as keyof Values] * (w as number),
      0,
    );
    return { def, fit };
  });
  const out: Ambition[] = [];
  const pool = [...scored];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const chosen = rng.weighted(pool, (s) => Math.max(1, s.fit));
    pool.splice(pool.indexOf(chosen), 1);
    out.push({
      id: chosen.def.id,
      weight: clampStat(35 + chosen.fit / 3 + rng.float(-10, 15)),
      since: age,
      fulfilled: false,
      origin: 'ce à quoi il tient',
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Champs vides typés                                                  */
/* ------------------------------------------------------------------ */

export function emptyInterests(): Interest[] {
  return [];
}

export function emptyHabits(): Habit[] {
  return [];
}

export function emptyFears(): Fear[] {
  return [];
}

/** Somme pondérée d'axes, utilitaire partagé par les contextes. */
export function axisBlend(
  axes: PersonalityAxes,
  weights: Partial<Record<keyof PersonalityAxes, number>>,
): number {
  let total = 0;
  let sum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const w = weight as number;
    total += Math.abs(w);
    sum += axes[key as keyof PersonalityAxes] * w;
  }
  return total > 0 ? sum / total : 50;
}

/** Liste ordonnée des axes, pour les parcours exhaustifs. */
export const ALL_AXES = AXIS_KEYS;
export const ALL_VALUES = VALUE_KEYS;
