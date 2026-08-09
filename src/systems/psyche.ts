/**
 * Vie de la personnalité.
 *
 * Ce module fait quatre choses, toutes annuelles :
 *
 *   - il fait grandir ou mourir les **intérêts** selon l'exposition réelle ;
 *   - il installe, entretient ou abandonne les **habitudes** ;
 *   - il fait dériver les **axes**, les **valeurs**, l'**estime de soi** et
 *     les **peurs** en fonction de ce que la personne vit ;
 *   - il applique les **expériences formatrices**, qui laissent une trace
 *     bien plus profonde qu'une année ordinaire.
 *
 * Deux garde-fous permanents :
 *
 * 1. le tempérament n'est jamais modifié — la personnalité s'en écarte mais
 *    y reste attachée par un élastique ;
 * 2. la plasticité décroît avec l'âge. À huit ans, une humiliation redessine
 *    un caractère ; à cinquante, elle contrarie une soirée.
 */

import type { Ctx } from '../engine/context.ts';
import { fullName } from '../engine/context.ts';
import type { GameState, Person } from '../engine/types.ts';
import { clampStat, gainStat, type Rng } from '../engine/rng.ts';
import type {
  BondType, Compatibility, Fear, Interest, PersonalityAxes, Psyche, Values,
} from '../engine/psyche.ts';
import { AXIS_KEYS, BOND_OF_RELATION, VALUE_KEYS, VALUE_TENSIONS } from '../engine/psyche.ts';
import { INTERESTS } from '../data/interests.ts';
import { HABITS, HABIT_MAP } from '../data/habits.ts';
import { FEAR_MAP } from '../data/fears.ts';
import { AMBITION_MAP } from '../data/ambitions.ts';
import { ageWeight, getExperience } from '../data/experiences.ts';
import { exposureTo, type Signals } from './exposure.ts';
import { pickAmbitions } from './psycheGen.ts';
import { record } from './causality.ts';
import { getPsycheContext } from './contexts.ts';

/**
 * Plasticité de la personnalité à un âge donné.
 *
 * Élevée dans l'enfance, encore réelle à l'adolescence, résiduelle ensuite.
 * Elle ne tombe jamais à zéro : on change jusqu'au bout, simplement plus lentement.
 */
export function plasticity(age: number): number {
  if (age <= 6) return 1;
  if (age <= 18) return 1 - (age - 6) * 0.035;
  return Math.max(0.08, 0.58 - (age - 18) * 0.011);
}

/* ------------------------------------------------------------------ */
/* Intérêts                                                            */
/* ------------------------------------------------------------------ */

/**
 * Fait évoluer les centres d'intérêt.
 *
 * Un goût monte tant que l'exposition dépasse un seuil, et redescend dès
 * qu'elle s'arrête : c'est ainsi qu'un enfant passionné de football à dix ans
 * n'y touche plus à vingt s'il déménage loin de tout terrain. La compétence,
 * elle, suit le goût avec du retard et se perd beaucoup plus lentement.
 */
export function advanceInterests(ctx: Ctx, signals: Signals): void {
  const { state, rng } = ctx;
  const p = state.player;
  const psyche = p.psyche;
  const plast = plasticity(p.age);
  const time = p.origin.time.free;
  const conformity = getPsycheContext(state).conformity;

  for (const def of INTERESTS) {
    const { total, terms } = exposureTo(signals, def.id);
    let interest = psyche.interests.find((i) => i.id === def.id);

    // Le tempérament décide de ce qui accroche : deux enfants exposés au même
    // club n'y prennent pas le même goût.
    const fit = Object.entries(def.traits).reduce(
      (sum, [key, weight]) => sum + (psyche.axes[key as keyof PersonalityAxes] - 50) * (weight as number),
      0,
    ) / 100;

    // La perméabilité au groupe amplifie ce qui vient des autres : chez
    // quelqu'un qui cherche l'approbation, l'entourage pèse beaucoup plus que
    // ses propres penchants.
    const socialShare = terms
      .filter((t) => t.label.includes('passionné') || t.label.startsWith('ami'))
      .reduce((sum, t) => sum + t.strength, 0);
    const pull = (total + socialShare * (conformity - 1)) * (1 + fit) * (0.6 + plast * 0.7);

    if (!interest) {
      // Naissance d'un intérêt : il faut une exposition réelle, pas un hasard.
      if (pull < 0.55 || !rng.chance(Math.min(0.5, pull * 0.28))) continue;
      const origin = terms.length > 0 ? terms[0].label : 'sans raison apparente';
      interest = { id: def.id, level: rng.int(18, 32), skill: 0, years: 0, origin };
      psyche.interests.push(interest);
      record(state, {
        source: origin,
        target: `intérêt:${def.id}`,
        strength: pull,
        reason: origin === 'sans raison apparente'
          ? 'sans rien autour pour l’y pousser'
          : `y a été exposé par ${origin}`,
        age: p.age,
      });
      continue;
    }

    // Un intérêt entretenu monte, un intérêt délaissé s'éteint.
    const drift = pull > 0.45
      ? (pull - 0.45) * 14 * (0.5 + plast)
      : -(0.45 - pull) * 9;
    interest.level = clampStat(interest.level + drift + rng.float(-2, 2));

    // La pratique demande du temps : sans temps libre, le goût reste un goût.
    const practised = interest.level > 45 && time > 3;
    if (practised) {
      interest.years += 1;
      // La compétence progresse lentement et plafonne au niveau du goût.
      const ceiling = Math.min(100, interest.level + 15);
      const gain = (2.5 + interest.level / 26) * (0.6 + plast * 0.5)
        * (def.needs && (signals[def.needs] ?? 0) < 0.25 ? 0.35 : 1);
      interest.skill = Math.min(ceiling, clampStat(interest.skill + gain));
    } else if (interest.skill > 0) {
      // On n'oublie pas tout : la compétence s'érode doucement.
      interest.skill = clampStat(interest.skill - 0.8);
    }
  }

  // Les goûts éteints disparaissent de la liste, la compétence reste si elle
  // a été acquise — on n'oublie pas dix ans de piano.
  psyche.interests = psyche.interests.filter((i) => i.level > 8 || i.skill > 25);
}

/** Intérêts dominants, du plus fort au plus faible. */
export function topInterests(psyche: Psyche, count = 5): Interest[] {
  return [...psyche.interests].sort((a, b) => b.level - a.level).slice(0, count);
}

/** Meilleure compétence acquise, s'il y en a une. */
export function bestSkill(psyche: Psyche): Interest | null {
  const sorted = [...psyche.interests].sort((a, b) => b.skill - a.skill);
  return sorted.length > 0 && sorted[0].skill > 30 ? sorted[0] : null;
}

/* ------------------------------------------------------------------ */
/* Habitudes                                                           */
/* ------------------------------------------------------------------ */

/**
 * Installe, entretient et défait les habitudes.
 *
 * Une habitude naît d'un terrain — des traits, des valeurs, parfois un
 * intérêt — et d'un peu de temps disponible. Elle meurt quand le temps
 * manque ou quand la personne change, mais résiste d'autant plus qu'elle est
 * ancienne et agréable.
 */
export function advanceHabits(ctx: Ctx, signals: Signals): void {
  const { state, rng } = ctx;
  const p = state.player;
  const psyche = p.psyche;
  if (p.age < 8) return;

  const free = p.origin.time.free;

  for (const def of HABITS) {
    const existing = psyche.habits.find((h) => h.id === def.id);

    // Terrain favorable : traits, valeurs, intérêts déjà présents.
    const traitFit = Object.entries(def.traits).reduce(
      (sum, [k, w]) => sum + (psyche.axes[k as keyof PersonalityAxes] - 50) * (w as number),
      0,
    ) / 60;
    const valueFit = Object.entries(def.values).reduce(
      (sum, [k, w]) => sum + (psyche.values[k as keyof Values] - 50) * (w as number),
      0,
    ) / 80;
    const interestFit = (def.interests ?? []).reduce((max, id) => {
      const found = psyche.interests.find((i) => i.id === id);
      return Math.max(max, found ? found.level / 100 : 0);
    }, 0);
    const available = !def.needs || (signals[def.needs] ?? 0) > 0.3;

    const appeal = traitFit + valueFit + interestFit * 0.8;

    if (!existing) {
      if (!available || free < def.hoursEach * def.baseFrequency / 52) continue;
      if (appeal < 0.25) continue;
      if (!rng.chance(Math.min(0.32, appeal * 0.16))) continue;
      psyche.habits.push({
        id: def.id,
        frequency: Math.round(def.baseFrequency * rng.float(0.5, 0.9)),
        pleasure: clampStat(def.pleasure + rng.float(-12, 12)),
        importance: clampStat(30 + appeal * 22 + rng.float(-10, 10)),
        since: p.age,
        stickiness: clampStat(def.stickiness * 0.6 + rng.float(-10, 10)),
      });
      record(state, {
        source: appeal > 0.8 ? 'un penchant marqué' : 'les circonstances',
        target: `habitude:${def.id}`,
        strength: appeal,
        reason: `prend l’habitude : ${def.label.toLowerCase()}`,
        age: p.age,
      });
      continue;
    }

    // Une habitude installée s'ancre ou se délite.
    const years = p.age - existing.since;
    existing.stickiness = clampStat(existing.stickiness + Math.min(3, years * 0.4) + (existing.pleasure - 50) / 40);
    existing.importance = clampStat(existing.importance + appeal * 2 - 1);

    // Le manque de temps est la première cause d'abandon.
    const timePressure = free < 4 ? (4 - free) * 6 : 0;
    const decay = (appeal < 0 ? -appeal * 12 : 0) + timePressure - existing.stickiness / 8;
    existing.frequency = Math.max(0, Math.round(
      existing.frequency + (appeal * 6 - decay) + rng.float(-6, 6),
    ));
    if (!available) existing.frequency = Math.round(existing.frequency * 0.5);
    if (existing.frequency < 6) {
      psyche.habits = psyche.habits.filter((h) => h !== existing);
    }
  }
}

/**
 * Applique les effets annuels des habitudes.
 *
 * Les gains passent par `gainStat` : courir trois fois par semaine amène
 * quelqu'un de sédentaire à une bonne forme en quelques années, puis ne fait
 * plus que l'entretenir. Sans cela, soixante ans de course produiraient des
 * octogénaires en meilleure forme que leurs petits-enfants.
 */
export function applyHabitEffects(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  for (const habit of p.psyche.habits) {
    const def = HABIT_MAP[habit.id];
    if (!def) continue;
    // Une habitude pratiquée à moitié produit la moitié de l'effet.
    const intensity = Math.min(1.4, habit.frequency / Math.max(1, def.baseFrequency));
    for (const [key, value] of Object.entries(def.effects)) {
      const stat = key as keyof typeof p.stats;
      const delta = (value as number) * intensity * 0.4;
      p.stats[stat] = delta > 0 ? gainStat(p.stats[stat], delta) : clampStat(p.stats[stat] + delta);
    }
  }
}

/** Heures hebdomadaires consommées par les habitudes. */
export function habitHours(psyche: Psyche): number {
  return psyche.habits.reduce((sum, h) => {
    const def = HABIT_MAP[h.id];
    return sum + (def ? (h.frequency * def.hoursEach) / 52 : 0);
  }, 0);
}

/** Coût annuel des habitudes, en part du revenu médian. */
export function habitCostRatio(psyche: Psyche): number {
  return psyche.habits.reduce((sum, h) => {
    const def = HABIT_MAP[h.id];
    if (!def) return sum;
    return sum + def.cost * (h.frequency / Math.max(1, def.baseFrequency));
  }, 0);
}

/* ------------------------------------------------------------------ */
/* Peurs                                                               */
/* ------------------------------------------------------------------ */

/** Intensité d'une peur donnée, 0 si absente. */
export function fearLevel(psyche: Psyche, id: string): number {
  return psyche.fears.find((f) => f.id === id)?.intensity ?? 0;
}

/** Ajoute ou renforce une peur. */
export function addFear(state: GameState, psyche: Psyche, id: Fear['id'], amount: number, origin: string): void {
  const existing = psyche.fears.find((f) => f.id === id);
  if (existing) {
    existing.intensity = clampStat(existing.intensity + amount * 0.7);
    return;
  }
  const def = FEAR_MAP[id];
  psyche.fears.push({
    id,
    intensity: clampStat(amount),
    since: state.player.age,
    origin,
  });
  record(state, {
    source: origin,
    target: `peur:${id}`,
    strength: amount / 100,
    // La cible dit déjà de quelle peur il s'agit : la raison doit dire d'où
    // elle vient, sinon la ligne ne fait que répéter la question.
    reason: origin || (def ? `à cause de ${def.label.toLowerCase()}` : 'sans cause identifiée'),
    age: state.player.age,
  });
}

/**
 * Les peurs s'estompent si rien ne les ravive — mais seulement si la vie
 * apporte des démentis. Une peur du rejet ne recule pas dans une vie où
 * personne n'approche.
 */
function advanceFears(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const psyche = p.psyche;
  const doingWell = p.stats.happiness > 58 && p.stats.stress < 45;

  for (const fear of psyche.fears) {
    const def = FEAR_MAP[fear.id];
    if (!def) continue;
    const relief = doingWell ? def.fade : def.fade * 0.35;
    fear.intensity = clampStat(fear.intensity - relief);
  }
  psyche.fears = psyche.fears.filter((f) => f.intensity >= 12);
}

/* ------------------------------------------------------------------ */
/* Expériences formatrices                                             */
/* ------------------------------------------------------------------ */

/**
 * Applique une expérience marquante.
 *
 * C'est le point d'entrée qu'utilisent les autres systèmes quand quelque
 * chose d'important arrive : séparation, harcèlement, premier amour, mort
 * d'un proche. Une seule ligne suffit à l'appeler, et tout le reste — le
 * souvenir, la dérive de personnalité, la peur qui s'installe — découle de
 * la description déclarative.
 */
export function applyExperience(ctx: Ctx, id: string, opts: {
  person?: Person | null;
  /** Multiplicateur d'intensité, pour les cas plus ou moins graves. */
  scale?: number;
} = {}): void {
  const { state } = ctx;
  const p = state.player;
  const def = getExperience(id);
  if (!def) return;

  const psyche = p.psyche;
  const scale = opts.scale ?? 1;
  // Le même événement ne marque pas de la même façon selon l'âge, et une
  // personne très sensible encaisse plus fort.
  const sensitivity = 0.7 + psyche.axes.sensitivity / 170;
  const weight = ageWeight(def, p.age) * scale * sensitivity;
  if (weight < 0.05) return;

  const name = opts.person ? opts.person.firstName : 'quelqu’un';
  psyche.memories.push({
    id: `mem_${state.year}_${psyche.memories.length}`,
    age: p.age,
    kind: def.kind,
    text: def.memory.replace('{name}', name),
    weight: clampStat(def.intensity * weight),
    emotion: def.emotion,
    people: opts.person ? [opts.person.id] : [],
    fade: def.fade,
    recalled: 0,
  });

  for (const [key, delta] of Object.entries(def.axes ?? {})) {
    const axis = key as keyof PersonalityAxes;
    psyche.axes[axis] = clampStat(psyche.axes[axis] + (delta as number) * weight);
  }
  for (const [key, delta] of Object.entries(def.values ?? {})) {
    const value = key as keyof Values;
    psyche.values[value] = clampStat(psyche.values[value] + (delta as number) * weight);
  }
  if (def.selfEsteem) {
    psyche.self.selfEsteem = clampStat(psyche.self.selfEsteem + def.selfEsteem * weight);
  }
  if (def.fear) {
    addFear(state, psyche, def.fear.id, def.fear.amount * weight, def.memory.replace('{name}', name));
  }
  if (def.ambition && !psyche.ambitions.some((a) => a.id === def.ambition!.id)) {
    psyche.ambitions.push({
      id: def.ambition.id,
      weight: clampStat(def.ambition.weight * weight * 1.6),
      since: p.age,
      fulfilled: false,
      origin: def.memory.replace('{name}', name),
    });
  }
  if (def.habit && !psyche.habits.some((h) => h.id === def.habit)) {
    const habitDef = HABIT_MAP[def.habit];
    if (habitDef) {
      psyche.habits.push({
        id: def.habit,
        frequency: Math.round(habitDef.baseFrequency * 0.6),
        pleasure: habitDef.pleasure,
        importance: 45,
        since: p.age,
        stickiness: habitDef.stickiness * 0.7,
      });
    }
  }

  record(state, {
    source: id,
    target: 'personnalité',
    strength: weight,
    reason: def.memory.replace('{name}', name),
    age: p.age,
  });
}

/**
 * Les souvenirs pâlissent, et certains remontent.
 *
 * Un souvenir qui remonte n'est pas cosmétique : il repèse sur l'humeur de
 * l'année, ce qui explique ces années où tout va bien et où rien ne va.
 */
function advanceMemories(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const psyche = p.psyche;

  for (const memory of psyche.memories) {
    memory.weight = Math.max(0, memory.weight - memory.fade);
    // Plus un souvenir est chargé, plus il a de chances de revenir.
    if (memory.weight > 45 && rng.chance(memory.weight / 900)) {
      memory.recalled += 1;
      const good = ['joie', 'fierté', 'soulagement', 'nostalgie'].includes(memory.emotion);
      p.stats.happiness = clampStat(p.stats.happiness + (good ? 3 : -4));
      if (!good) p.stats.stress = clampStat(p.stats.stress + 3);
      ctx.log('life', `Un souvenir remonte : ${memory.text}`, good ? 'good' : 'neutral');
    }
  }
  // On garde les plus marquants : la mémoire n'est pas un journal complet.
  psyche.memories = psyche.memories.filter((m) => m.weight > 6);
  if (psyche.memories.length > 60) {
    psyche.memories.sort((a, b) => b.weight - a.weight);
    psyche.memories.length = 60;
  }
}

/* ------------------------------------------------------------------ */
/* Ambitions                                                           */
/* ------------------------------------------------------------------ */

/**
 * Les ambitions apparaissent, se réalisent, ou s'éteignent.
 *
 * Une ambition atteinte ne disparaît pas : elle procure une satisfaction
 * durable. Une ambition abandonnée laisse un regret, qui pèse discrètement
 * sur le bonheur pendant des années.
 */
function advanceAmbitions(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const psyche = p.psyche;

  // Naissance d'ambitions, à partir de ce à quoi la personne tient.
  if (p.age >= 12 && psyche.ambitions.length < 4 && rng.chance(0.16)) {
    const [fresh] = pickAmbitions(rng, psyche, p.age, 1);
    if (fresh && !psyche.ambitions.some((a) => a.id === fresh.id)) {
      psyche.ambitions.push(fresh);
      const def = AMBITION_MAP[fresh.id];
      if (def) ctx.log('life', `Tu sais maintenant ce que tu veux : ${def.label.toLowerCase()}.`, 'neutral');
    }
  }

  for (const ambition of psyche.ambitions) {
    const def = AMBITION_MAP[ambition.id];
    if (!def) continue;
    // Le poids d'une ambition suit les valeurs : ce à quoi on tient change.
    const fit = Object.entries(def.values).reduce(
      (sum, [k, w]) => sum + psyche.values[k as keyof Values] * (w as number),
      0,
    ) / 3;
    ambition.weight = clampStat(ambition.weight * 0.92 + fit * 0.08);

    if (!ambition.fulfilled && def.fulfilled(state)) {
      ambition.fulfilled = true;
      p.stats.happiness = clampStat(p.stats.happiness + ambition.weight / 6);
      psyche.self.selfEsteem = clampStat(psyche.self.selfEsteem + ambition.weight / 8);
      ctx.log('life', `Tu as obtenu ce que tu voulais : ${def.label.toLowerCase()}.`, 'good');
      record(state, {
        source: 'trajectoire',
        target: `ambition:${ambition.id}`,
        strength: ambition.weight / 100,
        reason: `ambition atteinte : ${def.label.toLowerCase()}`,
        age: p.age,
      });
    }
  }
  psyche.ambitions = psyche.ambitions.filter((a) => a.weight > 12 || a.fulfilled);
}

/**
 * Satisfaction de vie.
 *
 * C'est ici que les valeurs prennent tout leur sens : la même vie ne rend pas
 * heureuses deux personnes différemment câblées. Une carrière brillante et
 * solitaire comble quelqu'un qui vise la réussite et ronge quelqu'un qui
 * vise la famille.
 */
export function lifeSatisfaction(state: GameState): { score: number; reasons: string[] } {
  const p = state.player;
  const psyche = p.psyche;
  const reasons: string[] = [];
  let total = 0;
  let weightSum = 0;

  for (const ambition of psyche.ambitions) {
    const def = AMBITION_MAP[ambition.id];
    if (!def) continue;
    const progress = ambition.fulfilled ? 1 : def.progress(state);
    total += progress * ambition.weight;
    weightSum += ambition.weight;
    if (ambition.weight > 45) {
      reasons.push(progress > 0.7
        ? `${def.label.toLowerCase()} : accompli`
        : progress < 0.3
          ? `${def.label.toLowerCase()} : toujours hors de portée`
          : `${def.label.toLowerCase()} : en chemin`);
    }
  }

  // Les tensions de valeurs coûtent : vouloir deux choses incompatibles avec
  // la même force ne se paie jamais entièrement.
  let tension = 0;
  for (const [a, b, why] of VALUE_TENSIONS) {
    const both = Math.min(psyche.values[a], psyche.values[b]);
    if (both > 62) {
      tension += (both - 62) / 4;
      if (both > 76) reasons.push(why);
    }
  }

  const score = weightSum > 0
    ? clampStat((total / weightSum) * 100 - tension)
    : clampStat(50 - tension);
  return { score, reasons };
}

/* ------------------------------------------------------------------ */
/* Dérive annuelle                                                     */
/* ------------------------------------------------------------------ */

/** Contexte annuel passé à la mise à jour de la personnalité. */
export interface YearlyContext {
  /** Ce à quoi le personnage a été exposé cette année. */
  signals: Signals;
  /** Succès perçu de l'année, -1 à +1. */
  success: number;
  /** Chaleur reçue de l'entourage, 0-100. */
  warmth: number;
  /** Pression subie, 0-100. */
  pressure: number;
}

/**
 * Met à jour la personnalité pour l'année écoulée.
 *
 * Point d'entrée unique, appelé par `simulateYear`.
 */
export function updatePersonality(ctx: Ctx, context: YearlyContext): void {
  const { state, rng } = ctx;
  const p = state.player;
  const psyche = p.psyche;
  const plast = plasticity(p.age);

  advanceInterests(ctx, context.signals);
  advanceHabits(ctx, context.signals);
  applyHabitEffects(ctx);
  advanceFears(ctx);
  advanceMemories(ctx);
  advanceAmbitions(ctx);

  /* --- Estime de soi : la couche la plus mobile --- */
  const esteemTarget = clampStat(
    38
    + context.success * 22
    + context.warmth * 0.22
    + p.stats.reputation * 0.12
    + (p.origin.popularity.liked > 0 ? p.origin.popularity.liked / 6 : 0)
    - context.pressure * 0.12
    - fearLevel(psyche, 'failure') * 0.1,
  );
  // Une mauvaise année coûte d'autant plus cher qu'on encaisse mal la
  // critique ; une bonne année ne profite pas davantage pour autant.
  const criticism = getPsycheContext(state).criticismCost;
  const esteemGap = esteemTarget - psyche.self.selfEsteem;
  psyche.self.selfEsteem = clampStat(
    psyche.self.selfEsteem
    + esteemGap * (0.1 + plast * 0.2) * (esteemGap < 0 ? criticism : 1),
  );
  psyche.self.senseOfControl = clampStat(
    psyche.self.senseOfControl
    + (clampStat(35 + context.success * 25 + psyche.axes.independence * 0.2 - p.stats.stress * 0.15)
      - psyche.self.senseOfControl) * 0.12,
  );
  psyche.self.bodyImage = clampStat(
    psyche.self.bodyImage + (clampStat(p.stats.looks * 0.55 + p.stats.fitness * 0.25 + psyche.self.selfEsteem * 0.2)
      - psyche.self.bodyImage) * 0.15,
  );
  // La façade grandit quand ce qu'on montre s'éloigne de ce qu'on ressent.
  psyche.facade = Math.round(
    psyche.facade * 0.85
    + (psyche.axes.confidence - psyche.self.selfEsteem) * 0.15,
  ) + 0;
  psyche.self.authenticity = clampStat(90 - Math.abs(psyche.facade) * 0.7);

  /* --- Axes : dérive lente vers ce que la vie enseigne --- */
  const towards = (current: number, target: number, rate: number) =>
    clampStat(current + (target - current) * rate * plast);
  const a = psyche.axes;

  a.confidence = towards(a.confidence, clampStat(psyche.self.selfEsteem * 0.6 + p.stats.reputation * 0.25 + context.success * 15), 0.16);
  a.optimism = towards(a.optimism, clampStat(45 + context.success * 30 + p.stats.happiness * 0.2), 0.12);
  a.emotionalMaturity = clampStat(a.emotionalMaturity + (p.age < 30 ? 1.4 : 0.4) * plast + rng.float(-0.5, 0.8));
  a.patience = clampStat(a.patience + 0.5 * plast + rng.float(-0.6, 0.8));
  a.impulsivity = clampStat(a.impulsivity - 0.7 * plast + rng.float(-0.8, 0.6));
  a.caution = towards(a.caution, clampStat(a.caution + (context.success < -0.3 ? 12 : -4)), 0.1);
  a.riskTolerance = towards(a.riskTolerance, clampStat(45 + context.success * 20 - fearLevel(psyche, 'poverty') * 0.2), 0.1);
  a.sociability = towards(a.sociability, clampStat(p.origin.social.socialOpportunities * 0.35 + psyche.temperament.sociability * 0.5), 0.09);
  a.extraversion = towards(a.extraversion, clampStat(a.sociability * 0.5 + psyche.self.selfEsteem * 0.3 + 12), 0.08);
  a.discipline = towards(a.discipline, clampStat(p.stats.discipline * 0.5 + a.perseverance * 0.3 + 12), 0.1);
  a.ambition = towards(a.ambition, clampStat(psyche.values.achievement * 0.4 + psyche.values.career * 0.3 + p.origin.pressure * 0.15), 0.1);
  a.empathy = towards(a.empathy, clampStat(context.warmth * 0.4 + p.stats.karma * 0.35 + 12), 0.08);

  // Le tempérament reste le socle : quoi qu'il arrive, on n'en sort jamais
  // complètement. C'est ce qui empêche la personnalité de devenir une simple
  // fonction de l'environnement.
  const anchor = (axis: keyof PersonalityAxes, base: number, pull = 0.1) => {
    a[axis] = clampStat(a[axis] * (1 - pull) + base * pull);
  };
  anchor('sociability', psyche.temperament.sociability);
  anchor('sensitivity', psyche.temperament.sensitivity);
  anchor('perseverance', psyche.temperament.persistence);
  anchor('curiosity', psyche.temperament.curiosity);
  anchor('adaptability', psyche.temperament.adaptability);

  /* --- Valeurs : elles bougent, mais très lentement --- */
  const valueDrift = plast * 0.5;
  for (const key of VALUE_KEYS) {
    psyche.values[key] = clampStat(psyche.values[key] + rng.float(-valueDrift, valueDrift));
  }
  // Ce qu'on n'a pas prend de la valeur ; ce qu'on a en perd un peu.
  if (p.origin.finance.financialStress > 65) {
    psyche.values.money = clampStat(psyche.values.money + 0.8 * plast);
    psyche.values.stability = clampStat(psyche.values.stability + 0.6 * plast);
  }
  if (p.stats.stress > 70) {
    psyche.values.tranquillity = clampStat(psyche.values.tranquillity + 0.9 * plast);
  }

  /* --- Styles : ils suivent les axes --- */
  psyche.social.approachEase = towards(psyche.social.approachEase, clampStat(a.extraversion * 0.6 + a.confidence * 0.3), 0.14);
  psyche.social.fearOfJudgement = towards(psyche.social.fearOfJudgement, clampStat(55 - psyche.self.selfEsteem * 0.4 + a.sensitivity * 0.3), 0.14);
  psyche.social.assertiveness = towards(psyche.social.assertiveness, clampStat(a.confidence * 0.45 + a.courage * 0.25 + 12), 0.12);
  psyche.communication.assertiveness = psyche.social.assertiveness;
  psyche.decision.selfTrust = towards(psyche.decision.selfTrust, clampStat(psyche.self.senseOfControl * 0.5 + a.confidence * 0.35), 0.12);
  psyche.decision.impulsivity = a.impulsivity;
  psyche.decision.caution = a.caution;
  psyche.decision.riskTaking = a.riskTolerance;
  psyche.emotion.resilience = towards(psyche.emotion.resilience, clampStat(a.emotionalMaturity * 0.45 + a.optimism * 0.3 + 12), 0.12);
  psyche.emotion.stressManagement = towards(psyche.emotion.stressManagement, clampStat(a.emotionalMaturity * 0.4 + psyche.temperament.calm * 0.35), 0.1);
  psyche.identity.criticismSensitivity = towards(psyche.identity.criticismSensitivity, clampStat(a.sensitivity * 0.45 + (100 - psyche.self.selfEsteem) * 0.3), 0.12);

  // La synthèse courte, conservée pour l'affichage et les systèmes existants.
  syncTraits(state);
}

/**
 * Met à jour la synthèse `traits` à partir des axes détaillés.
 *
 * `traits` existait avant ce module et reste utilisé par plusieurs systèmes :
 * plutôt que de le supprimer partout, on le tient à jour comme une vue.
 */
export function syncTraits(state: GameState): void {
  const t = state.player.traits;
  const psyche = state.player.psyche;
  const a = psyche.axes;

  // La statistique `discipline` sert au calcul des notes et du travail. Elle
  // doit suivre le caractère, sinon un enfant tenace et un enfant qui lâche
  // tout finissent avec le même bulletin : le tempérament ne se verrait
  // qu'au travers de l'intelligence, dont les gains s'émoussent vite.
  const wanted = clampStat(a.discipline * 0.55 + a.perseverance * 0.45);
  const stats = state.player.stats;
  stats.discipline = clampStat(stats.discipline + (wanted - stats.discipline) * 0.18);

  t.ambition = a.ambition;
  t.discipline = a.discipline;
  t.confidence = a.confidence;
  t.empathy = a.empathy;
  t.independence = a.independence;
  t.materialism = psyche.values.money;
  t.studiousness = clampStat(psyche.values.knowledge * 0.6 + a.curiosity * 0.4);
  t.athleticism = clampStat(
    (psyche.interests.find((i) => i.id === 'course')?.level ?? 0) * 0.3
    + (psyche.interests.find((i) => i.id === 'football')?.level ?? 0) * 0.3
    + state.player.stats.fitness * 0.4,
  );
  t.creativity = a.creativity;
  t.sociability = a.sociability;
}

/* ------------------------------------------------------------------ */
/* Compatibilité                                                       */
/* ------------------------------------------------------------------ */

/**
 * Compatibilité entre deux personnes, pour un type de lien donné.
 *
 * Il n'existe pas de note absolue : deux personnes très compétitives font
 * d'excellents rivaux, des collègues stimulants et un couple épuisant. On
 * calcule donc séparément selon ce qu'on attend l'un de l'autre.
 */
export function calculateCompatibility(a: Psyche, b: Psyche, bond: BondType): Compatibility {
  const affinities: string[] = [];
  const frictions: string[] = [];

  /** Proximité sur un axe : 100 = identiques. */
  const near = (key: keyof PersonalityAxes) => 100 - Math.abs(a.axes[key] - b.axes[key]);
  /** Niveau partagé sur un axe : élevé si les deux sont hauts. */
  const both = (key: keyof PersonalityAxes) => Math.min(a.axes[key], b.axes[key]);

  // Les valeurs partagées comptent dans tous les liens, mais surtout en amour.
  let valueMatch = 0;
  for (const key of VALUE_KEYS) {
    valueMatch += 100 - Math.abs(a.values[key] - b.values[key]);
  }
  valueMatch /= VALUE_KEYS.length;

  let score: number;
  switch (bond) {
    case 'amour': {
      // En couple, deux compétiteurs s'usent : ce qui stimule au travail
      // devient une comparaison permanente à la maison.
      score = valueMatch * 0.3
        + near('emotionalMaturity') * 0.12
        + both('loyalty') * 0.14
        + near('extraversion') * 0.06
        + (100 - Math.max(a.axes.jealousy, b.axes.jealousy)) * 0.16
        + near('sociability') * 0.06
        + both('empathy') * 0.08
        + (100 - both('competitiveness')) * 0.08;
      if (valueMatch > 70) affinities.push('vous voulez la même chose de la vie');
      if (both('loyalty') > 70) affinities.push('vous êtes fiables l’un pour l’autre');
      if (Math.max(a.axes.jealousy, b.axes.jealousy) > 65) frictions.push('la jalousie est là');
      if (Math.abs(a.axes.extraversion - b.axes.extraversion) > 45) frictions.push('l’un sort, l’autre pas');
      if (both('competitiveness') > 65) frictions.push('vous vous mesurez sans arrêt');
      break;
    }
    case 'amitié': {
      // Ce qui fait une amitié : des goûts communs et un rythme compatible,
      // pas forcément les mêmes valeurs de fond.
      score = near('extraversion') * 0.16
        + near('sociability') * 0.14
        + both('honesty') * 0.14
        + valueMatch * 0.18
        + (100 - Math.abs(a.axes.aggression - b.axes.aggression)) * 0.1
        + both('empathy') * 0.12
        + near('creativity') * 0.08
        + both('optimism') * 0.08;
      if (near('extraversion') > 78) affinities.push('même rythme');
      if (both('honesty') > 68) affinities.push('vous ne vous mentez pas');
      if (Math.max(a.axes.aggression, b.axes.aggression) > 72) frictions.push('ça peut vite monter');
      break;
    }
    case 'travail': {
      // Deux compétiteurs sont stimulants au travail, contrairement au couple.
      score = both('discipline') * 0.2
        + both('organisation') * 0.14
        + both('competitiveness') * 0.12
        + near('ambition') * 0.14
        + both('honesty') * 0.14
        + (100 - Math.max(a.axes.aggression, b.axes.aggression)) * 0.12
        + near('patience') * 0.14;
      if (both('competitiveness') > 65) affinities.push('vous vous tirez vers le haut');
      if (both('discipline') > 70) affinities.push('on peut compter sur vous deux');
      if (Math.abs(a.axes.ambition - b.axes.ambition) > 45) frictions.push('vous n’avancez pas au même rythme');
      break;
    }
    case 'famille': {
      // En famille, on ne se choisit pas : la tolérance compte plus que
      // l'affinité, et les valeurs opposées font le plus de dégâts.
      score = both('patience') * 0.2
        + both('empathy') * 0.18
        + valueMatch * 0.24
        + (100 - Math.abs(a.axes.aggression - b.axes.aggression)) * 0.12
        + both('loyalty') * 0.16
        + near('emotionalMaturity') * 0.1;
      if (valueMatch < 45) frictions.push('vous ne voyez pas la vie pareil');
      if (both('loyalty') > 72) affinities.push('vous ne vous lâchez pas');
      if (Math.max(a.axes.aggression, b.axes.aggression) > 70) frictions.push('les repas finissent mal');
      break;
    }
  }

  return { score: clampStat(score), affinities, frictions };
}

/** Compatibilité avec un PNJ donné, selon la nature de la relation. */
export function compatibilityWith(state: GameState, person: Person): Compatibility | null {
  if (!person.psyche) return null;
  const bond = BOND_OF_RELATION[person.relation] ?? 'amitié';
  return calculateCompatibility(state.player.psyche, person.psyche, bond);
}

/* ------------------------------------------------------------------ */
/* Personnalité des PNJ                                                */
/* ------------------------------------------------------------------ */

/**
 * Fait vivre la personnalité des PNJ proches.
 *
 * Beaucoup plus léger que pour le joueur : on ne simule pas la vie
 * intérieure complète de trente personnes chaque année. Mais leurs intérêts
 * évoluent, ce qui suffit à ce que la transmission reste crédible — un frère
 * qui se met à la guitare à seize ans peut y amener le joueur à quatorze.
 */
export function advanceNpcPsyche(rng: Rng, person: Person): void {
  const psyche = person.psyche;
  if (!psyche) return;
  const plast = plasticity(person.age);

  for (const interest of psyche.interests) {
    interest.level = clampStat(interest.level + rng.float(-3, 3.4));
    if (interest.level > 45) {
      interest.years += 1;
      interest.skill = clampStat(interest.skill + 2 * (0.5 + plast));
    }
  }
  // Un PNJ peut se découvrir une passion, comme tout le monde.
  if (psyche.interests.length < 4 && rng.chance(0.12)) {
    const def = rng.pick(INTERESTS);
    if (!psyche.interests.some((i) => i.id === def.id)) {
      psyche.interests.push({
        id: def.id, level: rng.int(30, 55), skill: rng.int(0, 20),
        years: 0, origin: 'sa propre vie',
      });
    }
  }
  psyche.interests = psyche.interests.filter((i) => i.level > 12);

  psyche.axes.emotionalMaturity = clampStat(psyche.axes.emotionalMaturity + (person.age < 30 ? 1 : 0.3));
  psyche.axes.impulsivity = clampStat(psyche.axes.impulsivity - 0.5 * plast);
}

/** Donne une personnalité complète à un PNJ qui n'en a pas encore. */
export function ensurePsyche(rng: Rng, person: Person, build: (rng: Rng, age: number) => Psyche): void {
  if (person.psyche) return;
  person.psyche = build(rng, person.age);
}

/** Résumé lisible du caractère, pour les fiches de PNJ. */
export function describeCharacter(psyche: Psyche): string {
  const a = psyche.axes;
  const traits: string[] = [];
  const strongest = [...AXIS_KEYS]
    .map((key) => ({ key, value: a[key] }))
    .sort((x, y) => Math.abs(y.value - 50) - Math.abs(x.value - 50))
    .slice(0, 3);
  for (const { key, value } of strongest) {
    const high = value > 50;
    const words: Partial<Record<keyof PersonalityAxes, [string, string]>> = {
      extraversion: ['très sociable', 'plutôt réservé'],
      confidence: ['sûr de lui', 'hésitant'],
      empathy: ['attentif aux autres', 'peu démonstratif'],
      ambition: ['ambitieux', 'sans grande ambition'],
      discipline: ['rigoureux', 'désorganisé'],
      patience: ['patient', 'impatient'],
      impulsivity: ['impulsif', 'posé'],
      honesty: ['franc', 'arrangeant avec la vérité'],
      loyalty: ['loyal', 'volage'],
      generosity: ['généreux', 'près de ses sous'],
      creativity: ['créatif', 'terre-à-terre'],
      curiosity: ['curieux de tout', 'peu curieux'],
      courage: ['courageux', 'craintif'],
      caution: ['prudent', 'imprudent'],
      aggression: ['agressif', 'pacifique'],
      competitiveness: ['compétiteur', 'peu rivalitaire'],
      jealousy: ['jaloux', 'confiant'],
      independence: ['indépendant', 'dépendant des autres'],
      sociability: ['entouré', 'solitaire'],
      sensitivity: ['sensible', 'peu affecté'],
      optimism: ['optimiste', 'pessimiste'],
      adaptability: ['adaptable', 'rigide'],
      organisation: ['organisé', 'brouillon'],
      perseverance: ['persévérant', 'lâche vite'],
      spontaneity: ['spontané', 'prévisible'],
      emotionalMaturity: ['posé émotionnellement', 'à fleur de peau'],
      riskTolerance: ['joueur', 'frileux'],
    };
    const pair = words[key];
    if (pair) traits.push(high ? pair[0] : pair[1]);
  }
  return traits.join(', ');
}

/** Personne la plus proche, utilisée par plusieurs systèmes. */
export function closestPerson(state: GameState): Person | null {
  const people = Object.values(state.npcs).filter((p) => p.alive && !p.estranged && !p.petSpecies);
  if (people.length === 0) return null;
  return people.reduce((best, p) => (p.relationship > best.relationship ? p : best));
}

/** Nom lisible, réexporté pour les modules qui n'importent que ce fichier. */
export { fullName };

/**
 * Ancrage du tempérament sur les axes.
 *
 * Chaque année, `updatePersonality` rapproche certains axes de leur valeur de
 * tempérament : c'est ce qui empêche la personnalité de devenir une simple
 * fonction du milieu. L'effet est réel mais lent, donc invisible dans les
 * contextes d'une année donnée — on l'expose ici pour que l'audit puisse le
 * mesurer, et pour que l'interface puisse l'expliquer.
 */
export function temperamentPull(psyche: Psyche): number[] {
  const t = psyche.temperament;
  const a = psyche.axes;
  return [
    t.sociability - a.sociability,
    t.sensitivity - a.sensitivity,
    t.persistence - a.perseverance,
    t.curiosity - a.curiosity,
    t.adaptability - a.adaptability,
    t.calm - psyche.emotion.stressManagement,
    t.frustrationTolerance - psyche.emotion.angerControl,
    t.energy - a.extraversion,
    t.attentionNeed - psyche.identity.imageImportance,
    t.stimulationNeed - a.spontaneity,
    t.caution - a.caution,
    t.emotionalReactivity - a.impulsivity,
  ];
}
