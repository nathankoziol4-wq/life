/**
 * Les primitives du nouveau système.
 *
 * Mesuré avant de les écrire : **443 `style={{}}` écrits à la main dans 39
 * fichiers**, dont 37 tailles de police et 72 valeurs numériques posées à la
 * volée. Chacune est une décision de mise en forme prise dans un écran, donc
 * une décision que personne ne peut plus changer d'un seul endroit.
 *
 * Ces composants existent pour qu'un écran n'ait plus jamais à écrire une
 * valeur. Il choisit un **rôle** — un titre, une légende, un espacement — et
 * le rôle sait ce qu'il vaut dans chaque thème et sur chaque taille d'écran.
 *
 * Ils ne contiennent aucune logique de jeu : ils reçoivent ce qu'on leur
 * donne et le disposent. La simulation reste dans `systems/`.
 */

import type { CSSProperties, ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Le texte                                                            */
/* ------------------------------------------------------------------ */

export type TextRole =
  | 'display' | 'title' | 'heading' | 'section' | 'body' | 'sub' | 'caption';

export type Tone =
  | 'ink' | 'soft' | 'muted' | 'faint'
  | 'primary' | 'good' | 'bad' | 'warn'
  | 'argent' | 'sante' | 'amour' | 'carriere' | 'savoir' | 'crime' | 'gloire';

/**
 * Un mot, à sa place.
 *
 * `role` décide de la taille, de la graisse et du suivi ; `tone` décide de la
 * couleur. Les deux sont des noms de rôles, jamais des valeurs — c'est ce qui
 * permet de changer toute la typographie du jeu en une ligne.
 */
export function Text({
  role = 'body', tone, children, as, numeric, align, className, id,
}: {
  role?: TextRole;
  tone?: Tone;
  children: ReactNode;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3';
  /** Les chiffres alignés : montants, âges, scores. */
  numeric?: boolean;
  align?: 'start' | 'center' | 'end';
  className?: string;
  id?: string;
}) {
  const Tag = as ?? (role === 'display' || role === 'title' ? 'div' : 'span');
  const classes = [
    'ui-text',
    `ui-text-${role}`,
    tone ? `ui-tone-${tone}` : '',
    numeric ? 'ui-numeric' : '',
    align ? `ui-align-${align}` : '',
    className ?? '',
  ].filter(Boolean).join(' ');
  return <Tag className={classes} id={id}>{children}</Tag>;
}

/* ------------------------------------------------------------------ */
/* La disposition                                                      */
/* ------------------------------------------------------------------ */

type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8;

/** Les uns sous les autres. */
export function Stack({
  gap = 3, children, align, className,
}: {
  gap?: Gap;
  children: ReactNode;
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}) {
  return (
    <div
      className={`ui-stack ui-gap-${gap}${align ? ` ui-align-${align}` : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  );
}

/** Les uns à côté des autres, et ça passe à la ligne si besoin. */
export function Inline({
  gap = 2, children, wrap, justify, align, className,
}: {
  gap?: Gap;
  children: ReactNode;
  wrap?: boolean;
  justify?: 'start' | 'center' | 'end' | 'between';
  align?: 'start' | 'center' | 'end' | 'baseline';
  className?: string;
}) {
  const classes = [
    'ui-inline',
    `ui-gap-${gap}`,
    wrap ? 'ui-wrap' : '',
    justify ? `ui-justify-${justify}` : '',
    align ? `ui-valign-${align}` : '',
    className ?? '',
  ].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}

/** Ce qui pousse le reste au bout de la ligne. */
export function Spacer() {
  return <div className="ui-spacer" />;
}

/* ------------------------------------------------------------------ */
/* Les marques                                                         */
/* ------------------------------------------------------------------ */

/** Une pastille : un état, une catégorie, un compte. */
export function Badge({
  children, tone = 'muted', solid,
}: {
  children: ReactNode;
  tone?: Tone;
  /** Plein plutôt que teinté : pour ce qui doit se voir de loin. */
  solid?: boolean;
}) {
  return (
    <span className={`ui-badge ui-badge-${tone}${solid ? ' ui-badge-solid' : ''}`}>
      {children}
    </span>
  );
}

/**
 * Une jauge compacte.
 *
 * Volontairement sans chiffre par défaut : l'écran principal doit se lire
 * d'un coup d'œil, et le détail se trouve derrière un appui.
 */
export function StatBar({
  label, value, tone, showValue,
}: {
  label: string;
  value: number;
  tone?: Tone;
  showValue?: boolean;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="ui-statbar">
      <div className="ui-statbar-head">
        <Text role="caption" tone="muted">{label}</Text>
        {showValue && <Text role="caption" tone="soft" numeric>{v}</Text>}
      </div>
      <div className="ui-statbar-track">
        <div
          className={`ui-statbar-fill${tone ? ` ui-fill-${tone}` : ''}`}
          style={{ '--fill': `${v}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}

/**
 * Un montant.
 *
 * Toujours en chiffres alignés, et coloré seulement quand il représente une
 * variation : un patrimoine n'est ni bon ni mauvais, une perte l'est.
 */
export function MoneyDisplay({
  text, role = 'body', signed,
}: {
  text: string;
  role?: TextRole;
  /** `+1` pour un gain, `-1` pour une perte, rien pour un solde. */
  signed?: number;
}) {
  const tone: Tone | undefined = signed === undefined || signed === 0
    ? undefined
    : signed > 0 ? 'good' : 'bad';
  return <Text role={role} tone={tone} numeric>{text}</Text>;
}

/* ------------------------------------------------------------------ */
/* Les états                                                           */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on montre quand il n'y a rien.
 *
 * Un état vide sans issue est un cul-de-sac : celui-ci porte toujours de quoi
 * en sortir quand il y a quelque chose à proposer.
 */
export function EmptyState({
  emoji, title, note, action,
}: {
  emoji?: string;
  title: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div className="ui-empty">
      {emoji && <div className="ui-empty-emoji" aria-hidden="true">{emoji}</div>}
      <Text role="heading" align="center">{title}</Text>
      {note && <Text role="sub" tone="muted" align="center">{note}</Text>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}

/** Le squelette d'un contenu qui arrive. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="ui-skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="ui-skeleton-line" />
      ))}
    </div>
  );
}
