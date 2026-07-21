/**
 * Petits composants d'UI réutilisables : cartes de choix, barre de stat, etc.
 */
import type { ChoiceOption, Stats } from "../types";
import { STAT_KEYS, STAT_LABELS } from "../types";

/** Grille de cartes sélectionnables (choix unique ou multiple). */
export function ChoiceGrid({
  options,
  selected,
  onSelect,
  compact,
}: {
  options: ChoiceOption[];
  selected: string[];
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="choice-grid">
      {options.map((o) => (
        <button
          key={o.id}
          className={`choice-card${compact ? " compact" : ""}${selected.includes(o.id) ? " selected" : ""}`}
          onClick={() => onSelect(o.id)}
          type="button"
        >
          {o.difficulty ? <span className="diff">Difficulté +{o.difficulty}</span> : null}
          {o.icon ? <span className="icon">{o.icon}</span> : null}
          <span className="label">{o.label}</span>
          {o.description && !compact ? <span className="desc">{o.description}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Barre horizontale d'une stat. */
export function StatBar({ name, value, max = 100 }: { name: string; value: number; max?: number }) {
  return (
    <div className="statbar">
      <span className="name">{name}</span>
      <span className="track">
        <span className="fill" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
      </span>
      <span className="num">{Math.round(value)}</span>
    </div>
  );
}

/** Bloc de toutes les stats. */
export function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <div className="stat-alloc">
      {STAT_KEYS.map((k) => (
        <StatBar key={k} name={STAT_LABELS[k]} value={stats[k]} />
      ))}
    </div>
  );
}

/** Formate un montant en euros. */
export function money(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1_000_000 ? (abs / 1_000_000).toFixed(1) + " M" : abs >= 1000 ? Math.round(abs / 1000) + " k" : String(Math.round(abs));
  return (n < 0 ? "−" : "") + s + " €";
}
