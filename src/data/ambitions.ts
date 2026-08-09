/**
 * Ambitions.
 *
 * Ce que la personne veut faire de sa vie — plusieurs choses à la fois, avec
 * des poids différents, et pas forcément dès le départ. Une ambition apparaît
 * quand quelque chose la fait naître : voir ses parents compter chaque euro
 * fait naître le besoin de sécurité financière ; un professeur marquant fait
 * naître l'envie d'enseigner.
 *
 * Les ambitions servent à deux choses. Elles orientent les décisions, et
 * surtout elles décident de la **satisfaction** : une vie réussie selon les
 * critères du voisin ne rend pas heureux si elle passe à côté de ce qu'on
 * voulait vraiment.
 */

import type { GameState } from '../engine/types.ts';
import type { Values } from '../engine/psyche.ts';

export interface AmbitionDef {
  id: string;
  label: string;
  emoji: string;
  /** Valeurs qui font naître et entretiennent cette ambition. */
  values: Partial<Record<keyof Values, number>>;
  /** Âge à partir duquel elle peut apparaître. */
  minAge: number;
  /** L'ambition est-elle atteinte ? */
  fulfilled: (state: GameState) => boolean;
  /** Progression 0-1, pour l'affichage et la satisfaction partielle. */
  progress: (state: GameState) => number;
  description: string;
}

/** Revenu de référence pour juger d'une réussite matérielle. */
function reference(state: GameState): number {
  return 34000 * (state.world.inflation || 1);
}

export const AMBITIONS: AmbitionDef[] = [
  {
    id: 'richesse', label: 'Devenir riche', emoji: '💰',
    values: { money: 0.8, status: 0.4, power: 0.3 },
    minAge: 12,
    fulfilled: (s) => netWorthOf(s) > reference(s) * 25,
    progress: (s) => clamp01(netWorthOf(s) / (reference(s) * 25)),
    description: 'Ne plus jamais avoir à regarder le prix.',
  },
  {
    id: 'sécurité', label: 'Ne jamais manquer', emoji: '🛟',
    values: { stability: 0.8, money: 0.4, tranquillity: 0.3 },
    minAge: 10,
    fulfilled: (s) => netWorthOf(s) > reference(s) * 2 && s.player.loans.length === 0,
    progress: (s) => clamp01(netWorthOf(s) / (reference(s) * 2)),
    description: 'De quoi tenir un an sans rien demander à personne.',
  },
  {
    id: 'famille', label: 'Fonder une famille', emoji: '👨‍👩‍👧',
    values: { family: 0.9, love: 0.5, stability: 0.3 },
    minAge: 14,
    fulfilled: (s) => Object.values(s.npcs).some((p) => p.alive && (p.relation === 'son' || p.relation === 'daughter')),
    progress: (s) => {
      const kids = Object.values(s.npcs).filter((p) => p.alive && (p.relation === 'son' || p.relation === 'daughter')).length;
      const paired = Object.values(s.npcs).some((p) => p.alive && (p.relation === 'spouse' || p.relation === 'partner'));
      return clamp01((paired ? 0.5 : 0) + kids * 0.25);
    },
    description: 'Une maison où quelqu’un attend.',
  },
  {
    id: 'carrière', label: 'Réussir professionnellement', emoji: '🏅',
    values: { career: 0.8, achievement: 0.6, status: 0.3 },
    minAge: 14,
    fulfilled: (s) => (s.player.job?.level ?? 0) >= 3,
    progress: (s) => clamp01((s.player.job?.level ?? 0) / 3),
    description: 'Arriver quelque part, et que ça se voie sur la carte de visite.',
  },
  {
    id: 'propriétaire', label: 'Devenir propriétaire', emoji: '🔑',
    values: { stability: 0.7, money: 0.3, family: 0.3 },
    minAge: 16,
    fulfilled: (s) => s.player.properties.some((p) => p.isResidence),
    progress: (s) => (s.player.properties.length > 0 ? 1 : clamp01(s.player.money / (reference(s) * 4))),
    description: 'Des murs à soi, et plus personne pour décider quand partir.',
  },
  {
    id: 'célébrité', label: 'Être connu', emoji: '🌟',
    values: { reputation: 0.8, status: 0.6, achievement: 0.3 },
    minAge: 12,
    fulfilled: (s) => s.player.followers > 250_000,
    progress: (s) => clamp01(s.player.followers / 250_000),
    description: 'Que des inconnus sachent qui on est.',
  },
  {
    id: 'respect', label: 'Être respecté', emoji: '🎖️',
    values: { reputation: 0.6, achievement: 0.4, power: 0.3 },
    minAge: 12,
    fulfilled: (s) => s.player.stats.reputation > 80,
    progress: (s) => clamp01(s.player.stats.reputation / 80),
    description: 'Qu’on écoute quand on parle, sans avoir à hausser la voix.',
  },
  {
    id: 'savoir', label: 'Apprendre toute sa vie', emoji: '🎓',
    values: { knowledge: 0.9, creativity: 0.3 },
    minAge: 12,
    fulfilled: (s) => s.player.education.level >= 3,
    progress: (s) => clamp01(s.player.education.level / 3),
    description: 'Comprendre, pour le plaisir de comprendre.',
  },
  {
    id: 'voyager', label: 'Voir le monde', emoji: '🌍',
    values: { adventure: 0.9, freedom: 0.5, knowledge: 0.3 },
    minAge: 12,
    fulfilled: (s) => Number(s.player.flags.tripsTaken ?? 0) >= 8,
    progress: (s) => clamp01(Number(s.player.flags.tripsTaken ?? 0) / 8),
    description: 'Partir souvent, et revenir chaque fois un peu différent.',
  },
  {
    id: 'tranquillité', label: 'Vivre tranquillement', emoji: '🌿',
    values: { tranquillity: 0.9, stability: 0.4, freedom: 0.3 },
    minAge: 16,
    fulfilled: (s) => s.player.stats.stress < 25 && s.player.stats.happiness > 65,
    progress: (s) => clamp01((100 - s.player.stats.stress) / 100 * (s.player.stats.happiness / 70)),
    description: 'Assez pour vivre, et le temps d’en profiter.',
  },
  {
    id: 'aider', label: 'Être utile aux autres', emoji: '🤲',
    values: { solidarity: 0.9, friendship: 0.3, family: 0.2 },
    minAge: 12,
    fulfilled: (s) => s.player.stats.karma > 80,
    progress: (s) => clamp01(s.player.stats.karma / 80),
    description: 'Laisser derrière soi des gens qui vont mieux.',
  },
  {
    id: 'indépendance', label: 'Ne dépendre de personne', emoji: '🕊️',
    values: { independence: 0.9, freedom: 0.6 },
    minAge: 14,
    fulfilled: (s) => s.player.age >= 25 && s.player.money > reference(s) && !s.player.loans.length,
    progress: (s) => clamp01(s.player.money / reference(s)),
    description: 'Ne rien devoir, à personne, jamais.',
  },
  {
    id: 'créer', label: 'Créer une œuvre', emoji: '🎨',
    values: { creativity: 0.9, reputation: 0.2 },
    minAge: 12,
    fulfilled: (s) => Number(s.player.flags.worksCreated ?? 0) >= 3,
    progress: (s) => clamp01(Number(s.player.flags.worksCreated ?? 0) / 3),
    description: 'Laisser quelque chose qui n’existait pas avant.',
  },
];

export const AMBITION_MAP: Record<string, AmbitionDef> = Object.fromEntries(
  AMBITIONS.map((a) => [a.id, a]),
);

export function getAmbition(id: string): AmbitionDef | undefined {
  return AMBITION_MAP[id];
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

/** Patrimoine net, calculé ici pour éviter une dépendance croisée. */
function netWorthOf(state: GameState): number {
  const p = state.player;
  const properties = p.properties.reduce((s, x) => s + x.value - x.mortgageBalance, 0);
  const vehicles = p.vehicles.reduce((s, x) => s + x.value, 0);
  const valuables = p.valuables.reduce((s, x) => s + x.value, 0);
  const debts = p.loans.reduce((s, l) => s + l.balance, 0);
  return p.money + properties + vehicles + valuables - debts;
}
