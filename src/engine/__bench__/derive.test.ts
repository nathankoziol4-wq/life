/**
 * Vérifications de la dérive des statistiques.
 *
 * Ce fichier est né d'une mesure, pas d'une intuition. À quarante ans,
 * l'intelligence moyenne était de 94,7 et le karma de 99,9 : deux axes du jeu
 * ne distinguaient plus personne, et la moyenne scolaire qui en dépend
 * s'établissait à 15,2 sur 20 — au point que bourses, admissions et
 * orientation ne voulaient plus rien dire.
 *
 * La cause n'était pas une formule mais leur nombre : sept endroits
 * différents faisaient monter l'intelligence, vingt-six le karma, chacun avec
 * ses règles ou sans règle. Le catalogue d'événements à lui seul donnait +358
 * d'intelligence contre −9.
 *
 * Ce qui est vérifié ici :
 *
 * 1. **une statistique ne peut plus être maximisée en attendant** — vivre
 *    longtemps ne remplace pas être quelqu'un ;
 * 2. **les personnages restent différents** — c'est l'écart entre eux qui
 *    donne son sens à tout ce qui les lit ;
 * 3. **le plafond cognitif est réellement un plafond** ;
 * 4. **la moyenne scolaire est une moyenne** — un élève ordinaire obtient une
 *    note ordinaire, et le haut de l'échelle reste atteignable en travaillant.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { cognitiveCeilingOf, shiftStat } from '../../systems/stats.ts';
import { cognitiveCeiling, computeGrade } from '../probability.ts';

/** Fait vivre une cohorte et relève ce qu'elle est devenue à un âge donné. */
function cohort(at: number, size = 90): GameState[] {
  const out: GameState[] = [];
  for (let seed = 5_000; out.length < size && seed < 5_000 + size * 6; seed++) {
    const state = createNewLife({ seed });
    for (let age = 0; age < at && !state.gameOver; age++) {
      simulateYear(state);
      const ctx = createCtx(state);
      for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
      state.pending = [];
    }
    if (state.gameOver || !state.player.alive) continue;
    out.push(state);
  }
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const spread = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

describe('aucune statistique ne se maximise en attendant', () => {
  it('garde l’intelligence loin du maximum toute la vie', { timeout: 60_000 }, () => {
    const old = cohort(45);
    if (old.length < 20) return;
    const values = old.map((s) => s.player.stats.intelligence);
    // Elle valait 94,7 : le jeu récompensait la durée, pas la personne.
    expect(mean(values)).toBeLessThan(80);
    expect(mean(values)).toBeGreaterThan(45);
    // Et surtout : les gens restent différents les uns des autres.
    expect(spread(values)).toBeGreaterThan(6);
  });

  it('garde le karma loin du maximum toute la vie', { timeout: 60_000 }, () => {
    const old = cohort(45);
    if (old.length < 20) return;
    const values = old.map((s) => s.player.stats.karma);
    // Il valait 99,9 : l'axe moral était mort.
    expect(mean(values)).toBeLessThan(82);
    expect(spread(values)).toBeGreaterThan(3);
  });
});

describe('le plafond cognitif en est un', () => {
  it('dépend de l’héritage, du foyer et du goût de l’étude', () => {
    const modest = cognitiveCeiling({ potential: 35, culturalCapital: 30, studiousness: 20 });
    const favoured = cognitiveCeiling({ potential: 70, culturalCapital: 85, studiousness: 80 });
    expect(favoured).toBeGreaterThan(modest + 20);
    // Chacun des trois compte pour quelque chose.
    const base = { potential: 50, culturalCapital: 50, studiousness: 50 };
    expect(cognitiveCeiling({ ...base, potential: 80 })).toBeGreaterThan(cognitiveCeiling(base));
    expect(cognitiveCeiling({ ...base, culturalCapital: 90 })).toBeGreaterThan(cognitiveCeiling(base));
    expect(cognitiveCeiling({ ...base, studiousness: 90 })).toBeGreaterThan(cognitiveCeiling(base));
  });

  it('ne se dépasse pas, quelle que soit la source', () => {
    const state = createNewLife({ seed: 4_242 });
    const ceiling = cognitiveCeilingOf(state);
    state.player.stats.intelligence = Math.min(99, ceiling + 1);
    const before = state.player.stats.intelligence;
    // Cent apports d'affilée : c'est exactement ce qu'une vie longue produit.
    for (let i = 0; i < 100; i++) shiftStat(state, 'intelligence', 5);
    expect(state.player.stats.intelligence).toBe(before);
  });

  it('laisse monter tant qu’on est en dessous', () => {
    const state = createNewLife({ seed: 4_243 });
    state.player.stats.intelligence = 20;
    shiftStat(state, 'intelligence', 5);
    expect(state.player.stats.intelligence).toBeGreaterThan(20);
    expect(state.player.stats.intelligence).toBeLessThanOrEqual(cognitiveCeilingOf(state) + 0.01);
  });

  it('laisse toujours redescendre', () => {
    const state = createNewLife({ seed: 4_244 });
    const before = state.player.stats.intelligence;
    shiftStat(state, 'intelligence', -10);
    // On peut tout perdre : c'est ce qui rend une vie fragile.
    expect(state.player.stats.intelligence).toBeCloseTo(before - 10, 5);
  });
});

describe('le karma répond de moins en moins quand on est déjà à un bout', () => {
  it('ne rachète pas grand-chose quand on est déjà irréprochable', () => {
    const saint = createNewLife({ seed: 4_245 });
    const ordinary = createNewLife({ seed: 4_245 });
    saint.player.stats.karma = 95;
    ordinary.player.stats.karma = 50;
    const a = saint.player.stats.karma;
    const b = ordinary.player.stats.karma;
    shiftStat(saint, 'karma', 8);
    shiftStat(ordinary, 'karma', 8);
    expect(saint.player.stats.karma - a).toBeLessThan(ordinary.player.stats.karma - b);
  });

  it('ne noircit pas beaucoup quelqu’un de déjà noir', () => {
    const dark = createNewLife({ seed: 4_246 });
    const ordinary = createNewLife({ seed: 4_246 });
    dark.player.stats.karma = 6;
    ordinary.player.stats.karma = 50;
    const a = dark.player.stats.karma;
    const b = ordinary.player.stats.karma;
    shiftStat(dark, 'karma', -8);
    shiftStat(ordinary, 'karma', -8);
    expect(a - dark.player.stats.karma).toBeLessThan(b - ordinary.player.stats.karma);
  });
});

describe('la moyenne scolaire est une moyenne', () => {
  it('place un élève ordinaire au milieu de l’échelle', { timeout: 60_000 }, () => {
    const teens = cohort(16).filter(
      (s) => ['middle', 'high'].includes(s.player.education.stage),
    );
    if (teens.length < 20) return;
    const grades = teens.map((s) => s.player.education.grades);
    // Elle valait 15,2 : personne n'était mauvais, et 15 ne voulait rien dire.
    expect(mean(grades)).toBeLessThan(12.5);
    expect(mean(grades)).toBeGreaterThan(8);
    // Et une part réelle de la cohorte est en difficulté, sinon le
    // redoublement, les bourses et l'orientation n'ont pas d'objet.
    expect(grades.filter((g) => g < 10).length / grades.length).toBeGreaterThan(0.15);
  });

  it('laisse le haut de l’échelle atteignable à qui a tout pour', () => {
    // Le miroir du défaut d'origine : un barème qu'on ne peut plus saturer ne
    // vaut pas mieux qu'un barème qu'on sature sans rien faire.
    const excellent = computeGrade({
      intelligence: 88, discipline: 85, effort: 'hard', absences: 0,
      happiness: 78, stress: 10, difficulty: 1.2,
    });
    expect(excellent).toBeGreaterThan(14);
    const hopeless = computeGrade({
      intelligence: 30, discipline: 25, effort: 'none', absences: 6,
      happiness: 35, stress: 70, difficulty: 1.2,
    });
    expect(hopeless).toBeLessThan(5);
  });

  it('fait de l’effort un levier qui compte', () => {
    const args = {
      intelligence: 65, discipline: 60, absences: 0, happiness: 65,
      stress: 30, difficulty: 1,
    } as const;
    const lazy = computeGrade({ ...args, effort: 'none' });
    const normal = computeGrade({ ...args, effort: 'normal' });
    const hard = computeGrade({ ...args, effort: 'hard' });
    expect(normal).toBeGreaterThan(lazy + 2);
    expect(hard).toBeGreaterThan(normal + 1.5);
  });
});
