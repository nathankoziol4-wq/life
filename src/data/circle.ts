/**
 * Le cercle : ce qui se met à exister quand des gens se rassemblent autour de
 * quelque chose que vous avez dit.
 *
 * Le catalogue le demandait sous le nom `Carrières spéciales/Communauté/Fonder
 * un mouvement`. Ce n'est **pas** une variante de `politics.ts` : il n'y a ni
 * vote, ni adversaire, ni mandat, et l'on ne gagne rien à la fin. Ce n'est pas
 * non plus une variante de la notoriété : les gens ne regardent pas, ils
 * viennent.
 *
 * Ce que le système raconte tient en une phrase, et tout le reste en découle :
 * **on ne peut pas à la fois le faire grandir et le garder.** Un cercle
 * dérive tout seul, d'autant plus vite qu'il est grand et qu'on est moins là ;
 * le ramener coûte des gens ; laisser filer coûte la main.
 *
 * **Rien ici ne décrit une méthode.** Ni comment on rassemble, ni comment on
 * convainc, ni comment on retient : les gens arrivent et partent selon des
 * nombres, et ce que le joueur décide est où il met son temps, ce qu'il fait
 * de la caisse, et lequel des deux versants il accepte de laisser filer. On ne
 * trouvera dans ce fichier aucune technique applicable à quoi que ce soit.
 */

/* ------------------------------------------------------------------ */
/* Autour de quoi                                                      */
/* ------------------------------------------------------------------ */

/**
 * Ce autour de quoi les gens se rassemblent.
 *
 * Volontairement vague et non doctrinal : ce sont des **formes de
 * rassemblement**, pas des idées. Chacune décide de la vitesse à laquelle le
 * cercle grandit, de la pente sur laquelle il dérive, et de ce que le dehors
 * en pense au départ.
 */
export interface Call {
  id: string;
  label: string;
  emoji: string;
  /** Ce que ça attire, par an et par personne déjà là. */
  draw: number;
  /** Vers quoi ça penche tout seul : le repli. */
  inward: number;
  /** Et l'intensité. */
  fervour: number;
  /** Ce que le dehors en pense au départ, 0-100. */
  regard: number;
  /** Ce que chacun laisse dans la caisse par an, avant indice du pays. */
  gives: number;
  line: string;
}

export const CALLS: Call[] = [
  {
    id: 'entraide', label: 'S’entraider', emoji: '🤲',
    draw: 0.16, inward: 0.6, fervour: 0.9, regard: 72, gives: 220,
    line: 'On se dépanne, on garde les enfants, on répare les toits. Personne n’y voit rien à redire.',
  },
  {
    id: 'terre', label: 'Vivre autrement', emoji: '🌾',
    draw: 0.11, inward: 2.4, fervour: 1.3, regard: 54, gives: 640,
    line: 'À l’écart, en commun, et peu à peu sans le reste du monde.',
  },
  {
    id: 'atelier', label: 'Faire ensemble', emoji: '🪚',
    draw: 0.13, inward: 1.1, fervour: 0.7, regard: 66, gives: 340,
    line: 'Un lieu, des outils, et ce qu’on y fabrique. Cela n’intéresse personne, et c’est reposant.',
  },
  {
    id: 'veille', label: 'Se recueillir', emoji: '🕯️',
    draw: 0.14, inward: 2.0, fervour: 2.6, regard: 48, gives: 480,
    line: 'Le soir, ensemble, en silence. C’est ce qui inquiète le plus vite.',
  },
  {
    id: 'cause', label: 'Défendre quelque chose', emoji: '📣',
    draw: 0.19, inward: 1.5, fervour: 2.2, regard: 44, gives: 300,
    line: 'On veut obtenir quelque chose, et l’on dérange forcément quelqu’un.',
  },
];

export function getCall(id: string | null | undefined): Call | undefined {
  return CALLS.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce qu'on peut faire une fois par an                                 */
/* ------------------------------------------------------------------ */

/**
 * Les gestes, et **chacun coûte ce qu'il rapporte ailleurs.**
 *
 * Aucun n'est gratuit, et aucun ne fait que du bien : ramener un cercle vers
 * le dehors fait partir ceux qui étaient venus pour le dedans, redescendre
 * d'un ton fait partir les plus ardents. C'est ce qui empêche de tout tenir.
 */
export interface Gesture {
  id: string;
  label: string;
  emoji: string;
  /** Ce que cela déplace. Négatif = cela ramène. */
  inward: number;
  fervour: number;
  regard: number;
  /** Ce que cela fait partir, en part des présents. */
  leaves: number;
  /** Ce que cela rend de main, ou ce que cela en coûte. */
  hold: number;
  line: string;
}

export const GESTURES: Gesture[] = [
  {
    id: 'ouvrir', label: 'Ouvrir les portes', emoji: '🚪',
    inward: -14, fervour: -3, regard: 11, leaves: 0.07, hold: -4,
    line: 'Le dehors entre, et ceux qui étaient venus pour être entre soi s’en vont.',
  },
  {
    id: 'calmer', label: 'Redescendre d’un ton', emoji: '🫧',
    inward: -3, fervour: -16, regard: 8, leaves: 0.11, hold: 3,
    line: 'Les plus ardents ne restent pas. Ceux qui restent tiennent longtemps.',
  },
  {
    id: 'demander', label: 'Demander davantage', emoji: '⛰️',
    inward: 6, fervour: 14, regard: -12, leaves: 0.2, hold: 9,
    line: 'On en perd, et ceux qui restent ne se posent plus la question.',
  },
  {
    id: 'recevoir', label: 'Recevoir le dehors', emoji: '🫖',
    inward: -8, fervour: -1, regard: 16, leaves: 0.02, hold: -7,
    line: 'On montre ce qu’on fait. Ce qu’on montre ne vous appartient plus tout à fait.',
  },
  {
    id: 'reprendre', label: 'Reprendre les choses en main', emoji: '✋',
    inward: 0, fervour: 2, regard: -3, leaves: 0.09, hold: 18,
    line: 'On rappelle qui a commencé. Certains n’avaient pas envie qu’on le leur rappelle.',
  },
];

export function getGesture(id: string | null | undefined): Gesture | undefined {
  return GESTURES.find((g) => g.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce que le joueur y met                                              */
/* ------------------------------------------------------------------ */

/**
 * Ce que le joueur y met, et ce que sa présence retient.
 *
 * **La présence ralentit la perte, elle ne la renverse pas.** Mesuré avec un
 * gain de huit pour « tout entier », elle compensait tout : les deux politiques
 * gardaient la main cent fois sur cent à trois cents personnes, et la phrase
 * que ce système est censé raconter n'arrivait jamais.
 */
export const CARES = {
  absent: { label: 'De loin', weight: 0.08, hold: -9, line: 'Tu n’y es presque plus. Cela continue sans toi.' },
  présent: { label: 'Présent', weight: 0.5, hold: -1, line: 'Tu y es assez pour qu’on te voie, pas assez pour tout tenir.' },
  entier: { label: 'Tout entier', weight: 0.95, hold: 4, line: 'Tu n’as plus de vie à côté, et le cercle le sait.' },
} as const;

export type Care = keyof typeof CARES;

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Avec combien de personnes cela commence. */
export const START = 4;

/**
 * Combien de gens arrivent chaque année sans que personne ne les amène.
 *
 * **Il a fallu le mesurer pour comprendre qu'il en fallait un.** La première
 * version ne faisait croître qu'en proportion des présents : à quatre au
 * départ, cela donnait moins d'une personne par an, et trente ans plus tard les
 * cercles comptaient trois à six personnes quelle que soit la politique. Un
 * système où rien ne grandit ne raconte rien. Un rassemblement attire aussi des
 * gens qui en ont simplement entendu parler, et ce terme-là ne dépend pas de sa
 * taille.
 */
export const NEWCOMERS = 7;

/** Ce qu'il faut de réputation pour que quelqu'un vous suive. */
export const NEEDS_STANDING = 34;

/** Ce que cela coûte d'ouvrir : un lieu, de quoi recevoir. */
export const SETUP = 2_400;

/**
 * La taille au-delà de laquelle la croissance se tasse d'elle-même.
 *
 * Un cercle n'avale pas une ville : il y a un nombre de gens que ce genre de
 * chose peut rassembler, et au-delà cela stagne quoi qu'on fasse.
 */
export const SATURATION = 900;

/**
 * De combien les deux versants dérivent par an, au plus.
 *
 * **C'est le cœur du système.** La dérive ne se choisit pas : elle vient de la
 * taille et de l'absence. Ce que le joueur décide est ce qu'il accepte de
 * payer pour la ramener.
 */
export const DRIFT = 7;

/** Ce que la taille ajoute à la dérive, en part de la saturation. */
export const DRIFT_SIZE = 1.4;

/** Ce que la main perd par an, en part de la dérive accumulée. */
export const HOLD_LOSS = 0.22;

/**
 * Ce que la taille coûte de main, par an, à saturation.
 *
 * C'est la thèse du système, et elle doit peser assez pour se voir : mesuré à
 * quatre, la présence du fondateur suffisait à tout compenser et les deux
 * politiques gardaient la main cent fois sur cent.
 */
export const HOLD_SIZE = 11;

/**
 * Le plafond de main qu'une taille donnée autorise.
 *
 * **C'est la thèse du système, rendue impossible à contourner.** On ne
 * commande pas cinq cents personnes parce qu'on a bien joué : à un certain
 * nombre, ce qu'on a commencé décide tout seul. Sans ce plafond, un geste
 * répétable qui rend de l'autorité — « on rappelle qui a commencé » — suffisait
 * à tenir un cercle de trois cents indéfiniment, et le système promettait
 * quelque chose qu'il ne faisait pas.
 *
 * `100` à quatre personnes, `61` à trois cents, `32` à six cents, presque rien
 * à saturation.
 */
export function holdCeiling(people: number): number {
  const filled = Math.min(1, Math.max(0, people / SATURATION));
  return Math.max(0, 100 - filled ** 0.8 * 95);
}

/** Sous cette main, le cercle ne fait plus ce qu'on lui demande. */
export const HOLD_FLOOR = 26;

/** Ce que le dehors retire quand il n'aime pas ce qu'il voit. */
export const REGARD_BITE = 0.34;

/** Sous ce regard, cela finit par se régler ailleurs qu'entre vous. */
export const REGARD_TROUBLE = 22;

/** Ce que prendre dans la caisse coûte de regard et de main, par part prise. */
export const PURSE_COST = 22;
