/**
 * Partir avec quelqu'un.
 *
 * **Ce que ce fichier ouvre.** Les vacances existent depuis longtemps :
 * quatorze destinations, un prix, un risque d'incident, du bonheur et du
 * stress en moins, et un lieu qui reste dans `seenPlaces`. On part **seul**,
 * toujours, et le catalogue le disait en six mots : « les vacances existent
 * mais sans compagnon ».
 *
 * C'est une absence qui pèse plus qu'il n'y paraît. Un voyage est la seule
 * chose du jeu qui prenne un **bloc de temps avec une seule personne** — pas
 * une conversation, pas un dîner : trois semaines. Le reste du système
 * relationnel avance par petits gestes annuels ; il n'y avait rien qui
 * ressemble à vivre ensemble un moment.
 *
 * Trois principes.
 *
 * **1. Partir avec quelqu'un n'améliore pas la relation : ça la révèle.** Un
 * voyage amplifie ce qui existe déjà. Deux personnes qui s'entendent
 * reviennent avec quelque chose que dix ans de dîners n'auraient pas donné ;
 * deux personnes qui s'accordent mal reviennent **plus mal qu'au départ**.
 * C'est ce qui empêche d'emmener celui qu'on aime le moins pour lui remonter
 * son chiffre.
 *
 * **2. L'accord ne se lit pas dans la relation.** Ce n'est pas parce qu'on
 * s'aime qu'on voyage bien ensemble. L'accord tient au caractère de l'autre
 * **et à la destination** : un temperament vif supporte mal trois semaines de
 * route, quelqu'un de peu sociable n'a rien à faire dans une capitale. Il faut
 * donc regarder qui l'on emmène et où — et c'est la seule adresse demandée.
 *
 * **3. Il se passe quelque chose.** Un séjour n'est pas un virement de points :
 * une situation arrive, on tranche, et c'est ce choix-là dont la relation se
 * souvient. Les mêmes options n'ont pas les mêmes suites selon la personne
 * qui est en face.
 *
 * **La classe de voyage** est la quatrième chose que le catalogue réclamait :
 * elle achète du confort — moins d'incidents, davantage de ce que le séjour
 * rend — et elle coûte, par personne.
 */

/* ------------------------------------------------------------------ */
/* La classe                                                           */
/* ------------------------------------------------------------------ */

export interface TripClass {
  id: string;
  label: string;
  emoji: string;
  /** Ce que ça multiplie le prix, par personne. */
  price: number;
  /** Ce qu'il reste du risque d'incident. */
  risk: number;
  /** Ce que ça multiplie ce que le séjour rend. */
  worth: number;
  line: string;
}

export const CLASSES: TripClass[] = [
  {
    id: 'petit', label: 'Au plus juste', emoji: '🎒',
    price: 0.62, risk: 1.55, worth: 0.82,
    line: 'On dort mal, on marche beaucoup, et il arrive des choses.',
  },
  {
    id: 'normal', label: 'Sans se priver', emoji: '🧳',
    price: 1, risk: 1, worth: 1,
    line: 'Ce que tout le monde fait, et ça se passe généralement bien.',
  },
  {
    id: 'grand', label: 'En grand', emoji: '🛎️',
    price: 2.1, risk: 0.42, worth: 1.28,
    line: 'Tout est prévu, tout est réglé, et il ne se passe presque rien.',
  },
];

export function getTripClass(id: string): TripClass | undefined {
  return CLASSES.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce qu'une destination demande                                       */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un séjour réclame de celui qu'on emmène, entre 0 et 1.
 *
 * `endure` : combien il faut de patience — la route, l'imprévu, le sac.
 * `mingle` : combien il faut aimer les gens et le bruit.
 * `still`  : combien il faut savoir ne rien faire.
 *
 * Les identifiants sont ceux de `data/activities.ts#DESTINATIONS`. Une
 * destination absente de ce tableau prend le profil moyen, ce qui laisse le
 * catalogue de voyages grandir sans casser ce fichier.
 */
export interface TripDemand {
  endure: number;
  mingle: number;
  still: number;
}

export const DEMANDS: Record<string, TripDemand> = {
  staycation: { endure: 0.05, mingle: 0.1, still: 0.95 },
  camping: { endure: 0.75, mingle: 0.25, still: 0.45 },
  beach: { endure: 0.15, mingle: 0.4, still: 0.85 },
  city: { endure: 0.35, mingle: 0.85, still: 0.15 },
  mountain: { endure: 0.7, mingle: 0.2, still: 0.4 },
  roadtrip: { endure: 0.9, mingle: 0.45, still: 0.1 },
};

export const DEFAULT_DEMAND: TripDemand = { endure: 0.4, mingle: 0.45, still: 0.4 };

export function demandOf(destinationId: string): TripDemand {
  return DEMANDS[destinationId] ?? DEFAULT_DEMAND;
}

/* ------------------------------------------------------------------ */
/* L'accord                                                            */
/* ------------------------------------------------------------------ */

/**
 * Comment se compose l'entente avec la destination.
 *
 * `WORST_WEIGHT` domine : ce qui gâche un voyage n'est pas la moyenne mais la
 * seule exigence qui n'est pas couverte. Voir `systems/trip.ts#fitFor` pour ce
 * que la première version, purement moyennée, a donné.
 */
export const MEAN_WEIGHT = 0.35;
export const WORST_WEIGHT = 0.65;

/**
 * L'étirement final de l'entente autour du milieu.
 *
 * Les traits de caractère se pressent autour de cinquante, et toute
 * combinaison les y ramène : mesuré sans ce contraste, **aucune paire sur
 * quatre cents** n'atteignait la plus haute des cinq appréciations, et 96 %
 * tenaient dans deux bandes sur cinq. Un jugement qui dit la même chose de
 * tout le monde ne se lit pas.
 */
export const CONTRAST = 1.9;

/**
 * Ce que pèse la façon dont on a pris la situation du séjour.
 *
 * Volontairement plus petit que l'entente : c'est elle qui décide du signe, et
 * le geste qui décide de combien. Près du seuil, les deux se valent — un
 * voyage juste à la limite se joue donc sur ce qu'on a fait là-bas, ce qui est
 * exactement ce qu'on veut.
 */
export const GESTURE_WEIGHT = 0.55;

/** Ce que la relation de départ pèse dans l'accord, au plus. */
export const BOND_WEIGHT = 0.35;

/** Ce que le caractère et la destination pèsent. */
export const FIT_WEIGHT = 0.65;

/**
 * L'accord en dessous duquel le séjour abîme la relation.
 *
 * Volontairement au-dessus du milieu : un voyage raté est plus fréquent qu'un
 * voyage réussi quand on choisit mal, sans quoi emmener n'importe qui serait
 * sans conséquence et le choix ne vaudrait rien.
 */
export const SOURS_UNDER = 0.46;

/** Ce que le meilleur accord possible rapporte à la relation. */
export const BEST_GAIN = 26;

/**
 * Ce que le pire accord lui coûte.
 *
 * À dix-neuf, le geste du séjour l'emportait et **même les mauvaises ententes
 * rapportaient** (+6,3 mesuré) — la promesse « on revient plus mal qu'au
 * départ » était fausse. À vingt-huit, l'entente décide du signe.
 */
export const WORST_LOSS = 28;

/** Ce que le séjour rend au joueur en plus, quand ça se passe bien. */
export const SHARED_JOY = 7;

export const ACCORD_BANDS: { under: number; says: string }[] = [
  { under: 0.3, says: 'Vous n’avez rien à faire ensemble là-bas.' },
  { under: SOURS_UNDER, says: 'Ça risque de mal tourner.' },
  { under: 0.62, says: 'Ça devrait aller, sans plus.' },
  { under: 0.8, says: 'Vous vous entendrez bien là-bas.' },
  { under: Infinity, says: 'C’est exactement le voyage qu’il vous faut.' },
];

/* ------------------------------------------------------------------ */
/* Ce qui arrive là-bas                                                */
/* ------------------------------------------------------------------ */

export interface TripMoment {
  id: string;
  brief: string;
  options: {
    label: string;
    /** Ce que ça donne à la relation, avant l'accord. */
    bond: number;
    /** Le trait de l'autre qui décide si le geste tombe juste. */
    reads: 'warmth' | 'temper' | 'sociability' | 'discipline' | 'generosity';
    /** Quand le trait est haut, le geste vaut-il mieux ou moins ? */
    likes: boolean;
    outcome: string;
  }[];
}

/**
 * Cinq situations, et le même geste ne vaut pas la même chose selon qui est
 * en face. C'est ce qui distingue un séjour d'un virement de points.
 */
export const MOMENTS: TripMoment[] = [
  {
    id: 'perdus',
    brief: 'Vous êtes perdus depuis deux heures et il commence à faire nuit.',
    options: [
      {
        label: 'Demander de l’aide à quelqu’un',
        bond: 6, reads: 'sociability', likes: true,
        outcome: 'On vous remet sur la route, et vous en riez le soir.',
      },
      {
        label: 'Continuer, ça finira bien par tomber',
        bond: 5, reads: 'temper', likes: false,
        outcome: 'Vous arrivez tard, fatigués, et pas d’accord sur qui avait raison.',
      },
    ],
  },
  {
    id: 'note',
    brief: 'L’addition est bien plus lourde que prévu, et vous n’aviez rien dit sur qui paie.',
    options: [
      {
        label: 'Payer sans commentaire',
        bond: 8, reads: 'generosity', likes: false,
        outcome: 'L’autre n’a rien dit non plus, et s’en souviendra.',
      },
      {
        label: 'Proposer de partager',
        bond: 4, reads: 'discipline', likes: true,
        outcome: 'C’est réglé en trois phrases, comme il se doit.',
      },
    ],
  },
  {
    id: 'seul',
    brief: 'L’autre veut passer la journée seul de son côté.',
    options: [
      {
        label: 'Tant mieux, tu en profites aussi',
        bond: 7, reads: 'sociability', likes: false,
        outcome: 'Vous vous retrouvez le soir avec quelque chose à raconter.',
      },
      {
        label: 'Le prendre un peu mal',
        bond: -4, reads: 'warmth', likes: true,
        outcome: 'La soirée est plus courte que les autres.',
      },
    ],
  },
  {
    id: 'malade',
    brief: 'L’autre tombe malade au milieu du séjour.',
    options: [
      {
        label: 'Rester avec lui toute la journée',
        bond: 11, reads: 'warmth', likes: true,
        outcome: 'Ce n’était pas grave. Ce que tu as fait, si.',
      },
      {
        label: 'Sortir quand même, il dort',
        bond: -6, reads: 'temper', likes: false,
        outcome: 'Tu as vu de belles choses, et il l’a remarqué.',
      },
    ],
  },
  {
    id: 'dispute',
    brief: 'Une remarque de trop, et le ton monte pour rien.',
    options: [
      {
        label: 'Laisser passer',
        bond: 6, reads: 'temper', likes: true,
        outcome: 'Le lendemain, personne n’y repense.',
      },
      {
        label: 'Aller au bout de la discussion',
        bond: 9, reads: 'warmth', likes: true,
        outcome: 'C’était pénible, et c’est réglé pour de bon.',
      },
    ],
  },
];

export function getMoment(id: string): TripMoment | undefined {
  return MOMENTS.find((m) => m.id === id);
}

/** Ce que le geste rapporte au plus quand il tombe juste. */
export const READS_WELL = 1.7;

/** Et ce qu'il en reste quand il tombe à côté. */
export const READS_BADLY = 0.25;
