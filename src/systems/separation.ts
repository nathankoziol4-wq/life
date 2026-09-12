/**
 * Divorcer, et ce que ça décide.
 *
 * L'ancienne procédure tenait en un appel : elle partageait l'argent, tirait
 * une pension à pile ou face, et **comptait les enfants mineurs sans jamais
 * les déplacer**. Ils restaient chez le joueur quoi qu'il arrive. Le divorce
 * du jeu ne décidait donc rien de ce qu'un divorce décide.
 *
 * Ce fichier en fait une décision, et une seule règle la gouverne : **on ne
 * peut pas tout garder**. L'argent, les enfants et la paix se disputent la
 * même procédure. Se battre pour les enfants se paie sur le patrimoine ; se
 * battre pour le patrimoine se paie sur les enfants et laisse un ennemi.
 *
 * C'est la décision du jeu qui touche le plus de systèmes déjà construits :
 * qui garde les enfants décide qui les élève (`upbringing`), donc ce qu'ils
 * deviennent, donc qui l'on jouera après (`lineage`) ; la manière décide de
 * la rancune qui reste (`grudges`) ; et la pension va dans un sens ou dans
 * l'autre.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, peopleByRelation } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import {
  AT_STAKE, CARE_WEIGHT, COUNSELS, DRAG, KARMA_WEIGHT, KEEPS_ALL, LOSES_ALL,
  PER_CHILD, POSTURES, RECORD_PENALTY, getCounsel, getPosture,
  type Counsel, type Custody, type Posture,
} from '../data/separation.ts';
import { formatMoney, getCountry } from '../data/countries.ts';
import { attentionShare } from './upbringing.ts';
import { wrong } from './grudges.ts';
import { noteHistory } from './npc.ts';

export { COUNSELS, POSTURES, getCounsel, getPosture };
export type { Counsel, Custody, Posture };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/**
 * Les enfants que la procédure va concerner.
 *
 * Ceux qui vivent déjà chez un ex précédent n'en sont pas : leur garde a été
 * décidée, et un second divorce ne la rejoue pas.
 */
export function childrenAtStake(state: GameState): Person[] {
  return peopleByRelation(state, ['son', 'daughter'])
    .filter((c) => c.alive && c.age < 18 && !c.flags.livesWith);
}

/** Ce qu'un avocat coûte ici. */
export function counselCost(state: GameState, counsel: Counsel): number {
  const country = getCountry(state.player.countryId);
  return Math.round(counsel.cost * country.costIndex * state.world.inflation);
}

/** Les avocats qu'on peut se payer. */
export function affordableCounsels(state: GameState): Counsel[] {
  return COUNSELS.filter((c) => state.player.money >= counselCost(state, c));
}

/**
 * Ce que le joueur pèse dans la décision sur les enfants, de -1 à +1.
 *
 * Le poids le plus lourd va à ce qu'il a fait de leur enfance : le jeu tient
 * déjà ce compte, et c'est la seule mesure honnête de qui s'en est occupé. Un
 * parent absent peut l'emporter en payant un cabinet, mais il lui faut
 * vraiment payer — et lâcher ailleurs.
 */
export function custodyScore(
  state: GameState, spouse: Person, counsel: Counsel, posture: Posture,
): number {
  const kids = childrenAtStake(state);
  // Ce qu'on a mis dans leur enfance, rapporté à ce qu'il aurait fallu.
  const care = kids.length === 0
    ? 0.5
    : kids.reduce((sum, k) => sum + attentionShare(k), 0) / kids.length;

  // L'avocat de l'un contre celui de l'autre : le conjoint prend ce que sa
  // fortune lui permet, ce qui évite qu'acheter un cabinet gagne toujours.
  const theirs = spouse.wealth > counselCost(state, COUNSELS[2]) * 2 ? 1.34
    : spouse.wealth > counselCost(state, COUNSELS[1]) * 3 ? 1 : 0.72;
  const bar = (counsel.weight - theirs) * 0.6;

  const karma = ((state.player.stats.karma - 50) / 100) * KARMA_WEIGHT;
  const record = state.player.criminalRecord.convictions.length > 0 ? -RECORD_PENALTY : 0;

  return clamp((care - 0.5) * 2 * CARE_WEIGHT + bar + karma + record + posture.custody, -1, 1);
}

/** Ce que ce score donne comme garde. */
export function custodyFrom(score: number): Custody {
  if (score >= KEEPS_ALL) return 'moi';
  if (score <= LOSES_ALL) return 'lui';
  return 'partagée';
}

/** Ce que le joueur garderait de son patrimoine liquide. */
export function purseShare(
  state: GameState, spouse: Person, counsel: Counsel, posture: Posture,
): number {
  if (state.player.flags.prenup) return 1;
  const generosity = (spouse.personality.generosity / 100) * 0.15;
  const bar = (counsel.weight - 1) * 0.22;
  return clamp((1 - AT_STAKE) + generosity + bar + posture.purse, 0.12, 0.95);
}

/** Ce qu'on peut dire de la procédure avant de s'y engager. */
export function preview(
  state: GameState, spouse: Person, counselId: string, postureId: string,
): { custody: Custody; kept: number; cost: number; years: number } | null {
  const counsel = getCounsel(counselId);
  const posture = getPosture(postureId);
  if (!counsel || !posture) return null;
  return {
    custody: custodyFrom(custodyScore(state, spouse, counsel, posture)),
    kept: Math.round(Math.max(0, state.player.money) * purseShare(state, spouse, counsel, posture)),
    cost: counselCost(state, counsel),
    years: DRAG[posture.id as keyof typeof DRAG] ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Le divorce                                                          */
/* ------------------------------------------------------------------ */

/** Ce qui empêche d'engager la procédure, ou rien. */
export function divorceBlocker(state: GameState, spouse: Person, counselId: string): string | null {
  if (spouse.relation !== 'spouse') return 'Tu n’es pas marié à cette personne.';
  const counsel = getCounsel(counselId);
  if (!counsel) return 'Choisis qui te représente.';
  if (state.player.money < counselCost(state, counsel)) {
    return `Il te faudrait ${formatMoney(counselCost(state, counsel), state.player.countryId)}.`;
  }
  return null;
}

/**
 * Engager la procédure.
 *
 * Tout se décide ici, une fois : l'argent, les enfants, la pension et ce que
 * l'autre gardera de vous. C'est délibérément irréversible — un divorce
 * qu'on pourrait rejouer jusqu'à obtenir le bon résultat ne serait pas une
 * décision.
 */
export function separate(
  ctx: Ctx, spouseId: string, counselId: string, postureId: string,
): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const spouse = state.npcs[spouseId];
  if (!spouse) return { ok: false, message: 'Personne.' };
  const why = divorceBlocker(state, spouse, counselId);
  if (why) return { ok: false, title: 'Divorce', message: why };

  const counsel = getCounsel(counselId)!;
  const posture = getPosture(postureId) ?? POSTURES[0];
  const kids = childrenAtStake(state);
  const country = getCountry(p.countryId);

  p.chronicle.divorces += 1;
  p.money -= counselCost(state, counsel);

  // 1. L'argent.
  const kept = purseShare(state, spouse, counsel, posture);
  const lost = Math.round(Math.max(0, p.money) * (1 - kept));
  p.money -= lost;
  spouse.wealth += lost;

  // 2. Les enfants. C'est la partie que l'ancienne procédure comptait sans
  // jamais l'appliquer : ils restaient chez le joueur quoi qu'il arrive.
  const custody = custodyFrom(custodyScore(state, spouse, counsel, posture));
  const taken: Person[] = [];
  if (custody !== 'moi') {
    // En garde partagée, la moitié part ; en garde perdue, tous.
    const leaving = custody === 'lui' ? kids : kids.filter((_, i) => i % 2 === 1);
    for (const child of leaving) {
      child.flags.livesWith = spouse.id;
      noteHistory(state, child, `Vit chez ${spouse.firstName} après le divorce.`);
      taken.push(child);
    }
  }

  // 3. La pension, dans le sens que la garde impose.
  const owed = Math.round(taken.length * PER_CHILD * country.costIndex);
  const due = Math.round((kids.length - taken.length) * PER_CHILD * country.costIndex);
  p.flags.alimony = Number(p.flags.alimony ?? 0) + Math.max(0, owed - due);

  // 4. Ce qu'il en garde. La manière décide de ce qui reste entre vous.
  spouse.relation = 'ex';
  spouse.maritalStatus = 'divorced';
  spouse.partnerId = null;
  spouse.exPartnerIds.push(p.id);
  spouse.relationship = clampStat(spouse.relationship - 35);
  spouse.opinion = clampStat(spouse.opinion - 30 - posture.bitterness);
  wrong(ctx, spouse, 'rupture');

  p.stats.happiness = clampStat(p.stats.happiness - 20);
  p.stats.stress = clampStat(p.stats.stress + posture.stress);
  p.flags.prenup = false;
  noteHistory(state, spouse, `Divorce d’avec ${p.firstName}.`);

  const words: Record<Custody, string> = {
    moi: kids.length > 0 ? 'Les enfants restent avec toi.' : '',
    partagée: 'La garde est partagée.',
    lui: `Les enfants vivront chez ${spouse.firstName}.`,
  };
  ctx.log('love', `Tu as divorcé de ${fullName(spouse)}.${lost > 0 ? ` Partage : -${lost}.` : ''}`, 'bad');
  if (taken.length > 0) {
    ctx.log('family', `${taken.map((c) => c.firstName).join(', ')} ${taken.length > 1 ? 'vivent' : 'vit'} désormais chez ${spouse.firstName}.`, 'bad');
  }

  return {
    ok: true,
    title: 'Divorce prononcé',
    tone: 'bad',
    message: [
      posture.id === 'tout' ? 'Deux ans de procédure.' : 'La procédure est terminée.',
      lost > 0 ? `${formatMoney(lost, p.countryId)} versés à ${spouse.firstName}.`
        : 'Le contrat de mariage a protégé ton patrimoine.',
      words[custody],
      Number(p.flags.alimony) > 0 ? `Pension annuelle : ${formatMoney(Number(p.flags.alimony), p.countryId)}.` : '',
    ].filter(Boolean).join(' '),
  };
}

/* ------------------------------------------------------------------ */
/* Après                                                               */
/* ------------------------------------------------------------------ */

/** Cet enfant vit-il encore chez toi ? */
export function livesHere(child: Person): boolean {
  return !child.flags.livesWith;
}

/** Les enfants qu'on n'élève plus, parce qu'ils sont partis. */
export function awayChildren(state: GameState): Person[] {
  return peopleByRelation(state, ['son', 'daughter']).filter((c) => c.alive && !livesHere(c));
}
