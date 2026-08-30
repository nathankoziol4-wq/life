/**
 * Fabrique une sauvegarde d'un lycéen installé dans l'équipe.
 *
 * Pourquoi : la filière demande d'être pris à une sélection, puis de tenir
 * plusieurs saisons pour que le groupe, le brassard et les recruteurs aient
 * quelque chose à montrer. Une vie jouée toute seule ne passe jamais la
 * sélection, et l'écran ne serait photographié qu'à l'état vide.
 *
 * Rien n'est posé à la main : la sélection est passée par `trySelection` — et
 * peut échouer —, le niveau vient de `train` et des saisons soldées par
 * `advanceSchoolSport`, les recruteurs viennent d'eux-mêmes.
 *
 *   node --experimental-strip-types tools/fixture-sportif.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import {
  offeredSports, runForCaptain, sportOf, train,
} from '../src/systems/schoolSport.ts';
import { trySelection } from '../src/systems/schoolSport.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function athleteLife() {
  for (let seed = 90_000; seed < 92_000; seed++) {
    const life = createNewLife({ seed });
    play(life, 11);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    const offered = offeredSports(life);
    // Un sport d'équipe, pour que le brassard et les coéquipiers existent.
    const sport = offered.find((s) => s.team);
    if (!sport) continue;

    life.player.yearActions = {};
    if (!trySelection(createCtx(life), sport.id).ok) continue;

    // Cinq ans d'entraînement et de saisons, comme le ferait un joueur : de
    // l'entrée au collège à l'avant-dernière année de lycée. Une de plus et le
    // personnage est diplômé, donc plus scolarisé, et l'écran n'a plus rien à
    // montrer.
    for (let year = 0; year < 5 && !life.gameOver && life.player.alive; year++) {
      const s = sportOf(life);
      if (!s || s.cutYear) break;
      for (let session = 0; session < 2; session++) train(createCtx(life));
      if (s.seasons >= 1) runForCaptain(createCtx(life));
      play(life, 1);
    }

    // La boucle ci-dessus s'arrête aussi quand le personnage meurt : sans ce
    // contrôle, la partie renvoyée s'ouvrirait sur l'écran de fin de vie.
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    const s = sportOf(life);
    if (!s || s.cutYear) continue;
    // Il faut de quoi montrer : encore scolarisé — sinon l'écran n'affiche que
    // le repli —, un niveau installé, et plusieurs saisons derrière soi.
    if (!['middle', 'high'].includes(life.player.education.stage)) continue;
    if (s.level < 48 || s.seasons < 3) continue;
    if (s.injuredUntil > life.year) continue;
    life.player.yearActions = {};
    s.trainedThisYear = 0;
    return life;
  }
  throw new Error('aucune graine ne donne un lycéen installé dans son équipe');
}

const state = athleteLife();
process.stdout.write(JSON.stringify(state));
