/**
 * Être connu.
 *
 * L'écran est construit autour d'une distinction que le jeu ne faisait pas :
 * **combien de gens te connaissent** n'a rien à voir avec **ce qu'ils en
 * pensent**, ni avec ce que pensent ceux qui te croisent vraiment. Les trois
 * jauges sont donc affichées ensemble, et jamais fusionnées.
 *
 * Sous elles, la liste de ce qui te fait connaître cette année : c'est la
 * partie qui rend la notoriété jouable plutôt que subie, parce qu'elle dit
 * exactement ce qu'on perdrait en arrêtant.
 *
 * L'interview a son propre écran : c'est une scène, pas un bouton.
 */

import { useState } from 'react';
import { Empty, Gauge, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { compactNumber, money } from '../ui/format.ts';
import {
  INTERVIEW_BEATS, PUBLIC_GIGS, SCANDAL_KINDS, SCANDAL_RESPONSES, getFameField,
  type ScandalResponse,
} from '../data/fame.ts';
import {
  answerInterview, availableGigs, doGig, endInterview, fameDecay,
  fameLabel, fameSources, famePressure, gigBlocker, gigFee, heatLabel, openScandal,
  respondToScandal,
} from '../systems/fame.ts';

export function FameScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [confirming, setConfirming] = useState<ScandalResponse | null>(null);
  if (!state) return null;
  const p = state.player;
  const f = p.fame;

  // L'entretien passe devant tout : on ne laisse pas un journaliste attendre.
  if (f.interview) return <InterviewPane />;

  const field = getFameField(f.field);
  const sources = fameSources(state);
  const pressure = famePressure(state);
  const decay = fameDecay(state);
  const scandal = openScandal(state);
  const gigs = availableGigs(state);

  if (f.level < 3 && sources.length === 0) {
    return (
      <Sheet title="Ton nom" onBack={onBack}>
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            Personne ne sait qui tu es, et c’est le cas de presque tout le monde.
          </p>
          <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
            On devient connu par ce qu’on fait : un métier qui expose, une
            audience qu’on construit, une enseigne dont on parle — ou, moins
            confortablement, un nom qui traîne dans les faits divers.
          </p>
        </Card>
      </Sheet>
    );
  }

  return (
    <Sheet title="Ton nom" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <div className="row-title">{field.emoji} {fameLabel(f.level)}</div>
            <div className="row-sub">Pour beaucoup, tu es {field.billing}.</div>
          </div>
          <Pill tone="primary">{compactNumber(p.followers)}</Pill>
        </div>

        <div className="spread small muted" style={{ marginTop: 14 }}>
          <span>Combien de gens te connaissent</span>
          <span>{Math.round(f.level)}</span>
        </div>
        <Meter value={f.level} />
        <div className="spread small muted" style={{ marginTop: 10 }}>
          <span>Ce qu’on a à te reprocher</span>
          <span>{Math.round(f.controversy)}</span>
        </div>
        <Meter value={f.controversy} tone={f.controversy > 45 ? 'var(--bad)' : 'var(--warn)'} />
        <div className="spread small muted" style={{ marginTop: 10 }}>
          <span>Ce que le public retient de bon</span>
          <span>{Math.round(f.goodwill)}</span>
        </div>
        <Meter value={f.goodwill} />
        <p className="small muted" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
          {heatLabel(f.controversy)}. Ce que pensent de toi les gens qui te
          croisent vraiment est autre chose encore — c’est ta réputation, et
          elle vit dans ta fiche.
        </p>
      </Card>

      {/* ---- L'affaire en cours ---- */}
      {scandal && (
        <Section title="Une affaire">
          <Card pad>
            <div className="row-title">
              {SCANDAL_KINDS.find((k) => k.id === scandal.kindId)?.headline ?? 'Une affaire'}
            </div>
            <p className="small" style={{ margin: '8px 0 0', lineHeight: 1.55 }}>
              {SCANDAL_KINDS.find((k) => k.id === scandal.kindId)?.body}
            </p>
          </Card>
          <Card>
            {SCANDAL_RESPONSES.map((r) => (
              <Row
                key={r.id}
                emoji={r.emoji}
                title={r.label}
                sub={confirming === r.id ? 'Appuie encore pour confirmer' : r.note}
                onClick={() => {
                  if (confirming !== r.id) { setConfirming(r.id); return; }
                  setConfirming(null);
                  run((ctx) => respondToScandal(ctx, r.id), r.emoji);
                }}
                chevron
              />
            ))}
          </Card>
          <p className="small muted" style={{ margin: '10px 4px 0', lineHeight: 1.55 }}>
            Aucune de ces réponses n’est la bonne. Chacune est la meilleure dans
            un cas et la pire dans un autre — et si tu ne réponds pas, l’année
            répondra à ta place, par le silence.
          </p>
        </Section>
      )}

      {/* ---- Ce qui te fait connaître ---- */}
      <Section title="Ce qui te fait connaître">
        {sources.length === 0 ? (
          <Empty>Plus rien n’alimente ton nom.</Empty>
        ) : (
          <Card>
            {sources.map((line) => (
              <Row
                key={line.label}
                emoji={getFameField(line.field).emoji}
                title={line.label}
                sub={getFameField(line.field).label}
                right={<Pill tone="good">+{line.amount.toFixed(1)}</Pill>}
              />
            ))}
          </Card>
        )}
        <Card>
          <Row
            emoji="📉"
            title="Ce que l’année emporte"
            sub="On oublie vite, et d’autant plus vite qu’on est haut"
            right={<Pill tone="bad">−{decay.toFixed(1)}</Pill>}
          />
        </Card>
        <p className="small muted" style={{ margin: '10px 4px 0', lineHeight: 1.55 }}>
          {pressure > decay + 1
            ? 'Tu montes. Ce qui t’expose produit plus que ce que l’oubli emporte.'
            : pressure < decay - 1
              ? 'Tu redescends. Rester connu est un travail, et rien ne le fait plus à ta place.'
              : 'Tu te maintiens, tout juste.'}
        </p>
      </Section>

      {/* ---- Les apparitions ---- */}
      <Section title={`Ce qu’on te propose (${gigs.length})`}>
        {gigs.length === 0 ? (
          <Empty>On ne te propose rien : on ne te connaît pas assez.</Empty>
        ) : (
          <Card>
            {gigs.map((gig) => {
              const blocker = gigBlocker(state, gig);
              const fee = gigFee(state, gig);
              return (
                <Row
                  key={gig.id}
                  emoji={gig.emoji}
                  title={gig.label}
                  sub={gig.what}
                  because={blocker}
                  right={fee > 0
                    ? <Pill tone={fee > 50000 ? 'good' : undefined}>{money(state, fee)}</Pill>
                    : <Pill>bénévole</Pill>}
                  closed={Boolean(blocker)}
                  onClick={() => run((ctx) => doGig(ctx, gig.id), gig.emoji)}
                  chevron={!blocker}
                />
              );
            })}
          </Card>
        )}
        {PUBLIC_GIGS.length > gigs.length && (
          <p className="small muted" style={{ margin: '10px 4px 0', lineHeight: 1.55 }}>
            {PUBLIC_GIGS.length - gigs.length} autre(s) apparition(s) existent, et
            se débloquent en devenant plus connu.
          </p>
        )}
      </Section>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* L'entretien                                                        */
/* ------------------------------------------------------------------ */

/**
 * Une scène, pas un bouton.
 *
 * Trois questions, trois réponses possibles chacune, et aucune n'est bonne :
 * chacune déplace la notoriété, la controverse et l'estime du public dans des
 * directions qui ne vont pas ensemble. L'écran ne conseille rien et n'affiche
 * aucun chiffre de réussite — il donne la question et laisse répondre.
 */
function InterviewPane() {
  const { state, run } = useGame();
  if (!state) return null;
  const interview = state.player.fame.interview;
  if (!interview) return null;

  const index = interview.answers.findIndex((a) => a === -1);
  const beat = index >= 0
    ? INTERVIEW_BEATS.find((b) => b.id === interview.beats[index])
    : undefined;

  return (
    <Sheet title="L’entretien" onBack={() => run((ctx) => endInterview(ctx), '🎙️')}>
      <Card pad>
        <div className="row-title">🎙️ Pour {interview.outlet}</div>
        <div className="row-sub">
          Question {Math.max(1, index + 1)} sur {interview.beats.length}
        </div>
        <div style={{ marginTop: 10 }}>
          <Gauge value={(interview.answers.filter((a) => a !== -1).length
            / interview.beats.length) * 100} />
        </div>
      </Card>

      {beat ? (
        <>
          <Card pad>
            <p style={{ margin: 0, lineHeight: 1.6, fontSize: 16 }}>« {beat.question} »</p>
          </Card>
          <Card>
            {beat.answers.map((answer, i) => (
              <Row
                key={answer.label}
                emoji="💬"
                title={answer.label}
                onClick={() => run((ctx) => answerInterview(ctx, index, i), '🎙️')}
                chevron
              />
            ))}
          </Card>
          <p className="small muted" style={{ margin: '10px 4px 0', lineHeight: 1.55 }}>
            Aucune de ces réponses n’est la bonne. Elles ne font pas connaître,
            ne font pas parler et ne font pas aimer dans les mêmes proportions.
          </p>
        </>
      ) : (
        <Empty>L’entretien est terminé.</Empty>
      )}

      <Section title="">
        <Card>
          <Row
            emoji="🚪"
            title="Retirer ton micro"
            sub="Ce qui a été dit reste dit, et partir se remarque"
            onClick={() => run((ctx) => endInterview(ctx), '🚪')}
            chevron
          />
        </Card>
      </Section>
    </Sheet>
  );
}
