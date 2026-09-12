/**
 * Mini-jeu : avancer sans se faire remarquer.
 *
 * Ce que le joueur contrôle : **quand avancer et quand s'arrêter**. Avancer
 * fait monter l'attention ; s'arrêter la fait redescendre, mais consomme le
 * temps dont on dispose. Tout le jeu est dans cet arbitrage, et il n'a pas de
 * réponse unique : foncer marche parfois, attendre aussi, et la bonne mesure
 * dépend de ce qui se passe à l'écran à cet instant.
 *
 * Trois choses le rendent jouable plutôt que mécanique :
 *
 * - **le regard** : l'attention ne monte pas au même rythme selon qu'on est
 *   observé ou non, et l'on voit venir le changement une seconde à l'avance ;
 * - **les passages** : ils arrêtent la marche, et il faut choisir. Attendre
 *   les ouvre sans bruit mais coûte près de deux secondes ; pousser dessus va
 *   trois fois plus vite et s'entend de loin ;
 * - **le retrait** : à tout moment on peut renoncer et repartir avec ce qu'on
 *   a. Une mission à moitié faite vaut mieux qu'une mission perdue, et savoir
 *   s'arrêter fait partie du métier.
 *
 * **Rien ici ne décrit une méthode réelle.** Il n'y a ni lieu, ni dispositif,
 * ni procédure : une barre de progression, une jauge d'attention et un bouton
 * qu'on maintient. On ne peut rien en tirer d'applicable, et c'est voulu.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

/** Un point qu'il faut franchir, et qui bloque tant qu'il n'est pas ouvert. */
export interface Gate {
  /** Position sur la progression, 0-1. */
  at: number;
  /** Déjà franchi ? */
  passed: boolean;
  /** Franchi en attendant son moment, plutôt qu'en forçant ? */
  clean: boolean;
  /** Temps passé à l'arrêt devant, en millisecondes. */
  waited: number;
  /** Temps passé à pousser dessus. */
  forced: number;
}

/** Temps d'arrêt qui ouvre un passage proprement. */
const WAIT_MS = 1600;
/** Temps qu'il faut pour le forcer. Plus court, et bien plus bruyant. */
const FORCE_MS = 600;
/** Progression gagnée par milliseconde de marche. */
const GAIT = 0.000048;

export interface InfiltrationState {
  /** La progression, 0-1. */
  progress: number;
  /** L'attention, 0-100. À cent, c'est fini. */
  heat: number;
  /** Est-on regardé en ce moment ? */
  watched: boolean;
  /** Le regard va-t-il changer bientôt ? */
  turning: boolean;
  /** Prochain changement de regard, en millisecondes. */
  nextTurn: number;
  /** Le joueur avance-t-il en ce moment ? */
  moving: boolean;
  /** Les passages. */
  gates: Gate[];
  /** Repéré ? */
  burned: boolean;
  /** Le joueur s'est-il retiré de lui-même ? */
  pulled: boolean;
  /** Arrivé au bout ? */
  arrived: boolean;
  /** Combien de fois l'attention a frôlé le maximum. */
  scares: number;
  elapsed: number;
  limit: number;
  notes: string[];
}

export const infiltration = registerMiniGame<InfiltrationState>({
  id: 'infiltration',
  category: 'carrière',
  label: 'Avancer sans se faire remarquer',
  goal: 'Maintiens pour avancer, lâche pour laisser retomber l’attention. Devant un passage : attendre, ou pousser.',
  duration: 30_000,

  setup(rng: Rng, ctx) {
    const limit = Math.round(30_000 * ctx.grace.time);
    const hardness = ctx.difficulty / 100;
    const gates: Gate[] = [];
    const count = 2 + Math.round(hardness * 2);
    for (let i = 0; i < count; i++) {
      const slot = 1 / (count + 1);
      gates.push({
        at: slot * (i + 1) + rng.float(-slot * 0.18, slot * 0.18),
        passed: false,
        clean: false,
        waited: 0,
        forced: 0,
      });
    }
    return {
      progress: 0,
      heat: 12,
      watched: rng.chance(0.35),
      turning: false,
      nextTurn: Math.round(rng.float(1800, 4200)),
      moving: false,
      gates,
      burned: false,
      pulled: false,
      arrived: false,
      scares: 0,
      elapsed: 0,
      limit,
      notes: [],
    };
  },

  step(s, input, dt) {
    if (s.burned || s.pulled || s.arrived || s.elapsed >= s.limit) return s;
    s.elapsed += dt;
    if (input.quit) { s.pulled = true; s.notes.push('retrait'); return s; }

    // Le regard alterne. On l'annonce une seconde à l'avance : sans cela, le
    // jeu serait un tirage déguisé et le joueur ne déciderait rien.
    s.nextTurn -= dt;
    s.turning = s.nextTurn < 1000;
    if (s.nextTurn <= 0) {
      s.watched = !s.watched;
      // Déterministe : le hasard d'un mini-jeu vit dans `setup`, sinon une
      // partie ne serait pas rejouable à l'identique.
      s.nextTurn = s.watched ? 2200 : 3400;
    }

    // Le prochain passage arrête la marche tant qu'il n'est pas ouvert.
    // Sans ce blocage, un passage était infranchissable : à l'arrêt on ne
    // l'atteignait jamais, et en marchant on le traversait toujours en force.
    const gate = s.gates.find((g) => !g.passed);
    const ceiling = gate ? gate.at : 1;

    s.moving = Boolean(input.hold);
    if (s.moving) {
      s.progress = Math.min(ceiling, s.progress + GAIT * dt);
      s.heat = Math.min(100, s.heat + (s.watched ? 0.021 : 0.0062) * dt);
    } else {
      s.heat = Math.max(0, s.heat - (s.watched ? 0.0042 : 0.011) * dt);
    }

    if (s.heat > 82) {
      const last = s.notes[s.notes.length - 1];
      if (last !== 'alerte') { s.scares += 1; s.notes.push('alerte'); }
    } else if (s.heat < 60 && s.notes[s.notes.length - 1] === 'alerte') {
      s.notes.push('retombé');
    }

    if (s.heat >= 100) {
      s.burned = true;
      s.notes.push('repéré');
      return s;
    }

    // Devant un passage, deux façons de faire, et c'est le seul vrai choix du
    // jeu : **attendre** son moment — long, silencieux, l'attention retombe
    // pendant ce temps — ou **forcer** — trois fois plus rapide, et tout le
    // monde l'entend.
    if (gate && s.progress >= gate.at - 1e-9) {
      if (s.moving) {
        gate.forced += dt;
        if (gate.forced >= FORCE_MS) {
          gate.passed = true;
          gate.clean = false;
          s.heat = Math.min(100, s.heat + 22);
          s.notes.push('passage forcé');
        }
      } else {
        gate.waited += dt;
        if (gate.waited >= WAIT_MS) {
          gate.passed = true;
          gate.clean = true;
          s.heat = Math.max(0, s.heat - 6);
          s.notes.push('passage franchi');
        }
      }
    }

    if (s.progress >= 1) { s.arrived = true; s.notes.push('arrivé'); }
    return s;
  },

  finished(s) {
    return s.burned || s.pulled || s.arrived || s.elapsed >= s.limit;
  },

  score(s): MiniGameResult {
    const clean = s.gates.filter((g) => g.clean).length;
    const forced = s.gates.filter((g) => g.passed && !g.clean).length;
    // Se retirer à temps n'est pas une réussite, mais ce n'est pas non plus
    // un échec : on garde ce qu'on a fait. Être repéré efface presque tout.
    const quality = Math.max(0, Math.min(1,
      s.progress * 0.5
      + (clean / Math.max(1, s.gates.length)) * 0.28
      + (s.arrived ? 0.18 : 0)
      + Math.max(0, (100 - s.heat) / 100) * 0.1
      - forced * 0.07
      - s.scares * 0.04
      - (s.burned ? 0.55 : 0)
      - (s.pulled ? 0.12 : 0),
    ));
    const notes: string[] = [];
    if (s.burned) notes.push('Repéré avant d’arriver.');
    else if (s.pulled) notes.push(`Retrait volontaire à ${Math.round(s.progress * 100)} %.`);
    else if (s.arrived) notes.push('Arrivé sans être vu.');
    else notes.push(`Le temps a manqué à ${Math.round(s.progress * 100)} %.`);
    if (forced > 0) notes.push(`${forced} passage(s) forcé(s).`);
    if (clean === s.gates.length && s.gates.length > 0) notes.push('Tous les passages franchis proprement.');
    return {
      success: s.arrived && !s.burned,
      score: Math.round(s.progress * 600 + clean * 90 - s.scares * 40 - (s.burned ? 300 : 0)),
      quality,
      mistakes: forced + s.scares + (s.burned ? 2 : 0),
      time: s.elapsed,
      notes,
    };
  },
});
