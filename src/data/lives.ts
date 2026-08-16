/**
 * Ce que les autres font pendant qu'on ne les regarde pas.
 *
 * Le catalogue disait « la vie des PNJ est figée hors du champ du joueur ».
 * Une mesure sur soixante vies et 3 588 personnes a dit à quel point :
 *
 *     mariage        0 %      naissances     0 %
 *     prison         0 %      maladie        0 %
 *     déménagement   0 %      métier changé  2,8 %
 *     ruine       53,9 %      sans une seule ligne d'histoire  49,2 %
 *
 * Personne autour du joueur ne se mariait, n'avait d'enfant, ne tombait
 * malade ni n'allait en prison — jamais, en quatre mille années jouées. La
 * moitié des gens qu'il connaissait n'avait littéralement rien vécu, et plus
 * de la moitié finissait ruinée, non par malchance mais par une soustraction
 * annuelle sans plancher.
 *
 * Ce fichier tient les tournants qu'une vie peut prendre, et les nombres qui
 * font qu'ils s'additionnent en une vie plausible. La mécanique de chacun est
 * dans `systems/lives.ts` : il n'y en a que quatorze, et chacun demande un
 * vrai branchement — on ne peut pas naître « par table ».
 *
 * Le principe qui gouverne le tout : **on n'apprend pas tout de tout le
 * monde**. Le tournant d'un frère passe dans le journal du joueur ; celui
 * d'un cousin s'inscrit dans son histoire à lui, et le joueur ne le découvre
 * qu'en allant voir sa fiche. C'est ce qui distingue un monde vivant d'un
 * fil d'actualité.
 */

import type { Personality, Stats } from '../engine/types.ts';

/** La part de la vie que le tournant concerne. */
export type Sphere = 'métier' | 'cœur' | 'famille' | 'corps' | 'loi' | 'lieu';

/** Les quatorze tournants. Chacun a son branchement dans le système. */
export type TurnId =
  | 'embauche' | 'promotion' | 'reconversion' | 'licenciement'
  | 'affaire' | 'revers'
  | 'rencontre' | 'mariage' | 'rupture'
  | 'naissance'
  | 'maladie' | 'guerison'
  | 'condamnation' | 'depart';

export interface Turn {
  id: TurnId;
  sphere: Sphere;
  /** Ce qui s'inscrit dans son histoire à lui. `{p}` = son prénom. */
  line: string;
  /** Ce que le joueur en apprend, s'il est assez proche pour l'apprendre. */
  told: string;
  tone: 'good' | 'bad' | 'neutral';
  /** L'âge où c'est possible. */
  from: number;
  to: number;
  /** Chance annuelle de base, avant tout ce qui la module. */
  odds: number;
  /** Les états civils qui le permettent. Absent = tous. */
  marital?: ('single' | 'dating' | 'engaged' | 'married' | 'divorced' | 'widowed')[];
  /** Faut-il un emploi, ou justement ne pas en avoir ? */
  job?: 'oui' | 'non';
  /** Le trait qui y pousse : la chance est multipliée par lui. */
  driver?: keyof Personality;
  /** La statistique qui y pousse, et de combien. */
  push?: { stat: keyof Stats; weight: number };
  /** Ce que le tournant fait à ses statistiques. */
  shifts?: Partial<Record<keyof Stats, number>>;
  /** Ce qu'il fait au lien avec le joueur. */
  bond?: number;
  /**
   * Ce tournant remonte-t-il jusqu'au joueur, seulement ?
   *
   * Non pour tout ce qui n'est pas une nouvelle : on n'apprend pas que sa
   * sœur a changé d'échelon, ni qu'elle voit quelqu'un. C'est écrit dans son
   * histoire, et cela se découvre en ouvrant sa fiche. Mesuré avant cette
   * distinction : deux cents lignes de PNJ dans le journal d'une seule vie.
   */
  quiet?: true;
  /**
   * Ce tournant porte-t-il au-delà du cercle proche ?
   *
   * Le mariage d'une cousine se sait ; sa maladie aussi. Son licenciement,
   * non — on ne l'apprend que si l'on est du premier cercle.
   */
  big?: true;
  /**
   * Peut-il déboucher sur une demande adressée au joueur ?
   *
   * Une personne qui perd son emploi, tombe malade ou entre en prison peut
   * se tourner vers celui qu'elle connaît. C'est la seule chose du système
   * qui demande une réponse — le reste se contente d'arriver.
   */
  asks?: 'argent' | 'présence';
}

/* ------------------------------------------------------------------ */
/* Les tournants                                                       */
/* ------------------------------------------------------------------ */

/**
 * Les chances sont annuelles et volontairement basses.
 *
 * Une vie de quatre-vingts ans traverse ce tableau quatre-vingts fois : à
 * 4 % l'an, un tournant arrive trois fois par vie, ce qui est déjà beaucoup
 * pour une seule personne. Le premier réglage les avait posées entre 8 et
 * 15 % « pour que ça se voie », et le journal du joueur devenait un fil
 * d'actualité où sa sœur changeait de métier tous les six ans.
 */
export const TURNS: Turn[] = [
  /* -------- Le métier -------- */
  {
    id: 'embauche', sphere: 'métier', tone: 'good',
    quiet: true,
    line: 'Trouve du travail.',
    told: '{p} a retrouvé du travail.',
    from: 18, to: 62, odds: 0.3, job: 'non',
    driver: 'ambition',
    shifts: { happiness: 10, stress: 6 },
  },
  {
    id: 'promotion', sphere: 'métier', tone: 'good',
    quiet: true,
    line: 'Monte d’un cran.',
    told: '{p} a été promu{e}.',
    from: 24, to: 62, odds: 0.055, job: 'oui',
    driver: 'ambition',
    push: { stat: 'discipline', weight: 0.6 },
    shifts: { happiness: 6, stress: 5, reputation: 3 },
  },
  {
    id: 'reconversion', sphere: 'métier', tone: 'neutral',
    quiet: true,
    line: 'Change complètement de métier.',
    told: '{p} a tout quitté pour autre chose.',
    from: 22, to: 55, odds: 0.022, job: 'oui',
    driver: 'madness',
    shifts: { happiness: 4, stress: 10 },
  },
  {
    id: 'licenciement', sphere: 'métier', tone: 'bad',
    line: 'Perd son travail.',
    told: '{p} a perdu son travail.',
    from: 20, to: 62, odds: 0.028, job: 'oui',
    push: { stat: 'addiction', weight: 0.8 },
    shifts: { happiness: -16, stress: 18, reputation: -4 },
    bond: -2, asks: 'argent',
  },
  {
    id: 'affaire', sphere: 'métier', tone: 'good',
    line: 'Réussit quelque chose qui rapporte.',
    told: '{p} a fait une belle affaire.',
    from: 25, to: 70, odds: 0.014,
    driver: 'ambition',
    shifts: { happiness: 12, reputation: 5 },
  },
  {
    id: 'revers', sphere: 'métier', tone: 'bad',
    line: 'Se fait avoir dans une affaire.',
    told: '{p} a perdu beaucoup d’argent.',
    from: 25, to: 75, odds: 0.013,
    driver: 'madness',
    shifts: { happiness: -14, stress: 16 },
    asks: 'argent',
  },

  /* -------- Le cœur -------- */
  {
    id: 'rencontre', sphere: 'cœur', tone: 'good',
    quiet: true,
    line: 'Rencontre quelqu’un.',
    told: '{p} voit quelqu’un.',
    from: 17, to: 78, odds: 0.06,
    marital: ['single', 'divorced', 'widowed'],
    driver: 'sociability',
    push: { stat: 'looks', weight: 0.5 },
    shifts: { happiness: 12 },
  },
  {
    id: 'mariage', sphere: 'cœur', tone: 'good',
    big: true,
    line: 'Se marie.',
    told: '{p} s’est marié{e}.',
    from: 19, to: 80, odds: 0.16,
    marital: ['dating', 'engaged'],
    driver: 'loyalty',
    shifts: { happiness: 14, stress: -4 },
    bond: 2,
  },
  {
    id: 'rupture', sphere: 'cœur', tone: 'bad',
    line: 'Se sépare.',
    told: '{p} s’est séparé{e}.',
    from: 19, to: 90, odds: 0.016,
    marital: ['dating', 'engaged', 'married'],
    driver: 'temper',
    shifts: { happiness: -20, stress: 16 },
    asks: 'présence',
  },

  /* -------- La famille -------- */
  {
    id: 'naissance', sphere: 'famille', tone: 'good',
    big: true,
    line: 'A un enfant.',
    told: '{p} a eu un enfant.',
    from: 19, to: 46, odds: 0.2,
    marital: ['dating', 'engaged', 'married'],
    push: { stat: 'fertility', weight: 1.1 },
    shifts: { happiness: 14, stress: 12 },
    bond: 1,
  },

  /* -------- Le corps -------- */
  {
    id: 'maladie', sphere: 'corps', tone: 'bad',
    big: true,
    line: 'Tombe malade.',
    told: '{p} est tombé{e} malade.',
    from: 4, to: 100, odds: 0.02,
    shifts: { health: -22, happiness: -14, stress: 14, fitness: -12 },
    asks: 'présence',
  },
  {
    id: 'guerison', sphere: 'corps', tone: 'good',
    quiet: true,
    line: 'S’en remet.',
    told: '{p} s’en est remis{e}.',
    from: 4, to: 100, odds: 0.46,
    push: { stat: 'health', weight: 0.35 },
    shifts: { health: 14, happiness: 12, stress: -12 },
  },

  /* -------- La loi -------- */
  {
    id: 'condamnation', sphere: 'loi', tone: 'bad',
    big: true,
    line: 'Est condamné{e}.',
    told: '{p} a été condamné{e}.',
    from: 16, to: 78, odds: 0.006,
    push: { stat: 'criminality', weight: 2.4 },
    shifts: { happiness: -24, reputation: -22, stress: 20 },
    bond: -4, asks: 'présence',
  },

  /* -------- Le lieu -------- */
  {
    id: 'depart', sphere: 'lieu', tone: 'neutral',
    big: true,
    line: 'Part vivre ailleurs.',
    told: '{p} est parti{e} vivre ailleurs.',
    from: 18, to: 72, odds: 0.005,
    driver: 'ambition',
    shifts: { stress: 8 },
    bond: -3,
  },
];

export function getTurn(id: TurnId): Turn | undefined {
  return TURNS.find((t) => t.id === id);
}

/* ------------------------------------------------------------------ */
/* Les nombres du système                                              */
/* ------------------------------------------------------------------ */

/**
 * Combien de tournants une personne peut prendre dans la même année.
 *
 * Un seul. Se marier, avoir un enfant et perdre son travail la même année
 * arrive dans la vraie vie ; dans un journal, cela se lit comme un bug.
 */
export const TURNS_PER_YEAR = 1;

/**
 * En dessous de quel lien on cesse d'être tenu au courant.
 *
 * C'est la règle qui fait la différence entre un monde et un fil
 * d'actualité : la promotion d'une connaissance ne remonte pas jusqu'à vous.
 * Elle est bien arrivée, elle est dans son histoire, et vous l'apprendrez en
 * allant la voir.
 */
export const TOLD_BOND = 45;

/**
 * Ceux dont la vie amoureuse et les enfants appartiennent au joueur.
 *
 * Son conjoint ne se marie pas de son côté et n'a pas d'enfant tout seul :
 * cette relation-là est jouée, elle a son propre système
 * (`systems/relationships.ts`). Mesuré avant cette exclusion : les enfants
 * par vie du joueur tombaient de 1,22 à 0,56, parce que son conjoint
 * divorçait spontanément dans son dos.
 *
 * Le reste de leur vie leur appartient : un conjoint peut perdre son
 * travail, tomber malade ou faire une belle affaire. C'est seulement le
 * couple qui n'est pas à eux.
 */
export const PLAYERS_OWN = ['spouse', 'partner', 'crush'];

/** Les sphères qu'on leur retire. */
export const PLAYERS_SPHERES: Sphere[] = ['cœur', 'famille'];

/** Les liens dont on apprend tout, quel que soit l'état du lien. */
export const TOLD_ALWAYS = [
  'father', 'mother', 'brother', 'sister', 'son', 'daughter',
  'spouse', 'partner',
];

/**
 * Ce que chaque enfant déjà là retire à la chance d'en avoir un autre.
 *
 * Sans cette décroissance, la chance annuelle s'appliquait à l'identique
 * pendant les vingt-sept années fertiles : mesuré, 2,38 enfants par personne
 * et **quinze pour la plus prolifique**. Une fratrie de quinze n'est pas une
 * variante rare, c'est une erreur de modèle.
 */
export const KID_FADE = 0.42;

/** Au-delà, on n'en fait plus, quelle que soit la chance. */
export const KID_CAP = 6;

/**
 * La part des histoires qui s'arrêtent sans qu'on en fasse un mariage.
 *
 * Sans elle, « en couple » était un état presque absorbant : on y entrait à
 * 16 % l'an et on n'en sortait que par le mariage. En quelques années plus
 * personne autour du joueur n'était libre, et proposer un rendez-vous à une
 * camarade ou à un collègue échouait toujours — le vivier du joueur se
 * fermait. Mesuré : mariés 51 % → 41 %, enfants par vie 1,22 → 0,71.
 *
 * Ce n'est pas un tournant : ça ne prend pas la place de l'année et ça ne
 * s'écrit nulle part. La plupart des histoires finissent sans rien laisser.
 *
 * Mais une histoire qui dure cesse d'être fragile. Le premier réglage
 * appliquait la même chance chaque année, si bien qu'aucun couple ne tenait :
 * 0,78 enfant par adulte, un monde qui se dépeuple. Ce qui churne, ce sont
 * les premières années — après quoi c'est le mariage qui devient probable.
 */
export const DRIFT_APART = 0.34;

/** Ce que chaque année ensemble retire à la chance de se quitter. */
export const DRIFT_SETTLES = 0.5;

/** Ce que chaque année ensemble ajoute à la chance de se marier. */
export const VOWS_RIPEN = 0.55;
export const VOWS_RIPE_MAX = 3.2;

/** Ce qu'une maladie retire chaque année tant qu'elle dure. */
export const ILLNESS_TOLL = 4;

/** Ce qu'un séjour en prison dure, en années. */
export const SENTENCE = { min: 1, max: 7 };

/**
 * La visite au parloir.
 *
 * Une condamnation retirait quelqu'un du jeu : on ne pouvait plus rien faire
 * avec lui pendant sept ans, et il ressortait sans que rien ne se soit passé.
 * La visite est la seule chose qu'on puisse faire pour quelqu'un qui est
 * dedans — et elle ne raccourcit pas la peine, parce que rien ne la
 * raccourcit. Elle change ce qu'il en ressort.
 */
export const VISIT = {
  /** Ce qu'elle fait au lien, une fois par an. */
  bond: 7,
  /** Ce qu'elle lui rend. */
  gives: { happiness: 11, stress: -9, karma: 2 },
  /** Ce qu'elle coûte à celui qui y va. */
  costs: { stress: 5, happiness: -3 },
  /** Ce qu'elle épargne à sa réputation à la sortie, par visite. */
  spares: 2.5,
  /** Le plafond de ce qu'on peut lui épargner. */
  sparesMax: 18,
};

/** Ce que partir loin retire au plancher du lien. */
export const FAR_FLOOR = 12;

/**
 * Ce qu'une année sans emploi coûte, en part du patrimoine.
 *
 * L'ancienne ligne retirait un montant fixe tiré de la générosité, sans
 * plancher ni rapport au patrimoine : quelqu'un de généreux et sans salaire
 * perdait la même somme chaque année jusqu'à zéro, et 53,9 % des personnes
 * du jeu y arrivaient. Une part fonctionne parce qu'elle ralentit en même
 * temps que le patrimoine fond.
 */
export const IDLE_BURN = 0.06;

/** Ce qu'une année de salaire ajoute au patrimoine. */
export const SAVE_RATE = 0.11;

/** Ce qu'une belle affaire, ou un revers, fait au patrimoine. */
export const WINDFALL = { min: 1.8, max: 5.5 };
export const SETBACK = { min: 0.25, max: 0.65 };

/** Ce qu'on demande, quand on demande. */
/**
 * On ne demande pas tous les ans, et pas plusieurs fois de suite.
 *
 * Cinq appels à l'aide par vie — c'est ce que donnait le premier réglage —
 * cessent d'être des moments : ils deviennent un impôt. Les faillites par
 * vie montaient à 0,50, à quatre centièmes de la limite du tableau
 * d'équilibrage.
 */
export const ASK_ODDS = 0.16;

/** Le nombre d'années avant que la même personne redemande. */
export const ASK_COOLDOWN = 12;
export const ASK_SHARE = 0.045;

/**
 * Le montant plancher, et le plafond qui l'empêche de nuire.
 *
 * Le plancher existe pour qu'un coup de main veuille dire quelque chose. Mais
 * seul, il transformait « une petite part de ce que tu as » en 40 % de tout
 * ce qu'a un joueur pauvre : le tableau d'équilibrage passait la limite des
 * faillites. Le plafond dit l'inverse — au-delà d'une part, on ne peut
 * simplement pas, et la scène le dit plutôt que de vider le compte.
 */
export const ASK_FLOOR = 400;
export const ASK_CEILING = 0.15;
