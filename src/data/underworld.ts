/**
 * Le milieu : rangs, gens, missions.
 *
 * Tout est fictif et abstrait, comme le reste de la zone grise du jeu. Aucun
 * nom réel, aucune organisation réelle, aucune méthode. Une mission est une
 * décision et un risque chiffré — jamais une marche à suivre.
 *
 * Le fichier décrit trois choses :
 *
 * - **les rangs**, qui disent ce qu'on peut faire et ce qu'on encaisse ;
 * - **les rôles**, c'est-à-dire à quoi sert chaque personne du carnet ;
 * - **les missions**, ce que l'organisation demande en échange.
 */

/* ------------------------------------------------------------------ */
/* Les rangs                                                           */
/* ------------------------------------------------------------------ */

export interface RankDef {
  /** 0 = ne fait pas partie de la maison. */
  level: number;
  name: string;
  emoji: string;
  /** Respect nécessaire pour y prétendre. */
  respect: number;
  /** Part des gains d'une mission qui revient au joueur. */
  share: number;
  /** Ce que le rang expose : plus on monte, plus la police s'intéresse. */
  exposure: number;
  description: string;
}

export const RANKS: RankDef[] = [
  {
    level: 0, name: 'Personne', emoji: '👤', respect: 0, share: 0, exposure: 0,
    description: 'On ne te connaît pas. On ne te doit rien.',
  },
  {
    level: 1, name: 'Guetteur', emoji: '👀', respect: 0, share: 0.35, exposure: 0.4,
    description: 'Tu regardes la rue et tu préviens. C’est peu, et c’est déjà un risque.',
  },
  {
    level: 2, name: 'Homme de main', emoji: '🧤', respect: 25, share: 0.5, exposure: 0.7,
    description: 'On t’envoie faire ce que personne ne veut faire.',
  },
  {
    level: 3, name: 'Lieutenant', emoji: '🎖️', respect: 50, share: 0.65, exposure: 1,
    description: 'Tu as des gens sous toi, donc des comptes à rendre sur eux.',
  },
  {
    level: 4, name: 'Bras droit', emoji: '🤝', respect: 72, share: 0.78, exposure: 1.3,
    description: 'On te consulte. On te surveille aussi, des deux côtés.',
  },
  {
    level: 5, name: 'Patron', emoji: '👑', respect: 90, share: 0.9, exposure: 1.7,
    description: 'Tout remonte à toi, y compris ce que tu n’as pas décidé.',
  },
];

export function rankAt(level: number): RankDef {
  return RANKS[Math.max(0, Math.min(RANKS.length - 1, Math.round(level)))];
}

/* ------------------------------------------------------------------ */
/* Le carnet                                                           */
/* ------------------------------------------------------------------ */

export type ContactRole = 'receleur' | 'indicateur' | 'chauffeur' | 'logeur' | 'avocat';

export interface ContactRoleDef {
  id: ContactRole;
  name: string;
  emoji: string;
  /** Ce que la personne apporte, en une phrase. */
  service: string;
  /** Coût du service, en unités de base (mis à l'échelle du pays). */
  price: number;
  /** Rang minimal pour qu'on accepte de te connaître. */
  minRank: number;
}

export const CONTACT_ROLES: ContactRoleDef[] = [
  {
    id: 'receleur', name: 'Receleur', emoji: '🏷️',
    service: 'Reprend ce que tu ne peux pas garder, et en donne plus que la rue',
    price: 0, minRank: 0,
  },
  {
    id: 'indicateur', name: 'Indicateur', emoji: '📻',
    service: 'Sait avant toi quand on s’intéresse à ton nom',
    price: 900, minRank: 1,
  },
  {
    id: 'chauffeur', name: 'Chauffeur', emoji: '🚙',
    service: 'Attend au coin de la rue quand ça tourne mal',
    price: 1_400, minRank: 1,
  },
  {
    id: 'logeur', name: 'Logeur', emoji: '🚪',
    service: 'Un endroit où personne ne vient te chercher, le temps que ça passe',
    price: 2_200, minRank: 0,
  },
  {
    id: 'avocat', name: 'Avocat du milieu', emoji: '📁',
    service: 'Connaît les dossiers avant les juges',
    price: 6_000, minRank: 2,
  },
];

export const CONTACT_ROLE_MAP = new Map(CONTACT_ROLES.map((r) => [r.id, r]));

/* ------------------------------------------------------------------ */
/* Les missions                                                        */
/* ------------------------------------------------------------------ */

export type MissionKind =
  | 'collecte' | 'livraison' | 'intimidation' | 'récupération' | 'territoire' | 'contrat';

export interface MissionDef {
  kind: MissionKind;
  name: string;
  emoji: string;
  description: string;
  /** Rang minimal auquel on la propose. */
  minRank: number;
  /** Difficulté 0-100 : ce qu'il faut valoir pour la réussir. */
  difficulty: number;
  /**
   * Gain de base, avant part de rang, territoire et inflation.
   *
   * L'échelle est celle du catalogue de délits (`data/crimes.ts`), et elle
   * doit le rester : une maison qui paierait moins qu'un coup monté tout seul
   * n'aurait aucune raison d'exister. Ce qu'elle offre en échange de sa part,
   * c'est la régularité — une mission se joue sur ce qu'on vaut, pas sur un
   * tirage à queue épaisse.
   */
  reward: number;
  /** Ce qu'elle attire comme attention, 0-1. */
  heat: number;
  /** Respect gagné en réussissant. */
  respect: number;
  /** Ce que ça coûte en karma. */
  karma: number;
  /**
   * Le mini-jeu qui la joue, s'il y en a un.
   *
   * Une mission n'invente pas sa propre mécanique : elle réutilise celles qui
   * existent déjà. C'est ce qui fait qu'une mission de récupération *est* un
   * cambriolage, avec les mêmes règles et les mêmes issues.
   */
  miniGame?: 'burglary' | 'chase' | 'pickpocket';
}

export const MISSIONS: MissionDef[] = [
  {
    kind: 'collecte', name: 'Faire la tournée', emoji: '💼',
    description: 'Passer chez ceux qui doivent, et revenir avec ce qu’ils doivent.',
    minRank: 1, difficulty: 30, reward: 9_000, heat: 0.2, respect: 6, karma: 4,
  },
  {
    kind: 'livraison', name: 'Porter un paquet', emoji: '📦',
    description: 'D’un point à un autre, sans poser de question et sans être suivi.',
    minRank: 1, difficulty: 38, reward: 14_000, heat: 0.35, respect: 7, karma: 5,
    miniGame: 'chase',
  },
  {
    kind: 'intimidation', name: 'Faire comprendre', emoji: '👊',
    description: 'Quelqu’un a besoin qu’on lui rappelle un arrangement.',
    minRank: 2, difficulty: 46, reward: 22_000, heat: 0.4, respect: 11, karma: 12,
  },
  {
    kind: 'récupération', name: 'Récupérer ce qui manque', emoji: '🗝️',
    description: 'Ce n’est pas un vol : la maison a quelque chose qui n’est pas à elle.',
    minRank: 2, difficulty: 56, reward: 38_000, heat: 0.55, respect: 14, karma: 10,
    miniGame: 'burglary',
  },
  {
    kind: 'territoire', name: 'Tenir la rue', emoji: '🚩',
    description: 'Les voisins avancent. Il faut qu’ils reculent.',
    minRank: 3, difficulty: 68, reward: 60_000, heat: 0.7, respect: 20, karma: 16,
  },
  {
    kind: 'contrat', name: 'Le service qu’on ne refuse pas', emoji: '🩸',
    description: 'On ne t’explique rien, et tu n’as pas envie qu’on t’explique.',
    minRank: 4, difficulty: 82, reward: 130_000, heat: 0.9, respect: 30, karma: 34,
  },
];

/* ------------------------------------------------------------------ */
/* Les organisations                                                   */
/* ------------------------------------------------------------------ */

/** Fragments de noms, pour composer des maisons qui n'existent pas. */
export const ORG_FIRST = [
  'Les Frères', 'La Maison', 'Le Cercle', 'Les Gens', 'La Compagnie',
  'Le Syndicat', 'Les Associés', 'La Famille', 'Le Comité', 'Les Anciens',
];

export const ORG_SECOND = [
  'du Port', 'du Nord', 'de la Halle', 'du Canal', 'des Docks',
  'de la Colline', 'du Marché', 'de l’Est', 'de la Gare', 'du Vieux Pont',
];

/** Ce que l'organisation fait de son argent — change son tempérament. */
export type OrgStyle = 'discret' | 'brutal' | 'commerçant';

export const ORG_STYLES: Record<OrgStyle, { label: string; note: string }> = {
  discret: {
    label: 'Discrète',
    note: 'Peu de bruit, peu de morts, peu de marge. On y monte lentement.',
  },
  brutal: {
    label: 'Brutale',
    note: 'On y monte vite et on y tombe vite. La police y pense souvent.',
  },
  commerçant: {
    label: 'Commerçante',
    note: 'Tout se négocie. Les missions rapportent, les trahisons aussi.',
  },
};
