/**
 * Fabrique une sauvegarde de salarié qui tient déjà un deuxième poste.
 *
 * Pourquoi : l'écran ne montre l'essentiel — le curseur des heures, ce que la
 * dispersion retire à la performance, et l'employeur qui a fini par
 * l'apprendre — qu'à condition d'avoir un poste principal **et** un poste de
 * complément déjà en cours. Une vie tirée au hasard n'a ni l'un ni l'autre :
 * l'autojoueur ne postule à rien.
 *
 * Rien n'est truqué : l'emploi passe par `applyToJob` sur une offre réellement
 * ouverte, le deuxième poste par `takeShift`, et les années sont jouées.
 *
 *   node --experimental-strip-types tools/fixture-second.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { applyToJob, offerBlocker } from '../src/systems/careers.ts';
import { moonlightOf, setHours, takeBlocker, takeShift } from '../src/systems/moonlight.ts';

function year(life) {
  simulateYear(life);
  const ctx = createCtx(life);
  for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
  life.pending = [];
}

function workerLife() {
  for (let seed = 75_000; seed < 75_600; seed += 1) {
    const life = createNewLife({ seed });
    for (let i = 0; i < 24 && !life.gameOver && life.player.alive; i += 1) year(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    // Un premier poste, pris sur une offre réellement ouverte.
    for (let i = 0; i < 8 && !life.player.job && !life.gameOver; i += 1) {
      const open = (life.world.jobOffers ?? []).filter((o) => offerBlocker(life, o) === null);
      if (open.length) applyToJob(createCtx(life), open[0].id);
      else year(life);
    }
    if (!life.player.job) continue;

    // Et un deuxième, tenu assez longtemps pour que l'écran ait un cumul à
    // montrer — et, avec un peu de chance, un employeur au courant.
    if (takeBlocker(life, 'extras') !== null) continue;
    takeShift(createCtx(life), 'extras');
    setHours(createCtx(life), 14);
    for (let i = 0; i < 5 && life.player.job && moonlightOf(life); i += 1) year(life);

    if (!life.player.job || !moonlightOf(life)) continue;
    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne un salarié avec un deuxième poste tenu');
}

const state = workerLife();
process.stdout.write(JSON.stringify(state));
