/**
 * Écran « La noce ».
 *
 * Il n'existait pas : une demande acceptée mariait dans la seconde, prenait
 * trente-cinq pour cent de l'argent et donnait vingt-deux points de bonheur.
 *
 * L'écran doit rendre visibles les trois côtés de l'arbitrage **en même
 * temps**, sans quoi ce serait trois listes de courses posées côte à côte :
 *
 * 1. **ce que ça coûte**, recalculé à chaque changement — le repas se paie par
 *    tête, donc inviter et bien recevoir se disputent la même somme ;
 * 2. **combien de places il reste**, parce que le lieu en borne le nombre ;
 * 3. **combien de proches resteraient dehors**, qui est le seul chiffre que le
 *    joueur ne penserait pas à calculer et le seul qui rende la mairie à
 *    quatre places autre chose qu'une bonne affaire.
 *
 * Les trois sont dans le même bandeau, en haut, et bougent ensemble.
 */

import { Empty, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { RELATION_LABELS } from '../engine/context.ts';
import { PLANNING, SPREADS, VENUES } from '../data/wedding.ts';
import {
  betrothed, callOff, costOf, guestPool, hold, invite, inviteClosest, leftOut,
  planOf, seatsLeft, setSpread, setVenue, spreadOf, venueOf, weddingBlocker,
} from '../systems/wedding.ts';

export function WeddingScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const plan = planOf(state);
  const spouse = betrothed(state);

  if (!plan || plan.done || !spouse) {
    return (
      <Sheet title="La noce" onBack={onBack}>
        <Empty>Rien à préparer. Il faut d’abord une demande, et un oui.</Empty>
      </Sheet>
    );
  }

  const venue = venueOf(state);
  const spread = spreadOf(state);
  const cost = costOf(state);
  const seats = seatsLeft(state);
  const out = leftOut(state);
  const why = weddingBlocker(state);
  const pool = guestPool(state);

  return (
    <Sheet title="La noce" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Tu épouses {spouse.firstName}. Ce que tu dépenses ici manquera
          ailleurs — et celui que tu n’invites pas l’apprendra.
        </p>
        {/* Les trois côtés de l'arbitrage, ensemble et à jour. */}
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={cost > state.player.money ? 'bad' : 'primary'}>{money(state, cost)}</Pill>
          <Pill tone={seats > 0 ? undefined : 'warn'}>{seats} place(s) libre(s)</Pill>
          <Pill tone={out > 0 ? 'bad' : 'good'}>
            {out > 0 ? `${out} proche(s) dehors` : 'personne d’oublié'}
          </Pill>
        </div>
        {out > 0 && (
          <p className="small" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            Ceux-là remarqueront de ne pas y avoir été, et d’autant plus qu’ils
            étaient proches.
          </p>
        )}
      </Card>

      <Section title="Le lieu">
        <Card>
          {VENUES.map((v) => (
            <Row
              key={v.id}
              emoji={v.emoji}
              title={v.label}
              sub={`${v.seats} places · ${v.line}`}
              right={v.cost === 0 ? 'Gratuit' : money(state, v.cost)}
              badge={venue?.id === v.id ? <Pill tone="primary">choisi</Pill> : undefined}
              onClick={() => run((ctx) => setVenue(ctx, v.id), v.emoji)}
              chevron
            />
          ))}
        </Card>
      </Section>

      <Section title="Les tables" sub="Par tête : plus tu invites, plus cela pèse.">
        <Card>
          {SPREADS.map((s) => (
            <Row
              key={s.id}
              emoji={s.emoji}
              title={s.label}
              sub={s.line}
              right={`${money(state, s.perHead)}/pers.`}
              badge={spread?.id === s.id ? <Pill tone="primary">choisi</Pill> : undefined}
              onClick={() => run((ctx) => setSpread(ctx, s.id), s.emoji)}
              chevron
            />
          ))}
        </Card>
      </Section>

      <Section title="La liste">
        <Card>
          <Row
            emoji="✉️"
            title="Inviter au plus proche"
            sub="Remplit les places restantes en commençant par ceux qui comptent"
            closed={seats <= 0}
            because="Il n’y a plus de place."
            onClick={() => run((ctx) => inviteClosest(ctx), '✉️')}
            chevron={seats > 0}
          />
        </Card>
        {pool.length === 0 ? (
          <Empty>Tu ne connais personne à inviter.</Empty>
        ) : (
          <Card>
            {pool.slice(0, 24).map((person) => {
              const on = plan.guestIds.includes(person.id);
              return (
                <Row
                  key={person.id}
                  emoji={on ? '✅' : '·'}
                  title={`${person.firstName} ${person.lastName}`}
                  sub={`${RELATION_LABELS[person.relation]} · lien ${Math.round(person.relationship)}`}
                  badge={on ? <Pill tone="good">invité</Pill> : undefined}
                  closed={!on && seats <= 0}
                  because="Il n’y a plus de place."
                  onClick={() => run((ctx) => invite(ctx, person.id), on ? '✖️' : '✉️')}
                  chevron
                />
              );
            })}
          </Card>
        )}
      </Section>

      <Section title="Le jour">
        <Card>
          <Row
            emoji="💒"
            title={`Épouser ${spouse.firstName}`}
            sub={why ?? `${plan.guestIds.length} invité(s), ${venue?.label.toLowerCase()}`}
            right={money(state, cost)}
            closed={Boolean(why)}
            because={why}
            onClick={() => run((ctx) => hold(ctx), '💒')}
            chevron={!why}
          />
          <Row
            emoji="💔"
            title="Rompre les fiançailles"
            sub="Ce qui était réservé est perdu"
            onClick={() => run((ctx) => callOff(ctx), '💔')}
            chevron
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Une noce ne se monte pas en un jour : compte {PLANNING} an après la
          demande avant qu’elle puisse avoir lieu.
        </p>
      </Section>
    </Sheet>
  );
}
