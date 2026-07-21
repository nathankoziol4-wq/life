/**
 * Génération d'un personnage 100 % aléatoire mais valide — pour le mode
 * "Vie express" du menu (jouer instantanément, une vie différente à chaque fois).
 */
import type { CharacterCreation, Stats, StatKey } from "../types";
import { STAT_KEYS } from "../types";
import { COUNTRIES } from "../data/countries";
import { ERAS } from "../data/eras";
import { SOCIAL_CLASSES } from "../data/socialClasses";
import { FAMILY_STRUCTURES } from "../data/familyStructures";
import { BUILDS, PREDISPOSITIONS, BLOOD_TYPES } from "../data/physique";
import { TRAITS } from "../data/traits";
import { TALENTS } from "../data/talents";
import { ZODIAC_SIGNS } from "../data/zodiac";
import {
  CITY_TYPES, RELIGIONS, SKIN_TONES, HAIR_STYLES, EYE_COLORS, FEATURES, VOICES,
  ORIENTATIONS, VALUES, FEARS, TEMPERAMENTS, VICES, LIFE_GOALS,
} from "../data/customization";
import { HAIR_SHAPES, ACCESSORIES } from "./avatar";
import { STAT_POOL, STAT_MAX_ALLOC } from "./character";

const rand = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;

const FIRST = ["Camille", "Alex", "Sam", "Noa", "Lou", "Jules", "Léa", "Marius", "Inès", "Théo", "Nina", "Gabriel", "Yasmine", "Kenji", "Amara", "Diego", "Sofia", "Liam", "Zoé", "Ravi"];
const LAST = ["Martin", "Dubois", "Nakamura", "Okafor", "Silva", "Kowalski", "Rossi", "Andersson", "Haddad", "Nguyen", "Ivanov", "Costa", "Diallo", "Yılmaz"];

/** Répartit aléatoirement le pool de points de stats (max par stat respecté). */
function randomStats(): Stats {
  const s = STAT_KEYS.reduce((o, k) => ({ ...o, [k]: 0 }), {} as Record<StatKey, number>);
  let pool = STAT_POOL;
  let guard = 0;
  while (pool > 0 && guard < 500) {
    guard++;
    const k = rand(STAT_KEYS);
    if (s[k] < STAT_MAX_ALLOC) {
      s[k] += 5;
      pool -= 5;
    }
  }
  return s;
}

/** Choisit `n` éléments distincts. */
function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}

export function randomCreation(): CharacterCreation {
  return {
    firstName: rand(FIRST),
    lastName: rand(LAST),
    sex: rand(["homme", "femme", "non-binaire"] as const),
    countryId: rand(COUNTRIES).id,
    eraId: rand(ERAS).id,
    socialClassId: rand(SOCIAL_CLASSES).id,
    familyStructureId: rand(FAMILY_STRUCTURES).id,
    cityTypeId: rand(CITY_TYPES).id,
    religionId: rand(RELIGIONS).id,
    appearance: 20 + Math.floor(Math.random() * 75),
    height: 150 + Math.floor(Math.random() * 45),
    build: rand(BUILDS).id,
    genetics: {
      bloodType: rand(BLOOD_TYPES),
      predispositions: chance(0.5) ? sample(PREDISPOSITIONS, 1 + Math.floor(Math.random() * 2)).map((p) => p.id) : [],
      allergies: [],
      disability: "aucun",
    },
    skinToneId: rand(SKIN_TONES).id,
    hairId: rand(HAIR_STYLES).id,
    hairStyleId: rand(HAIR_SHAPES).id,
    eyesId: rand(EYE_COLORS).id,
    featureId: rand(FEATURES).id,
    accessoryId: chance(0.5) ? rand(ACCESSORIES).id : "aucun",
    voiceId: rand(VOICES).id,
    allocatedStats: randomStats(),
    traitIds: sample(TRAITS, 3 + Math.floor(Math.random() * 2)).map((t) => t.id),
    moralAlignment: Math.floor(Math.random() * 201) - 100,
    orientationId: rand(ORIENTATIONS).id,
    valueIds: sample(VALUES, 1 + Math.floor(Math.random() * 2)).map((v) => v.id),
    fearIds: sample(FEARS, 1).map((f) => f.id),
    temperamentId: rand(TEMPERAMENTS).id,
    talentIds: chance(0.7) ? sample(TALENTS, 1 + Math.floor(Math.random() * 2)).map((t) => t.id) : [],
    challengeIds: [],
    viceIds: chance(0.4) ? sample(VICES, 1).map((v) => v.id) : [],
    lifeGoalId: rand(LIFE_GOALS).id,
    zodiacId: rand(ZODIAC_SIGNS).id,
    startingKarma: Math.floor(Math.random() * 101) - 50,
  };
}
