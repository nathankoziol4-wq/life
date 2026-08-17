/**
 * Les inimitiés.
 *
 * Mesuré avant d'écrire une ligne : on pouvait insulter sa sœur **douze fois
 * de suite** et rester en bons termes — opinion 0, lien 54, ponts intacts. Et
 * `estranged` n'apparaissait que dans des filtres : il retirait la personne
 * des amis, de l'exposition et des actions, sans jamais rien déclencher.
 *
 * Ces tests tiennent les quatre décisions qui font de ceci un système :
 *
 * 1. une rancune naît d'un tort **et** d'une opinion déjà basse ;
 * 2. un ennemi **agit**, et ce qu'il coûte se compte en gens ;
 * 3. ça se répare, mais ni gratuitement ni à coup sûr ;
 * 4. le temps rend les excuses possibles — sans quoi ce serait un piège.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import { createPerson } from '../../systems/npc.ts';
import { interact } from '../../systems/relationships.ts';
import {
  advanceGrudge, apologise, enemies, grievance, grudgeOf, grudgeWord, hostile,
  sore, sorryBlocker, sorryOdds, spitesOpen, strike, wrong,
} from '../../systems/grudges.ts';
import {
  COOLS, HARD_FLOOR, HOSTILE_AT, SORRY, SORRY_LIMIT, SOURS_UNDER, SPITES,
  WRONGS, getWrong,
} from '../../data/grudges.ts';
import type { GameState, Person } from '../types.ts';

function life(seed = 555, age = 30): GameState {
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
  return state;
}

/** Quelqu'un posé exactement où le test en a besoin. */
function someone(state: GameState, over: Partial<Person> = {}): Person {
  const p = createPerson(createCtx(state), { relation: 'friend', age: 32 });
  Object.assign(p, over);
  return p;
}

/* ------------------------------------------------------------------ */

describe('le catalogue', () => {
  it('a des torts et des représailles tous distincts et complets', () => {
    expect(new Set(WRONGS.map((w) => w.id)).size).toBe(WRONGS.length);
    expect(new Set(SPITES.map((s) => s.id)).size).toBe(SPITES.length);
    for (const w of WRONGS) {
      expect(getWrong(w.id)).toBe(w);
      expect(w.weight).toBeGreaterThan(0);
      expect(w.line.length).toBeGreaterThan(10);
    }
    for (const s of SPITES) {
      expect(s.told).toContain('{p}');
      expect(s.odds).toBeGreaterThan(0);
      expect(s.from).toBeGreaterThanOrEqual(0);
      // Chacune doit faire quelque chose : une représaille sans effet serait
      // exactement le défaut qu'on répare.
      expect(Object.keys(s.costs ?? {}).length + (s.turnsOthers ? 1 : 0)).toBeGreaterThan(0);
    }
  });

  it('échelonne les représailles : les pires demandent une vraie haine', () => {
    const worst = SPITES.filter((s) => (s.costs?.reputation ?? 0) <= -7);
    for (const s of worst) expect(s.from).toBeGreaterThanOrEqual(HOSTILE_AT);
  });
});

/* ------------------------------------------------------------------ */

describe('se faire un ennemi', () => {
  it('ne retient rien de quelqu’un qui vous aime encore', () => {
    // Blesser qui vous apprécie fait une déception, pas une inimitié. C'est
    // ce qui empêche la moindre dispute de créer un ennemi.
    const state = life();
    const ami = someone(state, { opinion: SOURS_UNDER + 20 });
    expect(wrong(createCtx(state), ami, 'insulte')).toBe(false);
    expect(grudgeOf(ami)).toBe(0);
    expect(sore(ami)).toBe(false);
  });

  it('retient quand l’opinion est déjà tombée', () => {
    const state = life();
    const froid = someone(state, { opinion: 5 });
    wrong(createCtx(state), froid, 'insulte');
    expect(grudgeOf(froid)).toBeGreaterThan(0);
    expect(grievance(froid)?.id).toBe('insulte');
  });

  it('garde tout chez un colérique, passe l’éponge chez un chaleureux', () => {
    const state = life();
    const dur = someone(state, { opinion: 5 });
    dur.personality.temper = 95; dur.personality.warmth = 10;
    const doux = someone(state, { opinion: 5 });
    doux.personality.temper = 10; doux.personality.warmth = 95;
    wrong(createCtx(state), dur, 'insulte');
    wrong(createCtx(state), doux, 'insulte');
    expect(grudgeOf(dur)).toBeGreaterThan(grudgeOf(doux) * 1.5);
  });

  it('devient vraiment une inimitié en accumulant, pas d’un seul coup', () => {
    const state = life();
    const cible = someone(state, { opinion: 5 });
    cible.personality.temper = 50; cible.personality.warmth = 50;
    expect(wrong(createCtx(state), cible, 'dispute')).toBe(false);
    expect(hostile(cible)).toBe(false);
    wrong(createCtx(state), cible, 'dispute');
    expect(hostile(cible)).toBe(true);
    expect(enemies(state).map((n) => n.id)).toContain(cible.id);
  });

  it('se déclenche depuis une insulte réellement jouée', () => {
    // Le chemin complet, par l'action que le joueur presse : mesuré avant,
    // douze insultes laissaient l'opinion à 0 et la personne en bons termes.
    const state = life(777, 28);
    const cible = someone(state, { relation: 'friend', opinion: 20, relationship: 40 });
    for (let year = 0; year < 5 && !hostile(cible); year++) {
      state.player.yearActions = {};
      cible.interactionsThisYear = 0;
      for (let i = 0; i < 3; i++) interact(createCtx(state), cible.id, 'insult');
    }
    expect(hostile(cible)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

describe('ce qu’un ennemi fait', () => {
  it('n’ouvre que ce que son intensité autorise', () => {
    const state = life();
    const tiede = someone(state, {});
    tiede.flags.grudge = 22;
    const furieux = someone(state, {});
    furieux.flags.grudge = 95;
    expect(spitesOpen(state, tiede).length).toBeGreaterThan(0);
    expect(spitesOpen(state, furieux).length).toBeGreaterThan(spitesOpen(state, tiede).length);
  });

  it('ne barre la route au travail que si l’on travaille', () => {
    const state = life();
    const ennemi = someone(state, {});
    ennemi.flags.grudge = 95;
    state.player.job = null;
    expect(spitesOpen(state, ennemi).some((s) => s.needsJob)).toBe(false);
  });

  it('coûte en gens, pas seulement en points', () => {
    // C'est la seule chose qui distingue un ennemi d'une ligne de statistique.
    const state = life();
    // On vide le champ : la vie jouée a laissé des dizaines de connaissances,
    // et un ennemi n'en retourne que quelques-unes — le test viserait alors
    // des témoins qui ne sont pas ceux qu'il a posés.
    for (const npc of Object.values(state.npcs)) npc.relationship = 0;
    const ennemi = someone(state, {});
    ennemi.flags.grudge = 90;
    const temoins = [
      someone(state, { relationship: 70 }),
      someone(state, { relationship: 60 }),
    ];
    const avant = temoins.map((t) => t.relationship);
    const froid = SPITES.find((s) => s.turnsOthers)!;
    strike(createCtx(state), ennemi, froid);
    for (const [i, t] of temoins.entries()) expect(t.relationship).toBeLessThan(avant[i]);
  });

  it('laisse une trace dans son histoire et dans le journal', () => {
    const state = life();
    const ennemi = someone(state, {});
    ennemi.flags.grudge = 90;
    const lignes = state.timeline.length;
    strike(createCtx(state), ennemi, SPITES[0]);
    expect(ennemi.history.length).toBeGreaterThan(0);
    expect(state.timeline.length).toBeGreaterThan(lignes);
  });

  it('ne frappe pas deux années de suite', () => {
    const state = life();
    const ennemi = someone(state, {});
    ennemi.flags.grudge = 100;
    ennemi.flags.spiteYear = state.year;
    const avant = ennemi.history.length;
    advanceGrudge(createCtx(state), ennemi);
    expect(ennemi.history.length).toBe(avant);
  });
});

/* ------------------------------------------------------------------ */

describe('le temps', () => {
  it('refroidit la rancune sans jamais l’éteindre seule', () => {
    // Une inimitié qui se dissout toute seule en trois ans n'en serait pas
    // une : seules des excuses acceptées lèvent le plancher.
    const state = life();
    const ennemi = someone(state, {});
    ennemi.flags.grudge = 90;
    for (let year = 0; year < 60; year++) {
      state.year += 1;
      advanceGrudge(createCtx(state), ennemi);
    }
    expect(grudgeOf(ennemi)).toBe(HARD_FLOOR);
    expect(grudgeOf(ennemi)).toBeGreaterThan(0);
  });

  it('refroidit d’un cran par an, pas plus', () => {
    const state = life();
    const ennemi = someone(state, {});
    ennemi.flags.grudge = 90;
    advanceGrudge(createCtx(state), ennemi);
    expect(grudgeOf(ennemi)).toBeCloseTo(90 - COOLS, 5);
  });

  it('rend les mêmes excuses plus audibles avec les années', () => {
    // Sans ce terme, une rancune profonde était définitive : mesuré, quatre
    // tentatives, toutes refusées. Une réparation qu'on ne peut pas réussir
    // n'est pas une réparation.
    const state = life();
    const frais = someone(state, { opinion: 5 });
    frais.flags.grudge = 80;
    frais.flags.grudgeSince = state.year;
    const vieux = someone(state, { opinion: 5, relationship: frais.relationship });
    vieux.flags.grudge = 80;
    vieux.flags.grudgeSince = state.year - 20;
    vieux.personality.warmth = frais.personality.warmth;
    expect(sorryOdds(state, vieux)).toBeGreaterThan(sorryOdds(state, frais) * 1.2);
  });
});

/* ------------------------------------------------------------------ */

describe('réparer', () => {
  it('refuse des excuses à qui ne t’en veut pas', () => {
    const state = life();
    const ami = someone(state, { opinion: 70 });
    expect(sorryBlocker(state, ami)).toBeTruthy();
    expect(apologise(createCtx(state), ami.id).ok).toBe(false);
  });

  it('coûte quelque chose, accepté ou non', () => {
    const state = life();
    const ennemi = someone(state, { opinion: 5 });
    ennemi.flags.grudge = 60;
    // Pas au plafond : une statistique déjà à cent ne peut pas monter, et le
    // test mesurerait la borne au lieu du coût.
    state.player.stats.stress = 40;
    const stress = state.player.stats.stress;
    apologise(createCtx(state), ennemi.id);
    expect(state.player.stats.stress).toBeGreaterThan(stress);
    expect(Number(ennemi.flags.sorryTried)).toBe(1);
  });

  it('impose un délai entre deux tentatives', () => {
    const state = life();
    const ennemi = someone(state, { opinion: 5 });
    ennemi.flags.grudge = 60;
    apologise(createCtx(state), ennemi.id);
    expect(sorryBlocker(state, ennemi)).toMatch(/viens d’essayer/);
  });

  it('finit par se lasser', () => {
    const state = life();
    const ennemi = someone(state, { opinion: 5 });
    ennemi.flags.grudge = 100;
    ennemi.flags.sorryTried = SORRY_LIMIT;
    expect(sorryBlocker(state, ennemi)).toMatch(/assez de fois/);
  });

  it('éteint la rancune pour de bon quand elle est soldée', () => {
    const state = life();
    const ennemi = someone(state, { opinion: 5, estranged: true });
    ennemi.flags.grudge = Math.min(SORRY.heals, 30);
    // On force l'acceptation en rendant les conditions idéales.
    ennemi.personality.warmth = 100;
    ennemi.relationship = 100;
    let done = false;
    for (let i = 0; i < 40 && !done; i++) {
      state.year += SORRY.cooldown;
      ennemi.flags.sorryTried = 0;
      const r = apologise(createCtx(state), ennemi.id);
      done = Boolean(ennemi.flags.forgiven);
      expect(r.ok).toBe(true);
    }
    expect(done).toBe(true);
    expect(grudgeOf(ennemi)).toBe(0);
    expect(ennemi.estranged).toBe(false);
    // Et une fois pardonné, le plancher tombe.
    advanceGrudge(createCtx(state), ennemi);
    expect(grudgeOf(ennemi)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */

describe('la lecture', () => {
  it('nomme chaque palier sans jamais rendre un vide', () => {
    for (let value = 0; value <= 100; value += 5) {
      expect(grudgeWord(value).length, String(value)).toBeGreaterThan(3);
    }
    expect(grudgeWord(90)).not.toBe(grudgeWord(10));
  });

  it('ne compte comme ennemi que ce qui a passé le seuil', () => {
    const state = life();
    const tiede = someone(state, {});
    tiede.flags.grudge = HOSTILE_AT - 1;
    expect(sore(tiede)).toBe(true);
    expect(hostile(tiede)).toBe(false);
    expect(enemies(state)).not.toContain(tiede);
    tiede.flags.grudge = HOSTILE_AT;
    expect(enemies(state)).toContain(tiede);
  });

  it('oublie un mort', () => {
    const state = life();
    const ennemi = someone(state, {});
    ennemi.flags.grudge = 90;
    ennemi.alive = false;
    expect(hostile(ennemi)).toBe(false);
    expect(enemies(state)).not.toContain(ennemi);
  });
});
