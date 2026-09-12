/**
 * L'attention achète-t-elle quelque chose ?
 *
 * Quatre questions, dans l'ordre où elles décident si le système existe.
 *
 *   1. **les provenances sont-elles trois bêtes ou trois prix ?** Si le refuge
 *      et l'éleveur convergent en trois ans, la porte d'entrée n'est qu'un
 *      tarif ;
 *   2. **une bête laissée se dégrade-t-elle vraiment ?** C'était tout le
 *      défaut d'avant : `happiness` baissait sans que rien ne le lise ;
 *   3. **l'attention achète-t-elle des années ?** C'est l'arbitrage central.
 *      On mesure l'âge atteint, pas un score ;
 *   4. **combien coûte le fait de ne rien faire ?** Ennuis, bonheur perdu,
 *      bêtes retirées.
 *
 *   node --experimental-strip-types tools/measure-bete.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { adoptPetSpecies } from '../src/systems/activities.ts';
import {
  bondOf, calmOf, contentLabel, easeLabel, momentsPerYear, spendMoment,
  trainingOf, wants,
} from '../src/systems/beast.ts';
import { BEAST_SOURCES } from '../src/data/beast.ts';

/** Un adulte installé, avec de quoi payer, et une bête d'une provenance donnée. */
function keeper(seed, { speciesId, sourceId }) {
  const state = createNewLife({ seed });
  for (let i = 0; i < 26 && !state.gameOver; i++) simulateYear(state);
  const p = state.player;
  if (state.gameOver || !p.alive || p.prison) return null;
  p.money = 400_000;
  p.pets = [];
  const got = adoptPetSpecies(createCtx(state), speciesId, false, sourceId);
  if (!got.ok || p.pets.length === 0) return null;
  p.yearActions = {};
  return state;
}

const pad = (x, n) => String(x).padStart(n);
const avg = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/* ------------------------------------------------------------------ */
/* 1. Trois provenances, trois bêtes ?                                 */
/* ------------------------------------------------------------------ */

console.log('À l’arrivée, un chien selon d’où il vient (30 tirages) :\n');
console.log('  provenance   |  prix | âge | ouverture | santé | contentement');
for (const source of BEAST_SOURCES) {
  const rows = [];
  for (let s = 0; s < 30; s++) {
    const state = keeper(1_000 + s, { speciesId: 'dog', sourceId: source.id });
    if (!state) continue;
    const pet = state.player.pets[0];
    rows.push({
      spent: 400_000 - state.player.money,
      age: pet.age, ease: pet.ease, health: pet.health, content: pet.happiness,
    });
  }
  if (rows.length === 0) continue;
  console.log(
    `  ${source.label.padEnd(12)} | ${pad(Math.round(avg(rows.map((r) => r.spent))), 5)}`
    + ` | ${avg(rows.map((r) => r.age)).toFixed(1)} | ${pad(Math.round(avg(rows.map((r) => r.ease))), 9)}`
    + ` | ${pad(Math.round(avg(rows.map((r) => r.health))), 5)} | ${pad(Math.round(avg(rows.map((r) => r.content))), 12)}`,
  );
}

/* ------------------------------------------------------------------ */
/* 2-4. Quatre façons de tenir un chien sur quinze ans                 */
/* ------------------------------------------------------------------ */

/**
 * Les régimes de jeu comparés.
 *
 * « lire » est celui qui compte : il dépense ses moments là où `wants` dit
 * que la bête en a besoin. S'il ne bat pas « au hasard », la lecture ne sert
 * à rien et le système est décoratif.
 */
const REGIMES = {
  'rien': () => null,
  'sortir toujours': () => 'sortir',
  // Dresser dès que c'est permis, sortir en attendant. La version naïve —
  // « dresser, sinon rien » — donnait exactement la colonne « rien », le
  // dressage étant refusé sous le lien requis : elle mesurait mon garde-fou,
  // pas une façon de jouer.
  'dresser dès qu’on peut': (pet) => (bondOf(pet) >= 25 && trainingOf(pet) < 90 ? 'dresser' : 'sortir'),
  'lire la bête': (pet) => wants(pet),
};

function run(regime, { speciesId, sourceId, years = 15, lives = 60 }) {
  const out = {
    lived: [], reached: [], bond: [], training: [], content: [], health: [], gone: 0, dead: 0,
    // Le calme se relève année par année, pendant que la bête est là. Le
    // stress de fin de course ne dit rien : dans le régime « rien » la bête a
    // disparu depuis dix ans, et le nombre décrit ces dix ans-là.
    calm: [], troubles: 0, spent: [],
  };
  for (let s = 0; s < lives; s++) {
    const state = keeper(4_000 + s, { speciesId, sourceId });
    if (!state) continue;
    const p = state.player;
    const petId = p.pets[0].id;
    const before = p.money;
    let lastSeen = p.pets[0];
    let end = 0;
    for (let y = 0; y < years && !state.gameOver && p.alive; y++) {
      const pet = p.pets.find((x) => x.id === petId);
      if (!pet) break;
      lastSeen = { ...pet };
      end = y;
      // Les moments de l'année, dépensés selon le régime.
      let guard = 0;
      while (guard < 8) {
        guard += 1;
        const live = p.pets.find((x) => x.id === petId);
        if (!live) break;
        const care = regime(live);
        if (!care) break;
        const done = spendMoment(createCtx(state), petId, care);
        if (!done.ok) break;
      }
      out.calm.push(calmOf(state));
      const seen = state.timeline.length;
      simulateYear(state);
      if (state.timeline.slice(seen).some((e) => e.text.startsWith(`${pet.name} a`)
        || e.text.startsWith(`${pet.name} s’`))) out.troubles += 1;
    }
    const still = p.pets.find((x) => x.id === petId);
    if (!still) {
      // Partie : morte, ou retirée. On distingue par le journal.
      const taken = state.timeline.some(
        (e) => e.text.includes('ne vit plus chez toi'),
      );
      if (taken) out.gone += 1; else out.dead += 1;
    }
    const shown = still ?? lastSeen;
    // Deux nombres différents : les années passées **avec toi**, et l'âge
    // qu'elle atteint. La bête du refuge arrive à trois ans ; comparer les
    // premières sans les secondes ferait passer pour une mauvaise affaire ce
    // qui n'est qu'un départ plus tardif.
    out.lived.push(still ? years : end + 1);
    // `lastSeen` est pris en début d'année, avant que `simulateYear` ne
    // vieillisse la bête : celle qui n'est plus là a vécu un an de plus que ce
    // qu'en dit l'instantané.
    out.reached.push((shown.age ?? 0) + (still ? 0 : 1));
    out.bond.push(bondOf(shown));
    out.training.push(trainingOf(shown));
    out.content.push(shown.happiness ?? 0);
    out.health.push(shown.health ?? 0);
    out.spent.push(before - p.money);
  }
  return out;
}

for (const [what, opts] of [
  ['un chien de refuge', { speciesId: 'dog', sourceId: 'refuge' }],
  ['un chien d’éleveur', { speciesId: 'dog', sourceId: 'eleveur' }],
  ['un chat d’animalerie', { speciesId: 'cat', sourceId: 'animalerie' }],
]) {
  console.log(`\n\nQuinze ans avec ${what} (60 vies) :\n`);
  console.log('  régime               | avec toi | âge atteint | lien | dressage | content. | santé | morte | retirée | ennuis | calme');
  for (const [name, regime] of Object.entries(REGIMES)) {
    const r = run(regime, opts);
    if (r.lived.length === 0) continue;
    console.log(
      `  ${name.padEnd(20)} | ${pad(avg(r.lived).toFixed(1), 8)} | ${pad(avg(r.reached).toFixed(1), 11)}`
      + ` | ${pad(Math.round(avg(r.bond)), 4)} | ${pad(Math.round(avg(r.training)), 8)}`
      + ` | ${pad(Math.round(avg(r.content)), 8)} | ${pad(Math.round(avg(r.health)), 5)}`
      + ` | ${pad(r.dead, 5)} | ${pad(r.gone, 7)} | ${pad(r.troubles, 6)}`
      + ` | ${pad(avg(r.calm).toFixed(1), 5)}`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* 5. Les moments disponibles                                          */
/* ------------------------------------------------------------------ */

console.log('\n\nCe que l’année laisse comme moments :\n');
{
  const state = keeper(7, { speciesId: 'dog', sourceId: 'refuge' });
  if (state) {
    const p = state.player;
    p.job = null;
    console.log(`  sans travail       : ${momentsPerYear(state)}`);
    p.job = { hours: 38 };
    console.log(`  métier ordinaire   : ${momentsPerYear(state)}`);
    p.job = { hours: 52 };
    console.log(`  métier dévorant    : ${momentsPerYear(state)}`);
  }
}

/* ------------------------------------------------------------------ */
/* 6. La lecture discrimine-t-elle ?                                   */
/* ------------------------------------------------------------------ */

/**
 * Trois états volontairement contrastés, la même question posée à chacun.
 *
 * Si `wants` répond la même chose partout, il n'y a rien à lire. La première
 * mesure disait « dresser » pour six espèces sur six.
 */
console.log('\n\nCe que chaque espèce réclame, selon son état :\n');
console.log('  espèce     | à l’arrivée | qui s’ennuie | mal en point | lien fait, qui s’ennuie');
for (const speciesId of ['dog', 'cat', 'bird', 'fish', 'horse', 'turtle']) {
  const state = keeper(11, { speciesId, sourceId: 'animalerie' });
  if (!state) continue;
  const base = state.player.pets[0];
  const ask = (over) => wants({ ...base, ...over });
  console.log(
    `  ${base.species.padEnd(10)} | ${ask({}).padEnd(11)}`
    + ` | ${ask({ happiness: 20 }).padEnd(12)} | ${ask({ health: 25 }).padEnd(12)}`
    + ` | ${ask({ happiness: 20, bond: 60 })}`,
  );
}

console.log('\n\nÀ l’arrivée, un chien d’animalerie :\n');
{
  const state = keeper(11, { speciesId: 'dog', sourceId: 'animalerie' });
  if (state) {
    const pet = state.player.pets[0];
    console.log(`  ${easeLabel(pet.ease)} · ${contentLabel(pet.happiness)}`);
  }
}
