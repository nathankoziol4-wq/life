/**
 * La noce.
 *
 * **Ce que ce fichier remplace.** `relationships.ts#marry` faisait ceci :
 * prendre trente-cinq pour cent de l'argent du personnage (plafonné à
 * vingt-deux mille), ajouter vingt-deux points de bonheur et cinq de
 * réputation, écrire une ligne dans le journal. Rien à décider, rien à rater,
 * et un coût qui n'était pas un choix mais un impôt silencieux. Le catalogue
 * le disait : « se marier est instantané et gratuit ».
 *
 * Ce qui le remplace est un arbitrage à trois côtés dont aucun ne s'obtient
 * sans céder sur les autres.
 *
 * **1. L'argent.** Une noce se paie avec ce qui aurait été l'apport d'un
 * logement. Le lieu coûte, et le repas coûte **par tête** — donc inviter et
 * bien recevoir sont deux dépenses qui se disputent la même somme.
 *
 * **2. Les places.** Un lieu en a un nombre fini : quatre à la mairie,
 * quatre-vingt-dix dans un domaine. On ne choisit pas seulement combien on
 * dépense, on choisit **qui entre**.
 *
 * **3. Les gens.** C'est le côté qui fait la décision : celui qu'on n'invite
 * pas l'apprend. Un proche oublié perd plus qu'un cousin lointain, et cela
 * reste. Sans cette règle, on se marierait à la mairie avec deux témoins et
 * l'on garderait l'argent — ne pas inviter ne coûterait rien.
 *
 * **Et l'on ne se marie plus le jour où l'on demande.** Une demande acceptée
 * ouvre des fiançailles ; la noce se prépare, puis elle a lieu. C'est ce qui
 * laisse le temps de décider, et ce qui permet à la vie de s'en mêler entre
 * les deux.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName } from '../engine/context.ts';
import type { ActionResult, GameState, Person, WeddingPlan } from '../engine/types.ts';
import {
  INVITED, JOY, NOTICES, PLANNING, SNUBBED, SPREADS, VENUES, getSpread, getVenue,
  type Spread, type Venue,
} from '../data/wedding.ts';
import { getCountry } from '../data/countries.ts';
import { noteHistory } from './npc.ts';

export { SPREADS, VENUES, getSpread, getVenue };
export type { Spread, Venue };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function planOf(state: GameState): WeddingPlan | null {
  return state.player.wedding;
}

/** Le fiancé, s'il y en a un et qu'il est encore là. */
export function betrothed(state: GameState): Person | null {
  const plan = planOf(state);
  if (!plan) return null;
  const person = state.npcs[plan.partnerId];
  return person?.alive ? person : null;
}

/** Ceux qu'on pourrait inviter, du plus proche au plus lointain. */
export function guestPool(state: GameState): Person[] {
  const plan = planOf(state);
  return Object.values(state.npcs)
    .filter((n) => n.alive && !n.petSpecies && n.id !== plan?.partnerId)
    .filter((n) => NOTICES.includes(n.relation) || n.relationship >= 55)
    .sort((a, b) => b.relationship - a.relationship);
}

/** Ceux qui remarqueront de ne pas y avoir été. */
export function wouldNotice(state: GameState): Person[] {
  return guestPool(state).filter((n) => NOTICES.includes(n.relation));
}

export function venueOf(state: GameState): Venue | undefined {
  return getVenue(planOf(state)?.venueId ?? '');
}

export function spreadOf(state: GameState): Spread | undefined {
  return getSpread(planOf(state)?.spreadId ?? '');
}

/** Ce que la noce coûterait, telle qu'elle est prévue. */
export function costOf(state: GameState): number {
  const plan = planOf(state);
  const venue = venueOf(state);
  const spread = spreadOf(state);
  if (!plan || !venue || !spread) return 0;
  const country = getCountry(state.player.countryId);
  const raw = venue.cost + spread.perHead * plan.guestIds.length;
  return Math.round(raw * country.costIndex * state.world.inflation);
}

/** Combien de places restent. */
export function seatsLeft(state: GameState): number {
  const plan = planOf(state);
  const venue = venueOf(state);
  if (!plan || !venue) return 0;
  return Math.max(0, venue.seats - plan.guestIds.length);
}

/* ------------------------------------------------------------------ */
/* Se fiancer                                                          */
/* ------------------------------------------------------------------ */

/**
 * Ouvrir des fiançailles.
 *
 * Appelé par `relationships.ts#propose` quand la demande est acceptée. On ne
 * se marie plus dans la seconde : il y a désormais un entre-deux, et c'est là
 * que se prennent toutes les décisions du système.
 */
export function betroth(ctx: Ctx, target: Person): void {
  const { state } = ctx;
  target.relation = 'partner';
  target.maritalStatus = 'engaged';
  target.flags.engagedSince = state.year;
  state.player.wedding = {
    partnerId: target.id,
    since: state.year,
    venueId: 'mairie',
    spreadId: 'simple',
    guestIds: [],
    done: false,
  };
  ctx.log('love', `${target.firstName} a dit oui. Reste à organiser la noce.`, 'good');
}

/* ------------------------------------------------------------------ */
/* Préparer                                                            */
/* ------------------------------------------------------------------ */

/** Choisir le lieu. Les places qui disparaissent emportent des invités. */
export function setVenue(ctx: Ctx, venueId: string): ActionResult {
  const { state } = ctx;
  const plan = planOf(state);
  const venue = getVenue(venueId);
  if (!plan || plan.done) return { ok: false, message: 'Aucune noce à préparer.' };
  if (!venue) return { ok: false, message: 'Rien de tel.' };

  plan.venueId = venueId;
  /*
   * Un lieu plus petit ne peut pas accueillir ce qu'on avait prévu : on
   * retire les derniers invités ajoutés plutôt que de laisser une liste
   * impossible. Le joueur voit ce qu'il vient de perdre, ce qui est une façon
   * de rendre le choix du lieu concret plutôt que décoratif.
   */
  const removed = Math.max(0, plan.guestIds.length - venue.seats);
  if (removed > 0) plan.guestIds = plan.guestIds.slice(0, venue.seats);

  return {
    ok: true,
    title: venue.label,
    tone: removed > 0 ? 'bad' : 'good',
    message: removed > 0
      ? `${venue.line} Mais il n’y a que ${venue.seats} places : ${removed} invité(s) sautent.`
      : `${venue.line} ${venue.seats} places.`,
  };
}

/** Choisir ce qu'on met sur les tables. */
export function setSpread(ctx: Ctx, spreadId: string): ActionResult {
  const { state } = ctx;
  const plan = planOf(state);
  const spread = getSpread(spreadId);
  if (!plan || plan.done) return { ok: false, message: 'Aucune noce à préparer.' };
  if (!spread) return { ok: false, message: 'Rien de tel.' };
  plan.spreadId = spreadId;
  return {
    ok: true,
    title: spread.label,
    tone: 'good',
    message: `${spread.line} ${spread.perHead} par tête.`,
  };
}

/** Pourquoi on ne peut pas inviter quelqu'un, ou rien. */
export function inviteBlocker(state: GameState, personId: string): string | null {
  const plan = planOf(state);
  if (!plan || plan.done) return 'Aucune noce à préparer.';
  if (plan.guestIds.includes(personId)) return 'Déjà sur la liste.';
  if (seatsLeft(state) <= 0) return 'Il n’y a plus de place.';
  const person = state.npcs[personId];
  if (!person?.alive) return 'Il n’est plus là.';
  return null;
}

/** Ajouter ou retirer quelqu'un de la liste. */
export function invite(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const plan = planOf(state);
  const person = state.npcs[personId];
  if (!plan || plan.done) return { ok: false, message: 'Aucune noce à préparer.' };
  if (!person) return { ok: false, message: 'Qui ?' };

  if (plan.guestIds.includes(personId)) {
    plan.guestIds = plan.guestIds.filter((id) => id !== personId);
    return { ok: true, title: person.firstName, tone: 'neutral', message: 'Retiré de la liste.' };
  }
  const why = inviteBlocker(state, personId);
  if (why) return { ok: false, title: person.firstName, message: why };
  plan.guestIds.push(personId);
  return {
    ok: true,
    title: person.firstName,
    tone: 'good',
    message: `Sur la liste. Il reste ${seatsLeft(state)} place(s).`,
  };
}

/** Remplir la liste au plus proche, tant qu'il reste de la place. */
export function inviteClosest(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const plan = planOf(state);
  if (!plan || plan.done) return { ok: false, message: 'Aucune noce à préparer.' };
  let added = 0;
  for (const person of guestPool(state)) {
    if (seatsLeft(state) <= 0) break;
    if (plan.guestIds.includes(person.id)) continue;
    plan.guestIds.push(person.id);
    added += 1;
  }
  return {
    ok: true,
    title: 'La liste',
    tone: 'good',
    message: added > 0
      ? `${added} invité(s) ajoutés, du plus proche au plus lointain. ${seatsLeft(state)} place(s) restante(s).`
      : 'Il n’y avait plus personne à ajouter.',
  };
}

/* ------------------------------------------------------------------ */
/* Le jour                                                             */
/* ------------------------------------------------------------------ */

/** Pourquoi on ne peut pas encore se marier, ou rien. */
export function weddingBlocker(state: GameState): string | null {
  const plan = planOf(state);
  if (!plan) return 'Tu n’es pas fiancé.';
  if (plan.done) return 'C’est fait.';
  if (!betrothed(state)) return 'Il n’y a plus personne à épouser.';
  if (state.year - plan.since < PLANNING) return 'Une noce ne se monte pas en un jour.';
  const cost = costOf(state);
  if (state.player.money < cost) {
    return `Il te faudrait ${cost.toLocaleString('fr-FR')} $ pour cette noce-là.`;
  }
  return null;
}

/**
 * Se marier.
 *
 * Tout ce que le joueur a décidé se règle ici, et **ce qu'il n'a pas décidé
 * aussi** : ceux qu'il a laissés dehors le remarquent, et cela reste.
 */
export function hold(ctx: Ctx, target?: Person): ActionResult {
  const { state } = ctx;
  const plan = planOf(state);
  const spouse = target ?? betrothed(state);
  const venue = venueOf(state);
  const spread = spreadOf(state);
  if (!plan || !spouse || !venue || !spread) {
    return { ok: false, message: 'Aucune noce à célébrer.' };
  }
  const why = weddingBlocker(state);
  if (why) return { ok: false, title: 'La noce', message: why };

  const p = state.player;
  const cost = costOf(state);
  p.money -= cost;
  plan.done = true;
  plan.heldYear = state.year;

  spouse.relation = 'spouse';
  spouse.maritalStatus = 'married';
  spouse.flags.marriedSince = state.year;
  p.chronicle.marriages += 1;

  // Ce que la journée laisse : au couple, et aux yeux des autres.
  const shine = venue.shine + spread.shine;
  p.stats.happiness = clampStat(p.stats.happiness + JOY * 0.6 + venue.bond + spread.bond);
  p.stats.reputation = clampStat(p.stats.reputation + shine);
  spouse.relationship = clampStat(spouse.relationship + venue.bond + spread.bond);
  noteHistory(state, spouse, `Mariage avec ${p.firstName}, ${venue.label.toLowerCase()}.`);

  // Ceux qui sont venus.
  for (const id of plan.guestIds) {
    const guest = state.npcs[id];
    if (!guest?.alive) continue;
    guest.relationship = clampStat(guest.relationship + INVITED);
    noteHistory(state, guest, `Invité à ton mariage.`);
  }

  /*
   * Et ceux qui n'y étaient pas. C'est la moitié du système : sans cette
   * boucle, la mairie à quatre places serait toujours le bon calcul, et il n'y
   * aurait rien à arbitrer entre l'argent et les gens.
   */
  const invited = new Set(plan.guestIds);
  const snubbed: string[] = [];
  for (const person of wouldNotice(state)) {
    if (invited.has(person.id)) continue;
    // Un proche encaisse plus mal qu'un cousin lointain.
    const sting = SNUBBED * (0.4 + (person.relationship / 100) * 0.9);
    person.relationship = clampStat(person.relationship - sting);
    noteHistory(state, person, 'Tu ne l’as pas invité à ton mariage.');
    if (snubbed.length < 3) snubbed.push(person.firstName);
  }

  const missing = wouldNotice(state).filter((x) => !invited.has(x.id)).length;
  ctx.log('love',
    `Tu as épousé ${fullName(spouse)} — ${venue.label.toLowerCase()}, ${plan.guestIds.length} invité(s). (${cost.toLocaleString('fr-FR')} $)`,
    'good');
  if (missing > 0) {
    ctx.log('love',
      missing === 1
        ? `${snubbed[0]} n’était pas sur la liste, et l’a remarqué.`
        : `${missing} proches n’étaient pas sur la liste, et l’ont remarqué.`,
      'bad');
  }

  return {
    ok: true,
    title: 'Mariés',
    tone: 'good',
    message: missing > 0
      ? `${venue.line} ${plan.guestIds.length} personnes étaient là — et ${missing} ne l’étaient pas. (${cost.toLocaleString('fr-FR')} $)`
      : `${venue.line} Tout le monde était là. (${cost.toLocaleString('fr-FR')} $)`,
  };
}

/**
 * Une année de fiançailles.
 *
 * Elle ne fait qu'une chose, et c'est une chose qui manquait : **si celui
 * qu'on devait épouser n'est plus là, la noce s'efface.** Mesuré sur cent
 * vingt vies autopilotées, dix-neuf des vingt-huit fiançailles jamais
 * conclues l'étaient avec quelqu'un de mort ou de parti — le plan restait
 * dans la sauvegarde, l'écran continuait de le proposer, et rien ne le
 * ramassait.
 */
export function advanceWedding(ctx: Ctx): void {
  const { state } = ctx;
  const plan = planOf(state);
  if (!plan || plan.done) return;
  if (betrothed(state)) return;
  state.player.wedding = null;
  ctx.log('love', 'La noce n’aura pas lieu.', 'bad');
}

/** Rompre les fiançailles. */
export function callOff(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const plan = planOf(state);
  const spouse = betrothed(state);
  if (!plan || plan.done) return { ok: false, message: 'Il n’y a rien à annuler.' };
  state.player.wedding = null;
  if (spouse) {
    spouse.maritalStatus = 'single';
    delete spouse.flags.engagedSince;
    spouse.relationship = clampStat(spouse.relationship - 26);
    noteHistory(state, spouse, 'Les fiançailles sont rompues.');
  }
  state.player.stats.happiness = clampStat(state.player.stats.happiness - 12);
  ctx.log('love', 'Les fiançailles sont rompues.', 'bad');
  return {
    ok: true,
    title: 'Annulé',
    tone: 'bad',
    message: 'Ce qui était réservé est perdu. Vous restez ensemble, pour l’instant.',
  };
}

/* ------------------------------------------------------------------ */
/* Ce qu'on en dit                                                     */
/* ------------------------------------------------------------------ */

/** Une ligne pour le menu. */
export function summary(state: GameState): string {
  const plan = planOf(state);
  if (!plan || plan.done) return '';
  const spouse = betrothed(state);
  if (!spouse) return 'Il n’y a plus personne à épouser.';
  const venue = venueOf(state);
  const left = state.year - plan.since < PLANNING
    ? 'la noce ne peut pas encore avoir lieu'
    : `${plan.guestIds.length} invité(s), ${costOf(state).toLocaleString('fr-FR')} $`;
  return `Fiancé à ${spouse.firstName} · ${venue?.label.toLowerCase() ?? 'lieu à choisir'} · ${left}`;
}

/** Combien de proches resteraient dehors, telle que la liste est faite. */
export function leftOut(state: GameState): number {
  const plan = planOf(state);
  if (!plan) return 0;
  const invited = new Set(plan.guestIds);
  return wouldNotice(state).filter((x) => !invited.has(x.id)).length;
}

/** Ce que la noce prévue vaudrait, en points de réputation. */
export function shineOf(state: GameState): number {
  return clamp((venueOf(state)?.shine ?? 0) + (spreadOf(state)?.shine ?? 0), -4, 24);
}
