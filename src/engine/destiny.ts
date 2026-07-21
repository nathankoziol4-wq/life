/**
 * Génération narrative :
 * - `destinyPhrase` : la phrase "destin probable" affichée sur la fiche de récap
 *   ("Né dans la précarité à Lagos en 1998, doté d'un charisme exceptionnel...").
 * - `lifeSummary` + `lifeScore` : bilan final de l'existence.
 */
import type { CharacterCreation, Character, Stats, StatKey } from "../types";
import { STAT_KEYS, STAT_LABELS } from "../types";
import { COUNTRY_BY_ID } from "../data/countries";
import { ERA_BY_ID } from "../data/eras";
import { SOCIAL_BY_ID } from "../data/socialClasses";

function qualify(value: number): string {
  if (value >= 85) return "exceptionnel";
  if (value >= 70) return "remarquable";
  if (value >= 55) return "solide";
  if (value >= 40) return "moyen";
  if (value >= 25) return "fragile";
  return "quasi inexistant";
}

const SOCIAL_INTRO: Record<string, string> = {
  precaire: "dans la précarité",
  populaire: "dans un milieu modeste",
  moyen: "dans une famille de classe moyenne",
  aise: "dans un foyer aisé",
  fortune: "dans la grande bourgeoisie",
  dynastie: "au sein d'une dynastie fortunée",
};

/** Phrase de destin probable pour l'écran de récap. */
export function destinyPhrase(c: Partial<CharacterCreation>, stats: Stats): string {
  const country = COUNTRY_BY_ID[c.countryId ?? ""];
  const era = ERA_BY_ID[c.eraId ?? ""];
  const social = SOCIAL_BY_ID[c.socialClassId ?? ""];
  const name = c.firstName || "Ce personnage";

  const birthYear = era ? era.yearStart : "?";
  const place = country ? country.label : "un pays inconnu";
  const intro = SOCIAL_INTRO[c.socialClassId ?? ""] ?? "dans un milieu indéterminé";

  // Trouve les deux stats extrêmes.
  const sorted = [...STAT_KEYS].sort((a, b) => stats[b] - stats[a]);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const socialLabel = social ? "" : "";
  void socialLabel;

  return `Né ${intro} à ${place} en ${birthYear}, ${name} est doté d'${startsWithVowel(STAT_LABELS[top]) ? "un " : "un "}${STAT_LABELS[top].toLowerCase()} ${qualify(stats[top])}, mais d'${startsWithVowel(STAT_LABELS[bottom]) ? "un" : "un"}${STAT_LABELS[bottom].toLowerCase() === "santé" ? "e santé" : " " + STAT_LABELS[bottom].toLowerCase()} ${qualify(stats[bottom])}. Le destin reste à écrire.`;
}

function startsWithVowel(w: string): boolean {
  return /^[aeiouyéèàâ]/i.test(w);
}

/** Score de vie final : moyenne pondérée + bonus argent/relations - malus. */
export function lifeScore(char: Character): number {
  const statAvg = STAT_KEYS.reduce((s, k) => s + char.stats[k], 0) / STAT_KEYS.length;
  const moneyScore = Math.max(-15, Math.min(25, char.money / 100000));
  const relScore = char.relationships.reduce((s, r) => s + r.closeness, 0) / 40;
  const healthPenalty = char.conditions.length * 3 + char.addictions.length * 5;
  const ageBonus = char.age / 5;
  return Math.round(statAvg + moneyScore + relScore + ageBonus - healthPenalty);
}

/** Bilan narratif de toute l'existence. */
export function lifeSummary(char: Character): string[] {
  const c = char.creation;
  const lines: string[] = [];
  const jobLine = char.job ? `a mené une carrière de ${char.job.title}` : "n'a jamais vraiment percé professionnellement";
  const moneyLine = char.money > 500000 ? "et amasse une fortune" : char.money > 0 ? "avec des finances équilibrées" : "en laissant des dettes";
  lines.push(`${c.firstName} ${c.lastName} a vécu ${char.age} ans, ${jobLine} ${moneyLine}.`);

  const partners = char.relationships.filter((r) => r.kind === "partenaire");
  if (char.memory.includes("marie")) lines.push("Il s'est marié et a connu l'engagement.");
  else if (partners.length) lines.push("Il a connu l'amour sans jamais se lier officiellement.");

  if (char.memory.includes("hors_la_loi")) lines.push("Une partie de son existence a basculé dans l'illégalité.");
  if (char.conditions.length) lines.push(`La santé fut une épreuve : ${char.conditions.join(", ")}.`);
  if (char.addictions.length) lines.push("Des addictions ont marqué son parcours.");

  const bestStat = [...STAT_KEYS].sort((a, b) => char.stats[b] - char.stats[a])[0] as StatKey;
  lines.push(`Sa plus grande force aura été ${STAT_LABELS[bestStat].toLowerCase()} (${char.stats[bestStat]}/100).`);
  return lines;
}

/** Qualificatif du score final. */
export function scoreVerdict(score: number): string {
  if (score >= 90) return "Une vie légendaire.";
  if (score >= 70) return "Une vie accomplie.";
  if (score >= 50) return "Une vie honnête.";
  if (score >= 30) return "Une vie difficile mais vécue.";
  return "Une vie de galères.";
}
