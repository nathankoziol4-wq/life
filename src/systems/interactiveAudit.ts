/**
 * Audit du gameplay interactif.
 *
 * La question posée ici est différente de celle de la matrice de parité. La
 * matrice demande « cette fonctionnalité existe-t-elle ? » ; cet audit demande
 * « le joueur a-t-il quelque chose à *faire*, ou seulement à lire ? ».
 *
 * Une action est INTERACTIVE quand elle passe par un mini-jeu inscrit au
 * registre. Elle est ARBITRÉE quand elle n'a pas de mini-jeu mais demande au
 * joueur des décisions dont le résultat dépend — choisir une cible, un avocat,
 * une condition. Elle est PASSIVE quand il ne reste qu'un bouton et un tirage.
 *
 * Comme pour la matrice, l'audit est rattaché au code : déclarer une action
 * INTERACTIVE en citant un mini-jeu qui n'existe pas fait échouer le test.
 */

import { allMiniGames, getMiniGame } from '../engine/minigame.ts';

export type Interactivity = 'INTERACTIVE' | 'ARBITRÉE' | 'PASSIVE';

export interface InteractiveEntry {
  /** Action telle que le joueur la voit. */
  action: string;
  domain: string;
  level: Interactivity;
  /** Identifiant du mini-jeu, obligatoire si INTERACTIVE. */
  miniGame?: string;
  /** Ce qui manque pour monter d'un cran. */
  gap?: string;
  /** 1 = à faire en premier. */
  priority: number;
}

/**
 * Les actions importantes du jeu.
 *
 * « Importante » veut dire : le joueur la choisit délibérément et elle a des
 * conséquences durables. Prendre le bus n'y figure pas ; braquer une banque,
 * passer un examen ou monter sur scène, oui.
 */
export const INTERACTIVE_AUDIT: InteractiveEntry[] = [
  /* ---------------- Crime ---------------- */
  {
    action: 'Vol à la tire', domain: 'Crime', level: 'INTERACTIVE',
    miniGame: 'pickpocket', priority: 1,
  },
  {
    action: 'Cambriolage', domain: 'Crime', level: 'INTERACTIVE',
    miniGame: 'burglary', priority: 1,
  },
  {
    action: 'Vol de véhicule', domain: 'Crime', level: 'PASSIVE', priority: 2,
    gap: 'puzzle fictif de précision sous jauge de détection',
  },
  {
    action: 'Braquage', domain: 'Crime', level: 'PASSIVE', priority: 2,
    gap: 'minutage, niveau d’alerte, décision de partir',
  },
  {
    action: 'Vol à l’étalage', domain: 'Crime', level: 'PASSIVE', priority: 3,
    gap: 'déplacement dans le magasin, surveillance, sortie',
  },
  {
    action: 'Fuite après un coup', domain: 'Crime', level: 'INTERACTIVE',
    miniGame: 'chase', priority: 2,
  },
  {
    action: 'Choix de la cible', domain: 'Crime', level: 'ARBITRÉE', priority: 4,
  },

  /* ---------------- Prison et justice ---------------- */
  {
    action: 'Évasion', domain: 'Prison', level: 'PASSIVE', priority: 1,
    gap: 'le plan et les poursuivants existent (`chase`), reste à les brancher sur la prison',
  },
  {
    action: 'Émeute', domain: 'Prison', level: 'PASSIVE', priority: 3,
    gap: 'rallier des détenus sans se faire intercepter',
  },
  {
    action: 'Procès', domain: 'Justice', level: 'ARBITRÉE', priority: 3,
    gap: 'séquence à choix pendant l’audience',
  },
  {
    action: 'Choix de l’avocat', domain: 'Justice', level: 'ARBITRÉE', priority: 5,
  },

  /* ---------------- Vie ordinaire ---------------- */
  {
    action: 'Permis de conduire', domain: 'Véhicules', level: 'PASSIVE', priority: 2,
    gap: 'questionnaire fictif généré, échec et repassage',
  },
  {
    action: 'Examens scolaires', domain: 'École', level: 'PASSIVE', priority: 4,
    gap: 'épreuve optionnelle, avec résolution automatique par défaut',
  },
  {
    action: 'Entretien d’embauche', domain: 'Travail', level: 'PASSIVE', priority: 3,
    gap: 'questions contextuelles selon le métier et le caractère',
  },
  {
    action: 'Demander à ses parents', domain: 'Enfance', level: 'ARBITRÉE', priority: 5,
  },
  {
    action: 'Manquer de respect', domain: 'École', level: 'ARBITRÉE', priority: 5,
  },
  {
    action: 'Demander une promotion', domain: 'Travail', level: 'ARBITRÉE', priority: 5,
  },

  /* ---------------- Carrières spéciales ---------------- */
  {
    action: 'Concert', domain: 'Musique', level: 'PASSIVE', priority: 3,
    gap: 'mini-jeu de rythme',
  },
  {
    action: 'Match ou compétition', domain: 'Sport', level: 'PASSIVE', priority: 3,
    gap: 'visée et minutage selon le sport',
  },
  {
    action: 'Audition', domain: 'Cinéma', level: 'PASSIVE', priority: 3,
    gap: 'mémorisation d’une réplique, minutage',
  },
  {
    action: 'Séance photo', domain: 'Mannequinat', level: 'PASSIVE', priority: 4,
    gap: 'pose et minutage',
  },
  {
    action: 'Mission spatiale', domain: 'Astronaute', level: 'PASSIVE', priority: 4,
    gap: 'puzzle de procédure fictive',
  },

  /* ---------------- Finance ---------------- */
  {
    action: 'Investir', domain: 'Finance', level: 'PASSIVE', priority: 1,
    gap: 'aucun portefeuille : le système n’existe pas encore',
  },
  {
    action: 'Casino', domain: 'Jeux d’argent', level: 'ARBITRÉE', priority: 5,
  },
];

/**
 * Passe l'audit et signale les incohérences.
 *
 * C'est la fonction demandée au §79. Elle est utilisée par les tests, et par
 * `npm run parity` pour écrire le document.
 */
export function auditInteractiveGameplay(): {
  entries: InteractiveEntry[];
  problems: string[];
  score: number;
  byLevel: Record<Interactivity, number>;
} {
  const problems: string[] = [];

  for (const entry of INTERACTIVE_AUDIT) {
    const label = `${entry.domain} / ${entry.action}`;
    if (entry.level === 'INTERACTIVE') {
      if (!entry.miniGame) problems.push(`${label} : déclarée interactive sans mini-jeu.`);
      else if (!getMiniGame(entry.miniGame)) {
        problems.push(`${label} : le mini-jeu « ${entry.miniGame} » n’est pas inscrit au registre.`);
      }
      if (entry.gap) problems.push(`${label} : interactive mais un manque est déclaré.`);
    } else if (entry.miniGame) {
      problems.push(`${label} : cite un mini-jeu sans être déclarée interactive.`);
    } else if (entry.level === 'PASSIVE' && !entry.gap) {
      problems.push(`${label} : passive sans dire ce qui manque.`);
    }
  }

  // Un mini-jeu inscrit mais rattaché à aucune action est du code mort.
  for (const game of allMiniGames()) {
    if (!INTERACTIVE_AUDIT.some((e) => e.miniGame === game.id)) {
      problems.push(`Le mini-jeu « ${game.id} » n’est utilisé par aucune action.`);
    }
  }

  const byLevel: Record<Interactivity, number> = { INTERACTIVE: 0, ARBITRÉE: 0, PASSIVE: 0 };
  for (const entry of INTERACTIVE_AUDIT) byLevel[entry.level] += 1;

  // Le score compte une action arbitrée pour une demi-action interactive :
  // décider n'est pas jouer, mais c'est déjà beaucoup mieux que lire.
  const total = INTERACTIVE_AUDIT.length;
  const score = Math.round(((byLevel.INTERACTIVE + byLevel.ARBITRÉE * 0.5) / total) * 100);

  return { entries: INTERACTIVE_AUDIT, problems, score, byLevel };
}

/** Ce qu'il faut rendre jouable en premier. */
export function nextInteractive(limit = 10): InteractiveEntry[] {
  return [...INTERACTIVE_AUDIT]
    .filter((e) => e.level !== 'INTERACTIVE')
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}
