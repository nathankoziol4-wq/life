/**
 * Habitudes.
 *
 * Une habitude n'est pas une action ponctuelle : c'est quelque chose qu'on
 * fait sans y penser, qui consomme du temps chaque semaine, qui rapporte un
 * peu de plaisir, et dont on se défait difficilement. C'est le lien concret
 * entre « qui on est » et « ce que deviennent les statistiques » : personne
 * ne décide d'être en forme, on décide de courir le dimanche pendant dix ans.
 *
 * Le temps est la ressource limitante (`systems/timeBudget.ts`) : on ne peut
 * pas cumuler quinze habitudes sans que quelque chose cède.
 */

import type { StatKey } from '../engine/types.ts';
import type { PersonalityAxes, Values } from '../engine/psyche.ts';

export interface HabitDef {
  id: string;
  label: string;
  emoji: string;
  category: 'santé' | 'social' | 'esprit' | 'plaisir' | 'risque' | 'quotidien';
  /** Occurrences par an d'une pratique installée. */
  baseFrequency: number;
  /** Heures consommées par occurrence. */
  hoursEach: number;
  /** Coût annuel, en part du revenu médian national, à fréquence de base. */
  cost: number;
  /** Effets annuels à fréquence de base. */
  effects: Partial<Record<StatKey, number>>;
  /** Traits qui rendent l'habitude probable. */
  traits: Partial<Record<keyof PersonalityAxes, number>>;
  /** Valeurs qui la rendent probable. */
  values: Partial<Record<keyof Values, number>>;
  /** Intérêts qui la déclenchent naturellement. */
  interests?: string[];
  /** Difficulté d'abandon de base, 0-100. */
  stickiness: number;
  /** Plaisir retiré, 0-100. */
  pleasure: number;
  /** Équipement ou lieu nécessaire. */
  needs?: string;
  description: string;
}

export const HABITS: HabitDef[] = [
  /* ---------------- Santé ---------------- */
  {
    id: 'sportRégulier', label: 'Sport régulier', emoji: '🏃',
    category: 'santé', baseFrequency: 120, hoursEach: 1.2, cost: 0.012,
    effects: { fitness: 7, health: 4, stress: -6, happiness: 2 },
    traits: { discipline: 0.6, perseverance: 0.5, competitiveness: 0.2 },
    values: { achievement: 0.3, tranquillity: 0.2 },
    interests: ['course', 'football', 'natation', 'artsMartiaux'],
    stickiness: 55, pleasure: 60,
    description: 'Trois fois par semaine, qu’il pleuve ou non.',
  },
  {
    id: 'marche', label: 'Marcher partout', emoji: '🚶',
    category: 'santé', baseFrequency: 300, hoursEach: 0.4, cost: 0,
    effects: { fitness: 3, health: 2, stress: -3 },
    traits: { patience: 0.3, independence: 0.3 },
    values: { tranquillity: 0.4 },
    stickiness: 70, pleasure: 45,
    description: 'Refuser la voiture pour les petits trajets, sans en faire une religion.',
  },
  {
    id: 'coucherTard', label: 'Se coucher tard', emoji: '🌙',
    category: 'risque', baseFrequency: 200, hoursEach: 0, cost: 0,
    effects: { health: -3, stress: 3, intelligence: -1 },
    traits: { impulsivity: 0.5, spontaneity: 0.4, discipline: -0.5 },
    values: { freedom: 0.3 },
    stickiness: 65, pleasure: 55,
    description: 'Les meilleures heures sont celles où plus personne ne demande rien.',
  },
  {
    id: 'malManger', label: 'Manger n’importe comment', emoji: '🍟',
    category: 'risque', baseFrequency: 250, hoursEach: 0, cost: 0.02,
    effects: { health: -4, fitness: -4, looks: -2, happiness: 1 },
    traits: { discipline: -0.6, impulsivity: 0.4, organisation: -0.4 },
    values: {},
    stickiness: 60, pleasure: 50,
    description: 'Ce qui va vite, quand il n’y a ni temps ni envie.',
  },

  /* ---------------- Esprit ---------------- */
  {
    id: 'lireSouvent', label: 'Lire régulièrement', emoji: '📖',
    category: 'esprit', baseFrequency: 100, hoursEach: 1, cost: 0.006,
    effects: { intelligence: 4, stress: -3, happiness: 2 },
    traits: { curiosity: 0.6, patience: 0.4 },
    values: { knowledge: 0.7 },
    interests: ['lecture', 'histoire', 'écriture'],
    stickiness: 60, pleasure: 65,
    description: 'Un livre en cours en permanence, jamais le même deux fois.',
  },
  {
    id: 'apprendre', label: 'Apprendre par soi-même', emoji: '🧠',
    category: 'esprit', baseFrequency: 80, hoursEach: 1.5, cost: 0.008,
    effects: { intelligence: 5, discipline: 2 } as Partial<Record<StatKey, number>>,
    traits: { curiosity: 0.7, discipline: 0.5, ambition: 0.3 },
    values: { knowledge: 0.7, career: 0.3 },
    interests: ['informatique', 'sciences', 'finance', 'échecs'],
    stickiness: 45, pleasure: 55,
    description: 'Des tutoriels, des cours du soir, des essais ratés qui finissent par marcher.',
  },
  {
    id: 'créer', label: 'Créer quelque chose', emoji: '🎨',
    category: 'esprit', baseFrequency: 90, hoursEach: 1.5, cost: 0.01,
    effects: { happiness: 5, stress: -4, intelligence: 1 },
    traits: { creativity: 0.8, perseverance: 0.3 },
    values: { creativity: 0.8 },
    interests: ['musique', 'dessin', 'écriture'],
    stickiness: 50, pleasure: 75,
    description: 'Faire une chose qui n’existait pas, sans se demander à quoi elle sert.',
  },

  /* ---------------- Social ---------------- */
  {
    id: 'voirDesAmis', label: 'Voir ses amis', emoji: '🫂',
    category: 'social', baseFrequency: 60, hoursEach: 3, cost: 0.02,
    effects: { happiness: 6, stress: -5, reputation: 2 },
    traits: { extraversion: 0.6, sociability: 0.7, loyalty: 0.3 },
    values: { friendship: 0.8 },
    stickiness: 55, pleasure: 80,
    description: 'Les mêmes personnes, souvent, sans occasion particulière.',
  },
  {
    id: 'sortirLeSoir', label: 'Sortir le soir', emoji: '🌃',
    category: 'plaisir', baseFrequency: 40, hoursEach: 5, cost: 0.045,
    effects: { happiness: 5, health: -2, reputation: 2, stress: -3 },
    traits: { extraversion: 0.7, spontaneity: 0.5, impulsivity: 0.3 },
    values: { friendship: 0.4, adventure: 0.4 },
    stickiness: 45, pleasure: 78,
    description: 'Rentrer trop tard et le regretter le lendemain, sans jamais retenir la leçon.',
  },
  {
    id: 'repasFamille', label: 'Manger en famille', emoji: '🍽️',
    category: 'quotidien', baseFrequency: 250, hoursEach: 0.8, cost: 0,
    effects: { happiness: 4, stress: -3, health: 2 },
    traits: { loyalty: 0.4, patience: 0.3 },
    values: { family: 0.8 },
    stickiness: 75, pleasure: 60,
    description: 'La table, tous les soirs, téléphone posé ailleurs.',
  },
  {
    id: 'réseaux', label: 'Traîner sur les réseaux', emoji: '📱',
    category: 'plaisir', baseFrequency: 340, hoursEach: 1.4, cost: 0,
    effects: { happiness: -2, stress: 4, reputation: 2, intelligence: -1 },
    traits: { extraversion: 0.3, impulsivity: 0.5, sensitivity: 0.3, discipline: -0.4 },
    values: { reputation: 0.5, status: 0.4 },
    interests: ['réseauxSociaux'],
    stickiness: 80, pleasure: 45, needs: 'téléphonePersonnel',
    description: 'Deux heures qui passent sans qu’on sache où elles sont allées.',
  },

  /* ---------------- Quotidien et risque ---------------- */
  {
    id: 'économiser', label: 'Mettre de côté', emoji: '🏦',
    category: 'quotidien', baseFrequency: 12, hoursEach: 0.3, cost: 0,
    effects: { stress: -2 },
    traits: { discipline: 0.7, caution: 0.5, organisation: 0.4 },
    values: { stability: 0.7, money: 0.5 },
    interests: ['finance'],
    stickiness: 55, pleasure: 35,
    description: 'Une somme fixe, chaque mois, avant tout le reste.',
  },
  {
    id: 'dépenser', label: 'Dépenser sans compter', emoji: '💸',
    category: 'risque', baseFrequency: 60, hoursEach: 0.8, cost: 0.06,
    effects: { happiness: 4, stress: 2 },
    traits: { impulsivity: 0.7, spontaneity: 0.4, discipline: -0.6 },
    values: { status: 0.4, adventure: 0.2 },
    stickiness: 60, pleasure: 65,
    description: 'Le plaisir d’acheter, qui dure exactement jusqu’au relevé.',
  },
  {
    id: 'fumer', label: 'Fumer', emoji: '🚬',
    category: 'risque', baseFrequency: 350, hoursEach: 0.2, cost: 0.05,
    effects: { health: -6, fitness: -4, looks: -2, addiction: 6, stress: -3 },
    traits: { impulsivity: 0.5, sensitivity: 0.3, discipline: -0.4 },
    values: {},
    stickiness: 88, pleasure: 55,
    description: 'Commencé pour faire comme les autres, continué pour soi.',
  },
  {
    id: 'boire', label: 'Boire régulièrement', emoji: '🍷',
    category: 'risque', baseFrequency: 150, hoursEach: 0.5, cost: 0.03,
    effects: { health: -4, addiction: 5, happiness: 2, stress: -4 },
    traits: { impulsivity: 0.4, extraversion: 0.3, emotionalMaturity: -0.4 },
    values: { friendship: 0.2 },
    stickiness: 75, pleasure: 60,
    description: 'Un verre pour décompresser, qui devient deux, puis une habitude.',
  },
  {
    id: 'ranger', label: 'Tenir sa vie en ordre', emoji: '🧹',
    category: 'quotidien', baseFrequency: 150, hoursEach: 0.6, cost: 0,
    effects: { stress: -4, discipline: 2, happiness: 1 } as Partial<Record<StatKey, number>>,
    traits: { organisation: 0.8, discipline: 0.5 },
    values: { stability: 0.4, tranquillity: 0.4 },
    stickiness: 60, pleasure: 40,
    description: 'Rien ne traîne, tout se retrouve, et l’esprit suit.',
  },
];

export const HABIT_MAP: Record<string, HabitDef> = Object.fromEntries(
  HABITS.map((h) => [h.id, h]),
);

export function getHabit(id: string): HabitDef | undefined {
  return HABIT_MAP[id];
}
