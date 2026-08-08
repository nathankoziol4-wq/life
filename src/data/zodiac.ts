/**
 * Astrologie / karma — couche fun & mystique optionnelle.
 * Petits modificateurs de chance + tags "clin d'œil" pour des micro-événements.
 */
import type { ChoiceOption } from "../types";

function sign(id: string, label: string, icon: string, luck: number, extra: ChoiceOption["modifiers"] = []): ChoiceOption {
  return {
    id,
    label,
    icon,
    description: `Signe ${label}`,
    tags: ["zodiac:" + id],
    modifiers: [
      { target: "chance", op: "add", value: luck, label: "Influence astrale", source: `Signe : ${label}` },
      ...extra,
    ],
  };
}

export const ZODIAC_SIGNS: ChoiceOption[] = [
  sign("belier", "Bélier", "♈", 2, [{ target: "physique", op: "add", value: 1, label: "Énergie du Bélier", source: "Signe : Bélier" }]),
  sign("taureau", "Taureau", "♉", 1, [{ target: "discipline", op: "add", value: 1, label: "Ténacité du Taureau", source: "Signe : Taureau" }]),
  sign("gemeaux", "Gémeaux", "♊", 1, [{ target: "charisme", op: "add", value: 1, label: "Vivacité des Gémeaux", source: "Signe : Gémeaux" }]),
  sign("cancer", "Cancer", "♋", 0, [{ target: "bonheur", op: "add", value: 1, label: "Sensibilité du Cancer", source: "Signe : Cancer" }]),
  sign("lion", "Lion", "♌", 2, [{ target: "charisme", op: "add", value: 2, label: "Aura du Lion", source: "Signe : Lion" }]),
  sign("vierge", "Vierge", "♍", 0, [{ target: "intelligence", op: "add", value: 1, label: "Rigueur de la Vierge", source: "Signe : Vierge" }]),
  sign("balance", "Balance", "♎", 1, []),
  sign("scorpion", "Scorpion", "♏", 3, []),
  sign("sagittaire", "Sagittaire", "♐", 3, [{ target: "chance", op: "add", value: 1, label: "Optimisme du Sagittaire", source: "Signe : Sagittaire" }]),
  sign("capricorne", "Capricorne", "♑", 0, [{ target: "discipline", op: "add", value: 2, label: "Ambition du Capricorne", source: "Signe : Capricorne" }]),
  sign("verseau", "Verseau", "♒", 1, [{ target: "creativite", op: "add", value: 2, label: "Originalité du Verseau", source: "Signe : Verseau" }]),
  sign("poissons", "Poissons", "♓", 1, [{ target: "creativite", op: "add", value: 2, label: "Imagination des Poissons", source: "Signe : Poissons" }]),
];

export const ZODIAC_BY_ID = Object.fromEntries(ZODIAC_SIGNS.map((z) => [z.id, z]));
