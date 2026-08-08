/**
 * Régions et villes.
 *
 * Plutôt que d'écrire à la main les cent régions de vingt-quatre pays, on
 * définit des *archétypes* régionaux — une capitale, un littoral, un bassin
 * industriel… — instanciés avec un nom par pays. Ajouter un pays revient donc
 * à donner quelques noms, pas à réinventer une économie régionale.
 */

import type { CityProfile, CitySize, RegionProfile } from '../engine/origin.ts';
import { getCountry } from './countries.ts';

export interface RegionArchetype {
  id: string;
  label: string;
  emoji: string;
  economy: number;
  costMult: number;
  density: number;
  climate: number;
  dominantSectors: string[];
  propertyMult: number;
  infrastructure: number;
  transport: number;
  universities: number;
  urbanisation: number;
  /** Tailles de ville plausibles dans cette région. */
  citySizes: CitySize[];
  description: string;
}

export const REGION_ARCHETYPES: RegionArchetype[] = [
  {
    id: 'capital', label: 'Région capitale', emoji: '🏙️',
    economy: 88, costMult: 1.45, density: 92, climate: 55,
    dominantSectors: ['Finance', 'Technologie', 'Fonction publique', 'Médias'],
    propertyMult: 1.6, infrastructure: 88, transport: 92, universities: 90, urbanisation: 95,
    citySizes: ['capitale', 'métropole', 'grande ville'],
    description: 'Tout y est concentré : les emplois, les écoles, les loyers.',
  },
  {
    id: 'coastal', label: 'Littoral', emoji: '🌊',
    economy: 62, costMult: 1.12, density: 55, climate: 78,
    dominantSectors: ['Tourisme', 'Restauration', 'Transport', 'Commerce & Vente'],
    propertyMult: 1.25, infrastructure: 66, transport: 58, universities: 48, urbanisation: 62,
    citySizes: ['métropole', 'grande ville', 'ville moyenne', 'petite ville'],
    description: 'Économie saisonnière, cadre agréable, immobilier tendu.',
  },
  {
    id: 'industrial', label: 'Bassin industriel', emoji: '🏭',
    economy: 48, costMult: 0.82, density: 68, climate: 42,
    dominantSectors: ['Industrie', 'Bâtiment', 'Transport', 'Services'],
    propertyMult: 0.68, infrastructure: 60, transport: 62, universities: 40, urbanisation: 72,
    citySizes: ['grande ville', 'ville moyenne', 'petite ville'],
    description: 'Logement accessible, emploi ouvrier, reconversion difficile.',
  },
  {
    id: 'rural', label: 'Campagne', emoji: '🌾',
    economy: 38, costMult: 0.66, density: 12, climate: 52,
    dominantSectors: ['Agriculture', 'Services', 'Bâtiment', 'Petits boulots'],
    propertyMult: 0.5, infrastructure: 42, transport: 24, universities: 12, urbanisation: 18,
    citySizes: ['village', 'petite ville'],
    description: 'Espace, calme et lenteur. Peu de tout le reste.',
  },
  {
    id: 'tech', label: 'Pôle technologique', emoji: '🧪',
    economy: 92, costMult: 1.38, density: 70, climate: 58,
    dominantSectors: ['Technologie', 'Sciences', 'Finance', 'Éducation'],
    propertyMult: 1.5, infrastructure: 82, transport: 74, universities: 92, urbanisation: 84,
    citySizes: ['métropole', 'grande ville', 'ville moyenne'],
    description: 'Salaires élevés, sélection forte, coût de la vie à l’avenant.',
  },
  {
    id: 'mountain', label: 'Montagne', emoji: '🏔️',
    economy: 46, costMult: 0.9, density: 18, climate: 28,
    dominantSectors: ['Tourisme', 'Agriculture', 'Bâtiment', 'Sport'],
    propertyMult: 0.82, infrastructure: 48, transport: 30, universities: 18, urbanisation: 28,
    citySizes: ['village', 'petite ville', 'ville moyenne'],
    description: 'Hivers rudes, air pur, isolement réel une partie de l’année.',
  },
  {
    id: 'suburban', label: 'Couronne périurbaine', emoji: '🏘️',
    economy: 66, costMult: 1.05, density: 48, climate: 55,
    dominantSectors: ['Commerce & Vente', 'Services', 'Bâtiment', 'Éducation'],
    propertyMult: 1.0, infrastructure: 70, transport: 62, universities: 40, urbanisation: 70,
    citySizes: ['ville moyenne', 'grande ville', 'petite ville'],
    description: 'Ni la ville ni la campagne : pavillons, voiture, écoles correctes.',
  },
  {
    id: 'university', label: 'Ville universitaire', emoji: '🎓',
    economy: 64, costMult: 1.0, density: 60, climate: 52,
    dominantSectors: ['Éducation', 'Sciences', 'Santé', 'Restauration'],
    propertyMult: 0.95, infrastructure: 74, transport: 70, universities: 95, urbanisation: 78,
    citySizes: ['ville moyenne', 'grande ville'],
    description: 'Population jeune, culture accessible, économie étudiante.',
  },
];

export const REGION_MAP: Record<string, RegionArchetype> = Object.fromEntries(
  REGION_ARCHETYPES.map((r) => [r.id, r]),
);

/**
 * Noms de régions par pays. La première entrée de chaque liste correspond au
 * premier archétype disponible, et ainsi de suite.
 */
const REGION_NAMES: Record<string, Partial<Record<string, string>>> = {
  fr: { capital: 'Île-de-France', coastal: 'Provence littorale', industrial: 'Nord-Sambre', rural: 'Val-de-Loire profond', tech: 'Sillon technologique', mountain: 'Alpes du Nord', suburban: 'Grande couronne', university: 'Pays de la Loire' },
  us: { capital: 'District fédéral', coastal: 'Côte Est', industrial: 'Ceinture des lacs', rural: 'Grandes Plaines', tech: 'Vallée de l’Ouest', mountain: 'Montagnes Rocheuses', suburban: 'Comtés résidentiels', university: 'Nouvelle-Angleterre' },
  uk: { capital: 'Grand Londres', coastal: 'Côte Sud', industrial: 'Midlands', rural: 'Campagne du Nord', tech: 'Corridor de l’Est', mountain: 'Hautes Terres', suburban: 'Ceinture verte', university: 'Vallée universitaire' },
  de: { capital: 'Région capitale', coastal: 'Côte de la Baltique', industrial: 'Bassin de la Ruhr', rural: 'Campagne de l’Est', tech: 'Sud technologique', mountain: 'Contreforts alpins', suburban: 'Ceinture urbaine', university: 'Vallée du Neckar' },
  es: { capital: 'Communauté de Madrid', coastal: 'Levante', industrial: 'Nord industriel', rural: 'Meseta', tech: 'Arc méditerranéen', mountain: 'Pyrénées', suburban: 'Périphérie sud', university: 'Vieille Castille' },
  it: { capital: 'Latium', coastal: 'Riviera', industrial: 'Plaine du Pô', rural: 'Collines du Sud', tech: 'Nord-Est', mountain: 'Dolomites', suburban: 'Hinterland', university: 'Émilie' },
  ca: { capital: 'Région de la capitale', coastal: 'Côte Pacifique', industrial: 'Corridor central', rural: 'Prairies', tech: 'Corridor technologique', mountain: 'Rocheuses canadiennes', suburban: 'Banlieues métropolitaines', university: 'Vallée des collèges' },
  jp: { capital: 'Région métropolitaine', coastal: 'Côte du Pacifique', industrial: 'Ceinture industrielle', rural: 'Campagne du Nord', tech: 'Corridor technologique', mountain: 'Alpes japonaises', suburban: 'Banlieues de l’Ouest', university: 'Région des universités' },
  kr: { capital: 'Région capitale', coastal: 'Côte Sud', industrial: 'Ceinture industrielle', rural: 'Provinces intérieures', tech: 'Vallée numérique', mountain: 'Montagnes de l’Est', suburban: 'Villes satellites', university: 'Pôle universitaire' },
  cn: { capital: 'Région de la capitale', coastal: 'Delta côtier', industrial: 'Ceinture manufacturière', rural: 'Intérieur agricole', tech: 'Zone d’innovation', mountain: 'Hauts plateaux', suburban: 'Périphérie urbaine', university: 'District universitaire' },
  in: { capital: 'Territoire de la capitale', coastal: 'Côte occidentale', industrial: 'Ceinture manufacturière', rural: 'Plaines agricoles', tech: 'Corridor technologique', mountain: 'Contreforts himalayens', suburban: 'Périphérie métropolitaine', university: 'Ceinture universitaire' },
  br: { capital: 'District fédéral', coastal: 'Littoral atlantique', industrial: 'Sud-Est industriel', rural: 'Intérieur agricole', tech: 'Pôle technologique', mountain: 'Serra', suburban: 'Grande périphérie', university: 'Région des campus' },
  mx: { capital: 'Vallée de Mexico', coastal: 'Côte du Golfe', industrial: 'Nord industriel', rural: 'Campagne du Sud', tech: 'Corridor du Bajío', mountain: 'Sierra', suburban: 'Zone métropolitaine', university: 'Ville universitaire' },
  ru: { capital: 'Région de la capitale', coastal: 'Côte baltique', industrial: 'Oural industriel', rural: 'Terres noires', tech: 'Cité scientifique', mountain: 'Caucase', suburban: 'Ceinture périurbaine', university: 'Région universitaire' },
  se: { capital: 'Grand Stockholm', coastal: 'Côte occidentale', industrial: 'Bergslagen', rural: 'Norrland intérieur', tech: 'Vallée numérique', mountain: 'Massif nordique', suburban: 'Communes périurbaines', university: 'Uppland' },
  no: { capital: 'Région d’Oslo', coastal: 'Fjords de l’Ouest', industrial: 'Corridor pétrolier', rural: 'Intérieur des terres', tech: 'Pôle maritime', mountain: 'Hautes vallées', suburban: 'Communes voisines', university: 'Trøndelag' },
  ma: { capital: 'Région de Rabat', coastal: 'Côte atlantique', industrial: 'Zone de Casablanca', rural: 'Plaines intérieures', tech: 'Technopole', mountain: 'Atlas', suburban: 'Périphérie urbaine', university: 'Fès-Meknès' },
  eg: { capital: 'Grand Caire', coastal: 'Côte méditerranéenne', industrial: 'Delta industriel', rural: 'Haute-Égypte', tech: 'Cité technologique', mountain: 'Sinaï', suburban: 'Villes nouvelles', university: 'Région universitaire' },
  ng: { capital: 'Territoire fédéral', coastal: 'Côte lagunaire', industrial: 'Ceinture pétrolière', rural: 'Nord agricole', tech: 'Pôle numérique', mountain: 'Plateau', suburban: 'Périphérie de Lagos', university: 'Ceinture universitaire' },
  za: { capital: 'Gauteng', coastal: 'Cap occidental', industrial: 'Ceinture minière', rural: 'Karoo', tech: 'Corridor technologique', mountain: 'Drakensberg', suburban: 'Banlieues nord', university: 'Région des campus' },
  au: { capital: 'Territoire de la capitale', coastal: 'Côte Est', industrial: 'Ceinture minière', rural: 'Outback', tech: 'Corridor d’innovation', mountain: 'Alpes australiennes', suburban: 'Banlieues métropolitaines', university: 'Région universitaire' },
  ch: { capital: 'Région bernoise', coastal: 'Rives lémaniques', industrial: 'Arc horloger', rural: 'Campagne alémanique', tech: 'Pôle de recherche', mountain: 'Valais alpin', suburban: 'Agglomérations', university: 'Région académique' },
  ar: { capital: 'Buenos Aires métropolitain', coastal: 'Côte atlantique', industrial: 'Ceinture industrielle', rural: 'Pampa', tech: 'Pôle technologique', mountain: 'Andes', suburban: 'Conurbano', university: 'Région universitaire' },
  nl: { capital: 'Randstad', coastal: 'Côte de la mer du Nord', industrial: 'Zone portuaire', rural: 'Provinces du Nord', tech: 'Vallée technologique', mountain: 'Limbourg vallonné', suburban: 'Communes résidentielles', university: 'Région universitaire' },
};

/** Régions disponibles pour un pays donné. */
export function regionsFor(countryId: string): RegionProfile[] {
  const names = REGION_NAMES[countryId] ?? REGION_NAMES.fr;
  const country = getCountry(countryId);
  return REGION_ARCHETYPES.filter((a) => names[a.id]).map((a) => ({
    id: a.id,
    name: names[a.id]!,
    // Les indices nationaux modulent les archétypes : un bassin industriel
    // suisse reste plus prospère qu'un bassin industriel égyptien.
    economy: clamp100(a.economy * (0.6 + country.salaryIndex * 0.35)),
    costMult: a.costMult,
    density: a.density,
    climate: a.climate,
    dominantSectors: a.dominantSectors,
    propertyMult: a.propertyMult,
    infrastructure: clamp100(a.infrastructure * (0.55 + country.education * 0.55)),
    transport: clamp100(a.transport * (0.5 + country.education * 0.6)),
    universities: clamp100(a.universities * (0.5 + country.education * 0.6)),
    urbanisation: a.urbanisation,
  }));
}

function clamp100(v: number): number {
  return Math.round(Math.max(0, Math.min(100, v)));
}

/** Caractéristiques d'une taille de ville. */
export const CITY_SIZES: Record<CitySize, {
  population: [number, number];
  costMult: number;
  salaryMult: number;
  density: number;
  jobOpportunity: number;
  universities: number;
  entertainment: number;
  transport: number;
  greenSpace: number;
  pollution: number;
  description: string;
}> = {
  village: {
    population: [200, 2500], costMult: 0.72, salaryMult: 0.82, density: 10,
    jobOpportunity: 18, universities: 0, entertainment: 15, transport: 18,
    greenSpace: 92, pollution: 12,
    description: 'Tout le monde se connaît. Il faut une voiture pour tout.',
  },
  'petite ville': {
    population: [2500, 20000], costMult: 0.84, salaryMult: 0.9, density: 30,
    jobOpportunity: 34, universities: 8, entertainment: 32, transport: 36,
    greenSpace: 74, pollution: 24,
    description: 'Un centre, quelques commerces, un collège, un stade.',
  },
  'ville moyenne': {
    population: [20000, 120000], costMult: 0.95, salaryMult: 0.97, density: 52,
    jobOpportunity: 52, universities: 32, entertainment: 52, transport: 56,
    greenSpace: 58, pollution: 38,
    description: 'Assez grande pour avoir de tout, assez petite pour s’y repérer.',
  },
  'grande ville': {
    population: [120000, 600000], costMult: 1.12, salaryMult: 1.06, density: 72,
    jobOpportunity: 72, universities: 62, entertainment: 72, transport: 74,
    greenSpace: 44, pollution: 54,
    description: 'Université, hôpital, entreprises : les portes s’ouvrent.',
  },
  métropole: {
    population: [600000, 4000000], costMult: 1.34, salaryMult: 1.18, density: 88,
    jobOpportunity: 90, universities: 84, entertainment: 90, transport: 88,
    greenSpace: 32, pollution: 70,
    description: 'Tout est possible, tout est cher, tout le monde est pressé.',
  },
  capitale: {
    population: [1000000, 12000000], costMult: 1.5, salaryMult: 1.26, density: 95,
    jobOpportunity: 96, universities: 92, entertainment: 96, transport: 94,
    greenSpace: 28, pollution: 78,
    description: 'Le centre de gravité du pays. La concurrence y est féroce.',
  },
};

export const CITY_SIZE_LIST: CitySize[] = [
  'village', 'petite ville', 'ville moyenne', 'grande ville', 'métropole', 'capitale',
];

/**
 * Construit le profil complet d'une ville à partir de son nom, de sa taille,
 * du pays et de la région. Les caractéristiques ne sont jamais inventées deux
 * fois : elles découlent toujours de ces trois sources.
 */
export function buildCity(
  countryId: string,
  region: RegionProfile,
  name: string,
  size: CitySize,
  roll: (min: number, max: number) => number,
): CityProfile {
  const country = getCountry(countryId);
  const s = CITY_SIZES[size];
  const population = Math.round(roll(s.population[0], s.population[1]));
  const infra = (region.infrastructure + country.education * 100) / 2;

  return {
    name,
    size,
    population,
    // Une région très urbanisée densifie même ses petites villes.
    density: clamp100(s.density * (0.7 + region.density / 200) * (0.85 + region.urbanisation / 340)),
    costMult: s.costMult * region.costMult,
    propertyMult: s.costMult * region.propertyMult,
    rentMult: s.costMult * region.propertyMult * 0.95,
    salaryMult: s.salaryMult * (0.75 + region.economy / 200),
    unemployment: clamp100(18 - region.economy / 8 + (100 - s.jobOpportunity) / 8),
    safety: clamp100(100 - country.crime * 70 - s.density / 6 + roll(-8, 8)),
    transport: clamp100((s.transport + region.transport) / 2),
    pollution: clamp100(s.pollution * (0.6 + region.density / 150)),
    greenSpace: clamp100(s.greenSpace * (0.8 + (100 - region.density) / 400)),
    entertainment: clamp100(s.entertainment * (0.7 + region.economy / 250)),
    universities: clamp100((s.universities + region.universities) / 2),
    schools: clamp100(infra * 0.9 + roll(-6, 6)),
    employers: clamp100(s.jobOpportunity * (0.7 + region.economy / 250)),
    healthcare: clamp100(infra * (0.5 + country.healthcare * 0.7)),
    shops: clamp100(s.entertainment * 0.85 + s.density / 5),
    sports: clamp100(infra * 0.75 + s.entertainment / 4 + roll(-8, 8)),
    culture: clamp100(s.entertainment * 0.9 + region.universities / 5),
    nightlife: clamp100(s.entertainment * (size === 'village' ? 0.3 : 0.95)),
    jobOpportunity: clamp100(s.jobOpportunity * (0.65 + region.economy / 220)),
  };
}
