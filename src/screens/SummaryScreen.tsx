/** Récapitulatif de fin de vie (§20) puis proposition d'une nouvelle vie. */

import { Button, Pill } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { StatsDetail } from '../components/StatsBar.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import type { LifeSummary } from '../engine/simulateYear.ts';
import { getFameField } from '../data/fame.ts';
import { heirsOf } from '../systems/lineage.ts';
import { avatarFor } from '../ui/format.ts';

export function SummaryScreen({ summary }: { summary: LifeSummary }) {
  const { state, dismissSummary, continueLineage } = useGame();
  const heirs = state ? heirsOf(state) : [];
  const lineage = state?.lineage ?? [];

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

      {/* Le titre avant le score : un mot se retient, un nombre non. */}
      <div className="ribbon-banner">
        <div className="ribbon-title">{summary.ribbon.label}</div>
        <div className="ribbon-note">{summary.ribbon.note}</div>
        <div className="chips" style={{ justifyContent: 'center', marginTop: 12 }}>
          {[...Array(summary.ribbon.tier)].map((_, i) => (
            <span key={i} className="ribbon-pip" />
          ))}
        </div>
      </div>

      {summary.epitaph && (
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{summary.epitaph}</p>
        </Card>
      )}

      {summary.ribbon.mentions.length > 0 && (
        <Section title="Ce qu’on retiendra aussi">
          <Card>
            {summary.ribbon.mentions.map((m) => (
              <Row key={m.id} emoji="🎗️" title={m.label} sub={m.note} />
            ))}
          </Card>
        </Section>
      )}

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
          <Cell label="Notoriété" value={summary.famePeak > 4 ? `${summary.famePeak} · ${getFameField(summary.fameField).label.toLowerCase()}` : 'Anonyme'} />
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

      {lineage.length > 0 && (
        <Section title={`La lignée (${lineage.length + 1} génération(s))`}>
          <Card>
            {lineage.map((entry) => (
              <Row
                key={entry.generation}
                emoji="🕯️"
                title={entry.name}
                sub={`${entry.birthYear} – ${entry.deathYear} · ${entry.topJob.toLowerCase()}`}
                right={state ? <Pill>{money(state, entry.netWorth)}</Pill> : undefined}
              />
            ))}
            <Row
              emoji="🪦"
              title={summary.name}
              sub={`${state?.player.birthYear} – ${state?.player.deathYear} · ${summary.topJob.toLowerCase()}`}
              right={state ? <Pill tone="primary">{money(state, summary.netWorth)}</Pill> : undefined}
            />
          </Card>
        </Section>
      )}

      {/* ---- Continuer, ou tout reprendre à zéro ---- */}
      {heirs.length > 0 && (
        <Section title="Continuer">
          <Card pad>
            <p style={{ margin: 0, lineHeight: 1.55 }}>
              Ce que tu as bâti ne disparaît pas avec toi. Reprends l’histoire
              par l’un de tes descendants : il gardera le monde, la famille, le
              nom — et ce que tu lui as laissé.
            </p>
          </Card>
          <Card>
            {heirs.map((heir) => (
              <Row
                key={heir.person.id}
                emoji={avatarFor(heir.person)}
                title={heir.person.firstName}
                sub={`${heir.person.age} ans · ${heir.distance === 1 ? 'ton enfant' : 'ton petit-enfant'}${
                  heir.bond > 65 ? ' · vous étiez proches' : heir.bond < 35 ? ' · vous ne vous parliez plus guère' : ''
                }`}
                right={state ? <Pill tone={heir.wealth > 0 ? 'good' : undefined}>
                  {money(state, Math.round(heir.wealth))}
                </Pill> : undefined}
                onClick={() => continueLineage(heir.person.id)}
                chevron
              />
            ))}
          </Card>
          <p className="small muted" style={{ margin: '10px 4px 0', lineHeight: 1.55 }}>
            La somme est ce dont chacun dispose une fois ta succession réglée :
            ce qu’il avait, plus ce que tu lui laisses. C’est elle qui décidera
            du milieu dans lequel la génération suivante commence — et c’est là,
            plus que dans le score, que se voit ce qu’une vie a transmis.
          </p>
        </Section>
      )}

      <div style={{ marginTop: 18 }}>
        <Button
          onClick={dismissSummary}
          variant={heirs.length > 0 ? 'secondary' : 'primary'}
        >
          {heirs.length > 0 ? 'Non — repartir de zéro, ailleurs' : 'Commencer une nouvelle vie'}
        </Button>
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
