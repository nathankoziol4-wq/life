/**
 * Les tranches d'âge, et le plancher d'événements que chacune doit tenir.
 *
 * **Pourquoi c'est de la donnée et non un réglage d'outil.** La densité par
 * âge se mesurait à la main, et le catalogue le disait. `tools/audit-densite.mjs`
 * la mesure désormais en continu — mais un outil qui définit seul ses propres
 * tranches mesure ce qu'il veut, et la suite de tests en tient un plancher
 * ailleurs, sur d'autres bornes. Les deux finissent par ne plus parler de la
 * même chose.
 *
 * Ce fichier est donc l'endroit unique où l'on dit *quelles tranches* et
 * *combien au minimum*. L'outil les lit pour son rapport, `enfance.test.ts`
 * les lit pour son plancher.
 *
 * **Ce que la mesure a trouvé.** Un âge qu'on traverse sans que rien n'arrive
 * est un trou que personne ne voit : un écran vide ressemble à un écran calme.
 * La moyenne par tranche ne suffit pas à les trouver — « Avant l'école »
 * rendait 13,3 événements tirables une année donnée, ce qui se lit comme une
 * pente. Année par année, ce n'en était pas une :
 *
 *     1 an  :  1,4      4 ans : 21,7
 *     2 ans :  2,8      5 ans : 28,7
 *     3 ans : 12,2      6 ans : 32,0
 *
 * Les vingt scènes qu'un audit précédent avait ajoutées pour combler la
 * tranche commençaient toutes à trois ans ou plus. La moyenne, remontée par
 * les grands, ne disait pas qu'à un et deux ans il ne se passait rien.
 */

/** Une tranche de vie, telle qu'on la lit — pas des dizaines rondes. */
export interface AgeBand {
  id: string;
  label: string;
  from: number;
  to: number;
}

export const BANDS: AgeBand[] = [
  { id: 'bébé', label: 'Avant l’école', from: 0, to: 5 },
  { id: 'école', label: 'L’école primaire', from: 6, to: 10 },
  { id: 'collège', label: 'Le collège', from: 11, to: 14 },
  { id: 'lycée', label: 'Le lycée', from: 15, to: 17 },
  { id: 'jeune', label: 'Les débuts', from: 18, to: 25 },
  { id: 'adulte', label: 'L’âge adulte', from: 26, to: 44 },
  { id: 'milieu', label: 'La deuxième moitié', from: 45, to: 64 },
  { id: 'vieux', label: 'Après soixante-cinq', from: 65, to: 120 },
];

export function bandOf(age: number): AgeBand | undefined {
  return BANDS.find((b) => age >= b.from && age <= b.to);
}

/**
 * Le plancher : en dessous, l'année est creuse.
 *
 * Dix événements réellement tirables, ce n'est pas beaucoup — mais c'est le
 * seuil en dessous duquel deux vies voient la même chose. C'est ce qu'on
 * défend, et non une richesse égale à tous les âges : un enfant d'un an a
 * moins de vies possibles qu'un adulte de trente, et prétendre le contraire
 * produirait des scènes inventées pour remplir un tableau.
 */
export const YEAR_FLOOR = 10;

/**
 * Le plancher du catalogue, plus haut : il compte le plafond, pas le réel.
 *
 * À un an, le catalogue annonçait quinze événements dont **cinq de prison** —
 * sans `minAge`, donc comptés à tous les âges, et qu'un bébé ne tirera jamais.
 * Un plancher sur le catalogue doit donc être plus élevé que celui sur le
 * tirable pour dire la même chose.
 */
export const CATALOGUE_FLOOR = 14;

/** Un événement peut-il tomber à cet âge, du seul point de vue du catalogue ? */
export function eligibleAt(
  event: { cond?: { minAge?: number; maxAge?: number } },
  age: number,
): boolean {
  const cond = event.cond ?? {};
  if (cond.minAge !== undefined && age < cond.minAge) return false;
  if (cond.maxAge !== undefined && age > cond.maxAge) return false;
  return true;
}
