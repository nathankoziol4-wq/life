/**
 * Ceux qui travaillent pour toi : les trouver, les payer, les garder.
 *
 * Le raisonnement est dans `data/crew.ts`. Ici, quatre choses.
 *
 * **Lire.** Ce que chacun vaut, ce qu'il demandait, ce qu'on lui verse, et ce
 * qu'il en pense. Rien de cela n'existait : `Business.staff` est un entier.
 *
 * **Recruter.** Trois candidats par an, tirés sur une même échelle : plus
 * quelqu'un est bon, plus il demande. On voit les deux avant de choisir.
 *
 * **Tenir.** Augmenter, ou se séparer de quelqu'un. Les deux se paient — la
 * seconde sur le moral de ceux qui restent, et plus longtemps.
 *
 * **L'année.** Le moral suit ce qu'on verse et la santé de la maison ;
 * l'ancienneté rend meilleur ; ceux qui n'y croient plus s'en vont.
 *
 * **Ce que ça change ailleurs.** `staff` reste le nombre de personnes, et tout
 * ce qui le lisait continue de fonctionner. Mais la capacité et la qualité
 * lisent désormais la **compétence** de l'équipe et non son seul effectif, et
 * la masse salariale est la somme des salaires réels — voir `venture.ts`.
 *
 * `advanceCrew` ne tire **rien** de `ctx.rng` : il tourne chaque année pour
 * chaque entreprise, et la séquence est partagée par tout le moteur. Les
 * départs passent par le hachage déterministe, comme ailleurs.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type { ActionResult, Business, GameState, Hire, Person } from '../engine/types.ts';
import {
  DISTRESS_TOLL, HIRE_KEY, LAYOFF_CHILL, LEARNED_CAP, LEARNS, MORALE_BANDS,
  MORALE_START, OVERPAID, QUIT_ODDS, RAISE_LIFT, RESTLESS, SEVERANCE,
  SHORTLIST, SKILL_BANDS, THRIVING_LIFT, UNDERPAID, WAGE_CEILING, WAGE_FLOOR,
  WORTH_FLOOR, WORTH_RANGE,
} from '../data/crew.ts';
import { createPerson } from './npc.ts';

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

export function crewOf(business: Business): Hire[] {
  return business.crew ?? [];
}

/** Ce que quelqu'un vaut aujourd'hui, ancienneté comprise. */
export function skillOf(hire: Hire): number {
  return clampStat(hire.competence + hire.learned);
}

/**
 * Ce qu'une personne pèse en production, en part d'un salarié moyen.
 *
 * C'est toute la différence avec un effectif : quelqu'un d'excellent compte
 * pour une personne et demie, quelqu'un de faible pour un peu plus d'une
 * demie. Deux très bons peuvent donc battre quatre moyens — et coûter moins,
 * si l'on a su négocier.
 */
export function worthOf(hire: Hire): number {
  return WORTH_FLOOR + (skillOf(hire) / 100) * WORTH_RANGE;
}

/**
 * Ce que l'équipe vaut en tout, en équivalents-salariés.
 *
 * Quand personne n'est nommé — une entreprise d'avant ce système, ou un
 * effectif hérité — on rend simplement l'effectif : le jeu continue de
 * fonctionner exactement comme avant.
 */
export function crewWorth(business: Business): number {
  const crew = crewOf(business);
  if (crew.length === 0) return business.staff;
  return crew.reduce((sum, hire) => sum + worthOf(hire), 0);
}

/** La compétence moyenne de l'équipe, ou `null` si personne n'est nommé. */
export function crewSkill(business: Business): number | null {
  const crew = crewOf(business);
  if (crew.length === 0) return null;
  return crew.reduce((sum, hire) => sum + skillOf(hire), 0) / crew.length;
}

/** Ce que l'équipe coûte réellement en salaires. */
export function payroll(business: Business, fallbackWage: number): number {
  const crew = crewOf(business);
  if (crew.length === 0) return business.staff * fallbackWage;
  return crew.reduce((sum, hire) => sum + hire.wage, 0);
}

/** Le moral moyen, ou `null` si personne n'est nommé. */
export function crewMorale(business: Business): number | null {
  const crew = crewOf(business);
  if (crew.length === 0) return null;
  return crew.reduce((sum, hire) => sum + hire.morale, 0) / crew.length;
}

function bandOf(bands: { under: number; says: string }[], value: number): string {
  return bands.find((b) => value < b.under)?.says ?? bands[bands.length - 1].says;
}

export function moraleSays(morale: number): string {
  return bandOf(MORALE_BANDS, morale);
}

export function skillSays(skill: number): string {
  return bandOf(SKILL_BANDS, skill);
}

/** Ce qu'on verse par rapport à ce qu'il demandait, en part. */
export function paidShare(hire: Hire): number {
  return hire.asking > 0 ? hire.wage / hire.asking : 1;
}

/* ------------------------------------------------------------------ */
/* Recruter                                                            */
/* ------------------------------------------------------------------ */

export function hireBlocker(state: GameState, business: Business): string | null {
  const p = state.player;
  if (p.prison) return 'Pas depuis une cellule.';
  if (Number(p.yearActions[`${HIRE_KEY}_${business.id}`] ?? 0) >= 1) {
    return 'Tu as déjà reçu des candidats cette année.';
  }
  return null;
}

/**
 * Faire venir des candidats.
 *
 * Le tirage passe par `ctx.rng` : c'est une action du joueur, pas un pas
 * d'année. Chaque candidat est une vraie personne, comme un collègue l'est
 * déjà quand on est salarié.
 */
export function openShortlist(
  ctx: Ctx,
  business: Business,
  referenceWage: number,
): ActionResult {
  const { state, rng } = ctx;
  const why = hireBlocker(state, business);
  if (why) return { ok: false, title: 'Recruter', message: why };
  state.player.yearActions[`${HIRE_KEY}_${business.id}`] = 1;

  const list: Hire[] = [];
  for (let i = 0; i < SHORTLIST; i += 1) {
    const npc = createPerson(ctx, { relation: 'coworker', age: rng.int(21, 58) });
    const competence = clampStat(rng.int(18, 94));
    // Ce qu'il demande suit ce qu'il vaut, et pas au hasard : c'est la seule
    // façon que le choix soit un arbitrage plutôt qu'une loterie.
    const asking = Math.round(
      referenceWage * (WAGE_FLOOR + (competence / 100) * (WAGE_CEILING - WAGE_FLOOR)),
    );
    npc.flags.candidateFor = business.id;
    list.push({
      personId: npc.id,
      competence,
      asking,
      wage: asking,
      morale: MORALE_START,
      since: state.year,
      learned: 0,
    });
  }
  business.shortlist = list;
  return {
    ok: true,
    title: 'Recruter',
    tone: 'neutral',
    message: `${list.length} personnes se présentent. Ce qu’elles valent et ce `
      + 'qu’elles demandent vont ensemble — c’est à toi de dire où tu mets ton argent.',
  };
}

export function offerBlocker(
  state: GameState,
  business: Business,
  hire: Hire,
  wage: number,
): string | null {
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (wage <= 0) return 'Il faut proposer quelque chose.';
  // Personne n'accepte moins des deux tiers de ce qu'il demandait : en dessous,
  // ce n'est plus une négociation, c'est un refus déguisé.
  if (wage < hire.asking * 0.66) return 'Il ne descendra pas jusque-là.';
  if (business.cash < wage * 0.3) return 'L’entreprise n’a pas de quoi l’accueillir.';
  return null;
}

/**
 * Embaucher quelqu'un de la liste, au salaire qu'on propose.
 *
 * Payer en dessous de la prétention est possible et se paie : le moral part
 * plus bas, et l'écart se rappelle chaque année.
 */
export function offer(
  ctx: Ctx,
  business: Business,
  personId: string,
  wage: number,
): ActionResult {
  const { state } = ctx;
  const list = business.shortlist ?? [];
  const found = list.find((h) => h.personId === personId);
  const who = found ? person(state, personId) : null;
  if (!found || !who) return { ok: false, message: 'Cette personne n’est plus là.' };
  const why = offerBlocker(state, business, found, wage);
  if (why) return { ok: false, title: who.firstName, message: why };

  const share = wage / found.asking;
  const hire: Hire = {
    ...found,
    wage: Math.round(wage),
    // Ce qu'on lui verse décide de son point de départ, pas seulement de son
    // coût : un salarié pris au rabais commence déjà à moitié dehors.
    morale: clampStat(MORALE_START + (share - 1) * (share < 1 ? UNDERPAID : OVERPAID) * 2),
    since: state.year,
    learned: 0,
  };
  business.crew = [...crewOf(business), hire];
  business.staff = business.crew.length;
  business.shortlist = list.filter((h) => h.personId !== personId);
  business.cash -= Math.round(wage * 0.3);
  who.flags.worksFor = business.id;

  return {
    ok: true,
    title: who.firstName,
    tone: 'good',
    message: share < 0.95
      ? `${fullName(who)} accepte, à ${Math.round(wage)} au lieu des ${found.asking} qu’il demandait. Il s’en souviendra.`
      : `${fullName(who)} entre dans la maison. ${skillSays(found.competence)}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Tenir                                                               */
/* ------------------------------------------------------------------ */

export function raiseCost(hire: Hire): number {
  // Une augmentation qui compte : de quoi combler l'écart, et un peu au-delà.
  return Math.max(Math.round(hire.wage * 0.12), Math.round(hire.asking - hire.wage));
}

export function raiseBlocker(state: GameState, business: Business, hire: Hire): string | null {
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (business.cash < raiseCost(hire)) return 'L’entreprise n’en a pas les moyens.';
  if (Number(state.player.yearActions[`raise_${hire.personId}`] ?? 0) >= 1) {
    return 'Tu l’as déjà augmenté cette année.';
  }
  return null;
}

export function raise(ctx: Ctx, business: Business, personId: string): ActionResult {
  const { state } = ctx;
  const hire = crewOf(business).find((h) => h.personId === personId);
  const who = hire ? person(state, personId) : null;
  if (!hire || !who) return { ok: false, message: 'Il ne travaille plus ici.' };
  const why = raiseBlocker(state, business, hire);
  if (why) return { ok: false, title: who.firstName, message: why };

  const step = raiseCost(hire);
  state.player.yearActions[`raise_${personId}`] = 1;
  hire.wage += step;
  // Ce que ça rend dépend de ce qu'il manquait : combler un vrai écart change
  // tout, ajouter au-dessus du marché ne rend presque rien.
  const gap = clamp(1 - paidShare(hire), 0, 1);
  hire.morale = clampStat(hire.morale + RAISE_LIFT * (0.3 + gap));
  return {
    ok: true,
    title: who.firstName,
    tone: 'good',
    message: `${step} de plus par an. ${moraleSays(hire.morale)}`,
  };
}

export function letGo(ctx: Ctx, business: Business, personId: string): ActionResult {
  const { state } = ctx;
  const hire = crewOf(business).find((h) => h.personId === personId);
  const who = hire ? person(state, personId) : null;
  if (!hire || !who) return { ok: false, message: 'Il ne travaille plus ici.' };
  if (state.player.prison) return { ok: false, title: who.firstName, message: 'Pas depuis une cellule.' };

  const severance = Math.round(hire.wage * SEVERANCE);
  business.cash -= severance;
  business.crew = crewOf(business).filter((h) => h.personId !== personId);
  business.staff = business.crew.length;
  delete who.flags.worksFor;
  // Ce que ça coûte vraiment se voit chez ceux qui restent, et dure plus
  // longtemps que la ligne d'indemnités.
  for (const rest of crewOf(business)) {
    rest.morale = clampStat(rest.morale - LAYOFF_CHILL);
  }
  ctx.log('work', `${fullName(who)} ne travaille plus pour toi.`, 'bad');
  return {
    ok: true,
    title: who.firstName,
    tone: 'bad',
    message: `${severance} d’indemnités. Les autres l’ont vu partir.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/** Les gens de l'équipe, avec la personne derrière. */
export function crewPeople(state: GameState, business: Business):
{ hire: Hire; who: Person }[] {
  const out: { hire: Hire; who: Person }[] = [];
  for (const hire of crewOf(business)) {
    const who = person(state, hire.personId);
    if (who) out.push({ hire, who });
  }
  return out;
}

/**
 * Une année de plus dans la maison.
 *
 * L'ordre compte : le moral se solde d'abord sur ce que l'année a montré, puis
 * l'ancienneté paie, puis ceux qui n'y croient plus s'en vont. Quelqu'un qui
 * part cette année n'a pas à apprendre quelque chose d'abord.
 */
export function advanceCrew(ctx: Ctx, business: Business): void {
  const { state } = ctx;
  const crew = crewOf(business);
  if (crew.length === 0) return;

  const struggling = business.distress > 0;
  const thriving = !struggling && business.renown > 55;

  for (const hire of [...crew]) {
    // Ce qu'on lui verse, rapporté à ce qu'il demandait : l'écart ne
    // s'oublie pas, il se rappelle tous les ans.
    const share = paidShare(hire);
    const pay = share < 1
      ? -(1 - share) * UNDERPAID
      : Math.min(1, share - 1) * OVERPAID;
    const house = struggling ? -DISTRESS_TOLL : thriving ? THRIVING_LIFT : 0;
    hire.morale = clampStat(hire.morale + pay + house);

    // L'ancienneté paie, et pas indéfiniment.
    if (hire.learned < LEARNED_CAP) {
      hire.learned = Math.min(LEARNED_CAP, hire.learned + LEARNS);
    }

    // Ceux qui n'y croient plus s'en vont, et emportent ce qu'ils valaient.
    if (hire.morale < RESTLESS) {
      const odds = QUIT_ODDS * (1 - hire.morale / RESTLESS);
      const salt = saltOf(hire.personId);
      if (hash(state.year * 31 + business.staff, salt) < odds) {
        business.crew = crewOf(business).filter((h) => h.personId !== hire.personId);
        business.staff = business.crew.length;
        const who = person(state, hire.personId);
        if (who) delete who.flags.worksFor;
        ctx.log(
          'work',
          `${who ? fullName(who) : 'Quelqu’un'} a démissionné. ${
            share < 0.9 ? 'Tu ne l’avais jamais payé ce qu’il demandait.' : 'Il ne s’expliquera pas.'
          }`,
          'bad',
        );
      }
    }
  }

  business.staff = crewOf(business).length > 0 ? crewOf(business).length : business.staff;
}
