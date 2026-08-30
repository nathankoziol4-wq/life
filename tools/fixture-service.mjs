/**
 * Fabrique une sauvegarde de quelqu'un qui sert depuis longtemps.
 *
 * Pourquoi : on n'entre pas dans une de ces maisons par hasard — il faut
 * remplir des conditions, passer une sélection qu'on peut rater, tenir
 * plusieurs années de formation, puis mener assez de missions pour qu'on
 * vous en confie de sérieuses. Une vie jouée toute seule n'ouvre donc jamais
 * cet écran, et il ne serait photographié qu'à l'état vide.
 *
 * Rien n'est posé à la main : le grade, la réputation, les décorations et les
 * missions proposées sortent de `settleDuty`, `advanceService` et
 * `rollDuties` — c'est-à-dire des mêmes fonctions que joue le joueur. On se
 * contente de laisser le personnage servir.
 *
 *   node --experimental-strip-types tools/fixture-service.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import {
  acceptDuty, autoRun, corpsOf, enlist, entryBlocker, rankOf, train,
} from '../src/systems/service.ts';
import { getCorps } from '../src/data/service.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function servingLife() {
  const corps = getCorps('armee');
  for (let seed = 83_000; seed < 84_000; seed++) {
    const life = createNewLife({ seed });
    play(life, 21);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.criminalRecord.wanted) continue;

    // Se présenter : on peut être refusé, et on retente. C'est exactement ce
    // que fait le joueur devant l'écran.
    let taken = false;
    for (let attempt = 0; attempt < 4 && !taken; attempt++) {
      life.player.yearActions = {};
      if (entryBlocker(life, corps)) break;
      taken = enlist(createCtx(life), 'armee').ok;
      if (!taken) play(life, 1);
      if (life.gameOver || !life.player.alive) break;
    }
    if (!taken || !life.player.service) continue;

    // Vingt ans de service : on s'entraîne, on accepte ce qu'on nous confie
    // et on le mène comme le personnage sait le faire. C'est le bouton
    // « Laisser faire » de l'écran.
    for (let year = 0; year < 20 && !life.gameOver && life.player.alive; year++) {
      if (!life.player.service) break;
      life.player.yearActions = {};
      train(createCtx(life));
      const service = life.player.service;
      if (!service.current && service.offers.length > 0) {
        // La mission la plus exigeante qu'on nous propose : c'est elle qui
        // fait monter, et l'écran doit montrer une carrière, pas une garde.
        const pick = [...service.offers].sort((a, b) => b.demands - a.demands)[0];
        if (acceptDuty(createCtx(life), pick.id).ok) autoRun(createCtx(life));
      }
      play(life, 1);
    }
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    const service = life.player.service;
    if (!service) continue;
    // Il faut de quoi montrer : un grade au-dessus du premier, un historique,
    // une décoration et des missions sur la table.
    const ladder = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'];
    if (ladder.indexOf(rankOf(life).id) < 2) continue;
    if (service.done < 4) continue;
    if (service.decorations.length === 0) continue;
    if (service.offers.length === 0) continue;
    if (service.current) continue;
    return life;
  }
  throw new Error('aucune graine ne donne une carrière de service installée');
}

const state = servingLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
