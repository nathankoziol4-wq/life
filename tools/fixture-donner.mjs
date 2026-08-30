/**
 * Fabrique une sauvegarde où il y a quelque chose à donner, et à qui.
 *
 * Pourquoi : l'écran ne dit ce qu'il a à dire que si trois choses sont vraies
 * en même temps, et une partie prise au hasard n'en réunit presque jamais
 * deux :
 *
 *   1. **de l'argent et des biens**, sinon les deux sections sont vides ;
 *   2. **un bien qu'on peut donner et un qu'on ne peut pas** — celui où l'on
 *      habite, celui qu'on doit encore — parce que les deux refus sont des
 *      règles de conception et qu'une liste toute ouverte ne les montrerait
 *      pas ;
 *   3. **des proches de fortunes différentes**, puisque tout le système tient
 *      à ce qu'un même cadeau ne vaut pas la même chose selon à qui il va.
 *
 *   node --experimental-strip-types tools/fixture-donner.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createPerson } from '../src/systems/npc.ts';
import { givables } from '../src/systems/giving.ts';

function givingLife() {
  for (let seed = 20_000; seed < 24_000; seed++) {
    const life = createNewLife({ seed });
    for (let year = 0; year < 36 && !life.gameOver; year++) simulateYear(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.age < 34) continue;

    life.player.money = 240_000;

    // Condition 2 : les trois états d'un bien, côte à côte.
    life.player.properties = [
      {
        id: 'libre', archetypeId: 'flat', name: 'Le deux-pièces du centre',
        cityName: life.player.origin.city.name, countryId: life.player.countryId,
        purchasePrice: 180_000, purchaseYear: life.year - 8, value: 210_000,
        condition: 74, areaM2: 48, mortgageBalance: 0, annualPayment: 0,
        mortgageYearsLeft: 0, interestRate: 0, annualCost: 1_400,
        isResidence: false, rentedOut: false, annualRentIncome: 0, askingRent: 0,
      },
      {
        id: 'credit', archetypeId: 'house', name: 'La maison de campagne',
        cityName: life.player.origin.city.name, countryId: life.player.countryId,
        purchasePrice: 300_000, purchaseYear: life.year - 3, value: 320_000,
        condition: 81, areaM2: 110, mortgageBalance: 190_000, annualPayment: 14_000,
        mortgageYearsLeft: 17, interestRate: 0.03, annualCost: 2_600,
        isResidence: false, rentedOut: false, annualRentIncome: 0, askingRent: 0,
      },
      {
        id: 'chez-toi', archetypeId: 'flat', name: 'Là où tu vis',
        cityName: life.player.origin.city.name, countryId: life.player.countryId,
        purchasePrice: 250_000, purchaseYear: life.year - 12, value: 265_000,
        condition: 70, areaM2: 72, mortgageBalance: 0, annualPayment: 0,
        mortgageYearsLeft: 0, interestRate: 0, annualCost: 1_900,
        isResidence: true, rentedOut: false, annualRentIncome: 0, askingRent: 0,
      },
    ];
    life.player.vehicles = [{
      id: 'auto', modelId: 'berline', brand: 'Verdon', model: 'Sévrier',
      year: life.year - 5, purchasePrice: 26_000, purchaseYear: life.year - 5,
      value: 14_500, mileage: 92_000, condition: 66, insured: true,
      annualCost: 1_100, forSale: false, reliability: 72, broken: false,
    }];

    // Condition 3 : quelqu'un qui n'a rien, quelqu'un qui a tout.
    const poor = createPerson(createCtx(life), { relation: 'friend', age: 38 });
    poor.wealth = 2_000;
    poor.relationship = 72;
    const rich = createPerson(createCtx(life), { relation: 'friend', age: 44 });
    rich.wealth = 3_400_000;
    rich.relationship = 64;

    if (givables(life).filter((g) => !g.blocked).length < 2) continue;
    if (givables(life).filter((g) => g.blocked).length < 2) continue;

    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne un patrimoine contrasté et des proches inégaux');
}

const state = givingLife();
process.stdout.write(JSON.stringify(state));
