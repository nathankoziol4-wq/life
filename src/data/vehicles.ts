/**
 * Catalogue de véhicules. Toutes les marques et tous les modèles sont fictifs.
 *
 * `basePrice`  : prix neuf de référence
 * `reliability`: 0-100, réduit le risque de panne et la perte de valeur
 * `depreciation`: perte de valeur annuelle de base
 * `upkeep`     : entretien annuel en % du prix neuf
 */

export interface VehicleModel {
  id: string;
  brand: string;
  model: string;
  category: 'citadine' | 'berline' | 'SUV' | 'sportive' | 'luxe' | 'utilitaire' | 'moto' | 'exception' | 'électrique';
  emoji: string;
  basePrice: number;
  reliability: number;
  depreciation: number;
  upkeep: number;
  /** Prestige : influence légèrement la réputation et les rencontres. */
  prestige: number;
  seats: number;
}

const v = (
  id: string, brand: string, model: string, category: VehicleModel['category'], emoji: string,
  basePrice: number, reliability: number, depreciation: number, upkeep: number, prestige: number, seats: number,
): VehicleModel => ({ id, brand, model, category, emoji, basePrice, reliability, depreciation, upkeep, prestige, seats });

export const VEHICLE_MODELS: VehicleModel[] = [
  // Citadines
  v('cit1', 'Vireo', 'Pico', 'citadine', '🚗', 11500, 68, 0.14, 0.05, 0, 4),
  v('cit2', 'Marnet', 'Brise', 'citadine', '🚗', 14200, 74, 0.13, 0.045, 1, 5),
  v('cit3', 'Kestrel', 'Nib', 'citadine', '🚗', 16800, 80, 0.12, 0.042, 2, 5),
  v('cit4', 'Ovalta', 'Mini-O', 'citadine', '🚗', 13400, 62, 0.16, 0.06, 1, 4),
  v('cit5', 'Sanvar', 'Poch', 'citadine', '🚗', 10200, 55, 0.18, 0.07, 0, 4),
  v('cit6', 'Vireo', 'Pico GT', 'citadine', '🚗', 19500, 70, 0.15, 0.058, 3, 4),
  v('cit7', 'Corvane', 'Onda', 'citadine', '🚗', 17600, 78, 0.12, 0.044, 2, 5),
  v('cit8', 'Tarnac', 'Bille', 'citadine', '🚗', 12900, 66, 0.15, 0.055, 1, 4),

  // Berlines
  v('ber1', 'Marnet', 'Alène', 'berline', '🚙', 27500, 78, 0.12, 0.05, 4, 5),
  v('ber2', 'Corvane', 'Ligne', 'berline', '🚙', 34000, 82, 0.11, 0.048, 6, 5),
  v('ber3', 'Halcyon', 'Sedan V', 'berline', '🚙', 44000, 85, 0.11, 0.05, 8, 5),
  v('ber4', 'Fjordis', 'Norda', 'berline', '🚙', 39500, 88, 0.1, 0.045, 7, 5),
  v('ber5', 'Kestrel', 'Prosa', 'berline', '🚙', 29800, 80, 0.12, 0.047, 5, 5),
  v('ber6', 'Ovalta', 'Grand-O', 'berline', '🚙', 25000, 64, 0.16, 0.062, 3, 5),
  v('ber7', 'Meridian', 'Concord', 'berline', '🚙', 52000, 84, 0.12, 0.055, 10, 5),
  v('ber8', 'Sanvar', 'Trait', 'berline', '🚙', 22400, 58, 0.17, 0.068, 2, 5),

  // SUV
  v('suv1', 'Marnet', 'Terra', 'SUV', '🚐', 33000, 76, 0.13, 0.058, 5, 5),
  v('suv2', 'Kestrel', 'Bastion', 'SUV', '🚐', 41500, 82, 0.12, 0.055, 7, 7),
  v('suv3', 'Halcyon', 'Crest', 'SUV', '🚐', 58000, 84, 0.12, 0.06, 11, 7),
  v('suv4', 'Ferrix', 'Massif', 'SUV', '🚐', 48000, 72, 0.14, 0.07, 9, 5),
  v('suv5', 'Fjordis', 'Vidde', 'SUV', '🚐', 45000, 89, 0.1, 0.05, 8, 7),
  v('suv6', 'Meridian', 'Sovereign', 'SUV', '🚐', 92000, 80, 0.14, 0.08, 16, 7),
  v('suv7', 'Ovalta', 'Roc', 'SUV', '🚐', 28500, 62, 0.17, 0.072, 4, 5),
  v('suv8', 'Corvane', 'Altis', 'SUV', '🚐', 37000, 81, 0.12, 0.056, 6, 5),

  // Sportives
  v('spo1', 'Ferrix', 'Lame', 'sportive', '🏎️', 78000, 66, 0.16, 0.11, 18, 2),
  v('spo2', 'Ferrix', 'Lame RS', 'sportive', '🏎️', 128000, 62, 0.17, 0.14, 24, 2),
  v('spo3', 'Vulcania', 'Sirocco', 'sportive', '🏎️', 165000, 58, 0.18, 0.16, 28, 2),
  v('spo4', 'Halcyon', 'Trace', 'sportive', '🏎️', 92000, 78, 0.14, 0.1, 20, 4),
  v('spo5', 'Kestrel', 'Flèche', 'sportive', '🏎️', 61000, 74, 0.15, 0.09, 15, 4),
  v('spo6', 'Vulcania', 'Sirocco Corsa', 'sportive', '🏎️', 268000, 54, 0.19, 0.2, 36, 2),
  v('spo7', 'Meridian', 'Vantage L', 'sportive', '🏎️', 210000, 68, 0.17, 0.17, 32, 2),

  // Luxe
  v('lux1', 'Meridian', 'Régent', 'luxe', '🚘', 148000, 82, 0.15, 0.12, 28, 5),
  v('lux2', 'Aurelian', 'Silence', 'luxe', '🚘', 320000, 86, 0.14, 0.15, 40, 5),
  v('lux3', 'Aurelian', 'Silence Extended', 'luxe', '🚘', 495000, 85, 0.14, 0.18, 48, 5),
  v('lux4', 'Halcyon', 'Prestige', 'luxe', '🚘', 118000, 84, 0.14, 0.11, 24, 5),
  v('lux5', 'Vulcania', 'Cortège', 'luxe', '🚘', 265000, 72, 0.16, 0.17, 38, 4),

  // Exception
  v('exc1', 'Aurelian', 'Opus One', 'exception', '💎', 1450000, 78, 0.06, 0.24, 70, 2),
  v('exc2', 'Vulcania', 'Zéphyr Ultima', 'exception', '💎', 2400000, 70, 0.04, 0.3, 85, 2),
  v('exc3', 'Ferrix', 'Anniversaire', 'exception', '💎', 890000, 74, 0.02, 0.22, 62, 2),
  v('exc4', 'Meridian', 'Héritage 1968', 'exception', '💎', 620000, 60, -0.02, 0.26, 55, 4),

  // Utilitaires
  v('uti1', 'Tarnac', 'Cargo', 'utilitaire', '🚚', 29500, 80, 0.13, 0.06, 1, 3),
  v('uti2', 'Tarnac', 'Cargo Long', 'utilitaire', '🚚', 38000, 79, 0.13, 0.065, 1, 3),
  v('uti3', 'Marnet', 'Labeur', 'utilitaire', '🛻', 34000, 77, 0.13, 0.062, 3, 5),
  v('uti4', 'Ferrix', 'Chantier', 'utilitaire', '🛻', 46000, 74, 0.14, 0.075, 5, 5),
  v('uti5', 'Sanvar', 'Fourgon', 'utilitaire', '🚚', 24000, 60, 0.17, 0.08, 0, 3),

  // Motos
  v('mot1', 'Kestrel', 'Sillage 125', 'moto', '🏍️', 4200, 72, 0.15, 0.05, 3, 2),
  v('mot2', 'Ferrix', 'Éclat 600', 'moto', '🏍️', 9800, 68, 0.16, 0.07, 8, 2),
  v('mot3', 'Vulcania', 'Tonnerre 1000', 'moto', '🏍️', 21500, 62, 0.17, 0.1, 14, 2),
  v('mot4', 'Tarnac', 'Route 800', 'moto', '🏍️', 14200, 78, 0.14, 0.06, 9, 2),
  v('mot5', 'Ovalta', 'Scoot', 'moto', '🛵', 2600, 66, 0.18, 0.04, 1, 2),

  // Électriques
  v('ele1', 'Voltane', 'E-Pulse', 'électrique', '⚡', 36000, 86, 0.15, 0.03, 8, 5),
  v('ele2', 'Voltane', 'E-Pulse Long Range', 'électrique', '⚡', 52000, 87, 0.15, 0.032, 12, 5),
  v('ele3', 'Voltane', 'E-Titan', 'électrique', '⚡', 89000, 84, 0.16, 0.038, 20, 7),
  v('ele4', 'Kestrel', 'Ampère', 'électrique', '⚡', 29000, 82, 0.16, 0.028, 6, 5),
  v('ele5', 'Halcyon', 'Lumen', 'électrique', '⚡', 64000, 88, 0.14, 0.035, 15, 5),
  v('ele6', 'Corvane', 'Ion', 'électrique', '⚡', 33500, 83, 0.15, 0.03, 7, 5),
];

export const VEHICLE_MAP: Record<string, VehicleModel> = Object.fromEntries(
  VEHICLE_MODELS.map((m) => [m.id, m]),
);

export const VEHICLE_CATEGORIES: VehicleModel['category'][] = [
  'citadine', 'berline', 'SUV', 'électrique', 'sportive', 'luxe', 'exception', 'utilitaire', 'moto',
];

/** Prestations de garage. */
export const GARAGE_SERVICES = [
  { id: 'service', name: 'Révision annuelle', emoji: '🔧', costRate: 0.012, condition: 10, minCost: 90 },
  { id: 'repair', name: 'Réparation', emoji: '🛠️', costRate: 0.06, condition: 35, minCost: 250 },
  { id: 'overhaul', name: 'Remise à neuf', emoji: '✨', costRate: 0.18, condition: 80, minCost: 900 },
];
