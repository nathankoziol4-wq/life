/**
 * Carrières — échelons de base par voie. Extensible : ajouter une entrée suffit.
 * Chaque voie a un `requires` léger (stat/éducation) et une grille de niveaux.
 */
export interface CareerLevel {
  title: string;
  salary: number; // annuel de base (avant multiplicateur pays)
}

export interface Career {
  id: string;
  label: string;
  icon: string;
  field: "salariat" | "entrepreneuriat" | "crime" | "politique" | "art" | "sport" | "celebrite";
  /** Stat clé qui conditionne la progression. */
  keyStat: "intelligence" | "charisme" | "physique" | "creativite" | "discipline";
  /** Niveau d'éducation minimum (0–5). */
  minEducation: number;
  /** Tag requis dans la mémoire/création (optionnel). */
  requiresTag?: string;
  levels: CareerLevel[];
  risk: number; // 0–100 : risque d'événement négatif (prison, faillite, blessure)
}

export const CAREERS: Career[] = [
  { id: "medecine", label: "Médecine", icon: "🩺", field: "salariat", keyStat: "intelligence", minEducation: 5, levels: [
    { title: "Interne", salary: 30000 }, { title: "Médecin", salary: 80000 }, { title: "Spécialiste", salary: 140000 }, { title: "Chef de service", salary: 220000 },
  ], risk: 5 },
  { id: "ingenierie", label: "Ingénierie", icon: "⚙️", field: "salariat", keyStat: "intelligence", minEducation: 4, levels: [
    { title: "Ingénieur junior", salary: 38000 }, { title: "Ingénieur", salary: 55000 }, { title: "Lead", salary: 85000 }, { title: "Directeur technique", salary: 150000 },
  ], risk: 5 },
  { id: "commerce", label: "Commerce / Vente", icon: "🛍️", field: "salariat", keyStat: "charisme", minEducation: 2, levels: [
    { title: "Vendeur", salary: 22000 }, { title: "Commercial", salary: 40000 }, { title: "Responsable des ventes", salary: 70000 }, { title: "Directeur commercial", salary: 120000 },
  ], risk: 8 },
  { id: "ouvrier", label: "Métier manuel", icon: "🔧", field: "salariat", keyStat: "physique", minEducation: 1, levels: [
    { title: "Apprenti", salary: 18000 }, { title: "Ouvrier qualifié", salary: 30000 }, { title: "Chef d'équipe", salary: 45000 }, { title: "Artisan à son compte", salary: 70000 },
  ], risk: 20 },
  { id: "startup", label: "Entrepreneuriat", icon: "🚀", field: "entrepreneuriat", keyStat: "discipline", minEducation: 0, levels: [
    { title: "Fondateur fauché", salary: 0 }, { title: "Startup en croissance", salary: 60000 }, { title: "PME rentable", salary: 200000 }, { title: "Empire", salary: 1000000 },
  ], risk: 45 },
  { id: "crime_org", label: "Crime organisé", icon: "🕶️", field: "crime", keyStat: "charisme", minEducation: 0, requiresTag: "crime_temptation", levels: [
    { title: "Petite main", salary: 25000 }, { title: "Homme de main", salary: 80000 }, { title: "Lieutenant", salary: 250000 }, { title: "Parrain", salary: 900000 },
  ], risk: 75 },
  { id: "politique", label: "Politique", icon: "🏛️", field: "politique", keyStat: "charisme", minEducation: 4, levels: [
    { title: "Militant", salary: 20000 }, { title: "Élu local", salary: 55000 }, { title: "Député", salary: 90000 }, { title: "Ministre", salary: 180000 },
  ], risk: 30 },
  { id: "art", label: "Artiste", icon: "🎨", field: "art", keyStat: "creativite", minEducation: 0, levels: [
    { title: "Artiste amateur", salary: 8000 }, { title: "Artiste reconnu", salary: 40000 }, { title: "Artiste coté", salary: 150000 }, { title: "Légende", salary: 600000 },
  ], risk: 35 },
  { id: "sport_pro", label: "Sport pro", icon: "⚽", field: "sport", keyStat: "physique", minEducation: 0, requiresTag: "talent:sport", levels: [
    { title: "Espoir", salary: 20000 }, { title: "Pro", salary: 120000 }, { title: "Star", salary: 800000 }, { title: "Icône mondiale", salary: 5000000 },
  ], risk: 40 },
];

export const CAREER_BY_ID = Object.fromEntries(CAREERS.map((c) => [c.id, c]));
