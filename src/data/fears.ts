/**
 * Peurs.
 *
 * Une peur n'est pas un trait de départ : elle naît d'une expérience, elle a
 * une intensité, elle s'atténue si rien ne la ravive, et elle coûte quelque
 * chose de précis. Une peur qui ne modifierait aucune décision ne serait
 * qu'une ligne dans une fiche de personnage.
 *
 * Chaque peur déclare donc ce qu'elle **empêche** (`inhibits`) et ce qu'elle
 * **pousse à faire** (`drives`) : la peur de la pauvreté freine la prise de
 * risque professionnelle mais renforce l'épargne, la peur du rejet freine
 * l'approche amoureuse mais renforce le besoin d'approbation.
 */

import type { PersonalityAxes, FearId } from '../engine/psyche.ts';

export interface FearDef {
  id: FearId;
  label: string;
  emoji: string;
  /** Ce que la peur bloque, en multiplicateurs appliqués aux contextes. */
  inhibits: string[];
  /** Ce qu'elle renforce. */
  drives: string[];
  /** Traits qui rendent la personne vulnérable à cette peur. */
  vulnerability: Partial<Record<keyof PersonalityAxes, number>>;
  /** Vitesse d'atténuation annuelle si rien ne la ravive. */
  fade: number;
  /** Peut-elle exister dès l'enfance ? */
  early: boolean;
  description: string;
}

export const FEARS: FearDef[] = [
  {
    id: 'rejection', label: 'Peur du rejet', emoji: '🚪',
    inhibits: ['aborder quelqu’un', 'déclarer ses sentiments', 'demander une augmentation'],
    drives: ['besoin d’approbation', 'évitement des conflits'],
    vulnerability: { sensitivity: 0.6, confidence: -0.6, extraversion: -0.3 },
    fade: 2.5, early: true,
    description: 'Ne pas demander, pour ne pas s’entendre dire non.',
  },
  {
    id: 'failure', label: 'Peur de l’échec', emoji: '📉',
    inhibits: ['tenter une filière difficile', 'changer de métier', 'entreprendre'],
    drives: ['travail acharné', 'perfectionnisme'],
    vulnerability: { ambition: 0.4, confidence: -0.5, emotionalMaturity: -0.3 },
    fade: 2, early: true,
    description: 'Préférer ne pas essayer plutôt que de rater devant témoins.',
  },
  {
    id: 'abandonment', label: 'Peur de l’abandon', emoji: '💔',
    inhibits: ['rompre une relation qui va mal', 'partir vivre ailleurs'],
    drives: ['jalousie', 'attachement intense'],
    vulnerability: { sensitivity: 0.6, jealousy: 0.5, independence: -0.5 },
    fade: 1.2, early: true,
    description: 'S’accrocher, parce que la solitude fait plus peur que le mal qu’on subit.',
  },
  {
    id: 'loneliness', label: 'Peur de la solitude', emoji: '🕳️',
    inhibits: ['vivre seul', 'refuser une invitation'],
    drives: ['sociabilité forcée', 'relations de compromis'],
    vulnerability: { extraversion: 0.4, independence: -0.6, sensitivity: 0.3 },
    fade: 2, early: true,
    description: 'Remplir le silence avec n’importe qui plutôt que de l’écouter.',
  },
  {
    id: 'conflict', label: 'Peur du conflit', emoji: '🤐',
    inhibits: ['dire non', 'négocier', 'défendre son territoire'],
    drives: ['évitement', 'accommodement'],
    vulnerability: { aggression: -0.6, confidence: -0.4, empathy: 0.3 },
    fade: 2.5, early: true,
    description: 'Céder tout de suite pour que la tension retombe.',
  },
  {
    id: 'poverty', label: 'Peur de manquer', emoji: '🪙',
    inhibits: ['quitter un emploi stable', 'investir', 'dépenser pour soi'],
    drives: ['épargne', 'travail', 'sécurité avant tout'],
    vulnerability: { caution: 0.5, riskTolerance: -0.5 },
    fade: 1.5, early: true,
    description: 'Avoir vu le compte à zéro une fois, et ne plus jamais l’oublier.',
  },
  {
    id: 'publicSpeaking', label: 'Peur de parler en public', emoji: '🎤',
    inhibits: ['prendre la parole', 'briguer un poste exposé', 'monter sur scène'],
    drives: ['préparation excessive'],
    vulnerability: { extraversion: -0.6, confidence: -0.5 },
    fade: 3, early: true,
    description: 'Savoir exactement quoi dire, et que rien ne sorte.',
  },
  {
    id: 'change', label: 'Peur du changement', emoji: '🧊',
    inhibits: ['déménager', 'changer d’école', 'changer de carrière'],
    drives: ['routines', 'attachement au connu'],
    vulnerability: { adaptability: -0.7, caution: 0.4 },
    fade: 2.5, early: true,
    description: 'Ce qu’on connaît, même médiocre, rassure plus que l’inconnu.',
  },
  {
    id: 'loss', label: 'Peur de perdre ses proches', emoji: '🕯️',
    inhibits: ['s’éloigner de sa famille', 'partir à l’étranger'],
    drives: ['attention aux proches', 'anxiété'],
    vulnerability: { sensitivity: 0.6, empathy: 0.4 },
    fade: 1.5, early: false,
    description: 'Appeler pour vérifier, sans savoir quoi dire ensuite.',
  },
  {
    id: 'mediocrity', label: 'Peur de ne pas réussir', emoji: '🏔️',
    inhibits: ['se contenter d’un poste modeste', 'ralentir'],
    drives: ['ambition', 'heures supplémentaires', 'comparaison permanente'],
    vulnerability: { ambition: 0.7, competitiveness: 0.5, emotionalMaturity: -0.3 },
    fade: 1.8, early: false,
    description: 'La certitude qu’une vie ordinaire serait une vie ratée.',
  },
  {
    id: 'judgement', label: 'Peur du jugement', emoji: '👁️',
    inhibits: ['s’habiller comme on veut', 'défendre une opinion', 'assumer un choix atypique'],
    drives: ['souci de l’image', 'conformité'],
    vulnerability: { sensitivity: 0.5, confidence: -0.5 },
    fade: 2.5, early: true,
    description: 'Se demander avant chaque geste ce que les autres en penseront.',
  },
  {
    id: 'illness', label: 'Peur de la maladie', emoji: '🩺',
    inhibits: ['ignorer un symptôme', 'négliger sa santé'],
    drives: ['consultations', 'hygiène de vie', 'anxiété'],
    vulnerability: { sensitivity: 0.4, caution: 0.5 },
    fade: 2, early: false,
    description: 'Guetter son corps, et trouver toujours quelque chose.',
  },
  {
    id: 'commitment', label: 'Peur de s’engager', emoji: '🔗',
    inhibits: ['se marier', 'acheter un logement', 'avoir un enfant'],
    drives: ['indépendance', 'relations courtes'],
    vulnerability: { independence: 0.6, loyalty: -0.4, adaptability: 0.2 },
    fade: 2.2, early: false,
    description: 'Aimer sans fermer aucune porte, et les voir toutes se fermer seules.',
  },
];

export const FEAR_MAP: Record<string, FearDef> = Object.fromEntries(
  FEARS.map((f) => [f.id, f]),
);

export function getFear(id: FearId): FearDef | undefined {
  return FEAR_MAP[id];
}
