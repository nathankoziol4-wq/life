/** Les quatre jauges toujours visibles, plus la liste complète pour le profil. */

import type { Stats } from '../engine/types.ts';
import { meterColor } from './Modal.tsx';

export const VISIBLE_STATS: { key: keyof Stats; label: string; emoji: string }[] = [
  { key: 'happiness', label: 'Bonheur', emoji: '😊' },
  { key: 'health', label: 'Santé', emoji: '❤️' },
  { key: 'intelligence', label: 'Esprit', emoji: '🧠' },
  { key: 'looks', label: 'Allure', emoji: '✨' },
];

/** Statistiques internes, révélées dans le profil complet. */
export const HIDDEN_STATS: { key: keyof Stats; label: string; emoji: string; inverted?: boolean }[] = [
  { key: 'fitness', label: 'Forme physique', emoji: '💪' },
  { key: 'discipline', label: 'Discipline', emoji: '🎯' },
  { key: 'reputation', label: 'Réputation', emoji: '🌟' },
  { key: 'karma', label: 'Karma', emoji: '☯️' },
  { key: 'stress', label: 'Stress', emoji: '🌩️', inverted: true },
  { key: 'addiction', label: 'Dépendances', emoji: '🍺', inverted: true },
  { key: 'criminality', label: 'Criminalité', emoji: '🎭', inverted: true },
  { key: 'fertility', label: 'Fertilité', emoji: '🌱' },
];

export function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="stats-strip">
      {VISIBLE_STATS.map(({ key, label, emoji }) => {
        const value = Math.round(stats[key]);
        return (
          <div className="stat" key={key}>
            <div className="stat-head">
              <span className="stat-label">
                {emoji} {label}
              </span>
              <span className="stat-value">{value}</span>
            </div>
            <div className="stat-track">
              <div
                className="stat-fill"
                style={{ width: `${value}%`, background: statColor(value) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Sur fond indigo, les jauges utilisent des teintes claires plus lisibles. */
function statColor(value: number): string {
  if (value >= 70) return '#7ff0c0';
  if (value >= 45) return '#ffe08a';
  if (value >= 25) return '#ffb07c';
  return '#ff8f96';
}

/** Liste détaillée utilisée dans l'écran Profil. */
export function StatsDetail({ stats }: { stats: Stats }) {
  const all = [
    ...VISIBLE_STATS.map((s) => ({ ...s, inverted: false })),
    ...HIDDEN_STATS.map((s) => ({ ...s, inverted: s.inverted ?? false })),
  ];
  return (
    <div className="card">
      {all.map(({ key, label, emoji, inverted }) => {
        const value = Math.round(stats[key]);
        // Pour une statistique négative, la couleur suit la valeur inversée.
        const color = meterColor(inverted ? 100 - value : value);
        return (
          <div className="row" key={key}>
            <span className="row-emoji">{emoji}</span>
            <span className="row-main">
              <span className="row-title">{label}</span>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${value}%`, background: color }} />
              </div>
            </span>
            <span className="row-right">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
