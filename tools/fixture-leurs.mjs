/**
 * Fabrique une sauvegarde où la vie des autres se voit.
 *
 * Pourquoi : les états qui comptent — détenu, malade, parti loin — sont rares
 * par construction (0,1 %, 6 %, 7 % des gens à un instant donné). Une partie
 * jouée au hasard n'en montrerait aucun, et le parloir, qui est la seule
 * chose qu'on puisse faire pour quelqu'un qui est dedans, ne serait jamais
 * photographié. Trois défauts d'affichage de ce projet ont tous produit un
 * journal de console parfaitement propre.
 *
 * Rien n'est posé à la main : les trois tournants passent par `takeTurn`, la
 * même fonction que le moteur appelle tout seul, et les histoires sont celles
 * que la vie jouée a écrites.
 *
 *   node --experimental-strip-types tools/fixture-leurs.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { takeTurn } from '../src/systems/lives.ts';
import { getTurn } from '../src/data/lives.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function leursLife() {
  for (let seed = 40_000; seed < 42_000; seed++) {
    const life = createNewLife({ seed });
    play(life, 38);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    // On veut trois personnes distinctes, assez proches pour que le joueur
    // aille les voir dans l'écran des proches.
    const proches = Object.values(life.npcs).filter(
      (n) => n.alive && !n.petSpecies && n.age >= 20 && !n.incarcerated
        && ['brother', 'sister', 'friend', 'bestFriend', 'cousin', 'mother', 'father'].includes(n.relation),
    );
    if (proches.length < 3) continue;

    const [dedans, malade, loin] = proches;
    takeTurn(createCtx(life), dedans, getTurn('condamnation'));
    takeTurn(createCtx(life), malade, getTurn('maladie'));
    takeTurn(createCtx(life), loin, getTurn('depart'));

    // Une peine qu'on voit courir, et une visite encore possible cette année.
    dedans.flags.sentence = 5;
    delete dedans.flags.visited;
    life.pending = [];
    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne trois proches à qui il arrive quelque chose');
}

const state = leursLife();
process.stdout.write(JSON.stringify(state));
