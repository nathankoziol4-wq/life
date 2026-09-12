/**
 * Vérifications du palmarès.
 *
 * Le catalogue reprochait au jeu de n'avoir « aucune trace d'une vie
 * remarquable ». C'était à moitié faux : les défis existent — mais il faut les
 * jurer à l'avance — et les titres existent — mais ils ne se lisent qu'à la
 * mort. Ce qui manquait tient dans l'intervalle : **rien ne remarquait qu'une
 * vie venait de dépasser toutes les précédentes**, au moment où elle le
 * faisait.
 *
 * Six exigences :
 *
 * 1. **chaque mesure est atteignable** — une ligne qu'aucune vie ne peut
 *    remplir est une ligne morte ;
 * 2. **une mesure sans objet ne vaut pas zéro** : quelqu'un qui n'a jamais
 *    travaillé n'a pas un salaire de zéro, il n'en a pas — le compter
 *    écraserait le record d'un autre ;
 * 3. **on range au moment où cela arrive**, pas à la mort ;
 * 4. **un record se bat**, contrairement à une pièce du cabinet qui garde le
 *    premier arrivé ;
 * 5. **la première vie établit, les suivantes battent de moins en moins** —
 *    c'est ce qui en fait une échelle et non une liste à cocher ;
 * 6. **et cela n'accorde aucun avantage**, comme le cabinet des défis.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { RECORDS, getRecord, show } from '../../data/palmares.ts';
import { beats, bestOf, bests, checkRecords, currentValues } from '../../systems/palmares.ts';
import { clearBests } from '../save.ts';
import { createPerson } from '../../systems/npc.ts';

function newborn(seed = 1): GameState {
  return createNewLife({ seed });
}

function grown(seed: number, years = 40): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < years && !state.gameOver; i++) simulateYear(state);
  return state;
}

beforeEach(() => {
  clearBests();
});

describe('les mesures', () => {
  it('sont toutes distinctes, nommées et expliquées', () => {
    expect(RECORDS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(RECORDS.map((r) => r.id)).size).toBe(RECORDS.length);
    for (const record of RECORDS) {
      expect(record.label.length, record.id).toBeGreaterThan(8);
      expect(record.note.length, record.id).toBeGreaterThan(10);
      expect(show(record, 1234)).toContain('1');
    }
  });

  it('sont toutes atteignables par une vie qui fait la chose', () => {
    /*
     * **Ce test existe parce que la mesure d'abord faite disait le contraire.**
     * Sur soixante vies jouées sans intervention, huit mesures sur dix-sept ne
     * se remplissaient jamais : salaire, métiers, biens, défis… Ce n'était pas
     * un défaut des mesures mais du banc d'essai — une vie qu'on laisse courir
     * ne postule à aucun emploi, ne jure aucun défi et n'achète rien. On
     * construit donc l'état à la main, ce qui vérifie ce que le test prétend
     * vérifier : que le lecteur sait lire la chose quand elle existe.
     */
    const state = grown(3, 30);
    const p = state.player;
    p.job = { ...(p.job ?? {} as never), salary: 48_000, title: 'Chef', jobId: 'x', level: 1 } as never;
    p.careerHistory = [{ jobId: 'a' }, { jobId: 'b' }] as never;
    p.livedCountries = ['fr', 'us'];
    p.seenPlaces = ['a', 'b', 'c'];
    p.followers = 4_200;
    p.fame.peak = 44;
    p.money = 900_000;
    p.education.grades = 17;
    p.education.degrees = [{ id: 'd', name: 'Licence', majorId: null, level: 3, year: state.year - 8, honors: false }];
    p.skills = { parole: { level: 88, peak: 88, done: 9 } } as never;
    p.languages = { en: 70, es: 61 };
    p.properties = [{ id: 'p' }] as never;
    p.vehicles = [{ id: 'v' }] as never;
    p.valuables = [{ id: 'o' }] as never;
    p.criminalRecord.convictions = [
      { crimeId: 'x', crimeName: 'Vol', year: state.year - 3, sentenceYears: 6, fine: 0, appealed: false },
    ];
    p.challenges = [{ id: 'c', since: 1, done: [], failed: null, doneYear: state.year }];
    // Et de vraies personnes autour : un enfant, et quelqu'un de proche.
    const ctx = createCtx(state);
    createPerson(ctx, { relation: 'son', age: 4 });
    const close = createPerson(ctx, { relation: 'bestFriend', age: 30 });
    close.relationship = 82;

    const values = currentValues(state);
    const missing = RECORDS.filter((r) => !values.has(r.id)).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it('ne comptent pas pour zéro ce qui n’a pas eu lieu', () => {
    // Un nouveau-né n'a ni salaire, ni métier, ni diplôme, ni condamnation.
    const values = currentValues(newborn(5));
    for (const id of ['salaire', 'metiers', 'diplome', 'peine', 'defis', 'biens']) {
      expect(values.has(id), id).toBe(false);
    }
  });
});

describe('battre un record', () => {
  it('range au moment où cela arrive, et pas à la mort', () => {
    /*
     * `simulateYear` appelle déjà `checkRecords` chaque année : au bout de
     * vingt-cinq ans le palmarès porte donc l'âge atteint **par quelqu'un de
     * vivant**. C'est exactement ce qu'on veut vérifier, et c'est ce qui le
     * distingue des titres, qui ne se lisent qu'à la mort.
     */
    const state = grown(7, 25);
    expect(state.player.alive).toBe(true);
    expect(bests().length).toBeGreaterThan(0);
    const age = bestOf('age');
    expect(age?.value).toBe(state.player.age);
    expect(age?.who).toContain(state.player.firstName);
    expect(age?.age).toBe(state.player.age);
  });

  it('se bat, contrairement à une pièce du cabinet', () => {
    /*
     * Le cabinet garde la **première** vie qui a réussi un défi ; refaire le
     * défi ne réécrit pas son histoire. Un record est l'inverse : il n'a de
     * sens que s'il tombe.
     */
    const first = grown(9, 22);
    checkRecords(createCtx(first));
    const held = bestOf('age')!.value;

    const second = grown(11, 60);
    if (second.player.age <= held) return;
    checkRecords(createCtx(second));
    expect(bestOf('age')!.value).toBe(second.player.age);
    expect(bestOf('age')!.who).toContain(second.player.firstName);
  });

  it('sait dans quel sens va chaque mesure', () => {
    const age = getRecord('age')!;
    const diplome = getRecord('diplome')!;
    expect(beats(age, 80, 60)).toBe(true);
    expect(beats(age, 40, 60)).toBe(false);
    // Le plus jeune diplômé : ici, le plus petit gagne.
    expect(diplome.lower).toBe(true);
    expect(beats(diplome, 19, 24)).toBe(true);
    expect(beats(diplome, 29, 24)).toBe(false);
    // Et sans rien à battre, tout compte.
    expect(beats(age, 1, undefined)).toBe(true);
  });
});

describe('l’échelle', () => {
  it('se remplit d’abord puis résiste', () => {
    /*
     * Mesuré sur soixante vies laissées courir : la première en établit sept,
     * la deuxième cinq, la dixième une, et au-delà de la vingtième la médiane
     * tombe à zéro. C'est ce qu'on veut d'un record — qu'il devienne difficile
     * — et c'est ce qui le distingue d'une liste qui se coche.
     *
     * Le test ne demande pas ces chiffres exacts : il demande la **forme**,
     * qui est ce qui compte et ce qui doit survivre à un réglage.
     */
    let firstLife = 0;
    let lateLives = 0;
    for (let seed = 1; seed <= 14; seed++) {
      const before = new Map(bests().map((b) => [b.recordId, b.value]));
      const state = grown(seed, 70);
      checkRecords(createCtx(state));
      const broken = bests().filter((b) => before.get(b.recordId) !== b.value).length;
      if (seed === 1) firstLife = broken;
      if (seed > 8) lateLives += broken;
    }
    expect(firstLife).toBeGreaterThan(3);
    // Six vies tardives battent ensemble moins que la première à elle seule.
    expect(lateLives).toBeLessThan(firstLife);
  });

  it('n’accorde aucun avantage', () => {
    /*
     * La même règle que le cabinet des défis, et vérifiée de la même façon :
     * on compare une partie dont le palmarès est vide à la même partie dont le
     * palmarès est plein. Rien du personnage ne doit différer.
     */
    const empty = grown(13, 30);
    const snapshot = JSON.stringify({
      stats: empty.player.stats, money: empty.player.money, age: empty.player.age,
    });

    // On remplit le palmarès avec ce qu'une longue vie laisse derrière elle…
    grown(17, 75);
    expect(bests().length).toBeGreaterThan(0);
    const rich = grown(13, 30);
    expect(JSON.stringify({
      stats: rich.player.stats, money: rich.player.money, age: rich.player.age,
    })).toBe(snapshot);
  });
});
