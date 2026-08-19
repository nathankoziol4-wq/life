/**
 * L'en-tête permanent : qui l'on est, où l'on en est.
 *
 * L'ancien en-tête tenait sur une ligne serrée — avatar, nom, âge, argent,
 * bouton — puis quatre jauges toutes de la même couleur. On y lisait des
 * chiffres, pas une situation.
 *
 * Celui-ci répond d'abord à trois questions, dans cet ordre : **qui**, **où
 * j'en suis**, **combien j'ai**. Les états qui changent la partie — étudiant,
 * marié, recherché, détenu, célèbre — s'affichent en pastilles, parce qu'un
 * joueur qui ouvre le jeu après trois jours doit comprendre sa situation sans
 * ouvrir un écran.
 *
 * Les quatre jauges principales restent, mais chacune a sa teinte : on repère
 * la santé qui tombe sans lire l'intitulé.
 */

import type { GameState } from '../../engine/types.ts';
import { useGame } from '../GameContext.tsx';
import { avatarFor, money, situationOf } from '../format.ts';
import { Badge, Inline, StatBar, Text, type Tone } from './primitives.tsx';

/** Les quatre statistiques qu'on garde sous les yeux, et leur teinte. */
const MAIN: { key: 'happiness' | 'health' | 'intelligence' | 'looks'; label: string; tone: Tone }[] = [
  { key: 'happiness', label: 'Bonheur', tone: 'gloire' },
  { key: 'health', label: 'Santé', tone: 'sante' },
  { key: 'intelligence', label: 'Esprit', tone: 'savoir' },
  { key: 'looks', label: 'Allure', tone: 'amour' },
];

/**
 * Ce que le personnage est, en un mot chacun.
 *
 * Seulement ce qui change la façon de jouer : inutile d'annoncer « vivant ».
 */
function statesOf(state: GameState): { label: string; tone: Tone }[] {
  const p = state.player;
  const out: { label: string; tone: Tone }[] = [];
  if (p.prison) out.push({ label: 'Détenu', tone: 'crime' });
  if (p.criminalRecord?.wanted) out.push({ label: 'Recherché', tone: 'bad' });
  const spouse = Object.values(state.npcs).some((n) => n.alive && n.relation === 'spouse');
  const partner = Object.values(state.npcs).some((n) => n.alive && n.relation === 'partner');
  if (spouse) out.push({ label: 'Marié', tone: 'amour' });
  else if (partner) out.push({ label: 'En couple', tone: 'amour' });
  if (p.retired) out.push({ label: 'Retraité', tone: 'muted' });
  if (p.stats.reputation >= 78) out.push({ label: 'Connu', tone: 'gloire' });
  return out.slice(0, 3);
}

export function AppHeader({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const p = state.player;
  const states = statesOf(state);

  return (
    <header className="header app-header">
      <button
        className="app-header-id"
        onClick={onOpenProfile}
        type="button"
        aria-label="Profil complet"
      >
        <span className="app-avatar" aria-hidden="true">{avatarFor(p)}</span>
        <span className="app-header-who">
          <Text role="heading" as="div" className="header-name">
            {p.firstName} {p.lastName}
          </Text>
          {/* `header-sub` et `header-money-value` sont lus par le test de
              fumée pour vérifier que l'âge, la situation et l'argent sont
              réellement affichés. Ce sont des points d'ancrage, pas de la
              mise en forme : les renommer sans raison ferait passer une
              vérification qui ne vérifie plus rien. */}
          <Text role="sub" tone="muted" as="div" className="header-sub">
            {p.age} ans · {situationOf(state)}
          </Text>
        </span>
        <span className="app-header-money">
          <Text role="heading" numeric as="div" className="header-money-value">
            {money(state, p.money)}
          </Text>
          <Text role="caption" tone="muted" as="div">Disponible</Text>
        </span>
      </button>

      {states.length > 0 && (
        <Inline gap={1} wrap className="app-header-states">
          {states.map((s) => (
            <Badge key={s.label} tone={s.tone}>{s.label}</Badge>
          ))}
        </Inline>
      )}

      <div className="app-header-stats stats-bar">
        {MAIN.map((stat) => (
          <StatBar
            key={stat.key}
            label={stat.label}
            value={p.stats[stat.key]}
            tone={stat.tone}
          />
        ))}
      </div>
    </header>
  );
}
