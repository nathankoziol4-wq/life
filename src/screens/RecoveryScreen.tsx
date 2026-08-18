/**
 * Écran « Se relever ».
 *
 * Mesuré avant qu'il existe, sur soixante vies qui font ce que le jeu
 * propose : la dépendance atteint cent dans cent pour cent des vies, elle
 * redescend de 1,2 point par an, et il n'y avait **rien à faire**. Le moteur
 * lisait pourtant la statistique partout — maladies, emploi, mort.
 *
 * Ce que cet écran doit rendre lisible, et dans cet ordre : où l'on en est,
 * ce que ça coûtera d'en sortir, **ce qui fera rechuter** — parce que décider
 * de retourner jouer en sachant que ça double la pression est une décision,
 * et le découvrir après coup n'en est pas une — et qui est au courant.
 */

import { Button, Card, Empty, Meter, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money } from '../ui/format.ts';
import { RELATION_LABELS } from '../engine/context.ts';
import {
  CLEAN_YEARS, GRIP_LABEL, cleanYears, couldTell, currentProgram, enrol,
  enrolBlocker, gripOf, isClean, programCost, programsFor, quitProgram,
  relapseOdds, relapses, tell, tempted, witnesses, yearlyDrop,
} from '../systems/recovery.ts';

export function RecoveryScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const p = state.player;
  const grip = gripOf(state);
  const program = currentProgram(state);
  const seen = witnesses(state);
  const odds = relapseOdds(state);

  return (
    <Sheet title="Se relever" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <div className="row-title">{GRIP_LABEL[grip]}</div>
            <div className="row-sub">
              {grip === 'libre'
                ? cleanYears(state) > 0
                  ? `${cleanYears(state)} an(s) que ça tient.`
                  : 'Rien à signaler.'
                : 'Le corps le paie, le travail le paie, et ça finit par se voir.'}
            </div>
          </div>
          <Pill tone={grip === 'libre' ? 'good' : grip === 'pris' ? 'warn' : 'bad'}>
            {Math.round(p.stats.addiction)}/100
          </Pill>
        </div>
        <Meter value={100 - p.stats.addiction} />
        <div className="chips" style={{ marginTop: 10 }}>
          {isClean(state) && <Pill tone="good">Sobre depuis {cleanYears(state)} ans</Pill>}
          {relapses(state) > 0 && <Pill tone="bad">{relapses(state)} rechute(s)</Pill>}
          {seen.length > 0 && <Pill>{seen.length} personne(s) au courant</Pill>}
        </div>
      </Card>

      {/* En cours : ce qui se joue cette année, et ce qui le fait basculer. */}
      {program && (
        <Section title="Là où tu en es">
          <Card pad>
            <div className="spread">
              <span className="row-title">{program.emoji} {program.label}</span>
              <Pill tone={odds > 0.5 ? 'bad' : odds > 0.3 ? 'warn' : 'good'}>
                {Math.round(odds * 100)} % de rechute
              </Pill>
            </div>
            <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
              Cette année devrait te retirer {Math.round(yearlyDrop(state))} point(s), et te
              coûter {money(state, programCost(state, program))}.
              {tempted(state)
                ? ' Tu y es retourné récemment : la pression a doublé.'
                : ' Retourner jouer ou sortir doublerait la pression.'}
              {seen.length === 0
                ? ' Personne n’est au courant — en parler à quelqu’un aiderait.'
                : ` ${seen.map((x) => x.firstName).join(', ')} sait ce que tu traverses.`}
            </p>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <Button variant="secondary" onClick={() => run((ctx) => quitProgram(ctx), '✋')}>
                Arrêter là
              </Button>
            </div>
          </Card>
        </Section>
      )}

      <Section title={program ? 'Changer de façon' : 'Comment en sortir'}>
        <Card>
          {programsFor(state).map((x) => {
            const why = enrolBlocker(state, x.id);
            return (
              <Row
                key={x.id}
                emoji={x.emoji}
                title={x.label}
                sub={why ?? `${x.note} Retient ${Math.round(x.holds * 100)} % de ce qui pousse.`}
                right={<Pill>{x.cost === 0 ? 'gratuit' : money(state, programCost(state, x))}</Pill>}
                disabled={Boolean(why)}
                onClick={why ? undefined : () => run((ctx) => enrol(ctx, x.id), x.emoji)}
                chevron={!why}
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Ce qui ne coûte rien ne tient rien. Une fois sous le seuil, il faut
          {' '}{CLEAN_YEARS} ans pour que ça compte vraiment.
        </p>
      </Section>

      {/* En parler : le seul geste du jeu où connaître quelqu'un se paie
          comptant. Chaleureux, il s'approche ; distant, il recule. */}
      <Section title="En parler à quelqu’un">
        {couldTell(state).length === 0 ? (
          <Empty>
            {seen.length > 0
              ? 'Ceux dont tu es proche le savent déjà.'
              : 'Personne d’assez proche pour ça, pour l’instant.'}
          </Empty>
        ) : (
          <Card>
            {couldTell(state).slice(0, 8).map((person) => (
              <Row
                key={person.id}
                emoji={avatarFor(person)}
                title={`${person.firstName} ${person.lastName}`}
                sub={RELATION_LABELS[person.relation]}
                onClick={() => run((ctx) => tell(ctx, person.id), avatarFor(person))}
                chevron
              />
            ))}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Quelqu’un de chaleureux s’approche ; quelqu’un de distant met de la
          distance. Tu ne sais lequel des deux tu as en face que si tu as pris
          la peine de le découvrir.
        </p>
      </Section>
    </Sheet>
  );
}
