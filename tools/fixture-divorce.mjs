/**
 * Fabrique une sauvegarde à la veille d'un divorce, avec des enfants.
 *
 * Pourquoi : la procédure n'a d'intérêt qu'avec quelque chose à partager, et
 * une vie jouée par l'auto-joueur est rarement mariée *avec* des enfants
 * mineurs au moment où on la regarde. Sans cette sauvegarde, ni les avocats,
 * ni les postures, ni l'aperçu de garde ne seraient jamais photographiés.
 *
 * Rien n'est posé à la main : le mariage et les naissances passent par
 * `marry` et `deliverBaby`, les mêmes fonctions que joue le joueur.
 *
 *   node --experimental-strip-types tools/fixture-divorce.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { deliverBaby, marry, meetRomanticProspect } from '../src/systems/relationships.ts';
import { childrenAtStake } from '../src/systems/separation.ts';

function play(life, years) {
  for (let y = 0; y < years && !life.gameOver; y++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
  }
}

function divorceLife() {
  for (let seed = 50_000; seed < 52_000; seed++) {
    const life = autoplayLife(seed, { maxYears: 27 });
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (Object.values(life.npcs).some((n) => n.alive && n.relation === 'spouse')) continue;

    const prospect = meetRomanticProspect(createCtx(life), 72);
    if (!prospect) continue;
    marry(createCtx(life), prospect);

    for (const gap of [0, 3]) {
      if (gap) play(life, gap);
      if (life.gameOver || !life.player.alive) break;
      deliverBaby(createCtx(life));
    }
    if (life.gameOver || !life.player.alive) continue;
    play(life, 5);
    if (life.gameOver || !life.player.alive) continue;

    const spouse = Object.values(life.npcs).find((n) => n.alive && n.relation === 'spouse');
    if (!spouse) continue;
    if (childrenAtStake(life).length < 2) continue;

    // De quoi payer n'importe quel avocat : l'écran doit montrer les trois
    // options ouvertes, pas deux lignes grisées.
    life.player.money = Math.max(life.player.money, 300_000);
    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne un marié avec deux enfants mineurs');
}

const state = divorceLife();
process.stdout.write(JSON.stringify(state));
