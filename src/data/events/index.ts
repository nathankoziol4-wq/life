/**
 * Agrégation de la bibliothèque d'événements.
 * Pour ajouter du contenu : créer un fichier, l'importer, l'ajouter au tableau.
 */

import { CHILDHOOD_EVENTS } from './childhood.ts';
import { TEEN_EVENTS } from './teen.ts';
import { ADULT_EVENTS } from './adult.ts';
import { RELATIONSHIP_EVENTS } from './relationships.ts';
import { MISC_EVENTS, PRISON_EVENTS, SENIOR_EVENTS } from './misc.ts';
import type { GameEvent } from './types.ts';

export * from './types.ts';

export const ALL_EVENTS: GameEvent[] = [
  ...CHILDHOOD_EVENTS,
  ...TEEN_EVENTS,
  ...ADULT_EVENTS,
  ...RELATIONSHIP_EVENTS,
  ...SENIOR_EVENTS,
  ...PRISON_EVENTS,
  ...MISC_EVENTS,
];

export const EVENT_MAP: Record<string, GameEvent> = Object.fromEntries(
  ALL_EVENTS.map((e) => [e.id, e]),
);

export function getEvent(id: string): GameEvent | null {
  return EVENT_MAP[id] ?? null;
}
