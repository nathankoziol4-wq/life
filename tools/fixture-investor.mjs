/**
 * Fabrique une sauvegarde de personnage qui a de quoi placer, et l'écrit sur
 * la sortie standard.
 *
 * Pourquoi : le test de fumée joue une vie ordinaire, et une vie ordinaire
 * n'a presque rien de côté à trente ans. L'écran de portefeuille n'aurait
 * donc jamais montré qu'une liste de refus dans un vrai navigateur, et le
 * chemin achat → portefeuille → vente ne serait jamais parcouru.
 *
 * Rien n'est truqué : on ne pose aucune valeur à la main. On joue des vies
 * entières avec le vrai moteur et on garde la première qui a réellement
 * accumulé quelque chose — ces vies-là existent, elles sont simplement
 * minoritaires.
 *
 *   node --experimental-strip-types tools/fixture-investor.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { ASSETS } from '../src/data/assets.ts';
import { minimumTicket } from '../src/systems/investing.ts';

/** Le ticket du support le plus cher qu'on veut pouvoir montrer. */
function reachable(state) {
  const index = ASSETS.find((a) => a.id === 'index');
  return state.player.money >= minimumTicket(state, index) * 4;
}

function wealthyLife() {
  for (let seed = 91_000; seed < 91_400; seed++) {
    const life = createNewLife({ seed });
    for (let year = 0; year < 45 && !life.gameOver; year++) {
      simulateYear(life);
      const ctx = createCtx(life);
      for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
      life.pending = [];
    }
    if (life.gameOver || !life.player.alive) continue;
    if (life.player.prison || life.player.criminalRecord.wanted) continue;
    if (reachable(life)) return life;
  }
  throw new Error('aucune graine ne donne un adulte avec de l’épargne');
}

const state = wealthyLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
