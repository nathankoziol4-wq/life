/**
 * Ce qu'on peut décider, et pourquoi ça change.
 *
 * Mesuré avant ce chantier, sur le moteur réel :
 *
 *     la mère à  6 ans :  8 actions jouables
 *     la mère à 16 ans : 10
 *     la mère à 35 ans :  8 — les mêmes qu'à six ans
 *     10 actions en tout pour une mère, toute une vie durant
 *     recouvrement moyen entre deux vies entières : 75 %
 *
 * Le registre contextuel existait — il tenait déjà l'école, le travail et la
 * prison, et chaque ligne fermée disait pourquoi. Ce qui manquait, c'était la
 * famille adulte, et **la manière** : une même demande n'est pas la même
 * chose selon le ton, et le ton ne vaut pas la même chose selon à qui l'on
 * parle.
 *
 * Ces tests tiennent les conditions de fin : les actions changent avec l'âge,
 * avec la personne, avec l'argent, avec ce qui s'est passé — et une décision
 * peut en créer d'autres.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import { simulateYear } from '../simulateYear.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { getAvailableActions, playableActions } from '../../systems/actions.ts';
import {
  advancePromises, approachOdds, approachToll, callFavour, doFavour, invite,
  lend, owed, owesFavour, promise, promised, reclaim,
} from '../../systems/socialActs.ts';
import { APPROACHES, COOL, KEEN, getApproach } from '../../data/approaches.ts';
import type { GameState, Person } from '../types.ts';

function life(seed: number, age: number): GameState | null {
  const state = createNewLife({ seed });
  for (let y = 0; y < age && state.player.alive; y++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  if (!state.player.alive || state.gameOver) return null;
  state.player.money = Math.max(state.player.money, 400_000);
  state.player.yearActions = {};
  return state;
}

function motherOf(state: GameState): Person | undefined {
  return Object.values(state.npcs).find((n) => n.relation === 'mother' && n.alive);
}

/** Une vie dont la mère est encore là à l'âge demandé. */
function withMother(age: number): { state: GameState; mother: Person } | null {
  for (let seed = 0; seed < 300; seed++) {
    const state = life(4_000 + seed, age);
    const mother = state ? motherOf(state) : undefined;
    if (state && mother) return { state, mother };
  }
  return null;
}

const ids = (state: GameState, target: Person) =>
  playableActions(state, target, 'général').map((a) => a.id);

/* ------------------------------------------------------------------ */

describe('les actions changent avec l’âge', () => {
  it('ne propose pas la même chose à sa mère à six ans et à trente-cinq', () => {
    const young = withMother(6);
    const old = withMother(35);
    if (!young || !old) return;
    const a = new Set(ids(young.state, young.mother));
    const b = new Set(ids(old.state, old.mother));
    // Ce qui n'a de sens qu'adulte n'a pas à être proposé à un enfant.
    expect([...b].some((x) => !a.has(x))).toBe(true);
    expect(b.has('willTalk') || b.has('invite') || b.has('confide')).toBe(true);
    expect(a.has('willTalk')).toBe(false);
  });

  it('ouvre ce qui demande un âge, et pas avant', () => {
    const child = withMother(8);
    if (!child) return;
    expect(ids(child.state, child.mother)).not.toContain('confide');
    expect(ids(child.state, child.mother)).not.toContain('promise');
    const teen = withMother(16);
    if (!teen) return;
    expect(ids(teen.state, teen.mother)).toContain('confide');
  });

  it('ne parle de ce qui restera qu’avec quelqu’un de très âgé', () => {
    const state = life(31, 40);
    const mother = state ? motherOf(state) : null;
    if (!state || !mother) return;
    mother.age = 45;
    expect(ids(state, mother)).not.toContain('willTalk');
    mother.age = 72;
    expect(ids(state, mother)).toContain('willTalk');
  });
});

/* ------------------------------------------------------------------ */

describe('les actions changent avec la personne', () => {
  it('ne propose pas à un collègue ce qu’on propose à sa mère', () => {
    const state = life(31, 34);
    const mother = state ? motherOf(state) : null;
    if (!state || !mother) return;
    const stranger = Object.values(state.npcs).find(
      (n) => n.alive && ['coworker', 'classmate', 'acquaintance'].includes(n.relation),
    );
    if (!stranger) return;
    const close = new Set(ids(state, mother));
    const far = new Set(ids(state, stranger));
    expect([...close].some((x) => !far.has(x))).toBe(true);
    // Se confier ou promettre d'être là ne se fait qu'avec des proches.
    expect(far.has('confide')).toBe(false);
    expect(far.has('promise')).toBe(false);
  });

  it('dit toujours pourquoi une ligne est fermée', () => {
    const state = life(31, 30);
    if (!state) return;
    for (const npc of Object.values(state.npcs).slice(0, 25)) {
      for (const action of getAvailableActions(state, npc, 'général')) {
        if (action.blocked !== null) expect(action.blocked.length).toBeGreaterThan(4);
        expect(action.label.length).toBeGreaterThan(2);
      }
    }
  });

  it('ne propose jamais deux fois la même ligne au même endroit', () => {
    // Deux boutons identiques sont deux fois le même choix pour le joueur,
    // quoi qu'en dise le code.
    const state = life(31, 30);
    if (!state) return;
    for (const context of ['général', 'école', 'travail', 'prison'] as const) {
      for (const npc of Object.values(state.npcs).slice(0, 20)) {
        const rows = getAvailableActions(state, npc, context);
        const seen = new Set(rows.map((a) => `${a.id}`));
        expect(seen.size, `${context}/${npc.relation}`).toBe(rows.length);
      }
    }
  });
});

/* ------------------------------------------------------------------ */

describe('l’argent change ce qu’on peut faire', () => {
  it('ferme ce qui coûte quand il n’y a rien', () => {
    const state = life(31, 34);
    const mother = state ? motherOf(state) : null;
    if (!state || !mother) return;
    state.player.money = 500_000;
    const riche = new Set(ids(state, mother));
    state.player.money = 0;
    const pauvre = new Set(ids(state, mother));
    expect(riche.size).toBeGreaterThan(pauvre.size);
    expect(riche.has('lend')).toBe(true);
    expect(pauvre.has('lend')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe('une décision en crée d’autres', () => {
  it('fait naître « réclamer » en prêtant', () => {
    const state = life(31, 34);
    const mother = state ? motherOf(state) : null;
    if (!state || !mother) return;
    expect(ids(state, mother)).not.toContain('reclaim');
    expect(lend(createCtx(state), mother.id, 5_000).ok).toBe(true);
    expect(owed(mother)).toBe(5_000);
    expect(ids(state, mother)).toContain('reclaim');
    // Et ferme le prêt : on ne prête pas deux fois sans être remboursé.
    expect(ids(state, mother)).not.toContain('lend');
  });

  it('fait naître « demander ce service » en rendant service', () => {
    const state = life(31, 34);
    const mother = state ? motherOf(state) : null;
    if (!state || !mother) return;
    expect(ids(state, mother)).not.toContain('callFavour');
    expect(doFavour(createCtx(state), mother.id).ok).toBe(true);
    expect(owesFavour(mother)).toBe(true);
    expect(ids(state, mother)).toContain('callFavour');
    expect(callFavour(createCtx(state), mother.id).ok).toBe(true);
    // Une faveur ne se rappelle qu'une fois.
    expect(owesFavour(mother)).toBe(false);
  });

  it('rend une promesse tenue payante et une promesse oubliée coûteuse', () => {
    const kept = life(31, 34);
    const broken = life(31, 34);
    const a = kept ? motherOf(kept) : null;
    const b = broken ? motherOf(broken) : null;
    if (!kept || !broken || !a || !b) return;

    for (const [state, mother] of [[kept, a], [broken, b]] as const) {
      mother.relationship = 60;
      expect(promise(createCtx(state), mother.id).ok).toBe(true);
      expect(promised(state, mother)).toBe(true);
      // On ne promet pas deux fois la même année.
      expect(promise(createCtx(state), mother.id).ok).toBe(false);
    }
    // L'un passe du temps avec sa mère, l'autre l'oublie.
    a.lastInteractionYear = kept.year;
    b.lastInteractionYear = broken.year - 5;

    kept.year += 1;
    broken.year += 1;
    advancePromises(createCtx(kept));
    advancePromises(createCtx(broken));
    expect(a.relationship).toBeGreaterThan(b.relationship);
    expect(promised(kept, a)).toBe(false);
  });

  it('rend l’invitation plus forte quand la personne est partie loin', () => {
    const here = life(31, 34);
    const away = life(31, 34);
    const a = here ? motherOf(here) : null;
    const b = away ? motherOf(away) : null;
    if (!here || !away || !a || !b) return;
    a.relationship = 50;
    b.relationship = 50;
    b.flags.far = true;
    invite(createCtx(here), a.id);
    invite(createCtx(away), b.id);
    expect(b.relationship).toBeGreaterThan(a.relationship);
  });
});

/* ------------------------------------------------------------------ */

describe('la manière compte', () => {
  it('n’a aucun ton qui soit meilleur partout', () => {
    // Sans cet arbitrage il y aurait un ton optimal, c'est-à-dire pas de
    // choix : chaque manière qui monte les chances doit coûter sur le lien.
    for (const approach of APPROACHES) {
      if (approach.odds > 1.25) expect(approach.bond, approach.id).toBeLessThan(0);
      if (approach.bond > 2) expect(approach.odds, approach.id).toBeLessThan(1.25);
      expect(approach.note.length).toBeGreaterThan(12);
    }
    expect(new Set(APPROACHES.map((a) => a.id)).size).toBe(APPROACHES.length);
  });

  it('fait dépendre le résultat de qui l’on a en face', () => {
    const state = life(31, 34);
    const mother = state ? motherOf(state) : null;
    if (!state || !mother) return;
    const insistant = getApproach('insistant')!;
    mother.personality[insistant.reads] = KEEN + 20;
    const bon = approachOdds(mother, insistant);
    mother.personality[insistant.reads] = COOL - 20;
    const mauvais = approachOdds(mother, insistant);
    expect(bon).toBeGreaterThan(mauvais * 1.5);
  });

  it('fait payer le ton dur sur le lien, quoi qu’il arrive', () => {
    const state = life(31, 34);
    const mother = state ? motherOf(state) : null;
    if (!state || !mother) return;
    mother.personality.temper = 20;
    const doux = approachToll(mother, getApproach('culpabiliser')!);
    mother.personality.temper = 90;
    const dur = approachToll(mother, getApproach('culpabiliser')!);
    expect(dur).toBeLessThan(doux);
    expect(approachToll(mother, getApproach('calme')!)).toBe(0);
  });

  it('change vraiment ce qui arrive quand on réclame', () => {
    // Deux mille tentatives : réclamer durement doit rapporter davantage et
    // laisser un lien plus abîmé. Si les deux se valaient, le ton ne serait
    // qu'un habillage.
    let doux = { paid: 0, bond: 0, n: 0 };
    let dur = { paid: 0, bond: 0, n: 0 };
    for (let seed = 0; seed < 60; seed++) {
      for (const [tone, into] of [['calme', doux], ['culpabiliser', dur]] as const) {
        const state = life(4_000 + seed, 34);
        const mother = state ? motherOf(state) : null;
        if (!state || !mother) continue;
        mother.wealth = 40_000;
        mother.relationship = 70;
        const before = state.player.money;
        lend(createCtx(state), mother.id, 5_000);
        const after = state.player.money;
        reclaim(createCtx(state), mother.id, tone);
        into.paid += state.player.money - after;
        into.bond += mother.relationship;
        into.n += 1;
        void before;
      }
    }
    if (doux.n === 0 || dur.n === 0) return;
    expect(dur.paid / dur.n).toBeGreaterThan(doux.paid / doux.n);
    expect(dur.bond / dur.n).toBeLessThan(doux.bond / doux.n);
  });
});

/* ------------------------------------------------------------------ */

describe('le moteur tient la charge', () => {
  it('répond assez vite pour être appelé à chaque rendu', () => {
    const state = life(31, 40);
    if (!state) return;
    const people = Object.values(state.npcs).slice(0, 30);
    const started = Date.now();
    for (let i = 0; i < 40; i++) {
      for (const npc of people) getAvailableActions(state, npc, 'général');
    }
    // Mille deux cents appels : l'écran en fait quelques dizaines par rendu.
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
