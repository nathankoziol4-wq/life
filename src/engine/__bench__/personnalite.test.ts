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
import { AMBITION_MAP, CAP, DECIDE_FROM, DECLARED } from '../../data/ambitions.ts';
import { HABIT_CEILING, HABIT_MAP } from '../../data/habits.ts';
import { habitHours } from '../../systems/psyche.ts';
import {
  advanceAmbitionsForTest, crowdedOut, dropAmbition, setAmbition, setAmbitionBlocker,
} from '../../systems/psyche.ts';

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

/**
 * **Se fixer un but.**
 *
 * Le catalogue disait : « affichées et alimentées, mais le joueur ne s'en fixe
 * aucune ». Mesuré sur 120 vies entières, 98 % finissent avec au moins une
 * ambition et quatre en médiane — c'est-à-dire le plafond. Le système était
 * donc parfaitement visible et entièrement subi.
 *
 * Et il portait un second trou, que le premier cachait. L'en-tête de
 * `advanceAmbitions` promet qu'« une ambition abandonnée laisse un regret, qui
 * pèse discrètement sur le bonheur pendant des années ». Ce regret n'existait
 * nulle part — mais surtout, **rien ne pouvait être abandonné** : le poids
 * dérivait vers l'accord entre l'ambition et les valeurs, et cet accord,
 * mesuré sur 780 couples vie × ambition, va de 15,9 à 46,5 sans jamais
 * descendre sous le seuil d'extinction de 12. Le filtre ne retirait rien,
 * jamais, et c'est pourquoi le regret manquant n'avait pas été remarqué.
 */
describe('décider de ce qu’on veut', () => {
  it('refuse avant l’âge de décider, et n’accepte pas deux fois le même but', () => {
    const state = createNewLife({ seed: 7_331 });
    state.player.age = DECIDE_FROM - 1;
    expect(setAmbitionBlocker(state, 'richesse')).toContain('avant');
    state.player.age = 30;
    expect(setAmbitionBlocker(state, 'richesse')).toBeNull();
    expect(setAmbitionBlocker(state, 'rien_de_tel')).toBe('Rien de tel.');
    setAmbition(createCtx(state), 'richesse');
    expect(setAmbitionBlocker(state, 'richesse')).toContain('déjà');
  });

  it('refuse un but déjà atteint', () => {
    // Sinon il suffisait de se fixer ce qu'on avait déjà pour encaisser la
    // satisfaction d'y être arrivé, autant de fois qu'on a de places.
    const state = createNewLife({ seed: 7_334 });
    state.player.age = 40;
    state.player.psyche.ambitions = [];
    const def = AMBITION_MAP.richesse!;
    const real = def.fulfilled;
    def.fulfilled = () => true;
    try {
      expect(setAmbitionBlocker(state, 'richesse')).toBe('C’est déjà le cas.');
      expect(setAmbition(createCtx(state), 'richesse').ok).toBe(false);
    } finally {
      def.fulfilled = real;
    }
    expect(state.player.psyche.ambitions).toHaveLength(0);
  });

  it('prend la place d’un autre, et le laisser laisse un regret', () => {
    const state = createNewLife({ seed: 7_332 });
    state.player.age = 30;
    const psyche = state.player.psyche;
    psyche.ambitions = [];
    psyche.memories = [];
    for (const id of ['richesse', 'famille', 'savoir', 'voyager']) {
      setAmbition(createCtx(state), id);
    }
    expect(psyche.ambitions).toHaveLength(CAP);
    const doomed = crowdedOut(state)!;
    expect(doomed).toBeDefined();

    setAmbition(createCtx(state), 'célébrité');
    // On en tient toujours quatre : le nouveau a pris la place du plus faible.
    expect(psyche.ambitions).toHaveLength(CAP);
    expect(psyche.ambitions.some((a) => a.id === 'célébrité')).toBe(true);
    expect(psyche.ambitions.some((a) => a.id === doomed.id)).toBe(false);
    // Et ce qu'on a laissé laisse quelque chose.
    expect(psyche.memories.filter((m) => m.text.startsWith('Avoir voulu'))).toHaveLength(1);
  });

  it('ne regrette pas ce qu’on a déjà obtenu', () => {
    const state = createNewLife({ seed: 7_333 });
    state.player.age = 40;
    const psyche = state.player.psyche;
    psyche.ambitions = [];
    psyche.memories = [];
    setAmbition(createCtx(state), 'richesse');
    psyche.ambitions[0]!.fulfilled = true;
    dropAmbition(createCtx(state), 'richesse');
    expect(psyche.ambitions).toHaveLength(0);
    expect(psyche.memories.filter((m) => m.text.startsWith('Avoir voulu'))).toHaveLength(0);
  });

  /**
   * Le point du système : ce qu'on fait d'un but décide si on le garde. Sans
   * cela, se fixer une ambition serait un vœu gratuit.
   */
  it('s’éteint si l’on n’avance jamais dessus, et tient si l’on avance', () => {
    const kept: Record<string, { held: number; total: number }> = {
      rien: { held: 0, total: 0 }, avance: { held: 0, total: 0 },
    };
    for (let seed = 0; seed < 24; seed += 1) {
      for (const [kind, progress] of [['rien', 0], ['avance', 0.8]] as const) {
        const state = createNewLife({ seed: seed * 7919 + 3 });
        state.player.age = 25;
        const psyche = state.player.psyche;
        psyche.ambitions = [{
          id: 'richesse', weight: DECLARED, since: 25, fulfilled: false, origin: 'test',
        }];
        // On fige la progression : c'est la seule variable de l'expérience.
        const def = AMBITION_MAP.richesse!;
        const real = def.progress;
        def.progress = () => progress;
        try {
          for (let year = 0; year < 40; year += 1) advanceAmbitionsForTest(createCtx(state));
        } finally {
          def.progress = real;
        }
        kept[kind]!.total += 1;
        if (psyche.ambitions.some((a) => a.id === 'richesse')) kept[kind]!.held += 1;
      }
    }
    const rate = (k: string) => kept[k]!.held / kept[k]!.total;
    expect(rate('avance'), 'un but qu’on poursuit devrait tenir').toBeGreaterThan(0.9);
    expect(rate('rien'), 'un but qu’on ignore quarante ans devrait s’éteindre')
      .toBeLessThan(0.5);
    expect(rate('avance')).toBeGreaterThan(rate('rien'));
  });
});

/**
 * **Une habitude ne peut pas prendre toute la semaine.**
 *
 * `advanceHabits` retranche `stickiness / 8` de la décroissance, et la
 * ténacité monte chaque année sans jamais redescendre : mesurée, elle vaut 97
 * en moyenne, c'est-à-dire le plafond. La fréquence *gagnait* donc une
 * douzaine d'occurrences par an, sans fin :
 *
 *     âge          20     30     40     50     70
 *     h/semaine  30,4   59,8   91,4   98,0   97,3
 *     temps libre 72,8   44,7   12,2    1,4    1,0
 *
 * Quatre-vingt-dix-huit heures de loisirs par semaine sur environ cent douze
 * heures d'éveil — et sans rien rapporter de plus, `applyHabitEffects` bornant
 * déjà l'intensité à 1,4 fois la fréquence de référence. L'habitude ne faisait
 * que prendre du temps et de l'argent.
 */
describe('ce que les habitudes prennent', () => {
  it('ne dépasse jamais le plafond où leur effet cesse de croître', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const state = autoplayLife(seed * 7919 + 3);
      for (const habit of state.player.psyche.habits) {
        const def = HABIT_MAP[habit.id];
        if (!def) continue;
        expect(
          habit.frequency,
          `${def.label} : ${habit.frequency} pour une référence à ${def.baseFrequency}`,
        ).toBeLessThanOrEqual(Math.round(def.baseFrequency * HABIT_CEILING));
      }
    }
  });

  it('laisse de quoi vivre à côté', () => {
    const hours: number[] = [];
    const free: number[] = [];
    for (let seed = 0; seed < 30; seed += 1) {
      const state = autoplayLife(seed * 7919 + 3);
      if (!state.player.psyche.habits.length) continue;
      hours.push(habitHours(state.player.psyche));
      free.push(state.player.origin.time.free);
    }
    expect(hours.length).toBeGreaterThan(10);
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    // Une semaine d'éveil fait environ 112 heures. Les loisirs peuvent en
    // prendre beaucoup — mais pas tout, et il doit rester du temps libre.
    expect(median(hours), 'les habitudes mangent la semaine entière').toBeLessThan(60);
    expect(median(free), 'plus une heure à soi').toBeGreaterThan(10);
  });
});
