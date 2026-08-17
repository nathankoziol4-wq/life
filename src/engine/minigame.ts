/**
 * Architecture des mini-jeux.
 *
 * Le problème que ce module résout : trop d'actions importantes se résument à
 * « cliquer → tirage → réussite ou échec ». Le joueur lit un résultat au lieu
 * de faire quelque chose. Un mini-jeu lui rend la main.
 *
 * Trois règles de conception, qui expliquent la forme du code :
 *
 * 1. **Aucune logique de jeu dans React.** Un mini-jeu est un état et une
 *    fonction `step()`. L'interface ne fait que fournir des impulsions et
 *    dessiner ; les tests peuvent donc jouer une partie entière sans
 *    navigateur, et le pilote automatique aussi.
 *
 * 2. **Le personnage compte autant que le joueur.** Un excellent joueur avec
 *    un personnage débutant ne doit pas devenir le meilleur cambrioleur du
 *    monde ; un personnage expert ne doit pas réussir tout seul pendant que le
 *    joueur regarde. Le résultat final mélange les deux (voir `blend`).
 *
 * 3. **On peut toujours ne pas jouer.** `autoResolve()` produit un résultat
 *    plausible à partir des seules statistiques. Un joueur qui ne veut pas
 *    d'un mini-jeu de plus ne doit pas être puni pour autant.
 *
 * Les mini-jeux du domaine criminel sont volontairement abstraits : des
 * jauges, des formes, du minutage. Ils ne décrivent aucune méthode réelle et
 * n'en apprennent aucune — ce sont des jeux d'adresse habillés.
 */

import type { Rng } from './rng.ts';

/** Ce que le joueur a réellement accompli, indépendamment du personnage. */
export interface MiniGameResult {
  success: boolean;
  /** Score brut du mini-jeu, échelle libre. */
  score: number;
  /** Performance normalisée 0-1 : c'est elle qui entre dans le mélange. */
  quality: number;
  /** Fautes commises, pour le récit. */
  mistakes: number;
  /** Durée réellement jouée, en millisecondes. */
  time: number;
  /** Détails à raconter, propres à chaque jeu. */
  notes?: string[];
}

/** Ce que le personnage apporte au mini-jeu. */
export interface MiniGameContext {
  /** Compétence pertinente du personnage, 0-100. */
  skill: number;
  /** Difficulté de la situation, 0-100. Indépendante du personnage. */
  difficulty: number;
  /** Confort choisi par le joueur. */
  mode: Difficulty;
  /**
   * Modificateurs accordés par la compétence du personnage.
   *
   * Un personnage aguerri ne joue pas à la place du joueur : il lui donne du
   * temps, de la marge et de l'information. C'est la règle du §19.
   */
  grace: {
    /** Multiplicateur du temps disponible. */
    time: number;
    /** Multiplicateur de la vitesse à laquelle les jauges se remplissent. */
    pressure: number;
    /** Fautes tolérées avant l'échec. */
    tolerance: number;
    /** Le personnage voit-il ce qu'un novice ne verrait pas ? */
    insight: boolean;
  };
  /**
   * Mise en situation propre au jeu : la cible d'un vol à la tire, le plan
   * d'une maison. Typée par chaque mini-jeu, opaque ici.
   */
  setup?: unknown;
}

export type Difficulty = 'facile' | 'normal' | 'difficile';

/** Impulsions envoyées par l'interface. Volontairement minimal. */
export interface MiniGameInput {
  /** Position visée, 0-1 sur chaque axe. */
  x?: number;
  y?: number;
  /** Bouton principal maintenu. */
  hold?: boolean;
  /** Appui bref, consommé par le jeu. */
  tap?: boolean;
  /** Le joueur veut s'arrêter là. */
  quit?: boolean;
}

export const NO_INPUT: MiniGameInput = {};

/**
 * Un mini-jeu.
 *
 * `S` est l'état interne du jeu, entièrement décrit par des données : il doit
 * pouvoir être copié, rejoué et inspecté par un test.
 */
export interface MiniGameDef<S> {
  id: string;
  category: 'crime' | 'évasion' | 'carrière' | 'examen' | 'sport' | 'jeu';
  label: string;
  /** Ce que le joueur doit faire, en une phrase. */
  goal: string;
  /** Durée maximale nominale, avant les modificateurs, en millisecondes. */
  duration: number;
  /** Construit la situation. Le hasard n'intervient qu'ici. */
  setup(rng: Rng, ctx: MiniGameContext): S;
  /** Avance le jeu de `dt` millisecondes. Mute l'état et le renvoie. */
  step(s: S, input: MiniGameInput, dt: number): S;
  /** La partie est-elle terminée ? */
  finished(s: S): boolean;
  /** Note ce que le joueur a fait. */
  score(s: S): MiniGameResult;
}

/* ------------------------------------------------------------------ */
/* Registre                                                            */
/* ------------------------------------------------------------------ */

const REGISTRY = new Map<string, MiniGameDef<unknown>>();

/** Inscrit un mini-jeu. Appelé une fois par module de jeu. */
export function registerMiniGame<S>(def: MiniGameDef<S>): MiniGameDef<S> {
  REGISTRY.set(def.id, def as MiniGameDef<unknown>);
  return def;
}

export function getMiniGame(id: string): MiniGameDef<unknown> | undefined {
  return REGISTRY.get(id);
}

export function allMiniGames(): MiniGameDef<unknown>[] {
  return [...REGISTRY.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/* ------------------------------------------------------------------ */
/* Contexte et mélange                                                 */
/* ------------------------------------------------------------------ */

/**
 * Fabrique le contexte à partir de la compétence du personnage.
 *
 * La compétence ne s'ajoute pas au score : elle rend la partie plus
 * confortable. C'est ce qui permet à un joueur médiocre incarnant un expert de
 * s'en sortir, sans que le jeu se joue tout seul.
 */
export function miniGameContext(opts: {
  skill: number;
  difficulty: number;
  mode?: Difficulty;
  setup?: unknown;
}): MiniGameContext {
  const skill = Math.max(0, Math.min(100, opts.skill));
  const mode = opts.mode ?? 'normal';
  const modeFactor = mode === 'facile' ? 1.25 : mode === 'difficile' ? 0.8 : 1;

  return {
    skill,
    difficulty: Math.max(0, Math.min(100, opts.difficulty)),
    mode,
    grace: {
      time: (0.8 + skill / 125) * modeFactor,
      // Un expert voit venir : les jauges montent moins vite pour lui.
      pressure: Math.max(0.45, (1.25 - skill / 130) / modeFactor),
      tolerance: Math.floor(skill / 34) + (mode === 'facile' ? 1 : 0),
      insight: skill >= 55,
    },
    setup: opts.setup,
  };
}

/**
 * Mélange la performance du joueur et la compétence du personnage.
 *
 * Le poids donné au joueur est volontairement minoritaire : c'est la vie du
 * personnage qu'on simule, pas un jeu d'adresse. Mais il est assez élevé pour
 * qu'une bonne partie sauve une situation compromise, et qu'une mauvaise
 * gâche une situation facile.
 */
export function blend(ctx: MiniGameContext, result: MiniGameResult, playerWeight = 0.4): number {
  const character = ctx.skill / 100;
  return character * (1 - playerWeight) + result.quality * playerWeight;
}

/**
 * Résultat plausible sans jouer.
 *
 * Utilisé par « Résoudre automatiquement » et par le pilote automatique des
 * tests. On simule une performance de joueur moyenne, corrélée à la
 * compétence : un personnage habile s'en sort mieux, mais rien n'est acquis.
 */
export function autoResolve(rng: Rng, ctx: MiniGameContext): MiniGameResult {
  const expected = 0.25 + (ctx.skill / 100) * 0.5 - (ctx.difficulty / 100) * 0.25;
  const quality = Math.max(0, Math.min(1, expected + rng.float(-0.22, 0.22)));
  return {
    success: quality > 0.45,
    score: Math.round(quality * 100),
    quality,
    mistakes: Math.round((1 - quality) * 4),
    time: 0,
    notes: ['résolu sans jouer'],
  };
}

/**
 * Joue une partie complète sans interface.
 *
 * Sert aux tests et à toute vérification : on branche une politique — une
 * fonction qui décide de l'entrée à chaque pas — et on obtient un résultat.
 */
export function playHeadless<S>(
  def: MiniGameDef<S>,
  rng: Rng,
  ctx: MiniGameContext,
  policy: (s: S, elapsed: number) => MiniGameInput,
  dt = 50,
  maxSteps = 4000,
): { state: S; result: MiniGameResult } {
  let state = def.setup(rng, ctx);
  let elapsed = 0;
  for (let i = 0; i < maxSteps && !def.finished(state); i++) {
    state = def.step(state, policy(state, elapsed), dt);
    elapsed += dt;
  }
  return { state, result: def.score(state) };
}
