/**
 * Écran « La gamme ».
 *
 * Ce que l'écran doit rendre lisible, et sans quoi la décision n'existe pas :
 *
 * 1. **où en est chaque chose sur sa vie.** Le joueur ne peut pas décider quand
 *    préparer la suite s'il ne voit pas que sa signature est au sommet pour
 *    encore deux ans. La jauge est donc la phase, pas la qualité, et la phrase
 *    à côté dit combien d'années il reste avant le prochain virage ;
 * 2. **ce que chaque forme sortirait aujourd'hui, avec les gens qu'on a.** La
 *    qualité de départ est calculée avant de payer et affichée à côté du prix —
 *    sans quoi le joueur choisit une signature qui sortira à 8 et ne comprend
 *    pas pourquoi elle ne rapporte rien ;
 * 3. **ce que l'année de mise au point coûte.** Elle est dite en haut, en même
 *    temps que le reste, parce que c'est elle qui fait de « quand » une
 *    question difficile.
 */

import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { DEV_DRAG, SHAPES, SPREAD, getShape } from '../data/offer.ts';
import type { Business } from '../engine/types.ts';
import {
  appeal, devCost, launch, launchBlocker, lineOf, phase, retire, spent,
  standing, wouldBe,
} from '../systems/offer.ts';

export function OfferScreen({ business, onBack }: { business: Business; onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const line = lineOf(business);
  const wide = line.length > SPREAD;

  return (
    <Sheet title="La gamme" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.55 }}>
          Ce que la maison vend, nommément. Chaque chose monte, tient, puis
          retombe — et l’on prépare la suite avec les mêmes bras qui produisent :
          l’année d’une mise au point, on sert {Math.round(DEV_DRAG * 100)} % de
          monde en moins.
        </p>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={line.length > 0 ? 'primary' : 'warn'}>
            {line.length} au catalogue
          </Pill>
          <Pill tone={wide ? 'bad' : undefined}>
            {wide ? 'La maison s’éparpille' : `${SPREAD} sans se disperser`}
          </Pill>
        </div>
      </Card>

      <Section
        title="Ce que tu vends"
        sub="La jauge est l’endroit où la chose en est de sa vie, pas sa qualité."
      >
        {line.length === 0 ? (
          <Empty>
            Rien de nommé. La maison vend « du chiffre » — ce qui marche, et ce
            qui ne se distingue de personne.
          </Empty>
        ) : (
          <Card>
            {line.map((offer) => {
              const shape = getShape(offer.shapeId);
              const done = spent(offer);
              return (
                <Row
                  key={offer.id}
                  emoji={shape?.emoji ?? '·'}
                  title={offer.name}
                  sub={standing(offer)}
                  meter={phase(offer) * 100}
                  meterTone={done ? 'bad' : phase(offer) >= 0.99 ? 'good' : undefined}
                  right={
                    <span className="small muted">
                      qualité {Math.round(offer.quality)} · +{appeal(offer).toFixed(2)}
                    </span>
                  }
                  onClick={() => run((ctx) => retire(ctx, offer.id), '🗑️')}
                  chevron
                />
              );
            })}
          </Card>
        )}
        {line.length > 0 && (
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Toucher une ligne la retire du catalogue. Ce qui est fini encombre —
            ce qui monte encore ne se remplace pas.
          </p>
        )}
      </Section>

      <Section
        title="Mettre quelque chose au point"
        sub="Une par an. Le chiffre à droite est ce qu’elle sortirait aujourd’hui, avec les gens que tu as."
      >
        <Card>
          {SHAPES.map((shape) => {
            const why = launchBlocker(state, shape.id);
            const quality = wouldBe(state, shape.id);
            return (
              <Row
                key={shape.id}
                emoji={shape.emoji}
                title={shape.label}
                sub={`${shape.line} Il y faut ${shape.hands} bras.`}
                right={
                  <span className="small">
                    {money(state, devCost(state, shape.id))}
                    <br />
                    <span className={quality >= 45 ? '' : 'muted'}>sortirait à {quality}</span>
                  </span>
                }
                closed={Boolean(why)}
                because={why}
                onClick={() => run((ctx) => launch(ctx, shape.id), shape.emoji)}
                chevron={!why}
              />
            );
          })}
        </Card>
      </Section>

      <Section title="Ce que ça change">
        <Card>
          <div className="card-pad">
            <div className="spread small muted">
              <span>Ce que la gamme tire</span>
              <span>+{line.reduce((s, o) => s + appeal(o), 0).toFixed(2)}</span>
            </div>
            <Meter value={Math.min(100, line.reduce((s, o) => s + appeal(o), 0) * 50)} />
            <p className="small muted" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
              Cela s’ajoute à ce que la notoriété et la qualité font venir. Une
              maison sans gamme n’est pas punie : elle vend comme elle a toujours
              vendu. Mais elle ne grandit qu’en se faisant connaître.
            </p>
          </div>
        </Card>
      </Section>
    </Sheet>
  );
}
