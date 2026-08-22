/**
 * Continuer par un descendant.
 *
 * La mort terminait la partie : le monde, la famille et le patrimoine
 * disparaissaient avec le personnage, et tout ce qu'une vie avait construit
 * n'existait plus que dans un écran de récapitulatif.
 *
 * Reprendre un enfant change ce que veulent dire les décisions d'une vie
 * entière. Faire un testament, acheter une maison, se brouiller avec sa
 * fille, transmettre un métier : tout cela n'avait de conséquence que sur
 * un écran de fin. Désormais, **on hérite de ce qu'on a laissé** — l'argent,
 * la famille telle qu'elle est, la position sociale, et le nom.
 *
 * Trois principes gouvernent ce fichier.
 *
 * **1. Le monde continue.** L'année, l'économie, l'inflation et les marchés
 * ne sont pas rejoués : l'héritier reprend là où l'on s'est arrêté.
 *
 * **2. La famille est recalculée, pas recréée.** Chaque PNJ survivant garde
 * son identité, son histoire et son opinion ; seul son *lien* change, parce
 * que le point de vue a changé. Le conjoint du défunt devient un parent, les
 * autres enfants deviennent des frères et sœurs. Ceux qui n'appartenaient
 * qu'à la vie précédente — collègues, camarades, codétenus — s'effacent.
 *
 * **3. On hérite de sa position, pas de sa vie.** L'enfance de l'héritier est
 * générée comme celle de quelqu'un né dans le foyer du défunt : la fortune
 * laissée décide du milieu, et c'est là que se voit vraiment ce qu'une
 * génération a transmis à la suivante.
 */

import { Rng, clampStat } from '../engine/rng.ts';
import { createCtx, fullName } from '../engine/context.ts';
import type {
  GameState, LineageEntry, Person, Player, RelationKind,
} from '../engine/types.ts';
import { SAVE_VERSION, WEALTH_TIERS, type WealthTierId } from '../engine/newLife.ts';
import {
  buildOrigin, initialTraits, randomAppearance, randomGenetics, resolveDraft,
} from './originGen.ts';
import { buildPsyche } from './psycheGen.ts';
import { seedRoots } from './roots.ts';
import { buildHousehold } from './household.ts';
import { netWorth } from './finance.ts';
import { getCountry } from '../data/countries.ts';
import { inheritCrown } from './royalty.ts';
import { carryChallenges } from './challenges.ts';
import { nativeLanguages } from './languages.ts';

/* ------------------------------------------------------------------ */
/* Qui peut reprendre                                                  */
/* ------------------------------------------------------------------ */

export interface Heir {
  person: Person;
  /** Génération d'écart : 1 = enfant, 2 = petit-enfant. */
  distance: number;
  /** Ce que la personne pensait du défunt, 0-100. */
  bond: number;
  /**
   * Ce dont elle dispose, succession réglée : ses propres moyens *plus* ce
   * que le défunt lui a laissé, `settleEstate` ayant déjà crédité les parts.
   */
  wealth: number;
}

/**
 * Les descendants vivants, du plus proche au plus lointain.
 *
 * Seule la descendance directe : on ne reprend pas un neveu. C'est ce qui
 * fait de la lignée une lignée, et non une deuxième chance déguisée.
 */
export function heirsOf(state: GameState): Heir[] {
  const out: Heir[] = [];
  const seen = new Set<string>();

  const children = Object.values(state.npcs).filter(
    (x) => x.alive && (x.relation === 'son' || x.relation === 'daughter'),
  );
  for (const child of children) {
    seen.add(child.id);
    out.push({ person: child, distance: 1, bond: child.relationship, wealth: child.wealth });
    for (const gcId of child.childrenIds) {
      const gc = state.npcs[gcId];
      if (!gc?.alive || seen.has(gc.id)) continue;
      seen.add(gc.id);
      out.push({ person: gc, distance: 2, bond: gc.relationship, wealth: gc.wealth });
    }
  }
  // Un nouveau-né ne reprend rien : il faut quelqu'un qui puisse décider.
  return out
    .filter((h) => h.person.age >= 8)
    .sort((a, b) => a.distance - b.distance || b.person.age - a.person.age);
}

/** Peut-on continuer cette partie ? */
export function canContinue(state: GameState): boolean {
  return !state.player.alive && heirsOf(state).length > 0;
}

/* ------------------------------------------------------------------ */
/* Le lien de parenté, vu par quelqu'un d'autre                        */
/* ------------------------------------------------------------------ */

/**
 * Le lien entre l'héritier et un PNJ, recalculé depuis le nouveau point de
 * vue. `null` = la personne appartenait à la vie précédente et s'efface.
 *
 * On remonte le graphe de filiation plutôt que de traduire les anciens liens :
 * une table de correspondance « le père de mon père devient mon grand-père »
 * se trompe dès qu'un lien manque, alors que la filiation, elle, est vraie.
 */
export function relationTo(state: GameState, heir: Person, other: Person): RelationKind | null {
  if (other.id === heir.id) return null;
  const bySex = (m: RelationKind, f: RelationKind) => (other.sex === 'M' ? m : f);
  const npcs = state.npcs;
  const parentsOf = (x: Person) => x.parentIds.map((id) => npcs[id]).filter(Boolean);

  if (heir.parentIds.includes(other.id)) return bySex('father', 'mother');
  if (heir.childrenIds.includes(other.id)) return bySex('son', 'daughter');
  if (other.id === heir.partnerId) {
    return heir.maritalStatus === 'married' ? 'spouse' : 'partner';
  }

  // Frères et sœurs : au moins un parent en commun.
  if (heir.parentIds.some((id) => other.parentIds.includes(id))) {
    return bySex('brother', 'sister');
  }

  // Grands-parents.
  const grandparents = parentsOf(heir).flatMap((x) => x.parentIds);
  if (grandparents.includes(other.id)) return bySex('grandfather', 'grandmother');

  // Petits-enfants.
  const grandchildren = heir.childrenIds.flatMap((id) => npcs[id]?.childrenIds ?? []);
  if (grandchildren.includes(other.id)) return bySex('grandson', 'granddaughter');

  // Oncles et tantes : frère ou sœur d'un parent.
  const parentIds = new Set(heir.parentIds);
  for (const grandparentId of grandparents) {
    const gp = npcs[grandparentId];
    if (!gp) continue;
    if (gp.childrenIds.includes(other.id) && !parentIds.has(other.id)) {
      return bySex('uncle', 'aunt');
    }
  }

  // Cousins : enfant d'un oncle ou d'une tante.
  for (const grandparentId of grandparents) {
    const gp = npcs[grandparentId];
    if (!gp) continue;
    for (const auntId of gp.childrenIds) {
      if (parentIds.has(auntId)) continue;
      if (npcs[auntId]?.childrenIds.includes(other.id)) return 'cousin';
    }
  }

  // Les liens qui ne tiennent pas à la parenté ne se transmettent pas — sauf
  // l'amitié quand elle est réelle : les amis de la famille restent.
  if ((other.relation === 'friend' || other.relation === 'bestFriend')
    && other.relationship > 62) return 'acquaintance';
  return null;
}

/* ------------------------------------------------------------------ */
/* Ce que le milieu devient                                            */
/* ------------------------------------------------------------------ */

/** Le milieu dans lequel l'héritier a grandi, d'après ce qu'on lui a laissé. */
export function tierFromWealth(state: GameState, wealth: number): WealthTierId {
  const index = getCountry(state.player.countryId).salaryIndex * state.world.inflation;
  const scaled = wealth / Math.max(0.2, index);
  if (scaled >= 1_800_000) return 'rich';
  if (scaled >= 260_000) return 'upper';
  if (scaled >= 55_000) return 'middle';
  if (scaled >= 9_000) return 'modest';
  return 'poor';
}

const PRESET_BY_TIER: Record<WealthTierId, string[]> = {
  poor: ['projects', 'immigrantStart'],
  modest: ['ruralModest', 'workingUrban', 'singleParent', 'largeFamily'],
  middle: ['middleSuburb', 'cityCentre', 'blended', 'academic', 'seaside'],
  upper: ['affluent'],
  rich: ['wealthy'],
};

/* ------------------------------------------------------------------ */
/* Reprendre                                                           */
/* ------------------------------------------------------------------ */

/**
 * Reprend la partie avec un descendant.
 *
 * Mute l'état existant plutôt que d'en construire un neuf : la timeline, les
 * PNJ et le monde sont exactement ce qu'on veut garder, et les recopier
 * n'aurait servi qu'à risquer d'en oublier une partie.
 */
export function continueAs(state: GameState, heirId: string): GameState {
  const heir = state.npcs[heirId];
  const previous = state.player;
  if (!heir || !heir.alive) throw new Error('héritier introuvable');

  const rng = new Rng(state);
  const country = getCountry(previous.countryId);

  /* 1. Le défunt devient un PNJ : c'est ainsi qu'on garde un ancêtre. */
  const ancestor: Person = {
    id: previous.id === 'player' ? `p_ancestor_${state.idCounter += 1}` : previous.id,
    firstName: previous.firstName,
    lastName: previous.lastName,
    sex: previous.sex,
    birthYear: previous.birthYear,
    birthMonth: previous.birthMonth,
    birthDay: previous.birthDay,
    age: previous.age,
    alive: false,
    deathYear: previous.deathYear ?? state.year,
    deathCause: previous.deathCause ?? undefined,
    stats: { ...previous.stats },
    // La personnalité du défunt, traduite depuis ses traits acquis : c'est
    // ce que ses descendants garderont de lui.
    personality: {
      warmth: previous.traits.empathy,
      ambition: previous.traits.ambition,
      temper: clampStat(100 - previous.traits.empathy * 0.6 - previous.stats.happiness * 0.4),
      loyalty: clampStat(previous.stats.karma * 0.6 + previous.traits.empathy * 0.4),
      generosity: clampStat(previous.stats.karma * 0.5 + (100 - previous.traits.materialism) * 0.5),
      madness: clampStat(previous.stats.addiction * 0.4 + 8),
      discipline: previous.traits.discipline,
      religiosity: 30,
      sociability: previous.traits.sociability,
    },
    psyche: previous.psyche,
    orientation: previous.orientation,
    relation: 'acquaintance', // recalculé juste après
    relationship: 70,
    opinion: 70,
    wealth: 0,
    jobTitle: previous.careerHistory.length
      ? previous.careerHistory[previous.careerHistory.length - 1].title : null,
    salary: 0,
    maritalStatus: previous.flags.married ? 'married' : 'single',
    parentIds: [],
    childrenIds: [],
    partnerId: null,
    exPartnerIds: [],
    metYear: previous.birthYear,
    lastInteractionYear: state.year,
    interactionsThisYear: 0,
    estranged: false,
    incarcerated: false,
    history: [],
    flags: { ancestor: true },
  };

  // On raccroche l'ancêtre au graphe de filiation : ses enfants sont ceux
  // qui étaient enregistrés comme tels, et ses parents ceux qu'il avait.
  for (const npc of Object.values(state.npcs)) {
    if (npc.relation === 'son' || npc.relation === 'daughter') {
      ancestor.childrenIds.push(npc.id);
      if (!npc.parentIds.includes(ancestor.id)) npc.parentIds.push(ancestor.id);
    }
    if (npc.relation === 'mother' || npc.relation === 'father') {
      ancestor.parentIds.push(npc.id);
      if (!npc.childrenIds.includes(ancestor.id)) npc.childrenIds.push(ancestor.id);
    }
    if (npc.relation === 'spouse' && npc.alive) {
      ancestor.partnerId = npc.id;
      // Le conjoint du défunt est un parent de l'héritier s'il l'a été.
      if (npc.childrenIds.includes(heir.id) && !heir.parentIds.includes(npc.id)) {
        heir.parentIds.push(npc.id);
      }
    }
  }
  state.npcs[ancestor.id] = ancestor;
  if (!heir.parentIds.includes(ancestor.id) && ancestor.childrenIds.includes(heir.id)) {
    heir.parentIds.push(ancestor.id);
  }

  /* 2. La ligne de lignée : ce qu'a été la vie qui s'achève. */
  const record: LineageEntry = {
    generation: (state.lineage?.length ?? 0) + 1,
    name: fullName(previous),
    birthYear: previous.birthYear,
    deathYear: previous.deathYear ?? state.year,
    ageAtDeath: previous.age,
    cause: previous.deathCause ?? 'de causes inconnues',
    topJob: previous.careerHistory.length
      ? previous.careerHistory[previous.careerHistory.length - 1].title : 'Sans profession',
    netWorth: Math.round(Number(previous.flags.finalNetWorth ?? netWorth(state))),
    famePeak: Math.round(previous.fame.peak),
    children: ancestor.childrenIds.length,
    personId: ancestor.id,
  };
  state.lineage = [...(state.lineage ?? []), record];

  /* 3. Le milieu de l'héritier découle de ce qu'on lui a laissé. */
  const inherited = heir.wealth;
  const tier = tierFromWealth(state, inherited);
  const draft = resolveDraft(rng, {
    countryId: previous.countryId,
    firstName: heir.firstName,
    lastName: heir.lastName,
    sex: heir.sex,
    /*
     * **Un enfant adopté reprend une vie d'enfant adopté.**
     *
     * `flags.adopted` existait depuis toujours et n'était relu nulle part :
     * pas un seul système ne distinguait un enfant adopté d'un autre, et
     * reprendre la partie avec lui donnait un milieu tiré au sort comme pour
     * n'importe qui. C'est la boucle que `roots.ts` rendait possible et que
     * personne ne fermait — celui qu'on a adopté grandit avec la même question
     * que celle qu'on lui a fait poser.
     */
    presetId: heir.flags.adopted === true ? 'adopted' : rng.pick(PRESET_BY_TIER[tier]),
    cityName: previous.cityName,
  });
  const birthYear = heir.birthYear;
  const built = buildOrigin(rng, draft, birthYear);
  const origin = built.origin;

  /* 4. L'héritier devient le joueur. */
  const appearance = randomAppearance(rng, heir.sex);
  const genetics = randomGenetics(rng, {
    countryLifespan: country.lifespan,
    disposableRatio: Math.max(0, built.origin.finance.disposableIncome) / built.nationalIncome,
    diseasePool: [],
  });
  const psyche = heir.psyche ?? buildPsyche(rng, { origin: built.origin, age: heir.age });

  // Les objets de famille passent, et c'est la seule chose qui passe en
  // gardant son identité : l'argent se partage, une maison se vend, un objet
  // change de mains. Chaque génération y ajoute une ligne, et c'est ce qui
  // fait qu'un objet de trois cents ans n'est pas un objet de valeur mais
  // l'histoire de ceux qui l'ont tenu.
  const passed = state.player.heirlooms.map((item) => ({
    ...item,
    generations: item.generations + 1,
    history: [
      ...item.history,
      {
        year: state.year,
        text: `${fullName(state.player)} le laisse à ${heir.firstName}.`,
      },
    ],
  }));

  // La place dans une maison régnante, si le défunt en occupait une. C'est
  // la seule chose du jeu qui se transmette en *montant* : le suivant hérite
  // du rang que la mort vient de libérer.
  const crown = inheritCrown(state, heir.id);
  if (crown) {
    const seat = crown.line.find((k) => k.personId === 'player');
    if (seat) {
      seat.name = `${heir.firstName} ${heir.lastName}`;
      seat.age = heir.age;
    }
  }

  const player: Player = {
    id: 'player',
    firstName: heir.firstName,
    lastName: heir.lastName,
    sex: heir.sex,
    orientation: heir.orientation,
    birthYear,
    birthMonth: heir.birthMonth,
    birthDay: heir.birthDay,
    age: heir.age,
    alive: true,
    deathCause: null,
    deathYear: null,
    countryId: previous.countryId,
    originCountryId: previous.originCountryId,
    cityName: previous.cityName,
    origin,
    appearance,
    genetics,
    traits: initialTraits(psyche.temperament, built.origin),
    psyche,
    stats: { ...heir.stats },
    // L'héritage a déjà été crédité par la succession sur la personne : il
    // devient simplement l'argent du nouveau joueur.
    money: Math.max(0, Math.round(inherited)),
    lifetimeEarnings: 0,
    education: {
      stage: heir.age >= 22 ? 'graduated' : heir.age >= 18 ? 'high' : heir.age >= 11 ? 'middle' : 'primary',
      schoolName: null,
      yearInStage: 1,
      stageLength: heir.age >= 22 ? 0 : 3,
      grades: clampStat(9 + heir.stats.intelligence / 9),
      absences: 0,
      effort: 'normal',
      majorId: null,
      degrees: [],
      clubs: [],
      clubStanding: {},
      discipline: {
        behaviour: 70, incidentsThisYear: 0, warnings: 0,
        detentions: 0, suspensions: 0, expelled: false, record: [],
      },
      scholarship: false,
      studentLoan: 0,
      // Renseigné après la construction du foyer : le milieu n'existe pas
      // encore à cet endroit du fichier.
      level: 0,
      harassment: null,
      sport: null,
      marks: {},
      aptitudes: {},
      exam: null,
    },
    job: null,
    careerHistory: [],
    retired: false,
    pension: 0,
    freelance: null,
    business: null,
    stage: null,
    chronicle: {
      promotions: 0, peakPerformance: 0, venturesRun: 0, marriages: 0,
      divorces: 0, yearsMarried: 0, yearsFamous: 0, lastFamousAge: 0,
      illnesses: 0, accidents: 0, inherited: 0, given: 0, rentYears: 0,
      investedYears: 0, vehiclesOwned: 0, lastConvictionYear: 0,
      passiveEarned: 0,
    },
    seenPlaces: [],
    livedCountries: [built.origin.countryId],
    service: null,
    veteran: null,
    // Seuls les défis de portée « lignée » traversent la mort : c'est le seul
    // endroit du jeu où mourir fait avancer quelque chose.
    // L'héritier parle la langue de là où il grandit, pas celle du défunt.
    languages: nativeLanguages(previous.countryId),
    // Les souvenirs d'occasion ne se transmettent pas : on y était, ou non.
    keepsakes: [],
    // Ce qu'on savait faire ne se transmet pas : l'héritier a son propre don,
    // tiré de la même graine mais sur son propre index, et tout à apprendre.
    skills: {},
    // L'héritier repart de zéro sur ce qu'il faut tenir : un grade se gagne
    // dans une vie, il ne se transmet pas.
    practices: {},
    // Posé juste après le foyer par `seedRoots` : il faut la structure
    // familiale pour savoir si la question se pose.
    roots: null,
    parenthood: { cycles: 0, spent: 0, lastCycle: null, file: null, arrived: 0 },
    challenges: carryChallenges(previous.challenges),
    crown,
    campaign: null,
    mandate: null,
    properties: [],
    rentCollectedThisYear: 0,
    vehicles: [],
    holdings: [],
    financialLiteracy: clampStat(heir.stats.intelligence / 4 + (heir.age > 30 ? 12 : 0)),
    contacts: [],
    organization: null,
    pendingMission: null,
    pets: [],
    loans: [],
    valuables: [],
    heirlooms: passed,
    diseases: [],
    criminalRecord: {
      arrests: 0, convictions: [], notoriety: 0, successfulCrimes: 0,
      heat: 0, investigation: null,
      wanted: false, wantedSince: null, escapedFrom: null,
    },
    prison: null,
    will: { shares: {}, updatedYear: state.year },
    followers: 0,
    fame: {
      level: 0, peak: 0, field: 'aucun', controversy: 0, goodwill: 50,
      scandals: [], interview: null, earnedThisYear: 0,
    },
    yearActions: {},
    flags: {
      familyWealth: WEALTH_TIERS.find((t) => t.id === tier)?.wealth ?? 0,
      familyTier: tier,
      familyIncome: WEALTH_TIERS.find((t) => t.id === tier)?.income ?? 1,
      preset: draft.presetId,
      generation: record.generation + 1,
    },
    financeHistory: [],
  };

  /* 5. Le foyer d'enfance de l'héritier.
   *
   * `buildOrigin` ne produit qu'une coquille : les finances du foyer, les
   * capitaux social, culturel et économique — ceux-là mêmes que lit tout
   * `systems/contexts.ts` — ne sont remplis que par `buildHousehold`. Sans cet
   * appel, l'héritier repartait avec des capitaux à zéro, c'est-à-dire avec
   * *moins* que n'importe quel nouveau-né, et l'héritage n'aurait été qu'un
   * solde bancaire. */
  state.player = player;
  const known = new Set(Object.keys(state.npcs));
  buildHousehold(createCtx(state), built, draft);
  // Et la question, si le milieu la pose — c'est-à-dire si l'on reprend la
  // partie avec un enfant qu'on avait adopté.
  seedRoots(state);

  // Le foyer généré a inventé des parents et une fratrie. On garde ce qu'il
  // dit du *milieu* — c'est la seule trace qu'on ait de la façon dont
  // l'héritier a été élevé — mais on rend les rôles aux vraies personnes :
  // le défunt, son conjoint, et les autres enfants.
  const invented = Object.keys(state.npcs).filter((id) => !known.has(id));
  for (const id of invented) delete state.npcs[id];

  const realParents = [ancestor.id, ancestor.partnerId]
    .filter((id): id is string => typeof id === 'string')
    .filter((id) => id === ancestor.id || Boolean(state.npcs[id]));
  origin.parents = origin.parents
    .slice(0, Math.max(1, realParents.length))
    .map((role, i) => ({ ...role, personId: realParents[i] ?? realParents[0] }));
  const realSiblings = ancestor.childrenIds.filter((id) => id !== heir.id && state.npcs[id]);
  origin.siblings = origin.siblings
    .slice(0, realSiblings.length)
    .map((bond, i) => ({ ...bond, personId: realSiblings[i] }));

  // Ce qu'on a pu faire comme études se lit dans le milieu où l'on a grandi
  // autant que dans ce qu'on valait. C'est ici, et pas plus haut, que le
  // calcul est possible : `capitals` n'existe qu'une fois le foyer construit,
  // et le lire trop tôt donnait zéro à tout le monde — donc jamais aucun
  // diplôme, quelle que soit la fortune transmise.
  if (heir.age >= 18) {
    player.education.level = Math.min(4, Math.max(0, Math.round(
      heir.stats.intelligence / 42 + (origin.capitals.cultural - 45) / 34,
    ))) as Player['education']['level'];
    player.education.degrees = [];
  }

  /* 6. La famille est recalculée depuis le nouveau point de vue. */
  delete state.npcs[heir.id];
  for (const npc of Object.values(state.npcs)) {
    const relation = relationTo(state, heir, npc);
    if (relation === null) {
      delete state.npcs[npc.id];
      continue;
    }
    npc.relation = relation;
    npc.interactionsThisYear = 0;
    // Les liens du bureau et de la classe s'effacent avec la vie précédente.
    delete npc.flags.coworker;
    delete npc.flags.employer;
    delete npc.flags.classmate;
    delete npc.flags.manager;
  }

  state.gameOver = false;
  state.pending = [];
  state.version = SAVE_VERSION;

  const ctx = createCtx(state);
  ctx.log(
    'life',
    `— ${record.name} s’éteint à ${record.ageAtDeath} ans. Tu reprends l’histoire avec ${heir.firstName}, ${heir.age} ans. —`,
    'neutral',
  );
  ctx.log(
    'family',
    inherited > 0
      ? `Tu hérites de ${Math.round(inherited)} et d’un nom que tu n’as pas choisi.`
      : 'Tu n’hérites de rien, sinon d’un nom.',
    inherited > 0 ? 'good' : 'bad',
  );
  return state;
}
