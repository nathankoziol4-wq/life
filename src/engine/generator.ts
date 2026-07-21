/**
 * Moteur narratif génératif COMPOSITIONNEL — l'"IA de jeu".
 * Au lieu de scénarios figés, chaque événement est ASSEMBLÉ à la volée :
 *   texte = ouverture × sujet × situation × lieu × objet
 *   choix = 2 à 4 "réactions" tirées d'une grande bibliothèque, chacune avec
 *           plusieurs libellés possibles et des effets chiffrés.
 * Le nombre de combinaisons distinctes se compte en millions, tout en restant
 * cohérent avec l'âge (enfance / ado / adulte / senior). 100 % hors-ligne.
 */
import type { Character, GameEvent, EventChoice, EventEffect, Modifier, StatKey } from "../types";
import { Rng } from "./rng";

// ---------- Helpers ----------
const M = (t: Modifier["target"], v: number, l: string): Modifier => ({ target: t, op: "add", value: v, label: l, source: "Génératif" });
const E = (outcome: string, o: Partial<EventEffect> = {}): EventEffect => ({ outcome, ...o });
const pick = <T>(rng: Rng, a: T[]): T => a[rng.int(0, a.length - 1)];
const money = (n: number) => Math.max(50, Math.round(n / 50) * 50);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const euro = (n: number) => money(n).toLocaleString("fr-FR") + " €";

// Anti-répétition des libellés de choix (mémoire de session).
const _seenLabels = new Set<string>();
function pickL(rng: Rng, arr: string[]): string {
  const fresh = arr.filter((x) => !_seenLabels.has(x));
  const c = fresh.length ? fresh[rng.int(0, fresh.length - 1)] : arr[rng.int(0, arr.length - 1)];
  _seenLabels.add(c);
  if (_seenLabels.size > 400) _seenLabels.clear();
  return c;
}
function ensureDistinct(choices: EventChoice[]): EventChoice[] {
  const used = new Set<string>();
  return choices.map((c) => {
    if (!used.has(c.label)) { used.add(c.label); return c; }
    let alt = c.label, n = 2;
    while (used.has(alt)) alt = `${c.label} (${n++})`;
    used.add(alt);
    return { ...c, label: alt };
  });
}

// ---------- Fragments de texte (larges) ----------
const OPENERS = [
  "Un beau jour,", "Sans prévenir,", "Contre toute attente,", "Au détour d'une journée ordinaire,", "Alors que tout semblait calme,",
  "À la surprise générale,", "Un matin,", "Un soir d'hiver,", "En plein été,", "Par un pur hasard,", "Comme souvent,", "Ce jour-là,",
  "À un moment inattendu,", "Après une longue attente,", "Presque par accident,", "Coup sur coup,", "Soudain,", "Petit à petit,",
];
const SUBJECTS = [
  "un vieil ami", "un collègue ambitieux", "un inconnu au regard perçant", "ton voisin bavard", "un cousin éloigné", "un influenceur en vogue",
  "ton patron", "une figure du quartier", "un ancien camarade de classe", "un amour de jeunesse", "un commerçant du coin", "un type louche",
  "une personne âgée pleine de sagesse", "un artiste fauché", "un entrepreneur pressé", "un membre de ta famille", "une ancienne connaissance",
  "un ami d'ami", "un notable local", "un mystérieux étranger", "un rival de longue date", "un fan enthousiaste", "une célébrité de passage",
  "un mendiant au coin de la rue", "un escroc au sourire facile", "un recruteur insistant", "un gourou charismatique", "un vieux sage",
];
const PLACES = [
  "en pleine rue", "à une soirée mondaine", "au travail", "en ligne", "au café du coin", "en vacances au bord de mer", "à la salle de sport",
  "dans les transports bondés", "lors d'un mariage", "au marché du dimanche", "à la banque", "dans une file d'attente interminable",
  "à un enterrement", "en soirée entre amis", "au parc", "dans un ascenseur en panne", "à la sortie du bureau", "lors d'un dîner de famille",
  "dans un train de nuit", "à l'aéroport", "au fond d'un bar", "à un festival", "sur un parking désert",
];

function fill(tpl: string, ctx: Ctx): string {
  let s = tpl
    .replace(/\{sub\}/g, ctx.sub)
    .replace(/\{Sub\}/g, cap(ctx.sub))
    .replace(/\{place\}/g, ctx.place)
    .replace(/\{Place\}/g, cap(ctx.place))
    .replace(/\{amt\}/g, euro(ctx.amt))
    .replace(/\{obj\}/g, ctx.obj || "quelque chose");
  // Élisions françaises pour un rendu naturel ("de une" → "d'une", "de adopter" → "d'adopter").
  s = s.replace(/\bde (un\b|une\b|on\b)/g, "d'$1").replace(/\bde ([aeiouyàâäéèêëîïôûüh])/gi, "d'$1");
  return s; // {name} conservé, interpolé plus tard
}

interface Ctx { char: Character; amt: number; sub: string; place: string; obj: string; }

// ---------- Bibliothèque de RÉACTIONS ----------
interface Reaction {
  kind: string;
  labels: string[];
  make: (rng: Rng, c: Ctx) => Omit<EventChoice, "label">;
}

const R = {
  bold: {
    kind: "bold",
    labels: ["Tout tenter", "Foncer sans réfléchir", "Saisir l'occasion", "Prendre le risque", "Jouer le tout pour le tout", "Se jeter à l'eau", "Tenter le diable", "Miser gros", "Oser", "Ne rien regretter", "Y aller à fond", "Quitte ou double"],
    make: (rng, c) => {
      const base = 0.4 + (c.char.stats.charisme + c.char.stats.chance) / 500;
      return { detail: `Un pari audacieux (~${Math.round(base * 100)} % de réussite). Gros gain possible, revers cuisant sinon.`, chance: base,
        effects: [E(pick(rng, [`Ça passe ! Tu empoches ${euro(c.amt)}.`, `Jackpot : ${euro(c.amt)} pour toi.`, `Ton culot paie : +${euro(c.amt)}.`, `Coup de maître, ${euro(c.amt)} de gagnés.`]), { money: c.amt, modifiers: [M("bonheur", 4, "Réussite"), M("chance", 1, "Audace payante")] })],
        failEffects: [E(pick(rng, [`Ça casse : ${euro(c.amt * 0.6)} envolés.`, `Fiasco, tu perds ${euro(c.amt * 0.6)}.`, `Le pari échoue : −${euro(c.amt * 0.6)}.`]), { money: -money(c.amt * 0.6), modifiers: [M("mentalHealth", -3, "Revers"), M("bonheur", -2, "Déception")] })] };
    },
  },
  cautious: {
    kind: "cautious",
    labels: ["Jouer la sécurité", "Rester prudent", "Réfléchir posément", "Ne rien précipiter", "Y aller doucement", "Peser le pour et le contre", "Garder la tête froide", "Temporiser", "Faire au plus sage"],
    make: (rng) => { const s = pick(rng, ["discipline", "mentalHealth", "intelligence"] as (StatKey | "mentalHealth")[]);
      return { detail: "Sans risque, effets modestes mais garantis.", effects: [E(pick(rng, ["La raison l'emporte.", "Un choix mesuré et sûr.", "Tu avances prudemment.", "La sagesse guide ta main."]), { modifiers: [M(s, rng.int(2, 4), "Prudence")] })] };
    },
  },
  kind: {
    kind: "kind",
    labels: ["Aider sans compter", "Faire le bien", "Tendre la main", "Se montrer généreux", "Donner de son temps", "Offrir son aide", "Faire preuve de cœur", "Rendre service"],
    make: (rng, c) => ({ detail: `Tu te dévoues (parfois pour ${euro(c.amt * 0.15)}). Bonheur et réputation en profitent.`,
      effects: [E(pick(rng, ["Ton geste réchauffe deux cœurs.", "Aider te comble d'une joie sincère.", "Ta bonté ne passe pas inaperçue.", "Tu repars le cœur léger."]), { money: -money(c.amt * 0.15), modifiers: [M("bonheur", 4, "Altruisme"), M("charisme", 2, "Réputation"), M("mentalHealth", 2, "Sens")] })] }),
  },
  selfish: {
    kind: "selfish",
    labels: ["Tirer profit", "Ne penser qu'à soi", "Empocher discrètement", "En profiter", "Passer avant les autres", "Jouer perso", "Prendre sa part"],
    make: (rng, c) => ({ detail: `Ton intérêt d'abord : +${euro(c.amt * 0.5)}, mais ta conscience et ton image trinquent.`,
      effects: [E(pick(rng, ["Tu passes avant tout le monde.", "L'argent d'abord, tant pis.", "Tu empoches, un pincement au cœur.", "Ton intérêt prime."]), { money: money(c.amt * 0.5), modifiers: [M("charisme", -2, "Égoïsme"), M("mentalHealth", -1, "Remords")] })] }),
  },
  clever: {
    kind: "clever",
    labels: ["Ruser", "Jouer finement", "Manœuvrer avec ruse", "Trouver l'angle malin", "Réfléchir un coup d'avance", "Négocier habilement"],
    make: (rng, c) => { const base = 0.45 + c.char.stats.intelligence / 400;
      return { detail: `Un pari sur ton intelligence (~${Math.round(base * 100)} %).`, chance: base,
        effects: [E(pick(rng, ["Ton plan fonctionne à merveille.", "Ta finesse fait mouche.", "Tu retombes sur tes pieds, malin."]), { money: money(c.amt * 0.7), modifiers: [M("intelligence", 2, "Astuce"), M("charisme", 1, "Malin")] })],
        failEffects: [E("Trop malin pour ton propre bien : ça se retourne contre toi.", { modifiers: [M("charisme", -2, "Grillé"), M("mentalHealth", -2, "Honte")] })] };
    },
  },
  aggressive: {
    kind: "aggressive",
    labels: ["Hausser le ton", "S'imposer par la force", "Répondre du tac au tac", "Taper du poing sur la table", "Intimider", "Ne rien laisser passer"],
    make: (rng) => ({ detail: "Un rapport de force : gain de caractère, mais on t'en tiendra rigueur.", chance: 0.5,
      effects: [E(pick(rng, ["On te craint et te respecte désormais.", "Tu obtiens gain de cause de vive voix."]), { modifiers: [M("physique", 2, "Poigne"), M("charisme", 1, "Autorité")] })],
      failEffects: [E("Ça dégénère : tu te fais des ennemis.", { modifiers: [M("charisme", -3, "Réputation"), M("mentalHealth", -2, "Conflit")], relationshipDelta: { kind: "ennemi", delta: -40 } })] }),
  },
  social: {
    kind: "social",
    labels: ["Créer du lien", "Sympathiser", "Nouer le contact", "Se faire un ami", "Tisser la relation", "Aller vers l'autre"],
    make: (rng) => ({ detail: "Tu investis dans le relationnel : charisme et nouvelle amitié.",
      effects: [E(pick(rng, ["Une belle complicité se crée.", "Un bon moment partagé, et un ami de plus.", "Le courant passe immédiatement."]), { modifiers: [M("charisme", 2, "Sociabilité"), M("bonheur", 2, "Lien")], relationshipDelta: { kind: "ami", delta: 20 } })] }),
  },
  emotional: {
    kind: "emotional",
    labels: ["Écouter son cœur", "Se laisser porter par l'émotion", "Suivre son instinct", "Vivre l'instant", "Ouvrir son cœur"],
    make: (rng) => ({ detail: "Tu te fies à ton ressenti : montagnes russes émotionnelles.",
      effects: [E(pick(rng, ["Une vague d'émotion te submerge, salvatrice.", "Ton cœur avait raison."]), { modifiers: [M("bonheur", 4, "Émotion"), M("mentalHealth", 2, "Authenticité")] })] }),
  },
  indulgent: {
    kind: "indulgent",
    labels: ["Se faire plaisir", "Craquer sans culpabiliser", "Profiter de la vie", "S'offrir ça", "Lâcher prise"],
    make: (rng, c) => ({ detail: `Un plaisir immédiat (${euro(c.amt * 0.3)}). Bonheur en hausse, santé un peu en berne.`,
      effects: [E(pick(rng, ["Un pur moment de plaisir.", "Tu savoures sans arrière-pensée.", "La vie est faite pour ça."]), { money: -money(c.amt * 0.3), modifiers: [M("bonheur", 5, "Plaisir"), M("sante", -1, "Excès")] })] }),
  },
  passive: {
    kind: "passive",
    labels: ["Ne rien faire", "Laisser passer", "Ignorer", "Passer son chemin", "S'abstenir", "Rester en retrait", "Faire l'autruche"],
    make: (rng) => ({ detail: "Tu n'interviens pas. Peu d'effet, occasion peut-être manquée.",
      effects: [E(pick(rng, ["Tu laisses filer.", "Tu détournes le regard.", "Pas ton problème, tranches-tu.", "Tu passes, indifférent."]), { modifiers: [M("bonheur", -1, "Occasion manquée")] })] }),
  },
  risky_illegal: {
    kind: "risky_illegal",
    labels: ["Franchir la ligne", "Accepter le raccourci", "Tremper là-dedans", "Prendre le risque interdit", "Céder à la tentation"],
    make: (_rng, c) => ({ detail: `Voie douteuse (~45 %) : gros gain, mais gros ennuis en cas d'échec.`, chance: 0.45,
      effects: [E(`Ça passe : ${euro(c.amt * 1.5)} d'argent sale.`, { money: money(c.amt * 1.5), modifiers: [M("bonheur", 1, "Argent facile")], addMemory: ["opportuniste", "crime_temptation"] })],
      failEffects: [E("Ça tourne mal : réputation ruinée et ennuis judiciaires.", { money: -money(c.amt * 0.5), modifiers: [M("charisme", -3, "Réputation"), M("mentalHealth", -3, "Stress")], addMemory: ["casier_leger"] })] }),
  },
  honest: {
    kind: "honest",
    labels: ["Rester intègre", "Jouer franc jeu", "Dire la vérité", "Faire ce qui est juste", "Garder les mains propres"],
    make: (rng) => ({ detail: "L'honnêteté, récompensée par la paix intérieure.",
      effects: [E(pick(rng, ["Ta droiture te vaut un respect discret.", "Tu dors sur tes deux oreilles.", "L'intégrité a un prix, tu l'assumes."]), { modifiers: [M("mentalHealth", 3, "Conscience nette"), M("charisme", 1, "Intégrité")] })] }),
  },
} satisfies Record<string, Reaction>;

type RKey = keyof typeof R;

// ---------- KID & TEEN réactions ----------
const RK = {
  share: { kind: "share", labels: ["Partager", "Jouer ensemble", "Prêter gentiment"], make: (rng: Rng) => ({ detail: "Tu apprends à partager.", effects: [E(pick(rng, ["Vous devenez inséparables.", "Un nouveau copain !"]), { modifiers: [M("charisme", 2, "Partage"), M("bonheur", 2, "Amitié")] })] }) },
  sulk: { kind: "sulk", labels: ["Bouder dans son coin", "Faire la tête", "Garder pour soi"], make: () => ({ detail: "Tu gardes tout pour toi.", effects: [E("Tu joues seul, un peu grognon.", { modifiers: [M("bonheur", -1, "Solitude")] })] }) },
  parents: { kind: "parents", labels: ["Le dire à ses parents", "Demander de l'aide", "Aller voir un adulte"], make: () => ({ detail: "Tu cherches le réconfort d'un adulte.", effects: [E("Un adulte t'aide, tu te sens mieux.", { modifiers: [M("mentalHealth", 3, "Réconfort")] })] }) },
  brave: { kind: "brave", labels: ["Être courageux", "Affronter la situation", "Ne pas se laisser faire"], make: () => ({ detail: "Tu prends ton courage à deux mains.", effects: [E("Tu grandis un peu ce jour-là.", { modifiers: [M("physique", 1, "Courage"), M("charisme", 1, "Assurance")] })] }) },
  explore: { kind: "explore", labels: ["Explorer curieusement", "Découvrir", "Toucher à tout"], make: () => ({ detail: "Ta curiosité te pousse.", effects: [E("Chaque découverte nourrit ton éveil.", { modifiers: [M("intelligence", 2, "Éveil"), M("creativite", 1, "Curiosité")] })] }) },
  study_kid: { kind: "study_kid", labels: ["Bien travailler", "Réviser sérieusement", "Écouter en classe"], make: () => ({ detail: "L'effort scolaire paie.", effects: [E("Bonne note, tes parents sont fiers.", { modifiers: [M("intelligence", 3, "Application")] })] }) },
} satisfies Record<string, Reaction>;

const RT = {
  rebel: { kind: "rebel", labels: ["Se rebeller", "Braver l'interdit", "Envoyer tout balader"], make: () => ({ detail: "Tu affirmes ton indépendance, quitte à froisser.", effects: [E("Tension à la maison, mais tu t'affirmes.", { modifiers: [M("creativite", 2, "Affirmation"), M("bonheur", -1, "Conflit")], relationshipDelta: { kind: "parent", delta: -10 } })] }) },
  conform: { kind: "conform", labels: ["Rentrer dans le rang", "Suivre les règles", "Faire profil bas"], make: () => ({ detail: "Tu choisis la voie sage.", effects: [E("Rien de spectaculaire, mais la paix.", { modifiers: [M("discipline", 2, "Sagesse")] })] }) },
  crush: { kind: "crush", labels: ["Oser se déclarer", "Avouer ses sentiments", "Tenter sa chance"], make: () => ({ detail: "Un pari sur ton charme.", chance: 0.45, effects: [E("C'est réciproque, ton cœur explose !", { modifiers: [M("charisme", 2, "Audace"), M("bonheur", 5, "Amourette")], addMemory: ["premier_amour"] })], failEffects: [E("Râteau. Rouge de honte, tu fuis.", { modifiers: [M("bonheur", -2, "Timidité"), M("charisme", 1, "Leçon")] })] }) },
  study_teen: { kind: "study_teen", labels: ["Bosser dur", "Se donner à fond", "Réviser à fond"], make: () => ({ detail: "Un pari sur ton avenir.", chance: 0.5, effects: [E("Mention ! Les portes s'ouvrent.", { modifiers: [M("intelligence", 4, "Réussite"), M("bonheur", 3, "Fierté")] })], failEffects: [E("Résultat décevant malgré tes efforts.", { modifiers: [M("mentalHealth", -2, "Déception"), M("discipline", 1, "Résilience")] })] }) },
  party: { kind: "party", labels: ["Faire la fête", "Sortir sans limite", "Profiter à fond"], make: () => ({ detail: "Amusement… et petits excès.", effects: [E("Nuit mémorable, réveil difficile.", { modifiers: [M("bonheur", 4, "Fête"), M("charisme", 2, "Popularité"), M("addictionRisk", 4, "Premiers excès")], addMemory: ["fetard"] })] }) },
  withdraw: { kind: "withdraw", labels: ["Se replier", "Rester seul", "Fuir le regard des autres"], make: () => ({ detail: "Tu te protèges dans ta bulle.", effects: [E("Tu rumines un peu, mais tu réfléchis.", { modifiers: [M("creativite", 2, "Introspection"), M("mentalHealth", -1, "Isolement")] })] }) },
} satisfies Record<string, Reaction>;

// ---------- Thèmes (situations) par tranche d'âge ----------
interface Theme {
  id: string; min: number; max: number; w: (c: Character) => number;
  texts: string[]; obj?: string[]; kinds: RKey[]; pool?: "adult" | "kid" | "teen";
  amt?: (c: Character, rng: Rng) => number;
}

const THEMES: Theme[] = [
  // ---- Enfance ----
  { id: "k_toy", min: 3, max: 11, w: () => 10, pool: "kid", kinds: [], texts: ["{Sub} a le même {obj} que {name} convoite tant.", "{name} rêve d'{obj}, mais un autre enfant l'a déjà."], obj: ["un jouet", "une console", "un vélo tout neuf", "une peluche rare", "des cartes à collectionner", "une trottinette"] },
  { id: "k_school", min: 5, max: 12, w: () => 10, pool: "kid", kinds: [], texts: ["Un contrôle important attend {name} demain.", "{Sub} propose à {name} de sécher les devoirs pour jouer."] },
  { id: "k_yard", min: 5, max: 12, w: () => 9, pool: "kid", kinds: [], texts: ["Dans la cour, {sub} bouscule {name} et se moque.", "À la récré, une dispute éclate autour de {obj}."], obj: ["un ballon", "une place dans le jeu", "un goûter", "une bille"] },
  { id: "k_pet", min: 4, max: 12, w: () => 7, pool: "kid", kinds: [], texts: ["{name} découvre {obj} abandonné dans la rue.", "{Sub} propose à {name} d'adopter {obj}."], obj: ["un chaton", "un chiot perdu", "un oisillon", "un hamster"] },
  // ---- Ado ----
  { id: "t_crush", min: 12, max: 18, w: () => 10, pool: "teen", kinds: [], texts: ["{name} craque pour quelqu'un {place}.", "Un frisson : {name} tombe amoureux {place}."] },
  { id: "t_exam", min: 15, max: 19, w: () => 8, pool: "teen", kinds: [], texts: ["Un examen décisif attend {name}.", "L'avenir de {name} se joue sur un concours."] },
  { id: "t_party", min: 13, max: 19, w: () => 9, pool: "teen", kinds: [], texts: ["{Sub} invite {name} à une fête arrosée {place}.", "La soirée dont tout le monde parle a lieu {place}."] },
  { id: "t_rebel", min: 12, max: 18, w: () => 8, pool: "teen", kinds: [], texts: ["{name} bout et rêve de braver l'autorité.", "Une crise couve entre {name} et ses parents."] },
  // ---- Adulte (compositionnel, gros volume) ----
  { id: "a_money", min: 16, max: 95, w: () => 9, kinds: ["bold", "cautious", "clever", "selfish", "passive"], texts: ["{Opener} {sub} propose à {name} de se lancer dans {obj} {place}.", "{Opener} une occasion de {obj} se présente à {name} {place}.", "{Sub} tente {name} avec {obj} qui pourrait rapporter {amt}."], obj: ["un projet un peu fou", "un investissement prometteur", "un coup financier", "une reconversion", "une aventure entrepreneuriale", "un pari audacieux", "une combine juteuse", "un placement risqué"] },
  { id: "a_work", min: 18, max: 68, w: (c) => (c.job ? 9 : 6), kinds: ["bold", "cautious", "aggressive", "clever", "honest"], texts: ["{Opener} une tension éclate {place} au sujet de {obj}.", "{Sub} met {name} au défi de prouver sa valeur {place}.", "Au boulot, {name} doit trancher à propos de {obj}."], obj: ["une promotion convoitée", "un projet stratégique", "une erreur de la hiérarchie", "un collègue déloyal", "un client difficile", "une charge de travail écrasante"] },
  { id: "a_love", min: 16, max: 80, w: () => 8, kinds: ["emotional", "bold", "social", "cautious", "passive"], texts: ["{Opener} {name} ressent une étincelle avec {sub} rencontré {place}.", "{Sub} fait battre le cœur de {name} {place}.", "Une tension romantique naît entre {name} et {sub}."] },
  { id: "a_social", min: 12, max: 95, w: () => 7, kinds: ["social", "kind", "selfish", "emotional", "passive"], texts: ["{Opener} {sub} invite {name} à {obj} {place}.", "{Sub} recontacte {name} après des années.", "{name} croise {sub} {place} : renouer ou passer ?"], obj: ["une soirée", "un week-end", "un projet commun", "un dîner", "une virée"] },
  { id: "a_moral", min: 12, max: 95, w: () => 7, kinds: ["honest", "selfish", "clever", "passive"], texts: ["{Opener} {name} trouve {obj} ({amt}) que personne ne réclame.", "{Sub} met {name} face à un dilemme moral autour de {obj}.", "Une occasion malhonnête se présente : {obj}."], obj: ["un portefeuille bien garni", "une liasse de billets", "une erreur de caisse en ta faveur", "un secret compromettant", "un objet de valeur oublié"] },
  { id: "a_risk", min: 15, max: 60, w: (c) => (c.memory.includes("crime_temptation") || c.money < 0 ? 10 : 5), kinds: ["risky_illegal", "honest", "cautious"], texts: ["{Opener} {sub} propose à {name} un moyen rapide mais illégal de gagner {amt}.", "Une combine douteuse peut rapporter {amt} à {name}, {place}."], obj: ["un trafic", "une arnaque", "un coup monté", "un pot-de-vin"] },
  { id: "a_health", min: 14, max: 95, w: () => 6, kinds: ["cautious", "indulgent", "emotional", "passive"], texts: ["{Opener} {name} songe à changer de mode de vie : {obj}.", "Un signal du corps pousse {name} à réagir : {obj}.", "{Sub} entraîne {name} vers {obj}."], obj: ["se remettre au sport", "manger plus sainement", "méditer", "arrêter les excès", "consulter un spécialiste", "mieux dormir"] },
  { id: "a_family", min: 14, max: 95, w: (c) => (c.creation.familyStructureId === "orphelin" ? 1 : 7), kinds: ["kind", "emotional", "passive", "honest"], texts: ["{Opener} un proche de {name} traverse une épreuve et demande du soutien.", "{Sub} de la famille sollicite {name} pour {obj}."], obj: ["un coup de main", "de l'argent", "une réconciliation", "une décision importante", "un secret de famille"] },
  { id: "a_chance", min: 8, max: 95, w: () => 6, kinds: ["bold", "cautious", "indulgent", "passive"], texts: ["{Opener} un coup de chance sourit à {name} {place} : {obj}.", "Le hasard place {obj} sur le chemin de {name}."], obj: ["une somme inespérée", "une rencontre providentielle", "une aubaine", "un ticket gagnant", "une opportunité rare"] },
  { id: "a_city", min: 16, max: 95, w: () => 6, kinds: ["kind", "aggressive", "clever", "passive", "social"], texts: ["{Opener} {name} assiste à une scène tendue {place}.", "Un imprévu du quotidien surprend {name} {place} : {obj}.", "{Sub} cause des ennuis à {name} {place}."], obj: ["une altercation", "un vol à l'arraché", "un accident", "une injustice flagrante", "une panne", "une dispute de voisinage"] },
  { id: "a_create", min: 12, max: 95, w: () => 6, kinds: ["bold", "cautious", "emotional", "indulgent"], texts: ["{Opener} une idée créative germe dans l'esprit de {name} : {obj}.", "{name} rêve de se lancer dans {obj}."], obj: ["un roman", "un projet artistique", "une chaîne en ligne", "une invention", "un groupe de musique", "une œuvre ambitieuse"] },
  { id: "a_travel", min: 16, max: 95, w: () => 5, kinds: ["bold", "indulgent", "cautious", "social"], texts: ["{Opener} une occasion de partir {obj} s'offre à {name}.", "{Sub} propose à {name} un voyage vers {obj}."], obj: ["à l'autre bout du monde", "sur une île lointaine", "dans un pays inconnu", "en road-trip", "pour tout recommencer ailleurs"] },
  // ---- Senior ----
  { id: "s_legacy", min: 60, max: 130, w: () => 9, kinds: ["kind", "emotional", "honest", "cautious"], texts: ["{Opener} {name}, désormais âgé, songe à ce qu'il laissera.", "L'heure du bilan sonne pour {name} : que transmettre ?"], obj: ["sa sagesse", "son patrimoine", "ses mémoires"] },
  { id: "s_nostalgia", min: 62, max: 130, w: () => 7, kinds: ["emotional", "indulgent", "passive"], texts: ["{Opener} {name} retombe sur de vieux souvenirs {place}.", "Un parfum du passé submerge {name}."] },
];

// ---------- Génération ----------
function reactionFor(kind: string, pool: "adult" | "kid" | "teen"): Reaction {
  const lib = pool === "kid" ? RK : pool === "teen" ? RT : R;
  return (lib as Record<string, Reaction>)[kind];
}

/** Réactions par défaut d'un thème selon sa tranche (enfance/ado). */
function defaultKinds(theme: Theme, rng: Rng): string[] {
  if (theme.pool === "kid") return shuffle(rng, Object.keys(RK)).slice(0, 3);
  if (theme.pool === "teen") return shuffle(rng, Object.keys(RT)).slice(0, 3);
  return [];
}
function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = rng.int(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function buildScenario(rng: Rng, char: Character, theme: Theme): { title: string; text: string; choices: EventChoice[] } {
  const pool = theme.pool ?? "adult";
  const amt = theme.amt ? theme.amt(char, rng) : money(400 + Math.abs(char.money) * 0.04 + char.age * 180 + rng.int(0, 7000));
  const ctx: Ctx = { char, amt, sub: pick(rng, SUBJECTS), place: pick(rng, PLACES), obj: theme.obj ? pick(rng, theme.obj) : "" };
  let text = fill(pick(rng, theme.texts), ctx).replace(/\{Opener\}/g, pick(rng, OPENERS));

  // Réactions : nombre 2–4 selon disponibilité.
  const kinds = theme.kinds.length ? shuffle(rng, theme.kinds).slice(0, 2 + rng.int(0, 2)) : defaultKinds(theme, rng);
  const choices: EventChoice[] = kinds.map((k) => {
    const r = reactionFor(k, pool);
    const built = r.make(rng, ctx);
    return { label: pickL(rng, r.labels), ...built };
  });
  return { title: titleFor(theme, rng), text, choices: ensureDistinct(choices) };
}

const TITLES: Record<string, string[]> = {
  default: ["Un tournant", "Une décision", "Que faire ?", "Un choix se présente", "Carrefour", "L'heure du choix"],
  a_money: ["Opportunité", "Une affaire en vue", "Question d'argent", "Le tuyau"],
  a_work: ["Au travail", "Tension pro", "Carrefour de carrière"],
  a_love: ["Étincelle", "Affaire de cœur", "Rencontre", "Coup de foudre ?"],
  a_moral: ["Dilemme moral", "Cas de conscience", "Zone grise"],
  a_risk: ["Tentation", "Raccourci risqué", "La ligne rouge"],
  a_health: ["Prendre soin de soi", "Déclic santé", "Nouvelle résolution"],
  a_family: ["Affaire de famille", "Les tiens", "Lien du sang"],
  a_chance: ["Coup de chance", "Le hasard frappe", "Aubaine"],
  a_city: ["Scène de rue", "Imprévu", "Dans la ville"],
  a_create: ["Élan créatif", "Une idée", "Inspiration"],
  a_travel: ["Envie d'ailleurs", "Le grand départ ?", "Horizon"],
  a_social: ["Invitation", "Un lien à tisser", "Retrouvailles"],
  s_legacy: ["L'heure du bilan", "Transmettre", "Héritage"],
  s_nostalgia: ["Douceur du souvenir", "Nostalgie"],
  k_toy: ["Objet de convoitise", "Le jouet convoité"],
  k_school: ["Jour d'école", "Contrôle"],
  k_yard: ["Dans la cour", "Récréation"],
  k_pet: ["Une petite bête", "Compagnon"],
  t_crush: ["Premier béguin", "Papillons"],
  t_exam: ["Examen décisif", "Grand oral"],
  t_party: ["Invitation à une fête", "La grande soirée"],
  t_rebel: ["Crise d'ado", "Envie de transgresser"],
};
function titleFor(theme: Theme, rng: Rng): string {
  return pick(rng, TITLES[theme.id] ?? TITLES.default);
}

function pickTheme(rng: Rng, char: Character, recent?: string[]): Theme | null {
  const eligible = THEMES.filter((t) => char.age >= t.min && char.age <= t.max);
  if (!eligible.length) return null;
  return rng.weighted(eligible, (t) => t.w(char) * (recent && recent.includes(t.id) ? 0.15 : 1)) ?? eligible[0];
}

/**
 * Génère un événement inédit, cohérent avec l'âge. `seen` évite les textes déjà
 * affichés ; `recent` évite de rejouer le même thème coup sur coup.
 */
export function generateEvent(char: Character, rng: Rng, uid: number, seen?: Set<string>, recent?: string[]): GameEvent | null {
  const theme = pickTheme(rng, char, recent);
  if (!theme) return null;
  let sc = buildScenario(rng, char, theme);
  if (seen) {
    for (let i = 0; i < 8 && seen.has(sc.text); i++) sc = buildScenario(rng, char, theme);
    seen.add(sc.text);
  }
  if (recent) { recent.push(theme.id); while (recent.length > 6) recent.shift(); }
  return { id: "gen_" + uid, title: sc.title, text: sc.text, category: "special", weight: 1, generated: true, choices: sc.choices };
}
