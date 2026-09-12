/**
 * Où l'on met son enfant.
 *
 * **Ce fichier s'appelle `scolarite` et non `ecole`**, parce que `ecole.test.ts`
 * existe déjà et teste tout autre chose : la vie scolaire du joueur lui-même —
 * ses camarades, ses professeurs, le redoublement, le changement
 * d'établissement. Les deux ne se recouvrent pas d'une ligne : l'un porte sur
 * l'école qu'on subit, l'autre sur celle qu'on choisit pour quelqu'un d'autre.
 *
 * Le catalogue disait « on paie ce qu'il faut sans choisir d'établissement »
 * (`Relations/Enfants`). C'était exact — et d'autant plus dommage que
 * `data/schools.ts` porte depuis toujours onze archétypes complets qui
 * servaient à *tirer* l'école du joueur d'après son quartier.
 *
 * Six exigences :
 *
 * 1. **ne rien choisir reste jouable** — le système s'ajoute, il ne taxe
 *    personne ;
 * 2. **ce n'est pas une échelle de prix** : le meilleur établissement du
 *    catalogue est gratuit sur presque tous les axes, et le plus cher perd ;
 * 3. **certains se méritent** au lieu de s'acheter ;
 * 4. **l'accord entre l'enfant et le lieu décide** : un lieu exigeant sur un
 *    enfant qui ne suit pas donne des résultats à moitié et du malheur entier ;
 * 5. **changer coûte**, sinon ce serait un curseur qu'on ajuste chaque année ;
 * 6. **cela se voit à la clôture de l'enfance** — c'est ce que reprendra
 *    `lineage.ts#continueAs`.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import {
  DEMANDS, FROM, MARK_FLOOR, MOVE_STING, SELECTIVE, UNTIL,
} from '../../data/schooling.ts';
import {
  advanceSchooling, archetypeOf, atSchoolAge, enrol, enrolBlocker, fitOf,
  optionsFor, schoolLegacy, schoolOf, schoolingLoad, tuitionOf,
} from '../../systems/schooling.ts';
import { crowding } from '../../systems/moonlight.ts';

/** Un parent qui a de quoi, et un enfant dont on choisit ce qu'il vaut. */
function home(discipline = 50, intelligence = 50, age = 8): { state: GameState; child: Person } {
  const state = createNewLife({ seed: 5150 });
  state.player.age = 38;
  state.player.money = 5_000_000;
  const child: Person = {
    id: 'kid',
    firstName: 'Sacha', lastName: 'Témoin', sex: 'M',
    birthYear: state.year - age, birthMonth: 1, birthDay: 1, age, alive: true,
    stats: { ...state.player.stats, intelligence, happiness: 55, health: 80 },
    personality: {
      warmth: 50, ambition: 50, temper: 50, loyalty: 50, generosity: 50,
      madness: 8, discipline, religiosity: 20, sociability: 50,
    },
    orientation: 'hetero',
    relation: 'son', relationship: 60, opinion: 60,
    wealth: 0, jobTitle: null, salary: 0, maritalStatus: 'single',
    parentIds: [], childrenIds: [], partnerId: null, exPartnerIds: [],
    metYear: state.year - age, lastInteractionYear: state.year,
    interactionsThisYear: 0, estranged: false, incarcerated: false,
    history: [], flags: {},
    upbringing: {
      attention: 0, schooling: 0, invested: 0, hand: 0, mark: 11,
      doneThisYear: 0, record: [], grownYear: null,
    },
  };
  state.npcs[child.id] = child;
  return { state, child };
}

/** Douze années d'école, sans que le parent fasse quoi que ce soit d'autre. */
function schoolYears(state: GameState, child: Person, years: number): void {
  for (let i = 0; i < years && atSchoolAge(child); i += 1) {
    advanceSchooling(createCtx(state), child);
    child.age += 1;
    state.year += 1;
  }
}

describe('ce que le système ne casse pas', () => {
  it('laisse un enfant dont on n’a rien décidé exactement comme avant', () => {
    const { state, child } = home();
    expect(schoolOf(child)).toBeNull();
    const before = { ...child.stats };
    advanceSchooling(createCtx(state), child);
    expect(child.stats.intelligence).toBe(before.intelligence);
    expect(child.stats.happiness).toBe(before.happiness);
    expect(state.player.money).toBe(5_000_000);
  });

  it('ne s’ouvre qu’à l’âge de l’école', () => {
    const young = home(50, 50, 4);
    expect(atSchoolAge(young.child)).toBe(false);
    expect(enrolBlocker(young.state, young.child, 'publicOrdinary')).toContain(String(FROM));
    const grown = home(50, 50, UNTIL);
    expect(atSchoolAge(grown.child)).toBe(false);
    expect(enrolBlocker(grown.state, grown.child, 'publicOrdinary')).toContain('finie');
  });
});

describe('ce que ce n’est pas', () => {
  it('n’est pas une échelle de prix : le meilleur niveau est gratuit', () => {
    /*
     * Mesuré sur vingt-quatre enfances de douze ans, à enfant identique : le
     * lycée public réputé sort à 56 de tête pour zéro franc, l'établissement
     * privé d'élite à 55 pour cent trois mille. Ce que le second vend est le
     * carnet d'adresses, et rien d'autre.
     */
    const free = archetypeOf('publicSelective')!;
    const paid = archetypeOf('privateElite')!;
    expect(free.tuitionRatio).toBe(0);
    expect(paid.tuitionRatio).toBeGreaterThan(0);
    expect(free.academic).toBeLessThan(paid.academic);
    // Mais ce qu'il en reste après l'accord n'est pas ce que le catalogue dit :
    // le privé d'élite demande beaucoup plus, et peu d'enfants suivent.
    const ordinary = { personality: { discipline: 50 }, stats: { intelligence: 50 } } as Person;
    expect(fitOf(ordinary, 'privateElite')).toBeLessThan(fitOf(ordinary, 'publicSelective'));
  });

  it('ne laisse aucun établissement gagner sur tous les tableaux', () => {
    for (const demand of DEMANDS) {
      const school = archetypeOf(demand.id)!;
      const bestOn = [
        DEMANDS.every((d) => school.academic >= archetypeOf(d.id)!.academic),
        DEMANDS.every((d) => school.bullying <= archetypeOf(d.id)!.bullying),
        DEMANDS.every((d) => school.alumni >= archetypeOf(d.id)!.alumni),
        DEMANDS.every((d) => school.tuitionRatio <= archetypeOf(d.id)!.tuitionRatio),
        DEMANDS.every((d) => demand.takes <= d.takes),
        DEMANDS.every((d) => demand.yours <= d.yours),
      ].filter(Boolean).length;
      expect(bestOn, demand.id).toBeLessThan(4);
    }
  });

  it('en réserve qui se méritent au lieu de s’acheter', () => {
    const { state, child } = home(50, 50, 8);
    for (const id of Object.keys(SELECTIVE)) {
      // Trop jeune, même avec tout l'argent du monde.
      expect(enrolBlocker(state, child, id), id).toContain('ans');
    }
    // Et à l'âge voulu, il faut encore la moyenne.
    const older = home(50, 50, 14);
    older.child.upbringing!.mark = MARK_FLOOR - 2;
    expect(enrolBlocker(older.state, older.child, 'publicSelective')).toContain('moyenne');
    older.child.upbringing!.mark = MARK_FLOOR + 2;
    expect(enrolBlocker(older.state, older.child, 'publicSelective')).toBeNull();
  });
});

describe('l’accord entre l’enfant et le lieu', () => {
  it('décide de ce qu’il en tire, et de ce qu’il y vit', () => {
    const suits = home(85, 80);
    enrol(createCtx(suits.state), suits.child.id, 'boarding');
    schoolYears(suits.state, suits.child, 10);

    const struggles = home(22, 30);
    enrol(createCtx(struggles.state), struggles.child.id, 'boarding');
    schoolYears(struggles.state, struggles.child, 10);

    expect(fitOf(struggles.child, 'boarding')).toBeLessThan(fitOf(suits.child, 'boarding'));
    expect(struggles.child.stats.intelligence).toBeLessThan(suits.child.stats.intelligence);
    expect(struggles.child.stats.happiness).toBeLessThan(suits.child.stats.happiness);
  });

  it('rend un lieu doux préférable pour qui ne suit pas', () => {
    const hard = home(20, 28);
    enrol(createCtx(hard.state), hard.child.id, 'boarding');
    schoolYears(hard.state, hard.child, 10);

    const soft = home(20, 28);
    enrol(createCtx(soft.state), soft.child.id, 'alternative');
    schoolYears(soft.state, soft.child, 10);

    expect(soft.child.stats.happiness).toBeGreaterThan(hard.child.stats.happiness);
  });
});

describe('ce que cela coûte à celui qui décide', () => {
  it('se paie tous les ans, sur la même poche que le reste', () => {
    // L'internat et non le privé d'élite : ce dernier est sélectif, on n'y
    // entre pas à huit ans, et l'inscription échouait sans que le test le
    // voie — il mesurait alors une école qui n'existait pas.
    const { state, child } = home();
    expect(enrol(createCtx(state), child.id, 'boarding').ok).toBe(true);
    const cost = tuitionOf(state, 'boarding');
    expect(cost).toBeGreaterThan(0);
    const before = state.player.money;
    advanceSchooling(createCtx(state), child);
    expect(state.player.money).toBe(before - cost);
  });

  it('renvoie l’enfant au public quand on ne peut plus payer', () => {
    const { state, child } = home();
    expect(enrol(createCtx(state), child.id, 'boarding').ok).toBe(true);
    state.player.money = 1;
    advanceSchooling(createCtx(state), child);
    expect(schoolOf(child)).toBe('publicOrdinary');
  });

  it('prend l’enfant, ou prend tes années, selon le lieu', () => {
    const away = home();
    enrol(createCtx(away.state), away.child.id, 'boarding');
    const bond = away.child.relationship;
    advanceSchooling(createCtx(away.state), away.child);
    expect(away.child.relationship).toBeLessThan(bond);

    const at = home();
    expect(crowding(at.state)).toBe(0);
    enrol(createCtx(at.state), at.child.id, 'homeschool');
    expect(schoolingLoad(at.state)).toBeGreaterThan(0);
    expect(crowding(at.state)).toBeGreaterThan(0);
  });

  it('fait payer le changement d’école', () => {
    const { state, child } = home();
    enrol(createCtx(state), child.id, 'publicOrdinary');
    const before = child.stats.happiness;
    const out = enrol(createCtx(state), child.id, 'privateContract');
    expect(out.ok).toBe(true);
    expect(out.message).toContain('camarades');
    expect(child.stats.happiness).toBe(before - MOVE_STING);
  });
});

describe('ce qu’il en reste', () => {
  it('laisse un réseau qui vaut quelque chose, et pas partout le même', () => {
    const rich = home();
    enrol(createCtx(rich.state), rich.child.id, 'boarding');
    const plain = home();
    enrol(createCtx(plain.state), plain.child.id, 'publicStruggling');
    expect(schoolLegacy(rich.child)).toBeGreaterThan(schoolLegacy(plain.child) + 3);
  });

  it('propose bien onze établissements, chacun avec sa raison ou son prix', () => {
    const { state, child } = home(50, 50, 14);
    const rows = optionsFor(state, child);
    expect(rows).toHaveLength(DEMANDS.length);
    // Chaque ligne dit soit ce qu'elle coûte, soit pourquoi elle est fermée.
    for (const row of rows) {
      expect(row.cost >= 0 && (row.why === null || row.why.length > 0), row.demand.id).toBe(true);
    }
    // Et au moins la moitié est réellement ouverte à un enfant ordinaire.
    expect(rows.filter((r) => r.why === null).length).toBeGreaterThan(rows.length / 2);
  });
});
