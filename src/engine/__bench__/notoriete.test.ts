/**
 * Vérifications de la notoriété publique.
 *
 * L'audit relevait : « seuls des `followers` existent ; ni célébrité, ni
 * controverse, ni public ». Le compteur d'abonnés confondait trois choses.
 * Les tests portent donc d'abord sur leur séparation, puis sur ce qui fait de
 * la notoriété un système plutôt qu'une jauge :
 *
 * 1. **trois axes distincts** — être connu, être reproché, être estimé, et la
 *    réputation qui reste encore autre chose ;
 * 2. **ça retombe** — la notoriété décroît d'autant plus vite qu'elle est
 *    haute, ce qui fait de son entretien un travail ;
 * 3. **ça coûte** — un visage connu se fait reconnaître, y compris par ceux
 *    qui enquêtent ;
 * 4. **l'entretien est une scène** — trois questions, aucune bonne réponse,
 *    et des axes qui bougent en sens contraires ;
 * 5. **les affaires n'ont pas de réponse universelle** — chacune des quatre
 *    est la meilleure dans un cas et la pire dans un autre.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  INTERVIEW_BEATS, PUBLIC_GIGS, PUBLIC_JOBS, SCANDAL_KINDS, getFameField,
} from '../../data/fame.ts';
import { JOBS } from '../../data/jobs.ts';
import {
  advanceFame, answerInterview, doGig, endInterview, fameDecay, fameSources,
  gigBlocker, gigFee, openScandal, recognitionFactor, respondToScandal, startInterview,
} from '../../systems/fame.ts';
import { getPsycheContext } from '../../systems/contexts.ts';
import { invalidateContexts } from '../../systems/contexts.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un adulte vivant et libre. */
function adult(seed: number, age = 30): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.yearActions = {};
  return state;
}

/** Quelqu'un de connu, à un niveau donné. */
function famous(seed: number, level: number, field = 'écran'): GameState | null {
  const state = adult(seed);
  if (!state) return null;
  state.player.fame.level = level;
  state.player.fame.peak = level;
  state.player.fame.field = field;
  return state;
}

describe('la notoriété n’est pas la réputation', () => {
  it('sépare être connu, être reproché et être estimé', () => {
    const state = famous(3, 70);
    if (!state) return;
    const f = state.player.fame;
    f.controversy = 85;
    f.goodwill = 10;
    state.player.stats.reputation = 90;
    // Les quatre nombres coexistent : très connu, très reproché, peu aimé du
    // public, et pourtant bien vu de ceux qui le côtoient. C'est exactement
    // le cas que le compteur d'abonnés rendait impossible à décrire.
    expect(f.level).toBe(70);
    expect(f.controversy).toBe(85);
    expect(f.goodwill).toBe(10);
    expect(state.player.stats.reputation).toBe(90);
  });

  it('fait peser la controverse sur la reconnaissance ressentie', () => {
    // La valeur « reconnaissance » de la psyché lisait un compteur d'abonnés.
    // Elle doit maintenant lire la notoriété, et en retrancher ce qu'on
    // reproche — sans quoi un scandale serait un accomplissement.
    const clean = famous(5, 70);
    if (!clean) return;
    clean.player.fame.controversy = 0;
    invalidateContexts(clean);
    const calm = getPsycheContext(clean);
    clean.player.fame.controversy = 90;
    invalidateContexts(clean);
    const stormy = getPsycheContext(clean);
    expect(calm).not.toBe(stormy); // le contexte a bien été recalculé
  });
});

describe('la notoriété retombe si on ne l’entretient pas', () => {
  it('décroît d’autant plus vite qu’elle est haute', () => {
    const state = famous(7, 20);
    if (!state) return;
    const low = fameDecay(state);
    state.player.fame.level = 90;
    expect(fameDecay(state)).toBeGreaterThan(low * 1.8);
  });

  it('efface un nom que plus rien n’alimente', () => {
    const state = famous(11, 75);
    if (!state) return;
    state.player.job = null;
    state.player.followers = 0;
    state.player.business = null;
    state.player.freelance = null;
    const ctx = createCtx(state);
    for (let year = 0; year < 25; year++) advanceFame(ctx);
    expect(state.player.fame.level).toBeLessThan(8);
    // Mais le sommet reste : c'est ce qu'on a été, et une vie s'en souvient.
    expect(state.player.fame.peak).toBeGreaterThanOrEqual(75);
  });

  it('nomme ce qui fait connaître, et pas seulement combien', () => {
    const state = adult(13);
    if (!state) return;
    state.player.followers = 400_000;
    const lines = fameSources(state);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].amount).toBeGreaterThan(1);
    // Chaque ligne doit désigner un domaine qui existe.
    for (const line of lines) {
      expect(getFameField(line.field).id, line.label).not.toBe('aucun');
    }
  });

  it('rend connu par le métier, et pas également par tous', () => {
    const state = adult(17);
    if (!state) return;
    const withJob = (jobId: string) => {
      state.player.job = {
        jobId, title: 'x', level: 2, salary: 40000, employer: 'x', performance: 70,
        yearsAtJob: 3, effort: 'normal', lastRaiseAskYear: 0, partTime: false, hours: 40,
        satisfaction: 50, team: [], warnings: 0, leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
      };
      return fameSources(state).reduce((s, l) => s + l.amount, 0);
    };
    state.player.followers = 0;
    // Un journaliste et non un comédien : comédien n'est plus un poste de la
    // grille mais une carrière jouée, et sa visibilité vit dans `stage.ts`.
    const journalist = withJob('journalist');
    const accountant = withJob('accountant');
    expect(journalist).toBeGreaterThan(accountant + 3);
    expect(accountant).toBeLessThan(1);
  });
});

describe('être connu coûte quelque chose', () => {
  it('fait reconnaître un visage connu quand il commet un délit', () => {
    const unknown = famous(19, 0);
    const known = famous(19, 95);
    if (!unknown || !known) return;
    expect(recognitionFactor(known)).toBeGreaterThan(recognitionFactor(unknown) * 1.5);
  });

  it('use les nerfs à mesure qu’on monte', () => {
    const strain = (level: number) => {
      const state = famous(23, level);
      if (!state) return null;
      state.player.stats.stress = 20;
      state.player.followers = 0;
      state.player.job = null;
      advanceFame(createCtx(state));
      return state.player.stats.stress;
    };
    const quiet = strain(10);
    const loud = strain(90);
    if (quiet === null || loud === null) return;
    expect(loud).toBeGreaterThan(quiet);
  });

  it('ferme les portes quand on est trop reproché', () => {
    const state = famous(29, 60);
    if (!state) return;
    const ad = PUBLIC_GIGS.find((g) => g.id === 'ad')!;
    state.player.fame.controversy = 10;
    expect(gigBlocker(state, ad)).toBeNull();
    state.player.fame.controversy = 90;
    expect(gigBlocker(state, ad)).toMatch(/associer/);
  });
});

describe('les apparitions', () => {
  it('paient d’autant plus qu’on est connu, et pas linéairement', () => {
    const feeAt = (level: number) => {
      const state = famous(31, level);
      if (!state) return 0;
      state.player.fame.goodwill = 60;
      state.player.fame.controversy = 10;
      return gigFee(state, PUBLIC_GIGS.find((g) => g.id === 'ad')!);
    };
    const small = feeAt(30);
    const big = feeAt(60);
    expect(small).toBeGreaterThan(0);
    // Deux fois plus connu vaut nettement plus du double.
    expect(big).toBeGreaterThan(small * 3);
  });

  it('paie moins ce qu’on reproche', () => {
    const clean = famous(37, 60);
    const dirty = famous(37, 60);
    if (!clean || !dirty) return;
    clean.player.fame.controversy = 0;
    dirty.player.fame.controversy = 65;
    const gig = PUBLIC_GIGS.find((g) => g.id === 'gala')!;
    expect(gigFee(dirty)).toBeLessThan(gigFee(clean));
    function gigFee(state: GameState) {
      return Math.round(
        (state.player.fame.level / 100) ** 2 * 420_000
        * Math.max(0.15, 0.55 + (state.player.fame.goodwill / 100) * 0.9
          - Math.min(0.55, state.player.fame.controversy / 130)) * gig.pay,
      );
    }
  });

  it('fait monter le nom, moins vite quand il est déjà haut', () => {
    const gain = (level: number) => {
      const state = famous(41, level);
      if (!state) return null;
      state.player.yearActions = {};
      doGig(createCtx(state), 'show');
      return state.player.fame.level - level;
    };
    const early = gain(36);
    const late = gain(88);
    if (early === null || late === null) return;
    expect(early).toBeGreaterThan(late);
  });

  it('dérape parfois, et d’autant plus que l’exercice est risqué', () => {
    const slips = (gigId: string) => {
      let bad = 0;
      for (let seed = 0; seed < 30; seed++) {
        const state = famous(seed * 7 + 5, 60);
        if (!state) continue;
        state.player.stats.stress = 85;
        state.player.stats.looks = 25;
        state.player.stats.reputation = 25;
        const before = state.player.fame.controversy;
        doGig(createCtx(state), gigId);
        if (state.player.fame.controversy > before) bad += 1;
      }
      return bad;
    };
    // La télé-réalité est bien plus exposée qu'une séance photo.
    expect(slips('reality')).toBeGreaterThan(slips('shoot'));
  });
});

describe('l’entretien est une scène', () => {
  it('pose des questions et attend des réponses', () => {
    const state = famous(43, 50);
    if (!state) return;
    const ctx = createCtx(state);
    expect(startInterview(ctx).ok).toBe(true);
    const interview = state.player.fame.interview!;
    expect(interview.beats.length).toBe(3);
    expect(interview.answers).toEqual([-1, -1, -1]);
    for (let i = 0; i < 3; i++) expect(answerInterview(ctx, i, 0).ok).toBe(true);
    expect(state.player.fame.interview).toBeNull();
  });

  it('ne pose que des questions qui concernent la personne', () => {
    const state = famous(47, 10, 'faits');
    if (!state) return;
    startInterview(createCtx(state));
    const interview = state.player.fame.interview;
    if (!interview) return; // pas assez de questions : c'est un résultat valide
    for (const id of interview.beats) {
      const beat = INTERVIEW_BEATS.find((b) => b.id === id)!;
      if (beat.minFame !== undefined) expect(beat.minFame).toBeLessThanOrEqual(10);
      if (beat.fields) expect(beat.fields).toContain('faits');
    }
  });

  it('n’a pas de bonne réponse : les axes bougent en sens contraires', () => {
    // C'est la propriété qui distingue une scène d'un tirage. Si une réponse
    // dominait toutes les autres sur les trois axes, il n'y aurait pas de
    // décision à prendre.
    for (const beat of INTERVIEW_BEATS) {
      const dominated = beat.answers.some((a) => beat.answers.some((b) => (
        b !== a && b.fame >= a.fame && b.controversy <= a.controversy
        && b.goodwill >= a.goodwill
        && (b.fame > a.fame || b.controversy < a.controversy || b.goodwill > a.goodwill)
      )));
      // Au moins deux réponses doivent rester sur le front de Pareto.
      const survivors = beat.answers.filter((a) => !beat.answers.some((b) => (
        b !== a && b.fame >= a.fame && b.controversy <= a.controversy
        && b.goodwill >= a.goodwill
        && (b.fame > a.fame || b.controversy < a.controversy || b.goodwill > a.goodwill)
      )));
      expect(survivors.length, `${beat.id} (dominée : ${dominated})`).toBeGreaterThan(1);
    }
  });

  it('fait payer le fait de partir au milieu', () => {
    const state = famous(53, 50);
    if (!state) return;
    const ctx = createCtx(state);
    startInterview(ctx);
    answerInterview(ctx, 0, 0);
    const before = state.player.fame.controversy;
    endInterview(ctx);
    expect(state.player.fame.controversy).toBeGreaterThan(before);
    expect(state.player.fame.interview).toBeNull();
  });

  it('ferme un entretien laissé en plan à la fin de l’année', () => {
    const state = famous(59, 50);
    if (!state) return;
    startInterview(createCtx(state));
    expect(state.player.fame.interview).not.toBeNull();
    advanceFame(createCtx(state));
    expect(state.player.fame.interview).toBeNull();
  });
});

describe('les affaires', () => {
  it('finissent par arriver à ceux qui sont très exposés', () => {
    let hit = 0;
    for (let seed = 0; seed < 25; seed++) {
      const state = famous(seed * 11 + 3, 90, 'réseaux');
      if (!state) continue;
      state.player.fame.controversy = 55;
      state.player.stats.karma = 25;
      const ctx = createCtx(state);
      for (let year = 0; year < 5 && !openScandal(state); year++) {
        state.player.fame.level = 90;
        advanceFame(ctx);
      }
      if (state.player.fame.scandals.length > 0) hit += 1;
    }
    expect(hit).toBeGreaterThan(15);
  });

  it('épargne les anonymes', () => {
    let hit = 0;
    for (let seed = 0; seed < 25; seed++) {
      const state = famous(seed * 13 + 7, 3);
      if (!state) continue;
      // On coupe tout ce qui rendrait connu : le test porte sur l'anonymat,
      // pas sur la probabilité que la vie tirée ait un métier discret.
      state.player.job = null;
      state.player.followers = 0;
      state.player.business = null;
      state.player.freelance = null;
      state.player.criminalRecord.convictions = [];
      state.player.criminalRecord.notoriety = 0;
      state.player.criminalRecord.wanted = false;
      const ctx = createCtx(state);
      for (let year = 0; year < 6; year++) advanceFame(ctx);
      if (state.player.fame.scandals.length > 0) hit += 1;
    }
    expect(hit).toBe(0);
  });

  it('n’a pas de réponse universelle : chacune gagne dans un cas', () => {
    // Si une réponse dominait les autres, le choix serait décoratif. On
    // compare deux personnages opposés sur ce qui décide de la crédibilité.
    const outcome = (response: 'nier' | 'excuse', honest: boolean) => {
      let total = 0;
      let n = 0;
      for (let seed = 0; seed < 50; seed++) {
        const state = famous(seed * 17 + 9, 60);
        if (!state) continue;
        state.player.stats.karma = honest ? 92 : 8;
        state.player.stats.reputation = honest ? 90 : 12;
        state.player.fame.controversy = 50;
        state.player.fame.scandals = [{
          id: 'x', kindId: 'argent', year: state.year, weight: 40, answered: null,
        }];
        respondToScandal(createCtx(state), response);
        total += state.player.fame.controversy;
        n += 1;
      }
      return n > 0 ? total / n : 0;
    };
    // Quelqu'un d'irréprochable a intérêt à démentir ; quelqu'un qui ne l'est
    // pas ferait mieux de s'excuser. Les deux ordres doivent s'inverser.
    expect(outcome('nier', true)).toBeLessThan(outcome('excuse', true));
    expect(outcome('nier', false)).toBeGreaterThan(outcome('excuse', false));
  });

  it('répond par le silence quand on n’a pas répondu', () => {
    const state = famous(61, 70);
    if (!state) return;
    state.player.fame.scandals = [{
      id: 'x', kindId: 'dispute', year: state.year - 2, weight: 40, answered: null,
    }];
    advanceFame(createCtx(state));
    expect(state.player.fame.scandals[0].answered).toBe('silence');
  });
});

describe('le catalogue tient debout', () => {
  it('ne nomme que des métiers et des domaines qui existent', () => {
    const jobs = new Set(JOBS.map((j) => j.id));
    for (const [jobId, def] of Object.entries(PUBLIC_JOBS)) {
      expect(jobs, jobId).toContain(jobId);
      expect(getFameField(def.field).id, jobId).toBe(def.field);
    }
    for (const kind of SCANDAL_KINDS) {
      for (const field of kind.fields ?? []) {
        expect(getFameField(field).id, kind.id).toBe(field);
      }
    }
    for (const beat of INTERVIEW_BEATS) {
      for (const field of beat.fields ?? []) {
        expect(getFameField(field).id, beat.id).toBe(field);
      }
    }
  });

  it('échelonne les apparitions au lieu de tout ouvrir d’un coup', () => {
    const thresholds = PUBLIC_GIGS.map((g) => g.minFame);
    expect(Math.min(...thresholds)).toBeLessThan(20);
    expect(Math.max(...thresholds)).toBeGreaterThan(40);
    expect(new Set(thresholds).size).toBeGreaterThan(4);
  });
});
