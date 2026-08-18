/**
 * Écran « Sortir ensemble ».
 *
 * Avant, séduire quelqu'un était un compteur : trois clics par an sur
 * « discuter », puis un tirage. Mesuré : neuf gestes en moyenne d'inconnu à
 * couple, et des partenaires loyaux à 46 % — le hasard exact. Le joueur ne
 * choisissait personne.
 *
 * Ici une soirée est une suite de moments où l'on répond quelque chose. Ce
 * qu'on dit s'adresse à un trait ; ce qui touche juste dépend de qui est en
 * face, qu'on ne connaît pas encore. La réaction se lit après coup — d'autant
 * mieux qu'on sait parler — et ce qu'on a mis à l'épreuve, on l'apprend.
 *
 * C'est donc le même jeu que la table : décider avec ce qu'on vient de voir,
 * plutôt qu'au jugé.
 */

import { useState } from 'react';
import { Button, Card, Empty, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money } from '../ui/format.ts';
import { de } from '../data/names.ts';
import {
  TRAIT_LABEL, dateBlocker, knows, placeCost, placesFor, reaction, readsWell,
  sceneFor, settleDate, traitWord, type TraitId,
} from '../systems/dates.ts';

export function DateScreen({ personId, onBack }: { personId: string; onBack: () => void }) {
  const { state, run } = useGame();
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<TraitId[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  if (!state) return null;
  const person = state.npcs[personId];
  if (!person) return null;

  /* -------------------------------------------------------------- */
  /* Où aller                                                        */
  /* -------------------------------------------------------------- */

  if (!placeId) {
    const places = placesFor(state);
    return (
      <Sheet title={`Sortir avec ${person.firstName}`} onBack={onBack}>
        <Card pad>
          <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
            Où tu l’emmènes est déjà une question posée : un endroit s’adresse
            à quelque chose chez quelqu’un. Si tu vises juste, la soirée
            s’ouvre — et tu sauras quelque chose de {person.firstName} que tu
            ne savais pas.
          </p>
          <div className="chips" style={{ marginTop: 12 }}>
            <Pill tone="primary">Relation {Math.round(person.relationship)}</Pill>
            <Pill>{readsWell(state) ? 'Tu lis bien les gens' : 'Tu lis mal les gens'}</Pill>
          </div>
        </Card>

        <Section title="Où l’emmener">
          {places.length === 0 ? (
            <Empty>Rien d’ouvert à ton âge.</Empty>
          ) : (
            <Card>
              {places.map((place) => {
                const why = dateBlocker(state, person, place.id);
                return (
                  <Row
                    key={place.id}
                    emoji={place.emoji}
                    title={place.label}
                    sub={why ?? `${place.note} · ${place.beats} moments`}
                    right={
                      <Pill tone={knows(person, place.appeals) ? 'primary' : undefined}>
                        {place.cost === 0 ? 'gratuit' : money(state, placeCost(state, place))}
                      </Pill>
                    }
                    disabled={Boolean(why)}
                    onClick={why ? undefined : () => { setPlaceId(place.id); setStep(0); setPicks([]); }}
                    chevron={!why}
                  />
                );
              })}
            </Card>
          )}
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Un endroit surligné s’adresse à quelque chose que tu connais déjà
            chez {person.firstName}. Les autres sont un pari.
          </p>
        </Section>
      </Sheet>
    );
  }

  /* -------------------------------------------------------------- */
  /* La soirée                                                       */
  /* -------------------------------------------------------------- */

  const beats = sceneFor(state, person, placeId);
  const beat = beats[step];

  // Plus de moments : on rentre, et l'on fait les comptes une seule fois.
  if (!beat) {
    return (
      <Sheet title="Rentrer" onBack={onBack}>
        <Card pad>
          <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
            La soirée est finie. Ce que tu as mis à l’épreuve ce soir, tu vas
            le savoir.
          </p>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Button
              onClick={() => {
                run((ctx) => settleDate(ctx, personId, placeId, picks), avatarFor(person));
                onBack();
              }}
            >
              Rentrer
            </Button>
          </div>
        </Card>
      </Sheet>
    );
  }

  return (
    <Sheet title={`${person.firstName}`} onBack={onBack}>
      <Card pad>
        <div className="chips">
          <Pill>Moment {step + 1} / {beats.length}</Pill>
          {picks.map((t, i) => (
            <Pill key={`${t}-${i}`}>{TRAIT_LABEL[t]}</Pill>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', lineHeight: 1.6 }}>{beat.scene}</p>
      </Card>

      {said === null ? (
        <Section title="Ce que tu réponds">
          <Card>
            {beat.replies.map((reply) => (
              <Row
                key={reply.appeals}
                emoji={knows(person, reply.appeals) ? '💡' : '💬'}
                title={reply.text}
                // Une ligne ne porte une note que si elle en a une à porter :
                // la même phrase répétée sous trois réponses n'informait de
                // rien et faisait passer les trois pour équivalentes.
                sub={knows(person, reply.appeals)
                  ? `Tu sais que c’est ${traitWord(person, reply.appeals)}.`
                  : undefined}
                onClick={() => {
                  setSaid(reaction(state, person, reply.appeals));
                  setPicks([...picks, reply.appeals]);
                }}
                chevron
              />
            ))}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            {beat.replies.every((reply) => !knows(person, reply.appeals))
              ? `Tu ne sais encore rien ${de(person.firstName)} : ces trois réponses sont trois paris.`
              : `Une ampoule marque ce que tu sais déjà ${de(person.firstName)}.`}
          </p>
        </Section>
      ) : (
        <Section title="Ce qui se passe">
          <Card pad>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{said}</p>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <Button onClick={() => { setSaid(null); setStep(step + 1); }}>
                {step + 1 < beats.length ? 'La suite' : 'Fin de soirée'}
              </Button>
            </div>
          </Card>
        </Section>
      )}
    </Sheet>
  );
}
