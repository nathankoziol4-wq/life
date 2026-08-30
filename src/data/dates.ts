/**
 * Sortir avec quelqu'un, et découvrir qui c'est.
 *
 * Le catalogue disait « aucun rendez-vous : la séduction est une suite de
 * clics sans scène ». Deux mesures ont dit pire que cela.
 *
 *     d'inconnu à couple      : 9,1 gestes — parler, parler, demander
 *     partenaires plutôt loyaux : 46 % · plutôt chaleureux : 49 %
 *
 * Quarante-six pour cent, c'est le hasard exact. Le joueur ne choisit donc
 * *personne* : il clique jusqu'à ce que le nombre monte. Et pourtant tout ce
 * qu'il faudrait pour choisir est déjà là — le moteur fait dépendre les
 * infidélités de la loyauté, les disputes du caractère, les cadeaux de la
 * générosité. Le problème est à l'autre bout :
 *
 *     ce qu'on sait d'un inconnu, à la seconde où on le rencontre :
 *       warmth 43 · ambition 38 · temper 48 · loyalty 50 · generosity 35
 *
 * L'écran affiche l'âme d'un inconnu en neuf nombres. Il n'y a rien à
 * découvrir, donc rien à jouer, donc rien qui distingue une personne d'une
 * autre — juste un compteur à faire monter.
 *
 * Ce fichier renverse cela. **On ne sait rien de quelqu'un tant qu'on n'a
 * rien vécu avec lui.** Une soirée est une suite de moments où l'on répond
 * quelque chose ; ce qu'on dit s'adresse à un trait, et ce trait se découvre
 * *parce qu'on l'a mis à l'épreuve*. Bien sortir avec quelqu'un, c'est
 * apprendre à qui l'on parle avant de l'épouser.
 */

/** Les traits qu'une soirée peut mettre à l'épreuve. */
export type TraitId = 'warmth' | 'loyalty' | 'generosity' | 'temper' | 'ambition';

/** Les cinq traits, dans l'ordre où la fiche les montre. */
export const TRAITS: TraitId[] = ['warmth', 'loyalty', 'generosity', 'temper', 'ambition'];

export const TRAIT_LABEL: Record<TraitId, string> = {
  warmth: 'Chaleur humaine',
  loyalty: 'Loyauté',
  generosity: 'Générosité',
  temper: 'Caractère',
  ambition: 'Ambition',
};

/**
 * Ce qu'on comprend d'un trait quand on le voit, selon qu'il est haut ou bas.
 *
 * Sert au compte rendu de fin de soirée : « tu sais maintenant que… ». Sans
 * cette phrase, découvrir un trait ne serait qu'un chiffre de plus.
 */
export const TRAIT_HIGH: Record<TraitId, string> = {
  warmth: 'quelqu’un de chaleureux',
  loyalty: 'quelqu’un sur qui on peut compter',
  generosity: 'quelqu’un qui donne sans compter',
  temper: 'quelqu’un qui s’emporte vite',
  ambition: 'quelqu’un qui veut arriver',
};

export const TRAIT_LOW: Record<TraitId, string> = {
  warmth: 'quelqu’un de distant',
  loyalty: 'quelqu’un qui ne s’attache pas',
  generosity: 'quelqu’un qui compte',
  temper: 'quelqu’un que rien ne fait sortir de ses gonds',
  ambition: 'quelqu’un qui ne demande rien à la vie',
};

/* ------------------------------------------------------------------ */
/* Où l'on va                                                          */
/* ------------------------------------------------------------------ */

/** Un endroit où emmener quelqu'un. */
export interface Place {
  id: string;
  label: string;
  emoji: string;
  note: string;
  /** Ce que la soirée coûte, avant ajustement au pays et à l'époque. */
  cost: number;
  /** L'âge à partir duquel on y emmène quelqu'un. */
  from: number;
  /**
   * Le trait auquel l'endroit lui-même s'adresse.
   *
   * Choisir où aller est donc déjà un pari sur qui est l'autre : un
   * restaurant cher flatte qui veut arriver et agace qui compte.
   */
  appeals: TraitId;
  /** Combien de moments la soirée compte. Une longue soirée en dit plus. */
  beats: number;
}

/**
 * Huit endroits, et le même arbitrage partout : ce qui coûte cher s'adresse
 * à ce qui se voit, ce qui ne coûte rien s'adresse à ce qui se vit.
 *
 * Aucun n'est meilleur qu'un autre dans l'absolu — c'est tout l'intérêt.
 * Emmener quelqu'un de distant marcher trois heures est une mauvaise idée,
 * et l'on ne peut le savoir qu'en le connaissant déjà un peu.
 */
export const PLACES: Place[] = [
  {
    id: 'cafe', label: 'Un café', emoji: '☕',
    note: 'Une heure, pas plus. De quoi voir si l’on a envie d’une deuxième.',
    cost: 18, from: 14, appeals: 'warmth', beats: 2,
  },
  {
    id: 'marche', label: 'Une longue marche', emoji: '🥾',
    note: 'Rien à payer, rien pour se cacher. On parle ou on ne parle pas.',
    cost: 0, from: 14, appeals: 'warmth', beats: 3,
  },
  {
    id: 'cinema', label: 'Le cinéma', emoji: '🎬',
    note: 'Deux heures sans avoir à dire un mot. Ce qui aide, ou n’aide pas.',
    cost: 34, from: 14, appeals: 'temper', beats: 2,
  },
  {
    id: 'restaurant', label: 'Un bon restaurant', emoji: '🍽️',
    note: 'La table qu’on montre. Flatte qui veut arriver, agace qui compte.',
    cost: 190, from: 18, appeals: 'ambition', beats: 3,
  },
  {
    id: 'concert', label: 'Un concert', emoji: '🎤',
    note: 'Trop de monde et trop de bruit pour faire semblant.',
    cost: 95, from: 16, appeals: 'temper', beats: 3,
  },
  {
    id: 'chezsoi', label: 'Un dîner chez toi', emoji: '🕯️',
    note: 'Tu cuisines, tu ranges, tu ouvres ta porte. Ce n’est pas rien.',
    cost: 46, from: 18, appeals: 'generosity', beats: 3,
  },
  {
    id: 'fete', label: 'Une fête chez des amis', emoji: '🎉',
    note: 'On y voit quelqu’un entouré, ce qui n’est pas la même personne.',
    cost: 24, from: 16, appeals: 'generosity', beats: 3,
  },
  {
    id: 'weekend', label: 'Un week-end à deux', emoji: '🧳',
    note: 'Deux jours sans échappatoire. On en revient rarement pareil.',
    cost: 720, from: 20, appeals: 'loyalty', beats: 4,
  },
];

export function getPlace(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce qui se passe pendant                                             */
/* ------------------------------------------------------------------ */

/** Une réponse possible à un moment de la soirée. */
export interface Reply {
  text: string;
  /** Le trait auquel cette réponse s'adresse. C'est lui qu'on découvrira. */
  appeals: TraitId;
}

/** Un moment de la soirée. */
export interface Beat {
  id: string;
  /** Ce qui arrive. Aucune mention de l'endroit : ils se combinent tous. */
  scene: string;
  replies: Reply[];
}

/**
 * Douze moments, trois réponses chacun, et chaque réponse s'adresse à un
 * trait différent.
 *
 * Aucune scène ne genre la personne en face : elles se jouent avec n'importe
 * qui, et une capture d'écran a montré « Il dit quelque chose » devant une
 * femme — le même défaut qu'une page de rancune où une sœur devenait « il ».
 *
 * C'est ce qui fait de la soirée un jeu plutôt qu'un texte : répondre, c'est
 * parier sur qui est en face. Une réponse qui s'adresse à la chaleur d'un
 * indifférent tombe à plat ; la même, à quelqu'un de chaleureux, ouvre la
 * soirée. On ne le sait pas d'avance — mais la réaction, elle, se lit.
 */
export const BEATS: Beat[] = [
  {
    id: 'silence',
    scene: 'Il y a un silence. Pas gênant encore, mais il dure.',
    replies: [
      { text: 'Demander comment ça va, vraiment', appeals: 'warmth' },
      { text: 'Raconter ce que tu comptes faire de ta vie', appeals: 'ambition' },
      { text: 'Le laisser durer et sourire', appeals: 'temper' },
    ],
  },
  {
    id: 'addition',
    scene: 'Quelque chose est à payer, et personne n’a bougé.',
    replies: [
      { text: 'Payer tout, sans en parler', appeals: 'generosity' },
      { text: 'Proposer de partager', appeals: 'loyalty' },
      { text: 'Payer et le faire remarquer', appeals: 'ambition' },
    ],
  },
  {
    id: 'passe',
    scene: 'La conversation glisse vers ce qu’il y avait avant toi.',
    replies: [
      { text: 'Écouter jusqu’au bout sans rien dire', appeals: 'warmth' },
      { text: 'Demander pourquoi ça s’est arrêté', appeals: 'loyalty' },
      { text: 'Changer de sujet en riant', appeals: 'temper' },
    ],
  },
  {
    id: 'contretemps',
    scene: 'Un contretemps : une file, une panne, une porte fermée.',
    replies: [
      { text: 'En rire et improviser autre chose', appeals: 'temper' },
      { text: 'Régler le problème en payant', appeals: 'generosity' },
      { text: 'S’en servir pour parler d’autre chose', appeals: 'warmth' },
    ],
  },
  {
    id: 'inconnu',
    scene: 'Quelqu’un vous aborde, un peu trop familier.',
    replies: [
      { text: 'Couper court, poliment mais net', appeals: 'loyalty' },
      { text: 'L’inclure dans la conversation', appeals: 'warmth' },
      { text: 'Le remettre à sa place', appeals: 'temper' },
    ],
  },
  {
    id: 'avenir',
    scene: 'La question tombe : où te vois-tu dans dix ans ?',
    replies: [
      { text: 'Décrire exactement où tu comptes être', appeals: 'ambition' },
      { text: 'Dire que ça dépendra de qui sera là', appeals: 'warmth' },
      { text: 'Répondre que tu n’en sais rien, et t’en moquer', appeals: 'temper' },
    ],
  },
  {
    id: 'cadeau',
    scene: 'Tu as pensé à apporter quelque chose. Ou pas.',
    replies: [
      { text: 'Le donner maintenant, simplement', appeals: 'generosity' },
      { text: 'Attendre la fin de la soirée', appeals: 'loyalty' },
      { text: 'Expliquer ce que ça t’a coûté de trouver', appeals: 'ambition' },
    ],
  },
  {
    id: 'aveu',
    scene: 'La confidence part plus loin que prévu, puis s’arrête net.',
    replies: [
      { text: 'Répondre par quelque chose d’aussi intime', appeals: 'warmth' },
      { text: 'Promettre que ça reste entre vous', appeals: 'loyalty' },
      { text: 'Détendre l’air d’une plaisanterie', appeals: 'temper' },
    ],
  },
  {
    id: 'travail',
    scene: 'Le travail revient dans la conversation, et y reste longtemps.',
    replies: [
      { text: 'Poser des questions précises', appeals: 'ambition' },
      { text: 'Demander si ça le rend heureux', appeals: 'warmth' },
      { text: 'Proposer de l’aider pour ce qui coince', appeals: 'generosity' },
    ],
  },
  {
    id: 'tard',
    scene: 'Il se fait tard. Personne ne l’a encore dit.',
    replies: [
      { text: 'Proposer de prolonger', appeals: 'temper' },
      { text: 'Le raccompagner', appeals: 'warmth' },
      { text: 'Dire que tu veux recommencer bientôt', appeals: 'loyalty' },
    ],
  },
  {
    id: 'argent',
    scene: 'Le prix de quelque chose vient dans la conversation.',
    replies: [
      { text: 'Dire que ça ne compte pas', appeals: 'generosity' },
      { text: 'Dire ce que tu gagnes', appeals: 'ambition' },
      { text: 'Répondre que tu t’en fiches complètement', appeals: 'temper' },
    ],
  },
  {
    id: 'photo',
    scene: 'On propose de garder une trace de la soirée.',
    replies: [
      { text: 'Accepter et la lui envoyer aussitôt', appeals: 'warmth' },
      { text: 'Dire que tu la gardes pour toi', appeals: 'loyalty' },
      { text: 'Refuser en riant', appeals: 'temper' },
    ],
  },
];

export function getBeat(id: string): Beat | undefined {
  return BEATS.find((b) => b.id === id);
}

/* ------------------------------------------------------------------ */
/* Les nombres                                                         */
/* ------------------------------------------------------------------ */

/** Au-dessus : la réponse touche juste. En dessous de `COLD` : elle tombe. */
export const WARM = 56;
export const COLD = 42;

/** Ce qu'une réponse juste, tiède ou fausse déplace sur le lien. */
export const LANDS = 5.5;
export const MISSES = -3.5;

/** Ce qu'il faut de « parole » pour lire une réaction précisément. */
export const READS_AT = 45;

/** Combien de sorties par an, avec la même personne. */
export const OUTINGS_PER_YEAR = 2;

/**
 * Ce qu'une bonne soirée laisse comme avantage à la demande qui suit.
 *
 * Sans cela, la cour ne servirait qu'à savoir — ce qui est déjà beaucoup,
 * mais laisserait la mise en couple exactement où elle était : trois clics
 * et un tirage.
 */
export const COURTED_BONUS = 0.3;
