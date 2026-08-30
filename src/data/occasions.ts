/**
 * Les occasions : ce qui revient chaque année.
 *
 * Deux feuilles du catalogue disaient la même chose — « Événements / Volume /
 * Génération procédurale » et « Événements / Densité / Aucune année vide » —
 * et une mesure a montré où était vraiment le trou : sur quatre mille années
 * jouées, 3,4 % ne produisaient aucune ligne, mais **quatorze pour cent des
 * années entre six et treize ans étaient parfaitement vides**. L'enfance est
 * la partie la plus maigre du jeu.
 *
 * Une occasion est ce qui remplit ces années sans inventer un système de plus :
 * une date qui revient, une petite scène, deux ou trois façons de la passer.
 *
 * Quatre règles, et elles sont ce qui distingue ceci d'une liste de fêtes.
 *
 * **1. C'est daté.** Chaque occasion a son mois. Une vie n'en voit qu'une
 * poignée par an, et toujours les mêmes aux mêmes moments — c'est ce qui donne
 * à une vie un rythme au lieu d'une suite de tirages.
 *
 * **2. Ça revient, et ça s'use.** Passer la même occasion de la même façon
 * dix ans de suite rapporte de moins en moins. On finit par devoir changer, ou
 * par se contenter de peu.
 *
 * **3. C'est de son âge.** Un enfant de huit ans et un vieillard de quatre-
 * vingts ne voient pas les mêmes occasions. C'est le seul endroit du jeu conçu
 * en partant des tranches d'âge plutôt que des systèmes.
 *
 * **4. Certaines n'arrivent presque jamais.** Cinq degrés de rareté, du
 * banal au presque unique. La comète ne passe qu'une fois par vie, et pas dans
 * toutes les vies.
 *
 * Rien ici ne renvoie à une fête réelle, une religion ou une nation existante :
 * ce sont des occasions inventées, décrites par ce qu'on y fait.
 */

/** Cinq degrés, du banal au presque jamais vu. */
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'VERY_RARE' | 'LEGENDARY';

/** La chance qu'une occasion de ce degré se présente une année donnée. */
export const RARITY_ODDS: Record<Rarity, number> = {
  COMMON: 0.85,
  UNCOMMON: 0.45,
  RARE: 0.16,
  VERY_RARE: 0.04,
  LEGENDARY: 0.008,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  COMMON: 'Chaque année',
  UNCOMMON: 'Certaines années',
  RARE: 'Rare',
  VERY_RARE: 'Très rare',
  LEGENDARY: 'Une fois, peut-être',
};

/** Une façon de passer l'occasion. */
export interface OccasionChoice {
  label: string;
  /** Ce que ça coûte, en part du coût d'une année de vie. */
  cost?: number;
  /** Ce que ça déplace chez le joueur. */
  gives?: Partial<Record<
    'happiness' | 'stress' | 'health' | 'fitness' | 'karma' | 'reputation'
    | 'intelligence' | 'looks', number
  >>;
  /** Ce que ça fait aux proches présents. */
  bond?: number;
  /** Le souvenir que ça laisse, s'il en laisse un. */
  keepsake?: string;
  /** Ce qu'on en retient. */
  outcome: string;
}

export interface Occasion {
  id: string;
  label: string;
  /** La scène, en deux phrases. */
  text: string;
  emoji: string;
  /** Le mois où ça tombe, 1-12. `0` = à la date de naissance du personnage. */
  month: number;
  rarity: Rarity;
  /** Les âges auxquels ça se présente. */
  from: number;
  to: number;
  choices: OccasionChoice[];
}

export const OCCASIONS: Occasion[] = [
  /* ---------------- L'enfance, là où les années étaient vides -------- */
  {
    id: 'lanternes', label: 'La fête des lanternes', emoji: '🏮',
    text: 'Le quartier accroche des lanternes de papier aux fenêtres. Les enfants ont le droit de veiller.',
    month: 3, rarity: 'COMMON', from: 4, to: 14,
    choices: [
      {
        label: 'Y aller avec les autres',
        gives: { happiness: 8, stress: -4 }, bond: 3, cost: 0.0007,
        outcome: 'Tu rentres tard, tu sens la fumée, tu es content.',
      },
      {
        label: 'Fabriquer la tienne',
        gives: { happiness: 5, intelligence: 1 }, cost: 0.0003,
        keepsake: 'lanterne',
        outcome: 'Elle est de travers. Tu la gardes des années.',
      },
      {
        label: 'Rester à la maison',
        gives: { happiness: -3, stress: -2 },
        outcome: 'Tu regardes les lumières par la fenêtre.',
      },
    ],
  },
  {
    id: 'rentree', label: 'La rentrée', emoji: '🎒',
    text: 'Nouvelle classe, nouveaux visages, et l’odeur des cahiers neufs.',
    month: 9, rarity: 'COMMON', from: 6, to: 17,
    choices: [
      {
        label: 'Aller vers les autres',
        gives: { happiness: 5, reputation: 2 }, bond: 4,
        outcome: 'Tu connais trois noms de plus qu’hier.',
      },
      {
        label: 'S’y mettre sérieusement',
        gives: { intelligence: 2, stress: 3 },
        outcome: 'Tu commences bien. Reste à tenir.',
      },
      {
        label: 'Traîner des pieds',
        gives: { happiness: -2, stress: 4 },
        outcome: 'L’année sera longue.',
      },
    ],
  },
  {
    id: 'carnaval', label: 'Le carnaval de l’école', emoji: '🎭',
    text: 'Un après-midi où personne ne travaille et où tout le monde se déguise.',
    month: 2, rarity: 'UNCOMMON', from: 5, to: 15,
    choices: [
      {
        label: 'Le costume le plus voyant',
        gives: { happiness: 9, reputation: 4, looks: 1 }, cost: 0.002,
        keepsake: 'masque',
        outcome: 'On en parle jusqu’aux vacances.',
      },
      {
        label: 'Quelque chose de discret',
        gives: { happiness: 4 }, cost: 0.0003,
        outcome: 'Tu es là, et c’est tout ce que tu voulais.',
      },
      {
        label: 'Ne pas se déguiser',
        gives: { happiness: -4, reputation: -2 },
        outcome: 'Tu passes la journée à expliquer pourquoi.',
      },
    ],
  },
  {
    id: 'bete', label: 'Le marché aux bêtes', emoji: '🐐',
    text: 'Une fois l’an, la place se remplit d’animaux, de cages et de gens qui crient des prix.',
    month: 4, rarity: 'UNCOMMON', from: 5, to: 90,
    choices: [
      {
        label: 'Passer l’après-midi à regarder',
        gives: { happiness: 6, stress: -5 },
        outcome: 'Tu n’achètes rien. C’est très bien comme ça.',
      },
      {
        label: 'Rapporter quelque chose',
        gives: { happiness: 7 }, cost: 0.0067, bond: 2,
        keepsake: 'clochette',
        outcome: 'Une clochette de troupeau, et personne ne sait pourquoi tu l’as prise.',
      },
    ],
  },

  /* ---------------- Ce qui revient à tout âge ------------------------ */
  {
    id: 'premierJour', label: 'Le premier jour', emoji: '🕛',
    text: 'On change d’année. Tout le monde dit qu’on va faire les choses autrement.',
    month: 1, rarity: 'COMMON', from: 8, to: 120,
    choices: [
      {
        label: 'Se promettre quelque chose',
        gives: { happiness: 4, stress: -3 },
        outcome: 'Tu y crois à moitié, et c’est déjà ça.',
      },
      {
        label: 'Le passer avec les tiens',
        gives: { happiness: 7 }, bond: 5, cost: 0.0033,
        outcome: 'On mange trop, on parle fort, on est bien.',
      },
      {
        label: 'Le laisser passer',
        gives: { stress: -1 },
        outcome: 'C’est un jour comme un autre, et tu le traites comme tel.',
      },
    ],
  },
  {
    id: 'longueNuit', label: 'La longue nuit', emoji: '🕯️',
    text: 'La nuit la plus longue de l’année. On allume tout ce qu’on peut allumer.',
    month: 12, rarity: 'COMMON', from: 3, to: 120,
    choices: [
      {
        label: 'Ouvrir sa porte',
        gives: { happiness: 8, reputation: 3 }, bond: 6, cost: 0.01,
        outcome: 'Il y a du monde chez toi jusqu’au matin.',
      },
      {
        label: 'La passer à deux',
        gives: { happiness: 6, stress: -6 }, bond: 4, cost: 0.0027,
        outcome: 'Rien de spécial. C’est le but.',
      },
      {
        label: 'La passer seul',
        gives: { happiness: -2, stress: -8 },
        outcome: 'Le silence, et beaucoup de bougies.',
      },
    ],
  },
  {
    id: 'moissons', label: 'La fête des moissons', emoji: '🌾',
    text: 'Des tables dehors, du bruit, et des gens qu’on ne voit qu’une fois par an.',
    month: 9, rarity: 'UNCOMMON', from: 10, to: 120,
    choices: [
      {
        label: 'Y tenir un stand',
        gives: { happiness: 6, reputation: 5, stress: 5 }, bond: 3, cost: 0.0067,
        outcome: 'Tu n’as pas arrêté de la journée. On te dit merci.',
      },
      {
        label: 'Y aller en visiteur',
        gives: { happiness: 5, stress: -4 }, bond: 2, cost: 0.002,
        outcome: 'Tu manges debout et tu croises tout le monde.',
      },
    ],
  },
  {
    id: 'souvenir', label: 'Le jour du souvenir', emoji: '🎗️',
    text: 'Un jour où le pays s’arrête quelques minutes. Chacun pense à ce qu’il veut.',
    month: 11, rarity: 'COMMON', from: 8, to: 120,
    choices: [
      {
        label: 'Aller à la cérémonie',
        gives: { happiness: -1, karma: 4, reputation: 2 }, bond: 2,
        outcome: 'Il fait froid, et tu restes jusqu’au bout.',
      },
      {
        label: 'Y penser seul',
        gives: { stress: -3, karma: 2 },
        outcome: 'Tu t’arrêtes une minute, où que tu sois.',
      },
      {
        label: 'Travailler quand même',
        gives: { karma: -2, stress: 2 },
        outcome: 'La journée passe comme les autres.',
      },
    ],
  },
  {
    id: 'nuitBlanche', label: 'La nuit blanche', emoji: '🌙',
    text: 'La ville ne dort pas. Tout reste ouvert jusqu’au matin.',
    month: 6, rarity: 'UNCOMMON', from: 16, to: 70,
    choices: [
      {
        label: 'Ne pas rentrer',
        gives: { happiness: 10, health: -3, stress: -8, fitness: -1 }, bond: 3, cost: 0.01,
        outcome: 'Tu vois le soleil se lever. Tu le paieras.',
      },
      {
        label: 'Faire un tour et rentrer',
        gives: { happiness: 4, stress: -4 }, cost: 0.0017,
        outcome: 'Deux heures dehors, et ton lit.',
      },
    ],
  },
  {
    id: 'quartier', label: 'La fête du quartier', emoji: '🎪',
    text: 'On ferme la rue. Des tables, une sono trop forte, et les voisins qu’on évite le reste de l’année.',
    month: 5, rarity: 'UNCOMMON', from: 6, to: 120,
    choices: [
      {
        label: 'Aider à installer',
        gives: { happiness: 5, reputation: 6, stress: 3 }, bond: 5,
        outcome: 'Tout le monde sait maintenant qui tu es.',
      },
      {
        label: 'Y passer une heure',
        gives: { happiness: 3 }, bond: 2, cost: 0.001,
        outcome: 'Tu dis bonjour, tu manges quelque chose, tu files.',
      },
      {
        label: 'Fermer les volets',
        gives: { happiness: -2, stress: 4, reputation: -3 },
        outcome: 'La musique s’arrête à deux heures du matin.',
      },
    ],
  },

  /* ---------------- Ce qui arrive rarement --------------------------- */
  {
    id: 'grandFeu', label: 'Le grand feu', emoji: '🔥',
    text: 'Tous les sept ans, on brûle sur la colline tout ce que l’année a laissé de bois. On y jette ce dont on veut se défaire.',
    month: 8, rarity: 'RARE', from: 10, to: 120,
    choices: [
      {
        label: 'Y jeter quelque chose',
        gives: { happiness: 6, stress: -12 },
        keepsake: 'cendre',
        outcome: 'Tu ne dis à personne ce que c’était.',
      },
      {
        label: 'Regarder de loin',
        gives: { happiness: 3, stress: -4 },
        outcome: 'On voit la colline rouge depuis toute la vallée.',
      },
    ],
  },
  {
    id: 'eclipse', label: 'L’éclipse', emoji: '🌑',
    text: 'À midi, la lumière tourne au gris et les oiseaux se taisent. Personne ne travaille pendant trois minutes.',
    month: 7, rarity: 'VERY_RARE', from: 4, to: 120,
    choices: [
      {
        label: 'La regarder jusqu’au bout',
        gives: { happiness: 12, intelligence: 2, stress: -6 },
        keepsake: 'verre',
        outcome: 'Tu te souviendras d’où tu étais et avec qui.',
      },
      {
        label: 'Continuer ce que tu faisais',
        gives: { happiness: -1 },
        outcome: 'Tu l’as ratée. Il y en aura peut-être une autre.',
      },
    ],
  },
  {
    id: 'comete', label: 'La comète', emoji: '☄️',
    text: 'Elle passe tous les quatre-vingts ans environ. La plupart des gens ne la voient qu’une fois, et beaucoup jamais.',
    month: 10, rarity: 'LEGENDARY', from: 3, to: 120,
    choices: [
      {
        label: 'Passer la nuit dehors à l’attendre',
        gives: { happiness: 18, stress: -10, health: -1 }, bond: 4,
        keepsake: 'comete',
        outcome: 'Tu l’as vue. Tu en parleras toute ta vie, et on te croira à moitié.',
      },
      {
        label: 'Sortir dix minutes',
        gives: { happiness: 7 },
        outcome: 'Une traînée pâle, et tu rentres au chaud.',
      },
    ],
  },

  /* ---------------- Ce qui n'appartient qu'à toi --------------------- */
  {
    id: 'anniversaire', label: 'Ton anniversaire', emoji: '🎂',
    text: 'Une année de plus. Certains y tiennent, d’autres préfèrent qu’on n’en parle pas.',
    month: 0, rarity: 'COMMON', from: 5, to: 120,
    choices: [
      {
        label: 'Réunir du monde',
        gives: { happiness: 9, reputation: 2 }, bond: 6, cost: 0.0067,
        outcome: 'Ils sont venus. C’est la seule chose qui compte.',
      },
      {
        label: 'Le passer tranquillement',
        gives: { happiness: 4, stress: -5 }, bond: 2, cost: 0.0013,
        outcome: 'Un repas, deux appels, et c’est bien assez.',
      },
      {
        label: 'Ne rien dire à personne',
        gives: { happiness: -3, stress: -2 },
        outcome: 'Personne n’y a pensé. Tu avais tout fait pour.',
      },
    ],
  },
];

export function getOccasion(id: string): Occasion | undefined {
  return OCCASIONS.find((o) => o.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce qu'on en garde                                                   */
/* ------------------------------------------------------------------ */

/**
 * Un souvenir d'occasion.
 *
 * Ils ne valent rien et ne servent à rien : ce sont des objets qu'on garde
 * parce qu'on y était. Ils rejoignent les collections, à côté des objets de
 * famille — qui, eux, valent de l'argent. La différence entre les deux est
 * exactement le propos.
 */
export interface Keepsake {
  id: string;
  label: string;
  emoji: string;
  note: string;
}

export const KEEPSAKES: Keepsake[] = [
  { id: 'lanterne', label: 'Une lanterne de papier', emoji: '🏮', note: 'De travers, et jamais rallumée depuis.' },
  { id: 'masque', label: 'Un masque de carnaval', emoji: '🎭', note: 'L’élastique a cédé le soir même.' },
  { id: 'clochette', label: 'Une clochette de troupeau', emoji: '🔔', note: 'Tu n’as jamais eu de troupeau.' },
  { id: 'cendre', label: 'Une poignée de cendre', emoji: '🫙', note: 'De ce que tu as brûlé. Tu es le seul à savoir quoi.' },
  { id: 'verre', label: 'Un verre fumé', emoji: '🕶️', note: 'À travers lequel tu as vu le jour s’éteindre.' },
  { id: 'comete', label: 'Un carnet daté', emoji: '📓', note: 'Une seule ligne, et l’heure exacte.' },
];

export function getKeepsake(id: string): Keepsake | undefined {
  return KEEPSAKES.find((k) => k.id === id);
}

/* ------------------------------------------------------------------ */
/* L'usure                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que rapporte de refaire la même chose.
 *
 * Passer dix « longues nuits » de suite exactement de la même façon finit par
 * ne plus rien donner. On peut toujours le faire — c'est peut-être ce qu'on
 * veut — mais le jeu cesse de le récompenser.
 */
export const HABIT_FADE = 0.18;

export function freshness(timesDone: number): number {
  return Math.max(0.3, 1 - timesDone * HABIT_FADE);
}
