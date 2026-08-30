/**
 * Écran « Le cabinet ».
 *
 * Il remplace une liste de quatre lignes qui affichaient leur propre fiabilité
 * en clair — « Fiabilité du diagnostic : 60 % ». Avec ce chiffre à l'écran,
 * choisir son médecin était une soustraction : le plus fiable qu'on pouvait
 * payer, et l'affaire était close pour la vie entière.
 *
 * Ce que l'écran montre maintenant est ce qu'on peut réellement savoir de
 * quelqu'un qu'on n'a pas encore vu :
 *
 * 1. **son prix**, qui suit la réputation ;
 * 2. **ce qu'on en dit**, en mots plutôt qu'en pourcentage — « on se le
 *    repasse » se lit, « 78 » ne se lit pas et donnerait l'illusion d'une
 *    mesure ;
 * 3. **ce que tu as fini par comprendre**, une fois que tu l'as assez vu.
 *
 * La compétence réelle n'apparaît jamais. C'est tout le système.
 */

import { Empty, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { ER, SPECIALTIES, getSpecialty } from '../data/practitioners.ts';
import {
  consultBlocker, consultWith, feeOf, goToER, memoryOf, panelOf, readIn, readOf,
  register, regularOf, renownLabel,
} from '../systems/practitioners.ts';

export function PractitionerScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const panel = panelOf(state);
  const mine = regularOf(state);

  return (
    <Sheet title="Le cabinet" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Tu ne sais pas ce que vaut un médecin avant de l’avoir vu plusieurs
          fois. Le prix et ce qu’on en dit penchent dans le bon sens — sans
          jamais trancher.
        </p>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={mine ? 'primary' : 'warn'}>
            {mine ? `Ton médecin : ${mine.name}` : 'Aucun médecin traitant'}
          </Pill>
          <Pill>{state.player.cityName}</Pill>
        </div>
      </Card>

      {SPECIALTIES.map((specialty) => {
        const here = panel.filter((d) => d.specialtyId === specialty.id);
        if (here.length === 0) return null;
        return (
          <Section key={specialty.id} title={specialty.label} sub={specialty.line}>
            <Card>
              {here.map((doctor) => {
                const why = consultBlocker(state, doctor.id);
                const said = readOf(state, doctor.id);
                const left = readIn(state, doctor.id);
                const held = memoryOf(state, doctor.id);
                const isMine = state.player.doctorId === doctor.id;
                return (
                  <Row
                    key={doctor.id}
                    emoji={getSpecialty(doctor.specialtyId)?.emoji ?? '🩺'}
                    title={doctor.name}
                    /*
                     * Ce qu'on en dit, puis ce qu'on en a compris. Jamais la
                     * compétence : elle est le seul chiffre du système qui ne
                     * s'affiche pas, et c'est ce qui donne une raison de
                     * retourner voir le même plutôt que d'en essayer six.
                     */
                    sub={said
                      ?? `${renownLabel(doctor.renown)}${held.seen > 0
                        ? ` · vu ${held.seen} fois, encore ${left} avant de savoir`
                        : ''}`}
                    right={money(state, feeOf(state, doctor.id))}
                    badge={isMine ? <Pill tone="primary">le tien</Pill> : undefined}
                    closed={Boolean(why)}
                    because={why}
                    onClick={() => run((ctx) => consultWith(ctx, doctor.id), '🩺')}
                    chevron={!why}
                  />
                );
              })}
            </Card>
            <Card>
              {here.map((doctor) => (
                <Row
                  key={`take_${doctor.id}`}
                  emoji="📌"
                  title={`Prendre ${doctor.name}`}
                  sub="Consultations moins chères, et tu apprends plus vite ce qu’il vaut"
                  closed={state.player.doctorId === doctor.id}
                  because="C’est déjà le tien."
                  onClick={() => run((ctx) => register(ctx, doctor.id), '📌')}
                  chevron={state.player.doctorId !== doctor.id}
                />
              ))}
            </Card>
          </Section>
        );
      })}

      {panel.length === 0 && (
        <Section title="Ici">
          <Empty>Personne n’exerce à portée. Il reste les urgences.</Empty>
        </Section>
      )}

      <Section title="Sans rendez-vous">
        <Card>
          <Row
            emoji={ER.emoji}
            title={ER.label}
            sub={ER.line}
            onClick={() => run((ctx) => goToER(ctx), ER.emoji)}
            chevron
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Le recours de qui n’a personne : cher, sans suite, et l’on n’apprend
          rien de qui vous a reçu.
        </p>
      </Section>
    </Sheet>
  );
}
