/**
 * Chiner rapporte-t-il quelque chose ?
 *
 * Trois questions, et chacune peut condamner le réglage :
 *
 * 1. **Les quatre endroits s'échangent-ils vraiment ?** Si l'un domine, les
 *    trois autres sont du décor.
 * 2. **L'expertise vaut-elle son prix ?** Vendre dans le doute doit coûter
 *    plus que de savoir — mais savoir doit pouvoir faire mal.
 * 3. **L'œil sert-il à quelque chose ?** Sinon la compétence « les chiffres »
 *    ne fait que payer un salaire.
 *
 *   node --experimental-strip-types tools/measure-chine.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { PROVENANCES } from '../src/data/objects.ts';
import {
  appraise, askingPrice, auction, hunt, huntBlocker, saleOdds, standingOf,
} from '../src/systems/objects.ts';

function life(seed) {
  const s = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < 30 && s.player.alive; i++) simulateYear(s);
  s.player.alive = true; s.gameOver = false;
  s.player.money = 5_000_000;
  s.player.yearActions = {};
  return s;
}

console.log('CHINER — ce que chaque endroit rapporte, sur 300 sorties');
for (const from of PROVENANCES) {
  let spent = 0, got = 0, found = 0, real = 0, tries = 0;
  for (let seed = 0; seed < 300; seed++) {
    const s = life(seed);
    s.player.age = Math.max(s.player.age, from.from);
    if (huntBlocker(s, from.id)) continue;
    tries++;
    const before = s.player.money;
    const n = s.player.valuables.length;
    hunt(createCtx(s), from.id);
    spent += before - s.player.money;
    if (s.player.valuables.length > n) {
      found++;
      const item = s.player.valuables[s.player.valuables.length - 1];
      got += item.value;
      if (item.real) real++;
    }
  }
  const rate = found / Math.max(1, tries);
  console.log(`  ${from.label.padEnd(24)} trouve ${(rate * 100).toFixed(0)} %`
    + ` · vrai ${(real / Math.max(1, found) * 100).toFixed(0)} %`
    + ` · dépensé ${Math.round(spent / Math.max(1, tries)).toLocaleString('fr-FR').padStart(8)}`
    + ` · rapporté ${Math.round(got / Math.max(1, tries)).toLocaleString('fr-FR').padStart(8)}`);
}

/* ---- L'expertise ---- */
console.log('\nL’EXPERTISE — vendre dans le doute contre savoir');
let doubtSum = 0, knownSum = 0, fakes = 0, n = 0;
for (let seed = 0; seed < 400; seed++) {
  const s = life(seed);
  s.player.age = 30;
  if (huntBlocker(s, 'succession')) continue;
  hunt(createCtx(s), 'succession');
  const item = s.player.valuables[s.player.valuables.length - 1];
  if (!item) continue;
  n++;
  doubtSum += askingPrice(s, item);
  appraise(createCtx(s), item.id);
  if (standingOf(item) === 'copie') fakes++;
  knownSum += askingPrice(s, item);
}
console.log(`  ${n} objets · dans le doute ${Math.round(doubtSum / n).toLocaleString('fr-FR')}`
  + ` · une fois su ${Math.round(knownSum / n).toLocaleString('fr-FR')}`
  + ` · copies découvertes ${(fakes / n * 100).toFixed(0)} %`);

/* ---- L'œil ---- */
console.log('\nL’ŒIL — juger soi-même');
for (const level of [30, 44, 70, 95]) {
  const s = life(7); s.player.age = 30;
  s.player.skills = { chiffres: { level, peak: level, done: 9 } };
  let right = 0, total = 0, refused = 0;
  for (let i = 0; i < 300; i++) {
    s.player.yearActions = {};
    hunt(createCtx(s), 'lot');
    const item = s.player.valuables[s.player.valuables.length - 1];
    if (!item || standingOf(item) !== 'douteux') continue;
    const truth = item.real;
    const r = appraise(createCtx(s), item.id, true);
    // En dessous du seuil, juger soi-même est refusé : il faut payer. Compter
    // ces refus comme des verdicts ferait passer un joueur sans compétence
    // pour à moitié bon.
    if (!r.ok) { refused++; continue; }
    total++;
    if ((standingOf(item) === 'authentique') === truth) right++;
  }
  console.log(total
    ? `  niveau ${String(level).padStart(3)} → ${(right / total * 100).toFixed(0)} % de verdicts justes soi-même (${total} objets)`
    : `  niveau ${String(level).padStart(3)} → juger soi-même est refusé (${refused} fois) : il faut payer un expert`);
}

/* ---- La salle ---- */
console.log('\nLA SALLE — poser sa réserve');
const s = life(3); s.player.age = 30;
hunt(createCtx(s), 'boutique');
const item = s.player.valuables[0];
if (item) {
  const base = askingPrice(s, item);
  for (const f of [0.5, 0.8, 1.0, 1.3, 1.7]) {
    console.log(`  réserve à ${(f * 100).toFixed(0)} % de l’estimation → ${(saleOdds(s, item, base * f) * 100).toFixed(0)} % de chances que ça parte`);
  }
  const r = auction(createCtx(s), item.id, base);
  console.log(`  exemple : ${r.message}`);
}
