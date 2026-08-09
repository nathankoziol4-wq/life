/**
 * Trajectoire : pourquoi ce personnage est devenu celui-là.
 *
 * C'est l'outil demandé au §64, et il n'est pas décoratif : le jeu affirme
 * qu'une vie s'explique par un enchaînement de causes, et cet écran est le
 * seul endroit où cette affirmation devient vérifiable. On y répond à des
 * questions du type « pourquoi aime-t-il l'informatique ? » ou « pourquoi sa
 * confiance est-elle basse ? » avec des causes datées, jamais avec un chiffre.
 *
 * Rien n'est recalculé pour l'occasion : l'écran lit le registre de causalité
 * alimenté par les systèmes eux-mêmes, et l'exposition telle que le moteur la
 * voit cette année. Ce qui est montré ici est exactement ce qui a agi.
 */

import { useMemo, useState } from 'react';
import { Card, Empty, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import {
  causesOf, explainTrajectory, humanTarget, knownTargets, lifeInfluences,
  strengthLabel,
} from '../systems/causality.ts';
import { exposureSignals, exposureTo } from '../systems/exposure.ts';
import { INTEREST_MAP } from '../data/interests.ts';
import { FEAR_MAP } from '../data/fears.ts';
import { HABIT_MAP } from '../data/habits.ts';
import { AMBITION_MAP } from '../data/ambitions.ts';
import { AXIS_INFO } from '../engine/psyche.ts';
import { axisReading, strongestAxes } from '../components/PersonalityPanel.tsx';

/** Une cause affichée : l'âge, le fait, l'intensité en mots. */
function Cause({ age, text, label }: { age: number; text: string; label: string }) {
  return (
    <div className="cause">
      <div className="cause-age">{age} ans</div>
      <div className="cause-body">
        <div className="cause-text">{text}</div>
        <div className="cause-label">{label}</div>
      </div>
    </div>
  );
}

/** Libellé lisible d'une cible du registre. */
function targetLabel(target: string): string {
  const [kind, id] = target.split(':');
  switch (kind) {
    case 'intérêt': return `${INTEREST_MAP[id]?.emoji ?? '✨'} ${INTEREST_MAP[id]?.label ?? id}`;
    case 'peur': return `${FEAR_MAP[id]?.emoji ?? '😨'} ${FEAR_MAP[id]?.label ?? id}`;
    case 'habitude': return `${HABIT_MAP[id]?.emoji ?? '🔁'} ${HABIT_MAP[id]?.label ?? id}`;
    case 'ambition': return `${AMBITION_MAP[id]?.emoji ?? '🎯'} ${AMBITION_MAP[id]?.label ?? id}`;
    case 'personnalité': return '🧠 Son caractère';
    case 'lieu': return '📍 L’endroit où il vit';
    default: return target;
  }
}

export function TrajectoryScreen({ onBack }: { onBack: () => void }) {
  const { state } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const signals = useMemo(() => (state ? exposureSignals(state) : {}), [state]);
  if (!state) return null;

  const psyche = state.player.psyche;
  const influences = lifeInfluences(state, 14);
  const questions = knownTargets(state)
    .map((target) => ({ target, causes: causesOf(state, target).length }))
    .filter((q) => q.causes > 0);
  const detail = open ? explainTrajectory(state, open) : null;

  // L'exposition actuelle du goût ouvert : ce que la vie met à sa portée en ce
  // moment, indépendamment de ce qui s'est déjà passé.
  const openInterest = open?.startsWith('intérêt:') ? open.slice('intérêt:'.length) : null;
  const exposure = openInterest ? exposureTo(signals, openInterest) : null;

  return (
    <Sheet title="Trajectoire" onBack={onBack}>
      <Card pad>
        <p style={{ margin: 0, lineHeight: 1.55 }}>
          Rien de ce que ce personnage est n’a été décidé d’un coup. Chaque goût,
          chaque peur, chaque ambition vient de quelque chose. Voici de quoi.
        </p>
      </Card>

      <Section title="Ce qui a le plus pesé">
        {influences.length === 0 ? (
          <Empty>Trop tôt : cette vie n’a pas encore d’histoire.</Empty>
        ) : (
          <Card>
            {influences.map((effect, i) => (
              <Cause
                key={`${effect.target}_${effect.age}_${i}`}
                age={effect.age}
                text={effect.reason || effect.source}
                label={`${strengthLabel(effect.strength)} · ${targetLabel(effect.target)}`}
              />
            ))}
          </Card>
        )}
      </Section>

      <Section title="Poser une question">
        {questions.length === 0 ? (
          <Empty>Aucune chaîne de causalité enregistrée pour l’instant.</Empty>
        ) : (
          <Card>
            {questions.map(({ target, causes }) => (
              <Row
                key={target}
                title={humanTarget(target)}
                sub={`${causes} cause${causes > 1 ? 's' : ''}`}
                right={open === target ? <Pill tone="primary">Ouvert</Pill> : undefined}
                onClick={() => setOpen(open === target ? null : target)}
                chevron
              />
            ))}
          </Card>
        )}
      </Section>

      {detail && (
        <Section title={detail.title}>
          {detail.lines.length === 0 ? (
            <Empty>Rien d’enregistré : c’est arrivé sans cause identifiable.</Empty>
          ) : (
            <Card>
              {detail.lines.map((line, i) => (
                <Cause key={`${line.age}_${i}`} age={line.age} text={line.text} label={line.label} />
              ))}
            </Card>
          )}

          {exposure && exposure.terms.length > 0 && (
            <>
              <p className="small muted" style={{ margin: '12px 4px 6px' }}>
                Et aujourd’hui encore, voici ce qui l’y expose :
              </p>
              <Card>
                {exposure.terms.slice(0, 8).map((term) => (
                  <Row
                    key={term.label}
                    emoji="•"
                    title={term.label}
                    right={<span className="small muted">{strengthLabel(term.strength)}</span>}
                  />
                ))}
              </Card>
            </>
          )}
        </Section>
      )}

      <Section title="Où il en est">
        <Card>
          {strongestAxes(psyche, 6).map(({ key, value }) => (
            <Row
              key={key}
              title={AXIS_INFO[key].label}
              sub={axisReading(key, value)}
              right={<span className="small muted">{value > 50 ? 'marqué' : 'peu présent'}</span>}
            />
          ))}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Ces traits ne sont pas des récompenses : ils viennent de ce qui est
          arrivé, et ils coûtent autant qu’ils rapportent.
        </p>
      </Section>
    </Sheet>
  );
}
