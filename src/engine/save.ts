/**
 * Sauvegarde (§22).
 *
 * Tout l'état du jeu est sérialisable : personnage, PNJ, relations, carrière,
 * études, biens, maladies, décisions, timeline et état du générateur
 * aléatoire. La sauvegarde est automatique après chaque action significative.
 */

import type { GameState } from './types.ts';
import { SAVE_VERSION } from './newLife.ts';
import { buildSummary, type LifeSummary } from './simulateYear.ts';
import { initialAssetPrices } from '../systems/investing.ts';
import { getJob } from '../data/jobs.ts';
import { nativeLanguages } from '../systems/languages.ts';

const SAVE_KEY = 'odyssia.save.v1';
const HISTORY_KEY = 'odyssia.history.v1';
const VAULT_KEY = 'odyssia.vault.v1';
const SETTINGS_KEY = 'odyssia.settings.v1';
const BESTS_KEY = 'odyssia.palmares.v1';

/** Entrée du cimetière : une vie terminée. */
export interface PastLife {
  id: string;
  name: string;
  age: number;
  cause: string;
  netWorth: number;
  job: string;
  score: number;
  year: number;
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    // Vérifie que l'écriture est réellement autorisée (mode privé, quotas…).
    localStorage.setItem('__odyssia_test__', '1');
    localStorage.removeItem('__odyssia_test__');
    return localStorage;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // Quota dépassé : on élague la timeline la plus ancienne et on réessaie.
    try {
      const trimmed: GameState = { ...state, timeline: state.timeline.slice(-400) };
      store.setItem(SAVE_KEY, JSON.stringify(trimmed));
      return true;
    } catch {
      return false;
    }
  }
}

export function loadGame(): GameState | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== SAVE_VERSION) return null;
    if (!parsed.player || !parsed.npcs || !parsed.world) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

/** Complète les champs éventuellement absents d'une sauvegarde plus ancienne. */
function migrate(state: GameState): GameState {
  state.pending ??= [];
  state.eventLog ??= {};
  state.timeline ??= [];
  state.player.valuables ??= [];
  state.player.loans ??= [];
  state.player.pets ??= [];
  state.player.financeHistory ??= [];
  state.player.yearActions ??= {};
  state.player.flags ??= {};
  state.player.careerHistory ??= [];
  state.player.holdings ??= [];
  state.player.contacts ??= [];
  state.player.organization ??= null;
  state.player.pendingMission ??= null;
  state.player.service ??= null;
  state.player.veteran ??= null;
  state.player.campaign ??= null;
  state.player.chronicle ??= {
    promotions: 0, peakPerformance: 0, venturesRun: 0, marriages: 0,
    divorces: 0, yearsMarried: 0, yearsFamous: 0, lastFamousAge: 0,
    illnesses: 0, accidents: 0, inherited: 0, given: 0, rentYears: 0,
    investedYears: 0, vehiclesOwned: 0, lastConvictionYear: 0, passiveEarned: 0,
  };
  state.player.heirlooms ??= [];
  state.player.crown ??= null;
  state.player.challenges ??= [];
  state.player.keepsakes ??= [];
  state.player.skills ??= {};
  state.player.practices ??= {};
  state.player.roots ??= null;
  state.player.parenthood ??= { cycles: 0, spent: 0, lastCycle: null, file: null, arrived: 0 };
  state.player.doctorId ??= null;
  state.player.doctors ??= {};
  state.player.wedding ??= null;
  if (state.player.job) {
    state.player.job.suspicion ??= 0;
    state.player.job.taken ??= 0;
    state.player.job.tookYear ??= 0;
  }
  // Une sauvegarde d'avant les langues : on rend au personnage celle de son
  // pays d'origine, ce qu'il a évidemment toujours parlé.
  if (!state.player.languages) {
    state.player.languages = nativeLanguages(state.player.originCountryId);
  }
  state.player.seenPlaces ??= [];
  state.player.livedCountries ??= [state.player.countryId];
  // Comédien, musicien, sportif, mannequin et politique ont quitté la grille
  // des métiers : ce sont des carrières jouées, et les garder en double
  // faisait exister deux fois la même vie. Une sauvegarde qui tenait encore
  // un de ces postes se retrouvait avec un emploi inerte — payé chaque année,
  // sans progression ni promotion possibles. On le libère plutôt que de
  // laisser tourner cet emploi fantôme ; la discipline correspondante est
  // ouverte tout de suite, et elle est plus riche que ne l'était le poste.
  if (state.player.job && !getJob(state.player.job.jobId)) state.player.job = null;
  if (state.player.stage) {
    state.player.stage.tryout ??= null;
    state.player.stage.book ??= [];
    state.player.stage.releases ??= [];
    state.player.stage.tour ??= null;
    state.player.stage.deal ??= null;
  }
  state.player.mandate ??= null;
  state.player.criminalRecord.heat ??= 0;
  state.player.criminalRecord.investigation ??= null;
  state.player.financialLiteracy ??= 0;
  state.world.assetPrices ??= initialAssetPrices();
  state.player.criminalRecord.wantedSince ??= null;
  state.player.criminalRecord.escapedFrom ??= null;
  if (state.player.prison) {
    state.player.prison.escapePlan ??= 0;
    state.player.prison.suspicion ??= 0;
    state.player.prison.prepared ??= [];
  }
  state.world.jobOffers ??= [];
  state.world.propertyListings ??= [];
  state.world.vehicleListings ??= [];
  state.world.datingPool ??= [];
  return state;
}

/* ------------------------------------------------------------------ */
/* Export et import manuels                                           */
/* ------------------------------------------------------------------ */

/** Nom de fichier lisible pour une partie exportée. */
export function saveFileName(state: GameState): string {
  const p = state.player;
  const slug = `${p.firstName}-${p.lastName}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
  return `odyssia-${slug}-${p.age}ans.json`;
}

export function exportSave(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Relit une partie exportée. Renvoie `null` si le contenu n'est pas une
 * sauvegarde Odyssia exploitable — on ne remplace jamais une partie en cours
 * par des données douteuses.
 */
export function parseSave(text: string): GameState | null {
  try {
    const parsed = JSON.parse(text) as GameState;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== SAVE_VERSION) return null;
    if (!parsed.player || typeof parsed.player.age !== 'number') return null;
    if (!parsed.npcs || !parsed.world || !Array.isArray(parsed.timeline)) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  storage()?.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return Boolean(storage()?.getItem(SAVE_KEY));
}

/* ------------------------------------------------------------------ */
/* Historique des vies passées                                        */
/* ------------------------------------------------------------------ */

export function loadHistory(): PastLife[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PastLife[]) : [];
  } catch {
    return [];
  }
}

export function recordPastLife(state: GameState, summary: LifeSummary): PastLife[] {
  const store = storage();
  const entry: PastLife = {
    id: `${state.seed}_${state.year}`,
    name: summary.name,
    age: summary.ageAtDeath,
    cause: summary.cause,
    netWorth: summary.netWorth,
    job: summary.topJob,
    score: summary.score,
    year: state.year,
  };
  const history = [entry, ...loadHistory()].slice(0, 30);
  try {
    store?.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* l'historique est un confort, pas une donnée critique */
  }
  return history;
}

/* ------------------------------------------------------------------ */
/* Le cabinet                                                          */
/* ------------------------------------------------------------------ */

/**
 * Une pièce gagnée, et la vie qui l'a gagnée.
 *
 * Le cabinet est la seule chose du jeu qui survive à une partie neuve. Il ne
 * vit donc pas dans la sauvegarde — qui est effacée à chaque vie — mais à
 * côté, comme l'historique des vies passées.
 */
export interface Trophy {
  /** L'entrée de `data/challenges.ts#VAULT_PIECES`. */
  pieceId: string;
  /** Le défi qui l'a value. */
  challengeId: string;
  /** Qui l'a gagnée, et quand. Une pièce sans nom ne raconte rien. */
  who: string;
  year: number;
  age: number;
}

/**
 * Le cabinet vit d'abord en mémoire, et se recopie dans le navigateur.
 *
 * Contrairement à la sauvegarde, le cabinet n'est pas qu'une commodité : la
 * logique du jeu le **lit** — c'est lui qui décide des défis visibles. Le
 * laisser dépendre de `localStorage` le rendait vide partout ailleurs :
 * dans les tests, dans le pilote automatique, dans les outils. Une règle qui
 * ne s'applique que dans un navigateur n'est pas une règle du jeu.
 */
let vaultCache: Trophy[] | null = null;

export function loadVault(): Trophy[] {
  if (vaultCache) return vaultCache;
  const store = storage();
  let read: Trophy[] = [];
  try {
    const raw = store?.getItem(VAULT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) read = parsed as Trophy[];
  } catch {
    read = [];
  }
  vaultCache = read;
  return vaultCache;
}

/**
 * Ranger une pièce.
 *
 * Une pièce déjà présente n'est pas remplacée : le cabinet garde la *première*
 * vie qui a réussi, pas la dernière. Refaire un défi ne réécrit donc pas
 * l'histoire de celui qui l'a fait le premier.
 */
export function recordTrophy(trophy: Trophy): Trophy[] {
  const vault = loadVault();
  if (vault.some((t) => t.pieceId === trophy.pieceId)) return vault;
  vaultCache = [...vault, trophy];
  try {
    storage()?.setItem(VAULT_KEY, JSON.stringify(vaultCache));
  } catch {
    /* le cabinet est une mémoire, pas une donnée critique */
  }
  return vaultCache;
}

export function clearVault(): void {
  vaultCache = [];
  storage()?.removeItem(VAULT_KEY);
}

/* ------------------------------------------------------------------ */
/* Le palmarès                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce que le joueur a fait de mieux, toutes vies confondues.
 *
 * Rangé à côté de la sauvegarde pour la même raison que le cabinet : une
 * sauvegarde s'efface à chaque vie neuve, et un record qui s'effacerait avec
 * elle n'aurait rien à comparer. Et pour la même raison encore, il vit
 * d'abord en mémoire : la logique du jeu le lit, et une règle qui ne
 * s'appliquerait que dans un navigateur ne serait pas une règle du jeu.
 */
export interface BestEntry {
  recordId: string;
  value: number;
  who: string;
  age: number;
}

let bestsCache: BestEntry[] | null = null;

export function loadBests(): BestEntry[] {
  if (bestsCache) return bestsCache;
  let read: BestEntry[] = [];
  try {
    const raw = storage()?.getItem(BESTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) read = parsed as BestEntry[];
  } catch {
    read = [];
  }
  bestsCache = read;
  return bestsCache;
}

/** Remplacer une ligne du palmarès. Contrairement au cabinet, un record se bat. */
export function saveBest(entry: BestEntry): BestEntry[] {
  const kept = loadBests().filter((b) => b.recordId !== entry.recordId);
  bestsCache = [...kept, entry];
  try {
    storage()?.setItem(BESTS_KEY, JSON.stringify(bestsCache));
  } catch {
    /* le palmarès est une mémoire, pas une donnée critique */
  }
  return bestsCache;
}

export function clearBests(): void {
  bestsCache = [];
  storage()?.removeItem(BESTS_KEY);
}

export function clearHistory(): void {
  storage()?.removeItem(HISTORY_KEY);
}

/* ------------------------------------------------------------------ */
/* Préférences                                                        */
/* ------------------------------------------------------------------ */

export interface Settings {
  /** Sauvegarde automatique après chaque action. */
  autoSave: boolean;
  /** Confirmation avant les actions irréversibles. */
  confirmRisky: boolean;
}

export const DEFAULT_SETTINGS: Settings = { autoSave: true, confirmRisky: true };

export function loadSettings(): Settings {
  const store = storage();
  if (!store) return { ...DEFAULT_SETTINGS };
  try {
    const raw = store.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignoré */
  }
}

export { buildSummary };
export type { LifeSummary };
