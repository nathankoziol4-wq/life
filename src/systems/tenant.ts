/**
 * Parler à son locataire.
 *
 * **Ce que ce fichier ajoute.** Le locatif avait huit feuilles finies côté
 * bailleur — loyer, annonce, dossiers, impayés, vacance, travaux,
 * renouvellement, procédure de départ — et en face une personne à qui l'on
 * n'adressait jamais la parole. Le catalogue : « on décide pour lui, on ne
 * lui parle jamais ».
 *
 * **Le système savait déjà tout.** `advanceTenancy` calcule la tension — ce
 * que le loyer pèse sur les revenus du locataire — et s'en sert pour décider
 * s'il paie ; il tient une bonne volonté qui pèse sur la même chose. Ces deux
 * nombres décidaient de l'argent du joueur chaque année sans qu'il puisse ni
 * les voir ni les toucher.
 *
 * Deux verbes, donc, et rien d'autre : **parler**, qui donne l'information
 * qui manquait, et **arranger**, qui coûte maintenant pour rapporter plus
 * tard — un locataire qui reste est un logement qui n'est pas vide.
 *
 * L'arbitrage : le bailleur rentable et le bailleur décent ne sont pas la
 * même personne, et le jeu laisse découvrir ce que chacun coûte.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, OwnedProperty, Person } from '../engine/types.ts';
import {
  ARRANGEMENTS, CUT_GOODWILL, CUT_SHARE, SPREAD_GOODWILL, STRAIN_BANDS,
  TALK_GOODWILL, TALK_KEY, WIPE_GOODWILL, WORK_SHARE, getArrangement,
  type Arrangement,
} from '../data/tenant.ts';
import { tenantOf } from './tenancy.ts';
import { noteHistory } from './npc.ts';
import { shiftStats } from './stats.ts';

export { ARRANGEMENTS, getArrangement };
export type { Arrangement };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que le loyer pèse sur ses revenus.
 *
 * **La même formule que `advanceTenancy`**, et c'est le point : ce nombre
 * décidait déjà des impayés, il n'était simplement lisible nulle part. Le
 * recopier plutôt que le partager serait deux vérités pour un seul fait.
 */
export function strainOf(state: GameState, prop: OwnedProperty): number {
  const tenancy = prop.tenancy;
  const npc = tenantOf(state, prop);
  if (!tenancy || !npc) return 0;
  return tenancy.rent / Math.max(1, npc.salary * 0.33);
}

/** Ce que la tension veut dire, en mots. */
export function strainSays(state: GameState, prop: OwnedProperty): string {
  const strain = strainOf(state, prop);
  return (STRAIN_BANDS.find((b) => strain < b.under) ?? STRAIN_BANDS[STRAIN_BANDS.length - 1]!).says;
}

/** A-t-on déjà parlé cette année ? */
export function talkedThisYear(state: GameState, prop: OwnedProperty): boolean {
  return state.player.yearActions[`${TALK_KEY}_${prop.id}`] === 1;
}

/** Ce qu'on sait de lui, une fois qu'on lui a parlé. */
export function known(state: GameState, prop: OwnedProperty): boolean {
  return talkedThisYear(state, prop) || (prop.tenancy?.goodwill ?? 0) >= 70;
}

/** Pourquoi on ne peut rien faire ici, ou rien. */
export function tenantBlocker(state: GameState, prop: OwnedProperty | null): string | null {
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (!prop?.tenancy) return 'Personne n’habite là.';
  if (!tenantOf(state, prop)) return 'Il n’est plus là.';
  return null;
}

/* ------------------------------------------------------------------ */
/* Parler                                                              */
/* ------------------------------------------------------------------ */

/**
 * Passer le voir.
 *
 * Gratuit, et une fois par an. Ce qui se paie n'est pas de savoir, c'est ce
 * qu'on décide d'en faire.
 */
export function talkToTenant(ctx: Ctx, propertyId: string): ActionResult {
  const { state } = ctx;
  const prop = state.player.properties.find((x) => x.id === propertyId) ?? null;
  const why = tenantBlocker(state, prop);
  if (why) return { ok: false, message: why };
  if (talkedThisYear(state, prop!)) {
    return { ok: false, message: 'Tu es déjà passé cette année.' };
  }
  const npc = tenantOf(state, prop!)!;
  const tenancy = prop!.tenancy!;
  state.player.yearActions[`${TALK_KEY}_${prop!.id}`] = 1;
  tenancy.goodwill = clampStat(tenancy.goodwill + TALK_GOODWILL);
  noteHistory(state, npc, 'Son propriétaire est passé le voir.');

  const strain = strainSays(state, prop!);
  const owed = tenancy.arrears > 0
    ? ` Il te doit ${Math.round(tenancy.arrears).toLocaleString('fr-FR')} $, et il le sait.`
    : '';
  return {
    ok: true,
    title: npc.firstName,
    tone: 'neutral',
    message: `${strain}${owed}`,
  };
}

/* ------------------------------------------------------------------ */
/* Arranger                                                            */
/* ------------------------------------------------------------------ */

/** Pourquoi cet arrangement-là ne se propose pas, ou rien. */
export function arrangementBlocker(
  state: GameState, prop: OwnedProperty, arrangement: Arrangement,
): string | null {
  const why = tenantBlocker(state, prop);
  if (why) return why;
  const tenancy = prop.tenancy!;
  if (arrangement.id === 'etaler' && tenancy.arrears <= 0) return 'Il ne te doit rien.';
  if (arrangement.id === 'effacer' && tenancy.arrears <= 0) return 'Il ne te doit rien.';
  if (arrangement.id === 'baisser' && strainOf(state, prop) < 0.5) {
    return 'Le loyer ne lui pose déjà aucun problème.';
  }
  if (arrangement.id === 'travaux' && tenancy.rent <= 0) return 'Il n’y a pas de loyer à échanger.';
  return null;
}

/**
 * Ce qu'on lui accorde.
 *
 * Les quatre coûtent quelque chose au bailleur et rendent de la bonne
 * volonté, laquelle **pèse déjà sur les impayés** dans `advanceTenancy` : ce
 * n'est donc pas une jauge de politesse, c'est de l'argent différé.
 */
export function arrange(ctx: Ctx, propertyId: string, arrangementId: string): ActionResult {
  const { state } = ctx;
  const prop = state.player.properties.find((x) => x.id === propertyId) ?? null;
  const arrangement = getArrangement(arrangementId);
  if (!prop || !arrangement) return { ok: false, message: 'Rien de tel.' };
  const why = arrangementBlocker(state, prop, arrangement);
  if (why) return { ok: false, title: arrangement.label, message: why };

  const tenancy = prop.tenancy!;
  const npc = tenantOf(state, prop)!;
  let said: string;

  if (arrangement.id === 'etaler') {
    // On ne renonce à rien : on renonce au calendrier.
    tenancy.goodwill = clampStat(tenancy.goodwill + SPREAD_GOODWILL);
    said = `${npc.firstName} rendra ce qu’il doit, à son rythme.`;
  } else if (arrangement.id === 'baisser') {
    const before = tenancy.rent;
    tenancy.rent = Math.round(tenancy.rent * (1 - CUT_SHARE));
    prop.askingRent = tenancy.rent;
    tenancy.goodwill = clampStat(tenancy.goodwill + CUT_GOODWILL);
    said = `${(before - tenancy.rent).toLocaleString('fr-FR')} $ de moins par an, tant qu’il reste.`;
  } else if (arrangement.id === 'travaux') {
    /*
     * Il paie moins et entretient lui-même. Le drapeau est sur le bail : ce
     * n'est pas un geste ponctuel mais un régime, et `advanceTenant` le lit
     * chaque année.
     */
    tenancy.rent = Math.round(tenancy.rent * (1 - WORK_SHARE));
    prop.askingRent = tenancy.rent;
    tenancy.goodwill = clampStat(tenancy.goodwill + CUT_GOODWILL * 0.6);
    npc.flags.worksForRent = true;
    said = `Il entretiendra ${prop.name.toLowerCase()} lui-même.`;
  } else {
    const wiped = Math.round(tenancy.arrears);
    tenancy.arrears = 0;
    tenancy.goodwill = clampStat(tenancy.goodwill + WIPE_GOODWILL);
    said = `${wiped.toLocaleString('fr-FR')} $ effacés. Il ne s’y attendait pas.`;
  }

  npc.relationship = clampStat(npc.relationship + 6);
  npc.opinion = clampStat(npc.opinion + 8);
  noteHistory(state, npc, `Son propriétaire lui a fait un geste : ${arrangement.label.toLowerCase()}.`);
  shiftStats(state, { karma: 3 });
  ctx.log('asset', `${npc.firstName} — ${arrangement.label.toLowerCase()} sur ${prop.name}.`, 'good');
  return { ok: true, title: arrangement.label, tone: 'good', message: said };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un locataire qui entretient rend chaque année.
 *
 * Appelé par `properties.ts` après `advanceTenancy`, pour que l'état gagné
 * s'applique sur le logement tel qu'il est à la fin de l'année.
 */
export function advanceTenant(ctx: Ctx, prop: OwnedProperty): void {
  const { state } = ctx;
  const npc = tenantOf(state, prop);
  if (!prop.tenancy || !npc) return;
  if (npc.flags.worksForRent !== true) return;
  // Ce qu'il fait de ses mains rend au logement ce que le loyer ne paie plus.
  prop.condition = clampStat(prop.condition + workCare(prop));
}

/** Ce que l'entretien rend, selon le soin qu'il en prend. */
export function workCare(prop: OwnedProperty): number {
  const care = prop.tenancy?.care ?? 50;
  return clamp((care / 100) * 12, 2, 12);
}

/* ------------------------------------------------------------------ */
/* Ce qu'on en dit                                                     */
/* ------------------------------------------------------------------ */

/** Une ligne pour l'écran du bien. */
export function summary(state: GameState, prop: OwnedProperty): string {
  const npc = tenantOf(state, prop);
  if (!npc || !prop.tenancy) return '';
  if (!known(state, prop)) return `${npc.firstName} — tu ne sais rien de sa situation`;
  return `${npc.firstName} — ${strainSays(state, prop).toLowerCase()}`;
}

/** Le locataire, pour les écrans. */
export function tenantPerson(state: GameState, prop: OwnedProperty): Person | null {
  return tenantOf(state, prop);
}
