/**
 * Le locataire — celui pour qui l'on décide sans jamais lui parler.
 *
 * **Ce que ce fichier ouvre.** Le locatif est complet côté bailleur : fixer
 * son loyer, publier une annonce, choisir parmi des dossiers, encaisser les
 * impayés, subir la vacance, trancher des demandes de travaux, renouveler,
 * augmenter, engager une procédure de départ. Huit feuilles, toutes finies.
 *
 * Et en face, une personne — un vrai PNJ, avec son caractère et son salaire —
 * à qui l'on n'adresse jamais la parole. Le catalogue le disait en huit
 * mots : « on décide pour lui, on ne lui parle jamais ».
 *
 * Le système sait pourtant déjà tout ce qu'il faut. `advanceTenancy` calcule
 * la **tension** — ce que le loyer pèse sur ses revenus — et s'en sert pour
 * décider s'il paie. Il tient une **bonne volonté** qui pèse sur la même
 * chose. Ces deux nombres décident de l'argent du joueur chaque année, et le
 * joueur ne les a jamais vus.
 *
 * Ce fichier ajoute donc deux choses, et rien d'autre :
 *
 * — **lui parler**, pour apprendre ce qu'on ne pouvait pas voir ;
 * — **arranger**, ce qui coûte de l'argent maintenant et en rapporte plus
 *   tard : un locataire qui reste est un logement qui n'est pas vide.
 *
 * **L'arbitrage** est que le bailleur rentable et le bailleur décent ne sont
 * pas la même personne — et que le jeu doit laisser découvrir ce que chacun
 * coûte, plutôt que de récompenser l'un des deux d'avance.
 *
 * Rien ici ne décrit de procédure réelle : la sortie passe toujours par
 * `tenancy.ts#evictTenant`, qui reste une démarche abstraite.
 */

/* ------------------------------------------------------------------ */
/* Ce qu'on apprend en parlant                                         */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'une conversation coûte : rien, et c'est délibéré.
 *
 * On ne fait pas payer l'information de base sur quelqu'un à qui l'on prend
 * de l'argent tous les ans. Ce qui se paie, c'est **ce qu'on en fait**.
 */
export const TALK_COST = 0;

/** Ce qu'une visite ajoute de bonne volonté, simplement pour être passé. */
export const TALK_GOODWILL = 4;

/** Une fois par an : on ne va pas frapper à sa porte tous les mois. */
export const TALK_KEY = 'tenantTalk';

/* ------------------------------------------------------------------ */
/* Ce qu'on peut arranger                                              */
/* ------------------------------------------------------------------ */

export interface Arrangement {
  id: string;
  label: string;
  emoji: string;
  line: string;
  /** Ce que ça coûte, et ce que ça rapporte : voir `systems/tenant.ts`. */
  note: string;
}

export const ARRANGEMENTS: Arrangement[] = [
  {
    id: 'etaler', label: 'Étaler ce qu’il doit', emoji: '📅',
    line: 'Il te doit toujours la même somme. Il a seulement le temps de la rendre.',
    note: 'Ne coûte rien tout de suite, et beaucoup de bonne volonté.',
  },
  {
    id: 'baisser', label: 'Baisser le loyer', emoji: '📉',
    line: 'Moins chaque mois, et une tension qui redescend d’un coup.',
    note: 'Coûte du revenu chaque année, tant qu’il reste.',
  },
  {
    id: 'travaux', label: 'Le laisser payer en travaux', emoji: '🔧',
    line: 'Une part du loyer contre l’entretien qu’il fera lui-même.',
    note: 'Coûte du loyer, rend de l’état au logement.',
  },
  {
    id: 'effacer', label: 'Effacer l’ardoise', emoji: '🧾',
    line: 'Ce qu’il doit n’existe plus. Il le sait, et il s’en souviendra.',
    note: 'Coûte tout l’arriéré, d’un coup.',
  },
];

export function getArrangement(id: string): Arrangement | undefined {
  return ARRANGEMENTS.find((a) => a.id === id);
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Ce qu'étaler l'arriéré ajoute de bonne volonté. */
export const SPREAD_GOODWILL = 14;

/** De combien on baisse le loyer, en proportion. */
export const CUT_SHARE = 0.15;

/** Ce que la baisse ajoute de bonne volonté. */
export const CUT_GOODWILL = 20;

/** La part du loyer échangée contre de l'entretien. */
export const WORK_SHARE = 0.2;

/** Ce que l'entretien rend d'état au logement chaque année. */
export const WORK_CARE = 9;

/** Ce qu'effacer l'ardoise ajoute de bonne volonté. */
export const WIPE_GOODWILL = 26;

/**
 * Ce que la tension veut dire, par palier.
 *
 * `advanceTenancy` s'en sert depuis toujours pour décider des impayés : au
 * delà de 0,85, la probabilité de ne pas payer commence à monter. Le joueur
 * ne l'avait jamais vue.
 */
export const STRAIN_BANDS: { under: number; says: string }[] = [
  { under: 0.6, says: 'Le loyer ne lui pose aucun problème.' },
  { under: 0.85, says: 'Il paie sans y penser, mais il y pense un peu.' },
  { under: 1.05, says: 'C’est juste. Un imprévu et ça ne passe plus.' },
  { under: 1.35, says: 'Il n’y arrive pas tous les mois, et ça se voit.' },
  { under: Infinity, says: 'Tu lui demandes plus qu’il ne peut donner.' },
];
