/**
 * Fabrique une sauvegarde de fondateur dont le cercle a déjà dérivé.
 *
 * Pourquoi : l'écran ne montre l'essentiel — les deux versants qui ont monté
 * sans qu'on les règle, le plafond d'autorité que la taille autorise, la caisse
 * qui s'est remplie — qu'à condition d'avoir un cercle déjà vieux de quelques
 * années. Le jour de la fondation, tout est à zéro et il n'y a rien à lire.
 *
 * Rien n'est truqué : le cercle passe par `found` et les années par
 * `advanceCircle`, sans qu'on touche à ce qu'il devient. Seule la réputation
 * est posée — sans elle personne ne suit, et l'écran refuserait de fonder.
 *
 *   node --experimental-strip-types tools/fixture-cercle.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { circleOf, found, foundBlocker, setCare } from '../src/systems/circle.ts';

function year(life) {
  simulateYear(life);
  const ctx = createCtx(life);
  for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
  life.pending = [];
}

function founderLife() {
  for (let seed = 77_000; seed < 77_500; seed += 1) {
    const life = createNewLife({ seed });
    for (let i = 0; i < 28 && !life.gameOver && life.player.alive; i += 1) year(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    life.player.stats.reputation = Math.max(life.player.stats.reputation, 60);
    life.player.money = Math.max(life.player.money, 80_000 * life.world.inflation);
    if (foundBlocker(life, 'veille') !== null) continue;
    if (!found(createCtx(life), 'veille').ok) continue;

    // Douze ans à ne pas s'en occuper : c'est ce qui rend les deux versants
    // lisibles, et ce que l'écran doit raconter.
    setCare(createCtx(life), 'présent');
    for (let i = 0; i < 12 && life.player.alive && circleOf(life); i += 1) year(life);

    const c = circleOf(life);
    if (!c || c.people < 30) continue;
    if (c.inward < 45 && c.fervour < 45) continue;
    c.gestureYear = null;
    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne un cercle déjà dérivé');
}

const state = founderLife();
process.stdout.write(JSON.stringify(state));
