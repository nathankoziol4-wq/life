/**
 * Les défis, les serments, et ce qu'on en garde.
 *
 * Le catalogue avait deux feuilles absentes au même endroit — « Défis /
 * Objectifs multiples à remplir » et « Défis / Suivi de progression » — et le
 * reproche tenait en une ligne : *rien ne propose au joueur de faire quelque
 * chose de particulier de cette vie-là*.
 *
 * Le jeu avait pourtant déjà deux choses voisines, et il ne faut surtout pas
 * en faire une troisième copie :
 *
 * - **les ambitions** (`data/ambitions.ts`) sont ce que *le personnage* veut.
 *   Elles viennent de son caractère, elles ne se choisissent pas, et les
 *   contrarier rend malheureux.
 * - **les titres** (`data/ribbons.ts`) sont ce qu'une vie *aura été*. Ils se
 *   constatent à la mort, ne se visent pas, et ne changent rien pendant.
 *
 * Un défi est l'inverse des deux : c'est ce que **le joueur** décide de faire
 * de cette vie, il se prend en cours de route, il se voit avancer, et — c'est
 * tout le sujet — **il se paie**.
 *
 * Trois idées, et c'est tout le système.
 *
 * **1. Accepter, c'est renoncer.** La plupart des défis portent un serment :
 * une chose qu'on s'interdit pour le reste de la vie. Ne jamais toucher un
 * héritage, ne jamais être salarié, ne jamais quitter son pays. Le serment
 * est vérifié chaque année ; rompu, le défi est perdu et ne se reprend pas.
 * Sans cela un défi ne serait qu'une liste de cases, et le jeu en a déjà une.
 *
 * **2. On voit où l'on en est.** Chaque défi a deux à quatre étapes nommées,
 * calculées depuis l'état réel de la partie. C'est la différence exacte avec
 * un titre de fin de vie : on sait pendant, pas après.
 *
 * **3. Une chasse ne montre qu'un pas.** Les défis de type « chasse » ne
 * révèlent leur étape suivante qu'une fois la précédente franchie. On suit une
 * piste au lieu de cocher une liste.
 *
 * Ce qu'on en garde va au **cabinet** : il survit à la mort et aux parties
 * neuves, il n'accorde aucun avantage — pas un point de statistique, pas une
 * pièce — et il ouvre les défis suivants. Un cabinet qui rendrait plus fort
 * transformerait la difficulté en patience.
 */

import type { LifeRecord } from '../systems/ribbons.ts';

/* ------------------------------------------------------------------ */
/* Ce qu'un défi regarde                                               */
/* ------------------------------------------------------------------ */

/**
 * L'état de la partie, tel qu'un défi le lit.
 *
 * `life` est le relevé que produit déjà `systems/ribbons.ts#readLife` — les
 * cinquante-cinq mesures d'une vie. On ne le recalcule pas : un deuxième
 * relevé aurait dérivé du premier au premier changement, et les défis
 * auraient fini par mesurer autre chose que les titres.
 */
export interface ChallengeView {
  life: LifeRecord;
  /** La génération en cours, 1 pour la première. */
  generation: number;
  /** L'année de jeu, pour les défis qui se comptent sur une année. */
  year: number;
  /** Ce qui a été fait dans l'année en cours seulement. */
  yearActions: number;
  /** Le serment tient-il encore ? */
  vowIntact: boolean;
}

/** Une étape, et comment on sait qu'elle est franchie. */
export interface ChallengeStep {
  label: string;
  test(v: ChallengeView): boolean;
}

/* ------------------------------------------------------------------ */
/* Les serments                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on s'interdit en acceptant.
 *
 * Chacun se vérifie sur des données que le jeu tenait déjà : rien ici
 * n'invente un compteur pour se donner raison. `broken` est vrai dès que le
 * serment est rompu, et il ne se répare pas.
 */
export interface Vow {
  id: string;
  label: string;
  /** Ce qu'on s'interdit, en une phrase que le joueur lit avant d'accepter. */
  note: string;
}

export const VOWS: Vow[] = [
  {
    id: 'sansHeritage', label: 'Ne rien devoir aux morts',
    note: 'Aucun héritage. Ce que la famille laisse ira à d’autres.',
  },
  {
    id: 'sansSalaire', label: 'N’être l’employé de personne',
    note: 'Jamais de poste salarié. À son compte, ou rien.',
  },
  {
    id: 'sansDiplome', label: 'N’avoir aucun titre d’étude',
    note: 'Aucun diplôme. Ce que tu vaudras, tu l’auras appris ailleurs.',
  },
  {
    id: 'sansCrime', label: 'Ne jamais prendre ce qui n’est pas à toi',
    note: 'Pas un délit, pas une fois. Même impuni.',
  },
  {
    id: 'sansDette', label: 'Ne jamais emprunter',
    note: 'Aucun crédit, aucun prêt. Ce que tu n’as pas, tu ne l’achètes pas.',
  },
  {
    id: 'sansPartir', label: 'Ne jamais changer de pays',
    note: 'Tu mourras là où tu es né.',
  },
  {
    id: 'sansMariage', label: 'Ne jamais te marier',
    note: 'Des liens, oui. Un contrat, jamais.',
  },
];

export function getVow(id: string): Vow | undefined {
  return VOWS.find((v) => v.id === id);
}

/* ------------------------------------------------------------------ */
/* Les défis                                                           */
/* ------------------------------------------------------------------ */

/**
 * La portée d'un défi.
 *
 * - `vie` : tout doit être fait dans cette vie-là.
 * - `lignée` : le compte continue de génération en génération. C'est le seul
 *   endroit du jeu où mourir fait avancer quelque chose.
 * - `chasse` : les étapes sont une piste, et l'on ne voit que la suivante.
 */
export type ChallengeScope = 'vie' | 'lignée' | 'chasse';

export interface Challenge {
  id: string;
  label: string;
  /** Ce qu'on te demande, en deux phrases. */
  brief: string;
  scope: ChallengeScope;
  /** 1 (on peut le prendre tout de suite) à 5 (il faut avoir fait ses preuves). */
  tier: number;
  /** Le serment, s'il y en a un. */
  vow?: string;
  /** Ce qu'il faut franchir. Deux à quatre étapes. */
  steps: ChallengeStep[];
  /** La pièce que ça met au cabinet. */
  trophy: string;
}

/** Combien de défis on peut porter en même temps. */
export const MAX_TAKEN = 2;

/** Combien de pièces il faut au cabinet pour ouvrir un palier. */
export function tierCost(tier: number): number {
  return tier <= 1 ? 0 : (tier - 1) * 2;
}

const CHALLENGES_RAW: Challenge[] = [
  /* ---------------- Palier 1 : ce qu'on peut tenter tout de suite ---- */
  {
    id: 'parSoiMeme', label: 'Par toi-même', tier: 1, scope: 'vie',
    brief: 'Bâtir quelque chose sans que personne ne te tende la main. Ce que la famille laisse ira à d’autres.',
    vow: 'sansHeritage',
    trophy: 'clef',
    steps: [
      { label: 'Gagner cent fois le coût d’une année', test: (v) => v.life.lifetimeEarnings >= v.life.livingCost * 100 },
      { label: 'Posséder un toit', test: (v) => v.life.propertiesOwned >= 1 },
      { label: 'Atteindre soixante ans', test: (v) => v.life.age >= 60 },
    ],
  },
  {
    id: 'lettres', label: 'Les lettres', tier: 1, scope: 'vie',
    brief: 'Aller au bout de ce qu’on peut apprendre, et ne pas s’arrêter là.',
    trophy: 'encrier',
    steps: [
      { label: 'Deux diplômes', test: (v) => v.life.degrees >= 2 },
      { label: 'Quatre-vingts d’intelligence', test: (v) => v.life.intelligence >= 80 },
      { label: 'Trois clubs ou bibliothèques', test: (v) => v.life.booksOrClubs >= 3 },
    ],
  },
  {
    id: 'lesMains', label: 'Sans personne au-dessus', tier: 1, scope: 'vie',
    brief: 'Ne jamais recevoir d’ordre. Ce que tu gagneras, tu l’auras fait exister toi-même.',
    vow: 'sansSalaire',
    trophy: 'etabli',
    steps: [
      { label: 'Monter deux affaires', test: (v) => v.life.venturesRun >= 2 },
      { label: 'Vingt fois le coût d’une année sur le compte', test: (v) => v.life.worth >= v.life.livingCost * 20 },
      { label: 'Cinquante ans', test: (v) => v.life.age >= 50 },
    ],
  },
  {
    id: 'lesSiens', label: 'Les siens', tier: 1, scope: 'vie',
    brief: 'Une maison pleine, et qui tient. On peut réussir sa vie sans que personne ne s’en aperçoive.',
    trophy: 'tablee',
    steps: [
      { label: 'Trois enfants', test: (v) => v.life.children >= 3 },
      { label: 'Trente ans de mariage', test: (v) => v.life.yearsMarried >= 30 },
      { label: 'Une famille qui t’aime encore', test: (v) => v.life.familyBond >= 70 },
    ],
  },

  /* ---------------- Palier 2 : il faut avoir commencé ---------------- */
  {
    id: 'lePassage', label: 'Le passage', tier: 2, scope: 'lignée',
    brief: 'Laisser à ceux d’après plus que ce qu’on t’a laissé, et recommencer. Le compte continue après ta mort.',
    trophy: 'registre',
    steps: [
      { label: 'Trois générations', test: (v) => v.generation >= 3 },
      { label: 'Un objet de famille de plus d’un siècle', test: (v) => v.life.heirloomAge >= 100 },
      { label: 'Cinq cents fois le coût d’une année transmis', test: (v) => v.life.worth >= v.life.livingCost * 500 },
    ],
  },
  {
    id: 'lIllettre', label: 'Sans un titre', tier: 2, scope: 'vie',
    brief: 'Réussir sans qu’aucun papier ne l’explique. Aucun diplôme, jamais.',
    vow: 'sansDiplome',
    trophy: 'ardoise',
    steps: [
      { label: 'Deux cents fois le coût d’une année gagnées', test: (v) => v.life.lifetimeEarnings >= v.life.livingCost * 200 },
      { label: 'Quatre promotions', test: (v) => v.life.promotions >= 4 },
      { label: 'Une réputation intacte', test: (v) => v.life.karma >= 60 },
    ],
  },
  {
    id: 'leSedentaire', label: 'Toute une vie au même endroit', tier: 2, scope: 'vie',
    brief: 'Ne jamais changer de pays, et faire quand même de cette vie quelque chose.',
    vow: 'sansPartir',
    trophy: 'borne',
    steps: [
      { label: 'Quatre-vingts ans', test: (v) => v.life.age >= 80 },
      { label: 'Deux biens', test: (v) => v.life.propertiesOwned >= 2 },
      { label: 'Quatre amis', test: (v) => v.life.friends >= 4 },
    ],
  },
  {
    id: 'lesMainsPropres', label: 'Les mains propres', tier: 2, scope: 'vie',
    brief: 'Traverser une vie entière sans jamais prendre ce qui n’est pas à toi — même quand personne ne regarde.',
    vow: 'sansCrime',
    trophy: 'balance',
    steps: [
      { label: 'Soixante-dix ans', test: (v) => v.life.age >= 70 },
      { label: 'Quatre-vingts de karma', test: (v) => v.life.karma >= 80 },
      { label: 'Avoir donné dix fois le coût d’une année', test: (v) => v.life.given >= v.life.livingCost * 10 },
    ],
  },

  /* ---------------- Palier 3 : il faut savoir jouer ------------------ */
  {
    id: 'leNom', label: 'Le nom', tier: 3, scope: 'vie',
    brief: 'Être connu, et l’être encore vieux. Beaucoup y arrivent ; presque personne n’y reste.',
    trophy: 'affiche',
    steps: [
      { label: 'Quatre-vingts de notoriété', test: (v) => v.life.famePeak >= 80 },
      { label: 'Vingt ans sous les yeux du public', test: (v) => v.life.fameYears >= 20 },
      { label: 'Y être encore à soixante-cinq ans', test: (v) => v.life.age >= 65 && v.life.fame >= 45 },
    ],
  },
  {
    id: 'sansRien', label: 'Sans rien devoir', tier: 3, scope: 'vie',
    brief: 'Ni héritage, ni crédit. Tout ce que tu auras, tu l’auras payé comptant.',
    vow: 'sansDette',
    trophy: 'coffret',
    steps: [
      { label: 'Trois cents fois le coût d’une année', test: (v) => v.life.worth >= v.life.livingCost * 300 },
      { label: 'Deux biens', test: (v) => v.life.propertiesOwned >= 2 },
      { label: 'Vingt ans de placements', test: (v) => v.life.investedYears >= 20 },
    ],
  },
  {
    id: 'lHabit', label: 'L’habit', tier: 3, scope: 'vie',
    brief: 'Servir, être décoré, et revenir. Une vie que peu choisissent et dont peu reviennent entiers.',
    trophy: 'medaille',
    steps: [
      { label: 'Quinze ans sous l’uniforme', test: (v) => v.life.servedYears >= 15 },
      { label: 'Trois décorations', test: (v) => v.life.decorations >= 3 },
      { label: 'Soixante-quinze ans', test: (v) => v.life.age >= 75 },
    ],
  },

  /* ---------------- Palier 4 : les chasses --------------------------- */
  // Une chasse ne montre qu'un pas : les étapes sont ordonnées, et l'on
  // découvre la suivante en franchissant celle d'avant.
  {
    id: 'laPiste', label: 'La piste', tier: 4, scope: 'chasse',
    brief: 'Quelqu’un a laissé une trace, et elle se suit d’un endroit à l’autre. Tu ne verras jamais que le pas suivant.',
    trophy: 'carte',
    steps: [
      { label: 'Faire entrer un objet dans la famille', test: (v) => v.life.heirloomsFound >= 1 },
      { label: 'Voir six endroits', test: (v) => v.life.placesSeen >= 6 },
      { label: 'Faire reprendre un objet de famille', test: (v) => v.life.restorations >= 1 },
      { label: 'Garder un objet plus de quarante ans', test: (v) => v.life.heirloomAge >= 40 },
    ],
  },
  {
    id: 'laCollection', label: 'La collection', tier: 4, scope: 'chasse',
    brief: 'Rassembler ce qui ne se rassemble pas : ce qu’on possède, ce qu’on a été, ce qu’on a traversé.',
    trophy: 'vitrine',
    steps: [
      { label: 'Trois véhicules', test: (v) => v.life.vehiclesOwned >= 3 },
      { label: 'Six objets de valeur', test: (v) => v.life.valuablesOwned >= 6 },
      { label: 'Quatre objets de famille', test: (v) => v.life.heirloomsHeld >= 4 },
      { label: 'Trois biens', test: (v) => v.life.propertiesOwned >= 3 },
    ],
  },
  {
    id: 'lesDeuxRives', label: 'Les deux rives', tier: 4, scope: 'chasse',
    brief: 'Avoir vécu des deux côtés : ce qu’on prend et ce qu’on répare. Personne ne finit indemne des deux.',
    trophy: 'masque',
    steps: [
      { label: 'Dix délits sans se faire prendre', test: (v) => v.life.crimesDone >= 10 },
      { label: 'Avoir été condamné', test: (v) => v.life.convictions >= 1 },
      { label: 'Quinze ans sans rien commettre', test: (v) => v.life.cleanYears >= 15 },
      { label: 'Finir avec soixante de karma', test: (v) => v.life.karma >= 60 },
    ],
  },

  /* ---------------- Palier 5 : ce que presque personne ne fait -------- */
  {
    id: 'laMaison', label: 'Tenir la maison', tier: 5, scope: 'lignée',
    brief: 'Une couronne se garde ou se perd. Il faut y monter, et que ce que tu laisses tienne encore après toi.',
    trophy: 'couronne',
    steps: [
      { label: 'Régner dix ans', test: (v) => v.life.reigned >= 10 },
      { label: 'Deux générations dans la maison', test: (v) => v.generation >= 2 },
      { label: 'Que la couronne existe encore', test: (v) => !v.life.crownFell },
    ],
  },
  {
    id: 'leSiecle', label: 'Le siècle', tier: 5, scope: 'vie',
    brief: 'Cent ans. C’est tout ce qu’on te demande, et c’est le plus dur.',
    trophy: 'horloge',
    steps: [
      { label: 'Cent ans', test: (v) => v.life.age >= 100 },
      { label: 'Encore en bonne santé', test: (v) => v.life.health >= 40 },
      { label: 'Des petits-enfants', test: (v) => v.life.grandchildren >= 2 },
    ],
  },
  {
    id: 'toutSeul', label: 'Tout, seul', tier: 5, scope: 'vie',
    brief: 'Sans héritage, sans dette, sans diplôme, et arriver quand même en haut. Trois serments à la fois.',
    vow: 'sansHeritage',
    trophy: 'sommet',
    steps: [
      { label: 'Mille fois le coût d’une année', test: (v) => v.life.worth >= v.life.livingCost * 1000 },
      { label: 'Sans aucun diplôme', test: (v) => v.life.degrees === 0 && v.life.age >= 55 },
      { label: 'Sans avoir jamais été salarié', test: (v) => v.life.jobs === 0 && v.life.age >= 55 },
    ],
  },
];

export const CHALLENGES: Challenge[] = CHALLENGES_RAW;

export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Le cabinet                                                          */
/* ------------------------------------------------------------------ */

/**
 * Une pièce du cabinet.
 *
 * Elle **ne donne rien**. Pas un point de statistique, pas une pièce de
 * monnaie, aucun avantage au départ d'une vie neuve. Un cabinet qui rendrait
 * plus fort transformerait la difficulté en patience : il suffirait de jouer
 * longtemps pour que tout devienne facile, et les défis suivants ne
 * vaudraient plus rien.
 *
 * Ce qu'elle fait, et c'est tout : elle reste, et elle ouvre le palier
 * suivant.
 */
export interface VaultPiece {
  id: string;
  label: string;
  emoji: string;
  /** Ce que c'est, et pourquoi on l'a gardée. */
  note: string;
}

export const VAULT_PIECES: VaultPiece[] = [
  { id: 'clef', label: 'Une clef sans serrure', emoji: '🗝️', note: 'Elle n’ouvre plus rien. Elle a ouvert quelque chose.' },
  { id: 'encrier', label: 'Un encrier vide', emoji: '🖋️', note: 'Tout ce qu’il a servi à écrire existe encore quelque part.' },
  { id: 'etabli', label: 'Un rabot usé', emoji: '🪚', note: 'Le manche a la forme d’une main qui n’est plus là.' },
  { id: 'tablee', label: 'Une nappe reprisée', emoji: '🍽️', note: 'Trop de monde autour, trop souvent. C’est ce qui l’a usée.' },
  { id: 'registre', label: 'Un registre de famille', emoji: '📖', note: 'Des noms, des dates, et trois écritures différentes.' },
  { id: 'ardoise', label: 'Une ardoise', emoji: '🪨', note: 'On y a compté toute une vie. Rien n’y est écrit.' },
  { id: 'borne', label: 'Une borne de chemin', emoji: '🪧', note: 'Elle indique une distance que personne n’a parcourue.' },
  { id: 'balance', label: 'Une petite balance', emoji: '⚖️', note: 'Les deux plateaux sont au même niveau. Ils ne l’étaient pas.' },
  { id: 'affiche', label: 'Une affiche décollée', emoji: '📜', note: 'On y lit encore un nom. On ne sait plus pour quoi.' },
  { id: 'coffret', label: 'Un coffret payé comptant', emoji: '🧰', note: 'Il n’a jamais rien dû à personne. Lui non plus.' },
  { id: 'medaille', label: 'Un ruban décoloré', emoji: '🎗️', note: 'La médaille a été vendue. Le ruban est resté.' },
  { id: 'carte', label: 'Une carte annotée', emoji: '🗺️', note: 'Des croix, un itinéraire, et une écriture pressée.' },
  { id: 'vitrine', label: 'Une clef de vitrine', emoji: '🔑', note: 'Ce qu’il y avait dedans a été dispersé. La clef est là.' },
  { id: 'masque', label: 'Un demi-masque', emoji: '🎭', note: 'Il en manque la moitié. On ne sait pas laquelle.' },
  { id: 'couronne', label: 'Un cercle de métal', emoji: '👑', note: 'Trop léger pour ce qu’il représentait.' },
  { id: 'horloge', label: 'Une aiguille seule', emoji: '🕰️', note: 'Cent ans, et il n’en reste qu’une pièce.' },
  { id: 'sommet', label: 'Un caillou', emoji: '⛰️', note: 'Ramassé tout en haut. Il ne vaut rien du tout.' },
];

export function getVaultPiece(id: string): VaultPiece | undefined {
  return VAULT_PIECES.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function scopeLabel(scope: ChallengeScope): string {
  if (scope === 'lignée') return 'Sur la lignée';
  if (scope === 'chasse') return 'Une piste à suivre';
  return 'Sur cette vie';
}

export function tierLabel(tier: number): string {
  return ['', 'Pour commencer', 'Il faut s’y mettre', 'Il faut savoir jouer',
    'Il faut chercher', 'Presque personne'][tier] ?? '';
}
