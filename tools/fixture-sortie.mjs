/**
 * Fabrique une sauvegarde arrêtée devant quelqu'un qu'on ne connaît pas
 * encore, et l'écrit sur la sortie standard.
 *
 * Pourquoi un fixture : une vie prise au hasard est soit déjà mariée depuis
 * vingt ans — auquel cas les cinq traits sont connus et la découverte n'a
 * plus rien à montrer —, soit seule et sans personne à emmener où que ce
 * soit. On veut l'état exact qui rend le système visible : un béguin dont on
 * ne sait rien, et de quoi payer une soirée.
 *
 * Rien n'est posé à la main : la rencontre passe par `meetRomanticProspect`,
 * exactement comme une sortie ou une application dans une vraie partie.
 *
 *   node --experimental-strip-types tools/fixture-sortie.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import {
  isRomanticallyCompatible, meetRomanticProspect,
} from '../src/systems/relationships.ts';
import { unknownTraits } from '../src/systems/dates.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function courtingLife() {
  for (let seed = 30_000; seed < 32_000; seed++) {
    const life = createNewLife({ seed });
    play(life, 27);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    // De quoi payer n'importe lequel des huit endroits : sinon la moitié de
    // la liste s'afficherait grisée et l'on ne verrait pas le choix.
    if (life.player.money < 8_000) continue;

    const who = meetRomanticProspect(createCtx(life), 0.75);
    if (!isRomanticallyCompatible(life.player.sex, life.player.orientation, who)) continue;
    // On ne sait rien de cette personne : c'est tout l'objet de l'écran.
    if (unknownTraits(who).length < 5) continue;
    // Assez proche pour qu'elle accepte de sortir, pas assez pour être en
    // couple — l'état où la découverte a le plus d'enjeu.
    who.relationship = Math.max(who.relationship, 48);

    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne un adulte devant quelqu’un à découvrir');
}

const state = courtingLife();
process.stdout.write(JSON.stringify(state));
