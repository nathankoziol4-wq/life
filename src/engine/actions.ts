/**
 * Moteur d'actions : disponibilité (conditions, coûts, cooldowns, once, détention)
 * et résolution (effet déterministe OU jet risqué pondéré par la Chance).
 * En détention, seules les actions `prison: true` sont proposées, et inversement.
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

/** Actions d'une branche, filtrées selon l'état (libre / détention). */
export function actionsForBranch(char: Character, branch: Action["branch"]): ActionAvailability[] {
  const inPrison = !!char.prison;
  return ACTIONS
    .filter((a) => a.branch === branch && !!a.prison === inPrison)
    .map((a) => evaluate(char, a));
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
  if (action.cost) char.money -= action.cost;
  if (action.cooldown) char.actionCooldowns[action.id] = char.age;
  if (action.once) char.actionsDone.push(action.id);

  let outcome = "";
  let tone: LifeLogEntry["tone"] = "neutre";

  if (action.risky) {
    const rng = new Rng(seedFromString(action.id + char.age + char.money));
    // La libération conditionnelle dépend fortement du comportement en détention.
    let rate = action.risky.successRate;
    if (action.id === "conditionnelle" && char.prison) rate += (char.prison.behavior - 50) / 100;
    const success = rng.luckyRoll(rate, char.stats.chance);
    const e = success ? action.risky.success : action.risky.failure;
    outcome = applyEventEffect(char, e);
    tone = success ? "positif" : "negatif";
  } else if (action.effects) {
    for (const e of action.effects) outcome = applyEventEffect(char, e);
    tone = "neutre";
  }

  // Ajustement du comportement carcéral selon l'action menée.
  if (char.prison) {
    if (action.id === "etudier_prison" || action.id === "bien_se_tenir") {
      char.prison.behavior = Math.min(100, char.prison.behavior + 12);
    } else if (action.id === "gang_prison") {
      char.prison.behavior = Math.max(0, char.prison.behavior - 15);
    } else if (action.id === "se_faire_respecter" && tone === "negatif") {
      char.prison.behavior = Math.max(0, char.prison.behavior - 10);
    }
  }

  const entry: LifeLogEntry = {
    age: char.age,
    text: `${action.icon} ${action.label} — ${interpolate(char, outcome)}`,
    tone,
  };
  char.history.push(entry);
  return entry;
}
