/**
 * Ceux qui travaillent pour toi.
 *
 * **Ce que ce fichier ouvre.** Le jeu modélise déjà finement le travail vu
 * d'en bas : quand on est salarié, `JobState.team` contient de vraies
 * personnes — un `Coworker` a une compétence, une ancienneté, une influence
 * réelle sur les décisions qui vous concernent, et `workplace.ts` sait leur
 * parler, se les mettre à dos, demander leur appui.
 *
 * Vu d'en haut, il n'y a rien. `Business.staff` est un entier. On l'augmente,
 * on le diminue, et il décide de la capacité, du coût salarial et de la
 * dilution de la qualité — c'est-à-dire qu'il fait son travail, mais que
 * personne n'est derrière. Le catalogue le disait en dix mots : « l'effectif
 * est un nombre ; seul le gérant est une personne ».
 *
 * Ce n'est donc pas un nombre mort qu'on répare — `staff` est lu, et bien lu.
 * C'est une **asymétrie** : le jeu sait que vos collègues sont des gens, et
 * oublie que vos salariés en sont aussi.
 *
 * Trois principes.
 *
 * **1. On n'embauche pas un effectif, on embauche quelqu'un.** Chaque
 * candidat a une compétence et une prétention, et les deux vont ensemble.
 *
 * Mesuré dans un café qui a de la demande, à renom et qualité posés :
 *
 *     équipe                   | têtes | équivalents | masse salariale | bénéfice
 *     témoin, effectif anonyme |     4 |         4,0 |         168 239 |   69 738
 *     deux très bons           |     2 |         3,0 |         138 946 |   78 427
 *     deux quelconques         |     2 |         1,8 |          92 451 |   65 605
 *     quatre quelconques       |     4 |         3,5 |         184 072 |   43 386
 *     quatre très bons         |     4 |         6,0 |         277 305 |  −36 620
 *
 * Trois choses s'y lisent. **Le talent se paie** : à effectif égal, deux très
 * bons rapportent 78 427 contre 65 605. **Deux bons valent mieux que quatre
 * têtes anonymes**, avec moitié moins de monde et 30 000 de masse salariale en
 * moins. Et **la maison a une taille** : quatre excellents produisent six
 * équivalents dans un local qui n'en absorbe que quatre, si bien qu'on paie
 * plein tarif un travail qui ne se vend pas — c'est la seule façon de perdre
 * de l'argent en embauchant les meilleurs.
 *
 * **2. Ils partent.** Un salarié sous-payé, ou qu'on laisse dans une maison
 * qui va mal, s'en va — et emporte sa compétence. Garder quelqu'un demande de
 * payer, ou d'avoir une entreprise où il se passe quelque chose.
 *
 * **3. Se séparer de quelqu'un coûte aux autres.** Les indemnités se voient
 * dans la trésorerie ; le reste se voit dans le moral de ceux qui restent, et
 * cela dure plus longtemps.
 *
 * **Ce qui ne change pas.** `staff` continue d'exister et de valoir le nombre
 * de personnes : tout ce qui le lisait déjà — capacité, coûts, dilution — le
 * lit encore. Une sauvegarde d'avant ce fichier n'a pas d'équipe nommée, et le
 * système la traite comme un effectif ordinaire plutôt que de la refuser.
 */

/* ------------------------------------------------------------------ */
/* Ce qu'on embauche                                                   */
/* ------------------------------------------------------------------ */

/**
 * L'écart de prétention entre le plus faible et le meilleur candidat.
 *
 * Quelqu'un de très bon demande à peu près le double du salaire de référence,
 * quelqu'un de médiocre nettement moins. C'est ce qui rend l'embauche autre
 * chose qu'un curseur : payer plus achète vraiment quelque chose, et payer
 * moins aussi.
 */
export const WAGE_FLOOR = 0.62;
export const WAGE_CEILING = 1.95;

/**
 * Ce que la compétence vaut en production, du plus faible au meilleur.
 *
 * **L'écart de production doit être plus large que l'écart de salaire**, sans
 * quoi le talent ne se paie jamais. Premier réglage — production de 0,55 à
 * 1,65, salaire de 0,62 à 1,95 — les deux montaient à peu près du même pas, et
 * la mesure a donné exactement ce qu'elle devait donner : à effectif égal,
 * **deux salariés quelconques rapportaient plus que deux très bons**
 * (74 208 contre 72 953), le plancher de production subventionnant les
 * mauvais. La promesse centrale du système était fausse.
 *
 * De 0,35 à 1,85, l'écart de production est de un à cinq quand celui des
 * prétentions est de un à trois : quelqu'un de très bon coûte trois fois plus
 * et produit cinq fois plus.
 */
export const WORTH_RANGE = 1.5;

/** Ce que vaut le plus faible des salariés, en part d'une personne. */
export const WORTH_FLOOR = 0.35;

/** Combien de candidats se présentent à la fois. */
export const SHORTLIST = 3;

/** Une campagne de recrutement par an et par entreprise. */
export const HIRE_KEY = 'crewHire';

/* ------------------------------------------------------------------ */
/* Le moral                                                           */
/* ------------------------------------------------------------------ */

/** Le moral d'un salarié qui arrive. */
export const MORALE_START = 62;

/**
 * Ce que le moral perd quand on paie en dessous de la prétention.
 *
 * Rapporté à l'écart : quelqu'un payé aux deux tiers de ce qu'il demandait
 * s'en souvient tous les ans.
 */
export const UNDERPAID = 26;

/** Ce que le moral gagne quand on paie au-dessus. */
export const OVERPAID = 9;

/** Ce qu'une entreprise en difficulté retire de moral chaque année. */
export const DISTRESS_TOLL = 7;

/** Ce qu'une entreprise qui va bien rend. */
export const THRIVING_LIFT = 4;

/** Ce qu'un départ forcé coûte au moral de ceux qui restent. */
export const LAYOFF_CHILL = 14;

/** Ce qu'une augmentation rend de moral, au maximum. */
export const RAISE_LIFT = 22;

/** En dessous, on cherche ailleurs. */
export const RESTLESS = 34;

/** La probabilité de partir, à moral nul. */
export const QUIT_ODDS = 0.45;

/* ------------------------------------------------------------------ */
/* L'ancienneté                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce que l'ancienneté ajoute de compétence par an, et jusqu'où.
 *
 * Quelqu'un de moyen qui reste dix ans finit meilleur qu'un bon qu'on vient
 * d'embaucher. C'est ce qui donne une raison de garder les gens autrement que
 * pour éviter le coût d'un remplacement.
 */
export const LEARNS = 1.6;

/** Le plafond de ce que l'ancienneté peut apporter. */
export const LEARNED_CAP = 18;

/** Ce que l'indemnité de départ coûte, en part du salaire annuel. */
export const SEVERANCE = 0.35;

/* ------------------------------------------------------------------ */
/* Ce qu'on en dit                                                     */
/* ------------------------------------------------------------------ */

export const MORALE_BANDS: { under: number; says: string }[] = [
  { under: 20, says: 'Il a un pied dehors.' },
  { under: RESTLESS, says: 'Il regarde les annonces.' },
  { under: 55, says: 'Il fait ce qu’on lui demande, rien de plus.' },
  { under: 78, says: 'Il est bien ici.' },
  { under: Infinity, says: 'Il ne partirait pour rien au monde.' },
];

export const SKILL_BANDS: { under: number; says: string }[] = [
  { under: 30, says: 'Il apprend encore' },
  { under: 52, says: 'Il fait l’affaire' },
  { under: 72, says: 'Il est bon' },
  { under: 88, says: 'Il est très bon' },
  { under: Infinity, says: 'On n’en trouve pas deux comme lui' },
];
