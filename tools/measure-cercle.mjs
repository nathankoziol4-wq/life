/**
 * Ce que vaut le cercle, mesuré sur des vies jouées.
 *
 * Cinq questions, et chacune peut condamner le système :
 *
 * 1. **peut-on seulement en fonder un ?** Il faut de la réputation et un peu
 *    d'argent : si personne n'y arrive, le reste est théorique ;
 * 2. **cela grandit-il, et jusqu'où ?** Un cercle qui reste à quatre n'est pas
 *    un système, c'est un décor ;
 * 3. **cela dérive-t-il vraiment tout seul**, et la présence du joueur y
 *    change-t-elle quelque chose ? C'est la mécanique centrale ;
 * 4. **la tension est-elle réelle ?** Le joueur qui vise la taille et celui qui
 *    vise la main doivent obtenir des choses **incompatibles**. Si les deux
 *    politiques finissent au même endroit, le système ne raconte rien ;
 * 5. **le dehors réagit-il ?** Sinon le repli et l'intensité ne coûtent rien.
 *
 *   node --experimental-strip-types tools/measure-cercle.mjs [vies]
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { CALLS } from '../src/data/circle.ts';
import {
  circleOf, driftOf, found, foundBlocker, gesture, holdCeiling, holds, setCare,
} from '../src/systems/circle.ts';

const LIVES = Number(process.argv[2] ?? 40);
const YEARS = 30;

/** Une vie amenée à l'âge et à la réputation où l'on peut fonder. */
function founderAt(seed, callId) {
  const life = createNewLife({ seed });
  for (let i = 0; i < 26 && !life.gameOver && life.player.alive; i += 1) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
  }
  if (life.gameOver || !life.player.alive || life.player.prison) return null;
  life.player.money = Math.max(life.player.money, 60_000 * life.world.inflation);
  if (foundBlocker(life, callId) !== null) return null;
  if (!found(createCtx(life), callId).ok) return null;
  return life;
}

/** Joue le cercle pendant `YEARS` ans avec une politique. */
function run(seed, callId, policy) {
  const life = founderAt(seed, callId);
  if (!life) return null;
  let peak = 0;
  let lostHoldAt = null;
  let troubles = 0;
  const before = life.player.money;
  for (let i = 0; i < YEARS && !life.gameOver && life.player.alive; i += 1) {
    const c = circleOf(life);
    if (!c) break;
    policy(life, c);
    const entries = simulateYear(life).entries;
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
    troubles += entries.filter((e) => /poser des questions/.test(e.text)).length;
    const after = circleOf(life);
    if (!after) break;
    peak = Math.max(peak, after.people);
    if (!holds(life) && lostHoldAt === null) lostHoldAt = i + 1;
  }
  const c = circleOf(life);
  return {
    alive: Boolean(c),
    people: c?.people ?? 0,
    peak,
    inward: Math.round(c?.inward ?? 0),
    fervour: Math.round(c?.fervour ?? 0),
    regard: Math.round(c?.regard ?? 0),
    hold: Math.round(c?.hold ?? 0),
    held: c ? holds(life) : false,
    lostHoldAt,
    troubles,
    drawn: life.player.money - before,
    purse: Math.round(c?.purse ?? 0),
  };
}

/* Trois politiques, et la troisième est le témoin. */
const grow = (life, c) => {
  // Vise la taille : on demande davantage, on ne s'ouvre jamais.
  setCare(createCtx(life), 'entier');
  if (c.fervour < 88) gesture(createCtx(life), 'demander');
};

const keep = (life, c) => {
  // Vise la main : on ramène les deux versants dès qu'ils montent.
  setCare(createCtx(life), 'entier');
  if (!holds(life)) { gesture(createCtx(life), 'reprendre'); return; }
  if (c.inward > 45) gesture(createCtx(life), 'ouvrir');
  else if (c.fervour > 45) gesture(createCtx(life), 'calmer');
  else gesture(createCtx(life), 'reprendre');
};

const away = (life) => { setCare(createCtx(life), 'absent'); };

const POLICIES = { 'vise la taille': grow, 'vise la main': keep, 'n’y va plus': away };

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const pct = (x) => `${(x * 100).toFixed(0)} %`;

/* 1 — peut-on en fonder un ? */
let tried = 0;
let could = 0;
for (let seed = 800_000; seed < 800_000 + LIVES * 4 && tried < LIVES * 2; seed += 1) {
  tried += 1;
  if (founderAt(seed, 'entraide')) could += 1;
}
console.log(`— ${LIVES} cercles, ${YEARS} ans chacun —\n`);
console.log('1. PEUT-ON EN FONDER UN');
console.log(`   vies qui y arrivent : ${pct(could / Math.max(1, tried))} sur ${tried} essais`);

/* 2 à 4 — les trois politiques, sur les mêmes graines. */
console.log('\n2-4. LES TROIS POLITIQUES (mêmes graines)');
console.log('POLITIQUE'.padEnd(18), 'monde'.padStart(7), 'sommet'.padStart(8), 'repli'.padStart(7), 'ardeur'.padStart(8), 'regard'.padStart(8), 'main'.padStart(6), 'garde'.padStart(7), 'ennuis'.padStart(8));
const seeds = [];
for (let seed = 800_000; seed < 800_000 + LIVES * 6 && seeds.length < LIVES; seed += 1) {
  if (founderAt(seed, 'entraide')) seeds.push(seed);
}
const byPolicy = new Map();
for (const [name, policy] of Object.entries(POLICIES)) {
  const rows = seeds.map((s) => run(s, 'entraide', policy)).filter(Boolean);
  byPolicy.set(name, rows);
  console.log(
    name.padEnd(18),
    mean(rows.map((r) => r.people)).toFixed(0).padStart(7),
    mean(rows.map((r) => r.peak)).toFixed(0).padStart(8),
    mean(rows.map((r) => r.inward)).toFixed(0).padStart(7),
    mean(rows.map((r) => r.fervour)).toFixed(0).padStart(8),
    mean(rows.map((r) => r.regard)).toFixed(0).padStart(8),
    mean(rows.map((r) => r.hold)).toFixed(0).padStart(6),
    pct(rows.filter((r) => r.held).length / Math.max(1, rows.length)).padStart(7),
    mean(rows.map((r) => r.troubles)).toFixed(1).padStart(8),
  );
}

/*
 * La tension ne se lit pas entre « vise la taille » et « vise la main » — les
 * deux amènent à peu près autant de monde. Elle se lit entre **être là et ne
 * pas y être** : c'est l'absence qui fait le plus gros cercle et qui le perd.
 * La première version comparait la mauvaise paire, et concluait qu'il n'y avait
 * pas de tension parce qu'elle n'était pas là où on la cherchait.
 */
console.log('\n4 bis. OÙ EST LA TENSION');
for (const [name, rows] of byPolicy) {
  console.log(
    `   ${name.padEnd(16)} : ${mean(rows.map((r) => r.peak)).toFixed(0).padStart(4)} au sommet`
    + ` · main ${mean(rows.map((r) => r.hold)).toFixed(0).padStart(3)}`
    + ` · garde ${pct(rows.filter((r) => r.held).length / Math.max(1, rows.length)).padStart(5)}`
    + ` · plafond que la taille autorise ${mean(rows.map((r) => holdCeiling(r.people))).toFixed(0)}`,
  );
}

console.log('\n3 bis. LA DÉRIVE, ET CE QUE LA PRÉSENCE Y CHANGE');
{
  const life = founderAt(seeds[0], 'veille');
  if (life) {
    const c = circleOf(life);
    for (const care of ['absent', 'présent', 'entier']) {
      setCare(createCtx(life), care);
      for (const people of [10, 200, 700]) {
        c.people = people;
        const d = driftOf(life);
        process.stdout.write(`   ${care.padEnd(8)} ${String(people).padStart(3)} pers. → repli +${d.inward} ardeur +${d.fervour}\n`);
      }
    }
  }
}

console.log('\n5. CE QUE CHAQUE RASSEMBLEMENT DEVIENT (politique « n’y va plus »)');
for (const call of CALLS) {
  const rows = seeds.slice(0, Math.min(20, seeds.length))
    .map((s) => run(s, call.id, away)).filter(Boolean);
  if (rows.length === 0) { console.log(`   ${call.label.padEnd(24)} : aucune graine`); continue; }
  console.log(
    `   ${call.label.padEnd(24)} : ${mean(rows.map((r) => r.people)).toFixed(0).padStart(4)} pers.`
    + ` · repli ${mean(rows.map((r) => r.inward)).toFixed(0).padStart(3)}`
    + ` · ardeur ${mean(rows.map((r) => r.fervour)).toFixed(0).padStart(3)}`
    + ` · regard ${mean(rows.map((r) => r.regard)).toFixed(0).padStart(3)}`
    + ` · ennuis ${mean(rows.map((r) => r.troubles)).toFixed(1)}`
    + ` · survit ${pct(rows.filter((r) => r.alive).length / rows.length)}`,
  );
}
