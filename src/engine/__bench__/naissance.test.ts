/**
 * Comment tu es arrivé — ce que personne ne choisit.
 *
 * `cradle.ts` règle depuis longtemps ce qu'on décide avant de naître :
 * structure du foyer, fratrie, tempérament, apparence, enveloppe de
 * potentiels. L'autre moitié n'existait pas — toutes les vies commençaient
 * pareil : un seul bébé, à terme, dans le pays de ses parents, dans une maison
 * sans animal. Aucun fichier du dépôt ne contenait le mot « jumeau », et
 * `newLife.ts` posait `pets: []` pour tout le monde.
 *
 * Six exigences :
 *
 * 1. **elles se rencontrent** — ni une sur mille, ni une sur deux ;
 * 2. **le tirage ne coûte aucun aléa** : `createNewLife` est le point le plus
 *    sensible du moteur ;
 * 3. **le jumeau est quelqu’un**, du bon sexe et des bons parents ;
 * 4. **naître avant terme se rattrape selon les moyens du foyer**, et c’est le
 *    seul endroit du jeu où la fortune des parents agit avant l’école ;
 * 5. **l’enfant trouvé cherche vraiment plus mal** ;
 * 6. **rien de tout cela n’est un bonus.**
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import type { GameState } from '../types.ts';
import {
  BIRTH_MARKS, EARLY_COST, MEND_FLOOR, MEND_UNTIL,
} from '../../data/birth.ts';
import {
  arrivalMarks, birthOf, bornWith, drawMarks, mendRate, owedOf, twinOf,
} from '../../systems/birth.ts';
import { leadOdds } from '../../systems/roots.ts';

/** La première vie dont l'arrivée porte cette circonstance-là. */
function born(markId: string, limit = 20_000): GameState | null {
  for (let seed = 0; seed < limit; seed++) {
    const state = createNewLife({ seed });
    if (bornWith(state, markId)) return state;
  }
  return null;
}

describe('les circonstances se rencontrent', () => {
  it('tombe à peu près à la fréquence annoncée', () => {
    /*
     * Mesuré sur trois mille naissances :
     *
     *     Jumeau            annoncé 3,0 %  obtenu 3,3 %  — une sur 30
     *     Né avant terme            9,0 %          9,7 %          10
     *     Né ailleurs               5,0 %          4,9 %          20
     *     Enfant trouvé             1,2 %          1,2 %          83
     *     Une bête déjà là         22,0 %         21,6 %           5
     *
     *     aucune circonstance : 64,3 %
     *
     * Deux tiers des vies commencent ordinairement, ce qui est la condition
     * pour que le tiers restant soit remarquable.
     */
    const N = 900;
    const seen = new Map<string, number>();
    let plain = 0;
    for (let seed = 0; seed < N; seed++) {
      const marks = birthOf(createNewLife({ seed })).marks;
      if (marks.length === 0) plain += 1;
      for (const id of marks) seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    for (const mark of BIRTH_MARKS) {
      const got = (seen.get(mark.id) ?? 0) / N;
      // Assez large pour ne pas se casser sur l'échantillon, assez serré pour
      // attraper une circonstance devenue impossible ou omniprésente.
      expect(got, mark.id).toBeGreaterThan(mark.odds * 0.4);
      expect(got, mark.id).toBeLessThan(mark.odds * 2.2 + 0.02);
    }
    // Une vie ordinaire doit rester le cas courant.
    expect(plain / N).toBeGreaterThan(0.5);
  });

  it('donne toujours la même arrivée à la même graine', () => {
    for (const seed of [7, 42, 777, 1234]) {
      const a = drawMarks(createNewLife({ seed }));
      const b = drawMarks(createNewLife({ seed }));
      expect(a).toEqual(b);
    }
  });

  it('ne tire pas dans la séquence du moteur pour décider', () => {
    /*
     * `createNewLife` est le point le plus sensible du jeu : toutes les vies
     * de référence en partent. Le chantier « Le nom » avait consommé un
     * tirage par naissance et décalé quatre mesures d'équilibrage d'un coup ;
     * « La bête » a refait la même faute dans `settleArrival`.
     *
     * On assure sur le corps de la fonction plutôt que sur une prose qui
     * pourrait la décrire : `drawMarks` ne doit contenir aucun appel `rng`.
     */
    const source = readFileSync(new URL('../../systems/birth.ts', import.meta.url), 'utf8');
    const body = source.slice(
      source.indexOf('export function drawMarks'),
      source.indexOf('/* ---', source.indexOf('export function drawMarks')),
    );
    expect(body).not.toMatch(/\brng\b/);
    expect(body).toMatch(/\bhash\(/);
  });
});

describe('le jumeau', () => {
  it('est une personne, du même âge exact et des mêmes parents', () => {
    const state = born('jumeau');
    if (!state) return;
    const twin = twinOf(state);
    expect(twin).not.toBeNull();
    expect(twin!.age).toBe(state.player.age);
    expect(twin!.lastName).toBe(state.player.lastName);
    expect(['brother', 'sister']).toContain(twin!.relation);
    // Les mêmes parents, et qui le reconnaissent.
    const parents = Object.values(state.npcs).filter((x) => x.childrenIds.includes(twin!.id));
    expect(parents.length).toBeGreaterThan(0);
    for (const parent of parents) expect(parent.childrenIds).toContain(state.player.id);
  });

  it('porte un prénom qui s’accorde à son lien', () => {
    /*
     * Mesuré avant : « Tara Desai, brother » et « Sebastian Lang, sister ».
     * `createPerson` tire son propre sexe quand on ne lui en passe pas, et
     * c'est ce sexe-là qui décide du prénom — pendant que le lien venait d'un
     * second tirage indépendant.
     */
    let checked = 0;
    for (let seed = 0; seed < 3000 && checked < 6; seed++) {
      const state = createNewLife({ seed });
      const twin = twinOf(state);
      if (!twin) continue;
      checked += 1;
      expect(twin.relation, `${twin.firstName} (${twin.sex})`)
        .toBe(twin.sex === 'M' ? 'brother' : 'sister');
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('n’arrive jamais en même temps qu’un enfant trouvé', () => {
    // Un enfant dont personne ne sait de qui il est né ne peut pas avoir un
    // jumeau connu : s'il en avait un, on saurait quelque chose.
    for (let seed = 0; seed < 4000; seed++) {
      const marks = drawMarks(createNewLife({ seed }));
      if (marks.includes('trouve')) expect(marks).not.toContain('jumeau');
    }
  });
});

describe('naître avant terme', () => {
  it('coûte une constitution au départ', () => {
    const state = born('avantTerme');
    if (!state) return;
    expect(owedOf(state)).toBeGreaterThan(0);
    expect(owedOf(state)).toBeLessThanOrEqual(EARLY_COST);
  });

  it('se rattrape d’autant plus vite que le foyer en a les moyens', () => {
    const poor = createNewLife({ seed: 1 });
    poor.player.flags.familyTier = 'poor';
    const rich = createNewLife({ seed: 1 });
    rich.player.flags.familyTier = 'rich';
    expect(mendRate(rich)).toBeGreaterThan(mendRate(poor) * 2);
    // Et même sans un sou, la pente n'est pas nulle.
    expect(mendRate(poor)).toBeGreaterThan(0);
    expect(MEND_FLOOR).toBeGreaterThan(0);
  });

  it('laisse une part définitive à qui n’avait pas les moyens', () => {
    /*
     * Mesuré sur cent vingt vies nées avant terme, dette de 22 points :
     *
     *     milieu                | rachat/an | rendu | jamais rendu | quitte à
     *     famille en difficulté |      0,68 |   9,5 |         12,5 |   jamais
     *     famille modeste       |      1,21 |  16,9 |          5,1 |   jamais
     *     classe moyenne        |      1,89 |  21,6 |          0,4 | 12,0 ans
     *     famille aisée         |      2,85 |  19,5 |          2,5 |  8,5 ans
     *
     * Deux instruments faux avant celui-ci. Mesurer la santé de fin de vie
     * contre un témoin pris sur d'autres graines noyait l'écart de 22 points
     * dans la variance ordinaire. Et ranger les vies par
     * `capitals.economic` ne voulait rien dire : `finaliseHousehold` est
     * rappelée chaque année et recalcule ce nombre sur le revenu disponible
     * du moment — 70, 41, 41, 73, 30, 55… sur un même foyer.
     */
    const owedAfterChildhood = (tier: string) => {
      const state = createNewLife({ seed: 3 });
      state.player.flags.familyTier = tier;
      state.player.birth = { marks: ['avantTerme'], twinId: null, bornIn: null, owed: EARLY_COST };
      let last = EARLY_COST;
      for (let y = 0; y < MEND_UNTIL + 1 && state.player.alive && !state.gameOver; y++) {
        simulateYear(state);
        if (state.player.age <= MEND_UNTIL) last = owedOf(state);
      }
      return last;
    };
    const poor = owedAfterChildhood('poor');
    const rich = owedAfterChildhood('rich');
    expect(rich).toBe(0);
    expect(poor).toBeGreaterThan(3);
  });

  it('cesse d’être une dette une fois l’enfance passée', () => {
    const state = createNewLife({ seed: 5 });
    state.player.birth = { marks: ['avantTerme'], twinId: null, bornIn: null, owed: EARLY_COST };
    state.player.flags.familyTier = 'poor';
    for (let y = 0; y < 30 && state.player.alive && !state.gameOver; y++) simulateYear(state);
    // Ce qui n'a pas été rattrapé avant l'adolescence ne le sera plus : le
    // compteur se ferme, et la constitution reste celle du personnage.
    if (state.player.age > MEND_UNTIL) expect(owedOf(state)).toBe(0);
  });
});

describe('l’enfant trouvé', () => {
  it('part de rien, et cherche plus mal que les autres', () => {
    /*
     * Mesuré, chance de la meilleure piste à vingt-cinq ans :
     *
     *     adoption   58,0 %
     *     accueil    58,0 %
     *     trouvé     31,9 %
     *
     * La raison est dans le monde et pas dans un coefficient : une adoption a
     * une administration, un placement a un service et des gens qui ont
     * signé. Personne ne sait de qui est né un enfant trouvé.
     */
    const state = born('trouve');
    if (!state) return;
    expect(state.player.roots?.how).toBe('trouvé');
    state.player.age = 25;
    const found = Math.max(...['registre', 'famille', 'foyer'].map((id) => leadOdds(state, id)));

    const other = createNewLife({ seed: 11 });
    other.player.roots = {
      how: 'adoption', knownYear: other.year, toldBy: 'parents', tried: [],
      trail: 0, soundness: 0, strain: 0, outcome: null, metYear: null,
    };
    other.player.age = 25;
    const usual = Math.max(...['registre', 'famille', 'foyer'].map((id) => leadOdds(other, id)));
    expect(found).toBeLessThan(usual);
  });

  it('sait depuis toujours : il n’y a rien à lui révéler', () => {
    const state = born('trouve');
    if (!state) return;
    expect(state.player.roots?.knownYear).not.toBeNull();
  });
});

describe('naître ailleurs', () => {
  it('laisse un pays et une langue commencée', () => {
    const state = born('ailleurs');
    if (!state) return;
    expect(birthOf(state).bornIn).not.toBeNull();
    expect(birthOf(state).bornIn).not.toBe(state.player.countryId);
    // Une langue au moins a été poussée au-dessus de zéro.
    expect(Object.values(state.player.languages).some((v) => v > 0)).toBe(true);
  });
});

describe('la bête déjà là', () => {
  it('est plus vieille que l’enfant, et ne lui appartient pas encore', () => {
    const state = born('beteDejaLa');
    if (!state) return;
    expect(state.player.pets.length).toBeGreaterThan(0);
    const pet = state.player.pets[0];
    expect(pet.age).toBeGreaterThan(0);
    // Elle connaît la maison, pas l'enfant : le lien se construit comme
    // n'importe quel autre, par des moments.
    expect(pet.bond ?? 0).toBe(0);
  });
});

describe('rien de tout cela n’est un bonus', () => {
  it('donne à chaque circonstance une conséquence, et pas seulement une phrase', () => {
    // Chaque circonstance doit dire ce qu'elle change, sans quoi elle n'est
    // qu'un texte affiché une fois — ce que le catalogue appelle un
    // faux-semblant.
    for (const mark of BIRTH_MARKS) {
      expect(mark.note.length, mark.id).toBeGreaterThan(20);
      expect(mark.line.length, mark.id).toBeGreaterThan(20);
      expect(mark.odds, mark.id).toBeGreaterThan(0);
      expect(mark.odds, mark.id).toBeLessThan(0.5);
    }
  });

  it('se lit dans la partie', () => {
    const state = born('avantTerme');
    if (!state) return;
    expect(arrivalMarks(state).length).toBeGreaterThan(0);
    expect(arrivalMarks(state).map((m) => m.id)).toContain('avantTerme');
  });
});
