/**
 * Ce qu'un profil montre, et ce qu'il dit.
 *
 * **Ce que ce fichier existe pour régler.** `useDatingApp` était un bouton :
 * un tirage décidait s'il y avait une réponse, et une personne apparaissait
 * dans l'onglet Relations. Aucun profil à lire, personne à comparer, aucun
 * refus qu'on aurait pu voir venir. Le catalogue le classait `BASIC` — « un
 * bouton qui produit un prétendant » — et c'était exact.
 *
 * **Ce qui se joue maintenant est une lecture.** Six profils par an. Chacun
 * *montre* deux choses et *dit* deux choses, et ce n'est pas la même monnaie :
 *
 * - **ce qu'un profil montre est vrai.** Cinq photos où l'on est seul, un
 *   métier en première ligne, un « chacun sa part » écrit noir sur blanc :
 *   ce sont des faits observables, et ils disent quelque chose de qui écrit.
 * - **ce qu'un profil dit de lui-même l'est à peu près une fois sur deux.**
 *   Certains se décrivent honnêtement, d'autres se décrivent comme ils
 *   voudraient être.
 *
 * **Et l'une des deux affirmations porte sur un trait que le profil montre
 * aussi.** C'est là toute la mécanique : on peut donc *vérifier* une des deux
 * phrases, et ce qu'on en apprend ne concerne pas ce trait-là — on le savait
 * déjà — mais **la personne qui écrit**. Quelqu'un dont la phrase vérifiable
 * est démentie par ce qu'il montre a de bonnes chances de mentir aussi sur
 * l'autre. C'est une déduction, elle s'apprend en un profil, et elle ne
 * demande de connaître ni le code ni les parties précédentes.
 *
 * **Rien ici ne décrit un service réel.** Aucune application existante,
 * aucune marque, aucun procédé de mise en relation véritable : ce sont des
 * profils de jeu, écrits pour qu'il y ait quelque chose à lire.
 */

import type { TraitId } from './dates.ts';

/** Combien de profils l'application propose par an. */
export const BATCH = 6;

/**
 * À combien de personnes on peut écrire dans l'année.
 *
 * Deux, parce qu'un budget d'attention est ce qui fait de la lecture une
 * décision. Écrire à tout le monde ne serait pas lire.
 */
export const WRITES_PER_YEAR = 2;

/**
 * Ce qu'un profil **montre** d'un trait. Toujours vrai.
 *
 * Ce sont des faits sur le profil lui-même — le nombre de photos, ce qui est
 * écrit en premier, une phrase qui y figure — et non des jugements. On peut
 * être en désaccord sur ce qu'ils signifient ; on ne peut pas être en
 * désaccord sur le fait qu'ils sont là.
 */
export const TELL_HIGH: Record<TraitId, string> = {
  warmth: 'Six photos, entouré de monde sur cinq.',
  loyalty: 'Cite une amitié qui dure depuis l’école.',
  generosity: 'Propose d’emblée d’offrir le café.',
  temper: 'Trois lignes sur ce qui l’agace, une sur le reste.',
  ambition: 'Le métier est la toute première ligne.',
};

export const TELL_LOW: Record<TraitId, string> = {
  warmth: 'Six photos, seul sur les six.',
  loyalty: 'Le profil a été réécrit quatre fois ce mois-ci.',
  generosity: 'Précise « chacun sa part » dès la deuxième ligne.',
  temper: 'Pas une phrase négative dans tout le texte.',
  ambition: 'Nulle part il n’est question de travail.',
};

/**
 * Ce qu'un profil **dit** d'un trait. Vrai environ une fois sur deux.
 *
 * La formulation garde toujours la marque de la parole rapportée — « se
 * décrit comme », « dit être » — parce que c'est exactement la différence que
 * le joueur doit voir : une affirmation n'est pas une observation.
 */
export const CLAIM_HIGH: Record<TraitId, string> = {
  warmth: 'Se décrit comme quelqu’un de chaleureux.',
  loyalty: 'Dit chercher quelque chose de sérieux.',
  generosity: 'Dit aimer faire plaisir.',
  temper: 'Dit avoir du tempérament, et l’assumer.',
  ambition: 'Dit vouloir arriver quelque part.',
};

export const CLAIM_LOW: Record<TraitId, string> = {
  warmth: 'Se décrit comme quelqu’un de réservé.',
  loyalty: 'Dit ne rien vouloir promettre.',
  generosity: 'Dit faire attention à ses dépenses.',
  temper: 'Dit être d’un calme à toute épreuve.',
  ambition: 'Dit n’avoir aucune ambition particulière.',
};

/**
 * Combien un profil est sollicité, et ce que ça change.
 *
 * Écrire à la personne la plus courtisée de la liste est un pari : on n'a que
 * deux messages par an. C'est le second arbitrage de l'écran, après celui de
 * savoir qui l'on a en face.
 */
export interface Demand {
  id: string;
  label: string;
  /** Multiplie la chance d'obtenir une réponse. */
  factor: number;
}

export const DEMAND: Demand[] = [
  { id: 'rare', label: 'Peu sollicité', factor: 1.45 },
  { id: 'moyen', label: 'Sollicité comme tout le monde', factor: 1 },
  { id: 'fort', label: 'Très sollicité', factor: 0.62 },
  { id: 'foule', label: 'Assailli de messages', factor: 0.34 },
];

/**
 * Ce qu'on lit d'abord, avant même les phrases.
 *
 * Une accroche n'apprend rien — c'est voulu. Elle donne une voix à quelqu'un
 * pour que la liste ne soit pas un tableau de statistiques, et le joueur qui
 * choisirait dessus choisirait au hasard, ce qui est aussi une façon de
 * jouer.
 */
export const HOOKS: string[] = [
  'Ici pour de vrai, pas pour collectionner.',
  'Je réponds mieux qu’une machine, mais pas beaucoup plus vite.',
  'On peut commencer par un café et voir.',
  'Je sais faire deux plats. Très bien.',
  'Cherche quelqu’un qui lit encore des livres en papier.',
  'Je pars marcher dès qu’il ne pleut pas.',
  'Deux chats. Non négociable.',
  'Je ris trop fort au cinéma, désolé d’avance.',
  'Pas de photo de poisson, promis.',
  'Je viens de m’installer ici et je ne connais personne.',
  'Sérieux au travail, beaucoup moins le reste du temps.',
  'Si tu aimes les longues discussions, on va s’entendre.',
];
