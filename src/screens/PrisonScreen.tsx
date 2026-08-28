/**
 * La détention, vue de l'intérieur.
 *
 * Jusqu'ici, une peine de douze ans se jouait avec huit boutons et une barre
 * de progression. C'était le domaine le plus long du jeu et le moins habité.
 *
 * L'écran répond à trois questions, dans l'ordre où elles se posent quand on
 * arrive : **où suis-je**, **avec qui**, et **comment je sors**. La dernière
 * a deux réponses, et elles s'excluent — le dossier ouvre la conditionnelle,
 * le respect ouvre la porte. Tout ce qui fait monter l'un fait baisser
 * l'autre, si bien qu'il faut choisir tôt par où l'on compte sortir.
 */

import { useState } from 'react';
import {
  Empty, Gauge, Meter, Pill, Sheet,
} from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { GameGauge, MiniGameHost, StartWhenReady } from '../components/MiniGameHost.tsx';
import { BeamCone, PlanGrid, Token } from '../components/PlanView.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor } from '../ui/format.ts';
import { PRISON_ACTIVITIES } from '../data/crimes.ts';
import {
  doPrisonActivity, inmateAction, settleYard, yardBlocker, yardContext,
  type InmateAction,
} from '../systems/prison.ts';
import {
  yard as YARD, warning, exposed, FRONT, type YardState,
} from '../systems/minigames/yard.ts';
import { interact, type SocialAction } from '../systems/relationships.ts';
import { getAvailableActions } from '../systems/actions.ts';
import { peopleByRelation } from '../engine/context.ts';
import { ESCAPE, escapeOutcome, type EscapeState } from '../systems/minigames/escape.ts';
import { CHASE, type ChaseState } from '../systems/minigames/chase.ts';
import type { ChaseSetup } from '../systems/minigames/chase.ts';
import {
  PREPARATIONS, autoEscape, escapeBlocker, escapeContext, escapeWarning,
  preparationBlocker, prepareEscape, resolveEscapeAttempt, resolveEscapeChase,
} from '../systems/escape.ts';

type Phase =
  | { kind: 'détention' }
  | { kind: 'évasion' }
  | { kind: 'cour' }
  | { kind: 'fuite'; setup: ChaseSetup };

export function PrisonScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [phase, setPhase] = useState<Phase>({ kind: 'détention' });
  const [selected, setSelected] = useState<string | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;

  const prison = state.player.prison;
  if (!prison) {
    return (
      <Sheet title="Détention" onBack={onBack}>
        <Empty>Tu n’es pas incarcéré.</Empty>
      </Sheet>
    );
  }

  /* --- La course, après le périmètre --- */
  if (phase.kind === 'fuite') {
    return (
      <Sheet title="Cours" onBack={onBack}>
        {/* « De l'autre côté » s'affiche par-dessus cette scène. Tant qu'il
            est là, la course n'a pas commencé : sinon elle se joue sans
            joueur, et se perd en un peu plus d’une seconde. */}
        <StartWhenReady waiting={<Empty>Ils vont s’en apercevoir. Ferme le message.</Empty>}>
          <MiniGameHost
            key={`prison-chase-${seed}`}
            def={CHASE}
            context={escapeContext(state)}
            seed={seed}
            render={(s: ChaseState) => <ChaseScene state={s} />}
            onFinish={(s) => {
              run((ctx) => resolveEscapeChase(ctx, s.over === 'échappé'), '🏃');
              onBack();
            }}
            onQuit={() => { /* renoncer, c'est se laisser reprendre */ }}
          />
        </StartWhenReady>
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Maintiens l’appui pour courir. Ils vont plus vite en ligne droite,
          mais ils perdent la trace dans les angles.
        </p>
      </Sheet>
    );
  }

  /* --- La cour, quand elle a tourné --- */
  if (phase.kind === 'cour') {
    return (
      <Sheet title="La cour" onBack={() => setPhase({ kind: 'détention' })}>
        <MiniGameHost
          key={`yard-${seed}`}
          def={YARD}
          context={yardContext(state)}
          seed={seed}
          render={(s: YardState) => <CourtScene state={s} />}
          onFinish={(_s, result) => {
            run((ctx) => settleYard(ctx, result), '🪧');
            setSeed(Math.floor(Math.random() * 2 ** 31));
            setPhase({ kind: 'détention' });
          }}
          onQuit={() => { /* renoncer, c'est rester au fond : la note le dira */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Fais glisser le doigt vers le haut pour avancer, vers le bas pour
          reculer. Devant, on se fait un nom ; quand ils relèvent les visages,
          il vaut mieux ne plus y être. Tu sens venir d’autant plus tôt que tu
          connais la maison.
        </p>
      </Sheet>
    );
  }

  /* --- La traversée --- */
  if (phase.kind === 'évasion') {
    const context = escapeContext(state);
    return (
      <Sheet title="Cette nuit" onBack={() => setPhase({ kind: 'détention' })}>
        <MiniGameHost
          key={`escape-${seed}`}
          def={ESCAPE}
          context={context}
          seed={seed}
          render={(s: EscapeState) => <YardScene state={s} />}
          onFinish={(s, result) => {
            const answer = run(
              (ctx) => resolveEscapeAttempt(ctx, {
                outcome: escapeOutcome(s), result, context,
              }),
              '🪜',
            );
            setSeed(Math.floor(Math.random() * 2 ** 31));
            const chase = (answer as { chase?: ChaseSetup }).chase;
            if (chase) setPhase({ kind: 'fuite', setup: chase });
            else onBack();
          }}
          onQuit={() => { /* renoncer en route, c'est être trouvé dehors */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Touche pour te déplacer, maintiens pour courir — courir se voit.
          Arrête-toi sur un abri pour disparaître : la vigilance y retombe deux
          fois plus vite. Le faisceau ne se contourne pas, il s’attend.
        </p>
      </Sheet>
    );
  }

  if (selected) {
    return <InmateSheet personId={selected} onBack={() => setSelected(null)} />;
  }

  /* --- La détention --- */
  const inmates = peopleByRelation(state, ['inmate']).filter((x) => x.alive);
  const blocker = escapeBlocker(state);
  const warning = escapeWarning(state);
  const served = prison.totalSentence - prison.yearsLeft;

  return (
    <Sheet title={prison.facilityName} onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
              {prison.yearsLeft} an{prison.yearsLeft > 1 ? 's' : ''} à faire
            </div>
            <div className="row-sub">
              {served} an{served > 1 ? 's' : ''} purgé{served > 1 ? 's' : ''}
              {' '}sur {prison.totalSentence}
            </div>
          </div>
          <Pill tone={prison.security === 'maximum' ? 'bad' : prison.security === 'medium' ? 'warn' : undefined}>
            régime {prison.security}
          </Pill>
        </div>
        <div style={{ marginTop: 12 }}>
          <Meter value={(served / Math.max(1, prison.totalSentence)) * 100} />
        </div>
      </Card>

      <Section title="Les deux portes">
        <Card>
          <Row
            emoji="📋"
            title="Dossier"
            sub="Ce que la commission regarde"
            right={<Gauge value={prison.behavior} />}
          />
          <Row
            emoji="🪨"
            title="Respect"
            sub="Ce que la cour regarde"
            right={<Gauge value={prison.respect} />}
          />
          {prison.paroleDenials > 0 && (
            <Row
              emoji="🕊️"
              title="Conditionnelle refusée"
              sub="Chaque refus rend le suivant plus difficile"
              right={<Pill tone="bad">{prison.paroleDenials}</Pill>}
            />
          )}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Elles s’opposent. Tenir son dossier fait de toi quelqu’un sur qui on
          ne compte pas dans la cour ; se faire respecter se paie en
          rapports. Il faut décider tôt par où tu comptes sortir.
        </p>
      </Section>

      <Section title="Occuper ses journées">
        <Card>
          {PRISON_ACTIVITIES.map((a) => (
            <Row
              key={a.id}
              emoji={a.emoji}
              title={a.name}
              sub={a.description}
              closed={a.id === 'riot' && Boolean(yardBlocker(state))}
              because={yardBlocker(state)}
              onClick={() => {
                // L'esclandre se joue : c'est la seule activité de la liste
                // qui ouvre une scène plutôt que de se régler par un tirage.
                if (a.id === 'riot') setPhase({ kind: 'cour' });
                else run((ctx) => doPrisonActivity(ctx, a.id), a.emoji);
              }}
              chevron
            />
          ))}
        </Card>
      </Section>

      <Section title={`Ceux d’ici (${inmates.length})`}>
        {inmates.length === 0 ? (
          <Empty>
            Tu ne connais personne encore. « Parler aux détenus » est le seul
            moyen d’y changer quelque chose — et ce n’est pas sans risque.
          </Empty>
        ) : (
          <Card>
            {inmates.map((person) => (
              <Row
                key={person.id}
                emoji={avatarFor(person)}
                title={`${person.firstName} ${person.lastName}`}
                sub={`${person.age} ans · relation ${Math.round(person.relationship)}`}
                onClick={() => setSelected(person.id)}
                chevron
              />
            ))}
          </Card>
        )}
      </Section>

      <Section title="Sortir autrement">
        <Card>
          <Row
            emoji="🗺️"
            title="Préparation"
            sub="Ce que tu as rassemblé, et ce qu’ils soupçonnent"
            right={<Gauge value={prison.escapePlan} />}
          />
          <Row
            emoji="🔍"
            title="Méfiance de la direction"
            sub="Elle retombe d’elle-même, lentement"
            right={<Gauge value={prison.suspicion} />}
          />
        </Card>
        <Card>
          {PREPARATIONS.map((prep) => {
            const stop = preparationBlocker(state, prep);
            return (
              <Row
                key={prep.id}
                emoji={prep.emoji}
                title={prep.label}
                sub={prep.hint}
                because={stop}
                right={prison.prepared.includes(prep.id)
                  ? <Pill tone="good">fait</Pill>
                  : <Pill tone={prep.risk > 15 ? 'bad' : 'warn'}>risque {prep.risk}</Pill>}
                closed={Boolean(stop)}
                onClick={() => run((ctx) => prepareEscape(ctx, prep.id), prep.emoji)}
                chevron={!stop}
              />
            );
          })}
        </Card>

        <Card>
          <Row
            emoji="🪜"
            title="Tenter cette nuit"
            // `warning` n'est pas un refus : c'est ce qu'on risque en y
            // allant quand même. Il reste donc dans le sous-titre, et seul le
            // vrai blocage passe en raison.
            sub={warning ?? 'La cour, le faisceau, le périmètre — puis courir'}
            because={blocker}
            right={<Pill tone="primary">jouable</Pill>}
            closed={Boolean(blocker)}
            onClick={() => setPhase({ kind: 'évasion' })}
            chevron={!blocker}
          />
          <Row
            emoji="🎲"
            title="Laisser faire"
            sub="Le personnage tente sa chance seul, course comprise"
            because={blocker}
            closed={Boolean(blocker)}
            onClick={() => { run((ctx) => autoEscape(ctx), '🪜'); onBack(); }}
            chevron={!blocker}
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Rien de ce qui suit ne décrit un procédé : ce sont des jauges, des
          angles et du minutage. Et sortir n’est pas être libre — un évadé n’a
          plus de nom, donc plus d’emploi possible.
        </p>
      </Section>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Quelqu'un qui purge la même peine                                   */
/* ------------------------------------------------------------------ */

function InmateSheet({ personId, onBack }: { personId: string; onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const target = state.npcs[personId];
  if (!target) return null;
  const actions = getAvailableActions(state, target, 'prison');

  const perform = (id: string) => {
    const emoji = avatarFor(target);
    switch (id) {
      case 'seekProtection': case 'backUp': case 'askFavor': case 'standUpTo':
        return run((ctx) => inmateAction(ctx, personId, id as InmateAction), emoji);
      default:
        return run((ctx) => interact(ctx, personId, id as SocialAction), emoji);
    }
  };

  const groups: { key: string; title: string }[] = [
    { key: 'prison', title: 'Ici' },
    { key: 'lien', title: 'Entretenir le lien' },
    { key: 'conflit', title: 'Conflit' },
  ];

  return (
    <Sheet title={`${target.firstName} ${target.lastName}`} onBack={onBack}>
      <Card pad>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 38 }}>{avatarFor(target)}</div>
          <div>
            <div className="row-title">Codétenu</div>
            <div className="row-sub">{target.age} ans</div>
          </div>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone="primary">Relation {Math.round(target.relationship)}</Pill>
          <Pill>Opinion {Math.round(target.opinion)}</Pill>
        </div>
      </Card>

      {groups.map(({ key, title }) => {
        const list = actions.filter((a) => a.group === key);
        if (list.length === 0) return null;
        return (
          <Section key={key} title={title}>
            <Card>
              {list.map((a) => (
                <Row
                  key={a.id}
                  emoji={a.emoji}
                  title={a.label}
                  sub={a.hint}
                  because={a.blocked}
                  closed={Boolean(a.blocked)}
                  onClick={() => perform(a.id)}
                  chevron
                />
              ))}
            </Card>
          </Section>
        );
      })}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Les scènes                                                          */
/* ------------------------------------------------------------------ */

/**
 * La cour : un axe vertical, et ce qu'on sent venir.
 *
 * Rien de violent n'est montré — ce qui est en jeu est d'être vu ou non. Le
 * haut est le premier rang, le bas le fond ; la bande d'alerte est la seule
 * information que la compétence du personnage achète, et elle vient de
 * `warning`, ce qui rend le champ `tell` visible au lieu de dormir dans
 * l'état.
 */
function CourtScene({ state: s }: { state: YardState }) {
  const soon = warning(s);
  const left = Math.max(0, (s.limit - s.elapsed) / 1000);
  const done = s.sweeps.filter((w) => w.done).length;
  return (
    <>
      <div className="yard-court">
        {/* La zone de devant : ce qui rapporte, et ce qui se fait relever. */}
        <div className="yard-front" style={{ height: `${(1 - FRONT) * 100}%` }} />
        <div
          className="yard-you"
          style={{
            bottom: `${s.at * 100}%`,
            background: exposed(s) ? 'var(--bad, #c0392b)' : 'var(--good, #27ae60)',
          }}
        />
        {/* Ce qu'on sent venir : d'autant plus tôt qu'on connaît la maison. */}
        <div className="yard-alarm" style={{ opacity: soon }} />
      </div>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>{done}/{s.sweeps.length} balayages</span>
          <span>{left.toFixed(0)} s</span>
        </div>
        <GameGauge label="Ce que tu t’es fait comme nom" value={s.standing} danger={200} />
        <GameGauge label="Ils vont relever les visages" value={soon * 100} danger={65} />
        <div className="chips" style={{ marginTop: 8 }}>
          <Pill tone={exposed(s) ? 'bad' : 'good'}>
            {exposed(s) ? 'tu es devant' : 'tu es au fond'}
          </Pill>
          {s.marked > 0 && <Pill tone="bad">relevé {s.marked} fois</Pill>}
        </div>
      </div>
    </>
  );
}

function YardScene({ state: s }: { state: EscapeState }) {
  return (
    <>
      <PlanGrid plan={s.plan}>
        {s.beams.map((beam, i) => (
          <BeamCone
            key={`beam_${i}`}
            plan={s.plan}
            x={beam.x}
            y={beam.y}
            angle={beam.angle}
            half={beam.half}
            range={beam.range}
          />
        ))}
        <Token plan={s.plan} x={s.breach.x} y={s.breach.y} className="plan-loot">🕳️</Token>
        {s.guards.map((guard) => (
          <Token key={guard.id} plan={s.plan} x={guard.mover.x} y={guard.mover.y} className="plan-occupant">
            {guard.emoji}
          </Token>
        ))}
        <Token
          plan={s.plan}
          x={s.player.x}
          y={s.player.y}
          className={s.hidden ? 'plan-player plan-hidden' : 'plan-player'}
        >
          {s.hidden ? '🫥' : '🥷'}
        </Token>
      </PlanGrid>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>
            {s.spotted ? 'on te voit' : s.hidden ? 'à couvert' : 'à découvert'}
          </span>
          <span>appel dans {Math.max(0, (s.limit - s.elapsed) / 1000).toFixed(0)} s</span>
        </div>
        <GameGauge label="Vigilance" value={s.alert} danger={70} hidden={!s.insight} />
      </div>
    </>
  );
}

function ChaseScene({ state: s }: { state: ChaseState }) {
  const closest = s.pursuers.length === 0 ? 99 : Math.min(
    ...s.pursuers.map((p) => Math.hypot(p.mover.x - s.player.x, p.mover.y - s.player.y)),
  );

  return (
    <>
      <PlanGrid plan={s.plan}>
        {s.exits.map((exit, i) => (
          <Token key={`exit_${i}`} plan={s.plan} x={exit.x} y={exit.y} className="plan-loot">🌲</Token>
        ))}
        {s.pursuers.map((p) => (
          <Token key={p.id} plan={s.plan} x={p.mover.x} y={p.mover.y} className="plan-occupant">
            {p.emoji}
          </Token>
        ))}
        <Token plan={s.plan} x={s.player.x} y={s.player.y} className="plan-player">🏃</Token>
      </PlanGrid>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>{closest < 2 ? 'ils sont sur toi' : closest < 5 ? 'ils sont proches' : 'tu prends de l’avance'}</span>
          <span>{Math.max(0, (s.limit - s.elapsed) / 1000).toFixed(0)} s</span>
        </div>
        <GameGauge label="Souffle" value={s.stamina} danger={70} low />
      </div>
    </>
  );
}
