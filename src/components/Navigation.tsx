/**
 * Barre de navigation basse : quatre destinations et le bouton central
 * « +1 an » qui déclenche le moteur annuel.
 *
 * Le journal de vie est l'écran d'accueil : appuyer sur l'onglet déjà actif
 * y revient, et prendre une année y ramène automatiquement.
 */

export type Tab = 'parcours' | 'patrimoine' | 'proches' | 'agenda';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'parcours', label: 'Parcours', icon: '🎓' },
  { id: 'patrimoine', label: 'Avoirs', icon: '🏦' },
  { id: 'proches', label: 'Proches', icon: '💞' },
  { id: 'agenda', label: 'Agenda', icon: '🧭' },
];

export function Navigation({
  active, onSelect, onAdvance, canAdvance, hint,
}: {
  /** `null` = journal de vie. */
  active: Tab | null;
  onSelect: (tab: Tab | null) => void;
  onAdvance: () => void;
  canAdvance: boolean;
  /** Vrai quand rien ne bloque : le bouton central pulse doucement. */
  hint: boolean;
}) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <nav className="nav">
      {left.map((tab) => (
        <NavItem key={tab.id} tab={tab} active={active} onSelect={onSelect} />
      ))}
      <div className="nav-center">
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
      {right.map((tab) => (
        <NavItem key={tab.id} tab={tab} active={active} onSelect={onSelect} />
      ))}
    </nav>
  );
}

function NavItem({
  tab, active, onSelect,
}: {
  tab: { id: Tab; label: string; icon: string };
  active: Tab | null;
  onSelect: (tab: Tab | null) => void;
}) {
  const isActive = active === tab.id;
  return (
    <button
      className="nav-item"
      aria-current={isActive}
      // Un second appui referme le menu et ramène au journal de vie.
      onClick={() => onSelect(isActive ? null : tab.id)}
      type="button"
    >
      <span className="nav-icon" aria-hidden="true">{isActive ? '📖' : tab.icon}</span>
      <span className="nav-label">{isActive ? 'Journal' : tab.label}</span>
    </button>
  );
}
