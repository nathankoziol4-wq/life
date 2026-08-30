/**
 * Les inimitiés.
 *
 * Le catalogue disait « une relation peut baisser, jamais devenir une
 * inimitié avec ses propres actions ». Deux mesures l'ont confirmé, et ont
 * montré quelque chose de plus intéressant :
 *
 *     ponts coupés            1,2 % des gens (et 80 sur 81 sont des amis)
 *     lien au plancher (≤ 2)  41,6 %
 *     trace d'hostilité       0 %
 *
 *     après douze insultes à sa sœur :
 *       opinion 0 · lien 54 · ponts coupés : non
 *
 * Autrement dit : on peut insulter quelqu'un douze fois de suite et rester
 * en bons termes avec lui. `estranged` n'apparaît d'ailleurs jamais que dans
 * des filtres — il *retire* la personne des amis, de l'exposition, des
 * actions — et ne déclenche jamais rien. Se fâcher rendait quelqu'un absent,
 * jamais hostile.
 *
 * Et il existait déjà un chiffre qui disait ce que les gens pensent de vous :
 * `opinion`. Le jeu le calculait, le faisait tomber à zéro, et **personne ne
 * le lisait**. Ce fichier ne crée donc pas une mesure de plus : il donne enfin
 * une suite à celle qui existait.
 *
 * La règle qui gouverne tout : **une rancune agit**. Sans quoi ce serait un
 * libellé de plus sur une fiche, et le défaut qu'on répare est précisément
 * qu'un lien abîmé ne produisait rien.
 */

/** Ce qui a déclenché la rancune. */
export interface Wrong {
  id: string;
  /** Ce qui s'inscrit dans son histoire à lui. */
  line: string;
  /** Ce que ça pèse d'emblée. */
  weight: number;
}

export const WRONGS: Wrong[] = [
  { id: 'insulte', line: 'Ne te pardonne pas ce que tu lui as dit.', weight: 34 },
  { id: 'dispute', line: 'Garde de la rancune après votre dispute.', weight: 22 },
  { id: 'abandon', line: 'Se souvient que tu n’as rien fait pour lui.', weight: 30 },
  { id: 'rupture', line: 'Ne digère pas la rupture.', weight: 28 },
  { id: 'trahison', line: 'Sait ce que tu as fait.', weight: 46 },
  { id: 'ponts', line: 'Tu as coupé les ponts le premier.', weight: 26 },
];

export function getWrong(id: string): Wrong | undefined {
  return WRONGS.find((w) => w.id === id);
}

/* ------------------------------------------------------------------ */
/* Quand une rancune naît                                              */
/* ------------------------------------------------------------------ */

/**
 * L'opinion en dessous de laquelle un tort peut tourner en rancune.
 *
 * L'opinion existait déjà et tombait bien à zéro — mesuré, douze insultes la
 * mettent au plancher — mais rien ne la lisait. C'est elle qui décide ici :
 * un tort fait à quelqu'un qui vous aime encore ne devient pas une inimitié,
 * il devient une déception.
 */
export const SOURS_UNDER = 34;

/** Au-delà de quoi la rancune est vraiment une inimitié. */
export const HOSTILE_AT = 40;

/** Ce que le caractère ajoute : un colérique garde tout, un tiède oublie. */
export const TEMPER_WEIGHT = 0.9;
export const FORGIVING_WEIGHT = 0.55;

/* ------------------------------------------------------------------ */
/* Ce qu'une rancune fait                                              */
/* ------------------------------------------------------------------ */

/** Ce qu'un ennemi peut faire dans l'année. */
export interface Spite {
  id: string;
  /** Ce que le joueur en apprend. `{p}` = le prénom. */
  told: string;
  /** Ce qui s'écrit dans l'histoire de l'ennemi. */
  line: string;
  /** L'intensité minimale pour y songer. */
  from: number;
  /** Chance annuelle de base, à intensité maximale. */
  odds: number;
  /** Ce que ça coûte au joueur. */
  costs?: Partial<Record<'reputation' | 'happiness' | 'stress' | 'karma', number>>;
  /** Faut-il un emploi pour que ça ait un sens ? */
  needsJob?: true;
  /** Est-ce que ça retourne les relations communes ? */
  turnsOthers?: number;
}

/**
 * Six façons de nuire, toutes ordinaires.
 *
 * Rien de spectaculaire et rien d'irréversible : une rancune abîme la vie
 * lentement, par la réputation et par les gens autour. C'est plus juste, et
 * cela évite qu'une brouille de jeunesse devienne une catastrophe dont on ne
 * se relève pas.
 */
export const SPITES: Spite[] = [
  {
    id: 'rumeur',
    told: '{p} raconte des choses sur toi.',
    line: 'Parle de toi, et pas en bien.',
    from: 20, odds: 0.34,
    costs: { reputation: -5 },
  },
  {
    id: 'froid',
    told: '{p} a fait comprendre à d’autres qu’il valait mieux t’éviter.',
    line: 'Met les autres de son côté.',
    from: 35, odds: 0.26,
    costs: { happiness: -6 },
    turnsOthers: 5,
  },
  {
    id: 'refus',
    told: '{p} a refusé de te rendre un service dont tu avais besoin.',
    line: 'Refuse de t’aider.',
    from: 20, odds: 0.22,
    costs: { stress: 6, happiness: -4 },
  },
  {
    id: 'travail',
    told: '{p} s’est arrangé pour que ton nom ne remonte pas.',
    line: 'Te barre la route au travail.',
    from: 45, odds: 0.2,
    costs: { reputation: -4, stress: 8 },
    needsJob: true,
  },
  {
    id: 'scene',
    told: '{p} t’a pris à partie devant tout le monde.',
    line: 'Te prend à partie en public.',
    from: 55, odds: 0.16,
    costs: { reputation: -7, happiness: -9, stress: 10 },
  },
  {
    id: 'silence',
    told: '{p} ne te répond plus du tout.',
    line: 'Cesse tout à fait de te parler.',
    from: 65, odds: 0.14,
    costs: { happiness: -5 },
  },
];

/* ------------------------------------------------------------------ */
/* Les nombres                                                         */
/* ------------------------------------------------------------------ */

/** Combien une rancune perd chaque année, faute d'entretien. */
export const COOLS = 3.2;

/**
 * Ce qui empêche une rancune de s'éteindre toute seule trop vite.
 *
 * Une inimitié qui se dissout en trois ans ne serait pas une inimitié. Le
 * plancher tient tant que rien n'a été réparé ; seules des excuses acceptées
 * le lèvent.
 */
export const HARD_FLOOR = 12;

/** Le nombre d'années avant qu'un ennemi recommence. */
export const SPITE_COOLDOWN = 2;

/* ------------------------------------------------------------------ */
/* Réparer                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que le temps fait aux excuses.
 *
 * Mesuré sans lui : quatre tentatives sur une rancune profonde, toutes
 * refusées, et l'inimitié devenait définitive. Une réparation qu'on ne peut
 * pas réussir n'est pas une réparation, c'est un piège. Les années passées
 * n'effacent pas le tort — le plancher tient — mais elles rendent les mots
 * audibles, ce qui est vrai et ce qui rend la patience payante.
 */
export const TIME_HEALS = 0.045;
export const TIME_HEALS_MAX = 0.7;

/**
 * S'excuser.
 *
 * Le catalogue disait « une dispute ne se répare jamais volontairement » —
 * `reconnect` existait mais ne s'ouvrait qu'une fois les ponts coupés,
 * c'est-à-dire trop tard, et pour 1,2 % des gens seulement. On peut désormais
 * s'excuser avant que ce soit irréparable.
 *
 * Ce n'est pas gratuit et ce n'est pas sûr : il faut avaler quelque chose, et
 * la personne peut refuser. Des excuses toujours acceptées ne seraient pas
 * des excuses, ce serait un bouton d'annulation.
 */
export const SORRY = {
  /** Ce que ça retire à la rancune quand c'est accepté. */
  heals: 34,
  /** Ce que ça coûte, accepté ou non. */
  costs: { happiness: -4, stress: 5 },
  /** Ce que ça rend quand ça marche. */
  gives: { happiness: 9, karma: 3 },
  /** La chance de base d'être écouté. */
  odds: 0.62,
  /** Le nombre d'années avant de pouvoir réessayer. */
  cooldown: 2,
};

/** Au-delà de tant d'excuses refusées, on ne réessaie plus. */
export const SORRY_LIMIT = 6;
