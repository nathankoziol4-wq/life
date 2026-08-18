/**
 * D'où vient un objet, et ce qu'il vaut vraiment.
 *
 * Le catalogue listait six manques autour des objets de valeur —
 * authenticité, enchères, marché parallèle, provenance, transmission,
 * collection — et une mesure a dit quelque chose de plus dur que tout cela :
 *
 *     vies qui possèdent un objet : 0 %
 *     objets par vie              : 0,00
 *     catalogue                   : 18 articles, dont 12 prennent de la valeur
 *
 * Personne n'achète jamais rien. Ajouter une salle des ventes à une boutique
 * que nul ne visite serait exactement le défaut que §244 interdit : un bouton
 * de plus. Le vrai manque n'est pas « il n'y a pas d'enchères », c'est que
 * **posséder un objet n'a aucune raison d'être**.
 *
 * D'où la règle de ce fichier : **ce qui a de la valeur ne s'achète pas au
 * prix affiché**. Un objet acheté en boutique est certain, sans surprise et
 * sans marge. Ce qui peut valoir quelque chose se déniche, se doute, et ne se
 * confirme qu'en payant quelqu'un qui sait — ou en apprenant à savoir
 * soi-même.
 */

/** Où l'on met la main sur un objet. */
export interface Provenance {
  id: string;
  label: string;
  emoji: string;
  note: string;
  /** Ce qu'une sortie coûte, avant ajustement au pays. */
  cost: number;
  /** La part du prix de catalogue qu'on paie ici. */
  price: number;
  /** La chance que ce soit vraiment ce qu'on croit. */
  genuine: number;
  /** L'âge à partir duquel on y va. */
  from: number;
  /** Ne sort-il de là que des pièces de valeur ? */
  rich?: true;
}

/**
 * Quatre façons de trouver, et elles s'échangent exactement.
 *
 * Plus c'est bon marché, moins c'est sûr. La boutique ne trompe jamais et ne
 * rapporte jamais ; le lot fermé peut faire une vie ou vider une poche. C'est
 * le seul arbitrage du système, et il doit rester lisible d'un coup d'œil.
 */
export const PROVENANCES: Provenance[] = [
  {
    id: 'boutique', label: 'La boutique', emoji: '🏬',
    note: 'Prix affiché, garantie, aucune surprise. Tu paies pour ne pas douter.',
    cost: 0, price: 1, genuine: 1, from: 16,
  },
  {
    id: 'brocante', label: 'La brocante', emoji: '🧺',
    note: 'Des tables en plein air. Beaucoup de rien, parfois autre chose.',
    cost: 40, price: 0.42, genuine: 0.62, from: 12,
  },
  {
    id: 'succession', label: 'Une vente après décès', emoji: '🕯️',
    note: 'Une maison qu’on vide. Ce qui sort de là a rarement été acheté hier.',
    cost: 260, price: 0.55, genuine: 0.74, from: 18,
    // Ce qu'on y trouve vaut plus cher : sans cela, elle coûtait davantage
    // que la brocante pour un rendement inférieur — un piège, pas un choix.
    rich: true,
  },
  {
    id: 'lot', label: 'Un lot fermé', emoji: '📦',
    note: 'On achète sans ouvrir. Personne ne promet rien.',
    cost: 900, price: 0.3, genuine: 0.45, from: 18,
  },
];

export function getProvenance(id: string): Provenance | undefined {
  return PROVENANCES.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* Le doute                                                            */
/* ------------------------------------------------------------------ */

/** Ce qu'on sait d'un objet. */
export type Standing = 'douteux' | 'authentique' | 'copie';

export const STANDING_LABEL: Record<Standing, string> = {
  douteux: 'Non expertisé',
  authentique: 'Authentifié',
  copie: 'Copie',
};

/**
 * Ce que le doute retire à un objet qu'on vend sans l'avoir fait expertiser.
 *
 * C'est ce qui donne un prix à l'expertise : vendre dans le doute coûte plus
 * cher que de savoir, mais savoir peut aussi révéler une copie — et alors on
 * aurait mieux fait de se taire. L'arbitrage est réel dans les deux sens.
 */
export const DOUBT_DISCOUNT = 0.55;

/** Ce qu'une copie vaut, une fois qu'on le sait. */
export const FAKE_VALUE = 0.08;

/** Ce qu'une expertise coûte, avant ajustement au pays. */
export const APPRAISAL = 340;

/**
 * L'adresse à partir de laquelle on juge soi-même.
 *
 * Rattaché à la compétence « les chiffres » (`data/skills.ts`), qui est celle
 * de qui sait lire un tableau et voir ce qu'il ne dit pas. En dessous, on
 * paie un expert ; au-dessus, on se trompe encore, mais de moins en moins.
 */
export const EYE_SKILL = 44;
export const EYE_ERROR = 0.42;

/* ------------------------------------------------------------------ */
/* Les collections                                                     */
/* ------------------------------------------------------------------ */

/** Un ensemble qui vaut plus que la somme de ses pièces. */
export interface Sets {
  id: string;
  label: string;
  emoji: string;
  note: string;
  /** Les catégories d'articles qui en font partie. */
  category: string;
  /** Combien de pièces distinctes il faut. */
  needs: number;
  /** Ce que l'ensemble complet multiplie. */
  bonus: number;
}

/**
 * Trois ensembles, et c'est la seule raison de garder plutôt que de revendre.
 *
 * Sans eux, un objet qui prend de la valeur se revend dès qu'il a monté et
 * rien ne se constitue jamais. Une collection demande de la patience et de
 * la place — et elle est la seule chose du jeu qui récompense de ne *pas*
 * vendre.
 */
export const SETS: Sets[] = [
  {
    id: 'mur', label: 'Un mur qui se tient', emoji: '🖼️',
    note: 'Trois œuvres qui se répondent valent plus que trois œuvres.',
    category: 'art', needs: 3, bonus: 1.35,
  },
  {
    id: 'ecrin', label: 'L’écrin', emoji: '💎',
    note: 'Une parure complète ne se vend pas au poids.',
    category: 'bijoux', needs: 3, bonus: 1.3,
  },
  {
    id: 'serie', label: 'La série', emoji: '🗃️',
    note: 'Ce qui compte dans une série, c’est qu’il n’en manque pas.',
    category: 'collection', needs: 4, bonus: 1.45,
  },
];

export function getSet(id: string): Sets | undefined {
  return SETS.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ */
/* La salle des ventes                                                 */
/* ------------------------------------------------------------------ */

/**
 * L'enchère : la seule vente où l'on peut repartir avec son objet.
 *
 * Les trois « canaux » d'avant n'étaient que trois multiplicateurs, et la
 * « salle des ventes » valait `rate: 1.0` — un nom, pas une vente. Ici on
 * pose un prix de réserve : trop bas, on brade ; trop haut, personne ne suit
 * et l'objet revient, la commission en moins.
 */
export const RESERVE = {
  /** Ce que la salle prend, qu'on vende ou non. */
  fee: 0.09,
  /** La réserve la plus basse qu'on puisse poser, en part de l'estimation. */
  floor: 0.4,
  /** La plus haute. */
  ceiling: 1.8,
  /** Au-delà de cette part de l'estimation, la salle se vide. */
  patience: 1.15,
};

/** Ce qu'une expertise ajoute à l'intérêt de la salle. */
export const PAPERS_BONUS = 0.22;
