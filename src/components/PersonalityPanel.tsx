/**
 * Fiche de caractère, partagée par la création et le profil.
 *
 * Elle montre la personnalité en couches, de la plus stable à la plus
 * mouvante, et rappelle à chaque fois le double tranchant : aucun trait n'est
 * bon ou mauvais en soi.
 */

import { Card, Gauge, Pill, Row, Section, Slider } from './Modal.tsx';
import type { Psyche } from '../engine/psyche.ts';
import { AXIS_INFO, AXIS_KEYS, TEMPERAMENT_KEYS, VALUE_KEYS, VALUE_LABELS } from '../engine/psyche.ts';
import { INTEREST_MAP } from '../data/interests.ts';
import { HABIT_MAP } from '../data/habits.ts';
import { FEAR_MAP } from '../data/fears.ts';
import { AMBITION_MAP } from '../data/ambitions.ts';

const TEMPERAMENT_LABELS: Record<(typeof TEMPERAMENT_KEYS)[number], string> = {
  energy: 'Énergie',
  sensitivity: 'Sensibilité',
  sociability: 'Sociabilité',
  calm: 'Calme',
  adaptability: 'Adaptabilité',
  curiosity: 'Curiosité',
  persistence: 'Persévérance',
  stimulationNeed: 'Besoin de nouveauté',
  caution: 'Prudence',
  emotionalReactivity: 'Réactivité émotionnelle',
  attentionNeed: 'Besoin d’attention',
  frustrationTolerance: 'Tolérance à la frustration',
};

export const TEMPERAMENT_TEXT = TEMPERAMENT_LABELS;

/**
 * Lecture d'un axe de tempérament.
 *
 * Aucun des deux bouts n'est le « bon » : chaque extrémité donne quelque
 * chose et retire quelque chose. C'est ce que le joueur doit lire avant de
 * bouger un curseur, et c'est ce que la simulation applique réellement.
 */
const TEMPERAMENT_ENDS: Record<
  (typeof TEMPERAMENT_KEYS)[number],
  { high: [string, string]; low: [string, string] }
> = {
  energy: {
    high: ['Infatigable', 'Tient le rythme, récupère vite — mais supporte mal de rester en place.'],
    low: ['Économe', 'Se fatigue vite et fait moins de choses — mais se disperse rarement.'],
  },
  sensitivity: {
    high: ['À vif', 'Comprend les autres avant qu’ils parlent — et encaisse chaque coup deux fois.'],
    low: ['Peau dure', 'Rien ne l’atteint durablement — il ne voit pas non plus ce qu’il fait aux autres.'],
  },
  sociability: {
    high: ['Va vers les autres', 'Se fait des liens partout — et se sent mal quand il est seul.'],
    low: ['Se suffit', 'Tient sans personne — et se retrouve sans personne le jour où il en aurait besoin.'],
  },
  calm: {
    high: ['Placide', 'Garde la tête froide dans la tempête — et démarre difficilement.'],
    low: ['Sous tension', 'Réagit vite, se met en mouvement — et s’use.'],
  },
  adaptability: {
    high: ['Souple', 'Un déménagement, un divorce, un changement d’école ne le cassent pas — mais il s’attache moins.'],
    low: ['Ancré', 'Fidèle à ses repères — chaque bouleversement laisse une trace durable.'],
  },
  curiosity: {
    high: ['Fouilleur', 'Attrape des goûts partout, apprend seul — et disperse ses efforts.'],
    low: ['Sur ses rails', 'Ne se laisse pas distraire — passe à côté de ce qu’il n’a pas cherché.'],
  },
  persistence: {
    high: ['Tenace', 'Finit ce qu’il commence, progresse en profondeur — et s’acharne sur ce qui ne marche pas.'],
    low: ['Volatil', 'Change vite quand ça coince — et n’atteint jamais le niveau qui demande des années.'],
  },
  stimulationNeed: {
    high: ['Besoin d’intensité', 'Ose, provoque les occasions — et s’ennuie dans une vie stable.'],
    low: ['Se contente', 'Supporte la routine — et ne provoque rien.'],
  },
  caution: {
    high: ['Prudent', 'Évite les catastrophes — et laisse passer ce qui demandait d’oser.'],
    low: ['Fonceur', 'Saisit ce qui passe — et se casse la figure plus souvent.'],
  },
  emotionalReactivity: {
    high: ['Explosif', 'Sincère, expressif, jamais tiède — et ingérable les mauvais jours.'],
    low: ['Lisse', 'Difficile à déstabiliser — et difficile à lire, donc à aimer.'],
  },
  attentionNeed: {
    high: ['Veut exister aux yeux des autres', 'Se démène pour être vu, vise haut — et souffre d’être ignoré.'],
    low: ['Indifférent au regard', 'Ne joue pas de rôle — et ne se fait jamais remarquer, même quand il le faudrait.'],
  },
  frustrationTolerance: {
    high: ['Encaisse', 'Attend, recommence, ne claque pas la porte — et laisse durer ce qui devrait cesser.'],
    low: ['À bout vite', 'Ne laisse rien traîner — et casse ce qui aurait pu tenir.'],
  },
};

/** Une lecture courte de la valeur, sans jamais afficher de pourcentage. */
export function temperamentReading(
  key: (typeof TEMPERAMENT_KEYS)[number],
  value: number,
): { word: string; note: string } {
  const ends = TEMPERAMENT_ENDS[key];
  if (value >= 68) return { word: ends.high[0], note: ends.high[1] };
  if (value <= 32) return { word: ends.low[0], note: ends.low[1] };
  return {
    word: 'Dans la moyenne',
    note: 'Ni un atout ni un handicap : ce sont les circonstances qui trancheront.',
  };
}

/**
 * Réglage du tempérament à la création (§59).
 *
 * Douze curseurs, aucun bon réglage. Le texte sous chaque curseur nomme le
 * revers, jamais un gain chiffré.
 */
export function TemperamentEditor({
  value, onChange,
}: {
  value: Record<(typeof TEMPERAMENT_KEYS)[number], number>;
  onChange: (key: (typeof TEMPERAMENT_KEYS)[number], next: number) => void;
}) {
  return (
    <Card>
      {TEMPERAMENT_KEYS.map((key) => {
        const reading = temperamentReading(key, value[key]);
        return (
          <Slider
            key={key}
            label={TEMPERAMENT_LABELS[key]}
            value={value[key]}
            onChange={(next) => onChange(key, next)}
            reading={reading.word}
            note={reading.note}
          />
        );
      })}
    </Card>
  );
}

/** Les axes les plus marqués, dans un sens comme dans l'autre. */
export function strongestAxes(psyche: Psyche, count = 6) {
  return [...AXIS_KEYS]
    .map((key) => ({ key, value: psyche.axes[key] }))
    .sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50))
    .slice(0, count);
}

export function TemperamentCard({ psyche }: { psyche: Psyche }) {
  return (
    <Section title="Tempérament">
      <Card>
        {TEMPERAMENT_KEYS.map((key) => (
          <Row
            key={key}
            title={TEMPERAMENT_LABELS[key]}
            right={<Gauge value={psyche.temperament[key]} />}
          />
        ))}
      </Card>
      <p className="small muted" style={{ margin: '8px 4px 0' }}>
        Le tempérament est présent dès la naissance et ne change jamais. Il ne
        décide pas de ce que la personne deviendra : il décide par où
        l’expérience va passer.
      </p>
    </Section>
  );
}

/**
 * Ce qu'un axe donne et ce qu'il coûte, à sa valeur actuelle.
 *
 * `boon` et `cost` décrivent tous deux l'axe *haut* : un axe bas ne coûte
 * donc pas `cost`, il prive de `boon`. Le dire correctement est ce qui rend
 * la fiche honnête au lieu de flatteuse.
 */
export function axisReading(key: keyof typeof AXIS_INFO, value: number): string {
  const { boon, cost } = AXIS_INFO[key];
  if (value >= 62) return `${boon} — mais ${cost}`;
  if (value <= 38) return `ni ${boon}, ni ${cost}`;
  return `${boon}, sans excès`;
}

export function AxesCard({ psyche, all = false }: { psyche: Psyche; all?: boolean }) {
  const shown = all
    ? AXIS_KEYS.map((key) => ({ key, value: psyche.axes[key] }))
    : strongestAxes(psyche, 8);
  return (
    <Section title={all ? 'Tous les axes' : 'Ce qui le caractérise'}>
      <Card>
        {shown.map(({ key, value }) => (
          <Row
            key={key}
            title={AXIS_INFO[key].label}
            sub={axisReading(key, value)}
            right={<Gauge value={value} />}
          />
        ))}
      </Card>
      {!all && (
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Aucun de ces traits n’est un bonus : chacun ouvre une porte et en
          ferme une autre. L’ambition fait avancer et empêche d’être content,
          la prudence protège et fait rater.
        </p>
      )}
    </Section>
  );
}

export function ValuesCard({ psyche }: { psyche: Psyche }) {
  const sorted = [...VALUE_KEYS]
    .map((key) => ({ key, value: psyche.values[key] }))
    .sort((a, b) => b.value - a.value);
  return (
    <Section title="Ce à quoi il tient">
      <Card>
        {sorted.slice(0, 8).map(({ key, value }) => (
          <Row key={key} title={VALUE_LABELS[key]} right={<Gauge value={value} />} />
        ))}
      </Card>
      <p className="small muted" style={{ margin: '8px 4px 0' }}>
        Les valeurs décident de ce qui rend heureux. La même vie ne comble pas
        quelqu’un qui vise la carrière et quelqu’un qui vise la famille.
      </p>
    </Section>
  );
}

export function SelfCard({ psyche }: { psyche: Psyche }) {
  const gap = psyche.axes.confidence - psyche.self.selfEsteem;
  return (
    <Section title="Rapport à soi">
      <Card>
        <Row emoji="🪞" title="Estime de soi" right={<Gauge value={psyche.self.selfEsteem} />} />
        <Row emoji="💪" title="Assurance affichée" right={<Gauge value={psyche.axes.confidence} />} />
        <Row emoji="🧭" title="Sentiment de maîtrise" right={<Gauge value={psyche.self.senseOfControl} />} />
        <Row emoji="🫧" title="Image de son corps" right={<Gauge value={psyche.self.bodyImage} />} />
        <Row emoji="🎭" title="Authenticité" right={<Gauge value={psyche.self.authenticity} />} />
      </Card>
      {Math.abs(gap) > 18 && (
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          {gap > 0
            ? 'Il paraît plus sûr de lui qu’il ne l’est. La façade tient, mais elle coûte.'
            : 'Il s’estime plus qu’il ne le montre : il ne prend jamais la place qui lui revient.'}
        </p>
      )}
    </Section>
  );
}

export function InterestsCard({ psyche }: { psyche: Psyche }) {
  const sorted = [...psyche.interests].sort((a, b) => b.level - a.level);
  if (sorted.length === 0) return null;
  return (
    <Section title="Ce qui le passionne">
      <Card>
        {sorted.slice(0, 8).map((interest) => {
          const def = INTEREST_MAP[interest.id];
          return (
            <Row
              key={interest.id}
              emoji={def?.emoji ?? '✨'}
              title={def?.label ?? interest.id}
              sub={interest.skill > 30
                ? `${interest.years} an${interest.years > 1 ? 's' : ''} de pratique · niveau ${Math.round(interest.skill)}`
                : `est venu par : ${interest.origin}`}
              right={<Gauge value={interest.level} />}
            />
          );
        })}
      </Card>
    </Section>
  );
}

export function HabitsCard({ psyche }: { psyche: Psyche }) {
  if (psyche.habits.length === 0) return null;
  return (
    <Section title="Ses habitudes">
      <Card>
        {psyche.habits.map((habit) => {
          const def = HABIT_MAP[habit.id];
          const perWeek = habit.frequency / 52;
          return (
            <Row
              key={habit.id}
              emoji={def?.emoji ?? '🔁'}
              title={def?.label ?? habit.id}
              sub={perWeek >= 1
                ? `${perWeek.toFixed(1)} fois par semaine · depuis ses ${habit.since} ans`
                : `${Math.round(habit.frequency)} fois par an · depuis ses ${habit.since} ans`}
              right={habit.stickiness > 70 ? <Pill tone="warn">ancrée</Pill> : undefined}
            />
          );
        })}
      </Card>
    </Section>
  );
}

export function FearsCard({ psyche }: { psyche: Psyche }) {
  if (psyche.fears.length === 0) return null;
  return (
    <Section title="Ce qui lui fait peur">
      <Card>
        {psyche.fears.map((fear) => {
          const def = FEAR_MAP[fear.id];
          return (
            <Row
              key={fear.id}
              emoji={def?.emoji ?? '😨'}
              title={def?.label ?? fear.id}
              sub={fear.origin}
              right={<Gauge value={fear.intensity} />}
            />
          );
        })}
      </Card>
      <p className="small muted" style={{ margin: '8px 4px 0' }}>
        Une peur n’interdit rien : elle rend certaines choses plus difficiles à
        tenter, et d’autres plus urgentes.
      </p>
    </Section>
  );
}

export function AmbitionsCard({ psyche }: { psyche: Psyche }) {
  if (psyche.ambitions.length === 0) return null;
  return (
    <Section title="Ce qu’il veut">
      <Card>
        {[...psyche.ambitions].sort((a, b) => b.weight - a.weight).map((ambition) => {
          const def = AMBITION_MAP[ambition.id];
          return (
            <Row
              key={ambition.id}
              emoji={def?.emoji ?? '🎯'}
              title={def?.label ?? ambition.id}
              sub={ambition.fulfilled ? 'accompli' : ambition.origin}
              right={ambition.fulfilled
                ? <Pill tone="good">Atteint</Pill>
                : <Gauge value={ambition.weight} />}
            />
          );
        })}
      </Card>
    </Section>
  );
}

export function MemoriesCard({ psyche }: { psyche: Psyche }) {
  const sorted = [...psyche.memories].sort((a, b) => b.weight - a.weight).slice(0, 10);
  if (sorted.length === 0) return null;
  const emoji: Record<string, string> = {
    joie: '☀️', tristesse: '🌧️', colère: '⚡', peur: '😨', honte: '🙈',
    fierté: '🏅', soulagement: '😮‍💨', nostalgie: '🕰️', amertume: '🥀',
  };
  return (
    <Section title="Ce dont il se souvient">
      <Card>
        {sorted.map((memory) => (
          <Row
            key={memory.id}
            emoji={emoji[memory.emotion] ?? '💭'}
            title={memory.text}
            sub={`À ${memory.age} ans${memory.recalled > 0 ? ` · y repense encore` : ''}`}
            right={<Gauge value={memory.weight} />}
          />
        ))}
      </Card>
    </Section>
  );
}

export function StylesCard({ psyche }: { psyche: Psyche }) {
  return (
    <Section title="Sa manière d’être">
      <Card>
        <Row emoji="🗣️" title="Franchise" right={<Gauge value={psyche.communication.directness} />} />
        <Row emoji="🤗" title="Chaleur" right={<Gauge value={psyche.communication.warmth} />} />
        <Row emoji="📣" title="Affirmation" right={<Gauge value={psyche.communication.assertiveness} />} />
        <Row emoji="😏" title="Ironie" right={<Gauge value={psyche.communication.sarcasm} />} />
        <Row emoji="🧊" title="Sang-froid" right={<Gauge value={psyche.communication.composure} />} />
        <Row emoji="🤝" title="Aborder un inconnu" right={<Gauge value={psyche.social.approachEase} />} />
        <Row emoji="👁️" title="Peur du jugement" right={<Gauge value={psyche.social.fearOfJudgement} />} />
        <Row emoji="🌙" title="Besoin de solitude" right={<Gauge value={psyche.social.solitudeNeed} />} />
      </Card>
    </Section>
  );
}

export function DecisionCard({ psyche }: { psyche: Psyche }) {
  return (
    <Section title="Comment il décide">
      <Card>
        <Row emoji="🧮" title="Raisonnement" right={<Gauge value={psyche.decision.rationality} />} />
        <Row emoji="⚡" title="Impulsivité" right={<Gauge value={psyche.decision.impulsivity} />} />
        <Row emoji="🔮" title="Intuition" right={<Gauge value={psyche.decision.intuition} />} />
        <Row emoji="🎲" title="Prise de risque" right={<Gauge value={psyche.decision.riskTaking} />} />
        <Row emoji="👥" title="Besoin de l’avis des autres" right={<Gauge value={psyche.decision.dependence} />} />
        <Row emoji="✅" title="Confiance dans ses choix" right={<Gauge value={psyche.decision.selfTrust} />} />
      </Card>
    </Section>
  );
}

export function EmotionCard({ psyche }: { psyche: Psyche }) {
  return (
    <Section title="Comment il encaisse">
      <Card>
        <Row emoji="⚖️" title="Stabilité" right={<Gauge value={psyche.emotion.stability} />} />
        <Row emoji="🌡️" title="Maîtrise de la colère" right={<Gauge value={psyche.emotion.angerControl} />} />
        <Row emoji="🧘" title="Gestion du stress" right={<Gauge value={psyche.emotion.stressManagement} />} />
        <Row emoji="🕊️" title="Capacité à pardonner" right={<Gauge value={psyche.emotion.forgiveness} />} />
        <Row emoji="🪨" title="Rancune" right={<Gauge value={psyche.emotion.grudge} />} />
        <Row emoji="🌱" title="Rebond après un échec" right={<Gauge value={psyche.emotion.resilience} />} />
      </Card>
    </Section>
  );
}
