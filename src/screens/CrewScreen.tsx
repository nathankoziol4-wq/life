/**
 * Ceux qui travaillent pour toi.
 *
 * Trois lectures, et elles sont tout le système : ce que chacun **vaut**, ce
 * qu'on lui **verse** rapporté à ce qu'il demandait, et ce qu'il **en pense**.
 * Aucune n'existait — l'écran d'avant montrait un nombre et deux boutons.
 *
 * Une précaution de forme, apprise trois chantiers plus tôt : un `Row` fermé
 * affiche `because` **à la place** de `sub`. Les lectures qui comptent ne
 * vivent donc jamais dans un `sub`.
 */

import { useState } from 'react';
import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money } from '../ui/format.ts';
import type { Business, Hire } from '../engine/types.ts';
import { getBusinessKind } from '../data/ventures.ts';
import { wageOf } from '../systems/venture.ts';
import {
  crewMorale, crewOf, crewSkill, crewWorth, hireBlocker, letGo, moraleSays,
  offer, offerBlocker, openShortlist, paidShare, payroll, raise, raiseBlocker,
  raiseCost, skillOf, skillSays, worthOf,
} from '../systems/crew.ts';
import { person } from '../engine/context.ts';

export function CrewScreen({ business, onBack }: { business: Business; onBack: () => void }) {
  const { state, run } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  if (!state) return null;
  const kind = getBusinessKind(business.kindId);
  if (!kind) return null;
  const wage = wageOf(state, kind);
  const crew = crewOf(business);
  const list = business.shortlist ?? [];
  const worth = crewWorth(business);

  /* --- Quelqu'un en particulier --- */
  const shown = open ? crew.find((h) => h.personId === open) : null;
  const who = shown ? person(state, shown.personId) : null;
  if (shown && who) {
    const share = paidShare(shown);
    const why = raiseBlocker(state, business, shown);
    return (
      <Sheet title={who.firstName} onBack={() => setOpen(null)}>
        <Card pad>
          <div style={{ fontSize: 40, textAlign: 'center' }}>{avatarFor(who)}</div>
          <p style={{ margin: '10px 0 0', lineHeight: 1.55, textAlign: 'center' }}>
            {skillSays(skillOf(shown))}. {moraleSays(shown.morale)}
          </p>
          <div className="chips" style={{ marginTop: 12, justifyContent: 'center' }}>
            <Pill>{state.year - shown.since} an(s) ici</Pill>
            <Pill tone={share < 0.9 ? 'bad' : share > 1.05 ? 'good' : undefined}>
              {Math.round(share * 100)} % de ce qu’il demandait
            </Pill>
            <Pill tone="warn">{money(state, shown.wage)}/an</Pill>
          </div>
        </Card>

        <Section title="Où il en est">
          <Card pad>
            <Reading
              label="Ce qu’il vaut"
              says={`${Math.round(skillOf(shown))}/100${shown.learned > 0 ? ` · dont ${Math.round(shown.learned)} appris ici` : ''}`}
              value={skillOf(shown)}
            />
            <Reading label="Ce qu’il en pense" says={moraleSays(shown.morale)} value={shown.morale} />
            <div className="spread small" style={{ marginTop: 4 }}>
              <span className="muted">Ce qu’il pèse en production</span>
              <strong>{worthOf(shown).toFixed(2)} personne(s)</strong>
            </div>
          </Card>
        </Section>

        <Section title="Ce que tu peux faire">
          <Card>
            <Row
              emoji="📈"
              title="L’augmenter"
              sub={share < 1
                ? 'Combler l’écart change tout ; il s’en souvient dans l’autre sens aussi'
                : 'Il est déjà au-dessus de ce qu’il demandait — ça rendra peu'}
              right={<Pill tone="warn">{money(state, raiseCost(shown))}/an</Pill>}
              closed={Boolean(why)}
              because={why}
              onClick={() => run((ctx) => raise(ctx, business, shown.personId), '📈')}
              chevron={!why}
            />
            <Row
              emoji="🚪"
              title="Te séparer de lui"
              sub="Des indemnités, et les autres qui l’ont vu partir"
              right={<Pill tone="bad">{money(state, Math.round(shown.wage * 0.35))}</Pill>}
              onClick={() => {
                run((ctx) => letGo(ctx, business, shown.personId), '🚪');
                setOpen(null);
              }}
              chevron
            />
          </Card>
        </Section>
      </Sheet>
    );
  }

  /* --- Le sommaire --- */
  const blocked = hireBlocker(state, business);
  return (
    <Sheet title="L’équipe" onBack={onBack}>
      <Card pad>
        <div className="spread">
          <div>
            <strong style={{ fontSize: 17 }}>
              {crew.length > 0 ? `${crew.length} salarié(s)` : `${business.staff} salarié(s)`}
            </strong>
            <div className="small muted">
              {crew.length > 0
                ? `${worth.toFixed(1)} équivalent(s) · le local en absorbe ${kind.ceiling}`
                : 'Un effectif, sans personne derrière'}
            </div>
          </div>
          <strong style={{ fontSize: 17 }}>{money(state, payroll(business, wage))}</strong>
        </div>
        {crew.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Meter value={Math.min(100, (worth / Math.max(1, kind.ceiling)) * 100)} />
          </div>
        )}
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          Ce que quelqu’un vaut et ce qu’il demande vont ensemble. Deux très
          bons produisent plus que quatre têtes et coûtent moins — mais au-delà
          de ce que le local absorbe, on paie plein tarif un travail qui ne se
          vend pas.
        </p>
      </Card>

      {crew.length > 0 && (
        <Section title="Chez toi">
          <Card>
            {crew.map((hire) => {
              const one = person(state, hire.personId);
              const share = paidShare(hire);
              return (
                <Row
                  key={hire.personId}
                  emoji={one ? avatarFor(one) : '🧑'}
                  title={one ? `${one.firstName} ${one.lastName}` : 'Quelqu’un'}
                  sub={`${skillSays(skillOf(hire))} · ${moraleSays(hire.morale).toLowerCase()}`}
                  right={<Pill tone={share < 0.9 ? 'bad' : hire.morale < 34 ? 'warn' : 'good'}>
                    {money(state, hire.wage)}
                  </Pill>}
                  onClick={() => setOpen(hire.personId)}
                  chevron
                />
              );
            })}
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Compétence moyenne {Math.round(crewSkill(business) ?? 0)} · moral
            moyen {Math.round(crewMorale(business) ?? 0)}. Ceux qu’on paie mal
            finissent par s’en aller, et emportent ce qu’ils valaient.
          </p>
        </Section>
      )}

      <Section title="Recruter">
        <Card>
          <Row
            emoji="📣"
            title="Recevoir des candidats"
            sub="Trois personnes, ce qu’elles valent et ce qu’elles demandent"
            closed={Boolean(blocked)}
            because={blocked}
            onClick={() => run((ctx) => openShortlist(ctx, business, wage), '📣')}
            chevron={!blocked}
          />
        </Card>
      </Section>

      {list.length > 0 && (
        <Section title="Ceux qui se présentent">
          {list.map((cand) => (
            <Candidate key={cand.personId} business={business} hire={cand} />
          ))}
        </Section>
      )}

      {list.length === 0 && crew.length === 0 && business.staff === 0 && (
        <Empty>Tu es seul dans la maison.</Empty>
      )}
    </Sheet>
  );
}

/** Une lecture : ce qu'on en dit, et où ça en est. */
function Reading({ label, says, value }: { label: string; says: string; value: number }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="spread">
        <span className="small muted">{label}</span>
        <strong className="small">{says}</strong>
      </div>
      <div style={{ marginTop: 6 }}><Meter value={Math.max(0, Math.min(100, value))} /></div>
    </div>
  );
}

/**
 * Un candidat, et les deux salaires qu'on peut lui proposer.
 *
 * Proposer moins est possible et se paie : le moral part plus bas, et l'écart
 * se rappelle chaque année. C'est la seule négociation du système.
 */
function Candidate({ business, hire }: { business: Business; hire: Hire }) {
  const { state, run } = useGame();
  if (!state) return null;
  const who = person(state, hire.personId);
  if (!who) return null;
  const offers = [
    { label: 'Ce qu’il demande', wage: hire.asking, tone: 'good' as const },
    { label: 'Un peu moins', wage: Math.round(hire.asking * 0.85), tone: 'warn' as const },
    { label: 'Le minimum qu’il accepte', wage: Math.round(hire.asking * 0.7), tone: 'bad' as const },
  ];
  return (
    <Card>
      <Row
        emoji={avatarFor(who)}
        title={`${who.firstName} ${who.lastName}`}
        sub={`${skillSays(hire.competence)} · ${who.age} ans`}
        right={<Pill>{Math.round(hire.competence)}/100</Pill>}
      />
      {offers.map((o) => {
        const why = offerBlocker(state, business, hire, o.wage);
        return (
          <Row
            key={o.label}
            emoji="🤝"
            title={o.label}
            sub={o.wage < hire.asking ? 'Il accepte, et il s’en souviendra' : 'Il arrive de bonne humeur'}
            right={<Pill tone={o.tone}>{money(state, o.wage)}</Pill>}
            closed={Boolean(why)}
            because={why}
            onClick={() => run((ctx) => offer(ctx, business, hire.personId, o.wage), '🤝')}
            chevron={!why}
          />
        );
      })}
    </Card>
  );
}
