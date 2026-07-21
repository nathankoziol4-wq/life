/**
 * Milieu social des parents — 6 paliers.
 * Impacte argent de départ, héritage, dettes, réseau, qualité d'éducation,
 * et pose des plafonds/planchers implicites via les stats de départ (bonheur,
 * discipline). Les tags ouvrent/ferment des branches d'événements.
 */
import type { ChoiceOption } from "../types";

function social(
  id: string,
  label: string,
  icon: string,
  desc: string,
  m: { money: number; inheritance: number; debt: number; network: number; eduMult: number },
  extra: ChoiceOption["modifiers"] = [],
  tags: string[] = []
): ChoiceOption {
  const src = `Milieu social : ${label}`;
  return {
    id,
    label,
    icon,
    description: desc,
    tags: ["social:" + id, ...tags],
    modifiers: [
      { target: "startingMoney", op: "add", value: m.money, label: "Patrimoine familial", source: src },
      { target: "inheritance", op: "add", value: m.inheritance, label: "Héritage potentiel", source: src },
      { target: "familyDebt", op: "add", value: m.debt, label: "Dettes familiales", source: src },
      { target: "networkQuality", op: "add", value: m.network, label: "Réseau", source: src },
      { target: "educationCostMultiplier", op: "mult", value: m.eduMult, label: "Accès à l'éducation", source: src },
      ...extra,
    ],
  };
}

export const SOCIAL_CLASSES: ChoiceOption[] = [
  social("precaire", "Précaire", "🥫", "Fins de mois impossibles, logement instable. La survie avant les rêves.", { money: -1500, inheritance: 0, debt: 8000, network: 5, eduMult: 1.4 }, [
    { target: "bonheur", op: "add", value: -8, label: "Stress matériel", source: "Milieu social : Précaire" },
    { target: "discipline", op: "add", value: 6, label: "Débrouillardise", source: "Milieu social : Précaire" },
  ], ["poverty", "hardship"]),
  social("populaire", "Populaire", "🔧", "Parents ouvriers/employés. Valeurs de travail, peu de filet de sécurité.", { money: 500, inheritance: 5000, debt: 2000, network: 20, eduMult: 1.1 }, [
    { target: "discipline", op: "add", value: 3, label: "Éthique de travail", source: "Milieu social : Populaire" },
  ], ["working_class"]),
  social("moyen", "Classe moyenne", "🏠", "Confort mesuré, maison, vacances annuelles. Le socle stable.", { money: 6000, inheritance: 40000, debt: 3000, network: 40, eduMult: 0.9 }, [], ["middle_class"]),
  social("aise", "Aisé", "🏡", "CSP+, réseau utile, écoles privées à portée.", { money: 25000, inheritance: 150000, debt: 0, network: 65, eduMult: 0.6 }, [
    { target: "charisme", op: "add", value: 3, label: "Aisance sociale", source: "Milieu social : Aisé" },
  ], ["upper_middle"]),
  social("fortune", "Fortuné", "💼", "Grande bourgeoisie, patrimoine, connexions puissantes.", { money: 120000, inheritance: 900000, debt: 0, network: 85, eduMult: 0.3 }, [
    { target: "charisme", op: "add", value: 5, label: "Élevé dans l'élite", source: "Milieu social : Fortuné" },
    { target: "bonheur", op: "add", value: 4, label: "Sécurité matérielle", source: "Milieu social : Fortuné" },
  ], ["wealthy", "elite_network"]),
  social("dynastie", "Ultra-riche / dynastie", "👑", "Nom de famille connu, empire familial, jet privé. Attentes écrasantes.", { money: 800000, inheritance: 20000000, debt: 0, network: 98, eduMult: 0.1 }, [
    { target: "charisme", op: "add", value: 8, label: "Aura de dynastie", source: "Milieu social : Dynastie" },
    { target: "bonheur", op: "add", value: -4, label: "Pression de l'héritier", source: "Milieu social : Dynastie" },
  ], ["dynasty", "elite_network", "famous_family"]),
];

export const SOCIAL_BY_ID = Object.fromEntries(SOCIAL_CLASSES.map((s) => [s.id, s]));
