/**
 * L'écran du disque : ce qu'on enregistre, qui le sort, et où on le joue.
 *
 * Trois sections, dans l'ordre où l'on y pense : le catalogue — ce qu'on a
 * déjà fait et ce que ça rapporte encore —, la maison, et la route.
 *
 * Le classement est ce que l'écran doit rendre lisible avant tout : un rang
 * ne veut rien dire tout seul, et c'est le couple « meilleure place » et
 * « place actuelle » qui raconte la vie d'un disque.
 */

import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import {
  FORMATS, LABELS, MAX_DATES, VENUES, addDate, bestChart, breakDeal,
  breakDealBlocker, chartLabel, dropDate, fillLabel, hitTheRoad, inProduction,
  labelOf, musicOf, productionCost, pull, reachableVenues, recordBlocker,
  released, royaltiesOf, royaltyFor, signBlocker, signLabel, startRecording,
  tourBlocker, tourCost,
} from '../systems/records.ts';
import { getFormat, getVenue } from '../data/records.ts';

export function RecordsScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const stage = musicOf(state);
  if (!stage) return null;

  const label = labelOf(state);
  const producing = inProduction(state);
  const catalogue = released(state);
  const best = bestChart(state);
  const draw = pull(state);
  const tour = stage.tour;
  const composing = tour && !tour.running;

  return (
    <Sheet title="Le disque" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>
              {best > 0 ? chartLabel(best) : 'Jamais classé'}
            </strong>
            <div className="small muted">
              {catalogue.length} sortie(s) · {money(state, royaltiesOf(state))} de droits
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ fontSize: 17 }}>{Math.round(draw)}</strong>
            <div className="small muted">ce que tu attires</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}><Meter value={draw} /></div>
        <div className="chips" style={{ marginTop: 10 }}>
          {label && <Pill tone="primary">{label.label}</Pill>}
          {stage.deal && stage.deal.owed > 0 && (
            <Pill tone="warn">{stage.deal.owed} disque(s) dû(s)</Pill>
          )}
          {stage.deal && stage.deal.recouped < stage.deal.advance && (
            <Pill tone="warn">
              Avance à rembourser : {money(state, stage.deal.advance - stage.deal.recouped)}
            </Pill>
          )}
        </div>
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          Ce qui remplit une salle n’est pas ce que tu sais jouer, c’est ce que
          tu as sorti.
        </p>
      </Card>

      {/* ---------------- Le catalogue ---------------- */}
      <Section title="Ton catalogue">
        {producing && (
          <Card>
            <Row
              emoji="🎛️"
              title={getFormat(producing.formatId)?.label ?? 'En cours'}
              sub={`Encore ${producing.yearsLeft} an(s) avant qu’on l’entende`}
              right={<Pill tone="accent">En studio</Pill>}
            />
          </Card>
        )}
        {catalogue.length > 0 ? (
          <Card>
            {catalogue.map((release) => {
              const format = getFormat(release.formatId);
              const royalty = royaltyFor(state, release);
              return (
                <Row
                  key={release.id}
                  emoji={release.peak === 1 ? '🥇' : release.peak > 0 && release.peak <= 10 ? '💿' : '·'}
                  title={`« ${release.title} »`}
                  sub={`${format?.label ?? ''} · ${release.year} · meilleure place ${
                    release.peak > 0 ? `n° ${release.peak}` : 'jamais entré'}${
                    release.rank > 0 ? ` · aujourd’hui n° ${release.rank}` : ''}`}
                  right={royalty > 0
                    ? <Pill tone="good">{money(state, royalty)}/an</Pill>
                    : <Pill>{money(state, release.earned)}</Pill>}
                />
              );
            })}
          </Card>
        ) : (
          !producing && <Empty>Tu n’as rien sorti. Rien ne joue pour toi la nuit.</Empty>
        )}
      </Section>

      {/* ---------------- Enregistrer ---------------- */}
      <Section title="Enregistrer">
        <Card>
          {FORMATS.map((format) => {
            const blocker = recordBlocker(state, format);
            return (
              <Row
                key={format.id}
                emoji="🎙️"
                title={format.label}
                sub={`${format.what} · ${format.span} an(s)`}
                because={blocker}
                right={<Pill tone={blocker ? undefined : label ? 'good' : 'warn'}>
                  {label ? 'payé' : money(state, productionCost(state, format))}
                </Pill>}
                closed={Boolean(blocker)}
                onClick={() => run((ctx) => startRecording(ctx, format.id), '🎙️')}
                chevron={!blocker}
              />
            );
          })}
        </Card>
      </Section>

      {/* ---------------- La maison ---------------- */}
      <Section title="Ta maison de disques">
        {label ? (
          <Card>
            <Row
              emoji="🏢"
              title={label.label}
              sub={`${label.what} · ${Math.round(label.cut * 100)} % de tout`}
              right={<Pill tone="primary">×{label.push} au classement</Pill>}
            />
            <Row
              emoji="🚪"
              title="Rompre le contrat"
              sub="Tu rembourses l’avance et tu paies les disques non livrés"
              because={breakDealBlocker(state)}
              closed={Boolean(breakDealBlocker(state))}
              onClick={() => run((ctx) => breakDeal(ctx), '🚪')}
              chevron={!breakDealBlocker(state)}
            />
          </Card>
        ) : (
          <Card>
            {LABELS.filter((l) => l.id !== 'auto').map((l) => {
              const blocker = signBlocker(state, l);
              return (
                <Row
                  key={l.id}
                  emoji="🏢"
                  title={l.label}
                  sub={`${l.what} · ${
                    Math.round(l.cut * 100)} % · ${l.owed} disque(s) dû(s)`}
                  because={blocker}
                  right={<Pill tone={blocker ? undefined : 'accent'}>
                    ×{l.push}
                  </Pill>}
                  closed={Boolean(blocker)}
                  onClick={() => run((ctx) => signLabel(ctx, l.id), '🏢')}
                  chevron={!blocker}
                />
              );
            })}
          </Card>
        )}
      </Section>

      {/* ---------------- La route ---------------- */}
      <Section title="La route">
        {tour && tour.running === false && tour.played > 0 && tour.since === state.year && (
          <Card pad>
            <strong>De retour</strong>
            <p className="small muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
              {tour.played} date(s) jouée(s){tour.cancelled > 0 ? `, ${tour.cancelled} annulée(s)` : ''} ·{' '}
              {fillLabel(tour.fill).toLowerCase()} · {money(state, tour.earned)} pour{' '}
              {money(state, tour.spent)} engagés.
            </p>
          </Card>
        )}

        {composing && tour.dates.length > 0 && (
          <>
            <Card>
              {tour.dates.map((venueId, index) => {
                const venue = getVenue(venueId);
                if (!venue) return null;
                return (
                  <Row
                    key={`${venueId}_${index}`}
                    emoji="📍"
                    title={venue.label}
                    sub={`${venue.seats} places · il faut attirer ${venue.draw}`}
                    right={<Pill tone={venue.draw <= draw ? 'good' : 'warn'}>
                      {venue.draw <= draw ? 'à ta portée' : 'grand pour toi'}
                    </Pill>}
                    onClick={() => run((ctx) => dropDate(ctx, index), '📍')}
                    chevron
                  />
                );
              })}
            </Card>
            <Card>
              <Row
                emoji="🚌"
                title={`Partir — ${tour.dates.length} date(s)`}
                sub={`${money(state, tourCost(state))} à engager, remboursés ou non`}
                because={tourBlocker(state)}
                closed={Boolean(tourBlocker(state))}
                onClick={() => run((ctx) => hitTheRoad(ctx), '🚌')}
                chevron={!tourBlocker(state)}
              />
            </Card>
          </>
        )}

        <Card>
          {VENUES.map((venue) => {
            const reachable = reachableVenues(state).some((v) => v.id === venue.id);
            const full = composing && tour.dates.length >= MAX_DATES;
            return (
              <Row
                key={venue.id}
                emoji="🎤"
                title={`Poser une date — ${venue.label.toLowerCase()}`}
                sub={`${venue.seats} places · il faut attirer ${venue.draw}${
                  reachable ? '' : ' · bien au-dessus de toi'}`}
                right={<Pill tone={venue.draw <= draw ? 'good' : 'warn'}>
                  {money(state, Math.round(venue.gross * 1000))}
                </Pill>}
                closed={Boolean(tourBlocker(state)) || Boolean(full)}
                because={tourBlocker(state)
                  ?? (full ? `Une tournée compte ${MAX_DATES} dates au plus.` : undefined)}
                onClick={() => run((ctx) => addDate(ctx, venue.id), '🎤')}
                chevron={!tourBlocker(state) && !full}
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Une salle trop grande ne rate pas complètement : elle laisse des
          trous, et ils coûtent. Trop de dates d’affilée finissent par sauter.
        </p>
      </Section>
    </Sheet>
  );
}
