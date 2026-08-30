/**
 * Fabrique une sauvegarde d'un personnage né avec un nom.
 *
 * Pourquoi : cela n'arrive qu'à une vie sur vingt-six, et il faut en plus que
 * le personnage soit assez grand pour que l'écran dise quelque chose. Trois
 * conditions :
 *
 *   1. **un nom hérité qui vaut encore quelque chose** — il s'use d'un point
 *      par an, et sous le seuil d'oubli l'écran ne montrerait rien ;
 *   2. **un parent encore vivant**, pour que la ligne « ce qu'on perdrait en
 *      changeant de nom » ait un destinataire ;
 *   3. **un âge adulte**, parce que c'est là que le nom sert et se quitte.
 *
 * Rien n'est posé à la main : le nom vient de `household.ts#buildHousehold`
 * comme dans n'importe quelle partie, et les années passent par le moteur.
 *
 *   node --experimental-strip-types tools/fixture-nom.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { bearer, legacyOf, nameLevel } from '../src/systems/legacy.ts';

function namedLife() {
  for (let seed = 0; seed < 60_000; seed++) {
    const life = createNewLife({ seed });
    if (!life.player.legacy) continue;
    // Une hauteur qui tiendra jusqu'à l'âge adulte : les noms régionaux
    // s'éteignent avant, et l'écran n'aurait plus rien à montrer.
    if (life.player.legacy.standing === 'local') continue;

    for (let year = 0; year < 28 && !life.gameOver; year++) simulateYear(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.age < 26) continue;

    // Conditions 1 et 2.
    if (!legacyOf(life) || nameLevel(life) < 25) continue;
    if (!bearer(life)?.alive) continue;

    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne un nom encore vivant à l’âge adulte');
}

const state = namedLife();
process.stdout.write(JSON.stringify(state));
