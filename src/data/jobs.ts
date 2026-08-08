/**
 * Base de données des métiers.
 *
 * Chaque métier décrit une échelle hiérarchique complète : le joueur entre au
 * niveau 0 et gravit les échelons via les promotions. Les salaires sont
 * exprimés dans une devise de référence, puis ajustés par le `salaryIndex` du
 * pays et l'inflation au moment de la génération de l'offre.
 *
 * Ajouter un métier = ajouter une entrée. Le moteur n'a pas besoin d'être
 * modifié (cf. cahier des charges §29).
 */

import type { EducationLevel } from '../engine/types.ts';

export interface JobLevel {
  title: string;
  salary: number;
}

export interface JobDef {
  id: string;
  name: string;
  category: string;
  emoji: string;
  levels: JobLevel[];
  requiresLevel: EducationLevel;
  /** Filières acceptées, ou `null` si indifférent. */
  requiresMajors: string[] | null;
  /** Formation professionnelle requise (id de VocationalCourse). */
  requiresCourse?: string;
  minAge: number;
  /** Années d'expérience professionnelle totales exigées à l'entrée. */
  minExperience: number;
  /** Stress annuel infligé (0-100). */
  stress: number;
  /** Heures hebdomadaires. */
  hours: number;
  /** Gain de réputation annuel. */
  respect: number;
  /** Métier physique : la forme compte, l'âge pénalise. */
  physical: boolean;
  /** Métier interdit avec un casier judiciaire. */
  noRecord?: boolean;
}

/** Raccourci de construction : `lvl('Stagiaire', 12000)`. */
const L = (title: string, salary: number): JobLevel => ({ title, salary });

export const JOBS: JobDef[] = [
  /* ---------------- Petits boulots (adolescence) ---------------- */
  {
    id: 'babysitter', name: 'Baby-sitting', category: 'Petits boulots', emoji: '🍼',
    levels: [L('Baby-sitter occasionnel', 3200), L('Baby-sitter régulier', 5400), L('Nounou à domicile', 9800)],
    requiresLevel: 0, requiresMajors: null, minAge: 14, minExperience: 0, stress: 18, hours: 12, respect: 1, physical: false,
  },
  {
    id: 'paperboy', name: 'Distribution de journaux', category: 'Petits boulots', emoji: '📰',
    levels: [L('Distributeur', 2800), L('Chef de tournée', 4600)],
    requiresLevel: 0, requiresMajors: null, minAge: 14, minExperience: 0, stress: 12, hours: 10, respect: 1, physical: true,
  },
  {
    id: 'fastfood', name: 'Restauration rapide', category: 'Petits boulots', emoji: '🍔',
    levels: [L('Équipier', 14500), L('Équipier confirmé', 17200), L('Chef d’équipe', 21500), L('Assistant manager', 27000), L('Directeur de restaurant', 38000)],
    requiresLevel: 0, requiresMajors: null, minAge: 16, minExperience: 0, stress: 42, hours: 35, respect: 2, physical: true,
  },
  {
    id: 'cashier', name: 'Caisse en supermarché', category: 'Petits boulots', emoji: '🛒',
    levels: [L('Hôte de caisse', 15200), L('Caissier principal', 18000), L('Responsable caisses', 23500), L('Chef de rayon', 30000)],
    requiresLevel: 0, requiresMajors: null, minAge: 16, minExperience: 0, stress: 35, hours: 35, respect: 2, physical: false,
  },
  {
    id: 'dogwalker', name: 'Promenade de chiens', category: 'Petits boulots', emoji: '🐕‍🦺',
    levels: [L('Promeneur', 4200), L('Pension canine à domicile', 9500), L('Gérant de garderie canine', 21000)],
    requiresLevel: 0, requiresMajors: null, minAge: 14, minExperience: 0, stress: 10, hours: 14, respect: 1, physical: true,
  },
  {
    id: 'lifeguard', name: 'Maître-nageur', category: 'Petits boulots', emoji: '🛟',
    levels: [L('Surveillant de baignade', 16000), L('Maître-nageur sauveteur', 22000), L('Chef de bassin', 29000)],
    requiresLevel: 0, requiresMajors: null, minAge: 17, minExperience: 0, stress: 30, hours: 35, respect: 4, physical: true,
  },
  {
    id: 'warehouse', name: 'Logistique d’entrepôt', category: 'Petits boulots', emoji: '📦',
    levels: [L('Manutentionnaire', 18500), L('Préparateur de commandes', 21500), L('Chef d’équipe logistique', 28000), L('Responsable d’entrepôt', 39000), L('Directeur logistique', 58000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 40, hours: 39, respect: 2, physical: true,
  },

  /* ---------------- Santé ---------------- */
  {
    id: 'doctor', name: 'Médecin', category: 'Santé', emoji: '🩺',
    levels: [L('Interne', 32000), L('Médecin généraliste', 74000), L('Médecin confirmé', 98000), L('Chef de service', 132000), L('Chef de pôle hospitalier', 168000)],
    requiresLevel: 4, requiresMajors: ['medicine'], minAge: 26, minExperience: 0, stress: 72, hours: 55, respect: 12, physical: false, noRecord: true,
  },
  {
    id: 'surgeon', name: 'Chirurgien', category: 'Santé', emoji: '🔪',
    levels: [L('Chirurgien assistant', 62000), L('Chirurgien', 118000), L('Chirurgien senior', 165000), L('Chef de bloc', 215000), L('Chirurgien de renommée', 290000)],
    requiresLevel: 4, requiresMajors: ['medicine'], minAge: 29, minExperience: 3, stress: 88, hours: 62, respect: 16, physical: false, noRecord: true,
  },
  {
    id: 'psychiatrist', name: 'Psychiatre', category: 'Santé', emoji: '🛋️',
    levels: [L('Psychiatre junior', 58000), L('Psychiatre', 92000), L('Psychiatre senior', 122000), L('Chef de service psychiatrie', 155000)],
    requiresLevel: 4, requiresMajors: ['medicine', 'psychology'], minAge: 27, minExperience: 1, stress: 62, hours: 42, respect: 11, physical: false, noRecord: true,
  },
  {
    id: 'dentist', name: 'Dentiste', category: 'Santé', emoji: '🦷',
    levels: [L('Chirurgien-dentiste assistant', 46000), L('Dentiste', 88000), L('Dentiste associé', 124000), L('Propriétaire de cabinet', 172000)],
    requiresLevel: 4, requiresMajors: ['medicine'], minAge: 26, minExperience: 0, stress: 55, hours: 40, respect: 9, physical: false, noRecord: true,
  },
  {
    id: 'nurse', name: 'Infirmier', category: 'Santé', emoji: '💉',
    levels: [L('Infirmier diplômé', 31000), L('Infirmier confirmé', 38000), L('Infirmier spécialisé', 46000), L('Cadre de santé', 58000), L('Directeur des soins', 74000)],
    requiresLevel: 3, requiresMajors: ['nursing', 'medicine'], minAge: 21, minExperience: 0, stress: 70, hours: 45, respect: 9, physical: true, noRecord: true,
  },
  {
    id: 'nurseaide', name: 'Aide-soignant', category: 'Santé', emoji: '🏥',
    levels: [L('Aide-soignant', 22000), L('Aide-soignant référent', 26000), L('Responsable d’unité', 32000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_nurse_aide', minAge: 19, minExperience: 0, stress: 58, hours: 40, respect: 6, physical: true,
  },
  {
    id: 'pharmacist', name: 'Pharmacien', category: 'Santé', emoji: '💊',
    levels: [L('Pharmacien adjoint', 44000), L('Pharmacien', 62000), L('Pharmacien titulaire', 96000), L('Propriétaire d’officine', 135000)],
    requiresLevel: 3, requiresMajors: ['medicine', 'science'], minAge: 24, minExperience: 0, stress: 42, hours: 40, respect: 8, physical: false, noRecord: true,
  },
  {
    id: 'physio', name: 'Kinésithérapeute', category: 'Santé', emoji: '🦵',
    levels: [L('Kinésithérapeute', 34000), L('Kinésithérapeute confirmé', 45000), L('Cabinet indépendant', 62000), L('Centre de rééducation', 84000)],
    requiresLevel: 3, requiresMajors: ['nursing', 'sports', 'medicine'], minAge: 22, minExperience: 0, stress: 38, hours: 38, respect: 7, physical: true,
  },
  {
    id: 'vet', name: 'Vétérinaire', category: 'Santé', emoji: '🐾',
    levels: [L('Vétérinaire assistant', 38000), L('Vétérinaire', 62000), L('Vétérinaire associé', 88000), L('Directeur de clinique', 118000)],
    requiresLevel: 4, requiresMajors: ['veterinary'], minAge: 25, minExperience: 0, stress: 52, hours: 46, respect: 9, physical: true,
  },
  {
    id: 'psychologist', name: 'Psychologue', category: 'Santé', emoji: '🧠',
    levels: [L('Psychologue stagiaire', 26000), L('Psychologue', 42000), L('Psychologue clinicien', 56000), L('Cabinet privé réputé', 82000)],
    requiresLevel: 4, requiresMajors: ['psychology'], minAge: 24, minExperience: 0, stress: 48, hours: 36, respect: 8, physical: false,
  },
  {
    id: 'paramedic', name: 'Ambulancier', category: 'Santé', emoji: '🚑',
    levels: [L('Ambulancier', 24000), L('Ambulancier SMUR', 30000), L('Chef d’équipe secours', 38000)],
    requiresLevel: 1, requiresMajors: null, minAge: 20, minExperience: 0, stress: 68, hours: 45, respect: 8, physical: true,
  },

  /* ---------------- Droit & Justice ---------------- */
  {
    id: 'lawyer', name: 'Avocat', category: 'Droit & Justice', emoji: '⚖️',
    levels: [L('Avocat collaborateur', 42000), L('Avocat', 76000), L('Avocat senior', 118000), L('Associé', 185000), L('Associé-gérant', 310000)],
    requiresLevel: 4, requiresMajors: ['law'], minAge: 24, minExperience: 0, stress: 78, hours: 55, respect: 10, physical: false, noRecord: true,
  },
  {
    id: 'judge', name: 'Magistrat', category: 'Droit & Justice', emoji: '🧑‍⚖️',
    levels: [L('Auditeur de justice', 38000), L('Juge', 68000), L('Président de chambre', 95000), L('Premier président', 128000)],
    requiresLevel: 4, requiresMajors: ['law'], minAge: 28, minExperience: 4, stress: 66, hours: 45, respect: 15, physical: false, noRecord: true,
  },
  {
    id: 'notary', name: 'Notaire', category: 'Droit & Justice', emoji: '📜',
    levels: [L('Clerc de notaire', 34000), L('Notaire assistant', 58000), L('Notaire', 105000), L('Notaire associé', 175000)],
    requiresLevel: 4, requiresMajors: ['law'], minAge: 25, minExperience: 1, stress: 48, hours: 42, respect: 9, physical: false, noRecord: true,
  },
  {
    id: 'paralegal', name: 'Assistant juridique', category: 'Droit & Justice', emoji: '🗂️',
    levels: [L('Assistant juridique', 26000), L('Juriste junior', 34000), L('Juriste', 46000), L('Responsable juridique', 64000)],
    requiresLevel: 3, requiresMajors: ['law', 'business'], minAge: 21, minExperience: 0, stress: 45, hours: 39, respect: 5, physical: false,
  },

  /* ---------------- Technologie ---------------- */
  {
    id: 'devjr', name: 'Développement logiciel', category: 'Technologie', emoji: '💻',
    levels: [L('Développeur junior', 36000), L('Développeur', 48000), L('Développeur senior', 68000), L('Lead développeur', 88000), L('Architecte logiciel', 112000), L('Directeur technique', 155000)],
    requiresLevel: 2, requiresMajors: null, minAge: 19, minExperience: 0, stress: 48, hours: 40, respect: 5, physical: false,
  },
  {
    id: 'datasci', name: 'Science des données', category: 'Technologie', emoji: '📊',
    levels: [L('Analyste de données', 40000), L('Data scientist', 58000), L('Data scientist senior', 82000), L('Lead data', 108000), L('Chief Data Officer', 148000)],
    requiresLevel: 3, requiresMajors: ['cs', 'science', 'economics', 'engineering'], minAge: 22, minExperience: 0, stress: 50, hours: 40, respect: 6, physical: false,
  },
  {
    id: 'cyber', name: 'Cybersécurité', category: 'Technologie', emoji: '🔐',
    levels: [L('Analyste SOC', 42000), L('Ingénieur sécurité', 62000), L('Consultant senior', 88000), L('Responsable sécurité', 118000), L('RSSI', 152000)],
    requiresLevel: 3, requiresMajors: ['cs', 'engineering'], minAge: 22, minExperience: 1, stress: 62, hours: 43, respect: 7, physical: false, noRecord: true,
  },
  {
    id: 'sysadmin', name: 'Administration système', category: 'Technologie', emoji: '🖥️',
    levels: [L('Technicien support', 27000), L('Administrateur système', 40000), L('Ingénieur infrastructure', 56000), L('Responsable infrastructure', 78000)],
    requiresLevel: 2, requiresMajors: null, minAge: 19, minExperience: 0, stress: 46, hours: 40, respect: 4, physical: false,
  },
  {
    id: 'gamedev', name: 'Création de jeux vidéo', category: 'Technologie', emoji: '🎮',
    levels: [L('Testeur QA', 24000), L('Développeur gameplay', 40000), L('Développeur senior', 58000), L('Directeur technique studio', 88000), L('Directeur créatif', 120000)],
    requiresLevel: 2, requiresMajors: null, minAge: 19, minExperience: 0, stress: 58, hours: 46, respect: 5, physical: false,
  },
  {
    id: 'uxdesign', name: 'Design produit', category: 'Technologie', emoji: '🎯',
    levels: [L('Designer junior', 32000), L('Designer produit', 46000), L('Designer senior', 64000), L('Head of Design', 92000)],
    requiresLevel: 2, requiresMajors: null, minAge: 20, minExperience: 0, stress: 42, hours: 39, respect: 5, physical: false,
  },
  {
    id: 'productmgr', name: 'Gestion de produit', category: 'Technologie', emoji: '🧩',
    levels: [L('Product owner junior', 42000), L('Product manager', 62000), L('Senior PM', 86000), L('Directeur produit', 122000), L('VP Produit', 168000)],
    requiresLevel: 3, requiresMajors: ['business', 'cs', 'engineering', 'economics'], minAge: 23, minExperience: 2, stress: 60, hours: 45, respect: 7, physical: false,
  },

  /* ---------------- Finance ---------------- */
  {
    id: 'banker', name: 'Banque', category: 'Finance', emoji: '🏦',
    levels: [L('Conseiller clientèle', 30000), L('Chargé d’affaires', 44000), L('Directeur d’agence', 66000), L('Directeur régional', 98000), L('Directeur de réseau', 145000)],
    requiresLevel: 3, requiresMajors: ['finance', 'economics', 'business'], minAge: 22, minExperience: 0, stress: 52, hours: 42, respect: 6, physical: false, noRecord: true,
  },
  {
    id: 'trader', name: 'Salle de marché', category: 'Finance', emoji: '📉',
    levels: [L('Analyste marchés', 52000), L('Trader junior', 88000), L('Trader', 148000), L('Trader senior', 235000), L('Responsable de desk', 380000)],
    requiresLevel: 3, requiresMajors: ['finance', 'economics', 'engineering', 'science'], minAge: 22, minExperience: 0, stress: 92, hours: 62, respect: 6, physical: false, noRecord: true,
  },
  {
    id: 'accountant', name: 'Comptabilité', category: 'Finance', emoji: '🧾',
    levels: [L('Assistant comptable', 26000), L('Comptable', 36000), L('Chef comptable', 52000), L('Expert-comptable', 78000), L('Associé cabinet', 122000)],
    requiresLevel: 2, requiresMajors: null, minAge: 20, minExperience: 0, stress: 44, hours: 40, respect: 5, physical: false, noRecord: true,
  },
  {
    id: 'auditor', name: 'Audit', category: 'Finance', emoji: '🔎',
    levels: [L('Auditeur junior', 38000), L('Auditeur', 52000), L('Manager audit', 74000), L('Directeur audit', 108000), L('Associé', 175000)],
    requiresLevel: 3, requiresMajors: ['finance', 'economics', 'business'], minAge: 22, minExperience: 0, stress: 68, hours: 52, respect: 6, physical: false, noRecord: true,
  },
  {
    id: 'insurance', name: 'Assurance', category: 'Finance', emoji: '☂️',
    levels: [L('Gestionnaire sinistres', 27000), L('Souscripteur', 38000), L('Actuaire', 62000), L('Directeur technique assurance', 95000)],
    requiresLevel: 3, requiresMajors: ['finance', 'economics', 'science', 'engineering'], minAge: 22, minExperience: 0, stress: 46, hours: 40, respect: 5, physical: false,
  },
  {
    id: 'consultant', name: 'Conseil en stratégie', category: 'Finance', emoji: '📋',
    levels: [L('Consultant junior', 48000), L('Consultant', 68000), L('Manager', 95000), L('Directeur de mission', 140000), L('Associé', 260000)],
    requiresLevel: 3, requiresMajors: ['business', 'economics', 'finance', 'engineering'], minAge: 22, minExperience: 0, stress: 82, hours: 58, respect: 8, physical: false,
  },

  /* ---------------- Commerce & Vente ---------------- */
  {
    id: 'sales', name: 'Commercial', category: 'Commerce & Vente', emoji: '🤝',
    levels: [L('Commercial junior', 28000), L('Commercial', 40000), L('Commercial grands comptes', 58000), L('Directeur commercial', 88000), L('Directeur général des ventes', 130000)],
    requiresLevel: 1, requiresMajors: null, minAge: 18, minExperience: 0, stress: 58, hours: 44, respect: 4, physical: false,
  },
  {
    id: 'retail', name: 'Commerce de détail', category: 'Commerce & Vente', emoji: '🏪',
    levels: [L('Vendeur', 19000), L('Vendeur confirmé', 23000), L('Responsable de magasin', 32000), L('Responsable de secteur', 48000), L('Directeur d’enseigne', 78000)],
    requiresLevel: 0, requiresMajors: null, minAge: 17, minExperience: 0, stress: 40, hours: 38, respect: 3, physical: true,
  },
  {
    id: 'marketing', name: 'Marketing', category: 'Commerce & Vente', emoji: '📣',
    levels: [L('Assistant marketing', 28000), L('Chargé de marketing', 40000), L('Responsable marketing', 58000), L('Directeur marketing', 92000), L('Directeur général adjoint', 135000)],
    requiresLevel: 3, requiresMajors: ['business', 'communication', 'economics'], minAge: 21, minExperience: 0, stress: 52, hours: 42, respect: 5, physical: false,
  },
  {
    id: 'hr', name: 'Ressources humaines', category: 'Commerce & Vente', emoji: '👔',
    levels: [L('Assistant RH', 26000), L('Chargé de recrutement', 35000), L('Responsable RH', 52000), L('DRH', 88000)],
    requiresLevel: 3, requiresMajors: ['business', 'psychology', 'communication', 'law'], minAge: 21, minExperience: 0, stress: 50, hours: 40, respect: 5, physical: false,
  },
  {
    id: 'entrepreneur', name: 'Entrepreneuriat', category: 'Commerce & Vente', emoji: '🚀',
    levels: [L('Auto-entrepreneur', 16000), L('Gérant de TPE', 34000), L('Dirigeant de PME', 72000), L('Chef d’entreprise', 145000), L('Magnat', 420000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 1, stress: 78, hours: 60, respect: 7, physical: false,
  },

  /* ---------------- Éducation ---------------- */
  {
    id: 'teacher', name: 'Enseignement', category: 'Éducation', emoji: '🎒',
    levels: [L('Professeur stagiaire', 25000), L('Professeur', 33000), L('Professeur certifié', 41000), L('Professeur agrégé', 52000), L('Proviseur', 68000)],
    requiresLevel: 3, requiresMajors: null, minAge: 22, minExperience: 0, stress: 60, hours: 42, respect: 8, physical: false, noRecord: true,
  },
  {
    id: 'professor', name: 'Enseignement supérieur', category: 'Éducation', emoji: '🎓',
    levels: [L('Chargé de cours', 32000), L('Maître de conférences', 48000), L('Professeur des universités', 72000), L('Doyen', 98000)],
    requiresLevel: 4, requiresMajors: null, minAge: 27, minExperience: 2, stress: 52, hours: 44, respect: 12, physical: false, noRecord: true,
  },
  {
    id: 'childcare', name: 'Petite enfance', category: 'Éducation', emoji: '🧸',
    levels: [L('Auxiliaire de puériculture', 21000), L('Éducateur de jeunes enfants', 27000), L('Directeur de crèche', 40000)],
    requiresLevel: 2, requiresMajors: null, minAge: 19, minExperience: 0, stress: 48, hours: 38, respect: 6, physical: true, noRecord: true,
  },
  {
    id: 'librarian', name: 'Bibliothèque', category: 'Éducation', emoji: '📚',
    levels: [L('Agent de bibliothèque', 22000), L('Bibliothécaire', 30000), L('Conservateur', 44000), L('Directeur de médiathèque', 58000)],
    requiresLevel: 3, requiresMajors: ['history', 'languages', 'philosophy', 'communication'], minAge: 21, minExperience: 0, stress: 24, hours: 36, respect: 5, physical: false,
  },

  /* ---------------- Arts & Spectacle ---------------- */
  {
    id: 'musician', name: 'Musicien', category: 'Arts & Spectacle', emoji: '🎸',
    levels: [L('Musicien de bar', 8000), L('Musicien de session', 22000), L('Artiste signé', 55000), L('Tête d’affiche', 180000), L('Star internationale', 900000)],
    requiresLevel: 0, requiresMajors: null, minAge: 16, minExperience: 0, stress: 55, hours: 40, respect: 6, physical: false,
  },
  {
    id: 'actor', name: 'Comédien', category: 'Arts & Spectacle', emoji: '🎭',
    levels: [L('Figurant', 7000), L('Second rôle', 24000), L('Acteur régulier', 62000), L('Tête d’affiche', 240000), L('Star de cinéma', 1200000)],
    requiresLevel: 0, requiresMajors: null, minAge: 16, minExperience: 0, stress: 58, hours: 45, respect: 6, physical: false,
  },
  {
    id: 'writer', name: 'Écrivain', category: 'Arts & Spectacle', emoji: '✍️',
    levels: [L('Auteur non publié', 4000), L('Auteur publié', 18000), L('Auteur reconnu', 48000), L('Auteur à succès', 165000), L('Auteur culte', 620000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 42, hours: 35, respect: 7, physical: false,
  },
  {
    id: 'painter', name: 'Artiste plasticien', category: 'Arts & Spectacle', emoji: '🖌️',
    levels: [L('Artiste amateur', 5000), L('Artiste exposé', 20000), L('Artiste galerie', 58000), L('Artiste coté', 210000)],
    requiresLevel: 0, requiresMajors: null, minAge: 17, minExperience: 0, stress: 38, hours: 38, respect: 5, physical: false,
  },
  {
    id: 'dancer', name: 'Danseur', category: 'Arts & Spectacle', emoji: '🩰',
    levels: [L('Danseur de corps de ballet', 19000), L('Soliste', 34000), L('Danseur étoile', 72000), L('Chorégraphe', 95000)],
    requiresLevel: 0, requiresMajors: null, minAge: 17, minExperience: 0, stress: 65, hours: 48, respect: 7, physical: true,
  },
  {
    id: 'photographer', name: 'Photographe', category: 'Arts & Spectacle', emoji: '📷',
    levels: [L('Assistant photo', 18000), L('Photographe', 30000), L('Photographe reconnu', 55000), L('Photographe de mode', 110000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 40, hours: 42, respect: 5, physical: true,
  },
  {
    id: 'chefartist', name: 'Cinéma & production', category: 'Arts & Spectacle', emoji: '🎬',
    levels: [L('Assistant de production', 22000), L('Chargé de production', 36000), L('Producteur', 68000), L('Réalisateur', 130000), L('Réalisateur primé', 420000)],
    requiresLevel: 1, requiresMajors: null, minAge: 19, minExperience: 0, stress: 68, hours: 55, respect: 8, physical: false,
  },

  /* ---------------- Sport ---------------- */
  {
    id: 'athlete', name: 'Sportif professionnel', category: 'Sport', emoji: '⚽',
    levels: [L('Espoir', 22000), L('Professionnel', 85000), L('Titulaire', 320000), L('International', 1400000), L('Superstar', 6500000)],
    requiresLevel: 0, requiresMajors: null, minAge: 17, minExperience: 0, stress: 70, hours: 45, respect: 9, physical: true,
  },
  {
    id: 'coach', name: 'Entraîneur sportif', category: 'Sport', emoji: '📣',
    levels: [L('Éducateur sportif', 22000), L('Entraîneur', 34000), L('Entraîneur principal', 62000), L('Entraîneur professionnel', 180000)],
    requiresLevel: 1, requiresMajors: null, minAge: 20, minExperience: 1, stress: 58, hours: 46, respect: 7, physical: true,
  },
  {
    id: 'trainer', name: 'Coach personnel', category: 'Sport', emoji: '🏋️',
    levels: [L('Coach débutant', 19000), L('Coach personnel', 30000), L('Coach réputé', 52000), L('Propriétaire de salle', 85000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 34, hours: 40, respect: 4, physical: true,
  },

  /* ---------------- Restauration ---------------- */
  {
    id: 'chef', name: 'Cuisinier', category: 'Restauration', emoji: '👨‍🍳',
    levels: [L('Commis de cuisine', 19500), L('Cuisinier', 26000), L('Chef de partie', 34000), L('Sous-chef', 46000), L('Chef de cuisine', 68000), L('Chef étoilé', 145000)],
    requiresLevel: 0, requiresMajors: null, minAge: 17, minExperience: 0, stress: 72, hours: 52, respect: 6, physical: true,
  },
  {
    id: 'baker', name: 'Boulanger-pâtissier', category: 'Restauration', emoji: '🥐',
    levels: [L('Apprenti boulanger', 17000), L('Boulanger', 24000), L('Chef boulanger', 33000), L('Propriétaire de boulangerie', 58000)],
    requiresLevel: 0, requiresMajors: null, minAge: 16, minExperience: 0, stress: 58, hours: 50, respect: 5, physical: true,
  },
  {
    id: 'waiter', name: 'Service en salle', category: 'Restauration', emoji: '🍽️',
    levels: [L('Serveur', 18000), L('Chef de rang', 23000), L('Maître d’hôtel', 32000), L('Directeur de salle', 46000)],
    requiresLevel: 0, requiresMajors: null, minAge: 16, minExperience: 0, stress: 48, hours: 44, respect: 3, physical: true,
  },
  {
    id: 'bartender', name: 'Barman', category: 'Restauration', emoji: '🍸',
    levels: [L('Barman', 19000), L('Barman confirmé', 25000), L('Chef barman', 34000), L('Propriétaire de bar', 62000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 46, hours: 45, respect: 3, physical: true,
  },

  /* ---------------- Transport ---------------- */
  {
    id: 'pilot', name: 'Pilote de ligne', category: 'Transport', emoji: '✈️',
    levels: [L('Copilote', 62000), L('Pilote', 105000), L('Commandant de bord', 158000), L('Chef pilote', 205000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_pilot', minAge: 21, minExperience: 0, stress: 62, hours: 42, respect: 11, physical: true, noRecord: true,
  },
  {
    id: 'trucker', name: 'Chauffeur routier', category: 'Transport', emoji: '🚛',
    levels: [L('Chauffeur régional', 26000), L('Chauffeur longue distance', 34000), L('Chauffeur international', 44000), L('Gérant de flotte', 62000)],
    requiresLevel: 1, requiresMajors: null, requiresCourse: 'voc_truck', minAge: 21, minExperience: 0, stress: 52, hours: 50, respect: 3, physical: true,
  },
  {
    id: 'taxi', name: 'Chauffeur VTC', category: 'Transport', emoji: '🚕',
    levels: [L('Chauffeur occasionnel', 17000), L('Chauffeur professionnel', 26000), L('Chauffeur haut de gamme', 38000), L('Gérant de société de VTC', 58000)],
    requiresLevel: 0, requiresMajors: null, minAge: 21, minExperience: 0, stress: 44, hours: 48, respect: 2, physical: false,
  },
  {
    id: 'traindriver', name: 'Conducteur de train', category: 'Transport', emoji: '🚆',
    levels: [L('Agent de conduite', 30000), L('Conducteur de ligne', 40000), L('Conducteur grande ligne', 52000), L('Formateur conduite', 62000)],
    requiresLevel: 1, requiresMajors: null, minAge: 21, minExperience: 0, stress: 46, hours: 40, respect: 5, physical: false, noRecord: true,
  },
  {
    id: 'sailor', name: 'Marine marchande', category: 'Transport', emoji: '🚢',
    levels: [L('Matelot', 26000), L('Officier de quart', 45000), L('Second capitaine', 72000), L('Capitaine', 105000)],
    requiresLevel: 1, requiresMajors: null, minAge: 19, minExperience: 0, stress: 58, hours: 60, respect: 7, physical: true,
  },

  /* ---------------- Bâtiment ---------------- */
  {
    id: 'mason', name: 'Maçon', category: 'Bâtiment', emoji: '🧱',
    levels: [L('Apprenti maçon', 18000), L('Maçon', 26000), L('Chef d’équipe', 34000), L('Chef de chantier', 48000), L('Entrepreneur du bâtiment', 78000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_trades', minAge: 18, minExperience: 0, stress: 45, hours: 42, respect: 3, physical: true,
  },
  {
    id: 'electrician', name: 'Électricien', category: 'Bâtiment', emoji: '⚡',
    levels: [L('Apprenti électricien', 19000), L('Électricien', 29000), L('Électricien confirmé', 38000), L('Artisan à son compte', 58000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_trades', minAge: 18, minExperience: 0, stress: 40, hours: 40, respect: 4, physical: true,
  },
  {
    id: 'plumber', name: 'Plombier', category: 'Bâtiment', emoji: '🔧',
    levels: [L('Apprenti plombier', 18500), L('Plombier', 28000), L('Plombier-chauffagiste', 37000), L('Artisan à son compte', 60000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_trades', minAge: 18, minExperience: 0, stress: 40, hours: 42, respect: 4, physical: true,
  },
  {
    id: 'carpenter', name: 'Menuisier', category: 'Bâtiment', emoji: '🪚',
    levels: [L('Apprenti menuisier', 18000), L('Menuisier', 27000), L('Ébéniste', 36000), L('Atelier indépendant', 54000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_trades', minAge: 18, minExperience: 0, stress: 36, hours: 40, respect: 4, physical: true,
  },
  {
    id: 'architect', name: 'Architecte', category: 'Bâtiment', emoji: '📐',
    levels: [L('Architecte assistant', 32000), L('Architecte', 48000), L('Architecte associé', 72000), L('Agence renommée', 125000)],
    requiresLevel: 3, requiresMajors: ['architecture'], minAge: 24, minExperience: 0, stress: 56, hours: 46, respect: 9, physical: false,
  },
  {
    id: 'civilengineer', name: 'Ingénieur travaux', category: 'Bâtiment', emoji: '🏗️',
    levels: [L('Ingénieur études', 38000), L('Ingénieur travaux', 52000), L('Directeur de travaux', 74000), L('Directeur de projet', 105000)],
    requiresLevel: 3, requiresMajors: ['engineering', 'architecture'], minAge: 23, minExperience: 0, stress: 60, hours: 47, respect: 7, physical: false,
  },

  /* ---------------- Industrie & Sciences ---------------- */
  {
    id: 'mechanic', name: 'Mécanicien', category: 'Industrie', emoji: '🔩',
    levels: [L('Apprenti mécanicien', 18000), L('Mécanicien', 26000), L('Mécanicien confirmé', 34000), L('Chef d’atelier', 46000), L('Propriétaire de garage', 70000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_mechanic', minAge: 18, minExperience: 0, stress: 40, hours: 40, respect: 3, physical: true,
  },
  {
    id: 'factory', name: 'Production industrielle', category: 'Industrie', emoji: '🏭',
    levels: [L('Opérateur', 21000), L('Conducteur de ligne', 26000), L('Chef d’équipe', 33000), L('Responsable de production', 50000), L('Directeur d’usine', 88000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 48, hours: 39, respect: 3, physical: true,
  },
  {
    id: 'engineerind', name: 'Ingénieur industriel', category: 'Industrie', emoji: '⚙️',
    levels: [L('Ingénieur junior', 38000), L('Ingénieur', 52000), L('Ingénieur senior', 72000), L('Responsable R&D', 98000), L('Directeur technique', 135000)],
    requiresLevel: 3, requiresMajors: ['engineering', 'science'], minAge: 22, minExperience: 0, stress: 54, hours: 42, respect: 7, physical: false,
  },
  {
    id: 'researcher', name: 'Chercheur', category: 'Sciences', emoji: '🔬',
    levels: [L('Doctorant', 22000), L('Post-doctorant', 34000), L('Chargé de recherche', 48000), L('Directeur de recherche', 72000), L('Prix scientifique', 105000)],
    requiresLevel: 4, requiresMajors: ['science', 'cs', 'engineering', 'psychology', 'agronomy'], minAge: 24, minExperience: 0, stress: 52, hours: 48, respect: 12, physical: false,
  },
  {
    id: 'labtech', name: 'Technicien de laboratoire', category: 'Sciences', emoji: '🧪',
    levels: [L('Technicien', 24000), L('Technicien supérieur', 31000), L('Responsable de laboratoire', 44000)],
    requiresLevel: 2, requiresMajors: null, minAge: 19, minExperience: 0, stress: 34, hours: 38, respect: 4, physical: false,
  },
  {
    id: 'astronaut', name: 'Astronaute', category: 'Sciences', emoji: '🚀',
    levels: [L('Candidat astronaute', 68000), L('Astronaute', 105000), L('Commandant de mission', 152000)],
    requiresLevel: 4, requiresMajors: ['science', 'engineering', 'medicine'], minAge: 28, minExperience: 6, stress: 85, hours: 55, respect: 25, physical: true, noRecord: true,
  },

  /* ---------------- Sécurité & Défense ---------------- */
  {
    id: 'police', name: 'Police', category: 'Sécurité & Défense', emoji: '👮',
    levels: [L('Gardien de la paix', 27000), L('Brigadier', 34000), L('Lieutenant', 44000), L('Capitaine', 56000), L('Commissaire', 78000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_police', minAge: 20, minExperience: 0, stress: 72, hours: 45, respect: 8, physical: true, noRecord: true,
  },
  {
    id: 'firefighter', name: 'Pompier', category: 'Sécurité & Défense', emoji: '🚒',
    levels: [L('Sapeur', 25000), L('Caporal', 30000), L('Sergent', 37000), L('Lieutenant', 48000), L('Capitaine', 62000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_fire', minAge: 19, minExperience: 0, stress: 74, hours: 48, respect: 12, physical: true, noRecord: true,
  },
  {
    id: 'soldier', name: 'Militaire', category: 'Sécurité & Défense', emoji: '🎖️',
    levels: [L('Soldat', 24000), L('Caporal', 29000), L('Sergent', 36000), L('Adjudant', 45000), L('Officier', 62000), L('Officier supérieur', 88000)],
    requiresLevel: 1, requiresMajors: null, requiresCourse: 'voc_military', minAge: 18, minExperience: 0, stress: 76, hours: 55, respect: 10, physical: true, noRecord: true,
  },
  {
    id: 'security', name: 'Agent de sécurité', category: 'Sécurité & Défense', emoji: '🛡️',
    levels: [L('Agent de sécurité', 20000), L('Agent confirmé', 25000), L('Chef de poste', 32000), L('Responsable sûreté', 46000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 40, hours: 42, respect: 3, physical: true, noRecord: true,
  },

  /* ---------------- Fonction publique & Médias ---------------- */
  {
    id: 'civilservant', name: 'Administration publique', category: 'Fonction publique', emoji: '🏛️',
    levels: [L('Agent administratif', 23000), L('Rédacteur', 30000), L('Attaché', 40000), L('Directeur de service', 58000), L('Directeur général des services', 82000)],
    requiresLevel: 1, requiresMajors: null, minAge: 19, minExperience: 0, stress: 34, hours: 37, respect: 5, physical: false, noRecord: true,
  },
  {
    id: 'politician', name: 'Politique', category: 'Fonction publique', emoji: '🗳️',
    levels: [L('Conseiller municipal', 12000), L('Maire', 42000), L('Député', 88000), L('Ministre', 125000), L('Chef de l’État', 180000)],
    requiresLevel: 3, requiresMajors: null, minAge: 24, minExperience: 4, stress: 82, hours: 60, respect: 14, physical: false, noRecord: true,
  },
  {
    id: 'diplomat', name: 'Diplomatie', category: 'Fonction publique', emoji: '🌐',
    levels: [L('Attaché d’ambassade', 42000), L('Consul', 68000), L('Ambassadeur', 105000)],
    requiresLevel: 4, requiresMajors: ['law', 'languages', 'history', 'economics', 'philosophy'], minAge: 26, minExperience: 3, stress: 58, hours: 48, respect: 13, physical: false, noRecord: true,
  },
  {
    id: 'journalist', name: 'Journalisme', category: 'Médias', emoji: '📰',
    levels: [L('Pigiste', 19000), L('Journaliste', 32000), L('Grand reporter', 48000), L('Rédacteur en chef', 72000), L('Directeur de rédaction', 105000)],
    requiresLevel: 3, requiresMajors: ['communication', 'history', 'languages', 'philosophy'], minAge: 21, minExperience: 0, stress: 62, hours: 48, respect: 7, physical: false,
  },
  {
    id: 'influencer', name: 'Créateur de contenu', category: 'Médias', emoji: '📱',
    levels: [L('Créateur amateur', 2000), L('Créateur émergent', 14000), L('Créateur établi', 55000), L('Créateur star', 260000), L('Phénomène mondial', 1500000)],
    requiresLevel: 0, requiresMajors: null, minAge: 14, minExperience: 0, stress: 50, hours: 40, respect: 3, physical: false,
  },
  {
    id: 'radio', name: 'Radio & podcast', category: 'Médias', emoji: '🎙️',
    levels: [L('Assistant de production', 20000), L('Animateur', 34000), L('Animateur vedette', 68000), L('Directeur d’antenne', 105000)],
    requiresLevel: 1, requiresMajors: null, minAge: 19, minExperience: 0, stress: 46, hours: 42, respect: 5, physical: false,
  },

  /* ---------------- Agriculture, Beauté, Tourisme, Immobilier, Services ---------------- */
  {
    id: 'farmer', name: 'Agriculteur', category: 'Agriculture', emoji: '🚜',
    levels: [L('Ouvrier agricole', 18000), L('Exploitant', 27000), L('Exploitant confirmé', 40000), L('Grande exploitation', 72000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 52, hours: 58, respect: 5, physical: true,
  },
  {
    id: 'agronomist', name: 'Ingénieur agronome', category: 'Agriculture', emoji: '🌾',
    levels: [L('Technicien agricole', 26000), L('Ingénieur agronome', 40000), L('Responsable de filière', 58000), L('Directeur coopérative', 82000)],
    requiresLevel: 3, requiresMajors: ['agronomy', 'science'], minAge: 22, minExperience: 0, stress: 42, hours: 42, respect: 6, physical: true,
  },
  {
    id: 'winemaker', name: 'Viticulteur', category: 'Agriculture', emoji: '🍇',
    levels: [L('Ouvrier viticole', 19000), L('Vigneron', 32000), L('Propriétaire de domaine', 68000), L('Grand cru reconnu', 165000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 48, hours: 52, respect: 6, physical: true,
  },
  {
    id: 'hairdresser', name: 'Coiffeur', category: 'Beauté & Bien-être', emoji: '💇',
    levels: [L('Apprenti coiffeur', 17500), L('Coiffeur', 23000), L('Coiffeur confirmé', 30000), L('Propriétaire de salon', 52000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_beauty', minAge: 17, minExperience: 0, stress: 36, hours: 40, respect: 3, physical: true,
  },
  {
    id: 'beautician', name: 'Esthéticien', category: 'Beauté & Bien-être', emoji: '💅',
    levels: [L('Esthéticien', 18500), L('Esthéticien confirmé', 25000), L('Responsable institut', 34000), L('Propriétaire d’institut', 56000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_beauty', minAge: 17, minExperience: 0, stress: 32, hours: 39, respect: 3, physical: false,
  },
  {
    id: 'model', name: 'Mannequin', category: 'Beauté & Bien-être', emoji: '👗',
    levels: [L('Mannequin débutant', 12000), L('Mannequin', 38000), L('Mannequin reconnu', 120000), L('Égérie internationale', 620000)],
    requiresLevel: 0, requiresMajors: null, minAge: 16, minExperience: 0, stress: 55, hours: 42, respect: 4, physical: true,
  },
  {
    id: 'hotel', name: 'Hôtellerie', category: 'Tourisme', emoji: '🏨',
    levels: [L('Réceptionniste', 20000), L('Chef de réception', 27000), L('Directeur adjoint', 40000), L('Directeur d’hôtel', 62000), L('Directeur de groupe hôtelier', 105000)],
    requiresLevel: 1, requiresMajors: null, minAge: 18, minExperience: 0, stress: 46, hours: 43, respect: 4, physical: false,
  },
  {
    id: 'guide', name: 'Guide touristique', category: 'Tourisme', emoji: '🗺️',
    levels: [L('Guide saisonnier', 16000), L('Guide conférencier', 26000), L('Guide spécialisé', 38000)],
    requiresLevel: 1, requiresMajors: null, minAge: 18, minExperience: 0, stress: 28, hours: 38, respect: 4, physical: true,
  },
  {
    id: 'realtor', name: 'Agent immobilier', category: 'Immobilier', emoji: '🏘️',
    levels: [L('Négociateur', 22000), L('Agent immobilier', 38000), L('Agent confirmé', 62000), L('Directeur d’agence', 95000), L('Promoteur', 185000)],
    requiresLevel: 2, requiresMajors: null, requiresCourse: 'voc_realestate', minAge: 19, minExperience: 0, stress: 55, hours: 45, respect: 4, physical: false,
  },
  {
    id: 'cleaner', name: 'Entretien et propreté', category: 'Services', emoji: '🧹',
    levels: [L('Agent d’entretien', 17500), L('Agent confirmé', 21000), L('Chef d’équipe', 27000), L('Responsable de site', 36000)],
    requiresLevel: 0, requiresMajors: null, minAge: 17, minExperience: 0, stress: 32, hours: 38, respect: 2, physical: true,
  },
  {
    id: 'postman', name: 'Facteur', category: 'Services', emoji: '📬',
    levels: [L('Facteur', 21000), L('Facteur confirmé', 25000), L('Responsable de tournée', 32000)],
    requiresLevel: 0, requiresMajors: null, minAge: 18, minExperience: 0, stress: 30, hours: 38, respect: 4, physical: true, noRecord: true,
  },
  {
    id: 'translator', name: 'Traducteur', category: 'Services', emoji: '🗣️',
    levels: [L('Traducteur junior', 24000), L('Traducteur', 34000), L('Traducteur assermenté', 48000), L('Interprète de conférence', 72000)],
    requiresLevel: 3, requiresMajors: ['languages', 'communication', 'history'], minAge: 21, minExperience: 0, stress: 34, hours: 38, respect: 5, physical: false,
  },
  {
    id: 'socialworker', name: 'Travailleur social', category: 'Services', emoji: '🤲',
    levels: [L('Assistant social', 25000), L('Travailleur social confirmé', 32000), L('Chef de service social', 44000), L('Directeur d’établissement', 62000)],
    requiresLevel: 3, requiresMajors: ['psychology', 'education', 'philosophy'], minAge: 21, minExperience: 0, stress: 64, hours: 40, respect: 9, physical: false, noRecord: true,
  },
];

export const JOB_MAP: Record<string, JobDef> = Object.fromEntries(JOBS.map((j) => [j.id, j]));

export function getJob(id: string): JobDef | null {
  return JOB_MAP[id] ?? null;
}

/** Catégories, dans l'ordre d'affichage. */
export const JOB_CATEGORIES: string[] = Array.from(new Set(JOBS.map((j) => j.category)));

/** Nombre total de postes distincts (tous échelons confondus). */
export const TOTAL_POSITIONS = JOBS.reduce((sum, j) => sum + j.levels.length, 0);
