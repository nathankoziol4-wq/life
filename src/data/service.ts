/**
 * Les corps où l'on sert : l'armée, le programme spatial, le service.
 *
 * Le catalogue avait sept feuilles absentes au même endroit, et elles
 * disaient toutes la même chose. « Militaire / Engagement » était une
 * formation dans `degrees.ts` et rien d'autre : ni grade, ni déploiement, ni
 * mission. « Astronaute » et « Agent secret » n'existaient pas du tout.
 *
 * Un seul cadre pour les trois, parce qu'ils ont exactement la même forme :
 * on est **sélectionné** et non embauché, on **se forme** avant d'être bon à
 * quelque chose, on **monte en grade** au mérite et à l'ancienneté, on part
 * en **mission** avec un risque réel, et on en **sort** un jour — avec les
 * honneurs ou sans. Écrire trois systèmes parallèles aurait produit trois
 * versions médiocres du même.
 *
 * Ce qui les sépare tient dans les données de ce fichier : ce qu'il faut pour
 * entrer, la longueur de la formation, ce qu'on risque, et la nature de
 * l'épreuve jouée.
 *
 * **Tout est fictif.** Le service de renseignement n'a pas de nom réel, ses
 * missions ne décrivent aucune méthode, et l'épreuve d'infiltration est une
 * jauge d'attention et un curseur — un jeu d'adresse habillé, dont on ne peut
 * rien tirer d'applicable. Il en va de même des déploiements militaires, qui
 * ne portent ni lieu réel, ni camp, ni technique.
 */

/** Ce qu'il faut avoir pour être seulement regardé. */
export interface CorpsNeeds {
  fitness: number;
  health: number;
  intelligence: number;
  discipline: number;
}

export interface Corps {
  id: string;
  /** Le métier, tel qu'il apparaît dans le parcours. */
  label: string;
  /** Comment on nomme la maison : « l'armée », « l'agence », « le service ». */
  house: string;
  /** Le bouton d'entrée : « S'engager », « Postuler », « Accepter ». */
  entryLabel: string;
  /** Le mot pour une mission : « déploiement », « vol », « opération ». */
  dutyName: string;
  /** Le mot pour la formation : « classes », « entraînement », « instruction ». */
  trainingName: string;
  /** Ce qui remplace le nom du métier auprès des autres, s'il y a couverture. */
  cover: string | null;
  minAge: number;
  maxAge: number;
  needs: CorpsNeeds;
  /** Faut-il un diplôme du supérieur ? */
  needsDegree: boolean;
  /** Un casier ferme-t-il la porte ? */
  cleanRecord: boolean;
  /**
   * On n'y postule pas : on y est approché.
   *
   * C'est ce qui distingue un service de renseignement d'un employeur. La
   * porte ne s'ouvre que si l'on a déjà, sans le savoir, le profil qu'on
   * cherche — et elle se referme si l'on se fait remarquer entre-temps.
   */
  recruitedOnly: boolean;
  /** Années avant d'être opérationnel. */
  trainingYears: number;
  /** Le mini-jeu des missions. */
  game: string;
  /** Solde annuelle de référence, avant grade et pays. */
  basePay: number;
  /** Ce que le service coûte au moral chaque année. */
  strain: number;
  /** Ce qu'on y risque, 0-1. Multiplie le danger de chaque mission. */
  peril: number;
  /** Ce que le service fait à la notoriété quand il se passe bien. */
  renown: number;
}

export const CORPS: Corps[] = [
  {
    id: 'armee',
    label: 'Militaire',
    house: 'l’armée',
    entryLabel: 'S’engager',
    dutyName: 'déploiement',
    trainingName: 'les classes',
    cover: null,
    minAge: 18,
    maxAge: 34,
    needs: { fitness: 45, health: 50, intelligence: 30, discipline: 45 },
    needsDegree: false,
    cleanRecord: false,
    recruitedOnly: false,
    trainingYears: 1,
    game: 'infiltration',
    basePay: 26_000,
    strain: 5,
    peril: 0.55,
    renown: 0.4,
  },
  {
    id: 'orbite',
    label: 'Astronaute',
    house: 'le programme spatial',
    entryLabel: 'Postuler',
    dutyName: 'vol',
    trainingName: 'l’entraînement',
    cover: null,
    minAge: 27,
    maxAge: 46,
    needs: { fitness: 62, health: 70, intelligence: 68, discipline: 60 },
    needsDegree: true,
    cleanRecord: true,
    recruitedOnly: false,
    trainingYears: 3,
    game: 'docking',
    basePay: 62_000,
    strain: 4,
    peril: 0.7,
    renown: 1.5,
  },
  {
    id: 'ombre',
    label: 'Agent',
    house: 'le service',
    entryLabel: 'Accepter',
    dutyName: 'opération',
    trainingName: 'l’instruction',
    // La couverture : ce que les autres croient que vous faites. Sans elle,
    // le métier serait un métier comme un autre avec un nom mystérieux.
    cover: 'Attaché administratif',
    minAge: 24,
    maxAge: 42,
    needs: { fitness: 50, health: 55, intelligence: 62, discipline: 55 },
    needsDegree: false,
    cleanRecord: true,
    recruitedOnly: true,
    trainingYears: 2,
    game: 'infiltration',
    basePay: 41_000,
    strain: 8,
    peril: 0.85,
    // On ne devient pas célèbre dans ce métier-là. C'est même l'inverse.
    renown: 0,
  },
];

export function getCorps(id: string): Corps | undefined {
  return CORPS.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Les grades                                                          */
/* ------------------------------------------------------------------ */

/**
 * Un échelon.
 *
 * Deux conditions, et il faut les deux : la **réputation** dans la maison,
 * qui vient des missions, et l'**ancienneté**, qui ne vient que du temps.
 * C'est ce qui empêche un joueur brillant de finir général en quatre ans, et
 * ce qui empêche un joueur médiocre d'y arriver en restant assis.
 */
export interface Rank {
  id: string;
  corps: string;
  label: string;
  /** Réputation nécessaire, 0-100. */
  standing: number;
  /** Années de service nécessaires. */
  years: number;
  /** Multiplicateur de solde. */
  pay: number;
  /** Ce que le grade autorise comme missions, 0-100. */
  clearance: number;
}

export const RANKS: Rank[] = [
  // L'armée : la montée est longue, régulière, et le haut est étroit.
  { id: 'a1', corps: 'armee', label: 'Recrue', standing: 0, years: 0, pay: 0.62, clearance: 20 },
  { id: 'a2', corps: 'armee', label: 'Soldat de première classe', standing: 18, years: 2, pay: 0.82, clearance: 35 },
  { id: 'a3', corps: 'armee', label: 'Caporal', standing: 34, years: 5, pay: 1, clearance: 50 },
  { id: 'a4', corps: 'armee', label: 'Sergent', standing: 50, years: 9, pay: 1.28, clearance: 65 },
  { id: 'a5', corps: 'armee', label: 'Lieutenant', standing: 65, years: 14, pay: 1.7, clearance: 80 },
  { id: 'a6', corps: 'armee', label: 'Commandant', standing: 79, years: 20, pay: 2.3, clearance: 92 },
  { id: 'a7', corps: 'armee', label: 'Général', standing: 91, years: 28, pay: 3.4, clearance: 100 },

  // Le spatial : peu d'échelons, et le premier vol est déjà un sommet.
  { id: 'o1', corps: 'orbite', label: 'Candidat', standing: 0, years: 0, pay: 0.7, clearance: 25 },
  { id: 'o2', corps: 'orbite', label: 'Astronaute', standing: 24, years: 3, pay: 1, clearance: 55 },
  { id: 'o3', corps: 'orbite', label: 'Pilote', standing: 46, years: 7, pay: 1.35, clearance: 75 },
  { id: 'o4', corps: 'orbite', label: 'Commandant de bord', standing: 66, years: 12, pay: 1.8, clearance: 90 },
  { id: 'o5', corps: 'orbite', label: 'Chef de programme', standing: 85, years: 19, pay: 2.5, clearance: 100 },

  // Le service : on ne monte pas, on s'enfonce. Les libellés le disent.
  { id: 's1', corps: 'ombre', label: 'Stagiaire', standing: 0, years: 0, pay: 0.65, clearance: 20 },
  { id: 's2', corps: 'ombre', label: 'Agent traitant', standing: 20, years: 2, pay: 0.95, clearance: 40 },
  { id: 's3', corps: 'ombre', label: 'Officier de renseignement', standing: 40, years: 6, pay: 1.3, clearance: 62 },
  { id: 's4', corps: 'ombre', label: 'Chef de poste', standing: 60, years: 11, pay: 1.75, clearance: 82 },
  { id: 's5', corps: 'ombre', label: 'Directeur des opérations', standing: 82, years: 18, pay: 2.4, clearance: 100 },
];

export function ranksFor(corpsId: string): Rank[] {
  return RANKS.filter((r) => r.corps === corpsId);
}

/* ------------------------------------------------------------------ */
/* Les missions                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on peut vous confier.
 *
 * Le même arbitrage que pour les métiers de scène, mais avec une troisième
 * dimension qui change tout : le **danger**. Une mission peut rapporter
 * beaucoup et vous coûter la santé, ou la vie. C'est ce qui distingue servir
 * d'exercer.
 *
 * Aucun libellé ne renvoie à un lieu réel, à un camp, ni à une méthode.
 */
export interface Duty {
  id: string;
  corps: string;
  label: string;
  /** Une phrase de mise en situation. */
  note: string;
  /** Ce que la mission demande, 0-100. */
  demands: number;
  /** Le grade minimal, en habilitation. */
  clearance: number;
  /** Le danger propre, 0-1. */
  danger: number;
  /** Prime, en multiple de la solde mensuelle de référence. */
  bounty: number;
  /** Ce que la réussite fait à la réputation dans la maison. */
  standing: number;
  /** Combien d'années elle occupe. La plupart : une. */
  span: number;
}

export const DUTIES: Duty[] = [
  /* --- L'armée -------------------------------------------------- */
  {
    id: 'garde', corps: 'armee', label: 'Une garde', demands: 12, clearance: 0,
    danger: 0.05, bounty: 0.3, standing: 3, span: 1,
    note: 'Rien ne se passera. C’est le métier aussi.',
  },
  {
    id: 'manoeuvre', corps: 'armee', label: 'Une manœuvre', demands: 28, clearance: 20,
    danger: 0.1, bounty: 0.6, standing: 6, span: 1,
    note: 'On répète ce qu’on espère ne jamais faire.',
  },
  {
    id: 'secours', corps: 'armee', label: 'Une mission de secours', demands: 40, clearance: 30,
    danger: 0.25, bounty: 0.7, standing: 14, span: 1,
    note: 'Des gens attendent, et le temps compte plus que vous.',
  },
  {
    id: 'escorte', corps: 'armee', label: 'Une escorte', demands: 52, clearance: 45,
    danger: 0.4, bounty: 1.6, standing: 13, span: 1,
    note: 'Amener quelque chose d’un point à un autre, sans rien perdre.',
  },
  {
    id: 'reco', corps: 'armee', label: 'Une reconnaissance', demands: 63, clearance: 55,
    danger: 0.5, bounty: 2.2, standing: 17, span: 1,
    note: 'Aller voir, et revenir sans avoir été vu.',
  },
  {
    id: 'deploiement', corps: 'armee', label: 'Un déploiement long', demands: 74, clearance: 65,
    danger: 0.62, bounty: 4, standing: 24, span: 2,
    note: 'Deux ans loin de tout le monde. On revient différent.',
  },
  {
    id: 'commandement', corps: 'armee', label: 'Un commandement de terrain', demands: 85, clearance: 80,
    danger: 0.7, bounty: 5.5, standing: 30, span: 1,
    note: 'D’autres suivront ce que vous déciderez.',
  },
  {
    id: 'etatmajor', corps: 'armee', label: 'Un poste d’état-major', demands: 92, clearance: 92,
    danger: 0.12, bounty: 6, standing: 18, span: 2,
    note: 'On ne risque plus rien, sauf de se tromper très largement.',
  },

  /* --- Le programme spatial ------------------------------------- */
  {
    id: 'simulateur', corps: 'orbite', label: 'Une session de simulateur', demands: 20, clearance: 0,
    danger: 0.02, bounty: 0.3, standing: 4, span: 1,
    note: 'Tout est faux, sauf ce qu’on apprend de soi.',
  },
  {
    id: 'centrifugeuse', corps: 'orbite', label: 'Les essais physiologiques', demands: 34, clearance: 20,
    danger: 0.12, bounty: 0.5, standing: 7, span: 1,
    note: 'On cherche à quel moment vous lâchez. Vous aussi.',
  },
  {
    id: 'doublure', corps: 'orbite', label: 'Doublure d’équipage', demands: 46, clearance: 40,
    danger: 0.08, bounty: 1.4, standing: 6, span: 1,
    note: 'Tout préparer, et regarder partir quelqu’un d’autre.',
  },
  {
    id: 'vol', corps: 'orbite', label: 'Un premier vol', demands: 58, clearance: 50,
    danger: 0.45, bounty: 3, standing: 22, span: 1,
    note: 'Après ça, on n’est plus quelqu’un qui postule.',
  },
  {
    id: 'sortie', corps: 'orbite', label: 'Une sortie extravéhiculaire', demands: 72, clearance: 70,
    danger: 0.6, bounty: 4.2, standing: 27, span: 1,
    note: 'Dehors, il n’y a que ce que vous tenez.',
  },
  {
    id: 'sejour', corps: 'orbite', label: 'Un séjour de longue durée', demands: 80, clearance: 75,
    danger: 0.5, bounty: 3.6, standing: 32, span: 2,
    note: 'Un an à six personnes, dans le volume d’un appartement.',
  },
  {
    id: 'reparation', corps: 'orbite', label: 'Une réparation d’urgence', demands: 90, clearance: 88,
    danger: 0.78, bounty: 7, standing: 38, span: 1,
    note: 'Quelque chose a lâché, et personne ne viendra.',
  },
  {
    id: 'lointain', corps: 'orbite', label: 'Une mission lointaine', demands: 96, clearance: 98,
    danger: 0.72, bounty: 12, standing: 45, span: 3,
    note: 'Trois ans. Ceux qui restent vieilliront sans vous.',
  },

  /* --- Le service ----------------------------------------------- */
  {
    id: 'ecoute', corps: 'ombre', label: 'De l’analyse', demands: 18, clearance: 0,
    danger: 0.03, bounty: 0.3, standing: 4, span: 1,
    note: 'Lire beaucoup, et remarquer une chose.',
  },
  {
    id: 'filature', corps: 'ombre', label: 'Une filature', demands: 32, clearance: 20,
    danger: 0.2, bounty: 0.7, standing: 8, span: 1,
    note: 'Rester derrière quelqu’un sans jamais devenir quelqu’un.',
  },
  {
    id: 'legende', corps: 'ombre', label: 'Tenir une légende', demands: 45, clearance: 35,
    danger: 0.35, bounty: 1.2, standing: 12, span: 1,
    note: 'Vivre un an dans une vie qui n’est pas la vôtre.',
  },
  {
    id: 'contact', corps: 'ombre', label: 'Recruter une source', demands: 56, clearance: 45,
    danger: 0.42, bounty: 1.9, standing: 16, span: 1,
    note: 'Convaincre quelqu’un que vous êtes son seul recours.',
  },
  {
    id: 'exfiltration', corps: 'ombre', label: 'Une exfiltration', demands: 70, clearance: 62,
    danger: 0.65, bounty: 3.4, standing: 24, span: 1,
    note: 'Faire sortir quelqu’un, et sortir aussi.',
  },
  {
    id: 'poste', corps: 'ombre', label: 'Un poste à l’étranger', demands: 78, clearance: 70,
    danger: 0.5, bounty: 5.2, standing: 20, span: 2,
    note: 'Deux ans, une ville, et personne à qui le dire.',
  },
  {
    id: 'taupe', corps: 'ombre', label: 'Une affaire interne', demands: 88, clearance: 82,
    danger: 0.55, bounty: 2.8, standing: 34, span: 1,
    note: 'Quelqu’un de la maison parle. On vous demande qui.',
  },
  {
    id: 'longue', corps: 'ombre', label: 'Une immersion longue', demands: 94, clearance: 95,
    danger: 0.8, bounty: 8, standing: 42, span: 3,
    note: 'Trois ans sans retour, et l’on ne saura pas si c’est fini.',
  },
];

export function dutiesFor(corpsId: string): Duty[] {
  return DUTIES.filter((d) => d.corps === corpsId).sort((a, b) => a.demands - b.demands);
}

export function getDuty(id: string): Duty | undefined {
  return DUTIES.find((d) => d.id === id);
}

/* ------------------------------------------------------------------ */
/* Les distinctions                                                    */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on accroche, ou ce qui reste dans un dossier que personne ne lira.
 *
 * Le service ne décore pas comme la scène récompense : une distinction ici
 * dit ce qu'on a traversé, pas ce qu'on a bien fait. Certaines ne se donnent
 * qu'aux blessés.
 */
export interface Decoration {
  id: string;
  corps: string;
  label: string;
  note: string;
  /** Conditions. Toutes celles qui sont renseignées doivent être remplies. */
  needs: {
    standing?: number;
    duties?: number;
    years?: number;
    rank?: string;
    /** Obtenue seulement si l'on a été blessé au moins une fois. */
    wounded?: boolean;
    /** Obtenue seulement sur une mission au danger au moins égal. */
    danger?: number;
  };
}

export const DECORATIONS: Decoration[] = [
  {
    id: 'a_engagement', corps: 'armee', label: 'Médaille de l’engagement',
    note: 'Cinq ans. Beaucoup s’arrêtent avant.', needs: { years: 5 },
  },
  {
    id: 'a_blesse', corps: 'armee', label: 'Insigne des blessés',
    note: 'On ne la demande pas.', needs: { wounded: true },
  },
  {
    id: 'a_bravoure', corps: 'armee', label: 'Citation pour bravoure',
    note: 'Une mission dont on ne parle qu’à demi-mot.', needs: { danger: 0.6, standing: 55 },
  },
  {
    id: 'a_carriere', corps: 'armee', label: 'Ordre du mérite militaire',
    note: 'Une carrière entière, sans faute visible.', needs: { rank: 'a6', standing: 82 },
  },

  {
    id: 'o_ailes', corps: 'orbite', label: 'Insigne de vol',
    note: 'Après le premier, on ne redevient jamais candidat.', needs: { duties: 1, standing: 24 },
  },
  {
    id: 'o_sortie', corps: 'orbite', label: 'Mention de sortie',
    note: 'Une heure dehors change le reste.', needs: { danger: 0.55, standing: 45 },
  },
  {
    id: 'o_duree', corps: 'orbite', label: 'Record de durée',
    note: 'Le corps a payé pour ce chiffre.', needs: { years: 10, duties: 5 },
  },
  {
    id: 'o_honneur', corps: 'orbite', label: 'Distinction nationale',
    note: 'Un nom que les écoliers apprendront peut-être.', needs: { rank: 'o4', standing: 78 },
  },

  {
    id: 's_etoile', corps: 'ombre', label: 'Une étoile sans nom',
    note: 'Un mur, une étoile, aucun nom en dessous.', needs: { wounded: true, standing: 40 },
  },
  {
    id: 's_source', corps: 'ombre', label: 'Mention au dossier',
    note: 'Trois lignes que personne ne lira jamais.', needs: { duties: 4, standing: 35 },
  },
  {
    id: 's_silence', corps: 'ombre', label: 'Reconnaissance interne',
    note: 'On vous serre la main dans un couloir.', needs: { danger: 0.6, standing: 60 },
  },
  {
    id: 's_maison', corps: 'ombre', label: 'La confiance de la maison',
    note: 'Le seul honneur du métier : qu’on vous laisse continuer.', needs: { rank: 's4', standing: 80 },
  },
];

export function decorationsFor(corpsId: string): Decoration[] {
  return DECORATIONS.filter((d) => d.corps === corpsId);
}

/* ------------------------------------------------------------------ */
/* Sortir                                                              */
/* ------------------------------------------------------------------ */

/** Comment se termine un service, et ce que ça laisse. */
export interface Discharge {
  id: string;
  label: string;
  note: string;
  /** Réputation minimale pour y avoir droit. */
  standing: number;
  /** Fraction de la solde versée à vie. */
  pension: number;
}

export const DISCHARGES: Discharge[] = [
  {
    id: 'honneur', label: 'Départ avec les honneurs', standing: 55, pension: 0.42,
    note: 'On vous doit quelque chose, et on le paie.',
  },
  {
    id: 'terme', label: 'Fin de contrat', standing: 20, pension: 0.18,
    note: 'Vous avez fait ce qu’on vous demandait.',
  },
  {
    id: 'reforme', label: 'Réforme', standing: 0, pension: 0.08,
    note: 'On vous remercie sans le dire.',
  },
];

export function dischargeFor(standing: number): Discharge {
  return DISCHARGES.find((d) => standing >= d.standing) ?? DISCHARGES[DISCHARGES.length - 1];
}

/** Comment se lit la réputation dans la maison. */
export function standingLabel(standing: number): string {
  if (standing < 15) return 'On ne vous connaît pas';
  if (standing < 35) return 'On vous laisse faire';
  if (standing < 55) return 'On compte sur vous';
  if (standing < 75) return 'On vous confie ce qui compte';
  if (standing < 90) return 'On vous écoute';
  return 'On vous suit';
}
