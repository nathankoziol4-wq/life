/**
 * Ce que se soigner demande aujourd'hui, et ce qu'on y décide.
 *
 * Le catalogue dit « les soins sont anonymes : ni praticien, ni réputation,
 * ni prix comparé », et trois autres manques autour : spécialistes,
 * accompagnement psychologique, dépendance — cure et rechute.
 *
 * Une lecture du code corrige déjà à moitié le premier point : quatre
 * praticiens existent, avec un prix et une qualité de diagnostic. Mais ils ne
 * servent qu'à **identifier** ; une fois le nom posé, `treatDisease` prend
 * l'argent et le traitement marche, sans personne dedans et sans risque.
 *
 * Avant d'ajouter quoi que ce soit, on mesure trois choses :
 *
 * 1. combien de maladies restent sans nom, et combien de gens meurent de ce
 *    qu'ils n'ont jamais fait regarder ;
 * 2. ce que payer un bon praticien plutôt qu'un généraliste rapporte
 *    réellement ;
 * 3. ce qu'il advient de la dépendance, qui monte dans tout le jeu et que
 *    rien ne soigne.
 *
 *   node --experimental-strip-types tools/measure-soins.mjs
 */

import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { DISEASES, DOCTOR_TYPES } from '../src/data/diseases.ts';

const LIVES = 90;
let lives = 0, sick = 0, undiagnosed = 0, treated = 0, everConsulted = 0;
let addicts = 0, peakAddiction = 0, addictionDeaths = 0, addictionYears = 0;
const causes = {};

for (let seed = 60_000; seed < 60_000 + LIVES; seed++) {
  const life = autoplayLife(seed, {
    each: (state) => {
      // On suit la dépendance pendant la vie, pas seulement à la fin :
      // l'état final ne dit rien d'une dépendance traversée puis passée.
      const a = state.player.stats.addiction;
      if (a > 45) addictionYears += 1;
      peakAddiction = Math.max(peakAddiction, a);
    },
  });
  lives++;
  const d = life.player.diseases ?? [];
  if (d.length > 0) sick++;
  undiagnosed += d.filter((x) => !x.diagnosed).length;
  treated += d.filter((x) => x.treated).length;
  if (life.timeline.some((e) => /Consultation|consultation/.test(e.text))) everConsulted++;
  if (life.player.stats.addiction > 45) addicts++;
  const cause = life.player.deathCause ?? '(vivant)';
  causes[cause] = (causes[cause] ?? 0) + 1;
  if (/dépendance/.test(cause)) addictionDeaths++;
}

console.log(`${lives} vies jouées`);
console.log(`  vies avec au moins une maladie à la fin : ${(sick / lives * 100).toFixed(0)} %`);
console.log(`  maladies jamais identifiées, par vie    : ${(undiagnosed / lives).toFixed(2)}`);
console.log(`  maladies traitées, par vie              : ${(treated / lives).toFixed(2)}`);
console.log(`  vies qui ont consulté au moins une fois : ${(everConsulted / lives * 100).toFixed(0)} %`);

console.log(`\nLA DÉPENDANCE`);
console.log(`  vies dépendantes à la fin      : ${(addicts / lives * 100).toFixed(0)} %`);
console.log(`  années passées au-dessus de 45 : ${(addictionYears / lives).toFixed(2)} par vie`);
console.log(`  morts qui la nomment           : ${addictionDeaths}`);
console.log(`  pic atteint sur l'échantillon  : ${Math.round(peakAddiction)}`);

console.log(`\nLES PRATICIENS : ${DOCTOR_TYPES.length}`);
for (const d of DOCTOR_TYPES) {
  console.log(`  ${d.name.padEnd(22)} ${String(d.cost).padStart(4)} · diagnostic ${Math.round(d.quality * 100)} %`
    + ` · ${d.categories.join(', ')}`);
}
// Ce qui n'a personne pour le soigner : les catégories qu'aucun praticien ne
// couvre, et celles que seul le plus cher couvre.
const covered = new Set(DOCTOR_TYPES.flatMap((d) => d.categories));
const all = new Set(DISEASES.map((d) => d.category));
console.log(`  catégories de maladies : ${[...all].join(', ')}`);
console.log(`  sans praticien         : ${[...all].filter((c) => !covered.has(c)).join(', ') || '(aucune)'}`);

/* ------------------------------------------------------------------ */

/**
 * La dépendance est-elle seulement atteignable ?
 *
 * Le pilote automatique ne joue ni ne sort : mesurer sur lui ne dit rien du
 * jeu, seulement du robot. On rejoue donc les mêmes vies avec quelqu'un qui
 * fait ce que le jeu propose — s'asseoir à la table, sortir — et l'on regarde
 * où la statistique monte, ce qu'elle déclenche, et **ce qu'on peut faire
 * pour en sortir**.
 *
 * Les seuils que le moteur lit ailleurs :
 *   > 50  les maladies liées deviennent 3,5 fois plus probables
 *   > 55  on entre ivre dans une affaire
 *   > 60  le risque de perdre son emploi est multiplié par 1,6
 *   > 65  la mort peut la nommer
 */
import { createNewLife } from '../src/engine/newLife.ts';
import { createCtx } from '../src/engine/context.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { autoTable } from '../src/systems/activities.ts';

const CROSSED = { 50: 0, 55: 0, 60: 0, 65: 0 };
let peaks = [];
let out = 0;

for (let seed = 0; seed < 60; seed++) {
  const life = createNewLife({ seed: 80_000 + seed });
  for (let y = 0; y < 20 && life.player.alive; y++) simulateYear(life);
  if (!life.player.alive) continue;
  life.player.money = Math.max(life.player.money, 400_000);

  let peak = 0;
  const crossed = new Set();
  for (let y = 0; y < 30 && life.player.alive; y++) {
    // Cinq passages à la table : ce que le jeu autorise dans une année.
    for (let i = 0; i < 5; i++) autoTable(createCtx(life), 200);
    peak = Math.max(peak, life.player.stats.addiction);
    for (const t of [50, 55, 60, 65]) if (life.player.stats.addiction > t) crossed.add(t);
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
  for (const t of crossed) CROSSED[t] += 1;
  peaks.push(peak);
  // Une fois arrivé là, qu'est-ce qui redescend tout seul ?
  const before = life.player.stats.addiction;
  for (let y = 0; y < 10 && life.player.alive; y++) simulateYear(life);
  if (before > 45) out += (before - life.player.stats.addiction) / 10;
}

peaks.sort((a, b) => a - b);
console.log(`\nQUELQU'UN QUI JOUE — ${peaks.length} vies, cinq parties par an pendant trente ans`);
console.log(`  pic de dépendance : médiane ${Math.round(peaks[Math.floor(peaks.length / 2)])}`
  + ` · maximum ${Math.round(peaks[peaks.length - 1])}`);
for (const t of [50, 55, 60, 65]) {
  console.log(`  franchit ${t} : ${(CROSSED[t] / peaks.length * 100).toFixed(0)} % des vies`);
}
console.log(`  ce qui redescend tout seul, par an : ${(out / Math.max(1, peaks.length)).toFixed(2)} point(s)`);
console.log(`  ce qu'on peut faire pour en sortir : (rien — aucune cure dans le jeu)`);

/* ------------------------------------------------------------------ */

/**
 * Et maintenant : peut-on en sortir, et à quel prix ?
 *
 * On amène quelqu'un au fond par le seul moyen que le jeu offre, puis on
 * essaie les quatre façons d'arrêter. Ce qu'on veut voir : qu'aucune ne
 * soit gratuite, qu'aucune ne soit sans espoir, et que **retourner jouer
 * pendant qu'on essaie** se paie vraiment.
 */
import { PROGRAMS } from '../src/data/recovery.ts';
import { GRIP, enrol, gripOf, relapses, tell } from '../src/systems/recovery.ts';

function sunk(seed) {
  const life = createNewLife({ seed: 70_000 + seed });
  for (let y = 0; y < 22 && life.player.alive; y++) simulateYear(life);
  if (!life.player.alive) return null;
  life.player.money = Math.max(life.player.money, 2_000_000);
  for (let y = 0; y < 8 && life.player.alive && life.player.stats.addiction < 90; y++) {
    for (let i = 0; i < 5; i++) autoTable(createCtx(life), 100);
    simulateYear(life);
    life.pending = [];
  }
  return life.player.alive && life.player.stats.addiction >= 80 ? life : null;
}

console.log(`\nEN SORTIR — 60 personnes amenées au-dessus de 80`);
for (const program of PROGRAMS) {
  for (const [tempted, witness] of [[false, true], [true, true], [false, false]]) {
    let freed = 0, years = 0, backs = 0, tried = 0;
    for (let seed = 0; seed < 60; seed++) {
      const life = sunk(seed);
      if (!life) continue;
      tried += 1;
      // Quelqu'un au courant : sans cela le groupe de parole ne s'ouvre même
      // pas, et l'on mesurerait un programme qui n'a jamais tourné.
      if (witness) {
        const close = Object.values(life.npcs).find((n) => n.alive && n.relationship >= 40);
        if (close) tell(createCtx(life), close.id);
      }
      let y = 0;
      for (; y < 40 && life.player.alive && gripOf(life) !== 'libre'; y++) {
        // On se réinscrit après chaque rechute : c'est ce que ferait
        // quelqu'un qui essaie vraiment.
        enrol(createCtx(life), program.id);
        if (tempted) autoTable(createCtx(life), 100);
        simulateYear(life);
        life.pending = [];
      }
      if (life.player.alive && life.player.stats.addiction < GRIP) { freed += 1; years += y; }
      backs += relapses(life);
    }
    if (tried === 0) continue;
    const how = tempted ? 'en continuant à jouer' : witness ? 'en arrêtant tout    ' : 'sans en parler       ';
    console.log(`  ${program.id.padEnd(7)} ${how}`
      + ` → s'en sortent ${(freed / tried * 100).toFixed(0)} %`
      + ` · en ${freed ? (years / freed).toFixed(1) : '—'} ans`
      + ` · ${(backs / tried).toFixed(1)} rechute(s)`);
  }
}

/** Ce que ferait quelqu'un qui essaie vraiment : le meilleur qu'il puisse payer. */
{
  let freed = 0, years = 0, backs = 0, tried = 0, spent = 0;
  for (let seed = 0; seed < 60; seed++) {
    const life = sunk(seed);
    if (!life) continue;
    tried += 1;
    const purse = life.player.money;
    const close = Object.values(life.npcs).find((n) => n.alive && n.relationship >= 40);
    if (close) tell(createCtx(life), close.id);
    let y = 0;
    for (; y < 40 && life.player.alive && gripOf(life) !== 'libre'; y++) {
      for (const program of [...PROGRAMS].reverse()) {
        if (enrol(createCtx(life), program.id).ok) break;
      }
      simulateYear(life);
      life.pending = [];
    }
    if (life.player.alive && life.player.stats.addiction < GRIP) { freed += 1; years += y; }
    backs += relapses(life);
    spent += purse - life.player.money;
  }
  console.log(`  ${'au mieux'.padEnd(7)} ${'en arrêtant tout    '}`
    + ` → s'en sortent ${(freed / tried * 100).toFixed(0)} %`
    + ` · en ${freed ? (years / freed).toFixed(1) : '—'} ans`
    + ` · ${(backs / tried).toFixed(1)} rechute(s)`
    + ` · ${Math.round(spent / tried).toLocaleString('fr-FR')} dépensés`);
}
