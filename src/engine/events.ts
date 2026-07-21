/**
 * Moteur d'événements modulaire.
 * - `eligibleEvents` filtre la bibliothèque selon les conditions (âge, tags mémoire,
 *   stats, plage d'années historiques, unicité).
 * - Le poids effectif est pondéré par la Chance et légèrement par les stats.
 * - `applyEventEffect` applique un choix (ou un autoEffect) au personnage.
 */
import type { Character, GameEvent, EventEffect, EventCondition, StatKey, Relationship } from "../types";
import { STAT_KEYS } from "../types";
import { EVENTS } from "../data/events";
import { clampStat } from "./modifiers";
import { ERA_BY_ID } from "../data/eras";
import { randomAvatar } from "./avatar";
import { CRIME_ITEM_BY_ID } from "../data/crimeItems";
import { Rng, seedFromString } from "./rng";

const NPC_NAMES = ["Camille", "Alex", "Sam", "Noa", "Lou", "Jules", "Léa", "Marius", "Inès", "Théo", "Nina", "Gabriel", "Yasmine", "Kenji", "Amara", "Diego", "Sofia", "Liam"];
function pickName(seed: string): string {
  return NPC_NAMES[new Rng(seedFromString(seed)).int(0, NPC_NAMES.length - 1)];
}

/** Année civile courante = année de naissance (début d'époque) + âge. */
export function currentYear(char: Character): number {
  const era = ERA_BY_ID[char.creation.eraId];
  return (era?.yearStart ?? 1990) + char.age;
}

/** Vérifie qu'une condition est satisfaite par l'état actuel. */
export function conditionMet(char: Character, cond: EventCondition | undefined): boolean {
  if (!cond) return true;
  if (cond.minAge !== undefined && char.age < cond.minAge) return false;
  if (cond.maxAge !== undefined && char.age > cond.maxAge) return false;

  if (cond.requiresTags && cond.requiresTags.length) {
    // Au moins un tag requis présent (OU logique — plus permissif pour le contenu).
    const has = cond.requiresTags.some((t) => char.memory.includes(t));
    if (!has) return false;
  }
  if (cond.forbidsTags && cond.forbidsTags.some((t) => char.memory.includes(t))) return false;

  if (cond.minStats) {
    for (const k of Object.keys(cond.minStats) as StatKey[]) {
      const req = cond.minStats[k];
      const val = k in char.stats ? char.stats[k] : char.meta.mentalHealth; // mentalHealth via meta
      if (req !== undefined && val < req) return false;
    }
  }
  if (cond.maxStats) {
    for (const k of Object.keys(cond.maxStats) as (StatKey | "mentalHealth")[]) {
      const req = (cond.maxStats as Record<string, number>)[k];
      const val = k === "mentalHealth" ? char.meta.mentalHealth : char.stats[k as StatKey];
      if (req !== undefined && val > req) return false;
    }
  }

  if (cond.yearRange) {
    const y = currentYear(char);
    if (y < cond.yearRange[0] || y > cond.yearRange[1]) return false;
  }
  return true;
}

/** Événements éligibles cette année (hors ceux déjà vécus si `once`). */
export function eligibleEvents(char: Character, seen: Set<string>): GameEvent[] {
  return EVENTS.filter((e) => {
    if (e.once && seen.has(e.id)) return false;
    return conditionMet(char, e.condition);
  });
}

/** Poids effectif = poids de base pondéré par la Chance et l'à-propos. */
export function effectiveWeight(char: Character, e: GameEvent): number {
  let w = e.weight;
  // Les événements "special/positif" sont amplifiés par la Chance ; les négatifs atténués.
  const luckFactor = (char.stats.chance - 50) / 100; // -0.5 … +0.5
  if (e.category === "special") w *= 1 + luckFactor;
  if (e.category === "sante") w *= 1 - luckFactor * 0.5;
  return Math.max(0.1, w);
}

/**
 * Applique un effet d'événement au personnage (mutation d'une copie).
 * Retourne le texte de résolution à afficher.
 */
export function applyEventEffect(char: Character, effect: EventEffect): string {
  // Modificateurs sur stats & meta.
  for (const m of effect.modifiers ?? []) {
    if (STAT_KEYS.includes(m.target as StatKey)) {
      const k = m.target as StatKey;
      char.stats[k] = clampStat(applyOp(char.stats[k], m.op, m.value));
    } else if (m.target === "lifeExpectancy") {
      char.lifeExpectancy = applyOp(char.lifeExpectancy, m.op, m.value);
    } else if (m.target === "mentalHealth") {
      char.meta.mentalHealth = Math.max(0, Math.min(100, applyOp(char.meta.mentalHealth, m.op, m.value)));
    } else if (m.target === "addictionRisk") {
      char.meta.addictionRisk = Math.max(0, Math.min(100, applyOp(char.meta.addictionRisk, m.op, m.value)));
    }
  }
  if (effect.money) char.money += effect.money;
  if (effect.addMemory) effect.addMemory.forEach((t) => { if (!char.memory.includes(t)) char.memory.push(t); });
  if (effect.addCondition) effect.addCondition.forEach((c) => { if (!char.conditions.includes(c)) char.conditions.push(c); });
  if (effect.addItem && !char.inventory.includes(effect.addItem)) char.inventory.push(effect.addItem);
  if (effect.addAsset) char.assets.push({ id: effect.addAsset.kind + "_" + char.age + "_" + char.assets.length, label: effect.addAsset.label, kind: effect.addAsset.kind, value: effect.addAsset.value });

  // Impact relationnel : applique le delta à la première relation du type visé,
  // ou en crée une nouvelle (ex. partenaire/ennemi).
  if (effect.relationshipDelta) {
    const { kind, delta } = effect.relationshipDelta;
    let rel = char.relationships.find((r) => r.kind === kind && r.alive);
    if (!rel && (kind === "partenaire" || kind === "ennemi" || kind === "ami" || kind === "collegue")) {
      const id = kind + "_" + char.age + "_" + char.relationships.length;
      rel = { id, name: pickName(id), kind, closeness: 0, alive: true, avatar: randomAvatar(id) };
      char.relationships.push(rel);
    }
    if (rel) rel.closeness = Math.max(-100, Math.min(100, rel.closeness + delta));
  }

  // Incarcération / libération.
  if (effect.jail && !char.prison) incarcerate(char, effect.jail.years, effect.jail.reason);
  if (effect.release && char.prison) releaseFromPrison(char);

  return effect.outcome;
}

/** Envoie le personnage en prison : perte d'emploi, casier, peine ferme.
 *  Un avocat véreux (inventaire) réduit la peine. */
export function incarcerate(char: Character, years: number, reason: string): void {
  let finalYears = years;
  let bestReduction = 0;
  for (const id of char.inventory) {
    const r = CRIME_ITEM_BY_ID[id]?.jailReduction;
    if (r && r > bestReduction) bestReduction = r;
  }
  if (bestReduction > 0) finalYears = Math.max(1, Math.round(years * (1 - bestReduction)));
  char.prison = { sentence: finalYears, yearsServed: 0, reason, behavior: 50 };
  char.job = undefined; // on perd son emploi en détention
  if (!char.memory.includes("en_prison")) char.memory.push("en_prison");
  char.memory.push("casier_lourd");
}

/** Libère le personnage : casier d'ex-détenu, réinsertion difficile. */
export function releaseFromPrison(char: Character): void {
  char.prison = undefined;
  char.timesJailed += 1;
  char.memory = char.memory.filter((t) => t !== "en_prison");
  if (!char.memory.includes("ex_detenu")) char.memory.push("ex_detenu");
  char.meta.networkQuality = Math.max(0, char.meta.networkQuality - 10);
  char.stats.charisme = clampStat(char.stats.charisme - 4); // stigmate
}

function applyOp(base: number, op: string, value: number): number {
  switch (op) {
    case "add": return base + value;
    case "mult": return base * value;
    case "set": return value;
    case "min": return Math.max(base, value);
    case "max": return Math.min(base, value);
    default: return base;
  }
}

/** Filtre les choix d'un événement selon leurs `requires`. */
export function availableChoices(char: Character, e: GameEvent) {
  return e.choices.filter((ch) => conditionMet(char, ch.requires));
}

/** Interpole {name} et {first} dans un texte. */
export function interpolate(char: Character, text: string): string {
  return text
    .replace(/\{name\}/g, char.creation.firstName)
    .replace(/\{first\}/g, char.creation.firstName)
    .replace(/\{last\}/g, char.creation.lastName);
}

export type { Relationship };
