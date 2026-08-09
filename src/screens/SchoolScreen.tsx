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
  Card, Empty, Gauge, Meter, Pill, Row, Section, Segmented, Sheet,
} from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor } from '../ui/format.ts';
import { money } from '../ui/format.ts';
import {
  CLUBS, STAGE_LABELS, availableClubs, dropOut, isInSchool, joinClub, setEffort,
} from '../systems/education.ts';
import {
  classmateAction, joinPeerGroup, leaveClub, leavePeerGroup, skipSchool, studyHarder,
  teacherAction, disrespect,
} from '../systems/schoolActions.ts';
import { classmatesOf, friendshipChance, staffOf } from '../systems/school.ts';
import { getAvailableActions } from '../systems/actions.ts';
import { interact } from '../systems/relationships.ts';
import { SCHOOL_MAP } from '../data/schools.ts';
import { INTEREST_MAP } from '../data/interests.ts';
import type { Person } from '../engine/types.ts';

type Panel = null | 'classmates' | 'staff' | 'clubs' | 'groups' | 'record';

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
