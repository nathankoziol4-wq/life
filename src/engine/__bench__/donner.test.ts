/**
 * Donner — le verbe qui manquait trois fois.
 *
 * Le jeu savait accumuler : quinze sortes de biens, cinquante-six véhicules,
 * des objets de famille qu'on chine et qu'on restaure. Il savait perdre :
 * vendre, saisir, hériter. Il ne savait pas **passer quelque chose à quelqu'un
 * de son vivant** — et trois feuilles du catalogue le disaient séparément :
 * « offrir un objet », « offrir un bien », « offrir un véhicule ».
 *
 * Un seul endroit l'avait, pour les objets de famille, avec déjà la bonne
 * intuition en commentaire : « ce que ça vaut pour l'autre tient à l'âge
 * autant qu'au prix ».
 *
 * Six exigences :
 *
 * 1. **un cadeau ne vaut pas son prix** : ce qu'il vaut dépend de ce que la
 *    personne a déjà ;
 * 2. **et de ce qu'il coûte** à celui qui donne ;
 * 3. **le rendement sature** — au-delà du besoin, donner plus ne rapporte
 *    presque plus rien ;
 * 4. **ce qu'on donne quitte vraiment nos mains**, et arrive dans les
 *    siennes ;
 * 5. **on ne donne pas ce qui n'est pas à soi** : ni un bien qu'on doit
 *    encore, ni le toit sous lequel on dort ;
 * 6. **les objets de famille gardent leur propre porte**, parce que ce qui
 *    compte pour eux est l'âge et non le prix.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, OwnedProperty, OwnedVehicle, Person } from '../types.ts';
import { createPerson } from '../../systems/npc.ts';
import { PURSES, TRUSTED_AGE, WORTH_CAP } from '../../data/giving.ts';
import {
  giveMoney, giveThing, givables, purseValue, worthSays, worthTo,
} from '../../systems/giving.ts';

function grown(seed: number): GameState | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.yearActions = {};
  return state;
}

/** Quelqu'un dont on fixe la fortune, pour mesurer une chose à la fois. */
function friendWith(state: GameState, wealth: number, age = 40): Person {
  const person = createPerson(createCtx(state), { relation: 'friend', age });
  person.wealth = wealth;
  person.relationship = 50;
  person.opinion = 50;
  return person;
}

/** Un joueur dont on fixe la fortune, sans rien d'autre au bilan. */
function worth(state: GameState, money: number): GameState {
  state.player.money = money;
  state.player.properties = [];
  state.player.vehicles = [];
  state.player.loans = [];
  return state;
}

function car(id: string, value: number): OwnedVehicle {
  return {
    id, modelId: 'x', brand: 'Marque', model: 'Modèle', year: 2050,
    purchasePrice: value, purchaseYear: 2050, value, mileage: 10_000,
    condition: 80, insured: true, annualCost: 900, forSale: false,
    reliability: 80, broken: false,
  } as OwnedVehicle;
}

function home(id: string, value: number, opts: Partial<OwnedProperty> = {}): OwnedProperty {
  return {
    id, archetypeId: 'x', name: 'Un logement', cityName: 'Ville', countryId: 'fr',
    purchasePrice: value, purchaseYear: 2050, value, condition: 80, areaM2: 60,
    mortgageBalance: 0, annualPayment: 0, mortgageYearsLeft: 0, interestRate: 0,
    annualCost: 1_200, isResidence: false, rentedOut: false, annualRentIncome: 0,
    ...opts,
  } as OwnedProperty;
}

describe('ce qu’un cadeau vaut', () => {
  it('dépend de ce que la personne a déjà', () => {
    /*
     * Mesuré, cinquante mille donnés par quelqu'un qui a deux millions :
     *
     *     le receveur a       0 → 22,3 points
     *                       50k → 13,4
     *                      200k →  5,3
     *                        1M →  1,3
     *                        5M →  0,3
     *
     * Sans cette règle, « donner » ne serait qu'un convertisseur argent →
     * affection à taux fixe, et le joueur le viderait sur qui lui plaît.
     */
    const state = grown(3);
    if (!state) return;
    worth(state, 2_000_000);
    const poor = worthTo(state, friendWith(state, 0), 50_000);
    const middle = worthTo(state, friendWith(state, 200_000), 50_000);
    const rich = worthTo(state, friendWith(state, 5_000_000), 50_000);

    expect(poor).toBeGreaterThan(middle * 3);
    expect(middle).toBeGreaterThan(rich * 3);
    expect(rich).toBeLessThan(2);
  });

  it('dépend aussi de ce qu’il coûte à celui qui donne', () => {
    // La même somme, au même receveur, venant de deux fortunes différentes.
    const state = grown(5);
    if (!state) return;
    const target = friendWith(state, 50_000);
    worth(state, 60_000);
    const modest = worthTo(state, target, 50_000);
    worth(state, 10_000_000);
    const wealthy = worthTo(state, target, 50_000);
    expect(modest).toBeGreaterThan(wealthy);
  });

  it('sature au lieu d’exploser', () => {
    /*
     * **Ce que la mesure a corrigé.** La première version élevait
     * `valeur / fortune` à la puissance 0,55 : rien ne bornait le résultat
     * sauf le plafond, et le plafond faisait tout le travail — donner la
     * moitié de ce qu'on avait et donner la totalité rapportaient exactement
     * la même chose. Avec `v / (v + f)`, la valeur tend vers un sans jamais
     * l'atteindre, et la plage entière se lit.
     */
    const state = grown(7);
    if (!state) return;
    worth(state, 10_000_000);
    const target = friendWith(state, 20_000);
    const small = worthTo(state, target, 20_000);
    const big = worthTo(state, target, 200_000);
    const huge = worthTo(state, target, 2_000_000);

    expect(big).toBeGreaterThan(small);
    expect(huge).toBeGreaterThan(big);
    // Dix fois plus d'argent, bien moins de dix fois plus de lien.
    expect(huge / small).toBeLessThan(4);
    expect(huge).toBeLessThanOrEqual(WORTH_CAP);
  });

  it('se dit en mots avant d’être fait', () => {
    // Sans cette phrase, le joueur choisirait par le montant et tout le
    // système serait invisible.
    const state = grown(11);
    if (!state) return;
    worth(state, 500_000);
    const needy = friendWith(state, 0);
    const flush = friendWith(state, 4_000_000);
    expect(worthSays(state, needy, 100_000)).not.toBe(worthSays(state, flush, 100_000));
    expect(worthSays(state, flush, 100_000)).toContain('besoin');
  });
});

describe('donner de l’argent', () => {
  it('quitte nos mains et arrive dans les siennes', () => {
    const state = grown(13);
    if (!state) return;
    worth(state, 200_000);
    const target = friendWith(state, 10_000);
    const before = { mine: state.player.money, theirs: target.wealth, link: target.relationship };
    const amount = purseValue(state, 'serieux');

    expect(giveMoney(createCtx(state), target.id, 'serieux').ok).toBe(true);
    expect(state.player.money).toBe(before.mine - amount);
    expect(target.wealth).toBe(before.theirs + amount);
    expect(target.relationship).toBeGreaterThan(before.link);
    // Et cela laisse une trace chez lui.
    expect(target.history.some((h) => /donné/.test(h.text))).toBe(true);
  });

  it('offre des parts et non des sommes', () => {
    /*
     * Une part de ce qu'on a, pas un montant : c'est ce qui fait que la même
     * ligne veut dire quelque chose à vingt ans et à soixante.
     */
    const state = grown(17);
    if (!state) return;
    worth(state, 100_000);
    const amounts = PURSES.map((p) => purseValue(state, p.id));
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i]!).toBeGreaterThan(amounts[i - 1]!);
    }
    worth(state, 0);
    expect(PURSES.every((p) => purseValue(state, p.id) === 0)).toBe(true);
  });
});

describe('donner une chose', () => {
  it('la retire de nos biens', () => {
    const state = grown(19);
    if (!state) return;
    worth(state, 50_000);
    state.player.vehicles = [car('v1', 30_000)];
    const target = friendWith(state, 5_000);

    expect(giveThing(createCtx(state), target.id, 'v1').ok).toBe(true);
    expect(state.player.vehicles).toHaveLength(0);
    expect(target.wealth).toBeGreaterThan(5_000);
  });

  it('refuse ce qui n’est pas vraiment à soi', () => {
    /*
     * Deux règles de conception, et non des commodités : la dette ne suit pas
     * la porte, et l'on ne donne pas le toit sous lequel on dort.
     */
    const state = grown(23);
    if (!state) return;
    worth(state, 50_000);
    state.player.properties = [
      home('owed', 300_000, { mortgageBalance: 120_000 }),
      home('mine', 250_000, { isResidence: true }),
      home('free', 200_000),
    ];
    const list = givables(state);
    expect(list.find((g) => g.id === 'owed')!.blocked).toContain('crédit');
    expect(list.find((g) => g.id === 'mine')!.blocked).toContain('habites');
    expect(list.find((g) => g.id === 'free')!.blocked).toBeNull();

    const target = friendWith(state, 10_000);
    expect(giveThing(createCtx(state), target.id, 'owed').ok).toBe(false);
    expect(giveThing(createCtx(state), target.id, 'mine').ok).toBe(false);
    expect(giveThing(createCtx(state), target.id, 'free').ok).toBe(true);
  });

  it('ne confie pas une maison à un enfant', () => {
    const state = grown(29);
    if (!state) return;
    worth(state, 50_000);
    state.player.vehicles = [car('v1', 20_000)];
    const child = friendWith(state, 0, TRUSTED_AGE - 4);
    const result = giveThing(createCtx(state), child.id, 'v1');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('trop jeune');
    expect(state.player.vehicles).toHaveLength(1);
  });

  it('compte un bien à ce qu’il reste vraiment, dette déduite', () => {
    const state = grown(31);
    if (!state) return;
    worth(state, 10_000);
    state.player.properties = [home('h', 300_000, { mortgageBalance: 100_000 })];
    expect(givables(state)[0]!.value).toBe(200_000);
  });
});

describe('ce qui garde sa propre porte', () => {
  it('laisse les objets de famille à leur système', () => {
    /*
     * Un objet de famille n'est pas une possession mais une pièce de lignée :
     * ce qui compte pour lui est son âge, et `heirlooms.ts#give` le sait déjà.
     * Le dupliquer ici aurait fait deux portes vers deux calculs différents.
     */
    const source = readFileSync(
      new URL('../../systems/giving.ts', import.meta.url).pathname, 'utf8',
    );
    /*
     * **Sur les imports, et non sur le texte.** Deux fois déjà dans cette
     * session, un contrôle de ce genre a échoué sur son propre commentaire :
     * le fichier explique en toutes lettres pourquoi il ne touche pas aux
     * objets de famille, et le mot y figure donc. Ce qui se vérifie ici est
     * qu'il n'en *importe* rien — ce qu'aucune prose ne peut simuler.
     */
    const specifiers = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
    expect(specifiers.length).toBeGreaterThan(3);
    expect(specifiers.some((s) => s.includes('heirloom'))).toBe(false);
    const kinds = new Set(['argent', 'véhicule', 'bien']);
    const state = grown(37);
    if (!state) return;
    worth(state, 10_000);
    state.player.vehicles = [car('v', 1_000)];
    state.player.properties = [home('h', 1_000)];
    for (const g of givables(state)) expect(kinds.has(g.kind)).toBe(true);
  });

  it('dit au joueur où ils se donnent', () => {
    const source = readFileSync(
      new URL('../../screens/GivingScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain('objets de famille');
    // Et l'écran annonce ce que ça vaut pour la personne, pas seulement le prix.
    expect(source).toContain('worthSays');
  });
});
