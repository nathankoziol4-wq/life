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
  const [giftAmount, setGiftAmount] = useState(0);
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
            {person.salary > 0 && <Pill tone="accent">{money(state, person.salary)}/an</Pill>}
          </div>
        )}
      </Card>

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
          <Section title="Personnalité">
            <Card>
              <TraitRow label="Chaleur humaine" value={person.personality.warmth} />
              <TraitRow label="Loyauté" value={person.personality.loyalty} />
              <TraitRow label="Générosité" value={person.personality.generosity} />
              <TraitRow label="Caractère" value={person.personality.temper} inverted />
              <TraitRow label="Ambition" value={person.personality.ambition} />
            </Card>
          </Section>

          <Section title="Interactions">
            <Card>
              <Row emoji="💬" title="Discuter" sub="Entretenir le lien" onClick={() => act('talk')} chevron />
              <Row emoji="🕰️" title="Passer du temps ensemble" sub="Le plus efficace" onClick={() => act('time')} chevron />
              <Row emoji="🌟" title="Faire un compliment" onClick={() => act('compliment')} chevron />
              <Row
                emoji="🎁"
                title="Offrir un cadeau"
                sub="Plus il est cher, plus il touche"
                onClick={() => {
                  setGiftAmount(Math.min(p.money, 200));
                  setGiftOpen(true);
                }}
                disabled={p.money <= 0}
                chevron
              />
            </Card>
          </Section>

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
                  <Row emoji="⚖️" title="Divorcer" sub="Partage des biens, éventuelle pension" onClick={() => act('breakUp')} chevron />
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

      {person.history.length > 0 && (
        <Section title="Son histoire">
          <Card>
            {[...person.history].reverse().slice(0, 12).map((h, i) => (
              <Row key={`${h.year}-${i}`} emoji="•" title={h.text} right={String(h.year)} />
            ))}
          </Card>
        </Section>
      )}

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

function TraitRow({ label, value, inverted }: { label: string; value: number; inverted?: boolean }) {
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
