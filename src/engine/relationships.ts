/**
 * Activités relationnelles — ce qu'on peut faire AVEC une connaissance précise
 * (passer du temps, offrir un cadeau, déclarer sa flamme, rompre, se marier,
 * couper les ponts, ou… éliminer un ennemi). Certaines conséquences sont narrées
 * par l'IA (engine/narrator) et peuvent mener en prison.
 */
import type { Character, Relationship, LifeLogEntry } from "../types";
import { Rng, seedFromString } from "./rng";
import { incarcerate } from "./events";
import { narrateMurder, narrateAssault } from "./narrator";
import { randomAvatar } from "./avatar";

export interface RelActivity {
  id: string;
  label: string;
  icon: string;
  description: string;
  kinds?: Relationship["kind"][]; // applicable à ces types (défaut : tous)
  minCloseness?: number;
  maxCloseness?: number;
  cost?: number;
  dark?: boolean; // action violente/criminelle
}

export const REL_ACTIVITIES: RelActivity[] = [
  { id: "passer_temps", label: "Passer du temps", icon: "🕰️", description: "Renforce le lien et remonte le moral." },
  { id: "conversation", label: "Discuter à cœur ouvert", icon: "💬", description: "Un moment sincère qui rapproche." },
  { id: "cadeau", label: "Offrir un cadeau", icon: "🎁", description: "Un présent qui fait grimper la complicité.", cost: 500 },
  { id: "sortir", label: "Sortir ensemble", icon: "🍽️", description: "Une sortie conviviale.", cost: 200 },
  { id: "demander_argent", label: "Demander de l'argent", icon: "💸", description: "Solliciter un coup de pouce financier.", kinds: ["parent", "ami", "fratrie"], minCloseness: 40 },
  { id: "declarer", label: "Déclarer sa flamme", icon: "💘", description: "Tenter de passer d'ami à partenaire.", kinds: ["ami", "collegue"], minCloseness: 55 },
  { id: "se_marier", label: "Se marier", icon: "💍", description: "Officialiser l'union.", kinds: ["partenaire"], minCloseness: 70 },
  { id: "faire_enfant", label: "Fonder une famille", icon: "👶", description: "Avoir un enfant ensemble.", kinds: ["partenaire"], minCloseness: 60 },
  { id: "reconciliation", label: "Se réconcilier", icon: "🕊️", description: "Tenter d'apaiser les tensions.", kinds: ["ennemi"], maxCloseness: 0 },
  { id: "dispute", label: "Se disputer", icon: "🗯️", description: "Vider son sac. Le lien en pâtit." },
  { id: "rompre", label: "Rompre", icon: "💔", description: "Mettre fin à la relation.", kinds: ["partenaire"] },
  { id: "couper_ponts", label: "Couper les ponts", icon: "🚫", description: "Rayer cette personne de ta vie.", kinds: ["ami", "collegue", "ennemi"] },
  { id: "menacer", label: "Menacer", icon: "😠", description: "Intimider pour se faire respecter.", dark: true },
  { id: "agresser", label: "Agresser physiquement", icon: "🤜", description: "Passer à la violence. Risque de prison.", dark: true },
  { id: "eliminer", label: "Éliminer…", icon: "🔪", description: "Faire disparaître définitivement cette personne. Très risqué.", dark: true },
];

/** Activités disponibles pour une relation donnée. */
export function activitiesFor(char: Character, rel: Relationship): { activity: RelActivity; available: boolean; reason?: string }[] {
  return REL_ACTIVITIES.map((a) => {
    if (a.kinds && !a.kinds.includes(rel.kind)) return { activity: a, available: false, reason: "N/A" };
    if (a.minCloseness !== undefined && rel.closeness < a.minCloseness) return { activity: a, available: false, reason: `Complicité ${a.minCloseness}+ requise` };
    if (a.maxCloseness !== undefined && rel.closeness > a.maxCloseness) return { activity: a, available: false, reason: "Trop proche" };
    if (a.cost && char.money < a.cost) return { activity: a, available: false, reason: "Trop cher" };
    if (a.id === "faire_enfant" && (char.age < 18 || char.age > 55)) return { activity: a, available: false, reason: "Âge" };
    return { activity: a, available: true };
  });
}

const clampC = (n: number) => Math.max(-100, Math.min(100, n));
const clampS = (n: number) => Math.max(0, Math.min(100, n));
const FIRST_NAMES = ["Camille", "Alex", "Sam", "Noa", "Lou", "Jules", "Léa", "Marius", "Inès", "Théo", "Nina", "Gabriel", "Yasmine", "Kenji", "Amara"];

/** Exécute une activité relationnelle et renvoie l'entrée de journal. */
export function performRelActivity(char: Character, rel: Relationship, activityId: string): LifeLogEntry {
  const rng = new Rng(seedFromString(activityId + rel.id + char.age + char.money));
  let text = "";
  let tone: LifeLogEntry["tone"] = "neutre";
  const act = REL_ACTIVITIES.find((a) => a.id === activityId);
  if (act?.cost) char.money -= act.cost;

  switch (activityId) {
    case "passer_temps":
      rel.closeness = clampC(rel.closeness + 8);
      char.stats.bonheur = clampS(char.stats.bonheur + 2);
      text = `Tu passes du bon temps avec ${rel.name}. Complicité +8.`;
      tone = "positif";
      break;
    case "conversation":
      rel.closeness = clampC(rel.closeness + 6);
      char.meta.mentalHealth = clampS(char.meta.mentalHealth + 3);
      text = `Une discussion sincère avec ${rel.name} vous rapproche.`;
      tone = "positif";
      break;
    case "cadeau":
      rel.closeness = clampC(rel.closeness + 12);
      char.stats.bonheur = clampS(char.stats.bonheur + 2);
      text = `${rel.name} est touché par ton cadeau. Complicité +12.`;
      tone = "positif";
      break;
    case "sortir":
      rel.closeness = clampC(rel.closeness + 7);
      char.stats.bonheur = clampS(char.stats.bonheur + 3);
      text = `Belle sortie avec ${rel.name}.`;
      tone = "positif";
      break;
    case "demander_argent": {
      const ok = rng.luckyRoll(0.5 + rel.closeness / 300, char.stats.chance);
      if (ok) {
        const amt = 500 + rng.int(0, 2000);
        char.money += amt;
        rel.closeness = clampC(rel.closeness - 10);
        text = `${rel.name} accepte de te prêter ${amt.toLocaleString("fr-FR")} € (mais le lien se tend).`;
        tone = "positif";
      } else {
        rel.closeness = clampC(rel.closeness - 6);
        text = `${rel.name} refuse et se sent utilisé.`;
        tone = "negatif";
      }
      break;
    }
    case "declarer": {
      const ok = rng.luckyRoll(0.35 + rel.closeness / 250 + char.stats.charisme / 400, char.stats.chance);
      if (ok) {
        rel.kind = "partenaire";
        rel.closeness = clampC(rel.closeness + 15);
        char.stats.bonheur = clampS(char.stats.bonheur + 6);
        if (!char.memory.includes("en_couple")) char.memory.push("en_couple");
        text = `Tu te déclares à ${rel.name}… c'est réciproque ! Vous êtes désormais en couple. 💞`;
        tone = "positif";
      } else {
        rel.closeness = clampC(rel.closeness - 12);
        char.stats.bonheur = clampS(char.stats.bonheur - 3);
        text = `Tu te déclares à ${rel.name}, mais le sentiment n'est pas partagé. Malaise.`;
        tone = "negatif";
      }
      break;
    }
    case "se_marier":
      char.money -= 8000;
      rel.closeness = clampC(rel.closeness + 15);
      char.stats.bonheur = clampS(char.stats.bonheur + 10);
      if (!char.memory.includes("marie")) char.memory.push("marie");
      text = `Tu épouses ${rel.name} ! Un grand jour. 💍`;
      tone = "special";
      break;
    case "faire_enfant": {
      const child: Relationship = { id: "enfant_" + char.age + rng.int(0, 999), name: rng.pick(FIRST_NAMES), kind: "enfant", closeness: 85, alive: true, avatar: randomAvatar("enfant" + char.age + rel.id) };
      char.relationships.push(child);
      char.money -= 5000;
      char.stats.bonheur = clampS(char.stats.bonheur + 8);
      if (!char.memory.includes("parent")) char.memory.push("parent", "goal:famille_atteint");
      text = `${rel.name} et toi accueillez ${child.name}, votre enfant ! 👶`;
      tone = "special";
      break;
    }
    case "reconciliation": {
      const ok = rng.luckyRoll(0.5, char.stats.chance);
      if (ok) {
        rel.closeness = clampC(rel.closeness + 30);
        if (rel.closeness > 20) rel.kind = "ami";
        text = `Contre toute attente, tu fais la paix avec ${rel.name}.`;
        tone = "positif";
      } else {
        rel.closeness = clampC(rel.closeness - 10);
        text = `${rel.name} rejette ta main tendue.`;
        tone = "negatif";
      }
      break;
    }
    case "dispute":
      rel.closeness = clampC(rel.closeness - 15);
      char.stats.bonheur = clampS(char.stats.bonheur - 2);
      text = `Grosse dispute avec ${rel.name}. Le lien se dégrade.`;
      tone = "negatif";
      break;
    case "rompre":
      rel.closeness = clampC(rel.closeness - 80);
      char.stats.bonheur = clampS(char.stats.bonheur - 6);
      char.meta.mentalHealth = clampS(char.meta.mentalHealth - 4);
      char.memory = char.memory.filter((t) => t !== "en_couple");
      if (!char.memory.includes("celibataire")) char.memory.push("celibataire");
      rel.kind = "ami";
      text = `Tu romps avec ${rel.name}. Une page se tourne, douloureusement.`;
      tone = "negatif";
      break;
    case "couper_ponts":
      char.relationships = char.relationships.filter((r) => r.id !== rel.id);
      text = `Tu coupes définitivement les ponts avec ${rel.name}.`;
      tone = "neutre";
      break;
    case "menacer":
      rel.closeness = clampC(rel.closeness - 20);
      char.stats.charisme = clampS(char.stats.charisme + 1);
      text = `Tu intimides ${rel.name}, qui file désormais doux.`;
      tone = "neutre";
      break;
    case "agresser": {
      const caught = rng.luckyRoll(0.4, 100 - char.stats.chance); // plus de chance = moins pris
      rel.closeness = clampC(rel.closeness - 60);
      char.meta.mentalHealth = clampS(char.meta.mentalHealth - 2);
      text = narrateAssault(rng, rel.name, caught);
      if (caught) incarcerate(char, 1, "Coups et blessures volontaires");
      tone = "negatif";
      break;
    }
    case "eliminer": {
      // Succès du crime pondéré par l'intelligence/chance ; sinon on se fait prendre.
      const gotAway = rng.luckyRoll(0.35 + char.stats.intelligence / 500, char.stats.chance);
      rel.alive = false;
      char.relationships = char.relationships.filter((r) => r.id !== rel.id);
      char.meta.mentalHealth = clampS(char.meta.mentalHealth - 12);
      char.stats.bonheur = clampS(char.stats.bonheur - 6);
      if (!char.memory.includes("meurtrier")) char.memory.push("meurtrier", "hors_la_loi");
      text = "🔪 " + narrateMurder(rng, rel.name, !gotAway);
      if (!gotAway) incarcerate(char, 15, "Meurtre");
      tone = "special";
      break;
    }
    default:
      text = `Rien ne se passe avec ${rel.name}.`;
  }

  const entry: LifeLogEntry = { age: char.age, text, tone };
  char.history.push(entry);
  return entry;
}
