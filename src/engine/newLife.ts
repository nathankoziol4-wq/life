/**
 * Génération d'une nouvelle vie (§5).
 *
 * Le contexte de naissance influence fortement le départ — richesse familiale,
 * pays, profession des parents — sans jamais verrouiller la suite : toutes les
 * trajectoires restent atteignables.
 */

import { clampStat, randomSeed, Rng } from './rng.ts';
import { createCtx } from './context.ts';
import type { GameState, Player, Sex, Stats, WorldState } from './types.ts';
import type { Appearance, Genetics, OriginDraft, Temperament } from './origin.ts';
import { getCountry } from '../data/countries.ts';
import { getNameSet } from '../data/names.ts';
import { DISEASES } from '../data/diseases.ts';
import { HOUSING_PHRASE } from '../data/housing.ts';
import { refreshMarkets } from '../systems/markets.ts';
import { initialAssetPrices } from '../systems/investing.ts';
import { buildHousehold, describeHousehold } from '../systems/household.ts';
import {
  buildOrigin, initialTraits, randomAppearance, randomGenetics, resolveDraft,
} from '../systems/originGen.ts';
import { buildPsyche } from '../systems/psycheGen.ts';

/**
 * Version 3 : la sauvegarde porte la personnalité en couches
 * (`player.psyche` : tempérament, axes, valeurs, styles, peurs, intérêts,
 * habitudes, ambitions, souvenirs), le registre de causalité (`causality`) et
 * l'environnement détaillé — rue, voisins, distances, emplois du temps des
 * parents, classe, capitaux.
 *
 * Version 2 : environnement complet (`player.origin`), génétique et traits
 * acquis. Les parties de version 2 ne sont pas relues : la forme du
 * personnage a trop changé pour qu'une conversion soit honnête.
 */
export const SAVE_VERSION = 3;

/** Classes sociales de départ, avec leur poids et leur patrimoine familial. */
export const WEALTH_TIERS = [
  { id: 'poor', label: 'Famille en difficulté', weight: 18, wealth: 2000, income: 0.55, emoji: '🪣' },
  { id: 'modest', label: 'Famille modeste', weight: 30, wealth: 18000, income: 0.8, emoji: '🏚️' },
  { id: 'middle', label: 'Classe moyenne', weight: 32, wealth: 95000, income: 1.0, emoji: '🏠' },
  { id: 'upper', label: 'Famille aisée', weight: 15, wealth: 420000, income: 1.55, emoji: '🏡' },
  { id: 'rich', label: 'Famille fortunée', weight: 5, wealth: 3200000, income: 2.8, emoji: '🏛️' },
] as const;

export type WealthTierId = (typeof WEALTH_TIERS)[number]['id'];

/**
 * Pathologies pour lesquelles une prédisposition familiale a un sens. Elles
 * n'apparaissent pas d'office : la prédisposition ne fait que multiplier la
 * probabilité annuelle (`systems/health.ts`).
 */
const HEREDITARY_CATEGORIES = ['chronique', 'cardio', 'cancer', 'neuro', 'mentale'];
const HEREDITARY_POOL = DISEASES
  .filter((d) => HEREDITARY_CATEGORIES.includes(d.category))
  .map((d) => d.id);

export interface NewLifeOptions {
  seed?: number;
  countryId?: string;
  sex?: Sex;
  firstName?: string;
  lastName?: string;
  /** Année de naissance. Par défaut : année courante réelle. */
  birthYear?: number;
  /**
   * Environnement choisi à la création. Tout champ absent est tiré de manière
   * cohérente avec ceux qui sont fixés (`resolveDraft`).
   */
  draft?: Partial<OriginDraft>;
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
    assetPrices: initialAssetPrices(),
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

/**
 * Statistiques de naissance.
 *
 * Elles dépendent du corps et du caractère hérités, pas de l'environnement :
 * un nourrisson né dans un quartier huppé n'est pas plus intelligent qu'un
 * autre. L'écart se creusera — ou non — au fil des années.
 */
function baseStats(
  rng: Rng,
  genetics: Genetics,
  temperament: Temperament,
  appearance: Appearance,
): Stats {
  // Le potentiel hérité n'est qu'à moitié exprimé au départ : le reste se
  // révèle (ou se perd) avec la scolarité, la santé et les occasions.
  const express = (potential: number, spread: number) =>
    clampStat(rng.gauss(45 + (potential - 50) * 0.5, spread, 0, 100));

  return {
    happiness: rng.stat(72, 16),
    health: clampStat(rng.gauss(78 + (genetics.constitution - 50) * 0.3, 14, 0, 100)),
    intelligence: express(genetics.cognitivePotential, 18),
    looks: clampStat(
      rng.gauss(50, 22, 0, 100)
      + (appearance.build === 'athlétique' ? 4 : appearance.build === 'ronde' ? -3 : 0),
    ),
    stress: clampStat(rng.stat(12, 8) + (temperament.emotionalReactivity - 50) / 6),
    discipline: clampStat(rng.gauss(42 + (temperament.persistence - 50) * 0.25, 18, 0, 100)),
    karma: 50,
    reputation: 50,
    fitness: express(genetics.athleticPotential, 18) + 12,
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

  // 1. L'environnement d'abord : il conditionne tout le reste.
  const draft = resolveDraft(rng, {
    seed,
    countryId: opts.countryId,
    firstName: opts.firstName,
    lastName: opts.lastName,
    sex: opts.sex,
    ...opts.draft,
  });
  const built = buildOrigin(rng, draft, birthYear);
  const origin = built.origin;
  const country = getCountry(draft.countryId);
  const tier = built.tier;

  const names = getNameSet(country.nameSet);
  const sex: Sex = draft.sex ?? (rng.chance(0.5) ? 'M' : 'F');
  const lastName = draft.lastName ?? rng.pick(names.surnames);
  const firstName = draft.firstName ?? rng.pick(sex === 'M' ? names.male : names.female);

  // 2. Le corps et le caractère de naissance, indépendants de l'environnement.
  const appearance = randomAppearance(rng, sex, draft.appearance);
  const genetics = randomGenetics(rng, {
    countryLifespan: country.lifespan,
    disposableRatio: Math.max(0, origin.finance.disposableIncome) / built.nationalIncome,
    diseasePool: HEREDITARY_POOL,
  });
  // La personnalité complète : tempérament inné, puis tout ce qui en découle
  // et que la vie déplacera. C'est la seule source de tempérament du jeu.
  const psyche = buildPsyche(rng, { origin, temperament: draft.temperament, age: 0 });
  const stats = baseStats(rng, genetics, psyche.temperament, appearance);

  // À la naissance, l'environnement ne touche que ce qu'il touche vraiment :
  // la santé des premiers mois et le climat émotionnel du foyer. Tout le
  // reste — intelligence, discipline, ambition — se construira avec le temps.
  stats.health = clampStat(
    stats.health + (country.healthcare - 0.5) * 10 + (origin.finance.financialStress - 50) / 14,
  );
  stats.happiness = clampStat(stats.happiness + (origin.atmosphere.affection - 55) / 6);
  stats.stress = clampStat(stats.stress + (origin.atmosphere.stress - 25) / 7);

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
    cityName: origin.city.name,
    origin,
    appearance,
    genetics,
    traits: initialTraits(psyche.temperament, origin),
    psyche,
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
      clubStanding: {},
      discipline: {
        behaviour: 70,
        incidentsThisYear: 0,
        warnings: 0,
        detentions: 0,
        suspensions: 0,
        expelled: false,
        record: [],
      },
      scholarship: false,
      studentLoan: 0,
      level: 0,
    },
    job: null,
    careerHistory: [],
    retired: false,
    pension: 0,
    freelance: null,
    business: null,
    stage: null,
    properties: [],
    rentCollectedThisYear: 0,
    vehicles: [],
    holdings: [],
    financialLiteracy: 0,
    contacts: [],
    organization: null,
    pendingMission: null,
    pets: [],
    loans: [],
    valuables: [],
    diseases: [],
    criminalRecord: {
      arrests: 0, convictions: [], notoriety: 0, successfulCrimes: 0,
      heat: 0, investigation: null,
      wanted: false, wantedSince: null, escapedFrom: null,
    },
    prison: null,
    will: { shares: {}, updatedYear: birthYear },
    followers: 0,
    fame: {
      level: 0, peak: 0, field: 'aucun', controversy: 0, goodwill: 50,
      scandals: [], interview: null, earnedThisYear: 0,
    },
    yearActions: {},
    flags: {
      familyWealth: tier.wealth,
      familyTier: tier.id,
      familyIncome: tier.income,
      preset: draft.presetId,
    },
    financeHistory: [],
  };
  state.player = player;

  const ctx = createCtx(state);
  ctx.log(
    'life',
    `Tu es né${sex === 'F' ? 'e' : ''} ${sex === 'F' ? 'fille' : 'garçon'} ${inCity(origin.city.name)}, ${country.name}. ${tier.label}.`,
    'neutral',
  );
  ctx.log(
    'life',
    `Vous habitez ${origin.neighborhood.name}, ${origin.neighborhood.zone} : ${describeHousing(state)}.`,
    'neutral',
  );
  buildHousehold(ctx, built, draft);
  describeHousehold(ctx);
  if (draft.anomalyExplanation) {
    ctx.log('life', draft.anomalyExplanation, 'neutral');
  }
  refreshMarkets(ctx);
  return state;
}

/** Phrase décrivant le logement de naissance. */
function describeHousing(state: GameState): string {
  const h = state.player.origin.housing;
  const label = HOUSING_PHRASE[h.type] ?? h.type;
  const tenure = {
    locataire: 'en location',
    propriétaire: 'dont vous êtes propriétaires',
    accédant: 'acheté à crédit',
    logé: 'mis à votre disposition',
    'logement social': 'en logement social',
  }[h.tenure];
  return `${label} de ${h.areaM2} m² ${tenure}, ${h.bedrooms} chambre${h.bedrooms > 1 ? 's' : ''} pour ${h.occupants} personne${h.occupants > 1 ? 's' : ''}`;
}

