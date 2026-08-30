/**
 * La noce — lieux, tables et ce qu'on y met.
 *
 * **Ce que ce fichier remplace.** Le domaine de l'amour est le plus fourni du
 * jeu : une application de rencontre où l'on apprend à lire l'honnêteté d'un
 * profil, des rendez-vous à douze moments, un divorce avec trois avocats,
 * quatre postures et une garde qui pèse ce qu'on a fait de l'enfance de ses
 * enfants. Et en son centre, un trou : `relationships.ts#marry` prenait
 * trente-cinq pour cent de l'argent du personnage — plafonné à vingt-deux
 * mille —, ajoutait vingt-deux points de bonheur et cinq de réputation, et
 * c'était fini. **Le joueur ne décidait rien.** Le catalogue le disait :
 * « se marier est instantané et gratuit ».
 *
 * La noce est un arbitrage à trois côtés, et aucun ne s'obtient sans céder sur
 * les autres :
 *
 * — **l'argent**, qui manquera ailleurs — une noce se paie avec l'apport d'un
 *   logement ;
 * — **les places**, parce qu'un lieu en a un nombre fini ;
 * — **les gens**, parce que celui qu'on n'invite pas l'apprend.
 *
 * C'est ce troisième côté qui fait la décision. Inviter quelqu'un rapproche ;
 * l'oublier éloigne, et d'autant plus qu'il était proche. Un grand domaine
 * permet d'inviter tout le monde et coûte le prix d'une maison ; la mairie ne
 * coûte rien et laisse dehors ceux qui comptent.
 */

export interface Venue {
  id: string;
  label: string;
  emoji: string;
  /** Ce que le lieu coûte, avant l'indice du pays et l'inflation. */
  cost: number;
  /** Combien de personnes tiennent, en plus des mariés. */
  seats: number;
  /** Ce que le lieu vaut aux yeux des autres, en points de réputation. */
  shine: number;
  /** Ce que la journée laisse au couple, en points de lien. */
  bond: number;
  line: string;
}

export const VENUES: Venue[] = [
  {
    id: 'mairie',
    label: 'La mairie, un mardi',
    emoji: '🏛️',
    cost: 0,
    seats: 4,
    shine: 0,
    bond: 4,
    line: 'Deux témoins, vingt minutes, et le reste de ta vie.',
  },
  {
    id: 'salle',
    label: 'La salle des fêtes',
    emoji: '🎪',
    cost: 4200,
    seats: 40,
    shine: 3,
    bond: 8,
    line: 'Des tréteaux, une sono, et tout le monde est venu.',
  },
  {
    id: 'domaine',
    label: 'Un domaine',
    emoji: '🏰',
    cost: 26_000,
    seats: 90,
    shine: 9,
    bond: 12,
    line: 'On en parlera pendant dix ans. Il faudra payer pendant cinq.',
  },
  {
    id: 'plage',
    label: 'Les pieds dans l’eau',
    emoji: '🏝️',
    cost: 41_000,
    seats: 25,
    shine: 11,
    // Peu de places, et loin : c'est beau, et la moitié des gens ne viendra pas.
    bond: 14,
    line: 'Superbe, lointain, et la moitié de tes proches ne fera pas le voyage.',
  },
];

export function getVenue(id: string): Venue | undefined {
  return VENUES.find((v) => v.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce qu'on met sur les tables                                         */
/* ------------------------------------------------------------------ */

export interface Spread {
  id: string;
  label: string;
  emoji: string;
  /** Ce que ça coûte par invité. */
  perHead: number;
  shine: number;
  bond: number;
  line: string;
}

export const SPREADS: Spread[] = [
  /*
   * Zéro, et c'est délibéré : **il faut qu'on puisse toujours se marier.**
   * À douze par tête, une mairie à quatre places coûtait quarante-huit — que
   * la moitié des personnages n'a pas, l'argent médian à trente ans valant
   * zéro. Mesuré, dix vies sur cent vingt restaient fiancées à vie pour une
   * somme à deux chiffres. Un système où les pauvres ne se marient jamais
   * n'est pas un arbitrage, c'est une porte fermée.
   */
  { id: 'rien', label: 'Rien du tout', emoji: '🥂', perHead: 0, shine: -2, bond: 0, line: 'Personne ne dira rien. Tout le monde le remarquera.' },
  { id: 'simple', label: 'Un buffet', emoji: '🥗', perHead: 55, shine: 1, bond: 2, line: 'Correct, et personne n’en reparlera.' },
  { id: 'traiteur', label: 'Un traiteur', emoji: '🍽️', perHead: 140, shine: 5, bond: 4, line: 'Trois services, et des gens qui redemandent le nom.' },
  { id: 'faste', label: 'Rien de trop beau', emoji: '🍾', perHead: 310, shine: 10, bond: 6, line: 'Le genre de repas dont on parle à l’enterrement.' },
];

export function getSpread(id: string): Spread | undefined {
  return SPREADS.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Ce qu'une invitation acceptée rapproche. */
export const INVITED = 7;

/**
 * Ce qu'un oubli éloigne, avant pondération par la proximité.
 *
 * **Le côté qui fait de la noce une décision.** Sans lui, on inviterait le
 * strict minimum et l'on garderait l'argent : ne pas inviter ne coûterait
 * rien. Avec lui, chaque place non prise est quelqu'un qui l'apprend, et
 * d'autant plus mal qu'il était proche.
 */
export const SNUBBED = 11;

/** Les liens qui remarquent qu'on ne les a pas invités. */
export const NOTICES: string[] = [
  'mother', 'father', 'guardian', 'brother', 'sister', 'son', 'daughter',
  'grandmother', 'grandfather', 'bestFriend', 'friend', 'aunt', 'uncle', 'cousin',
];

/** Ce que la préparation prend d'années. Une noce ne se monte pas en un jour. */
export const PLANNING = 1;

/** Ce qu'une noce ratée retire, et ce qu'une belle ajoute, en bonheur. */
export const JOY = 22;
