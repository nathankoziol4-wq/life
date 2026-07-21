/**
 * Narrateur — l'"IA" qui explique COMMENT une conséquence se produit.
 * Compose des phrases descriptives (méthode d'un meurtre, déroulé d'un braquage,
 * d'une arnaque…) à partir de blocs combinés aléatoirement : chaque partie est
 * unique et immersive. 100 % hors-ligne.
 */
import { Rng } from "./rng";

const pick = <T>(rng: Rng, a: T[]): T => a[rng.int(0, a.length - 1)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// --- Meurtre ---
const MURDER_SETUP = [
  "Après des mois de rancune accumulée,",
  "Sur un coup de sang,",
  "Froidement, après avoir tout planifié,",
  "Profitant d'un moment où {v} était seul,",
  "Un soir, sans que personne ne s'y attende,",
  "Poussé à bout,",
];
const MURDER_METHOD = [
  "tu l'as étranglé de tes propres mains",
  "tu l'as empoisonné discrètement",
  "tu l'as poussé dans le vide",
  "tu l'as poignardé",
  "tu as maquillé sa mort en accident",
  "tu l'as noyé",
  "tu as engagé quelqu'un pour faire le sale boulot",
  "tu l'as abattu d'une balle",
];
const MURDER_PLACE = [
  "dans une ruelle sombre",
  "chez lui, à l'abri des regards",
  "lors d'une randonnée isolée",
  "sur un parking désert",
  "au bord d'une falaise",
  "dans un entrepôt abandonné",
];
const MURDER_CLEAN = [
  "Personne ne soupçonne rien : le crime reste parfait.",
  "Tu effaces méticuleusement toute trace. Aucun témoin.",
  "L'affaire est classée en accident. Tu t'en tires.",
];
const MURDER_CAUGHT = [
  "Mais une caméra t'a filmé, et la police remonte vite jusqu'à toi.",
  "Un témoin a tout vu : les enquêteurs frappent à ta porte.",
  "Tu laisses un indice de trop ; l'étau se resserre.",
];

/** Décrit un meurtre : mise en scène + méthode + lieu + issue (pris ou non). */
export function narrateMurder(rng: Rng, victim: string, caught: boolean): string {
  const setup = pick(rng, MURDER_SETUP).replace("{v}", victim);
  const method = pick(rng, MURDER_METHOD);
  const place = pick(rng, MURDER_PLACE);
  const end = caught ? pick(rng, MURDER_CAUGHT) : pick(rng, MURDER_CLEAN);
  return `${cap(setup)} ${method} ${place}. ${end}`;
}

// --- Agression ---
const ASSAULT = [
  "Tu l'as roué de coups avant qu'il ait pu réagir",
  "Une bagarre éclate ; tu prends le dessus violemment",
  "Tu l'as menacé, puis frappé sans retenue",
  "Tu l'as pris en embuscade à la sortie",
];

export function narrateAssault(rng: Rng, victim: string, caught: boolean): string {
  return `${pick(rng, ASSAULT).replace("{v}", victim)}. ${caught ? "La victime porte plainte et t'identifie." : `${victim} s'en souviendra, mais ne dira rien.`}`;
}

// --- Braquage ---
const ROB_APPROACH = ["Cagoule sur la tête,", "Arme au poing,", "En pleine journée,", "À la fermeture,", "Après avoir repéré les lieux,"];
const ROB_ACTION = ["tu fais irruption et ordonnes qu'on vide la caisse", "tu neutralises l'alarme et forces le coffre", "tu maîtrises le vigile et rafles le butin", "tu menaces les employés et t'empares du magot"];
const ROB_CLEAN = ["Tu disparais avant l'arrivée de la police.", "La fuite est nette, sans accroc.", "Tu t'évanouis dans la nature avec le butin."];
const ROB_CAUGHT = ["Mais la sirène retentit trop tôt : tu es cerné.", "Un employé déclenche l'alarme silencieuse et la BAC t'attend dehors.", "La fuite tourne court, menottes aux poignets."];

export function narrateRobbery(rng: Rng, target: string, caught: boolean): string {
  return `${pick(rng, ROB_APPROACH)} tu t'en prends à ${target} : ${pick(rng, ROB_ACTION)}. ${caught ? pick(rng, ROB_CAUGHT) : pick(rng, ROB_CLEAN)}`;
}

// --- Arnaque ---
const SCAM_HOW = ["Tu montes un scénario crédible", "Tu usurpes une identité de confiance", "Tu tisses ta toile patiemment", "Tu exploites la crédulité de ta cible"];
const SCAM_CLEAN = ["L'argent tombe sur un compte intraçable.", "La victime ne réalise rien avant longtemps.", "Le transfert est validé : le tour est joué."];
const SCAM_CAUGHT = ["Mais la victime alerte sa banque à temps : plainte déposée.", "Un signalement fait tout capoter ; la cybercriminalité enquête.", "Tu laisses une trace numérique de trop."];

export function narrateScam(rng: Rng, caught: boolean): string {
  return `${pick(rng, SCAM_HOW)}. ${caught ? pick(rng, SCAM_CAUGHT) : pick(rng, SCAM_CLEAN)}`;
}
