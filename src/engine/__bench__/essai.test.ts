/**
 * Vérifications de l'essai et du book.
 *
 * Deux reproches du catalogue, tous deux sur ce qui précède le travail.
 * « Auditions » : « on est retenu ou non selon son niveau, mais l'essai
 * lui-même ne se joue pas ». « Agence et book » : « l'agence existe et
 * négocie ; le book, non ».
 *
 * Six exigences :
 *
 * 1. **on peut viser au-dessus de soi** — et seulement dans une fourchette :
 *    trop bas, on vous le proposerait déjà ; trop haut, on ne vous recevrait
 *    pas ;
 * 2. **on peut rentrer les mains vides** — sans quoi oser ne coûterait rien ;
 * 3. **l'approche est un arbitrage** — plus dur, mais le rôle vaut davantage ;
 * 4. **le book vaut par sa variété**, pas par son épaisseur ;
 * 5. **une pièce vieillit** ;
 * 6. **le book ouvre des portes** que le métier seul n'ouvre pas.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  APPROACHES, PIECE_KINDS, PIECE_FRESH, TRYOUTS_PER_YEAR, TRYOUT_REACH,
  bookLabel, getApproach, getPieceKind, pieceFor, pieceValue,
} from '../../data/casting.ts';
import {
  addToBook, advanceCasting, askTryout, autoTryout, bookPieces, bookStrength,
  bookSummary, consumeTryoutBonus, missingPieces, reach, settleTryout, shoot,
  shootBlocker, shootCost, tryoutBlocker, tryoutContext, tryoutOf,
  tryoutTargets,
} from '../../systems/casting.ts';
import { hireAgent, settleJob, startDiscipline } from '../../systems/stage.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Quelqu'un qui exerce, à un niveau de métier donné. */
function performer(
  seed: number,
  disciplineId = 'jeu',
  craft = 40,
  fame = 30,
): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, 26);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  if (state.player.criminalRecord.wanted) return null;
  state.player.yearActions = {};
  if (!startDiscipline(createCtx(state), disciplineId).ok) return null;
  const stage = state.player.stage;
  if (!stage) return null;
  stage.craft = craft;
  state.player.fame.level = fame;
  state.player.money = Math.max(state.player.money, 3_000_000);
  state.player.yearActions = {};
  return state;
}

/** Un résultat de mini-jeu fabriqué, pour isoler la règle testée. */
function played(quality: number) {
  return {
    success: quality > 0.5,
    score: Math.round(quality * 100),
    quality,
    mistakes: Math.round((1 - quality) * 5),
    time: 9_000,
  };
}

/* ------------------------------------------------------------------ */

describe('les données de l’essai et du book tiennent debout', () => {
  it('fait de chaque approche un vrai échange', () => {
    expect(APPROACHES.length).toBeGreaterThanOrEqual(3);
    // Ce qui est plus dur doit rapporter plus, et l'inverse. Sans cela, une
    // approche dominerait et le choix n'existerait pas.
    const byOdds = [...APPROACHES].sort((a, b) => b.odds - a.odds);
    for (let i = 1; i < byOdds.length; i++) {
      expect(byOdds[i].worth).toBeGreaterThan(byOdds[i - 1].worth);
      expect(byOdds[i].growth).toBeGreaterThan(byOdds[i - 1].growth);
      expect(byOdds[i].sting).toBeGreaterThan(byOdds[i - 1].sting);
    }
    expect(getApproach('contre')?.odds).toBeLessThan(0);
    expect(getApproach('sur')?.odds).toBeGreaterThan(0);
  });

  it('échelonne les pièces de book, du catalogue à la maison', () => {
    expect(PIECE_KINDS.length).toBeGreaterThanOrEqual(5);
    for (const kind of PIECE_KINDS) expect(kind.worth).toBeGreaterThan(0);
    // La séance payée est la moins précieuse : c'est ce qui empêche
    // d'acheter un book.
    const paid = getPieceKind('essai')!;
    for (const kind of PIECE_KINDS) {
      if (kind.id !== 'essai') expect(kind.worth).toBeGreaterThan(paid.worth);
    }
    // Chaque pièce issue d'un engagement désigne un engagement qui existe.
    for (const kind of PIECE_KINDS) {
      if (kind.fromTemplate) expect(pieceFor(kind.fromTemplate)?.id).toBe(kind.id);
    }
  });

  it('fait vieillir une pièce', () => {
    const kind = getPieceKind('couverture')!;
    const fresh = pieceValue(kind, 80, 0);
    const middling = pieceValue(kind, 80, PIECE_FRESH);
    const old = pieceValue(kind, 80, 20);
    expect(middling).toBe(fresh);
    expect(old).toBeLessThan(fresh * 0.5);
    // Et la qualité compte autant que la fraîcheur.
    expect(pieceValue(kind, 95, 0)).toBeGreaterThan(pieceValue(kind, 20, 0));
  });

  it('donne à chaque book une formule', () => {
    expect(bookLabel(0)).toBeTruthy();
    expect(bookLabel(100)).not.toBe(bookLabel(0));
    expect(TRYOUTS_PER_YEAR).toBeGreaterThan(0);
    expect(TRYOUT_REACH).toBeGreaterThan(10);
  });
});

describe('l’essai', () => {
  it('ne propose que ce qui est au-dessus, et pas trop', () => {
    let built = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const state = performer(seed);
      if (!state) continue;
      built += 1;
      const here = reach(state);
      for (const target of tryoutTargets(state)) {
        // Trop bas : on vous le proposerait déjà. Trop haut : on ne vous
        // recevrait même pas.
        expect(target.demands).toBeGreaterThan(here);
        expect(target.demands).toBeLessThanOrEqual(here + TRYOUT_REACH);
      }
    }
    expect(built).toBeGreaterThan(15);
  });

  it('ouvre réellement un essai, et le limite dans l’année', () => {
    const state = performer(31);
    if (!state) return;
    const targets = tryoutTargets(state);
    if (targets.length === 0) return;
    expect(askTryout(createCtx(state), targets[0].id, 'juste').ok).toBe(true);
    expect(tryoutOf(state)).not.toBeNull();
    expect(tryoutContext(state)).not.toBeNull();
    // Un seul à la fois.
    expect(tryoutBlocker(state)).toContain('déjà');
    // Et pas plus de deux par an.
    settleTryout(createCtx(state), played(0.02));
    askTryout(createCtx(state), targets[0].id, 'juste');
    settleTryout(createCtx(state), played(0.02));
    expect(tryoutBlocker(state)).toContain('assez');
  });

  it('peut renvoyer les mains vides', () => {
    let taken = 0;
    let tried = 0;
    for (let seed = 41; seed < 91; seed++) {
      const state = performer(seed);
      if (!state) continue;
      const targets = tryoutTargets(state);
      if (targets.length === 0) continue;
      if (!askTryout(createCtx(state), targets[targets.length - 1].id, 'juste').ok) continue;
      tried += 1;
      // Très mal joué sur ce qu'on vise de plus haut : on doit surtout rater.
      if (settleTryout(createCtx(state), played(0.05)).ok) taken += 1;
      expect(tryoutOf(state)).toBeNull();
    }
    if (tried < 15) return;
    expect(taken / tried).toBeLessThan(0.35);
  });

  it('fait de la performance ce qui décide', () => {
    let good = 0;
    let bad = 0;
    let pairs = 0;
    for (let seed = 101; seed < 151; seed++) {
      const a = performer(seed);
      const b = performer(seed);
      if (!a || !b) continue;
      const targets = tryoutTargets(a);
      if (targets.length === 0) continue;
      if (!askTryout(createCtx(a), targets[0].id, 'juste').ok) continue;
      if (!askTryout(createCtx(b), targets[0].id, 'juste').ok) continue;
      pairs += 1;
      if (settleTryout(createCtx(a), played(0.98)).ok) good += 1;
      if (settleTryout(createCtx(b), played(0.02)).ok) bad += 1;
    }
    if (pairs < 15) return;
    expect(good).toBeGreaterThan(bad);
  });

  it('rend l’approche difficile plus difficile, et plus payante', () => {
    const safe = performer(201);
    const bold = performer(201);
    if (!safe || !bold) return;
    const targets = tryoutTargets(safe);
    if (targets.length === 0) return;
    askTryout(createCtx(safe), targets[0].id, 'sur');
    askTryout(createCtx(bold), targets[0].id, 'contre');
    // Jouer contre son type est nettement plus dur.
    expect(bold.player.stage!.tryout!.difficulty)
      .toBeGreaterThan(safe.player.stage!.tryout!.difficulty + 20);

    // Et si ça passe, le rôle vaut davantage.
    settleTryout(createCtx(safe), played(1));
    settleTryout(createCtx(bold), played(1));
    if (!safe.player.stage!.offers[0] || !bold.player.stage!.offers[0]) return;
    expect(bold.player.stage!.offers[0].fee)
      .toBeGreaterThan(safe.player.stage!.offers[0].fee);
  });

  it('met le rôle obtenu sur la table, sans le donner', () => {
    const state = performer(203);
    if (!state) return;
    const targets = tryoutTargets(state);
    if (targets.length === 0) return;
    askTryout(createCtx(state), targets[0].id, 'juste');
    const before = state.player.stage!.offers.length;
    const outcome = settleTryout(createCtx(state), played(1));
    if (!outcome.ok) return;
    // Obtenu ne veut pas dire tenu : c'est une proposition de plus, et il
    // faudra encore la jouer.
    expect(state.player.stage!.offers.length).toBe(before + 1);
    expect(state.player.stage!.offers[0].templateId).toBe(targets[0].id);
    expect(state.player.stage!.current).toBeNull();
  });

  it('fait payer le rôle décroché contre son type, une seule fois', () => {
    const state = performer(205);
    if (!state) return;
    state.player.flags.tryoutWorth = 1.9;
    state.player.flags.tryoutGrowth = 1.6;
    const first = consumeTryoutBonus(state);
    expect(first.worth).toBe(1.9);
    // Consommé : le rôle suivant est ordinaire.
    const second = consumeTryoutBonus(state);
    expect(second.worth).toBe(1);
    expect(second.growth).toBe(1);
  });

  it('efface l’essai qu’on n’est pas allé passer', () => {
    const state = performer(207);
    if (!state) return;
    const targets = tryoutTargets(state);
    if (targets.length === 0) return;
    askTryout(createCtx(state), targets[0].id, 'juste');
    advanceCasting(createCtx(state));
    expect(tryoutOf(state)).toBeNull();
  });

  it('se résout aussi sans jouer', () => {
    const state = performer(209);
    if (!state) return;
    const targets = tryoutTargets(state);
    if (targets.length === 0) return;
    askTryout(createCtx(state), targets[0].id, 'juste');
    autoTryout(createCtx(state));
    // Pris ou non, l'essai est réglé : il ne traîne pas.
    expect(tryoutOf(state)).toBeNull();
  });

  it('n’existe pas pour qui n’a pas de carrière', () => {
    const state = createNewLife({ seed: 211 });
    playTo(state, 26);
    if (state.gameOver || !state.player.alive) return;
    expect(tryoutTargets(state)).toEqual([]);
    expect(tryoutOf(state)).toBeNull();
    expect(tryoutContext(state)).toBeNull();
    expect(reach(state)).toBe(0);
    expect(bookStrength(state)).toBe(0);
  });
});

describe('le book', () => {
  it('vaut par la variété, pas par l’épaisseur', () => {
    const varied = performer(301, 'podium', 60, 40);
    const repeated = performer(301, 'podium', 60, 40);
    if (!varied || !repeated) return;
    // Quatre pièces de quatre types contre quatre fois la même.
    for (const id of ['podium_catalogue', 'podium_local', 'podium_campagne', 'podium_magazine']) {
      addToBook(varied, id, 75);
    }
    for (let i = 0; i < 4; i++) addToBook(repeated, 'podium_campagne', 75);
    expect(bookStrength(varied)).toBeGreaterThan(bookStrength(repeated) * 1.4);
    expect(bookPieces(varied)).toHaveLength(4);
  });

  it('ne retient d’un type que la meilleure', () => {
    const state = performer(303, 'podium', 60, 40);
    if (!state) return;
    addToBook(state, 'podium_magazine', 90);
    const alone = bookStrength(state);
    addToBook(state, 'podium_magazine', 20);
    // Une deuxième couverture médiocre n'efface pas la bonne, et n'ajoute
    // presque rien.
    expect(bookStrength(state)).toBeGreaterThanOrEqual(alone);
    expect(bookStrength(state)).toBeLessThan(alone * 1.3);
  });

  it('vieillit avec les années', () => {
    const state = performer(305, 'podium', 60, 40);
    if (!state) return;
    addToBook(state, 'podium_magazine', 85);
    const fresh = bookStrength(state);
    state.year += 20;
    expect(bookStrength(state)).toBeLessThan(fresh);
  });

  it('n’ajoute rien pour un engagement qui ne produit pas d’image', () => {
    const state = performer(307, 'jeu', 60, 40);
    if (!state) return;
    addToBook(state, 'jeu_theatre', 90);
    expect(bookPieces(state)).toHaveLength(0);
    expect(bookStrength(state)).toBe(0);
  });

  it('se remplit en tenant un engagement', () => {
    const state = performer(309, 'podium', 55, 40);
    if (!state) return;
    const template = { templateId: 'podium_campagne' };
    state.player.stage!.current = {
      id: 'x', ...template, from: 'une maison', fee: 20_000, difficulty: 45,
    };
    settleJob(createCtx(state), played(0.85));
    expect(bookPieces(state).some((p) => p.kindId === 'campagne')).toBe(true);
    expect(bookStrength(state)).toBeGreaterThan(0);
  });

  it('laisse payer une séance, sans que ça remplace le travail', () => {
    const state = performer(311, 'podium', 50, 30);
    if (!state) return;
    const before = state.player.money;
    expect(shoot(createCtx(state)).ok).toBe(true);
    expect(state.player.money).toBe(before - shootCost(state));
    const paid = bookStrength(state);
    // Une fois par an.
    expect(shootBlocker(state)).toContain('déjà');
    // Et une vraie campagne vaut beaucoup plus.
    addToBook(state, 'podium_campagne', 80);
    expect(bookStrength(state)).toBeGreaterThan(paid * 2);
  });

  it('ne sert qu’au métier qui en a un', () => {
    const actor = performer(313, 'jeu', 50, 30);
    if (!actor) return;
    expect(shootBlocker(actor)).toContain('ce métier-là');
    expect(shoot(createCtx(actor)).ok).toBe(false);
  });

  it('ouvre la porte des agences', () => {
    const empty = performer(315, 'podium', 45, 25);
    const stocked = performer(315, 'podium', 45, 25);
    if (!empty || !stocked) return;
    // Le même métier des deux côtés : ce qui change est ce qu'on peut montrer.
    expect(hireAgent(createCtx(empty)).ok).toBe(false);
    for (const id of ['podium_catalogue', 'podium_local', 'podium_campagne']) {
      addToBook(stocked, id, 80);
    }
    expect(hireAgent(createCtx(stocked)).ok).toBe(true);
  });

  it('élargit ce pour quoi on peut se présenter', () => {
    const empty = performer(317, 'podium', 45, 35);
    const stocked = performer(317, 'podium', 45, 35);
    if (!empty || !stocked) return;
    for (const id of ['podium_catalogue', 'podium_local', 'podium_campagne', 'podium_magazine']) {
      addToBook(stocked, id, 85);
    }
    expect(reach(stocked)).toBeGreaterThan(reach(empty));
    expect(missingPieces(stocked).length).toBeLessThan(missingPieces(empty).length);
    expect(bookSummary(stocked)).toBeTruthy();
  });

  it('survit à une année complète et à la sauvegarde', () => {
    const state = performer(319, 'podium', 55, 35);
    if (!state) return;
    addToBook(state, 'podium_campagne', 70);
    const targets = tryoutTargets(state);
    if (targets.length > 0) askTryout(createCtx(state), targets[0].id, 'juste');
    simulateYear(state);
    if (!state.player.alive) return;
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    expect(copy.player.stage!.book.length).toBeGreaterThan(0);
    expect(bookStrength(copy)).toBeGreaterThan(0);
    advanceCasting(createCtx(copy));
    expect(copy.player.stage).not.toBeNull();
  });
});
