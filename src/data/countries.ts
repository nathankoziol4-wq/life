/**
 * Pays jouables. Ajouter un pays = ajouter une entrée ici.
 *
 * Les indices sont des multiplicateurs relatifs à une référence de 1.0 :
 * - `salaryIndex`   : niveau des salaires
 * - `costIndex`     : coût de la vie (loyers, courses, soins)
 * - `propertyIndex` : prix de l'immobilier
 * - `taxRate`       : taux d'imposition effectif moyen
 * - `healthcare`    : part des frais médicaux prise en charge (0-1)
 * - `education`     : qualité moyenne du système scolaire (0-1)
 * - `crime`         : niveau de criminalité (0-1), influence les opportunités
 *                     et les risques d'agression
 * - `justice`       : sévérité judiciaire (0-1), multiplie les peines
 * - `lifespan`      : bonus/malus d'espérance de vie en années
 */

export interface Country {
  id: string;
  name: string;
  flag: string;
  currency: string;
  /** Symbole affiché après le montant. */
  symbol: string;
  nameSet: string;
  salaryIndex: number;
  costIndex: number;
  propertyIndex: number;
  taxRate: number;
  healthcare: number;
  education: number;
  crime: number;
  justice: number;
  lifespan: number;
  /** Facilité d'obtention d'un visa pour immigrer (0-1). */
  openness: number;
  cities: { name: string; size: 'village' | 'ville' | 'métropole'; costMult: number }[];
}

export const COUNTRIES: Country[] = [
  {
    id: 'fr', name: 'France', flag: '🇫🇷', currency: 'EUR', symbol: '€', nameSet: 'fr',
    salaryIndex: 1.0, costIndex: 1.0, propertyIndex: 1.0, taxRate: 0.30, healthcare: 0.75,
    education: 0.78, crime: 0.35, justice: 0.55, lifespan: 3, openness: 0.5,
    cities: [
      { name: 'Paris', size: 'métropole', costMult: 1.55 },
      { name: 'Lyon', size: 'métropole', costMult: 1.15 },
      { name: 'Marseille', size: 'métropole', costMult: 1.0 },
      { name: 'Toulouse', size: 'ville', costMult: 0.98 },
      { name: 'Nantes', size: 'ville', costMult: 1.02 },
      { name: 'Strasbourg', size: 'ville', costMult: 0.95 },
      { name: 'Limoges', size: 'ville', costMult: 0.8 },
      { name: 'Aurillac', size: 'village', costMult: 0.68 },
    ],
  },
  {
    id: 'us', name: 'États-Unis', flag: '🇺🇸', currency: 'USD', symbol: '$', nameSet: 'en',
    salaryIndex: 1.45, costIndex: 1.2, propertyIndex: 1.25, taxRate: 0.26, healthcare: 0.25,
    education: 0.72, crime: 0.5, justice: 0.85, lifespan: -1, openness: 0.35,
    cities: [
      { name: 'New York', size: 'métropole', costMult: 1.75 },
      { name: 'San Francisco', size: 'métropole', costMult: 1.85 },
      { name: 'Chicago', size: 'métropole', costMult: 1.15 },
      { name: 'Austin', size: 'ville', costMult: 1.05 },
      { name: 'Denver', size: 'ville', costMult: 1.08 },
      { name: 'Cleveland', size: 'ville', costMult: 0.78 },
      { name: 'Tupelo', size: 'village', costMult: 0.62 },
    ],
  },
  {
    id: 'uk', name: 'Royaume-Uni', flag: '🇬🇧', currency: 'GBP', symbol: '£', nameSet: 'en',
    salaryIndex: 1.15, costIndex: 1.15, propertyIndex: 1.3, taxRate: 0.29, healthcare: 0.85,
    education: 0.8, crime: 0.38, justice: 0.6, lifespan: 2, openness: 0.4,
    cities: [
      { name: 'Londres', size: 'métropole', costMult: 1.8 },
      { name: 'Manchester', size: 'métropole', costMult: 1.05 },
      { name: 'Édimbourg', size: 'ville', costMult: 1.1 },
      { name: 'Birmingham', size: 'métropole', costMult: 0.98 },
      { name: 'Norwich', size: 'ville', costMult: 0.85 },
      { name: 'Kirkwall', size: 'village', costMult: 0.72 },
    ],
  },
  {
    id: 'de', name: 'Allemagne', flag: '🇩🇪', currency: 'EUR', symbol: '€', nameSet: 'de',
    salaryIndex: 1.15, costIndex: 1.0, propertyIndex: 1.05, taxRate: 0.34, healthcare: 0.82,
    education: 0.85, crime: 0.28, justice: 0.5, lifespan: 3, openness: 0.55,
    cities: [
      { name: 'Berlin', size: 'métropole', costMult: 1.2 },
      { name: 'Munich', size: 'métropole', costMult: 1.5 },
      { name: 'Hambourg', size: 'métropole', costMult: 1.2 },
      { name: 'Cologne', size: 'ville', costMult: 1.08 },
      { name: 'Leipzig', size: 'ville', costMult: 0.85 },
      { name: 'Bautzen', size: 'village', costMult: 0.7 },
    ],
  },
  {
    id: 'es', name: 'Espagne', flag: '🇪🇸', currency: 'EUR', symbol: '€', nameSet: 'es',
    salaryIndex: 0.75, costIndex: 0.8, propertyIndex: 0.82, taxRate: 0.28, healthcare: 0.8,
    education: 0.7, crime: 0.32, justice: 0.5, lifespan: 4, openness: 0.5,
    cities: [
      { name: 'Madrid', size: 'métropole', costMult: 1.3 },
      { name: 'Barcelone', size: 'métropole', costMult: 1.35 },
      { name: 'Valence', size: 'ville', costMult: 0.95 },
      { name: 'Séville', size: 'ville', costMult: 0.88 },
      { name: 'Cáceres', size: 'village', costMult: 0.65 },
    ],
  },
  {
    id: 'it', name: 'Italie', flag: '🇮🇹', currency: 'EUR', symbol: '€', nameSet: 'it',
    salaryIndex: 0.8, costIndex: 0.88, propertyIndex: 0.9, taxRate: 0.33, healthcare: 0.78,
    education: 0.68, crime: 0.38, justice: 0.45, lifespan: 4, openness: 0.45,
    cities: [
      { name: 'Rome', size: 'métropole', costMult: 1.25 },
      { name: 'Milan', size: 'métropole', costMult: 1.45 },
      { name: 'Naples', size: 'métropole', costMult: 0.9 },
      { name: 'Turin', size: 'ville', costMult: 1.0 },
      { name: 'Matera', size: 'village', costMult: 0.62 },
    ],
  },
  {
    id: 'ca', name: 'Canada', flag: '🇨🇦', currency: 'CAD', symbol: '$', nameSet: 'en',
    salaryIndex: 1.2, costIndex: 1.08, propertyIndex: 1.2, taxRate: 0.3, healthcare: 0.9,
    education: 0.82, crime: 0.25, justice: 0.5, lifespan: 4, openness: 0.75,
    cities: [
      { name: 'Toronto', size: 'métropole', costMult: 1.5 },
      { name: 'Vancouver', size: 'métropole', costMult: 1.6 },
      { name: 'Montréal', size: 'métropole', costMult: 1.1 },
      { name: 'Québec', size: 'ville', costMult: 0.95 },
      { name: 'Moose Jaw', size: 'village', costMult: 0.68 },
    ],
  },
  {
    id: 'jp', name: 'Japon', flag: '🇯🇵', currency: 'JPY', symbol: '¥', nameSet: 'jp',
    salaryIndex: 1.05, costIndex: 1.05, propertyIndex: 1.1, taxRate: 0.31, healthcare: 0.8,
    education: 0.9, crime: 0.1, justice: 0.9, lifespan: 7, openness: 0.2,
    cities: [
      { name: 'Tokyo', size: 'métropole', costMult: 1.6 },
      { name: 'Osaka', size: 'métropole', costMult: 1.2 },
      { name: 'Kyoto', size: 'ville', costMult: 1.1 },
      { name: 'Sapporo', size: 'ville', costMult: 0.92 },
      { name: 'Takayama', size: 'village', costMult: 0.75 },
    ],
  },
  {
    id: 'kr', name: 'Corée du Sud', flag: '🇰🇷', currency: 'KRW', symbol: '₩', nameSet: 'kr',
    salaryIndex: 1.0, costIndex: 0.98, propertyIndex: 1.25, taxRate: 0.24, healthcare: 0.72,
    education: 0.92, crime: 0.15, justice: 0.7, lifespan: 6, openness: 0.25,
    cities: [
      { name: 'Séoul', size: 'métropole', costMult: 1.55 },
      { name: 'Busan', size: 'métropole', costMult: 1.05 },
      { name: 'Incheon', size: 'ville', costMult: 1.0 },
      { name: 'Jeonju', size: 'ville', costMult: 0.82 },
    ],
  },
  {
    id: 'cn', name: 'Chine', flag: '🇨🇳', currency: 'CNY', symbol: '¥', nameSet: 'cn',
    salaryIndex: 0.7, costIndex: 0.62, propertyIndex: 1.05, taxRate: 0.2, healthcare: 0.55,
    education: 0.78, crime: 0.2, justice: 0.95, lifespan: 1, openness: 0.15,
    cities: [
      { name: 'Shanghai', size: 'métropole', costMult: 1.5 },
      { name: 'Pékin', size: 'métropole', costMult: 1.45 },
      { name: 'Shenzhen', size: 'métropole', costMult: 1.4 },
      { name: 'Chengdu', size: 'métropole', costMult: 0.95 },
      { name: 'Lijiang', size: 'village', costMult: 0.55 },
    ],
  },
  {
    id: 'in', name: 'Inde', flag: '🇮🇳', currency: 'INR', symbol: '₹', nameSet: 'in',
    salaryIndex: 0.32, costIndex: 0.35, propertyIndex: 0.45, taxRate: 0.16, healthcare: 0.35,
    education: 0.55, crime: 0.45, justice: 0.5, lifespan: -6, openness: 0.4,
    cities: [
      { name: 'Bombay', size: 'métropole', costMult: 1.4 },
      { name: 'Delhi', size: 'métropole', costMult: 1.25 },
      { name: 'Bangalore', size: 'métropole', costMult: 1.2 },
      { name: 'Jaipur', size: 'ville', costMult: 0.8 },
      { name: 'Alleppey', size: 'village', costMult: 0.55 },
    ],
  },
  {
    id: 'br', name: 'Brésil', flag: '🇧🇷', currency: 'BRL', symbol: 'R$', nameSet: 'br',
    salaryIndex: 0.45, costIndex: 0.55, propertyIndex: 0.6, taxRate: 0.22, healthcare: 0.55,
    education: 0.52, crime: 0.68, justice: 0.45, lifespan: -3, openness: 0.6,
    cities: [
      { name: 'São Paulo', size: 'métropole', costMult: 1.35 },
      { name: 'Rio de Janeiro', size: 'métropole', costMult: 1.25 },
      { name: 'Brasília', size: 'métropole', costMult: 1.1 },
      { name: 'Recife', size: 'ville', costMult: 0.85 },
      { name: 'Paraty', size: 'village', costMult: 0.62 },
    ],
  },
  {
    id: 'mx', name: 'Mexique', flag: '🇲🇽', currency: 'MXN', symbol: '$', nameSet: 'es',
    salaryIndex: 0.42, costIndex: 0.5, propertyIndex: 0.55, taxRate: 0.2, healthcare: 0.45,
    education: 0.5, crime: 0.72, justice: 0.4, lifespan: -3, openness: 0.65,
    cities: [
      { name: 'Mexico', size: 'métropole', costMult: 1.2 },
      { name: 'Guadalajara', size: 'métropole', costMult: 1.0 },
      { name: 'Monterrey', size: 'métropole', costMult: 1.05 },
      { name: 'Oaxaca', size: 'ville', costMult: 0.7 },
    ],
  },
  {
    id: 'ru', name: 'Russie', flag: '🇷🇺', currency: 'RUB', symbol: '₽', nameSet: 'ru',
    salaryIndex: 0.5, costIndex: 0.55, propertyIndex: 0.62, taxRate: 0.18, healthcare: 0.6,
    education: 0.7, crime: 0.5, justice: 0.85, lifespan: -7, openness: 0.3,
    cities: [
      { name: 'Moscou', size: 'métropole', costMult: 1.35 },
      { name: 'Saint-Pétersbourg', size: 'métropole', costMult: 1.15 },
      { name: 'Novossibirsk', size: 'ville', costMult: 0.8 },
      { name: 'Irkoutsk', size: 'ville', costMult: 0.72 },
    ],
  },
  {
    id: 'se', name: 'Suède', flag: '🇸🇪', currency: 'SEK', symbol: 'kr', nameSet: 'scandi',
    salaryIndex: 1.2, costIndex: 1.12, propertyIndex: 1.1, taxRate: 0.42, healthcare: 0.95,
    education: 0.88, crime: 0.22, justice: 0.35, lifespan: 5, openness: 0.6,
    cities: [
      { name: 'Stockholm', size: 'métropole', costMult: 1.4 },
      { name: 'Göteborg', size: 'ville', costMult: 1.1 },
      { name: 'Malmö', size: 'ville', costMult: 1.0 },
      { name: 'Kiruna', size: 'village', costMult: 0.8 },
    ],
  },
  {
    id: 'no', name: 'Norvège', flag: '🇳🇴', currency: 'NOK', symbol: 'kr', nameSet: 'scandi',
    salaryIndex: 1.5, costIndex: 1.45, propertyIndex: 1.3, taxRate: 0.4, healthcare: 0.95,
    education: 0.87, crime: 0.15, justice: 0.3, lifespan: 6, openness: 0.5,
    cities: [
      { name: 'Oslo', size: 'métropole', costMult: 1.5 },
      { name: 'Bergen', size: 'ville', costMult: 1.25 },
      { name: 'Tromsø', size: 'ville', costMult: 1.15 },
    ],
  },
  {
    id: 'ma', name: 'Maroc', flag: '🇲🇦', currency: 'MAD', symbol: 'DH', nameSet: 'ar',
    salaryIndex: 0.32, costIndex: 0.42, propertyIndex: 0.5, taxRate: 0.19, healthcare: 0.4,
    education: 0.5, crime: 0.35, justice: 0.6, lifespan: -2, openness: 0.55,
    cities: [
      { name: 'Casablanca', size: 'métropole', costMult: 1.15 },
      { name: 'Rabat', size: 'ville', costMult: 1.05 },
      { name: 'Marrakech', size: 'ville', costMult: 0.95 },
      { name: 'Chefchaouen', size: 'village', costMult: 0.6 },
    ],
  },
  {
    id: 'eg', name: 'Égypte', flag: '🇪🇬', currency: 'EGP', symbol: 'E£', nameSet: 'ar',
    salaryIndex: 0.25, costIndex: 0.3, propertyIndex: 0.35, taxRate: 0.15, healthcare: 0.3,
    education: 0.45, crime: 0.4, justice: 0.75, lifespan: -6, openness: 0.4,
    cities: [
      { name: 'Le Caire', size: 'métropole', costMult: 1.2 },
      { name: 'Alexandrie', size: 'métropole', costMult: 1.0 },
      { name: 'Assouan', size: 'ville', costMult: 0.7 },
    ],
  },
  {
    id: 'ng', name: 'Nigéria', flag: '🇳🇬', currency: 'NGN', symbol: '₦', nameSet: 'af',
    salaryIndex: 0.2, costIndex: 0.3, propertyIndex: 0.32, taxRate: 0.12, healthcare: 0.2,
    education: 0.4, crime: 0.75, justice: 0.5, lifespan: -14, openness: 0.5,
    cities: [
      { name: 'Lagos', size: 'métropole', costMult: 1.3 },
      { name: 'Abuja', size: 'métropole', costMult: 1.15 },
      { name: 'Ibadan', size: 'ville', costMult: 0.85 },
    ],
  },
  {
    id: 'za', name: 'Afrique du Sud', flag: '🇿🇦', currency: 'ZAR', symbol: 'R', nameSet: 'af',
    salaryIndex: 0.42, costIndex: 0.48, propertyIndex: 0.55, taxRate: 0.26, healthcare: 0.4,
    education: 0.5, crime: 0.85, justice: 0.5, lifespan: -12, openness: 0.5,
    cities: [
      { name: 'Le Cap', size: 'métropole', costMult: 1.15 },
      { name: 'Johannesburg', size: 'métropole', costMult: 1.1 },
      { name: 'Durban', size: 'ville', costMult: 0.9 },
    ],
  },
  {
    id: 'au', name: 'Australie', flag: '🇦🇺', currency: 'AUD', symbol: '$', nameSet: 'en',
    salaryIndex: 1.3, costIndex: 1.2, propertyIndex: 1.35, taxRate: 0.3, healthcare: 0.85,
    education: 0.82, crime: 0.25, justice: 0.55, lifespan: 5, openness: 0.55,
    cities: [
      { name: 'Sydney', size: 'métropole', costMult: 1.6 },
      { name: 'Melbourne', size: 'métropole', costMult: 1.4 },
      { name: 'Brisbane', size: 'ville', costMult: 1.15 },
      { name: 'Alice Springs', size: 'village', costMult: 0.85 },
    ],
  },
  {
    id: 'ch', name: 'Suisse', flag: '🇨🇭', currency: 'CHF', symbol: 'CHF', nameSet: 'de',
    salaryIndex: 1.9, costIndex: 1.7, propertyIndex: 1.8, taxRate: 0.22, healthcare: 0.65,
    education: 0.9, crime: 0.12, justice: 0.55, lifespan: 6, openness: 0.25,
    cities: [
      { name: 'Zurich', size: 'métropole', costMult: 1.6 },
      { name: 'Genève', size: 'métropole', costMult: 1.65 },
      { name: 'Berne', size: 'ville', costMult: 1.3 },
      { name: 'Sion', size: 'village', costMult: 1.05 },
    ],
  },
  {
    id: 'ar', name: 'Argentine', flag: '🇦🇷', currency: 'ARS', symbol: '$', nameSet: 'es',
    salaryIndex: 0.35, costIndex: 0.45, propertyIndex: 0.48, taxRate: 0.24, healthcare: 0.6,
    education: 0.6, crime: 0.55, justice: 0.4, lifespan: 0, openness: 0.7,
    cities: [
      { name: 'Buenos Aires', size: 'métropole', costMult: 1.25 },
      { name: 'Córdoba', size: 'ville', costMult: 0.9 },
      { name: 'Mendoza', size: 'ville', costMult: 0.85 },
      { name: 'Ushuaia', size: 'village', costMult: 0.95 },
    ],
  },
  {
    id: 'nl', name: 'Pays-Bas', flag: '🇳🇱', currency: 'EUR', symbol: '€', nameSet: 'de',
    salaryIndex: 1.2, costIndex: 1.1, propertyIndex: 1.25, taxRate: 0.36, healthcare: 0.85,
    education: 0.85, crime: 0.25, justice: 0.4, lifespan: 4, openness: 0.6,
    cities: [
      { name: 'Amsterdam', size: 'métropole', costMult: 1.5 },
      { name: 'Rotterdam', size: 'métropole', costMult: 1.15 },
      { name: 'Utrecht', size: 'ville', costMult: 1.25 },
      { name: 'Groningue', size: 'ville', costMult: 0.95 },
    ],
  },
];

export const COUNTRY_MAP: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.id, c]),
);

export function getCountry(id: string): Country {
  return COUNTRY_MAP[id] ?? COUNTRIES[0];
}

/** Formatage monétaire dépendant du pays. */
export function formatMoney(amount: number, countryId: string): string {
  const c = getCountry(countryId);
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  let text: string;
  if (abs >= 1_000_000_000) text = `${(rounded / 1_000_000_000).toFixed(2)} Md`;
  else if (abs >= 1_000_000) text = `${(rounded / 1_000_000).toFixed(2)} M`;
  else text = rounded.toLocaleString('fr-FR');
  return `${text} ${c.symbol}`;
}
