/**
 * Tests du moteur. Ils tournent sans interface : le moteur est autonome.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from './newLife.ts';
import { simulateYear, buildSummary } from './simulateYear.ts';
import { createCtx } from './context.ts';
import { Rng } from './rng.ts';
import { netWorth } from '../systems/finance.ts';
import { resolvePending } from '../systems/randomEvents.ts';
import { ALL_EVENTS } from '../data/events/index.ts';
import { JOBS, TOTAL_POSITIONS } from '../data/jobs.ts';
import { COUNTRIES } from '../data/countries.ts';
import { DISEASES } from '../data/diseases.ts';
import { applyToJob } from '../systems/careers.ts';
import { buyProperty } from '../systems/properties.ts';
import { buyVehicle } from '../systems/vehicles.ts';
import { deathChance } from './probability.ts';
import type { GameState } from './types.ts';

/** Joue une vie entière en répondant au hasard à tous les événements. */
function playFullLife(seed: number, maxYears = 140): GameState {
  const state = createNewLife({ seed });
  const rng = new Rng({ rngState: seed ^ 0x5f3a });
  for (let i = 0; i < maxYears; i++) {
    const result = simulateYear(state);
    if (result.died) break;
    // Répond à tous les événements en attente.
    let guard = 0;
    while (state.pending.length && guard++ < 20) {
      const ev = state.pending[0];
      const ctx = createCtx(state);
      resolvePending(ctx, ev.id, rng.int(0, ev.choices.length - 1));
    }
  }
  return state;
}

describe('génération de vie', () => {
  it('crée un personnage cohérent à la naissance', () => {
    const state = createNewLife({ seed: 42 });
    expect(state.player.age).toBe(0);
    expect(state.player.alive).toBe(true);
    expect(state.player.firstName.length).toBeGreaterThan(0);
    expect(state.timeline.length).toBeGreaterThan(0);
    const parents = Object.values(state.npcs).filter(
      (p) => p.relation === 'mother' || p.relation === 'father',
    );
    expect(parents).toHaveLength(2);
    for (const value of Object.values(state.player.stats)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('respecte les options fournies', () => {
    const state = createNewLife({ seed: 7, countryId: 'jp', sex: 'F', firstName: 'Hina', lastName: 'Sato' });
    expect(state.player.countryId).toBe('jp');
    expect(state.player.sex).toBe('F');
    expect(state.player.firstName).toBe('Hina');
  });

  it('est déterministe à graine égale', () => {
    const a = createNewLife({ seed: 12345 });
    const b = createNewLife({ seed: 12345 });
    expect(a.player.firstName).toBe(b.player.firstName);
    expect(a.player.countryId).toBe(b.player.countryId);
    simulateYear(a);
    simulateYear(b);
    expect(a.player.stats).toEqual(b.player.stats);
  });
});

describe('simulation annuelle', () => {
  it('fait vieillir le joueur et les PNJ', () => {
    const state = createNewLife({ seed: 99 });
    const motherId = Object.values(state.npcs).find((p) => p.relation === 'mother')!.id;
    const motherAge = state.npcs[motherId].age;
    simulateYear(state);
    expect(state.player.age).toBe(1);
    expect(state.npcs[motherId].age).toBe(motherAge + 1);
  });

  it('scolarise automatiquement l’enfant', () => {
    const state = createNewLife({ seed: 5 });
    for (let i = 0; i < 8; i++) simulateYear(state);
    expect(state.player.age).toBe(8);
    expect(['primary', 'nursery']).toContain(state.player.education.stage);
    expect(state.player.education.schoolName).toBeTruthy();
  });

  it('maintient toutes les statistiques dans les bornes sur une vie entière', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const state = playFullLife(seed);
      for (const [key, value] of Object.entries(state.player.stats)) {
        expect(Number.isFinite(value), `${key} = ${value}`).toBe(true);
        expect(value, `${key} = ${value}`).toBeGreaterThanOrEqual(0);
        expect(value, `${key} = ${value}`).toBeLessThanOrEqual(100);
      }
      expect(Number.isFinite(state.player.money)).toBe(true);
      expect(Number.isFinite(netWorth(state))).toBe(true);
    }
  });

  it('finit toujours par tuer le joueur', () => {
    for (const seed of [11, 22, 33, 44, 55, 66]) {
      const state = playFullLife(seed);
      expect(state.player.alive).toBe(false);
      expect(state.player.age).toBeLessThan(125);
      expect(state.player.deathCause).toBeTruthy();
    }
  });

  it('produit une timeline continue et ordonnée', () => {
    const state = playFullLife(101);
    expect(state.timeline.length).toBeGreaterThan(20);
    for (let i = 1; i < state.timeline.length; i++) {
      expect(state.timeline[i].year).toBeGreaterThanOrEqual(state.timeline[i - 1].year);
    }
  });

  it('génère un récapitulatif de fin de vie exploitable', () => {
    const state = playFullLife(2024);
    const summary = buildSummary(state, [], Number(state.player.flags.finalNetWorth ?? 0));
    expect(summary.ageAtDeath).toBe(state.player.age);
    expect(summary.name).toContain(state.player.firstName);
    expect(summary.score).toBeGreaterThanOrEqual(0);
  });
});

describe('espérance de vie', () => {
  it('produit des durées de vie plausibles en moyenne', () => {
    const ages: number[] = [];
    for (let seed = 0; seed < 40; seed++) {
      ages.push(playFullLife(seed * 977 + 13).player.age);
    }
    const mean = ages.reduce((s, a) => s + a, 0) / ages.length;
    // Une population simulée doit vivre en moyenne entre 45 et 95 ans.
    expect(mean).toBeGreaterThan(45);
    expect(mean).toBeLessThan(95);
  });

  it('augmente la mortalité avec l’âge', () => {
    const stats = { happiness: 60, health: 70, intelligence: 50, looks: 50, stress: 20, discipline: 50, karma: 50, reputation: 50, fitness: 60, addiction: 0, criminality: 0, fertility: 50 };
    expect(deathChance(80, stats)).toBeGreaterThan(deathChance(40, stats));
    expect(deathChance(40, stats)).toBeGreaterThan(deathChance(20, stats));
  });
});

describe('économie', () => {
  it('ne rend pas millionnaire sans raison', () => {
    let rich = 0;
    for (let seed = 0; seed < 25; seed++) {
      const state = playFullLife(seed * 31 + 7);
      if (Number(state.player.flags.finalNetWorth ?? 0) > 5_000_000) rich += 1;
    }
    // Devenir très riche par pur hasard doit rester rare.
    expect(rich).toBeLessThan(8);
  });

  it('permet d’acheter un bien immobilier avec les fonds nécessaires', () => {
    const state = createNewLife({ seed: 808 });
    for (let i = 0; i < 30; i++) simulateYear(state);
    state.player.money = 50_000_000;
    const ctx = createCtx(state);
    const listing = state.world.propertyListings[0];
    const result = buyProperty(ctx, listing.id, 'cash');
    expect(result.ok).toBe(true);
    expect(state.player.properties).toHaveLength(1);
    expect(state.player.properties[0].isResidence).toBe(true);
  });

  it('permet d’acheter un véhicule et de le suivre dans le temps', () => {
    const state = createNewLife({ seed: 909 });
    for (let i = 0; i < 25; i++) simulateYear(state);
    state.player.money = 5_000_000;
    const ctx = createCtx(state);
    const listing = state.world.vehicleListings[0];
    expect(buyVehicle(ctx, listing.id, 'cash').ok).toBe(true);
    const before = state.player.vehicles[0].value;
    simulateYear(state);
    expect(state.player.vehicles[0].value).toBeLessThanOrEqual(before);
    expect(state.player.vehicles[0].mileage).toBeGreaterThan(listing.mileage);
  });
});

describe('carrière', () => {
  it('refuse une candidature sans le diplôme requis', () => {
    const state = createNewLife({ seed: 300 });
    for (let i = 0; i < 20; i++) simulateYear(state);
    state.player.education.level = 0;
    state.player.education.degrees = [];
    const ctx = createCtx(state);
    const hard = state.world.jobOffers.find((o) => o.requiresLevel >= 3);
    if (hard) {
      const result = applyToJob(ctx, hard.id);
      expect(result.ok).toBe(false);
    }
  });
});

describe('bibliothèque de contenu', () => {
  it('ne contient aucun identifiant d’événement en double', () => {
    const ids = ALL_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('propose au moins deux choix par événement', () => {
    for (const event of ALL_EVENTS) {
      expect(event.choices.length, event.id).toBeGreaterThanOrEqual(2);
      for (const choice of event.choices) {
        expect(choice.outcomes.length, `${event.id} / ${choice.label}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('expose un catalogue de contenu suffisant', () => {
    expect(ALL_EVENTS.length).toBeGreaterThan(80);
    expect(JOBS.length).toBeGreaterThan(60);
    expect(TOTAL_POSITIONS).toBeGreaterThan(250);
    expect(COUNTRIES.length).toBeGreaterThan(20);
    expect(DISEASES.length).toBeGreaterThan(40);
  });

  it('n’a aucun identifiant de métier ou de pays en double', () => {
    expect(new Set(JOBS.map((j) => j.id)).size).toBe(JOBS.length);
    expect(new Set(COUNTRIES.map((c) => c.id)).size).toBe(COUNTRIES.length);
    expect(new Set(DISEASES.map((d) => d.id)).size).toBe(DISEASES.length);
  });
});

describe('sauvegarde', () => {
  it('sérialise et restaure une partie sans perte', () => {
    const state = createNewLife({ seed: 4242 });
    for (let i = 0; i < 40; i++) {
      simulateYear(state);
      while (state.pending.length) {
        resolvePending(createCtx(state), state.pending[0].id, 0);
      }
      if (!state.player.alive) break;
    }

    const restored = JSON.parse(JSON.stringify(state)) as GameState;
    // Rien ne doit se perdre : ni le personnage, ni les PNJ, ni l'historique.
    expect(restored).toEqual(state);
    expect(Object.keys(restored.npcs).length).toBe(Object.keys(state.npcs).length);
    expect(restored.timeline.length).toBe(state.timeline.length);
    expect(restored.rngState).toBe(state.rngState);

    // Et la partie restaurée doit continuer exactement comme l'originale.
    if (state.player.alive) {
      const a = simulateYear(state);
      const b = simulateYear(restored);
      expect(b.entries.map((e) => e.text)).toEqual(a.entries.map((e) => e.text));
      expect(restored.player.stats).toEqual(state.player.stats);
    }
  });

  it('ne contient aucune valeur non sérialisable', () => {
    const state = createNewLife({ seed: 77 });
    for (let i = 0; i < 25; i++) simulateYear(state);
    const json = JSON.stringify(state);
    expect(json).not.toContain('undefined');
    expect(json.length).toBeGreaterThan(1000);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
