/**
 * Le thème, et qui décide.
 *
 * Trois états, et il en faut trois : clair choisi, sombre choisi, et « comme
 * l'appareil » — qui n'est pas un quatrième thème mais l'absence de choix.
 * Une interface qui n'aurait que deux états forcerait le joueur à rechoisir
 * chaque fois que son téléphone bascule le soir.
 *
 * Le choix se pose sur la racine du document, jamais sur un composant : les
 * jetons (`tokens.css`) font le reste, et **aucun écran n'a besoin de savoir
 * quel thème est actif**. C'est ce qui permet d'en changer sans réécrire une
 * ligne d'écran.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'odyssia.theme.v1';

interface ThemeApi {
  /** Ce que le joueur a choisi. */
  choice: ThemeChoice;
  /** Ce qui est réellement affiché, une fois l'appareil consulté. */
  resolved: 'light' | 'dark';
  setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

function readStored(): ThemeChoice {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw === 'light' || raw === 'dark' ? raw : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // On suit l'appareil tant que le joueur n'a rien choisi.
  useEffect(() => {
    const query = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return undefined;
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: 'light' | 'dark' = choice === 'system'
    ? (systemDark ? 'dark' : 'light')
    : choice;

  useEffect(() => {
    const root = globalThis.document?.documentElement;
    if (!root) return;
    // « Comme l'appareil » ne pose rien : c'est la requête média qui décide,
    // et poser un attribut ici la court-circuiterait.
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
    // La barre du navigateur suit la couleur de fond.
    const meta = root.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#080915' : '#e8eaf4');
  }, [choice, resolved]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      globalThis.localStorage?.setItem(KEY, next);
    } catch {
      // Un stockage refusé n'empêche pas de jouer : le thème vaut la session.
    }
  }, []);

  const api = useMemo<ThemeApi>(
    () => ({ choice, resolved, setChoice }),
    [choice, resolved, setChoice],
  );

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const api = useContext(ThemeContext);
  if (!api) throw new Error('useTheme hors de ThemeProvider');
  return api;
}
