/**
 * Écran de jeu — la boucle de vie année par année. Affiche l'âge, l'argent, un HUD
 * de stats compact, le journal de vie, et gère les événements interactifs (choix).
 */
import { useMemo, useRef, useState } from "react";
import type { Character, GameEvent, LifeLogEntry } from "../types";
import { STAT_LABELS, STAT_KEYS } from "../types";
import { advanceYear, resolveChoice, currentYear } from "../engine/simulation";
import { availableChoices, interpolate } from "../engine/events";
import { money } from "./ui";

export function GameScreen({ initial, onDeath }: { initial: Character; onDeath: (c: Character) => void }) {
  // Le personnage est muté par le moteur ; on force le rendu via un compteur.
  const charRef = useRef<Character>(initial);
  const seenRef = useRef<Set<string>>(new Set());
  const [, force] = useState(0);
  const [log, setLog] = useState<LifeLogEntry[]>(initial.history);
  const [pending, setPending] = useState<GameEvent | null>(null);
  const rerender = () => force((n) => n + 1);
  const char = charRef.current;

  const push = (entries: LifeLogEntry[]) => setLog((l) => [...entries, ...l]);

  const step = () => {
    if (!char.alive || pending) return;
    const res = advanceYear(char, seenRef.current);
    push(res.logs);
    if (res.pendingEvent) {
      setPending(res.pendingEvent);
    } else if (res.died) {
      rerender();
      setTimeout(() => onDeath(char), 400);
      return;
    }
    rerender();
  };

  const choose = (i: number) => {
    if (!pending) return;
    const logs = resolveChoice(char, pending, i);
    push(logs);
    setPending(null);
    rerender();
  };

  const year = currentYear(char);
  const choices = useMemo(() => (pending ? availableChoices(char, pending) : []), [pending, char]);

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

      {/* Événement interactif en attente */}
      {pending && (
        <div className="event-card">
          <h3>{pending.title}</h3>
          <p>{interpolate(char, pending.text)}</p>
          <div className="event-choices">
            {choices.map((ch, i) => {
              // index réel dans pending.choices (les choix filtrés gardent l'ordre)
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
    </div>
  );
}
