/**
 * Pourquoi le joueur se marie-t-il moins ?
 *
 * Le tableau d'équilibrage est passé de 51 % de mariés et 1,22 enfant par
 * vie à 41 % et 0,71 depuis que les PNJ vivent leur vie. On cherche par où.
 *
 *   node --experimental-strip-types tools/measure-couple.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';

const LIVES = 120;
let lives = 0, married = 0, kids = 0;
let crushes = 0, crushTaken = 0, spouseIll = 0, spouseDead = 0, spouseJailed = 0, spouseFar = 0;
let prospectsSeen = 0, prospectsFree = 0;

for (let seed = 3000; seed < 3000 + LIVES; seed++) {
  const life = createNewLife({ seed });
  const seenCrush = new Set();
  for (let y = 0; y < 90 && !life.gameOver; y++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
    for (const npc of Object.values(life.npcs)) {
      if (npc.relation === 'crush' && !seenCrush.has(npc.id)) {
        seenCrush.add(npc.id);
        prospectsSeen++;
        if (npc.maritalStatus === 'single' || npc.maritalStatus === 'divorced'
          || npc.maritalStatus === 'widowed') prospectsFree++;
      }
    }
  }
  lives++;
  crushes += seenCrush.size;
  if (life.player.chronicle.marriages > 0) married++;
  kids += Object.values(life.npcs).filter((p) => p.relation === 'son' || p.relation === 'daughter').length;
  for (const npc of Object.values(life.npcs)) {
    if (!['spouse', 'partner', 'ex'].includes(npc.relation)) continue;
    if (npc.flags?.illness) spouseIll++;
    if (!npc.alive) spouseDead++;
    if (npc.incarcerated) spouseJailed++;
    if (npc.flags?.far) spouseFar++;
  }
  for (const npc of Object.values(life.npcs)) {
    if (npc.relation === 'crush' && (npc.maritalStatus === 'married' || npc.maritalStatus === 'dating')) crushTaken++;
  }
}

console.log(`${lives} vies`);
console.log(`mariés            ${(married / lives * 100).toFixed(0)} %`);
console.log(`enfants par vie   ${(kids / lives).toFixed(2)}`);
console.log(`prétendants vus   ${(crushes / lives).toFixed(2)} par vie · ${(prospectsFree / Math.max(1, prospectsSeen) * 100).toFixed(0)} % libres à la rencontre`);
console.log(`prétendants pris à la fin  ${(crushTaken / lives).toFixed(2)} par vie`);
console.log(`conjoints/ex — malades ${(spouseIll / lives).toFixed(2)} · morts ${(spouseDead / lives).toFixed(2)} · en prison ${(spouseJailed / lives).toFixed(2)} · loin ${(spouseFar / lives).toFixed(2)} (par vie)`);
