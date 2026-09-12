/**
 * La séparation.
 *
 * Le catalogue disait deux choses de la même procédure : « le partage se
 * calcule seul : aucun avocat, aucune garde à négocier » et « un divorce ne
 * décide jamais de qui garde les enfants ». En lisant `divorce()`, c'est
 * pire que ça : les enfants mineurs sont **comptés** — pour fixer une
 * pension — puis laissés exactement où ils étaient. Le divorce du jeu
 * partageait l'argent et rien d'autre.
 *
 * Or c'est la seule décision du jeu qui touche à quatre systèmes déjà
 * construits à la fois :
 *
 * - **l'éducation des enfants** : qui les garde décide qui les élève, donc
 *   ce qu'ils deviennent (`systems/upbringing.ts`) ;
 * - **la lignée** : donc qui l'on jouera après (`systems/lineage.ts`) ;
 * - **les inimitiés** : un divorce mal mené laisse un ennemi durable
 *   (`systems/grudges.ts`) ;
 * - **les finances** : la pension va dans un sens ou dans l'autre.
 *
 * La règle qui gouverne le tout : **on ne peut pas tout garder**. L'argent,
 * les enfants et la paix se disputent la même procédure ; se battre pour
 * l'un se paie sur les autres. Sans cet arbitrage, choisir un avocat ne
 * serait qu'acheter un meilleur résultat.
 */

/** Qui vous représente. */
export interface Counsel {
  id: string;
  label: string;
  emoji: string;
  note: string;
  /** Ce que ça coûte, avant ajustement au pays. */
  cost: number;
  /** Ce que ça pèse dans le partage et devant le juge. */
  weight: number;
}

export const COUNSELS: Counsel[] = [
  {
    id: 'aucun', label: 'Te défendre toi-même', emoji: '🙍',
    note: 'Gratuit. Tu signes ce qu’on te présente.',
    cost: 0, weight: 0.72,
  },
  {
    id: 'commis', label: 'L’avocat qu’on te donne', emoji: '📄',
    note: 'Il a quarante dossiers comme le tien. Il fera correctement.',
    cost: 2_400, weight: 1,
  },
  {
    id: 'cabinet', label: 'Un cabinet qui coûte cher', emoji: '💼',
    note: 'Il connaît le juge, et le juge le connaît.',
    cost: 14_000, weight: 1.34,
  },
];

export function getCounsel(id: string): Counsel | undefined {
  return COUNSELS.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Comment on s'y prend                                                */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on va chercher.
 *
 * C'est ici qu'est l'arbitrage : la procédure ne donne pas tout à la même
 * personne, et il faut dire ce qui compte. Se battre pour les enfants coûte
 * de l'argent ; se battre pour l'argent coûte les enfants et la paix.
 */
export interface Posture {
  id: string;
  label: string;
  emoji: string;
  note: string;
  /** Ce que ça ajoute à la garde. */
  custody: number;
  /** Ce que ça ajoute à la part de patrimoine gardée. */
  purse: number;
  /** Ce que ça laisse à l'autre, en rancune. */
  bitterness: number;
  /** Ce que ça coûte en nerfs. */
  stress: number;
}

export const POSTURES: Posture[] = [
  {
    id: 'amiable', label: 'Régler ça à l’amiable', emoji: '🤝',
    note: 'Personne ne gagne, personne ne saigne. Vous vous reparlerez peut-être.',
    custody: 0, purse: 0, bitterness: -12, stress: 4,
  },
  {
    id: 'enfants', label: 'Te battre pour les enfants', emoji: '🧒',
    note: 'Tu lâches sur le reste. C’est le reste qui paiera.',
    custody: 0.3, purse: -0.12, bitterness: 10, stress: 14,
  },
  {
    id: 'argent', label: 'Te battre pour ce que tu as', emoji: '💰',
    note: 'Tu gardes ce que tu as bâti. On te le fera payer ailleurs.',
    custody: -0.22, purse: 0.18, bitterness: 16, stress: 12,
  },
  {
    id: 'tout', label: 'Ne rien lâcher du tout', emoji: '⚔️',
    note: 'Deux ans de procédure. Tu peux tout emporter, ou tout perdre.',
    custody: 0.16, purse: 0.1, bitterness: 30, stress: 26,
  },
];

export function getPosture(id: string): Posture | undefined {
  return POSTURES.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* La garde                                                            */
/* ------------------------------------------------------------------ */

/** Comment les enfants se répartissent. */
export type Custody = 'moi' | 'partagée' | 'lui';

/**
 * Ce que le juge regarde, en plus des avocats.
 *
 * Le poids le plus lourd va à **ce qu'on a fait de leur enfance** : le jeu
 * tient déjà ce compte (`systems/upbringing.ts`, `attention`), et c'est la
 * seule mesure honnête de qui s'en est occupé. Un parent absent qui paie un
 * cabinet peut l'emporter, mais il lui faut vraiment payer.
 */
export const CARE_WEIGHT = 1.1;
export const KARMA_WEIGHT = 0.35;
export const RECORD_PENALTY = 0.4;

/** Les seuils de partage, sur un score de -1 à +1. */
export const KEEPS_ALL = 0.22;
export const LOSES_ALL = -0.22;

/* ------------------------------------------------------------------ */
/* Les nombres                                                         */
/* ------------------------------------------------------------------ */

/** La part du patrimoine liquide en jeu, avant tout le reste. */
export const AT_STAKE = 0.5;

/** Ce que coûte une pension, par enfant et par an. */
export const PER_CHILD = 3_600;

/**
 * Ce qu'une procédure longue prend d'années.
 *
 * « Ne rien lâcher » n'est pas gratuit en temps non plus : c'est ce qui
 * empêche cette option d'être simplement la meilleure.
 */
export const DRAG = { amiable: 0, enfants: 1, argent: 1, tout: 2 } as const;
