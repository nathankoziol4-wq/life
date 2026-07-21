/**
 * Écran de jeu — boucle de vie année par année.
 * - "Vieillir d'un an" génère 1 à 3 événements à choix, résolus l'un après l'autre.
 * - Une barre d'actions façon BitLife (en bas) donne accès à des branches
 *   (Savoir, Travail, Crime, Corps, Social, Argent, Loisirs), chacune ouvrant un
 *   tiroir d'actions initiables à volonté (sous conditions/coûts/cooldowns).
 */
import { useMemo, useRef, useState } from "react";
import type { Character, GameEvent, LifeLogEntry, ActionBranch, Action, EventChoice } from "../types";
import { STAT_LABELS, STAT_KEYS } from "../types";
import { advanceYear, resolveChoice, currentYear } from "../engine/simulation";
import { availableChoices, interpolate } from "../engine/events";
import { actionsForBranch, performAction, itemBonusFor, type ActionAvailability } from "../engine/actions";
import { previewChoice } from "../engine/describe";
import { performRelActivity } from "../engine/relationships";
import { avatarFromCreation } from "../engine/avatar";
import { BRANCHES, SUB_BRANCHES } from "../data/actions";
import { Avatar } from "./Avatar";
import { RelationsPanel } from "./RelationsPanel";
import { money } from "./ui";
import type { Relationship } from "../types";

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

  const doRelActivity = (rel: Relationship, activityId: string) => {
    const entry = performRelActivity(char, rel, activityId);
    push([entry]);
    rerender();
  };

  const year = currentYear(char);
  const choices = useMemo(() => (pending ? availableChoices(char, pending) : []), [pending, char]);
  const canAct = char.alive && !pending;

  return (
    <div>
      <div className="game-top">
        <Avatar a={avatarFromCreation(char.creation)} size={52} ring="var(--accent)" />
        <div className="game-top-mid">
          <div className="gt-name">{char.creation.firstName} {char.creation.lastName}</div>
          <div className="age-badge">{char.age} <span>ans · {year}</span></div>
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

      {/* Événement interactif en attente (file 2–4 par an) */}
      {pending && (
        <EventCard
          key={pending.id}
          char={char}
          event={pending}
          choices={choices}
          queueLen={queue.length}
          onChoose={choose}
        />
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
          onRel={doRelActivity}
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

/**
 * Carte d'événement avec aperçu de conséquences.
 * 1er clic sur un choix → déploie l'explication + les conséquences chiffrées.
 * 2e clic (ou "Confirmer") → applique le choix.
 */
function EventCard({
  char,
  event,
  choices,
  queueLen,
  onChoose,
}: {
  char: Character;
  event: GameEvent;
  choices: EventChoice[];
  queueLen: number;
  onChoose: (realIndex: number) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="event-card">
      <div className="event-tags">
        {event.generated && <span className="gen-badge">✨ Généré</span>}
        {queueLen > 1 && <span className="queue-pill">{queueLen} en attente cette année</span>}
      </div>
      <h3>{event.title}</h3>
      <p>{interpolate(char, event.text)}</p>
      <div className="event-choices">
        {choices.map((ch, i) => {
          const realIndex = event.choices.indexOf(ch);
          const isOpen = open === i;
          const pv = previewChoice(ch);
          return (
            <div key={i} className={`choice-block${isOpen ? " open" : ""}`}>
              <button className="event-choice" onClick={() => setOpen(isOpen ? null : i)}>
                <span>{ch.label}</span>
                <span className="choice-caret">{isOpen ? "▾" : "›"}</span>
              </button>
              {isOpen && (
                <div className="choice-preview">
                  {pv.detail && <p className="cp-detail">{pv.detail}</p>}
                  {pv.chancePct !== null ? (
                    <>
                      <div className="cp-line"><span className="cp-lab good">Si réussite (~{pv.chancePct}%)</span><span className="cp-chips">{pv.success.map((s, j) => <span key={j} className="cp-chip">{s}</span>)}</span></div>
                      {pv.failure && <div className="cp-line"><span className="cp-lab bad">Si échec</span><span className="cp-chips">{pv.failure.map((s, j) => <span key={j} className="cp-chip">{s}</span>)}</span></div>}
                    </>
                  ) : (
                    <div className="cp-line"><span className="cp-lab">Conséquences</span><span className="cp-chips">{pv.success.length ? pv.success.map((s, j) => <span key={j} className="cp-chip">{s}</span>) : <span className="cp-chip muted">Effet narratif</span>}</span></div>
                  )}
                  <button className="btn btn-primary cp-confirm" onClick={() => onChoose(realIndex)}>Confirmer ce choix</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="event-hint">Touche un choix pour voir ses conséquences avant de confirmer.</div>
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
  onRel,
}: {
  char: Character;
  branch: ActionBranch;
  disabled: boolean;
  onClose: () => void;
  onAct: (a: Action) => void;
  onRel: (rel: Relationship, activityId: string) => void;
}) {
  const info = BRANCHES.find((b) => b.id === branch)!;
  const list = actionsForBranch(char, branch);
  const [sub, setSub] = useState<string | null>(null);

  // Sous-branches déclarées (dont "virtuelles" : relations/boutique) + celles issues
  // des actions. Aucune sous-branche en détention (actions carcérales à plat).
  const declared = char.prison ? [] : SUB_BRANCHES.filter((s) => s.branch === branch);
  const actionSubIds = new Set(list.map((a) => a.action.subBranch).filter(Boolean) as string[]);
  const subIds: string[] = declared.filter((s) => s.relations || s.shop || actionSubIds.has(s.id)).map((s) => s.id);
  for (const id of actionSubIds) if (!subIds.includes(id)) subIds.push(id);
  const hasSubs = subIds.length > 0;
  const flatActions = list.filter((a) => !a.action.subBranch);
  const subInfo = SUB_BRANCHES.find((s) => s.id === sub);
  const relCount = char.relationships.filter((r) => r.alive).length;

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
                const count = si?.relations ? relCount : list.filter((a) => a.action.subBranch === id).length;
                return (
                  <button key={id} className={`subbranch-tile${si?.relations ? " rel-tile" : ""}`} onClick={() => setSub(id)}>
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

        {/* Niveau 2 : panneau relations, boutique, ou liste d'actions */}
        {sub && subInfo?.relations ? (
          <RelationsPanel char={char} disabled={disabled} onAct={onRel} />
        ) : (sub || !hasSubs) && (
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
