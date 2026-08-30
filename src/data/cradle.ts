/**
 * Ce qu'on décide avant de naître.
 *
 * Trois feuilles du catalogue disaient ce groupe absent — composer sa
 * famille, régler le tempérament, composer son apparence — et une mesure a
 * montré qu'elles ne disaient pas la même chose du tout :
 *
 *     tempérament   demandé 5 → obtenu 5 ; demandé 95 → obtenu 95
 *                   (stress 4 → 19, discipline 29 → 51)
 *     fratrie       3 demandés → 3 PNJ réels, aux bons âges
 *     structure     « parent seul » → une seule figure parentale
 *     apparence     cheveux, yeux, carrure, taille : tous obéis
 *     génétique     aucun chemin de données
 *
 * Autrement dit : le moteur honorait déjà presque tout, et l'écran ne
 * l'exposait pas. Le tempérament et la fratrie étaient même déjà réglables —
 * deux notes du catalogue étaient périmées, ce qu'aucune lecture du code
 * n'aurait tranché aussi vite qu'une vie fabriquée pour voir.
 *
 * Restait le vrai manque : **le potentiel hérité**, d'où viennent
 * l'intelligence, l'allure et la santé de départ, et qui n'était réglable par
 * aucun chemin. C'est aussi le seul de la liste qui donne un avantage — d'où
 * la seule règle de ce fichier.
 *
 * **La règle : une enveloppe.** On ne choisit pas d'être doué partout ; on
 * choisit où l'on est doué. Trois potentiels, une somme fixée : monter l'un
 * oblige à baisser un autre. Sans cette contrainte, composer ne serait pas
 * une décision mais une liste de souhaits, et la partie n'aurait plus de
 * point de départ intéressant.
 */

/** Les trois potentiels qu'on peut répartir. */
export interface Gift {
  key: 'cognitivePotential' | 'athleticPotential' | 'constitution';
  label: string;
  emoji: string;
  /** Ce que ça devient une fois né. */
  note: string;
  /**
   * La valeur par défaut : exactement la moyenne du tirage ordinaire.
   *
   * Un tiers de l'enveloppe pour chacun laissait un point qui traînait
   * (160 / 3 = 53, et 53 × 3 = 159), si bien que l'écran s'ouvrait en
   * annonçant « il te reste 1 à placer » sans que le joueur ait rien touché.
   */
  base: number;
}

export const GIFTS: Gift[] = [
  {
    key: 'cognitivePotential',
    base: 52,
    label: 'La tête',
    emoji: '🧠',
    note: 'Ce qui deviendra l’intelligence, à moitié seulement : l’école fera le reste.',
  },
  {
    key: 'athleticPotential',
    base: 52,
    label: 'Le corps',
    emoji: '🏃',
    note: 'Ce qui deviendra la forme physique, et ce qu’on peut en faire.',
  },
  {
    key: 'constitution',
    base: 56,
    label: 'La santé',
    emoji: '🌱',
    note: 'La robustesse de départ, et la résistance à ce qui viendra.',
  },
];

/**
 * L'enveloppe : la somme des trois potentiels.
 *
 * Le tirage ordinaire vise 52, 52 et 56 — soit exactement cette somme. On
 * donne donc précisément ce que le hasard donnait : composer ne rend pas plus
 * fort, cela rend *différent*. C'est la seule chose qui distingue une
 * création d'une triche, et elle doit être exactement neutre pour que ce soit
 * vrai — d'où une enveloppe déduite des valeurs par défaut plutôt que posée
 * à la main, qui ne peut pas se désaccorder d'elles.
 */
export const POOL = GIFTS.reduce((sum, g) => sum + g.base, 0);

/** Ce qu'un potentiel ne peut ni dépasser ni descendre en dessous. */
export const GIFT_MIN = 15;
export const GIFT_MAX = 90;

/** Le pas d'un cran, à l'écran. */
export const GIFT_STEP = 5;

/** Ce que vaut ce potentiel quand on n'a rien décidé. */
export function baseOf(key: Gift['key']): number {
  return GIFTS.find((g) => g.key === key)?.base ?? 50;
}

/** Combien il reste à placer. */
export function spent(gifts: Partial<Record<Gift['key'], number>>): number {
  return GIFTS.reduce((sum, g) => sum + (gifts[g.key] ?? g.base), 0);
}

export function remaining(gifts: Partial<Record<Gift['key'], number>>): number {
  return POOL - spent(gifts);
}

/** Peut-on pousser ce potentiel d'un cran ? */
export function canRaise(gifts: Partial<Record<Gift['key'], number>>, key: Gift['key']): boolean {
  const at = gifts[key] ?? baseOf(key);
  return at + GIFT_STEP <= GIFT_MAX && remaining(gifts) >= GIFT_STEP;
}

export function canLower(gifts: Partial<Record<Gift['key'], number>>, key: Gift['key']): boolean {
  return (gifts[key] ?? baseOf(key)) - GIFT_STEP >= GIFT_MIN;
}

/** Ce qu'un potentiel vaut, en mots. */
export function giftWord(value: number): string {
  if (value >= 78) return 'Très net';
  if (value >= 62) return 'Marqué';
  if (value >= 45) return 'Ordinaire';
  if (value >= 30) return 'Faible';
  return 'Très faible';
}

/* ------------------------------------------------------------------ */
/* Le visage                                                           */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on peut choisir de son apparence.
 *
 * Aucune enveloppe ici : l'apparence ne donne presque rien. Seule la carrure
 * touche l'allure, de quatre points au mieux — mesuré, choisir « athlétique »
 * fait passer l'allure de 49 à 52 sur la même graine. C'est du décor, et le
 * décor n'a pas à se payer.
 */
export const FACE_SHAPES = ['ovale', 'ronde', 'carrée', 'allongée', 'en cœur', 'anguleuse'];
export const EYE_COLORS = ['marron', 'noisette', 'verts', 'bleus', 'gris', 'ambre', 'noirs'];
export const HAIR_COLORS = ['bruns', 'châtains', 'noirs', 'blonds', 'roux', 'auburn', 'poivre et sel'];
export const HAIR_STYLES = ['courts', 'mi-longs', 'longs', 'bouclés', 'crépus', 'ondulés', 'raides'];
export const SKIN_TONES = ['très claire', 'claire', 'mate', 'dorée', 'brune', 'foncée', 'très foncée'];
export const FEATURES = [
  'des taches de rousseur', 'une fossette au menton', 'un grain de beauté marqué',
  'des sourcils épais', 'un regard perçant', 'une cicatrice au sourcil',
  'des pommettes hautes', 'un sourire en coin', 'des oreilles décollées',
  'une mèche rebelle', 'de longs cils', 'une voix grave',
];

export const BUILDS = ['mince', 'athlétique', 'moyenne', 'robuste', 'ronde'] as const;

/** Les valeurs possibles de chaque champ, par clé. */
export const LOOK_POOLS: Record<string, readonly string[]> = {
  faceShape: FACE_SHAPES,
  eyeColor: EYE_COLORS,
  hairColor: HAIR_COLORS,
  hairStyle: HAIR_STYLES,
  skinTone: SKIN_TONES,
};

/** Les champs d'apparence qu'on laisse régler, dans l'ordre de l'écran. */
export const LOOKS: { key: 'faceShape' | 'eyeColor' | 'hairColor' | 'hairStyle' | 'skinTone'; label: string; emoji: string }[] = [
  { key: 'faceShape', label: 'Le visage', emoji: '🙂' },
  { key: 'eyeColor', label: 'Les yeux', emoji: '👁️' },
  { key: 'hairColor', label: 'Les cheveux', emoji: '💇' },
  { key: 'hairStyle', label: 'La coiffure', emoji: '✂️' },
  { key: 'skinTone', label: 'La peau', emoji: '🎨' },
];

/** Les bornes de la taille visée, autour de la moyenne du sexe. */
export const HEIGHT_SPREAD = 24;
export const HEIGHT_STEP = 2;
