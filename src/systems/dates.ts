/**
 * Les rendez-vous : apprendre à qui l'on parle.
 *
 * Mesuré avant d'écrire une ligne, sur trois cents cours et soixante vies :
 *
 *     d'inconnu à couple        : 9,1 gestes — parler, parler, demander
 *     partenaires plutôt loyaux : 46 % · plutôt chaleureux : 49 %
 *
 * Quarante-six pour cent, c'est le hasard exact : le joueur ne choisissait
 * personne. Et la raison n'était pas qu'il manquait une information — la
 * fiche d'un inconnu affiche ses neuf traits à la seconde de la rencontre —
 * mais qu'il n'existait **aucun moment où cette information change quelque
 * chose**. Séduire était un compteur qu'on fait monter par trois clics par
 * an, puis un tirage.
 *
 * Ce fichier fait trois choses, et les trois tiennent ensemble.
 *
 * **1. On ne sait rien de quelqu'un tant qu'on n'a rien vécu avec lui.** Les
 * traits sont couverts, sauf ceux du sang : on connaît sa mère. Le reste se
 * découvre.
 *
 * **2. Une soirée est une suite de moments.** L'endroit s'adresse à un trait,
 * chaque réponse s'adresse à un trait, et ce qui touche juste dépend de qui
 * est en face — qu'on ne connaît pas encore. On répond, on lit la réaction,
 * on adapte. C'est la même adresse que la table (`minigames/table.ts`) :
 * suivre ce qui est sorti.
 *
 * **3. Ce qu'on met à l'épreuve, on l'apprend.** Découvrir un trait n'est pas
 * un cadeau de fin de soirée : c'est la conséquence d'y avoir touché. Une
 * soirée où l'on n'a parlé que d'argent n'apprend que le rapport à l'argent.
 *
 * Ce que le personnage apporte : **la parole**. Qui sait parler lit la
 * réaction précisément — « il s'anime dès qu'on parle d'avenir » — au lieu de
 * la deviner. C'est le même procédé que l'œil du chineur (`objects.ts`) : la
 * compétence ne remplace jamais l'expérience, elle la rend lisible.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import {
  BEATS, COLD, COURTED_BONUS, LANDS, MISSES, OUTINGS_PER_YEAR, PLACES,
  READS_AT, TRAITS, TRAIT_HIGH, TRAIT_LABEL, TRAIT_LOW, WARM,
  getBeat, getPlace, type Beat, type Place, type TraitId,
} from '../data/dates.ts';
import { formatMoney, getCountry } from '../data/countries.ts';
import { levelOf } from './skills.ts';
import { noteHistory } from './npc.ts';
import { de } from '../data/names.ts';

export { BEATS, PLACES, TRAITS, TRAIT_LABEL, getBeat, getPlace };
export type { Beat, Place, TraitId };

/**
 * Ceux dont on sait tout depuis toujours.
 *
 * On n'a pas besoin d'emmener sa mère au restaurant pour savoir si elle
 * s'emporte. Couvrir ces liens-là n'aurait rien approfondi : cela aurait
 * seulement caché ce que le joueur sait déjà de son propre personnage.
 */
const BORN_KNOWN = new Set([
  'mother', 'father', 'brother', 'sister', 'son', 'daughter',
  'stepmother', 'stepfather', 'grandmother', 'grandfather',
]);

/* ------------------------------------------------------------------ */
/* Ce qu'on sait de quelqu'un                                          */
/* ------------------------------------------------------------------ */

function bit(trait: TraitId): number {
  return 1 << TRAITS.indexOf(trait);
}

/** Ce qu'on a déjà découvert de cette personne, en clair. */
export function knownTraits(person: Person): TraitId[] {
  if (BORN_KNOWN.has(person.relation)) return [...TRAITS];
  const mask = Number(person.flags.known ?? 0);
  return TRAITS.filter((t) => (mask & bit(t)) !== 0);
}

export function knows(person: Person, trait: TraitId): boolean {
  return BORN_KNOWN.has(person.relation) || (Number(person.flags.known ?? 0) & bit(trait)) !== 0;
}

/** Ce qu'il reste à découvrir. */
export function unknownTraits(person: Person): TraitId[] {
  return TRAITS.filter((t) => !knows(person, t));
}

/** Découvrir un trait. Rend vrai si c'est une découverte. */
export function learn(person: Person, trait: TraitId): boolean {
  if (knows(person, trait)) return false;
  person.flags.known = Number(person.flags.known ?? 0) | bit(trait);
  return true;
}

/** Ce qu'on dirait de quelqu'un dont on connaît ce trait. */
export function traitWord(person: Person, trait: TraitId): string {
  const value = person.personality[trait];
  return value >= WARM ? TRAIT_HIGH[trait] : value <= COLD ? TRAIT_LOW[trait] : 'quelqu’un d’équilibré là-dessus';
}

/**
 * Ce que le temps apprend tout seul.
 *
 * Sans cela, un frère d'adoption, un ami de trente ans ou un conjoint resté
 * fidèle seraient restés des inconnus pour toujours faute d'avoir été
 * emmenés au cinéma — ce qui serait faux, et surtout ennuyeux. Vivre avec
 * quelqu'un finit par le dire ; c'est simplement beaucoup plus lent que de
 * passer une soirée à le lui demander.
 */
export function advanceKnowing(ctx: Ctx): void {
  const { state, rng } = ctx;
  for (const person of Object.values(state.npcs)) {
    if (!person.alive || person.relationship < 68) continue;
    const left = unknownTraits(person);
    if (left.length === 0) continue;
    if (!rng.chance(0.35)) continue;
    learn(person, left[rng.int(0, left.length - 1)]);
  }
}

/* ------------------------------------------------------------------ */
/* La soirée                                                           */
/* ------------------------------------------------------------------ */

/** Ce qu'une sortie coûte ici et maintenant. */
export function placeCost(state: GameState, place: Place): number {
  const country = getCountry(state.player.countryId);
  return Math.round(place.cost * country.costIndex * state.world.inflation);
}

/** Les endroits ouverts à cet âge. */
export function placesFor(state: GameState): Place[] {
  return PLACES.filter((place) => state.player.age >= place.from);
}

/** Combien de sorties on a déjà faites avec cette personne cette année. */
export function outingsThisYear(state: GameState, person: Person): number {
  return Number(state.player.yearActions[`date_${person.id}`] ?? 0);
}

/** Pourquoi la soirée n'aura pas lieu, ou rien. */
export function dateBlocker(state: GameState, person: Person, placeId: string): string | null {
  const place = getPlace(placeId);
  if (!place) return 'Nulle part.';
  const p = state.player;
  if (!person.alive) return `${person.firstName} n’est plus là.`;
  if (person.estranged) return `Tu as coupé les ponts avec ${person.firstName}.`;
  if (person.incarcerated) return `${person.firstName} n’est pas joignable.`;
  if (BORN_KNOWN.has(person.relation)) return 'Ce n’est pas ce genre de sortie.';
  if (p.prison) return 'Pas d’ici.';
  if (p.age < place.from) return `Pas à ton âge. À partir de ${place.from} ans.`;
  if (person.relationship < 25) return `${person.firstName} ne te suivrait nulle part.`;
  if (outingsThisYear(state, person) >= OUTINGS_PER_YEAR) {
    return `Vous vous êtes déjà vus ${OUTINGS_PER_YEAR} fois cette année.`;
  }
  const cost = placeCost(state, place);
  if (p.money < cost) return `Il te faudrait ${formatMoney(cost, p.countryId)}.`;
  return null;
}

/** Un tirage stable, qui ne consomme pas le hasard de la partie. */
function draw(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/**
 * Les moments de cette soirée-là.
 *
 * Tirés de façon stable à partir de la personne, de l'année et de l'endroit :
 * l'écran peut donc les demander autant de fois qu'il veut sans que la
 * soirée change sous les doigts du joueur, et sans décaler la suite de la
 * partie d'un seul tirage.
 */
export function sceneFor(state: GameState, person: Person, placeId: string): Beat[] {
  const place = getPlace(placeId);
  if (!place) return [];
  const key = Number(state.seed) + person.birthMonth * 31 + person.birthDay
    + state.year * 7 + placeId.length * 101;
  const out: Beat[] = [];
  const used = new Set<string>();
  for (let i = 0; out.length < place.beats && i < BEATS.length * 3; i++) {
    const beat = BEATS[Math.floor(draw(key, 17 + i * 13) * BEATS.length) % BEATS.length];
    if (used.has(beat.id)) continue;
    used.add(beat.id);
    out.push(beat);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Lire une réaction                                                   */
/* ------------------------------------------------------------------ */

/** L'aisance du personnage à lire quelqu'un en face de lui. */
export function reading(state: GameState): number {
  return levelOf(state, 'parole');
}

export function readsWell(state: GameState): boolean {
  return reading(state) >= READS_AT;
}

/** Une réponse qui s'adresse à ce trait touche-t-elle juste ? */
export function lands(person: Person, trait: TraitId): number {
  const value = person.personality[trait];
  if (value >= WARM) return LANDS;
  if (value <= COLD) return MISSES;
  return 0;
}

/**
 * Ce qu'on voit après avoir répondu.
 *
 * Sans « la parole », on lit une humeur ; avec, on lit une raison — et c'est
 * la raison qui permet d'adapter la suite de la soirée. C'est là, et nulle
 * part ailleurs, que se trouve l'adresse du système.
 */
export function reaction(state: GameState, person: Person, trait: TraitId): string {
  const gain = lands(person, trait);
  const name = person.firstName;
  if (!readsWell(state)) {
    return gain > 0 ? `${name} a l’air content.`
      : gain < 0 ? `${name} a l’air ailleurs.`
        : `Tu n’arrives pas à savoir ce que ${name} en pense.`;
  }
  const word = TRAIT_LABEL[trait].toLowerCase();
  return gain > 0 ? `${name} s’anime : la ${word}, c’est visiblement son terrain.`
    : gain < 0 ? `${name} se ferme un peu. La ${word}, ce n’est pas ça.`
      : `${name} suit sans plus. La ${word}, ni chaud ni froid.`;
}

/* ------------------------------------------------------------------ */
/* La fin de la soirée                                                 */
/* ------------------------------------------------------------------ */

/** Ce qu'une soirée a valu, de -1 à 1. */
export function evening(person: Person, place: Place, picks: TraitId[]): number {
  const parts = [lands(person, place.appeals), ...picks.map((t) => lands(person, t))];
  const best = LANDS * parts.length;
  return clamp(parts.reduce((s, x) => s + x, 0) / best, -1, 1);
}

/**
 * Rentrer.
 *
 * Tout ce que la soirée a mis à l'épreuve devient connu — l'endroit compris,
 * puisque choisir où aller est déjà une question posée. Le lien bouge selon
 * ce qui a touché juste, et une belle soirée laisse un avantage à la demande
 * qui suivra : c'est ce qui fait de la cour autre chose qu'un passe-temps.
 */
export function settleDate(
  ctx: Ctx, personId: string, placeId: string, picks: TraitId[],
): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const person = state.npcs[personId];
  if (!person) return { ok: false, message: 'Personne.' };
  const place = getPlace(placeId);
  if (!place) return { ok: false, message: 'Nulle part.' };
  const why = dateBlocker(state, person, placeId);
  if (why) return { ok: false, title: place.label, message: why };

  p.yearActions[`date_${person.id}`] = outingsThisYear(state, person) + 1;
  p.money -= placeCost(state, place);

  const quality = evening(person, place, picks);
  const move = quality * 9;
  person.relationship = clampStat(person.relationship + move);
  person.opinion = clampStat(person.opinion + move * 0.8);
  person.lastInteractionYear = state.year;
  p.stats.happiness = clampStat(p.stats.happiness + move * 0.5);
  p.stats.stress = clampStat(p.stats.stress - (quality > 0 ? 4 : 0));

  // Ce qu'on a touché, on le sait maintenant.
  const learned: TraitId[] = [];
  for (const trait of [place.appeals, ...picks]) {
    if (learn(person, trait)) learned.push(trait);
  }

  // Une soirée réussie compte pour ce qui suit, et une seule année.
  if (quality > 0.3) {
    person.flags.courtedYear = state.year;
  } else if (quality < -0.3) {
    delete person.flags.courtedYear;
  }

  const told = learned.map((t) => `${TRAIT_LABEL[t].toLowerCase()} : ${traitWord(person, t)}`);
  noteHistory(state, person, `Sortie avec ${p.firstName} — ${place.label.toLowerCase()}.`);
  ctx.log('love',
    `${place.label} avec ${person.firstName}. ${quality > 0.3 ? 'La soirée a été belle.' : quality < -0.3 ? 'La soirée a été longue.' : 'Soirée sans relief.'}`,
    quality > 0.3 ? 'good' : quality < -0.3 ? 'bad' : 'neutral');

  return {
    ok: true,
    title: quality > 0.3 ? 'Une belle soirée' : quality < -0.3 ? 'Une soirée longue' : 'Une soirée',
    tone: quality > 0.3 ? 'good' : quality < -0.3 ? 'bad' : 'neutral',
    message: [
      quality > 0.3
        ? `Vous vous êtes quittés tard, et à regret.`
        : quality < -0.3
          ? `Vous vous êtes quittés tôt, poliment.`
          : `Ça s’est passé. Ni plus ni moins.`,
      told.length > 0
        ? `Tu sais maintenant, ${de(person.firstName)} — ${told.join(' · ')}.`
        : `Tu n’as rien appris de neuf sur ${person.firstName}.`,
    ].join(' '),
  };
}

/**
 * Ce qu'une belle soirée récente ajoute à une demande.
 *
 * Volontairement borné à l'année : la cour ne se capitalise pas, elle
 * s'entretient. Sans cette borne, une seule soirée réussie à vingt ans aurait
 * rendu toutes les demandes faciles pour le reste de la vie.
 */
export function courtedBonus(state: GameState, person: Person): number {
  return Number(person.flags.courtedYear ?? -99) === state.year ? COURTED_BONUS : 0;
}
