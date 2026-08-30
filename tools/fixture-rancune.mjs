/**
 * Fabrique une sauvegarde où quelqu'un vous en veut vraiment.
 *
 * Pourquoi : une inimitié se fabrique par les actes du joueur, et une partie
 * jouée par l'auto-joueur n'en produit aucune — mesuré, 0 % des vies. L'écran
 * qui la montre, et surtout les excuses qui la réparent, ne seraient donc
 * jamais photographiés.
 *
 * Rien n'est posé à la main : la rancune vient d'insultes réellement jouées
 * par `interact`, la même fonction que presse le joueur, et le temps qui
 * passe est du vrai temps de jeu.
 *
 *   node --experimental-strip-types tools/fixture-rancune.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { interact } from '../src/systems/relationships.ts';
import { grudgeOf, hostile } from '../src/systems/grudges.ts';

function play(life, years) {
  for (let y = 0; y < years && !life.gameOver; y++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
  }
}

function rancuneLife() {
  for (let seed = 30_000; seed < 32_000; seed++) {
    const life = autoplayLife(seed, { maxYears: 30 });
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    // Quelqu'un d'assez proche pour être sur l'écran, et qu'on va se mettre
    // à dos par des gestes que le joueur peut réellement poser.
    const cible = Object.values(life.npcs).find(
      (n) => n.alive && !n.petSpecies
        && ['friend', 'bestFriend', 'brother', 'sister', 'cousin'].includes(n.relation),
    );
    if (!cible) continue;

    for (let year = 0; year < 6 && !hostile(cible); year++) {
      life.player.yearActions = {};
      cible.interactionsThisYear = 0;
      for (let i = 0; i < 3; i++) interact(createCtx(life), cible.id, 'insult');
      play(life, 1);
    }
    if (!hostile(cible)) continue;

    // Quelques années passent : la rancune tient, et les excuses deviennent
    // audibles. C'est cet état-là qu'il faut voir.
    play(life, 5);
    if (life.gameOver || !life.player.alive) continue;
    if (grudgeOf(cible) < 30) continue;

    delete cible.flags.sorryYear;
    delete cible.flags.sorryTried;
    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne une inimitié durable');
}

const state = rancuneLife();
process.stdout.write(JSON.stringify(state));
