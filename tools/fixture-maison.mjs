/**
 * Fabrique une sauvegarde d'un patron avec sa maison à tenir.
 *
 * Pourquoi : diriger n'existe qu'au rang cinq, qu'une partie prise au hasard
 * n'atteint jamais — il faut des années de missions et une criminalité qu'un
 * personnage ordinaire n'a pas. Trois conditions, et la troisième est celle
 * qui rend l'écran lisible :
 *
 *   1. **le rang de patron**, sans quoi l'écran ne montre que « ce n'est pas
 *      toi qui décides » ;
 *   2. **de l'emprise à défendre**, parce qu'une maison à zéro ne rapporte
 *      rien et que les trois postes se ressembleraient tous ;
 *   3. **plus de gens que de postes**, pour qu'il en reste dehors — c'est
 *      tout le sujet, et avec trois personnes pour trois postes il n'y aurait
 *      rien à arbitrer.
 *
 * Le rang est posé à la main : l'atteindre en jouant demanderait des dizaines
 * de missions réussies, et ce n'est pas ce que le parcours vérifie ici.
 *
 *   node --experimental-strip-types tools/fixture-maison.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createPerson } from '../src/systems/npc.ts';
import { joinOrganization, orgOf } from '../src/systems/underworld.ts';
import { assign, fitFor } from '../src/systems/house.ts';

function bossLife() {
  for (let seed = 30_000; seed < 34_000; seed++) {
    const life = createNewLife({ seed });
    for (let year = 0; year < 34 && !life.gameOver; year++) simulateYear(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.age < 32) continue;

    life.player.stats.criminality = 92;
    life.player.criminalRecord.notoriety = 82;
    if (!joinOrganization(createCtx(life)).ok) continue;
    const org = orgOf(life);
    if (!org) continue;

    org.rank = 5;
    org.respect = 74;
    org.territory = 52;

    // Condition 3 : cinq personnes pour trois postes.
    for (let i = 0; i < 5; i++) {
      const person = createPerson(createCtx(life), { relation: 'acquaintance', age: 28 + i * 5 });
      person.flags.underworld = true;
    }

    // Un poste déjà tenu et deux vides : l'écran montre alors les deux états,
    // et la ligne « vide » dit ce qu'elle coûte plutôt que d'être un oubli.
    const crowd = Object.values(life.npcs).filter((n) => n.flags.underworld);
    const best = [...crowd].sort((a, b) => fitFor(b, 'caisse') - fitFor(a, 'caisse'))[0];
    if (!best) continue;
    assign(createCtx(life), 'caisse', best.id);

    life.player.money = Math.max(life.player.money, 250_000);
    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne un patron avec ses gens');
}

const state = bossLife();
process.stdout.write(JSON.stringify(state));
