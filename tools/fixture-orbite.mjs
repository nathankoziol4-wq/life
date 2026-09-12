/**
 * Fabrique une sauvegarde de quelqu'un qui vole.
 *
 * Pourquoi un deuxième fixture de service : les trois maisons partagent un
 * écran mais pas leur épreuve. L'armée et le service jouent l'approche
 * discrète ; le programme spatial joue l'amarrage, qui est un tout autre jeu
 * — un problème d'inertie et non de patience. Sans cette sauvegarde, la
 * moitié de ce qui a été ajouté ne serait jamais ouverte dans un navigateur.
 *
 * C'est aussi la porte la plus étroite du jeu : il faut un diplôme du
 * supérieur, une condition physique, un casier vide, avoir plus de vingt-sept
 * ans — puis trois ans d'entraînement avant qu'on ne confie quoi que ce soit.
 *
 *   node --experimental-strip-types tools/fixture-orbite.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import {
  acceptDuty, autoRun, enlist, entryBlocker, rankOf, train,
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

function flyingLife() {
  const corps = getCorps('orbite');
  for (let seed = 90_000; seed < 92_000; seed++) {
    const life = createNewLife({ seed });
    play(life, 29);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.criminalRecord.wanted) continue;
    // La porte est étroite et c'est voulu : on ne force rien, on écarte les
    // graines qui n'y arrivent pas.
    if (entryBlocker(life, corps)) continue;

    let taken = false;
    for (let attempt = 0; attempt < 5 && !taken; attempt++) {
      life.player.yearActions = {};
      if (entryBlocker(life, corps)) break;
      taken = enlist(createCtx(life), 'orbite').ok;
      if (!taken) play(life, 1);
      if (life.gameOver || !life.player.alive) break;
    }
    if (!taken || !life.player.service) continue;

    // Vingt ans de programme : trois d'entraînement, puis les vols.
    for (let year = 0; year < 20 && !life.gameOver && life.player.alive; year++) {
      if (!life.player.service) break;
      life.player.yearActions = {};
      train(createCtx(life));
      const service = life.player.service;
      if (!service.current && service.offers.length > 0) {
        const pick = [...service.offers].sort((a, b) => b.demands - a.demands)[0];
        if (acceptDuty(createCtx(life), pick.id).ok) autoRun(createCtx(life));
      }
      play(life, 1);
    }
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    const service = life.player.service;
    if (!service) continue;
    // Il faut de quoi montrer : avoir volé, avoir un grade, et des missions
    // sur la table.
    if (rankOf(life).id === 'o1') continue;
    if (service.done < 3) continue;
    if (service.offers.length === 0) continue;
    if (service.current) continue;
    return life;
  }
  throw new Error('aucune graine ne donne une carrière spatiale installée');
}

const state = flyingLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
