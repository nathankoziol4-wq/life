/**
 * Le mouvement qui ne peut pas être écrit en CSS.
 *
 * Presque tout l'est : l'apparition des lignes, le retour au doigt, la
 * bascule d'écran vivent dans `theme/components.css` et tournent hors du fil
 * principal. Ce qui reste ici est ce qu'une feuille de style ne sait pas
 * faire — interpoler une **valeur**, et non une propriété.
 *
 * Un montant qui passe de 12 000 à 47 500 en sautant ne dit pas qu'il a
 * augmenté ; il dit qu'il est autre. Le voir défiler dit ce qui s'est passé.
 * C'est la seule raison d'animer un nombre, et elle ne vaut que pour les
 * nombres qui *changent en conséquence d'un geste* : l'argent, l'âge,
 * l'année, les statistiques après une année jouée.
 */

import { useEffect, useRef, useState } from 'react';

/** Une durée par défaut alignée sur `--motion-slow`, en une seule place. */
const DEFAULT_MS = 380;

/**
 * Vrai si le joueur a demandé moins de mouvement.
 *
 * Lu à chaque appel plutôt que mémorisé : le réglage se change en cours de
 * route sur toutes les plateformes récentes, et une valeur figée au premier
 * rendu continuerait d'animer pour quelqu'un qui vient de demander l'inverse.
 */
function reduced(): boolean {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * La valeur, en route vers sa cible.
 *
 * **Ne s'anime pas au premier rendu.** Ouvrir le jeu ne doit pas faire
 * défiler l'âge depuis zéro : il n'y a pas eu de changement, seulement un
 * affichage. Le compteur ne part que lorsque la cible bouge *après* coup.
 *
 * **Repart de là où il en est.** Si une deuxième année est jouée pendant que
 * la première défile encore, on interpole depuis la valeur affichée et non
 * depuis l'ancienne cible — sinon le nombre reculerait avant d'avancer.
 */
export function useCountUp(target: number, ms: number = DEFAULT_MS): number {
  const [shown, setShown] = useState(target);
  const frame = useRef(0);
  const current = useRef(target);
  const first = useRef(true);

  useEffect(() => {
    current.current = shown;
  }, [shown]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      current.current = target;
      setShown(target);
      return;
    }
    if (reduced() || ms <= 0) {
      current.current = target;
      setShown(target);
      return;
    }
    const from = current.current;
    if (from === target) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // La même courbe que `--ease-out` des jetons, écrite en une ligne :
      // départ franc, arrivée posée. Un nombre qui accélère à la fin donne
      // l'impression d'un défilement qui s'emballe.
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (target - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
    // `shown` est délibérément absent : le relire relancerait l'animation à
    // chaque image, ce qui la figerait sur sa première valeur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);

  return shown;
}

/**
 * Rejoue une animation d'entrée quand une clé change.
 *
 * Le problème que cela résout : une animation CSS ne se rejoue pas si
 * l'élément reste monté. Passer d'un onglet à l'autre remplace le contenu
 * sans démonter le conteneur, donc rien ne rentre. On rend une clé qui change
 * avec l'onglet et qu'on pose sur le nœud — React le remplace, et
 * l'animation repart.
 */
export function useReplayKey(dep: unknown): string {
  const [key, setKey] = useState(0);
  const seen = useRef(dep);
  useEffect(() => {
    if (seen.current !== dep) {
      seen.current = dep;
      setKey((k) => k + 1);
    }
  }, [dep]);
  return `${key}`;
}
