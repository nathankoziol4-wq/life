/**
 * La feuille qui monte du bas.
 *
 * Sur mobile, ce qu'on doit choisir vient d'en bas et se ferme d'un geste :
 * c'est la seule façon de garder une main sur le téléphone. Le jeu n'avait
 * que des modales centrées, ce qui oblige à viser le haut de l'écran pour
 * fermer et met les choix hors de portée du pouce.
 *
 * Réservée aux choix : une cible, un montant, une manière, un objet. Les
 * décisions qui engagent une vie — un mariage, un crime, une signature —
 * gardent la modale centrée, qui arrête le joueur au lieu de l'accompagner.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text } from './primitives.tsx';

export function BottomSheet({
  open, onClose, title, note, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  note?: string;
  children: ReactNode;
  /** Ce qui reste visible en bas, au-dessus de la marge sûre. */
  footer?: ReactNode;
}) {
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  // La touche d'échappement ferme, comme partout ailleurs.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setDrag(0);
  }, [open]);

  if (!open) return null;

  /** Le geste : on suit le doigt vers le bas, jamais vers le haut. */
  const onPointerDown = (event: React.PointerEvent) => {
    startY.current = event.clientY;
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (startY.current === null) return;
    setDrag(Math.max(0, event.clientY - startY.current));
  };
  const onPointerUp = () => {
    // Un tiers de la hauteur suffit : au-delà, le joueur a clairement voulu
    // fermer, et l'obliger à aller au bout serait pénible.
    if (drag > 120) onClose();
    startY.current = null;
    setDrag(0);
  };

  return (
    <div className="overlay ui-sheet-overlay" onClick={onClose} role="presentation">
      <div
        className="ui-sheet"
        style={{ transform: drag > 0 ? `translateY(${drag}px)` : undefined }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="ui-sheet-grip"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="ui-sheet-handle" aria-hidden="true" />
        </div>
        {title && (
          <div className="ui-sheet-head">
            <Text role="heading" as="h2">{title}</Text>
            {note && <Text role="sub" tone="muted">{note}</Text>}
          </div>
        )}
        <div className="ui-sheet-body">{children}</div>
        {footer && <div className="ui-sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
