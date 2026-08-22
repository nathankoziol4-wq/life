/**
 * Délits jouables — mécaniques de jeu abstraites.
 *
 * Aucune donnée ici ne décrit un mode opératoire : un délit est un tirage
 * de probabilité avec un gain, un risque d'arrestation et une peine. Le jeu
 * ne fournit ni méthode, ni technique, ni instruction réelle.
 */

export interface CrimeDef {
  id: string;
  name: string;
  emoji: string;
  category: 'petit' | 'moyen' | 'grave' | 'organisé';
  /** Difficulté 0-1 : plus haut = moins de chances de réussir. */
  difficulty: number;
  /** Attention attirée par le délit (influence l'arrestation). */
  heat: number;
  /** Gain minimum / maximum en cas de succès (référence). */
  minGain: number;
  maxGain: number;
  /** Peine de prison de référence (années), avant sévérité du pays. */
  sentenceMin: number;
  sentenceMax: number;
  /** Amende de référence. */
  fineMin: number;
  fineMax: number;
  minAge: number;
  /** Criminalité minimale requise pour tenter le coup. */
  minCriminality: number;
  /** Impact sur le karma en cas de réussite. */
  karma: number;
  /** Risque de blessure lors de l'action. */
  injuryRisk: number;
  /** Nécessite des complices (notoriété). */
  needsCrew: boolean;
  /**
   * Le mini-jeu qui décide du coup, quand il y en a un.
   *
   * Sans lui, le délit se règle au tirage — ce que le catalogue reprochait à
   * plusieurs lignes d'ici. Ce qui se joue reste **entièrement fictif** : le
   * boîtier de `minigames/rings.ts` est un objet inventé, et rien de ce qu'on
   * y apprend ne s'applique ailleurs qu'à lui.
   */
  miniGame?: string;
  description: string;
}

export const CRIMES: CrimeDef[] = [
  {
    id: 'shoplift', name: 'Vol à l’étalage', emoji: '🛍️', category: 'petit',
    miniGame: 'rings',
    difficulty: 0.3, heat: 0.2, minGain: 20, maxGain: 400, sentenceMin: 0, sentenceMax: 1,
    fineMin: 150, fineMax: 900, minAge: 10, minCriminality: 0, karma: -4, injuryRisk: 0.01,
    needsCrew: false, description: 'Sortir d’un magasin sans passer en caisse. Petit gain, petit risque.',
  },
  {
    id: 'pickpocket', name: 'Pickpocket', emoji: '👛', category: 'petit',
    difficulty: 0.42, heat: 0.25, minGain: 30, maxGain: 900, sentenceMin: 0, sentenceMax: 2,
    fineMin: 250, fineMax: 1600, minAge: 12, minCriminality: 10, karma: -6, injuryRisk: 0.04,
    needsCrew: false, description: 'Détrousser un passant dans la foule.',
  },
  {
    id: 'graffiti', name: 'Dégradation', emoji: '🎨', category: 'petit',
    difficulty: 0.2, heat: 0.15, minGain: 0, maxGain: 0, sentenceMin: 0, sentenceMax: 1,
    fineMin: 200, fineMax: 1200, minAge: 10, minCriminality: 0, karma: -3, injuryRisk: 0.02,
    needsCrew: false, description: 'Marquer un mur. Aucun gain, mais une certaine réputation de rue.',
  },
  {
    id: 'fraud_small', name: 'Petite arnaque', emoji: '📧', category: 'moyen',
    difficulty: 0.45, heat: 0.3, minGain: 200, maxGain: 4500, sentenceMin: 0, sentenceMax: 3,
    fineMin: 600, fineMax: 6000, minAge: 16, minCriminality: 15, karma: -8, injuryRisk: 0,
    needsCrew: false, description: 'Escroquer quelqu’un par un stratagème peu élaboré.',
  },
  {
    id: 'burglary', name: 'Cambriolage', emoji: '🏠', category: 'moyen',
    difficulty: 0.55, heat: 0.5, minGain: 600, maxGain: 22000, sentenceMin: 1, sentenceMax: 6,
    fineMin: 1200, fineMax: 12000, minAge: 15, minCriminality: 25, karma: -14, injuryRisk: 0.08,
    needsCrew: false, description: 'S’introduire dans une habitation vide pour y prendre des biens.',
  },
  {
    id: 'cartheft', name: 'Vol de véhicule', emoji: '🚗', category: 'moyen',
    difficulty: 0.6, heat: 0.55, minGain: 1500, maxGain: 45000, sentenceMin: 1, sentenceMax: 7,
    fineMin: 2000, fineMax: 18000, minAge: 16, minCriminality: 30, karma: -13, injuryRisk: 0.06,
    needsCrew: false, miniGame: 'rings',
    description: 'Repartir avec une voiture qui n’est pas la sienne.',
  },
  {
    id: 'embezzle', name: 'Détournement de fonds', emoji: '💼', category: 'moyen',
    difficulty: 0.58, heat: 0.4, minGain: 3000, maxGain: 180000, sentenceMin: 2, sentenceMax: 9,
    fineMin: 5000, fineMax: 90000, minAge: 21, minCriminality: 20, karma: -18, injuryRisk: 0,
    needsCrew: false, description: 'Siphonner discrètement la trésorerie de son employeur. Nécessite un emploi.',
  },
  {
    id: 'fraud_big', name: 'Escroquerie financière', emoji: '📉', category: 'grave',
    difficulty: 0.68, heat: 0.55, minGain: 12000, maxGain: 900000, sentenceMin: 3, sentenceMax: 14,
    fineMin: 20000, fineMax: 500000, minAge: 22, minCriminality: 45, karma: -26, injuryRisk: 0,
    needsCrew: false, description: 'Monter un schéma d’investissement fictif à grande échelle.',
  },
  {
    id: 'robbery', name: 'Vol avec violence', emoji: '🥷', category: 'grave',
    difficulty: 0.66, heat: 0.75, minGain: 800, maxGain: 30000, sentenceMin: 3, sentenceMax: 12,
    fineMin: 3000, fineMax: 25000, minAge: 16, minCriminality: 40, karma: -30, injuryRisk: 0.22,
    needsCrew: false, description: 'Menacer une victime pour la dépouiller. Très risqué.',
    miniGame: 'heist',
  },
  {
    id: 'bankheist', name: 'Braquage de banque', emoji: '🏦', category: 'grave',
    difficulty: 0.82, heat: 0.95, minGain: 25000, maxGain: 1800000, sentenceMin: 8, sentenceMax: 25,
    fineMin: 40000, fineMax: 400000, minAge: 18, minCriminality: 60, karma: -40, injuryRisk: 0.35,
    needsCrew: true, description: 'Le grand coup. Une équipe, une fenêtre de quelques minutes, et beaucoup de choses qui peuvent mal tourner.',
    miniGame: 'heist',
  },
  {
    id: 'smuggling', name: 'Contrebande', emoji: '📦', category: 'organisé',
    difficulty: 0.62, heat: 0.6, minGain: 8000, maxGain: 260000, sentenceMin: 4, sentenceMax: 16,
    fineMin: 15000, fineMax: 200000, minAge: 18, minCriminality: 50, karma: -28, injuryRisk: 0.12,
    needsCrew: true, description: 'Faire passer des marchandises illicites d’un point à un autre.',
  },
  {
    id: 'racket', name: 'Racket organisé', emoji: '🕴️', category: 'organisé',
    difficulty: 0.7, heat: 0.7, minGain: 15000, maxGain: 420000, sentenceMin: 6, sentenceMax: 20,
    fineMin: 25000, fineMax: 300000, minAge: 20, minCriminality: 65, karma: -35, injuryRisk: 0.25,
    needsCrew: true, description: 'Prélever une « protection » sur des commerces du quartier.',
  },
  {
    id: 'artheist', name: 'Vol d’œuvre d’art', emoji: '🖼️', category: 'organisé',
    difficulty: 0.86, heat: 0.85, minGain: 60000, maxGain: 4200000, sentenceMin: 6, sentenceMax: 20,
    fineMin: 50000, fineMax: 900000, minAge: 20, minCriminality: 70, karma: -32, injuryRisk: 0.15,
    needsCrew: true, description: 'Dérober une pièce de musée. Spectaculaire, presque impossible à revendre.',
    miniGame: 'heist',
  },
  {
    id: 'cybercrime', name: 'Fraude informatique', emoji: '🖥️', category: 'organisé',
    difficulty: 0.75, heat: 0.5, minGain: 20000, maxGain: 2600000, sentenceMin: 4, sentenceMax: 18,
    fineMin: 30000, fineMax: 600000, minAge: 16, minCriminality: 55, karma: -30, injuryRisk: 0,
    needsCrew: false, description: 'Détourner des fonds par voie numérique. Demande une intelligence élevée.',
  },
];

export const CRIME_MAP: Record<string, CrimeDef> = Object.fromEntries(CRIMES.map((c) => [c.id, c]));

/** Avocats disponibles au procès. */
export const LAWYERS = [
  { id: 'public', name: 'Avocat commis d’office', emoji: '📎', cost: 0, quality: 30, description: 'Surchargé, il découvre le dossier le matin même.' },
  { id: 'standard', name: 'Avocat de quartier', emoji: '💼', cost: 4500, quality: 55, description: 'Compétent, méthodique, sans éclat.' },
  { id: 'good', name: 'Cabinet réputé', emoji: '🎩', cost: 24000, quality: 78, description: 'Une équipe entière travaille sur votre dossier.' },
  { id: 'elite', name: 'Ténor du barreau', emoji: '👑', cost: 120000, quality: 94, description: 'Son nom seul fait hésiter le procureur.' },
];

/** Activités disponibles en prison. */
export const PRISON_ACTIVITIES = [
  { id: 'gym', name: 'Salle de sport', emoji: '🏋️', description: 'Prendre du muscle et se faire respecter.' },
  { id: 'library', name: 'Bibliothèque', emoji: '📚', description: 'Lire, étudier, préparer l’après.' },
  { id: 'behave', name: 'Comportement exemplaire', emoji: '😇', description: 'Se tenir à carreau pour la conditionnelle.' },
  { id: 'socialize', name: 'Parler aux détenus', emoji: '🗣️', description: 'Se faire des alliés — ou des ennemis.' },
  { id: 'work', name: 'Travail en détention', emoji: '🧹', description: 'Quelques pièces et un peu de considération.' },
  { id: 'parole', name: 'Demander la conditionnelle', emoji: '🕊️', description: 'Passer devant la commission.' },
  { id: 'riot', name: 'Provoquer un esclandre', emoji: '💥', description: 'Très mauvaise idée. Généralement.' },
];
