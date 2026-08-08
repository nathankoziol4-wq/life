/**
 * Contexte de simulation partagé par tous les systèmes.
 *
 * Les systèmes ne connaissent ni React, ni le stockage : ils reçoivent un
 * `Ctx`, modifient l'état et écrivent dans la timeline. Le moteur est donc
 * entièrement testable sans interface (cf. §24).
 */

import { Rng } from './rng.ts';
import type { GameState, Person, TimelineEntry, TimelineKind } from './types.ts';

export interface Ctx {
  state: GameState;
  rng: Rng;
  /** Ajoute une ligne à la timeline de l'année en cours. */
  log: (kind: TimelineKind, text: string, tone?: TimelineEntry['tone']) => void;
  /** Entrées produites depuis la création du contexte. */
  entries: TimelineEntry[];
  /** Génère un identifiant unique et stable dans la sauvegarde. */
  id: (prefix: string) => string;
}

export function createCtx(state: GameState): Ctx {
  const rng = new Rng(state);
  const entries: TimelineEntry[] = [];
  const ctx: Ctx = {
    state,
    rng,
    entries,
    id: (prefix: string) => {
      state.idCounter += 1;
      return `${prefix}_${state.idCounter}`;
    },
    log: (kind, text, tone = 'neutral') => {
      const entry: TimelineEntry = {
        id: `t_${(state.idCounter += 1)}`,
        year: state.year,
        age: state.player.age,
        kind,
        text,
        tone,
      };
      state.timeline.push(entry);
      entries.push(entry);
    },
  };
  return ctx;
}

/** Accès rapide à un PNJ, avec garde. */
export function person(state: GameState, id: string | null | undefined): Person | null {
  if (!id) return null;
  return state.npcs[id] ?? null;
}

/** Tous les PNJ vivants correspondant à un ou plusieurs types de lien. */
export function peopleByRelation(state: GameState, kinds: Person['relation'][]): Person[] {
  return Object.values(state.npcs).filter((p) => p.alive && kinds.includes(p.relation));
}

/** Nom complet lisible. */
export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`;
}

/** Libellé français du lien de parenté. */
export const RELATION_LABELS: Record<Person['relation'], string> = {
  father: 'Père',
  mother: 'Mère',
  stepfather: 'Beau-père',
  stepmother: 'Belle-mère',
  grandfather: 'Grand-père',
  grandmother: 'Grand-mère',
  uncle: 'Oncle',
  aunt: 'Tante',
  cousin: 'Cousin',
  brother: 'Frère',
  sister: 'Sœur',
  son: 'Fils',
  daughter: 'Fille',
  partner: 'Partenaire',
  spouse: 'Conjoint',
  ex: 'Ex',
  crush: 'Béguin',
  friend: 'Ami',
  bestFriend: 'Meilleur ami',
  coworker: 'Collègue',
  boss: 'Supérieur',
  classmate: 'Camarade',
  inmate: 'Codétenu',
  lawyer: 'Avocat',
  acquaintance: 'Connaissance',
};

/** Ordre d'affichage dans l'écran Relations. */
export const RELATION_ORDER: Person['relation'][] = [
  'spouse', 'partner', 'crush', 'son', 'daughter', 'mother', 'father',
  'stepmother', 'stepfather', 'sister', 'brother',
  'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin',
  'bestFriend', 'friend',
  'ex', 'boss', 'coworker', 'classmate', 'inmate', 'lawyer', 'acquaintance',
];
