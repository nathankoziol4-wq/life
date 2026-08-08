/**
 * Structure familiale — impacte le Bonheur/stabilité de départ, la santé mentale,
 * et ouvre des branches d'événements relationnels (deuil, réunion, abandon...).
 */
import type { ChoiceOption } from "../types";

function fam(
  id: string,
  label: string,
  icon: string,
  desc: string,
  mods: ChoiceOption["modifiers"],
  tags: string[]
): ChoiceOption {
  return { id, label, icon, description: desc, tags: ["family:" + id, ...tags], modifiers: mods };
}

const S = (id: string) => `Famille : ${id}`;

export const FAMILY_STRUCTURES: ChoiceOption[] = [
  fam("maries", "Parents mariés", "👨‍👩‍👧", "Foyer stable et uni. Le scénario le plus doux.", [
    { target: "bonheur", op: "add", value: 6, label: "Foyer stable", source: S("Parents mariés") },
    { target: "mentalHealth", op: "add", value: 6, label: "Sécurité affective", source: S("Parents mariés") },
  ], ["stable_home"]),
  fam("monoparental", "Monoparental", "👩‍👧", "Élevé par un seul parent. Lien fort mais ressources limitées.", [
    { target: "bonheur", op: "add", value: -2, label: "Absence d'un parent", source: S("Monoparental") },
    { target: "discipline", op: "add", value: 4, label: "Autonomie précoce", source: S("Monoparental") },
    { target: "startingMoney", op: "add", value: -1000, label: "Un seul revenu", source: S("Monoparental") },
  ], ["single_parent"]),
  fam("recomposee", "Famille recomposée", "👨‍👩‍👧‍👦", "Beaux-parents, demi-frères et sœurs. Relations complexes.", [
    { target: "bonheur", op: "add", value: -1, label: "Réajustements familiaux", source: S("Recomposée") },
    { target: "charisme", op: "add", value: 3, label: "Naviguer les relations", source: S("Recomposée") },
  ], ["blended_family"]),
  fam("adopte", "Adopté", "🤱", "Recueilli par une famille aimante. Une quête d'identité en filigrane.", [
    { target: "bonheur", op: "add", value: 2, label: "Famille choisie", source: S("Adopté") },
    { target: "mentalHealth", op: "add", value: -3, label: "Question des origines", source: S("Adopté") },
  ], ["adopted", "identity_quest"]),
  fam("orphelin", "Orphelin", "🕯️", "Parents disparus tôt. Élevé en institution ou par la famille élargie.", [
    { target: "bonheur", op: "add", value: -10, label: "Deuil précoce", source: S("Orphelin") },
    { target: "mentalHealth", op: "add", value: -8, label: "Perte fondatrice", source: S("Orphelin") },
    { target: "discipline", op: "add", value: 8, label: "Résilience forgée", source: S("Orphelin") },
    { target: "networkQuality", op: "add", value: -15, label: "Pas de réseau familial", source: S("Orphelin") },
  ], ["orphan", "hardship"]),
];

export const FAMILY_BY_ID = Object.fromEntries(FAMILY_STRUCTURES.map((f) => [f.id, f]));
