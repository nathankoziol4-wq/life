/**
 * Un cadeau vaut-il autre chose que son prix ?
 *
 * Trois questions :
 *
 *   1. **le besoin compte-t-il ?** La même somme doit valoir beaucoup à qui
 *      n'a rien et presque rien à qui a tout — sinon « donner » est un
 *      convertisseur argent → affection à taux fixe ;
 *   2. **le sacrifice compte-t-il ?** Donner ce qu'on ne remarquera pas ne
 *      doit rien dire de soi, sans quoi un joueur riche achète toutes les
 *      relations du jeu en une année ;
 *   3. **peut-on acheter les gens ?** On compare ce qu'un pauvre et un riche
 *      obtiennent en donnant la même part de ce qu'ils ont.
 *
 *   node --experimental-strip-types tools/measure-donner.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { worthTo } from '../src/systems/giving.ts';

const state = createNewLife({ seed: 4242 });
for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);

/** Quelqu'un dont on fixe la fortune, pour mesurer une chose à la fois. */
function someone(wealth) {
  return { firstName: 'X', wealth, alive: true, age: 40 };
}
/** Et un joueur dont on fixe la sienne. */
function asRich(worth) {
  state.player.money = worth;
  state.player.properties = [];
  state.player.vehicles = [];
  state.player.loans = [];
  state.player.portfolio = state.player.portfolio ?? [];
  return state;
}

const pad = (x, n) => String(x).padStart(n);
const fmt = (x) => (x >= 1000 ? `${Math.round(x / 1000)}k` : String(Math.round(x)));

console.log('Ce que 50 000 valent, selon ce que la personne a déjà :');
console.log('  fortune du receveur | points de lien');
asRich(2_000_000);
for (const wealth of [0, 10_000, 50_000, 200_000, 1_000_000, 5_000_000]) {
  const worth = worthTo(state, someone(wealth), 50_000);
  console.log(`  ${pad(fmt(wealth), 19)} | ${worth.toFixed(1)}`);
}

console.log('');
console.log('Ce que la même somme dit de toi, selon ce que tu as :');
console.log('  ta fortune | points de lien pour 50 000 donnés à quelqu’un qui a 50k');
for (const worth of [60_000, 200_000, 1_000_000, 10_000_000]) {
  asRich(worth);
  console.log(`  ${pad(fmt(worth), 10)} | ${worthTo(state, someone(50_000), 50_000).toFixed(1)}`);
}

console.log('');
console.log('Peut-on acheter les gens ? Chacun donne un cinquième de ce qu’il a :');
console.log('  donneur      | somme  | à quelqu’un qui a 20k | à quelqu’un qui a 2M');
for (const worth of [40_000, 400_000, 4_000_000]) {
  asRich(worth);
  const gift = worth * 0.2;
  const poor = worthTo(state, someone(20_000), gift);
  const rich = worthTo(state, someone(2_000_000), gift);
  console.log(`  ${pad(fmt(worth), 12)} | ${pad(fmt(gift), 6)} | ${pad(poor.toFixed(1), 21)} | ${rich.toFixed(1)}`);
}

console.log('');
{
  /* Et le plafond : donner tout ce qu'on a ne doit pas tout emporter. */
  asRich(1_000_000);
  const all = worthTo(state, someone(0), 1_000_000);
  const half = worthTo(state, someone(0), 500_000);
  console.log(`Donner tout à quelqu’un qui n’a rien : ${all.toFixed(1)} points`);
  console.log(`Donner la moitié                    : ${half.toFixed(1)} points`);
  console.log('  Les deux touchent le plafond, et c’est voulu : un seul geste ne');
  console.log('  déplace une relation que jusqu’à un point. Au-delà il faut du temps.');
}
