/**
 * La densité d'événements par tranche d'âge, mesurée en continu.
 *
 * **Pourquoi cet outil existe.** Le catalogue portait la feuille
 * `Événements/Densité/Audit d'âge automatique` avec la note « la densité par
 * tranche d'âge se mesure à la main, pas en continu ». C'était la feuille la
 * mieux notée qui restât, et elle n'ajoute pourtant aucun bouton : elle sert à
 * trouver les trous. Or le reproche fondateur de tout ce travail est
 * exactement celui-là — on ajoute de gros systèmes et l'on oublie beaucoup de
 * petites mécaniques. Un âge qu'on traverse sans que rien n'arrive est un trou
 * que personne ne voit, parce qu'un écran vide ressemble à un écran calme.
 *
 * Deux mesures, et elles ne disent pas la même chose :
 *
 * **1. Ce qui est éligible.** Combien d'événements distincts du catalogue
 * peuvent se déclencher à cet âge-là, si les conditions s'y prêtent. C'est le
 * plafond : un âge à quatorze événements ne pourra jamais être riche.
 *
 * **2. Ce qui arrive réellement.** Combien d'événements distincts une vie
 * rencontre dans cette tranche, moyenné sur des centaines de vies jouées.
 * C'est ce que le joueur voit, et cela peut être bien plus bas que le plafond
 * si les conditions sont rarement réunies.
 *
 *   node --experimental-strip-types tools/audit-densite.mjs [vies]
 */

import { writeFileSync } from 'node:fs';
import { ALL_EVENTS } from '../src/data/events/index.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { eligibleEvents, resolvePending } from '../src/systems/randomEvents.ts';
import { BANDS, YEAR_FLOOR, bandOf, eligibleAt } from '../src/data/density.ts';

const LIVES = Number(process.argv[2] ?? 150);

/* ------------------------------------------------------------------ */
/* 1. Le plafond : ce que le catalogue autorise                        */
/* ------------------------------------------------------------------ */

const ceiling = BANDS.map((band) => {
  const ids = new Set();
  for (let age = band.from; age <= band.to; age += 1) {
    for (const event of ALL_EVENTS) if (eligibleAt(event, age)) ids.add(event.id);
  }
  return { band, eligible: ids.size };
});

/* ------------------------------------------------------------------ */
/* 2. Le réel : ce qu'une vie peut réellement tirer                    */
/* ------------------------------------------------------------------ */

/*
 * **On mesure l'éligibilité en jeu, pas ce que la ligne du temps garde.**
 * `TimelineEntry` ne porte pas l'identifiant de l'événement — compter des
 * lignes reviendrait à compter des textes interpolés, où le même événement
 * apparaît sous dix formes selon le prénom qu'on y met.
 *
 * `randomEvents.ts#eligibleEvents` est l'instrument juste : c'est exactement
 * la liste dans laquelle le moteur tire, conditions complètes comprises — un
 * emploi, un conjoint, un logement, une école. Un événement que le catalogue
 * autorise à cet âge mais dont personne ne remplit jamais les conditions ne
 * compte pas, et c'est bien ce qu'on veut savoir.
 */
const seen = new Map(BANDS.map((b) => [b.id, []]));

/*
 * **La moyenne par tranche cache les falaises, et elle en cachait une.**
 * « Avant l'école » rendait 13,3 — bas, mais lisible comme une pente. Année
 * par année, ce n'était pas une pente : 1,4 à un an, 2,8 à deux ans, puis 21,7
 * à quatre. Les vingt événements qu'un audit précédent avait ajoutés pour
 * combler la tranche commençaient tous à trois ans ou plus, et la moyenne
 * remontée par les grands masquait deux années où il ne se passait rien.
 *
 * On garde donc les deux vues : la tranche pour lire, l'année pour trouver.
 */
const perYear = new Map();

for (let i = 0; i < LIVES; i += 1) {
  const state = createNewLife({ seed: i * 7919 + 3 });
  const perBand = new Map(BANDS.map((b) => [b.id, []]));
  for (let year = 0; year < 100 && !state.gameOver && state.player.alive; year += 1) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const p of [...state.pending]) resolvePending(ctx, p.id, 0);
    state.pending = [];
    const band = bandOf(state.player.age);
    const drawable = eligibleEvents(createCtx(state)).length;
    if (band) perBand.get(band.id).push(drawable);
    if (!perYear.has(state.player.age)) perYear.set(state.player.age, []);
    perYear.get(state.player.age).push(drawable);
  }
  for (const band of BANDS) {
    const years = perBand.get(band.id);
    // Seules les tranches réellement traversées comptent : une vie qui
    // s'arrête à soixante ans n'a pas « zéro » après soixante-cinq, elle n'y
    // est pas allée.
    if (years.length) seen.get(band.id).push(years.reduce((s, x) => s + x, 0) / years.length);
  }
}

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/* ------------------------------------------------------------------ */
/* Le rapport                                                          */
/* ------------------------------------------------------------------ */

const rows = ceiling.map(({ band, eligible }) => {
  const got = seen.get(band.id);
  return {
    band,
    eligible,
    lived: mean(got),
    lives: got.length,
  };
});

const worst = [...rows].sort((a, b) => a.lived - b.lived)[0];
const best = [...rows].sort((a, b) => b.lived - a.lived)[0];

console.log(`— ${LIVES} vies, ${ALL_EVENTS.length} événements au catalogue —\n`);
console.log('TRANCHE'.padEnd(24), 'âges'.padStart(8), 'au catalogue'.padStart(14), 'tirables'.padStart(10));
for (const row of rows) {
  console.log(
    row.band.label.padEnd(24),
    `${row.band.from}–${row.band.to === 120 ? '…' : row.band.to}`.padStart(8),
    String(row.eligible).padStart(14),
    row.lived.toFixed(1).padStart(10),
  );
}
console.log(`\n   la plus pauvre : ${worst.band.label} — ${worst.lived.toFixed(1)} tirables une année donnée`);
console.log(`   la plus riche  : ${best.band.label} — ${best.lived.toFixed(1)}`);
console.log(`   écart          : ${(best.lived / Math.max(0.01, worst.lived)).toFixed(1)}×`);

/* Les vingt premières années, une par une : c'est là que les trous se logent,
 * et c'est la vue qui les montre. */
const YOUNG = 20;
const years = [...Array(YOUNG).keys()]
  .map((age) => ({ age, lived: mean(perYear.get(age) ?? []) }))
  .filter((y) => (perYear.get(y.age) ?? []).length > 0);

console.log('\n— année par année, les vingt premières —\n');
for (let i = 0; i < years.length; i += 4) {
  console.log(years.slice(i, i + 4)
    .map((y) => `${String(y.age).padStart(3)} ans : ${y.lived.toFixed(1).padStart(6)}`)
    .join('   '));
}
const thin = years.filter((y) => y.age >= 1 && y.lived < YEAR_FLOOR);
console.log(thin.length
  ? `\n   ⚠ années creuses (moins de ${YEAR_FLOOR} tirables) : ${thin.map((y) => `${y.age} ans`).join(', ')}`
  : `\n   aucune année creuse : toutes passent ${YEAR_FLOOR} événements tirables.`);

const lines = [
  '# La densité par âge',
  '',
  '*Généré par `npm run audit:densite`. Deux mesures : ce que le catalogue',
  'autorise à cet âge, et ce dans quoi le moteur peut réellement tirer une',
  'année donnée — conditions complètes comprises. La seconde peut être bien',
  'plus basse que la première, et c’est elle qui compte.*',
  '',
  `**${ALL_EVENTS.length} événements au catalogue, ${LIVES} vies jouées.**`,
  '',
  '| Tranche | Âges | Au catalogue | Réellement tirables |',
  '| --- | ---: | ---: | ---: |',
  ...rows.map((r) => `| ${r.band.label} | ${r.band.from}–${r.band.to === 120 ? '…' : r.band.to}`
    + ` | ${r.eligible} | ${r.lived.toFixed(1)} |`),
  '',
  `La tranche la plus pauvre est **${worst.band.label}** (${worst.lived.toFixed(1)} tirables`,
  `une année donnée), la plus riche **${best.band.label}** (${best.lived.toFixed(1)}).`,
  `L’écart est de **${(best.lived / Math.max(0.01, worst.lived)).toFixed(1)}×**.`,
  '',
  'Un âge qu’on traverse sans que rien n’arrive est un trou que personne ne',
  'voit : un écran vide ressemble à un écran calme. C’est à cela que sert cette',
  'page, et c’est pourquoi `enfance.test.ts` en tient un plancher, année par',
  'année et non en moyenne.',
  '',
  '## Année par année',
  '',
  '*La moyenne par tranche cache les falaises. « Avant l’école » rendait 13,3 —',
  'bas, mais lisible comme une pente ; année par année c’était 1,4 à un an et',
  '2,8 à deux ans, puis 21,7 à quatre. Les vingt événements ajoutés par un audit',
  'précédent commençaient tous à trois ans ou plus, et la moyenne les masquait.*',
  '',
  '| Âge | Tirables | Âge | Tirables |',
  '| ---: | ---: | ---: | ---: |',
  ...years.slice(0, Math.ceil(years.length / 2)).map((y, i) => {
    const other = years[Math.ceil(years.length / 2) + i];
    return `| ${y.age} | ${y.lived.toFixed(1)} | ${other ? other.age : ''} `
      + `| ${other ? other.lived.toFixed(1) : ''} |`;
  }),
  '',
  thin.length
    ? `**Années creuses** (moins de ${YEAR_FLOOR} tirables) : ${thin.map((y) => `${y.age} ans`).join(', ')}.`
    : `**Aucune année creuse** : toutes passent ${YEAR_FLOOR} événements tirables.`,
  '',
];
writeFileSync('DENSITE_PAR_AGE.md', `${lines.join('\n')}\n`);
console.log('\nDENSITE_PAR_AGE.md écrit.');
