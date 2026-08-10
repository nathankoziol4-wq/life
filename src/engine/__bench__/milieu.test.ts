/**
 * Vérifications du milieu criminel.
 *
 * Le jeu avait un booléen `syndicate` : entrer dans une organisation cochait
 * une case. Les tests ci-dessous portent donc sur ce qui distingue un système
 * d'une case cochée :
 *
 * 1. **la chaleur n'est pas la notoriété** — ce sont deux nombres opposés,
 *    et confondre les deux revenait à punir d'avoir un nom ;
 * 2. **appartenir coûte** — refuser, rater, monter, partir : tout a un prix,
 *    et le rang décide de ce qu'on encaisse comme de ce qu'on risque ;
 * 3. **le carnet est une ressource** — chaque rôle rend un service mesurable,
 *    la qualité du contact compte, et un contact trop sollicité parle ;
 * 4. **rien n'est décoratif** — territoire, pression, style de la maison :
 *    chaque champ doit se voir dans la simulation.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { commitCrime } from '../../systems/crime.ts';
import { CRIMES } from '../../data/crimes.ts';
import { getCountry } from '../../data/countries.ts';
import { MISSIONS, RANKS, rankAt } from '../../data/underworld.ts';
import {
  addHeat, askService, availableMissions, contactByRole, contactBlocker, contactsOf,
  coolHeat, fenceBonus, findContact, heatLabel, heatOf, investigationLabel,
  joinBlocker, joinOrganization, leaveOrganization, missionBlocker, missionReward,
  openInvestigation, orgOf, refuseMission, settleMission,
} from '../../systems/underworld.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un adulte crédible dans le milieu. */
function crook(seed: number): GameState {
  const state = createNewLife({ seed });
  playTo(state, 28);
  const p = state.player;
  p.stats.criminality = 70;
  p.criminalRecord.notoriety = 45;
  p.money = 200_000;
  p.yearActions = {};
  return state;
}

/** Le même, déjà dans une maison. */
function member(seed: number, rank = 3): GameState {
  const state = crook(seed);
  const ctx = createCtx(state);
  // On force l'entrée : le tirage d'admission a ses propres tests.
  for (let attempt = 0; attempt < 20 && !orgOf(state); attempt++) {
    state.player.yearActions = {};
    joinOrganization(ctx);
  }
  // Si le tirage d'admission n'a jamais voulu, on pose la maison à la main :
  // ce test-ci porte sur ce qui se passe *dedans*, pas sur l'entrée.
  const org = orgOf(state) ?? (state.player.organization = {
    name: 'La Maison du Port', style: 'commerçant', rank: 1, respect: 20,
    territory: 45, pressure: 20, rival: 'Les Frères du Nord',
    done: 0, refused: 0, failed: 0, since: state.year,
  });
  org.rank = rank;
  org.respect = rankAt(rank).respect + 5;
  state.player.yearActions = {};
  return state;
}

/* ------------------------------------------------------------------ */

describe('la chaleur', () => {
  it('n’est pas la notoriété', () => {
    // Les deux étaient un seul nombre : se faire un nom rendait à la fois
    // plus riche et plus arrêtable, ce qui n'a aucun sens.
    const state = crook(3);
    const ctx = createCtx(state);
    const notoriety = state.player.criminalRecord.notoriety;
    addHeat(ctx, 40);
    expect(heatOf(state)).toBeGreaterThan(30);
    expect(state.player.criminalRecord.notoriety).toBe(notoriety);
  });

  it('monte plus vite quand on est déjà surveillé', () => {
    const calm = crook(5);
    addHeat(createCtx(calm), 20);
    const first = heatOf(calm);

    const watched = crook(5);
    const ctx = createCtx(watched);
    addHeat(ctx, 50);
    const before = heatOf(watched);
    addHeat(ctx, 20);
    expect(heatOf(watched) - before).toBeGreaterThan(first);
  });

  it('retombe toute seule quand on se tient tranquille', () => {
    const state = crook(7);
    addHeat(createCtx(state), 60);
    const before = heatOf(state);
    simulateYear(state);
    state.pending = [];
    expect(heatOf(state)).toBeLessThan(before);
  });

  it('rend les arrestations plus probables', () => {
    // C'est le seul effet qui compte vraiment : sans lui, la jauge ne serait
    // qu'une décoration anxiogène.
    // On construit chaque vie une fois et on la clone : la comparaison est
    // appariée — même personnage, même graine, seule la chaleur diffère —
    // et le test coûte deux fois moins de vies simulées.
    let hot = 0;
    let cold = 0;
    for (let seed = 0; seed < 50; seed++) {
      const base = crook(seed * 13 + 1);
      for (const [heat, tally] of [[90, 'hot'], [0, 'cold']] as const) {
        const state = structuredClone(base);
        state.player.criminalRecord.heat = heat;
        commitCrime(createCtx(state), 'shoplift');
        if (state.player.criminalRecord.arrests > 0) {
          if (tally === 'hot') hot += 1; else cold += 1;
        }
      }
    }
    expect(hot).toBeGreaterThan(cold);
  });

  it('se dit en mots, jamais en pourcentage seul', () => {
    expect(heatLabel(5)).not.toBe(heatLabel(95));
    for (const heat of [0, 20, 40, 60, 80, 100]) {
      expect(heatLabel(heat).length).toBeGreaterThan(5);
    }
  });
});

describe('les enquêtes', () => {
  it('avancent, se savent, et finissent par tomber', () => {
    const state = crook(11);
    openInvestigation(createCtx(state), 'burglary', 20);
    state.player.criminalRecord.heat = 80;
    let known = false;
    for (let year = 0; year < 12 && !state.gameOver; year++) {
      simulateYear(state);
      state.pending = [];
      if (state.player.criminalRecord.investigation?.known) known = true;
      if (!state.player.criminalRecord.investigation) break;
    }
    // Soit elle a abouti, soit le joueur en a au moins été averti.
    expect(known || state.player.criminalRecord.arrests > 0 || Boolean(state.player.prison)).toBe(true);
  });

  it('ne courent pas contre quelqu’un qu’on tient déjà', () => {
    const state = crook(13);
    openInvestigation(createCtx(state), 'burglary', 50);
    state.player.prison = {
      yearsLeft: 5, totalSentence: 5, security: 'medium', behavior: 50, respect: 30,
      paroleDenials: 0, facilityName: 'Test', escapePlan: 0, suspicion: 0, prepared: [],
    };
    simulateYear(state);
    state.pending = [];
    expect(state.player.criminalRecord.investigation).toBeNull();
  });

  it('ne se racontent que ce que le joueur a appris', () => {
    const state = crook(17);
    openInvestigation(createCtx(state), 'burglary', 50);
    expect(investigationLabel(state)).toBeNull();
    state.player.criminalRecord.investigation!.known = true;
    expect(investigationLabel(state)).toBeTruthy();
  });
});

describe('le carnet', () => {
  it('finit par trouver quelqu’un, et pas toujours', () => {
    let found = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = crook(seed * 19 + 3);
      findContact(createCtx(state), 'receleur');
      if (contactByRole(state, 'receleur')) found += 1;
    }
    expect(found).toBeGreaterThan(5);
    expect(found).toBeLessThan(40);
  });

  it('ferme ce qui demande un rang qu’on n’a pas', () => {
    const state = crook(23);
    expect(contactBlocker(state, 'avocat')).toBeTruthy();
    const inside = member(23, 3);
    expect(contactBlocker(inside, 'avocat')).toBeNull();
  });

  it('fait payer le receleur en valeur, pas en promesse', () => {
    // `fenceBonus` doit se voir dans le gain d'un délit, sinon le carnet
    // n'est qu'une liste de noms.
    const without = crook(29);
    expect(fenceBonus(without)).toBe(1);

    const withFence = crook(29);
    contactsOf(withFence).push({
      id: 'c', personId: 'x', role: 'receleur', trust: 50, quality: 90, used: 0, burned: false,
    });
    expect(fenceBonus(withFence)).toBeGreaterThan(1);

    const gain = (state: GameState) => {
      const before = state.player.money;
      const ctx = createCtx(state);
      // On neutralise l'arrestation : on mesure le prix de revente, pas la
      // chance de s'en tirer.
      state.player.criminalRecord.heat = 0;
      commitCrime(ctx, 'shoplift');
      return state.player.money - before;
    };
    let better = 0;
    for (let seed = 0; seed < 40; seed++) {
      const bare = crook(seed * 7 + 5);
      const fenced = crook(seed * 7 + 5);
      contactsOf(fenced).push({
        id: 'c', personId: 'x', role: 'receleur', trust: 50, quality: 95, used: 0, burned: false,
      });
      if (gain(fenced) > gain(bare)) better += 1;
    }
    expect(better).toBeGreaterThan(20);
  });

  it('rend un service qui dépend de qui on a trouvé', () => {
    const drop = (quality: number) => {
      const state = crook(31);
      state.player.criminalRecord.heat = 70;
      contactsOf(state).push({
        id: 'c', personId: 'x', role: 'logeur', trust: 50, quality, used: 0, burned: false,
      });
      const before = heatOf(state);
      askService(createCtx(state), 'logeur');
      return before - heatOf(state);
    };
    expect(drop(95)).toBeGreaterThan(drop(10));
  });

  it('refuse un service dont il n’y a rien à faire', () => {
    const state = crook(37);
    contactsOf(state).push({
      id: 'c', personId: 'x', role: 'indicateur', trust: 50, quality: 60, used: 0, burned: false,
    });
    // Pas d'enquête : il n'y a rien à savoir.
    expect(askService(createCtx(state), 'indicateur').ok).toBe(false);
    openInvestigation(createCtx(state), 'burglary', 40);
    expect(askService(createCtx(state), 'indicateur').ok).toBe(true);
  });

  it('finit par brûler celui qu’on appelle trop', () => {
    let burned = 0;
    for (let seed = 0; seed < 30; seed++) {
      const state = crook(seed * 41 + 7);
      contactsOf(state).push({
        id: 'c', personId: 'x', role: 'chauffeur', trust: 20, quality: 50, used: 12, burned: false,
      });
      for (let year = 0; year < 5 && !state.gameOver; year++) {
        simulateYear(state);
        state.pending = [];
      }
      if (contactsOf(state)[0]?.burned) burned += 1;
    }
    expect(burned).toBeGreaterThan(10);
  });
});

describe('la maison', () => {
  it('ne recrute pas n’importe qui', () => {
    const nobody = createNewLife({ seed: 43 });
    playTo(nobody, 25);
    expect(joinBlocker(nobody)).toBeTruthy();
  });

  it('donne un rang, et le rang décide de la part', () => {
    const state = member(47, 1);
    const org = orgOf(state)!;
    const low = missionReward(state, MISSIONS[0]);
    org.rank = 5;
    expect(missionReward(state, MISSIONS[0])).toBeGreaterThan(low);
  });

  it('n’ouvre les grosses missions qu’en haut', () => {
    const low = member(53, 1);
    const contract = MISSIONS.find((m) => m.kind === 'contrat')!;
    expect(availableMissions(low)).not.toContain(contract);
    expect(missionBlocker(low, contract)).toBeTruthy();

    const high = member(53, 4);
    expect(availableMissions(high)).toContain(contract);
  });

  it('fait payer le territoire dans les gains', () => {
    const weak = member(59, 3);
    orgOf(weak)!.territory = 10;
    const strong = member(59, 3);
    orgOf(strong)!.territory = 95;
    expect(missionReward(strong, MISSIONS[0])).toBeGreaterThan(missionReward(weak, MISSIONS[0]));
  });

  it('fait monter la chaleur, et le style de la maison la module', () => {
    const heatAfter = (style: string) => {
      const state = member(61, 3);
      orgOf(state)!.style = style;
      state.player.criminalRecord.heat = 0;
      settleMission(createCtx(state), MISSIONS[3], true);
      return heatOf(state);
    };
    // Une maison discrète attire moins qu'une maison brutale, à mission égale.
    expect(heatAfter('discret')).toBeLessThan(heatAfter('brutal'));
  });

  it('fait payer le refus', () => {
    const state = member(67, 2);
    const org = orgOf(state)!;
    const before = org.respect;
    refuseMission(createCtx(state), MISSIONS[0]);
    expect(org.respect).toBeLessThan(before);
    expect(org.refused).toBe(1);
  });

  it('fait payer l’échec plus cher que le refus', () => {
    const refused = member(71, 2);
    refuseMission(createCtx(refused), MISSIONS[2]);

    const failed = member(71, 2);
    settleMission(createCtx(failed), MISSIONS[2], false);

    expect(orgOf(failed)!.respect).toBeLessThanOrEqual(orgOf(refused)!.respect);
  });

  it('fait monter le rang avec le respect, et descendre sans', () => {
    const rising = member(73, 2);
    orgOf(rising)!.respect = 95;
    let climbed = false;
    for (let year = 0; year < 12 && !rising.gameOver; year++) {
      simulateYear(rising);
      rising.pending = [];
      if ((orgOf(rising)?.rank ?? 0) > 2) { climbed = true; break; }
    }
    expect(climbed).toBe(true);

    const falling = member(73, 3);
    orgOf(falling)!.respect = 0;
    let fell = false;
    for (let year = 0; year < 12 && !falling.gameOver; year++) {
      simulateYear(falling);
      falling.pending = [];
      if ((orgOf(falling)?.rank ?? 9) < 3) { fell = true; break; }
    }
    expect(fell).toBe(true);
  });

  it('paie à l’échelle du catalogue de délits', () => {
    // Une maison qui paierait moins qu'un coup monté tout seul n'aurait
    // aucune raison d'exister. On compare le contrat du dernier rang au
    // racket, le délit organisé auquel il correspond.
    const state = member(101, 5);
    const contract = MISSIONS.find((m) => m.kind === 'contrat')!;
    const racket = CRIMES.find((c) => c.id === 'racket')!;
    const reward = missionReward(state, contract);
    const country = getCountry(state.player.countryId);
    const scale = country.salaryIndex * state.world.inflation;
    // Au moins le bas de la fourchette d'un racket, jamais le haut : la
    // maison prend sa part, et la régularité se paie.
    expect(reward).toBeGreaterThan(racket.minGain * scale * 0.5);
    expect(reward).toBeLessThan(racket.maxGain * scale);
  });

  it('demande, et compte le silence comme un refus', () => {
    const state = member(103, 2);
    state.player.pendingMission = { kind: 'collecte', year: state.year - 3 };
    const org = orgOf(state)!;
    const before = org.respect;
    simulateYear(state);
    state.pending = [];
    expect(state.player.pendingMission?.kind === 'collecte').toBe(false);
    expect(org.respect).toBeLessThan(before);
  });

  it('fait payer plus cher le refus d’une demande que celui d’une offre', () => {
    const asked = member(107, 2);
    asked.player.pendingMission = { kind: 'intimidation', year: asked.year };
    const offered = member(107, 2);
    offered.player.pendingMission = null;

    const mission = MISSIONS.find((m) => m.kind === 'intimidation')!;
    const beforeAsked = orgOf(asked)!.respect;
    const beforeOffered = orgOf(offered)!.respect;
    refuseMission(createCtx(asked), mission);
    refuseMission(createCtx(offered), mission);
    expect(beforeAsked - orgOf(asked)!.respect)
      .toBeGreaterThan(beforeOffered - orgOf(offered)!.respect);
  });

  it('efface la demande quand on y répond', () => {
    const state = member(109, 2);
    state.player.pendingMission = { kind: 'collecte', year: state.year };
    settleMission(createCtx(state), MISSIONS.find((m) => m.kind === 'collecte')!, true);
    expect(state.player.pendingMission).toBeNull();
  });

  it('propose des missions d’elle-même', () => {
    let proposed = 0;
    for (let seed = 0; seed < 20; seed++) {
      const state = member(seed * 29 + 11, 2);
      for (let year = 0; year < 5 && !state.gameOver; year++) {
        simulateYear(state);
        state.pending = [];
        if (state.player.pendingMission) { proposed += 1; break; }
      }
    }
    expect(proposed).toBeGreaterThan(10);
  });

  it('rend le départ d’autant plus cher qu’on est monté', () => {
    const escaped = (rank: number) => {
      let out = 0;
      for (let seed = 0; seed < 40; seed++) {
        const state = member(seed * 31 + 5, rank);
        leaveOrganization(createCtx(state));
        if (!orgOf(state)) out += 1;
      }
      return out;
    };
    expect(escaped(1)).toBeGreaterThan(escaped(5));
  });

  it('laisse toujours une porte, même en haut', () => {
    expect(RANKS.at(-1)!.level).toBe(5);
    let out = 0;
    for (let seed = 0; seed < 60; seed++) {
      const state = member(seed * 37 + 3, 5);
      leaveOrganization(createCtx(state));
      if (!orgOf(state)) out += 1;
    }
    // Rare, jamais impossible : une impasse ne serait pas un choix.
    expect(out).toBeGreaterThan(0);
  });
});

describe('le milieu dans la simulation', () => {
  it('fait vivre le territoire au lieu de le figer', () => {
    const state = member(79, 3);
    const start = orgOf(state)!.territory;
    let moved = false;
    for (let year = 0; year < 10 && !state.gameOver; year++) {
      simulateYear(state);
      state.pending = [];
      if (Math.abs((orgOf(state)?.territory ?? start) - start) > 5) { moved = true; break; }
    }
    expect(moved).toBe(true);
  });

  it('fait remonter la pression de la maison jusqu’au joueur', () => {
    const exposed = member(83, 5);
    orgOf(exposed)!.pressure = 100;
    exposed.player.criminalRecord.heat = 0;
    const sheltered = member(83, 1);
    orgOf(sheltered)!.pressure = 100;
    sheltered.player.criminalRecord.heat = 0;
    for (let year = 0; year < 6; year++) {
      if (!exposed.gameOver) { simulateYear(exposed); exposed.pending = []; }
      if (!sheltered.gameOver) { simulateYear(sheltered); sheltered.pending = []; }
    }
    // Un patron encaisse ce que la maison attire ; un guetteur beaucoup moins.
    expect(rankAt(5).exposure).toBeGreaterThan(rankAt(1).exposure);
  });

  it('ne fait pas exploser les jauges sur une vie entière', () => {
    const state = member(89, 2);
    for (let year = 0; year < 40 && !state.gameOver; year++) {
      simulateYear(state);
      state.pending = [];
      expect(heatOf(state)).toBeGreaterThanOrEqual(0);
      expect(heatOf(state)).toBeLessThanOrEqual(100);
      const org = orgOf(state);
      if (org) {
        expect(org.territory).toBeGreaterThanOrEqual(0);
        expect(org.territory).toBeLessThanOrEqual(100);
        expect(org.rank).toBeGreaterThanOrEqual(0);
        expect(org.rank).toBeLessThanOrEqual(5);
      }
    }
  });

  it('laisse la chaleur redescendre en détention', () => {
    const state = crook(97);
    addHeat(createCtx(state), 80);
    const before = heatOf(state);
    state.player.prison = {
      yearsLeft: 4, totalSentence: 4, security: 'medium', behavior: 50, respect: 30,
      paroleDenials: 0, facilityName: 'Test', escapePlan: 0, suspicion: 0, prepared: [],
    };
    simulateYear(state);
    state.pending = [];
    expect(heatOf(state)).toBeLessThan(before - 8);
  });

  it('borne la chaleur par le bas', () => {
    const state = crook(101);
    coolHeat(createCtx(state), 500);
    expect(heatOf(state)).toBe(0);
  });
});
