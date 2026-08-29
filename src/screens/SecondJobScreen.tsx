/**
 * Écran « Le deuxième poste ».
 *
 * Trois choses doivent se lire en même temps, sans quoi ce n'est qu'une liste
 * de petits boulots :
 *
 * 1. **les trois côtés de chaque poste** — ce que l'heure paie, ce qu'elle
 *    coûte, et à quel point cela reste discret. Ils ne vont jamais ensemble, et
 *    c'est tout l'arbitrage : le mieux payé est le plus visible ou le plus dur ;
 * 2. **le curseur des heures**, qui est la vraie décision une fois le poste
 *    pris. C'est lui qui décide si la carrière s'en ressent ;
 * 3. **ce que cela fait au poste principal, en toutes lettres.** La performance
 *    décide des promotions et des licenciements — un joueur qui ne verrait pas
 *    le lien croirait à un malheur, alors que c'est sa décision qui parle.
 */

import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { HOURS_CEILING, SHIFTS, getShift } from '../data/moonlight.ts';
import { getSkill } from '../data/skills.ts';
import {
  careerDrag, crowding, hourlyRate, leaveShift, moonlightOf, setHours, strainLine,
  takeBlocker, takeShift, totalHours, yearlyPay,
} from '../systems/moonlight.ts';

export function SecondJobScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const p = state.player;
  const held = moonlightOf(state);
  const shift = getShift(held?.jobId);
  const drag = careerDrag(state);

  return (
    <Sheet title="Le deuxième poste" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.55 }}>
          Des heures prises ailleurs. Pas une carrière : ni échelle, ni
          promotion, ni collègues — de l’argent tout de suite, et ce qu’il coûte.
        </p>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={totalHours(state) > HOURS_CEILING - 6 ? 'warn' : undefined}>
            {totalHours(state)} h par semaine en tout
          </Pill>
          {held && <Pill tone="primary">{money(state, yearlyPay(state))} par an</Pill>}
          {held?.known && <Pill tone="bad">Ton employeur le sait</Pill>}
        </div>
        <p className="small" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
          {strainLine(state)}
        </p>
      </Card>

      {held && shift && (
        <Section title="Ce que tu fais déjà" sub="Les heures sont la seule chose qui se règle.">
          <Card>
            <Row
              emoji={shift.emoji}
              title={shift.label}
              sub={`Depuis ${state.year - held.since} an(s) · ${money(state, held.earned)} au total`}
              right={<strong>{held.hours} h</strong>}
            />
            <div className="card-pad">
              <div className="spread small muted">
                <span>Ce que ça prend à ta semaine</span>
                <span>{Math.round(crowding(state) * 100)} %</span>
              </div>
              <Meter
                value={Math.min(100, crowding(state) * 100)}
                tone={drag > 0 ? 'bad' : 'good'}
              />
              <div className="spread small muted" style={{ marginTop: 10 }}>
                <span>Ce que ça retire à ta performance, par an</span>
                <span>{drag > 0 ? `−${drag.toFixed(1)}` : 'rien'}</span>
              </div>
            </div>
          </Card>
          <Card>
            {[shift.min, Math.round((shift.min + shift.max) / 2), shift.max].map((h) => (
              <Row
                key={h}
                emoji={h === shift.min ? '🌤️' : h === shift.max ? '🌑' : '🕘'}
                title={`${h} h par semaine`}
                sub={`${money(state, hourlyRate(state, shift.id) * h * 46)} sur l’année`}
                right={held.hours === h ? <Pill tone="primary">Actuel</Pill> : undefined}
                closed={held.hours === h}
                because="C’est déjà ton rythme."
                onClick={() => run((ctx) => setHours(ctx, h), '🕘')}
                chevron={held.hours !== h}
              />
            ))}
          </Card>
          <Card>
            <Row
              emoji="🚪"
              title="Arrêter"
              sub="Tu récupères tes soirées, et tu perds ce qu’elles rapportaient"
              onClick={() => run((ctx) => leaveShift(ctx), '🚪')}
              chevron
            />
          </Card>
        </Section>
      )}

      <Section
        title={held ? 'Ce que tu aurais pu prendre' : 'Ce qu’on peut prendre'}
        sub="Payé, fatigant, discret : jamais les trois ensemble."
      >
        {!p.job ? (
          <Empty>Un deuxième poste suppose qu’il y en ait un premier.</Empty>
        ) : (
          <Card>
            {SHIFTS.map((s) => {
              const why = takeBlocker(state, s.id);
              const skill = s.skillId ? getSkill(s.skillId) : undefined;
              return (
                <Row
                  key={s.id}
                  emoji={s.emoji}
                  title={s.label}
                  sub={`${s.line}${skill ? ` Entretient ${skill.label.toLowerCase()}.` : ''}`}
                  right={
                    <span className="small">
                      {money(state, hourlyRate(state, s.id))}/h
                      <br />
                      <span className="muted">{s.min}–{s.max} h</span>
                    </span>
                  }
                  closed={Boolean(why)}
                  because={why}
                  onClick={() => run((ctx) => takeShift(ctx, s.id), s.emoji)}
                  chevron={!why}
                />
              );
            })}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Ton employeur finira par l’apprendre — plus ou moins vite selon
          l’endroit où tu travailles, et jamais parce que tu l’auras caché. Ce
          jour-là, cela va au dossier.
        </p>
      </Section>
    </Sheet>
  );
}
