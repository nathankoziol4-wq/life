/**
 * Moteur narratif génératif — l'"IA de jeu".
 * Compose des événements et des choix INÉDITS à chaque partie, à partir de blocs
 * (sujets, lieux, montants, archétypes de choix) assemblés selon le contexte du
 * personnage (âge, argent, emploi, relations, traits, pays, époque, prison…).
 * 100 % hors-ligne et déterministe par graine : durée de vie infinie, parties
 * toujours différentes. Chaque choix porte un `detail` et des effets chiffrés
 * exploités par l'aperçu de conséquences.
 */
import type { Character, GameEvent, EventChoice, EventEffect, Modifier, StatKey } from "../types";
import { Rng } from "./rng";

// --- Helpers ---
const M = (target: Modifier["target"], value: number, label: string): Modifier => ({ target, op: "add", value, label, source: "Génératif" });
const E = (outcome: string, o: Partial<EventEffect> = {}): EventEffect => ({ outcome, ...o });
const pick = <T>(rng: Rng, arr: T[]): T => arr[rng.int(0, arr.length - 1)];
/** Arrondit un montant à un ordre de grandeur lisible. */
const roundMoney = (n: number) => Math.max(50, Math.round(n / 50) * 50);

// --- Blocs de remplissage ---
const SUBJECTS = [
  "un collègue", "un vieil ami", "un inconnu au regard franc", "ton voisin", "un cousin éloigné",
  "un influenceur en vogue", "ton patron", "une figure du quartier", "un ancien camarade de classe",
  "un ancien amour", "un commerçant du coin", "un type louche", "une personne âgée", "un artiste fauché",
  "un entrepreneur pressé", "un membre de ta famille",
];
const PLACES = [
  "au travail", "dans la rue", "à une soirée", "en ligne", "au café du coin", "en vacances",
  "à la salle de sport", "dans les transports", "lors d'un mariage", "au marché", "à la banque",
];
const PROJECTS = ["un projet un peu fou", "une idée d'entreprise", "un pari audacieux", "une reconversion", "un investissement", "une collaboration artistique", "un voyage improvisé"];
const CAUSES = ["une association humanitaire", "une cause écologique", "un voisin en détresse", "une collecte de quartier", "un ami dans le besoin"];

/** Un archétype de choix "prudent" : petit gain sûr. */
function prudentChoice(rng: Rng): EventChoice {
  const stat = pick(rng, ["discipline", "mentalHealth", "intelligence"] as (StatKey | "mentalHealth")[]);
  const v = rng.int(2, 4);
  return {
    label: pick(rng, ["Jouer la sécurité", "Rester prudent", "Prendre le temps de réfléchir", "Ne rien précipiter"]),
    detail: "Une option sans risque, aux effets modestes mais garantis.",
    effects: [E("Tu choisis la voie de la raison.", { modifiers: [M(stat, v, "Prudence")] })],
  };
}

/** Un archétype de choix "audacieux" : pari (chance) à fort enjeu. */
function boldChoice(rng: Rng, char: Character, amount: number): EventChoice {
  const base = 0.4 + (char.stats.charisme + char.stats.chance) / 500; // ~0.4–0.6
  return {
    label: pick(rng, ["Tout tenter", "Foncer sans hésiter", "Saisir l'occasion", "Prendre le risque"]),
    detail: `Un pari à gros enjeu : environ ${Math.round(base * 100)} % de réussite (modulé par ta Chance). Gros gain possible, revers douloureux sinon.`,
    chance: base,
    effects: [E(`Le pari est gagnant ! Tu empoches ${roundMoney(amount).toLocaleString("fr-FR")} €.`, { money: roundMoney(amount), modifiers: [M("bonheur", 4, "Coup gagnant"), M("chance", 1, "Réussite")] })],
    failEffects: [E(`L'affaire tourne court : tu perds ${roundMoney(amount * 0.6).toLocaleString("fr-FR")} €.`, { money: -roundMoney(amount * 0.6), modifiers: [M("mentalHealth", -3, "Revers"), M("bonheur", -3, "Déception")] })],
  };
}

/** Un archétype "altruiste". */
function kindChoice(rng: Rng, cost: number): EventChoice {
  return {
    label: pick(rng, ["Aider sans compter", "Faire le bien", "Tendre la main", "Se montrer généreux"]),
    detail: `Tu donnes de ta personne (et ${roundMoney(cost).toLocaleString("fr-FR")} €). Ton bonheur et ta réputation en profitent.`,
    effects: [E("Ton geste te grandit et réchauffe les cœurs.", { money: -roundMoney(cost), modifiers: [M("bonheur", 4, "Altruisme"), M("charisme", 2, "Bonne réputation"), M("mentalHealth", 2, "Sens")] })],
  };
}

/** Un archétype "opportuniste / égoïste". */
function selfishChoice(rng: Rng, gain: number): EventChoice {
  return {
    label: pick(rng, ["Tirer profit de la situation", "Ne penser qu'à soi", "Prendre l'argent", "En profiter"]),
    detail: `Tu privilégies ton intérêt : +${roundMoney(gain).toLocaleString("fr-FR")} €, mais ta conscience et ton image en pâtissent.`,
    effects: [E("Tu passes avant les autres, et ça se voit.", { money: roundMoney(gain), modifiers: [M("charisme", -2, "Égoïsme"), M("mentalHealth", -1, "Petit remords")] })],
  };
}

/** Choix "passif". */
function passiveChoice(rng: Rng): EventChoice {
  return {
    label: pick(rng, ["Ne rien faire", "Laisser passer", "Ignorer", "Passer son chemin"]),
    detail: "Tu n'interviens pas. Peu d'effet, mais une occasion peut-être manquée.",
    effects: [E("Tu laisses filer.", { modifiers: [M("bonheur", -1, "Occasion manquée")] })],
  };
}

// --- Scénarios génératifs (chacun renvoie titre/texte/choix) ---
type Scenario = { title: string; text: string; choices: EventChoice[] };

function scOpportunity(rng: Rng, char: Character): Scenario {
  const who = pick(rng, SUBJECTS);
  const where = pick(rng, PLACES);
  const proj = pick(rng, PROJECTS);
  const amount = roundMoney(500 + Math.abs(char.money) * 0.05 + char.age * 200 + rng.int(0, 8000));
  return {
    title: pick(rng, ["Une occasion se présente", "Opportunité inattendue", "Un tournant possible"]),
    text: `${cap(where)}, ${who} propose à {name} de se lancer dans ${proj}.`,
    choices: [boldChoice(rng, char, amount), prudentChoice(rng), passiveChoice(rng)],
  };
}

function scMoral(rng: Rng, _char: Character): Scenario {
  const amount = roundMoney(200 + rng.int(0, 3000));
  const found = pick(rng, ["une liasse de billets", "un portefeuille bien garni", "un sac oublié", "une erreur de caisse en ta faveur"]);
  return {
    title: pick(rng, ["Dilemme moral", "Un cas de conscience", "Que faire ?"]),
    text: `{name} tombe sur ${found} (${amount.toLocaleString("fr-FR")} €). Personne ne regarde.`,
    choices: [
      { label: "Le rendre / signaler", detail: "L'honnêteté récompensée par la paix intérieure.", effects: [E("Ta probité te vaut un bonheur discret.", { modifiers: [M("bonheur", 3, "Honnêteté"), M("charisme", 1, "Intégrité")] })] },
      selfishChoice(rng, amount),
    ],
  };
}

function scSocial(rng: Rng, _char: Character): Scenario {
  const who = pick(rng, SUBJECTS);
  return {
    title: pick(rng, ["Invitation surprise", "Un lien à tisser", "Rencontre"]),
    text: `${cap(who)} invite {name} à passer du temps ensemble.`,
    choices: [
      { label: "Accepter chaleureusement", detail: "Renforce un lien social : bonheur et charisme.", effects: [E("Un bon moment partagé.", { modifiers: [M("bonheur", 3, "Lien social"), M("charisme", 2, "Sociabilité")], relationshipDelta: { kind: "ami", delta: 20 } })] },
      { label: "Décliner poliment", detail: "Tu préserves ton temps, au prix d'un lien.", effects: [E("Tu restes chez toi.", { modifiers: [M("mentalHealth", 1, "Repos")] })] },
    ],
  };
}

function scCause(rng: Rng, _char: Character): Scenario {
  const cause = pick(rng, CAUSES);
  return {
    title: pick(rng, ["Un appel à l'aide", "Une cause te touche", "Solidarité"]),
    text: `{name} est sollicité par ${cause}.`,
    choices: [kindChoice(rng, 200 + rng.int(0, 800)), passiveChoice(rng)],
  };
}

function scChallenge(rng: Rng, _char: Character): Scenario {
  const stat = pick(rng, ["physique", "intelligence", "creativite", "discipline"] as StatKey[]);
  const labels: Record<string, string> = { physique: "un défi sportif", intelligence: "un concours de connaissances", creativite: "un concours créatif", discipline: "un défi d'endurance mentale" };
  return {
    title: pick(rng, ["Un défi à relever", "Te dépasser ?", "L'occasion de briller"]),
    text: `On met {name} au défi : ${labels[stat]}.`,
    choices: [
      {
        label: "Relever le défi",
        detail: `Pari sur ton ${stat} : réussite ~50 %. Succès = progression et fierté.`,
        chance: 0.5,
        effects: [E("Tu triomphes du défi !", { modifiers: [M(stat, 4, "Dépassement"), M("bonheur", 3, "Fierté")] })],
        failEffects: [E("Tu échoues, mais tu apprends.", { modifiers: [M("mentalHealth", -2, "Échec"), M(stat, 1, "Leçon")] })],
      },
      passiveChoice(rng),
    ],
  };
}

function scHealth(rng: Rng, _char: Character): Scenario {
  const habit = pick(rng, ["un mode de vie plus sain", "une routine de sommeil", "une alimentation équilibrée", "une pratique de méditation"]);
  return {
    title: pick(rng, ["Prendre soin de soi", "Un déclic santé", "Nouvelle résolution"]),
    text: `{name} envisage d'adopter ${habit}.`,
    choices: [
      { label: "S'y tenir sérieusement", detail: "Effort de discipline récompensé par la santé.", effects: [E("Ton corps et ton esprit te remercient.", { modifiers: [M("sante", 4, "Hygiène de vie"), M("mentalHealth", 3, "Équilibre"), M("discipline", 1, "Constance")] })] },
      { label: "Laisser tomber vite", detail: "Le confort immédiat l'emporte.", effects: [E("Les bonnes résolutions s'envolent.", { modifiers: [M("bonheur", 1, "Laisser-aller")] })] },
    ],
  };
}

function scCareer(rng: Rng, char: Character): Scenario {
  const raise = roundMoney(2000 + char.age * 100);
  return {
    title: pick(rng, ["Carrefour professionnel", "Choix de carrière", "Au boulot"]),
    text: char.job
      ? `${cap(char.job.title)}, {name} peut soit se battre pour évoluer, soit lever le pied.`
      : `{name} hésite sur la direction à donner à sa vie professionnelle.`,
    choices: [
      { label: "Se donner à fond", detail: `Pari professionnel : réussite ~55 %. Succès = +${raise.toLocaleString("fr-FR")} € et reconnaissance.`, chance: 0.55, effects: [E("Ton investissement paie.", { money: raise, modifiers: [M("discipline", 2, "Ambition"), M("charisme", 1, "Reconnaissance")] })], failEffects: [E("Effort non récompensé, et de la fatigue.", { modifiers: [M("mentalHealth", -3, "Surmenage")] })] },
      { label: "Préserver son équilibre", detail: "Moins de stress, plus de sérénité.", effects: [E("Tu choisis ta qualité de vie.", { modifiers: [M("bonheur", 2, "Équilibre"), M("mentalHealth", 2, "Sérénité")] })] },
    ],
  };
}

function scTemptation(rng: Rng, _char: Character): Scenario {
  const gain = roundMoney(1000 + rng.int(0, 5000));
  return {
    title: pick(rng, ["Une tentation", "Zone grise", "Raccourci risqué"]),
    text: `On propose à {name} un moyen rapide mais douteux de gagner ${gain.toLocaleString("fr-FR")} €.`,
    choices: [
      {
        label: "Accepter le raccourci",
        detail: `Pari risqué (~45 %) : gros gain, mais risque d'ennuis (réputation, voire pire).`,
        chance: 0.45,
        effects: [E("Ça passe : l'argent est là.", { money: gain, modifiers: [M("bonheur", 1, "Argent facile")], addMemory: ["opportuniste"] })],
        failEffects: [E("Ça casse : ennuis et réputation entachée.", { money: -roundMoney(gain * 0.4), modifiers: [M("charisme", -3, "Réputation"), M("mentalHealth", -3, "Stress")], addMemory: ["casier_leger"] })],
      },
      { label: "Refuser par principe", detail: "Ta conscience reste nette.", effects: [E("Tu gardes les mains propres.", { modifiers: [M("mentalHealth", 2, "Conscience tranquille")] })] },
    ],
  };
}

function scEra(rng: Rng, char: Character): Scenario {
  const tech = char.memory.includes("ai_era") || char.memory.includes("ai_native")
    ? "un nouvel outil d'IA qui fait sensation"
    : char.memory.includes("internet_native") || char.memory.includes("social_media")
      ? "une nouvelle plateforme qui cartonne"
      : "une innovation qui bouleverse le quotidien";
  return {
    title: pick(rng, ["Vent de nouveauté", "L'air du temps", "Innovation"]),
    text: `Tout le monde parle de ${tech}. {name} peut s'y mettre.`,
    choices: [
      { label: "L'adopter en avance", detail: "Prendre le train en marche : intelligence et opportunités.", effects: [E("Tu prends une longueur d'avance.", { modifiers: [M("intelligence", 2, "Early adopter"), M("charisme", 1, "Dans le coup")], addMemory: ["early_adopter"] })] },
      { label: "Rester à l'écart", detail: "Tu observes sans t'engager.", effects: [E("Tu regardes passer la vague.", { modifiers: [] })] },
    ],
  };
}

function scFamily(rng: Rng, _char: Character): Scenario {
  return {
    title: pick(rng, ["Affaire de famille", "Les tiens", "Lien du sang"]),
    text: `Un proche de {name} traverse une période délicate et demande du soutien.`,
    choices: [
      { label: "Être présent pour eux", detail: "Renforce les liens familiaux ; un peu d'énergie en moins.", effects: [E("Ta présence compte énormément.", { modifiers: [M("bonheur", 3, "Solidarité familiale"), M("mentalHealth", -1, "Charge émotionnelle")], relationshipDelta: { kind: "parent", delta: 15 } })] },
      { label: "Garder ses distances", detail: "Tu te protèges, au risque de t'éloigner.", effects: [E("Tu choisis de te préserver.", { modifiers: [M("mentalHealth", 1, "Protection")], relationshipDelta: { kind: "parent", delta: -10 } })] },
    ],
  };
}

// Table pondérée de scénarios selon le contexte.
function pickScenario(rng: Rng, char: Character): Scenario {
  const opts: { w: number; fn: (r: Rng, c: Character) => Scenario }[] = [
    { w: 10, fn: scOpportunity },
    { w: 8, fn: scMoral },
    { w: 9, fn: scSocial },
    { w: 6, fn: scCause },
    { w: 7, fn: scChallenge },
    { w: 7, fn: scHealth },
    { w: char.age >= 20 ? 10 : 2, fn: scCareer },
    { w: char.memory.includes("crime_temptation") || char.money < 0 ? 10 : 5, fn: scTemptation },
    { w: 6, fn: scEra },
    { w: char.creation.familyStructureId === "orphelin" ? 1 : 7, fn: scFamily },
  ];
  const chosen = rng.weighted(opts, (o) => o.w) ?? opts[0];
  return chosen.fn(rng, char);
}

/** Génère un événement inédit, prêt à être présenté. */
export function generateEvent(char: Character, rng: Rng, uid: number): GameEvent {
  const sc = pickScenario(rng, char);
  return {
    id: "gen_" + uid,
    title: sc.title,
    text: sc.text,
    category: "special",
    weight: 1,
    generated: true,
    choices: sc.choices,
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
