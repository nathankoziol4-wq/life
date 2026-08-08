/**
 * Catalogue des maladies et problèmes de santé.
 *
 * `rarity`   : poids relatif de tirage (plus élevé = plus fréquent)
 * `severity` : gravité 0-100, impacte la santé annuelle
 * `mortality`: mortalité annuelle additionnelle si non traité (0-1)
 * `cure`     : chance de guérison annuelle de base si traité
 * `cost`     : coût du traitement, avant prise en charge du pays
 * `chronic`  : ne guérit jamais complètement, seulement stabilisée
 */

export interface Disease {
  id: string;
  name: string;
  emoji: string;
  category: 'infection' | 'chronique' | 'mentale' | 'cardio' | 'cancer' | 'blessure' | 'neuro' | 'autre';
  rarity: number;
  severity: number;
  mortality: number;
  cure: number;
  cost: number;
  chronic: boolean;
  minAge: number;
  maxAge: number;
  symptoms: string[];
  treatment: string;
  /** Statistiques affectées chaque année tant que la maladie est active. */
  effects: Partial<Record<'health' | 'happiness' | 'fitness' | 'looks' | 'intelligence' | 'stress' | 'fertility', number>>;
}

export const DISEASES: Disease[] = [
  { id: 'flu', name: 'Grippe saisonnière', emoji: '🤧', category: 'infection', rarity: 100, severity: 12, mortality: 0.002, cure: 0.95, cost: 60, chronic: false, minAge: 0, maxAge: 120, symptoms: ['fièvre', 'courbatures', 'fatigue'], treatment: 'Repos et antipyrétiques', effects: { health: -3, happiness: -3 } },
  { id: 'cold', name: 'Rhume tenace', emoji: '🤒', category: 'infection', rarity: 90, severity: 6, mortality: 0, cure: 0.97, cost: 25, chronic: false, minAge: 0, maxAge: 120, symptoms: ['nez bouché', 'toux'], treatment: 'Repos', effects: { health: -1, happiness: -2 } },
  { id: 'gastro', name: 'Gastro-entérite', emoji: '🤢', category: 'infection', rarity: 70, severity: 14, mortality: 0.002, cure: 0.94, cost: 90, chronic: false, minAge: 0, maxAge: 120, symptoms: ['nausées', 'déshydratation'], treatment: 'Réhydratation', effects: { health: -4, happiness: -4, fitness: -3 } },
  { id: 'mono', name: 'Mononucléose', emoji: '😴', category: 'infection', rarity: 30, severity: 22, mortality: 0.001, cure: 0.8, cost: 220, chronic: false, minAge: 12, maxAge: 35, symptoms: ['fatigue extrême', 'ganglions'], treatment: 'Repos prolongé', effects: { health: -6, fitness: -8, happiness: -6 } },
  { id: 'pneumonia', name: 'Pneumonie', emoji: '🫁', category: 'infection', rarity: 35, severity: 45, mortality: 0.035, cure: 0.85, cost: 2600, chronic: false, minAge: 0, maxAge: 120, symptoms: ['toux grasse', 'essoufflement', 'fièvre'], treatment: 'Antibiotiques, parfois hospitalisation', effects: { health: -12, fitness: -10, happiness: -8 } },
  { id: 'tuberculosis', name: 'Tuberculose', emoji: '🫁', category: 'infection', rarity: 8, severity: 62, mortality: 0.09, cure: 0.7, cost: 5400, chronic: false, minAge: 5, maxAge: 120, symptoms: ['toux persistante', 'amaigrissement'], treatment: 'Antibiothérapie longue', effects: { health: -16, fitness: -14, looks: -5 } },
  { id: 'meningitis', name: 'Méningite', emoji: '🧠', category: 'infection', rarity: 5, severity: 78, mortality: 0.2, cure: 0.72, cost: 9500, chronic: false, minAge: 0, maxAge: 60, symptoms: ['raideur de la nuque', 'photophobie'], treatment: 'Hospitalisation d’urgence', effects: { health: -22, intelligence: -4, happiness: -12 } },
  { id: 'hepatitis', name: 'Hépatite', emoji: '🫀', category: 'chronique', rarity: 14, severity: 52, mortality: 0.04, cure: 0.55, cost: 6800, chronic: false, minAge: 10, maxAge: 120, symptoms: ['jaunisse', 'fatigue'], treatment: 'Traitement antiviral', effects: { health: -12, fitness: -8 } },
  { id: 'lyme', name: 'Maladie de Lyme', emoji: '🕷️', category: 'chronique', rarity: 12, severity: 38, mortality: 0.005, cure: 0.6, cost: 1800, chronic: false, minAge: 3, maxAge: 120, symptoms: ['douleurs articulaires', 'fatigue chronique'], treatment: 'Antibiotiques prolongés', effects: { health: -8, fitness: -8, happiness: -6 } },

  { id: 'asthma', name: 'Asthme', emoji: '💨', category: 'chronique', rarity: 45, severity: 28, mortality: 0.004, cure: 0.15, cost: 380, chronic: true, minAge: 1, maxAge: 40, symptoms: ['sifflements', 'essoufflement'], treatment: 'Bronchodilatateurs au long cours', effects: { health: -3, fitness: -6 } },
  { id: 'diabetes', name: 'Diabète de type 2', emoji: '🩸', category: 'chronique', rarity: 42, severity: 45, mortality: 0.015, cure: 0.08, cost: 1450, chronic: true, minAge: 30, maxAge: 120, symptoms: ['soif intense', 'fatigue'], treatment: 'Traitement à vie et régime', effects: { health: -6, fitness: -5, happiness: -3 } },
  { id: 'diabetes1', name: 'Diabète de type 1', emoji: '💉', category: 'chronique', rarity: 12, severity: 50, mortality: 0.012, cure: 0, cost: 2200, chronic: true, minAge: 2, maxAge: 30, symptoms: ['hyperglycémie', 'fatigue'], treatment: 'Insulinothérapie à vie', effects: { health: -6, happiness: -4 } },
  { id: 'hypertension', name: 'Hypertension', emoji: '🩺', category: 'cardio', rarity: 55, severity: 32, mortality: 0.012, cure: 0.12, cost: 620, chronic: true, minAge: 35, maxAge: 120, symptoms: ['maux de tête', 'vertiges'], treatment: 'Antihypertenseurs', effects: { health: -4, stress: 3 } },
  { id: 'arthritis', name: 'Arthrose', emoji: '🦴', category: 'chronique', rarity: 50, severity: 30, mortality: 0.001, cure: 0.05, cost: 780, chronic: true, minAge: 45, maxAge: 120, symptoms: ['douleurs articulaires', 'raideur'], treatment: 'Anti-inflammatoires et kinésithérapie', effects: { fitness: -7, happiness: -4 } },
  { id: 'migraine', name: 'Migraines chroniques', emoji: '😖', category: 'neuro', rarity: 40, severity: 20, mortality: 0, cure: 0.2, cost: 420, chronic: true, minAge: 10, maxAge: 120, symptoms: ['céphalées', 'nausées'], treatment: 'Traitement de fond', effects: { happiness: -5, stress: 4 } },
  { id: 'ibs', name: 'Syndrome digestif chronique', emoji: '🥴', category: 'chronique', rarity: 30, severity: 22, mortality: 0, cure: 0.18, cost: 520, chronic: true, minAge: 15, maxAge: 120, symptoms: ['douleurs abdominales'], treatment: 'Régime et suivi', effects: { happiness: -4, fitness: -3 } },
  { id: 'obesity', name: 'Obésité', emoji: '⚖️', category: 'chronique', rarity: 35, severity: 38, mortality: 0.01, cure: 0.22, cost: 900, chronic: false, minAge: 8, maxAge: 120, symptoms: ['essoufflement', 'douleurs articulaires'], treatment: 'Suivi nutritionnel et activité physique', effects: { health: -5, fitness: -9, looks: -6 } },

  { id: 'heartattack', name: 'Infarctus', emoji: '💔', category: 'cardio', rarity: 22, severity: 82, mortality: 0.22, cure: 0.65, cost: 24000, chronic: false, minAge: 35, maxAge: 120, symptoms: ['douleur thoracique', 'sueurs'], treatment: 'Angioplastie et suivi cardiologique', effects: { health: -24, fitness: -14, stress: 8 } },
  { id: 'stroke', name: 'Accident vasculaire cérébral', emoji: '🧠', category: 'cardio', rarity: 18, severity: 85, mortality: 0.26, cure: 0.5, cost: 28000, chronic: false, minAge: 40, maxAge: 120, symptoms: ['paralysie', 'troubles de la parole'], treatment: 'Hospitalisation et rééducation', effects: { health: -26, intelligence: -6, fitness: -18 } },
  { id: 'arrhythmia', name: 'Arythmie cardiaque', emoji: '💓', category: 'cardio', rarity: 24, severity: 44, mortality: 0.02, cure: 0.35, cost: 5200, chronic: true, minAge: 25, maxAge: 120, symptoms: ['palpitations'], treatment: 'Traitement médicamenteux ou ablation', effects: { health: -7, fitness: -6 } },
  { id: 'heartfailure', name: 'Insuffisance cardiaque', emoji: '🫀', category: 'cardio', rarity: 16, severity: 70, mortality: 0.11, cure: 0.1, cost: 12000, chronic: true, minAge: 50, maxAge: 120, symptoms: ['œdèmes', 'essoufflement'], treatment: 'Traitement à vie', effects: { health: -14, fitness: -14 } },

  { id: 'cancer_skin', name: 'Cancer de la peau', emoji: '🎗️', category: 'cancer', rarity: 20, severity: 60, mortality: 0.07, cure: 0.72, cost: 16000, chronic: false, minAge: 25, maxAge: 120, symptoms: ['lésion suspecte'], treatment: 'Exérèse chirurgicale', effects: { health: -12, looks: -6, happiness: -12 } },
  { id: 'cancer_lung', name: 'Cancer du poumon', emoji: '🎗️', category: 'cancer', rarity: 16, severity: 88, mortality: 0.3, cure: 0.32, cost: 42000, chronic: false, minAge: 35, maxAge: 120, symptoms: ['toux persistante', 'amaigrissement'], treatment: 'Chimiothérapie et chirurgie', effects: { health: -26, fitness: -18, happiness: -18 } },
  { id: 'cancer_breast', name: 'Cancer du sein', emoji: '🎗️', category: 'cancer', rarity: 18, severity: 72, mortality: 0.13, cure: 0.68, cost: 34000, chronic: false, minAge: 25, maxAge: 120, symptoms: ['masse palpable'], treatment: 'Chirurgie, chimiothérapie', effects: { health: -18, happiness: -16, fitness: -10 } },
  { id: 'cancer_colon', name: 'Cancer colorectal', emoji: '🎗️', category: 'cancer', rarity: 14, severity: 78, mortality: 0.2, cure: 0.5, cost: 38000, chronic: false, minAge: 40, maxAge: 120, symptoms: ['troubles digestifs', 'amaigrissement'], treatment: 'Chirurgie et chimiothérapie', effects: { health: -22, fitness: -14, happiness: -16 } },
  { id: 'leukemia', name: 'Leucémie', emoji: '🎗️', category: 'cancer', rarity: 8, severity: 85, mortality: 0.25, cure: 0.45, cost: 56000, chronic: false, minAge: 0, maxAge: 120, symptoms: ['fatigue', 'infections répétées'], treatment: 'Chimiothérapie, greffe', effects: { health: -26, fitness: -20, happiness: -18 } },

  { id: 'depression', name: 'Dépression', emoji: '🌧️', category: 'mentale', rarity: 60, severity: 42, mortality: 0.008, cure: 0.45, cost: 1600, chronic: false, minAge: 10, maxAge: 120, symptoms: ['tristesse persistante', 'perte d’intérêt'], treatment: 'Psychothérapie et suivi médical', effects: { happiness: -14, fitness: -5, health: -3, stress: 8 } },
  { id: 'anxiety', name: 'Trouble anxieux', emoji: '😰', category: 'mentale', rarity: 55, severity: 32, mortality: 0.001, cure: 0.5, cost: 1100, chronic: false, minAge: 8, maxAge: 120, symptoms: ['inquiétude constante', 'palpitations'], treatment: 'Thérapie cognitive', effects: { happiness: -8, stress: 12 } },
  { id: 'bipolar', name: 'Trouble bipolaire', emoji: '🎭', category: 'mentale', rarity: 14, severity: 55, mortality: 0.008, cure: 0.12, cost: 2900, chronic: true, minAge: 15, maxAge: 120, symptoms: ['alternance d’épisodes'], treatment: 'Stabilisateurs de l’humeur', effects: { happiness: -8, stress: 8, discipline: -4 } as Disease['effects'] },
  { id: 'insomnia', name: 'Insomnie chronique', emoji: '🌙', category: 'mentale', rarity: 45, severity: 24, mortality: 0.001, cure: 0.4, cost: 480, chronic: false, minAge: 12, maxAge: 120, symptoms: ['sommeil fragmenté'], treatment: 'Hygiène du sommeil, thérapie', effects: { happiness: -5, health: -3, stress: 8, intelligence: -2 } },
  { id: 'burnout', name: 'Épuisement professionnel', emoji: '🔥', category: 'mentale', rarity: 30, severity: 45, mortality: 0.002, cure: 0.55, cost: 1900, chronic: false, minAge: 20, maxAge: 70, symptoms: ['épuisement', 'cynisme'], treatment: 'Arrêt de travail et suivi', effects: { happiness: -12, stress: 16, health: -5 } },
  { id: 'eating', name: 'Trouble alimentaire', emoji: '🍽️', category: 'mentale', rarity: 18, severity: 52, mortality: 0.02, cure: 0.4, cost: 3400, chronic: false, minAge: 11, maxAge: 45, symptoms: ['rapport perturbé à l’alimentation'], treatment: 'Prise en charge pluridisciplinaire', effects: { health: -10, looks: -5, happiness: -10 } },
  { id: 'ptsd', name: 'Stress post-traumatique', emoji: '⚡', category: 'mentale', rarity: 12, severity: 50, mortality: 0.004, cure: 0.35, cost: 2800, chronic: false, minAge: 6, maxAge: 120, symptoms: ['reviviscences', 'hypervigilance'], treatment: 'Thérapie spécialisée', effects: { happiness: -12, stress: 15 } },

  { id: 'alzheimer', name: 'Maladie d’Alzheimer', emoji: '🧩', category: 'neuro', rarity: 22, severity: 80, mortality: 0.12, cure: 0.02, cost: 14000, chronic: true, minAge: 62, maxAge: 120, symptoms: ['pertes de mémoire', 'désorientation'], treatment: 'Accompagnement, aucun traitement curatif', effects: { intelligence: -8, happiness: -8, health: -6 } },
  { id: 'parkinson', name: 'Maladie de Parkinson', emoji: '🤲', category: 'neuro', rarity: 15, severity: 68, mortality: 0.06, cure: 0.03, cost: 9800, chronic: true, minAge: 50, maxAge: 120, symptoms: ['tremblements', 'lenteur'], treatment: 'Traitement dopaminergique', effects: { fitness: -12, health: -8, happiness: -6 } },
  { id: 'epilepsy', name: 'Épilepsie', emoji: '⚡', category: 'neuro', rarity: 14, severity: 42, mortality: 0.01, cure: 0.2, cost: 2400, chronic: true, minAge: 1, maxAge: 120, symptoms: ['crises convulsives'], treatment: 'Antiépileptiques', effects: { health: -5, happiness: -5 } },
  { id: 'ms', name: 'Sclérose en plaques', emoji: '🌀', category: 'neuro', rarity: 8, severity: 65, mortality: 0.03, cure: 0.05, cost: 18000, chronic: true, minAge: 20, maxAge: 60, symptoms: ['troubles moteurs', 'fatigue'], treatment: 'Immunomodulateurs', effects: { fitness: -12, health: -8, happiness: -8 } },

  { id: 'fracture', name: 'Fracture', emoji: '🦴', category: 'blessure', rarity: 55, severity: 30, mortality: 0.002, cure: 0.92, cost: 1600, chronic: false, minAge: 2, maxAge: 120, symptoms: ['douleur vive', 'immobilisation'], treatment: 'Immobilisation, parfois chirurgie', effects: { fitness: -12, happiness: -6 } },
  { id: 'concussion', name: 'Traumatisme crânien', emoji: '🤕', category: 'blessure', rarity: 25, severity: 45, mortality: 0.02, cure: 0.85, cost: 3200, chronic: false, minAge: 2, maxAge: 120, symptoms: ['confusion', 'maux de tête'], treatment: 'Surveillance neurologique', effects: { intelligence: -3, health: -8, happiness: -5 } },
  { id: 'backinjury', name: 'Lombalgie chronique', emoji: '🪑', category: 'blessure', rarity: 40, severity: 28, mortality: 0, cure: 0.25, cost: 1200, chronic: true, minAge: 25, maxAge: 120, symptoms: ['douleurs lombaires'], treatment: 'Kinésithérapie', effects: { fitness: -8, happiness: -4 } },
  { id: 'burn', name: 'Brûlure grave', emoji: '🔥', category: 'blessure', rarity: 9, severity: 62, mortality: 0.06, cure: 0.75, cost: 15000, chronic: false, minAge: 0, maxAge: 120, symptoms: ['lésions cutanées'], treatment: 'Greffes et soins prolongés', effects: { looks: -14, health: -14, happiness: -12 } },
  { id: 'spinal', name: 'Lésion médullaire', emoji: '♿', category: 'blessure', rarity: 4, severity: 88, mortality: 0.07, cure: 0.06, cost: 45000, chronic: true, minAge: 5, maxAge: 120, symptoms: ['perte de mobilité'], treatment: 'Rééducation intensive', effects: { fitness: -35, health: -14, happiness: -18 } },

  { id: 'alcoholism', name: 'Alcoolo-dépendance', emoji: '🍺', category: 'autre', rarity: 25, severity: 55, mortality: 0.03, cure: 0.35, cost: 3200, chronic: false, minAge: 16, maxAge: 120, symptoms: ['perte de contrôle', 'sevrage'], treatment: 'Cure de désintoxication', effects: { health: -10, happiness: -6, looks: -5, discipline: -6 } as Disease['effects'] },
  { id: 'gambling', name: 'Addiction au jeu', emoji: '🎰', category: 'autre', rarity: 16, severity: 45, mortality: 0.004, cure: 0.4, cost: 2400, chronic: false, minAge: 18, maxAge: 120, symptoms: ['pertes financières répétées'], treatment: 'Suivi addictologique', effects: { happiness: -8, stress: 10 } },
  { id: 'cataract', name: 'Cataracte', emoji: '👁️', category: 'autre', rarity: 30, severity: 26, mortality: 0, cure: 0.9, cost: 2600, chronic: false, minAge: 55, maxAge: 120, symptoms: ['vision trouble'], treatment: 'Chirurgie ambulatoire', effects: { happiness: -4, looks: -2 } },
  { id: 'hearingloss', name: 'Perte auditive', emoji: '👂', category: 'autre', rarity: 28, severity: 24, mortality: 0, cure: 0.15, cost: 2200, chronic: true, minAge: 40, maxAge: 120, symptoms: ['difficultés de compréhension'], treatment: 'Appareillage auditif', effects: { happiness: -5 } },
  { id: 'kidney', name: 'Insuffisance rénale', emoji: '🫘', category: 'autre', rarity: 12, severity: 74, mortality: 0.12, cure: 0.18, cost: 26000, chronic: true, minAge: 30, maxAge: 120, symptoms: ['œdèmes', 'fatigue'], treatment: 'Dialyse ou greffe', effects: { health: -18, fitness: -12, happiness: -10 } },
  { id: 'osteoporosis', name: 'Ostéoporose', emoji: '🦴', category: 'chronique', rarity: 26, severity: 34, mortality: 0.006, cure: 0.1, cost: 1400, chronic: true, minAge: 55, maxAge: 120, symptoms: ['fragilité osseuse'], treatment: 'Traitement osseux et vitamine D', effects: { fitness: -8, health: -4 } },
  { id: 'infertility', name: 'Infertilité', emoji: '🌱', category: 'autre', rarity: 15, severity: 20, mortality: 0, cure: 0.25, cost: 8500, chronic: false, minAge: 20, maxAge: 48, symptoms: ['difficultés à concevoir'], treatment: 'Assistance médicale à la procréation', effects: { happiness: -6, fertility: -35 } },
  { id: 'allergy', name: 'Allergies sévères', emoji: '🌼', category: 'autre', rarity: 40, severity: 18, mortality: 0.002, cure: 0.2, cost: 460, chronic: true, minAge: 1, maxAge: 120, symptoms: ['réactions cutanées', 'gêne respiratoire'], treatment: 'Désensibilisation', effects: { happiness: -3, health: -2 } },
];

export const DISEASE_MAP: Record<string, Disease> = Object.fromEntries(DISEASES.map((d) => [d.id, d]));

export function getDisease(id: string): Disease | null {
  return DISEASE_MAP[id] ?? null;
}

/** Spécialistes consultables, avec leur efficacité par catégorie. */
export const DOCTOR_TYPES = [
  { id: 'gp', name: 'Médecin généraliste', emoji: '🩺', cost: 45, quality: 0.6, categories: ['infection', 'chronique', 'autre', 'blessure'] as Disease['category'][] },
  { id: 'specialist', name: 'Spécialiste', emoji: '🥼', cost: 180, quality: 0.92, categories: ['cardio', 'cancer', 'neuro', 'chronique', 'autre'] as Disease['category'][] },
  { id: 'therapist', name: 'Psychologue', emoji: '🛋️', cost: 90, quality: 0.85, categories: ['mentale'] as Disease['category'][] },
  { id: 'er', name: 'Urgences', emoji: '🚨', cost: 620, quality: 0.8, categories: ['blessure', 'cardio', 'infection', 'neuro'] as Disease['category'][] },
];
