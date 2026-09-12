/**
 * La manière.
 *
 * Une même demande n'est pas la même chose selon le ton. C'est ce qui fait
 * qu'une bibliothèque d'actions raisonnable produit énormément de situations :
 * une action × une personne × une manière × un contexte, plutôt qu'une ligne
 * de plus dans un fichier.
 *
 * Chaque approche doit **changer ce qui arrive**, jamais seulement la phrase.
 * Trois leviers, et ils tirent dans des sens différents :
 *
 * - `odds` : ce que la manière fait aux chances d'obtenir ce qu'on demande ;
 * - `bond` : ce qu'elle laisse sur le lien, quoi qu'il arrive ;
 * - `reads` : le trait de l'autre qui décide si elle passe ou non.
 *
 * Une approche qui monte les chances doit coûter sur le lien, ou dépendre
 * d'un trait qu'on ne connaît pas encore. Sans cela il y aurait un ton
 * toujours meilleur, c'est-à-dire pas de choix.
 */

import type { TraitId } from './dates.ts';

export interface Approach {
  id: string;
  label: string;
  note: string;
  /** Ce que la manière fait aux chances, en multiplicateur. */
  odds: number;
  /** Ce qu'elle laisse sur le lien, en points, quoi qu'il arrive. */
  bond: number;
  /** Le trait de l'autre qui décide si elle passe. */
  reads: TraitId;
  /** Cette approche demande-t-elle quelque chose du joueur ? */
  needs?: { skill?: string; level?: number };
}

/**
 * Dix manières, et aucune n'est bonne partout.
 *
 * L'arbitrage se lit d'un coup d'œil : plus on force, plus on obtient, plus
 * on abîme. Ce qui décide vraiment, c'est **à qui** l'on parle — et cela, on
 * ne le sait que si l'on a pris la peine de le découvrir.
 */
export const APPROACHES: Approach[] = [
  {
    id: 'calme', label: 'Calmement', note: 'Sans presser. Ça passe ou ça ne passe pas.',
    odds: 1, bond: 0, reads: 'warmth',
  },
  {
    id: 'direct', label: 'Directement', note: 'Sans détour. On sait au moins où l’on en est.',
    odds: 1.15, bond: -1, reads: 'ambition',
  },
  {
    id: 'chaleureux', label: 'Affectueusement', note: 'En rappelant ce qui vous lie.',
    odds: 1.2, bond: 2, reads: 'warmth',
  },
  {
    id: 'drole', label: 'En plaisantant', note: 'Pour que ce soit facile de dire non.',
    odds: 0.9, bond: 3, reads: 'temper',
  },
  {
    id: 'honnete', label: 'En disant tout', note: 'Y compris ce qui ne t’arrange pas.',
    odds: 1.1, bond: 4, reads: 'loyalty',
  },
  {
    id: 'insistant', label: 'En insistant', note: 'Tu ne lâches pas. Ça se paie.',
    odds: 1.45, bond: -7, reads: 'temper',
  },
  {
    id: 'culpabiliser', label: 'En le prenant mal', note: 'Rappeler ce que tu as fait pour eux.',
    odds: 1.55, bond: -11, reads: 'loyalty',
  },
  {
    id: 'urgence', label: 'Comme une urgence', note: 'Vrai ou pas, ça change la réponse.',
    odds: 1.5, bond: -4, reads: 'generosity',
  },
  {
    id: 'prudent', label: 'Prudemment', note: 'En laissant une porte de sortie.',
    odds: 0.8, bond: 2, reads: 'temper',
  },
  {
    id: 'arrogant', label: 'De haut', note: 'Comme si c’était dû.',
    odds: 1.3, bond: -13, reads: 'ambition',
  },
];

export function getApproach(id: string): Approach | undefined {
  return APPROACHES.find((a) => a.id === id);
}

/** Les manières de demander quelque chose. */
export const ASK_TONES = ['calme', 'chaleureux', 'direct', 'insistant', 'culpabiliser', 'urgence'];

/** Les manières de dire quelque chose de difficile. */
export const HARD_TONES = ['calme', 'honnete', 'drole', 'prudent', 'direct'];

/** Les manières d'affronter quelqu'un. */
export const CONFRONT_TONES = ['calme', 'direct', 'insistant', 'arrogant', 'honnete'];

/* ------------------------------------------------------------------ */
/* Les nombres                                                         */
/* ------------------------------------------------------------------ */

/** Ce qu'un trait haut chez l'autre fait aux chances, au mieux. */
export const READS_WELL = 1.35;

/** Ce qu'un trait bas leur fait, au pire. */
export const READS_BADLY = 0.62;

/** Au-dessus : le trait est haut. En dessous de `COOL` : il est bas. */
export const KEEN = 58;
export const COOL = 40;
