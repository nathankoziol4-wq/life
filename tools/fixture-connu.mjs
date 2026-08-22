/**
 * Fabrique une sauvegarde de quelqu'un de connu, avec une affaire sur les bras.
 *
 * Pourquoi : la notoriété se construit sur des décennies, et une vie ordinaire
 * n'atteint jamais le seuil où l'écran a quelque chose à montrer. Sans cette
 * partie fabriquée, on ne photographierait que « Personne ne sait qui tu es »,
 * et ni l'entretien ni la gestion d'affaire ne seraient jamais ouverts dans un
 * vrai navigateur.
 *
 * Rien n'est truqué : la notoriété est produite par `advanceFame` à partir de
 * ce qui la produit vraiment — une audience et un métier qui expose. On ne
 * pose ni le niveau, ni la controverse, ni l'affaire à la main.
 *
 *   node --experimental-strip-types tools/fixture-connu.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { NETWORKS, SUBJECTS } from '../src/data/networks.ts';
import { appetiteFor, postBlocker, publish } from '../src/systems/social.ts';
import { openScandal } from '../src/systems/fame.ts';

/**
 * Une année de quelqu'un qui a compris son public.
 *
 * On tourne sur les quatre maisons et l'on donne à chacune ce qu'elle préfère
 * — exactement ce que le jeu demande d'apprendre. Rien n'est posé à la main :
 * les abonnés sortent de `publish`, avec sa lassitude et ses retournements.
 */
function postYear(life) {
  for (const network of NETWORKS) {
    if (postBlocker(life, network)) continue;
    const best = [...SUBJECTS].sort(
      (a, b) => appetiteFor(life, network.id, b.id) - appetiteFor(life, network.id, a.id),
    )[0];
    publish(createCtx(life), network.id, best.id);
  }
}

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function famousLife() {
  for (let seed = 64_000; seed < 64_800; seed++) {
    const life = createNewLife({ seed });
    play(life, 24);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    // Vingt ans à publier : c'est le seul chemin vers la notoriété qui ne
    // dépende pas d'avoir décroché un métier rare, et il passe par la vraie
    // fonction du jeu.
    for (let year = 0; year < 22 && !life.gameOver && life.player.alive; year++) {
      postYear(life);
      play(life, 1);
    }
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    // On veut un niveau où plusieurs apparitions sont ouvertes, et de quoi
    // remplir un entretien.
    if (life.player.fame.level < 30) continue;
    // Une affaire en cours, pour que l'écran montre aussi ce moment-là. Elle
    // arrive d'elle-même à ce niveau d'exposition ; on laisse le temps passer
    // jusqu'à ce qu'elle tombe, sans jamais la poser.
    for (let year = 0; year < 8 && !openScandal(life) && !life.gameOver; year++) {
      postYear(life);
      play(life, 1);
    }
    if (life.gameOver || !life.player.alive) continue;
    if (life.player.fame.level < 25) continue;
    return life;
  }
  throw new Error('aucune graine ne donne quelqu’un de suffisamment connu');
}

const state = famousLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
