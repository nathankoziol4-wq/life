/**
 * L'audience change-t-elle quelque chose, et pas trop ?
 *
 * Quatre questions, dans l'ordre où elles peuvent invalider le système :
 *
 *   1. **un joueur qui lit bat-il un joueur qui tape au hasard ?** Sinon les
 *      décisions ne sont qu'un rituel avant le dé ;
 *   2. **l'avocat achète-t-il quelque chose ?** Il ne multiplie plus la
 *      probabilité : il décide de ce qu'on voit. Si voir ne sert à rien, on a
 *      simplement retiré un effet sans en mettre un autre ;
 *   3. **le dossier compte-t-il toujours plus que la plaidoirie ?** Une
 *      audience ne doit pas effacer une preuve accablante, sinon le calcul
 *      d'avant — qui était bon — ne veut plus rien dire ;
 *   4. **le chemin automatique est-il correct sans être meilleur ?**
 *
 *   node --experimental-strip-types tools/measure-audience.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { arrest, goToTrial, pendingTrial, pleadFor } from '../src/systems/justice.ts';
import {
  answer, autoStance, chargesOf, currentCharge, hearingDone, openHearing,
  readOf, solidityOf, swingOf,
} from '../src/systems/hearing.ts';
import { CRIME_MAP, LAWYERS } from '../src/data/crimes.ts';

/** Une vie adulte avec une affaire ouverte sur un délit donné. */
function accused(seed, crimeId) {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.money = 900_000;
  arrest(createCtx(state), CRIME_MAP[crimeId], 0);
  return pendingTrial(state) ? state : null;
}

const PLAYERS = {
  /* Tape au hasard, sans regarder. */
  hasard: (state, i) => ['concéder', 'contester', 'taire'][(i * 7 + state.seed) % 3],
  /* Cède tout : le joueur qui n'ose rien. */
  docile: () => 'concéder',
  /* Conteste tout : le joueur qui n'a pas compris la ressource. */
  furieux: () => 'contester',
  /* Lit ce qu'il peut, et décide en fonction. */
  lecteur: (state) => {
    const charge = currentCharge(state);
    if (!charge) return 'concéder';
    const read = readOf(state, charge);
    if (!read) return 'taire';
    const mid = (read.low + read.high) / 2;
    return mid < 42 ? 'contester' : 'concéder';
  },
  /* Ce que fait l'avocat quand on le laisse faire. */
  auto: (state) => {
    const charge = currentCharge(state);
    return charge ? autoStance(state, charge) : 'concéder';
  },
};

function play(seed, crimeId, lawyerId, pick) {
  const state = accused(seed, crimeId);
  if (!state) return null;
  const trial = pendingTrial(state);
  openHearing(createCtx(state), lawyerId);
  let i = 0;
  while (!hearingDone(state)) {
    answer(createCtx(state), pick(state, i));
    i += 1;
  }
  const swing = swingOf(state);
  const before = state.player.criminalRecord.convictions.length;
  goToTrial(createCtx(state), lawyerId);
  return {
    swing,
    evidence: trial.evidence,
    convicted: state.player.criminalRecord.convictions.length > before,
  };
}

const N = 260;
const CRIMES_TESTED = ['burglary', 'fraud_big', 'embezzle'];
const pct = (a, b) => (b === 0 ? '—' : `${((a / b) * 100).toFixed(1)} %`);

console.log('Ce que la plaidoirie change, avec un avocat de quartier :');
console.log('joueur   | déplacement moyen | condamné');
for (const [id, pick] of Object.entries(PLAYERS)) {
  let swing = 0;
  let convicted = 0;
  let n = 0;
  for (let s = 0; s < N; s++) {
    const row = play(s * 613 + 5, CRIMES_TESTED[s % 3], 'standard', pick);
    if (!row) continue;
    n += 1;
    swing += row.swing;
    if (row.convicted) convicted += 1;
  }
  console.log(`${id.padEnd(8)} | ${(swing / n).toFixed(1).padStart(17)} | ${pct(convicted, n).padStart(8)} (${n} vies)`);
}

console.log('');
console.log('Ce que l’avocat achète — même joueur, même lecture :');
console.log('avocat            | charges lisibles | déplacement moyen | condamné');
for (const lawyer of LAWYERS) {
  let swing = 0;
  let convicted = 0;
  let seen = 0;
  let total = 0;
  let n = 0;
  for (let s = 0; s < N; s++) {
    const state = accused(s * 613 + 5, CRIMES_TESTED[s % 3]);
    if (!state) continue;
    openHearing(createCtx(state), lawyer.id);
    for (const c of chargesOf(state)) {
      total += 1;
      if (readOf(state, c)) seen += 1;
    }
    let i = 0;
    while (!hearingDone(state)) { answer(createCtx(state), PLAYERS.lecteur(state, i)); i += 1; }
    swing += swingOf(state);
    const before = state.player.criminalRecord.convictions.length;
    goToTrial(createCtx(state), lawyer.id);
    if (state.player.criminalRecord.convictions.length > before) convicted += 1;
    n += 1;
  }
  console.log(
    `${lawyer.name.padEnd(17)} | ${pct(seen, total).padStart(16)} |`
    + ` ${(swing / n).toFixed(1).padStart(17)} | ${pct(convicted, n).padStart(8)}`,
  );
}

console.log('');
console.log('Le dossier compte-t-il toujours plus que la plaidoirie ?');
for (const crimeId of CRIMES_TESTED) {
  let lo = 0; let hi = 0; let nLo = 0; let nHi = 0;
  let convLo = 0; let convHi = 0;
  for (let s = 0; s < N; s++) {
    const state = accused(s * 613 + 5, crimeId);
    if (!state) continue;
    const trial = pendingTrial(state);
    const thin = trial.evidence < 50;
    openHearing(createCtx(state), 'standard');
    let i = 0;
    while (!hearingDone(state)) { answer(createCtx(state), PLAYERS.lecteur(state, i)); i += 1; }
    const before = state.player.criminalRecord.convictions.length;
    goToTrial(createCtx(state), 'standard');
    const conv = state.player.criminalRecord.convictions.length > before;
    if (thin) { nLo += 1; lo += trial.evidence; if (conv) convLo += 1; }
    else { nHi += 1; hi += trial.evidence; if (conv) convHi += 1; }
  }
  console.log(
    `  ${crimeId.padEnd(10)} preuve mince (${(lo / Math.max(1, nLo)).toFixed(0)}) → condamné ${pct(convLo, nLo)}`
    + ` · preuve lourde (${(hi / Math.max(1, nHi)).toFixed(0)}) → condamné ${pct(convHi, nHi)}`,
  );
}

console.log('');
{
  let conv = 0; let n = 0;
  for (let s = 0; s < N; s++) {
    const state = accused(s * 613 + 5, CRIMES_TESTED[s % 3]);
    if (!state) continue;
    const before = state.player.criminalRecord.convictions.length;
    pleadFor(createCtx(state), 'standard');
    if (state.player.criminalRecord.convictions.length > before) conv += 1;
    n += 1;
  }
  console.log(`« Laisser plaider » : condamné ${pct(conv, n)} sur ${n} vies.`);
}

/* Et la répartition des solidités : s'il n'y a rien de creux, rien à gagner. */
{
  const all = [];
  for (let s = 0; s < 120; s++) {
    const state = accused(s * 613 + 5, CRIMES_TESTED[s % 3]);
    if (!state) continue;
    for (const c of chargesOf(state)) all.push(solidityOf(state, c));
  }
  all.sort((a, b) => a - b);
  const q = (p) => all[Math.floor(all.length * p)];
  console.log(`\nsolidité des charges, sur ${all.length} : p10 ${q(0.1)} · médiane ${q(0.5)} · p90 ${q(0.9)}`);
  console.log(`  creuses (<42) : ${pct(all.filter((x) => x < 42).length, all.length)}`);
}
