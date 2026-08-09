/**
 * Le travail, vu de l'intérieur.
 *
 * Le « Parcours » donne le poste et le salaire ; cet écran donne le bureau.
 * On y trouve la fiche complète, l'équipe, le supérieur, et de quoi agir —
 * parce qu'un adulte y passe quarante ans et que la seule chose qu'il pouvait
 * faire jusqu'ici était de choisir son niveau d'implication.
 */

import { useState } from 'react';
import {
  Card, Empty, Gauge, Meter, Pill, Row, Section, Segmented, Sheet,
} from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money, years as fmtYears } from '../ui/format.ts';
import { askForRaise, quitJob, retire, setWorkEffort } from '../systems/careers.ts';
import {
  askPromotion, bossOf, computeSatisfaction, requestTransfer, setHours, takeLeave,
  teamOf, workAction, workplaceSupport,
} from '../systems/workplace.ts';
import { getAvailableActions } from '../systems/actions.ts';
import { interact } from '../systems/relationships.ts';
import { getJob } from '../data/jobs.ts';

export function WorkScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  if (!state) return null;

  const p = state.player;
  const job = p.job;
  const team = teamOf(state);
  const boss = bossOf(state);
  const def = job ? getJob(job.jobId) : null;
  const support = workplaceSupport(state);
  const satisfaction = computeSatisfaction(state);
  const atTop = Boolean(def && job && job.level >= def.levels.length - 1);

  if (selected) {
    return <WorkPersonSheet personId={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <Sheet title="Travail" onBack={onBack}>
      {!job ? (
        <Empty>
          {p.retired ? 'Tu es à la retraite.' : 'Tu n’as pas d’emploi en ce moment.'}
        </Empty>
      ) : (
        <>
          <Card pad>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
              {job.title}
            </div>
            <div className="row-sub">{job.employer}</div>
            <div className="chips" style={{ marginTop: 12 }}>
              <Pill tone="primary">{money(state, job.salary)}/an</Pill>
              <Pill>{fmtYears(job.yearsAtJob)} en poste</Pill>
              <Pill>{job.hours} h/semaine</Pill>
              {job.partTime && <Pill tone="accent">Temps partiel</Pill>}
              {job.warnings > 0 && <Pill tone="bad">{job.warnings} avertissement(s)</Pill>}
            </div>
          </Card>

          <Section title="Où tu en es">
            <Card>
              <div className="card-pad">
                <div className="spread small muted" style={{ marginBottom: 6 }}>
                  <span>Performance</span>
                  <span>{Math.round(job.performance)}/100</span>
                </div>
                <Meter value={job.performance} />
                <div className="spread small muted" style={{ margin: '14px 0 6px' }}>
                  <span>Satisfaction</span>
                  <span>{satisfactionWord(job.satisfaction)}</span>
                </div>
                <Meter value={job.satisfaction} />
              </div>
              {satisfaction.reasons.length > 0 && (
                <Row
                  emoji="🧾"
                  title="Ce qui fait la différence"
                  sub={satisfaction.reasons.slice(0, 3).join(' · ')}
                />
              )}
              <Row
                emoji="🪜"
                title="Progression possible"
                sub={def
                  ? atTop
                    ? 'Tu es au sommet de cette hiérarchie'
                    : `Prochain palier : ${def.levels[job.level + 1].title}`
                  : undefined}
              />
              <Row
                emoji="🤝"
                title="Tes appuis dans la maison"
                sub={supportWord(support)}
                right={<Gauge value={50 + support * 50} />}
              />
            </Card>
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Réussir et être heureux au travail sont deux choses différentes.
              La performance ouvre les promotions ; la satisfaction décide si
              tu tiens jusque-là.
            </p>
          </Section>

          <Section title="Ce que tu peux faire">
            <Card>
              <div className="card-pad">
                <div className="small muted" style={{ marginBottom: 6 }}>
                  Implication pour l’année à venir
                </div>
                <Segmented
                  value={job.effort}
                  onChange={(v) => run((ctx) => setWorkEffort(ctx, v))}
                  options={[
                    { value: 'slack', label: 'Minimum' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'overtime', label: 'À fond' },
                  ]}
                />
              </div>
            </Card>
            <Card>
              <Row
                emoji="📈"
                title="Demander une augmentation"
                sub="Le salaire, pas le poste"
                onClick={() => run((ctx) => askForRaise(ctx), '📈')}
                chevron
              />
              <Row
                emoji="🪜"
                title="Demander une promotion"
                sub={atTop ? 'Tu es déjà au sommet' : 'Le poste au-dessus, avec ce qu’il exige'}
                disabled={atTop}
                onClick={() => run((ctx) => askPromotion(ctx), '🪜')}
                chevron
              />
              <Row
                emoji="🏝️"
                title="Prendre des congés"
                sub={job.leaveTaken > 0 ? `${job.leaveTaken} déjà pris cette année` : 'Du repos contre un peu de performance'}
                onClick={() => run((ctx) => takeLeave(ctx), '🏝️')}
                chevron
              />
              <Row
                emoji="🔀"
                title="Demander une mutation"
                sub="Même métier, autre maison, autre équipe"
                onClick={() => run((ctx) => requestTransfer(ctx), '🔀')}
                chevron
              />
              <Row
                emoji="🚪"
                title="Démissionner"
                sub="Plus de salaire dès l’an prochain"
                onClick={() => run((ctx) => quitJob(ctx), '🚪')}
                chevron
              />
              {!p.retired && p.age >= 55 && (
                <Row
                  emoji="🏖️"
                  title="Prendre sa retraite"
                  sub="Liquider ta pension"
                  onClick={() => run((ctx) => retire(ctx), '🏖️')}
                  chevron
                />
              )}
            </Card>
          </Section>

          <Section title="Tes horaires">
            <Card>
              {[
                { hours: Math.max(20, (def?.hours ?? 38) - 14), label: 'Temps partiel' },
                { hours: def?.hours ?? 38, label: 'Temps plein' },
                { hours: (def?.hours ?? 38) + 12, label: 'Heures supplémentaires' },
              ].map((choice) => (
                <Row
                  key={choice.label}
                  emoji={choice.hours < (def?.hours ?? 38) ? '🌤️' : choice.hours > (def?.hours ?? 38) ? '🌙' : '🕘'}
                  title={choice.label}
                  sub={`${choice.hours} h par semaine`}
                  right={job.hours === choice.hours ? <Pill tone="primary">Actuel</Pill> : undefined}
                  disabled={job.hours === choice.hours}
                  onClick={() => run((ctx) => setHours(ctx, choice.hours), '🕘')}
                  chevron
                />
              ))}
            </Card>
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Le salaire suit les heures, mais pas au même prix dans les deux
              sens : on perd tout en descendant, on ne gagne qu’à moitié en
              montant.
            </p>
          </Section>

          <Section title="L’équipe">
            {team.length === 0 ? (
              <Empty>Tu travailles seul, ou avec des gens que tu ne connais pas.</Empty>
            ) : (
              <Card>
                {[boss, ...team.filter((x) => x.role.role !== 'supérieur')]
                  .filter((x): x is NonNullable<typeof boss> => Boolean(x))
                  .map(({ role, person: npc }) => (
                    <Row
                      key={npc.id}
                      emoji={avatarFor(npc)}
                      title={`${npc.firstName} ${npc.lastName}`}
                      sub={[
                        role.role,
                        role.influence > 55 ? 'pèse dans les décisions' : role.influence < 25 ? 'sans influence' : null,
                        role.competence > 70 ? 'très bon' : role.competence < 35 ? 'dépassé' : null,
                      ].filter(Boolean).join(' · ')}
                      right={<Gauge value={npc.relationship} />}
                      onClick={() => setSelected(npc.id)}
                      chevron
                    />
                  ))}
              </Card>
            )}
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Être apprécié ne suffit pas : il faut l’être de quelqu’un qui
              pèse. Un rival qui monte vous coûte une place, même si vous vous
              entendez bien.
            </p>
          </Section>
        </>
      )}
    </Sheet>
  );
}

function satisfactionWord(v: number): string {
  if (v >= 78) return 'tu t’y plais vraiment';
  if (v >= 58) return 'ça va';
  if (v >= 38) return 'tu fais avec';
  if (v >= 20) return 'tu tiens le coup';
  return 'tu n’en peux plus';
}

function supportWord(support: number): string {
  if (support > 0.35) return 'on te défendrait si ça tournait mal';
  if (support > 0.1) return 'quelques appuis, rien de solide';
  if (support > -0.1) return 'personne pour toi, personne contre toi';
  if (support > -0.35) return 'on ne te porte pas dans son cœur';
  return 'tu es seul, et ceux qui décident le savent';
}

/* ------------------------------------------------------------------ */
/* Fiche d'un membre de l'équipe                                      */
/* ------------------------------------------------------------------ */

function WorkPersonSheet({ personId, onBack }: { personId: string; onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const target = state.npcs[personId];
  if (!target) return null;
  const role = state.player.job?.team.find((c) => c.personId === personId);
  const actions = getAvailableActions(state, target, 'travail');

  const perform = (id: string) => {
    const emoji = avatarFor(target);
    switch (id) {
      case 'talk': case 'time': case 'compliment': case 'argue': case 'insult':
      case 'cutTies': case 'reconnect': case 'kiss': case 'askOut': case 'propose':
      case 'breakUp': case 'advice':
        return run((ctx) => interact(ctx, personId, id), emoji);
      case 'askAdvice': return run((ctx) => workAction(ctx, personId, 'askAdvice'), emoji);
      case 'cover': return run((ctx) => workAction(ctx, personId, 'cover'), emoji);
      case 'askCover': return run((ctx) => workAction(ctx, personId, 'askCover'), emoji);
      case 'reportToHR': return run((ctx) => workAction(ctx, personId, 'reportToHR'), emoji);
      case 'complain': return run((ctx) => workAction(ctx, personId, 'complain'), emoji);
      case 'takeCredit': return run((ctx) => workAction(ctx, personId, 'takeCredit'), emoji);
      case 'askPromotionTo': return run((ctx) => workAction(ctx, personId, 'askPromotionTo'), emoji);
      case 'disrespectBoss': return run((ctx) => workAction(ctx, personId, 'disrespectBoss'), emoji);
      default: return undefined;
    }
  };

  const groups: { key: string; title: string }[] = [
    { key: 'travail', title: 'Au bureau' },
    { key: 'lien', title: 'Entretenir le lien' },
    { key: 'amour', title: 'Vie sentimentale' },
    { key: 'conflit', title: 'Conflit' },
  ];

  return (
    <Sheet title={`${target.firstName} ${target.lastName}`} onBack={onBack}>
      <Card pad>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 38 }}>{avatarFor(target)}</div>
          <div>
            <div className="row-title">{role?.role ?? 'Ancien collègue'}</div>
            <div className="row-sub">
              {target.age} ans
              {role ? ` · ${role.seniority} an${role.seniority > 1 ? 's' : ''} dans la maison` : ''}
            </div>
          </div>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone="primary">Relation {Math.round(target.relationship)}</Pill>
          <Pill>Opinion {Math.round(target.opinion)}</Pill>
          {role && <Pill tone={role.influence > 55 ? 'accent' : undefined}>Influence {Math.round(role.influence)}</Pill>}
        </div>
      </Card>

      {role && (
        <Section title="Ce qu’il vaut ici">
          <Card>
            <Row emoji="🧠" title="Compétence" right={<Gauge value={role.competence} />} />
            <Row emoji="⚖️" title="Poids dans les décisions" right={<Gauge value={role.influence} />} />
            <Row emoji="⏳" title="Ancienneté" right={`${role.seniority} an${role.seniority > 1 ? 's' : ''}`} />
          </Card>
          {role.role === 'rival' && (
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Il vise la même place que toi. Chaque année où il monte est une
              année où tu ne montes pas.
            </p>
          )}
        </Section>
      )}

      {groups.map(({ key, title }) => {
        const list = actions.filter((a) => a.group === key);
        if (list.length === 0) return null;
        return (
          <Section key={key} title={title}>
            <Card>
              {list.map((a) => (
                <Row
                  key={a.id}
                  emoji={a.emoji}
                  title={a.label}
                  sub={a.blocked ?? a.hint}
                  disabled={a.blocked !== null}
                  onClick={() => perform(a.id)}
                  chevron
                />
              ))}
            </Card>
          </Section>
        );
      })}
    </Sheet>
  );
}
