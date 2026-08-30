/**
 * Fabrique une sauvegarde de quelqu'un qui a chiné, et l'écrit sur la sortie
 * standard.
 *
 * Pourquoi un fixture : chiner ne rapporte quelque chose qu'une fois sur
 * trois, et il faut de quoi payer la sortie *puis* la pièce. Une vie prise au
 * hasard n'a donc rien dans ses affaires — c'est d'ailleurs ce que la mesure
 * disait avant d'écrire le système : **0 % des vies jouées possédaient le
 * moindre objet**. Le fumigène traverserait « Mes possessions » sur une liste
 * vide, et l'état vide est exactement ce qui a caché les défauts d'affichage
 * précédents de ce projet.
 *
 * Rien n'est posé à la main : l'argent vient d'une vie réellement jouée, et
 * les objets sortent de `hunt` comme ils sortiraient d'une partie — avec leur
 * provenance, leur doute, et la chance de tomber sur une copie.
 *
 *   node --experimental-strip-types tools/fixture-chine.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { hunt } from '../src/systems/objects.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

/** Une vie qui a de quoi écumer les brocantes pendant quelques années. */
function moneyedLife() {
  for (let seed = 91_000; seed < 91_600; seed++) {
    const life = createNewLife({ seed });
    play(life, 45);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    // Large : chiner coûte la sortie *puis* la pièce, et une vie trop juste
    // dépose le bilan l'année suivante — auquel cas `declareBankruptcy`
    // liquide les objets et le fumigène retrouverait une liste vide.
    if (life.player.money < 150_000) continue;
    return life;
  }
  throw new Error('aucune graine ne donne un adulte avec de quoi chiner');
}

const state = moneyedLife();

// On chine pour de vrai, année après année : deux sorties par an, c'est la
// limite du système. On s'arrête dès qu'il y a de quoi montrer une liste et
// un ensemble en cours.
for (let year = 0; year < 20 && state.player.valuables.length < 3; year++) {
  const ctx = createCtx(state);
  hunt(ctx, 'brocante');
  hunt(ctx, 'brocante');
  if (state.player.valuables.length >= 3) break;
  play(state, 1);
  if (state.gameOver || !state.player.alive) throw new Error('la vie s’est arrêtée en chemin');
}

if (state.player.valuables.length === 0) throw new Error('rien de rapporté');
state.player.yearActions = {};
state.pending = [];
process.stdout.write(JSON.stringify(state));
