/**
 * Vérifications de la détention, de l'évasion et de la cavale.
 *
 * Trois exigences, et elles se tiennent :
 *
 * 1. **la préparation compte** — sans quoi le joueur n'aurait aucune raison
 *    d'y passer des années, et l'évasion redeviendrait un bouton ;
 * 2. **sortir n'est pas gagner** — la course puis la cavale ont leurs propres
 *    conséquences, et elles doivent se voir dans l'état du jeu ;
 * 3. **rien de décoratif** — `wanted` ne peut pas être un simple booléen qui
 *    n'empêche rien. Un test le vérifie en essayant de se faire embaucher.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { incarcerate } from '../../systems/justice.ts';
import { createPerson } from '../../systems/npc.ts';
import { doPrisonActivity, inmateAction } from '../../systems/prison.ts';
import { applyToJob } from '../../systems/careers.ts';
import { getAvailableActions } from '../../systems/actions.ts';
import { autoResolve, miniGameContext } from '../minigame.ts';
import {
  PREPARATIONS, advanceFugitive, autoEscape, escapeBlocker, escapeContext, escapeWarning,
  preparationBlocker, prepareEscape, resolveEscapeAttempt, resolveEscapeChase, surrender,
  yearsOnTheRun,
} from '../../systems/escape.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Une vie adulte, incarcérée pour une longue peine. */
function jailedLife(seed: number, years = 12): GameState {
  const state = createNewLife({ seed });
  playTo(state, 28);
  const ctx = createCtx(state);
  incarcerate(ctx, years);
  state.player.yearActions = {};
  return state;
}

const result = (quality: number) => ({
  success: quality > 0.5, score: 50, quality, mistakes: 0, time: 10_000,
});

describe('détention', () => {
  it('oppose le dossier et le respect', () => {
    // C'est la mécanique centrale : tout ce qui plaît à la cour déplaît à la
    // commission. Si les deux montaient ensemble, il n'y aurait rien à choisir.
    const state = jailedLife(3);
    const ctx = createCtx(state);
    createPerson(ctx, {
      relation: 'inmate', age: 34, relationship: 60, opinion: 60, withJob: false,
    });
    const mate = Object.values(state.npcs).find((x) => x.relation === 'inmate')!;
    const before = { ...state.player.prison! };

    inmateAction(ctx, mate.id, 'backUp');
    const after = state.player.prison!;
    expect(after.respect).toBeGreaterThan(before.respect);
    expect(after.behavior).toBeLessThan(before.behavior);
  });

  it('propose des actions propres à la détention, et seulement là', () => {
    const state = jailedLife(5);
    const ctx = createCtx(state);
    createPerson(ctx, {
      relation: 'inmate', age: 40, relationship: 50, opinion: 50, withJob: false,
    });
    const mate = Object.values(state.npcs).find((x) => x.relation === 'inmate')!;

    const inside = getAvailableActions(state, mate, 'prison').filter((a) => a.group === 'prison');
    const outside = getAvailableActions(state, mate, 'général').filter((a) => a.group === 'prison');
    expect(inside.length).toBeGreaterThan(2);
    expect(outside).toEqual([]);
    // Et elles sont jouables : une action listée mais toujours bloquée serait
    // un faux bouton.
    expect(inside.some((a) => a.blocked === null)).toBe(true);
  });

  it('protège réellement celui qui s’est rangé derrière quelqu’un', () => {
    // `protectedInside` ne doit pas être un drapeau décoratif : il doit se
    // voir dans le nombre d'altercations sur plusieurs années.
    const hurt = (shielded: boolean) => {
      let total = 0;
      for (let seed = 0; seed < 30; seed++) {
        const state = jailedLife(seed * 7 + 1, 10);
        state.player.flags.protectedInside = shielded;
        state.player.prison!.security = 'maximum';
        const before = state.player.stats.health;
        for (let year = 0; year < 4 && state.player.prison; year++) {
          state.player.flags.protectedInside = shielded;
          simulateYear(state);
          state.pending = [];
        }
        total += Math.max(0, before - state.player.stats.health);
      }
      return total;
    };
    expect(hurt(true)).toBeLessThan(hurt(false));
  });

  it('laisse la méfiance retomber d’elle-même', () => {
    const state = jailedLife(9);
    state.player.prison!.suspicion = 80;
    simulateYear(state);
    state.pending = [];
    expect(state.player.prison!.suspicion).toBeLessThan(80);
  });
});

describe('préparer une évasion', () => {
  it('fait monter le plan, et jamais gratuitement', () => {
    let gained = 0;
    let noticed = 0;
    for (let seed = 0; seed < 25; seed++) {
      const state = jailedLife(seed * 13 + 2);
      const ctx = createCtx(state);
      const before = { ...state.player.prison! };
      prepareEscape(ctx, 'observe');
      const after = state.player.prison!;
      if (after.escapePlan > before.escapePlan) gained += 1;
      if (after.suspicion > before.suspicion) noticed += 1;
    }
    // Préparer apporte toujours quelque chose, et se remarque toujours un peu.
    expect(gained).toBe(25);
    expect(noticed).toBe(25);
  });

  it('explique ce qui est hors de portée au lieu de le cacher', () => {
    const state = jailedLife(11);
    const diversion = PREPARATIONS.find((p) => p.id === 'diversion')!;
    // Une diversion sans complice n'est pas retirée du menu : elle dit
    // pourquoi elle est impossible.
    expect(preparationBlocker(state, diversion)).toBeTruthy();

    state.player.prison!.prepared.push('ally');
    expect(preparationBlocker(state, diversion)).toBeNull();
  });

  it('ne se refait pas deux fois', () => {
    const state = jailedLife(13);
    const ctx = createCtx(state);
    prepareEscape(ctx, 'observe');
    state.player.yearActions = {};
    const again = prepareEscape(ctx, 'observe');
    expect(again.ok).toBe(false);
  });

  it('avertit celui qui tente sans rien avoir préparé', () => {
    const state = jailedLife(17);
    expect(escapeBlocker(state)).toBeNull();
    // Ce n'est pas un blocage : le joueur a le droit de tenter n'importe quoi.
    // Mais il doit savoir ce qu'il fait.
    expect(escapeWarning(state)).toBeTruthy();
    state.player.prison!.escapePlan = 70;
    expect(escapeWarning(state)).toBeNull();
  });

  it('se transmet au mini-jeu', () => {
    const state = jailedLife(19);
    state.player.prison!.escapePlan = 80;
    state.player.prison!.suspicion = 10;
    state.player.prison!.security = 'maximum';
    const context = escapeContext(state);
    expect(context.setup).toMatchObject({ security: 'maximum', plan: 80, suspicion: 10 });
  });
});

describe('tenter une évasion', () => {
  it('alourdit la peine et durcit le régime quand elle échoue', () => {
    const state = jailedLife(23);
    state.player.prison!.security = 'minimum';
    const ctx = createCtx(state);
    const before = { ...state.player.prison! };

    const answer = resolveEscapeAttempt(ctx, {
      outcome: 'repéré', result: result(0.2), context: escapeContext(state),
    });
    const after = state.player.prison!;
    expect(answer.chase).toBeUndefined();
    expect(after.yearsLeft).toBeGreaterThan(before.yearsLeft);
    expect(after.security).not.toBe('minimum');
    expect(after.prepared).toEqual([]);
  });

  it('distingue l’appel du flagrant délit', () => {
    const extra = (outcome: 'appel' | 'repéré') => {
      let total = 0;
      for (let seed = 0; seed < 30; seed++) {
        const state = jailedLife(seed * 31 + 3);
        const before = state.player.prison!.yearsLeft;
        resolveEscapeAttempt(createCtx(state), {
          outcome, result: result(0.3), context: escapeContext(state),
        });
        total += state.player.prison!.yearsLeft - before;
      }
      return total;
    };
    // Manquer l'appel, c'est n'être jamais sorti de la zone : c'est moins
    // grave que d'être pris au pied du périmètre.
    expect(extra('appel')).toBeLessThan(extra('repéré'));
  });

  it('ouvre une course quand le périmètre est franchi', () => {
    const state = jailedLife(29);
    state.player.prison!.security = 'maximum';
    const answer = resolveEscapeAttempt(createCtx(state), {
      outcome: 'dehors', result: result(0.8), context: escapeContext(state),
    });
    expect(answer.chase).toBeTruthy();
    expect(answer.chase!.place).toBe('prison');
    expect(answer.chase!.pursuers).toBeGreaterThan(1);
    // Toujours en détention : sortir du périmètre n'est pas s'évader.
    expect(state.player.prison).not.toBeNull();
    expect(state.player.criminalRecord.wanted).toBe(false);
  });

  it('ramène en régime maximum quand la course est perdue', () => {
    const state = jailedLife(31);
    resolveEscapeAttempt(createCtx(state), {
      outcome: 'dehors', result: result(0.8), context: escapeContext(state),
    });
    const before = state.player.prison!.yearsLeft;
    resolveEscapeChase(createCtx(state), false);
    expect(state.player.prison!.yearsLeft).toBeGreaterThan(before);
    expect(state.player.prison!.security).toBe('maximum');
    expect(state.player.criminalRecord.wanted).toBe(false);
  });

  it('met en cavale quand elle est gagnée', () => {
    const state = jailedLife(37);
    const facility = state.player.prison!.facilityName;
    resolveEscapeAttempt(createCtx(state), {
      outcome: 'dehors', result: result(0.9), context: escapeContext(state),
    });
    resolveEscapeChase(createCtx(state), true);

    expect(state.player.prison).toBeNull();
    expect(state.player.criminalRecord.wanted).toBe(true);
    expect(state.player.criminalRecord.wantedSince).toBe(state.year);
    expect(state.player.criminalRecord.escapedFrom?.facilityName).toBe(facility);
  });

  it('se résout aussi sans jouer, et conclut toujours', () => {
    for (let seed = 0; seed < 20; seed++) {
      const state = jailedLife(seed * 41 + 5);
      state.player.prison!.escapePlan = 60;
      const answer = autoEscape(createCtx(state));
      expect(answer.ok).toBe(true);
      // Soit on est dehors et recherché, soit on est dedans : jamais entre.
      const out = state.player.prison === null;
      expect(out).toBe(state.player.criminalRecord.wanted);
    }
  });

  it('récompense la préparation, sans jamais garantir la sortie', () => {
    const rate = (plan: number) => {
      let out = 0;
      for (let seed = 0; seed < 40; seed++) {
        const state = jailedLife(seed * 17 + 7);
        state.player.prison!.escapePlan = plan;
        const context = escapeContext(state);
        const ctx = createCtx(state);
        // On mesure la seule résolution automatique : le mini-jeu a ses
        // propres tests, ici c'est le branchement qu'on regarde.
        if (autoResolve(ctx.rng, context).quality > 0.62) out += 1;
      }
      return out;
    };
    expect(rate(90)).toBeGreaterThan(rate(0));
    expect(rate(90)).toBeLessThan(40);
  });
});

describe('la cavale', () => {
  function fugitive(seed: number): GameState {
    const state = jailedLife(seed);
    resolveEscapeAttempt(createCtx(state), {
      outcome: 'dehors', result: result(0.9), context: escapeContext(state),
    });
    resolveEscapeChase(createCtx(state), true);
    return state;
  }

  it('empêche réellement de travailler', () => {
    // `wanted` ne peut pas être un booléen que personne ne lit.
    const state = fugitive(43);
    state.world.jobOffers.push({
      id: 'test_offer', jobId: state.world.jobOffers[0]?.jobId ?? 'cashier',
      title: 'Test', employer: 'Test', salary: 20_000, requiresLevel: 0,
      minExperience: 0, level: 0, hours: 35,
    } as never);
    const answer = applyToJob(createCtx(state), 'test_offer');
    expect(answer.ok).toBe(false);
  });

  it('coûte quelque chose chaque année', () => {
    const state = fugitive(47);
    // On part d'un stress moyen : sortir de prison le laisse souvent au
    // plafond, et une jauge saturée ne peut plus rien montrer.
    state.player.stats.stress = 40;
    const before = { ...state.player.stats };
    let years = 0;
    while (state.player.criminalRecord.wanted && years < 3) {
      advanceFugitive(createCtx(state));
      years += 1;
    }
    if (state.player.criminalRecord.wanted) {
      expect(state.player.stats.stress).toBeGreaterThan(before.stress);
      expect(yearsOnTheRun(state)).toBeGreaterThanOrEqual(0);
    }
  });

  it('finit toujours par finir', () => {
    // Une cavale sans issue serait une impasse déguisée en liberté : elle doit
    // se terminer, d'une façon ou d'une autre, dans une vie humaine.
    let ended = 0;
    for (let seed = 0; seed < 25; seed++) {
      const state = fugitive(seed * 53 + 11);
      for (let year = 0; year < 40 && state.player.criminalRecord.wanted; year++) {
        state.year += 1;
        advanceFugitive(createCtx(state));
      }
      if (!state.player.criminalRecord.wanted) ended += 1;
    }
    expect(ended).toBe(25);
  });

  it('laisse se rendre, et en tient compte', () => {
    const state = fugitive(59);
    const owed = state.player.criminalRecord.escapedFrom!.yearsLeft;
    const answer = surrender(createCtx(state));
    expect(answer.ok).toBe(true);
    expect(state.player.criminalRecord.wanted).toBe(false);
    expect(state.player.prison).not.toBeNull();
    // Se rendre coûte moins cher que d'être repris, qui rajoute deux à cinq ans.
    expect(state.player.prison!.yearsLeft).toBeLessThanOrEqual(owed + 1);
  });

  it('ne se rend pas deux fois', () => {
    const state = jailedLife(61);
    expect(surrender(createCtx(state)).ok).toBe(false);
  });
});

describe('l’évasion n’est plus une activité de détention', () => {
  it('ne figure plus dans la liste des journées', () => {
    const state = jailedLife(67);
    // Elle a sa préparation, son mini-jeu, sa course et sa cavale : elle n'a
    // rien à faire entre « bibliothèque » et « travail en détention ».
    const answer = doPrisonActivity(createCtx(state), 'escape');
    expect(answer.ok).toBe(false);
  });

  it('reste refusée quand la peine touche à sa fin', () => {
    const state = jailedLife(71);
    state.player.prison!.yearsLeft = 1;
    expect(escapeBlocker(state)).toBeTruthy();
  });

  it('n’est tentable qu’une fois par an', () => {
    const state = jailedLife(73);
    resolveEscapeAttempt(createCtx(state), {
      outcome: 'repéré', result: result(0.2), context: escapeContext(state),
    });
    expect(escapeBlocker(state)).toBeTruthy();
  });
});

/** Contexte minimal, utilisé pour vérifier que le mini-jeu est bien branché. */
export const escapeMiniContext = () => miniGameContext({
  skill: 50, difficulty: 60, setup: { security: 'medium', plan: 0, suspicion: 0 },
});
