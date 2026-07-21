/**
 * Système d'avatars — traduit les choix d'apparence en paramètres de couleurs/
 * styles pour le composant SVG `Avatar`. Fournit aussi un générateur d'avatars
 * aléatoires (déterministes par graine) pour les PNJ (connaissances).
 */
import type { AvatarParams, CharacterCreation } from "../types";
import { Rng, seedFromString } from "./rng";

export const SKIN_COLORS: Record<string, string> = {
  tres_clair: "#f3d3bd",
  clair: "#e7b48c",
  mat: "#c88a5c",
  fonce: "#8d5a34",
  tres_fonce: "#5b3a22",
};

export const HAIR_COLORS: Record<string, string> = {
  brun: "#4a2f1b",
  blond: "#e3c063",
  roux: "#b5581f",
  noir: "#1c1a1a",
  chatain: "#6b4423",
  rase: "#2e2a28",
};

export const EYE_COLORS: Record<string, string> = {
  marron: "#5b3a1a",
  bleu: "#4a90d9",
  vert: "#3fa34d",
  noisette: "#8a6a3a",
  gris: "#8a8f98",
};

export const HAIR_SHAPES = [
  { id: "court", label: "Courte", icon: "💇" },
  { id: "long", label: "Longue", icon: "👩" },
  { id: "boucle", label: "Bouclée", icon: "🧑‍🦱" },
  { id: "afro", label: "Afro", icon: "🧑🏿" },
  { id: "chignon", label: "Chignon", icon: "🙎" },
  { id: "rase", label: "Rasée", icon: "🧑‍🦲" },
];

export const ACCESSORIES = [
  { id: "aucun", label: "Aucun", icon: "—" },
  { id: "lunettes", label: "Lunettes", icon: "👓" },
  { id: "soleil", label: "Lunettes de soleil", icon: "🕶️" },
  { id: "barbe", label: "Barbe", icon: "🧔" },
  { id: "boucle_oreille", label: "Boucle d'oreille", icon: "🦻" },
  { id: "chapeau", label: "Chapeau", icon: "🎩" },
];

/** Construit l'avatar du joueur à partir de ses choix de création. */
export function avatarFromCreation(c: CharacterCreation): AvatarParams {
  return {
    skin: SKIN_COLORS[c.skinToneId] ?? SKIN_COLORS.clair,
    hair: HAIR_COLORS[c.hairId] ?? HAIR_COLORS.brun,
    hairStyle: c.hairId === "rase" ? "rase" : c.hairStyleId,
    eyes: EYE_COLORS[c.eyesId] ?? EYE_COLORS.marron,
    accessory: c.accessoryId && c.accessoryId !== "aucun" ? c.accessoryId : undefined,
    feature: c.featureId && c.featureId !== "aucun_feature" ? c.featureId : undefined,
    sex: c.sex,
  };
}

const SKIN_KEYS = Object.keys(SKIN_COLORS);
const HAIR_KEYS = Object.keys(HAIR_COLORS);
const EYE_KEYS = Object.keys(EYE_COLORS);
const STYLE_KEYS = HAIR_SHAPES.map((h) => h.id);

/** Génère un avatar aléatoire déterministe (pour un PNJ), à partir d'une graine. */
export function randomAvatar(seed: string, sex: AvatarParams["sex"] = "non-binaire"): AvatarParams {
  const rng = new Rng(seedFromString(seed));
  return {
    skin: SKIN_COLORS[rng.pick(SKIN_KEYS)],
    hair: HAIR_COLORS[rng.pick(HAIR_KEYS)],
    hairStyle: rng.pick(STYLE_KEYS),
    eyes: EYE_COLORS[rng.pick(EYE_KEYS)],
    accessory: rng.chance(0.35) ? rng.pick(["lunettes", "barbe", "chapeau", "soleil"]) : undefined,
    feature: rng.chance(0.25) ? rng.pick(["taches", "cicatrice"]) : undefined,
    sex,
  };
}

/** Renvoie l'avatar d'une relation (stocké, sinon dérivé de son id). */
export function avatarForRelationship(rel: { id: string; avatar?: AvatarParams }): AvatarParams {
  return rel.avatar ?? randomAvatar(rel.id);
}
