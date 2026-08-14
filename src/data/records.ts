/**
 * Le disque, et la route.
 *
 * Trois reproches du catalogue, tous sur la musique, et tous du même ordre :
 *
 * - « Sortir un titre ou un album » était `PARTIAL` — « le titre et l'album
 *   sont des engagements avec un accueil ; **ni ventes, ni classement** » ;
 * - « Maison de disques » était `PLACEHOLDER` — « la maison qui propose est
 *   **une formule**, pas une entité avec un contrat » ;
 * - « Tournée » était `PARTIAL` — « la tournée existe et épuise, mais **sans
 *   dates ni salles à choisir** ».
 *
 * Ce qui manquait tient en une phrase : **ce qu'on enregistre ne vivait pas
 * après avoir été enregistré**. Un album était une soirée bien ou mal passée,
 * et le lendemain il n'en restait rien. Ici, une sortie a un classement qui
 * monte puis retombe, elle paie des droits pendant des années, elle décide de
 * ce qu'on vous propose ensuite, et elle remplit — ou vide — les salles d'une
 * tournée.
 *
 * Rien de tout cela n'imite un catalogue réel : les formats, les maisons et
 * les salles sont génériques, et aucun nom n'appartient à personne.
 */

/* ------------------------------------------------------------------ */
/* Ce qu'on sort                                                       */
/* ------------------------------------------------------------------ */

/** Un format de sortie. */
export interface Format {
  id: string;
  label: string;
  /** Ce que c'est, en une phrase. */
  what: string;
  /** Métier nécessaire pour s'y mettre. */
  craft: number;
  /** Ce que produire coûte, en unités de cachet. */
  cost: number;
  /**
   * Combien il porte loin.
   *
   * Un titre monte vite et retombe vite ; un album met plus longtemps et
   * reste. C'est ce qui rend le choix du format intéressant plutôt que
   * cosmétique.
   */
  reach: number;
  /** Vitesse à laquelle il quitte le classement. Bas = il dure. */
  decay: number;
  /** Ce qu'une place au classement rapporte, en unités de cachet. */
  royalty: number;
  /** Ce que la sortie fait au métier. */
  growth: number;
  /** Combien d'années il faut pour le produire. */
  span: number;
}

export const FORMATS: Format[] = [
  {
    id: 'demo', label: 'Une maquette', what: 'Trois titres enregistrés dans une cave',
    craft: 8, cost: 0.3, reach: 0.35, decay: 0.55, royalty: 0.4, growth: 5, span: 1,
  },
  {
    id: 'single', label: 'Un titre', what: 'Trois minutes qui décideront de l’année',
    craft: 25, cost: 1.2, reach: 1, decay: 0.45, royalty: 1.4, growth: 7, span: 1,
  },
  {
    id: 'ep', label: 'Un format court', what: 'Cinq titres, assez pour dire quelque chose',
    craft: 40, cost: 2.4, reach: 1.15, decay: 0.32, royalty: 2.2, growth: 10, span: 1,
  },
  {
    id: 'album', label: 'Un album', what: 'Six mois enfermé pour quelque chose qui restera',
    craft: 55, cost: 5, reach: 1.35, decay: 0.2, royalty: 4.5, growth: 15, span: 2,
  },
  {
    id: 'live', label: 'Un disque en public', what: 'Ce qu’on a joué le soir où c’était bien',
    craft: 62, cost: 1.8, reach: 0.9, decay: 0.28, royalty: 2, growth: 6, span: 1,
  },
  {
    id: 'oeuvre', label: 'Une œuvre longue', what: 'Trois ans, et personne ne sait ce que ce sera',
    craft: 78, cost: 9, reach: 1.5, decay: 0.12, royalty: 7, growth: 22, span: 3,
  },
];

export function getFormat(id: string): Format | undefined {
  return FORMATS.find((f) => f.id === id);
}

/**
 * Comment se lit une place au classement.
 *
 * Les seuils sont ce qui donne son sens au chiffre : entrer dans les cent
 * premiers n'est rien, entrer dans les dix change ce qu'on vous propose.
 */
export function chartLabel(rank: number): string {
  if (rank <= 0 || rank > 200) return 'Jamais entré';
  if (rank === 1) return 'Numéro un';
  if (rank <= 3) return 'Sur le podium';
  if (rank <= 10) return 'Dans les dix';
  if (rank <= 40) return 'Dans les quarante';
  if (rank <= 100) return 'Dans les cent';
  return 'Tout en bas';
}

/* ------------------------------------------------------------------ */
/* La maison                                                           */
/* ------------------------------------------------------------------ */

/**
 * Une maison de disques.
 *
 * L'arbitrage est toujours le même et il n'a pas de bonne réponse : une
 * grande maison pousse fort et prend beaucoup, une petite laisse libre et ne
 * peut rien pour vous. Entre les deux, on choisit ce qu'on préfère perdre.
 */
export interface Label {
  id: string;
  label: string;
  what: string;
  /** Métier nécessaire pour qu'on vous propose ce niveau-là. */
  craft: number;
  /** Notoriété nécessaire. */
  fame: number;
  /** Ce qu'ils prennent sur tout, 0-1. */
  cut: number;
  /** Ce qu'ils avancent à la signature, en unités de cachet. */
  advance: number;
  /** Ce qu'ils font gagner au classement, en multiplicateur de portée. */
  push: number;
  /** Combien de sorties ils exigent. */
  owed: number;
  /**
   * Ce qu'ils imposent, 0-1.
   *
   * Une grande maison décide du format et du calendrier. C'est le vrai prix,
   * et il ne se compte pas en argent.
   */
  control: number;
}

export const LABELS: Label[] = [
  {
    id: 'auto', label: 'À ton compte', what: 'Personne ne décide à ta place, et personne ne t’aide',
    craft: 0, fame: 0, cut: 0, advance: 0, push: 1, owed: 0, control: 0,
  },
  {
    id: 'indep', label: 'Un petit label', what: 'Quatre personnes qui y croient, et pas d’argent',
    craft: 28, fame: 4, cut: 0.18, advance: 3, push: 1.35, owed: 2, control: 0.25,
  },
  {
    id: 'moyen', label: 'Une maison installée', what: 'De vrais moyens, et un avis sur tout',
    craft: 48, fame: 18, cut: 0.32, advance: 12, push: 1.9, owed: 3, control: 0.55,
  },
  {
    id: 'major', label: 'Une grande maison', what: 'Tout ce qu’il faut pour réussir, et rien à toi',
    craft: 68, fame: 40, cut: 0.45, advance: 40, push: 2.8, owed: 4, control: 0.85,
  },
];

export function getLabel(id: string): Label | undefined {
  return LABELS.find((l) => l.id === id);
}

/* ------------------------------------------------------------------ */
/* La route                                                            */
/* ------------------------------------------------------------------ */

/**
 * Une taille de salle.
 *
 * Le pari de toute tournée : réserver plus grand que ce qu'on remplit paie
 * beaucoup si le public suit, et coûte la salle vide s'il ne suit pas. Le
 * jeu est de savoir ce qu'on vaut — ce que personne ne sait vraiment.
 */
export interface Venue {
  id: string;
  label: string;
  /** Combien de gens il faut pouvoir attirer pour la remplir. */
  draw: number;
  /** Places, pour l'affichage. */
  seats: number;
  /** Ce qu'une date pleine rapporte, en unités de cachet. */
  gross: number;
  /** Ce qu'une date coûte à monter, qu'elle se remplisse ou non. */
  cost: number;
  /** Ce qu'une date prend au corps. */
  toll: number;
}

export const VENUES: Venue[] = [
  { id: 'bar', label: 'Un bar', draw: 4, seats: 80, gross: 0.25, cost: 0.05, toll: 2 },
  { id: 'club', label: 'Une salle de concert', draw: 18, seats: 500, gross: 1.1, cost: 0.35, toll: 3 },
  { id: 'theatre', label: 'Un théâtre', draw: 34, seats: 1_400, gross: 2.6, cost: 0.9, toll: 4 },
  { id: 'zenith', label: 'Une grande salle', draw: 58, seats: 6_000, gross: 8, cost: 3.2, toll: 6 },
  { id: 'arena', label: 'Une aréna', draw: 76, seats: 18_000, gross: 22, cost: 10, toll: 8 },
  { id: 'stade', label: 'Un stade', draw: 90, seats: 55_000, gross: 62, cost: 32, toll: 11 },
];

export function getVenue(id: string): Venue | undefined {
  return VENUES.find((v) => v.id === id);
}

/** Combien de dates on peut poser au maximum. */
export const MAX_DATES = 24;

/**
 * Ce que la fatigue fait à une tournée.
 *
 * Au-delà d'un certain nombre de dates, on ne joue plus aussi bien et l'on
 * finit par annuler. C'est ce qui empêche de simplement poser vingt-quatre
 * stades — la seule stratégie qui existerait sans cela.
 */
export function tourStrain(dates: number, fitness: number): number {
  const room = 6 + (fitness / 100) * 10;
  return Math.max(0, dates - room) * 3.5;
}

/** Comment se lit le remplissage d'une salle. */
export function fillLabel(fill: number): string {
  if (fill >= 0.98) return 'Complet';
  if (fill >= 0.8) return 'Presque plein';
  if (fill >= 0.55) return 'Bien rempli';
  if (fill >= 0.3) return 'Des trous';
  return 'Une salle vide';
}
