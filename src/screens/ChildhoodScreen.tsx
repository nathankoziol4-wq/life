/**
 * L'enfance, vue de l'intérieur.
 *
 * Un enfant de sept ans n'avait rien à faire de ses journées : la famille
 * existait comme décor et comme source de statistiques, jamais comme quelque
 * chose avec quoi on fait des choses.
 *
 * L'écran répond à deux questions : **avec qui** et **quoi**. Dans cet ordre,
 * parce que c'est l'accompagnant qui décide de ce que le moment vaudra — un
 * parent qui n'est jamais là ne transformera pas une après-midi en souvenir,
 * et l'écran ne le cache pas.
 */

import { useState } from 'react';
import {
  Empty, Gauge, Pill, Sheet,
} from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money } from '../ui/format.ts';
import { FAMILY_ACTIVITIES, type FamilyActivity } from '../data/childhood.ts';
import {
  activityBlocker, activityCost, companionsFor, doFamilyActivity, engagementOf,
  meetNeighbourBlocker, meetNeighbourChild, neighbourhoodFriends,
} from '../systems/childhood.ts';

export function ChildhoodScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [chosen, setChosen] = useState<FamilyActivity | null>(null);
  if (!state) return null;

  const p = state.player;
  const pals = neighbourhoodFriends(state);
  const outside = meetNeighbourBlocker(state);

  /* --- Choisir avec qui --- */
  if (chosen) {
    const companions = companionsFor(state, chosen);
    return (
      <Sheet title={chosen.label} onBack={() => setChosen(null)}>
        <Card pad>
          <div className="row-title">{chosen.emoji} {chosen.label}</div>
          <p className="small muted" style={{ margin: '6px 0 0', lineHeight: 1.55 }}>
            {chosen.hint}.
          </p>
        </Card>
        <Section title="Avec qui">
          {companions.length === 0 ? (
            <Empty>Il n’y a personne pour ça.</Empty>
          ) : (
            <Card>
              {companions.map((companion) => {
                const engagement = engagementOf(state, companion);
                return (
                  <Row
                    key={companion.id}
                    emoji={avatarFor(companion)}
                    title={companion.firstName}
                    sub={engagement > 0.65 ? 'Il a toujours le temps pour ça'
                      : engagement > 0.4 ? 'Ça dépend des jours'
                        : 'Il dira sûrement oui, sans plus'}
                    right={<Gauge value={engagement * 100} />}
                    onClick={() => {
                      const activity = chosen;
                      setChosen(null);
                      run(
                        (ctx) => doFamilyActivity(ctx, activity.id, companion.id),
                        activity.emoji,
                      );
                    }}
                    chevron
                  />
                );
              })}
            </Card>
          )}
        </Section>
        <p className="small muted" style={{ margin: '10px 4px 0', lineHeight: 1.55 }}>
          La barre dit ce que la personne met dans ce genre de moment. Ce n’est
          pas de l’amour — c’est du temps, de la patience, et le fait d’être là
          pour de vrai.
        </p>
      </Sheet>
    );
  }

  /* --- Le menu --- */
  const activities = FAMILY_ACTIVITIES.filter((a) => p.age >= a.minAge && p.age <= a.maxAge);

  return (
    <Sheet title="À la maison" onBack={onBack}>
      <Card pad>
        <p style={{ margin: 0, lineHeight: 1.55 }}>
          Ce que tu fais maintenant ne se verra pas maintenant. Une après-midi à
          bricoler à sept ans devient un goût, puis parfois un métier.
        </p>
      </Card>

      <Section title="Dehors">
        <Card>
          <Row
            emoji="🚲"
            title="Sortir voir qui est là"
            sub="Les enfants du quartier, s’il y en a"
            because={outside}
            right={pals.length > 0 ? <Pill tone="good">{pals.length} ami(s)</Pill> : undefined}
            closed={Boolean(outside)}
            onClick={() => run((ctx) => meetNeighbourChild(ctx), '🚲')}
            chevron={!outside}
          />
        </Card>
        {pals.length > 0 && (
          <Card>
            {pals.map((pal) => (
              <Row
                key={pal.id}
                emoji={avatarFor(pal)}
                title={pal.firstName}
                sub={`${pal.age} ans · du quartier`}
                right={<Gauge value={pal.relationship} />}
              />
            ))}
          </Card>
        )}
      </Section>

      <Section title={`Ensemble (${activities.length})`}>
        {activities.length === 0 ? (
          <Empty>Ce n’est plus vraiment de ton âge.</Empty>
        ) : (
          <Card>
            {activities.map((activity) => {
              const blocker = activityBlocker(state, activity);
              const cost = activityCost(state, activity);
              return (
                <Row
                  key={activity.id}
                  emoji={activity.emoji}
                  title={activity.label}
                  sub={activity.hint}
                  because={blocker}
                  right={cost > 0 ? <Pill>{money(state, cost)}</Pill> : undefined}
                  closed={Boolean(blocker)}
                  onClick={() => setChosen(activity)}
                  chevron={!blocker}
                />
              );
            })}
          </Card>
        )}
      </Section>
    </Sheet>
  );
}
