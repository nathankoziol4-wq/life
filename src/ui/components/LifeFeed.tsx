/**
 * Le journal de vie.
 *
 * C'est l'écran d'accueil, donc l'écran qu'on voit le plus, et c'était une
 * liste de puces grises : une pastille de couleur, une phrase, rien qui
 * distingue une naissance d'un relevé bancaire. Une vie ne se lit pas comme
 * un journal d'événements serveur.
 *
 * Trois choses le rendent lisible d'un coup d'œil :
 *
 * **L'année se voit.** Un grand repère, avec l'âge et le millésime, pour
 * qu'on retrouve ses vingt ans en faisant défiler sans lire.
 *
 * **La famille se voit.** Chaque catégorie du moteur — amour, argent, école,
 * santé, crime — a son icône et sa teinte, prises dans les jetons et nulle
 * part ailleurs. Subtil : une couleur par ligne, jamais un fond criard.
 *
 * **Ce qui compte se voit.** Ce qui a été très bon ou très mauvais est
 * marqué ; le reste reste calme. Une vie où tout crie n'a plus de relief.
 */

import { useEffect, useMemo, useState, type RefObject } from 'react';
import type { TimelineEntry, TimelineKind } from '../../engine/types.ts';
import { useGame } from '../GameContext.tsx';
import { isMilestone } from '../../engine/simulateYear.ts';
import { EmptyState, Text } from './primitives.tsx';

/** Ce que chaque famille d'événement porte comme signe. */
const KIND: Record<TimelineKind, { emoji: string; tone: string }> = {
  life: { emoji: '🌱', tone: 'primary' },
  money: { emoji: '💶', tone: 'argent' },
  love: { emoji: '💞', tone: 'amour' },
  school: { emoji: '🎓', tone: 'savoir' },
  work: { emoji: '💼', tone: 'carriere' },
  health: { emoji: '🩺', tone: 'sante' },
  crime: { emoji: '🕶️', tone: 'crime' },
  justice: { emoji: '⚖️', tone: 'crime' },
  family: { emoji: '👪', tone: 'amour' },
  asset: { emoji: '🏠', tone: 'argent' },
  random: { emoji: '🎲', tone: 'muted' },
  death: { emoji: '🕯️', tone: 'crime' },
  action: { emoji: '✦', tone: 'primary' },
};

/**
 * Combien d'années le journal déplie d'entrée, et par quel pas il remonte.
 *
 * **Mesuré :** à trente ans, le journal faisait **29 548 pixels, soit 36,9
 * écrans de téléphone** — et il grandissait d'une année à chaque tour, donc
 * près de cent écrans à quatre-vingts ans. C'est l'écran d'accueil, celui
 * qu'on voit le plus, et rien ne permettait d'y revenir à une année précise.
 *
 * Une vie ne se tronque pas : tout reste atteignable. Mais on arrive sur ce
 * qui vient de se passer, et on remonte à la demande — comme un fil de
 * discussion, dont c'est exactement la forme.
 */
const RECENT = 8;
const STEP = 12;

export function LifeFeed({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const { state, version } = useGame();
  const [shown, setShown] = useState(RECENT);

  const groups = useMemo(() => {
    if (!state) return [];
    const byAge = new Map<number, TimelineEntry[]>();
    for (const entry of state.timeline) {
      const list = byAge.get(entry.age);
      if (list) list.push(entry);
      else byAge.set(entry.age, [entry]);
    }
    return [...byAge.entries()].sort((a, b) => a[0] - b[0]);
    // `version` change à chaque année jouée : c'est lui qui rafraîchit.
  }, [state, version]);

  const hidden = Math.max(0, groups.length - shown);
  const visible = hidden > 0 ? groups.slice(hidden) : groups;

  /**
   * Remonter sans perdre sa place.
   *
   * Déplier douze années les insère **au-dessus** de ce qu'on lit : sans
   * précaution, le contenu descend d'un coup et l'œil se retrouve ailleurs.
   * On note de combien le contenu a grandi et on décale le défilement
   * d'autant, ce qui laisse la ligne regardée exactement où elle était.
   */
  const showMore = () => {
    const box = scrollRef.current;
    const before = box?.scrollHeight ?? 0;
    const at = box?.scrollTop ?? 0;
    setShown((n) => n + STEP);
    requestAnimationFrame(() => {
      if (!box) return;
      box.scrollTop = at + (box.scrollHeight - before);
    });
  };

  // On redescend sur l'année qui vient d'être jouée.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [version, scrollRef]);

  if (!state) return null;
  if (groups.length === 0) {
    return (
      <EmptyState
        emoji="🌱"
        title="Ton histoire commence ici"
        note="Prends une année pour voir ce qu’elle apporte."
      />
    );
  }

  return (
    <div className="feed timeline">
      {/*
        * Les années d'avant, à un appui. Le compte est dit — « les 22
        * premières années » — parce qu'un bouton qui ne dit pas ce qu'il
        * cache demande de faire confiance pour rien.
        */}
      {hidden > 0 && (
        <button className="feed-more" onClick={showMore} type="button">
          {hidden === 1
            ? 'Montrer la première année'
            : `Montrer les ${Math.min(hidden, STEP)} années précédentes`}
          <span className="feed-more-rest">
            {hidden > STEP ? `${hidden} avant celle-ci` : 'jusqu’à la naissance'}
          </span>
        </button>
      )}
      {visible.map(([age, entries]) => (
        <section className="feed-year timeline-year" key={age}>
          <header className="feed-mark timeline-age">
            <span className="feed-mark-age">
              {age === 0 ? 'Naissance' : `${age} ans`}
            </span>
            <em className="feed-mark-year">{state.player.birthYear + age}</em>
            <span className="feed-mark-line" aria-hidden="true" />
          </header>
          {entries.map((entry) => (
            <FeedEvent key={entry.id} entry={entry} />
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * Une ligne de vie.
 *
 * Garde les classes `timeline-entry` et `timeline-text` : le test de fumée
 * les lit pour vérifier que le journal s'écrit vraiment, et les changer sans
 * raison ferait passer une vérification qui ne vérifie plus rien.
 */
function FeedEvent({ entry }: { entry: TimelineEntry }) {
  const kind = KIND[entry.kind] ?? KIND.life;
  const strong = entry.tone !== 'neutral';
  /*
   * Un jalon se présente autrement.
   *
   * La règle n'est pas inventée ici : `isMilestone` est celle que le moteur
   * appliquait déjà pour composer « ce qu'on retiendra » au récapitulatif de
   * fin de vie. Elle était écrite en ligne dans `simulateYear`, donc le
   * journal ne pouvait pas s'en servir — et un diplôme, un mariage ou un décès
   * y avaient exactement l'allure d'un relevé bancaire.
   *
   * Les deux écrans s'accordent maintenant sur une seule définition : ce que
   * la fin de vie retiendra est ce que le journal met en avant sur le moment.
   */
  const milestone = isMilestone(entry);
  return (
    <article
      className={`feed-event timeline-entry feed-${kind.tone}${strong ? ` feed-${entry.tone}` : ''}${milestone ? ' feed-milestone' : ''}`}
    >
      <span className="feed-icon" aria-hidden="true">{kind.emoji}</span>
      <span className="feed-text timeline-text">{entry.text}</span>
      <span className={`timeline-dot dot-${entry.tone}`} aria-hidden="true" />
    </article>
  );
}

/** Le repère d'une année, réutilisable ailleurs (résumé, archives). */
export function YearMark({ age, year }: { age: number; year?: number }) {
  return (
    <div className="feed-mark">
      <Text role="section" tone="muted">{age === 0 ? 'Naissance' : `${age} ans`}</Text>
      {year !== undefined && <em className="feed-mark-year">{year}</em>}
      <span className="feed-mark-line" aria-hidden="true" />
    </div>
  );
}
