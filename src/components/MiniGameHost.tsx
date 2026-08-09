/**
 * Coquille d'accueil d'un mini-jeu.
 *
 * Elle ne connaît aucune règle : elle fait tourner la boucle, transmet ce que
 * le doigt fait, et rend la main avec le résultat. Toute la logique vit dans
 * `engine/minigame.ts` et les modules de jeu, ce qui permet de tester une
 * partie entière sans navigateur.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  MiniGameContext, MiniGameDef, MiniGameInput, MiniGameResult,
} from '../engine/minigame.ts';
import { Rng } from '../engine/rng.ts';

/** Pas de simulation. Assez fin pour un geste, assez large pour un téléphone. */
const STEP_MS = 40;

export function MiniGameHost<S>({
  def, context, seed, render, onFinish, onQuit,
}: {
  def: MiniGameDef<S>;
  context: MiniGameContext;
  seed: number;
  /** Dessine l'état courant. Reçoit aussi de quoi habiller la scène. */
  render: (state: S) => ReactNode;
  onFinish: (state: S, result: MiniGameResult) => void;
  onQuit: () => void;
}) {
  const [state, setState] = useState<S>(() => def.setup(new Rng({ rngState: seed >>> 0 }), context));
  const input = useRef<MiniGameInput>({});
  const surface = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let carry = 0;

    const loop = (now: number) => {
      const elapsed = Math.min(200, now - last);
      last = now;
      carry += elapsed;

      setState((current) => {
        let next = current;
        while (carry >= STEP_MS) {
          carry -= STEP_MS;
          next = def.step(next, input.current, STEP_MS);
        }
        // Le tap ne vaut que pour un pas.
        if (input.current.tap) input.current = { ...input.current, tap: false };
        if (def.finished(next) && !done.current) {
          done.current = true;
          const result = def.score(next);
          // On sort de la phase de rendu avant de prévenir l'appelant.
          queueMicrotask(() => onFinish(next, result));
        }
        return next;
      });

      if (!done.current) raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // La partie ne se relance pas : les dépendances sont volontairement fixes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Traduit un point de l'écran en coordonnées de jeu, 0-1. */
  const track = (clientX: number, clientY: number) => {
    const box = surface.current?.getBoundingClientRect();
    if (!box) return;
    input.current = {
      ...input.current,
      x: Math.max(0, Math.min(1, (clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (clientY - box.top) / box.height)),
    };
  };

  return (
    <div className="minigame">
      <div
        className="minigame-surface"
        ref={surface}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          track(e.clientX, e.clientY);
          input.current = { ...input.current, hold: true, tap: true };
        }}
        onPointerMove={(e) => track(e.clientX, e.clientY)}
        onPointerUp={() => { input.current = { ...input.current, hold: false }; }}
        onPointerCancel={() => { input.current = { ...input.current, hold: false }; }}
      >
        {render(state)}
      </div>
      <div className="minigame-bar">
        <div className="small muted">{def.goal}</div>
        <button
          className="pill"
          type="button"
          onClick={() => { input.current = { ...input.current, quit: true }; onQuit(); }}
        >
          Partir
        </button>
      </div>
    </div>
  );
}

/** Jauge horizontale d'un mini-jeu, avec un seuil d'alerte. */
export function GameGauge({
  label, value, danger = 70, hidden,
}: {
  label: string;
  value: number;
  danger?: number;
  /** Le personnage n'a pas le métier pour sentir ça : on brouille l'affichage. */
  hidden?: boolean;
}) {
  const tone = value >= danger ? 'var(--bad)' : value >= danger * 0.6 ? 'var(--warn)' : 'var(--good)';
  return (
    <div className="game-gauge">
      <div className="spread small">
        <span>{label}</span>
        <span>{hidden ? '?' : `${Math.round(value)} %`}</span>
      </div>
      <div className="game-gauge-track">
        <div
          className="game-gauge-fill"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: tone,
            opacity: hidden ? 0.35 : 1,
          }}
        />
      </div>
    </div>
  );
}
