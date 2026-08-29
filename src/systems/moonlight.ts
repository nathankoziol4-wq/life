/**
 * Le deuxième poste.
 *
 * **Ce qui manquait, et ce qui manquait vraiment.** Le catalogue disait « un
 * seul contrat de travail à la fois », feuille `Carrière/Cumul`, impact 3. En
 * inspectant, on trouve pire que ce qui était écrit : `careers.ts#advanceCareer`
 * ne sait **rien** de ce qu'on fait à côté. On pouvait tenir un plein temps,
 * une activité indépendante et une entreprise en même temps sans que la
 * carrière ne s'en aperçoive jamais. `venture.ts#timeBudget` comptait déjà les
 * trois pour borner ce qu'on produit à son compte — mais personne ne lisait ce
 * compte du côté du poste principal.
 *
 * Ce fichier ajoute donc deux choses, et la seconde était le vrai trou.
 *
 * **1. Des postes de complément.** Pas une seconde carrière : des heures, un
 * taux, et ce que ça coûte. Ni échelle, ni promotion, ni collègues — c'est ce
 * qui les distingue d'un métier, et c'est pourquoi ils n'ont pas besoin d'un
 * second `JobState`. Six postes qui s'arbitrent sur trois côtés qui ne vont
 * jamais ensemble : ce que l'heure paie, ce qu'elle coûte, et à quel point cela
 * reste discret. Le mieux payé est le plus visible ou le plus dur.
 *
 * **2. Le temps pris ailleurs se paie sur le poste principal.** La performance
 * décide des promotions et des licenciements ; elle baisse maintenant quand on
 * se disperse — et cela vaut pour le deuxième poste, pour ce qu'on fait à son
 * compte et pour l'entreprise qu'on dirige, à hauteur de ce que chacun prend.
 * Un patron absent de sa maison ne perd rien : il n'y est pas.
 *
 * **Et l'on peut l'apprendre.** L'employeur principal finit par savoir, et
 * d'autant plus vite que le poste se voit. Ce n'est pas de la dissimulation :
 * personne ne croise personne à trois heures du matin, tout le monde vous voit
 * en salle un samedi soir. Ce qui suit est un avertissement au dossier — que
 * `dismissal.ts` lit déjà.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, Moonlight } from '../engine/types.ts';
import {
  CAUGHT_STING, CROWDED, CROWDED_UNDER, HOURS_CEILING, HUSH, SHIFTS, WEEKS,
  getShift,
} from '../data/moonlight.ts';
import { getCountry } from '../data/countries.ts';
import { isInSchool } from './education.ts';

export { SHIFTS };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function moonlightOf(state: GameState): Moonlight | null {
  return state.player.moonlight ?? null;
}

/** Ce que l'heure paie ici, dans la monnaie du pays et de l'année. */
export function hourlyRate(state: GameState, shiftId: string): number {
  const shift = getShift(shiftId);
  if (!shift) return 0;
  const country = getCountry(state.player.countryId);
  return Math.round(shift.rate * country.salaryIndex * state.world.inflation);
}

/** Ce que le deuxième poste rapporterait sur l'année, aux heures choisies. */
export function yearlyPay(state: GameState, shiftId?: string, hours?: number): number {
  const m = moonlightOf(state);
  const id = shiftId ?? m?.jobId;
  const h = hours ?? m?.hours ?? 0;
  if (!id) return 0;
  return Math.round(hourlyRate(state, id) * h * WEEKS);
}

/**
 * À quel point on est pris ailleurs, 0 = rien du tout.
 *
 * Lu par `careers.ts` et par l'écran. **Le poste principal n'y entre pas** :
 * c'est ce qu'on lui prend qu'on mesure, et un plein temps seul doit valoir
 * exactement zéro — sans quoi tout le jeu serait pénalisé pour avoir un emploi,
 * ce qui est le contraire de ce qu'on veut dire.
 */
export function crowding(state: GameState): number {
  const p = state.player;
  let load = 0;
  const m = moonlightOf(state);
  if (m) load += m.hours / 40;
  if (p.freelance) load += 0.34;
  if (p.business) {
    // Le poids que `venture.ts` donne déjà à la présence du patron : un patron
    // absent ne prend pas de temps, et n'en perd donc pas non plus.
    load += p.business.involvement === 'total' ? 0.9
      : p.business.involvement === 'présent' ? 0.55 : 0.06;
  }
  if (isInSchool(state)) load += p.age < 18 ? 0.3 : 0.42;
  return clamp(load, 0, 1.8);
}

/**
 * Ce que la dispersion retire à la performance du poste principal, par an.
 *
 * Nul tant qu'on reste sous le seuil : quelques heures le samedi ne ruinent
 * pas une carrière. Au-delà, cela monte vite, parce que c'est là qu'est la
 * décision — combien peut-on prendre sans que cela se voie au travail.
 */
export function careerDrag(state: GameState): number {
  const over = crowding(state) - CROWDED_UNDER;
  if (over <= 0) return 0;
  return CROWDED * over;
}

/** Les heures cumulées sur les deux postes. */
export function totalHours(state: GameState): number {
  return (state.player.job?.hours ?? 0) + (moonlightOf(state)?.hours ?? 0);
}

/** La compétence qu'entretient le deuxième poste, et à quelle hauteur. */
export function shiftSkill(state: GameState): { id: string; hours: number } | null {
  const m = moonlightOf(state);
  const shift = getShift(m?.jobId);
  if (!m || !shift?.skillId) return null;
  return { id: shift.skillId, hours: m.hours };
}

/* ------------------------------------------------------------------ */
/* Décider                                                             */
/* ------------------------------------------------------------------ */

export function takeBlocker(state: GameState, shiftId: string): string | null {
  const p = state.player;
  const shift = getShift(shiftId);
  if (!shift) return 'Cela ne se prend pas.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.age < 16) return 'Il faut avoir seize ans.';
  if (!p.job) return 'Un deuxième poste suppose qu’il y en ait un premier.';
  if (moonlightOf(state)) return 'Tu en as déjà un. Un à la fois.';
  if ((p.job.hours ?? 0) + shift.min > HOURS_CEILING) {
    return 'Tu n’as pas les heures. Passe à temps partiel d’abord.';
  }
  return null;
}

export function takeShift(ctx: Ctx, shiftId: string): ActionResult {
  const { state } = ctx;
  const why = takeBlocker(state, shiftId);
  if (why) return { ok: false, message: why };
  const shift = getShift(shiftId)!;
  const room = HOURS_CEILING - (state.player.job?.hours ?? 0);
  const hours = Math.min(shift.max, room, Math.max(shift.min, shift.min + 4));
  state.player.moonlight = {
    jobId: shiftId,
    hours,
    since: state.year,
    earned: 0,
    known: false,
  };
  ctx.log('work', `Tu prends ${shift.label.toLowerCase()} à côté. ${shift.line}`, 'neutral');
  return {
    ok: true,
    title: shift.label,
    message: `${hours} h par semaine, ${hourlyRate(state, shiftId)} de l’heure. ${shift.line}`,
  };
}

export function setHours(ctx: Ctx, hours: number): ActionResult {
  const { state } = ctx;
  const m = moonlightOf(state);
  const shift = getShift(m?.jobId);
  if (!m || !shift) return { ok: false, message: 'Tu n’as pas de deuxième poste.' };
  const wanted = Math.round(clamp(hours, shift.min, shift.max));
  const room = HOURS_CEILING - (state.player.job?.hours ?? 0);
  if (wanted > room) {
    return { ok: false, message: `Au-delà de ${HOURS_CEILING} heures cumulées, il n’y a plus d’heures.` };
  }
  m.hours = wanted;
  return { ok: true, message: `${wanted} h par semaine, soit ${yearlyPay(state)} sur l’année.` };
}

export function leaveShift(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const m = moonlightOf(state);
  const shift = getShift(m?.jobId);
  if (!m || !shift) return { ok: false, message: 'Tu n’as pas de deuxième poste.' };
  const years = state.year - m.since;
  state.player.moonlight = null;
  ctx.log('work', `Tu arrêtes ${shift.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true,
    message: years > 0
      ? `${years} an${years > 1 ? 's' : ''} là-dessus, ${m.earned} au total. Tu récupères tes soirées.`
      : 'Tu n’auras pas fait long feu. Tu récupères tes soirées.',
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * L'année du deuxième poste : ce qu'il rapporte, ce qu'il coûte, et ce qu'il
 * finit par se savoir.
 *
 * Appelée avant `advanceCareer`, pour que ce qui vient d'être appris pèse sur
 * l'année du poste principal et non sur la suivante.
 */
export function advanceMoonlight(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const m = moonlightOf(state);
  const shift = getShift(m?.jobId);
  if (!m || !shift) return;

  /*
   * Et si le poste principal a repris des heures entre-temps, le deuxième
   * rétrécit d'autant. Trouvé par le test : on pouvait prendre les nuits à
   * temps partiel puis repasser à plein temps, et se retrouver à soixante-dix
   * heures cumulées pour un plafond de soixante-huit — le plafond n'était
   * vérifié qu'au moment de décider, jamais ensuite.
   */
  const room = HOURS_CEILING - (p.job?.hours ?? 0);
  if (p.job && m.hours > room) {
    if (room < shift.min) {
      p.moonlight = null;
      ctx.log('work', `${shift.label} : tu n’as plus les heures. Tu arrêtes.`, 'neutral');
      return;
    }
    m.hours = room;
    ctx.log('work', `${shift.label} : tu réduis à ${room} h, tes horaires ont changé.`, 'neutral');
  }

  // On ne tient pas un deuxième poste depuis une cellule, ni sans le premier.
  if (p.prison || !p.job) {
    p.moonlight = null;
    ctx.log('work', `${shift.label} : cela s’arrête là.`, 'neutral');
    return;
  }

  const pay = yearlyPay(state);
  p.money += pay;
  p.lifetimeEarnings += pay;
  m.earned += pay;

  // Ce que les heures prennent au corps. Le coût est par heure hebdomadaire :
  // huit heures le samedi ne sont pas vingt-quatre heures de nuit.
  const worn = shift.toll * m.hours;
  p.stats.health = clampStat(p.stats.health - worn * 0.14);
  p.stats.stress = clampStat(p.stats.stress + worn * 0.35);
  p.stats.happiness = clampStat(p.stats.happiness - worn * 0.12);

  // Et ce qui finit par se savoir. Plus le poste se voit, plus c'est court.
  if (!m.known) {
    const odds = clamp((1 - shift.quiet) / 1.6 + m.hours / 260, 0.01, 0.75) * (1 / (HUSH / 22));
    if (rng.chance(odds)) {
      m.known = true;
      p.job.warnings += 1;
      p.job.satisfaction = clampStat(p.job.satisfaction - CAUGHT_STING);
      ctx.log(
        'work',
        `${p.job.employer} a appris que tu travailles ailleurs. C’est au dossier.`,
        'bad',
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Ce qui se lit                                                       */
/* ------------------------------------------------------------------ */

export function summary(state: GameState): string {
  const m = moonlightOf(state);
  const shift = getShift(m?.jobId);
  if (!m || !shift) return 'Rien à côté du poste';
  return `${shift.label} · ${m.hours} h · ${yearlyPay(state)} par an${m.known ? ' · il le sait' : ''}`;
}

/** Ce que la dispersion fait, dit en français. */
export function strainLine(state: GameState): string {
  const drag = careerDrag(state);
  if (drag <= 0) return 'Ce que tu fais à côté ne se voit pas encore au travail.';
  if (drag < CROWDED * 0.35) return 'Tu tires un peu sur la corde. Cela commence à se voir au travail.';
  if (drag < CROWDED * 0.8) return 'Tu es à deux endroits à la fois, et le poste principal en paie le prix.';
  return 'Tu ne tiens plus rien correctement. La prochaine évaluation le dira.';
}
