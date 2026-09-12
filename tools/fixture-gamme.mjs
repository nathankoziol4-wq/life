/**
 * Fabrique une sauvegarde de patron dont la maison vend déjà quelque chose.
 *
 * Pourquoi : l'écran ne montre l'essentiel — une chose au sommet, une chose qui
 * s'essouffle, et ce que chaque forme sortirait avec les gens qu'on a — qu'à
 * condition d'avoir une gamme déjà entamée. Une vie tirée au hasard arrive
 * rarement avec une entreprise, et jamais avec un catalogue.
 *
 * Rien n'est truqué : l'entreprise passe par `foundBusiness`, l'équipe par
 * `offer` de `crew.ts`, et les choses par `launch`. Seuls le renom, la qualité
 * et la trésorerie sont posés — sans demande, la gamme n'a rien à faire venir
 * et l'écran montrerait des chiffres que personne n'aurait de raison de lire.
 *
 *   node --experimental-strip-types tools/fixture-gamme.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { foundBusiness } from '../src/systems/venture.ts';
import { offer, openShortlist } from '../src/systems/crew.ts';
import { advanceLine, launch, lineOf } from '../src/systems/offer.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver && life.player.alive; year += 1) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function bossLife() {
  for (let seed = 73_000; seed < 73_400; seed += 1) {
    const life = createNewLife({ seed });
    play(life, 32);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    life.player.money = 900_000 * life.world.inflation;
    life.player.business = null;
    if (!foundBusiness(createCtx(life), 'cafe').ok) continue;
    const b = life.player.business;
    if (!b) continue;
    b.cash = 700_000 * life.world.inflation;
    b.renown = 70;
    b.quality = 72;

    // Des bras : sans eux les formes exigeantes sortiraient à cinq, et l'écran
    // ne montrerait que des lignes qu'aucun joueur ne prendrait.
    openShortlist(createCtx(life), b);
    for (const who of (b.shortlist ?? []).slice(0, 3)) {
      offer(createCtx(life), b, who.personId, who.asking);
    }
    if ((b.crew ?? []).length < 2) continue;

    /*
     * Deux choses, à deux âges : une qui a passé son sommet et une qui monte
     * encore. C'est le contraste que l'écran doit rendre lisible — sans lui, la
     * jauge de phase afficherait deux fois la même chose.
     */
    b.developedYear = undefined;
    if (!launch(createCtx(life), 'fond').ok) continue;
    for (let i = 0; i < 14; i += 1) advanceLine(b);
    b.developedYear = undefined;
    if (!launch(createCtx(life), 'signature').ok) continue;
    advanceLine(b);
    advanceLine(b);
    b.developedYear = undefined;

    if (lineOf(b).length !== 2) continue;
    // On remet de quoi en lancer une : les deux mises au point ont vidé la
    // caisse, et un écran dont les quatre formes sont fermées faute d'argent ne
    // montre pas ce qu'on veut montrer.
    b.cash = 400_000 * life.world.inflation;
    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne un patron avec une gamme entamée');
}

const state = bossLife();
process.stdout.write(JSON.stringify(state));
