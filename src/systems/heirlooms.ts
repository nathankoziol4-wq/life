/**
 * Les objets de famille : les trouver, les tenir, les transmettre.
 *
 * Le jeu savait laisser de l'argent. L'argent se dépense, et à la génération
 * suivante il n'en reste qu'un chiffre de départ. Un objet, lui, traverse :
 * il vieillit, il s'abîme, on le restaure, on le vend le jour où l'on n'a
 * plus le choix — et deux siècles plus tard il porte le nom de tous ceux qui
 * l'ont tenu avant.
 *
 * Trois principes.
 *
 * **1. L'âge vaut plus que la matière.** Un objet ordinaire gardé trois cents
 * ans vaut davantage qu'un bel objet acheté hier. C'est le seul placement du
 * jeu qui demande de la patience plutôt que de l'argent, et le seul dont on
 * hérite sans qu'il perde son identité.
 *
 * **2. Le garder coûte.** L'état se dégrade tout seul, à une vitesse propre à
 * l'objet — le textile s'en va vite, le métal presque pas. Restaurer coûte et
 * ne rend jamais tout : trop de reprises et l'on ne montre plus qu'une copie
 * de soi-même. Ne rien faire est donc un choix, pas un défaut d'action.
 *
 * **3. Il porte une histoire.** Chaque génération y ajoute une ligne, même
 * celles qui n'y ont pas touché. C'est ce qui rend pénible de le vendre, même
 * quand c'est raisonnable — et c'est exactement l'effet recherché.
 *
 * On les trouve en cherchant : une pièce sans lumière, une lampe, et trois
 * fouilles (`minigames/attic.ts`). Le grenier ne s'ouvre pas tous les jours —
 * il faut une vieille maison, un deuil, ou l'endroit où l'on a grandi.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type { ActionResult, GameState, Heirloom } from '../engine/types.ts';
import {
  HEIRLOOM_KINDS, PROVENANCES, QUIET_LINES, RESTORE_COST, RESTORE_GAIN,
  ageFactor, authenticityFactor, conditionFactor, conditionLabel,
  getHeirloomKind, type HeirloomKind,
} from '../data/heirlooms.ts';
import { autoResolve, blend, type MiniGameContext, type MiniGameResult } from '../engine/minigame.ts';
import { livingCostOf } from './ribbons.ts';
import { shiftStats } from './stats.ts';

export { conditionLabel, HEIRLOOM_KINDS, getHeirloomKind };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/**
 * Borne 0-100 **sans arrondir**.
 *
 * `clampStat` arrondit, ce qui convient à une statistique affichée mais pas
 * ici : une alliance perd un quart de point par an, et l'arrondi la ramenait
 * chaque fois à sa valeur de départ. Cinq objets du catalogue sur dix-huit
 * étaient ainsi rigoureusement immortels — précisément ceux qu'on garde le
 * plus longtemps, donc ceux où l'usure comptait le plus.
 */
function fine(value: number): number {
  return clamp(value, 0, 100);
}

/**
 * L'état vers lequel un objet abandonné tend, sans jamais aller plus bas.
 *
 * En dessous, il faut l'avoir trouvé dans cet état : le temps seul n'y mène
 * pas.
 */
const RESTING = 24;

export function heirloomsOf(state: GameState): Heirloom[] {
  return [...state.player.heirlooms].sort((a, b) => a.since - b.since);
}

/** L'âge d'un objet dans la famille, en années. */
export function ageOf(state: GameState, item: Heirloom): number {
  return Math.max(0, state.year - item.since);
}

/**
 * Ce que vaut un objet aujourd'hui.
 *
 * Quatre facteurs qui se multiplient : ce qu'il valait neuf, son état, son
 * âge, et ce que les restaurations lui ont pris. C'est le produit qui compte
 * — un objet très vieux et ruiné ne vaut rien, un objet neuf et parfait non
 * plus.
 */
export function valueOf(state: GameState, item: Heirloom): number {
  const kind = getHeirloomKind(item.kindId);
  if (!kind) return 0;
  return Math.round(
    livingCostOf(state) * kind.worth
    * conditionFactor(item.condition)
    * ageFactor(ageOf(state, item))
    * authenticityFactor(item.restorations),
  );
}

/** Ce que tout le patrimoine familial vaut. */
export function heirloomWorth(state: GameState): number {
  return state.player.heirlooms.reduce((sum, item) => sum + valueOf(state, item), 0);
}

/** Le plus ancien objet encore dans la famille, s'il y en a un. */
export function eldest(state: GameState): Heirloom | null {
  const all = heirloomsOf(state);
  return all.length > 0 ? all[0] : null;
}

/** Ce qu'on peut dire de l'ancienneté d'un objet. */
export function ageLabel(years: number): string {
  if (years < 25) return 'De ton vivant';
  if (years < 60) return 'D’avant toi';
  if (years < 120) return 'Plus d’un siècle';
  if (years < 220) return 'Plus de deux siècles';
  return 'Plus de trois siècles';
}

/* ------------------------------------------------------------------ */
/* Chercher                                                            */
/* ------------------------------------------------------------------ */

/**
 * Où l'on peut chercher, et pourquoi.
 *
 * Le grenier ne s'ouvre pas parce qu'on le veut : il faut un endroit qui a
 * une histoire. C'est ce qui empêche de fouiller tous les ans jusqu'à
 * remplir une vitrine.
 */
export function searchBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.prison) return 'Pas depuis une cellule.';
  if (Number(p.yearActions.atticSearch ?? 0) >= 1) {
    return 'Tu as déjà retourné ce grenier cette année.';
  }
  if (p.age < 8) return 'Tu es trop petit pour monter là-haut.';
  // Un endroit qui a une histoire : la maison de famille tant qu'on est
  // jeune, ou un bien assez ancien pour avoir été à quelqu'un d'autre.
  const old = p.properties.some((prop) => state.year - prop.purchaseYear >= 6);
  if (p.age > 25 && !old && p.heirlooms.length > 0) {
    return 'Il n’y a plus rien à retourner ici.';
  }
  if (p.age > 25 && !old) return 'Il te faudrait une maison qui ait vécu.';
  return null;
}

/** Ce que le personnage apporte à la recherche. */
export function searchContext(state: GameState): MiniGameContext {
  const p = state.player;
  // Ce qui aide à trouver : la patience et l'œil, pas la force.
  const skill = clampStat(
    p.traits.discipline * 0.35 + p.stats.intelligence * 0.4 + p.traits.studiousness * 0.25,
  );
  // Plus on a déjà trouvé, moins il reste : le grenier n'est pas inépuisable.
  const picked = p.heirlooms.filter((h) => h.since >= state.year - p.age).length;
  return {
    skill,
    difficulty: clampStat(34 + picked * 13),
    mode: 'normal',
    grace: {
      time: 1 + (skill / 100) * 0.3,
      pressure: 1 - (skill / 100) * 0.25,
      tolerance: skill * 0.4,
      insight: skill > 62,
    },
  };
}

/**
 * Ce qu'on a trouvé.
 *
 * L'objet n'est tiré qu'à la réussite, et sa rareté dépend de ce que le
 * joueur a fait : bien chercher ne donne pas seulement quelque chose, ça
 * donne quelque chose de mieux.
 */
export function settleSearch(ctx: Ctx, result: MiniGameResult): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const blocker = searchBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  p.yearActions.atticSearch = 1;

  const quality = blend(searchContext(state), result, 0.5);
  if (!result.success) {
    shiftStats(state, { happiness: -2 });
    return {
      ok: true,
      title: 'Rien',
      tone: 'neutral',
      message: `${result.notes?.[0] ?? 'Il n’y avait rien, ou tu ne l’as pas vu.'} Il faudra revenir.`,
    };
  }

  // La rareté suit ce qu'on a fait : le seuil monte avec la qualité, et l'on
  // ne tombe jamais sur la pièce exceptionnelle en fouillant au hasard.
  const ceiling = 1 + Math.floor(quality * 4.4);
  const pool = HEIRLOOM_KINDS.filter(
    (k) => k.rarity <= ceiling && !p.heirlooms.some((h) => h.kindId === k.id),
  );
  const kind = pool.length > 0
    ? pool[rng.int(0, pool.length - 1)]
    : HEIRLOOM_KINDS[rng.int(0, HEIRLOOM_KINDS.length - 1)];

  const item = adopt(ctx, kind, rng.pick(PROVENANCES), rng.int(12, 78));
  shiftStats(state, { happiness: 6 });
  ctx.log('life', `Tu as trouvé ${kind.label.toLowerCase()}.`, 'good');
  return {
    ok: true,
    title: kind.label,
    tone: 'good',
    message: `${kind.story} ${conditionLabel(item.condition)}. Il entre dans la famille aujourd’hui.`,
  };
}

/** Laisser le personnage chercher sans jouer. */
export function autoSearch(ctx: Ctx): ActionResult {
  return settleSearch(ctx, autoResolve(ctx.rng, searchContext(ctx.state)));
}

/**
 * Fait entrer un objet dans la famille.
 *
 * Exporté parce que d'autres systèmes doivent pouvoir le faire : un héritage,
 * un cadeau de mariage, une distinction. L'objet n'est jamais créé sans une
 * première ligne d'histoire — c'est elle qui en fait un objet de famille et
 * non un objet de valeur.
 */
export function adopt(
  ctx: Ctx,
  kind: HeirloomKind,
  provenance: string,
  condition: number,
): Heirloom {
  const { state } = ctx;
  const p = state.player;
  const item: Heirloom = {
    id: ctx.id('heir'),
    kindId: kind.id,
    since: state.year,
    founder: fullName(p),
    provenance,
    condition: fine(condition),
    restorations: 0,
    generations: 1,
    history: [{ year: state.year, text: `${fullName(p)} l’a ${provenance}.` }],
  };
  p.heirlooms.push(item);
  return item;
}

/* ------------------------------------------------------------------ */
/* Tenir                                                               */
/* ------------------------------------------------------------------ */

export function restoreCost(state: GameState, item: Heirloom): number {
  const kind = getHeirloomKind(item.kindId);
  if (!kind) return 0;
  // Restaurer un objet précieux coûte davantage, et un objet déjà repris
  // coûte plus encore : les bons artisans se font rares.
  return Math.round(
    livingCostOf(state) * RESTORE_COST * kind.worth
    * (1 + item.restorations * 0.35),
  );
}

export function restoreBlocker(state: GameState, item: Heirloom): string | null {
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (item.condition >= 92) return 'Il n’y a rien à reprendre.';
  if (state.player.money < restoreCost(state, item)) return 'Tu n’as pas de quoi payer.';
  if (Number(state.player.yearActions[`restore_${item.id}`] ?? 0) >= 1) {
    return 'Il est déjà passé chez l’artisan cette année.';
  }
  return null;
}

export function restore(ctx: Ctx, itemId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const item = p.heirlooms.find((h) => h.id === itemId);
  const kind = item ? getHeirloomKind(item.kindId) : null;
  if (!item || !kind) return { ok: false, message: 'Cet objet n’existe pas.' };
  const blocker = restoreBlocker(state, item);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const before = valueOf(state, item);
  p.money -= restoreCost(state, item);
  p.yearActions[`restore_${item.id}`] = 1;
  item.condition = fine(item.condition + RESTORE_GAIN + rng.int(-6, 8));
  item.restorations += 1;
  item.history.push({
    year: state.year,
    text: `${p.firstName} l’a fait reprendre.`,
  });
  const after = valueOf(state, item);
  return {
    ok: true,
    title: kind.label,
    tone: after > before ? 'good' : 'neutral',
    message: `${conditionLabel(item.condition)}.${
      item.restorations >= 3
        ? ' À force de reprises, ce n’est plus tout à fait le même objet.'
        : ''}`,
  };
}

export function sell(ctx: Ctx, itemId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const item = p.heirlooms.find((h) => h.id === itemId);
  const kind = item ? getHeirloomKind(item.kindId) : null;
  if (!item || !kind) return { ok: false, message: 'Cet objet n’existe pas.' };

  const paid = valueOf(state, item);
  p.money += paid;
  p.heirlooms = p.heirlooms.filter((h) => h.id !== itemId);
  const years = ageOf(state, item);
  // Vendre ce que la famille a tenu longtemps se paie ailleurs qu'en argent.
  const weight = Math.min(1, years / 120);
  shiftStats(state, { happiness: -Math.round(4 + weight * 12) });
  ctx.log('money', `Tu as vendu ${kind.label.toLowerCase()} — ${paid}.`, 'neutral');
  return {
    ok: true,
    title: 'Vendu',
    tone: years > 60 ? 'bad' : 'neutral',
    message: years > 60
      ? `${paid}. Il était dans la famille depuis ${years} ans, et il n’y est plus.`
      : `${paid}. Personne ne s’en apercevra.`,
  };
}

export function giveBlocker(state: GameState): string | null {
  if (state.player.prison) return 'Pas depuis une cellule.';
  return null;
}

/**
 * Donner l'objet à quelqu'un.
 *
 * Il quitte la dynastie pour de bon : c'est ce qui distingue donner de
 * transmettre. Ce qu'on y gagne est une relation, et c'est parfois ce qu'on
 * cherche.
 */
export function give(ctx: Ctx, itemId: string, personId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const item = p.heirlooms.find((h) => h.id === itemId);
  const kind = item ? getHeirloomKind(item.kindId) : null;
  const target = person(state, personId);
  if (!item || !kind) return { ok: false, message: 'Cet objet n’existe pas.' };
  if (!target || !target.alive) return { ok: false, message: 'Cette personne n’est pas là.' };
  const blocker = giveBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const years = ageOf(state, item);
  const worth = valueOf(state, item);
  p.heirlooms = p.heirlooms.filter((h) => h.id !== itemId);
  target.wealth += worth;
  // Ce que ça vaut pour l'autre tient à l'âge autant qu'au prix : offrir
  // quelque chose que la famille tient depuis deux siècles n'est pas offrir
  // un objet.
  const bump = clamp(8 + years / 8, 8, 34);
  target.relationship = clampStat(target.relationship + bump);
  target.opinion = clampStat(target.opinion + bump * 1.2);
  target.history.push({
    year: state.year,
    text: `${p.firstName} lui a donné ${kind.label.toLowerCase()}.`,
  });
  shiftStats(state, { karma: 4 });
  ctx.log('life', `Tu as donné ${kind.label.toLowerCase()} à ${target.firstName}.`, 'good');
  return {
    ok: true,
    title: target.firstName,
    tone: 'good',
    message: years > 60
      ? `Il sort de la famille après ${years} ans. ${target.firstName} sait ce que ça veut dire.`
      : `${target.firstName} ne s’y attendait pas.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une année de plus dans un tiroir.
 *
 * L'état baisse, et l'histoire s'écrit même quand il ne se passe rien : une
 * génération qui n'a rien fait a quand même tenu l'objet, et c'est une ligne
 * qui compte autant que les autres.
 */
export function advanceHeirlooms(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.heirlooms.length === 0) return;

  for (const item of p.heirlooms) {
    const kind = getHeirloomKind(item.kindId);
    if (!kind) continue;
    // Ce qui a déjà été repris se dégrade un peu plus vite : les reprises
    // tiennent moins bien que l'original.
    // L'usure ralentit à mesure qu'elle a fait son œuvre, et s'arrête à un
    // palier. Sans lui, tout finissait à zéro : la fixture de dynastie
    // montrait neuf objets sur dix anéantis après un siècle, ce qui rendait
    // la règle « l'âge fait la valeur » impossible à vérifier en jeu. Une
    // montre oubliée cent ans dans un tiroir est ternie, pas annihilée.
    const room = Math.max(0, item.condition - RESTING) / (100 - RESTING);
    item.condition = fine(
      item.condition - kind.wear * (1 + item.restorations * 0.15) * room,
    );
    // Une ligne de temps en temps, et jamais deux fois de suite : une
    // histoire qui se remplit chaque année n'est plus une histoire.
    if (rng.chance(0.06) && item.history.length < 40) {
      item.history.push({ year: state.year, text: rng.pick(QUIET_LINES) });
    }
  }
}
