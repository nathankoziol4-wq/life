/**
 * Moteur de succès — évalue en continu les hauts faits débloqués et le suivi de
 * l'objectif de vie. Met aussi à jour la notoriété (fame) année après année.
 */
import type { Character } from "../types";
import { ACHIEVEMENTS, isGoalAchieved, type Achievement } from "../data/achievements";

/** Succès nouvellement débloqués (non encore enregistrés). Les marque comme acquis. */
export function collectAchievements(char: Character): Achievement[] {
  const fresh = ACHIEVEMENTS.filter((a) => !char.achievements.includes(a.id) && a.check(char));
  for (const a of fresh) char.achievements.push(a.id);
  return fresh;
}

/** Vérifie si l'objectif de vie vient d'être atteint (le marque). */
export function checkGoal(char: Character): boolean {
  if (char.goalAchieved) return false;
  if (isGoalAchieved(char)) {
    char.goalAchieved = true;
    if (!char.memory.includes("goal_atteint")) char.memory.push("goal_atteint");
    return true;
  }
  return false;
}

/**
 * Recalcule la notoriété (fame) à partir de contributions durables (carrière,
 * tags, crimes retentissants) avec une légère érosion. Bornée 0–100.
 */
export function updateFame(char: Character): void {
  let target = 0;
  const m = char.memory;
  if (m.includes("influenceur")) target += 55;
  if (m.includes("ia_expert") || m.includes("early_adopter")) target += 8;
  if (m.includes("gagnant_loto")) target += 25;
  if (m.includes("entrepreneur")) target += 12;
  if (m.includes("reconnaissance") || m.includes("ambitieux_carriere")) target += 8;
  // Carrières médiatiques.
  const c = char.job?.careerId;
  const lvl = char.job?.level ?? 0;
  if (c === "art" || c === "sport_pro" || c === "politique" || c === "celebrite") target += 15 + lvl * 18;
  if (char.job?.title === "Empire" || char.job?.title === "Parrain") target += 40;
  // Notoriété criminelle.
  target += Math.min(30, char.kills * 12);
  if (m.includes("cambrioleur") || m.includes("arnaqueur")) target += 6;
  // Charisme amplifie la notoriété atteignable.
  target += (char.stats.charisme - 50) / 8;

  target = Math.max(0, Math.min(100, target));
  // Rapprochement progressif + légère érosion si rien ne l'entretient.
  if (target > char.fame) char.fame = Math.min(100, char.fame + Math.ceil((target - char.fame) / 2));
  else char.fame = Math.max(target, char.fame - 1);
  char.fame = Math.round(Math.max(0, Math.min(100, char.fame)));
}
