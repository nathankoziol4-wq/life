/**
 * Filières universitaires et formations professionnelles.
 * `difficulty` module les notes ; `prestige` module les salaires d'embauche.
 */

import type { EducationLevel } from '../engine/types.ts';

export interface Major {
  id: string;
  name: string;
  emoji: string;
  /** 1.0 = moyenne. Au-dessus, les notes sont plus dures à obtenir. */
  difficulty: number;
  /** Bonus de salaire à l'embauche (multiplicateur). */
  prestige: number;
  /** Durée du cursus en années. */
  years: number;
  /** Intelligence minimale conseillée pour être admis. */
  minIntelligence: number;
  /** Frais de scolarité annuels (référence, ajustés par pays). */
  tuition: number;
  /** Nécessite un cycle supérieur pour exercer (médecine, droit…). */
  requiresGraduate: boolean;
  description: string;
}

export const MAJORS: Major[] = [
  { id: 'medicine', name: 'Médecine', emoji: '🩺', difficulty: 1.45, prestige: 1.5, years: 6, minIntelligence: 78, tuition: 4200, requiresGraduate: true, description: 'Cursus long et sélectif menant aux professions médicales.' },
  { id: 'nursing', name: 'Soins infirmiers', emoji: '💉', difficulty: 1.15, prestige: 1.1, years: 3, minIntelligence: 55, tuition: 2200, requiresGraduate: false, description: 'Formation pratique et exigeante, débouchés immédiats.' },
  { id: 'law', name: 'Droit', emoji: '⚖️', difficulty: 1.35, prestige: 1.4, years: 5, minIntelligence: 72, tuition: 3800, requiresGraduate: true, description: 'Textes, plaidoirie et procédure. Concours sélectifs à la sortie.' },
  { id: 'cs', name: 'Informatique', emoji: '💻', difficulty: 1.25, prestige: 1.35, years: 5, minIntelligence: 70, tuition: 3500, requiresGraduate: false, description: 'Algorithmique, systèmes et développement logiciel.' },
  { id: 'engineering', name: 'Ingénierie', emoji: '⚙️', difficulty: 1.35, prestige: 1.35, years: 5, minIntelligence: 74, tuition: 3900, requiresGraduate: false, description: 'Mathématiques appliquées et conception technique.' },
  { id: 'economics', name: 'Économie', emoji: '📈', difficulty: 1.15, prestige: 1.2, years: 5, minIntelligence: 65, tuition: 3100, requiresGraduate: false, description: 'Marchés, statistiques et politiques publiques.' },
  { id: 'finance', name: 'Finance', emoji: '🏦', difficulty: 1.2, prestige: 1.35, years: 5, minIntelligence: 68, tuition: 4400, requiresGraduate: false, description: 'Valorisation, risque et marchés de capitaux.' },
  { id: 'business', name: 'Commerce', emoji: '🧾', difficulty: 1.0, prestige: 1.15, years: 4, minIntelligence: 55, tuition: 4800, requiresGraduate: false, description: 'Gestion, vente et stratégie d’entreprise.' },
  { id: 'psychology', name: 'Psychologie', emoji: '🧠', difficulty: 1.1, prestige: 1.05, years: 5, minIntelligence: 62, tuition: 2600, requiresGraduate: true, description: 'Comportement humain, clinique et recherche.' },
  { id: 'history', name: 'Histoire', emoji: '📜', difficulty: 1.0, prestige: 0.9, years: 3, minIntelligence: 58, tuition: 1800, requiresGraduate: false, description: 'Sources, archives et récit critique du passé.' },
  { id: 'arts', name: 'Arts', emoji: '🎨', difficulty: 0.9, prestige: 0.85, years: 3, minIntelligence: 45, tuition: 2400, requiresGraduate: false, description: 'Pratique plastique, scénique ou musicale.' },
  { id: 'science', name: 'Sciences', emoji: '🔬', difficulty: 1.3, prestige: 1.2, years: 5, minIntelligence: 72, tuition: 2900, requiresGraduate: false, description: 'Physique, chimie, biologie fondamentale.' },
  { id: 'communication', name: 'Communication', emoji: '📢', difficulty: 0.9, prestige: 0.95, years: 3, minIntelligence: 50, tuition: 2700, requiresGraduate: false, description: 'Médias, relations publiques et rédaction.' },
  { id: 'education', name: 'Enseignement', emoji: '🎒', difficulty: 1.0, prestige: 0.95, years: 4, minIntelligence: 58, tuition: 1600, requiresGraduate: false, description: 'Didactique et sciences de l’éducation.' },
  { id: 'architecture', name: 'Architecture', emoji: '📐', difficulty: 1.3, prestige: 1.25, years: 5, minIntelligence: 68, tuition: 4000, requiresGraduate: false, description: 'Conception spatiale, structure et urbanisme.' },
  { id: 'agronomy', name: 'Agronomie', emoji: '🌾', difficulty: 1.1, prestige: 1.0, years: 4, minIntelligence: 58, tuition: 2100, requiresGraduate: false, description: 'Sciences du vivant appliquées à l’agriculture.' },
  { id: 'veterinary', name: 'Vétérinaire', emoji: '🐕', difficulty: 1.4, prestige: 1.3, years: 5, minIntelligence: 75, tuition: 3800, requiresGraduate: true, description: 'Médecine animale, cursus très sélectif.' },
  { id: 'sports', name: 'Sciences du sport', emoji: '🏅', difficulty: 0.95, prestige: 0.95, years: 3, minIntelligence: 48, tuition: 1900, requiresGraduate: false, description: 'Physiologie, entraînement et gestion sportive.' },
  { id: 'philosophy', name: 'Philosophie', emoji: '🤔', difficulty: 1.15, prestige: 0.9, years: 3, minIntelligence: 66, tuition: 1600, requiresGraduate: false, description: 'Logique, éthique et histoire des idées.' },
  { id: 'languages', name: 'Langues', emoji: '🗣️', difficulty: 1.0, prestige: 0.95, years: 3, minIntelligence: 56, tuition: 1900, requiresGraduate: false, description: 'Traduction, linguistique et cultures étrangères.' },
];

export const MAJOR_MAP: Record<string, Major> = Object.fromEntries(MAJORS.map((m) => [m.id, m]));

export function getMajor(id: string | null): Major | null {
  return id ? (MAJOR_MAP[id] ?? null) : null;
}

/** Formations professionnelles courtes (alternative à l'université). */
export interface VocationalCourse {
  id: string;
  name: string;
  emoji: string;
  years: number;
  cost: number;
  minAge: number;
  /** Métiers débloqués (ids de JobDef). */
  unlocks: string[];
  description: string;
}

export const VOCATIONAL_COURSES: VocationalCourse[] = [
  { id: 'voc_trades', name: 'CAP bâtiment', emoji: '🧱', years: 2, cost: 900, minAge: 16, unlocks: ['mason', 'electrician', 'plumber', 'carpenter'], description: 'Maçonnerie, électricité, plomberie, charpente.' },
  { id: 'voc_mechanic', name: 'Mécanique automobile', emoji: '🔧', years: 2, cost: 1100, minAge: 16, unlocks: ['mechanic'], description: 'Entretien et réparation de véhicules.' },
  { id: 'voc_culinary', name: 'École de cuisine', emoji: '👨‍🍳', years: 2, cost: 2400, minAge: 16, unlocks: ['chef', 'baker'], description: 'Techniques culinaires et gestion de brigade.' },
  { id: 'voc_beauty', name: 'Esthétique et coiffure', emoji: '💇', years: 2, cost: 1600, minAge: 16, unlocks: ['hairdresser', 'beautician'], description: 'Coiffure, soins et conseil beauté.' },
  { id: 'voc_police', name: 'Académie de police', emoji: '👮', years: 1, cost: 600, minAge: 20, unlocks: ['police'], description: 'Formation initiale des forces de l’ordre.' },
  { id: 'voc_fire', name: 'École des pompiers', emoji: '🚒', years: 1, cost: 500, minAge: 18, unlocks: ['firefighter'], description: 'Secours, incendie et risques technologiques.' },
  { id: 'voc_pilot', name: 'École de pilotage', emoji: '✈️', years: 3, cost: 48000, minAge: 18, unlocks: ['pilot'], description: 'Licence de pilote de ligne. Très coûteuse.' },
  { id: 'voc_truck', name: 'Permis poids lourd', emoji: '🚛', years: 1, cost: 2800, minAge: 21, unlocks: ['trucker'], description: 'Conduite de véhicules lourds et logistique.' },
  { id: 'voc_it', name: 'Bootcamp développement', emoji: '⌨️', years: 1, cost: 6500, minAge: 18, unlocks: ['devjr'], description: 'Reconversion accélérée vers le développement web.' },
  { id: 'voc_nurse_aide', name: 'Aide-soignant', emoji: '🏥', years: 1, cost: 800, minAge: 18, unlocks: ['nurseaide'], description: 'Accompagnement des patients en établissement.' },
  { id: 'voc_realestate', name: 'Licence immobilière', emoji: '🏘️', years: 1, cost: 1400, minAge: 18, unlocks: ['realtor'], description: 'Transaction et gestion de biens.' },
  { id: 'voc_military', name: 'Engagement militaire', emoji: '🎖️', years: 2, cost: 0, minAge: 18, unlocks: ['soldier'], description: 'Formation militaire rémunérée.' },
];

export const VOCATIONAL_MAP: Record<string, VocationalCourse> = Object.fromEntries(
  VOCATIONAL_COURSES.map((v) => [v.id, v]),
);

export const GRADUATE_PROGRAMS: {
  id: string;
  name: string;
  emoji: string;
  requiresMajor: string[];
  years: number;
  cost: number;
  level: EducationLevel;
  description: string;
}[] = [
  { id: 'grad_med', name: 'Internat de médecine', emoji: '🏥', requiresMajor: ['medicine'], years: 4, cost: 5200, level: 4, description: 'Spécialisation clinique obligatoire pour exercer.' },
  { id: 'grad_law', name: 'École du barreau', emoji: '⚖️', requiresMajor: ['law'], years: 2, cost: 7400, level: 4, description: 'Préparation à la prestation de serment.' },
  { id: 'grad_mba', name: 'MBA', emoji: '📊', requiresMajor: ['business', 'economics', 'finance', 'engineering', 'cs'], years: 2, cost: 22000, level: 4, description: 'Diplôme de management très valorisé.' },
  { id: 'grad_phd', name: 'Doctorat', emoji: '🎓', requiresMajor: ['science', 'cs', 'psychology', 'history', 'philosophy', 'economics', 'engineering', 'languages', 'agronomy'], years: 4, cost: 1200, level: 4, description: 'Recherche originale et thèse. Peu rémunéré pendant le cursus.' },
  { id: 'grad_vet', name: 'Clinicat vétérinaire', emoji: '🐾', requiresMajor: ['veterinary'], years: 2, cost: 4300, level: 4, description: 'Spécialisation en médecine animale.' },
  { id: 'grad_psy', name: 'Master de psychologie clinique', emoji: '🛋️', requiresMajor: ['psychology'], years: 2, cost: 3600, level: 4, description: 'Habilitation à la pratique clinique.' },
];
