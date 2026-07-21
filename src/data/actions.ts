/**
 * Actions initiées par le joueur (barre du bas façon BitLife).
 * Organisées en branches : Savoir, Travail, Crime, Corps & Esprit, Social,
 * Argent, Loisirs. Chaque action a des conditions, un coût, des effets (ou un
 * jet risqué pondéré par la Chance). Extensible : ajouter un objet suffit.
 */
import type { Action, ActionBranch, ActionBranchInfo, EventEffect, Modifier, SubBranchInfo, EventCondition } from "../types";
import { CRIME_ITEMS } from "./crimeItems";

export const BRANCHES: ActionBranchInfo[] = [
  { id: "savoir", label: "Savoir", icon: "📚" },
  { id: "travail", label: "Travail", icon: "💼" },
  { id: "crime", label: "Crime", icon: "🕶️" },
  { id: "corps", label: "Corps & Esprit", icon: "🧘" },
  { id: "social", label: "Social", icon: "❤️" },
  { id: "argent", label: "Argent", icon: "💰" },
  { id: "loisirs", label: "Loisirs", icon: "🎮" },
];

/** Sous-menus (sous-branches) affichés à l'ouverture d'une branche. */
export const SUB_BRANCHES: SubBranchInfo[] = [
  // Crime
  { id: "rue", branch: "crime", label: "Rue", icon: "🌃", description: "Petits délits et crime de rue." },
  { id: "scam", branch: "crime", label: "Arnaques en ligne", icon: "💻", description: "Toutes les fraudes numériques." },
  { id: "braquage", branch: "crime", label: "Braquages", icon: "🔫", description: "Cibles à dévaliser, par difficulté croissante." },
  { id: "banditisme", branch: "crime", label: "Grand banditisme", icon: "💀", description: "Violence, enlèvements, contrats. Très lourd." },
  { id: "cols_blancs", branch: "crime", label: "Cols blancs", icon: "🎩", description: "Fraude, blanchiment, corruption." },
  { id: "marche_noir", branch: "crime", label: "Marché noir", icon: "🛒", description: "Achète du matériel pour réduire les risques.", shop: true },
  // Social
  { id: "relations", branch: "social", label: "Mes relations", icon: "👥", description: "Tes connaissances et ce que tu peux faire avec elles.", relations: true },
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

/**
 * Fabrique un crime "risqué". `base` = taux de réussite de départ (difficulté),
 * `reward` = gain si succès, `jailYears` = peine si échec (0 = simple amende).
 * Les objets possédés portant `tags` augmentent le taux de réussite.
 */
function crime(
  subBranch: string,
  id: string,
  label: string,
  icon: string,
  description: string,
  o: {
    tags: string[];
    base: number;
    reward: number;
    jailYears: number;
    reason: string;
    requiresItem?: string;
    minAge?: number;
    minStats?: EventCondition["minStats"];
    cooldown?: number;
    successMemory?: string[];
  }
): Action {
  const failure =
    o.jailYears > 0
      ? eff("Ça tourne mal : la police t'arrête.", { modifiers: [m("mentalHealth", -3, "Arrestation")], jail: { years: o.jailYears, reason: o.reason } })
      : eff("Raté ! Tu écopes d'une amende et d'une réputation entachée.", { money: -Math.round(o.reward * 0.6), modifiers: [m("charisme", -2, "Honte")], addMemory: ["casier_leger"] });
  return action("crime", id, label, icon, description, {
    subBranch,
    crimeTags: o.tags,
    requiresItem: o.requiresItem,
    cooldown: o.cooldown ?? 1,
    condition: { minAge: o.minAge ?? 14, minStats: o.minStats },
    risky: {
      successRate: o.base,
      success: eff(`Coup réussi ! Tu empoches ${o.reward.toLocaleString("fr-FR")} €.`, {
        money: o.reward,
        modifiers: [m("bonheur", 1, "Adrénaline")],
        addMemory: ["hors_la_loi", ...(o.successMemory ?? [])],
      }),
      failure,
    },
  });
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

  // ============================================================
  // CRIME → sous-branche RUE 🌃 (petits délits, faible difficulté)
  // ============================================================
  crime("rue", "vol_etalage", "Vol à l'étalage", "🛒", "Chaparder dans un magasin. Petit risque, petit gain.", { tags: ["rue"], base: 0.72, reward: 200, jailYears: 0, reason: "Vol simple", minAge: 10 }),
  crime("rue", "vol_tire", "Vol à la tire", "👛", "Faire les poches des passants dans la foule.", { tags: ["rue"], base: 0.6, reward: 500, jailYears: 0, reason: "Vol à la tire", minAge: 12 }),
  crime("rue", "vol_velo", "Voler un vélo/scooter", "🚲", "Un deux-roues mal attaché, une occasion.", { tags: ["rue"], base: 0.55, reward: 900, jailYears: 1, reason: "Vol de véhicule", minAge: 13 }),
  crime("rue", "racket", "Racketter quelqu'un", "😠", "Intimider pour extorquer de l'argent.", { tags: ["rue"], base: 0.5, reward: 700, jailYears: 1, reason: "Extorsion", minAge: 13, minStats: { physique: 40 } }),
  crime("rue", "vol_voiture", "Voler une voiture", "🚗", "Démarrer une voiture et disparaître.", { tags: ["rue"], base: 0.45, reward: 6000, jailYears: 2, reason: "Vol de voiture", minAge: 16 }),
  crime("rue", "deal_rue", "Deal de rue", "💊", "Écouler de la marchandise au coin de la rue.", { tags: ["rue"], base: 0.6, reward: 2500, jailYears: 2, reason: "Trafic de stupéfiants", minAge: 15 }),
  action("crime", "rejoindre_gang", "Rejoindre un gang", "🔫", "Entrer dans le crime organisé de rue.", {
    subBranch: "rue",
    condition: { minAge: 15 },
    once: true,
    effects: [eff("Tu prêtes allégeance. Une nouvelle vie, dangereuse, commence.", { modifiers: [m("charisme", 2, "Respect de la rue"), m("mentalHealth", -3, "Vie sous tension")], addMemory: ["gang", "crime_temptation"] })],
  }),

  // ============================================================
  // CRIME → sous-branche ARNAQUES EN LIGNE 💻
  // ============================================================
  crime("scam", "phishing", "Hameçonnage (phishing)", "🎣", "De faux e-mails pour voler des identifiants.", { tags: ["scam"], base: 0.6, reward: 1200, jailYears: 1, reason: "Escroquerie en ligne", minAge: 14 }),
  crime("scam", "faux_support", "Faux support technique", "🖥️", "Se faire passer pour un dépanneur informatique.", { tags: ["scam"], base: 0.55, reward: 2000, jailYears: 1, reason: "Escroquerie", minAge: 15 }),
  crime("scam", "carte_cadeau", "Arnaque à la carte cadeau", "🎁", "Piéger une victime pour qu'elle paie en cartes cadeaux.", { tags: ["scam"], base: 0.58, reward: 1500, jailYears: 1, reason: "Escroquerie", minAge: 14 }),
  crime("scam", "romance", "Arnaque sentimentale", "💔", "Séduire en ligne pour soutirer de l'argent.", { tags: ["scam"], base: 0.5, reward: 8000, jailYears: 2, reason: "Escroquerie sentimentale", minAge: 18, minStats: { charisme: 45 }, cooldown: 2 }),
  crime("scam", "faux_shop", "Faux site e-commerce", "🛍️", "Encaisser des commandes qui n'arriveront jamais.", { tags: ["scam"], base: 0.5, reward: 5000, jailYears: 2, reason: "Escroquerie", minAge: 18 }),
  crime("scam", "crypto", "Arnaque crypto (rug pull)", "🪙", "Lancer une fausse cryptomonnaie et disparaître.", { tags: ["scam"], base: 0.42, reward: 30000, jailYears: 3, reason: "Fraude financière", minAge: 18, minStats: { intelligence: 55 }, cooldown: 3 }),
  crime("scam", "usurpation", "Usurpation d'identité", "🪪", "Utiliser de faux papiers pour ouvrir des crédits.", { tags: ["scam", "identite"], base: 0.5, reward: 12000, jailYears: 3, reason: "Usurpation d'identité", requiresItem: "fausse_id", minAge: 18, cooldown: 2 }),
  crime("scam", "fraude_bancaire", "Fraude bancaire", "🏦", "Vider des comptes via un téléphone crypté.", { tags: ["scam", "fraude_bancaire"], base: 0.45, reward: 45000, jailYears: 4, reason: "Fraude bancaire", requiresItem: "tel_crypte", minAge: 18, minStats: { intelligence: 55 }, cooldown: 2 }),
  crime("scam", "ransomware", "Rançongiciel", "🔐", "Chiffrer les données d'une entreprise contre rançon.", { tags: ["hacking", "scam"], base: 0.4, reward: 90000, jailYears: 5, reason: "Cybercriminalité", requiresItem: "laptop", minAge: 18, minStats: { intelligence: 65 }, cooldown: 3 }),
  crime("scam", "braquage_banque_cyber", "Casse d'une banque en ligne", "🌐", "Le coup ultime : piller une banque via un botnet.", { tags: ["hacking", "fraude_bancaire"], base: 0.32, reward: 250000, jailYears: 7, reason: "Cybercriminalité aggravée", requiresItem: "botnet", minAge: 20, minStats: { intelligence: 75 }, cooldown: 4 }),

  // ============================================================
  // CRIME → sous-branche BRAQUAGES 🔫 (difficulté croissante)
  // ============================================================
  crime("braquage", "superette", "Braquer une supérette", "🏪", "Difficulté ★ — petit commerce de quartier.", { tags: ["braquage"], base: 0.6, reward: 2000, jailYears: 2, reason: "Vol à main armée", minAge: 16 }),
  crime("braquage", "station", "Braquer une station-service", "⛽", "Difficulté ★ — caisse et boutique.", { tags: ["braquage"], base: 0.55, reward: 3500, jailYears: 2, reason: "Vol à main armée", minAge: 16 }),
  crime("braquage", "tabac", "Braquer un bureau de tabac", "🚬", "Difficulté ★★ — liquide et cigarettes.", { tags: ["braquage"], base: 0.5, reward: 6000, jailYears: 3, reason: "Vol à main armée", minAge: 16 }),
  crime("braquage", "pharmacie", "Braquer une pharmacie", "💊", "Difficulté ★★ — argent et médicaments revendables.", { tags: ["braquage"], base: 0.48, reward: 8000, jailYears: 3, reason: "Vol à main armée", minAge: 16 }),
  crime("braquage", "maison", "Cambrioler une villa", "🏚️", "Difficulté ★★★ — s'introduire chez les riches.", { tags: ["braquage"], base: 0.45, reward: 15000, jailYears: 3, reason: "Cambriolage", minAge: 16, minStats: { physique: 40 } }),
  crime("braquage", "bijouterie", "Braquer une bijouterie", "💎", "Difficulté ★★★★ — vitrines pleines de pierres.", { tags: ["braquage_lourd"], base: 0.35, reward: 60000, jailYears: 5, reason: "Vol à main armée aggravé", requiresItem: "arme_poing", minAge: 18, cooldown: 2 }),
  crime("braquage", "banque", "Braquer une banque", "🏦", "Difficulté ★★★★★ — le grand classique, très risqué.", { tags: ["braquage_lourd"], base: 0.28, reward: 120000, jailYears: 7, reason: "Braquage de banque", requiresItem: "arme_poing", minAge: 18, minStats: { physique: 45 }, cooldown: 3 }),
  crime("braquage", "fourgon", "Attaquer un fourgon blindé", "🚚", "Difficulté ★★★★★★ — convoi de fonds sous escorte.", { tags: ["braquage_lourd"], base: 0.22, reward: 300000, jailYears: 9, reason: "Attaque à main armée", requiresItem: "arme_poing", minAge: 20, minStats: { physique: 55 }, cooldown: 4 }),
  crime("braquage", "musee", "Cambrioler un musée", "🖼️", "Difficulté ★★★★★★ — casse d'œuvres d'art légendaire.", { tags: ["braquage_lourd"], base: 0.2, reward: 500000, jailYears: 10, reason: "Vol d'œuvres d'art", requiresItem: "brouilleur", minAge: 22, minStats: { intelligence: 60, physique: 50 }, cooldown: 5 }),

  // ============================================================
  // CRIME → sous-branche GRAND BANDITISME 💀 (violence, lourd)
  // ============================================================
  crime("banditisme", "extorsion", "Extorsion de fonds", "💰", "Faire cracher un commerçant sous la menace.", { tags: ["violence"], base: 0.55, reward: 5000, jailYears: 3, reason: "Extorsion", minAge: 16, minStats: { physique: 45 }, cooldown: 2 }),
  crime("banditisme", "trafic_armes", "Trafic d'armes", "🔫", "Revendre des armes au marché noir.", { tags: ["braquage_lourd"], base: 0.45, reward: 40000, jailYears: 6, reason: "Trafic d'armes", requiresItem: "arme_poing", minAge: 18, cooldown: 3 }),
  crime("banditisme", "enlevement", "Enlèvement contre rançon", "🚐", "Séquestrer une cible fortunée pour une rançon.", { tags: ["violence"], base: 0.35, reward: 150000, jailYears: 12, reason: "Séquestration", requiresItem: "arme_poing", minAge: 20, minStats: { physique: 55, intelligence: 45 }, cooldown: 4 }),
  crime("banditisme", "braquage_bijou_violent", "Home-jacking", "🏠", "Braquage à domicile chez une famille aisée.", { tags: ["violence"], base: 0.4, reward: 70000, jailYears: 8, reason: "Vol avec violence", requiresItem: "arme_poing", minAge: 18, minStats: { physique: 50 }, cooldown: 3 }),
  crime("banditisme", "contrat", "Exécuter un contrat", "🎯", "Un commanditaire paie pour éliminer une cible.", { tags: ["meurtre"], base: 0.32, reward: 200000, jailYears: 25, reason: "Assassinat", requiresItem: "arme_poing", minAge: 20, minStats: { physique: 55, discipline: 50 }, cooldown: 5, successMemory: ["meurtrier", "tueur_a_gages"] }),

  // ============================================================
  // CRIME → sous-branche COLS BLANCS 🎩 (fraude, corruption)
  // ============================================================
  crime("cols_blancs", "fraude_fiscale", "Fraude fiscale", "🧾", "Dissimuler des revenus au fisc.", { tags: ["scam"], base: 0.6, reward: 8000, jailYears: 2, reason: "Fraude fiscale", minAge: 20, cooldown: 2 }),
  crime("cols_blancs", "detournement", "Détournement de fonds", "🏢", "Puiser dans la caisse de son employeur.", { tags: ["scam"], base: 0.5, reward: 20000, jailYears: 4, reason: "Abus de biens sociaux", minAge: 24, minStats: { intelligence: 55 }, cooldown: 3 }),
  crime("cols_blancs", "delit_initie", "Délit d'initié", "📉", "Spéculer grâce à une information confidentielle.", { tags: ["scam"], base: 0.48, reward: 50000, jailYears: 4, reason: "Délit d'initié", minAge: 24, minStats: { intelligence: 60 }, cooldown: 3 }),
  crime("cols_blancs", "corruption", "Corruption", "🤝", "Acheter la complaisance d'un décideur.", { tags: ["scam"], base: 0.5, reward: 30000, jailYears: 5, reason: "Corruption", minAge: 25, minStats: { charisme: 55 }, cooldown: 3 }),
  crime("cols_blancs", "blanchiment", "Blanchiment d'argent", "🧼", "Recycler de l'argent sale dans des sociétés-écrans.", { tags: ["scam", "identite"], base: 0.45, reward: 80000, jailYears: 6, reason: "Blanchiment", requiresItem: "fausse_id", minAge: 25, minStats: { intelligence: 60 }, cooldown: 4 }),

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

  // ============================================================
  // ACTIONS DE DÉTENTION (prison: true) — visibles uniquement en prison
  // ============================================================
  action("savoir", "etudier_prison", "Se former en prison", "📚", "Suivre des cours pour préparer sa réinsertion.", {
    prison: true, cooldown: 1,
    effects: [eff("Tu mets ce temps à profit pour apprendre. Bon comportement noté.", { modifiers: [m("intelligence", 2, "Formation carcérale"), m("discipline", 1, "Rigueur")], addMemory: ["bon_comportement"] })],
  }),
  action("corps", "muscu_cellule", "Musculation en cellule", "🏋️", "Se forger un physique pour survivre à l'intérieur.", {
    prison: true, cooldown: 1,
    effects: [eff("Ton corps s'endurcit derrière les barreaux.", { modifiers: [m("physique", 3, "Muscu carcérale"), m("sante", 1, "Forme")] })],
  }),
  action("corps", "bien_se_tenir", "Se tenir à carreau", "🙇", "Filer doux pour améliorer son dossier.", {
    prison: true, cooldown: 1,
    effects: [eff("Comportement exemplaire : ta libération conditionnelle se rapproche.", { modifiers: [m("mentalHealth", 2, "Discipline")], addMemory: ["bon_comportement"] })],
  }),
  action("social", "se_faire_respecter", "S'imposer dans la cour", "😤", "Montrer qu'on ne se laisse pas faire. Risqué.", {
    prison: true, cooldown: 1,
    risky: {
      successRate: 0.5,
      success: eff("On te respecte désormais. Ta position est plus sûre.", { modifiers: [m("charisme", 2, "Autorité"), m("physique", 1, "Poigne")] }),
      failure: eff("La bagarre tourne mal : blessures et rapport disciplinaire.", { modifiers: [m("sante", -6, "Bagarre"), m("mentalHealth", -3, "Tension")], addMemory: ["mauvais_comportement"] }),
    },
  }),
  action("crime", "gang_prison", "Rejoindre un gang de prison", "🔗", "Protection en échange d'allégeance.", {
    prison: true, once: true,
    effects: [eff("Sous la protection du gang, mais lié à eux dehors comme dedans.", { modifiers: [m("charisme", 1, "Réseau carcéral")], addMemory: ["gang", "crime_temptation", "mauvais_comportement"] })],
  }),
  action("crime", "evasion", "Préparer une évasion", "🪜", "Le grand risque : la liberté ou de longues années en plus.", {
    prison: true, cooldown: 2,
    risky: {
      successRate: 0.25,
      success: eff("Évasion réussie ! Tu recouvres la liberté, mais en cavale.", { release: true, modifiers: [m("physique", 2, "Sang-froid"), m("bonheur", 4, "Liberté")], addMemory: ["fugitif", "evade"] }),
      failure: eff("Tentative éventée : ta peine est alourdie.", { jail: { years: 4, reason: "Tentative d'évasion" }, modifiers: [m("mentalHealth", -5, "Isolement")], addMemory: ["mauvais_comportement"] }),
    },
  }),
  action("social", "conditionnelle", "Demander la conditionnelle", "⚖️", "Plaider sa libération anticipée devant le juge.", {
    prison: true, cooldown: 1,
    risky: {
      successRate: 0.4,
      success: eff("Libération conditionnelle accordée ! Tu retrouves l'air libre.", { release: true, modifiers: [m("bonheur", 6, "Liberté retrouvée")] }),
      failure: eff("Demande rejetée. Tu retournes en cellule.", { modifiers: [m("bonheur", -3, "Déception")] }),
    },
  }),
];

// Actions d'achat du marché noir, générées depuis le catalogue d'objets.
// Acheter = action `once` qui débite le prix et ajoute l'objet à l'inventaire.
for (const item of CRIME_ITEMS) {
  ACTIONS.push(
    action("crime", "buy_" + item.id, item.label, item.icon, item.description, {
      subBranch: "marche_noir",
      once: true,
      cost: item.price,
      condition: { minAge: 14 },
      effects: [eff(`Tu te procures : ${item.label}.`, { addItem: item.id })],
    })
  );
}

export const ACTIONS_BY_BRANCH: Record<ActionBranch, Action[]> = BRANCHES.reduce((acc, b) => {
  acc[b.id] = ACTIONS.filter((a) => a.branch === b.id);
  return acc;
}, {} as Record<ActionBranch, Action[]>);

export const SUB_BRANCHES_BY_BRANCH: Record<string, SubBranchInfo[]> = SUB_BRANCHES.reduce((acc, s) => {
  (acc[s.branch] ??= []).push(s);
  return acc;
}, {} as Record<string, SubBranchInfo[]>);
