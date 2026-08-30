/**
 * La route : la carte, la charge, et le passage.
 *
 * Trois lectures, et elles sont tout le jeu : ce qu'une marchandise vaut
 * **ici**, ce qu'elle vaudrait **ailleurs**, et ce que porter attire
 * d'attention. Aucune n'était visible avant — `underworld.ts` ne connaissait
 * ni marchandise ni endroit.
 *
 * Une précaution de forme, apprise deux chantiers plus tôt : un `Row` fermé
 * affiche `because` **à la place** de `sub`. Les lectures qui comptent ne
 * vivent donc jamais dans un `sub` — elles ont leur propre carte, et ne
 * disparaissent pas au moment où l'action devient impossible.
 */

import { useState } from 'react';
import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { GOODS, getGood } from '../data/route.ts';
import { REGION_ARCHETYPES } from '../data/regions.ts';
import {
  capacity, costHere, destinations, empty as holdEmpty, hereId, holdWorth,
  loadOf, mostAffordable, priceAt, roomLeft, routeOf, run, runBlocker, stock,
  stockBlocker, stopOdds,
} from '../systems/route.ts';
import { heatLabel, heatOf } from '../systems/underworld.ts';

export function RouteScreen({ onBack }: { onBack: () => void }) {
  const { state, run: act } = useGame();
  const [buying, setBuying] = useState<string | null>(null);
  if (!state) return null;
  const route = routeOf(state);
  const here = hereId(state);
  const hereLabel = REGION_ARCHETYPES.find((r) => r.id === here)?.label ?? here;
  const hold = Object.entries(route.hold).filter(([, n]) => n > 0);
  const load = loadOf(state);
  const room = capacity(state);

  /* --- Combien en prendre --- */
  const good = buying ? getGood(buying) : null;
  if (good) {
    const unit = costHere(state, good.id);
    const most = mostAffordable(state, good.id);
    const steps = [1, Math.floor(most / 4), Math.floor(most / 2), most]
      .filter((n, i, all) => n > 0 && all.indexOf(n) === i);
    return (
      <Sheet title={good.label} onBack={() => setBuying(null)}>
        <Card pad>
          <div style={{ fontSize: 40, textAlign: 'center' }}>{good.emoji}</div>
          <p style={{ margin: '10px 0 0', lineHeight: 1.55, textAlign: 'center' }}>
            {good.line}
          </p>
          <div className="chips" style={{ marginTop: 12, justifyContent: 'center' }}>
            <Pill tone="warn">{money(state, unit)} l’unité</Pill>
            <Pill>encombrement {good.bulk}</Pill>
            <Pill tone={good.notice > 1.2 ? 'bad' : good.notice < 0.8 ? 'good' : undefined}>
              {good.notice > 1.2 ? 'ça se remarque' : good.notice < 0.8 ? 'discret' : 'quelconque'}
            </Pill>
          </div>
        </Card>

        <Section title="Ce que ça vaudrait ailleurs">
          <Card>
            {REGION_ARCHETYPES.filter((r) => r.id !== here).map((r) => {
              const there = priceAt(state, r.id, good.id);
              return (
                <Row
                  key={r.id}
                  emoji={r.emoji}
                  title={r.label}
                  sub={there > unit ? `+${money(state, there - unit)} par unité` : 'Moins cher qu’ici'}
                  right={<Pill tone={there > unit * 1.25 ? 'good' : there > unit ? undefined : 'bad'}>
                    {money(state, there)}
                  </Pill>}
                />
              );
            })}
          </Card>
        </Section>

        <Section title="Combien en prendre">
          <Card>
            {most === 0 ? (
              <Empty>Ni la place ni de quoi payer.</Empty>
            ) : steps.map((n) => {
              const why = stockBlocker(state, good.id, n);
              return (
                <Row
                  key={n}
                  emoji="📦"
                  title={`${n} × ${good.label.toLowerCase()}`}
                  sub={`${good.bulk * n} de place`}
                  right={<Pill tone="warn">{money(state, unit * n)}</Pill>}
                  closed={Boolean(why)}
                  because={why}
                  onClick={() => {
                    act((ctx) => stock(ctx, good.id, n), good.emoji);
                    setBuying(null);
                  }}
                  chevron={!why}
                />
              );
            })}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Charger davantage rapporte davantage. Ce que ça coûte ne se paie pas
            en argent : la chaleur monte avec le carré de la charge, et ce sont
            des années qu’on risque.
          </p>
        </Section>
      </Sheet>
    );
  }

  /* --- Le sommaire --- */
  return (
    <Sheet title="La route" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>{hereLabel}</strong>
            <div className="small muted">
              {load > 0 ? `${load} de charge sur ${room}` : `rien sur les bras · ${room} de place`}
            </div>
          </div>
          <strong style={{ fontSize: 17 }}>{money(state, holdWorth(state))}</strong>
        </div>
        <div style={{ marginTop: 10 }}>
          <Meter value={(load / Math.max(1, room)) * 100} />
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={heatOf(state) > 60 ? 'bad' : heatOf(state) > 30 ? 'warn' : 'good'}>
            {heatLabel(heatOf(state))}
          </Pill>
          {load > 0 && (
            <Pill tone={stopOdds(state) > 0.2 ? 'bad' : stopOdds(state) > 0.08 ? 'warn' : 'good'}>
              {Math.round(stopOdds(state) * 100)} % d’être contrôlé
            </Pill>
          )}
        </div>
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          Un prix dépend de l’endroit. La carte dérive chaque année, et un écart
          qu’on exploite se referme — une bonne route cesse de l’être à force de
          servir.
        </p>
      </Card>

      {hold.length > 0 && (
        <Section title="Ce que tu portes">
          <Card>
            {hold.map(([id, units]) => {
              const g = getGood(id);
              return (
                <Row
                  key={id}
                  emoji={g?.emoji ?? '📦'}
                  title={`${units} × ${g?.label ?? id}`}
                  sub={`${(g?.bulk ?? 1) * units} de place`}
                  right={<Pill>{money(state, priceAt(state, here, id) * units)}</Pill>}
                />
              );
            })}
          </Card>
        </Section>
      )}

      <Section title={holdEmpty(state) ? 'Se fournir ici' : 'Compléter la charge'}>
        <Card>
          {GOODS.map((g) => {
            const unit = costHere(state, g.id);
            const most = mostAffordable(state, g.id);
            return (
              <Row
                key={g.id}
                emoji={g.emoji}
                title={g.label}
                sub={`${g.line} · ${most > 0 ? `jusqu’à ${most}` : 'hors de portée'}`}
                right={<Pill tone="warn">{money(state, unit)}</Pill>}
                onClick={() => setBuying(g.id)}
                chevron
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Il te reste {roomLeft(state)} de place. Ce qui borne n’est pas
          l’argent : une caisse de verrerie occupe ce que dix montres
          n’occupent pas.
        </p>
      </Section>

      <Section title="Faire un passage">
        {holdEmpty(state) ? (
          <Empty>Tu n’as rien à porter.</Empty>
        ) : (
          <Card>
            {destinations(state).map(({ region, worth }) => {
              const why = runBlocker(state, region.id);
              const paid = holdWorth(state, route.boughtIn ?? here);
              return (
                <Row
                  key={region.id}
                  emoji={region.emoji}
                  title={region.label}
                  sub={worth > paid
                    ? `Tu y gagnerais ${money(state, worth - paid)}`
                    : 'Tu y perdrais de l’argent'}
                  right={<Pill tone={worth > paid * 1.2 ? 'good' : worth > paid ? undefined : 'bad'}>
                    {money(state, worth)}
                  </Pill>}
                  closed={Boolean(why)}
                  because={why}
                  onClick={() => act((ctx) => run(ctx, region.id), region.emoji)}
                  chevron={!why}
                />
              );
            })}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Un passage par an. Se faire prendre coûte la cargaison, et parfois
          bien davantage.
        </p>
      </Section>

      {route.runs > 0 && (
        <Section title="Ce que la route t’a fait">
          <Card>
            <Row emoji="🚚" title="Passages" sub="Depuis que tu as commencé" right={<Pill>{route.runs}</Pill>} />
            <Row
              emoji="🚨"
              title="Cargaisons perdues"
              sub="Contrôlé en chemin"
              right={<Pill tone={route.seized > 0 ? 'bad' : 'good'}>{route.seized}</Pill>}
            />
            <Row
              emoji="💰"
              title="Ce qu’il en reste"
              sub="Net de ce que ça t’a coûté"
              right={<Pill tone={route.earned >= 0 ? 'good' : 'bad'}>{money(state, route.earned)}</Pill>}
            />
          </Card>
        </Section>
      )}
    </Sheet>
  );
}
