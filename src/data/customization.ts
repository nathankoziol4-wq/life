/**
 * Customisation approfondie du personnage : environnement, apparence détaillée,
 * psyché, vices, objectifs de vie. Chaque option reste fidèle au principe du jeu :
 * elle émet des modifiers et/ou des tags mécaniquement exploités.
 */
import type { ChoiceOption } from "../types";

/** Fabrique légère d'option. */
function opt(id: string, label: string, icon: string, mods: ChoiceOption["modifiers"] = [], tags: string[] = [], description?: string): ChoiceOption {
  return { id, label, icon, description, modifiers: mods, tags };
}
const M = (target: ChoiceOption["modifiers"][number]["target"], value: number, label: string, source: string) =>
  ({ target, op: "add" as const, value, label, source });

// ------------------------------------------------------------------ ORIGINE +
export const CITY_TYPES: ChoiceOption[] = [
  opt("metropole", "Métropole", "🏙️", [M("networkQuality", 10, "Grande ville", "Environnement"), M("crimeExposure", 8, "Densité urbaine", "Environnement"), M("charisme", 2, "Vie sociale intense", "Environnement")], ["city:metropole"], "Opportunités et anonymat, mais stress et coût de la vie."),
  opt("ville", "Ville moyenne", "🏘️", [M("bonheur", 2, "Équilibre", "Environnement")], ["city:ville"], "Le compromis entre calme et opportunités."),
  opt("campagne", "Campagne", "🌾", [M("sante", 4, "Air pur", "Environnement"), M("networkQuality", -8, "Isolement", "Environnement"), M("bonheur", 3, "Nature", "Environnement")], ["city:campagne", "rural"], "Nature et tranquillité, loin de tout."),
];

export const RELIGIONS: ChoiceOption[] = [
  opt("aucune", "Aucune / athée", "⚛️", [], ["religion:none"]),
  opt("chretien", "Christianisme", "✝️", [M("bonheur", 2, "Communauté de foi", "Religion")], ["religion:christian", "religious"]),
  opt("musulman", "Islam", "☪️", [M("discipline", 3, "Pratique rituelle", "Religion")], ["religion:muslim", "religious"]),
  opt("juif", "Judaïsme", "✡️", [M("intelligence", 2, "Culture de l'étude", "Religion")], ["religion:jewish", "religious"]),
  opt("hindou", "Hindouisme", "🕉️", [M("mentalHealth", 3, "Spiritualité", "Religion")], ["religion:hindu", "religious"]),
  opt("bouddhiste", "Bouddhisme", "☸️", [M("mentalHealth", 6, "Sérénité", "Religion"), M("bonheur", 2, "Détachement", "Religion")], ["religion:buddhist", "religious"]),
  opt("spirituel", "Spirituel non affilié", "🔮", [M("creativite", 2, "Ouverture", "Religion")], ["religion:spiritual"]),
];

// ------------------------------------------------------------------ APPARENCE +
export const SKIN_TONES: ChoiceOption[] = [
  opt("tres_clair", "Très clair", "🏻", [], ["skin:1"]),
  opt("clair", "Clair", "🏼", [], ["skin:2"]),
  opt("mat", "Mat", "🏽", [], ["skin:3"]),
  opt("fonce", "Foncé", "🏾", [], ["skin:4"]),
  opt("tres_fonce", "Très foncé", "🏿", [], ["skin:5"]),
];

export const HAIR_STYLES: ChoiceOption[] = [
  opt("brun", "Bruns", "🟤", [], ["hair:brun"]),
  opt("blond", "Blonds", "🟡", [M("charisme", 1, "Cheveux blonds", "Apparence")], ["hair:blond"]),
  opt("roux", "Roux", "🟠", [M("charisme", 1, "Rareté rousse", "Apparence")], ["hair:roux"]),
  opt("noir", "Noirs", "⚫", [], ["hair:noir"]),
  opt("chatain", "Châtains", "🌰", [], ["hair:chatain"]),
  opt("rase", "Rasé / chauve", "🧑‍🦲", [], ["hair:rase"]),
];

export const EYE_COLORS: ChoiceOption[] = [
  opt("marron", "Marron", "🟤", [], ["eyes:marron"]),
  opt("bleu", "Bleus", "🔵", [M("charisme", 1, "Yeux bleus", "Apparence")], ["eyes:bleu"]),
  opt("vert", "Verts", "🟢", [M("charisme", 1, "Yeux verts", "Apparence")], ["eyes:vert"]),
  opt("noisette", "Noisette", "🟠", [], ["eyes:noisette"]),
  opt("gris", "Gris", "⚪", [], ["eyes:gris"]),
];

export const FEATURES: ChoiceOption[] = [
  opt("aucun_feature", "Aucun", "—", [], []),
  opt("grain", "Grain de beauté", "🔘", [M("charisme", 2, "Signe particulier", "Apparence")], ["feature:grain"]),
  opt("cicatrice", "Cicatrice", "⚔️", [M("charisme", 1, "Air mystérieux", "Apparence"), M("physique", 1, "Vécu", "Apparence")], ["feature:cicatrice"]),
  opt("taches", "Taches de rousseur", "✨", [M("charisme", 2, "Charme naturel", "Apparence")], ["feature:taches"]),
  opt("tatouages", "Tatouages", "🖋️", [M("creativite", 2, "Expression corporelle", "Apparence")], ["feature:tatouages"]),
  opt("piercings", "Piercings", "💠", [M("creativite", 1, "Style affirmé", "Apparence")], ["feature:piercings"]),
];

export const VOICES: ChoiceOption[] = [
  opt("douce", "Douce", "🕊️", [M("charisme", 2, "Voix apaisante", "Apparence")], ["voice:douce"]),
  opt("grave", "Grave", "🎙️", [M("charisme", 3, "Voix imposante", "Apparence")], ["voice:grave"]),
  opt("aigue", "Aiguë", "🔔", [], ["voice:aigue"]),
  opt("posee", "Posée", "🎚️", [M("charisme", 2, "Éloquence", "Apparence")], ["voice:posee"]),
  opt("nasillarde", "Nasillarde", "👃", [M("charisme", -2, "Voix ingrate", "Apparence")], ["voice:nasillarde"]),
];

// ------------------------------------------------------------------ PSYCHÉ
export const ORIENTATIONS: ChoiceOption[] = [
  opt("hetero", "Hétérosexuel·le", "💞", [], ["orient:hetero"]),
  opt("homo", "Homosexuel·le", "🏳️‍🌈", [], ["orient:homo"]),
  opt("bi", "Bisexuel·le", "💜", [], ["orient:bi"]),
  opt("asexuel", "Asexuel·le", "🖤", [], ["orient:asexuel"]),
];

export const VALUES: ChoiceOption[] = [
  opt("famille", "Famille", "👨‍👩‍👧", [M("bonheur", 2, "Valeur : famille", "Valeurs")], ["value:famille"]),
  opt("liberte", "Liberté", "🕊️", [M("creativite", 2, "Valeur : liberté", "Valeurs")], ["value:liberte"]),
  opt("reussite", "Réussite", "🏆", [M("discipline", 3, "Valeur : réussite", "Valeurs")], ["value:reussite"]),
  opt("justice", "Justice", "⚖️", [M("charisme", 2, "Valeur : justice", "Valeurs")], ["value:justice"]),
  opt("plaisir", "Plaisir", "🍹", [M("bonheur", 3, "Valeur : plaisir", "Valeurs"), M("discipline", -2, "Hédonisme", "Valeurs")], ["value:plaisir"]),
  opt("savoir", "Savoir", "📚", [M("intelligence", 3, "Valeur : savoir", "Valeurs")], ["value:savoir"]),
  opt("pouvoir", "Pouvoir", "👑", [M("charisme", 2, "Valeur : pouvoir", "Valeurs"), M("discipline", 1, "Ambition", "Valeurs")], ["value:pouvoir"]),
  opt("spiritualite", "Spiritualité", "🧘", [M("mentalHealth", 4, "Valeur : spiritualité", "Valeurs")], ["value:spiritualite"]),
];

export const FEARS: ChoiceOption[] = [
  opt("echec", "Peur de l'échec", "📉", [M("discipline", 2, "Évitement de l'échec", "Peurs"), M("mentalHealth", -3, "Anxiété de performance", "Peurs")], ["fear:echec"]),
  opt("solitude", "Peur de la solitude", "🕳️", [M("charisme", 2, "Recherche du lien", "Peurs"), M("mentalHealth", -3, "Angoisse d'abandon", "Peurs")], ["fear:solitude"]),
  opt("mort", "Peur de la mort", "💀", [M("mentalHealth", -4, "Angoisse existentielle", "Peurs"), M("sante", 2, "Prudence", "Peurs")], ["fear:mort"]),
  opt("rejet", "Peur du rejet", "🙅", [M("charisme", -2, "Repli", "Peurs")], ["fear:rejet"]),
  opt("pauvrete", "Peur de la pauvreté", "🪙", [M("discipline", 3, "Épargne obsessionnelle", "Peurs")], ["fear:pauvrete"]),
  opt("aucune_peur", "Aucune peur majeure", "🦁", [M("mentalHealth", 5, "Sérénité", "Peurs")], ["fear:none"]),
];

export const TEMPERAMENTS: ChoiceOption[] = [
  opt("sanguin", "Sanguin", "🔥", [M("charisme", 3, "Tempérament sanguin", "Tempérament"), M("bonheur", 2, "Enthousiasme", "Tempérament")], ["temper:sanguin"], "Extraverti, sociable, impulsif."),
  opt("colerique", "Colérique", "⚡", [M("discipline", 2, "Détermination", "Tempérament"), M("mentalHealth", -3, "Irascibilité", "Tempérament")], ["temper:colerique"], "Ambitieux, énergique, prompt à s'emporter."),
  opt("melancolique", "Mélancolique", "🌧️", [M("creativite", 4, "Profondeur", "Tempérament"), M("bonheur", -2, "Tendance sombre", "Tempérament")], ["temper:melancolique"], "Introspectif, sensible, créatif."),
  opt("flegmatique", "Flegmatique", "🧊", [M("mentalHealth", 6, "Sang-froid", "Tempérament"), M("charisme", -1, "Réserve", "Tempérament")], ["temper:flegmatique"], "Calme, posé, difficile à ébranler."),
];

// ------------------------------------------------------------------ VICES
export const VICES: ChoiceOption[] = [
  opt("tabac", "Tabac", "🚬", [M("sante", -4, "Fumeur", "Vice"), M("addictionRisk", 15, "Nicotine", "Vice")], ["vice:tabac"]),
  opt("alcool", "Alcool", "🍺", [M("sante", -3, "Alcool", "Vice"), M("addictionRisk", 15, "Alcool", "Vice"), M("bonheur", 2, "Convivialité", "Vice")], ["vice:alcool"]),
  opt("jeu", "Jeux d'argent", "🎰", [M("addictionRisk", 20, "Jeu", "Vice"), M("chance", 2, "Goût du risque", "Vice")], ["vice:jeu"]),
  opt("junkfood", "Malbouffe", "🍔", [M("sante", -3, "Alimentation", "Vice"), M("bonheur", 2, "Plaisir gustatif", "Vice")], ["vice:junkfood"]),
  opt("ecrans", "Écrans / réseaux", "📱", [M("discipline", -3, "Procrastination", "Vice"), M("mentalHealth", -2, "Comparaison sociale", "Vice")], ["vice:ecrans"]),
];

// ------------------------------------------------------------------ OBJECTIFS DE VIE
export const LIFE_GOALS: ChoiceOption[] = [
  opt("fortune", "Faire fortune", "💰", [M("discipline", 2, "Objectif : fortune", "Rêve")], ["goal:fortune"], "Amasser plus d'un million."),
  opt("celebrite", "Devenir célèbre", "🌟", [M("charisme", 2, "Objectif : célébrité", "Rêve")], ["goal:celebrite"], "Atteindre la gloire."),
  opt("famille_nombreuse", "Fonder une grande famille", "👪", [M("bonheur", 2, "Objectif : famille", "Rêve")], ["goal:famille"], "Se marier et avoir des enfants."),
  opt("savoir_supreme", "Atteindre le sommet du savoir", "🎓", [M("intelligence", 3, "Objectif : savoir", "Rêve")], ["goal:savoir"], "Obtenir un doctorat."),
  opt("pouvoir_politique", "Conquérir le pouvoir", "🏛️", [M("charisme", 2, "Objectif : pouvoir", "Rêve")], ["goal:pouvoir"], "Gravir les échelons politiques."),
  opt("bonheur_simple", "Trouver le bonheur simple", "🌻", [M("bonheur", 5, "Objectif : sérénité", "Rêve"), M("mentalHealth", 3, "Paix intérieure", "Rêve")], ["goal:bonheur"], "Mourir heureux et en paix."),
  opt("crime_empire", "Bâtir un empire criminel", "🕶️", [M("crimeExposure", 10, "Objectif : pègre", "Rêve")], ["goal:crime", "crime_temptation"], "Devenir un parrain redouté."),
];

// Index par id pour la collecte de modifiers.
export const CUSTOM_INDEX: Record<string, ChoiceOption> = Object.fromEntries(
  [
    ...CITY_TYPES, ...RELIGIONS, ...SKIN_TONES, ...HAIR_STYLES, ...EYE_COLORS,
    ...FEATURES, ...VOICES, ...ORIENTATIONS, ...VALUES, ...FEARS, ...TEMPERAMENTS,
    ...VICES, ...LIFE_GOALS,
  ].map((o) => [o.id, o])
);
