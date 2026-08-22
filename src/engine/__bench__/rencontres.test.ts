/**
 * Vérifications de l'application de rencontre.
 *
 * `useDatingApp` était un bouton : un tirage décidait s'il y avait une
 * réponse, et une personne apparaissait dans l'onglet Relations. Le catalogue
 * le classait `BASIC` — « un bouton qui produit un prétendant » — et c'était
 * exact.
 *
 * Six exigences :
 *
 * 1. **la liste ne bouge pas** — sinon on rouvrirait la feuille jusqu'à
 *    tomber sur quelqu'un, et il n'y aurait rien à lire ;
 * 2. **elle change d'une année et d'une partie à l'autre** ;
 * 3. **ce qu'un profil montre est vrai**, toujours ;
 * 4. **ce qu'il dit ne l'est qu'à peu près une fois sur deux**, et une des
 *    phrases porte sur un trait que le profil montre aussi : c'est ce qui
 *    rend la lecture possible ;
 * 5. **lire vaut mieux que croire** — mesuré, sinon la distinction entre
 *    montrer et dire ne serait qu'une mise en page ;
 * 6. **on ne rencontre pas qui l'on veut** : deux messages par an, et un
 *    profil très sollicité répond rarement.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { TRAITS, WARM, type TraitId } from '../../data/dates.ts';
import { BATCH, WRITES_PER_YEAR } from '../../data/profiles.ts';
import {
  alreadyWrote, appBlocker, odds, profilesFor, reading, reallyIs, writeBlocker,
  writeTo, writesThisYear, type Profile, type Way,
} from '../../systems/matching.ts';

function grown(seed: number): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < 24 && !state.gameOver; i++) simulateYear(state);
  state.player.prison = null;
  state.player.yearActions = {};
  state.player.money = Math.max(state.player.money, 5_000);
  state.player.stats.looks = 70;
  return state;
}

/** Ce que le profil vaut vraiment sur ce trait. */
function truthWay(profile: Profile, trait: TraitId): Way {
  return profile.truth[trait] >= WARM ? 'haut' : 'bas';
}

/** Les traits que le profil affirme sans les montrer : les paris. */
function gambles(profile: Profile) {
  const shown = new Set(profile.tells.map((t) => t.trait));
  return profile.claims.filter((c) => !shown.has(c.trait));
}

describe('la liste de l’année', () => {
  it('ne change pas si on la rouvre', () => {
    const state = grown(3);
    const once = profilesFor(state);
    const again = profilesFor(state);
    expect(once.length).toBe(BATCH);
    expect(JSON.stringify(again)).toBe(JSON.stringify(once));
  });

  it('change l’année suivante, et d’une partie à l’autre', () => {
    const state = grown(3);
    const before = profilesFor(state).map((p) => p.id + p.firstName);
    simulateYear(state);
    expect(profilesFor(state).map((p) => p.id + p.firstName)).not.toEqual(before);
    const other = grown(9);
    expect(profilesFor(other).map((p) => p.firstName)).not.toEqual(
      profilesFor(grown(3)).map((p) => p.firstName),
    );
  });

  it('ne propose que des majeurs, et personne d’une autre génération', () => {
    for (let seed = 20; seed < 40; seed++) {
      const state = grown(seed);
      if (!state.player.alive) continue;
      for (const profile of profilesFor(state)) {
        expect(profile.age).toBeGreaterThanOrEqual(18);
        expect(Math.abs(profile.age - state.player.age)).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe('montrer n’est pas dire', () => {
  it('ce qu’un profil montre est toujours vrai', () => {
    let seen = 0;
    for (let seed = 50; seed < 90; seed++) {
      const state = grown(seed);
      if (!state.player.alive) continue;
      for (const profile of profilesFor(state)) {
        for (const shown of profile.tells) {
          expect(shown.way).toBe(truthWay(profile, shown.trait));
          seen += 1;
        }
      }
    }
    // Sans ce compte, le test passerait sur une liste vide.
    expect(seen).toBeGreaterThan(100);
  });

  it('ce qu’il dit de lui-même l’est environ une fois sur deux', () => {
    let right = 0;
    let total = 0;
    for (let seed = 50; seed < 140; seed++) {
      const state = grown(seed);
      if (!state.player.alive) continue;
      for (const profile of profilesFor(state)) {
        for (const said of profile.claims) {
          if (said.way === truthWay(profile, said.trait)) right += 1;
          total += 1;
        }
      }
    }
    const rate = right / total;
    /*
     * Mesuré à 57 % : la moitié des gens se décrivent honnêtement — et se
     * trompent encore une fois sur dix — l'autre moitié se décrit comme elle
     * voudrait être et tombe juste une fois sur quatre. Ni un mensonge
     * systématique (il suffirait de tout retourner) ni la vérité (il n'y
     * aurait rien à lire).
     */
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.7);
  });

  it('affirme toujours quelque chose sur un trait qu’il montre aussi', () => {
    for (let seed = 50; seed < 80; seed++) {
      const state = grown(seed);
      if (!state.player.alive) continue;
      for (const profile of profilesFor(state)) {
        const shown = new Set(profile.tells.map((t) => t.trait));
        // La phrase vérifiable : sans elle, croire ou non les autres phrases
        // serait un pur pari, et le système n'aurait rien à apprendre.
        expect(profile.claims.some((c) => shown.has(c.trait))).toBe(true);
        // Et il reste des paris, sinon il n'y aurait rien à décider.
        expect(gambles(profile).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('lire un profil', () => {
  it('vaut nettement mieux que le croire sur parole', () => {
    /*
     * L'exigence centrale. Sur chaque phrase que le profil avance **sans la
     * montrer**, on compare deux joueurs : celui qui la prend pour argent
     * comptant, et celui qui la confronte d'abord à la phrase vérifiable.
     */
    let believed = 0;
    let read = 0;
    let total = 0;
    for (let seed = 200; seed < 400; seed++) {
      const state = grown(seed);
      if (!state.player.alive) continue;
      for (const profile of profilesFor(state)) {
        for (const said of gambles(profile)) {
          const real = truthWay(profile, said.trait);
          if (said.way === real) believed += 1;
          if (reading(profile, said.trait) === real) read += 1;
          total += 1;
        }
      }
    }
    expect(total).toBeGreaterThan(500);
    /*
     * Mesuré : **72,5 % pour qui lit contre 58,9 % pour qui croit**, sur plus
     * de deux mille phrases. L'écart n'est pas un couperet — une seule phrase
     * vérifiée ne démontre rien, elle penche — et c'est voulu : une déduction
     * certaine ne serait plus une lecture, seulement une case à cocher.
     */
    expect(read / total).toBeGreaterThan(believed / total + 0.08);
    // Et croire n'est pas absurde non plus : la plupart des gens disent à peu
    // près vrai. Un système où il faudrait tout retourner serait aussi plat.
    expect(believed / total).toBeGreaterThan(0.5);
  });

  it('donne des partenaires qui sont vraiment ce qu’on cherchait', () => {
    /*
     * De bout en bout, cette fois : deux joueurs cherchent quelqu'un de
     * loyal, écrivent au premier profil qui leur semble l'être, et l'on
     * regarde qui ils ont vraiment rencontré. Le premier jet mesurait 6,8
     * points d'écart seulement — parce qu'avec deux traits montrés sur cinq
     * et un seul pari par profil, il se trouvait presque toujours quelqu'un
     * qui *montrait* la loyauté, et la déduction ne servait à rien. Un
     * système qui ne mord qu'une fois sur cinq n'en est pas un : le profil
     * avance maintenant deux paris, et l'écart passe à neuf points.
     */
    const WANT: TraitId = 'loyalty';
    function run(how: 'croit' | 'lit'): number {
      let ok = 0;
      let met = 0;
      for (let seed = 400; seed < 700; seed++) {
        const state = grown(seed);
        if (!state.player.alive) continue;
        const pick = profilesFor(state).find((profile) => {
          if (writeBlocker(state, profile)) return false;
          const guess = how === 'lit'
            ? reading(profile, WANT)
            : profile.tells.find((t) => t.trait === WANT)?.way
              ?? profile.claims.find((c) => c.trait === WANT)?.way ?? null;
          return guess === 'haut';
        });
        if (!pick) continue;
        writeTo(createCtx(state), pick.id);
        const fresh = Object.values(state.npcs)
          .find((n) => n.relation === 'crush' && n.metYear === state.year);
        if (!fresh) continue;
        met += 1;
        if (reallyIs(fresh, WANT, 'haut')) ok += 1;
      }
      expect(met).toBeGreaterThan(60);
      return ok / met;
    }
    const believed = run('croit');
    const read = run('lit');
    // Mesuré : 88,0 % contre 78,7 %.
    expect(read).toBeGreaterThan(believed + 0.04);
  });
});

describe('ce qui limite', () => {
  it('n’accorde que deux messages par an, une fois chacun', () => {
    const state = grown(7);
    const list = profilesFor(state);
    expect(writesThisYear(state)).toBe(0);
    writeTo(createCtx(state), list[0]!.id);
    expect(alreadyWrote(state, list[0]!.id)).toBe(true);
    // On n'écrit pas deux fois à la même personne.
    expect(writeTo(createCtx(state), list[0]!.id).ok).toBe(false);
    writeTo(createCtx(state), list[1]!.id);
    expect(writesThisYear(state)).toBe(WRITES_PER_YEAR);
    for (const profile of list.slice(2)) {
      expect(writeBlocker(state, profile)).toContain('messages');
    }
    // Et l'année suivante rouvre tout.
    simulateYear(state);
    expect(writesThisYear(state)).toBe(0);
  });

  it('répond d’autant moins que le profil est sollicité', () => {
    const state = grown(11);
    const list = profilesFor(state);
    const busiest = list.reduce((a, b) => (a.demand.factor < b.demand.factor ? a : b));
    const quietest = list.reduce((a, b) => (a.demand.factor > b.demand.factor ? a : b));
    expect(odds(state, quietest)).toBeGreaterThan(odds(state, busiest));
  });

  it('reste fermée à l’enfance et à la détention, et le dit', () => {
    const child = createNewLife({ seed: 5 });
    for (let i = 0; i < 8 && !child.gameOver; i++) simulateYear(child);
    expect(appBlocker(child)).toBeTruthy();
    const adult = grown(13);
    expect(appBlocker(adult)).toBeNull();
    adult.player.prison = { years: 3, left: 2, crime: 'vol', parole: false } as never;
    expect(appBlocker(adult)).toContain('détention');
  });
});

describe('les traits', () => {
  it('sont les mêmes que ceux d’une soirée', () => {
    // Sans cela, ce qu'on lit sur un profil et ce qu'on découvre au
    // restaurant seraient deux vocabulaires différents, et lire ne servirait
    // à rien une fois la personne rencontrée.
    const state = grown(17);
    for (const profile of profilesFor(state)) {
      for (const trait of TRAITS) expect(Number.isFinite(profile.truth[trait])).toBe(true);
      for (const shown of [...profile.tells, ...profile.claims]) {
        expect(TRAITS).toContain(shown.trait);
      }
    }
  });
});
