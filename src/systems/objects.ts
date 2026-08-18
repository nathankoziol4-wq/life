/**
 * Chiner, douter, expertiser, vendre.
 *
 * Mesuré avant d'écrire une ligne : **0 % des vies jouées possèdent le
 * moindre objet de valeur**, sur un catalogue de dix-huit articles dont
 * douze prennent de la valeur. La boutique existait, personne n'y entrait —
 * et pour une bonne raison : on y achetait au prix affiché ce qu'on
 * revendrait à 60 %. Il n'y avait rien à y gagner.
 *
 * Le manque n'était donc pas « il n'y a pas d'enchères ». C'était que
 * posséder un objet n'avait aucune raison d'être. Trois règles y répondent :
 *
 * **1. Ce qui a de la valeur ne s'achète pas au prix affiché.** On le
 * déniche, à une fraction du catalogue, sans savoir si c'en est un.
 *
 * **2. Le doute a un prix, dans les deux sens.** Vendre sans expertise coûte
 * une décote ; payer l'expertise peut révéler une copie, et l'on aurait mieux
 * fait de se taire. Qui sait lire (« les chiffres ») juge lui-même, et se
 * trompe de moins en moins.
 *
 * **3. Une collection vaut plus que ses pièces.** C'est la seule chose du jeu
 * qui récompense de *ne pas* vendre.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState } from '../engine/types.ts';
import {
  APPRAISAL, DOUBT_DISCOUNT, EYE_ERROR, EYE_SKILL, FAKE_VALUE, PAPERS_BONUS,
  PROVENANCES, RESERVE, SETS, STANDING_LABEL, getProvenance, getSet,
  type Provenance, type Sets, type Standing,
} from '../data/objects.ts';
import { SHOP_ITEMS } from '../data/activities.ts';
import { formatMoney, getCountry } from '../data/countries.ts';
import { levelOf } from './skills.ts';

export { PROVENANCES, SETS, STANDING_LABEL, getProvenance, getSet };
export type { Provenance, Sets, Standing };

/** Un objet possédé, tel que la sauvegarde le tient. */
type Owned = GameState['player']['valuables'][number] & {
  from?: string;
  standing?: Standing;
  real?: boolean;
};

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Ce qu'on sait de cet objet. */
export function standingOf(item: Owned): Standing {
  return item.standing ?? 'authentique';
}

/** D'où il vient. */
export function originOf(item: Owned): Provenance | undefined {
  return getProvenance(item.from ?? 'boutique');
}

/** Ce qu'une sortie coûte ici. */
export function huntCost(state: GameState, from: Provenance): number {
  const country = getCountry(state.player.countryId);
  return Math.round(from.cost * country.costIndex * state.world.inflation);
}

/** L'œil du personnage : ce qu'il sait juger sans payer personne. */
export function eyeOf(state: GameState): number {
  return levelOf(state, 'chiffres');
}

export function hasEye(state: GameState): boolean {
  return eyeOf(state) >= EYE_SKILL;
}

/** Pourquoi on ne peut pas y aller, ou rien. */
export function huntBlocker(state: GameState, fromId: string): string | null {
  const from = getProvenance(fromId);
  if (!from) return 'Rien par là.';
  const p = state.player;
  if (p.prison) return 'Pas d’ici.';
  if (p.age < from.from) return `Trop tôt. À partir de ${from.from} ans.`;
  if (Number(p.yearActions.hunt ?? 0) >= 2) return 'Tu as déjà écumé ce qu’il y avait cette année.';
  const cost = huntCost(state, from);
  if (p.money < cost) return `Il te faudrait ${formatMoney(cost, p.countryId)}.`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Chiner                                                              */
/* ------------------------------------------------------------------ */

/**
 * Aller voir ce qu'il y a.
 *
 * Le prix payé ne dépend que de l'endroit ; ce qu'on rapporte, du hasard et
 * de l'œil. Un objet déniché n'est **pas** authentifié : c'est tout l'objet du
 * système. On repart avec quelque chose dont on ne sait rien.
 */
export function hunt(ctx: Ctx, fromId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const from = getProvenance(fromId);
  if (!from) return { ok: false, message: 'Rien par là.' };
  const why = huntBlocker(state, fromId);
  if (why) return { ok: false, title: from.label, message: why };

  p.yearActions.hunt = Number(p.yearActions.hunt ?? 0) + 1;
  p.money -= huntCost(state, from);

  // La boutique ne fait pas chiner : elle vend ce qu'on demande.
  // Une vente après décès ne sort que des pièces qui valent quelque chose :
  // c'est ce qui justifie qu'elle coûte plus cher que la brocante.
  const rises = SHOP_ITEMS.filter((i) => (i.appreciation ?? -0.1) > 0);
  const pool = from.id === 'boutique' ? SHOP_ITEMS
    : from.rich ? rises.filter((i) => i.price >= 4000)
      : rises;
  if (pool.length === 0) return { ok: true, title: from.label, message: 'Rien qui vaille la peine.', tone: 'neutral' };

  // Une sortie ne rapporte pas toujours quelque chose. C'est ce qui empêche
  // de chiner en boucle et fait du choix de l'endroit une décision.
  if (from.id !== 'boutique' && !rng.chance(0.62)) {
    return {
      ok: true, title: from.label, tone: 'neutral',
      message: 'Tu retournes tout. Rien, cette fois.',
    };
  }

  const item = rng.pick(pool);
  const country = getCountry(p.countryId);
  const asked = Math.round(item.price * from.price * country.costIndex * state.world.inflation);
  if (p.money < asked) {
    return {
      ok: true, title: from.label, tone: 'bad',
      message: `Il y avait quelque chose. Tu n’avais pas de quoi.`,
    };
  }
  p.money -= asked;

  const real = rng.chance(from.genuine);
  const owned: Owned = {
    id: ctx.id('val'),
    name: item.name,
    value: Math.round(item.price * country.costIndex * state.world.inflation),
    purchaseYear: state.year,
    purchasePrice: asked,
    from: from.id,
    real,
    standing: from.id === 'boutique' ? 'authentique' : 'douteux',
  };
  p.valuables.push(owned);

  ctx.log('asset', `${from.label} — tu rapportes ${item.name}.`, 'neutral');
  return {
    ok: true, title: from.label, tone: 'good',
    message: from.id === 'boutique'
      ? `${item.name}, acheté ${formatMoney(asked, p.countryId)}. Rien à en dire de plus.`
      : `${item.name}, pour ${formatMoney(asked, p.countryId)}. Reste à savoir si c’en est un.`,
  };
}

/* ------------------------------------------------------------------ */
/* Le doute                                                            */
/* ------------------------------------------------------------------ */

/** Ce qu'une expertise coûte ici. */
export function appraisalCost(state: GameState): number {
  const country = getCountry(state.player.countryId);
  return Math.round(APPRAISAL * country.costIndex * state.world.inflation);
}

export function appraiseBlocker(state: GameState, item: Owned, bySelf = false): string | null {
  if (standingOf(item) !== 'douteux') return 'Tu sais déjà ce que c’est.';
  if (bySelf && !hasEye(state)) return 'Tu n’y connais rien. Il faudra payer quelqu’un.';
  if (!bySelf && state.player.money < appraisalCost(state)) {
    return `Un expert demande ${formatMoney(appraisalCost(state), state.player.countryId)}.`;
  }
  return null;
}

/** La justesse de son propre œil, de 0 à 1. */
export function eyeAccuracy(state: GameState): number {
  if (!hasEye(state)) return 0;
  return clamp(1 - EYE_ERROR * (1 - eyeOf(state) / 100), 0, 1);
}

/**
 * Savoir.
 *
 * Qui sait lire juge lui-même, gratuitement, et se trompe d'autant moins
 * qu'il sait mieux — c'est la seule chose qui fasse de la compétence « les
 * chiffres » autre chose qu'un salaire. Les autres paient quelqu'un, qui ne
 * se trompe pas.
 */
export function appraise(ctx: Ctx, valuableId: string, bySelf = false): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const item = p.valuables.find((v) => v.id === valuableId) as Owned | undefined;
  if (!item) return { ok: false, message: 'Objet introuvable.' };
  const why = appraiseBlocker(state, item, bySelf);
  if (why) return { ok: false, title: 'Expertise', message: why };

  // L'œil est une option de plus, jamais un remplacement. Mesuré quand il
  // remplaçait l'expert : un joueur sans compétence avait 100 % de verdicts
  // justes — il payait quelqu'un qui ne se trompe pas — et **franchir le
  // seuil le faisait tomber à 75 %**. Progresser rendait moins bon.
  const self = bySelf && hasEye(state);
  if (!self) p.money -= appraisalCost(state);

  const wrong = self ? !rng.chance(eyeAccuracy(state)) : false;
  const verdict: Standing = (item.real ?? true) === !wrong ? 'authentique' : 'copie';
  item.standing = verdict;
  if (verdict === 'copie') item.value = Math.max(1, Math.round(item.value * FAKE_VALUE));

  ctx.log('asset', `${item.name} — ${STANDING_LABEL[verdict].toLowerCase()}.`, verdict === 'copie' ? 'bad' : 'good');
  return {
    ok: true,
    title: verdict === 'copie' ? 'Une copie' : 'Authentifié',
    tone: verdict === 'copie' ? 'bad' : 'good',
    message: verdict === 'copie'
      ? `${item.name} n’en est pas un. ${self ? 'Tu l’as vu toi-même.' : 'L’expert est formel.'}`
      : `${item.name} est bien ce que tu croyais.${self ? ' Tu n’as eu besoin de personne.' : ''}`,
  };
}

/* ------------------------------------------------------------------ */
/* Les collections                                                     */
/* ------------------------------------------------------------------ */

/** Ce qu'on a d'un ensemble, et ce qu'il faudrait. */
export function setProgress(state: GameState, set: Sets): { have: number; needs: number } {
  const names = new Set<string>();
  for (const v of state.player.valuables as Owned[]) {
    if (standingOf(v) === 'copie') continue;
    const catalog = SHOP_ITEMS.find((i) => i.name === v.name);
    if (catalog?.category === set.category) names.add(v.name);
  }
  return { have: names.size, needs: set.needs };
}

export function setComplete(state: GameState, set: Sets): boolean {
  const { have, needs } = setProgress(state, set);
  return have >= needs;
}

/** Ce que les ensembles complets multiplient sur cet objet. */
export function setBonus(state: GameState, item: Owned): number {
  const catalog = SHOP_ITEMS.find((i) => i.name === item.name);
  if (!catalog) return 1;
  const set = SETS.find((s) => s.category === catalog.category);
  if (!set || !setComplete(state, set)) return 1;
  return set.bonus;
}

/* ------------------------------------------------------------------ */
/* Vendre                                                              */
/* ------------------------------------------------------------------ */

/** Ce qu'un objet vaut à la vente, en l'état où on le connaît. */
export function askingPrice(state: GameState, item: Owned): number {
  const known = standingOf(item);
  if (known === 'copie') return Math.max(1, Math.round(item.value));
  const doubt = known === 'douteux' ? DOUBT_DISCOUNT : 1;
  return Math.max(1, Math.round(item.value * doubt * setBonus(state, item)));
}

/** Les bornes de la réserve qu'on peut poser. */
export function reserveRange(state: GameState, item: Owned): { low: number; high: number } {
  const base = askingPrice(state, item);
  return {
    low: Math.round(base * RESERVE.floor),
    high: Math.round(base * RESERVE.ceiling),
  };
}

/**
 * La chance que la salle suive jusqu'à la réserve.
 *
 * Une réserve raisonnable part presque toujours ; au-delà de ce que l'objet
 * vaut, la salle se vide. Des papiers en règle intéressent davantage — c'est
 * ce qui rend l'expertise payante avant une vente, et pas seulement
 * rassurante.
 */
export function saleOdds(state: GameState, item: Owned, reserve: number): number {
  const base = askingPrice(state, item);
  const ratio = reserve / Math.max(1, base);
  const papers = standingOf(item) === 'authentique' ? PAPERS_BONUS : 0;
  return clamp(1.15 - (ratio / RESERVE.patience) * 0.95 + papers, 0.02, 0.97);
}

/**
 * Mettre en vente.
 *
 * La seule vente du jeu où l'on peut repartir avec son objet : les trois
 * « canaux » d'avant n'étaient que trois multiplicateurs, et la salle des
 * ventes valait exactement 1,0 — un nom, pas une vente.
 */
export function auction(ctx: Ctx, valuableId: string, reserve: number): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const item = p.valuables.find((v) => v.id === valuableId) as Owned | undefined;
  if (!item) return { ok: false, message: 'Objet introuvable.' };
  const { low, high } = reserveRange(state, item);
  const asked = Math.round(clamp(reserve, low, high));

  const fee = Math.round(asked * RESERVE.fee);
  p.money -= fee;

  if (!rng.chance(saleOdds(state, item, asked))) {
    ctx.log('asset', `${item.name} — personne n’a suivi.`, 'bad');
    return {
      ok: true, title: 'Invendu', tone: 'bad',
      message: `Le marteau ne tombe pas. Tu remportes ${item.name}, et la salle garde ${formatMoney(fee, p.countryId)}.`,
    };
  }

  // Ce qui dépasse la réserve : une salle qui s'échauffe paie au-delà.
  const heat = rng.float(1, 1 + Math.max(0, 1 - asked / Math.max(1, askingPrice(state, item))) * 0.6);
  const paid = Math.round(asked * heat);
  p.money += paid;
  p.valuables = p.valuables.filter((v) => v.id !== valuableId);

  const gain = paid - fee - item.purchasePrice;
  ctx.log('asset', `${item.name} adjugé ${formatMoney(paid, p.countryId)}.`, gain >= 0 ? 'good' : 'neutral');
  return {
    ok: true, title: 'Adjugé', tone: gain >= 0 ? 'good' : 'neutral',
    message: `${item.name} part à ${formatMoney(paid, p.countryId)}. `
      + `${gain >= 0 ? 'Bénéfice' : 'Perte'} : ${formatMoney(Math.abs(gain), p.countryId)}.`,
  };
}
