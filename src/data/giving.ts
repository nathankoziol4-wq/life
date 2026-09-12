/**
 * Donner — ce que le jeu ne permettait de faire à personne.
 *
 * **Ce que ce fichier ouvre.** Le jeu sait accumuler : quinze sortes de biens,
 * cinquante-six véhicules, des objets de famille qu'on chine et qu'on
 * restaure, un patrimoine qui se calcule chaque année. Il sait aussi perdre :
 * vendre, saisir, brûler, hériter. Il ne savait pas **passer quelque chose à
 * quelqu'un de son vivant.** Trois feuilles du catalogue le disaient
 * séparément — « offrir un objet à quelqu'un », « offrir un bien », « offrir
 * un véhicule » — et c'était trois fois le même verbe absent.
 *
 * Un seul l'avait : `heirlooms.ts#give`, pour les objets de famille. Il
 * portait déjà la bonne intuition, dans un commentaire : « ce que ça vaut pour
 * l'autre tient à l'âge autant qu'au prix ». Ce fichier la généralise.
 *
 * **La règle : un cadeau ne vaut pas ce qu'il coûte.**
 *
 * — **ce que ça vaut pour lui** dépend de ce qu'il a déjà. Cinquante mille à
 *   quelqu'un qui en a deux millions, ce n'est rien ; la même somme à
 *   quelqu'un qui n'a rien, c'est une vie qui change ;
 * — **ce que ça dit de toi** dépend de ce que ça te coûte. Donner sa seule
 *   voiture n'est pas donner la troisième.
 *
 * Ces deux facteurs se multiplient. **Ce qu'ils produisent, mesuré, n'est pas
 * tout à fait ce que la première version prétendait** : un très gros cadeau à
 * quelqu'un qui n'a rien vaut beaucoup, d'où qu'il vienne — le receveur ne se
 * soucie pas de la fortune du donneur. Ce qui est vrai, et qui suffit, c'est
 * que **le rendement sature** : au-delà de ce dont la personne a besoin,
 * donner davantage ne rapporte presque plus rien, et donner à qui a déjà tout
 * ne rapporte à peu près rien du tout.
 */

/* ------------------------------------------------------------------ */
/* Ce qu'on peut donner                                                */
/* ------------------------------------------------------------------ */

/** Les sortes de choses qu'on possède et qu'on peut passer à quelqu'un. */
export type GiftKind = 'argent' | 'objet' | 'véhicule' | 'bien';

export const GIFT_KINDS: { id: GiftKind; label: string; emoji: string }[] = [
  { id: 'argent', label: 'De l’argent', emoji: '💵' },
  { id: 'objet', label: 'Un objet de famille', emoji: '🏺' },
  { id: 'véhicule', label: 'Un véhicule', emoji: '🚗' },
  { id: 'bien', label: 'Un bien', emoji: '🏠' },
];

/* ------------------------------------------------------------------ */
/* Ce que ça vaut pour l'autre                                         */
/* ------------------------------------------------------------------ */

/**
 * Le plancher de fortune, pour que la division ait un sens.
 *
 * Sans lui, donner mille à quelqu'un qui n'a rien vaudrait l'infini. Avec
 * lui, cela vaut beaucoup — ce qui est le résultat qu'on veut, sans le
 * débordement qu'on ne veut pas.
 */
export const WEALTH_FLOOR = 9_000;

/** Ce que vaut, au plus, un cadeau qui couvre tout le besoin de quelqu'un. */
export const LIFE_CHANGING = 26;

/**
 * Le plafond, qu'on n'atteint qu'en donnant presque tout à quelqu'un qui n'a
 * presque rien.
 */
export const WORTH_CAP = 34;

/**
 * Ce que le sacrifice ajoute, au plus, en facteur.
 *
 * **Le second côté, et celui qui empêche d'acheter les gens.** Donner ce
 * qu'on ne remarquera pas ne dit rien de soi. Sans ce facteur, un joueur riche
 * achèterait toutes les relations du jeu en une année.
 */
export const SACRIFICE = 1.1;

/** Ce qu'un cadeau rapporte au karma, au plus. */
export const KARMA_MAX = 9;

/* ------------------------------------------------------------------ */
/* Ce qu'on ne peut pas donner                                         */
/* ------------------------------------------------------------------ */

/**
 * Les raisons de refus, écrites une fois.
 *
 * Deux d'entre elles sont des règles de conception et non des commodités :
 * on ne donne pas un bien sur lequel on doit encore de l'argent — la dette
 * ne se transmet pas avec la porte —, et l'on ne donne pas le toit sous
 * lequel on dort.
 */
export const REFUSALS = {
  prison: 'Pas depuis une cellule.',
  gone: 'Cette personne n’est plus là.',
  nothing: 'Tu n’as rien à donner.',
  owed: 'Il reste un crédit dessus. On ne donne pas une dette.',
  home: 'C’est là que tu habites.',
  broke: 'Tu n’as pas cette somme.',
  young: 'Il est trop jeune pour qu’on lui confie ça.',
} as const;

/** L'âge à partir duquel on peut recevoir un véhicule ou un bien. */
export const TRUSTED_AGE = 16;

/** Les sommes qu'on peut donner, en parts de ce qu'on a. */
export const PURSES: { id: string; label: string; emoji: string; share: number; line: string }[] = [
  { id: 'coup', label: 'Un coup de main', emoji: '🪙', share: 0.05, line: 'De quoi passer le mois.' },
  { id: 'serieux', label: 'De quoi souffler', emoji: '💵', share: 0.2, line: 'Assez pour que ça change quelque chose cette année.' },
  { id: 'moitie', label: 'La moitié de ce que tu as', emoji: '🤲', share: 0.5, line: 'Il comprendra ce que ça t’a coûté.' },
];
