/**
 * Écran de fin — bilan de l'existence : score de vie, verdict, résumé narratif,
 * stats finales et journal complet.
 */
import type { Character } from "../types";
import { lifeScore, lifeSummary, scoreVerdict } from "../engine/destiny";
import { StatsPanel, money } from "./ui";

export function EndScreen({ char, onRestart }: { char: Character; onRestart: () => void }) {
  const score = lifeScore(char);
  const summary = lifeSummary(char);

  return (
    <div>
      <div className="end-score">
        <div className="big">{score}</div>
        <div className="field-hint">Score de vie</div>
      </div>
      <div className="end-verdict">{scoreVerdict(score)}</div>

      <div className="sheet">
        <h2>
          {char.creation.firstName} {char.creation.lastName} · 1 vie
        </h2>
        <div className="field-hint">A vécu {char.age} ans · Patrimoine final {money(char.money)}</div>
        <div className="divider" />
        {summary.map((line, i) => (
          <p key={i} style={{ marginBottom: 8, color: "var(--text-dim)" }}>
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

      <button className="btn btn-primary" onClick={onRestart}>
        Recommencer une nouvelle vie
      </button>
      <div style={{ height: 24 }} />
    </div>
  );
}
