/**
 * La route — porter quelque chose d'un endroit où il ne vaut rien à un
 * endroit où il vaut cher.
 *
 * **Ce que ce fichier ouvre.** Le milieu du jeu sait déjà beaucoup : un carnet
 * de contacts, des services qu'on achète, des missions qu'on joue, une
 * chaleur qui monte et une enquête qui finit par tomber. Il ne sait pas
 * **commercer**. `underworld.ts` n'a ni marchandise, ni prix, ni endroit :
 * on y rend des services, on n'y transporte rien.
 *
 * Le seul arbitrage marchand du jeu est celui des objets (`objects.ts`) :
 * acheter à l'aveugle, faire expertiser, revendre aux enchères. Il est bon, et
 * il est d'une autre nature — on y parie sur **ce qu'une chose est**, jamais
 * sur **où elle est**.
 *
 * Ce fichier ajoute la seconde : un prix qui dépend du lieu, une charge qu'on
 * porte, et une chaleur qui monte tant qu'on l'a sur soi.
 *
 * Trois principes.
 *
 * **1. Le lieu fait le prix.** Sept régions existent déjà et ont chacune un
 * caractère — capitale, littoral, bassin industriel, campagne, pôle
 * technologique, montagne, couronne périurbaine. Chacune produit ce qui est
 * banal chez elle et réclame ce qui ne l'est pas. Lire cette carte est la
 * seule compétence demandée.
 *
 * **2. La dernière caisse rapporte moins et coûte plus.** La chaleur monte
 * avec le carré de ce qu'on porte : à moitié plein on paie le quart, à plein
 * on paie tout.
 *
 * Ce que la mesure dit exactement — douze ans, quarante vies, selon la part de
 * la capacité qu'on remplit :
 *
 *     charge | gagné | par passage | contrôlés | arrêté | ans en détention
 *       20 % |  7 053 |      1 076 |         0 |      0 |             0,00
 *       40 % | 14 019 |      1 958 |        11 |      2 |             0,08
 *       60 % | 19 496 |      2 754 |        32 |      9 |             0,34
 *       80 % | 24 709 |      3 439 |        52 |     13 |             0,89
 *      100 % | 29 271 |      3 916 |        69 |     16 |             1,32
 *
 * **Charger davantage rapporte toujours davantage d'argent** — il faut le dire
 * ainsi plutôt que de prétendre à un optimum que la mesure ne montre pas. Ce
 * qui plie, c'est le rendement (+82 % en passant d'un cinquième aux deux
 * cinquièmes, +14 % seulement des quatre cinquièmes au plein) et surtout le
 * prix : une année et demie de détention par vie au maximum, aucune au
 * cinquième. La décision n'est donc pas « quelle quantité rapporte le plus »
 * mais « combien d'années je suis prêt à risquer » — et ces années-là,
 * l'argent ne les rachète pas.
 *
 * **3. La route qui marche cesse de marcher.** Les prix dérivent chaque
 * année, et un écart exploité se referme. On ne peut pas apprendre une route
 * une fois pour toutes ; il faut relire.
 *
 * **Sur la fiction.** Les marchandises sont inventées, et volontairement
 * quelconques : des pièces sans numéro, des montres de contrefaçon, de la
 * verrerie sans papiers. Aucune substance, aucune arme, aucune méthode. Rien
 * ici ne décrit comment se procurer, dissimuler ou écouler quoi que ce soit
 * de réel — le jeu ne modélise qu'un écart de prix entre deux endroits et le
 * risque de se faire remarquer en le comblant.
 */

/* ------------------------------------------------------------------ */
/* Ce qu'on porte                                                      */
/* ------------------------------------------------------------------ */

export interface Good {
  id: string;
  label: string;
  emoji: string;
  /** Le prix de référence d'une unité, avant l'effet du lieu. */
  base: number;
  /**
   * L'encombrement d'une unité.
   *
   * Ce qui limite n'est pas l'argent mais la place : une caisse de verrerie
   * occupe ce que dix montres n'occupent pas.
   */
  bulk: number;
  /** Ce qu'une unité attire d'attention. */
  notice: number;
  /** Les régions où c'est banal, donc bon marché. */
  from: string[];
  /** Les régions où ça manque, donc cher. */
  to: string[];
  line: string;
}

/**
 * Six marchandises inventées.
 *
 * Chacune a un profil différent sur trois axes — la marge, l'encombrement et
 * l'attention — et **aucune n'en domine une autre sur les trois à la fois** :
 * un test le vérifie, parce qu'une marchandise dominée est un choix que rien
 * ne justifie, c'est-à-dire du décor. La verrerie paie bien et remplit tout ;
 * les montres ne prennent aucune place et se remarquent ; le minerai est
 * lourd, discret et pauvre.
 */
export const GOODS: Good[] = [
  {
    // Discrètes, et c'est tout leur intérêt : les semences les dominaient sur
    // les trois axes à la fois — plus chères, moins encombrantes et moins
    // voyantes — ce qui faisait d'elles un choix que rien ne justifiait.
    id: 'pieces', label: 'Pièces sans numéro', emoji: '⚙️',
    base: 240, bulk: 2, notice: 0.6,
    from: ['industrial'], to: ['rural', 'mountain'],
    line: 'Des pièces d’usine dont personne n’a noté la provenance.',
  },
  {
    id: 'montres', label: 'Montres de contrefaçon', emoji: '⌚',
    base: 90, bulk: 0.4, notice: 1.6,
    from: ['coastal'], to: ['capital', 'tech'],
    line: 'Elles ressemblent beaucoup, de loin, à quelque chose de cher.',
  },
  {
    id: 'verrerie', label: 'Verrerie sans papiers', emoji: '🏺',
    base: 620, bulk: 5, notice: 0.8,
    from: ['rural', 'mountain'], to: ['capital'],
    line: 'Vieille, jolie, et sans le moindre document qui dise d’où elle sort.',
  },
  {
    id: 'minerai', label: 'Minerai non déclaré', emoji: '🪨',
    base: 130, bulk: 6, notice: 0.5,
    from: ['mountain'], to: ['industrial', 'tech'],
    line: 'Lourd, terne, et parfaitement inintéressant pour qui le croise.',
  },
  {
    id: 'semences', label: 'Semences sous licence', emoji: '🌱',
    base: 300, bulk: 1.5, notice: 0.9,
    from: ['tech'], to: ['rural', 'coastal'],
    line: 'Des sacs qu’on n’a normalement pas le droit de revendre.',
  },
  {
    id: 'bobines', label: 'Bobines introuvables', emoji: '🎞️',
    base: 480, bulk: 1.2, notice: 1.3,
    from: ['capital'], to: ['suburban', 'coastal'],
    line: 'Des films que plus personne n’est censé posséder.',
  },
];

export function getGood(id: string): Good | undefined {
  return GOODS.find((g) => g.id === id);
}

/* ------------------------------------------------------------------ */
/* Le prix du lieu                                                     */
/* ------------------------------------------------------------------ */

/** Ce qu'on paie là où c'est banal, en part du prix de référence. */
export const CHEAP = 0.62;

/** Ce qu'on en tire là où ça manque. */
export const DEAR = 1.48;

/**
 * L'amplitude de la dérive annuelle, en part du prix.
 *
 * C'est elle qui interdit d'apprendre une route une fois pour toutes. Assez
 * large pour qu'une bonne route se referme, assez étroite pour qu'une carte
 * lue l'an dernier reste à peu près vraie.
 */
export const DRIFT = 0.22;

/** Ce qu'un passage referme de l'écart, sur la région où l'on a vendu. */
export const CLOSES = 0.11;

/** L'écart ne se referme jamais complètement : le plancher du multiplicateur. */
export const FLOOR = 0.55;

/** Ni ne s'ouvre indéfiniment. */
export const CEILING = 1.9;

/* ------------------------------------------------------------------ */
/* Ce qu'on peut porter                                                */
/* ------------------------------------------------------------------ */

/** La place dont on dispose à pied. */
export const HOLD_BASE = 6;

/** Ce qu'un véhicule ajoute de place. */
export const HOLD_VEHICLE = 14;

/** Ce qu'un contact bien placé ajoute encore. */
export const HOLD_CONTACT = 8;

/* ------------------------------------------------------------------ */
/* La chaleur                                                          */
/* ------------------------------------------------------------------ */

/**
 * Ce que porter attire d'attention, par an.
 *
 * Le terme est **quadratique** en encombrement : la seconde caisse coûte trois
 * fois ce qu'a coûté la première. C'est ce qui fait qu'il existe une bonne
 * quantité, et donc une décision — sans quoi le jeu se résumerait à « prendre
 * le maximum à chaque fois ».
 */
export const HEAT_SCALE = 0.42;

/** L'exposant de la charge dans le calcul de la chaleur. */
export const HEAT_CURVE = 2;

/**
 * Ce qu'une vente ajoute d'attention, quoi qu'on ait porté.
 *
 * Calibré contre un mécanisme qui existait déjà et que j'avais ignoré :
 * `underworld.ts#advanceUnderworld` **refroidit chaque année, sans condition**,
 * de `4 + (100 − chaleur) / 22` — soit environ 8,5 points à froid. Une vente à
 * trois points était donc invisible pour la police : mesuré, deux cent
 * soixante-seize passages laissaient une chaleur moyenne de **zéro** et
 * n'attiraient **aucun contrôle**. Le frein du système n'existait pas.
 *
 * Il n'y a pas de refroidissement propre à la route : celui du milieu suffit,
 * et en ajouter un second aurait refroidi deux fois.
 */
export const HEAT_SALE = 9;

/**
 * Ce qu'une pleine charge ajoute d'attention à la vente, en plus du forfait.
 *
 * **C'est ici que vit la courbe**, et il a fallu une mesure pour s'en
 * apercevoir. Le terme quadratique n'existait d'abord que dans le coût annuel
 * de ce qu'on garde sur les bras — or la façon normale de jouer est d'acheter
 * et de partir dans la même année, si bien que ce coût n'était jamais payé.
 * Le principe central du système (« la dernière caisse coûte bien plus que la
 * première ») était écrit dans un chemin de code que personne n'empruntait, et
 * la mesure donnait ce qu'elle devait donner : le gain croissait tout droit
 * avec la charge, et prendre le maximum était toujours juste.
 */
export const HEAT_LOAD = 15;

/* ------------------------------------------------------------------ */
/* Se faire prendre                                                    */
/* ------------------------------------------------------------------ */

/**
 * La probabilité d'un contrôle, à chaleur maximale et pleine charge.
 *
 * Un contrôle ne mène pas à l'arrestation : il fait perdre la cargaison. C'est
 * la sanction ordinaire, et elle suffit — perdre trois mille de marchandise
 * est plus dissuasif qu'une menace lointaine.
 */
export const STOPPED = 0.34;

/** En dessous de cette chaleur, on ne contrôle personne. */
export const STOP_FLOOR = 14;

/**
 * La part des contrôles qui tournent mal.
 *
 * Le reste du temps on perd la cargaison et l'on repart. Ici, l'affaire
 * remonte : c'est `justice.ts#arrest` qui prend la suite, avec la procédure
 * abstraite qui existe déjà.
 */
export const STOP_ARREST = 0.28;

export const STOP_LINES = [
  'Un contrôle de routine, au mauvais endroit et au mauvais moment.',
  'Quelqu’un a parlé. Tu ne sauras jamais qui.',
  'Une vérification qui ne devait rien donner, et qui a donné.',
  'Tu as été suivi depuis le départ, et tu ne l’as pas vu.',
];
