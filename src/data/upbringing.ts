/**
 * Élever un enfant.
 *
 * Le catalogue était brutal et juste : « un enfant existe et grandit ; on ne
 * fait rien avec lui ». Les enfants naissaient, vieillissaient, héritaient, et
 * pouvaient reprendre la partie à la mort du joueur — sans que rien de ce que
 * le joueur avait fait ne les distingue les uns des autres.
 *
 * C'est le seul endroit du jeu où une boucle peut se refermer complètement :
 * **l'enfant qu'on élève est le personnage qu'on jouera ensuite.** Ce que
 * `continueAs` reprend — les statistiques, le lien, ce qu'il est devenu — est
 * exactement ce que ce système écrit.
 *
 * Trois idées.
 *
 * **1. Le temps est la seule ressource.** Deux gestes par enfant et par an,
 * pas plus. Avec trois enfants, on ne peut pas tout donner à tout le monde, et
 * c'est là qu'est le jeu : on choisit lequel on suit, et on le voit dans ce
 * qu'ils deviennent.
 *
 * **2. Il n'y a pas de bonne façon.** Cadrer construit la discipline et coûte
 * le lien ; laisser faire achète le lien et coûte la tenue. Ni le tout-dur ni
 * le tout-permissif ne donnent le meilleur résultat — il y a une bande au
 * milieu, et un joueur qui pousse un curseur à fond le paie. Une éducation
 * sans arbitrage ne serait qu'une barre à remplir.
 *
 * **3. Ça ne s'achète pas entièrement.** Payer des études compte, mais moins
 * qu'être là. Un enfant riche et seul finit moins bien qu'un enfant suivi et
 * pauvre — c'est la seule affirmation forte du système, et elle est mesurée.
 */

/** Ce qu'on peut faire d'une année, avec un enfant. */
export interface Rearing {
  id: string;
  label: string;
  /** Ce que ça veut dire, en une phrase. */
  note: string;
  /** Âge minimal et maximal de l'enfant. */
  from: number;
  to: number;
  /** Ce que ça coûte, en part du coût d'une année de vie. */
  cost: number;
  /** Ce que ça déplace chez l'enfant. */
  gives: {
    attention?: number;
    schooling?: number;
    /** Vers la fermeté (positif) ou le laisser-faire (négatif). */
    hand?: number;
    bond?: number;
    happiness?: number;
  };
  /** Ce que ça prend au parent, en stress. */
  strain: number;
}

export const REARINGS: Rearing[] = [
  {
    id: 'temps', label: 'Passer du temps avec lui',
    note: 'Rien de particulier. C’est ce qui compte le plus, et ça ne se voit qu’après.',
    from: 0, to: 17, cost: 0.004, strain: 3,
    gives: { attention: 12, bond: 5, happiness: 6 },
  },
  {
    id: 'devoirs', label: 'Suivre sa scolarité',
    note: 'Les devoirs, les rendez-vous avec les professeurs, les mois où ça ne va pas.',
    // Dès trois ans, comme « payer » : à six, l'argent disposait de trois
    // années d'avance sur la présence, et gagnait la comparaison pour cette
    // seule raison.
    from: 3, to: 17, cost: 0.006, strain: 5,
    gives: { schooling: 17, attention: 5, bond: 1 },
  },
  {
    id: 'cadrer', label: 'Le cadrer',
    note: 'Des règles, et s’y tenir. Il t’en voudra maintenant.',
    from: 4, to: 17, cost: 0, strain: 6,
    gives: { hand: 16, attention: 4, bond: -6, happiness: -4 },
  },
  {
    id: 'laisser', label: 'Lui laisser la bride',
    note: 'Tu choisis de ne pas te battre. Il t’adore pour ça.',
    from: 4, to: 17, cost: 0, strain: -2,
    gives: { hand: -16, bond: 7, happiness: 6 },
  },
  {
    id: 'payer', label: 'Payer ce qu’il faut',
    note: 'Une meilleure école, des cours, ce que les autres ont. Ça aide. Moins qu’être là.',
    from: 3, to: 17, cost: 0.5, strain: 2,
    gives: { schooling: 4, happiness: 2 },
  },
  {
    id: 'transmettre', label: 'Lui transmettre ce que tu sais',
    note: 'Ce que tu fais, ce que tu aimes. Il le gardera, ou il le rejettera.',
    from: 8, to: 17, cost: 0.01, strain: 4,
    gives: { attention: 8, schooling: 4, bond: 4 },
  },
];

export function getRearing(id: string): Rearing | undefined {
  return REARINGS.find((r) => r.id === id);
}

/** Combien de gestes par enfant et par an. Le temps est la vraie limite. */
export const PER_CHILD = 2;

/** L'âge où l'on cesse d'élever quelqu'un. */
export const GROWN = 18;

/* ------------------------------------------------------------------ */
/* La main                                                             */
/* ------------------------------------------------------------------ */

/**
 * La bande où l'éducation porte.
 *
 * Entre les deux bornes, la fermeté construit sans casser. En dehors, ça
 * coûte — trop dur d'un côté, trop lâche de l'autre. C'est ce qui empêche de
 * pousser un curseur à fond et d'appeler ça une stratégie.
 */
export const HAND_LOW = -25;
export const HAND_HIGH = 35;

/**
 * Ce que la main se relâche chaque année.
 *
 * Un enfant dérive, et il faut retenir sa position. Sans ce retour, un
 * parent qui cadrait tous les ans finissait mécaniquement hors de la bande —
 * la fermeté devenait un piège plutôt qu'un dosage. Réglé pour que cadrer une
 * fois par an s'équilibre juste au sommet de la bande, et deux fois la
 * dépasse largement.
 */
export const HAND_SLACK = 0.45;

/** Ce que la main donnée fait à l'enfant, par an. */
export function handEffect(hand: number): {
  discipline: number; temper: number; bond: number; criminality: number;
} {
  if (hand > HAND_HIGH) {
    // Trop serré : il tient droit, et il t'en veut.
    const over = (hand - HAND_HIGH) / 65;
    return { discipline: 1.2, temper: 2.6 * over, bond: -2.4 * over, criminality: 0.8 * over };
  }
  if (hand < HAND_LOW) {
    // Trop lâche : il t'aime bien, et rien ne le tient.
    const under = (HAND_LOW - hand) / 75;
    return { discipline: -2.2 * under, temper: 0.4, bond: 0.8 * under, criminality: 2.2 * under };
  }
  return { discipline: 1.6, temper: 0, bond: 0.4, criminality: -0.6 };
}

export function handLabel(hand: number): string {
  if (hand > HAND_HIGH + 25) return 'Tu ne lui passes rien';
  if (hand > HAND_HIGH) return 'Tu tiens la barre haut';
  if (hand > 12) return 'Ferme, sans excès';
  if (hand > -12) return 'Ni trop, ni trop peu';
  if (hand > HAND_LOW) return 'Souple';
  return 'Tu le laisses faire';
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function attentionLabel(years: number, age: number): string {
  const share = age > 0 ? years / age : 0;
  if (share >= 0.7) return 'Tu as été là';
  if (share >= 0.4) return 'Tu as été là souvent';
  if (share >= 0.15) return 'Tu as été là parfois';
  if (years > 0) return 'Tu as été là une fois ou deux';
  return 'Tu n’as pas été là';
}

export function markLabel(mark: number): string {
  if (mark >= 16) return 'Excellent élève';
  if (mark >= 13) return 'Bon élève';
  if (mark >= 10) return 'Élève moyen';
  if (mark >= 7) return 'En difficulté';
  return 'Décroche';
}

/**
 * Ce que l'enfance laisse à l'adulte.
 *
 * Appliqué une seule fois, à dix-huit ans. C'est le moment où l'on voit ce
 * qu'on a fait — et, si l'on reprend la partie avec lui, le personnage qu'on
 * va jouer.
 */
export const GROWN_UP_WEIGHT = {
  /** Ce que chaque point d'attention moyenne vaut en bonheur adulte. */
  attention: 0.34,
  /** Ce que la scolarité suivie vaut en intelligence. */
  schooling: 0.3,
  /**
   * Ce que l'argent investi vaut, à son plafond.
   *
   * Volontairement bas. À huit, une enfance payée produisait un adulte plus
   * intelligent qu'une enfance suivie — mesuré, et exactement l'inverse de ce
   * que le système prétend faire.
   */
  money: 4,
};
