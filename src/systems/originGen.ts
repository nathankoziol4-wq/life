/**
 * Construction de l'environnement de naissance.
 *
 * Ce module transforme un brouillon de création (`OriginDraft`) en
 * environnement complet (`WorldOrigin`). Il ne décide de rien concernant la
 * vie du personnage : il pose seulement le décor, les contraintes et les
 * ressources. Les conséquences sont calculées ailleurs, dans
 * `systems/context.ts`, puis appliquées par les systèmes du moteur.
 *
 * Principe directeur : rien n'est tiré au hasard sans cause. Une valeur est
 * toujours dérivée du pays, de la région, de la ville, du quartier, du
 * logement, des moyens du foyer ou de ce que les parents valorisent.
 */

import { Rng as RngImpl, type Rng } from '../engine/rng.ts';
import type {
  Appearance,
  CitySize,
  DifficultyAxes,
  EnvironmentSnapshot,
  FamilyStructure,
  FamilyValues,
  Genetics,
  HouseholdAtmosphere,
  HouseholdFinance,
  HousingType,
  LocalEconomy,
  NearbyInfrastructure,
  NeighborhoodProfile,
  OpportunityAxes,
  OriginDraft,
  ParentingStyle,
  RegionProfile,
  ResidentialZone,
  SocialEnvironment,
  Temperament,
  Tenure,
  TransportProfile,
  WorldOrigin,
  CityProfile,
} from '../engine/origin.ts';
import type { AcquiredTraits } from '../engine/origin.ts';
import type { Sex } from '../engine/types.ts';
import { type Country, COUNTRIES, getCountry } from '../data/countries.ts';
import { buildCity, CITY_SIZE_LIST, regionsFor, REGION_MAP } from '../data/regions.ts';
import { buildNeighborhood, deriveNeighborhoodAxes, NEIGHBORHOOD_MAP, neighborhoodName } from '../data/neighborhoods.ts';
import {
  buildHousing, buildLivingConditions, HOUSING_MAP, HOUSING_PHRASE, housingForZone, tenuresFor,
} from '../data/housing.ts';
import { buildSchool, schoolName, schoolWeights } from '../data/schools.ts';
import { getPreset, ORIGIN_PRESETS, type OriginPreset } from '../data/originPresets.ts';
import { WEALTH_TIERS, type WealthTierId } from '../engine/newLife.ts';

/**
 * Revenu annuel médian du pays, en monnaie locale. Sert d'unité de mesure à
 * tout le reste : prix des logements, frais de scolarité, seuil de pauvreté.
 */
export function nationalIncome(country: Country): number {
  return Math.round(34000 * country.salaryIndex);
}

export function tierOf(id: WealthTierId): (typeof WEALTH_TIERS)[number] {
  return WEALTH_TIERS.find((t) => t.id === id) ?? WEALTH_TIERS[2];
}

/* ------------------------------------------------------------------ */
/* Résolution du brouillon                                             */
/* ------------------------------------------------------------------ */

function intersect<T>(a: readonly T[], b: readonly T[]): T[] {
  const out = a.filter((x) => b.includes(x));
  return out.length > 0 ? out : [...a];
}

/** Ville du pays la plus proche de la taille demandée. */
function pickCityName(rng: Rng, country: Country, size: CitySize): string {
  const wanted: Record<CitySize, 'village' | 'ville' | 'métropole'> = {
    village: 'village',
    'petite ville': 'village',
    'ville moyenne': 'ville',
    'grande ville': 'ville',
    métropole: 'métropole',
    capitale: 'métropole',
  };
  const target = wanted[size];
  const pool = country.cities.filter((c) => c.size === target);
  return rng.pick(pool.length > 0 ? pool : country.cities).name;
}

/**
 * Complète un brouillon partiel. Chaque champ absent est tiré de manière
 * *cohérente* avec les champs déjà fixés : choisir un quartier huppé puis
 * laisser le reste au hasard ne produit pas une ferme isolée.
 */
export function resolveDraft(rng: Rng, partial: Partial<OriginDraft> = {}): OriginDraft {
  const preset = partial.presetId
    ? getPreset(partial.presetId)
    : rng.weighted(ORIGIN_PRESETS, (p) => p.weight);

  const countryId = partial.countryId ?? rng.pick(COUNTRIES).id;
  const country = getCountry(countryId);
  const regions = regionsFor(countryId);

  const regionId = partial.regionId && regions.some((r) => r.id === partial.regionId)
    ? partial.regionId
    : rng.pick(regions.filter((r) => preset.regions.includes(r.id)).concat(regions.slice(0, 1)))
      .id;

  const archetype = REGION_MAP[regionId];
  const size = rng.pick(intersect(preset.citySizes, archetype?.citySizes ?? CITY_SIZE_LIST));
  const cityName = partial.cityName ?? pickCityName(rng, country, size);

  const neighborhoodId = partial.neighborhoodId && NEIGHBORHOOD_MAP[partial.neighborhoodId]
    ? partial.neighborhoodId
    : rng.pick(preset.neighborhoods);
  const nArch = NEIGHBORHOOD_MAP[neighborhoodId];
  const zone: ResidentialZone = partial.zone && nArch.zones.includes(partial.zone)
    ? partial.zone
    : rng.pick(intersect(preset.zones, nArch.zones));

  const zoneHousing = housingForZone(zone).map((h) => h.id);
  const housingType: HousingType = partial.housingType && zoneHousing.includes(partial.housingType)
    ? partial.housingType
    : rng.pick(intersect(preset.housing, zoneHousing));
  const tenure: Tenure = partial.tenure && tenuresFor(housingType).includes(partial.tenure)
    ? partial.tenure
    : rng.pick(intersect(preset.tenures, tenuresFor(housingType)));

  const structure: FamilyStructure = partial.structure ?? preset.structure;

  const siblings = partial.siblings ?? buildSiblings(rng, preset, structure);

  return {
    seed: partial.seed ?? 0,
    presetId: preset.id,
    countryId,
    regionId,
    cityName,
    neighborhoodId,
    zone,
    housingType,
    tenure,
    structure,
    siblings,
    overrides: partial.overrides ?? {},
    firstName: partial.firstName ?? null,
    lastName: partial.lastName ?? null,
    sex: partial.sex ?? null,
    appearance: partial.appearance ?? {},
    temperament: partial.temperament ?? {},
    anomalyExplanation: partial.anomalyExplanation ?? null,
  };
}

function buildSiblings(
  rng: Rng,
  preset: OriginPreset,
  structure: FamilyStructure,
): OriginDraft['siblings'] {
  const [lo, hi] = preset.siblings;
  const count = rng.int(lo, hi);
  const out: OriginDraft['siblings'] = [];
  for (let i = 0; i < count; i++) {
    const sex: Sex = rng.chance(0.5) ? 'M' : 'F';
    // Un écart d'âge nul est impossible hors jumeaux ; on l'évite.
    let ageGap = rng.int(-13, 13);
    if (ageGap === 0) ageGap = rng.chance(0.5) ? 2 : -2;
    // Dans une famille recomposée, une partie de la fratrie est demi ou adoptée.
    const kind = structure === 'famille recomposée' && rng.chance(0.55)
      ? 'demi'
      : structure === 'adoption' && rng.chance(0.4)
        ? 'adoptif'
        : 'plein';
    out.push({ sex, ageGap, kind });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Sous-ensembles de l'environnement                                   */
/* ------------------------------------------------------------------ */

/**
 * Minutes de trajet vers un équipement. En dessous du seuil `cutoff`,
 * l'équipement n'existe tout simplement pas à distance raisonnable.
 */
function minutesAway(rng: Rng, quality: number, cutoff: number, best: number, worst: number): number | null {
  if (quality < cutoff) return null;
  const t = (quality - cutoff) / Math.max(1, 100 - cutoff);
  return Math.max(2, Math.round(worst - (worst - best) * t + rng.float(-3, 4)));
}

function buildInfrastructure(rng: Rng, n: NeighborhoodProfile, city: CityProfile): NearbyInfrastructure {
  return {
    park: minutesAway(rng, n.greenSpace, 12, 3, 30),
    stadium: minutesAway(rng, (n.sportsFacilities + city.sports) / 2, 30, 6, 40),
    gym: minutesAway(rng, (n.sportsFacilities + city.sports) / 2, 34, 5, 35),
    library: minutesAway(rng, (n.schoolQuality + city.culture) / 2, 26, 6, 45),
    cinema: minutesAway(rng, city.entertainment, 30, 8, 50),
    mall: minutesAway(rng, (n.shops + city.shops) / 2, 32, 8, 45),
    shops: minutesAway(rng, n.shops, 8, 2, 30),
    publicTransport: minutesAway(rng, n.transport, 10, 2, 35),
    sportsClub: minutesAway(rng, n.childActivities, 24, 6, 40),
    musicSchool: minutesAway(rng, (n.childActivities + city.culture) / 2, 42, 8, 45),
    pool: minutesAway(rng, (n.sportsFacilities + city.sports) / 2, 40, 8, 45),
    nature: minutesAway(rng, Math.max(n.greenSpace, 100 - city.density), 8, 3, 45),
  };
}

function buildTransport(
  rng: Rng,
  n: NeighborhoodProfile,
  city: CityProfile,
  hasCar: boolean,
): TransportProfile {
  // Le mode de trajet découle de la densité et des transports disponibles.
  const walkable = n.density > 55 && n.shops > 50;
  const transit = n.transport > 60;
  const mode = walkable
    ? 'à pied'
    : transit
      ? (city.size === 'métropole' || city.size === 'capitale' ? 'métro' : 'bus')
      : hasCar
        ? 'voiture'
        : n.density > 30 ? 'vélo' : 'bus';

  const base = walkable ? rng.int(5, 15) : transit ? rng.int(12, 30) : rng.int(15, 45);
  return {
    schoolMode: mode,
    schoolMinutes: base,
    parentCommuteMinutes: Math.round(base * rng.float(1.2, 2.6) + (100 - n.localEmployment) / 4),
    cityCenterAccess: clamp(n.transport * 0.6 + city.transport * 0.4 - (n.zone === 'zone rurale' ? 25 : 0)),
  };
}

function buildSocial(rng: Rng, n: NeighborhoodProfile, occupants: number): SocialEnvironment {
  return {
    communityCohesion: n.communityCohesion,
    neighbourTrust: clamp(n.communityCohesion * 0.6 + n.safety * 0.4 + jit(rng, 8)),
    localActivities: clamp(n.childActivities * 0.7 + n.socialLife * 0.3),
    isolation: clamp(100 - n.socialLife * 0.5 - n.transport * 0.3 - n.density * 0.2),
    residentialMobility: clamp(100 - n.residentialStability),
    socialOpportunities: n.socialOpportunity,
    // Un quartier dense et familial concentre les enfants du même âge.
    peersNearby: Math.max(0, Math.round((n.density / 12 + n.childActivities / 14) * rng.float(0.6, 1.5) + occupants / 3)),
  };
}

function buildLocalEconomy(rng: Rng, region: RegionProfile, city: CityProfile): LocalEconomy {
  return {
    unemployment: clamp(city.unemployment + jit(rng, 3)),
    growth: Math.round((region.economy - 50) / 12 + rng.float(-1.5, 1.5)) / 2,
    priceIndex: 1,
    housingMarket: clamp(50 + (region.economy - 50) * 0.5 + jit(rng, 8)),
    businessCreation: clamp(city.jobOpportunity * 0.6 + region.economy * 0.4 + jit(rng, 8)),
    businessClosure: clamp(60 - region.economy * 0.4 + jit(rng, 8)),
  };
}

function buildValues(rng: Rng, preset: OriginPreset): FamilyValues {
  const base: FamilyValues = {
    school: 50, sport: 50, money: 50, work: 50, autonomy: 50,
    family: 50, manners: 50, creativity: 50, achievement: 50, leisure: 50,
  };
  for (const key of Object.keys(base) as (keyof FamilyValues)[]) {
    base[key] = clamp(base[key] + (preset.values[key] ?? 0) + jit(rng, 12));
  }
  return base;
}

/** Style parental moyen d'un préréglage, décliné ensuite par parent. */
export function buildParentingStyle(rng: Rng, preset: OriginPreset, spread = 10): ParentingStyle {
  const base: ParentingStyle = {
    affection: 58, authority: 50, discipline: 50, control: 48, supervision: 55,
    freedom: 50, academicExpectation: 50, encouragement: 52, communication: 50,
    emotionalSupport: 52, financialSupport: 50, patience: 50,
  };
  for (const key of Object.keys(base) as (keyof ParentingStyle)[]) {
    base[key] = clamp(base[key] + (preset.parenting[key] ?? 0) + jit(rng, spread));
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* Assemblage                                                          */
/* ------------------------------------------------------------------ */

export interface BuiltOrigin {
  origin: WorldOrigin;
  /** Classe sociale retenue, transmise au reste de la génération. */
  tier: (typeof WEALTH_TIERS)[number];
  /** Revenu médian national, unité de référence de tous les montants. */
  nationalIncome: number;
  /** Revenu brut attendu du foyer, réparti ensuite entre les parents. */
  targetHouseholdIncome: number;
  /** Nombre de parents vivant au foyer. */
  parentsInHousehold: number;
}

/**
 * Construit l'environnement complet, à l'exception des parents eux-mêmes :
 * ceux-ci sont des PNJ créés par `newLife`, qui rappelle ensuite
 * `attachParents()` puis `recomputeFinance()`.
 */
export function buildOrigin(rng: Rng, draft: OriginDraft, birthYear: number): BuiltOrigin {
  const country = getCountry(draft.countryId);
  const income = nationalIncome(country);
  const preset = getPreset(draft.presetId);
  const tier = tierOf(preset.tier);

  const regions = regionsFor(country.id);
  const region = regions.find((r) => r.id === draft.regionId) ?? regions[0];
  const archetype = REGION_MAP[region.id];
  const size = intersect(preset.citySizes, archetype?.citySizes ?? CITY_SIZE_LIST)[0];
  const city = buildCity(country.id, region, draft.cityName, size, (a, b) => rng.float(a, b));

  const neighborhood = buildNeighborhood(
    draft.neighborhoodId,
    draft.zone,
    neighborhoodName((arr) => rng.pick(arr)),
    income,
    city.propertyMult,
    (spread) => rng.float(-spread, spread),
  );

  const parentsInHousehold = draft.structure === 'parent seul' ? 1 : 2;
  const occupants = parentsInHousehold + 1 + draft.siblings.length;

  // Revenu brut du foyer : classe sociale × salaires locaux × nombre d'actifs.
  const earners = parentsInHousehold === 1 ? 1 : rng.chance(0.78) ? 2 : 1;
  const targetHouseholdIncome = Math.round(
    income * tier.income * city.salaryMult * (earners === 2 ? 1.72 : 1) * rng.float(0.85, 1.18),
  );

  const housing = buildHousing({
    type: draft.housingType,
    tenure: draft.tenure,
    occupants,
    nationalIncome: income,
    propertyMult: neighborhood.propertyMult * country.propertyIndex,
    rentMult: neighborhood.rentMult * country.propertyIndex,
    comfortBudget: clamp((targetHouseholdIncome / income) * 38),
    roll: (a, b) => rng.float(a, b),
  });

  const values = buildValues(rng, preset);
  // Niveau d'études estimé des parents : la classe sociale en dit long, mais
  // pas tout — la famille d'enseignants est modeste et très diplômée.
  const parentEducation = clamp(
    28 + tier.income * 18 + values.school * 0.35 + country.education * 22 + jit(rng, 10),
  );

  const disposable = Math.round(
    targetHouseholdIncome * (1 - country.taxRate) - housing.annualHousingCost
    - occupants * income * 0.09 * country.costIndex * city.costMult,
  );

  const living = buildLivingConditionsFor(rng, {
    housing,
    children: 1 + draft.siblings.length,
    incomeRatio: Math.max(0, disposable) / income,
    year: birthYear,
    climate: region.climate,
    transport: neighborhood.transport,
    parentEducation,
    culturalValues: values.creativity,
  });

  const infrastructure = buildInfrastructure(rng, neighborhood, city);
  const transport = buildTransport(rng, neighborhood, city, living.familyCar);

  const rurality = clamp(100 - city.density * 0.6 - neighborhood.density * 0.4);
  const weights = schoolWeights({
    educationAccess: neighborhood.educationAccess,
    schoolQuality: neighborhood.schoolQuality,
    incomeRatio: Math.max(0, disposable) / income,
    schoolValue: values.school,
    rurality,
    countryEducation: country.education,
  });
  const chosen = rng.weighted(weights, (w) => w.weight);
  const school = buildSchool({
    archetypeId: chosen.id,
    stage: 'primary',
    name: schoolName(chosen.id, 'primary', (arr) => rng.pick(arr)),
    neighborhoodQuality: neighborhood.schoolQuality,
    countryEducation: country.education,
    nationalIncome: income,
    jitter: (spread) => rng.float(-spread, spread),
    roll: (a, b) => rng.float(a, b),
  });

  const finance: HouseholdFinance = {
    salaries: {},
    otherIncome: 0,
    benefits: 0,
    assets: Math.round(tier.wealth * rng.float(0.6, 1.5)),
    savings: Math.round(tier.wealth * 0.18 * rng.float(0.3, 1.6)),
    debt: draft.tenure === 'accédant' ? Math.round(housing.value * rng.float(0.45, 0.85)) : 0,
    housingCost: housing.annualHousingCost,
    livingExpenses: Math.round(occupants * income * 0.09 * country.costIndex * city.costMult),
    dependents: 1 + draft.siblings.length,
    behaviour: rng.weighted(
      ['très économe', 'prudent', 'équilibré', 'dépensier', 'très dépensier'] as const,
      (b) => {
        // Les foyers serrés sont plus souvent économes par nécessité ; les
        // foyers aisés se permettent plus souvent de dépenser.
        const rich = tier.income > 1.3;
        return { 'très économe': rich ? 8 : 20, prudent: 26, équilibré: 30, dépensier: rich ? 24 : 16, 'très dépensier': rich ? 12 : 6 }[b];
      },
    ),
    jobSecurity: clamp(48 + tier.income * 12 + (100 - city.unemployment) * 0.2 + jit(rng, 10)),
    disposableIncome: disposable,
    financialStress: 0,
  };

  const atmosphere = buildAtmosphere(rng, {
    structure: draft.structure,
    housing,
    occupants,
    values,
    financialStress: 0,
  });

  const social = buildSocial(rng, neighborhood, occupants);
  const economy = buildLocalEconomy(rng, region, city);

  const snapshot: EnvironmentSnapshot = {
    fromAge: 0,
    toAge: null,
    cityName: city.name,
    neighborhoodName: neighborhood.name,
    zone: neighborhood.zone,
    housingType: housing.type,
    reason: 'Naissance',
  };

  const origin: WorldOrigin = {
    countryId: country.id,
    region,
    city,
    neighborhood,
    housing,
    living,
    infrastructure,
    transport,
    school,
    structure: draft.structure,
    parents: [],
    couple: null,
    values,
    atmosphere,
    finance,
    social,
    economy,
    opportunities: zeroOpportunities(),
    difficulties: zeroDifficulties(),
    anomalyExplanation: draft.anomalyExplanation,
    history: [snapshot],
    memories: [],
  };

  recomputeFinance(origin, income, country.taxRate);
  recomputeAxes(origin, income);

  return { origin, tier, nationalIncome: income, targetHouseholdIncome, parentsInHousehold };
}

/** Conditions de vie, avec le générateur du moteur branché dessus. */
function buildLivingConditionsFor(rng: Rng, opts: {
  housing: WorldOrigin['housing'];
  children: number;
  incomeRatio: number;
  year: number;
  climate: number;
  transport: number;
  parentEducation: number;
  culturalValues: number;
}) {
  return buildLivingConditions({
    ...opts,
    chance: (p: number) => rng.chance(p),
    roll: (a: number, b: number) => rng.float(a, b),
  });
}

function buildAtmosphere(rng: Rng, opts: {
  structure: FamilyStructure;
  housing: WorldOrigin['housing'];
  occupants: number;
  values: FamilyValues;
  financialStress: number;
}): HouseholdAtmosphere {
  const crowding = clamp(100 - (opts.housing.areaM2 / Math.max(1, opts.occupants)) * 2.4);
  const structurePenalty = {
    'deux parents': 0,
    'parent seul': 10,
    'parents séparés': 18,
    'famille recomposée': 14,
    adoption: 6,
    'famille d’accueil': 22,
    'grands-parents': 8,
  }[opts.structure];

  const conflict = clamp(24 + crowding * 0.2 + opts.financialStress * 0.25 + structurePenalty * 0.6 + jit(rng, 12));
  return {
    calm: clamp(72 - crowding * 0.35 - conflict * 0.35 + jit(rng, 10)),
    conflict,
    affection: clamp(62 + opts.values.family * 0.2 - conflict * 0.25 + jit(rng, 12)),
    communication: clamp(52 + opts.values.family * 0.15 - structurePenalty * 0.4 + jit(rng, 12)),
    stability: clamp(74 - structurePenalty * 1.1 - opts.financialStress * 0.25 + jit(rng, 10)),
    stress: clamp(20 + opts.financialStress * 0.45 + crowding * 0.2 + jit(rng, 10)),
    organisation: clamp(50 + opts.values.manners * 0.2 - crowding * 0.15 + jit(rng, 12)),
    privacy: clamp(100 - crowding * 0.85 + (opts.housing.bedrooms - 1) * 6),
  };
}

/* ------------------------------------------------------------------ */
/* Recalculs — appelés à la création puis chaque année                 */
/* ------------------------------------------------------------------ */

/**
 * Recalcule le revenu disponible et la tension financière du foyer.
 * C'est cette fonction qui transforme « les parents gagnent X » en « il reste
 * Y à la fin du mois », la seule mesure qui compte réellement.
 */
export function recomputeFinance(origin: WorldOrigin, income: number, taxRate: number): void {
  const f = origin.finance;
  const gross = Object.values(f.salaries).reduce((a, b) => a + b, 0) + f.otherIncome;
  const net = gross * (1 - taxRate) + f.benefits;
  const outgo = f.housingCost + f.livingExpenses + f.debt * 0.06;
  f.disposableIncome = Math.round(net - outgo);

  // La tension ne dépend pas du revenu absolu mais de la marge : un foyer
  // aisé très endetté vit plus mal qu'un foyer modeste sans charges.
  const margin = net > 0 ? f.disposableIncome / net : -1;
  const spendingPressure = {
    'très économe': -12, prudent: -6, équilibré: 0, dépensier: 8, 'très dépensier': 16,
  }[f.behaviour];
  f.financialStress = clamp(
    58 - margin * 130
    + Math.max(0, (f.debt - f.assets) / Math.max(1, income)) * 6
    + (100 - f.jobSecurity) * 0.18
    + spendingPressure,
  );
}

function zeroOpportunities(): OpportunityAxes {
  return { education: 0, career: 0, financial: 0, social: 0, cultural: 0, sport: 0 };
}

function zeroDifficulties(): DifficultyAxes {
  return { financial: 0, familyInstability: 0, education: 0, social: 0, geographicIsolation: 0 };
}

/**
 * Recalcule les axes d'opportunité et de difficulté.
 *
 * Volontairement multidimensionnel : un même environnement peut être très
 * favorable sur un axe et très défavorable sur un autre. Il n'existe aucun
 * score global « qualité de l'environnement », et c'est délibéré.
 */
export function recomputeAxes(origin: WorldOrigin, income: number): void {
  // Les axes synthétiques du quartier sont re-dérivés de ses composantes :
  // sans cela, modifier la sécurité ou la qualité des écoles n'aurait aucune
  // conséquence tant que le quartier n'évolue pas de lui-même.
  Object.assign(origin.neighborhood, deriveNeighborhoodAxes(origin.neighborhood, income));
  const { neighborhood: n, city, region, finance, living, social, school, values, infrastructure } = origin;
  const near = (v: number | null, good: number) => (v === null ? 0 : clamp(100 - (v / good) * 50));
  const ratio = clamp((finance.disposableIncome / Math.max(1, income)) * 55);

  origin.opportunities = {
    education: clamp(
      n.educationAccess * 0.32
      + (school ? school.academic : 40) * 0.24
      + city.universities * 0.14
      + values.school * 0.14
      + ratio * 0.1
      + (living.studySpace ? 4 : 0) + (living.booksAtHome ? 2 : 0),
    ),
    career: clamp(
      city.jobOpportunity * 0.3
      + n.economicOpportunity * 0.24
      + region.economy * 0.18
      + (100 - city.unemployment) * 0.14
      + finance.jobSecurity * 0.14,
    ),
    financial: clamp(
      ratio * 0.46
      + clamp((finance.assets / Math.max(1, income)) * 10) * 0.3
      + finance.jobSecurity * 0.24,
    ),
    social: clamp(
      n.socialOpportunity * 0.34
      + Math.min(100, social.peersNearby * 7) * 0.22
      + city.entertainment * 0.16
      + social.communityCohesion * 0.18
      + (living.ownBedroom ? 6 : 0) + (origin.housing.comfort > 55 ? 4 : 0),
    ),
    cultural: clamp(
      city.culture * 0.3
      + values.creativity * 0.24
      + near(infrastructure.library, 20) * 0.16
      + near(infrastructure.musicSchool, 25) * 0.12
      + (living.booksAtHome ? 10 : 0)
      + (living.musicalInstrument ? 8 : 0),
    ),
    sport: clamp(
      n.sportsFacilities * 0.3
      + values.sport * 0.26
      + near(infrastructure.stadium, 25) * 0.14
      + near(infrastructure.gym, 20) * 0.12
      + near(infrastructure.pool, 30) * 0.08
      + (living.garden ? 6 : 0) + (living.familyCar ? 4 : 0),
    ),
  };

  origin.difficulties = {
    financial: finance.financialStress,
    familyInstability: clamp(
      (100 - origin.atmosphere.stability) * 0.5
      + origin.atmosphere.conflict * 0.3
      + (origin.structure === 'deux parents' ? 0 : 14),
    ),
    education: clamp(
      (100 - n.educationAccess) * 0.4
      + (school ? 100 - school.academic : 50) * 0.3
      + (living.studySpace ? 0 : 12)
      + (living.ownBedroom ? 0 : 8)
      + (origin.transport.schoolMinutes > 35 ? 8 : 0),
    ),
    social: clamp(
      social.isolation * 0.34
      + n.crimeExposure * 0.3
      + (100 - social.communityCohesion) * 0.2
      + (100 - n.reputation) * 0.16,
    ),
    geographicIsolation: clamp(
      (100 - n.transport) * 0.4
      + (100 - city.transport) * 0.2
      + (100 - origin.transport.cityCenterAccess) * 0.25
      + (living.familyCar ? 0 : 15),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Apparence, génétique, tempérament                                   */
/* ------------------------------------------------------------------ */

const FACE_SHAPES = ['ovale', 'ronde', 'carrée', 'allongée', 'en cœur', 'anguleuse'];
const EYE_COLORS = ['marron', 'noisette', 'verts', 'bleus', 'gris', 'ambre', 'noirs'];
const HAIR_COLORS = ['bruns', 'châtains', 'noirs', 'blonds', 'roux', 'auburn', 'poivre et sel'];
const HAIR_STYLES = ['courts', 'mi-longs', 'longs', 'bouclés', 'crépus', 'ondulés', 'raides'];
const SKIN_TONES = ['très claire', 'claire', 'mate', 'dorée', 'brune', 'foncée', 'très foncée'];
const FEATURES = [
  'des taches de rousseur', 'une fossette au menton', 'un grain de beauté marqué',
  'des sourcils épais', 'un regard perçant', 'une cicatrice au sourcil',
  'des pommettes hautes', 'un sourire en coin', 'des oreilles décollées',
  'une mèche rebelle', 'de longs cils', 'une voix grave',
];

export function randomAppearance(rng: Rng, sex: Sex, partial: Partial<Appearance> = {}): Appearance {
  const meanHeight = sex === 'M' ? 176 : 163;
  return {
    faceShape: partial.faceShape ?? rng.pick(FACE_SHAPES),
    eyeColor: partial.eyeColor ?? rng.pick(EYE_COLORS),
    hairColor: partial.hairColor ?? rng.pick(HAIR_COLORS),
    hairStyle: partial.hairStyle ?? rng.pick(HAIR_STYLES),
    skinTone: partial.skinTone ?? rng.pick(SKIN_TONES),
    targetHeight: partial.targetHeight ?? Math.round(rng.gauss(meanHeight, 11, meanHeight - 24, meanHeight + 24)),
    build: partial.build ?? rng.weighted(
      ['mince', 'athlétique', 'moyenne', 'robuste', 'ronde'] as const,
      (b) => ({ mince: 22, athlétique: 18, moyenne: 32, robuste: 16, ronde: 12 }[b]),
    ),
    features: partial.features ?? rng.sample(FEATURES, rng.int(0, 2)),
  };
}

/**
 * Génétique. Les prédispositions sont héritées, pas décidées : elles
 * modifient la probabilité d'une maladie, jamais sa survenue.
 */
export function randomGenetics(rng: Rng, opts: {
  /** Longévité du pays, en années d'écart. */
  countryLifespan: number;
  /** Aisance du foyer : la nutrition et les soins de l'enfance comptent. */
  disposableRatio: number;
  diseasePool: string[];
}): Genetics {
  const predispositions: string[] = [];
  const count = rng.weighted([0, 1, 2, 3], (n) => [46, 32, 16, 6][n]);
  for (const id of rng.sample(opts.diseasePool, count)) predispositions.push(id);

  return {
    cognitivePotential: rng.stat(52, 24),
    athleticPotential: rng.stat(52, 24),
    constitution: clamp(rng.stat(56, 20) + Math.min(10, opts.disposableRatio * 6)),
    longevityBonus: Math.round(rng.gauss(0, 6, -12, 14) + opts.countryLifespan / 2),
    predispositions,
  };
}

export function randomTemperament(rng: Rng, partial: Partial<Temperament> = {}): Temperament {
  return {
    reactivity: partial.reactivity ?? rng.stat(50, 24),
    sociability: partial.sociability ?? rng.stat(50, 24),
    persistence: partial.persistence ?? rng.stat(50, 22),
    boldness: partial.boldness ?? rng.stat(50, 24),
    sensitivity: partial.sensitivity ?? rng.stat(50, 22),
    curiosity: partial.curiosity ?? rng.stat(52, 22),
  };
}

/**
 * Traits acquis au départ. Ils partent près du tempérament, puisque
 * l'expérience n'a encore rien construit ; l'environnement les fera dériver
 * année après année (`systems/environment.ts`).
 */
export function initialTraits(temperament: Temperament, origin: WorldOrigin): AcquiredTraits {
  const v = origin.values;
  return {
    ambition: clamp(40 + v.achievement * 0.2 + temperament.persistence * 0.1),
    discipline: clamp(38 + temperament.persistence * 0.25 + v.manners * 0.12),
    confidence: clamp(42 + temperament.boldness * 0.25 + origin.atmosphere.affection * 0.1),
    empathy: clamp(40 + temperament.sensitivity * 0.3 + v.family * 0.1),
    independence: clamp(35 + temperament.boldness * 0.2 + v.autonomy * 0.2),
    materialism: clamp(35 + v.money * 0.3),
    studiousness: clamp(35 + v.school * 0.25 + temperament.curiosity * 0.15),
    athleticism: clamp(35 + v.sport * 0.25 + temperament.boldness * 0.1),
    creativity: clamp(35 + v.creativity * 0.25 + temperament.curiosity * 0.2),
    sociability: clamp(30 + temperament.sociability * 0.45 + v.family * 0.08),
  };
}

/* ------------------------------------------------------------------ */

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(100, v)));
}

function jit(rng: Rng, spread: number): number {
  return rng.float(-spread, spread);
}

/* ------------------------------------------------------------------ */
/* Aperçu et cohérence — utilisés par l'écran de création              */
/* ------------------------------------------------------------------ */

/**
 * Construit un environnement complet à partir d'un brouillon, sans créer de
 * partie. Sert à montrer, pendant la création, ce que les choix produisent
 * *réellement* : le quartier, le logement, l'école, les axes d'opportunité.
 *
 * Le foyer n'est pas peuplé (les parents sont des PNJ, créés au moment de la
 * naissance) : on estime seulement leurs revenus pour que le bilan financier
 * affiché soit celui de la vraie partie.
 */
export function previewOrigin(partial: Partial<OriginDraft>, seed: number, birthYear: number): {
  draft: OriginDraft;
  origin: WorldOrigin;
  nationalIncome: number;
} {
  const host = { rngState: seed >>> 0 };
  const rng = new RngImpl(host);
  const draft = resolveDraft(rng, partial);
  const built = buildOrigin(rng, draft, birthYear);
  const country = getCountry(draft.countryId);

  // Revenus estimés des parents, pour que le bilan affiché soit réaliste.
  const earners = draft.structure === 'parent seul' ? 1 : 2;
  for (let i = 0; i < earners; i++) {
    built.origin.finance.salaries[`aperçu_${i}`] = Math.round(
      built.targetHouseholdIncome / earners,
    );
  }
  recomputeFinance(built.origin, built.nationalIncome, country.taxRate);
  recomputeAxes(built.origin, built.nationalIncome);

  return { draft, origin: built.origin, nationalIncome: built.nationalIncome };
}

export interface CoherenceWarning {
  /** Question posée au joueur, jamais un refus. */
  question: string;
  /** Explications toutes faites qu'il peut retenir. */
  suggestions: string[];
}

/**
 * Combinaisons inhabituelles.
 *
 * On ne les interdit pas : une famille pauvre *peut* vivre dans une villa —
 * héritage, logement de fonction, ruine récente. On demande simplement
 * comment, et l'explication rejoint la timeline de naissance.
 *
 * Le test porte sur les montants réellement calculés, pas sur l'archétype :
 * une villa à la campagne coûte parfois moins qu'un deux-pièces en capitale,
 * et il n'y a alors rien d'étonnant à l'habiter.
 */
export function coherenceWarnings(origin: WorldOrigin, income: number): CoherenceWarning[] {
  const out: CoherenceWarning[] = [];
  const housing = HOUSING_MAP[origin.housing.type];
  if (!housing) return out;

  // Combien d'années de revenu du foyer représente le logement occupé ?
  const gross = Object.values(origin.finance.salaries).reduce((a, b) => a + b, 0)
    + origin.finance.otherIncome + origin.finance.benefits;
  const years = origin.housing.value / Math.max(income * 0.25, gross);

  if (years > 11) {
    out.push({
      question: `Comment la famille peut-elle habiter ${HOUSING_PHRASE[housing.id]} pareille ?`,
      suggestions: [
        'La maison est un héritage : impossible à entretenir, impossible à vendre.',
        'C’est un logement de fonction lié au métier d’un des parents.',
        'La famille était aisée, puis tout s’est effondré. Il reste les murs.',
        'Le bien est partagé entre plusieurs branches de la famille.',
      ],
    });
  } else if (years < 1.1 && gross > income * 2) {
    out.push({
      question: `Pourquoi une famille qui gagne bien vit-elle dans ${HOUSING_PHRASE[housing.id]} ?`,
      suggestions: [
        'Les parents refusent d’étaler leur argent : tout part sur les études.',
        'La famille vient d’arriver et cherche encore où s’installer.',
        'Le patrimoine est ailleurs — terres, entreprise, placements.',
      ],
    });
  }

  // Un quartier sans rapport avec les moyens du foyer.
  const ratio = origin.neighborhood.medianIncome / Math.max(1, gross);
  if (ratio > 2.4) {
    out.push({
      question: `Comment la famille tient-elle dans ${origin.neighborhood.name} ?`,
      suggestions: [
        'Un des parents y travaille et le logement va avec.',
        'Un proche loge la famille gratuitement.',
        'Le loyer est ancien, bloqué depuis vingt ans.',
      ],
    });
  } else if (ratio < 0.38) {
    out.push({
      question: `Pourquoi rester à ${origin.neighborhood.name} avec ces moyens ?`,
      suggestions: [
        'Les parents y ont grandi et ne veulent pas partir.',
        'C’est un choix militant : rester où l’on est utile.',
        'L’argent est récent, les habitudes ne l’ont pas suivi.',
      ],
    });
  }
  return out;
}
