/**
 * Actions initiées par le joueur (barre du bas façon BitLife).
 * Organisées en branches : Savoir, Travail, Crime, Corps & Esprit, Social,
 * Argent, Loisirs. Chaque action a des conditions, un coût, des effets (ou un
 * jet risqué pondéré par la Chance). Extensible : ajouter un objet suffit.
 */
import type { Action, ActionBranch, ActionBranchInfo, EventEffect, Modifier } from "../types";

export const BRANCHES: ActionBranchInfo[] = [
  { id: "savoir", label: "Savoir", icon: "📚" },
  { id: "travail", label: "Travail", icon: "💼" },
  { id: "crime", label: "Crime", icon: "🕶️" },
  { id: "corps", label: "Corps & Esprit", icon: "🧘" },
  { id: "social", label: "Social", icon: "❤️" },
  { id: "argent", label: "Argent", icon: "💰" },
  { id: "loisirs", label: "Loisirs", icon: "🎮" },
];

// Helpers concis.
const m = (target: Modifier["target"], value: number, label: string): Modifier => ({ target, op: "add", value, label, source: "Action" });
const eff = (outcome: string, e: Partial<EventEffect> = {}): EventEffect => ({ outcome, ...e });

function action(
  branch: ActionBranch,
  id: string,
  label: string,
  icon: string,
  description: string,
  rest: Partial<Action>
): Action {
  return { branch, id, label, icon, description, ...rest };
}

export const ACTIONS: Action[] = [
  // ------------------------------------------------------------ SAVOIR
  action("savoir", "etudier", "Étudier dur", "📖", "Passer l'année le nez dans les livres.", {
    condition: { minAge: 6, maxAge: 30 },
    cooldown: 1,
    effects: [eff("Tu progresses intellectuellement.", { modifiers: [m("intelligence", 3, "Étude"), m("discipline", 1, "Rigueur")] })],
  }),
  action("savoir", "lire", "Lire un livre", "📕", "S'ouvrir l'esprit un ouvrage à la fois.", {
    cooldown: 1,
    effects: [eff("Une lecture enrichissante.", { modifiers: [m("intelligence", 1, "Lecture"), m("creativite", 1, "Imaginaire")] })],
  }),
  action("savoir", "langue", "Apprendre une langue", "🗣️", "Maîtriser une nouvelle langue ouvre des portes.", {
    condition: { minAge: 8 },
    cost: 300,
    cooldown: 2,
    risky: {
      successRate: 0.6,
      success: eff("Tu deviens bilingue ! Un atout majeur.", { modifiers: [m("intelligence", 3, "Nouvelle langue"), m("charisme", 2, "Ouverture")], addMemory: ["polyglotte"] }),
      failure: eff("Tu abandonnes après quelques mois.", { modifiers: [m("bonheur", -1, "Frustration")] }),
    },
  }),
  action("savoir", "formation", "Suivre une formation", "🎓", "Une certification pour booster ta carrière.", {
    condition: { minAge: 18 },
    cost: 2000,
    cooldown: 3,
    effects: [eff("Diplôme en poche : ta valeur professionnelle grimpe.", { modifiers: [m("intelligence", 2, "Formation"), m("discipline", 2, "Effort")], addMemory: ["formation_pro"] })],
  }),
  action("savoir", "doctorat", "Viser un doctorat", "🔬", "Le sommet académique. Long et exigeant.", {
    condition: { minAge: 24, requiresTags: ["etudes_sup"], minStats: { intelligence: 70 } },
    once: true,
    cost: 3000,
    effects: [eff("Tu deviens docteur. Une reconnaissance rare.", { modifiers: [m("intelligence", 6, "Doctorat")], addMemory: ["doctorat", "goal:savoir_atteint"] })],
  }),

  // ------------------------------------------------------------ TRAVAIL
  action("travail", "chercher_job", "Chercher un emploi", "🔎", "Envoyer des candidatures.", {
    condition: { minAge: 16 },
    cooldown: 1,
    effects: [eff("Tu multiplies les candidatures. (Un poste peut arriver au fil des ans.)", { addMemory: ["cherche_emploi"] })],
  }),
  action("travail", "bosser_dur", "Travailler dur", "💪", "Mettre les bouchées doubles au boulot.", {
    condition: { minAge: 18, requiresTags: [] },
    cooldown: 1,
    effects: [eff("Ton implication est remarquée.", { modifiers: [m("discipline", 2, "Zèle"), m("bonheur", -1, "Fatigue")], addMemory: ["bosseur"] })],
  }),
  action("travail", "augmentation", "Demander une augmentation", "📈", "Oser réclamer ce que tu mérites.", {
    condition: { minAge: 20 },
    cooldown: 2,
    risky: {
      successRate: 0.4,
      success: eff("Accordée ! Ton salaire grimpe.", { money: 4000, modifiers: [m("charisme", 1, "Négociation")] }),
      failure: eff("Refusée. Ambiance tendue au bureau.", { modifiers: [m("bonheur", -3, "Vexation")] }),
    },
  }),
  action("travail", "demissionner", "Démissionner", "🚪", "Tout plaquer pour respirer.", {
    condition: { minAge: 18 },
    cooldown: 1,
    effects: [eff("Tu quittes ton poste. Liberté... et incertitude.", { modifiers: [m("bonheur", 3, "Soulagement")], addMemory: ["a_demissionne"] })],
  }),
  action("travail", "business", "Lancer un business", "🚀", "Tenter l'aventure entrepreneuriale.", {
    condition: { minAge: 18 },
    cost: 5000,
    cooldown: 3,
    risky: {
      successRate: 0.35,
      success: eff("Ton business décolle ! Premiers bénéfices.", { money: 25000, modifiers: [m("discipline", 3, "Entrepreneur"), m("charisme", 2, "Leadership")], addMemory: ["entrepreneur"] }),
      failure: eff("L'aventure tourne court. Tu perds ta mise.", { modifiers: [m("mentalHealth", -4, "Échec"), m("discipline", 2, "Leçon apprise")], addMemory: ["echec_business"] }),
    },
  }),

  // ------------------------------------------------------------ CRIME
  action("crime", "vol_etalage", "Vol à l'étalage", "🛒", "Chaparder un peu. Petit risque, petit gain.", {
    condition: { minAge: 10 },
    cooldown: 1,
    risky: {
      successRate: 0.7,
      success: eff("Tu repars sans payer. Frisson garanti.", { money: 200, modifiers: [m("bonheur", 1, "Adrénaline")], addMemory: ["petit_delit"] }),
      failure: eff("Pris la main dans le sac ! Réputation entachée.", { modifiers: [m("charisme", -3, "Honte"), m("mentalHealth", -2, "Stress")], addMemory: ["casier_leger"] }),
    },
  }),
  action("crime", "arnaque", "Monter une arnaque", "🎭", "Un plan pour soutirer de l'argent.", {
    condition: { minAge: 16, minStats: { intelligence: 45 } },
    cooldown: 2,
    risky: {
      successRate: 0.5,
      success: eff("L'arnaque fonctionne. Le magot est joli.", { money: 5000, modifiers: [m("charisme", 1, "Bagout")], addMemory: ["arnaqueur"] }),
      failure: eff("Ça tourne mal. Tu frôles la case prison.", { money: -2000, modifiers: [m("mentalHealth", -4, "Peur")], addMemory: ["casier_leger"] }),
    },
  }),
  action("crime", "cambriolage", "Cambriolage", "🏚️", "S'introduire chez quelqu'un. Gros risque.", {
    condition: { minAge: 16, minStats: { physique: 40 } },
    cooldown: 2,
    risky: {
      successRate: 0.45,
      success: eff("Butin récupéré, ni vu ni connu.", { money: 12000, modifiers: [m("physique", 1, "Sang-froid")], addMemory: ["cambrioleur"] }),
      failure: eff("Alarme ! Arrestation et casier judiciaire.", { modifiers: [m("mentalHealth", -6, "Prison évitée de peu"), m("charisme", -4, "Casier")], addMemory: ["casier_lourd", "ex_detenu"] }),
    },
  }),
  action("crime", "rejoindre_gang", "Rejoindre un gang", "🔫", "Entrer dans le crime organisé.", {
    condition: { minAge: 15, requiresTags: ["crime_temptation", "casier_leger", "casier_lourd", "cartel_exposure", "favela"] },
    once: true,
    effects: [eff("Tu prêtes allégeance. Une nouvelle vie, dangereuse, commence.", { modifiers: [m("charisme", 2, "Respect de la rue"), m("mentalHealth", -3, "Vie sous tension")], addMemory: ["gang", "crime_temptation"] })],
  }),
  action("crime", "deal", "Trafic", "💊", "Écouler de la marchandise illégale.", {
    condition: { minAge: 15, requiresTags: ["gang", "crime_temptation", "cartel_exposure"] },
    cooldown: 1,
    risky: {
      successRate: 0.6,
      success: eff("Business juteux ce mois-ci.", { money: 8000, addMemory: ["trafiquant"] }),
      failure: eff("Descente de police. Tu perds tout et ta liberté vacille.", { money: -3000, modifiers: [m("mentalHealth", -5, "Traqué")], addMemory: ["casier_lourd"] }),
    },
  }),

  // ------------------------------------------------------------ CORPS & ESPRIT
  action("corps", "sport", "Aller à la salle", "🏋️", "Entretenir son corps.", {
    condition: { minAge: 12 },
    cost: 100,
    cooldown: 1,
    effects: [eff("Séance intense : ton physique s'améliore.", { modifiers: [m("physique", 3, "Sport"), m("sante", 2, "Forme"), m("bonheur", 1, "Endorphines")] })],
  }),
  action("corps", "meditation", "Méditer", "🧘", "Cultiver la paix intérieure.", {
    condition: { minAge: 10 },
    cooldown: 1,
    effects: [eff("Ton esprit s'apaise.", { modifiers: [m("mentalHealth", 4, "Méditation"), m("bonheur", 1, "Calme")] })],
  }),
  action("corps", "regime", "Se mettre au régime", "🥗", "Rééquilibrer son alimentation.", {
    condition: { minAge: 14 },
    cooldown: 2,
    effects: [eff("Alimentation saine : ton corps te remercie.", { modifiers: [m("sante", 4, "Régime"), m("physique", 1, "Ligne")] })],
  }),
  action("corps", "therapie", "Consulter un psy", "🛋️", "Prendre soin de sa santé mentale.", {
    condition: { minAge: 12 },
    cost: 800,
    cooldown: 1,
    effects: [eff("La thérapie te fait un bien fou.", { modifiers: [m("mentalHealth", 8, "Thérapie"), m("bonheur", 2, "Mieux-être")] })],
  }),
  action("corps", "medecin", "Bilan médical", "🩺", "Faire le point sur sa santé.", {
    condition: { minAge: 18 },
    cost: 200,
    cooldown: 2,
    effects: [eff("Check-up complet : prévention avant tout.", { modifiers: [m("sante", 3, "Prévention")] })],
  }),
  action("corps", "cure_addiction", "Cure de désintox", "🏥", "Se battre contre une addiction.", {
    condition: { minAge: 16, requiresTags: ["addict", "fetard"] },
    cost: 1500,
    cooldown: 2,
    risky: {
      successRate: 0.55,
      success: eff("Tu remportes le combat contre l'addiction.", { modifiers: [m("sante", 6, "Sevrage réussi"), m("discipline", 4, "Volonté"), m("mentalHealth", 5, "Libération")], addMemory: ["ancien_addict"] }),
      failure: eff("La rechute te rattrape.", { modifiers: [m("mentalHealth", -4, "Rechute")] }),
    },
  }),

  // ------------------------------------------------------------ SOCIAL
  action("social", "amis", "Se faire des amis", "🧑‍🤝‍🧑", "Élargir son cercle social.", {
    condition: { minAge: 5 },
    cooldown: 1,
    effects: [eff("Une nouvelle amitié se noue.", { modifiers: [m("charisme", 1, "Sociabilité"), m("bonheur", 2, "Lien social")], relationshipDelta: { kind: "ami", delta: 30 } })],
  }),
  action("social", "rencard", "Chercher l'amour", "💘", "Se lancer à la rencontre de quelqu'un.", {
    condition: { minAge: 15 },
    cooldown: 1,
    risky: {
      successRate: 0.5,
      success: eff("Le courant passe : une relation naît.", { modifiers: [m("bonheur", 5, "Amour")], relationshipDelta: { kind: "partenaire", delta: 40 }, addMemory: ["en_couple"] }),
      failure: eff("Le rencard tourne au fiasco.", { modifiers: [m("bonheur", -2, "Déception")] }),
    },
  }),
  action("social", "famille", "Fonder une famille", "👶", "Faire le grand saut : un enfant.", {
    condition: { minAge: 20, maxAge: 50, requiresTags: ["en_couple", "marie", "premier_amour"] },
    cooldown: 3,
    effects: [eff("Un enfant vient agrandir la famille !", { money: -5000, modifiers: [m("bonheur", 8, "Parentalité")], relationshipDelta: { kind: "enfant", delta: 80 }, addMemory: ["parent", "goal:famille_atteint"] })],
  }),
  action("social", "appeler_parents", "Appeler ses parents", "📞", "Prendre des nouvelles des siens.", {
    condition: { minAge: 10, forbidsTags: ["orphan"] },
    cooldown: 1,
    effects: [eff("Un moment chaleureux en famille.", { modifiers: [m("bonheur", 2, "Chaleur familiale")], relationshipDelta: { kind: "parent", delta: 10 } })],
  }),
  action("social", "reseau", "Réseauter", "🤝", "Se constituer un carnet d'adresses utile.", {
    condition: { minAge: 18 },
    cost: 200,
    cooldown: 1,
    effects: [eff("De nouveaux contacts précieux.", { modifiers: [m("charisme", 2, "Networking")], addMemory: ["bien_entoure"] })],
  }),

  // ------------------------------------------------------------ ARGENT
  action("argent", "investir_bourse", "Investir en bourse", "📊", "Placer son argent sur les marchés.", {
    condition: { minAge: 18 },
    cost: 3000,
    cooldown: 1,
    risky: {
      successRate: 0.55,
      success: eff("Tes placements prennent de la valeur.", { money: 6000, addMemory: ["investisseur"] }),
      failure: eff("Les marchés chutent : tu perds une partie.", { money: -1500 }),
    },
  }),
  action("argent", "immobilier", "Acheter un logement", "🏠", "Investir dans la pierre.", {
    condition: { minAge: 22 },
    cost: 30000,
    once: false,
    cooldown: 5,
    effects: [eff("Tu deviens propriétaire : un patrimoine solide.", { modifiers: [m("bonheur", 4, "Chez-soi")], addMemory: ["proprietaire"] })],
  }),
  action("argent", "loterie", "Jouer à la loterie", "🎫", "Tenter le jackpot pour quelques euros.", {
    condition: { minAge: 18 },
    cost: 50,
    cooldown: 1,
    risky: {
      successRate: 0.08,
      success: eff("INCROYABLE ! Tu gagnes le gros lot !", { money: 500000, modifiers: [m("bonheur", 15, "Jackpot"), m("chance", 5, "Veinard")], addMemory: ["gagnant_loto"] }),
      failure: eff("Perdu, comme d'habitude.", {}),
    },
  }),
  action("argent", "epargner", "Épargner", "🐖", "Mettre de côté prudemment.", {
    condition: { minAge: 16 },
    cooldown: 1,
    effects: [eff("Un peu plus de sécurité financière.", { modifiers: [m("discipline", 1, "Épargne")], addMemory: ["epargnant"] })],
  }),

  // ------------------------------------------------------------ LOISIRS
  action("loisirs", "voyage", "Partir en voyage", "✈️", "Découvrir le monde.", {
    condition: { minAge: 12 },
    cost: 2000,
    cooldown: 1,
    effects: [eff("Un voyage inoubliable élargit tes horizons.", { modifiers: [m("bonheur", 6, "Évasion"), m("creativite", 2, "Découverte"), m("charisme", 1, "Ouverture")] })],
  }),
  action("loisirs", "fete", "Faire la fête", "🎉", "Décompresser sans modération.", {
    condition: { minAge: 15 },
    cost: 150,
    cooldown: 1,
    effects: [eff("Soirée mémorable !", { modifiers: [m("bonheur", 4, "Fête"), m("sante", -1, "Excès"), m("addictionRisk", 3, "Habitude festive")], addMemory: ["fetard"] })],
  }),
  action("loisirs", "hobby", "Se lancer dans un hobby", "🎨", "Cultiver une passion.", {
    condition: { minAge: 8 },
    cost: 300,
    cooldown: 1,
    effects: [eff("Ta passion t'épanouit.", { modifiers: [m("creativite", 3, "Passion"), m("bonheur", 3, "Épanouissement")] })],
  }),
  action("loisirs", "vacances", "Prendre des vacances", "🏖️", "Se reposer loin du stress.", {
    condition: { minAge: 18 },
    cost: 1200,
    cooldown: 1,
    effects: [eff("Repos bien mérité.", { modifiers: [m("mentalHealth", 5, "Repos"), m("bonheur", 3, "Détente")] })],
  }),
];

export const ACTIONS_BY_BRANCH: Record<ActionBranch, Action[]> = BRANCHES.reduce((acc, b) => {
  acc[b.id] = ACTIONS.filter((a) => a.branch === b.id);
  return acc;
}, {} as Record<ActionBranch, Action[]>);
