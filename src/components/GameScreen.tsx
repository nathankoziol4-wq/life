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
import { actionsForBranch, performAction, itemBonusFor, type ActionAvailability } from "../engine/actions";
import { BRANCHES, SUB_BRANCHES } from "../data/actions";
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

      {/* Bandeau prison */}
      {char.prison && (
        <div className="prison-banner">
          ⛓️ En détention — {char.prison.reason} · peine {char.prison.yearsServed}/{char.prison.sentence} an(s)
          <span className="behavior">Comportement {Math.round(char.prison.behavior)}/100</span>
        </div>
      )}

      {/* HUD stats compact */}
      <div className="hud">
        {STAT_KEYS.map((k) => (
          <span key={k} className="chip">
            {STAT_LABELS[k].slice(0, 3)} {char.stats[k]}
          </span>
        ))}
        <span className="chip">🧠 {char.meta.mentalHealth}</span>
        {char.prison ? <span className="chip chip-alert">⛓️ Prison</span> : char.job && <span className="chip">💼 {char.job.title}</span>}
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

/** Tiroir d'une branche : navigation à deux niveaux si des sous-branches existent. */
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
  const info = BRANCHES.find((b) => b.id === branch)!;
  const list = actionsForBranch(char, branch);
  const [sub, setSub] = useState<string | null>(null);

  // Sous-branches réellement présentes dans les actions retournées (aucune en prison).
  const subIds = Array.from(new Set(list.map((a) => a.action.subBranch).filter(Boolean))) as string[];
  const hasSubs = subIds.length > 0;
  const flatActions = list.filter((a) => !a.action.subBranch);
  const subInfo = SUB_BRANCHES.find((s) => s.id === sub);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>
            {sub ? (
              <button className="drawer-back" onClick={() => setSub(null)}>‹</button>
            ) : null}
            {subInfo ? `${subInfo.icon} ${subInfo.label}` : `${info.icon} ${info.label}`}
          </h3>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        {disabled && <div className="field-hint warn-text">Termine d'abord les événements de l'année.</div>}
        {char.prison && <div className="field-hint">En détention, seules les actions carcérales sont possibles.</div>}
        {list.length === 0 && <div className="field-hint">Aucune action disponible ici{char.prison ? " en prison" : ""}.</div>}

        {/* Niveau 1 : tuiles de sous-branches (+ actions sans sous-branche) */}
        {hasSubs && !sub && (
          <>
            <div className="subbranch-grid">
              {subIds.map((id) => {
                const si = SUB_BRANCHES.find((s) => s.id === id);
                const count = list.filter((a) => a.action.subBranch === id).length;
                return (
                  <button key={id} className="subbranch-tile" onClick={() => setSub(id)}>
                    <span className="sb-icon">{si?.icon ?? "•"}</span>
                    <span className="sb-label">{si?.label ?? id}</span>
                    <span className="sb-count">{count}</span>
                    {si?.description ? <span className="sb-desc">{si.description}</span> : null}
                  </button>
                );
              })}
            </div>
            {flatActions.length > 0 && (
              <div className="action-list">
                {flatActions.map((a) => <ActionRow key={a.action.id} a={a} char={char} disabled={disabled} onAct={onAct} />)}
              </div>
            )}
          </>
        )}

        {/* Niveau 2 : actions de la sous-branche (ou boutique) */}
        {(sub || !hasSubs) && (
          <div className="action-list">
            {(sub ? list.filter((a) => a.action.subBranch === sub) : flatActions).map((a) => (
              <ActionRow key={a.action.id} a={a} char={char} disabled={disabled} onAct={onAct} shop={subInfo?.shop} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Une ligne d'action, avec coût, chance de réussite (crimes) ou état "possédé" (boutique). */
function ActionRow({ a, char, disabled, onAct, shop }: { a: ActionAvailability; char: Character; disabled: boolean; onAct: (act: Action) => void; shop?: boolean }) {
  const { action, available, reason } = a;
  const owned = shop && action.effects?.[0]?.addItem ? char.inventory.includes(action.effects[0].addItem!) : false;
  // Chance effective affichée pour les crimes risqués.
  let chance: number | null = null;
  if (action.risky && action.crimeTags) {
    chance = Math.round(Math.min(0.92, action.risky.successRate + itemBonusFor(char, action)) * 100);
  }
  return (
    <button
      className={`action-item${available && !owned ? "" : " locked"}`}
      disabled={!available || disabled || owned}
      onClick={() => available && !disabled && !owned && onAct(action)}
    >
      <span className="ai-icon">{action.icon}</span>
      <span className="ai-body">
        <span className="ai-label">
          {action.label}
          {action.cost ? <span className="ai-cost"> · {money(action.cost)}</span> : null}
          {chance !== null ? <span className="ai-chance"> · réussite ~{chance}%</span> : null}
        </span>
        <span className="ai-desc">{action.description}</span>
      </span>
      {owned ? <span className="ai-owned">Possédé ✓</span> : !available && reason ? <span className="ai-lock">{reason}</span> : <span className="ai-go">▸</span>}
    </button>
  );
}
