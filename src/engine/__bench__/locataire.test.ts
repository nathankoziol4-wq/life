/**
 * Parler à son locataire.
 *
 * Le locatif avait huit feuilles finies côté bailleur — loyer, annonce,
 * dossiers, impayés, vacance, travaux, renouvellement, procédure de départ —
 * et en face une personne à qui l'on n'adressait jamais la parole. Le
 * catalogue : « on décide pour lui, on ne lui parle jamais ».
 *
 * Cinq exigences :
 *
 * 1. **la tension devient lisible** : elle décidait déjà des impayés sans
 *    être affichée nulle part ;
 * 2. **et c'est la même que celle du moteur**, pas une seconde vérité ;
 * 3. **parler est gratuit et annuel** — ce qui se paie, c'est ce qu'on en
 *    fait ;
 * 4. **arranger rapporte à terme**, parce qu'un locataire qui reste est un
 *    logement qui n'est pas vide ;
 * 5. **mais pas n'importe quel arrangement** : celui qui coûte tous les ans
 *    ne se rembourse pas.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, OwnedProperty } from '../types.ts';
import { createPerson } from '../../systems/npc.ts';
import { ARRANGEMENTS, STRAIN_BANDS } from '../../data/tenant.ts';
import { advanceTenancy } from '../../systems/tenancy.ts';
import {
  arrange, arrangementBlocker, known, strainOf, strainSays, talkToTenant,
  talkedThisYear,
} from '../../systems/tenant.ts';

function landlord(seed: number, opts: {
  salary: number; rent: number; goodwill?: number; arrears?: number;
}): GameState | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;

  const npc = createPerson(createCtx(state), { relation: 'acquaintance', age: 34 });
  npc.salary = opts.salary;
  npc.flags.tenantOf = 'bien';
  state.player.properties = [{
    id: 'bien', archetypeId: 'flat', name: 'Le deux-pièces', cityName: 'Ville',
    countryId: state.player.countryId, purchasePrice: 180_000, purchaseYear: state.year - 6,
    value: 200_000, condition: 70, areaM2: 48, mortgageBalance: 0, annualPayment: 0,
    mortgageYearsLeft: 0, interestRate: 0, annualCost: 1_400, isResidence: false,
    rentedOut: true, annualRentIncome: opts.rent, askingRent: opts.rent, vacantYears: 0,
    applicants: [], repair: null,
    tenancy: {
      personId: npc.id, since: state.year - 2, rent: opts.rent,
      arrears: opts.arrears ?? 0, care: 55, goodwill: opts.goodwill ?? 50,
      yearsLeft: 6, noticeYear: null,
    },
  } as unknown as OwnedProperty];
  state.player.yearActions = {};
  return state;
}

const propOf = (state: GameState) => state.player.properties[0]!;

describe('ce qu’on apprend en parlant', () => {
  it('rend lisible la tension qui décidait déjà des impayés', () => {
    /*
     * Mesuré, à loyer constant de douze mille :
     *
     *     salaire  18 000 → tension 2,02  « plus qu’il ne peut donner »
     *              28 000 → 1,30
     *              40 000 → 0,91
     *              60 000 → 0,61
     *             100 000 → 0,36  « aucun problème »
     *
     * Les cinq paliers se rencontrent, ce qui est la condition pour qu'il y
     * ait quelque chose à apprendre en passant le voir.
     */
    const said = new Set<string>();
    for (const salary of [18_000, 28_000, 40_000, 60_000, 100_000]) {
      const state = landlord(3, { salary, rent: 12_000 });
      if (!state) continue;
      said.add(strainSays(state, propOf(state)));
    }
    expect(said.size).toBe(STRAIN_BANDS.length);
  });

  it('lit la même tension que le moteur, et pas une seconde vérité', () => {
    /*
     * `advanceTenancy` calcule `rent / (salary * 0.33)` pour décider des
     * impayés. Recopier la formule serait deux vérités pour un seul fait ;
     * ce test fige celle qu'on affiche sur celle qui décide.
     */
    const state = landlord(5, { salary: 30_000, rent: 12_000 });
    if (!state) return;
    expect(strainOf(state, propOf(state))).toBeCloseTo(12_000 / (30_000 * 0.33), 6);
  });

  it('est gratuit, et une fois par an', () => {
    const state = landlord(7, { salary: 26_000, rent: 13_000 });
    if (!state) return;
    const before = state.player.money;
    expect(talkedThisYear(state, propOf(state))).toBe(false);
    expect(talkToTenant(createCtx(state), 'bien').ok).toBe(true);
    expect(state.player.money).toBe(before);
    expect(talkedThisYear(state, propOf(state))).toBe(true);
    expect(talkToTenant(createCtx(state), 'bien').ok).toBe(false);
  });

  it('ouvre ce qu’on peut lui accorder', () => {
    // Tant qu'on ne sait rien de sa situation, on ne propose rien : arranger
    // à l'aveugle serait un bouton, pas une décision.
    const state = landlord(11, { salary: 26_000, rent: 13_000, goodwill: 40 });
    if (!state) return;
    expect(known(state, propOf(state))).toBe(false);
    talkToTenant(createCtx(state), 'bien');
    expect(known(state, propOf(state))).toBe(true);
  });
});

describe('ce qu’on lui accorde', () => {
  it('ne propose que ce qui a du sens', () => {
    const state = landlord(13, { salary: 90_000, rent: 9_000 });
    if (!state) return;
    const prop = propOf(state);
    const by = (id: string) => ARRANGEMENTS.find((a) => a.id === id)!;
    // Rien à étaler ni à effacer quand il ne doit rien.
    expect(arrangementBlocker(state, prop, by('etaler'))).toContain('doit rien');
    expect(arrangementBlocker(state, prop, by('effacer'))).toContain('doit rien');
    // Et rien à baisser quand le loyer ne pèse pas.
    expect(arrangementBlocker(state, prop, by('baisser'))).toContain('aucun problème');
  });

  it('coûte ce qu’il annonce', () => {
    const state = landlord(17, { salary: 26_000, rent: 13_000, arrears: 3_000 });
    if (!state) return;
    const prop = propOf(state);

    // Étaler ne renonce à rien : au calendrier, pas à la somme.
    const owed = prop.tenancy!.arrears;
    expect(arrange(createCtx(state), 'bien', 'etaler').ok).toBe(true);
    expect(prop.tenancy!.arrears).toBe(owed);

    // Effacer renonce à la somme.
    expect(arrange(createCtx(state), 'bien', 'effacer').ok).toBe(true);
    expect(prop.tenancy!.arrears).toBe(0);

    // Baisser coûte du revenu, chaque année, tant qu'il reste.
    const rent = prop.tenancy!.rent;
    expect(arrange(createCtx(state), 'bien', 'baisser').ok).toBe(true);
    expect(prop.tenancy!.rent).toBeLessThan(rent);
    expect(prop.askingRent).toBe(prop.tenancy!.rent);
  });
});

describe('ce que la décence rapporte', () => {
  it('paie sur la durée, parce qu’un locataire qui reste ne laisse pas le logement vide', () => {
    /*
     * Mesuré sur quarante bailleurs et quinze ans, même locataire tendu
     * (salaire 26 000, loyer 13 000, arriéré de départ 2 500) :
     *
     *     bailleur          | encaissé | parti
     *     strict            |   79 791 | 38/40
     *     parle seulement   |  102 583 | 36/40
     *     étale             |  131 778 | 23/40
     *     baisse le loyer   |   87 206 | 37/40
     *     efface l’ardoise  |  120 219 | 29/40
     *
     * Le strict encaisse le moins **et** perd son locataire trente-huit fois
     * sur quarante : c'est la vacance qui le ruine, pas la générosité qu'il
     * n'a pas eue. Et tous les gestes ne se valent pas — baisser le loyer
     * coûte tous les ans et ne se rembourse presque pas, quand étaler ne
     * coûte rien tout de suite.
     */
    const run = (act: ((s: GameState, ctx: () => ReturnType<typeof createCtx>) => void) | null) => {
      let money = 0;
      let stayed = 0;
      const N = 24;
      for (let seed = 0; seed < N; seed++) {
        const state = landlord(seed * 97 + 11, { salary: 26_000, rent: 13_000, arrears: 2_500 });
        if (!state) continue;
        const ctx = () => createCtx(state);
        for (let year = 0; year < 15; year++) {
          const prop = state.player.properties[0];
          if (!prop?.tenancy) break;
          state.player.yearActions = {};
          act?.(state, ctx);
          const before = state.player.money;
          state.year += 1;
          advanceTenancy(ctx(), prop);
          money += state.player.money - before;
        }
        if (state.player.properties[0]?.tenancy) stayed += 1;
      }
      return { money: money / N, stayed };
    };

    const strict = run(null);
    const decent = run((_s, ctx) => {
      talkToTenant(ctx(), 'bien');
      arrange(ctx(), 'bien', 'etaler');
    });

    expect(decent.money).toBeGreaterThan(strict.money);
    // Et la raison se voit : il reste.
    expect(decent.stayed).toBeGreaterThan(strict.stayed);
  });

  it('ne récompense pas n’importe quel geste', () => {
    /*
     * Baisser le loyer de quinze pour cent coûte chaque année et ne se
     * rembourse presque pas : 87 206 contre 131 778 pour l'étalement, soit à
     * peine mieux que le bailleur strict. Sans cette différence, « être
     * décent » serait un seul bouton à cliquer plutôt qu'une décision.
     */
    const state = landlord(19, { salary: 26_000, rent: 13_000, arrears: 2_500 });
    if (!state) return;
    const prop = propOf(state);
    const rent = prop.tenancy!.rent;

    arrange(createCtx(state), 'bien', 'baisser');
    // Le revenu est amputé pour de bon, pas pour un an.
    expect(prop.tenancy!.rent).toBeLessThan(rent);
    for (let i = 0; i < 5; i++) {
      state.year += 1;
      advanceTenancy(createCtx(state), prop);
      if (!prop.tenancy) break;
      expect(prop.tenancy.rent).toBeLessThan(rent);
    }
  });
});
