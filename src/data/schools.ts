/**
 * Établissements scolaires.
 *
 * L'école n'est pas choisie librement : elle découle du quartier, des moyens
 * du foyer et de ce que les parents attendent de la scolarité. Une bonne
 * école accélère, une mauvaise freine — mais aucune ne décide à la place de
 * l'élève : le niveau académique modifie la moyenne, la pression modifie le
 * stress, la mixité sociale modifie les fréquentations, jamais l'inverse.
 */

import type { EducationStage } from '../engine/types.ts';
import type { SchoolProfile } from '../engine/origin.ts';

export interface SchoolArchetype {
  id: string;
  label: string;
  emoji: string;
  /** Fréquence du harcèlement, 0-100. */
  bullying: number;
  /** Rotation des enseignants, 0-100. */
  turnover: number;
  /** Soutien scolaire et accompagnement disponibles, 0-100. */
  support: number;
  /** Réseau d'anciens élèves, 0-100. */
  alumni: number;
  /** Établissement payant : frais annuels en part du revenu national. */
  tuitionRatio: number;
  academic: number;
  classSize: number;
  budget: number;
  reputation: number;
  discipline: number;
  safety: number;
  facilities: number;
  clubs: number;
  sports: number;
  teacherQuality: number;
  programBreadth: number;
  pressure: number;
  socialMix: number;
  /** Taille de l'établissement, en élèves. */
  students: [number, number];
  /** Qualité de quartier minimale pour rencontrer cet établissement. */
  minEducationAccess: number;
  description: string;
}

export const SCHOOL_ARCHETYPES: SchoolArchetype[] = [
  {
    id: 'publicStruggling', label: 'Établissement public en difficulté', emoji: '🧱',
    bullying: 68, turnover: 74, support: 28, alumni: 12,
    tuitionRatio: 0, academic: 38, classSize: 30, budget: 32, reputation: 28,
    discipline: 34, safety: 42, facilities: 36, clubs: 30, sports: 44,
    teacherQuality: 42, programBreadth: 36, pressure: 32, socialMix: 78,
    students: [400, 1400], minEducationAccess: 0,
    description: 'Des classes chargées, des professeurs qui changent souvent, et quelques-uns qui s’accrochent.',
  },
  {
    id: 'publicOrdinary', label: 'Établissement public de quartier', emoji: '🏫',
    bullying: 44, turnover: 44, support: 52, alumni: 34,
    tuitionRatio: 0, academic: 56, classSize: 26, budget: 52, reputation: 52,
    discipline: 56, safety: 64, facilities: 54, clubs: 50, sports: 58,
    teacherQuality: 58, programBreadth: 54, pressure: 48, socialMix: 66,
    students: [300, 1100], minEducationAccess: 30,
    description: 'Ni brillant ni mauvais : ce qu’on en tire dépend surtout de l’élève.',
  },
  {
    id: 'publicSelective', label: 'Lycée public réputé', emoji: '🎖️',
    bullying: 34, turnover: 24, support: 74, alumni: 78,
    tuitionRatio: 0, academic: 80, classSize: 24, budget: 70, reputation: 82,
    discipline: 72, safety: 76, facilities: 70, clubs: 72, sports: 64,
    teacherQuality: 80, programBreadth: 78, pressure: 76, socialMix: 44,
    students: [500, 1600], minEducationAccess: 58,
    description: 'On y entre sur dossier ou par adresse. Le niveau tire vers le haut, la pression aussi.',
  },
  {
    id: 'privateContract', label: 'École privée sous contrat', emoji: '📗',
    bullying: 30, turnover: 30, support: 70, alumni: 62,
    tuitionRatio: 0.05, academic: 70, classSize: 22, budget: 66, reputation: 70,
    discipline: 78, safety: 80, facilities: 66, clubs: 62, sports: 62,
    teacherQuality: 70, programBreadth: 62, pressure: 64, socialMix: 40,
    students: [200, 800], minEducationAccess: 25,
    description: 'Cadre strict, classes plus petites, une facture modérée mais réelle.',
  },
  {
    id: 'privateElite', label: 'Établissement privé d’élite', emoji: '👑',
    bullying: 26, turnover: 16, support: 88, alumni: 96,
    tuitionRatio: 0.35, academic: 90, classSize: 16, budget: 94, reputation: 95,
    discipline: 82, safety: 92, facilities: 94, clubs: 92, sports: 88,
    teacherQuality: 90, programBreadth: 90, pressure: 86, socialMix: 12,
    students: [180, 700], minEducationAccess: 55,
    description: 'Des moyens, des réseaux, et l’exigence permanente d’être à la hauteur.',
  },
  {
    id: 'international', label: 'École internationale', emoji: '🌍',
    bullying: 28, turnover: 34, support: 82, alumni: 88,
    tuitionRatio: 0.28, academic: 84, classSize: 18, budget: 86, reputation: 86,
    discipline: 68, safety: 88, facilities: 86, clubs: 84, sports: 76,
    teacherQuality: 82, programBreadth: 92, pressure: 70, socialMix: 26,
    students: [200, 900], minEducationAccess: 50,
    description: 'Plusieurs langues, des camarades venus de partout, et un carnet d’adresses mondial.',
  },
  {
    id: 'rural', label: 'École de campagne', emoji: '🌾',
    bullying: 34, turnover: 40, support: 46, alumni: 22,
    tuitionRatio: 0, academic: 54, classSize: 17, budget: 42, reputation: 48,
    discipline: 64, safety: 84, facilities: 38, clubs: 28, sports: 40,
    teacherQuality: 58, programBreadth: 30, pressure: 38, socialMix: 62,
    students: [40, 300], minEducationAccess: 0,
    description: 'Petits effectifs, professeurs qui connaissent chaque nom, peu d’options.',
  },
  {
    id: 'boarding', label: 'Internat', emoji: '🛏️',
    bullying: 46, turnover: 26, support: 76, alumni: 72,
    tuitionRatio: 0.22, academic: 76, classSize: 20, budget: 74, reputation: 74,
    discipline: 92, safety: 84, facilities: 76, clubs: 78, sports: 86,
    teacherQuality: 74, programBreadth: 66, pressure: 82, socialMix: 34,
    students: [150, 600], minEducationAccess: 0,
    description: 'On y dort, on y travaille, on y grandit loin de sa famille.',
  },
  {
    id: 'alternative', label: 'École alternative', emoji: '🎨',
    bullying: 18, turnover: 32, support: 72, alumni: 40,
    tuitionRatio: 0.12, academic: 62, classSize: 15, budget: 56, reputation: 54,
    discipline: 36, safety: 82, facilities: 58, clubs: 82, sports: 52,
    teacherQuality: 68, programBreadth: 70, pressure: 24, socialMix: 38,
    students: [60, 300], minEducationAccess: 35,
    description: 'Peu de notes, beaucoup de projets. Autonomie exigée dès le départ.',
  },
  {
    id: 'religious', label: 'Établissement confessionnel', emoji: '⛪',
    bullying: 26, turnover: 26, support: 66, alumni: 58,
    tuitionRatio: 0.06, academic: 66, classSize: 24, budget: 58, reputation: 66,
    discipline: 86, safety: 82, facilities: 58, clubs: 56, sports: 58,
    teacherQuality: 66, programBreadth: 52, pressure: 62, socialMix: 46,
    students: [200, 900], minEducationAccess: 20,
    description: 'Règles claires, valeurs affichées, communauté soudée.',
  },
  {
    id: 'homeschool', label: 'Instruction en famille', emoji: '🏡',
    bullying: 2, turnover: 8, support: 60, alumni: 6,
    tuitionRatio: 0.02, academic: 58, classSize: 1, budget: 30, reputation: 42,
    discipline: 50, safety: 96, facilities: 22, clubs: 8, sports: 24,
    teacherQuality: 55, programBreadth: 40, pressure: 40, socialMix: 20,
    students: [1, 4], minEducationAccess: 0,
    description: 'Aucun trajet, aucun harcèlement, et presque aucun camarade.',
  },
];

export const SCHOOL_MAP: Record<string, SchoolArchetype> = Object.fromEntries(
  SCHOOL_ARCHETYPES.map((s) => [s.id, s]),
);

/**
 * Pondère les établissements qu'un foyer donné peut réellement fréquenter.
 * Le résultat est une liste de poids, jamais un choix imposé : un foyer aisé
 * dans un quartier populaire peut très bien mettre son enfant à l'école
 * publique du coin.
 */
export function schoolWeights(opts: {
  /** Accès à l'éducation du quartier, 0-100. */
  educationAccess: number;
  /** Qualité scolaire du quartier, 0-100. */
  schoolQuality: number;
  /** Revenu disponible du foyer rapporté au revenu national. */
  incomeRatio: number;
  /** Importance accordée par la famille à la scolarité, 0-100. */
  schoolValue: number;
  /** Ruralité : 0 = métropole, 100 = hameau isolé. */
  rurality: number;
  /** Le pays est-il très scolarisé ? 0-1. */
  countryEducation: number;
}): { id: string; weight: number }[] {
  const out: { id: string; weight: number }[] = [];
  for (const a of SCHOOL_ARCHETYPES) {
    if (opts.educationAccess < a.minEducationAccess) continue;

    // Les frais de scolarité s'évaluent en part du revenu disponible : au-delà
    // d'un tiers, l'école devient hors d'atteinte quoi qu'en pensent les parents.
    const affordability = a.tuitionRatio === 0
      ? 1
      : Math.max(0, Math.min(1, (opts.incomeRatio * 0.33) / a.tuitionRatio));
    if (a.tuitionRatio > 0 && affordability < 0.15) continue;

    let w = 1;
    switch (a.id) {
      case 'publicStruggling':
        w = 40 * Math.max(0.05, (60 - opts.schoolQuality) / 60);
        break;
      case 'publicOrdinary':
        w = 100 * (0.4 + opts.schoolQuality / 160);
        break;
      case 'publicSelective':
        w = 26 * Math.max(0, (opts.schoolQuality - 55) / 45) * (0.5 + opts.schoolValue / 140);
        break;
      case 'privateContract':
        w = 30 * affordability * (0.4 + opts.schoolValue / 130);
        break;
      case 'privateElite':
        w = 16 * affordability * affordability * (0.3 + opts.schoolValue / 120);
        break;
      case 'international':
        w = 10 * affordability * (0.3 + opts.countryEducation);
        break;
      case 'rural':
        w = 70 * Math.max(0, (opts.rurality - 45) / 55);
        break;
      case 'boarding':
        w = 8 * affordability * (0.3 + opts.rurality / 130);
        break;
      case 'alternative':
        w = 7 * affordability;
        break;
      case 'religious':
        w = 18 * affordability;
        break;
      case 'homeschool':
        w = 4 * (0.4 + opts.rurality / 140) * (0.3 + opts.schoolValue / 120);
        break;
    }
    if (w > 0.01) out.push({ id: a.id, weight: w });
  }
  return out.length > 0 ? out : [{ id: 'publicOrdinary', weight: 1 }];
}

const SCHOOL_ROOTS = [
  'Jean-Bertrand', 'Sainte-Hélène', 'Marie-Vallon', 'Les Quatre-Vents',
  'Pierre-Aubry', 'Les Ormeaux', 'Camille-Ferrand', 'Val-d’Ancre',
  'Louise-Merlin', 'Le Grand-Pré', 'Antoine-Reverdy', 'Les Cordeliers',
  'Hélène-Barrois', 'Le Clos-Mesnil', 'Simon-Delaure', 'La Roseraie',
  'Georges-Vaneau', 'Les Trois-Ponts', 'Clara-Nivelle', 'Mont-Chalier',
];

const STAGE_PREFIX: Partial<Record<EducationStage, string>> = {
  nursery: 'Maternelle',
  primary: 'École',
  middle: 'Collège',
  high: 'Lycée',
};

/** Nom d'établissement, cohérent avec son archétype et son cycle. */
export function schoolName(
  archetypeId: string,
  stage: EducationStage,
  pick: <T>(a: readonly T[]) => T,
): string {
  const root = pick(SCHOOL_ROOTS);
  if (archetypeId === 'homeschool') return 'Instruction à la maison';
  if (archetypeId === 'international') return `École internationale ${root}`;
  if (archetypeId === 'boarding') return `Internat ${root}`;
  return `${STAGE_PREFIX[stage] ?? 'Établissement'} ${root}`;
}

/**
 * Construit un établissement. Les caractéristiques de l'archétype sont
 * modulées par le quartier et par le pays : une école « ordinaire » en Suisse
 * n'a pas les moyens d'une école « ordinaire » au Nigéria.
 */
export function buildSchool(opts: {
  archetypeId: string;
  stage: EducationStage;
  name: string;
  /** Qualité scolaire du quartier, 0-100. */
  neighborhoodQuality: number;
  /** Indice d'éducation national, 0-1. */
  countryEducation: number;
  nationalIncome: number;
  jitter: (spread: number) => number;
  roll: (min: number, max: number) => number;
  /** Clubs réellement proposés cette année. */
  clubs?: string[];
}): SchoolProfile {
  const a = SCHOOL_MAP[opts.archetypeId] ?? SCHOOL_MAP.publicOrdinary;
  // Le quartier et le pays comptent pour un tiers ; l'archétype pour le reste.
  const lift = (v: number) =>
    clamp(v * 0.68 + opts.neighborhoodQuality * 0.14 + opts.countryEducation * 100 * 0.18 + opts.jitter(6));

  return {
    archetypeId: a.id,
    name: opts.name,
    academic: lift(a.academic),
    students: Math.round(opts.roll(a.students[0], a.students[1])),
    classSize: Math.max(1, Math.round(a.classSize * (1.25 - opts.countryEducation * 0.3) + opts.jitter(2))),
    budget: lift(a.budget),
    reputation: lift(a.reputation),
    discipline: clamp(a.discipline + opts.jitter(8)),
    safety: clamp(a.safety * 0.72 + opts.neighborhoodQuality * 0.28 + opts.jitter(7)),
    facilities: lift(a.facilities),
    clubs: lift(a.clubs),
    sports: lift(a.sports),
    teacherQuality: lift(a.teacherQuality),
    programBreadth: lift(a.programBreadth),
    pressure: clamp(a.pressure + opts.jitter(8)),
    socialMix: clamp(a.socialMix + opts.jitter(8)),
    tuition: Math.round(a.tuitionRatio * opts.nationalIncome),

    // Ce qui se joue en dehors des bulletins.
    peerLevel: lift(a.academic * 0.75 + a.socialMix * 0.1),
    competition: clamp(a.academic * 0.5 + a.pressure * 0.4 + opts.jitter(8)),
    teacherTurnover: clamp(a.turnover * 0.75 + (100 - opts.neighborhoodQuality) * 0.2 + opts.jitter(8)),
    bullying: clamp(a.bullying * 0.7 + (100 - opts.neighborhoodQuality) * 0.2 + opts.jitter(9)),
    tutoring: lift(a.support),
    counselling: clamp(a.support * 0.6 + opts.countryEducation * 40 + opts.jitter(8)),
    guidance: clamp(a.support * 0.5 + a.programBreadth * 0.3 + opts.countryEducation * 20 + opts.jitter(8)),
    alumniNetwork: clamp(a.alumni * 0.85 + opts.jitter(6)),
    offeredClubs: opts.clubs ?? [],
  };
}

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(100, v)));
}
