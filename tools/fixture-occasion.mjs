/**
 * Fabrique une sauvegarde arrêtée juste devant une occasion.
 *
 * Pourquoi un fixture : une occasion se présente à l'année où elle tombe,
 * puis se résout et disparaît. Le fumigène joue les années à la chaîne en
 * soldant toutes les modales au passage — il traverserait donc les occasions
 * sans jamais en photographier une. On veut l'inverse : une partie qui
 * *s'ouvre* sur la scène, modale à l'écran, choix visibles.
 *
 * On veut aussi que le coffre des souvenirs ait quelque chose dedans, sans
 * quoi la section de la collection ne s'afficherait qu'à l'état vide — et
 * c'est précisément l'état vide qui a caché trois défauts d'affichage dans ce
 * projet (la haie invisible, le panneau de la couronne jamais ouvert, la
 * section d'éducation jamais atteinte).
 *
 * Rien n'est posé à la main : les souvenirs viennent des occasions réellement
 * traversées pendant les années jouées, et la scène finale sort de
 * `rollOccasion` comme n'importe quelle autre.
 *
 *   node --experimental-strip-types tools/fixture-occasion.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { offerOccasion, rollOccasion } from '../src/systems/occasions.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    // Le premier choix : c'est celui qui garde un souvenir dans la plupart
    // des occasions, et il est de toute façon celui que solderait le fumigène.
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function occasionLife() {
  for (let seed = 60_000; seed < 62_000; seed++) {
    const life = createNewLife({ seed });
    play(life, 34);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    // Une occasion payante ne s'affiche que si elle reste une petite part de
    // ce qu'on a : sans un peu d'argent, la scène n'aurait qu'une seule ligne.
    if (life.player.money < 40_000) continue;
    if ((life.player.keepsakes?.length ?? 0) < 2) continue;

    // La scène qu'on veut voir à l'ouverture. `rollOccasion` peut ne rien
    // rendre une année donnée — c'est son travail —, alors on lui laisse
    // quelques années, en les jouant vraiment.
    for (let tries = 0; tries < 12; tries++) {
      const occasion = rollOccasion(createCtx(life));
      if (occasion) {
        offerOccasion(createCtx(life), occasion);
        life.player.yearActions = {};
        return life;
      }
      play(life, 1);
      if (life.gameOver || !life.player.alive) break;
    }
  }
  throw new Error('aucune graine ne donne une vie avec des souvenirs et une occasion à venir');
}

const state = occasionLife();
process.stdout.write(JSON.stringify(state));
