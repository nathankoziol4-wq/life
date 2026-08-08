/**
 * Vie de l'environnement.
 *
 * Le décor n'est pas figé à la naissance : le quartier se dégrade ou
 * s'embourgeoise, l'économie locale respire, les parents changent de poste ou
 * perdent le leur, le couple parental tient ou se défait, et la famille
 * déménage quand elle en a les moyens — ou quand elle n'a plus le choix.
 *
 * Rien n'est écrit à l'avance : aucune séparation, aucun licenciement, aucun
 * déménagement n'est programmé à la création. Tout découle des valeurs
 * courantes et des tirages de l'année.
 */

import type { Ctx } from '../engine/context.ts';
import { fullName } from '../engine/context.ts';
import type { GameState, Person } from '../engine/types.ts';
import type {
  EnvironmentSnapshot, Memory, ResidentialZone, WorldOrigin,
} from '../engine/origin.ts';
import { clampStat } from '../engine/rng.ts';
import { getCountry } from '../data/countries.ts';
import { NEIGHBORHOOD_ARCHETYPES, NEIGHBORHOOD_MAP, buildNeighborhood, deriveNeighborhoodAxes, neighborhoodName } from '../data/neighborhoods.ts';
import { buildCity, regionsFor } from '../data/regions.ts';
import { buildHousing, buildLivingConditions, housingForZone, plausibleHousing, tenuresFor } from '../data/housing.ts';
import { buildSchool, schoolName, schoolWeights } from '../data/schools.ts';
import { nationalIncome, recomputeAxes, recomputeFinance } from './originGen.ts';
import { applyStressToAtmosphere } from './household.ts';
import { familyTuition } from './education.ts';

/* ------------------------------------------------------------------ */
/* Souvenirs et historique                                             */
/* ------------------------------------------------------------------ */

/** Ajoute un souvenir marquant, en gardant les plus forts. */
export function addMemory(state: GameState, memory: Omit<Memory, 'id'>): void {
  const o = state.player.origin;
  o.memories.push({ id: `mem_${state.year}_${o.memories.length}`, ...memory });
  if (o.memories.length > 40) {
    o.memories.sort((a, b) => b.weight - a.weight);
    o.memories.length = 40;
  }
}

/** Clôt l'instantané en cours et en ouvre un nouveau. */
function recordSnapshot(state: GameState, reason: string): void {
  const o = state.player.origin;
  const last = o.history[o.history.length - 1];
  if (last && last.toAge === null) last.toAge = state.player.age;
  const snapshot: EnvironmentSnapshot = {
    fromAge: state.player.age,
    toAge: null,
    cityName: o.city.name,
    neighborhoodName: o.neighborhood.name,
    zone: o.neighborhood.zone,
    housingType: o.housing.type,
    reason,
  };
  o.history.push(snapshot);
}

/* ------------------------------------------------------------------ */
/* Évolution annuelle                                                  */
/* ------------------------------------------------------------------ */

/** Fait vivre l'environnement d'une année. Appelé par `simulateYear`. */
export function advanceEnvironment(ctx: Ctx): void {
  const { state } = ctx;
  const o = state.player.origin;
  const country = getCountry(state.player.countryId);
  const income = nationalIncome(country);

  driftNeighborhood(ctx);
  driftLocalEconomy(ctx);
  advanceParents(ctx);
  advanceCouple(ctx);
  recomputeHousehold(ctx, income);

  // Le foyer peut déménager : par choix, ou parce qu'il ne peut plus payer.
  considerMove(ctx);

  recomputeAxes(o, income);
}

/**
 * Le quartier bouge. Un quartier en transformation s'améliore vite, un
 * quartier délaissé se dégrade lentement, et la conjoncture locale accentue
 * le mouvement dans les deux sens.
 */
function driftNeighborhood(ctx: Ctx): void {
  const { state, rng } = ctx;
  const n = state.player.origin.neighborhood;
  const economy = state.player.origin.economy;
  const archetype = NEIGHBORHOOD_MAP[n.archetypeId];
  if (!archetype) return;

  const push = archetype.drift + (economy.growth - 0.2) * 0.35 + rng.float(-0.25, 0.25);
  const nudge = (value: number, factor = 1) => clampStat(value + push * factor);

  n.safety = nudge(n.safety, 1.1);
  n.cleanliness = nudge(n.cleanliness);
  n.schoolQuality = nudge(n.schoolQuality, 0.7);
  n.shops = nudge(n.shops, 0.9);
  n.reputation = nudge(n.reputation, 1.2);
  n.localEmployment = clampStat(n.localEmployment + (economy.growth - 0.2) * 0.8 + rng.float(-0.4, 0.4));
  n.childActivities = nudge(n.childActivities, 0.6);
  n.communityCohesion = clampStat(n.communityCohesion - Math.abs(push) * 0.3 + rng.float(-0.3, 0.3));
  n.residentialStability = clampStat(n.residentialStability - Math.abs(push) * 0.5 + rng.float(-0.3, 0.3));

  // L'embourgeoisement se paie : les loyers suivent la réputation.
  const pressure = 1 + push * 0.012;
  n.rentMult = Math.max(0.15, n.rentMult * pressure);
  n.propertyMult = Math.max(0.15, n.propertyMult * pressure);
  n.medianIncome = Math.round(n.medianIncome * (1 + push * 0.008));

  Object.assign(n, deriveNeighborhoodAxes(n, nationalIncome(getCountry(state.player.countryId))));
}

function driftLocalEconomy(ctx: Ctx): void {
  const { state, rng } = ctx;
  const e = state.player.origin.economy;
  const national = state.world.economy;
  // L'économie locale suit la nationale, avec sa propre inertie.
  e.growth = e.growth * 0.55 + national * 2.2 * 0.45 + rng.float(-0.5, 0.5);
  e.unemployment = clampStat(e.unemployment - e.growth * 0.8 + rng.float(-0.6, 0.6));
  e.priceIndex *= 1 + 0.012 + e.growth * 0.004;
  e.housingMarket = clampStat(e.housingMarket + e.growth * 1.2 + rng.float(-2, 2));
  e.businessCreation = clampStat(e.businessCreation + e.growth * 1.5 + rng.float(-3, 3));
  e.businessClosure = clampStat(e.businessClosure - e.growth * 1.5 + rng.float(-3, 3));
}

/**
 * Carrière des parents : promotions, pertes d'emploi, retraite. Ce sont
 * les principaux chocs financiers que subit une enfance.
 */
function advanceParents(ctx: Ctx): void {
  const { state, rng } = ctx;
  const o = state.player.origin;
  const economy = o.economy;

  for (const role of o.parents) {
    const person = state.npcs[role.personId];
    if (!person || !person.alive) continue;

    if (person.jobTitle) {
      // Départ à la retraite.
      if (person.age >= 63 && rng.chance(0.28)) {
        person.salary = Math.round(person.salary * 0.55);
        person.jobTitle = null;
        role.employer = null;
        if (role.inHousehold) {
          ctx.log('family', `${fullName(person)} a pris sa retraite.`, 'neutral');
        }
        continue;
      }
      // Licenciement : d'autant plus probable que l'économie locale va mal.
      const layoff = 0.018 + economy.unemployment / 900 + (economy.businessClosure - 50) / 3200;
      if (rng.chance(Math.max(0.004, layoff))) {
        person.jobTitle = null;
        person.salary = 0;
        role.employer = null;
        o.finance.jobSecurity = clampStat(o.finance.jobSecurity - 18);
        if (role.inHousehold) {
          ctx.log('family', `${fullName(person)} a perdu son emploi.`, 'bad');
          addMemory(state, {
            age: state.player.age,
            kind: 'épreuve',
            text: `L’année où ${person.firstName} a perdu son travail.`,
            weight: 62,
          });
        }
        continue;
      }
      // Progression ordinaire.
      person.salary = Math.round(person.salary * (1 + 0.014 + economy.growth * 0.006));
      if (rng.chance(0.06 + person.personality.ambition / 1400)) {
        person.salary = Math.round(person.salary * rng.float(1.1, 1.28));
        o.finance.jobSecurity = clampStat(o.finance.jobSecurity + 5);
      }
    } else if (person.age < 63) {
      // Retour à l'emploi.
      const hire = 0.22 + (100 - economy.unemployment) / 420 - (person.age > 55 ? 0.1 : 0);
      if (rng.chance(Math.max(0.05, hire))) {
        const country = getCountry(state.player.countryId);
        person.jobTitle = 'Reprise d’activité';
        person.salary = Math.round(nationalIncome(country) * rng.float(0.5, 1.1));
        role.employer = person.jobTitle;
        o.finance.jobSecurity = clampStat(o.finance.jobSecurity + 8);
        if (role.inHousehold) {
          ctx.log('family', `${fullName(person)} a retrouvé du travail.`, 'good');
        }
      }
    }
  }
}

/**
 * Le couple parental évolue. La séparation n'est jamais décidée à la
 * création : elle survient — ou non — quand la confiance et la stabilité
 * s'effondrent sous la pression des conflits et de l'argent.
 */
function advanceCouple(ctx: Ctx): void {
  const { state, rng } = ctx;
  const o = state.player.origin;
  const bond = o.couple;
  if (!bond) return;
  if (o.structure === 'parents séparés') return;

  const stress = o.finance.financialStress;
  bond.conflict = clampStat(bond.conflict + (stress - 50) / 22 + rng.float(-3, 3.4));
  bond.love = clampStat(bond.love - bond.conflict / 34 + bond.communication / 60 + rng.float(-2.5, 2.5));
  bond.trust = clampStat(bond.trust - bond.conflict / 42 + rng.float(-2, 2.2));
  bond.stability = clampStat(
    bond.stability * 0.9 + (bond.love * 0.5 + bond.trust * 0.5) * 0.1 - bond.conflict / 55,
  );
  bond.sharedProjects = clampStat(bond.sharedProjects - 0.6 + bond.love / 90 + rng.float(-2, 2));

  // Infidélité : conséquence de la fidélité et de l'état du lien.
  if (rng.chance(Math.max(0, (100 - bond.fidelity) / 2600 + (60 - bond.love) / 3600))) {
    bond.trust = clampStat(bond.trust - 28);
    bond.conflict = clampStat(bond.conflict + 20);
  }

  const risk = Math.max(0, (42 - bond.stability) / 520 + (30 - bond.love) / 900);
  if (bond.stability < 40 && rng.chance(risk)) {
    separateParents(ctx);
  }
}

/** Séparation effective des parents, avec toutes ses conséquences. */
function separateParents(ctx: Ctx): void {
  const { state, rng } = ctx;
  const o = state.player.origin;
  const inHome = o.parents.filter((r) => r.inHousehold);
  if (inHome.length < 2) return;

  // L'enfant reste avec l'un des deux ; l'autre s'éloigne.
  const leaving = rng.chance(0.72) ? inHome[1] : inHome[0];
  leaving.inHousehold = false;
  const person = state.npcs[leaving.personId];
  const staying = state.npcs[inHome.find((r) => r !== leaving)!.personId];

  o.structure = 'parents séparés';
  if (person) {
    person.partnerId = null;
    person.maritalStatus = person.maritalStatus === 'married' ? 'divorced' : 'single';
    person.relationship = clampStat(person.relationship - rng.int(10, 30));
    delete o.finance.salaries[person.id];
    // Une pension alimentaire compense partiellement la perte de revenu.
    o.finance.otherIncome += Math.round(person.salary * 0.16);
  }
  if (staying) {
    staying.partnerId = null;
    staying.maritalStatus = staying.maritalStatus === 'married' ? 'divorced' : 'single';
  }

  o.atmosphere.stability = clampStat(o.atmosphere.stability - 26);
  o.atmosphere.conflict = clampStat(o.atmosphere.conflict - 12);
  o.atmosphere.calm = clampStat(o.atmosphere.calm - 8);
  state.player.stats.stress = clampStat(state.player.stats.stress + 14);
  state.player.stats.happiness = clampStat(state.player.stats.happiness - 12);

  ctx.log('family', `${person ? fullName(person) : 'Un de tes parents'} a quitté le foyer. Tes parents se séparent.`, 'bad');
  addMemory(state, {
    age: state.player.age,
    kind: 'rupture',
    text: 'La séparation de mes parents.',
    weight: 90,
  });
  recordSnapshot(state, 'Séparation des parents');
}

/** Recalcule intégralement l'économie du foyer et son climat. */
function recomputeHousehold(ctx: Ctx, income: number): void {
  const { state } = ctx;
  const o = state.player.origin;
  const country = getCountry(state.player.countryId);

  o.finance.salaries = {};
  for (const role of o.parents) {
    if (!role.inHousehold) continue;
    const person = state.npcs[role.personId];
    if (person?.alive && person.salary > 0) o.finance.salaries[person.id] = person.salary;
  }
  const noSalary = Object.keys(o.finance.salaries).length === 0;
  o.finance.benefits = noSalary
    ? Math.round(income * 0.2 * country.healthcare * (1 + o.finance.dependents * 0.15))
    : 0;

  // Les charges suivent l'inflation locale, les frais de scolarité aussi.
  const inflate = 1 + 0.012 + (o.economy.priceIndex > 1 ? 0.004 : 0);
  o.finance.livingExpenses = Math.round(
    o.finance.livingExpenses * inflate + familyTuition(state) * 0.02,
  );
  o.finance.housingCost = Math.round(o.housing.annualHousingCost * (o.economy.priceIndex));
  // Le crédit immobilier s'amortit.
  if (o.housing.tenure === 'accédant' && o.finance.debt > 0) {
    o.finance.debt = Math.max(0, Math.round(o.finance.debt - o.housing.value * 0.028));
    if (o.finance.debt === 0) o.housing.tenure = 'propriétaire';
  }
  o.finance.assets = Math.round(o.finance.assets * (1 + 0.01));

  recomputeFinance(o, income, country.taxRate);
  applyStressToAtmosphere(o);

  // Le climat du foyer évolue lentement avec le couple et les moyens.
  const bond = o.couple;
  if (bond) {
    o.atmosphere.affection = clampStat(o.atmosphere.affection * 0.85 + bond.love * 0.15);
    o.atmosphere.communication = clampStat(o.atmosphere.communication * 0.85 + bond.communication * 0.15);
    o.atmosphere.stability = clampStat(o.atmosphere.stability * 0.88 + bond.stability * 0.12);
  }
}

/* ------------------------------------------------------------------ */
/* Déménagements                                                       */
/* ------------------------------------------------------------------ */

/**
 * La famille déménage-t-elle ? Deux moteurs opposés : l'ascension (on peut
 * enfin s'offrir mieux) et la contrainte (on ne peut plus payer). Les deux
 * changent l'école, les amis et les opportunités.
 */
function considerMove(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const o = p.origin;
  // Une fois adulte et parti du foyer, les déménagements de la famille ne
  // concernent plus le joueur.
  if (p.age >= 20) return;
  if (o.parents.every((r) => !r.inHousehold)) return;

  const income = nationalIncome(getCountry(p.countryId));
  const ratio = o.finance.disposableIncome / Math.max(1, income);

  // Contrainte : le logement dépasse durablement les moyens du foyer.
  const strained = o.finance.disposableIncome < 0 || o.finance.financialStress > 82;
  // Ascension : de la marge, et un logement devenu trop petit ou trop modeste.
  const roomy = o.housing.areaM2 / Math.max(1, o.housing.occupants);
  const upgrading = ratio > 0.55 && (roomy < 24 || o.neighborhood.reputation < 45);

  const chance = strained ? 0.2 : upgrading ? 0.11 : 0.025;
  if (!rng.chance(chance)) return;

  relocateHousehold(ctx, strained ? 'contrainte' : upgrading ? 'ascension' : 'occasion');
}

/**
 * Déménagement du foyer à l'intérieur du pays. Reconstruit le quartier, le
 * logement, les conditions de vie et l'école ; conserve la ville sauf si
 * l'emploi ou les moyens imposent d'en changer.
 */
export function relocateHousehold(ctx: Ctx, reason: 'contrainte' | 'ascension' | 'occasion' | 'ville'): void {
  const { state, rng } = ctx;
  const p = state.player;
  const o = p.origin;
  const country = getCountry(p.countryId);
  const income = nationalIncome(country);
  const ratio = Math.max(0.1, o.finance.disposableIncome / income);

  // On vise un quartier compatible avec les moyens du moment : vers le haut
  // si l'on monte, vers le bas si l'on subit.
  const target = reason === 'contrainte'
    ? o.neighborhood.medianIncome * 0.72
    : reason === 'ascension'
      ? o.neighborhood.medianIncome * 1.35
      : o.neighborhood.medianIncome;

  const candidates = NEIGHBORHOOD_ARCHETYPES.filter((a) => a.id !== o.neighborhood.archetypeId);
  const archetype = rng.weighted(candidates, (a) => {
    const gap = Math.abs(a.incomeRatio * income - target) / income;
    return 1 / (0.25 + gap * gap * 3);
  });
  const zone: ResidentialZone = rng.pick(archetype.zones);

  const neighborhood = buildNeighborhood(
    archetype.id,
    zone,
    neighborhoodName((arr) => rng.pick(arr)),
    income,
    o.city.propertyMult,
    (spread) => rng.float(-spread, spread),
  );

  const occupants = o.housing.occupants;
  const zoneTypes = housingForZone(zone).map((h) => h.id);
  const wanted = plausibleHousing(zone, Math.max(0, o.finance.disposableIncome) * 2.2, income, occupants);
  const type = zoneTypes.includes(wanted) ? wanted : zoneTypes[0];
  const tenures = tenuresFor(type);
  const tenure = tenures.includes(o.housing.tenure) && reason !== 'contrainte'
    ? o.housing.tenure
    : rng.pick(tenures);

  o.neighborhood = neighborhood;
  o.housing = buildHousing({
    type,
    tenure,
    occupants,
    nationalIncome: income,
    propertyMult: neighborhood.propertyMult * country.propertyIndex,
    rentMult: neighborhood.rentMult * country.propertyIndex,
    comfortBudget: Math.max(0, Math.min(100, ratio * 55)),
    roll: (a, b) => rng.float(a, b),
  });
  o.living = buildLivingConditions({
    housing: o.housing,
    children: o.finance.dependents,
    incomeRatio: ratio,
    year: state.year,
    climate: o.region.climate,
    transport: neighborhood.transport,
    parentEducation: o.parents.length ? o.parents.reduce((s, r) => s + r.education, 0) / o.parents.length : 45,
    culturalValues: o.values.creativity,
    chance: (x) => rng.chance(x),
    roll: (a, b) => rng.float(a, b),
  });
  o.finance.housingCost = o.housing.annualHousingCost;
  o.social.isolation = clampStat(100 - neighborhood.socialLife * 0.5 - neighborhood.transport * 0.3 - neighborhood.density * 0.2);
  o.social.communityCohesion = neighborhood.communityCohesion;
  o.social.socialOpportunities = neighborhood.socialOpportunity;
  // Repartir de zéro socialement : c'est le vrai coût d'un déménagement.
  o.social.peersNearby = Math.max(0, Math.round(neighborhood.density / 12 + neighborhood.childActivities / 14));

  refreshSchoolAfterMove(ctx);

  p.stats.stress = clampStat(p.stats.stress + (p.age >= 6 ? 8 : 3));
  if (p.age >= 6) p.stats.happiness = clampStat(p.stats.happiness - 5);

  const label = {
    contrainte: 'faute de moyens',
    ascension: 'pour un logement meilleur',
    occasion: 'par choix',
    ville: 'en changeant de ville',
  }[reason];
  ctx.log('life', `Ta famille a déménagé ${label} : ${neighborhood.name}, ${zone}.`, reason === 'ascension' ? 'good' : 'neutral');
  addMemory(state, {
    age: p.age,
    kind: 'lieu',
    text: `Le déménagement vers ${neighborhood.name}.`,
    weight: reason === 'contrainte' ? 70 : 55,
  });
  recordSnapshot(state, `Déménagement ${label}`);
  recomputeAxes(o, income);
}

/** Après un déménagement, l'école change si l'on est scolarisé. */
function refreshSchoolAfterMove(ctx: Ctx): void {
  const { state, rng } = ctx;
  const o = state.player.origin;
  const stage = state.player.education.stage;
  const country = getCountry(state.player.countryId);
  const income = nationalIncome(country);
  const rurality = Math.max(0, Math.min(100, 100 - o.city.density * 0.6 - o.neighborhood.density * 0.4));

  const weights = schoolWeights({
    educationAccess: o.neighborhood.educationAccess,
    schoolQuality: o.neighborhood.schoolQuality,
    incomeRatio: Math.max(0, o.finance.disposableIncome) / income,
    schoolValue: o.values.school,
    rurality,
    countryEducation: country.education,
  });
  const archetypeId = rng.weighted(weights, (w) => w.weight).id;
  const namedStage = stage === 'nursery' || stage === 'primary' || stage === 'middle' || stage === 'high'
    ? stage
    : 'primary';

  o.school = buildSchool({
    archetypeId,
    stage: namedStage,
    name: schoolName(archetypeId, namedStage, (arr) => rng.pick(arr)),
    neighborhoodQuality: o.neighborhood.schoolQuality,
    countryEducation: country.education,
    nationalIncome: income,
    jitter: (spread) => rng.float(-spread, spread),
    roll: (a, b) => rng.float(a, b),
  });
  if (namedStage === stage) {
    state.player.education.schoolName = o.school.name;
    ctx.log('school', `Tu changes d’établissement : ${o.school.name}.`, 'neutral');
  }
}

/**
 * Le joueur change lui-même de ville (ou de pays) : l'environnement complet
 * est reconstruit. Sans cela, un personnage installé à l'étranger continuerait
 * à subir le quartier de son enfance.
 */
export function relocatePlayer(ctx: Ctx, cityName: string, countryId?: string): void {
  const { state, rng } = ctx;
  const p = state.player;
  const o = p.origin;
  const country = getCountry(countryId ?? p.countryId);
  const income = nationalIncome(country);

  const regions = regionsFor(country.id);
  const region = regions.find((r) => r.id === o.region.id) ?? rng.pick(regions);
  o.countryId = country.id;
  o.region = region;
  o.city = buildCity(country.id, region, cityName, o.city.size, (a, b) => rng.float(a, b));

  const ratio = Math.max(0.1, (p.job?.salary ?? income * 0.4) / income);
  const archetype = rng.weighted(NEIGHBORHOOD_ARCHETYPES, (a) => {
    const gap = Math.abs(a.incomeRatio - ratio);
    return 1 / (0.3 + gap * gap * 3);
  });
  const zone: ResidentialZone = rng.pick(archetype.zones);
  o.neighborhood = buildNeighborhood(
    archetype.id,
    zone,
    neighborhoodName((arr) => rng.pick(arr)),
    income,
    o.city.propertyMult,
    (spread) => rng.float(-spread, spread),
  );

  const type = plausibleHousing(zone, ratio * income, income, 1);
  o.housing = buildHousing({
    type,
    tenure: 'locataire',
    occupants: 1,
    nationalIncome: income,
    propertyMult: o.neighborhood.propertyMult * country.propertyIndex,
    rentMult: o.neighborhood.rentMult * country.propertyIndex,
    comfortBudget: Math.max(0, Math.min(100, ratio * 55)),
    roll: (a, b) => rng.float(a, b),
  });
  o.living = buildLivingConditions({
    housing: o.housing,
    children: 0,
    incomeRatio: ratio,
    year: state.year,
    climate: region.climate,
    transport: o.neighborhood.transport,
    parentEducation: 50,
    culturalValues: o.values.creativity,
    chance: (x) => rng.chance(x),
    roll: (a, b) => rng.float(a, b),
  });
  o.social.isolation = clampStat(100 - o.neighborhood.socialLife * 0.5 - o.neighborhood.transport * 0.3);
  o.social.communityCohesion = o.neighborhood.communityCohesion;
  o.social.peersNearby = Math.max(0, Math.round(o.neighborhood.density / 14));
  o.economy.unemployment = o.city.unemployment;

  recordSnapshot(state, `Installation à ${cityName}`);
  addMemory(state, { age: p.age, kind: 'lieu', text: `Mon arrivée à ${cityName}.`, weight: 60 });
  recomputeFinance(o, income, country.taxRate);
  recomputeAxes(o, income);
}

/** Parents encore vivants et présents au foyer. */
export function livingParents(state: GameState): Person[] {
  return state.player.origin.parents
    .map((r) => state.npcs[r.personId])
    .filter((x): x is Person => Boolean(x?.alive));
}

/** Résumé lisible de l'environnement courant, pour l'écran de profil. */
export function environmentSummary(o: WorldOrigin): string {
  return `${o.neighborhood.name} · ${o.neighborhood.zone} · ${o.city.name}`;
}
