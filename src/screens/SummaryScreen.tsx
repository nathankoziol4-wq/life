/** Récapitulatif de fin de vie (§20) puis proposition d'une nouvelle vie. */

import { Button, Card, Row, Section } from '../components/Modal.tsx';
import { StatsDetail } from '../components/StatsBar.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import type { LifeSummary } from '../engine/simulateYear.ts';

export function SummaryScreen({ summary }: { summary: LifeSummary }) {
  const { state, dismissSummary } = useGame();

  return (
    <div className="app-body" style={{ paddingBottom: 24 }}>
      <div className="summary-hero">
        <div style={{ fontSize: 44 }}>🕯️</div>
        <div className="summary-name">{summary.name}</div>
        <div className="summary-dates">
          {state ? `${state.player.birthYear} – ${state.player.deathYear}` : ''} · {summary.ageAtDeath} ans
        </div>
        <div className="summary-cause">Mort {summary.cause}.</div>
      </div>

      <div className="score-banner">
        <div className="score-value">{summary.score.toLocaleString('fr-FR')}</div>
        <div className="score-label">Score de vie</div>
      </div>

      <Section title="Bilan d’une existence">
        <div className="summary-grid">
          <Cell label="Patrimoine" value={state ? money(state, summary.netWorth) : '—'} />
          <Cell label="Dernier métier" value={summary.topJob} />
          <Cell label="Études" value={summary.education} />
          <Cell label="Enfants" value={String(summary.children)} />
          <Cell label="Relations" value={String(summary.partners)} />
          <Cell label="Biens" value={`${summary.properties} · ${summary.vehicles} véh.`} />
          <Cell label="Arrestations" value={String(summary.arrests)} />
          <Cell label="Années de prison" value={String(summary.yearsInPrison)} />
        </div>
      </Section>

      {summary.estate.length > 0 && (
        <Section title="Succession">
          <Card>
            {summary.estate.map((s) => (
              <Row
                key={s.personId}
                emoji="🧾"
                title={s.name}
                right={state ? money(state, s.amount) : String(s.amount)}
              />
            ))}
          </Card>
        </Section>
      )}

      <Section title="Statistiques finales">
        <StatsDetail stats={summary.finalStats} />
      </Section>

      {summary.highlights.length > 0 && (
        <Section title="Ce qu’on retiendra">
          <Card>
            {summary.highlights.map((h) => (
              <div className="row" key={h.id}>
                <span className={`timeline-dot dot-${h.tone}`} style={{ marginTop: 8 }} />
                <span className="row-main">
                  <span className="row-title" style={{ fontWeight: 500, fontSize: 14 }}>
                    {h.text}
                  </span>
                  <span className="row-sub">{h.age} ans</span>
                </span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      <div style={{ marginTop: 18 }}>
        <Button onClick={dismissSummary}>Commencer une nouvelle vie</Button>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-cell">
      <div className="summary-cell-label">{label}</div>
      <div className="summary-cell-value">{value}</div>
    </div>
  );
}
