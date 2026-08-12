/**
 * Fabrique une sauvegarde de quelqu'un qui exerce un métier de scène.
 *
 * Pourquoi : un métier de scène ne s'atteint pas par hasard — il faut s'y
 * lancer, puis tenir assez d'engagements pour qu'on vous en propose de
 * sérieux. Une vie ordinaire n'en montre donc jamais rien, et l'écran ne
 * serait photographié qu'à l'état vide.
 *
 * Rien n'est posé à la main : le métier acquis, le nom et les propositions
 * sortent de `settleJob` et de `rollOffers`, c'est-à-dire des mêmes fonctions
 * que joue le joueur. On se contente de laisser le personnage travailler.
 *
 *   node --experimental-strip-types tools/fixture-scene.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import {
  acceptOffer, autoPerform, startDiscipline,
} from '../src/systems/stage.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function performerLife() {
  for (let seed = 71_000; seed < 71_600; seed++) {
    const life = createNewLife({ seed });
    play(life, 19);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.criminalRecord.wanted) continue;

    life.player.yearActions = {};
    if (!startDiscipline(createCtx(life), 'jeu').ok) continue;

    // Quinze ans de métier : on accepte ce qu'on nous propose et on le tient
    // comme le personnage sait le faire. C'est exactement ce que fait le
    // bouton « Laisser faire » de l'écran.
    for (let year = 0; year < 15 && !life.gameOver && life.player.alive; year++) {
      for (let signed = 0; signed < 2; signed++) {
        const stage = life.player.stage;
        if (!stage || stage.offers.length === 0) break;
        const ctx = createCtx(life);
        if (!acceptOffer(ctx, stage.offers[0].id).ok) break;
        autoPerform(createCtx(life));
      }
      play(life, 1);
    }
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    const stage = life.player.stage;
    // Il faut de quoi montrer : un métier installé, un historique, et des
    // propositions sur la table.
    if (!stage || stage.craft < 45 || stage.done < 8) continue;
    if (stage.offers.length === 0) continue;
    return life;
  }
  throw new Error('aucune graine ne donne une carrière de scène installée');
}

const state = performerLife();
state.player.stage.current = null;
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
