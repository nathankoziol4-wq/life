/**
 * La bête — l'animal qui vivait dans la sauvegarde et pas dans la vie.
 *
 * **Ce que ce fichier ouvre.** Le jeu savait déjà adopter neuf espèces, leur
 * donner un nom, payer leur entretien, les emmener chez le vétérinaire et les
 * faire mourir de vieillesse. Ce qui manquait n'était pas une espèce de plus.
 *
 * `Pet.happiness` était écrit à deux endroits et **lu nulle part** : il
 * baissait de trois à dix points par an, remontait de douze quand on cliquait
 * « Jouer », et ne décidait de rien. C'est le même défaut que la tension du
 * locataire — un nombre que le moteur tient et que rien ne consulte. Un
 * animal, dans cet état, n'est pas un être vivant : c'est une ligne de charge
 * annuelle avec un émoji.
 *
 * Trois principes.
 *
 * **1. L'attention est la seule monnaie qui compte.** On peut acheter chez
 * l'éleveur une bête parfaite et ne jamais la voir : elle vivra sa vie
 * statistique et mourra en étranger. On peut prendre au refuge celle dont
 * personne ne voulait et mettre des années à l'atteindre — elle vivra plus
 * longtemps, coûtera moins cher en soins, et emportera quelque chose en
 * partant. Le jeu ne dit pas d'avance lequel des deux vaut mieux.
 *
 * **2. Les moments sont comptés.** On n'a que quelques moments par an, et ils
 * se partagent entre toutes les bêtes de la maison. Adopter le quatrième
 * animal, c'est retirer de l'attention aux trois autres. C'est ce qui fait de
 * l'adoption une décision et non une collection.
 *
 * **3. Chaque bête demande autre chose.** Un chien qu'on ne sort pas devient
 * un problème ; un poisson qu'on essaie de dresser reste un poisson. Il faut
 * lire l'animal qu'on a avant de savoir où mettre ses moments — et c'est la
 * seule adresse demandée ici.
 *
 * **Ce qui se paie.** Le lien retire du stress au joueur chaque année, le
 * dressage évite les dégâts, et l'état d'une bête bien tenue lui achète des
 * années. À l'inverse une bête négligée coûte du bonheur, casse des choses, et
 * finit par partir — c'est la seule façon de perdre un animal autrement que
 * par sa mort.
 */

/* ------------------------------------------------------------------ */
/* D'où elle vient                                                     */
/* ------------------------------------------------------------------ */

export interface BeastSource {
  id: string;
  label: string;
  emoji: string;
  /** Ce qu'on paie, en part du prix catalogue de l'espèce. */
  priceShare: number;
  /** L'âge d'arrivée, en années. */
  age: [number, number];
  /** L'ouverture de départ : à quel point la bête se laisse atteindre. */
  ease: [number, number];
  /** L'état de santé d'arrivée. */
  health: [number, number];
  /** Le contentement d'arrivée. */
  content: [number, number];
  /** Ce que le joueur y gagne en conscience. */
  karma: number;
  line: string;
  note: string;
}

/**
 * Trois portes, trois marchés différents.
 *
 * Ce ne sont pas trois prix pour la même bête : ce sont trois bêtes. Le refuge
 * donne un animal qui a déjà vécu quelque chose et qui le montre ; l'éleveur
 * vend de la certitude ; l'animalerie vend le prix affiché et rien d'autre —
 * c'est elle qui a la plus grande dispersion sur les deux tableaux.
 */
export const BEAST_SOURCES: BeastSource[] = [
  {
    id: 'refuge', label: 'Un refuge', emoji: '🏠',
    priceShare: 0.15,
    age: [1, 5], ease: [8, 38], health: [45, 78], content: [30, 55],
    karma: 6,
    line: 'Elle a déjà vécu quelque chose, et elle ne te le dira pas.',
    note: 'Presque rien à payer. Elle arrive fermée, plus âgée, pas au mieux.',
  },
  {
    id: 'eleveur', label: 'Un éleveur', emoji: '📜',
    priceShare: 1.6,
    age: [0, 0], ease: [58, 88], health: [86, 98], content: [70, 88],
    karma: 0,
    line: 'Tout est en ordre : les papiers, la santé, le caractère.',
    note: 'Le plus cher, et le seul où l’on sait d’avance ce qu’on emmène.',
  },
  {
    id: 'animalerie', label: 'Une animalerie', emoji: '🪟',
    priceShare: 1,
    age: [0, 1], ease: [26, 72], health: [58, 95], content: [50, 80],
    karma: 0,
    line: 'Derrière la vitre, on ne voit que ce qu’on veut y voir.',
    note: 'Le prix affiché. Le caractère et la santé sont une loterie.',
  },
];

export function getBeastSource(id: string): BeastSource | undefined {
  return BEAST_SOURCES.find((s) => s.id === id);
}

/** Ce dont on part quand la provenance est inconnue — vieilles sauvegardes. */
export const DEFAULT_SOURCE = 'animalerie';

/* ------------------------------------------------------------------ */
/* Ce que chaque espèce demande                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce à quoi une espèce est sensible, entre 0 et 1.
 *
 * `walk` sert deux fois : c'est ce qu'une sortie lui rapporte, **et** ce que
 * son absence lui coûte. Un chien qu'on ne sort pas se dégrade vite et finit
 * par casser quelque chose ; une tortue s'en moque. C'est ce qui rend le chien
 * exigeant et la tortue reposante, sans avoir à l'écrire nulle part.
 */
export interface BeastNature {
  walk: number;
  groom: number;
  train: number;
}

export const NATURES: Record<string, BeastNature> = {
  dog: { walk: 1, groom: 0.7, train: 1 },
  cat: { walk: 0.2, groom: 0.6, train: 0.35 },
  rabbit: { walk: 0.3, groom: 0.8, train: 0.3 },
  hamster: { walk: 0.1, groom: 0.6, train: 0.15 },
  bird: { walk: 0.1, groom: 0.5, train: 0.9 },
  fish: { walk: 0, groom: 1, train: 0 },
  horse: { walk: 1, groom: 1, train: 0.95 },
  snake: { walk: 0, groom: 0.7, train: 0.1 },
  turtle: { walk: 0.15, groom: 0.7, train: 0.1 },
};

/** Ce dont on part pour une espèce qu'on ne connaît pas. */
export const DEFAULT_NATURE: BeastNature = { walk: 0.4, groom: 0.7, train: 0.4 };

export function natureOf(speciesId: string): BeastNature {
  return NATURES[speciesId] ?? DEFAULT_NATURE;
}

/* ------------------------------------------------------------------ */
/* Les moments                                                         */
/* ------------------------------------------------------------------ */

/** Ce qu'on a de moments dans une année ordinaire. */
export const MOMENTS_BASE = 3;

/** Ce qu'une vie sans travail rend de temps. */
export const MOMENTS_FREE = 1;

/** Ce qu'un métier prenant retire de temps. */
export const MOMENTS_BUSY = 1;

/** Au-delà de cette charge hebdomadaire, le métier mange les moments. */
export const BUSY_HOURS = 45;

/** On garde toujours de quoi faire une chose. */
export const MOMENTS_MIN = 1;

export interface Care {
  id: string;
  label: string;
  emoji: string;
  /** Ce que ça prend de moments. */
  moments: number;
  /** À quel besoin de l'espèce ça répond. */
  needs: keyof BeastNature;
  line: string;
}

/**
 * Trois façons de donner un moment.
 *
 * Dresser coûte deux moments : c'est la seule chose qui demande d'y revenir,
 * et la seule dont le bénéfice ne se voit pas le jour même. Sans ce prix, il
 * n'y aurait aucune raison de faire autre chose.
 */
export const CARES: Care[] = [
  {
    id: 'sortir', label: 'La sortir', emoji: '🚶', moments: 1, needs: 'walk',
    line: 'Du temps dehors, pour elle et pour toi.',
  },
  {
    id: 'soigner', label: 'S’en occuper', emoji: '🧼', moments: 1, needs: 'groom',
    line: 'La brosser, nettoyer, regarder de près ce qui ne va pas.',
  },
  {
    id: 'dresser', label: 'La dresser', emoji: '🎯', moments: 2, needs: 'train',
    line: 'Long, ingrat, et c’est ce qui évite les ennuis plus tard.',
  },
];

export function getCare(id: string): Care | undefined {
  return CARES.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Ce qu'un moment parfaitement placé rapporte de lien, au mieux. */
export const REACH = 9;

/**
 * La part d'un moment qui compte même s'il répond à un besoin déjà couvert.
 *
 * Mesuré avant ce facteur : sortir un chien tous les ans, le dresser tous les
 * ans, ou lire ce qu'il demande donnaient **10,4 / 10,4 / 10,7 ans** de vie et
 * un lien de 97 dans les trois cas. N'importe quelle attention saturait tout,
 * donc lire la bête ne servait à rien et le tableau des natures était de la
 * décoration. Un moment mal placé vaut maintenant trois dixièmes d'un moment
 * bien placé — assez pour que ce ne soit jamais perdu, assez peu pour qu'il
 * faille regarder.
 */
export const ANSWER_FLOOR = 0.3;

/**
 * Le lien qu'il faut avoir avant de pouvoir dresser.
 *
 * On n'apprend rien à une bête qui ne sait pas encore qui vous êtes. C'est ce
 * qui donne un ordre aux moments — atteindre, puis apprendre — et ce qui fait
 * que la bête du refuge, fermée, met des années à en arriver là.
 */
export const TRAIN_BOND = 25;

/**
 * La part du gain qui passe même chez une bête fermée.
 *
 * Sans ce plancher, l'animal du refuge était insoluble : ouverture 8 sur 100
 * donnait moins d'un point de lien par moment, soit un siècle pour arriver
 * quelque part. Une bête fermée est lente à atteindre, pas impossible.
 */
export const EASE_FLOOR = 0.35;

/** Ce que chaque moment passé ouvre la bête pour la suite. */
export const EASE_GAIN = 2.2;

/** Ce que le lien perd dans une année où l'on n'a rien donné. */
export const BOND_FADE = 4;

/** La part de la perte qu'une longue histoire absorbe. */
export const BOND_HELD = 0.5;

/** Ce qu'un moment de dressage rapporte, au mieux. */
export const TRAIN_GAIN = 11;

/** Ce que le contentement gagne quand le besoin du jour est couvert. */
export const CONTENT_GAIN = 14;

/**
 * Ce que le contentement perd dans une année sans rien, à besoin plein.
 *
 * S'ajoute à la dérive que `advancePets` applique depuis toujours (trois à dix
 * points par an). À dix-sept, les deux ensemble vidaient un chien en deux ans
 * et **cinquante-neuf bêtes sur soixante** finissaient retirées : ne rien
 * faire n'était pas une façon de jouer, c'était une confiscation.
 */
export const CONTENT_DROP = 11;

/** La part de la perte qui tombe même sur une espèce peu exigeante. */
export const CONTENT_FLOOR = 0.3;

/* ------------------------------------------------------------------ */
/* Ce que ça rend                                                      */
/* ------------------------------------------------------------------ */

/** Le stress qu'un lien complet retire chaque année. */
export const CALM = 8;

/** La part du calme qui demande que la bête soit dressée. */
export const CALM_TRAINED = 0.35;

/** Le bonheur qu'une bête malheureuse coûte chaque année, au pire. */
export const NEGLECT_STING = 7;

/** En dessous, la bête est malheureuse et cela se voit. */
export const MISERY = 30;

/** En dessous, ce n'est plus de l'ennui, et quelqu'un finit par le voir. */
export const MISERY_DEEP = 12;

/** Le nombre d'années de misère profonde au bout desquelles on la perd. */
export const MISERY_YEARS = 4;

/**
 * Le besoin d'espèce en dessous duquel personne ne vient rien reprendre.
 *
 * On retire un chien qui hurle et tourne en rond dans une cour ; on ne retire
 * pas une tortue qui s'ennuie, parce que personne ne le voit. C'est le second
 * garde-fou : sans lui, toutes les espèces étaient confisquées au même rythme,
 * y compris celles dont le malheur ne se remarque pas.
 */
export const MISERY_SEEN = 0.5;

/* ------------------------------------------------------------------ */
/* Les ennuis                                                          */
/* ------------------------------------------------------------------ */

/** La probabilité d'ennui pour une bête très exigeante, jamais dressée. */
export const TROUBLE = 0.3;

/** Ce qu'un ennui coûte, en part du coût d'entretien annuel. */
export const TROUBLE_COST = 1.4;

export const TROUBLES = [
  'a mis la maison à l’envers pendant que tu n’étais pas là.',
  'a détruit quelque chose que tu tenais.',
  'a mordu quelqu’un qui n’avait rien demandé.',
  's’est enfuie, et il a fallu deux jours pour la retrouver.',
  'a coûté une note que tu n’avais pas prévue.',
];

/* ------------------------------------------------------------------ */
/* Ce que l'attention achète en années                                 */
/* ------------------------------------------------------------------ */

/**
 * De combien une bête bien tenue voit sa fin reculer.
 *
 * C'est l'arbitrage central : le lien n'achète pas des points, il achète du
 * temps. Une bête au mieux meurt à peu près deux fois moins souvent qu'une
 * bête laissée, ce qui, sur une espèce de treize ans, fait plusieurs années
 * de différence — assez pour se mesurer, jamais assez pour la rendre
 * immortelle.
 */
export const KEPT_WELL = 0.55;

/** Ce que l'abandon ajoute à la même probabilité. */
export const KEPT_BADLY = 1.6;

/**
 * Ce qui compose « bien tenue », en trois parts.
 *
 * Les trois comptent, et c'est délibéré : le lien seul ne suffit pas, le
 * contentement seul non plus. Sortir un chien tous les ans lui donne du lien
 * et du contentement, et laisse sa santé filer — la mesure montrait qu'un
 * promeneur pur obtenait exactement le même résultat qu'un joueur attentif,
 * parce que la santé ne pesait sur rien. Chaque soin couvre une part
 * différente ; aucun ne les couvre toutes.
 */
export const BOND_SHARE = 0.35;
export const CONTENT_SHARE = 0.4;
export const HEALTH_SHARE = 0.25;

/** Ce que l'état perd en moins chaque année quand on s'en occupe. */
export const CARE_HEALTH = 3.5;

/* ------------------------------------------------------------------ */
/* S'en séparer                                                        */
/* ------------------------------------------------------------------ */

/** Le chagrin d'une séparation quand il n'y avait aucun lien. */
export const PART_FLOOR = 4;

/** Ce que le chagrin devient quand le lien était entier. */
export const PART_FULL = 26;

/** La part du chagrin qu'évite le fait de savoir où elle est. */
export const ENTRUST_RELIEF = 0.45;

/** Ce que confier une bête ajoute à la relation de celui qui la prend. */
export const ENTRUST_WARMTH = 12;

/** Ce que rendre une bête coûte en conscience, au plus. */
export const SURRENDER_KARMA = 9;

/** Ce que la mort d'une bête coûte, quand il n'y avait rien. */
export const GRIEF_FLOOR = 6;

/** Ce que la même mort coûte quand le lien était entier. */
export const GRIEF_FULL = 30;
