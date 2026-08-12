/**
 * L'écran des métiers de scène.
 *
 * Trois temps, comme le système : ce qu'on est devenu, ce qu'on nous propose,
 * et l'engagement qu'on tient. Rien n'est décoratif — chaque chiffre affiché
 * décide de quelque chose ailleurs, et l'écran le dit plutôt que de laisser
 * deviner.
 */

import { useState } from 'react';
import { Card, Empty, Meter, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { GameGauge, MiniGameHost } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { performance as PERFORMANCE, type PerformanceSetup, type PerformanceState } from '../systems/minigames/performance.ts';
import {
  acceptOffer, agentOf, autoPerform, availableDisciplines, craftLabel,
  declineOffer, disciplineBlocker, disciplineOf, dismissAgent, hireAgent,
  offerBlocker, pendingAccolades, quitDiscipline, settleJob, startDiscipline,
  templateOf, performanceContext,
} from '../systems/stage.ts';
import { ACCOLADES, DISCIPLINES, receptionLabel } from '../data/stage.ts';
import { fullName } from '../engine/context.ts';

export function StageScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;
  const p = state.player;
  const stage = p.stage;
  const discipline = disciplineOf(state);

  /* --- La prestation --- */
  const context = performanceContext(state);
  if (playing && context && stage?.current) {
    const setup = context.setup as PerformanceSetup;
    return (
      <Sheet title={templateOf(stage.current)?.label ?? 'Prestation'} onBack={() => setPlaying(false)}>
        <MiniGameHost
          key={`performance-${seed}`}
          def={PERFORMANCE}
          context={context}
          seed={seed}
          render={(s: PerformanceState) => <Scene state={s} setup={setup} />}
          onFinish={(_s, result) => {
            run((ctx) => settleJob(ctx, result), discipline?.emoji ?? '🎭');
            setPlaying(false);
            setSeed(Math.floor(Math.random() * 2 ** 31));
          }}
          onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Déplace le doigt pour suivre {setup.lineName}. Quand {setup.beatName} s’ouvre,
          garde le doigt appuyé pendant toute sa durée : c’est ce qu’on retiendra.
          Ne rien tenter est le pire des choix.
        </p>
      </Sheet>
    );
  }

  /* --- Se lancer --- */
  if (!stage || !discipline) {
    const open = availableDisciplines(state);
    return (
      <Sheet title="Monter sur scène" onBack={onBack}>
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            Cinq métiers où l’on ne choisit pas ce qu’on veut faire, mais parmi
            ce qu’on vous propose. Ce qui arrive sur la table dépend de ce que
            vous savez faire et de ce qu’on sait de vous.
          </p>
        </Card>
        <Section title="Ce qui est encore possible">
          <Card>
            {DISCIPLINES.map((d) => {
              const blocker = disciplineBlocker(state, d);
              return (
                <Row
                  key={d.id}
                  emoji={d.emoji}
                  title={d.label}
                  sub={blocker ?? d.what}
                  disabled={Boolean(blocker)}
                  onClick={blocker ? undefined : () => {
                    const outcome = run((ctx) => startDiscipline(ctx, d.id), d.emoji);
                    if (!outcome.ok) return;
                  }}
                  chevron={!blocker}
                />
              );
            })}
          </Card>
          {open.length === 0 && (
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Aucune de ces voies ne t’est ouverte cette année.
            </p>
          )}
        </Section>
      </Sheet>
    );
  }

  /* --- La carrière en cours --- */
  const agent = agentOf(state);
  const blocker = offerBlocker(state);
  const current = stage.current;
  const template = current ? templateOf(current) : undefined;
  const pending = pendingAccolades(state);

  return (
    <Sheet title={discipline.label} onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <div className="row-title">{discipline.craftName}</div>
            <div className="row-sub">{craftLabel(stage.craft)}</div>
          </div>
          <strong>{Math.round(stage.craft)}/100</strong>
        </div>
        <Meter value={stage.craft} />
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone="primary">{stage.done} {discipline.jobName.toLowerCase()}(s)</Pill>
          {stage.lastReception > 0 && (
            <Pill tone={stage.lastReception > 60 ? 'good' : stage.lastReception < 42 ? 'bad' : 'warn'}>
              Dernier : {receptionLabel(stage.lastReception).label.toLowerCase()}
            </Pill>
          )}
          {stage.fatigue > 35 && <Pill tone="warn">Usé ({Math.round(stage.fatigue)})</Pill>}
          {stage.injuredUntil > state.year && <Pill tone="bad">Écarté jusqu’en {stage.injuredUntil}</Pill>}
          {stage.accolades.length > 0 && <Pill tone="good">{stage.accolades.length} distinction(s)</Pill>}
        </div>
      </Card>

      {/* ---------------- L'engagement en cours ---------------- */}
      {current && template && (
        <Section title="Ton engagement">
          <Card>
            <Row
              emoji={discipline.emoji}
              title={template.label}
              sub={`${template.what} · ${current.from}`}
              right={<strong>{money(state, current.fee)}</strong>}
            />
            <Row
              emoji="🎬"
              title="Y aller"
              sub={`Tenir devant un public — difficulté ${Math.round(current.difficulty)}/100`}
              onClick={() => setPlaying(true)}
              chevron
            />
            <Row
              emoji="🎲"
              title="Laisser faire"
              sub="Le personnage s’en sort avec ce qu’il sait faire"
              onClick={() => run((ctx) => autoPerform(ctx), discipline.emoji)}
              chevron
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Un engagement accepté et jamais tenu se solde tout seul à la fin de
            l’année, et mal.
          </p>
        </Section>
      )}

      {/* ---------------- Ce qu'on te propose ---------------- */}
      <Section title="Ce qu’on te propose">
        {stage.offers.length === 0 ? (
          <Empty>
            Le téléphone ne sonne pas. Ce qu’on te propose dépend de ce que tu
            sais faire et de ce qu’on sait de toi.
          </Empty>
        ) : (
          <Card>
            {stage.offers.map((offer) => {
              const t = templateOf(offer);
              if (!t) return null;
              const gap = t.demands - stage.craft;
              return (
                <Row
                  key={offer.id}
                  emoji={gap > 15 ? '⚠️' : gap < -18 ? '😐' : '✅'}
                  title={t.label}
                  sub={[
                    offer.from,
                    gap > 15 ? 'au-dessus de ton niveau' : gap < -18 ? 'très en dessous' : 'à ta portée',
                    t.fame >= 18 ? 'ça se verra' : t.fame <= 3 ? 'personne n’en parlera' : null,
                  ].filter(Boolean).join(' · ')}
                  right={<strong>{money(state, offer.fee)}</strong>}
                  onClick={blocker ? undefined : () => run((ctx) => acceptOffer(ctx, offer.id), discipline.emoji)}
                  disabled={Boolean(blocker)}
                  chevron={!blocker}
                />
              );
            })}
          </Card>
        )}
        {blocker && (
          <p className="small muted" style={{ margin: '8px 4px 0' }}>{blocker}</p>
        )}
        {stage.offers.length > 0 && !blocker && (
          <Card>
            {stage.offers.map((offer) => (
              <Row
                key={`no_${offer.id}`}
                emoji="🚪"
                title={`Refuser — ${templateOf(offer)?.label.toLowerCase() ?? 'cette proposition'}`}
                sub="On appelle quelqu’un d’autre, et parfois on ne rappelle plus"
                onClick={() => run((ctx) => declineOffer(ctx, offer.id), '🚪')}
                chevron
              />
            ))}
          </Card>
        )}
      </Section>

      {/* ---------------- L'agent ---------------- */}
      <Section title={discipline.agentName}>
        <Card>
          {agent ? (
            <>
              <Row
                emoji="🤝"
                title={fullName(agent)}
                sub="Plus de propositions, mieux payées — quinze pour cent de tout"
                right={<Pill tone="warn">15 %</Pill>}
              />
              <Row
                emoji="✂️"
                title="Vous séparer"
                sub="Le carnet d’adresses part avec lui"
                onClick={() => run((ctx) => dismissAgent(ctx), '✂️')}
                chevron
              />
            </>
          ) : (
            <Row
              emoji="🤝"
              title={`Chercher un ${discipline.agentName.toLowerCase()}`}
              sub={stage.craft < 20
                ? 'Personne ne prend quelqu’un qu’on ne connaît pas encore'
                : 'Il négocie mieux que toi, et prend sa part sur tout'}
              disabled={stage.craft < 20}
              onClick={() => run((ctx) => hireAgent(ctx), '🤝')}
              chevron
            />
          )}
        </Card>
      </Section>

      {/* ---------------- Les distinctions ---------------- */}
      <Section title="Distinctions">
        <Card>
          {stage.accolades.map((id) => {
            const a = ACCOLADES.find((x) => x.id === id);
            return a ? (
              <Row key={id} emoji="🏆" title={a.label} sub={a.note} right={<Pill tone="good">Obtenue</Pill>} />
            ) : null;
          })}
          {pending.map((a) => (
            <Row
              key={a.id}
              emoji="🎯"
              title={a.label}
              sub={[
                a.needs.craft !== undefined ? `${discipline.craftName.toLowerCase()} ${a.needs.craft}` : null,
                a.needs.jobs !== undefined ? `${a.needs.jobs} ${discipline.jobName.toLowerCase()}s` : null,
                a.needs.bestReception !== undefined ? `un accueil à ${a.needs.bestReception}` : null,
                a.needs.fame !== undefined ? `notoriété ${a.needs.fame}` : null,
              ].filter(Boolean).join(' · ')}
            />
          ))}
          {stage.accolades.length === 0 && pending.length === 0 && (
            <Row emoji="—" title="Rien à viser ici" />
          )}
        </Card>
      </Section>

      <Section title="Arrêter">
        <Card>
          <Row
            emoji="🚪"
            title="Ne plus faire ça"
            sub="Ce que tu as fait reste, mais on cessera vite de t’appeler"
            onClick={() => { run((ctx) => quitDiscipline(ctx), '🚪'); }}
            chevron
          />
        </Card>
      </Section>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* La scène                                                           */
/* ------------------------------------------------------------------ */

function Scene({ state: s, setup }: { state: PerformanceState; setup: PerformanceSetup }) {
  const beat = s.active !== null ? s.beats[s.active] : null;
  const timeLeft = Math.max(0, s.limit - s.elapsed) / 1000;
  const landed = s.beats.filter((b) => b.landed).length;

  return (
    <>
      <div className="scene">
        {/* La zone juste, autour de la ligne à suivre. */}
        <div
          className="scene-band"
          style={{
            left: `${Math.max(0, (s.line - s.band) * 100)}%`,
            width: `${s.band * 200}%`,
          }}
        />
        <div className="scene-line" style={{ left: `${s.line * 100}%` }} />
        <div
          className={`scene-cursor${beat ? ' scene-cursor-beat' : ''}`}
          style={{ left: `${s.cursor * 100}%` }}
        >
          {beat ? '✨' : '●'}
        </div>
        {beat && (
          <div className="scene-beat">
            {setup.beatName} — tiens
          </div>
        )}
      </div>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>{setup.lineName}</span>
          <span>{timeLeft.toFixed(0)} s</span>
        </div>
        <GameGauge label="Justesse" value={s.accuracy} low danger={60} />
        <GameGauge label="Public" value={s.audience} low danger={55} />
        <div className="chips" style={{ marginTop: 8 }}>
          <Pill tone={landed > 0 ? 'good' : undefined}>
            {landed}/{s.beats.length} tenu(s)
          </Pill>
          {s.slips > 0 && <Pill tone="warn">{s.slips} écart(s)</Pill>}
        </div>
      </div>
    </>
  );
}
