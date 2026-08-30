/**
 * Primitives d'interface : modale, panneau plein écran, boutons, listes,
 * jauges. Tous les écrans du jeu sont construits à partir d'ici.
 */

import { useEffect, useId, useRef, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Modale                                                             */
/* ------------------------------------------------------------------ */

/**
 * La modale du jeu — **au milieu de l'écran**, et nulle part ailleurs.
 *
 * Elle montait du bas, avec une poignée de glissement en haut. Deux défauts
 * dans le même geste : une feuille qui monte du bas est un *endroit où l'on
 * va* (un écran, un panneau), alors qu'une modale est *quelque chose qui
 * arrive* — un résultat, une nouvelle, une question. Leur donner la même forme
 * effaçait la différence. Et la poignée annonçait un glissement dont rien
 * n'était implémenté : une affordance qui ment.
 *
 * Un `centered` existait déjà comme option… et **n'était passé par personne**.
 * Il n'y a plus d'option : c'est la seule forme.
 */
export function Modal({
  open, onClose, title, text, icon, tone = 'neutral', children, dismissible = true,
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  text?: string;
  icon?: string;
  tone?: 'good' | 'bad' | 'neutral';
  children?: ReactNode;
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
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
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

/*
 * **`Row`, `Card` et `Section` ne sont plus ici.**
 *
 * Ils vivent dans `ui/components/list.tsx`, et cette migration-là est finie :
 * les trente-six fichiers d'interface du jeu les y prennent, aucun ne les
 * prend ici. Les
 * garder en double aurait laissé ouverte la porte par laquelle tous les
 * défauts de cette refonte sont revenus — l'attribut `disabled` du navigateur,
 * qui retire une ligne refusée de l'arbre d'accessibilité au lieu d'afficher
 * sa raison. Un écran neuf, ou distrait, ne peut plus la retrouver.
 *
 * Les classes CSS `.row`, `.card` et `.section` restent : une centaine
 * d'endroits écrivent encore leur mise en page à la main, et c'est un autre
 * chantier.
 */

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

/* ------------------------------------------------------------------ */
/* Saisie                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un champ demande au clavier du téléphone.
 *
 * Sur un ordinateur, un `<input>` nu suffit. Sur un téléphone, il décide de
 * six choses d'un coup : quelles touches apparaissent, si la première lettre
 * est une majuscule, si le système propose de compléter, si le correcteur
 * s'en mêle, ce que dit la touche de validation, et — sous seize points de
 * police — si la page se met à zoomer sans jamais revenir.
 *
 * Aucun de ces réglages n'existait nulle part dans le jeu. Ils sont ici
 * plutôt qu'à chaque appel, pour la raison qui vaut partout ailleurs dans ce
 * fichier : sept champs répartis dans quatre écrans, c'est sept occasions
 * d'en oublier un.
 */
const KEYBOARDS = {
  /** Un prénom : majuscule, pas de correction, et « suivant » puisqu'un nom suit. */
  given: {
    type: 'text', inputMode: undefined, autoComplete: 'given-name',
    autoCapitalize: 'words', autoCorrect: 'off', spellCheck: false, enterKeyHint: 'next',
  },
  /** Un nom de famille : pareil, mais c'est le dernier — donc « OK ». */
  family: {
    type: 'text', inputMode: undefined, autoComplete: 'family-name',
    autoCapitalize: 'words', autoCorrect: 'off', spellCheck: false, enterKeyHint: 'done',
  },
  /** Une phrase écrite par le joueur : majuscule de début, correcteur bienvenu. */
  sentence: {
    type: 'text', inputMode: undefined, autoComplete: 'off',
    autoCapitalize: 'sentences', autoCorrect: 'on', spellCheck: true, enterKeyHint: 'done',
  },
  /**
   * Un montant.
   *
   * `type="number"` paraissait le bon choix et ne l'est pas : iOS lui donne
   * un clavier complet avec une rangée de chiffres, pas le pavé numérique, et
   * il accepte « e » et « + » qui ne veulent rien dire pour une somme.
   * `inputMode="numeric"` demande le pavé, et le filtre ci-dessous fait le
   * reste.
   */
  amount: {
    type: 'text', inputMode: 'numeric', autoComplete: 'off',
    autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false, enterKeyHint: 'done',
  },
} as const;

export type FieldKind = keyof typeof KEYBOARDS;

/**
 * Un champ de saisie, avec son intitulé et son clavier.
 *
 * L'intitulé est relié au champ par `htmlFor` : sans ce lien, toucher le mot
 * « Prénom » ne mettait pas le champ au point, et un lecteur d'écran
 * annonçait un champ sans nom.
 */
export function TextField({
  label, value, onChange, kind = 'sentence', maxLength, placeholder, onSubmit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind?: FieldKind;
  maxLength?: number;
  placeholder?: string;
  /** Ce que fait la touche de validation du clavier. */
  onSubmit?: () => void;
}) {
  const id = useId();
  const keyboard = KEYBOARDS[kind];
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        type={keyboard.type}
        inputMode={keyboard.inputMode}
        autoComplete={keyboard.autoComplete}
        autoCapitalize={keyboard.autoCapitalize}
        autoCorrect={keyboard.autoCorrect}
        spellCheck={keyboard.spellCheck}
        enterKeyHint={keyboard.enterKeyHint}
        onChange={(e) => onChange(
          kind === 'amount' ? e.target.value.replaceAll(/\D/g, '') : e.target.value,
        )}
        onKeyDown={(e) => {
          // Le clavier du téléphone n'a pas d'échappement : sa seule sortie
          // est la touche de validation. Si elle ne fait rien, on a écrit et
          // l'on est coincé derrière son propre clavier.
          if (e.key !== 'Enter') return;
          e.currentTarget.blur();
          onSubmit?.();
        }}
      />
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

/**
 * Curseur de montant avec saisie libre.
 *
 * La saisie n'avait pas d'intitulé : au doigt on voyait bien de quoi il
 * s'agissait, mais un lecteur d'écran annonçait « champ de texte » sans rien
 * de plus, et le curseur juste au-dessus n'était pas nommé non plus.
 */
export function AmountPicker({
  value, max, onChange, step = 1, label = 'Montant',
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  step?: number;
  /** Ce que le montant représente. Lu par la voix, jamais affiché deux fois. */
  label?: string;
}) {
  return (
    <div className="stack">
      <input
        className="range"
        type="range"
        aria-label={`${label} — curseur`}
        min={0}
        max={Math.max(step, max)}
        step={step}
        value={Math.min(value, max)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <TextField
        label={label}
        kind="amount"
        value={String(value)}
        onChange={(text) => onChange(Math.max(0, Math.min(max, Number(text) || 0)))}
      />
    </div>
  );
}
