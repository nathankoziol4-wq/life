/**
 * Boutique du crime (marché noir). Chaque objet possédé réduit la difficulté
 * (bonus au taux de réussite) des crimes portant les tags correspondants, ou
 * débloque des crimes entiers (via `requiresItem` sur les actions).
 *
 * Tags de crime utilisés : "rue", "scam", "fraude_bancaire", "hacking",
 * "identite", "braquage", "braquage_lourd", "evasion".
 */
import type { ShopItem } from "../types";

export const CRIME_ITEMS: ShopItem[] = [
  // --- Petit matériel (réduction de difficulté) ---
  { id: "gants", label: "Gants en latex", icon: "🧤", price: 50, description: "Aucune empreinte laissée sur les lieux.", helps: { tags: ["braquage", "braquage_lourd", "rue"], bonus: 0.06 } },
  { id: "cagoule", label: "Cagoule", icon: "🎭", price: 80, description: "Dissimule ton visage des caméras.", helps: { tags: ["braquage", "braquage_lourd"], bonus: 0.08 } },
  { id: "crochetage", label: "Kit de crochetage", icon: "🗝️", price: 250, description: "Ouvre serrures et portes sans effraction visible.", helps: { tags: ["braquage", "rue"], bonus: 0.08 } },
  { id: "gilet", label: "Gilet pare-balles", icon: "🦺", price: 1200, description: "Réduit les risques lors des coups les plus violents.", helps: { tags: ["braquage_lourd"], bonus: 0.05 } },
  { id: "brouilleur", label: "Brouilleur d'alarme", icon: "📡", price: 2500, description: "Neutralise les systèmes d'alarme.", helps: { tags: ["braquage", "braquage_lourd"], bonus: 0.12 } },

  // --- Véhicules ---
  { id: "voiture_fuite", label: "Voiture de fuite", icon: "🏎️", price: 8000, description: "Un bolide banalisé pour disparaître après le coup.", helps: { tags: ["braquage", "braquage_lourd", "rue"], bonus: 0.10 } },

  // --- Armes (débloquent le braquage lourd) ---
  { id: "arme_poing", label: "Arme de poing", icon: "🔫", price: 3000, description: "Débloque les braquages à main armée. Plus efficace, mais peines alourdies.", helps: { tags: ["braquage_lourd"], bonus: 0.10 } },

  // --- Cyber / fraude ---
  { id: "vpn", label: "VPN & faux comptes", icon: "🕵️", price: 200, description: "Anonymise tes arnaques en ligne.", helps: { tags: ["scam"], bonus: 0.08 } },
  { id: "tel_crypte", label: "Téléphone crypté", icon: "📱", price: 1500, description: "Communications intraçables. Débloque la fraude bancaire.", helps: { tags: ["scam", "fraude_bancaire"], bonus: 0.10 } },
  { id: "laptop", label: "Ordinateur surpuissant", icon: "💻", price: 4000, description: "Débloque le hacking et les rançongiciels.", helps: { tags: ["hacking", "scam"], bonus: 0.10 } },
  { id: "fausse_id", label: "Faux papiers d'identité", icon: "🪪", price: 1800, description: "Débloque l'usurpation d'identité et couvre tes traces.", helps: { tags: ["scam", "identite"], bonus: 0.10 } },
  { id: "botnet", label: "Accès à un botnet", icon: "🕸️", price: 6000, description: "Une armée de machines zombies pour les gros coups cyber.", helps: { tags: ["hacking", "fraude_bancaire"], bonus: 0.14 } },
  { id: "rfid", label: "Cloneur RFID", icon: "📇", price: 900, description: "Copie badges et cartes sans contact.", helps: { tags: ["scam", "identite"], bonus: 0.08 } },
  { id: "faux_billets", label: "Presse à faux billets", icon: "🖨️", price: 5000, description: "Imprime de la fausse monnaie de qualité.", helps: { tags: ["scam"], bonus: 0.12 } },

  // --- Grand banditisme ---
  { id: "silencieux", label: "Silencieux", icon: "🔇", price: 2000, description: "Un tir discret ne laisse aucun témoin.", helps: { tags: ["meurtre", "braquage_lourd"], bonus: 0.10 } },
  { id: "faux_uniforme", label: "Faux uniforme de police", icon: "👮", price: 1600, description: "Passe les barrages sans éveiller les soupçons.", helps: { tags: ["braquage", "braquage_lourd", "violence"], bonus: 0.09 } },
  { id: "drone", label: "Drone de repérage", icon: "🛸", price: 3500, description: "Surveille la cible et anticipe les rondes.", helps: { tags: ["braquage", "braquage_lourd", "violence"], bonus: 0.10 } },
  { id: "masque", label: "Masque hyperréaliste", icon: "🎭", price: 4500, description: "Un visage d'emprunt indétectable sur les caméras.", helps: { tags: ["braquage_lourd", "meurtre", "identite"], bonus: 0.11 } },
  { id: "plaques", label: "Fausses plaques", icon: "🚙", price: 600, description: "Véhicule intraçable pour la fuite.", helps: { tags: ["braquage", "braquage_lourd"], bonus: 0.05 } },

  // --- Protection judiciaire ---
  { id: "avocat", label: "Avocat véreux", icon: "⚖️", price: 12000, description: "En cas de condamnation, il divise ta peine par deux.", jailReduction: 0.5 },
  { id: "taupe", label: "Taupe dans la police", icon: "🕵️‍♂️", price: 20000, description: "Un indic te prévient : moins de risques sur TOUS les coups.", helps: { tags: ["rue", "scam", "braquage", "braquage_lourd", "violence", "meurtre", "fraude_bancaire", "hacking", "identite"], bonus: 0.06 } },
];

export const CRIME_ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(CRIME_ITEMS.map((i) => [i.id, i]));
