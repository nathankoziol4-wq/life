/**
 * Génération du personnage : transforme un CharacterCreation (les choix du menu)
 * en Character vivant, en collectant puis appliquant TOUS les modifiers empilés.
 * Fournit aussi `collectModifiers` / `computeImpact` utilisés par l'écran de récap
 * pour montrer l'effet cumulé AVANT validation.
 */
import type {
  CharacterCreation,
  Character,
  Modifier,
  Stats,
  MetaStats,
  StatKey,
  MetaKey,
  Relationship,
} from "../types";
import { STAT_KEYS } from "../types";
import { applyModifiers, clampStat, type ImpactBreakdown } from "./modifiers";
import { COUNTRY_BY_ID } from "../data/countries";
import { ERA_BY_ID } from "../data/eras";
import { SOCIAL_BY_ID } from "../data/socialClasses";
import { FAMILY_BY_ID } from "../data/familyStructures";
import { BUILD_BY_ID, PREDISPOSITION_BY_ID, DISABILITY_BY_ID } from "../data/physique";
import { TRAIT_BY_ID } from "../data/traits";
import { TALENT_BY_ID, CHALLENGE_BY_ID } from "../data/talents";
import { ZODIAC_BY_ID } from "../data/zodiac";
import { Rng, seedFromString } from "./rng";

/** Valeurs de base neutres avant application des choix. */
const BASE_META: MetaStats = {
  lifeExpectancy: 78,
  startingMoney: 0,
  incomeMultiplier: 1,
  educationCostMultiplier: 1,
  healthcareQuality: 60,
  crimeExposure: 30,
  networkQuality: 30,
  inheritance: 0,
  familyDebt: 0,
  learningMultiplier: 1,
  fertility: 50,
  addictionRisk: 10,
  mentalHealth: 60,
};

/** Points de stats de départ avant répartition manuelle du joueur. */
export const BASE_STAT = 30;
/** Pool de points à répartir librement (onglet 3). */
export const STAT_POOL = 120;
/** Bornes de répartition manuelle par stat. */
export const STAT_MIN_ALLOC = 0;
export const STAT_MAX_ALLOC = 40;

/**
 * Rassemble tous les modifiers issus des choix de création.
 * Robuste aux choix partiels (utilisé pendant que le joueur remplit le menu).
 */
export function collectModifiers(c: Partial<CharacterCreation>): Modifier[] {
  const mods: Modifier[] = [];
  const push = (opt?: { modifiers: Modifier[] }) => {
    if (opt) mods.push(...opt.modifiers);
  };

  push(COUNTRY_BY_ID[c.countryId ?? ""]);
  push(ERA_BY_ID[c.eraId ?? ""]);
  push(SOCIAL_BY_ID[c.socialClassId ?? ""]);
  push(FAMILY_BY_ID[c.familyStructureId ?? ""]);
  push(BUILD_BY_ID[c.build ?? ""]);
  (c.genetics?.predispositions ?? []).forEach((id) => push(PREDISPOSITION_BY_ID[id]));
  if (c.genetics?.disability) push(DISABILITY_BY_ID[c.genetics.disability]);
  (c.traitIds ?? []).forEach((id) => push(TRAIT_BY_ID[id]));
  (c.talentIds ?? []).forEach((id) => push(TALENT_BY_ID[id]));
  (c.challengeIds ?? []).forEach((id) => push(CHALLENGE_BY_ID[id]));
  push(ZODIAC_BY_ID[c.zodiacId ?? ""]);

  // Apparence : influence charisme et relations (modifier dérivé).
  if (typeof c.appearance === "number") {
    mods.push({ target: "charisme", op: "add", value: Math.round((c.appearance - 50) / 6), label: "Attrait physique", source: "Apparence" });
  }
  // Taille extrême : petit bonus/malus physique + charisme.
  if (typeof c.height === "number") {
    const d = c.height - 172;
    if (Math.abs(d) > 8) {
      mods.push({ target: "physique", op: "add", value: Math.round(d / 12), label: "Stature", source: "Taille" });
    }
  }
  // Karma de départ : petit levier de chance.
  if (typeof c.startingKarma === "number" && c.startingKarma !== 0) {
    mods.push({ target: "chance", op: "add", value: Math.round(c.startingKarma / 12), label: "Karma de départ", source: "Karma" });
  }

  return mods;
}

export interface ImpactResult {
  stats: Stats;
  meta: MetaStats;
  money: number;
  lifeExpectancy: number;
  statBreakdown: Record<StatKey, ImpactBreakdown | undefined>;
  metaBreakdown: Record<MetaKey, ImpactBreakdown | undefined>;
  allModifiers: Modifier[];
}

/**
 * Calcule l'impact cumulé pour l'écran de récap : stats finales + détail.
 * `allocated` sont les points répartis manuellement (onglet 3).
 */
export function computeImpact(c: Partial<CharacterCreation>): ImpactResult {
  const mods = collectModifiers(c);

  // Base des stats = base neutre + répartition manuelle.
  const statBase: Record<string, number> = {};
  for (const k of STAT_KEYS) {
    statBase[k] = BASE_STAT + (c.allocatedStats?.[k] ?? 0);
  }
  const metaBase: Record<string, number> = { ...BASE_META };

  const statMods = mods.filter((m) => STAT_KEYS.includes(m.target as StatKey));
  const metaMods = mods.filter((m) => !STAT_KEYS.includes(m.target as StatKey));

  const statRes = applyModifiers(statBase, statMods);
  const metaRes = applyModifiers(metaBase, metaMods);

  const stats = {} as Stats;
  const statBreakdown = {} as Record<StatKey, ImpactBreakdown | undefined>;
  for (const k of STAT_KEYS) {
    stats[k] = clampStat(statRes.values[k]);
    statBreakdown[k] = statRes.breakdown[k];
  }

  const meta = {} as MetaStats;
  const metaBreakdown = {} as Record<MetaKey, ImpactBreakdown | undefined>;
  (Object.keys(BASE_META) as MetaKey[]).forEach((k) => {
    meta[k] = Math.round(metaRes.values[k]);
    metaBreakdown[k] = metaRes.breakdown[k];
  });

  const money = Math.round(meta.startingMoney - meta.familyDebt);

  return {
    stats,
    meta,
    money,
    lifeExpectancy: meta.lifeExpectancy,
    statBreakdown,
    metaBreakdown,
    allModifiers: mods,
  };
}

/** Prénoms/noms pour peupler les relations familiales. */
const FIRST_NAMES = ["Camille", "Alex", "Sam", "Noa", "Lou", "Jules", "Léa", "Marius", "Inès", "Théo", "Nina", "Gabriel"];

function makeRelative(rng: Rng, kind: Relationship["kind"], closeness: number): Relationship {
  return {
    id: kind + "_" + rng.int(1000, 9999),
    name: rng.pick(FIRST_NAMES),
    kind,
    closeness,
    alive: true,
  };
}

/** Construit le personnage vivant final à partir de la création validée. */
export function createCharacter(c: CharacterCreation): Character {
  const impact = computeImpact(c);
  const rng = new Rng(seedFromString(c.firstName + c.lastName + c.countryId));

  // Relations de départ selon la structure familiale.
  const relationships: Relationship[] = [];
  const fam = c.familyStructureId;
  if (fam !== "orphelin") {
    relationships.push(makeRelative(rng, "parent", 70 + rng.int(-15, 15)));
    if (fam === "maries" || fam === "recomposee" || fam === "adopte") {
      relationships.push(makeRelative(rng, "parent", 65 + rng.int(-15, 20)));
    }
    if (rng.chance(0.6)) relationships.push(makeRelative(rng, "fratrie", 55 + rng.int(-20, 25)));
  }

  return {
    creation: c,
    age: 0,
    alive: true,
    stats: impact.stats,
    meta: impact.meta,
    money: impact.money,
    lifeExpectancy: impact.lifeExpectancy,
    memory: gatherCreationTags(c),
    relationships,
    educationLevel: 0,
    history: [
      {
        age: 0,
        text: `${c.firstName} ${c.lastName} vient au monde.`,
        tone: "special",
      },
    ],
    conditions: c.challengeIds.includes("maladie_chronique") ? ["chronic"] : [],
    addictions: [],
  };
}

/** Agrège tous les tags des choix de création dans la mémoire initiale. */
export function gatherCreationTags(c: Partial<CharacterCreation>): string[] {
  const tags = new Set<string>();
  const add = (opt?: { tags?: string[] }) => opt?.tags?.forEach((t) => tags.add(t));
  add(COUNTRY_BY_ID[c.countryId ?? ""]);
  add(ERA_BY_ID[c.eraId ?? ""]);
  add(SOCIAL_BY_ID[c.socialClassId ?? ""]);
  add(FAMILY_BY_ID[c.familyStructureId ?? ""]);
  add(BUILD_BY_ID[c.build ?? ""]);
  (c.genetics?.predispositions ?? []).forEach((id) => add(PREDISPOSITION_BY_ID[id]));
  if (c.genetics?.disability) add(DISABILITY_BY_ID[c.genetics.disability]);
  (c.traitIds ?? []).forEach((id) => add(TRAIT_BY_ID[id]));
  (c.talentIds ?? []).forEach((id) => add(TALENT_BY_ID[id]));
  (c.challengeIds ?? []).forEach((id) => add(CHALLENGE_BY_ID[id]));
  add(ZODIAC_BY_ID[c.zodiacId ?? ""]);
  return Array.from(tags);
}
