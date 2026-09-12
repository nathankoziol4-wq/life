/**
 * L'audience — ce que le procès ne demandait à personne.
 *
 * **Ce que ce fichier remplace.** `justice.ts#goToTrial` faisait ceci :
 * choisir un avocat dans une liste de quatre prix, payer, lancer un dé contre
 * `acquittalChance`, annoncer le verdict. Le joueur choisissait **un niveau de
 * gamme**, et rien d'autre. Le catalogue le disait : « le procès est un
 * calcul : aucune scène, aucune plaidoirie à conduire ».
 *
 * C'était supportable tant que les procès étaient rares. Ils ne le sont plus :
 * `justice.ts#advanceTrial` fait juger toute affaire qu'on laisse traîner, et
 * `office.ts` a fait de la condamnation ce qui coûte une carrière entière.
 * Le moment le plus lourd du jeu tenait en un lancer.
 *
 * **Et ce n'est pas l'entretien d'embauche avec d'autres mots.** Là-bas, on
 * devine ce que quelqu'un veut entendre — deux registres cachés sur quatre.
 * Ici, on ne devine pas une préférence : **on dépense une ressource finie.**
 *
 * Trois pièces :
 *
 * — **les charges**, chacune avec une solidité cachée : ce qu'ils ont
 *   réellement là-dessus ;
 * — **le crédit**, ce qu'on peut se permettre de contester avant de ne plus
 *   être cru — il ne se refait pas en cours d'audience, ou si peu ;
 * — **l'avocat**, qui ne multiplie plus un nombre mais décide de **ce qu'on
 *   voit** : au plus bas, on plaide à l'aveugle.
 *
 * L'arbitrage est là : on ne peut pas tout contester. Attaquer un point qu'ils
 * tiennent coûte du crédit et rend les suivants plus durs à emporter ; céder
 * ce qu'ils ont vraiment garde de quoi se battre sur ce qu'ils n'ont pas.
 *
 * **Rien ici ne décrit une procédure réelle.** Il n'y a ni juridiction, ni
 * règle de preuve, ni acte, ni conseil applicable où que ce soit : une charge
 * est un objet de jeu portant un nombre caché, le crédit est une jauge. Le
 * jeu ne dit à personne comment se défendre nulle part — et l'on pourrait en
 * changer tous les mots sans toucher une ligne de code.
 */

/* ------------------------------------------------------------------ */
/* Les charges                                                         */
/* ------------------------------------------------------------------ */

/** Ce qu'on peut faire d'une charge. */
export type Stance = 'concéder' | 'contester' | 'taire';

export const STANCES: { id: Stance; label: string; emoji: string; line: string }[] = [
  {
    id: 'concéder', label: 'Le reconnaître', emoji: '🤲',
    line: 'Ça ne coûte rien à défendre, puisqu’on ne le défend pas.',
  },
  {
    id: 'contester', label: 'Le contester', emoji: '⚔️',
    line: 'S’ils ne tiennent rien, tu gagnes le point et du crédit. Sinon tu perds les deux.',
  },
  {
    id: 'taire', label: 'Ne rien dire', emoji: '🤐',
    line: 'Un peu de crédit, un peu de poids, et rien de révélé.',
  },
];

/**
 * Les angles d'attaque.
 *
 * Ce sont des **catégories de jeu**, volontairement générales : elles se
 * combinent avec n'importe lequel des quatorze délits sans jamais décrire le
 * délit lui-même. Aucune ne renvoie à une notion réelle utilisable.
 */
export interface Charge {
  id: string;
  /** Ce que l'accusation met sur la table. */
  claim: string;
  /**
   * Le poids du point, s'il est retenu.
   *
   * Distinct de sa solidité : un point lourd peut être creux, et c'est
   * exactement là que se gagne une audience.
   */
  weight: number;
  line: string;
}

export const CHARGES: Charge[] = [
  { id: 'presence', claim: 'Tu étais là', weight: 16, line: 'Ils placent quelqu’un quelque part. Reste à savoir avec quoi.' },
  { id: 'moyens', claim: 'Tu en avais les moyens', weight: 12, line: 'Ce qu’ils disent que tu pouvais faire, pas ce que tu as fait.' },
  { id: 'motif', claim: 'Tu avais une raison', weight: 14, line: 'Le genre de point qui convainc sans rien prouver.' },
  { id: 'temoin', claim: 'Quelqu’un t’a vu', weight: 20, line: 'Une personne, et tout dépend de ce qu’elle vaut.' },
  { id: 'trace', claim: 'Il reste quelque chose de toi', weight: 22, line: 'Le point le plus lourd, et le plus dur à faire tomber.' },
  { id: 'version', claim: 'Ta version a changé', weight: 15, line: 'Ils comparent ce que tu as dit à ce que tu dis.' },
  { id: 'apres', claim: 'Tu t’es comporté comme un coupable', weight: 13, line: 'Ce qu’on a fait après compte autant que ce qu’on a fait.' },
  { id: 'anterieur', claim: 'Ce n’est pas la première fois', weight: 18, line: 'Ils remontent. Ce n’est recevable que si tu leur en donnes l’occasion.' },
];

/** Combien de charges tiennent dans une audience. */
export const ROUNDS = 5;

/* ------------------------------------------------------------------ */
/* Le crédit                                                           */
/* ------------------------------------------------------------------ */

/** Ce dont on dispose au départ, avant réputation et casier. */
export const CREDIT_BASE = 52;

/** Ce que la réputation ajoute, au plus. */
export const CREDIT_REPUTATION = 24;

/** Ce qu'une condamnation antérieure retire. */
export const CREDIT_PRIOR = 9;

/**
 * Ce que contester coûte quand on se trompe, par point de solidité.
 *
 * **Le cœur du système.** Sans ce coût, on contesterait tout : il n'y aurait
 * ni ressource, ni ordre à choisir, ni raison de céder quoi que ce soit — et
 * l'audience redeviendrait un questionnaire.
 */
export const CONTEST_COST = 0.55;

/** Ce que contester rapporte quand le point est creux, par point de vide. */
export const CONTEST_GAIN = 0.3;

/** Ce que se taire coûte, en crédit. */
export const SILENCE_COST = 5;

/** Et ce que se taire laisse peser, en parts du poids de la charge. */
export const SILENCE_WEIGHT = 0.45;

/** Ce que céder laisse peser : la charge entière, et rien de plus. */
export const CONCEDE_WEIGHT = 1;

/**
 * Ce qu'un point contesté **et perdu** laisse peser.
 *
 * Plus que si l'on avait cédé : on a tenté, on a été démenti devant tout le
 * monde, et le point pèse davantage pour l'avoir disputé. Sans cette
 * majoration, contester ne coûtait que du crédit — mesuré, tout contester
 * faisait alors aussi bien que répondre au hasard (50,2 % de condamnations
 * contre 51,4 %), c'est-à-dire que la ressource ne se défendait pas
 * elle-même.
 */
export const FAILED_WEIGHT = 1.25;

/**
 * Ce qu'un point emporté retire, en parts de son poids.
 *
 * Plus que le poids lui-même : faire tomber un point devant tout le monde
 * abîme le reste du dossier, ce qui donne aux victoires un intérêt propre.
 */
export const WON_WEIGHT = -0.35;

/* ------------------------------------------------------------------ */
/* Ce que l'avocat change                                              */
/* ------------------------------------------------------------------ */

/**
 * Ce que la qualité de l'avocat achète : **de la vue, pas un multiplicateur.**
 *
 * `acquittalChance` lui donnait quarante-deux points de probabilité, ce qui
 * faisait du choix d'avocat un simple achat de résultat — le même défaut que
 * les médecins d'avant `practitioners.ts`, où la compétence s'affichait en
 * clair. Il décide maintenant de **combien de charges on peut lire** avant de
 * décider quoi en faire. Un commis d'office plaide à l'aveugle ; un ténor voit
 * presque tout. Le hasard n'est pas acheté : l'information l'est.
 */
export const SIGHT_FLOOR = 0.1;
export const SIGHT_RANGE = 0.85;

/** Ce que la lecture donne : une fourchette, jamais le chiffre exact. */
export const SIGHT_BAND = 22;

/* ------------------------------------------------------------------ */
/* L'issue                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que l'audience peut déplacer sur la preuve retenue, en points.
 *
 * **Vingt, et non trente-quatre.** À trente-quatre, la plaidoirie pesait deux
 * fois plus lourd que le dossier : mesuré, bien plaider valait 10,6 points de
 * condamnation quand quinze points de preuve n'en valaient que cinq. Or le
 * calcul d'avant était bon, et l'audience doit le **moduler**, pas le
 * remplacer — c'est aussi tout ce qu'on demande à l'entretien d'embauche.
 * Une audience bien conduite ne doit pas effacer un dossier accablant, ni une
 * audience ratée envoyer en prison quelqu'un contre qui l'on n'a rien.
 */
export const SWING = 20;

/**
 * Le partage à partir duquel l'audience commence à peser contre soi.
 *
 * **Ce qui manquait pour qu'on puisse gagner quelque chose.** À 0,45, un
 * joueur qui lisait bien atteignait au mieux zéro : l'audience ne pouvait que
 * nuire, jamais aider, ce qui en faisait un impôt et non une décision. Le
 * point d'équilibre est maintenant placé là où tombe une défense ordinaire,
 * de sorte que bien plaider descende réellement sous zéro.
 */
export const SWING_PIVOT = 0.62;
