/**
 * Les objets de famille.
 *
 * Une vie laisse de l'argent, et l'argent se dépense. Un objet, lui, traverse
 * les générations : il vieillit, il s'abîme, on le restaure, on le vend un
 * jour où l'on n'a plus le choix — et deux siècles plus tard il porte le nom
 * de ceux qui l'ont tenu avant.
 *
 * Trois idées, et c'est tout le système.
 *
 * **1. L'âge vaut plus que la matière.** Un objet ordinaire gardé trois cents
 * ans vaut davantage qu'un bel objet acheté hier. C'est ce qui fait qu'on le
 * garde au lieu de le vendre, et c'est le seul placement du jeu qui demande
 * de la patience plutôt que de l'argent.
 *
 * **2. Le garder coûte.** L'état se dégrade tout seul, à une vitesse propre à
 * l'objet. Restaurer coûte cher et ne rend jamais tout à fait ce qui a été
 * perdu : trop de restaurations et l'on ne montre plus qu'une copie de
 * soi-même.
 *
 * **3. Il porte une histoire.** Chaque génération y ajoute une ligne. C'est ce
 * qui distingue un objet de famille d'un objet de valeur — et ce qui rend
 * pénible de le vendre, même quand c'est raisonnable.
 *
 * Rien ici ne renvoie à un objet, une marque ou une œuvre réels : ce sont des
 * choses ordinaires qu'une famille peut avoir gardées.
 */

export interface HeirloomKind {
  id: string;
  label: string;
  emoji: string;
  /** Ce que c'est, et pourquoi on l'a gardé. */
  story: string;
  /** Sa valeur neuve, en unités de coût de la vie. */
  worth: number;
  /**
   * Ce qu'il perd par an, en points d'état.
   *
   * Le textile s'en va vite, le métal presque pas. C'est ce qui décide de ce
   * qui peut réellement traverser trois siècles.
   */
  wear: number;
  /** Combien il est rare de le trouver, 1 (courant) à 5 (presque jamais). */
  rarity: number;
}

export const HEIRLOOM_KINDS: HeirloomKind[] = [
  {
    id: 'montre', label: 'Une montre de gousset', emoji: '⌚',
    story: 'Elle retarde de deux minutes depuis toujours. Personne ne l’a jamais réglée.',
    worth: 0.9, wear: 0.5, rarity: 2,
  },
  {
    id: 'medaillon', label: 'Un médaillon', emoji: '📿',
    story: 'Il s’ouvre. Il y a un visage dedans, et plus personne ne sait lequel.',
    worth: 0.6, wear: 0.4, rarity: 2,
  },
  {
    id: 'alliance', label: 'Une alliance', emoji: '💍',
    story: 'Trop petite pour la plupart des mains qui l’ont reçue.',
    worth: 1.4, wear: 0.25, rarity: 3,
  },
  {
    id: 'horloge', label: 'Une horloge', emoji: '🕰️',
    story: 'Elle sonne encore. C’est le bruit de fond de quatre enfances.',
    worth: 1.8, wear: 0.9, rarity: 3,
  },
  {
    id: 'violon', label: 'Un violon', emoji: '🎻',
    story: 'Quelqu’un en jouait bien. Depuis, on le regarde.',
    worth: 2.6, wear: 1.2, rarity: 4,
  },
  {
    id: 'service', label: 'Un service de table', emoji: '🍽️',
    story: 'Douze couverts, dont neuf. On ne sait plus quand les trois sont partis.',
    worth: 1.1, wear: 1.4, rarity: 2,
  },
  {
    id: 'carnet', label: 'Un carnet', emoji: '📓',
    story: 'Une écriture serrée, et des comptes de choses qui n’existent plus.',
    worth: 0.3, wear: 1.6, rarity: 1,
  },
  {
    id: 'carte', label: 'Une carte marine', emoji: '🗺️',
    story: 'Un trait au crayon va d’un port à un autre. On ne sait pas qui l’a tracé.',
    worth: 1.2, wear: 1.5, rarity: 3,
  },
  {
    id: 'manteau', label: 'Un manteau', emoji: '🧥',
    story: 'Il sent encore quelque chose. C’est pour ça qu’on ne l’a pas jeté.',
    worth: 0.5, wear: 2.2, rarity: 1,
  },
  {
    id: 'appareil', label: 'Un appareil photo', emoji: '📷',
    story: 'Il reste une pellicule dedans. Personne n’a osé la faire développer.',
    worth: 1, wear: 1.1, rarity: 3,
  },
  {
    id: 'boite', label: 'Une boîte à musique', emoji: '🎵',
    story: 'Elle joue huit notes, puis elle s’arrête toujours au même endroit.',
    worth: 0.8, wear: 0.8, rarity: 3,
  },
  {
    id: 'echecs', label: 'Un jeu d’échecs', emoji: '♟️',
    story: 'Il manque un fou. On joue quand même, avec un bouchon.',
    worth: 0.7, wear: 0.9, rarity: 2,
  },
  {
    id: 'tableau', label: 'Un tableau', emoji: '🖼️',
    story: 'Un paysage que personne n’a jamais reconnu. Il n’est peut-être pas d’ici.',
    worth: 3.2, wear: 1, rarity: 4,
  },
  {
    id: 'coffret', label: 'Un coffret fermé', emoji: '🧰',
    story: 'La clef a disparu il y a deux générations. On ne l’a jamais forcé.',
    worth: 1.6, wear: 0.6, rarity: 4,
  },
  {
    id: 'bague', label: 'Une chevalière', emoji: '💎',
    story: 'Des initiales gravées, et aucun nom de la famille ne leur correspond.',
    worth: 2.2, wear: 0.3, rarity: 4,
  },
  {
    id: 'lettre', label: 'Un paquet de lettres', emoji: '✉️',
    story: 'Elles sont attachées par un ruban. On ne les a jamais toutes lues.',
    worth: 0.4, wear: 1.8, rarity: 2,
  },
  {
    id: 'medaille', label: 'Une médaille', emoji: '🎖️',
    story: 'On sait pour quoi elle a été donnée. On ne sait pas si c’est vrai.',
    worth: 1.3, wear: 0.4, rarity: 4,
  },
  {
    id: 'berceau', label: 'Un berceau', emoji: '🛏️',
    story: 'Cinq générations y ont dormi. Il grince exactement pareil.',
    worth: 0.9, wear: 1.3, rarity: 5,
  },
];

export function getHeirloomKind(id: string): HeirloomKind | undefined {
  return HEIRLOOM_KINDS.find((k) => k.id === id);
}

/* ------------------------------------------------------------------ */
/* L'état                                                              */
/* ------------------------------------------------------------------ */

/** Comment se lit l'état d'un objet. */
export function conditionLabel(condition: number): string {
  if (condition < 15) return 'Ruiné';
  if (condition < 35) return 'Très abîmé';
  if (condition < 55) return 'Fatigué';
  if (condition < 75) return 'Correct';
  if (condition < 92) return 'Bien conservé';
  return 'Comme au premier jour';
}

/**
 * Ce que l'état fait à la valeur.
 *
 * La courbe est brutale en bas : un objet ruiné ne vaut presque rien, quel
 * que soit son âge. C'est ce qui rend la restauration nécessaire plutôt que
 * facultative.
 */
export function conditionFactor(condition: number): number {
  return 0.05 + Math.pow(Math.max(0, condition) / 100, 1.7) * 1.15;
}

/**
 * Ce que l'âge fait à la valeur.
 *
 * Rien pendant vingt ans, puis une montée qui ne s'arrête pas. Un objet de
 * trois siècles vaut plusieurs fois ce qu'il valait neuf — c'est la seule
 * raison de le garder plutôt que de le vendre.
 */
export function ageFactor(years: number): number {
  if (years < 20) return 1;
  // La pente doit être assez forte pour que l'âge l'emporte réellement sur la
  // matière : à 1,35 sur 42, un carnet gardé deux siècles valait encore moins
  // qu'un tableau acheté hier, ce qui contredisait la règle même du système.
  // Trois siècles doivent rendre précieux n'importe quoi.
  return 1 + Math.pow((years - 20) / 30, 1.5);
}

/**
 * Ce que les restaurations retirent.
 *
 * Une restauration sauve l'objet ; cinq en font une copie. Le facteur ne
 * descend jamais à zéro — même très repris, l'objet reste celui-là.
 */
export function authenticityFactor(restorations: number): number {
  return Math.max(0.45, 1 - restorations * 0.12);
}

/** Ce que coûte une restauration, en unités de coût de la vie. */
export const RESTORE_COST = 0.22;

/** Ce qu'une restauration rend, en points d'état. */
export const RESTORE_GAIN = 34;

/* ------------------------------------------------------------------ */
/* Comment ils entrent dans la famille                                 */
/* ------------------------------------------------------------------ */

/** D'où vient l'objet. Écrit dans son histoire, et jamais modifié ensuite. */
export const PROVENANCES = [
  'trouvé dans un grenier',
  'rapporté d’un voyage',
  'acheté à quelqu’un qui n’en voulait plus',
  'reçu d’un voisin sans famille',
  'oublié par un locataire',
  'gagné dans un pari',
  'retrouvé derrière une cloison',
  'donné par un ami qui partait',
];

/** Ce qu'on écrit quand une génération passe sans rien faire. */
export const QUIET_LINES = [
  'Il est resté dans un tiroir.',
  'On l’a montré aux enfants, une fois.',
  'Personne n’y a touché.',
  'Il a changé de pièce, puis de maison.',
  'On a failli le vendre, et on ne l’a pas fait.',
];
