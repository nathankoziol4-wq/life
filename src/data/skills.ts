/**
 * Ce qu'on sait faire.
 *
 * Le catalogue reprochait deux choses, et c'est la même : « les compétences
 * sont des statistiques diffuses ; rien à faire monter délibérément », et un
 * événement d'enfance intitulé « Un don caché » qui posait `talent_music`,
 * `talent_sport` ou `talent_math` — trois marqueurs **que rien ne relisait
 * nulle part**. On découvrait un don, et il n'existait pas.
 *
 * Le jeu avait donc déjà des chiffres qui montent — intelligence, discipline,
 * forme — mais aucun d'eux ne se travaille : ils dérivent. Ce fichier tient
 * dix choses qu'on peut décider d'apprendre, et deux idées qui les
 * distinguent d'une jauge de plus :
 *
 * **1. Le don est caché.** Chacun naît plus ou moins doué pour chacune, et ne
 * le sait pas. On ne l'apprend qu'en s'y étant mis assez longtemps — c'est ce
 * qui donne enfin une suite à « Un don caché », et ce qui rend les premières
 * années d'essai autre chose qu'un menu.
 *
 * **2. Ça sert vraiment.** Chaque métier du jeu s'appuie sur l'une d'elles :
 * elle pèse à l'embauche, sur le salaire proposé et sur ce qu'on vaut au
 * poste. Une compétence qui n'ouvrirait rien serait exactement le défaut
 * qu'on répare.
 */

import type { StatKey } from '../engine/types.ts';

export interface Skill {
  id: string;
  label: string;
  emoji: string;
  /** Ce que c'est, en une phrase. */
  note: string;
  /** L'âge à partir duquel on peut s'y mettre. */
  from: number;
  /** La statistique qui aide à progresser. */
  driver: StatKey;
  /** Les familles de métiers qui s'appuient dessus. */
  fields: string[];
  /** Ce que travailler coûte, avant ajustement au pays. */
  cost: number;
  /** Les matières scolaires qui la nourrissent sans qu'on y pense. */
  subjects?: string[];
  /** Les intérêts qui la nourrissent. */
  interests?: string[];
}

/**
 * Dix, et chaque famille de métier tombe dans exactement une.
 *
 * Moins qu'il n'y a de familles (vingt-deux), et c'est voulu : une compétence
 * par métier n'en serait pas une, ce serait le métier écrit deux fois.
 */
export const SKILLS: Skill[] = [
  {
    id: 'parole', label: 'La parole', emoji: '🗣️',
    note: 'Convaincre quelqu’un qui n’était pas venu pour ça.',
    from: 10, driver: 'reputation', cost: 340,
    fields: ['Commerce & Vente', 'Droit & Justice', 'Fonction publique'],
    subjects: ['monde', 'lettres'], interests: ['théâtre', 'histoire'],
  },
  {
    id: 'plume', label: 'La plume', emoji: '✍️',
    note: 'Écrire quelque chose que quelqu’un lira jusqu’au bout.',
    from: 8, driver: 'intelligence', cost: 260,
    fields: ['Médias', 'Éducation'],
    subjects: ['lettres', 'pensée'], interests: ['écriture', 'lecture'],
  },
  {
    id: 'chiffres', label: 'Les chiffres', emoji: '📐',
    note: 'Voir ce qu’un tableau dit, et ce qu’il ne dit pas.',
    from: 9, driver: 'intelligence', cost: 380,
    fields: ['Finance', 'Immobilier', 'Sciences'],
    subjects: ['calcul', 'physique'], interests: ['finance', 'échecs'],
  },
  {
    id: 'machines', label: 'Les machines', emoji: '⚙️',
    note: 'Comprendre ce qui a des rouages, et le remettre en marche.',
    from: 11, driver: 'intelligence', cost: 420,
    fields: ['Technologie', 'Industrie', 'Transport'],
    subjects: ['machine', 'physique'], interests: ['informatique', 'mécanique'],
  },
  {
    id: 'mains', label: 'Les mains', emoji: '🔨',
    note: 'Faire tenir debout quelque chose qu’on a fait soi-même.',
    from: 8, driver: 'fitness', cost: 300,
    fields: ['Bâtiment', 'Agriculture'],
    subjects: ['machine'], interests: ['bricolage', 'jardinage'],
  },
  {
    id: 'cuisine', label: 'La cuisine', emoji: '🍳',
    note: 'Nourrir des gens, et qu’ils reviennent.',
    from: 7, driver: 'discipline', cost: 280,
    fields: ['Restauration'],
    interests: ['cuisine'],
  },
  {
    id: 'soin', label: 'Le soin', emoji: '🩺',
    note: 'S’occuper d’un corps qui ne va pas.',
    from: 12, driver: 'intelligence', cost: 460,
    fields: ['Santé', 'Beauté & Bien-être'],
    subjects: ['nature'], interests: ['sciences'],
  },
  {
    id: 'scène', label: 'La scène', emoji: '🎭',
    note: 'Tenir une salle qui n’a rien promis.',
    from: 9, driver: 'looks', cost: 320,
    fields: ['Arts & Spectacle'],
    subjects: ['art'], interests: ['théâtre', 'musique', 'cinéma'],
  },
  {
    id: 'corps', label: 'Le corps', emoji: '🏋️',
    note: 'Ce que le corps sait faire sans qu’on y pense.',
    from: 8, driver: 'fitness', cost: 300,
    fields: ['Sport', 'Sécurité & Défense'],
    subjects: ['corps'], interests: ['football', 'course', 'natation', 'artsMartiaux'],
  },
  {
    id: 'ordre', label: 'L’organisation', emoji: '🗂️',
    note: 'Tenir un lieu où plusieurs choses arrivent en même temps.',
    from: 12, driver: 'discipline', cost: 300,
    fields: ['Services', 'Tourisme', 'Petits boulots'],
    subjects: ['langue'], interests: ['voyages'],
  },
];

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

/** La compétence sur laquelle s'appuie une famille de métiers. */
export function skillForField(field: string): Skill | undefined {
  return SKILLS.find((s) => s.fields.includes(field));
}

/* ------------------------------------------------------------------ */
/* Les paliers                                                         */
/* ------------------------------------------------------------------ */

/**
 * Des noms plutôt qu'un pourcentage.
 *
 * « 47 sur 100 » ne se lit pas comme un progrès ; « tu commences à savoir »
 * si. Les seuils sont espacés à dessein — passer de correct à solide est plus
 * long que d'aller de rien à débutant, parce que c'est vrai.
 */
export const RANKS: { at: number; label: string }[] = [
  { at: 0, label: 'Rien du tout' },
  { at: 8, label: 'Les bases' },
  { at: 24, label: 'Ça vient' },
  { at: 44, label: 'Correct' },
  { at: 64, label: 'Solide' },
  { at: 80, label: 'Rare' },
  { at: 92, label: 'On vient te chercher' },
];

export function rankOf(level: number): string {
  let label = RANKS[0].label;
  for (const rank of RANKS) if (level >= rank.at) label = rank.label;
  return label;
}

/* ------------------------------------------------------------------ */
/* Le don                                                              */
/* ------------------------------------------------------------------ */

/**
 * Les paliers de don, une fois qu'on le connaît.
 *
 * Le don n'est pas un multiplicateur affiché : c'est une phrase. On ne dit
 * jamais « aptitude 82 », on dit que ça vient tout seul.
 */
export const GIFTS: { at: number; label: string }[] = [
  { at: 0, label: 'Ça ne vient pas' },
  { at: 30, label: 'Il faut y aller' },
  { at: 50, label: 'Comme tout le monde' },
  { at: 70, label: 'Ça vient bien' },
  { at: 86, label: 'C’est là, sans effort' },
];

export function giftOf(aptitude: number): string {
  let label = GIFTS[0].label;
  for (const gift of GIFTS) if (aptitude >= gift.at) label = gift.label;
  return label;
}

/**
 * Combien de séances avant de savoir si l'on est doué.
 *
 * C'est le cœur de l'idée : personne ne naît en sachant ce pour quoi il est
 * fait. Trois années d'essai, et l'on sait — ce qui rend l'enfance, où l'on
 * a le temps d'essayer plusieurs choses, le bon moment pour chercher.
 */
export const REVEAL = 3;

/* ------------------------------------------------------------------ */
/* Les nombres                                                         */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'apporte quelqu'un qui vous remarque.
 *
 * L'événement d'enfance « Un don caché » posait `talent_music`,
 * `talent_sport` et `talent_math`, et **rien ne les relisait**. Ils valent
 * maintenant deux choses : une avance réelle, et surtout la révélation du
 * don — c'est précisément ce qu'un professeur qui vous remarque vous
 * apprend, et cela s'obtenait autrement en trois années d'essais.
 */
export const NOTICED = 16;

/** Combien de compétences on peut travailler dans la même année. */
export const PER_YEAR = 2;

/** Ce qu'une séance rapporte, avant tout ce qui la module. */
export const GAIN = 11;

/**
 * Ce que le don fait à la vitesse d'apprentissage.
 *
 * De 0,55 à 1,75 : quelqu'un de très doué apprend un peu plus de trois fois
 * plus vite qu'un maladroit. Assez pour que le don compte, pas assez pour que
 * le travail ne serve à rien — c'est le réglage qui décide si le système
 * récompense la persévérance ou la loterie de naissance.
 */
export const GIFT_FLOOR = 0.55;
export const GIFT_RANGE = 1.2;

/**
 * Ce que l'âge fait à l'apprentissage.
 *
 * Moins tranché que pour les langues, où le moment décide de tout : ici un
 * adulte apprend moins vite mais apprend, et l'on peut se reconvertir à
 * quarante ans. C'est délibérément une autre courbe — deux systèmes qui
 * disent la même chose n'en font qu'un.
 */
export function ageFactor(age: number): number {
  if (age <= 14) return 1.3;
  if (age >= 70) return 0.45;
  return 1.3 - ((age - 14) / 56) * 0.85;
}

/**
 * En dessous de quoi une séance ne vaut plus son prix.
 *
 * Près du plafond, le gain devient une poussière tandis que le prix, lui,
 * reste entier. Mesuré : un personnage qui s'entraînait chaque année sans
 * s'arrêter finissait **plus pauvre** que celui qui ne s'entraînait jamais,
 * six fois sur dix — il payait quarante ans pour des dixièmes de point. Le
 * jeu refuse donc de prendre l'argent quand il n'a plus rien à rendre.
 */
export const MIN_GAIN = 0.6;

/** Ce qu'il reste à gagner quand on est déjà bon. */
export const CEILING_BITE = 0.85;

/**
 * Ce que l'oubli retire chaque année à ce qu'on ne pratique plus.
 *
 * Mais jamais sous un plancher tiré du meilleur niveau atteint : on se
 * rouille, on n'oublie pas qu'on a su faire. Sans ce plancher, une vie de
 * cuisinier finissait par ne plus savoir cuire un œuf.
 */
export const RUST = 1.1;
export const KEEP = 0.62;

/**
 * Jusqu'où l'on monte sans jamais s'y mettre.
 *
 * C'est la règle qui donne au système sa raison d'être, et elle a été
 * mesurée : sans plafond, exercer un métier soixante ans amenait la
 * compétence à **94,6 sur 100**. Tout le monde finissait excellent sans rien
 * décider, et travailler délibérément ne changeait plus rien (94,6 → 95,7).
 *
 * Le plafond tombe juste sous « solide ». Autrement dit : on devient correct
 * en vivant, on ne devient solide qu'en le voulant.
 */
export const PASSIVE_CAP = 62;

/** Ce qu'une année de métier apporte à la compétence du métier. */
export const ON_THE_JOB = 2.6;

/** Ce qu'une matière scolaire réussie apporte. */
export const FROM_SCHOOL = 1.5;

/** Ce qu'un intérêt entretenu apporte. */
export const FROM_INTEREST = 0.9;

/* ------------------------------------------------------------------ */
/* Ce que ça change                                                    */
/* ------------------------------------------------------------------ */

/**
 * Le niveau attendu pour un poste, par échelon.
 *
 * Un premier échelon ne demande rien ; le sommet d'une échelle demande
 * beaucoup. C'est ce qui fait qu'une compétence ouvre réellement quelque
 * chose au lieu de garnir une fiche.
 */
export function expectedFor(level: number): number {
  return Math.min(88, level * 17);
}

/**
 * Ce que l'écart au niveau attendu fait à une candidature.
 *
 * Multiplicateur de 0,55 à 1,45 : très en dessous du niveau attendu on divise
 * presque ses chances par deux, très au-dessus on les multiplie par une fois
 * et demie. Assez pour qu'un autodidacte doué décroche un poste qu'un diplômé
 * sans pratique n'aurait pas — c'est tout l'intérêt d'avoir des compétences
 * à côté des diplômes. Pas assez pour remplacer le diplôme, qui reste
 * éliminatoire.
 */
export const HIRE_SWING = 0.45;

/** Ce que la compétence fait au salaire proposé. */
export const PAY_SWING = 0.28;
