/**
 * Les réseaux, et ce qu'on y met.
 *
 * **Ce que ce fichier existe pour régler.** Publier tenait en un tirage :
 * `postOnSocial` lançait un dé et distribuait quatre issues selon la bande où
 * il tombait. Le joueur appuyait sur un bouton, un nombre sortait. Il n'y
 * avait ni endroit où publier, ni sujet à choisir, ni rien à apprendre — le
 * catalogue le classait `BASIC`, c'est-à-dire « un tirage et un effet », et
 * c'était exact.
 *
 * **Ce qui se joue maintenant est une lecture, puis une gestion.** Quatre
 * réseaux, cinq sujets, et chaque public a ses goûts — que rien n'annonce.
 * On les découvre en publiant, et l'on découvre en même temps qu'un public se
 * lasse : le même sujet au même endroit rapporte de moins en moins. Tenir une
 * audience, c'est tourner.
 *
 * **Tout est fictif.** Aucun réseau réel, aucune marque, aucun mécanisme de
 * modération existant. Les règles de la maison sont des règles de jeu, et la
 * « suspension » est une sanction de jeu — pas la description de ce que fait
 * une plateforme véritable.
 */

/** Ce dont on peut parler. */
export type Subject = 'soi' | 'métier' | 'avis' | 'drôle' | 'quelquun';

export interface SubjectDef {
  id: Subject;
  label: string;
  emoji: string;
  /** Ce que c'est, en une phrase. */
  note: string;
  /**
   * Ce que ça peut coûter : 0 = rien, 1 = un mauvais jour.
   *
   * Ce n'est pas la qualité du sujet, c'est son exposition. Parler de
   * quelqu'un d'autre paie bien et se retourne vite.
   */
  risk: number;
}

export const SUBJECTS: SubjectDef[] = [
  {
    id: 'soi', label: 'Ta vie', emoji: '🪞',
    note: 'Ce que tu fais, où tu es, ce que tu manges.', risk: 0,
  },
  {
    id: 'métier', label: 'Ce que tu sais faire', emoji: '🛠️',
    note: 'Montrer le travail plutôt que le résultat.', risk: 0,
  },
  {
    id: 'drôle', label: 'Quelque chose de drôle', emoji: '😄',
    note: 'Ça circule loin et ça ne tient pas longtemps.', risk: 0.15,
  },
  {
    id: 'avis', label: 'Un avis tranché', emoji: '🗯️',
    note: 'On te répond. Beaucoup, et pas toujours bien.', risk: 0.5,
  },
  {
    id: 'quelquun', label: 'Quelqu’un d’autre', emoji: '👁️',
    note: 'Ça paie tout de suite, et ça se retourne.', risk: 0.85,
  },
];

export function getSubject(id: string): SubjectDef | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export interface NetworkDef {
  id: string;
  name: string;
  emoji: string;
  /** Ce qu'on y trouve, pour le joueur. */
  note: string;
  /**
   * Taille du public joignable, en multiple de référence. Un grand réseau
   * donne plus par publication réussie et pardonne moins.
   */
  reach: number;
  /**
   * Combien de publications par an avant que le public sature.
   *
   * C'est la vraie différence entre les quatre : l'un veut qu'on soit là tout
   * le temps, l'autre veut qu'on se fasse rare.
   */
  appetite: number;
  /**
   * Tolérance de la maison, 0-1. Bas = on est suspendu vite.
   */
  patience: number;
}

/**
 * Quatre maisons, quatre tempéraments.
 *
 * Aucune ne ressemble à un service existant : ce sont des tempéraments de
 * jeu — le grand nombre, la rareté, le bavardage, le métier — choisis parce
 * qu'ils demandent quatre façons différentes de s'y prendre.
 */
export const NETWORKS: NetworkDef[] = [
  {
    id: 'vitrine', name: 'Vitrine', emoji: '🖼️',
    note: 'Beaucoup de monde, peu d’attention. Il faut être là souvent.',
    reach: 1.35, appetite: 5, patience: 0.6,
  },
  {
    id: 'brouhaha', name: 'Brouhaha', emoji: '💬',
    note: 'On y parle vite et fort. Ce qui monte redescend le lendemain.',
    reach: 1.1, appetite: 6, patience: 0.35,
  },
  {
    id: 'lefil', name: 'Le Fil', emoji: '🧵',
    note: 'Un public exigeant et fidèle, qui n’aime pas qu’on insiste.',
    reach: 0.75, appetite: 2, patience: 0.85,
  },
  {
    id: 'atelier', name: 'L’Atelier', emoji: '🪚',
    note: 'On y montre ce qu’on fait. Le reste n’intéresse personne.',
    reach: 0.6, appetite: 3, patience: 0.9,
  },
];

export function getNetwork(id: string): NetworkDef | undefined {
  return NETWORKS.find((n) => n.id === id);
}
