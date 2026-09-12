/**
 * Fabrique une sauvegarde de quelqu'un qui porte déjà une cargaison.
 *
 * Pourquoi : l'écran de la route ne montre l'essentiel — ce qu'on porte, ce
 * que ça vaudrait ailleurs, la probabilité d'être contrôlé — qu'une fois qu'il
 * y a quelque chose sur les bras. Une vie tirée au hasard arrive à l'écran les
 * mains vides et n'en montre que la moitié.
 *
 * Rien n'est truqué : l'achat passe par `stock`, et la marchandise choisie est
 * celle qui paie le mieux au départ d'ici. On ne pose ni prix, ni cargaison, ni
 * chaleur à la main.
 *
 *   node --experimental-strip-types tools/fixture-route.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { GOODS } from '../src/data/route.ts';
import { REGION_ARCHETYPES } from '../src/data/regions.ts';
import {
  costHere, empty, hereId, mostAffordable, priceAt, stock,
} from '../src/systems/route.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver && life.player.alive; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

/** La meilleure marge par unité d'encombrement, au départ d'ici. */
function bestRoute(life) {
  let best = null;
  for (const good of GOODS) {
    const unit = costHere(life, good.id);
    for (const region of REGION_ARCHETYPES) {
      if (region.id === hereId(life)) continue;
      const perBulk = (priceAt(life, region.id, good.id) - unit) / good.bulk;
      if (!best || perBulk > best.perBulk) best = { good, to: region.id, perBulk };
    }
  }
  return best;
}

function carrierLife() {
  for (let seed = 61_000; seed < 61_400; seed++) {
    const life = createNewLife({ seed });
    play(life, 30);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    // De quoi acheter : ce qu'on veut montrer est la décision, pas la
    // probabilité d'avoir les moyens un jour.
    life.player.money = 80_000 * life.world.inflation;
    const best = bestRoute(life);
    if (!best || best.perBulk <= 0) continue;

    // Une demi-charge : assez pour que l'écran ait quelque chose à dire, pas
    // assez pour que le contrôle soit certain.
    const take = Math.floor(mostAffordable(life, best.good.id) * 0.5);
    if (take <= 0) continue;
    if (!stock(createCtx(life), best.good.id, take).ok) continue;
    if (empty(life)) continue;

    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne un porteur avec une cargaison');
}

const state = carrierLife();
process.stdout.write(JSON.stringify(state));
