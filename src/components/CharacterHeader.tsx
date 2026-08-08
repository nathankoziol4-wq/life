/** En-tête permanent : identité, situation, argent et statistiques visibles. */

import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, countryLine, money, situationOf } from '../ui/format.ts';
import { StatsBar } from './StatsBar.tsx';

export function CharacterHeader({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { state } = useGame();
  if (!state) return null;
  const p = state.player;

  return (
    <header className="header">
      <div className="header-top">
        <div className="avatar" aria-hidden="true">{avatarFor(p)}</div>
        <div className="header-id">
          <div className="header-name">
            {p.firstName} {p.lastName}
          </div>
          <div className="header-sub">
            {p.age} ans · {situationOf(state)}
          </div>
          <div className="header-sub">{countryLine(state)}</div>
        </div>
        <div className="header-money">
          <div className="header-money-value">{money(state, p.money)}</div>
          <div className="header-money-label">Disponible</div>
        </div>
        <button className="header-profile-btn" onClick={onOpenProfile} aria-label="Profil complet">
          ☰
        </button>
      </div>
      <StatsBar stats={p.stats} />
    </header>
  );
}
