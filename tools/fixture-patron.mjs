/**
 * Fabrique une sauvegarde de patron : quelqu'un qui a ouvert une maison, l'a
 * tenue plusieurs exercices, et dont l'écran d'entreprise a donc quelque
 * chose à montrer.
 *
 * Pourquoi : le test de fumée joue une vie ordinaire, et une vie ordinaire à
 * vingt-deux ans n'a ni les 30 000 d'apport ni les années d'exercices que le
 * panneau affiche. Sans cette partie fabriquée, on ne photographierait jamais
 * que le catalogue grisé — c'est-à-dire l'exact contraire de ce qu'on veut
 * vérifier.
 *
 * Rien n'est truqué : on joue des vies entières avec le vrai moteur, on ouvre
 * l'entreprise par `foundBusiness` comme le ferait le joueur, et on la fait
 * tourner par `simulateYear`. Les décisions annuelles — effectif, prix —
 * suivent la même règle que celle affichée à l'écran : on comble l'écart
 * entre capacité et demande.
 *
 *   node --experimental-strip-types tools/fixture-patron.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import {
  availableBusinesses, forecast, foundBusiness, hireStaff, startFreelance,
} from '../src/systems/venture.ts';
import { availableTrades } from '../src/systems/venture.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function bossLife() {
  for (let seed = 72_000; seed < 72_600; seed++) {
    const life = createNewLife({ seed });
    play(life, 38);
    if (life.gameOver || !life.player.alive) continue;
    if (life.player.prison || life.player.criminalRecord.wanted) continue;

    // On veut la maison la plus ambitieuse que cette vie-là peut financer.
    const open = availableBusinesses(life);
    if (open.length === 0) continue;
    const kind = open.reduce((a, k) => (k.capital > a.capital ? k : a));
    if (!foundBusiness(createCtx(life), kind.id).ok) continue;

    // Un métier à côté, pour que l'autre onglet ne soit pas vide non plus.
    const trades = availableTrades(life);
    if (trades.length > 0) startFreelance(createCtx(life), trades[0].id);

    // Quelques exercices, en embauchant quand la demande dépasse ce que la
    // maison peut servir — exactement l'arbitrage que l'écran met en avant.
    for (let year = 0; year < 6 && life.player.business && !life.gameOver; year++) {
      const view = forecast(life);
      if (view.demand > view.capacity * 1.25) hireStaff(createCtx(life), 1);
      play(life, 1);
    }
    if (!life.player.business || life.gameOver || !life.player.alive) continue;
    if (life.player.business.history.length < 3) continue;
    return life;
  }
  throw new Error('aucune graine ne donne un patron avec plusieurs exercices');
}

const state = bossLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
