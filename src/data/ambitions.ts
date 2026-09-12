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

/* ------------------------------------------------------------------ */
/* Se fixer un but soi-même                                            */
/* ------------------------------------------------------------------ */

/**
 * **Ce qui manquait.** Le catalogue disait, feuille `Vie/Personnalité/
 * Ambitions` : « affichées et alimentées, mais le joueur ne s'en fixe
 * aucune ». C'était exact. Les ambitions naissent des valeurs, leur poids
 * suit les valeurs, elles décident de la satisfaction de toute une vie — et
 * le joueur n'a jamais son mot à dire sur ce qu'il veut.
 *
 * Mesuré sur cent vingt vies entières : 98 % finissent avec au moins une
 * ambition, quatre en médiane — c'est-à-dire **le plafond** — et 1,81
 * réalisée. Le système est donc parfaitement visible et entièrement subi.
 *
 * Trois choses font de la déclaration une décision et non un vœu.
 *
 * **1. Elle prend une place.** On en tient quatre au plus, et l'on y est déjà.
 * S'en fixer une demande donc d'en laisser une autre.
 *
 * **2. Elle peut ne pas te ressembler.** Le poids d'une ambition dérive vers
 * ce que valent tes valeurs pour elle (`advanceAmbitions`). Vouloir quelque
 * chose que l'on n'est pas fait pour vouloir, c'est la voir s'éteindre — sauf
 * à réellement avancer dessus. Ce mécanisme existait déjà ; il fallait juste
 * qu'on puisse s'y frotter volontairement.
 *
 * **3. La laisser coûte.** C'est le regret que le fichier `psyche.ts`
 * promettait depuis toujours — « une ambition abandonnée laisse un regret, qui
 * pèse discrètement sur le bonheur pendant des années » — et qui n'existait
 * nulle part : la ligne se contentait de filtrer le tableau.
 */

/** Combien d'ambitions on peut tenir à la fois. */
export const CAP = 4;

/** L'âge à partir duquel on peut décider de ce qu'on veut. */
export const DECIDE_FROM = 14;

/**
 * Le poids d'une ambition qu'on s'est fixée.
 *
 * Haut : on vient de décider. Mais la dérive vers l'accord avec ses valeurs
 * s'applique quand même, et c'est tout l'intérêt — une ambition déclarée
 * contre soi-même redescend, une ambition déclarée juste tient.
 */
export const DECLARED = 78;

/**
 * Ce que pèse le regret d'une ambition laissée.
 *
 * Au-dessus de 45, seuil à partir duquel un souvenir peut revenir tout seul
 * et peser sur l'humeur (`psyche.ts#advanceMemories`). C'est exactement ce
 * qu'on veut d'un regret : pas une punition immédiate, quelque chose qui
 * remonte de temps en temps, pendant des années.
 */
export const REGRET = 52;

/** Ce qu'un regret perd par an : lentement, pour qu'il dure. */
export const REGRET_FADE = 0.7;

/** Sous ce poids, une ambition qu'on ne nourrit plus s'éteint. */
export const FADED = 12;

/**
 * Ce qui reste d'une ambition sur laquelle on n'avance pas.
 *
 * **Mesuré : l'accord entre une vie et une ambition va de 15,9 à 46,5 et ne
 * descend jamais sous le seuil d'extinction de 12.** Les valeurs seules ne
 * pouvaient donc éteindre aucune ambition, et le filtre qui les retire ne
 * retirait rien. Ce qui manquait n'est pas dans les valeurs : c'est
 * l'inaction. À progression nulle, la cible tombe à cette fraction de
 * l'accord — sous le seuil — et l'ambition finit par s'éteindre.
 *
 * **Calibré, et non choisi.** À 0,3, un but resté à progression nulle pendant
 * quarante-cinq ans pesait encore 15 en moyenne, pour un seuil à 12 : il
 * survivait 88 % du temps, et son sort tenait au hasard de l'accord plutôt
 * qu'à ce qu'on en avait fait.
 */
export const NEGLECTED = 0.2;
