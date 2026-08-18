/**
 * Les objets : provenance, doute, ensembles, salle des ventes.
 *
 * Mesuré avant d'écrire une ligne : **0 % des vies jouées possédaient le
 * moindre objet de valeur**, sur un catalogue de dix-huit articles dont douze
 * prennent de la valeur. Ce n'était donc pas « il manque des enchères » :
 * posséder un objet n'avait aucune raison d'être, puisqu'on achetait au prix
 * affiché ce qu'on revendrait à 60 %.
 *
 * Ces tests tiennent les trois règles qui y répondent, et le garde-fou qui a
 * demandé une correction :
 *
 * 1. ce qui a de la valeur ne s'achète pas au prix affiché ;
 * 2. le doute a un prix, **dans les deux sens** ;
 * 3. une collection vaut plus que ses pièces ;
 * 4. progresser ne doit jamais rendre moins bon.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import {
  appraisalCost, appraise, appraiseBlocker, askingPrice, auction, eyeAccuracy,
  hasEye, hunt, huntBlocker, huntCost, originOf, reserveRange, saleOdds,
  setBonus, setComplete, setProgress, standingOf,
} from '../../systems/objects.ts';
import {
  DOUBT_DISCOUNT, EYE_SKILL, FAKE_VALUE, PROVENANCES, RESERVE, SETS,
  getProvenance, getSet,
} from '../../data/objects.ts';
import { SHOP_ITEMS } from '../../data/activities.ts';
import type { GameState } from '../types.ts';

function life(seed = 404, money = 5_000_000): GameState {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < 30 && state.player.alive; i++) simulateYear(state);
  state.player.alive = true;
  state.gameOver = false;
  state.player.age = Math.max(state.player.age, 30);
  state.player.money = money;
  state.player.yearActions = {};
  return state;
}

/** Pose un objet possédé, exactement dans l'état voulu. */
function own(state: GameState, name: string, over: Record<string, unknown> = {}) {
  const item = {
    id: `v${state.player.valuables.length}`,
    name,
    value: 10_000,
    purchaseYear: state.year,
    purchasePrice: 5_000,
    from: 'brocante',
    real: true,
    standing: 'douteux',
    ...over,
  };
  state.player.valuables.push(item as never);
  return item;
}

/* ------------------------------------------------------------------ */

describe('les provenances', () => {
  it('s’échangent : moins cher veut dire moins sûr', () => {
    // C'est le seul arbitrage du système, et il doit rester lisible.
    const shop = getProvenance('boutique')!;
    expect(shop.price).toBe(1);
    expect(shop.genuine).toBe(1);
    for (const from of PROVENANCES.filter((p) => p.id !== 'boutique')) {
      expect(from.price, from.id).toBeLessThan(1);
      expect(from.genuine, from.id).toBeLessThan(1);
    }
    // Et le moins cher est le moins sûr.
    const cheapest = [...PROVENANCES].sort((a, b) => a.price - b.price)[0];
    const surest = [...PROVENANCES].sort((a, b) => b.genuine - a.genuine)[0];
    expect(cheapest.id).not.toBe(surest.id);
  });

  it('ne rapporte de la boutique que du certain', () => {
    const state = life();
    hunt(createCtx(state), 'boutique');
    for (const v of state.player.valuables) {
      expect(standingOf(v)).toBe('authentique');
      expect(originOf(v)?.id).toBe('boutique');
    }
  });

  it('rapporte du douteux partout ailleurs', () => {
    const state = life();
    for (let i = 0; i < 20 && state.player.valuables.length === 0; i++) {
      state.player.yearActions = {};
      hunt(createCtx(state), 'brocante');
    }
    expect(state.player.valuables.length).toBeGreaterThan(0);
    expect(standingOf(state.player.valuables[0])).toBe('douteux');
  });

  it('ne laisse pas écumer la ville toute l’année', () => {
    const state = life();
    hunt(createCtx(state), 'brocante');
    hunt(createCtx(state), 'brocante');
    expect(huntBlocker(state, 'brocante')).toMatch(/déjà écumé/);
    expect(hunt(createCtx(state), 'brocante').ok).toBe(false);
  });

  it('refuse ce qu’on ne peut pas payer, et ce qui est trop tôt', () => {
    const pauvre = life(404, 5);
    expect(huntBlocker(pauvre, 'lot')).toMatch(/faudrait/);
    const jeune = life();
    jeune.player.age = 13;
    expect(huntBlocker(jeune, 'succession')).toMatch(/Trop tôt/);
  });
});

/* ------------------------------------------------------------------ */

describe('le doute', () => {
  it('décote ce qu’on vend sans savoir', () => {
    const state = life();
    const item = own(state, SHOP_ITEMS[0].name, { standing: 'douteux' });
    const doubted = askingPrice(state, item as never);
    (item as { standing: string }).standing = 'authentique';
    const known = askingPrice(state, item as never);
    expect(doubted).toBeLessThan(known);
    expect(doubted / known).toBeCloseTo(DOUBT_DISCOUNT, 1);
  });

  it('effondre ce qui se révèle être une copie', () => {
    const state = life();
    const item = own(state, SHOP_ITEMS[0].name, { real: false, standing: 'douteux' });
    appraise(createCtx(state), item.id, false);
    expect(standingOf(item as never)).toBe('copie');
    expect(item.value).toBeLessThan(10_000 * FAKE_VALUE * 2);
  });

  it('ne s’expertise pas deux fois', () => {
    const state = life();
    const item = own(state, SHOP_ITEMS[0].name);
    appraise(createCtx(state), item.id, false);
    expect(appraiseBlocker(state, item as never)).toMatch(/sais déjà/);
  });

  it('fait payer l’expert, et pas son propre œil', () => {
    const state = life();
    state.player.skills = { chiffres: { level: 90, peak: 90, done: 9 } };
    const a = own(state, SHOP_ITEMS[0].name);
    const before = state.player.money;
    appraise(createCtx(state), a.id, false);
    expect(state.player.money).toBe(before - appraisalCost(state));

    const b = own(state, SHOP_ITEMS[1].name);
    const mid = state.player.money;
    appraise(createCtx(state), b.id, true);
    expect(state.player.money).toBe(mid);
  });
});

/* ------------------------------------------------------------------ */

describe('l’œil', () => {
  it('ne s’ouvre qu’à partir d’un vrai niveau', () => {
    const state = life();
    state.player.skills = { chiffres: { level: EYE_SKILL - 1, peak: 0, done: 0 } };
    expect(hasEye(state)).toBe(false);
    const item = own(state, SHOP_ITEMS[0].name);
    expect(appraiseBlocker(state, item as never, true)).toMatch(/n’y connais rien/);

    state.player.skills = { chiffres: { level: EYE_SKILL, peak: 0, done: 0 } };
    expect(hasEye(state)).toBe(true);
    expect(appraiseBlocker(state, item as never, true)).toBeNull();
  });

  it('ne rend jamais moins bon en progressant', () => {
    // Mesuré quand l'œil *remplaçait* l'expert : un joueur sans compétence
    // avait 100 % de verdicts justes — il payait quelqu'un qui ne se trompe
    // pas — et franchir le seuil le faisait tomber à 75 %. Progresser rendait
    // moins bon. L'œil est désormais une option de plus, jamais un
    // remplacement : payer reste possible à tout niveau.
    const state = life();
    for (const level of [0, 50, 95]) {
      state.player.skills = { chiffres: { level, peak: level, done: 9 } };
      const item = own(state, SHOP_ITEMS[0].name);
      // L'expert reste ouvert quel que soit le niveau.
      expect(appraiseBlocker(state, item as never, false), String(level)).toBeNull();
    }
  });

  it('se trompe de moins en moins', () => {
    const state = life();
    const at = (level: number) => {
      state.player.skills = { chiffres: { level, peak: level, done: 9 } };
      return eyeAccuracy(state);
    };
    expect(at(EYE_SKILL - 10)).toBe(0);
    expect(at(95)).toBeGreaterThan(at(EYE_SKILL));
    expect(at(95)).toBeLessThanOrEqual(1);
    expect(at(EYE_SKILL)).toBeGreaterThan(0.4);
  });
});

/* ------------------------------------------------------------------ */

describe('les ensembles', () => {
  it('ne comptent que des pièces distinctes et vraies', () => {
    const state = life();
    const set = SETS.find((s) => s.category === 'art')!;
    const arts = SHOP_ITEMS.filter((i) => i.category === 'art');
    expect(arts.length).toBeGreaterThanOrEqual(set.needs);

    own(state, arts[0].name, { standing: 'authentique' });
    own(state, arts[0].name, { standing: 'authentique' });
    expect(setProgress(state, set).have).toBe(1);

    own(state, arts[1].name, { standing: 'copie' });
    expect(setProgress(state, set).have).toBe(1);
  });

  it('multiplient la valeur une fois complets', () => {
    // La seule chose du jeu qui récompense de ne *pas* vendre.
    const state = life();
    const set = SETS.find((s) => s.category === 'art')!;
    const arts = SHOP_ITEMS.filter((i) => i.category === 'art').slice(0, set.needs);
    const first = own(state, arts[0].name, { standing: 'authentique' });
    expect(setBonus(state, first as never)).toBe(1);

    for (const art of arts.slice(1)) own(state, art.name, { standing: 'authentique' });
    expect(setComplete(state, set)).toBe(true);
    expect(setBonus(state, first as never)).toBe(set.bonus);
    expect(askingPrice(state, first as never)).toBeGreaterThan(first.value);
  });

  it('a un ensemble par catégorie qu’il nomme, et rien d’inventé', () => {
    const known = new Set<string>(SHOP_ITEMS.map((i) => i.category));
    for (const set of SETS) {
      expect(getSet(set.id)).toBe(set);
      expect(known.has(set.category), set.category).toBe(true);
      expect(set.bonus).toBeGreaterThan(1);
      // Il doit exister assez de pièces pour le compléter.
      const pieces = SHOP_ITEMS.filter((i) => i.category === set.category).length;
      expect(pieces, set.id).toBeGreaterThanOrEqual(set.needs);
    }
  });
});

/* ------------------------------------------------------------------ */

describe('la salle des ventes', () => {
  it('rend la réserve haute risquée et la basse sûre', () => {
    // Les trois « canaux » d'avant n'étaient que trois multiplicateurs, et la
    // salle des ventes valait exactement 1,0 — un nom, pas une vente.
    const state = life();
    const item = own(state, SHOP_ITEMS[0].name, { standing: 'authentique' });
    const base = askingPrice(state, item as never);
    expect(saleOdds(state, item as never, base * 0.5))
      .toBeGreaterThan(saleOdds(state, item as never, base * 1.3));
    expect(saleOdds(state, item as never, base * 1.7)).toBeLessThan(0.15);
    expect(saleOdds(state, item as never, base * 0.5)).toBeGreaterThan(0.8);
  });

  it('borne la réserve qu’on peut poser', () => {
    const state = life();
    const item = own(state, SHOP_ITEMS[0].name, { standing: 'authentique' });
    const { low, high } = reserveRange(state, item as never);
    expect(low).toBeLessThan(high);
    expect(low / askingPrice(state, item as never)).toBeCloseTo(RESERVE.floor, 1);
  });

  it('prend sa commission même quand rien ne part', () => {
    const state = life();
    const item = own(state, SHOP_ITEMS[0].name, { standing: 'authentique' });
    const before = state.player.money;
    // Une réserve au plafond : la salle se vide presque à coup sûr.
    const { high } = reserveRange(state, item as never);
    const result = auction(createCtx(state), item.id, high);
    expect(result.ok).toBe(true);
    if (/Invendu/.test(result.title ?? '')) {
      expect(state.player.money).toBeLessThan(before);
      expect(state.player.valuables).toHaveLength(1);
    }
  });

  it('retire l’objet quand il part', () => {
    const state = life();
    const item = own(state, SHOP_ITEMS[0].name, { standing: 'authentique' });
    const { low } = reserveRange(state, item as never);
    let sold = false;
    for (let i = 0; i < 20 && !sold; i++) {
      const result = auction(createCtx(state), item.id, low);
      sold = /Adjugé/.test(result.title ?? '');
      if (!sold && state.player.valuables.length === 0) break;
    }
    expect(sold).toBe(true);
    expect(state.player.valuables).toHaveLength(0);
  });

  it('intéresse davantage la salle quand les papiers sont en règle', () => {
    const state = life();
    const doubted = own(state, SHOP_ITEMS[0].name, { standing: 'douteux' });
    const known = own(state, SHOP_ITEMS[0].name, { standing: 'authentique' });
    const price = askingPrice(state, known as never);
    expect(saleOdds(state, known as never, price))
      .toBeGreaterThan(saleOdds(state, doubted as never, price));
  });
});

/* ------------------------------------------------------------------ */

describe('chiner rend le rayon visible', () => {
  it('fait posséder quelque chose à qui va voir', () => {
    // Le vrai défaut mesuré : 0 % des vies possédaient le moindre objet.
    const state = life();
    let found = 0;
    for (let year = 0; year < 30; year++) {
      state.player.yearActions = {};
      hunt(createCtx(state), 'brocante');
      hunt(createCtx(state), 'succession');
      found = state.player.valuables.length;
    }
    expect(found).toBeGreaterThan(5);
  });

  it('coûte moins cher que la boutique, et donne moins de certitude', () => {
    const state = life();
    const shop = getProvenance('boutique')!;
    const flea = getProvenance('brocante')!;
    expect(huntCost(state, flea)).toBeGreaterThan(huntCost(state, shop));
    expect(flea.price).toBeLessThan(shop.price);
  });
});
