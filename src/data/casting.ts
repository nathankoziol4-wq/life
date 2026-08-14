/**
 * Ce qui se passe avant l'engagement : l'essai, et le book.
 *
 * Deux reproches du catalogue, tous deux sur ce qui précède le travail.
 *
 * - « Auditions » était `PARTIAL` — « on est retenu ou non selon son niveau,
 *   mais **l'essai lui-même ne se joue pas** ». Ce qu'on vous proposait était
 *   filtré silencieusement par votre métier : un rôle trop grand n'apparaissait
 *   simplement jamais, et l'on ne pouvait pas tenter sa chance ;
 * - « Agence et book » était `PARTIAL` — « l'agence existe et négocie ; **le
 *   book, non** ».
 *
 * Les deux tiennent au même principe : **on peut viser au-dessus de soi, et
 * il faut quelque chose à montrer pour le faire**.
 */

/* ------------------------------------------------------------------ */
/* L'essai                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une façon de passer un essai.
 *
 * L'arbitrage est le même dans les cinq métiers et il n'a pas de bonne
 * réponse : jouer ce qu'on attend passe souvent et ne mène nulle part ;
 * jouer contre son type passe rarement et change une carrière.
 */
export interface Approach {
  id: string;
  label: string;
  /** Ce que ça veut dire, en une phrase. */
  what: string;
  /** Ce que ça fait aux chances, en points de difficulté. Négatif = plus dur. */
  odds: number;
  /** Ce que le rôle vaut si on l'obtient, en multiplicateur de notoriété. */
  worth: number;
  /** Ce qu'il fait au métier, en multiplicateur. */
  growth: number;
  /** Ce que rater coûte au moral. */
  sting: number;
}

export const APPROACHES: Approach[] = [
  {
    id: 'sur', label: 'Jouer ce qu’on attend',
    what: 'Ce qu’ils ont en tête. Tu ne les surprendras pas, et c’est le but.',
    odds: 14, worth: 0.7, growth: 0.7, sting: 3,
  },
  {
    id: 'juste', label: 'Proposer quelque chose',
    what: 'Ta lecture à toi, sans forcer. La plupart des carrières se font là.',
    odds: 0, worth: 1, growth: 1, sting: 5,
  },
  {
    id: 'contre', label: 'Jouer contre ton type',
    what: 'Personne ne t’attend là. S’ils suivent, ils ne t’oublieront pas.',
    odds: -18, worth: 1.9, growth: 1.6, sting: 9,
  },
];

export function getApproach(id: string): Approach | undefined {
  return APPROACHES.find((a) => a.id === id);
}

/** Combien d'essais on peut passer dans une année. */
export const TRYOUTS_PER_YEAR = 2;

/** Jusqu'où au-dessus de soi on peut tenter sa chance. */
export const TRYOUT_REACH = 30;

/* ------------------------------------------------------------------ */
/* Le book                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une pièce de book.
 *
 * Ce n'est pas un compteur : un book vaut par sa **variété**, pas par son
 * épaisseur. Quatre campagnes ne remplacent pas une couverture, et c'est ce
 * qui empêche de le remplir en répétant le même contrat.
 */
export interface PieceKind {
  id: string;
  label: string;
  /** Ce que la pièce apporte au book, au mieux. */
  worth: number;
  /** L'engagement qui la produit. */
  fromTemplate: string | null;
  /** Ce qu'elle dit, en une phrase. */
  note: string;
}

export const PIECE_KINDS: PieceKind[] = [
  {
    id: 'essai', label: 'Des essais', worth: 6, fromTemplate: null,
    note: 'Une séance payée de ta poche. Ça remplit une page, pas une carrière.',
  },
  {
    id: 'catalogue', label: 'Du catalogue', worth: 9, fromTemplate: 'podium_catalogue',
    note: 'Personne ne le regarde, et tout le monde en a.',
  },
  {
    id: 'podium', label: 'Du défilé', worth: 16, fromTemplate: 'podium_local',
    note: 'La preuve que tu sais marcher, et qu’on t’a prise.',
  },
  {
    id: 'campagne', label: 'Une campagne', worth: 22, fromTemplate: 'podium_campagne',
    note: 'Six semaines dans le métro : on t’a vue sans te chercher.',
  },
  {
    id: 'couverture', label: 'Une couverture', worth: 28, fromTemplate: 'podium_magazine',
    note: 'Ce que les agences regardent en premier.',
  },
  {
    id: 'haute', label: 'Un grand défilé', worth: 32, fromTemplate: 'podium_defile',
    note: 'Quatre minutes qui valent un an de catalogue.',
  },
  {
    id: 'egerie', label: 'Une maison', worth: 40, fromTemplate: 'podium_egerie',
    note: 'Un visage attaché à un nom. C’est le sommet du métier.',
  },
];

export function getPieceKind(id: string): PieceKind | undefined {
  return PIECE_KINDS.find((p) => p.id === id);
}

/** La pièce qu'un engagement produit, s'il en produit une. */
export function pieceFor(templateId: string): PieceKind | undefined {
  return PIECE_KINDS.find((p) => p.fromTemplate === templateId);
}

/**
 * À partir de quand une pièce cesse de compter pleinement.
 *
 * Un book vieillit : montrer une couverture d'il y a douze ans dit surtout
 * qu'on n'a rien fait depuis.
 */
export const PIECE_FRESH = 6;
export const PIECE_STALE = 14;

/** Ce que vaut une pièce compte tenu de son âge. */
export function pieceValue(kind: PieceKind, quality: number, age: number): number {
  const freshness = age <= PIECE_FRESH
    ? 1
    : Math.max(0.2, 1 - (age - PIECE_FRESH) / (PIECE_STALE - PIECE_FRESH));
  return kind.worth * (0.45 + (quality / 100) * 0.75) * freshness;
}

/** Comment se lit un book. */
export function bookLabel(strength: number): string {
  if (strength < 12) return 'Presque vide';
  if (strength < 30) return 'Un début';
  if (strength < 50) return 'On peut le montrer';
  if (strength < 72) return 'Un bon dossier';
  if (strength < 88) return 'On te reconnaît dedans';
  return 'Un book qu’on garde';
}

/** Ce qu'une séance d'essais coûte, en unités de cachet. */
export const SHOOT_COST = 0.6;
