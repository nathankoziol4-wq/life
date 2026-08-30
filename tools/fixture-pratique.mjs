/**
 * Fabrique une sauvegarde où l'on tient déjà quelque chose.
 *
 * Pourquoi : l'écran « Ce que tu tiens » n'a d'intérêt qu'à quatre conditions,
 * et une partie prise au hasard n'en réunit aucune —
 *
 *   1. **des pratiques tenues depuis des années**, sans quoi l'écran n'affiche
 *      qu'une liste de choses à prendre et ne montre rien de ce qu'il fait ;
 *   2. **une avancée assez haute pour que le passage soit ouvert**, parce que
 *      la ligne « Tenter le passage » est la seule décision de l'écran et
 *      qu'une capture où elle est fermée ne dit rien ;
 *   3. **une année bloquée**, pour que l'avertissement « tu n'avances plus »
 *      et la pastille de rythme soient à l'image — c'est la pièce maîtresse du
 *      système, et c'est celle qu'aucune vie tranquille ne montre ;
 *   4. **un grade déjà décroché**, pour que la ligne du haut porte un nom de
 *      grade plutôt que « Débutant ».
 *
 * Rien n'est posé à la main : les années passent par `advancePractices` et les
 * grades par `attemptPassage`, exactement comme chez le joueur.
 *
 *   node --experimental-strip-types tools/fixture-pratique.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import {
  advancePractices, attemptPassage, kept, passageBlocker, raw, stalled,
  stateOf, takePractice,
} from '../src/systems/practices.ts';
import { NEED } from '../src/data/practices.ts';

function pratiqueLife() {
  for (let seed = 40_000; seed < 42_000; seed++) {
    const life = autoplayLife(seed, { maxYears: 33 });
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    // De quoi payer plusieurs années : sans cela `advancePractices` lâche tout
    // au premier tour, et l'on photographierait une liste vide.
    life.player.money = Math.max(life.player.money, 250_000);

    /*
     * Deux pratiques d'abord, tenues dix ans : sous le seuil, rien ne monterait
     * et l'on photographierait trois lignes à « Débutant ». C'est aussi
     * l'histoire que le système raconte — on devient bon à deux choses, puis
     * on en prend une de trop.
     */
    for (const id of ['martial', 'reading']) {
      life.player.yearActions = {};
      takePractice(createCtx(life), id);
    }
    if (kept(life).length < 2) continue;

    for (let year = 0; year < 10; year++) {
      life.player.yearActions = {};
      advancePractices(createCtx(life));
      life.player.money = Math.max(life.player.money, 250_000);
      for (const id of ['martial', 'reading']) {
        if (passageBlocker(life, id) === null) attemptPassage(createCtx(life), id);
      }
    }

    // Au moins un grade décroché quelque part (condition 4)…
    if (!['martial', 'reading'].some((id) => stateOf(life, id).grade > 0)) continue;

    // …puis la troisième, celle qui fait basculer l'année (condition 3).
    life.player.yearActions = {};
    takePractice(createCtx(life), 'diet');
    if (!stalled(life)) continue;

    // …et un passage ouvert à l'écran (condition 2). L'avancée est posée ici
    // et seulement ici : la boucle ci-dessus a consommé tout ce qu'elle
    // pouvait, et attendre qu'une graine finisse pile au-dessus du seuil
    // coûterait des minutes pour une capture d'écran.
    raw(life, 'martial').progress = Math.max(raw(life, 'martial').progress, NEED + 22);
    life.player.yearActions = {};
    if (passageBlocker(life, 'martial') !== null) continue;

    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne trois pratiques tenues avec un passage ouvert');
}

const state = pratiqueLife();
process.stdout.write(JSON.stringify(state));
