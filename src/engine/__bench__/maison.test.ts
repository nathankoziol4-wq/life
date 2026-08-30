/**
 * La maison — ce que diriger veut dire.
 *
 * Le milieu organisé était l'un des systèmes les plus complets du jeu : six
 * rangs, des missions, un carnet d'adresses, des services, une sortie. Et le
 * sixième rang s'appelait « Patron », avec pour description « Tout remonte à
 * toi, y compris ce que tu n'as pas décidé ».
 *
 * Rien ne remontait. **Aucune ligne de code ne traitait le rang cinq
 * différemment des autres** : on continuait de recevoir des missions de
 * personne et de les faire soi-même. Le catalogue : « le rang de patron
 * existe ; il n'ouvre aucun gameplay de direction ».
 *
 * Six exigences :
 *
 * 1. **cela n'existe qu'au sommet** — sinon ce serait un écran de plus pour
 *    tout le monde ;
 * 2. **les trois postes ne demandent pas les mêmes gens**, sans quoi placer
 *    ne serait pas une décision ;
 * 3. **une personne ne tient qu'un poste** : c'est ce qui fait qu'on manque
 *    de monde ;
 * 4. **chaque poste vide se paie là où il est vide** ;
 * 5. **la part joue des deux côtés** — la caisse et les rancunes ;
 * 6. **celui qu'on ne place jamais finit par se lever**, et ce qui décide
 *    alors est ce que la maison pense de vous.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import { createPerson } from '../../systems/npc.ts';
import { joinOrganization, orgOf } from '../../systems/underworld.ts';
import { CHALLENGE_AT, CUTS, POSTS } from '../../data/house.ts';
import {
  advanceHouse, assign, buyPeace, challenger, cutOf, faceDown, fitFor,
  grudgeOf, holderOf, houseBlocker, isBoss, peacePrice, postsOf, setCut,
  takeOf, yoursOf,
} from '../../systems/house.ts';

/** Un patron avec ses gens, fabriqué pour mesurer une chose à la fois. */
function boss(seed: number, headcount = 3): GameState | null {
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

function people(state: GameState): Person[] {
  return Object.values(state.npcs).filter((n) => n.flags.underworld === true && n.alive);
}

/** Place le meilleur encore libre à chacun des postes demandés. */
function staff(state: GameState, filled: string[]): void {
  const taken = new Set<string>();
  for (const post of POSTS) {
    if (!filled.includes(post.id)) continue;
    const who = people(state).filter((p) => !taken.has(p.id))
      .sort((a, b) => fitFor(b, post.id) - fitFor(a, post.id))[0];
    if (!who) continue;
    taken.add(who.id);
    assign(createCtx(state), post.id, who.id);
  }
}

/** Fait passer les années sans que le joueur fasse quoi que ce soit. */
function years(state: GameState, n: number): number {
  let money = 0;
  for (let i = 0; i < n; i++) {
    const before = state.player.money;
    state.year += 1;
    advanceHouse(createCtx(state));
    money += state.player.money - before;
  }
  return money;
}

describe('diriger', () => {
  it('n’existe qu’au sommet', () => {
    const state = boss(3);
    if (!state) return;
    expect(isBoss(state)).toBe(true);
    expect(houseBlocker(state)).toBeNull();

    orgOf(state)!.rank = 4;
    expect(isBoss(state)).toBe(false);
    expect(houseBlocker(state)).toContain('pas toi qui décides');
    // Et rien ne tourne : une maison qu'on ne dirige pas ne rapporte rien ici.
    const before = state.player.money;
    years(state, 5);
    expect(state.player.money).toBe(before);
  });

  it('demande des gens différents à chaque poste', () => {
    /*
     * Mesuré sur quarante personnes : les trois meilleurs sont trois
     * personnes différentes. Si le même profil gagnait partout, placer se
     * réduirait à trier une fois et il n'y aurait rien à arbitrer.
     */
    const state = boss(5, 40);
    if (!state) return;
    const crowd = people(state);
    const best = POSTS.map((post) =>
      [...crowd].sort((a, b) => fitFor(b, post.id) - fitFor(a, post.id))[0]!.id);
    expect(new Set(best).size).toBeGreaterThan(1);
    // Et chaque poste étale vraiment les gens.
    for (const post of POSTS) {
      const spread = crowd.map((p) => fitFor(p, post.id));
      expect(Math.max(...spread) - Math.min(...spread)).toBeGreaterThan(25);
    }
  });

  it('ne laisse une personne tenir qu’un poste', () => {
    // C'est ce qui fait qu'on manque de monde, et donc qu'il faut choisir.
    const state = boss(7);
    if (!state) return;
    const who = people(state)[0]!;
    assign(createCtx(state), 'terrain', who.id);
    assign(createCtx(state), 'caisse', who.id);
    expect(holderOf(state, 'terrain')).toBeNull();
    expect(holderOf(state, 'caisse')!.id).toBe(who.id);
  });
});

describe('ce que chaque poste protège', () => {
  it('se paie exactement là où il est vide', () => {
    /*
     * Mesuré sur dix ans, même maison de départ (emprise 45) :
     *
     *     postes tenus  | emprise | chaleur | encaissé
     *     aucun         |       0 |      43 |    2 301
     *     terrain seul  |      52 |      89 |   22 634
     *     caisse seule  |       0 |      43 |   10 413
     *     silence seul  |       0 |       4 |    2 301
     *     les trois     |      52 |      20 |  102 428
     *
     * Chacun protège son axe et rien d'autre — et les trois ensemble
     * rapportent bien plus que leur somme, parce que le terrain tenu et une
     * bonne caisse se multiplient.
     */
    const run = (filled: string[]) => {
      const state = boss(11);
      if (!state) return null;
      staff(state, filled);
      const money = years(state, 10);
      return {
        ground: orgOf(state)!.territory,
        heat: state.player.criminalRecord.heat,
        money,
      };
    };

    const none = run([]);
    const ground = run(['terrain']);
    const quiet = run(['silence']);
    const all = run(['terrain', 'caisse', 'silence']);
    if (!none || !ground || !quiet || !all) return;

    // Le terrain protège l'emprise…
    expect(ground.ground).toBeGreaterThan(none.ground + 20);
    // …le silence protège la chaleur…
    expect(quiet.heat).toBeLessThan(none.heat);
    // …et tout tenir rapporte plus que n'en tenir qu'un.
    expect(all.money).toBeGreaterThan(ground.money * 2);
    /*
     * **Sans quoi diriger serait une chute réglée.** Dans la première
     * version, le meilleur tenant du terrain rendait moins que la poussée
     * d'en face : l'emprise tombait à zéro en quatre ans quoi qu'on fasse, et
     * comme elle porte les revenus, aucune façon de diriger ne rapportait
     * rien.
     */
    expect(ground.ground).toBeGreaterThan(45);
  });
});

describe('ce qu’on leur laisse', () => {
  it('joue des deux côtés à la fois', () => {
    /*
     * Mesuré sur dix ans, une seule personne placée sur quatre :
     *
     *     part     | encaissé | rancune moyenne des trois autres
     *     maigre   |   35 134 |                           100,0
     *     correct  |   28 107 |                            69,2
     *     large    |   20 668 |                            19,2
     *
     * Une part maigre remplit la caisse et fabrique des rivaux ; une part
     * large achète la paix et vide la caisse. Sans le second effet, ce ne
     * serait qu'un curseur d'argent qu'on mettrait au minimum une fois pour
     * toutes.
     */
    const run = (cutId: string) => {
      const state = boss(17, 4);
      if (!state) return null;
      setCut(createCtx(state), cutId);
      assign(createCtx(state), 'caisse', people(state)[0]!.id);
      const money = years(state, 10);
      const idle = people(state).slice(1);
      return { money, grudge: idle.reduce((s, p) => s + grudgeOf(p), 0) / Math.max(1, idle.length) };
    };
    const thin = run('maigre');
    const fat = run('large');
    if (!thin || !fat) return;

    expect(thin.money).toBeGreaterThan(fat.money);
    expect(thin.grudge).toBeGreaterThan(fat.grudge + 30);
  });

  it('se choisit, et le choix tient', () => {
    const state = boss(19);
    if (!state) return;
    for (const cut of CUTS) {
      expect(setCut(createCtx(state), cut.id).ok).toBe(true);
      expect(cutOf(state)).toBe(cut.id);
    }
    expect(yoursOf(state)).toBeLessThanOrEqual(takeOf(state));
  });
});

describe('les luttes internes', () => {
  it('viennent de ce qu’on a décidé, pas d’un tirage', () => {
    /*
     * **C'est là que « luttes internes » cesse d'être un événement.** Mesuré :
     * quelqu'un se lève au bout de huit ans quand on ne place qu'une personne
     * sur quatre — et celui qu'on a placé, lui, reste à zéro de rancune.
     */
    const state = boss(23, 4);
    if (!state) return;
    const placed = people(state)[0]!;
    assign(createCtx(state), 'caisse', placed.id);

    let rose: number | null = null;
    for (let i = 0; i < 20 && rose === null; i++) {
      state.year += 1;
      advanceHouse(createCtx(state));
      if (challenger(state)) rose = i + 1;
    }
    expect(rose).not.toBeNull();
    // Celui dont on s'est servi n'a rien contre nous.
    expect(grudgeOf(placed)).toBeLessThan(20);
    // Ceux qu'on a laissés regarder, si.
    expect(people(state).slice(1).some((p) => grudgeOf(p) >= CHALLENGE_AT)).toBe(true);
  });

  it('ne se lèvent pas contre qui se sert de ses gens', () => {
    const state = boss(29, 3);
    if (!state) return;
    setCut(createCtx(state), 'large');
    staff(state, ['terrain', 'caisse', 'silence']);
    years(state, 15);
    expect(challenger(state)).toBeNull();
  });

  it('se règlent en payant, ou en tenant tête', () => {
    const state = boss(31, 4);
    if (!state) return;
    assign(createCtx(state), 'caisse', people(state)[0]!.id);
    for (let i = 0; i < 20 && !challenger(state); i++) {
      state.year += 1;
      advanceHouse(createCtx(state));
    }
    const rebel = challenger(state);
    if (!rebel) return;

    // Payer : ça coûte, et ça marche.
    state.player.money = peacePrice(state) + 1_000;
    const before = state.player.money;
    expect(buyPeace(createCtx(state)).ok).toBe(true);
    expect(state.player.money).toBeLessThan(before);
    expect(challenger(state)).toBeNull();
    expect(grudgeOf(rebel)).toBeLessThan(CHALLENGE_AT);
  });

  it('font perdre la place à qui a mal dirigé', () => {
    /*
     * Ce qui décide n'est pas ce qu'on vaut soi-même mais **ce que la maison
     * pense** : le respect gagné rang après rang, et le fait qu'il reste des
     * gens contents. Diriger mal pendant dix ans se paie ici, d'un coup.
     */
    let ousted = 0;
    let tried = 0;
    for (let seed = 41; seed < 101; seed += 2) {
      const state = boss(seed, 4);
      if (!state) continue;
      const org = orgOf(state)!;
      org.respect = 10;
      for (const person of people(state)) person.flags.grudge = 90;
      state.player.flags.houseChallenge = people(state)[0]!.id;
      tried += 1;
      faceDown(createCtx(state));
      if (org.rank < 5) {
        ousted += 1;
        // On redescend, et le terrain descend avec.
        expect(org.territory).toBeLessThan(45);
        for (const post of POSTS) expect(postsOf(state)[post.id]).toBeNull();
      }
    }
    expect(tried).toBeGreaterThan(10);
    expect(ousted).toBeGreaterThan(tried / 2);
  });
});

describe('l’écran', () => {
  it('montre les postes, la part et les rancunes', () => {
    const source = readFileSync(
      new URL('../../screens/HouseScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain('POSTS');
    expect(source).toContain('CUTS');
    // Ce qu'on ne devinerait pas : que ne pas se servir de quelqu'un coûte.
    expect(source).toContain('grudgeSays');
    expect(source).toContain('fitFor');
  });

  it('ne décrit aucune organisation reconnaissable', () => {
    /*
     * Garde-fou de contenu : « la maison », « le terrain », « la caisse » et
     * « le silence » sont quatre mots de jeu. Ce test ne prouve pas l'absence,
     * il signale une dérive si quelqu'un ajoute un jour du vocabulaire réel.
     */
    const source = readFileSync(
      new URL('../../data/house.ts', import.meta.url).pathname, 'utf8',
    ).toLowerCase();
    for (const word of ['mafia', 'cartel', 'yakuza', 'triade', 'cosa nostra', 'camorra']) {
      expect(source).not.toContain(word);
    }
  });
});
