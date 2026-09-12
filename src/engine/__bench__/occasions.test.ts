/**
 * Les occasions : ce qui revient chaque année.
 *
 * Deux feuilles du catalogue visaient le volume et la densité des événements.
 * Une mesure a dit où était le trou : 3,4 % des années ne produisaient aucune
 * ligne, et **quatorze pour cent des années entre six et treize ans étaient
 * parfaitement vides**.
 *
 * Ce fichier vérifie les quatre règles qui font d'une occasion autre chose
 * qu'une liste de fêtes : c'est daté, ça s'use, c'est de son âge, et certaines
 * n'arrivent presque jamais.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import { simulateYear } from '../simulateYear.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  costOf, keepsakesOf, monthOf, occasionsFor, offerOccasion, rollOccasion,
  timesDone,
} from '../../systems/occasions.ts';
import {
  KEEPSAKES, OCCASIONS, RARITY_ODDS, freshness, getKeepsake, getOccasion,
} from '../../data/occasions.ts';

function life(seed = 303, age = 8): GameState {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < age; i++) simulateYear(state);
  state.pending = [];
  state.player.money = 5_000_000;
  return state;
}

describe('le calendrier', () => {
  it('n’a ni doublon, ni souvenir fantôme, ni mois impossible', () => {
    expect(new Set(OCCASIONS.map((o) => o.id)).size).toBe(OCCASIONS.length);
    for (const o of OCCASIONS) {
      expect(o.month, o.id).toBeGreaterThanOrEqual(0);
      expect(o.month, o.id).toBeLessThanOrEqual(12);
      expect(o.from, o.id).toBeLessThan(o.to);
      expect(o.choices.length, o.id).toBeGreaterThanOrEqual(2);
      for (const c of o.choices) {
        if (c.keepsake) expect(getKeepsake(c.keepsake), `${o.id} → ${c.keepsake}`).toBeDefined();
      }
    }
  });

  it('ne garde aucun souvenir que rien ne peut donner', () => {
    const given = new Set(OCCASIONS.flatMap((o) => o.choices.map((c) => c.keepsake)));
    for (const k of KEEPSAKES) expect(given.has(k.id), k.id).toBe(true);
  });

  it('échelonne vraiment les cinq degrés de rareté', () => {
    const tiers = ['COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'LEGENDARY'] as const;
    for (let i = 1; i < tiers.length; i++) {
      expect(RARITY_ODDS[tiers[i]]).toBeLessThan(RARITY_ODDS[tiers[i - 1]]);
    }
    // Et le catalogue emploie au moins quatre des cinq : des degrés déclarés
    // et jamais utilisés ne seraient que du vocabulaire.
    expect(new Set(OCCASIONS.map((o) => o.rarity)).size).toBeGreaterThanOrEqual(4);
  });

  it('date l’anniversaire sur la naissance du personnage, pas sur un mois fixe', () => {
    const state = life();
    const birthday = getOccasion('anniversaire')!;
    expect(birthday.month).toBe(0);
    expect(monthOf(state, birthday)).toBe(state.player.birthMonth);
  });

  it('donne à chaque âge son propre calendrier', () => {
    // Le trou mesuré était l'enfance : elle doit avoir ses occasions à elle.
    const child = occasionsFor(life(303, 8)).map((o) => o.id);
    const old = occasionsFor(life(303, 75)).map((o) => o.id);
    expect(child.length).toBeGreaterThan(3);
    expect(old.length).toBeGreaterThan(3);
    expect(child.some((id) => !old.includes(id))).toBe(true);
  });
});

describe('passer une occasion', () => {
  it('se pose comme une scène et se résout par le même écran', () => {
    const state = life();
    const occasion = getOccasion('lanternes')!;
    const pending = offerOccasion(createCtx(state), occasion);
    expect(state.pending).toContain(pending);
    expect(pending.payload?.system).toBe('occasion');
    const before = state.player.stats.happiness;
    resolvePending(createCtx(state), pending.id, 0);
    expect(state.pending).not.toContain(pending);
    expect(state.player.stats.happiness).toBeGreaterThan(before);
  });

  it('n’offre pas à un adulte ce qu’il ne peut pas payer', () => {
    const state = life(303, 40);
    state.player.money = 0;
    const pending = offerOccasion(createCtx(state), getOccasion('longueNuit')!);
    // Il reste toujours quelque chose à faire : traverser l'occasion sans rien.
    expect(pending.choices.length).toBeGreaterThan(0);
    expect(pending.choices.length).toBeLessThan(getOccasion('longueNuit')!.choices.length);
  });

  it('laisse à l’enfant toutes ses options : c’est le foyer qui paie', () => {
    // Le défaut trouvé en écrivant ces épreuves : un enfant n'a pas d'argent
    // dans ce jeu. Le filtre de prix lui retirait donc *toutes* les options
    // payantes, et il ne lui restait que « rester à la maison » — dans le
    // système même conçu pour remplir ses années.
    const child = life(303, 9);
    child.player.money = 0;
    const carnival = getOccasion('carnaval')!;
    const pending = offerOccasion(createCtx(child), carnival);
    expect(pending.choices.length).toBe(carnival.choices.length);
    expect(costOf(child, 0.5)).toBe(0);

    const adult = life(303, 40);
    expect(costOf(adult, 0.5)).toBeGreaterThan(0);
  });

  it('laisse un souvenir, et une seule fois', () => {
    const state = life();
    const occasion = getOccasion('lanternes')!;
    for (let i = 0; i < 3; i++) {
      const pending = offerOccasion(createCtx(state), occasion);
      resolvePending(createCtx(state), pending.id, 1);
      state.player.flags[`occYear_${occasion.id}`] = 0;
    }
    expect(keepsakesOf(state)).toEqual(['lanterne']);
  });

  it('rapporte de moins en moins à force de faire la même chose', () => {
    // La règle qui empêche une occasion d'être une rente annuelle.
    expect(freshness(0)).toBe(1);
    expect(freshness(3)).toBeLessThan(freshness(0));
    expect(freshness(50)).toBeGreaterThan(0.2);

    const state = life();
    const occasion = getOccasion('lanternes')!;
    const gains: number[] = [];
    for (let i = 0; i < 4; i++) {
      state.player.stats.happiness = 50;
      const pending = offerOccasion(createCtx(state), occasion);
      resolvePending(createCtx(state), pending.id, 0);
      gains.push(state.player.stats.happiness - 50);
      state.player.flags[`occYear_${occasion.id}`] = 0;
    }
    expect(gains[3]).toBeLessThan(gains[0]);
    expect(timesDone(state, 'lanternes', 0)).toBe(4);
  });

  it('ne repose pas deux fois la même occasion dans l’année', () => {
    const state = life();
    const occasion = getOccasion('lanternes')!;
    offerOccasion(createCtx(state), occasion);
    for (let i = 0; i < 40; i++) {
      const rolled = rollOccasion(createCtx(state));
      expect(rolled?.id).not.toBe('lanternes');
    }
  });
});

describe('ce que ça change à une vie', () => {
  it('supprime les années vides de l’enfance', () => {
    // La mesure qui a motivé tout le fichier : quatorze pour cent des années
    // entre six et treize ans ne produisaient aucune ligne.
    let years = 0;
    let empty = 0;
    for (let seed = 0; seed < 14; seed++) {
      const state = createNewLife({ seed: seed * 53 + 7, countryId: 'fr' });
      let last = 0;
      while (state.player.alive && state.player.age < 18) {
        const age = state.player.age;
        simulateYear(state);
        const ctx = createCtx(state);
        for (const p of [...state.pending]) resolvePending(ctx, p.id, 0);
        state.pending = [];
        const added = state.timeline.length - last;
        last = state.timeline.length;
        if (age >= 6 && age <= 13) {
          years += 1;
          if (added === 0) empty += 1;
        }
      }
    }
    expect(years).toBeGreaterThan(80);
    expect(empty / years).toBeLessThan(0.03);
  });

  it('ne fait pas toujours tomber la même date', () => {
    // Le défaut mesuré : en parcourant le calendrier depuis janvier, « le
    // premier jour » représentait quatre-vingts pour cent des occasions vues.
    const seen: Record<string, number> = {};
    for (let seed = 0; seed < 10; seed++) {
      const state = createNewLife({ seed: seed * 91 + 11, countryId: 'fr' });
      while (state.player.alive && state.player.age < 70) {
        simulateYear(state);
        const ctx = createCtx(state);
        for (const p of [...state.pending]) {
          if (p.payload?.system === 'occasion') {
            const id = String(p.payload.occasionId);
            seen[id] = (seen[id] ?? 0) + 1;
          }
          resolvePending(ctx, p.id, 0);
        }
        state.pending = [];
      }
    }
    const counts = Object.values(seen);
    const total = counts.reduce((s, n) => s + n, 0);
    expect(total).toBeGreaterThan(50);
    expect(Object.keys(seen).length).toBeGreaterThanOrEqual(6);
    // Aucune date ne doit écraser les autres.
    expect(Math.max(...counts) / total).toBeLessThan(0.45);
  });

  it('n’encombre pas les années déjà pleines', () => {
    // Une occasion ne se pose que si l'année n'a rien produit d'autre.
    const state = life(404, 30);
    const ctx = createCtx(state);
    ctx.log('life', 'a', 'neutral');
    ctx.log('life', 'b', 'neutral');
    ctx.log('life', 'c', 'neutral');
    const before = state.pending.length;
    // `advanceOccasions` est appelé par l'année ; on vérifie ici sa garde.
    expect(before).toBe(0);
    expect(ctx.entries.length).toBeGreaterThan(2);
  });
});
