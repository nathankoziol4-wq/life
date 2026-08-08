/**
 * Archétypes de biens immobiliers.
 *
 * Le marché est généré à la volée : chaque archétype × ville produit des
 * annonces avec surface, état et prix variables. Ajouter un archétype suffit
 * à enrichir le marché dans tous les pays.
 */

export interface PropertyArchetype {
  id: string;
  name: string;
  emoji: string;
  /** Prix de référence dans un pays d'indice 1.0, ville d'indice 1.0. */
  basePrice: number;
  minArea: number;
  maxArea: number;
  /** Charges annuelles en % de la valeur. */
  upkeepRate: number;
  /** Rendement locatif brut annuel en % de la valeur. */
  rentYield: number;
  /** Type de localisation privilégiée. */
  locations: ('village' | 'ville' | 'métropole')[];
  /** Prestige : influence la réputation et le bonheur. */
  prestige: number;
  description: string;
}

export const PROPERTY_ARCHETYPES: PropertyArchetype[] = [
  { id: 'room', name: 'Chambre de bonne', emoji: '🚪', basePrice: 42000, minArea: 9, maxArea: 18, upkeepRate: 0.018, rentYield: 0.058, locations: ['ville', 'métropole'], prestige: 0, description: 'Une pièce sous les toits. Le strict minimum, mais c’est chez soi.' },
  { id: 'studio', name: 'Studio', emoji: '🛏️', basePrice: 96000, minArea: 16, maxArea: 32, upkeepRate: 0.016, rentYield: 0.052, locations: ['ville', 'métropole'], prestige: 1, description: 'Une pièce à vivre, un coin cuisine. Pratique et abordable.' },
  { id: 'apartment', name: 'Appartement', emoji: '🏢', basePrice: 195000, minArea: 40, maxArea: 95, upkeepRate: 0.015, rentYield: 0.046, locations: ['ville', 'métropole'], prestige: 3, description: 'Deux à quatre pièces dans un immeuble classique.' },
  { id: 'loft', name: 'Loft', emoji: '🧱', basePrice: 340000, minArea: 80, maxArea: 180, upkeepRate: 0.018, rentYield: 0.042, locations: ['métropole'], prestige: 6, description: 'Ancien atelier réhabilité, volumes généreux.' },
  { id: 'townhouse', name: 'Maison de ville', emoji: '🏠', basePrice: 290000, minArea: 70, maxArea: 160, upkeepRate: 0.017, rentYield: 0.044, locations: ['village', 'ville'], prestige: 5, description: 'Maison mitoyenne avec courette.' },
  { id: 'house', name: 'Maison individuelle', emoji: '🏡', basePrice: 380000, minArea: 90, maxArea: 220, upkeepRate: 0.019, rentYield: 0.04, locations: ['village', 'ville'], prestige: 7, description: 'Jardin, garage, quartier calme.' },
  { id: 'cottage', name: 'Chalet', emoji: '🛖', basePrice: 265000, minArea: 60, maxArea: 150, upkeepRate: 0.024, rentYield: 0.05, locations: ['village'], prestige: 6, description: 'Bois, cheminée, isolement bienvenu.' },
  { id: 'farm', name: 'Ferme', emoji: '🚜', basePrice: 420000, minArea: 180, maxArea: 700, upkeepRate: 0.03, rentYield: 0.035, locations: ['village'], prestige: 5, description: 'Corps de ferme et terres attenantes.' },
  { id: 'penthouse', name: 'Penthouse', emoji: '🌆', basePrice: 1250000, minArea: 130, maxArea: 350, upkeepRate: 0.02, rentYield: 0.034, locations: ['métropole'], prestige: 14, description: 'Dernier étage, terrasse panoramique.' },
  { id: 'villa', name: 'Villa', emoji: '🏖️', basePrice: 1650000, minArea: 220, maxArea: 600, upkeepRate: 0.026, rentYield: 0.03, locations: ['village', 'ville', 'métropole'], prestige: 17, description: 'Piscine, vue dégagée, personnel possible.' },
  { id: 'manor', name: 'Manoir', emoji: '🏛️', basePrice: 3400000, minArea: 400, maxArea: 1200, upkeepRate: 0.032, rentYield: 0.024, locations: ['village', 'ville'], prestige: 22, description: 'Demeure de caractère avec parc.' },
  { id: 'castle', name: 'Château', emoji: '🏰', basePrice: 8900000, minArea: 900, maxArea: 4000, upkeepRate: 0.045, rentYield: 0.018, locations: ['village'], prestige: 30, description: 'Douves, tours et factures de chauffage historiques.' },
  { id: 'island', name: 'Île privée', emoji: '🏝️', basePrice: 24000000, minArea: 5000, maxArea: 90000, upkeepRate: 0.05, rentYield: 0.015, locations: ['village'], prestige: 45, description: 'Un caillou bien à soi, quelque part au large.' },
  { id: 'shop', name: 'Local commercial', emoji: '🏪', basePrice: 215000, minArea: 35, maxArea: 200, upkeepRate: 0.02, rentYield: 0.072, locations: ['ville', 'métropole'], prestige: 2, description: 'Pied d’immeuble avec vitrine. Bon rendement locatif.' },
  { id: 'building', name: 'Immeuble de rapport', emoji: '🏬', basePrice: 1450000, minArea: 300, maxArea: 1200, upkeepRate: 0.025, rentYield: 0.068, locations: ['ville', 'métropole'], prestige: 10, description: 'Plusieurs lots loués. Une vraie petite entreprise.' },
];

export const PROPERTY_MAP: Record<string, PropertyArchetype> = Object.fromEntries(
  PROPERTY_ARCHETYPES.map((p) => [p.id, p]),
);

/** Travaux de rénovation proposés au joueur. */
export const RENOVATIONS = [
  { id: 'paint', name: 'Rafraîchissement', emoji: '🎨', costRate: 0.012, condition: 12, valueGain: 0.01 },
  { id: 'kitchen', name: 'Cuisine et salle de bain', emoji: '🚿', costRate: 0.045, condition: 25, valueGain: 0.05 },
  { id: 'full', name: 'Rénovation complète', emoji: '🏗️', costRate: 0.14, condition: 60, valueGain: 0.16 },
  { id: 'luxury', name: 'Aménagement haut de gamme', emoji: '💎', costRate: 0.26, condition: 45, valueGain: 0.3 },
];
