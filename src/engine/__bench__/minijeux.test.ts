/**
 * Vérifications des mini-jeux.
 *
 * Un mini-jeu doit satisfaire quatre exigences, et elles se contredisent
 * partiellement — c'est ce qui rend l'exercice intéressant :
 *
 * 1. **la performance du joueur compte** : mieux jouer donne un meilleur
 *    résultat, sinon ce n'est qu'un tirage déguisé derrière une animation ;
 * 2. **le personnage compte aussi** : un débutant qui joue bien ne doit pas
 *    valoir un expert ;
 * 3. **on peut ne pas jouer** : la résolution automatique doit rester
 *    plausible et passer par la même conclusion ;
 * 4. **rien n'est décidé par `Math.random()`** : à graine égale et à
 *    politique égale, deux parties sont identiques.
 */

import { describe, expect, it } from 'vitest';
import { Rng } from '../rng.ts';
import {
  allMiniGames, autoResolve, blend, getMiniGame, miniGameContext, playHeadless,
} from '../minigame.ts';
import type { MiniGameInput } from '../minigame.ts';
import {
  PICKPOCKET, TARGET_PROFILES, pickpocketOutcome, targetDifficulty,
  type PickpocketState,
} from '../../systems/minigames/pickpocket.ts';
import {
  BURGLARY, bagValue, type BurglaryState, type HouseSetup,
} from '../../systems/minigames/burglary.ts';
import { CHASE, type ChaseSetup, type ChaseState } from '../../systems/minigames/chase.ts';
import {
  ESCAPE, escapeOutcome, type EscapeSetup, type EscapeState,
} from '../../systems/minigames/escape.ts';
import { at, flowField, solid } from '../../systems/minigames/grid.ts';
// Importé pour son effet de bord : sans cela, le mini-jeu de scène n'est pas
// inscrit au registre et l'audit ne peut pas le voir.
import '../../systems/minigames/performance.ts';
import '../../systems/minigames/docking.ts';
import '../../systems/minigames/attic.ts';
import '../../systems/minigames/walkabout.ts';
import '../../systems/minigames/infiltration.ts';
import '../../systems/minigames/exam.ts';
import { auditInteractiveGameplay } from '../../systems/interactiveAudit.ts';

const rng = (seed: number) => new Rng({ rngState: seed >>> 0 });

const context = (skill: number, profileId = 'touriste') => {
  const profile = TARGET_PROFILES.find((p) => p.id === profileId)!;
  return miniGameContext({
    skill,
    difficulty: targetDifficulty(profile),
    setup: { profile, unit: 200 },
  });
};

/**
 * Un joueur appliqué : il approche doucement de la poche la plus accessible,
 * tire, et s'arrête dès que la méfiance monte.
 */
function carefulPlayer(s: PickpocketState): MiniGameInput {
  const target = s.pockets.filter((p) => !p.taken).sort((a, b) => a.depth - b.depth)[0];
  if (!target) return { quit: true };
  const wantX = target.x + (s.targetX - 0.5);
  const wantY = target.y;
  // On se déplace par petits pas : un geste brusque se remarque.
  const step = 0.02;
  const nx = s.handX + Math.max(-step, Math.min(step, wantX - s.handX));
  const ny = s.handY + Math.max(-step, Math.min(step, wantY - s.handY));
  const inPlace = Math.hypot(wantX - s.handX, wantY - s.handY) < 0.05;
  // On ne tire jamais pendant qu'elle regarde, ni si la jauge est haute.
  const safe = s.mood !== 'regarde' && s.suspicion < 55;
  return { x: nx, y: ny, hold: inPlace && safe };
}

/** Un joueur brutal : il fonce sur la poche et tire sans regarder. */
function recklessPlayer(s: PickpocketState): MiniGameInput {
  const target = s.pockets.filter((p) => !p.taken)[0];
  if (!target) return { quit: true };
  return { x: target.x + (s.targetX - 0.5), y: target.y, hold: true };
}

/** Un joueur qui ne fait rien. */
const idlePlayer = (): MiniGameInput => ({});

describe('mini-jeux', () => {
  it('inscrit chaque mini-jeu au registre', () => {
    expect(allMiniGames().length).toBeGreaterThan(0);
    for (const game of allMiniGames()) {
      expect(getMiniGame(game.id)).toBe(game);
      expect(game.goal.length).toBeGreaterThan(10);
      expect(game.duration).toBeGreaterThan(0);
    }
  });

  it('reste déterministe à graine et politique égales', () => {
    const a = playHeadless(PICKPOCKET, rng(4242), context(50), carefulPlayer);
    const b = playHeadless(PICKPOCKET, rng(4242), context(50), carefulPlayer);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.result).toEqual(b.result);
  });

  it('récompense le joueur qui joue bien', () => {
    // Même personnage, même cible, même graine : seule la façon de jouer
    // change. Si le résultat ne bouge pas, le mini-jeu est un décor.
    let careful = 0;
    let reckless = 0;
    for (let seed = 0; seed < 30; seed++) {
      const a = playHeadless(PICKPOCKET, rng(seed * 131 + 7), context(45), carefulPlayer);
      const b = playHeadless(PICKPOCKET, rng(seed * 131 + 7), context(45), recklessPlayer);
      careful += a.result.quality;
      reckless += b.result.quality;
    }
    expect(careful / 30).toBeGreaterThan(reckless / 30 + 0.12);
  });

  it('punit celui qui ne fait rien', () => {
    const { result } = playHeadless(PICKPOCKET, rng(99), context(50), idlePlayer);
    expect(result.success).toBe(false);
    // Ne rien faire n'est pas dramatique : on repart bredouille, pas menotté.
    expect(result.mistakes).toBe(0);
  });

  it('rend la partie plus confortable à un personnage expérimenté', () => {
    // La compétence ne joue pas à la place du joueur : elle donne du temps,
    // de la marge et de l'information.
    const novice = context(10);
    const expert = context(90);
    expect(expert.grace.time).toBeGreaterThan(novice.grace.time);
    expect(expert.grace.pressure).toBeLessThan(novice.grace.pressure);
    expect(expert.grace.tolerance).toBeGreaterThan(novice.grace.tolerance);
    expect(expert.grace.insight).toBe(true);
    expect(novice.grace.insight).toBe(false);

    // Et en pratique, à jeu identique, l'expert s'en sort mieux.
    let noviceQuality = 0;
    let expertQuality = 0;
    for (let seed = 0; seed < 30; seed++) {
      noviceQuality += playHeadless(PICKPOCKET, rng(seed * 97 + 3), novice, recklessPlayer).result.quality;
      expertQuality += playHeadless(PICKPOCKET, rng(seed * 97 + 3), expert, recklessPlayer).result.quality;
    }
    expect(expertQuality).toBeGreaterThan(noviceQuality);
  });

  it('ne laisse pas un bon joueur remplacer un personnage nul', () => {
    // C'est la règle du §74 : les deux dimensions comptent. Un débutant qui
    // joue parfaitement ne doit pas dépasser un expert qui joue mal.
    const noviceCtx = context(8);
    const expertCtx = context(92);
    const perfect = { success: true, score: 100, quality: 1, mistakes: 0, time: 0 };
    const poor = { success: false, score: 0, quality: 0.1, mistakes: 5, time: 0 };

    expect(blend(noviceCtx, perfect)).toBeLessThan(blend(expertCtx, poor));
    // Mais bien jouer doit rester payant à personnage égal.
    expect(blend(noviceCtx, perfect)).toBeGreaterThan(blend(noviceCtx, poor));
  });

  it('rend une cible vigilante réellement plus difficile', () => {
    const tourist = TARGET_PROFILES.find((p) => p.id === 'touriste')!;
    const guard = TARGET_PROFILES.find((p) => p.id === 'vigile')!;
    expect(targetDifficulty(guard)).toBeGreaterThan(targetDifficulty(tourist) + 30);

    let easy = 0;
    let hard = 0;
    for (let seed = 0; seed < 30; seed++) {
      easy += playHeadless(PICKPOCKET, rng(seed * 53 + 11), context(50, 'touriste'), carefulPlayer).result.quality;
      hard += playHeadless(PICKPOCKET, rng(seed * 53 + 11), context(50, 'vigile'), carefulPlayer).result.quality;
    }
    expect(easy).toBeGreaterThan(hard);
  });

  it('produit toutes les issues prévues sur un échantillon', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      for (const policy of [carefulPlayer, recklessPlayer, idlePlayer]) {
        const { state } = playHeadless(PICKPOCKET, rng(seed * 29 + 5), context(40), policy);
        seen.add(pickpocketOutcome(state as PickpocketState));
      }
    }
    // Le jeu doit savoir finir bien, mal, et entre les deux.
    expect(seen.size).toBeGreaterThanOrEqual(3);
    expect(seen.has('bredouille')).toBe(true);
  });

  it('borne toujours ses jauges', () => {
    for (let seed = 0; seed < 25; seed++) {
      const { state } = playHeadless(PICKPOCKET, rng(seed * 17 + 1), context(50), recklessPlayer);
      const s = state as PickpocketState;
      expect(s.suspicion).toBeGreaterThanOrEqual(0);
      expect(s.suspicion).toBeLessThanOrEqual(100);
      expect(s.elapsed).toBeLessThanOrEqual(s.limit + 100);
      expect(s.over).not.toBeNull();
    }
  });

  it('permet de ne pas jouer sans être puni', () => {
    // La résolution automatique doit rester corrélée à la compétence et
    // produire des résultats plausibles, jamais systématiquement mauvais.
    let noviceWins = 0;
    let expertWins = 0;
    for (let seed = 0; seed < 60; seed++) {
      if (autoResolve(rng(seed * 7 + 1), context(15)).success) noviceWins += 1;
      if (autoResolve(rng(seed * 7 + 1), context(85)).success) expertWins += 1;
    }
    expect(expertWins).toBeGreaterThan(noviceWins);
    expect(expertWins).toBeGreaterThan(20);
  });
});

/* ------------------------------------------------------------------ */
/* Cambriolage                                                        */
/* ------------------------------------------------------------------ */

const house = (skill: number, over: Partial<HouseSetup> = {}) => miniGameContext({
  skill,
  difficulty: 45,
  setup: { wealth: 1, occupants: 1, size: 'moyen', unit: 300, ...over } satisfies HouseSetup,
});

/** Un cambrioleur avide : il court sur tout ce qui traîne et fouille sans fin. */
function greedyBurglar(s: BurglaryState): MiniGameInput {
  const item = s.loot.filter((x) => !x.taken)
    .sort((a, b) => b.value - a.value)[0];
  if (!item) return { x: s.exit.x / s.plan.width, y: s.exit.y / s.plan.height };
  const close = Math.hypot(item.x - s.player.x, item.y - s.player.y) < 0.7;
  return { x: item.x / s.plan.width, y: item.y / s.plan.height, hold: close };
}

/** Un cambrioleur prudent : un seul objet léger, puis la sortie. */
function cautiousBurglar(s: BurglaryState): MiniGameInput {
  const toExit = { x: s.exit.x / s.plan.width, y: s.exit.y / s.plan.height };
  if (s.bag.length >= 1) return toExit;
  const item = s.loot.filter((x) => !x.taken && x.weight <= 1)
    .sort((a, b) => a.time - b.time)[0];
  if (!item) return toExit;
  const close = Math.hypot(item.x - s.player.x, item.y - s.player.y) < 0.7;
  return { x: item.x / s.plan.width, y: item.y / s.plan.height, hold: close };
}

/** Celui qui repart immédiatement. */
function immediateExit(s: BurglaryState): MiniGameInput {
  return { x: s.exit.x / s.plan.width, y: s.exit.y / s.plan.height };
}

describe('cambriolage', () => {
  it('génère une maison praticable', () => {
    for (let seed = 0; seed < 25; seed++) {
      const state = BURGLARY.setup(rng(seed * 61 + 3), house(50)) as BurglaryState;
      expect(state.loot.length).toBeGreaterThan(1);
      expect(state.plan.width * state.plan.height).toBe(state.plan.cells.length);
      // Le joueur démarre sur une case libre, sinon il ne peut pas bouger.
      expect(solid(state.plan, state.player.x, state.player.y)).toBe(false);
      // Et la sortie est atteignable depuis le départ : elle est juste à côté.
      expect(Math.hypot(state.player.x - state.exit.x, state.player.y - state.exit.y))
        .toBeLessThan(2.5);
    }
  });

  it('laisse repartir les mains vides sans rien risquer', () => {
    const { state, result } = playHeadless(BURGLARY, rng(11), house(50), immediateExit);
    const s = state as BurglaryState;
    expect(s.over).toBe('sorti');
    expect(s.bag).toEqual([]);
    expect(result.success).toBe(false);
    // Repartir tout de suite est sûr : la qualité reste correcte.
    expect(result.quality).toBeGreaterThan(0.3);
  });

  it('fait payer l’avidité', () => {
    // Le prudent prend moins, mais s'en sort plus souvent. C'est tout
    // l'arbitrage du jeu : s'il n'existait pas, autant tout ramasser.
    let greedyCaught = 0;
    let cautiousCaught = 0;
    let greedyLoot = 0;
    let cautiousLoot = 0;

    for (let seed = 0; seed < 40; seed++) {
      const a = playHeadless(BURGLARY, rng(seed * 137 + 9), house(45), greedyBurglar);
      const b = playHeadless(BURGLARY, rng(seed * 137 + 9), house(45), cautiousBurglar);
      if ((a.state as BurglaryState).over === 'vu') greedyCaught += 1;
      if ((b.state as BurglaryState).over === 'vu') cautiousCaught += 1;
      greedyLoot += bagValue(a.state as BurglaryState);
      cautiousLoot += bagValue(b.state as BurglaryState);
    }

    expect(greedyCaught).toBeGreaterThan(cautiousCaught);
    expect(greedyLoot).toBeGreaterThan(cautiousLoot);
  });

  it('limite ce qu’on peut emporter', () => {
    const { state } = playHeadless(BURGLARY, rng(2024), house(50), greedyBurglar);
    const s = state as BurglaryState;
    const weight = s.bag.reduce((sum, item) => sum + item.weight, 0);
    expect(weight).toBeLessThanOrEqual(s.capacity);
  });

  it('rend une maison pleine plus dangereuse qu’une maison vide', () => {
    let emptyCaught = 0;
    let crowdedCaught = 0;
    for (let seed = 0; seed < 30; seed++) {
      const empty = playHeadless(BURGLARY, rng(seed * 71 + 5), house(45, { occupants: 0 }), greedyBurglar);
      const crowded = playHeadless(BURGLARY, rng(seed * 71 + 5), house(45, { occupants: 3 }), greedyBurglar);
      if ((empty.state as BurglaryState).over === 'vu') emptyCaught += 1;
      if ((crowded.state as BurglaryState).over === 'vu') crowdedCaught += 1;
    }
    expect(emptyCaught).toBe(0);
    expect(crowdedCaught).toBeGreaterThan(0);
  });

  it('fait du bruit quand on fouille et le laisse retomber', () => {
    const state = BURGLARY.setup(rng(7), house(50)) as BurglaryState;
    const item = state.loot[0];
    state.player.x = item.x;
    state.player.y = item.y;
    for (let i = 0; i < 10; i++) BURGLARY.step(state, { hold: true }, 100);
    const loud = state.noise;
    expect(loud).toBeGreaterThan(0);
    for (let i = 0; i < 40; i++) BURGLARY.step(state, {}, 100);
    expect(state.noise).toBeLessThan(loud);
  });
});

/* ------------------------------------------------------------------ */
/* Fuite                                                              */
/* ------------------------------------------------------------------ */

const flight = (skill: number, over: Partial<ChaseSetup> = {}) => miniGameContext({
  skill,
  difficulty: 50,
  setup: { place: 'rue', pursuers: 1, speed: 3.5, ...over } satisfies ChaseSetup,
});

/**
 * Un fuyard compétent : il contourne les obstacles au lieu de foncer dedans.
 *
 * Viser la sortie en ligne droite bloquerait la politique contre le premier
 * mur venu, et le test mesurerait alors la maladresse de sa propre politique
 * plutôt que la difficulté du jeu.
 */
function runner(s: ChaseState): MiniGameInput {
  const exit = [...s.exits].sort(
    (a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y)
      - Math.hypot(b.x - s.player.x, b.y - s.player.y),
  )[0];
  const field = flowField(s.plan, exit.x, exit.y);
  const cx = Math.floor(s.player.x);
  const cy = Math.floor(s.player.y);
  let best = field[cy * s.plan.width + cx] ?? -1;
  let goal = { x: exit.x, y: exit.y };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const value = field[(cy + dy) * s.plan.width + (cx + dx)];
    if (value !== undefined && value !== -1 && (best === -1 || value < best)) {
      best = value;
      goal = { x: cx + dx + 0.5, y: cy + dy + 0.5 };
    }
  }
  return { x: goal.x / s.plan.width, y: goal.y / s.plan.height, hold: s.stamina > 12 };
}

/** Un fuyard qui reste sur place. */
const frozen = (): MiniGameInput => ({});

describe('fuite', () => {
  it('se gagne en courant vers une sortie', () => {
    let escaped = 0;
    for (let seed = 0; seed < 30; seed++) {
      const { state } = playHeadless(CHASE, rng(seed * 43 + 7), flight(50), runner);
      if ((state as ChaseState).over === 'échappé') escaped += 1;
    }
    // Elle doit être gagnable sans être acquise : un fuyard compétent s'en
    // sort souvent, jamais toujours.
    expect(escaped).toBeGreaterThan(12);
    expect(escaped).toBeLessThan(30);
  });

  it('se perd en restant sur place', () => {
    let caught = 0;
    for (let seed = 0; seed < 20; seed++) {
      const { state } = playHeadless(CHASE, rng(seed * 29 + 3), flight(50), frozen);
      if ((state as ChaseState).over === 'rattrapé') caught += 1;
    }
    expect(caught).toBeGreaterThan(15);
  });

  it('devient plus difficile avec plus de poursuivants', () => {
    let alone = 0;
    let swarm = 0;
    for (let seed = 0; seed < 30; seed++) {
      if ((playHeadless(CHASE, rng(seed * 91 + 5), flight(50, { pursuers: 1 }), runner)
        .state as ChaseState).over === 'échappé') alone += 1;
      // Même vitesse, mais quatre personnes couvrent les angles : c'est le
      // nombre qu'on mesure, pas un bonus de vitesse déguisé.
      if ((playHeadless(CHASE, rng(seed * 91 + 5), flight(50, { pursuers: 4 }), runner)
        .state as ChaseState).over === 'échappé') swarm += 1;
    }
    expect(alone).toBeGreaterThan(swarm);
  });

  it('récompense la forme physique sans la rendre suffisante', () => {
    const rate = (skill: number) => {
      let escaped = 0;
      for (let seed = 0; seed < 40; seed++) {
        if ((playHeadless(CHASE, rng(seed * 43 + 7), flight(skill, { pursuers: 2 }), runner)
          .state as ChaseState).over === 'échappé') escaped += 1;
      }
      return escaped;
    };
    // À politique de jeu identique, la forme du personnage doit se voir : sans
    // quoi l'allure calculée au départ serait un paramètre décoratif.
    const weak = rate(15);
    const strong = rate(90);
    expect(strong).toBeGreaterThan(weak);
    // Mais elle ne joue pas à la place du joueur : personne n'est condamné,
    // personne n'est assuré de s'en sortir.
    expect(weak).toBeGreaterThan(0);
    expect(strong).toBeLessThan(40);
  });

  it('épuise celui qui court sans jamais souffler', () => {
    const state = CHASE.setup(rng(5), flight(50)) as ChaseState;
    const before = state.stamina;
    for (let i = 0; i < 60 && !state.over; i++) {
      CHASE.step(state, { x: 0.9, y: 0.1, hold: true }, 50);
    }
    expect(state.stamina).toBeLessThan(before);
  });

  it('borne ses jauges et finit toujours', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { state } = playHeadless(CHASE, rng(seed * 13 + 1), flight(40), runner);
      const s = state as ChaseState;
      expect(s.stamina).toBeGreaterThanOrEqual(0);
      expect(s.stamina).toBeLessThanOrEqual(100);
      expect(s.over).not.toBeNull();
    }
  });
});

/* ------------------------------------------------------------------ */
/* Évasion                                                            */
/* ------------------------------------------------------------------ */

const jailbreak = (skill: number, over: Partial<EscapeSetup> = {}) => miniGameContext({
  skill,
  difficulty: 60,
  setup: { security: 'medium', plan: 0, suspicion: 0, ...over } satisfies EscapeSetup,
});

/** Le pas suivant vers la brèche, en contournant les bâtiments. */
function towardsBreach(s: EscapeState): { x: number; y: number } {
  const field = flowField(s.plan, s.breach.x, s.breach.y);
  const cx = Math.floor(s.player.x);
  const cy = Math.floor(s.player.y);
  let best = field[cy * s.plan.width + cx] ?? -1;
  let goal = { x: s.breach.x, y: s.breach.y };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const value = field[(cy + dy) * s.plan.width + (cx + dx)];
    if (value === undefined || value === -1) continue;
    if (best !== -1 && value >= best) continue;
    best = value;
    goal = { x: cx + dx + 0.5, y: cy + dy + 0.5 };
  }
  return { x: goal.x / s.plan.width, y: goal.y / s.plan.height };
}

/** L'abri libre le plus proche, s'il y en a un. */
function nearestCover(s: EscapeState): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;
  for (let y = 1; y < s.plan.height - 1; y++) {
    for (let x = 1; x < s.plan.width - 1; x++) {
      if (at(s.plan, x, y) !== 'C') continue;
      const dist = Math.hypot(x + 0.5 - s.player.x, y + 0.5 - s.player.y);
      if (dist < bestDist) { bestDist = dist; best = { x: x + 0.5, y: y + 0.5 }; }
    }
  }
  return best;
}

/** Un évadé prudent : il se met à l'abri dès que la vigilance monte. */
function patient(s: EscapeState): MiniGameInput {
  if (s.alert > 35 && !s.hidden) {
    const cover = nearestCover(s);
    if (cover) return { x: cover.x / s.plan.width, y: cover.y / s.plan.height };
  }
  if (s.hidden && s.alert > 8) return {};
  return towardsBreach(s);
}

/** Un évadé pressé : tout droit, en courant, quoi qu'il arrive. */
function hasty(s: EscapeState): MiniGameInput {
  return { ...towardsBreach(s), hold: true };
}

/** Un évadé tétanisé : il ne repart jamais vraiment. */
function frozenInCover(s: EscapeState): MiniGameInput {
  if (!s.hidden || s.alert > 1) {
    const cover = nearestCover(s);
    if (cover && Math.hypot(cover.x - s.player.x, cover.y - s.player.y) > 0.4) {
      return { x: cover.x / s.plan.width, y: cover.y / s.plan.height };
    }
    return {};
  }
  return patient(s);
}

function escapes(policy: (s: EscapeState) => MiniGameInput, over: Partial<EscapeSetup> = {}) {
  let out = 0;
  for (let seed = 0; seed < 30; seed++) {
    const { state } = playHeadless(ESCAPE, rng(seed * 53 + 11), jailbreak(50, over), policy);
    if ((state as EscapeState).over === 'sorti') out += 1;
  }
  return out;
}

describe('évasion', () => {
  it('génère une cour praticable', () => {
    for (let seed = 0; seed < 25; seed++) {
      const s = ESCAPE.setup(rng(seed * 29 + 5), jailbreak(50)) as EscapeState;
      expect(solid(s.plan, s.player.x, s.player.y)).toBe(false);
      // La brèche doit être joignable depuis le départ : sinon la partie se
      // termine au chronomètre sans que le joueur puisse rien y faire.
      const field = flowField(s.plan, s.breach.x, s.breach.y);
      const start = Math.floor(s.player.y) * s.plan.width + Math.floor(s.player.x);
      expect(field[start]).toBeGreaterThan(0);
      // Et il doit y avoir de quoi se cacher, sinon ce n'est qu'une course.
      expect(s.plan.cells.filter((c) => c === 'C').length).toBeGreaterThan(2);
      for (const guard of s.guards) {
        expect(solid(s.plan, guard.mover.x, guard.mover.y)).toBe(false);
      }
    }
  });

  it('récompense la préparation sans jamais garantir la sortie', () => {
    const none = escapes(patient, { plan: 0 });
    const some = escapes(patient, { plan: 45 });
    const lots = escapes(patient, { plan: 90 });
    expect(none).toBeLessThan(some);
    expect(some).toBeLessThan(lots);
    // Même très préparée, elle reste une tentative.
    expect(lots).toBeLessThan(30);
    expect(none).toBeGreaterThan(0);
  });

  it('fait payer la précipitation', () => {
    // Courir va plus vite et se voit deux fois plus : c'est l'arbitrage du
    // jeu, et s'il n'existait pas il n'y aurait aucune raison de marcher.
    expect(escapes(patient, { plan: 60 })).toBeGreaterThan(escapes(hasty, { plan: 60 }));
  });

  it('punit aussi celui qui n’ose jamais repartir', () => {
    let roll = 0;
    for (let seed = 0; seed < 30; seed++) {
      const { state } = playHeadless(ESCAPE, rng(seed * 53 + 11), jailbreak(50, { plan: 60 }), frozenInCover);
      if ((state as EscapeState).over === 'appel') roll += 1;
    }
    // Se cacher est la bonne réponse à la vigilance, jamais au chronomètre.
    expect(roll).toBeGreaterThan(15);
  });

  it('rend un régime strict plus difficile', () => {
    const easy = escapes(patient, { security: 'minimum', plan: 60 });
    const hard = escapes(patient, { security: 'maximum', plan: 60 });
    expect(easy).toBeGreaterThan(hard);
  });

  it('fait payer la méfiance de la direction', () => {
    expect(escapes(patient, { plan: 60, suspicion: 90 }))
      .toBeLessThan(escapes(patient, { plan: 60, suspicion: 0 }));
  });

  it('borne ses jauges, finit toujours, et nomme son issue', () => {
    for (let seed = 0; seed < 25; seed++) {
      const { state, result } = playHeadless(ESCAPE, rng(seed * 17 + 3), jailbreak(45), patient);
      const s = state as EscapeState;
      expect(s.alert).toBeGreaterThanOrEqual(0);
      expect(s.alert).toBeLessThanOrEqual(100);
      expect(s.over).not.toBeNull();
      expect(['dehors', 'repéré', 'appel']).toContain(escapeOutcome(s));
      expect(result.success).toBe(s.over === 'sorti');
      expect(result.quality).toBeGreaterThanOrEqual(0);
      expect(result.quality).toBeLessThanOrEqual(1);
    }
  });

  it('cache la jauge à qui n’a ni métier ni plan', () => {
    const novice = ESCAPE.setup(rng(7), jailbreak(20, { plan: 0 })) as EscapeState;
    const prepared = ESCAPE.setup(rng(7), jailbreak(20, { plan: 80 })) as EscapeState;
    expect(novice.insight).toBe(false);
    // Avoir observé les rondes, c'est précisément savoir où l'on en est.
    expect(prepared.insight).toBe(true);
  });
});

describe('audit du gameplay interactif', () => {
  it('ne signale aucune incohérence', () => {
    const { problems } = auditInteractiveGameplay();
    expect(problems).toEqual([]);
  });

  it('rattache chaque action interactive à un mini-jeu réel', () => {
    const { entries } = auditInteractiveGameplay();
    for (const entry of entries.filter((e) => e.level === 'INTERACTIVE')) {
      expect(getMiniGame(entry.miniGame!), entry.action).toBeTruthy();
    }
  });

  it('calcule un score honnête', () => {
    const { score, byLevel, entries } = auditInteractiveGameplay();
    expect(entries.length).toBeGreaterThan(15);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    // Tant qu'il reste des actions passives, le score ne peut pas être plein.
    if (byLevel.PASSIVE > 0) expect(score).toBeLessThan(100);
  });
});
