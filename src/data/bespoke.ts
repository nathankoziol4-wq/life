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
];
