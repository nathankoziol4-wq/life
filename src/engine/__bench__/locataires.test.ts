/**
 * Vérifications du locatif.
 *
 * L'audit relevait deux feuilles voisines : « Mettre en location » était
 * BASIC — « un interrupteur et un loyer fixe : ni locataire, ni vacance, ni
 * impayé, ni réparation » — et « Locataires comme PNJ » était MISSING :
 * « personne n'habite les biens loués ».
 *
 * Les tests portent sur ce qui distingue un bailleur d'un rentier :
 *
 * 1. **il y a quelqu'un derrière la porte** — un PNJ complet, qui reste dans
 *    la partie après son départ ;
 * 2. **le loyer demandé sélectionne le locataire** — demander cher ne fait
 *    pas fuir tout le monde, cela fait fuir ceux qui ont le choix ;
 * 3. **ce qui est dû n'est pas ce qui est payé** — l'impayé existe, et
 *    l'impôt ne porte que sur ce qui est tombé ;
 * 4. **ce qu'on refuse se paie plus tard** — une réparation ignorée abîme le
 *    bien et le lien ;
 * 5. **la vacance coûte** — un bien vide ne rapporte rien et coûte quand même.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, OwnedProperty } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { buyProperty } from '../../systems/properties.ts';
import { runAnnualFinance } from '../../systems/finance.ts';
import {
  acceptTenant, advanceTenancy, askingRent, careHint, evictTenant, handleRepair,
  listForRent, marketRent, renewLease, rentCollected, rentRoll, setAskingRent,
  stopRenting, strainHint, tenantOf,
} from '../../systems/tenancy.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/**
 * Un propriétaire avec un bien à louer.
 *
 * Le bien est acheté par la vraie fonction du moteur, avec l'argent posé à la
 * main : on veut tester le bail, pas la probabilité qu'une vie jouée seule
 * devienne assez riche pour acheter deux logements.
 */
function landlord(seed: number, age = 34): { state: GameState; prop: OwnedProperty } | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.money = 3_000_000 * state.world.inflation;
  const listing = state.world.propertyListings[0];
  if (!listing) return null;
  if (!buyProperty(createCtx(state), listing.id, 'cash').ok) return null;
  const prop = state.player.properties[state.player.properties.length - 1];
  // Le premier bien acheté devient la résidence : on en achète donc un second.
  const other = state.world.propertyListings[0];
  if (other && buyProperty(createCtx(state), other.id, 'cash').ok) {
    const second = state.player.properties[state.player.properties.length - 1];
    second.isResidence = false;
    state.player.yearActions = {};
    return { state, prop: second };
  }
  prop.isResidence = false;
  state.player.yearActions = {};
  return { state, prop };
}

/** Le même, avec quelqu'un dedans. */
function occupied(seed: number, rentRatio = 1) {
  const setup = landlord(seed);
  if (!setup) return null;
  const { state, prop } = setup;
  setAskingRent(createCtx(state), prop.id, marketRent(state, prop) * rentRatio);
  if (!listForRent(createCtx(state), prop.id).ok) return null;
  if (prop.applicants.length === 0) return null;
  acceptTenant(createCtx(state), prop.id, prop.applicants[0].id);
  return prop.tenancy ? { state, prop } : null;
}

describe('le décor du test tient debout', () => {
  it('produit réellement un bailleur et un locataire', () => {
    // Chaque test de ce fichier commence par `if (!setup) return`. Sans ce
    // garde-fou, un helper cassé les ferait tous passer sans rien vérifier —
    // c'est exactement ce qui est arrivé la première fois.
    let owners = 0;
    let tenants = 0;
    for (let seed = 0; seed < 12; seed++) {
      if (landlord(seed * 7 + 1)) owners += 1;
      if (occupied(seed * 7 + 1)) tenants += 1;
    }
    expect(owners).toBeGreaterThan(8);
    expect(tenants).toBeGreaterThan(6);
  });
});

describe('il y a quelqu’un derrière la porte', () => {
  it('crée de vrais candidats, avec un nom et des revenus', () => {
    const setup = landlord(3);
    if (!setup) return;
    const { state, prop } = setup;
    listForRent(createCtx(state), prop.id);
    if (prop.applicants.length === 0) return;
    for (const applicant of prop.applicants) {
      const npc = state.npcs[applicant.personId];
      expect(npc, applicant.id).toBeDefined();
      expect(npc.firstName.length).toBeGreaterThan(0);
      expect(applicant.affordable).toBeGreaterThan(0);
      expect(applicant.hint.length).toBeGreaterThan(0);
    }
  });

  it('installe le locataire retenu et renvoie les autres', () => {
    const setup = landlord(5);
    if (!setup) return;
    const { state, prop } = setup;
    listForRent(createCtx(state), prop.id);
    if (prop.applicants.length < 2) return;
    const chosen = prop.applicants[0];
    const rejected = prop.applicants.slice(1).map((a) => a.personId);
    acceptTenant(createCtx(state), prop.id, chosen.id);
    expect(prop.tenancy?.personId).toBe(chosen.personId);
    expect(prop.applicants).toEqual([]);
    expect(tenantOf(state, prop)).not.toBeNull();
    for (const id of rejected) expect(state.npcs[id]).toBeUndefined();
  });

  it('laisse l’ancien locataire dans la partie, avec une opinion', () => {
    const setup = occupied(7);
    if (!setup) return;
    const { state, prop } = setup;
    const personId = prop.tenancy!.personId;
    prop.tenancy!.goodwill = 90;
    const before = state.npcs[personId].opinion;
    evictTenant(createCtx(state), prop.id);
    evictTenant(createCtx(state), prop.id);
    expect(prop.tenancy).toBeNull();
    const npc = state.npcs[personId];
    expect(npc).toBeDefined();
    // Il est parti en mauvais termes : la procédure a coûté sa bonne volonté.
    expect(npc.opinion).not.toBe(before);
  });

  it('ne laisse pas louer le logement où l’on vit', () => {
    const setup = landlord(11);
    if (!setup) return;
    const { state } = setup;
    const home = state.player.properties.find((x) => x.isResidence);
    if (!home) return;
    expect(listForRent(createCtx(state), home.id).ok).toBe(false);
  });
});

describe('le loyer demandé sélectionne le locataire', () => {
  it('attire moins de monde quand on demande davantage', () => {
    const count = (ratio: number) => {
      let total = 0;
      let tries = 0;
      for (let seed = 0; seed < 22; seed++) {
        const setup = landlord(seed * 7 + 1);
        if (!setup) continue;
        const { state, prop } = setup;
        setAskingRent(createCtx(state), prop.id, marketRent(state, prop) * ratio);
        listForRent(createCtx(state), prop.id);
        total += prop.applicants.length;
        tries += 1;
      }
      return tries > 0 ? total / tries : 0;
    };
    expect(count(0.7)).toBeGreaterThan(count(1.8) + 0.5);
  });

  it('ne laisse, au prix fort, que des gens qui se serrent', () => {
    // C'est le cœur de l'arbitrage : un loyer élevé n'achète pas un meilleur
    // rendement, il achète un meilleur rendement plus risqué.
    const strain = (ratio: number) => {
      let total = 0;
      let n = 0;
      for (let seed = 0; seed < 26; seed++) {
        const setup = landlord(seed * 11 + 3);
        if (!setup) continue;
        const { state, prop } = setup;
        setAskingRent(createCtx(state), prop.id, marketRent(state, prop) * ratio);
        listForRent(createCtx(state), prop.id);
        for (const a of prop.applicants) {
          total += a.offer / Math.max(1, a.affordable);
          n += 1;
        }
      }
      return n > 0 ? total / n : 0;
    };
    expect(strain(1.7)).toBeGreaterThan(strain(0.7) * 1.5);
  });

  it('rend le locataire à prix fort moins soigneux', () => {
    const care = (ratio: number) => {
      let total = 0;
      let n = 0;
      for (let seed = 0; seed < 26; seed++) {
        const setup = landlord(seed * 13 + 5);
        if (!setup) continue;
        const { state, prop } = setup;
        setAskingRent(createCtx(state), prop.id, marketRent(state, prop) * ratio);
        listForRent(createCtx(state), prop.id);
        for (const a of prop.applicants) { total += a.care; n += 1; }
      }
      return n > 0 ? total / n : 0;
    };
    expect(care(0.7)).toBeGreaterThan(care(1.8));
  });

  it('borne le loyer demandé dans les deux sens', () => {
    const setup = landlord(17);
    if (!setup) return;
    const { state, prop } = setup;
    const market = marketRent(state, prop);
    setAskingRent(createCtx(state), prop.id, 1);
    expect(askingRent(state, prop)).toBeGreaterThan(market * 0.35);
    setAskingRent(createCtx(state), prop.id, market * 100);
    expect(askingRent(state, prop)).toBeLessThan(market * 2.5);
  });

  it('ne change pas le loyer d’un locataire en place', () => {
    const setup = occupied(19);
    if (!setup) return;
    const { state, prop } = setup;
    const rent = prop.tenancy!.rent;
    expect(setAskingRent(createCtx(state), prop.id, rent * 2).ok).toBe(false);
    expect(prop.tenancy!.rent).toBe(rent);
  });
});

describe('ce qui est dû n’est pas ce qui est payé', () => {
  it('fait défaut plus souvent quand le loyer pèse trop lourd', () => {
    const misses = (strainRatio: number) => {
      let missed = 0;
      let years = 0;
      for (let seed = 0; seed < 24; seed++) {
        const setup = occupied(seed * 17 + 7);
        if (!setup) continue;
        const { state, prop } = setup;
        const npc = tenantOf(state, prop)!;
        // On fixe la tension : le loyer vaut `strainRatio` fois ce qu'il
        // peut tenir. Tout le reste est identique.
        npc.salary = Math.round(prop.tenancy!.rent / (0.33 * strainRatio));
        prop.tenancy!.goodwill = 55;
        const ctx = createCtx(state);
        for (let year = 0; year < 4 && prop.tenancy; year++) {
          const before = prop.tenancy.arrears;
          advanceTenancy(ctx, prop);
          years += 1;
          if (prop.tenancy && prop.tenancy.arrears > before) missed += 1;
        }
      }
      return years > 0 ? missed / years : 0;
    };
    expect(misses(1.6)).toBeGreaterThan(misses(0.6) + 0.1);
  });

  it('n’impose que ce qui est réellement tombé', () => {
    const setup = occupied(23);
    if (!setup) return;
    const { state, prop } = setup;
    const npc = tenantOf(state, prop)!;
    // Quelqu'un qui ne peut pas payer : le contractuel et l'encaissé
    // divergent, et c'est le second qui compte.
    npc.salary = 1;
    state.player.rentCollectedThisYear = 0;
    const ctx = createCtx(state);
    let contracted = 0;
    for (let year = 0; year < 6 && prop.tenancy; year++) {
      contracted += prop.tenancy.rent;
      advanceTenancy(ctx, prop);
    }
    expect(contracted).toBeGreaterThan(0);
    expect(rentCollected(state)).toBeLessThan(contracted);
  });

  it('crédite l’argent au moment où il tombe, pas au bilan', () => {
    const setup = occupied(29);
    if (!setup) return;
    const { state, prop } = setup;
    tenantOf(state, prop)!.salary = 10_000_000;
    prop.tenancy!.goodwill = 90;
    state.player.rentCollectedThisYear = 0;
    const before = state.player.money;
    advanceTenancy(createCtx(state), prop);
    const credited = state.player.money - before;
    expect(credited).toBeGreaterThan(0);
    expect(rentCollected(state)).toBe(credited);
    // Le bilan ne doit pas le recréditer une seconde fois. On le vérifie en
    // soldant deux fois la même année : une fois avec le loyer encaissé, une
    // fois sans. Comparer à `beforeSettle + credited` ne disait rien — un
    // salaire suffisamment gros faisait passer l'assertion quoi qu'il arrive.
    const withRent = structuredClone(state);
    const without = structuredClone(state);
    without.player.rentCollectedThisYear = 0;
    runAnnualFinance(createCtx(withRent));
    runAnnualFinance(createCtx(without));
    // Le loyer est déjà sur le compte : il n'ajoute pas de liquidités, il
    // ajoute de l'impôt. La trésorerie finale doit donc être *plus basse*.
    expect(withRent.player.money).toBeLessThanOrEqual(without.player.money);
    expect(rentCollected(withRent)).toBe(0);
  });

  it('distingue le loyer contractuel de l’encaissé', () => {
    const setup = occupied(31);
    if (!setup) return;
    const { state, prop } = setup;
    // Une banque regarde les baux : le contractuel existe même à zéro encaissé.
    state.player.rentCollectedThisYear = 0;
    expect(rentRoll(state)).toBe(prop.tenancy!.rent);
    expect(rentCollected(state)).toBe(0);
  });
});

describe('ce qu’on refuse se paie plus tard', () => {
  it('abîme le bien et le lien quand on ignore une demande', () => {
    const setup = occupied(37);
    if (!setup) return;
    const { state, prop } = setup;
    prop.repair = { year: state.year, label: 'Une fuite', cost: 4000, severity: 14 };
    prop.condition = 60;
    const goodwill = prop.tenancy!.goodwill;
    const care = prop.tenancy!.care;
    const money = state.player.money;
    handleRepair(createCtx(state), prop.id, 'refuser');
    expect(prop.condition).toBeLessThan(60);
    expect(prop.tenancy!.goodwill).toBeLessThan(goodwill);
    expect(prop.tenancy!.care).toBeLessThan(care);
    expect(state.player.money).toBe(money); // ça n'a rien coûté, tout de suite
  });

  it('remonte le bien et le lien quand on répare', () => {
    const setup = occupied(41);
    if (!setup) return;
    const { state, prop } = setup;
    prop.repair = { year: state.year, label: 'Une fuite', cost: 4000, severity: 14 };
    prop.condition = 60;
    const goodwill = prop.tenancy!.goodwill;
    const money = state.player.money;
    handleRepair(createCtx(state), prop.id, 'faire');
    expect(prop.condition).toBeGreaterThan(60);
    expect(prop.tenancy!.goodwill).toBeGreaterThan(goodwill);
    expect(state.player.money).toBe(money - 4000);
  });

  it('place le rafistolage entre les deux, sur les deux axes', () => {
    const outcome = (choice: 'faire' | 'bâcler' | 'refuser') => {
      const setup = occupied(43);
      if (!setup) return null;
      const { state, prop } = setup;
      prop.repair = { year: state.year, label: 'Une fuite', cost: 4000, severity: 14 };
      prop.condition = 60;
      prop.tenancy!.goodwill = 55;
      const money = state.player.money;
      handleRepair(createCtx(state), prop.id, choice);
      return { condition: prop.condition, spent: money - state.player.money };
    };
    const full = outcome('faire');
    const patch = outcome('bâcler');
    const none = outcome('refuser');
    if (!full || !patch || !none) return;
    expect(patch.condition).toBeLessThan(full.condition);
    expect(patch.condition).toBeGreaterThan(none.condition);
    expect(patch.spent).toBeLessThan(full.spent);
    expect(patch.spent).toBeGreaterThan(none.spent);
  });

  it('traite une demande laissée sans réponse comme un refus', () => {
    const setup = occupied(47);
    if (!setup) return;
    const { state, prop } = setup;
    prop.repair = { year: state.year - 2, label: 'Une fuite', cost: 4000, severity: 14 };
    const goodwill = prop.tenancy!.goodwill;
    advanceTenancy(createCtx(state), prop);
    expect(prop.repair).toBeNull();
    expect(prop.tenancy!.goodwill).toBeLessThan(goodwill);
  });

  it('fait payer un locataire négligent en usure', () => {
    const wear = (care: number) => {
      const setup = occupied(53);
      if (!setup) return null;
      const { state, prop } = setup;
      prop.condition = 90;
      prop.tenancy!.care = care;
      tenantOf(state, prop)!.salary = 10_000_000;
      const ctx = createCtx(state);
      for (let year = 0; year < 5 && prop.tenancy; year++) advanceTenancy(ctx, prop);
      return prop.condition;
    };
    const careful = wear(90);
    const careless = wear(10);
    if (careful === null || careless === null) return;
    expect(careless).toBeLessThan(careful);
  });
});

describe('le renouvellement et la vacance', () => {
  it('fait partir celui à qui on demande beaucoup plus', () => {
    const leaves = (rise: number) => {
      let gone = 0;
      let tries = 0;
      for (let seed = 0; seed < 24; seed++) {
        const setup = occupied(seed * 19 + 3);
        if (!setup) continue;
        const { state, prop } = setup;
        prop.tenancy!.yearsLeft = 0;
        prop.tenancy!.goodwill = 55;
        renewLease(createCtx(state), prop.id, prop.tenancy!.rent * rise);
        tries += 1;
        if (!prop.tenancy) gone += 1;
      }
      return tries > 0 ? gone / tries : 0;
    };
    expect(leaves(1.6)).toBeGreaterThan(leaves(1) + 0.2);
  });

  it('fait encaisser davantage à un locataire content', () => {
    // C'est là que la bonne volonté accumulée se transforme en argent.
    const leaves = (goodwill: number) => {
      let gone = 0;
      let tries = 0;
      for (let seed = 0; seed < 26; seed++) {
        const setup = occupied(seed * 23 + 5);
        if (!setup) continue;
        const { state, prop } = setup;
        prop.tenancy!.yearsLeft = 0;
        prop.tenancy!.goodwill = goodwill;
        renewLease(createCtx(state), prop.id, prop.tenancy!.rent * 1.3);
        tries += 1;
        if (!prop.tenancy) gone += 1;
      }
      return tries > 0 ? gone / tries : 0;
    };
    expect(leaves(95)).toBeLessThan(leaves(10));
  });

  it('refuse de renouveler un bail qui court encore', () => {
    const setup = occupied(59);
    if (!setup) return;
    const { state, prop } = setup;
    prop.tenancy!.yearsLeft = 3;
    expect(renewLease(createCtx(state), prop.id, 1).ok).toBe(false);
  });

  it('compte les années de vacance et ne rapporte rien', () => {
    const setup = landlord(61);
    if (!setup) return;
    const { state, prop } = setup;
    prop.rentedOut = true;
    state.player.rentCollectedThisYear = 0;
    const before = state.player.money;
    const ctx = createCtx(state);
    for (let year = 0; year < 3; year++) advanceTenancy(ctx, prop);
    expect(prop.vacantYears).toBe(3);
    expect(state.player.money).toBe(before);
    expect(rentCollected(state)).toBe(0);
  });

  it('ne rend pas un logement occupé d’un claquement de doigts', () => {
    const setup = occupied(67);
    if (!setup) return;
    const { state, prop } = setup;
    expect(stopRenting(createCtx(state), prop.id).ok).toBe(false);
    expect(prop.tenancy).not.toBeNull();
  });
});

describe('ce que l’écran a le droit de dire', () => {
  it('ne donne que des indices, jamais des chiffres cachés', () => {
    // Le soin qu'un locataire prendra est invisible : l'écran ne doit en
    // donner qu'une impression. Sans quoi le choix du dossier ne serait plus
    // un pari mais une lecture de tableau.
    const setup = landlord(71);
    if (!setup) return;
    const { state, prop } = setup;
    listForRent(createCtx(state), prop.id);
    for (const a of prop.applicants) {
      expect(careHint(a)).not.toMatch(/\d/);
      expect(strainHint(a)).not.toMatch(/\d/);
    }
  });

  it('varie l’indice selon ce qui est réellement caché', () => {
    const good = careHint({ care: 90 } as never);
    const bad = careHint({ care: 5 } as never);
    expect(good).not.toBe(bad);
    const tight = strainHint({ offer: 100, affordable: 50 } as never);
    const easy = strainHint({ offer: 100, affordable: 400 } as never);
    expect(tight).not.toBe(easy);
  });
});
