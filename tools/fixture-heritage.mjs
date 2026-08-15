/**
 * Fabrique une sauvegarde d'une famille qui a gardé des choses.
 *
 * Pourquoi : un objet de famille ne se voit qu'avec le temps. Il faut le
 * trouver, le tenir des décennies, le faire passer à un héritier, et
 * recommencer — sinon l'écran ne montre qu'un objet acheté hier, ce qui est
 * exactement ce que ce système n'est pas.
 *
 * Rien n'est posé à la main : les objets sortent de `settleSearch`, leur âge
 * vient du temps réellement écoulé, et leur transmission de `continueAs` —
 * c'est-à-dire des mêmes fonctions que joue le joueur.
 *
 *   node --experimental-strip-types tools/fixture-heritage.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import {
  autoSearch, restore, restoreBlocker, searchBlocker,
} from '../src/systems/heirlooms.ts';
import { canContinue, continueAs, heirsOf } from '../src/systems/lineage.ts';
import { deliverBaby, marry, meetRomanticProspect } from '../src/systems/relationships.ts';
import { killPlayer } from '../src/engine/simulateYear.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    life.player.yearActions = {};
    // On monte au grenier dès qu'on peut : c'est l'action du joueur.
    if (!searchBlocker(life)) autoSearch(createCtx(life));
    // Et l'on entretient ce qu'on a, quand on en a les moyens.
    for (const item of life.player.heirlooms) {
      if (item.condition < 45 && !restoreBlocker(life, item)) {
        restore(createCtx(life), item.id);
      }
    }
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

/**
 * Fait une génération : on grandit en fouillant le grenier, on fonde une
 * famille, on vieillit, et l'on transmet.
 *
 * Se marier et avoir des enfants sont des actions du joueur : une vie laissée
 * à elle-même n'a presque jamais d'héritier, et sans héritier rien ne se
 * transmet. C'est ce que fait un joueur, pas une facilité de fabrication.
 */
function oneGeneration(life) {
  play(life, Math.max(1, 27 - life.player.age));
  if (life.gameOver || !life.player.alive) return false;
  const ctx = createCtx(life);
  const prospect = meetRomanticProspect(ctx, 72);
  if (prospect) marry(ctx, prospect);
  for (let child = 0; child < 2; child++) {
    deliverBaby(createCtx(life));
    play(life, 3);
    if (life.gameOver || !life.player.alive) return false;
  }
  play(life, 45);
  if (life.player.alive) killPlayer(createCtx(life), 'de vieillesse');
  if (!canContinue(life)) return false;
  const heirs = heirsOf(life);
  if (heirs.length === 0) return false;
  continueAs(life, heirs[0].person.id);
  return true;
}

function dynastyLife() {
  for (let seed = 30_000; seed < 31_200; seed++) {
    const life = createNewLife({ seed });
    let generations = 0;
    // Trois vies d'affilée : c'est le temps qu'il faut pour qu'un objet
    // dépasse le siècle et porte plusieurs noms.
    for (let g = 0; g < 3; g++) {
      if (!oneGeneration(life)) break;
      generations += 1;
      if (life.player.heirlooms.length === 0) break;
    }
    if (life.gameOver || !life.player.alive) continue;
    if (generations < 2) continue;
    const items = life.player.heirlooms;
    if (items.length < 2) continue;
    // Il faut au moins un objet qui ait vraiment traversé.
    const oldest = Math.max(...items.map((h) => life.year - h.since));
    if (oldest < 80) continue;
    life.player.money = Math.max(life.player.money, 400_000);
    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne une dynastie avec des objets');
}

const state = dynastyLife();
process.stdout.write(JSON.stringify(state));
