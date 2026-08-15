/**
 * Odyssia — modèles de données du moteur.
 * Ce fichier ne contient AUCUNE logique : uniquement les formes de données
 * partagées entre les systèmes (`src/systems`) et l'interface (`src/components`).
 */

import type {
  AcquiredTraits, Appearance, Genetics, WorldOrigin,
} from './origin.ts';
import type { Psyche } from './psyche.ts';
import type { ContextEffect } from '../systems/causality.ts';

export type Sex = 'M' | 'F';
export type Orientation = 'hetero' | 'homo' | 'bi';

/** Statistiques du personnage, toutes bornées entre 0 et 100. */
export interface Stats {
  /** Visible — moral général. */
  happiness: number;
  /** Visible — état physique global. */
  health: number;
  /** Visible — capacités cognitives. */
  intelligence: number;
  /** Visible — apparence physique. */
  looks: number;
  /** Interne — pression mentale accumulée. */
  stress: number;
  /** Interne — capacité à tenir ses engagements. */
  discipline: number;
  /** Interne — équilibre moral des actions passées. */
  karma: number;
  /** Interne — image publique. */
  reputation: number;
  /** Interne — condition physique. */
  fitness: number;
  /** Interne — niveau de dépendance (alcool, jeu, substances). */
  addiction: number;
  /** Interne — propension et compétence criminelle. */
  criminality: number;
  /** Interne — capacité à concevoir un enfant. */
  fertility: number;
}

export type StatKey = keyof Stats;

/** Traits de personnalité d'un PNJ (0-100). Stables dans le temps. */
export interface Personality {
  /** Chaleur humaine, gentillesse. */
  warmth: number;
  /** Ambition professionnelle. */
  ambition: number;
  /** Irascibilité. */
  temper: number;
  /** Loyauté / fidélité. */
  loyalty: number;
  /** Générosité financière. */
  generosity: number;
  /** Instabilité mentale. */
  madness: number;
  /** Rigueur. */
  discipline: number;
  /** Religiosité. */
  religiosity: number;
  /** Sociabilité. */
  sociability: number;
}

export type RelationKind =
  | 'father'
  | 'mother'
  | 'stepfather'
  | 'stepmother'
  | 'grandfather'
  | 'grandmother'
  | 'uncle'
  | 'aunt'
  | 'cousin'
  | 'brother'
  | 'sister'
  | 'son'
  | 'daughter'
  | 'grandson'
  | 'granddaughter'
  | 'partner'
  | 'spouse'
  | 'ex'
  | 'crush'
  | 'friend'
  | 'bestFriend'
  | 'coworker'
  | 'boss'
  | 'classmate'
  | 'teacher'
  | 'inmate'
  | 'lawyer'
  | 'acquaintance';

/** Une note dans l'historique personnel d'un PNJ. */
export interface PersonEvent {
  year: number;
  text: string;
}

/**
 * Un PNJ persistant. Chaque personnage rencontré est enregistré durablement
 * dans la sauvegarde : il vieillit, évolue et peut mourir même hors écran.
 */
export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  sex: Sex;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  age: number;
  alive: boolean;
  deathYear?: number;
  deathCause?: string;

  stats: Stats;
  personality: Personality;
  /**
   * Personnalité complète, réservée aux PNJ qui comptent — famille, conjoint,
   * amis proches. Les figurants s'en passent : ce serait des kilo-octets de
   * sauvegarde pour des personnages qu'on croise une fois.
   */
  psyche?: Psyche;
  orientation: Orientation;

  /** Nature du lien avec le joueur. */
  relation: RelationKind;
  /** Qualité du lien 0-100 (barre de relation). */
  relationship: number;
  /** Ce que le PNJ pense du joueur, 0-100. Diverge de `relationship`. */
  opinion: number;

  wealth: number;
  jobTitle: string | null;
  salary: number;
  maritalStatus: 'single' | 'dating' | 'engaged' | 'married' | 'divorced' | 'widowed';

  parentIds: string[];
  childrenIds: string[];
  partnerId: string | null;
  exPartnerIds: string[];

  /** Année de rencontre avec le joueur. */
  metYear: number;
  /** Dernière année où le joueur a interagi. */
  lastInteractionYear: number;
  /** Interactions déjà faites cette année (limite l'abus d'actions). */
  interactionsThisYear: number;
  /** Le PNJ a-t-il coupé les ponts ? */
  estranged: boolean;
  /** Est-il en prison ? */
  incarcerated: boolean;
  /** Historique personnel. */
  history: PersonEvent[];
  /** Espèce, si le PNJ est un animal de compagnie. */
  petSpecies?: string;
  /** Marqueurs libres (ex: 'cheated', 'knowsSecret'). */
  flags: Record<string, boolean | number | string>;
}

export type EducationStage =
  | 'none'
  | 'nursery'
  | 'primary'
  | 'middle'
  | 'high'
  | 'university'
  | 'graduate'
  | 'vocational'
  | 'graduated'
  | 'dropout';

/**
 * Le dossier de comportement.
 *
 * Il existe pour que les écarts aient une mémoire : sécher une fois n'est pas
 * sécher dix fois, et l'établissement ne réagit pas à un incident isolé comme
 * à une accumulation. C'est ce qui permet une escalade — avertissement,
 * retenue, convocation des parents, exclusion — au lieu d'un tirage à chaque
 * bêtise.
 */
export interface Discipline {
  /** Comportement perçu par l'établissement, 0-100. */
  behaviour: number;
  /** Écarts commis cette année : sèche, insolence, bagarre. */
  incidentsThisYear: number;
  warnings: number;
  detentions: number;
  suspensions: number;
  /** Exclusion définitive : ferme l'accès à l'établissement. */
  expelled: boolean;
  /** Les faits marquants, pour l'affichage. */
  record: { year: number; text: string }[];
}

export interface EducationState {
  stage: EducationStage;
  /** Nom de l'établissement fréquenté. */
  schoolName: string | null;
  /** Année en cours dans le cycle (1-based). */
  yearInStage: number;
  /** Durée totale du cycle. */
  stageLength: number;
  /** Moyenne générale sur 20. */
  grades: number;
  /** Absences cumulées cette année. */
  absences: number;
  /** Effort d'étude choisi pour l'année à venir. */
  effort: 'none' | 'normal' | 'hard';
  /** Filière universitaire choisie. */
  majorId: string | null;
  /** Diplômes obtenus. */
  degrees: Degree[];
  /** Clubs/activités rejoints. */
  clubs: string[];
  /** Ancienneté et rang dans chaque club, par identifiant. */
  clubStanding: Record<string, { years: number; rank: 'membre' | 'titulaire' | 'responsable' }>;
  /** Dossier de comportement, tenu par l'établissement. */
  discipline: Discipline;
  /** Bourse obtenue (couvre les frais). */
  scholarship: boolean;
  /** Dette étudiante restante. */
  studentLoan: number;
  /** Niveau d'éducation maximal atteint (pour les prérequis métier). */
  level: EducationLevel;
  /** La situation de harcèlement en cours, s'il y en a une. */
  harassment: Harassment | null;
  /** La filière sportive scolaire, si on y est entré. */
  sport: SportCareer | null;
  /**
   * Le bulletin : une note par matière suivie.
   *
   * La moyenne générale reste `grades` — tout le jeu la lit — mais elle est
   * désormais un résumé et non la seule vérité. Deux élèves de même moyenne
   * peuvent avoir des bulletins opposés, et ce sont les bulletins que
   * regardent les filières.
   */
  marks: Record<string, number>;
  /**
   * Le penchant propre pour chaque matière, -1 à +1.
   *
   * Tiré une fois par vie et conservé : un élève bon en langues à douze ans
   * l'est encore à dix-sept. C'est ce qui rend les points forts stables, donc
   * utilisables pour décider d'une orientation.
   */
  aptitudes: Record<string, number>;
  /** La session d'examen en cours, s'il y en a une. */
  exam: ExamRun | null;
}

/**
 * Une session d'examen.
 *
 * Elle ne remplace pas la note de l'année, elle la corrige : une partie jouée
 * ne doit ni décider de douze ans d'école, ni ne rien changer.
 */
export interface ExamRun {
  /** Le cycle concerné. */
  stage: string;
  year: number;
  /** Les matières sur lesquelles on est interrogé. */
  subjectIds: string[];
  /** Le joueur a-t-il préparé quelque chose ? */
  cheated: boolean;
  /** S'est-il fait prendre ? */
  caught: boolean;
  done: boolean;
  /** La note obtenue, 0-20. */
  mark: number;
}

/**
 * Le sport scolaire, comme filière et non comme case cochée.
 *
 * L'« Association sportive » de la liste des clubs donnait neuf points de
 * forme une fois pour toutes. Ce qui suit existe pour qu'on puisse être
 * écarté, monter, porter le brassard, se blesser, être remarqué — et pour que
 * dix ans de lycée mènent quelque part.
 */
export interface SportCareer {
  sportId: string;
  since: number;
  /** Ce qu'on vaut dans ce sport, 0-100. Décide du groupe. */
  level: number;
  /** Le groupe où l'on joue (id de `SQUADS`). */
  squad: string;
  /** Saisons jouées. */
  seasons: number;
  captain: boolean;
  /** Année jusqu'à laquelle on est écarté. 0 = en état. */
  injuredUntil: number;
  /** Recruteurs qui sont venus regarder. C'est ce qui ouvre la bourse. */
  scouts: number;
  bestSeason: number;
  lastSeason: number;
  /** Séances faites cette année, deux au plus. */
  trainedThisYear: number;
  /** Année où l'on a été écarté à la sélection, s'il y en a une. */
  cutYear: number | null;
}

/**
 * Être pris pour cible, comme situation et non comme souvenir.
 *
 * Le jeu se contentait d'un drapeau `bulliedYear` : il n'y avait personne en
 * face, rien qui dure, et rien à faire. Ce qui suit existe pour que les trois
 * soient vrais — quelqu'un le fait, ça s'aggrave si on n'y touche pas, et
 * chaque réponse possible a un contexte où elle est la pire.
 */
export interface Harassment {
  /** Le camarade qui s'y met. Il reste dans la partie après. */
  bullyId: string;
  /** Le registre (id de `BULLYING_KINDS`). */
  kindId: string;
  since: number;
  /** L'ampleur, 0-100. Monte toute seule tant qu'on ne fait rien. */
  intensity: number;
  /** Ceux qui voient. Ce sont eux qui rendent une réponse possible. */
  witnessIds: string[];
  /** Ce qui suit le harceleur : la classe qui trouve ça drôle. */
  backing: number;
  reported: boolean;
  toldParents: boolean;
  /** Réponses déjà tentées cette année : on n'essaie pas tout d'affilée. */
  triedThisYear: string[];
  /** Années écoulées depuis le début. */
  years: number;
  /** Année où ça s'est arrêté, et comment. */
  resolvedYear: number | null;
  outcome: string | null;
}

/** Niveaux ordonnés — utilisés pour les prérequis d'embauche. */
export type EducationLevel = 0 | 1 | 2 | 3 | 4;
export const EDU_LEVEL_NAMES: Record<EducationLevel, string> = {
  0: 'Aucun diplôme',
  1: 'Diplôme du secondaire',
  2: 'Formation professionnelle',
  3: 'Diplôme universitaire',
  4: 'Diplôme supérieur',
};

export interface Degree {
  id: string;
  name: string;
  majorId: string | null;
  level: EducationLevel;
  year: number;
  honors: boolean;
}

/**
 * Une promesse arrachée à un parent, à tenir avant l'échéance.
 *
 * C'est ce qui distingue « négocier » de « dire oui plus tard » : la
 * condition est vérifiée à `dueYear`, et si elle n'est pas remplie l'objet de
 * la demande est perdu.
 */
export interface Condition {
  requestId: string;
  parentId: string;
  /** Ce qu'il faut atteindre. */
  kind: 'notes' | 'comportement' | 'corvées';
  target: number;
  /** Année où la promesse sera vérifiée. */
  dueYear: number;
  text: string;
}

/** Rôle tenu par quelqu'un dans l'équipe. */
export type WorkRole = 'collègue' | 'supérieur' | 'ressources humaines' | 'mentor' | 'rival';

/**
 * Un membre de l'équipe.
 *
 * Comme le personnel de l'école, il est adossé à un vrai PNJ : ce qui suit ne
 * décrit que ce qui le distingue au bureau. `influence` est le seul champ qui
 * pèse sur la carrière — être bien vu de quelqu'un sans poids ne sert à rien.
 */
export interface Coworker {
  personId: string;
  role: WorkRole;
  /** Ancienneté dans l'entreprise. */
  seniority: number;
  /** Ce qu'il vaut dans son métier. */
  competence: number;
  /** Poids réel dans les décisions qui vous concernent. */
  influence: number;
}

export interface JobState {
  jobId: string;
  /** Nom du poste au niveau courant (ex: « Développeuse senior »). */
  title: string;
  /** Index dans l'échelle hiérarchique du métier. */
  level: number;
  salary: number;
  employer: string;
  /** Performance au travail 0-100. */
  performance: number;
  yearsAtJob: number;
  /** Effort choisi pour l'année. */
  effort: 'slack' | 'normal' | 'overtime';
  /** Année de la dernière demande d'augmentation (limite le spam). */
  lastRaiseAskYear: number;
  partTime: boolean;
  /** Heures hebdomadaires réellement travaillées. */
  hours: number;
  /**
   * Satisfaction au travail, 0-100.
   *
   * Distincte de la performance : on peut très bien réussir dans un poste
   * qu'on déteste, et c'est précisément ce qui fait démissionner.
   */
  satisfaction: number;
  /** L'équipe : collègues, supérieur, ressources humaines. */
  team: Coworker[];
  /** Avertissements reçus, qui pèsent sur le licenciement. */
  warnings: number;
  /** Congés pris cette année. */
  leaveTaken: number;
}

/* ------------------------------------------------------------------ */
/* Travailler pour soi                                                 */
/* ------------------------------------------------------------------ */

/** Une commande précise, d'un client précis, à prendre ou à laisser. */
export interface GigOffer {
  id: string;
  /** Qui demande. */
  client: string;
  /** Ce qu'il veut. */
  label: string;
  /** Ce qu'il propose. */
  fee: number;
  /** Son niveau d'exigence, 0-100. */
  demand: number;
  /** Ce que ça coûtera en temps et en nerfs, 0-100. */
  urgency: number;
  /** Ce qu'on sent en lisant l'annonce. */
  hint: string;
}

/** Exercer un métier à son compte. */
export interface FreelanceState {
  tradeId: string;
  /** Année de début. */
  since: number;
  /**
   * Le tarif qu'on demande, en monnaie courante.
   *
   * C'est le seul vrai levier du métier, et il coupe des deux côtés : trop
   * haut pour ce qu'on sait faire, les clients partent ; trop bas, on
   * travaille beaucoup pour peu.
   */
  fee: number;
  /** Les gens qui reviennent et qui en parlent, 0-100. */
  clientele: number;
  /** Ce qu'on sait faire dans ce métier, 0-100. */
  craft: number;
  /** Chiffre d'affaires du dernier exercice clos — conservé pour l'affichage. */
  lastRevenue: number;
  /**
   * Ce qui est rentré depuis le dernier bilan.
   *
   * Distinct de `lastRevenue` parce qu'il est remis à zéro une fois l'impôt
   * calculé : c'est l'assiette, pas la mémoire.
   */
  earnedThisYear: number;
  /** Prestations réalisées l'année écoulée. */
  lastMissions: number;
  /** Commandes en attente de réponse. */
  offers: GigOffer[];
  /** Litiges non refroidis : ils pèsent sur le bouche-à-oreille. */
  disputes: number;
}

/** Une offre de reprise. */
export interface BuyerOffer {
  id: string;
  buyer: string;
  price: number;
  /** Ce que l'acheteur exige en plus de l'argent. */
  catch: string | null;
  /** Effet de la clause sur le vendeur, appliqué à la vente. */
  clause: 'aucune' | 'accompagnement' | 'echelonne' | 'nom';
}

/** Une entreprise possédée par le joueur. */
export interface Business {
  id: string;
  kindId: string;
  name: string;
  foundedYear: number;
  /** Trésorerie de l'entreprise — distincte de l'argent du joueur. */
  cash: number;
  /** Salariés. */
  staff: number;
  /** Ce que les gens en savent, 0-100. */
  renown: number;
  /** Ce qui en sort, 0-100. */
  quality: number;
  pricing: 'bas' | 'normal' | 'haut';
  involvement: 'absent' | 'présent' | 'total';
  /** Le gérant salarié, s'il y en a un. */
  managerId: string | null;
  /** Dette contractée par l'entreprise. */
  debt: number;
  /** Ce que le patron s'est versé cette année. */
  drawnThisYear: number;
  /** Les derniers exercices. */
  history: { year: number; revenue: number; profit: number }[];
  /** Années consécutives dans le rouge. */
  distress: number;
  /** Mise en vente : les repreneurs se manifestent. */
  offers: BuyerOffer[];
}

/**
 * Une génération achevée.
 *
 * C'est ce qui reste d'une vie quand on en reprend une autre : pas une
 * sauvegarde, un souvenir chiffré. La lignée est la seule chose du jeu qui
 * traverse la mort.
 */
export interface LineageEntry {
  /** 1 = le premier personnage joué. */
  generation: number;
  name: string;
  birthYear: number;
  deathYear: number;
  ageAtDeath: number;
  cause: string;
  topJob: string;
  /** Patrimoine au moment du décès, avant partage. */
  netWorth: number;
  famePeak: number;
  children: number;
  /** Le PNJ qui représente désormais cet ancêtre. */
  personId: string;
}

/* ------------------------------------------------------------------ */
/* La notoriété publique                                               */
/* ------------------------------------------------------------------ */

/** Une affaire en cours, en attente d'une réponse du joueur. */
export interface Scandal {
  id: string;
  kindId: string;
  year: number;
  /** Ce qu'elle pèse, 0-100. */
  weight: number;
  /** La réponse donnée, s'il y en a eu une. */
  answered: string | null;
}

/** Une interview en train de se dérouler. */
export interface Interview {
  /** Les questions posées, dans l'ordre. */
  beats: string[];
  /** L'index de la réponse donnée à chaque question, ou -1. */
  answers: number[];
  /** Le média qui reçoit. */
  outlet: string;
}

/**
 * Ce que le public sait, et ce qu'il en pense.
 *
 * Trois choses que le jeu confondait sous un compteur d'abonnés :
 * `level` dit **combien de gens** savent qui tu es, `controversy` dit **ce
 * qu'ils ont à te reprocher**, et `stats.reputation` — qui reste ailleurs —
 * dit ce que pensent **ceux qui te connaissent vraiment**. Les trois ne
 * varient pas ensemble, et c'est tout l'intérêt.
 */
export interface FameState {
  /** Combien de gens savent qui tu es, 0-100. */
  level: number;
  /** Le plus haut atteint, gardé pour le récapitulatif. */
  peak: number;
  /** Ce pour quoi on te connaît (id de `FAME_FIELDS`). */
  field: string;
  /** Ce qu'on a à te reprocher, 0-100. */
  controversy: number;
  /** Ce que le public retient de bon, 0-100. */
  goodwill: number;
  /** Les affaires en cours. */
  scandals: Scandal[];
  /** L'interview en cours, s'il y en a une. */
  interview: Interview | null;
  /** Ce que les apparitions ont rapporté depuis le dernier bilan. */
  earnedThisYear: number;
}

/**
 * Un engagement : ce qu'on vous propose, puis ce que vous avez accepté.
 *
 * Le cachet est fixé à la signature et ne bouge plus : c'est ce qui rend le
 * choix risqué. On accepte un rôle trop grand pour ce qu'il paie et pour ce
 * qu'il ferait à votre nom, en sachant qu'on peut le rater.
 */
export interface StageJob {
  id: string;
  /** L'entrée de `data/stage.ts` dont il est tiré. */
  templateId: string;
  /** Qui propose, en une formule. */
  from: string;
  /** Ce qui a été négocié, arrêté à la signature. */
  fee: number;
  /** La difficulté de cette occurrence-là, 0-100. */
  difficulty: number;
}

/**
 * Une carrière de scène : comédien, musicien, sportif, mannequin, politique.
 *
 * Un seul état pour les cinq, parce qu'ils ont la même forme — un métier qui
 * se construit, des propositions qu'on accepte ou non, un accueil qui décide
 * de la suite. Ce qui les distingue vit dans `data/stage.ts`.
 */
export interface StageState {
  disciplineId: string;
  /** Année où l'on s'est lancé. */
  since: number;
  /** Le métier acquis, 0-100. C'est lui qui décide de ce qu'on vous propose. */
  craft: number;
  /** Les propositions du moment, en attente d'une réponse. */
  offers: StageJob[];
  /** L'engagement accepté et pas encore tenu. */
  current: StageJob | null;
  /** Engagements tenus, tous confondus. */
  done: number;
  /** Le meilleur accueil jamais reçu, 0-100. */
  bestReception: number;
  /** Le dernier, pour l'affichage. */
  lastReception: number;
  /** Ce que les cachets ont rapporté depuis le dernier bilan. */
  earnedThisYear: number;
  /** Celui qui vous représente, s'il y en a un. */
  agentId: string | null;
  /** Les distinctions obtenues (ids de `ACCOLADES`). */
  accolades: string[];
  /** L'usure accumulée, 0-100. Elle retranche à la prestation. */
  fatigue: number;
  /** Année jusqu'à laquelle on est écarté. 0 = en état. */
  injuredUntil: number;
  /** Les gens avec qui on exerce : groupe, équipe, troupe, cabinet. */
  crewIds: string[];
  /** Celui qui les dirige, s'il y en a un. */
  coachId: string | null;
  /** L'entente du groupe, 0-100. Elle décide autant que le niveau. */
  cohesion: number;
  /** L'essai en cours, s'il y en a un. */
  tryout: Tryout | null;
  /** Le book : ce qu'on peut montrer. */
  book: BookPiece[];
  /** Ce qu'on a enregistré, et ce qu'il en advient. */
  releases: Release[];
  /** La tournée en cours ou terminée, s'il y en a une. */
  tour: Tour | null;
  /** Ce qu'on a signé avec une maison de disques, s'il y a lieu. */
  deal: RecordDeal | null;
  /**
   * L'engagement pluriannuel en cours, s'il y en a un.
   *
   * Chaque saison était un engagement isolé : on ne pouvait ni s'attacher à
   * une maison, ni s'y enfermer. Un contrat garantit un cachet et interdit de
   * prendre mieux ailleurs — c'est l'arbitrage qui manquait.
   */
  contract: StageContract | null;
}

/**
 * Un essai en cours : un rôle au-dessus de soi, et la façon de le tenter.
 *
 * Il n'existe qu'entre le moment où l'on demande à passer et celui où l'on
 * connaît la réponse. Ce qui le distingue d'un engagement : on ne l'a pas
 * encore, et rien ne dit qu'on l'aura.
 */
export interface Tryout {
  /** L'entrée de `data/stage.ts` qu'on vise. */
  templateId: string;
  /** Qui reçoit. */
  from: string;
  /** L'approche choisie (id de `APPROACHES`). */
  approachId: string;
  /** Ce que la situation demande, 0-100. */
  difficulty: number;
  /** Le cachet si on l'obtient. */
  fee: number;
}

/** Une pièce du book : ce qu'on a fait, et ce que ça valait. */
export interface BookPiece {
  /** Le type de pièce (id de `PIECE_KINDS`). */
  kindId: string;
  year: number;
  /** Ce que la prestation valait, 0-100. */
  quality: number;
}

/**
 * Une sortie : ce qu'on a enregistré, et ce qu'il en advient.
 *
 * Le catalogue reprochait à la musique qu'un album soit une soirée bien ou
 * mal passée dont il ne restait rien le lendemain. Une sortie vit désormais
 * après sa sortie : elle entre au classement, y monte ou non, en retombe, et
 * paie des droits tant qu'on s'en souvient.
 */
export interface Release {
  id: string;
  /** L'entrée de `data/records.ts` dont elle est tirée. */
  formatId: string;
  /** Le titre, tiré au sort à la sortie. */
  title: string;
  /** Année de parution. `null` tant qu'elle est en cours de production. */
  year: number | null;
  /** Années de production restantes. */
  yearsLeft: number;
  /** La maison qui la sort, s'il y en a une. */
  labelId: string | null;
  /** Ce que valait la prestation, 0-100. */
  quality: number;
  /** La meilleure place atteinte. 0 = jamais entré. */
  peak: number;
  /** La place actuelle. 0 = sorti du classement. */
  rank: number;
  /** Années passées au classement. */
  weeks: number;
  /** Ce qu'elle a rapporté en tout. */
  earned: number;
}

/**
 * Une tournée : des dates qu'on pose soi-même.
 *
 * Avant, « partir en tournée » était un engagement comme un autre. Ici on
 * choisit combien de dates et dans quelles salles, et l'on découvre au
 * retour si l'on valait ce qu'on avait réservé.
 */
export interface Tour {
  /** Année de départ. */
  since: number;
  /** Les dates posées : autant d'entrées que de concerts. */
  dates: string[];
  /** Dates déjà jouées. */
  played: number;
  /** Ce que la tournée a rapporté, net. */
  earned: number;
  /** Ce qu'elle a coûté à monter. */
  spent: number;
  /** Dates annulées faute de tenir. */
  cancelled: number;
  /** Remplissage moyen, 0-1. */
  fill: number;
  /** Est-elle en route ? */
  running: boolean;
}

/**
 * Ce qu'on a signé avec une maison de disques.
 *
 * Distinct du contrat pluriannuel de `StageContract` : celui-ci ne garantit
 * pas un revenu, il achète des sorties. On doit un nombre de disques, et l'on
 * n'est libre qu'après les avoir livrés.
 */
export interface RecordDeal {
  labelId: string;
  since: number;
  /** Sorties encore dues. */
  owed: number;
  /** L'avance encaissée, à récupérer sur les droits. */
  advance: number;
  /** Ce que la maison a déjà repris sur l'avance. */
  recouped: number;
}

/**
 * Les compteurs d'une vie entière.
 *
 * Ils sont incrémentés là où l'événement se produit déjà, jamais recalculés
 * après coup : c'est ce qui garantit qu'ils disent la vérité même quand
 * l'état final ne la porte plus. Un divorcé remarié n'a plus qu'un conjoint,
 * mais il a bien divorcé une fois.
 */
export interface Chronicle {
  /** Promotions obtenues, tous emplois confondus. */
  promotions: number;
  /** Meilleure performance atteinte dans un poste. */
  peakPerformance: number;
  /** Affaires lancées : à son compte ou en société. */
  venturesRun: number;
  marriages: number;
  divorces: number;
  /** Années passées marié, cumulées. */
  yearsMarried: number;
  /** Années passées au-dessus du seuil de notoriété. */
  yearsFamous: number;
  /** Âge auquel on a cessé d'être connu. 0 = on l'est encore, ou jamais été. */
  lastFamousAge: number;
  /** Maladies contractées, et accidents subis. */
  illnesses: number;
  accidents: number;
  /** Ce qu'on a reçu en héritage, et ce qu'on a donné. */
  inherited: number;
  given: number;
  /** Années où l'on a encaissé un loyer, et où l'on a détenu des placements. */
  rentYears: number;
  investedYears: number;
  /** Véhicules possédés au cours de la vie. */
  vehiclesOwned: number;
  /** Année de la dernière condamnation. 0 = jamais. */
  lastConvictionYear: number;
  /** Revenus passifs encaissés au total : loyers, droits, placements. */
  passiveEarned: number;
}

/** Un engagement pluriannuel. */
export interface StageContract {
  from: string;
  /** Le cachet garanti chaque année. */
  yearly: number;
  /** Années restantes. */
  yearsLeft: number;
  /** Durée totale, pour l'affichage. */
  total: number;
}

/**
 * Une mission acceptée, ou proposée.
 *
 * La prime est arrêtée à l'affectation et ne bouge plus, comme un cachet de
 * scène. Le danger, lui, est propre à cette occurrence : la même mission
 * n'est pas aussi risquée deux fois.
 */
export interface ServiceDuty {
  id: string;
  /** L'entrée de `data/service.ts` dont elle est tirée. */
  dutyId: string;
  /** Ce qu'elle rapporte, arrêté à l'affectation. */
  bounty: number;
  /** La difficulté de cette occurrence-là, 0-100. */
  demands: number;
  /** Le danger de cette occurrence-là, 0-1. */
  danger: number;
  /** Années restant à courir. */
  yearsLeft: number;
}

/**
 * Servir : l'armée, le programme spatial, le service.
 *
 * Un seul état pour les trois, parce qu'ils ont la même forme — on est
 * sélectionné, on se forme, on monte en grade, on part en mission, on en sort.
 * Ce qui les distingue vit dans `data/service.ts`.
 */
export interface ServiceState {
  corpsId: string;
  /** Année de l'engagement. */
  since: number;
  /** Années de formation qu'il reste à faire. 0 = opérationnel. */
  trainingLeft: number;
  /** Ce que vaut le personnage dans le métier, 0-100. */
  readiness: number;
  /** La réputation dans la maison, 0-100. Elle décide des grades. */
  standing: number;
  /** Le grade actuel (id de `RANKS`). */
  rankId: string;
  /** Les missions proposées, en attente de réponse. */
  offers: ServiceDuty[];
  /** La mission en cours, s'il y en a une. */
  current: ServiceDuty | null;
  /** Missions menées à bien. */
  done: number;
  /** Missions ratées. */
  failed: number;
  /** A-t-on été blessé au moins une fois ? */
  wounded: boolean;
  /** Année jusqu'à laquelle on est indisponible. 0 = en état. */
  sidelinedUntil: number;
  /** Les distinctions obtenues (ids de `DECORATIONS`). */
  decorations: string[];
  /** Ce que les primes ont rapporté depuis le dernier bilan. */
  earnedThisYear: number;
}

/**
 * Une campagne électorale en cours.
 *
 * Elle tient sur une année : on déclare sa candidature, on dispose d'un
 * nombre fixe de coups à jouer, et le scrutin se règle à la fin de l'année.
 * Ce qui rend le choix serré est qu'il n'y a jamais assez de coups ni assez
 * d'argent pour parler à tout le monde.
 */
export interface Campaign {
  officeId: string;
  /** Année de la déclaration. Le scrutin a lieu à la fin de celle-ci. */
  since: number;
  /** Les axes de programme retenus. Trois au plus. */
  planks: string[];
  /** Ce qu'on a réuni, et ce qu'on a dépensé. */
  funds: number;
  spent: number;
  /** Intentions de vote, par bloc, 0-100. */
  polls: Record<string, number>;
  /** L'adversaire, un vrai PNJ. */
  rivalId: string;
  /** Son archétype (id de `RIVAL_KINDS`). */
  rivalKind: string;
  rivalPlanks: string[];
  /** Ses intentions de vote, par bloc. */
  rivalPolls: Record<string, number>;
  /** Coups déjà joués. */
  moves: number;
  /** Les casseroles ramassées en chemin, 0-100. */
  damage: number;
  /** Le débat a-t-il eu lieu, et comment s'est-il passé ? 0-100, ou `null`. */
  debate: number | null;
  /** Ce qui s'est passé, pour l'écran. */
  log: string[];
}

/** Un mandat en cours. */
export interface Mandate {
  officeId: string;
  from: number;
  /** Années restant à courir. */
  yearsLeft: number;
  /** Ce qu'on avait promis. */
  promises: string[];
  /** Promesses tenues, et abandonnées. */
  kept: number;
  broken: number;
  /** L'opinion de chaque bloc sur ce qu'on fait, 0-100. */
  approval: Record<string, number>;
  /** La décision de l'année, tant qu'elle n'est pas tranchée. */
  pending: string | null;
  /** Ce qu'on a décidé, pour le bilan. */
  record: string[];
  /** Ce que l'indemnité a versé depuis le dernier bilan. */
  earnedThisYear: number;
  /** Nombre de mandats déjà accomplis à ce siège. */
  terms: number;
}

/**
 * Ce qu'il reste d'un service terminé.
 *
 * Sans cela, quitter l'armée effacerait vingt ans de vie. Un ancien garde son
 * grade, sa pension et ce qu'il a traversé — y compris quand ça ne se voit
 * pas.
 */
export interface VeteranRecord {
  corpsId: string;
  rankId: string;
  years: number;
  duties: number;
  decorations: string[];
  /** L'id de `DISCHARGES`. */
  dischargeId: string;
  /** La pension annuelle acquise. */
  pension: number;
  wounded: boolean;
}

export interface OwnedProperty {
  id: string;
  archetypeId: string;
  name: string;
  cityName: string;
  countryId: string;
  /** Prix d'achat. */
  purchasePrice: number;
  purchaseYear: number;
  /** Valeur de marché actuelle. */
  value: number;
  /** État 0-100. */
  condition: number;
  areaM2: number;
  /** Solde restant du crédit. */
  mortgageBalance: number;
  /** Mensualité (annuelle dans la simulation). */
  annualPayment: number;
  mortgageYearsLeft: number;
  interestRate: number;
  /** Charges annuelles (taxes, entretien). */
  annualCost: number;
  /** Le joueur y habite-t-il ? */
  isResidence: boolean;
  /** Mis en location ? */
  rentedOut: boolean;
  /** Ce que le bien rapporterait au prix du marché, dans son état. */
  annualRentIncome: number;
  /** Le loyer que tu demandes. Zéro = celui du marché. */
  askingRent: number;
  /** Le locataire en place, s'il y en a un. */
  tenancy: Tenancy | null;
  /** Les candidatures reçues, en attente de ton choix. */
  applicants: Applicant[];
  /** Années consécutives sans locataire. */
  vacantYears: number;
  /** Une réparation demandée et pas encore tranchée. */
  repair: { year: number; label: string; cost: number; severity: number } | null;
}

/**
 * Un locataire.
 *
 * C'est un vrai PNJ : il a un nom, une opinion de vous, et il reste dans la
 * partie après son départ. « Mettre en location » cesse d'être un
 * interrupteur dès lors qu'il y a quelqu'un derrière la porte.
 */
export interface Tenancy {
  personId: string;
  since: number;
  /** Le loyer convenu, qui ne bouge qu'au renouvellement. */
  rent: number;
  /** Ce qu'il doit et n'a pas payé. */
  arrears: number;
  /** Ce qu'il fait du logement, 0-100. */
  care: number;
  /** Ce qu'il pense de toi comme propriétaire, 0-100. */
  goodwill: number;
  /** Années restant au bail. */
  yearsLeft: number;
  /** Année où la procédure de départ a été engagée. */
  noticeYear: number | null;
}

/** Un candidat à la location, avec ce qu'on peut en deviner. */
export interface Applicant {
  id: string;
  personId: string;
  /** Ce qu'il peut tenir sans se mettre en difficulté. */
  affordable: number;
  /** Ce qu'il propose de payer. */
  offer: number;
  /** Ce qu'il fera du logement, 0-100. Invisible tel quel. */
  care: number;
  /** Durée qu'il envisage. */
  years: number;
  /** Ce que dit le dossier. */
  hint: string;
}

export interface OwnedVehicle {
  id: string;
  modelId: string;
  brand: string;
  model: string;
  year: number;
  purchasePrice: number;
  purchaseYear: number;
  value: number;
  mileage: number;
  /** État 0-100. */
  condition: number;
  reliability: number;
  annualCost: number;
  broken: boolean;
}

export interface ActiveDisease {
  id: string;
  name: string;
  severity: number;
  yearsIll: number;
  treated: boolean;
  chronic: boolean;
  /** Diagnostiquée ? Sinon le joueur ignore son existence. */
  diagnosed: boolean;
}

export interface Conviction {
  crimeId: string;
  crimeName: string;
  year: number;
  sentenceYears: number;
  fine: number;
  appealed: boolean;
}

export interface CriminalRecord {
  arrests: number;
  convictions: Conviction[];
  /** Notoriété dans le milieu, 0-100. */
  notoriety: number;
  /** Crimes commis sans se faire prendre. */
  successfulCrimes: number;
  /**
   * L'attention de la police, 0-100.
   *
   * À ne pas confondre avec la notoriété, qui est la réputation dans le
   * milieu. On peut être très connu des voisins de métier et parfaitement
   * tranquille — et l'inverse. C'est la chaleur qui décide des enquêtes.
   */
  heat: number;
  /** Enquête en cours, le cas échéant. */
  investigation: Investigation | null;
  /** En fuite : recherché, sans papiers, sans emploi déclarable. */
  wanted: boolean;
  /** Année du début de la cavale, pour savoir depuis quand elle dure. */
  wantedSince: number | null;
  /** Ce qu'il restait à purger au moment de l'évasion. */
  escapedFrom: { facilityName: string; yearsLeft: number } | null;
}

export interface PrisonState {
  yearsLeft: number;
  totalSentence: number;
  security: 'minimum' | 'medium' | 'maximum';
  /** Comportement 0-100 — influence la conditionnelle. */
  behavior: number;
  /** Réputation auprès des détenus 0-100. */
  respect: number;
  paroleDenials: number;
  facilityName: string;
  /**
   * Ce que la préparation d'une évasion a déjà rassemblé, 0-100.
   *
   * Elle ne décide de rien toute seule : elle écarte des gardiens, ralentit
   * le projecteur et donne du temps. Le trajet reste à faire.
   */
  escapePlan: number;
  /** Ce que la direction soupçonne, 0-100. L'exact inverse. */
  suspicion: number;
  /** Préparatifs déjà tentés, pour ne pas les refaire indéfiniment. */
  prepared: string[];
}

export interface WillState {
  /** id du PNJ -> part en pourcentage. */
  shares: Record<string, number>;
  updatedYear: number;
}

export interface FinanceSnapshot {
  year: number;
  income: number;
  taxes: number;
  livingCost: number;
  housing: number;
  debtPayments: number;
  propertyCosts: number;
  vehicleCosts: number;
  familyCosts: number;
  other: number;
  net: number;
}

export interface Loan {
  id: string;
  kind: 'student' | 'personal' | 'mortgage' | 'shark';
  label: string;
  balance: number;
  rate: number;
  annualPayment: number;
  yearsLeft: number;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  age: number;
  happiness: number;
  health: number;
  annualCost: number;
}

export type TimelineKind =
  | 'life'
  | 'money'
  | 'love'
  | 'school'
  | 'work'
  | 'health'
  | 'crime'
  | 'justice'
  | 'family'
  | 'asset'
  | 'random'
  | 'death'
  | 'action';

export interface TimelineEntry {
  id: string;
  year: number;
  age: number;
  kind: TimelineKind;
  text: string;
  /** Bon / mauvais / neutre — pour la couleur de la puce. */
  tone: 'good' | 'bad' | 'neutral';
}

/** Le personnage joué. */
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  sex: Sex;
  orientation: Orientation;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  age: number;
  alive: boolean;
  deathCause: string | null;
  deathYear: number | null;

  countryId: string;
  cityName: string;
  /** Pays de naissance, conservé même après immigration. */
  originCountryId: string;

  /**
   * Environnement de vie : quartier, logement, foyer, école, économie locale.
   * Vivant — il évolue chaque année (`systems/environment.ts`) et alimente
   * tous les contextes (`systems/context.ts`).
   */
  origin: WorldOrigin;
  appearance: Appearance;
  /** Prédispositions héritées. Elles modulent, elles ne décident pas. */
  genetics: Genetics;
  /** Personnalité acquise : elle dérive avec l'environnement et les choix. */
  traits: AcquiredTraits;
  /**
   * Personnalité complète : axes, valeurs, styles, peurs, intérêts,
   * habitudes, ambitions, souvenirs. `traits` en reste une synthèse courte,
   * conservée pour l'affichage et les systèmes qui n'ont pas besoin du détail.
   */
  psyche: Psyche;

  stats: Stats;
  money: number;
  /** Argent gagné cumulé sur la vie (pour le récapitulatif). */
  lifetimeEarnings: number;

  education: EducationState;
  job: JobState | null;
  /** Historique de carrière pour le récapitulatif. */
  careerHistory: { title: string; employer: string; from: number; to: number | null }[];
  retired: boolean;
  pension: number;
  /** Le métier exercé à son compte, s'il y en a un. */
  freelance: FreelanceState | null;
  /** L'entreprise possédée, s'il y en a une. */
  business: Business | null;
  /** La carrière de scène en cours, s'il y en a une. */
  stage: StageState | null;
  /**
   * Ce qu'une vie aura accumulé, en compteurs.
   *
   * Aucun système ne décide à partir de ces nombres : ils existent pour le
   * bilan d'une vie. Sans eux, un titre comme « bourreau de travail » ou
   * « racheté » aurait dû se deviner à partir de l'état final, qui ne dit
   * rien de ce qui s'est passé — combien de fois on a été promu, combien
   * d'années on a été marié, quand on a arrêté.
   */
  chronicle: Chronicle;
  /**
   * Les lieux où l'on est allé, et les pays où l'on a vécu.
   *
   * Rien ne s'en sert pour décider quoi que ce soit : ces deux listes
   * existent pour le bilan d'une vie. Sans elles, une vie de voyages et une
   * vie passée dans la même rue se ressemblaient à la fin.
   */
  seenPlaces: string[];
  livedCountries: string[];
  /** Le corps où l'on sert, s'il y en a un. */
  service: ServiceState | null;
  /** La campagne électorale en cours, s'il y en a une. */
  campaign: Campaign | null;
  /** Le mandat exercé, s'il y en a un. */
  mandate: Mandate | null;
  /** Ce qu'un service terminé a laissé. */
  veteran: VeteranRecord | null;

  properties: OwnedProperty[];
  /**
   * Les loyers réellement encaissés depuis le dernier bilan.
   *
   * Distinct du loyer contractuel : un locataire qui ne paie pas ne produit
   * pas de revenu imposable, et compter ce qui est dû plutôt que ce qui est
   * versé ferait payer l'impôt sur un impayé.
   */
  rentCollectedThisYear: number;
  vehicles: OwnedVehicle[];
  /** Portefeuille d'investissements. */
  holdings: Holding[];
  /** Le carnet du milieu. */
  contacts: Contact[];
  /** L'organisation, si le joueur en a une. */
  organization: Organization | null;
  /** Mission proposée cette année, en attente de réponse. */
  pendingMission: { kind: string; year: number } | null;
  /**
   * Ce que le personnage comprend aux placements, 0-100.
   *
   * Il ne s'achète pas : il vient des études, de l'expérience, et surtout
   * des erreurs. C'est lui qui décide de ce qu'on peut acheter et de ce
   * qu'on voit avant d'acheter.
   */
  financialLiteracy: number;
  pets: Pet[];
  loans: Loan[];
  /** Objets divers (bijoux, œuvres…). */
  valuables: { id: string; name: string; value: number; purchaseYear: number; purchasePrice: number }[];

  diseases: ActiveDisease[];
  criminalRecord: CriminalRecord;
  prison: PrisonState | null;
  will: WillState;

  /** Suivi social (nombre d'abonnés). */
  followers: number;
  /** Ce que le public sait de toi, et ce qu'il en pense. */
  fame: FameState;
  /** Actions déjà réalisées cette année (clé -> compteur). */
  yearActions: Record<string, number>;
  /**
   * Promesses arrachées aux parents et pas encore échues.
   *
   * Elles vivent dans la sauvegarde parce qu'elles se vérifient l'année
   * suivante : sans cela, « négocier » ne serait qu'un « oui » retardé.
   */
  conditions?: Condition[];
  /** Marqueurs persistants divers. */
  flags: Record<string, boolean | number | string>;
  /** Bilans financiers annuels (5 dernières années). */
  financeHistory: FinanceSnapshot[];
}

/** Choix proposé au joueur lors d'un événement. */
export interface EventChoice {
  label: string;
  /** Identifiant du résultat, résolu par le système d'événements. */
  outcome: string;
}

/** Événement interactif en attente de réponse du joueur. */
export interface PendingEvent {
  id: string;
  eventId: string;
  title: string;
  text: string;
  choices: EventChoice[];
  /** PNJ concerné, si applicable. */
  personId?: string;
  /** Données libres transmises au résolveur. */
  payload?: Record<string, unknown>;
  icon: string;
}

/** État du monde partagé (marchés, inflation…). */
export interface WorldState {
  year: number;
  /** Multiplicateur du marché immobilier (1 = référence). */
  propertyIndex: number;
  /** Multiplicateur du marché de l'emploi. */
  jobMarket: number;
  /** Inflation cumulée depuis la naissance. */
  inflation: number;
  /** Conjoncture : -1 récession, 0 normal, 1 croissance. */
  economy: number;
  /** Offres d'emploi disponibles cette année (persistées). */
  jobOffers: JobOffer[];
  /** Biens immobiliers disponibles (régénérés chaque année). */
  propertyListings: PropertyListing[];
  /** Véhicules disponibles. */
  vehicleListings: VehicleListing[];
  /** Prétendants disponibles sur les applications de rencontre. */
  datingPool: string[];
  /** Résultat du dernier tirage de loterie. */
  lastLotteryYear: number;
  /**
   * Cours des supports d'investissement, par identifiant.
   *
   * Ils vivent dans le monde et non dans le joueur : deux personnes qui
   * achètent le même fonds la même année achètent le même cours, et
   * l'historique reste lisible même après avoir tout vendu.
   */
  assetPrices: Record<string, AssetMarket>;
}

/**
 * Une enquête ouverte au nom du joueur.
 *
 * Elle n'est pas une arrestation différée : elle avance, elle se voit, et on
 * peut agir dessus — se faire oublier, payer, ou continuer et voir.
 */
export interface Investigation {
  /** Année d'ouverture. */
  since: number;
  /** Ce que le dossier contient, 0-100. À 100, on vient te chercher. */
  progress: number;
  /** Le délit sur lequel elle porte. */
  crimeId: string;
  /** Le joueur en a-t-il été averti ? */
  known: boolean;
}

/** Quelqu'un du milieu, et ce qu'on peut lui demander. */
export interface Contact {
  id: string;
  /** Identifiant du PNJ correspondant. */
  personId: string;
  role: string;
  /** Ce qu'il pense de toi, 0-100. */
  trust: number;
  /** Ce qu'il vaut, 0-100 : un mauvais receleur donne de mauvais prix. */
  quality: number;
  /** Nombre de services rendus. */
  used: number;
  /** A-t-il déjà parlé à quelqu'un ? */
  burned: boolean;
}

/** L'organisation à laquelle le joueur appartient. */
export interface Organization {
  name: string;
  style: string;
  /** Rang du joueur, 0-5. */
  rank: number;
  /** Ce que la maison pense de toi, 0-100. */
  respect: number;
  /** Emprise sur le quartier, 0-100. */
  territory: number;
  /** L'attention que la police porte à la maison, 0-100. */
  pressure: number;
  /** Nom de la maison d'en face. */
  rival: string;
  /** Missions accomplies, refusées, ratées. */
  done: number;
  refused: number;
  failed: number;
  /** Année d'entrée. */
  since: number;
}

/** L'état d'un support : son cours, et d'où il vient. */
export interface AssetMarket {
  /** Cours courant, base 100 à la naissance. */
  price: number;
  /** Les vingt derniers cours, du plus ancien au plus récent. */
  history: number[];
  /** Variation de l'année écoulée, en fraction. */
  lastChange: number;
  /** L'année dernière a-t-elle été un décrochage ? */
  crashed: boolean;
}

/** Une ligne du portefeuille. */
export interface Holding {
  assetId: string;
  /** Nombre de parts. Le cours est celui du monde. */
  units: number;
  /** Prix de revient moyen d'une part, frais compris. */
  costBasis: number;
  /** Année du dernier achat : c'est elle qui décide du blocage. */
  boughtYear: number;
  /** Plus-values déjà réalisées sur ce support, cumulées. */
  realized: number;
}

export interface JobOffer {
  id: string;
  jobId: string;
  title: string;
  employer: string;
  salary: number;
  level: number;
  category: string;
  requiresLevel: EducationLevel;
  requiresMajor: string[] | null;
  minExperience: number;
  stress: number;
  hours: number;
}

export interface PropertyListing {
  id: string;
  archetypeId: string;
  name: string;
  cityName: string;
  countryId: string;
  price: number;
  areaM2: number;
  condition: number;
  annualCost: number;
  annualRentIncome: number;
}

export interface VehicleListing {
  id: string;
  modelId: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  condition: number;
  reliability: number;
  annualCost: number;
  used: boolean;
}

/** Racine de la sauvegarde. */
export interface GameState {
  version: number;
  /** Graine du générateur pseudo-aléatoire. */
  seed: number;
  rngState: number;
  year: number;
  player: Player;
  npcs: Record<string, Person>;
  timeline: TimelineEntry[];
  world: WorldState;
  pending: PendingEvent[];
  /** Compteur pour générer des identifiants uniques. */
  idCounter: number;
  /**
   * Dernière année de déclenchement de chaque événement, pour éviter
   * qu'une même situation ne se répète tous les deux ans.
   */
  /**
   * Registre des chaînes de causalité : d'où vient ce que le personnage est
   * devenu (`systems/causality.ts`).
   */
  causality?: ContextEffect[];
  eventLog: Record<string, number>;
  /**
   * Les générations précédentes, quand la partie est reprise par un
   * descendant. Absent tant qu'on joue le premier personnage.
   */
  lineage?: LineageEntry[];
  /** Vies terminées (mini-historique inter-parties). */
  gameOver: boolean;
}

/** Résultat standard d'une action déclenchée par le joueur. */
export interface ActionResult {
  ok: boolean;
  /** Message affiché dans une modale. */
  message: string;
  /** Titre de la modale. */
  title?: string;
  tone?: 'good' | 'bad' | 'neutral';
  /** Entrées ajoutées à la timeline (déjà appliquées à l'état). */
  entries?: TimelineEntry[];
}
