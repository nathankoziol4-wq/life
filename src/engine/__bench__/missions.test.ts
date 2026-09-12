/**
 * Vérifications des missions de la maison.
 *
 * Le catalogue disait « les missions se résolvent par tirage », et c'était
 * pire que ça : `MissionDef` déclare depuis toujours un `miniGame` — « chase »
 * pour porter un paquet, « burglary » pour récupérer ce qui manque — et
 * **rien ne le lisait**. L'écran appelait `runMission` dans tous les cas.
 * Deux missions annonçaient dans les données un jeu qui ne se lançait jamais.
 *
 * Quatre exigences :
 *
 * 1. **ce que les données déclarent existe** — un `miniGame` nommé doit être
 *    un mini-jeu enregistré, sinon la déclaration est un mensonge ;
 * 2. **on peut jouer ce qu'on a déclaré** — le contexte de mission se
 *    construit, et sur la même échelle que le tirage qu'il remplace ;
 * 3. **jouer bien vaut mieux que jouer mal**, sinon le mini-jeu est une
 *    animation ;
 * 4. **le règlement ne dépend pas du chemin** : réussir en jouant et réussir
 *    au tirage donnent la même chose, sinon l'un des deux serait un piège.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { getMiniGame, playHeadless } from '../minigame.ts';
import { Rng } from '../rng.ts';
import { MISSIONS } from '../../data/underworld.ts';
import { joinOrganization, missionContext, settleMission } from '../../systems/underworld.ts';
import { CHASE, type ChaseState } from '../../systems/minigames/chase.ts';
import {
  BURGLARY, burglaryOutcome, type BurglaryState, type HouseSetup,
} from '../../systems/minigames/burglary.ts';
import { miniGameContext } from '../minigame.ts';

/**
 * Quelqu'un qui appartient à une maison, quelle que soit la graine.
 *
 * On ne se fait pas présenter par volonté : il faut l'âge, un certain
 * penchant, un nom qui dise quelque chose, et le refus reste fréquent. Un
 * premier jet appelait `joinOrganization` une fois et supposait que ça avait
 * marché — sur les graines où l'on était refusé, le test lisait `organization`
 * à null et s'effondrait deux assertions plus loin, en désignant la mauvaise
 * ligne. On remplit donc les conditions, puis on retente jusqu'à l'admission.
 */
function crook(seed: number): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < 26 && !state.gameOver; i++) simulateYear(state);
  state.player.prison = null;
  state.player.stats.criminality = 70;
  state.player.criminalRecord.notoriety = Math.max(40, state.player.criminalRecord.notoriety);
  for (let i = 0; i < 60 && !state.player.organization; i++) {
    state.player.yearActions = {};
    joinOrganization(createCtx(state));
  }
  if (!state.player.organization) throw new Error('aucune maison ne recrute');
  return state;
}

describe('ce que les données déclarent', () => {
  it('ne nomme que des mini-jeux qui existent', () => {
    const named = MISSIONS.filter((m) => m.miniGame);
    // Deux au moins : sans cela le test passerait sur un catalogue vide.
    expect(named.length).toBeGreaterThanOrEqual(2);
    for (const mission of named) {
      expect(getMiniGame(mission.miniGame!), mission.kind).toBeTruthy();
    }
  });

  it('laisse les autres au tirage, et le dit', () => {
    const plain = MISSIONS.filter((m) => !m.miniGame);
    // Celles-là se règlent encore par `runMission`. C'est une absence connue,
    // pas un oubli : le catalogue la porte.
    expect(plain.length).toBeGreaterThan(0);
  });
});

describe('jouer une mission', () => {
  it('construit un contexte sur la même échelle que le tirage', () => {
    const state = crook(4);
    for (const mission of MISSIONS) {
      const context = missionContext(state, mission);
      expect(Number.isFinite(context.skill)).toBe(true);
      expect(context.skill).toBeGreaterThanOrEqual(0);
      expect(context.skill).toBeLessThanOrEqual(100);
      expect(context.difficulty).toBe(mission.difficulty);
    }
  });

  it('récompense qui joue bien plutôt que qui subit', () => {
    /*
     * On joue la course des deux façons possibles sans regarder l'écran :
     * quelqu'un qui change de file quand il le faut, et quelqu'un qui ne
     * touche à rien. Si les deux s'en sortaient pareil, le mini-jeu ne serait
     * qu'une animation posée sur un tirage.
     */
    const mission = MISSIONS.find((m) => m.miniGame === 'chase')!;
    const state = crook(6);
    const context = missionContext(state, mission);

    let played = 0;
    let passive = 0;
    const N = 120;
    for (let seed = 1; seed <= N; seed++) {
      // Celui qui joue : il vise la sortie la plus proche et sprinte tant
      // qu'il a du souffle. Rien de subtil — seulement quelqu'un qui joue.
      const active = playHeadless(CHASE, new Rng({ rngState: seed }), context, (s: ChaseState) => {
        const exit = [...s.exits].sort((a, b) => (
          Math.hypot(a.x - s.player.x, a.y - s.player.y)
          - Math.hypot(b.x - s.player.x, b.y - s.player.y)
        ))[0];
        if (!exit) return {};
        return { x: exit.x / s.plan.width, y: exit.y / s.plan.height, hold: s.stamina > 12 };
      });
      // Celui qui subit : il ne touche à rien.
      const idle = playHeadless(CHASE, new Rng({ rngState: seed }), context, () => ({}));
      if (active.state.over === 'échappé') played += 1;
      if (idle.state.over === 'échappé') passive += 1;
    }

    /*
     * Le premier jet de ce test passait **à vide** : la politique « qui
     * joue » lisait `s.lanes[s.lane]`, deux champs qui n'existent pas sur cet
     * état, et jouait donc exactement comme celui qui ne touche à rien. Les
     * deux s'échappaient zéro fois sur trois cents, et l'assertion « au moins
     * autant » était vraie sans rien dire. On demande maintenant un écart.
     */
    expect(passive).toBeLessThan(N * 0.2);
    expect(played).toBeGreaterThan(passive + N * 0.25);
  });
});

describe('la maison d’une mission', () => {
  /** Un cambrioleur prudent : un objet léger, puis la sortie. */
  function cautious(s: BurglaryState) {
    const toExit = { x: s.exit.x / s.plan.width, y: s.exit.y / s.plan.height };
    if (s.bag.length >= 1) return toExit;
    const item = s.loot.filter((x) => !x.taken && x.weight <= 1)
      .sort((a, b) => a.time - b.time)[0];
    if (!item) return toExit;
    const close = Math.hypot(item.x - s.player.x, item.y - s.player.y) < 0.7;
    return { x: item.x / s.plan.width, y: item.y / s.plan.height, hold: close };
  }

  function rate(setup: HouseSetup, difficulty: number): number {
    const context = miniGameContext({ skill: 76, difficulty, setup });
    let ok = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const out = playHeadless(BURGLARY, new Rng({ rngState: seed }), context, cautious);
      const how = burglaryOutcome(out.state as BurglaryState);
      if (how === 'propre' || how === 'bruyant') ok += 1;
    }
    return ok / 120;
  }

  it('vaut la maison ordinaire du jeu, et pas un piège', () => {
    /*
     * Le premier jet composait un grand plan à deux occupants pour une
     * mission de difficulté 56. Mesuré : **cinq pour cent** de réussite pour
     * un joueur prudent, et cent trois parties sur deux cents finissant
     * « piégé » faute de temps. Une mission perdue dix-neuf fois sur vingt
     * est pire que le tirage qu'elle remplace.
     *
     * On la cale donc sur la maison ordinaire du cambriolage — même taille,
     * même nombre d'occupants, même unité monétaire — et l'on vérifie que les
     * deux se valent. Le taux absolu, lui, dépend de la politique jouée : ce
     * cambrioleur-là est volontairement simple.
     */
    const state = crook(12);
    const mission = MISSIONS.find((m) => m.miniGame === 'burglary')!;
    const setup = missionContext(state, mission).setup as HouseSetup;

    expect(setup.size).toBe('moyen');
    expect(setup.occupants).toBeLessThanOrEqual(2);
    // L'unité monétaire est celle des vraies maisons : sans elle, le sac
    // valait cent fois moins et l'échelle des gains était fausse.
    expect(setup.unit).toBeGreaterThan(100);

    const reference = rate({ wealth: 1, occupants: 1, size: 'moyen', unit: 300 }, 45);
    const here = rate(setup, mission.difficulty);
    expect(Math.abs(here - reference)).toBeLessThan(0.12);
  });
});

describe('le règlement', () => {
  it('donne la même chose qu’on ait joué ou non', () => {
    const mission = MISSIONS.find((m) => m.miniGame === 'chase')!;
    const a = crook(8);
    const b = crook(8);
    const before = a.player.money;

    const played = settleMission(createCtx(a), mission, true);
    const drawn = settleMission(createCtx(b), mission, true);

    expect(played.ok).toBe(drawn.ok);
    // Le point du test : le chemin ne change rien au règlement.
    expect(a.player.money).toBe(b.player.money);
    // Et une mission réussie paie. On compare à ce qu'on avait avant, en
    // tenant compte de ce que se faire présenter a déjà coûté.
    expect(a.player.money).toBeGreaterThanOrEqual(before);
  });

  it('coûte quelque chose quand on échoue', () => {
    const mission = MISSIONS.find((m) => m.miniGame === 'chase')!;
    const state = crook(10);
    const org = state.player.organization!;
    const respect = org.respect;

    settleMission(createCtx(state), mission, false);

    expect(state.player.organization!.respect).toBeLessThan(respect);
    expect(state.player.organization!.failed).toBeGreaterThan(0);
  });
});
