/**
 * Fabrique une sauvegarde de fin de vie avec des descendants vivants.
 *
 * Pourquoi : se marier et avoir des enfants sont des actions du joueur. Une
 * vie jouée toute seule n'en a jamais, et l'écran de récapitulatif n'aurait
 * donc jamais proposé de continuer par un descendant dans un vrai navigateur.
 *
 * Rien n'est truqué : le couple et les naissances passent par les vraies
 * fonctions du moteur (`marry`, `deliverBaby`), et la mort par `killPlayer`.
 * On ne pose ni héritier, ni héritage, ni lignée à la main.
 *
 *   node --experimental-strip-types tools/fixture-lignee.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear, killPlayer } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { deliverBaby, marry, meetRomanticProspect } from '../src/systems/relationships.ts';
import { canContinue, heirsOf } from '../src/systems/lineage.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver && life.player.alive; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function lineageLife() {
  for (let seed = 55_000; seed < 55_400; seed++) {
    const life = createNewLife({ seed });
    play(life, 27);
    if (life.gameOver || !life.player.alive) continue;

    const ctx = createCtx(life);
    marry(ctx, meetRomanticProspect(ctx, 72));
    for (let child = 0; child < 2; child++) {
      deliverBaby(createCtx(life));
      play(life, 3);
      if (life.gameOver || !life.player.alive) break;
    }
    if (life.gameOver || !life.player.alive) continue;

    // On laisse la vie aller jusqu'au bout : les enfants doivent avoir l'âge
    // de reprendre, et le patrimoine celui d'une vie entière.
    play(life, 45);
    if (life.player.alive) killPlayer(createCtx(life), 'de vieillesse');
    if (!canContinue(life)) continue;
    // Un héritage non nul, pour que l'écran montre ce qu'il a à montrer.
    if (heirsOf(life).every((h) => h.wealth <= 0)) continue;
    return life;
  }
  throw new Error('aucune graine ne donne une fin de vie avec descendance');
}

const state = lineageLife();
process.stdout.write(JSON.stringify(state));
