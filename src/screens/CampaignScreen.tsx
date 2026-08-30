/**
 * L'écran de la tribune : faire campagne, puis gouverner.
 *
 * Deux états, et ils n'ont rien à voir. En campagne, tout se lit bloc par
 * bloc : ce que chacun pense de vous, ce que chacun pense de l'autre, et
 * combien il reste de coups à jouer. Une fois élu, l'écran ne montre plus
 * qu'une chose à la fois — la décision de l'année — parce que c'est la seule
 * qu'on puisse prendre.
 *
 * Rien n'est décoratif : chaque chiffre affiché décide de quelque chose au
 * scrutin, et l'écran le dit plutôt que de laisser deviner.
 */

import { useState } from 'react';
import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { GameGauge, MiniGameHost } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import {
  performance as PERFORMANCE, type PerformanceState,
} from '../systems/minigames/performance.ts';
import { autoResolve } from '../engine/minigame.ts';
import {
  BLOCS, FUNDING, MAX_PLANKS, OFFICES, PLANKS, TACTICS, approvalLabel,
  approvalOf, campaignCost, candidacyBlocker, debateBlocker, debateDifficulty,
  decide, declareRun, fundBlocker, fundYield, mandateOf, movesLeft, officeOf,
  officePay, pendingDecision, playTactic, plankBlocker, pollLabel, raiseFunds,
  resign, resignBlocker, settleDebate, share, tacticBlocker, tacticCost,
  togglePlank, warChest,
} from '../systems/politics.ts';
import { getBloc, getPlank, tensionCount } from '../data/politics.ts';
import { fullName } from '../engine/context.ts';

export function CampaignScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [debating, setDebating] = useState(false);
  const [targeting, setTargeting] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;
  const p = state.player;
  const campaign = p.campaign;
  const held = mandateOf(state);

  /* --- Le débat --- */
  if (debating && campaign) {
    const context = {
      skill: p.stage?.disciplineId === 'tribune' ? p.stage.craft : 20,
      difficulty: debateDifficulty(state),
      mode: 'normal' as const,
      grace: {
        time: 1, pressure: 1, tolerance: 40, insight: false,
      },
    };
    return (
      <Sheet title="Le débat" onBack={() => setDebating(false)}>
        <MiniGameHost
          key={`debate-${seed}`}
          def={PERFORMANCE}
          context={context}
          seed={seed}
          render={(s: PerformanceState) => <Podium state={s} />}
          onFinish={(_s, result) => {
            run((ctx) => settleDebate(ctx, result.quality), '🎙️');
            setDebating(false);
            setSeed(Math.floor(Math.random() * 2 ** 31));
          }}
          onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Suis le ton de l’échange du doigt. Quand une attaque s’ouvre, garde
          le doigt appuyé pendant toute sa durée : c’est la réponse qu’on
          retiendra. Ne rien répondre du tout est le pire des choix.
        </p>
      </Sheet>
    );
  }

  /* --- Gouverner --- */
  if (held) {
    const office = officeOf(state)!;
    const decision = pendingDecision(state);
    const approval = approvalOf(state);
    return (
      <Sheet title={office.label} onBack={onBack}>
        <Card pad>
          <div className="spread">
            <div>
              <strong style={{ fontSize: 17 }}>{approvalLabel(approval)}</strong>
              <div className="small muted">
                {held.yearsLeft} an(s) de mandat restant(s)
              </div>
            </div>
            <strong style={{ fontSize: 17 }}>{Math.round(approval)} %</strong>
          </div>
          <div style={{ marginTop: 10 }}><Meter value={approval} /></div>
          <div className="chips" style={{ marginTop: 10 }}>
            <Pill tone="primary">Mandat n° {held.terms}</Pill>
            {held.kept > 0 && <Pill tone="good">{held.kept} promesse(s) tenue(s)</Pill>}
            {held.broken > 0 && <Pill tone="bad">{held.broken} abandonnée(s)</Pill>}
            <Pill tone="good">{money(state, officePay(state, office))}/an</Pill>
          </div>
        </Card>

        {decision ? (
          <Section title="À trancher cette année">
            <Card pad>
              <strong>{decision.title}</strong>
              <p className="small muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
                {decision.brief}
              </p>
            </Card>
            <Card>
              {decision.options.map((option, index) => (
                <Row
                  key={option.label}
                  emoji="⚖️"
                  title={option.label}
                  sub={blocSummary(option.effect)}
                  right={option.cost !== 0
                    ? <Pill tone={option.cost > 0 ? 'warn' : 'good'}>
                        {option.cost > 0 ? '−' : '+'}
                        {money(state, Math.abs(Math.round(officePay(state, office) * option.cost * 3)))}
                      </Pill>
                    : undefined}
                  onClick={() => run((ctx) => decide(ctx, index), '⚖️')}
                  chevron
                />
              ))}
            </Card>
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Ne rien décider est aussi une décision, et celle-là ne plaît à
              personne.
            </p>
          </Section>
        ) : (
          <Section title="À trancher cette année">
            <Empty>Rien sur ton bureau pour le moment.</Empty>
          </Section>
        )}

        <Section title="Ce que pensent les gens">
          <Card>
            {BLOCS.map((bloc) => (
              <Row
                key={bloc.id}
                emoji="🧑‍🤝‍🧑"
                title={bloc.label}
                sub={bloc.note}
                right={<Pill tone={tone(held.approval[bloc.id] ?? 50)}>
                  {Math.round(held.approval[bloc.id] ?? 50)} %
                </Pill>}
              />
            ))}
          </Card>
        </Section>

        {held.promises.length > 0 && (
          <Section title="Ce que tu avais promis">
            <Card>
              {held.promises.map((id) => {
                const plank = getPlank(id);
                if (!plank) return null;
                return (
                  <Row key={id} emoji="📜" title={plank.label} sub={plank.promise} />
                );
              })}
            </Card>
          </Section>
        )}

        {held.record.length > 0 && (
          <Section title="Ce que tu as fait">
            <Card>
              {held.record.map((line, i) => (
                <Row key={i} emoji="·" title={line} />
              ))}
            </Card>
          </Section>
        )}

        <Section title="Partir">
          <Card>
            <Row
              emoji="🚪"
              title="Démissionner"
              sub="On retiendra que tu n’as pas fini"
              because={resignBlocker(state)}
              closed={Boolean(resignBlocker(state))}
              onClick={() => run((ctx) => resign(ctx), '🚪')}
              chevron={!resignBlocker(state)}
            />
          </Card>
        </Section>
      </Sheet>
    );
  }

  /* --- Se présenter --- */
  if (!campaign) {
    return (
      <Sheet title="Se présenter" onBack={onBack}>
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            Une élection ne se gagne pas sur un score mais sur des gens. Six
            catégories d’électeurs qui ne veulent pas la même chose, un
            programme de trois axes au plus, un adversaire qui a un nom, et
            six semaines pour convaincre.
          </p>
        </Card>
        <Section title="Ce à quoi tu peux te présenter">
          <Card>
            {OFFICES.map((office) => {
              const blocker = candidacyBlocker(state, office);
              return (
                <Row
                  key={office.id}
                  emoji="🗳️"
                  title={office.label}
                  sub={office.note}
                  because={blocker}
                  right={<Pill tone={blocker ? undefined : 'accent'}>
                    {money(state, campaignCost(state, office))}
                  </Pill>}
                  closed={Boolean(blocker)}
                  onClick={() => run((ctx) => declareRun(ctx, office.id), '🗳️')}
                  chevron={!blocker}
                />
              );
            })}
          </Card>
        </Section>
      </Sheet>
    );
  }

  /* --- Faire campagne --- */
  const office = OFFICES.find((o) => o.id === campaign.officeId)!;
  const rival = state.npcs[campaign.rivalId];
  const standing = share(campaign);
  const tension = tensionCount(campaign.planks);
  const chest = warChest(state);

  return (
    <Sheet title="Campagne" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>{pollLabel(standing)}</strong>
            <div className="small muted">{office.label.toLowerCase()}</div>
          </div>
          <strong style={{ fontSize: 17 }}>{standing.toFixed(1)} %</strong>
        </div>
        <div style={{ marginTop: 10 }}><Meter value={standing} /></div>
        <div className="chips" style={{ marginTop: 10 }}>
          <Pill tone={movesLeft(state) > 2 ? 'primary' : 'warn'}>
            {movesLeft(state)} coup(s) restant(s)
          </Pill>
          <Pill tone={chest > 0 ? 'good' : 'bad'}>{money(state, chest)} en caisse</Pill>
          {campaign.damage > 20 && (
            <Pill tone="bad">Casseroles : {Math.round(campaign.damage)}</Pill>
          )}
        </div>
        {rival && (
          <p className="small muted" style={{ margin: '10px 0 0' }}>
            En face : {fullName(rival)}, à {(100 - standing).toFixed(1)} %.
          </p>
        )}
      </Card>

      {/* ---------------- Le programme ---------------- */}
      <Section title={`Ton programme — ${campaign.planks.length}/${MAX_PLANKS}`}>
        <Card>
          {PLANKS.map((plank) => {
            const on = campaign.planks.includes(plank.id);
            const blocker = plankBlocker(state, plank.id);
            return (
              <Row
                key={plank.id}
                emoji={on ? '✅' : '·'}
                title={plank.label}
                sub={on ? plank.promise : appealSummary(plank.appeal)}
                // Le refus n'était affiché nulle part : au-delà de trois axes,
                // les suivants devenaient gris sans que « trois axes au plus »
                // se lise jamais. Un axe déjà porté reste retirable, d'où le
                // « && !on ».
                because={blocker}
                closed={Boolean(blocker) && !on}
                onClick={() => run((ctx) => togglePlank(ctx, plank.id), '📜')}
                chevron={!blocker || on}
              />
            );
          })}
        </Card>
        {tension > 0 && (
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Deux de tes axes se contredisent. Ceux qui lisent le programme en
            entier l’ont remarqué.
          </p>
        )}
      </Section>

      {/* ---------------- L'argent ---------------- */}
      <Section title="Financer">
        <Card>
          {FUNDING.map((source) => {
            const blocker = fundBlocker(state, source.id);
            return (
              <Row
                key={source.id}
                emoji="💶"
                title={source.label}
                sub={source.note}
                because={blocker}
                right={<Pill tone={source.damage ? 'warn' : 'good'}>
                  {money(state, fundYield(state, source.id))}
                </Pill>}
                closed={Boolean(blocker)}
                onClick={() => run((ctx) => raiseFunds(ctx, source.id), '💶')}
                chevron={!blocker}
              />
            );
          })}
        </Card>
      </Section>

      {/* ---------------- Les coups ---------------- */}
      <Section title="Faire campagne">
        <Card>
          {TACTICS.map((tactic) => {
            const blocker = tacticBlocker(state, tactic.id);
            return (
              <Row
                key={tactic.id}
                emoji={tactic.id === 'attaque' ? '🗡️' : '📣'}
                title={tactic.label}
                sub={tactic.note}
                because={blocker}
                right={<Pill tone={blocker ? undefined : 'accent'}>
                  {money(state, tacticCost(state, tactic.id))}
                </Pill>}
                closed={Boolean(blocker)}
                onClick={() => {
                  if (tactic.id === 'ciblage') { setTargeting(true); return; }
                  run((ctx) => playTactic(ctx, tactic.id), '📣');
                }}
                chevron={!blocker}
              />
            );
          })}
          <Row
            emoji="🎙️"
            title="Le débat"
            sub="Le seul coup qui dépende de toi et non de ta caisse"
            because={debateBlocker(state)}
            closed={Boolean(debateBlocker(state))}
            onClick={() => setDebating(true)}
            chevron={!debateBlocker(state)}
          />
          {/* La variante automatique disparaissait entièrement dès que le
              débat était fermé — le même motif que « envoyer quelqu'un
              chercher » au grenier. Les deux partagent bien la même porte,
              mais un refus se lit et une absence ne se lit pas. */}
          <Row
            emoji="🎲"
            title="Laisser faire le débat"
            sub="Le personnage s’en charge, avec ce qu’il sait — sans toi"
            because={debateBlocker(state)}
            closed={Boolean(debateBlocker(state))}
            onClick={() => run((ctx) => settleDebate(
              ctx,
              autoResolve(ctx.rng, {
                skill: state.player.stage?.craft ?? 20,
                difficulty: debateDifficulty(state),
                mode: 'normal',
                grace: { time: 1, pressure: 1, tolerance: 40, insight: false },
              }).quality,
            ), '🎙️')}
            chevron={!debateBlocker(state)}
          />
        </Card>
      </Section>

      {/* ---------------- Le ciblage ---------------- */}
      {targeting && (
        <Section title="Viser qui ?">
          <Card>
            {BLOCS.map((bloc) => (
              <Row
                key={bloc.id}
                emoji="🎯"
                title={bloc.label}
                sub={`${bloc.weight} % de l’électorat · ${
                  Math.round(bloc.turnout * 100)} % vont voter`}
                right={<Pill tone={tone(campaign.polls[bloc.id] ?? 0)}>
                  {Math.round(campaign.polls[bloc.id] ?? 0)}
                </Pill>}
                onClick={() => {
                  run((ctx) => playTactic(ctx, 'ciblage', bloc.id), '🎯');
                  setTargeting(false);
                }}
                chevron
              />
            ))}
          </Card>
        </Section>
      )}

      {/* ---------------- Les sondages ---------------- */}
      <Section title="Les sondages">
        <Card>
          {BLOCS.map((bloc) => {
            const mine = campaign.polls[bloc.id] ?? 0;
            const theirs = campaign.rivalPolls[bloc.id] ?? 0;
            return (
              <Row
                key={bloc.id}
                emoji={mine > theirs ? '🔵' : '⚪'}
                title={bloc.label}
                sub={`${bloc.weight} % de l’électorat · ${
                  Math.round(bloc.turnout * 100)} % vont voter · en face ${
                  Math.round(theirs)}`}
                right={<Pill tone={mine > theirs ? 'good' : 'warn'}>
                  {Math.round(mine)}
                </Pill>}
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Un bloc pèse ce qu’il représente <em>multiplié par</em> ce qui se
          déplace. Convaincre ceux qui ne votent pas ne rapporte rien.
        </p>
      </Section>

      {campaign.log.length > 0 && (
        <Section title="Ta campagne">
          <Card>
            {campaign.log.map((line, i) => <Row key={i} emoji="·" title={line} />)}
          </Card>
        </Section>
      )}
    </Sheet>
  );
}

/** Ce qu'un axe fait, en une phrase lisible. */
function appealSummary(appeal: Partial<Record<string, number>>): string {
  const wins: string[] = [];
  const losses: string[] = [];
  for (const [blocId, amount] of Object.entries(appeal)) {
    const label = getBloc(blocId)?.label.replace(/^Les /, '') ?? blocId;
    // Seuil bas volontairement : à six points, « Attirer et former » ne
    // montrait aucun perdant et se lisait comme un choix gratuit, alors que
    // les données en ont un. Cacher le coût d'un axe le fait mentir.
    if ((amount as number) >= 3) wins.push(label);
    else if ((amount as number) <= -3) losses.push(label);
  }
  const parts: string[] = [];
  if (wins.length > 0) parts.push(`plaît à ${wins.join(', ')}`);
  if (losses.length > 0) parts.push(`fâche ${losses.join(', ')}`);
  return parts.join(' · ') || 'ne bouge pas grand-chose';
}

/** Ce qu'une décision fait, en une phrase lisible. */
function blocSummary(effect: Partial<Record<string, number>>): string {
  return appealSummary(effect);
}

function tone(value: number): 'good' | 'warn' | 'bad' {
  if (value >= 55) return 'good';
  if (value >= 40) return 'warn';
  return 'bad';
}

/** La scène du débat : la même que celle d'une prestation, autrement nommée. */
function Podium({ state: s }: { state: PerformanceState }) {
  const beat = s.active !== null ? s.beats[s.active] : null;
  const timeLeft = Math.max(0, (s.limit - s.elapsed) / 1000);
  const landed = s.beats.filter((b) => b.landed).length;
  return (
    <>
      <div className="scene">
        <div
          className="scene-band"
          style={{
            left: `${Math.max(0, (s.line - s.band) * 100)}%`,
            width: `${s.band * 200}%`,
          }}
        />
        <div className="scene-line" style={{ left: `${s.line * 100}%` }} />
        <div
          className={`scene-cursor${beat ? ' scene-cursor-beat' : ''}`}
          style={{ left: `${s.cursor * 100}%` }}
        >
          {beat ? '❗' : '●'}
        </div>
        {beat && <div className="scene-beat">une attaque — réponds</div>}
      </div>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>le ton de l’échange</span>
          <span>{timeLeft.toFixed(0)} s</span>
        </div>
        <GameGauge label="Justesse" value={s.accuracy} low danger={60} />
        <GameGauge label="La salle" value={s.audience} low danger={55} />
        <div className="chips" style={{ marginTop: 8 }}>
          <Pill tone={landed > 0 ? 'good' : undefined}>
            {landed}/{s.beats.length} réponse(s)
          </Pill>
          {s.slips > 3 && <Pill tone="warn">{s.slips} faux pas</Pill>}
        </div>
      </div>
    </>
  );
}
