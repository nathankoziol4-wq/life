/**
 * La vie des autres.
 *
 * Ce que ces tests protègent n'est pas « le système tourne » : c'est chacune
 * des décisions de conception que la mesure a imposées. Chaque bloc dit
 * d'abord le chiffre qui l'a rendu nécessaire, parce qu'un seuil sans sa
 * mesure est un chiffre inventé.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  advanceLife, ailing, childRelation, coupleOdds, faraway, inner, nextRung,
  partnerRelation, rollTurn, sentenceLeft, together, told, turnOdds, turnOpen,
  visit, visitBlocker, visits,
} from '../../systems/lives.ts';
import { createPerson } from '../../systems/npc.ts';
import { DRIFT_APART, KID_CAP, TURNS, getTurn } from '../../data/lives.ts';
import type { GameState, Person } from '../types.ts';

/** Une vie jouée jusqu'à un âge, vivante quoi qu'il arrive. */
function life(seed = 404, age = 30): GameState {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < age && state.player.alive; i++) simulateYear(state);
  if (state.player.age < age) {
    state.player.alive = true;
    state.player.deathCause = null;
    state.player.deathYear = null;
    state.gameOver = false;
    state.year += age - state.player.age;
    state.player.age = age;
  }
  return state;
}

/** Quelqu'un de neuf, posé exactement où le test en a besoin. */
function someone(state: GameState, over: Partial<Person> = {}): Person {
  const p = createPerson(createCtx(state), { relation: 'brother', age: 30 });
  Object.assign(p, over);
  return p;
}

/** Joue n années en soldant tout ce qui se présente. */
function play(state: GameState, years: number): void {
  for (let y = 0; y < years && !state.gameOver; y++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
}

/* ------------------------------------------------------------------ */

describe('les quatorze tournants', () => {
  it('en a un par mécanique, chacun avec son branchement', () => {
    const ids = TURNS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(14);
    for (const turn of TURNS) {
      expect(getTurn(turn.id)).toBe(turn);
      expect(turn.odds).toBeGreaterThan(0);
      expect(turn.from).toBeLessThan(turn.to);
      expect(turn.line.length).toBeGreaterThan(4);
      expect(turn.told).toContain('{p}');
    }
  });

  it('ne fait rien arriver hors de son âge', () => {
    const state = life();
    for (const turn of TURNS) {
      const tooYoung = someone(state, { age: turn.from - 1 });
      const tooOld = someone(state, { age: turn.to + 1 });
      expect(turnOpen(state, tooYoung, turn)).toBe(false);
      expect(turnOpen(state, tooOld, turn)).toBe(false);
    }
  });

  it('ne laisse pas tomber malade qui l’est déjà, ni guérir qui va bien', () => {
    const state = life();
    const malade = getTurn('maladie')!;
    const guerison = getTurn('guerison')!;
    const bienPortant = someone(state, { age: 40 });
    expect(turnOpen(state, bienPortant, malade)).toBe(true);
    expect(turnOpen(state, bienPortant, guerison)).toBe(false);

    bienPortant.flags.illness = true;
    expect(ailing(bienPortant)).toBe(true);
    expect(turnOpen(state, bienPortant, malade)).toBe(false);
    expect(turnOpen(state, bienPortant, guerison)).toBe(true);
  });

  it('n’ouvre rien à qui est en cellule', () => {
    const state = life();
    const dedans = someone(state, { age: 35, incarcerated: true });
    for (const turn of TURNS) expect(turnOpen(state, dedans, turn)).toBe(false);
  });

  it('ne joue pas le couple du joueur à sa place', () => {
    // Mesuré : les enfants du joueur tombaient de 1,22 à 0,56 par vie, parce
    // que son conjoint divorçait tout seul et faisait des enfants ailleurs.
    const state = life();
    const conjoint = someone(state, { relation: 'spouse', age: 32, maritalStatus: 'married' });
    for (const turn of TURNS.filter((t) => t.sphere === 'cœur' || t.sphere === 'famille')) {
      expect(turnOpen(state, conjoint, turn)).toBe(false);
    }
    // Le reste de sa vie lui appartient quand même.
    const licenciement = getTurn('licenciement')!;
    conjoint.jobTitle = 'Caissier';
    expect(turnOpen(state, conjoint, licenciement)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

describe('ce qui pousse une vie', () => {
  it('fait monter l’ambitieux plus souvent que l’indifférent', () => {
    const state = life();
    const promotion = getTurn('promotion')!;
    const ambitieux = someone(state, { age: 35 });
    ambitieux.personality.ambition = 95;
    const mou = someone(state, { age: 35 });
    mou.personality.ambition = 5;
    mou.stats.discipline = ambitieux.stats.discipline;
    expect(turnOdds(ambitieux, promotion)).toBeGreaterThan(turnOdds(mou, promotion) * 2);
  });

  it('rend chaque enfant suivant moins probable', () => {
    // Mesuré sans cette décroissance : 2,38 enfants par personne, et une
    // fratrie de quinze pour la plus prolifique.
    const state = life();
    const naissance = getTurn('naissance')!;
    const parent = someone(state, { age: 30, maritalStatus: 'married' });
    const seul = turnOdds(parent, naissance);
    parent.childrenIds = ['a', 'b'];
    const avecDeux = turnOdds(parent, naissance);
    expect(avecDeux).toBeLessThan(seul * 0.3);
  });

  it('s’arrête net au plafond d’enfants', () => {
    const state = life();
    const naissance = getTurn('naissance')!;
    const parent = someone(state, { age: 30, maritalStatus: 'married' });
    parent.childrenIds = Array.from({ length: KID_CAP }, (_, i) => `k${i}`);
    expect(turnOpen(state, parent, naissance)).toBe(false);
  });

  it('marie d’autant plus volontiers que l’histoire dure', () => {
    // Sans cette maturation, aucun couple ne tenait : 0,78 enfant par adulte,
    // un monde qui se dépeuple.
    const state = life();
    const mariage = getTurn('mariage')!;
    const neuf = someone(state, { age: 28, maritalStatus: 'dating' });
    neuf.flags.since = state.year;
    const ancien = someone(state, { age: 28, maritalStatus: 'dating' });
    ancien.flags.since = state.year - 5;
    ancien.personality.loyalty = neuf.personality.loyalty;
    expect(together(state, ancien)).toBe(5);
    expect(coupleOdds(state, ancien, mariage)).toBeGreaterThan(
      coupleOdds(state, neuf, mariage) * 2,
    );
  });

  it('laisse la plupart des histoires s’arrêter sans rien laisser', () => {
    // C'est cette dérive qui garde un vivier au joueur : sans elle, tout le
    // monde était pris en quelques années et proposer un rendez-vous à une
    // camarade échouait toujours.
    expect(DRIFT_APART).toBeGreaterThan(0.2);
    const state = life();
    let libres = 0;
    for (let i = 0; i < 200; i++) {
      const encouple = someone(state, { age: 25, maritalStatus: 'dating', relation: 'friend' });
      encouple.flags.since = state.year;
      advanceLife(createCtx(state), encouple);
      if (encouple.maritalStatus === 'single') libres++;
    }
    expect(libres).toBeGreaterThan(20);
  });
});

/* ------------------------------------------------------------------ */

describe('les gens que les tournants font apparaître', () => {
  it('nomme l’enfant d’un frère un neveu, et celui d’un fils un petit-fils', () => {
    expect(childRelation('brother', 'M')).toBe('nephew');
    expect(childRelation('sister', 'F')).toBe('niece');
    expect(childRelation('son', 'M')).toBe('grandson');
    expect(childRelation('daughter', 'F')).toBe('granddaughter');
    expect(childRelation('uncle', 'M')).toBe('cousin');
    // Au-delà, le jeu ne prétend pas nommer.
    expect(childRelation('coworker', 'M')).toBeNull();
    expect(partnerRelation('brother', 'F')).toBe('inLaw');
    expect(partnerRelation('friend', 'M')).toBeNull();
    // Le sexe du conjoint décide du libellé, pas celui du marié : sans quoi
    // le fixture sortait une « tante » prénommée Erik.
    expect(partnerRelation('uncle', 'M')).toBe('uncle');
    expect(partnerRelation('uncle', 'F')).toBe('aunt');
  });

  it('fait vraiment naître quelqu’un, pas un compteur', () => {
    const state = life(77, 34);
    const ctx = createCtx(state);
    const frere = someone(state, { relation: 'brother', age: 30, maritalStatus: 'married' });
    const avant = Object.keys(state.npcs).length;
    let ne: Person | undefined;
    for (let i = 0; i < 400 && !ne; i++) {
      advanceLife(createCtx(state), frere);
      ne = Object.values(state.npcs).find((n) => n.parentIds.includes(frere.id));
    }
    expect(ne).toBeDefined();
    expect(Object.keys(state.npcs).length).toBeGreaterThan(avant);
    expect(['nephew', 'niece']).toContain(ne!.relation);
    expect(ne!.age).toBeLessThan(3);
    expect(frere.childrenIds).toContain(ne!.id);
    void ctx;
  });

  it('donne un vrai conjoint à qui se marie', () => {
    const state = life(91, 34);
    const soeur = someone(state, { relation: 'sister', age: 29, maritalStatus: 'dating' });
    soeur.flags.since = state.year - 6;
    let conjoint: Person | undefined;
    for (let i = 0; i < 300 && !conjoint; i++) {
      advanceLife(createCtx(state), soeur);
      conjoint = soeur.partnerId ? state.npcs[soeur.partnerId] : undefined;
    }
    expect(conjoint).toBeDefined();
    expect(conjoint!.relation).toBe('inLaw');
    expect(conjoint!.partnerId).toBe(soeur.id);
    expect(conjoint!.maritalStatus).toBe('married');
  });
});

/* ------------------------------------------------------------------ */

describe('ce que le joueur en apprend', () => {
  it('ne lui dit pas qu’un frère a changé d’échelon', () => {
    // Mesuré avant ce filtre : deux cents lignes de PNJ dans une seule vie.
    const state = life();
    const frere = someone(state, { relation: 'brother', relationship: 90 });
    expect(told(frere, getTurn('promotion')!)).toBe(false);
    expect(told(frere, getTurn('rencontre')!)).toBe(false);
    expect(told(frere, getTurn('mariage')!)).toBe(true);
  });

  it('ne lui dit du lointain que ce qui porte loin', () => {
    const state = life();
    const cousin = someone(state, { relation: 'cousin', relationship: 55 });
    expect(inner(cousin)).toBe(false);
    expect(told(cousin, getTurn('mariage')!)).toBe(true);
    expect(told(cousin, getTurn('licenciement')!)).toBe(false);
  });

  it('ne lui dit rien d’une simple connaissance', () => {
    const state = life();
    const vague = someone(state, { relation: 'acquaintance', relationship: 20 });
    for (const turn of TURNS) expect(told(vague, turn)).toBe(false);
  });

  it('ne noie pas une vie sous les nouvelles des autres', () => {
    const state = life(2024, 0);
    play(state, 70);
    const lignes = state.timeline.filter((e) => TURNS.some(
      (t) => e.text.includes(t.told.replace('{p} ', '').replace(/\{e\}/g, '').slice(0, 12)),
    )).length;
    expect(lignes).toBeLessThan(70);
  });
});

/* ------------------------------------------------------------------ */

describe('le patrimoine des autres', () => {
  it('ne ruine plus la moitié du monde', () => {
    // Mesuré avec l'ancienne soustraction fixe : 53,9 % des personnes du jeu
    // finissaient à zéro, ce qui vidait aussi les héritages du joueur.
    const state = life(555, 0);
    play(state, 70);
    const adultes = Object.values(state.npcs).filter((n) => !n.petSpecies && n.age >= 30);
    expect(adultes.length).toBeGreaterThan(5);
    const ruines = adultes.filter((n) => n.wealth < 1000).length;
    expect(ruines / adultes.length).toBeLessThan(0.3);
  });

  it('ne laisse pas un retraité s’enrichir de sa pension', () => {
    const state = life();
    const retraite = someone(state, { age: 70, jobTitle: 'Retraité', salary: 20_000, wealth: 100_000 });
    advanceLife(createCtx(state), retraite);
    expect(retraite.wealth).toBeLessThan(100_000);
  });

  it('fait fondre le patrimoine plus lentement à mesure qu’il fond', () => {
    const state = life();
    const sansRien = someone(state, { age: 45, jobTitle: null, salary: 0, wealth: 100_000 });
    advanceLife(createCtx(state), sansRien);
    const premierePerte = 100_000 - sansRien.wealth;
    sansRien.wealth = 10_000;
    advanceLife(createCtx(state), sansRien);
    const secondePerte = 10_000 - sansRien.wealth;
    expect(secondePerte).toBeLessThan(premierePerte);
    expect(sansRien.wealth).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */

describe('une carrière qui bouge vraiment', () => {
  it('fait monter d’un échelon nommé, pas seulement d’un salaire', () => {
    const rung = nextRung('Équipier');
    expect(rung).not.toBeNull();
    expect(rung!.title).not.toBe('Équipier');
    expect(rung!.salary).toBeGreaterThan(0);
    // Au sommet d'une échelle il n'y a plus rien à prendre.
    expect(nextRung('métier qui n’existe pas')).toBeNull();
  });

  it('laisse quelqu’un sans emploi en retrouver un', () => {
    const state = life(313, 30);
    const chomeur = someone(state, { age: 35, jobTitle: null, salary: 0 });
    for (let i = 0; i < 60 && !chomeur.jobTitle; i++) advanceLife(createCtx(state), chomeur);
    expect(chomeur.jobTitle).toBeTruthy();
    expect(chomeur.salary).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */

describe('la peine et le parloir', () => {
  it('purge la peine année après année, et pas plus vite', () => {
    const state = life();
    const dedans = someone(state, { age: 30, incarcerated: true });
    dedans.flags.sentence = 3;
    advanceLife(createCtx(state), dedans);
    expect(sentenceLeft(dedans)).toBe(2);
    advanceLife(createCtx(state), dedans);
    advanceLife(createCtx(state), dedans);
    expect(dedans.incarcerated).toBe(false);
    expect(sentenceLeft(dedans)).toBe(0);
  });

  it('ne laisse aller au parloir que qui y est, et une fois l’an', () => {
    const state = life();
    const libre = someone(state, { age: 30 });
    expect(visitBlocker(state, libre)).toBeTruthy();

    const dedans = someone(state, { age: 30, incarcerated: true });
    dedans.flags.sentence = 4;
    expect(visitBlocker(state, dedans)).toBeNull();
    const first = visit(createCtx(state), dedans.id);
    expect(first.ok).toBe(true);
    expect(visits(dedans)).toBe(1);
    expect(visitBlocker(state, dedans)).toBeTruthy();
    expect(visit(createCtx(state), dedans.id).ok).toBe(false);
    expect(visits(dedans)).toBe(1);
  });

  it('ne raccourcit rien, mais change ce qu’il en sort', () => {
    const state = life();
    const make = () => {
      const p = someone(state, { age: 30, incarcerated: true, relationship: 60 });
      p.flags.sentence = 3;
      p.stats.reputation = 40;
      return p;
    };
    const visite = make();
    const seul = make();

    for (let year = 0; year < 3; year++) {
      state.year += 1;
      visite.flags.visited = 0;
      visit(createCtx(state), visite.id);
      advanceLife(createCtx(state), visite);
      advanceLife(createCtx(state), seul);
    }
    // La peine a duré exactement le même temps pour les deux.
    expect(visite.incarcerated).toBe(false);
    expect(seul.incarcerated).toBe(false);
    // Mais on n'en sort pas dans le même état.
    expect(visite.stats.reputation).toBeGreaterThan(seul.stats.reputation);
    expect(visite.relationship).toBeGreaterThan(seul.relationship);
  });
});

/* ------------------------------------------------------------------ */

describe('sur une vie entière', () => {
  it('donne une histoire à presque tout le monde', () => {
    // Mesuré avant : 49,2 % des personnes du jeu n'avaient aucune ligne.
    const state = life(818, 0);
    play(state, 70);
    const gens = Object.values(state.npcs).filter((n) => !n.petSpecies && n.age >= 25);
    expect(gens.length).toBeGreaterThan(4);
    const vides = gens.filter((n) => n.history.length === 0).length;
    expect(vides / gens.length).toBeLessThan(0.25);
  });

  it('fait arriver de tout, pas une seule chose', () => {
    const state = life(1234, 0);
    play(state, 75);
    const spheres = new Set<string>();
    for (const npc of Object.values(state.npcs)) {
      for (const line of npc.history) {
        const turn = TURNS.find((t) => line.text === t.line.replace(/\{e\}/g, '')
          || line.text === t.line.replace(/\{e\}/g, 'e'));
        if (turn) spheres.add(turn.sphere);
      }
    }
    expect(spheres.size).toBeGreaterThanOrEqual(3);
  });

  it('garde les états rares rares', () => {
    const state = life(6161, 0);
    play(state, 75);
    const vivants = Object.values(state.npcs).filter((n) => n.alive && !n.petSpecies);
    expect(vivants.length).toBeGreaterThan(3);
    const dedans = vivants.filter((n) => n.incarcerated).length;
    const malades = vivants.filter(ailing).length;
    const loin = vivants.filter(faraway).length;
    expect(dedans / vivants.length).toBeLessThan(0.15);
    expect(malades / vivants.length).toBeLessThan(0.35);
    expect(loin / vivants.length).toBeLessThan(0.35);
  });

  it('ne prend qu’un tournant par personne et par an', () => {
    const state = life(4242, 25);
    const frere = someone(state, { relation: 'brother', age: 30 });
    const avant = frere.history.length;
    advanceLife(createCtx(state), frere);
    expect(frere.history.length - avant).toBeLessThanOrEqual(1);
  });

  it('ne consomme aucun tirage quand rien n’est possible', () => {
    // Le mélange coûtait treize tirages par personne et par année **même les
    // années où rien n'arrive**, ce qui décalait toute la séquence du jeu et
    // pesait quelques millions de tirages par mesure. Une liste parcourue en
    // rotation n'en coûte aucun quand tout est fermé.
    const state = life();
    const ctx = createCtx(state);
    const dedans = someone(state, { age: 30, incarcerated: true });
    const avant = state.rngState;
    expect(rollTurn(ctx.rng, state, dedans)).toBeNull();
    expect(state.rngState).toBe(avant);
  });
});
