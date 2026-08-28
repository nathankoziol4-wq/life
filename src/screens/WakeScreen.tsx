/**
 * Écran « Ceux qui viennent ».
 *
 * Il doit faire une chose que le reste du jeu ne fait jamais : **montrer une
 * absence**. La liste ne se contente donc pas d'afficher qui vient — elle
 * affiche aussi, dans le même ordre et avec le même poids, ceux qui ne
 * viendront pas et pourquoi. C'est exactement ce à quoi sert `closed` +
 * `because` dans le vocabulaire des listes : une ligne hors d'atteinte reste
 * lue, annoncée, et donne sa raison. Ici la raison est le contenu.
 *
 * Trois décisions, dans l'ordre où elles se posent :
 *
 * 1. **ce qu'on organise**, quand c'est à nous — le coût et la portée en même
 *    temps, parce que l'un achète l'autre et qu'on ne peut pas les lire
 *    séparément ;
 * 2. **qui l'on va prévenir soi-même**, trois personnes au plus, prises dans
 *    la liste des absents : le seul endroit où un geste change encore quelque
 *    chose ;
 * 3. **ce qu'on dit** — avec, sous chaque phrase, le fait sur lequel elle
 *    s'appuie. Le jeu ne dit pas laquelle est vraie. Il donne de quoi savoir.
 */

import { Button, Empty, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { RELATION_LABELS } from '../engine/context.ts';
import { FORMS, TELLS, WORDS } from '../data/wake.ts';
import {
  costOf, evidence, heldLabel, hold, holdBlocker, letSpeak, mourned, saySilence,
  setForm, setWord, tell, tellBlocker, turnout, wakeOf,
} from '../systems/wake.ts';

export function WakeScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const wake = wakeOf(state);
  const who = mourned(state);

  if (!wake || !who) {
    return (
      <Sheet title="Les obsèques" onBack={onBack}>
        <Empty>Il n’y a personne à enterrer.</Empty>
      </Sheet>
    );
  }

  const all = turnout(state, wake);
  const come = all.filter((t) => t.comes);
  const absent = all.filter((t) => !t.comes);
  const cost = costOf(state);
  const why = holdBlocker(state);
  const told = wake.toldIds.length;

  return (
    <Sheet title={`${who.firstName} ${who.lastName}`} onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          {RELATION_LABELS[who.relation]}, {who.age} ans, {who.deathCause ?? 'décédé'}.
          {wake.ours
            ? ' Il n’y a personne d’autre pour s’en occuper.'
            : ' Quelqu’un de plus proche s’en occupe ; tu y seras.'}
        </p>
        {/* Les deux chiffres qui bougent ensemble, en haut, comme à la noce. */}
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={come.length > 0 ? 'primary' : 'bad'}>
            {come.length} personne{come.length > 1 ? 's' : ''}
          </Pill>
          {wake.ours && (
            <Pill tone={cost > state.player.money ? 'bad' : undefined}>{money(state, cost)}</Pill>
          )}
          <Pill tone={told >= TELLS ? 'warn' : undefined}>
            {TELLS - told} visite{TELLS - told > 1 ? 's' : ''} possible{TELLS - told > 1 ? 's' : ''}
          </Pill>
        </div>
        <p className="small" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          Personne n’invite personne. On vient, ou on ne vient pas.
        </p>
      </Card>

      {wake.ours && (
        <Section title="Ce qu’on organise" sub="Ce que ça coûte achète de la portée, pas du décorum.">
          <Card>
            {FORMS.map((f) => (
              <Row
                key={f.id}
                emoji={f.emoji}
                title={f.label}
                sub={f.line}
                right={f.cost === 0 ? 'Rien' : money(state, costOf(state, f.id))}
                badge={wake.formId === f.id ? <Pill tone="primary">choisi</Pill> : undefined}
                onClick={() => run((ctx) => setForm(ctx, f.id), f.emoji)}
                chevron
              />
            ))}
          </Card>
        </Section>
      )}

      <Section title="Qui viendra" sub={`${come.length} sur ${all.length}.`}>
        {come.length === 0 ? (
          <Empty>Personne. Il n’en reste peut-être pas grand-chose à sauver.</Empty>
        ) : (
          <Card>
            {come.slice(0, 20).map((t) => (
              <Row
                key={t.who.id}
                emoji={t.forDeceased ? '🕯️' : '·'}
                title={`${t.who.firstName} ${t.who.lastName}`}
                sub={t.forDeceased ? 'De sa famille.' : 'Il vient pour toi.'}
                right={wake.speakerId === t.who.id ? <Pill tone="good">parle</Pill> : undefined}
                onClick={() => run((ctx) => letSpeak(ctx, t.who.id), '🎙️')}
                chevron
              />
            ))}
          </Card>
        )}
      </Section>

      <Section
        title="Qui ne viendra pas"
        sub="Ce n’est pas un tirage. C’est ce que tu as fait de ces gens-là."
      >
        {absent.length === 0 ? (
          <Empty>Tout le monde sera là.</Empty>
        ) : (
          <Card>
            {absent.slice(0, 20).map((t) => {
              const notified = wake.toldIds.includes(t.who.id);
              const blocked = tellBlocker(state, t.who.id);
              /*
               * La ligne est `closed` parce qu'elle dit une absence, et `Row`
               * refuse alors le clic — ce qui est juste : il n'y a rien à
               * ouvrir ici. Le seul geste qui reste possible est donc porté
               * par un bouton à droite, et non par la ligne. Sans cela le
               * clic ne partait jamais, et « aller le dire soi-même »
               * n'existait que dans la documentation.
               */
              return (
                <Row
                  key={t.who.id}
                  emoji={notified ? '📨' : '·'}
                  title={`${t.who.firstName} ${t.who.lastName}`}
                  closed
                  because={heldLabel(t.held, t.who, state)}
                  right={
                    notified || !blocked ? (
                      <Button
                        variant={notified ? 'secondary' : 'ghost'}
                        small
                        onClick={() => run((ctx) => tell(ctx, t.who.id), '📨')}
                      >
                        {notified ? 'prévenu' : 'y aller'}
                      </Button>
                    ) : undefined
                  }
                />
              );
            })}
          </Card>
        )}
      </Section>

      <Section
        title="Ce qu’on dit"
        sub="Sous chaque phrase, ce sur quoi elle s’appuie. À toi de voir si elle tient."
      >
        <Card>
          {WORDS.map((w) => (
            <Row
              key={w.id}
              emoji={w.emoji}
              title={w.label}
              sub={evidence(state, who, w.claim)}
              badge={wake.wordId === w.id ? <Pill tone="primary">choisi</Pill> : undefined}
              onClick={() => run((ctx) => setWord(ctx, w.id), w.emoji)}
              chevron
            />
          ))}
          <Row
            emoji="🤍"
            title="Ne rien dire"
            sub="Le silence dure ce qu’il faut, et personne ne le reproche."
            badge={wake.speaker === 'personne' ? <Pill tone="primary">choisi</Pill> : undefined}
            onClick={() => run((ctx) => saySilence(ctx), '🤍')}
            chevron
          />
        </Card>
      </Section>

      <Section title="Le jour">
        <Card>
          <Row
            emoji="🌿"
            title="Y aller"
            sub={why ?? `${come.length} personne(s), et ce que tu as choisi de dire`}
            right={cost > 0 ? money(state, cost) : undefined}
            closed={Boolean(why)}
            because={why}
            onClick={() => run((ctx) => hold(ctx), '🌿')}
            chevron={!why}
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Si tu n’y vas pas, cela aura lieu quand même : la famille fera au plus
          court, personne ne parlera, et tu l’apprendras l’an prochain.
        </p>
      </Section>
    </Sheet>
  );
}
