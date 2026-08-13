/**
 * Vérifications des métiers de scène.
 *
 * Le catalogue classait les cinq — comédien, musicien, sportif, mannequin,
 * politique — en `PLACEHOLDER` : une échelle de salaires nommée « Acteur » et
 * rien derrière. Ce qui suit vérifie que ce qui a été ajouté est un système
 * et non une deuxième échelle de salaires.
 *
 * 1. **On ne choisit pas ce qu'on veut** — ce qui arrive sur la table dépend
 *    du métier acquis et du nom, et rien d'autre ne l'ouvre ;
 * 2. **jouer compte** — la même signature, tenue bien ou mal, ne produit ni
 *    le même cachet, ni le même nom, ni le même métier ;
 * 3. **oser compte plus que réussir** — une prestation propre où l'on n'a rien
 *    tenté est notée plus bas qu'une prestation risquée à moitié réussie ;
 * 4. **le risque paie** — un engagement au-dessus de son niveau, tenu, fait
 *    davantage pour le nom que le même effort sur un engagement facile ;
 * 5. **le corps et l'âge comptent**, et pas de la même façon selon le métier ;
 * 6. **l'agent est un arbitrage**, pas un bouton « mieux » ;
 * 7. **l'argent est compté une fois** — un cachet ne doit pas être encaissé
 *    deux fois par le bilan annuel.
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
  ACCOLADES, DISCIPLINES, JOB_TEMPLATES, getDiscipline, receptionLabel,
  templatesFor,
} from '../../data/stage.ts';
import {
  performance as PERFORMANCE, type PerformanceState,
} from '../../systems/minigames/performance.ts';
import {
  acceptOffer, advanceStage, ageFactor, agentCut, agentOf, autoPerform,
  availableDisciplines, craftLabel, declineOffer, disciplineBlocker,
  disciplineOf, dismissAgent, hireAgent, jobFee, offerBlocker,
  pendingAccolades, performanceContext, quitDiscipline, rollOffers, settleJob,
  stageEarnings, stageOf, startDiscipline, templateOf,
} from '../../systems/stage.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un adulte vivant et libre, prêt à agir. */
function adult(seed: number, age = 24): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  if (state.player.criminalRecord.wanted) return null;
  state.player.yearActions = {};
  return state;
}

/**
 * Quelqu'un qui exerce, à un niveau de métier donné.
 *
 * Le niveau est posé directement : atteindre 60 de métier en jouant demande
 * une dizaine d'années, et le test porte sur les règles, pas sur la durée.
 */
function performer(seed: number, disciplineId: string, craft = 45, age = 24): GameState | null {
  const state = adult(seed, age);
  if (!state) return null;
  const ctx = createCtx(state);
  const outcome = startDiscipline(ctx, disciplineId);
  if (!outcome.ok) return null;
  const stage = state.player.stage;
  if (!stage) return null;
  stage.craft = craft;
  state.player.yearActions = {};
  rollOffers(createCtx(state));
  return state;
}

/** Fait signer le premier engagement proposé. */
function signAnything(state: GameState): boolean {
  const stage = state.player.stage;
  if (!stage || stage.offers.length === 0) return false;
  const ctx = createCtx(state);
  return acceptOffer(ctx, stage.offers[0].id).ok;
}

/** Un résultat de mini-jeu fabriqué, pour isoler la règle testée. */
function played(quality: number) {
  return {
    success: quality > 0.5,
    score: Math.round(quality * 100),
    quality,
    mistakes: Math.round((1 - quality) * 5),
    time: 16_000,
  };
}

/* ------------------------------------------------------------------ */

describe('les données de scène tiennent debout', () => {
  it('couvre les cinq métiers avec de quoi faire une carrière', () => {
    expect(DISCIPLINES).toHaveLength(5);
    for (const d of DISCIPLINES) {
      const templates = templatesFor(d.id);
      // Six engagements au minimum : sans cela, la carrière est une ligne
      // droite et le « choisir parmi » n'existe pas.
      expect(templates.length).toBeGreaterThanOrEqual(6);
      // Il faut de quoi commencer à zéro et de quoi viser haut.
      expect(Math.min(...templates.map((t) => t.demands))).toBeLessThan(15);
      expect(Math.max(...templates.map((t) => t.demands))).toBeGreaterThan(70);
      expect(ACCOLADES.some((a) => a.discipline === d.id)).toBe(true);
      expect(getDiscipline(d.id)).toBeDefined();
    }
    // Chaque engagement appartient à une discipline connue.
    for (const t of JOB_TEMPLATES) expect(getDiscipline(t.discipline)).toBeDefined();
  });

  it('ne fait pas de l’argent le seul axe', () => {
    // Si le mieux payé était toujours le plus prestigieux, il n'y aurait rien
    // à arbitrer. On vérifie que l'ordre du cachet et l'ordre du nom diffèrent
    // dans chaque discipline.
    for (const d of DISCIPLINES) {
      const templates = templatesFor(d.id);
      const byPay = [...templates].sort((a, b) => b.pay - a.pay).map((t) => t.id);
      const byFame = [...templates].sort((a, b) => b.fame - a.fame).map((t) => t.id);
      expect(byPay).not.toEqual(byFame);
    }
  });

  it('donne à chaque accueil une formule, y compris aux extrêmes', () => {
    expect(receptionLabel(100).label).toBeTruthy();
    expect(receptionLabel(0).label).toBeTruthy();
    expect(receptionLabel(95).label).not.toBe(receptionLabel(10).label);
  });
});

describe('se lancer', () => {
  it('produit réellement quelqu’un qui exerce', () => {
    // Garde-fou : sans lui, tous les tests qui suivent pourraient passer en
    // ne testant rien du tout.
    let built = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const state = performer(seed, 'jeu');
      if (!state) continue;
      built += 1;
      expect(stageOf(state)).not.toBeNull();
      expect(disciplineOf(state)?.id).toBe('jeu');
      expect(craftLabel(state.player.stage!.craft)).toBeTruthy();
    }
    expect(built).toBeGreaterThan(20);
  });

  it('refuse ce que l’âge, la cellule ou la cavale interdisent', () => {
    const state = adult(4);
    if (!state) return;
    const tribune = getDiscipline('tribune')!;
    state.player.age = 19;
    expect(disciplineBlocker(state, tribune)).toContain('25');
    state.player.age = 40;
    expect(disciplineBlocker(state, tribune)).toBeNull();

    state.player.criminalRecord.wanted = true;
    expect(disciplineBlocker(state, tribune)).not.toBeNull();
    state.player.criminalRecord.wanted = false;

    // Un sportif de soixante-cinq ans ne débute pas ; un politique, si.
    state.player.age = 65;
    expect(disciplineBlocker(state, getDiscipline('sport')!)).not.toBeNull();
    expect(disciplineBlocker(state, tribune)).toBeNull();
    expect(availableDisciplines(state).map((d) => d.id)).toContain('tribune');
  });

  it('ne remet pas tout à zéro quand on change de voie', () => {
    const state = performer(7, 'musique', 70);
    if (!state) return;
    state.player.yearActions = {};
    const ctx = createCtx(state);
    expect(startDiscipline(ctx, 'jeu').ok).toBe(true);
    const stage = state.player.stage!;
    expect(stage.disciplineId).toBe('jeu');
    // Ce qu'on savait faire ailleurs compte un peu, jamais entièrement.
    expect(stage.craft).toBeGreaterThan(10);
    expect(stage.craft).toBeLessThan(70);
    // Et pas deux fois dans la même année.
    expect(startDiscipline(createCtx(state), 'sport').ok).toBe(false);
  });

  it('laisse arrêter, et ce qu’on a fait ne revient pas', () => {
    const state = performer(9, 'sport', 60);
    if (!state) return;
    expect(quitDiscipline(createCtx(state)).ok).toBe(true);
    expect(state.player.stage).toBeNull();
    expect(quitDiscipline(createCtx(state)).ok).toBe(false);
  });
});

describe('on choisit parmi ce qu’on vous propose', () => {
  it('ne propose ni ce qui est hors de portée ni ce qu’on a dépassé', () => {
    const state = performer(11, 'jeu', 40);
    if (!state) return;
    const stage = state.player.stage!;
    expect(stage.offers.length).toBeGreaterThan(0);
    for (const offer of stage.offers) {
      const t = templateOf(offer)!;
      expect(t.discipline).toBe('jeu');
      expect(t.demands).toBeLessThanOrEqual(40 + 26);
      expect(t.demands).toBeGreaterThanOrEqual(40 - 42);
      expect(state.player.fame.level).toBeGreaterThanOrEqual(t.minFame);
    }
  });

  it('ouvre le haut du métier à mesure qu’on monte', () => {
    const low = performer(13, 'musique', 20);
    const high = performer(13, 'musique', 82);
    if (!low || !high) return;
    high.player.fame.level = 70;
    rollOffers(createCtx(high));
    const ceiling = (s: GameState) => Math.max(
      ...s.player.stage!.offers.map((o) => templateOf(o)!.demands),
    );
    if (low.player.stage!.offers.length === 0 || high.player.stage!.offers.length === 0) return;
    expect(ceiling(high)).toBeGreaterThan(ceiling(low));
  });

  it('facture selon le métier, l’époque et l’âge', () => {
    const state = performer(15, 'podium', 30, 22);
    if (!state) return;
    const template = templatesFor('podium')[0];
    const young = jobFee(state, template);
    // Un mannequin de cinquante ans ne se facture pas comme à vingt.
    state.player.age = 50;
    const old = jobFee(state, template);
    expect(old).toBeLessThan(young);
    expect(young).toBeGreaterThan(0);
  });

  it('refuse un deuxième engagement tant que le premier n’est pas tenu', () => {
    const state = performer(17, 'jeu', 45);
    if (!state) return;
    if (!signAnything(state)) return;
    expect(offerBlocker(state)).not.toBeNull();
    expect(state.player.stage!.current).not.toBeNull();
  });

  it('laisse refuser, et la proposition disparaît', () => {
    const state = performer(19, 'tribune', 40, 30);
    if (!state) return;
    const stage = state.player.stage!;
    if (stage.offers.length === 0) return;
    const before = stage.offers.length;
    expect(declineOffer(createCtx(state), stage.offers[0].id).ok).toBe(true);
    expect(stage.offers).toHaveLength(before - 1);
  });
});

describe('tenir l’engagement', () => {
  it('fait diverger cachet, nom et métier selon la prestation', () => {
    const good = performer(21, 'jeu', 50);
    const bad = performer(21, 'jeu', 50);
    if (!good || !bad) return;
    // Les deux tiennent exactement le même engagement — un qui compte, pour
    // que l'écart soit lisible ailleurs que sur le cachet.
    const template = templatesFor('jeu').find((t) => t.fame >= 6)!;
    for (const s of [good, bad]) {
      s.player.stage!.current = {
        id: 'x', templateId: template.id, from: 'une maison', fee: 30_000,
        difficulty: template.demands,
      };
    }

    const moneyBefore = good.player.money;
    settleJob(createCtx(good), played(0.95));
    settleJob(createCtx(bad), played(0.05));

    expect(good.player.stage!.lastReception).toBeGreaterThan(bad.player.stage!.lastReception + 15);
    expect(good.player.money - moneyBefore).toBeGreaterThan(bad.player.money - moneyBefore);
    expect(good.player.stage!.craft).toBeGreaterThan(bad.player.stage!.craft);
    expect(good.player.fame.level).toBeGreaterThan(bad.player.fame.level);
    // Un engagement raté paie quand même : on avait signé.
    expect(bad.player.money).toBeGreaterThan(moneyBefore);
  });

  it('récompense d’avoir pris plus grand que soi', () => {
    // Deux personnages également bons, l'un sur un engagement à sa portée,
    // l'autre au-dessus. À prestation égale, le second doit marquer plus.
    const easy = performer(23, 'musique', 60);
    const hard = performer(23, 'musique', 60);
    if (!easy || !hard) return;
    const templates = templatesFor('musique');
    const soft = templates.reduce((a, b) => (a.demands < b.demands ? a : b));
    const steep = templates.reduce((a, b) => (a.demands > b.demands ? a : b));
    const put = (s: GameState, id: string, demands: number) => {
      s.player.stage!.current = {
        id: 'x', templateId: id, from: 'quelqu’un', fee: 10_000, difficulty: demands,
      };
    };
    put(easy, soft.id, soft.demands);
    put(hard, steep.id, steep.demands);
    settleJob(createCtx(easy), played(0.8));
    settleJob(createCtx(hard), played(0.8));
    expect(hard.player.stage!.lastReception).toBeGreaterThan(easy.player.stage!.lastReception);
    // Et le métier progresse davantage quand on s'est étiré.
    expect(hard.player.stage!.craft).toBeGreaterThan(easy.player.stage!.craft);
  });

  it('fait du métier acquis l’essentiel, à enjeu égal', () => {
    // On compare à *enjeu constant* : sinon on mesure deux choses à la fois.
    // Un débutant sur un engagement au-dessus de lui bénéficie en plus du
    // terme d'enjeu, et peut alors dépasser un maître qui se traîne sur du
    // facile — c'est voulu, mais ce n'est pas ce que ce test vérifie.
    // L'enjeu se calcule sur `demands - craft` : donner le même engagement aux
    // deux ne l'égalise donc pas, il l'inverse. On donne à chacun l'engagement
    // le plus proche de son propre niveau, ce qui met les deux enjeux au même
    // plancher.
    const put = (s: GameState, craft: number) => {
      const template = templatesFor('sport')
        .reduce((a, b) => (Math.abs(a.demands - craft) <= Math.abs(b.demands - craft) ? a : b));
      s.player.stage!.craft = craft;
      s.player.stage!.current = {
        id: 'x', templateId: template.id, from: 'un club', fee: 9000, difficulty: craft,
      };
    };
    // On moyenne : l'accueil porte un bruit de ±7, et deux tirages isolés
    // peuvent à eux seuls effacer l'écart qu'on cherche à mesurer.
    let weak = 0; let strong = 0; let n = 0;
    for (let seed = 25; seed < 55; seed++) {
      const a = performer(seed, 'sport', 12);
      const b = performer(seed, 'sport', 88);
      if (!a || !b) continue;
      n += 1;
      put(a, 12); put(b, 88);
      settleJob(createCtx(a), played(0.7));
      settleJob(createCtx(b), played(0.7));
      weak += a.player.stage!.lastReception;
      strong += b.player.stage!.lastReception;
    }
    if (n === 0) return;
    expect(strong / n).toBeGreaterThan(weak / n + 12);

    // Et à l'inverse, le joueur n'est jamais spectateur : à personnage égal,
    // bien jouer change franchement l'accueil.
    let lazy = 0; let keen = 0; let m = 0;
    for (let seed = 25; seed < 55; seed++) {
      const a = performer(seed, 'sport', 50);
      const b = performer(seed, 'sport', 50);
      if (!a || !b) continue;
      m += 1;
      put(a, 50); put(b, 50);
      settleJob(createCtx(a), played(0));
      settleJob(createCtx(b), played(1));
      lazy += a.player.stage!.lastReception;
      keen += b.player.stage!.lastReception;
    }
    if (m === 0) return;
    expect(keen / m).toBeGreaterThan(lazy / m + 12);
  });

  it('n’avantage jamais la résolution automatique', () => {
    // Si « laisser faire » valait mieux que bien jouer, jouer serait une
    // punition. On compare la moyenne automatique au jeu très réussi.
    let auto = 0; let manual = 0; let n = 0;
    for (let seed = 30; seed < 60; seed++) {
      const a = performer(seed, 'jeu', 50);
      const m = performer(seed, 'jeu', 50);
      if (!a || !m) continue;
      if (!signAnything(a) || !signAnything(m)) continue;
      autoPerform(createCtx(a));
      settleJob(createCtx(m), played(0.95));
      auto += a.player.stage!.lastReception;
      manual += m.player.stage!.lastReception;
      n += 1;
    }
    if (n === 0) return;
    expect(manual / n).toBeGreaterThan(auto / n);
  });

  it('blesse au sport, et seulement au sport', () => {
    let sportInjuries = 0; let otherInjuries = 0;
    for (let seed = 60; seed < 130; seed++) {
      for (const id of ['sport', 'jeu']) {
        const state = performer(seed, id, 60);
        if (!state) continue;
        const heavy = templatesFor(id).reduce((a, b) => (a.toll > b.toll ? a : b));
        state.player.stage!.current = {
          id: 'x', templateId: heavy.id, from: 'quelqu’un', fee: 5000, difficulty: heavy.demands,
        };
        state.player.stage!.fatigue = 70;
        settleJob(createCtx(state), played(0.5));
        if (state.player.stage!.injuredUntil > 0) {
          if (id === 'sport') sportInjuries += 1; else otherInjuries += 1;
        }
      }
    }
    expect(sportInjuries).toBeGreaterThan(0);
    expect(otherInjuries).toBe(0);
  });

  it('rend le mauvais accueil coûteux au-delà du cachet', () => {
    const state = performer(131, 'tribune', 15, 35);
    if (!state) return;
    const risky = templatesFor('tribune').reduce((a, b) => (a.risk > b.risk ? a : b));
    state.player.stage!.current = {
      id: 'x', templateId: risky.id, from: 'un parti', fee: 8000, difficulty: 90,
    };
    const before = state.player.fame.controversy;
    const goodwill = state.player.fame.goodwill;
    settleJob(createCtx(state), played(0));
    expect(state.player.stage!.lastReception).toBeLessThan(40);
    expect(state.player.fame.controversy).toBeGreaterThan(before);
    expect(state.player.fame.goodwill).toBeLessThan(goodwill);
  });
});

describe('le mini-jeu', () => {
  const context = (skill: number, difficulty = 50) => ({
    skill,
    difficulty,
    mode: 'normal' as const,
    grace: {
      time: 1 + (skill / 100) * 0.35,
      pressure: 1 - (skill / 100) * 0.3,
      tolerance: skill * 0.45,
      insight: skill > 62,
    },
    setup: { label: 'Épreuve', lineName: 'la ligne', beatName: 'un moment' },
  });

  /** Suivre la ligne, avec une main plus ou moins sûre. */
  const follow = (wobble: number, hold: boolean) =>
    (s: PerformanceState, elapsed: number) => ({
      x: s.line + Math.sin(elapsed / 300) * wobble,
      hold: hold && s.active !== null,
    });

  it('note plus haut celui qui suit la ligne', () => {
    const steady = playHeadless(PERFORMANCE, new Rng({ rngState: 5 }), context(50), follow(0.005, true));
    const shaky = playHeadless(PERFORMANCE, new Rng({ rngState: 5 }), context(50), follow(0.32, true));
    expect(steady.result.quality).toBeGreaterThan(shaky.result.quality);
    expect(steady.state.slips).toBeLessThan(shaky.state.slips);
  });

  it('punit de n’avoir rien tenté, même en jouant proprement', () => {
    // Le cœur du système : dans ces métiers, passer inaperçu coûte plus cher
    // que rater. Une partie parfaite sans un seul moment tenté doit être
    // notée sous une partie où l'on a osé et à moitié réussi.
    const timid = playHeadless(PERFORMANCE, new Rng({ rngState: 11 }), context(50), follow(0.004, false));
    const bold = playHeadless(PERFORMANCE, new Rng({ rngState: 11 }), context(50), follow(0.09, true));
    expect(timid.state.beats.every((b) => !b.attempted)).toBe(true);
    expect(bold.state.beats.some((b) => b.attempted)).toBe(true);
    expect(bold.result.quality).toBeGreaterThan(timid.result.quality);
  });

  it('donne de la marge au personnage sans jouer à sa place', () => {
    // Même politique de jeu, deux niveaux : la zone juste est plus large et le
    // temps plus long, donc le résultat est meilleur — mais un très bon joueur
    // sur un débutant doit rester devant un mauvais joueur sur un expert.
    const novicePlay = playHeadless(PERFORMANCE, new Rng({ rngState: 17 }), context(10), follow(0.06, true));
    const expertPlay = playHeadless(PERFORMANCE, new Rng({ rngState: 17 }), context(90), follow(0.06, true));
    expect(expertPlay.state.band).toBeGreaterThan(novicePlay.state.band);
    expect(expertPlay.state.limit).toBeGreaterThan(novicePlay.state.limit);

    const goodOnNovice = playHeadless(PERFORMANCE, new Rng({ rngState: 17 }), context(10), follow(0.004, true));
    const badOnExpert = playHeadless(PERFORMANCE, new Rng({ rngState: 17 }), context(90), follow(0.45, false));
    expect(goodOnNovice.result.quality).toBeGreaterThan(badOnExpert.result.quality);
  });

  it('sanctionne d’avoir coupé court', () => {
    const quit = playHeadless(PERFORMANCE, new Rng({ rngState: 23 }), context(60),
      (s, elapsed) => ({ x: s.line, hold: true, quit: elapsed > 2000 }));
    expect(quit.state.bailed).toBe(true);
    expect(quit.result.success).toBe(false);
    expect(quit.result.notes?.join(' ')).toContain('coupé');
  });

  it('rejoue à l’identique à graine égale', () => {
    const a = playHeadless(PERFORMANCE, new Rng({ rngState: 42 }), context(55), follow(0.05, true));
    const b = playHeadless(PERFORMANCE, new Rng({ rngState: 42 }), context(55), follow(0.05, true));
    expect(a.result).toEqual(b.result);
  });

  it('branche le vocabulaire de chaque métier sur la même mécanique', () => {
    const words = new Set<string>();
    for (const d of DISCIPLINES) {
      const state = performer(200 + DISCIPLINES.indexOf(d), d.id, 45, 30);
      if (!state) continue;
      if (!signAnything(state)) continue;
      const ctx = performanceContext(state);
      expect(ctx).not.toBeNull();
      const setup = ctx!.setup as { lineName: string; beatName: string };
      words.add(setup.lineName);
      expect(d.minigame).toBe('performance');
    }
    // Cinq métiers, un seul jeu, mais pas le même énoncé.
    expect(words.size).toBeGreaterThan(2);
  });
});

describe('l’âge et le corps', () => {
  it('referme les métiers à des rythmes différents', () => {
    const state = adult(211, 20);
    if (!state) return;
    const at = (age: number, id: string) => {
      state.player.age = age;
      return ageFactor(state, getDiscipline(id)!);
    };
    // À trente ans, tout le monde est à son sommet.
    expect(at(30, 'sport')).toBeCloseTo(1, 5);
    expect(at(30, 'jeu')).toBeCloseTo(1, 5);
    // À quarante-cinq, le sportif a fini, le comédien non.
    expect(at(45, 'sport')).toBeLessThan(0.4);
    expect(at(45, 'jeu')).toBeCloseTo(1, 5);
    expect(at(45, 'podium')).toBeLessThan(at(45, 'jeu'));
    // Le politique ne décline pas : il gagne en s'installant.
    expect(at(30, 'tribune')).toBeLessThan(at(60, 'tribune'));
    expect(at(70, 'tribune')).toBeCloseTo(1, 5);
  });

  it('fait perdre la main à ceux que l’âge rattrape', () => {
    const state = performer(213, 'sport', 80, 24);
    if (!state) return;
    state.player.age = 44;
    const before = state.player.stage!.craft;
    advanceStage(createCtx(state));
    expect(state.player.stage!.craft).toBeLessThan(before);
  });
});

describe('l’agent', () => {
  it('ne prend personne d’inconnu', () => {
    const state = performer(215, 'jeu', 10);
    if (!state) return;
    expect(hireAgent(createCtx(state)).ok).toBe(false);
    expect(agentOf(state)).toBeNull();
    expect(agentCut(state)).toBe(0);
  });

  it('apporte plus, paie mieux, et prend sa part', () => {
    const alone = performer(217, 'musique', 60);
    const backed = performer(217, 'musique', 60);
    if (!alone || !backed) return;
    expect(hireAgent(createCtx(backed)).ok).toBe(true);
    expect(agentOf(backed)).not.toBeNull();
    expect(agentCut(backed)).toBeGreaterThan(0);

    const template = templatesFor('musique')[3];
    expect(jobFee(backed, template)).toBeGreaterThan(jobFee(alone, template));

    rollOffers(createCtx(alone));
    rollOffers(createCtx(backed));
    expect(backed.player.stage!.offers.length)
      .toBeGreaterThanOrEqual(alone.player.stage!.offers.length);

    // Et il se paie : ce qui compte pour l'impôt est net de sa commission.
    backed.player.stage!.earnedThisYear = 100_000;
    alone.player.stage!.earnedThisYear = 100_000;
    expect(stageEarnings(backed)).toBeLessThan(stageEarnings(alone));

    const before = backed.player.money;
    advanceStage(createCtx(backed));
    expect(backed.player.money).toBeLessThan(before);
  });

  it('laisse partir, et le carnet part avec lui', () => {
    const state = performer(219, 'podium', 60, 22);
    if (!state) return;
    if (!hireAgent(createCtx(state)).ok) return;
    expect(dismissAgent(createCtx(state)).ok).toBe(true);
    expect(agentOf(state)).toBeNull();
    expect(dismissAgent(createCtx(state)).ok).toBe(false);
  });
});

describe('les distinctions', () => {
  it('ne se donnent qu’à ceux qui ont fait ce qu’il faut', () => {
    const state = performer(221, 'jeu', 20);
    if (!state) return;
    const stage = state.player.stage!;
    expect(pendingAccolades(state).length).toBeGreaterThan(0);
    advanceStage(createCtx(state));
    expect(stage.accolades).toHaveLength(0);

    // On remplit exactement ce que demande le premier prix.
    // Avec de la marge : le bilan fait perdre la main avant de récompenser,
    // et un prix ne se décerne pas à quelqu'un qui vient de reculer sous la
    // barre.
    const target = ACCOLADES.find((a) => a.discipline === 'jeu')!;
    stage.craft = Math.max(stage.craft, (target.needs.craft ?? 0) + 12);
    stage.bestReception = Math.max(stage.bestReception, target.needs.bestReception ?? 0);
    stage.done = Math.max(stage.done, target.needs.jobs ?? 0);
    state.player.fame.level = Math.max(state.player.fame.level, target.needs.fame ?? 0);
    advanceStage(createCtx(state));
    expect(stage.accolades).toContain(target.id);
    // Et jamais deux fois.
    advanceStage(createCtx(state));
    expect(stage.accolades.filter((id) => id === target.id)).toHaveLength(1);
    expect(pendingAccolades(state).some((a) => a.id === target.id)).toBe(false);
  });
});

describe('l’année et l’argent', () => {
  it('punit l’engagement pris et jamais tenu', () => {
    const state = performer(223, 'jeu', 50);
    if (!state) return;
    if (!signAnything(state)) return;
    const stage = state.player.stage!;
    const craft = stage.craft;
    const controversy = state.player.fame.controversy;
    advanceStage(createCtx(state));
    expect(stage.current).toBeNull();
    expect(stage.craft).toBeLessThan(craft);
    expect(state.player.fame.controversy).toBeGreaterThan(controversy);
  });

  it('fait perdre la main à qui ne travaille pas', () => {
    const state = performer(225, 'musique', 60);
    if (!state) return;
    const stage = state.player.stage!;
    stage.current = null;
    stage.offers = [];
    const before = stage.craft;
    advanceStage(createCtx(state));
    expect(stage.craft).toBeLessThan(before);
  });

  it('n’encaisse pas le cachet deux fois', () => {
    const state = performer(227, 'jeu', 50);
    if (!state) return;
    if (!signAnything(state)) return;
    const before = state.player.money;
    settleJob(createCtx(state), played(0.8));
    const afterJob = state.player.money;
    const paid = afterJob - before;
    expect(paid).toBeGreaterThan(0);
    // Le cachet est déjà sur le compte. Il entre dans l'assiette imposable,
    // pas dans l'encaissement : le bilan ne doit pas le recréditer.
    expect(stageEarnings(state)).toBeGreaterThan(0);
    expect(stageEarnings(state)).toBeLessThanOrEqual(paid);
    simulateYear(state);
    expect(state.player.stage?.earnedThisYear ?? 0).toBe(0);
  });

  it('suspend tout en détention', () => {
    const state = performer(229, 'sport', 60);
    if (!state) return;
    const stage = state.player.stage!;
    stage.current = null;
    state.player.prison = {
      yearsLeft: 3, totalSentence: 5, security: 'medium', behavior: 50,
      respect: 40, paroleDenials: 0, facilityName: 'Maison d’arrêt',
      escapePlan: 0, suspicion: 0, prepared: [],
    };
    const before = stage.craft;
    advanceStage(createCtx(state));
    expect(stage.craft).toBeLessThan(before);
    expect(stage.offers).toHaveLength(0);
  });

  it('survit à une année complète et à la sauvegarde', () => {
    const state = performer(231, 'musique', 50, 26);
    if (!state) return;
    signAnything(state);
    simulateYear(state);
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    expect(copy.player.stage).not.toBeNull();
    expect(copy.player.stage!.disciplineId).toBe('musique');
    // Les propositions persistent : elles sont sur la table d'une année à
    // l'autre, pas recalculées à l'affichage.
    expect(Array.isArray(copy.player.stage!.offers)).toBe(true);
    advanceStage(createCtx(copy));
    expect(copy.player.stage).not.toBeNull();
  });

  it('n’existe pas pour qui ne s’est jamais lancé', () => {
    const state = adult(233);
    if (!state) return;
    expect(state.player.stage).toBeNull();
    expect(stageOf(state)).toBeNull();
    expect(stageEarnings(state)).toBe(0);
    expect(offerBlocker(state)).not.toBeNull();
    // Et une année passe sans que rien ne s'y accroche.
    const before = state.player.money;
    advanceStage(createCtx(state));
    expect(state.player.money).toBe(before);
  });
});
