/**
 * Logements et conditions de vie matérielles.
 *
 * Le logement n'est pas décoratif : sa surface décide s'il y a une chambre
 * pour soi, son coût décide de ce qu'il reste à la fin du mois, son état
 * décide de la santé l'hiver. Chaque champ produit ici est consommé par
 * `systems/context.ts` puis par les systèmes du moteur.
 */

import type {
  HousingProfile,
  HousingType,
  LivingConditions,
  ResidentialZone,
  Tenure,
} from '../engine/origin.ts';

export interface HousingArchetype {
  id: HousingType;
  label: string;
  emoji: string;
  /** Surface habitable, en m². */
  area: [number, number];
  bedrooms: [number, number];
  bathrooms: [number, number];
  /** Prix de référence, en revenu national annuel (5 = cinq ans de salaire). */
  priceInYears: number;
  /** Probabilité d'avoir un jardin privatif. */
  gardenChance: number;
  /** Probabilité d'un balcon, d'une terrasse ou d'une cour. */
  outdoorChance: number;
  /** Zones où ce type de logement se rencontre. */
  zones: ResidentialZone[];
  /** Modes d'occupation plausibles. */
  tenures: Tenure[];
  description: string;
}

export const HOUSING_ARCHETYPES: HousingArchetype[] = [
  {
    id: 'chambre', label: 'Chambre', emoji: '🚪',
    area: [9, 16], bedrooms: [1, 1], bathrooms: [0, 1], priceInYears: 0.6,
    gardenChance: 0, outdoorChance: 0.05,
    zones: ['centre-ville', 'quartier étudiant', 'logement social'],
    tenures: ['locataire', 'logé'],
    description: 'Une pièce, un lit, une salle de bains partagée.',
  },
  {
    id: 'studio', label: 'Studio', emoji: '🛏️',
    area: [16, 30], bedrooms: [1, 1], bathrooms: [1, 1], priceInYears: 1.4,
    gardenChance: 0, outdoorChance: 0.2,
    zones: ['centre-ville', 'quartier étudiant', 'périphérie', 'logement social'],
    tenures: ['locataire', 'logement social', 'logé'],
    description: 'Une seule pièce pour tout. Aucune intimité à plusieurs.',
  },
  {
    id: 'petit appartement', label: 'Petit appartement', emoji: '🏢',
    area: [30, 55], bedrooms: [1, 2], bathrooms: [1, 1], priceInYears: 2.6,
    gardenChance: 0, outdoorChance: 0.4,
    zones: ['centre-ville', 'périphérie', 'logement social', 'banlieue résidentielle', 'quartier étudiant'],
    tenures: ['locataire', 'logement social', 'accédant', 'propriétaire'],
    description: 'Deux pièces, des voisins proches, un loyer contenu.',
  },
  {
    id: 'appartement', label: 'Appartement', emoji: '🏬',
    area: [55, 95], bedrooms: [2, 4], bathrooms: [1, 2], priceInYears: 4.4,
    gardenChance: 0.04, outdoorChance: 0.62,
    zones: ['centre-ville', 'banlieue résidentielle', 'périphérie', 'logement social', 'quartier huppé'],
    tenures: ['locataire', 'logement social', 'accédant', 'propriétaire'],
    description: 'De quoi loger une famille sans que chacun ait sa chambre.',
  },
  {
    id: 'grande résidence', label: 'Grand appartement', emoji: '🏙️',
    area: [95, 160], bedrooms: [3, 5], bathrooms: [2, 3], priceInYears: 8.5,
    gardenChance: 0.06, outdoorChance: 0.86,
    zones: ['centre-ville', 'quartier huppé', 'banlieue résidentielle'],
    tenures: ['locataire', 'accédant', 'propriétaire'],
    description: 'Volumes, ascenseur, gardien. Le centre-ville sans la promiscuité.',
  },
  {
    id: 'maison mitoyenne', label: 'Maison mitoyenne', emoji: '🏠',
    area: [60, 110], bedrooms: [2, 4], bathrooms: [1, 2], priceInYears: 4.8,
    gardenChance: 0.7, outdoorChance: 0.9,
    zones: ['banlieue résidentielle', 'quartier pavillonnaire', 'périphérie'],
    tenures: ['locataire', 'accédant', 'propriétaire'],
    description: 'Un mur mitoyen, un bout de jardin, un crédit sur vingt ans.',
  },
  {
    id: 'maison', label: 'Maison', emoji: '🏡',
    area: [90, 160], bedrooms: [3, 5], bathrooms: [1, 3], priceInYears: 7.0,
    gardenChance: 0.9, outdoorChance: 0.95,
    zones: ['banlieue résidentielle', 'quartier pavillonnaire', 'zone rurale', 'périphérie'],
    tenures: ['locataire', 'accédant', 'propriétaire'],
    description: 'Un étage, un garage, un jardin. Le standard de la classe moyenne.',
  },
  {
    id: 'pavillon', label: 'Pavillon avec terrain', emoji: '🌳',
    area: [120, 210], bedrooms: [4, 6], bathrooms: [2, 3], priceInYears: 10.0,
    gardenChance: 0.98, outdoorChance: 1,
    zones: ['quartier pavillonnaire', 'banlieue résidentielle', 'zone rurale', 'quartier huppé'],
    tenures: ['accédant', 'propriétaire', 'locataire'],
    description: 'De la place partout, et une voiture indispensable.',
  },
  {
    id: 'villa', label: 'Villa', emoji: '🏛️',
    area: [180, 380], bedrooms: [4, 8], bathrooms: [3, 5], priceInYears: 20.0,
    gardenChance: 1, outdoorChance: 1,
    zones: ['quartier huppé', 'quartier pavillonnaire', 'zone rurale'],
    tenures: ['propriétaire', 'accédant'],
    description: 'Piscine, portail, et un quartier qui trie ses habitants.',
  },
  {
    id: 'ferme', label: 'Ferme', emoji: '🚜',
    area: [110, 260], bedrooms: [3, 6], bathrooms: [1, 2], priceInYears: 5.5,
    gardenChance: 1, outdoorChance: 1,
    zones: ['zone rurale'],
    tenures: ['propriétaire', 'accédant', 'logé'],
    description: 'De la terre, du travail, et l’hiver qui coûte cher à chauffer.',
  },
  {
    id: 'propriété de luxe', label: 'Propriété de prestige', emoji: '👑',
    area: [350, 900], bedrooms: [6, 12], bathrooms: [4, 9], priceInYears: 55.0,
    gardenChance: 1, outdoorChance: 1,
    zones: ['quartier huppé', 'zone rurale'],
    tenures: ['propriétaire'],
    description: 'Un parc, du personnel, et un monde qui n’a rien de commun.',
  },
];

export const HOUSING_MAP: Record<string, HousingArchetype> = Object.fromEntries(
  HOUSING_ARCHETYPES.map((h) => [h.id, h]),
);

/** Ordre croissant de standing — utilisé pour comparer deux logements. */
export const HOUSING_ORDER: HousingType[] = HOUSING_ARCHETYPES.map((h) => h.id);

export function housingRank(type: HousingType): number {
  return Math.max(0, HOUSING_ORDER.indexOf(type));
}

/** Logements plausibles dans une zone donnée. */
export function housingForZone(zone: ResidentialZone): HousingArchetype[] {
  const list = HOUSING_ARCHETYPES.filter((h) => h.zones.includes(zone));
  return list.length > 0 ? list : [HOUSING_MAP.appartement];
}

/**
 * Logement le plus plausible pour un foyer donné, avant intervention du
 * joueur. On vise un logement dont le prix représente entre trois et six
 * années de revenu du foyer, borné par ce que la zone propose.
 */
export function plausibleHousing(
  zone: ResidentialZone,
  householdIncome: number,
  nationalIncome: number,
  occupants: number,
): HousingType {
  const capacity = (householdIncome / Math.max(1, nationalIncome)) * 4.5;
  const candidates = housingForZone(zone);
  let best = candidates[0];
  let bestGap = Infinity;
  for (const c of candidates) {
    // Un foyer nombreux vise plus grand à revenu égal.
    const need = c.priceInYears / Math.max(0.4, 1 + (occupants - 3) * 0.12);
    const gap = Math.abs(need - capacity);
    if (gap < bestGap) {
      best = c;
      bestGap = gap;
    }
  }
  return best.id;
}

/** Modes d'occupation plausibles pour un type de logement. */
export function tenuresFor(type: HousingType): Tenure[] {
  return HOUSING_MAP[type]?.tenures ?? ['locataire'];
}

/**
 * Coût annuel du logement selon le mode d'occupation.
 *
 * - locataire : un loyer, intégralement perdu ;
 * - logement social : loyer minoré, mais quartier imposé ;
 * - accédant : mensualités de crédit, plus lourdes qu'un loyer ;
 * - propriétaire : seulement l'entretien et les taxes ;
 * - logé : rien, mais aucune indépendance.
 */
export function annualHousingCost(value: number, tenure: Tenure, rentPressure: number): number {
  // `rentPressure` = rentMult / propertyMult : là où les loyers sont tendus
  // par rapport aux prix, louer coûte davantage à valeur de bien égale.
  const rent = value * 0.048 * Math.max(0.5, Math.min(1.6, rentPressure));
  switch (tenure) {
    case 'locataire': return Math.round(rent);
    case 'logement social': return Math.round(rent * 0.55);
    case 'accédant': return Math.round(value * 0.062);
    case 'propriétaire': return Math.round(value * 0.014);
    case 'logé': return 0;
  }
}

/** Construit un logement complet. */
export function buildHousing(opts: {
  type: HousingType;
  tenure: Tenure;
  occupants: number;
  nationalIncome: number;
  /** Multiplicateur de prix combiné ville × quartier. */
  propertyMult: number;
  /** Multiplicateur de loyer combiné ville × quartier. */
  rentMult: number;
  /** Aisance du foyer, 0-100 : conditionne l'état et l'isolation. */
  comfortBudget: number;
  roll: (min: number, max: number) => number;
}): HousingProfile {
  const a = HOUSING_MAP[opts.type] ?? HOUSING_MAP.appartement;
  const areaM2 = Math.round(opts.roll(a.area[0], a.area[1]));
  const spread = (a.area[1] - a.area[0]) || 1;
  // Un logement plus grand que la moyenne de son type coûte plus cher.
  const sizeFactor = 0.85 + ((areaM2 - a.area[0]) / spread) * 0.3;

  const value = Math.round(a.priceInYears * opts.nationalIncome * opts.propertyMult * sizeFactor);
  const condition = clamp(opts.comfortBudget * 0.55 + 25 + opts.roll(-14, 14));
  const insulation = clamp(condition * 0.7 + opts.comfortBudget * 0.25 + opts.roll(-12, 12));
  const bedrooms = Math.round(opts.roll(a.bedrooms[0], a.bedrooms[1]));

  // Le confort n'est pas la valeur : un grand logement délabré et surpeuplé
  // est moins confortable qu'un petit appartement bien tenu.
  const perPerson = areaM2 / Math.max(1, opts.occupants);
  const comfort = clamp(
    Math.min(100, perPerson * 2.2) * 0.45 + condition * 0.3 + insulation * 0.15 + housingRank(a.id) * 1.2,
  );

  return {
    type: a.id,
    areaM2,
    bedrooms,
    bathrooms: Math.round(opts.roll(a.bathrooms[0], a.bathrooms[1])),
    condition,
    insulation,
    comfort,
    value,
    tenure: opts.tenure,
    annualHousingCost: annualHousingCost(
      value,
      opts.tenure,
      opts.rentMult / Math.max(0.15, opts.propertyMult),
    ),
    occupants: opts.occupants,
  };
}

/**
 * Conditions de vie concrètes.
 *
 * Rien n'est tiré au hasard sans raison : chaque probabilité découle du
 * logement, du revenu disponible, de l'époque, du quartier ou de ce que les
 * parents valorisent. Un équipement absent est presque toujours explicable.
 */
export function buildLivingConditions(opts: {
  housing: HousingProfile;
  /** Nombre d'enfants du foyer, le joueur compris. */
  children: number;
  /** Revenu disponible du foyer rapporté au revenu national. */
  incomeRatio: number;
  /** Année de naissance : l'ordinateur n'existait pas partout en 1975. */
  year: number;
  /** 0 = froid rude, 100 = doux — décide du chauffage et de la climatisation. */
  climate: number;
  /** Qualité des transports locaux : décide de la nécessité d'une voiture. */
  transport: number;
  /** Niveau d'études moyen des parents, 0-100. */
  parentEducation: number;
  /** Attachement de la famille à la culture et à la créativité, 0-100. */
  culturalValues: number;
  chance: (p: number) => boolean;
  roll: (min: number, max: number) => number;
}): LivingConditions {
  const { housing, children } = opts;
  // Les parents occupent une chambre ; le reste se partage entre les enfants.
  const childBedrooms = Math.max(0, housing.bedrooms - 1);
  const ownBedroom = children <= childBedrooms
    ? true
    : childBedrooms >= 1 && opts.chance(0.35 / Math.max(1, children - childBedrooms));

  const spacePerPerson = housing.areaM2 / Math.max(1, housing.occupants);
  const studySpace = opts.chance(
    clamp01(
      0.15
      + (ownBedroom ? 0.4 : 0)
      + Math.min(0.3, spacePerPerson / 90)
      + Math.min(0.15, opts.incomeRatio * 0.1),
    ),
  );

  // Diffusion des équipements : quasi nulle avant 1990, généralisée après 2010.
  const era = clamp01((opts.year - 1985) / 28);
  const computer = opts.chance(clamp01(era * (0.35 + Math.min(0.6, opts.incomeRatio * 0.45))));
  const internet = computer
    ? opts.chance(clamp01(clamp01((opts.year - 1996) / 14) * (0.5 + Math.min(0.5, opts.incomeRatio * 0.4))))
    : opts.chance(clamp01(clamp01((opts.year - 2008) / 12) * 0.4));

  return {
    ownBedroom,
    studySpace,
    computer,
    internet,
    // Un logement mal isolé et un foyer serré : le chauffage devient un choix.
    heating: opts.chance(clamp01(
      0.45 + (100 - opts.climate) / 260 + housing.insulation / 320 + Math.min(0.3, opts.incomeRatio * 0.25),
    )),
    airConditioning: opts.chance(clamp01(
      (opts.climate - 55) / 90 + Math.min(0.35, opts.incomeRatio * 0.3) + era * 0.1,
    )),
    familyCar: opts.chance(clamp01(
      0.3 + (100 - opts.transport) / 190 + Math.min(0.4, opts.incomeRatio * 0.35),
    )),
    garden: opts.chance((HOUSING_MAP[housing.type]?.gardenChance ?? 0)),
    outdoorSpace: opts.chance((HOUSING_MAP[housing.type]?.outdoorChance ?? 0.3)),
    booksAtHome: opts.chance(clamp01(
      0.1 + opts.parentEducation / 165 + opts.culturalValues / 300 + Math.min(0.15, opts.incomeRatio * 0.12),
    )),
    musicalInstrument: opts.chance(clamp01(
      opts.culturalValues / 340 + Math.min(0.3, opts.incomeRatio * 0.22) + (opts.roll(0, 10) > 8 ? 0.05 : 0),
    )),
  };
}

/**
 * Libellé avec son article, pour les phrases écrites. Les libellés bruts
 * n'ont pas d'article, ce qui donnerait « habite-t-elle villa ».
 */
export const HOUSING_PHRASE: Record<HousingType, string> = {
  chambre: 'une chambre',
  studio: 'un studio',
  'petit appartement': 'un petit appartement',
  appartement: 'un appartement',
  'grande résidence': 'un grand appartement',
  'maison mitoyenne': 'une maison mitoyenne',
  maison: 'une maison',
  pavillon: 'un pavillon',
  villa: 'une villa',
  ferme: 'une ferme',
  'propriété de luxe': 'une propriété de prestige',
};

/** Libellé lisible des conditions de vie, pour l'écran de résumé. */
export const LIVING_LABELS: Record<keyof LivingConditions, { emoji: string; label: string; effect: string }> = {
  ownBedroom: { emoji: '🛏️', label: 'Chambre individuelle', effect: 'sommeil, concentration, intimité' },
  studySpace: { emoji: '📖', label: 'Coin pour travailler', effect: 'notes, discipline' },
  computer: { emoji: '💻', label: 'Ordinateur à la maison', effect: 'intelligence, opportunités techniques' },
  internet: { emoji: '🌐', label: 'Connexion internet', effect: 'accès à l’information, réseau' },
  heating: { emoji: '🔥', label: 'Chauffage fiable', effect: 'santé en hiver' },
  airConditioning: { emoji: '❄️', label: 'Climatisation', effect: 'santé lors des canicules' },
  familyCar: { emoji: '🚗', label: 'Voiture familiale', effect: 'accès aux activités et aux soins' },
  garden: { emoji: '🌿', label: 'Jardin', effect: 'forme physique, bonheur' },
  outdoorSpace: { emoji: '🪴', label: 'Balcon ou cour', effect: 'bonheur' },
  booksAtHome: { emoji: '📚', label: 'Des livres à la maison', effect: 'intelligence, réussite scolaire' },
  musicalInstrument: { emoji: '🎹', label: 'Un instrument de musique', effect: 'discipline, créativité' },
};

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(100, v)));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
