/**
 * Vérifications de ce qu'on appelle servir.
 *
 * Le catalogue avait sept feuilles absentes au même endroit — « Militaire /
 * Engagement » se réduisait à une formation, « Astronaute » et « Agent
 * secret » n'existaient pas. Ce qui suit vérifie que ce qui a été ajouté est
 * un système et pas une quatrième échelle de salaires.
 *
 * Sept exigences, et ce sont elles qui distinguent servir d'exercer :
 *
 * 1. **on est pris, pas embauché** — la sélection peut refuser, et l'échec
 *    laisse une trace au dossier ;
 * 2. **le service ne se postule pas partout** — une maison n'ouvre sa porte
 *    qu'à qui a déjà le profil, sans jamais publier d'offre ;
 * 3. **la formation compte** — on ne confie rien avant qu'elle soit finie ;
 * 4. **le grade demande les deux** — réputation *et* ancienneté ;
 * 5. **on y risque quelque chose** — blessure, mise à l'écart, mort ;
 * 6. **jouer protège** — bien mener une mission dangereuse en réduit le coût,
 *    ce qui est la seule façon d'en faire un vrai enjeu ;
 * 7. **on en sort avec quelque chose** — grade, pension, décorations, et un
 *    dossier qui survit à la sortie.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import { Rng } from '../rng.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { playHeadless } from '../minigame.ts';
import {
  CORPS, DECORATIONS, DUTIES, RANKS, dischargeFor, dutiesFor, getCorps,
  getDuty, ranksFor, standingLabel,
} from '../../data/service.ts';
import { docking, type DockingState } from '../../systems/minigames/docking.ts';
import {
  infiltration, type InfiltrationState,
} from '../../systems/minigames/infiltration.ts';
import {
  acceptBlocker, acceptDuty, advanceService, approached, autoRun,
  availableCorps, corpsOf, declineDuty, dutyContext, enlist, entryBlocker,
  leaveBlocker, leaveService, nextRank, operational, pendingDecorations,
  promotionGap, rankOf, rollDuties, selectionOdds, serviceEarnings,
  servicePay, serviceTitle, servedYears, serviceOf, settleDuty, train,
  trainBlocker,
} from '../../systems/service.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un adulte vivant et libre, prêt à se présenter. */
function adult(seed: number, age = 26): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  if (state.player.criminalRecord.wanted) return null;
  state.player.yearActions = {};
  return state;
}

/**
 * Quelqu'un qui sert déjà, à un niveau donné.
 *
 * Les valeurs sont posées directement : atteindre soixante de réputation en
 * jouant demande quinze ans, et les tests portent sur les règles, pas sur la
 * durée. La sélection est court-circuitée en remplissant les conditions,
 * parce qu'un test qui échoue une fois sur trois ne teste rien.
 */
function serving(
  seed: number,
  corpsId: string,
  opts: { readiness?: number; standing?: number; trained?: boolean } = {},
): GameState | null {
  const state = adult(seed, corpsId === 'orbite' ? 30 : 26);
  if (!state) return null;
  const p = state.player;
  const corps = getCorps(corpsId)!;
  // On rend le personnage éligible plutôt que de forcer l'état : ce sont les
  // mêmes conditions que celles du jeu.
  p.stats.fitness = Math.max(p.stats.fitness, corps.needs.fitness + 20);
  p.stats.health = Math.max(p.stats.health, corps.needs.health + 20);
  p.stats.intelligence = Math.max(p.stats.intelligence, corps.needs.intelligence + 20);
  p.stats.karma = Math.max(p.stats.karma, 50);
  p.traits.discipline = Math.max(p.traits.discipline, corps.needs.discipline + 20);
  p.criminalRecord.convictions = [];
  p.criminalRecord.wanted = false;
  if (corps.needsDegree && p.education.degrees.length === 0) {
    p.education.degrees.push({
      id: 'test', name: 'Diplôme', majorId: null, level: 3, year: state.year - 2,
      honors: false,
    });
  }
  // Plusieurs tentatives : la sélection reste une sélection.
  for (let attempt = 0; attempt < 12 && !p.service; attempt++) {
    p.flags[`servicetries_${corpsId}`] = 0;
    enlist(createCtx(state), corpsId);
  }
  const service = p.service;
  if (!service) return null;
  if (opts.trained !== false) service.trainingLeft = 0;
  if (opts.readiness !== undefined) service.readiness = opts.readiness;
  if (opts.standing !== undefined) service.standing = opts.standing;
  p.yearActions = {};
  return state;
}

/** Fait accepter la première mission proposée. */
function takeAnything(state: GameState): boolean {
  const service = state.player.service;
  if (!service) return false;
  if (service.offers.length === 0) rollDuties(createCtx(state));
  if (service.offers.length === 0) return false;
  return acceptDuty(createCtx(state), service.offers[0].id).ok;
}

/** Un résultat de mini-jeu fabriqué, pour isoler la règle testée. */
function ran(quality: number) {
  return {
    success: quality > 0.5,
    score: Math.round(quality * 100),
    quality,
    mistakes: Math.round((1 - quality) * 5),
    time: 20_000,
  };
}

const rng = (seed: number) => new Rng({ rngState: seed >>> 0 });

/* ------------------------------------------------------------------ */

describe('les données de service tiennent debout', () => {
  it('donne aux trois maisons de quoi faire une carrière', () => {
    expect(CORPS).toHaveLength(3);
    for (const c of CORPS) {
      const duties = dutiesFor(c.id);
      // Six missions au minimum : en dessous, la carrière est une ligne
      // droite et le « choisir parmi » n'existe pas.
      expect(duties.length).toBeGreaterThanOrEqual(6);
      expect(Math.min(...duties.map((d) => d.demands))).toBeLessThan(25);
      expect(Math.max(...duties.map((d) => d.demands))).toBeGreaterThan(80);
      // Une échelle de grades qui commence à zéro et qui monte.
      const ladder = ranksFor(c.id);
      expect(ladder.length).toBeGreaterThanOrEqual(5);
      expect(ladder[0].standing).toBe(0);
      expect(ladder[0].years).toBe(0);
      for (let i = 1; i < ladder.length; i++) {
        expect(ladder[i].standing).toBeGreaterThan(ladder[i - 1].standing);
        expect(ladder[i].years).toBeGreaterThan(ladder[i - 1].years);
        expect(ladder[i].pay).toBeGreaterThan(ladder[i - 1].pay);
        expect(ladder[i].clearance).toBeGreaterThan(ladder[i - 1].clearance);
      }
      expect(DECORATIONS.some((d) => d.corps === c.id)).toBe(true);
    }
    for (const d of DUTIES) expect(getCorps(d.corps)).toBeDefined();
    for (const r of RANKS) expect(getCorps(r.corps)).toBeDefined();
  });

  it('ne fait pas de l’argent le seul axe', () => {
    // Si la mission la mieux payée était toujours celle qui fait le plus pour
    // la réputation, il n'y aurait rien à arbitrer.
    for (const c of CORPS) {
      const duties = dutiesFor(c.id);
      const byPay = [...duties].sort((a, b) => b.bounty - a.bounty).map((d) => d.id);
      const byStanding = [...duties].sort((a, b) => b.standing - a.standing).map((d) => d.id);
      expect(byPay).not.toEqual(byStanding);
      // Et le danger n'est pas non plus l'ordre du cachet : il existe des
      // missions bien payées et peu risquées, et l'inverse.
      const byDanger = [...duties].sort((a, b) => b.danger - a.danger).map((d) => d.id);
      expect(byPay).not.toEqual(byDanger);
    }
  });

  it('donne à chaque maison un risque et une porte différents', () => {
    const perils = CORPS.map((c) => c.peril);
    expect(Math.max(...perils) - Math.min(...perils)).toBeGreaterThan(0.2);
    // Une maison au moins ne recrute pas au guichet, et une seule.
    expect(CORPS.filter((c) => c.recruitedOnly)).toHaveLength(1);
    // Deux épreuves distinctes, pas une seule repeinte.
    expect(new Set(CORPS.map((c) => c.game)).size).toBe(2);
  });

  it('donne à chaque réputation et à chaque sortie une formule', () => {
    expect(standingLabel(0)).toBeTruthy();
    expect(standingLabel(100)).toBeTruthy();
    expect(standingLabel(95)).not.toBe(standingLabel(5));
    expect(dischargeFor(90).id).toBe('honneur');
    expect(dischargeFor(0).id).toBe('reforme');
    expect(dischargeFor(90).pension).toBeGreaterThan(dischargeFor(0).pension);
  });
});

describe('entrer', () => {
  it('produit réellement quelqu’un qui sert', () => {
    // Garde-fou : sans lui, tous les tests qui suivent pourraient passer en
    // ne testant rien du tout.
    let built = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const state = serving(seed, 'armee');
      if (!state) continue;
      built += 1;
      expect(serviceOf(state)).not.toBeNull();
      expect(corpsOf(state)?.id).toBe('armee');
      expect(rankOf(state)?.id).toBe(ranksFor('armee')[0].id);
      expect(serviceTitle(state)).toBeTruthy();
    }
    expect(built).toBeGreaterThan(20);
  });

  it('refuse ce que l’âge, le casier et la cellule interdisent', () => {
    const state = adult(41);
    if (!state) return;
    const armee = getCorps('armee')!;
    state.player.age = 16;
    expect(entryBlocker(state, armee)).toContain('18');
    state.player.age = 50;
    expect(entryBlocker(state, armee)).toContain('34');
    state.player.age = 30;

    state.player.criminalRecord.wanted = true;
    expect(entryBlocker(state, armee)).not.toBeNull();
    state.player.criminalRecord.wanted = false;

    // Le spatial ferme sa porte à un casier, l'armée non : la différence est
    // dans les données, et elle doit se voir.
    state.player.criminalRecord.convictions = [
      {
        crimeId: 'vol', crimeName: 'Vol', year: state.year - 3, sentenceYears: 0,
        fine: 0, appealed: false,
      },
    ];
    expect(entryBlocker(state, getCorps('orbite')!)).toContain('casier');
    expect(entryBlocker(state, armee)).toBeNull();
  });

  it('ne laisse pas postuler là où l’on est approché', () => {
    const state = adult(43);
    if (!state) return;
    const ombre = getCorps('ombre')!;
    const p = state.player;
    p.age = 30;
    p.stats.intelligence = 20;
    p.stats.health = 30;
    p.traits.discipline = 20;
    p.criminalRecord.convictions = [];
    expect(approached(state, ombre)).toBe(false);
    expect(entryBlocker(state, ombre)).toContain('approché');
    expect(availableCorps(state).map((c) => c.id)).not.toContain('ombre');

    // Avec le profil, la porte s'ouvre — sans qu'on ait rien demandé.
    p.stats.intelligence = ombre.needs.intelligence + 10;
    p.stats.health = ombre.needs.health + 10;
    p.traits.discipline = ombre.needs.discipline + 10;
    p.stats.karma = 60;
    expect(approached(state, ombre)).toBe(true);
    expect(entryBlocker(state, ombre)).toBeNull();
  });

  it('peut refuser, et retenir les refus', () => {
    let refused = 0;
    let tried = 0;
    for (let seed = 60; seed < 130; seed++) {
      const state = adult(seed);
      if (!state) continue;
      const orbite = getCorps('orbite')!;
      const p = state.player;
      p.age = 30;
      // Quelqu'un de très en dessous : la sélection doit le dire.
      p.stats.fitness = 45;
      p.stats.health = 55;
      p.stats.intelligence = 55;
      p.traits.discipline = 45;
      p.criminalRecord.convictions = [];
      if (p.education.degrees.length === 0) {
        p.education.degrees.push({
          id: 't', name: 'D', majorId: null, level: 3, year: state.year - 2,
          honors: false,
        });
      }
      if (entryBlocker(state, orbite)) continue;
      tried += 1;
      const before = selectionOdds(state, orbite);
      if (!enlist(createCtx(state), 'orbite').ok) {
        refused += 1;
        // Un refus laisse une trace : la fois suivante est plus dure, sauf
        // lorsqu'on est déjà au plancher — la sélection reste une sélection.
        expect(selectionOdds(state, orbite)).toBeLessThanOrEqual(before);
        if (before > 0.12) expect(selectionOdds(state, orbite)).toBeLessThan(before);
      }
    }
    if (tried === 0) return;
    expect(refused / tried).toBeGreaterThan(0.5);
  });

  it('rend la sélection lisible : mieux préparé, mieux accueilli', () => {
    const state = adult(45);
    if (!state) return;
    const armee = getCorps('armee')!;
    state.player.age = 24;
    state.player.stats.fitness = 20;
    state.player.stats.health = 30;
    state.player.traits.discipline = 20;
    const weak = selectionOdds(state, armee);
    state.player.stats.fitness = 90;
    state.player.stats.health = 90;
    state.player.traits.discipline = 90;
    expect(selectionOdds(state, armee)).toBeGreaterThan(weak + 0.25);
  });

  it('n’autorise pas deux maisons à la fois', () => {
    const state = serving(47, 'armee');
    if (!state) return;
    expect(entryBlocker(state, getCorps('orbite')!)).toContain('deux maisons');
    expect(enlist(createCtx(state), 'orbite').ok).toBe(false);
  });
});

describe('se former', () => {
  it('ne confie rien avant la fin de la formation', () => {
    const state = serving(51, 'orbite', { trained: false });
    if (!state) return;
    const service = state.player.service!;
    expect(service.trainingLeft).toBe(getCorps('orbite')!.trainingYears);
    expect(operational(state)).toBe(false);
    expect(acceptBlocker(state)).toContain('formation');
    rollDuties(createCtx(state));
    expect(service.offers).toHaveLength(0);

    // La formation avance toute seule, et elle prépare.
    const before = service.readiness;
    for (let i = 0; i < getCorps('orbite')!.trainingYears; i++) {
      state.player.yearActions = {};
      advanceService(createCtx(state));
    }
    expect(service.trainingLeft).toBe(0);
    expect(service.readiness).toBeGreaterThan(before);
    expect(operational(state)).toBe(true);
  });

  it('fait de l’entraînement un levier qui s’épuise', () => {
    const state = serving(53, 'armee', { readiness: 20 });
    if (!state) return;
    const service = state.player.service!;
    const first = service.readiness;
    train(createCtx(state));
    const afterFirst = service.readiness;
    expect(afterFirst).toBeGreaterThan(first);
    // Une fois par an, et pas deux.
    expect(trainBlocker(state)).not.toBeNull();
    expect(train(createCtx(state)).ok).toBe(false);

    // Et le rendement décroît : à quatre-vingt-dix, la même année rapporte
    // beaucoup moins qu'à vingt.
    const gainLow = afterFirst - first;
    service.readiness = 90;
    state.player.yearActions = {};
    const high = service.readiness;
    train(createCtx(state));
    expect(service.readiness - high).toBeLessThan(gainLow);
  });
});

describe('les missions', () => {
  it('ne propose que ce que le grade et la préparation autorisent', () => {
    const state = serving(101, 'armee', { readiness: 15 });
    if (!state) return;
    const service = state.player.service!;
    rollDuties(createCtx(state));
    expect(service.offers.length).toBeGreaterThan(0);
    const rank = rankOf(state)!;
    for (const offer of service.offers) {
      const duty = getDuty(offer.dutyId)!;
      expect(duty.clearance).toBeLessThanOrEqual(rank.clearance);
      expect(duty.demands).toBeLessThanOrEqual(service.readiness + 26);
    }

    // Un débutant ne se voit jamais proposer un commandement.
    expect(service.offers.map((o) => o.dutyId)).not.toContain('commandement');
  });

  it('ouvre les missions difficiles à mesure qu’on monte', () => {
    const low = serving(103, 'armee', { readiness: 15, standing: 0 });
    const high = serving(103, 'armee', { readiness: 90, standing: 95 });
    if (!low || !high) return;
    high.player.service!.rankId = ranksFor('armee')[6].id;
    rollDuties(createCtx(low));
    rollDuties(createCtx(high));
    const hardest = (s: GameState) => Math.max(
      ...s.player.service!.offers.map((o) => getDuty(o.dutyId)!.demands),
    );
    expect(hardest(high)).toBeGreaterThan(hardest(low));
  });

  it('fait payer le fait de décliner', () => {
    const state = serving(105, 'armee', { standing: 40 });
    if (!state) return;
    const service = state.player.service!;
    rollDuties(createCtx(state));
    if (service.offers.length === 0) return;
    const before = service.standing;
    const count = service.offers.length;
    expect(declineDuty(createCtx(state), service.offers[0].id).ok).toBe(true);
    expect(service.standing).toBeLessThan(before);
    expect(service.offers).toHaveLength(count - 1);
  });

  it('fait compter la façon dont on s’y prend', () => {
    // Deux personnages identiques, la même mission : celui qui la mène bien
    // finit mieux placé et mieux payé. La mission est posée à la main et
    // volontairement exigeante — sur une garde, le personnage rattrape tout
    // seul le joueur le plus mauvais, ce qui est correct mais ne dit rien.
    const good = serving(107, 'armee', { readiness: 60, standing: 30 });
    const bad = serving(107, 'armee', { readiness: 60, standing: 30 });
    if (!good || !bad) return;
    const duty = {
      id: 'x', dutyId: 'reco', bounty: 2000, demands: 70, danger: 0, yearsLeft: 1,
    };
    good.player.service!.current = { ...duty };
    bad.player.service!.current = { ...duty };
    settleDuty(createCtx(good), ran(0.95));
    settleDuty(createCtx(bad), ran(0.08));
    expect(good.player.service!.standing).toBeGreaterThan(bad.player.service!.standing);
    expect(serviceEarnings(good)).toBeGreaterThan(serviceEarnings(bad));
    expect(good.player.service!.done).toBe(1);
    expect(bad.player.service!.failed).toBe(1);
  });

  it('n’avantage jamais la résolution automatique', () => {
    // Laisser faire doit rester possible sans être le meilleur choix : sinon
    // le mini-jeu serait une punition pour ceux qui jouent.
    let auto = 0;
    let played = 0;
    let pairs = 0;
    for (let seed = 200; seed < 260; seed++) {
      const a = serving(seed, 'armee', { readiness: 55, standing: 25 });
      const b = serving(seed, 'armee', { readiness: 55, standing: 25 });
      if (!a || !b) continue;
      if (!takeAnything(a)) continue;
      b.player.service!.current = { ...a.player.service!.current! };
      pairs += 1;
      autoRun(createCtx(a));
      settleDuty(createCtx(b), ran(0.92));
      auto += a.player.service!.standing;
      played += b.player.service!.standing;
    }
    if (pairs < 15) return;
    expect(played / pairs).toBeGreaterThan(auto / pairs);
  });

  it('fait progresser la préparation, et davantage sur ce qui dépasse', () => {
    const easy = serving(261, 'armee', { readiness: 70 });
    const hard = serving(261, 'armee', { readiness: 70 });
    if (!easy || !hard) return;
    const base = {
      id: 'x', bounty: 1000, yearsLeft: 1,
    };
    easy.player.service!.current = { ...base, dutyId: 'garde', demands: 20, danger: 0 };
    hard.player.service!.current = { ...base, dutyId: 'garde', demands: 80, danger: 0 };
    settleDuty(createCtx(easy), ran(1));
    settleDuty(createCtx(hard), ran(1));
    // Les deux sont menées : ce qu'on compare est bien ce que chacune apprend,
    // et non l'écart entre une réussite et un échec.
    expect(easy.player.service!.done).toBe(1);
    expect(hard.player.service!.done).toBe(1);
    expect(hard.player.service!.readiness).toBeGreaterThan(easy.player.service!.readiness);
  });

  it('fait courir une mission longue sur plusieurs années', () => {
    const state = serving(263, 'ombre', { readiness: 95, standing: 95 });
    if (!state) return;
    const service = state.player.service!;
    service.rankId = ranksFor('ombre')[4].id;
    service.current = {
      id: 'x', dutyId: 'longue', bounty: 1000, demands: 90, danger: 0, yearsLeft: 3,
    };
    state.player.yearActions = {};
    advanceService(createCtx(state));
    expect(service.current?.yearsLeft).toBe(2);
    // Et l'on ne peut rien accepter d'autre entre-temps.
    expect(acceptBlocker(state)).not.toBeNull();
  });
});

describe('ce qu’on y risque', () => {
  it('blesse, écarte, et laisse une trace', () => {
    let wounded = 0;
    let tried = 0;
    for (let seed = 300; seed < 400; seed++) {
      const state = serving(seed, 'ombre', { readiness: 60, standing: 40 });
      if (!state) continue;
      tried += 1;
      state.player.service!.current = {
        id: 'x', dutyId: 'exfiltration', bounty: 1000, demands: 70, danger: 0.9, yearsLeft: 1,
      };
      // Mal menée, très exposée : c'est là que le métier coûte.
      settleDuty(createCtx(state), ran(0.05));
      if (!state.player.alive) { wounded += 1; continue; }
      if (state.player.service?.wounded) {
        wounded += 1;
        expect(state.player.service.sidelinedUntil).toBeGreaterThan(state.year);
        expect(operational(state)).toBe(false);
        expect(acceptBlocker(state)).not.toBeNull();
      }
    }
    if (tried < 20) return;
    expect(wounded / tried).toBeGreaterThan(0.3);
  });

  it('fait de la façon de jouer une protection', () => {
    // La seule façon d'en faire un enjeu : bien mener une mission dangereuse
    // doit réduire ce qu'elle coûte, et pas seulement ce qu'elle rapporte.
    let hurtWell = 0;
    let hurtBadly = 0;
    let pairs = 0;
    for (let seed = 400; seed < 500; seed++) {
      const a = serving(seed, 'armee', { readiness: 60, standing: 40 });
      const b = serving(seed, 'armee', { readiness: 60, standing: 40 });
      if (!a || !b) continue;
      pairs += 1;
      const duty = {
        id: 'x', dutyId: 'reco', bounty: 1000, demands: 65, danger: 0.8, yearsLeft: 1,
      };
      a.player.service!.current = { ...duty };
      b.player.service!.current = { ...duty };
      settleDuty(createCtx(a), ran(0.97));
      settleDuty(createCtx(b), ran(0.5));
      if (!a.player.alive || a.player.service?.wounded) hurtWell += 1;
      if (!b.player.alive || b.player.service?.wounded) hurtBadly += 1;
    }
    if (pairs < 20) return;
    expect(hurtWell).toBeLessThan(hurtBadly);
  });

  it('peut ne pas ramener tout le monde', () => {
    let dead = 0;
    let tried = 0;
    for (let seed = 500; seed < 700; seed++) {
      const state = serving(seed, 'orbite', { readiness: 50, standing: 40 });
      if (!state) continue;
      tried += 1;
      state.player.service!.current = {
        id: 'x', dutyId: 'reparation', bounty: 1000, demands: 90, danger: 0.95, yearsLeft: 1,
      };
      settleDuty(createCtx(state), ran(0.05));
      if (!state.player.alive) {
        dead += 1;
        expect(state.gameOver).toBe(true);
        expect(state.player.deathCause).toBeTruthy();
      }
    }
    if (tried < 30) return;
    // Rare, mais réel : c'est ce qui distingue ce métier des autres.
    expect(dead).toBeGreaterThan(0);
    expect(dead / tried).toBeLessThan(0.4);
  });

  it('ne risque rien quand il n’y a rien à risquer', () => {
    let hurt = 0;
    let tried = 0;
    for (let seed = 700; seed < 780; seed++) {
      const state = serving(seed, 'armee', { readiness: 70, standing: 30 });
      if (!state) continue;
      tried += 1;
      state.player.service!.current = {
        id: 'x', dutyId: 'garde', bounty: 500, demands: 12, danger: 0, yearsLeft: 1,
      };
      settleDuty(createCtx(state), ran(0.7));
      if (!state.player.alive || state.player.service?.wounded) hurt += 1;
    }
    if (tried === 0) return;
    expect(hurt).toBe(0);
  });
});

describe('monter et sortir', () => {
  it('exige la réputation et l’ancienneté, pas l’une ou l’autre', () => {
    const state = serving(801, 'armee', { standing: 100 });
    if (!state) return;
    const service = state.player.service!;
    const second = ranksFor('armee')[1];
    // Réputation au maximum, mais pas d'ancienneté : rien ne bouge.
    expect(servedYears(state)).toBeLessThan(second.years);
    state.player.yearActions = {};
    advanceService(createCtx(state));
    expect(rankOf(state)?.id).toBe(ranksFor('armee')[0].id);
    expect(promotionGap(state)).toContain('ancienneté');

    // L'ancienneté venue, la promotion tombe.
    service.since = state.year - second.years;
    service.standing = 100;
    state.player.yearActions = {};
    advanceService(createCtx(state));
    expect(rankOf(state)?.id).toBe(second.id);
    expect(nextRank(state)?.id).toBe(ranksFor('armee')[2].id);
  });

  it('ne monte que d’un échelon par an', () => {
    const state = serving(803, 'armee', { standing: 100 });
    if (!state) return;
    const service = state.player.service!;
    // Trente ans d'ancienneté et cent de réputation : tout est réuni pour le
    // sommet, et pourtant on n'y arrive pas en une année.
    service.since = state.year - 30;
    state.player.yearActions = {};
    advanceService(createCtx(state));
    expect(rankOf(state)?.id).toBe(ranksFor('armee')[1].id);
  });

  it('décore ce qu’on a traversé, pas seulement ce qu’on a réussi', () => {
    const state = serving(805, 'armee', { standing: 60 });
    if (!state) return;
    const service = state.player.service!;
    expect(pendingDecorations(state)).not.toContain('a_blesse');
    service.wounded = true;
    expect(pendingDecorations(state)).toContain('a_blesse');
    state.player.yearActions = {};
    advanceService(createCtx(state));
    expect(service.decorations).toContain('a_blesse');
    // Et une seule fois.
    state.player.yearActions = {};
    advanceService(createCtx(state));
    expect(service.decorations.filter((d) => d === 'a_blesse')).toHaveLength(1);
  });

  it('laisse quelque chose en sortant, à la mesure de ce qu’on a donné', () => {
    const long = serving(807, 'armee', { standing: 85 });
    const short = serving(807, 'armee', { standing: 10 });
    if (!long || !short) return;
    long.player.service!.since = long.year - 22;
    long.player.service!.done = 12;
    short.player.service!.since = short.year - 2;

    expect(leaveService(createCtx(long)).ok).toBe(true);
    expect(leaveService(createCtx(short)).ok).toBe(true);
    expect(long.player.service).toBeNull();
    // Le dossier survit à la sortie : sans lui, vingt ans disparaîtraient.
    expect(long.player.veteran).not.toBeNull();
    expect(long.player.veteran!.years).toBe(22);
    expect(long.player.veteran!.dischargeId).toBe('honneur');
    expect(long.player.veteran!.pension).toBeGreaterThan(short.player.veteran!.pension);
    expect(long.player.pension).toBeGreaterThan(0);
  });

  it('ne laisse pas partir en pleine mission', () => {
    const state = serving(809, 'armee', { standing: 50 });
    if (!state) return;
    if (!takeAnything(state)) return;
    expect(leaveBlocker(state)).toContain('mission');
    expect(leaveService(createCtx(state)).ok).toBe(false);
  });

  it('sort les gens quand l’âge est là', () => {
    const state = serving(811, 'armee', { standing: 60 });
    if (!state) return;
    state.player.age = 61;
    state.player.yearActions = {};
    advanceService(createCtx(state));
    expect(state.player.service).toBeNull();
    expect(state.player.veteran).not.toBeNull();
  });
});

describe('l’année et la sauvegarde', () => {
  it('verse la solde, et une solde réduite en formation', () => {
    const state = serving(901, 'armee', { trained: false });
    if (!state) return;
    const service = state.player.service!;
    const inTraining = servicePay(state);
    service.trainingLeft = 0;
    expect(servicePay(state)).toBeGreaterThan(inTraining);
    // Et le grade la fait monter.
    const base = servicePay(state);
    service.rankId = ranksFor('armee')[4].id;
    expect(servicePay(state)).toBeGreaterThan(base);
  });

  it('ne compte pas la solde deux fois', () => {
    const state = serving(903, 'armee');
    if (!state) return;
    state.player.yearActions = {};
    advanceService(createCtx(state));
    const earned = serviceEarnings(state);
    expect(earned).toBeGreaterThan(0);
    const before = state.player.money;
    simulateYear(state);
    // Le bilan encaisse une fois ; s'il comptait deux fois, l'écart serait au
    // moins du double de la solde.
    expect(state.player.money - before).toBeLessThan(earned * 2.2);
  });

  it('survit à une année complète et à la sauvegarde', () => {
    const state = serving(905, 'ombre', { readiness: 60, standing: 40 });
    if (!state) return;
    takeAnything(state);
    simulateYear(state);
    if (!state.player.alive) return;
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    expect(copy.player.service).not.toBeNull();
    expect(copy.player.service!.corpsId).toBe('ombre');
    expect(Array.isArray(copy.player.service!.offers)).toBe(true);
    advanceService(createCtx(copy));
    expect(copy.player.service === null || copy.player.service.corpsId === 'ombre').toBe(true);
  });

  it('n’existe pas pour qui ne s’est jamais présenté', () => {
    const state = adult(907);
    if (!state) return;
    expect(state.player.service).toBeNull();
    expect(serviceOf(state)).toBeNull();
    expect(serviceEarnings(state)).toBe(0);
    expect(acceptBlocker(state)).not.toBeNull();
    expect(dutyContext(state)).toBeNull();
    const before = state.player.money;
    advanceService(createCtx(state));
    expect(state.player.money).toBe(before);
  });
});

/* ------------------------------------------------------------------ */
/* Les deux épreuves                                                   */
/* ------------------------------------------------------------------ */

const ctx = (skill: number, difficulty: number) => ({
  skill,
  difficulty,
  mode: 'normal' as const,
  grace: {
    time: 1 + (skill / 100) * 0.35,
    pressure: 1 - (skill / 100) * 0.3,
    tolerance: skill * 0.5,
    insight: skill > 55,
  },
});

describe('l’amarrage', () => {
  /**
   * Un pilote appliqué.
   *
   * Il vise une vitesse latérale proportionnelle à l'écart, pousse du côté
   * qu'il faut pour l'obtenir — ce qui l'oblige à freiner avant d'arriver —
   * et garde le doigt bas : on ne ferme vite que lorsqu'on est en ligne.
   */
  const pilot = (s: DockingState) => {
    const gap = s.port - s.ship;
    const wanted = Math.max(-0.00005, Math.min(0.00005, gap * 0.0004));
    const aligned = Math.abs(gap) < s.window * 0.5;
    const y = aligned ? 0.86 : 0.98;
    // Dans la zone morte : le doigt sur la machine, on ne règle que les gaz.
    if (Math.abs(wanted - s.drift) <= 0.000004) return { hold: true, x: s.ship, y };
    return { hold: true, x: wanted > s.drift ? 1 : 0, y };
  };

  it('récompense celui qui pilote', () => {
    let skilled = 0;
    let clumsy = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const context = ctx(60, 45);
      skilled += playHeadless(docking, rng(seed), context, pilot).result.quality;
      // Un joueur qui pousse toujours du même côté : il traverse et rate.
      clumsy += playHeadless(
        docking, rng(seed), context, () => ({ x: 1, hold: true, y: 0 }),
      ).result.quality;
    }
    expect(skilled / 40).toBeGreaterThan(clumsy / 40 + 0.15);
  });

  it('sanctionne l’arrivée trop rapide autant que l’arrivée à côté', () => {
    // Le même pilotage latéral, mais le doigt en haut : la ligne est bonne et
    // le contact ne prend pas quand même.
    let hard = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const out = playHeadless(docking, rng(seed), ctx(60, 45), (s: DockingState) => ({
        ...pilot(s), y: 0,
      }));
      if (out.state.bumps > 0) hard += 1;
    }
    expect(hard).toBeGreaterThan(10);
  });

  it('fait du carburant une vraie contrainte', () => {
    // Pousser d'un bord à l'autre sans arrêt vide le réservoir.
    const out = playHeadless(docking, rng(11), ctx(50, 50), (s: DockingState) => ({
      x: s.elapsed % 800 < 400 ? 1 : 0, hold: true, y: 0.9,
    }));
    expect(out.state.fuel).toBeLessThan(40);
  });

  it('laisse le personnage donner de la marge, pas jouer', () => {
    // Le même jeu, deux personnages : l'expert a une fenêtre plus large et
    // plus de temps — il ne pilote pas à la place du joueur.
    const novice = docking.setup(rng(5), ctx(10, 60));
    const expert = docking.setup(rng(5), ctx(90, 60));
    expect(expert.window).toBeGreaterThan(novice.window);
    expect(expert.limit).toBeGreaterThan(novice.limit);
    expect(expert.softness).toBeGreaterThan(novice.softness);
  });

  it('rejoue à l’identique à graine égale', () => {
    const a = playHeadless(docking, rng(77), ctx(50, 50), pilot);
    const b = playHeadless(docking, rng(77), ctx(50, 50), pilot);
    expect(a.result).toEqual(b.result);
  });
});

describe('l’approche discrète', () => {
  /**
   * Quelqu'un de prudent.
   *
   * Il avance quand personne ne regarde, et devant un passage il lâche et
   * attend son ouverture au lieu de pousser dessus.
   */
  const careful = (s: InfiltrationState) => {
    const gate = s.gates.find((g) => !g.passed);
    if (gate && s.progress >= gate.at - 1e-6) return { hold: false };
    return { hold: !s.watched && s.heat < 70 };
  };

  it('récompense celui qui choisit son moment', () => {
    let patient = 0;
    let reckless = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const context = ctx(60, 45);
      patient += playHeadless(infiltration, rng(seed), context, careful).result.quality;
      reckless += playHeadless(infiltration, rng(seed), context, () => ({ hold: true })).result.quality;
    }
    expect(patient / 40).toBeGreaterThan(reckless / 40 + 0.15);
  });

  it('repère celui qui fonce', () => {
    let burned = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const out = playHeadless(infiltration, rng(seed), ctx(40, 70), () => ({ hold: true }));
      if (out.state.burned) burned += 1;
    }
    expect(burned).toBeGreaterThan(15);
  });

  it('fait des passages une décision, pas une formalité', () => {
    // Celui qui ne s'arrête jamais force les passages et le paie.
    const forced = playHeadless(infiltration, rng(9), ctx(60, 40), () => ({ hold: true }));
    const clean = playHeadless(infiltration, rng(9), ctx(60, 40), careful);
    expect(forced.state.gates.filter((g) => g.passed && !g.clean).length)
      .toBeGreaterThan(clean.state.gates.filter((g) => g.passed && !g.clean).length);
  });

  it('permet de se retirer avec ce qu’on a fait', () => {
    // Se retirer à mi-chemin ne vaut pas une réussite, mais vaut mieux que
    // d'être repéré : c'est ce qui fait du retrait une vraie option.
    const pulled = playHeadless(infiltration, rng(13), ctx(60, 45), (s: InfiltrationState) => (
      s.progress > 0.5 ? { quit: true } : careful(s)
    ));
    const caught = playHeadless(infiltration, rng(13), ctx(60, 45), () => ({ hold: true }));
    expect(pulled.state.pulled).toBe(true);
    expect(pulled.result.success).toBe(false);
    if (caught.state.burned) {
      expect(pulled.result.quality).toBeGreaterThan(caught.result.quality);
    }
  });

  it('laisse le personnage donner du temps, pas de la discrétion', () => {
    const novice = infiltration.setup(rng(5), ctx(10, 60));
    const expert = infiltration.setup(rng(5), ctx(90, 60));
    expect(expert.limit).toBeGreaterThan(novice.limit);
    // L'attention monte au même rythme pour tout le monde : le personnage ne
    // joue pas à la place du joueur.
    expect(expert.heat).toBe(novice.heat);
  });

  it('rejoue à l’identique à graine égale', () => {
    const a = playHeadless(infiltration, rng(77), ctx(50, 50), careful);
    const b = playHeadless(infiltration, rng(77), ctx(50, 50), careful);
    expect(a.result).toEqual(b.result);
  });
});
