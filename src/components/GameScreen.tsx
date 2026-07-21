/**
 * Écran de jeu — boucle de vie année par année.
 * - "Vieillir d'un an" génère 1 à 3 événements à choix, résolus l'un après l'autre.
 * - Une barre d'actions façon BitLife (en bas) donne accès à des branches
 *   (Savoir, Travail, Crime, Corps, Social, Argent, Loisirs), chacune ouvrant un
 *   tiroir d'actions initiables à volonté (sous conditions/coûts/cooldowns).
 */
import { useMemo, useRef, useState } from "react";
import type { Character, GameEvent, LifeLogEntry, ActionBranch, Action } from "../types";
import { STAT_LABELS, STAT_KEYS } from "../types";
import { advanceYear, resolveChoice, currentYear } from "../engine/simulation";
import { availableChoices, interpolate } from "../engine/events";
import { actionsForBranch, performAction } from "../engine/actions";
import { BRANCHES } from "../data/actions";
import { money } from "./ui";

export function GameScreen({ initial, onDeath }: { initial: Character; onDeath: (c: Character) => void }) {
  const charRef = useRef<Character>(initial);
  const seenRef = useRef<Set<string>>(new Set());
  const [, force] = useState(0);
  const [log, setLog] = useState<LifeLogEntry[]>(initial.history);
  const [queue, setQueue] = useState<GameEvent[]>([]); // file d'événements de l'année
  const [openBranch, setOpenBranch] = useState<ActionBranch | null>(null);
  const rerender = () => force((n) => n + 1);
  const char = charRef.current;

  const pending = queue[0] ?? null;
  const push = (entries: LifeLogEntry[]) => setLog((l) => [...entries, ...l]);

  const step = () => {
    if (!char.alive || pending) return;
    const res = advanceYear(char, seenRef.current);
    push(res.logs);
    if (res.died) {
      rerender();
      setTimeout(() => onDeath(char), 500);
      return;
    }
    setQueue(res.pendingEvents);
    rerender();
  };

  const choose = (realIndex: number) => {
    if (!pending) return;
    const logs = resolveChoice(char, pending, realIndex);
    push(logs);
    setQueue((q) => q.slice(1)); // passe à l'événement suivant de l'année
    rerender();
  };

  const doAction = (action: Action) => {
    const entry = performAction(char, action);
    push([entry]);
    rerender();
  };

  const year = currentYear(char);
  const choices = useMemo(() => (pending ? availableChoices(char, pending) : []), [pending, char]);
  const canAct = char.alive && !pending;

  return (
    <div>
      <div className="game-top">
        <div className="age-badge">
          {char.age} <span>ans · {year}</span>
        </div>
        <div className={`money-badge ${char.money >= 0 ? "pos" : "neg"}`}>{money(char.money)}</div>
      </div>

      {/* HUD stats compact */}
      <div className="hud">
        {STAT_KEYS.map((k) => (
          <span key={k} className="chip">
            {STAT_LABELS[k].slice(0, 3)} {char.stats[k]}
          </span>
        ))}
        <span className="chip">🧠 {char.meta.mentalHealth}</span>
        {char.job && <span className="chip">💼 {char.job.title}</span>}
      </div>

      {/* Événement interactif en attente (file 1–3 par an) */}
      {pending && (
        <div className="event-card">
          {queue.length > 1 && <div className="queue-pill">Événement · {queue.length} en attente cette année</div>}
          <h3>{pending.title}</h3>
          <p>{interpolate(char, pending.text)}</p>
          <div className="event-choices">
            {choices.map((ch, i) => {
              const realIndex = pending.choices.indexOf(ch);
              return (
                <button key={i} className="event-choice" onClick={() => choose(realIndex)}>
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bouton vieillir */}
      {!pending && char.alive && (
        <button className="btn btn-primary" onClick={step}>
          Vieillir d'un an →
        </button>
      )}

      <div className="spacer" />

      {/* Journal de vie (le plus récent en haut) */}
      <div className="section-title">Journal de vie</div>
      <div className="log">
        {log.map((e, i) => (
          <div key={i} className={`log-entry ${e.tone}`}>
            <span className="age">{e.age} ans</span>
            {e.text}
          </div>
        ))}
      </div>

      {/* Espace pour ne pas masquer le journal sous la barre */}
      <div style={{ height: 80 }} />

      {/* Tiroir d'actions de la branche ouverte */}
      {openBranch && (
        <ActionDrawer
          char={char}
          branch={openBranch}
          disabled={!canAct}
          onClose={() => setOpenBranch(null)}
          onAct={doAction}
        />
      )}

      {/* Barre d'actions du bas (façon BitLife) */}
      <div className="action-bar">
        {BRANCHES.map((b) => (
          <button
            key={b.id}
            className={`action-branch${openBranch === b.id ? " active" : ""}`}
            onClick={() => setOpenBranch(openBranch === b.id ? null : b.id)}
            title={b.label}
          >
            <span className="ab-icon">{b.icon}</span>
            <span className="ab-label">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tiroir listant les actions d'une branche, avec leur disponibilité. */
function ActionDrawer({
  char,
  branch,
  disabled,
  onClose,
  onAct,
}: {
  char: Character;
  branch: ActionBranch;
  disabled: boolean;
  onClose: () => void;
  onAct: (a: Action) => void;
}) {
  const list = actionsForBranch(char, branch);
  const info = BRANCHES.find((b) => b.id === branch)!;
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>{info.icon} {info.label}</h3>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        {disabled && <div className="field-hint warn-text">Termine d'abord les événements de l'année.</div>}
        <div className="action-list">
          {list.map(({ action, available, reason }) => (
            <button
              key={action.id}
              className={`action-item${available ? "" : " locked"}`}
              disabled={!available || disabled}
              onClick={() => available && !disabled && onAct(action)}
            >
              <span className="ai-icon">{action.icon}</span>
              <span className="ai-body">
                <span className="ai-label">{action.label}{action.cost ? <span className="ai-cost"> · {money(action.cost)}</span> : null}</span>
                <span className="ai-desc">{action.description}</span>
              </span>
              {!available && reason ? <span className="ai-lock">{reason}</span> : <span className="ai-go">▸</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
