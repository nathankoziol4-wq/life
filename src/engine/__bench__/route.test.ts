/**
 * La route — porter d'un endroit où ça ne vaut rien à un endroit où ça vaut.
 *
 * Le milieu savait déjà rendre des services, jouer des missions, monter en
 * grade et faire monter la chaleur. Il ne savait pas **commercer** :
 * `underworld.ts` n'a ni marchandise, ni prix, ni endroit. Le seul arbitrage
 * marchand du jeu (`objects.ts`) parie sur **ce qu'une chose est**, jamais sur
 * **où elle est**.
 *
 * Six exigences :
 *
 * 1. **la carte se lit** : si toutes les régions payent pareil, il n'y a rien
 *    à décider ;
 * 2. **la place borne, pas l'argent** ;
 * 3. **la chaleur monte vraiment** — c'est le frein, et il a d'abord été
 *    inopérant ;
 * 4. **la charge se paie au carré**, et à la vente, pas seulement dans un
 *    chemin de code que personne n'emprunte ;
 * 5. **une route s'use** à force de servir ;
 * 6. **rien de tout cela ne tire dans la séquence du moteur.**
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { CHEAP, DEAR, GOODS, HEAT_CURVE } from '../../data/route.ts';
import { REGION_ARCHETYPES } from '../../data/regions.ts';
import {
  capacity, costHere, ensureRoute, hereId, holdWorth, loadHeat, loadOf,
  mostAffordable, priceAt, roomLeft, routeOf, run, runBlocker, stock,
  stockBlocker, stopOdds,
} from '../../systems/route.ts';
import { heatOf } from '../../systems/underworld.ts';

/** Un adulte installé, avec de quoi acheter. */
function carrier(seed: number, money = 200_000): GameState | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 26 && !state.gameOver; i++) simulateYear(state);
  const p = state.player;
  if (state.gameOver || !p.alive || p.prison) return null;
  p.money = money;
  p.yearActions = {};
  return state;
}

/** La meilleure marge par unité d'encombrement, au départ d'ici. */
function bestRoute(state: GameState) {
  let best: { goodId: string; to: string; perBulk: number } | null = null;
  for (const good of GOODS) {
    const unit = costHere(state, good.id);
    for (const region of REGION_ARCHETYPES) {
      if (region.id === hereId(state)) continue;
      const perBulk = (priceAt(state, region.id, good.id) - unit) / good.bulk;
      if (!best || perBulk > best.perBulk) best = { goodId: good.id, to: region.id, perBulk };
    }
  }
  return best;
}

describe('la carte', () => {
  it('ne paie pas la même chose partout', () => {
    /*
     * Mesuré, une unité selon la région (le personnage est `industrial`) :
     *
     *     Pièces sans numéro    117 · 117 ·  73 · 173 · 117 · 173 · 117
     *     Montres               65 ·  27 ·  44 ·  44 ·  65 ·  44 ·  44
     *     Verrerie             448 · 303 · 303 · 188 · 303 · 188 · 303
     *
     * Un rapport de un à trois sur la verrerie : c'est ce qui fait qu'il y a
     * une carte à lire plutôt qu'un bouton à cliquer.
     */
    const state = carrier(5);
    if (!state) return;
    for (const good of GOODS) {
      const prices = REGION_ARCHETYPES.map((r) => priceAt(state, r.id, good.id));
      expect(Math.max(...prices), good.id).toBeGreaterThan(Math.min(...prices) * 1.5);
    }
    // Et le sens est celui qu'annonce le catalogue.
    for (const good of GOODS) {
      for (const from of good.from) {
        for (const to of good.to) {
          expect(priceAt(state, to, good.id), `${good.id} ${from}→${to}`)
            .toBeGreaterThan(priceAt(state, from, good.id));
        }
      }
    }
    expect(CHEAP).toBeLessThan(1);
    expect(DEAR).toBeGreaterThan(1);
  });
});

describe('ce qu’on peut porter', () => {
  it('est borné par la place et non par l’argent', () => {
    const state = carrier(7, 10_000_000);
    if (!state) return;
    const room = capacity(state);
    // Fortune énorme, place inchangée : c'est la place qui décide.
    const bulky = GOODS.reduce((a, b) => (a.bulk > b.bulk ? a : b));
    expect(mostAffordable(state, bulky.id)).toBe(Math.floor(room / bulky.bulk));
    // Et l'encombrement distingue vraiment les marchandises.
    const slim = GOODS.reduce((a, b) => (a.bulk < b.bulk ? a : b));
    expect(mostAffordable(state, slim.id)).toBeGreaterThan(mostAffordable(state, bulky.id) * 3);
  });

  it('refuse ce qui ne rentre pas', () => {
    const state = carrier(11);
    if (!state) return;
    const good = GOODS.reduce((a, b) => (a.bulk > b.bulk ? a : b));
    const tooMany = Math.ceil(capacity(state) / good.bulk) + 1;
    expect(stockBlocker(state, good.id, tooMany)).toContain('place');
  });

  it('ne mélange pas deux provenances', () => {
    const state = carrier(13);
    if (!state) return;
    const good = GOODS.reduce((a, b) => (a.bulk < b.bulk ? a : b));
    expect(stock(createCtx(state), good.id, 1).ok).toBe(true);
    // On feint d'avoir acheté ailleurs : le système doit refuser d'empiler.
    ensureRoute(state).boughtIn = 'nulle-part';
    expect(stockBlocker(state, good.id, 1)).toContain('ailleurs');
  });
});

describe('la chaleur', () => {
  it('monte pour de bon quand on écoule', () => {
    /*
     * **Le frein n'a d'abord pas existé.** `advanceUnderworld` refroidit chaque
     * année, sans condition, de `4 + (100 − chaleur) / 22` — environ 8,5 points
     * à froid. Une vente à trois points passait donc inaperçue : mesuré, deux
     * cent soixante-seize passages laissaient une chaleur moyenne de **zéro**
     * et n'attiraient **aucun contrôle**.
     */
    const state = carrier(17);
    if (!state) return;
    const best = bestRoute(state);
    if (!best) return;
    const take = Math.max(1, Math.floor(mostAffordable(state, best.goodId) * 0.8));
    expect(stock(createCtx(state), best.goodId, take).ok).toBe(true);
    const before = heatOf(state);
    expect(run(createCtx(state), best.to).ok).toBe(true);
    const after = heatOf(state);
    // Et pas de trois points : plus que ce que l'année suivante refroidira.
    expect(after - before).toBeGreaterThan(9);
  });

  it('se paie au carré de la charge, et à la vente', () => {
    /*
     * Le terme quadratique n'existait d'abord que dans le coût annuel de ce
     * qu'on garde sur les bras — or la façon normale de jouer est d'acheter et
     * de partir dans la même année, si bien qu'il n'était jamais payé. Le
     * principe central du système vivait dans un chemin de code que personne
     * n'empruntait.
     */
    expect(HEAT_CURVE).toBeGreaterThan(1);
    const state = carrier(19);
    if (!state) return;
    const good = GOODS.reduce((a, b) => (a.bulk < b.bulk ? a : b));
    const full = Math.floor(capacity(state) / good.bulk);

    ensureRoute(state).hold = { [good.id]: Math.floor(full / 2) };
    const half = loadHeat(state, 100);
    ensureRoute(state).hold = { [good.id]: full };
    const whole = loadHeat(state, 100);
    // À moitié plein on paie le quart, à plein on paie tout.
    expect(whole).toBeGreaterThan(half * 3);
  });

  it('fait dépendre le contrôle de la chaleur et de la charge', () => {
    /*
     * Mesuré :
     *
     *     chaleur | vide | à moitié | plein
     *          20 | 0,3 %|    1,5 % | 2,6 %
     *          40 | 1,4 %|    6,4 % | 11,3 %
     *          85 | 3,9 %|   17,5 % | 30,9 %
     *
     * Ni l'un ni l'autre ne suffit : un inconnu chargé passe, un homme
     * surveillé les mains vides aussi.
     */
    const state = carrier(23);
    if (!state) return;
    const p = state.player;
    const good = GOODS[0];
    const full = Math.floor(capacity(state) / good.bulk);

    p.criminalRecord.heat = 0;
    ensureRoute(state).hold = { [good.id]: full };
    expect(stopOdds(state)).toBe(0);

    p.criminalRecord.heat = 85;
    ensureRoute(state).hold = {};
    const emptyOdds = stopOdds(state);
    ensureRoute(state).hold = { [good.id]: full };
    const fullOdds = stopOdds(state);
    expect(fullOdds).toBeGreaterThan(emptyOdds * 3);
    expect(fullOdds).toBeLessThan(0.9);
  });
});

describe('la route s’use', () => {
  it('referme l’écart qu’on vient d’exploiter', () => {
    /*
     * Mesuré sur huit passages de suite, la même marchandise vers le même
     * endroit : le facteur à l'arrivée passe de 2,20 à 1,28. Une bonne route
     * cesse de l'être à force de servir, ce qui interdit de l'apprendre une
     * fois pour toutes.
     */
    const state = carrier(29);
    if (!state) return;
    const best = bestRoute(state);
    if (!best) return;
    const before = priceAt(state, best.to, best.goodId);
    const take = Math.max(1, Math.floor(mostAffordable(state, best.goodId) * 0.5));
    expect(stock(createCtx(state), best.goodId, take).ok).toBe(true);
    const done = run(createCtx(state), best.to);
    expect(done.ok).toBe(true);
    if (done.title === 'Contrôlé') return;
    expect(priceAt(state, best.to, best.goodId)).toBeLessThan(before);
  });

  it('n’autorise qu’un passage par an', () => {
    const state = carrier(31);
    if (!state) return;
    const best = bestRoute(state);
    if (!best) return;
    const take = Math.max(1, Math.floor(mostAffordable(state, best.goodId) * 0.4));
    stock(createCtx(state), best.goodId, take);
    run(createCtx(state), best.to);
    stock(createCtx(state), best.goodId, 1);
    expect(runBlocker(state, best.to)).toContain('déjà fait le trajet');
  });

  it('ne laisse pas vendre chez soi', () => {
    const state = carrier(37);
    if (!state) return;
    const good = GOODS.reduce((a, b) => (a.bulk < b.bulk ? a : b));
    stock(createCtx(state), good.id, 1);
    expect(runBlocker(state, hereId(state))).toContain('ne vaut rien de plus');
  });
});

describe('ce que ça rapporte', () => {
  it('paie, et paie davantage quand on charge davantage', () => {
    /*
     * Mesuré sur douze ans et quarante vies :
     *
     *     charge | gagné  | par passage | contrôlés | arrêté | ans en détention
     *       20 % |  7 053 |       1 076 |         0 |      0 |             0,00
     *       40 % | 14 019 |       1 958 |        11 |      2 |             0,08
     *      100 % | 29 271 |       3 916 |        69 |     16 |             1,32
     *
     * Charger davantage rapporte toujours davantage d'argent — il faut le dire
     * ainsi plutôt que de prétendre à un optimum que la mesure ne montre pas.
     * Ce qui plie, c'est le rendement et surtout le prix : une année et demie
     * de détention par vie au maximum, aucune au cinquième.
     */
    const gains: number[] = [];
    for (const share of [0.25, 1]) {
      let earned = 0;
      let lives = 0;
      for (let s = 0; s < 10; s++) {
        const state = carrier(9_000 + s * 3);
        if (!state) continue;
        lives += 1;
        const p = state.player;
        for (let y = 0; y < 8 && p.alive && !state.gameOver; y++) {
          p.yearActions = {};
          if (p.prison) { simulateYear(state); continue; }
          const best = bestRoute(state);
          if (best) {
            const take = Math.floor(mostAffordable(state, best.goodId) * share);
            if (take > 0 && stock(createCtx(state), best.goodId, take).ok) {
              run(createCtx(state), best.to);
            }
          }
          simulateYear(state);
        }
        earned += routeOf(state).earned;
      }
      gains.push(lives > 0 ? earned / lives : 0);
    }
    expect(gains[0]).toBeGreaterThan(0);
    expect(gains[1]).toBeGreaterThan(gains[0]);
  });

  it('fait perdre la cargaison à qui se fait prendre', () => {
    const state = carrier(41);
    if (!state) return;
    const p = state.player;
    const good = GOODS.reduce((a, b) => (a.bulk < b.bulk ? a : b));
    stock(createCtx(state), good.id, Math.max(1, mostAffordable(state, good.id)));
    // Chaleur au plafond : le contrôle devient très probable.
    p.criminalRecord.heat = 100;
    const before = p.money;
    const best = bestRoute(state);
    const done = run(createCtx(state), best?.to ?? 'capital');
    expect(done.ok).toBe(true);
    if (done.title === 'Contrôlé') {
      expect(loadOf(state)).toBe(0);
      expect(routeOf(state).seized).toBe(1);
      expect(p.money).toBe(before);
    }
  });
});

describe('le moteur', () => {
  it('ne tire rien dans la séquence pour faire dériver la carte', () => {
    /*
     * `advanceRoute` tourne à chaque année de chaque vie. Trois chantiers de
     * suite ont décalé la séquence en y ajoutant un tirage — « Le nom », « La
     * bête », « Comment tu es arrivé ». On assure sur le corps de la fonction,
     * qu'aucune prose ne peut simuler.
     */
    const source = readFileSync(new URL('../../systems/route.ts', import.meta.url), 'utf8');
    const body = source.slice(source.indexOf('export function advanceRoute'));
    expect(body).not.toMatch(/\brng\b/);
    expect(body).toMatch(/\bhash\(/);
  });

  it('donne la même carte à la même graine', () => {
    const a = createNewLife({ seed: 404 });
    const b = createNewLife({ seed: 404 });
    for (let i = 0; i < 12; i++) { simulateYear(a); simulateYear(b); }
    for (const region of REGION_ARCHETYPES) {
      for (const good of GOODS) {
        expect(priceAt(a, region.id, good.id), `${region.id}/${good.id}`)
          .toBe(priceAt(b, region.id, good.id));
      }
    }
  });

  it('laisse la carte dériver au fil des ans', () => {
    const state = carrier(43);
    if (!state) return;
    const before = REGION_ARCHETYPES.map((r) => priceAt(state, r.id, GOODS[0].id));
    for (let y = 0; y < 6 && state.player.alive && !state.gameOver; y++) simulateYear(state);
    const after = REGION_ARCHETYPES.map((r) => priceAt(state, r.id, GOODS[0].id));
    expect(after).not.toEqual(before);
  });
});

describe('la fiction', () => {
  it('ne nomme aucune substance ni aucune arme', () => {
    /*
     * Contrainte explicite du cahier des charges : marchandises inventées,
     * mécanique de jeu seulement, aucune information utilisable. Ce test la
     * fige sur le catalogue plutôt que sur une intention.
     */
    const forbidden = /drogue|stup|coca|hero|cannabis|arme|fusil|pistolet|muni/i;
    for (const good of GOODS) {
      expect(`${good.label} ${good.line}`, good.id).not.toMatch(forbidden);
    }
  });

  it('donne à chaque marchandise un profil distinct', () => {
    // Aucune ne doit dominer : si l'une gagnait sur les trois axes à la fois,
    // il n'y aurait qu'un choix et les cinq autres seraient du décor.
    for (const a of GOODS) {
      const dominated = GOODS.some((b) => b.id !== a.id
        && b.base >= a.base && b.bulk <= a.bulk && b.notice <= a.notice
        && (b.base > a.base || b.bulk < a.bulk || b.notice < a.notice));
      expect(dominated, `${a.id} est dominée`).toBe(false);
    }
  });

  it('laisse toujours de la place à pied', () => {
    const state = carrier(47);
    if (!state) return;
    expect(roomLeft(state)).toBeGreaterThan(0);
    expect(holdWorth(state)).toBe(0);
  });
});
