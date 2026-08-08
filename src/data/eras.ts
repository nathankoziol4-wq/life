/**
 * Époque de naissance (1950 → 2025).
 * L'époque définit la plage d'années historiques traversées : les événements
 * de type "histoire" utilisent `yearRange` pour se déclencher (crises, guerres,
 * booms, pandémies) et les tags débloquent des technologies/métiers.
 */
import type { Era } from "../types";

function era(
  id: string,
  label: string,
  icon: string,
  yearStart: number,
  yearEnd: number,
  desc: string,
  tags: string[],
  mods: Era["modifiers"] = []
): Era {
  return {
    id,
    label,
    icon,
    yearStart,
    yearEnd,
    description: desc,
    tags: ["era:" + id, ...tags],
    modifiers: mods,
  };
}

export const ERAS: Era[] = [
  era("boomer", "1950 — L'après-guerre", "📻", 1950, 2035, "Reconstruction, plein emploi, télé naissante. Pas d'internet avant tes 40 ans.", ["no_internet_youth", "industrial_jobs", "cold_war"], [
    { target: "startingMoney", op: "mult", value: 0.6, label: "Économie d'après-guerre", source: "Époque : 1950" },
  ]),
  era("genx", "1970 — Choc pétrolier", "📼", 1970, 2050, "Crises pétrolières, punk, début de l'informatique personnelle.", ["oil_crisis", "analog_youth", "cold_war"], []),
  era("millennial", "1990 — L'aube du web", "💾", 1990, 2075, "Tu grandis avec internet, la mondialisation, la crise de 2008.", ["internet_native", "globalization", "crisis_2008"], []),
  era("genz", "2005 — Natif du smartphone", "📱", 2005, 2090, "Réseaux sociaux, pandémie 2020, IA, crise climatique.", ["smartphone_native", "social_media", "pandemic_2020", "climate_anxiety", "ai_era"], [
    { target: "mentalHealth", op: "add", value: -5, label: "Pression des réseaux", source: "Époque : 2005" },
  ]),
  era("genalpha", "2020 — Génération IA", "🤖", 2020, 2110, "Né dans un monde d'IA générative et de bouleversements climatiques.", ["ai_native", "climate_crisis", "social_media"], [
    { target: "learningMultiplier", op: "mult", value: 1.1, label: "Outils IA d'apprentissage", source: "Époque : 2020" },
  ]),
];

export const ERA_BY_ID = Object.fromEntries(ERAS.map((e) => [e.id, e]));
