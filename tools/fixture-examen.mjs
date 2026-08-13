/**
 * Fabrique une sauvegarde d'un élève à la veille de sa session d'examens.
 *
 * Pourquoi : une session ne s'ouvre qu'en fin de cycle, et la partie chargée
 * doit tomber pile sur cette année-là — une de plus et l'examen est passé, une
 * de moins et il n'existe pas. Sans cette partie fabriquée, l'écran de la
 * copie ne serait jamais ouvert dans un vrai navigateur.
 *
 * Rien n'est posé à la main : la session est ouverte par `advanceEducation`
 * quand le cycle se termine, et le bulletin sort de `updateMarks`, année après
 * année.
 *
 *   node --experimental-strip-types tools/fixture-examen.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { examOf, report } from '../src/systems/exams.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function candidateLife() {
  for (let seed = 96_000; seed < 98_000; seed++) {
    const life = createNewLife({ seed });
    // On avance année par année et on s'arrête à la première session ouverte.
    for (let year = 0; year < 19 && !life.gameOver && life.player.alive; year++) {
      play(life, 1);
      const exam = examOf(life);
      if (!exam || exam.done) continue;
      if (life.player.prison) break;
      // Il faut un bulletin à montrer, et un établissement où tricher soit
      // possible — c'est la moitié de l'écran.
      if (report(life).filter((r) => r.mark > 0).length < 4) continue;
      if ((life.player.origin.school?.discipline ?? 100) > 85) continue;
      life.player.yearActions = {};
      return life;
    }
  }
  throw new Error('aucune graine ne donne un élève à la veille de sa session');
}

const state = candidateLife();
process.stdout.write(JSON.stringify(state));
