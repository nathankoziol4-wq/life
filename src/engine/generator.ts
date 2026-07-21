/**
 * Moteur narratif génératif — l'"IA de jeu", désormais COHÉRENTE AVEC L'ÂGE.
 * Chaque scénario déclare une tranche d'âge d'application (enfance, ado, adulte,
 * senior) ; le tirage ne propose que des situations crédibles pour l'âge courant.
 * Compose des événements et choix INÉDITS à chaque partie à partir de blocs
 * assemblés selon le contexte (âge, argent, emploi, relations, traits, époque).
 * 100 % hors-ligne. Chaque choix porte un `detail` et des effets chiffrés.
 */
import type { Character, GameEvent, EventChoice, EventEffect, Modifier, StatKey } from "../types";
import { Rng } from "./rng";

// --- Helpers ---
const M = (target: Modifier["target"], value: number, label: string): Modifier => ({ target, op: "add", value, label, source: "Génératif" });
const E = (outcome: string, o: Partial<EventEffect> = {}): EventEffect => ({ outcome, ...o });
const pick = <T>(rng: Rng, a: T[]): T => a[rng.int(0, a.length - 1)];
const roundMoney = (n: number) => Math.max(50, Math.round(n / 50) * 50);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Pioche un LIBELLÉ de choix en évitant ceux récemment affichés (mémoire de
 * session), pour que les choix ne se ressemblent pas d'un événement à l'autre.
 */
const _seenLabels = new Set<string>();
function pickL(rng: Rng, arr: string[]): string {
  const fresh = arr.filter((x) => !_seenLabels.has(x));
  const chosen = fresh.length ? fresh[rng.int(0, fresh.length - 1)] : arr[rng.int(0, arr.length - 1)];
  _seenLabels.add(chosen);
  if (_seenLabels.size > 300) _seenLabels.clear(); // évite la saturation
  return chosen;
}

/** Garantit que deux choix d'un même événement n'ont jamais le même libellé. */
function ensureDistinct(choices: EventChoice[]): EventChoice[] {
  const used = new Set<string>();
  return choices.map((c) => {
    if (!used.has(c.label)) {
      used.add(c.label);
      return c;
    }
    let alt = c.label;
    let n = 2;
    while (used.has(alt)) alt = `${c.label} (variante ${n++})`;
    used.add(alt);
    return { ...c, label: alt };
  });
}

// --- Blocs de remplissage (larges pour maximiser la variété) ---
const SUBJECTS = ["un collègue", "un vieil ami", "un inconnu au regard franc", "ton voisin", "un cousin éloigné", "un influenceur en vogue", "ton patron", "une figure du quartier", "un ancien camarade de classe", "un ancien amour", "un commerçant du coin", "un type louche", "une personne âgée", "un artiste fauché", "un entrepreneur pressé", "un membre de ta famille", "une ancienne connaissance", "un ami d'ami", "un notable du coin", "un mystérieux inconnu", "un rival de longue date", "un fan enthousiaste"];
const PLACES = ["au travail", "dans la rue", "à une soirée", "en ligne", "au café du coin", "en vacances", "à la salle de sport", "dans les transports", "lors d'un mariage", "au marché", "à la banque", "dans la file d'attente", "à un enterrement", "en soirée entre amis", "au parc", "dans un ascenseur", "à la sortie du travail", "lors d'un dîner"];
const PROJECTS = ["un projet un peu fou", "une idée d'entreprise", "un pari audacieux", "une reconversion", "un investissement", "une collaboration artistique", "un voyage improvisé", "une association", "un coup financier", "un défi complètement dingue", "une aventure risquée", "une start-up prometteuse"];
const CAUSES = ["une association humanitaire", "une cause écologique", "un voisin en détresse", "une collecte de quartier", "un ami dans le besoin", "un refuge pour animaux", "une banque alimentaire", "des sinistrés d'une catastrophe"];
const KID_SUBJECTS = ["un camarade de classe", "un enfant du quartier", "ton meilleur ami", "un nouveau à l'école", "ta maîtresse", "ton grand cousin"];

// --- Archétypes de choix réutilisables ---
function prudentChoice(rng: Rng): EventChoice {
  const stat = pick(rng, ["discipline", "mentalHealth", "intelligence"] as (StatKey | "mentalHealth")[]);
  return { label: pickL(rng, ["Jouer la sécurité", "Rester prudent", "Prendre le temps de réfléchir", "Ne rien précipiter", "Y aller doucement", "Peser le pour et le contre", "Rester raisonnable", "Garder la tête froide", "Temporiser"]), detail: "Une option sans risque, aux effets modestes mais garantis.", effects: [E(pick(rng, ["Tu choisis la voie de la raison.", "La prudence te réussit.", "Un choix mesuré, sans éclat mais sûr.", "Tu avances pas à pas, sereinement.", "La sagesse l'emporte sur l'impulsion."]), { modifiers: [M(stat, rng.int(2, 4), "Prudence")] })] };
}
function boldChoice(rng: Rng, char: Character, amount: number): EventChoice {
  const base = 0.4 + (char.stats.charisme + char.stats.chance) / 500;
  return { label: pickL(rng, ["Tout tenter", "Foncer sans hésiter", "Saisir l'occasion", "Prendre le risque", "Jouer le tout pour le tout", "Se jeter à l'eau", "Tenter le diable", "Miser gros", "Oser", "Ne rien regretter"]), detail: `Un pari à gros enjeu : environ ${Math.round(base * 100)} % de réussite (modulé par ta Chance). Gros gain possible, revers douloureux sinon.`, chance: base, effects: [E(pick(rng, [`Le pari est gagnant ! Tu empoches ${roundMoney(amount).toLocaleString("fr-FR")} €.`, `Jackpot : ${roundMoney(amount).toLocaleString("fr-FR")} € tombent dans ta poche.`, `Ton audace paie : +${roundMoney(amount).toLocaleString("fr-FR")} €.`, `Coup de maître ! ${roundMoney(amount).toLocaleString("fr-FR")} € de gagnés.`]), { money: roundMoney(amount), modifiers: [M("bonheur", 4, "Coup gagnant"), M("chance", 1, "Réussite")] })], failEffects: [E(pick(rng, [`L'affaire tourne court : tu perds ${roundMoney(amount * 0.6).toLocaleString("fr-FR")} €.`, `Fiasco : ${roundMoney(amount * 0.6).toLocaleString("fr-FR")} € partis en fumée.`, `Le pari échoue, tu laisses ${roundMoney(amount * 0.6).toLocaleString("fr-FR")} € sur le tapis.`]), { money: -roundMoney(amount * 0.6), modifiers: [M("mentalHealth", -3, "Revers"), M("bonheur", -3, "Déception")] })] };
}
function kindChoice(rng: Rng, cost: number): EventChoice {
  return { label: pickL(rng, ["Aider sans compter", "Faire le bien", "Tendre la main", "Se montrer généreux", "Donner de son temps", "Offrir son aide", "Faire preuve de cœur"]), detail: `Tu donnes de ta personne (et ${roundMoney(cost).toLocaleString("fr-FR")} €). Ton bonheur et ta réputation en profitent.`, effects: [E(pick(rng, ["Ton geste te grandit et réchauffe les cœurs.", "Aider te remplit d'une joie sincère.", "Ta générosité ne passe pas inaperçue.", "Tu repars le cœur léger."]), { money: -roundMoney(cost), modifiers: [M("bonheur", 4, "Altruisme"), M("charisme", 2, "Bonne réputation"), M("mentalHealth", 2, "Sens")] })] };
}
function selfishChoice(rng: Rng, gain: number): EventChoice {
  return { label: pickL(rng, ["Tirer profit de la situation", "Ne penser qu'à soi", "Prendre l'argent", "En profiter", "Passer avant les autres", "Empocher discrètement", "Jouer perso"]), detail: `Tu privilégies ton intérêt : +${roundMoney(gain).toLocaleString("fr-FR")} €, mais ta conscience et ton image en pâtissent.`, effects: [E(pick(rng, ["Tu passes avant les autres, et ça se voit.", "L'argent d'abord, tant pis pour le reste.", "Tu empoches sans état d'âme... presque.", "Ton intérêt prime, au prix d'un pincement."]), { money: roundMoney(gain), modifiers: [M("charisme", -2, "Égoïsme"), M("mentalHealth", -1, "Petit remords")] })] };
}
function passiveChoice(rng: Rng): EventChoice {
  return { label: pickL(rng, ["Ne rien faire", "Laisser passer", "Ignorer", "Passer son chemin", "S'abstenir", "Rester en retrait", "Faire l'autruche"]), detail: "Tu n'interviens pas. Peu d'effet, mais une occasion peut-être manquée.", effects: [E(pick(rng, ["Tu laisses filer.", "Tu détournes le regard.", "Ce n'est pas ton problème, décides-tu.", "Tu passes, indifférent."]), { modifiers: [M("bonheur", -1, "Occasion manquée")] })] };
}

type Scenario = { title: string; text: string; choices: EventChoice[] };
type Def = { id: string; min: number; max: number; w: (c: Character) => number; fn: (r: Rng, c: Character) => Scenario };

// ============================ PETITE ENFANCE (1–3) ============================
function scToddler(rng: Rng): Scenario {
  return { title: pick(rng, ["Premiers pas", "Découverte du monde", "Petite exploration"]), text: pick(rng, ["{name} découvre le monde à quatre pattes.", "{name} fait ses premiers pas hésitants.", "{name} babille et explore tout ce qui l'entoure."]), choices: [
    { label: "Explorer avec curiosité", detail: "Un tout-petit avide de découvertes.", effects: [E("Chaque objet est une aventure. Ton éveil s'accélère.", { modifiers: [M("intelligence", 2, "Éveil"), M("bonheur", 2, "Curiosité")] })] },
    { label: "Rester dans les bras de papa/maman", detail: "Le cocon rassurant.", effects: [E("Blotti contre les tiens, tu te sens en sécurité.", { modifiers: [M("mentalHealth", 3, "Attachement")] })] },
  ] };
}

// ============================ ENFANCE (3–11) ============================
function scToy(rng: Rng): Scenario {
  const toy = pick(rng, ["un jouet", "une console", "un vélo tout neuf", "une peluche", "des cartes à collectionner"]);
  return { title: pick(rng, ["Objet de convoitise", "Le jouet tant désiré"]), text: `{name} rêve d'${toy.startsWith("un ") ? "" : ""}${toy}. Un autre enfant a le même.`, choices: [
    { label: "Partager et jouer ensemble", detail: "Tu apprends à partager : de l'amitié en plus.", effects: [E("Vous devenez inséparables.", { modifiers: [M("charisme", 2, "Partage"), M("bonheur", 3, "Amitié")] })] },
    { label: "Le garder jalousement", detail: "Tu gardes tout pour toi.", effects: [E("Tu joues seul, un peu boudeur.", { modifiers: [M("bonheur", -1, "Solitude")] })] },
    { label: "Faire un caprice aux parents", detail: "Tu réclames le tien à tout prix.", effects: [E("Après une crise, tu l'obtiens... ou pas.", { modifiers: [M("discipline", -2, "Caprice"), M("bonheur", 1, "Obstination")] })] },
  ] };
}
function scSchool(rng: Rng): Scenario {
  return { title: pick(rng, ["À l'école", "Jour de contrôle"]), text: `{name} a un contrôle important demain à l'école.`, choices: [
    { label: "Bien réviser", detail: "L'effort scolaire paie.", effects: [E("Bonne note ! Tes parents sont fiers.", { modifiers: [M("intelligence", 3, "Révisions"), M("discipline", 1, "Sérieux")] })] },
    { label: "Aller jouer dehors", detail: "Le jeu avant les devoirs.", effects: [E("Tu t'amuses, mais la note pique.", { modifiers: [M("bonheur", 2, "Jeu"), M("intelligence", -1, "Note ratée")] })] },
  ] };
}
function scPlayground(rng: Rng): Scenario {
  const who = pick(rng, KID_SUBJECTS);
  return { title: pick(rng, ["Dans la cour", "Récréation mouvementée"]), text: `À la récré, ${who} bouscule {name} et se moque.`, choices: [
    { label: "En rire et proposer de jouer", detail: "Désamorcer par la bonne humeur.", effects: [E("Ta bonne humeur transforme un rival en copain.", { modifiers: [M("charisme", 3, "Sang-froid"), M("bonheur", 2, "Nouvelle amitié")] })] },
    { label: "Tenir tête", detail: "Tu refuses de te laisser faire.", effects: [E("On te respecte désormais.", { modifiers: [M("physique", 1, "Courage"), M("charisme", 1, "Respect")] })] },
    { label: "Le dire à la maîtresse", detail: "Chercher l'aide d'un adulte.", effects: [E("L'adulte intervient et ça se calme.", { modifiers: [M("mentalHealth", 2, "Soutien")] })] },
  ] };
}
function scPocket(_rng: Rng): Scenario {
  return { title: "Argent de poche", text: `{name} reçoit un peu d'argent de poche.`, choices: [
    { label: "Économiser dans une tirelire", detail: "Apprendre la valeur de l'épargne.", effects: [E("Ta tirelire se remplit doucement.", { money: 40, modifiers: [M("discipline", 2, "Épargne")] })] },
    { label: "Tout dépenser en bonbons", detail: "Le plaisir immédiat.", effects: [E("Un festin sucré... et un mal de ventre.", { modifiers: [M("bonheur", 3, "Sucreries"), M("sante", -1, "Excès")] })] },
  ] };
}
function scPet(rng: Rng): Scenario {
  const a = pick(rng, ["un chaton abandonné", "un chiot perdu", "un oiseau tombé du nid"]);
  return { title: "Une petite bête", text: `{name} trouve ${a} dans la rue.`, choices: [
    { label: "Le recueillir", detail: "Un compagnon à protéger.", effects: [E("Tes parents craquent : tu l'adoptes !", { modifiers: [M("bonheur", 5, "Amour animal"), M("mentalHealth", 2, "Tendresse")], addMemory: ["a_un_animal"] })] },
    { label: "Prévenir un adulte", detail: "Chercher de l'aide pour lui.", effects: [E("Un adulte s'en occupe. Tu as bien agi.", { modifiers: [M("charisme", 1, "Bon geste")] })] },
  ] };
}
function scNightmare(rng: Rng): Scenario {
  void rng;
  return { title: "Cauchemar", text: `{name} se réveille en pleine nuit, terrifié par un cauchemar.`, choices: [
    { label: "Aller voir ses parents", detail: "Chercher du réconfort.", effects: [E("Un câlin et tout va mieux.", { modifiers: [M("mentalHealth", 3, "Réconfort")] })] },
    { label: "Affronter sa peur seul", detail: "Se rassurer tout seul.", effects: [E("Tu te rendors, un peu plus courageux.", { modifiers: [M("discipline", 2, "Courage"), M("mentalHealth", -1, "Nuit difficile")] })] },
  ] };
}

// ============================ ADOLESCENCE (12–17) ============================
function scCrush(rng: Rng): Scenario {
  return { title: pick(rng, ["Premier béguin", "Papillons dans le ventre"]), text: `{name} craque pour quelqu'un de sa classe.`, choices: [
    { label: "Oser lui parler", detail: "Un pari sur ton charisme.", chance: 0.45 + 0, effects: [E("Le courant passe ! Vous vous rapprochez.", { modifiers: [M("charisme", 2, "Audace"), M("bonheur", 5, "Amourette")], addMemory: ["premier_amour"] })], failEffects: [E("Tu bafouilles et t'enfuis, rouge de honte.", { modifiers: [M("bonheur", -2, "Timidité"), M("charisme", 1, "Leçon")] })] },
    { label: "Admirer de loin", detail: "Garder ça pour soi.", effects: [E("Tu rêves en silence.", { modifiers: [M("creativite", 2, "Rêverie"), M("bonheur", -1, "Frustration")] })] },
  ] };
}
function scParty(rng: Rng): Scenario {
  return { title: pick(rng, ["Invitation à une fête", "La soirée dont tout le monde parle"]), text: `{name} est invité à une fête où il y aura de l'alcool.`, choices: [
    { label: "Y aller et faire la fête", detail: "Amusement, mais risques.", effects: [E("Nuit mémorable... et petite gueule de bois.", { modifiers: [M("bonheur", 4, "Fête"), M("charisme", 2, "Popularité"), M("addictionRisk", 5, "Premiers excès")], addMemory: ["fetard"] })] },
    { label: "Y aller mais rester sobre", detail: "Profiter sans déraper.", effects: [E("Tu t'amuses en gardant le contrôle.", { modifiers: [M("bonheur", 2, "Sociable"), M("discipline", 2, "Maîtrise")] })] },
    { label: "Rester à la maison", detail: "Pas envie ce soir.", effects: [E("Soirée tranquille, un brin de FOMO.", { modifiers: [M("mentalHealth", 1, "Repos"), M("bonheur", -1, "FOMO")] })] },
  ] };
}
function scRebellion(rng: Rng): Scenario {
  return { title: pick(rng, ["Envie de transgresser", "Crise d'ado"]), text: `{name} bout intérieurement et a envie de braver l'autorité.`, choices: [
    { label: "Se rebeller ouvertement", detail: "Affirmer son indépendance, quitte à froisser.", effects: [E("Tu claques la porte. Tension à la maison.", { modifiers: [M("creativite", 2, "Affirmation"), M("bonheur", -2, "Conflit")], relationshipDelta: { kind: "parent", delta: -12 } })] },
    { label: "Canaliser dans une passion", detail: "Transformer la colère en énergie.", effects: [E("Tu te jettes dans une passion (musique, sport, art).", { modifiers: [M("creativite", 3, "Exutoire"), M("discipline", 2, "Canalisé")], addMemory: ["passion_ado"] })] },
  ] };
}
function scExam(rng: Rng): Scenario {
  void rng;
  return { title: "Examen décisif", text: `{name} passe un examen qui compte pour son avenir.`, choices: [
    { label: "Se donner à fond", detail: "Pari sur ton intelligence.", chance: 0.5, effects: [E("Mention ! Les portes s'ouvrent.", { modifiers: [M("intelligence", 4, "Réussite"), M("bonheur", 4, "Fierté")], addMemory: ["bon_eleve"] })], failEffects: [E("Résultat décevant malgré tes efforts.", { modifiers: [M("mentalHealth", -3, "Déception"), M("discipline", 2, "Résilience")] })] },
    { label: "Miser sur la chance", detail: "Bachoter la veille au soir.", chance: 0.3, effects: [E("Coup de bol, ça passe !", { modifiers: [M("chance", 2, "Veinard"), M("intelligence", 1, "Sauvé")] })], failEffects: [E("Sans surprise, c'est l'échec.", { modifiers: [M("intelligence", -1, "Impréparé"), M("bonheur", -2, "Échec")] })] },
  ] };
}
function scAppearance(rng: Rng): Scenario {
  void rng;
  return { title: "Complexe d'ado", text: `{name} se sent mal dans sa peau face au regard des autres.`, choices: [
    { label: "S'accepter tel qu'on est", detail: "Travail sur l'estime de soi.", effects: [E("Tu apprends à t'aimer. Un cap important.", { modifiers: [M("mentalHealth", 5, "Estime de soi"), M("charisme", 2, "Assurance")] })] },
    { label: "Se comparer sans cesse", detail: "Le piège de la comparaison.", effects: [E("Tu rumines devant le miroir et les réseaux.", { modifiers: [M("mentalHealth", -4, "Comparaison"), M("bonheur", -2, "Mal-être")] })] },
  ] };
}

// ============================ ADULTE (18+) ============================
function scOpportunity(rng: Rng, char: Character): Scenario {
  const amount = roundMoney(500 + Math.abs(char.money) * 0.05 + char.age * 200 + rng.int(0, 8000));
  return { title: pick(rng, ["Une occasion se présente", "Opportunité inattendue", "Un tournant possible"]), text: `${cap(pick(rng, PLACES))}, ${pick(rng, SUBJECTS)} propose à {name} de se lancer dans ${pick(rng, PROJECTS)}.`, choices: [boldChoice(rng, char, amount), prudentChoice(rng), passiveChoice(rng)] };
}
function scMoral(rng: Rng): Scenario {
  const amount = roundMoney(200 + rng.int(0, 3000));
  const found = pick(rng, ["une liasse de billets", "un portefeuille bien garni", "un sac oublié", "une erreur de caisse en ta faveur"]);
  return { title: pick(rng, ["Dilemme moral", "Un cas de conscience", "Que faire ?"]), text: `{name} tombe sur ${found} (${amount.toLocaleString("fr-FR")} €). Personne ne regarde.`, choices: [{ label: "Le rendre / signaler", detail: "L'honnêteté récompensée par la paix intérieure.", effects: [E("Ta probité te vaut un bonheur discret.", { modifiers: [M("bonheur", 3, "Honnêteté"), M("charisme", 1, "Intégrité")] })] }, selfishChoice(rng, amount)] };
}
function scSocial(rng: Rng): Scenario {
  const who = pick(rng, SUBJECTS);
  return { title: pick(rng, ["Invitation surprise", "Un lien à tisser", "Rencontre"]), text: `${cap(who)} invite {name} à passer du temps ensemble.`, choices: [{ label: "Accepter chaleureusement", detail: "Renforce un lien social : bonheur et charisme.", effects: [E("Un bon moment partagé.", { modifiers: [M("bonheur", 3, "Lien social"), M("charisme", 2, "Sociabilité")], relationshipDelta: { kind: "ami", delta: 20 } })] }, { label: "Décliner poliment", detail: "Tu préserves ton temps, au prix d'un lien.", effects: [E("Tu restes chez toi.", { modifiers: [M("mentalHealth", 1, "Repos")] })] }] };
}
function scCause(rng: Rng): Scenario {
  return { title: pick(rng, ["Un appel à l'aide", "Une cause te touche", "Solidarité"]), text: `{name} est sollicité par ${pick(rng, CAUSES)}.`, choices: [kindChoice(rng, 200 + rng.int(0, 800)), passiveChoice(rng)] };
}
function scChallenge(rng: Rng): Scenario {
  const stat = pick(rng, ["physique", "intelligence", "creativite", "discipline"] as StatKey[]);
  const labels: Record<string, string> = { physique: "un défi sportif", intelligence: "un concours de connaissances", creativite: "un concours créatif", discipline: "un défi d'endurance mentale" };
  return { title: pick(rng, ["Un défi à relever", "Te dépasser ?", "L'occasion de briller"]), text: `On met {name} au défi : ${labels[stat]}.`, choices: [{ label: "Relever le défi", detail: `Pari sur ton ${stat} : réussite ~50 %. Succès = progression et fierté.`, chance: 0.5, effects: [E("Tu triomphes du défi !", { modifiers: [M(stat, 4, "Dépassement"), M("bonheur", 3, "Fierté")] })], failEffects: [E("Tu échoues, mais tu apprends.", { modifiers: [M("mentalHealth", -2, "Échec"), M(stat, 1, "Leçon")] })] }, passiveChoice(rng)] };
}
function scHealth(rng: Rng): Scenario {
  const habit = pick(rng, ["un mode de vie plus sain", "une routine de sommeil", "une alimentation équilibrée", "une pratique de méditation"]);
  return { title: pick(rng, ["Prendre soin de soi", "Un déclic santé", "Nouvelle résolution"]), text: `{name} envisage d'adopter ${habit}.`, choices: [{ label: "S'y tenir sérieusement", detail: "Effort de discipline récompensé par la santé.", effects: [E("Ton corps et ton esprit te remercient.", { modifiers: [M("sante", 4, "Hygiène de vie"), M("mentalHealth", 3, "Équilibre"), M("discipline", 1, "Constance")] })] }, { label: "Laisser tomber vite", detail: "Le confort immédiat l'emporte.", effects: [E("Les bonnes résolutions s'envolent.", { modifiers: [M("bonheur", 1, "Laisser-aller")] })] }] };
}
function scCareer(rng: Rng, char: Character): Scenario {
  const raise = roundMoney(2000 + char.age * 100);
  return { title: pick(rng, ["Carrefour professionnel", "Choix de carrière", "Au boulot"]), text: char.job ? `${cap(char.job.title)}, {name} peut soit se battre pour évoluer, soit lever le pied.` : `{name} hésite sur la direction à donner à sa vie professionnelle.`, choices: [{ label: "Se donner à fond", detail: `Pari professionnel : réussite ~55 %. Succès = +${raise.toLocaleString("fr-FR")} € et reconnaissance.`, chance: 0.55, effects: [E("Ton investissement paie.", { money: raise, modifiers: [M("discipline", 2, "Ambition"), M("charisme", 1, "Reconnaissance")] })], failEffects: [E("Effort non récompensé, et de la fatigue.", { modifiers: [M("mentalHealth", -3, "Surmenage")] })] }, { label: "Préserver son équilibre", detail: "Moins de stress, plus de sérénité.", effects: [E("Tu choisis ta qualité de vie.", { modifiers: [M("bonheur", 2, "Équilibre"), M("mentalHealth", 2, "Sérénité")] })] }] };
}
function scTemptation(rng: Rng): Scenario {
  const gain = roundMoney(1000 + rng.int(0, 5000));
  return { title: pick(rng, ["Une tentation", "Zone grise", "Raccourci risqué"]), text: `On propose à {name} un moyen rapide mais douteux de gagner ${gain.toLocaleString("fr-FR")} €.`, choices: [{ label: "Accepter le raccourci", detail: `Pari risqué (~45 %) : gros gain, mais risque d'ennuis.`, chance: 0.45, effects: [E("Ça passe : l'argent est là.", { money: gain, modifiers: [M("bonheur", 1, "Argent facile")], addMemory: ["opportuniste"] })], failEffects: [E("Ça casse : ennuis et réputation entachée.", { money: -roundMoney(gain * 0.4), modifiers: [M("charisme", -3, "Réputation"), M("mentalHealth", -3, "Stress")], addMemory: ["casier_leger"] })] }, { label: "Refuser par principe", detail: "Ta conscience reste nette.", effects: [E("Tu gardes les mains propres.", { modifiers: [M("mentalHealth", 2, "Conscience tranquille")] })] }] };
}
function scEra(rng: Rng, char: Character): Scenario {
  const tech = char.memory.includes("ai_era") || char.memory.includes("ai_native") ? "un nouvel outil d'IA qui fait sensation" : char.memory.includes("internet_native") || char.memory.includes("social_media") ? "une nouvelle plateforme qui cartonne" : "une innovation qui bouleverse le quotidien";
  return { title: pick(rng, ["Vent de nouveauté", "L'air du temps", "Innovation"]), text: `Tout le monde parle de ${tech}. {name} peut s'y mettre.`, choices: [{ label: "L'adopter en avance", detail: "Prendre le train en marche : intelligence et opportunités.", effects: [E("Tu prends une longueur d'avance.", { modifiers: [M("intelligence", 2, "Early adopter"), M("charisme", 1, "Dans le coup")], addMemory: ["early_adopter"] })] }, { label: "Rester à l'écart", detail: "Tu observes sans t'engager.", effects: [E("Tu regardes passer la vague.", { modifiers: [] })] }] };
}
function scFamily(rng: Rng): Scenario {
  void rng;
  return { title: pick(rng, ["Affaire de famille", "Les tiens", "Lien du sang"]), text: `Un proche de {name} traverse une période délicate et demande du soutien.`, choices: [{ label: "Être présent pour eux", detail: "Renforce les liens familiaux ; un peu d'énergie en moins.", effects: [E("Ta présence compte énormément.", { modifiers: [M("bonheur", 3, "Solidarité familiale"), M("mentalHealth", -1, "Charge émotionnelle")], relationshipDelta: { kind: "parent", delta: 15 } })] }, { label: "Garder ses distances", detail: "Tu te protèges, au risque de t'éloigner.", effects: [E("Tu choisis de te préserver.", { modifiers: [M("mentalHealth", 1, "Protection")], relationshipDelta: { kind: "parent", delta: -10 } })] }] };
}

// ============================ SENIOR (60+) ============================
function scLegacy(rng: Rng): Scenario {
  return { title: pick(rng, ["L'heure du bilan", "Transmettre"]), text: `Âgé, {name} songe à ce qu'il laissera derrière lui.`, choices: [
    { label: "Transmettre son savoir", detail: "Mentorat des plus jeunes.", effects: [E("Tu deviens une figure inspirante.", { modifiers: [M("charisme", 3, "Sagesse"), M("bonheur", 4, "Transmission")] })] },
    { label: "Écrire ses mémoires", detail: "Coucher sa vie sur le papier.", effects: [E("Ton récit touche ceux qui te lisent.", { modifiers: [M("creativite", 4, "Mémoires"), M("mentalHealth", 3, "Apaisement")] })] },
    { label: "Léguer sa fortune à une cause", detail: "Un dernier grand geste.", effects: [E("Ta générosité laisse une trace.", { money: -roundMoney(5000), modifiers: [M("bonheur", 5, "Legs")] })] },
  ] };
}
function scNostalgia(rng: Rng): Scenario {
  void rng;
  return { title: "Douceur du souvenir", text: `{name} retombe sur de vieilles photos et se remémore sa vie.`, choices: [
    { label: "Savourer ces souvenirs", detail: "Gratitude pour le chemin parcouru.", effects: [E("Une douce mélancolie, mais tant de gratitude.", { modifiers: [M("bonheur", 3, "Nostalgie"), M("mentalHealth", 2, "Paix")] })] },
    { label: "Regretter le temps perdu", detail: "Ressasser les occasions manquées.", effects: [E("Les regrets pèsent un peu.", { modifiers: [M("mentalHealth", -2, "Regrets")] })] },
  ] };
}
function scRetirement(rng: Rng): Scenario {
  void rng;
  return { title: "Nouvelle vie de retraité", text: `{name} a désormais tout son temps libre. Qu'en faire ?`, choices: [
    { label: "Voyager et s'ouvrir au monde", detail: "Profiter, coûte un peu.", effects: [E("Le monde s'offre à toi.", { money: -roundMoney(2000), modifiers: [M("bonheur", 5, "Voyages"), M("creativite", 2, "Découverte")] })] },
    { label: "Se consacrer à ses proches", detail: "Du temps pour ceux qu'on aime.", effects: [E("Des moments précieux en famille.", { modifiers: [M("bonheur", 4, "Proches")], relationshipDelta: { kind: "enfant", delta: 15 } })] },
  ] };
}

// --- Scénarios adultes additionnels (variété) ---
function scNeighbor(rng: Rng): Scenario {
  const who = pick(rng, ["ton voisin du dessus", "ta voisine de palier", "le nouveau du quartier", "un voisin bruyant"]);
  return { title: pick(rng, ["Histoire de voisinage", "Entre voisins", "Question de voisinage"]), text: `${cap(who)} te sollicite pour un service (arroser les plantes, garder un colis, un coup de main).`, choices: [
    { label: "Rendre service avec le sourire", detail: "Un lien de voisinage précieux se crée.", effects: [E(pick(rng, ["Ta gentillesse crée un allié dans l'immeuble.", "Un service en entraîne un autre : belle entente."]), { modifiers: [M("charisme", 2, "Bon voisinage"), M("bonheur", 2, "Entraide")], relationshipDelta: { kind: "ami", delta: 15 } })] },
    { label: "Refuser poliment", detail: "Tu préserves ton temps.", effects: [E("Tu déclines, un peu gêné.", { modifiers: [M("mentalHealth", 1, "Tranquillité")] })] },
  ] };
}
function scLuckyFind(rng: Rng): Scenario {
  const amt = roundMoney(100 + rng.int(0, 900));
  return { title: pick(rng, ["Petit coup de chance", "Trouvaille", "Le hasard fait bien les choses"]), text: `${cap(pick(rng, PLACES))}, {name} tombe sur une occasion inespérée d'à peu près ${amt.toLocaleString("fr-FR")} € de valeur.`, choices: [
    { label: "S'en saisir", detail: "La chance sourit aux audacieux.", effects: [E(pick(rng, ["Bien joué, c'est tout bénef.", "Une aubaine que tu ne laisses pas filer."]), { money: amt, modifiers: [M("bonheur", 3, "Aubaine"), M("chance", 1, "Veine")] })] },
    { label: "Laisser à quelqu'un d'autre", detail: "Tu offres la chance à un autre.", effects: [E("Ton fair-play te vaut une paix intérieure.", { modifiers: [M("bonheur", 2, "Générosité")] })] },
  ] };
}
function scHobbyGen(rng: Rng): Scenario {
  const h = pick(rng, ["la peinture", "la guitare", "la course à pied", "la cuisine", "la photographie", "l'escalade", "le jardinage", "l'écriture", "la poterie", "les échecs"]);
  return { title: pick(rng, ["Nouvelle passion ?", "L'appel d'un loisir", "Envie de nouveauté"]), text: `{name} est tenté de se mettre à ${h}.`, choices: [
    { label: "Se lancer à fond", detail: "Une passion qui épanouit.", effects: [E(pick(rng, [`Tu te découvres un vrai talent pour ${h}.`, `${cap(h)} devient ton bol d'air.`]), { money: -roundMoney(200), modifiers: [M("creativite", 3, "Passion"), M("bonheur", 3, "Épanouissement")] })] },
    { label: "Rester sur ses habitudes", detail: "Pas le moment.", effects: [E("Tu remets ça à plus tard.", { modifiers: [] })] },
  ] };
}
function scArgument(rng: Rng): Scenario {
  const who = pick(rng, SUBJECTS);
  return { title: pick(rng, ["Une prise de bec", "Désaccord", "Ça chauffe"]), text: `Un désaccord éclate entre {name} et ${who}.`, choices: [
    { label: "Chercher le compromis", detail: "Apaiser plutôt qu'envenimer.", effects: [E("Le calme revient, ta diplomatie fait des merveilles.", { modifiers: [M("charisme", 2, "Diplomatie"), M("mentalHealth", 1, "Apaisement")] })] },
    { label: "Ne rien lâcher", detail: "Tu tiens ta position.", effects: [E("Tu as le dernier mot, mais l'ambiance reste glaciale.", { modifiers: [M("bonheur", -2, "Tension"), M("discipline", 1, "Fermeté")] })] },
    { label: "Couper les ponts", detail: "Tu claques la porte.", effects: [E("Une relation de plus qui se brise.", { modifiers: [M("bonheur", -3, "Rupture")], addMemory: ["rancunier_epis"] })] },
  ] };
}
function scWindfall(rng: Rng): Scenario {
  return { title: pick(rng, ["Un petit extra", "Rentrée d'argent", "Bonus inattendu"]), text: `{name} reçoit une somme d'argent inattendue. Qu'en faire ?`, choices: [
    { label: "L'épargner sagement", detail: "Sécuriser l'avenir.", effects: [E("Ton bas de laine grossit.", { money: roundMoney(800), modifiers: [M("discipline", 2, "Épargne")] })] },
    { label: "Se faire plaisir", detail: "Profiter maintenant.", effects: [E("Un plaisir bien mérité.", { money: roundMoney(300), modifiers: [M("bonheur", 4, "Plaisir")] })] },
    { label: "Investir", detail: "Faire fructifier, avec un risque.", chance: 0.5, effects: [E("Ton placement rapporte gros.", { money: roundMoney(2500), modifiers: [M("intelligence", 1, "Flair")] })], failEffects: [E("Mauvais timing, tu perds une partie.", { money: -roundMoney(700) })] },
  ] };
}
function scReconnect(rng: Rng): Scenario {
  return { title: pick(rng, ["Un visage du passé", "Retrouvailles", "Souvenir vivant"]), text: `{name} recroise ${pick(rng, ["un ami d'enfance", "un ancien collègue", "un ex", "un vieux complice"])} perdu de vue.`, choices: [
    { label: "Renouer le lien", detail: "Rallumer une belle relation.", effects: [E("Vous reprenez comme si le temps n'avait pas passé.", { modifiers: [M("bonheur", 3, "Amitié")], relationshipDelta: { kind: "ami", delta: 25 } })] },
    { label: "Garder ses distances", detail: "Certaines pages restent tournées.", effects: [E("Un signe de tête, et chacun sa route.", { modifiers: [M("mentalHealth", 1, "Sérénité")] })] },
  ] };
}

// --- Registre pondéré par âge et contexte (avec id pour éviter les répétitions) ---
const DEFS: Def[] = [
  // Petite enfance
  { id: "toddler", min: 1, max: 3, w: () => 10, fn: scToddler },
  // Enfance
  { id: "toy", min: 3, max: 11, w: () => 10, fn: scToy },
  { id: "school", min: 5, max: 12, w: () => 10, fn: scSchool },
  { id: "playground", min: 5, max: 12, w: () => 9, fn: scPlayground },
  { id: "pocket", min: 6, max: 13, w: () => 7, fn: scPocket },
  { id: "pet", min: 4, max: 12, w: () => 7, fn: scPet },
  { id: "nightmare", min: 3, max: 10, w: () => 6, fn: scNightmare },
  // Ado
  { id: "crush", min: 12, max: 18, w: () => 10, fn: scCrush },
  { id: "party", min: 14, max: 19, w: () => 9, fn: scParty },
  { id: "rebellion", min: 12, max: 18, w: () => 8, fn: scRebellion },
  { id: "exam", min: 15, max: 19, w: () => 8, fn: scExam },
  { id: "appearance", min: 12, max: 18, w: () => 7, fn: scAppearance },
  // Adulte
  { id: "opportunity", min: 18, max: 90, w: () => 9, fn: scOpportunity },
  { id: "moral", min: 14, max: 90, w: () => 7, fn: scMoral },
  { id: "social", min: 14, max: 90, w: () => 8, fn: scSocial },
  { id: "cause", min: 16, max: 90, w: () => 6, fn: scCause },
  { id: "challenge", min: 12, max: 75, w: () => 6, fn: scChallenge },
  { id: "health", min: 16, max: 90, w: () => 6, fn: scHealth },
  { id: "career", min: 20, max: 68, w: (c) => (c.job ? 10 : 7), fn: scCareer },
  { id: "temptation", min: 15, max: 60, w: (c) => (c.memory.includes("crime_temptation") || c.money < 0 ? 10 : 5), fn: scTemptation },
  { id: "era", min: 16, max: 90, w: () => 5, fn: scEra },
  { id: "family", min: 14, max: 90, w: (c) => (c.creation.familyStructureId === "orphelin" ? 1 : 7), fn: scFamily },
  { id: "neighbor", min: 20, max: 90, w: () => 7, fn: scNeighbor },
  { id: "luckyfind", min: 10, max: 90, w: () => 6, fn: scLuckyFind },
  { id: "hobby", min: 14, max: 90, w: () => 7, fn: scHobbyGen },
  { id: "argument", min: 14, max: 90, w: () => 6, fn: scArgument },
  { id: "windfall", min: 16, max: 90, w: () => 6, fn: scWindfall },
  { id: "reconnect", min: 25, max: 90, w: () => 6, fn: scReconnect },
  // Senior
  { id: "legacy", min: 60, max: 130, w: () => 10, fn: scLegacy },
  { id: "nostalgia", min: 62, max: 130, w: () => 8, fn: scNostalgia },
  { id: "retirement", min: 60, max: 72, w: () => 9, fn: scRetirement },
];

/** Choisit un scénario cohérent avec l'âge, en évitant les répétitions récentes. */
function pickScenario(rng: Rng, char: Character, recent?: string[]): { sc: Scenario; id: string } | null {
  const eligible = DEFS.filter((d) => char.age >= d.min && char.age <= d.max);
  if (!eligible.length) return null; // aucun scénario crédible pour cet âge
  // Pénalise fortement les scénarios récemment utilisés pour varier.
  const chosen = rng.weighted(eligible, (d) => {
    const penalty = recent && recent.includes(d.id) ? 0.12 : 1;
    return d.w(char) * penalty;
  }) ?? eligible[0];
  return { sc: chosen.fn(rng, char), id: chosen.id };
}

/**
 * Génère un événement inédit, cohérent avec l'âge. Si `seen` est fourni, évite de
 * répéter un texte déjà affiché (l'IA "vérifie si ça a déjà été dit") en régénérant
 * jusqu'à obtenir une formulation neuve.
 */
export function generateEvent(char: Character, rng: Rng, uid: number, seen?: Set<string>, recent?: string[]): GameEvent | null {
  let r = pickScenario(rng, char, recent);
  if (!r) return null; // aucun scénario crédible pour cet âge → on n'invente rien
  if (seen) {
    for (let i = 0; i < 12 && seen.has(r.sc.text); i++) {
      const next = pickScenario(rng, char, recent);
      if (!next) break;
      r = next;
    }
    seen.add(r.sc.text);
  }
  // Mémorise le type de scénario pour ne pas le reproposer aussitôt (max 6).
  if (recent) {
    recent.push(r.id);
    while (recent.length > 6) recent.shift();
  }
  return { id: "gen_" + uid, title: r.sc.title, text: r.sc.text, category: "special", weight: 1, generated: true, choices: ensureDistinct(r.sc.choices) };
}
