/**
 * Emmener quelqu'un vaut-il mieux que de partir seul ?
 *
 * Quatre questions :
 *
 *   1. **l'accord se distribue-t-il ?** S'il vaut la même chose pour tout le
 *      monde, il n'y a rien à lire et le choix du compagnon est décoratif ;
 *   2. **se lit-il ailleurs que dans la relation ?** Si emmener celui qu'on
 *      aime le plus est toujours juste, la lecture ne sert à rien ;
 *   3. **un voyage mal choisi abîme-t-il vraiment ?** Sinon, emmener n'importe
 *      qui est gratuit et il n'y a pas de décision ;
 *   4. **la classe achète-t-elle quelque chose ?**
 *
 *   node --experimental-strip-types tools/measure-voyage.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { CLASSES, SOURS_UNDER } from '../src/data/trip.ts';
import { DESTINATIONS } from '../src/data/activities.ts';
import {
  accordSays, accordWith, companions, departWith, fitFor, momentFor, priceOf,
  settleTrip,
} from '../src/systems/trip.ts';

const pad = (x, n) => String(x).padStart(n);
const avg = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/** Un adulte installé, avec du monde autour et de quoi partir. */
function traveller(seed) {
  const state = createNewLife({ seed });
  for (let i = 0; i < 34 && !state.gameOver; i++) simulateYear(state);
  const p = state.player;
  if (state.gameOver || !p.alive || p.prison) return null;
  if (companions(state).length < 3) return null;
  p.money = 300_000;
  p.yearActions = {};
  return state;
}

/* ------------------------------------------------------------------ */
/* 1-2. L'accord se distribue-t-il, et d'où vient-il ?                 */
/* ------------------------------------------------------------------ */

console.log('L’accord, sur 400 paires (personne × destination) :\n');
{
  const rows = [];
  for (let s = 0; s < 60 && rows.length < 400; s++) {
    const state = traveller(1_000 + s);
    if (!state) continue;
    for (const who of companions(state)) {
      for (const dest of DESTINATIONS.slice(0, 6)) {
        rows.push({
          accord: accordWith(who, dest.id),
          fit: fitFor(who, dest.id),
          bond: who.relationship / 100,
        });
      }
    }
  }
  const bands = [0.3, SOURS_UNDER, 0.62, 0.8, 1.01];
  let last = 0;
  console.log('  accord        | part des paires');
  for (const top of bands) {
    const n = rows.filter((r) => r.accord >= last && r.accord < top).length;
    console.log(`  ${pad(last.toFixed(2), 4)} – ${pad(top.toFixed(2), 4)}  | ${pad(`${Math.round((n / rows.length) * 100)} %`, 4)} (${n})`);
    last = top;
  }
  // La corrélation entre l'accord et la seule relation : si elle est proche de
  // 1, la lecture ne dit rien de plus que « emmène celui que tu préfères ».
  const mA = avg(rows.map((r) => r.accord));
  const mB = avg(rows.map((r) => r.bond));
  const cov = avg(rows.map((r) => (r.accord - mA) * (r.bond - mB)));
  const sA = Math.sqrt(avg(rows.map((r) => (r.accord - mA) ** 2)));
  const sB = Math.sqrt(avg(rows.map((r) => (r.bond - mB) ** 2)));
  console.log(`\n  corrélation accord / relation : ${(cov / (sA * sB)).toFixed(2)}`);
  console.log(`  (à 1, emmener celui qu’on préfère serait toujours juste)`);
}

/* ------------------------------------------------------------------ */
/* 3. Le meilleur compagnon est-il le plus proche ?                    */
/* ------------------------------------------------------------------ */

console.log('\n\nPour une destination donnée, qui faut-il emmener ?\n');
{
  let sameAsClosest = 0;
  let total = 0;
  for (let s = 0; s < 60; s++) {
    const state = traveller(2_000 + s);
    if (!state) continue;
    for (const dest of DESTINATIONS.slice(0, 6)) {
      const people = companions(state);
      if (people.length < 2) continue;
      const closest = people[0];
      const best = people.reduce((a, b) =>
        (accordWith(a, dest.id) > accordWith(b, dest.id) ? a : b));
      total += 1;
      if (best.id === closest.id) sameAsClosest += 1;
    }
  }
  console.log(`  le meilleur compagnon est le plus proche : ${sameAsClosest}/${total}`
    + ` (${Math.round((sameAsClosest / total) * 100)} %)`);
}

/* ------------------------------------------------------------------ */
/* 4. Ce que le voyage fait à la relation                              */
/* ------------------------------------------------------------------ */

console.log('\n\nCe qu’un voyage fait à la relation, selon l’accord :\n');
{
  const buckets = { mauvais: [], moyen: [], bon: [] };
  for (let s = 0; s < 90; s++) {
    const state = traveller(3_000 + s);
    if (!state) continue;
    for (const dest of DESTINATIONS.slice(0, 6)) {
      const people = companions(state);
      for (const who of people) {
        const accord = accordWith(who, dest.id);
        const key = accord < SOURS_UNDER ? 'mauvais' : accord < 0.62 ? 'moyen' : 'bon';
        if (buckets[key].length >= 40) continue;
        // On rejoue le départ sur une copie fraîche pour ne pas cumuler.
        const fresh = traveller(3_000 + s);
        if (!fresh) continue;
        const target = fresh.npcs[who.id];
        if (!target) continue;
        const before = target.relationship;
        fresh.player.money = 300_000;
        fresh.player.yearActions = {};
        const gone = departWith(createCtx(fresh), who.id, dest.id, 'normal');
        if (!gone.ok) continue;
        if (gone.title && gone.tone === 'bad') continue;
        const moment = momentFor(fresh, who.id, dest.id);
        settleTrip(createCtx(fresh), who.id, dest.id, 'normal', 0);
        buckets[key].push(fresh.npcs[who.id].relationship - before);
      }
    }
  }
  console.log('  accord    | voyages | ce que la relation gagne');
  for (const [key, xs] of Object.entries(buckets)) {
    if (xs.length === 0) { console.log(`  ${key.padEnd(9)} |       0 |`); continue; }
    console.log(`  ${key.padEnd(9)} | ${pad(xs.length, 7)} | ${pad(avg(xs).toFixed(1), 24)}`);
  }
}

/* ------------------------------------------------------------------ */
/* 5. La classe                                                        */
/* ------------------------------------------------------------------ */

console.log('\n\nCe que la classe de voyage achète :\n');
{
  const state = traveller(11);
  if (state) {
    console.log('  classe          | prix à deux | risque d’incident | ce que le séjour rend');
    const dest = DESTINATIONS.find((d) => d.id === 'roadtrip');
    for (const cls of CLASSES) {
      console.log(
        `  ${cls.label.padEnd(15)} | ${pad(priceOf(state, dest.id, cls.id), 11)}`
        + ` | ${pad(`${(dest.risk * cls.risk * 100).toFixed(1)} %`, 17)}`
        + ` | ${pad(`× ${cls.worth}`, 21)}`,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* 6. Ce que la lecture dit                                            */
/* ------------------------------------------------------------------ */

console.log('\n\nCe qu’on lit avant de partir :\n');
{
  const state = traveller(23);
  if (state) {
    const people = companions(state).slice(0, 4);
    console.log('  personne             | relation | route | ville | montagne');
    for (const who of people) {
      const cells = ['roadtrip', 'city', 'mountain']
        .map((d) => pad(accordWith(who, d).toFixed(2), 6));
      console.log(
        `  ${`${who.firstName} (${who.relation})`.padEnd(20)} | ${pad(Math.round(who.relationship), 8)}`
        + ` |${cells[0]} |${cells[1]} |${cells[2]}`,
      );
    }
    const one = people[0];
    if (one) {
      console.log(`\n  « ${accordSays(accordWith(one, 'roadtrip'))} » (${one.firstName}, road trip)`);
    }
  }
}
