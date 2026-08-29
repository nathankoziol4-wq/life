/**
 * Le cercle.
 *
 * **Ce qui n'existait pas.** Le jeu sait faire deux choses avec du monde : la
 * notoriété (`fame.ts` — des gens qui regardent, comptés en `followers`) et la
 * politique (`politics.ts` — des blocs qui votent, un adversaire, un mandat).
 * Le catalogue en demandait une troisième, `Carrières spéciales/Communauté`,
 * et elle n'a rien à voir : **des gens qui viennent.** Pas un public, pas un
 * électorat. Il n'y a ni vote, ni adversaire, ni terme, et l'on ne gagne rien à
 * la fin.
 *
 * Toute la mécanique tient dans une phrase : **on ne peut pas à la fois le
 * faire grandir et le garder.**
 *
 * **1. Cela dérive tout seul.** Deux versants — le repli sur soi et
 * l'intensité — montent d'eux-mêmes chaque année, d'autant plus vite que le
 * cercle est grand et que le joueur y est peu. Le joueur ne les règle pas. Il
 * ne peut que payer pour les ramener.
 *
 * **2. Ramener coûte des gens.** Ouvrir les portes fait partir ceux qui étaient
 * venus pour être entre soi ; redescendre d'un ton fait partir les plus
 * ardents. Chaque geste rend un versant et en abîme un autre.
 *
 * **3. La main se perd avec la taille.** Ce qu'on a commencé finit par ne plus
 * répondre : sous un certain seuil, les gestes ne portent plus, et l'on assiste
 * à quelque chose qu'on a lancé sans plus pouvoir l'infléchir. C'est la vraie
 * fin du système — pas un échec, une dépossession.
 *
 * **4. Le dehors regarde.** Le repli et l'intensité l'inquiètent, et cela finit
 * par se régler ailleurs qu'entre vous.
 *
 * **Ce fichier ne contient aucune méthode.** Les gens arrivent et partent selon
 * des nombres tirés de la taille, de la dérive et du regard du dehors ; rien
 * n'y décrit comment on rassemble, comment on convainc ou comment on retient.
 * Ce que le joueur décide est où il met son temps, ce qu'il fait de la caisse,
 * et lequel des deux versants il accepte de laisser filer.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, Circle, GameState } from '../engine/types.ts';
import {
  CALLS, CARES, DRIFT, DRIFT_SIZE, GESTURES, HOLD_FLOOR, HOLD_LOSS,
  HOLD_SIZE, NEEDS_STANDING, NEWCOMERS, PURSE_COST, REGARD_BITE, REGARD_TROUBLE,
  SATURATION, SETUP, START, type Care, getCall, getGesture, holdCeiling,
} from '../data/circle.ts';
import { getCountry } from '../data/countries.ts';

export { CALLS, CARES, GESTURES };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function circleOf(state: GameState): Circle | null {
  return state.player.circle ?? null;
}

/** L'indice de prix du pays et de l'année, comme partout ailleurs. */
function index(state: GameState): number {
  return getCountry(state.player.countryId).salaryIndex * state.world.inflation;
}

/** Ce que fonder coûte. */
export function setupCost(state: GameState): number {
  return Math.round(SETUP * index(state));
}

/** Ce que la caisse reçoit dans l'année, aux effectifs actuels. */
export function contributions(state: GameState): number {
  const c = circleOf(state);
  const call = getCall(c?.callId);
  if (!c || !call) return 0;
  // Un cercle intense donne davantage ; un cercle tiède donne ce qu'il peut.
  return Math.round(c.people * call.gives * index(state) * (0.5 + (c.fervour / 100) * 1.1));
}

/**
 * De combien cela dérive cette année, sur chaque versant.
 *
 * **Rendu à l'écran avant que l'année ne passe.** Le joueur doit pouvoir voir
 * que son cercle va gagner neuf points de repli s'il n'y touche pas — sinon il
 * ne peut pas décider s'il paie pour le ramener, et le système se réduirait à
 * regarder des nombres bouger.
 */
export function driftOf(state: GameState): { inward: number; fervour: number } {
  const c = circleOf(state);
  const call = getCall(c?.callId);
  if (!c || !call) return { inward: 0, fervour: 0 };
  // La taille pousse, la présence retient.
  const size = 1 + (c.people / SATURATION) * DRIFT_SIZE;
  const held = 1 - CARES[c.care].weight * 0.7;
  return {
    inward: Math.round(DRIFT * call.inward * 0.4 * size * held * 10) / 10,
    fervour: Math.round(DRIFT * call.fervour * 0.4 * size * held * 10) / 10,
  };
}

/** Ce que le cercle gagnerait ou perdrait comme monde cette année. */
export function growthOf(state: GameState): number {
  const c = circleOf(state);
  const call = getCall(c?.callId);
  if (!c || !call) return 0;
  const room = clamp(1 - c.people / SATURATION, -0.4, 1);
  // Ce qui fait venir : ce qu'on en dit dehors, et l'ardeur de ceux qui y sont.
  const pull = (c.regard / 100) * 0.7 + (c.fervour / 100) * 0.55
    + CARES[c.care].weight * 0.4;
  // Et ce qui fait partir : un cercle trop replié perd ceux qui avaient une
  // vie ailleurs.
  const bleed = (c.inward / 100) ** 2 * 0.28;
  /*
   * Deux termes, et il en faut deux : ceux qui viennent parce qu'ils en ont
   * entendu parler — un nombre absolu, qui ne dépend pas de la taille — et ceux
   * qu'on amène, qui en dépendent. Sans le premier, un cercle de quatre gagne
   * moins d'une personne par an et ne décolle jamais.
   */
  return Math.round((NEWCOMERS + c.people * call.draw) * pull * room - c.people * bleed);
}

export { holdCeiling };

/**
 * Ce que la taille autorise au plus comme main, aujourd'hui.
 *
 * Rendu à l'écran : un joueur qui voit son plafond descendre pendant que son
 * cercle grandit comprend la thèse du système sans qu'on la lui écrive.
 */
export function ceilingNow(state: GameState): number {
  const c = circleOf(state);
  return c ? holdCeiling(c.people) : 100;
}

/** A-t-on encore la main ? */
export function holds(state: GameState): boolean {
  const c = circleOf(state);
  return Boolean(c) && c!.hold >= HOLD_FLOOR;
}

/** Ce que le cercle est devenu, dit en français. */
export function shapeLine(state: GameState): string {
  const c = circleOf(state);
  if (!c) return '';
  if (c.inward > 70 && c.fervour > 70) return 'Replié et brûlant. Personne dehors ne comprend plus ce que vous faites.';
  if (c.inward > 70) return 'Refermé sur lui-même. On n’y entre plus, et l’on n’en sort plus beaucoup.';
  if (c.fervour > 70) return 'Ardent. Ce qu’on y demande aux gens ne se demande pas ailleurs.';
  if (c.inward < 35 && c.fervour < 35) return 'Ouvert et tranquille. Personne n’en dira jamais rien.';
  return 'Encore reconnaissable. Cela ne durera pas tout seul.';
}

/** Ce qu'il reste de la main, dit en français. */
export function holdLine(state: GameState): string {
  const c = circleOf(state);
  if (!c) return '';
  if (c.hold >= 75) return 'C’est encore le tien. Ce que tu dis se fait.';
  if (c.hold >= HOLD_FLOOR) return 'On t’écoute, et l’on discute. Ce n’est plus pareil.';
  return 'Cela ne t’appartient plus. Tu peux venir, tu ne peux plus décider.';
}

/* ------------------------------------------------------------------ */
/* Fonder                                                              */
/* ------------------------------------------------------------------ */

export function foundBlocker(state: GameState, callId: string): string | null {
  const p = state.player;
  if (!getCall(callId)) return 'Cela ne se fonde pas.';
  if (circleOf(state)) return 'Tu en as déjà un.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.age < 18) return 'Il faut avoir dix-huit ans.';
  if (p.stats.reputation < NEEDS_STANDING) {
    return 'Personne ne te suivrait. Il faut d’abord qu’on te connaisse un peu.';
  }
  if (p.money < setupCost(state)) return 'Il faut un lieu, et de quoi recevoir.';
  return null;
}

export function found(ctx: Ctx, callId: string): ActionResult {
  const { state } = ctx;
  const why = foundBlocker(state, callId);
  if (why) return { ok: false, message: why };
  const call = getCall(callId)!;
  const cost = setupCost(state);
  state.player.money -= cost;
  state.player.circle = {
    callId,
    since: state.year,
    people: START,
    inward: 20,
    fervour: 30,
    care: 'présent',
    purse: 0,
    regard: call.regard,
    hold: 100,
    gestureYear: null,
  };
  ctx.log('life', `Vous êtes ${START} à commencer quelque chose. ${call.line}`, 'good');
  return {
    ok: true,
    title: call.label,
    message: `${call.line} Vous êtes ${START}. Ce qui arrivera ensuite ne dépendra plus tout à fait de toi.`,
  };
}

/* ------------------------------------------------------------------ */
/* Décider                                                             */
/* ------------------------------------------------------------------ */

export function setCare(ctx: Ctx, care: Care): ActionResult {
  const c = circleOf(ctx.state);
  if (!c) return { ok: false, message: 'Tu n’as pas de cercle.' };
  c.care = care;
  return { ok: true, message: CARES[care].line };
}

export function gestureBlocker(state: GameState, gestureId: string): string | null {
  const c = circleOf(state);
  if (!c) return 'Tu n’as pas de cercle.';
  if (!getGesture(gestureId)) return 'Cela ne se fait pas.';
  if (c.gestureYear === state.year) return 'Une chose par an. Le reste se voit passer.';
  if (!holds(state) && gestureId !== 'reprendre') {
    return 'On ne t’écoute plus assez pour ça. Il faudrait d’abord reprendre les choses en main.';
  }
  return null;
}

/**
 * Un geste, une fois par an.
 *
 * Chacun rend un versant et en abîme un autre : c'est ce qui fait qu'on ne peut
 * pas tout tenir. Et **quand la main est tombée trop bas, un seul reste
 * possible** — reprendre les choses en main, qui coûte du monde et ne garantit
 * rien.
 */
export function gesture(ctx: Ctx, gestureId: string): ActionResult {
  const { state } = ctx;
  const c = circleOf(state);
  const g = getGesture(gestureId);
  const why = gestureBlocker(state, gestureId);
  if (why || !c || !g) return { ok: false, message: why ?? 'Tu n’as pas de cercle.' };

  const left = Math.round(c.people * g.leaves);
  c.people = Math.max(0, c.people - left);
  c.inward = clampStat(c.inward + g.inward);
  c.fervour = clampStat(c.fervour + g.fervour);
  c.regard = clampStat(c.regard + g.regard);
  c.hold = Math.min(clampStat(c.hold + g.hold), holdCeiling(c.people));
  c.gestureYear = state.year;

  ctx.log('life', `${g.label} — ${left} personne(s) sont parties.`, left > c.people * 0.15 ? 'bad' : 'neutral');
  return {
    ok: true,
    title: g.label,
    message: left > 0
      ? `${g.line} ${left} personne${left > 1 ? 's sont parties' : ' est partie'}.`
      : g.line,
  };
}

export function drawBlocker(state: GameState, amount: number): string | null {
  const c = circleOf(state);
  if (!c) return 'Tu n’as pas de cercle.';
  if (amount <= 0) return 'Il n’y a rien à prendre.';
  if (amount > c.purse) return 'La caisse ne contient pas ça.';
  return null;
}

/**
 * Prendre dans la caisse commune.
 *
 * Ce n'est pas interdit — c'est vu. Le coût est proportionnel à la part prise,
 * et il tombe sur les deux choses qui font tenir un cercle : ce que le dehors
 * en pense, et ce qu'on vous laisse encore décider.
 */
export function drawFromPurse(ctx: Ctx, amount: number): ActionResult {
  const { state } = ctx;
  const c = circleOf(state);
  const why = drawBlocker(state, amount);
  if (why || !c) return { ok: false, message: why ?? 'Tu n’as pas de cercle.' };
  const share = amount / Math.max(1, c.purse);
  c.purse -= amount;
  state.player.money += amount;
  c.regard = clampStat(c.regard - share * PURSE_COST);
  c.hold = clampStat(c.hold - share * PURSE_COST * 0.7);
  ctx.log('money', `Tu prends ${amount} dans la caisse du cercle.`, share > 0.5 ? 'bad' : 'neutral');
  return {
    ok: true,
    message: share > 0.5
      ? 'Tu as vidé la caisse. Cela ne restera pas entre vous.'
      : 'Personne n’a rien dit. Tout le monde a vu.',
  };
}

/**
 * S'en aller.
 *
 * Le cercle **continue sans toi**, et c'est le sens de tout le système : ce
 * qu'on a lancé ne s'arrête pas parce qu'on s'en va. Ce que le joueur perd est
 * seulement le droit d'en décider — qu'il avait peut-être déjà perdu.
 */
export function leave(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const c = circleOf(state);
  const call = getCall(c?.callId);
  if (!c || !call) return { ok: false, message: 'Tu n’as pas de cercle.' };
  const years = state.year - c.since;
  const people = c.people;
  state.player.circle = null;
  ctx.log('life', `Tu quittes le cercle. ${people} personne(s) continuent.`, 'neutral');
  return {
    ok: true,
    title: 'Tu t’en vas',
    message: `${years} an${years > 1 ? 's' : ''}, ${people} personne${people > 1 ? 's' : ''}. `
      + 'Cela continuera sans toi, et c’est bien ce que tu avais fait.',
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * L'année du cercle.
 *
 * L'ordre compte : la dérive **d'abord**, parce que ce que le joueur a décidé
 * l'a été en connaissance de ce qui allait dériver ; puis les gens, qui suivent
 * l'état d'après ; puis le dehors, qui regarde le résultat.
 */
export function advanceCircle(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const c = circleOf(state);
  const call = getCall(c?.callId);
  if (!c || !call) return;

  // Le fondateur en prison ne tient plus rien.
  if (p.prison) {
    c.hold = clampStat(c.hold - 18);
    c.care = 'absent';
  }

  // 1. La dérive, que personne ne décide.
  const drift = driftOf(state);
  c.inward = clampStat(c.inward + drift.inward);
  c.fervour = clampStat(c.fervour + drift.fervour);

  // 2. La main s'use de ce qui a dérivé, et de la taille.
  c.hold = clampStat(
    c.hold - (drift.inward + drift.fervour) * HOLD_LOSS
    - (c.people / SATURATION) * HOLD_SIZE
    + CARES[c.care].hold,
  );

  // 3. Les gens.
  const change = growthOf(state);
  c.people = Math.max(0, c.people + change);

  // 4. La caisse.
  c.purse += contributions(state);

  // 5. Le dehors. Ce qu'il voit est le repli et l'intensité, rien d'autre.
  /*
   * Ce qu'il voit est le repli et l'intensité, rien d'autre — pas la taille,
   * pas l'argent. Mesuré à un dixième de ce coefficient, un cercle entièrement
   * refermé et brûlant gardait un regard de 70 après trente ans : le dehors ne
   * réagissait pas, et les deux versants ne coûtaient donc rien. Au double de
   * celui-ci, il réagissait trop — les cinq formes de rassemblement finissaient
   * toutes à un regard de 1 à 9, et le joueur attentif était étranglé comme les
   * autres. Dix-sept laisse vivre celui qui s'en occupe et tombe sur les autres.
   */
  const worry = ((c.inward + c.fervour) / 200) ** 1.5;
  c.regard = clampStat(c.regard - worry * REGARD_BITE * 17 + 1.6);

  // 6. Et ce qui arrive quand le dehors n'aime plus du tout ce qu'il voit.
  if (c.regard < REGARD_TROUBLE && rng.chance(0.3)) {
    const lost = Math.round(c.people * rng.float(0.1, 0.3));
    c.people = Math.max(0, c.people - lost);
    c.regard = clampStat(c.regard + 6);
    p.stats.reputation = clampStat(p.stats.reputation - 5);
    ctx.log(
      'life',
      `On est venu poser des questions sur le cercle. ${lost} personne(s) ne sont pas revenues.`,
      'bad',
    );
  }

  // 7. Et si plus personne ne vient.
  if (c.people <= 0) {
    state.player.circle = null;
    ctx.log('life', 'Il ne reste plus personne. Le cercle s’est défait.', 'bad');
    return;
  }

  /*
   * Et le plafond que la taille autorise — **après que les gens sont arrivés**,
   * pas avant. Trouvé par le test : appliqué avant l'étape 3, il rabattait la
   * main sur le plafond de l'année d'avant, et un cercle qui grandit sortait de
   * l'année au-dessus de ce que sa nouvelle taille autorisait.
   */
  c.hold = Math.min(c.hold, holdCeiling(c.people));

  if (c.hold < HOLD_FLOOR && c.hold + 4 >= HOLD_FLOOR) {
    ctx.log('life', 'Le cercle ne fait plus ce que tu dis. Il fait ce qu’il est devenu.', 'bad');
  }
}

/* ------------------------------------------------------------------ */
/* Ce qui se lit sur la ligne d'accueil                                */
/* ------------------------------------------------------------------ */

export function summary(state: GameState): string {
  const c = circleOf(state);
  const call = getCall(c?.callId);
  if (!c || !call) return 'Rien autour de toi';
  return `${call.label} · ${c.people} personne${c.people > 1 ? 's' : ''}${holds(state) ? '' : ' · tu n’as plus la main'}`;
}
