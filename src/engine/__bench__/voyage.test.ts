/**
 * Partir avec quelqu'un.
 *
 * Les vacances existaient : quatorze destinations, un prix, un risque, du
 * bonheur en plus. On partait **seul**, toujours — « les vacances existent
 * mais sans compagnon ». Or un voyage est la seule chose du jeu qui prenne un
 * bloc de temps avec une seule personne : tout le reste du système
 * relationnel avance par petits gestes annuels.
 *
 * Six exigences :
 *
 * 1. **l'accord se distribue** — un jugement qui dit la même chose de tout le
 *    monde ne se lit pas ;
 * 2. **il ne se déduit pas de la relation**, sans quoi il suffirait d'emmener
 *    celui qu'on préfère ;
 * 3. **un voyage mal choisi abîme**, sinon emmener n'importe qui est gratuit ;
 * 4. **le geste du séjour compte**, et pas de la même façon selon la personne ;
 * 5. **la classe achète quelque chose** ;
 * 6. **le voyage solitaire n'est pas touché.**
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import { ACCORD_BANDS, CLASSES, MOMENTS, SOURS_UNDER, demandOf } from '../../data/trip.ts';
import { DESTINATIONS } from '../../data/activities.ts';
import {
  accordSays, accordWith, companions, departWith, fitFor, momentFor, priceOf,
  settleTrip, tripBlocker,
} from '../../systems/trip.ts';

/** Un adulte installé, avec du monde autour et de quoi partir. */
function traveller(seed: number): GameState | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 34 && !state.gameOver; i++) simulateYear(state);
  const p = state.player;
  if (state.gameOver || !p.alive || p.prison) return null;
  if (companions(state).length < 3) return null;
  p.money = 300_000;
  p.yearActions = {};
  return state;
}

describe('l’accord', () => {
  it('se distribue au lieu de dire la même chose de tout le monde', () => {
    /*
     * Mesuré sur 5 568 paires (personne × destination) :
     *
     *     min 0,060 · p10 0,365 · médiane 0,544 · p90 0,708 · p99 0,820 · max 0,895
     *
     * **Deux réglages avant celui-là.** Une moyenne pondérée des trois
     * exigences donnait 96 % des paires dans deux bandes sur cinq, et la plus
     * haute appréciation n'était jamais atteinte : trois traits qui tournent
     * autour de cinquante, moyennés, donnent cinquante. Prendre surtout
     * l'exigence **la moins bien couverte** — un voyage se gâche par la seule
     * chose qui ne va pas, pas en moyenne — puis étirer autour du milieu a
     * rouvert l'écart.
     */
    const seen: number[] = [];
    for (let s = 0; s < 24 && seen.length < 600; s++) {
      const state = traveller(1_000 + s);
      if (!state) continue;
      for (const who of companions(state)) {
        for (const dest of DESTINATIONS.slice(0, 6)) seen.push(accordWith(who, dest.id));
      }
    }
    if (seen.length === 0) return;
    const lo = Math.min(...seen);
    const hi = Math.max(...seen);
    // L'étendue doit couvrir la plus grande partie de l'échelle.
    expect(hi - lo).toBeGreaterThan(0.45);
    // Et au moins quatre des cinq appréciations doivent se rencontrer.
    const said = new Set(seen.map((a) => accordSays(a)));
    expect(said.size).toBeGreaterThanOrEqual(4);
    expect(ACCORD_BANDS).toHaveLength(5);
  });

  it('ne se déduit pas de la relation', () => {
    /*
     * Mesuré : corrélation 0,39 entre l'accord et la seule relation, et le
     * meilleur compagnon n'est le plus proche que dans 26 % des cas. Si c'était
     * 100 %, la lecture n'apprendrait rien.
     */
    let sameAsClosest = 0;
    let total = 0;
    for (let s = 0; s < 24; s++) {
      const state = traveller(2_000 + s);
      if (!state) continue;
      for (const dest of DESTINATIONS.slice(0, 6)) {
        const people = companions(state);
        if (people.length < 2) continue;
        const best = people.reduce((a, b) =>
          (accordWith(a, dest.id) > accordWith(b, dest.id) ? a : b));
        total += 1;
        if (best.id === people[0].id) sameAsClosest += 1;
      }
    }
    if (total === 0) return;
    expect(sameAsClosest / total).toBeLessThan(0.7);
  });

  it('dépend de la destination autant que de la personne', () => {
    const state = traveller(7);
    if (!state) return;
    const who = companions(state)[0];
    if (!who) return;
    const spread = DESTINATIONS.slice(0, 6).map((d) => accordWith(who, d.id));
    // La même personne ne convient pas également à tous les voyages.
    expect(Math.max(...spread) - Math.min(...spread)).toBeGreaterThan(0.05);
  });

  it('lit ce que la destination demande, et rien d’autre', () => {
    // Une exigence que le séjour ne réclame pas ne doit pas pouvoir le gâcher.
    const calm = { ...demandOf('staycation') };
    expect(calm.still).toBeGreaterThan(calm.endure);
    const road = demandOf('roadtrip');
    expect(road.endure).toBeGreaterThan(road.still);

    const state = traveller(11);
    if (!state) return;
    const who = companions(state)[0];
    if (!who) return;
    // Quelqu'un d'irascible tient mal la route et très bien la maison.
    const hot: Person = {
      ...who,
      personality: { ...who.personality, temper: 95, discipline: 50, ambition: 40 },
    };
    expect(fitFor(hot, 'roadtrip')).toBeLessThan(fitFor(hot, 'staycation'));
  });
});

describe('ce que le voyage fait à la relation', () => {
  it('coûte quand l’accord est mauvais, et rapporte quand il est bon', () => {
    /*
     * Mesuré sur 120 voyages, par bande d'accord :
     *
     *     mauvais (< 0,46) : −1,3
     *     moyen            : +7,4
     *     bon    (> 0,62)  : +15,7
     *
     * **La promesse a d'abord été fausse.** Le geste du séjour l'emportait sur
     * l'accord et *toutes* les bandes rapportaient, la mauvaise comprise
     * (+6,3). L'accord décide maintenant du signe et le geste de combien —
     * près du seuil, les deux se valent, ce qui est exactement voulu.
     */
    const gains: Record<string, number[]> = { bad: [], good: [] };
    for (let s = 0; s < 40; s++) {
      const state = traveller(3_000 + s);
      if (!state) continue;
      for (const dest of DESTINATIONS.slice(0, 6)) {
        for (const who of companions(state)) {
          const accord = accordWith(who, dest.id);
          const key = accord < SOURS_UNDER ? 'bad' : accord > 0.62 ? 'good' : null;
          if (!key || gains[key].length >= 25) continue;
          const fresh = traveller(3_000 + s);
          const target = fresh?.npcs[who.id];
          if (!fresh || !target) continue;
          const before = target.relationship;
          const gone = departWith(createCtx(fresh), who.id, dest.id, 'normal');
          if (!gone.ok || gone.tone === 'bad') continue;
          settleTrip(createCtx(fresh), who.id, dest.id, 'normal', 0);
          gains[key].push(fresh.npcs[who.id].relationship - before);
        }
      }
    }
    if (gains.bad.length === 0 || gains.good.length === 0) return;
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(gains.good)).toBeGreaterThan(10);
    expect(mean(gains.bad)).toBeLessThan(mean(gains.good) / 2);
  });

  it('laisse une trace chez l’autre', () => {
    const state = traveller(13);
    if (!state) return;
    const who = companions(state)[0];
    if (!who) return;
    const before = who.history.length;
    const gone = departWith(createCtx(state), who.id, 'beach', 'normal');
    if (!gone.ok || gone.tone === 'bad') return;
    settleTrip(createCtx(state), who.id, 'beach', 'normal', 0);
    expect(state.npcs[who.id].history.length).toBeGreaterThan(before);
    expect(state.player.seenPlaces).toContain('beach');
  });
});

describe('ce qui arrive là-bas', () => {
  it('propose une situation, et toujours la même à voyage identique', () => {
    const state = traveller(17);
    if (!state) return;
    const who = companions(state)[0];
    if (!who) return;
    const a = momentFor(state, who.id, 'city');
    const b = momentFor(state, who.id, 'city');
    expect(a.id).toBe(b.id);
    expect(a.options.length).toBeGreaterThanOrEqual(2);
  });

  it('fait valoir le même geste différemment selon la personne', () => {
    /*
     * C'est ce qui distingue un séjour d'un virement de points : proposer de
     * partager l'addition tombe juste avec quelqu'un de rigoureux et à côté
     * avec quelqu'un de large.
     */
    const state = traveller(19);
    if (!state) return;
    const who = companions(state)[0];
    if (!who) return;
    const dest = 'beach';
    const moment = momentFor(state, who.id, dest);
    const option = moment.options[0];

    const gains: number[] = [];
    for (const value of [5, 95]) {
      const fresh = traveller(19);
      const target = fresh?.npcs[who.id];
      if (!fresh || !target) continue;
      target.personality = { ...target.personality, [option.reads]: value };
      const before = target.relationship;
      const gone = departWith(createCtx(fresh), who.id, dest, 'normal');
      if (!gone.ok || gone.tone === 'bad') continue;
      settleTrip(createCtx(fresh), who.id, dest, 'normal', 0);
      gains.push(fresh.npcs[who.id].relationship - before);
    }
    if (gains.length < 2) return;
    expect(gains[0]).not.toBe(gains[1]);
  });

  it('donne à chaque situation des options qui lisent un trait réel', () => {
    const real = ['warmth', 'temper', 'sociability', 'discipline', 'generosity'];
    for (const moment of MOMENTS) {
      expect(moment.options.length, moment.id).toBeGreaterThanOrEqual(2);
      for (const o of moment.options) {
        expect(real, `${moment.id}/${o.label}`).toContain(o.reads);
        expect(o.outcome.length).toBeGreaterThan(15);
      }
    }
  });
});

describe('la classe', () => {
  it('achète du confort et se paie par personne', () => {
    /*
     * Mesuré sur un road trip à deux :
     *
     *     Au plus juste  | 2 569 | incident 15,5 % | × 0,82
     *     Sans se priver | 4 144 | incident 10,0 % | × 1
     *     En grand       | 8 702 | incident  4,2 % | × 1,28
     */
    const state = traveller(23);
    if (!state) return;
    const [petit, normal, grand] = CLASSES;
    expect(priceOf(state, 'roadtrip', grand.id)).toBeGreaterThan(priceOf(state, 'roadtrip', petit.id));
    expect(grand.risk).toBeLessThan(petit.risk);
    expect(grand.worth).toBeGreaterThan(petit.worth);
    // Et par personne : un voyage à deux coûte le double d'un voyage à un.
    expect(priceOf(state, 'roadtrip', normal.id, 2))
      .toBe(priceOf(state, 'roadtrip', normal.id, 1) * 2);
  });
});

describe('ce que ça ne casse pas', () => {
  it('laisse le voyage solitaire intact', () => {
    /*
     * `takeVacation` n'est pas touché : partir à deux est une autre action,
     * avec un autre prix et d'autres suites. On assure sur le fichier plutôt
     * que sur une intention.
     */
    const source = readFileSync(new URL('../../systems/trip.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/export function takeVacation/);
    const state = traveller(29);
    if (!state) return;
    // Et les deux se partagent le même compteur d'année : on ne part pas deux
    // fois, une fois seul et une fois accompagné.
    const who = companions(state)[0];
    if (!who) return;
    state.player.yearActions.vacation = 1;
    expect(tripBlocker(state, who.id, 'beach', 'normal')).toContain('déjà');
  });

  it('n’autorise qu’un voyage à deux par an', () => {
    const state = traveller(31);
    if (!state) return;
    const who = companions(state)[0];
    if (!who) return;
    expect(tripBlocker(state, who.id, 'beach', 'normal')).toBeNull();
    expect(departWith(createCtx(state), who.id, 'beach', 'normal').ok).toBe(true);
    expect(tripBlocker(state, who.id, 'beach', 'normal')).toContain('déjà');
  });

  it('ne tire rien dans la séquence pour choisir la situation', () => {
    // `momentFor` est appelé à la lecture comme à l'écriture : un tirage y
    // décalerait la séquence à chaque affichage de l'écran.
    const source = readFileSync(new URL('../../systems/trip.ts', import.meta.url), 'utf8');
    const body = source.slice(
      source.indexOf('export function momentFor'),
      source.indexOf('/**', source.indexOf('export function momentFor') + 10),
    );
    expect(body).not.toMatch(/\brng\b/);
    expect(body).toMatch(/\bhash\(/);
  });
});
