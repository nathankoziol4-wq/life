/**
 * Publier quelque part, sur un sujet.
 *
 * **Ce que ce fichier remplace.** `postOnSocial` lançait un dé et distribuait
 * quatre issues selon la bande où il tombait : viral, bonne réception, tiède,
 * mauvaise. Le joueur appuyait sur un bouton, un nombre sortait. Le catalogue
 * le classait `BASIC` — « un tirage et un effet » — et c'était exact.
 *
 * **Trois décisions le remplacent, et aucune n'a de bonne réponse fixe.**
 *
 * *Où.* Quatre publics, quatre tempéraments : le grand nombre distrait, le
 * bavardage rapide, le petit public exigeant, l'atelier où l'on ne regarde
 * que le travail. Ils ne veulent pas les mêmes choses et ne pardonnent pas
 * pareil.
 *
 * *Quoi.* Cinq sujets. Le goût de chaque public pour chacun est **tiré une
 * fois pour la partie et jamais annoncé** : on l'apprend en publiant, comme
 * on apprend un support en le tenant. Ce qui marche chez l'un tombe à plat
 * chez l'autre.
 *
 * *Combien.* Un public se lasse. Le même sujet au même endroit rapporte de
 * moins en moins dans l'année, et publier au-delà de ce qu'un réseau supporte
 * finit par coûter des abonnés. Tenir une audience, c'est tourner.
 *
 * **Rien ici ne décrit un service réel.** Les quatre maisons sont inventées,
 * leurs règles sont des règles de jeu, et la suspension est une sanction de
 * jeu — pas la description de ce que fait une plateforme véritable.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState } from '../engine/types.ts';
import {
  NETWORKS, SUBJECTS, getNetwork, getSubject, type NetworkDef, type Subject,
} from '../data/networks.ts';

/** Combien de publications par an, toutes maisons confondues. */
export const YEAR_LIMIT = 6;

/**
 * Un tirage stable, dérivé de la partie et non de son hasard courant.
 *
 * Le goût d'un public ne doit pas changer entre deux ouvertures de la feuille,
 * sinon il n'y aurait rien à apprendre — et il ne doit pas consommer le hasard
 * de la partie, dont toute la suite se décalerait.
 */
function draw(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/**
 * Le goût d'un public pour un sujet, de 0,4 à 1,7.
 *
 * Jamais annoncé. C'est le cœur du jeu : deux publications identiques sur
 * deux réseaux ne donnent pas la même chose, et l'on ne peut le savoir qu'en
 * essayant.
 */
export function appetiteFor(state: GameState, networkId: string, subject: Subject): number {
  let salt = subject.length * 131;
  for (let i = 0; i < networkId.length; i++) salt = (salt * 31 + networkId.charCodeAt(i)) | 0;
  return 0.4 + draw(state.seed, salt) * 1.3;
}

/** Combien de fois on a publié cela, là, cette année. */
export function timesPosted(state: GameState, networkId: string, subject: Subject): number {
  return Number(state.player.yearActions[`post_${networkId}_${subject}`] ?? 0);
}

/** Combien de fois on a publié sur ce réseau cette année. */
export function timesOn(state: GameState, networkId: string): number {
  return SUBJECTS.reduce((n, s) => n + timesPosted(state, networkId, s.id), 0);
}

/** Total de l'année, toutes maisons confondues. */
export function postsThisYear(state: GameState): number {
  return NETWORKS.reduce((n, net) => n + timesOn(state, net.id), 0);
}

/** Un compte suspendu ne reprend pas avant l'année suivante. */
export function suspendedOn(state: GameState, networkId: string): boolean {
  return state.player.yearActions[`banned_${networkId}`] === 1;
}

/** Pourquoi l'on ne peut pas publier ici, le cas échéant. */
export function postBlocker(state: GameState, network: NetworkDef): string | null {
  const p = state.player;
  if (p.age < 10) return 'Trop jeune pour ça.';
  if (p.prison) return 'Pas de téléphone en détention.';
  if (suspendedOn(state, network.id)) return 'Ton compte est suspendu jusqu’à l’an prochain.';
  if (postsThisYear(state) >= YEAR_LIMIT) return 'Tu as déjà beaucoup posté cette année.';
  return null;
}

/**
 * Ce que le joueur peut lire avant de publier.
 *
 * Pas le goût du public — ça, il faut l'essayer. Seulement la fatigue, qui
 * est une conséquence de ses propres actes et qu'il serait absurde de lui
 * cacher.
 */
export function fatigueOf(state: GameState, network: NetworkDef, subject: Subject): number {
  const here = timesPosted(state, network.id, subject);
  const overall = timesOn(state, network.id);
  // Le même sujet lasse vite ; la présence en général, plus lentement.
  return Math.min(1, here * 0.34 + Math.max(0, overall - network.appetite) * 0.22);
}

/** Ce que la fatigue donne à lire, sans chiffre. */
export function fatigueLabel(value: number): string {
  if (value <= 0) return 'Ils ne t’ont pas encore vu là-dessus';
  if (value < 0.35) return 'Tu commences à être attendu';
  if (value < 0.7) return 'On t’a déjà vu faire ça';
  return 'Ils décrochent';
}

/**
 * Ce qu'une publication réussie rapporte, avant fatigue et goût.
 *
 * **Une audience appelle une audience, et en proportion d'elle-même.** Le
 * premier jet faisait croître le gain en racine du nombre d'abonnés : mesuré
 * sur soixante parties, vingt-deux ans à publier au mieux plafonnaient à
 * quarante mille abonnés et à un niveau de notoriété de 11 sur 100 — là où
 * l'ancien tirage, avec son gros lot à quatre pour cent, menait aux millions.
 * Publier était devenu un système qu'on joue mieux mais qui ne mène nulle
 * part, et c'est la seule voie vers la notoriété qui ne demande pas d'avoir
 * décroché un métier rare. On revient donc à ce qu'une audience fait
 * vraiment : elle compose. Ce que le joueur a compris compose avec elle.
 */
function baseGain(state: GameState, network: NetworkDef): number {
  const p = state.player;
  const appeal = (p.stats.looks + p.stats.intelligence + p.stats.reputation) / 3;
  const already = Math.max(0, p.followers) * 0.06;
  return (24 + appeal * 1.2 + already) * network.reach;
}

/**
 * Publier.
 *
 * Le sort d'une publication tient au goût du public, à la lassitude, et à un
 * hasard qui reste — mais qui ne décide plus seul. Un joueur qui a compris ce
 * que veut chaque maison fait nettement mieux que quelqu'un qui publie au
 * hasard, et c'est ce qu'un test vérifie.
 */
export function publish(ctx: Ctx, networkId: string, subject: Subject): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const network = getNetwork(networkId);
  const def = getSubject(subject);
  if (!network || !def) return { ok: false, message: 'Rien de tel.' };
  const blocker = postBlocker(state, network);
  if (blocker) return { ok: false, title: network.name, message: blocker };

  const key = `post_${network.id}_${subject}`;
  state.player.yearActions[key] = timesPosted(state, network.id, subject) + 1;

  const taste = appetiteFor(state, network.id, subject);
  const tired = fatigueOf(state, network, subject);
  /*
   * **La chance pèse moins que le goût du public.** Premier réglage : un
   * hasard de 0,65 à 1,35, soit un facteur deux, contre un goût de 0,45 à
   * 1,55. Mesuré sur trois cents parties, connaître son public ne rapportait
   * alors que 1,29 fois ce que rapporte publier au hasard — trop peu pour un
   * système dont c'est tout l'objet. Le hasard reste, il ne domine plus.
   */
  const luck = 0.8 + rng.next() * 0.4;
  const score = taste * (1 - tired * 0.8) * luck;

  /*
   * **Ce qui se retourne.** Un sujet exposé peut mal tomber, et d'autant plus
   * facilement que la maison est peu patiente. On ne punit pas le sujet en
   * lui-même : c'est le couple sujet-maison qui décide, comme tout le reste.
   */
  const backfire = def.risk * (1 - network.patience) * (0.5 + tired);
  if (rng.next() < backfire) {
    const lost = Math.min(p.followers, Math.round(p.followers * rng.float(0.05, 0.22)) + rng.int(5, 60));
    p.followers -= lost;
    p.stats.reputation = clampStat(p.stats.reputation - 4);
    p.stats.happiness = clampStat(p.stats.happiness - 5);
    // Les maisons les moins patientes ferment le compte plutôt que d'en
    // discuter. Une sanction de jeu, sur une maison de jeu.
    const banned = rng.next() < (1 - network.patience) * 0.5;
    if (banned) state.player.yearActions[`banned_${network.id}`] = 1;
    ctx.log('random', `Ta publication sur ${network.name} se retourne : −${lost} abonnés.`, 'bad');
    return {
      ok: true,
      title: banned ? 'Compte suspendu' : 'Ça se retourne',
      message: banned
        ? `${network.name} ferme ton compte pour le reste de l’année. −${lost} abonnés.`
        : `On te répond, et pas gentiment. −${lost} abonnés.`,
      tone: 'bad',
    };
  }

  // Le coup d'éclat reste possible, mais il se mérite : il faut que le public
  // aime déjà le sujet et qu'on ne l'ait pas usé.
  const viral = score > 1.5 && rng.next() < 0.14;
  const gained = Math.round(baseGain(state, network) * score * (viral ? 26 : 1));
  p.followers += gained;
  p.stats.happiness = clampStat(p.stats.happiness + (viral ? 10 : score > 0.9 ? 3 : 1));
  if (viral) {
    p.stats.reputation = clampStat(p.stats.reputation + 6);
    ctx.log('random', `Ta publication sur ${network.name} part partout : +${gained} abonnés.`, 'good');
    return {
      ok: true, title: 'Ça part partout',
      message: `${network.name} s’emballe : +${gained} abonnés.`, tone: 'good',
    };
  }
  return {
    ok: true,
    title: network.name,
    message: score > 1.05
      ? `${def.label} : ça prend. +${gained} abonnés.`
      : score > 0.65
        ? `${def.label} : réception correcte. +${gained} abonnés.`
        : `${def.label} : personne ne relève. +${gained} abonnés.`,
    tone: score > 1.05 ? 'good' : 'neutral',
  };
}
