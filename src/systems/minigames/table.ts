/**
 * Mini-jeu : la table.
 *
 * Le casino du jeu était exactement ce que §228 interdit : quatre noms de
 * jeux — machine, roulette, blackjack, poker — qui ne différaient que par
 * trois nombres dans un tableau, une mise, un tirage. Le joueur ne contrôlait
 * rien ; il choisissait une espérance mathématique et regardait le hasard
 * trancher.
 *
 * Ce fichier ne reproduit **aucun jeu de casino réel**. Ni cartes, ni
 * couleurs, ni tapis, ni règle empruntée : une rangée de jetons retournés,
 * une valeur sous chacun, et une seule décision répétée — **en retourner un
 * de plus, ou empocher ce qu'on a**.
 *
 * Ce qui en fait un jeu d'adresse et non une loterie tient en une phrase :
 * **le sac est connu**. Sa composition est affichée au départ, et chaque
 * jeton retourné retire une possibilité. Un joueur qui suit ce qui est sorti
 * sait, à chaque instant, ce qu'il reste de bon et de mauvais ; celui qui ne
 * suit rien joue à pile ou face. C'est la seule forme d'adresse honnête à ce
 * genre de table, et elle ne demande d'emprunter aucun système existant.
 *
 * Ce que le personnage apporte : la mémoire du sac. Quelqu'un de vif voit ce
 * qui reste ; quelqu'un d'éteint ne voit qu'un total. C'est le même procédé
 * que la copie d'examen (`exam.ts`), où un élève faible ne voit pas la vraie
 * difficulté d'une question.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

/** Un jeton du sac. */
export interface Chip {
  /** Ce qu'il ajoute au pot. Négatif : il le vide. */
  value: number;
  /** A-t-il été retourné ? */
  turned: boolean;
}

export interface TableState {
  /** Le sac, mélangé au départ. */
  chips: Chip[];
  /** Ce qui est sur la table, non encore empoché. */
  pot: number;
  /** Ce qui est empoché, et que rien ne peut plus reprendre. */
  banked: number;
  /** Combien de manches il reste. */
  roundsLeft: number;
  /** Le joueur voit-il ce qu'il reste dans le sac ? */
  reads: boolean;
  /** Le dernier jeton retourné, pour l'affichage. */
  last: number | null;
  /** La manche est-elle perdue ? */
  bust: boolean;
  done: boolean;
  elapsed: number;
  /** Ce qui s'est dit, pour le compte rendu. */
  notes: string[];
  /** Combien de fois on a empoché à temps, et combien on a tout perdu. */
  banks: number;
  busts: number;
  /** Le meilleur pot atteint sans le perdre. */
  best: number;
}

/** Ce qu'il reste dans le sac, par signe. */
export function remaining(s: TableState): { good: number; bad: number } {
  const left = s.chips.filter((c) => !c.turned);
  return {
    good: left.filter((c) => c.value > 0).length,
    bad: left.filter((c) => c.value <= 0).length,
  };
}

/** La chance que le prochain jeton vide le pot, telle qu'elle est vraiment. */
export function bustOdds(s: TableState): number {
  const { good, bad } = remaining(s);
  const total = good + bad;
  return total === 0 ? 0 : bad / total;
}

/** Remplit un sac : beaucoup de petits gains, quelques jetons qui vident. */
function fill(rng: Rng, richness: number): Chip[] {
  const chips: Chip[] = [];
  const goods = 9 + Math.round(richness * 3);
  for (let i = 0; i < goods; i++) {
    chips.push({ value: 1 + Math.floor(rng.next() * (3 + richness * 3)), turned: false });
  }
  // Les jetons qui vident : assez pour que continuer soit une vraie question.
  const bads = 4;
  for (let i = 0; i < bads; i++) chips.push({ value: 0, turned: false });
  return rng.shuffle(chips);
}

/** Combien de manches on joue. */
export const ROUNDS = 3;

/**
 * Ce qu'il faut empocher pour que la soirée compte.
 *
 * Rapporté à ce qu'un sac contient : sans ce rapport, un sac riche rendrait
 * la partie facile et un sac pauvre impossible, alors que la décision est la
 * même dans les deux cas.
 */
export const TARGET_SHARE = 0.34;

export const TABLE = registerMiniGame<TableState>({
  id: 'table',
  category: 'jeu',
  label: 'La table',
  goal: 'Retourne des jetons, empoche avant celui qui vide tout.',
  duration: 60_000,

  setup(rng, ctx) {
    // La lecture du sac : ce que le personnage retient de ce qui est sorti.
    const reads = ctx.grace.insight;
    return {
      chips: fill(rng, ctx.grace.tolerance ?? 1),
      pot: 0,
      banked: 0,
      roundsLeft: ROUNDS,
      reads,
      last: null,
      bust: false,
      done: false,
      elapsed: 0,
      notes: [],
      banks: 0,
      busts: 0,
      best: 0,
    };
  },

  step(s, input, dt) {
    s.elapsed += dt;
    if (s.done) return s;

    // `tap` retourne un jeton, `hold` empoche. Deux gestes, une décision.
    if (input.tap && !s.bust) {
      const left = s.chips.filter((c) => !c.turned);
      if (left.length === 0) {
        s.done = true;
        return s;
      }
      const chip = left[0];
      chip.turned = true;
      s.last = chip.value;
      if (chip.value <= 0) {
        // Tout ce qui était sur la table s'en va. Ce qui est empoché reste.
        s.bust = true;
        s.busts += 1;
        s.pot = 0;
        s.notes.push('Le jeton qui vide. Tout ce qui était sur la table part.');
      } else {
        s.pot += chip.value;
        s.best = Math.max(s.best, s.pot);
      }
    }

    if (input.hold && !s.bust && s.pot > 0) {
      s.banked += s.pot;
      s.banks += 1;
      s.notes.push(`Empoché ${s.pot} à temps.`);
      s.pot = 0;
      s.bust = true; // la manche s'arrête aussi quand on empoche
    }

    // Une manche terminée — empochée ou perdue — laisse la place à la
    // suivante, avec un sac neuf.
    if (s.bust) {
      s.roundsLeft -= 1;
      s.bust = false;
      s.last = null;
      if (s.roundsLeft <= 0) s.done = true;
      else for (const chip of s.chips) chip.turned = false;
    }

    if (input.quit) s.done = true;
    return s;
  },

  finished(s) {
    return s.done || s.elapsed >= 60_000;
  },

  score(s): MiniGameResult {
    // Ce qu'un sac pouvait donner, pour rapporter le résultat à la table
    // plutôt qu'à un nombre absolu.
    const pool = s.chips.reduce((sum, c) => sum + Math.max(0, c.value), 0);
    const target = Math.max(1, pool * TARGET_SHARE);
    const quality = Math.max(0, Math.min(1, s.banked / (target * ROUNDS)));

    const notes = [...s.notes];
    if (s.busts === ROUNDS) notes.push('Tu n’as rien empoché de la soirée.');
    else if (s.busts === 0) notes.push('Tu as su t’arrêter à chaque fois.');
    if (s.best > 0 && s.banked === 0) notes.push(`Tu as eu ${s.best} sur la table, et tu les as laissés.`);

    return {
      success: s.banked >= target,
      score: Math.round(s.banked),
      quality,
      mistakes: s.busts,
      time: s.elapsed,
      notes,
    };
  },
});
