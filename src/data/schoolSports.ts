/**
 * Le sport scolaire.
 *
 * L'audit posait le problème en une phrase : « le sport scolaire ne mène nulle
 * part : rien ne relie le club du lycée à la sélection ». Il y avait bien une
 * « Association sportive » dans la liste des clubs, qui donnait +9 de forme
 * une fois pour toutes et n'était plus jamais mentionnée. Le champ `sports` de
 * l'établissement, lui, n'était lu par personne.
 *
 * Ce fichier décrit une filière : on passe une sélection où l'on peut être
 * écarté, on s'entraîne, on joue une saison qui a un résultat, on peut porter
 * le brassard, on peut se blesser — et si l'on est assez bon, quelqu'un vient
 * regarder. Ce quelqu'un mène à une bourse, puis au métier de sportif
 * (`data/stage.ts`), qui existait sans qu'aucun chemin n'y conduise.
 *
 * Les sports sont génériques : aucune fédération, aucun club et aucune
 * compétition réels.
 */

import type { StatKey } from '../engine/types.ts';

export interface SchoolSport {
  id: string;
  label: string;
  emoji: string;
  /** Ce que c'est, en une phrase. */
  what: string;
  /** La statistique qui décide le plus. */
  driver: StatKey;
  /** La deuxième, qui pèse moitié moins. */
  second: StatKey;
  /**
   * Niveau physique attendu à la sélection, 0-100.
   *
   * C'est ce qui rend les sports inégalement accessibles : on entre dans un
   * club d'échecs sans rien, pas dans une équipe d'athlétisme.
   */
  demands: number;
  /** Risque de se faire mal, 0-100. */
  contact: number;
  /**
   * Combien de places, relativement.
   *
   * Un sport collectif prend quinze personnes, une épreuve individuelle en
   * prend deux. C'est ce qui décide si être bon suffit.
   */
  places: number;
  /** À quel point ça se voit de l'extérieur : c'est ce qui attire les recruteurs. */
  visibility: number;
  /** Ce que la pratique entretient comme goût. */
  interest: string;
  /** Y a-t-il une équipe, ou est-on seul ? */
  team: boolean;
}

export const SCHOOL_SPORTS: SchoolSport[] = [
  {
    id: 'course', label: 'Athlétisme', emoji: '🏃',
    what: 'Le chronomètre ne ment jamais et ne console personne',
    driver: 'fitness', second: 'discipline',
    demands: 52, contact: 14, places: 55, visibility: 58,
    interest: 'course', team: false,
  },
  {
    id: 'ballon', label: 'Football', emoji: '⚽',
    what: 'Onze places, quarante candidats, et tout le monde regarde',
    driver: 'fitness', second: 'intelligence',
    demands: 48, contact: 46, places: 82, visibility: 92,
    interest: 'football', team: true,
  },
  {
    id: 'panier', label: 'Basket', emoji: '🏀',
    what: 'Un sport où la taille aide et ne suffit pas',
    driver: 'fitness', second: 'discipline',
    demands: 54, contact: 40, places: 62, visibility: 78,
    interest: 'football', team: true,
  },
  {
    id: 'nage', label: 'Natation', emoji: '🏊',
    what: 'Cinq heures d’eau par semaine pour deux minutes qui comptent',
    driver: 'fitness', second: 'discipline',
    demands: 58, contact: 8, places: 48, visibility: 46,
    interest: 'natation', team: false,
  },
  {
    id: 'raquette', label: 'Tennis', emoji: '🎾',
    what: 'Seul en face, sans personne à qui passer la faute',
    driver: 'fitness', second: 'intelligence',
    demands: 44, contact: 12, places: 34, visibility: 62,
    interest: 'artsMartiaux', team: false,
  },
  {
    id: 'tapis', label: 'Gymnastique', emoji: '🤸',
    what: 'Des années pour dix secondes, et une note de juges',
    driver: 'fitness', second: 'discipline',
    demands: 74, contact: 52, places: 30, visibility: 54,
    interest: 'artsMartiaux', team: false,
  },
  {
    id: 'mêlée', label: 'Rugby', emoji: '🏉',
    what: 'On y entre entier et on en sort rarement indemne',
    driver: 'fitness', second: 'discipline',
    demands: 62, contact: 88, places: 76, visibility: 66,
    interest: 'football', team: true,
  },
  {
    id: 'filet', label: 'Volley', emoji: '🏐',
    what: 'Six personnes qui doivent penser en même temps',
    driver: 'fitness', second: 'intelligence',
    demands: 46, contact: 20, places: 60, visibility: 44,
    interest: 'football', team: true,
  },
  {
    id: 'glace', label: 'Escrime', emoji: '🤺',
    what: 'Un sport où l’on gagne dans la tête avant les jambes',
    driver: 'intelligence', second: 'fitness',
    demands: 30, contact: 18, places: 28, visibility: 30,
    interest: 'échecs', team: false,
  },
  {
    id: 'aviron', label: 'Aviron', emoji: '🚣',
    what: 'Se lever à cinq heures, huit personnes, un seul rythme',
    driver: 'fitness', second: 'discipline',
    demands: 64, contact: 16, places: 44, visibility: 34,
    interest: 'randonnée', team: true,
  },
];

export function getSchoolSport(id: string): SchoolSport | undefined {
  return SCHOOL_SPORTS.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ */
/* Où l'on joue                                                        */
/* ------------------------------------------------------------------ */

/**
 * Le groupe dans lequel on est classé.
 *
 * Ce n'est pas une décoration : le groupe décide du temps de jeu, de ce qu'on
 * peut gagner et de qui vient regarder. Monter est le seul progrès qui se voit
 * de l'extérieur.
 */
export type Squad = 'espoirs' | 'réserve' | 'première' | 'sélection';

export const SQUADS: { id: Squad; label: string; needs: number; note: string; pull: number }[] = [
  { id: 'espoirs', label: 'Les jeunes', needs: 0, note: 'Tu es là, c’est déjà ça.', pull: 0.3 },
  { id: 'réserve', label: 'L’équipe B', needs: 34, note: 'Tu joues, mais pas quand ça compte.', pull: 0.6 },
  { id: 'première', label: 'L’équipe première', needs: 62, note: 'On compte sur toi, et on te le fait sentir.', pull: 1 },
  { id: 'sélection', label: 'La sélection', needs: 84, note: 'On ne t’a pas demandé ton avis : on t’a convoqué.', pull: 1.6 },
];

export function squadFor(level: number): Squad {
  let best: Squad = 'espoirs';
  for (const s of SQUADS) if (level >= s.needs) best = s.id;
  return best;
}

export function squadInfo(id: Squad) {
  return SQUADS.find((s) => s.id === id) ?? SQUADS[0];
}

/* ------------------------------------------------------------------ */
/* Ce que donne une saison                                             */
/* ------------------------------------------------------------------ */

export const SEASON_BANDS: { min: number; label: string; note: string }[] = [
  { min: 86, label: 'Une saison dont on parlera', note: 'Ce genre d’année laisse un nom dans un couloir.' },
  { min: 68, label: 'Une bonne saison', note: 'Solide du début à la fin. On t’a vu.' },
  { min: 46, label: 'Une saison correcte', note: 'Rien à dire, rien à retenir non plus.' },
  { min: 26, label: 'Une saison difficile', note: 'Tu as joué, et c’est à peu près tout.' },
  { min: 0, label: 'Une saison à oublier', note: 'On t’a laissé sur le banc, et tu sais pourquoi.' },
];

export function seasonLabel(value: number): { label: string; note: string } {
  return SEASON_BANDS.find((b) => value >= b.min) ?? SEASON_BANDS[SEASON_BANDS.length - 1];
}

/* ------------------------------------------------------------------ */
/* La bourse                                                           */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'il faut pour qu'une université paie vos études parce que vous courez
 * vite.
 *
 * Deux conditions, et c'est le point : être bon ne suffit pas, il faut aussi
 * avoir été **vu**. Un excellent joueur dans un lycée dont personne ne parle
 * n'a pas de bourse, et c'est exactement l'inégalité que le jeu doit rendre
 * lisible.
 */
export const SCHOLARSHIP = {
  /** Niveau minimum dans le sport. */
  level: 66,
  /** Recruteurs qui doivent vous avoir vu jouer. */
  scouts: 2,
  /** Note minimale : une bourse sportive reste une inscription à l'université. */
  grades: 8,
};
