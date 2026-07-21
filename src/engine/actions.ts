/**
 * Moteur d'actions : disponibilité (conditions, coûts, cooldowns, once) et
 * résolution (effet déterministe OU jet risqué pondéré par la Chance).
 */
import type { Action, Character, LifeLogEntry } from "../types";
import { ACTIONS } from "../data/actions";
import { conditionMet, applyEventEffect, interpolate } from "./events";
import { Rng, seedFromString } from "./rng";

export interface ActionAvailability {
  action: Action;
  available: boolean;
  reason?: string;
}

/** Évalue la disponibilité de toutes les actions d'une branche. */
export function actionsForBranch(char: Character, branch: Action["branch"]): ActionAvailability[] {
  return ACTIONS.filter((a) => a.branch === branch).map((a) => evaluate(char, a));
}

function evaluate(char: Character, a: Action): ActionAvailability {
  if (a.once && char.actionsDone.includes(a.id)) return { action: a, available: false, reason: "Déjà fait" };
  const last = char.actionCooldowns[a.id];
  if (a.cooldown && last !== undefined && char.age - last < a.cooldown) {
    return { action: a, available: false, reason: `Encore ${a.cooldown - (char.age - last)} an(s)` };
  }
  if (!conditionMet(char, a.condition)) return { action: a, available: false, reason: "Non débloqué" };
  if (a.cost && char.money < a.cost) return { action: a, available: false, reason: "Trop cher" };
  return { action: a, available: true };
}

/** Exécute une action et renvoie l'entrée de journal produite. */
export function performAction(char: Character, action: Action): LifeLogEntry {
  // Débit du coût.
  if (action.cost) char.money -= action.cost;
  // Marque cooldown / once.
  if (action.cooldown) char.actionCooldowns[action.id] = char.age;
  if (action.once) char.actionsDone.push(action.id);

  let outcome = "";
  let tone: LifeLogEntry["tone"] = "neutre";

  if (action.risky) {
    const rng = new Rng(seedFromString(action.id + char.age + char.money));
    const success = rng.luckyRoll(action.risky.successRate, char.stats.chance);
    const e = success ? action.risky.success : action.risky.failure;
    outcome = applyEventEffect(char, e);
    tone = success ? "positif" : "negatif";
  } else if (action.effects) {
    for (const e of action.effects) {
      outcome = applyEventEffect(char, e);
    }
    tone = "neutre";
  }

  const entry: LifeLogEntry = {
    age: char.age,
    text: `${action.icon} ${action.label} — ${interpolate(char, outcome)}`,
    tone,
  };
  char.history.push(entry);
  return entry;
}
