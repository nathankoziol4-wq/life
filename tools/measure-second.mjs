/**
 * Ce que vaut le deuxième poste, mesuré sur des carrières jouées.
 *
 * Cinq questions, et chacune peut condamner le système :
 *
 * 1. **y a-t-il seulement un premier poste ?** Un système greffé sur l'emploi
 *    ne vaut rien si l'emploi n'arrive pas ;
 * 2. **cela rapporte-t-il ?** Sinon c'est une ligne qu'on ne prendra jamais ;
 * 3. **cela coûte-t-il la carrière ?** C'est la seule chose que ce système
 *    prétend arbitrer. Si la performance et les promotions ne bougent pas,
 *    prendre des heures à côté est gratuit et il n'y a pas de décision ;
 * 4. **les six postes se départagent-ils ?** Payé, fatigant, discret : si l'un
 *    gagne sur les trois, les cinq autres sont des lignes mortes ;
 * 5. **cela finit-il par se savoir**, et à des rythmes différents ?
 *
 *   node --experimental-strip-types tools/measure-second.mjs [vies]
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { SHIFTS } from '../src/data/moonlight.ts';
import { applyToJob, offerBlocker } from '../src/systems/careers.ts';
import { careerDrag, moonlightOf, setHours, takeBlocker, takeShift } from '../src/systems/moonlight.ts';

const LIVES = Number(process.argv[2] ?? 60);
const YEARS = 30;

/** Un joueur qui postule dès qu'une offre est ouverte, et rien de plus. */
function keepAJob(life) {
  if (life.player.job) return;
  const ok = (life.world.jobOffers ?? []).filter((o) => offerBlocker(life, o) === null);
  if (ok.length) applyToJob(createCtx(life), ok[0].id);
}

/**
 * Joue une carrière, avec ou sans deuxième poste.
 *
 * `hours` à `null` : on ne prend rien, et c'est le témoin.
 */
function run(seed, shiftId, hours) {
  const life = createNewLife({ seed });
  // On amène le personnage à l'âge de travailler sans rien décider pour lui.
  for (let i = 0; i < 22 && !life.gameOver && life.player.alive; i += 1) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
  }
  if (life.gameOver || !life.player.alive) return null;

  let earned = 0;
  let years = 0;
  let caughtAt = null;
  const before = life.player.money;
  for (let i = 0; i < YEARS && !life.gameOver && life.player.alive; i += 1) {
    keepAJob(life);
    if (shiftId && !moonlightOf(life) && takeBlocker(life, shiftId) === null) {
      takeShift(createCtx(life), shiftId);
      if (hours) setHours(createCtx(life), hours);
    }
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
    const m = moonlightOf(life);
    if (m) { earned = m.earned; years += 1; if (m.known && caughtAt === null) caughtAt = years; }
  }
  const p = life.player;
  return {
    gained: p.money - before,
    salary: p.job?.salary ?? 0,
    performance: p.job?.performance ?? 0,
    level: p.job?.level ?? 0,
    employed: Boolean(p.job),
    health: Math.round(p.stats.health),
    stress: Math.round(p.stats.stress),
    earned,
    years,
    caughtAt,
    drag: careerDrag(life),
  };
}

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const fmt = (x) => Math.round(x).toLocaleString('fr-FR');

/* 1 — le premier poste arrive-t-il ? */
const control = [];
for (let seed = 700_000; seed < 700_000 + LIVES * 3 && control.length < LIVES; seed += 1) {
  const row = run(seed, null, null);
  if (row) control.push({ seed, ...row });
}
console.log(`— ${control.length} carrières, ${YEARS} ans chacune —\n`);
console.log('1. LE PREMIER POSTE');
console.log(`   ont un poste à la fin  : ${Math.round((control.filter((r) => r.employed).length / control.length) * 100)} %`);
console.log(`   salaire final moyen    : ${fmt(mean(control.map((r) => r.salary)))}`);
console.log(`   performance moyenne    : ${mean(control.map((r) => r.performance)).toFixed(1)}`);
console.log(`   niveau atteint         : ${mean(control.map((r) => r.level)).toFixed(2)}`);

/* 2 à 5 — chaque poste de complément, sur les mêmes graines. */
console.log('\n2-4. CE QUE CHAQUE POSTE DONNE (mêmes graines que le témoin)');
console.log('POSTE'.padEnd(26), 'gagné en plus'.padStart(15), 'perf.'.padStart(7), 'niveau'.padStart(7), 'santé'.padStart(6), 'stress'.padStart(7), 'su après'.padStart(9));
const base = {
  gained: mean(control.map((r) => r.gained)),
  performance: mean(control.map((r) => r.performance)),
  level: mean(control.map((r) => r.level)),
  health: mean(control.map((r) => r.health)),
  stress: mean(control.map((r) => r.stress)),
};
console.log(
  'aucun (témoin)'.padEnd(26),
  fmt(base.gained).padStart(15),
  base.performance.toFixed(1).padStart(7),
  base.level.toFixed(2).padStart(7),
  base.health.toFixed(0).padStart(6),
  base.stress.toFixed(0).padStart(7),
  '—'.padStart(9),
);
for (const shift of SHIFTS) {
  const rows = [];
  for (const c of control) {
    const row = run(c.seed, shift.id, shift.max);
    if (row) rows.push(row);
  }
  const caught = rows.filter((r) => r.caughtAt !== null);
  console.log(
    shift.label.padEnd(26),
    fmt(mean(rows.map((r) => r.gained)) - base.gained).padStart(15),
    mean(rows.map((r) => r.performance)).toFixed(1).padStart(7),
    mean(rows.map((r) => r.level)).toFixed(2).padStart(7),
    mean(rows.map((r) => r.health)).toFixed(0).padStart(6),
    mean(rows.map((r) => r.stress)).toFixed(0).padStart(7),
    (caught.length ? `${mean(caught.map((r) => r.caughtAt)).toFixed(1)} ans` : 'jamais').padStart(9),
    ` · su ${Math.round((caught.length / Math.max(1, rows.length)) * 100)} %`,
  );
}

/* 3 bis — la traîne existe-t-elle vraiment, et est-elle nulle sans rien à côté ? */
console.log('\n3 bis. LA TRAÎNE SUR LA CARRIÈRE');
// Le témoin n'est pas exactement à zéro : quelques vies tiennent aussi une
// entreprise ou reprennent des études, et la traîne les compte — c'est le
// but. Ce qu'on vérifie ici est qu'un plein temps seul ne coûte rien.
console.log(`   témoin (emploi seul, ou presque) : ${mean(control.map((r) => r.drag)).toFixed(2)}`);
for (const shift of [SHIFTS[0], SHIFTS[4]]) {
  const light = [];
  const heavy = [];
  for (const c of control.slice(0, Math.min(20, control.length))) {
    const a = run(c.seed, shift.id, shift.min);
    const b = run(c.seed, shift.id, shift.max);
    if (a) light.push(a);
    if (b) heavy.push(b);
  }
  console.log(
    `   ${shift.label.padEnd(20)} : ${shift.min} h → perf. ${mean(light.map((r) => r.performance)).toFixed(1)}`
    + ` · ${shift.max} h → perf. ${mean(heavy.map((r) => r.performance)).toFixed(1)}`,
  );
}
