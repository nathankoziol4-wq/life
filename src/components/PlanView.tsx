/**
 * Le rendu d'un plan vu de dessus, commun aux mini-jeux de grille.
 *
 * Le cambriolage, la fuite et l'évasion partagent la même géométrie ; ils
 * partagent donc le même dessin. Rien ici ne connaît les règles : on reçoit
 * un plan et des pions, on place des rectangles en pourcentage. C'est ce qui
 * permet au même composant de servir une maison, une rue et une cour.
 */

import type { ReactNode } from 'react';
import { at, type Plan } from '../systems/minigames/grid.ts';

const CLASS: Record<string, string> = {
  '#': 'plan-wall',
  D: 'plan-door',
  X: 'plan-exit',
  C: 'plan-cover',
};

export function PlanGrid({ plan, children }: { plan: Plan; children: ReactNode }) {
  const cells: ReactNode[] = [];
  for (let y = 0; y < plan.height; y++) {
    for (let x = 0; x < plan.width; x++) {
      const cell = at(plan, x, y);
      if (cell === '.') continue;
      cells.push(
        <div
          key={`${x}_${y}`}
          className={`plan-cell ${CLASS[cell] ?? 'plan-wall'}`}
          style={{
            left: `${(x / plan.width) * 100}%`,
            top: `${(y / plan.height) * 100}%`,
            // Un cheveu de plus que la case : sans ce chevauchement, les
            // arrondis sous-pixel laissent des coutures blanches entre deux
            // murs contigus, et le plan a l'air percé là où il ne l'est pas.
            width: `calc(${100 / plan.width}% + 0.5px)`,
            height: `calc(${100 / plan.height}% + 0.5px)`,
          }}
        />,
      );
    }
  }
  return (
    <div className="plan" style={{ aspectRatio: `${plan.width} / ${plan.height}` }}>
      {cells}
      {children}
    </div>
  );
}

/** Un pion sur le plan, positionné en pourcentage. */
export function Token({ plan, x, y, className, children }: {
  plan: Plan;
  x: number;
  y: number;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      className={className}
      style={{ left: `${(x / plan.width) * 100}%`, top: `${(y / plan.height) * 100}%` }}
    >
      {children}
    </div>
  );
}

/**
 * Le faisceau d'un projecteur, dessiné en dur.
 *
 * Un secteur circulaire coûterait un `canvas` ; un dégradé conique fait la
 * même chose en CSS et suit la rotation sans repeindre quoi que ce soit.
 *
 * Il passe *sous* les murs (voir `.plan-beam` dans la feuille de style) :
 * le jeu coupe déjà le faisceau à la première paroi, et un faisceau dessiné
 * par-dessus un bâtiment aurait affolé le joueur là où il était en sûreté.
 */
export function BeamCone({ plan, x, y, angle, half, range }: {
  plan: Plan;
  x: number;
  y: number;
  angle: number;
  half: number;
  range: number;
}) {
  const deg = (angle * 180) / Math.PI;
  const spread = (half * 180) / Math.PI;
  return (
    <div
      className="plan-beam"
      style={{
        left: `${(x / plan.width) * 100}%`,
        top: `${(y / plan.height) * 100}%`,
        width: `${((range * 2) / plan.width) * 100}%`,
        height: `${((range * 2) / plan.height) * 100}%`,
        background: `conic-gradient(from ${deg - spread + 90}deg,`
          + ' var(--warn-soft) 0deg,'
          + ` var(--warn-soft) ${spread * 2}deg,`
          + ' transparent 0)',
      }}
    />
  );
}
