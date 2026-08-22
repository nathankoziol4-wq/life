/**
 * Écran « Agenda » : le grand menu d'actions (§4).
 *
 * Chaque tuile ouvre un sous-menu réellement fonctionnel. Rien n'est
 * décoratif : toute entrée visible déclenche une mécanique du moteur.
 */

import { useState } from 'react';
import {
  AmountPicker, Button, Empty, Modal, Pill, Sheet, TextField, Tile,
} from './Modal.tsx';
/*
 * Le vocabulaire du système.
 *
 * L'agenda n'est pas fait de lignes mais d'une grille de quatorze tuiles, et
 * chacune ouvre un panneau : médecin, chirurgie, sport, bien-être, voyages,
 * sorties, jeux d'argent, réseaux, renommée, animaux, démarches, testament,
 * justice, activités illégales. C'est là que vivent les lignes.
 */
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { compactNumber, money } from '../ui/format.ts';
import {
  COSMETIC_PROCEDURES, DESTINATIONS, NIGHTLIFE, PET_SPECIES, SPORTS, WELLNESS,
} from '../data/activities.ts';
import { getDisease } from '../data/diseases.ts';
import { CRIMES, LAWYERS } from '../data/crimes.ts';
import { COUNTRIES, getCountry } from '../data/countries.ts';
import {
  adoptPetSpecies, changeName, cosmeticSurgery, doSport, doWellness, getDrivingLicense,
  sportAvailable,
  goOut, immigrate, monetizeAudience, moveToCity, playLottery, playWithPet,
  takeVacation, updateWill, vetVisit,
} from '../systems/activities.ts';
import { treatDisease, treatmentCost } from '../systems/health.ts';
import { GRIP_LABEL, cleanYears, currentProgram, gripOf } from '../systems/recovery.ts';
import { RecoveryScreen } from '../screens/RecoveryScreen.tsx';
import { commitCrime, crimeBlocker, crimeContext, launderMoney } from '../systems/crime.ts';
import { HeistScreen, RingsScreen } from '../screens/RingsScreen.tsx';
import type { CrimeDef } from '../data/crimes.ts';
import { UnderworldScreen } from '../screens/UnderworldScreen.tsx';
import { NETWORKS, SUBJECTS, getNetwork } from '../data/networks.ts';
import { AUDIENCE_LABEL, GROOMING, REGISTERS, type Audience } from '../data/looks.ts';
import {
  adopt, adoptBlocker, adoptCost, describe, groom, groomBlocker, groomCost,
  marksOf, readAs, registerOf, upkeepLabel, upkeepOf,
} from '../systems/appearance.ts';
import { getMark } from '../data/looks.ts';
import {
  YEAR_LIMIT, fatigueLabel, fatigueOf, postBlocker, postsThisYear, publish,
  timesOn,
} from '../systems/social.ts';
import { heatOf, orgOf } from '../systems/underworld.ts';
import { rankAt } from '../data/underworld.ts';
import { appeal, goToTrial, pendingTrial, requestExpungement } from '../systems/justice.ts';
import { pickpocketBlocker } from '../systems/pickpocketing.ts';
import { PickpocketScreen } from '../screens/PickpocketScreen.tsx';
import { burglaryBlocker } from '../systems/burglary.ts';
import { BurglaryScreen } from '../screens/BurglaryScreen.tsx';
import { PrisonScreen } from '../screens/PrisonScreen.tsx';
import { FameScreen } from '../screens/FameScreen.tsx';
import { ChallengeScreen } from '../screens/ChallengeScreen.tsx';
import { LanguageScreen } from '../screens/LanguageScreen.tsx';
import { SkillScreen } from '../screens/SkillScreen.tsx';
import { PracticeScreen } from '../screens/PracticeScreen.tsx';
import { RootsScreen } from '../screens/RootsScreen.tsx';
import { PractitionerScreen } from '../screens/PractitionerScreen.tsx';
import { regularOf, summary as practitionerSummary } from '../systems/practitioners.ts';
import {
  availablePractices, bestPractice, kept as practicesKept, stalled,
  summary as practiceSummary,
} from '../systems/practices.ts';
import { canGo, rootsOf, summary as rootsSummary } from '../systems/roots.ts';
import { ENOUGH } from '../data/roots.ts';
import { TableScreen } from '../screens/TableScreen.tsx';
import { PER_YEAR, rankOf } from '../data/skills.ts';
import {
  availableSkills, bestSkill, giftKnown, skillOfJob, stateOf, workedThisYear,
} from '../systems/skills.ts';
import {
  WORK_FLOOR, fluencyHere, fluencyLabel, localLanguage, getLanguage,
} from '../systems/languages.ts';
import {
  progressOf, takenOf, vaultPieces,
} from '../systems/challenges.ts';
import { getChallenge } from '../data/challenges.ts';
import type { GameState } from '../engine/types.ts';
import { surrender, yearsOnTheRun } from '../systems/escape.ts';

type Panel =
  | null | 'health' | 'surgery' | 'sport' | 'wellness' | 'travel' | 'nightlife'
  | 'gambling' | 'social' | 'pets' | 'crime' | 'justice' | 'prison' | 'admin' | 'will'
  | 'fame' | 'defis' | 'langues' | 'savoirFaire' | 'pratiques' | 'origines';

/**
 * Ce qu'on affiche sous « les défis » : le défi le plus avancé de ceux qu'on
 * porte, avec où l'on en est. Une ligne qui dirait seulement « défis » ne
 * dirait rien de ce qui attend derrière.
 */
function challengeLine(state: GameState): string {
  const taken = takenOf(state);
  if (taken.length === 0) return 'Rien en cours. Cette vie n’a que le sens que tu lui donnes.';
  const best = taken
    .map((t) => ({ t, c: getChallenge(t.id) }))
    .filter((x) => x.c)
    .sort((a, b) => progressOf(state, b.c!) - progressOf(state, a.c!))[0];
  if (!best?.c) return `${taken.length} en cours`;
  return `${best.c.label} — ${Math.round(progressOf(state, best.c) * 100)} %${
    taken.length > 1 ? `, et ${taken.length - 1} autre(s)` : ''}`;
}

export function ActivityMenu() {
  const { state, run } = useGame();
  const [panel, setPanel] = useState<Panel>(null);
  if (!state) return null;
  const p = state.player;
  const trial = pendingTrial(state);

  const close = () => setPanel(null);
  switch (panel) {
    case 'health': return <HealthPanel onBack={close} />;
    case 'surgery': return <SurgeryPanel onBack={close} />;
    case 'sport': return <SportPanel onBack={close} />;
    case 'wellness': return <WellnessPanel onBack={close} />;
    case 'travel': return <TravelPanel onBack={close} />;
    case 'nightlife': return <NightlifePanel onBack={close} />;
    case 'gambling': return <GamblingPanel onBack={close} />;
    case 'social': return <SocialPanel onBack={close} />;
    case 'fame': return <FameScreen onBack={close} />;
    case 'defis': return <ChallengeScreen onBack={close} />;
    case 'langues': return <LanguageScreen onBack={close} />;
    case 'savoirFaire': return <SkillScreen onBack={close} />;
    case 'pratiques': return <PracticeScreen onBack={close} />;
    case 'origines': return <RootsScreen onBack={close} />;
    case 'pets': return <PetsPanel onBack={close} />;
    case 'crime': return <CrimePanel onBack={close} />;
    case 'justice': return <JusticePanel onBack={close} />;
    case 'prison': return <PrisonScreen onBack={close} />;
    case 'admin': return <AdminPanel onBack={close} />;
    case 'will': return <WillPanel onBack={close} />;
    default: break;
  }

  return (
    <>
      {p.prison && (
        <Section title="En détention">
          <Card>
            <Row
              emoji="🔒"
              title={p.prison.facilityName}
              sub={`Sécurité ${p.prison.security} · ${p.prison.yearsLeft} an(s) restants`}
              onClick={() => setPanel('prison')}
              chevron
            />
          </Card>
        </Section>
      )}

      {p.criminalRecord.wanted && !p.prison && (
        <Section title="En cavale">
          <Card>
            <Row
              emoji="🚨"
              title="Tu es recherché"
              sub={`Depuis ${yearsOnTheRun(state)} an(s) · ni emploi déclaré, ni tranquillité`}
              right={<Pill tone="bad">en fuite</Pill>}
            />
            <Row
              emoji="🕊️"
              title="Se rendre"
              sub="Le tribunal en tient compte : la peine restante, et un peu plus"
              onClick={() => run((ctx) => surrender(ctx), '🕊️')}
              chevron
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0' }}>
            Chaque année dehors te rend un peu moins prioritaire, sans jamais
            te rendre tranquille. Au bout d’une vie entière, on cesse de te
            chercher.
          </p>
        </Section>
      )}

      {trial && (
        <Section title="Procédure en cours">
          <Card>
            <Row
              emoji="⚖️"
              title={`Procès : ${trial.crimeName}`}
              sub="Choisis un avocat avant l’audience"
              onClick={() => setPanel('justice')}
              chevron
            />
          </Card>
        </Section>
      )}

      <Section title="Santé et corps">
        <div className="tile-grid">
          <Tile emoji="🩺" label="Médecin" onClick={() => setPanel('health')} />
          <Tile emoji="🪞" label="Allure" onClick={() => setPanel('surgery')} />
          <Tile emoji="🏋️" label="Sport" onClick={() => setPanel('sport')} />
          <Tile emoji="🧘" label="Bien-être" onClick={() => setPanel('wellness')} />
        </div>
      </Section>

      <Section title="Loisirs">
        <div className="tile-grid">
          <Tile emoji="✈️" label="Voyages" onClick={() => setPanel('travel')} />
          <Tile emoji="🪩" label="Sorties" onClick={() => setPanel('nightlife')} />
          <Tile emoji="🎰" label="Jeux d’argent" onClick={() => setPanel('gambling')} />
          <Tile emoji="📱" label="Réseaux" onClick={() => setPanel('social')} />
          <Tile emoji="⭐" label="Ton nom" onClick={() => setPanel('fame')} />
          <Tile emoji="🐕" label="Animaux" onClick={() => setPanel('pets')} />
        </div>
      </Section>

      {/* Ce que le joueur décide de faire de cette vie-là. Séparé des
          ambitions du personnage et des titres de fin de vie : voir
          `data/challenges.ts`. */}
      <Section title="Ce que tu te promets">
        <Card>
          <Row
            emoji="🎯"
            title="Les défis et le cabinet"
            sub={challengeLine(state)}
            right={<Pill tone={takenOf(state).length > 0 ? 'primary' : undefined}>
              {vaultPieces().length} pièce(s)
            </Pill>}
            onClick={() => setPanel('defis')}
            chevron
          />
        </Card>
      </Section>

      {/* La seule chose qui distingue vivre ailleurs de vivre ici avec
          d'autres chiffres. Voir `data/languages.ts`. */}
      <Section title="La langue d’ici">
        <Card>
          <Row
            emoji="🗣️"
            title={getLanguage(localLanguage(state))?.label.replace(/^./, (c) => c.toUpperCase()) ?? 'La langue'}
            sub={fluencyHere(state) >= WORK_FLOOR
              ? 'Tu es d’ici, pour ce qui compte'
              : 'Tu n’obtiens qu’une part de ce que tu vaux tant que tu ne la parles pas'}
            right={<Pill tone={fluencyHere(state) >= WORK_FLOOR ? 'good' : 'warn'}>
              {fluencyLabel(fluencyHere(state))}
            </Pill>}
            onClick={() => setPanel('langues')}
            chevron
          />
          <SkillRow state={state} onOpen={() => setPanel('savoirFaire')} />
          <PracticeRow state={state} onOpen={() => setPanel('pratiques')} />
          <RootsRow state={state} onOpen={() => setPanel('origines')} />
        </Card>
      </Section>

      <Section title="Vie administrative">
        <div className="tile-grid">
          <Tile emoji="🪪" label="Démarches" onClick={() => setPanel('admin')} />
          <Tile emoji="📜" label="Testament" onClick={() => setPanel('will')} />
          <Tile emoji="⚖️" label="Justice" onClick={() => setPanel('justice')} />
        </div>
      </Section>

      <Section title="Zone grise">
        <div className="tile-grid">
          <Tile emoji="🕶️" label="Activités illégales" onClick={() => setPanel('crime')} />
        </div>
        <p className="small muted" style={{ marginTop: 8, marginLeft: 4 }}>
          Mécaniques de jeu abstraites : un tirage, un gain, un risque. Rien d’applicable
          dans le monde réel.
        </p>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Santé                                                              */
/* ------------------------------------------------------------------ */

function HealthPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  // La remontée a son écran : elle a des états, un coût annuel, une chance de
  // rechute qui se lit avant de décider, et des gens au courant.
  const [recovering, setRecovering] = useState(false);
  const [panel, setPanel] = useState<'cabinet' | null>(null);
  if (!state) return null;
  if (panel === 'cabinet') return <PractitionerScreen onBack={() => setPanel(null)} />;
  const p = state.player;
  const country = getCountry(p.countryId);
  const known = p.diseases.filter((d) => d.diagnosed);
  const grip = gripOf(state);
  const program = currentProgram(state);

  if (recovering) return <RecoveryScreen onBack={() => setRecovering(false)} />;

  return (
    <Sheet title="Santé" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <span className="small muted">Prise en charge dans {country.name}</span>
          <Pill tone={country.healthcare > 0.7 ? 'good' : country.healthcare > 0.4 ? 'warn' : 'bad'}>
            {Math.round(country.healthcare * 100)} %
          </Pill>
        </div>
      </Card>

      {/* Mesuré avant que cette section existe : la dépendance atteignait
          cent dans cent pour cent des vies de quelqu'un qui joue, elle
          redescendait de 1,2 point par an, et rien ne permettait d'en
          sortir — alors que le moteur la lisait partout. */}
      <Section title="Ce qui te tient">
        <Card>
          <Row
            emoji={grip === 'libre' ? '🌤️' : grip === 'pris' ? '🌥️' : '🌑'}
            title="Se relever"
            sub={program
              ? `En cours : ${program.label.toLowerCase()}`
              : grip === 'libre'
                ? cleanYears(state) > 0
                  ? `${cleanYears(state)} an(s) que ça tient`
                  : GRIP_LABEL[grip]
                : GRIP_LABEL[grip]}
            right={
              <Pill tone={grip === 'libre' ? 'good' : grip === 'pris' ? 'warn' : 'bad'}>
                {Math.round(p.stats.addiction)}/100
              </Pill>
            }
            onClick={() => setRecovering(true)}
            chevron
          />
        </Card>
      </Section>

      {/* Ce que la liste d'avant affichait : « Fiabilité du diagnostic : 60 % ».
          Choisir revenait à lire deux nombres et prendre le plus grand qu'on
          pouvait payer. Le cabinet est maintenant fait de gens dont on ne
          connaît que le prix et la réputation. */}
      <Section title="Se faire soigner">
        <Card>
          <Row
            emoji="🩺"
            title="Le cabinet"
            sub={practitionerSummary(state)}
            right={<Pill tone={regularOf(state) ? 'primary' : 'warn'}>
              {regularOf(state) ? 'ton médecin' : 'personne'}
            </Pill>}
            onClick={() => setPanel('cabinet')}
            chevron
          />
        </Card>
      </Section>

      <Section title="Mes pathologies">
        {known.length === 0 ? (
          <Empty>
            Aucun diagnostic connu. Si tu te sens mal sans savoir pourquoie : certaines
            maladies restent longtemps silencieuses.
          </Empty>
        ) : (
          <Card>
            {known.map((d) => {
              const def = getDisease(d.id);
              return (
                <Row
                  key={d.id}
                  emoji={def?.emoji ?? '🩹'}
                  title={d.name}
                  sub={`${def?.symptoms.join(', ') ?? ''} · gravité ${Math.round(d.severity)}/100${d.chronic ? ' · chronique' : ''}`}
                  right={d.treated ? <Pill tone="good">Traitée</Pill> : money(state, treatmentCost(state, d.id))}
                  onClick={() => run((ctx) => treatDisease(ctx, d.id), def?.emoji)}
                  closed={d.treated}
                  because="Déjà traitée."
                  chevron={!d.treated}
                />
              );
            })}
          </Card>
        )}
      </Section>
    </Sheet>
  );
}

/**
 * L'allure.
 *
 * Cet écran ne montrait qu'une liste d'interventions chirurgicales — « une
 * action, un tirage », disait le catalogue. Il montre maintenant les trois
 * choses qui font une allure : ce que la vie a inscrit, le registre qu'on a
 * choisi, et ce qu'on remet dedans cette année.
 *
 * **Il annonce comment chaque public lit le registre**, parce que ce n'est
 * pas un secret à découvrir : n'importe qui sait qu'un costume passe mieux en
 * entretien qu'à un concert. Ce qu'il ne dit pas, c'est lequel il faut
 * choisir — cela dépend de ce qu'on fait de sa vie cette année-là.
 */
function SurgeryPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const current = registerOf(state);
  const kept = upkeepOf(state);
  const marks = marksOf(state);

  return (
    <Sheet title="Allure" onBack={onBack}>
      <Card pad>
        <p style={{ margin: 0, lineHeight: 1.55 }}>{describe(state)}</p>
        {current && (
          <div className="chips" style={{ marginTop: 12 }}>
            {(['embauche', 'rencontre', 'public'] as Audience[]).map((who) => {
              const factor = readAs(state, who);
              return (
                <Pill key={who} tone={factor > 1.02 ? 'good' : factor < 0.98 ? 'warn' : undefined}>
                  {AUDIENCE_LABEL[who]} ×{factor.toFixed(2)}
                </Pill>
              );
            })}
          </div>
        )}
      </Card>

      {marks.length > 0 && (
        <Section title="Ce que la vie a inscrit" sub="La plupart ne s’en vont pas.">
          <Card>
            {marks.map((id) => {
              const mark = getMark(id);
              if (!mark) return null;
              return (
                <Row
                  key={id}
                  emoji={mark.reversible ? '🕯️' : '🪨'}
                  title={mark.label}
                  sub={`${mark.cause}${mark.reversible ? ' · peut s’effacer' : ''}`}
                />
              );
            })}
          </Card>
        </Section>
      )}

      <Section
        title="Ton registre"
        sub="Aucun n’est bon partout : ce qu’un recruteur récompense, un public le pénalise."
      >
        <Card>
          {REGISTERS.map((r) => {
            const why = adoptBlocker(state, r);
            const mine = current?.id === r.id;
            return (
              <Row
                key={r.id}
                emoji={r.emoji}
                title={r.label}
                sub={r.note}
                right={mine
                  ? <Pill tone="primary">Le tien</Pill>
                  : <span className="small">{money(state, adoptCost(state, r))}</span>}
                because={why}
                closed={Boolean(why)}
                onClick={() => run((ctx) => adopt(ctx, r.id), r.emoji)}
                chevron={!why}
              />
            );
          })}
        </Card>
      </Section>

      <Section
        title="L’entretenir"
        sub={current
          ? `${upkeepLabel(kept)}. Ce qu’on n’y remet pas redescend tout seul.`
          : 'À quoi bon, tant que tu n’as pas choisi de registre.'}
      >
        <Card>
          {GROOMING.map((g) => {
            const why = groomBlocker(state, g.id);
            return (
              <Row
                key={g.id}
                emoji={g.emoji}
                title={g.label}
                sub={g.note}
                right={<span className="small">
                  {g.cost === 0 ? 'du temps' : money(state, groomCost(state, g.id))}
                </span>}
                because={why}
                closed={Boolean(why)}
                onClick={() => run((ctx) => groom(ctx, g.id), g.emoji)}
                chevron={!why}
              />
            );
          })}
        </Card>
      </Section>

      <Section
        title="Chirurgie esthétique"
        sub="Le gain diminue à mesure que l’apparence est déjà haute, et le risque monte à chaque intervention."
      >
        <Card>
          {COSMETIC_PROCEDURES.map((c) => (
            <Row
              key={c.id}
              emoji={c.emoji}
              title={c.name}
              sub={`${c.description} · risque ${Math.round(c.risk * 100)} %`}
              right={money(state, c.cost)}
              onClick={() => run((ctx) => cosmeticSurgery(ctx, c.id), c.emoji)}
              chevron
            />
          ))}
        </Card>
      </Section>
    </Sheet>
  );
}

function SportPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;

  return (
    <Sheet title="Sport" onBack={onBack}>
      <Card>
        {SPORTS.map((s) => {
          const reachable = sportAvailable(state, s.id);
          return (
            <Row
              key={s.id}
              emoji={s.emoji}
              title={s.name}
              sub={`${s.description} · risque de blessure ${Math.round(s.injuryRisk * 100)} %`}
              right={s.cost === 0 ? 'Gratuit' : money(state, s.cost)}
              onClick={() => run((ctx) => doSport(ctx, s.id), s.emoji)}
              closed={state.player.age < s.minAge || !reachable}
              because={reachable
                ? `Pas avant ${s.minAge} ans.`
                : 'Aucun équipement à proximité de chez toi.'}
              chevron
            />
          );
        })}
      </Card>
    </Sheet>
  );
}

function WellnessPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;

  return (
    <Sheet title="Bien-être" onBack={onBack}>
      <Card>
        {WELLNESS.map((w) => (
          <Row
            key={w.id}
            emoji={w.emoji}
            title={w.name}
            sub={w.description}
            right={w.cost === 0 ? 'Gratuit' : money(state, w.cost)}
            onClick={() => run((ctx) => doWellness(ctx, w.id), w.emoji)}
            closed={state.player.age < w.minAge}
            because={`Pas avant ${w.minAge} ans.`}
            chevron
          />
        ))}
      </Card>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Loisirs                                                            */
/* ------------------------------------------------------------------ */

function TravelPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;

  return (
    <Sheet title="Voyages" onBack={onBack}>
      <p className="small muted">Un voyage par an. Plus il est lointain, plus il peut mal tourner.</p>
      <Card>
        {DESTINATIONS.map((d) => (
          <Row
            key={d.id}
            emoji={d.emoji}
            title={d.name}
            sub={`${d.description} · risque ${Math.round(d.risk * 100)} %`}
            right={money(state, d.cost)}
            onClick={() => run((ctx) => takeVacation(ctx, d.id), d.emoji)}
            chevron
          />
        ))}
      </Card>
    </Sheet>
  );
}

function NightlifePanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;

  return (
    <Sheet title="Sorties" onBack={onBack}>
      <Card>
        {NIGHTLIFE.map((n) => (
          <Row
            key={n.id}
            emoji={n.emoji}
            title={n.name}
            sub={`${n.description} · rencontre ${Math.round(n.meetChance * 100)} %`}
            right={money(state, n.cost)}
            onClick={() => run((ctx) => goOut(ctx, n.id), n.emoji)}
            closed={state.player.age < n.minAge}
            because={`Pas avant ${n.minAge} ans.`}
            chevron
          />
        ))}
      </Card>
    </Sheet>
  );
}

function GamblingPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [tickets, setTickets] = useState(5);
  const [atTable, setAtTable] = useState(false);
  if (!state) return null;
  const p = state.player;
  if (atTable) return <TableScreen onBack={() => setAtTable(false)} />;

  return (
    <Sheet title="Jeux d’argent" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <span className="small muted">Niveau de dépendance</span>
          <Pill tone={p.stats.addiction > 55 ? 'bad' : p.stats.addiction > 30 ? 'warn' : 'good'}>
            {Math.round(p.stats.addiction)}/100
          </Pill>
        </div>
      </Card>

      <Section title="Loterie">
        <Card pad>
          <p className="small muted" style={{ marginTop: 0 }}>
            {tickets} ticket(s) · {money(state, 3 * tickets)}. L’espérance est mauvaise, comme
            dans la vraie vie.
          </p>
          <AmountPicker value={tickets} max={50} onChange={setTickets} step={1} />
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => run((ctx) => playLottery(ctx, tickets), '🎫')} disabled={p.age < 18}>
              Acheter les tickets
            </Button>
          </div>
          {/* Le même refus muet que les sept lignes de l'agenda, mais sur un
              bouton : avant dix-huit ans il était gris, sans un mot. Un
              bouton désactivé ne s'annonce pas non plus — la phrase doit
              donc vivre à côté de lui. */}
          {p.age < 18 && (
            <p className="small muted" style={{ margin: '10px 0 0' }}>
              Pas avant dix-huit ans.
            </p>
          )}
        </Card>
      </Section>

      {/* La table remplace les quatre noms de jeux d'avant, qui ne
          différaient que par trois nombres dans un tableau : on misait, on
          tirait, on regardait. Il n'y a plus qu'un jeu, mais on y joue. */}
      <Section title="Casino">
        <Card>
          <Row
            emoji="🎲"
            title="La table"
            sub="Des jetons retournés, un pot qui monte, et le moment de s’arrêter."
            onClick={() => setAtTable(true)}
            closed={p.age < 18}
            because="Pas avant dix-huit ans."
            chevron={p.age >= 18}
          />
        </Card>
      </Section>
    </Sheet>
  );
}

function SocialPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [where, setWhere] = useState<string | null>(null);
  if (!state) return null;
  const p = state.player;

  /* --- Le sujet, une fois la maison choisie --- */
  const net = where ? getNetwork(where) : undefined;
  if (net) {
    return (
      <Sheet title={net.name} onBack={() => setWhere(null)}>
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{net.note}</p>
        </Card>
        <Section title="De quoi parles-tu ?">
          <Card>
            {SUBJECTS.map((subject) => (
              <Row
                key={subject.id}
                emoji={subject.emoji}
                title={subject.label}
                // On montre la lassitude, jamais le goût du public : la
                // première est la conséquence de ses propres actes, le second
                // est ce qu'il y a à découvrir.
                sub={`${subject.note} · ${
                  fatigueLabel(fatigueOf(state, net, subject.id))}`}
                right={subject.risk > 0.4
                  ? <Pill tone="warn">ça se retourne</Pill>
                  : undefined}
                onClick={() => {
                  run((ctx) => publish(ctx, net.id, subject.id), subject.emoji);
                  setWhere(null);
                }}
                chevron
              />
            ))}
          </Card>
        </Section>
      </Sheet>
    );
  }

  return (
    <Sheet title="Réseaux sociaux" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <div className="small muted">Abonnés</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{compactNumber(p.followers)}</div>
          </div>
          <Pill tone={p.followers > 100000 ? 'good' : 'primary'}>
            {p.followers > 1_000_000 ? 'Célébrité' : p.followers > 50_000 ? 'Influent' : p.followers > 1000 ? 'Suivi' : 'Anonyme'}
          </Pill>
        </div>
      </Card>
      {/* Publier tenait en un tirage : un dé, quatre bandes, un nombre. On
          choisit maintenant *où* et *quoi*, et chaque public a des goûts que
          rien n'annonce — ils s'apprennent en publiant. */}
      <Section
        title="Où publier"
        sub={`${postsThisYear(state)} / ${YEAR_LIMIT} publications cette année.`}
      >
        <Card>
          {NETWORKS.map((net) => {
            const stop = postBlocker(state, net);
            return (
              <Row
                key={net.id}
                emoji={net.emoji}
                title={net.name}
                sub={net.note}
                because={stop}
                right={<Pill tone={timesOn(state, net.id) >= net.appetite ? 'warn' : undefined}>
                  {timesOn(state, net.id)}/{net.appetite}
                </Pill>}
                closed={Boolean(stop)}
                onClick={() => setWhere(net.id)}
                chevron={!stop}
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Ce que chaque public aime ne s’annonce pas : ça s’apprend en
          publiant. Et un public se lasse — le même sujet au même endroit
          rapporte de moins en moins.
        </p>
      </Section>
      <Card>
        <Row
          emoji="💰"
          title="Monétiser l’audience"
          sub="Partenariat rémunéré"
          onClick={() => run((ctx) => monetizeAudience(ctx), '💰')}
          closed={p.followers < 5000}
          because="Il faut cinq mille abonnés."
          chevron={p.followers >= 5000}
        />
      </Card>
    </Sheet>
  );
}

function PetsPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const p = state.player;

  return (
    <Sheet title="Animaux" onBack={onBack}>
      {p.pets.length > 0 && (
        <Section title="Mes compagnons">
          <Card>
            {p.pets.map((pet) => (
              <Row
                key={pet.id}
                emoji={PET_SPECIES.find((s) => s.name === pet.species)?.emoji ?? '🐾'}
                title={pet.name}
                sub={`${pet.species} · ${pet.age} an(s) · santé ${Math.round(pet.health)} %`}
                right={
                  <span className="small">
                    <button className="pill pill-primary" onClick={() => run((ctx) => playWithPet(ctx, pet.id), '🐾')} type="button">
                      Jouer
                    </button>{' '}
                    <button className="pill" onClick={() => run((ctx) => vetVisit(ctx, pet.id), '🩺')} type="button">
                      Véto
                    </button>
                  </span>
                }
              />
            ))}
          </Card>
        </Section>
      )}
      <Section title="Adopter">
        <Card>
          {PET_SPECIES.map((s) => (
            <Row
              key={s.id}
              emoji={s.emoji}
              title={s.name}
              sub={`${s.description} · ${money(state, s.annualCost)}/an · espérance ${s.lifespan} ans`}
              right={money(state, s.price)}
              onClick={() => run((ctx) => adoptPetSpecies(ctx, s.id), s.emoji)}
              chevron
            />
          ))}
        </Card>
      </Section>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Zone grise et justice                                              */
/* ------------------------------------------------------------------ */

function CrimePanel({ onBack }: { onBack: () => void }) {
  const [pickpocket, setPickpocket] = useState(false);
  const [burglary, setBurglary] = useState(false);
  const [underworld, setUnderworld] = useState(false);
  // Le coup qu'on est en train de jouer, et la graine de sa partie. Le boîtier
  // est un objet inventé : voir `minigames/rings.ts`.
  const [cracking, setCracking] = useState<CrimeDef | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const { state, run } = useGame();
  const [launder, setLaunder] = useState(0);
  if (!state) return null;

  if (cracking?.miniGame === 'heist') {
    const crime = cracking;
    return (
      <HeistScreen
        title={crime.name}
        context={crimeContext(state, crime)}
        seed={seed}
        onBack={() => setCracking(null)}
        onDone={(haul) => {
          run((ctx) => commitCrime(ctx, crime.id, haul !== null, haul ?? undefined), crime.emoji);
          setCracking(null);
          setSeed(Math.floor(Math.random() * 2 ** 31));
        }}
      />
    );
  }

  if (cracking) {
    const crime = cracking;
    return (
      <RingsScreen
        title={crime.name}
        context={crimeContext(state, crime)}
        seed={seed}
        onBack={() => setCracking(null)}
        onDone={(opened) => {
          run((ctx) => commitCrime(ctx, crime.id, opened), crime.emoji);
          setCracking(null);
          setSeed(Math.floor(Math.random() * 2 ** 31));
        }}
      />
    );
  }
  const org = orgOf(state);
  const p = state.player;

  return (
    <Sheet title="Activités illégales" onBack={onBack}>
      {pickpocket && <PickpocketScreen onBack={() => setPickpocket(false)} />}
      {burglary && <BurglaryScreen onBack={() => setBurglary(false)} />}
      {underworld && <UnderworldScreen onBack={() => setUnderworld(false)} />}
      <Card pad>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div className="small muted">Expérience criminelle</div>
            <div style={{ fontWeight: 700 }}>{Math.round(p.stats.criminality)}/100</div>
          </div>
          <div>
            <div className="small muted">Notoriété</div>
            <div style={{ fontWeight: 700 }}>{Math.round(p.criminalRecord.notoriety)}/100</div>
          </div>
          <div>
            <div className="small muted">Arrestations</div>
            <div style={{ fontWeight: 700 }}>{p.criminalRecord.arrests}</div>
          </div>
          <div>
            <div className="small muted">Condamnations</div>
            <div style={{ fontWeight: 700 }}>{p.criminalRecord.convictions.length}</div>
          </div>
        </div>
      </Card>

      <Section title="À la main">
        <Card>
          <Row
            emoji="👛"
            title="Vol à la tire"
            sub="Choisir une cible, et le faire soi-même"
            right={<Pill tone="primary">jouable</Pill>}
            onClick={() => setPickpocket(true)}
            closed={Boolean(pickpocketBlocker(state))}
            because={pickpocketBlocker(state)}
            chevron
          />
          <Row
            emoji="🏠"
            title="Cambriolage"
            sub="Entrer, choisir quoi prendre, ressortir à temps"
            right={<Pill tone="primary">jouable</Pill>}
            onClick={() => setBurglary(true)}
            closed={Boolean(burglaryBlocker(state))}
            because={burglaryBlocker(state)}
            chevron
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Ceux-ci se jouent vraiment : une main qu’on approche, une maison
          qu’on traverse, et parfois une course pour en sortir. La compétence du
          personnage donne du temps et de la marge, elle ne joue pas à ta place.
        </p>
      </Section>

      <Section title="Coups possibles">
        <Card>
          {/*
            « Détournement de fonds » a quitté cette liste : il ne se décide
            plus ici mais au bureau, où la place qu'on occupe décide de ce
            qu'on approche — voir `systems/office.ts`. Le laisser aussi ici
            ferait deux portes vers la même chose, dont une qui ignorerait
            tout ce que l'autre mesure.
          */}
          {CRIMES.filter((c) => c.id !== 'pickpocket' && c.id !== 'burglary' && c.id !== 'embezzle').map((c) => {
            const blocker = crimeBlocker(state, c);
            return (
              <Row
                key={c.id}
                emoji={c.emoji}
                title={c.name}
                sub={`${c.description} · peine ${c.sentenceMin}–${c.sentenceMax} ans`}
                right={
                  <Pill tone={c.miniGame ? 'primary' : c.category === 'petit' ? 'good' : c.category === 'moyen' ? 'warn' : 'bad'}>
                    {c.miniGame ? 'jouable' : c.category}
                  </Pill>
                }
                // Un délit qui déclare un mini-jeu se joue ; les autres se
                // règlent encore au tirage, et le catalogue le porte.
                onClick={() => (c.miniGame
                  ? setCracking(c)
                  : run((ctx) => commitCrime(ctx, c.id), c.emoji))}
                closed={Boolean(blocker)}
                because={blocker}
                chevron={!blocker}
              />
            );
          })}
        </Card>
      </Section>

      <Section title="Le milieu">
        <Card>
          <Row
            emoji="🕴️"
            title={org ? org.name : 'Le milieu'}
            sub={org
              ? `${rankAt(org.rank).name} · respect ${Math.round(org.respect)} · territoire ${Math.round(org.territory)}`
              : 'La chaleur, le carnet, les maisons — et ce qu’elles demandent'}
            right={<Pill tone={heatOf(state) > 60 ? 'bad' : heatOf(state) > 32 ? 'warn' : undefined}>
              chaleur {Math.round(heatOf(state))}
            </Pill>}
            onClick={() => setUnderworld(true)}
            chevron
          />
        </Card>
        {p.criminalRecord.notoriety >= 10 && (
          <Card pad>
            <div className="small muted" style={{ marginBottom: 8 }}>
              Blanchir de l’argent réduit ta notoriété, contre une commission de 18 à 32 %.
            </div>
            <AmountPicker value={launder} max={p.money} onChange={setLaunder} step={500} />
            <div style={{ marginTop: 12 }}>
              <Button
                variant="secondary"
                onClick={() => run((ctx) => launderMoney(ctx, launder), '🧼')}
                disabled={launder <= 0}
              >
                Blanchir {money(state, launder)}
              </Button>
            </div>
          </Card>
        )}
      </Section>
    </Sheet>
  );
}

function JusticePanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const p = state.player;
  const trial = pendingTrial(state);
  const country = getCountry(p.countryId);
  const lastConviction = p.criminalRecord.convictions[p.criminalRecord.convictions.length - 1];

  return (
    <Sheet title="Justice" onBack={onBack}>
      {trial ? (
        <>
          <Card pad>
            <div className="row-title">Procès en cours : {trial.crimeName}</div>
            <div className="row-sub">
              Force des preuves retenues contre toi : {trial.evidence}/100. Sévérité judiciaire du
              pays : {Math.round(country.justice * 100)} %.
            </div>
          </Card>
          <Section title="Choisir un avocat">
            <Card>
              {LAWYERS.map((l) => (
                <Row
                  key={l.id}
                  emoji={l.emoji}
                  title={l.name}
                  sub={`${l.description} · efficacité ${l.quality}/100`}
                  right={l.cost === 0 ? 'Gratuit' : money(state, l.cost)}
                  onClick={() => {
                    const outcome = run((ctx) => goToTrial(ctx, l.id), '⚖️');
                    if (outcome.ok) onBack();
                  }}
                  chevron
                />
              ))}
            </Card>
          </Section>
        </>
      ) : (
        <Empty>Aucune procédure en cours te concernant.</Empty>
      )}

      {lastConviction && !lastConviction.appealed && state.year - lastConviction.year <= 2 && (
        <Section title="Faire appel">
          <Card>
            {LAWYERS.map((l) => (
              <Row
                key={l.id}
                emoji={l.emoji}
                title={`Appel avec ${l.name.toLowerCase()}`}
                sub={`Condamnation ${lastConviction.year} : ${lastConviction.crimeName}`}
                right={money(state, Math.round(l.cost * 1.4))}
                onClick={() => run((ctx) => appeal(ctx, l.id), '📜')}
                chevron
              />
            ))}
          </Card>
        </Section>
      )}

      <Section title="Casier judiciaire">
        {p.criminalRecord.convictions.length === 0 ? (
          <Empty>Ton casier est vierge.</Empty>
        ) : (
          <>
            <Card>
              {p.criminalRecord.convictions.map((c, i) => (
                <Row
                  key={`${c.crimeId}-${c.year}-${i}`}
                  emoji="📌"
                  title={c.crimeName}
                  sub={`${c.year} · ${c.sentenceYears} an(s) · amende ${money(state, c.fine)}`}
                  right={c.appealed ? <Pill>Appel jugé</Pill> : undefined}
                />
              ))}
            </Card>
            <Card>
              <Row
                emoji="🧽"
                title="Demander l’effacement du casier"
                sub="Possible après 10 ans sans nouvelle condamnation"
                onClick={() => run((ctx) => requestExpungement(ctx), '🧽')}
                chevron
              />
            </Card>
          </>
        )}
      </Section>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Démarches administratives                                          */
/* ------------------------------------------------------------------ */

function AdminPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [nameOpen, setNameOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [moveOpen, setMoveOpen] = useState(false);
  const [visaOpen, setVisaOpen] = useState(false);
  if (!state) return null;
  const p = state.player;
  const country = getCountry(p.countryId);

  const validateName = () => {
    run((ctx) => changeName(ctx, firstName, lastName), '✍️');
    setNameOpen(false);
  };

  return (
    <Sheet title="Démarches" onBack={onBack}>
      <Card>
        <Row
          emoji="🚘"
          title="Permis de conduire"
          sub="Auto-école et examen"
          onClick={() => run((ctx) => getDrivingLicense(ctx), '🚘')}
          closed={Boolean(p.flags.license) || p.age < 17}
          because={p.flags.license
            ? 'Tu as déjà le permis.'
            : 'Pas avant dix-sept ans.'}
          chevron
        />
        <Row
          emoji="✍️"
          title="Changer de nom"
          sub={`Actuellement : ${p.firstName} ${p.lastName}`}
          onClick={() => {
            setFirstName(p.firstName);
            setLastName(p.lastName);
            setNameOpen(true);
          }}
          closed={p.age < 16}
          because="Pas avant seize ans."
          chevron
        />
        <Row
          emoji="🏙️"
          title="Déménager"
          sub={`Une autre ville de ${country.name}`}
          onClick={() => setMoveOpen(true)}
          chevron
        />
        <Row
          emoji="🛂"
          title="Émigrer"
          sub="Demander un visa pour un autre pays"
          onClick={() => setVisaOpen(true)}
          closed={p.age < 18}
          because="Pas avant dix-huit ans."
          chevron
        />
      </Card>

      <Modal open={nameOpen} onClose={() => setNameOpen(false)} icon="✍️" title="Changement de nom">
        <TextField
          label="Prénom" kind="given" value={firstName} onChange={setFirstName} maxLength={20}
        />
        <TextField
          label="Nom" kind="family" value={lastName} onChange={setLastName} maxLength={24}
          // La touche « OK » du clavier fait ce qu'elle annonce : sans cela,
          // elle referme le clavier et laisse le joueur chercher un bouton
          // que le clavier lui cachait une seconde plus tôt.
          onSubmit={validateName}
        />
        <Button onClick={validateName}>
          Valider ({money(state, 900)})
        </Button>
      </Modal>

      <Modal open={moveOpen} onClose={() => setMoveOpen(false)} icon="🏙️" title={`Villes de ${country.name}`}>
        <Card>
          {country.cities.map((c) => (
            <Row
              key={c.name}
              emoji={c.size === 'métropole' ? '🌆' : c.size === 'ville' ? '🏘️' : '🏡'}
              title={c.name}
              sub={`${c.size} · coût de la vie ×${c.costMult.toFixed(2)}`}
              right={c.name === p.cityName ? <Pill tone="primary">Ici</Pill> : undefined}
              closed={c.name === p.cityName}
              because="Tu y habites déjà."
              onClick={() => {
                run((ctx) => moveToCity(ctx, c.name), '🏙️');
                setMoveOpen(false);
              }}
              chevron
            />
          ))}
        </Card>
      </Modal>

      <Modal open={visaOpen} onClose={() => setVisaOpen(false)} icon="🛂" title="Émigrer">
        <p className="modal-text left small">
          Le visa dépend de l’ouverture du pays, de ton diplôme, de ton emploi et de ton casier.
          Un départ met fin à ton emploi actuel — tes diplômes, eux, te suivent.
        </p>
        <Card>
          {COUNTRIES.filter((c) => c.id !== p.countryId).map((c) => (
            <Row
              key={c.id}
              emoji={c.flag}
              title={c.name}
              sub={`Salaires ×${c.salaryIndex.toFixed(2)} · coût ×${c.costIndex.toFixed(2)} · santé ${Math.round(c.healthcare * 100)} %`}
              right={
                <Pill tone={c.openness > 0.55 ? 'good' : c.openness > 0.3 ? 'warn' : 'bad'}>
                  {Math.round(c.openness * 100)} %
                </Pill>
              }
              onClick={() => {
                const outcome = run((ctx) => immigrate(ctx, c.id), c.flag);
                if (outcome.ok) setVisaOpen(false);
              }}
              chevron
            />
          ))}
        </Card>
      </Modal>
    </Sheet>
  );
}

function WillPanel({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  const [shares, setShares] = useState<Record<string, number>>(() => ({ ...state?.player.will.shares }));
  if (!state) return null;

  const heirs = Object.values(state.npcs).filter(
    (p) => p.alive && !p.petSpecies
      && ['spouse', 'partner', 'son', 'daughter', 'mother', 'father', 'brother', 'sister', 'bestFriend', 'friend'].includes(p.relation),
  );
  const total = Object.values(shares).reduce((s, x) => s + x, 0);

  return (
    <Sheet title="Testament" onBack={onBack}>
      <p className="small muted">
        Répartis ton patrimoine. Sans testament, la loi désigne d’office ton conjoint et tes
        enfants, puis tes parents et ta fratrie.
      </p>
      <Card pad>
        <div className="spread">
          <span className="small muted">Total attribué</span>
          <Pill tone={total > 100 ? 'bad' : total === 100 ? 'good' : 'warn'}>{total} %</Pill>
        </div>
      </Card>
      {heirs.length === 0 ? (
        <Empty>Personne à désigner pour l’instant.</Empty>
      ) : (
        <Card>
          {heirs.map((h) => (
            <div className="row" key={h.id}>
              <span className="row-main">
                <span className="row-title">{h.firstName} {h.lastName}</span>
                <span className="row-sub">{h.relation}</span>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={shares[h.id] ?? 0}
                  onChange={(e) =>
                    setShares((prev) => ({ ...prev, [h.id]: Number(e.target.value) }))
                  }
                />
              </span>
              <span className="row-right">{shares[h.id] ?? 0} %</span>
            </div>
          ))}
        </Card>
      )}
      <div style={{ marginTop: 14 }}>
        <Button
          onClick={() => {
            const cleaned = Object.fromEntries(Object.entries(shares).filter(([, v]) => v > 0));
            const outcome = run((ctx) => updateWill(ctx, cleaned), '📜');
            if (outcome.ok) onBack();
          }}
          disabled={total > 100}
        >
          Enregistrer chez le notaire ({money(state, 400)})
        </Button>
      </div>
    </Sheet>
  );
}

/**
 * La ligne « d'où tu viens », dans le menu.
 *
 * Elle n'existe que pour les deux enfances concernées, et **seulement une fois
 * que le personnage sait** : la faire apparaître plus tôt reviendrait à
 * l'apprendre au joueur avant le personnage, ce qui vide de son sens la façon
 * dont on l'apprend — qui est la première décision du système, et la seule que
 * le joueur subisse au lieu de la prendre.
 */
function RootsRow({ state, onOpen }: { state: GameState; onOpen: () => void }) {
  const roots = rootsOf(state);
  if (!roots || roots.knownYear === null) return null;
  const done = roots.outcome !== null;
  const ready = canGo(state);
  return (
    <Row
      emoji="🧬"
      title="D’où tu viens"
      sub={rootsSummary(state)}
      right={<Pill tone={done ? undefined : ready ? 'good' : 'primary'}>
        {done ? 'réglé' : ready ? 'tu peux y aller' : `${Math.round(roots.trail)} / ${ENOUGH}`}
      </Pill>}
      onClick={onOpen}
      chevron
    />
  );
}

/**
 * La ligne « ce que tu tiens », dans le menu.
 *
 * **Une tuile a d'abord été essayée, dans « Santé et corps », et c'était une
 * erreur.** Une tuile ne porte qu'un libellé : elle ne pouvait dire ni ce
 * qu'on tient, ni depuis combien de temps, ni — surtout — que l'année est
 * bloquée. Or un joueur dont les pratiques n'avancent plus doit l'apprendre
 * *sans* ouvrir l'écran, sinon il perd trois années sans savoir pourquoi.
 *
 * Elle est aussi rangée ailleurs : à côté des défis, des langues et des
 * compétences, sous « ce que tu te promets ». Sport et Bien-être sont des
 * années isolées ; une pratique est un engagement qui court, et c'est de la
 * même famille qu'un défi.
 */
function PracticeRow({ state, onOpen }: { state: GameState; onOpen: () => void }) {
  if (availablePractices(state).length === 0) return null;
  const running = practicesKept(state);
  const best = bestPractice(state);
  const stuck = stalled(state);
  return (
    <Row
      emoji={best?.practice.emoji ?? running[0]?.emoji ?? '🥋'}
      title="Ce que tu tiens"
      sub={practiceSummary(state)}
      right={<Pill tone={stuck ? 'bad' : running.length > 0 ? 'primary' : undefined}>
        {running.length === 0 ? 'rien' : stuck ? 'à l’arrêt' : `${running.length} en cours`}
      </Pill>}
      onClick={onOpen}
      chevron
    />
  );
}

/**
 * La ligne « ce que tu sais faire », dans le menu.
 *
 * Elle doit dire trois choses en une ligne : ce qu'on sait le mieux faire,
 * s'il reste du temps cette année, et — quand on n'a encore rien essayé — que
 * le don se cherche. Une ligne qui n'afficherait qu'un titre laisserait le
 * système invisible à qui n'ouvre pas l'écran.
 */
function SkillRow({ state, onOpen }: { state: GameState; onOpen: () => void }) {
  if (availableSkills(state).length === 0) return null;
  const best = bestSkill(state);
  const trade = skillOfJob(state);
  const left = Math.max(0, PER_YEAR - workedThisYear(state));
  const shown = best ?? (trade ? { skill: trade, held: stateOf(state, trade.id) } : null);
  const sub = shown
    ? `${shown.skill.label} — ${rankOf(shown.held.level).toLowerCase()}${
      giftKnown(state, shown.skill.id) ? '' : ', et tu ne sais pas encore si tu es doué'}`
    : 'Tu n’as encore rien essayé. On ne sait pas pour quoi tu es fait.';
  return (
    <Row
      emoji={shown?.skill.emoji ?? '🎓'}
      title="Ce que tu sais faire"
      sub={sub}
      right={<Pill tone={left > 0 ? 'primary' : undefined}>{left > 0 ? `${left} séance(s)` : 'plus tard'}</Pill>}
      onClick={onOpen}
      chevron
    />
  );
}
