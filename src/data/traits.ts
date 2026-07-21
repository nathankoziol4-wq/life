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
  trait("sociable", "Sociable", "🥳", "Tu adores être entouré.", 0.3, [
    { target: "charisme", op: "add", value: 4, label: "Sociabilité", source: S("Sociable") },
    { target: "bonheur", op: "add", value: 3, label: "Énergie sociale", source: S("Sociable") },
  ]),
  trait("solitaire", "Solitaire", "🐺", "Tu recharges tes batteries seul.", 0, [
    { target: "creativite", op: "add", value: 4, label: "Introspection", source: S("Solitaire") },
    { target: "charisme", op: "add", value: -3, label: "Peu de contacts", source: S("Solitaire") },
  ]),
  trait("calculateur", "Calculateur", "♟️", "Tu anticipes trois coups à l'avance.", -0.4, [
    { target: "intelligence", op: "add", value: 4, label: "Stratégie", source: S("Calculateur") },
    { target: "discipline", op: "add", value: 2, label: "Sang-froid", source: S("Calculateur") },
  ]),
  trait("naif", "Naïf", "🐣", "Tu crois facilement les autres.", 0.3, [
    { target: "charisme", op: "add", value: 2, label: "Candeur attachante", source: S("Naïf") },
    { target: "intelligence", op: "add", value: -3, label: "Crédulité", source: S("Naïf") },
  ]),
  trait("resilient", "Résilient", "🌱", "Tu rebondis après chaque coup dur.", 0.3, [
    { target: "mentalHealth", op: "add", value: 8, label: "Résilience", source: S("Résilient") },
    { target: "discipline", op: "add", value: 2, label: "Ténacité", source: S("Résilient") },
  ]),
  trait("colerique_trait", "Soupe au lait", "🌋", "Tu t'emportes pour un rien.", -0.2, [
    { target: "charisme", op: "add", value: -3, label: "Emportements", source: S("Soupe au lait") },
    { target: "physique", op: "add", value: 2, label: "Fougue", source: S("Soupe au lait") },
  ]),
  trait("aventurier", "Aventurier", "🧭", "Tu cherches le frisson et l'inconnu.", 0.1, [
    { target: "chance", op: "add", value: 3, label: "Audace", source: S("Aventurier") },
    { target: "physique", op: "add", value: 2, label: "Endurance", source: S("Aventurier") },
  ]),
  trait("meticuleux", "Méticuleux", "🔬", "Le souci du détail te définit.", 0.1, [
    { target: "intelligence", op: "add", value: 3, label: "Précision", source: S("Méticuleux") },
    { target: "discipline", op: "add", value: 3, label: "Minutie", source: S("Méticuleux") },
  ]),
  trait("charmeur", "Charmeur", "😏", "Tu sais te rendre irrésistible.", -0.1, [
    { target: "charisme", op: "add", value: 6, label: "Séduction", source: S("Charmeur") },
  ]),
  trait("cynique", "Cynique", "🙃", "Tu doutes des bonnes intentions.", -0.4, [
    { target: "intelligence", op: "add", value: 2, label: "Lucidité amère", source: S("Cynique") },
    { target: "bonheur", op: "add", value: -3, label: "Désillusion", source: S("Cynique") },
  ]),
  trait("idealiste", "Idéaliste", "🕊️", "Tu crois en un monde meilleur.", 0.7, [
    { target: "bonheur", op: "add", value: 4, label: "Espoir", source: S("Idéaliste") },
    { target: "charisme", op: "add", value: 2, label: "Inspiration", source: S("Idéaliste") },
  ]),
  trait("workaholic", "Bourreau de travail", "🏗️", "Le travail passe avant tout le reste.", -0.1, [
    { target: "discipline", op: "add", value: 7, label: "Acharnement", source: S("Workaholic") },
    { target: "bonheur", op: "add", value: -3, label: "Vie déséquilibrée", source: S("Workaholic") },
  ]),
  trait("hedoniste", "Hédoniste", "🍾", "La vie est faite pour en profiter.", -0.1, [
    { target: "bonheur", op: "add", value: 6, label: "Plaisir", source: S("Hédoniste") },
    { target: "discipline", op: "add", value: -4, label: "Insouciance", source: S("Hédoniste") },
  ]),
  trait("competitif", "Compétitif", "🥇", "Perdre n'est pas une option.", -0.2, [
    { target: "discipline", op: "add", value: 4, label: "Esprit de compétition", source: S("Compétitif") },
    { target: "physique", op: "add", value: 2, label: "Dépassement", source: S("Compétitif") },
  ]),
];

export const TRAIT_BY_ID = Object.fromEntries(TRAITS.map((t) => [t.id, t]));
