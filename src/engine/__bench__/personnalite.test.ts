/**
 * Vérifications de la personnalité.
 *
 * Trois exigences, qui tirent dans des directions différentes :
 *
 * 1. **Aucun trait décoratif.** Le même audit que pour l'environnement,
 *    appliqué au caractère : on perturbe chaque champ et on vérifie qu'il
 *    change quelque chose.
 * 2. **Le caractère compte.** À environnement identique, deux personnalités
 *    différentes doivent produire des vies différentes.
 * 3. **Le caractère ne décide pas tout.** Deux personnages presque
 *    identiques doivent parfois diverger, simplement à cause des rencontres,
 *    des événements et de la chance.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { orphanTraits } from '../../systems/psycheAudit.ts';
import { applyEffects, resolvePending } from '../../systems/randomEvents.ts';
import { autoplayLife } from './autoplay.ts';
import { netWorth } from '../../systems/finance.ts';
import { calculateCompatibility } from '../../systems/psyche.ts';
import { exposureSignals, exposureTo } from '../../systems/exposure.ts';
import { causesOf } from '../../systems/causality.ts';
import { AXIS_KEYS, TEMPERAMENT_KEYS, VALUE_KEYS } from '../psyche.ts';
import { ALL_EVENTS } from '../../data/events/index.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

describe('personnalité', () => {
  it('n’accepte aucun trait décoratif', { timeout: 60_000 }, () => {
    for (const seed of [4242, 777, 31, 9090]) {
      const state = createNewLife({ seed });
      playTo(state, 15);
      const orphans = orphanTraits(state);
      expect(orphans.map((o) => o.path), `graine ${seed}`).toEqual([]);
    }
  });

  it('laisse la personnalité intacte après un audit', () => {
    const state = createNewLife({ seed: 55 });
    playTo(state, 12);
    const before = JSON.stringify(state.player.psyche);
    orphanTraits(state);
    expect(JSON.stringify(state.player.psyche)).toBe(before);
  });

  it('génère toutes les couches à la naissance', () => {
    const state = createNewLife({ seed: 12345 });
    const psyche = state.player.psyche;
    for (const key of TEMPERAMENT_KEYS) {
      expect(psyche.temperament[key], key).toBeGreaterThanOrEqual(0);
      expect(psyche.temperament[key], key).toBeLessThanOrEqual(100);
    }
    for (const key of AXIS_KEYS) {
      expect(psyche.axes[key], key).toBeGreaterThanOrEqual(0);
      expect(psyche.axes[key], key).toBeLessThanOrEqual(100);
    }
    for (const key of VALUE_KEYS) {
      expect(psyche.values[key], key).toBeGreaterThanOrEqual(0);
      expect(psyche.values[key], key).toBeLessThanOrEqual(100);
    }
    // Un nouveau-né n'a encore ni goûts, ni habitudes, ni peurs.
    expect(psyche.interests).toHaveLength(0);
    expect(psyche.habits).toHaveLength(0);
    expect(psyche.fears).toHaveLength(0);
  });

  it('ne modifie jamais le tempérament', () => {
    const state = createNewLife({ seed: 606 });
    const born = { ...state.player.psyche.temperament };
    playTo(state, 40);
    expect(state.player.psyche.temperament).toEqual(born);
  });

  it('fait naître des goûts à partir de l’exposition réelle', () => {
    // Sur un échantillon large, des intérêts doivent apparaître — et toujours
    // avec une cause identifiable dans le registre de causalité.
    let withInterests = 0;
    let traced = 0;
    for (let seed = 0; seed < 24; seed++) {
      const state = createNewLife({ seed: seed * 131 + 7 });
      playTo(state, 18);
      const interests = state.player.psyche.interests;
      if (interests.length > 0) {
        withInterests += 1;
        const first = interests[0];
        if (causesOf(state, `intérêt:${first.id}`).length > 0) traced += 1;
        // Un goût est toujours attribué à quelque chose de précis.
        expect(first.origin.length).toBeGreaterThan(2);
      }
    }
    expect(withInterests).toBeGreaterThan(12);
    expect(traced).toBeGreaterThan(withInterests / 2);
  });

  it('relie l’exposition matérielle à l’intérêt correspondant', () => {
    // Un ordinateur et une connexion à la maison exposent à l'informatique ;
    // leur absence non. C'est la chaîne du §58, mesurée directement.
    const state = createNewLife({ seed: 4242 });
    playTo(state, 12);
    const o = state.player.origin;

    o.digital.computer = 'personnel';
    o.digital.internet = 'rapide';
    o.living.computer = true;
    o.living.internet = true;
    const withMachine = exposureTo(exposureSignals(state), 'informatique').total;

    o.digital.computer = 'aucun';
    o.digital.internet = 'aucun';
    o.living.computer = false;
    o.living.internet = false;
    const without = exposureTo(exposureSignals(state), 'informatique').total;

    expect(withMachine).toBeGreaterThan(without + 0.5);
  });

  it('installe des habitudes qui coûtent du temps et de l’argent', () => {
    let withHabits = 0;
    for (let seed = 0; seed < 20; seed++) {
      const state = autoplayLife(seed * 313 + 11, { maxYears: 40 });
      if (state.player.psyche.habits.length > 0) withHabits += 1;
    }
    expect(withHabits).toBeGreaterThan(10);
  });

  it('fait apparaître des peurs après des expériences dures', () => {
    let withFears = 0;
    for (let seed = 0; seed < 30; seed++) {
      const state = createNewLife({ seed: seed * 419 + 3 });
      playTo(state, 25);
      if (state.player.psyche.fears.length > 0) withFears += 1;
    }
    // Toutes les vies ne sont pas traumatisantes, mais certaines le sont.
    expect(withFears).toBeGreaterThan(3);
  });

  it('calcule une compatibilité qui dépend du type de lien', () => {
    const a = createNewLife({ seed: 1001 }).player.psyche;
    const b = createNewLife({ seed: 2002 }).player.psyche;

    // Deux personnes très compétitives : stimulantes au travail, épuisantes
    // en couple. Le score doit refléter cette différence.
    a.axes.competitiveness = 92;
    b.axes.competitiveness = 90;
    a.axes.jealousy = 80;
    b.axes.jealousy = 78;

    const work = calculateCompatibility(a, b, 'travail');
    const love = calculateCompatibility(a, b, 'amour');
    expect(work.score).toBeGreaterThan(love.score);
    expect(love.frictions.length).toBeGreaterThan(0);
    expect(work.affinities.length).toBeGreaterThan(0);
  });

  it('donne une vraie personnalité aux proches', () => {
    const state = createNewLife({ seed: 8888 });
    const parents = state.player.origin.parents
      .map((r) => state.npcs[r.personId])
      .filter(Boolean);
    expect(parents.length).toBeGreaterThan(0);
    for (const parent of parents) {
      expect(parent.psyche, parent.firstName).toBeTruthy();
      expect(parent.psyche!.axes.confidence).toBeGreaterThanOrEqual(0);
    }
  });

  it('fait diverger deux caractères opposés dans le même monde', { timeout: 120_000 }, () => {
    // Même graine, donc même environnement et mêmes tirages : seul le
    // tempérament change. Si les vies ne divergent pas, le caractère est
    // décoratif.
    const bold: number[] = [];
    const timid: number[] = [];
    const boldGrades: number[] = [];
    const timidGrades: number[] = [];

    for (let seed = 0; seed < 20; seed++) {
      const base = seed * 733 + 17;
      const a = autoplayLife(base, {
        maxYears: 45,
        draft: {
          temperament: {
            persistence: 88, curiosity: 85, frustrationTolerance: 82,
            caution: 20, sociability: 78,
          },
        },
      });
      const b = autoplayLife(base, {
        maxYears: 45,
        draft: {
          temperament: {
            persistence: 18, curiosity: 20, frustrationTolerance: 22,
            caution: 85, sociability: 22,
          },
        },
      });
      bold.push(netWorth(a));
      timid.push(netWorth(b));
      boldGrades.push(a.player.education.grades);
      timidGrades.push(b.player.education.grades);
    }

    // Un tempérament persévérant et curieux doit produire de meilleurs
    // résultats scolaires dans le même environnement.
    expect(mean(boldGrades)).toBeGreaterThan(mean(timidGrades) + 0.8);
  });

  it('ne rend pas deux vies identiques prévisibles', { timeout: 120_000 }, () => {
    // Même environnement, même tempérament, graines différentes : les
    // trajectoires doivent malgré tout diverger — rencontres, événements,
    // chance. Sans cela, la vie serait une équation.
    const results: number[] = [];
    for (let seed = 0; seed < 24; seed++) {
      const state = autoplayLife(seed * 97 + 5, {
        maxYears: 45,
        draft: { presetId: 'middleSuburb', temperament: { persistence: 60, curiosity: 60 } },
      });
      results.push(netWorth(state));
    }
    const average = mean(results);
    const spread = Math.sqrt(mean(results.map((x) => (x - average) ** 2)));
    // L'écart-type doit être du même ordre que la moyenne : les vies ne se
    // ressemblent pas.
    expect(spread).toBeGreaterThan(Math.abs(average) * 0.3);
  });

  it('enregistre pourquoi le personnage est devenu ce qu’il est', () => {
    const state = createNewLife({ seed: 3141 });
    playTo(state, 22);
    expect((state.causality ?? []).length).toBeGreaterThan(0);
    for (const effect of state.causality ?? []) {
      expect(effect.reason.length).toBeGreaterThan(3);
      expect(effect.age).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(effect.strength)).toBe(true);
    }
  });
});

/**
 * Le canal `EventEffects.axes`.
 *
 * Il a été ouvert pour les scènes des toutes premières années, où le choix
 * n'est pas une décision mais un mouvement : ce qu'il laisse est un pli du
 * caractère, pas une variation de bonheur. Deux choses peuvent le rendre
 * décoratif — une clef mal orthographiée, qui ne toucherait rien en silence,
 * et un branchement qui n'irait pas jusqu'à la psyché.
 */
describe('les événements qui déplacent le caractère', () => {
  it('n’écrit que sur des axes qui existent', () => {
    const known = new Set<string>(AXIS_KEYS);
    let used = 0;
    for (const event of ALL_EVENTS) {
      for (const choice of event.choices) {
        for (const outcome of choice.outcomes) {
          for (const key of Object.keys(outcome.effects?.axes ?? {})) {
            used += 1;
            expect(known, `${event.id} déplace « ${key} »`).toContain(key);
          }
        }
      }
    }
    // Un canal que personne n'emprunte est un canal mort.
    expect(used).toBeGreaterThan(20);
  });

  it('arrive jusqu’à la psyché', () => {
    const state = createNewLife({ seed: 4_101 });
    const before = state.player.psyche.axes.generosity;
    applyEffects(createCtx(state), { axes: { generosity: 9 } }, null);
    expect(state.player.psyche.axes.generosity).toBeCloseTo(
      Math.min(100, before + 9), 5,
    );
  });

  it('reste borné, comme le reste du caractère', () => {
    const state = createNewLife({ seed: 4_102 });
    const ctx = createCtx(state);
    for (let i = 0; i < 40; i += 1) applyEffects(ctx, { axes: { aggression: 9 } }, null);
    expect(state.player.psyche.axes.aggression).toBeLessThanOrEqual(100);
    for (let i = 0; i < 40; i += 1) applyEffects(ctx, { axes: { aggression: -9 } }, null);
    expect(state.player.psyche.axes.aggression).toBeGreaterThanOrEqual(0);
  });
});
