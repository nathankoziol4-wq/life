/**
 * Écran « La table ».
 *
 * L'ancien casino proposait quatre noms de jeux qui ne différaient que par
 * trois nombres : on misait, on tirait, on regardait. Rien à décider, donc
 * rien à jouer — exactement ce que §228 refuse.
 *
 * Ici la seule chose qui se passe est une décision répétée : **retourner un
 * jeton de plus, ou empocher**. Et la seule adresse possible est de suivre ce
 * qui est sorti du sac, dont la composition est affichée. Un joueur attentif
 * sait quand s'arrêter ; les autres jouent à pile ou face.
 */

import { useState } from 'react';
import { Button, Card, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { AmountPicker } from '../components/Modal.tsx';
import { GameGauge, MiniGameHost } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import {
  ROUNDS, TABLE, bustOdds, remaining, type TableState,
} from '../systems/minigames/table.ts';
import { autoTable, settleTable, tableBlocker, tableContext } from '../systems/activities.ts';

export function TableScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [bet, setBet] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  if (!state) return null;
  const p = state.player;
  const why = tableBlocker(state, bet);

  if (playing) {
    return (
      <Sheet title="La table" onBack={() => setPlaying(false)}>
        <MiniGameHost
          key={`table-${seed}`}
          def={TABLE}
          context={tableContext(state)}
          seed={seed}
          render={(s) => <TableScene state={s as TableState} />}
          onFinish={(_s, result) => {
            setPlaying(false);
            run((ctx) => settleTable(ctx, bet, result.quality), '🎲');
          }}
          // Se lever de table sans jouer : la mise reste dans la poche.
          onQuit={() => setPlaying(false)}
        />
      </Sheet>
    );
  }

  return (
    <Sheet title="La table" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Une rangée de jetons retournés. Tu en découvres un à la fois : la
          plupart ajoutent au pot, quelques-uns le vident entièrement. Tu peux
          empocher quand tu veux — mais seulement avant.
        </p>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={p.stats.addiction > 55 ? 'bad' : p.stats.addiction > 30 ? 'warn' : 'good'}>
            Dépendance {Math.round(p.stats.addiction)}
          </Pill>
          <Pill>{ROUNDS} manches</Pill>
        </div>
      </Card>

      <Section title="Ta mise">
        <Card pad>
          <AmountPicker value={bet} max={p.money} onChange={setBet} step={50} />
          <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            {why ?? `Tu mises ${money(state, bet)}. La maison garde sa part : même bien joué,
            on ne repart pas riche.`}
          </p>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Button disabled={Boolean(why)} onClick={() => setPlaying(true)}>
              T’asseoir à la table
            </Button>
            <Button
              variant="secondary"
              disabled={Boolean(why)}
              onClick={() => run((ctx) => autoTable(ctx, bet), '🎲')}
            >
              Laisser jouer
            </Button>
          </div>
        </Card>
      </Section>
    </Sheet>
  );
}

/**
 * La table elle-même.
 *
 * Ce qui doit se lire sans réfléchir : ce qu'il y a sur le tapis, ce qui est
 * à l'abri, et — si le personnage sait compter — ce qu'il reste de mauvais
 * dans le sac. C'est cette dernière ligne qui rend la décision jouable.
 */
function TableScene({ state: s }: { state: TableState }) {
  const left = remaining(s);
  const risk = bustOdds(s);
  return (
    <div style={{ padding: 4 }}>
      <div className="spread">
        <div>
          <div className="row-title">Sur le tapis</div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>{s.pot}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="row-title">À l’abri</div>
          <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--good)' }}>{s.banked}</div>
        </div>
      </div>

      <div className="chips" style={{ marginTop: 10 }}>
        <Pill>Manche {ROUNDS - s.roundsLeft + 1} / {ROUNDS}</Pill>
        {s.last !== null && (
          <Pill tone={s.last > 0 ? 'good' : 'bad'}>
            {s.last > 0 ? `+${s.last}` : 'vidé'}
          </Pill>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {/* La composition restante : la seule information qui rend la
            décision jouable, et que seul un personnage attentif obtient. */}
        {s.reads ? (
          <>
            <div className="row-sub">
              Il reste {left.good} bon(s) jeton(s) et {left.bad} qui vide(nt).
            </div>
            <GameGauge label="Chances de passer" value={(1 - risk) * 100} />
            <div className="small muted" style={{ marginTop: 4 }}>
              Une chance sur {risk > 0 ? Math.round(1 / risk) : '∞'} que le prochain vide tout.
            </div>
          </>
        ) : (
          <div className="small muted">
            Tu ne suis pas ce qui est sorti. Tu joues au jugé.
          </div>
        )}
      </div>

      <Card>
        <Row emoji="👆" title="Toucher — retourner un jeton" />
        <Row emoji="✊" title="Maintenir — empocher le pot" />
      </Card>
    </div>
  );
}
