/**
 * Vérifications de l'enfance.
 *
 * L'audit avait chiffré deux trous : aucune action avant l'école, et huit
 * événements éligibles en moyenne avant cinq ans. Les tests portent donc sur
 * ce qui distingue une période jouable d'une période traversée :
 *
 * 1. **il y a quelque chose à faire** — et ce quelque chose dépend du foyer ;
 * 2. **avec qui compte plus que quoi** — un parent absent ne transforme pas
 *    une après-midi en souvenir, et le jeu doit le montrer ;
 * 3. **ça sème** — ce qu'on fait à sept ans alimente les intérêts, donc plus
 *    tard les études et le métier. Sans ce canal, l'enfance ne serait qu'une
 *    source de points de bonheur ;
 * 4. **`activityParticipation` cesse d'être décoratif** — le champ était
 *    calculé pour chaque parent et lu par personne.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { FAMILY_ACTIVITIES } from '../../data/childhood.ts';
import { INTERESTS } from '../../data/interests.ts';
import {
  activityBlocker, companionsFor, doFamilyActivity, engagementOf, guardians,
  isChild, meetNeighbourBlocker, meetNeighbourChild, neighbourhoodFriends,
} from '../../systems/childhood.ts';
import { exposureSignals, exposureTo } from '../../systems/exposure.ts';
import { ALL_EVENTS } from '../../data/events/index.ts';

/** Une vie d'enfant, à l'âge voulu. */
function child(seed: number, age = 8): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < age && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  // Une vie peut finir avant l'âge demandé — `simulateYear` sort aussitôt
  // dès que le personnage est mort, si bien que la boucle rend un cadavre
  // d'un an là où le test croit tenir quelqu'un de l'âge qu'il a demandé.
  // C'est ce qui est arrivé ici : la graine 23 mourait au berceau, et
  // l'assertion échouait pour une raison qui n'avait rien à voir avec elle.
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

/** Le premier parent vivant, ou rien. */
function parentOf(state: GameState): Person | undefined {
  return guardians(state)[0];
}

describe('l’enfance comme période jouable', () => {
  it('propose quelque chose à faire à chaque âge de l’enfance', () => {
    for (const age of [4, 6, 8, 10, 12, 14]) {
      const state = child(11, age);
      if (state.gameOver || !state.player.alive) continue;
      expect(isChild(state), `${age} ans`).toBe(true);
      const doable = FAMILY_ACTIVITIES.filter(
        (a) => activityBlocker(state, a) === null,
      );
      expect(doable.length, `${age} ans : rien à faire`).toBeGreaterThan(2);
    }
  });

  it('ferme ce qui n’a pas de sens, en disant pourquoi', () => {
    const state = child(13, 12);
    const story = FAMILY_ACTIVITIES.find((a) => a.id === 'story')!;
    // « Se faire lire une histoire » s'arrête à huit ans.
    expect(activityBlocker(state, story)).toMatch(/âge/);
  });

  it('limite ce qu’on peut faire dans une année', () => {
    const state = child(17, 8);
    const ctx = createCtx(state);
    const parent = parentOf(state);
    if (!parent) return;
    let done = 0;
    for (const activity of FAMILY_ACTIVITIES) {
      if (!companionsFor(state, activity).some((c) => c.id === parent.id)) continue;
      if (activityBlocker(state, activity)) continue;
      if (doFamilyActivity(ctx, activity.id, parent.id).ok) done += 1;
    }
    expect(done).toBeLessThanOrEqual(3);
  });
});

describe('avec qui compte', () => {
  it('lit enfin `activityParticipation`', () => {
    // Le champ était calculé à la naissance de chaque parent et lu par
    // personne. Sans ce test, rien n'empêcherait qu'il le redevienne.
    const state = child(19, 8);
    const parent = parentOf(state);
    if (!parent) return;
    const role = state.player.origin.parents.find((x) => x.personId === parent.id)!;

    role.availability.activityParticipation = 5;
    const distant = engagementOf(state, parent);
    role.availability.activityParticipation = 95;
    const present = engagementOf(state, parent);
    expect(present).toBeGreaterThan(distant);
  });

  it('donne davantage quand la personne est vraiment là', () => {
    // Même activité, même graine, deux parents opposés : la différence doit
    // se voir dans le lien et dans le bonheur, pas seulement dans le texte.
    const gains = (participation: number) => {
      let bond = 0;
      for (let seed = 0; seed < 40; seed++) {
        const state = child(seed * 7 + 3, 8);
        const parent = parentOf(state);
        if (!parent) continue;
        const role = state.player.origin.parents.find((x) => x.personId === parent.id);
        if (!role) continue;
        role.availability.activityParticipation = participation;
        role.style.patience = participation;
        role.style.affection = participation;
        const before = parent.relationship;
        doFamilyActivity(createCtx(state), 'talk', parent.id);
        bond += parent.relationship - before;
      }
      return bond;
    };
    expect(gains(95)).toBeGreaterThan(gains(5));
  });

  it('laisse la possibilité d’un moment gâché', () => {
    // Une action à résultat unique n'est pas du gameplay. Avec un parent
    // absent, l'après-midi doit parfois mal tourner.
    let sour = 0;
    for (let seed = 0; seed < 60; seed++) {
      const state = child(seed * 11 + 5, 8);
      const parent = parentOf(state);
      if (!parent) continue;
      const role = state.player.origin.parents.find((x) => x.personId === parent.id);
      if (!role) continue;
      role.availability.activityParticipation = 2;
      role.style.patience = 2;
      role.style.affection = 2;
      state.player.origin.atmosphere.calm = 5;
      const before = parent.relationship;
      doFamilyActivity(createCtx(state), 'talk', parent.id);
      if (parent.relationship < before) sour += 1;
    }
    expect(sour).toBeGreaterThan(3);
  });
});

describe('l’enfance sème', () => {
  it('alimente réellement l’exposition', () => {
    // C'est le seul lien entre l'enfance et le reste de la vie. Sans lui,
    // ces activités ne seraient que des points de bonheur.
    const state = child(23, 8);
    const parent = parentOf(state);
    if (!parent) return;
    const before = exposureTo(exposureSignals(state), 'bricolage').total;
    doFamilyActivity(createCtx(state), 'build', parent.id);
    const after = exposureTo(exposureSignals(state), 'bricolage').total;
    expect(after).toBeGreaterThan(before);
  });

  it('récompense la répétition, sans la récompenser sans fin', () => {
    const state = child(29, 8);
    state.player.flags['exposé:cuisine'] = 1;
    const once = exposureSignals(state)['pratiqué:cuisine'];
    state.player.flags['exposé:cuisine'] = 3;
    const thrice = exposureSignals(state)['pratiqué:cuisine'];
    state.player.flags['exposé:cuisine'] = 20;
    const many = exposureSignals(state)['pratiqué:cuisine'];
    expect(thrice).toBeGreaterThan(once);
    expect(many).toBe(thrice); // le signal sature : trois fois suffisent
  });

  it('ne nomme que des intérêts qui existent', () => {
    // Un `exposes` mal orthographié serait un canal muet, et rien ne le
    // dirait — c'est exactement le genre de panne silencieuse à interdire.
    const known = new Set(INTERESTS.map((i) => i.id));
    for (const activity of FAMILY_ACTIVITIES) {
      if (!activity.exposes) continue;
      expect(known, `${activity.id} expose « ${activity.exposes} »`).toContain(activity.exposes);
    }
    // Même contrôle pour les événements qui posent un marqueur d'exposition.
    for (const event of ALL_EVENTS) {
      for (const choice of event.choices) {
        for (const outcome of choice.outcomes) {
          const flag = outcome.effects?.flag;
          if (!flag?.startsWith('exposé:')) continue;
          expect(known, `${event.id} expose « ${flag} »`).toContain(flag.slice(7));
        }
      }
    }
  });
});

describe('les amis du quartier', () => {
  it('finit par en trouver, et pas à tous les coups', () => {
    let found = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = child(seed * 13 + 7, 9);
      if (meetNeighbourBlocker(state)) continue;
      meetNeighbourChild(createCtx(state));
      if (neighbourhoodFriends(state).length > 0) found += 1;
    }
    expect(found).toBeGreaterThan(4);
    expect(found).toBeLessThan(40);
  });

  it('dépend du quartier, pas seulement du hasard', () => {
    const rate = (safety: number, relations: number) => {
      let found = 0;
      for (let seed = 0; seed < 50; seed++) {
        const state = child(seed * 17 + 1, 9);
        state.player.origin.neighborhood.safety = safety;
        state.player.origin.street.neighbourRelations = relations;
        if (meetNeighbourBlocker(state)) continue;
        meetNeighbourChild(createCtx(state));
        if (neighbourhoodFriends(state).length > 0) found += 1;
      }
      return found;
    };
    expect(rate(95, 95)).toBeGreaterThan(rate(5, 5));
  });

  it('les laisse partir en grandissant', () => {
    const state = child(31, 10);
    const ctx = createCtx(state);
    for (let i = 0; i < 6; i++) {
      state.player.yearActions = {};
      meetNeighbourChild(ctx);
    }
    if (neighbourhoodFriends(state).length === 0) return;
    for (let year = 0; year < 12 && !state.gameOver && state.player.age < 20; year++) {
      simulateYear(state);
      state.pending = [];
    }
    // Passé dix-sept ans, il n'y a plus d'« amis d'enfance » : ils sont
    // devenus des amis tout court, ou ils ont disparu.
    expect(neighbourhoodFriends(state)).toEqual([]);
  });
});

describe('la densité d’événements de l’enfance', () => {
  it('a rattrapé une partie de son retard', () => {
    const at = (age: number) => ALL_EVENTS.filter((event) => {
      const cond = event.cond ?? {};
      if (cond.minAge !== undefined && age < cond.minAge) return false;
      if (cond.maxAge !== undefined && age > cond.maxAge) return false;
      return true;
    }).length;

    const early = (at(2) + at(3) + at(4)) / 3;
    const mid = (at(6) + at(8) + at(10)) / 3;
    const adult = (at(30) + at(35) + at(40)) / 3;

    // On ne prétend pas égaler l'âge adulte : un enfant a moins de vies
    // possibles. Mais le rapport ne doit plus être de un à dix.
    expect(early).toBeGreaterThan(10);
    expect(mid).toBeGreaterThan(adult * 0.4);
  });
});
