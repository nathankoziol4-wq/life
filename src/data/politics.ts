/**
 * Se présenter, et gouverner.
 *
 * Le catalogue avait quatre reproches au même endroit, et ils disaient tous
 * la même chose : la politique était **un métier de scène comme un autre**.
 * On signait « une candidature nationale » comme on signe un rôle, on la
 * tenait devant un public, et l'accueil décidait de la suite. Ni programme,
 * ni budget, ni adversaire nommé ; le mandat se tenait sans qu'on y décide
 * rien ; la réélection était une distinction et non un vote.
 *
 * Ce que ce fichier apporte tient en une phrase : **une élection se gagne sur
 * des gens, pas sur un score**. L'électorat est découpé en blocs qui ne
 * veulent pas la même chose, et tout le reste en découle :
 *
 * - **un programme est un choix**, parce que ce qui plaît à un bloc déplaît
 *   à un autre, et que deux promesses peuvent se contredire ;
 * - **une campagne coûte**, et l'argent vient de quelque part — de petits
 *   donateurs, de gros donateurs qui attendent quelque chose, ou de sa poche ;
 * - **l'adversaire existe**, il a un nom, un programme et une dynamique ;
 * - **gouverner, c'est trancher**, et chaque décision fâche quelqu'un ;
 * - **la réélection est un vote**, et ce qu'on a fait pendant le mandat en
 *   est le point de départ.
 *
 * Rien ici n'est partisan. Les blocs sont des catégories de la vie ordinaire
 * — l'âge, le métier, le fait d'avoir des enfants — et les axes de programme
 * sont des arbitrages budgétaires que tout gouvernement connaît. Il n'y a ni
 * parti, ni camp, ni doctrine : le jeu porte sur **qui l'on fâche**, pas sur
 * qui a raison.
 */

/* ------------------------------------------------------------------ */
/* L'électorat                                                         */
/* ------------------------------------------------------------------ */

/**
 * Un bloc d'électeurs.
 *
 * Le découpage est démographique et non idéologique : on ne demande jamais
 * au joueur de choisir un camp, seulement de savoir qui il préfère décevoir.
 */
export interface Bloc {
  id: string;
  label: string;
  /** Part de l'électorat, en pourcentage. La somme fait cent. */
  weight: number;
  /** Ce qui les fait aller voter, 0-1. Un bloc peut peser et rester chez lui. */
  turnout: number;
  /** Ce qu'ils sont, en une phrase. */
  note: string;
}

export const BLOCS: Bloc[] = [
  {
    id: 'jeunes', label: 'Les jeunes', weight: 15, turnout: 0.52,
    note: 'Ils écoutent beaucoup et votent peu.',
  },
  {
    id: 'familles', label: 'Les familles', weight: 22, turnout: 0.74,
    note: 'Ce qui les concerne se compte en places de crèche.',
  },
  {
    id: 'aines', label: 'Les aînés', weight: 20, turnout: 0.88,
    note: 'Le bloc qui se déplace toujours.',
  },
  {
    id: 'salaries', label: 'Les salariés', weight: 24, turnout: 0.68,
    note: 'Ils jugent sur la fin du mois.',
  },
  {
    id: 'commercants', label: 'Les indépendants', weight: 11, turnout: 0.76,
    note: 'Ce qu’on leur prend se voit tout de suite.',
  },
  {
    id: 'diplomes', label: 'Les diplômés', weight: 8, turnout: 0.82,
    note: 'Ils lisent le programme en entier, et le retiennent.',
  },
];

export function getBloc(id: string): Bloc | undefined {
  return BLOCS.find((b) => b.id === id);
}

/** Le poids réel d'un bloc dans un résultat : sa taille fois sa participation. */
export function votingWeight(bloc: Bloc): number {
  return bloc.weight * bloc.turnout;
}

/* ------------------------------------------------------------------ */
/* Le programme                                                        */
/* ------------------------------------------------------------------ */

/**
 * Un axe de programme.
 *
 * Chacun plaît à certains et déplaît à d'autres — c'est là qu'est
 * l'arbitrage. Un programme qui ne fâche personne ne mobilise personne : les
 * chiffres sont faits pour qu'un axe tiède rapporte moins qu'un axe qui
 * tranche.
 */
export interface Plank {
  id: string;
  label: string;
  /** Ce qu'on promet, en une phrase. */
  promise: string;
  /** Ce que l'axe fait à chaque bloc, en points d'intention de vote. */
  appeal: Partial<Record<string, number>>;
  /** Ce que tenir la promesse coûte, une fois élu, en part du budget. */
  cost: number;
  /** Ce que le tenir fait au karma. */
  karma: number;
}

export const PLANKS: Plank[] = [
  {
    id: 'impots', label: 'Alléger les prélèvements',
    promise: 'Rendre aux gens ce qu’on leur prend.',
    appeal: { commercants: 16, salaries: 9, familles: 4, diplomes: -6, aines: -3 },
    cost: -0.3, karma: -2,
  },
  {
    id: 'services', label: 'Financer les écoles et les soins',
    promise: 'Ce qui soigne et ce qui instruit passe avant le reste.',
    appeal: { familles: 15, aines: 12, diplomes: 8, commercants: -11, salaries: 3 },
    cost: 0.34, karma: 5,
  },
  {
    id: 'logement', label: 'Construire et loger',
    promise: 'Un toit à portée d’un salaire ordinaire.',
    appeal: { jeunes: 18, salaries: 10, familles: 6, aines: -8, commercants: -2 },
    cost: 0.28, karma: 4,
  },
  {
    id: 'securite', label: 'Tenir la rue',
    promise: 'Que l’on puisse rentrer chez soi le soir.',
    appeal: { aines: 17, commercants: 11, familles: 7, jeunes: -12, diplomes: -7 },
    cost: 0.18, karma: 0,
  },
  {
    id: 'environnement', label: 'Préserver ce qui reste',
    promise: 'Ce qu’on abîme maintenant, personne ne le refera.',
    appeal: { jeunes: 16, diplomes: 14, familles: 4, commercants: -14, salaries: -5 },
    cost: 0.22, karma: 6,
  },
  {
    id: 'emploi', label: 'Attirer et former',
    promise: 'Du travail ici, et de quoi le tenir.',
    appeal: { salaries: 14, jeunes: 9, commercants: 8, aines: -4, diplomes: 2 },
    cost: 0.24, karma: 3,
  },
];

export function getPlank(id: string): Plank | undefined {
  return PLANKS.find((p) => p.id === id);
}

/** Combien d'axes on peut porter. Au-delà, plus personne ne retient rien. */
export const MAX_PLANKS = 3;

/**
 * Les couples d'axes qui ne tiennent pas ensemble.
 *
 * Promettre à la fois de moins prélever et de plus dépenser n'est pas
 * illégal, c'est seulement invraisemblable — et les électeurs qui lisent le
 * programme en entier le remarquent. C'est ce qui empêche de simplement
 * cocher les trois axes les plus populaires.
 */
export const TENSIONS: [string, string][] = [
  ['impots', 'services'],
  ['impots', 'logement'],
  ['environnement', 'emploi'],
  ['securite', 'environnement'],
];

/** Les axes retenus se contredisent-ils, et combien de fois ? */
export function tensionCount(planks: string[]): number {
  return TENSIONS.filter(
    ([a, b]) => planks.includes(a) && planks.includes(b),
  ).length;
}

/* ------------------------------------------------------------------ */
/* Les sièges                                                          */
/* ------------------------------------------------------------------ */

export interface Office {
  id: string;
  label: string;
  /** Ce qu'on y fait. */
  note: string;
  minAge: number;
  /** Métier politique nécessaire pour être pris au sérieux. */
  craft: number;
  /** Notoriété nécessaire. */
  fame: number;
  /** Durée du mandat, en années. */
  term: number;
  /** Indemnité annuelle, en unités de base. */
  pay: number;
  /** Ce que la campagne coûte au minimum, en unités de base. */
  cost: number;
  /** Ce que le siège fait connaître. */
  visibility: number;
  /**
   * La force de l'adversaire, 0-100.
   *
   * Plus le siège est haut, plus celui d'en face sait s'y prendre. C'est ce
   * qui empêche de monter l'échelle en gagnant toujours de la même façon.
   */
  rival: number;
}

export const OFFICES: Office[] = [
  {
    id: 'conseil', label: 'Un siège au conseil municipal',
    note: 'Des trottoirs, des écoles, et des gens qui vous arrêtent au marché.',
    minAge: 25, craft: 12, fame: 0, term: 4, pay: 6_000, cost: 3_000,
    visibility: 3, rival: 28,
  },
  {
    id: 'mairie', label: 'La mairie',
    note: 'Tout ce qui va mal dans la ville devient votre faute.',
    minAge: 28, craft: 34, fame: 6, term: 5, pay: 34_000, cost: 22_000,
    visibility: 10, rival: 45,
  },
  {
    id: 'assemblee', label: 'Un siège à l’assemblée',
    note: 'Des textes, des couloirs, et une salle qui vote.',
    minAge: 28, craft: 50, fame: 14, term: 5, pay: 62_000, cost: 60_000,
    visibility: 20, rival: 58,
  },
  {
    id: 'region', label: 'L’exécutif régional',
    note: 'Assez grand pour compter, assez petit pour qu’on vous connaisse.',
    minAge: 33, craft: 66, fame: 28, term: 6, pay: 96_000, cost: 180_000,
    visibility: 32, rival: 70,
  },
  {
    id: 'national', label: 'La magistrature suprême',
    note: 'Six mois où plus rien d’autre n’existe, puis cinq ans où rien ne vous appartient.',
    minAge: 38, craft: 82, fame: 52, term: 5, pay: 210_000, cost: 900_000,
    visibility: 60, rival: 84,
  },
];

export function getOffice(id: string): Office | undefined {
  return OFFICES.find((o) => o.id === id);
}

/* ------------------------------------------------------------------ */
/* Faire campagne                                                      */
/* ------------------------------------------------------------------ */

/**
 * Une façon de dépenser une semaine de campagne.
 *
 * Toutes ne se valent pas selon qui l'on vise : le porte-à-porte convainc
 * ceux qui votent déjà, les médias parlent à tout le monde et à personne, et
 * attaquer l'adversaire marche — jusqu'à ce que ça se retourne.
 */
export interface Tactic {
  id: string;
  label: string;
  note: string;
  /** Coût, en part du coût de référence du siège. */
  cost: number;
  /** Ce que ça déplace, par bloc, en points. */
  moves: Partial<Record<string, number>>;
  /** Multiplié par la notoriété du candidat ? */
  amplified?: boolean;
  /** Ce que ça ajoute au risque de casserole. */
  damage?: number;
  /** Ce que ça retire à l'adversaire. */
  againstRival?: number;
  /** Métier politique nécessaire. */
  craft?: number;
}

export const TACTICS: Tactic[] = [
  {
    id: 'terrain', label: 'Le porte-à-porte',
    note: 'Lent, épuisant, et le seul qui convainque vraiment quelqu’un.',
    cost: 0.06,
    moves: { salaries: 4, aines: 5, familles: 3, commercants: 2 },
  },
  {
    id: 'meeting', label: 'Une réunion publique',
    note: 'Ceux qui viennent sont déjà d’accord ; ce sont eux qui iront voter.',
    cost: 0.14,
    moves: { jeunes: 6, salaries: 4, diplomes: 3 },
    craft: 25,
  },
  {
    id: 'affichage', label: 'De l’affichage',
    note: 'Personne ne l’avoue, et tout le monde retient le nom.',
    cost: 0.12,
    moves: { jeunes: 2, familles: 2, aines: 3, salaries: 2, commercants: 2, diplomes: 1 },
  },
  {
    id: 'medias', label: 'Un passage média',
    note: 'Quinze minutes qui valent trois mois de terrain — si l’on est déjà quelqu’un.',
    cost: 0.3,
    moves: { jeunes: 4, familles: 4, aines: 4, salaries: 4, commercants: 3, diplomes: 4 },
    amplified: true,
    craft: 40,
  },
  {
    id: 'ciblage', label: 'Viser un bloc précis',
    note: 'Toute la mise sur une catégorie de gens. Redoutable, et étroit.',
    cost: 0.2,
    moves: {},
  },
  {
    id: 'attaque', label: 'Attaquer l’adversaire',
    note: 'Ça marche. Et une partie de ce qu’on jette revient sur soi.',
    cost: 0.08,
    moves: {},
    againstRival: 7,
    damage: 9,
  },
];

export function getTactic(id: string): Tactic | undefined {
  return TACTICS.find((t) => t.id === id);
}

/** Combien de coups on peut jouer dans une campagne. */
export const CAMPAIGN_MOVES = 6;

/* ------------------------------------------------------------------ */
/* L'argent                                                            */
/* ------------------------------------------------------------------ */

/**
 * Une façon de financer une campagne.
 *
 * L'arbitrage tient en une ligne : l'argent facile a un prix, et il se paie
 * plus tard. Les gros donateurs ne donnent pas, ils avancent.
 */
export interface FundSource {
  id: string;
  label: string;
  note: string;
  /** Ce que ça rapporte, en part du coût de référence du siège. */
  yield: number;
  /** Multiplié par la popularité du moment ? */
  popular?: boolean;
  /** Ce que ça ajoute au risque de casserole. */
  damage?: number;
  /** Puisé sur le compte du joueur ? */
  ownPocket?: boolean;
}

export const FUNDING: FundSource[] = [
  {
    id: 'petits', label: 'Une collecte',
    note: 'Beaucoup de gens, peu chacun. Ça ne rapporte que si l’on plaît déjà.',
    yield: 0.22, popular: true,
  },
  {
    id: 'grands', label: 'De gros donateurs',
    note: 'Ils ne donnent pas : ils avancent. Et ils s’en souviendront.',
    yield: 0.5, damage: 14,
  },
  {
    id: 'poche', label: 'Ta propre fortune',
    note: 'Personne ne te devra rien. C’est cher.',
    yield: 0.4, ownPocket: true,
  },
];

export function getFunding(id: string): FundSource | undefined {
  return FUNDING.find((f) => f.id === id);
}

/* ------------------------------------------------------------------ */
/* Gouverner                                                           */
/* ------------------------------------------------------------------ */

/**
 * Une décision de mandat.
 *
 * Le reproche du catalogue était précis : « le mandat se tient et se juge,
 * mais on n'y prend aucune décision de fond ». Chaque année en fonction en
 * apporte une, et **aucune option ne contente tout le monde** — c'est la
 * seule règle qui compte ici. Une décision qui n'a pas de perdant n'en est
 * pas une.
 */
export interface Decision {
  id: string;
  title: string;
  /** La situation, en deux phrases. */
  brief: string;
  /** L'axe de programme concerné, s'il y en a un. */
  plank?: string;
  options: DecisionOption[];
}

export interface DecisionOption {
  label: string;
  /** Ce que ça fait à l'opinion de chaque bloc. */
  effect: Partial<Record<string, number>>;
  /** Ce que ça coûte, en part de l'indemnité annuelle du siège. */
  cost: number;
  karma: number;
  /** Est-ce tenir ce qu'on avait promis ? */
  keeps?: string;
  /** Est-ce y renoncer ? */
  breaks?: string;
  /** Ce qu'on en retient, pour le récit. */
  outcome: string;
}

export const DECISIONS: Decision[] = [
  {
    id: 'budget',
    title: 'Le budget ne boucle pas',
    brief: 'Il manque de quoi tenir l’année. On attend de toi que tu dises où couper, ou à qui demander.',
    options: [
      {
        label: 'Couper dans les services',
        effect: { familles: -12, aines: -10, diplomes: -6, commercants: 8, salaries: -4 },
        cost: -0.3, karma: -4, breaks: 'services',
        outcome: 'Les comptes tiennent. Les files d’attente s’allongent.',
      },
      {
        label: 'Augmenter les prélèvements',
        effect: { commercants: -16, salaries: -9, familles: 4, aines: 5, diplomes: 6 },
        cost: 0.25, karma: 2, breaks: 'impots',
        outcome: 'Personne n’aime, et l’année passe.',
      },
      {
        label: 'Emprunter et laisser courir',
        effect: { jeunes: -5, diplomes: -9, familles: 3, salaries: 4, commercants: 3 },
        cost: 0, karma: -3,
        outcome: 'On verra plus tard. Quelqu’un d’autre verra plus tard.',
      },
    ],
  },
  {
    id: 'terrain',
    title: 'Un terrain que tout le monde veut',
    brief: 'Une friche au centre. Un promoteur propose des logements, une association un parc, une entreprise des emplois.',
    options: [
      {
        label: 'Des logements',
        effect: { jeunes: 12, salaries: 8, aines: -7, commercants: -3, diplomes: -2 },
        cost: 0.15, karma: 3, keeps: 'logement',
        outcome: 'Trois cents familles logées, et un quartier qui ne se reconnaît plus.',
      },
      {
        label: 'Un parc',
        effect: { familles: 9, diplomes: 10, aines: 7, salaries: -3, commercants: -6 },
        cost: 0.2, karma: 5, keeps: 'environnement',
        outcome: 'C’est beau. Ça ne loge personne.',
      },
      {
        label: 'Une zone d’activité',
        effect: { salaries: 11, commercants: 12, jeunes: 4, diplomes: -9, familles: -4 },
        cost: -0.1, karma: -2, keeps: 'emploi',
        outcome: 'Des emplois, du béton, et une pétition.',
      },
    ],
  },
  {
    id: 'securite',
    title: 'Un fait divers qui prend toute la place',
    brief: 'Une agression, une rue, une ville qui n’en parle plus qu’à travers ça. On attend une réponse aujourd’hui.',
    options: [
      {
        label: 'Renforcer les patrouilles',
        effect: { aines: 14, commercants: 10, familles: 6, jeunes: -13, diplomes: -8 },
        cost: 0.22, karma: -1, keeps: 'securite',
        outcome: 'Les rues sont plus calmes. Certains s’y sentent moins chez eux.',
      },
      {
        label: 'Financer la prévention',
        effect: { jeunes: 11, diplomes: 12, familles: 3, aines: -11, commercants: -8 },
        cost: 0.18, karma: 6, breaks: 'securite',
        outcome: 'On saura dans dix ans si c’était le bon choix.',
      },
      {
        label: 'Ne pas répondre à chaud',
        effect: { diplomes: 5, aines: -9, commercants: -6, familles: -4 },
        cost: 0, karma: 2,
        outcome: 'Tenir sa langue est une position. Elle se voit peu.',
      },
    ],
  },
  {
    id: 'usine',
    title: 'Une entreprise menace de partir',
    brief: 'Huit cents emplois, et une demande d’exonération assortie d’une dérogation environnementale.',
    options: [
      {
        label: 'Accorder ce qu’ils demandent',
        effect: { salaries: 13, commercants: 9, jeunes: -6, diplomes: -12, familles: -3 },
        cost: 0.3, karma: -5, keeps: 'emploi', breaks: 'environnement',
        outcome: 'Ils restent. Ils reviendront demander.',
      },
      {
        label: 'Refuser',
        effect: { diplomes: 11, jeunes: 8, salaries: -14, commercants: -9, familles: -6 },
        cost: 0, karma: 4, keeps: 'environnement',
        outcome: 'On ne cède pas. Huit cents personnes cherchent du travail.',
      },
      {
        // Un compromis n'est pas une option sans perdant : c'est une option
        // qui déçoit les convaincus des deux bords. Sans cela, ce serait le
        // choix évident à chaque fois, et la décision cesserait d'en être une.
        label: 'Négocier une contrepartie',
        effect: { salaries: 4, familles: 3, diplomes: -5, commercants: -6, jeunes: -3 },
        cost: 0.15, karma: 2,
        outcome: 'Un compromis que personne ne défendra avec passion.',
      },
    ],
  },
  {
    id: 'hopital',
    title: 'Un service ferme faute de personnel',
    brief: 'Il faut choisir entre payer très cher pour le tenir ouvert, le fermer, ou le déplacer plus loin.',
    options: [
      {
        label: 'Payer ce qu’il faut',
        effect: { aines: 15, familles: 11, salaries: 5, commercants: -10, diplomes: 3 },
        cost: 0.4, karma: 6, keeps: 'services',
        outcome: 'Le service tient. Le budget en souffrira ailleurs.',
      },
      {
        label: 'Regrouper plus loin',
        effect: { aines: -13, familles: -8, commercants: 4, diplomes: 5, salaries: -3 },
        cost: -0.15, karma: -3, breaks: 'services',
        outcome: 'C’est raisonnable sur le papier. Ce sont quarante minutes de plus.',
      },
      {
        label: 'Fermer',
        effect: { aines: -18, familles: -12, salaries: -7, commercants: 7 },
        cost: -0.3, karma: -7, breaks: 'services',
        outcome: 'On n’oubliera pas qui a signé.',
      },
    ],
  },
  {
    id: 'faveur',
    title: 'On vient réclamer',
    brief: 'Quelqu’un qui a financé ta campagne demande un rendez-vous, et arrive avec un dossier tout prêt.',
    options: [
      {
        label: 'Faire ce qu’on te demande',
        effect: { commercants: 6, diplomes: -9, salaries: -5, jeunes: -4 },
        cost: -0.2, karma: -9,
        outcome: 'C’est réglé. Il reste une trace quelque part.',
      },
      {
        label: 'Refuser poliment',
        effect: { diplomes: 7, salaries: 4, commercants: -8 },
        cost: 0.1, karma: 7,
        outcome: 'On ne te rappellera pas. Ni pour ça, ni pour la prochaine campagne.',
      },
      {
        label: 'Rendre la demande publique',
        effect: { diplomes: 12, jeunes: 9, salaries: 7, commercants: -15, aines: -3 },
        cost: 0.05, karma: 10,
        outcome: 'Un ennemi solide, et une réputation d’incorruptible.',
      },
    ],
  },
];

export function getDecision(id: string): Decision | undefined {
  return DECISIONS.find((d) => d.id === id);
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Comment se lit une intention de vote. */
export function pollLabel(share: number): string {
  if (share < 30) return 'Distancé';
  if (share < 44) return 'En retard';
  if (share < 50) return 'Au coude à coude';
  if (share < 58) return 'En tête';
  if (share < 70) return 'Largement en tête';
  return 'Sans adversaire réel';
}

/** Comment se lit une opinion de mandat. */
export function approvalLabel(approval: number): string {
  if (approval < 25) return 'On veut ton départ';
  if (approval < 40) return 'On te supporte';
  if (approval < 55) return 'On attend de voir';
  if (approval < 70) return 'On te suit';
  return 'On te réélirait demain';
}

/** Les archétypes d'adversaires. Aucun n'est partisan : ce sont des façons de faire. */
export const RIVAL_KINDS = [
  {
    id: 'sortant', label: 'Le sortant',
    note: 'Il a un bilan. C’est son avantage et son problème.',
    strength: 1.12, planks: 2,
  },
  {
    id: 'notable', label: 'Le notable',
    note: 'Tout le monde le connaît, personne ne s’en enthousiasme.',
    strength: 1, planks: 3,
  },
  {
    id: 'neuf', label: 'La figure neuve',
    note: 'Aucun bilan à défendre, et c’est exactement ce qu’on lui reproche.',
    strength: 0.92, planks: 1,
  },
  {
    id: 'machine', label: 'L’appareil',
    note: 'Ce n’est pas quelqu’un que tu affrontes, c’est une organisation.',
    strength: 1.2, planks: 3,
  },
];
