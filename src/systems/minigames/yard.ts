/**
 * Mini-jeu : la cour.
 *
 * Une cour qui a tourné, et la seule chose qui compte est **où l'on se tient**.
 *
 * Ce que le joueur contrôle : sa position sur un axe, du fond de la cour
 * jusqu'au premier rang. Devant, on se fait un nom ; les surveillants relèvent
 * les visages par balayages successifs, et se faire relever coûte des années.
 * Toute la partie est là : avancer entre deux balayages, reculer avant le
 * suivant.
 *
 * Trois choses en font un choix plutôt qu'un balancement :
 *
 * - **le fond ne rapporte rien.** Rester en sécurité toute la scène est un
 *   choix valable et il vaut zéro. Il faut décider combien de temps on accepte
 *   de passer devant ;
 * - **les balayages s'annoncent, mais pas tous.** Une rumeur précède le
 *   balayage — un temps d'avance dont la durée dépend de ce que le personnage
 *   sait de l'endroit. Un détenu aguerri voit venir ; un nouveau ne voit rien ;
 * - **on ne se retire pas instantanément.** Reculer prend du temps, et il faut
 *   donc partir avant d'en avoir envie. C'est ce qui fait qu'on se fait
 *   prendre : non pas parce qu'on n'a pas vu, mais parce qu'on est resté un
 *   instant de trop.
 *
 * Rien ici ne décrit un établissement, une méthode ou un événement réels : un
 * axe, une horloge, et des balayages. Aucune violence n'est représentée — ce
 * qui est en jeu est d'être vu ou non.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameContext, MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

/** Un balayage : quand il tombe, et depuis combien de temps il se devine. */
export interface Sweep {
  /** L'instant où les visages sont relevés, en millisecondes. */
  at: number;
  /**
   * Depuis quand il est annonçable, en millisecondes avant `at`.
   *
   * C'est la seule chose que la compétence du personnage achète : un détenu
   * qui connaît la maison sent le mouvement venir de loin.
   */
  tell: number;
  /** A-t-il déjà relevé les visages ? */
  done: boolean;
  /** Le joueur était-il devant à ce moment-là ? */
  caught: boolean;
}

export interface YardState {
  /** Où le joueur se tient, 0 au fond, 1 au premier rang. */
  at: number;
  /** Où il veut aller. */
  want: number;
  elapsed: number;
  limit: number;
  sweeps: Sweep[];
  /** Ce qu'on a gagné à être devant, cumulé. */
  standing: number;
  /** Combien de fois on a été relevé. */
  marked: number;
  quit: boolean;
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Au-delà, on est « devant » et on se fait un nom — et repérer. */
export const FRONT = 0.62;

/** Ce que passer une seconde au premier rang rapporte. */
export const GAIN_PER_SECOND = 26;

/** Ce qu'on peut accumuler au plus. */
export const STANDING_CAP = 100;

/** La vitesse de déplacement, en fraction d'axe par seconde. */
export const STEP = 0.9;

/** Combien de balayages dans une scène. */
export const SWEEPS = 6;

/** Ce qu'un relevé coûte sur la note finale. */
export const MARK_COST = 0.34;

/** Ce qu'une scène parfaitement tenue rapporte de respect. */
export const RIOT_RESPECT = 22;

/** Ce que l'esclandre coûte au dossier, quoi qu'il arrive. */
export const RIOT_BEHAVIOR = 26;

/* ------------------------------------------------------------------ */
/* Le jeu                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on sent venir, entre 0 et 1.
 *
 * Zéro quand rien n'approche, un juste avant que les visages soient relevés.
 * **C'est la seule chose que la compétence achète** : `tell` est le temps
 * d'avance du personnage, et c'est lui qui décide si le joueur a le temps de
 * reculer ou seulement celui de le regretter.
 *
 * Lu par l'écran. Sans cette fonction, `tell` aurait été un champ posé au
 * `setup` et lu par personne — une avance annoncée dans la documentation et
 * absente du jeu.
 */
export function warning(s: YardState): number {
  let worst = 0;
  for (const sweep of s.sweeps) {
    if (sweep.done) continue;
    const left = sweep.at - s.elapsed;
    if (left < 0 || left > sweep.tell) continue;
    worst = Math.max(worst, 1 - left / sweep.tell);
  }
  return worst;
}

/** Le joueur est-il exposé en ce moment ? */
export function exposed(s: YardState): boolean {
  return s.at >= FRONT;
}

export const yard = registerMiniGame<YardState>({
  id: 'yard',
  category: 'crime',
  label: 'La cour',
  goal: 'Avance quand ils ne regardent pas, recule avant qu’ils relèvent les visages.',
  duration: 20_000,

  setup(rng: Rng, ctx: MiniGameContext): YardState {
    const limit = 20_000 * (ctx.grace?.time ?? 1);
    // Les balayages sont répartis sur la scène, jamais tout à fait réguliers :
    // un rythme prévisible se compterait au lieu de se sentir.
    const sweeps: Sweep[] = [];
    const slot = limit / (SWEEPS + 1);
    for (let i = 1; i <= SWEEPS; i += 1) {
      const at = slot * i + rng.float(-slot * 0.28, slot * 0.28);
      // Ce que le personnage sent venir : de rien du tout à une bonne seconde.
      const tell = 260 + (ctx.skill / 100) * 900 * (ctx.grace?.insight ? 1.35 : 1);
      sweeps.push({ at, tell, done: false, caught: false });
    }
    sweeps.sort((a, b) => a.at - b.at);
    return {
      at: 0, want: 0, elapsed: 0, limit,
      sweeps, standing: 0, marked: 0, quit: false,
    };
  },

  step(s, input, dt) {
    if (s.quit || s.elapsed >= s.limit) return s;
    s.elapsed += dt;
    if (input.quit) { s.quit = true; return s; }

    // Le doigt dit où aller ; on n'y est pas tout de suite.
    if (typeof input.y === 'number') s.want = Math.max(0, Math.min(1, 1 - input.y));
    else if (input.hold) s.want = 1;
    const span = (STEP * dt) / 1000;
    if (s.at < s.want) s.at = Math.min(s.want, s.at + span);
    else if (s.at > s.want) s.at = Math.max(s.want, s.at - span);

    // Être devant rapporte, seconde après seconde.
    if (s.at >= FRONT) {
      s.standing = Math.min(STANDING_CAP, s.standing + (GAIN_PER_SECOND * dt) / 1000);
    }

    // Et les balayages relèvent ce qu'ils trouvent devant eux.
    for (const sweep of s.sweeps) {
      if (sweep.done || s.elapsed < sweep.at) continue;
      sweep.done = true;
      if (s.at >= FRONT) {
        sweep.caught = true;
        s.marked += 1;
      }
    }
    return s;
  },

  finished(s) {
    return s.quit || s.elapsed >= s.limit;
  },

  score(s): MiniGameResult {
    /*
     * Ce que vaut la scène : ce qu'on s'est fait comme nom, moins ce qu'on
     * s'est fait relever. Un relevé coûte un tiers ; trois effacent tout, y
     * compris une scène passée entièrement au premier rang.
     */
    const earned = s.standing / STANDING_CAP;
    const quality = Math.max(0, Math.min(1, earned * (1 - s.marked * MARK_COST)));
    const notes: string[] = [];
    if (s.marked === 0 && earned > 0.5) notes.push('Personne n’a relevé ton visage.');
    else if (s.marked >= 3) notes.push('Ils ont ton nom trois fois. C’est une de trop.');
    else if (s.marked > 0) notes.push(`Relevé ${s.marked} fois.`);
    if (earned < 0.15) notes.push('Tu es resté au fond, et ça se saura aussi.');
    return {
      success: quality >= 0.34,
      score: Math.round(s.standing),
      quality,
      mistakes: s.marked,
      time: s.elapsed,
      notes,
    };
  },
});
