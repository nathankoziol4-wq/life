/**
 * Les serments : ce qu'un défi accepté interdit.
 *
 * Ce module est volontairement une feuille de l'arbre des dépendances : il ne
 * connaît que les types et le catalogue des défis. C'est ce qui permet à
 * `inheritance.ts` et à `finance.ts` de le consulter sans créer de cycle avec
 * `systems/challenges.ts`, qui, lui, dépend de la moitié du moteur.
 *
 * Deux fonctions, et la distinction entre elles est tout le sujet.
 *
 * - `vowBroken` dit qu'un serment **a été** rompu. Il sert au bilan annuel :
 *   le défi est perdu.
 * - `vowActive` dit qu'un serment **est en vigueur**. Il sert aux systèmes du
 *   moteur, qui doivent alors refuser ce que le serment interdit plutôt que de
 *   le faire arriver quand même.
 *
 * La seconde a été ajoutée après une mesure qui ne laissait pas le choix : sur
 * quarante vies ayant juré de ne jamais emprunter, **quarante** rompaient leur
 * serment — un prêt étudiant se contracte tout seul. De même trente-huit sur
 * quarante pour « ne rien devoir aux morts » : un héritage tombe sans qu'on
 * l'ait demandé. Un serment qu'on ne peut pas choisir de tenir n'est pas un
 * serment, c'est un piège ; et le principe du système était justement
 * qu'accepter un défi **change la façon de jouer**.
 */

import type { GameState } from '../engine/types.ts';
import { getChallenge } from '../data/challenges.ts';

/**
 * Le serment a-t-il été rompu ?
 *
 * Chaque ligne lit un état que le jeu tenait déjà. Rien ici n'ajoute de
 * compteur : un serment qui aurait besoin d'être instrumenté pour être vérifié
 * serait un serment qu'on ne peut pas rompre par inadvertance.
 */
export function vowBroken(state: GameState, vowId: string): boolean {
  const p = state.player;
  switch (vowId) {
    case 'sansHeritage': return p.chronicle.inherited > 0;
    case 'sansSalaire': return p.careerHistory.length > 0 || p.job !== null;
    case 'sansDiplome': return p.education.degrees.length > 0;
    case 'sansCrime':
      return p.criminalRecord.successfulCrimes > 0
        || p.criminalRecord.convictions.length > 0;
    case 'sansDette': return p.loans.length > 0 || p.education.studentLoan > 0;
    case 'sansPartir': return p.livedCountries.length > 1;
    case 'sansMariage': return p.chronicle.marriages > 0;
    default: return false;
  }
}

/**
 * Le serment est-il en vigueur ?
 *
 * Vrai seulement si un défi le portant est en cours — ni abandonné, ni perdu,
 * ni déjà mené au bout. Les systèmes qui le consultent doivent alors refuser
 * ce qu'il interdit : c'est ainsi qu'un défi se paie, au lieu d'être une
 * sanction qui tombe.
 */
export function vowActive(state: GameState, vowId: string): boolean {
  return state.player.challenges.some((t) => {
    if (t.failed || t.doneYear !== null) return false;
    return getChallenge(t.id)?.vow === vowId;
  });
}
