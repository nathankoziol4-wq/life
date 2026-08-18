/**
 * Écran « Proches » : famille, couple, amis, collègues, et toutes les
 * interactions sociales disponibles avec chacun (§7, §8).
 */

import { useMemo, useState } from 'react';
import {
  AmountPicker, Button, Card, Empty, Meter, Modal, Pill, Row, Section, Sheet,
} from '../components/Modal.tsx';
import { RelationshipCard } from '../components/RelationshipCard.tsx';
import {
  GROWN, attentionLabel, attentionShare, availableRearings, childLine, leftFor,
  rear, rearBlocker, rearingCost, upbringingOf,
} from '../systems/upbringing.ts';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money, relationQuality } from '../ui/format.ts';
import { RELATION_LABELS, RELATION_ORDER } from '../engine/context.ts';
import {
  currentPartner, interact, isRomanticallyCompatible, signPrenup, tryForBaby,
} from '../systems/relationships.ts';
import { askForMoney, giveMoney } from '../systems/finance.ts';
import { adoptChild, buyEngagementRing, fertilityTreatment, useDatingApp } from '../systems/activities.ts';
import {
  REQUEST_MAP, askParent, availableRequests, pendingConditions,
} from '../systems/asking.ts';
import {
  ailing, faraway, sentenceLeft, together, visit, visitBlocker, visits,
} from '../systems/lives.ts';
import {
  apologise, grievance, grudgeOf, grudgeWord, hostile, sore, sorryBlocker,
  sorryOdds,
} from '../systems/grudges.ts';
import {
  COUNSELS, POSTURES, childrenAtStake, counselCost, divorceBlocker, preview,
  separate,
} from '../systems/separation.ts';
import {
  TRAITS, TRAIT_LABEL, dateBlocker, knows, placesFor, unknownTraits,
} from '../systems/dates.ts';
import { DateScreen } from './DateScreen.tsx';
import type { Person } from '../engine/types.ts';

/** Les figures parentales, seules à qui l'on demande ce genre de chose. */
const isParent = (relation: Person['relation']) =>
  ['mother', 'father', 'stepmother', 'stepfather', 'grandmother', 'grandfather'].includes(relation);

const GROUPS: { title: string; kinds: Person['relation'][] }[] = [
  { title: 'Couple', kinds: ['spouse', 'partner', 'crush'] },
  { title: 'Enfants', kinds: ['son', 'daughter'] },
  { title: 'Parents', kinds: ['mother', 'father', 'stepmother', 'stepfather'] },
  { title: 'Fratrie', kinds: ['brother', 'sister'] },
  { title: 'Amis', kinds: ['bestFriend', 'friend'] },
  { title: 'Travail et études', kinds: ['boss', 'coworker', 'classmate'] },
  { title: 'Anciennes relations', kinds: ['ex'] },
  { title: 'Autres', kinds: ['acquaintance', 'inmate', 'lawyer'] },
];

/** Une icône par geste. Voir la note ci-dessous sur les points minuscules. */
const REARING_ICONS: Record<string, string> = {
  temps: '🕰️',
  devoirs: '📚',
  cadrer: '📏',
  laisser: '🌾',
  payer: '💳',
  transmettre: '🧭',
};

export function RelationshipsScreen() {
  const { state, run } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [showDeceased, setShowDeceased] = useState(false);

  const grouped = useMemo(() => {
    if (!state) return [];
    const people = Object.values(state.npcs).filter((p) => p.alive && !p.petSpecies);
    return GROUPS.map((g) => ({
      title: g.title,
      people: people
        .filter((p) => g.kinds.includes(p.relation))
        .sort((a, b) => RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation) || b.relationship - a.relationship),
    })).filter((g) => g.people.length > 0);
  }, [state, state?.npcs]);

  if (!state) return null;
  const p = state.player;
  const deceased = Object.values(state.npcs).filter((x) => !x.alive && !x.petSpecies);
  const person = selected ? state.npcs[selected] : null;
  const partner = currentPartner(state);

  return (
    <>
      <Section title="Rencontrer du monde">
        <Card>
          <Row
            emoji="💘"
            title="Application de rencontre"
            sub={partner ? 'Tu es déjà en couple…' : 'Trouver quelqu’un'}
            onClick={() => run((ctx) => useDatingApp(ctx), '💘')}
            disabled={p.age < 18 || Boolean(p.prison)}
            chevron
          />
          {partner && partner.relation === 'partner' && (
            <>
              <Row
                emoji="💍"
                title="Acheter une bague"
                sub={p.flags.ringValue ? `Bague à ${money(state, Number(p.flags.ringValue))}` : 'Améliore les chances d’un oui'}
                onClick={() => setSelected(`ring:${partner.id}`)}
                chevron
              />
              <Row
                emoji="📄"
                title="Contrat de mariage"
                sub={p.flags.prenup ? 'Contrat signé' : 'Protège ton patrimoine en cas de divorce'}
                onClick={() => run((ctx) => signPrenup(ctx), '📄')}
                disabled={Boolean(p.flags.prenup)}
                chevron
              />
            </>
          )}
          {partner && (
            <Row
              emoji="🍼"
              title="Essayer d’avoir un enfant"
              sub={p.flags.pregnant ? 'Un enfant est déjà en route' : 'Une tentative par an'}
              onClick={() => run((ctx) => tryForBaby(ctx), '🍼')}
              disabled={Boolean(p.flags.pregnant)}
              chevron
            />
          )}
          <Row
            emoji="🌱"
            title="Traitement de fertilité"
            sub="Augmente fortement les chances de conception"
            onClick={() => run((ctx) => fertilityTreatment(ctx), '🌱')}
            disabled={p.age < 18 || p.age > 50}
            chevron
          />
          <Row
            emoji="🧸"
            title="Adopter un enfant"
            sub="Procédure longue et sélective"
            onClick={() => run((ctx) => adoptChild(ctx), '🧸')}
            disabled={p.age < 25}
            chevron
          />
        </Card>
      </Section>

      {grouped.length === 0 && <Empty>Personne dans ton entourage pour l’instant.</Empty>}

      {grouped.map((g) => (
        <Section key={g.title} title={g.title}>
          <Card>
            {g.people.map((x) => (
              <RelationshipCard key={x.id} person={x} onClick={() => setSelected(x.id)} />
            ))}
          </Card>
        </Section>
      ))}

      {deceased.length > 0 && (
        <Section
          title="Disparus"
          action={
            <button className="small muted" onClick={() => setShowDeceased((v) => !v)} type="button">
              {showDeceased ? 'Masquer' : `Afficher (${deceased.length})`}
            </button>
          }
        >
          {showDeceased && (
            <Card>
              {deceased.map((x) => (
                <RelationshipCard key={x.id} person={x} onClick={() => setSelected(x.id)} />
              ))}
            </Card>
          )}
        </Section>
      )}

      {person && (
        <PersonSheet personId={person.id} onBack={() => setSelected(null)} />
      )}
      {selected?.startsWith('ring:') && (
        <RingModal partnerId={selected.slice(5)} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Fiche détaillée d'un PNJ                                           */
/* ------------------------------------------------------------------ */

function PersonSheet({ personId, onBack }: { personId: string; onBack: () => void }) {
  const { state, run } = useGame();
  const [giftOpen, setGiftOpen] = useState(false);
  // La procédure : qui te représente, et ce que tu vas chercher. Les deux
  // ensemble décident de l'argent, des enfants et de ce qu'il te restera.
  const [divorceOpen, setDivorceOpen] = useState(false);
  const [counselId, setCounselId] = useState('commis');
  const [postureId, setPostureId] = useState('amiable');
  const [giftAmount, setGiftAmount] = useState(0);
  // La soirée : un écran à elle, parce qu'elle se joue en plusieurs moments.
  const [dating, setDating] = useState(false);
  if (!state) return null;
  const person = state.npcs[personId];
  if (!person) return null;
  const p = state.player;

  const romanticAllowed =
    person.alive
    && !['mother', 'father', 'brother', 'sister', 'son', 'daughter', 'stepmother', 'stepfather'].includes(person.relation)
    && p.age >= 13
    && isRomanticallyCompatible(p.sex, p.orientation, person);

  const act = (fn: Parameters<typeof interact>[2], value?: number) => {
    run((ctx) => interact(ctx, personId, fn, value), avatarFor(person));
  };

  if (dating) return <DateScreen personId={personId} onBack={() => setDating(false)} />;

  // Si aucun endroit n'est ouvert, la ligne ne doit pas mener à un écran de
  // refus : on remonte la raison du plus accessible.
  const open = placesFor(state).filter((place) => !dateBlocker(state, person, place.id));
  const firstOpenPlace = open.length > 0 ? null
    : dateBlocker(state, person, placesFor(state)[0]?.id ?? 'cafe') ?? 'Nulle part où aller.';

  return (
    <Sheet title={`${person.firstName} ${person.lastName}`} onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 38 }}>{person.alive ? avatarFor(person) : '🕯️'}</div>
            <div>
              <div className="row-title">{RELATION_LABELS[person.relation]}</div>
              <div className="row-sub">
                {person.age} ans{person.jobTitle ? ` · ${person.jobTitle}` : ''}
              </div>
              {person.alive && (
                <div className="row-sub">{relationQuality(person.relationship)}</div>
              )}
            </div>
          </div>
        </div>
        {person.alive && (
          <div className="chips" style={{ marginTop: 12 }}>
            <Pill tone="primary">Relation {Math.round(person.relationship)}</Pill>
            <Pill>Opinion {Math.round(person.opinion)}</Pill>
            {person.estranged && <Pill tone="bad">Ponts coupés</Pill>}
            {person.maritalStatus === 'married' && <Pill>Marié</Pill>}
            {person.maritalStatus === 'dating' && <Pill>En couple</Pill>}
            {person.maritalStatus === 'divorced' && <Pill>Divorcé</Pill>}
            {person.maritalStatus === 'widowed' && <Pill>Veuf</Pill>}
            {/* Ce que sa vie fait de lui en ce moment. Sans ces trois-là, un
                frère malade, détenu ou parti à l'autre bout se lisait comme
                un frère ordinaire dont le lien baissait sans raison. */}
            {sore(person) && (
              <Pill tone={hostile(person) ? 'bad' : 'warn'}>
                {grudgeWord(grudgeOf(person))}
              </Pill>
            )}
            {ailing(person) && <Pill tone="bad">Malade</Pill>}
            {person.incarcerated && (
              <Pill tone="bad">Détenu · {sentenceLeft(person)} an(s)</Pill>
            )}
            {faraway(person) && <Pill tone="warn">Parti loin</Pill>}
            {person.salary > 0 && <Pill tone="accent">{money(state, person.salary)}/an</Pill>}
          </div>
        )}
      </Card>

      {person.alive && sore(person) && (
        <Section title="Ce qu’il te reproche">
          <Card pad>
            <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
              {grievance(person)?.line ?? 'Quelque chose est resté en travers.'}
            </p>
          </Card>
          <Card>
            <Row
              emoji="🙏"
              title="S’excuser"
              // Accordé : la fiche d'une sœur annonçait « il peut refuser…
              // qu'il t'écoute », ce que seule une capture d'écran montre.
              sub={sorryBlocker(state, person)
                ?? `Il faudra avaler quelque chose, et ${
                  person.sex === 'F' ? 'elle' : 'il'} peut refuser. ${
                  Math.round(sorryOdds(state, person) * 100)} % de chances qu’${
                  person.sex === 'F' ? 'elle' : 'il'} t’écoute.`}
              disabled={Boolean(sorryBlocker(state, person))}
              onClick={sorryBlocker(state, person)
                ? undefined
                : () => run((ctx) => apologise(ctx, person.id), '🙏')}
              chevron={!sorryBlocker(state, person)}
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Le temps ne règle rien tout seul, mais il rend les mots audibles :
            les mêmes excuses portent mieux dix ans plus tard.
          </p>
        </Section>
      )}

      {person.alive && person.incarcerated && (
        <Section title="Au parloir">
          <Card>
            <Row
              emoji="🕰️"
              title="Aller le voir"
              sub={visitBlocker(state, person)
                ?? `Une heure, une fois dans l’année. ${visits(person) > 0
                  ? `Tu y es déjà allé ${visits(person)} fois.`
                  : 'Ça ne raccourcira rien.'}`}
              disabled={Boolean(visitBlocker(state, person))}
              onClick={visitBlocker(state, person)
                ? undefined
                : () => run((ctx) => visit(ctx, person.id), '🕰️')}
              chevron={!visitBlocker(state, person)}
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Une peine se purge, et rien ne l’abrège. Ce qui change, c’est
            l’état dans lequel on en sort — et le lien, qui autrement tomberait
            pendant que {person.firstName} est hors d’atteinte.
          </p>
        </Section>
      )}

      {!person.alive ? (
        <Section title="Souvenir">
          <Card pad>
            <p className="small muted" style={{ margin: 0 }}>
              {person.firstName} est mort{person.sex === 'F' ? 'e' : ''} en {person.deathYear} à{' '}
              {person.age} ans, {person.deathCause}.
            </p>
          </Card>
        </Section>
      ) : (
        <>
          {/* Mesuré avant que cette section soit couverte : les partenaires
              choisis étaient loyaux à 46 % — le hasard exact — alors que
              l'écran affichait leur loyauté dès la rencontre. Une information
              gratuite sur un inconnu n'est pas une information : c'est ce qui
              empêchait d'avoir quelqu'un à découvrir. */}
          <Section title="Personnalité">
            <Card>
              {TRAITS.map((trait) => (
                <TraitRow
                  key={trait}
                  label={TRAIT_LABEL[trait]}
                  value={person.personality[trait]}
                  inverted={trait === 'temper'}
                  known={knows(person, trait)}
                />
              ))}
            </Card>
            {unknownTraits(person).length > 0 && (
              <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
                Tu ne connais pas encore {person.firstName} là-dessus. Ça se
                découvre en vivant quelque chose ensemble — ou, beaucoup plus
                lentement, en restant proches.
              </p>
            )}
          </Section>

          {/* Quelqu'un qui est dedans n'est pas joignable : le moteur refuse
              déjà ces gestes, mais l'écran les proposait quand même et le
              joueur cliquait dans le vide. Le navigateur l'a montré. */}
          <Section title="Interactions">
            <Card>
              <Row
                emoji="💬" title="Discuter"
                sub={person.incarcerated ? 'Pas d’ici. Il faut y aller.' : 'Entretenir le lien'}
                disabled={person.incarcerated}
                onClick={person.incarcerated ? undefined : () => act('talk')}
                chevron={!person.incarcerated}
              />
              <Row
                emoji="🕰️" title="Passer du temps ensemble"
                sub={person.incarcerated ? 'Seulement au parloir.' : 'Le plus efficace'}
                disabled={person.incarcerated}
                onClick={person.incarcerated ? undefined : () => act('time')}
                chevron={!person.incarcerated}
              />
              <Row
                emoji="🌟" title="Faire un compliment"
                disabled={person.incarcerated}
                onClick={person.incarcerated ? undefined : () => act('compliment')}
                chevron={!person.incarcerated}
              />
              <Row
                emoji="🎁"
                title="Offrir un cadeau"
                sub="Plus il est cher, plus il touche"
                onClick={person.incarcerated ? undefined : () => {
                  setGiftAmount(Math.min(p.money, 200));
                  setGiftOpen(true);
                }}
                disabled={p.money <= 0 || person.incarcerated}
                chevron
              />
            </Card>
          </Section>

          {/* Sortir ensemble : le seul geste du jeu où l'on apprend quelque
              chose de quelqu'un. Mesuré avant qu'il existe : neuf « discuter »
              séparaient un inconnu d'un couple, et les partenaires choisis
              étaient loyaux à 46 % — le hasard exact. */}
          {romanticAllowed && (
            <Section title="Sortir ensemble">
              <Card>
                <Row
                  emoji="🌙"
                  title={person.relation === 'partner' || person.relation === 'spouse'
                    ? 'Passer une soirée à deux'
                    : `Proposer une sortie à ${person.firstName}`}
                  sub={firstOpenPlace ?? `Il te reste ${unknownTraits(person).length} chose(s) à découvrir`}
                  disabled={Boolean(firstOpenPlace)}
                  onClick={firstOpenPlace ? undefined : () => setDating(true)}
                  chevron={!firstOpenPlace}
                />
              </Card>
            </Section>
          )}

          {/* Élever : le seul endroit du jeu où une boucle se referme
              entièrement — l'enfant qu'on élève est le personnage qu'on
              jouera peut-être ensuite. Voir `data/upbringing.ts`. */}
          {(person.relation === 'son' || person.relation === 'daughter') && (
            <Section title={person.age < GROWN ? 'L’élever' : 'Ce que tu en as fait'}>
              <Card pad>
                <div className="spread">
                  <span className="small muted">{childLine(person)}</span>
                  <strong className="small">
                    {person.age < GROWN
                      ? `${leftFor(person)} geste(s) cette année`
                      : attentionLabel(upbringingOf(person).attention / 12, GROWN)}
                  </strong>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Meter value={attentionShare(person) * 100} />
                </div>
                <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
                  {person.age < GROWN
                    ? 'Le temps est la seule ressource. Ce que tu ne donnes pas à celui-là, tu le donnes à un autre — ou à personne.'
                    : 'Son enfance est finie. Ce qu’il est maintenant, c’est ce que tu en as fait.'}
                </p>
              </Card>
              {person.age < GROWN && (
                <Card>
                  {availableRearings(person).map((rearing) => {
                    const why = rearBlocker(state, person, rearing.id);
                    const cost = rearingCost(state, rearing.id);
                    return (
                      <Row
                        key={rearing.id}
                        // Chacun le sien : quatre points minuscules à côté de
                        // deux vraies icônes se lisaient comme des lignes
                        // désactivées, ce que le navigateur a montré.
                        emoji={REARING_ICONS[rearing.id] ?? '·'}
                        title={rearing.label}
                        sub={why ?? rearing.note}
                        right={cost > 0 ? <Pill tone="warn">{money(state, cost)}</Pill> : undefined}
                        disabled={Boolean(why)}
                        onClick={why ? undefined : () => run(
                          (ctx) => rear(ctx, person.id, rearing.id), '👶',
                        )}
                        chevron={!why}
                      />
                    );
                  })}
                </Card>
              )}
              {upbringingOf(person).record.length > 0 && (
                <Card>
                  {upbringingOf(person).record.map((line, i) => (
                    <Row key={i} emoji="·" title={String(line.year)} sub={line.text} />
                  ))}
                </Card>
              )}
            </Section>
          )}

          {isParent(person.relation) && availableRequests(state).length > 0 && (
            <Section title="Lui demander quelque chose">
              <Card>
                {availableRequests(state).map((request) => (
                  <Row
                    key={request.id}
                    emoji={request.emoji}
                    title={request.label}
                    sub={request.effect}
                    onClick={() => run((ctx) => askParent(ctx, personId, request.id), request.emoji)}
                    chevron
                  />
                ))}
              </Card>
              <p className="small muted" style={{ margin: '8px 4px 0' }}>
                Il peut dire oui, dire non, s’agacer, ou poser une condition —
                selon ce qu’il est, ce que le foyer peut se permettre, et ce
                que tu as fait jusqu’ici.
              </p>
            </Section>
          )}

          {pendingConditions(state).filter((c) => c.parentId === personId).length > 0 && (
            <Section title="Ce que tu lui as promis">
              <Card>
                {pendingConditions(state)
                  .filter((c) => c.parentId === personId)
                  .map((c) => (
                    <Row
                      key={c.requestId}
                      emoji="🤞"
                      title={REQUEST_MAP[c.requestId]?.label ?? c.requestId}
                      sub={c.text}
                      right={<Pill tone="warn">à tenir</Pill>}
                    />
                  ))}
              </Card>
            </Section>
          )}

          <Section title="Argent">
            <Card>
              <Row
                emoji="💸"
                title="Donner de l’argent"
                onClick={() => {
                  setGiftAmount(Math.min(p.money, 500));
                  setGiftOpen(true);
                }}
                disabled={p.money <= 0}
                chevron
              />
              <Row
                emoji="🙏"
                title="Demander de l’argent"
                sub={`Patrimoine estimé : ${money(state, person.wealth)}`}
                onClick={() => run((ctx) => askForMoney(ctx, personId), '🙏')}
                chevron
              />
            </Card>
          </Section>

          {romanticAllowed && (
            <Section title="Vie sentimentale">
              <Card>
                {person.relation !== 'spouse' && person.relation !== 'partner' && (
                  <>
                    <Row emoji="😘" title="Embrasser" onClick={() => act('kiss')} chevron />
                    <Row emoji="💐" title="Proposer de sortir ensemble" onClick={() => act('askOut')} chevron />
                  </>
                )}
                {person.relation === 'partner' && (
                  <>
                    <Row emoji="😘" title="Embrasser" onClick={() => act('kiss')} chevron />
                    <Row
                      emoji="💍"
                      title="Faire une demande en mariage"
                      sub={p.flags.ringValue ? `Bague à ${money(state, Number(p.flags.ringValue))}` : 'Sans bague, c’est plus dur'}
                      onClick={() => act('propose')}
                      chevron
                    />
                    <Row emoji="💔" title="Rompre" onClick={() => act('breakUp')} chevron />
                  </>
                )}
                {person.relation === 'spouse' && (
                  <Row
                    emoji="⚖️"
                    title="Divorcer"
                    sub={childrenAtStake(state).length > 0
                      ? `Le partage, et qui garde ${childrenAtStake(state).length > 1 ? 'les enfants' : 'l’enfant'}`
                      : 'Le partage des biens'}
                    onClick={() => setDivorceOpen(true)}
                    chevron
                  />
                )}
              </Card>
            </Section>
          )}

          <Section title="Conflit">
            <Card>
              <Row emoji="😠" title="Se disputer" onClick={() => act('argue')} chevron />
              <Row emoji="🤬" title="Insulter" onClick={() => act('insult')} chevron />
              {person.estranged ? (
                <Row emoji="🕊️" title="Tenter de renouer" onClick={() => act('reconnect')} chevron />
              ) : (
                <Row emoji="✂️" title="Couper les ponts" onClick={() => act('cutTies')} chevron />
              )}
            </Card>
          </Section>
        </>
      )}

      {person.alive && person.maritalStatus === 'dating' && together(state, person) > 0 && (
        <Section title="Sa vie">
          <Card pad>
            <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
              {person.firstName} voit quelqu’un depuis {together(state, person)} an(s).
            </p>
          </Card>
        </Section>
      )}

      {person.history.length > 0 && (
        <Section title="Son histoire">
          <Card>
            {[...person.history].reverse().slice(0, 12).map((h, i) => (
              <Row key={`${h.year}-${i}`} emoji="•" title={h.text} right={String(h.year)} />
            ))}
          </Card>
        </Section>
      )}

      {/* La procédure. Tout se décide ici, une fois : l'ancienne version
          partageait l'argent et comptait les enfants sans jamais les
          déplacer — ils restaient chez le joueur quoi qu'il arrive. */}
      <Modal
        open={divorceOpen}
        onClose={() => setDivorceOpen(false)}
        icon="⚖️"
        title={`Divorcer de ${person.firstName}`}
        text="On ne peut pas tout garder. Ce que tu vas chercher se paiera ailleurs."
      >
        <Section title="Qui te représente">
          <Card>
            {COUNSELS.map((counsel) => (
              <Row
                key={counsel.id}
                emoji={counsel.emoji}
                title={counsel.label}
                sub={counsel.note}
                right={counsel.id === counselId
                  ? <Pill tone="primary">Choisi</Pill>
                  : <Pill>{counsel.cost === 0 ? 'gratuit' : money(state, counselCost(state, counsel))}</Pill>}
                disabled={p.money < counselCost(state, counsel)}
                onClick={() => setCounselId(counsel.id)}
              />
            ))}
          </Card>
        </Section>

        <Section title="Ce que tu vas chercher">
          <Card>
            {POSTURES.map((posture) => (
              <Row
                key={posture.id}
                emoji={posture.emoji}
                title={posture.label}
                sub={posture.note}
                right={posture.id === postureId ? <Pill tone="primary">Choisi</Pill> : undefined}
                onClick={() => setPostureId(posture.id)}
              />
            ))}
          </Card>
        </Section>

        {(() => {
          const seen = preview(state, person, counselId, postureId);
          if (!seen) return null;
          const kids = childrenAtStake(state);
          return (
            <Section title="Ce que ça donnerait">
              <Card>
                <Row emoji="💰" title="Ce qu’il te resterait" right={money(state, seen.kept)} />
                {kids.length > 0 && (
                  <Row
                    emoji="🧒"
                    title="Les enfants"
                    right={<Pill tone={seen.custody === 'moi' ? 'good' : seen.custody === 'lui' ? 'bad' : 'warn'}>
                      {seen.custody === 'moi' ? 'chez toi' : seen.custody === 'lui' ? `chez ${person.firstName}` : 'partagée'}
                    </Pill>}
                  />
                )}
                {seen.years > 0 && (
                  <Row emoji="⏳" title="Durée" right={`${seen.years} an(s) de procédure`} />
                )}
              </Card>
              <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
                Ce que tu as fait de leur enfance pèse plus que ton avocat. Un
                parent absent peut l’emporter, mais il lui faut vraiment payer.
              </p>
            </Section>
          );
        })()}

        <div className="btn-row" style={{ marginTop: 14 }}>
          <Button variant="secondary" onClick={() => setDivorceOpen(false)}>Renoncer</Button>
          <Button
            disabled={Boolean(divorceBlocker(state, person, counselId))}
            onClick={() => {
              setDivorceOpen(false);
              run((ctx) => separate(ctx, person.id, counselId, postureId), '⚖️');
            }}
          >
            Engager la procédure
          </Button>
        </div>
      </Modal>

      <Modal
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
        icon="🎁"
        title={`Offrir à ${person.firstName}`}
        text={`Tu disposes de ${money(state, p.money)}.`}
      >
        <AmountPicker value={giftAmount} max={p.money} onChange={setGiftAmount} step={10} />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <Button
            variant="secondary"
            onClick={() => {
              run((ctx) => interact(ctx, personId, 'gift', giftAmount), '🎁');
              setGiftOpen(false);
            }}
            disabled={giftAmount <= 0}
          >
            Cadeau
          </Button>
          <Button
            onClick={() => {
              run((ctx) => giveMoney(ctx, personId, giftAmount), '💸');
              setGiftOpen(false);
            }}
            disabled={giftAmount <= 0}
          >
            Argent
          </Button>
        </div>
      </Modal>
    </Sheet>
  );
}

function TraitRow(
  { label, value, inverted, known }:
  { label: string; value: number; inverted?: boolean; known: boolean },
) {
  if (!known) return <Row title={label} right={<span className="muted">?</span>} />;
  const v = Math.round(value);
  const words = inverted
    ? v > 70 ? 'Explosif' : v > 45 ? 'Susceptible' : 'Posé'
    : v > 75 ? 'Très fort' : v > 50 ? 'Marqué' : v > 28 ? 'Modéré' : 'Faible';
  return <Row title={label} right={words} />;
}

function RingModal({ partnerId, onClose }: { partnerId: string; onClose: () => void }) {
  const { state, run } = useGame();
  const [amount, setAmount] = useState(0);
  if (!state) return null;
  const partner = state.npcs[partnerId];
  const p = state.player;

  return (
    <Modal
      open
      onClose={onClose}
      icon="💍"
      title="Choisir une bague"
      text={`Une bague coûteuse pèse dans la balance. ${partner ? partner.firstName : ''} y sera d’autant plus sensible que sa vision du couple est ambitieuse.`}
    >
      <AmountPicker value={amount} max={p.money} onChange={setAmount} step={100} />
      <div style={{ marginTop: 14 }}>
        <Button
          onClick={() => {
            run((ctx) => buyEngagementRing(ctx, amount), '💍');
            onClose();
          }}
          disabled={amount <= 0}
        >
          Acheter pour {money(state, amount)}
        </Button>
      </div>
    </Modal>
  );
}
