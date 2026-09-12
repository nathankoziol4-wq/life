/**
 * Élever un enfant.
 *
 * Le catalogue disait : « un enfant existe et grandit ; on ne fait rien avec
 * lui ». Le risque en y répondant était d'ajouter une barre à remplir de plus.
 * Ce fichier vérifie donc surtout que ce n'en est pas une :
 *
 * 1. **le temps est la seule ressource** — deux gestes par enfant et par an,
 *    donc avec trois enfants on choisit ;
 * 2. **il n'y a pas de bonne façon** — les deux extrêmes de la main donnée
 *    sont moins bons que la bande du milieu, ce qui est *mesuré* et non
 *    affirmé ;
 * 3. **ça ne s'achète pas** — un enfant payé et seul finit moins bien qu'un
 *    enfant suivi et pauvre ;
 * 4. **la boucle se referme** — l'adulte que produit une enfance est
 *    exactement ce que `continueAs` reprend.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import { simulateYear } from '../simulateYear.ts';
import type { GameState, Person } from '../types.ts';
import {
  GROWN, PER_CHILD, REARINGS, advanceUpbringing, attentionShare,
  availableRearings, childrenOf, leftFor, parentLabel, raisable, raisedWell,
  rear, rearBlocker, settleChildhood, upbringingOf,
} from '../../systems/upbringing.ts';
import { HAND_HIGH, HAND_LOW, getRearing, handEffect } from '../../data/upbringing.ts';
import { continueAs, heirsOf } from '../../systems/lineage.ts';

/** Une partie avec un enfant tout neuf, et de quoi s'en occuper. */
function withChild(seed = 606, childAge = 0): { state: GameState; child: Person } {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < 28; i++) simulateYear(state);
  state.idCounter += 1;
  const id = `p_kid_${state.idCounter}`;
  const model = Object.values(state.npcs)[0];
  const child: Person = {
    ...model,
    id,
    firstName: 'Camille',
    relation: 'son',
    age: childAge,
    alive: true,
    relationship: 60,
    opinion: 60,
    salary: 20_000,
    stats: { ...model.stats, intelligence: 50, happiness: 60, criminality: 5 },
    personality: { ...model.personality, discipline: 50, temper: 40 },
    upbringing: undefined,
    history: [],
  };
  state.npcs[id] = child;
  state.player.money = 500_000_000;
  return { state, child };
}

/** Élève un enfant jusqu'à ses dix-huit ans avec une politique donnée. */
function raise(
  state: GameState,
  child: Person,
  pick: (age: number) => string[],
): Person {
  while (child.age < GROWN && state.player.alive) {
    for (const id of pick(child.age)) {
      if (!rearBlocker(state, child, id)) rear(createCtx(state), child.id, id);
    }
    advanceUpbringing(createCtx(state));
    child.age += 1;
    state.player.money = 500_000_000;
  }
  settleChildhood(createCtx(state), child);
  return child;
}

/* ------------------------------------------------------------------ */
/* Le catalogue                                                        */
/* ------------------------------------------------------------------ */

describe('ce qu’on peut faire d’une enfance', () => {
  it('n’offre aucun geste gratuit', () => {
    // Un geste sans contrepartie serait le seul qu'on ferait. Chacun coûte
    // au moins du temps — et le temps est plafonné.
    for (const rearing of REARINGS) {
      const gives = Object.values(rearing.gives).reduce((s, v) => s + Math.abs(v ?? 0), 0);
      expect(gives, rearing.id).toBeGreaterThan(0);
      expect(rearing.from).toBeLessThan(rearing.to);
    }
    expect(new Set(REARINGS.map((r) => r.id)).size).toBe(REARINGS.length);
  });

  it('oppose vraiment cadrer et laisser faire', () => {
    const strict = getRearing('cadrer')!;
    const loose = getRearing('laisser')!;
    // L'un achète la tenue et coûte le lien, l'autre l'inverse. Sans cette
    // opposition, la « main » ne serait qu'un curseur à pousser à fond.
    expect(strict.gives.hand!).toBeGreaterThan(0);
    expect(loose.gives.hand!).toBeLessThan(0);
    expect(strict.gives.bond!).toBeLessThan(0);
    expect(loose.gives.bond!).toBeGreaterThan(0);
  });

  it('punit les deux extrêmes et récompense le milieu', () => {
    // La règle qui empêche d'appeler « stratégie » le fait de pousser un
    // curseur à fond.
    const middle = handEffect(0);
    const hard = handEffect(95);
    const soft = handEffect(-95);
    expect(middle.discipline).toBeGreaterThan(0);
    expect(middle.criminality).toBeLessThan(0);
    // Trop dur : il tient droit, et il t'en veut.
    expect(hard.bond).toBeLessThan(middle.bond);
    expect(hard.temper).toBeGreaterThan(middle.temper);
    // Trop lâche : rien ne le tient.
    expect(soft.discipline).toBeLessThan(middle.discipline);
    expect(soft.criminality).toBeGreaterThan(middle.criminality);
    // Et la bande du milieu est large : ce n'est pas un fil sur lequel marcher.
    expect(HAND_HIGH - HAND_LOW).toBeGreaterThan(40);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 1 — le temps                                                  */
/* ------------------------------------------------------------------ */

describe('le temps est la seule ressource', () => {
  it('n’en laisse pas faire plus que la limite, par enfant et par an', () => {
    const { state, child } = withChild(606, 8);
    expect(leftFor(child)).toBe(PER_CHILD);
    const usable = availableRearings(child).map((r) => r.id);
    for (let i = 0; i < PER_CHILD; i++) {
      expect(rear(createCtx(state), child.id, usable[i]).ok, usable[i]).toBe(true);
    }
    expect(leftFor(child)).toBe(0);
    expect(rear(createCtx(state), child.id, usable[0]).ok).toBe(false);
  });

  it('rend la limite à chaque année', () => {
    const { state, child } = withChild(606, 8);
    rear(createCtx(state), child.id, 'temps');
    expect(leftFor(child)).toBe(PER_CHILD - 1);
    advanceUpbringing(createCtx(state));
    expect(leftFor(child)).toBe(PER_CHILD);
  });

  it('force à choisir quand il y a plusieurs enfants', () => {
    // Le vrai arbitrage : le budget est par enfant, mais l'année ne l'est
    // pas. Suivre trois enfants à fond n'est pas la même vie que d'en suivre
    // un seul.
    const { state, child } = withChild(606, 6);
    for (const name of ['Alix', 'Sasha']) {
      state.idCounter += 1;
      const id = `p_kid_${state.idCounter}`;
      state.npcs[id] = { ...child, id, firstName: name, upbringing: undefined };
    }
    expect(raisable(state).length).toBe(3);
    // On ne peut suivre qu'un seul enfant à fond sur une année donnée si
    // l'on veut aussi vivre : le test constate la structure, pas une
    // interdiction — chaque enfant a son propre compteur.
    for (const kid of raisable(state)) expect(leftFor(kid)).toBe(PER_CHILD);
  });

  it('ne laisse plus rien faire d’un enfant devenu adulte', () => {
    const { state, child } = withChild(606, GROWN);
    expect(raisable(state).length).toBe(0);
    expect(rearBlocker(state, child, 'temps')).toContain('grand');
  });
});

/* ------------------------------------------------------------------ */
/* Règle 2 — il n'y a pas de bonne façon                               */
/* ------------------------------------------------------------------ */

describe('la main donnée', () => {
  it('agit chaque année, même sans geste', () => {
    // Élever n'est pas une suite d'actions ponctuelles : la façon dont on
    // tient un enfant agit en continu.
    const { state, child } = withChild(606, 6);
    upbringingOf(child).hand = 90;
    const temper = child.personality.temper;
    for (let i = 0; i < 5; i++) {
      advanceUpbringing(createCtx(state));
      child.age += 1;
    }
    expect(child.personality.temper).toBeGreaterThan(temper);
  });

  it('fabrique un adulte différent selon la main', () => {
    // Les deux extrêmes : deux gestes du même côté chaque année. Un seul par
    // an reste dans la bande — c'est voulu, et c'est ce que la mesure montre.
    const grow = (hand: string) => {
      const { state, child } = withChild(606, 0);
      raise(state, child, () => [hand, hand]);
      return child;
    };
    const strict = grow('cadrer');
    const loose = grow('laisser');
    // Le cadré tient mieux, l'autre t'aime mieux : deux adultes, deux prix.
    expect(strict.personality.discipline).toBeGreaterThan(loose.personality.discipline);
    expect(loose.relationship).toBeGreaterThan(strict.relationship);
    expect(loose.stats.criminality).toBeGreaterThan(strict.stats.criminality);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 3 — ça ne s'achète pas                                        */
/* ------------------------------------------------------------------ */

describe('être là contre payer', () => {
  it('fait mieux en étant présent qu’en payant', () => {
    // La seule affirmation forte du système, et elle est mesurée.
    const { state: a, child: present } = withChild(606, 0);
    raise(a, present, () => ['temps', 'devoirs']);
    const { state: b, child: paid } = withChild(606, 0);
    raise(b, paid, () => ['payer', 'payer']);

    expect(attentionShare(present)).toBeGreaterThan(attentionShare(paid));
    expect(present.relationship).toBeGreaterThan(paid.relationship);
    expect(present.stats.happiness).toBeGreaterThan(paid.stats.happiness);
    // Et sur ce qui compte pour la vie d'après, pas seulement sur l'affect :
    // à l'origine une enfance payée produisait un adulte *plus* intelligent
    // qu'une enfance suivie, ce qui contredisait toute la règle.
    expect(present.stats.intelligence).toBeGreaterThan(paid.stats.intelligence);
    expect(upbringingOf(present).mark).toBeGreaterThan(upbringingOf(paid).mark);
  });

  it('ne rend pas l’argent inutile pour autant', () => {
    const { state: a, child: paid } = withChild(606, 0);
    raise(a, paid, () => ['payer']);
    const { state: b, child: nothing } = withChild(606, 0);
    raise(b, nothing, () => []);
    expect(paid.stats.intelligence).toBeGreaterThan(nothing.stats.intelligence);
  });

  it('laisse un enfant délaissé s’éloigner', () => {
    const { state, child } = withChild(606, 0);
    const before = child.relationship;
    raise(state, child, () => []);
    expect(child.relationship).toBeLessThan(before);
    expect(attentionShare(child)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 4 — la boucle se referme                                      */
/* ------------------------------------------------------------------ */

describe('l’enfant qu’on élève est le personnage suivant', () => {
  it('clôt l’enfance une seule fois, à dix-huit ans', () => {
    const { state, child } = withChild(606, 0);
    raise(state, child, () => ['temps']);
    const record = upbringingOf(child);
    expect(record.grownYear).not.toBeNull();
    const happiness = child.stats.happiness;
    settleChildhood(createCtx(state), child);
    settleChildhood(createCtx(state), child);
    expect(child.stats.happiness).toBe(happiness);
  });

  it('donne à l’héritier les statistiques qu’on lui a construites', () => {
    // Le bout de la boucle : ce que `continueAs` reprend est exactement ce
    // que l'enfance a écrit.
    const build = (policy: (age: number) => string[]) => {
      const { state, child } = withChild(606, 0);
      raise(state, child, policy);
      child.age = 30;
      state.player.alive = false;
      state.player.deathYear = state.year;
      const heir = heirsOf(state).find((h) => h.person.id === child.id);
      expect(heir).toBeDefined();
      const next = continueAs(state, child.id);
      return next.player;
    };
    const raised = build(() => ['temps', 'devoirs']);
    const ignored = build(() => []);
    expect(raised.stats.intelligence).toBeGreaterThan(ignored.stats.intelligence);
    expect(raised.stats.happiness).toBeGreaterThan(ignored.stats.happiness);
  });
});

/* ------------------------------------------------------------------ */
/* Le bilan                                                            */
/* ------------------------------------------------------------------ */

describe('ce qu’on aura été comme parent', () => {
  it('se lit sur l’ensemble des enfants, pas sur le meilleur', () => {
    const { state, child } = withChild(606, 10);
    state.idCounter += 1;
    const id = `p_kid_${state.idCounter}`;
    state.npcs[id] = { ...child, id, firstName: 'Alix', upbringing: undefined };
    upbringingOf(child).attention = 10 * 12;
    expect(raisedWell(state)).toBeLessThan(attentionShare(child));
    expect(parentLabel(state)).toBeTruthy();
  });

  it('dit qu’on n’a pas d’enfants quand on n’en a pas', () => {
    const state = createNewLife({ seed: 1234, countryId: 'fr' });
    expect(childrenOf(state).length).toBe(0);
    expect(raisedWell(state)).toBe(0);
    expect(parentLabel(state)).toContain('pas d’enfants');
  });

  it('ne casse rien pour les parties sans enfant', () => {
    const state = createNewLife({ seed: 4242, countryId: 'fr' });
    for (let i = 0; i < 30; i++) simulateYear(state);
    expect(() => advanceUpbringing(createCtx(state))).not.toThrow();
  });
});
