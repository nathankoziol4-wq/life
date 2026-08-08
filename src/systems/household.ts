/**
 * Construction du foyer : parents, fratrie, famille élargie.
 *
 * Le foyer n'est pas une liste de PNJ décoratifs. Chaque parent porte un
 * style éducatif, une disponibilité, un rapport à l'argent et un métier
 * cohérent avec la situation financière déclarée par l'environnement. Ces
 * quatre choses sont ensuite lues par le moteur : elles modifient les notes,
 * le stress, l'argent de poche, l'accès aux activités et la probabilité de
 * nombreux événements.
 */

import type { Ctx } from '../engine/context.ts';
import { fullName } from '../engine/context.ts';
import type { Person, Sex } from '../engine/types.ts';
import type {
  CoupleBond, FamilyStructure, OriginDraft, ParentAvailability, ParentingStyle, ParentRole,
} from '../engine/origin.ts';
import { getCountry } from '../data/countries.ts';
import { JOBS } from '../data/jobs.ts';
import { getPreset } from '../data/originPresets.ts';
import { createPerson, noteHistory } from './npc.ts';
import { buildParentingStyle, recomputeAxes, recomputeFinance, type BuiltOrigin } from './originGen.ts';
import { clampStat, type Rng } from '../engine/rng.ts';

/** Rôles parentaux présents selon la structure familiale. */
function rolesFor(structure: FamilyStructure, rng: Rng): ParentRole['role'][] {
  switch (structure) {
    case 'parent seul': return [rng.chance(0.78) ? 'mère' : 'père'];
    case 'parents séparés': return ['mère', 'père'];
    case 'famille recomposée': return ['mère', 'père', rng.chance(0.5) ? 'beau-père' : 'belle-mère'];
    case 'grands-parents': return ['tuteur', 'tuteur'];
    case 'famille d’accueil': return ['tuteur', 'tuteur'];
    case 'adoption': return ['mère', 'père'];
    default: return ['mère', 'père'];
  }
}

const ROLE_SEX: Record<ParentRole['role'], Sex | null> = {
  mère: 'F', père: 'M', 'belle-mère': 'F', 'beau-père': 'M', tuteur: null,
};

/**
 * Disponibilité d'un parent : elle découle des heures travaillées et du
 * style éducatif, jamais d'un tirage isolé. Un parent très impliqué qui
 * travaille soixante heures reste peu disponible — et le jeu en tient compte.
 */
export function deriveAvailability(rng: Rng, style: ParentingStyle, workHours: number): ParentAvailability {
  const homeHours = Math.max(6, Math.round(112 - workHours - rng.float(8, 26)));
  const timeFactor = Math.min(1, homeHours / 70);
  return {
    workHours,
    homeHours,
    involvement: clamp((style.supervision * 0.4 + style.encouragement * 0.3 + style.communication * 0.3) * (0.5 + timeFactor * 0.5)),
    emotionalAvailability: clamp((style.emotionalSupport * 0.6 + style.affection * 0.4) * (0.55 + timeFactor * 0.45)),
    activityParticipation: clamp((style.encouragement * 0.5 + style.patience * 0.25 + style.affection * 0.25) * (0.4 + timeFactor * 0.6)),
  };
}

/**
 * Attribue un métier cohérent avec la classe sociale, puis ajuste le salaire
 * pour que la somme des revenus du foyer corresponde à ce que
 * l'environnement a déclaré. Sans cet ajustement, un « quartier huppé » peut
 * se retrouver peuplé de salaires modestes, ce qui rendrait tout le reste faux.
 */
export function assignParentJob(ctx: Ctx, p: Person, targetLevel: number, employed: boolean): number {
  const { rng, state } = ctx;
  if (!employed) {
    p.jobTitle = null;
    p.salary = 0;
    return 0;
  }
  const country = getCountry(state.player.countryId);
  const pool = JOBS.filter(
    (j) => Math.abs(j.requiresLevel - targetLevel) <= 1 && j.minAge <= p.age && j.category !== 'Petits boulots',
  );
  const job = pool.length > 0 ? rng.pick(pool) : rng.pick(JOBS);
  const maxLevel = job.levels.length - 1;
  const levelIndex = Math.max(0, Math.min(maxLevel, Math.floor((p.age - 24) / 8) + (targetLevel >= 4 ? 2 : 0)));
  const level = job.levels[levelIndex];
  p.jobTitle = level.title;
  p.salary = Math.round(level.salary * country.salaryIndex * rng.float(0.9, 1.15));
  p.flags.workHours = job.hours;
  p.flags.jobStress = job.stress;
  return p.salary;
}

/** Construit tout le foyer et le rattache à l'environnement. */
export function buildHousehold(ctx: Ctx, built: BuiltOrigin, draft: OriginDraft): void {
  const { rng, state } = ctx;
  const origin = state.player.origin;
  const country = getCountry(state.player.countryId);
  const preset = getPreset(draft.presetId);
  const lastName = state.player.lastName;
  const nameSet = country.nameSet;

  const roles = rolesFor(draft.structure, rng);
  const targetLevel = { poor: 0, modest: 1, middle: 2, upper: 3, rich: 4 }[built.tier.id];

  const parents: { person: Person; role: ParentRole; style: ParentingStyle }[] = [];
  const motherAge = Math.round(rng.gauss(30, 8, 17, 46));

  for (const role of roles) {
    const sex: Sex = ROLE_SEX[role] ?? (parents.length === 0 ? 'F' : 'M');
    const isStep = role === 'belle-mère' || role === 'beau-père';
    const isGuardian = role === 'tuteur';
    const age = isGuardian
      ? Math.round(rng.gauss(motherAge + 27, 7, 45, 78))
      : role === 'mère'
        ? motherAge
        : Math.round(rng.gauss(motherAge + 2.5, 7, 18, 60));

    // Un parent séparé ou un beau-parent ne vit pas nécessairement au foyer.
    const inHousehold = draft.structure === 'parents séparés'
      ? role === (rng.chance(0.78) ? 'mère' : 'père')
      : !isStep || rng.chance(0.7);

    const person = createPerson(ctx, {
      relation: role === 'mère' ? 'mother'
        : role === 'père' ? 'father'
          : role === 'belle-mère' ? 'stepmother'
            : role === 'beau-père' ? 'stepfather'
              : sex === 'F' ? 'grandmother' : 'grandfather',
      sex,
      age,
      lastName,
      nameSet,
      wealthBase: built.tier.wealth / Math.max(1, roles.length),
      relationship: isStep ? rng.int(30, 62) : rng.int(66, 95),
      opinion: isStep ? rng.int(35, 70) : rng.int(70, 97),
      withJob: false,
    });

    const style = buildParentingStyle(rng, preset, 12);
    // Le style éducatif n'est pas indépendant de la personnalité du PNJ :
    // un parent chaleureux est plus affectueux, un parent irascible moins patient.
    style.affection = clamp(style.affection * 0.6 + person.personality.warmth * 0.4);
    style.patience = clamp(style.patience * 0.6 + (100 - person.personality.temper) * 0.4);
    style.discipline = clamp(style.discipline * 0.65 + person.personality.discipline * 0.35);
    style.academicExpectation = clamp(style.academicExpectation * 0.7 + person.personality.ambition * 0.3);
    if (isStep) {
      style.affection = clamp(style.affection - 14);
      style.authority = clamp(style.authority - 10);
    }

    parents.push({
      person,
      style,
      role: {
        personId: person.id,
        role,
        education: 0,
        employer: null,
        style,
        availability: { workHours: 0, homeHours: 0, involvement: 0, emotionalAvailability: 0, activityParticipation: 0 },
        behaviour: origin.finance.behaviour,
        inHousehold,
      },
    });
  }

  // Emploi : au moins un parent travaille, sauf accident de parcours.
  const workers = parents.filter((p) => p.role.inHousehold);
  const employedCount = workers.length === 1
    ? (rng.chance(0.82) ? 1 : 0)
    : rng.chance(0.74) ? workers.length : 1;

  let gross = 0;
  workers.forEach((entry, i) => {
    const employed = i < employedCount;
    gross += assignParentJob(ctx, entry.person, targetLevel, employed);
  });
  // Les parents hors foyer travaillent aussi, mais leurs revenus ne financent
  // pas le quotidien : ils comptent seulement pour une éventuelle pension.
  for (const entry of parents.filter((p) => !p.role.inHousehold)) {
    assignParentJob(ctx, entry.person, targetLevel, rng.chance(0.8));
  }

  // Ajustement pour retomber sur le revenu déclaré par l'environnement.
  const scale = gross > 0 ? built.targetHouseholdIncome / gross : 1;
  for (const entry of workers) {
    if (entry.person.salary <= 0) continue;
    entry.person.salary = Math.round(entry.person.salary * Math.max(0.35, Math.min(2.6, scale)));
    origin.finance.salaries[entry.person.id] = entry.person.salary;
  }

  // Niveau d'études et disponibilité, une fois le métier connu.
  for (const entry of parents) {
    const hours = Number(entry.person.flags.workHours ?? 0);
    entry.role.education = clamp(
      22 + targetLevel * 13 + origin.values.school * 0.2 + rng.float(-12, 12),
    );
    entry.role.employer = entry.person.jobTitle;
    entry.role.availability = deriveAvailability(rng, entry.style, hours);
    entry.role.behaviour = origin.finance.behaviour;
    origin.parents.push(entry.role);
  }

  /* ---- Couple parental ---- */
  const inHome = parents.filter((p) => p.role.inHousehold);
  if (inHome.length >= 2) {
    const [a, b] = inHome;
    a.person.partnerId = b.person.id;
    b.person.partnerId = a.person.id;
    const married = draft.structure === 'famille recomposée' ? rng.chance(0.5) : rng.chance(0.72);
    a.person.maritalStatus = married ? 'married' : 'dating';
    b.person.maritalStatus = a.person.maritalStatus;
    origin.couple = buildCoupleBond(rng, a.person, b.person, origin.finance.financialStress);
  } else if (parents.length >= 2 && draft.structure === 'parents séparés') {
    origin.couple = buildCoupleBond(rng, parents[0].person, parents[1].person, origin.finance.financialStress);
    origin.couple.love = clamp(origin.couple.love - 40);
    origin.couple.conflict = clamp(origin.couple.conflict + 30);
    origin.couple.stability = clamp(origin.couple.stability - 35);
  }

  /* ---- Lien de filiation ---- */
  const biological = parents.filter((p) => p.role.role === 'mère' || p.role.role === 'père' || p.role.role === 'tuteur');
  for (const entry of biological) {
    entry.person.childrenIds.push(state.player.id);
    noteHistory(state, entry.person, `Naissance de ${state.player.firstName}.`);
  }

  /* ---- Fratrie ---- */
  const parentIds = biological.map((p) => p.person.id);
  for (const sib of draft.siblings) {
    const sibAge = Math.max(0, sib.ageGap);
    const person = createPerson(ctx, {
      relation: sib.sex === 'M' ? 'brother' : 'sister',
      sex: sib.sex,
      age: sibAge,
      lastName,
      nameSet,
      wealthBase: 0,
      // La fratrie proche en âge se dispute davantage mais reste plus soudée.
      relationship: rng.int(42, 88) + (Math.abs(sib.ageGap) <= 3 ? 4 : -4),
      opinion: rng.int(42, 88),
      withJob: sibAge >= 20,
      parentIds,
    });
    person.flags.siblingKind = sib.kind;
    person.flags.birthOrder = sib.ageGap > 0 ? 'aîné' : 'cadet';
    for (const entry of biological) entry.person.childrenIds.push(person.id);
  }

  /* ---- Famille élargie ---- */
  buildExtendedFamily(ctx, parents.map((p) => p.person), lastName, nameSet, built);

  /* ---- Finances et axes, une fois tout le monde en place ---- */
  // Sans aucun salaire au foyer, la collectivité prend le relais — plus ou
  // moins généreusement selon le pays.
  const noSalary = Object.keys(origin.finance.salaries).length === 0;
  origin.finance.benefits = noSalary
    ? Math.round(built.nationalIncome * 0.2 * country.healthcare * (1 + origin.finance.dependents * 0.15))
    : 0;
  origin.finance.otherIncome = Math.round(origin.finance.assets * 0.012);
  recomputeFinance(origin, built.nationalIncome, country.taxRate);
  applyStressToAtmosphere(origin);
  recomputeAxes(origin, built.nationalIncome);
}

function buildCoupleBond(rng: Rng, a: Person, b: Person, financialStress: number): CoupleBond {
  const loyalty = (a.personality.loyalty + b.personality.loyalty) / 2;
  const temper = (a.personality.temper + b.personality.temper) / 2;
  return {
    love: clamp(rng.gauss(70, 18, 20, 98) - financialStress * 0.1),
    trust: clamp(loyalty * 0.7 + rng.float(-12, 18)),
    conflict: clamp(temper * 0.6 + financialStress * 0.25 + rng.float(-10, 14)),
    communication: clamp((a.personality.sociability + b.personality.sociability) / 2 * 0.7 + rng.float(-12, 16)),
    fidelity: clamp(loyalty * 0.85 + rng.float(-10, 12)),
    stability: clamp(72 - temper * 0.3 - financialStress * 0.2 + rng.float(-10, 12)),
    financialDependence: clamp(
      Math.abs(a.salary - b.salary) / Math.max(1, a.salary + b.salary) * 160,
    ),
    sharedProjects: clamp(rng.gauss(58, 20, 10, 96)),
  };
}

/**
 * Grands-parents, oncles, tantes et cousins. Ils ne sont pas là pour remplir
 * l'écran : ils gardent l'enfant, prêtent de l'argent, laissent un héritage,
 * et servent de refuge quand le foyer se dégrade.
 */
function buildExtendedFamily(
  ctx: Ctx,
  parents: Person[],
  lastName: string,
  nameSet: string,
  built: BuiltOrigin,
): void {
  const { rng } = ctx;
  for (const parent of parents.slice(0, 2)) {
    for (const sex of ['F', 'M'] as Sex[]) {
      // Un grand-parent peut être déjà mort à la naissance de l'enfant.
      const age = Math.round(rng.gauss(parent.age + 28, 7, parent.age + 17, parent.age + 46));
      if (rng.chance(Math.min(0.55, Math.max(0, (age - 62) / 60)))) continue;
      createPerson(ctx, {
        relation: sex === 'F' ? 'grandmother' : 'grandfather',
        sex,
        age,
        lastName: rng.chance(0.5) ? lastName : undefined,
        nameSet,
        wealthBase: built.tier.wealth * 0.6,
        relationship: rng.int(58, 92),
        opinion: rng.int(60, 95),
        withJob: age < 64,
      });
    }

    // Fratrie du parent, et leurs enfants.
    const siblings = rng.weighted([0, 1, 2, 3], (n) => [22, 36, 26, 16][n]);
    for (let i = 0; i < siblings; i++) {
      const sex: Sex = rng.chance(0.5) ? 'M' : 'F';
      const auntUncle = createPerson(ctx, {
        relation: sex === 'F' ? 'aunt' : 'uncle',
        sex,
        age: Math.max(18, parent.age + rng.int(-10, 12)),
        lastName: rng.chance(0.6) ? lastName : undefined,
        nameSet,
        wealthBase: built.tier.wealth * 0.4,
        relationship: rng.int(35, 78),
        opinion: rng.int(40, 82),
        withJob: rng.chance(0.8),
      });
      const cousins = rng.weighted([0, 1, 2], (n) => [34, 40, 26][n]);
      for (let c = 0; c < cousins; c++) {
        createPerson(ctx, {
          relation: 'cousin',
          age: Math.max(0, rng.int(0, 12)),
          lastName: auntUncle.lastName,
          nameSet,
          wealthBase: 0,
          relationship: rng.int(28, 70),
          opinion: rng.int(30, 74),
          withJob: false,
          parentIds: [auntUncle.id],
        });
      }
    }
  }
}

/** Répercute la tension financière sur le climat du foyer. */
export function applyStressToAtmosphere(origin: { finance: { financialStress: number }; atmosphere: {
  stress: number; conflict: number; calm: number; stability: number;
} }): void {
  const s = origin.finance.financialStress;
  origin.atmosphere.stress = clamp(origin.atmosphere.stress * 0.55 + s * 0.45);
  origin.atmosphere.conflict = clamp(origin.atmosphere.conflict * 0.7 + s * 0.3);
  origin.atmosphere.calm = clamp(origin.atmosphere.calm - s * 0.15);
  origin.atmosphere.stability = clamp(origin.atmosphere.stability - s * 0.12);
}

/** Texte de présentation du foyer, écrit dans la timeline à la naissance. */
export function describeHousehold(ctx: Ctx): void {
  const { state } = ctx;
  const origin = state.player.origin;

  // Les intitulés de métier de la base sont au masculin : on les présente
  // entre parenthèses, comme une étiquette, pour éviter tout faux accord.
  const POSSESSIVE: Record<ParentRole['role'], string> = {
    mère: 'ta mère', père: 'ton père',
    'belle-mère': 'ta belle-mère', 'beau-père': 'ton beau-père',
    tuteur: 'ton tuteur',
  };
  const describe = (role: ParentRole): string => {
    const p = state.npcs[role.personId];
    if (!p) return '';
    const label = role.role === 'tuteur'
      ? (p.sex === 'F' ? 'ta grand-mère' : 'ton grand-père')
      : POSSESSIVE[role.role];
    const job = p.jobTitle ? ` (${p.jobTitle})` : ' (sans emploi)';
    const away = role.inHousehold ? '' : ', qui ne vit pas avec toi';
    return `${label} ${p.firstName}${job}${away}`;
  };

  const parts = origin.parents.map(describe).filter(Boolean);
  if (parts.length > 0) {
    ctx.log('family', `Tu grandis avec ${listFr(parts)}.`, 'neutral');
  }

  const brothers = Object.values(state.npcs).filter((x) => x.relation === 'brother').length;
  const sisters = Object.values(state.npcs).filter((x) => x.relation === 'sister').length;
  if (brothers + sisters > 0) {
    const bits = [
      brothers > 0 ? `${brothers} frère${brothers > 1 ? 's' : ''}` : null,
      sisters > 0 ? `${sisters} sœur${sisters > 1 ? 's' : ''}` : null,
    ].filter(Boolean) as string[];
    ctx.log('family', `Tu as ${listFr(bits)}.`, 'neutral');
  }

  const grandparents = Object.values(state.npcs).filter(
    (x) => x.relation === 'grandmother' || x.relation === 'grandfather',
  );
  if (grandparents.length > 0) {
    ctx.log(
      'family',
      `${listFr(grandparents.slice(0, 2).map((g) => fullName(g)))} ${grandparents.length > 1 ? 'font' : 'fait'} aussi partie de ta vie.`,
      'neutral',
    );
  }
}

function listFr(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

function clamp(v: number): number {
  return clampStat(v);
}
