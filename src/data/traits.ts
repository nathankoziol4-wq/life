/**
 * Traits de caractère (choisir 3–5 parmi 20+). Chaque trait pose un tag exploité
 * par le moteur d'événements pour ouvrir/fermer des choix et moduler les réactions
 * des PNJ. `moralAxis` alimente aussi l'orientation morale suggérée.
 */
import type { Trait } from "../types";

function trait(
  id: string,
  label: string,
  icon: string,
  desc: string,
  moralAxis: number,
  mods: Trait["modifiers"] = []
): Trait {
  return { id, label, icon, description: desc, moralAxis, tags: ["trait:" + id], modifiers: mods };
}

const S = (id: string) => `Trait : ${id}`;

export const TRAITS: Trait[] = [
  trait("ambitieux", "Ambitieux", "🚀", "La réussite avant tout.", -0.2, [
    { target: "discipline", op: "add", value: 4, label: "Ambition", source: S("Ambitieux") },
  ]),
  trait("anxieux", "Anxieux", "😰", "Le stress est ton compagnon.", 0, [
    { target: "mentalHealth", op: "add", value: -8, label: "Anxiété", source: S("Anxieux") },
    { target: "intelligence", op: "add", value: 2, label: "Hypervigilance", source: S("Anxieux") },
  ]),
  trait("impulsif", "Impulsif", "⚡", "Tu agis avant de réfléchir.", -0.1, [
    { target: "discipline", op: "add", value: -6, label: "Impulsivité", source: S("Impulsif") },
    { target: "chance", op: "add", value: 2, label: "Ose le hasard", source: S("Impulsif") },
  ]),
  trait("loyal", "Loyal", "🤝", "Fidèle jusqu'au bout.", 0.6, [
    { target: "charisme", op: "add", value: 2, label: "Loyauté appréciée", source: S("Loyal") },
  ]),
  trait("manipulateur", "Manipulateur", "🎭", "Tu tires les ficelles.", -0.9, [
    { target: "charisme", op: "add", value: 5, label: "Manipulation", source: S("Manipulateur") },
    { target: "bonheur", op: "add", value: -2, label: "Relations calculées", source: S("Manipulateur") },
  ]),
  trait("empathique", "Empathique", "💗", "Tu ressens la douleur des autres.", 0.9, [
    { target: "charisme", op: "add", value: 3, label: "Empathie", source: S("Empathique") },
    { target: "bonheur", op: "add", value: 2, label: "Liens sincères", source: S("Empathique") },
  ]),
  trait("rancunier", "Rancunier", "🗡️", "Tu n'oublies jamais une trahison.", -0.5, [
    { target: "bonheur", op: "add", value: -3, label: "Rancune", source: S("Rancunier") },
  ]),
  trait("optimiste", "Optimiste", "🌅", "Le verre est toujours à moitié plein.", 0.3, [
    { target: "bonheur", op: "add", value: 8, label: "Optimisme", source: S("Optimiste") },
    { target: "mentalHealth", op: "add", value: 5, label: "Résilience mentale", source: S("Optimiste") },
  ]),
  trait("pessimiste", "Pessimiste", "🌧️", "Tu vois venir le pire.", -0.1, [
    { target: "bonheur", op: "add", value: -6, label: "Pessimisme", source: S("Pessimiste") },
  ]),
  trait("charismatique", "Charismatique", "✨", "On te suit naturellement.", 0, [
    { target: "charisme", op: "add", value: 8, label: "Charisme naturel", source: S("Charismatique") },
  ]),
  trait("curieux", "Curieux", "🔍", "Tu veux tout comprendre.", 0.2, [
    { target: "intelligence", op: "add", value: 5, label: "Curiosité", source: S("Curieux") },
    { target: "creativite", op: "add", value: 3, label: "Ouverture d'esprit", source: S("Curieux") },
  ]),
  trait("paresseux", "Paresseux", "😴", "L'effort, c'est surfait.", -0.1, [
    { target: "discipline", op: "add", value: -8, label: "Paresse", source: S("Paresseux") },
    { target: "bonheur", op: "add", value: 3, label: "Sans pression", source: S("Paresseux") },
  ]),
  trait("perfectionniste", "Perfectionniste", "📐", "Rien n'est jamais assez bien.", 0, [
    { target: "discipline", op: "add", value: 6, label: "Rigueur", source: S("Perfectionniste") },
    { target: "mentalHealth", op: "add", value: -4, label: "Autocritique", source: S("Perfectionniste") },
  ]),
  trait("courageux", "Courageux", "🦁", "Tu affrontes tes peurs.", 0.4, [
    { target: "physique", op: "add", value: 2, label: "Courage", source: S("Courageux") },
    { target: "chance", op: "add", value: 3, label: "La fortune sourit aux audacieux", source: S("Courageux") },
  ]),
  trait("timide", "Timide", "🙈", "Les autres t'intimident.", 0.1, [
    { target: "charisme", op: "add", value: -5, label: "Timidité", source: S("Timide") },
    { target: "creativite", op: "add", value: 3, label: "Monde intérieur riche", source: S("Timide") },
  ]),
  trait("genereux", "Généreux", "🎁", "Tu donnes sans compter.", 0.8, [
    { target: "charisme", op: "add", value: 3, label: "Générosité", source: S("Généreux") },
    { target: "bonheur", op: "add", value: 3, label: "Joie de donner", source: S("Généreux") },
  ]),
  trait("cupide", "Cupide", "🤑", "L'argent d'abord.", -0.8, [
    { target: "discipline", op: "add", value: 3, label: "Soif de gain", source: S("Cupide") },
    { target: "charisme", op: "add", value: -2, label: "Réputation d'avare", source: S("Cupide") },
  ]),
  trait("creatif", "Créatif", "🎨", "Les idées jaillissent.", 0.2, [
    { target: "creativite", op: "add", value: 8, label: "Créativité débordante", source: S("Créatif") },
  ]),
  trait("discipline_trait", "Discipliné", "⏱️", "Tu tiens tes objectifs.", 0.1, [
    { target: "discipline", op: "add", value: 8, label: "Discipline", source: S("Discipliné") },
  ]),
  trait("rebelle", "Rebelle", "🤘", "Tu refuses l'autorité.", -0.2, [
    { target: "creativite", op: "add", value: 4, label: "Esprit rebelle", source: S("Rebelle") },
    { target: "discipline", op: "add", value: -3, label: "Rejet des règles", source: S("Rebelle") },
  ]),
  trait("stoique", "Stoïque", "🗿", "Rien ne t'ébranle.", 0.2, [
    { target: "mentalHealth", op: "add", value: 10, label: "Stoïcisme", source: S("Stoïque") },
    { target: "bonheur", op: "add", value: -2, label: "Émotions bridées", source: S("Stoïque") },
  ]),
];

export const TRAIT_BY_ID = Object.fromEntries(TRAITS.map((t) => [t.id, t]));
