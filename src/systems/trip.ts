/**
 * Partir avec quelqu'un : qui, où, comment, et ce qui arrive là-bas.
 *
 * Le raisonnement est dans `data/trip.ts`. Ici, trois choses.
 *
 * **Lire l'accord.** À quel point ce voyage-là, avec cette personne-là, a des
 * chances de bien se passer. C'est la seule lecture du système et elle ne se
 * déduit pas de la relation : on peut très bien aimer quelqu'un et voyager
 * mal avec lui.
 *
 * **Partir.** Le prix se multiplie par le nombre de personnes et par la
 * classe ; la classe achète du confort et réduit les incidents. Au retour, la
 * relation a bougé — **dans les deux sens**.
 *
 * **Ce qui arrive là-bas.** Une situation, deux façons de la prendre, et le
 * même geste ne vaut pas la même chose selon le caractère de celui qui est en
 * face. C'est ce dont la relation se souvient.
 *
 * **Ce que ça ne fait pas.** Le voyage solitaire n'est pas touché :
 * `activities.ts#takeVacation` continue d'exister et de faire exactement ce
 * qu'il faisait. Partir à deux est une autre action, avec un autre prix et
 * d'autres suites.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import {
  ACCORD_BANDS, BEST_GAIN, BOND_WEIGHT, CLASSES, FIT_WEIGHT, MEAN_WEIGHT,
  MOMENTS, READS_BADLY, READS_WELL, SHARED_JOY, SOURS_UNDER, WORST_LOSS,
  WORST_WEIGHT, CONTRAST, GESTURE_WEIGHT, demandOf, getTripClass,
} from '../data/trip.ts';
import { DESTINATIONS } from '../data/activities.ts';
import { localPrice } from './activities.ts';
import { shiftStats } from './stats.ts';

export { CLASSES, MOMENTS, getTripClass };

/** Le compteur d'année : un voyage à deux par an, comme le voyage solitaire. */
export const TRIP_KEY = 'tripTogether';

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
/* L'accord                                                            */
/* ------------------------------------------------------------------ */

/**
 * À quel point le caractère de quelqu'un convient à cette destination.
 *
 * Trois exigences, trois traits — et chacune peut manquer seule. Quelqu'un de
 * très chaleureux mais irascible tiendra mal trois semaines de route ; quelqu'un
 * de discipliné et peu sociable sera parfait à la montagne et perdu en ville.
 */
export function fitFor(who: Person, destinationId: string): number {
  const asks = demandOf(destinationId);
  const c = who.personality;
  // La patience se lit à l'envers du tempérament, et la discipline aide.
  const endure = (100 - c.temper) * 0.65 + c.discipline * 0.35;
  const mingle = c.sociability * 0.7 + c.warmth * 0.3;
  const still = c.discipline * 0.4 + (100 - c.ambition) * 0.6;

  /*
   * **Ce qui manque compte plus que la moyenne de ce qui va.**
   *
   * Première version : une moyenne pondérée des trois exigences. Trois traits
   * qui tournent autour de cinquante, moyennés, donnent cinquante — mesuré,
   * **96 % des paires tombaient entre 0,30 et 0,62** et aucune n'atteignait la
   * plus haute des cinq appréciations. La lecture disait la même chose de tout
   * le monde, ce qui revient à ne rien dire.
   *
   * Un voyage ne se gâche pas en moyenne : il se gâche par la seule chose qui
   * ne va pas. Trois semaines de route avec quelqu'un qui ne supporte pas la
   * route sont pénibles même s'il est charmant par ailleurs. On garde donc les
   * deux — la moyenne pour le fond, et surtout **l'exigence la moins bien
   * couverte** — et l'écart se rouvre.
   */
  const total = asks.endure + asks.mingle + asks.still;
  if (total <= 0) return 0.5;
  const mean = (asks.endure * endure + asks.mingle * mingle + asks.still * still) / total / 100;

  // La moins bien couverte, pondérée par ce que la destination en réclame :
  // une exigence que le séjour ne demande pas ne peut pas le gâcher.
  const worst = Math.min(
    1 - asks.endure * (1 - endure / 100),
    1 - asks.mingle * (1 - mingle / 100),
    1 - asks.still * (1 - still / 100),
  );
  const raw = mean * MEAN_WEIGHT + worst * WORST_WEIGHT;
  // Un dernier étirement autour du milieu. Les traits de caractère se pressent
  // autour de cinquante et les combiner les y ramène ; sans ce contraste, les
  // deux appréciations extrêmes des cinq ne se rencontraient jamais.
  return clamp(0.5 + (raw - 0.5) * CONTRAST, 0, 1);
}

/**
 * L'accord : ce que ce voyage-là, avec cette personne-là, a de chances de
 * donner.
 *
 * La relation compte pour un tiers seulement. C'est délibéré : si elle
 * décidait de tout, emmener quelqu'un serait un multiplicateur de ce qu'on a
 * déjà, et il n'y aurait rien à choisir.
 */
export function accordWith(who: Person, destinationId: string): number {
  const bond = clamp(who.relationship, 0, 100) / 100;
  return clamp(bond * BOND_WEIGHT + fitFor(who, destinationId) * FIT_WEIGHT, 0, 1);
}

export function accordSays(accord: number): string {
  return ACCORD_BANDS.find((b) => accord < b.under)?.says
    ?? ACCORD_BANDS[ACCORD_BANDS.length - 1].says;
}

/** Ceux qu'on peut emmener : tous les vivants qu'on connaît vraiment. */
export function companions(state: GameState): Person[] {
  return Object.values(state.npcs)
    .filter((n) => n.alive && n.age >= 8 && n.relationship >= 15)
    .sort((a, b) => b.relationship - a.relationship)
    .slice(0, 12);
}

/* ------------------------------------------------------------------ */
/* Le prix                                                             */
/* ------------------------------------------------------------------ */

/** Ce que le voyage coûte, personnes et classe comprises. */
export function priceOf(
  state: GameState,
  destinationId: string,
  classId: string,
  heads = 2,
): number {
  const dest = DESTINATIONS.find((d) => d.id === destinationId);
  const cls = getTripClass(classId);
  if (!dest || !cls) return 0;
  return Math.round(localPrice(state, dest.cost) * cls.price * heads);
}

export function tripBlocker(
  state: GameState,
  personId: string,
  destinationId: string,
  classId: string,
): string | null {
  const p = state.player;
  const who = person(state, personId);
  if (!who || !who.alive) return 'Cette personne n’est pas là.';
  if (p.prison) return 'Les vacances attendront.';
  if (Number(p.yearActions[TRIP_KEY] ?? 0) >= 1) return 'Tu es déjà parti avec quelqu’un cette année.';
  if (Number(p.yearActions.vacation ?? 0) >= 1) return 'Tu es déjà parti en vacances cette année.';
  if (!DESTINATIONS.some((d) => d.id === destinationId)) return 'Destination inconnue.';
  if (!getTripClass(classId)) return 'Il faut choisir comment tu pars.';
  if (p.money < priceOf(state, destinationId, classId)) {
    return `Ce voyage coûte ${priceOf(state, destinationId, classId)}.`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Partir                                                              */
/* ------------------------------------------------------------------ */

/**
 * La situation qui arrivera là-bas.
 *
 * Choisie par hachage sur la destination, l'année et la personne : deux
 * voyages identiques donnent la même situation, et `partir` ne consomme donc
 * pas de tirage pour cela. L'incident de parcours, lui, continue de passer par
 * `ctx.rng` — c'est une action du joueur, comme le voyage solitaire.
 */
export function momentFor(state: GameState, personId: string, destinationId: string) {
  const salt = saltOf(`${personId}:${destinationId}`);
  return MOMENTS[Math.floor(hash(state.year, salt) * MOMENTS.length)] ?? MOMENTS[0];
}

/**
 * Partir avec quelqu'un.
 *
 * Rend la situation du séjour, qu'il faudra trancher : c'est ce choix-là qui
 * décide de ce que la relation retient, et il n'a pas de valeur par défaut.
 */
export function departWith(
  ctx: Ctx,
  personId: string,
  destinationId: string,
  classId: string,
): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const who = person(state, personId);
  const dest = DESTINATIONS.find((d) => d.id === destinationId);
  const cls = getTripClass(classId);
  const why = tripBlocker(state, personId, destinationId, classId);
  if (!who || !dest || !cls) return { ok: false, message: 'Ce voyage n’existe pas.' };
  if (why) return { ok: false, title: dest.name, message: why };

  const cost = priceOf(state, destinationId, classId);
  p.money -= cost;
  p.yearActions[TRIP_KEY] = 1;
  // Le voyage solitaire est consommé aussi : on ne part pas deux fois.
  p.yearActions.vacation = 1;

  // L'incident de parcours : la classe l'atténue, et c'est la seule chose
  // qu'elle achète en dur. L'accord ne joue pas ici — un vol annulé n'a rien
  // à voir avec qui l'on emmène ; il jouera au retour, dans `settleTrip`.
  if (rng.chance(dest.risk * cls.risk)) {
    shiftStats(state, { happiness: -6, stress: 12 });
    who.relationship = clampStat(who.relationship - 4);
    ctx.log('life', `Le voyage à ${dest.name} avec ${who.firstName} a mal commencé.`, 'bad');
    return {
      ok: true,
      title: dest.name,
      tone: 'bad',
      message: `Vol annulé, bagages perdus, deux jours gâchés. ${who.firstName} le prend mal.`,
    };
  }

  const moment = momentFor(state, personId, destinationId);
  p.yearActions[`${TRIP_KEY}_moment`] = 1;
  p.yearActions[`${TRIP_KEY}_who`] = personId as unknown as number;
  return {
    ok: true,
    title: dest.name,
    tone: 'neutral',
    message: `${moment.brief}`,
  };
}

/**
 * Trancher la situation du séjour, et rentrer.
 *
 * Le geste vaut ce qu'il vaut **pour cette personne-là** : proposer de
 * partager l'addition tombe juste avec quelqu'un de rigoureux et à côté avec
 * quelqu'un de large. Puis l'accord décide du reste — et c'est là qu'un
 * voyage mal choisi coûte au lieu de rapporter.
 */
export function settleTrip(
  ctx: Ctx,
  personId: string,
  destinationId: string,
  classId: string,
  optionIndex: number,
): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const who = person(state, personId);
  const dest = DESTINATIONS.find((d) => d.id === destinationId);
  const cls = getTripClass(classId);
  const moment = momentFor(state, personId, destinationId);
  const option = moment?.options[optionIndex];
  if (!who || !dest || !cls || !option) return { ok: false, message: 'Ce voyage n’existe pas.' };

  // Le geste tombe-t-il juste ? On lit le trait que l'option interroge.
  const trait = clamp(who.personality[option.reads], 0, 100) / 100;
  const reads = option.likes ? trait : 1 - trait;
  const gesture = option.bond * (READS_BADLY + (READS_WELL - READS_BADLY) * reads) * GESTURE_WEIGHT;

  // Puis l'accord : au-dessus du seuil il rapporte, en dessous il coûte, et
  // le voyage ne peut pas être neutre.
  const accord = accordWith(who, destinationId);
  const swing = accord >= SOURS_UNDER
    ? BEST_GAIN * ((accord - SOURS_UNDER) / (1 - SOURS_UNDER))
    : -WORST_LOSS * ((SOURS_UNDER - accord) / SOURS_UNDER);

  const move = Math.round(gesture + swing);
  who.relationship = clampStat(who.relationship + move);
  who.opinion = clampStat(who.opinion + move * 0.8);
  who.history.push({
    year: state.year,
    text: `${p.firstName} et ${who.firstName} sont partis à ${dest.name.toLowerCase()}.`,
  });

  const good = move >= 0;
  shiftStats(state, {
    happiness: Math.round(dest.happiness * cls.worth * (good ? 1 : 0.4)) + (good ? SHARED_JOY : -4),
    stress: Math.round(dest.stress * cls.worth),
    health: dest.health,
  });
  if (!p.seenPlaces.includes(dest.id)) p.seenPlaces.push(dest.id);

  p.yearActions[`${TRIP_KEY}_moment`] = 0;
  ctx.log(
    'love',
    `${dest.name} avec ${fullName(who)} — ${good ? 'vous en reparlerez' : 'vous n’en reparlerez pas'}.`,
    good ? 'good' : 'bad',
  );
  return {
    ok: true,
    title: who.firstName,
    tone: good ? 'good' : 'bad',
    message: `${option.outcome} ${
      good
        ? `Vous revenez plus proches qu’au départ (+${move}).`
        : `Vous revenez moins proches qu’au départ (${move}).`
    }`,
  };
}

/** Un séjour est-il en cours, en attente de la situation à trancher ? */
export function pendingTrip(state: GameState): boolean {
  return Number(state.player.yearActions[`${TRIP_KEY}_moment`] ?? 0) >= 1;
}
