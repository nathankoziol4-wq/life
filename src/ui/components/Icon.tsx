/**
 * Le jeu d'icônes, dessiné ici plutôt qu'emprunté à la police système.
 *
 * **Ce que l'emoji coûtait.** Il rendait différemment sur chaque plateforme —
 * un contrat qu'on ne maîtrise pas — il ne prend pas la couleur du texte, et
 * il porte un style figuratif qui jure avec une interface au trait. Quatre
 * cent quatre-vingt-dix-sept usages en dépendaient, répartis sur deux cent
 * trois emoji distincts.
 *
 * **La migration se fait par la table, pas par les écrans.** `Row` et `Tile`
 * continuent de recevoir `emoji="🏠"` : c'est ici qu'on décide si cet emoji a
 * son dessin. Aucun des cinquante-deux écrans n'a été touché, et le jeu
 * d'icônes peut grandir sans qu'aucun ne le soit jamais.
 *
 * **Le style, et il ne se négocie pas d'une icône à l'autre.** Grille de 24,
 * trait de 1,8, extrémités et jonctions rondes, aucun remplissage, et la
 * couleur vient de `currentColor` — donc l'icône prend la teinte de la ligne
 * qui la porte, y compris quand cette ligne est fermée ou en accent.
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * Les tracés, sur une grille de 24.
 *
 * Chacun est une forme géométrique simple : une icône d'interface se lit à
 * seize points de côté, où le détail devient de la boue. Le nom dit ce que la
 * chose est, jamais à quoi elle ressemble — `sortie` et non `porte`, parce
 * qu'une porte peut changer de dessin sans que le sens bouge.
 */
const PATHS: Record<string, string> = {
  sortie: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8M14 12h7m0 0-3-3m3 3-3 3',
  accord: 'M8 13l3 3 3-3M3 10l4-4 5 2 5-2 4 4-4 5-5-2-5 2z',
  argent: 'M12 5v14M9 8.5c0-1.4 1.3-2 3-2s3 .6 3 2-1.3 2-3 2-3 .6-3 2 1.3 2 3 2 3-.6 3-2',
  balance: 'M12 4v16M7 20h10M4 9h16M4 9l-2.5 5a3 3 0 0 0 5 0zM20 9l2.5 5a3 3 0 0 1-5 0z',
  hasard: 'M4 8.5 12 4l8 4.5v7L12 20l-8-4.5zM9 10.5h.01M15 13.5h.01M12 12h.01',
  cible: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 11.5h.01',
  perte: 'M4 6v12h16M7 10l3.5 4 3-3L18 15m0 0v-3m0 3h-3',
  gain: 'M4 6v12h16M7 15l3.5-4 3 3L18 9m0 0v3m0-3h-3',
  diplome: 'M12 4 2 9l10 5 10-5zM6 11.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5',
  duree: 'M7 3h10M7 21h10M7 3c0 4 5 5.5 5 9s-5 5-5 9M17 3c0 4-5 5.5-5 9s5 5 5 9',
  paix: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 3v18M12 12 5.5 18.5M12 12l6.5 6.5',
  outil: 'M15 3a5 5 0 0 0-4.6 7L3 17.4V21h3.6l7.4-7.4A5 5 0 1 0 15 3',
  metier: 'M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M3 13h18',
  gens: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M17 5.5a3 3 0 0 1 0 6M18.5 14.7c1.9.8 3 2.3 3 4.3',
  banque: 'M3 9.5 12 4l9 5.5M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18',
  logement: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9.5 21v-6h5v6',
  scene: 'M4 5h16v6a8 8 0 0 1-16 0zM8.5 8.5h.01M15.5 8.5h.01M9 13.5c1.8 1.3 4.2 1.3 6 0',
  acte: 'M6 3h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M14 3v5h5M8 13h8M8 17h5',
  billet: 'M2.5 7h19v10h-19zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M5.5 10v.01M18.5 14v.01',
  parole: 'M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1',
  etiquette: 'M11 3H4v7l10 10 7-7L11 3M7.5 6.5h.01',
  ecole: 'M3 20h18M5 20V9l7-5 7 5v11M10 20v-5h4v5M9 11h.01M15 11h.01',
  facture: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4',
  repere: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M15.5 8.5l-2 5-5 2 2-5z',
  route: 'M12 3v3m0 5v3m0 5v3M6 21 8 3M18 21 16 3',
  garde: 'M12 3 4.5 6v6c0 4.4 3.1 7.9 7.5 9 4.4-1.1 7.5-4.6 7.5-9V6z',
  memoire: 'M12 2s3 3.5 3 6a3 3 0 1 1-6 0c0-2.5 3-6 3-6M9 14h6v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z',
  verrou: 'M6 10h12v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM8.5 10V7a3.5 3.5 0 0 1 7 0v3M12 14v3',
  sante: 'M12 20.5S3.5 15 3.5 9A4.5 4.5 0 0 1 12 6.8 4.5 4.5 0 0 1 20.5 9c0 6-8.5 11.5-8.5 11.5',
  soin: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  temps: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3.5 2',
  monde: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c2.5 2.4 3.8 5.5 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.5-3.8-9s1.3-6.6 3.8-9',
  vehicule: 'M4 16v-3l2-5h12l2 5v3M3 16h18v2h-3v-2M6 18v-2H3M7 13h.01M17 13h.01',
  savoir: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 0 4 20.5',
  amour: 'M12 20.5S3.5 15 3.5 9A4.5 4.5 0 0 1 12 6.8 4.5 4.5 0 0 1 20.5 9c0 6-8.5 11.5-8.5 11.5',
  crime: 'M3 11h18M6.5 11 8 7h8l1.5 4M6 11v2.5a2.5 2.5 0 0 0 5 0V11M13 11v2.5a2.5 2.5 0 0 0 5 0V11',
  gloire: 'M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.2l5.9-.8z',
  enfant: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 21c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5M10 7.5h.01M14 7.5h.01',
  reglage: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  plus: 'M12 5v14M5 12h14',
};

/**
 * L'emoji reçu par un écran, et le dessin qui le remplace quand il en a un.
 *
 * Volontairement partielle : deux cent trois emoji distincts sont employés,
 * et en dessiner la totalité d'un coup donnerait deux cents formes bâclées
 * plutôt que quarante justes. Ce qui n'est pas ici retombe sur l'emoji, ce
 * qui est un état de transition assumé et mesuré (`icones.test.ts`).
 */
const FROM_EMOJI: Record<string, string> = {
  '🚪': 'sortie', '🤝': 'accord', '💰': 'argent', '⚖️': 'balance', '🎲': 'hasard',
  '🎯': 'cible', '💸': 'perte', '📉': 'perte', '📈': 'gain', '🎓': 'diplome',
  '⏳': 'duree', '🕊️': 'paix', '🔧': 'outil', '💼': 'metier', '👥': 'gens',
  '🏦': 'banque', '🏠': 'logement', '🏡': 'logement', '🎭': 'scene', '📜': 'acte',
  '💶': 'billet', '💵': 'billet', '💬': 'parole', '🏷️': 'etiquette', '🏫': 'ecole',
  '🧾': 'facture', '🧭': 'repere', '🛣️': 'route', '🛡️': 'garde', '🕯️': 'memoire',
  '🔒': 'verrou', '🩺': 'sante', '❤️': 'amour', '💞': 'amour', '💖': 'amour',
  '➕': 'plus', '⚙️': 'reglage', '🌍': 'monde', '🌎': 'monde', '🌏': 'monde',
  '🚗': 'vehicule', '🚙': 'vehicule', '📚': 'savoir', '📖': 'savoir',
  '🕶️': 'crime', '⭐': 'gloire', '🌟': 'gloire', '👶': 'enfant', '🧒': 'enfant',
  '⏰': 'temps', '🕰️': 'temps', '💊': 'soin', '🏥': 'soin',
};

/** Le dessin correspondant à un emoji, ou rien s'il n'en a pas encore. */
export function iconFor(emoji: string): string | null {
  return FROM_EMOJI[emoji] ?? null;
}

/** Combien d'emoji distincts ont leur dessin — lu par le test de couverture. */
export const DRAWN = Object.keys(PATHS).length;
export const MAPPED = Object.keys(FROM_EMOJI).length;

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...STROKE}
    >
      <path d={d} />
    </svg>
  );
}
