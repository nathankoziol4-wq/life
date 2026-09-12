/**
 * Le bailleur décent perd-il de l'argent ?
 *
 * Trois questions :
 *
 *   1. **la tension se lit-elle ?** Elle décidait déjà des impayés sans être
 *      affichée nulle part ; si elle ne se distribue pas, il n'y a rien à
 *      apprendre en parlant ;
 *   2. **arranger rapporte-t-il, à terme ?** La bonne volonté pèse sur les
 *      impayés : si le geste ne se rembourse jamais, « décent » n'est qu'une
 *      taxe volontaire ;
 *   3. **et pas trop ?** Si arranger rapporte tout de suite et sans risque,
 *      il n'y a pas d'arbitrage, juste un bouton à cliquer.
 *
 *   node --experimental-strip-types tools/measure-locataire.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createPerson } from '../src/systems/npc.ts';
import { advanceTenancy } from '../src/systems/tenancy.ts';
import { arrange, strainOf, talkToTenant } from '../src/systems/tenant.ts';

/** Un bailleur avec un locataire dont on fixe la tension. */
function landlord(seed, { salary, rent, goodwill = 50, arrears = 0 }) {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;

  const npc = createPerson(createCtx(state), { relation: 'acquaintance', age: 34 });
  npc.salary = salary;
  npc.flags.tenantOf = 'bien';
  state.player.properties = [{
    id: 'bien', archetypeId: 'flat', name: 'Le deux-pièces', cityName: 'Ville',
    countryId: state.player.countryId, purchasePrice: 180_000, purchaseYear: state.year - 6,
    value: 200_000, condition: 70, areaM2: 48, mortgageBalance: 0, annualPayment: 0,
    mortgageYearsLeft: 0, interestRate: 0, annualCost: 1_400, isResidence: false,
    rentedOut: true, annualRentIncome: rent, askingRent: rent, vacantYears: 0,
    applicants: [], repair: null,
    tenancy: {
      personId: npc.id, since: state.year - 2, rent, arrears,
      care: 55, goodwill, yearsLeft: 6, noticeYear: null,
    },
  }];
  state.player.yearActions = {};
  return state;
}

const pad = (x, n) => String(x).padStart(n);

/* 1. La tension se distribue-t-elle ? */
console.log('Ce que le loyer pèse, selon ce qu’il gagne (loyer 12 000) :');
for (const salary of [18_000, 28_000, 40_000, 60_000, 100_000]) {
  const state = landlord(3, { salary, rent: 12_000 });
  if (!state) continue;
  const strain = strainOf(state, state.player.properties[0]);
  const said = talkToTenant(createCtx(state), 'bien');
  console.log(`  salaire ${pad(salary, 7)} : tension ${strain.toFixed(2)} — ${said.message}`);
}

/* 2 et 3. Ce que la décence coûte et rapporte, sur quinze ans. */
console.log('');
console.log('Encaissé sur quinze ans, même locataire tendu (salaire 26 000, loyer 13 000) :');
console.log('bailleur              | encaissé | arriéré final | bonne volonté | parti');

const RUNS = [
  { id: 'strict', act: () => {} },
  { id: 'parle seulement', act: (s, ctx) => { talkToTenant(ctx(), 'bien'); } },
  { id: 'étale', act: (s, ctx) => { talkToTenant(ctx(), 'bien'); arrange(ctx(), 'bien', 'etaler'); } },
  { id: 'baisse le loyer', act: (s, ctx, i) => { if (i === 0) arrange(ctx(), 'bien', 'baisser'); } },
  { id: 'efface l’ardoise', act: (s, ctx) => { talkToTenant(ctx(), 'bien'); arrange(ctx(), 'bien', 'effacer'); } },
];

for (const run of RUNS) {
  let money = 0;
  let arrears = 0;
  let goodwill = 0;
  let left = 0;
  const N = 40;
  for (let seed = 0; seed < N; seed++) {
    const state = landlord(seed * 97 + 11, { salary: 26_000, rent: 13_000, arrears: 2_500 });
    if (!state) continue;
    const ctx = () => createCtx(state);
    for (let year = 0; year < 15; year++) {
      const prop = state.player.properties[0];
      if (!prop?.tenancy) break;
      state.player.yearActions = {};
      run.act(state, ctx, year);
      const before = state.player.money;
      state.year += 1;
      advanceTenancy(ctx(), prop);
      money += state.player.money - before;
    }
    const prop = state.player.properties[0];
    if (prop?.tenancy) {
      arrears += prop.tenancy.arrears;
      goodwill += prop.tenancy.goodwill;
    } else left += 1;
  }
  const kept = N - left;
  console.log(
    `${run.id.padEnd(21)} | ${pad(Math.round(money / N), 8)} | ${pad(Math.round(arrears / Math.max(1, kept)), 13)}`
    + ` | ${pad(Math.round(goodwill / Math.max(1, kept)), 13)} | ${pad(left, 5)}/${N}`,
  );
}
