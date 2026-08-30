/**
 * Fabrique une sauvegarde de quelqu'un dont l'arrivée s'est mal passée.
 *
 * Pourquoi : les circonstances de naissance sont volontairement rares — un
 * jumeau une vie sur trente, un enfant trouvé une sur quatre-vingts — et deux
 * vies sur trois n'en portent aucune. La marche de contrôle serait donc tombée
 * presque à coup sûr sur une naissance ordinaire, et n'aurait jamais vu la
 * section « Comment tu es arrivé ».
 *
 * Rien n'est truqué : on cherche une graine qui donne d'elle-même plusieurs
 * circonstances, et on la joue jusqu'à un âge où l'écran a quelque chose à
 * montrer. Aucune marque n'est posée à la main.
 *
 *   node --experimental-strip-types tools/fixture-naissance.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { birthOf, owedOf } from '../src/systems/birth.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver && life.player.alive; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function markedLife() {
  // On veut au moins deux circonstances, dont la dette de naissance : c'est
  // celle qui affiche un nombre vivant, et donc celle qu'il faut voir.
  for (let seed = 0; seed < 40_000; seed++) {
    const life = createNewLife({ seed });
    const marks = birthOf(life).marks;
    if (marks.length < 2 || !marks.includes('avantTerme')) continue;

    // Quelques années : assez pour que l'enfance ait commencé à rembourser,
    // pas assez pour que la dette soit soldée.
    play(life, 4);
    if (life.gameOver || !life.player.alive) continue;
    if (owedOf(life) <= 0) continue;

    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne une arrivée à plusieurs circonstances');
}

const state = markedLife();
process.stdout.write(JSON.stringify(state));
