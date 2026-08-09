/**
 * Fabrique une sauvegarde de personnage incarcéré, et l'écrit sur la sortie
 * standard.
 *
 * Pourquoi : le test de fumée joue une vie ordinaire, et une vie ordinaire ne
 * passe presque jamais douze ans en prison. Les écrans de détention et
 * d'évasion ne seraient donc jamais ouverts dans un vrai navigateur — et
 * c'est exactement le genre d'angle mort qui a laissé passer un mini-jeu
 * parfaitement figé à l'écran.
 *
 * Ce n'est pas une porte dérobée dans le jeu : la sauvegarde est construite
 * par le vrai moteur, avec les vraies fonctions, et injectée par le même
 * mécanisme que « Transférer la partie ».
 *
 *   node --experimental-strip-types tools/fixture-jailed.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { incarcerate } from '../src/systems/justice.ts';
import { createPerson } from '../src/systems/npc.ts';

/** Une vie adulte et vivante : toutes les graines n'y arrivent pas. */
function adultLife() {
  for (let seed = 424_242; seed < 424_342; seed++) {
    const life = createNewLife({ seed });
    for (let year = 0; year < 30 && !life.gameOver; year++) {
      simulateYear(life);
      const ctx = createCtx(life);
      for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
      life.pending = [];
    }
    if (life.player.alive && !life.gameOver) return life;
  }
  throw new Error('aucune graine ne donne un adulte vivant');
}

const state = adultLife();
const ctx = createCtx(state);
incarcerate(ctx, 14);
state.player.yearActions = {};

// Un codétenu connu et une préparation déjà entamée : c'est l'état dans
// lequel un joueur arrive devant la cour, et donc celui qu'il faut montrer.
createPerson(ctx, {
  relation: 'inmate', age: 38, relationship: 62, opinion: 58, withJob: false,
});
state.player.prison.respect = 55;
state.player.prison.escapePlan = 55;

process.stdout.write(JSON.stringify(state));
