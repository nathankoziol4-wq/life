/**
 * Archétypes de quartier.
 *
 * Le quartier est le système le plus structurant du jeu : il alimente
 * l'école, les fréquentations, les activités accessibles, l'exposition à la
 * délinquance, le coût du logement et une partie des événements.
 *
 * Les valeurs sont des points de départ ; le quartier évolue ensuite chaque
 * année (`systems/environment.ts`).
 */

import type { NeighborhoodProfile, ResidentialZone } from '../engine/origin.ts';

export interface NeighborhoodArchetype {
  id: string;
  label: string;
  emoji: string;
  zones: ResidentialZone[];
  /** Revenu médian relatif au revenu national (1 = moyenne). */
  incomeRatio: number;
  propertyMult: number;
  rentMult: number;

  safety: number;
  schoolQuality: number;
  density: number;
  cleanliness: number;
  pollution: number;
  noise: number;
  greenSpace: number;
  transport: number;
  shops: number;
  sportsFacilities: number;
  childActivities: number;
  healthAccess: number;
  socialLife: number;
  localEmployment: number;
  residentialStability: number;
  reputation: number;
  communityCohesion: number;
  /** Tendance annuelle : positif = le quartier s'améliore. */
  drift: number;
  description: string;
}

export const NEIGHBORHOOD_ARCHETYPES: NeighborhoodArchetype[] = [
  {
    id: 'deprived', label: 'Quartier populaire en difficulté', emoji: '🧱',
    zones: ['logement social', 'périphérie'],
    incomeRatio: 0.48, propertyMult: 0.5, rentMult: 0.55,
    safety: 32, schoolQuality: 34, density: 82, cleanliness: 38, pollution: 62,
    noise: 72, greenSpace: 28, transport: 62, shops: 48, sportsFacilities: 44,
    childActivities: 38, healthAccess: 42, socialLife: 62, localEmployment: 34,
    residentialStability: 42, reputation: 26, communityCohesion: 64, drift: -0.2,
    description: 'Solidarité réelle, moyens rares, réputation qui colle à la peau.',
  },
  {
    id: 'working', label: 'Quartier ouvrier', emoji: '🔧',
    zones: ['périphérie', 'banlieue résidentielle'],
    incomeRatio: 0.72, propertyMult: 0.68, rentMult: 0.72,
    safety: 52, schoolQuality: 50, density: 66, cleanliness: 54, pollution: 52,
    noise: 58, greenSpace: 40, transport: 64, shops: 58, sportsFacilities: 56,
    childActivities: 52, healthAccess: 54, socialLife: 66, localEmployment: 58,
    residentialStability: 66, reputation: 46, communityCohesion: 70, drift: 0,
    description: 'On se connaît, on s’entraide, on compte ses fins de mois.',
  },
  {
    id: 'middle', label: 'Quartier de classe moyenne', emoji: '🏘️',
    zones: ['banlieue résidentielle', 'quartier pavillonnaire'],
    incomeRatio: 1.0, propertyMult: 1.0, rentMult: 1.0,
    safety: 68, schoolQuality: 64, density: 48, cleanliness: 68, pollution: 40,
    noise: 44, greenSpace: 56, transport: 60, shops: 62, sportsFacilities: 64,
    childActivities: 66, healthAccess: 66, socialLife: 58, localEmployment: 58,
    residentialStability: 74, reputation: 62, communityCohesion: 58, drift: 0.05,
    description: 'Pavillons, écoles correctes, associations et voitures au garage.',
  },
  {
    id: 'historic', label: 'Centre historique', emoji: '🏛️',
    zones: ['centre-ville'],
    incomeRatio: 1.18, propertyMult: 1.35, rentMult: 1.32,
    safety: 62, schoolQuality: 68, density: 88, cleanliness: 66, pollution: 58,
    noise: 76, greenSpace: 30, transport: 90, shops: 92, sportsFacilities: 52,
    childActivities: 62, healthAccess: 78, socialLife: 82, localEmployment: 78,
    residentialStability: 52, reputation: 74, communityCohesion: 46, drift: 0.1,
    description: 'Tout à pied, du bruit sous les fenêtres, des loyers qui montent.',
  },
  {
    id: 'affluent', label: 'Quartier huppé', emoji: '💎',
    zones: ['quartier huppé', 'quartier pavillonnaire'],
    incomeRatio: 2.6, propertyMult: 2.3, rentMult: 2.1,
    safety: 88, schoolQuality: 86, density: 34, cleanliness: 90, pollution: 22,
    noise: 24, greenSpace: 76, transport: 62, shops: 74, sportsFacilities: 84,
    childActivities: 82, healthAccess: 88, socialLife: 52, localEmployment: 66,
    residentialStability: 86, reputation: 92, communityCohesion: 42, drift: 0.08,
    description: 'Calme, écoles réputées, réseaux utiles — et une certaine froideur.',
  },
  {
    id: 'gentrifying', label: 'Quartier en transformation', emoji: '🎨',
    zones: ['centre-ville', 'périphérie'],
    incomeRatio: 0.86, propertyMult: 0.92, rentMult: 0.98,
    safety: 54, schoolQuality: 52, density: 74, cleanliness: 56, pollution: 50,
    noise: 66, greenSpace: 42, transport: 76, shops: 70, sportsFacilities: 54,
    childActivities: 56, healthAccess: 60, socialLife: 78, localEmployment: 62,
    residentialStability: 40, reputation: 54, communityCohesion: 50, drift: 0.55,
    description: 'Ateliers, cafés, chantiers. Dans dix ans, plus personne d’aujourd’hui.',
  },
  {
    id: 'student', label: 'Quartier étudiant', emoji: '📚',
    zones: ['quartier étudiant', 'centre-ville'],
    incomeRatio: 0.7, propertyMult: 0.9, rentMult: 1.05,
    safety: 58, schoolQuality: 72, density: 80, cleanliness: 50, pollution: 46,
    noise: 78, greenSpace: 44, transport: 84, shops: 74, sportsFacilities: 68,
    childActivities: 44, healthAccess: 68, socialLife: 92, localEmployment: 54,
    residentialStability: 26, reputation: 58, communityCohesion: 44, drift: 0,
    description: 'Vie nocturne permanente, colocations, bibliothèques ouvertes tard.',
  },
  {
    id: 'suburbanCalm', label: 'Lotissement tranquille', emoji: '🌳',
    zones: ['quartier pavillonnaire', 'banlieue résidentielle'],
    incomeRatio: 1.22, propertyMult: 1.15, rentMult: 1.08,
    safety: 82, schoolQuality: 72, density: 28, cleanliness: 82, pollution: 24,
    noise: 22, greenSpace: 78, transport: 38, shops: 44, sportsFacilities: 66,
    childActivities: 70, healthAccess: 58, socialLife: 50, localEmployment: 40,
    residentialStability: 84, reputation: 70, communityCohesion: 62, drift: 0.02,
    description: 'Jardins, silence et dépendance totale à la voiture.',
  },
  {
    id: 'village', label: 'Village', emoji: '⛪',
    zones: ['zone rurale'],
    incomeRatio: 0.8, propertyMult: 0.52, rentMult: 0.58,
    safety: 86, schoolQuality: 52, density: 8, cleanliness: 76, pollution: 12,
    noise: 14, greenSpace: 95, transport: 16, shops: 26, sportsFacilities: 38,
    childActivities: 40, healthAccess: 30, socialLife: 60, localEmployment: 28,
    residentialStability: 88, reputation: 58, communityCohesion: 86, drift: -0.05,
    description: 'Chacun connaît chacun. Le premier lycée est à trente kilomètres.',
  },
  {
    id: 'isolated', label: 'Hameau isolé', emoji: '🛤️',
    zones: ['zone rurale'],
    incomeRatio: 0.68, propertyMult: 0.4, rentMult: 0.46,
    safety: 88, schoolQuality: 42, density: 3, cleanliness: 78, pollution: 8,
    noise: 8, greenSpace: 98, transport: 6, shops: 10, sportsFacilities: 18,
    childActivities: 20, healthAccess: 18, socialLife: 34, localEmployment: 18,
    residentialStability: 90, reputation: 50, communityCohesion: 72, drift: -0.12,
    description: 'Le silence, l’espace, et une heure de route pour tout le reste.',
  },
  {
    id: 'business', label: 'Quartier d’affaires', emoji: '🏢',
    zones: ['centre-ville'],
    incomeRatio: 1.7, propertyMult: 1.7, rentMult: 1.65,
    safety: 74, schoolQuality: 70, density: 92, cleanliness: 78, pollution: 60,
    noise: 70, greenSpace: 22, transport: 94, shops: 80, sportsFacilities: 62,
    childActivities: 38, healthAccess: 76, socialLife: 46, localEmployment: 94,
    residentialStability: 44, reputation: 76, communityCohesion: 28, drift: 0.12,
    description: 'Des tours, des sièges sociaux, et personne dehors le dimanche.',
  },
  {
    id: 'seaside', label: 'Front de mer', emoji: '🏖️',
    zones: ['banlieue résidentielle', 'centre-ville'],
    incomeRatio: 1.3, propertyMult: 1.55, rentMult: 1.4,
    safety: 72, schoolQuality: 62, density: 54, cleanliness: 74, pollution: 26,
    noise: 52, greenSpace: 62, transport: 52, shops: 68, sportsFacilities: 78,
    childActivities: 68, healthAccess: 62, socialLife: 74, localEmployment: 52,
    residentialStability: 56, reputation: 76, communityCohesion: 52, drift: 0.06,
    description: 'Saisonnier, lumineux, cher, et vide six mois par an.',
  },
];

export const NEIGHBORHOOD_MAP: Record<string, NeighborhoodArchetype> = Object.fromEntries(
  NEIGHBORHOOD_ARCHETYPES.map((n) => [n.id, n]),
);

/**
 * Calcule les axes synthétiques d'un quartier à partir de ses composantes.
 * C'est cette agrégation que les systèmes consomment.
 */
export function deriveNeighborhoodAxes(n: {
  medianIncome: number;
  safety: number;
  schoolQuality: number;
  transport: number;
  shops: number;
  socialLife: number;
  localEmployment: number;
  childActivities: number;
  communityCohesion: number;
  residentialStability: number;
  reputation: number;
}, nationalIncome: number): {
  socialOpportunity: number;
  economicOpportunity: number;
  educationAccess: number;
  crimeExposure: number;
  communityCohesion: number;
} {
  const wealth = Math.min(200, (n.medianIncome / Math.max(1, nationalIncome)) * 100);
  return {
    socialOpportunity: clamp(n.socialLife * 0.4 + n.shops * 0.2 + n.childActivities * 0.25 + n.transport * 0.15),
    economicOpportunity: clamp(n.localEmployment * 0.45 + wealth * 0.25 + n.transport * 0.2 + n.reputation * 0.1),
    educationAccess: clamp(n.schoolQuality * 0.55 + wealth * 0.15 + n.transport * 0.15 + n.residentialStability * 0.15),
    crimeExposure: clamp(100 - n.safety * 0.75 - n.communityCohesion * 0.25),
    communityCohesion: clamp(n.communityCohesion),
  };
}

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(100, v)));
}

/** Noms de quartiers, combinés à la volée. */
const NEIGHBORHOOD_PREFIXES = [
  'Les', 'Le', 'La', 'Vieux', 'Haut', 'Bas', 'Petit', 'Grand',
];
const NEIGHBORHOOD_ROOTS = [
  'Peupliers', 'Marronniers', 'Coteau', 'Fontaine', 'Moulin', 'Verger', 'Clos',
  'Pré-Vert', 'Roseraie', 'Garenne', 'Chênaie', 'Bruyère', 'Tilleuls', 'Sablons',
  'Charmilles', 'Aubépines', 'Cascade', 'Belvédère', 'Terrasses', 'Écluse',
  'Docks', 'Halles', 'Rempart', 'Beffroi', 'Cité-Jardin', 'Plateau', 'Vallon',
];

export function neighborhoodName(pick: <T>(a: readonly T[]) => T): string {
  return `${pick(NEIGHBORHOOD_PREFIXES)} ${pick(NEIGHBORHOOD_ROOTS)}`;
}

/** Libellés des sous-zones résidentielles. */
export const ZONE_LABELS: Record<ResidentialZone, { emoji: string; description: string }> = {
  'centre-ville': { emoji: '🌆', description: 'Tout à pied, du bruit, peu d’espace.' },
  'banlieue résidentielle': { emoji: '🏡', description: 'Calme relatif, transports corrects.' },
  'quartier pavillonnaire': { emoji: '🏠', description: 'Jardins, voisinage stable, voiture indispensable.' },
  'logement social': { emoji: '🏢', description: 'Loyer contenu, densité forte, entraide.' },
  'zone rurale': { emoji: '🌾', description: 'Espace et isolement.' },
  'quartier étudiant': { emoji: '🎓', description: 'Jeune, bruyant, très vivant.' },
  périphérie: { emoji: '🛣️', description: 'Loin du centre, dépendant des transports.' },
  'quartier huppé': { emoji: '💎', description: 'Sécurité, écoles réputées, réseaux.' },
};

/** Ce que la sous-zone modifie par rapport à l'archétype de quartier. */
export const ZONE_MODIFIERS: Record<ResidentialZone, Partial<Record<
  'safety' | 'density' | 'noise' | 'greenSpace' | 'transport' | 'shops' | 'rentMult' | 'propertyMult' | 'residentialStability' | 'socialLife', number
>>> = {
  'centre-ville': { density: 18, noise: 14, greenSpace: -14, transport: 16, shops: 16, rentMult: 0.12, propertyMult: 0.14, socialLife: 10, residentialStability: -10 },
  'banlieue résidentielle': { density: -8, noise: -8, greenSpace: 8, transport: -4, residentialStability: 8 },
  'quartier pavillonnaire': { density: -18, noise: -16, greenSpace: 16, transport: -14, shops: -10, residentialStability: 12, rentMult: -0.04 },
  'logement social': { safety: -12, density: 16, noise: 10, rentMult: -0.3, propertyMult: -0.25, residentialStability: -6, socialLife: 8 },
  'zone rurale': { density: -30, noise: -24, greenSpace: 26, transport: -28, shops: -24, rentMult: -0.22, propertyMult: -0.28, residentialStability: 14 },
  'quartier étudiant': { noise: 16, socialLife: 18, residentialStability: -20, transport: 10, rentMult: 0.06 },
  périphérie: { transport: -12, shops: -10, rentMult: -0.12, propertyMult: -0.14, greenSpace: 6 },
  'quartier huppé': { safety: 12, density: -14, noise: -12, greenSpace: 12, rentMult: 0.35, propertyMult: 0.4, residentialStability: 10, socialLife: -8 },
};

/** Construit un quartier complet à partir d'un archétype et d'une zone. */
export function buildNeighborhood(
  archetypeId: string,
  zone: ResidentialZone,
  name: string,
  nationalIncome: number,
  cityCostMult: number,
  jitter: (spread: number) => number,
): NeighborhoodProfile {
  const a = NEIGHBORHOOD_MAP[archetypeId] ?? NEIGHBORHOOD_MAP.middle;
  const mod = ZONE_MODIFIERS[zone] ?? {};
  const num = (base: number, key: keyof typeof mod) =>
    clamp(base + ((mod[key] as number) ?? 0) + jitter(6));

  const core = {
    medianIncome: Math.round(nationalIncome * a.incomeRatio * (1 + jitter(0.08))),
    safety: num(a.safety, 'safety'),
    schoolQuality: clamp(a.schoolQuality + jitter(7)),
    density: num(a.density, 'density'),
    cleanliness: clamp(a.cleanliness + jitter(7)),
    pollution: clamp(a.pollution + jitter(7)),
    noise: num(a.noise, 'noise'),
    greenSpace: num(a.greenSpace, 'greenSpace'),
    transport: num(a.transport, 'transport'),
    shops: num(a.shops, 'shops'),
    sportsFacilities: clamp(a.sportsFacilities + jitter(8)),
    childActivities: clamp(a.childActivities + jitter(8)),
    healthAccess: clamp(a.healthAccess + jitter(7)),
    socialLife: num(a.socialLife, 'socialLife'),
    localEmployment: clamp(a.localEmployment + jitter(7)),
    residentialStability: num(a.residentialStability, 'residentialStability'),
    reputation: clamp(a.reputation + jitter(7)),
    communityCohesion: clamp(a.communityCohesion + jitter(7)),
  };

  return {
    archetypeId: a.id,
    name,
    zone,
    ...core,
    propertyMult: Math.max(0.15, a.propertyMult * cityCostMult + ((mod.propertyMult as number) ?? 0)),
    rentMult: Math.max(0.15, a.rentMult * cityCostMult + ((mod.rentMult as number) ?? 0)),
    ...deriveNeighborhoodAxes(core, nationalIncome),
  };
}
