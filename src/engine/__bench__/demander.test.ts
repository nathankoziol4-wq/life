/**
 * Vérifications des demandes faites aux parents.
 *
 * Trois exigences :
 *
 * 1. la réponse dépend du parent, du foyer et de ce que l'enfant a fait —
 *    pas d'un tirage seul ;
 * 2. ce qui est accordé change réellement la vie du personnage, jusque dans
 *    son exposition et donc ses goûts ;
 * 3. une condition posée est réellement vérifiée : « négocier » ne doit pas
 *    être un « oui » déguisé.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { askParent, availableRequests, pendingConditions } from '../../systems/asking.ts';
import { exposureSignals, exposureTo } from '../../systems/exposure.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/**
 * Un enfant dont un parent est encore vivant.
 *
 * On balaie à partir de la graine donnée au lieu de s'y tenir : une seule
 * graine codée en dur rend le fichier otage de la séquence de hasard, et le
 * moindre système ajouté ailleurs le fait tomber sans rien dire de vrai.
 */
function childWithParent(seed: number, age = 12): { state: GameState; parent: Person } | null {
  for (let attempt = 0; attempt < 60; attempt++) {
    const state = createNewLife({ seed: seed + attempt });
    playTo(state, age);
    if (state.gameOver || !state.player.alive) continue;
    const id = state.player.origin.parents[0]?.personId;
    const parent = id ? state.npcs[id] : undefined;
    if (parent?.alive) return { state, parent };
  }
  return null;
}

describe('demander à ses parents', () => {
  it('ne propose que des demandes qui ont encore un objet', () => {
    const found = childWithParent(4242, 12);
    expect(found).not.toBeNull();
    const { state } = found!;

    const before = availableRequests(state).map((r) => r.id);
    // Une fois le téléphone obtenu, la demande disparaît de la liste.
    state.player.origin.digital.phone = 'personnel';
    const after = availableRequests(state).map((r) => r.id);
    if (before.includes('phone')) expect(after).not.toContain('phone');

    // Et rien n'est proposé à un adulte : on ne demande plus la permission de
    // sortir à trente ans.
    const grown = createNewLife({ seed: 4242 });
    playTo(grown, 30);
    expect(availableRequests(grown)).toEqual([]);
  });

  it('fait dépendre la réponse du parent et du foyer', { timeout: 30_000 }, () => {
    let generousYes = 0;
    let harshYes = 0;

    for (let seed = 0; seed < 40; seed++) {
      const found = childWithParent(seed * 271 + 9, 12);
      if (!found) continue;

      const kind = JSON.parse(JSON.stringify(found.state)) as GameState;
      const kindParent = kind.npcs[found.parent.id];
      kindParent.personality.generosity = 95;
      kindParent.personality.warmth = 95;
      kindParent.relationship = 90;
      if (kindParent.psyche) kindParent.psyche.axes.generosity = 95;
      kind.player.origin.finance.financialStress = 5;
      if (askParent(createCtx(kind), kindParent.id, 'phone').tone === 'good') generousYes += 1;

      const harsh = JSON.parse(JSON.stringify(found.state)) as GameState;
      const harshParent = harsh.npcs[found.parent.id];
      harshParent.personality.generosity = 5;
      harshParent.personality.warmth = 10;
      harshParent.relationship = 20;
      if (harshParent.psyche) harshParent.psyche.axes.generosity = 5;
      harsh.player.origin.finance.financialStress = 90;
      if (askParent(createCtx(harsh), harshParent.id, 'phone').tone === 'good') harshYes += 1;
    }

    expect(generousYes).toBeGreaterThan(harshYes + 5);
  });

  it('récompense un bon dossier scolaire', { timeout: 30_000 }, () => {
    let goodStudent = 0;
    let troublemaker = 0;

    for (let seed = 0; seed < 40; seed++) {
      const found = childWithParent(seed * 131 + 3, 13);
      if (!found) continue;

      const model = JSON.parse(JSON.stringify(found.state)) as GameState;
      model.player.education.grades = 18;
      model.player.education.discipline.behaviour = 95;
      model.player.education.discipline.warnings = 0;
      if (askParent(createCtx(model), found.parent.id, 'computer').tone === 'good') goodStudent += 1;

      const rascal = JSON.parse(JSON.stringify(found.state)) as GameState;
      rascal.player.education.grades = 5;
      rascal.player.education.discipline.behaviour = 20;
      rascal.player.education.discipline.warnings = 3;
      rascal.player.education.discipline.suspensions = 2;
      if (askParent(createCtx(rascal), found.parent.id, 'computer').tone === 'good') troublemaker += 1;
    }

    expect(goodStudent).toBeGreaterThan(troublemaker + 3);
  });

  it('change réellement la vie quand la demande est accordée', () => {
    const found = childWithParent(777, 12);
    expect(found).not.toBeNull();
    const { state, parent } = found!;

    state.player.origin.digital.computer = 'aucun';
    state.player.origin.living.computer = false;
    const before = exposureTo(exposureSignals(state), 'informatique').total;

    // On force l'acceptation en rendant le parent aussi favorable que possible.
    parent.personality.generosity = 100;
    parent.personality.warmth = 100;
    parent.relationship = 100;
    if (parent.psyche) parent.psyche.axes.generosity = 100;
    state.player.origin.finance.financialStress = 0;
    state.player.education.grades = 19;
    state.player.education.discipline.behaviour = 100;

    let granted = false;
    for (let attempt = 0; attempt < 12 && !granted; attempt++) {
      state.player.yearActions = {};
      granted = askParent(createCtx(state), parent.id, 'computer').tone === 'good';
    }
    expect(granted, 'un parent parfaitement favorable finit par dire oui').toBe(true);

    // L'ordinateur ne s'ajoute pas à un inventaire : il change l'exposition,
    // donc les goûts possibles.
    expect(state.player.origin.digital.computer).toBe('personnel');
    expect(exposureTo(exposureSignals(state), 'informatique').total).toBeGreaterThan(before);
  });

  it('vérifie réellement une condition au lieu de l’oublier', { timeout: 30_000 }, () => {
    // On fabrique une négociation, puis on regarde ce qui se passe l'année
    // suivante selon que la promesse est tenue ou non.
    let tested = 0;
    let honoured = 0;
    let broken = 0;

    for (let seed = 0; seed < 60 && tested < 8; seed++) {
      const found = childWithParent(seed * 89 + 17, 12);
      if (!found) continue;
      const { state, parent } = found;

      // Un parent moyen, un enfant moyen : c'est le terrain de la négociation.
      parent.personality.generosity = 55;
      parent.relationship = 55;
      state.player.origin.finance.financialStress = 40;
      state.player.education.grades = 11;
      state.player.education.discipline.behaviour = 70;

      let negotiated = false;
      for (let attempt = 0; attempt < 10 && !negotiated; attempt++) {
        state.player.yearActions = {};
        negotiated = askParent(createCtx(state), parent.id, 'phone').title === 'À une condition';
      }
      if (!negotiated) continue;
      tested += 1;

      const condition = pendingConditions(state)[0];
      expect(condition, 'une condition doit être enregistrée').toBeTruthy();
      expect(condition.dueYear).toBe(state.year + 1);

      // Version qui tient parole.
      const keeps = JSON.parse(JSON.stringify(state)) as GameState;
      keeps.player.education.grades = 20;
      keeps.player.education.discipline.behaviour = 100;
      keeps.player.origin.chores.hoursPerWeek = 99;
      playTo(keeps, 1);
      if (keeps.player.origin.digital.phone === 'personnel') honoured += 1;

      // Version qui ne tient pas.
      const fails = JSON.parse(JSON.stringify(state)) as GameState;
      fails.player.education.grades = 2;
      fails.player.education.discipline.behaviour = 10;
      fails.player.origin.chores.hoursPerWeek = 0;
      playTo(fails, 1);
      if (fails.player.origin.digital.phone !== 'personnel') broken += 1;

      // Dans les deux cas, la promesse ne reste pas en suspens.
      expect(pendingConditions(keeps).length).toBe(0);
      expect(pendingConditions(fails).length).toBe(0);
    }

    expect(tested, 'la négociation doit se produire').toBeGreaterThan(0);
    expect(honoured).toBeGreaterThan(0);
    expect(broken).toBeGreaterThan(0);
  });

  it('refuse d’être insisté deux fois la même année', () => {
    const found = childWithParent(2024, 12);
    expect(found).not.toBeNull();
    const { state, parent } = found!;
    // On prend une demande réellement ouverte : selon la vie, l'enfant a déjà
    // un animal ou un téléphone, et redemander n'aurait pas de sens.
    const open = availableRequests(state)[0];
    expect(open, 'un enfant de douze ans a toujours quelque chose à demander').toBeTruthy();

    expect(askParent(createCtx(state), parent.id, open.id).ok).toBe(true);
    expect(askParent(createCtx(state), parent.id, open.id).ok).toBe(false);
  });

  it('conserve les promesses dans la sauvegarde', () => {
    const found = childWithParent(31415, 12);
    expect(found).not.toBeNull();
    const { state, parent } = found!;
    for (let attempt = 0; attempt < 10; attempt++) {
      state.player.yearActions = {};
      if (askParent(createCtx(state), parent.id, 'curfew').title === 'À une condition') break;
    }
    const round = JSON.parse(JSON.stringify(state)) as GameState;
    expect(round.player.conditions ?? []).toEqual(state.player.conditions ?? []);
  });
});
