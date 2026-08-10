/**
 * Vérifications du travail à son compte et de l'entreprise.
 *
 * L'audit relevait deux trous de priorité 1 : « aucune activité rémunératrice
 * hors salariat : un chômeur n'a rien à faire », et « le mot entreprise
 * n'existe que comme employeur ». Les tests portent donc sur ce qui
 * distingue une vraie forme de gameplay d'un bouton qui verse de l'argent :
 *
 * 1. **le tarif est un vrai levier, à double tranchant** — il doit exister
 *    un optimum, et il ne doit pas être le même pour tous les métiers ;
 * 2. **le prix est une promesse** — au-dessus de ce qu'on livre, on perd des
 *    clients, quelle que soit la qualité absolue du travail ;
 * 3. **capacité et demande s'arbitrent** — embaucher au-delà de la demande
 *    doit détruire du résultat, sinon « embaucher » n'est pas une décision ;
 * 4. **le temps est fini** — on ne peut pas empiler un plein temps, une
 *    activité indépendante et une entreprise ;
 * 5. **ça peut mal finir** — une entreprise doit pouvoir couler, et la
 *    caution personnelle doit suivre le patron.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { matchesCondition, resolvePending } from '../../systems/randomEvents.ts';
import { ALL_EVENTS } from '../../data/events/index.ts';
import { BUSINESS_KINDS, TRADES, getTrade } from '../../data/ventures.ts';
import { INTERESTS } from '../../data/interests.ts';
import { VOCATIONAL_COURSES } from '../../data/degrees.ts';
import {
  advanceVentures, businessValue, closeBusiness, craftDelivered, drawFromBusiness,
  expectedRevenue, feePromise, forecast, foundBusiness, hireStaff, investInBusiness,
  layOffStaff, listBusiness, marketFee, sellBusiness, setFee, setInvolvement,
  setPricing, startFreelance, takeGig, timeBudget, tradeBlocker, ventureEarnings,
} from '../../systems/venture.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un adulte vivant, libre, sans emploi : le cas que l'audit pointait. */
function idleAdult(seed: number, age = 24): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.job = null;
  state.player.yearActions = {};
  return state;
}

/** Un adulte à son compte dans un métier donné, avec ce qu'il faut pour. */
function freelancer(seed: number, tradeId: string, age = 26): GameState | null {
  const state = idleAdult(seed, age);
  if (!state) return null;
  const trade = getTrade(tradeId)!;
  // On lève les prérequis administratifs : le test porte sur le métier, pas
  // sur la probabilité d'avoir eu le bon diplôme.
  if (trade.needsLevel !== undefined) state.player.education.level = 4;
  if (trade.needsCourse) state.player.flags.vocationalDone = trade.needsCourse;
  if (tradeBlocker(state, trade)) return null;
  if (!startFreelance(createCtx(state), tradeId).ok) return null;
  return state;
}

/* ================================================================== */
/* À SON COMPTE                                                        */
/* ================================================================== */

describe('un adulte sans emploi a quelque chose à faire', () => {
  it('trouve toujours au moins quelques métiers ouverts', () => {
    for (const seed of [3, 17, 41, 88, 131]) {
      const state = idleAdult(seed);
      if (!state) continue;
      const open = TRADES.filter((t) => tradeBlocker(state, t) === null);
      expect(open.length, `graine ${seed}`).toBeGreaterThan(8);
    }
  });

  it('gagne réellement de l’argent en une année', () => {
    let earners = 0;
    for (let seed = 0; seed < 30; seed++) {
      const state = freelancer(seed * 7 + 1, 'bricolage');
      if (!state) continue;
      const before = state.player.money;
      advanceVentures(createCtx(state));
      if (state.player.money > before) earners += 1;
    }
    expect(earners).toBeGreaterThan(20);
  });

  it('ne rapporte rien depuis une cellule, et coûte sa clientèle', () => {
    const state = freelancer(23, 'bricolage');
    if (!state) return;
    const f = state.player.freelance!;
    f.clientele = 70;
    state.player.prison = {
      yearsLeft: 3, totalSentence: 5, security: 'medium', behavior: 50, respect: 30,
      paroleDenials: 0, facilityName: 'Test', escapePlan: 0, suspicion: 0, prepared: [],
    };
    const before = state.player.money;
    advanceVentures(createCtx(state));
    expect(state.player.money).toBe(before);
    expect(f.clientele).toBeLessThan(70);
  });
});

describe('le tarif est le levier, et il coupe des deux côtés', () => {
  it('a un optimum : ni le plancher ni le plafond ne gagnent', () => {
    // Si le meilleur tarif était toujours le plus bas (ou le plus haut), le
    // curseur ne serait pas une décision mais une case à cocher.
    const state = freelancer(7, 'photo');
    if (!state) return;
    const f = state.player.freelance!;
    const market = marketFee(state, getTrade('photo')!);
    f.clientele = 55;
    const at = (ratio: number) => {
      f.fee = Math.round(market * ratio);
      return expectedRevenue(state, f);
    };
    const floor = at(0.4);
    const best = Math.max(at(0.7), at(0.9), at(1.1), at(1.4));
    const ceiling = at(3);
    expect(best).toBeGreaterThan(floor);
    expect(best).toBeGreaterThan(ceiling);
  });

  it('n’a pas le même optimum selon le métier', () => {
    // `contenu` est très peu élastique (les gens ne comparent pas), `livraison`
    // l'est beaucoup. Le même geste doit donner deux résultats opposés.
    const gainFromRaising = (tradeId: string) => {
      const state = freelancer(29, tradeId);
      if (!state) return null;
      const f = state.player.freelance!;
      f.clientele = 60;
      const market = marketFee(state, getTrade(tradeId)!);
      f.fee = market;
      const atMarket = expectedRevenue(state, f);
      f.fee = Math.round(market * 1.5);
      return expectedRevenue(state, f) / Math.max(1, atMarket);
    };
    const inelastic = gainFromRaising('contenu');
    const elastic = gainFromRaising('livraison');
    if (inelastic === null || elastic === null) return;
    expect(inelastic).toBeGreaterThan(1);
    expect(elastic).toBeLessThan(1);
  });

  it('perd des clients quand le prix promet plus que le travail ne livre', () => {
    const churn = (ratio: number) => {
      let lost = 0;
      for (let seed = 0; seed < 25; seed++) {
        const state = freelancer(seed * 13 + 5, 'graphisme');
        if (!state) continue;
        const f = state.player.freelance!;
        f.clientele = 55;
        f.craft = 40;
        f.fee = Math.round(marketFee(state, getTrade('graphisme')!) * ratio);
        const before = f.clientele;
        advanceVentures(createCtx(state));
        if (f.clientele < before) lost += 1;
      }
      return lost;
    };
    // Au même savoir-faire, se vendre trois fois le marché fait fuir bien
    // plus de monde que se vendre à moitié prix.
    expect(churn(2.6)).toBeGreaterThan(churn(0.5));
  });

  it('compare le prix au travail, pas à une échelle absolue', () => {
    // Le même tarif doit être « trop cher » pour un débutant et « donné »
    // pour quelqu'un qui sait faire. C'est l'écart qui compte.
    const state = freelancer(37, 'web');
    if (!state) return;
    const f = state.player.freelance!;
    state.player.stats.intelligence = 88;
    state.player.stats.discipline = 88;
    f.fee = Math.round(marketFee(state, getTrade('web')!) * 1.8);
    const promise = feePromise(state, f);
    f.craft = 10;
    const novice = craftDelivered(state, f);
    f.craft = 95;
    const master = craftDelivered(state, f);
    expect(promise).toBeGreaterThan(novice);
    expect(master).toBeGreaterThan(promise);
  });

  it('fait tenir une clientèle à un prix honnête, et l’efface à un prix menteur', () => {
    // L'attrition est proportionnelle au carnet, et non fixe : sans cela, un
    // écart borné ne pouvait jamais la compenser et *toute* clientèle finissait
    // à zéro quel que soit le prix — ce qui rendait le tarif décoratif.
    // Ce test verrouille l'existence d'un point d'équilibre.
    const settle = (ratio: number) => {
      const state = freelancer(97, 'artisanat');
      if (!state) return null;
      const f = state.player.freelance!;
      const market = marketFee(state, getTrade('artisanat')!);
      state.player.stats.discipline = 55;
      state.player.stats.intelligence = 55;
      f.craft = 55;
      f.clientele = 30;
      f.fee = Math.round(market * ratio);
      const ctx = createCtx(state);
      for (let year = 0; year < 25; year++) {
        f.craft = 55; // on isole l'effet du prix
        advanceVentures(ctx);
      }
      return f.clientele;
    };
    const honest = settle(1);
    const lying = settle(2.6);
    if (honest === null || lying === null) return;
    expect(honest).toBeGreaterThan(8);
    expect(lying).toBeLessThan(3);
  });

  it('fait monter le savoir-faire en travaillant, de moins en moins vite', () => {
    const state = freelancer(43, 'redaction');
    if (!state) return;
    const f = state.player.freelance!;
    f.clientele = 70;
    f.craft = 20;
    advanceVentures(createCtx(state));
    const earlyGain = f.craft - 20;
    f.craft = 85;
    advanceVentures(createCtx(state));
    const lateGain = f.craft - 85;
    expect(earlyGain).toBeGreaterThan(0);
    expect(lateGain).toBeLessThan(earlyGain);
  });
});

describe('les commandes sont un choix, pas un bouton', () => {
  it('réussit plus souvent les commandes qu’on sait tenir', () => {
    const rate = (craft: number) => {
      let won = 0;
      let tried = 0;
      for (let seed = 0; seed < 45; seed++) {
        const state = freelancer(seed * 11 + 3, 'reparation');
        if (!state) continue;
        const f = state.player.freelance!;
        f.craft = craft;
        const gig = f.offers[0];
        if (!gig) continue;
        gig.demand = 60;
        const before = state.player.money;
        takeGig(createCtx(state), gig.id);
        tried += 1;
        if (state.player.money - before >= gig.fee) won += 1;
      }
      return tried > 0 ? won / tried : 0;
    };
    expect(rate(95)).toBeGreaterThan(rate(5) + 0.25);
  });

  it('paie mieux ce qui est plus exigeant', () => {
    // Sans cette corrélation, prendre la commande difficile serait un pur
    // malus, et il n'y aurait aucune raison de le faire.
    let demanding = 0;
    let demandingCount = 0;
    let easy = 0;
    let easyCount = 0;
    for (let seed = 0; seed < 60; seed++) {
      const state = freelancer(seed * 5 + 2, 'photo');
      if (!state) continue;
      const market = marketFee(state, getTrade('photo')!);
      for (const gig of state.player.freelance!.offers) {
        if (gig.demand > 65) { demanding += gig.fee / market; demandingCount += 1; }
        if (gig.demand < 35) { easy += gig.fee / market; easyCount += 1; }
      }
    }
    expect(Math.min(demandingCount, easyCount)).toBeGreaterThan(5);
    expect(demanding / demandingCount).toBeGreaterThan((easy / easyCount) * 1.3);
  });

  it('limite le nombre de commandes tenables dans une année', () => {
    const state = freelancer(53, 'couture');
    if (!state) return;
    const ctx = createCtx(state);
    let taken = 0;
    for (let round = 0; round < 4; round++) {
      for (const gig of [...state.player.freelance!.offers]) {
        if (takeGig(ctx, gig.id).ok) taken += 1;
      }
      // On regarnit le carnet pour vérifier que c'est bien la limite qui
      // s'applique, et pas simplement l'épuisement des offres.
      advanceVentures(ctx);
      state.player.yearActions.gig = Number(state.player.yearActions.gig ?? 0);
    }
    expect(taken).toBeLessThanOrEqual(4);
  });
});

describe('le temps est fini', () => {
  it('laisse moins de place à un salarié à plein temps qu’à un chômeur', () => {
    const state = idleAdult(61);
    if (!state) return;
    const free = timeBudget(state);
    state.player.job = {
      jobId: 'x', title: 'x', level: 0, salary: 30000, employer: 'x', performance: 50,
      yearsAtJob: 1, effort: 'normal', lastRaiseAskYear: 0, partTime: false, hours: 40,
      satisfaction: 50, team: [], warnings: 0, leaveTaken: 0,
    };
    const busy = timeBudget(state);
    expect(busy).toBeLessThan(free * 0.5);
  });

  it('borne réellement ce qu’une activité indépendante peut produire', () => {
    const state = freelancer(67, 'menage');
    if (!state) return;
    const f = state.player.freelance!;
    f.clientele = 80;
    const alone = expectedRevenue(state, f);
    state.player.job = {
      jobId: 'x', title: 'x', level: 0, salary: 30000, employer: 'x', performance: 50,
      yearsAtJob: 1, effort: 'normal', lastRaiseAskYear: 0, partTime: false, hours: 40,
      satisfaction: 50, team: [], warnings: 0, leaveTaken: 0,
    };
    expect(expectedRevenue(state, f)).toBeLessThan(alone * 0.6);
  });
});

/* ================================================================== */
/* L'ENTREPRISE                                                        */
/* ================================================================== */

/** Un patron, avec ce qu'il faut pour ouvrir la maison voulue. */
function owner(seed: number, kindId: string, age = 30): GameState | null {
  const state = idleAdult(seed, age);
  if (!state) return null;
  const kind = BUSINESS_KINDS.find((k) => k.id === kindId)!;
  state.player.education.level = 4;
  if (kind.needsCourse) state.player.education.degrees.length = 0;
  state.player.flags.vocationalDone = kind.needsCourse ?? '';
  state.player.money = 400000;
  if (!foundBusiness(createCtx(state), kindId, 'Maison Test').ok) return null;
  return state;
}

describe('on peut posséder une entreprise', () => {
  it('l’ouvre, la finance, et en garde la trace', () => {
    const state = owner(3, 'cafe');
    expect(state).not.toBeNull();
    const b = state!.player.business!;
    expect(b.name).toBe('Maison Test');
    expect(b.cash).toBeGreaterThan(0);
    expect(state!.player.money).toBeLessThan(400000);
  });

  it('la compte dans le patrimoine', () => {
    const state = owner(5, 'agence_web');
    if (!state) return;
    const b = state.player.business!;
    b.history.unshift({ year: state.year, revenue: 400000, profit: 90000 });
    expect(businessValue(state)).toBeGreaterThan(0);
  });
});

describe('capacité et demande s’arbitrent', () => {
  it('détruit du résultat quand on embauche au-delà de la demande', () => {
    // C'est le cœur de la boucle : si embaucher était toujours bon,
    // « embaucher » ne serait pas une décision.
    const state = owner(11, 'coiffeur');
    if (!state) return;
    const ctx = createCtx(state);
    const b = state.player.business!;
    b.renown = 25;
    b.cash = 400000;
    const lean = forecast(state).profit;
    hireStaff(ctx, 10);
    const bloated = forecast(state).profit;
    expect(bloated).toBeLessThan(lean);
    expect(forecast(state).capacity).toBeGreaterThan(forecast(state).demand);
  });

  it('gagne à embaucher quand la demande dépasse la capacité', () => {
    const state = owner(13, 'nettoyage');
    if (!state) return;
    const ctx = createCtx(state);
    const b = state.player.business!;
    b.renown = 95;
    b.quality = 80;
    b.cash = 600000;
    const before = forecast(state);
    expect(before.demand).toBeGreaterThan(before.capacity);
    hireStaff(ctx, 3);
    expect(forecast(state).profit).toBeGreaterThan(before.profit);
  });

  it('fait payer la présence du patron dans les deux sens', () => {
    const state = owner(17, 'restaurant');
    if (!state) return;
    const ctx = createCtx(state);
    setInvolvement(ctx, 'absent');
    const away = forecast(state).capacity;
    setInvolvement(ctx, 'total');
    const there = forecast(state).capacity;
    expect(there).toBeGreaterThan(away);
    // Et ce que ça prend sur le reste de la vie doit se voir.
    expect(timeBudget(state)).toBeLessThan(0.25);
  });

  it('échange du volume contre de la marge selon les prix', () => {
    const state = owner(19, 'epicerie');
    if (!state) return;
    const ctx = createCtx(state);
    const b = state.player.business!;
    b.renown = 70;
    b.staff = 3;
    setPricing(ctx, 'bas');
    const cheap = forecast(state);
    setPricing(ctx, 'haut');
    const dear = forecast(state);
    expect(cheap.demand).toBeGreaterThan(dear.demand);
  });

  it('sanctionne un prix élevé que la qualité ne justifie pas', () => {
    const state = owner(23, 'atelier');
    if (!state) return;
    const ctx = createCtx(state);
    const b = state.player.business!;
    b.quality = 30;
    b.renown = 60;
    setPricing(ctx, 'haut');
    advanceVentures(ctx);
    const dear = b.renown;
    b.quality = 30;
    b.renown = 60;
    setPricing(ctx, 'normal');
    advanceVentures(ctx);
    expect(b.renown).toBeGreaterThan(dear);
  });
});

describe('investir, se verser, et l’imposition', () => {
  it('rend décroissant le rendement de l’investissement', () => {
    const state = owner(29, 'salle_sport');
    if (!state) return;
    const ctx = createCtx(state);
    const b = state.player.business!;
    state.player.money = 2000000;
    b.quality = 20;
    investInBusiness(ctx, 20000, 'qualité');
    const first = b.quality - 20;
    b.quality = 20;
    investInBusiness(ctx, 80000, 'qualité');
    const fourfold = b.quality - 20;
    expect(fourfold).toBeGreaterThan(first);
    expect(fourfold).toBeLessThan(first * 4);
  });

  it('impose ce que le patron se verse, pas ce qu’il laisse en caisse', () => {
    const state = owner(31, 'conseil');
    if (!state) return;
    const ctx = createCtx(state);
    const b = state.player.business!;
    b.cash = 100000;
    expect(ventureEarnings(state)).toBe(0);
    drawFromBusiness(ctx, 40000);
    expect(ventureEarnings(state)).toBe(40000);
    expect(b.cash).toBe(60000);
  });

  it('ne compte pas deux fois l’argent gagné à son compte', () => {
    // Il est crédité au moment où il est gagné : le bilan doit s'en servir
    // pour l'impôt, pas pour l'encaissement.
    const state = freelancer(41, 'cours');
    if (!state) return;
    state.player.freelance!.clientele = 70;
    const before = state.player.money;
    advanceVentures(createCtx(state));
    const credited = state.player.money - before;
    const taxable = ventureEarnings(state);
    expect(credited).toBeGreaterThan(0);
    expect(taxable).toBe(credited);
    // Une année complète : l'argent ne doit pas réapparaître au bilan.
    const afterYear = state.player.money;
    simulateYear(state);
    expect(state.player.money).toBeLessThan(afterYear + credited * 3);
  });
});

describe('ça peut mal finir, et bien finir', () => {
  it('coule une maison qui perd durablement de l’argent', () => {
    let failed = 0;
    for (let seed = 0; seed < 20; seed++) {
      const state = owner(seed * 9 + 7, 'transport');
      if (!state) continue;
      const b = state.player.business!;
      // Un modèle intenable : personne ne connaît la maison, tout le monde
      // est payé. Elle doit fermer, pas survivre indéfiniment.
      b.renown = 2;
      b.quality = 10;
      b.cash = 0;
      b.staff = 10;
      const ctx = createCtx(state);
      for (let year = 0; year < 6 && state.player.business; year++) advanceVentures(ctx);
      if (!state.player.business) failed += 1;
    }
    expect(failed).toBeGreaterThan(14);
  });

  it('fait suivre une part des dettes au patron', () => {
    const state = owner(47, 'batiment');
    if (!state) return;
    const b = state.player.business!;
    b.debt = 300000;
    b.cash = 0;
    state.player.money = 20000;
    const debtsBefore = state.player.loans.reduce((s, l) => s + l.balance, 0);
    closeBusiness(createCtx(state), true);
    const debtsAfter = state.player.loans.reduce((s, l) => s + l.balance, 0);
    expect(state.player.money + debtsBefore).toBeLessThan(20000 + debtsAfter);
  });

  it('paie mieux une maison qui gagne de l’argent', () => {
    const rich = owner(53, 'logiciel');
    const poor = owner(53, 'logiciel');
    if (!rich || !poor) return;
    for (const [state, profit] of [[rich, 250000], [poor, 4000]] as const) {
      const b = state.player.business!;
      b.history = [0, 1, 2].map((i) => ({ year: state.year - i, revenue: profit * 3, profit }));
      b.renown = 70;
      b.quality = 70;
    }
    expect(businessValue(rich)).toBeGreaterThan(businessValue(poor) * 3);
  });

  it('propose des offres de reprise qui coûtent chacune autre chose', () => {
    const state = owner(59, 'boulangerie');
    if (!state) return;
    const ctx = createCtx(state);
    const b = state.player.business!;
    b.history = [{ year: state.year - 1, revenue: 300000, profit: 70000 }];
    b.foundedYear = state.year - 4;
    expect(listBusiness(ctx).ok).toBe(true);
    const offers = b.offers;
    expect(offers.length).toBeGreaterThan(1);
    // Ce qui se paie le mieux se paie en autre chose : l'offre la plus
    // chère ne doit jamais être celle sans condition.
    const best = offers.reduce((a, o) => (o.price > a.price ? o : a));
    if (offers.some((o) => o.clause === 'aucune')) {
      expect(best.clause).not.toBe('aucune');
    }
    const money = state.player.money;
    expect(sellBusiness(ctx, best.id).ok).toBe(true);
    expect(state.player.business).toBeNull();
    expect(state.player.money).toBeGreaterThan(money);
  });

  it('rembourse les départs quand on allège l’équipe', () => {
    const state = owner(61, 'fleuriste');
    if (!state) return;
    const ctx = createCtx(state);
    const b = state.player.business!;
    b.cash = 200000;
    hireStaff(ctx, 3);
    const cash = b.cash;
    const renown = b.renown;
    layOffStaff(ctx, 2);
    expect(b.staff).toBe(1);
    expect(b.cash).toBeLessThan(cash);
    expect(b.renown).toBeLessThan(renown);
  });
});

describe('les ennuis du métier arrivent vraiment', () => {
  it('réserve les événements d’indépendant à ceux qui le sont', () => {
    // Un événement conditionné sur un état que rien ne produit ne se
    // déclenche jamais : c'est du contenu mort. On vérifie que la condition
    // est bien lue, dans les deux sens.
    const state = idleAdult(83);
    if (!state) return;
    const solo = ALL_EVENTS.filter((e) => e.cond?.hasFreelance || e.cond?.hasBusiness);
    expect(solo.length).toBeGreaterThan(8);

    const eligible = () => solo.filter((e) => matchesCondition(state, e.cond)).length;
    expect(eligible()).toBe(0);
    startFreelance(createCtx(state), 'artisanat');
    expect(eligible()).toBeGreaterThan(2);
  });
});

/* ================================================================== */
/* COHÉRENCE DU CATALOGUE                                              */
/* ================================================================== */

describe('le catalogue tient debout', () => {
  it('ne nomme que des intérêts et des formations qui existent', () => {
    const interests = new Set(INTERESTS.map((i) => i.id));
    const courses = new Set(VOCATIONAL_COURSES.map((c) => c.id));
    for (const trade of TRADES) {
      if (trade.interest) expect(interests, trade.id).toContain(trade.interest);
      if (trade.needsCourse) expect(courses, trade.id).toContain(trade.needsCourse);
    }
    for (const kind of BUSINESS_KINDS) {
      if (kind.needsCourse) expect(courses, kind.id).toContain(kind.needsCourse);
    }
  });

  it('donne à chaque entreprise un modèle qui peut être rentable', () => {
    // Une maison qu'aucun réglage ne rend rentable serait un piège, pas un
    // choix. On vérifie qu'à pleine notoriété et à taille naturelle, elle
    // gagne de l'argent.
    for (const kind of BUSINESS_KINDS) {
      const state = owner(71, kind.id, 34);
      if (!state) continue;
      const b = state.player.business!;
      b.renown = 92;
      b.quality = 88;
      b.staff = kind.ceiling;
      b.involvement = 'présent';
      expect(forecast(state).profit, kind.id).toBeGreaterThan(0);
    }
  });

  it('rend une activité indépendante viable dans chaque métier', () => {
    for (const trade of TRADES) {
      const state = freelancer(73, trade.id, 30);
      if (!state) continue;
      const f = state.player.freelance!;
      f.clientele = 85;
      f.craft = 85;
      // Un indépendant bien installé doit vivre de son métier, sinon le
      // métier n'est qu'un décor.
      expect(expectedRevenue(state, f), trade.id).toBeGreaterThan(6000);
    }
  });

  it('borne le tarif dans les deux sens', () => {
    const state = freelancer(79, 'jardinage');
    if (!state) return;
    const ctx = createCtx(state);
    const f = state.player.freelance!;
    const market = marketFee(state, getTrade('jardinage')!);
    setFee(ctx, 1);
    expect(f.fee).toBeGreaterThan(market * 0.3);
    setFee(ctx, market * 100);
    expect(f.fee).toBeLessThan(market * 3.5);
  });
});
