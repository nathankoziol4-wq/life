/**
 * La navigation basse.
 *
 * Quatre destinations et un bouton central : c'était déjà la bonne idée, mais
 * l'onglet actif se transformait en « Journal », si bien que le repère se
 * déplaçait sous le doigt — on ne savait plus où l'on était ni comment
 * revenir.
 *
 * Ici : **cinq destinations fixes** dont le journal, qui redevient une
 * destination comme les autres au lieu d'un état caché. Le bouton « +1 an »
 * flotte au-dessus, au centre, à portée de pouce, et se retire de lui-même
 * quand une décision est en attente — on ne saute pas une année par-dessus un
 * choix qu'on n'a pas tranché.
 */

import { Text } from './primitives.tsx';

export type Tab = 'journal' | 'parcours' | 'patrimoine' | 'proches' | 'agenda';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'journal', label: 'Vie', icon: '📖' },
  { id: 'parcours', label: 'Parcours', icon: '🎓' },
  { id: 'proches', label: 'Proches', icon: '💞' },
  { id: 'patrimoine', label: 'Avoirs', icon: '🏦' },
  { id: 'agenda', label: 'Agenda', icon: '🧭' },
];

export function TabBar({
  active, onSelect, onAdvance, canAdvance, hint,
}: {
  active: Tab;
  onSelect: (tab: Tab) => void;
  onAdvance: () => void;
  canAdvance: boolean;
  /** Rien ne bloque : le bouton respire doucement. */
  hint: boolean;
}) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <nav className="nav tabbar" aria-label="Navigation principale">
      <div className="tabbar-side">
        {left.map((tab) => (
          <TabItem key={tab.id} tab={tab} active={active} onSelect={onSelect} />
        ))}
      </div>

      <div className="nav-center tabbar-center">
        <button
          className={`age-button${hint ? ' pulsing' : ''}`}
          onClick={onAdvance}
          disabled={!canAdvance}
          aria-label="Prendre un an"
          type="button"
        >
          <span className="age-button-plus">+1</span>
          <span className="age-button-label">Année</span>
        </button>
      </div>

      <div className="tabbar-side">
        {right.map((tab) => (
          <TabItem key={tab.id} tab={tab} active={active} onSelect={onSelect} />
        ))}
      </div>
    </nav>
  );
}

function TabItem({
  tab, active, onSelect,
}: {
  tab: { id: Tab; label: string; icon: string };
  active: Tab;
  onSelect: (tab: Tab) => void;
}) {
  const isActive = active === tab.id;
  return (
    <button
      className={`nav-item tab-item${isActive ? ' is-active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(tab.id)}
      type="button"
    >
      <span className="nav-icon tab-icon" aria-hidden="true">{tab.icon}</span>
      <Text role="caption" className="nav-label">{tab.label}</Text>
    </button>
  );
}
