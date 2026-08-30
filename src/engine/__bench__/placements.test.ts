/**
 * Vérifications des placements.
 *
 * Un système d'investissement est facile à écrire et difficile à rendre
 * intéressant : il suffit d'un tirage au sort et d'un pourcentage pour avoir
 * l'air d'en avoir un. Les tests ci-dessous portent donc sur les quatre
 * propriétés sans lesquelles ce ne serait qu'un bandit manchot :
 *
 * 1. **le choix est réel** — à l'horizon où l'on décide, aucun support n'en
 *    écrase un autre sur tous les tableaux à la fois ;
 * 2. **la répartition paie** — et c'est la seule chose que le marché donne
 *    gratuitement ;
 * 3. **rien n'est décoratif** — chaque nombre de `assets.ts` doit se voir
 *    dans la simulation, y compris les frais et les blocages ;
 * 4. **le personnage compte** — ce qu'il comprend décide de ce qu'il peut
 *    acheter et de ce qu'il voit avant d'acheter.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import { clamp } from '../rng.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { ASSETS, getAsset } from '../../data/assets.ts';
import {
  advanceMarkets, advancePortfolio, assetBlocker, assetInsight, concentration, divest, holdingsOf,
  holdingValue, initialAssetPrices, invest, isLocked, literacy, marketOf,
  minimumTicket, portfolioIncome, portfolioValue, unitPrice, unrealizedGain,
} from '../../systems/investing.ts';
import { netWorth } from '../../systems/finance.ts';

/* ------------------------------------------------------------------ */
/* Outils de mesure                                                    */
/* ------------------------------------------------------------------ */

/** Fait vivre les seuls cours, sans le reste de la simulation. */
function runMarket(seed: number, years: number): GameState {
  const state = createNewLife({ seed });
  state.world.assetPrices = initialAssetPrices();
  for (let year = 0; year < years; year++) {
    const ctx = createCtx(state);
    // La conjoncture évolue comme dans le jeu : c'est elle qui corrèle tout.
    state.world.economy = clamp(state.world.economy * 0.72 + ctx.rng.float(-0.6, 0.6), -1, 1);
    advanceMarkets(ctx);
  }
  return state;
}

const quantile = (xs: number[], p: number): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length * p)];

/** Multiples finaux de chaque support, sur `runs` mondes de `years` années. */
function multiples(runs: number, years: number): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const asset of ASSETS) out[asset.id] = [];
  for (let seed = 0; seed < runs; seed++) {
    const state = runMarket(seed * 17 + 1, years);
    for (const asset of ASSETS) {
      out[asset.id].push(marketOf(state, asset.id).price / 100);
    }
  }
  return out;
}

/** Une vie adulte avec de quoi placer. */
function investorLife(seed: number, cash = 400_000): GameState {
  const state = createNewLife({ seed });
  for (let year = 0; year < 30 && !state.gameOver; year++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  // Une vie peut finir avant les trente ans demandés — `simulateYear` sort
  // aussitôt dès que le personnage est mort, si bien que la boucle rend un
  // cadavre d'un an là où le test croit tenir un investisseur. C'est ce qui
  // est arrivé ici : la graine 23 mourait au berceau, et l'assertion
  // échouait pour une raison qui n'avait rien à voir avec elle.
  if (!state.player.alive || state.player.age < 30) {
    state.player.alive = true;
    state.player.deathCause = null;
    state.player.deathYear = null;
    state.gameOver = false;
    state.year += 30 - state.player.age;
    state.player.age = 30;
  }
  state.player.money = cash;
  state.player.financialLiteracy = 80;
  state.player.yearActions = {};
  return state;
}

/* ------------------------------------------------------------------ */

describe('le marché', () => {
  it('laisse un vrai choix à l’horizon où l’on décide', () => {
    // Six ans : la durée au bout de laquelle un joueur veut son argent pour
    // acheter un logement. À cet horizon, aucun support ne doit être meilleur
    // qu'un autre sur *tous* les tableaux — rendement médian, plancher,
    // plafond, blocage, ticket, frais et difficulté.
    const finals = multiples(220, 6);
    const stat = (id: string) => ({
      med: quantile(finals[id], 0.5),
      low: quantile(finals[id], 0.1),
      high: quantile(finals[id], 0.9),
    });

    const dominations: string[] = [];
    for (const a of ASSETS) {
      for (const b of ASSETS) {
        if (a.id === b.id) continue;
        const A = stat(a.id);
        const B = stat(b.id);
        const betterReturn = A.med >= B.med && A.low >= B.low && A.high >= B.high;
        const easier = a.lockYears <= b.lockYears && a.minimum <= b.minimum
          && a.literacy <= b.literacy && a.fee <= b.fee;
        if (betterReturn && easier) dominations.push(`${a.id} écrase ${b.id}`);
      }
    }
    expect(dominations).toEqual([]);
  });

  it('récompense la patience sur une vie entière', () => {
    // L'inverse est vrai à long terme, et c'est voulu : le jeu fait payer
    // l'attente, pas l'audace. Sans cela, placer n'aurait aucun intérêt.
    const finals = multiples(120, 40);
    expect(quantile(finals.index, 0.5)).toBeGreaterThan(quantile(finals.passbook, 0.5) * 2);
    expect(quantile(finals.passbook, 0.5)).toBeGreaterThan(1);
  });

  it('ne fait pas monter tout le monde ensemble', () => {
    // Si tous les supports montaient et tombaient de concert, répartir ne
    // servirait à rien et le portefeuille ne serait qu'une addition.
    const gold: number[] = [];
    const index: number[] = [];
    for (let seed = 0; seed < 60; seed++) {
      const state = createNewLife({ seed: seed * 23 + 5 });
      state.world.assetPrices = initialAssetPrices();
      for (let year = 0; year < 25; year++) {
        const ctx = createCtx(state);
        state.world.economy = clamp(state.world.economy * 0.72 + ctx.rng.float(-0.6, 0.6), -1, 1);
        advanceMarkets(ctx);
        gold.push(marketOf(state, 'gold').lastChange);
        index.push(marketOf(state, 'index').lastChange);
      }
    }
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const mg = mean(gold);
    const mi = mean(index);
    let cov = 0;
    let vg = 0;
    let vi = 0;
    for (const [i, g] of gold.entries()) {
      cov += (g - mg) * (index[i] - mi);
      vg += (g - mg) ** 2;
      vi += (index[i] - mi) ** 2;
    }
    // Le métal est une valeur refuge : il doit monter quand le reste tombe.
    expect(cov / Math.sqrt(vg * vi)).toBeLessThan(-0.2);
  });

  it('garde un décrochage rare mais réel', () => {
    let crashes = 0;
    let years = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = createNewLife({ seed: seed * 31 + 3 });
      state.world.assetPrices = initialAssetPrices();
      for (let year = 0; year < 25; year++) {
        const ctx = createCtx(state);
        state.world.economy = clamp(state.world.economy * 0.72 + ctx.rng.float(-0.6, 0.6), -1, 1);
        advanceMarkets(ctx);
        if (marketOf(state, 'index').crashed) crashes += 1;
        years += 1;
      }
    }
    const rate = crashes / years;
    expect(rate).toBeGreaterThan(0.02);
    expect(rate).toBeLessThan(0.14);
  });

  it('garde une mémoire, et la borne', () => {
    const state = runMarket(9, 40);
    for (const asset of ASSETS) {
      const market = marketOf(state, asset.id);
      expect(market.history.length).toBeLessThanOrEqual(20);
      expect(market.price).toBeGreaterThan(0);
      expect(Number.isFinite(market.price)).toBe(true);
    }
  });
});

describe('répartir', () => {
  it('réduit le pire cas sans coûter la pente', () => {
    // Même mise, deux stratégies : tout sur le fonds de croissance, ou
    // réparti sur cinq supports dont un refuge. On compare les pires années.
    const spread = ['index', 'bonds', 'gold', 'bluechip', 'realestatefund'];
    const concentrated: number[] = [];
    const diversified: number[] = [];

    for (let seed = 0; seed < 90; seed++) {
      const state = runMarket(seed * 41 + 7, 12);
      const value = (ids: string[]) => ids.reduce(
        (sum, id) => sum + (marketOf(state, id).price / 100) / ids.length, 0,
      );
      concentrated.push(value(['growth']));
      diversified.push(value(spread));
    }

    // Le décile le plus noir : c'est là que se juge une répartition.
    expect(quantile(diversified, 0.1)).toBeGreaterThan(quantile(concentrated, 0.1));
    // Et elle ne coûte pas la moitié du rendement médian.
    expect(quantile(diversified, 0.5)).toBeGreaterThan(quantile(concentrated, 0.5) * 0.55);
  });

  it('se mesure dans le portefeuille du joueur', () => {
    const state = investorLife(11);
    const ctx = createCtx(state);
    invest(ctx, 'index', 100_000);
    const alone = concentration(state);
    invest(ctx, 'gold', 100_000);
    invest(ctx, 'bonds', 100_000);
    // Trois lignes égales concentrent trois fois moins qu'une seule.
    expect(concentration(state)).toBeLessThan(alone);
    expect(concentration(state)).toBeCloseTo(1 / 3, 1);
  });
});

describe('acheter et vendre', () => {
  it('prélève des frais, et ils se voient', () => {
    const state = investorLife(13);
    const before = state.player.money;
    invest(createCtx(state), 'growth', 100_000);
    expect(state.player.money).toBe(before - 100_000);
    // Les frais sont déjà pris : la ligne vaut moins que ce qu'on a versé.
    expect(portfolioValue(state)).toBeLessThan(100_000);
    expect(portfolioValue(state)).toBeGreaterThan(100_000 * 0.97);
  });

  it('refuse en dessous du ticket minimum', () => {
    const state = investorLife(17);
    const asset = getAsset('venture')!;
    const answer = invest(createCtx(state), 'venture', minimumTicket(state, asset) - 1);
    expect(answer.ok).toBe(false);
    expect(holdingsOf(state)).toEqual([]);
  });

  it('bloque ce qui doit l’être, et le dit', () => {
    const state = investorLife(19);
    const ctx = createCtx(state);
    invest(ctx, 'realestatefund', 50_000);
    const holding = holdingsOf(state)[0];
    expect(isLocked(state, holding)).toBe(true);
    const refused = divest(createCtx(state), 'realestatefund', 1);
    expect(refused.ok).toBe(false);
    expect(refused.message).toMatch(/Bloqué/);

    // Trois ans plus tard, la ligne se vend.
    state.year += 3;
    expect(isLocked(state, holding)).toBe(false);
    expect(divest(createCtx(state), 'realestatefund', 1).ok).toBe(true);
  });

  it('rebloque une ligne qu’on renforce', () => {
    // Sinon il suffirait de racheter une part la veille pour contourner le
    // blocage — ou plutôt : le blocage ne voudrait rien dire.
    const state = investorLife(23);
    invest(createCtx(state), 'realestatefund', 20_000);
    state.year += 3;
    expect(isLocked(state, holdingsOf(state)[0])).toBe(false);
    invest(createCtx(state), 'realestatefund', 20_000);
    expect(isLocked(state, holdingsOf(state)[0])).toBe(true);
  });

  it('garde un prix de revient honnête quand on renforce', () => {
    const state = investorLife(29);
    invest(createCtx(state), 'index', 60_000);
    const first = holdingsOf(state)[0].costBasis;
    // Le cours s'effondre, on rachète : le prix de revient doit descendre.
    marketOf(state, 'index').price *= 0.5;
    invest(createCtx(state), 'index', 60_000);
    expect(holdingsOf(state)[0].costBasis).toBeLessThan(first);
    expect(holdingsOf(state)[0].costBasis).toBeGreaterThan(first * 0.5);
  });

  it('n’impose que la plus-value', () => {
    const gain = investorLife(31);
    invest(createCtx(gain), 'index', 100_000);
    marketOf(gain, 'index').price *= 2;
    const beforeGain = gain.player.money;
    divest(createCtx(gain), 'index', 1);
    const proceedsGain = gain.player.money - beforeGain;

    const loss = investorLife(31);
    invest(createCtx(loss), 'index', 100_000);
    marketOf(loss, 'index').price *= 0.5;
    const beforeLoss = loss.player.money;
    divest(createCtx(loss), 'index', 1);
    const proceedsLoss = loss.player.money - beforeLoss;

    // Doubler puis vendre rapporte moins que le double, l'impôt étant passé.
    expect(proceedsGain).toBeGreaterThan(100_000);
    expect(proceedsGain).toBeLessThan(200_000);
    // Vendre à perte ne coûte pas d'impôt : on récupère la valeur, frais ôtés.
    expect(proceedsLoss).toBeGreaterThan(50_000 * 0.98);
    expect(proceedsLoss).toBeLessThan(50_000);
  });

  it('vend une fraction sans solder la ligne', () => {
    const state = investorLife(37);
    invest(createCtx(state), 'index', 100_000);
    const before = holdingValue(state, holdingsOf(state)[0]);
    divest(createCtx(state), 'index', 0.4);
    expect(holdingsOf(state).length).toBe(1);
    expect(holdingValue(state, holdingsOf(state)[0])).toBeCloseTo(before * 0.6, -2);
  });

  it('retire la ligne quand elle est soldée', () => {
    const state = investorLife(41);
    invest(createCtx(state), 'index', 100_000);
    divest(createCtx(state), 'index', 1);
    expect(holdingsOf(state)).toEqual([]);
  });
});

describe('ce que le personnage comprend', () => {
  it('ferme les supports qu’il ne comprend pas, en disant lesquels', () => {
    const state = investorLife(43);
    state.player.financialLiteracy = 5;
    const simple = getAsset('passbook')!;
    const hard = getAsset('venture')!;
    expect(assetBlocker(state, simple)).toBeNull();
    expect(assetBlocker(state, hard)).toMatch(/comprends/);
  });

  it('en dit plus à qui s’y connaît', () => {
    const novice = investorLife(47);
    novice.player.financialLiteracy = 10;
    const expert = investorLife(47);
    expert.player.financialLiteracy = 80;
    const asset = getAsset('index')!;
    expect(assetInsight(novice, asset).detail).toBeNull();
    expect(assetInsight(expert, asset).detail).toBeTruthy();
    // Le risque et l'horizon, eux, sont dits à tout le monde.
    expect(assetInsight(novice, asset).risk).toBe(assetInsight(expert, asset).risk);
  });

  it('s’apprend en plaçant, et davantage en perdant', () => {
    const winner = investorLife(53);
    winner.player.financialLiteracy = 30;
    invest(createCtx(winner), 'index', 100_000);
    marketOf(winner, 'index').price *= 2;
    const beforeWin = literacy(winner);
    divest(createCtx(winner), 'index', 1);
    const learnedWinning = literacy(winner) - beforeWin;

    const loser = investorLife(53);
    loser.player.financialLiteracy = 30;
    invest(createCtx(loser), 'index', 100_000);
    marketOf(loser, 'index').price *= 0.4;
    const beforeLoss = literacy(loser);
    divest(createCtx(loser), 'index', 1);

    expect(literacy(loser) - beforeLoss).toBeGreaterThan(learnedWinning);
  });

  it('monte avec les années et les études', () => {
    const state = createNewLife({ seed: 59 });
    for (let year = 0; year < 30 && !state.gameOver; year++) {
      simulateYear(state);
      state.pending = [];
    }
    if (!state.gameOver) expect(literacy(state)).toBeGreaterThan(5);
  });

  it('refuse tout à qui n’a plus de nom', () => {
    const state = investorLife(61);
    state.player.criminalRecord.wanted = true;
    expect(assetBlocker(state, getAsset('passbook')!)).toBeTruthy();
  });
});

describe('le portefeuille dans la simulation', () => {
  it('compte dans le patrimoine', () => {
    const state = investorLife(67);
    const before = netWorth(state);
    invest(createCtx(state), 'index', 100_000);
    // On a converti du liquide en placement : le patrimoine bouge à peine,
    // il ne s'évapore pas.
    expect(netWorth(state)).toBeGreaterThan(before * 0.97);
    expect(portfolioValue(state)).toBeGreaterThan(90_000);
  });

  it('ne compte comme revenu que ce qui verse quelque chose', () => {
    const yields = investorLife(71);
    invest(createCtx(yields), 'bonds', 100_000);
    expect(portfolioIncome(yields)).toBeGreaterThan(0);

    const silent = investorLife(71);
    invest(createCtx(silent), 'growth', 100_000);
    // Un fonds de croissance ne distribue rien : sa plus-value est latente,
    // elle ne paie pas les courses.
    expect(portfolioIncome(silent)).toBe(0);
  });

  it('se ressent quand il fond', () => {
    // On isole l'étape du portefeuille : sur une année entière, le sport et
    // le repos font redescendre le stress plus vite qu'un krach ne le monte,
    // et la mesure ne dirait plus rien de ce qu'on veut vérifier.
    const crashed = investorLife(73);
    invest(createCtx(crashed), 'growth', 200_000);
    crashed.player.stats.stress = 30;
    marketOf(crashed, 'growth').price *= 0.4;
    advancePortfolio(createCtx(crashed));

    const calm = investorLife(73);
    invest(createCtx(calm), 'growth', 200_000);
    calm.player.stats.stress = 30;
    advancePortfolio(createCtx(calm));

    expect(crashed.player.stats.stress).toBeGreaterThan(calm.player.stats.stress);
  });

  it('fait plus mal à qui encaisse mal', () => {
    // Le tempérament n'est pas décoratif ici : à perte égale, quelqu'un de
    // stable dort, quelqu'un qui l'est peu ne dort plus.
    const hit = (stability: number) => {
      const state = investorLife(73);
      invest(createCtx(state), 'growth', 200_000);
      state.player.stats.stress = 30;
      state.player.psyche.emotion.stability = stability;
      marketOf(state, 'growth').price *= 0.4;
      advancePortfolio(createCtx(state));
      return state.player.stats.stress;
    };
    expect(hit(15)).toBeGreaterThan(hit(85));
  });

  it('survit à une vie entière sans exploser', () => {
    const state = investorLife(79);
    invest(createCtx(state), 'index', 50_000);
    invest(createCtx(state), 'token', 20_000);
    for (let year = 0; year < 40 && !state.gameOver; year++) {
      simulateYear(state);
      state.pending = [];
      expect(Number.isFinite(portfolioValue(state))).toBe(true);
      expect(portfolioValue(state)).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(unrealizedGain(state))).toBe(true);
    }
  });

  it('donne des cours cohérents avec le pays et l’époque', () => {
    const state = investorLife(83);
    const asset = getAsset('index')!;
    const price = unitPrice(state, asset);
    expect(price).toBeGreaterThan(0);
    // Trente ans d'inflation ont passé : un prix nominal n'est pas l'indice.
    expect(price).not.toBe(marketOf(state, 'index').price);
  });
});
