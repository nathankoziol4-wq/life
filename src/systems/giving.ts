/**
 * Donner.
 *
 * **Ce que ce fichier ajoute.** Le jeu savait accumuler et savait perdre. Il
 * ne savait pas passer quelque chose à quelqu'un de son vivant : trois
 * feuilles du catalogue disaient séparément « offrir un objet », « offrir un
 * bien », « offrir un véhicule », et c'était trois fois le même verbe absent.
 * L'héritage existait — mais l'héritage, c'est ce qu'on laisse en mourant.
 *
 * Un seul endroit l'avait : `heirlooms.ts#give`, pour les objets de famille,
 * avec déjà la bonne intuition dans un commentaire — « ce que ça vaut pour
 * l'autre tient à l'âge autant qu'au prix ». **Ce fichier la généralise
 * plutôt que de la recopier** : les objets de famille passent toujours par
 * leur propre fonction, parce qu'un objet de famille n'est pas une
 * possession mais une pièce de lignée, et que ce qui compte pour lui est
 * l'âge. Tout le reste passe ici.
 *
 * **La règle : un cadeau ne vaut pas ce qu'il coûte.** Ce qu'il vaut pour
 * l'autre dépend de ce qu'il a déjà ; ce qu'il dit de vous dépend de ce qu'il
 * vous coûte. Les deux se multiplient, et c'est ce qui empêche d'acheter les
 * gens : le riche qui donne beaucoup à un riche ne gagne presque rien.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import {
  KARMA_MAX, LIFE_CHANGING, PURSES, REFUSALS, SACRIFICE, TRUSTED_AGE,
  WEALTH_FLOOR, WORTH_CAP,
} from '../data/giving.ts';
import { shiftStats } from './stats.ts';
import { noteHistory } from './npc.ts';
import { netWorth } from './finance.ts';

/* ------------------------------------------------------------------ */
/* Ce que ça vaut                                                      */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un cadeau vaut à celui qui le reçoit, en points de lien.
 *
 * **Les deux côtés, et ils se multiplient.**
 *
 * Le premier est le besoin : rapporté à ce que la personne a déjà. Mesuré,
 * cinquante mille valent 22,3 points à quelqu'un qui n'a presque rien et 0,3
 * à quelqu'un qui a cinq millions.
 *
 * Le second est le sacrifice : rapporté à ce que *vous* avez. La même somme
 * vaut 24,9 points venant de quelqu'un qui a soixante mille et 13,1 venant de
 * quelqu'un qui en a dix millions.
 *
 * **Ce que cela ne fait pas**, et la mesure a corrigé la première version sur
 * ce point : cela n'empêche pas un joueur fortuné d'obtenir beaucoup en
 * donnant beaucoup. Le receveur ne se soucie pas de la fortune du donneur, et
 * c'est juste. Ce qui tient, c'est que **le rendement sature** — donner un
 * cinquième de sa fortune à quelqu'un qui a vingt mille rapporte 9,1 points
 * quand on a quarante mille, 25,4 quand on en a quatre cent mille, et 30,9
 * quand on en a quatre millions. Cent fois plus d'argent pour trois fois plus
 * de lien.
 */
export function worthTo(state: GameState, target: Person, value: number): number {
  if (value <= 0) return 0;
  /*
   * **Une forme qui sature, et non une puissance qui explose.**
   *
   * La première version élevait `valeur / fortune` à la puissance 0,55 : le
   * résultat n'était borné que par le plafond, et le plafond faisait tout le
   * travail. Mesuré, donner la moitié de ce qu'on avait et donner la totalité
   * rapportaient exactement la même chose — quarante points tous les deux —
   * si bien que la moitié supérieure de la plage était plate. Avec
   * `v / (v + f)`, la valeur tend vers un sans jamais l'atteindre : au-delà
   * de ce dont la personne a besoin, donner plus ne rapporte presque plus
   * rien, et cela se voit dans les chiffres plutôt que dans un `clamp`.
   */
  const theirs = Math.max(WEALTH_FLOOR, target.wealth);
  const need = value / (value + theirs);

  const mine = Math.max(WEALTH_FLOOR, netWorth(state));
  const sacrifice = 1 + Math.min(1, value / mine) * SACRIFICE;

  return clamp(LIFE_CHANGING * need * sacrifice, 0, WORTH_CAP);
}

/** Ce que le geste dit, en mots, avant de le faire. */
export function worthSays(state: GameState, target: Person, value: number): string {
  const worth = worthTo(state, target, value);
  if (worth < 3) return `${target.firstName} n’a pas besoin de ça.`;
  if (worth < 9) return 'Ce sera apprécié, sans plus.';
  if (worth < 18) return `${target.firstName} s’en souviendra.`;
  if (worth < 28) return 'C’est beaucoup, pour lui comme pour toi.';
  return 'Ça change sa vie, et tu le sentiras passer.';
}

/* ------------------------------------------------------------------ */
/* Ce qu'on a à donner                                                 */
/* ------------------------------------------------------------------ */

/** Un objet donnable, quel qu'il soit. */
export interface Givable {
  kind: 'argent' | 'véhicule' | 'bien';
  id: string;
  label: string;
  emoji: string;
  value: number;
  /** Pourquoi on ne peut pas le donner, ou rien. */
  blocked: string | null;
}

/** Les véhicules et les biens qu'on possède, avec ce qui les retient. */
export function givables(state: GameState): Givable[] {
  const p = state.player;
  const out: Givable[] = [];

  for (const car of p.vehicles ?? []) {
    out.push({
      kind: 'véhicule',
      id: car.id,
      label: `${car.brand} ${car.model}`,
      emoji: '🚗',
      value: Math.round(car.value),
      blocked: null,
    });
  }
  for (const home of p.properties ?? []) {
    out.push({
      kind: 'bien',
      id: home.id,
      label: home.name,
      emoji: '🏠',
      value: Math.round(Math.max(0, home.value - home.mortgageBalance)),
      /*
       * Deux règles de conception, et non des commodités : on ne donne pas un
       * bien sur lequel on doit encore — la dette ne suit pas la porte — et
       * l'on ne donne pas le toit sous lequel on dort.
       */
      blocked: home.mortgageBalance > 0 ? REFUSALS.owed
        : home.isResidence ? REFUSALS.home
          : null,
    });
  }
  return out;
}

/** Ce qu'une bourse représenterait, en argent. */
export function purseValue(state: GameState, purseId: string): number {
  const purse = PURSES.find((x) => x.id === purseId);
  if (!purse) return 0;
  return Math.round(Math.max(0, state.player.money) * purse.share);
}

/* ------------------------------------------------------------------ */
/* Donner                                                              */
/* ------------------------------------------------------------------ */

/** Pourquoi on ne peut rien donner à cette personne, ou rien. */
export function giveBlocker(state: GameState, target: Person | null): string | null {
  if (state.player.prison) return REFUSALS.prison;
  if (!target?.alive) return REFUSALS.gone;
  return null;
}

/**
 * Ce que reçoit celui à qui l'on donne, quel que soit l'objet.
 *
 * Écrit une fois : les trois sortes de cadeaux se règlent exactement de la
 * même façon une fois qu'on sait ce qu'ils valent, et les faire diverger
 * serait trois occasions de se tromper.
 */
function land(ctx: Ctx, target: Person, value: number, what: string): number {
  const { state } = ctx;
  const bump = worthTo(state, target, value);
  target.wealth += value;
  target.relationship = clampStat(target.relationship + bump);
  target.opinion = clampStat(target.opinion + bump * 1.15);
  noteHistory(state, target, `${state.player.firstName} lui a donné ${what}.`);
  shiftStats(state, { karma: Math.round(clamp(bump / 4, 1, KARMA_MAX)) });
  return bump;
}

/** Donner de l'argent. */
export function giveMoney(ctx: Ctx, personId: string, purseId: string): ActionResult {
  const { state } = ctx;
  const target = state.npcs[personId] ?? null;
  const why = giveBlocker(state, target);
  if (why) return { ok: false, message: why };
  const amount = purseValue(state, purseId);
  if (amount <= 0) return { ok: false, message: REFUSALS.nothing };
  if (state.player.money < amount) return { ok: false, message: REFUSALS.broke };

  state.player.money -= amount;
  const bump = land(ctx, target!, amount, `${amount.toLocaleString('fr-FR')} $`);
  ctx.log('life', `Tu as donné ${amount.toLocaleString('fr-FR')} $ à ${target!.firstName}.`, 'good');
  return {
    ok: true,
    title: target!.firstName,
    tone: 'good',
    message: `${amount.toLocaleString('fr-FR')} $. ${saysOf(bump, target!)}`,
  };
}

/** Donner un véhicule ou un bien. */
export function giveThing(ctx: Ctx, personId: string, thingId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const target = state.npcs[personId] ?? null;
  const why = giveBlocker(state, target);
  if (why) return { ok: false, message: why };

  const thing = givables(state).find((g) => g.id === thingId);
  if (!thing) return { ok: false, message: REFUSALS.nothing };
  if (thing.blocked) return { ok: false, title: thing.label, message: thing.blocked };
  if (target!.age < TRUSTED_AGE) return { ok: false, title: thing.label, message: REFUSALS.young };

  if (thing.kind === 'véhicule') {
    p.vehicles = (p.vehicles ?? []).filter((v) => v.id !== thingId);
  } else {
    p.properties = (p.properties ?? []).filter((h) => h.id !== thingId);
  }
  const bump = land(ctx, target!, thing.value, thing.label.toLowerCase());
  ctx.log('life', `Tu as donné ${thing.label} à ${target!.firstName}.`, 'good');
  return {
    ok: true,
    title: target!.firstName,
    tone: 'good',
    message: `${thing.label} est à ${target!.firstName}. ${saysOf(bump, target!)}`,
  };
}

function saysOf(bump: number, target: Person): string {
  if (bump < 3) return `${target.firstName} remercie poliment.`;
  if (bump < 9) return 'C’est apprécié.';
  if (bump < 18) return `${target.firstName} ne s’y attendait pas.`;
  if (bump < 28) return 'Il ne sait pas quoi dire.';
  return 'Il n’oubliera pas.';
}

/* ------------------------------------------------------------------ */
/* Ce qu'on en dit                                                     */
/* ------------------------------------------------------------------ */

/** Une ligne pour le menu. */
export function summary(state: GameState): string {
  const things = givables(state).filter((g) => !g.blocked).length;
  const money = purseValue(state, 'coup');
  if (things === 0 && money <= 0) return 'Tu n’as rien à donner.';
  if (things === 0) return 'De l’argent, et rien d’autre pour l’instant';
  return `${things} chose(s) à toi, et ce que tu as de côté`;
}
