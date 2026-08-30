/**
 * La gamme.
 *
 * `venture.ts#forecast` calculait une demande à partir de deux cadrans posés
 * sur la maison, et l'on ne savait jamais ce qu'un café faisait passer sur son
 * comptoir. Le catalogue, feuille `Entreprise/Produit`, impact 3 : « l'entreprise
 * vend du chiffre : aucun produit nommé, aucun lancement ».
 *
 * Six exigences, et chacune vient d'une mesure qui a d'abord dit autre chose :
 *
 * 1. **une maison sans gamme se comporte exactement comme avant** — le système
 *    s'ajoute, il ne rejoue pas l'équilibrage de l'entreprise ;
 * 2. **une chose a une vie finie** : elle monte, tient, retombe à rien ;
 * 3. **lancer coûte une année**, sans quoi ce serait un bouton qui rapporte ;
 * 4. **une gamme n'est pas une collection** : au-delà de deux, cela se paie ;
 * 5. **il faut des bras et du savoir-faire** pour sortir quelque chose
 *    d'ambitieux — sinon la forme la plus forte gagne toujours ;
 * 6. **la qualité décide vraiment de l'attrait** : une chose ratée ne doit pas
 *    valoir presque autant qu'une réussie.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { SHAPES, SPREAD, SPREAD_TOLL, getShape } from '../../data/offer.ts';
import { forecast, foundBusiness } from '../../systems/venture.ts';
import {
  advanceLine, appeal, devCost, devDrag, launch, launchBlocker, lift, lineOf,
  phase, retire, spent, standing, wouldBe,
} from '../../systems/offer.ts';

/** Une maison qui tourne, sans rien au catalogue. */
function house(seed = 909): GameState {
  const state = createNewLife({ seed });
  state.player.age = 40;
  state.player.money = 900_000;
  const ok = foundBusiness(createCtx(state), 'cafe');
  if (!ok.ok) throw new Error(`impossible d’ouvrir : ${ok.message}`);
  const b = state.player.business!;
  b.cash = 500_000;
  b.renown = 62;
  b.quality = 66;
  return state;
}

describe('ce que la gamme ne casse pas', () => {
  it('laisse une maison sans rien au catalogue exactement comme avant', () => {
    /*
     * C'est la condition qui permet d'ajouter le produit sans rejouer
     * l'équilibrage de `venture.ts` : `lift` vaut zéro et `devDrag` vaut un, et
     * la formule retrouve terme pour terme celle d'origine.
     */
    const state = house();
    expect(lineOf(state.player.business).length).toBe(0);
    expect(lift(state.player.business)).toBe(0);
    expect(devDrag(state)).toBe(1);
  });

  it('ne fait pas monter la demande tant qu’on n’a rien mis au point', () => {
    const state = house();
    const before = forecast(state).demand;
    // Une année passe sans rien lancer.
    advanceLine(state.player.business!);
    expect(forecast(state).demand).toBe(before);
  });
});

describe('ce qu’une chose devient', () => {
  it('monte, tient, puis ne vaut plus rien', () => {
    const state = house();
    launch(createCtx(state), 'signature');
    const offer = lineOf(state.player.business)[0];
    const shape = getShape('signature')!;

    // La montée : elle ne vaut pas son plein tout de suite.
    expect(phase(offer)).toBeLessThan(1);
    expect(standing(offer)).toContain('sommet dans');

    // Le sommet.
    offer.age = shape.climb;
    expect(phase(offer)).toBe(1);
    expect(standing(offer)).toContain('Au sommet');

    // Et la fin, qui arrive pour tout le monde.
    offer.age = shape.climb + shape.hold + shape.fall;
    expect(phase(offer)).toBe(0);
    expect(appeal(offer)).toBe(0);
    expect(spent(offer)).toBe(true);
  });

  it('vieillit d’un an par an, et perd de sa fraîcheur', () => {
    const state = house();
    launch(createCtx(state), 'fond');
    const b = state.player.business!;
    const before = lineOf(b)[0].quality;
    advanceLine(b);
    expect(lineOf(b)[0].age).toBe(1);
    expect(lineOf(b)[0].quality).toBeLessThan(before);
  });

  it('fait monter la demande de la maison une fois lancée', () => {
    const state = house();
    const before = forecast(state).demand;
    launch(createCtx(state), 'fond');
    expect(lift(state.player.business)).toBeGreaterThan(0);
    expect(forecast(state).demand).toBeGreaterThan(before);
  });
});

describe('ce que lancer coûte', () => {
  it('coûte une année de capacité, et pas seulement de l’argent', () => {
    /*
     * **C'est l'arbitrage.** Sans ce terme, lancer serait gratuit dès qu'on a
     * l'argent et le seul calcul serait « ai-je de quoi » — mesuré, la
     * politique qui lance dès qu'elle peut passait de −119 % à +5 % selon que
     * ce terme existait ou non.
     */
    const state = house();
    const before = forecast(state).capacity;
    launch(createCtx(state), 'courant');
    expect(devDrag(state)).toBeLessThan(1);
    expect(forecast(state).capacity).toBeLessThan(before);
  });

  it('coûte de l’argent, et d’autant plus que la forme est ambitieuse', () => {
    const state = house();
    const costs = SHAPES.map((s) => devCost(state, s.id));
    expect(Math.min(...costs)).toBeGreaterThan(0);
    expect(devCost(state, 'signature')).toBeGreaterThan(devCost(state, 'courant'));
    const money = state.player.money + state.player.business!.cash;
    launch(createCtx(state), 'signature');
    expect(state.player.money + state.player.business!.cash)
      .toBeLessThan(money);
  });

  it('n’en laisse mettre qu’une au point par an', () => {
    const state = house();
    expect(launch(createCtx(state), 'courant').ok).toBe(true);
    expect(launchBlocker(state, 'fond')).toContain('une par an'.slice(3));
    expect(launch(createCtx(state), 'fond').ok).toBe(false);
  });
});

describe('ce qu’une gamme trop large coûte', () => {
  it('retire de la qualité à chaque chose au-delà de deux', () => {
    const state = house();
    const b = state.player.business!;
    for (let i = 0; i < SPREAD + 2; i += 1) {
      b.developedYear = undefined;
      launch(createCtx(state), 'courant');
    }
    expect(lineOf(b).length).toBe(SPREAD + 2);
    const before = b.quality;
    advanceLine(b);
    // `clampStat` arrondit : on assure la perte, pas la décimale.
    expect(before - b.quality).toBeCloseTo(2 * SPREAD_TOLL, 0);
  });

  it('ne retire rien à une gamme tenue', () => {
    const state = house();
    const b = state.player.business!;
    for (let i = 0; i < SPREAD; i += 1) {
      b.developedYear = undefined;
      launch(createCtx(state), 'courant');
    }
    const before = b.quality;
    advanceLine(b);
    expect(b.quality).toBe(before);
  });

  it('laisse retirer ce qui est fini, et dit ce qu’on perd si ça marchait', () => {
    const state = house();
    launch(createCtx(state), 'fond');
    const b = state.player.business!;
    const offer = lineOf(b)[0];
    offer.age = 2;
    const out = retire(createCtx(state), offer.id);
    expect(out.ok).toBe(true);
    expect(out.message).toContain('marchait encore');
    expect(lineOf(b).length).toBe(0);
  });
});

describe('ce que les gens changent à ce qu’on sort', () => {
  it('rend une signature impossible sans bras', () => {
    /*
     * Mesuré sans cette règle : la forme la plus ambitieuse rapportait 196 %
     * de plus que « ne rien lancer » contre 65 à 85 % aux trois autres, parce
     * qu'on pouvait la sortir le jour de l'ouverture, seul derrière un
     * comptoir.
     */
    const state = house();
    const b = state.player.business!;
    b.staff = 0;
    const alone = wouldBe(state, 'signature');
    b.staff = 4;
    expect(wouldBe(state, 'signature')).toBeGreaterThan(alone);
    // Et ce qui ne demande personne ne bouge pas.
    b.staff = 0;
    const simple = wouldBe(state, 'courant');
    b.staff = 4;
    expect(wouldBe(state, 'courant')).toBe(simple);
  });

  it('fait dépendre la qualité de départ de ce que vaut l’équipe', () => {
    const state = house();
    const b = state.player.business!;
    b.staff = 4;
    const crew = (competence: number) => [{
      personId: 'x', competence, asking: 30_000, wage: 30_000,
      morale: 60, since: state.year, learned: 0,
    }];
    b.crew = crew(20);
    const poor = wouldBe(state, 'signature');
    b.crew = crew(90);
    const good = wouldBe(state, 'signature');
    expect(good).toBeGreaterThan(poor + 20);
    // Et la forme la moins exigeante s'en émeut beaucoup moins.
    b.crew = crew(20);
    const poorSimple = wouldBe(state, 'courant');
    b.crew = crew(90);
    expect(wouldBe(state, 'courant') - poorSimple).toBeLessThan(good - poor);
  });
});

describe('ce que la qualité décide', () => {
  it('fait qu’une chose ratée ne vaut presque rien', () => {
    /*
     * Avec un plancher trop haut, une signature bâclée tirait encore plus
     * qu'un fond de gamme excellent, et il n'y avait plus qu'une forme. Le
     * plafond d'une forme ne se touche qu'en la réussissant.
     */
    const state = house();
    launch(createCtx(state), 'signature');
    const offer = lineOf(state.player.business)[0];
    offer.age = getShape('signature')!.climb;

    offer.quality = 95;
    const great = appeal(offer);
    offer.quality = 8;
    const botched = appeal(offer);
    expect(botched).toBeLessThan(great * 0.25);

    // Et une chose modeste mais réussie bat une chose ambitieuse et ratée.
    const modest = { ...offer, shapeId: 'fond', quality: 95 };
    expect(appeal(modest)).toBeGreaterThan(botched);
  });

  it('donne des formes qui ne se comparent pas terme à terme', () => {
    // Aucune forme n'a à la fois le plafond le plus haut, le coût le plus bas,
    // la montée la plus rapide et la tenue la plus longue.
    for (const shape of SHAPES) {
      const bestOn = [
        SHAPES.every((s) => shape.ceiling >= s.ceiling),
        SHAPES.every((s) => shape.cost <= s.cost),
        SHAPES.every((s) => shape.climb <= s.climb),
        SHAPES.every((s) => shape.hold >= s.hold),
        SHAPES.every((s) => shape.hands <= s.hands),
      ].filter(Boolean).length;
      expect(bestOn, shape.id).toBeLessThan(4);
    }
  });
});
