/**
 * Ce qu'on tient — le catalogue des pratiques.
 *
 * Une **pratique** n'est pas une activité. Le jeu savait déjà faire une
 * activité : on clique, on paie, la statistique monte, l'année suivante on
 * reclique. Vingt ans d'arts martiaux valaient exactement vingt fois un an,
 * et le catalogue de référence le disait à trois endroits — « aucun régime à
 * suivre, aucun effet progressif », « arts martiaux avec grades », « lecture
 * avec progression ». Trois aveux, un seul manque : **la durée ne comptait
 * pas.**
 *
 * Une pratique se prend et se garde. Elle tourne toute seule chaque année,
 * elle coûte de l'argent et de l'attention, elle mène à des grades qu'il faut
 * aller chercher, et elle **redescend quand on la lâche**. Ce qui la rend
 * jouable n'est pas la progression — c'est que l'attention d'une année est
 * bornée : la somme des charges ci-dessous dépasse ce qu'une vie peut porter,
 * et une promotion, un enfant ou une maladie rétrécissent le budget sous les
 * pieds du joueur. Il faut donc arbitrer, et l'arbitrage revient tous les ans.
 *
 * Le `driver` est trois fois sur cinq la discipline, et c'est assumé : c'est
 * elle qui fait qu'on y retourne un mardi de novembre. Ce qui distingue
 * réellement les cinq est ailleurs — ce que l'année demande (`charge`), le
 * nombre de grades à franchir, et surtout ce que le grade paie **dans un autre
 * système** (`opens`). Une pratique dont le grade ne servirait qu'à s'afficher
 * serait une jauge de plus.
 */

import type { StatKey } from '../engine/types.ts';

export interface Practice {
  id: string;
  label: string;
  emoji: string;
  /** Âge à partir duquel on peut s'y mettre. */
  from: number;
  /**
   * Ce que l'année demande d'attention **au premier grade**, sur cent.
   *
   * La somme des cinq vaut 106, et elle grandit ensuite avec les grades
   * atteints (`GRADE_CHARGE`) : personne ne peut tout tenir, et celui qui a le
   * mieux réussi est celui qui peut en tenir le moins.
   */
  charge: number;
  /** Ce que l'année coûte, avant l'indice du pays et l'inflation. */
  cost: number;
  /** Ce qu'un passage de grade coûte en plus, le jour où on le tente. */
  fee: number;
  /** La statistique qui aide à avancer. */
  driver: StatKey;
  /** Les grades, du premier au dernier. On commence en dessous du premier. */
  grades: string[];
  /** Comment s'appelle le moment où l'on va chercher le grade suivant. */
  passage: string;
  /** Ce qu'une année de pratique donne au premier grade. */
  yearly: Partial<Record<StatKey, number>>;
  /** Ce que la pratique est, en une phrase. */
  line: string;
  /** Ce que le grade ouvre ailleurs dans le jeu. */
  opens: string;
}

export const PRACTICES: Practice[] = [
  {
    id: 'martial',
    label: 'Les arts martiaux',
    emoji: '🥋',
    from: 6,
    charge: 30,
    cost: 560,
    fee: 140,
    // Le corps porte la pratique, et la pratique rend le corps : c'est la
    // seule boucle du fichier, et elle est bornée par le plafond des
    // statistiques comme tout le reste.
    driver: 'fitness',
    grades: [
      'Ceinture blanche', 'Ceinture jaune', 'Ceinture orange', 'Ceinture verte',
      'Ceinture bleue', 'Ceinture marron', 'Ceinture noire',
    ],
    passage: 'Le passage de grade',
    yearly: { fitness: 5, discipline: 2.2, stress: -4, happiness: 2 },
    line: 'Deux entraînements par semaine, et un passage de grade quand le club t’y autorise.',
    opens: 'Tenir tête à quelqu’un cesse d’être une question de taille.',
  },
  {
    id: 'diet',
    label: 'Le régime',
    emoji: '🥗',
    from: 10,
    charge: 22,
    cost: 700,
    fee: 60,
    driver: 'discipline',
    grades: [
      'On essaie', 'Ça tient la semaine', 'Ça tient l’année',
      'C’est devenu ta façon de manger',
    ],
    passage: 'Le bilan de l’année',
    yearly: { health: 4, fitness: 2.5, looks: 2, happiness: -1 },
    line: 'Pas une cure : une façon de manger, tenue toute l’année, qui se relâche dès qu’on regarde ailleurs.',
    opens: 'Le corps se défait moins vite en vieillissant.',
  },
  {
    id: 'reading',
    label: 'La lecture',
    emoji: '📚',
    from: 6,
    charge: 18,
    cost: 140,
    fee: 0,
    driver: 'intelligence',
    grades: [
      'Quelques livres par an', 'Un par mois', 'Un par semaine',
      'Tu lis plus vite que tu n’achètes', 'On vient te demander quoi lire',
    ],
    passage: 'La pile de l’année',
    yearly: { intelligence: 3, happiness: 2, stress: -3 },
    line: 'Une pile qui ne descend jamais, et qu’on tient quand même.',
    opens: 'L’école devient plus facile, dans toutes les matières à la fois.',
  },
  {
    id: 'meditate',
    label: 'La méditation',
    emoji: '🧘',
    from: 8,
    charge: 16,
    cost: 0,
    fee: 0,
    driver: 'discipline',
    grades: [
      'Dix minutes', 'Vingt minutes', 'Tous les jours sans y penser',
      'Ça ne demande plus d’effort',
    ],
    passage: 'La retraite de fin d’année',
    yearly: { stress: -7, happiness: 3, discipline: 1.5 },
    line: 'Gratuit, et c’est bien ce qui le rend difficile à tenir : rien ne te rappelle à l’ordre.',
    opens: 'Ce qui te tient a moins de prise le jour où ça revient.',
  },
  {
    id: 'garden',
    label: 'Le jardin',
    emoji: '🌱',
    from: 8,
    charge: 20,
    cost: 220,
    fee: 0,
    driver: 'discipline',
    grades: [
      'Un balcon', 'Un carré de terre', 'Un potager',
      'On vient te demander des plants',
    ],
    passage: 'La saison',
    yearly: { happiness: 4, stress: -5, health: 1.5 },
    line: 'Une saison rate, la suivante rattrape. Rien ne va vite et rien ne s’arrête.',
    opens: 'Au bout de quelques saisons, il rend davantage qu’il ne coûte.',
  },
];

export function getPractice(id: string): Practice | undefined {
  return PRACTICES.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** L'attention qu'une vie entièrement dégagée peut porter. */
export const ATTENTION = 100;

/**
 * Âge en dessous duquel ce n'est pas le personnage qui paie.
 *
 * **Corrige un défaut mesuré, et le plus grave du système.** Le lien dont ce
 * fichier est le plus fier — « un club à sept ans, et l'on voit la différence
 * à treize, face à un harceleur » — était strictement inatteignable : sur
 * quarante vies, **zéro** enfant de sept ans pouvait s'inscrire, parce qu'un
 * enfant n'a pas d'argent. La promesse était écrite dans trois fichiers et
 * fausse dans tous.
 *
 * Avant seize ans, c'est donc le foyer qui paie — et c'est un foyer qui
 * décide. Ce que cela ajoute vaut mieux que la correction : le club devient un
 * marqueur d'origine, comme le reste de l'enfance dans ce jeu. Un foyer aisé y
 * met l'argent sans y penser ; un foyer pauvre ne peut offrir que ce qui est
 * gratuit ou presque — la méditation, la lecture — et l'enfant qui grandit
 * là arrive à treize ans sans ceinture.
 */
export const HOME_PAYS = 16;

/**
 * Ce qu'un foyer médian met dans une activité d'enfant, par an.
 *
 * Modulé par les moyens réels du foyer et par ce que les parents acceptent de
 * financer (`contexts.ts#getFinancialContext`). Mesuré : au foyer médian le
 * budget vaut environ 750, donc les arts martiaux passent et le régime
 * hésite ; au dixième percentile il tombe sous cinquante, et il ne reste que
 * ce qui ne coûte rien.
 */
export const HOME_BUDGET = 700;

/** Ce qu'il faut d'avancée pour avoir le droit de tenter le grade suivant. */
export const NEED = 100;

/**
 * Jusqu'où l'avancée peut monter au-delà.
 *
 * C'est la moitié de la décision : tenter à cent, c'est une chance sur deux ;
 * attendre d'être à cent quarante, c'est presque sûr — mais c'est deux ou
 * trois années de vie de plus, pendant lesquelles le budget d'attention peut
 * s'effondrer sous vos pieds. Sans plafond, attendre serait toujours juste.
 */
export const CAP = 145;

/**
 * En dessous de cette part du rythme, on n'avance plus : on entretient.
 *
 * **Ce seuil est ce qui rend le budget d'attention réel**, et il a été ajouté
 * après mesure. Sans lui, dépasser le budget ne faisait que ralentir : un
 * personnage qui tenait les cinq pratiques toute sa vie les amenait *toutes*
 * au dernier grade sauf les arts martiaux. La promesse du système — « on ne
 * peut pas tout tenir » — était donc fausse dès qu'on avait la patience, ce
 * qui est le pire cas : une contrainte qui a l'air d'exister et qui cède.
 *
 * Un seuil franc plutôt qu'une pente : à 0,61 on avance à soixante et un pour
 * cent, à 0,59 on n'avance plus du tout. C'est brutal, et c'est voulu — une
 * pente douce ne se voit pas et ne fait jamais choisir, alors qu'un mur
 * annoncé sur l'écran, avec les deux nombres qui le produisent, est une
 * décision. Rien n'est perdu pour autant : les années comptent toujours, les
 * effets de l'année aussi, et lâcher une pratique remet immédiatement les
 * autres au-dessus du seuil.
 *
 * Ce que cela donne, mesuré : le budget médian vaut une cinquantaine de points
 * pendant la vie active, quatre-vingts à seize ans et cent à la retraite. On
 * construit jeune, on perd du terrain à trente ans, on revient à soixante-dix
 * — et tenir les cinq laisse 58 % des années à entretenir sans rien monter.
 */
export const HOLDING = 0.6;

/**
 * Ce que chaque grade ajoute à la charge annuelle de la pratique.
 *
 * **La pièce qui rend l'arbitrage permanent**, et celle qui manquait. Sans
 * elle, la charge était fixe : on prenait tout ce qu'on pouvait payer une fois
 * pour toutes, et la seule question restante était la vitesse. Mesuré sur des
 * vies entières autopilotées, tenir les cinq pendant quatre-vingts ans les
 * amenait presque toutes au bout — le coût de la dispersion valait moins d'un
 * grade sur sept. Une contrainte qui coûte si peu n'en est pas une. Avec la
 * charge qui grandit, la même vie plafonne partout autour de trois grades.
 *
 * Une ceinture noire s'entraîne plus qu'une ceinture blanche : quatorze pour
 * cent de charge en plus par grade, donc une pratique menée loin **reprend de
 * la place à mesure qu'elle réussit**. L'arbitrage revient donc au moment
 * précis où l'on a le plus investi, ce qui est exactement le moment où il est
 * intéressant — et où lâcher fait le plus mal.
 */
export const GRADE_CHARGE = 0.14;

/** Ce qu'une année à plein régime rapporte au premier grade. */
export const BASE = 27;

/**
 * Ce que chaque grade déjà pris laisse à l'avancée suivante.
 *
 * **Multiplicatif, et sans plancher** — les deux corrections comptent. La
 * première version retranchait 0,155 par grade avec un plancher à 0,24 : les
 * grades six et sept coûtaient donc exactement le même effort que le
 * cinquième, et une vie entièrement consacrée à cinq pratiques les amenait
 * toutes au bout. Le sommet n'était pas un sommet.
 *
 * Ici chaque grade laisse 76 % de la vitesse du précédent, ce qui donne, à
 * plein régime : trois ans pour le premier, quatre pour le deuxième, cinq pour
 * le troisième, et quatorze pour le septième — une cinquantaine d'années de
 * pratique ininterrompue pour une ceinture noire, sans compter les passages
 * ratés. C'est ce que le dernier grade doit valoir : autrement, l'atteindre ne
 * raconte rien.
 */
export const RESIST = 0.76;

/** Ce que l'avancée garde après une année lâchée. */
export const LAPSE_KEEP = 0.55;

/** Combien d'années lâchées d'affilée avant de perdre un grade. */
export const LAPSE_GRACE = 3;

/** Ce que la continuité ajoute, par année tenue d'affilée, jusqu'au plafond. */
export const STREAK = 0.028;
export const STREAK_CAP = 0.35;

/** Ce qu'un passage raté retire d'avancée, et ce qu'il apprend pour la fois d'après. */
export const FAIL_COST = 34;
export const FAIL_LEARNS = 0.085;

/** Le grade se lit en mots : personne ne dit « je suis au grade 3 ». */
export function gradeLabel(practice: Practice, grade: number): string {
  if (grade <= 0) return 'Débutant';
  return practice.grades[Math.min(grade, practice.grades.length) - 1] ?? 'Débutant';
}
