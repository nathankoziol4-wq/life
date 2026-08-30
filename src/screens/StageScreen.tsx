/**
 * L'écran des métiers de scène.
 *
 * Trois temps, comme le système : ce qu'on est devenu, ce qu'on nous propose,
 * et l'engagement qu'on tient. Rien n'est décoratif — chaque chiffre affiché
 * décide de quelque chose ailleurs, et l'écran le dit plutôt que de laisser
 * deviner.
 */

import { useState } from 'react';
import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { GameGauge, MiniGameHost } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { performance as PERFORMANCE, type PerformanceSetup, type PerformanceState } from '../systems/minigames/performance.ts';
import {
  acceptOffer, agentOf, autoPerform, availableDisciplines, breakContract,
  coachBlocker, coachOf, contractOffer, craftLabel, crewCandidates, crewCut,
  crewOf, crewQuality, declineOffer, disciplineBlocker, disciplineOf,
  dismissAgent, dismissMember, hireAgent, hireCoach, offerBlocker,
  pendingAccolades, quitDiscipline, recruit, recruitBlocker, rehearse,
  rehearseBlocker, settleJob, signContract, startDiscipline, templateOf,
  performanceContext,
} from '../systems/stage.ts';
import { ACCOLADES, DISCIPLINES, receptionLabel } from '../data/stage.ts';
import { fullName } from '../engine/context.ts';
import { RecordsScreen } from './RecordsScreen.tsx';
import { bestChart, chartLabel, musicOf, released, royaltiesOf } from '../systems/records.ts';
import {
  APPROACHES, PIECE_KINDS, askTryout, autoTryout, bookLabel, bookPieces,
  bookStrength, bookSummary, missingPieces, settleTryout, shoot,
  shootBlocker, shootCost, tryoutBlocker, tryoutContext, tryoutOf,
  tryoutTargets, reach,
} from '../systems/casting.ts';

export function StageScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [playing, setPlaying] = useState(false);
  const [discs, setDiscs] = useState(false);
  const [aiming, setAiming] = useState<string | null>(null);
  const [trying, setTrying] = useState(false);
  const [auditions, setAuditions] = useState<
    { id: string; level: number; temper: number; note: string }[]
  >([]);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;
  const p = state.player;
  const stage = p.stage;
  const discipline = disciplineOf(state);

  /* --- La prestation --- */
  const context = performanceContext(state);
  if (playing && context && stage?.current) {
    const setup = context.setup as PerformanceSetup;
    return (
      <Sheet title={templateOf(stage.current)?.label ?? 'Prestation'} onBack={() => setPlaying(false)}>
        <MiniGameHost
          key={`performance-${seed}`}
          def={PERFORMANCE}
          context={context}
          seed={seed}
          render={(s: PerformanceState) => <Scene state={s} setup={setup} />}
          onFinish={(_s, result) => {
            run((ctx) => settleJob(ctx, result), discipline?.emoji ?? '🎭');
            setPlaying(false);
            setSeed(Math.floor(Math.random() * 2 ** 31));
          }}
          onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Déplace le doigt pour suivre {setup.lineName}. Quand {setup.beatName} s’ouvre,
          garde le doigt appuyé pendant toute sa durée : c’est ce qu’on retiendra.
          Ne rien tenter est le pire des choix.
        </p>
      </Sheet>
    );
  }

  /* --- L'essai --- */
  const tryCtx = tryoutContext(state);
  if (trying && tryCtx && tryoutOf(state)) {
    const setup = tryCtx.setup as PerformanceSetup;
    return (
      <Sheet title={setup.label} onBack={() => setTrying(false)}>
        <MiniGameHost
          key={`tryout-${seed}`}
          def={PERFORMANCE}
          context={tryCtx}
          seed={seed}
          render={(s: PerformanceState) => <Scene state={s} setup={setup} />}
          onFinish={(_s, result) => {
            run((ctx) => settleTryout(ctx, result), '🎯');
            setTrying(false);
            setSeed(Math.floor(Math.random() * 2 ** 31));
          }}
          onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Un essai est court : tu n’as pas le temps de t’installer. Suis ce
          qu’on te demande, et tiens les moments qui sont à toi — c’est sur
          eux qu’on décidera.
        </p>
      </Sheet>
    );
  }

  if (discs && musicOf(state)) return <RecordsScreen onBack={() => setDiscs(false)} />;

  /* --- Se lancer --- */
  if (!stage || !discipline) {
    const open = availableDisciplines(state);
    return (
      <Sheet title="Monter sur scène" onBack={onBack}>
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            Cinq métiers où l’on ne choisit pas ce qu’on veut faire, mais parmi
            ce qu’on vous propose. Ce qui arrive sur la table dépend de ce que
            vous savez faire et de ce qu’on sait de vous.
          </p>
        </Card>
        <Section title="Ce qui est encore possible">
          <Card>
            {DISCIPLINES.map((d) => {
              const blocker = disciplineBlocker(state, d);
              return (
                <Row
                  key={d.id}
                  emoji={d.emoji}
                  title={d.label}
                  sub={d.what}
                  closed={Boolean(blocker)}
                  because={blocker}
                  onClick={() => {
                    const outcome = run((ctx) => startDiscipline(ctx, d.id), d.emoji);
                    if (!outcome.ok) return;
                  }}
                  chevron={!blocker}
                />
              );
            })}
          </Card>
          {open.length === 0 && (
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Aucune de ces voies ne t’est ouverte cette année.
            </p>
          )}
        </Section>
      </Sheet>
    );
  }

  /* --- La carrière en cours --- */
  const agent = agentOf(state);
  const blocker = offerBlocker(state);
  const current = stage.current;
  const template = current ? templateOf(current) : undefined;
  const pending = pendingAccolades(state);
  const reachOf = reach(state);

  return (
    <Sheet title={discipline.label} onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <div className="row-title">{discipline.craftName}</div>
            <div className="row-sub">{craftLabel(stage.craft)}</div>
          </div>
          <strong>{Math.round(stage.craft)}/100</strong>
        </div>
        <Meter value={stage.craft} />
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone="primary">{stage.done} {discipline.jobName.toLowerCase()}(s)</Pill>
          {stage.lastReception > 0 && (
            <Pill tone={stage.lastReception > 60 ? 'good' : stage.lastReception < 42 ? 'bad' : 'warn'}>
              Dernier : {receptionLabel(stage.lastReception).label.toLowerCase()}
            </Pill>
          )}
          {stage.fatigue > 35 && <Pill tone="warn">Usé ({Math.round(stage.fatigue)})</Pill>}
          {stage.injuredUntil > state.year && <Pill tone="bad">Écarté jusqu’en {stage.injuredUntil}</Pill>}
          {stage.accolades.length > 0 && <Pill tone="good">{stage.accolades.length} distinction(s)</Pill>}
        </div>
      </Card>

      {/* ---------------- L'engagement en cours ---------------- */}
      {current && template && (
        <Section title="Ton engagement">
          <Card>
            <Row
              emoji={discipline.emoji}
              title={template.label}
              sub={`${template.what} · ${current.from}`}
              right={<strong>{money(state, current.fee)}</strong>}
            />
            <Row
              emoji="🎬"
              title="Y aller"
              sub={`Tenir devant un public — difficulté ${Math.round(current.difficulty)}/100`}
              onClick={() => setPlaying(true)}
              chevron
            />
            <Row
              emoji="🎲"
              title="Laisser faire"
              sub="Le personnage s’en sort avec ce qu’il sait faire"
              onClick={() => run((ctx) => autoPerform(ctx), discipline.emoji)}
              chevron
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Un engagement accepté et jamais tenu se solde tout seul à la fin de
            l’année, et mal.
          </p>
        </Section>
      )}

      {/* ---------------- Ce qu'on te propose ---------------- */}
      <Section title="Ce qu’on te propose">
        {stage.offers.length === 0 ? (
          <Empty>
            Le téléphone ne sonne pas. Ce qu’on te propose dépend de ce que tu
            sais faire et de ce qu’on sait de toi.
          </Empty>
        ) : (
          <Card>
            {stage.offers.map((offer) => {
              const t = templateOf(offer);
              if (!t) return null;
              const gap = t.demands - stage.craft;
              return (
                <Row
                  key={offer.id}
                  emoji={gap > 15 ? '⚠️' : gap < -18 ? '😐' : '✅'}
                  title={t.label}
                  sub={[
                    offer.from,
                    gap > 15 ? 'au-dessus de ton niveau' : gap < -18 ? 'très en dessous' : 'à ta portée',
                    t.fame >= 18 ? 'ça se verra' : t.fame <= 3 ? 'personne n’en parlera' : null,
                  ].filter(Boolean).join(' · ')}
                  right={<strong>{money(state, offer.fee)}</strong>}
                  onClick={() => run((ctx) => acceptOffer(ctx, offer.id), discipline.emoji)}
                  closed={Boolean(blocker)}
                  because={blocker}
                  chevron={!blocker}
                />
              );
            })}
          </Card>
        )}
        {blocker && stage.offers.length === 0 && (
          <p className="small muted" style={{ margin: '8px 4px 0' }}>{blocker}</p>
        )}
        {/* **Refuser n'a jamais été conditionné à quoi que ce soit.**
            `declineOffer` ne vérifie rien : il retire la proposition de la
            liste, point. Ces lignes disparaissaient pourtant dès que
            `offerBlocker` disait non — c'est-à-dire quand on est déjà engagé,
            blessé, ou qu'on a pris son quota. Très exactement les moments où
            l'on voudrait faire le ménage dans ce qu'on ne peut pas tenir. */}
        {stage.offers.length > 0 && (
          <Card>
            {stage.offers.map((offer) => (
              <Row
                key={`no_${offer.id}`}
                emoji="🚪"
                title={`Refuser — ${templateOf(offer)?.label.toLowerCase() ?? 'cette proposition'}`}
                sub="On appelle quelqu’un d’autre, et parfois on ne rappelle plus"
                onClick={() => run((ctx) => declineOffer(ctx, offer.id), '🚪')}
                chevron
              />
            ))}
          </Card>
        )}
      </Section>

      {/* ---------------- Les gens avec qui on exerce ---------------- */}
      <Section title={discipline.crewName.replace(/^(la |le |l’|les )/, '').replace(/^./, (c) => c.toUpperCase())}>
        <Card pad>
          <div className="spread">
            <div>
              <div className="row-title">
                {crewOf(state).length}/{discipline.crewSize} · entente {Math.round(stage.cohesion)}
              </div>
              <div className="row-sub">
                {discipline.crewWeight > 0.4
                  ? `Ce que vaut ${discipline.crewName} décide d’une bonne part de ce que tu vaux.`
                  : `${discipline.crewName.replace(/^./, (c) => c.toUpperCase())} aide, sans faire le travail à ta place.`}
              </div>
            </div>
            <strong>{Math.round(crewQuality(state))}</strong>
          </div>
          <Meter value={crewQuality(state)} />
          {crewCut(state) > 0 && (
            <p className="small muted" style={{ margin: '10px 0 0' }}>
              Chacun prend sa part : {Math.round(crewCut(state) * 100)} % de chaque cachet.
            </p>
          )}
        </Card>

        <Card>
          {crewOf(state).map((member) => (
            <Row
              key={member.person.id}
              emoji="🧑"
              title={fullName(member.person)}
              sub={`${discipline.crewRole} · ${member.years} an(s) ensemble · ${
                member.temper > 0.25 ? 'facile à vivre'
                  : member.temper < -0.25 ? 'difficile' : 'ni facile ni pénible'}`}
              right={<Pill tone={member.level > stage.craft + 10 ? 'accent' : undefined}>
                {Math.round(member.level)}
              </Pill>}
              onClick={() => run((ctx) => dismissMember(ctx, member.person.id), '✂️')}
              chevron
            />
          ))}
          {crewOf(state).length === 0 && (
            <Row emoji="—" title={`${discipline.crewName.replace(/^./, (c) => c.toUpperCase())} est vide`} sub="Tu fais tout seul" />
          )}
        </Card>

        <Card>
          <Row
            emoji="🎤"
            title={`Auditionner un ${discipline.crewRole}`}
            sub="Quelqu’un de bon tire vers le haut et use ; quelqu’un de moyen tient le groupe"
            closed={Boolean(recruitBlocker(state))}
            because={recruitBlocker(state)}
            onClick={() => setAuditions(
              crewCandidates(state, Math.floor(Math.random() * 2 ** 31)),
            )}
            chevron={!recruitBlocker(state)}
          />
          <Row
            emoji="🔁"
            title="Travailler ensemble"
            sub="La seule façon de garder les gens : on ne les retient pas en les recrutant"
            closed={Boolean(rehearseBlocker(state))}
            because={rehearseBlocker(state)}
            onClick={() => run((ctx) => rehearse(ctx), '🔁')}
            chevron={!rehearseBlocker(state)}
          />
          {coachOf(state) ? (
            <Row
              emoji="🧭"
              title={fullName(coachOf(state)!)}
              sub={`${discipline.coachName} · vous progressez plus vite`}
              right={<Pill tone="good">en place</Pill>}
            />
          ) : (
            <Row
              emoji="🧭"
              title={`Trouver un ${discipline.coachName.toLowerCase()}`}
              sub="Il fait progresser tout le monde, et prend sa part"
              closed={Boolean(coachBlocker(state))}
              because={coachBlocker(state)}
              onClick={() => run((ctx) => hireCoach(ctx), '🧭')}
              chevron={!coachBlocker(state)}
            />
          )}
        </Card>

        {auditions.length > 0 && (
          <Card>
            {auditions.map((candidate) => (
              <Row
                key={candidate.id}
                emoji="🙋"
                title={`Niveau ${Math.round(candidate.level)}`}
                sub={candidate.note}
                right={<Pill tone={candidate.level > stage.craft + 10 ? 'accent' : undefined}>
                  {candidate.level > stage.craft + 22 ? 'au-dessus de toi' : 'à ta portée'}
                </Pill>}
                onClick={() => {
                  run((ctx) => recruit(ctx, candidate.level, candidate.temper), '🎤');
                  setAuditions([]);
                }}
                chevron
              />
            ))}
          </Card>
        )}
      </Section>

      {/* ---------------- S'attacher ---------------- */}
      {(stage.contract || contractOffer(state)) && (
        <Section title="T’engager sur la durée">
          <Card>
            {stage.contract ? (
              <>
                <Row
                  emoji="📜"
                  title={`${stage.contract.yearsLeft} an(s) restants sur ${stage.contract.total}`}
                  sub={`${stage.contract.from} · payé quoi qu’il arrive`}
                  right={<strong>{money(state, stage.contract.yearly)}/an</strong>}
                />
                <Row
                  emoji="✂️"
                  title="Rompre"
                  sub="Il faut payer pour partir, et on retiendra que tu es parti"
                  onClick={() => run((ctx) => breakContract(ctx), '✂️')}
                  chevron
                />
              </>
            ) : (
              <Row
                emoji="📜"
                title={`Signer pour ${contractOffer(state)!.years} ans`}
                sub="La sécurité contre la liberté : tu ne pourras plus prendre mieux ailleurs"
                right={<strong>{money(state, contractOffer(state)!.yearly)}/an</strong>}
                onClick={() => run((ctx) => signContract(ctx), '📜')}
                chevron
              />
            )}
          </Card>
        </Section>
      )}

      {/* ---------------- L'agent ---------------- */}
      <Section title={discipline.agentName}>
        <Card>
          {agent ? (
            <>
              <Row
                emoji="🤝"
                title={fullName(agent)}
                sub="Plus de propositions, mieux payées — quinze pour cent de tout"
                right={<Pill tone="warn">15 %</Pill>}
              />
              <Row
                emoji="✂️"
                title="Vous séparer"
                sub="Le carnet d’adresses part avec lui"
                onClick={() => run((ctx) => dismissAgent(ctx), '✂️')}
                chevron
              />
            </>
          ) : (
            <Row
              emoji="🤝"
              title={`Chercher un ${discipline.agentName.toLowerCase()}`}
              sub="Il négocie mieux que toi, et prend sa part sur tout"
              closed={stage.craft < 20}
              because="Personne ne prend quelqu’un qu’on ne connaît pas encore."
              onClick={() => run((ctx) => hireAgent(ctx), '🤝')}
              chevron={stage.craft >= 20}
            />
          )}
        </Card>
      </Section>

      {/* ---------------- Les essais ---------------- */}
      {(() => {
        const pending = tryoutOf(state);
        const targets = tryoutTargets(state);
        const blocker = tryoutBlocker(state);
        if (pending) {
          const aimed = templateOf({ templateId: pending.templateId });
          return (
            <Section title={`Ton ${discipline.tryoutName.toLowerCase()}`}>
              <Card>
                <Row
                  emoji="🎯"
                  title={aimed?.label ?? discipline.tryoutName}
                  sub={`${pending.from} · difficulté ${Math.round(pending.difficulty)}/100`}
                  right={<Pill tone="accent">{money(state, pending.fee)}</Pill>}
                />
                <Row
                  emoji="🎬"
                  title="Y aller"
                  sub="Court, sous pression, et tout se joue sur deux moments"
                  onClick={() => setTrying(true)}
                  chevron
                />
                <Row
                  emoji="🎲"
                  title="Laisser faire"
                  sub="Le personnage s’en charge, avec ce qu’il sait — sans toi"
                  onClick={() => run((ctx) => autoTryout(ctx), '🎯')}
                  chevron
                />
              </Card>
              <p className="small muted" style={{ margin: '8px 4px 0' }}>
                Un essai qu’on ne va pas passer ne se représente pas.
              </p>
            </Section>
          );
        }
        if (targets.length === 0) return null;
        return (
          <Section title={`Ce pour quoi tu peux ${discipline.tryoutName.toLowerCase() === 'essai' ? 'essayer' : 'te présenter'}`}>
            {/* L'étiquette dit ce qu'il faut, pas « au-dessus de toi » : la
                liste des candidats à la troupe porte déjà cette formule, et
                deux choses différentes se lisaient pareil dans le même écran. */}
            <Card>
              {targets.map((t) => (
                <Row
                  key={t.id}
                  emoji="🎯"
                  title={t.label}
                  sub={`${t.what} · ${
                    Math.round(t.demands)} demandé, tu en vaux ${Math.round(reachOf)}`}
                  right={<Pill tone={blocker ? undefined : 'warn'}>
                    il en faut {Math.round(t.demands)}
                  </Pill>}
                  closed={Boolean(blocker)}
                  because={blocker}
                  onClick={() => setAiming(aiming === t.id ? null : t.id)}
                  chevron={!blocker}
                />
              ))}
            </Card>
            {aiming && (
              <Card>
                {APPROACHES.map((a) => (
                  <Row
                    key={a.id}
                    emoji={a.id === 'contre' ? '🎲' : a.id === 'sur' ? '✅' : '🎭'}
                    title={a.label}
                    sub={a.what}
                    right={<Pill tone={a.odds > 0 ? 'good' : a.odds < 0 ? 'bad' : undefined}>
                      {a.odds > 0 ? 'plus facile' : a.odds < 0 ? 'bien plus dur' : 'au juste'}
                    </Pill>}
                    onClick={() => {
                      run((ctx) => askTryout(ctx, aiming, a.id), '🎯');
                      setAiming(null);
                    }}
                    chevron
                  />
                ))}
              </Card>
            )}
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Rien de tout cela ne t’est proposé : c’est toi qui vas le
              chercher, et tu peux rentrer les mains vides.
            </p>
          </Section>
        );
      })()}

      {/* ---------------- Le book ---------------- */}
      {discipline.id === 'podium' && (
        <Section title="Ton book">
          <Card pad>
            <div className="spread">
              <div>
                <strong style={{ fontSize: 17 }}>{bookLabel(bookStrength(state))}</strong>
                <div className="small muted">{bookSummary(state)}</div>
              </div>
              <strong style={{ fontSize: 17 }}>{Math.round(bookStrength(state))}/100</strong>
            </div>
            <div style={{ marginTop: 10 }}><Meter value={bookStrength(state)} /></div>
            <p className="small muted" style={{ margin: '10px 0 0' }}>
              Un book vaut par sa variété, pas par son épaisseur : quatre
              campagnes ne remplacent pas une couverture.
            </p>
          </Card>
          <Card>
            {PIECE_KINDS.map((kind) => {
              const mine = bookPieces(state).filter((p) => p.kindId === kind.id);
              return (
                <Row
                  key={kind.id}
                  emoji={mine.length > 0 ? '🖼️' : '·'}
                  title={kind.label}
                  sub={mine.length > 0
                    ? `${mine.length} · la plus récente en ${mine[0].year}`
                    : kind.note}
                  right={mine.length > 0
                    ? <Pill tone="good">Dedans</Pill>
                    : <Pill>{kind.worth}</Pill>}
                />
              );
            })}
          </Card>
          <Card>
            <Row
              emoji="📷"
              title="Payer une séance d’essais"
              sub="Ça remplit une page, pas une carrière — mais ça ouvre la porte des agences"
              right={<Pill tone="warn">{money(state, shootCost(state))}</Pill>}
              closed={Boolean(shootBlocker(state))}
              because={shootBlocker(state)}
              onClick={() => run((ctx) => shoot(ctx), '📷')}
              chevron={!shootBlocker(state)}
            />
          </Card>
          {missingPieces(state).length > 0 && (
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Il te manque : {missingPieces(state).map((k) => k.label.toLowerCase()).join(', ')}.
            </p>
          )}
        </Section>
      )}

      {/* ---------------- Le disque ---------------- */}
      {musicOf(state) && (
        <Section title="Le disque">
          <Card>
            <Row
              emoji="💿"
              title={released(state).length > 0
                ? chartLabel(bestChart(state))
                : 'Enregistrer quelque chose'}
              sub={released(state).length > 0
                ? `${released(state).length} sortie(s) · ${
                  money(state, royaltiesOf(state))} de droits cette année`
                : 'Un disque continue de payer longtemps après la soirée où on l’a joué'}
              right={royaltiesOf(state) > 0
                ? <Pill tone="good">{money(state, royaltiesOf(state))}/an</Pill>
                : undefined}
              onClick={() => setDiscs(true)}
              chevron
            />
          </Card>
        </Section>
      )}

      <Section title="Distinctions">
        <Card>
          {stage.accolades.map((id) => {
            const a = ACCOLADES.find((x) => x.id === id);
            return a ? (
              <Row key={id} emoji="🏆" title={a.label} sub={a.note} right={<Pill tone="good">Obtenue</Pill>} />
            ) : null;
          })}
          {pending.map((a) => (
            <Row
              key={a.id}
              emoji="🎯"
              title={a.label}
              sub={[
                a.needs.craft !== undefined ? `${discipline.craftName.toLowerCase()} ${a.needs.craft}` : null,
                a.needs.jobs !== undefined ? `${a.needs.jobs} ${discipline.jobName.toLowerCase()}s` : null,
                a.needs.bestReception !== undefined ? `un accueil à ${a.needs.bestReception}` : null,
                a.needs.fame !== undefined ? `notoriété ${a.needs.fame}` : null,
              ].filter(Boolean).join(' · ')}
            />
          ))}
          {stage.accolades.length === 0 && pending.length === 0 && (
            <Row emoji="—" title="Rien à viser ici" />
          )}
        </Card>
      </Section>

      <Section title="Arrêter">
        <Card>
          <Row
            emoji="🚪"
            title="Ne plus faire ça"
            sub="Ce que tu as fait reste, mais on cessera vite de t’appeler"
            onClick={() => { run((ctx) => quitDiscipline(ctx), '🚪'); }}
            chevron
          />
        </Card>
      </Section>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* La scène                                                           */
/* ------------------------------------------------------------------ */

function Scene({ state: s, setup }: { state: PerformanceState; setup: PerformanceSetup }) {
  const beat = s.active !== null ? s.beats[s.active] : null;
  const timeLeft = Math.max(0, s.limit - s.elapsed) / 1000;
  const landed = s.beats.filter((b) => b.landed).length;

  return (
    <>
      <div className="scene">
        {/* La zone juste, autour de la ligne à suivre. */}
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
          {beat ? '✨' : '●'}
        </div>
        {beat && (
          <div className="scene-beat">
            {setup.beatName} — tiens
          </div>
        )}
      </div>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>{setup.lineName}</span>
          <span>{timeLeft.toFixed(0)} s</span>
        </div>
        <GameGauge label="Justesse" value={s.accuracy} low danger={60} />
        <GameGauge label="Public" value={s.audience} low danger={55} />
        <div className="chips" style={{ marginTop: 8 }}>
          <Pill tone={landed > 0 ? 'good' : undefined}>
            {landed}/{s.beats.length} tenu(s)
          </Pill>
          {s.slips > 0 && <Pill tone="warn">{s.slips} écart(s)</Pill>}
        </div>
      </div>
    </>
  );
}
