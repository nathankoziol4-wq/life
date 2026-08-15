/**
 * L'écran de la couronne.
 *
 * Trois blocs, et l'ordre n'est pas décoratif.
 *
 * **La file d'abord**, parce que c'est la seule chose qu'on ne contrôle pas et
 * la seule qui décide de tout : elle est montrée en entier, avec les âges,
 * pour qu'on voie ce qu'on attend et combien de temps.
 *
 * **Ce qu'on peut faire ensuite** : les engagements de l'année, avec ce que
 * chacun coûte et ce qu'il rapporte, et le compteur de ce que le rang attend.
 *
 * **Les deux jauges enfin**, séparées et jamais additionnées, parce que
 * confondre « on t'aime » et « on veut encore d'une couronne » est exactement
 * l'erreur que le système punit.
 */

import { useState } from 'react';
import { Card, Empty, Meter, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { GameGauge, MiniGameHost } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { walkabout, type WalkaboutState } from '../systems/minigames/walkabout.ts';
import {
  performance as PERFORMANCE, type PerformanceState,
} from '../systems/minigames/performance.ts';
import type { MiniGameResult } from '../engine/minigame.ts';
import {
  abdicate, abdicateBlocker, arbitrate, availableDuties, disgrace, disgraceLimit,
  dutiesDone, dutyBlocker, dutyContext, dutyCost, ennoble, ennobleBlocker,
  expectedDuties, fatigueOf,
  houseOf, inCourt, meritOf, myTitle, pendingAffair, performDuty, placeOf,
  placeLabel, presentationBlocker, presentationCost, seekPresentation,
  sentimentLabel, standingLabel, stipendOf, succession, titleOf,
} from '../systems/royalty.ts';
import {
  COLLAPSE_LINE, COLLAPSE_YEARS, DUTY_AGE, type Duty,
} from '../data/royalty.ts';

export function CrownScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [playing, setPlaying] = useState<Duty | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;
  const p = state.player;
  const crown = p.crown;
  const house = houseOf(state);
  const title = titleOf(state);

  const settle = (duty: Duty, result: MiniGameResult) => {
    run((ctx) => performDuty(ctx, duty.id, result), '👑');
    setPlaying(null);
    setSeed(Math.floor(Math.random() * 2 ** 31));
  };

  /* --- Un engagement qui se joue --- */
  if (playing) {
    const context = dutyContext(state, playing);
    if (playing.play === 'walkabout') {
      return (
        <Sheet title={playing.label} onBack={() => setPlaying(null)}>
          <MiniGameHost
            key={`walk-${seed}`}
            def={walkabout}
            context={context}
            seed={seed}
            render={(s: WalkaboutState) => <Ropeline state={s} />}
            onFinish={(_s, result) => settle(playing, result)}
            onQuit={() => { /* la partie se termine d'elle-même */ }}
          />
          <p className="small muted" style={{ margin: '10px 4px 0' }}>
            Relâche pour avancer. Maintiens pour t’arrêter devant quelqu’un :
            la conversation se creuse tant que tu restes, et l’allée n’avance
            plus. Un appui bref serre une main et rien de plus. Il faut arriver
            au bout — une haie abandonnée au tiers laisse tout le monde debout.
          </p>
        </Sheet>
      );
    }
    return (
      <Sheet title={playing.label} onBack={() => setPlaying(null)}>
        <MiniGameHost
          key={`speech-${seed}`}
          def={PERFORMANCE}
          context={context}
          seed={seed}
          render={(s: PerformanceState) => (
            <>
              <GameGauge label="Justesse" value={s.accuracy} />
              <GameGauge label="La salle" value={s.audience} />
            </>
          )}
          onFinish={(_s, result) => settle(playing, result)}
          onQuit={() => { /* la partie se termine d'elle-même */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Suis la ligne. Ce qu’on retiendra n’est pas ce que tu as dit mais la
          façon dont tu l’as tenu.
        </p>
      </Sheet>
    );
  }

  /* --- On n'est d'aucune maison --- */
  if (!crown) {
    const ennobleWhy = ennobleBlocker(state);
    const presentWhy = presentationBlocker(state);
    return (
      <Sheet title="Les maisons" onBack={onBack}>
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            On ne devient pas de sang royal. Il y a exactement trois façons
            d’entrer dans une maison : y naître, en épouser quelqu’un, ou avoir
            rendu assez de services pour qu’on vous y fasse entrer — et les
            trois ne mènent pas au même endroit.
          </p>
        </Card>

        <Section title="Se faire présenter">
          <Card>
            <Row
              emoji="🎩"
              title="Demander à être présenté à la cour"
              sub={presentWhy ?? 'Tu y rencontreras quelqu’un. Le reste sera un mariage comme un autre.'}
              right={<Pill tone="warn">{money(state, presentationCost(state))}</Pill>}
              disabled={Boolean(presentWhy)}
              onClick={presentWhy ? undefined : () => run((ctx) => seekPresentation(ctx), '🎩')}
              chevron={!presentWhy}
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Un conjoint reçoit un titre et jamais une place dans l’ordre. Les
            enfants, eux, y sont.
          </p>
        </Section>

        <Section title="Être anobli">
          <Card>
            {meritOf(state).map((m) => (
              <Row
                key={m.label}
                emoji={m.got ? '✅' : '⬜'}
                title={m.label}
                sub={m.got ? 'Acquis' : 'Pas encore'}
              />
            ))}
          </Card>
          <Card>
            <Row
              emoji="👑"
              title="Recevoir un titre"
              sub={ennobleWhy ?? 'Un titre, une rente, des engagements — et aucune place dans l’ordre'}
              disabled={Boolean(ennobleWhy)}
              onClick={ennobleWhy ? undefined : () => run((ctx) => ennoble(ctx), '👑')}
              chevron={!ennobleWhy}
            />
          </Card>
        </Section>
      </Sheet>
    );
  }

  /* --- On en est --- */
  const line = succession(state);
  const place = placeOf(state);
  const affair = pendingAffair(state);
  const done = dutiesDone(state);
  const owed = expectedDuties(state);
  const abdicateWhy = abdicateBlocker(state);

  return (
    <Sheet title={house?.name ?? 'La maison'} onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>
              {myTitle(state)} {p.firstName}
            </strong>
            <div className="small muted">
              {house?.realm} · {house?.motto.toLowerCase()}
            </div>
          </div>
          {inCourt(state) && (
            <strong style={{ fontSize: 15 }}>{money(state, stipendOf(state))}/an</strong>
          )}
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          {crown.abolished ? (
            <Pill tone="bad">La couronne a été abolie</Pill>
          ) : crown.removed ? (
            <Pill tone="bad">Rang retiré</Pill>
          ) : place >= 0 ? (
            <Pill tone={place === 0 ? 'good' : 'primary'}>{placeLabel(place)}</Pill>
          ) : (
            <Pill>Hors de l’ordre de succession</Pill>
          )}
          {crown.reigned > 0 && <Pill tone="good">{crown.reigned} an(s) de règne</Pill>}
          <Pill>{crown.lifetimeDuties} engagement(s) tenus</Pill>
        </div>
      </Card>

      {/* ---------------- Les deux opinions ---------------- */}
      <Section title="Ce qu’on pense">
        <Card pad>
          <div className="spread">
            <span className="small muted">De toi</span>
            <strong className="small">{standingLabel(crown.standing)}</strong>
          </div>
          <div style={{ marginTop: 6 }}><Meter value={crown.standing} /></div>
          <div className="spread" style={{ marginTop: 14 }}>
            <span className="small muted">De la couronne</span>
            <strong className="small">{sentimentLabel(crown.sentiment)}</strong>
          </div>
          <div style={{ marginTop: 6 }}><Meter value={crown.sentiment} /></div>
          <p className="small muted" style={{ margin: '12px 0 0', lineHeight: 1.5 }}>
            {crown.sentiment < COLLAPSE_LINE
              ? `On parle de la supprimer depuis ${crown.faltering} an(s). ${COLLAPSE_YEARS} suffisent.`
              : 'La première répond à ce que tu fais cette année. La seconde met une génération à bouger, et c’est elle qui décide si tout ceci existe encore.'}
          </p>
          {/* Être écarté ne doit pas être une surprise : la maison prévient,
              et ce qu'elle tolère dépend de ce qu'on lui a donné. */}
          {inCourt(state) && disgrace(state) > 0 && (
            <>
              <div className="spread" style={{ marginTop: 14 }}>
                <span className="small muted">Ce qu’on te reproche en ce moment</span>
                <strong className="small">
                  {Math.round(disgrace(state))} / {Math.round(disgraceLimit(state))}
                </strong>
              </div>
              <div style={{ marginTop: 6 }}>
                <Meter value={Math.min(100, (disgrace(state) / disgraceLimit(state)) * 100)} />
              </div>
              <p className="small muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
                Au bout, la maison te retire ton rang. Elle en supporte
                davantage de quelqu’un qu’on aime et qui tient ses engagements.
              </p>
            </>
          )}
        </Card>
      </Section>

      {/* ---------------- L'affaire ---------------- */}
      {affair && (
        <Section title="À trancher">
          <Card pad>
            <strong>{affair.title}</strong>
            <p className="small" style={{ margin: '8px 0 0', lineHeight: 1.55 }}>
              {affair.brief}
            </p>
          </Card>
          <Card>
            {affair.options.map((option, i) => (
              <Row
                key={option.label}
                emoji={option.sentiment >= 2 ? '🟢' : option.sentiment <= -2 ? '🔴' : '⚪'}
                title={option.label}
                sub={`${option.approval >= 0 ? '+' : ''}${option.approval} sur toi · ${
                  option.sentiment >= 0 ? '+' : ''}${option.sentiment.toFixed(1)} sur la couronne${
                  option.family <= -8 ? ' · les tiens ne pardonneront pas' : ''}`}
                right={option.cost !== 0
                  ? (
                    <Pill tone={option.cost > 0 ? 'warn' : 'good'}>
                      {money(state, Math.abs(Math.round(option.cost * stipendOf(state))))}
                    </Pill>
                  )
                  : undefined}
                onClick={() => run((ctx) => arbitrate(ctx, i), '⚖️')}
                chevron
              />
            ))}
          </Card>
        </Section>
      )}

      {/* ---------------- Les engagements ---------------- */}
      {inCourt(state) && (
        <Section title="Ce que l’année attend">
          <Card pad>
            <div className="spread">
              <span className="small muted">Engagements tenus</span>
              <strong>{done} / {owed}</strong>
            </div>
            <div style={{ marginTop: 8 }}>
              <Meter value={owed > 0 ? Math.min(100, (done / owed) * 100) : 100} />
            </div>
            <p className="small muted" style={{ margin: '10px 0 0' }}>
              {p.age < DUTY_AGE
                ? `On n’attend rien de toi avant ${DUTY_AGE} ans. Tu portes un titre et une place ; tu ne représentes encore personne.`
                : 'Ce qui manque à la fin de l’année se paie sur ce qu’on pense de toi, et un peu sur la couronne.'}
            </p>
          </Card>
          <Card>
            {availableDuties(state).map((duty) => {
              const why = dutyBlocker(state, duty);
              const wear = fatigueOf(state, duty);
              return (
                <Row
                  key={duty.id}
                  emoji={duty.play ? '🎮' : '·'}
                  title={duty.label}
                  sub={why ?? (wear < 1
                    ? `${duty.note} Déjà fait cette année : ${Math.round(wear * 100)} % d’effet.`
                    : duty.note)}
                  right={(
                    <Pill tone={duty.cost > 0.1 ? 'warn' : undefined}>
                      {money(state, dutyCost(state, duty))}
                    </Pill>
                  )}
                  disabled={Boolean(why)}
                  onClick={why ? undefined : () => {
                    if (duty.play) setPlaying(duty);
                    else run((ctx) => performDuty(ctx, duty.id), '👑');
                  }}
                  chevron={!why}
                />
              );
            })}
          </Card>
        </Section>
      )}

      {/* ---------------- La file ---------------- */}
      <Section title="L’ordre de succession">
        {line.length === 0 ? (
          <Empty>
            {crown.abolished
              ? 'Il n’y a plus de file.'
              : 'Tu portes un titre, et tu n’es dans aucune file. Elle ne s’ouvrira pas.'}
          </Empty>
        ) : (
          <Card>
            {line.slice(0, 12).map((kin, i) => (
              <Row
                key={kin.id}
                emoji={i === 0 ? '👑' : kin.personId === 'player' ? '🫵' : '·'}
                title={kin.personId === 'player' ? 'Toi' : kin.name}
                sub={`${kin.role} · ${kin.age} ans`}
                right={<Pill tone={i === 0 ? 'good' : undefined}>{i === 0 ? 'Règne' : `${i}ᵉ`}</Pill>}
              />
            ))}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Rien de ce que tu fais ne t’y fait monter d’une place. Ce que tu
          laisses, en revanche, la fait remonter d’un cran pour celui qui
          reprendra après toi.
        </p>
      </Section>

      {/* ---------------- Le bilan ---------------- */}
      {crown.record.length > 0 && (
        <Section title="Ce que tu as tranché">
          <Card>
            {crown.record.map((entry, i) => (
              <Row key={i} emoji="·" title={entry} />
            ))}
          </Card>
        </Section>
      )}

      {inCourt(state) && (
        <Section title="Partir">
          <Card>
            <Row
              emoji="🚪"
              title="Renoncer"
              sub={abdicateWhy ?? 'Tu sors de l’ordre définitivement et tu descends de deux rangs'}
              disabled={Boolean(abdicateWhy)}
              onClick={abdicateWhy ? undefined : () => run((ctx) => abdicate(ctx), '🚪')}
              chevron={!abdicateWhy}
            />
          </Card>
        </Section>
      )}

      {title && (
        <p className="small muted" style={{ margin: '14px 4px 0', lineHeight: 1.5 }}>
          {title.note}
        </p>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* La haie                                                             */
/* ------------------------------------------------------------------ */

/**
 * L'allée, vue de dessus.
 *
 * Une barre horizontale, des points dessus, et un curseur qui avance. Les
 * points grossissent selon ce qu'on leur a donné ; leur valeur ne s'affiche
 * que si le personnage a l'œil pour la voir — c'est la seule information que
 * son métier apporte, et elle change tout.
 */
function Ropeline({ state: s }: { state: WalkaboutState }) {
  // Qui est à portée, calculé comme le jeu le calcule : c'est la seule
  // information dont le joueur a besoin pour décider de s'arrêter.
  let near = -1;
  let gap = 0.035;
  s.people.forEach((one, i) => {
    const d = Math.abs(one.at - s.pos);
    if (d <= gap) { gap = d; near = i; }
  });
  return (
    <>
      <div className="ropeline">
        {s.people.map((one, i) => (
          <div
            key={i}
            className={`ropeline-face${one.met ? ' ropeline-met' : ''}${
              i === near ? ' ropeline-near' : ''}`}
            style={{
              left: `${one.at * 100}%`,
              transform: `translate(-50%, -50%) scale(${0.7 + one.given * 0.6})`,
              opacity: one.visible ? 0.45 + one.worth * 0.55 : 0.8,
            }}
          />
        ))}
        <div className="ropeline-me" style={{ left: `${s.pos * 100}%` }}>
          {s.standing ? '🧍' : '🚶'}
        </div>
      </div>
      <GameGauge label="L’allée" value={s.pos * 100} />
      <GameGauge
        label="Le temps"
        value={Math.max(0, 100 - (s.elapsed / s.limit) * 100)}
      />
    </>
  );
}
