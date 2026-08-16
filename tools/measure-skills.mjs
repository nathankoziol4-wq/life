/**
 * Ce qu'on sait faire, mesuré.
 *
 * Trois questions, et chacune peut condamner le réglage :
 *
 * 1. **Le don est-il rare ?** Si tout le monde est doué pour quelque chose,
 *    le chercher n'a pas d'intérêt.
 * 2. **Une vie jouée sans y penser apprend-elle quand même ?** Le métier,
 *    l'école et les goûts doivent suffire à faire monter quelque chose,
 *    sinon la compétence n'est qu'un bouton de plus.
 * 3. **Est-ce que s'y mettre paie ?** On compare deux vies sur la même
 *    graine : l'une qui travaille sa compétence de métier, l'autre non.
 *
 *   node --experimental-strip-types tools/measure-skills.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import {
  aptitudeOf, bestSkill, giftKnown, knownSkills, levelOf, practice,
  practiceBlocker, skillOfJob,
} from '../src/systems/skills.ts';
import { SKILLS, rankOf } from '../src/data/skills.ts';

const LIVES = 120;

/* ---- 1. La distribution du don ---- */
const apts = [];
for (let seed = 0; seed < 3000; seed++) {
  const fake = { seed, player: {} };
  for (const s of SKILLS) apts.push(aptitudeOf(fake, s.id));
}
apts.sort((a, b) => a - b);
const q = (f) => apts[Math.floor(apts.length * f)];
const gifted = apts.filter((a) => a >= 86).length / apts.length;
const hopeless = apts.filter((a) => a < 30).length / apts.length;
console.log('LE DON');
console.log(`  p10 ${q(0.1)} · médiane ${q(0.5)} · p90 ${q(0.9)}`);
console.log(`  « c’est là, sans effort » ${(gifted * 100).toFixed(1)} % · « ça ne vient pas » ${(hopeless * 100).toFixed(1)} %`);

// Combien de vies ont au moins un vrai don, et combien en ont plusieurs.
let withOne = 0, many = 0;
for (let seed = 0; seed < 3000; seed++) {
  const fake = { seed, player: {} };
  const n = SKILLS.filter((s) => aptitudeOf(fake, s.id) >= 78).length;
  if (n >= 1) withOne++;
  if (n >= 3) many++;
}
console.log(`  vies avec au moins un don marqué : ${(withOne / 3000 * 100).toFixed(0)} % · avec trois ou plus : ${(many / 3000 * 100).toFixed(0)} %`);

/* ---- 2. Une vie jouée sans y penser ---- */
function play(life, years, train) {
  for (let y = 0; y < years && !life.gameOver; y++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
    if (train) {
      const skill = skillOfJob(life);
      if (skill && !practiceBlocker(life, skill.id)) practice(createCtx(life), skill.id);
    }
  }
  return life;
}

let anySkill = 0, known = 0, best = 0, lvlSum = 0, alive = 0;
const tops = {};
for (let seed = 5000; seed < 5000 + LIVES; seed++) {
  const life = play(createNewLife({ seed }), 60, false);
  if (!life.player.alive && life.player.age < 25) continue;
  alive++;
  const rows = knownSkills(life);
  if (rows.length > 0) anySkill++;
  known += SKILLS.filter((s) => giftKnown(life, s.id)).length;
  const top = bestSkill(life);
  if (top) { best++; tops[top.skill.id] = (tops[top.skill.id] ?? 0) + 1; }
  lvlSum += rows.reduce((a, r) => Math.max(a, r.held.level), 0);
}
console.log(`\nUNE VIE JOUÉE SANS S’EN OCCUPER (${alive} vies, 60 ans)`);
console.log(`  a au moins une compétence entamée : ${(anySkill / alive * 100).toFixed(0)} %`);
console.log(`  atteint « ça vient » quelque part : ${(best / alive * 100).toFixed(0)} %`);
console.log(`  meilleur niveau moyen : ${(lvlSum / alive).toFixed(1)} (${rankOf(lvlSum / alive)})`);
console.log(`  dons connus par vie : ${(known / alive).toFixed(2)} sur 10`);
console.log(`  compétences dominantes : ${Object.entries(tops).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);

/* ---- 3. Est-ce que s'y mettre paie ? ---- */
// Deux vies sur la même graine, avec le même auto-joueur : la seule
// différence est qu'une des deux travaille la compétence de son métier.
const { autoplayLife } = await import('../src/engine/__bench__/autoplay.ts');

// Le salaire de fin de vie ne dit rien : presque tout le monde meurt
// retraité, à zéro des deux côtés. On relève donc le meilleur salaire atteint,
// en passant le même crochet aux deux vies — l'une note seulement, l'autre
// note et s'entraîne.
let spent = 0, sessions = 0;
const peaks = new WeakMap();
const watch = (life) => {
  peaks.set(life, Math.max(peaks.get(life) ?? 0, life.player.job?.salary ?? 0));
};
const train = (life) => {
  watch(life);
  const skill = skillOfJob(life);
  if (!skill || practiceBlocker(life, skill.id)) return;
  const before = life.player.money;
  practice(createCtx(life), skill.id);
  spent += before - life.player.money;
  sessions += 1;
};

let pairs = 0, lvlTrained = 0, lvlNot = 0;
let payWins = 0, payTies = 0, worthWins = 0, peakNot = 0, peakTrained = 0;
for (let seed = 8000; seed < 8000 + LIVES; seed++) {
  const a = autoplayLife(seed, { each: watch });
  const b = autoplayLife(seed, { each: train });
  if (a.player.careerHistory.length === 0 && b.player.careerHistory.length === 0) continue;
  pairs++;
  const top = (life) => Math.max(0, ...knownSkills(life).map((r) => r.held.level));
  lvlNot += top(a); lvlTrained += top(b);
  const payA = peaks.get(a) ?? 0, payB = peaks.get(b) ?? 0;
  peakNot += payA; peakTrained += payB;
  if (payB > payA) payWins++; else if (payB === payA) payTies++;
  if (Number(b.player.flags.finalNetWorth ?? 0) > Number(a.player.flags.finalNetWorth ?? 0)) worthWins++;
}
const decided = pairs - payTies;
console.log(`\nS’Y METTRE, OU NON (${pairs} paires sur la même graine, auto-joueur identique)`);
console.log(`  meilleure compétence   sans ${(lvlNot / pairs).toFixed(1)}  ·  avec ${(lvlTrained / pairs).toFixed(1)}`);
console.log(`  meilleur salaire tenu  sans ${Math.round(peakNot / pairs).toLocaleString('fr-FR')}  ·  avec ${Math.round(peakTrained / pairs).toLocaleString('fr-FR')}`);
console.log(`  finit mieux payé       ${payWins}/${decided} fois (${(payWins / Math.max(1, decided) * 100).toFixed(0)} %)`);
console.log(`  finit plus riche       ${worthWins}/${pairs} fois (${(worthWins / pairs * 100).toFixed(0)} %)`);
console.log(`  dépensé en cours       ${Math.round(spent / pairs).toLocaleString('fr-FR')} par vie, sur ${(sessions / pairs).toFixed(1)} séances`);
