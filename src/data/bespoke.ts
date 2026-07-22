/**
 * Scénarios écrits à la main — chaque situation a des choix CONCRETS et uniques
 * (pas des archétypes génériques). Mélangés fréquemment aux événements générés,
 * ils cassent la sensation de « toujours la même forme ». Extensible : ajouter un
 * objet suffit.
 */
import type { Character, EventChoice, EventEffect, Modifier } from "../types";
import { Rng } from "../engine/rng";

const M = (t: Modifier["target"], v: number, l: string): Modifier => ({ target: t, op: "add", value: v, label: l, source: "Scénario" });
const E = (outcome: string, o: Partial<EventEffect> = {}): EventEffect => ({ outcome, ...o });

export interface Bespoke {
  id: string;
  min: number;
  max: number;
  w?: number;
  requires?: (c: Character) => boolean;
  build: (rng: Rng, c: Character) => { title: string; text: string; choices: EventChoice[] };
}

export const BESPOKE: Bespoke[] = [
  // ============================ ENFANCE ============================
  {
    id: "bp_mensonge_vitre", min: 6, max: 12, build: () => ({
      title: "La vitre cassée", text: "En jouant au ballon, {name} brise la vitre du voisin. Personne ne l'a vu.",
      choices: [
        { label: "Avouer et présenter ses excuses", detail: "L'honnêteté, même quand ça coûte.", effects: [E("Le voisin, touché par ta franchise, ne t'en veut pas.", { modifiers: [M("charisme", 2, "Franchise"), M("mentalHealth", 2, "Conscience nette")] })] },
        { label: "Se sauver en courant", detail: "Filer avant d'être vu.", effects: [E("Tu t'enfuis, le cœur battant. La culpabilité te suit un moment.", { modifiers: [M("mentalHealth", -2, "Culpabilité"), M("physique", 1, "Sprint")] })] },
        { label: "Accuser un autre enfant", detail: "Faire porter le chapeau.", effects: [E("Ton mensonge passe... mais tu perds un ami.", { modifiers: [M("charisme", -2, "Trahison")], addMemory: ["menteur"], relationshipDelta: { kind: "ami", delta: -30 } })] },
      ],
    }),
  },
  {
    id: "bp_bonbon_vole", min: 5, max: 10, build: () => ({
      title: "La tentation sucrée", text: "À l'épicerie, {name} pourrait glisser un paquet de bonbons dans sa poche sans que personne ne voie.",
      choices: [
        { label: "Résister à la tentation", detail: "Ne pas voler.", effects: [E("Tu ressors les mains vides, mais fier de toi.", { modifiers: [M("discipline", 3, "Maîtrise de soi")] })] },
        { label: "Voler les bonbons", detail: "Céder à l'envie.", effects: [E("Délicieux... mais un goût de mauvaise action.", { modifiers: [M("bonheur", 1, "Sucre"), M("mentalHealth", -1, "Petit vol")], addMemory: ["petit_delit"] })] },
      ],
    }),
  },
  {
    id: "bp_talent_scene", min: 6, max: 12, build: () => ({
      title: "Le spectacle de l'école", text: "L'école organise un spectacle. {name} peut monter sur scène devant tout le monde.",
      choices: [
        { label: "Se lancer sur scène", detail: "Vaincre sa timidité.", effects: [E("Sous les applaudissements, tu prends goût aux projecteurs !", { modifiers: [M("charisme", 3, "Aisance"), M("bonheur", 3, "Fierté")], addMemory: ["a_scene"] })] },
        { label: "Rester en coulisses", detail: "Trop intimidant.", effects: [E("Tu regardes les autres, un peu jaloux.", { modifiers: [M("bonheur", -1, "Regret")] })] },
      ],
    }),
  },

  // ============================ ADO ============================
  {
    id: "bp_triche_exam", min: 13, max: 19, build: () => ({
      title: "L'antisèche", text: "La veille d'un contrôle capital, un ami propose à {name} les réponses volées.",
      choices: [
        { label: "Refuser et réviser toute la nuit", detail: "Le mérite avant tout.", effects: [E("Épuisé mais honnête, tu décroches une note méritée.", { modifiers: [M("intelligence", 3, "Travail"), M("discipline", 2, "Intégrité"), M("sante", -1, "Nuit blanche")] })] },
        { label: "Accepter l'antisèche", detail: "La facilité.", effects: [E("Bonne note volée. Mais si on l'apprenait...", { modifiers: [M("bonheur", 1, "Soulagement")], addMemory: ["tricheur"] })] },
      ],
    }),
  },
  {
    id: "bp_scooter", min: 14, max: 18, build: () => ({
      title: "Le scooter des grands", text: "Un ado plus âgé propose à {name} un tour de scooter à toute vitesse, sans casque.",
      choices: [
        { label: "Monter et foncer", detail: "Le frisson interdit.", chance: 0.6, effects: [E("Sensations grisantes, une virée inoubliable !", { modifiers: [M("bonheur", 4, "Adrénaline"), M("charisme", 2, "Crâneur")] })], failEffects: [E("Chute ! Tu t'en sors avec des égratignures... et une belle frayeur.", { modifiers: [M("sante", -5, "Chute"), M("bonheur", -2, "Peur")] })] },
        { label: "Refuser poliment", detail: "Trop dangereux.", effects: [E("On te charrie un peu, mais tu rentres entier.", { modifiers: [M("discipline", 2, "Prudence")] })] },
      ],
    }),
  },
  {
    id: "bp_reseaux_photo", min: 13, max: 19, requires: (c) => c.memory.includes("social_media") || c.memory.includes("smartphone_native"), build: () => ({
      title: "La photo gênante", text: "Une photo embarrassante de {name} circule dans le lycée.",
      choices: [
        { label: "En rire le premier", detail: "Désamorcer par l'humour.", effects: [E("Ton autodérision retourne la situation : tout le monde t'adore.", { modifiers: [M("charisme", 4, "Autodérision"), M("mentalHealth", 2, "Recul")] })] },
        { label: "Se venger de l'auteur", detail: "Riposter.", effects: [E("La guerre des posts s'envenime. Ambiance toxique.", { modifiers: [M("mentalHealth", -3, "Conflit"), M("bonheur", -2, "Rancune")], addMemory: ["vengeur"] })] },
        { label: "Déprimer en silence", detail: "Encaisser seul.", effects: [E("Tu ne dis rien, mais ça te ronge.", { modifiers: [M("mentalHealth", -5, "Humiliation")] })] },
      ],
    }),
  },

  // ============================ ADULTE — argent/carrière ============================
  {
    id: "bp_augmentation", min: 22, max: 62, requires: (c) => !!c.job, build: (_r, c) => ({
      title: "Le bureau du patron", text: `${c.job!.title}, {name} entre demander une augmentation. Le patron lève un sourcil.`,
      choices: [
        { label: "Argumenter chiffres à l'appui", detail: "Un dossier solide.", chance: 0.55, effects: [E("Convaincu, il t'accorde la hausse. Bien joué.", { money: 6000, modifiers: [M("charisme", 2, "Négociation"), M("bonheur", 3, "Reconnaissance")] })], failEffects: [E("Il botte en touche. Frustrant.", { modifiers: [M("mentalHealth", -2, "Vexation")] })] },
        { label: "Menacer de démissionner", detail: "Un coup de poker.", chance: 0.4, effects: [E("Il cède pour te garder ! Gros pari gagnant.", { money: 9000, modifiers: [M("charisme", 3, "Culot")] })], failEffects: [E("« Alors bon vent. » Tu te retrouves sans emploi.", { modifiers: [M("bonheur", -4, "Chômage")], addMemory: ["a_demissionne"] })] },
        { label: "Ne rien oser", detail: "Rester dans sa zone de confort.", effects: [E("Tu ressors sans avoir rien demandé, dépité.", { modifiers: [M("bonheur", -1, "Occasion manquée"), M("discipline", -1, "Manque d'audace")] })] },
      ],
    }),
  },
  {
    id: "bp_ami_emprunt", min: 20, max: 80, build: (_r, c) => ({
      title: "Un ami dans la dèche", text: `Un ami proche supplie {name} de lui prêter ${Math.max(1000, Math.round(Math.abs(c.money) * 0.05) + 2000).toLocaleString("fr-FR")} €.`,
      choices: [
        { label: "Prêter sans hésiter", detail: "L'amitié d'abord.", effects: [E("Il te remercie, ému. Reste à voir s'il remboursera...", { money: -3000, modifiers: [M("charisme", 2, "Générosité"), M("bonheur", 1, "Bon geste")], relationshipDelta: { kind: "ami", delta: 20 } })] },
        { label: "Refuser, gêné", detail: "Protéger ses finances.", effects: [E("Il part, blessé. Votre amitié se refroidit.", { modifiers: [M("mentalHealth", -1, "Culpabilité")], relationshipDelta: { kind: "ami", delta: -25 } })] },
        { label: "Proposer de l'aider autrement", detail: "Sans donner d'argent.", effects: [E("Tu lui trouves une piste d'emploi. Il apprécie le geste.", { modifiers: [M("charisme", 2, "Débrouillardise")], relationshipDelta: { kind: "ami", delta: 10 } })] },
      ],
    }),
  },
  {
    id: "bp_erreur_virement", min: 20, max: 90, build: () => ({
      title: "Le virement providentiel", text: "La banque a crédité par erreur 15 000 € sur le compte de {name}.",
      choices: [
        { label: "Signaler l'erreur", detail: "Honnête jusqu'au bout.", effects: [E("La banque te remercie. Ta conscience est nette.", { modifiers: [M("mentalHealth", 3, "Intégrité"), M("charisme", 1, "Honnêteté")] })] },
        { label: "Tout dépenser vite", detail: "Profiter avant qu'ils remarquent.", chance: 0.5, effects: [E("Tu claques tout... et personne ne réclame. Coup de chance.", { money: 15000, modifiers: [M("bonheur", 5, "Aubaine")] })], failEffects: [E("La banque exige tout, avec pénalités. Tu es dans le rouge.", { money: -5000, modifiers: [M("mentalHealth", -4, "Ennuis")] })] },
      ],
    }),
  },

  // ============================ ADULTE — moral/sombre ============================
  {
    id: "bp_accident_temoin", min: 18, max: 90, build: () => ({
      title: "Témoin d'un accident", text: "{name} voit une voiture renverser un piéton puis s'enfuir. Il a relevé la plaque.",
      choices: [
        { label: "Porter secours et témoigner", detail: "Faire ce qui est juste.", effects: [E("Grâce à toi, la victime est sauvée et le chauffard arrêté.", { modifiers: [M("charisme", 3, "Héros du quotidien"), M("bonheur", 3, "Utilité"), M("mentalHealth", 2, "Fierté")] })] },
        { label: "Passer son chemin", detail: "Ne pas s'impliquer.", effects: [E("Tu détournes le regard. L'image te hantera.", { modifiers: [M("mentalHealth", -5, "Remords"), M("bonheur", -2, "Lâcheté")] })] },
        { label: "Faire chanter le chauffard", detail: "Monnayer ton silence.", effects: [E("Tu extorques le fuyard. De l'argent sale sur la conscience.", { money: 8000, modifiers: [M("mentalHealth", -3, "Corruption")], addMemory: ["hors_la_loi", "maitre_chanteur"] })] },
      ],
    }),
  },
  {
    id: "bp_portefeuille_flic", min: 16, max: 90, build: () => ({
      title: "Le portefeuille d'un policier", text: "{name} ramasse un portefeuille tombé. À l'intérieur : une carte de police et 400 €.",
      choices: [
        { label: "Le rapporter au commissariat", detail: "Se faire bien voir.", effects: [E("Le policier reconnaissant te doit une fière chandelle.", { modifiers: [M("charisme", 2, "Bonne action")], addMemory: ["ami_police"] })] },
        { label: "Garder l'argent, jeter le reste", detail: "Risqué avec un flic.", chance: 0.5, effects: [E("Tu empoches les 400 €, ni vu ni connu.", { money: 400, modifiers: [M("mentalHealth", -1, "Petit larcin")] })], failEffects: [E("Une caméra t'a filmé. Le flic te retrouve. Ennuis.", { modifiers: [M("charisme", -3, "Grillé")], addMemory: ["casier_leger"] })] },
      ],
    }),
  },

  // ============================ ADULTE — vie perso ============================
  {
    id: "bp_demande_mariage", min: 22, max: 55, requires: (c) => c.memory.includes("en_couple") && !c.memory.includes("marie"), build: () => ({
      title: "La grande question", text: "Après des années d'amour, {name} tient une bague dans sa poche. Le moment est venu ?",
      choices: [
        { label: "Faire sa demande", detail: "Se lancer.", chance: 0.8, effects: [E("« Oui ! » Des larmes de joie. Vous vous fiancez.", { modifiers: [M("bonheur", 10, "Amour")], addMemory: ["marie"], relationshipDelta: { kind: "partenaire", delta: 30 } })], failEffects: [E("« Je... ne suis pas prêt(e). » Un froid s'installe.", { modifiers: [M("bonheur", -6, "Rejet"), M("mentalHealth", -3, "Blessure")] })] },
        { label: "Attendre encore", detail: "Ne pas précipiter.", effects: [E("Tu ranges la bague. Le doute plane.", { modifiers: [M("mentalHealth", -1, "Hésitation")] })] },
      ],
    }),
  },
  {
    id: "bp_voisin_musique", min: 18, max: 90, build: () => ({
      title: "Le voisin mélomane", text: "À 3 h du matin, la musique du voisin empêche {name} de dormir pour la énième fois.",
      choices: [
        { label: "Aller sonner calmement", detail: "Dialoguer.", effects: [E("Il s'excuse et baisse le son. Problème réglé.", { modifiers: [M("charisme", 1, "Diplomatie"), M("mentalHealth", 1, "Soulagement")] })] },
        { label: "Tambouriner en hurlant", detail: "Péter un câble.", effects: [E("La dispute réveille tout l'immeuble. Guerre déclarée.", { modifiers: [M("mentalHealth", -3, "Stress"), M("bonheur", -2, "Conflit")], relationshipDelta: { kind: "ennemi", delta: -30 } })] },
        { label: "Appeler la police", detail: "Solution officielle.", effects: [E("Les agents interviennent. Le voisin t'en veut, mais tu dors.", { modifiers: [M("sante", 2, "Sommeil retrouvé")] })] },
      ],
    }),
  },
  {
    id: "bp_enfant_bulletin", min: 28, max: 65, requires: (c) => c.memory.includes("parent"), build: () => ({
      title: "Le bulletin catastrophe", text: "L'enfant de {name} rentre avec un bulletin scolaire désastreux.",
      choices: [
        { label: "Encourager avec bienveillance", detail: "Soutenir plutôt que punir.", effects: [E("Rassuré, il reprend confiance et s'accroche.", { modifiers: [M("charisme", 2, "Parent bienveillant"), M("bonheur", 2, "Complicité")], relationshipDelta: { kind: "enfant", delta: 15 } })] },
        { label: "Sévir et priver de sorties", detail: "La manière forte.", effects: [E("Il obéit en boudant. La distance se creuse.", { modifiers: [M("discipline", 1, "Fermeté")], relationshipDelta: { kind: "enfant", delta: -12 } })] },
        { label: "Payer des cours particuliers", detail: "Investir dans son avenir.", effects: [E("Les cours portent leurs fruits. Ton portefeuille moins.", { money: -3000, modifiers: [M("bonheur", 1, "Espoir")], relationshipDelta: { kind: "enfant", delta: 8 } })] },
      ],
    }),
  },

  // ============================ ADULTE — santé / imprévu ============================
  {
    id: "bp_grosseur", min: 35, max: 90, build: () => ({
      title: "Une grosseur suspecte", text: "{name} découvre une grosseur inquiétante. Le rendez-vous médical fait peur.",
      choices: [
        { label: "Consulter immédiatement", detail: "Affronter la vérité.", chance: 0.75, effects: [E("Bénin ! Plus de peur que de mal. Tu respires.", { modifiers: [M("mentalHealth", 3, "Soulagement"), M("sante", 1, "Suivi")] })], failEffects: [E("Le diagnostic tombe : il faudra se battre. Pris à temps, au moins.", { modifiers: [M("sante", -8, "Maladie")], addCondition: ["maladie"] })] },
        { label: "Ignorer et espérer", detail: "Faire l'autruche.", effects: [E("Tu repousses l'échéance, rongé par l'angoisse.", { modifiers: [M("mentalHealth", -5, "Angoisse"), M("sante", -4, "Négligence")] })] },
      ],
    }),
  },
  {
    id: "bp_incendie", min: 16, max: 90, build: () => ({
      title: "Le feu chez les voisins", text: "De la fumée s'échappe de l'appartement voisin. {name} entend des cris à l'intérieur.",
      choices: [
        { label: "Se précipiter pour aider", detail: "Risquer sa vie.", chance: 0.7, effects: [E("Tu sors une famille des flammes. Un vrai héros.", { modifiers: [M("charisme", 5, "Héroïsme"), M("bonheur", 4, "Sauveur"), M("physique", 1, "Bravoure")], addMemory: ["heros"] })], failEffects: [E("Tu es brûlé en tentant de les sauver, mais ils survivent.", { modifiers: [M("sante", -10, "Brûlures"), M("charisme", 4, "Courage reconnu")] })] },
        { label: "Appeler les pompiers et attendre", detail: "La prudence.", effects: [E("Les secours arrivent à temps. Tu as bien réagi.", { modifiers: [M("mentalHealth", 1, "Sang-froid")] })] },
      ],
    }),
  },

  // ============================ SENIOR ============================
  {
    id: "bp_heritage_partage", min: 55, max: 95, build: () => ({
      title: "Le testament", text: "{name}, âgé, rédige son testament. Comment répartir ce qui lui reste ?",
      choices: [
        { label: "Tout léguer à ses proches", detail: "La famille avant tout.", effects: [E("Tes proches te seront éternellement reconnaissants.", { modifiers: [M("bonheur", 4, "Transmission")], relationshipDelta: { kind: "enfant", delta: 20 } })] },
        { label: "Faire un don à une bonne cause", detail: "Laisser une trace.", effects: [E("Ton geste philanthrope inspirera longtemps.", { money: -5000, modifiers: [M("bonheur", 5, "Générosité"), M("charisme", 2, "Mécène")], addMemory: ["philanthrope"] })] },
        { label: "Tout dépenser avant de mourir", detail: "Profiter jusqu'au bout.", effects: [E("Croisière, palaces, plaisirs : tu vides les comptes en souriant.", { money: -10000, modifiers: [M("bonheur", 6, "Insouciance")] })] },
      ],
    }),
  },
  {
    id: "bp_vieil_amour", min: 60, max: 95, build: () => ({
      title: "L'amour au crépuscule", text: "À la maison de retraite, {name} ressent une tendresse inattendue pour un autre résident.",
      choices: [
        { label: "Oser cet amour tardif", detail: "Le cœur n'a pas d'âge.", effects: [E("Une romance douce illumine tes vieux jours.", { modifiers: [M("bonheur", 6, "Amour tardif"), M("mentalHealth", 3, "Épanouissement")], relationshipDelta: { kind: "partenaire", delta: 40 } })] },
        { label: "Rester seul par pudeur", detail: "Trop tard, penses-tu.", effects: [E("Tu gardes tes sentiments pour toi, un brin nostalgique.", { modifiers: [M("bonheur", -1, "Solitude")] })] },
      ],
    }),
  },

  // ============================ ENFANCE (suite) ============================
  {
    id: "bp_bagarre_cour", min: 6, max: 12, build: () => ({
      title: "La bagarre de cour", text: "Un grand embête un plus petit dans la cour. {name} pourrait intervenir.",
      choices: [
        { label: "Défendre le plus faible", detail: "Prendre des risques pour les autres.", effects: [E("Tu t'interposes. Le petit te voue une admiration éternelle.", { modifiers: [M("charisme", 3, "Courage"), M("physique", 1, "Bravoure")], relationshipDelta: { kind: "ami", delta: 30 } })] },
        { label: "Regarder sans bouger", detail: "Ne pas se mêler.", effects: [E("Tu détournes les yeux, un peu honteux.", { modifiers: [M("mentalHealth", -1, "Malaise")] })] },
        { label: "Rire avec le grand", detail: "Suivre le plus fort.", effects: [E("Tu ris jaune pour être bien vu. Ça laisse un goût amer.", { modifiers: [M("charisme", -1, "Suiveur"), M("mentalHealth", -1, "Culpabilité")] })] },
      ],
    }),
  },
  {
    id: "bp_ferme_grandparent", min: 4, max: 11, build: () => ({
      title: "L'été à la ferme", text: "{name} passe l'été chez ses grands-parents à la campagne.",
      choices: [
        { label: "Aider aux travaux des champs", detail: "Se rendre utile.", effects: [E("Le grand air et l'effort te forgent le caractère.", { modifiers: [M("physique", 3, "Grand air"), M("discipline", 2, "Travail")] })] },
        { label: "Explorer les bois interdits", detail: "L'aventure appelle.", effects: [E("Cabanes, ruisseaux, trésors : un été de légende.", { modifiers: [M("creativite", 3, "Aventure"), M("bonheur", 3, "Liberté")] })] },
      ],
    }),
  },
  {
    id: "bp_argent_trouve_enfant", min: 6, max: 11, build: () => ({
      title: "Le billet par terre", text: "{name} trouve un billet de 20 € sur le trottoir. Une dame âgée fouille son sac, paniquée.",
      choices: [
        { label: "Lui rendre le billet", detail: "L'honnêteté d'un enfant.", effects: [E("La dame, émue, te bénit et te donne une pièce.", { money: 5, modifiers: [M("charisme", 2, "Bon cœur"), M("bonheur", 2, "Fierté")] })] },
        { label: "Garder le billet", detail: "Une fortune pour un enfant.", effects: [E("Tu files acheter des bonbons pour toute la classe.", { money: 20, modifiers: [M("bonheur", 2, "Trésor")] })] },
      ],
    }),
  },

  // ============================ ADO (suite) ============================
  {
    id: "bp_groupe_musique", min: 13, max: 19, build: () => ({
      title: "Le groupe du lycée", text: "Des camarades montent un groupe de musique et proposent à {name} de les rejoindre.",
      choices: [
        { label: "Rejoindre le groupe", detail: "Vivre sa passion.", effects: [E("Répétitions, premiers concerts : tu vibres sur scène.", { modifiers: [M("creativite", 4, "Musique"), M("charisme", 2, "Scène"), M("bonheur", 3, "Passion")], addMemory: ["musicien"] })] },
        { label: "Se concentrer sur les études", detail: "Priorité au sérieux.", effects: [E("Tu bosses pendant qu'ils répètent. L'avenir avant tout.", { modifiers: [M("intelligence", 2, "Sérieux"), M("discipline", 2, "Focus")] })] },
      ],
    }),
  },
  {
    id: "bp_premiere_biere", min: 14, max: 18, build: () => ({
      title: "La première cuite", text: "À une soirée, on met la pression sur {name} pour boire beaucoup, très vite.",
      choices: [
        { label: "Refuser fermement", detail: "Ne pas céder.", effects: [E("Tu tiens bon. Certains respectent, d'autres se moquent.", { modifiers: [M("discipline", 3, "Caractère")] })] },
        { label: "Boire pour s'intégrer", detail: "Faire comme les autres.", effects: [E("La soirée finit très mal. Réveil douloureux et vidéos gênantes.", { modifiers: [M("sante", -3, "Excès"), M("addictionRisk", 8, "Premiers verres"), M("bonheur", -1, "Honte")], addMemory: ["fetard"] })] },
      ],
    }),
  },
  {
    id: "bp_orientation", min: 16, max: 19, build: () => ({
      title: "Le grand choix d'orientation", text: "{name} doit choisir sa voie : la passion ou la sécurité ?",
      choices: [
        { label: "Suivre sa passion", detail: "Le cœur d'abord.", effects: [E("Tu t'engages dans une voie qui te fait vibrer, tant pis pour les revenus incertains.", { modifiers: [M("creativite", 3, "Passion"), M("bonheur", 3, "Épanouissement")], addMemory: ["voie_passion"] })] },
        { label: "Choisir une filière sûre", detail: "La raison d'abord.", effects: [E("Une voie solide et bien payée, même si elle t'ennuie un peu.", { modifiers: [M("intelligence", 2, "Pragmatisme"), M("discipline", 2, "Sécurité")], addMemory: ["voie_sure"] })] },
        { label: "Prendre une année sabbatique", detail: "Se chercher.", effects: [E("Voyages et petits boulots : tu te découvres avant de choisir.", { modifiers: [M("charisme", 2, "Ouverture"), M("bonheur", 2, "Liberté")] })] },
      ],
    }),
  },

  // ============================ ADULTE — carrière/argent (suite) ============================
  {
    id: "bp_collegue_faute", min: 22, max: 62, requires: (c) => !!c.job, build: () => ({
      title: "La faute du collègue", text: "Un collègue a commis une grosse erreur et supplie {name} de couvrir pour lui.",
      choices: [
        { label: "Le couvrir", detail: "Solidarité entre collègues.", effects: [E("Il te doit une fière chandelle. Un allié pour la vie.", { modifiers: [M("charisme", 2, "Loyauté")], relationshipDelta: { kind: "ami", delta: 25 } })] },
        { label: "Le dénoncer à la direction", detail: "Se protéger.", effects: [E("Tu es blanchi, mais l'open space te bat froid.", { modifiers: [M("charisme", -3, "Balance"), M("discipline", 1, "Prudence")], relationshipDelta: { kind: "ennemi", delta: -30 } })] },
        { label: "L'aider à réparer discrètement", detail: "Régler sans bruit.", effects: [E("À deux, vous colmatez la fuite. Personne n'y voit rien.", { modifiers: [M("intelligence", 2, "Débrouille"), M("charisme", 2, "Team")] })] },
      ],
    }),
  },
  {
    id: "bp_startup_associe", min: 24, max: 55, build: () => ({
      title: "L'offre d'associé", text: "Un ami visionnaire propose à {name} de tout quitter pour cofonder sa start-up.",
      choices: [
        { label: "Tout risquer avec lui", detail: "L'aventure entrepreneuriale.", chance: 0.4, effects: [E("La boîte décolle : vous devenez riches et fiers.", { money: 60000, modifiers: [M("discipline", 3, "Entrepreneur"), M("charisme", 3, "Leader")], addMemory: ["entrepreneur"] })], failEffects: [E("Après deux ans de galère, la start-up coule. Ruine et fatigue.", { money: -15000, modifiers: [M("mentalHealth", -5, "Faillite"), M("discipline", 2, "Leçon")], addMemory: ["echec_business"] })] },
        { label: "Rester salarié prudent", detail: "La sécurité.", effects: [E("Tu gardes ton emploi stable. Parfois, un léger regret te pince.", { modifiers: [M("bonheur", -1, "Et si ?")] })] },
      ],
    }),
  },
  {
    id: "bp_impots_controle", min: 25, max: 75, requires: (c) => c.money > 20000, build: () => ({
      title: "Le contrôle fiscal", text: "Le fisc convoque {name} pour un contrôle. Il pourrait dissimuler certains revenus.",
      choices: [
        { label: "Tout déclarer honnêtement", detail: "Jouer franc jeu.", effects: [E("Le contrôle se passe bien. Ta tranquillité n'a pas de prix.", { money: -3000, modifiers: [M("mentalHealth", 2, "Sérénité")] })] },
        { label: "Dissimuler des revenus", detail: "Frauder un peu.", chance: 0.5, effects: [E("Le fisc n'y voit que du feu. Tu gardes ton magot.", { money: 4000, modifiers: [M("bonheur", 1, "Malin")], addMemory: ["fraudeur"] })], failEffects: [E("Fraude détectée : lourd redressement et amende.", { money: -12000, modifiers: [M("mentalHealth", -4, "Ennuis")], addMemory: ["casier_leger"] })] },
      ],
    }),
  },
  {
    id: "bp_licenciement", min: 25, max: 60, requires: (c) => !!c.job, build: () => ({
      title: "Le plan social", text: "L'entreprise de {name} annonce des licenciements. Son poste est menacé.",
      choices: [
        { label: "Se battre pour rester", detail: "Prouver sa valeur.", chance: 0.5, effects: [E("Ton implication paie : tu es épargné.", { modifiers: [M("discipline", 2, "Combativité"), M("bonheur", 2, "Soulagement")] })], failEffects: [E("Malgré tes efforts, tu es remercié. Dur coup.", { modifiers: [M("bonheur", -4, "Chômage"), M("mentalHealth", -3, "Choc")], addMemory: ["licencie"] })] },
        { label: "Négocier un gros départ", detail: "Partir avec un chèque.", effects: [E("Tu pars avec une belle indemnité et l'esprit libre.", { money: 12000, modifiers: [M("bonheur", 1, "Nouveau départ")] })] },
      ],
    }),
  },

  // ============================ ADULTE — love / social (suite) ============================
  {
    id: "bp_ex_message", min: 20, max: 70, build: () => ({
      title: "Le message de l'ex", text: "Tard le soir, l'ex de {name} envoie un message nostalgique : « Tu me manques. »",
      choices: [
        { label: "Répondre et renouer", detail: "Rallumer la flamme.", chance: 0.5, effects: [E("Vous vous retrouvez, le passé refait surface, brûlant.", { modifiers: [M("bonheur", 4, "Passion retrouvée")], relationshipDelta: { kind: "partenaire", delta: 30 } })], failEffects: [E("Les vieilles blessures ressurgissent. Nouvelle rupture douloureuse.", { modifiers: [M("mentalHealth", -4, "Rechute affective"), M("bonheur", -3, "Déception")] })] },
        { label: "Ignorer le message", detail: "Tourner la page.", effects: [E("Tu résistes. Un chapitre définitivement clos.", { modifiers: [M("mentalHealth", 3, "Sagesse"), M("discipline", 1, "Recul")] })] },
      ],
    }),
  },
  {
    id: "bp_mariage_temoin", min: 22, max: 70, build: () => ({
      title: "Le mariage d'un ami", text: "Le meilleur ami de {name} se marie et le choisit comme témoin. Le discours approche.",
      choices: [
        { label: "Préparer un discours mémorable", detail: "Faire honneur à l'amitié.", effects: [E("Ton discours fait rire et pleurer toute la salle. Inoubliable.", { modifiers: [M("charisme", 4, "Éloquence"), M("bonheur", 3, "Fierté")], relationshipDelta: { kind: "ami", delta: 20 } })] },
        { label: "Improviser maladroitement", detail: "Compter sur le moment.", effects: [E("Ton discours part en vrille. Malaise gênant mais tendre.", { modifiers: [M("charisme", -1, "Bafouillage"), M("bonheur", 1, "Anecdote")] })] },
      ],
    }),
  },
  {
    id: "bp_infidele_temoin", min: 24, max: 70, build: () => ({
      title: "Le secret compromettant", text: "{name} surprend le conjoint de son meilleur ami avec quelqu'un d'autre.",
      choices: [
        { label: "Tout dire à son ami", detail: "La vérité, même douloureuse.", effects: [E("Ton ami s'effondre, mais te remercie de ta franchise.", { modifiers: [M("mentalHealth", -2, "Fardeau"), M("charisme", 1, "Loyauté")], relationshipDelta: { kind: "ami", delta: 10 } })] },
        { label: "Se taire", detail: "Ne pas se mêler.", effects: [E("Tu portes ce secret comme un poids. Chaque dîner devient pesant.", { modifiers: [M("mentalHealth", -4, "Secret pesant")] })] },
        { label: "Faire chanter l'infidèle", detail: "Profiter de l'info.", effects: [E("Tu monnayes ton silence. De l'argent, mais quelle bassesse.", { money: 5000, modifiers: [M("charisme", -3, "Ignoble"), M("mentalHealth", -2, "Bassesse")], addMemory: ["maitre_chanteur"] })] },
      ],
    }),
  },

  // ============================ ADULTE — crime / sombre (suite) ============================
  {
    id: "bp_sac_oublie", min: 16, max: 80, build: () => ({
      title: "Le sac oublié", text: "Dans le train, un homme d'affaires descend en oubliant sa mallette. {name} est seul dans le wagon.",
      choices: [
        { label: "La rapporter au contrôleur", detail: "Faire au mieux.", effects: [E("Le propriétaire, soulagé, t'offre une récompense.", { money: 300, modifiers: [M("charisme", 2, "Honnêteté")] })] },
        { label: "L'ouvrir discrètement", detail: "Voir ce qu'elle contient.", chance: 0.5, effects: [E("Des liasses de billets ! Tu files avec le magot.", { money: 9000, modifiers: [M("bonheur", 2, "Aubaine")], addMemory: ["hors_la_loi"] })], failEffects: [E("Des documents sensibles... et une caméra qui t'a filmé. Ennuis.", { modifiers: [M("mentalHealth", -3, "Stress")], addMemory: ["casier_leger"] })] },
      ],
    }),
  },
  {
    id: "bp_dealer_offre", min: 16, max: 45, build: () => ({
      title: "L'offre de la rue", text: "Un dealer propose à {name} d'écouler de la marchandise pour un gain rapide et facile.",
      choices: [
        { label: "Refuser net", detail: "Rester clean.", effects: [E("Tu déclines. Ta conscience et ton casier restent vierges.", { modifiers: [M("mentalHealth", 2, "Intégrité")] })] },
        { label: "Accepter pour l'argent", detail: "Le fric facile.", chance: 0.55, effects: [E("Premiers billets faciles... l'engrenage commence.", { money: 4000, modifiers: [M("bonheur", 1, "Argent facile")], addMemory: ["hors_la_loi", "crime_temptation", "trafiquant"] })], failEffects: [E("Descente de police dès le premier deal. Arrestation.", { modifiers: [M("mentalHealth", -4, "Arrestation")], jail: { years: 1, reason: "Trafic de stupéfiants" } })] },
      ],
    }),
  },

  // ============================ ADULTE — divers/insolite ============================
  {
    id: "bp_loto_ticket", min: 18, max: 90, build: () => ({
      title: "Le ticket oublié", text: "{name} retrouve un vieux ticket de loto dans une veste. Et si...",
      choices: [
        { label: "Vérifier les numéros", detail: "Croiser les doigts.", chance: 0.15, effects: [E("INCROYABLE ! Le ticket est gagnant : 250 000 € !", { money: 250000, modifiers: [M("bonheur", 15, "Jackpot"), M("chance", 5, "Veinard")], addMemory: ["gagnant_loto"] })], failEffects: [E("Perdu, évidemment. On rêvait un peu.", { modifiers: [M("bonheur", -1, "Déception")] })] },
        { label: "Le jeter sans vérifier", detail: "À quoi bon.", effects: [E("Tu le jettes. On ne saura jamais...", { modifiers: [] })] },
      ],
    }),
  },
  {
    id: "bp_celebrite_rencontre", min: 16, max: 90, build: () => ({
      title: "La rencontre inattendue", text: "{name} croise une immense célébrité, seule et détendue, dans un café.",
      choices: [
        { label: "Engager la conversation", detail: "Oser aborder.", chance: 0.5, effects: [E("La star est charmante et vous échangez vos contacts !", { modifiers: [M("charisme", 3, "Culot"), M("bonheur", 4, "Fierté")], addMemory: ["contact_vip"] })], failEffects: [E("La star, agacée, appelle son garde du corps. Gênant.", { modifiers: [M("bonheur", -2, "Honte")] })] },
        { label: "Respecter sa tranquillité", detail: "Ne pas déranger.", effects: [E("Tu la laisses en paix. Un sourire discret suffit.", { modifiers: [M("charisme", 1, "Classe")] })] },
      ],
    }),
  },
  {
    id: "bp_permis_points", min: 20, max: 75, build: () => ({
      title: "Le radar", text: "{name} est flashé très au-dessus de la limite. Il pourrait contester ou dénoncer un tiers.",
      choices: [
        { label: "Payer et assumer", detail: "Reconnaître sa faute.", effects: [E("Amende payée, leçon retenue. Tu lèves le pied.", { money: -400, modifiers: [M("discipline", 2, "Responsabilité")] })] },
        { label: "Prétendre que ce n'était pas soi", detail: "Frauder le PV.", chance: 0.5, effects: [E("Ton mensonge passe, tu sauves tes points.", { modifiers: [M("bonheur", 1, "Malin")] })], failEffects: [E("Fausse déclaration prouvée : amende triplée et casier.", { money: -1500, modifiers: [M("mentalHealth", -2, "Ennuis")], addMemory: ["casier_leger"] })] },
      ],
    }),
  },
  {
    id: "bp_reconversion_ferme", min: 30, max: 60, build: () => ({
      title: "L'appel de la nature", text: "Lassé de la ville, {name} rêve de tout plaquer pour élever des chèvres à la campagne.",
      choices: [
        { label: "Sauter le pas", detail: "Changer de vie radicalement.", effects: [E("Adieu le béton ! La vie rurale est rude mais tellement plus sereine.", { money: -8000, modifiers: [M("bonheur", 7, "Renouveau"), M("sante", 4, "Air pur"), M("mentalHealth", 4, "Paix")], addMemory: ["reconversion", "rural"] })] },
        { label: "Garder son confort urbain", detail: "Rester raisonnable.", effects: [E("Tu ranges ce rêve dans un tiroir. La ville te retient.", { modifiers: [M("bonheur", -1, "Rêve remisé")] })] },
      ],
    }),
  },

  // ============================ SENIOR (suite) ============================
  {
    id: "bp_petit_enfant_confidence", min: 58, max: 95, requires: (c) => c.memory.includes("parent"), build: () => ({
      title: "La confidence du petit-enfant", text: "Un petit-enfant vient se confier à {name} sur un secret qu'il cache à ses parents.",
      choices: [
        { label: "Garder le secret et le conseiller", detail: "Être son confident.", effects: [E("Tu deviens son refuge. Un lien précieux se tisse.", { modifiers: [M("bonheur", 5, "Complicité"), M("charisme", 2, "Sagesse")], relationshipDelta: { kind: "enfant", delta: 20 } })] },
        { label: "Prévenir les parents", detail: "Par précaution.", effects: [E("Tu trahis sa confiance pour son bien. Il t'en veut un peu.", { modifiers: [M("mentalHealth", 1, "Devoir")], relationshipDelta: { kind: "enfant", delta: -10 } })] },
      ],
    }),
  },
  {
    id: "bp_diagnostic_grave", min: 65, max: 100, build: () => ({
      title: "Le pronostic", text: "Le médecin annonce à {name} qu'il ne lui reste peut-être que quelques années.",
      choices: [
        { label: "Réaliser tous ses rêves", detail: "Vivre pleinement le temps qui reste.", effects: [E("Voyages, réconciliations, folies douces : tu croques la vie à pleines dents.", { money: -6000, modifiers: [M("bonheur", 8, "Carpe diem"), M("mentalHealth", 3, "Acceptation")] })] },
        { label: "Se battre contre la maladie", detail: "Ne pas abandonner.", effects: [E("Traitements et détermination : tu gagnes du temps précieux.", { modifiers: [M("sante", 3, "Combat"), M("discipline", 2, "Volonté")] })] },
        { label: "Sombrer dans le déni", detail: "Refuser la réalité.", effects: [E("Tu fais comme si de rien n'était, mais l'angoisse te ronge.", { modifiers: [M("mentalHealth", -5, "Déni")] })] },
      ],
    }),
  },
];
