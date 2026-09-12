/**
 * Les matières, et l'examen.
 *
 * L'audit relevait deux choses : « une seule moyenne : ni matières, ni points
 * forts, ni orientation par les notes », et « les notes se calculent seules :
 * passer un examen n'est jamais un moment ». Douze années de scolarité se
 * résumaient à un nombre qui montait tout seul.
 *
 * Ce fichier décrit de quoi être bon quelque part et mauvais ailleurs. Deux
 * conséquences, qui sont tout l'intérêt :
 *
 * 1. **on ne peut pas être bon partout** — chaque matière demande un mélange
 *    différent d'esprit, de travail et de temps, et le temps est fini ;
 * 2. **les points forts orientent** — une filière universitaire ne regarde pas
 *    la moyenne générale, elle regarde ses matières à elle.
 *
 * Aucun contenu scolaire réel n'est décrit : ce sont des étiquettes, des
 * pondérations et des seuils.
 */

import type { StatKey } from '../engine/types.ts';

export interface Subject {
  id: string;
  label: string;
  emoji: string;
  /** La statistique qui pèse le plus. */
  driver: StatKey;
  /**
   * Part de talent brut contre travail régulier, 0-1.
   *
   * 1 = on l'a ou on ne l'a pas ; 0 = tout se rattrape en s'y mettant. C'est
   * ce qui fait qu'un élève travailleur et un élève doué n'ont pas le même
   * bulletin, seulement la même moyenne.
   */
  talent: number;
  /** Difficulté propre : certaines matières notent plus sévèrement. */
  severity: number;
  /** Cycles où elle est enseignée. */
  from: number;
  /** L'intérêt que le fait d'y réussir entretient. */
  interest?: string;
}

export const SUBJECTS: Subject[] = [
  {
    id: 'lettres', label: 'Français', emoji: '📖',
    driver: 'intelligence', talent: 0.5, severity: 1, from: 6, interest: 'lecture',
  },
  {
    id: 'calcul', label: 'Mathématiques', emoji: '📐',
    driver: 'intelligence', talent: 0.78, severity: 1.18, from: 6, interest: 'sciences',
  },
  {
    id: 'monde', label: 'Histoire-géographie', emoji: '🗺️',
    driver: 'discipline', talent: 0.28, severity: 0.92, from: 8, interest: 'histoire',
  },
  {
    id: 'nature', label: 'Sciences de la vie', emoji: '🌿',
    driver: 'intelligence', talent: 0.45, severity: 0.96, from: 8, interest: 'sciences',
  },
  {
    id: 'physique', label: 'Physique-chimie', emoji: '⚗️',
    driver: 'intelligence', talent: 0.7, severity: 1.14, from: 11, interest: 'sciences',
  },
  {
    id: 'langue', label: 'Langue étrangère', emoji: '💬',
    driver: 'intelligence', talent: 0.4, severity: 1, from: 8, interest: 'voyages',
  },
  {
    id: 'corps', label: 'Éducation physique', emoji: '🤸',
    driver: 'fitness', talent: 0.6, severity: 0.7, from: 6, interest: 'course',
  },
  {
    id: 'art', label: 'Arts', emoji: '🎨',
    driver: 'intelligence', talent: 0.66, severity: 0.8, from: 6, interest: 'dessin',
  },
  {
    id: 'machine', label: 'Technologie', emoji: '🔧',
    driver: 'intelligence', talent: 0.5, severity: 0.94, from: 11, interest: 'informatique',
  },
  {
    id: 'pensée', label: 'Philosophie', emoji: '🕯️',
    driver: 'intelligence', talent: 0.72, severity: 1.1, from: 16, interest: 'lecture',
  },
];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

/** Les matières enseignées à un âge donné. */
export function subjectsAt(age: number): Subject[] {
  return SUBJECTS.filter((s) => age >= s.from);
}

/**
 * Ce que chaque filière regarde.
 *
 * C'est la deuxième moitié du système : sans cela, avoir des points forts ne
 * changerait rien. Une école de médecine ne lit pas la moyenne générale.
 */
export const MAJOR_SUBJECTS: Record<string, string[]> = {
  medicine: ['nature', 'physique', 'calcul'],
  nursing: ['nature', 'physique', 'lettres'],
  law: ['lettres', 'monde', 'pensée'],
  cs: ['calcul', 'machine', 'physique'],
  engineering: ['calcul', 'physique', 'machine'],
  economics: ['calcul', 'monde', 'langue'],
  finance: ['calcul', 'monde', 'langue'],
  business: ['calcul', 'langue', 'lettres'],
  psychology: ['nature', 'pensée', 'lettres'],
  history: ['monde', 'lettres', 'pensée'],
  arts: ['art', 'lettres', 'pensée'],
  science: ['nature', 'physique', 'calcul'],
  communication: ['lettres', 'langue', 'monde'],
  education: ['lettres', 'monde', 'pensée'],
  architecture: ['art', 'calcul', 'machine'],
  agronomy: ['nature', 'physique', 'machine'],
  veterinary: ['nature', 'physique', 'calcul'],
  sports: ['corps', 'nature', 'monde'],
  philosophy: ['pensée', 'lettres', 'monde'],
  languages: ['langue', 'lettres', 'monde'],
  voc_trades: ['machine', 'corps', 'calcul'],
  voc_mechanic: ['machine', 'physique', 'corps'],
  voc_culinary: ['machine', 'art', 'corps'],
  voc_beauty: ['art', 'lettres', 'corps'],
  voc_police: ['corps', 'monde', 'lettres'],
};

/** Comment on nomme une note, sans jamais afficher que le nombre. */
export function markWord(mark: number): string {
  if (mark >= 17) return 'excellent';
  if (mark >= 14) return 'solide';
  if (mark >= 11) return 'correct';
  if (mark >= 8) return 'juste';
  if (mark >= 5) return 'faible';
  return 'catastrophique';
}

/* ------------------------------------------------------------------ */
/* L'examen                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'une session d'examens vaut.
 *
 * L'examen ne remplace pas la note de l'année : il la corrige. C'est
 * volontaire — un système où une seule partie jouée décide de douze ans
 * d'école serait absurde, et un système où elle ne change rien serait
 * décoratif. Le poids est là pour que jouer compte sans tout emporter.
 */
export const EXAM_WEIGHT = 0.45;

/** Les sessions d'examen, par cycle. */
export const EXAM_SESSIONS: { stage: string; label: string; what: string }[] = [
  { stage: 'middle', label: 'Le brevet', what: 'Trois jours dans un gymnase, des tables espacées' },
  { stage: 'high', label: 'Le baccalauréat', what: 'Celui dont on parle depuis trois ans' },
  { stage: 'university', label: 'Les partiels', what: 'Deux semaines qui décident de l’année' },
  { stage: 'graduate', label: 'La soutenance', what: 'Un jury, et rien d’autre à quoi se raccrocher' },
  { stage: 'vocational', label: 'L’épreuve pratique', what: 'On regarde tes mains, pas tes réponses' },
];

export function sessionFor(stage: string) {
  return EXAM_SESSIONS.find((s) => s.stage === stage);
}
