/**
 * Fabrique une sauvegarde de quelqu'un que ça tient, et l'écrit sur la sortie
 * standard.
 *
 * Pourquoi un fixture : une vie prise au hasard ne joue jamais — le pic de
 * dépendance sur quatre-vingt-dix vies jouées par le pilote automatique est
 * de 22, très en dessous du premier seuil que le moteur lit. L'écran « se
 * relever » ne s'ouvrirait donc que sur son état vide, et c'est exactement
 * l'état vide qui a caché les défauts d'affichage précédents de ce projet.
 *
 * Rien n'est posé à la main : la dépendance monte en s'asseyant à la table,
 * comme dans une vraie partie, et elle monte vite — c'est la mesure qui a
 * commandé tout ce chantier.
 *
 *   node --experimental-strip-types tools/fixture-dependance.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { autoTable } from '../src/systems/activities.ts';
import { DEEP, couldTell, gripOf } from '../src/systems/recovery.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function sunkLife() {
  for (let seed = 50_000; seed < 52_000; seed++) {
    const life = createNewLife({ seed });
    play(life, 26);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    // De quoi payer n'importe lequel des quatre programmes : sinon la moitié
    // de la liste s'afficherait grisée et le choix ne se verrait pas.
    if (life.player.money < 60_000) continue;

    for (let year = 0; year < 8 && life.player.alive && life.player.stats.addiction < DEEP + 12; year++) {
      for (let i = 0; i < 5; i++) autoTable(createCtx(life), 200);
      play(life, 1);
    }
    if (!life.player.alive || life.gameOver) continue;
    if (gripOf(life) !== 'enfoncé') continue;
    // Il faut quelqu'un à qui le dire : sans cela le groupe de parole reste
    // fermé et la moitié de l'écran ne se joue pas.
    if (couldTell(life).length === 0) continue;
    if (life.player.money < 60_000) continue;

    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne quelqu’un que ça tient, avec de quoi en sortir');
}

const state = sunkLife();
process.stdout.write(JSON.stringify(state));
