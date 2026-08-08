/**
 * Pont entre le moteur et React.
 *
 * L'état du jeu est un objet mutable détenu par une `ref` : les systèmes le
 * modifient en place, et un compteur de version force le rendu. On évite ainsi
 * de cloner une sauvegarde entière à chaque clic, tout en gardant un moteur
 * totalement ignorant de React.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
  type ReactNode,
} from 'react';
import { createCtx, type Ctx } from '../engine/context.ts';
import { createNewLife, type NewLifeOptions } from '../engine/newLife.ts';
import { buildSummary, simulateYear, type LifeSummary } from '../engine/simulateYear.ts';
import {
  clearSave, loadGame, loadHistory, loadSettings, recordPastLife, saveGame, saveSettings,
  type PastLife, type Settings,
} from '../engine/save.ts';
import { netWorth } from '../systems/finance.ts';
import { resolvePending } from '../systems/randomEvents.ts';
import type { ActionResult, GameState, PendingEvent, TimelineEntry } from '../engine/types.ts';

export interface ResultModal {
  title: string;
  message: string;
  tone: 'good' | 'bad' | 'neutral';
  icon?: string;
}

interface GameApi {
  state: GameState | null;
  /** Version incrémentée à chaque mutation — utile comme clé de rendu. */
  version: number;
  settings: Settings;
  history: PastLife[];
  /** Événement interactif actuellement affiché. */
  currentEvent: PendingEvent | null;
  /** Résultat d'action à afficher dans une modale. */
  result: ResultModal | null;
  /** Récapitulatif de fin de vie. */
  summary: LifeSummary | null;
  /** Entrées ajoutées par la dernière année (pour l'animation). */
  lastEntries: TimelineEntry[];
  busy: boolean;

  startNewLife: (opts?: NewLifeOptions) => void;
  advanceYear: () => void;
  /** Exécute une action du moteur et affiche son résultat. */
  run: (fn: (ctx: Ctx) => ActionResult, icon?: string) => ActionResult;
  /** Exécute une mutation sans modale de résultat. */
  mutate: (fn: (ctx: Ctx) => void) => void;
  answerEvent: (choiceIndex: number) => void;
  dismissResult: () => void;
  dismissSummary: () => void;
  toast: (message: string) => void;
  toastMessage: string | null;
  updateSettings: (patch: Partial<Settings>) => void;
  abandonLife: () => void;
}

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const stateRef = useRef<GameState | null>(null);
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const [currentEvent, setCurrentEvent] = useState<PendingEvent | null>(null);
  const [result, setResult] = useState<ResultModal | null>(null);
  const [summary, setSummary] = useState<LifeSummary | null>(null);
  const [lastEntries, setLastEntries] = useState<TimelineEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [history, setHistory] = useState<PastLife[]>(() => loadHistory());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chargement initial de la sauvegarde.
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    if (booted) return;
    const loaded = loadGame();
    if (loaded) {
      stateRef.current = loaded;
      // Une partie rechargée peut avoir des événements non résolus.
      setCurrentEvent(loaded.pending[0] ?? null);
      bump();
    }
    setBooted(true);
  }, [booted]);

  const persist = useCallback(() => {
    if (settings.autoSave && stateRef.current) saveGame(stateRef.current);
  }, [settings.autoSave]);

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2600);
  }, []);

  const startNewLife = useCallback((opts: NewLifeOptions = {}) => {
    const fresh = createNewLife(opts);
    stateRef.current = fresh;
    setCurrentEvent(null);
    setResult(null);
    setSummary(null);
    setLastEntries(fresh.timeline);
    saveGame(fresh);
    bump();
  }, []);

  const finishLife = useCallback((state: GameState) => {
    const worth = Number(state.player.flags.finalNetWorth ?? netWorth(state));
    const built = buildSummary(state, [], worth);
    setSummary(built);
    setHistory(recordPastLife(state, built));
    saveGame(state);
  }, []);

  const advanceYear = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.gameOver || currentEvent || busy) return;
    setBusy(true);
    const outcome = simulateYear(state);
    setLastEntries(outcome.entries);
    bump();
    if (outcome.died) {
      finishLife(state);
    } else {
      setCurrentEvent(state.pending[0] ?? null);
      persist();
    }
    setBusy(false);
  }, [busy, currentEvent, finishLife, persist]);

  const run = useCallback(
    (fn: (ctx: Ctx) => ActionResult, icon?: string): ActionResult => {
      const state = stateRef.current;
      if (!state) return { ok: false, message: 'Aucune partie en cours.' };
      const ctx = createCtx(state);
      const outcome = fn(ctx);
      bump();
      if (!outcome.ok) {
        toast(outcome.message);
      } else {
        setResult({
          title: outcome.title ?? 'Résultat',
          message: outcome.message,
          tone: outcome.tone ?? 'neutral',
          icon,
        });
      }
      persist();
      return outcome;
    },
    [persist, toast],
  );

  const mutate = useCallback(
    (fn: (ctx: Ctx) => void) => {
      const state = stateRef.current;
      if (!state) return;
      fn(createCtx(state));
      bump();
      persist();
    },
    [persist],
  );

  const answerEvent = useCallback(
    (choiceIndex: number) => {
      const state = stateRef.current;
      if (!state || !currentEvent) return;
      const ctx = createCtx(state);
      const outcome = resolvePending(ctx, currentEvent.id, choiceIndex);
      setLastEntries((prev) => [...prev, ...ctx.entries]);
      bump();

      if (outcome.text) {
        setResult({
          title: currentEvent.title,
          message: outcome.text,
          tone: outcome.tone,
          icon: currentEvent.icon,
        });
      }
      // Événement suivant, s'il y en a un.
      setCurrentEvent(state.pending[0] ?? null);

      // Un événement peut avoir été fatal indirectement (maladie, accident).
      if (!state.player.alive && !state.gameOver) {
        state.gameOver = true;
        finishLife(state);
      }
      persist();
    },
    [currentEvent, finishLife, persist],
  );

  const dismissResult = useCallback(() => setResult(null), []);

  const dismissSummary = useCallback(() => {
    setSummary(null);
    clearSave();
    stateRef.current = null;
    bump();
  }, []);

  const abandonLife = useCallback(() => {
    clearSave();
    stateRef.current = null;
    setCurrentEvent(null);
    setResult(null);
    setSummary(null);
    bump();
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const api = useMemo<GameApi>(
    () => ({
      state: stateRef.current,
      version,
      settings,
      history,
      currentEvent,
      result,
      summary,
      lastEntries,
      busy,
      startNewLife,
      advanceYear,
      run,
      mutate,
      answerEvent,
      dismissResult,
      dismissSummary,
      toast,
      toastMessage,
      updateSettings,
      abandonLife,
    }),
    [
      version, settings, history, currentEvent, result, summary, lastEntries, busy,
      startNewLife, advanceYear, run, mutate, answerEvent, dismissResult, dismissSummary,
      toast, toastMessage, updateSettings, abandonLife,
    ],
  );

  if (!booted) return null;
  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame doit être utilisé dans un GameProvider');
  return ctx;
}

/** Raccourci : l'état, garanti non nul (à utiliser dans les écrans de jeu). */
export function useGameState(): GameState {
  const { state } = useGame();
  if (!state) throw new Error('Aucune partie en cours');
  return state;
}
