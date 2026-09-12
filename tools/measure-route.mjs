/**
 * La route rapporte-t-elle, et à quel prix ?
 *
 * Cinq questions :
 *
 *   1. **la carte est-elle lisible ?** Si toutes les régions payent pareil,
 *      il n'y a rien à lire et le système est un bouton ;
 *   2. **existe-t-il une bonne quantité ?** La chaleur monte au carré de la
 *      charge : si porter le maximum est toujours juste, il n'y a pas de
 *      décision ;
 *   3. **la route s'use-t-elle ?** Un écart exploité doit se refermer, sans
 *      quoi on apprend une route une fois et on la refait à vie ;
 *   4. **combien coûte l'avidité ?** Contrôles, cargaisons perdues,
 *      arrestations ;
 *   5. **est-ce mieux qu'un métier ?** Si oui, plus personne ne travaille.
 *
 *   node --experimental-strip-types tools/measure-route.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { GOODS } from '../src/data/route.ts';
import { REGION_ARCHETYPES } from '../src/data/regions.ts';
import {
  capacity, costHere, destinations, hereId, holdWorth, loadOf, mostAffordable,
  priceAt, routeOf, run, stock, stopOdds,
} from '../src/systems/route.ts';
import { heatOf } from '../src/systems/underworld.ts';

const pad = (x, n) => String(x).padStart(n);
const avg = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/** Un adulte installé, avec de quoi acheter. */
function carrier(seed, { money = 200_000 } = {}) {
  const state = createNewLife({ seed });
  for (let i = 0; i < 26 && !state.gameOver; i++) simulateYear(state);
  const p = state.player;
  if (state.gameOver || !p.alive || p.prison) return null;
  p.money = money;
  p.yearActions = {};
  return state;
}

/* ------------------------------------------------------------------ */
/* 1. La carte est-elle lisible ?                                      */
/* ------------------------------------------------------------------ */

console.log('Ce qu’une unité vaut, par région (prix de référence × lieu) :\n');
{
  const state = carrier(5);
  if (state) {
    const head = REGION_ARCHETYPES.map((r) => r.id.slice(0, 6).padStart(7)).join('');
    console.log(`  marchandise          |${head}`);
    for (const good of GOODS) {
      const row = REGION_ARCHETYPES
        .map((r) => pad(priceAt(state, r.id, good.id), 7)).join('');
      console.log(`  ${good.label.padEnd(20)} |${row}`);
    }
    const here = hereId(state);
    console.log(`\n  (le personnage est ${here} · place disponible ${capacity(state)})`);
  }
}

/* ------------------------------------------------------------------ */
/* 2. Existe-t-il une bonne quantité ?                                 */
/* ------------------------------------------------------------------ */

/**
 * Un passage, à charge choisie, répété sur des vies indépendantes.
 *
 * `share` est la part de la capacité qu'on remplit : c'est le seul paramètre,
 * et toute la question est de savoir s'il existe un optimum ailleurs qu'à 1.
 */
function runs(share, { years = 12, lives = 40 } = {}) {
  /*
   * On relève `route.earned` — ce que la route a rapporté, net de ce qu'elle
   * a coûté — et non la variation de trésorerie sur douze ans. La première
   * version mesurait la seconde et annonçait −178 000 à toutes les charges :
   * elle lisait le coût de la vie, pas le commerce.
   */
  const out = {
    earned: [], stopped: 0, arrested: 0, heat: [], trips: 0, peak: [], jailed: [],
  };
  for (let s = 0; s < lives; s++) {
    const state = carrier(9_000 + s);
    if (!state) continue;
    const p = state.player;
    let jailed = 0;
    for (let y = 0; y < years && p.alive && !state.gameOver; y++) {
      p.yearActions = {};
      // Les années passées en détention : c'est là qu'est le vrai prix, et
      // l'argent ne le rachète pas.
      if (p.prison) { jailed += 1; simulateYear(state); continue; }
      // Choisir la marchandise qui paie le mieux au meilleur endroit.
      let best = null;
      for (const good of GOODS) {
        const unit = costHere(state, good.id);
        if (unit <= 0) continue;
        for (const r of REGION_ARCHETYPES) {
          if (r.id === hereId(state)) continue;
          const margin = priceAt(state, r.id, good.id) - unit;
          const perBulk = margin / good.bulk;
          if (!best || perBulk > best.perBulk) best = { good, to: r.id, perBulk };
        }
      }
      if (best) {
        const most = mostAffordable(state, best.good.id);
        const take = Math.max(0, Math.floor(most * share));
        if (take > 0 && stock(createCtx(state), best.good.id, take).ok) {
          out.heat.push(heatOf(state));
          const arrestsBefore = p.criminalRecord.arrests;
          const done = run(createCtx(state), best.to);
          if (done.ok) {
            out.trips += 1;
            if (done.title === 'Contrôlé') out.stopped += 1;
            if (p.criminalRecord.arrests > arrestsBefore) out.arrested += 1;
          }
        }
      }
      simulateYear(state);
    }
    out.earned.push(routeOf(state).earned);
    out.peak.push(heatOf(state));
    out.jailed.push(jailed);
  }
  return out;
}

console.log('\n\nDouze ans de passages, selon la part de la capacité qu’on remplit (40 vies) :\n');
console.log('  charge | gagné | par passage | passages | contrôlés | arrêté | ans en détention | chaleur');
for (const share of [0.2, 0.4, 0.6, 0.8, 1]) {
  const r = runs(share);
  if (r.earned.length === 0) continue;
  const per = r.trips > 0 ? (avg(r.earned) * r.earned.length) / r.trips : 0;
  console.log(
    `  ${pad(`${Math.round(share * 100)} %`, 6)} | ${pad(Math.round(avg(r.earned)), 5)}`
    + ` | ${pad(Math.round(per), 11)} | ${pad(r.trips, 8)} | ${pad(r.stopped, 9)}`
    + ` | ${pad(r.arrested, 6)} | ${pad(avg(r.jailed).toFixed(2), 16)}`
    + ` | ${pad(Math.round(avg(r.peak)), 7)}`,
  );
}

/* ------------------------------------------------------------------ */
/* 3. La route s'use-t-elle ?                                          */
/* ------------------------------------------------------------------ */

console.log('\n\nLa même route, refaite huit fois :\n');
{
  const state = carrier(21);
  if (state) {
    const p = state.player;
    console.log('  passage | acheté | vendu | marge | facteur à l’arrivée');
    let good = null;
    let to = null;
    for (const g of GOODS) {
      for (const r of REGION_ARCHETYPES) {
        if (r.id === hereId(state)) continue;
        const m = priceAt(state, r.id, g.id) - costHere(state, g.id);
        if (!good || m / g.bulk > (priceAt(state, to, good.id) - costHere(state, good.id)) / good.bulk) {
          good = g; to = r.id;
        }
      }
    }
    for (let i = 1; i <= 8 && p.alive && !state.gameOver; i++) {
      p.yearActions = {};
      const take = Math.max(1, Math.floor(mostAffordable(state, good.id) * 0.5));
      if (!stock(createCtx(state), good.id, take).ok) break;
      const paid = holdWorth(state, hereId(state));
      const worth = holdWorth(state, to);
      const done = run(createCtx(state), to);
      const factor = priceAt(state, to, good.id) / Math.max(1, costHere(state, good.id));
      console.log(
        `  ${pad(i, 7)} | ${pad(paid, 6)} | ${pad(done.title === 'Contrôlé' ? 0 : worth, 5)}`
        + ` | ${pad(done.title === 'Contrôlé' ? -paid : worth - paid, 5)} | ${factor.toFixed(2)}`,
      );
      simulateYear(state);
    }
    console.log(`\n  marchandise : ${good.label} · ${hereId(state)} → ${to}`);
  }
}

/* ------------------------------------------------------------------ */
/* 4. Le risque suit-il la charge ?                                    */
/* ------------------------------------------------------------------ */

console.log('\n\nLa probabilité d’être contrôlé, selon la chaleur et la charge :\n');
{
  const state = carrier(33);
  if (state) {
    const p = state.player;
    console.log('  chaleur | vide | à moitié | plein');
    for (const heat of [0, 20, 40, 60, 85]) {
      const cells = [];
      for (const share of [0, 0.5, 1]) {
        p.route = { hold: {}, boughtIn: null, market: {}, runs: 0, seized: 0, earned: 0 };
        p.criminalRecord.heat = heat;
        const good = GOODS[0];
        const take = Math.floor((capacity(state) / good.bulk) * share);
        if (take > 0) p.route.hold[good.id] = take;
        cells.push(`${(stopOdds(state) * 100).toFixed(1)} %`);
      }
      console.log(`  ${pad(heat, 7)} | ${pad(cells[0], 4)} | ${pad(cells[1], 8)} | ${pad(cells[2], 5)}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 5. Est-ce mieux qu'un métier ?                                      */
/* ------------------------------------------------------------------ */

console.log('\n\nDouze ans, la route contre le salaire :\n');
{
  const salaries = [];
  for (let s = 0; s < 40; s++) {
    const state = carrier(9_000 + s);
    if (!state) continue;
    salaries.push(state.player.job?.salary ?? 0);
  }
  const best = runs(0.4);
  const paid = salaries.filter((x) => x > 0);
  console.log(`  salaire annuel moyen : ${paid.length > 0 ? Math.round(avg(paid)) : '—'} (${paid.length}/40 en emploi)`);
  console.log(`  route, par an        : ${Math.round(avg(best.earned) / 12)}`);
  console.log(`  cargaisons perdues   : ${best.stopped}/${best.trips} passages`);
}
