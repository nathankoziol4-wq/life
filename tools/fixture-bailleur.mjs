/**
 * Fabrique une sauvegarde de bailleur : quelqu'un qui possède un logement
 * qu'il n'habite pas, avec un locataire dedans.
 *
 * Pourquoi : posséder deux logements demande une vie entière et beaucoup de
 * chance. Sans cette partie fabriquée, l'écran de gestion locative n'aurait
 * jamais été ouvert dans un vrai navigateur, et le chemin annonce → dossiers
 * → bail → travaux ne serait jamais parcouru.
 *
 * Rien n'est truqué : l'achat passe par `buyProperty`, l'annonce par
 * `listForRent` et le bail par `acceptTenant`. On ne pose ni locataire, ni
 * loyer, ni impayé à la main.
 *
 *   node --experimental-strip-types tools/fixture-bailleur.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { buyProperty } from '../src/systems/properties.ts';
import { acceptTenant, listForRent } from '../src/systems/tenancy.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver && life.player.alive; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function landlordLife() {
  for (let seed = 48_000; seed < 48_400; seed++) {
    const life = createNewLife({ seed });
    play(life, 36);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    // Le patrimoine d'un propriétaire de deux logements : on le pose, parce
    // que ce qu'on veut montrer est la gestion locative, pas la probabilité
    // d'y arriver. Tout le reste passe par le moteur.
    life.player.money = 2_400_000 * life.world.inflation;
    let bought = 0;
    for (let i = 0; i < 2; i++) {
      const listing = life.world.propertyListings[0];
      if (!listing) break;
      if (buyProperty(createCtx(life), listing.id, 'cash').ok) bought += 1;
    }
    if (bought < 2) continue;

    const rental = life.player.properties.find((x) => !x.isResidence);
    if (!rental) continue;
    if (!listForRent(createCtx(life), rental.id).ok) continue;
    if (rental.applicants.length === 0) continue;
    acceptTenant(createCtx(life), rental.id, rental.applicants[0].id);
    if (!rental.tenancy) continue;

    // Quelques années de bail : c'est là qu'apparaissent l'usure, les
    // demandes de travaux et les éventuels impayés.
    play(life, 5);
    if (life.gameOver || !life.player.alive) continue;
    const still = life.player.properties.find((x) => x.tenancy);
    if (!still) continue;
    life.player.yearActions = {};
    return life;
  }
  throw new Error('aucune graine ne donne un bailleur avec locataire');
}

const state = landlordLife();
process.stdout.write(JSON.stringify(state));
