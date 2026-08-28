/**
 * Partir avec quelqu'un.
 *
 * Trois décisions, dans cet ordre : **où**, **avec qui**, **comment**. Et une
 * lecture qui décide de tout — l'accord, qui n'est pas la relation : on peut
 * très bien aimer quelqu'un et voyager mal avec lui.
 *
 * Puis le séjour : une situation, deux façons de la prendre, et le même geste
 * ne vaut pas la même chose selon qui est en face.
 *
 * Une précaution de forme, apprise plusieurs chantiers plus tôt : un `Row`
 * fermé affiche `because` **à la place** de `sub`. La lecture ne vit donc
 * jamais dans un `sub` — elle est dans le `right`, qui survit au refus.
 */

import { useState } from 'react';
import { Empty, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money } from '../ui/format.ts';
import { DESTINATIONS } from '../data/activities.ts';
import { CLASSES, SOURS_UNDER } from '../data/trip.ts';
import {
  accordSays, accordWith, companions, departWith, momentFor, priceOf,
  settleTrip, tripBlocker,
} from '../systems/trip.ts';

export function TripScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [dest, setDest] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [cls, setCls] = useState<string>('normal');
  const [away, setAway] = useState(false);
  if (!state) return null;
  const people = companions(state);
  const destination = dest ? DESTINATIONS.find((d) => d.id === dest) : null;
  const person = who ? state.npcs[who] : null;

  /* --- Le séjour : la situation à trancher --- */
  if (away && destination && person) {
    const moment = momentFor(state, person.id, destination.id);
    return (
      <Sheet title={destination.name} onBack={() => { setAway(false); onBack(); }}>
        <Card pad>
          <div style={{ fontSize: 38, textAlign: 'center' }}>{destination.emoji}</div>
          <p style={{ margin: '10px 0 0', lineHeight: 1.55, textAlign: 'center' }}>
            {moment.brief}
          </p>
        </Card>
        <Section title="Comment tu le prends">
          <Card>
            {moment.options.map((o, i) => (
              <Row
                key={o.label}
                emoji="💬"
                title={o.label}
                sub={`Avec ${person.firstName}, ça peut tomber juste ou à côté`}
                onClick={() => {
                  run((ctx) => settleTrip(ctx, person.id, destination.id, cls, i), '💬');
                  setAway(false);
                  onBack();
                }}
                chevron
              />
            ))}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Le même geste ne vaut pas la même chose selon la personne. C’est de
            ce choix-là que la relation se souviendra.
          </p>
        </Section>
      </Sheet>
    );
  }

  /* --- Choisir la destination --- */
  if (!destination) {
    return (
      <Sheet title="Partir avec quelqu’un" onBack={onBack}>
        <p className="small muted" style={{ lineHeight: 1.5 }}>
          Un voyage est la seule chose qui prenne trois semaines avec une seule
          personne. Il ne remonte pas une relation : il la révèle.
        </p>
        <Section title="Où">
          <Card>
            {DESTINATIONS.map((d) => (
              <Row
                key={d.id}
                emoji={d.emoji}
                title={d.name}
                sub={d.description}
                right={<Pill>{money(state, d.cost * 2)}</Pill>}
                onClick={() => setDest(d.id)}
                chevron
              />
            ))}
          </Card>
        </Section>
      </Sheet>
    );
  }

  /* --- Choisir qui, puis comment --- */
  return (
    <Sheet title={destination.name} onBack={() => setDest(null)}>
      <Card pad>
        <div style={{ fontSize: 38, textAlign: 'center' }}>{destination.emoji}</div>
        <p style={{ margin: '10px 0 0', lineHeight: 1.55, textAlign: 'center' }}>
          {destination.description}
        </p>
      </Card>

      <Section title="Avec qui">
        {people.length === 0 ? (
          <Empty>Tu n’as personne à emmener.</Empty>
        ) : (
          <Card>
            {people.map((p) => {
              const accord = accordWith(p, destination.id);
              const tone = accord < SOURS_UNDER ? 'bad' : accord < 0.62 ? 'warn' : 'good';
              return (
                <Row
                  key={p.id}
                  emoji={avatarFor(p)}
                  title={`${p.firstName} ${p.lastName}`}
                  sub={`${p.relation} · relation ${Math.round(p.relationship)}`}
                  right={<Pill tone={who === p.id ? 'primary' : tone}>
                    {accordSays(accord).replace(/\.$/, '')}
                  </Pill>}
                  onClick={() => setWho(p.id)}
                  chevron
                />
              );
            })}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Ce qui est annoncé n’est pas la relation : c’est l’accord entre son
          caractère et ce voyage-là. On peut très bien aimer quelqu’un et
          voyager mal avec lui.
        </p>
      </Section>

      {person && (
        <Section title="Comment">
          <Card>
            {CLASSES.map((c) => {
              const why = tripBlocker(state, person.id, destination.id, c.id);
              return (
                <Row
                  key={c.id}
                  emoji={c.emoji}
                  title={c.label}
                  sub={c.line}
                  right={<Pill tone={c.id === 'grand' ? 'warn' : undefined}>
                    {money(state, priceOf(state, destination.id, c.id))}
                  </Pill>}
                  closed={Boolean(why)}
                  because={why}
                  onClick={() => {
                    setCls(c.id);
                    const gone = run(
                      (ctx) => departWith(ctx, person.id, destination.id, c.id),
                      c.emoji,
                    );
                    setAway(true);
                    return gone;
                  }}
                  chevron={!why}
                />
              );
            })}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            La classe achète du confort : moins d’incidents en chemin, et
            davantage de ce que le séjour rend. Elle se paie par personne.
          </p>
        </Section>
      )}
    </Sheet>
  );
}
