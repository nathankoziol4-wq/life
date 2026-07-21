/**
 * Écran de fin — bilan de l'existence : score de vie (révélé en compteur animé),
 * verdict, résumé narratif révélé en cascade, stats finales et journal complet.
 */
import { useEffect, useState } from "react";
import type { Character } from "../types";
import { lifeScore, lifeSummary, scoreVerdict } from "../engine/destiny";
import { StatsPanel, money } from "./ui";
import { Avatar } from "./Avatar";
import { avatarFromCreation } from "../engine/avatar";

/** Compteur animé qui monte jusqu'à `target`. */
function useCountUp(target: number, ms = 1100): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setV(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function EndScreen({ char, onRestart }: { char: Character; onRestart: () => void }) {
  const score = lifeScore(char);
  const summary = lifeSummary(char);
  const shown = useCountUp(score);

  return (
    <div>
      <div className="end-hero">
        <Avatar a={avatarFromCreation(char.creation)} size={72} ring="var(--accent-2)" />
        <div className="end-rip">✝ {char.creation.firstName} {char.creation.lastName}</div>
        <div className="field-hint">A vécu {char.age} ans</div>
      </div>

      <div className="end-score">
        <div className="big">{shown}</div>
        <div className="field-hint">Score de vie</div>
      </div>
      <div className="end-verdict reveal" style={{ animationDelay: "0.9s" }}>{scoreVerdict(score)}</div>

      <div className="sheet reveal" style={{ animationDelay: "1s" }}>
        <div className="field-hint">Patrimoine final {money(char.money)}{char.timesJailed ? ` · ${char.timesJailed} séjour(s) en prison` : ""}</div>
        <div className="divider" />
        {summary.map((line, i) => (
          <p key={i} className="reveal" style={{ marginBottom: 8, color: "var(--text-dim)", animationDelay: `${1.1 + i * 0.15}s` }}>
            {line}
          </p>
        ))}
        <div className="divider" />
        <div className="section-title">Stats à la mort</div>
        <StatsPanel stats={char.stats} />
      </div>

      <div className="spacer" />
      <div className="section">
        <div className="section-title">Toute une vie</div>
        <div className="log">
          {[...char.history].reverse().map((e, i) => (
            <div key={i} className={`log-entry ${e.tone}`}>
              <span className="age">{e.age} ans</span>
              {e.text}
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary btn-big" onClick={onRestart}>
        ↻ Revivre une nouvelle vie
      </button>
      <div style={{ height: 24 }} />
    </div>
  );
}
