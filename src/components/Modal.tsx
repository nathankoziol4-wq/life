/**
 * Primitives d'interface : modale, panneau plein écran, boutons, listes,
 * jauges. Tous les écrans du jeu sont construits à partir d'ici.
 */

import { useEffect, useRef, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Modale                                                             */
/* ------------------------------------------------------------------ */

export function Modal({
  open, onClose, title, text, icon, tone = 'neutral', children, centered = false, dismissible = true,
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  text?: string;
  icon?: string;
  tone?: 'good' | 'bad' | 'neutral';
  children?: ReactNode;
  centered?: boolean;
  dismissible?: boolean;
}) {
  useEffect(() => {
    if (!open || !dismissible || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismissible, onClose]);

  if (!open) return null;
  const toneClass = tone === 'good' ? 'pill-good' : tone === 'bad' ? 'pill-bad' : '';

  return (
    <div
      className="overlay"
      onClick={dismissible && onClose ? onClose : undefined}
      role="presentation"
    >
      <div
        className={`modal${centered ? ' centered' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {!centered && <div className="modal-grip" />}
        {icon && <div className="modal-icon">{icon}</div>}
        {title && <h2 className="modal-title">{title}</h2>}
        {text && <p className={`modal-text${toneClass ? '' : ''}`}>{text}</p>}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panneau plein écran                                                */
/* ------------------------------------------------------------------ */

export function Sheet({
  title, onBack, children, action,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
  action?: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="sheet">
      <div className="sheet-header">
        <button className="sheet-back" onClick={onBack} aria-label="Retour">
          ‹
        </button>
        <div className="sheet-title">{title}</div>
        {action}
      </div>
      <div className="sheet-body" ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Éléments de liste                                                  */
/* ------------------------------------------------------------------ */

export function Row({
  emoji, title, sub, right, onClick, disabled, chevron,
}: {
  emoji?: string;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  chevron?: boolean;
}) {
  const content = (
    <>
      {emoji && <span className="row-emoji">{emoji}</span>}
      <span className="row-main">
        <span className="row-title">{title}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      {right && <span className="row-right">{right}</span>}
      {chevron && <span className="row-chevron">›</span>}
    </>
  );
  if (!onClick) {
    return <div className={`row${disabled ? ' disabled' : ''}`}>{content}</div>;
  }
  return (
    <button
      className={`row${disabled ? ' disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {content}
    </button>
  );
}

export function Card({ children, pad }: { children: ReactNode; pad?: boolean }) {
  return <div className={`card${pad ? ' card-pad' : ''}`}>{children}</div>;
}

export function Section({
  title, children, action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section">
      {title && (
        <div className="section-title">
          <span>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Tile({
  emoji, label, onClick,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="tile" onClick={onClick} type="button">
      <span className="tile-emoji">{emoji}</span>
      <span className="tile-label">{label}</span>
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Contrôles                                                          */
/* ------------------------------------------------------------------ */

export function Button({
  children, onClick, variant = 'primary', disabled, small, type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  small?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      className={`btn btn-${variant}${small ? ' btn-sm' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Pill({
  children, tone,
}: {
  children: ReactNode;
  tone?: 'good' | 'bad' | 'warn' | 'primary' | 'accent';
}) {
  return <span className={`pill${tone ? ` pill-${tone}` : ''}`}>{children}</span>;
}

/** Jauge 0-100 avec couleur dépendant du niveau. */
export function Meter({ value, tone }: { value: number; tone?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone ?? meterColor(v);
  return (
    <div className="meter">
      <div className="meter-fill" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

/**
 * Jauge compacte pour la colonne droite d'une ligne : une barre de largeur
 * fixe suivie de la valeur. `Meter` seul s'effondre à zéro dans un `row-right`,
 * qui ne réserve aucune largeur.
 */
export function Gauge({ value }: { value: number }) {
  const v = Math.round(Math.max(0, Math.min(100, value)));
  return (
    <span className="gauge">
      <span className="gauge-track">
        <span className="gauge-fill" style={{ width: `${v}%`, background: meterColor(v) }} />
      </span>
      <span className="gauge-value">{v}</span>
    </span>
  );
}

export function meterColor(value: number): string {
  if (value >= 70) return 'var(--good)';
  if (value >= 45) return 'var(--accent)';
  if (value >= 25) return 'var(--warn)';
  return 'var(--bad)';
}

export function Field({
  label, children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

/**
 * Curseur 0-100 avec lecture qualitative.
 *
 * Les aperçus de création ne donnent jamais de pourcentage : un joueur ne
 * gagne rien à lire « +7 % de réussite scolaire ». Il gagne à lire ce que la
 * valeur veut dire, et surtout ce qu'elle coûte — d'où les deux textes.
 */
export function Slider({
  label, value, onChange, reading, note, min = 0, max = 100, step = 1,
}: {
  label: ReactNode;
  value: number;
  onChange: (value: number) => void;
  /** Lecture courte de la position actuelle. */
  reading?: ReactNode;
  /** Le revers, ou la précision utile. */
  note?: ReactNode;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="slider">
      <div className="slider-head">
        <span className="slider-label">{label}</span>
        {reading != null && <span className="slider-reading">{reading}</span>}
      </div>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {note != null && <div className="slider-note">{note}</div>}
    </div>
  );
}

/** Curseur de montant avec saisie libre. */
export function AmountPicker({
  value, max, onChange, step = 1,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div className="stack">
      <input
        className="range"
        type="range"
        min={0}
        max={Math.max(step, max)}
        step={step}
        value={Math.min(value, max)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        className="input"
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
      />
    </div>
  );
}
