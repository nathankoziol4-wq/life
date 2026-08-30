/**
 * L'allure : ce qu'on donne à voir, et à qui.
 *
 * **Ce que ce fichier existe pour régler.** Le catalogue porte cinq aveux
 * voisins, tous sur la même chose : « Coiffure et style — absent », « Salon et
 * soins — absent », « Tatouages et marques — absent », « Vieillissement
 * visible — l'allure baisse avec l'âge mais l'apparence décrite ne change
 * pas », « Chirurgie esthétique — une action, un tirage : ni choix de
 * procédure, ni complication, ni récupération ».
 *
 * Le jeu génère pourtant une apparence complète à la naissance — forme du
 * visage, couleur des yeux, coiffure, carrure, traits — et **ne la touche plus
 * jamais**. L'allure se résume à une statistique, `looks`, qui monte et
 * descend toute seule.
 *
 * **Ce qui manquait n'est pas un bouton de coiffeur.** C'est qu'un seul
 * nombre ne peut pas dire à la fois ce que voit un recruteur, ce que voit
 * quelqu'un sur une application de rencontre et ce que voit un public. Ces
 * trois-là ne regardent pas la même chose, et une allure qui plaît à l'un
 * dessert souvent l'autre.
 *
 * **Un registre est donc un pari, pas un achat.** Cinq façons de se présenter,
 * aucune meilleure dans l'absolu : chacune est lue différemment selon qui
 * regarde. S'en tenir une demande de l'entretien — il faut y remettre de
 * l'argent chaque année, et cesser se voit. C'est le même arbitrage que les
 * réseaux : ce qui marche quelque part ne marche pas ailleurs, et tenir
 * demande d'y revenir.
 */

/** Qui regarde. Trois publics, trois lectures. */
export type Audience = 'embauche' | 'rencontre' | 'public';

export const AUDIENCE_LABEL: Record<Audience, string> = {
  embauche: 'Un recruteur',
  rencontre: 'Quelqu’un qui te découvre',
  public: 'Un public',
};

export interface Register {
  id: string;
  label: string;
  emoji: string;
  /** Ce que c'est, pour le joueur. */
  note: string;
  /**
   * Ce que ça coûte de tenir, par an et avant ajustement au pays.
   *
   * Un registre exigeant se voit mieux et se tient moins facilement : c'est
   * le second arbitrage, après celui du public visé.
   */
  upkeep: number;
  /**
   * Comment chaque public le lit, de −1 à +1.
   *
   * **Aucun registre n'est bon partout** — c'est vérifié par un test, parce
   * qu'un registre dominant réduirait le choix à une seule bonne réponse.
   */
  reads: Record<Audience, number>;
}

export const REGISTERS: Register[] = [
  {
    id: 'soigne', label: 'Soigné', emoji: '👔',
    note: 'Coupe nette, vêtements repassés, rien qui dépasse. On te prend au sérieux avant que tu aies parlé.',
    upkeep: 1400,
    reads: { embauche: 0.9, rencontre: 0.1, public: -0.4 },
  },
  {
    id: 'naturel', label: 'Naturel', emoji: '🌿',
    note: 'Rien de travaillé, rien de négligé non plus. Ça ne joue contre toi nulle part, et ça n’impressionne personne.',
    upkeep: 420,
    reads: { embauche: 0.2, rencontre: 0.35, public: 0 },
  },
  {
    id: 'marque', label: 'Marqué', emoji: '🎭',
    note: 'Une allure qu’on remarque et dont on se souvient. Certains adorent, d’autres traversent la rue.',
    upkeep: 1900,
    reads: { embauche: -0.7, rencontre: 0.4, public: 0.95 },
  },
  {
    id: 'discret', label: 'Discret', emoji: '🕶️',
    note: 'Rien à retenir, personne ne te décrit. C’est parfois exactement ce qu’il faut.',
    upkeep: 180,
    reads: { embauche: 0.35, rencontre: -0.5, public: -0.8 },
  },
  {
    id: 'decontracte', label: 'Décontracté', emoji: '👟',
    note: 'À l’aise, un peu débraillé. On te trouve agréable et on t’imagine mal en réunion.',
    upkeep: 320,
    reads: { embauche: -0.3, rencontre: 0.55, public: 0.35 },
  },
];

export function getRegister(id: string): Register | undefined {
  return REGISTERS.find((r) => r.id === id);
}

/**
 * Ce qu'on peut faire dans l'année pour tenir son allure.
 *
 * Ce ne sont pas des achats de points : chacun **remet de l'entretien**, et
 * l'entretien redescend tout seul d'une année sur l'autre. Ce qui coûte cher
 * en rend plus, ce qui ne coûte rien en rend un peu.
 */
export interface Grooming {
  id: string;
  label: string;
  emoji: string;
  note: string;
  /** Coût avant ajustement au pays. */
  cost: number;
  /** Ce que ça rend d'entretien, sur 1. */
  gives: number;
  from: number;
}

export const GROOMING: Grooming[] = [
  {
    id: 'coiffeur', label: 'Passer chez le coiffeur', emoji: '💈',
    note: 'La chose la plus visible, et la moins chère de la liste.',
    cost: 55, gives: 0.3, from: 6,
  },
  {
    id: 'soins', label: 'Des soins', emoji: '🧴',
    note: 'Peau, mains, dents. Personne ne le remarque et tout le monde le voit.',
    cost: 190, gives: 0.28, from: 14,
  },
  {
    id: 'garderobe', label: 'Renouveler la garde-robe', emoji: '🧥',
    note: 'Ce qui tient le plus longtemps, et ce qui coûte le plus.',
    cost: 900, gives: 0.55, from: 12,
  },
  {
    id: 'silhouette', label: 'Reprendre la silhouette', emoji: '🏃',
    note: 'Ni salon ni boutique : du temps, et de la constance.',
    cost: 0, gives: 0.22, from: 12,
  },
];

export function getGrooming(id: string): Grooming | undefined {
  return GROOMING.find((g) => g.id === id);
}

/**
 * Ce que la vie inscrit sur un visage.
 *
 * **C'est ici que « vieillissement visible » cesse d'être un aveu.** Chaque
 * marque a une cause dans le jeu — pas un tirage : on ne prend pas des rides
 * au hasard, on les prend en vivant tendu, longtemps, dehors ou en prison.
 * Elles s'ajoutent à l'apparence décrite et ne s'en vont pas toutes.
 */
export interface Mark {
  id: string;
  /** Ce que la fiche affiche. */
  label: string;
  /** Ce qui l'a causée, pour le joueur. */
  cause: string;
  /** Se retire-t-elle avec de l'entretien ou une intervention ? */
  reversible: boolean;
  /** Ce qu'elle retire d'allure brute. */
  weight: number;
}

export const MARKS: Mark[] = [
  {
    id: 'rides', label: 'des rides marquées',
    cause: 'des années tendues', reversible: false, weight: 3,
  },
  {
    id: 'cernes', label: 'des cernes qui ne partent plus',
    cause: 'du sommeil en moins', reversible: true, weight: 2,
  },
  {
    id: 'teint', label: 'un teint fatigué',
    cause: 'une santé qui a lâché', reversible: true, weight: 3,
  },
  {
    id: 'buriné', label: 'un visage buriné',
    cause: 'un métier passé dehors', reversible: false, weight: 1,
  },
  {
    id: 'cicatrice', label: 'une cicatrice qui se voit',
    cause: 'une mauvaise soirée', reversible: false, weight: 2,
  },
  {
    id: 'usure', label: 'l’air d’avoir vécu',
    cause: 'des années difficiles', reversible: false, weight: 2,
  },
  {
    id: 'refait', label: 'un visage un peu trop lisse',
    cause: 'des interventions à répétition', reversible: false, weight: 4,
  },
];

export function getMark(id: string): Mark | undefined {
  return MARKS.find((m) => m.id === id);
}

/** Les coiffures qu'on peut adopter. Purement descriptif, et c'est le propos. */
export const HAIRSTYLES: string[] = [
  'cheveux courts', 'cheveux mi-longs', 'cheveux longs', 'crâne rasé',
  'coupe dégradée', 'cheveux attachés', 'boucles courtes', 'frange nette',
];

export const HAIRCOLORS: string[] = [
  'châtain', 'brun', 'blond', 'roux', 'noir', 'gris', 'décoloré', 'teint en couleur',
];
