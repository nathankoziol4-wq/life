/**
 * Le vocabulaire des listes.
 *
 * Quatre composants portent tout le jeu : mesurés sur les trente-quatre
 * écrans, **559 lignes, 430 cartes, 305 pastilles, 277 sections**. Tant
 * qu'ils vivaient dans l'ancienne feuille, migrer un écran voulait dire le
 * repeindre — les mêmes balises, les mêmes classes, un autre fichier. C'est
 * exactement ce qu'on ne voulait pas faire.
 *
 * Ils sont donc refaits ici, sur les jetons, et pas seulement transposés :
 * chacun gagne ce que les écrans dessinaient déjà à la main faute de l'avoir.
 * Trois choses en particulier, et ce sont des motifs qui reviennent partout.
 *
 * **Une ligne qui refuse doit rester lisible.** L'ancienne `Row` posait
 * l'attribut `disabled` du navigateur, ce qui la retire de l'ordre de
 * tabulation et de l'arbre d'accessibilité : une voix de synthèse ne
 * l'annonce plus du tout. Or dans ce jeu, « indisponible » veut presque
 * toujours dire *« pas encore, et voilà pourquoi »* — l'explication est le
 * contenu. `closed` garde la ligne présente et annoncée, refuse l'appui, et
 * laisse sa raison se lire.
 *
 * **Une valeur de 0 à 100 se montre.** `RelationshipCard` dessine sa barre de
 * relation à la main ; d'autres écrans écrivent « 62 % » et laissent le
 * joueur imaginer. Une ligne peut désormais porter sa jauge.
 *
 * **Une section peut avoir besoin d'une phrase.** Les écrans en ajoutent une
 * après coup, en `<p className="small muted">` avec une marge écrite à la
 * main — vingt fois, avec vingt marges légèrement différentes.
 */

import type { CSSProperties, ReactNode } from 'react';
import { Text, type Tone } from './primitives.tsx';

/* ------------------------------------------------------------------ */
/* La surface                                                          */
/* ------------------------------------------------------------------ */

/**
 * Une carte : un groupe de lignes qui vont ensemble.
 *
 * `tone` teinte le bord gauche. C'est le seul endroit du système où une
 * couleur porte du sens sans texte à côté, et c'est délibérément discret :
 * un liseré se remarque en balayant la page, sans crier.
 */
export function Card({
  children, pad, tone,
}: {
  children: ReactNode;
  /** Du contenu libre plutôt qu'une suite de lignes. */
  pad?: boolean;
  tone?: Tone;
}) {
  return (
    <div className={`ui-card${pad ? ' ui-card-pad' : ''}${tone ? ` ui-card-${tone}` : ''}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Le titre                                                            */
/* ------------------------------------------------------------------ */

export function Section({
  title, sub, action, children,
}: {
  title?: string;
  /** Une phrase sous le titre : à quoi sert cette section. */
  sub?: ReactNode;
  /** Un contrôle à droite du titre — « Tout voir », « Afficher (13) ». */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ui-section">
      {(title || action) && (
        <div className="ui-section-head">
          {title && <Text role="section" tone="muted">{title}</Text>}
          {action}
        </div>
      )}
      {sub && (
        <div className="ui-section-sub">
          <Text role="sub" tone="muted">{sub}</Text>
        </div>
      )}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* La ligne                                                            */
/* ------------------------------------------------------------------ */

export function Row({
  emoji, title, sub, right, badge, meter, meterTone, tone,
  onClick, closed, because, chevron,
}: {
  emoji?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  /** Ce qui se lit à droite : un montant, un compte, une date. */
  right?: ReactNode;
  /** Une pastille d'état, avant le chevron. */
  badge?: ReactNode;
  /** Une jauge de 0 à 100 sous le titre. */
  meter?: number;
  meterTone?: Tone;
  tone?: Tone;
  onClick?: () => void;
  /**
   * Hors d'atteinte — mais toujours là, toujours annoncée.
   *
   * On n'utilise pas l'attribut `disabled` : il retire la ligne de l'arbre
   * d'accessibilité, et la raison du refus est justement ce qu'il faut
   * pouvoir lire. `aria-disabled` dit la même chose sans faire disparaître.
   */
  closed?: boolean;
  /** Pourquoi c'est fermé. S'affiche à la place de `sub`. */
  because?: ReactNode;
  chevron?: boolean;
}) {
  const shown = closed && because ? because : sub;
  const body = (
    <>
      {emoji != null && <span className="ui-row-emoji" aria-hidden="true">{emoji}</span>}
      <span className="ui-row-main">
        <Text role="body" className="ui-row-title">{title}</Text>
        {shown != null && shown !== '' && (
          <Text role="sub" tone={closed ? 'warn' : 'muted'} className="ui-row-sub">{shown}</Text>
        )}
        {meter != null && (
          <span className="ui-row-meter" aria-hidden="true">
            <span
              className={`ui-row-meter-fill${meterTone ? ` ui-fill-${meterTone}` : ''}`}
              style={{ '--fill': `${Math.max(0, Math.min(100, meter))}%` } as CSSProperties}
            />
          </span>
        )}
      </span>
      {right != null && <span className="ui-row-right">{right}</span>}
      {badge}
      {chevron && <span className="ui-row-chevron" aria-hidden="true">›</span>}
    </>
  );

  const classes = `ui-row${closed ? ' is-closed' : ''}${tone ? ` ui-row-${tone}` : ''}`;
  // Le même crochet que l'ancienne ligne : voir la note dans `Modal.tsx`.
  // C'est ce qui permet aux six outils de mesure de traverser la migration
  // sans qu'aucun ne cesse silencieusement de trouver quoi que ce soit.
  if (!onClick) return <div className={classes} data-row="">{body}</div>;
  return (
    <button
      className={classes}
      data-row=""
      data-closed={closed ? '' : undefined}
      type="button"
      aria-disabled={closed || undefined}
      // Le clic est refusé ici plutôt que par l'attribut du navigateur :
      // la ligne garde le focus, la voix l'annonce, et la raison se lit.
      onClick={closed ? undefined : onClick}
    >
      {body}
    </button>
  );
}
