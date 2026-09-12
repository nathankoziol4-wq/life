/**
 * Ce qu'une relation abîmée produit aujourd'hui.
 *
 * Le catalogue dit « une relation peut baisser, jamais devenir une inimitié
 * avec ses propres actions ». Une lecture du code le confirme d'un autre
 * côté : `estranged` n'apparaît jamais que dans des filtres — il *retire* la
 * personne des amis, de l'exposition, des actions — et ne déclenche rien.
 * Quelqu'un avec qui on s'est fâché devient absent, pas hostile.
 *
 * On mesure donc trois choses avant d'écrire quoi que ce soit :
 *
 * 1. combien de liens finissent au plus bas, et par quel chemin ;
 * 2. ce qui arrive au joueur ensuite — la réponse attendue est « rien » ;
 * 3. si l'on peut réparer, et à quel prix.
 *
 *   node --experimental-strip-types tools/measure-inimitie.mjs
 */

import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { interact } from '../src/systems/relationships.ts';
import { apologise, grudgeOf, hostile, sorryBlocker } from '../src/systems/grudges.ts';
import { SPITES } from '../src/data/grudges.ts';

const LIVES = 80;

let lives = 0, people = 0, estranged = 0, atFloor = 0, hostileHistory = 0;
const byRelation = {};

for (let seed = 12_000; seed < 12_000 + LIVES; seed++) {
  const life = autoplayLife(seed);
  lives++;
  for (const npc of Object.values(life.npcs)) {
    if (npc.petSpecies) continue;
    people++;
    if (npc.estranged) {
      estranged++;
      byRelation[npc.relation] = (byRelation[npc.relation] ?? 0) + 1;
    }
    if (npc.relationship <= 2) atFloor++;
    // Une histoire qui parlerait d'hostilité : il n'y en a pas.
    if (npc.history.some((h) => /rancune|ennemi|vengeance|nui/i.test(h.text))) hostileHistory++;
  }
}

const pct = (n) => `${(n / people * 100).toFixed(1)} %`;
console.log(`${lives} vies · ${people} personnes\n`);
console.log(`ponts coupés            ${estranged}  ${pct(estranged)}  (${(estranged / lives).toFixed(2)} par vie)`);
console.log(`lien au plancher (≤2)   ${atFloor}  ${pct(atFloor)}`);
console.log(`une trace d’hostilité   ${hostileHistory}  ${pct(hostileHistory)}`);
console.log(`par lien : ${Object.entries(byRelation).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ') || '(aucun)'}`);

/* ---- Ce qui arrive au joueur ensuite ---- */
function play(life, years) {
  for (let y = 0; y < years && !life.gameOver; y++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const p of [...life.pending]) resolvePending(ctx, p.id, 0);
    life.pending = [];
  }
}

// Combien d'ennemis une vie jouée ordinairement se fait-elle toute seule ?
// Trop, et le jeu devient hostile sans qu'on l'ait cherché ; zéro, et le
// système n'existe que pour qui va le chercher exprès.
let hostiles = 0, sores = 0, withEnemy = 0, spiteLines = 0, forgiven = 0;
for (let seed = 12_000; seed < 12_000 + LIVES; seed++) {
  const life = autoplayLife(seed);
  let any = false;
  for (const npc of Object.values(life.npcs)) {
    if (npc.petSpecies) continue;
    if (grudgeOf(npc) > 0) sores++;
    if (hostile(npc)) { hostiles++; any = true; }
    if (npc.flags?.forgiven) forgiven++;
  }
  if (any) withEnemy++;
  spiteLines += life.timeline.filter((e) => SPITES.some(
    (s) => e.text.includes(s.told.replace('{p} ', '').slice(0, 18)))).length;
}
console.log(`\nAPRÈS — une vie jouée ordinairement`);
console.log(`  vies avec au moins un ennemi : ${(withEnemy / LIVES * 100).toFixed(0)} %`);
console.log(`  ennemis par vie              : ${(hostiles / LIVES).toFixed(2)} · rancunes tièdes ${(sores / LIVES).toFixed(2)}`);
console.log(`  coups portés, par vie        : ${(spiteLines / LIVES).toFixed(2)}`);

// La porte est-elle trop étroite ? Une rancune demande une opinion déjà
// basse ; si personne n'y descend jamais, le chemin organique est théorique.
let lowOpinion = 0, seen = 0, refusedPleas = 0;
for (let seed = 12_000; seed < 12_000 + LIVES; seed++) {
  const life = autoplayLife(seed);
  for (const npc of Object.values(life.npcs)) {
    if (npc.petSpecies) continue;
    seen++;
    if (npc.opinion <= 34) lowOpinion++;
    if (npc.history.some((h) => /sans réponse/.test(h.text))) refusedPleas++;
  }
}
console.log(`  opinion ≤ 34 (la porte)      : ${(lowOpinion / seen * 100).toFixed(1)} % des gens`);
console.log(`  appels à l’aide sans réponse : ${(refusedPleas / LIVES).toFixed(2)} par vie`);

// Et si on cherche la bagarre ?
const life = createNewLife({ seed: 777 });
play(life, 28);
const victim = Object.values(life.npcs).find(
  (n) => n.alive && !n.petSpecies && ['friend', 'brother', 'sister', 'coworker'].includes(n.relation),
);
if (!victim) console.log('\n(aucun proche à fâcher sur cette graine)');
else {
  const before = { reputation: life.player.stats.reputation, happiness: life.player.stats.happiness };
  for (let y = 0; y < 4; y++) {
    for (let i = 0; i < 3; i++) interact(createCtx(life), victim.id, 'insult');
    play(life, 1);
  }
  console.log(`\nEN CHERCHANT LA BAGARRE avec ${victim.firstName} (${victim.relation})`);
  console.log(`  opinion ${victim.opinion.toFixed(0)} · rancune ${grudgeOf(victim).toFixed(0)} · hostile ${hostile(victim)}`);
  const mates = Object.values(life.npcs).filter((n) => n.alive && n.id !== victim.id && !n.petSpecies);
  const bondBefore = mates.reduce((a, n) => a + n.relationship, 0) / Math.max(1, mates.length);
  play(life, 12);
  const bondAfter = mates.reduce((a, n) => a + n.relationship, 0) / Math.max(1, mates.length);
  console.log(`  douze ans plus tard :`);
  console.log(`    réputation      ${before.reputation.toFixed(0)} → ${life.player.stats.reputation.toFixed(0)}`);
  console.log(`    bonheur         ${before.happiness.toFixed(0)} → ${life.player.stats.happiness.toFixed(0)}`);
  console.log(`    lien moyen aux autres ${bondBefore.toFixed(1)} → ${bondAfter.toFixed(1)}`);
  console.log(`    coups reçus     ${victim.history.filter((h) => SPITES.some((s) => h.text === s.line)).length}`);
  console.log(`    rancune restante ${grudgeOf(victim).toFixed(0)}`);

  // Et si l'on s'excuse ?
  let tries = 0, ok = false;
  while (!sorryBlocker(life, victim) && tries < 6) {
    tries++;
    const r = apologise(createCtx(life), victim.id);
    if (/pardonne/.test(r.message)) { ok = true; break; }
    life.year += 2;
  }
  console.log(`    excuses : ${tries} tentative(s) → ${ok ? 'pardonné' : `rancune ${grudgeOf(victim).toFixed(0)}`}`);
}
