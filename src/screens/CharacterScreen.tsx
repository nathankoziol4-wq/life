/**
 * Fiche de caractère complète.
 *
 * Le profil montre l'essentiel ; cet écran montre tout, en couches, de la plus
 * stable (le tempérament, qui ne bougera jamais) à la plus mouvante (ce dont
 * il se souvient). Il affiche aussi ce que la vie actuelle donne à chacune de
 * ses valeurs — c'est là que se lisent les dilemmes du §11 : une valeur bien
 * servie et une valeur négligée coexistent dans la même vie, et l'écart est
 * exactement ce qui rend quelqu'un insatisfait sans qu'il sache pourquoi.
 */

import { useState } from 'react';
import { Gauge, Pill, Segmented, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import {
  AmbitionsCard, AxesCard, DecisionCard, EmotionCard, FearsCard, HabitsCard,
  InterestsCard, MemoriesCard, SelfCard, StylesCard, TemperamentCard, ValuesCard,
} from '../components/PersonalityPanel.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { valueFulfilment } from '../systems/contexts.ts';
import { lifeSatisfaction, describeCharacter } from '../systems/psyche.ts';
import { VALUE_KEYS, VALUE_LABELS, VALUE_TENSIONS } from '../engine/psyche.ts';

type Page = 'qui' | 'ce quil vit' | 'tout';

/** Les libellés de valeurs portent leur article en majuscule : « L’argent ». */
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function CharacterScreen({ onBack }: { onBack: () => void }) {
  const { state } = useGame();
  const [page, setPage] = useState<Page>('qui');
  if (!state) return null;

  const psyche = state.player.psyche;
  const fulfilment = valueFulfilment(state);
  const satisfaction = lifeSatisfaction(state);

  // Les tensions réellement vécues : deux valeurs auxquelles il tient toutes
  // les deux, et que sa vie ne peut pas servir en même temps.
  const tensions = VALUE_TENSIONS
    .map(([a, b, reason]) => ({
      a, b, reason,
      // Le tiraillement demande qu'il tienne aux deux, et que l'une soit
      // nettement mieux servie que l'autre.
      pull: Math.min(psyche.values[a], psyche.values[b]) / 100
        * Math.abs(fulfilment[a] - fulfilment[b]) / 100,
    }))
    .filter((t) => t.pull > 0.12)
    .sort((x, y) => y.pull - x.pull)
    .slice(0, 3);

  const neglected = [...VALUE_KEYS]
    .filter((key) => psyche.values[key] >= 55)
    .map((key) => ({ key, gap: psyche.values[key] - fulfilment[key] }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 4)
    .filter((x) => x.gap > 12);

  return (
    <Sheet title="Caractère" onBack={onBack}>
      <Card pad>
        <p style={{ margin: 0, lineHeight: 1.55 }}>{describeCharacter(psyche)}</p>
      </Card>

      <div className="field" style={{ marginTop: 12 }}>
        <Segmented
          value={page}
          onChange={setPage}
          options={[
            { value: 'qui', label: 'Qui il est' },
            { value: 'ce quil vit', label: 'Ce qu’il vit' },
            { value: 'tout', label: 'Tout' },
          ]}
        />
      </div>

      {page === 'qui' && (
        <>
          <AxesCard psyche={psyche} />
          <SelfCard psyche={psyche} />
          <StylesCard psyche={psyche} />
          <DecisionCard psyche={psyche} />
          <EmotionCard psyche={psyche} />
          <TemperamentCard psyche={psyche} />
        </>
      )}

      {page === 'ce quil vit' && (
        <>
          <Section title="Ce que sa vie lui donne">
            <Card>
              <Row
                emoji="🧭"
                title="Satisfaction générale"
                sub={satisfaction.reasons[0] ?? 'Rien de marquant dans un sens ou dans l’autre.'}
                right={<Gauge value={satisfaction.score} />}
              />
            </Card>
          </Section>

          {tensions.length > 0 && (
            <Section title="Ce qui le tiraille">
              <Card>
                {tensions.map((t) => (
                  <Row
                    key={`${t.a}_${t.b}`}
                    emoji="⚖️"
                    title={`${VALUE_LABELS[t.a]} contre ${lowerFirst(VALUE_LABELS[t.b])}`}
                    sub={t.reason}
                  />
                ))}
              </Card>
              <p className="small muted" style={{ margin: '8px 4px 0' }}>
                Il tient aux deux, et sa vie ne peut pas servir les deux. Ce
                n’est pas un défaut : c’est ce qui rend certains choix
                douloureux au lieu d’être évidents.
              </p>
            </Section>
          )}

          {neglected.length > 0 && (
            <Section title="Ce qui lui manque">
              <Card>
                {neglected.map(({ key }) => (
                  <Row
                    key={key}
                    emoji="🕳️"
                    title={VALUE_LABELS[key]}
                    sub="Il y tient, et sa vie actuelle ne le lui donne pas."
                    right={<Pill tone="warn">en défaut</Pill>}
                  />
                ))}
              </Card>
            </Section>
          )}

          <ValuesCard psyche={psyche} />
          <AmbitionsCard psyche={psyche} />
          <InterestsCard psyche={psyche} />
          <HabitsCard psyche={psyche} />
          <FearsCard psyche={psyche} />
          <MemoriesCard psyche={psyche} />
        </>
      )}

      {page === 'tout' && (
        <>
          <AxesCard psyche={psyche} all />
          <Section title="Toutes ses valeurs">
            <Card>
              {[...VALUE_KEYS]
                .sort((a, b) => psyche.values[b] - psyche.values[a])
                .map((key) => (
                  <Row
                    key={key}
                    title={VALUE_LABELS[key]}
                    sub={`sa vie lui en donne : ${Math.round(fulfilment[key])} / 100`}
                    right={<Gauge value={psyche.values[key]} />}
                  />
                ))}
            </Card>
          </Section>
          <TemperamentCard psyche={psyche} />
          <MemoriesCard psyche={psyche} />
        </>
      )}
    </Sheet>
  );
}
