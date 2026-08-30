/**
 * Se relever.
 *
 * Mesuré avant d'écrire une ligne, sur soixante vies qui font simplement ce
 * que le jeu propose — cinq passages à la table par an, ce que le moteur
 * autorise :
 *
 *     pic de dépendance : médiane 100 · maximum 100
 *     franchit 50 : 100 % des vies · 55 : 100 % · 60 : 100 % · 65 : 100 %
 *     ce qui redescend tout seul : 1,21 point par an
 *     ce qu'on peut faire pour en sortir : rien
 *
 * La statistique existe, tout le moteur la lit — au-dessus de 50 les
 * maladies liées deviennent trois fois et demie plus probables, au-dessus de
 * 60 le risque de perdre son emploi est multiplié par 1,6, au-dessus de 65 la
 * mort peut la nommer — et **elle ne fait qu'un aller**. Cent points à un
 * point vingt par an, c'est quatre-vingts ans à ne rien faire.
 *
 * Ce fichier n'ajoute pas une descente : elle existe déjà, et elle est
 * rapide. Il ajoute **la remontée**, et il la rend difficile pour la même
 * raison qu'elle l'est : arrêter coûte de l'argent, du temps et de l'orgueil,
 * ça ne tient pas tout seul, et ça se refait.
 *
 * Rien ici ne nomme de substance ni ne décrit quoi que ce soit d'applicable.
 * La dépendance du jeu est un nombre que le jeu fait monter ; ce qui est
 * décrit, ce sont des façons d'en sortir et ce qu'elles demandent — jamais
 * l'inverse, et jamais comme quelque chose d'enviable.
 */

/** Au-dessus : on est pris. */
export const GRIP = 45;

/** Au-dessus : c'est autre chose. */
export const DEEP = 70;

/** Ce qu'il faut d'années sous le seuil pour que ça compte. */
export const CLEAN_YEARS = 3;

/** Une façon d'en sortir. */
export interface Program {
  id: string;
  label: string;
  emoji: string;
  note: string;
  /** Ce que ça coûte par an, avant ajustement au pays. */
  cost: number;
  /** Ce que ça retire par an, au mieux. */
  drop: number;
  /** Ce que ça tient contre la rechute, de 0 à 1. */
  holds: number;
  /** Ce que l'année y passe : du stress, du temps, de l'argent en moins. */
  toll: number;
  /** N'est proposé qu'à partir de ce niveau. */
  from: number;
  /** Ce programme demande-t-il que quelqu'un soit au courant ? */
  needsWitness?: true;
  /** Prend-il l'année entière ? */
  takesYear?: true;
}

/**
 * Quatre façons, et le même arbitrage partout : ce qui ne coûte rien ne tient
 * rien.
 *
 * Aucune n'est gratuite au sens large — la première coûte en volonté ce que
 * les autres coûtent en argent, et c'est celle qui lâche le plus souvent.
 */
export const PROGRAMS: Program[] = [
  {
    id: 'seul', label: 'T’arrêter seul', emoji: '✊',
    note: 'Personne au courant, rien à payer. Ça tient tant que rien ne pousse.',
    cost: 0, drop: 8, holds: 0.22, toll: 6, from: 0,
  },
  {
    id: 'groupe', label: 'Un groupe de parole', emoji: '🪑',
    note: 'Une salle, des chaises, des gens. Il faut y aller, et il faut le dire.',
    cost: 140, drop: 9, holds: 0.55, toll: 4, from: 0, needsWitness: true,
  },
  {
    id: 'suivi', label: 'Un suivi individuel', emoji: '🛋️',
    note: 'Quelqu’un dont c’est le métier, une fois par semaine, pendant longtemps.',
    cost: 2_600, drop: 14, holds: 0.62, toll: 3, from: 0,
  },
  {
    id: 'cure', label: 'Une cure', emoji: '🏥',
    note: 'Tu pars. Tu ne travailles pas, tu ne vois personne, et tu reviens autre.',
    // Le seuil est sous `DEEP` à dessein : mesuré à `DEEP`, la cure faisait
    // tomber jusqu'à soixante-dix puis se fermait, laissant la personne
    // exactement entre les deux avec rien pour continuer.
    cost: 7_400, drop: 30, holds: 0.6, toll: 12, from: 58, takesYear: true,
  },
];

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce qui fait rechuter                                                */
/* ------------------------------------------------------------------ */

/** La part qui rechute dans l'année, avant tout ce qui l'aggrave ou l'aide. */
export const RELAPSE_BASE = 0.34;

/** Ce que retourner à la table ou sortir ajoute à cette part. */
export const TEMPTED = 0.4;

/** Ce que quelqu'un au courant retire à cette part. */
export const WITNESS_HELPS = 0.18;

/**
 * Ce que le stress ajoute, à saturation.
 *
 * Il pèse lourd à dessein — mais mesuré, quelqu'un qui s'en sort a un stress
 * moyen de 86, si bien qu'à 0,3 ce seul terme décidait de tout.
 */
export const STRESS_WEIGHT = 0.22;

/** Ce que la rigueur retire, à saturation. */
export const DISCIPLINE_HELPS = 0.22;

/**
 * Ce qu'une rechute remet, en points.
 *
 * Mesuré à seize : la route gratuite passait exactement par zéro — un an de
 * progrès pour une rechute — et le résultat basculait de 15 % à 92 % de
 * libérés selon la cohorte, c'est-à-dire selon rien. Une rechute doit faire
 * reculer sans annuler.
 */
export const RELAPSE_COST = 11;

/**
 * Ce que la dépendance perd toute seule quand elle tient déjà.
 *
 * Elle s'atténuait de 0,5 à 2,5 points par an quel que soit le niveau, si
 * bien qu'on sortait d'une dépendance grave en ne faisant rien pendant
 * quarante ans. Au-dessus du seuil, cette dérive est divisée : c'est ce qui
 * fait qu'être pris veut dire quelque chose, et que la remontée doit se
 * décider.
 */
export const HELD_DRIFT = 0.35;

/* ------------------------------------------------------------------ */
/* Le dire                                                             */
/* ------------------------------------------------------------------ */

/** Ce qu'il faut de lien pour que le dire ait un sens. */
export const TELL_BOND = 35;

/** Ce que quelqu'un de chaleureux gagne en opinion quand on lui dit. */
export const TELL_WARM = 6;

/** Ce que quelqu'un de distant perd en opinion quand on lui dit. */
export const TELL_COLD = -9;
