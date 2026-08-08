/** Ligne de PNJ avec sa barre de relation. */

import { Meter, Pill, meterColor } from './Modal.tsx';
import { RELATION_LABELS } from '../engine/context.ts';
import { avatarFor, relationQuality } from '../ui/format.ts';
import type { Person } from '../engine/types.ts';

export function RelationshipCard({
  person, onClick,
}: {
  person: Person;
  onClick: () => void;
}) {
  const dead = !person.alive;
  return (
    <button className={`row${dead ? ' disabled' : ''}`} onClick={onClick} type="button">
      <span className="row-emoji">{dead ? '🕯️' : avatarFor(person)}</span>
      <span className="row-main">
        <span className="row-title">
          {person.firstName} {person.lastName}
        </span>
        <span className="row-sub">
          {RELATION_LABELS[person.relation]} · {person.age} ans
          {person.jobTitle ? ` · ${person.jobTitle}` : ''}
        </span>
        {!dead && (
          <>
            <Meter value={person.relationship} tone={meterColor(person.relationship)} />
            <span className="row-sub" style={{ marginTop: 3 }}>
              {relationQuality(person.relationship)}
              {person.estranged ? ' · ponts coupés' : ''}
            </span>
          </>
        )}
        {dead && (
          <span className="row-sub">
            {person.birthYear}–{person.deathYear} · {person.deathCause}
          </span>
        )}
      </span>
      {!dead && person.relation === 'spouse' && <Pill tone="primary">Marié</Pill>}
      {!dead && person.relation === 'partner' && <Pill tone="accent">En couple</Pill>}
      <span className="row-chevron">›</span>
    </button>
  );
}
