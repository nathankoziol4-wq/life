/**
 * Le milieu, vu de l'intérieur.
 *
 * Le jeu avait un booléen : `syndicate`. Entrer dans une organisation cochait
 * une case et débloquait deux lignes de menu. Il n'existait ni hiérarchie, ni
 * obligations, ni personne à qui parler, ni moyen d'en sortir.
 *
 * L'écran répond à quatre questions : **qui te cherche**, **qui tu connais**,
 * **à qui tu appartiens**, et **ce qu'on te demande**. La première est la plus
 * importante et la moins visible dans le reste du jeu — la chaleur monte en
 * silence, et c'est en la regardant qu'on décide de lever le pied.
 */

import { useState } from 'react';
import { MiniGameHost } from '../components/MiniGameHost.tsx';
import { CHASE, type ChaseState } from '../systems/minigames/chase.ts';
import { BURGLARY, burglaryOutcome, type BurglaryState } from '../systems/minigames/burglary.ts';
import { ChaseScene, HouseScene } from './BurglaryScreen.tsx';
import {
  Empty, Gauge, Meter, Pill, Sheet,
} from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money } from '../ui/format.ts';
import {
  CONTACT_ROLES, MISSIONS, ORG_STYLES, rankAt,
  type ContactRole, type MissionDef, type OrgStyle,
} from '../data/underworld.ts';
import {
  askService, availableMissions, contactByRole, contactBlocker, contactsOf, demandedMission,
  findContact, heatLabel, heatOf, investigationLabel, joinBlocker, joinOrganization,
  leaveBlocker, leaveOrganization, missionBlocker, missionReward, orgOf,
  missionContext, refuseMission, runMission, serviceBlocker, servicePrice,
  settleMission,
} from '../systems/underworld.ts';

export function UnderworldScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [selected, setSelected] = useState<MissionDef | null>(null);
  const [playing, setPlaying] = useState<MissionDef | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  if (!state) return null;

  /* --- La mission jouée --- */
  /*
   * `MissionDef` déclarait un `miniGame` que **rien ne lisait** : l'écran
   * appelait `runMission` dans tous les cas, c'est-à-dire un tirage. Deux
   * missions annonçaient depuis toujours un jeu qui ne se lançait jamais.
   *
   * Les deux vues viennent du cambriolage : c'est le même plan et la même
   * course, et les redessiner ici aurait donné deux images qui divergent au
   * premier réglage.
   */
  if (playing) {
    const mission = playing;
    const done = (success: boolean) => {
      run((ctx) => settleMission(ctx, mission, success), mission.emoji);
      setPlaying(null);
      setSeed(Math.floor(Math.random() * 2 ** 31));
    };
    return (
      <Sheet title={mission.name} onBack={() => setPlaying(null)}>
        {mission.miniGame === 'chase' ? (
          <MiniGameHost
            key={`mission-chase-${seed}`}
            def={CHASE}
            context={missionContext(state, mission)}
            seed={seed}
            render={(x: ChaseState) => <ChaseScene state={x} />}
            onFinish={(x) => done(x.over === 'échappé')}
            onQuit={() => { /* la partie se termine d'elle-même au pas suivant */ }}
          />
        ) : (
          <MiniGameHost
            key={`mission-burglary-${seed}`}
            def={BURGLARY}
            context={missionContext(state, mission)}
            seed={seed}
            render={(x: BurglaryState) => <HouseScene state={x} />}
            // Revenir bredouille, se faire voir ou rester coincé, c'est
            // revenir sans ce qu'on était venu chercher : la maison ne fait
            // pas la différence.
            onFinish={(x) => {
              const how = burglaryOutcome(x);
              done(how === 'propre' || how === 'bruyant');
            }}
            onQuit={() => { /* sortir par la porte suffit ; le jeu le voit */ }}
          />
        )}
        <p className="small muted" style={{ margin: '10px 4px 0', lineHeight: 1.5 }}>
          {mission.miniGame === 'chase'
            ? 'Cours. Touche à gauche ou à droite pour changer de file, et garde de l’avance : ce qui te suit ne se fatigue pas.'
            : 'Touche le plan pour te déplacer. Reste appuyé sur un objet pour le prendre. Ressors par la porte du bas quand tu juges que ça suffit.'}
        </p>
      </Sheet>
    );
  }

  const p = state.player;
  const heat = heatOf(state);
  const org = orgOf(state);
  const rank = rankAt(org?.rank ?? 0);
  const dossier = investigationLabel(state);
  const demanded = demandedMission(state);
  const contacts = contactsOf(state).filter((c) => !c.burned);

  return (
    <Sheet title="Le milieu" onBack={onBack}>
      {/* --- Ce que la police sait --- */}
      <Card pad>
        <div className="spread" style={{ marginBottom: 10 }}>
          <div>
            <div className="small muted">Attention de la police</div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}>
              {heatLabel(heat)}
            </div>
          </div>
          <Pill tone={heat > 65 ? 'bad' : heat > 35 ? 'warn' : 'good'}>
            {Math.round(heat)}/100
          </Pill>
        </div>
        <Meter value={heat} tone={heat > 65 ? 'var(--bad)' : heat > 35 ? 'var(--warn)' : 'var(--good)'} />
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
          À ne pas confondre avec la notoriété ({Math.round(p.criminalRecord.notoriety)}/100),
          qui est ta réputation dans le milieu. L’une ouvre des portes, l’autre
          en ferme. Elle retombe toute seule, lentement, quand tu te tiens
          tranquille.
        </p>
      </Card>

      {dossier && (
        <Section title="Enquête en cours">
          <Card pad>
            <div className="row-title">{dossier}</div>
            <div style={{ marginTop: 10 }}>
              <Meter value={p.criminalRecord.investigation?.progress ?? 0} tone="var(--bad)" />
            </div>
            <p className="small muted" style={{ margin: '10px 0 0' }}>
              Un dossier n’est pas une arrestation : il avance, et on peut le
              faire ralentir. Un indicateur sait où il en est, un avocat du
              milieu sait parfois le faire refermer.
            </p>
          </Card>
        </Section>
      )}

      {/* --- La maison --- */}
      {org ? (
        <Section title={org.name}>
          <Card pad>
            <div className="spread">
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>
                  {rank.emoji} {rank.name}
                </div>
                <div className="row-sub">{rank.description}</div>
              </div>
              <Pill tone="primary">{ORG_STYLES[org.style as OrgStyle]?.label}</Pill>
            </div>
            <div className="chips" style={{ marginTop: 12 }}>
              <Pill>Ta part {Math.round(rank.share * 100)} %</Pill>
              <Pill tone={org.done > org.failed ? 'good' : undefined}>
                {org.done} faite(s)
              </Pill>
              {org.refused > 0 && <Pill tone="warn">{org.refused} refusée(s)</Pill>}
              {org.failed > 0 && <Pill tone="bad">{org.failed} ratée(s)</Pill>}
            </div>
          </Card>
          <Card>
            <Row
              emoji="🪙"
              title="Respect"
              sub="Ce qu’on pense de toi ici. C’est lui qui fait monter."
              right={<Gauge value={org.respect} />}
            />
            <Row
              emoji="🚩"
              title="Territoire"
              sub={`Face aux ${org.rival}`}
              right={<Gauge value={org.territory} />}
            />
            <Row
              emoji="🚔"
              title="Pression sur la maison"
              sub="Elle finit par retomber sur ceux qui sont en haut"
              right={<Gauge value={org.pressure} />}
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            {ORG_STYLES[org.style as OrgStyle]?.note}
          </p>
        </Section>
      ) : (
        <Section title="Se faire une place">
          <Card>
            <Row
              emoji="🕴️"
              title="Se faire présenter"
              sub="Une maison, un rang, des obligations"
              because={joinBlocker(state)}
              closed={Boolean(joinBlocker(state))}
              onClick={() => run((ctx) => joinOrganization(ctx), '🕴️')}
              chevron
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            On n’entre pas dans une maison en le demandant poliment. Il faut un
            nom, et un nom se fait dehors.
          </p>
        </Section>
      )}

      {/* --- Ce qu'on te demande --- */}
      {org && demanded && (
        <Section title="On te demande quelque chose">
          <Card pad>
            <div className="row-title">{demanded.emoji} {demanded.name}</div>
            <p className="small muted" style={{ margin: '6px 0 10px', lineHeight: 1.55 }}>
              {demanded.description}
            </p>
            <p className="small" style={{ margin: 0 }}>
              Ce n’est pas une ligne du catalogue : c’est une demande. Y répondre
              coûte, ne pas y répondre coûte plus — et au bout d’un an, on tire
              ses conclusions tout seul.
            </p>
          </Card>
        </Section>
      )}

      {org && (
        <Section title="Ce qu’on te propose">
          {availableMissions(state).length === 0 ? (
            <Empty>Rien pour toi à ce rang. Fais-toi remarquer autrement.</Empty>
          ) : (
            <Card>
              {availableMissions(state).map((mission) => {
                const blocker = missionBlocker(state, mission);
                return (
                  <Row
                    key={mission.kind}
                    emoji={mission.emoji}
                    title={demanded?.kind === mission.kind ? `${mission.name} — demandé` : mission.name}
                    sub={mission.description}
                    because={blocker}
                    right={<Pill tone={mission.heat > 0.6 ? 'bad' : mission.heat > 0.35 ? 'warn' : undefined}>
                      {money(state, missionReward(state, mission))}
                    </Pill>}
                    closed={Boolean(blocker)}
                    onClick={() => setSelected(mission)}
                    chevron={!blocker}
                  />
                );
              })}
            </Card>
          )}
          {selected && (
            <Card pad>
              <div className="row-title">{selected.emoji} {selected.name}</div>
              <p className="small muted" style={{ margin: '6px 0 12px', lineHeight: 1.55 }}>
                {selected.description}
              </p>
              <div className="chips" style={{ marginBottom: 12 }}>
                <Pill>{money(state, missionReward(state, selected))} pour toi</Pill>
                <Pill tone={selected.heat > 0.6 ? 'bad' : 'warn'}>
                  {selected.heat > 0.6 ? 'très voyant' : selected.heat > 0.35 ? 'voyant' : 'discret'}
                </Pill>
                <Pill>+{selected.respect} respect</Pill>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="pill"
                  type="button"
                  onClick={() => {
                    const mission = selected;
                    setSelected(null);
                    if (mission.miniGame) setPlaying(mission);
                    else run((ctx) => runMission(ctx, mission), mission.emoji);
                  }}
                >
                  Y aller
                </button>
                <button
                  className="pill"
                  type="button"
                  onClick={() => {
                    const mission = selected;
                    setSelected(null);
                    run((ctx) => refuseMission(ctx, mission), '🙅');
                  }}
                >
                  Refuser
                </button>
              </div>
              <p className="small muted" style={{ margin: '12px 0 0' }}>
                Refuser est possible, jamais gratuit : le respect descend, et on
                note.
              </p>
            </Card>
          )}
        </Section>
      )}

      {/* --- Le carnet --- */}
      <Section title={`Ton carnet (${contacts.length})`}>
        <Card>
          {CONTACT_ROLES.map((role) => {
            const contact = contactByRole(state, role.id as ContactRole);
            const person = contact ? state.npcs[contact.personId] : null;
            if (!contact) {
              const blocker = contactBlocker(state, role.id as ContactRole);
              return (
                <Row
                  key={role.id}
                  emoji={role.emoji}
                  title={role.name}
                  sub={role.service}
                  because={blocker}
                  right={<Pill>chercher</Pill>}
                  closed={Boolean(blocker)}
                  onClick={() => run((ctx) => findContact(ctx, role.id as ContactRole), role.emoji)}
                  chevron={!blocker}
                />
              );
            }
            const stop = serviceBlocker(state, role.id as ContactRole);
            return (
              <Row
                key={role.id}
                emoji={person ? avatarFor(person) : role.emoji}
                title={`${person?.firstName ?? role.name} — ${role.name.toLowerCase()}`}
                sub={role.service}
                because={stop}
                right={<Pill tone={stop ? undefined : 'primary'}>
                  {servicePrice(state, role.id as ContactRole) > 0
                    ? money(state, servicePrice(state, role.id as ContactRole))
                    : 'gratuit'}
                </Pill>}
                closed={Boolean(stop)}
                onClick={() => run((ctx) => askService(ctx, role.id as ContactRole), role.emoji)}
                chevron={!stop}
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          On ne choisit pas sur qui on tombe. Ce que vaut chacun ne s’annonce
          pas — ça se découvre en s’en servant. Et quelqu’un qu’on appelle trop
          souvent finit par parler.
        </p>
      </Section>

      {/* --- Partir --- */}
      {org && (
        <Section title="Partir">
          <Card>
            <Row
              emoji="🚪"
              title="Quitter la maison"
              sub="Plus tu es monté, plus il faut payer pour redescendre"
              because={leaveBlocker(state)}
              closed={Boolean(leaveBlocker(state))}
              onClick={() => run((ctx) => leaveOrganization(ctx), '🚪')}
              chevron
            />
          </Card>
        </Section>
      )}

      <p className="small muted" style={{ margin: '14px 4px 0', lineHeight: 1.55 }}>
        Maisons fictives, rangs fictifs, missions fictives. Une mission est une
        décision et un risque chiffré — le jeu ne décrit aucun procédé et ne
        nomme aucune méthode.
      </p>
    </Sheet>
  );
}

/** Les missions existantes, pour les écrans qui veulent les lister. */
export const ALL_MISSIONS = MISSIONS;
