/**
 * Le cambriolage et la fuite, branchés sur la simulation.
 *
 * Deux idées structurent ce fichier.
 *
 * La première : **un échec n'est pas une fin**. Se faire voir dans une maison
 * ne mène pas directement au poste — il y a une course, et elle se joue. C'est
 * la chaîne demandée au §76 : coup manqué → repéré → fuite → rattrapé ou non
 * → arrestation → procès → casier → emploi perdu → difficultés. Chaque
 * maillon est un vrai système, pas une phrase.
 *
 * La seconde : **la fuite est réutilisable**. Le même mini-jeu sert au vol à
 * la tire, au cambriolage et, plus tard, à l'évasion. On ne le branche pas sur
 * un délit, on le branche sur un moment : « quelqu'un te court après ».
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat } from './stats.ts';
import type { ActionResult, GameState } from '../engine/types.ts';
import type { MiniGameContext, MiniGameResult } from '../engine/minigame.ts';
import { autoResolve, blend, miniGameContext } from '../engine/minigame.ts';
import type { BurglaryOutcome, HouseSetup } from './minigames/burglary.ts';
import type { ChaseSetup } from './minigames/chase.ts';
import { getCountry } from '../data/countries.ts';
import { CRIMES } from '../data/crimes.ts';
import { arrest } from './justice.ts';
import { injure } from './health.ts';

/* ------------------------------------------------------------------ */
/* Choisir une maison                                                  */
/* ------------------------------------------------------------------ */

/** Une cible possible, telle que le joueur la voit avant d'entrer. */
export interface HouseTarget {
  id: string;
  label: string;
  hint: string;
  setup: HouseSetup;
  /** Difficulté affichée, 0-100. */
  difficulty: number;
}

export function burglaryBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.prison) return 'Tu es incarcéré.';
  if (p.age < 15) return 'Tu es bien trop jeune pour ça.';
  if (p.stats.criminality < 12) {
    return 'Tu ne saurais pas par où commencer. Fais-toi la main sur plus petit.';
  }
  if ((p.yearActions.burglary ?? 0) >= 2) {
    return 'Deux fois dans l’année, c’est déjà beaucoup pour le même quartier.';
  }
  return null;
}

/**
 * Les maisons repérables depuis le quartier.
 *
 * Ce que le personnage a sous les yeux dépend d'où il vit : on ne repère pas
 * les mêmes cibles depuis un lotissement que depuis un quartier huppé.
 */
export function availableHouses(state: GameState): HouseTarget[] {
  const o = state.player.origin;
  const unit = Math.round(300 * getCountry(state.player.countryId).salaryIndex * state.world.inflation);
  const wealthy = o.neighborhood.reputation > 58 || o.city.size === 'métropole';

  const targets: HouseTarget[] = [
    {
      id: 'vide', label: 'Un appartement manifestement vide',
      hint: 'Personne dedans, mais peu de choses à prendre',
      setup: { wealth: 0.6, occupants: 0, size: 'petit', unit },
      difficulty: 20,
    },
    {
      id: 'ordinaire', label: 'Une maison ordinaire',
      hint: 'Quelqu’un à l’intérieur, du courant à prendre',
      setup: { wealth: 1, occupants: 1, size: 'moyen', unit },
      difficulty: 45,
    },
    {
      id: 'famille', label: 'Une maison pleine de monde',
      hint: 'Plusieurs personnes, un chien, et de quoi remplir un sac',
      setup: { wealth: 1.3, occupants: 3, size: 'moyen', unit },
      difficulty: 72,
    },
  ];

  if (wealthy) {
    targets.push({
      id: 'cossue', label: 'Une grande maison bien tenue',
      hint: 'Beaucoup à prendre, beaucoup de pièces, et du monde dedans',
      setup: { wealth: 2.6, occupants: 2, size: 'grand', unit },
      difficulty: 80,
    });
  }
  return targets;
}

export function burglaryContext(state: GameState, target: HouseTarget): MiniGameContext {
  const p = state.player;
  // Cambrioler demande du sang-froid et des jambes autant que du métier.
  const skill = p.stats.criminality * 0.6
    + p.stats.fitness * 0.2
    + p.psyche.emotion.stability * 0.2;
  return miniGameContext({ skill, difficulty: target.difficulty, setup: target.setup });
}

/* ------------------------------------------------------------------ */
/* Ce que la fin veut dire                                             */
/* ------------------------------------------------------------------ */

/**
 * Résout un cambriolage.
 *
 * `onChase` permet à l'écran de proposer la fuite quand il y en a une : le
 * système ne décide pas de l'interface, il dit seulement qu'une course est
 * due. Si l'appelant ne la propose pas, `resolveEscape` est appelée avec un
 * résultat automatique.
 */
export function resolveBurglary(ctx: Ctx, opts: {
  target: HouseTarget;
  outcome: BurglaryOutcome;
  loot: number;
  result: MiniGameResult;
  context: MiniGameContext;
}): ActionResult & { chase?: ChaseSetup } {
  const { state, rng } = ctx;
  const p = state.player;
  const { target, outcome, result, context } = opts;
  p.yearActions.burglary = (p.yearActions.burglary ?? 0) + 1;

  const mastery = blend(context, result);
  p.stats.stress = clampStat(p.stats.stress + 12);
  shiftStat(state, 'karma', -(9));

  /* --- Sorti avec le sac --- */
  if (outcome === 'propre' || outcome === 'bruyant') {
    const gain = Math.round(opts.loot);
    p.money += gain;
    p.criminalRecord.successfulCrimes += 1;
    p.stats.criminality = clampStat(p.stats.criminality + 4 + result.quality * 4);
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + 5);
    ctx.log('crime', `Cambriolage : ${gain} emportés.`, 'neutral');

    if (outcome === 'propre') {
      return {
        ok: true, title: 'Rien à signaler', tone: 'good',
        message: `Tu ressors comme tu es entré. ${gain} dans le sac, et personne ne saura avant demain matin.`,
      };
    }
    // Bruyant : on est sorti, mais le quartier a entendu quelque chose.
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + 4);
    return {
      ok: true, title: 'Trop de bruit', tone: 'neutral',
      message: `Tu ressors avec ${gain}, mais tu as fait du bruit. Quelqu’un a regardé par la fenêtre.`,
    };
  }

  /* --- Reparti sans rien --- */
  if (outcome === 'bredouille') {
    return {
      ok: true, title: 'Rien pris', tone: 'neutral',
      message: 'Tu ressors les mains vides. C’est une décision, pas un échec.',
    };
  }

  /* --- Le temps a manqué : quelqu'un rentre --- */
  if (outcome === 'piégé') {
    return {
      ok: true, title: 'On rentre', tone: 'bad',
      message: `Une clé dans la serrure. Tu n’as plus le temps de choisir.`,
      chase: { place: 'rue', pursuers: 1, speed: 3.4 },
    };
  }

  /* --- Vu : il faut courir --- */
  // Bien joué jusque-là, on a une longueur d'avance ; sinon ils sont déjà sur
  // vous. Le nombre de poursuivants dépend de qui était dans la maison.
  const pursuers = Math.max(1, Math.min(3, target.setup.occupants || 1));
  return {
    ok: true, title: 'Quelqu’un t’a vu', tone: 'bad',
    message: `${target.label} n’était pas aussi vide que tu croyais. Il faut sortir, tout de suite.`,
    chase: {
      place: 'rue',
      pursuers,
      speed: 3.2 + (1 - mastery) * 0.7 + rng.float(-0.1, 0.2),
    },
  };
}

/**
 * Ce qui arrive au bout de la course.
 *
 * Séparé du cambriolage à dessein : la même fonction sert à toutes les fuites,
 * quel que soit ce qui les a déclenchées.
 */
export function resolveEscape(ctx: Ctx, opts: {
  crimeId: string;
  escaped: boolean;
  /** Butin qui sera saisi en cas d'arrestation. */
  loot: number;
  result: MiniGameResult;
}): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const crime = CRIMES.find((c) => c.id === opts.crimeId) ?? CRIMES[0];

  if (opts.escaped) {
    // Semer quelqu'un est éprouvant, et paie : on garde ce qu'on a.
    p.stats.fitness = clampStat(p.stats.fitness + 1);
    p.stats.stress = clampStat(p.stats.stress + 10);
    if (opts.loot > 0) {
      p.money += Math.round(opts.loot);
      ctx.log('crime', `Coup risqué, mais réussi : ${Math.round(opts.loot)}.`, 'neutral');
    }
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + 6);
    return {
      ok: true, title: 'Semé', tone: 'good',
      message: opts.loot > 0
        ? `Tu tournes deux fois, tu changes de rue, et le bruit derrière toi s’éteint. Tu gardes ${Math.round(opts.loot)}.`
        : 'Tu tournes deux fois, tu changes de rue, et le bruit derrière toi s’éteint.',
    };
  }

  // Rattrapé : une bousculade, puis la police.
  if (rng.chance(0.4)) injure(ctx, 1);
  p.stats.reputation = clampStat(p.stats.reputation - 6);
  const told = arrest(ctx, crime, Math.round(opts.loot));
  return { ok: true, title: 'Rattrapé', tone: 'bad', message: told };
}

/* ------------------------------------------------------------------ */
/* Sans jouer                                                          */
/* ------------------------------------------------------------------ */

/** Cambriolage résolu par les seules statistiques. */
export function autoBurglary(ctx: Ctx, target: HouseTarget): ActionResult {
  const { state, rng } = ctx;
  const context = burglaryContext(state, target);
  const result = autoResolve(rng, context);

  const outcome: BurglaryOutcome = result.quality > 0.72 ? 'propre'
    : result.quality > 0.5 ? 'bruyant'
      : result.quality > 0.34 ? 'bredouille'
        : result.quality > 0.2 ? 'piégé' : 'surpris';

  const loot = outcome === 'propre' || outcome === 'bruyant'
    ? Math.round(target.setup.unit * target.setup.wealth * (2 + result.quality * 5))
    : 0;

  const outcomeResult = resolveBurglary(ctx, { target, outcome, loot, result, context });
  if (!outcomeResult.chase) return outcomeResult;

  // Le joueur n'a pas voulu jouer le cambriolage : il ne jouera pas la fuite
  // non plus. On la simule avec la même compétence.
  const chaseResult = autoResolve(rng, context);
  const escape = resolveEscape(ctx, {
    crimeId: 'burglary',
    escaped: chaseResult.success,
    loot: 0,
    result: chaseResult,
  });
  return {
    ...escape,
    message: `${outcomeResult.message} ${escape.message}`,
  };
}

/** Contexte de la fuite, à partir de celui du coup qui l'a déclenchée. */
export function chaseContext(state: GameState, setup: ChaseSetup): MiniGameContext {
  const p = state.player;
  // Fuir, c'est du souffle et du sang-froid, pas du métier.
  const skill = p.stats.fitness * 0.55
    + p.psyche.emotion.stability * 0.25
    + p.stats.criminality * 0.2;
  return miniGameContext({ skill, difficulty: 40 + setup.pursuers * 12, setup });
}
