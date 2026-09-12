/**
 * Fabrique une sauvegarde de personnage installé dans le milieu, et l'écrit
 * sur la sortie standard.
 *
 * Pourquoi : une vie ordinaire n'entre jamais dans une organisation
 * criminelle. La moitié « maison » de l'écran du milieu — le rang, le
 * respect, le territoire, les missions — ne serait donc jamais ouverte dans
 * un vrai navigateur.
 *
 * Rien n'est posé à la main du côté du jeu : la vie est jouée par le vrai
 * moteur, les délits sont commis par les vraies fonctions, et l'entrée dans
 * la maison passe par le vrai tirage d'admission — on retente simplement
 * année après année, comme le ferait un joueur.
 *
 *   node --experimental-strip-types tools/fixture-crook.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { commitCrime } from '../src/systems/crime.ts';
import { joinOrganization, orgOf } from '../src/systems/underworld.ts';

function year(life) {
  simulateYear(life);
  const ctx = createCtx(life);
  for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
  life.pending = [];
}

/** Une vie qui a mal tourné, et qui a fini par être admise quelque part. */
function madeMan() {
  for (let seed = 77_000; seed < 77_400; seed++) {
    const life = createNewLife({ seed });
    for (let i = 0; i < 20 && !life.gameOver; i++) year(life);
    if (life.gameOver) continue;

    // Une carrière de petits délits, puis on frappe à la porte chaque année.
    for (let i = 0; i < 25 && !life.gameOver; i++) {
      const ctx = createCtx(life);
      if (!life.player.prison) {
        for (const crime of ['shoplift', 'graffiti', 'fraud_small', 'burglary', 'cartheft']) {
          commitCrime(ctx, crime);
        }
        if (!orgOf(life)) joinOrganization(ctx);
      }
      year(life);
      if (orgOf(life) && (orgOf(life).rank >= 2 || i > 18)) break;
    }
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (orgOf(life)) return life;
  }
  throw new Error('aucune graine ne donne un membre du milieu');
}

const state = madeMan();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
