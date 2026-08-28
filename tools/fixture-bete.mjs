/**
 * Fabrique une sauvegarde de quelqu'un qui vit avec un chien depuis six ans.
 *
 * Pourquoi : un chien du refuge arrive fermé (ouverture 21 sur 100) et il faut
 * plusieurs années de moments pour l'atteindre. Sans partie fabriquée, la
 * marche de contrôle n'aurait jamais vu qu'un animal tout juste adopté — donc
 * jamais le lien, jamais le dressage, jamais ce que l'attention achète.
 *
 * Rien n'est truqué : l'adoption passe par `adoptPetSpecies` et chaque moment
 * par `spendMoment`. On ne pose ni lien, ni dressage, ni contentement à la
 * main.
 *
 *   node --experimental-strip-types tools/fixture-bete.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { adoptPetSpecies } from '../src/systems/activities.ts';
import { spendMoment, wants } from '../src/systems/beast.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver && life.player.alive; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

/** Une année de moments, dépensés là où la bête en a besoin. */
function tend(life, petId) {
  for (let guard = 0; guard < 8; guard++) {
    const pet = life.player.pets.find((x) => x.id === petId);
    if (!pet) return;
    if (!spendMoment(createCtx(life), petId, wants(pet)).ok) return;
  }
}

function keeperLife() {
  for (let seed = 52_000; seed < 52_400; seed++) {
    const life = createNewLife({ seed });
    play(life, 30);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    // De quoi payer le chien et son entretien : ce qu'on veut montrer est ce
    // qu'on en fait, pas la probabilité d'avoir les moyens.
    life.player.money = 60_000 * life.world.inflation;
    life.player.pets = [];
    if (!adoptPetSpecies(createCtx(life), 'dog', false, 'refuge').ok) continue;
    const petId = life.player.pets[0]?.id;
    if (!petId) continue;

    // Six ans de moments : assez pour atteindre une bête de refuge, la
    // dresser un peu, et donner quelque chose à lire à l'écran.
    for (let year = 0; year < 6; year++) {
      if (life.gameOver || !life.player.alive) break;
      if (!life.player.pets.some((x) => x.id === petId)) break;
      tend(life, petId);
      play(life, 1);
    }
    const still = life.player.pets.find((x) => x.id === petId);
    if (!still || (still.bond ?? 0) < 40) continue;
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne quelqu’un attaché à son chien');
}

const state = keeperLife();
process.stdout.write(JSON.stringify(state));
