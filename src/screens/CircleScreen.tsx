/**
 * Écran « Le cercle ».
 *
 * Ce que l'écran doit rendre lisible, faute de quoi le système se réduit à
 * regarder des nombres bouger :
 *
 * 1. **ce que le cercle est en train de devenir**, sur les deux versants que le
 *    joueur ne règle pas — et **de combien ils vont dériver cette année**. Sans
 *    ce chiffre annoncé d'avance, on ne peut pas décider si l'on paie pour les
 *    ramener ;
 * 2. **ce que la taille autorise encore comme autorité.** La jauge de main
 *    porte son plafond : c'est là que la thèse du système se lit sans qu'on ait
 *    à l'écrire — plus il y a de monde, moins il y a de plafond ;
 * 3. **ce que chaque geste coûte**, en clair et avant de le faire. Aucun n'est
 *    gratuit, et l'écran le dit dans la même ligne que ce qu'il rapporte.
 */

import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { CALLS, CARES, GESTURES, getCall } from '../data/circle.ts';
import type { Care } from '../data/circle.ts';
import {
  ceilingNow, circleOf, contributions, drawFromPurse, driftOf, found,
  foundBlocker, gesture, gestureBlocker, growthOf, holdLine, holds, leave,
  setCare, setupCost, shapeLine,
} from '../systems/circle.ts';

export function CircleScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const c = circleOf(state);
  const call = getCall(c?.callId);

  if (!c || !call) {
    return (
      <Sheet title="Fonder quelque chose" onBack={onBack}>
        <Card pad>
          <p className="small muted" style={{ margin: 0, lineHeight: 1.55 }}>
            Des gens se rassemblent autour de ce que tu as dit. Ce n’est ni un
            public ni un électorat : ils viennent. Et ce qui arrivera ensuite ne
            dépendra plus tout à fait de toi.
          </p>
        </Card>
        <Section title="Autour de quoi" sub={`Il faut un lieu : ${money(state, setupCost(state))}.`}>
          <Card>
            {CALLS.map((one) => {
              const why = foundBlocker(state, one.id);
              return (
                <Row
                  key={one.id}
                  emoji={one.emoji}
                  title={one.label}
                  sub={one.line}
                  closed={Boolean(why)}
                  because={why}
                  onClick={() => run((ctx) => found(ctx, one.id), one.emoji)}
                  chevron={!why}
                />
              );
            })}
          </Card>
        </Section>
      </Sheet>
    );
  }

  const drift = driftOf(state);
  const growth = growthOf(state);
  const ceiling = ceilingNow(state);
  const purse = Math.round(c.purse);

  return (
    <Sheet title={call.label} onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <div className="row-title">{call.emoji} {c.people} personne{c.people > 1 ? 's' : ''}</div>
            <div className="row-sub">depuis {state.year - c.since} an(s)</div>
          </div>
          <strong style={{ color: growth >= 0 ? 'var(--good)' : 'var(--bad)' }}>
            {growth >= 0 ? '+' : ''}{growth} cette année
          </strong>
        </div>
        <p className="small" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
          {shapeLine(state)}
        </p>
      </Card>

      {/* ---- Les deux versants, et ce qu'ils vont faire tout seuls ---- */}
      <Section
        title="Ce que ça devient"
        sub="Tu ne règles pas ces deux-là. Ils montent, et tu peux payer pour les ramener."
      >
        <Card>
          <div className="card-pad">
            <div className="spread small muted">
              <span>Replié sur lui-même</span>
              <span>{Math.round(c.inward)} · +{drift.inward} cette année</span>
            </div>
            <Meter value={c.inward} tone={c.inward > 70 ? 'bad' : undefined} />
            <div className="spread small muted" style={{ marginTop: 10 }}>
              <span>Ardent</span>
              <span>{Math.round(c.fervour)} · +{drift.fervour} cette année</span>
            </div>
            <Meter value={c.fervour} tone={c.fervour > 70 ? 'bad' : undefined} />
            <div className="spread small muted" style={{ marginTop: 10 }}>
              <span>Ce que le dehors en pense</span>
              <span>{Math.round(c.regard)}</span>
            </div>
            <Meter value={c.regard} tone={c.regard < 30 ? 'bad' : 'good'} />
          </div>
        </Card>
      </Section>

      {/* ---- La main, avec son plafond : la thèse du système ---- */}
      <Section title="Ce qu’on te laisse décider">
        <Card>
          <div className="card-pad">
            <div className="spread small muted">
              <span>La main</span>
              <span>{Math.round(c.hold)} · la taille en autorise {Math.round(ceiling)}</span>
            </div>
            <Meter value={c.hold} tone={holds(state) ? undefined : 'bad'} />
            <p className="small" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
              {holdLine(state)}
            </p>
            <p className="small muted" style={{ margin: '8px 0 0', lineHeight: 1.55 }}>
              Plus il y a de monde, moins il y a de plafond. Ce n’est pas une
              question de bien s’y prendre.
            </p>
          </div>
        </Card>
      </Section>

      <Section title="Ce que tu y mets">
        <Card>
          {(Object.keys(CARES) as Care[]).map((key) => (
            <Row
              key={key}
              emoji={key === 'absent' ? '🚶' : key === 'présent' ? '🚪' : '🏠'}
              title={CARES[key].label}
              sub={CARES[key].line}
              badge={c.care === key ? <Pill tone="primary">choisi</Pill> : undefined}
              onClick={() => run((ctx) => setCare(ctx, key), '🏠')}
              chevron
            />
          ))}
        </Card>
      </Section>

      <Section
        title="Un geste par an"
        sub="Chacun rend un versant et en abîme un autre. Aucun n’est gratuit."
      >
        <Card>
          {GESTURES.map((g) => {
            const why = gestureBlocker(state, g.id);
            return (
              <Row
                key={g.id}
                emoji={g.emoji}
                title={g.label}
                sub={g.line}
                right={
                  <span className="small muted">
                    −{Math.round(g.leaves * 100)} % de monde
                  </span>
                }
                closed={Boolean(why)}
                because={why}
                onClick={() => run((ctx) => gesture(ctx, g.id), g.emoji)}
                chevron={!why}
              />
            );
          })}
        </Card>
      </Section>

      <Section title="La caisse" sub={`Ce qu’on y laisse cette année : ${money(state, contributions(state))}.`}>
        {purse <= 0 ? (
          <Empty>Il n’y a rien dedans.</Empty>
        ) : (
          <Card>
            <Row
              emoji="🫙"
              title="Prendre le quart"
              sub="Personne ne dira rien. Tout le monde verra."
              right={money(state, Math.round(purse / 4))}
              onClick={() => run((ctx) => drawFromPurse(ctx, Math.round(purse / 4)), '🫙')}
              chevron
            />
            <Row
              emoji="🪣"
              title="Tout prendre"
              sub="Cela ne restera pas entre vous."
              right={money(state, purse)}
              onClick={() => run((ctx) => drawFromPurse(ctx, purse), '🪣')}
              chevron
            />
          </Card>
        )}
      </Section>

      <Section title="S’en aller">
        <Card>
          <Row
            emoji="🚪"
            title="Quitter le cercle"
            sub="Il continuera sans toi. C’est bien ce que tu avais fait."
            onClick={() => run((ctx) => leave(ctx), '🚪')}
            chevron
          />
        </Card>
      </Section>
    </Sheet>
  );
}
