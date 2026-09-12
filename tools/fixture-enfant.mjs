/**
 * Fabrique une sauvegarde d'un enfant.
 *
 * Pourquoi : `ChildhoodScreen.tsx` ne s'ouvre qu'entre trois et quinze ans —
 * `isChild` le dit en une ligne. Les quatre parties du parcours ont 17, 17,
 * 29 et 44 ans, et les visites ciblées vont chercher des carrières qui
 * demandent des décennies. Personne n'est jamais un enfant, et cet écran
 * n'était donc dans aucun témoin.
 *
 * C'est la fabrique la plus simple du lot : il n'y a rien à provoquer, juste
 * à s'arrêter tôt. On joue neuf années depuis la naissance — assez pour que
 * la fratrie, le voisinage et les liens de famille existent, et bien en deçà
 * de la borne où l'enfance se termine.
 *
 * On écarte les vies que le moteur a déjà interrompues, et rien d'autre : un
 * enfant ordinaire est exactement ce qu'on veut montrer.
 *
 *   node --experimental-strip-types tools/fixture-enfant.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { isChild } from '../src/systems/childhood.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function childLife() {
  for (let seed = 70_000; seed < 70_400; seed++) {
    const life = createNewLife({ seed });
    play(life, 9);
    if (life.gameOver || !life.player.alive) continue;
    if (!isChild(life)) continue;
    // Une famille autour de soi : l'écran est fait de ce qu'on peut faire
    // avec les autres, et un enfant seul n'en montrerait que la moitié.
    // Les proches vivent sur l'état, pas sur le joueur — `life.player.people`
    // n'existe pas, et le lire rendait « undefined » sans rien dire.
    if (Object.values(life.npcs).filter((x) => x.alive).length < 3) continue;
    return life;
  }
  throw new Error('aucune graine ne donne un enfant entouré');
}

const state = childLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
