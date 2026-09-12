/**
 * Combien de choix une vie propose vraiment, et changent-ils ?
 *
 * La demande est claire : « je ne veux plus avoir l'impression d'avoir fait
 * toutes les actions disponibles après vingt minutes ». Avant de construire
 * quoi que ce soit, il faut savoir où l'on part.
 *
 * Première surprise en regardant le code plutôt qu'en le supposant : **le
 * moteur contextuel existe déjà**. `getAvailableActions(état, cible, contexte)`
 * tient une quarantaine d'actions sur quatre contextes, chacune avec la raison
 * pour laquelle elle est bloquée. Trois écrans s'en servent — le travail,
 * l'école, la prison — et **l'écran des proches, non** : il affiche quatre
 * lignes écrites à la main.
 *
 * On mesure donc deux choses : ce que le moteur sait déjà proposer, et ce que
 * l'écran en montre.
 *
 *   node --experimental-strip-types tools/measure-choix.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { getAvailableActions, playableActions } from '../src/systems/actions.ts';
import { availableRequests } from '../src/systems/asking.ts';

/**
 * Ce que l'écran « Proches » propose aujourd'hui devant une personne.
 *
 * Reproduit les lignes écrites en dur dans `RelationshipsScreen`. C'est ce
 * que le joueur voit — pas ce que le moteur saurait offrir.
 */
function screenOffers(state, person) {
  const p = state.player;
  const out = [];
  if (!person.alive) return out;
  if (!person.incarcerated) out.push('talk', 'time', 'compliment');
  if (!person.incarcerated && p.money > 0) out.push('gift');
  if (['mother', 'father', 'stepmother', 'stepfather'].includes(person.relation)) {
    for (const r of availableRequests(state)) out.push(`ask:${r.id}`);
  }
  out.push('giveMoney', 'askMoney');
  return out;
}

function play(life, years) {
  for (let y = 0; y < years && !life.gameOver && life.player.alive; y++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

/* ------------------------------------------------------------------ */
/* 1. La même personne, à quatre âges                                  */
/* ------------------------------------------------------------------ */

const AGES = [6, 16, 35, 70];
const engine = {};
const screen = {};

/**
 * Une vie dont la mère est encore là à soixante-dix ans.
 *
 * La première version prenait une graine au hasard : la mère mourait avant
 * trente-cinq ans et les deux âges qui comptent le plus dans la demande
 * affichaient « personne ». On mesurait la mortalité, pas le menu.
 */
function lifeWithLongLivedMother() {
  for (let seed = 0; seed < 400; seed++) {
    const state = createNewLife({ seed: 4_000 + seed });
    const motherId = Object.values(state.npcs).find((n) => n.relation === 'mother')?.id;
    if (!motherId) continue;
    const snapshots = {};
    let ok = true;
    for (const age of AGES) {
      play(state, age - state.player.age);
      const m = state.npcs[motherId];
      if (!state.player.alive || !m?.alive) { ok = false; break; }
      snapshots[age] = { state, m };
      engine[age] = playableActions(state, m, 'général').map((a) => a.id);
      screen[age] = screenOffers(state, m);
      variants[age] = playableActions(state, m, 'général')
        .reduce((n, a) => n + Math.max(1, a.approaches?.length ?? 1), 0);
      // Les lignes fermées comptent aussi : elles disent au joueur ce qui
      // existe et ce qui lui manque pour y accéder.
      shut[age] = getAvailableActions(state, m, 'général')
        .filter((a) => a.blocked !== null).map((a) => a.id);
    }
    if (ok) return seed;
  }
  return null;
}

const variants = {};
const shut = {};
const found = lifeWithLongLivedMother();
if (found === null) console.log('aucune graine ne garde la mère en vie jusqu’à soixante-dix ans');

console.log('LA MÈRE, AUX QUATRE ÂGES QUE LA DEMANDE CITE');
for (const age of AGES) {
  console.log(`  ${String(age).padStart(2)} ans — moteur : ${String((engine[age] ?? []).length).padStart(2)}`
    + ` · avec les manières : ${String(variants[age] ?? 0).padStart(2)}`
    + ` · écran d'avant : ${String((screen[age] ?? []).length).padStart(2)}`
    + ` · fermées mais visibles : ${String((shut[age] ?? []).length).padStart(2)}`
    + `\n           ${(engine[age] ?? []).join(', ') || '(personne)'}`);
}
const lived = AGES.filter((a) => (engine[a] ?? []).length > 0);
const union = new Set(lived.flatMap((a) => engine[a]));
const variantTotal = lived.reduce((n, a) => n + (variants[a] ?? 0), 0);
const common = [...union].filter((a) => lived.every((age) => engine[age].includes(a)));
console.log(`  ${union.size} actions distinctes sur la vie, dont ${common.length} identiques à tous les âges`);
console.log(`  ${variantTotal} situations distinctes en comptant les manières`);

/* ------------------------------------------------------------------ */
/* 2. Toute une vie                                                    */
/* ------------------------------------------------------------------ */

const LIVES = 40;
const seenPerLife = [];
const everSeen = new Set();
let blockedShown = 0;
let totalShown = 0;

for (let seed = 0; seed < LIVES; seed++) {
  const state = createNewLife({ seed: 5_000 + seed });
  const seen = new Set();
  for (let age = 0; age < 85 && state.player.alive; age++) {
    play(state, 1);
    for (const npc of Object.values(state.npcs)) {
      if (!npc.alive) continue;
      for (const context of ['général', 'école', 'travail', 'prison']) {
        for (const a of getAvailableActions(state, npc, context)) {
          totalShown += 1;
          if (a.blocked) { blockedShown += 1; continue; }
          seen.add(`${npc.relation}:${a.id}`);
          everSeen.add(`${npc.relation}:${a.id}`);
        }
      }
    }
  }
  seenPerLife.push(seen);
}

const sizes = seenPerLife.map((s) => s.size).sort((a, b) => a - b);
console.log(`\nSUR ${LIVES} VIES ENTIÈRES, TOUS CONTEXTES`);
console.log(`  couples (lien × action) jouables par vie : médiane ${sizes[Math.floor(sizes.length / 2)]}`
  + ` · min ${sizes[0]} · max ${sizes[sizes.length - 1]}`);
console.log(`  couples distincts vus par l'ensemble     : ${everSeen.size}`);
console.log(`  part des lignes proposées qui sont bloquées : ${(blockedShown / totalShown * 100).toFixed(0)} %`);

let overlap = 0;
let pairs = 0;
for (let i = 0; i < seenPerLife.length; i++) {
  for (let j = i + 1; j < seenPerLife.length; j++) {
    const a = seenPerLife[i];
    const b = seenPerLife[j];
    const inter = [...a].filter((x) => b.has(x)).length;
    overlap += inter / Math.max(1, new Set([...a, ...b]).size);
    pairs += 1;
  }
}
console.log(`  recouvrement moyen entre deux vies       : ${(overlap / pairs * 100).toFixed(0)} %`);
