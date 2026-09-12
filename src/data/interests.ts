/**
 * Centres d'intérêt.
 *
 * Le principe du jeu tient dans ce fichier : le moteur ne décrète jamais
 * « ce personnage devient informaticien ». Il calcule une *exposition* —
 * un ordinateur à la maison, un grand frère passionné, un club au lycée,
 * une bibliothèque à deux rues — puis laisse le goût grandir tout seul si
 * l'exposition dure et que le tempérament s'y prête.
 *
 * Chaque intérêt déclare donc :
 *
 *   `sources`  ce qui l'alimente, en signaux d'exposition (`systems/exposure.ts`) ;
 *   `traits`   les tendances de caractère qui le facilitent ;
 *   `values`   les valeurs qu'il nourrit en retour ;
 *   `careers`  les métiers vers lesquels il ouvre, une fois devenu compétence.
 *
 * Un goût seul ne fait pas un métier : il faut de la compétence, elle-même
 * lente à venir, et le reste de la simulation décide du reste.
 */

import type { StatKey } from '../engine/types.ts';
import type { PersonalityAxes, Values } from '../engine/psyche.ts';

export interface InterestDef {
  id: string;
  label: string;
  emoji: string;
  category: 'sport' | 'culture' | 'technique' | 'social' | 'nature' | 'intellect' | 'manuel';
  /** Signaux d'exposition et leur poids. */
  sources: Partial<Record<string, number>>;
  /** Traits qui favorisent l'apparition et la progression. */
  traits: Partial<Record<keyof PersonalityAxes, number>>;
  /** Valeurs renforcées par la pratique régulière. */
  values: Partial<Record<keyof Values, number>>;
  /** Effets annuels d'une pratique assidue. */
  effects: Partial<Record<StatKey, number>>;
  /** Catégories de métiers auxquelles la compétence donne accès. */
  careers: string[];
  /** Coût annuel indicatif, en part du revenu médian national. */
  cost: number;
  /** Équipement ou lieu indispensable — sinon l'intérêt plafonne. */
  needs?: string;
  description: string;
}

export const INTERESTS: InterestDef[] = [
  /* ---------------- Sport ---------------- */
  {
    id: 'football', label: 'Football', emoji: '⚽', category: 'sport',
    sources: { stade: 1, clubSport: 0.9, quartierSport: 0.6, amiSport: 0.8, écoleSport: 0.7, valeurSport: 0.5 },
    traits: { competitiveness: 0.5, sociability: 0.4, perseverance: 0.3 },
    values: { friendship: 0.4, achievement: 0.3 },
    effects: { fitness: 4, happiness: 2, health: 1 },
    careers: ['Sport'], cost: 0.012, needs: 'stade',
    description: 'Un terrain, vingt-deux personnes, et tout le reste qui s’efface.',
  },
  {
    id: 'course', label: 'Course à pied', emoji: '🏃', category: 'sport',
    sources: { parc: 0.8, nature: 0.7, jardin: 0.3, valeurSport: 0.6, trajetActif: 0.5 },
    traits: { discipline: 0.5, perseverance: 0.5, independence: 0.3 },
    values: { tranquillity: 0.3, achievement: 0.3 },
    effects: { fitness: 5, health: 2, stress: -3 },
    careers: ['Sport'], cost: 0.004,
    description: 'Personne à convaincre, rien à réserver. Sortir, c’est tout.',
  },
  {
    id: 'natation', label: 'Natation', emoji: '🏊', category: 'sport',
    sources: { piscine: 1, écoleSport: 0.5, valeurSport: 0.5 },
    traits: { discipline: 0.5, perseverance: 0.4 },
    values: { tranquillity: 0.3, achievement: 0.2 },
    effects: { fitness: 5, health: 3 },
    careers: ['Sport', 'Santé'], cost: 0.014, needs: 'piscine',
    description: 'L’eau assourdit tout. On y pense mieux qu’ailleurs.',
  },
  {
    id: 'artsMartiaux', label: 'Arts martiaux', emoji: '🥋', category: 'sport',
    sources: { clubSport: 0.9, gymnase: 0.6, amiSport: 0.5 },
    traits: { discipline: 0.6, courage: 0.5, aggression: 0.2 },
    values: { achievement: 0.3, independence: 0.3 },
    effects: { fitness: 4, discipline: 3, confidence: 2 } as Partial<Record<StatKey, number>>,
    careers: ['Sport', 'Sécurité & Défense'], cost: 0.018, needs: 'clubSport',
    description: 'Un tatami, un salut, et la certitude qu’on peut encaisser.',
  },
  {
    id: 'randonnée', label: 'Randonnée', emoji: '🥾', category: 'nature',
    sources: { nature: 1, jardin: 0.3, voitureFamiliale: 0.4, vacancesFamille: 0.5 },
    traits: { patience: 0.4, independence: 0.4, curiosity: 0.3 },
    values: { tranquillity: 0.5, adventure: 0.4 },
    effects: { fitness: 3, happiness: 3, stress: -4 },
    careers: ['Tourisme', 'Agriculture'], cost: 0.006, needs: 'nature',
    description: 'Marcher longtemps pour ne penser à rien.',
  },

  /* ---------------- Technique ---------------- */
  {
    id: 'informatique', label: 'Informatique', emoji: '💻', category: 'technique',
    sources: { ordinateur: 1, internet: 0.8, frèrePassionné: 0.7, clubScience: 0.6, amiPassionné: 0.6, écoleCulture: 0.3 },
    traits: { curiosity: 0.6, discipline: 0.3, creativity: 0.3, independence: 0.3 },
    values: { knowledge: 0.5, career: 0.3, money: 0.2 },
    effects: { intelligence: 3 },
    careers: ['Technologie', 'Sciences'], cost: 0.02, needs: 'ordinateur',
    description: 'Une machine qui fait exactement ce qu’on lui a dit — d’où le problème.',
  },
  {
    id: 'jeuxVidéo', label: 'Jeux vidéo', emoji: '🎮', category: 'technique',
    sources: { ordinateur: 0.9, internet: 0.7, frèrePassionné: 0.8, amiPassionné: 0.9, chambreÀSoi: 0.4 },
    traits: { curiosity: 0.3, perseverance: 0.3, competitiveness: 0.4, sociability: 0.2 },
    values: { friendship: 0.3, achievement: 0.2 },
    effects: { happiness: 4, fitness: -2 },
    careers: ['Technologie', 'Médias'], cost: 0.016, needs: 'ordinateur',
    description: 'Des mondes où l’effort paie toujours, contrairement à l’autre.',
  },
  {
    id: 'mécanique', label: 'Mécanique', emoji: '🔧', category: 'manuel',
    sources: { voitureFamiliale: 0.8, parentManuel: 0.9, jardin: 0.4, quartierOuvrier: 0.5 },
    traits: { discipline: 0.3, patience: 0.4, organisation: 0.3 },
    values: { independence: 0.4, money: 0.2 },
    effects: { intelligence: 1, discipline: 2 } as Partial<Record<StatKey, number>>,
    careers: ['Transport', 'Industrie', 'Bâtiment'], cost: 0.01,
    description: 'Comprendre une panne, c’est déjà l’avoir à moitié réparée.',
  },
  {
    id: 'bricolage', label: 'Bricolage', emoji: '🛠️', category: 'manuel',
    sources: { jardin: 0.6, parentManuel: 0.9, maisonIndividuelle: 0.5 },
    traits: { organisation: 0.4, patience: 0.4, creativity: 0.3 },
    values: { independence: 0.4, stability: 0.2 },
    effects: { discipline: 2 } as Partial<Record<StatKey, number>>,
    careers: ['Bâtiment', 'Industrie'], cost: 0.008,
    description: 'Le plaisir discret de réparer soi-même ce qui aurait coûté cher.',
  },

  /* ---------------- Culture ---------------- */
  {
    id: 'musique', label: 'Musique', emoji: '🎵', category: 'culture',
    sources: { instrument: 1, écoleMusique: 0.9, clubMusique: 0.7, parentMusicien: 0.8, valeurCréation: 0.5 },
    traits: { creativity: 0.6, discipline: 0.4, sensitivity: 0.3 },
    values: { creativity: 0.6, knowledge: 0.2 },
    effects: { happiness: 4, discipline: 2, intelligence: 1 } as Partial<Record<StatKey, number>>,
    careers: ['Arts & Spectacle', 'Médias'], cost: 0.022, needs: 'instrument',
    description: 'Des heures pour trois minutes qui tiennent debout.',
  },
  {
    id: 'lecture', label: 'Lecture', emoji: '📚', category: 'intellect',
    sources: { livres: 1, bibliothèque: 0.8, parentDiplômé: 0.6, valeurÉcole: 0.5, chambreÀSoi: 0.3 },
    traits: { curiosity: 0.6, patience: 0.4, creativity: 0.3 },
    values: { knowledge: 0.7, creativity: 0.3 },
    effects: { intelligence: 3, stress: -2 },
    careers: ['Éducation', 'Médias', 'Droit & Justice'], cost: 0.004,
    description: 'Le moyen le moins cher d’avoir vécu plusieurs vies.',
  },
  {
    id: 'écriture', label: 'Écriture', emoji: '✍️', category: 'culture',
    sources: { livres: 0.7, bibliothèque: 0.5, clubJournal: 0.9, chambreÀSoi: 0.4, ordinateur: 0.3 },
    traits: { creativity: 0.7, sensitivity: 0.4, independence: 0.3 },
    values: { creativity: 0.6, knowledge: 0.4 },
    effects: { intelligence: 2, happiness: 2 },
    careers: ['Médias', 'Arts & Spectacle', 'Éducation'], cost: 0.002,
    description: 'Écrire pour savoir ce qu’on pense.',
  },
  {
    id: 'dessin', label: 'Dessin et peinture', emoji: '🎨', category: 'culture',
    sources: { clubArt: 0.9, valeurCréation: 0.7, parentArtiste: 0.8, chambreÀSoi: 0.3 },
    traits: { creativity: 0.8, patience: 0.3, sensitivity: 0.3 },
    values: { creativity: 0.7 },
    effects: { happiness: 4, stress: -3 },
    careers: ['Arts & Spectacle', 'Médias'], cost: 0.008,
    description: 'Regarder vraiment, et se rendre compte qu’on n’avait jamais regardé.',
  },
  {
    id: 'théâtre', label: 'Théâtre', emoji: '🎭', category: 'social',
    sources: { clubThéâtre: 1, cinéma: 0.4, valeurCréation: 0.5, écoleCulture: 0.5 },
    traits: { extraversion: 0.6, creativity: 0.5, confidence: 0.4 },
    values: { creativity: 0.5, reputation: 0.3 },
    effects: { happiness: 4, reputation: 3, confidence: 3 } as Partial<Record<StatKey, number>>,
    careers: ['Arts & Spectacle', 'Médias', 'Éducation'], cost: 0.012, needs: 'clubThéâtre',
    description: 'Être quelqu’un d’autre deux heures par semaine, et respirer.',
  },
  {
    id: 'cinéma', label: 'Cinéma', emoji: '🎬', category: 'culture',
    sources: { cinéma: 1, internet: 0.5, amiPassionné: 0.4, valeurLoisirs: 0.4 },
    traits: { curiosity: 0.4, creativity: 0.4, sensitivity: 0.3 },
    values: { creativity: 0.4, knowledge: 0.2 },
    effects: { happiness: 3 },
    careers: ['Médias', 'Arts & Spectacle'], cost: 0.01,
    description: 'Deux heures dans le noir, à vivre la vie d’un autre.',
  },
  {
    id: 'mode', label: 'Mode et style', emoji: '👗', category: 'social',
    sources: { commerces: 0.8, centreCommercial: 0.7, amiPassionné: 0.6, réseaux: 0.6, valeurStatut: 0.6 },
    traits: { creativity: 0.4, extraversion: 0.4 },
    values: { status: 0.5, reputation: 0.4, creativity: 0.3 },
    effects: { looks: 3, reputation: 2 },
    careers: ['Commerce & Vente', 'Beauté & Bien-être', 'Médias'], cost: 0.03,
    description: 'S’habiller comme on voudrait être vu, jusqu’à finir par l’être.',
  },

  /* ---------------- Intellect ---------------- */
  {
    id: 'sciences', label: 'Sciences', emoji: '🔬', category: 'intellect',
    sources: { clubScience: 1, livres: 0.6, parentDiplômé: 0.6, écoleCulture: 0.5, bibliothèque: 0.4 },
    traits: { curiosity: 0.7, discipline: 0.4, perseverance: 0.4 },
    values: { knowledge: 0.8, career: 0.2 },
    effects: { intelligence: 4 },
    careers: ['Sciences', 'Santé', 'Technologie', 'Éducation'], cost: 0.008,
    description: 'Poser la bonne question compte plus que connaître la réponse.',
  },
  {
    id: 'histoire', label: 'Histoire', emoji: '🏺', category: 'intellect',
    sources: { livres: 0.8, bibliothèque: 0.7, musée: 0.8, voyages: 0.5, parentDiplômé: 0.4 },
    traits: { curiosity: 0.6, patience: 0.4 },
    values: { knowledge: 0.7 },
    effects: { intelligence: 3 },
    careers: ['Éducation', 'Fonction publique', 'Droit & Justice'], cost: 0.004,
    description: 'Comprendre que rien de ce qui arrive n’est tout à fait nouveau.',
  },
  {
    id: 'échecs', label: 'Échecs', emoji: '♟️', category: 'intellect',
    sources: { clubÉchecs: 1, parentDiplômé: 0.4, frèrePassionné: 0.5, ordinateur: 0.3 },
    traits: { patience: 0.6, discipline: 0.5, competitiveness: 0.4 },
    values: { knowledge: 0.4, achievement: 0.4 },
    effects: { intelligence: 4, discipline: 2 } as Partial<Record<StatKey, number>>,
    careers: ['Sciences', 'Finance', 'Technologie'], cost: 0.002,
    description: 'Perdre cent fois avant de comprendre pourquoi on perdait.',
  },
  {
    id: 'finance', label: 'Argent et placements', emoji: '📈', category: 'intellect',
    sources: { parentFinance: 0.8, internet: 0.6, valeurArgent: 0.8, précarité: 0.5, livres: 0.3 },
    traits: { discipline: 0.4, riskTolerance: 0.4, ambition: 0.4 },
    values: { money: 0.8, stability: 0.3, career: 0.3 },
    effects: { intelligence: 2 },
    careers: ['Finance', 'Immobilier', 'Commerce & Vente'], cost: 0.004,
    description: 'Une fois qu’on a compris les intérêts composés, on ne les oublie plus.',
  },

  /* ---------------- Social et nature ---------------- */
  {
    id: 'cuisine', label: 'Cuisine', emoji: '🍳', category: 'manuel',
    sources: { repasFamiliaux: 0.9, parentCuisinier: 0.8, jardin: 0.4, valeurFamille: 0.4 },
    traits: { creativity: 0.4, patience: 0.4, generosity: 0.3 },
    values: { family: 0.4, creativity: 0.3 },
    effects: { happiness: 3, health: 2 },
    careers: ['Restauration', 'Tourisme'], cost: 0.012,
    description: 'Nourrir les gens qu’on aime, et être là quand ils mangent.',
  },
  {
    id: 'animaux', label: 'Animaux', emoji: '🐕', category: 'nature',
    sources: { animalFamilier: 1, jardin: 0.6, nature: 0.5, quartierRural: 0.5 },
    traits: { empathy: 0.6, patience: 0.4, generosity: 0.3 },
    values: { solidarity: 0.4, tranquillity: 0.3 },
    effects: { happiness: 4, stress: -3 },
    careers: ['Agriculture', 'Santé', 'Services'], cost: 0.014,
    description: 'Une présence qui ne demande jamais de se justifier.',
  },
  {
    id: 'jardinage', label: 'Jardinage', emoji: '🌱', category: 'nature',
    sources: { jardin: 1, quartierRural: 0.7, grandParentProche: 0.6, nature: 0.4 },
    traits: { patience: 0.7, discipline: 0.3 },
    values: { tranquillity: 0.6, stability: 0.3 },
    effects: { happiness: 3, stress: -4, fitness: 1 },
    careers: ['Agriculture'], cost: 0.006, needs: 'jardin',
    description: 'Le seul domaine où s’impatienter ne sert strictement à rien.',
  },
  {
    id: 'voyages', label: 'Voyages', emoji: '✈️', category: 'culture',
    sources: { vacancesFamille: 1, voitureFamiliale: 0.3, internet: 0.3, valeurAventure: 0.7, écoleInternationale: 0.6 },
    traits: { curiosity: 0.6, adaptability: 0.5, courage: 0.3 },
    values: { adventure: 0.8, freedom: 0.5, knowledge: 0.3 },
    effects: { happiness: 5, intelligence: 2 },
    careers: ['Tourisme', 'Transport', 'Médias'], cost: 0.05,
    description: 'Découvrir que la façon dont on vivait n’était qu’une façon parmi d’autres.',
  },
  {
    id: 'bénévolat', label: 'Bénévolat', emoji: '🤝', category: 'social',
    sources: { clubBénévole: 1, cohésionQuartier: 0.7, valeurSolidarité: 0.8, parentBénévole: 0.7 },
    traits: { empathy: 0.7, generosity: 0.6 },
    values: { solidarity: 0.8, friendship: 0.3 },
    effects: { karma: 5, happiness: 3, reputation: 2 },
    careers: ['Santé', 'Services', 'Éducation', 'Fonction publique'], cost: 0.002,
    description: 'Donner du temps, et découvrir qu’on en avait.',
  },
  {
    id: 'réseauxSociaux', label: 'Réseaux sociaux', emoji: '📱', category: 'social',
    sources: { téléphonePersonnel: 1, internet: 0.8, amiPassionné: 0.6, valeurRéputation: 0.6 },
    traits: { extraversion: 0.4, creativity: 0.3, sensitivity: 0.3 },
    values: { reputation: 0.6, status: 0.5, friendship: 0.2 },
    effects: { reputation: 3, stress: 2, happiness: -1 },
    careers: ['Médias', 'Commerce & Vente'], cost: 0.006, needs: 'téléphonePersonnel',
    description: 'Une scène ouverte en permanence, avec le public dans la poche.',
  },
];

export const INTEREST_MAP: Record<string, InterestDef> = Object.fromEntries(
  INTERESTS.map((i) => [i.id, i]),
);

export function getInterest(id: string): InterestDef | undefined {
  return INTEREST_MAP[id];
}

/** Intérêts ouvrant sur une catégorie de métier donnée. */
export function interestsForCareer(category: string): InterestDef[] {
  return INTERESTS.filter((i) => i.careers.includes(category));
}
