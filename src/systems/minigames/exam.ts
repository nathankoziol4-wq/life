/**
 * Mini-jeu : la copie.
 *
 * Un examen ne se joue pas en posant des questions au joueur — il faudrait un
 * contenu scolaire, et ce serait un questionnaire, pas un jeu. Ce qui se joue
 * réellement dans une salle d'examen est **la gestion du temps** : quatre
 * heures, une copie, et des questions qui ne valent pas la même chose.
 *
 * Le joueur voit une grille de questions. Chacune affiche ce qu'elle rapporte.
 * Il en choisit une, et **maintient l'appui pour la travailler** : plus il
 * reste, plus sa réponse est solide, jusqu'à un plafond au-delà duquel il perd
 * simplement du temps. Le chronomètre ne s'arrête jamais.
 *
 * L'arbitrage est celui de la vraie salle d'examen : s'acharner sur une
 * question difficile qu'on ne finira pas, ou empocher trois questions faciles
 * et rendre une copie sans relief. Une copie où l'on n'a traité que le facile
 * plafonne ; une copie où l'on s'est perdu sur le difficile est vide.
 *
 * Ce que le personnage apporte : du temps, une zone de travail plus large, et
 * — s'il a le niveau — **la vraie difficulté affichée**. Un élève faible voit
 * des questions dont il ne sait pas si elles sont dures. C'est exactement ce
 * que change le fait de maîtriser une matière.
 *
 * Aucun contenu scolaire n'est représenté : ce sont des cases, une valeur et
 * une barre.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

/** Une question de la copie. */
export interface Question {
  id: number;
  /** Ce qu'elle rapporte si elle est bien traitée. */
  worth: number;
  /** Ce qu'elle demande réellement, 0-1. Caché si le personnage est faible. */
  hardness: number;
  /** Ce que le personnage croit voir, 0-1. Égale `hardness` s'il a le niveau. */
  seen: number;
  /** Temps déjà passé dessus, en millisecondes. */
  spent: number;
  /** Ce qu'elle vaut en l'état, 0-1. */
  done: number;
  /** Le joueur l'a-t-il abordée ? */
  touched: boolean;
}

export interface ExamState {
  questions: Question[];
  /** La question en cours de traitement, ou null. */
  active: number | null;
  elapsed: number;
  limit: number;
  /** Ce que la copie vaut pour l'instant, 0-100. */
  filled: number;
  /**
   * Ce que le surveillant remarque, 0-100.
   *
   * N'existe que si le joueur a choisi de tricher. À 100, il vient voir.
   */
  attention: number;
  /** Le joueur triche-t-il ? */
  cheating: boolean;
  /** S'est-il fait prendre ? */
  caught: boolean;
  /** Le joueur a-t-il rendu avant la fin ? */
  handedIn: boolean;
  notes: string[];
}

/** Ce que la matière apporte à la mise en situation. */
export interface ExamSetup {
  label: string;
  /** Le joueur a-t-il choisi de tricher avant d'entrer ? */
  cheating: boolean;
}

export const EXAM = registerMiniGame<ExamState>({
  id: 'exam',
  category: 'examen',
  label: 'La copie',
  goal: 'Choisis tes questions et tiens l’appui pour les travailler. Le temps ne s’arrête pas.',
  duration: 22_000,

  setup(rng: Rng, ctx) {
    const setup = (ctx.setup ?? {}) as Partial<ExamSetup>;
    const limit = Math.round(22_000 * ctx.grace.time);
    const hard = ctx.difficulty / 100;
    // Neuf questions : assez pour qu'on ne puisse pas tout traiter, assez peu
    // pour que le choix reste lisible sur un téléphone.
    const questions: Question[] = [];
    for (let i = 0; i < 9; i++) {
      const hardness = Math.min(0.98, Math.max(0.08, rng.float(0.1, 0.95) * (0.6 + hard * 0.7)));
      questions.push({
        id: i,
        // Ce qui rapporte le plus est ce qui demande le plus — mais pas
        // exactement, et c'est là qu'il y a quelque chose à voir.
        worth: Math.round((6 + hardness * 22) * rng.float(0.8, 1.25)),
        hardness,
        // Le personnage qui maîtrise voit ce qu'une question demande vraiment.
        // L'autre voit une estimation, parfois très fausse.
        seen: ctx.grace.insight
          ? hardness
          : Math.min(1, Math.max(0, hardness + rng.float(-0.3, 0.3))),
        spent: 0,
        done: 0,
        touched: false,
      });
    }
    return {
      questions,
      active: null,
      elapsed: 0,
      limit,
      filled: 0,
      attention: 0,
      cheating: setup.cheating === true,
      caught: false,
      handedIn: false,
      notes: [],
    };
  },

  step(s, input, dt) {
    if (s.handedIn || s.caught || s.elapsed >= s.limit) return s;
    s.elapsed += dt;
    if (input.quit) { s.handedIn = true; return s; }

    // Le doigt désigne une question de la grille : trois colonnes, trois
    // rangées. Le jeu ne connaît que des coordonnées 0-1.
    if (input.x !== undefined && input.y !== undefined) {
      const col = Math.min(2, Math.max(0, Math.floor(input.x * 3)));
      const row = Math.min(2, Math.max(0, Math.floor(input.y * 3)));
      s.active = row * 3 + col;
    }

    if (input.hold && s.active !== null) {
      const q = s.questions[s.active];
      q.touched = true;
      q.spent += dt;
      // Ce qu'une question rend est plafonné par ce qu'elle demande : au-delà,
      // on relit sa copie sans rien y ajouter. C'est le piège du jeu.
      const need = 1200 + q.hardness * 5200;
      q.done = Math.min(1, q.spent / need);
      if (s.cheating) {
        // Regarder ailleurs se remarque, et d'autant plus qu'on y reste.
        s.attention = Math.min(100, s.attention + dt * 0.014);
      }
    } else if (s.cheating) {
      // Le surveillant se désintéresse quand on travaille normalement.
      s.attention = Math.max(0, s.attention - dt * 0.006);
    }

    if (s.cheating && s.attention >= 100 && !s.caught) {
      s.caught = true;
      s.notes.push('Le surveillant s’est arrêté devant ta table.');
      return s;
    }

    // Ce que vaut la copie en l'état.
    const total = s.questions.reduce((sum, q) => sum + q.worth, 0);
    const got = s.questions.reduce((sum, q) => sum + q.worth * q.done, 0);
    // Tricher relève ce qu'une question rend, sans rien changer au reste :
    // c'est un raccourci, pas une compétence.
    s.filled = Math.min(100, (got / Math.max(1, total)) * 100 * (s.cheating ? 1.35 : 1));
    return s;
  },

  finished(s) {
    return s.handedIn || s.caught || s.elapsed >= s.limit;
  },

  score(s): MiniGameResult {
    const touched = s.questions.filter((q) => q.touched).length;
    const finished = s.questions.filter((q) => q.done >= 0.95).length;
    // Le temps jeté : ce qu'on a passé au-delà de ce qu'une question rendait.
    const wasted = s.questions.reduce((sum, q) => {
      const need = 1200 + q.hardness * 5200;
      return sum + Math.max(0, q.spent - need);
    }, 0);

    const notes: string[] = [...s.notes];
    if (s.caught) notes.push('Copie annulée.');
    else if (s.handedIn) notes.push('Tu as rendu avant la fin.');
    if (finished > 0) notes.push(`${finished} question(s) traitées à fond.`);
    if (wasted > 3000) notes.push('Tu t’es acharné sur ce que tu ne finirais pas.');
    if (touched <= 2 && !s.caught) notes.push('Tu n’as abordé presque rien.');

    const quality = s.caught ? 0 : Math.max(0, Math.min(1, s.filled / 100));
    return {
      success: !s.caught && s.filled >= 45,
      score: Math.round(s.filled),
      quality,
      mistakes: Math.round(wasted / 1000) + (s.caught ? 5 : 0),
      time: s.elapsed,
      notes,
    };
  },
});
