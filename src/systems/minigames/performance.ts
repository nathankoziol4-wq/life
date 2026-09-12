/**
 * Mini-jeu : tenir devant un public.
 *
 * Un seul jeu pour les cinq métiers de scène, parce qu'ils demandent la même
 * chose : **rester juste sous la pression, et savoir quand oser**.
 *
 * Le joueur suit une ligne d'intention qui bouge — la note d'une phrase
 * musicale, l'émotion d'une réplique, l'effort d'une action, le ton d'un
 * discours — avec un curseur qu'il déplace. Rester dans la zone remplit la
 * justesse. En sortir la fait tomber, et le public le sent.
 *
 * Par-dessus vient l'arbitrage qui empêche le jeu d'être un simple exercice
 * d'adresse : de temps en temps s'ouvre **un moment**. Le tenir — maintenir
 * l'appui pendant qu'il dure — rapporte beaucoup et exige d'être très juste
 * à cet instant précis. Le rater coûte plus cher qu'un moment ordinaire.
 * Ne rien tenter du tout produit une prestation propre et sans intérêt, ce
 * qui, dans ces métiers, est le pire des résultats.
 *
 * Rien de tout cela ne décrit une technique réelle : c'est une ligne, un
 * curseur et une jauge.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

/** Un moment saillant : ce qui distingue une prestation d'une exécution. */
export interface Beat {
  /** Début, en millisecondes depuis le lancement. */
  at: number;
  /** Durée pendant laquelle il faut tenir. */
  span: number;
  /** Ce qu'il rapporte s'il est tenu. */
  worth: number;
  /** Tenté par le joueur ? */
  attempted: boolean;
  /** Réussi ? */
  landed: boolean;
  /** Justesse cumulée pendant le moment. */
  held: number;
  /** Temps déjà passé dedans. */
  elapsed: number;
}

export interface PerformanceState {
  /** Ce que le joueur doit suivre, 0-1. */
  line: number;
  /** Où en est le curseur du joueur, 0-1. */
  cursor: number;
  /** Vitesse actuelle de la ligne, par milliseconde. */
  drift: number;
  /** Largeur de la zone considérée comme juste, 0-1. */
  band: number;
  /** Justesse instantanée, 0-100. */
  accuracy: number;
  /** Ce que le public ressent, 0-100. */
  audience: number;
  /** Les moments de la prestation. */
  beats: Beat[];
  /** Le moment en cours, s'il y en a un. */
  active: number | null;
  /** Sorties de zone. */
  slips: number;
  elapsed: number;
  limit: number;
  /** Le joueur a-t-il abandonné ? */
  bailed: boolean;
  /** Ce qui s'est passé, pour le récit. */
  notes: string[];
}

/** Le contexte attendu : ce que la discipline demande. */
export interface PerformanceSetup {
  /** Nom de l'exercice, pour l'écran. */
  label: string;
  /** Ce qu'on suit : « la note », « l'émotion », « l'effort »… */
  lineName: string;
  /** Ce qu'est un moment : « une envolée », « une réplique »… */
  beatName: string;
}

const DEFAULT_SETUP: PerformanceSetup = {
  label: 'Prestation', lineName: 'la ligne', beatName: 'un moment',
};

export const performance = registerMiniGame<PerformanceState>({
  id: 'performance',
  category: 'carrière',
  label: 'Tenir devant un public',
  goal: 'Reste sur la ligne, et tiens les moments qui comptent.',
  duration: 16_000,

  setup(rng: Rng, ctx) {
    const limit = Math.round(16_000 * ctx.grace.time);
    // La ligne bouge d'autant plus vite que l'exercice est difficile ; la
    // zone juste s'élargit avec le métier du personnage. C'est la règle
    // habituelle : le personnage donne de la marge, il ne joue pas.
    const hardness = ctx.difficulty / 100;
    const beats: Beat[] = [];
    const count = 3 + Math.round(hardness * 3);
    for (let i = 0; i < count; i++) {
      // Les moments sont espacés, jamais collés, et jamais dans la première
      // seconde : il faut avoir eu le temps de trouver la ligne.
      const slot = limit / (count + 1);
      beats.push({
        at: Math.round(slot * (i + 1) + rng.float(-slot * 0.22, slot * 0.22)),
        span: Math.round(rng.float(900, 1700) * (1.35 - hardness * 0.4)),
        worth: rng.float(0.7, 1.4),
        attempted: false, landed: false, held: 0, elapsed: 0,
      });
    }
    return {
      line: rng.float(0.3, 0.7),
      cursor: 0.5,
      drift: rng.float(0.00006, 0.00016) * (0.6 + hardness) * ctx.grace.pressure,
      band: 0.1 + (1 - hardness) * 0.06 + (ctx.grace.tolerance / 100) * 0.05,
      accuracy: 60,
      audience: 45,
      beats,
      active: null,
      slips: 0,
      elapsed: 0,
      limit,
      bailed: false,
      notes: [],
    };
  },

  step(s, input, dt) {
    if (s.bailed || s.elapsed >= s.limit) return s;
    s.elapsed += dt;
    if (input.quit) { s.bailed = true; return s; }

    // La ligne dérive et rebondit sur les bords : elle ne s'arrête jamais.
    s.line += s.drift * dt;
    if (s.line < 0.08) { s.line = 0.08; s.drift = Math.abs(s.drift); }
    if (s.line > 0.92) { s.line = 0.92; s.drift = -Math.abs(s.drift); }
    // De temps en temps elle change d'avis, à intervalle fixe : sans cela on
    // la suivrait sans regarder après dix secondes. Le retournement est
    // déterministe parce que le hasard d'un mini-jeu vit dans `setup` — c'est
    // ce qui rend une partie rejouable à l'identique.
    if (s.elapsed % 2600 < dt) s.drift = -s.drift;

    if (input.x !== undefined) s.cursor = Math.min(1, Math.max(0, input.x));

    // La justesse suit l'écart, avec de l'inertie : un écart bref ne ruine
    // pas une prestation, un écart tenu si.
    const gap = Math.abs(s.cursor - s.line);
    const inBand = gap <= s.band;
    const target = inBand ? 100 - (gap / s.band) * 25 : Math.max(0, 62 - (gap - s.band) * 220);
    s.accuracy += (target - s.accuracy) * Math.min(1, dt / 260);
    if (!inBand && s.accuracy < 45) {
      // Une sortie n'est comptée qu'une fois : on ne punit pas image par image.
      const last = s.notes[s.notes.length - 1];
      if (last !== 'écart') { s.slips += 1; s.notes.push('écart'); }
    } else if (inBand && s.notes[s.notes.length - 1] === 'écart') {
      s.notes.push('rattrapé');
    }

    // Les moments.
    const current = s.beats.findIndex(
      (b) => s.elapsed >= b.at && s.elapsed < b.at + b.span,
    );
    s.active = current >= 0 ? current : null;
    if (current >= 0) {
      const beat = s.beats[current];
      beat.elapsed += dt;
      if (input.hold) {
        beat.attempted = true;
        // Ce qui compte pendant un moment, c'est d'être juste *maintenant*.
        beat.held += (s.accuracy / 100) * dt;
      }
      if (beat.elapsed >= beat.span && !beat.landed) {
        const ratio = beat.held / beat.span;
        beat.landed = beat.attempted && ratio > 0.62;
        if (beat.landed) {
          s.audience = Math.min(100, s.audience + 9 * beat.worth);
          s.notes.push('moment tenu');
        } else if (beat.attempted) {
          s.audience = Math.max(0, s.audience - 7 * beat.worth);
          s.notes.push('moment manqué');
        }
      }
    }

    // Le public suit la justesse, lentement.
    const pull = (s.accuracy - 55) * 0.0016 * dt;
    s.audience = Math.min(100, Math.max(0, s.audience + pull));
    return s;
  },

  finished(s) {
    return s.bailed || s.elapsed >= s.limit;
  },

  score(s): MiniGameResult {
    const attempted = s.beats.filter((b) => b.attempted).length;
    const landed = s.beats.filter((b) => b.landed).length;
    // Une prestation propre où l'on n'a rien tenté n'est pas une bonne
    // prestation : c'est la règle de ces métiers, et le score la porte.
    const boldness = s.beats.length > 0 ? attempted / s.beats.length : 0;
    const success = s.audience >= 52 && !s.bailed;
    const quality = Math.max(0, Math.min(1,
      (s.audience / 100) * 0.6
      + (landed / Math.max(1, s.beats.length)) * 0.28
      + boldness * 0.12
      - (s.bailed ? 0.35 : 0),
    ));
    const notes: string[] = [];
    if (s.bailed) notes.push('Tu as coupé court.');
    if (landed > 0) notes.push(`${landed} moment(s) tenu(s) sur ${s.beats.length}.`);
    if (attempted === 0) notes.push('Tu n’as rien tenté. C’était propre, et c’est tout.');
    if (s.slips > 3) notes.push(`${s.slips} sorties de ligne.`);
    return {
      success,
      score: Math.round(s.audience * 10 + landed * 40),
      quality,
      mistakes: s.slips + (attempted - landed),
      time: s.elapsed,
      notes,
    };
  },
});

export { DEFAULT_SETUP as defaultPerformanceSetup };
