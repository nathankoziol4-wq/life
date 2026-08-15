/**
 * L'écran des défis et du cabinet.
 *
 * Deux choses, et elles ne vivent pas au même endroit.
 *
 * **Ce que tu portes** est en haut, parce que c'est la seule chose sur
 * laquelle tu peux agir aujourd'hui : les étapes s'y voient une par une, et le
 * serment est rappelé en toutes lettres — un joueur qui rompt un serment doit
 * l'avoir lu.
 *
 * **Le cabinet** est en bas. Il ne donne rien : il enregistre, avec le nom de
 * la vie qui a gagné chaque pièce et l'année. C'est la seule mémoire du jeu
 * qui traverse les parties, et sa fonction est d'ouvrir les paliers suivants —
 * pas de rendre plus fort.
 */

import { useState } from 'react';
import { Card, Empty, Meter, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import {
  CHALLENGES, abandon, entryFor, getChallenge, getVaultPiece, getVow,
  progressOf, scopeLabel, settledOf, shownChallenges, stepsOf, take,
  takeBlocker, takenOf, tierCost, tierLabel, vaultPieces, viewOf,
} from '../systems/challenges.ts';
import { MAX_TAKEN, type Challenge } from '../data/challenges.ts';

export function ChallengeScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  if (!state) return null;

  const vault = vaultPieces();
  const taken = takenOf(state);
  const settled = settledOf(state);
  // Un seul relevé de vie pour tout l'écran : il parcourt les PNJ plusieurs
  // fois, et l'écran liste dix-sept défis.
  const view = viewOf(state);

  /* --- Un défi en particulier --- */
  const shown = open ? getChallenge(open) : null;
  if (shown) {
    const entry = entryFor(state, shown.id);
    const steps = stepsOf(state, shown, view);
    const vow = shown.vow ? getVow(shown.vow) : undefined;
    const why = takeBlocker(state, shown);
    const held = Boolean(entry && !entry.failed && entry.doneYear === null);
    return (
      <Sheet title={shown.label} onBack={() => setOpen(null)}>
        <Card pad>
          <div className="chips" style={{ marginBottom: 10 }}>
            <Pill tone="primary">{scopeLabel(shown.scope)}</Pill>
            <Pill>{tierLabel(shown.tier)}</Pill>
            {entry?.doneYear && <Pill tone="good">Mené au bout en {entry.doneYear}</Pill>}
            {entry?.failed && <Pill tone="bad">Perdu</Pill>}
          </div>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{shown.brief}</p>
        </Card>

        {vow && (
          <Section title="Ce que tu t’interdis">
            <Card pad>
              <strong>{vow.label}</strong>
              <p className="small" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
                {vow.note}
              </p>
              <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                Vérifié chaque année. Rompu, le défi est perdu et ne se reprend
                pas dans cette vie.
              </p>
            </Card>
          </Section>
        )}

        <Section title="Les étapes">
          <Card>
            {steps.map((step, i) => (
              <Row
                key={i}
                emoji={step.done ? '✅' : step.hidden ? '❔' : '⬜'}
                title={step.hidden ? 'Pas encore visible' : step.label}
                sub={step.hidden
                  ? 'Une piste ne montre que le pas suivant'
                  : step.done ? 'Franchie' : 'Pas encore'}
              />
            ))}
          </Card>
          <div style={{ marginTop: 10 }}>
            <Meter value={progressOf(state, shown, view) * 100} />
          </div>
        </Section>

        <Section title={held ? 'Y renoncer' : 'Le prendre'}>
          <Card>
            {held ? (
              <Row
                emoji="🚪"
                title="Abandonner"
                sub="Il ne se reprend pas dans cette vie. Rien d’autre ne t’en coûtera."
                onClick={() => { run((ctx) => abandon(ctx, shown.id), '🚪'); setOpen(null); }}
                chevron
              />
            ) : (
              <Row
                emoji="🎯"
                title="Prendre ce défi"
                sub={why ?? (vow
                  ? `Tu t’engages, et le serment vaut à partir de maintenant`
                  : 'Rien ne t’y oblige, et rien ne t’en dispense ensuite')}
                disabled={Boolean(why)}
                onClick={why ? undefined : () => { run((ctx) => take(ctx, shown.id), '🎯'); setOpen(null); }}
                chevron={!why}
              />
            )}
          </Card>
        </Section>
      </Sheet>
    );
  }

  /* --- Le sommaire --- */
  const available = shownChallenges();
  const locked = CHALLENGES.filter((c) => !available.includes(c));

  return (
    <Sheet title="Défis" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>
              {taken.length} / {MAX_TAKEN} en cours
            </strong>
            <div className="small muted">
              {vault.length} pièce(s) au cabinet
            </div>
          </div>
        </div>
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          Un défi n’est pas ce que ton personnage veut — ça, ce sont ses
          ambitions — ni ce que sa vie aura été. C’est ce que tu décides d’en
          faire, et la plupart se paient d’un serment.
        </p>
      </Card>

      {/* ---------------- En cours ---------------- */}
      <Section title="Ce que tu portes">
        {taken.length === 0 ? (
          <Empty>Rien pour l’instant. Cette vie n’a de sens que celui que tu lui donnes.</Empty>
        ) : (
          <Card>
            {taken.map((t) => {
              const challenge = getChallenge(t.id);
              if (!challenge) return null;
              return (
                <ChallengeRow
                  key={t.id}
                  challenge={challenge}
                  progress={progressOf(state, challenge, view)}
                  onOpen={() => setOpen(challenge.id)}
                />
              );
            })}
          </Card>
        )}
      </Section>

      {/* ---------------- À prendre ---------------- */}
      <Section title="Ce que tu peux tenter">
        <Card>
          {available
            .filter((c) => !taken.some((t) => t.id === c.id))
            .filter((c) => !settled.some((t) => t.id === c.id))
            .map((challenge) => (
              <ChallengeRow
                key={challenge.id}
                challenge={challenge}
                progress={progressOf(state, challenge, view)}
                onOpen={() => setOpen(challenge.id)}
              />
            ))}
        </Card>
        {locked.length > 0 && (
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            {locked.length} autre(s) attendent que le cabinet se remplisse. Le
            palier suivant demande {tierCost(Math.min(...locked.map((c) => c.tier)))} pièce(s).
          </p>
        )}
      </Section>

      {/* ---------------- Terminés dans cette vie ---------------- */}
      {settled.length > 0 && (
        <Section title="Dans cette vie">
          <Card>
            {settled.map((t) => {
              const challenge = getChallenge(t.id);
              if (!challenge) return null;
              return (
                <Row
                  key={t.id}
                  emoji={t.doneYear ? '🏆' : '✖️'}
                  title={challenge.label}
                  sub={t.doneYear
                    ? `Mené au bout en ${t.doneYear}`
                    : t.failed === 'abandon'
                      ? 'Abandonné'
                      : `Serment rompu — ${getVow(t.failed ?? '')?.label.toLowerCase() ?? ''}`}
                  onClick={() => setOpen(challenge.id)}
                  chevron
                />
              );
            })}
          </Card>
        </Section>
      )}

      {/* ---------------- Le cabinet ---------------- */}
      <Section title="Le cabinet">
        {vault.length === 0 ? (
          <Empty>Vide. Il ne se remplit qu’en menant un défi jusqu’au bout.</Empty>
        ) : (
          <Card>
            {vault.map((trophy) => {
              const piece = getVaultPiece(trophy.pieceId);
              return (
                <Row
                  key={trophy.pieceId}
                  emoji={piece?.emoji ?? '·'}
                  title={piece?.label ?? trophy.pieceId}
                  sub={`${trophy.who}, ${trophy.age} ans, en ${trophy.year} — ${piece?.note ?? ''}`}
                />
              );
            })}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Le cabinet survit à la mort et aux parties neuves. Il ne donne rien —
          pas un point, pas une pièce de monnaie — et il ouvre les paliers
          suivants. Un cabinet qui rendrait plus fort ferait de la difficulté
          une affaire de patience.
        </p>
      </Section>
    </Sheet>
  );
}

function ChallengeRow({
  challenge, progress, onOpen,
}: {
  challenge: Challenge;
  progress: number;
  onOpen: () => void;
}) {
  const vow = challenge.vow ? getVow(challenge.vow) : undefined;
  return (
    <Row
      emoji={challenge.scope === 'chasse' ? '🧭' : challenge.scope === 'lignée' ? '🧬' : '🎯'}
      title={challenge.label}
      sub={vow ? `${scopeLabel(challenge.scope)} · ${vow.label.toLowerCase()}` : scopeLabel(challenge.scope)}
      right={<Pill tone={progress >= 1 ? 'good' : progress > 0 ? 'primary' : undefined}>
        {Math.round(progress * 100)} %
      </Pill>}
      onClick={onOpen}
      chevron
    />
  );
}
