/**
 * Ce qui passe par tes mains — le délit de bureau.
 *
 * **Ce que ce fichier ouvre.** Le crime est l'un des domaines les mieux
 * fournis du jeu : un pickpocket jouable, un cambriolage avec repérage, une
 * poursuite, un boîtier inventé, un braquage au tempo, un milieu organisé
 * avec ses rangs, ses missions et son carnet d'adresses. Et à côté, une vie
 * de bureau de quarante ans où l'on choisit son implication et ses horaires.
 * Les deux ne se sont jamais rencontrées : `crimes.ts` contenait bien un
 * « détournement de fonds », mais l'emploi n'y était qu'un **interrupteur** —
 * `if (crime.id === 'embezzle' && !p.job)` — et le coup se réglait en un
 * tirage identique pour un stagiaire et pour un directeur. Le catalogue le
 * disait : « travailler quelque part n'ouvre aucune possibilité criminelle ».
 *
 * Ce qui le remplace tient en une phrase : **le poste qui permet de prendre
 * le plus est celui qui coûte le plus à perdre.** Le chemin honnête et le
 * chemin malhonnête sont le même chemin — il faut monter pour pouvoir
 * prendre, et plus on est monté, plus la chute est haute.
 *
 * Trois quantités, et rien d'autre :
 *
 * — **la portée**, ce qui passe par ses mains, qui vient de la place qu'on
 *   occupe et des années qu'on y a faites ;
 * — **le soupçon**, qui monte avec ce qu'on prend *rapporté à sa portée* — de
 *   sorte que la question n'est jamais « combien » mais « quelle part » — et
 *   qui redescend les années où l'on ne prend rien ;
 * — **le regard**, parce que quelqu'un finit par regarder, et que ce qu'il
 *   trouve dépend de ce qui s'est accumulé, pas de l'année en cours.
 *
 * **Rien ici ne décrit quoi que ce soit de réel.** La portée et le soupçon
 * sont deux nombres de jeu. Il n'y a ni méthode, ni procédé, ni marche à
 * suivre — le système parle de *position* et d'*attention*, jamais de
 * *comment*. On pourrait en changer tous les mots sans toucher une ligne de
 * code, et c'est la preuve qu'il n'apprend rien d'applicable.
 */

/* ------------------------------------------------------------------ */
/* La portée : ce qui passe par ses mains                              */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un débutant approche, en parts de son propre salaire.
 *
 * **Mesuré, et corrigé pour ça.** À trente-cinq pour cent, un avocat
 * débutant approchait six mille sept cents — pas de quoi vivre, mais assez
 * pour que la ligne s'ouvre dès le premier poste, ce qui contredisait ce que
 * le système prétend faire. À douze, il approche deux mille trois cents et
 * la plus petite portion lui rapporte quatre-vingt-douze : rien, et c'est le
 * mot juste. Au sommet de l'échelle, la différence est de six pour cent —
 * la portée y est faite de `REACH_CLIMB`, pas de ce plancher.
 */
export const REACH_BASE = 0.12;

/**
 * Ce que le sommet de l'échelle ajoute, en parts de salaire.
 *
 * Au carré de la position, et non linéairement : entre le premier et le
 * deuxième échelon il ne se passe presque rien, entre l'avant-dernier et le
 * dernier tout bascule. Sans cette courbure, prendre serait aussi intéressant
 * à vingt-cinq ans qu'à cinquante et la carrière ne serait pas le sujet.
 */
export const REACH_CLIMB = 3.4;

/**
 * En dessous de quoi la ligne n'apparaît même pas.
 *
 * Ce n'est pas une commodité d'affichage : une ligne fermée avec sa raison
 * serait une invitation permanente à quelque chose qu'un employé de vingt-deux
 * ans ne peut pas faire, et elle transformerait « ta place ne te donne accès à
 * rien » en une promesse pour plus tard. Ce que la portée dit d'elle-même dès
 * qu'elle existe suffit.
 */
export const REACH_FLOOR = 6_000;

/** Les années au bout desquelles on connaît la maison. */
export const REACH_TENURE = 12;

/** Ce que valent les années d'ancienneté, au mieux. */
export const REACH_KNOWN = 0.45;

/* ------------------------------------------------------------------ */
/* Ce qu'on décide                                                     */
/* ------------------------------------------------------------------ */

export interface Helping {
  id: string;
  label: string;
  emoji: string;
  /** La part de la portée, et non une somme : c'est là tout le système. */
  share: number;
  line: string;
}

/**
 * Les portions.
 *
 * **Une part, pas une somme.** Si le joueur choisissait un montant, le même
 * geste serait indétectable pour un directeur et voyant pour un employé — or
 * c'est exactement l'inverse qu'il faut : ce qui se remarque, c'est l'écart
 * entre ce qu'on prend et ce qu'on approche. Le directeur qui prend beaucoup
 * en prend peu ; l'employé qui prend peu en prend beaucoup.
 */
export const HELPINGS: Helping[] = [
  {
    id: 'miettes', label: 'Des miettes', emoji: '🥖', share: 0.04,
    line: 'Assez peu pour que personne ne compte. Assez peu pour que ça ne change rien.',
  },
  {
    id: 'part', label: 'Une part', emoji: '🍰', share: 0.12,
    line: 'De quoi se payer quelque chose chaque année, sans que l’année se remarque.',
  },
  {
    id: 'large', label: 'Largement', emoji: '🍗', share: 0.3,
    line: 'On finira par se demander d’où ça vient. Pas tout de suite.',
  },
  {
    id: 'tout', label: 'Tout ce que tu approches', emoji: '🍽️', share: 0.7,
    line: 'Une fois, et il faudra être parti avant qu’on regarde.',
  },
];

export function getHelping(id: string): Helping | undefined {
  return HELPINGS.find((h) => h.id === id);
}

/* ------------------------------------------------------------------ */
/* Le soupçon                                                          */
/* ------------------------------------------------------------------ */

/** L'échelle du soupçon, pour une part entière de la portée. */
export const SUSPICION_SCALE = 62;

/**
 * La courbure.
 *
 * Au-dessus de un : doubler la part fait plus que doubler le soupçon. C'est
 * ce qui sépare le filet d'eau de la saignée, et ce qui rend patient un joueur
 * qui aurait autrement tout pris la première année.
 */
export const SUSPICION_CURVE = 1.8;

/**
 * Ce que laisse le moindre geste, quelle que soit sa taille.
 *
 * Sans ce plancher, prendre quatre pour cent n'aurait jamais coûté **rien du
 * tout** et la stratégie du filet d'eau serait gratuite à l'infini : il n'y
 * aurait plus qu'une seule façon de jouer, ce qui est le contraire d'un
 * arbitrage.
 */
export const SUSPICION_FLOOR = 1.2;

/** Ce qu'une année tranquille efface, en proportion. */
export const COOL_FACTOR = 0.72;

/** Et ce qu'elle efface en plus, en points. */
export const COOL_FLAT = 1.5;

/* ------------------------------------------------------------------ */
/* Le regard                                                           */
/* ------------------------------------------------------------------ */

/** La chance qu'on regarde, même sans raison. */
export const REVIEW_BASE = 0.03;

/** Ce que le soupçon ajoute à cette chance : divisé par ce nombre. */
export const REVIEW_SLOPE = 220;

/**
 * Ce que l'appui de l'équipe retire au regard.
 *
 * **Et c'est là que le système en rejoint un autre plutôt que d'en inventer
 * un.** `workplace.ts#workplaceSupport` existait déjà : être bien vu de ceux
 * qui pèsent. Il ne servait qu'aux promotions. Il sert maintenant aussi à
 * ceci — non pas comme une façon de tromper qui que ce soit, mais parce qu'on
 * regarde d'abord ceux à qui l'on ne doit rien. Aucune mécanique nouvelle,
 * aucune manière d'échapper à quoi que ce soit : le même vieux capital social,
 * dépensé autrement.
 */
export const REVIEW_SUPPORT = 0.32;

/** Ce qu'un supérieur attentif ajoute, au plus. */
export const REVIEW_BOSS = 1.1;

/**
 * Ce qui se passe quand on regarde sans rien trouver de concluant.
 *
 * La part de la chance de trouver à laquelle on récolte tout de même un
 * avertissement. Sans elle, une revue serait tout ou rien et le joueur
 * n'aurait jamais de raison de s'arrêter avant la fin.
 */
export const REVIEW_WARNING = 0.55;

/** Ce qu'une revue sans suite laisse de soupçon, en proportion. */
export const REVIEW_RESIDUE = 0.45;
