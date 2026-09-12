/**
 * La route : se fournir, porter, écouler.
 *
 * Le raisonnement est dans `data/route.ts`. Ici, quatre choses.
 *
 * **Lire la carte.** Ce que chaque marchandise vaut dans chaque région, et ce
 * que ça vaut là où l'on est. C'est la seule compétence que le système
 * demande, et elle n'est pas donnée : la carte dérive chaque année.
 *
 * **Se fournir.** On achète au prix d'ici, dans la limite de ce qu'on peut
 * porter. La place, pas l'argent, est ce qui borne.
 *
 * **Faire un passage.** On emmène tout ce qu'on a vers une région et on y
 * vend. C'est le seul moment risqué, et la chaleur décide du reste.
 *
 * **L'année.** Les prix dérivent, ce qu'on garde sur les bras attire
 * l'attention, et une année tranquille fait retomber.
 *
 * `advanceRoute` ne tire **rien** de `ctx.rng` : il tourne à chaque année de
 * chaque vie, et la séquence est partagée par tout le moteur. La dérive passe
 * par le hachage déterministe, comme ailleurs (`legacy.ts`, `beast.ts`,
 * `birth.ts`). Les tirages ne reviennent que dans `run`, qui est une action du
 * joueur.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, RouteState } from '../engine/types.ts';
import {
  CEILING, CHEAP, CLOSES, DEAR, DRIFT, FLOOR, GOODS, HEAT_CURVE, HEAT_LOAD,
  HEAT_SALE, HEAT_SCALE, HOLD_BASE, HOLD_CONTACT, HOLD_VEHICLE, STOPPED,
  STOP_ARREST, STOP_FLOOR, STOP_LINES, getGood,
} from '../data/route.ts';
import { REGION_ARCHETYPES, type RegionArchetype } from '../data/regions.ts';
import { addHeat, contactByRole, fenceBonus, heatOf } from './underworld.ts';
import { arrest } from './justice.ts';
import { CRIMES } from '../data/crimes.ts';
import { localPrice } from './activities.ts';
import { shiftStats } from './stats.ts';

export { GOODS, getGood };

/**
 * Un tirage déterministe qui ne consomme rien — même idiome qu'ailleurs.
 */
function hash(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/** Un nombre stable tiré d'une chaîne. */
function saltOf(text: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16_777_619) >>> 0;
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Un état vierge, **neuf à chaque fois**. */
function blank(): RouteState {
  return {
    hold: {}, boughtIn: null, market: {}, lastYear: null, runs: 0, seized: 0, earned: 0,
  };
}

/**
 * L'état de la route, en lecture.
 *
 * Rend un objet **neuf** quand le personnage n'a jamais rien porté, et jamais
 * une constante partagée. La première version renvoyait un singleton : il a
 * suffi qu'un appelant écrive dans le résultat — `routeOf(state).hold = …` —
 * pour que *toutes* les parties sans état de route voient désormais une
 * cargaison fantôme, une capacité saturée et un achat refusé. Quatre tests
 * sont tombés d'un coup, sur des états qui, pris isolément, allaient bien.
 *
 * Pour écrire, il faut passer par `ensureRoute`, qui attache l'état au joueur.
 */
export function routeOf(state: GameState): RouteState {
  return state.player.route ?? blank();
}

/** L'état de la route, créé et attaché à la première utilisation. */
export function ensureRoute(state: GameState): RouteState {
  state.player.route ??= blank();
  return state.player.route;
}

/** La région où l'on se trouve. */
export function hereId(state: GameState): string {
  return state.player.origin.region?.id ?? 'suburban';
}

/**
 * Le multiplicateur d'une marchandise dans une région.
 *
 * Le point de départ vient du catalogue — banal là où ça se produit, cher là
 * où ça manque, ordinaire ailleurs — puis la dérive de l'année s'y ajoute.
 * Elle est mémorisée dans `market` : sans cela, la carte se reconstruirait à
 * l'identique à chaque lecture et ne dériverait jamais.
 */
export function priceFactor(state: GameState, regionId: string, goodId: string): number {
  const route = routeOf(state);
  const stored = route.market[regionId]?.[goodId];
  if (stored !== undefined) return stored;
  return baseFactor(regionId, goodId);
}

function baseFactor(regionId: string, goodId: string): number {
  const good = getGood(goodId);
  if (!good) return 1;
  if (good.from.includes(regionId)) return CHEAP;
  if (good.to.includes(regionId)) return DEAR;
  return 1;
}

/** Ce qu'une unité vaut dans une région, en monnaie du pays. */
export function priceAt(state: GameState, regionId: string, goodId: string): number {
  const good = getGood(goodId);
  if (!good) return 0;
  return Math.round(localPrice(state, good.base) * priceFactor(state, regionId, goodId));
}

/** Ce qu'une unité coûte ici. */
export function costHere(state: GameState, goodId: string): number {
  return priceAt(state, hereId(state), goodId);
}

/**
 * Ce qu'on peut porter.
 *
 * La place, et non l'argent : c'est ce qui rend l'encombrement d'une
 * marchandise aussi important que sa marge. Un véhicule et un contact bien
 * placé l'augmentent, et c'est la seule chose qu'ils font ici.
 */
export function capacity(state: GameState): number {
  const p = state.player;
  let hold = HOLD_BASE;
  if (p.vehicles.length > 0) hold += HOLD_VEHICLE;
  if (contactByRole(state, 'receleur')) hold += HOLD_CONTACT;
  return hold;
}

/** La place déjà occupée. */
export function loadOf(state: GameState): number {
  const route = routeOf(state);
  let used = 0;
  for (const [id, units] of Object.entries(route.hold)) {
    used += (getGood(id)?.bulk ?? 1) * units;
  }
  return used;
}

/** La place qu'il reste. */
export function roomLeft(state: GameState): number {
  return Math.max(0, capacity(state) - loadOf(state));
}

/** Ce que le stock vaudrait, vendu ici. */
export function holdWorth(state: GameState, regionId = hereId(state)): number {
  const route = routeOf(state);
  let worth = 0;
  for (const [id, units] of Object.entries(route.hold)) {
    worth += priceAt(state, regionId, id) * units;
  }
  return Math.round(worth);
}

/** Rien sur les bras ? */
export function empty(state: GameState): boolean {
  return Object.values(routeOf(state).hold).every((n) => n <= 0);
}

/**
 * Ce qu'une charge attire d'attention, à l'échelle de ce qu'on peut porter.
 *
 * Quadratique : à moitié plein on paie le quart, à plein on paie tout. C'est
 * la seule raison qu'il y ait une bonne quantité plutôt qu'un maximum.
 * Utilisée aux deux endroits où la charge se voit — la vente, et l'année
 * passée à garder la marchandise — pour que le principe soit vrai partout et
 * pas seulement là où on l'a écrit.
 */
export function loadHeat(state: GameState, scale: number): number {
  const load = loadOf(state);
  if (load <= 0) return 0;
  const share = Math.min(1, load / Math.max(1, capacity(state)));
  return scale * share ** HEAT_CURVE * Math.max(0.4, noticeOf(state));
}

/** Ce que la charge attire d'attention par an, quand on la garde. */
export function heatOfLoad(state: GameState): number {
  return loadHeat(state, HEAT_SCALE * HOLD_BASE);
}

/** Ce que le contenu du stock attire, en moyenne pondérée. */
export function noticeOf(state: GameState): number {
  const route = routeOf(state);
  let weighted = 0;
  let bulk = 0;
  for (const [id, units] of Object.entries(route.hold)) {
    const good = getGood(id);
    if (!good || units <= 0) continue;
    weighted += good.notice * good.bulk * units;
    bulk += good.bulk * units;
  }
  return bulk > 0 ? weighted / bulk : 0;
}

/** Les régions, avec ce que le stock y vaudrait. */
export function destinations(state: GameState) {
  const here = hereId(state);
  return REGION_ARCHETYPES
    .filter((r: RegionArchetype) => r.id !== here)
    .map((r: RegionArchetype) => ({ region: r, worth: holdWorth(state, r.id) }))
    .sort((a, b) => b.worth - a.worth);
}

/* ------------------------------------------------------------------ */
/* Se fournir                                                          */
/* ------------------------------------------------------------------ */

export function stockBlocker(state: GameState, goodId: string, units: number): string | null {
  const p = state.player;
  const good = getGood(goodId);
  if (!good) return 'On ne trouve pas ça.';
  if (p.age < 18) return 'Personne ne traitera avec toi.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (units <= 0) return 'Il faut en prendre au moins une.';
  const route = routeOf(state);
  // On ne mélange pas deux provenances : le stock part d'un endroit, sans
  // quoi « vendre ailleurs » ne voudrait plus rien dire.
  if (route.boughtIn && route.boughtIn !== hereId(state) && !empty(state)) {
    return 'Tu as déjà de la marchandise prise ailleurs. Écoule-la d’abord.';
  }
  if (good.bulk * units > roomLeft(state)) return 'Tu n’as pas la place.';
  if (costHere(state, goodId) * units > p.money) return 'Tu n’as pas de quoi payer.';
  return null;
}

/** Combien on peut en prendre, au plus, place et argent comprises. */
export function mostAffordable(state: GameState, goodId: string): number {
  const good = getGood(goodId);
  const unit = costHere(state, goodId);
  if (!good || unit <= 0) return 0;
  return Math.max(0, Math.min(
    Math.floor(roomLeft(state) / good.bulk),
    Math.floor(state.player.money / unit),
  ));
}

export function stock(ctx: Ctx, goodId: string, units: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const good = getGood(goodId);
  const why = stockBlocker(state, goodId, units);
  if (!good) return { ok: false, message: 'On ne trouve pas ça.' };
  if (why) return { ok: false, title: good.label, message: why };

  const route = ensureRoute(state);
  const paid = costHere(state, goodId) * units;
  p.money -= paid;
  route.hold[goodId] = (route.hold[goodId] ?? 0) + units;
  route.boughtIn = hereId(state);
  route.lastYear = state.year;
  return {
    ok: true,
    title: good.label,
    tone: 'neutral',
    message: `${units} × ${good.label.toLowerCase()} pour ${paid}. `
      + `Il te reste ${roomLeft(state).toFixed(1)} de place.`,
  };
}

/* ------------------------------------------------------------------ */
/* Faire un passage                                                    */
/* ------------------------------------------------------------------ */

export function runBlocker(state: GameState, regionId: string): string | null {
  const p = state.player;
  if (p.prison) return 'Pas depuis une cellule.';
  if (empty(state)) return 'Tu n’as rien à porter.';
  if (regionId === hereId(state)) return 'Ça ne vaut rien de plus ici.';
  if (Number(p.yearActions.routeRun ?? 0) >= 1) return 'Tu as déjà fait le trajet cette année.';
  return null;
}

/**
 * La probabilité d'être arrêté en chemin.
 *
 * Deux facteurs qui se multiplient : ce qu'on est déjà pour la police, et ce
 * qu'on porte. Ni l'un ni l'autre ne suffit — un inconnu chargé passe, un
 * homme surveillé les mains vides aussi.
 */
export function stopOdds(state: GameState): number {
  const heat = heatOf(state);
  if (heat < STOP_FLOOR) return 0;
  const seen = (heat - STOP_FLOOR) / (100 - STOP_FLOOR);
  const load = Math.min(1, loadOf(state) / Math.max(1, capacity(state)));
  return clamp(STOPPED * seen * (0.35 + 0.65 * load) * Math.max(0.4, noticeOf(state)), 0, 0.9);
}

/**
 * Emmener tout ce qu'on a quelque part, et l'y vendre.
 *
 * Un seul passage par an : c'est ce qui empêche de faire le tour des sept
 * régions dans la même année et de vider la carte de tout son intérêt.
 */
export function run(ctx: Ctx, regionId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const region = REGION_ARCHETYPES.find((r: RegionArchetype) => r.id === regionId);
  const why = runBlocker(state, regionId);
  if (!region) return { ok: false, message: 'Nulle part.' };
  if (why) return { ok: false, title: region.label, message: why };

  const route = ensureRoute(state);
  p.yearActions.routeRun = 1;
  route.runs += 1;
  route.lastYear = state.year;

  // Le contrôle, avant la vente : on ne vend pas ce qu'on n'a pas pu amener.
  if (rng.chance(stopOdds(state))) {
    const lost = holdWorth(state, route.boughtIn ?? hereId(state));
    route.hold = {};
    route.boughtIn = null;
    route.seized += 1;
    route.earned -= lost;
    addHeat(ctx, 8);
    shiftStats(state, { stress: 14, happiness: -10 });
    const line = rng.pick(STOP_LINES);
    ctx.log('crime', `Ta cargaison est restée sur la route. ${line}`, 'bad');
    if (rng.chance(STOP_ARREST)) {
      // L'affaire remonte : la procédure abstraite qui existe déjà prend la
      // suite, on n'en invente pas une seconde.
      const crime = CRIMES.find((c) => c.id === 'smuggling');
      if (crime) arrest(ctx, crime, lost);
      return {
        ok: true, title: 'Contrôlé', tone: 'bad',
        message: `${line} Cette fois, ça ne s’arrête pas là.`,
      };
    }
    return {
      ok: true, title: 'Contrôlé', tone: 'bad',
      message: `${line} Tu perds tout ce que tu portais — ${lost}.`,
    };
  }

  const paid = holdWorth(state, route.boughtIn ?? hereId(state));
  const sold = Math.round(holdWorth(state, regionId) * (1 + fenceBonus(state)));
  // Relevé **avant** de vider les bras : c'est ce qu'on a porté qui se voit.
  const loadBefore = loadHeat(state, HEAT_LOAD);
  p.money += sold;
  route.earned += sold - paid;

  // Ce qu'on vient de vendre pèse sur place : l'écart qu'on a exploité se
  // referme un peu, et la route cesse d'être bonne à force de servir.
  const market = (route.market[regionId] ??= {});
  for (const [id, units] of Object.entries(route.hold)) {
    if (units <= 0) continue;
    const now = priceFactor(state, regionId, id);
    market[id] = clamp(now - CLOSES, FLOOR, CEILING);
  }
  route.hold = {};
  route.boughtIn = null;

  addHeat(ctx, HEAT_SALE + loadBefore);
  shiftStats(state, { stress: 5 });
  ctx.log('money', `Tu as écoulé ta cargaison ${region.label.toLowerCase()} — ${sold}.`, 'good');
  return {
    ok: true,
    title: region.label,
    tone: sold > paid ? 'good' : 'neutral',
    message: sold > paid
      ? `Tu repars avec ${sold}. Bénéfice : ${sold - paid}.`
      : `Tu repars avec ${sold}, et tu avais payé ${paid}. La route s’est refermée.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que l'année fait à la carte et à celui qui porte.
 *
 * La dérive est déterministe : elle dépend de l'année et de la région, jamais
 * de `ctx.rng`. Deux parties de même graine voient donc la même carte, et
 * aucune vie de référence ne bouge du fait que ce système existe.
 */
export function advanceRoute(ctx: Ctx): void {
  const { state } = ctx;
  const route = state.player.route;
  if (!route) return;

  // Les prix dérivent, et reviennent lentement vers ce qu'ils devraient être :
  // sans ce rappel, une région où l'on a beaucoup vendu resterait morte pour
  // toujours et la carte se viderait à mesure qu'on y joue.
  for (const region of REGION_ARCHETYPES) {
    const market = (route.market[region.id] ??= {});
    for (const good of GOODS) {
      const home = baseFactor(region.id, good.id);
      const now = market[good.id] ?? home;
      const wander = (hash(state.year * 7919 + saltOf(region.id), saltOf(good.id)) - 0.5) * 2 * DRIFT;
      market[good.id] = clamp(now + (home - now) * 0.25 + wander, FLOOR, CEILING);
    }
  }

  /*
   * Ce qu'on garde sur les bras se voit.
   *
   * **Il n'y a pas de refroidissement ici**, et c'est délibéré :
   * `advanceUnderworld` en applique déjà un, chaque année et sans condition.
   * J'en avais écrit un second — il refroidissait dès que les bras étaient
   * vides, c'est-à-dire exactement l'état où l'on se trouve juste après avoir
   * vendu — si bien que la chaleur d'une vente s'annulait deux fois. Se faire
   * oublier reste une façon de jouer ; c'est le milieu qui s'en charge.
   */
  const carrying = heatOfLoad(state);
  if (carrying > 0) addHeat(ctx, carrying);
}
