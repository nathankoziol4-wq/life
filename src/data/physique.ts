/**
 * Génétique & physique : corpulences, prédispositions héréditaires, groupes
 * sanguins, allergies, handicaps. Les prédispositions posent des tags exploités
 * par les événements santé probabilistes (déclenchés plus tard dans la vie).
 */
import type { ChoiceOption } from "../types";

const S = (id: string) => `Physique : ${id}`;

/** Corpulence de base. */
export const BUILDS: ChoiceOption[] = [
  { id: "mince", label: "Mince", icon: "🌿", description: "Léger, agile.", tags: ["build:mince"], modifiers: [
    { target: "physique", op: "add", value: 2, label: "Agilité", source: S("Mince") },
  ] },
  { id: "athletique", label: "Athlétique", icon: "💪", description: "Musclé, endurant.", tags: ["build:athletique"], modifiers: [
    { target: "physique", op: "add", value: 8, label: "Corps athlétique", source: S("Athlétique") },
    { target: "sante", op: "add", value: 4, label: "Bonne forme", source: S("Athlétique") },
    { target: "charisme", op: "add", value: 2, label: "Présence physique", source: S("Athlétique") },
  ] },
  { id: "moyenne", label: "Moyenne", icon: "🧍", description: "Corpulence standard.", tags: ["build:moyenne"], modifiers: [] },
  { id: "ronde", label: "Ronde", icon: "🧸", description: "Enveloppé. Risque santé accru mais chaleureux.", tags: ["build:ronde"], modifiers: [
    { target: "sante", op: "add", value: -4, label: "Surpoids de base", source: S("Ronde") },
    { target: "bonheur", op: "add", value: 2, label: "Rapport détendu au corps", source: S("Ronde") },
  ] },
];

export const BUILD_BY_ID = Object.fromEntries(BUILDS.map((b) => [b.id, b]));

/** Prédispositions génétiques héréditaires (multi-sélection). */
export const PREDISPOSITIONS: ChoiceOption[] = [
  { id: "longevite", label: "Longévité", icon: "🧬", description: "Aïeux centenaires. +8 ans d'espérance de vie.", tags: ["gene:longevite"], modifiers: [
    { target: "lifeExpectancy", op: "add", value: 8, label: "Gènes de longévité", source: S("Longévité") },
    { target: "sante", op: "add", value: 3, label: "Robustesse", source: S("Longévité") },
  ] },
  { id: "cardiaque", label: "Cardiopathie familiale", icon: "❤️‍🩹", description: "Risque cardiaque élevé après 45 ans.", tags: ["gene:cardiaque", "risk:heart"], modifiers: [
    { target: "lifeExpectancy", op: "add", value: -5, label: "Risque cardiaque", source: S("Cardiopathie") },
  ], difficulty: 1 },
  { id: "diabete", label: "Diabète héréditaire", icon: "🩸", description: "Prédisposition au diabète de type 2.", tags: ["gene:diabete", "risk:diabetes"], modifiers: [
    { target: "sante", op: "add", value: -3, label: "Métabolisme fragile", source: S("Diabète") },
  ], difficulty: 1 },
  { id: "mentale", label: "Trouble mental familial", icon: "🧠", description: "Antécédents de dépression/bipolarité.", tags: ["gene:mentale", "risk:mental"], modifiers: [
    { target: "mentalHealth", op: "add", value: -10, label: "Vulnérabilité psychique", source: S("Mental") },
  ], difficulty: 1 },
  { id: "addiction", label: "Terrain addictif", icon: "🚬", description: "Cerveau plus sensible aux addictions.", tags: ["gene:addiction", "risk:addiction"], modifiers: [
    { target: "addictionRisk", op: "add", value: 30, label: "Terrain addictif", source: S("Addiction") },
  ], difficulty: 1 },
  { id: "metabolisme", label: "Métabolisme rapide", icon: "🔥", description: "Brûle tout, reste mince.", tags: ["gene:metabolisme"], modifiers: [
    { target: "physique", op: "add", value: 4, label: "Métabolisme rapide", source: S("Métabolisme") },
  ] },
  { id: "fertilite", label: "Grande fertilité", icon: "🌱", description: "Fertilité élevée.", tags: ["gene:fertilite"], modifiers: [
    { target: "fertility", op: "add", value: 25, label: "Fertilité élevée", source: S("Fertilité") },
  ] },
  { id: "robustesse", label: "Système immunitaire de fer", icon: "🛡️", description: "Tombe rarement malade.", tags: ["gene:immunite"], modifiers: [
    { target: "sante", op: "add", value: 6, label: "Immunité solide", source: S("Immunité") },
  ] },
  { id: "beaute_gene", label: "Beauté héréditaire", icon: "💠", description: "Une famille de canons.", tags: ["gene:beaute"], modifiers: [
    { target: "charisme", op: "add", value: 5, label: "Beauté innée", source: S("Beauté") },
  ] },
  { id: "genie", label: "Génie héréditaire", icon: "🧠", description: "Une lignée de têtes bien faites.", tags: ["gene:genie"], modifiers: [
    { target: "intelligence", op: "add", value: 5, label: "Prédisposition au génie", source: S("Génie") },
    { target: "learningMultiplier", op: "mult", value: 1.1, label: "Apprentissage rapide", source: S("Génie") },
  ] },
  { id: "cancer_gene", label: "Prédisposition au cancer", icon: "🎗️", description: "Antécédents oncologiques familiaux.", tags: ["gene:cancer", "risk:cancer"], modifiers: [
    { target: "lifeExpectancy", op: "add", value: -4, label: "Risque oncologique", source: S("Cancer") },
  ], difficulty: 1 },
  { id: "vue_perte", label: "Myopie sévère héréditaire", icon: "👁️", description: "Vue qui décline vite.", tags: ["gene:myopie"], modifiers: [
    { target: "physique", op: "add", value: -1, label: "Vue faible", source: S("Myopie") },
  ] },
];

export const PREDISPOSITION_BY_ID = Object.fromEntries(PREDISPOSITIONS.map((p) => [p.id, p]));

export const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

/** Allergies (multi-sélection, purement déclencheurs d'événements médicaux). */
export const ALLERGIES: ChoiceOption[] = [
  { id: "arachide", label: "Arachides", icon: "🥜", tags: ["allergy:arachide"], modifiers: [] },
  { id: "pollen", label: "Pollen", icon: "🌾", tags: ["allergy:pollen"], modifiers: [] },
  { id: "lactose", label: "Lactose", icon: "🥛", tags: ["allergy:lactose"], modifiers: [] },
  { id: "penicilline", label: "Pénicilline", icon: "💊", tags: ["allergy:penicilline"], modifiers: [] },
];

/** Handicaps éventuels (option unique). */
export const DISABILITIES: ChoiceOption[] = [
  { id: "aucun", label: "Aucun", icon: "—", tags: [], modifiers: [] },
  { id: "malvoyance", label: "Malvoyance", icon: "👓", description: "Vue très réduite.", tags: ["disability:vision"], modifiers: [
    { target: "physique", op: "add", value: -3, label: "Malvoyance", source: S("Handicap") },
    { target: "intelligence", op: "add", value: 3, label: "Autres sens aiguisés", source: S("Handicap") },
  ], difficulty: 1 },
  { id: "mobilite", label: "Mobilité réduite", icon: "♿", description: "Fauteuil roulant.", tags: ["disability:mobility"], modifiers: [
    { target: "physique", op: "add", value: -12, label: "Mobilité réduite", source: S("Handicap") },
    { target: "discipline", op: "add", value: 5, label: "Volonté forgée", source: S("Handicap") },
  ], difficulty: 2 },
  { id: "surdite", label: "Surdité", icon: "🦻", description: "Malentendant profond.", tags: ["disability:hearing"], modifiers: [
    { target: "charisme", op: "add", value: -2, label: "Barrière de communication", source: S("Handicap") },
    { target: "creativite", op: "add", value: 4, label: "Perception visuelle", source: S("Handicap") },
  ], difficulty: 1 },
];

export const DISABILITY_BY_ID = Object.fromEntries(DISABILITIES.map((d) => [d.id, d]));
