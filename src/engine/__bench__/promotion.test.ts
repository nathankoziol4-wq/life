/**
 * Vérifications de la promotion.
 *
 * Le catalogue disait « ni camarades de promotion, ni professeurs, ni clubs,
 * ni logement étudiant », et il avait raison sur le premier point : le collège
 * et le lycée peuplent une classe entière — psyché, goûts, professeur
 * principal, ambiance — mais `enrollUniversity` posait `edu.stage =
 * 'university'` et trois à six années passaient en silence. On entrait avec un
 * dossier, on sortait avec un diplôme, et il ne s'était rien passé entre.
 *
 * Six exigences :
 *
 * 1. **une promotion existe** dès l'admission, et se disperse au diplôme ;
 * 2. **on garde ceux qu'on a fréquentés**, et seulement ceux-là ;
 * 3. **les trois façons de passer l'année ne donnent pas la même chose** —
 *    sinon ce serait un seul bouton avec trois noms ;
 * 4. **un confrère pèse à l'embauche**, sinon tout cela ne serait qu'un texte ;
 * 5. **il ne pèse que dans sa filière**, sinon le choix de la filière ne
 *    voudrait rien dire ;
 * 6. **il lui faut le temps de s'installer** : recommander quelqu'un suppose
 *    d'avoir soi-même une place.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, JobOffer } from '../types.ts';
import {
  KEEPS_AT, TOGETHER, buildCohort, cohortOf, graduateCohort, hasCohort,
  networkEdge, networkLine, peersOf, spendYear, togetherBlocker, type Together,
} from '../../systems/cohort.ts';
import { enrollUniversity } from '../../systems/education.ts';

/**
 * Un étudiant admis, quelle que soit la graine.
 *
 * L'admission reste un tirage plafonné à 97 % : sur une graine malchanceuse,
 * `enrollUniversity` refusait le dossier et le test mesurait une partie sans
 * promotion — en passant, puisque « Tu n'as gardé personne » contient le mot
 * « personne » qu'il cherchait. On retente donc jusqu'à l'admission : ce
 * qu'on teste est ce qui se passe **après** elle.
 */
function student(seed: number): GameState {
  const state = createNewLife({ seed });
  state.player.age = 18;
  state.player.education.level = 1;
  state.player.stats.intelligence = 90;
  for (let i = 0; i < 30; i++) {
    state.player.education.stage = 'none';
    enrollUniversity(createCtx(state), 'cs');
    // On vérifie la promotion plutôt que le cycle : après avoir écrit
    // « none » juste au-dessus, le typage sait que la valeur ne peut plus
    // être « university » et refuse la comparaison. La promotion est de
    // toute façon la condition qui compte ici.
    if (hasCohort(state)) return state;
  }
  throw new Error('aucune admission après trente tentatives');
}

describe('la promotion existe', () => {
  it('apparaît à l’admission', () => {
    const state = student(3);
    expect(state.player.education.stage).toBe('university');
    expect(hasCohort(state)).toBe(true);
    const mates = cohortOf(state);
    expect(mates.length).toBeGreaterThanOrEqual(3);
    for (const mate of mates) {
      expect(mate.relation).toBe('classmate');
      expect(mate.flags.cohortMajor).toBe('cs');
      // Ils ont à peu près ton âge : on entre en même temps.
      expect(Math.abs(mate.age - state.player.age)).toBeLessThanOrEqual(4);
    }
  });

  it('ne garde au diplôme que ceux qu’on a fréquentés', () => {
    const state = student(5);
    const mates = cohortOf(state);
    // L'un est devenu proche, l'autre non.
    mates[0]!.relationship = KEEPS_AT + 10;
    mates[1]!.relationship = KEEPS_AT - 20;
    const keptId = mates[0]!.id;
    const lostId = mates[1]!.id;

    graduateCohort(createCtx(state), 'cs');

    expect(hasCohort(state)).toBe(false);
    expect(state.npcs[keptId]).toBeDefined();
    expect(state.npcs[keptId]!.relation).toBe('friend');
    expect(state.npcs[keptId]!.flags.peerField).toBe('cs');
    // Celui qu'on n'a pas fréquenté s'efface, comme un camarade de lycée.
    expect(state.npcs[lostId]).toBeUndefined();
  });

  it('dit ce qu’il en reste', () => {
    const state = student(7);
    // Avant le diplôme il n'y a pas encore de confrère. On vise la phrase
    // entière : « Tu n'as gardé personne » contient le mot « personne », et
    // chercher ce mot-là passait quoi qu'il arrive.
    expect(networkLine(state)).toBe('Tu n’as gardé personne de tes études.');
    cohortOf(state).forEach((m) => { m.relationship = 90; });
    graduateCohort(createCtx(state), 'cs');
    expect(networkLine(state)).toContain('confrère(s) de promotion');
  });
});

describe('passer l’année', () => {
  it('ne donne pas la même chose selon ce qu’on en fait', () => {
    const measure = (how: Together) => {
      let close = 0;
      let grades = 0;
      for (let seed = 10; seed < 40; seed++) {
        const state = student(seed);
        // En milieu de cursus : à l'admission la moyenne vaut zéro, et une
        // année de sorties ne peut donc rien lui retirer. Le malus existe,
        // il n'a simplement rien à mordre la première année.
        state.player.education.grades = 12;
        const before = cohortOf(state).reduce((s, m) => s + m.relationship, 0);
        const marks = state.player.education.grades;
        spendYear(createCtx(state), how);
        close += cohortOf(state).reduce((s, m) => s + m.relationship, 0) - before;
        grades += state.player.education.grades - marks;
      }
      return { close, grades };
    };

    const out = measure('sortir');
    const study = measure('réviser');
    const none = measure('rien');

    // Sortir rapproche nettement plus que réviser ; réviser rapproche un peu.
    expect(out.close).toBeGreaterThan(study.close);
    expect(study.close).toBeGreaterThan(0);
    // Et l'inverse sur les notes : c'est l'arbitrage, pas une échelle.
    expect(study.grades).toBeGreaterThan(0);
    expect(out.grades).toBeLessThan(0);
    // Ne rien faire ne fait rien du tout.
    expect(none.close).toBe(0);
    expect(none.grades).toBe(0);
  });

  it('une fois par an, et pas depuis une cellule', () => {
    const state = student(11);
    expect(togetherBlocker(state)).toBeNull();
    expect(spendYear(createCtx(state), 'sortir').ok).toBe(true);
    expect(togetherBlocker(state)).toContain('déjà');
    expect(spendYear(createCtx(state), 'sortir').ok).toBe(false);

    // L'année suivante remet le compteur.
    simulateYear(state);
    if (hasCohort(state)) expect(togetherBlocker(state)).toBeNull();
  });

  it('propose trois façons, toutes nommées', () => {
    const keys = Object.keys(TOGETHER) as Together[];
    expect(keys.length).toBe(3);
    for (const k of keys) {
      expect(TOGETHER[k].label.length).toBeGreaterThan(4);
      expect(TOGETHER[k].note.length).toBeGreaterThan(10);
    }
  });
});

describe('le réseau pèse, et seulement là où il doit', () => {
  function offer(requiresMajor: string[] | null): JobOffer {
    return {
      id: 'o1', jobId: 'dev', title: 'Poste', employer: 'Maison', salary: 30_000,
      level: 1, category: 'Technologie', requiresLevel: 3, requiresMajor,
      minExperience: 0, stress: 40, hours: 38,
    };
  }

  function withPeers(seed: number, field: string, years: number): GameState {
    const state = student(seed);
    cohortOf(state).forEach((m) => { m.relationship = 90; });
    graduateCohort(createCtx(state), field);
    // On avance le temps sans jouer : ce qu'on teste est l'ancienneté.
    for (const peer of peersOf(state)) peer.flags.peerSince = state.year - years;
    return state;
  }

  it('améliore les chances sur un poste de sa filière', () => {
    const state = withPeers(21, 'cs', 5);
    expect(peersOf(state).length).toBeGreaterThan(0);
    expect(networkEdge(state, offer(['cs']))).toBeGreaterThan(1);
  });

  it('ne fait rien ailleurs', () => {
    const state = withPeers(23, 'cs', 5);
    // Une autre filière : ils n'y connaissent personne.
    expect(networkEdge(state, offer(['medicine']))).toBe(1);
    // Et un poste qui n'exige aucun diplôme : il n'y a pas de filière où
    // avoir un confrère.
    expect(networkEdge(state, offer(null))).toBe(1);
  });

  it('ne fait rien tant qu’ils viennent d’arriver', () => {
    const fresh = withPeers(25, 'cs', 0);
    expect(networkEdge(fresh, offer(['cs']))).toBe(1);
    const settled = withPeers(25, 'cs', 3);
    expect(networkEdge(settled, offer(['cs']))).toBeGreaterThan(1);
  });

  it('plafonne : un carnet d’adresses ne remplace pas un dossier', () => {
    const state = withPeers(27, 'cs', 6);
    // On en ajoute beaucoup plus que ce qu'une vie peut donner.
    const model = peersOf(state)[0]!;
    for (let i = 0; i < 20; i++) {
      state.npcs[`fake_${i}`] = {
        ...model, id: `fake_${i}`, flags: { ...model.flags },
      };
    }
    const edge = networkEdge(state, offer(['cs']));
    expect(edge).toBeGreaterThan(1);
    // Le plafond est le réglage : au-delà, le réseau déciderait de l'embauche.
    expect(edge).toBeLessThanOrEqual(1.28);
  });
});

describe('ce qui n’a pas changé', () => {
  it('ne touche pas les candidatures de qui n’a pas fait d’études', () => {
    const state = createNewLife({ seed: 99 });
    for (let i = 0; i < 20 && !state.gameOver; i++) simulateYear(state);
    // Sans promotion, aucun confrère, donc aucun effet.
    expect(peersOf(state).length).toBe(0);
    for (const o of state.world.jobOffers) expect(networkEdge(state, o)).toBe(1);
  });

  it('ne laisse pas la promotion précédente traîner', () => {
    const state = student(31);
    const firstIds = cohortOf(state).map((m) => m.id);
    // Un second cursus : la promotion d'avant n'est plus la promotion.
    buildCohort(createCtx(state), 'law');
    const nowIds = cohortOf(state).map((m) => m.id);
    for (const id of firstIds) expect(nowIds).not.toContain(id);
    expect(nowIds.length).toBeGreaterThanOrEqual(3);
  });
});
