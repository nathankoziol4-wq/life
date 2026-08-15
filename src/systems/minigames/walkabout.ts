/**
 * Mini-jeu : la haie.
 *
 * Une allée, une corde, et deux cents personnes derrière. On avance jusqu'au
 * bout, et l'on ne peut pas parler à tout le monde.
 *
 * Ce que le joueur contrôle : **son allure, et à qui il donne du temps**.
 * Relâcher, c'est marcher ; maintenir, c'est s'arrêter devant quelqu'un et
 * rester. La seule ressource est le temps, et il y a exactement deux façons de
 * la perdre : trop en donner à quelqu'un, ou n'en donner à personne.
 *
 * Trois choses en font un choix plutôt qu'un balayage :
 *
 * - **il faut arriver au bout**. L'escorte ne prolonge pas : si l'on est
 *   encore au tiers de l'allée quand le temps tombe, ce qu'on a fait de bien
 *   compte à peine, parce que les trois quarts de la haie ont attendu pour
 *   rien ;
 * - **une poignée de main n'est pas une conversation**. Un appui bref salue
 *   et vaut peu ; rester vaut beaucoup plus, et coûte tout le reste ;
 * - **ils ne se valent pas**. Certains ont attendu depuis l'aube, certains
 *   sont là par hasard. Un personnage aguerri les distingue d'un coup d'œil ;
 *   un débutant ne voit qu'une file de gens.
 *
 * Rien ici ne décrit un lieu, un protocole ou une personne réels : une ligne,
 * des points dessus, et une horloge.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

/** Quelqu'un derrière la corde. */
export interface Waiting {
  /** Où il se tient sur l'allée, 0-1. */
  at: number;
  /**
   * Ce que le saluer rapporte, 0-1.
   *
   * Caché tant que le personnage n'a pas l'œil : `visible` dit si l'interface
   * a le droit de le montrer.
   */
  worth: number;
  visible: boolean;
  /** Ce qu'on lui a donné, 0 (rien) à 1 (tout le temps qu'il fallait). */
  given: number;
  /** L'a-t-on abordé ? */
  met: boolean;
}

export interface WalkaboutState {
  /** Où l'on en est de l'allée, 0-1. */
  pos: number;
  /** La haie. */
  people: Waiting[];
  /** S'arrête-t-on ? */
  standing: boolean;
  /** Appuis dans le vide : on a tendu la main à personne. */
  fumbles: number;
  /** A-t-on atteint le bout ? */
  arrived: boolean;
  quit: boolean;
  elapsed: number;
  limit: number;
}

/** Ce qu'on parcourt par milliseconde en marchant. */
const PACE = 0.000_055;
/**
 * Ce qu'on parcourt en restant : presque rien, mais pas rien.
 *
 * Assez lent pour qu'on ne quitte jamais quelqu'un en restant planté — on ne
 * s'en va qu'en marchant. À huit millièmes, s'arrêter pendant toute la partie
 * faisait encore parcourir un quart de l'allée, ce qui rendait l'immobilité
 * rentable.
 */
const HELD_PACE = 0.000_002_5;
/** À quelle distance on peut tendre la main. */
const REACH = 0.035;
/** Ce qu'une poignée de main rapporte, sans s'arrêter. */
const QUICK = 0.42;
/** Ce que rester ajoute, par milliseconde. */
const DEEPEN = 0.000_42;

/** La personne la plus proche qu'on puisse encore atteindre. */
function nearest(s: WalkaboutState): Waiting | undefined {
  let best: Waiting | undefined;
  let gap = REACH;
  for (const one of s.people) {
    const d = Math.abs(one.at - s.pos);
    if (d <= gap) { gap = d; best = one; }
  }
  return best;
}

export const walkabout = registerMiniGame<WalkaboutState>({
  id: 'walkabout',
  category: 'carrière',
  label: 'La haie',
  goal: 'Relâche pour avancer, maintiens pour rester avec quelqu’un. Il faut arriver au bout.',
  duration: 30_000,

  setup(rng: Rng, ctx) {
    const limit = Math.round(30_000 * ctx.grace.time);
    // Plus la situation est tendue, plus il y a de monde, et moins on peut
    // en voir : c'est la seule chose que la difficulté change.
    const count = 9 + Math.round((ctx.difficulty / 100) * 7);
    const people: Waiting[] = [];
    for (let i = 0; i < count; i++) {
      // Répartis le long de l'allée, sans jamais deux au même endroit : la
      // haie doit se parcourir, pas se camper.
      const at = (i + rng.float(0.15, 0.85)) / count;
      people.push({
        at,
        worth: rng.float(0.2, 1),
        visible: ctx.grace.insight,
        given: 0,
        met: false,
      });
    }
    return {
      pos: 0,
      people,
      standing: false,
      fumbles: 0,
      arrived: false,
      quit: false,
      elapsed: 0,
      limit,
    };
  },

  step(s, input, dt) {
    if (s.arrived || s.quit || s.elapsed >= s.limit) return s;
    s.elapsed += dt;
    if (input.quit) { s.quit = true; return s; }

    // Maintenir, c'est rester. Il n'y a rien d'autre à régler : `x` ne sert
    // pas, parce qu'on ne choisit pas où l'on se place dans une haie — on
    // choisit seulement combien de temps on s'y arrête.
    s.standing = Boolean(input.hold);
    s.pos = Math.min(1, s.pos + (s.standing ? HELD_PACE : PACE) * dt);

    const close = nearest(s);

    // Un appui bref : on salue, et l'on continue. C'est peu, et c'est tout de
    // suite. Tendre la main à personne se voit.
    if (input.tap) {
      if (close) {
        close.met = true;
        close.given = Math.max(close.given, QUICK);
      } else {
        s.fumbles += 1;
      }
    }

    // Rester : la conversation se creuse tant qu'on est là. On ne peut la
    // creuser qu'avec une seule personne à la fois, et l'allée n'attend pas.
    if (s.standing && close) {
      close.met = true;
      close.given = Math.min(1, close.given + DEEPEN * dt);
    }

    if (s.pos >= 1) s.arrived = true;
    return s;
  },

  finished(s) {
    return s.arrived || s.quit || s.elapsed >= s.limit;
  },

  score(s): MiniGameResult {
    const total = s.people.reduce((sum, one) => sum + one.worth, 0);
    const given = s.people.reduce((sum, one) => sum + one.worth * one.given, 0);
    const share = total > 0 ? given / total : 0;
    const met = s.people.filter((one) => one.met).length;

    // Arriver au bout n'est pas un bonus : c'est ce pour quoi on est venu.
    // Une haie abandonnée au tiers laisse deux cents personnes debout, et
    // aucune conversation ne rachète ça.
    const route = s.arrived ? 1 : s.pos * 0.55;
    const quality = Math.max(0, Math.min(1,
      share * 0.62 * route + route * 0.38 - s.fumbles * 0.04,
    ));

    const notes: string[] = [];
    if (!s.arrived) notes.push(s.quit ? 'Tu es parti avant la fin.' : 'L’escorte t’a repris avant le bout.');
    else if (share > 0.66) notes.push('Personne n’a eu l’impression de compter pour rien.');
    else if (share < 0.25) notes.push('Tu as marché droit. Ils l’ont vu.');
    else notes.push(`${met} personne(s) sur ${s.people.length}.`);
    if (s.fumbles > 0) notes.push(`${s.fumbles} main(s) tendue(s) dans le vide.`);

    return {
      success: s.arrived && share >= 0.35,
      score: Math.round(share * 600 + (s.arrived ? 400 : s.pos * 200) - s.fumbles * 30),
      quality,
      mistakes: s.fumbles,
      time: s.elapsed,
      notes,
    };
  },
});
