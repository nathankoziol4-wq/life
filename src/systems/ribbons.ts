/**
 * Relire une vie, et la nommer.
 *
 * À la mort, le jeu ne disait qu'un nombre. Un nombre ne raconte rien : deux
 * vies opposées peuvent le partager, et personne ne se souvient d'un chiffre.
 *
 * Ce fichier fait deux choses, et les deux relisent la vie entière.
 *
 * **Le dossier** (`readLife`) rassemble en un seul objet ce qu'il faut savoir
 * pour juger : le patrimoine et d'où il vient, le travail et sa durée, les
 * crimes et la date du dernier, la famille et ce qu'elle vaut encore, le nom
 * et combien de temps il a duré, les lieux, le corps. Il croise l'état final
 * — ce qui reste — avec la chronique — ce qui s'est passé. L'un sans l'autre
 * ment : un veuf n'a plus de conjoint et a été marié trente ans.
 *
 * **Le titre** (`awardRibbon`) fait passer la vie devant tous les titres du
 * catalogue et retient le plus rare qu'elle mérite. Les autres restent en
 * mentions : une vie en mérite souvent plusieurs, et les voir toutes dit
 * mieux ce qu'elle a été qu'un seul mot.
 *
 * L'échelle monétaire est **relative au coût de la vie du pays et de
 * l'époque**, jamais absolue. Sans cela, « millionnaire » aurait voulu dire
 * deux choses différentes selon l'endroit où l'on est né, et le titre aurait
 * récompensé la géographie plutôt que la vie.
 */

import type { GameState, Person } from '../engine/types.ts';
import { RIBBONS, ribbonLabel, type Ribbon } from '../data/ribbons.ts';
import { getCountry } from '../data/countries.ts';
import { netWorth } from './finance.ts';

/* ------------------------------------------------------------------ */
/* Le dossier                                                          */
/* ------------------------------------------------------------------ */

/**
 * Tout ce qu'il faut savoir d'une vie pour la juger.
 *
 * Un seul objet plat, calculé une fois : les titres sont des prédicats sur
 * lui, et n'ont donc jamais besoin de fouiller l'état du jeu. C'est ce qui
 * les rend lisibles, et ce qui permet de les tester sans construire une
 * partie.
 */
export interface LifeRecord {
  age: number;
  /**
   * L'unité de mesure de l'argent : ce que coûte une année de vie ordinaire
   * ici et maintenant. Tous les seuils monétaires en sont des multiples.
   */
  livingCost: number;
  worth: number;
  lifetimeEarnings: number;
  inherited: number;
  given: number;
  /** Ce qu'on a gagné soi-même, rapporté à tout ce qu'on a eu, 0-1. */
  selfMadeShare: number;
  /** Ce qui est tombé sans travailler, rapporté au total gagné, 0-1. */
  passiveShare: number;

  jobs: number;
  promotions: number;
  yearsWorked: number;
  topPerformance: number;
  venturesRun: number;

  degrees: number;
  intelligence: number;
  booksOrClubs: number;

  children: number;
  grandchildren: number;
  marriages: number;
  divorces: number;
  yearsMarried: number;
  partners: number;
  friends: number;
  /** Ce que la famille encore vivante pense de vous, 0-100. */
  familyBond: number;

  crimesDone: number;
  convictions: number;
  prisonYears: number;
  orgRank: number;
  /** Années écoulées depuis la dernière condamnation. */
  cleanYears: number;
  karma: number;

  fame: number;
  famePeak: number;
  fameYears: number;
  /** Âge auquel on a cessé d'être connu. Égal à l'âge si on l'est encore. */
  fameEndAge: number;
  controversy: number;
  scandals: number;

  placesSeen: number;
  countriesLived: number;
  diedAbroad: boolean;

  propertiesOwned: number;
  rentYears: number;
  investedYears: number;
  vehiclesOwned: number;
  valuablesOwned: number;
  valuablesWorth: number;

  health: number;
  happiness: number;
  fitness: number;
  illnesses: number;
  accidents: number;

  stageId: string | null;
  stageJobs: number;
  servedYears: number;
  decorations: number;
  mandates: number;
  approvalEnd: number;
}

/** Ce que coûte une année de vie ordinaire, ici et maintenant. */
export function livingCostOf(state: GameState): number {
  const country = getCountry(state.player.countryId);
  return Math.max(1, 24_000 * country.salaryIndex * state.world.inflation);
}

/** Rassemble tout ce qu'il faut savoir d'une vie. */
export function readLife(state: GameState): LifeRecord {
  const p = state.player;
  const c = p.chronicle;
  const npcs = Object.values(state.npcs);
  const alive = (x: Person) => x.alive;

  const children = npcs.filter((x) => x.relation === 'son' || x.relation === 'daughter');
  const grandchildren = npcs.filter(
    (x) => x.relation === 'grandson' || x.relation === 'granddaughter',
  );
  const family = [...children, ...grandchildren, ...npcs.filter(
    (x) => x.relation === 'spouse' || x.relation === 'partner',
  )].filter(alive);
  const friends = npcs.filter(
    (x) => alive(x) && (x.relation === 'friend' || x.relation === 'bestFriend'),
  );
  const partners = npcs.filter(
    (x) => ['spouse', 'partner', 'ex'].includes(x.relation),
  );

  const worth = netWorth(state);
  const had = Math.max(1, p.lifetimeEarnings + c.inherited);
  const yearsWorked = p.careerHistory.reduce(
    (sum, job) => sum + Math.max(1, (job.to ?? state.year) - job.from), 0,
  );
  const valuablesWorth = p.valuables.reduce((sum, v) => sum + v.value, 0);

  return {
    age: p.age,
    livingCost: livingCostOf(state),
    worth,
    lifetimeEarnings: p.lifetimeEarnings,
    inherited: c.inherited,
    given: c.given,
    selfMadeShare: p.lifetimeEarnings / had,
    passiveShare: c.passiveEarned / Math.max(1, p.lifetimeEarnings),

    jobs: p.careerHistory.length,
    promotions: c.promotions,
    yearsWorked,
    topPerformance: c.peakPerformance,
    venturesRun: c.venturesRun + (p.freelance ? 1 : 0),

    degrees: p.education.degrees.length,
    intelligence: p.stats.intelligence,
    booksOrClubs: p.education.clubs.length,

    children: children.length,
    grandchildren: grandchildren.length,
    marriages: c.marriages,
    divorces: c.divorces,
    yearsMarried: c.yearsMarried,
    partners: partners.length,
    friends: friends.length,
    familyBond: family.length > 0
      ? family.reduce((sum, x) => sum + x.relationship, 0) / family.length
      : 0,

    crimesDone: p.criminalRecord.successfulCrimes,
    convictions: p.criminalRecord.convictions.length,
    prisonYears: p.criminalRecord.convictions.reduce((s, x) => s + x.sentenceYears, 0),
    orgRank: p.organization?.rank ?? 0,
    // Jamais condamné : toute la vie est « propre », ce qui est vrai et ne
    // suffira pas — le titre « racheté » exige aussi d'avoir été condamné.
    cleanYears: c.lastConvictionYear > 0 ? state.year - c.lastConvictionYear : p.age,
    karma: p.stats.karma,

    fame: p.fame.level,
    famePeak: p.fame.peak,
    fameYears: c.yearsFamous,
    fameEndAge: c.lastFamousAge > 0 ? c.lastFamousAge : p.age,
    controversy: p.fame.controversy,
    scandals: p.fame.scandals.length,

    placesSeen: p.seenPlaces.length,
    countriesLived: p.livedCountries.length,
    diedAbroad: p.countryId !== p.originCountryId,

    propertiesOwned: p.properties.length,
    rentYears: c.rentYears,
    investedYears: c.investedYears,
    vehiclesOwned: c.vehiclesOwned,
    valuablesOwned: p.valuables.length,
    valuablesWorth,

    health: p.stats.health,
    happiness: p.stats.happiness,
    fitness: p.stats.fitness,
    illnesses: c.illnesses,
    accidents: c.accidents,

    stageId: p.stage?.disciplineId ?? null,
    stageJobs: p.stage?.done ?? 0,
    // Le service en cours compte autant que le service terminé : ne lire que
    // `veteran` faisait qu'un militaire mort sous l'uniforme n'avait jamais
    // servi. La mesure sur les sauvegardes de test l'a montré — vingt ans
    // d'armée et trois décorations comptaient pour zéro.
    servedYears: p.veteran?.years ?? (p.service ? state.year - p.service.since : 0),
    decorations: p.veteran?.decorations.length ?? (p.service?.decorations.length ?? 0),
    mandates: Number(p.flags.terms_mairie ?? 0) + Number(p.flags.terms_conseil ?? 0)
      + Number(p.flags.terms_assemblee ?? 0) + Number(p.flags.terms_region ?? 0)
      + Number(p.flags.terms_national ?? 0),
    approvalEnd: Number(p.flags.polls_mairie_aines ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Le titre                                                            */
/* ------------------------------------------------------------------ */

export interface Award {
  /** Le titre retenu : le plus rare que la vie mérite. */
  id: string;
  label: string;
  note: string;
  tier: number;
  /** Les autres titres mérités, du plus rare au moins rare. */
  mentions: { id: string; label: string; note: string; tier: number }[];
}

/** Tous les titres qu'une vie mérite, du plus rare au moins rare. */
export function earnedRibbons(state: GameState): Ribbon[] {
  const record = readLife(state);
  return RIBBONS.filter((r) => {
    try {
      return r.test(record);
    } catch {
      // Un prédicat qui échoue ne doit pas empêcher d'enterrer quelqu'un.
      return false;
    }
  }).sort((a, b) => b.tier - a.tier);
}

/**
 * Le titre d'une vie.
 *
 * Le plus rare l'emporte, et à rang égal l'ordre du catalogue tranche — ce
 * qui donne la priorité aux titres écrits en premier dans chaque famille.
 * « Une vie ordinaire » est en dernier et accepte tout : personne ne meurt
 * sans titre.
 */
export function awardRibbon(state: GameState): Award {
  const earned = earnedRibbons(state);
  const sex = state.player.sex;
  const [best, ...rest] = earned;
  const dress = (r: Ribbon) => ({
    id: r.id, label: ribbonLabel(r.id, sex), note: r.note, tier: r.tier,
  });
  return { ...dress(best), mentions: rest.map(dress) };
}

/* ------------------------------------------------------------------ */
/* L'épitaphe                                                          */
/* ------------------------------------------------------------------ */

/**
 * Deux ou trois phrases sur ce qu'aura été cette vie.
 *
 * Écrites à partir du dossier, pas d'un modèle fixe : ce qui est dit dépend
 * de ce qui a compté. Une vie sans travail n'aura pas de phrase sur le
 * travail, et c'est le silence qui la caractérise.
 */
export function obituary(state: GameState): string {
  const p = state.player;
  const r = readLife(state);
  const e = p.sex === 'F' ? 'e' : '';
  const bits: string[] = [];

  bits.push(
    r.age >= 88 ? `${r.age} ans, ce qui est déjà une forme de réussite.`
      : r.age >= 70 ? `${r.age} ans, le temps qu’il faut pour faire une vie.`
        : r.age >= 45 ? `${r.age} ans, et le sentiment que ce n’était pas fini.`
          : `${r.age} ans. C’est court, et ça ne s’explique pas.`,
  );

  if (r.jobs === 0 && r.venturesRun === 0) {
    bits.push('Tu n’as jamais eu d’emploi, et personne ne t’a demandé pourquoi.');
  } else if (r.venturesRun > 0 && r.selfMadeShare > 0.5) {
    bits.push(`Tu as travaillé pour toi-même, ce qui est plus dur qu’on ne le dit.`);
  } else if (r.jobs === 1) {
    bits.push(`Un seul employeur, ${r.yearsWorked} ans durant.`);
  } else if (r.jobs >= 5) {
    bits.push(`${r.jobs} employeurs. Aucun ne t’a gardé${e}, ou aucun ne t’a suffi.`);
  }

  if (r.children === 0 && r.marriages === 0) {
    bits.push('Personne ne portera ton nom après toi.');
  } else if (r.grandchildren >= 3) {
    bits.push(`${r.children} enfants, ${r.grandchildren} petits-enfants, et une table trop petite.`);
  } else if (r.children > 0) {
    bits.push(`${r.children} enfant(s), qui te survivent.`);
  }

  if (r.convictions >= 3) {
    bits.push(`${r.convictions} condamnations, ${r.prisonYears} ans dedans. On finit par s’y faire.`);
  } else if (r.crimesDone >= 8 && r.convictions === 0) {
    bits.push('On ne t’a jamais rien prouvé.');
  }

  if (r.famePeak >= 70) {
    bits.push(r.fame >= 40
      ? 'On savait qui tu étais jusqu’au bout.'
      : 'On a su qui tu étais, puis on a cessé de le savoir.');
  }

  if (r.worth >= r.livingCost * 40) {
    bits.push('Tu laisses de quoi vivre à ceux qui restent.');
  } else if (r.worth <= 0) {
    bits.push('Tu ne laisses rien, sinon des gens.');
  }

  if (r.placesSeen >= 8) bits.push(`Tu auras vu ${r.placesSeen} endroits.`);
  if (r.countriesLived >= 2 && r.diedAbroad) {
    bits.push('Tu es mort loin de là où tu es né.');
  }

  return bits.join(' ');
}
