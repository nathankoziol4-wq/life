/**
 * Le deuxième poste.
 *
 * Le catalogue disait, feuille `Carrière/Cumul`, impact 3 : « un seul contrat
 * de travail à la fois ». C'était exact — `p.job` est un objet ou rien.
 *
 * Ce fichier ne décrit pas une seconde carrière : il décrit des **postes de
 * complément**. Pas d'échelle, pas de promotion, pas de collègues — des heures,
 * un taux, et ce que ça coûte. C'est ce qui les distingue d'un métier, et c'est
 * pour cela qu'ils n'ont pas besoin d'un second `JobState` : ce serait dupliquer
 * cent trente-trois endroits du jeu qui lisent `p.job` pour y ranger quelque
 * chose qui n'a ni carrière ni équipe.
 *
 * Chaque poste s'arbitre sur trois côtés qui ne vont jamais ensemble : **ce que
 * l'heure paie**, **ce qu'elle coûte**, et **à quel point cela reste discret**.
 * Le mieux payé est le plus visible ou le plus dur ; le plus discret ne paie
 * pas. Il n'y a pas de bon choix dans l'absolu, il y a ce qu'on peut se
 * permettre de fatiguer et ce qu'on peut se permettre qu'on apprenne.
 */

export interface Shift {
  id: string;
  label: string;
  emoji: string;
  /** Ce que l'heure paie, avant indice du pays et inflation. */
  rate: number;
  /** Ce que chaque heure hebdomadaire coûte en fatigue sur l'année. */
  toll: number;
  /**
   * À quel point cela reste discret, 0-1.
   *
   * Un est invisible, zéro se sait dans l'année. Ce n'est pas de la
   * dissimulation : c'est où et devant qui l'on travaille — on ne croise
   * personne à trois heures du matin, on croise tout le monde en salle.
   */
  quiet: number;
  /** La compétence que cela entretient, s'il y en a une. */
  skillId: string | null;
  /** Ce qu'on peut y mettre par semaine. */
  min: number;
  max: number;
  line: string;
}

export const SHIFTS: Shift[] = [
  {
    id: 'nuits', label: 'Les nuits', emoji: '🌙',
    rate: 21, toll: 1.5, quiet: 0.95, skillId: null, min: 8, max: 24,
    line: 'Personne ne t’y verra jamais. Ton corps le saura pour eux.',
  },
  {
    id: 'samedis', label: 'Les samedis en boutique', emoji: '🛍️',
    rate: 12, toll: 0.55, quiet: 0.6, skillId: 'parole', min: 6, max: 16,
    line: 'Peu payé, peu fatigant, et la moitié du quartier passe devant toi.',
  },
  {
    id: 'livraisons', label: 'Les livraisons du soir', emoji: '🛵',
    rate: 18, toll: 1.1, quiet: 0.35, skillId: null, min: 6, max: 16,
    line: 'Dehors, à l’heure où tout le monde rentre. On te reconnaîtra.',
  },
  {
    id: 'extras', label: 'Les extras en salle', emoji: '🥂',
    rate: 24, toll: 1.35, quiet: 0.15, skillId: 'ordre', min: 5, max: 18,
    line: 'Ce qui paie le mieux, et devant les gens qu’il ne faudrait pas.',
  },
  {
    id: 'cours', label: 'Des cours particuliers', emoji: '📖',
    /*
     * Huit heures au plus, et c'est tout ce qui l'empêche d'être le seul choix
     * du système : bien payé, reposant, discret, et sous le seuil à partir
     * duquel la carrière s'en ressent. Mesuré à douze heures, il rapportait
     * 161 708 de plus que le témoin **avec une performance supérieure à la
     * sienne** — un poste qu'on prend sans y penser n'est pas une décision.
     * Ce que sa propre phrase disait déjà : on ne t'en prendra jamais beaucoup.
     */
    rate: 26, toll: 0.5, quiet: 0.85, skillId: 'plume', min: 3, max: 8,
    line: 'Bien payé, discret, reposant — et l’on ne t’en prendra jamais beaucoup.',
  },
  {
    id: 'veilles', label: 'Des veilles', emoji: '🔦',
    /*
     * Quatorze et non dix. À dix, mesuré, le poste rapportait 3 547 de plus que
     * de ne rien faire **et** coûtait dix-sept points de performance : personne
     * ne l'aurait pris, et une ligne que personne ne prend n'est pas un choix.
     * Ce qu'il vend n'est pas l'argent, c'est de rester en état — il est le
     * seul des six à laisser la santé au-dessus de celle du témoin.
     */
    rate: 14, toll: 0.35, quiet: 0.9, skillId: null, min: 10, max: 22,
    line: 'Payé à ne rien faire, ou presque. Il faut juste y être.',
  },
];

export function getShift(id: string | null | undefined): Shift | undefined {
  return SHIFTS.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Combien de semaines dans une année de travail. */
export const WEEKS = 46;

/**
 * Ce que le temps pris ailleurs retire à la performance du poste principal.
 *
 * **C'est le côté qui manquait au jeu tout entier.** `careers.ts#advanceCareer`
 * ne savait rien de ce qu'on faisait à côté : on pouvait tenir un plein temps,
 * une activité indépendante et une entreprise sans que la carrière n'en sache
 * jamais rien. `venture.ts#timeBudget` comptait déjà les trois — personne ne le
 * lisait de ce côté-là.
 */
export const CROWDED = 16;

/** Le temps libre en dessous duquel le poste principal commence à s'en ressentir. */
export const CROWDED_UNDER = 0.34;

/** Combien d'années de rang l'employeur principal met à l'apprendre, au plus discret. */
export const HUSH = 26;

/** Ce que se faire prendre coûte en satisfaction, et ce qu'il met au dossier. */
export const CAUGHT_STING = 18;

/** Ce qu'une heure hebdomadaire fait gagner de compétence sur l'année. */
export const SKILL_PER_HOUR = 0.11;

/** Ce qu'on ne peut pas dépasser en heures cumulées sur les deux postes. */
export const HOURS_CEILING = 68;
