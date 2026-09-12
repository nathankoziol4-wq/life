/**
 * Mini-jeu : le minutage.
 *
 * **Ce qu'il remplace.** Le catalogue disait : « Braquage — minutage et niveau
 * d'alerte : un délit du catalogue résolu par tirage ». Le joueur appuyait sur
 * une ligne et lisait ce qui s'était passé.
 *
 * **Rien ici ne décrit une façon de faire.** C'est une exigence, pas une
 * précaution de style : ce mini-jeu ne montre aucune procédure, aucun lieu,
 * aucun outil, aucune méthode. Ce qu'on y manipule est **le temps** — une
 * aiguille qui balaie un cadran, une fenêtre où il faut lâcher, une jauge qui
 * monte. On pourrait jouer exactement la même chose en changeant tous les
 * mots : c'est un jeu de tempo, et il n'apprend rien qui existe.
 *
 * **Ce qui se joue.** Une aiguille va et vient. Maintenir puis lâcher **dans
 * la fenêtre** fait avancer d'une passe : la prise grossit. Lâcher à côté fait
 * bondir l'alerte. Et la fenêtre rétrécit à mesure que l'alerte monte, donc
 * chaque erreur rend la suivante plus probable.
 *
 * **La vraie décision est de partir.** Rester rapporte davantage ; l'alerte ne
 * redescend jamais tout à fait. Il n'existe pas de nombre de passes qui soit
 * le bon : cela dépend de la façon dont celles d'avant se sont passées, ce
 * qu'un test vérifie en refusant qu'une consigne fixe batte un joueur qui
 * regarde sa jauge.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameContext, MiniGameInput, MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

export interface HeistSetup {
  /** Combien de passes il est possible de tenter au plus. */
  passes: number;
  /** Vitesse de l'aiguille, en tours par seconde. */
  speed: number;
  /** Largeur de la fenêtre au départ, en fraction du cadran. */
  window: number;
}

export interface HeistState {
  /** Position de l'aiguille, 0 à 1, et son sens. */
  needle: number;
  way: 1 | -1;
  speed: number;
  /** Centre et demi-largeur de la fenêtre, en fraction du cadran. */
  mark: number;
  half: number;
  /** Ce qui monte, et ne redescend jamais tout à fait. */
  alert: number;
  /**
   * Le point où c'est fini — **et qu'on ne voit pas**.
   *
   * Sans lui, l'alerte étant affichée et la montée calculable, il existait un
   * seuil optimal : mesuré, partir à 70 valait exactement partir à 60 et ne
   * risquait rien, si bien que « pousser encore un peu » n'était jamais un
   * pari. On tire donc la limite à la mise en place, entre 82 et 100 : le
   * joueur voit ce qu'il a accumulé, jamais ce qu'il reste.
   */
  patience: number;
  /** Passes réussies, et tentées. */
  taken: number;
  tried: number;
  maxPasses: number;
  /** Le doigt est-il posé ? */
  pressing: boolean;
  /** La dernière passe a-t-elle touché ? Pour l'écran. */
  lastHit: boolean | null;
  elapsed: number;
  limit: number;
  over: null | 'parti' | 'pris' | 'temps';
}

/** Ce que vaut la prise, de 0 à 1. */
export function haulOf(s: HeistState): number {
  return s.maxPasses > 0 ? Math.min(1, s.taken / s.maxPasses) : 0;
}

/**
 * La fenêtre à cet instant : elle rétrécit avec l'alerte.
 *
 * C'est ce qui fait qu'une erreur coûte plus qu'une passe perdue — elle rend
 * les suivantes plus difficiles, et la spirale est la seule chose que ce jeu
 * ait à dire.
 */
export function windowOf(s: HeistState): number {
  return Math.max(0.022, s.half * (1 - s.alert / 145));
}

export const HEIST = registerMiniGame<HeistState>({
  id: 'heist',
  category: 'crime',
  label: 'Le minutage',
  goal: 'Lâcher dans la fenêtre pour avancer. Partir avant que l’alerte monte trop.',
  duration: 45_000,

  setup(rng: Rng, ctx: MiniGameContext): HeistState {
    const setup = (ctx.setup as HeistSetup | undefined)
      ?? { passes: 8, speed: 0.55, window: 0.12 };
    return {
      needle: rng.float(0.1, 0.9),
      way: rng.chance(0.5) ? 1 : -1,
      speed: setup.speed,
      mark: rng.float(0.25, 0.75),
      half: setup.window * (ctx.grace?.tolerance ? 1 + ctx.grace.tolerance / 200 : 1),
      alert: 0,
      patience: rng.float(82, 100),
      taken: 0,
      tried: 0,
      maxPasses: setup.passes,
      pressing: false,
      lastHit: null,
      elapsed: 0,
      limit: 45_000 * (ctx.grace?.time ?? 1),
      over: null,
    };
  },

  step(s: HeistState, input: MiniGameInput, dt: number): HeistState {
    if (s.over) return s;
    s.elapsed += dt;

    // L'aiguille va et vient, et rebondit aux bords.
    s.needle += s.way * s.speed * (dt / 1000);
    if (s.needle >= 1) { s.needle = 1; s.way = -1; }
    if (s.needle <= 0) { s.needle = 0; s.way = 1; }

    /*
     * **Rester coûte, et de plus en plus.**
     *
     * Premier réglage : l'alerte montait de 1,6 par seconde plus 0,9 par
     * passe. Mesuré sur trois cents parties, un joueur qui vise juste prenait
     * les cinq passes sans jamais être inquiété — personne n'était pris, et
     * « ne jamais partir » battait toutes les autres consignes. Une décision
     * dont une réponse domine n'est pas une décision. Chaque passe rend donc
     * la suivante nettement plus chère.
     */
    s.alert += (dt / 1000) * (1.4 + s.taken * 2.4);

    if (input.quit) {
      s.over = 'parti';
      return s;
    }

    if (input.hold) {
      s.pressing = true;
    } else if (s.pressing) {
      // Le doigt se lève : c'est là que la passe se joue.
      s.pressing = false;
      s.tried += 1;
      const hit = Math.abs(s.needle - s.mark) <= windowOf(s);
      s.lastHit = hit;
      if (hit) {
        s.taken += 1;
        s.alert += 9;
        // La fenêtre se déplace : on ne rejoue pas deux fois le même geste.
        s.mark = (s.mark + 0.37) % 1;
      } else {
        s.alert += 21;
      }
    }

    if (s.taken >= s.maxPasses) s.over = 'parti';
    else if (s.alert >= s.patience) s.over = 'pris';
    else if (s.elapsed >= s.limit) s.over = 'temps';
    return s;
  },

  finished: (s: HeistState) => s.over !== null,

  score(s: HeistState): MiniGameResult {
    /*
     * **Partir avec peu est une réussite.** C'est tout le propos : le jeu ne
     * demande pas de tout prendre, il demande de savoir s'arrêter. Ne rien
     * emporter n'en est pas une, et se faire prendre non plus.
     */
    const success = s.over === 'parti' && s.taken > 0;
    const haul = haulOf(s);
    const quality = success ? Math.max(0.12, haul * (1 - s.alert / 220)) : 0;
    return {
      success,
      score: Math.round(quality * 100),
      quality,
      mistakes: Math.max(0, s.tried - s.taken),
      time: Math.round(s.elapsed),
    };
  },
});
