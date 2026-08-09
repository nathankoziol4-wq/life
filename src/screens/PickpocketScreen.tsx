/**
 * L'écran du vol à la tire.
 *
 * Trois temps : choisir une cible, décider si l'on joue ou si l'on laisse le
 * personnage se débrouiller, puis jouer. La scène est volontairement
 * schématique — une silhouette, des points, deux jauges. Il ne s'agit pas de
 * représenter un geste mais de rendre un arbitrage jouable.
 */

import { useState } from 'react';
import { Card, Empty, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { GameGauge, MiniGameHost } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import {
  PICKPOCKET, pickpocketOutcome, targetDifficulty,
  type PickpocketState, type TargetProfile,
} from '../systems/minigames/pickpocket.ts';
import {
  autoPickpocket, availableTargets, pickpocketBlocker, pickpocketContext,
  resolvePickpocket,
} from '../systems/pickpocketing.ts';

export function PickpocketScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [target, setTarget] = useState<TargetProfile | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;

  const blocker = pickpocketBlocker(state);
  const targets = availableTargets(state);
  const context = target ? pickpocketContext(state, target) : null;

  /* --- La partie elle-même --- */
  if (target && context) {
    return (
      <Sheet title={target.label} onBack={() => setTarget(null)}>
        <MiniGameHost
          // Une clé par partie : la coquille ne se réinitialise qu'en étant
          // remontée, et deux cibles à la suite sont deux parties.
          key={`pickpocket-${seed}`}
          def={PICKPOCKET}
          context={context}
          seed={seed}
          render={(s: PickpocketState) => <Scene state={s} />}
          onFinish={(s, result) => {
            const loot = s.taken.reduce((sum, item) => sum + item.value, 0);
            run(
              (ctx) => resolvePickpocket(ctx, {
                profile: target, outcome: pickpocketOutcome(s), loot, result, context,
              }),
              '👛',
            );
            setTarget(null);
            setSeed(Math.floor(Math.random() * 2 ** 31));
            onBack();
          }}
          onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Garde le doigt appuyé sur une poche pour retirer. Lève-le dès qu’elle
          se retourne : la méfiance redescend quand tu ne fais rien.
        </p>
      </Sheet>
    );
  }

  /* --- Le choix de la cible --- */
  return (
    <Sheet title="Vol à la tire" onBack={onBack}>
      {blocker ? (
        <Empty>{blocker}</Empty>
      ) : (
        <>
          <Card pad>
            <p style={{ margin: 0, lineHeight: 1.55 }}>
              La valeur de ce qu’il y a à prendre et l’attention de la personne
              vont ensemble. Un touriste distrait ne porte pas grand-chose ;
              quelqu’un d’aisé fait attention à ce qu’il a.
            </p>
          </Card>

          <Section title="Qui passe en ce moment">
            <Card>
              {targets.map((profile) => {
                const difficulty = targetDifficulty(profile);
                return (
                  <Row
                    key={profile.id}
                    emoji={difficulty > 65 ? '🚫' : difficulty > 40 ? '⚠️' : '🙂'}
                    title={profile.label}
                    sub={[
                      difficulty > 65 ? 'très difficile' : difficulty > 40 ? 'difficile' : 'accessible',
                      profile.wealth > 1.6 ? 'sans doute bien garni' : profile.wealth < 0.8 ? 'peu de chose' : null,
                      profile.crowd > 55 ? 'beaucoup de monde autour' : 'peu de monde',
                    ].filter(Boolean).join(' · ')}
                    onClick={() => setTarget(profile)}
                    chevron
                  />
                );
              })}
            </Card>
          </Section>

          <Section title="Sans jouer">
            <Card>
              {targets.map((profile) => (
                <Row
                  key={profile.id}
                  emoji="🎲"
                  title={`Laisser faire — ${profile.label.toLowerCase()}`}
                  sub="Le personnage se débrouille avec ce qu’il sait faire"
                  onClick={() => { run((ctx) => autoPickpocket(ctx, profile), '👛'); onBack(); }}
                  chevron
                />
              ))}
            </Card>
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Aucune obligation de jouer : la résolution automatique utilise la
              compétence du personnage et passe par les mêmes conséquences.
            </p>
          </Section>
        </>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* La scène                                                           */
/* ------------------------------------------------------------------ */

const MOOD_TEXT: Record<PickpocketState['mood'], { label: string; emoji: string }> = {
  marche: { label: 'elle marche', emoji: '🚶' },
  arrêt: { label: 'elle s’est arrêtée', emoji: '🧍' },
  discute: { label: 'elle discute', emoji: '💬' },
  regarde: { label: 'elle regarde autour d’elle', emoji: '👀' },
};

function Scene({ state: s }: { state: PickpocketState }) {
  const mood = MOOD_TEXT[s.mood];
  const timeLeft = Math.max(0, s.limit - s.elapsed) / 1000;

  return (
    <>
      <div className="scene">
        {/* La silhouette, qui dérive avec la cible. */}
        <div
          className={`scene-target${s.mood === 'regarde' ? ' scene-target-alert' : ''}`}
          style={{ left: `${s.targetX * 100}%` }}
        >
          🧍
        </div>

        {s.pockets.filter((pocket) => !pocket.taken).map((pocket) => (
          <div
            key={pocket.id}
            className="scene-pocket"
            style={{
              left: `${(pocket.x + (s.targetX - 0.5)) * 100}%`,
              top: `${pocket.y * 100}%`,
            }}
          >
            {pocket.emoji}
          </div>
        ))}

        {/* La main du joueur. */}
        <div
          className={`scene-hand${s.pulling ? ' scene-hand-pulling' : ''}`}
          style={{ left: `${s.handX * 100}%`, top: `${s.handY * 100}%` }}
        >
          ✋
        </div>
      </div>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>{mood.emoji} {mood.label}</span>
          <span>{timeLeft.toFixed(0)} s</span>
        </div>
        <GameGauge label="Méfiance" value={s.suspicion} hidden={!s.insight} />
        {s.pulling && <GameGauge label="Retrait en cours" value={s.pull} danger={200} />}
        {s.taken.length > 0 && (
          <div className="chips" style={{ marginTop: 8 }}>
            {s.taken.map((item, i) => (
              <Pill key={`${item.label}_${i}`} tone="good">{item.label}</Pill>
            ))}
          </div>
        )}
        {!s.insight && (
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            Tu n’as pas l’expérience pour sentir si elle se méfie. Ça viendra.
          </p>
        )}
      </div>
    </>
  );
}
