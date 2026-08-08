/**
 * Dons innés & défis (malédictions).
 * - Talents : boost d'apprentissage dans un domaine + tag "talent:x" qui déclenche
 *   des événements "prodige".
 * - Challenges : mode difficulté. Malus lourds compensés par des tags narratifs.
 */
import type { ChoiceOption } from "../types";

const ST = (id: string) => `Talent : ${id}`;
const SC = (id: string) => `Défi : ${id}`;

export const TALENTS: ChoiceOption[] = [
  { id: "musique", label: "Musique", icon: "🎵", description: "Oreille absolue, doigts agiles.", tags: ["talent:musique"], modifiers: [
    { target: "creativite", op: "add", value: 6, label: "Don musical", source: ST("Musique") },
  ] },
  { id: "sport", label: "Sport", icon: "🏅", description: "Corps d'athlète naturel.", tags: ["talent:sport"], modifiers: [
    { target: "physique", op: "add", value: 8, label: "Don sportif", source: ST("Sport") },
  ] },
  { id: "langues", label: "Langues", icon: "🗣️", description: "Tu absorbes les langues.", tags: ["talent:langues"], modifiers: [
    { target: "intelligence", op: "add", value: 4, label: "Don pour les langues", source: ST("Langues") },
    { target: "charisme", op: "add", value: 2, label: "Communication", source: ST("Langues") },
  ] },
  { id: "maths", label: "Mathématiques", icon: "🔢", description: "Les chiffres te parlent.", tags: ["talent:maths"], modifiers: [
    { target: "intelligence", op: "add", value: 8, label: "Génie des maths", source: ST("Maths") },
  ] },
  { id: "leadership", label: "Leadership", icon: "🧭", description: "On te confie les rênes.", tags: ["talent:leadership"], modifiers: [
    { target: "charisme", op: "add", value: 6, label: "Leader né", source: ST("Leadership") },
    { target: "discipline", op: "add", value: 2, label: "Sens de l'organisation", source: ST("Leadership") },
  ] },
  { id: "manuel", label: "Manuel / bricoleur", icon: "🔨", description: "Tes mains savent tout faire.", tags: ["talent:manuel"], modifiers: [
    { target: "physique", op: "add", value: 3, label: "Habileté manuelle", source: ST("Manuel") },
    { target: "creativite", op: "add", value: 3, label: "Ingéniosité", source: ST("Manuel") },
  ] },
  { id: "eloquence", label: "Éloquence", icon: "🎤", description: "Tu captives par la parole.", tags: ["talent:eloquence"], modifiers: [
    { target: "charisme", op: "add", value: 7, label: "Verbe d'or", source: ST("Éloquence") },
  ] },
  { id: "memoire", label: "Mémoire prodigieuse", icon: "🧠", description: "Tu retiens tout.", tags: ["talent:memoire"], modifiers: [
    { target: "intelligence", op: "add", value: 6, label: "Mémoire eidétique", source: ST("Mémoire") },
  ] },
  { id: "cuisine", label: "Cuisine", icon: "🍳", description: "Un vrai cordon-bleu.", tags: ["talent:cuisine"], modifiers: [
    { target: "creativite", op: "add", value: 3, label: "Talent culinaire", source: ST("Cuisine") },
    { target: "charisme", op: "add", value: 2, label: "Régale ses proches", source: ST("Cuisine") },
  ] },
  { id: "informatique", label: "Informatique", icon: "🖥️", description: "Le code n'a pas de secret.", tags: ["talent:informatique"], modifiers: [
    { target: "intelligence", op: "add", value: 5, label: "Génie du code", source: ST("Informatique") },
  ] },
  { id: "dessin", label: "Dessin & arts visuels", icon: "✏️", description: "Ta main donne vie à tout.", tags: ["talent:dessin"], modifiers: [
    { target: "creativite", op: "add", value: 6, label: "Don pour le dessin", source: ST("Dessin") },
  ] },
  { id: "comedie", label: "Comédie & théâtre", icon: "🎬", description: "Né pour la scène.", tags: ["talent:comedie"], modifiers: [
    { target: "charisme", op: "add", value: 5, label: "Talent d'acteur", source: ST("Comédie") },
    { target: "creativite", op: "add", value: 2, label: "Expression", source: ST("Comédie") },
  ] },
  { id: "negoce", label: "Sens des affaires", icon: "📈", description: "Tu flaires les bonnes affaires.", tags: ["talent:negoce"], modifiers: [
    { target: "intelligence", op: "add", value: 3, label: "Flair économique", source: ST("Négoce") },
    { target: "discipline", op: "add", value: 2, label: "Sens du commerce", source: ST("Négoce") },
  ] },
  { id: "danse", label: "Danse", icon: "💃", description: "Le rythme dans la peau.", tags: ["talent:danse"], modifiers: [
    { target: "physique", op: "add", value: 4, label: "Grâce", source: ST("Danse") },
    { target: "charisme", op: "add", value: 2, label: "Présence", source: ST("Danse") },
  ] },
  { id: "ecriture", label: "Écriture", icon: "✍️", description: "Les mots coulent de ta plume.", tags: ["talent:ecriture"], modifiers: [
    { target: "creativite", op: "add", value: 5, label: "Plume", source: ST("Écriture") },
    { target: "intelligence", op: "add", value: 2, label: "Culture", source: ST("Écriture") },
  ] },
];

export const TALENT_BY_ID = Object.fromEntries(TALENTS.map((t) => [t.id, t]));

export const CHALLENGES: ChoiceOption[] = [
  { id: "maladie_chronique", label: "Maladie chronique", icon: "🏥", description: "Une maladie t'accompagne à vie. Événements santé fréquents.", difficulty: 3, tags: ["challenge:chronic", "condition:chronic"], modifiers: [
    { target: "sante", op: "add", value: -15, label: "Maladie chronique", source: SC("Maladie chronique") },
    { target: "lifeExpectancy", op: "add", value: -6, label: "Fragilité", source: SC("Maladie chronique") },
  ] },
  { id: "pauvrete_extreme", label: "Pauvreté extrême", icon: "🕳️", description: "Tu pars de rien, endetté dès le berceau.", difficulty: 3, tags: ["challenge:poverty"], modifiers: [
    { target: "startingMoney", op: "add", value: -3000, label: "Misère", source: SC("Pauvreté extrême") },
    { target: "familyDebt", op: "add", value: 15000, label: "Dettes de survie", source: SC("Pauvreté extrême") },
    { target: "discipline", op: "add", value: 6, label: "Endurci par le manque", source: SC("Pauvreté extrême") },
  ] },
  { id: "phobie", label: "Phobie handicapante", icon: "😨", description: "Une peur irrationnelle limite tes choix.", difficulty: 2, tags: ["challenge:phobia"], modifiers: [
    { target: "mentalHealth", op: "add", value: -10, label: "Phobie", source: SC("Phobie") },
  ] },
  { id: "casier_familial", label: "Casier familial lourd", icon: "⛓️", description: "Ta famille traîne un passé criminel. Suspicion et tentations.", difficulty: 2, tags: ["challenge:family_record", "crime_temptation"], modifiers: [
    { target: "crimeExposure", op: "add", value: 25, label: "Milieu criminel", source: SC("Casier familial") },
    { target: "networkQuality", op: "add", value: -10, label: "Réputation entachée", source: SC("Casier familial") },
  ] },
];

export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
