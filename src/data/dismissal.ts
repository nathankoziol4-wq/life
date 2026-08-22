/**
 * Le dossier — ce qu'on peut encore faire une fois la porte fermée.
 *
 * **Ce que ce fichier ouvre.** `careers.ts#fire` retirait le poste, ôtait
 * quatorze points de bonheur, ajoutait dix-huit de stress, écrivait une ligne
 * dans le journal, et c'était fini. Six endroits du jeu l'appelaient — la
 * restructuration, l'insuffisance, l'insubordination, la faute grave, la
 * détention, la situation irrégulière — et aucun ne laissait au joueur la
 * moindre chose à décider. Le catalogue le disait : « aucun entretien
 * préalable, aucun recours, aucune seconde chance ».
 *
 * Ce qui manquait n'était pas une procédure, c'était **un moment**. Perdre son
 * poste est l'événement le plus fréquent d'une carrière — et depuis
 * `systems/office.ts`, l'un des plus lourds — et il ne se passait rien entre
 * l'annonce et la suite.
 *
 * Le dossier est un arbitrage à deux issues, et sa force ne se décide pas au
 * moment de choisir : **elle a été faite pendant les années de poste.** Les
 * avertissements qu'on n'a pas pris, les gens qui parleraient pour vous,
 * l'ancienneté, la performance tenue — tout cela est déjà écrit quand la porte
 * se ferme. Le joueur ne choisit pas sa force ; il choisit ce qu'il en fait.
 *
 * — **Négocier** : une somme tout de suite, sûre et modeste, proportionnée aux
 *   années et à la faiblesse de la position d'en face. Cela s'arrête là.
 * — **Contester** : des honoraires à payer, une ou deux années d'attente, et
 *   une issue tirée contre la force du dossier. On peut y regagner le poste ;
 *   on peut aussi tout perdre et sortir avec une réputation abîmée qui rend le
 *   poste suivant plus difficile à obtenir.
 *
 * **Rien ici n'est une procédure réelle.** Il n'y a ni juridiction, ni délai
 * légal, ni pièce à fournir, ni démarche transposable : « la force du
 * dossier » est un nombre de jeu tiré de ce que la partie a mémorisé, et
 * l'issue est un tirage pondéré. Le jeu ne dit à personne quoi faire de sa
 * propre vie — comme pour l'expulsion d'un locataire, la procédure est
 * abstraite et reste un décor.
 */

/* ------------------------------------------------------------------ */
/* Les motifs                                                          */
/* ------------------------------------------------------------------ */

export interface Ground {
  /** Le motif tel que `fire` l'écrit. */
  id: string;
  label: string;
  emoji: string;
  /**
   * Ce que le motif vaut à celui qui le conteste, de −1 à +1.
   *
   * Une restructuration est une position faible pour l'employeur : elle ne
   * dit rien contre la personne. Une faute grave est une position forte, et
   * la contester revient à demander qu'on regarde de plus près.
   */
  weakness: number;
  /** Ce que le motif laisse espérer d'une négociation, en années de salaire. */
  settlement: number;
  line: string;
}

export const GROUNDS: Ground[] = [
  {
    id: 'restructuration', label: 'Restructuration', emoji: '📉',
    weakness: 0.62, settlement: 0.55,
    line: 'Le poste disparaît, dit-on. Pas la personne.',
  },
  {
    id: 'insuffisance professionnelle', label: 'Insuffisance', emoji: '📊',
    weakness: 0.12, settlement: 0.22,
    line: 'On te reproche ton travail. Les chiffres sont au dossier.',
  },
  {
    id: 'insubordination', label: 'Insubordination', emoji: '🗣️',
    weakness: 0.24, settlement: 0.18,
    line: 'Une scène, et quelqu’un s’en souvient très précisément.',
  },
  {
    id: 'suite aux événements', label: 'Suite aux événements', emoji: '🌪️',
    weakness: 0.48, settlement: 0.35,
    line: 'Personne ne sait très bien dire ce qui est reproché.',
  },
  {
    /*
     * **Le seul motif qu'on a de bonnes raisons de ne pas contester.**
     * Contester quand on a réellement pris quelque chose, c'est demander
     * qu'on regarde le dossier de plus près — voir `systems/office.ts`. Le
     * joueur, lui, sait ce qu'il a fait : c'est la seule information que le
     * jeu ne lui reprend pas.
     */
    id: 'faute grave', label: 'Faute grave', emoji: '⚠️',
    weakness: -0.55, settlement: 0.05,
    line: 'Ils ont quelque chose. Le contester, c’est leur demander de le montrer.',
  },
];

export function getGround(id: string): Ground | undefined {
  return GROUNDS.find((g) => g.id === id);
}

/**
 * Les motifs qui ne se contestent pas.
 *
 * Perdre son poste parce qu'on est en détention ou en cavale n'ouvre aucun
 * dossier : il n'y a rien à discuter, et faire semblant du contraire serait
 * une ligne fermée de plus.
 */
export const NO_CASE = ['incarcération', 'situation irrégulière'];

/* ------------------------------------------------------------------ */
/* La force du dossier                                                 */
/* ------------------------------------------------------------------ */

/** Ce qu'un avertissement au dossier retire, en points de force. */
export const WARNING_COST = 17;

/** Ce que valent les années de maison, au plus. */
export const TENURE_WORTH = 22;

/** Les années au bout desquelles l'ancienneté ne rapporte plus. */
export const TENURE_FULL = 14;

/**
 * Ce que valent les gens qui parleraient pour vous, au plus — **et ce qu'ils
 * coûtent quand ils ne parleraient pas.**
 *
 * `workplaceSupport` va de −1 à 1, et la première version n'en gardait que la
 * moitié positive : une équipe hostile valait exactement autant qu'une équipe
 * indifférente. Mesuré, cela faisait partie des trois raisons pour lesquelles
 * aucun dossier ne descendait sous cinquante-cinq.
 */
export const VOICES_WORTH = 20;

/**
 * Ce que la performance vaut, en bien comme en mal.
 *
 * Comptée autour de cinquante-cinq et non de quarante : un travail médiocre
 * doit retirer quelque chose, sinon il n'existe aucune façon d'avoir un
 * mauvais dossier par son propre travail.
 */
export const RECORD_WORTH = 18;

/** Le milieu de la performance : au-dessus on gagne, en dessous on perd. */
export const RECORD_PIVOT = 55;

/** Ce que le motif invoqué pèse, dans un sens ou dans l'autre. */
export const GROUND_WORTH = 42;

/**
 * Le point de départ, avant tout ce qui précède.
 *
 * **Douze, et non trente-quatre.** À trente-quatre, la somme des apports
 * positifs suffisait à placer tout le monde au-dessus de la moitié : mesuré
 * sur sept cent treize dossiers, aucun ne descendait sous cinquante-cinq et
 * trois des cinq tranches de lecture étaient vides. Contester était donc
 * toujours le bon choix, et « lire son dossier » ne voulait rien dire.
 */
export const BASE_STRENGTH = 12;

/* ------------------------------------------------------------------ */
/* Ce que ça coûte et ce que ça rapporte                               */
/* ------------------------------------------------------------------ */

/** Les honoraires, en parts du salaire perdu. */
export const FEE_SHARE = 0.16;

/** Le plancher des honoraires : personne ne travaille pour rien. */
export const FEE_FLOOR = 1_800;

/** Ce qu'une victoire rapporte, en années du salaire perdu. */
export const AWARD_YEARS = 1.4;

/** Les années que met une affaire à se régler. */
export const CASE_YEARS = 2;

/**
 * Au-dessus de quoi une victoire rend le poste plutôt que de l'argent.
 *
 * Retrouver sa place vaut bien plus qu'une indemnité — c'est la carrière qui
 * repart —, il faut donc que ce soit rare et mérité.
 */
export const REINSTATE_AT = 78;

/**
 * Ce qu'une défaite laisse, en points de réputation.
 *
 * **Sans elle, contester serait gratuit** : on tenterait toujours, puisque
 * perdre ne coûterait que des honoraires déjà versés. Une affaire perdue se
 * sait, et le poste suivant est plus dur à obtenir.
 */
export const LOSS_MARK = 9;

/** Combien d'années la marque pèse sur les embauches. */
export const MARK_YEARS = 4;
