/**
 * Successions (§21) : héritage reçu au décès d'un proche et répartition du
 * patrimoine du joueur à sa mort selon son testament.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { applyExperience } from './psyche.ts';
import { vowActive } from './vows.ts';
import { fullName, person } from '../engine/context.ts';
import type { GameState, Person } from '../engine/types.ts';
import { netWorth } from './finance.ts';
import { openWake } from './wake.ts';
import { getCountry } from '../data/countries.ts';

/** Parts d'héritage reçues par le joueur selon le lien de parenté. */
const HEIR_SHARE: Partial<Record<Person['relation'], number>> = {
  mother: 0.45,
  father: 0.45,
  spouse: 0.75,
  brother: 0.15,
  sister: 0.15,
  son: 0.3,
  daughter: 0.3,
  bestFriend: 0.05,
};

/**
 * Traite le décès d'un proche : héritage éventuel et impact émotionnel.
 * Appelée par le moteur juste après la mort d'un PNJ.
 */
export function handleRelativeDeath(ctx: Ctx, deceased: Person): void {
  // Perdre quelqu'un de proche est l'une des expériences qui marquent le plus
  // durablement — et d'autant plus qu'on est jeune.
  if (['mother', 'father', 'brother', 'sister', 'grandmother', 'grandfather',
    'spouse', 'partner', 'bestFriend', 'son', 'daughter'].includes(deceased.relation)) {
    applyExperience(ctx, 'décèsProche', { person: deceased });
  }

  const { state } = ctx;
  const p = state.player;
  const country = getCountry(p.countryId);

  // Choc émotionnel proportionnel à la proximité.
  const closeness = deceased.relationship / 100;
  const kinWeight = ['mother', 'father', 'spouse', 'son', 'daughter'].includes(deceased.relation) ? 1 : 0.45;
  p.stats.happiness = clampStat(p.stats.happiness - 30 * closeness * kinWeight);
  p.stats.stress = clampStat(p.stats.stress + 20 * closeness * kinWeight);

  ctx.log(
    'death',
    `${fullName(deceased)} (${relationLabel(deceased)}) est décédé${deceased.sex === 'F' ? 'e' : ''} à ${deceased.age} ans, ${deceased.deathCause ?? ''}.`.trim(),
    'bad',
  );

  // Et la journée elle-même, qui n'existait pas : voir `systems/wake.ts`. Elle
  // s'ouvre ici et non ailleurs parce que c'est le seul endroit du moteur qui
  // sait qu'on vient de perdre quelqu'un à qui l'on tenait.
  openWake(ctx, deceased);

  // Héritage.
  const share = HEIR_SHARE[deceased.relation];
  if (!share || deceased.wealth <= 0) return;
  // On partage avec la fratrie éventuelle.
  const siblings = Object.values(state.npcs).filter(
    (x) => x.alive && x.parentIds.includes(deceased.id),
  ).length;
  const divisor = deceased.relation === 'mother' || deceased.relation === 'father' ? 1 + siblings : 1;
  // Le lien affectif influence ce qui est réellement laissé.
  const affection = 0.4 + (deceased.opinion / 100) * 0.9;
  const gross = Math.round((deceased.wealth * share * affection) / divisor);
  if (gross < 1) return;

  // Un serment de ne rien devoir aux morts se tient en refusant la part, pas
  // en la recevant puis en perdant le défi : le serment change la façon de
  // jouer, il ne tend pas un piège. La part va à qui de droit.
  if (vowActive(state, 'sansHeritage')) {
    ctx.log(
      'money',
      `Tu refuses ta part de la succession de ${fullName(deceased)}. Tu t’y étais engagé.`,
      'neutral',
    );
    return;
  }

  const tax = Math.round(gross * (country.taxRate * 0.5));
  const net = gross - tax;
  p.money += net;
  p.chronicle.inherited += Math.max(0, net);
  ctx.log('money', `Héritage de ${fullName(deceased)} : ${net} (après ${tax} de droits de succession).`, 'good');
}

function relationLabel(p: Person): string {
  const labels: Partial<Record<Person['relation'], string>> = {
    mother: 'ta mère', father: 'ton père', brother: 'ton frère', sister: 'ta sœur',
    son: 'ton fils', daughter: 'ta fille', spouse: 'ton conjoint', partner: 'ton partenaire',
    friend: 'un ami', bestFriend: 'ton meilleur ami', ex: 'ton ex',
  };
  return labels[p.relation] ?? 'un proche';
}

export interface EstateShare {
  personId: string;
  name: string;
  amount: number;
}

/**
 * Répartit le patrimoine du joueur à sa mort.
 * Utilise le testament s'il existe, sinon l'ordre légal (conjoint, enfants,
 * puis parents et fratrie).
 */
export function settleEstate(ctx: Ctx): EstateShare[] {
  const { state } = ctx;
  const p = state.player;
  const total = Math.max(0, netWorth(state));
  if (total <= 0) return [];

  const shares: EstateShare[] = [];
  const willShares = Object.entries(p.will.shares).filter(([id, pct]) => {
    const heir = person(state, id);
    return heir && heir.alive && pct > 0;
  });

  if (willShares.length) {
    const declared = willShares.reduce((s, [, pct]) => s + pct, 0);
    for (const [id, pct] of willShares) {
      const heir = person(state, id)!;
      const amount = Math.round((total * pct) / Math.max(100, declared));
      heir.wealth += amount;
      shares.push({ personId: id, name: fullName(heir), amount });
    }
    // Le reliquat non attribué suit l'ordre légal.
    const remaining = total - shares.reduce((s, x) => s + x.amount, 0);
    if (remaining > 1) shares.push(...legalOrder(state, remaining));
    return shares;
  }
  return legalOrder(state, total);
}

function legalOrder(state: GameState, total: number): EstateShare[] {
  const alive = (kinds: Person['relation'][]) =>
    Object.values(state.npcs).filter((x) => x.alive && kinds.includes(x.relation));

  const spouse = alive(['spouse']);
  const children = alive(['son', 'daughter']);
  const parents = alive(['mother', 'father']);
  const siblings = alive(['brother', 'sister']);

  let heirs: Person[] = [];
  let weights: number[] = [];

  if (spouse.length && children.length) {
    heirs = [...spouse, ...children];
    weights = [0.35, ...children.map(() => 0.65 / children.length)];
  } else if (children.length) {
    heirs = children;
    weights = children.map(() => 1 / children.length);
  } else if (spouse.length) {
    heirs = spouse;
    weights = [1];
  } else if (parents.length) {
    heirs = parents;
    weights = parents.map(() => 1 / parents.length);
  } else if (siblings.length) {
    heirs = siblings;
    weights = siblings.map(() => 1 / siblings.length);
  } else {
    return [];
  }

  return heirs.map((heir, i) => {
    const amount = Math.round(total * weights[i]);
    heir.wealth += amount;
    return { personId: heir.id, name: fullName(heir), amount };
  });
}
