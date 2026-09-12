/**
 * Comment tu es arrivé — ce que personne ne choisit.
 *
 * **Ce que ce fichier ouvre.** `data/cradle.ts` règle déjà tout ce qu'on
 * décide avant de naître : la structure du foyer, la fratrie, le tempérament,
 * l'apparence, et l'enveloppe de potentiels qu'il faut répartir. C'est la
 * moitié choisie du départ.
 *
 * L'autre moitié n'existait pas. Toutes les vies commençaient exactement de la
 * même façon : un seul bébé, à terme, dans le pays de ses parents, dans une
 * maison sans animal. Le catalogue le disait en quatre mots — « jumeau,
 * naissance prématurée, né en voyage, enfant trouvé » — et rien dans le code
 * n'en portait la trace : `newLife.ts` pose `pets: []` pour tout le monde, et
 * aucun fichier ne contient le mot « jumeau ».
 *
 * Trois principes.
 *
 * **1. Ce sont des conditions, pas des événements.** Un événement se produit
 * puis se referme. Une circonstance de naissance dure : le jumeau est une
 * personne pour toute la vie, le second pays reste un endroit où retourner,
 * l'enfant trouvé cherche encore à cinquante ans. Chacune est donc branchée
 * sur un système qui tourne déjà — la fratrie, la santé, les langues, les
 * racines, les bêtes — plutôt que sur un texte qui s'affiche une fois.
 *
 * **2. On ne les choisit pas, et c'est le propos.** C'est l'exact contraire de
 * `cradle.ts`. Le jeu laisse composer son départ ; il ne laisse pas composer
 * son arrivée. Une partie sur trente commence avec un jumeau, et il n'y a
 * aucun bouton pour le demander.
 *
 * **3. Aucune n'est un bonus.** Naître ailleurs donne une langue et coûte un
 * déracinement. Naître avant terme coûte une constitution que le foyer
 * rachète — ou pas, et c'est là que la fortune des parents se met à compter
 * dès la première année plutôt qu'à dix-huit ans. Un animal déjà là fait une
 * enfance plus douce et une première mort plus tôt.
 *
 * Rien ici ne décrit de procédure médicale : « avant terme » est un état de
 * départ et une pente de rattrapage, pas un protocole.
 */

/* ------------------------------------------------------------------ */
/* Les circonstances                                                   */
/* ------------------------------------------------------------------ */

export interface BirthMark {
  id: string;
  label: string;
  emoji: string;
  /** Ce qu'on en dit au joueur, à la naissance. */
  line: string;
  /** Ce que ça change, en clair, pour l'écran des origines. */
  note: string;
  /** Sur combien de vies, à peu près, il y en a une. */
  odds: number;
}

/**
 * Cinq façons d'arriver, et ce que chacune pèse.
 *
 * Les fréquences sont des ordres de grandeur, pas des statistiques : ce qui
 * compte est qu'un jumeau reste rare assez pour surprendre et fréquent assez
 * pour se rencontrer. À trois pour cent, une centaine de parties en donne
 * trois — ce que le joueur peut remarquer sans que ça devienne le cas normal.
 */
export const BIRTH_MARKS: BirthMark[] = [
  {
    id: 'jumeau', label: 'Jumeau', emoji: '👶',
    odds: 0.03,
    line: 'Vous êtes deux. Vous l’avez toujours été.',
    note: 'Quelqu’un de ton âge exact, dans la même maison, toute la vie.',
  },
  {
    id: 'avantTerme', label: 'Né avant terme', emoji: '⏳',
    odds: 0.09,
    line: 'Tu es arrivé trop tôt, et les premiers mois ont été longs.',
    note: 'Une constitution amoindrie au départ, que le foyer rattrape s’il en a les moyens.',
  },
  {
    id: 'ailleurs', label: 'Né ailleurs', emoji: '🧭',
    odds: 0.05,
    line: 'Tu n’es pas né là où ta famille habite.',
    note: 'Un second pays : une langue commencée, et un endroit où retourner.',
  },
  {
    id: 'trouve', label: 'Enfant trouvé', emoji: '🕯️',
    odds: 0.012,
    line: 'Personne ne sait de qui tu es né.',
    note: 'Aucun parent connu. La recherche des origines part de rien.',
  },
  {
    id: 'beteDejaLa', label: 'Une bête déjà là', emoji: '🐕',
    odds: 0.22,
    line: 'Il y avait déjà quelqu’un dans la maison quand tu es arrivé.',
    note: 'L’animal des parents, plus vieux que toi. Il ne te verra pas grandir jusqu’au bout.',
  },
];

export function getBirthMark(id: string): BirthMark | undefined {
  return BIRTH_MARKS.find((m) => m.id === id);
}

/* ------------------------------------------------------------------ */
/* Naître avant terme                                                  */
/* ------------------------------------------------------------------ */

/** Ce que la constitution perd au départ. */
export const EARLY_COST = 22;

/**
 * Ce que le foyer rattrape par an, au mieux.
 *
 * C'est le seul endroit du jeu où la fortune des parents agit dès la première
 * année. Ailleurs, le milieu décide des études, des relations et du premier
 * emploi — tout cela arrive après dix ans. Ici, un foyer aisé rachète la
 * constitution perdue avant l'école, et un foyer démuni ne la rachète jamais
 * complètement.
 */
export const EARLY_MEND = 3.2;

/**
 * La part du rattrapage qui passe même sans un sou.
 *
 * À trois dixièmes, un foyer démuni remboursait tout de même 18,7 des 22
 * points de dette et n'en gardait que 3,3 : la pente existait sur le papier et
 * ne séparait presque personne. À dix-huit centièmes, il en garde une dizaine
 * — assez pour que « naître trop tôt dans un foyer pauvre » veuille dire
 * quelque chose, sans jamais rien enlever à qui n'est pas concerné.
 */
export const MEND_FLOOR = 0.18;

/** Après cet âge, ce qui n'a pas été rattrapé ne le sera plus. */
export const MEND_UNTIL = 14;

/* ------------------------------------------------------------------ */
/* Naître ailleurs                                                     */
/* ------------------------------------------------------------------ */

/** Le niveau de départ dans la langue du pays de naissance. */
export const ELSEWHERE_TONGUE = 34;

/**
 * Ce que ça coûte de n'être pas d'ici.
 *
 * Un enfant né ailleurs ramené tout petit garde surtout un papier et une
 * langue ; ce qu'il perd est une place évidente quelque part. Le jeu en fait
 * un léger retrait de la vie sociale de l'enfance, que rien n'oblige à garder
 * — et beaucoup rattrapent.
 */
export const ELSEWHERE_APART = 8;

/* ------------------------------------------------------------------ */
/* L'enfant trouvé                                                     */
/* ------------------------------------------------------------------ */

/**
 * Ce que la piste vaut au départ pour un enfant trouvé.
 *
 * `roots.ts` fait déjà chercher un enfant adopté ou placé : il y a un dossier,
 * une administration, des gens qui savent. Un enfant trouvé n'a rien de tout
 * cela, et c'est la seule différence — la recherche part plus bas et rend
 * moins à chaque piste.
 */
export const FOUND_TRAIL = 0.55;

/* ------------------------------------------------------------------ */
/* La bête du foyer                                                    */
/* ------------------------------------------------------------------ */

/** L'âge qu'a déjà l'animal des parents quand l'enfant arrive. */
export const HOUSE_BEAST_AGE: [number, number] = [1, 6];

/** Les espèces qu'un foyer a avant d'avoir un enfant. */
export const HOUSE_BEAST_SPECIES = ['dog', 'cat', 'cat', 'dog', 'rabbit', 'bird'];

/** Ce qu'une bête dans la maison ajoute au bonheur d'enfance. */
export const HOUSE_BEAST_WARMTH = 6;
