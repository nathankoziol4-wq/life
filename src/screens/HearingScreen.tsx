/**
 * Écran « L'audience ».
 *
 * Il n'existait pas : on choisissait un avocat dans une liste de quatre prix,
 * et le dé tombait.
 *
 * Ce que l'écran doit rendre lisible tient en deux chiffres et une phrase :
 *
 * 1. **le crédit qui reste**, parce que c'est la ressource et que tout le
 *    système consiste à la dépenser au bon endroit ;
 * 2. **ce qui pèse déjà**, pour qu'on sache si l'on peut encore se permettre
 *    un pari ;
 * 3. **ce qu'on lit de la charge en cours** — une fourchette, jamais un
 *    chiffre exact, et parfois rien du tout.
 *
 * Les trois postures disent chacune ce qu'elles font *avant* d'être choisies.
 * Ce n'est pas un quiz : il n'y a pas de bonne réponse dans l'absolu, il y a
 * ce qu'on peut encore payer.
 */

import { useState } from 'react';
import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { STANCES } from '../data/hearing.ts';
import {
  answer, chargesOf, creditOf, currentCharge, hearingDone, hearingOf,
  hearingVerdict, readOf, readSays, weightOf,
} from '../systems/hearing.ts';
import { goToTrial } from '../systems/justice.ts';

export function HearingScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [said, setSaid] = useState<string | null>(null);
  if (!state) return null;
  const hearing = hearingOf(state);

  if (!hearing) {
    return (
      <Sheet title="L’audience" onBack={onBack}>
        <Empty>Il n’y a pas d’audience en cours.</Empty>
      </Sheet>
    );
  }

  const charges = chargesOf(state);
  const charge = currentCharge(state);
  const done = hearingDone(state);
  const credit = creditOf(state);
  const weight = weightOf(state);

  return (
    <Sheet title="L’audience" onBack={onBack}>
      <Card pad>
        <div className="chips">
          <Pill tone={credit > 45 ? 'good' : credit > 20 ? 'warn' : 'bad'}>
            crédit {credit}
          </Pill>
          <Pill tone={weight > 40 ? 'bad' : weight > 15 ? 'warn' : 'good'}>
            {weight <= 0 ? 'rien ne pèse encore' : `${weight} contre toi`}
          </Pill>
          <Pill>{hearing.round}/{charges.length}</Pill>
        </div>
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          Tu ne peux pas tout contester. Ce que tu perds ici manquera au point
          suivant.
        </p>
        <div style={{ marginTop: 10 }}><Meter value={credit} /></div>
      </Card>

      {said && (
        <Card pad>
          <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>{said}</p>
        </Card>
      )}

      {done || !charge ? (
        <Section title="C’est fini">
          <Card>
            <Row emoji="⚖️" title={hearingVerdict(state)} sub={`Crédit final ${credit} · ${weight} de poids retenu`} />
            <Row
              emoji="🔨"
              title="Laisser le tribunal se prononcer"
              sub="Les honoraires sont dus maintenant"
              onClick={() => {
                run((ctx) => goToTrial(ctx, hearing.lawyerId), '🔨');
                onBack();
              }}
              chevron
            />
          </Card>
        </Section>
      ) : (
        <>
          <Section title={`Ils mettent sur la table`}>
            <Card pad>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}>
                {charge.claim}
              </div>
              <p className="small muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
                {charge.line}
              </p>
              {/*
                La lecture : une fourchette, et parfois rien. C'est ce que
                l'avocat achète — de la vue, pas un multiplicateur de verdict.
              */}
              <p className="small" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                {readSays(readOf(state, charge))}
              </p>
            </Card>
          </Section>

          <Section title="Ce que tu en fais">
            <Card>
              {STANCES.map((s) => (
                <Row
                  key={s.id}
                  emoji={s.emoji}
                  title={s.label}
                  sub={s.line}
                  onClick={() => {
                    const outcome = run((ctx) => answer(ctx, s.id), s.emoji);
                    setSaid(outcome.message ?? null);
                  }}
                  chevron
                />
              ))}
            </Card>
          </Section>
        </>
      )}
    </Sheet>
  );
}
