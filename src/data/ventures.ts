/**
 * Travailler pour soi : les métiers qu'on exerce à son compte, et les
 * entreprises qu'on peut ouvrir.
 *
 * Le jeu ne connaissait qu'une seule façon de gagner sa vie : être embauché.
 * Un chômeur n'avait littéralement rien à faire de son année, et le mot
 * « entreprise » n'existait que comme nom d'employeur. Ce fichier décrit les
 * deux formes qui manquaient :
 *
 * - **un métier à son compte** (`Trade`), où l'on vend son temps et son
 *   savoir-faire, et où le seul vrai levier est le tarif qu'on ose demander ;
 * - **une entreprise** (`BusinessKind`), où l'on vend le travail des autres,
 *   et où l'on arbitre en permanence entre capacité et demande.
 *
 * Les montants sont exprimés en unités de base : ils sont mis à l'échelle du
 * pays et de l'inflation par `systems/venture.ts`, comme les salaires.
 */

import type { StatKey } from '../engine/types.ts';

/* ------------------------------------------------------------------ */
/* Les métiers qu'on exerce à son compte                               */
/* ------------------------------------------------------------------ */

export interface Trade {
  id: string;
  label: string;
  emoji: string;
  /** Ce qu'on vend, en une phrase. */
  pitch: string;
  minAge: number;
  /** La statistique qui décide de la qualité du travail livré. */
  driver: StatKey;
  /** Une seconde, qui pèse trois fois moins. */
  second: StatKey;
  /** Prix de référence d'une prestation. */
  baseFee: number;
  /** Prestations qu'un marché normal absorbe en un an. */
  volume: number;
  /**
   * Sensibilité de la demande au prix.
   *
   * En dessous de 1, augmenter son tarif augmente le chiffre : les clients
   * n'ont pas vraiment le choix. Au-dessus, ils comparent, et se serrer la
   * ceinture rapporte davantage. C'est ce nombre — invisible, à deviner —
   * qui fait qu'il n'existe pas un bon tarif mais un bon tarif par métier.
   */
  elasticity: number;
  /** Ce que l'activité fait connaître : nourrit l'audience. */
  visibility: number;
  /** Fatigue d'une année pleine, 0-100. */
  toll: number;
  /** L'intérêt que la pratique entretient. */
  interest?: string;
  /** Niveau d'études minimal, s'il en faut un. */
  needsLevel?: number;
  /** Formation professionnelle exigée par les clients sérieux. */
  needsCourse?: string;
}

export const TRADES: Trade[] = [
  {
    id: 'menage', label: 'Ménage et repassage', emoji: '🧹',
    pitch: 'Des heures chez des particuliers, payées à l’heure',
    minAge: 16, driver: 'discipline', second: 'fitness',
    baseFee: 62, volume: 180, elasticity: 1.5, visibility: 0, toll: 34,
  },
  {
    id: 'garde', label: 'Garde d’enfants', emoji: '🧸',
    pitch: 'Les soirs et les mercredis, chez les voisins puis de bouche à oreille',
    minAge: 15, driver: 'discipline', second: 'happiness',
    baseFee: 55, volume: 150, elasticity: 1.3, visibility: 2, toll: 24,
  },
  {
    id: 'livraison', label: 'Livraison', emoji: '🛵',
    pitch: 'Des courses à l’unité, du matin au soir s’il le faut',
    minAge: 18, driver: 'fitness', second: 'discipline',
    baseFee: 92, volume: 160, elasticity: 1.8, visibility: 0, toll: 42,
  },
  {
    id: 'bricolage', label: 'Petits travaux', emoji: '🛠️',
    pitch: 'Ce que les gens n’arrivent pas à réparer eux-mêmes',
    minAge: 18, driver: 'discipline', second: 'intelligence',
    baseFee: 225, volume: 90, elasticity: 1.1, visibility: 3, toll: 38,
    interest: 'bricolage',
  },
  {
    id: 'jardinage', label: 'Jardins et entretien', emoji: '🌿',
    pitch: 'Des jardins à tailler, des saisons à suivre',
    minAge: 17, driver: 'fitness', second: 'discipline',
    baseFee: 180, volume: 80, elasticity: 1.2, visibility: 2, toll: 36,
    interest: 'jardinage',
  },
  {
    id: 'cours', label: 'Cours particuliers', emoji: '📖',
    pitch: 'Une heure par élève, et des parents qui se recommandent entre eux',
    minAge: 17, driver: 'intelligence', second: 'happiness',
    baseFee: 46, volume: 240, elasticity: 0.9, visibility: 3, toll: 22,
    interest: 'lecture', needsLevel: 1,
  },
  {
    id: 'traduction', label: 'Traduction', emoji: '🗣️',
    pitch: 'Des pages payées au feuillet, souvent la nuit',
    minAge: 18, driver: 'intelligence', second: 'discipline',
    baseFee: 300, volume: 70, elasticity: 1.4, visibility: 1, toll: 26,
    interest: 'lecture', needsLevel: 2,
  },
  {
    id: 'redaction', label: 'Rédaction', emoji: '✍️',
    pitch: 'Écrire pour ceux qui n’ont pas le temps d’écrire',
    minAge: 17, driver: 'intelligence', second: 'reputation',
    baseFee: 265, volume: 75, elasticity: 1.35, visibility: 6, toll: 24,
    interest: 'écriture',
  },
  {
    id: 'web', label: 'Sites et applications', emoji: '💻',
    pitch: 'Des projets entiers, chers et longs, avec un client par trimestre',
    minAge: 18, driver: 'intelligence', second: 'discipline',
    baseFee: 1900, volume: 14, elasticity: 0.85, visibility: 4, toll: 32,
    interest: 'informatique',
  },
  {
    id: 'graphisme', label: 'Graphisme', emoji: '🎨',
    pitch: 'Des identités, des affiches, des choses qu’on voit sans savoir qui les a faites',
    minAge: 17, driver: 'intelligence', second: 'looks',
    baseFee: 750, volume: 38, elasticity: 1.15, visibility: 8, toll: 28,
    interest: 'dessin',
  },
  {
    id: 'photo', label: 'Photographie', emoji: '📷',
    pitch: 'Des mariages, des portraits, des commandes qui n’attendent pas',
    minAge: 17, driver: 'looks', second: 'intelligence',
    baseFee: 560, volume: 45, elasticity: 1.25, visibility: 12, toll: 30,
    interest: 'dessin',
  },
  {
    id: 'musique', label: 'Concerts et animations', emoji: '🎸',
    pitch: 'Des soirs où l’on joue devant trente personnes, parfois trois cents',
    minAge: 16, driver: 'looks', second: 'happiness',
    baseFee: 400, volume: 42, elasticity: 1.6, visibility: 20, toll: 34,
    interest: 'musique',
  },
  {
    id: 'illustration', label: 'Illustration', emoji: '🖌️',
    pitch: 'Des commandes de couvertures, de planches, de portraits',
    minAge: 16, driver: 'intelligence', second: 'looks',
    baseFee: 480, volume: 44, elasticity: 1.2, visibility: 10, toll: 26,
    interest: 'dessin',
  },
  {
    id: 'artisanat', label: 'Créations à vendre', emoji: '🧶',
    pitch: 'Ce que tu fabriques chez toi et que tu vends sur les marchés',
    minAge: 15, driver: 'discipline', second: 'intelligence',
    baseFee: 86, volume: 170, elasticity: 1.7, visibility: 5, toll: 28,
    interest: 'bricolage',
  },
  {
    id: 'coiffure', label: 'Coiffure à domicile', emoji: '💇',
    pitch: 'Des rendez-vous chez les gens, moins cher qu’en salon',
    minAge: 18, driver: 'looks', second: 'discipline',
    baseFee: 46, volume: 300, elasticity: 1.45, visibility: 4, toll: 32,
    needsCourse: 'voc_beauty',
  },
  {
    id: 'coaching', label: 'Préparation physique', emoji: '🏋️',
    pitch: 'Des séances individuelles, tôt le matin ou tard le soir',
    minAge: 18, driver: 'fitness', second: 'reputation',
    baseFee: 56, volume: 260, elasticity: 1.05, visibility: 9, toll: 30,
    interest: 'course',
  },
  {
    id: 'contenu', label: 'Publications et vidéos', emoji: '📱',
    pitch: 'Presque rien par publication, tout dépend du nombre de gens en face',
    minAge: 14, driver: 'looks', second: 'intelligence',
    baseFee: 38, volume: 340, elasticity: 0.55, visibility: 34, toll: 26,
    interest: 'réseauxSociaux',
  },
  {
    id: 'reparation', label: 'Réparation d’appareils', emoji: '🔌',
    pitch: 'Ce que les gens jetteraient si personne ne l’ouvrait',
    minAge: 17, driver: 'intelligence', second: 'discipline',
    baseFee: 132, volume: 110, elasticity: 1.25, visibility: 2, toll: 27,
    interest: 'mécanique',
  },
  {
    id: 'couture', label: 'Retouches et couture', emoji: '🧵',
    pitch: 'Des ourlets, des robes, des urgences de dernière minute',
    minAge: 16, driver: 'discipline', second: 'looks',
    baseFee: 112, volume: 120, elasticity: 1.55, visibility: 3, toll: 25,
    interest: 'mode',
  },
  {
    id: 'patisserie', label: 'Gâteaux sur commande', emoji: '🍰',
    pitch: 'Des commandes pour les anniversaires et les fêtes du quartier',
    minAge: 16, driver: 'discipline', second: 'happiness',
    baseFee: 72, volume: 200, elasticity: 1.4, visibility: 7, toll: 31,
    interest: 'cuisine',
  },
];

export function getTrade(id: string): Trade | undefined {
  return TRADES.find((t) => t.id === id);
}

/* ------------------------------------------------------------------ */
/* Les entreprises qu'on peut ouvrir                                   */
/* ------------------------------------------------------------------ */

export interface BusinessKind {
  id: string;
  label: string;
  emoji: string;
  /** Ce que l'entreprise vend. */
  what: string;
  /** Mise de départ : local, matériel, stock, premiers mois. */
  capital: number;
  /** Chiffre d'affaires qu'une personne à plein régime peut produire. */
  perHead: number;
  /** Marge brute avant salaires et charges fixes. */
  margin: number;
  /** Charges fixes annuelles : local, matériel, assurances. */
  fixed: number;
  /** Coût annuel complet d'un employé. */
  wage: number;
  /**
   * Nombre d'employés au-delà duquel un bras de plus ne produit presque
   * plus rien. C'est la taille naturelle du modèle : un salon de coiffure
   * ne devient pas une multinationale.
   */
  ceiling: number;
  /** Amplitude des à-coups : 0.5 = tranquille, 2 = tout ou rien. */
  swing: number;
  /** La qualité du patron qui déteint sur la maison. */
  driver: StatKey;
  minAge: number;
  needsLevel?: number;
  needsCourse?: string;
  /** Multiple de résultat retenu par un repreneur. */
  multiple: number;
  /** Noms possibles, complétés par le nom de famille du joueur. */
  names: string[];
}

export const BUSINESS_KINDS: BusinessKind[] = [
  {
    id: 'cafe', label: 'Café', emoji: '☕',
    what: 'Des cafés, des sandwichs, et des gens qui restent trop longtemps',
    capital: 52000, perHead: 96000, margin: 0.55, fixed: 34000, wage: 26000,
    ceiling: 4, swing: 0.9, driver: 'happiness', minAge: 18, multiple: 2.4,
    names: ['Le Comptoir', 'Chez', 'Le Petit Noir', 'La Terrasse', 'Le Zinc'],
  },
  {
    id: 'restaurant', label: 'Restaurant', emoji: '🍽️',
    what: 'Deux services par jour, six jours sur sept',
    capital: 110000, perHead: 125000, margin: 0.5, fixed: 62000, wage: 29000,
    ceiling: 8, swing: 1.3, driver: 'discipline', minAge: 20, multiple: 2.1,
    needsCourse: 'voc_culinary',
    names: ['La Table', 'Le Bistrot', 'La Maison', 'L’Ardoise', 'Le Passage'],
  },
  {
    id: 'boulangerie', label: 'Boulangerie', emoji: '🥖',
    what: 'Debout à quatre heures, fermé le mardi',
    capital: 88000, perHead: 105000, margin: 0.52, fixed: 46000, wage: 27000,
    ceiling: 5, swing: 0.6, driver: 'discipline', minAge: 20, multiple: 2.6,
    needsCourse: 'voc_culinary',
    names: ['Le Fournil', 'La Mie', 'Au Bon Pain', 'La Boulange', 'Le Pétrin'],
  },
  {
    id: 'epicerie', label: 'Épicerie', emoji: '🛒',
    what: 'Du stock, des marges minces, et le quartier qui passe',
    capital: 68000, perHead: 175000, margin: 0.3, fixed: 38000, wage: 25000,
    ceiling: 4, swing: 0.7, driver: 'discipline', minAge: 18, multiple: 2.2,
    names: ['L’Épicerie', 'Le Marché', 'Au Coin', 'La Réserve', 'Chez'],
  },
  {
    id: 'coiffeur', label: 'Salon de coiffure', emoji: '💈',
    what: 'Des fauteuils, des rendez-vous, et de la fidélité',
    capital: 44000, perHead: 78000, margin: 0.68, fixed: 27000, wage: 25000,
    ceiling: 4, swing: 0.6, driver: 'looks', minAge: 20, multiple: 2.5,
    needsCourse: 'voc_beauty',
    names: ['Le Salon', 'Coup de Peigne', 'L’Atelier', 'Tête à Tête', 'Chez'],
  },
  {
    id: 'garage', label: 'Garage', emoji: '🔧',
    what: 'Des réparations, des devis, et des clients qui reviennent',
    capital: 95000, perHead: 132000, margin: 0.5, fixed: 48000, wage: 32000,
    ceiling: 5, swing: 0.8, driver: 'intelligence', minAge: 21, multiple: 2.7,
    needsCourse: 'voc_mechanic',
    names: ['Le Garage', 'Auto', 'Le Pont', 'Mécanique', 'L’Atelier'],
  },
  {
    id: 'librairie', label: 'Librairie', emoji: '📚',
    what: 'Un métier de passion aux marges désespérantes',
    capital: 52000, perHead: 148000, margin: 0.33, fixed: 33000, wage: 25000,
    ceiling: 3, swing: 0.6, driver: 'intelligence', minAge: 20, multiple: 1.9,
    names: ['La Page', 'Le Rayon', 'Les Mots', 'La Marge', 'Le Signet'],
  },
  {
    id: 'salle_sport', label: 'Salle de sport', emoji: '🏋️',
    what: 'Des abonnements payés toute l’année par des gens qui viennent en janvier',
    capital: 135000, perHead: 105000, margin: 0.65, fixed: 74000, wage: 27000,
    ceiling: 6, swing: 1.1, driver: 'fitness', minAge: 21, multiple: 2.8,
    names: ['La Salle', 'Fit', 'L’Effort', 'Le Ring', 'La Fonte'],
  },
  {
    id: 'agence_web', label: 'Agence numérique', emoji: '🖥️',
    what: 'Des projets facturés cher par des gens payés bien',
    capital: 42000, perHead: 155000, margin: 0.7, fixed: 40000, wage: 52000,
    ceiling: 9, swing: 1.4, driver: 'intelligence', minAge: 20, multiple: 3.2,
    needsLevel: 2,
    names: ['Studio', 'Atelier', 'Agence', 'Pixel', 'Digital'],
  },
  {
    id: 'conseil', label: 'Cabinet de conseil', emoji: '📊',
    what: 'On vend des jours d’expertise, et rien d’autre',
    capital: 34000, perHead: 180000, margin: 0.76, fixed: 42000, wage: 62000,
    ceiling: 10, swing: 1.5, driver: 'intelligence', minAge: 24, multiple: 3.4,
    needsLevel: 3,
    names: ['Conseil', 'Partners', 'Associés', 'Cabinet', 'Stratégie'],
  },
  {
    id: 'nettoyage', label: 'Société de nettoyage', emoji: '🧽',
    what: 'Beaucoup de monde, peu de marge, des contrats qui durent',
    capital: 26000, perHead: 108000, margin: 0.45, fixed: 24000, wage: 24000,
    ceiling: 16, swing: 0.5, driver: 'discipline', minAge: 20, multiple: 2.3,
    names: ['Net', 'Propreté', 'Éclat', 'Services', 'Impeccable'],
  },
  {
    id: 'batiment', label: 'Entreprise du bâtiment', emoji: '🏗️',
    what: 'Des chantiers, des retards, et des factures énormes',
    capital: 98000, perHead: 168000, margin: 0.46, fixed: 58000, wage: 40000,
    ceiling: 14, swing: 1.7, driver: 'discipline', minAge: 22, multiple: 2.5,
    needsCourse: 'voc_trades',
    names: ['Bâtiment', 'Construction', 'Travaux', 'Chantiers', 'Bâti'],
  },
  {
    id: 'logiciel', label: 'Éditeur de logiciel', emoji: '⌨️',
    what: 'Des années à perte, puis peut-être une marge que rien n’égale',
    capital: 80000, perHead: 200000, margin: 0.84, fixed: 74000, wage: 66000,
    ceiling: 12, swing: 2, driver: 'intelligence', minAge: 21, multiple: 4.2,
    needsLevel: 2,
    names: ['Labs', 'Systems', 'Soft', 'Works', 'Data'],
  },
  {
    id: 'formation', label: 'Centre de formation', emoji: '🎓',
    what: 'Des sessions vendues aux entreprises et aux particuliers',
    capital: 50000, perHead: 132000, margin: 0.62, fixed: 42000, wage: 42000,
    ceiling: 8, swing: 1, driver: 'intelligence', minAge: 24, multiple: 2.6,
    needsLevel: 3,
    names: ['Institut', 'Centre', 'Académie', 'Formation', 'École'],
  },
  {
    id: 'transport', label: 'Transport', emoji: '🚚',
    what: 'Des camions à rembourser et des tournées à remplir',
    capital: 118000, perHead: 190000, margin: 0.36, fixed: 72000, wage: 34000,
    ceiling: 12, swing: 1.2, driver: 'discipline', minAge: 23, multiple: 2.2,
    needsCourse: 'voc_truck',
    names: ['Transports', 'Logistique', 'Express', 'Routes', 'Fret'],
  },
  {
    id: 'fleuriste', label: 'Fleuriste', emoji: '💐',
    what: 'Des pics de commandes trois fois par an, et du calme le reste du temps',
    capital: 34000, perHead: 84000, margin: 0.56, fixed: 22000, wage: 24000,
    ceiling: 3, swing: 1.1, driver: 'looks', minAge: 18, multiple: 2.2,
    names: ['La Fleur', 'Bouquet', 'Le Jardin', 'Pétales', 'La Serre'],
  },
  {
    id: 'studio', label: 'Studio de production', emoji: '🎬',
    what: 'Des tournages, des mois d’attente, et un nom qui circule ou pas',
    capital: 105000, perHead: 180000, margin: 0.6, fixed: 76000, wage: 54000,
    ceiling: 9, swing: 1.9, driver: 'looks', minAge: 22, multiple: 3,
    names: ['Studio', 'Productions', 'Images', 'Films', 'Prod'],
  },
  {
    id: 'atelier', label: 'Atelier d’artisanat', emoji: '🪵',
    what: 'Des pièces faites à la main, vendues à ceux qui savent ce que ça coûte',
    capital: 38000, perHead: 92000, margin: 0.6, fixed: 24000, wage: 28000,
    ceiling: 4, swing: 0.9, driver: 'discipline', minAge: 20, multiple: 2.4,
    names: ['L’Atelier', 'La Fabrique', 'L’Établi', 'Manufacture', 'L’Ouvrage'],
  },
];

export function getBusinessKind(id: string): BusinessKind | undefined {
  return BUSINESS_KINDS.find((b) => b.id === id);
}

/* ------------------------------------------------------------------ */
/* Les leviers                                                         */
/* ------------------------------------------------------------------ */

export type Pricing = 'bas' | 'normal' | 'haut';
export type Involvement = 'absent' | 'présent' | 'total';

/** Ce que chaque politique de prix fait au volume et à la marge. */
export const PRICING: Record<Pricing, {
  label: string; volume: number; margin: number; note: string;
}> = {
  bas: {
    label: 'Serrés',
    volume: 1.34,
    margin: 0.72,
    note: 'Il vient beaucoup plus de monde, et il reste beaucoup moins sur chaque vente.',
  },
  normal: {
    label: 'Comme les autres',
    volume: 1,
    margin: 1,
    note: 'Ni cher ni bon marché. Personne ne vient pour le prix, personne ne part à cause de lui.',
  },
  haut: {
    label: 'Élevés',
    volume: 0.7,
    margin: 1.32,
    note: 'Il faut que ça les vaille : au-dessus de la qualité que tu offres, ta réputation s’abîme.',
  },
};

/** Ce que la présence du patron change. */
export const INVOLVEMENT: Record<Involvement, {
  label: string; weight: number; quality: number; toll: number; note: string;
}> = {
  absent: {
    label: 'Tu passes de temps en temps',
    weight: 0.15,
    quality: -7,
    toll: 2,
    note: 'Tu gardes ta vie. Sans quelqu’un pour tenir la maison, elle se délite doucement.',
  },
  'présent': {
    label: 'Tu y es tous les jours',
    weight: 0.95,
    quality: 1,
    toll: 12,
    note: 'Le fonctionnement normal : tu vaux un employé, et tu vois ce qui se passe.',
  },
  total: {
    label: 'Tu ne fais plus que ça',
    weight: 1.45,
    quality: 6,
    toll: 26,
    note: 'La maison marche mieux et toi moins bien. Rien d’autre ne rentre dans l’année.',
  },
};
