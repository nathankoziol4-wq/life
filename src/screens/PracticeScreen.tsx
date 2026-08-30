/**
 * Écran « Ce que tu tiens ».
 *
 * L'écran d'un système d'engagement ne peut pas être une liste de boutons :
 * ce qu'il faut donner à voir n'est pas ce qu'on peut prendre, c'est **ce
 * qu'on ne peut plus prendre**. D'où l'ordre, qui est celui de la décision :
 *
 * 1. **Ton année**, d'abord et en grand — ce qu'il reste d'attention, ce que
 *    tes pratiques demandent, et le rythme qui en résulte. Un joueur qui
 *    découvrirait après coup que son année est trop pleine n'aurait pas
 *    décidé, il aurait subi.
 * 2. **Ce que tu tiens**, avec pour chacune où elle en est, ce qu'elle ouvre,
 *    et les deux seules choses qu'on puisse en faire : aller chercher le grade
 *    suivant, ou arrêter.
 * 3. **Ce que tu pourrais prendre**, en dernier — avec sa charge annoncée
 *    **avant** de la prendre, pas après.
 *
 * Les chances du passage sont écrites sur la ligne. Décider de tenter à
 * quarante-quatre pour cent est une décision ; le découvrir en échouant n'en
 * est pas une — c'est la même règle que pour la rechute (`RecoveryScreen`).
 */

import { Empty, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { CAP, NEED } from '../data/practices.ts';
import {
  attemptPassage, attention, availablePractices, chargeOf, dropPractice, feeOf,
  gradeLabel, kept, load, pace, paidByHome, passageBlocker, passageOdds,
  priceOf, stalled, stateOf, takeBlocker, takePractice, yearlyCost,
} from '../systems/practices.ts';

export function PracticeScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;

  const open = availablePractices(state);
  const running = kept(state);
  const budget = attention(state);
  const demanded = Math.round(load(state));
  const stride = pace(state);
  const stuck = stalled(state);
  const home = paidByHome(state);
  const free = open.filter((practice) => !stateOf(state, practice.id).keeping);

  return (
    <Sheet title="Ce que tu tiens" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Une pratique n’est pas une activité : elle tourne toute seule chaque
          année, elle coûte de l’attention, et elle redescend si tu la lâches.
          C’est la seule chose du jeu où ne rien changer pendant longtemps
          rapporte quelque chose.
        </p>
        <div className="chips" style={{ marginTop: 12 }}>
          {/* « 83 demandés sur 40 » se lisait de travers au navigateur : deux
              nombres, deux unités implicites, et rien qui dise lequel est la
              limite. La barre oblique le dit. */}
          <Pill tone={demanded <= budget ? 'primary' : 'warn'}>
            {demanded} / {budget} d’attention
          </Pill>
          <Pill tone={stuck ? 'bad' : stride >= 0.99 ? 'good' : 'warn'}>
            {stride >= 0.99 ? 'plein rythme' : `${Math.round(stride * 100)} % du rythme`}
          </Pill>
          {running.length > 0 && !home && <Pill>{money(state, yearlyCost(state))}/an</Pill>}
          {/* Avant seize ans ce n'est pas le personnage qui paie, et le taire
              rendrait incompréhensible qu'une ligne soit fermée alors que la
              tirelire est pleine. */}
          {home && <Pill tone="accent">c’est chez toi qu’on paie</Pill>}
        </div>
        {/* Le mur, dit avant qu'on s'y cogne, avec les deux nombres qui le
            produisent. Une année passée sous le seuil coûte son argent et son
            attention sans rien faire monter : le joueur doit pouvoir le voir
            au moment de décider, pas le déduire après trois années perdues. */}
        {stuck ? (
          <p className="small" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            <strong>Tu n’avances plus.</strong> En dessous de 60 % du rythme,
            une année entretient ce que tu as sans rien faire monter — et elle
            se paie quand même. Lâche quelque chose : la place revient tout de
            suite aux autres.
          </p>
        ) : demanded > budget && (
          <p className="small" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            Ton année est trop pleine. Tu ne perds rien : tout avance moins
            vite, dans la même proportion. En dessous de 60 % du rythme, en
            revanche, plus rien ne monte du tout.
          </p>
        )}
      </Card>

      {open.length === 0 ? (
        <Section title="Trop tôt">
          <Empty>Rien de tout cela ne se tient à ton âge.</Empty>
        </Section>
      ) : running.length === 0 ? (
        <Section title="Ce que tu tiens">
          <Empty>Rien pour l’instant. Tout est encore devant toi.</Empty>
        </Section>
      ) : (
        <Section title="Ce que tu tiens">
          {running.map((practice) => {
            const held = stateOf(state, practice.id);
            const why = passageBlocker(state, practice.id);
            const odds = passageOdds(state, practice.id);
            const fee = feeOf(state, practice);
            const done = held.grade >= practice.grades.length;
            return (
              <Card key={practice.id}>
                <Row
                  emoji={practice.emoji}
                  title={practice.label}
                  // La charge sur la ligne de la pratique, pas sur celle
                  // d'« Arrêter » : au navigateur, la valeur à droite écrasait
                  // le sous-titre du bouton et le poussait sur trois lignes.
                  // Elle décrit la pratique, elle appartient donc à sa ligne.
                  sub={`${gradeLabel(practice, held.grade)} · ${held.years} an(s) tenus`
                    + ` · ${Math.round(chargeOf(state, practice))} d’attention`}
                  // L'avancée rapportée au plafond, pas au seuil : c'est ce
                  // plafond qui décide des chances du passage, et une jauge
                  // qui resterait bloquée à cent ne dirait plus rien de la
                  // seule chose qui bouge encore.
                  meter={(held.progress / CAP) * 100}
                  meterTone={held.progress >= NEED ? 'good' : undefined}
                  right={<Pill tone={held.grade > 0 ? 'good' : undefined}>{held.grade}</Pill>}
                />
                {!done && (
                  <Row
                    emoji="🎯"
                    title={`Tenter ${practice.passage.toLowerCase()}`}
                    sub={`${Math.round(odds * 100)} % de chances${fee > 0 ? ` · ${money(state, fee)}` : ''}`
                      + `${held.failed > 0 ? ` · ${held.failed} échec(s), tu sais ce qu’on attend` : ''}`}
                    closed={Boolean(why)}
                    because={why}
                    onClick={() => run((ctx) => attemptPassage(ctx, practice.id), '🎯')}
                    chevron={!why}
                  />
                )}
                <Row
                  emoji="🚪"
                  title="Arrêter"
                  sub={held.grade > 1
                    ? 'Trois ans sans y revenir : un cran de moins'
                    : 'Ce que tu as pris te reste'}
                  onClick={() => run((ctx) => dropPractice(ctx, practice.id), '🚪')}
                  chevron
                />
                <div style={{ padding: '2px 14px 12px' }}>
                  <div className="small muted" style={{ lineHeight: 1.5 }}>
                    {practice.opens}
                  </div>
                </div>
              </Card>
            );
          })}
        </Section>
      )}

      {free.length > 0 && (
        <Section title="Ce que tu pourrais prendre">
          <Card>
            {free.map((practice) => {
              const why = takeBlocker(state, practice.id);
              const held = stateOf(state, practice.id);
              return (
                <Row
                  key={practice.id}
                  emoji={practice.emoji}
                  title={practice.label}
                  // La charge est annoncée avant, jamais après : c'est la
                  // seule information qui permette de décider, et la cacher
                  // ferait de l'arbitrage une surprise.
                  sub={held.grade > 0
                    ? `Tu en étais à « ${gradeLabel(practice, held.grade).toLowerCase()} » · ${practice.charge} d’attention`
                    : `${practice.line} · ${practice.charge} d’attention`}
                  right={practice.cost === 0 ? 'Gratuit' : money(state, priceOf(state, practice))}
                  closed={Boolean(why)}
                  because={why}
                  onClick={() => run((ctx) => takePractice(ctx, practice.id), practice.emoji)}
                  chevron={!why}
                />
              );
            })}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Les cinq réunies demandent plus d’attention qu’une vie n’en a, même
            vide. C’est voulu : il faut choisir, et le choix revient tous les
            ans parce qu’un métier, un enfant ou une maladie prennent la place
            sans prévenir.
          </p>
        </Section>
      )}
    </Sheet>
  );
}
