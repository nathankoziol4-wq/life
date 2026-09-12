/**
 * Fabrique une sauvegarde de quelqu'un qui a du monde autour et de quoi partir.
 *
 * Pourquoi : l'écran ne montre l'essentiel — l'accord annoncé pour chaque
 * personne, les trois classes, la situation du séjour — qu'à condition d'avoir
 * des compagnons possibles et assez d'argent. Une vie tirée au hasard arrive
 * souvent sans l'un ou sans l'autre.
 *
 * Rien n'est truqué : les proches viennent du foyer et des années jouées, et
 * seul l'argent est posé — ce qu'on veut montrer est le choix du compagnon,
 * pas la probabilité de pouvoir se l'offrir.
 *
 *   node --experimental-strip-types tools/fixture-voyage.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { DESTINATIONS } from '../src/data/activities.ts';
import { accordWith, companions } from '../src/systems/trip.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver && life.player.alive; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function travellerLife() {
  for (let seed = 81_000; seed < 81_400; seed++) {
    const life = createNewLife({ seed });
    play(life, 34);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    const people = companions(life);
    if (people.length < 4) continue;

    // On veut que l'écran ait quelque chose à dire : au moins deux
    // appréciations différentes parmi les compagnons pour un même voyage,
    // sans quoi la lecture n'aurait rien à montrer.
    const spread = people.map((who) => accordWith(who, 'roadtrip'));
    if (Math.max(...spread) - Math.min(...spread) < 0.12) continue;

    life.player.money = 120_000 * life.world.inflation;
    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne quelqu’un avec des compagnons contrastés');
}

const state = travellerLife();
process.stdout.write(JSON.stringify(state));
