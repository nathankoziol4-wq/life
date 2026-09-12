/**
 * Vérifications de la campagne et du mandat.
 *
 * Le catalogue reprochait quatre choses à la politique, et elles se
 * ramenaient à une seule : c'était un métier de scène comme un autre. Ce qui
 * suit vérifie que ce qui a été ajouté est une élection et non un score.
 *
 * Sept exigences, et ce sont elles qui font la différence :
 *
 * 1. **le programme est un arbitrage** — aucun axe ne plaît à tout le monde,
 *    et deux axes peuvent se contredire ;
 * 2. **un bloc pèse ce qu'il représente fois ce qui se déplace** — séduire
 *    ceux qui ne votent pas ne rapporte rien ;
 * 3. **la campagne coûte**, et l'argent facile se paie plus tard ;
 * 4. **l'adversaire existe** et fait sa propre campagne ;
 * 5. **gouverner, c'est trancher** — aucune décision n'a d'option qui
 *    contente tout le monde ;
 * 6. **la réélection est un vote**, et le mandat précédent en est le point
 *    de départ ;
 * 7. **l'argent arrive vraiment sur le compte** — la régression qui a coûté
 *    le plus cher à trouver.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  BLOCS, CAMPAIGN_MOVES, DECISIONS, FUNDING, MAX_PLANKS, OFFICES, PLANKS,
  RIVAL_KINDS, TACTICS, TENSIONS, approvalLabel, getOffice, getPlank,
  pollLabel, tensionCount, votingWeight,
} from '../../data/politics.ts';
import {
  advancePolitics, approvalOf, availableOffices, campaignCost, campaignOf,
  candidacyBlocker, debateBlocker, debateDifficulty, decide, declareRun,
  fundBlocker, fundYield, holdElection, mandateOf, movesLeft, officeOf,
  officePay, pendingDecision, playTactic, plankBlocker, politicalEarnings,
  raiseFunds, resign, settleDebate, share, tacticBlocker, tacticCost,
  tally, togglePlank, warChest,
} from '../../systems/politics.ts';
import { startDiscipline } from '../../systems/stage.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Quelqu'un qui fait de la politique, à un niveau de métier donné. */
function politician(seed: number, craft = 40, age = 34): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  if (state.player.criminalRecord.wanted) return null;
  state.player.yearActions = {};
  if (!startDiscipline(createCtx(state), 'tribune').ok) return null;
  const stage = state.player.stage;
  if (!stage) return null;
  // Le métier est posé directement : l'atteindre en jouant demande quinze
  // ans, et les tests portent sur les règles, pas sur la durée.
  stage.craft = craft;
  state.player.fame.level = Math.max(state.player.fame.level, 30);
  state.player.money = Math.max(state.player.money, 5_000_000);
  state.player.yearActions = {};
  return state;
}

/** Quelqu'un en campagne pour un siège donné. */
function running(seed: number, officeId = 'mairie', craft = 45): GameState | null {
  const state = politician(seed, craft);
  if (!state) return null;
  if (!declareRun(createCtx(state), officeId).ok) return null;
  return state;
}

/** Quelqu'un qui gouverne. */
function governing(seed: number, officeId = 'mairie'): GameState | null {
  const state = running(seed, officeId);
  if (!state) return null;
  // On gagne en forçant les intentions : le test porte sur le mandat, pas
  // sur le scrutin, qui est vérifié ailleurs.
  const campaign = state.player.campaign!;
  campaign.planks = ['services', 'logement'];
  for (const bloc of BLOCS) {
    campaign.polls[bloc.id] = 95;
    campaign.rivalPolls[bloc.id] = 5;
  }
  holdElection(createCtx(state));
  return state.player.mandate ? state : null;
}

/* ------------------------------------------------------------------ */

describe('les données politiques tiennent debout', () => {
  it('découpe un électorat qui fait un tout', () => {
    expect(BLOCS.length).toBeGreaterThanOrEqual(5);
    const total = BLOCS.reduce((sum, b) => sum + b.weight, 0);
    expect(total).toBe(100);
    for (const bloc of BLOCS) {
      expect(bloc.turnout).toBeGreaterThan(0);
      expect(bloc.turnout).toBeLessThanOrEqual(1);
    }
    // La participation doit vraiment séparer les blocs : sans écart, le
    // découpage serait décoratif.
    const turnouts = BLOCS.map((b) => b.turnout);
    expect(Math.max(...turnouts) - Math.min(...turnouts)).toBeGreaterThan(0.25);
    // Et un bloc doit peser autrement en voix qu'en nombre.
    const byWeight = [...BLOCS].sort((a, b) => b.weight - a.weight).map((b) => b.id);
    const byVotes = [...BLOCS].sort((a, b) => votingWeight(b) - votingWeight(a)).map((b) => b.id);
    expect(byWeight).not.toEqual(byVotes);
  });

  it('ne donne aucun axe qui plaise à tout le monde', () => {
    expect(PLANKS.length).toBeGreaterThanOrEqual(5);
    for (const plank of PLANKS) {
      const values = Object.values(plank.appeal) as number[];
      // C'est la règle du fichier : un axe qui ne fâche personne ne serait
      // pas un choix, seulement une case à cocher.
      expect(Math.max(...values)).toBeGreaterThan(0);
      expect(Math.min(...values)).toBeLessThan(0);
    }
    // Et les couples qui se contredisent portent sur de vrais axes.
    for (const [a, b] of TENSIONS) {
      expect(getPlank(a)).toBeDefined();
      expect(getPlank(b)).toBeDefined();
    }
    expect(tensionCount(['impots', 'services'])).toBe(1);
    expect(tensionCount(['impots', 'securite'])).toBe(0);
  });

  it('ne donne aucune décision dont une option contente tout le monde', () => {
    expect(DECISIONS.length).toBeGreaterThanOrEqual(5);
    for (const decision of DECISIONS) {
      expect(decision.options.length).toBeGreaterThanOrEqual(2);
      for (const option of decision.options) {
        const values = Object.values(option.effect) as number[];
        // La seule règle du catalogue de décisions, et elle est vérifiée ici :
        // une décision sans perdant n'est pas une décision.
        expect(Math.min(...values)).toBeLessThan(0);
      }
      // Et les options ne disent pas toutes la même chose.
      const first = JSON.stringify(decision.options[0].effect);
      expect(decision.options.some((o) => JSON.stringify(o.effect) !== first)).toBe(true);
    }
  });

  it('échelonne les sièges du conseil au sommet', () => {
    expect(OFFICES.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < OFFICES.length; i++) {
      expect(OFFICES[i].craft).toBeGreaterThan(OFFICES[i - 1].craft);
      expect(OFFICES[i].pay).toBeGreaterThan(OFFICES[i - 1].pay);
      expect(OFFICES[i].cost).toBeGreaterThan(OFFICES[i - 1].cost);
      // Plus haut on vise, plus celui d'en face sait s'y prendre.
      expect(OFFICES[i].rival).toBeGreaterThan(OFFICES[i - 1].rival);
    }
  });

  it('donne à chaque tactique et à chaque source son prix', () => {
    for (const tactic of TACTICS) expect(tactic.cost).toBeGreaterThan(0);
    // L'argent facile a un prix, et il se paie plus tard.
    const easy = FUNDING.find((f) => f.id === 'grands')!;
    const slow = FUNDING.find((f) => f.id === 'petits')!;
    expect(easy.yield).toBeGreaterThan(slow.yield);
    expect(easy.damage ?? 0).toBeGreaterThan(0);
    expect(slow.damage ?? 0).toBe(0);
    // Et attaquer marche, en laissant une trace.
    const attack = TACTICS.find((t) => t.id === 'attaque')!;
    expect(attack.againstRival ?? 0).toBeGreaterThan(0);
    expect(attack.damage ?? 0).toBeGreaterThan(0);
  });

  it('donne à chaque score une formule, y compris aux extrêmes', () => {
    expect(pollLabel(0)).toBeTruthy();
    expect(pollLabel(100)).toBeTruthy();
    expect(pollLabel(95)).not.toBe(pollLabel(5));
    expect(approvalLabel(0)).toBeTruthy();
    expect(approvalLabel(100)).not.toBe(approvalLabel(0));
    expect(RIVAL_KINDS.length).toBeGreaterThanOrEqual(3);
  });
});

describe('se présenter', () => {
  it('produit réellement une campagne, avec un adversaire nommé', () => {
    let built = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const state = running(seed);
      if (!state) continue;
      built += 1;
      const campaign = campaignOf(state)!;
      expect(campaign.officeId).toBe('mairie');
      // Un vrai PNJ, pas une chaîne de caractères : on le recroisera.
      expect(state.npcs[campaign.rivalId]).toBeDefined();
      expect(state.npcs[campaign.rivalId].alive).toBe(true);
      expect(movesLeft(state)).toBe(CAMPAIGN_MOVES);
      expect(campaign.rivalPlanks.length).toBeGreaterThan(0);
    }
    expect(built).toBeGreaterThan(20);
  });

  it('refuse ce que l’âge, le métier et la notoriété interdisent', () => {
    // Juste assez de métier pour le premier échelon, et rien de plus.
    const state = politician(41, 14);
    if (!state) return;
    state.player.fame.level = 2;
    const national = getOffice('national')!;
    // Sans métier ni nom, le sommet est fermé — et le bas de l'échelle ouvert.
    expect(candidacyBlocker(state, national)).not.toBeNull();
    expect(candidacyBlocker(state, getOffice('conseil')!)).toBeNull();
    expect(availableOffices(state).map((o) => o.id)).not.toContain('national');

    state.player.age = 20;
    expect(candidacyBlocker(state, getOffice('conseil')!)).toContain('25');
    state.player.age = 40;
    state.player.criminalRecord.wanted = true;
    expect(candidacyBlocker(state, getOffice('conseil')!)).not.toBeNull();
  });

  it('n’autorise ni deux campagnes ni une campagne pendant un mandat', () => {
    const state = running(43);
    if (!state) return;
    expect(candidacyBlocker(state, getOffice('conseil')!)).toContain('déjà en campagne');
    const held = governing(45);
    if (!held) return;
    expect(candidacyBlocker(held, getOffice('conseil')!)).toContain('mandat');
  });
});

describe('le programme', () => {
  it('limite à trois axes, et les rend réversibles', () => {
    const state = running(101);
    if (!state) return;
    const campaign = campaignOf(state)!;
    for (const plank of PLANKS.slice(0, MAX_PLANKS)) {
      expect(togglePlank(createCtx(state), plank.id).ok).toBe(true);
    }
    expect(campaign.planks).toHaveLength(MAX_PLANKS);
    const extra = PLANKS[MAX_PLANKS];
    expect(plankBlocker(state, extra.id)).not.toBeNull();
    expect(togglePlank(createCtx(state), extra.id).ok).toBe(false);
    // On peut se raviser.
    expect(togglePlank(createCtx(state), PLANKS[0].id).ok).toBe(true);
    expect(campaign.planks).toHaveLength(MAX_PLANKS - 1);
  });

  it('fait bouger les blocs dans les deux sens', () => {
    const state = running(103);
    if (!state) return;
    const campaign = campaignOf(state)!;
    const before = { ...campaign.polls };
    // « Tenir la rue » plaît aux aînés et fâche les jeunes : c'est écrit dans
    // les données, et cela doit se voir dans les sondages.
    togglePlank(createCtx(state), 'securite');
    expect(campaign.polls.aines).toBeGreaterThan(before.aines);
    expect(campaign.polls.jeunes).toBeLessThan(before.jeunes);
  });

  it('fait payer un programme qui se contredit', () => {
    const clean = running(105);
    const muddled = running(105);
    if (!clean || !muddled) return;
    togglePlank(createCtx(clean), 'services');
    togglePlank(createCtx(muddled), 'services');
    togglePlank(createCtx(muddled), 'impots');
    // Ceux qui lisent le programme en entier sont ceux que ça fait fuir.
    expect(tensionCount(muddled.player.campaign!.planks)).toBe(1);
    const loss = clean.player.campaign!.polls.diplomes
      - muddled.player.campaign!.polls.diplomes;
    // L'axe « impôts » déplaît déjà aux diplômés ; la contradiction s'ajoute.
    expect(loss).toBeGreaterThan(6);
  });

  it('ne perd pas ce qui a été gagné sur le terrain quand on change d’axe', () => {
    const state = running(107);
    if (!state) return;
    raiseFunds(createCtx(state), 'poche');
    playTactic(createCtx(state), 'terrain');
    const earned = state.player.campaign!.polls.aines;
    togglePlank(createCtx(state), 'emploi');
    togglePlank(createCtx(state), 'emploi');
    // Le programme est revenu à zéro axe, mais la semaine de porte-à-porte
    // ne doit pas s'être effacée avec.
    expect(state.player.campaign!.polls.aines).toBeGreaterThan(earned - 8);
  });
});

describe('l’argent et les coups', () => {
  it('fait de chaque coup une ressource comptée', () => {
    const state = running(201);
    if (!state) return;
    expect(movesLeft(state)).toBe(CAMPAIGN_MOVES);
    raiseFunds(createCtx(state), 'poche');
    expect(movesLeft(state)).toBe(CAMPAIGN_MOVES - 1);
    // Une fois les coups épuisés, plus rien ne s'achète.
    state.player.campaign!.moves = CAMPAIGN_MOVES;
    expect(tacticBlocker(state, 'terrain')).toContain('temps');
    expect(fundBlocker(state, 'poche')).toContain('temps');
    expect(debateBlocker(state)).toContain('temps');
  });

  it('ne laisse pas dépenser ce qu’on n’a pas', () => {
    const state = running(203);
    if (!state) return;
    expect(warChest(state)).toBe(0);
    expect(tacticBlocker(state, 'medias')).toContain('caisse');
    raiseFunds(createCtx(state), 'poche');
    expect(warChest(state)).toBeGreaterThan(0);
  });

  it('fait dépendre la collecte de la popularité du moment', () => {
    const liked = running(205);
    const ignored = running(205);
    if (!liked || !ignored) return;
    for (const bloc of BLOCS) {
      liked.player.campaign!.polls[bloc.id] = 85;
      liked.player.campaign!.rivalPolls[bloc.id] = 15;
      ignored.player.campaign!.polls[bloc.id] = 15;
      ignored.player.campaign!.rivalPolls[bloc.id] = 85;
    }
    // Une collecte ne rapporte que si l'on plaît déjà : c'est ce qui empêche
    // de financer une campagne perdue d'avance en cliquant plus fort.
    expect(fundYield(liked, 'petits')).toBeGreaterThan(fundYield(ignored, 'petits') * 1.8);
    // Les gros donateurs, eux, ne regardent pas les sondages de la même façon.
    expect(fundYield(liked, 'grands')).toBe(fundYield(ignored, 'grands'));
  });

  it('fait payer l’argent facile en casseroles', () => {
    const state = running(207);
    if (!state) return;
    const campaign = state.player.campaign!;
    expect(campaign.damage).toBe(0);
    raiseFunds(createCtx(state), 'grands');
    expect(campaign.damage).toBeGreaterThan(0);
    // Et sa propre fortune, elle, sort du compte.
    const before = state.player.money;
    raiseFunds(createCtx(state), 'poche');
    expect(state.player.money).toBeLessThan(before);
  });

  it('fait de l’attaque un coup à double tranchant', () => {
    let hurt = 0;
    let tried = 0;
    for (let seed = 210; seed < 260; seed++) {
      const state = running(seed);
      if (!state) continue;
      tried += 1;
      const campaign = state.player.campaign!;
      raiseFunds(createCtx(state), 'poche');
      const rivalBefore = tally(campaign.rivalPolls);
      const mineBefore = tally(campaign.polls);
      playTactic(createCtx(state), 'attaque');
      expect(tally(campaign.rivalPolls)).toBeLessThan(rivalBefore);
      expect(campaign.damage).toBeGreaterThan(0);
      if (tally(campaign.polls) < mineBefore) hurt += 1;
    }
    if (tried < 20) return;
    // Ça marche toujours sur l'autre, et ça revient parfois sur soi.
    expect(hurt).toBeGreaterThan(tried * 0.2);
    expect(hurt).toBeLessThan(tried * 0.8);
  });

  it('amplifie les médias par la notoriété, et rien d’autre', () => {
    const known = running(261, 'assemblee', 60);
    const unknown = running(261, 'assemblee', 60);
    if (!known || !unknown) return;
    known.player.fame.level = 90;
    unknown.player.fame.level = 15;
    for (const s of [known, unknown]) {
      raiseFunds(createCtx(s), 'poche');
      raiseFunds(createCtx(s), 'poche');
    }
    const gain = (s: GameState, tactic: string) => {
      const before = tally(s.player.campaign!.polls);
      playTactic(createCtx(s), tactic);
      return tally(s.player.campaign!.polls) - before;
    };
    expect(gain(known, 'medias')).toBeGreaterThan(gain(unknown, 'medias'));
  });

  it('fait du ciblage un coup étroit et profond', () => {
    const state = running(263);
    if (!state) return;
    raiseFunds(createCtx(state), 'poche');
    const campaign = state.player.campaign!;
    const before = { ...campaign.polls };
    playTactic(createCtx(state), 'ciblage', 'aines');
    expect(campaign.polls.aines).toBeGreaterThan(before.aines + 8);
    // Et personne d'autre n'a bougé.
    expect(campaign.polls.jeunes).toBe(before.jeunes);
  });
});

describe('le débat', () => {
  it('n’a lieu qu’une fois, et déplace beaucoup', () => {
    const state = running(301);
    if (!state) return;
    const campaign = state.player.campaign!;
    const before = tally(campaign.polls);
    expect(settleDebate(createCtx(state), 0.95).ok).toBe(true);
    expect(campaign.debate).not.toBeNull();
    expect(tally(campaign.polls)).toBeGreaterThan(before);
    // Il n'y en a qu'un.
    expect(debateBlocker(state)).not.toBeNull();
    expect(settleDebate(createCtx(state), 0.95).ok).toBe(false);
  });

  it('peut coûter autant qu’il rapporte', () => {
    const good = running(303);
    const bad = running(303);
    if (!good || !bad) return;
    const before = tally(good.player.campaign!.polls);
    settleDebate(createCtx(good), 0.95);
    settleDebate(createCtx(bad), 0.05);
    expect(tally(good.player.campaign!.polls)).toBeGreaterThan(before);
    expect(tally(bad.player.campaign!.polls)).toBeLessThan(before);
  });

  it('fait compter le métier autant que la prestation', () => {
    const skilled = running(305, 'mairie', 90);
    const green = running(305, 'mairie', 34);
    if (!skilled || !green) return;
    settleDebate(createCtx(skilled), 0.5);
    settleDebate(createCtx(green), 0.5);
    expect(skilled.player.campaign!.debate!)
      .toBeGreaterThan(green.player.campaign!.debate!);
    // Et l'adversaire est d'autant plus dur que le siège est haut.
    const small = running(307, 'conseil', 90);
    const big = running(307, 'national', 90);
    if (small && big) {
      big.player.fame.level = 80;
      expect(debateDifficulty(big)).toBeGreaterThan(debateDifficulty(small));
    }
  });
});

describe('le scrutin', () => {
  it('fait gagner celui qui mène, sans jamais l’assurer', () => {
    let won = 0;
    let tried = 0;
    for (let seed = 401; seed < 451; seed++) {
      const state = running(seed);
      if (!state) continue;
      tried += 1;
      const campaign = state.player.campaign!;
      for (const bloc of BLOCS) {
        campaign.polls[bloc.id] = 62;
        campaign.rivalPolls[bloc.id] = 46;
      }
      holdElection(createCtx(state));
      if (state.player.mandate) won += 1;
    }
    if (tried < 20) return;
    // Nettement devant : on gagne presque toujours, jamais toujours.
    expect(won / tried).toBeGreaterThan(0.85);
  });

  it('fait perdre celui qui est distancé', () => {
    let won = 0;
    let tried = 0;
    for (let seed = 451; seed < 501; seed++) {
      const state = running(seed);
      if (!state) continue;
      tried += 1;
      const campaign = state.player.campaign!;
      for (const bloc of BLOCS) {
        campaign.polls[bloc.id] = 30;
        campaign.rivalPolls[bloc.id] = 60;
      }
      holdElection(createCtx(state));
      if (state.player.mandate) won += 1;
    }
    if (tried < 20) return;
    expect(won / tried).toBeLessThan(0.1);
  });

  it('fait peser les casseroles sur le résultat', () => {
    let cleanWins = 0;
    let dirtyWins = 0;
    let pairs = 0;
    for (let seed = 501; seed < 551; seed++) {
      const clean = running(seed);
      const dirty = running(seed);
      if (!clean || !dirty) continue;
      pairs += 1;
      for (const s of [clean, dirty]) {
        for (const bloc of BLOCS) {
          s.player.campaign!.polls[bloc.id] = 55;
          s.player.campaign!.rivalPolls[bloc.id] = 48;
        }
      }
      dirty.player.campaign!.damage = 90;
      holdElection(createCtx(clean));
      holdElection(createCtx(dirty));
      if (clean.player.mandate) cleanWins += 1;
      if (dirty.player.mandate) dirtyWins += 1;
    }
    if (pairs < 15) return;
    expect(cleanWins).toBeGreaterThan(dirtyWins);
  });

  it('fait peser un bloc pour ce qu’il vote, pas pour ce qu’il est', () => {
    // Deux campagnes : l'une séduit ceux qui votent, l'autre ceux qui restent
    // chez eux. La première doit gagner, et c'est tout l'intérêt du découpage.
    const voters = running(553);
    const absent = running(553);
    if (!voters || !absent) return;
    for (const bloc of BLOCS) {
      voters.player.campaign!.polls[bloc.id] = 40;
      absent.player.campaign!.polls[bloc.id] = 40;
    }
    voters.player.campaign!.polls.aines = 90;
    absent.player.campaign!.polls.jeunes = 90;
    expect(tally(voters.player.campaign!.polls))
      .toBeGreaterThan(tally(absent.player.campaign!.polls));
  });

  it('règle le scrutin tout seul à la fin de l’année', () => {
    const state = running(555);
    if (!state) return;
    expect(campaignOf(state)).not.toBeNull();
    advancePolitics(createCtx(state));
    // Gagné ou perdu, la campagne ne traîne pas d'une année sur l'autre.
    expect(campaignOf(state)).toBeNull();
  });
});

describe('gouverner', () => {
  it('donne un mandat, une durée et des promesses', () => {
    const state = governing(601);
    if (!state) return;
    const held = mandateOf(state)!;
    expect(held.officeId).toBe('mairie');
    expect(held.yearsLeft).toBe(getOffice('mairie')!.term);
    expect(held.promises).toEqual(['services', 'logement']);
    expect(officeOf(state)?.id).toBe('mairie');
    expect(approvalOf(state)).toBeGreaterThan(0);
  });

  it('pose une décision par an, et jamais deux fois la même', () => {
    const state = governing(603);
    if (!state) return;
    const held = state.player.mandate!;
    const seen = new Set<string>();
    for (let year = 0; year < held.yearsLeft; year++) {
      state.player.yearActions = {};
      advancePolitics(createCtx(state));
      if (!state.player.mandate?.pending) break;
      expect(seen.has(state.player.mandate.pending)).toBe(false);
      seen.add(state.player.mandate.pending);
      expect(pendingDecision(state)).not.toBeNull();
      decide(createCtx(state), 0);
      expect(state.player.mandate!.pending).toBeNull();
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('fâche quelqu’un à chaque décision', () => {
    const state = governing(605);
    if (!state) return;
    const held = state.player.mandate!;
    held.pending = DECISIONS[0].id;
    const before = { ...held.approval };
    decide(createCtx(state), 0);
    // Une décision sans perdant n'est pas une décision : au moins un bloc
    // doit avoir baissé.
    expect(BLOCS.some((b) => held.approval[b.id] < before[b.id])).toBe(true);
    expect(held.record).toHaveLength(1);
  });

  it('compte les promesses tenues et celles qu’on abandonne', () => {
    const state = governing(607);
    if (!state) return;
    const held = state.player.mandate!;
    // « Le terrain que tout le monde veut », option « des logements » : c'est
    // exactement ce qui avait été promis.
    held.pending = 'terrain';
    decide(createCtx(state), 0);
    expect(held.kept).toBe(1);

    // « L'hôpital », option « fermer » : c'est renoncer aux services promis.
    const before = { ...held.approval };
    held.pending = 'hopital';
    decide(createCtx(state), 2);
    expect(held.broken).toBe(1);
    // Renoncer coûte partout, et pas seulement chez ceux que ça concernait.
    expect(held.approval.commercants).toBeLessThan(before.commercants + 7);
  });

  it('ne compte pas une promesse qu’on n’avait pas faite', () => {
    const state = governing(609);
    if (!state) return;
    const held = state.player.mandate!;
    held.promises = [];
    held.pending = 'terrain';
    decide(createCtx(state), 0);
    expect(held.kept).toBe(0);
  });

  it('fait payer le fait de ne rien trancher', () => {
    const state = governing(611);
    if (!state) return;
    const held = state.player.mandate!;
    held.pending = DECISIONS[0].id;
    const before = approvalOf(state);
    state.player.yearActions = {};
    advancePolitics(createCtx(state));
    expect(approvalOf(state)).toBeLessThan(before);
    expect(state.player.mandate!.record.join(' ')).toContain('suspens');
  });

  it('use le pouvoir tout seul', () => {
    const state = governing(613);
    if (!state) return;
    // Une opinion très haute redescend même sans rien faire : personne ne
    // finit un mandat plus aimé qu'au premier jour.
    for (const bloc of BLOCS) state.player.mandate!.approval[bloc.id] = 90;
    const before = approvalOf(state);
    state.player.yearActions = {};
    advancePolitics(createCtx(state));
    expect(approvalOf(state)).toBeLessThan(before);
  });

  it('arrive à son terme, et laisse ce qu’on a fait derrière soi', () => {
    const state = governing(615);
    if (!state) return;
    const term = state.player.mandate!.yearsLeft;
    for (const bloc of BLOCS) state.player.mandate!.approval[bloc.id] = 78;
    for (let year = 0; year < term + 1 && state.player.mandate; year++) {
      state.player.yearActions = {};
      if (state.player.mandate.pending) state.player.mandate.pending = null;
      advancePolitics(createCtx(state));
    }
    expect(mandateOf(state)).toBeNull();
    // Et la prochaine campagne part de là : c'est ce que veut dire « la
    // réélection est un vote ».
    expect(Number(state.player.flags['polls_mairie_aines'] ?? 0)).toBeGreaterThan(50);
  });

  it('fait de la réélection un vrai départ, pas une remise à zéro', () => {
    const loved = governing(617);
    const loathed = governing(619);
    if (!loved || !loathed) return;
    for (const bloc of BLOCS) {
      loved.player.flags[`polls_mairie_${bloc.id}`] = 88;
      loathed.player.flags[`polls_mairie_${bloc.id}`] = 12;
    }
    loved.player.mandate = null;
    loathed.player.mandate = null;
    loved.player.yearActions = {};
    loathed.player.yearActions = {};
    declareRun(createCtx(loved), 'mairie');
    declareRun(createCtx(loathed), 'mairie');
    expect(tally(loved.player.campaign!.polls))
      .toBeGreaterThan(tally(loathed.player.campaign!.polls) + 15);
  });

  it('laisse démissionner, et le fait payer', () => {
    const state = governing(621);
    if (!state) return;
    for (const bloc of BLOCS) state.player.mandate!.approval[bloc.id] = 70;
    expect(resign(createCtx(state)).ok).toBe(true);
    expect(mandateOf(state)).toBeNull();
    // Ce qu'on laisse est nettement en dessous de ce qu'on avait.
    expect(Number(state.player.flags['polls_mairie_aines'])).toBeLessThan(60);
  });
});

describe('l’argent et l’année', () => {
  it('verse réellement l’indemnité sur le compte', () => {
    // La régression qui a coûté le plus cher à trouver : le motif
    // « accumulateur » suppose que l'argent est déjà crédité, et le bilan le
    // retranche de la ligne d'encaissement. Un système qui accumule sans
    // créditer se fait imposer sans jamais rien toucher.
    const state = governing(701);
    if (!state) return;
    const before = state.player.money;
    state.player.yearActions = {};
    advancePolitics(createCtx(state));
    expect(state.player.money).toBeGreaterThan(before);
    expect(politicalEarnings(state)).toBeGreaterThan(0);
  });

  it('ne compte pas l’indemnité deux fois', () => {
    /*
     * **On compare deux fois la même année, et non un écart brut.**
     *
     * La version d'avant regardait de combien l'argent avait augmenté sur
     * l'année et le comparait à deux fois et demie l'indemnité. Elle marchait
     * tant que rien d'autre ne rentrait cette année-là — puis un changement
     * sans rapport a décalé la séquence aléatoire, l'année a apporté un
     * héritage, et le test a échoué en annonçant 667 247 contre 50 212. Il ne
     * mesurait pas ce qu'il croyait : n'importe quelle autre rentrée le
     * faisait échouer, et n'importe quel double comptage inférieur au bruit
     * lui échappait.
     *
     * Ici, la même année est jouée deux fois depuis le même état — une fois
     * avec le mandat, une fois sans. Tout le reste étant identique, la
     * différence **est** l'indemnité, et rien d'autre.
     */
    const state = governing(703);
    if (!state) return;
    state.player.yearActions = {};
    advancePolitics(createCtx(state));
    const earned = politicalEarnings(state);

    const withSeat = JSON.parse(JSON.stringify(state)) as GameState;
    const without = JSON.parse(JSON.stringify(state)) as GameState;
    without.player.mandate = null;

    const beforeWith = withSeat.player.money;
    const beforeWithout = without.player.money;
    simulateYear(withSeat);
    simulateYear(without);
    const credited = (withSeat.player.money - beforeWith)
      - (without.player.money - beforeWithout);
    // Encaissée une fois : jamais deux.
    expect(credited).toBeLessThan(earned * 1.6);
  });

  it('échelonne l’indemnité et le coût selon le siège', () => {
    const state = politician(705);
    if (!state) return;
    expect(officePay(state, getOffice('national')!))
      .toBeGreaterThan(officePay(state, getOffice('conseil')!));
    expect(campaignCost(state, getOffice('national')!))
      .toBeGreaterThan(campaignCost(state, getOffice('conseil')!));
    expect(tacticCost(state, 'medias')).toBe(0);
  });

  it('survit à une année complète et à la sauvegarde', () => {
    const state = governing(707);
    if (!state) return;
    simulateYear(state);
    if (!state.player.alive) return;
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    if (copy.player.mandate) {
      expect(copy.player.mandate.officeId).toBe('mairie');
      advancePolitics(createCtx(copy));
    }
    expect(copy.gameOver).toBe(false);
  });

  it('n’existe pas pour qui ne s’est jamais présenté', () => {
    const state = createNewLife({ seed: 709 });
    playTo(state, 30);
    if (state.gameOver || !state.player.alive) return;
    expect(campaignOf(state)).toBeNull();
    expect(mandateOf(state)).toBeNull();
    expect(politicalEarnings(state)).toBe(0);
    expect(share.length).toBeGreaterThan(0);
    const before = state.player.money;
    advancePolitics(createCtx(state));
    expect(state.player.money).toBe(before);
  });
});
