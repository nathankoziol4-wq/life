/**
 * Vérifications des titres de fin de vie.
 *
 * À la mort, le jeu ne disait qu'un nombre. Un nombre ne raconte rien : deux
 * vies opposées peuvent le partager. Ce qui suit vérifie que le titre en dit
 * davantage, et qu'il le dit honnêtement.
 *
 * Cinq exigences :
 *
 * 1. **aucun titre ne se lit sur une seule statistique** — c'est la règle du
 *    catalogue, et elle se vérifie mécaniquement ;
 * 2. **personne ne meurt sans titre**, et personne n'en a deux ;
 * 3. **le dossier dit la vérité sur ce qui s'est passé**, pas seulement sur
 *    ce qui reste — un veuf a bien été marié ;
 * 4. **les seuils sont relatifs au coût de la vie**, sinon le titre
 *    récompenserait le pays de naissance ;
 * 5. **une vie ordinaire donne un titre ordinaire** — les titres rares
 *    doivent rester rares sur des vies réellement jouées.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { buildSummary, simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { RIBBONS, getRibbon, ribbonLabel } from '../../data/ribbons.ts';
import {
  awardRibbon, earnedRibbons, livingCostOf, obituary, readLife,
  type LifeRecord,
} from '../../systems/ribbons.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Une vie jouée jusqu'au bout. */
function wholeLife(seed: number): GameState {
  const state = createNewLife({ seed });
  playTo(state, 110);
  return state;
}

/** Un dossier de vie neutre, à modifier pour isoler une règle. */
function blank(): LifeRecord {
  return {
    age: 40, livingCost: 24_000, worth: 0, lifetimeEarnings: 0, inherited: 0,
    // Une part neutre vaut la moitié, pas un. À un, « millionnaire » ne
    // demandait plus que le patrimoine — le test l'a montré, et il avait
    // raison : c'était la ligne de base qui n'était pas neutre.
    given: 0, selfMadeShare: 0.5, passiveShare: 0, reigned: 0, crownFell: false,
    jobs: 1, promotions: 0, yearsWorked: 10, topPerformance: 50, venturesRun: 0,
    degrees: 0, intelligence: 50, booksOrClubs: 0,
    children: 0, grandchildren: 0, marriages: 0, divorces: 0, yearsMarried: 0,
    partners: 0, friends: 0, familyBond: 0,
    crimesDone: 0, convictions: 0, prisonYears: 0, orgRank: 0, cleanYears: 40,
    karma: 50,
    fame: 0, famePeak: 0, fameYears: 0, fameEndAge: 40, controversy: 0,
    scandals: 0,
    placesSeen: 0, countriesLived: 1, diedAbroad: false,
    propertiesOwned: 0, rentYears: 0, investedYears: 0, vehiclesOwned: 0,
    valuablesOwned: 0, valuablesWorth: 0,
    health: 50, happiness: 50, fitness: 50, illnesses: 0, accidents: 0,
    stageId: null, stageJobs: 0, servedYears: 0, decorations: 0, mandates: 0,
    approvalEnd: 0,
  };
}

/* ------------------------------------------------------------------ */

describe('le catalogue des titres tient debout', () => {
  it('ne juge aucun titre sur une seule statistique', () => {
    // La règle du fichier, vérifiée mécaniquement : on part d'un dossier
    // neutre, on pousse **une seule** dimension à son extrême, et aucun titre
    // ne doit s'allumer — sauf « une vie ordinaire », qui accepte tout.
    const dimensions: (keyof LifeRecord)[] = [
      'worth', 'lifetimeEarnings', 'children', 'crimesDone', 'famePeak',
      'placesSeen', 'propertiesOwned', 'degrees', 'promotions', 'valuablesOwned',
    ];
    for (const key of dimensions) {
      const record = blank();
      (record[key] as number) = 10_000_000;
      const earned = RIBBONS.filter((r) => r.test(record)).map((r) => r.id);
      expect(earned, `${String(key)} seule ne doit rien décerner`).toEqual(['ordinaire']);
    }
  });

  it('donne à chaque titre un rang, un libellé et une phrase', () => {
    expect(RIBBONS.length).toBeGreaterThanOrEqual(20);
    const ids = new Set<string>();
    for (const ribbon of RIBBONS) {
      expect(ribbon.label).toBeTruthy();
      expect(ribbon.note).toBeTruthy();
      expect(ribbon.tier).toBeGreaterThanOrEqual(1);
      expect(ribbon.tier).toBeLessThanOrEqual(5);
      expect(ids.has(ribbon.id), `${ribbon.id} en double`).toBe(false);
      ids.add(ribbon.id);
      expect(getRibbon(ribbon.id)).toBeDefined();
    }
    // Le dernier accepte tout : personne ne meurt sans titre.
    expect(RIBBONS[RIBBONS.length - 1].test(blank())).toBe(true);
    expect(RIBBONS[RIBBONS.length - 1].tier).toBe(1);
  });

  it('ne garde aucun titre inatteignable', () => {
    // Un titre qu'aucune vie ne peut décrocher est du texte mort. On en
    // construit une pour chacun : si l'on n'y arrive pas, c'est que les
    // conditions se contredisent.
    const reachable = (id: string): boolean => {
      const r = blank();
      // Une vie longue, riche, accomplie et bien accompagnée : ce qui rend
      // atteignables les titres du haut du tableau.
      Object.assign(r, {
        age: 82, worth: r.livingCost * 300, lifetimeEarnings: r.livingCost * 300,
        selfMadeShare: 1, passiveShare: 0.6, jobs: 1, promotions: 8,
        yearsWorked: 40, topPerformance: 90, venturesRun: 2, degrees: 4,
        intelligence: 90, booksOrClubs: 3, children: 5, grandchildren: 6,
        marriages: 1, yearsMarried: 40, partners: 1, friends: 4, familyBond: 80,
        fameYears: 25, propertiesOwned: 5, rentYears: 20, investedYears: 30,
        vehiclesOwned: 4, valuablesOwned: 8, valuablesWorth: r.livingCost * 10,
        placesSeen: 12, countriesLived: 2, servedYears: 20, decorations: 3,
        mandates: 3, approvalEnd: 70, karma: 90, health: 70, fitness: 70,
        given: r.livingCost * 10,
      });
      // Puis on pousse le nécessaire, titre par titre : ce sont les seules
      // dimensions qu'une vie brillante n'a pas d'elle-même.
      const tweaks: Record<string, Partial<LifeRecord>> = {
        heritier: { inherited: r.livingCost * 100, selfMadeShare: 0.2 },
        depensier: { worth: 0 },
        vagabond: { jobs: 8, propertiesOwned: 0, marriages: 0 },
        bourreau: { children: 0, friends: 0 },
        solitaire: { marriages: 0, children: 0, friends: 0 },
        coeur: { partners: 6, divorces: 2 },
        horsLaLoi: { crimesDone: 20 },
        recidiviste: { convictions: 5, prisonYears: 10 },
        parrain: { orgRank: 4, crimesDone: 20 },
        redresse: { convictions: 3, cleanYears: 25 },
        icone: { famePeak: 95, controversy: 10 },
        celebre: { famePeak: 70 },
        sulfureux: { famePeak: 80, controversy: 70, scandals: 3 },
        oublie: { famePeak: 70, fame: 5, fameEndAge: 50 },
        exile: { diedAbroad: true },
        sedentaire: { placesSeen: 0, countriesLived: 1 },
        malchanceux: { illnesses: 4, accidents: 3, worth: 0 },
        increvable: { illnesses: 4 },
        athlete: { stageId: 'sport', stageJobs: 15 },
        brule: { age: 48, happiness: 15 },
        couronne: { reigned: 12 },
        derniere: { crownFell: true },
        artisan: {},
        fidele: {},
        parent: {},
        patriarche: {},
        entrepreneur: {},
        millionnaire: {},
        proprietaire: {},
        investisseur: {},
        erudit: {},
        aventurier: {},
        collectionneur: {},
        bienfaiteur: {},
        servi: {},
        elu: {},
        ordinaire: {},
      };
      Object.assign(r, tweaks[id] ?? {});
      return getRibbon(id)!.test(r);
    };
    for (const ribbon of RIBBONS) {
      expect(reachable(ribbon.id), `${ribbon.id} est inatteignable`).toBe(true);
    }
  });

  it('accorde le seul titre qui a deux formes', () => {
    expect(ribbonLabel('patriarche', 'F')).toBe('Matriarche');
    expect(ribbonLabel('patriarche', 'M')).toBe('Patriarche');
    // Tous les autres sont neutres par construction.
    for (const ribbon of RIBBONS) {
      if (ribbon.id === 'patriarche') continue;
      expect(ribbonLabel(ribbon.id, 'F')).toBe(ribbonLabel(ribbon.id, 'M'));
    }
  });

  it('échelonne la rareté', () => {
    // Il faut des titres à tous les rangs, sinon l'échelle ne dit rien.
    const tiers = new Set(RIBBONS.map((r) => r.tier));
    expect(tiers.size).toBeGreaterThanOrEqual(4);
    expect(RIBBONS.filter((r) => r.tier >= 4).length).toBeGreaterThanOrEqual(4);
  });
});

describe('ce qu’un titre demande vraiment', () => {
  it('refuse « millionnaire » à qui a seulement hérité', () => {
    const heir = blank();
    heir.worth = heir.livingCost * 200;
    heir.inherited = heir.livingCost * 200;
    heir.lifetimeEarnings = 0;
    heir.selfMadeShare = 0;
    expect(earned(heir)).not.toContain('millionnaire');
    expect(earned(heir)).toContain('heritier');

    // Le même patrimoine, gagné : le titre change.
    const made = blank();
    made.worth = made.livingCost * 200;
    made.lifetimeEarnings = made.livingCost * 200;
    made.selfMadeShare = 1;
    expect(earned(made)).toContain('millionnaire');
  });

  it('refuse « solitaire » à qui est mort jeune', () => {
    const young = blank();
    young.age = 30;
    expect(earned(young)).not.toContain('solitaire');
    // La même absence, à soixante ans : c'est un choix, plus un accident.
    const old = blank();
    old.age = 60;
    expect(earned(old)).toContain('solitaire');
  });

  it('refuse « racheté » à qui n’a rien eu à se faire pardonner', () => {
    const clean = blank();
    clean.karma = 95;
    clean.cleanYears = 60;
    expect(earned(clean)).not.toContain('redresse');
    // Il faut les deux moitiés : la faute, puis les vingt ans d'après.
    const redeemed = blank();
    redeemed.convictions = 3;
    redeemed.cleanYears = 25;
    redeemed.karma = 70;
    expect(earned(redeemed)).toContain('redresse');
  });

  it('refuse « malchanceux » à qui s’est mis dans son malheur', () => {
    const unlucky = blank();
    unlucky.illnesses = 4;
    unlucky.accidents = 3;
    expect(earned(unlucky)).toContain('malchanceux');
    // Un casier ferme ce titre : ce n'est plus de la malchance.
    unlucky.convictions = 2;
    expect(earned(unlucky)).not.toContain('malchanceux');
  });

  it('refuse « dépensier » à qui n’a jamais rien eu', () => {
    const poor = blank();
    poor.worth = 0;
    expect(earned(poor)).not.toContain('depensier');
    // Avoir gagné et n'avoir rien gardé : c'est le croisement qui compte.
    const spent = blank();
    spent.lifetimeEarnings = spent.livingCost * 40;
    spent.worth = 0;
    spent.placesSeen = 6;
    expect(earned(spent)).toContain('depensier');
  });

  it('mesure l’argent en années de vie, pas en unités', () => {
    // Le même personnage dans un pays cher et dans un pays bon marché : le
    // titre ne doit pas dépendre de l'endroit où il est né.
    const cheap = blank();
    cheap.livingCost = 6_000;
    cheap.worth = 6_000 * 100;
    cheap.lifetimeEarnings = cheap.worth;
    cheap.selfMadeShare = 1;
    const dear = blank();
    dear.livingCost = 90_000;
    dear.worth = 90_000 * 100;
    dear.lifetimeEarnings = dear.worth;
    dear.selfMadeShare = 1;
    expect(earned(cheap)).toContain('millionnaire');
    expect(earned(dear)).toContain('millionnaire');
  });
});

/** Les identifiants des titres qu'un dossier mérite. */
function earned(record: LifeRecord): string[] {
  return RIBBONS.filter((r) => r.test(record)).map((r) => r.id);
}

describe('sur des vies réellement jouées', () => {
  it('décerne un titre à tout le monde, et un seul', () => {
    let judged = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const state = wholeLife(seed);
      if (state.player.alive) continue;
      judged += 1;
      const award = awardRibbon(state);
      expect(award.id).toBeTruthy();
      expect(award.label).toBeTruthy();
      expect(award.note).toBeTruthy();
      // Le titre retenu n'est pas dans ses propres mentions.
      expect(award.mentions.map((m) => m.id)).not.toContain(award.id);
      // Et c'est bien le plus rare.
      for (const mention of award.mentions) {
        expect(mention.tier).toBeLessThanOrEqual(award.tier);
      }
    }
    expect(judged).toBeGreaterThan(15);
  });

  it('garde les titres rares rares', () => {
    const tally: Record<number, number> = {};
    let judged = 0;
    for (let seed = 100; seed < 160; seed++) {
      const state = wholeLife(seed);
      if (state.player.alive) continue;
      judged += 1;
      const tier = awardRibbon(state).tier;
      tally[tier] = (tally[tier] ?? 0) + 1;
    }
    if (judged < 30) return;
    // Une vie que personne n'a jouée ne doit presque jamais décrocher un
    // titre de rang cinq : sinon la rareté ne veut rien dire.
    expect((tally[5] ?? 0) / judged).toBeLessThan(0.15);
  });

  it('distingue une vie où l’on a fait quelque chose', () => {
    // Le pendant du test précédent, et il fallait le séparer : une vie que
    // personne ne joue *est* ordinaire, et exiger le contraire d'elle était
    // une assertion fausse. Ce qu'on doit vérifier est que le système sait
    // reconnaître une vie qui a eu lieu.
    const full = blank();
    Object.assign(full, {
      age: 78, worth: full.livingCost * 120, lifetimeEarnings: full.livingCost * 150,
      selfMadeShare: 1, jobs: 1, yearsWorked: 38, promotions: 6,
      topPerformance: 88, children: 3, grandchildren: 4, familyBond: 72,
      marriages: 1, yearsMarried: 45, friends: 3,
    });
    const earnedIds = earned(full);
    expect(earnedIds.length).toBeGreaterThan(1);
    expect(earnedIds).not.toEqual(['ordinaire']);
    // Et le titre retenu n'est pas le fond du tableau.
    const best = RIBBONS.filter((r) => r.test(full))
      .sort((a, b) => b.tier - a.tier)[0];
    expect(best.tier).toBeGreaterThan(1);
  });

  it('lit ce qui s’est passé, pas seulement ce qui reste', () => {
    const state = wholeLife(201);
    const record = readLife(state);
    // La chronique et l'état final se recoupent sans se contredire.
    expect(record.age).toBe(state.player.age);
    expect(record.livingCost).toBe(livingCostOf(state));
    expect(record.convictions).toBe(state.player.criminalRecord.convictions.length);
    expect(record.yearsWorked).toBeGreaterThanOrEqual(0);
    // Une part se calcule, elle ne se devine pas.
    expect(record.selfMadeShare).toBeGreaterThanOrEqual(0);
    expect(record.selfMadeShare).toBeLessThanOrEqual(1);
  });

  it('se souvient d’un mariage même quand il n’en reste rien', () => {
    const state = wholeLife(203);
    // La chronique est la seule source pour cela : un veuf n'a plus de
    // conjoint dans l'état final.
    state.player.chronicle.marriages = 1;
    state.player.chronicle.yearsMarried = 34;
    const record = readLife(state);
    expect(record.marriages).toBe(1);
    expect(record.yearsMarried).toBe(34);
  });

  it('écrit une épitaphe qui parle de cette vie-là', () => {
    const state = wholeLife(205);
    const text = obituary(state);
    expect(text.length).toBeGreaterThan(20);
    expect(text).toContain(String(state.player.age));
    // Deux vies différentes ne donnent pas le même texte.
    const other = wholeLife(207);
    if (!other.player.alive && !state.player.alive) {
      expect(obituary(other)).not.toBe(text);
    }
  });

  it('n’explose pas sur une vie à peine commencée', () => {
    const state = createNewLife({ seed: 209 });
    playTo(state, 2);
    expect(() => readLife(state)).not.toThrow();
    expect(earnedRibbons(state).length).toBeGreaterThan(0);
    expect(awardRibbon(state).id).toBeTruthy();
    expect(obituary(state)).toBeTruthy();
  });

  it('accompagne le bilan de fin de vie', () => {
    for (let seed = 300; seed < 320; seed++) {
      const state = wholeLife(seed);
      if (state.player.alive) continue;
      const summary = buildSummary(state, [], Number(state.player.flags.finalNetWorth ?? 0));
      expect(summary.ribbon.label).toBeTruthy();
      expect(summary.ribbon.note).toBeTruthy();
      expect(summary.epitaph).toBeTruthy();
      // Le titre et le score disent deux choses différentes : le second reste.
      expect(typeof summary.score).toBe('number');
      return;
    }
  });
});
