/**
 * Embaucher quelqu'un vaut-il mieux qu'embaucher un effectif ?
 *
 * Quatre questions :
 *
 *   1. **le choix est-il un arbitrage ?** Si le meilleur candidat est toujours
 *      le bon choix, il n'y a rien à décider ;
 *   2. **deux bons battent-ils quatre moyens ?** C'est la promesse du système,
 *      et elle se vérifie ou elle est fausse ;
 *   3. **payer au rabais coûte-t-il vraiment ?** Sinon, négocier est gratuit
 *      et il n'y a qu'un bouton ;
 *   4. **l'ancienneté paie-t-elle ?** Sinon, il n'y a aucune raison de garder
 *      quelqu'un plutôt que de le remplacer.
 *
 *   node --experimental-strip-types tools/measure-equipe.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { MORALE_START, RESTLESS } from '../src/data/crew.ts';
import {
  crewMorale, crewOf, crewSkill, crewWorth, offer, openShortlist, payroll,
  raise, skillOf, worthOf,
} from '../src/systems/crew.ts';
import { forecast, foundBusiness, hireStaff, wageOf } from '../src/systems/venture.ts';
import { getBusinessKind } from '../src/data/ventures.ts';

const pad = (x, n) => String(x).padStart(n);
const avg = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/**
 * Un patron installé, avec de quoi payer et une maison qui a de la demande.
 *
 * **Le renom et la qualité sont posés, et c'est indispensable.** Le chiffre
 * d'affaires vaut `min(capacité, demande)` : une maison qui vient d'ouvrir
 * n'a pas de demande, si bien qu'un bras de plus n'ajoute que du coût. Mesuré
 * sur un café neuf, à effectif **anonyme** — donc sans rien de ce fichier :
 *
 *     0 salarié  →  +4 297
 *     2 salariés →  −7 942
 *     4 salariés → −65 172
 *
 * Embaucher y est perdant quoi qu'on fasse. Ma première mesure comparait donc
 * des compositions d'équipe dans un régime où aucune équipe ne vaut la peine,
 * et concluait que le talent coûte sans rien rapporter. Avec de la demande
 * (renom 70, qualité 70), le même café gagne 84 269 avec quatre salariés
 * contre 12 750 sans personne.
 */
function boss(seed, { kindId = 'cafe', cash = 600_000, renown = 70, quality = 70 } = {}) {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  const p = state.player;
  if (state.gameOver || !p.alive || p.prison) return null;
  p.money = 900_000;
  p.business = null;
  if (!foundBusiness(createCtx(state), kindId).ok) return null;
  p.business.cash = cash;
  p.business.renown = renown;
  p.business.quality = quality;
  p.yearActions = {};
  return state;
}

/** Embaucher `n` personnes en visant un profil, au salaire demandé. */
function staffUp(state, n, pick) {
  const b = state.player.business;
  const kind = getBusinessKind(b.kindId);
  const wage = wageOf(state, kind);
  let taken = 0;
  for (let round = 0; round < n * 4 && taken < n; round++) {
    state.player.yearActions = {};
    if (!openShortlist(createCtx(state), b, wage).ok) break;
    const list = [...(b.shortlist ?? [])];
    if (list.length === 0) break;
    const want = pick(list);
    if (!want) break;
    if (offer(createCtx(state), b, want.personId, want.asking).ok) taken += 1;
  }
  return taken;
}

const BEST = (list) => list.reduce((a, b) => (a.competence > b.competence ? a : b));
const WORST = (list) => list.reduce((a, b) => (a.competence < b.competence ? a : b));

/* ------------------------------------------------------------------ */
/* 1-2. Deux bons contre quatre moyens                                 */
/* ------------------------------------------------------------------ */

console.log('Composer une équipe, dans une maison qui a de la demande :\n');
console.log('  équipe                  | têtes | compétence | équivalents | masse salariale | bénéfice');
for (const [label, count, pick] of [
  ['témoin, effectif anonyme', 4, null],
  ['deux très bons          ', 2, BEST],
  ['deux quelconques        ', 2, WORST],
  ['quatre quelconques      ', 4, WORST],
  ['quatre très bons        ', 4, BEST],
]) {
  const rows = [];
  for (let s = 0; s < 24; s++) {
    const state = boss(3_000 + s);
    if (!state) continue;
    const b = state.player.business;
    if (pick === null) {
      // Le témoin : l'ancien comportement, un effectif sans personne derrière.
      for (let i = 0; i < count; i++) {
        state.player.yearActions = {};
        hireStaff(createCtx(state), 1);
      }
      if (b.staff < count) continue;
    } else if (staffUp(state, count, pick) < count) continue;
    // Le renom et la qualité sont reposés : embaucher les dilue, et l'on veut
    // comparer des équipes, pas des trajectoires de qualité.
    b.renown = 70;
    b.quality = 70;
    const kind = getBusinessKind(b.kindId);
    rows.push({
      heads: b.staff,
      skill: crewSkill(b) ?? 0,
      worth: crewWorth(b),
      pay: payroll(b, wageOf(state, kind)),
      profit: forecast(state).profit,
    });
  }
  if (rows.length === 0) { console.log(`  ${label} | aucune`); continue; }
  console.log(
    `  ${label} | ${pad(Math.round(avg(rows.map((r) => r.heads))), 5)}`
    + ` | ${pad(Math.round(avg(rows.map((r) => r.skill))), 10)}`
    + ` | ${pad(avg(rows.map((r) => r.worth)).toFixed(1), 11)}`
    + ` | ${pad(Math.round(avg(rows.map((r) => r.pay))), 15)}`
    + ` | ${pad(Math.round(avg(rows.map((r) => r.profit))), 8)}`,
  );
}

/* ------------------------------------------------------------------ */
/* 3. Payer au rabais                                                  */
/* ------------------------------------------------------------------ */

console.log('\n\nCe que payer en dessous de la prétention coûte, sur dix ans :\n');
console.log('  ce qu’on verse | moral au départ | moral à 10 ans | encore là | compétence perdue');
for (const share of [1.1, 1, 0.85, 0.7]) {
  const rows = [];
  let stayed = 0;
  let started = 0;
  for (let s = 0; s < 24; s++) {
    const state = boss(5_000 + s);
    if (!state) continue;
    const b = state.player.business;
    const kind = getBusinessKind(b.kindId);
    const wage = wageOf(state, kind);
    state.player.yearActions = {};
    if (!openShortlist(createCtx(state), b, wage).ok) continue;
    const want = BEST([...(b.shortlist ?? [])]);
    if (!want) continue;
    const skillBefore = want.competence;
    if (!offer(createCtx(state), b, want.personId, Math.round(want.asking * share)).ok) continue;
    started += 1;
    const moraleStart = crewOf(b)[0]?.morale ?? 0;
    for (let y = 0; y < 10 && state.player.alive && !state.gameOver; y++) simulateYear(state);
    const still = crewOf(b).find((h) => h.personId === want.personId);
    if (still) stayed += 1;
    rows.push({
      moraleStart,
      moraleEnd: still?.morale ?? 0,
      lost: still ? 0 : skillBefore,
    });
  }
  if (started === 0) continue;
  console.log(
    `  ${pad(`${Math.round(share * 100)} %`, 14)} | ${pad(Math.round(avg(rows.map((r) => r.moraleStart))), 15)}`
    + ` | ${pad(Math.round(avg(rows.filter((r) => r.moraleEnd > 0).map((r) => r.moraleEnd))), 14)}`
    + ` | ${pad(`${stayed}/${started}`, 9)} | ${pad(Math.round(avg(rows.map((r) => r.lost))), 17)}`,
  );
}

/* ------------------------------------------------------------------ */
/* 4. L'ancienneté                                                     */
/* ------------------------------------------------------------------ */

console.log('\n\nCe que l’ancienneté ajoute :\n');
{
  const state = boss(11);
  if (state) {
    const b = state.player.business;
    const kind = getBusinessKind(b.kindId);
    openShortlist(createCtx(state), b, wageOf(state, kind));
    const want = [...(b.shortlist ?? [])].sort((a, c) => a.competence - c.competence)[0];
    if (want) {
      offer(createCtx(state), b, want.personId, Math.round(want.asking * 1.15));
      console.log('  année | compétence | vaut | moral');
      for (let y = 0; y <= 12 && state.player.alive && !state.gameOver; y++) {
        const hire = crewOf(b).find((h) => h.personId === want.personId);
        if (!hire) { console.log(`  ${pad(y, 5)} | parti`); break; }
        if (y % 3 === 0) {
          console.log(
            `  ${pad(y, 5)} | ${pad(Math.round(skillOf(hire)), 10)}`
            + ` | ${pad(worthOf(hire).toFixed(2), 4)} | ${pad(Math.round(hire.morale), 5)}`,
          );
        }
        simulateYear(state);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* 5. Augmenter rattrape-t-il ?                                        */
/* ------------------------------------------------------------------ */

console.log('\n\nAugmenter quelqu’un qu’on paie mal :\n');
{
  let saved = 0;
  let lost = 0;
  for (let s = 0; s < 24; s++) {
    for (const doRaise of [true, false]) {
      const state = boss(7_000 + s);
      if (!state) continue;
      const b = state.player.business;
      const kind = getBusinessKind(b.kindId);
      const wage = wageOf(state, kind);
      state.player.yearActions = {};
      if (!openShortlist(createCtx(state), b, wage).ok) continue;
      const want = BEST([...(b.shortlist ?? [])]);
      if (!want || !offer(createCtx(state), b, want.personId, Math.round(want.asking * 0.72)).ok) continue;
      for (let y = 0; y < 8 && state.player.alive && !state.gameOver; y++) {
        state.player.yearActions = {};
        if (doRaise) raise(createCtx(state), b, want.personId);
        simulateYear(state);
      }
      const still = crewOf(b).some((h) => h.personId === want.personId);
      if (doRaise) { if (still) saved += 1; } else if (still) lost += 1;
    }
  }
  console.log(`  encore là après huit ans — en augmentant : ${saved}/24 · sans rien faire : ${lost}/24`);
  console.log(`  (moral de départ ${MORALE_START}, on cherche ailleurs en dessous de ${RESTLESS})`);
}
