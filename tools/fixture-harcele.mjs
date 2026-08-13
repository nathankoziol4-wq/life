/**
 * Fabrique une sauvegarde d'un élève pris pour cible.
 *
 * Pourquoi : le harcèlement dépend d'un tirage annuel dont la probabilité
 * plafonne à 20 %, et il faut en plus être encore à l'école, avec une classe
 * et quelqu'un qui s'y prête. Une vie jouée toute seule n'ouvre donc presque
 * jamais cet écran, et il ne serait jamais photographié.
 *
 * Rien n'est posé à la main : on balaie des graines jusqu'à en trouver une où
 * le moteur ouvre lui-même la situation, par `rollHarassment` et à partir du
 * risque réel calculé par `bullyingRisk`. Le harceleur, le registre, les
 * témoins et l'ampleur sortent tous du jeu.
 *
 *   node --experimental-strip-types tools/fixture-harcele.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { harassmentOf } from '../src/systems/bullying.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function targetedLife() {
  for (let seed = 82_000; seed < 84_000; seed++) {
    const life = createNewLife({ seed });
    // On avance année par année et on s'arrête à la première où le moteur a
    // ouvert une situation : la prendre plus tard la verrait déjà réglée.
    for (let year = 0; year < 17 && !life.gameOver && life.player.alive; year++) {
      play(life, 1);
      const h = harassmentOf(life);
      if (!h || h.resolvedYear) continue;
      // Il faut de quoi montrer : encore scolarisé — sinon l'écran de l'école
      // ne s'ouvre pas du tout —, et des témoins.
      if (!['middle', 'high'].includes(life.player.education.stage)) continue;
      if (h.witnessIds.length < 2) continue;
      life.player.yearActions = {};
      h.triedThisYear = [];
      return life;
    }
  }
  throw new Error('aucune graine ne donne un élève pris pour cible');
}

const state = targetedLife();
process.stdout.write(JSON.stringify(state));
