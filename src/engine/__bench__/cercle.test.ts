/**
 * Le cercle.
 *
 * Le jeu savait faire deux choses avec du monde : un public qui regarde
 * (`fame.ts`) et des blocs qui votent (`politics.ts`). Le catalogue en
 * demandait une troisième — `Carrières spéciales/Communauté/Fonder un
 * mouvement` — et elle n'a rien à voir : des gens qui **viennent**.
 *
 * Sept exigences, et cinq viennent d'une mesure qui a d'abord dit le
 * contraire :
 *
 * 1. **cela grandit** — sinon ce n'est pas un système, c'est un décor ;
 * 2. **cela dérive tout seul**, sur deux versants que le joueur ne règle pas ;
 * 3. **la présence ralentit la dérive**, elle ne l'annule pas ;
 * 4. **la taille plafonne l'autorité** : on ne commande pas cinq cents
 *    personnes parce qu'on a bien joué. C'est la thèse du système ;
 * 5. **chaque geste coûte** : aucun ne rend un versant sans en abîmer un autre ;
 * 6. **le dehors réagit** au repli et à l'intensité, et à rien d'autre ;
 * 7. **cela continue sans toi** — partir n'arrête rien.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import {
  CALLS, CARES, GESTURES, HOLD_FLOOR, SATURATION, holdCeiling,
} from '../../data/circle.ts';
import {
  advanceCircle, ceilingNow, circleOf, contributions, drawFromPurse, driftOf,
  found, foundBlocker, gesture, gestureBlocker, growthOf, holds, leave, setCare,
} from '../../systems/circle.ts';

/** Quelqu'un qui peut fonder, et qui fonde. */
function founder(callId = 'entraide', seed = 6161): GameState {
  const state = createNewLife({ seed });
  const p = state.player;
  p.age = 34;
  p.prison = null;
  p.stats.reputation = 60;
  p.money = 500_000;
  const out = found(createCtx(state), callId);
  if (!out.ok) throw new Error(`impossible de fonder : ${out.message}`);
  return state;
}

describe('ce que le cercle devient tout seul', () => {
  it('grandit', () => {
    /*
     * La première version ne faisait croître qu'en proportion des présents :
     * à quatre au départ, moins d'une personne par an, et trente ans plus tard
     * les cercles comptaient trois à six personnes quelle que soit la
     * politique. Il faut un terme qui ne dépende pas de la taille.
     */
    const state = founder();
    expect(growthOf(state)).toBeGreaterThan(0);
    const start = circleOf(state)!.people;
    for (let i = 0; i < 10; i += 1) { state.year += 1; advanceCircle(createCtx(state)); }
    expect(circleOf(state)!.people).toBeGreaterThan(start * 3);
  });

  it('dérive sur deux versants que personne ne règle', () => {
    const state = founder('veille');
    const c = circleOf(state)!;
    const d = driftOf(state);
    expect(d.inward).toBeGreaterThan(0);
    expect(d.fervour).toBeGreaterThan(0);
    const before = { inward: c.inward, fervour: c.fervour };
    state.year += 1;
    advanceCircle(createCtx(state));
    expect(c.inward).toBeGreaterThan(before.inward);
    expect(c.fervour).toBeGreaterThan(before.fervour);
  });

  it('dérive plus vite quand on n’y est pas, et plus vite quand il est grand', () => {
    const state = founder('veille');
    const c = circleOf(state)!;
    setCare(createCtx(state), 'entier');
    const held = driftOf(state).inward;
    setCare(createCtx(state), 'absent');
    const loose = driftOf(state).inward;
    expect(loose).toBeGreaterThan(held);

    const small = driftOf(state).inward;
    c.people = 700;
    expect(driftOf(state).inward).toBeGreaterThan(small);
  });
});

describe('ce que la taille coûte', () => {
  it('plafonne l’autorité, et le plafond descend avec le monde', () => {
    /*
     * **La thèse du système, rendue impossible à contourner.** Sans ce
     * plafond, un geste répétable qui rend de l'autorité suffisait à tenir un
     * cercle de trois cents indéfiniment : mesuré, les deux politiques
     * actives gardaient la main cent fois sur cent.
     */
    expect(holdCeiling(4)).toBeGreaterThan(90);
    expect(holdCeiling(SATURATION / 3)).toBeLessThan(holdCeiling(4));
    expect(holdCeiling(SATURATION)).toBeLessThan(HOLD_FLOOR);
    // Monotone : plus de monde ne rend jamais plus de plafond.
    for (let n = 0; n < SATURATION; n += 90) {
      expect(holdCeiling(n + 90)).toBeLessThanOrEqual(holdCeiling(n));
    }
  });

  it('rabat la main sur le plafond, quoi qu’on fasse', () => {
    const state = founder();
    const c = circleOf(state)!;
    c.people = 700;
    c.hold = 100;
    state.year += 1;
    advanceCircle(createCtx(state));
    expect(c.hold).toBeLessThanOrEqual(ceilingNow(state) + 0.001);
    expect(c.hold).toBeLessThan(100);
  });

  it('finit par ne plus obéir, et un seul geste reste possible', () => {
    const state = founder();
    const c = circleOf(state)!;
    c.people = 800;
    c.hold = 5;
    expect(holds(state)).toBe(false);
    expect(gestureBlocker(state, 'ouvrir')).toContain('écoute');
    expect(gestureBlocker(state, 'reprendre')).toBeNull();
  });
});

describe('ce que chaque geste coûte', () => {
  it('n’en rend aucun sans en abîmer un autre', () => {
    // Aucun geste n'améliore les deux versants et le regard sans faire partir
    // personne : ce serait un bouton gratuit.
    for (const g of GESTURES) {
      const good = [g.inward <= 0, g.fervour <= 0, g.regard >= 0, g.hold >= 0].filter(Boolean).length;
      const free = g.leaves <= 0.02;
      expect(good < 4 || !free, g.id).toBe(true);
    }
  });

  it('fait partir du monde, et une seule fois par an', () => {
    const state = founder();
    const c = circleOf(state)!;
    c.people = 200;
    expect(gesture(createCtx(state), 'calmer').ok).toBe(true);
    expect(c.people).toBeLessThan(200);
    expect(gestureBlocker(state, 'ouvrir')).toContain('par an');
  });

  it('ramène bien le versant qu’il annonce', () => {
    const state = founder();
    const c = circleOf(state)!;
    c.inward = 80;
    c.fervour = 80;
    gesture(createCtx(state), 'ouvrir');
    expect(c.inward).toBeLessThan(80);
    c.gestureYear = null;
    const before = c.fervour;
    gesture(createCtx(state), 'calmer');
    expect(c.fervour).toBeLessThan(before);
  });
});

describe('ce que le dehors regarde', () => {
  it('s’inquiète du repli et de l’intensité, et de rien d’autre', () => {
    const calm = founder('entraide', 11);
    const cc = circleOf(calm)!;
    cc.inward = 10; cc.fervour = 10; cc.regard = 60;
    calm.year += 1;
    advanceCircle(createCtx(calm));
    const calmRegard = cc.regard;

    const hot = founder('entraide', 11);
    const hc = circleOf(hot)!;
    hc.inward = 95; hc.fervour = 95; hc.regard = 60;
    hot.year += 1;
    advanceCircle(createCtx(hot));
    expect(hc.regard).toBeLessThan(calmRegard);
  });

  it('ne regarde pas la taille : un grand cercle tranquille ne gêne personne', () => {
    const state = founder('entraide', 12);
    const c = circleOf(state)!;
    c.people = 700; c.inward = 10; c.fervour = 10; c.regard = 60;
    state.year += 1;
    advanceCircle(createCtx(state));
    expect(c.regard).toBeGreaterThanOrEqual(60);
  });
});

describe('la caisse et la sortie', () => {
  it('se remplit avec le monde, et se prend au prix du regard', () => {
    const state = founder();
    const c = circleOf(state)!;
    c.people = 300;
    expect(contributions(state)).toBeGreaterThan(0);
    c.purse = 100_000;
    const money = state.player.money;
    const regard = c.regard;
    drawFromPurse(createCtx(state), 100_000);
    expect(state.player.money).toBe(money + 100_000);
    expect(c.regard).toBeLessThan(regard);
    expect(c.purse).toBe(0);
  });

  it('continue sans toi', () => {
    const state = founder();
    circleOf(state)!.people = 250;
    const out = leave(createCtx(state));
    expect(out.ok).toBe(true);
    expect(out.message).toContain('sans toi');
    expect(circleOf(state)).toBeNull();
  });
});

describe('les cinq formes de rassemblement', () => {
  it('ne se comparent pas terme à terme', () => {
    for (const call of CALLS) {
      const bestOn = [
        CALLS.every((x) => call.draw >= x.draw),
        CALLS.every((x) => call.inward <= x.inward),
        CALLS.every((x) => call.fervour <= x.fervour),
        CALLS.every((x) => call.regard >= x.regard),
        CALLS.every((x) => call.gives >= x.gives),
      ].filter(Boolean).length;
      expect(bestOn, call.id).toBeLessThan(4);
    }
  });

  it('demandent qu’on vous connaisse un peu', () => {
    const state = createNewLife({ seed: 99 });
    state.player.age = 34;
    state.player.money = 500_000;
    state.player.stats.reputation = 5;
    expect(foundBlocker(state, 'entraide')).toContain('suivrait');
  });

  it('donnent trois façons d’y être, et elles se distinguent', () => {
    const weights = Object.values(CARES).map((c) => c.weight);
    expect(new Set(weights).size).toBe(3);
    // Et la présence n'annule jamais la perte de main : elle la ralentit.
    expect(CARES.entier.hold).toBeLessThan(10);
    expect(CARES.absent.hold).toBeLessThan(CARES.entier.hold);
  });
});
