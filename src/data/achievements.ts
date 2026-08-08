/**
 * Succès (hauts faits) — débloqués en temps réel pendant la vie par un système
 * qui évalue en continu l'état du personnage. Ajoute des objectifs et une boucle
 * de récompense. Chaque succès a un `check(char)` évalué à chaque événement.
 */
import type { Character } from "../types";

export type Rarity = "commun" | "rare" | "légendaire";

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  rarity: Rarity;
  check: (c: Character) => boolean;
}

const has = (c: Character, t: string) => c.memory.includes(t);

export const ACHIEVEMENTS: Achievement[] = [
  // Richesse
  { id: "millionnaire", icon: "💰", title: "Millionnaire", desc: "Posséder plus d'un million d'euros.", rarity: "rare", check: (c) => c.money >= 1_000_000 },
  { id: "multimillionnaire", icon: "🤑", title: "Multimillionnaire", desc: "Dépasser les 10 millions.", rarity: "légendaire", check: (c) => c.money >= 10_000_000 },
  { id: "self_made", icon: "🚀", title: "Self-made", desc: "Né précaire, devenir millionnaire.", rarity: "légendaire", check: (c) => (c.creation.socialClassId === "precaire" || has(c, "poverty")) && c.money >= 1_000_000 },
  { id: "fauche", icon: "🕳️", title: "Au fond du trou", desc: "Être endetté de plus de 20 000 €.", rarity: "commun", check: (c) => c.money <= -20_000 },
  // Longévité / santé
  { id: "centenaire", icon: "🎂", title: "Centenaire", desc: "Atteindre 100 ans.", rarity: "légendaire", check: (c) => c.age >= 100 },
  { id: "increvable", icon: "🛡️", title: "Increvable", desc: "Dépasser 80 ans malgré une maladie chronique.", rarity: "rare", check: (c) => c.age >= 80 && c.conditions.length > 0 },
  // Intellect / stats
  { id: "genie", icon: "🧠", title: "Génie", desc: "Intelligence à 95+.", rarity: "rare", check: (c) => c.stats.intelligence >= 95 },
  { id: "charismatique", icon: "✨", title: "Icône de charme", desc: "Charisme à 95+.", rarity: "rare", check: (c) => c.stats.charisme >= 95 },
  { id: "athlete", icon: "💪", title: "Corps d'athlète", desc: "Physique à 95+.", rarity: "rare", check: (c) => c.stats.physique >= 95 },
  { id: "zen", icon: "🧘", title: "Sérénité absolue", desc: "Bonheur ET santé mentale à 90+.", rarity: "rare", check: (c) => c.stats.bonheur >= 90 && c.meta.mentalHealth >= 90 },
  // Éducation / carrière
  { id: "docteur", icon: "🎓", title: "Docteur", desc: "Obtenir le plus haut niveau d'études.", rarity: "rare", check: (c) => c.educationLevel >= 5 },
  { id: "magnat", icon: "🏢", title: "Magnat", desc: "Diriger un empire (entrepreneuriat au sommet).", rarity: "légendaire", check: (c) => c.job?.title === "Empire" },
  // Célébrité
  { id: "star", icon: "🌟", title: "Célébrité", desc: "Atteindre 60 de notoriété.", rarity: "rare", check: (c) => c.fame >= 60 },
  { id: "legende", icon: "👑", title: "Légende vivante", desc: "Notoriété quasi maximale.", rarity: "légendaire", check: (c) => c.fame >= 90 },
  { id: "viral", icon: "📱", title: "Phénomène viral", desc: "Devenir un phénomène des réseaux.", rarity: "commun", check: (c) => has(c, "influenceur") },
  // Vie perso
  { id: "marie", icon: "💍", title: "Jeune marié·e", desc: "Se marier.", rarity: "commun", check: (c) => has(c, "marie") },
  { id: "parent", icon: "👶", title: "Fonder une famille", desc: "Avoir un enfant.", rarity: "commun", check: (c) => has(c, "parent") },
  { id: "patriarche", icon: "👴", title: "Patriarche", desc: "Avoir 3 enfants ou plus.", rarity: "rare", check: (c) => c.relationships.filter((r) => r.kind === "enfant").length >= 3 },
  // Crime
  { id: "hors_la_loi", icon: "🕶️", title: "Hors-la-loi", desc: "Basculer dans l'illégalité.", rarity: "commun", check: (c) => has(c, "hors_la_loi") },
  { id: "taulard", icon: "⛓️", title: "Taulard", desc: "Faire de la prison.", rarity: "commun", check: (c) => c.timesJailed >= 1 || !!c.prison },
  { id: "evade", icon: "🏃", title: "L'évadé", desc: "Réussir une évasion.", rarity: "légendaire", check: (c) => has(c, "evade") },
  { id: "meurtrier", icon: "🔪", title: "Meurtrier", desc: "Ôter une vie.", rarity: "rare", check: (c) => c.kills >= 1 },
  { id: "tueur_serie", icon: "☠️", title: "Tueur en série", desc: "Tuer 3 personnes ou plus.", rarity: "légendaire", check: (c) => c.kills >= 3 },
  { id: "parrain", icon: "🎩", title: "Parrain", desc: "Régner sur le crime organisé.", rarity: "légendaire", check: (c) => c.job?.title === "Parrain" || has(c, "tueur_a_gages") },
  // Morale
  { id: "saint", icon: "😇", title: "Cœur d'or", desc: "S'engager dans le bénévolat.", rarity: "commun", check: (c) => has(c, "benevole") },
  { id: "globe", icon: "🌍", title: "Globe-trotter", desc: "S'expatrier ou faire le tour du monde.", rarity: "commun", check: (c) => has(c, "expatrie") || has(c, "goal:voyages_atteint") },
  { id: "chanceux", icon: "🍀", title: "Veinard", desc: "Gagner à la loterie.", rarity: "légendaire", check: (c) => has(c, "gagnant_loto") },
];

/**
 * Détermine si l'objectif de vie choisi est atteint.
 * Renvoie true si oui (utilisé pour la célébration + le score).
 */
export function isGoalAchieved(c: Character): boolean {
  switch (c.creation.lifeGoalId) {
    case "fortune": return c.money >= 1_000_000;
    case "celebrite": return c.fame >= 55;
    case "famille_nombreuse": return c.relationships.filter((r) => r.kind === "enfant").length >= 2 || c.memory.includes("parent");
    case "savoir_supreme": return c.educationLevel >= 5;
    case "pouvoir_politique": return c.job?.careerId === "politique" && (c.job?.level ?? 0) >= 2;
    case "bonheur_simple": return c.age >= 60 && c.stats.bonheur >= 75;
    case "crime_empire": return c.job?.title === "Parrain" || c.memory.includes("tueur_a_gages") || c.memory.includes("gang");
    case "tour_du_monde": return c.memory.includes("expatrie");
    case "sportif": return c.stats.physique >= 90 || c.job?.careerId === "sport_pro";
    case "artiste_legende": return c.fame >= 70 && c.stats.creativite >= 80;
    default: return false;
  }
}
