/**
 * Chaînes de causalité.
 *
 * Le jeu prétend qu'une vie se comprend comme un enchaînement de causes.
 * Cette prétention n'a de valeur que si on peut la vérifier — d'où ce
 * registre : chaque fois qu'un système produit un effet durable (un goût qui
 * naît, une peur qui s'installe, une ambition qui apparaît, un déménagement
 * qui bouleverse tout), il en dépose la trace ici.
 *
 * On peut alors répondre à des questions comme :
 *
 *   « Pourquoi ce personnage aime-t-il l'informatique ? »
 *     – ordinateur familial : influence faible
 *     – grand frère passionné : influence moyenne
 *     – club scientifique : influence forte
 *
 *   « Pourquoi sa confiance est-elle basse ? »
 *     – harcèlement à 12 ans
 *     – plusieurs échecs scolaires
 *     – faible soutien parental
 *
 * Le registre est plafonné : c'est un outil de compréhension, pas un journal
 * exhaustif qui ferait exploser la taille de la sauvegarde.
 */

import type { GameState } from '../engine/types.ts';
import { INTEREST_MAP } from '../data/interests.ts';
import { FEAR_MAP } from '../data/fears.ts';
import { HABIT_MAP } from '../data/habits.ts';
import { AMBITION_MAP } from '../data/ambitions.ts';

/**
 * Un effet de contexte : quelque chose a agi sur quelque chose d'autre.
 */
export interface ContextEffect {
  /** D'où vient l'influence. */
  source: string;
  /** Ce qu'elle a touché. */
  target: string;
  /** Intensité relative, typiquement 0-1 mais non borné. */
  strength: number;
  /** Formulation lisible. */
  reason: string;
  /** Âge du personnage au moment de l'effet. */
  age: number;
  /** Durée en années, si l'effet s'étale. */
  duration?: number;
}

const MAX_EFFECTS = 400;

/** Dépose une trace dans le registre. */
export function record(state: GameState, effect: ContextEffect): void {
  state.causality ??= [];
  state.causality.push(effect);
  if (state.causality.length > MAX_EFFECTS) {
    // On garde les influences les plus fortes plutôt que les plus récentes :
    // ce qui explique une vie, ce sont les grands basculements.
    state.causality.sort((a, b) => b.strength - a.strength);
    state.causality.length = MAX_EFFECTS;
    state.causality.sort((a, b) => a.age - b.age);
  }
}

/** Qualifie une intensité en mots plutôt qu'en nombre. */
export function strengthLabel(strength: number): string {
  if (strength >= 0.9) return 'influence déterminante';
  if (strength >= 0.6) return 'influence forte';
  if (strength >= 0.32) return 'influence moyenne';
  if (strength >= 0.12) return 'influence faible';
  return 'influence marginale';
}

/**
 * Toutes les causes ayant agi sur une cible, de la plus forte à la plus
 * faible. La cible est un identifiant du type `intérêt:informatique`,
 * `peur:rejection`, `personnalité`, `ambition:richesse`.
 */
export function causesOf(state: GameState, target: string): ContextEffect[] {
  return (state.causality ?? [])
    .filter((e) => e.target === target)
    .sort((a, b) => b.strength - a.strength);
}

/** Cibles distinctes présentes dans le registre. */
export function knownTargets(state: GameState): string[] {
  const set = new Set<string>();
  for (const effect of state.causality ?? []) set.add(effect.target);
  return [...set].sort();
}

/**
 * Explication lisible d'une trajectoire.
 *
 * Renvoie des lignes prêtes à afficher, avec l'intensité exprimée en mots.
 * C'est l'outil demandé au §64 : un développeur — ou un joueur curieux —
 * peut demander au jeu de justifier ce qu'il a produit.
 */
export function explainTrajectory(state: GameState, target: string): {
  title: string;
  lines: { text: string; label: string; age: number }[];
} {
  const causes = causesOf(state, target);
  return {
    title: humanTarget(target),
    lines: causes.map((c) => ({
      text: c.reason || c.source,
      label: strengthLabel(c.strength),
      age: c.age,
    })),
  };
}

/**
 * Traduit un identifiant de cible en question lisible.
 *
 * Les identifiants internes (`poverty`, `théatre`) ne doivent jamais
 * apparaître : on passe systématiquement par les libellés du contenu.
 */
export function humanTarget(target: string): string {
  const [kind, id] = target.split(':');
  // La question est posée après le libellé plutôt qu'autour de lui : c'est la
  // seule tournure qui reste correcte quels que soient le genre et le nombre
  // du contenu, sans avoir à décliner un article pour chaque entrée.
  const label = (map: Record<string, { label: string }>) => map[id]?.label ?? id;
  switch (kind) {
    case 'intérêt': return `${label(INTEREST_MAP)} : d’où lui vient ce goût ?`;
    case 'peur': return `${label(FEAR_MAP)} : d’où vient-elle ?`;
    case 'habitude': return `${label(HABIT_MAP)} : comment s’est-elle installée ?`;
    case 'ambition': return `${label(AMBITION_MAP)} : pourquoi y tient-il ?`;
    case 'personnalité': return 'Qu’est-ce qui a façonné ce caractère ?';
    case 'lieu': return 'Pourquoi vivre ici ?';
    default: return `Pourquoi : ${target}`;
  }
}

/**
 * Résumé général d'une vie : les influences les plus fortes, tous domaines
 * confondus. Sert d'entrée à l'écran de débogage de trajectoire.
 */
export function lifeInfluences(state: GameState, limit = 12): ContextEffect[] {
  return [...(state.causality ?? [])]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, limit)
    .sort((a, b) => a.age - b.age);
}
