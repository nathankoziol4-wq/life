import type { ReactNode } from 'react';

/**
 * Le jeu d'icônes, dessiné ici plutôt qu'emprunté à la police système.
 *
 * **Ce que l'emoji coûtait.** Il rendait différemment sur chaque plateforme —
 * un contrat qu'on ne maîtrise pas — il ne prend pas la couleur du texte, et
 * il porte un style figuratif qui jure avec une interface au trait. Le jeu en
 * emploie plus de quinze cents ; ils ont tous leur dessin.
 *
 * **Un tracé sert plusieurs emoji, et c'est voulu.** `🏆`, `🏅`, `🎖️` et `🎗️`
 * disent tous « distinction » : leur donner quatre dessins différents
 * produirait quatre fois le même signe avec du bruit autour. Le partage est
 * la règle du jeu, pas une économie de travail.
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
  perte: 'M4 5v14h16M7.5 8 18 16.5M12.5 16.5H18V11',
  gain: 'M4 5v14h16M7.5 16.5 18 8M12.5 8H18v5.5',
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
  graphique: 'M4 20V4M4 20h16M8 20v-6M12 20v-9M16 20v-4',
  annonce: 'M3 10v4h3l6 4V6L6 10zM17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12',
  regard: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
  cache: 'M4 5l16 14M6 8.5C3.7 10.1 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1M9.8 6.3A11 11 0 0 1 12 6c6.5 0 10 6 10 6a19 19 0 0 1-3 3.4',
  nuit: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5',
  pousse: 'M12 21v-8M12 13C12 9 9 6 5 6c0 4 3 7 7 7M12 13c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6',
  sport: 'M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10',
  calendrier: 'M4 6h16v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 10h16M8 3v5M16 3v5M8 14h.01M12 14h.01M16 14h.01',
  couronne: 'M4 17h16l1.5-9-5 3.5L12 5 7.5 11.5 2.5 8zM4 20h16',
  cle: 'M15.5 3a5.5 5.5 0 1 0-4.2 9L10 13.3 8.5 12 7 13.5 8.5 15 7 16.5 4 19v2h3l7.8-7.8A5.5 5.5 0 0 0 15.5 3M16.5 7.5h.01',
  personne: 'M12 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M6 21c0-3.6 2.7-6 6-6s6 2.4 6 6',
  pansement: 'M8 3.5 3.5 8a3.5 3.5 0 0 0 0 5l7.5 7.5 4.5-4.5a3.5 3.5 0 0 0 0-5zM9 12h.01M12 9h.01M12 15h.01M15 12h.01',
  echelle: 'M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10',
  plage: 'M3 20h18M12 20V9M12 9c-3.5-3.5-8 0-8 0s4.5 3.5 8 0M12 9c3.5-3.5 8 0 8 0s-4.5 3.5-8 0',
  immeuble: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 21V10h4a1 1 0 0 1 1 1v10M3 21h18M7 8h.01M11 8h.01M7 12h.01M11 12h.01M7 16h.01M11 16h.01',
  alerte: 'M12 3 2.5 20h19zM12 10v4M12 17h.01',
  miroir: 'M7 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M10 21h4M12 16v5',
  calcul: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1M4 9h16M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01',
  eclair: 'M13 2 4 14h7l-1 8 9-12h-7z',
  valide: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M8 12.5l2.5 2.5L16 9.5',
  calme: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4M12 8v6M8 21l4-7 4 7M5 12h14',
  pierre: 'M5 15 8 6l8-2 4 7-3 8H8z',
  costume: 'M9 3 12 8l3-5 4 2.5V21H5V5.5zM12 8v13',
  camion: 'M2 6h11v11H2zM13 10h4l3 3.5V17h-7M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
  epingle: 'M12 21s7-6.3 7-11.5a7 7 0 1 0-14 0C5 14.7 12 21 12 21M12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
  ecrire: 'M4 20h4L20 8l-4-4L4 16zM14.5 5.5 18.5 9.5',
  repeter: 'M4 9h12a4 4 0 0 1 0 8H8m-4-8 3-3M4 9l3 3',
  moins: 'M5 12h14',
  lettre: 'M3 6h18v12H3zM3 7l9 6 9-6',
  noce: 'M12 21S4 15.5 4 10a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11M12 3v3',
  regle: 'M3 15 15 3l6 6L9 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  bagage: 'M4 8h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M9 12v5M15 12v5',
  loupe: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16M17 17l4 4',
  urne: 'M4 10h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 10V4h6v6M10 14h4',
  esprit: 'M12 3a6 6 0 0 0-4.5 10 3 3 0 0 0 1.5 5.5V21h6v-2.5A3 3 0 0 0 16.5 13 6 6 0 0 0 12 3M12 9v4',
  biberon: 'M9 21h6a1 1 0 0 0 1-1v-9H8v9a1 1 0 0 0 1 1M8 11h8M11 3h2v3l1.5 2h-5L11 6z',
  cadeau: 'M3 10h18v3H3zM4.5 13v7a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-7M12 10v11M12 10c-2.5 0-4.5-1-4.5-2.5S9 5 12 10M12 10c2.5 0 4.5-1 4.5-2.5S15 5 12 10',
  siege: 'M6 3h12v9H6zM6 12v9M18 12v9M4 12h16',
  interdit: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M5.6 5.6l12.8 12.8',
  liste: 'M8 3h8a1 1 0 0 1 1 1v1h2v16H5V5h2V4a1 1 0 0 1 1-1M9 10h6M9 14h6M9 18h4',
  trophee: 'M7 4h10v6a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M10 15v3h4v-3M8 21h8',
  etreinte: 'M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6M16 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6M3 21c0-3 2.2-5 5-5 1.6 0 3 .6 4 1.6 1-1 2.4-1.6 4-1.6 2.8 0 5 2 5 5',
  cinema: 'M3 6h18v14H3zM3 10h18M7 6l-1 4M12 6l-1 4M17 6l-1 4',
  ciseaux: 'M6.5 4 17 17M17.5 4 7 17M6 17a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M18 17a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
  force: 'M4 12a3 3 0 0 1 3-3h2V6a3 3 0 0 1 6 0v3h2a3 3 0 0 1 0 6h-2v3a3 3 0 0 1-6 0v-3H7a3 3 0 0 1-3-3',
  avion: 'M12 3c.9 0 1.5 1.1 1.5 2.8v3l6.5 3.7v1.9l-6.5-1.9v3.7l2.2 1.6v1.4L12 19l-3.7.8v-1.4l2.2-1.6v-3.7L4 14.4v-1.9l6.5-3.7v-3C10.5 4.1 11.1 3 12 3z',
  telephone: 'M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5M10.5 18.5h3',
  animal: 'M6.4 8.5a1.6 1.9 0 1 1 3.2 0 1.6 1.9 0 1 1-3.2 0M9.7 6.5a1.6 1.9 0 1 1 3.2 0 1.6 1.9 0 1 1-3.2 0M13.1 6.5a1.6 1.9 0 1 1 3.2 0 1.6 1.9 0 1 1-3.2 0M16.4 8.5a1.6 1.9 0 1 1 3.2 0 1.6 1.9 0 1 1-3.2 0M8 15a4 3.2 0 1 1 8 0 4 3.2 0 1 1-8 0',
  carte: 'M4.5 6h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9A1.5 1.5 0 0 1 4.5 6M3 10h18M6 14h4',
  nettoyage: 'M5 10h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2M6.5 13.5h.01M10 15.5h.01M14 13h.01M17 16h.01M8 6.5a2 2 0 1 1 4 0 2 2 0 1 1-4 0M14.5 4.5a1.3 1.3 0 1 1 2.6 0 1.3 1.3 0 1 1-2.6 0',
  heredite: 'M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9M9.2 7h5.6M8.6 16.5h6.8',
  sourire: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17M8.5 14.5c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9 9.5h.01M15 9.5h.01',
  neutre: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17M8.8 15h6.4M9 9.5h.01M15 9.5h.01',
  souci: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17M8.5 16.2c.9-1.3 2.1-2 3.5-2s2.6.7 3.5 2M9 9.5h.01M15 9.5h.01',
  presage: 'M12 3.5a7 7 0 1 1 0 14 7 7 0 1 1 0-14M6.5 19.5h11M8 17.4l-1 2.1M16 17.4l1 2.1M9.5 8.5a3.5 3.5 0 0 1 3-2',
  fievre: 'M12 3.5a2 2 0 0 1 2 2v8.2a3.6 3.6 0 1 1-4 0V5.5a2 2 0 0 1 2-2M12 9v6M15 7h2M15 10h2',
  achat: 'M5.5 7.5h13l1 12.5h-15zM9 10V6a3 3 0 0 1 6 0v4',
  colis: 'M12 3l8 4.2v9.6L12 21l-8-4.2V7.2zM4 7.2l8 4.2 8-4.2M12 11.4V21',
  joyau: 'M7.5 3.5h9L21 9l-9 11.5L3 9zM3 9h18M7.5 3.5 10 9l2 11.5L14 9l2.5-5.5',
  velo: 'M2.5 15a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0M14.5 15a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0M6 15l3.5-6h5.5M9.5 9l4.5 6h4M15.5 8h2.5',
  lampe: 'M8.5 3h7v4l-1.2 1.4v11.1a1.5 1.5 0 0 1-1.5 1.5h-1.6a1.5 1.5 0 0 1-1.5-1.5V8.4L8.5 7zM8.5 5.2h7M12 11.5v2.5',
  main: 'M9 11V5.2a1.6 1.6 0 0 1 3.2 0V10M12.2 10V4.2a1.6 1.6 0 0 1 3.2 0V10M15.4 10.5V6.4a1.6 1.6 0 0 1 3.1 0v7.9c0 3.6-2.5 6.2-6.1 6.2-2.4 0-4-.9-5.2-2.6L4 13.4a1.6 1.6 0 0 1 2.6-1.9L9 14.4',
  mur: 'M3 5.5h18v13H3zM3 9.8h18M3 14.2h18M9 5.5v4.3M15 5.5v4.3M6 9.8v4.4M12 9.8v4.4M18 9.8v4.4M9 14.2v4.3M15 14.2v4.3',
  art: 'M12 3.5c5 0 9 3.4 9 7.6 0 2.6-2.2 3.6-3.8 3.6h-1.6c-1.3 0-2.3.9-2.3 2.1 0 .6.3 1 .3 1.6 0 1.1-.8 2.1-2 2.1-5 0-8.6-3.9-8.6-8.6 0-4.9 4-8.4 9-8.4M7.8 11.5h.01M9.5 8h.01M13 7h.01M16.5 9h.01',
  meteo: 'M9.5 5.5a3 3 0 0 1 5.9 1.3M12 2v1.4M7.8 3.8l1 1M17.2 3.8l-1 1M7.5 19a3.5 3.5 0 0 1-.4-7 5 5 0 0 1 9.6 1.2 3 3 0 0 1-.7 5.8z',
  feu: 'M12 3c3.2 3.2 5.5 5.6 5.5 9a5.5 5.5 0 0 1-11 0c0-2 .9-3.7 2.4-5.1.1 1.5.7 2.4 1.6 2.7.5-2.6.4-4.5 1.5-6.6M9.8 17.2a2.4 2.4 0 0 0 4.4-1.3c0-1-.6-1.9-2.2-3',
  presse: 'M4 5.5h13v14H5.5A1.5 1.5 0 0 1 4 18zM17 8.5h3V18a1.5 1.5 0 0 1-3 0M6.5 8.5h8M6.5 11.5h8M6.5 14.5h5',
  dossier: 'M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z',
  atlas: 'M9 4.5 3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8zM9 4.5v12.7M15 6.8v12.7',
  bas: 'M12 4v15M6 13.2l6 6 6-6',
  haut: 'M12 20V5M6 10.8l6-6 6 6',
  puzzle: 'M4 4.5h5.2a2 2 0 1 1 4 0H18a1.5 1.5 0 0 1 1.5 1.5v4.3a2 2 0 1 1 0 4v4.2a1.5 1.5 0 0 1-1.5 1.5h-4.2a2 2 0 1 0-4 0H5.5A1.5 1.5 0 0 1 4 18.5z',
  rupture: 'M12 20.4C7 17 3.5 13.2 3.5 9.6A4.1 4.1 0 0 1 12 7a4.1 4.1 0 0 1 8.5 2.6c0 3.6-3.5 7.4-8.5 10.8M12.6 7.2 10 11.2l3.4 1.9-2.6 4.1',
  institution: 'M3.5 9.5 12 4l8.5 5.5zM5.5 9.5v8M9.5 9.5v8M14.5 9.5v8M18.5 9.5v8M3 20.5h18',
  lecture: 'M8.5 5.5 18 12l-9.5 6.5z',
  photo: 'M4.5 7.5h3.2l1.6-2.4h5.4l1.6 2.4h3.2A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9a1.5 1.5 0 0 1 1.5-1.5M8.5 13.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0',
  disque: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 1 1 0-17M12 9.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 1 1 0-4.4',
  drapeau: 'M6 21V3.5M6 4.5h11.5l-2.2 3.6 2.2 3.6H6',
  repas: 'M12 6a6 6 0 1 1 0 12 6 6 0 1 1 0-12M3 3v4a1.5 1.5 0 0 0 3 0V3M4.5 7v14M21 3v18M21 11h-2.5V7A4 4 0 0 1 21 3',
  boisson: 'M7 3h10l-1.2 7A4 4 0 0 1 12 13a4 4 0 0 1-3.8-3zM12 13v6M8.5 21h7',
  gateau: 'M4 12.5h16V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 16.5h16M12 12.5V8M12 8c1.2-1 1.2-2.2 0-3.5-1.2 1.3-1.2 2.5 0 3.5',
  montagne: 'M2 20h20L14 5l-4.5 8L7 10z',
  bateau: 'M3 17c2 0 2 1.5 4.5 1.5S10 17 12 17s2 1.5 4.5 1.5S19 17 21 17M4.5 17l-1-5h17l-2 5M12 12V3l6 9',
  ordinateur: 'M3 5h18v11H3zM2 19h20M9.5 16l-.5 3M14.5 16l.5 3',
  jeu: 'M8 8h8a5 5 0 0 1 5 5v2a3 3 0 0 1-5.6 1.5L15 15H9l-.4 1.5A3 3 0 0 1 3 15v-2a5 5 0 0 1 5-5M6.5 11.5v2M5.5 12.5h2M16 11.5h.01M18 13.5h.01',
  musique: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0M9 9l10-2',
  science: 'M9.5 3v6.5L4.2 18A1.8 1.8 0 0 0 5.8 21h12.4a1.8 1.8 0 0 0 1.6-3L14.5 9.5V3M8 3h8M7 15h10',
  tableau: 'M3.5 4.5h17v15h-17zM3.5 15l4.5-4.5 3.5 3.5 3-3 6 6M15 6.4a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 1 1 0-2.6',
  vetement: 'M9 3 4 5.5l2 4 1.5-.8V21h9V8.7l1.5.8 2-4L15 3a3 3 0 0 1-6 0',
  lit: 'M2.5 6v13M2.5 11h16a3 3 0 0 1 3 3v5M21.5 15h-19M6 8a1.8 1.8 0 1 1 0 3.6A1.8 1.8 0 0 1 6 8M10 11h4.5',
  fete: 'M3 21 7.5 9l7.5 7.5zM9.5 12.5l2 2M15 3.5l1 2.5M19.5 4.5 17.5 7M21 10l-3 .5M13 6l2 .5',
  fusee: 'M12 2.5c3 2.7 4.5 6 4.5 9.5v3l-4.5 3-4.5-3v-3c0-3.5 1.5-6.8 4.5-9.5M12 8.5a2 2 0 1 1 0 4 2 2 0 1 1 0-4M7.5 14 5 17l1.5.5M16.5 14l2.5 3-1.5.5M10 18.5l2 3 2-3',
  idee: 'M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3M9.5 19h5M10.5 21h3',
  /*
   * **Les trois formes qui remplacent les pastilles de couleur.**
   *
   * `🟢 🔴 ⚪ ⬜ 🔵` ne disaient rien par leur forme : des disques identiques
   * dont toute l'information tenait à la teinte. Un joueur daltonien — un
   * homme sur douze — ne les distinguait pas, et un écran en noir et blanc
   * non plus. Le cercle vide et le cercle plein, eux, se distinguent sans
   * aucune couleur ; la couleur qui s'y ajoute devient un second canal, pas
   * le seul.
   */
  libre: 'M12 3.2a8.8 8.8 0 1 1 0 17.6 8.8 8.8 0 1 1 0-17.6',
  choisi: 'M12 3.2a8.8 8.8 0 1 1 0 17.6 8.8 8.8 0 1 1 0-17.6M12 7.8a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 1 1 0-8.4',
  question: 'M12 3.2a8.8 8.8 0 1 1 0 17.6 8.8 8.8 0 1 1 0-17.6M9.2 9.4a2.9 2.9 0 0 1 5.7.7c0 1.9-2.9 2.4-2.9 4.2M12 17.2h.01',
  goutte: 'M12 3.2c3.4 4 5.5 6.6 5.5 9.4a5.5 5.5 0 0 1-11 0c0-2.8 2.1-5.4 5.5-9.4M9.2 13.6a2.9 2.9 0 0 0 2.4 3.6',
  pas: 'M7.5 4.2c1.5 0 2.4 1.4 2.4 3.3 0 1.7-.5 3-.5 4.3 0 .9-.7 1.5-1.9 1.5s-1.9-.6-1.9-1.5c0-1.3-.5-2.6-.5-4.3 0-1.9.9-3.3 2.4-3.3M5.6 15.6c0 1.4.8 2.1 1.9 2.1s1.9-.7 1.9-2.1M16.5 8.9c1.5 0 2.4 1.4 2.4 3.3 0 1.7-.5 3-.5 4.3 0 .9-.7 1.5-1.9 1.5s-1.9-.6-1.9-1.5c0-1.3-.5-2.6-.5-4.3 0-1.9.9-3.3 2.4-3.3M14.6 20.3c0 1 .8 1.5 1.9 1.5',
  soleil: 'M12 7.6a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 1 1 0-8.8M12 2v2.6M12 19.4V22M4.2 4.2l1.9 1.9M17.9 17.9l1.9 1.9M2 12h2.6M19.4 12H22M4.2 19.8l1.9-1.9M17.9 6.1l1.9-1.9',
  police: 'M3.5 16.5h17M6 16.5v2H4.2v-2M19.8 16.5v2H18v-2M4 16.5l1.5-4.8a2 2 0 0 1 1.9-1.4h9.2a2 2 0 0 1 1.9 1.4l1.5 4.8M10 8.5V6.5h4v2M6.5 13.5h11',
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
  '📊': 'graphique', '💹': 'gain', '🧮': 'calcul', '📐': 'regle', '📏': 'regle',
  '🏋️': 'sport', '⚽': 'sport', '💪': 'force', '✊': 'force', '🧘': 'calme',
  '🙈': 'cache', '🫥': 'cache', '🕳️': 'cache', '👁️': 'regard', '👀': 'regard',
  '📣': 'annonce', '🗣️': 'parole', '🎤': 'parole', '🎙️': 'parole',
  '🌙': 'nuit', '🌱': 'pousse', '🌿': 'pousse', '🌤️': 'meteo', '🔥': 'feu',
  '🏘️': 'logement', '🏢': 'immeuble', '🏙️': 'immeuble', '🧱': 'mur',
  '🔑': 'cle', '📅': 'calendrier', '👑': 'couronne', '🪜': 'echelle',
  '🧑': 'personne', '🧍': 'personne', '🚶': 'personne', '🧑‍🤝‍🧑': 'gens',
  '👨‍👩‍👧': 'gens', '🫂': 'etreinte', '🤗': 'etreinte',
  '📘': 'savoir', '📕': 'savoir', '👩‍🏫': 'ecole', '🎒': 'bagage', '🧳': 'bagage',
  '⚠️': 'alerte', '🚨': 'alerte', '🚫': 'interdit', '🚷': 'interdit', '🚭': 'interdit',
  '🏖️': 'plage', '🏝️': 'plage', '🩹': 'pansement', '🌡️': 'fievre', '🧬': 'heredite',
  '🪞': 'miroir', '⚡': 'eclair', '✅': 'valide', '🪨': 'pierre', '🧊': 'pierre',
  '🕴️': 'costume', '🧑‍💼': 'costume', '👔': 'costume', '🎩': 'costume',
  '🚚': 'camion', '🚌': 'camion', '🚇': 'route', '🚘': 'vehicule', '🅿️': 'repere',
  '📌': 'epingle', '📍': 'epingle', '✍️': 'ecrire', '📝': 'ecrire',
  '🔁': 'repeter', '↩️': 'repeter', '🔀': 'repeter', '➖': 'moins',
  '✉️': 'lettre', '💒': 'noce', '💍': 'noce', '💘': 'amour', '🤍': 'amour',
  '💔': 'rupture', '🔍': 'loupe', '🗳️': 'urne', '🏺': 'urne', '🫙': 'urne',
  '🪣': 'urne', '🧠': 'esprit', '💭': 'esprit', '🍼': 'biberon', '🎁': 'cadeau',
  '🪑': 'siege', '🛋️': 'siege', '📋': 'liste', '🗂️': 'dossier', '📁': 'dossier',
  '💾': 'dossier', '🏆': 'trophee', '🏅': 'trophee', '🎖️': 'trophee', '🎗️': 'trophee',
  '🎬': 'cinema', '▶️': 'lecture', '✂️': 'ciseaux', '🛠️': 'outil', '🔨': 'outil',
  '✈️': 'avion', '📱': 'telephone', '🐕': 'animal', '🐾': 'animal',
  '🪪': 'carte', '💳': 'carte', '🧽': 'nettoyage', '🫧': 'nettoyage',
  '😏': 'sourire', '😂': 'sourire', '😐': 'neutre', '😟': 'souci', '😬': 'souci',
  '😠': 'souci', '🔮': 'presage', '🤞': 'hasard', '🎰': 'hasard',
  '🛍️': 'achat', '🛒': 'achat', '📦': 'colis', '💎': 'joyau', '🪙': 'argent',
  '👛': 'argent', '🚲': 'velo', '🔦': 'lampe', '🫱': 'main', '🤲': 'main',
  '👋': 'main', '👆': 'main', '🙏': 'main', '🫡': 'main', '🙋': 'main',
  '🎨': 'art', '🗞️': 'presse', '🗺️': 'atlas', '⬇️': 'bas', '⬆️': 'haut',
  '🧩': 'puzzle', '🏛️': 'institution', '📷': 'photo', '💿': 'disque',
  '🚩': 'drapeau', '🚔': 'police', '✨': 'gloire', '🪦': 'memoire',
  '📄': 'acte', '🛂': 'acte', '🎟️': 'etiquette', '🎛️': 'reglage',
  '🪩': 'scene', '🎪': 'scene', '☀️': 'soleil',
  // La quatrième écriture : les événements disent `icon`, pas `emoji`. Le
  // recensement ne la lisait pas, et ces signes se voyaient au centre de
  // chaque modale, à quarante-deux pixels.
  '📞': 'telephone', '☎️': 'telephone', '📲': 'telephone', '📩': 'lettre',
  '📮': 'lettre', '⛈️': 'meteo', '🐦': 'animal', '🐚': 'animal',
  '🧓': 'personne', '👴': 'personne', '🙅': 'interdit', '🚸': 'enfant',
  '🔊': 'annonce', '🎫': 'etiquette', '💧': 'goutte', '👣': 'pas',
  '👅': 'repas', '🥄': 'repas', '🍪': 'gateau', '🧑‍🍳': 'repas',
  '🚼': 'biberon', '🌗': 'nuit', '🚽': 'nettoyage', '🛁': 'nettoyage',
  '🖍️': 'ecrire', '🤥': 'cache', '👻': 'esprit', '🛴': 'velo',
  '🥊': 'force', '🔭': 'regard', '📸': 'photo', '💋': 'amour',
  '💃': 'musique', '📇': 'dossier',
  // Les états, dits par la forme : cercle vide, cercle plein, point
  // d'interrogation. Voir la note au-dessus des tracés.
  '⚪': 'libre', '⬜': 'libre', '🔘': 'choisi',
  // Deuxième lot : les tables de `systems/` et `data/`, que le recensement
  // ne voyait pas tant qu'il ne lisait que les `.tsx`.
  '🍽️': 'repas', '🍴': 'repas', '🍝': 'repas', '🥣': 'repas', '🥗': 'repas',
  '🍔': 'repas', '🍟': 'repas', '🍗': 'repas', '🥖': 'repas', '🍞': 'repas',
  '🥐': 'repas', '🍳': 'repas', '🍇': 'repas', '👨‍🍳': 'repas',
  '☕': 'boisson', '🫖': 'boisson', '🍷': 'boisson', '🥂': 'boisson',
  '🍸': 'boisson', '🍻': 'boisson', '🍾': 'boisson', '🍰': 'gateau', '🎂': 'gateau',
  '🌾': 'pousse', '🌳': 'pousse', '🌼': 'pousse', '🪴': 'pousse', '🥀': 'pousse',
  '💐': 'pousse', '🏔️': 'montagne', '⛰️': 'montagne', '🗿': 'pierre', '🪵': 'pierre',
  '🌊': 'plage', '⛵': 'bateau', '🛳️': 'bateau', '🚣': 'bateau', '🛟': 'bateau',
  '🚢': 'bateau', '🌧️': 'meteo', '❄️': 'meteo', '🌀': 'meteo', '🌪️': 'meteo',
  '☂️': 'meteo', '💨': 'meteo', '🌆': 'immeuble', '🌃': 'immeuble', '🌑': 'nuit',
  '🚀': 'fusee', '🛰️': 'fusee', '☄️': 'fusee',
  '💻': 'ordinateur', '🖥️': 'ordinateur', '⌨️': 'ordinateur',
  '🧰': 'outil', '🪚': 'outil', '🔩': 'outil', '⛏️': 'outil', '🔪': 'outil',
  '🧶': 'outil', '🧵': 'outil', '🧹': 'nettoyage', '🧼': 'nettoyage',
  '🧴': 'nettoyage', '🚿': 'nettoyage', '🧺': 'nettoyage',
  '🏭': 'immeuble', '🏗️': 'immeuble', '🏬': 'immeuble', '🏪': 'immeuble',
  '🏨': 'immeuble', '🏰': 'institution', '⛪': 'institution', '🏚️': 'logement',
  '🛖': 'logement', '🪟': 'logement',
  '🚜': 'camion', '🚛': 'camion', '🚒': 'camion', '🚑': 'camion',
  '🚕': 'vehicule', '🚐': 'vehicule', '🛵': 'velo', '🚴': 'velo',
  '🚆': 'route', '🛤️': 'route',
  '🎮': 'jeu', '♟️': 'jeu', '🎸': 'musique', '🎻': 'musique', '🎹': 'musique',
  '🎵': 'musique', '🎧': 'musique', '📻': 'musique', '⚔️': 'force',
  '🔬': 'science', '🧪': 'science', '⚗️': 'science', '💉': 'soin', '🦴': 'soin',
  '🫁': 'soin', '🫀': 'sante', '🩸': 'sante', '🦷': 'soin', '🦵': 'soin',
  '🫘': 'soin', '📺': 'cinema', '🎥': 'cinema', '🎞️': 'cinema', '🍿': 'cinema',
  '📰': 'presse', '📓': 'savoir', '📗': 'savoir', '🖼️': 'tableau', '🖌️': 'art',
  '👵': 'personne', '👤': 'personne', '🧔': 'personne', '🙍': 'personne',
  '🙇': 'personne', '🥷': 'personne', '👃': 'personne', '👂': 'personne',
  '♿': 'personne', '🤵': 'costume', '👮': 'police', '🧑‍⚖️': 'balance',
  '🧑‍🏫': 'ecole', '👨‍👩‍👧‍👦': 'gens', '👧🧒': 'gens',
  '👗': 'vetement', '🧥': 'vetement', '👟': 'vetement', '🥾': 'vetement',
  '🧤': 'vetement', '🥼': 'vetement', '🩰': 'vetement', '👜': 'bagage',
  '💇': 'ciseaux', '💈': 'ciseaux', '💅': 'miroir', '💆': 'calme',
  '🏃': 'sport', '🏊': 'sport', '🥋': 'sport', '🤸': 'sport', '🏀': 'sport',
  '🎾': 'sport', '🏉': 'sport', '🏐': 'sport', '🤺': 'sport', '🧗': 'sport',
  '🪂': 'sport', '🏟️': 'sport', '🧘‍♀️': 'calme', '⛺': 'plage', '🏕️': 'plage',
  '🛏️': 'lit', '😴': 'lit', '⌚': 'temps', '🕛': 'temps',
  '🧸': 'enfant', '🎉': 'fete', '🎈': 'fete', '🎆': 'fete', '🎡': 'fete',
  '😘': 'sourire', '🙂': 'sourire', '😇': 'sourire', '😄': 'sourire', '😜': 'sourire',
  '🤔': 'neutre', '😤': 'souci', '😈': 'souci', '🤬': 'souci', '😖': 'souci',
  '😰': 'souci', '🥴': 'souci', '🤢': 'souci', '🤧': 'souci', '🤒': 'souci',
  '🤕': 'souci', '😮‍💨': 'souci', '🤐': 'cache', '🤫': 'cache',
  '💗': 'amour', '💝': 'amour', '💓': 'amour', '💠': 'joyau',
  '🗝️': 'cle', '🔐': 'verrou', '🔗': 'accord', '📬': 'lettre', '📧': 'lettre',
  '📎': 'epingle', '🗃️': 'dossier', '🗄️': 'dossier', '📿': 'memoire',
  '🐈': 'animal', '🐇': 'animal', '🐹': 'animal', '🦜': 'animal', '🐠': 'animal',
  '🐎': 'animal', '🐍': 'animal', '🐢': 'animal', '🐐': 'animal', '🦁': 'animal',
  '🕷️': 'animal', '🐶': 'animal', '🐕‍🦺': 'animal',
  '🔋': 'eclair', '🔌': 'eclair', '💥': 'eclair', '🪧': 'annonce',
  '📢': 'annonce', '🛎️': 'annonce', '🔔': 'annonce', '🛑': 'interdit', '🚬': 'interdit',
  '🆘': 'alerte', '❓': 'esprit', '🗯️': 'parole', '↔️': 'repeter',
  '🌐': 'monde', '🔎': 'loupe', '🏮': 'lampe', '👊': 'force', '🤜': 'force',
  '✋': 'main', '🖋️': 'ecrire', '💢': 'eclair',
  // Troisième lot : les signes écrits dans une expression, `emoji={…}`.
  '🌥️': 'meteo', '😨': 'souci', '🗡️': 'force', '❔': 'question', '✖️': 'interdit',
  '✔️': 'valide', '👨‍👩‍👦': 'gens', '🫵': 'main', '💡': 'idee', '👩': 'personne',
  '👨': 'personne', '🥇': 'trophee', '🕘': 'temps', '📨': 'lettre',

  // Le fil de vie et les états vides nomment leur signe autrement que les
  // lignes (`emoji: '…'` dans une table, pas `emoji="…"` dans un écran) : le
  // recensement ne les voyait pas, et ce sont les vues les plus regardées.
  '👪': 'gens', '✦': 'eclair', '😊': 'sourire', '🍺': 'calme',
  '🌩️': 'meteo', '☯️': 'calme',
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
      /*
       * Le nom du signe, laissé dans le DOM à dessein.
       *
       * Le test de fumée reconnaissait certaines lignes à leur emoji — une
       * réponse d'entretien commençait par `💬`. Ce marqueur a disparu du
       * texte le jour où l'emoji est devenu un dessin, et deux parcours se
       * sont arrêtés en silence. Viser le sens (`[data-icon="parole"]`) tient
       * mieux qu'un caractère dans un libellé : le libellé peut être
       * retraduit, le dessin peut être redessiné, le sens reste.
       */
      data-icon={name}
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

/**
 * Le signe d'une ligne : un dessin quand il existe, l'emoji sinon.
 *
 * **Pourquoi un repli et non un remplacement sec.** Deux cent trois emoji
 * distincts sont employés dans le jeu ; en dessiner la totalité d'un coup
 * donnerait deux cents formes bâclées plutôt qu'une quarantaine de justes.
 * Le repli permet de dessiner par lots sans qu'aucun écran ne soit jamais
 * cassé entre deux lots.
 *
 * Le conteneur garde la même classe dans les deux cas : la mise en page d'une
 * ligne ne doit pas dépendre de ce qui a déjà été dessiné, sans quoi une
 * icône ajoutée déplacerait le texte de la ligne qui la reçoit.
 */
export function Glyph({
  emoji,
  className,
  size,
}: {
  emoji: ReactNode;
  className?: string;
  /**
   * À passer là où l'emoji était plus gros que le corps du texte. Un état
   * vide affichait son emoji à 44 px ; un dessin de 20 px à la même place
   * paraîtrait perdu au milieu de la page — la substitution doit tenir la
   * même surface que ce qu'elle remplace, sinon elle déséquilibre l'écran.
   */
  size?: number;
}) {
  /*
   * `emoji` est un `ReactNode` et non une chaîne : quelques écrans y passent
   * un élément — une pastille, un avatar calculé. On ne cherche un dessin que
   * pour une chaîne, et le reste traverse tel quel.
   */
  const name = typeof emoji === 'string' ? iconFor(emoji) : null;
  return (
    <span className={className} aria-hidden="true">
      {name ? <Icon name={name} size={size} /> : emoji}
    </span>
  );
}
