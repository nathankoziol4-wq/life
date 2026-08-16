/**
 * Que font les PNJ pendant qu'on ne les regarde pas ?
 *
 * On compte ce qui est *arrivé*, pas l'état final : mesurer `incarcerated` à
 * la fin ne dit pas qui est passé par la prison, seulement qui y est encore.
 * Chaque tournant laisse une ligne dans l'histoire de la personne, et c'est
 * cette ligne qu'on compte.
 *
 *   node --experimental-strip-types tools/measure-npc.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { TURNS } from '../src/data/lives.ts';

const LIVES = 60;

// Chaque tournant par sa ligne : c'est la seule trace fiable.
const MARKS = Object.fromEntries(TURNS.map((t) => [t.id, t.line.replace(/\{e\}/g, '')]));
// Ce que le joueur lit : la partie fixe de chaque phrase, après le prénom.
const TOLD = TURNS.map((t) => t.told.replace('{p} ', '').replace(/\{e\}/g, '').slice(0, 14));

const turns = Object.fromEntries(TURNS.map((t) => [t.id, 0]));
let lives = 0, years = 0, npcs = 0, adults = 0;
let historyLines = 0, empty = 0, far = 0, ill = 0, jailed = 0;
let kidsTotal = 0, kidsMax = 0, journal = 0;
const wealth = [];

for (let seed = 1000; seed < 1000 + LIVES; seed++) {
  const life = createNewLife({ seed });
  for (let y = 0; y < 80 && !life.gameOver; y++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
    years++;
  }
  lives++;
  // Les lignes de PNJ : elles ont toutes la forme « Nom Prénom — … ».
  journal += life.timeline.filter((e) => TOLD.some((t) => e.text.includes(t))).length;

  for (const npc of Object.values(life.npcs)) {
    if (npc.petSpecies) continue;
    npcs++;
    if (npc.age >= 25) {
      adults++;
      kidsTotal += npc.childrenIds.length;
      kidsMax = Math.max(kidsMax, npc.childrenIds.length);
      wealth.push(npc.wealth);
    }
    historyLines += npc.history.length;
    if (npc.history.length === 0) empty++;
    if (npc.flags?.far) far++;
    if (npc.flags?.illness) ill++;
    if (npc.incarcerated) jailed++;
    for (const line of npc.history) {
      for (const [id, mark] of Object.entries(MARKS)) {
        if (line.text.replace(/e\.$/, '.') === mark || line.text === mark) { turns[id]++; break; }
      }
    }
  }
}

wealth.sort((a, b) => a - b);
const q = (f) => wealth[Math.floor(wealth.length * f)] ?? 0;
const per = (n) => (n / npcs * 100).toFixed(1) + ' %';
const each = (n) => (n / npcs).toFixed(2);

console.log(`${lives} vies · ${years} années · ${npcs} PNJ (dont ${adults} adultes)\n`);
console.log('TOURNANTS PRIS (par personne, sur toute sa vie)');
for (const t of TURNS) {
  console.log(`  ${t.id.padEnd(14)} ${String(turns[t.id]).padStart(6)}   ${each(turns[t.id]).padStart(6)}/pers   ${per(turns[t.id])}`);
}
console.log(`\nÉTAT À LA FIN`);
console.log(`  loin                ${per(far)}`);
console.log(`  malade              ${per(ill)}`);
console.log(`  en prison           ${per(jailed)}`);
console.log(`\nENFANTS  moyenne ${(kidsTotal / Math.max(1, adults)).toFixed(2)} par adulte · max ${kidsMax}`);
console.log(`PATRIMOINE  médiane ${Math.round(q(0.5)).toLocaleString('fr-FR')} · p10 ${Math.round(q(0.1)).toLocaleString('fr-FR')} · p90 ${Math.round(q(0.9)).toLocaleString('fr-FR')}`);
console.log(`HISTOIRE  ${(historyLines / npcs).toFixed(1)} lignes/PNJ · ${per(empty)} sans aucune ligne`);
console.log(`JOURNAL DU JOUEUR  ${(journal / lives).toFixed(1)} lignes de PNJ par vie`);
