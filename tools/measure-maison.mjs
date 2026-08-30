/**
 * Diriger change-t-il quelque chose ?
 *
 * Quatre questions :
 *
 *   1. **les trois postes se distinguent-ils ?** Si le même profil est le
 *      meilleur partout, placer n'est pas une décision ;
 *   2. **un poste vide se paie-t-il là où il est vide ?** C'est ce qui rend
 *      le manque de monde intéressant ;
 *   3. **la part change-t-elle quelque chose des deux côtés ?** Elle doit
 *      remplir la caisse *et* fabriquer des rivaux, sinon ce n'est qu'un
 *      curseur d'argent ;
 *   4. **celui qu'on ne place jamais finit-il par se lever ?**
 *
 *   node --experimental-strip-types tools/measure-maison.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createPerson } from '../src/systems/npc.ts';
import { joinOrganization, orgOf } from '../src/systems/underworld.ts';
import {
  advanceHouse, assign, challenger, fitFor, grudgeOf, postsOf, setCut, takeOf, yoursOf,
} from '../src/systems/house.ts';
import { POSTS, CUTS } from '../src/data/house.ts';

/** Un patron avec ses gens, fabriqué pour mesurer une chose à la fois. */
function boss(seed, headcount = 3) {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.stats.criminality = 90;
  state.player.criminalRecord.notoriety = 80;
  if (!joinOrganization(createCtx(state)).ok) return null;
  const org = orgOf(state);
  if (!org) return null;
  org.rank = 5;
  org.respect = 70;
  org.territory = 45;
  for (let i = 0; i < headcount; i++) {
    const person = createPerson(createCtx(state), { relation: 'acquaintance', age: 30 + i * 4 });
    person.flags.underworld = true;
  }
  state.player.yearActions = {};
  return state;
}

const pad = (x, n) => String(Math.round(x)).padStart(n);

/* 1. Les trois postes demandent-ils les mêmes gens ? */
{
  const state = boss(3, 40);
  if (state) {
    const people = Object.values(state.npcs).filter((n) => n.flags.underworld);
    const best = {};
    for (const post of POSTS) {
      best[post.id] = [...people].sort((a, b) => fitFor(b, post.id) - fitFor(a, post.id))[0].id;
    }
    const distinct = new Set(Object.values(best)).size;
    console.log('Les trois postes :');
    for (const post of POSTS) {
      const spread = people.map((p) => fitFor(p, post.id));
      console.log(`  ${post.id.padEnd(8)} : de ${pad(Math.min(...spread), 3)} à ${pad(Math.max(...spread), 3)}`
        + ` · meilleur ${best[post.id].slice(-4)}`);
    }
    console.log(`  meilleurs distincts : ${distinct}/3`
      + (distinct === 1 ? '  ← ATTENTION : le même profil gagne partout' : ''));
  }
}

/* 2. Un poste vide se paie-t-il là où il est vide ? */
{
  const run = (filled, years) => {
    const state = boss(11);
    if (!state) return null;
    const people = Object.values(state.npcs).filter((n) => n.flags.underworld);
    /*
     * **Le meilleur *encore libre*.** La première version prenait le meilleur
     * absolu pour chaque poste : quand le même profil gagnait deux postes, la
     * seconde affectation lui volait le premier, et « les trois » donnait
     * exactement le même résultat que « terrain seul ».
     */
    const taken = new Set();
    for (const post of POSTS) {
      if (!filled.includes(post.id)) continue;
      const who = [...people].filter((p) => !taken.has(p.id))
        .sort((a, b) => fitFor(b, post.id) - fitFor(a, post.id))[0];
      if (!who) continue;
      taken.add(who.id);
      assign(createCtx(state), post.id, who.id);
    }
    let money = 0;
    for (let i = 0; i < years; i++) {
      const before = state.player.money;
      state.year += 1;
      advanceHouse(createCtx(state));
      money += state.player.money - before;
    }
    const org = orgOf(state);
    return { ground: org.territory, heat: state.player.criminalRecord.heat, money };
  };

  console.log('');
  console.log('Ce que chaque poste protège, sur dix ans :');
  console.log('postes tenus          | emprise | chaleur | encaissé');
  const rows = [
    ['aucun', []],
    ['terrain seul', ['terrain']],
    ['caisse seule', ['caisse']],
    ['silence seul', ['silence']],
    ['les trois', ['terrain', 'caisse', 'silence']],
  ];
  for (const [label, filled] of rows) {
    const r = run(filled, 10);
    if (r) {
      console.log(`${label.padEnd(21)} | ${pad(r.ground, 7)} | ${pad(r.heat, 7)} | ${pad(r.money, 8)}`);
    }
  }
}

/* 3. Ce que la part change, des deux côtés. */
{
  console.log('');
  console.log('Ce que la part change :');
  console.log('part      | encaissé sur dix ans | rancune moyenne des non-placés');
  for (const cut of CUTS) {
    const state = boss(17, 4);
    if (!state) continue;
    const people = Object.values(state.npcs).filter((n) => n.flags.underworld);
    setCut(createCtx(state), cut.id);
    // On ne place qu'une personne : les trois autres regardent.
    assign(createCtx(state), 'caisse', people[0].id);
    let money = 0;
    for (let i = 0; i < 10; i++) {
      const before = state.player.money;
      state.year += 1;
      advanceHouse(createCtx(state));
      money += state.player.money - before;
    }
    const idle = people.slice(1);
    const grudge = idle.reduce((s, p) => s + grudgeOf(p), 0) / Math.max(1, idle.length);
    console.log(`${cut.id.padEnd(9)} | ${pad(money, 20)} | ${grudge.toFixed(1).padStart(30)}`);
  }
}

/* 4. Celui qu'on ne place jamais finit-il par se lever ? */
{
  const state = boss(23, 4);
  if (state) {
    const people = Object.values(state.npcs).filter((n) => n.flags.underworld);
    assign(createCtx(state), 'caisse', people[0].id);
    let rose = null;
    for (let i = 0; i < 20 && rose === null; i++) {
      state.year += 1;
      advanceHouse(createCtx(state));
      if (challenger(state)) rose = i + 1;
    }
    console.log('');
    console.log(`Quelqu’un se lève au bout de ${rose ?? '—'} an(s) quand on ne place qu’une personne sur quatre.`);
    const placed = postsOf(state).caisse;
    console.log(`  celui qui tenait la caisse : rancune ${grudgeOf(state.npcs[placed]).toFixed(0)}`);
    console.log(`  les autres : ${people.slice(1).map((p) => grudgeOf(p).toFixed(0)).join(', ')}`);
    console.log(`  encaissé la dernière année : ${yoursOf(state)} sur ${takeOf(state)}`);
  }
}
