/**
 * Écran « Donner ».
 *
 * Il n'existait pas : on pouvait acheter, vendre, perdre et léguer en
 * mourant, mais rien passer à personne de son vivant.
 *
 * Ce que l'écran doit rendre lisible tient en une phrase : **un cadeau ne
 * vaut pas ce qu'il coûte.** D'où la ligne qui accompagne chaque choix — ce
 * que ça vaudrait *pour cette personne-là*, qui n'est pas le prix. Sans elle,
 * le joueur choisirait par le montant et le système entier serait invisible.
 *
 * Un seul flux : on choisit qui, puis quoi. Le joueur pense « je veux donner
 * quelque chose à mon fils », pas « quel sous-système ».
 */

import { useState } from 'react';
import { Empty, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { RELATION_LABELS } from '../engine/context.ts';
import { PURSES, TRUSTED_AGE } from '../data/giving.ts';
import {
  giveMoney, giveThing, givables, purseValue, worthSays,
} from '../systems/giving.ts';

export function GivingScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [who, setWho] = useState<string | null>(null);
  if (!state) return null;

  const people = Object.values(state.npcs)
    .filter((n) => n.alive && !n.petSpecies)
    .sort((a, b) => b.relationship - a.relationship)
    .slice(0, 24);

  if (!who) {
    return (
      <Sheet title="Donner" onBack={onBack}>
        <Card pad>
          <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
            Ce que tu donnes ne vaut pas ce que ça t’a coûté : ça vaut ce que
            la personne en fera. Le même geste ne dit pas la même chose selon
            à qui il s’adresse.
          </p>
        </Card>
        <Section title="À qui">
          {people.length === 0 ? (
            <Empty>Tu ne connais personne.</Empty>
          ) : (
            <Card>
              {people.map((person) => (
                <Row
                  key={person.id}
                  emoji="🧍"
                  title={`${person.firstName} ${person.lastName}`}
                  sub={`${RELATION_LABELS[person.relation]} · lien ${Math.round(person.relationship)}`}
                  right={<Pill>{money(state, person.wealth)}</Pill>}
                  onClick={() => setWho(person.id)}
                  chevron
                />
              ))}
            </Card>
          )}
        </Section>
      </Sheet>
    );
  }

  const target = state.npcs[who];
  if (!target) return null;
  const things = givables(state);

  return (
    <Sheet title={`Donner à ${target.firstName}`} onBack={() => setWho(null)}>
      <Card pad>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}>
          {target.firstName} {target.lastName}
        </div>
        <div className="row-sub">{RELATION_LABELS[target.relation]}</div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill>il a {money(state, target.wealth)}</Pill>
          <Pill tone="primary">tu as {money(state, state.player.money)}</Pill>
        </div>
      </Card>

      <Section title="De l’argent">
        <Card>
          {PURSES.map((purse) => {
            const amount = purseValue(state, purse.id);
            return (
              <Row
                key={purse.id}
                emoji={purse.emoji}
                title={purse.label}
                /* Ce que ça vaut pour lui, qui n'est pas le prix. */
                sub={`${purse.line} — ${worthSays(state, target, amount)}`}
                right={money(state, amount)}
                closed={amount <= 0}
                because="Tu n’as rien à donner."
                onClick={() => run((ctx) => giveMoney(ctx, target.id, purse.id), purse.emoji)}
                chevron={amount > 0}
              />
            );
          })}
        </Card>
      </Section>

      <Section title="Quelque chose à toi">
        {things.length === 0 ? (
          <Empty>Tu ne possèdes rien qui puisse changer de mains.</Empty>
        ) : (
          <Card>
            {things.map((thing) => {
              const tooYoung = target.age < TRUSTED_AGE;
              const why = thing.blocked ?? (tooYoung ? 'Il est trop jeune pour qu’on lui confie ça.' : null);
              return (
                <Row
                  key={thing.id}
                  emoji={thing.emoji}
                  title={thing.label}
                  sub={why ?? worthSays(state, target, thing.value)}
                  right={money(state, thing.value)}
                  closed={Boolean(why)}
                  because={why}
                  onClick={() => run((ctx) => giveThing(ctx, target.id, thing.id), thing.emoji)}
                  chevron={!why}
                />
              );
            })}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          On ne donne pas un bien sur lequel on doit encore, ni le toit sous
          lequel on dort. Les objets de famille se donnent depuis leur propre
          page : ce qui compte pour eux est leur âge, pas leur prix.
        </p>
      </Section>
    </Sheet>
  );
}
