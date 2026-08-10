/**
 * Chaîne criminalité → arrestation → procès → détention → libération.
 * Ce parcours est trop rare pour être couvert par le hasard : on le force.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from './newLife.ts';
import { createCtx } from './context.ts';
import { simulateYear } from './simulateYear.ts';
import { commitCrime, crimeBlocker, launderMoney } from '../systems/crime.ts';
import { addHeat, joinOrganization } from '../systems/underworld.ts';
import { appeal, goToTrial, incarcerate, pendingTrial, requestExpungement } from '../systems/justice.ts';
import { doPrisonActivity, release } from '../systems/prison.ts';
import { CRIMES } from '../data/crimes.ts';
import type { GameState } from './types.ts';

function adult(seed: number, age = 30): GameState {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < age; i++) simulateYear(state);
  return state;
}

describe('criminalité', () => {
  it('bloque les délits hors de portée du personnage', () => {
    const state = adult(1);
    state.player.stats.criminality = 0;
    const heist = CRIMES.find((c) => c.id === 'bankheist')!;
    expect(crimeBlocker(state, heist)).toBeTruthy();

    const shoplift = CRIMES.find((c) => c.id === 'shoplift')!;
    expect(crimeBlocker(state, shoplift)).toBeNull();
  });

  it('n’autorise qu’une tentative par délit et par année', () => {
    const state = adult(2);
    const ctx = createCtx(state);
    expect(commitCrime(ctx, 'shoplift').ok).toBe(true);
    expect(commitCrime(ctx, 'shoplift').ok).toBe(false);
  });

  it('finit par produire arrestations et gains sur un grand nombre d’essais', () => {
    let arrested = 0;
    let succeeded = 0;
    for (let seed = 0; seed < 60; seed++) {
      const state = adult(seed * 13 + 3);
      state.player.stats.criminality = 45;
      const ctx = createCtx(state);
      const before = state.player.money;
      commitCrime(ctx, 'burglary');
      if (pendingTrial(state)) arrested += 1;
      else if (state.player.money > before) succeeded += 1;
    }
    // Les deux issues doivent exister : ni impunité totale, ni échec garanti.
    expect(arrested).toBeGreaterThan(3);
    expect(succeeded).toBeGreaterThan(3);
  });

  it('permet de rejoindre le milieu et de blanchir de l’argent', () => {
    const state = adult(9);
    state.player.stats.criminality = 80;
    state.player.criminalRecord.notoriety = 60;
    state.player.money = 100000;
    const ctx = createCtx(state);
    joinOrganization(ctx);
    addHeat(ctx, 40);
    const result = launderMoney(ctx, 50000);
    expect(result.ok).toBe(true);
    expect(state.player.money).toBeLessThan(100000);
  });
});

describe('justice', () => {
  it('mène un procès jusqu’au verdict', () => {
    let convicted = 0;
    let acquitted = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = adult(seed * 7 + 11);
      state.player.stats.criminality = 60;
      state.player.money = 200000;
      const ctx = createCtx(state);
      // On force l'arrestation en enchaînant les tentatives.
      for (let i = 0; i < 12 && !pendingTrial(state); i++) {
        state.player.yearActions = {};
        commitCrime(createCtx(state), 'robbery');
      }
      if (!pendingTrial(state)) continue;
      const verdict = goToTrial(ctx, 'standard');
      expect(verdict.ok).toBe(true);
      expect(pendingTrial(state)).toBeNull();
      if (state.player.criminalRecord.convictions.length) convicted += 1;
      else acquitted += 1;
    }
    expect(convicted).toBeGreaterThan(0);
    expect(acquitted).toBeGreaterThan(0);
  });

  it('offre un appel après condamnation', () => {
    const state = adult(21);
    state.player.money = 500000;
    state.player.criminalRecord.convictions.push({
      crimeId: 'burglary', crimeName: 'Cambriolage', year: state.year,
      sentenceYears: 3, fine: 5000, appealed: false,
    });
    incarcerate(createCtx(state), 3);
    expect(state.player.prison).not.toBeNull();
    const result = appeal(createCtx(state), 'elite');
    expect(result.ok).toBe(true);
    expect(state.player.criminalRecord.convictions[0]?.appealed ?? true).toBe(true);
  });

  it('refuse l’effacement du casier trop tôt', () => {
    const state = adult(31);
    state.player.money = 100000;
    state.player.criminalRecord.convictions.push({
      crimeId: 'shoplift', crimeName: 'Vol', year: state.year,
      sentenceYears: 0, fine: 500, appealed: false,
    });
    expect(requestExpungement(createCtx(state)).ok).toBe(false);
  });
});

describe('détention', () => {
  it('suspend la carrière et libère à la fin de la peine', () => {
    const state = adult(41);
    incarcerate(createCtx(state), 3);
    expect(state.player.prison?.yearsLeft).toBe(3);
    expect(state.player.job).toBeNull();

    for (let i = 0; i < 3; i++) simulateYear(state);
    expect(state.player.prison).toBeNull();
    expect(state.player.alive).toBe(true);
  });

  it('propose des activités qui influencent la conditionnelle', () => {
    const state = adult(51);
    incarcerate(createCtx(state), 10);
    const before = state.player.prison!.behavior;
    doPrisonActivity(createCtx(state), 'behave');
    expect(state.player.prison!.behavior).toBeGreaterThan(before);

    const fitBefore = state.player.stats.fitness;
    doPrisonActivity(createCtx(state), 'gym');
    expect(state.player.stats.fitness).toBeGreaterThanOrEqual(fitBefore);
  });

  it('ne bloque jamais la partie : on peut toujours prendre une année', () => {
    const state = adult(61);
    incarcerate(createCtx(state), 25);
    for (let i = 0; i < 30; i++) {
      const result = simulateYear(state);
      if (result.died) break;
    }
    // Soit libéré, soit mort en détention — mais jamais figé.
    expect(state.player.prison === null || !state.player.alive).toBe(true);
  });

  it('permet une libération anticipée', () => {
    const state = adult(71);
    incarcerate(createCtx(state), 8);
    release(createCtx(state), 'libération conditionnelle');
    expect(state.player.prison).toBeNull();
    // Les codétenus deviennent de simples connaissances.
    expect(Object.values(state.npcs).some((p) => p.relation === 'inmate')).toBe(false);
  });
});
