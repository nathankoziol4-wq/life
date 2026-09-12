/**
 * Ce que placer produit aujourd'hui, et ce qu'on y décide.
 *
 * Le catalogue en dit cinq choses absentes : aucune société nommée, aucun
 * nombre de parts, aucun historique visible, aucune actualité, aucun
 * conseiller. Avant d'en ajouter une seule, deux questions.
 *
 * **Est-ce qu'on y place ?** Un système que personne n'ouvre n'a pas besoin
 * de profondeur — c'est la mesure qui a décidé du chantier des objets.
 *
 * **Est-ce qu'il y a une décision ?** Le marché est une marche aléatoire
 * partagée : dérive, conjoncture, volatilité, décrochage. Si rien de ce que
 * le joueur peut savoir ne se lit à l'avance, alors choisir un support n'est
 * qu'un choix d'écart-type — la même critique que l'ancien casino, où l'on
 * choisissait une espérance et regardait.
 *
 *   node --experimental-strip-types tools/measure-bourse.mjs
 */

import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { ASSETS } from '../src/data/assets.ts';

const LIVES = 80;
let lives = 0, investors = 0, positions = 0, worth = 0, everSold = 0;
const held = {};

for (let seed = 60_000; seed < 60_000 + LIVES; seed++) {
  const life = autoplayLife(seed);
  lives++;
  const h = life.player.holdings ?? [];
  if (h.length > 0) investors++;
  positions += h.length;
  for (const x of h) held[x.assetId] = (held[x.assetId] ?? 0) + 1;
  worth += h.reduce((s, x) => s + (x.units ?? 0), 0);
  everSold += life.timeline.filter((e) => /vendu.*part|retiré/.test(e.text)).length;
}

console.log(`${lives} vies jouées`);
console.log(`  vies qui placent           : ${(investors / lives * 100).toFixed(0)} %`);
console.log(`  positions par vie          : ${(positions / lives).toFixed(2)}`);
console.log(`  retraits par vie           : ${(everSold / lives).toFixed(2)}`);
const top = Object.entries(held).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`  les plus tenus : ${top.map(([k, v]) => `${k} ${v}`).join(' · ') || '(aucun)'}`);

/* ------------------------------------------------------------------ */

// Ce qu'il y a à savoir sur un support, avant d'y mettre quoi que ce soit.
console.log(`\nLE CATALOGUE : ${ASSETS.length} supports`);
for (const a of ASSETS) {
  console.log(`  ${a.id.padEnd(16)} dérive ${String(Math.round(a.drift * 100)).padStart(3)} %`
    + ` · agitation ${a.volatility.toFixed(2)} · bêta ${String(a.beta).padStart(5)}`
    + ` · décrochage ${Math.round(a.crashRisk * 100)} %`);
}

// Est-ce qu'un support a une identité, ou n'est-ce qu'un jeu de nombres ?
const fields = new Set();
for (const a of ASSETS) for (const k of Object.keys(a)) fields.add(k);
console.log(`\n  ce qu'un support porte : ${[...fields].join(', ')}`);

/* ------------------------------------------------------------------ */

/**
 * Y a-t-il quelque chose à décider ?
 *
 * On compare trois façons de placer sur les mêmes marchés : toujours le même
 * support large, le support choisi au hasard, et le support choisi d'après
 * ce que le joueur peut *voir* — la conjoncture affichée à l'écran, et le
 * bêta que l'alphabétisation financière lui donne. Si les trois se valent,
 * choisir un support n'est qu'un choix d'écart-type.
 */
import { createNewLife } from '../src/engine/newLife.ts';
import { createCtx } from '../src/engine/context.ts';
import { Rng } from '../src/engine/rng.ts';
import { advanceMarkets, marketOf } from '../src/systems/investing.ts';
import { clamp } from '../src/engine/rng.ts';

const YEARS = 40;
const WORLDS = 400;
const totals = { fixe: 0, hasard: 0, informe: 0, parfait: 0 };

for (let w = 0; w < WORLDS; w++) {
  const state = createNewLife({ seed: 400_000 + w });
  const rng = new Rng({ rngState: (w * 2654435761 + 7) >>> 0 });
  const purse = { fixe: 1, hasard: 1, informe: 1, parfait: 1 };

  for (let y = 0; y < YEARS; y++) {
    // Ce que le joueur voit avant de décider : la conjoncture de l'an passé.
    const seen = state.world.economy;
    const pickInformed = seen < -0.2
      ? ASSETS.reduce((best, a) => (a.beta < best.beta ? a : best))
      : seen > 0.2
        ? ASSETS.reduce((best, a) => (a.drift > best.drift ? a : best))
        : ASSETS.find((a) => a.id === 'index');
    const pickRandom = ASSETS[rng.int(0, ASSETS.length - 1)];
    const fixe = ASSETS.find((a) => a.id === 'index');

    const before = Object.fromEntries(ASSETS.map((a) => [a.id, marketOf(state, a.id).price]));
    // La conjoncture bouge, puis les cours : c'est l'ordre du moteur.
    state.world.economy = clamp(state.world.economy * 0.72 + rng.float(-0.6, 0.6), -1, 1);
    advanceMarkets(createCtx(state));
    const ret = (a) => marketOf(state, a.id).price / before[a.id];

    purse.fixe *= ret(fixe);
    purse.hasard *= ret(pickRandom);
    purse.informe *= ret(pickInformed);
    purse.parfait *= Math.max(...ASSETS.map((a) => ret(a)));
  }
  for (const k of Object.keys(totals)) totals[k] += Math.log(purse[k]) / YEARS;
}

console.log(`\nY A-T-IL UNE DÉCISION ? ${WORLDS} mondes · ${YEARS} ans`);
for (const [k, v] of Object.entries(totals)) {
  console.log(`  ${k.padEnd(8)} ${((Math.exp(v / WORLDS) - 1) * 100).toFixed(2)} %/an`);
}
