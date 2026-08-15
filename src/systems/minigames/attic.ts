/**
 * Mini-jeu : chercher dans le noir.
 *
 * Une pièce sans lumière, une lampe qu'on déplace, et quelque chose dedans.
 *
 * Ce que le joueur contrôle : **où il regarde, et quand il décide de creuser**.
 * La lampe éclaire un disque autour du doigt ; à l'intérieur, on voit ce qu'il
 * y a. À l'extérieur, rien. Le seul indice à distance est la chaleur — la
 * lampe faiblit ou s'avive selon qu'on s'éloigne ou qu'on approche.
 *
 * Trois choses en font un jeu plutôt qu'un balayage :
 *
 * - **la pile s'épuise**, et plus vite quand on éclaire large. On peut voir
 *   loin ou voir longtemps, jamais les deux ;
 * - **on ne peut fouiller qu'un nombre limité de fois**. Chercher est
 *   gratuit, décider ne l'est pas ;
 * - **il y a des leurres** : des formes qui répondent à la chaleur comme le
 *   bon objet et n'en sont pas. C'est ce qui punit celui qui creuse au
 *   premier frémissement.
 *
 * Rien ici ne décrit un lieu ni une méthode : un rectangle, un disque de
 * lumière et une jauge.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

/** Quelque chose d'enfoui : le bon objet, ou une forme qui lui ressemble. */
export interface Buried {
  x: number;
  y: number;
  /** Est-ce ce qu'on cherche ? */
  real: boolean;
  /** Déjà fouillé ? */
  dug: boolean;
}

export interface AtticState {
  /** Où est la lampe, 0-1 sur chaque axe. */
  lampX: number;
  lampY: number;
  /** Le rayon éclairé, 0-1. Le joueur le règle en montant le doigt. */
  radius: number;
  /** Ce qu'il reste de pile, 0-100. */
  battery: number;
  /** Ce qui est enfoui. */
  buried: Buried[];
  /** Fouilles restantes. */
  digs: number;
  /** La chaleur : à quelle distance est le plus proche, 0-1. 1 = dessus. */
  warmth: number;
  /** Trouvé ? */
  found: boolean;
  /** Fouilles dans le vide, ou sur un leurre. */
  misses: number;
  /** Le joueur s'est-il arrêté ? */
  quit: boolean;
  elapsed: number;
  limit: number;
  notes: string[];
}

/** Pile consommée par milliseconde, au rayon de référence. */
const DRAIN = 0.0055;
/** Rayon de référence : au-delà, la pile part plus vite. */
const BASE_RADIUS = 0.16;

/** Distance entre deux points de la pièce. */
function reach(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export const attic = registerMiniGame<AtticState>({
  id: 'attic',
  category: 'carrière',
  label: 'Chercher dans le noir',
  goal: 'Déplace la lampe. Elle s’avive quand tu approches. Tu n’as que trois fouilles.',
  duration: 34_000,

  setup(rng: Rng, ctx) {
    const limit = Math.round(34_000 * ctx.grace.time);
    const hardness = ctx.difficulty / 100;
    const buried: Buried[] = [];
    // Le bon objet, jamais au centre ni contre un bord : ni trivial, ni injuste.
    buried.push({
      x: rng.float(0.15, 0.85),
      y: rng.float(0.15, 0.85),
      real: true,
      dug: false,
    });
    // Les leurres : ils répondent à la chaleur comme le bon, et n'en sont pas.
    const decoys = 1 + Math.round(hardness * 3);
    for (let i = 0; i < decoys; i++) {
      buried.push({
        x: rng.float(0.1, 0.9),
        y: rng.float(0.1, 0.9),
        real: false,
        dug: false,
      });
    }
    return {
      lampX: 0.5,
      lampY: 0.5,
      radius: BASE_RADIUS,
      battery: 100,
      buried,
      // Le personnage sait où l'on range les choses : c'est la seule marge
      // qu'il donne, et elle ne cherche pas à sa place.
      digs: ctx.grace.insight ? 4 : 3,
      warmth: 0,
      found: false,
      misses: 0,
      quit: false,
      elapsed: 0,
      limit,
      notes: [],
    };
  },

  step(s, input, dt) {
    if (s.found || s.quit || s.elapsed >= s.limit || s.battery <= 0) return s;
    s.elapsed += dt;
    if (input.quit) { s.quit = true; s.notes.push('abandon'); return s; }

    if (input.x !== undefined) s.lampX = Math.min(1, Math.max(0, input.x));
    if (input.y !== undefined) s.lampY = Math.min(1, Math.max(0, input.y));

    // Le rayon : maintenir ouvre la lampe, lâcher la referme. Voir loin ou
    // voir longtemps — c'est le seul réglage, et il coûte.
    const wanted = input.hold ? BASE_RADIUS * 2.1 : BASE_RADIUS * 0.7;
    s.radius += (wanted - s.radius) * Math.min(1, dt / 220);
    s.battery = Math.max(0, s.battery - DRAIN * (s.radius / BASE_RADIUS) * dt);

    // La chaleur : le plus proche de ce qui n'a pas encore été fouillé. Les
    // leurres comptent, et c'est exactement ce qui rend le jeu difficile.
    const live = s.buried.filter((b) => !b.dug);
    const nearest = live.reduce(
      (best, b) => Math.min(best, reach(s.lampX, s.lampY, b.x, b.y)), 9,
    );
    s.warmth = Math.max(0, 1 - nearest / 0.55);

    // Fouiller : un appui bref, et il en reste peu.
    if (input.tap && s.digs > 0) {
      s.digs -= 1;
      const hit = live.find((b) => reach(s.lampX, s.lampY, b.x, b.y) <= 0.075);
      if (hit) {
        hit.dug = true;
        if (hit.real) {
          s.found = true;
          s.notes.push('trouvé');
        } else {
          s.misses += 1;
          s.notes.push('rien de ce côté');
        }
      } else {
        s.misses += 1;
        s.notes.push('rien du tout');
      }
    }
    return s;
  },

  finished(s) {
    return s.found || s.quit || s.elapsed >= s.limit || s.battery <= 0 || s.digs <= 0;
  },

  score(s): MiniGameResult {
    const real = s.buried.find((b) => b.real);
    const closeness = real
      ? Math.max(0, 1 - reach(s.lampX, s.lampY, real.x, real.y) / 0.7)
      : 0;
    // Trouver vaut l'essentiel ; s'en être approché vaut quelque chose, parce
    // qu'une recherche méthodique interrompue par la pile n'est pas une faute.
    const quality = Math.max(0, Math.min(1,
      (s.found ? 0.68 : 0)
      + closeness * 0.2
      + (s.battery / 100) * 0.12
      - s.misses * 0.09
      - (s.quit ? 0.2 : 0),
    ));
    const notes: string[] = [];
    if (s.found) notes.push(s.misses === 0 ? 'Trouvé du premier coup.' : `Trouvé après ${s.misses} fouille(s) pour rien.`);
    else if (s.battery <= 0) notes.push('La pile a lâché.');
    else if (s.digs <= 0) notes.push('Plus rien à retourner.');
    else if (s.quit) notes.push('Tu as laissé tomber.');
    else notes.push('Le temps a manqué.');
    return {
      success: s.found,
      score: Math.round((s.found ? 700 : 0) + closeness * 200 + s.battery - s.misses * 60),
      quality,
      mistakes: s.misses,
      time: s.elapsed,
      notes,
    };
  },
});
