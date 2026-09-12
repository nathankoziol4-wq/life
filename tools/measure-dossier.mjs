/**
 * Contester, ou prendre ce qu'ils proposent ?
 *
 * **Pourquoi ce n'est pas mesuré sur des vies entières.** La première version
 * l'était, et elle ne pouvait rien apprendre : soixante-dix ans de salaires,
 * de loyers et d'héritages noient l'écart entre deux issues d'un même dossier,
 * et l'auto-joueur ne déclenchait qu'un seul des cinq motifs — sept cent
 * treize restructurations et rien d'autre, parce que l'insubordination, la
 * faute grave et les événements viennent de chemins qu'il ne joue pas. On
 * mesure donc le dossier lui-même, sur toute sa plage, ce qui est la question.
 *
 * Deux choses à vérifier :
 *
 *   1. **aucun des deux choix ne domine** — s'il en existe un qui gagne à
 *      toutes les forces, l'écran n'offre qu'une illusion de décision ;
 *   2. **le point de bascule tombe dans la plage qu'on rencontre vraiment**,
 *      sinon la décision est théorique.
 *
 *   node --experimental-strip-types tools/measure-dossier.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { applyToJob, offerBlocker } from '../src/systems/careers.ts';
import { askPromotion } from '../src/systems/workplace.ts';
import {
  advanceDismissal, caseOf, contest, feeOf, settlementOf, strengthOf,
} from '../src/systems/dismissal.ts';
import { GROUNDS, CASE_YEARS } from '../src/data/dismissal.ts';

const SALARY = 60_000;

/** Un dossier posé de toutes pièces, pour balayer la plage de force. */
function fileAt(state, { ground, years, warnings, performance, support }) {
  state.player.dismissal = {
    employer: 'Maison Vidal', jobId: 'lawyer', title: 'Associé', level: 3,
    salary: SALARY, years, warnings, performance, support,
    ground, year: state.year, settled: false, contestedYear: null,
  };
  return state.player.dismissal;
}

/** Ce que contester rapporte en moyenne, joué pour de vrai. */
function contestValue(seed0, spec, tries) {
  let total = 0;
  let wins = 0;
  let backAtWork = 0;
  for (let t = 0; t < tries; t++) {
    const state = createNewLife({ seed: seed0 + t * 31 });
    for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
    if (state.gameOver || !state.player.alive) continue;
    state.player.job = null;
    state.player.money = 500_000;
    const before = state.player.money;
    fileAt(state, spec);
    if (!contest(createCtx(state)).ok) continue;
    for (let i = 0; i <= CASE_YEARS && caseOf(state); i++) {
      state.year += 1;
      advanceDismissal(createCtx(state));
    }
    const gained = state.player.money - before;
    total += gained;
    // Retrouver sa place est une victoire, et la plus grosse : elle ne rapporte
    // pas d'argent tout de suite, elle rend la carrière. Comptée à deux années
    // de salaire, ce qui la sous-estime largement.
    if (state.player.job) { backAtWork += 1; wins += 1; total += SALARY * 2; }
    else if (gained > 0) wins += 1;
  }
  return { mean: total / tries, wins, backAtWork };
}

const TRIES = 60;
const base = createNewLife({ seed: 7 });
for (let i = 0; i < 30 && !base.gameOver; i++) simulateYear(base);

console.log('Ce que chaque choix vaut, à salaire égal (60 000) :');
console.log('force | négocier | contester (moyenne) | gagné | repris | meilleur');
const SPECS = [
  { ground: 'faute grave', years: 3, warnings: 2, performance: 40, support: -0.4 },
  { ground: 'faute grave', years: 12, warnings: 0, performance: 62, support: 0.3 },
  { ground: 'insuffisance professionnelle', years: 4, warnings: 1, performance: 38, support: -0.2 },
  { ground: 'insubordination', years: 8, warnings: 0, performance: 58, support: 0 },
  { ground: 'suite aux événements', years: 6, warnings: 0, performance: 55, support: 0.2 },
  { ground: 'restructuration', years: 2, warnings: 1, performance: 45, support: -0.3 },
  { ground: 'restructuration', years: 10, warnings: 0, performance: 60, support: 0.25 },
  { ground: 'restructuration', years: 16, warnings: 0, performance: 78, support: 0.8 },
];
const rows = [];
for (const spec of SPECS) {
  fileAt(base, spec);
  const strength = strengthOf(base);
  const deal = settlementOf(base);
  const fee = feeOf(base);
  const { mean, wins, backAtWork } = contestValue(4_000 + strength * 7, spec, TRIES);
  rows.push({ strength, deal, mean, spec });
  console.log(
    `${String(strength).padStart(5)} | ${String(Math.round(deal)).padStart(8)} |`
    + ` ${String(Math.round(mean)).padStart(19)} | ${String(wins).padStart(2)}/${TRIES} |`
    + ` ${String(backAtWork).padStart(6)} | ${mean > deal ? 'contester' : 'négocier'}`
    + `   (honoraires ${fee}, ${spec.ground})`,
  );
}

const flips = rows.filter((r, i) => i > 0 && (r.mean > r.deal) !== (rows[i - 1].mean > rows[i - 1].deal));
console.log('');
console.log(flips.length > 0
  ? `Le meilleur choix bascule ${flips.length} fois : aucun ne domine.`
  : 'ATTENTION : le même choix gagne partout — la décision est une illusion.');

/* Et la plage qu'on rencontre vraiment, en jouant. */
const seen = [];
for (let s = 0; s < 120; s++) {
  const state = createNewLife({ seed: s * 977 + 41 });
  for (let i = 0; i < 70 && !state.gameOver && state.player.alive; i++) {
    simulateYear(state);
    const p = state.player;
    if (!p.alive || p.prison) continue;
    if (!p.job && p.age >= 18 && !p.retired) {
      const offer = state.world.jobOffers
        .filter((o) => offerBlocker(state, o) === null)
        .sort((a, b) => b.salary - a.salary)[0];
      if (offer) applyToJob(createCtx(state), offer.id);
    }
    if (p.job && p.job.yearsAtJob >= 3) askPromotion(createCtx(state));
    const file = caseOf(state);
    if (file && file.contestedYear === null && !file.settled) {
      seen.push({ strength: strengthOf(state), ground: file.ground });
    }
  }
}
seen.sort((a, b) => a.strength - b.strength);
const q = (p) => seen[Math.floor(seen.length * p)]?.strength ?? 0;
console.log(`\nEn jouant, sur ${seen.length} dossiers rencontrés :`);
console.log(`  p10 ${q(0.1)} · médiane ${q(0.5)} · p90 ${q(0.9)}`);
const mix = new Map();
for (const x of seen) mix.set(x.ground, (mix.get(x.ground) ?? 0) + 1);
console.log('  motifs :', [...mix].map(([g, n]) => `${g} ${n}`).join(' · '));
console.log('  (les autres motifs viennent de chemins que l’auto-joueur ne joue pas :',
  GROUNDS.map((g) => g.id).filter((g) => !mix.has(g)).join(', '), ')');
