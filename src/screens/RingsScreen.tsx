/**
 * Écran du boîtier.
 *
 * Deux délits du catalogue se réglaient par un tirage — « Vol de véhicule » et
 * « Vol à l'étalage », tous deux notés « aucun puzzle ». Ils se jouent
 * maintenant, et ce qui se joue est **un objet inventé** : des anneaux
 * concentriques engrenés les uns dans les autres, qui ne reproduisent aucun
 * mécanisme réel. Rien de ce que le joueur apprend ici ne s'applique ailleurs
 * qu'à ce jouet.
 *
 * L'écran ne dit pas la règle de couplage — que toucher un anneau entraîne
 * ceux du dedans. Il la montre : on touche, on voit trois repères bouger
 * ensemble, on comprend. C'est ce qu'un puzzle doit faire.
 */

import { MiniGameHost } from '../components/MiniGameHost.tsx';
import { Pill, Sheet } from '../components/Modal.tsx';
import { Card } from '../ui/components/list.tsx';
import { RINGS, type RingsState } from '../systems/minigames/rings.ts';
import type { MiniGameContext } from '../engine/minigame.ts';

/** Un anneau, vu de face : un arc et son repère. */
function Ring({ state, index }: { state: RingsState; index: number }) {
  const mark = state.rings[index] ?? 0;
  const placed = mark === 0;
  // Ce qu'on montre du repère dépend de ce qu'on voit : au-delà d'une certaine
  // difficulté, on ne sait d'abord que « en place ou non ».
  const shown = state.reveal >= 0.6 || !state.blind;
  const turn = (mark / state.notches) * 360;
  const size = 92 - index * 14;
  return (
    <div
      style={{
        position: 'relative', width: size, height: size, borderRadius: '50%',
        border: `3px solid ${placed ? 'var(--good)' : 'var(--line)'}`,
        display: 'grid', placeItems: 'center',
        transition: 'border-color 140ms',
      }}
    >
      {shown ? (
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            transform: `rotate(${turn}deg)`, transition: 'transform 160ms',
          }}
        >
          <div style={{
            position: 'absolute', top: -5, left: '50%', marginLeft: -4,
            width: 8, height: 8, borderRadius: '50%',
            background: placed ? 'var(--good)' : 'var(--text)',
          }}
          />
        </div>
      ) : (
        <div className="small muted" style={{ fontSize: 10 }}>{placed ? '✓' : '?'}</div>
      )}
    </div>
  );
}

export function RingsScene({ state }: { state: RingsState }) {
  return (
    <div style={{ display: 'grid', gap: 12, placeItems: 'center', padding: 12 }}>
      <div className="chips">
        <Pill tone={state.attention > 70 ? 'bad' : state.attention > 40 ? 'warn' : undefined}>
          attention {Math.round(state.attention)}
        </Pill>
        <Pill>{state.taps} geste(s)</Pill>
        {state.blind && (
          <Pill tone={state.reveal >= 0.6 ? 'good' : undefined}>
            {state.reveal >= 0.6 ? 'tu vois les repères' : 'maintiens pour écouter'}
          </Pill>
        )}
      </div>
      {/*
        Les anneaux sont empilés du plus grand au plus petit, et chacun occupe
        sa bande horizontale : toucher la bande, c'est toucher l'anneau. C'est
        ce qui rend la règle de couplage lisible — on touche en haut, tout
        bouge ; on touche en bas, un seul bouge.
      */}
      <div style={{ display: 'grid', gap: 6, placeItems: 'center' }}>
        {state.rings.map((_, i) => <Ring key={i} state={state} index={i} />)}
      </div>
      <p className="small muted" style={{ margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
        Ramène chaque repère en haut. Toucher un anneau entraîne ceux du dedans —
        commence donc par le plus grand.
      </p>
    </div>
  );
}

/** L'écran complet, avec sa feuille et son hôte. */
export function RingsScreen({
  title, context, seed, onDone, onBack,
}: {
  title: string;
  context: MiniGameContext;
  seed: number;
  onDone: (opened: boolean) => void;
  onBack: () => void;
}) {
  return (
    <Sheet title={title} onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.55 }}>
          Un boîtier qui n’existe nulle part ailleurs que dans ce jeu. Il
          s’ouvre en remettant chaque repère en haut, et il n’aime pas qu’on
          s’y reprenne : chaque geste s’entend.
        </p>
      </Card>
      <MiniGameHost
        key={`rings-${seed}`}
        def={RINGS}
        context={context}
        seed={seed}
        render={(x: RingsState) => <RingsScene state={x} />}
        onFinish={(x) => onDone(x.over === 'ouvert')}
        onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
      />
    </Sheet>
  );
}
