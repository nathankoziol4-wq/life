/**
 * Vérifications des sociétés cotées.
 *
 * Le catalogue portait cet aveu : « les supports sont des indices abstraits :
 * aucune société n'a de nom ni d'histoire ». On répartissait entre des classes
 * et l'on attendait ; il n'y avait rien à comprendre, donc rien à faire de
 * mieux que répartir.
 *
 * Six exigences :
 *
 * 1. **une part de société est un support ordinaire** — même portefeuille,
 *    mêmes frais, même impôt, sinon c'est un système parallèle ;
 * 2. **elle est plus agitée qu'un panier** : c'est le prix de la concentration ;
 * 3. **le rapport ne change pas si on le rouvre**, sinon il n'y a rien à lire ;
 * 4. **ce qui regarde devant paie, ce qui regarde derrière beaucoup moins** —
 *    c'est le système entier, et il a fallu le mesurer pour s'apercevoir qu'il
 *    disait d'abord l'inverse ;
 * 5. **acheter sans lire, c'est prendre le risque sans la contrepartie** ;
 * 6. **la culture financière décide de ce qu'on lit**, ce qui lui donne enfin
 *    un usage autre qu'un droit d'achat.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { ASSETS, getAsset } from '../../data/assets.ts';
import { COMPANIES, assetIdOf, companyOfAsset } from '../../data/companies.ts';
import { advanceMarkets, marketOf } from '../../systems/investing.ts';
import {
  BASE_HEALTH, advanceCompanies, factsRead, healthOf, healthPull, readsAhead,
  reportFor, verdict, visibleReport,
} from '../../systems/shares.ts';

/** Une partie neuve, sans années jouées : on ne teste que le marché. */
function market(seed: number): GameState {
  const state = createNewLife({ seed });
  // De quoi lire les rapports : la culture financière décide de ce qu'on voit,
  // et ce fichier mesure ce qu'on fait de ce qu'on a lu.
  state.player.financialLiteracy = 80;
  return state;
}

function median(xs: number[]): number {
  return [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
}

function decile(xs: number[], q: number): number {
  return [...xs].sort((a, b) => a - b)[Math.floor(xs.length * q)]!;
}

describe('une part de société', () => {
  it('est un support ordinaire, dans la même liste', () => {
    expect(COMPANIES.length).toBeGreaterThanOrEqual(8);
    for (const company of COMPANIES) {
      const asset = getAsset(assetIdOf(company));
      expect(asset, company.id).toBeTruthy();
      expect(asset!.klass).toBe('action');
      expect(asset!.name).toBe(company.name);
      // Et l'on retrouve la société depuis le support : c'est ce qui permet
      // au portefeuille de ne rien savoir des sociétés.
      expect(companyOfAsset(asset!.id)?.id).toBe(company.id);
    }
    // Aucun identifiant en double avec les supports abstraits.
    expect(new Set(ASSETS.map((a) => a.id)).size).toBe(ASSETS.length);
  });

  it('est plus agitée que le panier de sa catégorie', () => {
    // C'est le prix de la concentration, et c'est ce qui rend le panier
    // légitime pour qui ne veut rien lire.
    const basket = getAsset('bluechip')!;
    const small = getAsset('smallcap')!;
    for (const company of COMPANIES) {
      const asset = getAsset(assetIdOf(company))!;
      const reference = company.size === 'grande' ? basket : small;
      if (company.size === 'grande') {
        expect(asset.volatility, company.id).toBeGreaterThan(reference.volatility);
      }
      // Et sa pente n'est jamais meilleure que celle du panier le plus
      // ambitieux : ce qu'une société offre n'est pas du rendement gratuit.
      expect(asset.drift, company.id).toBeLessThanOrEqual(small.drift);
    }
  });
});

describe('le rapport', () => {
  it('ne change pas si on le rouvre', () => {
    const state = market(3);
    advanceCompanies(createCtx(state));
    for (const company of COMPANIES) {
      const once = reportFor(state, company).map((f) => f.id);
      const again = reportFor(state, company).map((f) => f.id);
      expect(again, company.id).toEqual(once);
    }
  });

  it('parle toujours au moins une fois de ce qui vient', () => {
    const state = market(5);
    for (let year = 0; year < 12; year++) {
      advanceCompanies(createCtx(state));
      state.year += 1;
      for (const company of COMPANIES) {
        const facts = reportFor(state, company);
        expect(facts.length, company.id).toBeGreaterThanOrEqual(2);
        expect(facts.some((f) => f.kind === 'avenir'), company.id).toBe(true);
        // Et il ne dit pas deux fois la même chose.
        expect(new Set(facts.map((f) => f.id)).size).toBe(facts.length);
      }
    }
  });

  it('se lit d’autant mieux qu’on s’y connaît', () => {
    // La culture financière est une donnée à elle (`financialLiteracy`), pas
    // une combinaison d'intelligence et de diplômes : la poser directement est
    // ce que fait le reste du jeu quand il la fait monter.
    const ignorant = market(7);
    ignorant.player.financialLiteracy = 10;
    const savant = market(7);
    savant.player.financialLiteracy = 80;

    expect(factsRead(ignorant)).toBeLessThan(factsRead(savant));
    expect(readsAhead(ignorant)).toBe(false);
    advanceCompanies(createCtx(savant));
    advanceCompanies(createCtx(ignorant));
    const company = COMPANIES[0]!;
    expect(visibleReport(ignorant, company).length)
      .toBeLessThan(visibleReport(savant, company).length);
  });
});

describe('ce que lire rapporte', () => {
  /**
   * Quatre façons de placer son argent, sur cent parties et quarante ans.
   *
   * On mesure sur le moteur de marché seul — pas sur des vies entières — parce
   * que ce qu'on veut comparer est le rendement d'une décision, et qu'une vie
   * ajoute cent autres choses au résultat.
   */
  function trial(): Record<string, number[]> {
    const gains: Record<string, number[]> = { avenir: [], passé: [], hasard: [], panier: [] };
    for (let seed = 1; seed <= 60; seed++) {
      const state = market(seed);
      for (let year = 0; year < 30; year++) {
        const ctx = createCtx(state);
        // Ce que chacun conclut **avant** que l'année ne se joue.
        const ahead = COMPANIES.filter((c) => verdict(state, c, true) > 0);
        const behind = COMPANIES.filter((c) => verdict(state, c, false) > 0);
        const blind = [COMPANIES[(seed + year) % COMPANIES.length]!];
        const before = new Map(COMPANIES.map((c) => [c.id, marketOf(state, assetIdOf(c)).price]));
        const basketBefore = marketOf(state, 'bluechip').price;

        state.year += 1;
        advanceCompanies(ctx);
        advanceMarkets(ctx);

        const ret = (id: string) => marketOf(state, assetIdOf(COMPANIES.find((c) => c.id === id)!)).price
          / before.get(id)! - 1;
        const avg = (list: typeof COMPANIES) => list.reduce((n, c) => n + ret(c.id), 0) / list.length;
        if (ahead.length > 0) gains.avenir!.push(avg(ahead));
        if (behind.length > 0) gains.passé!.push(avg(behind));
        gains.hasard!.push(avg(blind));
        gains.panier!.push(marketOf(state, 'bluechip').price / basketBefore - 1);
      }
    }
    return gains;
  }

  const gains = trial();

  it('paie nettement plus que le panier quand on lit ce qui vient', () => {
    /*
     * **Le premier jet disait exactement l'inverse.** Mesuré : lire ce qui
     * regarde devant rapportait 7,6 % contre 9,9 % pour ce qui regarde
     * derrière. La cause n'était pas le texte mais le calendrier — la santé
     * d'une société poussait son cours la même année, si bien que ce que le
     * rapport annonçait était déjà payé au moment où on le lisait. Un an de
     * décalage a remis le système à l'endroit.
     *
     * Mesuré depuis : 14,6 % · 8,0 % · 6,4 % · 5,6 %.
     */
    expect(median(gains.avenir!)).toBeGreaterThan(median(gains.panier!) * 1.8);
    expect(median(gains.avenir!)).toBeGreaterThan(median(gains.passé!) * 1.3);
  });

  it('ne paie presque rien quand on ne lit que ce qui est déjà arrivé', () => {
    // Ce qui s'est produit est dans le cours : le lire ne peut pas beaucoup
    // rapporter, et le jeu le dit en le rendant à peine meilleur que le hasard.
    expect(median(gains.passé!)).toBeLessThan(median(gains.avenir!));
    expect(median(gains.passé!)).toBeGreaterThan(median(gains.hasard!) * 0.9);
  });

  it('fait payer cher d’acheter une société sans la lire', () => {
    /*
     * L'exigence la plus importante du fichier, et la moins évidente : prendre
     * une société au hasard ne rapporte pas beaucoup moins **en médiane** que
     * le panier — mais le mauvais dixième est deux fois pire. C'est la vérité
     * de la concentration : on prend le risque sans prendre l'information.
     *
     * Mesuré : premier décile à −20,1 % au hasard contre −8,6 % pour le
     * panier, et −6,6 % pour qui lit ce qui vient.
     */
    expect(decile(gains.hasard!, 0.1)).toBeLessThan(decile(gains.panier!, 0.1));
    expect(decile(gains.avenir!, 0.1)).toBeGreaterThan(decile(gains.hasard!, 0.1));
  });
});

describe('la santé', () => {
  it('ne s’affiche jamais, et pousse le cours de l’année suivante', () => {
    const state = market(11);
    // Au départ, tout le monde est au milieu et rien ne pousse.
    for (const company of COMPANIES) {
      expect(healthOf(state, company.id)).toBe(BASE_HEALTH);
      expect(healthPull(state, assetIdOf(company))).toBe(0);
    }
    advanceCompanies(createCtx(state));
    // Après une année, les santés ont divergé.
    const spread = new Set(COMPANIES.map((c) => Math.round(healthOf(state, c.id))));
    expect(spread.size).toBeGreaterThan(3);
  });

  it('revient vers l’ordinaire, sinon il n’y aurait plus rien à lire', () => {
    const state = market(13);
    state.world.companyHealth = {};
    state.world.companyLag = {};
    for (const company of COMPANIES) state.world.companyHealth[company.id] = 95;
    for (let year = 0; year < 25; year++) advanceCompanies(createCtx(state));
    const still = COMPANIES.filter((c) => healthOf(state, c.id) > 85).length;
    expect(still).toBeLessThan(COMPANIES.length / 2);
  });
});
