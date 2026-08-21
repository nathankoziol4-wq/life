/**
 * L'école, vue de l'intérieur.
 *
 * Le « Parcours » donne le statut administratif ; cet écran donne le
 * quotidien. On y trouve l'établissement, le dossier, la classe, le
 * personnel, les clubs, les groupes — et surtout de quoi agir, parce qu'un
 * élève passe treize ans de sa vie ici et qu'appuyer sur « +1 an » ne devrait
 * jamais être sa seule option.
 */

import { useState } from 'react';
import {
  Empty, Gauge, Meter, Pill, Segmented, Sheet,
} from '../components/Modal.tsx';
/*
 * Le vocabulaire du système. Huit lignes de cet écran écrivaient
 * `sub={blocage ?? description}` : la raison d'un refus **remplaçait** ce que
 * la ligne proposait, si bien qu'on ne pouvait jamais lire les deux. Le motif
 * revient partout dans le jeu ; il a sa place propre désormais.
 */
import { Card, Row, Section } from '../ui/components/list.tsx';
import { GameGauge, MiniGameHost } from '../components/MiniGameHost.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor } from '../ui/format.ts';
import { money } from '../ui/format.ts';
import {
  CLUBS, STAGE_LABELS, availableClubs, changeSchool, dropOut, isInSchool,
  joinClub, setEffort, transferOptions,
} from '../systems/education.ts';
import {
  classmateAction, joinPeerGroup, leaveClub, leavePeerGroup, skipSchool, studyHarder,
  teacherAction, disrespect,
} from '../systems/schoolActions.ts';
import { classmatesOf, friendshipChance, staffOf } from '../systems/school.ts';
import {
  alliesOf, availableResponses, backingOf, bullyOf, harassmentOf, pickOn,
  respond, responseBlocker, responseOdds, witnessesOf,
} from '../systems/bullying.ts';
import { RESPONSES, getBullyingKind, intensityLabel } from '../data/bullying.ts';
import {
  captaincyBlocker, captaincyOdds, levelLabel, offeredSports, quitSport,
  runForCaptain, scholarshipGap, selectionBlocker, selectionOdds, sportDef,
  sportOf, teammateQuality, train, trainingBlocker, trySelection,
} from '../systems/schoolSport.ts';
import { SCHOLARSHIP, seasonLabel, squadInfo, type Squad } from '../data/schoolSports.ts';
import {
  cheatBlocker, examBlocker, examContext, examOf, report, setCheating,
  settleExam, strengths, weaknesses,
} from '../systems/exams.ts';
import { markWord, sessionFor } from '../data/subjects.ts';
import { EXAM, type ExamState, type ExamSetup } from '../systems/minigames/exam.ts';
import { getAvailableActions } from '../systems/actions.ts';
import { interact } from '../systems/relationships.ts';
import { SCHOOL_MAP } from '../data/schools.ts';
import { INTEREST_MAP } from '../data/interests.ts';
import type { Person } from '../engine/types.ts';

type Panel = null | 'classmates' | 'staff' | 'clubs' | 'groups' | 'record' | 'harassment' | 'sport' | 'marks' | 'exam' | 'transfer';

export function SchoolScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [panel, setPanel] = useState<Panel>(null);
  const [selected, setSelected] = useState<string | null>(null);
  if (!state) return null;

  const p = state.player;
  const edu = p.education;
  const school = p.origin.school;
  const klass = p.origin.schoolClass;
  const inSchool = isInSchool(state);
  const mates = classmatesOf(state);
  const staff = staffOf(state);
  const d = edu.discipline;
  const harassment = harassmentOf(state);
  const bully = bullyOf(state);
  const sport = sportOf(state);
  const sportKind = sportDef(state);
  const exam = examOf(state);
  const session = exam ? sessionFor(exam.stage) : undefined;

  if (selected) {
    return <SchoolPersonSheet personId={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <Sheet title="École" onBack={onBack}>
      {!inSchool || !school ? (
        <Empty>Tu n’es scolarisé nulle part en ce moment.</Empty>
      ) : (
        <>
          {/* ------------- L'établissement ------------- */}
          <Card pad>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
              {school.name}
            </div>
            <div className="row-sub">{SCHOOL_MAP[school.archetypeId]?.description}</div>
            <div className="chips" style={{ marginTop: 12 }}>
              <Pill tone="primary">{STAGE_LABELS[edu.stage]}</Pill>
              <Pill>
                Année {edu.yearInStage || 1}/{edu.stageLength}
              </Pill>
              <Pill tone={edu.grades >= 14 ? 'good' : edu.grades >= 8 ? 'warn' : 'bad'}>
                {edu.grades.toFixed(1)}/20
              </Pill>
              {school.tuition > 0 && <Pill tone="warn">{money(state, school.tuition)}/an</Pill>}
            </div>
          </Card>

          <Section title="L’établissement">
            <Card>
              <Row emoji="📘" title="Niveau académique" right={<Gauge value={school.academic} />} />
              <Row emoji="👩‍🏫" title="Qualité de l’enseignement" right={<Gauge value={school.teacherQuality} />} />
              <Row emoji="🏛️" title="Réputation" right={<Gauge value={school.reputation} />} />
              <Row emoji="📏" title="Sévérité du règlement" right={<Gauge value={school.discipline} />} />
              <Row emoji="🎯" title="Pression scolaire" right={<Gauge value={school.pressure} />} />
              <Row emoji="🛡️" title="Sécurité" right={<Gauge value={school.safety} />} />
              <Row emoji="👥" title="Élèves par classe" right={String(school.classSize)} />
            </Card>
          </Section>

          {/* ------------- Le dossier ------------- */}
          <Section title="Ton dossier">
            <Card>
              <div className="card-pad">
                <div className="spread small muted" style={{ marginBottom: 6 }}>
                  <span>Comportement</span>
                  <span>{behaviourWord(d.behaviour)}</span>
                </div>
                <Meter value={d.behaviour} />
              </div>
              <Row emoji="⚠️" title="Avertissements" right={String(d.warnings)} />
              <Row emoji="🪑" title="Retenues" right={String(d.detentions)} />
              <Row emoji="🚫" title="Exclusions" right={String(d.suspensions)} />
              <Row emoji="🚪" title="Absences cette année" right={String(edu.absences)} />
              <Row
                emoji="📊"
                title="Ton bulletin"
                sub={(() => {
                  const good = strengths(state);
                  const bad = weaknesses(state);
                  if (good.length === 0 && bad.length === 0) return 'Rien qui ressorte pour l’instant';
                  return [
                    good.length ? `fort en ${good.map((x) => x.label.toLowerCase()).join(', ')}` : null,
                    bad.length ? `faible en ${bad.map((x) => x.label.toLowerCase()).join(', ')}` : null,
                  ].filter(Boolean).join(' · ');
                })()}
                onClick={() => setPanel('marks')}
                chevron
              />
              {d.record.length > 0 && (
                <Row
                  emoji="📋"
                  title="Faits consignés"
                  sub={d.record[d.record.length - 1].text}
                  onClick={() => setPanel('record')}
                  chevron
                />
              )}
            </Card>
          </Section>

          {/* ------------- La session d'examens ------------- */}
          {exam && session && (
            <Section title="Cette année">
              <Card>
                <Row
                  emoji={exam.done ? (exam.caught ? '🚫' : '📄') : '✍️'}
                  title={session.label}
                  sub={exam.done
                    ? exam.caught
                      ? 'Copie annulée pour fraude.'
                      : `${exam.mark}/20 — ${markWord(exam.mark)}.`
                    : session.what}
                  right={exam.done
                    ? <Pill tone={exam.caught || exam.mark < 8 ? 'bad' : exam.mark >= 12 ? 'good' : 'warn'}>
                        {exam.caught ? '0' : exam.mark}
                      </Pill>
                    : <Pill tone="accent">à passer</Pill>}
                  onClick={exam.done ? undefined : () => setPanel('exam')}
                  chevron={!exam.done}
                />
              </Card>
            </Section>
          )}

          {/* ------------- Ce qui se passe dans la cour ------------- */}
          {harassment && bully && (
            <Section title="Ce qui se passe">
              <Card>
                <Row
                  emoji={getBullyingKind(harassment.kindId)?.emoji ?? '🗯️'}
                  title={harassment.resolvedYear
                    ? 'C’est fini'
                    : getBullyingKind(harassment.kindId)?.label ?? 'On te prend pour cible'}
                  sub={harassment.resolvedYear
                    ? harassment.outcome ?? ''
                    : `${bully.firstName} · ${intensityLabel(harassment.intensity).label.toLowerCase()}`}
                  right={harassment.resolvedYear
                    ? <Pill tone="good">Terminé</Pill>
                    : <Pill tone={harassment.intensity > 58 ? 'bad' : 'warn'}>
                        {Math.round(harassment.intensity)}
                      </Pill>}
                  onClick={() => setPanel('harassment')}
                  chevron
                />
              </Card>
            </Section>
          )}

          {/* ------------- Où on en est socialement ------------- */}
          {klass && (
            <Section title="Ta place dans la classe">
              <Card>
                <Row emoji="👋" title="On te connaît" sub={countOf(p.origin.popularity.known, klass.size)} />
                <Row emoji="❤️" title="On t’apprécie" sub={countOf(p.origin.popularity.liked, klass.size)} />
                <Row emoji="🫡" title="On te respecte" sub={countOf(p.origin.popularity.respected, klass.size)} />
                <Row emoji="😂" title="On te trouve drôle" sub={countOf(p.origin.popularity.funny, klass.size)} />
                <Row emoji="😬" title="On te craint" sub={countOf(p.origin.popularity.intimidating, klass.size)} />
              </Card>
              <p className="small muted" style={{ margin: '8px 4px 0' }}>
                Être connu n’est pas être apprécié, et être craint n’est pas
                être respecté. Ces cinq lignes bougent séparément.
              </p>
            </Section>
          )}

          {/* ------------- Agir ------------- */}
          <Section title="Ce que tu peux faire">
            <Card>
              <div className="card-pad">
                <div className="small muted" style={{ marginBottom: 6 }}>
                  Rythme de travail pour l’année à venir
                </div>
                <Segmented
                  value={edu.effort}
                  onChange={(v) => run((ctx) => setEffort(ctx, v))}
                  options={[
                    { value: 'none', label: 'Minimum' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'hard', label: 'Intensif' },
                  ]}
                />
              </div>
            </Card>
            <Card>
              <Row
                emoji="📚"
                title="Travailler davantage"
                sub="Deux coups de collier par an. Ça se voit, et ça fatigue."
                onClick={() => run((ctx) => studyHarder(ctx), '📚')}
                chevron
              />
              <Row
                emoji="🚪"
                title="Sécher les cours"
                sub={edu.absences > 0 ? `${edu.absences} absence(s) déjà cette année` : 'Agréable, et de moins en moins discret'}
                onClick={() => run((ctx) => skipSchool(ctx), '🚪')}
                chevron
              />
              <Row
                emoji="🎒"
                title="Changer d’établissement"
                sub={transferOptions(state).some((o) => o.blocked === null)
                  ? 'Le secteur, le privé, l’internat — et tout à refaire'
                  : 'Rien d’ouvert cette année'}
                onClick={() => setPanel('transfer')}
                chevron
              />
              {p.age >= 16 && (
                <Row
                  emoji="🚷"
                  title="Abandonner les études"
                  sub="Difficilement réversible"
                  onClick={() => run((ctx) => dropOut(ctx), '🚷')}
                  chevron
                />
              )}
            </Card>
          </Section>

          {/* ------------- Les gens ------------- */}
          <Section title="Les gens">
            <Card>
              <Row
                emoji="🧑‍🤝‍🧑"
                title="Camarades"
                sub={mates.length ? `${mates.length} élèves que tu croises tous les jours` : 'Personne de marquant cette année'}
                onClick={() => setPanel('classmates')}
                right={<Pill>{mates.length}</Pill>}
                chevron
              />
              <Row
                emoji="👩‍🏫"
                title="Professeurs et direction"
                sub={staff.length ? `${staff.length} adultes identifiés` : 'Personne en particulier'}
                onClick={() => setPanel('staff')}
                right={<Pill>{staff.length}</Pill>}
                chevron
              />
              <Row
                emoji="🎭"
                title="Clubs et activités"
                sub={edu.clubs.length ? edu.clubs.map((id) => CLUBS.find((c) => c.id === id)?.name).join(', ') : 'Aucun club'}
                onClick={() => setPanel('clubs')}
                chevron
              />
              <Row
                emoji={sportKind?.emoji ?? '🏅'}
                title={sport && sportKind && !sport.cutYear
                  ? sportKind.label
                  : 'Sport scolaire'}
                sub={sport && sportKind && !sport.cutYear
                  ? `${squadInfo(sport.squad as Squad).label} · ${levelLabel(sport.level).toLowerCase()}${sport.captain ? ' · capitaine' : ''}`
                  : `${offeredSports(state).length} sport(s) proposés — il faut passer une sélection`}
                right={sport && !sport.cutYear
                  ? <Pill tone={sport.injuredUntil > state.year ? 'bad' : 'primary'}>
                      {sport.injuredUntil > state.year ? 'blessé' : Math.round(sport.level)}
                    </Pill>
                  : undefined}
                onClick={() => setPanel('sport')}
                chevron
              />
              <Row
                emoji="👥"
                title="Groupes de la classe"
                sub={klass?.groups.length ? `${klass.groups.length} groupes identifiés` : 'Rien de constitué'}
                onClick={() => setPanel('groups')}
                chevron
              />
            </Card>
          </Section>
        </>
      )}

      {panel === 'classmates' && (
        <PeopleSheet
          title="Camarades"
          people={mates}
          empty="Personne de marquant dans cette classe."
          onSelect={setSelected}
          onBack={() => setPanel(null)}
        />
      )}
      {panel === 'staff' && (
        <StaffSheet onSelect={setSelected} onBack={() => setPanel(null)} />
      )}
      {panel === 'clubs' && <ClubsSheet onBack={() => setPanel(null)} />}
      {panel === 'groups' && <GroupsSheet onBack={() => setPanel(null)} />}
      {panel === 'record' && <RecordSheet onBack={() => setPanel(null)} />}
      {panel === 'harassment' && <HarassmentSheet onBack={() => setPanel(null)} />}
      {panel === 'sport' && <SportSheet onBack={() => setPanel(null)} />}
      {panel === 'marks' && <MarksSheet onBack={() => setPanel(null)} />}
      {panel === 'exam' && <ExamSheet onBack={() => setPanel(null)} />}
      {panel === 'transfer' && <TransferSheet onBack={() => setPanel(null)} />}
    </Sheet>
  );
}

function behaviourWord(v: number): string {
  if (v >= 82) return 'irréprochable';
  if (v >= 62) return 'sans histoires';
  if (v >= 42) return 'surveillé';
  if (v >= 22) return 'problématique';
  return 'dossier lourd';
}

function countOf(n: number, size: number): string {
  if (n <= 0) return 'personne';
  if (n >= size * 0.7) return 'presque toute la classe';
  if (n >= size * 0.35) return 'une bonne partie de la classe';
  if (n <= 2) return `${n} personne${n > 1 ? 's' : ''}`;
  return `${n} élèves`;
}

/* ------------------------------------------------------------------ */
/* Listes                                                             */
/* ------------------------------------------------------------------ */

function PeopleSheet({
  title, people, empty, onSelect, onBack,
}: {
  title: string;
  people: Person[];
  empty: string;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const { state } = useGame();
  if (!state) return null;

  return (
    <Sheet title={title} onBack={onBack}>
      {people.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <Card>
          {[...people]
            .sort((a, b) => b.relationship - a.relationship)
            .map((x) => {
              const group = state.player.origin.schoolClass?.groups
                .find((g) => g.memberIds.includes(x.id));
              const passion = x.psyche?.interests.slice().sort((a, b) => b.level - a.level)[0];
              return (
                <Row
                  key={x.id}
                  emoji={avatarFor(x)}
                  title={`${x.firstName} ${x.lastName}`}
                  sub={[
                    x.relation === 'bestFriend' ? 'meilleur ami'
                      : x.relation === 'friend' ? 'ami' : `${x.age} ans`,
                    group?.label,
                    passion ? `aime ${INTEREST_MAP[passion.id]?.label.toLowerCase() ?? passion.id}` : null,
                  ].filter(Boolean).join(' · ')}
                  right={<Gauge value={x.relationship} />}
                  onClick={() => onSelect(x.id)}
                  chevron
                />
              );
            })}
        </Card>
      )}
    </Sheet>
  );
}

function StaffSheet({ onSelect, onBack }: { onSelect: (id: string) => void; onBack: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const staff = staffOf(state);

  return (
    <Sheet title="Personnel" onBack={onBack}>
      {staff.length === 0 ? (
        <Empty>Aucun adulte identifié dans cet établissement.</Empty>
      ) : (
        <Card>
          {staff.map(({ staff: s, person: x }) => (
            <Row
              key={x.id}
              emoji={s.role === 'directeur' ? '🎩' : s.role === 'conseiller' ? '🧭' : '👩‍🏫'}
              title={`${x.firstName} ${x.lastName}`}
              sub={[
                s.subject ?? s.role,
                s.strictness > 68 ? 'sévère' : s.strictness < 34 ? 'laxiste' : null,
                s.skill > 70 ? 'très compétent' : s.skill < 36 ? 'dépassé' : null,
              ].filter(Boolean).join(' · ')}
              right={<Gauge value={x.relationship} />}
              onClick={() => onSelect(x.id)}
              chevron
            />
          ))}
        </Card>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>
        Un professeur intègre juge sur le travail ; un professeur qui l’est
        moins a des têtes. Savoir lequel est lequel change ce qu’il faut tenter.
      </p>
    </Sheet>
  );
}

function ClubsSheet({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const p = state.player;
  const offered = availableClubs(state);

  return (
    <Sheet title="Clubs et activités" onBack={onBack}>
      {p.education.clubs.length > 0 && (
        <Section title="Tes activités">
          <Card>
            {p.education.clubs.map((id) => {
              const club = CLUBS.find((c) => c.id === id);
              const standing = p.education.clubStanding[id];
              return (
                <Row
                  key={id}
                  emoji={club?.emoji ?? '🎭'}
                  title={club?.name ?? id}
                  sub={standing
                    ? `${standing.rank} · ${standing.years} an${standing.years > 1 ? 's' : ''}`
                    : 'nouveau membre'}
                  right={standing?.rank === 'responsable'
                    ? <Pill tone="good">Responsable</Pill>
                    : standing?.rank === 'titulaire' ? <Pill tone="accent">Titulaire</Pill> : undefined}
                  onClick={() => run((ctx) => leaveClub(ctx, id), club?.emoji ?? '🎭')}
                  chevron
                />
              );
            })}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Appuie sur une activité pour la quitter. On devient titulaire puis
            responsable en restant et en étant bon — pas seulement en restant.
          </p>
        </Section>
      )}

      <Section title="Ce que propose l’établissement">
        {offered.length === 0 ? (
          <Empty>Cet établissement ne propose aucune activité.</Empty>
        ) : (
          <Card>
            {offered
              .filter((c) => !p.education.clubs.includes(c.id))
              .map((c) => (
                <Row
                  key={c.id}
                  emoji={c.emoji}
                  title={c.name}
                  sub={Object.keys(c.effects).join(' · ')}
                  onClick={() => run((ctx) => joinClub(ctx, c.id), c.emoji)}
                  chevron
                />
              ))}
          </Card>
        )}
      </Section>
    </Sheet>
  );
}

function GroupsSheet({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const klass = state.player.origin.schoolClass;
  const groups = klass?.groups ?? [];

  return (
    <Sheet title="Groupes" onBack={onBack}>
      {groups.length === 0 ? (
        <Empty>
          Rien ne s’est encore constitué dans cette classe. Les groupes
          apparaissent quand assez d’élèves partagent un goût.
        </Empty>
      ) : (
        <Card>
          {groups.map((g) => (
            <Row
              key={g.id}
              emoji={g.interestId ? INTEREST_MAP[g.interestId]?.emoji ?? '👥' : '👥'}
              title={g.label}
              sub={`${g.memberIds.length} membres · ${g.standing > 66 ? 'groupe en vue' : g.standing > 40 ? 'groupe ordinaire' : 'groupe en marge'}`}
              right={g.playerMember ? <Pill tone="good">Tu en fais partie</Pill> : undefined}
              onClick={() => run(
                (ctx) => (g.playerMember ? leavePeerGroup(ctx, g.id) : joinPeerGroup(ctx, g.id)),
                '👥',
              )}
              chevron
            />
          ))}
        </Card>
      )}
      <p className="small muted" style={{ marginTop: 10 }}>
        On n’entre pas dans un groupe en le demandant : il faut partager ce
        qu’il partage, y connaître quelqu’un, et que sa réputation ne joue pas
        contre soi.
      </p>
    </Sheet>
  );
}

function RecordSheet({ onBack }: { onBack: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const record = state.player.education.discipline.record;

  return (
    <Sheet title="Faits consignés" onBack={onBack}>
      <Card>
        {[...record].reverse().map((r, i) => (
          <Row key={`${r.year}_${i}`} emoji="•" title={r.text} right={String(r.year)} />
        ))}
      </Card>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Ce qui se passe dans la cour                                       */
/* ------------------------------------------------------------------ */

/**
 * L'écran de la situation.
 *
 * Il dit trois choses et pas une de plus : ce qui se passe, qui le voit, et
 * de quoi dépend chaque réponse. Il ne dit **jamais** laquelle marchera — s'il
 * le disait, il n'y aurait plus de décision, seulement une case à cocher.
 */
function HarassmentSheet({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const h = harassmentOf(state);
  const bully = bullyOf(state);
  if (!h || !bully) return <Sheet title="Ce qui se passe" onBack={onBack}><Empty>Rien en ce moment.</Empty></Sheet>;
  const kind = getBullyingKind(h.kindId);
  const band = intensityLabel(h.intensity);
  const seen = witnessesOf(state);
  const allies = alliesOf(state);
  const open = availableResponses(state);

  if (h.resolvedYear) {
    return (
      <Sheet title="C’est fini" onBack={onBack}>
        <Card pad>
          <div className="row-title">{h.outcome}</div>
          <div className="row-sub" style={{ marginTop: 6 }}>
            Ça a duré {h.years === 0 ? 'moins d’un an' : `${h.years} an(s)`}. Ce
            que ça t’a fait ne s’efface pas avec la situation.
          </div>
        </Card>
      </Sheet>
    );
  }

  return (
    <Sheet title={kind?.label ?? 'Ce qui se passe'} onBack={onBack}>
      <Card pad>
        <div className="row-title">{kind?.what}</div>
        <div className="row-sub" style={{ marginTop: 6 }}>{band.note}</div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={h.intensity > 58 ? 'bad' : 'warn'}>{band.label}</Pill>
          <Pill>{h.years === 0 ? 'depuis cette année' : `${h.years} an(s)`}</Pill>
          {h.reported && <Pill>signalé</Pill>}
          {h.toldParents && <Pill>ils savent, à la maison</Pill>}
        </div>
      </Card>

      <Section title="Qui">
        <Card>
          <Row
            emoji="😠"
            title={`${bully.firstName} ${bully.lastName}`}
            sub={backingOf(state) > 3
              ? `${bully.sex === 'F' ? 'Elle' : 'Il'} n’est pas ${bully.sex === 'F' ? 'seule' : 'seul'}, et ça se sent`
              : `${bully.sex === 'F' ? 'Elle agit à peu près seule' : 'Il agit à peu près seul'}`}
          />
          <Row
            emoji="👀"
            title="Ceux qui voient"
            sub={seen.length === 0
              ? 'Personne, ou personne qui l’admette'
              : seen.map((w) => w.firstName).join(', ')}
            right={<Pill>{seen.length}</Pill>}
          />
          <Row
            emoji="🧑‍🤝‍🧑"
            title="Sur qui tu pourrais compter"
            sub={allies.length === 0
              ? 'Aucun d’eux ne prendrait un risque pour toi'
              : allies.map((a) => a.firstName).join(', ')}
            right={<Pill tone={allies.length > 0 ? 'good' : 'bad'}>{allies.length}</Pill>}
          />
        </Card>
      </Section>

      <Section title="Ce que tu peux faire">
        <Card>
          {RESPONSES.map((r) => {
            const blocked = responseBlocker(state, r.id);
            const odds = responseOdds(state, r.id);
            return (
              <Row
                key={r.id}
                emoji={r.emoji}
                title={r.label}
                sub={r.depends}
                right={blocked ? undefined : <Pill tone={oddsTone(odds)}>{oddsWord(odds)}</Pill>}
                closed={Boolean(blocked)}
                because={blocked}
                onClick={() => run((ctx) => respond(ctx, r.id), r.emoji)}
                chevron={!blocked}
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Aucune de ces réponses ne marche à tous les coups. Ce qui décide n’est
          pas le courage : c’est l’état de la classe, celui de l’établissement
          et celui de la maison. {open.length === 0 && 'Tu as épuisé ce que tu pouvais tenter cette année.'}
        </p>
      </Section>

      <Section title="Ce que ça coûte, même quand ça marche">
        <Card>
          {RESPONSES.map((r) => (
            <Row key={`c_${r.id}`} emoji={r.emoji} title={r.label} sub={r.cost} />
          ))}
        </Card>
      </Section>
    </Sheet>
  );
}

/**
 * Les chances, en mots.
 *
 * Jamais en pourcentage : un enfant de treize ans ne sait pas que sa réponse
 * a 42 % de porter. Il sent seulement que c'est jouable ou que ça ne l'est pas.
 */
function oddsWord(p: number): string {
  if (p >= 0.6) return 'ça peut marcher';
  if (p >= 0.35) return 'peut-être';
  if (p >= 0.15) return 'peu probable';
  return 'quasiment aucune chance';
}

function oddsTone(p: number): 'good' | 'warn' | 'bad' {
  return p >= 0.6 ? 'good' : p >= 0.35 ? 'warn' : 'bad';
}

/* ------------------------------------------------------------------ */
/* Changer d'établissement                                            */
/* ------------------------------------------------------------------ */

/**
 * Les trois sorties.
 *
 * L'écran dit ce que chacune coûte — y compris ce qu'elle coûte quand elle ne
 * coûte pas d'argent, parce que c'est là qu'est le vrai prix.
 */
function TransferSheet({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const options = transferOptions(state);

  return (
    <Sheet title="Changer d’établissement" onBack={onBack}>
      <Card pad>
        <p style={{ margin: 0, lineHeight: 1.55 }}>
          Un meilleur cadre contre tout ce que tu as construit dedans. Tu
          perdras ta classe, tes amitiés d’ici et la place que tu t’y étais
          faite.
        </p>
      </Card>
      <Section title="Ce qui est possible">
        <Card>
          {options.map((option) => (
            <Row
              key={option.id}
              emoji={option.emoji}
              title={option.label}
              sub={option.what}
              right={option.cost > 0
                ? <Pill tone="warn">{money(state, option.cost)}/an</Pill>
                : <Pill>gratuit</Pill>}
              closed={Boolean(option.blocked)}
              because={option.blocked}
              onClick={() => {
                const outcome = run((ctx) => changeSchool(ctx, option.id), option.emoji);
                if (outcome.ok) onBack();
              }}
              chevron={!option.blocked}
            />
          ))}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Une dérogation se demande, elle ne s’obtient pas : ton dossier et ton
          quartier décident. Le privé et l’internat dépendent de ce que ta
          famille peut payer, pas de ce que tu veux.
        </p>
      </Section>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Le bulletin                                                        */
/* ------------------------------------------------------------------ */

function MarksSheet({ onBack }: { onBack: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const rows = report(state).filter((r) => r.mark > 0);

  return (
    <Sheet title="Bulletin" onBack={onBack}>
      {rows.length === 0 ? (
        <Empty>Aucune note pour l’instant. Il faut avoir fait une année.</Empty>
      ) : (
        <>
          <Card>
            {rows.map(({ subject, mark }) => (
              <Row
                key={subject.id}
                emoji={subject.emoji}
                title={subject.label}
                sub={markWord(mark)}
                right={<Pill tone={mark >= 14 ? 'good' : mark >= 8 ? 'warn' : 'bad'}>
                  {mark.toFixed(1)}
                </Pill>}
              />
            ))}
          </Card>
          <p className="small muted" style={{ margin: '10px 4px 0' }}>
            Une matière qui repose sur le talent brut ne se rattrape pas en
            travaillant, et l’inverse est vrai aussi. La moyenne générale cache
            exactement ça — et ce sont ces lignes-là que regardent les filières,
            pas la moyenne.
          </p>
        </>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* L'examen                                                           */
/* ------------------------------------------------------------------ */

/**
 * La salle d'examen.
 *
 * Deux temps : ce qu'on décide avant d'entrer — y aller honnêtement ou non —
 * et la copie elle-même. Ce qui se joue n'est pas le savoir mais le temps :
 * quelles questions on attaque, et quand on lâche celle sur laquelle on
 * s'acharne.
 */
export function ExamSheet({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;
  const exam = examOf(state);
  const session = exam ? sessionFor(exam.stage) : undefined;
  if (!exam || !session) {
    return <Sheet title="Examen" onBack={onBack}><Empty>Aucune session en ce moment.</Empty></Sheet>;
  }
  const blocker = examBlocker(state);
  const cheatBlock = cheatBlocker(state);
  const context = examContext(state, exam.cheated);

  if (playing && context) {
    const setup = context.setup as ExamSetup;
    return (
      <Sheet title={session.label} onBack={() => setPlaying(false)}>
        <MiniGameHost
          key={`exam-${seed}`}
          def={EXAM}
          context={context}
          seed={seed}
          render={(s: ExamState) => <Paper state={s} insight={context.grace.insight} />}
          onFinish={(_s, result) => {
            run((ctx) => settleExam(ctx, result), '📄');
            setPlaying(false);
            setSeed(Math.floor(Math.random() * 2 ** 31));
            onBack();
          }}
          onQuit={() => { /* la copie se rend d'elle-même au pas suivant */ }}
        />
        <p className="small muted" style={{ margin: '10px 4px 0' }}>
          Touche une case pour choisir une question, puis garde le doigt appuyé
          pour la travailler. Au-delà de ce qu’elle demande, tu ne fais que
          perdre du temps — et le temps ne s’arrête pas.
          {setup.cheating && ' Le surveillant regarde d’autant plus que tu restes longtemps dessus.'}
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet title={session.label} onBack={onBack}>
      <Card pad>
        <div className="row-title">{session.what}</div>
        <div className="row-sub" style={{ marginTop: 6 }}>
          Ce n’est pas ce que tu sais qui se joue ici, c’est ce que tu fais des
          quatre heures.
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          {exam.subjectIds.map((id) => {
            const subject = report(state).find((r) => r.subject.id === id);
            return subject ? (
              <Pill key={id} tone={subject.mark >= 12 ? 'good' : subject.mark >= 8 ? 'warn' : 'bad'}>
                {subject.subject.emoji} {subject.mark.toFixed(0)}
              </Pill>
            ) : null;
          })}
        </div>
      </Card>

      <Section title="Avant d’entrer">
        <Card>
          <Row
            emoji="✍️"
            title="Y aller honnêtement"
            sub="Ce sera ce que tu vaux"
            right={exam.cheated ? undefined : <Pill tone="good">Choisi</Pill>}
            onClick={() => run((ctx) => setCheating(ctx, false), '✍️')}
            chevron
          />
          <Row
            emoji="🙈"
            title="Préparer quelque chose"
            sub="Tes réponses rendront davantage, et quelqu’un au fond regarde"
            right={exam.cheated ? <Pill tone="bad">Choisi</Pill> : undefined}
            closed={Boolean(cheatBlock)}
            because={cheatBlock}
            onClick={() => run((ctx) => setCheating(ctx, true), '🙈')}
            chevron={!cheatBlock}
          />
        </Card>
        {exam.cheated && (
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Se faire prendre annule la copie et va au dossier. Le surveillant
            se désintéresse quand tu travailles normalement.
          </p>
        )}
      </Section>

      <Section title="Entrer">
        <Card>
          <Row
            emoji="🚪"
            title="Entrer dans la salle"
            sub="On ne recommence pas"
            closed={Boolean(blocker)}
            because={blocker}
            onClick={() => setPlaying(true)}
            chevron={!blocker}
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          L’examen ne remplace pas ton année : il la corrige. Ne pas s’y
          présenter compte comme un zéro.
        </p>
      </Section>
    </Sheet>
  );
}

/** La copie : neuf cases, une barre, un chronomètre. */
function Paper({ state: s, insight }: { state: ExamState; insight: boolean }) {
  const left = Math.max(0, s.limit - s.elapsed) / 1000;
  const active = s.active !== null ? s.questions[s.active] : null;

  return (
    <>
      <div className="paper">
        {s.questions.map((q, i) => (
          <div
            key={q.id}
            className={`paper-cell${i === s.active ? ' paper-cell-active' : ''}`}
          >
            <div className="paper-worth">{q.worth}</div>
            <div className="paper-hardness">
              {insight ? '●'.repeat(1 + Math.round(q.seen * 3)) : '?'}
            </div>
            <div className="paper-bar">
              <div className="paper-bar-fill" style={{ width: `${q.done * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="scene-hud">
        <div className="spread small" style={{ marginBottom: 8 }}>
          <span>
            {active
              ? `Question ${active.id + 1} · ${active.worth} points`
              : 'Choisis une question'}
          </span>
          <span>{left.toFixed(0)} s</span>
        </div>
        <GameGauge label="Ta copie" value={s.filled} low danger={55} />
        {s.cheating && <GameGauge label="Le surveillant" value={s.attention} danger={70} />}
        {!insight && (
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            Tu ne sais pas ce que chaque question demande vraiment. Ça viendra
            avec le niveau.
          </p>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Le sport scolaire                                                  */
/* ------------------------------------------------------------------ */

/**
 * L'écran de la filière.
 *
 * Il montre les trois choses qui décident : où l'on joue, ce qu'il manque
 * pour la bourse, et ce qu'on peut faire cette année. La bourse est affichée
 * même quand elle est hors de portée — c'est la seule façon que le joueur
 * sache qu'il y a un chemin au bout.
 */
function SportSheet({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const p = state.player;
  const s = sportOf(state);
  const def = sportDef(state);
  const offered = offeredSports(state);

  /* --- Pas encore d'équipe, ou écarté --- */
  if (!s || s.cutYear || !def) {
    return (
      <Sheet title="Sport scolaire" onBack={onBack}>
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            {s?.cutYear
              ? 'Ton nom n’était pas sur la liste. Tu peux retenter, ou aller voir ailleurs.'
              : 'On n’entre pas dans une équipe en s’inscrivant : il y a une sélection, et tout le monde n’est pas pris.'}
          </p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Ton établissement en propose {offered.length}. Un lycée mieux doté
            en proposerait davantage.
          </p>
        </Card>
        <Section title="Passer une sélection">
          <Card>
            {offered.map((sport) => {
              const blocked = selectionBlocker(state, sport);
              const odds = selectionOdds(state, sport);
              return (
                <Row
                  key={sport.id}
                  emoji={sport.emoji}
                  title={sport.label}
                  sub={sport.what}
                  right={blocked ? undefined : <Pill tone={oddsTone(odds)}>{chanceWord(odds)}</Pill>}
                  closed={Boolean(blocked)}
                  because={blocked}
                  onClick={() => run((ctx) => trySelection(ctx, sport.id), sport.emoji)}
                  chevron={!blocked}
                />
              );
            })}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Le nombre de places compte autant que le niveau : être bon en
            escrime ne suffit pas quand il n’y en a que deux.
          </p>
        </Section>
      </Sheet>
    );
  }

  /* --- Dans l'équipe --- */
  const squad = squadInfo(s.squad as Squad);
  const gap = scholarshipGap(state);
  const trainBlock = trainingBlocker(state);
  const captainBlock = captaincyBlocker(state);
  const injured = s.injuredUntil > state.year;

  return (
    <Sheet title={def.label} onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <div className="row-title">{squad.label}</div>
            <div className="row-sub">{squad.note}</div>
          </div>
          <strong>{Math.round(s.level)}/100</strong>
        </div>
        <Meter value={s.level} />
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone="primary">{levelLabel(s.level)}</Pill>
          <Pill>{s.seasons} saison(s)</Pill>
          {s.captain && <Pill tone="good">Capitaine</Pill>}
          {s.scouts > 0 && <Pill tone="accent">{s.scouts} recruteur(s)</Pill>}
          {injured && <Pill tone="bad">Écarté jusqu’en {s.injuredUntil}</Pill>}
        </div>
        {s.lastSeason > 0 && (
          <p className="small muted" style={{ margin: '12px 0 0' }}>
            Dernière saison : {seasonLabel(s.lastSeason).label.toLowerCase()}. {seasonLabel(s.lastSeason).note}
          </p>
        )}
      </Card>

      <Section title="La bourse sportive">
        <Card>
          <Row
            emoji={gap === null ? '🎟️' : '🎯'}
            title={gap === null ? 'Tu l’as' : 'Ce qu’il manque'}
            sub={gap ?? 'Une université paiera tes études. Il faudra t’inscrire.'}
            right={gap === null ? <Pill tone="good">Acquise</Pill> : undefined}
          />
          <Row emoji="📈" title="Niveau requis" right={`${SCHOLARSHIP.level}`} />
          <Row emoji="👔" title="Recruteurs requis" right={`${SCHOLARSHIP.scouts}`} />
          <Row emoji="📘" title="Moyenne requise" right={`${SCHOLARSHIP.grades}/20`} />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Être bon ne suffit pas : il faut avoir été vu. C’est ce qui décide
          entre deux joueurs de même niveau dans deux lycées différents.
        </p>
      </Section>

      <Section title="Ce que tu peux faire">
        <Card>
          <Row
            emoji="🏋️"
            title="T’entraîner"
            sub={`${2 - s.trainedThisYear} séance(s) possible(s) — ça prend sur les devoirs`}
            closed={Boolean(trainBlock)}
            because={trainBlock}
            onClick={() => run((ctx) => train(ctx), '🏋️')}
            chevron={!trainBlock}
          />
          {def.team && (
            <Row
              emoji="🎖️"
              title="Te présenter comme capitaine"
              sub="Le brassard ne va pas au meilleur, mais à celui qu’on suit"
              right={captainBlock ? undefined : <Pill tone={oddsTone(captaincyOdds(state))}>{chanceWord(captaincyOdds(state))}</Pill>}
              closed={Boolean(captainBlock)}
              because={captainBlock}
              onClick={() => run((ctx) => runForCaptain(ctx), '🎖️')}
              chevron={!captainBlock}
            />
          )}
          <Row
            emoji="🚪"
            title="Arrêter"
            sub="Tu récupères tes après-midis, et tu perdras ce que tu avais"
            onClick={() => { run((ctx) => quitSport(ctx), '🚪'); onBack(); }}
            chevron
          />
        </Card>
      </Section>

      {def.team && (
        <Section title="Ceux avec qui tu joues">
          <Card pad>
            <div className="spread small muted" style={{ marginBottom: 6 }}>
              <span>Niveau de l’équipe</span>
              <span>{Math.round(teammateQuality(state))}/100</span>
            </div>
            <Meter value={teammateQuality(state)} />
            <p className="small muted" style={{ margin: '10px 0 0' }}>
              Dans un sport collectif, une excellente année personnelle peut
              être gâchée par des gens que tu n’as pas choisis. C’est le prix
              de ne pas être seul.
            </p>
          </Card>
        </Section>
      )}

      <Section title="Ce que ça coûte">
        <Card>
          <Row emoji="⏳" title="Le temps" sub="Les après-midis passés au gymnase ne sont pas passés sur les devoirs" />
          <Row
            emoji="🩹"
            title="Le corps"
            sub={def.contact > 60
              ? 'Ce sport-là abîme. Une blessure fait perdre ce que tu as construit'
              : 'Peu de contact, mais une blessure reste possible'}
            right={<Pill tone={def.contact > 60 ? 'bad' : def.contact > 30 ? 'warn' : 'good'}>
              {def.contact > 60 ? 'rude' : def.contact > 30 ? 'moyen' : 'sûr'}
            </Pill>}
          />
          <Row
            emoji="👀"
            title="Ce qui se voit"
            sub={def.visibility > 65
              ? 'On regarde ce sport-là : les recruteurs viennent'
              : 'Un sport confidentiel : il faudra être bien meilleur pour être vu'}
          />
        </Card>
      </Section>

      <p className="small muted" style={{ margin: '4px' }}>
        {p.age >= 16
          ? 'Ce que tu construis ici compte le jour où tu te lanceras comme sportif.'
          : 'Rien de tout ça ne se perd : ça décide de ce que tu vaudras plus tard.'}
      </p>
    </Sheet>
  );
}

/** Une probabilité, en mots. Le jeu ne montre jamais de pourcentage brut. */
function chanceWord(p: number): string {
  if (p >= 0.65) return 'tu devrais passer';
  if (p >= 0.4) return 'ça se joue';
  if (p >= 0.18) return 'difficile';
  return 'quasiment sans espoir';
}

/* ------------------------------------------------------------------ */
/* Fiche d'une personne de l'école                                    */
/* ------------------------------------------------------------------ */

function SchoolPersonSheet({ personId, onBack }: { personId: string; onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const target = state.npcs[personId];
  if (!target) return null;

  const staff = state.player.origin.schoolClass?.staff.find((s) => s.personId === personId);
  const actions = getAvailableActions(state, target, 'école');
  const chance = staff ? null : friendshipChance(state, target);

  /** Chaque identifiant d'action est branché sur un vrai système. */
  const perform = (id: string) => {
    const emoji = avatarFor(target);
    switch (id) {
      case 'talk': case 'time': case 'compliment': case 'argue': case 'insult':
      case 'cutTies': case 'reconnect': case 'kiss': case 'askOut': case 'propose':
      case 'breakUp': case 'advice':
        return run((ctx) => interact(ctx, personId, id), emoji);
      case 'helpWork': return run((ctx) => classmateAction(ctx, personId, 'helpWork'), emoji);
      case 'askHelpMate': return run((ctx) => classmateAction(ctx, personId, 'askHelp'), emoji);
      case 'tease': return run((ctx) => classmateAction(ctx, personId, 'tease'), emoji);
      case 'provoke': return run((ctx) => classmateAction(ctx, personId, 'provoke'), emoji);
      case 'report': return run((ctx) => classmateAction(ctx, personId, 'report'), emoji);
      case 'defend': return run((ctx) => classmateAction(ctx, personId, 'defend'), emoji);
      case 'askBestFriend': return run((ctx) => classmateAction(ctx, personId, 'askBestFriend'), emoji);
      case 'question': return run((ctx) => teacherAction(ctx, personId, 'question'), emoji);
      case 'askHelpTeacher': return run((ctx) => teacherAction(ctx, personId, 'askHelp'), emoji);
      case 'thank': return run((ctx) => teacherAction(ctx, personId, 'thank'), emoji);
      case 'complain': return run((ctx) => teacherAction(ctx, personId, 'complain'), emoji);
      case 'reportIssue': return run((ctx) => teacherAction(ctx, personId, 'reportIssue'), emoji);
      case 'disrespect': return run((ctx) => disrespect(ctx, personId), emoji);
      case 'prank': return run((ctx) => classmateAction(ctx, personId, 'prank'), emoji);
      case 'gift': return run((ctx) => classmateAction(ctx, personId, 'gift'), emoji);
      case 'askOutMate': return run((ctx) => classmateAction(ctx, personId, 'askOut'), emoji);
      case 'makeUp': return run((ctx) => classmateAction(ctx, personId, 'makeUp'), emoji);
      case 'tellAdult': return run((ctx) => classmateAction(ctx, personId, 'tellAdult'), emoji);
      case 'plead': return run((ctx) => teacherAction(ctx, personId, 'plead'), emoji);
      case 'pickOn': return run((ctx) => pickOn(ctx, personId), emoji);
      default: return undefined;
    }
  };

  const groups: { key: string; title: string }[] = [
    { key: 'école', title: 'À l’école' },
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
            <div className="row-title">
              {staff ? (staff.subject ?? staff.role) : `${target.age} ans`}
            </div>
            <div className="row-sub">
              {staff
                ? `${staff.strictness > 68 ? 'Sévère' : staff.strictness < 34 ? 'Laxiste' : 'Ni dur ni tendre'} · ${staff.skill > 70 ? 'très compétent' : staff.skill < 36 ? 'dépassé' : 'compétent'}`
                : target.relation === 'bestFriend' ? 'Ton meilleur ami'
                  : target.relation === 'friend' ? 'Un ami' : 'Camarade de classe'}
            </div>
          </div>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone="primary">Relation {Math.round(target.relationship)}</Pill>
          <Pill>Opinion {Math.round(target.opinion)}</Pill>
          {staff && <Pill tone="accent">Intégrité {Math.round(staff.professionalism)}</Pill>}
        </div>
      </Card>

      {chance && chance.terms.length > 0 && (
        <Section title="Ce qui vous rapproche ou vous éloigne">
          <Card>
            {chance.terms
              .slice()
              .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
              .slice(0, 5)
              .map((t) => (
                <Row
                  key={t.label}
                  emoji={t.value > 0 ? '+' : '−'}
                  title={t.label}
                  right={<span className="small muted">{t.value > 0 ? 'rapproche' : 'éloigne'}</span>}
                />
              ))}
          </Card>
        </Section>
      )}

      {target.psyche && target.psyche.interests.length > 0 && (
        <Section title="Ce qui le passionne">
          <Card>
            {[...target.psyche.interests]
              .sort((a, b) => b.level - a.level)
              .slice(0, 4)
              .map((i) => (
                <Row
                  key={i.id}
                  emoji={INTEREST_MAP[i.id]?.emoji ?? '✨'}
                  title={INTEREST_MAP[i.id]?.label ?? i.id}
                  right={<Gauge value={i.level} />}
                />
              ))}
          </Card>
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
                  sub={a.hint}
                  closed={a.blocked !== null}
                  because={a.blocked}
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
