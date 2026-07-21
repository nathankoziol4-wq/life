/**
 * Bibliothèque d'événements — le contenu narratif du jeu.
 * Chaque événement déclare ses conditions (`condition`), un poids de base, et
 * soit des `choices` (branchement), soit des `autoEffects` (résolution directe).
 * Le moteur (engine/events.ts) filtre par condition, pondère par la Chance et
 * les stats, puis tire un événement. Extensible : ajouter un objet suffit.
 */
import type { GameEvent, Modifier } from "../types";

const mod = (target: Modifier["target"], value: number, label: string): Modifier => ({
  target,
  value,
  op: "add",
  label,
  source: "Événement",
});

export const EVENTS: GameEvent[] = [
  // ------------------------------------------------------------------ ENFANCE
  {
    id: "premier_mot",
    title: "Premiers pas",
    text: "{name} fait ses premiers pas et prononce son premier mot.",
    category: "enfance",
    weight: 6,
    once: true,
    condition: { minAge: 1, maxAge: 3 },
    choices: [],
    autoEffects: [{ outcome: "Un moment de joie pour toute la famille.", modifiers: [mod("bonheur", 3, "Premiers pas")] }],
  },
  {
    id: "prodige_talent",
    title: "Un don précoce",
    text: "À l'école, un professeur remarque un talent hors du commun chez {name}.",
    category: "enfance",
    weight: 5,
    once: true,
    condition: { minAge: 5, maxAge: 11, requiresTags: ["talent:musique", "talent:maths", "talent:sport", "talent:musique"] },
    choices: [
      { label: "Cultiver ce don avec passion", effects: [{ outcome: "Les heures d'entraînement paient : le don s'affûte.", modifiers: [mod("creativite", 4, "Don cultivé"), mod("discipline", 3, "Rigueur")], addMemory: ["prodige"] }] },
      { label: "S'en désintéresser", effects: [{ outcome: "Le don reste en friche.", modifiers: [mod("bonheur", -2, "Potentiel gâché")] }] },
    ],
  },
  {
    id: "harcelement",
    title: "Le harcèlement",
    text: "{name} est pris pour cible par d'autres enfants à l'école.",
    category: "enfance",
    weight: 5,
    condition: { minAge: 7, maxAge: 14, maxStats: { charisme: 45 } },
    choices: [
      { label: "En parler à un adulte", effects: [{ outcome: "Un adulte intervient. La situation s'apaise lentement.", modifiers: [mod("mentalHealth", 3, "Soutien reçu")] }] },
      { label: "Se défendre physiquement", requires: { minStats: { physique: 40 } }, effects: [{ outcome: "Tu tiens tête. On te laisse tranquille désormais.", modifiers: [mod("physique", 2, "Combativité"), mod("charisme", 3, "Respect gagné")], addMemory: ["combatif"] }] },
      { label: "Encaisser en silence", effects: [{ outcome: "Les blessures restent intérieures.", modifiers: [mod("mentalHealth", -8, "Traumatisme"), mod("bonheur", -5, "Isolement")], addMemory: ["ancien_harcele"] }] },
    ],
  },

  // ------------------------------------------------------------------ ADO
  {
    id: "premier_amour",
    title: "Premier amour",
    text: "{name} tombe amoureux pour la première fois.",
    category: "relation",
    weight: 6,
    once: true,
    condition: { minAge: 14, maxAge: 19 },
    choices: [
      { label: "Se déclarer", effects: [{ outcome: "Le cœur battant, tu te lances...", modifiers: [mod("charisme", 2, "Audace"), mod("bonheur", 6, "Amour partagé")], addMemory: ["premier_amour"], relationshipDelta: { kind: "partenaire", delta: 40 } }] },
      { label: "Garder ça secret", effects: [{ outcome: "Tu ronges ton frein en silence.", modifiers: [mod("bonheur", -2, "Amour tu")] }] },
    ],
  },
  {
    id: "fete_alcool",
    title: "La fête de trop",
    text: "À une soirée, on propose à {name} de l'alcool et bien plus.",
    category: "ado",
    weight: 5,
    condition: { minAge: 15, maxAge: 19 },
    choices: [
      { label: "Faire la fête sans limite", effects: [{ outcome: "Nuit mémorable... et gueule de bois carabinée.", modifiers: [mod("bonheur", 4, "Nuit folle"), mod("sante", -3, "Excès"), mod("addictionRisk", 8, "Goût du risque")], addMemory: ["fetard"] }] },
      { label: "Rester raisonnable", requires: { minStats: { discipline: 45 } }, effects: [{ outcome: "Tu gardes le contrôle. Certains te trouvent coincé.", modifiers: [mod("discipline", 3, "Maîtrise de soi")] }] },
      { label: "Rentrer tôt", effects: [{ outcome: "Tu préfères ta tranquillité.", modifiers: [mod("bonheur", -1, "FOMO")] }] },
    ],
  },
  {
    id: "orientation_etudes",
    title: "Grand choix d'orientation",
    text: "{name} doit choisir sa voie après le lycée.",
    category: "ado",
    weight: 8,
    once: true,
    condition: { minAge: 17, maxAge: 19 },
    choices: [
      { label: "Études longues et exigeantes", requires: { minStats: { intelligence: 50 } }, effects: [{ outcome: "Tu vises haut. Les années d'études commencent.", modifiers: [mod("intelligence", 5, "Études supérieures")], addMemory: ["etudes_sup"] }] },
      { label: "Filière courte et pro", effects: [{ outcome: "Tu choisis l'efficacité et l'emploi rapide.", modifiers: [mod("discipline", 3, "Pragmatisme")], addMemory: ["filiere_pro"] }] },
      { label: "Arrêter les études", effects: [{ outcome: "Tu plonges dans la vie active sans diplôme.", modifiers: [mod("bonheur", 2, "Liberté"), mod("intelligence", -2, "Sans bagage")], addMemory: ["decrochage"] }] },
    ],
  },

  // ------------------------------------------------------------------ ADULTE / CARRIÈRE
  {
    id: "opportunite_boulot",
    title: "Une opportunité en or",
    text: "Un poste bien mieux payé s'ouvre, mais loin de tout ce que {name} connaît.",
    category: "carriere",
    weight: 6,
    condition: { minAge: 24, maxAge: 55 },
    choices: [
      { label: "Saisir l'opportunité", effects: [{ outcome: "Tu quittes tout pour ce nouveau départ.", money: 8000, modifiers: [mod("charisme", 2, "Nouveau réseau"), mod("bonheur", -2, "Déracinement")], addMemory: ["expatrie"] }] },
      { label: "Rester dans ta zone de confort", effects: [{ outcome: "La sécurité avant tout.", modifiers: [mod("bonheur", 1, "Stabilité")] }] },
    ],
  },
  {
    id: "investissement",
    title: "Le tuyau d'un ami",
    text: "Un ami propose à {name} d'investir dans une affaire prometteuse.",
    category: "carriere",
    weight: 5,
    condition: { minAge: 25, maxAge: 60 },
    choices: [
      { label: "Investir gros", effects: [{ outcome: "Le sort en est jeté... (le résultat dépend de ta Chance)", money: 0, modifiers: [], addMemory: ["a_investi"] }] },
      { label: "Investir prudemment", effects: [{ outcome: "Tu mises une somme raisonnable.", money: -2000, modifiers: [mod("discipline", 1, "Prudence")] }] },
      { label: "Refuser poliment", effects: [{ outcome: "Tu préfères garder ton argent.", modifiers: [] }] },
    ],
  },
  {
    id: "burnout",
    title: "Le mur",
    text: "Après des mois de surmenage, {name} sent que tout s'effondre.",
    category: "sante",
    weight: 6,
    condition: { minAge: 28, maxAge: 60, maxStats: { mentalHealth: 45 } },
    choices: [
      { label: "Prendre un vrai congé", effects: [{ outcome: "Tu t'arrêtes à temps. La reconstruction commence.", money: -3000, modifiers: [mod("mentalHealth", 12, "Repos"), mod("bonheur", 4, "Souffle retrouvé")] }] },
      { label: "Serrer les dents", effects: [{ outcome: "Tu continues coûte que coûte. Le corps encaisse.", modifiers: [mod("mentalHealth", -10, "Épuisement"), mod("sante", -6, "Corps usé")], addCondition: ["burnout"], addMemory: ["burnout"] }] },
    ],
  },

  // ------------------------------------------------------------------ SANTÉ (génétique)
  {
    id: "alerte_cardiaque",
    title: "Alerte cardiaque",
    text: "Une douleur violente dans la poitrine terrasse {name}.",
    category: "sante",
    weight: 7,
    once: true,
    condition: { minAge: 45, requiresTags: ["risk:heart"] },
    choices: [
      { label: "Se faire opérer et changer de vie", effects: [{ outcome: "Opération réussie. Tu adoptes une hygiène de fer.", money: -5000, modifiers: [mod("sante", 6, "Seconde chance"), mod("discipline", 4, "Vie saine")], addCondition: ["cardiaque"] }] },
      { label: "Minimiser et continuer comme avant", effects: [{ outcome: "Tu ignores les signaux. Risqué.", modifiers: [mod("sante", -12, "Cœur négligé"), mod("lifeExpectancy" as Modifier["target"], -4, "Risque vital")], addCondition: ["cardiaque"] }] },
    ],
  },
  {
    id: "diabete_declare",
    title: "Diagnostic",
    text: "Le médecin annonce à {name} un diabète de type 2.",
    category: "sante",
    weight: 6,
    once: true,
    condition: { minAge: 40, requiresTags: ["risk:diabetes"] },
    autoEffects: [{ outcome: "Une gestion quotidienne s'impose désormais.", modifiers: [mod("sante", -6, "Diabète déclaré")], addCondition: ["diabete"] }],
    choices: [],
  },
  {
    id: "depression",
    title: "L'ombre",
    text: "Une tristesse profonde et durable s'installe chez {name}.",
    category: "sante",
    weight: 6,
    condition: { minAge: 16, maxStats: { mentalHealth: 35 } },
    choices: [
      { label: "Consulter et se soigner", effects: [{ outcome: "Avec de l'aide, la lumière revient peu à peu.", money: -1500, modifiers: [mod("mentalHealth", 10, "Thérapie"), mod("bonheur", 5, "Mieux-être")] }] },
      { label: "Faire face seul", effects: [{ outcome: "Tu portes ce poids sans aide.", modifiers: [mod("bonheur", -8, "Solitude"), mod("mentalHealth", -5, "Enfermement")], addMemory: ["depression"] }] },
    ],
  },
  {
    id: "addiction_spirale",
    title: "La spirale",
    text: "Les habitudes de {name} glissent vers la dépendance.",
    category: "sante",
    weight: 5,
    condition: { minAge: 18, requiresTags: ["fetard"] },
    choices: [
      { label: "Demander de l'aide", effects: [{ outcome: "Tu reconnais le problème et te fais aider.", modifiers: [mod("sante", 4, "Sevrage"), mod("discipline", 5, "Reprise en main")] }] },
      { label: "Nier le problème", effects: [{ outcome: "L'addiction s'enracine.", modifiers: [mod("sante", -8, "Dépendance"), mod("bonheur", -6, "Emprise")], addCondition: ["addiction"], addMemory: ["addict"] }] },
    ],
  },

  // ------------------------------------------------------------------ RELATION
  {
    id: "demande_mariage",
    title: "La grande question",
    text: "Après des années ensemble, la question du mariage se pose pour {name}.",
    category: "relation",
    weight: 5,
    once: true,
    condition: { minAge: 25, maxAge: 45, requiresTags: ["premier_amour"] },
    choices: [
      { label: "Se marier", effects: [{ outcome: "Un grand oui. Une nouvelle page s'ouvre.", money: -8000, modifiers: [mod("bonheur", 10, "Union heureuse")], addMemory: ["marie"], relationshipDelta: { kind: "partenaire", delta: 25 } }] },
      { label: "Rester libre", effects: [{ outcome: "Tu chéris ton indépendance.", modifiers: [mod("bonheur", 2, "Liberté assumée")] }] },
    ],
  },
  {
    id: "trahison_ami",
    title: "Le coup de poignard",
    text: "Un ami proche trahit la confiance de {name}.",
    category: "relation",
    weight: 5,
    condition: { minAge: 18, maxAge: 70 },
    choices: [
      { label: "Pardonner", requires: { minStats: { bonheur: 40 } }, effects: [{ outcome: "Tu choisis la paix intérieure sur la rancune.", modifiers: [mod("mentalHealth", 4, "Lâcher-prise"), mod("charisme", 2, "Grandeur d'âme")] }] },
      { label: "Couper les ponts", effects: [{ outcome: "Cette amitié est morte. Tu tournes la page, amer.", modifiers: [mod("bonheur", -4, "Amitié brisée")], addMemory: ["trahi"], relationshipDelta: { kind: "ami", delta: -60 } }] },
      { label: "Se venger", requires: { requiresTags: ["trait:rancunier"] }, effects: [{ outcome: "Ta vengeance est froide et calculée.", modifiers: [mod("bonheur", -2, "Amertume"), mod("charisme", -3, "Réputation")], addMemory: ["vengeur"], relationshipDelta: { kind: "ennemi", delta: -80 } }] },
    ],
  },

  // ------------------------------------------------------------------ HISTOIRE (époque)
  {
    id: "crise_2008",
    title: "Crise financière de 2008",
    text: "L'économie mondiale s'effondre. {name} sent le sol se dérober.",
    category: "histoire",
    weight: 8,
    once: true,
    condition: { yearRange: [2008, 2010], minAge: 18 },
    choices: [
      { label: "Serrer les dépenses", effects: [{ outcome: "Tu traverses la tempête en économisant.", money: -2000, modifiers: [mod("discipline", 3, "Frugalité")] }] },
      { label: "Investir à contre-courant", requires: { minStats: { intelligence: 55 } }, effects: [{ outcome: "Pari audacieux sur un marché à terre...", money: 12000, modifiers: [mod("chance", 2, "Flair")], addMemory: ["opportuniste_crise"] }] },
    ],
  },
  {
    id: "pandemie_2020",
    title: "Pandémie mondiale (2020)",
    text: "Un virus paralyse la planète. Confinement pour {name}.",
    category: "histoire",
    weight: 9,
    once: true,
    condition: { yearRange: [2020, 2022], minAge: 5 },
    choices: [
      { label: "Se réinventer en télétravail", effects: [{ outcome: "Tu t'adaptes au monde d'après.", modifiers: [mod("creativite", 4, "Réinvention"), mod("discipline", 2, "Autonomie")], addMemory: ["covid_survivant"] }] },
      { label: "Sombrer dans l'isolement", effects: [{ outcome: "Les murs se referment sur toi.", modifiers: [mod("mentalHealth", -8, "Isolement"), mod("bonheur", -5, "Enfermement")] }] },
    ],
  },
  {
    id: "essor_ia",
    title: "La vague de l'IA",
    text: "L'intelligence artificielle bouleverse le métier de {name}.",
    category: "histoire",
    weight: 6,
    once: true,
    condition: { requiresTags: ["ai_era", "ai_native"], minAge: 20 },
    choices: [
      { label: "Maîtriser ces outils", effects: [{ outcome: "Tu prends une longueur d'avance.", money: 5000, modifiers: [mod("intelligence", 4, "Compétences IA"), mod("charisme", 2, "Recherché")], addMemory: ["ia_expert"] }] },
      { label: "Résister au changement", effects: [{ outcome: "Le monde avance sans toi.", modifiers: [mod("bonheur", -3, "Déclassement")], addMemory: ["obsolete"] }] },
    ],
  },

  // ------------------------------------------------------------------ SPÉCIAL / CHANCE
  {
    id: "coup_de_chance",
    title: "Un coup de chance",
    text: "Un billet oublié, une rencontre providentielle... la fortune sourit à {name}.",
    category: "special",
    weight: 3,
    condition: { minAge: 10, minStats: { chance: 60 } },
    autoEffects: [{ outcome: "Le hasard fait bien les choses.", money: 3000, modifiers: [mod("bonheur", 4, "Chance insolente")] }],
    choices: [],
  },
  {
    id: "tentation_crime",
    title: "L'offre du milieu",
    text: "On propose à {name} de gagner beaucoup d'argent... par des voies illégales.",
    category: "special",
    weight: 5,
    condition: { minAge: 16, maxAge: 45, requiresTags: ["crime_temptation"] },
    choices: [
      { label: "Accepter", effects: [{ outcome: "Tu franchis la ligne. L'argent coule, mais le risque monte.", money: 15000, modifiers: [mod("bonheur", 2, "Argent facile")], addMemory: ["hors_la_loi", "crime_temptation"] }] },
      { label: "Refuser fermement", effects: [{ outcome: "Tu restes du bon côté de la ligne.", modifiers: [mod("mentalHealth", 3, "Conscience tranquille")] }] },
    ],
  },
];
