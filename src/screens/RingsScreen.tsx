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
import { HEIST, haulOf, windowOf, type HeistState } from '../systems/minigames/heist.ts';
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

/* ------------------------------------------------------------------ */
/* Le minutage                                                         */
/* ------------------------------------------------------------------ */

/**
 * La scène du minutage.
 *
 * Un cadran, une aiguille, une fenêtre, une jauge. Rien de ce qui s'affiche ne
 * décrit un lieu, un outil ou une façon de faire : c'est un jeu de tempo, et
 * l'on pourrait en changer tous les mots sans rien changer au jeu.
 *
 * **Ce que l'écran ne montre pas :** jusqu'où l'alerte peut monter. C'est ce
 * qui fait de « pousser encore une passe » un pari plutôt qu'un calcul.
 */
export function HeistScene({ state }: { state: HeistState }) {
  const half = windowOf(state);
  return (
    <div style={{ display: 'grid', gap: 14, padding: 12 }}>
      <div className="chips" style={{ justifyContent: 'center' }}>
        <Pill tone={state.alert > 70 ? 'bad' : state.alert > 45 ? 'warn' : undefined}>
          alerte {Math.round(state.alert)}
        </Pill>
        <Pill tone={state.taken > 0 ? 'good' : undefined}>{state.taken} passe(s)</Pill>
        {state.lastHit !== null && (
          <Pill tone={state.lastHit ? 'good' : 'bad'}>
            {state.lastHit ? 'dans la fenêtre' : 'à côté'}
          </Pill>
        )}
      </div>

      {/* Le cadran : la fenêtre en clair, l'aiguille dessus. */}
      <div style={{
        position: 'relative', height: 40, borderRadius: 8,
        background: 'var(--surface-2, var(--surface))', border: '1px solid var(--line)',
        overflow: 'hidden',
      }}
      >
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${Math.max(0, (state.mark - half) * 100)}%`,
          width: `${Math.min(100, half * 200)}%`,
          background: 'var(--good)', opacity: 0.28,
        }}
        />
        <div style={{
          position: 'absolute', top: 2, bottom: 2, width: 3, marginLeft: -1,
          left: `${state.needle * 100}%`, background: 'var(--text)', borderRadius: 2,
        }}
        />
      </div>

      <p className="small muted" style={{ margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
        Maintiens, puis lâche quand l’aiguille est dans la zone claire. Chaque
        passe rapporte — et rend la suivante plus chère. Tu ne sais pas jusqu’où
        l’alerte peut monter : c’est à toi de décider quand partir.
      </p>
    </div>
  );
}

/** L'écran du minutage, avec sa feuille et son hôte. */
export function HeistScreen({
  title, context, seed, onDone, onBack,
}: {
  title: string;
  context: MiniGameContext;
  seed: number;
  /** Ce qu'on emporte : `null` si l'on s'est fait prendre. */
  onDone: (haul: number | null) => void;
  onBack: () => void;
}) {
  return (
    <Sheet title={title} onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.55 }}>
          Ce qui se joue ici est du temps : une aiguille, une fenêtre, et le
          moment de s’en aller. Rester rapporte plus. Rester trop ne rapporte
          rien du tout.
        </p>
      </Card>
      <MiniGameHost
        key={`heist-${seed}`}
        def={HEIST}
        context={context}
        seed={seed}
        render={(x: HeistState) => <HeistScene state={x} />}
        onFinish={(x) => onDone(x.over === 'parti' && x.taken > 0 ? haulOf(x) : null)}
        onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
      />
    </Sheet>
  );
}
