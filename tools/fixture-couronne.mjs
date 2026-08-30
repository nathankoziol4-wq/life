/**
 * Fabrique une sauvegarde de quelqu'un qui est de la maison.
 *
 * Pourquoi : naître dans une maison régnante tient à la graine seule, et à peu
 * près une vie sur cent cinquante y arrive. Une vie jouée au hasard n'ouvre
 * donc jamais cet écran, et il ne serait photographié qu'à l'état « les
 * maisons », c'est-à-dire vide.
 *
 * Rien n'est posé à la main. On cherche une graine qui naît dedans, on la joue
 * jusqu'à l'âge adulte, puis on tient les engagements de l'année avec
 * `performDuty` — les mêmes fonctions que le joueur. Ce qu'on veut sur la
 * photo : une file avec du monde devant et derrière, des engagements déjà
 * tenus, un bilan, et une affaire sur le bureau.
 *
 *   node --experimental-strip-types tools/fixture-couronne.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import {
  arbitrate, availableDuties, dutiesDone, dutyBlocker, expectedDuties,
  pendingAffair, performDuty, placeOf, succession,
} from '../src/systems/royalty.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

/** Tient ce que l'année attend, sans jamais dépasser le quota. */
function holdRank(life) {
  const ctx = createCtx(life);
  for (const duty of availableDuties(life)) {
    if (dutiesDone(life) >= expectedDuties(life)) break;
    if (!dutyBlocker(life, duty)) performDuty(ctx, duty.id);
  }
}

function royalLife() {
  for (let seed = 0; seed < 40_000; seed++) {
    const life = createNewLife({ seed, countryId: 'fr' });
    if (!life.player.crown) continue;

    // Une enfance, puis une vie d'adulte à tenir son rang. La rente paie les
    // engagements : on ne triche pas sur l'argent.
    play(life, 16);
    for (let year = 0; year < 32 && !life.gameOver && life.player.alive; year++) {
      holdRank(life);
      // On tranche ce qui est posé : c'est le bilan qu'on veut derrière.
      if (pendingAffair(life)) arbitrate(createCtx(life), year % 3);
      play(life, 1);
    }
    // Puis on attend qu'une affaire se pose, pour qu'il en reste une sur le
    // bureau. Elles ne tombent pas tous les ans et ne se répètent jamais.
    for (let year = 0; year < 10 && !life.player.crown?.pending; year++) {
      if (life.gameOver || !life.player.alive) break;
      holdRank(life);
      play(life, 1);
    }
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    const crown = life.player.crown;
    if (!crown || crown.removed || crown.abolished) continue;
    // Il faut de quoi regarder : une file, des engagements au compteur, un
    // bilan, et une décision qui attend.
    if (placeOf(life) < 0) continue;
    if (succession(life).length < 4) continue;
    if (crown.lifetimeDuties < 20) continue;
    if (crown.record.filter((r) => !r.includes('sans réponse')).length < 2) continue;
    if (!crown.pending) continue;
    return life;
  }
  throw new Error('aucune graine ne donne une maison régnante tenable');
}

const state = royalLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
