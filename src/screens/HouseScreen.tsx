/**
 * Écran « La maison ».
 *
 * Il n'existait pas : arriver au rang de patron ne changeait rien à ce qu'on
 * faisait — on recevait toujours des missions de personne, et on les faisait
 * soi-même.
 *
 * Ce que l'écran doit rendre lisible, c'est que **diriger, c'est placer des
 * gens** et qu'on n'a pas assez de monde. D'où l'ordre :
 *
 * 1. **les trois postes**, avec qui les tient et ce que valent ces gens à cet
 *    endroit-là — les trois ne demandent pas les mêmes qualités ;
 * 2. **ce qu'on leur laisse**, qui est le second dial et qui contredit le
 *    premier ;
 * 3. **les gens**, avec ce qu'ils ont contre toi — parce que celui qu'on ne
 *    place pas est celui qui finira par se lever, et qu'il faut pouvoir le
 *    voir venir.
 *
 * Un poste vide n'est pas une erreur d'interface : c'est une décision, et
 * l'écran dit ce qu'elle coûte plutôt que de la signaler comme un oubli.
 */

import { useState } from 'react';
import { Empty, Gauge, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { CUTS, POSTS } from '../data/house.ts';
import {
  assign, buyPeace, challenger, crew, cutOf, faceDown, fitFor, grudgeOf,
  grudgeSays, holderOf, houseBlocker, peacePrice, setCut, takeOf, yoursOf,
} from '../systems/house.ts';
import { orgOf } from '../systems/underworld.ts';

export function HouseScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [filling, setFilling] = useState<string | null>(null);
  if (!state) return null;
  const org = orgOf(state);
  const why = houseBlocker(state);

  if (why || !org) {
    return (
      <Sheet title="La maison" onBack={onBack}>
        <Empty>{why ?? 'Tu n’es d’aucune maison.'}</Empty>
      </Sheet>
    );
  }

  const people = crew(state);
  const rebel = challenger(state);

  /* Choisir qui tient un poste. */
  if (filling) {
    const post = POSTS.find((p) => p.id === filling)!;
    return (
      <Sheet title={post.label} onBack={() => setFilling(null)}>
        <Card pad>
          <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>{post.line}</p>
        </Card>
        <Section title="Qui s’en occupe">
          <Card>
            <Row
              emoji="🚫"
              title="Personne"
              sub={post.neglect}
              onClick={() => { run((ctx) => assign(ctx, post.id, null), '🚫'); setFilling(null); }}
              chevron
            />
            {people.map((person) => (
              <Row
                key={person.id}
                emoji="🧍"
                title={`${person.firstName} ${person.lastName}`}
                sub={`${grudgeSays(person)}`}
                right={<Pill tone="primary">{Math.round(fitFor(person, post.id))}</Pill>}
                onClick={() => { run((ctx) => assign(ctx, post.id, person.id), '🧍'); setFilling(null); }}
                chevron
              />
            ))}
          </Card>
          {people.length === 0 && <Empty>Tu n’as personne sous la main.</Empty>}
        </Section>
      </Sheet>
    );
  }

  return (
    <Sheet title="La maison" onBack={onBack}>
      <Card pad>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}>{org.name}</div>
        <div className="row-sub">Face à {org.rival}</div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone="primary">{Math.round(org.territory)} d’emprise</Pill>
          <Pill>{money(state, takeOf(state))}/an</Pill>
          <Pill tone="good">{money(state, yoursOf(state))} pour toi</Pill>
        </div>
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          Tu as trois choses à tenir et moins de monde qu’il n’en faudrait.
          Ce que tu laisses vide se paiera exactement là.
        </p>
      </Card>

      {rebel && (
        <Section title="Quelqu’un conteste ta place">
          <Card>
            <Row
              emoji="🔥"
              title={`${rebel.firstName} ${rebel.lastName}`}
              sub={grudgeSays(rebel)}
              right={<Gauge value={grudgeOf(rebel)} />}
            />
            <Row
              emoji="💵"
              title="Acheter sa paix"
              sub="Il reprend sa place. Il se souviendra du prix."
              right={money(state, peacePrice(state))}
              closed={state.player.money < peacePrice(state)}
              because="Tu n’as pas de quoi."
              onClick={() => run((ctx) => buyPeace(ctx), '💵')}
              chevron
            />
            <Row
              emoji="🪑"
              title="Lui tenir tête"
              sub="Ce qui décide n’est pas ce que tu vaux, mais qui te suit encore"
              onClick={() => run((ctx) => faceDown(ctx), '🪑')}
              chevron
            />
          </Card>
        </Section>
      )}

      <Section title="Ce qu’il y a à tenir">
        <Card>
          {POSTS.map((post) => {
            const holder = holderOf(state, post.id);
            return (
              <Row
                key={post.id}
                emoji={post.emoji}
                title={post.label}
                sub={holder
                  ? `${holder.firstName} — il vaut ${Math.round(fitFor(holder, post.id))} pour ça`
                  : post.neglect}
                badge={holder ? undefined : <Pill tone="warn">vide</Pill>}
                onClick={() => setFilling(post.id)}
                chevron
              />
            );
          })}
        </Card>
      </Section>

      <Section title="Ce que tu leur laisses" sub="Une part large achète la paix et vide la caisse.">
        <Card>
          {CUTS.map((cut) => (
            <Row
              key={cut.id}
              emoji={cut.emoji}
              title={cut.label}
              sub={cut.line}
              right={`${Math.round(cut.share * 100)} %`}
              badge={cutOf(state) === cut.id ? <Pill tone="primary">choisi</Pill> : undefined}
              onClick={() => run((ctx) => setCut(ctx, cut.id), cut.emoji)}
              chevron
            />
          ))}
        </Card>
      </Section>

      <Section title={`Tes gens (${people.length})`}>
        {people.length === 0 ? (
          <Empty>Personne encore. Une maison sans personne se tient mal.</Empty>
        ) : (
          <Card>
            {people.map((person) => {
              const post = POSTS.find((p) => holderOf(state, p.id)?.id === person.id);
              return (
                <Row
                  key={person.id}
                  emoji={post ? post.emoji : '🧍'}
                  title={`${person.firstName} ${person.lastName}`}
                  sub={post ? `${post.label} · ${grudgeSays(person)}` : grudgeSays(person)}
                  right={<Gauge value={grudgeOf(person)} />}
                />
              );
            })}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Celui qu’on ne place jamais finit par s’en souvenir, et d’autant plus
          vite qu’il se croit capable.
        </p>
      </Section>
    </Sheet>
  );
}
