/**
 * Mini-jeu : le boîtier.
 *
 * **Ce qu'il remplace.** Le catalogue portait deux fois le même reproche :
 * « Vol de véhicule — un délit du catalogue résolu par tirage : aucun puzzle »
 * et « Vol à l'étalage — un délit du catalogue résolu par tirage ». Le joueur
 * appuyait sur une ligne, un dé décidait, il lisait le résultat.
 *
 * **Ce boîtier n'existe pas et ne peut exister.** C'est une exigence, pas une
 * coquetterie : le jeu ne doit reproduire aucune technique réelle, et
 * n'apprend donc rien qui puisse servir ailleurs. Ce qu'on manipule ici est un
 * objet inventé — des anneaux concentriques munis d'un repère, engrenés les
 * uns dans les autres — qui ne ressemble à aucun mécanisme véritable. Ce que
 * le joueur apprend est une propriété de ce jouet-là, et de rien d'autre.
 *
 * **Le puzzle.** Chaque anneau porte un repère qu'il faut ramener en haut.
 * Toucher un anneau l'avance d'un cran — **et entraîne tous ceux qui sont à
 * l'intérieur de lui.** Il y a donc un ordre, et un seul qui soit court :
 * régler d'abord l'anneau extérieur, que rien d'autre ne déplace, puis le
 * suivant, et ainsi de suite vers le centre. Qui tape au hasard défait ce
 * qu'il vient de faire.
 *
 * **Et l'on n'a pas tout le temps du monde.** Une jauge d'attention monte à
 * chaque geste, et plus vite pour les anneaux extérieurs, qui sont les plus
 * gros. Le jeu est donc de trouver le bon ordre *et* de ne pas s'y reprendre.
 *
 * **Ce qu'on ne voit pas.** Au-delà d'une certaine difficulté, les repères ne
 * s'affichent plus : on ne sait que si un anneau est en place ou non. Tenir le
 * doigt appuyé les fait réapparaître — au prix d'un peu d'attention. C'est le
 * second arbitrage, et il n'a pas de bonne réponse fixe.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameContext, MiniGameInput, MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

export interface RingsSetup {
  /** Combien d'anneaux. Trois est déjà un puzzle, cinq est long. */
  rings: number;
  /** Combien de crans par anneau. */
  notches: number;
  /** Les repères sont-ils cachés au départ ? */
  blind: boolean;
}

export interface RingsState {
  /** La position du repère de chaque anneau, du plus extérieur au centre. */
  rings: number[];
  notches: number;
  /** Ce qui monte à chaque geste. À cent, on est repéré. */
  attention: number;
  /** Combien de fois on a touché quelque chose. */
  taps: number;
  /** Les repères sont-ils lisibles en ce moment ? */
  blind: boolean;
  /** Combien on voit, 0 à 1. Monte tant qu'on écoute. */
  reveal: number;
  elapsed: number;
  limit: number;
  over: null | 'ouvert' | 'repéré' | 'temps' | 'renoncé';
  /** Le dernier anneau touché, pour l'écran. */
  lastTouched: number;
  /**
   * Le nombre de gestes qu'il aurait fallu, si l'on s'y prend dans l'ordre.
   *
   * Calculé une fois, à la mise en place : à la fin, les anneaux sont tous à
   * zéro et il n'y a plus rien à en déduire. C'est ce qui permet de noter
   * l'économie plutôt que la chance — quelqu'un qui martèle finit parfois par
   * tomber juste, et ne doit pas être noté comme celui qui a compris.
   */
  par: number;
}

/** Le nombre minimal de gestes, si l'on s'y prend dans le bon ordre. */
export function shortest(state: Pick<RingsState, 'rings' | 'notches'>): number {
  /*
   * Toucher l'anneau `i` avance `i` et tous ceux du dedans. On règle donc de
   * l'extérieur vers le centre : chaque anneau se met en place une fois pour
   * toutes, et ce qu'on lui a fait subir se retranche de ceux qui suivent.
   */
  let carried = 0;
  let total = 0;
  for (const mark of state.rings) {
    const need = ((state.notches - ((mark + carried) % state.notches)) % state.notches);
    total += need;
    carried += need;
  }
  return total;
}

/** Ce qu'un geste sur cet anneau-là coûte en attention. */
export function noiseOf(index: number, rings: number): number {
  // Les anneaux extérieurs sont les plus gros, donc les plus bruyants. C'est
  // ce qui punit de tâtonner par l'extérieur alors que c'est par là qu'il faut
  // commencer : l'ordre juste est aussi le plus cher si l'on s'y reprend.
  return 2.4 + (rings - index) * 0.9;
}

export const RINGS = registerMiniGame<RingsState>({
  id: 'rings',
  category: 'crime',
  label: 'Le boîtier',
  goal: 'Ramener tous les repères en haut. Un anneau entraîne ceux du dedans.',
  duration: 40_000,

  setup(rng: Rng, ctx: MiniGameContext): RingsState {
    const setup = (ctx.setup as RingsSetup | undefined)
      ?? { rings: 3, notches: 6, blind: false };
    const rings: number[] = [];
    for (let i = 0; i < setup.rings; i++) {
      // Jamais déjà en place : un anneau donné d'avance ne se joue pas.
      rings.push(rng.int(1, setup.notches - 1));
    }
    return {
      rings,
      par: shortest({ rings: [...rings], notches: setup.notches }),
      notches: setup.notches,
      attention: 0,
      taps: 0,
      blind: setup.blind,
      reveal: setup.blind ? 0 : 1,
      elapsed: 0,
      limit: 40_000 * (ctx.grace?.time ?? 1),
      over: null,
      lastTouched: -1,
    };
  },

  step(s: RingsState, input: MiniGameInput, dt: number): RingsState {
    if (s.over) return s;
    s.elapsed += dt;

    if (input.quit) {
      s.over = 'renoncé';
      return s;
    }

    /*
     * Écouter. Les repères réapparaissent peu à peu, et l'attention monte
     * pendant ce temps-là — lentement, mais elle monte. Un joueur qui écoute
     * tout du long finit repéré sans avoir rien touché.
     */
    if (input.hold && s.blind) {
      s.reveal = Math.min(1, s.reveal + dt / 900);
      s.attention += (dt / 1000) * 3.2;
    } else if (s.blind) {
      s.reveal = Math.max(0, s.reveal - dt / 1600);
    }

    if (input.tap) {
      const index = Math.min(
        s.rings.length - 1,
        Math.max(0, Math.floor((input.y ?? 0) * s.rings.length)),
      );
      // L'anneau touché, et tous ceux du dedans.
      for (let i = index; i < s.rings.length; i++) {
        s.rings[i] = ((s.rings[i] ?? 0) + 1) % s.notches;
      }
      s.attention += noiseOf(index, s.rings.length);
      s.taps += 1;
      s.lastTouched = index;
    }

    // L'attention retombe un peu quand on ne fait rien : s'arrêter pour
    // réfléchir est permis, s'arrêter longtemps ne l'est pas — le temps court.
    if (!input.tap && !input.hold) s.attention = Math.max(0, s.attention - (dt / 1000) * 1.1);

    if (s.rings.every((r) => r === 0)) s.over = 'ouvert';
    else if (s.attention >= 100) s.over = 'repéré';
    else if (s.elapsed >= s.limit) s.over = 'temps';
    return s;
  },

  finished: (s: RingsState) => s.over !== null,

  score(s: RingsState): MiniGameResult {
    const success = s.over === 'ouvert';
    /*
     * La qualité mesure l'économie de gestes, pas la vitesse : ce puzzle se
     * gagne en s'y prenant bien, et quelqu'un qui martèle au hasard finira
     * parfois par tomber juste. Il ne doit pas être noté comme celui qui a
     * compris.
     */
    const waste = success
      ? Math.min(1, Math.max(0, s.taps - s.par) / Math.max(1, s.par))
      : 1;
    const quality = success
      ? Math.max(0.15, 1 - s.attention / 150 - waste * 0.35)
      : 0;
    return {
      success,
      score: Math.round(quality * 100),
      quality,
      mistakes: Math.max(0, s.taps - 1),
      time: Math.round(s.elapsed),
    };
  },
});
