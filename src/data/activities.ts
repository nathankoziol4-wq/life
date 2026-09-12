/**
 * Catalogues des activités : chirurgie, sport, loisirs, voyages, achats,
 * animaux… Toutes les données consommées par le système `activities`.
 */

export interface CosmeticProcedure {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  looksGain: number;
  /** Risque d'échec (perte d'apparence et de santé). */
  risk: number;
  minAge: number;
  description: string;
}

export const COSMETIC_PROCEDURES: CosmeticProcedure[] = [
  { id: 'teeth', name: 'Blanchiment dentaire', emoji: '🦷', cost: 480, looksGain: 4, risk: 0.03, minAge: 16, description: 'Un sourire plus net, sans anesthésie.' },
  { id: 'skin', name: 'Soin dermatologique', emoji: '✨', cost: 900, looksGain: 6, risk: 0.05, minAge: 16, description: 'Traitement de la peau sur plusieurs séances.' },
  { id: 'hair', name: 'Greffe capillaire', emoji: '💈', cost: 4200, looksGain: 9, risk: 0.12, minAge: 22, description: 'Redessine une ligne frontale.' },
  { id: 'nose', name: 'Rhinoplastie', emoji: '👃', cost: 5600, looksGain: 12, risk: 0.16, minAge: 18, description: 'Intervention classique, résultat définitif.' },
  { id: 'lipo', name: 'Liposuccion', emoji: '⚖️', cost: 6400, looksGain: 11, risk: 0.2, minAge: 20, description: 'Retrait de graisse localisée. Ne remplace pas le sport.' },
  { id: 'lift', name: 'Lifting du visage', emoji: '🎭', cost: 11500, looksGain: 16, risk: 0.24, minAge: 38, description: 'Rajeunissement du visage. Résultat variable.' },
  { id: 'implants', name: 'Implants', emoji: '💠', cost: 8200, looksGain: 14, risk: 0.19, minAge: 20, description: 'Modification de silhouette par prothèses.' },
  { id: 'full', name: 'Métamorphose complète', emoji: '🌟', cost: 42000, looksGain: 30, risk: 0.35, minAge: 24, description: 'Programme complet sur un an. Cher, long, risqué.' },
];

export interface SportActivity {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  fitness: number;
  health: number;
  happiness: number;
  stress: number;
  injuryRisk: number;
  minAge: number;
  description: string;
}

export const SPORTS: SportActivity[] = [
  { id: 'walk', name: 'Marche quotidienne', emoji: '🚶', cost: 0, fitness: 4, health: 3, happiness: 3, stress: -6, injuryRisk: 0.005, minAge: 5, description: 'Gratuit, sans risque, étonnamment efficace.' },
  { id: 'run', name: 'Course à pied', emoji: '🏃', cost: 90, fitness: 9, health: 6, happiness: 4, stress: -10, injuryRisk: 0.05, minAge: 10, description: 'Trois séances par semaine, quel que soit le temps.' },
  { id: 'gym', name: 'Salle de musculation', emoji: '🏋️', cost: 480, fitness: 13, health: 6, happiness: 5, stress: -8, injuryRisk: 0.07, minAge: 14, description: 'Abonnement annuel. Résultats visibles.' },
  { id: 'swim', name: 'Natation', emoji: '🏊', cost: 320, fitness: 11, health: 8, happiness: 6, stress: -12, injuryRisk: 0.02, minAge: 5, description: 'Complet et doux pour les articulations.' },
  { id: 'yoga', name: 'Yoga', emoji: '🧘', cost: 400, fitness: 6, health: 5, happiness: 7, stress: -18, injuryRisk: 0.01, minAge: 8, description: 'Souplesse et calme mental.' },
  { id: 'martial', name: 'Arts martiaux', emoji: '🥋', cost: 560, fitness: 12, health: 5, happiness: 7, stress: -10, injuryRisk: 0.12, minAge: 6, description: 'Discipline, confiance et quelques bleus.' },
  { id: 'cycling', name: 'Vélo', emoji: '🚴', cost: 250, fitness: 10, health: 6, happiness: 6, stress: -9, injuryRisk: 0.06, minAge: 8, description: 'Sorties longues le week-end.' },
  { id: 'climbing', name: 'Escalade', emoji: '🧗', cost: 620, fitness: 12, health: 5, happiness: 9, stress: -12, injuryRisk: 0.11, minAge: 8, description: 'Force, concentration, vertige.' },
  { id: 'team', name: 'Sport collectif', emoji: '⚽', cost: 340, fitness: 11, health: 6, happiness: 10, stress: -12, injuryRisk: 0.13, minAge: 6, description: 'Le plaisir du groupe, et les troisièmes mi-temps.' },
  { id: 'extreme', name: 'Sports extrêmes', emoji: '🪂', cost: 2400, fitness: 8, health: 2, happiness: 18, stress: -16, injuryRisk: 0.3, minAge: 18, description: 'Sensations garanties, risques aussi.' },
];

export interface WellnessActivity {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  effects: { happiness?: number; stress?: number; health?: number; intelligence?: number; looks?: number; fitness?: number; addiction?: number; discipline?: number };
  minAge: number;
  description: string;
}

export const WELLNESS: WellnessActivity[] = [
  { id: 'meditate', name: 'Méditation', emoji: '🧘‍♀️', cost: 0, effects: { stress: -14, happiness: 5, discipline: 3 }, minAge: 8, description: 'Vingt minutes par jour, tous les jours.' },
  { id: 'therapy', name: 'Psychothérapie', emoji: '🛋️', cost: 1200, effects: { stress: -22, happiness: 12, intelligence: 2 }, minAge: 6, description: 'Un suivi régulier sur l’année.' },
  { id: 'spa', name: 'Journée spa', emoji: '💆', cost: 260, effects: { stress: -12, happiness: 8, looks: 2 }, minAge: 14, description: 'Une parenthèse coûteuse et efficace.' },
  { id: 'diet', name: 'Rééquilibrage alimentaire', emoji: '🥗', cost: 700, effects: { health: 8, fitness: 6, looks: 4, happiness: -2, discipline: 5 }, minAge: 10, description: 'Suivi nutritionnel sur l’année.' },
  { id: 'sleep', name: 'Cure de sommeil', emoji: '😴', cost: 180, effects: { health: 7, stress: -12, happiness: 5, intelligence: 3 }, minAge: 6, description: 'Se coucher tôt, sans écran. Radical.' },
  { id: 'detox', name: 'Cure de désintoxication', emoji: '🌿', cost: 4200, effects: { addiction: -35, health: 10, happiness: 6, stress: -8 }, minAge: 14, description: 'Programme encadré de sevrage.' },
  { id: 'reading', name: 'Année de lecture', emoji: '📚', cost: 140, effects: { intelligence: 7, happiness: 5, stress: -6 }, minAge: 6, description: 'Un livre par semaine, sans exception.' },
  { id: 'course', name: 'Cours du soir', emoji: '🎓', cost: 900, effects: { intelligence: 9, discipline: 6, stress: 5, happiness: 2 }, minAge: 16, description: 'Apprendre quelque chose de neuf, pour soi.' },
];

export interface Destination {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  happiness: number;
  stress: number;
  health: number;
  /** Risque d'incident (vol, maladie, accident). */
  risk: number;
  description: string;
}

export const DESTINATIONS: Destination[] = [
  { id: 'staycation', name: 'Vacances à la maison', emoji: '🏠', cost: 120, happiness: 5, stress: -8, health: 2, risk: 0.02, description: 'Rien faire, chez soi, sans culpabilité.' },
  { id: 'camping', name: 'Camping', emoji: '⛺', cost: 480, happiness: 9, stress: -12, health: 3, risk: 0.06, description: 'Sous la tente, loin du réseau.' },
  { id: 'beach', name: 'Séjour balnéaire', emoji: '🏖️', cost: 1400, happiness: 14, stress: -18, health: 4, risk: 0.05, description: 'Une semaine les pieds dans l’eau.' },
  { id: 'city', name: 'Escapade urbaine', emoji: '🌆', cost: 1100, happiness: 12, stress: -12, health: 1, risk: 0.06, description: 'Musées, restaurants, marche à pied.' },
  { id: 'mountain', name: 'Séjour à la montagne', emoji: '🏔️', cost: 1700, happiness: 13, stress: -16, health: 6, risk: 0.09, description: 'Altitude, air froid, jambes lourdes.' },
  { id: 'roadtrip', name: 'Road trip', emoji: '🚐', cost: 2200, happiness: 17, stress: -18, health: 2, risk: 0.1, description: 'Trois semaines, aucun itinéraire fixe.' },
  { id: 'cruise', name: 'Croisière', emoji: '🛳️', cost: 4200, happiness: 16, stress: -20, health: 3, risk: 0.07, description: 'Buffet permanent et escales programmées.' },
  { id: 'safari', name: 'Safari', emoji: '🦁', cost: 7800, happiness: 22, stress: -18, health: 2, risk: 0.14, description: 'Réveil à 5 h, silence absolu, souvenirs à vie.' },
  { id: 'worldtour', name: 'Tour du monde', emoji: '🌍', cost: 34000, happiness: 32, stress: -28, health: 0, risk: 0.2, description: 'Six mois, quatre continents, une vie qui bascule.' },
  { id: 'luxury', name: 'Palace 5 étoiles', emoji: '🥂', cost: 18500, happiness: 24, stress: -26, health: 5, risk: 0.03, description: 'Le confort absolu, facturé en conséquence.' },
];

export interface NightOut {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  happiness: number;
  stress: number;
  /** Chance de faire une rencontre. */
  meetChance: number;
  addiction: number;
  health: number;
  minAge: number;
  description: string;
}

export const NIGHTLIFE: NightOut[] = [
  { id: 'cinema', name: 'Cinéma', emoji: '🎬', cost: 14, happiness: 6, stress: -6, meetChance: 0.05, addiction: 0, health: 0, minAge: 5, description: 'Deux heures ailleurs.' },
  { id: 'restaurant', name: 'Restaurant', emoji: '🍝', cost: 55, happiness: 8, stress: -7, meetChance: 0.1, addiction: 1, health: -1, minAge: 5, description: 'Un bon repas change une semaine.' },
  { id: 'concert', name: 'Concert', emoji: '🎤', cost: 75, happiness: 13, stress: -10, meetChance: 0.18, addiction: 1, health: -1, minAge: 10, description: 'Fosse, sueur, oreilles qui sifflent.' },
  { id: 'bar', name: 'Soirée en bar', emoji: '🍺', cost: 45, happiness: 9, stress: -8, meetChance: 0.22, addiction: 5, health: -3, minAge: 18, description: 'Quelques verres entre amis.' },
  { id: 'club', name: 'Boîte de nuit', emoji: '🪩', cost: 90, happiness: 12, stress: -9, meetChance: 0.35, addiction: 8, health: -5, minAge: 18, description: 'Trop de monde, trop fort, jusqu’à 5 h.' },
  { id: 'museum', name: 'Musée', emoji: '🖼️', cost: 18, happiness: 5, stress: -8, meetChance: 0.08, addiction: 0, health: 0, minAge: 5, description: 'Une exposition temporaire.' },
  { id: 'sportevent', name: 'Match', emoji: '🏟️', cost: 60, happiness: 10, stress: -8, meetChance: 0.12, addiction: 2, health: 0, minAge: 5, description: 'Ambiance de stade.' },
  { id: 'party', name: 'Fête privée', emoji: '🎉', cost: 35, happiness: 11, stress: -10, meetChance: 0.3, addiction: 6, health: -3, minAge: 14, description: 'Chez quelqu’un, jusqu’à pas d’heure.' },
];

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: 'mode' | 'technologie' | 'bijoux' | 'art' | 'collection';
  looks?: number;
  happiness?: number;
  reputation?: number;
  intelligence?: number;
  /** Taux de conservation de la valeur à la revente. */
  resale: number;
  /** Appréciation annuelle (peut être négative). */
  appreciation: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'sneakers', name: 'Baskets en édition limitée', emoji: '👟', price: 320, category: 'mode', looks: 2, happiness: 4, resale: 0.7, appreciation: 0.02 },
  { id: 'coat', name: 'Manteau de créateur', emoji: '🧥', price: 1400, category: 'mode', looks: 5, happiness: 5, reputation: 2, resale: 0.4, appreciation: -0.08 },
  { id: 'suit', name: 'Costume sur mesure', emoji: '🤵', price: 2600, category: 'mode', looks: 7, reputation: 4, happiness: 4, resale: 0.35, appreciation: -0.1 },
  { id: 'handbag', name: 'Sac de maison de luxe', emoji: '👜', price: 5400, category: 'mode', looks: 6, reputation: 5, happiness: 6, resale: 0.75, appreciation: 0.04 },
  { id: 'phone', name: 'Téléphone dernier cri', emoji: '📱', price: 1250, category: 'technologie', happiness: 6, resale: 0.4, appreciation: -0.25 },
  { id: 'laptop', name: 'Ordinateur haut de gamme', emoji: '💻', price: 2400, category: 'technologie', happiness: 5, intelligence: 3, resale: 0.4, appreciation: -0.22 },
  { id: 'console', name: 'Console de jeu', emoji: '🎮', price: 550, category: 'technologie', happiness: 8, resale: 0.45, appreciation: -0.18 },
  { id: 'camera', name: 'Appareil photo professionnel', emoji: '📷', price: 3200, category: 'technologie', happiness: 6, intelligence: 2, resale: 0.55, appreciation: -0.12 },
  { id: 'watch', name: 'Montre mécanique', emoji: '⌚', price: 8500, category: 'bijoux', looks: 4, reputation: 6, happiness: 7, resale: 0.85, appreciation: 0.05 },
  { id: 'ring', name: 'Bague en diamant', emoji: '💍', price: 6800, category: 'bijoux', looks: 3, reputation: 4, happiness: 6, resale: 0.6, appreciation: 0.03 },
  { id: 'necklace', name: 'Collier d’exception', emoji: '📿', price: 24000, category: 'bijoux', looks: 6, reputation: 9, happiness: 9, resale: 0.7, appreciation: 0.04 },
  { id: 'painting', name: 'Tableau d’artiste émergent', emoji: '🖼️', price: 4200, category: 'art', happiness: 7, reputation: 4, intelligence: 2, resale: 0.6, appreciation: 0.09 },
  { id: 'sculpture', name: 'Sculpture contemporaine', emoji: '🗿', price: 18000, category: 'art', happiness: 8, reputation: 8, resale: 0.65, appreciation: 0.07 },
  { id: 'masterpiece', name: 'Œuvre de maître', emoji: '🎨', price: 480000, category: 'art', happiness: 18, reputation: 22, intelligence: 3, resale: 0.9, appreciation: 0.06 },
  { id: 'guitar', name: 'Guitare vintage', emoji: '🎸', price: 3600, category: 'collection', happiness: 9, resale: 0.8, appreciation: 0.05 },
  { id: 'wine', name: 'Cave à vin', emoji: '🍷', price: 12000, category: 'collection', happiness: 8, reputation: 5, resale: 0.75, appreciation: 0.08 },
  { id: 'coins', name: 'Collection de pièces anciennes', emoji: '🪙', price: 9000, category: 'collection', happiness: 5, intelligence: 3, resale: 0.85, appreciation: 0.06 },
  { id: 'yacht_model', name: 'Maquette de collection', emoji: '⛵', price: 2200, category: 'collection', happiness: 5, resale: 0.7, appreciation: 0.03 },
];

export interface PetSpecies {
  id: string;
  name: string;
  emoji: string;
  price: number;
  annualCost: number;
  lifespan: number;
  happiness: number;
  fitness: number;
  description: string;
}

export const PET_SPECIES: PetSpecies[] = [
  { id: 'dog', name: 'Chien', emoji: '🐕', price: 900, annualCost: 850, lifespan: 13, happiness: 12, fitness: 5, description: 'Fidèle, bruyant, à sortir trois fois par jour.' },
  { id: 'cat', name: 'Chat', emoji: '🐈', price: 400, annualCost: 520, lifespan: 16, happiness: 10, fitness: 0, description: 'Indépendant, décoratif, occasionnellement affectueux.' },
  { id: 'rabbit', name: 'Lapin', emoji: '🐇', price: 90, annualCost: 260, lifespan: 9, happiness: 7, fitness: 0, description: 'Discret et vorace en câbles électriques.' },
  { id: 'hamster', name: 'Hamster', emoji: '🐹', price: 25, annualCost: 120, lifespan: 3, happiness: 5, fitness: 0, description: 'Nocturne, court beaucoup, part vite.' },
  { id: 'bird', name: 'Perroquet', emoji: '🦜', price: 750, annualCost: 340, lifespan: 40, happiness: 8, fitness: 0, description: 'Peut te survivre. Répète tout ce qu’il entend.' },
  { id: 'fish', name: 'Aquarium', emoji: '🐠', price: 220, annualCost: 180, lifespan: 6, happiness: 4, fitness: 0, description: 'Apaisant, silencieux, exigeant en entretien.' },
  { id: 'horse', name: 'Cheval', emoji: '🐎', price: 8500, annualCost: 6200, lifespan: 27, happiness: 16, fitness: 9, description: 'Une passion coûteuse et magnifique.' },
  { id: 'snake', name: 'Serpent', emoji: '🐍', price: 380, annualCost: 240, lifespan: 20, happiness: 6, fitness: 0, description: 'Fait fuir la moitié de tes invités.' },
  { id: 'turtle', name: 'Tortue', emoji: '🐢', price: 160, annualCost: 130, lifespan: 55, happiness: 5, fitness: 0, description: 'À inscrire au testament.' },
];

export const PET_NAMES = [
  'Nougat', 'Praline', 'Wasabi', 'Pixel', 'Mochi', 'Bergamote', 'Radis', 'Chaussette', 'Pistache',
  'Turbo', 'Ficelle', 'Câpre', 'Noisette', 'Zébulon', 'Réglisse', 'Gribouille', 'Patate', 'Sirocco',
  'Colonel', 'Duchesse', 'Bandit', 'Virgule', 'Sarrasin', 'Origan', 'Boulon',
];

/** Options de la salle des ventes (revente de possessions). */
export const SELL_CHANNELS = [
  { id: 'quick', name: 'Vente rapide', emoji: '⚡', rate: 0.6, description: 'Immédiat, mais bien en dessous du marché.' },
  { id: 'market', name: 'Petite annonce', emoji: '📋', rate: 0.85, description: 'Prix correct, il faut attendre un peu.' },
  { id: 'auction', name: 'Salle des ventes', emoji: '🔨', rate: 1.0, description: 'Le meilleur prix, avec une commission.' },
];
