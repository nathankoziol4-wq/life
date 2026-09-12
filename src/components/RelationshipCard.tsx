/**
 * Une personne, en une ligne.
 *
 * C'est la ligne la plus vue du jeu : l'écran « Gens » n'est fait que de
 * celles-là. Elle était écrite à la main — `<button className="row">`, quatre
 * `<span>` imbriqués, une jauge posée au milieu, une marge de trois pixels
 * réglée à l'œil — parce que le vocabulaire de listes n'avait pas de place
 * pour une jauge. Il en a une maintenant, et cette ligne n'écrit plus une
 * seule balise de mise en page.
 *
 * Une correction en passant : un défunt portait la classe `disabled`, donc
 * l'aspect d'une ligne hors d'atteinte, tout en restant parfaitement
 * cliquable — et il faut qu'il le reste, c'est là que vivent son histoire et
 * le souvenir qu'on lui garde. L'aspect disait le contraire du comportement.
 * Un défunt est une ligne d'un autre genre, pas une ligne fermée.
 */

import { Badge, type Tone } from '../ui/components/primitives.tsx';
import { Row } from '../ui/components/list.tsx';
import { RELATION_LABELS } from '../engine/context.ts';
import { avatarFor, relationQuality } from '../ui/format.ts';
import type { Person } from '../engine/types.ts';

/** La même échelle que `meterColor`, dite en rôles plutôt qu'en couleurs. */
function relationTone(value: number): Tone {
  if (value >= 70) return 'good';
  if (value >= 45) return 'primary';
  if (value >= 25) return 'warn';
  return 'bad';
}

export function RelationshipCard({
  person, onClick,
}: {
  person: Person;
  onClick: () => void;
}) {
  const dead = !person.alive;
  const job = person.jobTitle ? ` · ${person.jobTitle}` : '';

  if (dead) {
    return (
      <Row
        emoji="🕯️"
        title={`${person.firstName} ${person.lastName}`}
        sub={`${person.birthYear}–${person.deathYear} · ${person.deathCause}`}
        onClick={onClick}
        chevron
      />
    );
  }

  return (
    <Row
      emoji={avatarFor(person)}
      title={`${person.firstName} ${person.lastName}`}
      sub={`${RELATION_LABELS[person.relation]} · ${person.age} ans${job}`
        + ` · ${relationQuality(person.relationship)}`
        + (person.estranged ? ' · ponts coupés' : '')}
      meter={person.relationship}
      meterTone={relationTone(person.relationship)}
      badge={
        person.relation === 'spouse' ? <Badge tone="primary">Marié</Badge>
          : person.relation === 'partner' ? <Badge tone="amour">En couple</Badge>
            : undefined
      }
      onClick={onClick}
      chevron
    />
  );
}
