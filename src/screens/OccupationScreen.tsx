/**
 * Écran « Parcours » : scolarité, études supérieures, formations et carrière.
 */

import { useState } from 'react';
import { Empty, Meter, Pill, Segmented, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money, years as fmtYears } from '../ui/format.ts';
import {
  STAGE_LABELS, annualTuition, applyScholarship, availableClubs, completedCourses,
  enrollGraduate, enrollUniversity, enrollVocational, isInSchool, joinClub, setEffort,
} from '../systems/education.ts';
import { ExamSheet, SchoolScreen } from './SchoolScreen.tsx';
import { examOf } from '../systems/exams.ts';
import { sessionFor } from '../data/subjects.ts';
import { ChildhoodScreen } from './ChildhoodScreen.tsx';
import { isChild } from '../systems/childhood.ts';
import { WorkScreen } from './WorkScreen.tsx';
import { VentureScreen } from './VentureScreen.tsx';
import { StageScreen } from './StageScreen.tsx';
import { ServiceScreen } from './ServiceScreen.tsx';
import { CampaignScreen } from './CampaignScreen.tsx';
import { CrownScreen } from './CrownScreen.tsx';
import {
  applyToJob, experienceYears, offerBlocker, retire, setWorkEffort,
} from '../systems/careers.ts';
import { GRADUATE_PROGRAMS, MAJORS, VOCATIONAL_COURSES, getMajor } from '../data/degrees.ts';
import { getJob } from '../data/jobs.ts';
import { getBusinessKind, getTrade } from '../data/ventures.ts';
import { availableDisciplines, craftLabel, disciplineOf } from '../systems/stage.ts';
import {
  availableCorps, corpsOf, rankOf, standingLabel,
} from '../systems/service.ts';
import {
  approvalLabel, approvalOf, availableOffices, mandateOf, movesLeft, officeOf,
  share,
} from '../systems/politics.ts';
import {
  crownOf, ennobleBlocker, houseOf, inCourt, myTitle, pendingAffair, placeLabel,
  placeOf, presentationBlocker, standingLabel as royalStanding,
} from '../systems/royalty.ts';
import { majorFit, majorVerdict } from '../systems/exams.ts';
import { businessValue, forecast } from '../systems/venture.ts';
import { economyLabel } from '../systems/markets.ts';
import type { JobOffer } from '../engine/types.ts';

type Panel = null | 'university' | 'vocational' | 'graduate' | 'clubs' | 'offers' | 'history' | 'school' | 'exam' | 'work' | 'childhood' | 'venture' | 'business' | 'stage' | 'service' | 'campagne' | 'couronne';

export function OccupationScreen() {
  const { state, run } = useGame();
  const [panel, setPanel] = useState<Panel>(null);
  if (!state) return null;
  const p = state.player;

  if (panel === 'university') return <UniversityPanel onBack={() => setPanel(null)} />;
  if (panel === 'vocational') return <VocationalPanel onBack={() => setPanel(null)} />;
  if (panel === 'graduate') return <GraduatePanel onBack={() => setPanel(null)} />;
  if (panel === 'clubs') return <ClubsPanel onBack={() => setPanel(null)} />;
  if (panel === 'school') return <SchoolScreen onBack={() => setPanel(null)} />;
  if (panel === 'exam') return <ExamSheet onBack={() => setPanel(null)} />;
  if (panel === 'childhood') return <ChildhoodScreen onBack={() => setPanel(null)} />;
  if (panel === 'work') return <WorkScreen onBack={() => setPanel(null)} />;
  if (panel === 'venture') return <VentureScreen onBack={() => setPanel(null)} start="compte" />;
  if (panel === 'business') return <VentureScreen onBack={() => setPanel(null)} start="entreprise" />;
  if (panel === 'stage') return <StageScreen onBack={() => setPanel(null)} />;
  if (panel === 'service') return <ServiceScreen onBack={() => setPanel(null)} />;
  if (panel === 'campagne') return <CampaignScreen onBack={() => setPanel(null)} />;
  if (panel === 'couronne') return <CrownScreen onBack={() => setPanel(null)} />;
  if (panel === 'offers') return <OffersPanel onBack={() => setPanel(null)} />;
  if (panel === 'history') return <CareerHistoryPanel onBack={() => setPanel(null)} />;

  const inSchool = isInSchool(state);
  // Une session en attente : ouverte, pas encore passée.
  const exam = examOf(state);
  const pendingExam = Boolean(exam) && !exam!.done;
  const pendingSession = exam ? sessionFor(exam.stage) : undefined;
  const tuition = annualTuition(state);
  const f = p.freelance;
  const trade = f ? getTrade(f.tradeId) : undefined;
  const kind = p.business ? getBusinessKind(p.business.kindId) : undefined;
  const discipline = disciplineOf(state);
  const stageOpen = discipline !== null || availableDisciplines(state).length > 0;
  const corps = corpsOf(state);
  const serviceOpen = corps !== null || p.veteran !== null
    || availableCorps(state).length > 0;
  const held = mandateOf(state);
  const politicsOpen = p.campaign !== null || held !== null
    || availableOffices(state).length > 0;
  const crown = crownOf(state);
  // La couronne ne s'affiche que si elle veut dire quelque chose : on en est,
  // ou l'une des deux portes qui se méritent est ouverte. Sinon la section
  // resterait toute une vie à dire non.
  const crownOpen = crown !== null
    || ennobleBlocker(state) === null
    || presentationBlocker(state) === null;
  const affair = pendingAffair(state);

  return (
    <>
      {p.prison && (
        <Section title="Situation">
          <Card pad>
            <p className="small muted" style={{ margin: 0 }}>
              Tu es incarcéré à {p.prison.facilityName}. Études et carrière sont suspendues
              jusqu’à ta libération. Rendez-vous dans l’Agenda pour occuper ton temps.
            </p>
          </Card>
        </Section>
      )}

      {/* ---------------- Scolarité ---------------- */}
      <Section title="Éducation">
        {inSchool ? (
          <Card>
            <Row
              emoji="🏫"
              title={p.education.schoolName ?? STAGE_LABELS[p.education.stage]}
              sub={`${STAGE_LABELS[p.education.stage]} · année ${p.education.yearInStage || 1}/${p.education.stageLength}`}
              right={<Pill tone={gradeTone(p.education.grades)}>{p.education.grades.toFixed(1)}/20</Pill>}
            />
            <div className="card-pad">
              <div className="small muted" style={{ marginBottom: 6 }}>
                Moyenne générale
              </div>
              <Meter value={(p.education.grades / 20) * 100} />
              {Number(p.flags.repeatedYears ?? 0) > 0 && (
                <div className="chips" style={{ marginTop: 10 }}>
                  <Pill tone="warn">
                    {Number(p.flags.repeatedYears)} année(s) redoublée(s)
                  </Pill>
                </div>
              )}
              {p.education.majorId && (
                <div className="chips" style={{ marginTop: 10 }}>
                  <Pill tone="primary">
                    {getMajor(p.education.majorId)?.emoji} {getMajor(p.education.majorId)?.name}
                  </Pill>
                  {p.education.scholarship && <Pill tone="good">Boursier</Pill>}
                  {tuition > 0 && <Pill tone="warn">Frais : {money(state, tuition)}/an</Pill>}
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <div className="small muted" style={{ marginBottom: 6 }}>
                  Rythme de travail pour l’année à venir
                </div>
                <Segmented
                  value={p.education.effort}
                  onChange={(v) => run((ctx) => setEffort(ctx, v))}
                  options={[
                    { value: 'none', label: 'Minimum' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'hard', label: 'Intensif' },
                  ]}
                />
              </div>
            </div>
          </Card>
        ) : (
          <Card pad>
            <div className="spread">
              <div>
                <div className="row-title">{STAGE_LABELS[p.education.stage]}</div>
                <div className="row-sub">
                  {p.education.degrees.length
                    ? `${p.education.degrees.length} diplôme(s) obtenu(s)`
                    : 'Aucun diplôme obtenu'}
                </div>
              </div>
            </div>
          </Card>
        )}

        {isChild(state) && (
          <Card>
            <Row
              emoji="🏠"
              title="À la maison"
              sub="Faire quelque chose avec sa famille, sortir voir qui est dehors"
              onClick={() => setPanel('childhood')}
              chevron
            />
          </Card>
        )}

        {/* Une session ouverte se rejoint d'ici, scolarisé ou non.
            Mesuré sur 120 vies : **117 sessions sur 250 s'ouvraient alors que
            le joueur venait d'être diplômé** — le cycle se termine et l'étape
            passe à « études terminées » dans la même année que l'examen. Le
            panneau de l'école disparaissait donc avec elle, et le moteur
            comptait l'absence comme un zéro l'année suivante : 2,08 « tu ne
            t'es pas présenté » par vie, pour une salle qu'on ne pouvait pas
            atteindre. */}
        {pendingExam && (
          <Card>
            <Row
              emoji="📝"
              title={`Ta session : ${pendingSession?.label ?? 'examens'}`}
              sub="Elle t’attend cette année. Ne pas s’y présenter compte comme un zéro."
              onClick={() => setPanel('exam')}
              chevron
            />
          </Card>
        )}

        {inSchool && (
          <Card>
            <Row
              emoji="🏫"
              title="Entrer dans l’établissement"
              sub="Camarades, professeurs, clubs, dossier — et de quoi agir"
              onClick={() => setPanel('school')}
              chevron
            />
            {(p.education.stage === 'university' || p.education.stage === 'graduate') && (
              <Row
                emoji="🎟️"
                title="Demander une bourse"
                sub="Prise en charge des frais"
                onClick={() => run((ctx) => applyScholarship(ctx), '🎟️')}
                closed={p.education.scholarship}
                because="Bourse déjà obtenue."
                chevron
              />
            )}
          </Card>
        )}

        {!inSchool && !p.prison && (
          <Card>
            <Row
              emoji="🎓"
              title="Université"
              sub="Choisir une filière"
              onClick={() => setPanel('university')}
              closed={p.education.level < 1 || p.age < 17}
              because={p.education.level < 1
                ? 'Diplôme du secondaire requis.'
                : 'Pas avant dix-sept ans.'}
              chevron
            />
            <Row emoji="🛠️" title="Formation professionnelle" sub="Cursus court et qualifiant" onClick={() => setPanel('vocational')} chevron />
            <Row
              emoji="📜"
              title="Cycle supérieur"
              sub="Spécialisation"
              onClick={() => setPanel('graduate')}
              closed={p.education.level < 3}
              because="Diplôme universitaire requis."
              chevron
            />
          </Card>
        )}
      </Section>

      {/* ---------------- Diplômes ---------------- */}
      {p.education.degrees.length > 0 && (
        <Section title="Diplômes">
          <Card>
            {p.education.degrees.map((d) => (
              <Row
                key={d.id}
                emoji={getMajor(d.majorId)?.emoji ?? '📜'}
                title={d.name}
                sub={`Obtenu en ${d.year}`}
                right={d.honors ? <Pill tone="good">Mention</Pill> : undefined}
              />
            ))}
          </Card>
        </Section>
      )}

      {/* ---------------- Carrière ---------------- */}
      <Section
        title="Carrière"
        action={
          p.careerHistory.length ? (
            <button className="small muted" onClick={() => setPanel('history')} type="button">
              Historique ›
            </button>
          ) : undefined
        }
      >
        {p.job ? (
          <>
            <Card>
              <Row
                emoji={getJob(p.job.jobId)?.emoji ?? '💼'}
                title={p.job.title}
                sub={`${p.job.employer} · ${fmtYears(p.job.yearsAtJob)} en poste`}
                right={<strong>{money(state, p.job.salary)}</strong>}
              />
              <div className="card-pad">
                <div className="spread small muted">
                  <span>Performance</span>
                  <span>{Math.round(p.job.performance)}/100</span>
                </div>
                <Meter value={p.job.performance} />
                <div className="spread small muted" style={{ marginTop: 12 }}>
                  <span>Satisfaction</span>
                  <span>{Math.round(p.job.satisfaction)}/100</span>
                </div>
                <Meter value={p.job.satisfaction} />
                <div style={{ marginTop: 14 }}>
                  <div className="small muted" style={{ marginBottom: 6 }}>
                    Implication pour l’année à venir
                  </div>
                  <Segmented
                    value={p.job.effort}
                    onChange={(v) => run((ctx) => setWorkEffort(ctx, v))}
                    options={[
                      { value: 'slack', label: 'Minimum' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'overtime', label: 'À fond' },
                    ]}
                  />
                </div>
              </div>
            </Card>
            <Card>
              <Row
                emoji="🏢"
                title="Entrer au bureau"
                sub="Équipe, supérieur, horaires, promotions — et de quoi agir"
                onClick={() => setPanel('work')}
                chevron
              />
            </Card>
          </>
        ) : (
          <Card pad>
            <div className="row-title">{p.retired ? 'Retraité' : 'Sans emploi'}</div>
            <div className="row-sub">
              {p.retired
                ? `Pension annuelle : ${money(state, p.pension)}`
                : `${fmtYears(experienceYears(state))} d’expérience professionnelle`}
            </div>
          </Card>
        )}

        <Card>
          <Row
            emoji="🗞️"
            title="Consulter les offres d’emploi"
            sub={`${state.world.jobOffers.length} annonces · ${economyLabel(state.world.economy)}`}
            onClick={() => setPanel('offers')}
            closed={Boolean(p.prison)}
            because="Pas depuis l’intérieur."
            chevron
          />
          {!p.retired && p.age >= 55 && (
            <Row emoji="🏖️" title="Prendre sa retraite" sub="Liquider ta pension" onClick={() => run((ctx) => retire(ctx), '🏖️')} chevron />
          )}
        </Card>
      </Section>

      {/* ---------------- Travailler pour soi ---------------- */}
      {p.age >= 14 && (
        <Section title="À ton compte">
          <Card>
            <Row
              emoji={trade?.emoji ?? '🧰'}
              title={trade ? trade.label : 'Vendre ton temps toi-même'}
              sub={trade
                ? f && f.lastRevenue > 0
                  ? `${f.lastMissions} prestation(s) l’an dernier · ${money(state, f.lastRevenue)}`
                  : 'Aucun exercice complet pour l’instant'
                : 'Petits services, artisanat, cours, images, contenu — sans employeur'}
              right={trade && f ? <Pill>{money(state, f.fee)}</Pill> : undefined}
              onClick={() => setPanel('venture')}
              closed={Boolean(p.prison)}
              because="Pas depuis l’intérieur."
              chevron
            />
            <Row
              emoji={kind?.emoji ?? '🏪'}
              title={p.business ? p.business.name : 'Ouvrir une entreprise'}
              sub={p.business
                ? `${kind?.label} · ${p.business.staff} salarié(s) · caisse ${money(state, p.business.cash)}`
                : 'Mettre son argent et celui de la banque sur une idée'}
              right={p.business ? <Pill tone={forecast(state).profit >= 0 ? 'good' : 'bad'}>
                {money(state, businessValue(state))}
              </Pill> : undefined}
              onClick={() => setPanel('business')}
              closed={Boolean(p.prison)}
              because="Pas depuis l’intérieur."
              chevron
            />
          </Card>
        </Section>
      )}

      {/* ---------------- Les métiers de scène ---------------- */}
      {politicsOpen && (
        <Section title="La tribune">
          <Card>
            <Row
              emoji="🗳️"
              title={held
                ? (officeOf(state)?.label ?? 'Ton mandat')
                : p.campaign
                  ? 'Ta campagne'
                  : 'Te présenter'}
              sub={held
                ? `${approvalLabel(approvalOf(state)).toLowerCase()} · ${
                  held.yearsLeft} an(s) restant(s)`
                : p.campaign
                  ? `${share(p.campaign).toFixed(1)} % · ${
                    movesLeft(state)} coup(s) restant(s)`
                  : 'Un programme, une caisse, un adversaire qui a un nom'}
              right={held && pendingLabel(state)
                ? <Pill tone="accent">À trancher</Pill>
                : p.campaign
                  ? <Pill tone="accent">{movesLeft(state)} coup(s)</Pill>
                  : undefined}
              onClick={() => setPanel('campagne')}
              closed={Boolean(p.prison)}
              because="Pas depuis l’intérieur."
              chevron
            />
          </Card>
        </Section>
      )}

      {/* ---------------- La couronne ---------------- */}
      {crownOpen && (
        <Section title="La maison">
          <Card>
            <Row
              emoji="👑"
              title={crown
                ? `${myTitle(state)} · ${houseOf(state)?.name ?? ''}`
                : 'Les maisons'}
              sub={crown
                ? (crown.abolished
                  ? 'La couronne a été abolie'
                  : crown.removed
                    ? 'Ton rang t’a été retiré'
                    : `${placeOf(state) >= 0 ? placeLabel(placeOf(state)) : 'Hors de l’ordre'} · ${
                      royalStanding(crown.standing).toLowerCase()}`)
                : 'Y naître, en épouser quelqu’un, ou avoir rendu assez de services'}
              right={affair
                ? <Pill tone="accent">À trancher</Pill>
                : crown && inCourt(state)
                  ? <Pill tone={crown.sentiment < 35 ? 'bad' : undefined}>
                      {Math.round(crown.sentiment)}
                    </Pill>
                  : undefined}
              onClick={() => setPanel('couronne')}
              chevron
            />
          </Card>
        </Section>
      )}

      {serviceOpen && (
        <Section title="Servir">
          <Card>
            <Row
              emoji={corps ? SERVICE_EMOJI[corps.id] ?? '🎖️' : '🎖️'}
              title={corps ? (rankOf(state)?.label ?? corps.label) : 'L’armée, l’espace, le service'}
              sub={corps && p.service
                ? `${corps.house} · ${standingLabel(p.service.standing).toLowerCase()} · ${
                  p.service.done} ${corps.dutyName}(s)`
                : p.veteran
                  ? 'Tu en es sorti. On peut se présenter ailleurs.'
                  : 'Des maisons où l’on n’est pas embauché mais retenu — et où l’on risque quelque chose'}
              right={corps && p.service && p.service.offers.length > 0
                ? <Pill tone="accent">{p.service.offers.length} mission(s)</Pill>
                : undefined}
              onClick={() => setPanel('service')}
              closed={Boolean(p.prison)}
              because="Pas depuis l’intérieur."
              chevron
            />
          </Card>
        </Section>
      )}

      {stageOpen && (
        <Section title="Sur scène">
          <Card>
            <Row
              emoji={discipline?.emoji ?? '🎭'}
              title={discipline ? discipline.label : 'Jouer, chanter, courir, poser, convaincre'}
              sub={discipline && p.stage
                ? `${discipline.craftName} : ${craftLabel(p.stage.craft).toLowerCase()} · ${p.stage.done} ${discipline.jobName.toLowerCase()}(s)`
                : 'Des métiers où l’on ne postule pas : on vous propose, ou on ne vous propose pas'}
              right={discipline && p.stage
                ? <Pill tone={p.stage.offers.length > 0 ? 'accent' : undefined}>
                    {p.stage.offers.length} proposition(s)
                  </Pill>
                : undefined}
              onClick={() => setPanel('stage')}
              closed={Boolean(p.prison)}
              because="Pas depuis l’intérieur."
              chevron
            />
          </Card>
        </Section>
      )}
    </>
  );
}

/** Y a-t-il une décision de mandat en attente ? */
function pendingLabel(state: NonNullable<ReturnType<typeof useGame>['state']>): boolean {
  return Boolean(state.player.mandate?.pending);
}

/** Le pictogramme d'une maison. Aucun n'appartient à une institution réelle. */
const SERVICE_EMOJI: Record<string, string> = { armee: '🎖️', orbite: '🚀', ombre: '🕶️' };

function gradeTone(g: number): 'good' | 'warn' | 'bad' {
  if (g >= 14) return 'good';
  if (g >= 8) return 'warn';
  return 'bad';
}

/* ------------------------------------------------------------------ */
/* Panneaux                                                           */
/* ------------------------------------------------------------------ */

function UniversityPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const p = state.player;

  return (
    <Sheet title="Filières universitaires" onBack={onBack}>
      <p className="small muted">
        L’admission dépend de ton intelligence ({Math.round(p.stats.intelligence)}) et de ton
        dossier scolaire. Les frais sont dus chaque année, sauf si tu obtiens une bourse.
      </p>
      <Card>
        {MAJORS.map((m) => {
          const reachable = p.stats.intelligence >= m.minIntelligence - 12;
          // Ce que dit ton bulletin de *cette* filière-là : c'est ce qu'un
          // conseiller d'orientation regarderait, et pas la moyenne.
          const verdict = majorVerdict(state, m.id);
          const fit = majorFit(state, m.id);
          return (
            <Row
              key={m.id}
              emoji={m.emoji}
              title={m.name}
              sub={[
                `${m.years} ans · ${money(state, m.tuition)}/an`,
                verdict ?? `esprit conseillé ${m.minIntelligence}`,
              ].join(' · ')}
              right={fit !== null
                ? <Pill tone={fit >= 13 ? 'good' : fit >= 9 ? 'warn' : 'bad'}>{fit.toFixed(1)}</Pill>
                : reachable ? <Pill tone="accent">Possible</Pill> : <Pill tone="bad">Difficile</Pill>}
              onClick={() => {
                const outcome = run((ctx) => enrollUniversity(ctx, m.id), m.emoji);
                if (outcome.ok) onBack();
              }}
              chevron
            />
          );
        })}
      </Card>
      <p className="small muted" style={{ marginTop: 12 }}>
        La note affichée n’est pas ta moyenne : c’est ta moyenne dans les
        matières que cette filière-là regarde. Certaines carrières exigent en
        outre une filière précise — médecine pour soigner, droit pour plaider,
        informatique ou ingénierie pour la technique.
      </p>
    </Sheet>
  );
}

function VocationalPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const done = completedCourses(state);

  return (
    <Sheet title="Formations professionnelles" onBack={onBack}>
      <p className="small muted">
        Courtes, concrètes, elles débloquent des métiers inaccessibles autrement.
      </p>
      <Card>
        {VOCATIONAL_COURSES.map((c) => (
          <Row
            key={c.id}
            emoji={c.emoji}
            title={c.name}
            sub={`${c.years} an(s) · ${money(state, c.cost)} · dès ${c.minAge} ans`}
            right={done.includes(c.id) ? <Pill tone="good">Validée</Pill> : undefined}
            closed={done.includes(c.id)}
            because="Tu l’as déjà validée."
            onClick={() => {
              const outcome = run((ctx) => enrollVocational(ctx, c.id), c.emoji);
              if (outcome.ok) onBack();
            }}
            chevron
          />
        ))}
      </Card>
    </Sheet>
  );
}

function GraduatePanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const p = state.player;

  return (
    <Sheet title="Cycle supérieur" onBack={onBack}>
      <Card>
        {GRADUATE_PROGRAMS.map((g) => {
          const eligible = p.education.degrees.some(
            (d) => d.majorId && g.requiresMajor.includes(d.majorId),
          );
          return (
            <Row
              key={g.id}
              emoji={g.emoji}
              title={g.name}
              sub={`${g.years} ans · ${money(state, g.cost)}/an · ${g.requiresMajor.map((m) => getMajor(m)?.name).join(', ')}`}
              right={eligible ? <Pill tone="accent">Accessible</Pill> : <Pill tone="bad">Filière requise</Pill>}
              closed={!eligible}
              because={`Réservé à : ${g.requiresMajor.map((m) => getMajor(m)?.name).join(', ')}.`}
              onClick={() => {
                const outcome = run((ctx) => enrollGraduate(ctx, g.id), g.emoji);
                if (outcome.ok) onBack();
              }}
              chevron
            />
          );
        })}
      </Card>
    </Sheet>
  );
}

function ClubsPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const joined = state.player.education.clubs;
  const offered = availableClubs(state);

  return (
    <Sheet title="Activités et clubs" onBack={onBack}>
      <p className="small muted">
        Rejoindre un club change durablement tes statistiques. Ton établissement
        ne propose que ce qu’il a les moyens de proposer.
      </p>
      <Card>
        {offered.length === 0 && (
          <Row emoji="🚪" title="Aucun club" sub="Ton établissement n’en propose aucun cette année." />
        )}
        {offered.map((c) => (
          <Row
            key={c.id}
            emoji={c.emoji}
            title={c.name}
            sub={Object.entries(c.effects)
              .map(([k, v]) => `${statLabel(k)} ${v > 0 ? '+' : ''}${v}`)
              .join(' · ')}
            right={joined.includes(c.id) ? <Pill tone="good">Membre</Pill> : undefined}
            closed={joined.includes(c.id)}
            because="Tu en es déjà membre."
            onClick={() => run((ctx) => joinClub(ctx, c.id), c.emoji)}
            chevron
          />
        ))}
      </Card>
    </Sheet>
  );
}

function statLabel(key: string): string {
  const labels: Record<string, string> = {
    happiness: 'Bonheur', health: 'Santé', intelligence: 'Esprit', looks: 'Allure',
    fitness: 'Forme', discipline: 'Discipline', reputation: 'Réputation', karma: 'Karma',
    stress: 'Stress', addiction: 'Dépendance', criminality: 'Criminalité', fertility: 'Fertilité',
  };
  return labels[key] ?? key;
}

function OffersPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [category, setCategory] = useState<string>('Toutes');
  if (!state) return null;

  const offers = state.world.jobOffers;
  const categories = ['Toutes', ...Array.from(new Set(offers.map((o) => o.category))).sort()];
  const visible = category === 'Toutes' ? offers : offers.filter((o) => o.category === category);
  const sorted = [...visible].sort((a, b) => {
    const ba = offerBlocker(state, a) ? 1 : 0;
    const bb = offerBlocker(state, b) ? 1 : 0;
    return ba - bb || b.salary - a.salary;
  });

  return (
    <Sheet title="Offres d’emploi" onBack={onBack}>
      <div style={{ overflowX: 'auto', paddingBottom: 8, marginBottom: 4 }}>
        <div className="chips" style={{ flexWrap: 'nowrap' }}>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} type="button">
              <span className={`pill${c === category ? ' pill-primary' : ''}`}>{c}</span>
            </button>
          ))}
        </div>
      </div>
      {sorted.length === 0 ? (
        <Empty>Aucune offre dans cette catégorie cette année.</Empty>
      ) : (
        <Card>
          {sorted.map((offer) => (
            <OfferRow key={offer.id} offer={offer} onApply={() => run((ctx) => applyToJob(ctx, offer.id), '💼')} />
          ))}
        </Card>
      )}
      <p className="small muted" style={{ marginTop: 12 }}>
        Les annonces ne concernent que les postes d’entrée : les fonctions de direction
        s’obtiennent par promotion interne. Les offres changent chaque année.
      </p>
    </Sheet>
  );
}

function OfferRow({ offer, onApply }: { offer: JobOffer; onApply: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const blocker = offerBlocker(state, offer);
  const job = getJob(offer.jobId);

  return (
    <Row
      emoji={job?.emoji ?? '💼'}
      title={offer.title}
      sub={`${offer.employer} · ${offer.hours} h/sem · stress ${offer.stress}/100`}
      because={blocker}
      right={<strong>{money(state, offer.salary)}</strong>}
      // Le geste n'est plus retiré ici : `Row` refuse l'appui quand la ligne
      // est fermée, et la garde annoncée. Le retirer en faisait un bloc inerte
      // — le plus gros amas de tout le jeu, l'annonce d'emploi étant justement
      // l'endroit où la raison du refus dit quoi faire pour y arriver.
      onClick={onApply}
      closed={Boolean(blocker)}
      chevron={!blocker}
    />
  );
}

function CareerHistoryPanel({ onBack }: { onBack: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const history = [...state.player.careerHistory].reverse();

  return (
    <Sheet title="Historique professionnel" onBack={onBack}>
      {history.length === 0 ? (
        <Empty>Aucune expérience professionnelle pour l’instant.</Empty>
      ) : (
        <Card>
          {history.map((h, i) => (
            <Row
              key={`${h.title}-${h.from}-${i}`}
              emoji="🗂️"
              title={h.title}
              sub={h.employer}
              right={`${h.from} – ${h.to ?? 'aujourd’hui'}`}
            />
          ))}
        </Card>
      )}
      <Section title="Récapitulatif">
        <Card>
          <Row emoji="⏳" title="Expérience totale" right={fmtYears(experienceYears(state))} />
          <Row emoji="💰" title="Revenus cumulés" right={money(state, state.player.lifetimeEarnings)} />
        </Card>
      </Section>
    </Sheet>
  );
}
