/**
 * Boucle de vie année par année. `advanceYear` fait vieillir le personnage,
 * applique le déclin/vieillissement, l'économie (salaire, impôts), les jets de
 * santé génétiques, puis tire éventuellement un événement à choix.
 *
 * L'UI appelle `advanceYear` ; s'il renvoie un `pendingEvent`, elle affiche les
 * choix et rappelle `resolveChoice`. Sinon la vie continue.
 */
import type { Character, GameEvent, LifeLogEntry } from "../types";
import { Rng, seedFromString } from "./rng";
import { eligibleEvents, effectiveWeight, applyEventEffect, availableChoices, interpolate, currentYear } from "./events";
import { CAREER_BY_ID } from "../data/careers";
import { COUNTRY_BY_ID } from "../data/countries";

export interface YearResult {
  logs: LifeLogEntry[];
  /** Si présent, l'UI doit demander un choix avant de continuer. */
  pendingEvent?: GameEvent;
  died?: boolean;
}

/** Taux d'imposition simplifié dérivé du pays (proxy via incomeMultiplier). */
function taxRate(char: Character): number {
  const country = COUNTRY_BY_ID[char.creation.countryId];
  // Pays "wealthy_nation" => fiscalité forte mais services ; sinon modéré.
  if (country?.tags?.includes("wealthy_nation")) return 0.42;
  if (country?.tags?.includes("oil_wealth")) return 0.05;
  return 0.28;
}

/**
 * Fait avancer d'un an. Renvoie les logs de l'année et, le cas échéant, un
 * événement en attente de choix.
 */
export function advanceYear(char: Character, seen: Set<string>): YearResult {
  const logs: LifeLogEntry[] = [];
  char.age += 1;
  const rng = new Rng(seedFromString(char.creation.firstName + char.age + char.money));

  // --- Vieillissement : déclin physique progressif après 30 ans ---
  if (char.age > 30) {
    const decline = Math.floor((char.age - 30) / 10) + 1;
    char.stats.physique = Math.max(0, char.stats.physique - (rng.chance(0.5) ? decline : 0));
    if (char.age > 55) char.stats.sante = Math.max(0, char.stats.sante - (rng.chance(0.4) ? 1 : 0));
  }

  // --- Économie : revenu si en emploi ---
  if (char.job) {
    const gross = char.job.salary * char.meta.incomeMultiplier;
    const net = gross * (1 - taxRate(char));
    char.money += Math.round(net);
  }

  // --- Éducation automatique dans l'enfance/adolescence ---
  if (char.age === 6) { char.educationLevel = 1; logs.push(mkLog(char.age, `${char.creation.firstName} entre à l'école primaire.`, "neutre")); }
  if (char.age === 15) { char.educationLevel = 2; }
  if (char.age === 18 && char.memory.includes("etudes_sup")) { logs.push(mkLog(char.age, "Début des études supérieures.", "neutre")); }
  if (char.age === 23 && char.memory.includes("etudes_sup")) { char.educationLevel = 4; logs.push(mkLog(char.age, `${char.creation.firstName} obtient son diplôme supérieur.`, "positif")); }
  if (char.age === 27 && char.memory.includes("etudes_sup") && char.stats.intelligence > 65) { char.educationLevel = 5; }

  // --- Prise d'emploi automatique à ~24 ans si sans job ---
  if (!char.job && char.age >= 22 && char.age <= 40 && rng.chance(0.7)) {
    autoAssignJob(char, rng, logs);
  }
  // --- Promotions ---
  if (char.job) maybePromote(char, rng, logs);

  // --- Jets de santé liés aux conditions/addictions ---
  for (const cond of char.conditions) {
    if (cond === "chronic" && rng.chance(0.15)) {
      char.stats.sante = Math.max(0, char.stats.sante - 3);
      logs.push(mkLog(char.age, "Une poussée de la maladie chronique t'affaiblit.", "negatif"));
    }
  }
  if (char.meta.addictionRisk > 60 && !char.addictions.length && rng.luckyRoll(0.12, char.stats.chance)) {
    char.addictions.push("substance");
    char.stats.sante = Math.max(0, char.stats.sante - 5);
    logs.push(mkLog(char.age, `${char.creation.firstName} sombre dans une addiction.`, "negatif"));
  }

  // --- Mort ? (probabilité croissante au-delà de l'espérance de vie) ---
  if (checkDeath(char, rng)) {
    char.alive = false;
    logs.push(mkLog(char.age, `${char.creation.firstName} s'éteint à ${char.age} ans.`, "special"));
    return { logs, died: true };
  }

  // --- Tirage d'un événement ---
  const pool = eligibleEvents(char, seen);
  // Probabilité qu'un événement à choix survienne cette année.
  if (pool.length && rng.chance(0.72)) {
    const event = rng.weighted(pool, (e) => effectiveWeight(char, e));
    if (event) {
      seen.add(event.id);
      const choices = availableChoices(char, event);
      if (choices.length > 0) {
        // Événement interactif : renvoyé pour affichage.
        return { logs, pendingEvent: { ...event, choices } };
      }
      // Événement auto (narratif direct).
      for (const eff of event.autoEffects ?? []) {
        const outcome = applyEventEffect(char, eff);
        logs.push(mkLog(char.age, interpolate(char, event.text) + " " + outcome, toneFor(eff)));
      }
    }
  }

  char.history.push(...logs);
  return { logs };
}

/** Applique le choix retenu d'un événement en attente. */
export function resolveChoice(char: Character, event: GameEvent, choiceIndex: number): LifeLogEntry[] {
  const choice = event.choices[choiceIndex];
  const logs: LifeLogEntry[] = [];
  if (!choice) return logs;

  for (const eff of choice.effects) {
    // Cas spécial : investissement risqué résolu par la Chance.
    let outcome = applyEventEffect(char, eff);
    if (event.id === "investissement" && choice.label.includes("gros")) {
      const rng = new Rng(seedFromString(char.creation.firstName + char.age + "invest"));
      if (rng.luckyRoll(0.45, char.stats.chance)) {
        char.money += 20000;
        outcome = "L'affaire décolle : gros retour sur investissement !";
      } else {
        char.money -= 8000;
        outcome = "L'affaire capote : tu perds ta mise.";
      }
    }
    logs.push(mkLog(char.age, interpolate(char, event.title) + " — " + outcome, toneFor(eff)));
  }
  char.history.push(...logs);
  return logs;
}

// --- Helpers carrière ---

function autoAssignJob(char: Character, rng: Rng, logs: LifeLogEntry[]) {
  const candidates = Object.values(CAREER_BY_ID).filter((c) => {
    if (c.minEducation > char.educationLevel) return false;
    if (c.requiresTag && !char.memory.includes(c.requiresTag)) return false;
    return true;
  });
  if (!candidates.length) return;
  // Pondère par l'adéquation à la stat clé.
  const career = rng.weighted(candidates, (c) => 1 + char.stats[c.keyStat] / 20);
  if (!career) return;
  const lvl = career.levels[0];
  char.job = { careerId: career.id, title: lvl.title, level: 0, salary: lvl.salary };
  logs.push(mkLog(char.age, `${char.creation.firstName} décroche un poste : ${lvl.title} (${career.label}).`, "positif"));
}

function maybePromote(char: Character, rng: Rng, logs: LifeLogEntry[]) {
  const career = CAREER_BY_ID[char.job!.careerId];
  if (!career) return;
  const next = char.job!.level + 1;
  if (next >= career.levels.length) return;
  const keyStat = char.stats[career.keyStat];
  const p = 0.06 + keyStat / 400 + char.stats.discipline / 500;
  if (rng.luckyRoll(p, char.stats.chance)) {
    const lvl = career.levels[next];
    char.job = { careerId: career.id, title: lvl.title, level: next, salary: lvl.salary };
    logs.push(mkLog(char.age, `Promotion ! ${char.creation.firstName} devient ${lvl.title}.`, "positif"));
    char.stats.bonheur = Math.min(100, char.stats.bonheur + 2);
  }
  // Risque professionnel (faillite, prison, blessure).
  if (rng.chance(career.risk / 1000)) {
    logs.push(mkLog(char.age, `Coup dur professionnel dans la voie ${career.label}.`, "negatif"));
    char.money = Math.max(-20000, char.money - 10000);
    char.stats.bonheur = Math.max(0, char.stats.bonheur - 5);
  }
}

// --- Mort ---

function checkDeath(char: Character, rng: Rng): boolean {
  if (char.age < 40) {
    // Mortalité infantile/jeune très faible, modulée par santé.
    const base = char.stats.sante < 20 ? 0.01 : 0.001;
    return rng.chance(base);
  }
  const over = char.age - char.lifeExpectancy;
  // Probabilité de base qui grimpe autour et au-delà de l'espérance de vie.
  let p = Math.max(0.005, 0.02 + over * 0.03);
  p *= 1 + (60 - char.stats.sante) / 120; // mauvaise santé => risque accru
  return rng.chance(Math.min(0.95, p));
}

// --- Utilitaires ---

function mkLog(age: number, text: string, tone: LifeLogEntry["tone"]): LifeLogEntry {
  return { age, text, tone };
}

function toneFor(eff: { modifiers?: { target: string; value: number; op: string }[]; money?: number }): LifeLogEntry["tone"] {
  const sum = (eff.modifiers ?? []).reduce((s, m) => s + (m.op === "add" ? m.value : 0), 0) + (eff.money ?? 0) / 1000;
  if (sum > 2) return "positif";
  if (sum < -2) return "negatif";
  return "neutre";
}

export { currentYear };
