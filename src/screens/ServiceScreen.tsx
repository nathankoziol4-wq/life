/**
 * L'écran de ceux qui servent.
 *
 * Trois temps, comme le système : où l'on en est dans la maison, ce qu'on
 * vous confie, et la mission qu'on tient. Chaque chiffre affiché décide de
 * quelque chose ailleurs — la réputation ouvre les grades, les grades ouvrent
 * les missions, et l'écran le dit au lieu de laisser deviner.
 */

import { useState } from 'react';
import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { GameGauge, MiniGameHost } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { docking, type DockingState } from '../systems/minigames/docking.ts';
import { infiltration, type InfiltrationState } from '../systems/minigames/infiltration.ts';
import {
  acceptBlocker, acceptDuty, autoRun, availableCorps, corpsOf, declineDuty,
  dutyContext, enlist, entryBlocker, leaveBlocker, leaveService, nextRank,
  operational, promotionGap, rankOf, selectionOdds, servedYears, servicePay,
  settleDuty, standingLabel, train, trainBlocker,
} from '../systems/service.ts';
import {
  CORPS, DECORATIONS, getCorps, getDuty, ranksFor,
} from '../data/service.ts';

/** Le pictogramme d'une maison. Aucun n'appartient à une institution réelle. */
const EMOJI: Record<string, string> = { armee: '🎖️', orbite: '🚀', ombre: '🕶️' };

export function ServiceScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;
  const p = state.player;
  const service = p.service;
  const corps = corpsOf(state);

  /* --- La mission jouée --- */
  const context = dutyContext(state);
  if (playing && context && service?.current && corps) {
    const duty = getDuty(service.current.dutyId);
    const finish = (result: Parameters<typeof settleDuty>[1]) => {
      run((ctx) => settleDuty(ctx, result), EMOJI[corps.id] ?? '🎖️');
      setPlaying(false);
      setSeed(Math.floor(Math.random() * 2 ** 31));
    };
    return (
      <Sheet title={duty?.label ?? 'Mission'} onBack={() => setPlaying(false)}>
        {corps.game === 'docking' ? (
          <MiniGameHost
            key={`docking-${seed}`}
            def={docking}
            context={context}
            seed={seed}
            render={(s: DockingState) => <Approach state={s} />}
            onFinish={(_s, result) => finish(result)}
            onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
          />
        ) : (
          <MiniGameHost
            key={`infiltration-${seed}`}
            def={infiltration}
            context={context}
            seed={seed}
            render={(s: InfiltrationState) => <Approach2 state={s} />}
            onFinish={(_s, result) => finish(result)}
            onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
          />
        )}
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          {corps.game === 'docking'
            ? 'Garde le doigt posé. Appuie d’un côté de la machine pour pousser de ce côté — la poussée reste quand tu reviens au milieu. Monte le doigt pour fermer la distance, baisse-le pour ralentir : il faut arriver aligné et lent.'
            : 'Un passage arrête la marche. Lâche devant lui et attends une seconde et demie : il s’ouvre sans bruit. Garde le doigt et il cède trois fois plus vite, mais tout le monde l’entend. Tu peux te retirer à tout moment avec ce que tu as déjà fait.'}
        </p>
      </Sheet>
    );
  }

  /* --- Entrer --- */
  if (!service || !corps) {
    return (
      <Sheet title="Servir" onBack={onBack}>
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            Trois maisons où l’on n’est pas embauché mais retenu. On y passe
            une sélection, on s’y forme avant d’être bon à quelque chose, on y
            monte au mérite et à l’ancienneté — et l’on y risque quelque chose.
          </p>
        </Card>
        {p.veteran && <VeteranCard />}
        <Section title="Se présenter">
          <Card>
            {CORPS.map((c) => {
              const blocker = entryBlocker(state, c);
              const odds = selectionOdds(state, c);
              return (
                <Row
                  key={c.id}
                  emoji={EMOJI[c.id] ?? '🎖️'}
                  title={c.label}
                  sub={`${c.entryLabel} — ${c.trainingYears} an(s) de formation`}
                  because={blocker}
                  right={blocker ? undefined : (
                    <Pill tone={odds > 0.6 ? 'good' : odds > 0.3 ? 'warn' : 'bad'}>
                      {Math.round(odds * 100)} %
                    </Pill>
                  )}
                  closed={Boolean(blocker)}
                  onClick={() => run((ctx) => enlist(ctx, c.id), EMOJI[c.id] ?? '🎖️')}
                  chevron={!blocker}
                />
              );
            })}
          </Card>
          {availableCorps(state).length === 0 && (
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Aucune de ces maisons ne t’est ouverte cette année.
            </p>
          )}
        </Section>
        <Section title="Ce qu’elles demandent">
          <Card>
            {CORPS.map((c) => (
              <Row
                key={c.id}
                emoji={EMOJI[c.id] ?? '🎖️'}
                title={c.label}
                sub={`Forme ${c.needs.fitness} · santé ${c.needs.health} · tête ${
                  c.needs.intelligence} · discipline ${c.needs.discipline}${
                  c.needsDegree ? ' · un diplôme' : ''}${
                  c.recruitedOnly ? ' · et l’on ne postule pas' : ''}`}
              />
            ))}
          </Card>
        </Section>
      </Sheet>
    );
  }

  /* --- Servir --- */
  const rank = rankOf(state);
  const next = nextRank(state);
  const gap = promotionGap(state);
  const current = service.current;
  const currentDuty = current ? getDuty(current.dutyId) : undefined;
  const blocker = acceptBlocker(state);

  return (
    <Sheet title={corps.label} onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>{rank?.label}</strong>
            <div className="small muted">{standingLabel(service.standing)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ fontSize: 17 }}>{Math.round(service.readiness)}/100</strong>
            <div className="small muted">préparation</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Meter value={service.standing} />
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          <Pill tone="primary">{servedYears(state)} an(s)</Pill>
          <Pill>{service.done} {corps.dutyName}(s)</Pill>
          {service.failed > 0 && <Pill tone="warn">{service.failed} ratée(s)</Pill>}
          {service.wounded && <Pill tone="bad">Blessé</Pill>}
          <Pill tone="good">{money(state, servicePay(state))}/an</Pill>
        </div>
        {corps.cover && (
          <p className="small muted" style={{ margin: '10px 0 0' }}>
            Auprès des autres, tu es {corps.cover.toLowerCase()}. Personne ne sait
            le reste, et c’est la seule chose que la maison exige vraiment.
          </p>
        )}
      </Card>

      {/* ---------------- Formation ---------------- */}
      {service.trainingLeft > 0 && (
        <Section title={corps.trainingName.replace(/^./, (c) => c.toUpperCase())}>
          <Card pad>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Encore {service.trainingLeft} an(s) avant d’être opérationnel.
              Jusque-là, on ne te confie rien et la solde est réduite.
            </p>
          </Card>
        </Section>
      )}

      {/* ---------------- La mission en cours ---------------- */}
      {current && currentDuty && (
        <Section title={`Ton ${corps.dutyName}`}>
          <Card>
            <Row
              emoji={EMOJI[corps.id] ?? '🎖️'}
              title={currentDuty.label}
              sub={currentDuty.note}
              right={<Pill tone="accent">{money(state, current.bounty)}</Pill>}
            />
            <div className="card-pad">
              <div className="chips">
                <Pill tone={current.demands > service.readiness + 8 ? 'warn' : undefined}>
                  Exigence {Math.round(current.demands)}
                </Pill>
                <Pill tone={current.danger > 0.5 ? 'bad' : current.danger > 0.25 ? 'warn' : 'good'}>
                  Danger {Math.round(current.danger * 100)} %
                </Pill>
                {current.yearsLeft > 1 && <Pill>{current.yearsLeft} an(s)</Pill>}
              </div>
            </div>
            <Row
              emoji="▶️"
              title="Y aller"
              sub={corps.game === 'docking'
                ? 'Aligner et amarrer, avec ce qu’il reste de carburant'
                : 'Avancer sans se faire remarquer'}
              onClick={() => setPlaying(true)}
              chevron
            />
            <Row
              emoji="🎲"
              title="Laisser faire"
              sub="Le personnage s’en charge, avec ce qu’il sait — sans toi"
              onClick={() => run((ctx) => autoRun(ctx), EMOJI[corps.id] ?? '🎖️')}
              chevron
            />
          </Card>
        </Section>
      )}

      {/* ---------------- Ce qu'on te confie ---------------- */}
      {!current && (
        <Section title="Ce qu’on te confie">
          {blocker ? (
            <Empty>{blocker}</Empty>
          ) : service.offers.length === 0 ? (
            <Empty>Rien cette année. On te fera signe.</Empty>
          ) : (
            <>
              <Card>
                {service.offers.map((offer) => {
                  const duty = getDuty(offer.dutyId);
                  if (!duty) return null;
                  return (
                    <Row
                      key={offer.id}
                      emoji={EMOJI[corps.id] ?? '🎖️'}
                      title={duty.label}
                      sub={`${duty.note} · exigence ${Math.round(offer.demands)} · danger ${
                        Math.round(offer.danger * 100)} %${
                        offer.yearsLeft > 1 ? ` · ${offer.yearsLeft} ans` : ''}`}
                      right={<Pill tone={offer.danger > 0.5 ? 'bad' : 'accent'}>
                        {money(state, offer.bounty)}
                      </Pill>}
                      onClick={() => run(
                        (ctx) => acceptDuty(ctx, offer.id), EMOJI[corps.id] ?? '🎖️',
                      )}
                      chevron
                    />
                  );
                })}
              </Card>
              <Card>
                {service.offers.map((offer) => (
                  <Row
                    key={`no_${offer.id}`}
                    emoji="🚪"
                    title={`Décliner — ${getDuty(offer.dutyId)?.label.toLowerCase() ?? 'cette mission'}`}
                    sub="On note. On ne dit rien, mais on note."
                    onClick={() => run((ctx) => declineDuty(ctx, offer.id), '🚪')}
                    chevron
                  />
                ))}
              </Card>
            </>
          )}
        </Section>
      )}

      {/* ---------------- Se préparer ---------------- */}
      <Section title="Te préparer">
        <Card>
          <Row
            emoji="🏋️"
            title="T’entraîner"
            sub="Une année de plus à faire ce qu’on te dit"
            because={trainBlocker(state)}
            closed={Boolean(trainBlocker(state))}
            onClick={() => run((ctx) => train(ctx), '🏋️')}
            chevron={!trainBlocker(state)}
          />
          {!operational(state) && service.sidelinedUntil > state.year && (
            <Row
              emoji="🩹"
              title={`Indisponible jusqu’en ${service.sidelinedUntil}`}
              sub="On ne repart pas avant d’être remis"
            />
          )}
        </Card>
      </Section>

      {/* ---------------- Le grade ---------------- */}
      <Section title="Ton grade">
        <Card>
          {ranksFor(corps.id).map((r) => {
            const ladder = ranksFor(corps.id);
            const here = ladder.findIndex((x) => x.id === rank?.id);
            const mine = ladder.findIndex((x) => x.id === r.id);
            return (
              <Row
                key={r.id}
                emoji={mine < here ? '✔️' : mine === here ? '⭐' : '·'}
                title={r.label}
                sub={mine <= here
                  ? 'Obtenu'
                  : `${r.standing} de réputation · ${r.years} an(s) de service`}
                right={mine === here ? <Pill tone="good">Actuel</Pill> : undefined}
              />
            );
          })}
        </Card>
        {next && gap && (
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Pour {next.label.toLowerCase()} : il manque {gap}.
          </p>
        )}
      </Section>

      {/* ---------------- Distinctions ---------------- */}
      <Section title="Distinctions">
        <Card>
          {DECORATIONS.filter((d) => d.corps === corps.id).map((d) => {
            const has = service.decorations.includes(d.id);
            return (
              <Row
                key={d.id}
                emoji={has ? '🏅' : '·'}
                title={d.label}
                sub={has ? d.note : describe(d.needs)}
                right={has ? <Pill tone="good">Obtenue</Pill> : undefined}
              />
            );
          })}
        </Card>
      </Section>

      {/* ---------------- Sortir ---------------- */}
      <Section title="Sortir">
        <Card>
          <Row
            emoji="🚪"
            title="Quitter"
            sub="Ce que tu emportes dépend de ce que tu laisses"
            because={leaveBlocker(state)}
            closed={Boolean(leaveBlocker(state))}
            onClick={() => run((ctx) => leaveService(ctx), '🚪')}
            chevron={!leaveBlocker(state)}
          />
        </Card>
      </Section>
    </Sheet>
  );
}

/** Les conditions d'une distinction, en une phrase. */
function describe(needs: (typeof DECORATIONS)[number]['needs']): string {
  const bits: string[] = [];
  if (needs.standing !== undefined) bits.push(`${needs.standing} de réputation`);
  if (needs.duties !== undefined) bits.push(`${needs.duties} mission(s)`);
  if (needs.years !== undefined) bits.push(`${needs.years} an(s)`);
  if (needs.rank !== undefined) bits.push('un grade élevé');
  if (needs.wounded) bits.push('y avoir laissé quelque chose');
  if (needs.danger !== undefined) bits.push('une mission très exposée');
  return bits.join(' · ');
}

/** Ce qu'un service terminé a laissé. */
function VeteranCard() {
  const { state } = useGame();
  const veteran = state?.player.veteran;
  if (!veteran) return null;
  const corps = getCorps(veteran.corpsId);
  const rank = ranksFor(veteran.corpsId).find((r) => r.id === veteran.rankId);
  return (
    <Section title="Ce que tu as déjà fait">
      <Card>
        <Row
          emoji={EMOJI[veteran.corpsId] ?? '🎖️'}
          title={rank?.label ?? corps?.label ?? 'Ancien'}
          sub={`${veteran.years} an(s) dans ${corps?.house ?? 'une maison'} · ${
            veteran.duties} mission(s)${veteran.wounded ? ' · blessé' : ''}`}
          right={<Pill tone="good">{money(state!, veteran.pension)}/an</Pill>}
        />
      </Card>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Les deux scènes                                                     */
/* ------------------------------------------------------------------ */

/** L'amarrage : un axe, un port qui dérive, une distance qui tombe. */
function Approach({ state: s }: { state: DockingState }) {
  const timeLeft = Math.max(0, (s.limit - s.elapsed) / 1000);
  return (
    <>
      <div className="dock-field">
        {/* La distance : le port grossit à mesure qu'on approche. */}
        <div
          className="dock-port"
          style={{
            left: `${s.port * 100}%`,
            width: `${8 + (1 - s.range) * 16}%`,
            opacity: 0.35 + (1 - s.range) * 0.6,
          }}
        />
        {/* Le fil d'alignement : le port est haut, la machine est basse, et
            comparer deux abscisses séparées par cent pixels de vide ne se
            fait pas d'un coup d'œil. Le fil le fait à la place du joueur. */}
        <div
          className={`dock-aim${Math.abs(s.ship - s.port) <= s.window ? ' dock-aim-on' : ''}`}
          style={{ left: `${s.ship * 100}%` }}
        />
        <div className="dock-ship" style={{ left: `${s.ship * 100}%` }}>▲</div>
        <div className="dock-rail" style={{ width: `${(1 - s.range) * 100}%` }} />
        {s.notes[s.notes.length - 1] === 'bord' && (
          <div className={`dock-warn dock-warn-${s.ship < 0.5 ? 'left' : 'right'}`}>bord</div>
        )}
      </div>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>distance {Math.round(s.range * 100)} %</span>
          <span>{timeLeft.toFixed(0)} s</span>
        </div>
        <GameGauge label="Carburant" value={s.fuel} low danger={65} />
        <GameGauge
          label="Vitesse d’approche"
          value={Math.min(100, (s.closing / 0.00022) * 100)}
          danger={Math.max(6, Math.min(100, (s.softness / 0.00022) * 100))}
        />
        <div className="chips" style={{ marginTop: 8 }}>
          <Pill tone={Math.abs(s.ship - s.port) <= s.window ? 'good' : 'warn'}>
            {Math.abs(s.ship - s.port) <= s.window ? 'aligné' : 'décalé'}
          </Pill>
          {s.bumps > 0 && <Pill tone="bad">{s.bumps} contact(s) manqué(s)</Pill>}
        </div>
      </div>
    </>
  );
}

/** L'approche discrète : une progression, une attention, des passages. */
function Approach2({ state: s }: { state: InfiltrationState }) {
  const timeLeft = Math.max(0, (s.limit - s.elapsed) / 1000);
  const clean = s.gates.filter((g) => g.clean).length;
  return (
    <>
      <div className={`creep-field${s.watched ? ' creep-watched' : ''}`}>
        <div className="creep-track">
          <div className="creep-done" style={{ width: `${s.progress * 100}%` }} />
          {s.gates.map((gate, i) => (
            <div
              key={i}
              className={`creep-gate${gate.passed ? (gate.clean ? ' creep-gate-ok' : ' creep-gate-bad') : ''}`}
              style={{ left: `${gate.at * 100}%` }}
            />
          ))}
          <div className="creep-me" style={{ left: `${s.progress * 100}%` }}>
            {s.moving ? '›' : '•'}
          </div>
        </div>
        <div className="creep-eye">
          {s.watched ? '👁️' : '💤'}
          {s.turning && <span className="creep-turn">ça change</span>}
        </div>
      </div>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>{s.watched ? 'On regarde' : 'Personne ne regarde'}</span>
          <span>{timeLeft.toFixed(0)} s</span>
        </div>
        <GameGauge label="Attention" value={s.heat} danger={80} />
        {/* Le retard, pas le danger : une progression basse au début d'une
            course n'est pas une alerte, et l'afficher en rouge dès la
            quatorzième seconde disait le contraire de ce qui se passe. */}
        <GameGauge label="Progression" value={s.progress * 100} low danger={95} />
        <div className="chips" style={{ marginTop: 8 }}>
          <Pill tone={clean === s.gates.length ? 'good' : undefined}>
            {clean}/{s.gates.length} passage(s)
          </Pill>
          {s.scares > 0 && <Pill tone="warn">{s.scares} alerte(s)</Pill>}
        </div>
      </div>
    </>
  );
}
