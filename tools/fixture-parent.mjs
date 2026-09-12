/**
 * Fabrique une sauvegarde de quelqu'un qui a des enfants à élever.
 *
 * Pourquoi : une vie jouée toute seule ne se marie pas et ne fait pas
 * d'enfants — c'est mesuré, une vie non jouée a zéro enfant. L'écran
 * d'éducation ne serait donc jamais photographié qu'à l'état vide, et le
 * défaut d'affichage que seul le navigateur peut montrer passerait inaperçu.
 *
 * Rien n'est posé à la main : le mariage et les naissances passent par
 * `marry` et `deliverBaby`, les mêmes fonctions que joue le joueur. On veut
 * deux enfants en âge d'être élevés — assez grands pour que tous les gestes
 * soient ouverts, assez jeunes pour qu'il reste des années.
 *
 *   node --experimental-strip-types tools/fixture-parent.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { deliverBaby, marry, meetRomanticProspect } from '../src/systems/relationships.ts';
import { raisable } from '../src/systems/upbringing.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function parentLife() {
  for (let seed = 80_000; seed < 82_000; seed++) {
    const life = createNewLife({ seed });
    play(life, 26);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    // `marry` ne renvoie rien : elle marie, point. Le fixture d'héritage
    // l'appelle de la même façon.
    const prospect = meetRomanticProspect(createCtx(life), 74);
    if (!prospect) continue;
    marry(createCtx(life), prospect);

    // Deux enfants, espacés : on veut deux âges différents à l'écran, pour
    // que le joueur voie que chacun a son propre compteur.
    for (const gap of [0, 4]) {
      if (gap) play(life, gap);
      if (life.gameOver || !life.player.alive) break;
      deliverBaby(createCtx(life));
    }
    if (life.gameOver || !life.player.alive) continue;

    // Le temps qu'ils grandissent : à huit ans et plus, tous les gestes sont
    // ouverts, y compris cadrer et transmettre.
    play(life, 9);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    const kids = raisable(life);
    if (kids.length < 2) continue;
    if (!kids.some((k) => k.age >= 8)) continue;
    life.player.money = Math.max(life.player.money, 200_000);
    life.player.yearActions = {};
    for (const kid of kids) if (kid.upbringing) kid.upbringing.doneThisYear = 0;
    return life;
  }
  throw new Error('aucune graine ne donne un parent avec deux enfants à élever');
}

const state = parentLife();
process.stdout.write(JSON.stringify(state));
