/**
 * La séparation.
 *
 * L'ancienne procédure tenait en un appel : elle partageait l'argent, tirait
 * une pension à pile ou face, et **comptait les enfants mineurs sans jamais
 * les déplacer** — ils restaient chez le joueur quoi qu'il arrive.
 *
 * Ces tests tiennent la règle qui fait de ceci une décision : **on ne peut
 * pas tout garder**. Et surtout la conséquence qui n'existait pas : un enfant
 * dont on perd la garde cesse réellement de s'élever.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import { createPerson } from '../../systems/npc.ts';
import { raisable, upbringingOf } from '../../systems/upbringing.ts';
import { grudgeOf } from '../../systems/grudges.ts';
import {
  COUNSELS, POSTURES, awayChildren, childrenAtStake, counselCost, custodyFrom,
  custodyScore, divorceBlocker, getCounsel, getPosture, livesHere, preview,
  purseShare, separate,
} from '../../systems/separation.ts';
import { KEEPS_ALL, LOSES_ALL } from '../../data/separation.ts';
import type { GameState, Person } from '../types.ts';

function life(seed = 909, age = 34): GameState {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < age && state.player.alive; i++) simulateYear(state);
  if (!state.player.alive || state.player.age < age) {
    state.player.alive = true;
    state.player.deathCause = null;
    state.player.deathYear = null;
    state.gameOver = false;
    state.year += age - state.player.age;
    state.player.age = age;
  }
  state.player.yearActions = {};
  state.player.money = 200_000;
  return state;
}

/** Un foyer : un conjoint, et le nombre d'enfants demandé. */
function household(state: GameState, kids = 2): { spouse: Person; children: Person[] } {
  const ctx = createCtx(state);
  const spouse = createPerson(ctx, { relation: 'spouse', age: 36 });
  spouse.maritalStatus = 'married';
  const children: Person[] = [];
  for (let i = 0; i < kids; i++) {
    const child = createPerson(ctx, { relation: i % 2 === 0 ? 'son' : 'daughter', age: 6 + i * 2 });
    children.push(child);
  }
  return { spouse, children };
}

/* ------------------------------------------------------------------ */

describe('le catalogue', () => {
  it('a des avocats et des postures tous distincts et gradués', () => {
    expect(new Set(COUNSELS.map((c) => c.id)).size).toBe(COUNSELS.length);
    expect(new Set(POSTURES.map((p) => p.id)).size).toBe(POSTURES.length);
    for (const c of COUNSELS) {
      expect(getCounsel(c.id)).toBe(c);
      expect(c.note.length).toBeGreaterThan(15);
    }
    // Ce qui coûte plus pèse plus : sinon le choix serait arbitraire.
    const sorted = [...COUNSELS].sort((a, b) => a.cost - b.cost);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].weight).toBeGreaterThan(sorted[i - 1].weight);
    }
  });

  it('ne laisse aucune posture en dominer une autre', () => {
    // C'est toute la règle : se battre pour l'un se paie sur les autres.
    // Comparer des points de garde à des points de rancune demanderait une
    // pondération inventée ; la domination, elle, ne demande rien — une
    // posture meilleure sur *tous* les axes rendrait les autres inutiles.
    const axes = (p: (typeof POSTURES)[number]) =>
      [p.custody, p.purse, -p.bitterness, -p.stress];
    for (const a of POSTURES) {
      for (const b of POSTURES) {
        if (a.id === b.id) continue;
        const dominates = axes(a).every((v, i) => v >= axes(b)[i])
          && axes(a).some((v, i) => v > axes(b)[i]);
        expect(dominates, `${a.id} domine ${b.id}`).toBe(false);
      }
    }
  });
});

/* ------------------------------------------------------------------ */

describe('l’arbitrage', () => {
  it('fait payer en enfants ce qu’on gagne en argent', () => {
    const state = life();
    const { spouse } = household(state);
    const sous = getPosture('argent')!;
    const enfants = getPosture('enfants')!;
    const counsel = getCounsel('commis')!;
    expect(purseShare(state, spouse, counsel, sous))
      .toBeGreaterThan(purseShare(state, spouse, counsel, enfants));
    expect(custodyScore(state, spouse, counsel, enfants))
      .toBeGreaterThan(custodyScore(state, spouse, counsel, sous));
  });

  it('fait peser un meilleur avocat, sans qu’il décide de tout', () => {
    const state = life();
    const { spouse } = household(state);
    spouse.wealth = 0;
    const posture = getPosture('amiable')!;
    const seul = custodyScore(state, spouse, getCounsel('aucun')!, posture);
    const cher = custodyScore(state, spouse, getCounsel('cabinet')!, posture);
    expect(cher).toBeGreaterThan(seul);
    // Mais un parent qui ne s'est occupé de rien ne l'emporte pas d'office.
    expect(cher).toBeLessThan(1);
  });

  it('donne le plus de poids à ce qu’on a fait de leur enfance', () => {
    // C'est la seule mesure honnête de qui s'en est occupé, et le jeu la
    // tenait déjà.
    const state = life();
    const { spouse, children } = household(state);
    const counsel = getCounsel('commis')!;
    const posture = getPosture('amiable')!;
    const absent = custodyScore(state, spouse, counsel, posture);
    for (const child of children) {
      upbringingOf(child).attention = child.age * 12;
    }
    const present = custodyScore(state, spouse, counsel, posture);
    expect(present).toBeGreaterThan(absent + 0.5);
  });

  it('pénalise un casier', () => {
    const state = life();
    const { spouse } = household(state);
    const counsel = getCounsel('commis')!;
    const posture = getPosture('amiable')!;
    // On part d'une position qui n'est pas déjà au plancher, sinon le test
    // mesure la borne au lieu de la pénalité.
    for (const child of childrenAtStake(state)) upbringingOf(child).attention = child.age * 12;
    const propre = custodyScore(state, spouse, counsel, posture);
    expect(propre).toBeGreaterThan(-1);
    state.player.criminalRecord.convictions.push({ crimeId: 'x', year: state.year } as never);
    expect(custodyScore(state, spouse, counsel, posture)).toBeLessThan(propre);
  });

  it('traduit le score en garde par des seuils lisibles', () => {
    expect(custodyFrom(KEEPS_ALL)).toBe('moi');
    expect(custodyFrom(LOSES_ALL)).toBe('lui');
    expect(custodyFrom(0)).toBe('partagée');
  });
});

/* ------------------------------------------------------------------ */

describe('la garde change vraiment quelque chose', () => {
  it('retire de l’éducation l’enfant qui part', () => {
    // Sans cela, perdre la garde ne changerait rigoureusement rien — c'est le
    // défaut exact de l'ancienne procédure, qui comptait les enfants pour
    // fixer une pension puis les laissait où ils étaient.
    const state = life();
    const { spouse, children } = household(state, 2);
    expect(raisable(state).length).toBe(2);

    // On se bat pour l'argent, sans avocat, sans s'être occupé d'eux.
    separate(createCtx(state), spouse.id, 'aucun', 'argent');
    expect(awayChildren(state).length).toBeGreaterThan(0);
    expect(raisable(state).length).toBeLessThan(2);
    for (const child of children) {
      if (!livesHere(child)) expect(raisable(state)).not.toContain(child);
    }
  });

  it('garde les enfants à qui s’en est occupé', () => {
    const state = life();
    const { spouse, children } = household(state, 2);
    for (const child of children) upbringingOf(child).attention = child.age * 12;
    state.player.stats.karma = 80;
    separate(createCtx(state), spouse.id, 'cabinet', 'enfants');
    expect(awayChildren(state).length).toBe(0);
    expect(raisable(state).length).toBe(2);
  });

  it('laisse une trace dans l’histoire de l’enfant qui part', () => {
    const state = life();
    const { spouse } = household(state, 2);
    separate(createCtx(state), spouse.id, 'aucun', 'argent');
    for (const child of awayChildren(state)) {
      expect(child.history.some((h) => /Vit chez/.test(h.text))).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */

describe('la procédure', () => {
  it('refuse un avocat qu’on ne peut pas payer', () => {
    const state = life();
    const { spouse } = household(state);
    state.player.money = 100;
    expect(divorceBlocker(state, spouse, 'cabinet')).toMatch(/faudrait/);
    expect(separate(createCtx(state), spouse.id, 'cabinet', 'amiable').ok).toBe(false);
  });

  it('refuse de divorcer de quelqu’un qui n’est pas ton conjoint', () => {
    const state = life();
    const ctx = createCtx(state);
    const ami = createPerson(ctx, { relation: 'friend', age: 30 });
    expect(divorceBlocker(state, ami, 'commis')).toMatch(/pas marié/);
  });

  it('fait payer l’avocat, et le partage', () => {
    const state = life();
    const { spouse } = household(state, 0);
    const avant = state.player.money;
    const prix = counselCost(state, getCounsel('cabinet')!);
    separate(createCtx(state), spouse.id, 'cabinet', 'amiable');
    expect(state.player.money).toBeLessThan(avant - prix);
    expect(spouse.wealth).toBeGreaterThan(0);
  });

  it('protège le patrimoine quand un contrat a été signé', () => {
    const state = life();
    const { spouse } = household(state, 0);
    state.player.flags.prenup = true;
    const avant = state.player.money;
    const prix = counselCost(state, getCounsel('commis')!);
    separate(createCtx(state), spouse.id, 'commis', 'amiable');
    expect(state.player.money).toBe(avant - prix);
  });

  it('laisse d’autant plus de rancune qu’on s’est battu', () => {
    const doux = life();
    const a = household(doux, 1);
    a.spouse.opinion = 20;
    separate(createCtx(doux), a.spouse.id, 'commis', 'amiable');

    const dur = life();
    const b = household(dur, 1);
    b.spouse.opinion = 20;
    b.spouse.personality.temper = a.spouse.personality.temper;
    b.spouse.personality.warmth = a.spouse.personality.warmth;
    separate(createCtx(dur), b.spouse.id, 'commis', 'tout');

    expect(b.spouse.opinion).toBeLessThan(a.spouse.opinion);
    expect(grudgeOf(b.spouse)).toBeGreaterThanOrEqual(grudgeOf(a.spouse));
  });

  it('fait de l’ex un ex, une seule fois', () => {
    const state = life();
    const { spouse } = household(state, 0);
    separate(createCtx(state), spouse.id, 'commis', 'amiable');
    expect(spouse.relation).toBe('ex');
    expect(spouse.maritalStatus).toBe('divorced');
    // On ne redivorce pas de la même personne.
    expect(separate(createCtx(state), spouse.id, 'commis', 'amiable').ok).toBe(false);
  });

  it('annonce à l’avance ce qui va se passer', () => {
    // L'aperçu doit dire vrai : sinon le choix se ferait à l'aveugle.
    const state = life();
    const { spouse } = household(state, 2);
    const seen = preview(state, spouse, 'aucun', 'argent')!;
    expect(seen).not.toBeNull();
    const before = childrenAtStake(state).length;
    separate(createCtx(state), spouse.id, 'aucun', 'argent');
    const gone = awayChildren(state).length;
    const custody = gone === 0 ? 'moi' : gone === before ? 'lui' : 'partagée';
    expect(custody).toBe(seen.custody);
  });

  it('compte les enfants majeurs hors de la procédure', () => {
    const state = life();
    const ctx = createCtx(state);
    const spouse = createPerson(ctx, { relation: 'spouse', age: 40 });
    spouse.maritalStatus = 'married';
    createPerson(ctx, { relation: 'son', age: 25 });
    expect(childrenAtStake(state).length).toBe(0);
  });
});
