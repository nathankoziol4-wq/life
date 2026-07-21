/**
 * Pays de naissance — 32 pays.
 * Chaque pays émet des modificateurs META réels : espérance de vie, revenu,
 * coût des études, qualité de santé, exposition à la criminalité. Ces valeurs
 * s'inspirent librement d'indicateurs réels mais restent des choix de game design.
 */
import type { Country } from "../types";

/** Fabrique un pays en réduisant la verbosité des modificateurs. */
function country(
  id: string,
  label: string,
  icon: string,
  region: string,
  language: string,
  m: {
    life: number;
    income: number; // multiplicateur (1 = médian mondial)
    eduCost: number; // multiplicateur coût études
    health: number; // 0–100
    crime: number; // 0–100
    money: number; // argent de départ médian
  },
  tags: string[] = []
): Country {
  const src = `Pays : ${label}`;
  return {
    id,
    label,
    icon,
    region,
    language,
    description: `${region} · espérance ${m.life} ans · santé ${m.health}/100`,
    tags: ["country:" + id, "region:" + region.toLowerCase(), ...tags],
    modifiers: [
      { target: "lifeExpectancy", op: "set", value: m.life, label: "Espérance de vie", source: src },
      { target: "incomeMultiplier", op: "mult", value: m.income, label: "Revenu médian", source: src },
      { target: "educationCostMultiplier", op: "mult", value: m.eduCost, label: "Coût des études", source: src },
      { target: "healthcareQuality", op: "set", value: m.health, label: "Santé publique", source: src },
      { target: "crimeExposure", op: "set", value: m.crime, label: "Criminalité", source: src },
      { target: "startingMoney", op: "add", value: m.money, label: "Argent de départ", source: src },
    ],
  };
}

export const COUNTRIES: Country[] = [
  country("fr", "France", "🇫🇷", "Europe", "Français", { life: 82, income: 1.8, eduCost: 0.4, health: 88, crime: 32, money: 3000 }),
  country("de", "Allemagne", "🇩🇪", "Europe", "Allemand", { life: 81, income: 2.0, eduCost: 0.2, health: 90, crime: 28, money: 3500 }),
  country("ch", "Suisse", "🇨🇭", "Europe", "Allemand", { life: 84, income: 3.0, eduCost: 0.6, health: 95, crime: 18, money: 8000 }, ["wealthy_nation"]),
  country("no", "Norvège", "🇳🇴", "Europe", "Norvégien", { life: 83, income: 2.8, eduCost: 0.1, health: 94, crime: 20, money: 6000 }, ["wealthy_nation"]),
  country("uk", "Royaume-Uni", "🇬🇧", "Europe", "Anglais", { life: 81, income: 2.0, eduCost: 1.4, health: 80, crime: 40, money: 3200 }),
  country("es", "Espagne", "🇪🇸", "Europe", "Espagnol", { life: 83, income: 1.4, eduCost: 0.5, health: 86, crime: 34, money: 2200 }),
  country("it", "Italie", "🇮🇹", "Europe", "Italien", { life: 83, income: 1.4, eduCost: 0.6, health: 84, crime: 42, money: 2400 }),
  country("pl", "Pologne", "🇵🇱", "Europe", "Polonais", { life: 78, income: 1.1, eduCost: 0.4, health: 76, crime: 30, money: 1500 }),
  country("ru", "Russie", "🇷🇺", "Europe", "Russe", { life: 72, income: 1.0, eduCost: 0.5, health: 62, crime: 58, money: 1200 }, ["authoritarian"]),
  country("us", "États-Unis", "🇺🇸", "Amérique", "Anglais", { life: 78, income: 2.6, eduCost: 3.0, health: 70, crime: 55, money: 4000 }, ["opportunity", "high_inequality"]),
  country("ca", "Canada", "🇨🇦", "Amérique", "Anglais", { life: 82, income: 2.2, eduCost: 1.2, health: 88, crime: 30, money: 3500 }),
  country("mx", "Mexique", "🇲🇽", "Amérique", "Espagnol", { life: 75, income: 0.8, eduCost: 0.9, health: 66, crime: 68, money: 900 }, ["cartel_exposure"]),
  country("br", "Brésil", "🇧🇷", "Amérique", "Portugais", { life: 75, income: 0.8, eduCost: 0.9, health: 68, crime: 70, money: 800 }, ["favela"]),
  country("ar", "Argentine", "🇦🇷", "Amérique", "Espagnol", { life: 77, income: 0.9, eduCost: 0.4, health: 74, crime: 52, money: 1000 }, ["economic_instability"]),
  country("jp", "Japon", "🇯🇵", "Asie", "Japonais", { life: 85, income: 2.1, eduCost: 1.1, health: 92, crime: 14, money: 3500 }, ["aging_society", "high_pressure"]),
  country("kr", "Corée du Sud", "🇰🇷", "Asie", "Coréen", { life: 84, income: 2.0, eduCost: 2.2, health: 90, crime: 22, money: 3200 }, ["high_pressure", "hyper_competitive"]),
  country("cn", "Chine", "🇨🇳", "Asie", "Mandarin", { life: 78, income: 1.2, eduCost: 1.3, health: 76, crime: 26, money: 1400 }, ["authoritarian", "hyper_competitive"]),
  country("in", "Inde", "🇮🇳", "Asie", "Hindi", { life: 70, income: 0.5, eduCost: 0.6, health: 55, crime: 48, money: 400 }, ["caste_dynamics", "megacity"]),
  country("id", "Indonésie", "🇮🇩", "Asie", "Indonésien", { life: 72, income: 0.6, eduCost: 0.7, health: 60, crime: 40, money: 500 }),
  country("th", "Thaïlande", "🇹🇭", "Asie", "Thaï", { life: 77, income: 0.9, eduCost: 0.7, health: 72, crime: 36, money: 900 }),
  country("ae", "Émirats arabes unis", "🇦🇪", "Moyen-Orient", "Arabe", { life: 79, income: 2.4, eduCost: 1.5, health: 84, crime: 12, money: 5000 }, ["oil_wealth", "authoritarian"]),
  country("sa", "Arabie saoudite", "🇸🇦", "Moyen-Orient", "Arabe", { life: 76, income: 2.0, eduCost: 1.0, health: 78, crime: 20, money: 3500 }, ["oil_wealth", "conservative"]),
  country("tr", "Turquie", "🇹🇷", "Moyen-Orient", "Turc", { life: 78, income: 1.0, eduCost: 0.6, health: 72, crime: 34, money: 1100 }),
  country("il", "Israël", "🇮🇱", "Moyen-Orient", "Hébreu", { life: 83, income: 1.9, eduCost: 1.0, health: 86, crime: 30, money: 2800 }, ["conscription", "conflict_zone"]),
  country("ng", "Nigéria", "🇳🇬", "Afrique", "Anglais", { life: 55, income: 0.4, eduCost: 0.8, health: 38, crime: 62, money: 250 }, ["megacity", "informal_economy"]),
  country("za", "Afrique du Sud", "🇿🇦", "Afrique", "Anglais", { life: 64, income: 0.9, eduCost: 0.9, health: 54, crime: 78, money: 700 }, ["high_inequality"]),
  country("ke", "Kenya", "🇰🇪", "Afrique", "Swahili", { life: 66, income: 0.5, eduCost: 0.7, health: 48, crime: 50, money: 300 }),
  country("eg", "Égypte", "🇪🇬", "Afrique", "Arabe", { life: 72, income: 0.6, eduCost: 0.5, health: 60, crime: 40, money: 500 }),
  country("et", "Éthiopie", "🇪🇹", "Afrique", "Amharique", { life: 65, income: 0.3, eduCost: 0.6, health: 40, crime: 34, money: 150 }, ["rural"]),
  country("au", "Australie", "🇦🇺", "Océanie", "Anglais", { life: 83, income: 2.4, eduCost: 1.6, health: 88, crime: 28, money: 4000 }),
  country("nz", "Nouvelle-Zélande", "🇳🇿", "Océanie", "Anglais", { life: 82, income: 2.0, eduCost: 1.3, health: 86, crime: 26, money: 3200 }),
  country("se", "Suède", "🇸🇪", "Europe", "Suédois", { life: 83, income: 2.4, eduCost: 0.1, health: 92, crime: 30, money: 4500 }, ["wealthy_nation"]),
];

export const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
