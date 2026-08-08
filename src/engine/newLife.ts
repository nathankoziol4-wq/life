/**
 * Génération d'une nouvelle vie (§5).
 *
 * Le contexte de naissance influence fortement le départ — richesse familiale,
 * pays, profession des parents — sans jamais verrouiller la suite : toutes les
 * trajectoires restent atteignables.
 */

import { clampStat, randomSeed, Rng } from './rng.ts';
import { createCtx, type Ctx } from './context.ts';
import type { GameState, Person, Player, Sex, Stats, WorldState } from './types.ts';
import { COUNTRIES, getCountry } from '../data/countries.ts';
import { getNameSet } from '../data/names.ts';
import { JOBS } from '../data/jobs.ts';
import { createPerson, noteHistory } from '../systems/npc.ts';
import { refreshMarkets } from '../systems/markets.ts';

export const SAVE_VERSION = 1;

/** Classes sociales de départ, avec leur poids et leur patrimoine familial. */
export const WEALTH_TIERS = [
  { id: 'poor', label: 'Famille en difficulté', weight: 18, wealth: 2000, income: 0.55, emoji: '🪣' },
  { id: 'modest', label: 'Famille modeste', weight: 30, wealth: 18000, income: 0.8, emoji: '🏚️' },
  { id: 'middle', label: 'Classe moyenne', weight: 32, wealth: 95000, income: 1.0, emoji: '🏠' },
  { id: 'upper', label: 'Famille aisée', weight: 15, wealth: 420000, income: 1.55, emoji: '🏡' },
  { id: 'rich', label: 'Famille fortunée', weight: 5, wealth: 3200000, income: 2.8, emoji: '🏛️' },
] as const;

export type WealthTierId = (typeof WEALTH_TIERS)[number]['id'];

export interface NewLifeOptions {
  seed?: number;
  countryId?: string;
  sex?: Sex;
  firstName?: string;
  lastName?: string;
  /** Année de naissance. Par défaut : année courante réelle. */
  birthYear?: number;
}

function emptyWorld(year: number): WorldState {
  return {
    year,
    propertyIndex: 1,
    jobMarket: 1,
    inflation: 1,
    economy: 0,
    jobOffers: [],
    propertyListings: [],
    vehicleListings: [],
    datingPool: [],
    lastLotteryYear: 0,
  };
}

/**
 * Contracte l'article d'un nom de ville : « Le Caire » → « au Caire ».
 * Sans cela, la ligne de naissance annonce « à Le Caire ».
 */
export function inCity(name: string): string {
  if (name.startsWith('Le ')) return `au ${name.slice(3)}`;
  if (name.startsWith('Les ')) return `aux ${name.slice(4)}`;
  if (name.startsWith('La ')) return `à la ${name.slice(3)}`;
  return `à ${name}`;
}

function baseStats(rng: Rng): Stats {
  return {
    happiness: rng.stat(72, 18),
    health: rng.stat(80, 16),
    intelligence: rng.stat(50, 30),
    looks: rng.stat(50, 30),
    stress: rng.stat(12, 10),
    discipline: rng.stat(45, 22),
    karma: 50,
    reputation: 50,
    fitness: rng.stat(60, 20),
    addiction: 0,
    criminality: rng.stat(5, 8),
    fertility: rng.stat(85, 12),
  };
}

/** Crée une partie complète, prête à jouer. */
export function createNewLife(opts: NewLifeOptions = {}): GameState {
  const seed = opts.seed ?? randomSeed();
  const birthYear = opts.birthYear ?? new Date().getFullYear();

  // État minimal pour amorcer le générateur, complété juste après.
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: seed,
    year: birthYear,
    player: null as unknown as Player,
    npcs: {},
    timeline: [],
    world: emptyWorld(birthYear),
    pending: [],
    idCounter: 0,
    eventLog: {},
    gameOver: false,
  };

  const rng = new Rng(state);
  const country = opts.countryId ? getCountry(opts.countryId) : rng.pick(COUNTRIES);
  const city = rng.weighted(country.cities, (c) => (c.size === 'métropole' ? 3 : c.size === 'ville' ? 2 : 1));
  const names = getNameSet(country.nameSet);
  const sex: Sex = opts.sex ?? (rng.chance(0.5) ? 'M' : 'F');
  const lastName = opts.lastName ?? rng.pick(names.surnames);
  const firstName = opts.firstName ?? rng.pick(sex === 'M' ? names.male : names.female);

  const tier = rng.weighted(WEALTH_TIERS, (t) => t.weight);
  const stats = baseStats(rng);

  // La richesse familiale influence légèrement le départ, sans déterminisme.
  if (tier.id === 'rich' || tier.id === 'upper') {
    stats.health = clampStat(stats.health + 6);
    stats.intelligence = clampStat(stats.intelligence + 5);
    stats.looks = clampStat(stats.looks + 3);
  } else if (tier.id === 'poor') {
    stats.health = clampStat(stats.health - 5);
    stats.stress = clampStat(stats.stress + 8);
    stats.discipline = clampStat(stats.discipline + 3); // la nécessité forge
  }

  const player: Player = {
    id: 'player',
    firstName,
    lastName,
    sex,
    orientation: rng.next() < 0.9 ? 'hetero' : rng.next() < 0.6 ? 'homo' : 'bi',
    birthYear,
    birthMonth: rng.int(1, 12),
    birthDay: rng.int(1, 28),
    age: 0,
    alive: true,
    deathCause: null,
    deathYear: null,
    countryId: country.id,
    originCountryId: country.id,
    cityName: city.name,
    stats,
    money: 0,
    lifetimeEarnings: 0,
    education: {
      stage: 'none',
      schoolName: null,
      yearInStage: 0,
      stageLength: 0,
      grades: 0,
      absences: 0,
      effort: 'normal',
      majorId: null,
      degrees: [],
      clubs: [],
      scholarship: false,
      studentLoan: 0,
      level: 0,
    },
    job: null,
    careerHistory: [],
    retired: false,
    pension: 0,
    properties: [],
    vehicles: [],
    pets: [],
    loans: [],
    valuables: [],
    diseases: [],
    criminalRecord: { arrests: 0, convictions: [], notoriety: 0, successfulCrimes: 0, wanted: false },
    prison: null,
    will: { shares: {}, updatedYear: birthYear },
    followers: 0,
    yearActions: {},
    flags: {
      familyWealth: tier.wealth,
      familyTier: tier.id,
      familyIncome: tier.income,
    },
    financeHistory: [],
  };
  state.player = player;

  const ctx = createCtx(state);
  ctx.log(
    'life',
    `Tu es né${sex === 'F' ? 'e' : ''} ${sex === 'F' ? 'fille' : 'garçon'} ${inCity(city.name)}, ${country.name}. ${tier.label}.`,
    'neutral',
  );
  generateFamily(ctx, tier, lastName, country.nameSet);
  refreshMarkets(ctx);
  return state;
}

function generateFamily(
  ctx: Ctx,
  tier: (typeof WEALTH_TIERS)[number],
  lastName: string,
  nameSet: string,
): void {
  const { rng, state } = ctx;
  const country = getCountry(state.player.countryId);

  const motherAge = Math.round(rng.gauss(30, 9, 16, 47));
  const fatherAge = Math.round(rng.gauss(motherAge + 2.5, 8, 17, 62));

  const mother = createPerson(ctx, {
    relation: 'mother', sex: 'F', age: motherAge, lastName, nameSet,
    wealthBase: tier.wealth / 2, relationship: rng.int(72, 95), opinion: rng.int(75, 98),
    withJob: rng.chance(0.72),
  });
  const father = createPerson(ctx, {
    relation: 'father', sex: 'M', age: fatherAge, lastName, nameSet,
    wealthBase: tier.wealth / 2, relationship: rng.int(65, 92), opinion: rng.int(70, 96),
    withJob: rng.chance(0.85),
  });

  // Les métiers des parents doivent être cohérents avec la classe sociale.
  assignParentJob(ctx, mother, tier);
  assignParentJob(ctx, father, tier);

  mother.partnerId = father.id;
  father.partnerId = mother.id;
  mother.maritalStatus = rng.chance(0.7) ? 'married' : 'dating';
  father.maritalStatus = mother.maritalStatus;
  mother.childrenIds.push(state.player.id);
  father.childrenIds.push(state.player.id);
  noteHistory(state, mother, `Naissance de ${state.player.firstName}.`);
  noteHistory(state, father, `Naissance de ${state.player.firstName}.`);

  // Un parent peut être absent dès le départ.
  if (rng.percent(11)) {
    const absent = rng.chance(0.75) ? father : mother;
    absent.relationship = rng.int(0, 22);
    absent.opinion = rng.int(10, 40);
    absent.estranged = true;
    absent.partnerId = null;
    const other = absent === father ? mother : father;
    other.partnerId = null;
    other.maritalStatus = 'single';
    noteHistory(state, absent, 'Quitte le foyer familial.');
  }

  // Fratrie : plus fréquente dans les familles modestes et nombreuses.
  const siblingCount = rng.weighted([0, 1, 2, 3, 4], (n) => {
    const base = [30, 38, 22, 8, 3][n];
    return tier.id === 'poor' || tier.id === 'modest' ? base * (1 + n * 0.12) : base;
  });
  for (let i = 0; i < siblingCount; i++) {
    const sibSex: Sex = rng.chance(0.5) ? 'M' : 'F';
    const ageGap = rng.int(-14, 14) || 2;
    const sibAge = Math.max(0, ageGap);
    const sib = createPerson(ctx, {
      relation: sibSex === 'M' ? 'brother' : 'sister',
      sex: sibSex,
      age: sibAge,
      lastName,
      nameSet,
      wealthBase: 0,
      relationship: rng.int(45, 88),
      opinion: rng.int(45, 88),
      withJob: sibAge >= 20,
      parentIds: [mother.id, father.id],
    });
    mother.childrenIds.push(sib.id);
    father.childrenIds.push(sib.id);
  }

  state.player.will.shares = {};

  // On nomme toujours les deux parents, y compris celui qui ne travaille pas :
  // sans cela, une famille à revenu unique n'annonce qu'un seul parent.
  // Le métier est présenté entre parenthèses, comme une étiquette : les
  // intitulés de la base sont au masculin et n'ont pas à s'accorder ici.
  const describeParent = (p: Person, role: 'mère' | 'père') => {
    const possessive = role === 'mère' ? 'ta mère' : 'ton père';
    const job = p.jobTitle ? ` (${p.jobTitle})` : ' (sans emploi)';
    const absent = p.estranged ? ', absent de ta vie' : '';
    return `${possessive} ${p.firstName}${job}${absent}`;
  };
  ctx.log(
    'family',
    `Tu grandis avec ${describeParent(mother, 'mère')} et ${describeParent(father, 'père')}.`,
    'neutral',
  );
  if (siblingCount > 0) {
    const brothers = Object.values(state.npcs).filter((x) => x.relation === 'brother').length;
    const sisters = Object.values(state.npcs).filter((x) => x.relation === 'sister').length;
    const parts = [
      brothers > 0 ? `${brothers} frère${brothers > 1 ? 's' : ''}` : null,
      sisters > 0 ? `${sisters} sœur${sisters > 1 ? 's' : ''}` : null,
    ].filter(Boolean);
    ctx.log('family', `Tu as ${parts.join(' et ')}.`, 'neutral');
  }
  void country;
}

/** Attribue au parent un métier cohérent avec la classe sociale de la famille. */
function assignParentJob(ctx: Ctx, p: Person, tier: (typeof WEALTH_TIERS)[number]): void {
  const { rng, state } = ctx;
  if (!p.jobTitle) return;
  const country = getCountry(state.player.countryId);
  const targetLevel = tier.id === 'rich' ? 4 : tier.id === 'upper' ? 3 : tier.id === 'middle' ? 2 : tier.id === 'modest' ? 1 : 0;
  const pool = JOBS.filter((j) => Math.abs(j.requiresLevel - targetLevel) <= 1 && j.minAge <= p.age);
  const job = pool.length ? rng.pick(pool) : rng.pick(JOBS);
  const maxLevel = job.levels.length - 1;
  const levelIndex = Math.min(maxLevel, Math.max(0, Math.floor((p.age - 24) / 8) + (tier.id === 'rich' ? 2 : 0)));
  const level = job.levels[levelIndex];
  p.jobTitle = level.title;
  p.salary = Math.round(level.salary * country.salaryIndex * tier.income * rng.float(0.9, 1.15));
  p.wealth = Math.round(tier.wealth / 2 * rng.float(0.6, 1.4));
}
