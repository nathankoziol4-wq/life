/**
 * Timeline de vie : toute l'histoire du personnage, regroupée par âge.
 *
 * La vue défile automatiquement vers le bas quand une nouvelle année est
 * jouée, mais laisse le joueur remonter librement toute son existence.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { TimelineEntry } from '../engine/types.ts';
import { useGame } from '../ui/GameContext.tsx';

export function LifeTimeline({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const { state, version } = useGame();
  const bottomRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    if (!state) return [];
    const byAge = new Map<number, TimelineEntry[]>();
    for (const entry of state.timeline) {
      const list = byAge.get(entry.age);
      if (list) list.push(entry);
      else byAge.set(entry.age, [entry]);
    }
    return Array.from(byAge.entries()).sort((a, b) => a[0] - b[0]);
  }, [state, version]);

  // Défilement automatique vers la dernière année jouée.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [version, scrollRef]);

  if (!state) return null;
  if (!groups.length) {
    return <div className="timeline-empty">Ton histoire commence ici.</div>;
  }

  return (
    <div className="timeline">
      {groups.map(([age, entries]) => (
        <div className="timeline-year" key={age}>
          <div className="timeline-age">
            {age === 0 ? 'Naissance' : `${age} ans`}
            <em>{state.player.birthYear + age}</em>
          </div>
          {entries.map((entry) => (
            <div className="timeline-entry" key={entry.id}>
              <span className={`timeline-dot dot-${entry.tone}`} aria-hidden="true" />
              <span className="timeline-text">{entry.text}</span>
            </div>
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
