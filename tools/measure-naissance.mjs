/**
 * Les circonstances de naissance changent-elles quelque chose ?
 *
 * Quatre questions :
 *
 *   1. **se rencontrent-elles ?** Une circonstance à un pour mille n'existe
 *      pas ; une à un sur deux n'est plus une circonstance ;
 *   2. **naître avant terme se rattrape-t-il selon les moyens du foyer ?**
 *      C'est le seul endroit du jeu où la fortune des parents agit avant
 *      l'école. Si riches et pauvres finissent au même endroit, la pente ne
 *      sert à rien ;
 *   3. **le jumeau est-il quelqu'un ?** Une personne du même âge exact, ou
 *      une ligne dans une liste ;
 *   4. **l'enfant trouvé cherche-t-il vraiment plus mal ?**
 *
 *   node --experimental-strip-types tools/measure-naissance.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { BIRTH_MARKS } from '../src/data/birth.ts';
import { birthOf, drawMarks, mendRate, owedOf, twinOf } from '../src/systems/birth.ts';
import { leadOdds } from '../src/systems/roots.ts';

const pad = (x, n) => String(x).padStart(n);
const avg = (xs) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/* ------------------------------------------------------------------ */
/* 1. Se rencontrent-elles ?                                           */
/* ------------------------------------------------------------------ */

const N = 3000;
const seen = Object.fromEntries(BIRTH_MARKS.map((m) => [m.id, 0]));
let plain = 0;
for (let seed = 0; seed < N; seed++) {
  const state = createNewLife({ seed });
  const marks = birthOf(state).marks;
  if (marks.length === 0) plain += 1;
  for (const id of marks) seen[id] += 1;
}
console.log(`Sur ${N} naissances :\n`);
console.log('  circonstance      | annoncé | obtenu | une sur');
for (const mark of BIRTH_MARKS) {
  const got = seen[mark.id] / N;
  console.log(
    `  ${mark.label.padEnd(17)} | ${pad((mark.odds * 100).toFixed(1) + ' %', 7)}`
    + ` | ${pad((got * 100).toFixed(1) + ' %', 6)} | ${got > 0 ? Math.round(1 / got) : '—'}`,
  );
}
console.log(`\n  aucune circonstance : ${((plain / N) * 100).toFixed(1)} %`);

/* ------------------------------------------------------------------ */
/* 2. Le rattrapage suit-il les moyens du foyer ?                      */
/* ------------------------------------------------------------------ */

console.log('\n\nNaître avant terme, et ce que le foyer en rachète :\n');
{
  /*
   * On mesure la **santé à quinze ans**, pas la dette restante.
   *
   * Première version de cet outil : elle affichait « reste à rattraper » et
   * donnait zéro partout, y compris pour les foyers les plus démunis — parce
   * que `advanceBirth` remet la dette à zéro passé quatorze ans, la dette
   * cessant alors d'être une dette pour devenir la constitution du
   * personnage. La colonne mesurait donc ma propre borne, et pas l'effet.
   *
   * Le témoin est indispensable : la santé baisse aussi pour d'autres
   * raisons, et sans quelqu'un qui n'est pas né avant terme on ne saurait pas
   * ce qu'on lit.
   */
  const run = (keep) => {
    const rows = [];
    for (let seed = 0; seed < 12_000 && rows.length < 120; seed++) {
      const state = createNewLife({ seed });
      if (!keep(state)) continue;
      const means = String(state.player.flags.familyTier);
      const owed = owedOf(state);
      const rate = mendRate(state);
      // On relève la dette **avant** que la borne des quatorze ans ne la
      // remette à zéro : c'est le seul moment où elle est encore lisible.
      let last = owed;
      let clearedAt = null;
      for (let y = 0; y < 15 && !state.gameOver && state.player.alive; y++) {
        simulateYear(state);
        const now = owedOf(state);
        if (now <= 0 && clearedAt === null && state.player.age <= 14) {
          clearedAt = state.player.age;
        }
        if (state.player.age <= 14) last = now;
      }
      rows.push({
        means, rate, owed,
        repaid: owed - last,
        lost: clearedAt === null ? last : 0,
        clearedAt,
      });
    }
    return rows;
  };

  const early = run((s2) => birthOf(s2).marks.includes('avantTerme'));
  const bands = [
    ['famille en difficulté', (r) => r.means === 'poor'],
    ['famille modeste      ', (r) => r.means === 'modest'],
    ['classe moyenne       ', (r) => r.means === 'middle'],
    ['famille aisée        ', (r) => r.means === 'upper' || r.means === 'rich'],
  ];
  console.log('  milieu                | vies | rachat/an | rendu | jamais rendu | quitte à');
  for (const [label, keep] of bands) {
    const band = early.filter(keep);
    if (band.length === 0) { console.log(`  ${label} |    0 |`); continue; }
    const done = band.filter((r) => r.clearedAt !== null);
    console.log(
      `  ${label} | ${pad(band.length, 4)}`
      + ` | ${pad(avg(band.map((r) => r.rate)).toFixed(2), 9)}`
      + ` | ${pad(avg(band.map((r) => r.repaid)).toFixed(1), 5)}`
      + ` | ${pad(avg(band.map((r) => r.lost)).toFixed(1), 12)}`
      + ` | ${pad(done.length > 0 ? `${avg(done.map((r) => r.clearedAt)).toFixed(1)} ans` : 'jamais', 8)}`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* 3. Le jumeau est-il quelqu'un ?                                     */
/* ------------------------------------------------------------------ */

console.log('\n\nLe jumeau :\n');
{
  let found = 0;
  for (let seed = 0; seed < 4000 && found < 5; seed++) {
    const state = createNewLife({ seed });
    if (!birthOf(state).marks.includes('jumeau')) continue;
    const twin = twinOf(state);
    if (!twin) { console.log(`  graine ${seed} : annoncé, mais personne`); found += 1; continue; }
    const parents = Object.values(state.npcs)
      .filter((x) => x.childrenIds.includes(twin.id)).length;
    console.log(
      `  graine ${pad(seed, 4)} : ${twin.firstName} ${twin.lastName}, ${twin.age} an(s),`
      + ` ${twin.relation}, ${parents} parent(s) en commun, relation ${Math.round(twin.relationship)}`,
    );
    found += 1;
  }
  if (found === 0) console.log('  aucun jumeau en 4000 graines');
}

/* ------------------------------------------------------------------ */
/* 4. L'enfant trouvé cherche-t-il plus mal ?                          */
/* ------------------------------------------------------------------ */

console.log('\n\nChercher ses origines, selon la manière dont on est arrivé :\n');
{
  const sample = (how) => {
    for (let seed = 0; seed < 20_000; seed++) {
      const state = createNewLife({ seed });
      if (state.player.roots?.how !== how) continue;
      return state;
    }
    return null;
  };
  console.log('  arrivée   | chance de la meilleure piste');
  for (const how of ['adoption', 'accueil', 'trouvé']) {
    const state = sample(how);
    if (!state) { console.log(`  ${how.padEnd(9)} | aucune vie trouvée`); continue; }
    state.player.age = 25;
    const best = Math.max(
      ...['registre', 'famille', 'foyer', 'annonce', 'test']
        .map((id) => leadOdds(state, id)),
    );
    console.log(`  ${how.padEnd(9)} | ${(best * 100).toFixed(1)} %`);
  }
}

/* ------------------------------------------------------------------ */
/* 5. La bête du foyer meurt-elle pendant l'enfance ?                  */
/* ------------------------------------------------------------------ */

console.log('\n\nLa bête déjà là :\n');
{
  const ages = [];
  let checked = 0;
  for (let seed = 0; seed < 3000 && checked < 60; seed++) {
    const state = createNewLife({ seed });
    if (!birthOf(state).marks.includes('beteDejaLa')) continue;
    if (state.player.pets.length === 0) continue;
    checked += 1;
    const id = state.player.pets[0].id;
    for (let y = 0; y < 25 && !state.gameOver && state.player.alive; y++) {
      simulateYear(state);
      if (!state.player.pets.some((x) => x.id === id)) { ages.push(state.player.age); break; }
    }
  }
  console.log(`  vies observées   : ${checked}`);
  console.log(`  bête partie      : ${ages.length}`);
  console.log(`  âge de l’enfant  : ${avg(ages).toFixed(1)} ans en moyenne`);
  console.log(`  avant 18 ans     : ${ages.filter((a) => a < 18).length}/${ages.length}`);
}

/* ------------------------------------------------------------------ */
/* 6. Le tirage est-il stable ?                                        */
/* ------------------------------------------------------------------ */

console.log('\n\nLa même graine donne-t-elle toujours la même arrivée ?');
{
  const a = createNewLife({ seed: 777 });
  const b = createNewLife({ seed: 777 });
  console.log(`  ${JSON.stringify(drawMarks(a))} · ${JSON.stringify(drawMarks(b))}`
    + ` — identiques : ${JSON.stringify(drawMarks(a)) === JSON.stringify(drawMarks(b))}`);
}
