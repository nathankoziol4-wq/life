/**
 * Le chemin vers un enfant, quand il ne vient pas tout seul.
 *
 * **Ce que ce fichier remplace.** Deux boutons, et le catalogue disait déjà
 * ce qu'ils valaient — « Adopter : ni profils, ni dossier, ni délai, ni
 * refus » et « Traitement de fertilité : un bouton, un coût, un bonus
 * permanent ». Les deux notes étaient exactes, et un détail les rendait
 * pires : la ligne de l'adoption s'intitulait « Procédure longue et
 * sélective », ce qui décrivait précisément ce que le code ne faisait pas.
 *
 * Dans le détail, avant :
 *
 * — `fertilityTreatment` posait `flags.fertilityTreatment = true` **et ne le
 *   retirait jamais**. Un achat à vingt-cinq ans multipliait les chances de
 *   conception par 2,4 et ajoutait vingt-deux points de fertilité pour le
 *   reste de la vie. Il n'y avait donc jamais qu'une décision : l'acheter.
 * — `adoptChild` faisait un tirage. Réussi, un enfant apparaissait ; raté,
 *   on avait perdu les frais et on recommençait l'année suivante. Aucune
 *   attente, aucun dossier, aucun motif de refus, et surtout aucune façon
 *   d'améliorer ses chances autrement qu'en réessayant.
 *
 * Ce que le système raconte à la place tient en une phrase : **les deux
 * chemins sont longs, chers et incertains, et une vie n'a pas le temps ni
 * l'argent de les prendre tous les deux à fond.** D'où les décisions —
 * combien de protocoles encore, quand ouvrir un dossier, ce qu'on accepte
 * d'accueillir, et quand s'arrêter.
 *
 * Le fichier ne décrit aucune procédure réelle : « le dossier », « l'enquête »,
 * « l'attente » sont des étapes de jeu, les délais sont des nombres, et rien
 * ici ne renvoie à une administration existante ni à un protocole médical.
 */

/* ------------------------------------------------------------------ */
/* Ce qu'on accepte d'accueillir                                       */
/* ------------------------------------------------------------------ */

export interface Openness {
  id: string;
  label: string;
  emoji: string;
  /**
   * Ce que ça fait à l'attente. En dessous de 1, on attend moins longtemps.
   *
   * **C'est la vraie décision du dossier.** Un nourrisson est ce que presque
   * tout le monde demande, donc c'est la file la plus longue ; s'ouvrir à
   * autre chose la raccourcit énormément. On échange du temps — c'est-à-dire
   * des années de sa propre vie — contre un enfant qui arrive autrement.
   */
  wait: number;
  /** L'âge de l'enfant qui arrive. */
  age: [number, number];
  /** Combien d'enfants arrivent. */
  count: number;
  /** Ce que le lien vaut au départ, en écart au lien d'un nourrisson. */
  bond: number;
  /** Ce que la première année coûte de plus, en stress. */
  strain: number;
  /** Ce que le geste vaut, moralement. */
  karma: number;
  line: string;
}

export const OPENNESS: Openness[] = [
  {
    id: 'bebe',
    label: 'Un tout-petit',
    emoji: '🍼',
    wait: 1,
    age: [0, 1],
    count: 1,
    bond: 0,
    strain: 0,
    karma: 8,
    line: 'Ce que presque tous demandent — donc la file la plus longue.',
  },
  {
    id: 'grand',
    label: 'Un enfant plus grand',
    emoji: '🧒',
    wait: 0.55,
    age: [5, 11],
    count: 1,
    // Il arrive avec une histoire, et il ne la laisse pas à la porte.
    bond: -18,
    strain: 10,
    karma: 14,
    line: 'Il arrive avec une histoire, et il lui faudra du temps.',
  },
  {
    id: 'fratrie',
    label: 'Deux, qu’on ne sépare pas',
    emoji: '👧🧒',
    wait: 0.42,
    age: [3, 10],
    count: 2,
    bond: -12,
    strain: 16,
    karma: 20,
    line: 'Un frère et une sœur qu’aucun service ne veut séparer.',
  },
  {
    id: 'besoins',
    label: 'Un enfant qui demande davantage',
    emoji: '💗',
    wait: 0.3,
    age: [2, 9],
    count: 1,
    bond: -8,
    // La première année est dure, et le jeu ne prétend pas le contraire.
    strain: 22,
    karma: 26,
    line: 'La file la plus courte, et l’année la plus dure.',
  },
];

export function getOpenness(id: string): Openness | undefined {
  return OPENNESS.find((o) => o.id === id);
}

/* ------------------------------------------------------------------ */
/* Les étapes du dossier                                               */
/* ------------------------------------------------------------------ */

export type Stage = 'dossier' | 'enquête' | 'attente' | 'refusé' | 'arrivé';

export const STAGE_LABEL: Record<Stage, string> = {
  dossier: 'Dossier en cours de constitution',
  enquête: 'Enquête sociale',
  attente: 'En attente d’un apparentement',
  refusé: 'Dossier refusé',
  arrivé: 'Arrivé',
};

/** Combien d'années dure chaque étape avant l'attente proprement dite. */
export const STAGE_YEARS: Record<'dossier' | 'enquête', number> = {
  dossier: 1,
  enquête: 2,
};

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Frais d'ouverture du dossier, avant l'indice du pays. */
export const FILE_FEE = 9000;

/** Ce que l'attente dure, en années, pour un dossier moyen ouvert à tout. */
export const BASE_WAIT = 7;

/** Âge minimum pour ouvrir un dossier. */
export const FILE_FROM = 25;

/** Un protocole de fertilité, avant l'indice du pays et la prise en charge. */
export const CYCLE_COST = 6500;

/**
 * Ce que chaque protocole déjà fait retire au suivant.
 *
 * Multiplicatif : le premier essai est le meilleur, et l'acharnement rapporte
 * de moins en moins. C'est ce qui donne son poids à la question « encore une
 * fois ? », qui est la seule que ce chemin-là pose vraiment.
 */
export const CYCLE_FADE = 0.82;

/** Bornes d'âge du protocole. */
export const CYCLE_FROM = 18;
export const CYCLE_TO = 50;

/** Ce qu'un protocole raté coûte au couple. */
export const CYCLE_STRAIN = 7;
