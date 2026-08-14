/**
 * Les carrières qui se jouent.
 *
 * L'audit les classait toutes `PLACEHOLDER` : « un métier comédien comme un
 * autre ». Il y avait une échelle de salaires nommée « Acteur » et rien
 * derrière — pas d'audition, pas de rôle à choisir, pas de scène à tenir.
 *
 * Ce fichier décrit ce qui manquait, avec une idée directrice : **ces cinq
 * métiers ont la même forme**. On passe une épreuve pour être pris, on
 * accepte ou on refuse un engagement, on le tient plus ou moins bien, et
 * l'accueil décide de la suite. Un seul cadre les porte donc tous —
 * `systems/stage.ts` — et chacun apporte ses propres épreuves, ses propres
 * engagements et son propre vocabulaire.
 *
 * Rien n'est copié : ni nom réel, ni œuvre réelle, ni personne réelle. Les
 * studios, labels, clubs et partis sont inventés, et le vocabulaire reste
 * générique.
 */

import type { StatKey } from '../engine/types.ts';

/* ------------------------------------------------------------------ */
/* Les disciplines                                                     */
/* ------------------------------------------------------------------ */

export interface Discipline {
  id: string;
  label: string;
  emoji: string;
  /** Ce qu'on y fait, en une phrase. */
  what: string;
  /** L'âge à partir duquel on peut s'y présenter. */
  minAge: number;
  /** L'âge où le métier commence à se refermer. 0 = jamais. */
  peakAge: number;
  /** La statistique qui pèse le plus. */
  driver: StatKey;
  /** La deuxième, qui pèse moitié moins. */
  second: StatKey;
  /** Le nom de la compétence propre au métier. */
  craftName: string;
  /** Le nom de ce qu'on passe pour être pris. */
  tryoutName: string;
  /** Le nom d'un engagement. */
  jobName: string;
  /** Le nom de celui qui vous représente. */
  agentName: string;
  /** Ce que rapporte un engagement de référence, en unités de base. */
  baseFee: number;
  /** Ce que la discipline fait connaître. */
  visibility: number;
  /** L'identifiant du domaine de notoriété correspondant. */
  fameField: string;
  /** Le mini-jeu qui sert d'épreuve. */
  minigame: string;
  /** L'intérêt que la pratique entretient. */
  interest?: string;

  /* --- Les gens avec qui on exerce --- */

  /** Comment on appelle le groupe : « le groupe », « l'équipe », « la troupe ». */
  crewName: string;
  /** Comment on appelle quelqu'un dedans. */
  crewRole: string;
  /** Comment on appelle celui qui dirige. */
  coachName: string;
  /** Combien de personnes on peut réunir autour de soi. */
  crewSize: number;
  /**
   * Ce que les autres pèsent dans une prestation, 0-1.
   *
   * C'est ce qui sépare un métier collectif d'un métier solitaire. Un
   * mannequin est seul devant l'objectif ; un musicien de groupe ne vaut que
   * ce que vaut le groupe. Sans ce poids, « recruter » ne serait qu'un
   * carnet d'adresses décoratif.
   */
  crewWeight: number;
}

export const DISCIPLINES: Discipline[] = [
  {
    id: 'jeu', label: 'Comédien', emoji: '🎭',
    what: 'Passer des essais, tenir un rôle, et recommencer',
    minAge: 8, peakAge: 45, driver: 'looks', second: 'intelligence',
    craftName: 'Jeu', tryoutName: 'Essai', jobName: 'Rôle', agentName: 'Agent',
    baseFee: 9000, visibility: 13, fameField: 'écran',
    minigame: 'performance', interest: 'théâtre',
    crewName: 'la troupe', crewRole: 'partenaire de jeu', coachName: 'Metteur en scène',
    crewSize: 4, crewWeight: 0.3,
  },
  {
    id: 'musique', label: 'Musicien', emoji: '🎸',
    what: 'Jouer devant des gens, enregistrer, tourner',
    minAge: 10, peakAge: 42, driver: 'looks', second: 'discipline',
    craftName: 'Instrument', tryoutName: 'Audition', jobName: 'Engagement',
    agentName: 'Tourneur',
    baseFee: 6500, visibility: 12, fameField: 'scène',
    minigame: 'performance', interest: 'musique',
    crewName: 'le groupe', crewRole: 'musicien', coachName: 'Directeur artistique',
    crewSize: 4, crewWeight: 0.55,
  },
  {
    id: 'sport', label: 'Sportif', emoji: '🏟️',
    what: 'Être sélectionné, jouer, tenir la saison sans se blesser',
    minAge: 12, peakAge: 31, driver: 'fitness', second: 'discipline',
    craftName: 'Niveau', tryoutName: 'Sélection', jobName: 'Saison',
    agentName: 'Agent',
    baseFee: 14000, visibility: 13, fameField: 'terrain',
    minigame: 'performance', interest: 'course',
    crewName: 'l’équipe', crewRole: 'coéquipier', coachName: 'Entraîneur',
    crewSize: 5, crewWeight: 0.6,
  },
  {
    id: 'podium', label: 'Mannequin', emoji: '👗',
    what: 'Des castings, des séances, et une carrière courte',
    minAge: 15, peakAge: 29, driver: 'looks', second: 'fitness',
    craftName: 'Présence', tryoutName: 'Casting', jobName: 'Contrat',
    agentName: 'Agence',
    baseFee: 8000, visibility: 9, fameField: 'podium',
    minigame: 'performance', interest: 'mode',
    crewName: 'l’entourage', crewRole: 'assistant', coachName: 'Directeur artistique',
    crewSize: 2, crewWeight: 0.12,
  },
  {
    id: 'tribune', label: 'Politique', emoji: '🗳️',
    what: 'Se présenter, convaincre, puis gouverner et rendre des comptes',
    minAge: 25, peakAge: 0, driver: 'intelligence', second: 'reputation',
    craftName: 'Métier politique', tryoutName: 'Débat', jobName: 'Mandat',
    agentName: 'Directeur de campagne',
    baseFee: 11000, visibility: 10, fameField: 'tribune',
    minigame: 'performance', interest: 'histoire',
    crewName: 'l’équipe de campagne', crewRole: 'collaborateur', coachName: 'Directeur de cabinet',
    crewSize: 4, crewWeight: 0.45,
  },
];

export function getDiscipline(id: string): Discipline | undefined {
  return DISCIPLINES.find((d) => d.id === id);
}

/* ------------------------------------------------------------------ */
/* Les engagements                                                     */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on vous propose.
 *
 * Un engagement n'est pas un salaire : c'est un arbitrage. Le rôle qui paie
 * le mieux est rarement celui qui fait le plus pour votre nom, et celui qui
 * ferait le plus pour votre nom est rarement à votre portée.
 */
export interface JobTemplate {
  id: string;
  discipline: string;
  label: string;
  /** Ce que c'est, en une phrase. */
  what: string;
  /** Niveau de métier exigé, 0-100. */
  demands: number;
  /** Ce que ça paie, en multiples du cachet de référence. */
  pay: number;
  /** Ce que ça apporte au nom. */
  fame: number;
  /** Ce que ça prend de temps et de nerfs. */
  toll: number;
  /** Notoriété minimale pour qu'on vous le propose. */
  minFame: number;
  /** Ce que ça peut coûter en controverse. */
  risk: number;
  /** Ce que ça fait au métier lui-même. */
  growth: number;
}

const j = (
  discipline: string, id: string, label: string, what: string,
  demands: number, pay: number, fame: number,
  o: Partial<JobTemplate> = {},
): JobTemplate => ({
  id: `${discipline}_${id}`, discipline, label, what, demands, pay, fame,
  toll: 10, minFame: 0, risk: 0.15, growth: 5, ...o,
});

export const JOB_TEMPLATES: JobTemplate[] = [
  /* --- Comédien --- */
  j('jeu', 'figuration', 'De la figuration', 'Trois secondes à l’écran, personne ne saura que c’était toi', 8, 0.25, 1, { toll: 5, growth: 3 }),
  j('jeu', 'pub', 'Une publicité', 'Bien payé, vite tourné, et on te le rappellera longtemps', 22, 1.1, 3, { risk: 0.3, growth: 3 }),
  j('jeu', 'serie_second', 'Un second rôle en série', 'Six épisodes, un personnage qui a un nom', 38, 0.9, 6, { toll: 14 }),
  j('jeu', 'theatre', 'Une pièce', 'Peu d’argent, beaucoup de métier', 45, 0.4, 4, { toll: 18, growth: 12 }),
  j('jeu', 'voix', 'Du doublage', 'On entend ta voix sans voir ton visage', 30, 0.6, 2, { toll: 8, growth: 7 }),
  j('jeu', 'film_second', 'Un second rôle au cinéma', 'Deux mois de tournage et une affiche où tu es en petit', 55, 1.8, 11, { toll: 20, minFame: 15 }),
  j('jeu', 'serie_prem', 'Le premier rôle d’une série', 'Ta tête sur les affiches, et deux ans de ta vie', 68, 3.2, 20, { toll: 28, minFame: 30 }),
  j('jeu', 'film_prem', 'Le premier rôle d’un film', 'Ce pour quoi on fait ce métier', 80, 5.5, 28, { toll: 26, minFame: 45, risk: 0.25 }),
  j('jeu', 'auteur', 'Un film d’auteur', 'Personne ne le verra, tout le monde en parlera', 72, 0.7, 14, { toll: 22, minFame: 25, growth: 16 }),

  /* --- Musicien --- */
  j('musique', 'bar', 'Jouer dans un bar', 'Quarante personnes, dont douze qui écoutent', 8, 0.2, 1, { toll: 6, growth: 4 }),
  j('musique', 'mariage', 'Animer un mariage', 'Bien payé, et tu joueras ce qu’on te demande', 18, 0.9, 1, { toll: 10, growth: 2 }),
  j('musique', 'premiere_partie', 'Une première partie', 'Trente minutes devant un public qui n’est pas venu pour toi', 32, 0.5, 6, { toll: 12, growth: 9 }),
  j('musique', 'session', 'Du travail de studio', 'Tu joues sur le disque de quelqu’un d’autre', 40, 1, 2, { toll: 10, growth: 12 }),
  j('musique', 'single', 'Sortir un titre', 'Trois minutes qui décideront de l’année', 45, 0.8, 9, { toll: 16, risk: 0.25 }),
  j('musique', 'festival', 'Un festival', 'Une heure, en plein jour, devant des milliers de gens', 55, 1.6, 14, { toll: 18, minFame: 20 }),
  j('musique', 'album', 'Enregistrer un album', 'Six mois enfermé pour quelque chose qui restera', 62, 1.4, 18, { toll: 30, minFame: 25, growth: 14 }),
  j('musique', 'tournee', 'Partir en tournée', 'Vingt villes, vingt hôtels, et le même repas', 68, 3.4, 22, { toll: 40, minFame: 35 }),
  j('musique', 'stade', 'Jouer dans un stade', 'Ce dont on ne revient pas tout à fait', 85, 6, 30, { toll: 34, minFame: 60 }),

  /* --- Sportif --- */
  j('sport', 'club_local', 'Un club local', 'On te paie à peine, mais tu joues', 10, 0.2, 1, { toll: 14, growth: 6 }),
  j('sport', 'semi_pro', 'Une équipe semi-professionnelle', 'Un vrai contrat, un vrai calendrier', 28, 0.7, 3, { toll: 20, growth: 8 }),
  j('sport', 'division2', 'La deuxième division', 'Le métier, sans la lumière', 45, 1.6, 7, { toll: 26, minFame: 5 }),
  j('sport', 'division1', 'L’élite', 'Là où tout le monde voulait aller', 65, 4.2, 18, { toll: 32, minFame: 20 }),
  j('sport', 'selection', 'La sélection nationale', 'On ne te demande pas, on te convoque', 78, 2.5, 24, { toll: 30, minFame: 35 }),
  j('sport', 'transfert', 'Un transfert à l’étranger', 'Beaucoup d’argent, une langue à apprendre', 70, 5.5, 16, { toll: 36, minFame: 30, risk: 0.25 }),
  j('sport', 'sponsor', 'Un contrat de partenariat', 'Ton nom sur un produit', 55, 2.2, 8, { toll: 8, minFame: 25, risk: 0.35, growth: 0 }),

  /* --- Mannequin --- */
  j('podium', 'catalogue', 'Un catalogue', 'Douze heures pour quatre images', 12, 0.4, 1, { toll: 10, growth: 5 }),
  j('podium', 'local', 'Un défilé local', 'Une salle, cinquante chaises', 25, 0.5, 3, { toll: 12, growth: 8 }),
  j('podium', 'campagne', 'Une campagne', 'Ton visage dans le métro pendant six semaines', 45, 2, 10, { toll: 12, minFame: 10, risk: 0.3 }),
  j('podium', 'magazine', 'Une couverture', 'Ce que les agences regardent', 58, 1.2, 14, { toll: 14, minFame: 20 }),
  j('podium', 'defile', 'Un grand défilé', 'Quatre minutes, et il faut être là', 68, 2.6, 18, { toll: 20, minFame: 35 }),
  j('podium', 'egerie', 'Devenir une égérie', 'Un contrat de trois ans avec une maison', 80, 6, 26, { toll: 18, minFame: 50 }),

  /* --- Politique --- */
  j('tribune', 'militant', 'Militer', 'Des tracts, des réunions, personne ne te connaît', 8, 0, 1, { toll: 10, growth: 8 }),
  j('tribune', 'local', 'Un mandat local', 'Des trottoirs, des écoles, des gens qui t’arrêtent dans la rue', 30, 0.6, 5, { toll: 22, growth: 10 }),
  j('tribune', 'assemblee', 'Un siège à l’assemblée', 'Des textes, des couloirs, et une salle qui vote', 55, 1.4, 14, { toll: 28, minFame: 15, risk: 0.3 }),
  j('tribune', 'maire', 'Diriger une ville', 'Tout ce qui va mal devient ta faute', 62, 1.6, 16, { toll: 34, minFame: 20, risk: 0.35 }),
  j('tribune', 'ministre', 'Entrer au gouvernement', 'Beaucoup de pouvoir, aucune sécurité', 78, 2.4, 26, { toll: 40, minFame: 40, risk: 0.5 }),
  j('tribune', 'national', 'Une candidature nationale', 'Six mois où plus rien d’autre n’existe', 88, 1.8, 34, { toll: 48, minFame: 55, risk: 0.55 }),
];

export function templatesFor(discipline: string): JobTemplate[] {
  return JOB_TEMPLATES.filter((t) => t.discipline === discipline);
}

/* ------------------------------------------------------------------ */
/* Les récompenses                                                     */
/* ------------------------------------------------------------------ */

export interface Accolade {
  id: string;
  discipline: string;
  label: string;
  /** Ce qu'il faut avoir accompli. */
  needs: { craft?: number; fame?: number; jobs?: number; bestReception?: number };
  fame: number;
  note: string;
}

export const ACCOLADES: Accolade[] = [
  { id: 'jeu_espoir', discipline: 'jeu', label: 'Prix du meilleur espoir', needs: { craft: 45, bestReception: 70 }, fame: 8, note: 'Le prix qu’on reçoit une fois.' },
  { id: 'jeu_interpretation', discipline: 'jeu', label: 'Prix d’interprétation', needs: { craft: 70, bestReception: 82, jobs: 6 }, fame: 16, note: 'Celui qui change un cachet.' },
  { id: 'jeu_carriere', discipline: 'jeu', label: 'Prix d’honneur', needs: { craft: 88, jobs: 18 }, fame: 12, note: 'On te le donne quand on pense que tu as fini.' },
  { id: 'musique_revelation', discipline: 'musique', label: 'Révélation de l’année', needs: { craft: 45, bestReception: 70 }, fame: 8, note: 'Une fois, et jamais deux.' },
  { id: 'musique_disque', discipline: 'musique', label: 'Disque de l’année', needs: { craft: 70, bestReception: 84, jobs: 6 }, fame: 18, note: 'Celui qu’on cite pendant vingt ans.' },
  { id: 'musique_scene', discipline: 'musique', label: 'Meilleure scène', needs: { craft: 78, jobs: 12 }, fame: 12, note: 'Récompense ce qui ne s’enregistre pas.' },
  { id: 'sport_meilleur', discipline: 'sport', label: 'Joueur de la saison', needs: { craft: 72, bestReception: 82 }, fame: 14, note: 'Une saison, pas une carrière.' },
  { id: 'sport_titre', discipline: 'sport', label: 'Un titre', needs: { craft: 80, jobs: 8 }, fame: 20, note: 'Ce pour quoi on a tout accepté.' },
  { id: 'sport_record', discipline: 'sport', label: 'Un record', needs: { craft: 92, jobs: 14 }, fame: 22, note: 'Il tiendra ou il ne tiendra pas.' },
  { id: 'podium_visage', discipline: 'podium', label: 'Visage de l’année', needs: { craft: 65, bestReception: 80 }, fame: 14, note: 'Un an, exactement.' },
  { id: 'podium_maison', discipline: 'podium', label: 'Contrat d’exclusivité', needs: { craft: 82, jobs: 10 }, fame: 16, note: 'Une maison décide que tu es à elle.' },
  { id: 'tribune_elu', discipline: 'tribune', label: 'Réélection confortable', needs: { craft: 60, jobs: 6 }, fame: 10, note: 'La seule récompense qui compte vraiment.' },
  { id: 'tribune_loi', discipline: 'tribune', label: 'Une loi à ton nom', needs: { craft: 78, bestReception: 78 }, fame: 18, note: 'Elle te survivra, en bien ou en mal.' },
];

export function accoladesFor(discipline: string): Accolade[] {
  return ACCOLADES.filter((a) => a.discipline === discipline);
}

/* ------------------------------------------------------------------ */
/* Ce qu'on dit d'un engagement une fois terminé                       */
/* ------------------------------------------------------------------ */

export const RECEPTION_BANDS: { min: number; label: string; note: string }[] = [
  { min: 88, label: 'Salué partout', note: 'On en parlera longtemps, et on te le rappellera.' },
  { min: 72, label: 'Bien reçu', note: 'Solide. On te rappellera.' },
  { min: 55, label: 'Correct', note: 'Personne n’a rien à en dire, ce qui est déjà quelque chose.' },
  { min: 38, label: 'Tiède', note: 'Ça passe inaperçu. C’est le pire des accueils.' },
  { min: 0, label: 'Mauvais', note: 'On s’en souviendra, et pas comme tu voudrais.' },
];

export function receptionLabel(value: number): { label: string; note: string } {
  return RECEPTION_BANDS.find((b) => value >= b.min) ?? RECEPTION_BANDS[RECEPTION_BANDS.length - 1];
}
