/**
 * Expériences formatrices.
 *
 * Certaines choses qui arrivent ne font pas que modifier une statistique le
 * temps d'une année : elles laissent une trace. Un déménagement forcé à onze
 * ans, un premier ami, une humiliation devant la classe, la séparation des
 * parents — vingt ans plus tard, la personne en porte encore quelque chose.
 *
 * Chaque expérience déclare ce qu'elle laisse derrière elle : un souvenir
 * daté et chargé, un déplacement des axes de personnalité, éventuellement une
 * peur, une ambition ou une habitude. Les systèmes du moteur se contentent de
 * l'appeler par son identifiant au moment où l'événement se produit
 * (`systems/psyche.ts`, `applyExperience`).
 *
 * L'ampleur dépend de l'âge : la même humiliation ne marque pas de la même
 * façon à huit ans et à quarante.
 */

import type { Emotion, FearId, MemoryKind, PersonalityAxes, Values } from '../engine/psyche.ts';

export interface ExperienceDef {
  id: string;
  /** Texte du souvenir. `{name}` est remplacé par la personne concernée. */
  memory: string;
  kind: MemoryKind;
  emotion: Emotion;
  /** Intensité de base, 0-100, avant modulation par l'âge et la sensibilité. */
  intensity: number;
  /** Effacement annuel du souvenir. Faible = marque durablement. */
  fade: number;
  /** Déplacement des axes de personnalité, en points. */
  axes?: Partial<Record<keyof PersonalityAxes, number>>;
  /** Déplacement des valeurs. */
  values?: Partial<Record<keyof Values, number>>;
  /** Peur créée ou renforcée. */
  fear?: { id: FearId; amount: number };
  /** Ambition éveillée. */
  ambition?: { id: string; weight: number };
  /** Habitude déclenchée. */
  habit?: string;
  /** Effet sur l'estime de soi. */
  selfEsteem?: number;
  /**
   * Âge où l'expérience marque le plus. L'effet décroît de part et d'autre :
   * la personnalité se forme surtout dans l'enfance et l'adolescence.
   */
  peakAge: number;
}

export const EXPERIENCES: ExperienceDef[] = [
  /* ---------------- Famille ---------------- */
  {
    id: 'parentsSéparés',
    memory: 'La séparation de mes parents.',
    kind: 'rupture', emotion: 'tristesse', intensity: 85, fade: 0.6, peakAge: 10,
    axes: { independence: 8, emotionalMaturity: 5, confidence: -5, adaptability: 4, loyalty: -3 },
    values: { family: 6, stability: 8 },
    fear: { id: 'abandonment', amount: 30 },
    selfEsteem: -8,
  },
  {
    id: 'parentSansEmploi',
    memory: 'L’année où {name} a perdu son travail.',
    kind: 'épreuve', emotion: 'peur', intensity: 62, fade: 1.2, peakAge: 12,
    axes: { caution: 6, ambition: 4, riskTolerance: -6 },
    values: { money: 8, stability: 7 },
    fear: { id: 'poverty', amount: 28 },
    ambition: { id: 'sécurité', weight: 25 },
  },
  {
    id: 'précaritéDurable',
    memory: 'Les années où il fallait compter chaque chose.',
    kind: 'épreuve', emotion: 'amertume', intensity: 70, fade: 0.9, peakAge: 11,
    axes: { discipline: 5, caution: 5, generosity: -3, perseverance: 5 },
    values: { money: 10, stability: 6, status: 4 },
    fear: { id: 'poverty', amount: 35 },
    ambition: { id: 'sécurité', weight: 30 },
    selfEsteem: -6,
  },
  {
    id: 'décèsProche',
    memory: 'La mort de {name}.',
    kind: 'perte', emotion: 'tristesse', intensity: 90, fade: 0.5, peakAge: 13,
    axes: { emotionalMaturity: 8, sensitivity: 6, optimism: -6 },
    values: { family: 10, tranquillity: 4 },
    fear: { id: 'loss', amount: 34 },
  },
  {
    id: 'déménagementForcé',
    memory: 'Le déménagement qu’on n’avait pas choisi.',
    kind: 'lieu', emotion: 'tristesse', intensity: 58, fade: 1.4, peakAge: 11,
    axes: { adaptability: 6, sociability: -4, independence: 4 },
    values: { stability: 6, friendship: 4 },
    fear: { id: 'change', amount: 20 },
  },
  {
    id: 'foyerConflictuel',
    memory: 'Les cris derrière la porte de la cuisine.',
    kind: 'épreuve', emotion: 'peur', intensity: 72, fade: 0.8, peakAge: 9,
    axes: { emotionalMaturity: 4, aggression: 4, confidence: -6, sensitivity: 5 },
    values: { tranquillity: 8, family: -3 },
    fear: { id: 'conflict', amount: 30 },
    selfEsteem: -7,
  },

  /* ---------------- École et pairs ---------------- */
  {
    id: 'harcèlement',
    memory: 'L’année où aller en classe faisait peur.',
    kind: 'humiliation', emotion: 'honte', intensity: 92, fade: 0.5, peakAge: 12,
    axes: { confidence: -14, extraversion: -8, sensitivity: 8, empathy: 6, aggression: 3 },
    values: { friendship: 5, reputation: 6 },
    fear: { id: 'judgement', amount: 42 },
    selfEsteem: -22,
  },
  {
    id: 'humiliationPublique',
    memory: 'Le jour où toute la classe a ri.',
    kind: 'humiliation', emotion: 'honte', intensity: 74, fade: 0.9, peakAge: 13,
    axes: { confidence: -8, extraversion: -5, sensitivity: 5 },
    fear: { id: 'publicSpeaking', amount: 30 },
    selfEsteem: -12,
  },
  {
    id: 'premierAmi',
    memory: 'Ma première vraie amitié, avec {name}.',
    kind: 'joie', emotion: 'joie', intensity: 68, fade: 1.1, peakAge: 8,
    axes: { sociability: 7, confidence: 5, loyalty: 6, extraversion: 4 },
    values: { friendship: 10 },
    habit: 'voirDesAmis',
    selfEsteem: 8,
  },
  {
    id: 'réussiteScolaire',
    memory: 'L’année où j’étais parmi les meilleurs.',
    kind: 'réussite', emotion: 'fierté', intensity: 66, fade: 1.3, peakAge: 14,
    axes: { confidence: 8, ambition: 6, discipline: 5, perseverance: 4 },
    values: { knowledge: 7, achievement: 6, career: 4 },
    ambition: { id: 'savoir', weight: 22 },
    selfEsteem: 12,
  },
  {
    id: 'échecScolaire',
    memory: 'Le redoublement, et le regard des autres.',
    kind: 'épreuve', emotion: 'honte', intensity: 70, fade: 1, peakAge: 14,
    axes: { confidence: -9, ambition: -4, perseverance: -3 },
    fear: { id: 'failure', amount: 32 },
    selfEsteem: -14,
  },
  {
    id: 'exclusion',
    memory: 'Les récréations passées seul.',
    kind: 'épreuve', emotion: 'tristesse', intensity: 66, fade: 0.9, peakAge: 10,
    axes: { extraversion: -7, independence: 7, sensitivity: 5, creativity: 4 },
    values: { friendship: 8, independence: 5 },
    fear: { id: 'rejection', amount: 30 },
    selfEsteem: -12,
  },

  /* ---------------- Découvertes ---------------- */
  {
    id: 'découverteInterêt',
    memory: 'La première fois que {name} m’a montré ça.',
    kind: 'découverte', emotion: 'joie', intensity: 55, fade: 1.5, peakAge: 11,
    axes: { curiosity: 6, creativity: 4, perseverance: 3 },
    values: { knowledge: 5, creativity: 4 },
    selfEsteem: 5,
  },
  {
    id: 'mentor',
    memory: 'Le professeur qui a cru en moi.',
    kind: 'découverte', emotion: 'fierté', intensity: 72, fade: 1, peakAge: 15,
    axes: { confidence: 9, ambition: 7, perseverance: 6, curiosity: 5 },
    values: { knowledge: 8, career: 5 },
    ambition: { id: 'carrière', weight: 20 },
    selfEsteem: 14,
  },
  {
    id: 'premierSalaire',
    memory: 'Mon premier argent gagné seul.',
    kind: 'réussite', emotion: 'fierté', intensity: 60, fade: 1.4, peakAge: 17,
    axes: { independence: 8, discipline: 5, confidence: 5 },
    values: { independence: 8, money: 5 },
    habit: 'économiser',
    selfEsteem: 9,
  },

  /* ---------------- Amour ---------------- */
  {
    id: 'premierAmour',
    memory: 'Mon premier amour, {name}.',
    kind: 'joie', emotion: 'joie', intensity: 80, fade: 0.9, peakAge: 17,
    axes: { confidence: 6, sensitivity: 5, empathy: 5, optimism: 4 },
    values: { love: 10 },
    selfEsteem: 10,
  },
  {
    id: 'premièreRupture',
    memory: 'La première fois que ça s’est arrêté.',
    kind: 'rupture', emotion: 'tristesse', intensity: 76, fade: 1, peakAge: 18,
    axes: { emotionalMaturity: 7, confidence: -5, jealousy: 4, independence: 4 },
    values: { love: 4, independence: 5 },
    fear: { id: 'rejection', amount: 22 },
    selfEsteem: -9,
  },
  {
    id: 'trahison',
    memory: 'Le jour où j’ai su que {name} mentait.',
    kind: 'injustice', emotion: 'colère', intensity: 82, fade: 0.7, peakAge: 22,
    axes: { loyalty: -6, jealousy: 8, honesty: 5, emotionalMaturity: 4 },
    fear: { id: 'abandonment', amount: 26 },
    selfEsteem: -10,
  },

  /* ---------------- Adulte ---------------- */
  {
    id: 'grandeRéussite',
    memory: 'Le jour où tout a basculé du bon côté.',
    kind: 'réussite', emotion: 'fierté', intensity: 85, fade: 1, peakAge: 30,
    axes: { confidence: 10, ambition: 6, optimism: 7, riskTolerance: 5 },
    values: { achievement: 8, career: 5 },
    selfEsteem: 16,
  },
  {
    id: 'licenciement',
    memory: 'Le jour où on m’a dit de vider mon bureau.',
    kind: 'épreuve', emotion: 'honte', intensity: 74, fade: 0.9, peakAge: 35,
    axes: { confidence: -8, caution: 6, riskTolerance: -6, perseverance: 4 },
    values: { stability: 8, money: 5 },
    fear: { id: 'poverty', amount: 26 },
    selfEsteem: -13,
  },
  {
    id: 'maladieGrave',
    memory: 'L’année où mon corps a lâché.',
    kind: 'épreuve', emotion: 'peur', intensity: 88, fade: 0.6, peakAge: 45,
    axes: { emotionalMaturity: 9, caution: 7, ambition: -5, patience: 6 },
    values: { tranquillity: 10, family: 7, career: -5 },
    fear: { id: 'illness', amount: 38 },
  },
  /* ---------------- La tribune ---------------- */
  {
    id: 'élection',
    memory: 'Le soir où les chiffres sont tombés, et où ils étaient pour moi.',
    kind: 'réussite', emotion: 'fierté', intensity: 84, fade: 0.75, peakAge: 40,
    axes: { confidence: 11, ambition: 8, sociability: 6, competitiveness: 7 },
    values: { power: 12, reputation: 10, status: 8, tranquillity: -6 },
    ambition: { id: 'respect', weight: 24 },
    selfEsteem: 15,
  },
  {
    id: 'échecPolitique',
    memory: 'Une salle qui se vide sans que personne ose me regarder.',
    kind: 'humiliation', emotion: 'honte', intensity: 78, fade: 0.8, peakAge: 40,
    axes: { confidence: -9, perseverance: 5, sociability: -4, caution: 6 },
    values: { power: -4, reputation: 6, tranquillity: 5 },
    fear: { id: 'judgement', amount: 24 },
    selfEsteem: -12,
  },

  /* ---------------- Servir ---------------- */
  // Trois traces distinctes, parce que ces trois moments ne laissent pas la
  // même chose : être pris, revenir abîmé, et quitter la maison.
  {
    id: 'engagement',
    memory: 'Le jour où l’on m’a dit que j’étais pris.',
    kind: 'réussite', emotion: 'fierté', intensity: 74, fade: 0.9, peakAge: 22,
    axes: { perseverance: 8, confidence: 6, courage: 5, independence: -6 },
    values: { solidarity: 12, career: 6, tranquillity: -5, status: 5 },
    ambition: { id: 'respect', weight: 18 },
    selfEsteem: 11,
  },
  {
    id: 'blessureEnMission',
    memory: 'Ce dont je suis revenu, et ce qui n’est pas revenu avec moi.',
    kind: 'épreuve', emotion: 'peur', intensity: 90, fade: 0.55, peakAge: 30,
    axes: {
      emotionalMaturity: 10, caution: 8, courage: 4, optimism: -7, sensitivity: 6,
    },
    values: { tranquillity: 9, family: 8, solidarity: 4 },
    fear: { id: 'illness', amount: 30 },
    selfEsteem: -6,
  },
  {
    id: 'finDeService',
    memory: 'Rendre l’uniforme, et ne plus savoir qui on est le lendemain.',
    kind: 'rupture', emotion: 'nostalgie', intensity: 70, fade: 0.85, peakAge: 45,
    axes: { independence: 7, emotionalMaturity: 5, ambition: -4, patience: 5 },
    values: { tranquillity: 8, family: 6, solidarity: -4 },
    selfEsteem: -3,
  },
  /* ---------------- La couronne ---------------- */
  // Quatre traces, et aucune ne ressemble à celles d'une carrière : entrer
  // dans une maison, monter sur un trône, renoncer, et regarder l'institution
  // disparaître sous soi.
  {
    id: 'entréeÀLaCour',
    memory: 'Le premier soir où l’on m’a appelé autrement que par mon nom.',
    kind: 'réussite', emotion: 'fierté', intensity: 76, fade: 0.85, peakAge: 30,
    axes: { confidence: 8, sociability: 6, independence: -9, caution: 5 },
    values: { status: 14, reputation: 10, tranquillity: -7, solidarity: -4 },
    ambition: { id: 'respect', weight: 20 },
    selfEsteem: 12,
  },
  {
    id: 'accession',
    memory: 'On m’a mis une place sur les épaules, et personne ne m’a demandé.',
    kind: 'rupture', emotion: 'peur', intensity: 92, fade: 0.6, peakAge: 45,
    axes: {
      confidence: 6, perseverance: 9, caution: 8, independence: -14, sensitivity: 5,
    },
    values: { power: 14, status: 12, tranquillity: -14, family: 5 },
    fear: { id: 'judgement', amount: 30 },
    selfEsteem: 9,
  },
  {
    id: 'renoncement',
    memory: 'Le jour où j’ai rendu ce que je n’avais jamais demandé.',
    kind: 'rupture', emotion: 'soulagement', intensity: 78, fade: 0.8, peakAge: 45,
    axes: { independence: 12, confidence: -5, ambition: -8, patience: 6 },
    values: { tranquillity: 14, status: -12, power: -10, family: 6 },
    selfEsteem: -4,
  },
  {
    id: 'abolition',
    memory: 'Ce dont j’étais l’héritier a cessé d’exister de mon vivant.',
    kind: 'perte', emotion: 'honte', intensity: 88, fade: 0.65, peakAge: 50,
    axes: {
      confidence: -11, optimism: -8, emotionalMaturity: 7, independence: 6,
    },
    values: { status: -16, power: -12, tranquillity: 6, solidarity: 5 },
    fear: { id: 'judgement', amount: 26 },
    selfEsteem: -15,
  },
  {
    id: 'injusticeSubie',
    memory: 'Une injustice que personne n’a réparée.',
    kind: 'injustice', emotion: 'colère', intensity: 72, fade: 0.8, peakAge: 20,
    axes: { honesty: 6, aggression: 5, optimism: -5, courage: 4 },
    values: { solidarity: 7, power: 5 },
    selfEsteem: -6,
  },
];

export const EXPERIENCE_MAP: Record<string, ExperienceDef> = Object.fromEntries(
  EXPERIENCES.map((e) => [e.id, e]),
);

export function getExperience(id: string): ExperienceDef | undefined {
  return EXPERIENCE_MAP[id];
}

/**
 * Coefficient d'impact selon l'âge.
 *
 * Un événement marque surtout autour de son âge de référence, et beaucoup
 * moins passé la trentaine : la personnalité se fige lentement.
 */
export function ageWeight(def: ExperienceDef, age: number): number {
  const distance = Math.abs(age - def.peakAge);
  const spread = def.peakAge < 20 ? 10 : 16;
  const proximity = Math.exp(-(distance * distance) / (2 * spread * spread));
  // Plancher : même tard, un événement majeur laisse une trace.
  const plasticity = Math.max(0.25, 1 - Math.max(0, age - 18) / 45);
  return proximity * plasticity;
}
