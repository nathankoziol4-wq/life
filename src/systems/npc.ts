/**
 * Système PNJ : création, vieillissement et évolution autonome des
 * personnages non joueurs.
 *
 * Un PNJ n'est jamais généré « à l'ouverture d'un écran » : il est créé une
 * fois, enregistré dans la sauvegarde, puis vit sa propre vie (§6).
 */

import { clampStat, type Rng } from '../engine/rng.ts';
import { deathChance } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type {
  GameState, Orientation, Person, Personality, RelationKind, Sex, Stats,
} from '../engine/types.ts';
import { getNameSet } from '../data/names.ts';
import { getCountry } from '../data/countries.ts';
import { JOBS } from '../data/jobs.ts';

export interface CreatePersonOptions {
  relation: RelationKind;
  sex?: Sex;
  age?: number;
  lastName?: string;
  nameSet?: string;
  /** Richesse de référence (le PNJ oscille autour). */
  wealthBase?: number;
  relationship?: number;
  opinion?: number;
  /** Attribuer un métier cohérent avec l'âge. */
  withJob?: boolean;
  statsBias?: Partial<Stats>;
  parentIds?: string[];
}

const DEFAULT_STATS: Stats = {
  happiness: 60, health: 75, intelligence: 50, looks: 50,
  stress: 20, discipline: 50, karma: 50, reputation: 50,
  fitness: 55, addiction: 5, criminality: 5, fertility: 70,
};

export function rollPersonality(rng: Rng): Personality {
  return {
    warmth: rng.stat(58, 28),
    ambition: rng.stat(50, 32),
    temper: rng.stat(42, 30),
    loyalty: rng.stat(60, 28),
    generosity: rng.stat(52, 28),
    madness: rng.stat(18, 22),
    discipline: rng.stat(52, 28),
    religiosity: rng.stat(35, 32),
    sociability: rng.stat(55, 28),
  };
}

function rollOrientation(rng: Rng): Orientation {
  const roll = rng.next();
  if (roll < 0.9) return 'hetero';
  if (roll < 0.96) return 'homo';
  return 'bi';
}

/** Crée un PNJ complet et l'enregistre dans l'état. */
export function createPerson(ctx: Ctx, opts: CreatePersonOptions): Person {
  const { rng, state } = ctx;
  const country = getCountry(state.player?.countryId ?? 'fr');
  const names = getNameSet(opts.nameSet ?? country.nameSet);
  const sex: Sex = opts.sex ?? (rng.chance(0.5) ? 'M' : 'F');
  const firstName = rng.pick(sex === 'M' ? names.male : names.female);
  const lastName = opts.lastName ?? rng.pick(names.surnames);
  const age = opts.age ?? rng.int(18, 60);
  const birthYear = state.year - age;

  const stats: Stats = { ...DEFAULT_STATS };
  stats.intelligence = rng.stat(50, 30);
  stats.looks = rng.stat(50, 28);
  stats.health = rng.stat(age > 60 ? 58 : 78, 20);
  stats.happiness = rng.stat(60, 25);
  stats.fitness = rng.stat(age > 55 ? 45 : 60, 25);
  stats.fertility = age > 45 ? rng.stat(25, 25) : rng.stat(75, 20);
  stats.criminality = rng.stat(8, 14);
  stats.addiction = rng.stat(8, 14);
  stats.reputation = rng.stat(50, 22);
  stats.karma = rng.stat(52, 22);
  stats.discipline = rng.stat(52, 26);
  Object.assign(stats, opts.statsBias ?? {});
  for (const key of Object.keys(stats) as (keyof Stats)[]) stats[key] = clampStat(stats[key]);

  const personality = rollPersonality(rng);
  const wealthBase = opts.wealthBase ?? 20000;
  const wealth = Math.max(0, Math.round(rng.gauss(wealthBase, wealthBase * 0.8, 0, wealthBase * 6)));

  let jobTitle: string | null = null;
  let salary = 0;
  if (opts.withJob ?? (age >= 22 && age < 65)) {
    const job = rng.weighted(JOBS, (j) => (j.requiresLevel <= 2 ? 3 : 1));
    const levelIndex = Math.min(job.levels.length - 1, Math.floor((age - 22) / 9));
    const level = job.levels[Math.max(0, levelIndex)];
    jobTitle = level.title;
    salary = Math.round(level.salary * country.salaryIndex * rng.float(0.85, 1.2));
  }

  const p: Person = {
    id: ctx.id('p'),
    firstName,
    lastName,
    sex,
    birthYear,
    birthMonth: rng.int(1, 12),
    birthDay: rng.int(1, 28),
    age,
    alive: true,
    stats,
    personality,
    orientation: rollOrientation(rng),
    relation: opts.relation,
    relationship: opts.relationship ?? rng.int(45, 75),
    opinion: opts.opinion ?? rng.int(45, 75),
    wealth,
    jobTitle,
    salary,
    maritalStatus: age < 20 ? 'single' : rng.chance(0.55) ? 'married' : 'single',
    parentIds: opts.parentIds ?? [],
    childrenIds: [],
    partnerId: null,
    exPartnerIds: [],
    metYear: state.year,
    lastInteractionYear: state.year,
    interactionsThisYear: 0,
    estranged: false,
    incarcerated: false,
    history: [],
    flags: {},
  };
  state.npcs[p.id] = p;
  return p;
}

/** Ajoute une note à l'historique d'un PNJ. */
export function noteHistory(state: GameState, p: Person, text: string): void {
  p.history.push({ year: state.year, text });
  if (p.history.length > 60) p.history.shift();
}

/**
 * Vieillissement annuel d'un PNJ : statistiques, carrière, décès éventuel.
 * Renvoie `true` si le PNJ est mort cette année.
 */
export function agePerson(ctx: Ctx, p: Person): boolean {
  const { rng, state } = ctx;
  if (!p.alive) return false;
  p.age += 1;
  p.interactionsThisYear = 0;

  // Dérive naturelle des statistiques.
  if (p.age > 30) p.stats.health = clampStat(p.stats.health - rng.float(0.3, 1.5) * ((p.age - 25) / 40));
  if (p.age > 25) p.stats.looks = clampStat(p.stats.looks - rng.float(0, 0.9));
  if (p.age > 40) p.stats.fitness = clampStat(p.stats.fitness - rng.float(0.4, 1.6));
  if (p.age > 40) p.stats.fertility = clampStat(p.stats.fertility - rng.float(2, 6));
  p.stats.happiness = clampStat(p.stats.happiness + rng.float(-4, 4));

  // Carrière autonome : progression selon l'ambition.
  // Les augmentations ordinaires, celles qui ne changent pas le titre. Les
  // vraies promotions — celles qui font monter d'un échelon — sont un
  // tournant de `systems/lives.ts`, et elles s'écrivent dans son histoire.
  if (p.jobTitle && p.age < 65 && rng.percent(4 + p.personality.ambition / 12)) {
    p.salary = Math.round(p.salary * rng.float(1.03, 1.12));
  }
  if (p.age === 65 && p.jobTitle) {
    p.jobTitle = 'Retraité';
    p.salary = Math.round(p.salary * 0.5);
    noteHistory(state, p, 'Départ à la retraite.');
  }
  // Le patrimoine est tenu par `systems/lives.ts` : ce qu'on met de côté
  // quand on gagne, une part qu'on entame quand on ne gagne plus. La ligne
  // qui était ici retirait un montant fixe sans plancher, et ruinait 53,9 %
  // des personnes du jeu.

  // Décès.
  const chance = deathChance(p.age, p.stats, { inPrison: p.incarcerated });
  if (rng.chance(chance)) {
    killPerson(ctx, p, naturalCause(p.age, rng));
    return true;
  }
  return false;
}

function naturalCause(age: number, rng: Rng): string {
  if (age > 85) return rng.pick(['de vieillesse', 'paisiblement dans son sommeil', 'de complications liées à l’âge']);
  if (age > 60) return rng.pick(['d’une crise cardiaque', 'd’une longue maladie', 'd’un accident vasculaire']);
  if (age > 30) return rng.pick(['d’un accident', 'd’une maladie foudroyante', 'd’une crise cardiaque']);
  return rng.pick(['d’un accident', 'd’une maladie rare']);
}

/** Marque un PNJ comme décédé et propage les conséquences. */
export function killPerson(ctx: Ctx, p: Person, cause: string): void {
  const { state } = ctx;
  if (!p.alive) return;
  p.alive = false;
  p.deathYear = state.year;
  p.deathCause = cause;
  noteHistory(state, p, `Décès ${cause}.`);

  // Le partenaire devient veuf.
  const partner = person(state, p.partnerId);
  if (partner && partner.alive) {
    partner.maritalStatus = 'widowed';
    partner.partnerId = null;
    partner.stats.happiness = clampStat(partner.stats.happiness - 25);
  }
}

/** Description courte d'un PNJ pour les listes. */
export function describePerson(p: Person): string {
  if (p.petSpecies) return `${p.petSpecies}, ${p.age} an${p.age > 1 ? 's' : ''}`;
  const parts = [`${p.age} ans`];
  if (p.jobTitle) parts.push(p.jobTitle);
  return parts.join(' · ');
}

export { fullName };
