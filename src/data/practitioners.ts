/**
 * Trouver quelqu'un de bien — le catalogue des praticiens.
 *
 * **Ce que ce fichier remplace.** Le jeu proposait quatre *types* de
 * praticien : généraliste, spécialiste, psychologue, urgences. Chacun avait un
 * prix fixe et une qualité fixe — et l'écran affichait la qualité en clair :
 * « Fiabilité du diagnostic : 60 % ». Choisir un médecin revenait donc à lire
 * deux nombres et à prendre le plus grand qu'on pouvait payer. Ce n'était pas
 * une décision, c'était une soustraction.
 *
 * Le catalogue de référence le disait à deux endroits — « Choisir son
 * médecin : les soins sont anonymes, ni praticien, ni réputation, ni prix
 * comparés » et « Spécialistes » — et les deux notes portaient.
 *
 * Ce que le système raconte à la place tient en une phrase : **on ne sait pas
 * ce que vaut un médecin avant de l'avoir consulté plusieurs fois.** D'où
 * trois règles de conception :
 *
 * **1. La compétence est cachée.** Ce qu'on voit, c'est le prix et ce que les
 * gens en disent. Les deux sont corrélés à la compétence — et imparfaitement,
 * ce qui est la seule façon d'en faire des indices plutôt que des étiquettes.
 *
 * **2. Le prix suit la réputation, pas la compétence.** Payer cher achète donc
 * une réputation, pas de façon fiable de meilleurs soins. Un généraliste
 * discret et bon marché peut être excellent ; un nom qu'on se répasse peut
 * expédier.
 *
 * **3. On apprend en vivant avec.** Au bout de quelques consultations, on
 * commence à savoir ce que vaut le sien — et changer coûte ce qu'on avait
 * appris sur l'autre.
 *
 * Rien ici ne décrit de médecine : une spécialité est une liste de catégories
 * de maladies du jeu, une compétence est un nombre entre zéro et un, et aucun
 * acte, symptôme ou traitement réel n'est nommé.
 */

import type { Disease } from './diseases.ts';

export interface Specialty {
  id: string;
  /** Comment on l'appelle. */
  label: string;
  emoji: string;
  /** Ce qu'il sait regarder. */
  categories: Disease['category'][];
  /** Le tarif de référence, avant réputation, pays et inflation. */
  fee: number;
  /** Combien de praticiens de cette sorte une ville offre. */
  count: number;
  /** Ce qu'il fait, en une phrase courte. */
  line: string;
}

export const SPECIALTIES: Specialty[] = [
  {
    id: 'gp',
    label: 'Généraliste',
    emoji: '🩺',
    categories: ['infection', 'chronique', 'autre', 'blessure'],
    fee: 45,
    count: 3,
    line: 'Voit tout, en surface.',
  },
  {
    id: 'specialist',
    label: 'Spécialiste',
    emoji: '🥼',
    categories: ['cardio', 'cancer', 'neuro', 'chronique', 'autre'],
    fee: 180,
    count: 2,
    line: 'Ne regarde qu’un endroit, mais il le regarde bien.',
  },
  {
    id: 'therapist',
    label: 'Psychologue',
    emoji: '🛋️',
    categories: ['mentale'],
    fee: 90,
    count: 2,
    line: 'La seule porte pour ce qui ne se voit pas.',
  },
];

export function getSpecialty(id: string): Specialty | undefined {
  return SPECIALTIES.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ */
/* Les urgences                                                        */
/* ------------------------------------------------------------------ */

/**
 * Les urgences ne sont pas quelqu'un.
 *
 * On n'y choisit personne, on n'y revient pas, et l'on n'apprend rien de qui
 * vous a vu. C'est le seul recours qui reste quand on n'a pas de médecin, et
 * il coûte ce que coûte de n'en avoir pas : cher, et sans suite.
 */
export const ER = {
  id: 'er',
  label: 'Urgences',
  emoji: '🚨',
  categories: ['blessure', 'cardio', 'infection', 'neuro'] as Disease['category'][],
  fee: 620,
  skill: 0.8,
  line: 'On te verra. Tu ne sauras jamais par qui.',
};

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Bornes de la compétence cachée. */
export const SKILL_FLOOR = 0.34;
export const SKILL_RANGE = 0.62;

/**
 * De combien la réputation peut se tromper sur la compétence, en points.
 *
 * **Le réglage qui fait tout le système.** À zéro, la réputation *serait* la
 * compétence et l'on retomberait sur le nombre affiché en clair qu'on
 * remplace. Trop haut, elle ne dirait plus rien et le choix redeviendrait un
 * tirage. À vingt-deux, elle informe sans trancher : un praticien très bien
 * noté est bon la plupart du temps, et de temps en temps non — ce qui est
 * exactement ce qu'on veut faire découvrir.
 */
export const RENOWN_NOISE = 22;

/**
 * Combien de consultations une année supporte, tous praticiens confondus.
 *
 * **Deux, et pas sept.** La limite d'avant était par praticien, ce qui
 * laissait voir tout le cabinet dans la même année : avec sept avis, la
 * compétence de chacun cessait de compter puisqu'il suffisait qu'un seul
 * trouve. Choisir quelqu'un n'aurait plus rien voulu dire.
 *
 * Deux, parce qu'un second avis est une décision qu'on doit pouvoir prendre —
 * c'est même la bonne décision quand on doute de son médecin — et qu'au-delà
 * ce n'est plus se soigner, c'est ratisser.
 */
export const PER_YEAR = 2;

/** Combien de consultations avant de commencer à savoir ce qu'il vaut. */
export const READ_AFTER = 3;

/** Ce que le médecin traitant fait au tarif. */
export const REGULAR_DISCOUNT = 0.7;

/** Ce qu'on apprend plus vite du sien. */
export const REGULAR_LEARNS = 1.6;
