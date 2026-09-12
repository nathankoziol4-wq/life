/**
 * Ce que le bureau donne, et ce qu'il coûte.
 *
 * On joue la même vie autant de fois qu'il y a de rythmes, en ne changeant
 * que la portion prise chaque année. Deux questions, et la seconde est celle
 * qui décide si le système est un arbitrage ou une aubaine :
 *
 *   1. les rythmes se distinguent-ils, ou bien y a-t-il un meilleur choix
 *      évident qu'on prendrait sans réfléchir ?
 *   2. **se faire prendre coûte-t-il ?** On compare, à l'intérieur d'un même
 *      rythme, les vies où quelqu'un a regardé et trouvé et celles où non.
 *
 *   node --experimental-strip-types tools/measure-bureau.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { applyToJob, offerBlocker } from '../src/systems/careers.ts';
import { askPromotion } from '../src/systems/workplace.ts';
import { help, helpBlocker, reachOf, suspicionOf } from '../src/systems/office.ts';
import { HELPINGS } from '../src/data/office.ts';

const RHYTHMS = [
  { id: 'honnête', pick: () => null },
  ...HELPINGS.map((h) => ({ id: h.id, pick: () => h.id })),
  { id: 'prudent', pick: (s) => (suspicionOf(s) > 18 ? null : 'large') },
];

function live(seed, rhythm) {
  const state = createNewLife({ seed });
  let taken = 0;
  let peakReach = 0;
  let peakSalary = 0;
  let yearsWorked = 0;
  for (let i = 0; i < 70 && !state.gameOver && state.player.alive; i++) {
    simulateYear(state);
    const p = state.player;
    if (!p.alive || p.prison) continue;

    // Un joueur ordinaire : il prend le meilleur poste offert et demande de
    // l'avancement. La trajectoire est la même pour tous les rythmes.
    if (!p.job && p.age >= 18 && !p.retired) {
      const offer = state.world.jobOffers
        .filter((o) => offerBlocker(state, o) === null)
        .sort((a, b) => b.salary - a.salary)[0];
      if (offer) applyToJob(createCtx(state), offer.id);
    }
    if (p.job && p.job.yearsAtJob >= 3) askPromotion(createCtx(state));
    if (!p.job) continue;
    yearsWorked += 1;
    peakReach = Math.max(peakReach, reachOf(state));
    peakSalary = Math.max(peakSalary, p.job.salary);

    const pick = rhythm.pick(state);
    if (pick === null) continue;
    if (helpBlocker(state) !== null) continue;
    const before = p.money;
    if (help(createCtx(state), pick).ok) taken += p.money - before;
  }
  const p = state.player;
  return {
    worth: Number(p.flags.finalNetWorth ?? p.money),
    earned: p.lifetimeEarnings,
    caught: p.chronicle.caughtAtWork ?? 0,
    taken,
    peakReach,
    peakSalary,
    yearsWorked,
    jailed: p.criminalRecord.convictions.filter((c) => c.sentenceYears > 0).length,
    convicted: p.criminalRecord.convictions.length,
  };
}

const N = 220;
const median = (xs) => (xs.length === 0 ? 0 : [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]);
const q = (xs, p) => (xs.length === 0 ? 0 : [...xs].sort((a, b) => a - b)[Math.floor(xs.length * p)]);
const pad = (x, n) => String(Math.round(x)).padStart(n);

const all = new Map();
console.log('rythme      | gains de la vie | patrimoine méd. |  p75 |  p90 | pris ≥1× | années travaillées');
for (const rhythm of RHYTHMS) {
  const rows = [];
  for (let s = 0; s < N; s++) rows.push(live(s * 1301 + 11, rhythm));
  all.set(rhythm.id, rows);
  console.log(
    `${rhythm.id.padEnd(11)} | ${pad(median(rows.map((r) => r.earned)), 15)} |`
    + ` ${pad(median(rows.map((r) => r.worth)), 15)} |`
    + ` ${pad(q(rows.map((r) => r.worth), 0.75), 4)} |`
    + ` ${pad(q(rows.map((r) => r.worth), 0.9), 4)} |`
    + ` ${pad(rows.filter((r) => r.caught > 0).length, 4)}/${N} |`
    + ` ${pad(median(rows.map((r) => r.yearsWorked)), 6)}`,
  );
}

console.log('');
console.log('Se faire prendre, à rythme égal :');
console.log('rythme      | jamais pris : gains / carrière | pris : gains / carrière | peines');
for (const [id, rows] of all) {
  const clean = rows.filter((r) => r.caught === 0);
  const hit = rows.filter((r) => r.caught > 0);
  if (hit.length === 0) continue;
  console.log(
    `${id.padEnd(11)} | ${pad(median(clean.map((r) => r.earned)), 12)} / ${pad(median(clean.map((r) => r.peakSalary)), 9)}`
    + ` | ${pad(median(hit.map((r) => r.earned)), 12)} / ${pad(median(hit.map((r) => r.peakSalary)), 8)}`
    + ` | ${pad(hit.filter((r) => r.jailed > 0).length, 4)}/${hit.length}`
    + ` · condamnés ${pad(hit.filter((r) => r.convicted > 0).length, 4)}/${hit.length}`,
  );
}
