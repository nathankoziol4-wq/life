/**
 * Écran « Proches » : famille, couple, amis, collègues, et toutes les
 * interactions sociales disponibles avec chacun (§7, §8).
 */

import { useMemo, useState } from 'react';
import {
  AmountPicker, Button, Empty, Meter, Modal, Pill, Sheet,
} from '../components/Modal.tsx';
/*
 * Le vocabulaire de listes du système — et c'est le premier écran à s'en
 * servir entièrement, fiche détaillée comprise.
 *
 * La bascule s'est faite en une ligne d'import, puis le typeur a énuméré ce
 * qui restait : six lignes passaient `disabled`, l'attribut du navigateur,
 * qui retire la ligne de l'arbre d'accessibilité. Or les six mettaient déjà
 * la raison du refus dans leur sous-titre — « il peut refuser », « une fois
 * dans l'année », « il te reste trois choses à découvrir ». Elles disaient
 * pourquoi à un lecteur qui voit, et rien du tout à un lecteur qui écoute.
 */
import { Card, Row, Section } from '../ui/components/list.tsx';
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
import { buyEngagementRing } from '../systems/activities.ts';
import { ParenthoodScreen } from './ParenthoodScreen.tsx';
import { WeddingScreen } from './WeddingScreen.tsx';
import { WakeScreen } from './WakeScreen.tsx';
import { GivingScreen } from './GivingScreen.tsx';
import { summary as givingSummary } from '../systems/giving.ts';
import { planOf as weddingOf, summary as weddingSummary } from '../systems/wedding.ts';
import { summary as wakeSummary, wakeOf } from '../systems/wake.ts';
import {
  atSchoolAge, enrol, fitLine, optionsFor, schoolOf,
  summary as schoolSummary,
} from '../systems/schooling.ts';
import { summary as parenthoodSummary } from '../systems/parenthood.ts';
import { appBlocker } from '../systems/matching.ts';
import { MatchScreen } from './MatchScreen.tsx';
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
import { getAvailableActions, type AvailableAction } from '../systems/actions.ts';
import {
  askBestFriend, callFavour, careFor, confide, doFavour, entrust, getApproach, introduce,
  invite, lend, promise, reclaim, willTalk,
} from '../systems/socialActs.ts';
import type { Person } from '../engine/types.ts';

/** Les figures parentales, seules à qui l'on demande ce genre de chose. */
const isParent = (relation: Person['relation']) =>
  ['mother', 'father', 'stepmother', 'stepfather', 'grandmother', 'grandfather'].includes(relation);

/**
 * Les groupes de l'écran — et **toutes** les sortes de liens y sont.
 *
 * Ce que la version d'avant faisait : elle listait vingt liens sur
 * trente-quatre, et la liste des vivants était filtrée sur ces groupes-là. Les
 * quatorze autres étaient donc **construits par le moteur, vieillis, suivis,
 * et invisibles** — grands-parents, petits-enfants, oncles, tantes, cousins,
 * neveux, nièces, belle-famille, professeurs. Mesuré sur douze vies jouées
 * jusqu'au bout : **142 personnes vivantes cachées sur 505, soit 28 %.**
 *
 * Ce n'était pas un choix d'affichage : `RELATION_ORDER`, juste à côté dans
 * `engine/context.ts`, les classe toutes — quelqu'un les avait prévues. Il
 * manquait des lignes ici, et rien ne le disait, parce qu'un écran qui
 * n'affiche pas quelqu'un a exactement l'air d'un écran où il n'y a personne.
 *
 * Le garde-fou correspondant est dans `proches.test.ts` : toute sorte de lien
 * doit appartenir à un groupe et à un seul.
 */
const GROUPS: { title: string; kinds: Person['relation'][] }[] = [
  { title: 'Couple', kinds: ['spouse', 'partner', 'crush'] },
  { title: 'Enfants', kinds: ['son', 'daughter'] },
  { title: 'Petits-enfants', kinds: ['grandson', 'granddaughter'] },
  { title: 'Parents', kinds: ['mother', 'father', 'stepmother', 'stepfather', 'guardian'] },
  // Ceux dont on vient, quand ce n'est pas ceux qui vous ont élevé. Un groupe
  // à part : les confondre avec les parents serait dire le contraire de ce que
  // `systems/roots.ts` raconte.
  { title: 'D’où tu viens', kinds: ['birthMother', 'birthFather'] },
  { title: 'Grands-parents', kinds: ['grandmother', 'grandfather'] },
  // Ceux d'avant les grands-parents. Ils sont tous morts — c'est même à cela
  // qu'on les reconnaît — et ils étaient jusqu'ici effacés de la sauvegarde
  // faute d'une case où les ranger : le fondateur d'une lignée disparaissait à
  // la quatrième génération, en laissant son nom au registre et rien derrière.
  { title: 'Ceux d’avant', kinds: ['ancestor'] },
  { title: 'Fratrie', kinds: ['brother', 'sister'] },
  { title: 'Famille élargie', kinds: ['aunt', 'uncle', 'cousin', 'nephew', 'niece', 'inLaw'] },
  { title: 'Amis', kinds: ['bestFriend', 'friend'] },
  { title: 'Travail et études', kinds: ['boss', 'coworker', 'classmate', 'teacher'] },
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
  // L'application a un écran à elle : six profils, et deux messages par an.
  const [matching, setMatching] = useState(false);
  const [showDeceased, setShowDeceased] = useState(false);
  const [panel, setPanel] = useState<'parenthood' | 'wedding' | 'giving' | 'wake' | null>(null);

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

  if (panel === 'parenthood') return <ParenthoodScreen onBack={() => setPanel(null)} />;
  if (panel === 'wedding') return <WeddingScreen onBack={() => setPanel(null)} />;
  if (panel === 'wake') return <WakeScreen onBack={() => setPanel(null)} />;
  if (panel === 'giving') return <GivingScreen onBack={() => setPanel(null)} />;

  return (
    <>
      <Section
        title="Rencontrer du monde"
        sub="Ce qui dépend de toi, et pas de qui passe par là."
      >
        <Card>
          <Row
            emoji="💘"
            title="Application de rencontre"
            sub={partner ? 'Tu es déjà en couple…' : 'Six profils à lire, deux messages'}
            onClick={() => setMatching(true)}
            closed={Boolean(appBlocker(state))}
            because={appBlocker(state)}
            chevron={!appBlocker(state)}
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
                sub="Protège ton patrimoine en cas de divorce"
                onClick={() => run((ctx) => signPrenup(ctx), '📄')}
                closed={Boolean(p.flags.prenup)}
                because="Contrat signé."
                chevron
              />
            </>
          )}
          {partner && (
            <Row
              emoji="🍼"
              title="Essayer d’avoir un enfant"
              sub="Une tentative par an"
              onClick={() => run((ctx) => tryForBaby(ctx), '🍼')}
              closed={Boolean(p.flags.pregnant)}
              because="Un enfant est déjà en route."
              chevron
            />
          )}
          {/* Les deux lignes d'avant promettaient ce qu'elles ne faisaient
              pas — « augmente fortement les chances » pour un achat unique aux
              effets perpétuels, « procédure longue et sélective » pour un
              tirage instantané. Une seule ligne mène maintenant à l'écran qui
              les tient. */}
          {/* La noce n'apparaît qu'entre le oui et le jour même : c'est le
              seul moment où il y a quelque chose à décider. */}
          {/* Et ce qui ne se prépare pas : la ligne n'apparaît que l'année du
              décès, et disparaît quand la journée est passée — tenue ou non. */}
          {wakeOf(state) && (
            <Row
              emoji="🕯️"
              title="Les obsèques"
              sub={wakeSummary(state)}
              right={<Pill tone="warn">cette année</Pill>}
              onClick={() => setPanel('wake')}
              chevron
            />
          )}
          {weddingOf(state) && !weddingOf(state)!.done && (
            <Row
              emoji="💒"
              title="La noce"
              sub={weddingSummary(state)}
              right={<Pill tone="primary">à préparer</Pill>}
              onClick={() => setPanel('wedding')}
              chevron
            />
          )}
          {/*
            Donner n'a pas de condition : c'est un verbe, pas un système
            qu'on débloque. La ligne dit seulement ce qu'on a sous la main.
          */}
          <Row
            emoji="🎁"
            title="Donner quelque chose"
            sub={givingSummary(state)}
            onClick={() => setPanel('giving')}
            chevron
          />
          <Row
            emoji="🍼"
            title="Fonder une famille"
            sub={parenthoodSummary(state)}
            onClick={() => setPanel('parenthood')}
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
            <button className="pill" onClick={() => setShowDeceased((v) => !v)} type="button">
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

      {matching && <MatchScreen onBack={() => setMatching(false)} />}
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
              sub={`Il faudra avaler quelque chose, et ${
                person.sex === 'F' ? 'elle' : 'il'} peut refuser. ${
                Math.round(sorryOdds(state, person) * 100)} % de chances qu’${
                person.sex === 'F' ? 'elle' : 'il'} t’écoute.`}
              because={sorryBlocker(state, person)}
              closed={Boolean(sorryBlocker(state, person))}
              onClick={() => run((ctx) => apologise(ctx, person.id), '🙏')}
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
              sub={`Une heure, une fois dans l’année. ${visits(person) > 0
                ? `Tu y es déjà allé ${visits(person)} fois.`
                : 'Ça ne raccourcira rien.'}`}
              because={visitBlocker(state, person)}
              closed={Boolean(visitBlocker(state, person))}
              onClick={() => run((ctx) => visit(ctx, person.id), '🕰️')}
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

          {/* Ce qu'on peut faire avec cette personne vient du moteur, pas de
              cet écran. Mesuré avant : l'écran écrivait quatre lignes à la
              main pendant que `getAvailableActions` en connaissait dix — et
              le moteur lui-même n'en avait que dix pour une mère, dont huit
              identiques à six, seize et trente-cinq ans. Les deux ont été
              corrigés ; celui-ci ne décide plus de rien. */}
          <PersonActions person={person} />

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
                  sub={`Il te reste ${unknownTraits(person).length} chose(s) à découvrir`}
                  because={firstOpenPlace}
                  closed={Boolean(firstOpenPlace)}
                  onClick={() => setDating(true)}
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
                        sub={rearing.note}
                        because={why}
                        right={cost > 0 ? <Pill tone="warn">{money(state, cost)}</Pill> : undefined}
                        closed={Boolean(why)}
                        onClick={() => run((ctx) => rear(ctx, person.id, rearing.id), '👶')}
                        chevron={!why}
                      />
                    );
                  })}
                </Card>
              )}
              {/* Où on le met — voir `systems/schooling.ts`. Le catalogue
                  d'établissements existait déjà et servait à tirer l'école du
                  joueur ; ce qui manquait était de pouvoir en choisir une pour
                  son enfant, et d'en payer le prix. */}
              {atSchoolAge(person) && (
                <>
                  <p className="small muted" style={{ margin: '14px 4px 6px', lineHeight: 1.5 }}>
                    <strong>L’école : </strong>{schoolSummary(state, person)}
                  </p>
                  <Card>
                    {optionsFor(state, person).map((row) => (
                      <Row
                        key={row.demand.id}
                        emoji={row.school.emoji}
                        title={row.school.label}
                        sub={`${row.demand.line} ${fitLine(person, row.demand.id)}`}
                        right={row.cost > 0
                          ? <Pill tone="warn">{money(state, row.cost)}/an</Pill>
                          : <Pill>gratuit</Pill>}
                        badge={schoolOf(person) === row.demand.id
                          ? <Pill tone="primary">choisie</Pill>
                          : undefined}
                        closed={Boolean(row.why)}
                        because={row.why}
                        onClick={() => run((ctx) => enrol(ctx, person.id, row.demand.id), row.school.emoji)}
                        chevron={!row.why}
                      />
                    ))}
                  </Card>
                  <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
                    Le plus cher n’est pas le meilleur pour tout le monde : un
                    établissement exigeant sur un enfant qui ne suit pas donne
                    des résultats à moitié et du malheur en entier. Et changer
                    coûte — il y laisse ses camarades.
                  </p>
                </>
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

          {/* L'argent, l'amour et le conflit venaient d'ici, écrits à la
              main, en double de ce que le moteur propose déjà. Seule reste
              l'entrée du divorce : ce n'est pas une action immédiate mais une
              procédure, avec son avocat, sa posture et son aperçu. */}
          {person.relation === 'spouse' && (
            <Section title="La séparation">
              <Card>
                <Row
                  emoji="⚖️"
                  title="Divorcer"
                  sub={childrenAtStake(state).length > 0
                    ? `Le partage, et qui garde ${childrenAtStake(state).length > 1 ? 'les enfants' : 'l’enfant'}`
                    : 'Le partage des biens'}
                  onClick={() => setDivorceOpen(true)}
                  chevron
                />
              </Card>
            </Section>
          )}
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
                closed={p.money < counselCost(state, counsel)}
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

/* ------------------------------------------------------------------ */

/**
 * Ce qu'on peut faire avec quelqu'un, tel que le moteur le décide.
 *
 * Cet écran écrivait quatre lignes à la main — discuter, passer du temps,
 * complimenter, offrir — pendant que `getAvailableActions` en connaissait
 * dix, et que trois autres écrans s'en servaient déjà. Il n'écrit plus rien :
 * il affiche ce que le moteur propose, groupé, avec la raison de chaque
 * ligne fermée.
 *
 * Deux choses s'ajoutent ici et nulle part ailleurs : **la manière**, quand
 * l'action en accepte plusieurs, et **le montant**, quand elle en demande un.
 * C'est de là que vient le volume — une action, une personne, une manière,
 * un contexte — plutôt que d'un fichier de cinq mille boutons.
 */
function PersonActions({ person }: { person: Person }) {
  const { state, run } = useGame();
  const [open, setOpen] = useState<AvailableAction | null>(null);
  const [tone, setTone] = useState<string>('calme');
  const [sum, setSum] = useState(0);
  if (!state) return null;
  // Le moteur propose « Divorcer » comme une action immédiate, ce qu'elle
  // n'est pas : ici elle a sa procédure, avec avocat, posture et aperçu. On
  // retire la ligne courte pour ne pas offrir deux chemins dont l'un décide
  // beaucoup moins.
  const actions = getAvailableActions(state, person, 'général')
    .filter((a) => !(a.id === 'breakUp' && person.relation === 'spouse'));
  const emoji = avatarFor(person);

  const perform = (id: string, choice: { approachId?: string; amount?: number } = {}) => {
    const pid = person.id;
    switch (id) {
      case 'talk': case 'time': case 'compliment': case 'argue': case 'insult':
      case 'cutTies': case 'reconnect': case 'kiss': case 'askOut': case 'propose':
      case 'breakUp': case 'advice':
        return run((ctx) => interact(ctx, pid, id as Parameters<typeof interact>[2]), emoji);
      case 'gift':
        return run((ctx) => interact(ctx, pid, 'gift', choice.amount ?? 0), emoji);
      case 'giveMoney': return run((ctx) => giveMoney(ctx, pid, choice.amount ?? 0), emoji);
      case 'askMoney': return run((ctx) => askForMoney(ctx, pid), emoji);
      case 'invite': return run((ctx) => invite(ctx, pid), '🍽️');
      case 'confide': return run((ctx) => confide(ctx, pid, choice.approachId), '🫂');
      case 'introduce': return run((ctx) => introduce(ctx, pid), '👋');
      case 'careFor': return run((ctx) => careFor(ctx, pid), '🏥');
      case 'entrust': return run((ctx) => entrust(ctx, pid), '🧸');
      case 'willTalk': return run((ctx) => willTalk(ctx, pid, choice.approachId), '📜');
      case 'lend': return run((ctx) => lend(ctx, pid, choice.amount ?? 0), '🤲');
      case 'reclaim': return run((ctx) => reclaim(ctx, pid, choice.approachId), '📬');
      case 'doFavour': return run((ctx) => doFavour(ctx, pid), '🧰');
      case 'callFavour': return run((ctx) => callFavour(ctx, pid), '🎟️');
      case 'promise': return run((ctx) => promise(ctx, pid), '🤞');
      // Elle appelait `interact(…, 'compliment')` : on demandait à quelqu'un
      // d'être son meilleur ami, et le jeu lui faisait un compliment.
      case 'askBestFriend': return run((ctx) => askBestFriend(ctx, pid), emoji);
      default: return undefined;
    }
  };

  const start = (action: AvailableAction) => {
    if (action.approaches || action.amount) {
      setTone(action.approaches?.[0] ?? 'calme');
      setSum(action.amount ? Math.min(state.player.money, 200) : 0);
      setOpen(action);
      return;
    }
    perform(action.id);
  };

  const groups: { key: AvailableAction['group']; title: string }[] = [
    { key: 'lien', title: 'Entretenir le lien' },
    { key: 'famille', title: 'Ce qui compte vraiment' },
    { key: 'amour', title: 'Vie sentimentale' },
    { key: 'argent', title: 'Argent' },
    { key: 'conflit', title: 'Conflit' },
  ];

  return (
    <>
      {groups.map((g) => {
        const rows = actions.filter((a) => a.group === g.key);
        if (rows.length === 0) return null;
        return (
          <Section key={g.key} title={g.title}>
            <Card>
              {rows.map((a) => (
                <Row
                  key={a.id}
                  emoji={a.emoji}
                  title={a.label}
                  sub={a.hint}
                  because={a.blocked}
                  closed={Boolean(a.blocked)}
                  onClick={() => start(a)}
                  chevron={!a.blocked}
                />
              ))}
            </Card>
          </Section>
        );
      })}

      {/* La manière, et le montant. Deux écrans de plus, et des centaines de
          situations : la même demande n'est pas la même chose selon le ton,
          et le ton ne vaut pas la même chose selon à qui l'on parle. */}
      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        icon={open?.emoji}
        title={open?.label}
        text={open?.hint}
      >
        {open?.approaches && (
          <Card>
            {open.approaches.map((id) => {
              const approach = getApproach(id);
              if (!approach) return null;
              return (
                <Row
                  key={id}
                  emoji={tone === id ? '🔵' : '⚪'}
                  title={approach.label}
                  sub={approach.note}
                  onClick={() => setTone(id)}
                />
              );
            })}
          </Card>
        )}
        {open?.amount && (
          <Card pad>
            <div className="spread">
              <span className="small muted">Montant</span>
              <span className="row-title">{money(state, sum)}</span>
            </div>
            <AmountPicker value={sum} max={state.player.money} onChange={setSum} step={50} />
          </Card>
        )}
        <div className="btn-row" style={{ marginTop: 12 }}>
          <Button
            onClick={() => {
              const action = open;
              setOpen(null);
              if (action) perform(action.id, { approachId: tone, amount: sum });
            }}
          >
            {open?.label}
          </Button>
        </div>
      </Modal>
    </>
  );
}
