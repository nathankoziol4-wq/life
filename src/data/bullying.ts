/**
 * Le harcèlement scolaire.
 *
 * L'audit le classait `PLACEHOLDER` et la note était juste : « l'expérience
 * “harcèlement” existe comme souvenir ; aucun harceleur, aucune scène, aucune
 * réponse ». Le jeu posait un drapeau, écrivait une ligne dans le journal, et
 * l'année suivante il ne s'était rien passé. C'était un événement climatique.
 *
 * Ce fichier décrit de quoi en faire une situation : **quelqu'un** le fait,
 * **d'autres** regardent, **ça dure**, et **on peut répondre** — sans qu'aucune
 * réponse ne marche à tous les coups.
 *
 * La règle qui tient tout le reste : **les cinq réponses sont chacune la
 * meilleure dans un cas et la pire dans un autre.** S'il existait une bonne
 * réponse, il n'y aurait pas de situation, seulement un bouton à trouver. Ce
 * qui décide n'est jamais le tirage seul : c'est l'état de la classe, celui de
 * l'établissement, celui du foyer, et ce que le personnage est capable de
 * faire.
 *
 * Rien ici n'est une technique : ce sont des registres nommés et des
 * conséquences chiffrées. Le jeu ne montre pas comment on s'y prend, il montre
 * ce que ça fait.
 */

/* ------------------------------------------------------------------ */
/* Ce que ça prend comme forme                                         */
/* ------------------------------------------------------------------ */

export interface BullyingKind {
  id: string;
  label: string;
  emoji: string;
  /** Ce que ça fait, dit du point de vue de celui qui le subit. */
  what: string;
  /** Ce que ça abîme le plus vite. */
  hits: 'moral' | 'place' | 'corps' | 'argent';
  /** Vitesse à laquelle ça s'aggrave tout seul. */
  escalation: number;
  /** Visibilité : ce qui se voit se signale, ce qui ne se voit pas dure. */
  visibility: number;
}

export const BULLYING_KINDS: BullyingKind[] = [
  {
    id: 'moqueries', label: 'Les moqueries', emoji: '🗯️',
    what: 'Une phrase à chaque fois que tu passes, et le rire derrière',
    hits: 'moral', escalation: 1, visibility: 70,
  },
  {
    id: 'écart', label: 'La mise à l’écart', emoji: '🚷',
    what: 'Personne ne te dit rien. C’est exactement le problème',
    hits: 'place', escalation: 0.8, visibility: 25,
  },
  {
    id: 'rumeurs', label: 'Les rumeurs', emoji: '📣',
    what: 'Quelque chose circule sur toi, et tu l’apprends en dernier',
    hits: 'place', escalation: 1.3, visibility: 40,
  },
  {
    id: 'racket', label: 'Le racket', emoji: '💸',
    what: 'On te prend ce que tu as, et on appelle ça un prêt',
    hits: 'argent', escalation: 1.1, visibility: 35,
  },
  {
    id: 'bousculades', label: 'Les bousculades', emoji: '💢',
    what: 'Un couloir devient un endroit qu’on évite',
    hits: 'corps', escalation: 1.4, visibility: 80,
  },
];

export function getBullyingKind(id: string): BullyingKind | undefined {
  return BULLYING_KINDS.find((k) => k.id === id);
}

/* ------------------------------------------------------------------ */
/* Les réponses                                                        */
/* ------------------------------------------------------------------ */

export type ResponseId = 'ignorer' | 'affronter' | 'signaler' | 'parents' | 'soutien';

export interface Response {
  id: ResponseId;
  label: string;
  emoji: string;
  /** Ce qu'on fait, en une phrase. */
  what: string;
  /**
   * Ce dont ça dépend, dit au joueur avant de choisir.
   *
   * Le joueur doit pouvoir décider, pas deviner. On lui dit de quoi dépend
   * chaque réponse ; on ne lui dit pas si elle marchera.
   */
  depends: string;
  /** Ce que ça coûte même quand ça marche. */
  cost: string;
}

export const RESPONSES: Response[] = [
  {
    id: 'ignorer', label: 'Ne rien faire', emoji: '😐',
    what: 'Baisser la tête et attendre que ça passe',
    depends: 'De la ténacité de celui qui s’y met, et de l’ampleur que ça a déjà prise',
    cost: 'Ça s’imprime quand même. Toujours.',
  },
  {
    id: 'affronter', label: 'Répondre en face', emoji: '✊',
    what: 'Lui tenir tête devant tout le monde',
    depends: 'De ton assurance, de ta forme — et surtout de s’il est seul ou non',
    cost: 'L’établissement ne fait pas la différence entre celui qui commence et celui qui répond.',
  },
  {
    id: 'signaler', label: 'Le dire à l’établissement', emoji: '🏫',
    what: 'Aller voir quelqu’un dont c’est le travail',
    depends: 'De ce que cet établissement-là fait de ce genre de signalement',
    cost: 'Dans une classe qui ne suit pas, ça se sait et ça se paie.',
  },
  {
    id: 'parents', label: 'En parler chez toi', emoji: '🏠',
    what: 'Le dire à quelqu’un de la maison',
    depends: 'De qui sont tes parents, et de ce qu’ils font quand on leur dit quelque chose',
    cost: 'Rien, sinon d’avoir dû le dire.',
  },
  {
    id: 'soutien', label: 'T’appuyer sur les autres', emoji: '🧑‍🤝‍🧑',
    what: 'Aller chercher ceux qui voient et qui se taisent',
    depends: 'De combien de témoins t’aiment assez pour se mouiller',
    cost: 'Il faut avoir quelqu’un. C’est précisément ce qui manque quand on est seul.',
  },
];

export function getResponse(id: string): Response | undefined {
  return RESPONSES.find((r) => r.id === id);
}

/* ------------------------------------------------------------------ */
/* L'ampleur                                                           */
/* ------------------------------------------------------------------ */

/** Comment on nomme l'état de la situation, du plus léger au plus lourd. */
export const INTENSITY_BANDS: { min: number; label: string; note: string }[] = [
  { min: 80, label: 'Tous les jours', note: 'Ça occupe toute la place. L’école est devenue un endroit où tu ne veux pas aller.' },
  { min: 58, label: 'Installé', note: 'Ce n’est plus un incident, c’est un état.' },
  { min: 34, label: 'Régulier', note: 'Assez souvent pour que tu y penses avant d’arriver.' },
  { min: 0, label: 'Ponctuel', note: 'Pas tous les jours, mais tu sais que ça peut recommencer.' },
];

export function intensityLabel(value: number): { label: string; note: string } {
  return INTENSITY_BANDS.find((b) => value >= b.min) ?? INTENSITY_BANDS[INTENSITY_BANDS.length - 1];
}

/* ------------------------------------------------------------------ */
/* Ce qu'on peut faire quand c'est quelqu'un d'autre                   */
/* ------------------------------------------------------------------ */

export type WitnessId = 'intervenir' | 'prévenir' | 'rien' | 'suivre';

export interface WitnessChoice {
  id: WitnessId;
  label: string;
  emoji: string;
  what: string;
}

/**
 * Être témoin.
 *
 * Le quatrième choix existe parce qu'il est réel : à quatorze ans, suivre le
 * mouvement est la chose la plus facile du monde. Le jeu ne l'interdit pas ;
 * il en tient la comptabilité.
 */
export const WITNESS_CHOICES: WitnessChoice[] = [
  { id: 'intervenir', label: 'T’interposer', emoji: '🛑', what: 'Te mettre entre les deux, tout de suite' },
  { id: 'prévenir', label: 'Prévenir un adulte', emoji: '🏫', what: 'Aller le dire, quitte à être celui qui a parlé' },
  { id: 'rien', label: 'Ne rien faire', emoji: '👀', what: 'Regarder ailleurs et continuer ta journée' },
  { id: 'suivre', label: 'T’y mettre aussi', emoji: '😈', what: 'Rire avec les autres, en rajouter un peu' },
];
