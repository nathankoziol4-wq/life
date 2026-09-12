/**
 * Ce que les objets de valeur produisent aujourd'hui.
 *
 * Le catalogue en dit six choses absentes — authenticité, enchères, marché
 * parallèle, provenance, transmission, collection — et une lecture du code
 * les confirme : un objet est `{ nom, valeur, année, prix payé }`, on
 * l'achète au prix de la boutique et on le revend par un canal qui n'est
 * qu'un multiplicateur. La « salle des ventes » vaut `rate: 1.0`.
 *
 * Mais avant d'ajouter quoi que ce soit : est-ce qu'un joueur en possède
 * seulement ? Un système invisible n'a pas besoin de profondeur, il a besoin
 * d'exister.
 *
 *   node --experimental-strip-types tools/measure-objets.mjs
 */

import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { SHOP_ITEMS } from '../src/data/activities.ts';

const LIVES = 80;
let lives = 0, owners = 0, owned = 0, sold = 0;
let bought = 0, gains = 0, losses = 0;
const kinds = {};

for (let seed = 60_000; seed < 60_000 + LIVES; seed++) {
  const life = autoplayLife(seed);
  lives++;
  const vals = life.player.valuables ?? [];
  if (vals.length > 0) owners++;
  owned += vals.length;
  for (const v of vals) {
    kinds[v.name] = (kinds[v.name] ?? 0) + 1;
    const spent = v.purchasePrice ?? 0;
    if (v.value > spent) gains++; else losses++;
    bought += spent;
  }
  sold += life.timeline.filter((e) => /Tu as vendu/.test(e.text)).length;
}

console.log(`${lives} vies jouées`);
console.log(`  vies qui possèdent un objet : ${(owners / lives * 100).toFixed(0)} %`);
console.log(`  objets par vie              : ${(owned / lives).toFixed(2)}`);
console.log(`  ventes par vie              : ${(sold / lives).toFixed(2)}`);
console.log(`  objets qui ont pris de la valeur : ${gains} · qui en ont perdu : ${losses}`);
console.log(`  dépensé en objets, par vie  : ${Math.round(bought / lives).toLocaleString('fr-FR')}`);
const top = Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`  les plus achetés : ${top.map(([k, v]) => `${k} ${v}`).join(' · ') || '(aucun)'}`);

// Ce que le catalogue propose, et ce qu'il en advient.
const appreciating = SHOP_ITEMS.filter((i) => (i.appreciation ?? -0.1) > 0);
console.log(`\nCATALOGUE : ${SHOP_ITEMS.length} articles · ${appreciating.length} prennent de la valeur`);
console.log(`  ceux qui montent : ${appreciating.map((i) => `${i.name} (${((i.appreciation ?? 0) * 100).toFixed(0)} %/an)`).join(' · ')}`);
