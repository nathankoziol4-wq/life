/**
 * L'écran du cambriolage, et de la fuite qui suit parfois.
 *
 * Le plan est dessiné en cases : c'est lisible sur un téléphone et ça se
 * calcule sans bibliothèque. Le doigt donne une destination, le personnage y
 * va ; le maintien sert à fouiller, puis à courir pendant la fuite.
 *
 * Le point important de cet écran est l'enchaînement : quand le cambriolage
 * se termine par « quelqu'un t'a vu », on ne referme pas avec un message, on
 * ouvre la course.
 */

import { useState } from 'react';
import { Empty, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { GameGauge, MiniGameHost, StartWhenReady } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import {
  BURGLARY, bagValue, burglaryOutcome, type BurglaryState,
} from '../systems/minigames/burglary.ts';
import { CHASE, type ChaseState } from '../systems/minigames/chase.ts';
import { PlanGrid, Token } from '../components/PlanView.tsx';
import {
  autoBurglary, availableHouses, burglaryBlocker, burglaryContext, chaseContext,
  resolveBurglary, resolveEscape, type HouseTarget,
} from '../systems/burglary.ts';
import type { ChaseSetup } from '../systems/minigames/chase.ts';

type Phase =
  | { kind: 'choix' }
  | { kind: 'maison'; target: HouseTarget }
  | { kind: 'fuite'; setup: ChaseSetup; loot: number };

export function BurglaryScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [phase, setPhase] = useState<Phase>({ kind: 'choix' });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;

  const blocker = burglaryBlocker(state);

  /* --- La fuite --- */
  if (phase.kind === 'fuite') {
    const context = chaseContext(state, phase.setup);
    return (
      <Sheet title="Cours" onBack={onBack}>
        {/* La course ne commence pas derrière le message qui l'annonce :
            elle est perdue en une seconde si personne ne tient la barre. */}
        <StartWhenReady waiting={<Empty>Ils arrivent. Ferme le message.</Empty>}>
          <MiniGameHost
            // La maison et la course sont deux parties distinctes, au même
            // endroit de l'arbre : sans clé, React réutiliserait la coquille du
            // cambriolage et la fuite ne démarrerait jamais.
            key={`chase-${seed}`}
            def={CHASE}
            context={context}
            seed={seed}
            render={(s: ChaseState) => <ChaseScene state={s} />}
            onFinish={(s, result) => {
              run(
                (ctx) => resolveEscape(ctx, {
                  crimeId: 'burglary',
                  escaped: s.over === 'échappé',
                  loot: phase.loot,
                  result,
                }),
                '🏃',
              );
              onBack();
            }}
            onQuit={() => { /* abandonner, c'est se laisser rattraper */ }}
          />
        </StartWhenReady>
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Maintiens l’appui pour courir : c’est plus rapide, mais le souffle
          s’épuise. Les obstacles sont ton avantage, pas ta vitesse.
        </p>
      </Sheet>
    );
  }

  /* --- La maison --- */
  if (phase.kind === 'maison') {
    const context = burglaryContext(state, phase.target);
    return (
      <Sheet title={phase.target.label} onBack={() => setPhase({ kind: 'choix' })}>
        <MiniGameHost
          key={`burglary-${seed}`}
          def={BURGLARY}
          context={context}
          seed={seed}
          render={(s: BurglaryState) => <HouseScene state={s} />}
          onFinish={(s, result) => {
            const loot = bagValue(s);
            const outcome = burglaryOutcome(s);
            const answer = run(
              (ctx) => resolveBurglary(ctx, { target: phase.target, outcome, loot, result, context }),
              '🏠',
            );
            setSeed(Math.floor(Math.random() * 2 ** 31));
            // Quand il y a une course à faire, on enchaîne au lieu de conclure.
            const chase = (answer as { chase?: ChaseSetup }).chase;
            if (chase) setPhase({ kind: 'fuite', setup: chase, loot });
            else onBack();
          }}
          onQuit={() => { /* sortir par la porte suffit ; le jeu le voit */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Touche le plan pour te déplacer. Reste appuyé sur un objet pour le
          prendre. Ressors par la porte du bas quand tu juges que ça suffit.
        </p>
      </Sheet>
    );
  }

  /* --- Le choix de la maison --- */
  return (
    <Sheet title="Cambriolage" onBack={onBack}>
      {blocker ? (
        <Empty>{blocker}</Empty>
      ) : (
        <>
          <Card pad>
            <p style={{ margin: 0, lineHeight: 1.55 }}>
              Ce qui décide n’est pas d’entrer, c’est de savoir repartir. Le sac
              a une contenance, le bruit monte, et quelqu’un finit toujours par
              rentrer.
            </p>
          </Card>

          <Section title="Ce que tu as repéré">
            <Card>
              {availableHouses(state).map((target) => (
                <Row
                  key={target.id}
                  emoji={target.difficulty > 70 ? '🚫' : target.difficulty > 40 ? '⚠️' : '🏠'}
                  title={target.label}
                  sub={target.hint}
                  right={<Pill tone={target.difficulty > 70 ? 'bad' : target.difficulty > 40 ? 'warn' : 'good'}>
                    {target.setup.occupants === 0 ? 'vide' : `${target.setup.occupants} dedans`}
                  </Pill>}
                  onClick={() => setPhase({ kind: 'maison', target })}
                  chevron
                />
              ))}
            </Card>
          </Section>

          <Section title="Sans jouer">
            <Card>
              {availableHouses(state).map((target) => (
                <Row
                  key={target.id}
                  emoji="🎲"
                  title={`Laisser faire — ${target.label.toLowerCase()}`}
                  sub="Le personnage se débrouille, fuite comprise"
                  onClick={() => { run((ctx) => autoBurglary(ctx, target), '🏠'); onBack(); }}
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

function HouseScene({ state: s }: { state: BurglaryState }) {
  const weight = s.bag.reduce((sum, item) => sum + item.weight, 0);
  const searching = s.searching
    ? s.loot.find((item) => item.id === s.searching)
    : null;

  return (
    <>
      <PlanGrid plan={s.plan}>
        {s.loot.filter((item) => !item.taken).map((item) => (
          <Token key={item.id} plan={s.plan} x={item.x} y={item.y} className="plan-loot">
            {item.emoji}
          </Token>
        ))}
        {s.occupants.map((occ) => (
          <Token key={occ.id} plan={s.plan} x={occ.mover.x} y={occ.mover.y} className="plan-occupant">
            {occ.emoji}
          </Token>
        ))}
        <Token plan={s.plan} x={s.player.x} y={s.player.y} className="plan-player">🥷</Token>
      </PlanGrid>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>Sac : {weight}/{s.capacity}</span>
          <span>{Math.max(0, (s.limit - s.elapsed) / 1000).toFixed(0)} s</span>
        </div>
        <GameGauge label="Bruit" value={s.noise} hidden={!s.insight} />
        {searching && (
          <GameGauge
            label={`Fouille : ${searching.label}`}
            value={(s.searchProgress / searching.time) * 100}
            // Une fouille qui avance est une bonne nouvelle : jamais d'alerte.
            danger={Number.POSITIVE_INFINITY}
          />
        )}
        {s.bag.length > 0 && (
          <div className="chips" style={{ marginTop: 8 }}>
            {s.bag.map((item, i) => (
              <Pill key={`${item.label}_${i}`} tone="good">{item.label}</Pill>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ChaseScene({ state: s }: { state: ChaseState }) {
  const closest = s.pursuers.length === 0 ? 99 : Math.min(
    ...s.pursuers.map((p) => Math.hypot(p.mover.x - s.player.x, p.mover.y - s.player.y)),
  );

  return (
    <>
      <PlanGrid plan={s.plan}>
        {s.exits.map((exit, i) => (
          <Token key={`exit_${i}`} plan={s.plan} x={exit.x} y={exit.y} className="plan-loot">🚪</Token>
        ))}
        {s.pursuers.map((p) => (
          <Token key={p.id} plan={s.plan} x={p.mover.x} y={p.mover.y} className="plan-occupant">
            {p.emoji}
          </Token>
        ))}
        <Token plan={s.plan} x={s.player.x} y={s.player.y} className="plan-player">🏃</Token>
      </PlanGrid>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>{closest < 2 ? 'ils sont sur toi' : closest < 5 ? 'ils sont proches' : 'tu prends de l’avance'}</span>
          <span>{Math.max(0, (s.limit - s.elapsed) / 1000).toFixed(0)} s</span>
        </div>
        <GameGauge label="Souffle" value={s.stamina} danger={70} low />
      </div>
    </>
  );
}
