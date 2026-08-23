/**
 * La maison.
 *
 * **Ce que ce fichier ajoute.** Le rang de patron existait — nom, emoji,
 * description, part majorée — et **aucune ligne de code ne le traitait
 * différemment des autres**. On continuait de recevoir des missions de
 * personne et de les faire soi-même. Le catalogue : « le rang de patron
 * existe ; il n'ouvre aucun gameplay de direction ».
 *
 * Diriger n'est pas exécuter mieux : c'est **placer des gens**, et vivre avec
 * ce qu'on n'a pas pu couvrir. Trois postes, moins de gens que de postes, et
 * la certitude que celui qu'on laisse de côté est celui qui finira par se
 * lever — c'est là que les « luttes internes » cessent d'être un événement
 * pour devenir une conséquence de ce qu'on a décidé.
 *
 * Deux dials qui se contredisent : **qui tient quoi**, et **ce qu'on leur
 * laisse**. Une part généreuse achète la paix et vide la caisse ; une part
 * maigre remplit la caisse et fabrique des rivaux.
 *
 * **Sur l'abstraction.** « La maison », « le terrain », « la caisse », « le
 * silence » : quatre mots de jeu. Aucune structure, aucune pratique, aucun
 * groupe reconnaissable — on pourrait en changer tous les termes sans toucher
 * une ligne de code.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import {
  BUYOFF, CHALLENGE_AT, CUTS, FAT_SOOTHE, GROUND_HELD, GROUND_LOST,
  GROUND_YIELD, HUSH, IDLE_GRUDGE, NOISE, OUSTED_GROUND, POSTS, RIVAL_PUSH,
  THIN_GRUDGE, TILL_BONUS, getCut, getPost, type Post,
} from '../data/house.ts';
import { addHeat, coolHeat, orgOf, underworldPeople } from './underworld.ts';
import { getCountry } from '../data/countries.ts';
import { noteHistory } from './npc.ts';

export { POSTS, CUTS, getPost };
export type { Post };

/** Le rang à partir duquel on ne prend plus d'ordres. */
export const BOSS_RANK = 5;

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Diriges-tu quelque chose ? */
export function isBoss(state: GameState): boolean {
  return (orgOf(state)?.rank ?? 0) >= BOSS_RANK;
}

/** Qui tient quoi, aujourd'hui. */
export function postsOf(state: GameState): Record<string, string | null> {
  const org = orgOf(state);
  if (!org) return {};
  org.posts ??= {};
  for (const post of POSTS) org.posts[post.id] ??= null;
  return org.posts;
}

/** Ce qu'on leur laisse. */
export function cutOf(state: GameState): string {
  const org = orgOf(state);
  if (!org) return 'correct';
  org.cut ??= 'correct';
  return org.cut;
}

/** Les gens qu'on peut placer. */
export function crew(state: GameState): Person[] {
  return underworldPeople(state).sort((a, b) => grudgeOf(b) - grudgeOf(a));
}

/** Qui tient ce poste, s'il est tenu. */
export function holderOf(state: GameState, postId: string): Person | null {
  const id = postsOf(state)[postId];
  if (!id) return null;
  const person = state.npcs[id];
  return person?.alive ? person : null;
}

/**
 * Ce que quelqu'un vaut à un poste, sur cent.
 *
 * Tiré de ce que le PNJ est déjà — on n'invente pas une statistique de plus.
 * La discipline tient le terrain, la ruse fait rentrer, le sang-froid tient
 * au calme : les trois postes ne demandent pas les mêmes gens, ce qui est ce
 * qui rend le placement intéressant.
 */
export function fitFor(person: Person, postId: string): number {
  const p = person.personality;
  if (postId === 'terrain') return clampStat(p.discipline * 0.4 + p.temper * 0.35 + p.sociability * 0.25);
  if (postId === 'caisse') return clampStat(p.ambition * 0.4 + p.discipline * 0.35 + p.sociability * 0.25);
  return clampStat((100 - p.temper) * 0.45 + p.discipline * 0.3 + p.loyalty * 0.25);
}

/** Ce que quelqu'un a contre toi, 0-100. */
export function grudgeOf(person: Person): number {
  return clamp(Number(person.flags.grudge ?? 0), 0, 100);
}

/** Ce que la rancune veut dire, en mots. */
export function grudgeSays(person: Person): string {
  const g = grudgeOf(person);
  if (g < 12) return 'Rien à signaler.';
  if (g < 30) return 'Il trouve qu’on l’oublie un peu.';
  if (g < CHALLENGE_AT) return 'Il parle de toi quand tu n’es pas là.';
  return 'Il n’attend qu’une occasion.';
}

/* ------------------------------------------------------------------ */
/* Décider                                                             */
/* ------------------------------------------------------------------ */

/** Pourquoi on ne peut pas diriger, ou rien. */
export function houseBlocker(state: GameState): string | null {
  const org = orgOf(state);
  if (!org) return 'Tu n’es d’aucune maison.';
  if (org.rank < BOSS_RANK) return 'Ce n’est pas toi qui décides.';
  if (state.player.prison) return 'Tu es incarcéré.';
  return null;
}

/** Placer quelqu'un à un poste, ou l'en retirer. */
export function assign(ctx: Ctx, postId: string, personId: string | null): ActionResult {
  const { state } = ctx;
  const why = houseBlocker(state);
  if (why) return { ok: false, message: why };
  const post = getPost(postId);
  if (!post) return { ok: false, message: 'Rien de tel.' };
  const posts = postsOf(state);

  if (personId === null) {
    posts[postId] = null;
    return { ok: true, title: post.label, tone: 'neutral', message: `Plus personne. ${post.neglect}` };
  }
  const person = state.npcs[personId];
  if (!person?.alive) return { ok: false, message: 'Il n’est plus là.' };

  /*
   * Une personne ne tient qu'un poste : c'est ce qui fait qu'on manque de
   * monde, et donc qu'il faut choisir. Sans cette règle, on placerait le
   * meilleur partout et il n'y aurait pas de décision.
   */
  for (const other of POSTS) if (posts[other.id] === personId) posts[other.id] = null;
  posts[postId] = personId;
  // Recevoir un poste calme immédiatement : c'est la réponse à une rancune.
  person.flags.grudge = Math.max(0, grudgeOf(person) - 18);
  return {
    ok: true,
    title: post.label,
    tone: 'good',
    message: `${person.firstName} s’en occupe. Il vaut ${Math.round(fitFor(person, postId))} pour ça.`,
  };
}

/** Choisir ce qu'on leur laisse. */
export function setCut(ctx: Ctx, cutId: string): ActionResult {
  const { state } = ctx;
  const why = houseBlocker(state);
  if (why) return { ok: false, message: why };
  const cut = CUTS.find((c) => c.id === cutId);
  const org = orgOf(state);
  if (!cut || !org) return { ok: false, message: 'Rien de tel.' };
  org.cut = cutId;
  return { ok: true, title: cut.label, tone: 'neutral', message: cut.line };
}

/* ------------------------------------------------------------------ */
/* Ce que l'année rapporte                                             */
/* ------------------------------------------------------------------ */

/** Ce que le terrain rapporterait cette année, avant partage. */
export function takeOf(state: GameState): number {
  const org = orgOf(state);
  if (!org) return 0;
  const till = holderOf(state, 'caisse');
  const country = getCountry(state.player.countryId);
  const skill = till ? fitFor(till, 'caisse') / 100 : 0;
  return Math.round(
    org.territory * GROUND_YIELD * (0.12 + skill * TILL_BONUS)
    * country.salaryIndex * state.world.inflation,
  );
}

/** Ce qu'il te resterait, une fois les parts versées. */
export function yoursOf(state: GameState): number {
  return Math.round(takeOf(state) * (1 - getCut(cutOf(state)).share));
}

/**
 * Une année à la tête de la maison.
 *
 * Tout ce que le joueur a décidé se règle ici — et **ce qu'il n'a pas
 * décidé aussi** : les postes vides se paient exactement là où ils sont
 * vides, et les gens qu'on n'a pas placés mûrissent.
 */
export function advanceHouse(ctx: Ctx): void {
  const { state, rng } = ctx;
  const org = orgOf(state);
  if (!org || org.rank < BOSS_RANK || state.player.prison) return;

  const posts = postsOf(state);
  const people = underworldPeople(state);
  const share = getCut(cutOf(state)).share;

  /* ---- Le terrain ---- */
  const ground = holderOf(state, 'terrain');
  const push = RIVAL_PUSH + rng.float(0, 4);
  if (ground) {
    const held = (fitFor(ground, 'terrain') / 100) * GROUND_HELD;
    org.territory = clampStat(org.territory + held - push);
  } else {
    org.territory = clampStat(org.territory - GROUND_LOST - push);
  }

  /* ---- La caisse ---- */
  const take = takeOf(state);
  const yours = Math.round(take * (1 - share));
  state.player.money += yours;
  if (take > 0) {
    ctx.log('crime', `La maison a rapporté ${take.toLocaleString('fr-FR')} $. Ta part : ${yours.toLocaleString('fr-FR')} $.`, 'neutral');
  }

  /* ---- Le silence ---- */
  const quiet = holderOf(state, 'silence');
  if (quiet) coolHeat(ctx, (fitFor(quiet, 'silence') / 100) * HUSH);
  addHeat(ctx, NOISE * (0.4 + org.territory / 120));
  org.pressure = clampStat(org.pressure + NOISE * 0.5 - (quiet ? HUSH * 0.5 : 0));

  /* ---- Et les gens ---- */
  const placed = new Set(Object.values(posts).filter(Boolean));
  for (const person of people) {
    let grudge = grudgeOf(person);
    if (!placed.has(person.id)) {
      /*
       * **Celui qu'on ne place pas est celui qui bouge.** Et d'autant plus
       * vite qu'il se croit capable : c'est l'ambition qui fait la différence
       * entre quelqu'un qu'on oublie et quelqu'un qui s'en souvient.
       */
      grudge += IDLE_GRUDGE * (0.4 + person.personality.ambition / 100);
    }
    grudge += share < 0.2 ? THIN_GRUDGE : share > 0.45 ? -FAT_SOOTHE : -1;
    person.flags.grudge = clamp(grudge, 0, 100);
  }

  /* ---- Quelqu'un se lève ---- */
  const angry = people
    .filter((x) => grudgeOf(x) >= CHALLENGE_AT)
    .sort((a, b) => grudgeOf(b) - grudgeOf(a))[0];
  if (angry && !state.player.flags.houseChallenge) {
    state.player.flags.houseChallenge = angry.id;
    ctx.log('crime', `${fullName(angry)} conteste ta place. Il faudra répondre.`, 'bad');
  }
}

/* ------------------------------------------------------------------ */
/* Le défi                                                             */
/* ------------------------------------------------------------------ */

/** Celui qui conteste, s'il y en a un. */
export function challenger(state: GameState): Person | null {
  const id = state.player.flags.houseChallenge;
  if (typeof id !== 'string' || !id) return null;
  const person = state.npcs[id];
  return person?.alive ? person : null;
}

/** Ce qu'il faudrait pour acheter la paix. */
export function peacePrice(state: GameState): number {
  const person = challenger(state);
  if (!person) return 0;
  const country = getCountry(state.player.countryId);
  return Math.round(grudgeOf(person) * BUYOFF * country.costIndex * state.world.inflation);
}

/** Acheter la paix. */
export function buyPeace(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const person = challenger(state);
  if (!person) return { ok: false, message: 'Personne ne conteste.' };
  const price = peacePrice(state);
  if (state.player.money < price) {
    return { ok: false, title: person.firstName, message: `Il en faudrait ${price.toLocaleString('fr-FR')} $.` };
  }
  state.player.money -= price;
  person.flags.grudge = 10;
  delete state.player.flags.houseChallenge;
  noteHistory(state, person, 'Tu as acheté sa paix.');
  return {
    ok: true,
    title: person.firstName,
    tone: 'neutral',
    message: 'Il reprend sa place. Il se souviendra du prix, et toi aussi.',
  };
}

/**
 * Lui tenir tête.
 *
 * Ce qui décide n'est pas ce qu'on vaut soi-même mais **ce que la maison
 * pense** : le respect gagné rang après rang, et le fait qu'il reste des
 * gens contents. Diriger mal pendant dix ans se paie ici, d'un coup.
 */
export function faceDown(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const person = challenger(state);
  const org = orgOf(state);
  if (!person || !org) return { ok: false, message: 'Personne ne conteste.' };

  const people = underworldPeople(state);
  const calm = people.filter((x) => grudgeOf(x) < 30).length;
  const backing = clamp(
    org.respect / 100 * 0.55 + (calm / Math.max(1, people.length)) * 0.4 - grudgeOf(person) / 260,
    0.05, 0.94,
  );
  delete state.player.flags.houseChallenge;

  if (rng.chance(backing)) {
    person.flags.grudge = 0;
    person.relationship = clampStat(person.relationship - 20);
    org.respect = clampStat(org.respect + 8);
    noteHistory(state, person, 'Il s’est levé contre toi, et il s’est rassis.');
    return {
      ok: true,
      title: 'Il se rassoit',
      tone: 'good',
      message: 'Personne ne l’a suivi. C’est le genre de silence qui compte.',
    };
  }

  org.rank = Math.max(0, org.rank - 2);
  org.respect = clampStat(org.respect - 30);
  org.territory = clampStat(org.territory - OUSTED_GROUND);
  for (const post of POSTS) postsOf(state)[post.id] = null;
  noteHistory(state, person, 'Il a pris ta place.');
  ctx.log('crime', `${fullName(person)} a pris ta place à la tête de la maison.`, 'bad');
  return {
    ok: true,
    title: 'Écarté',
    tone: 'bad',
    message: 'Assez de monde l’a suivi. Tu redescends de deux rangs, et le terrain avec toi.',
  };
}

/* ------------------------------------------------------------------ */
/* Ce qu'on en dit                                                     */
/* ------------------------------------------------------------------ */

/** Une ligne pour le menu. */
export function summary(state: GameState): string {
  const org = orgOf(state);
  if (!org || org.rank < BOSS_RANK) return '';
  const empty = POSTS.filter((p) => !holderOf(state, p.id)).length;
  const head = `${Math.round(org.territory)} d’emprise · ${yoursOf(state).toLocaleString('fr-FR')} $/an`;
  if (challenger(state)) return `${head} · quelqu’un conteste ta place`;
  return empty > 0 ? `${head} · ${empty} poste(s) vide(s)` : head;
}
