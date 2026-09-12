/**
 * Le portrait du personnage : une tête, et rien d'autre.
 *
 * **Ce qu'il remplace.** L'en-tête et la fiche montraient un emoji choisi sur
 * deux critères — l'âge et le sexe — soit dix visages possibles pour tout le
 * jeu. Deux personnages nés le même jour étaient le même dessin, alors que le
 * moteur leur avait déjà donné un teint, une couleur d'yeux, une coiffure et
 * des traits distincts. L'information existait ; rien ne la montrait.
 *
 * **Aucune donnée n'est inventée ici.** Tout vient d'`Appearance`
 * (`engine/origin.ts`), tirée à la naissance et dérivée des parents, et de
 * l'état de la partie. Ce fichier ne fait que traduire des mots — « mate »,
 * « auburn », « bouclés » — en géométrie et en couleurs.
 *
 * **Pourquoi du SVG écrit à la main.** Le projet n'a que `react` et
 * `react-dom` en dépendances d'exécution ; c'est une contrainte qu'on tient
 * depuis le début et qui vaut mieux qu'une bibliothèque de portraits.
 *
 * **Trois verdicts, et la référence qui tranche.**
 *
 * « Ça se voit que c'est de l'IA, c'est du gribouillage » a été dit trois fois
 * de suite, de trois versions différentes : une version en boîtes — des
 * ellipses et des rectangles arrondis empilés —, une version au Bézier à plat,
 * et une version cernée d'encre. À chaque fois j'ai deviné l'axe de la
 * correction, et à chaque fois je me suis trompé ; la dernière allait
 * carrément dans la direction opposée à ce qui était demandé.
 *
 * L'image de référence fournie par l'auteur du jeu dit ceci, et le dessin s'y
 * plie maintenant point par point :
 *
 * 1. **Aucun contour.** Pas un trait d'encre nulle part. Le volume est porté
 *    par des **dégradés** — clair en haut à gauche, sombre sur les bords.
 * 2. **Une tête ronde.** Largeur et hauteur presque égales, des joues pleines,
 *    un petit menton. Pas l'ovale allongé des versions précédentes.
 * 3. **De grands yeux ronds**, à l'iris large, avec un gros éclat blanc et un
 *    second plus petit en bas. La paupière ne mord pas l'œil au repos : le
 *    blanc fait un anneau complet autour de l'iris, sinon le regard part vers
 *    le haut.
 * 4. **Une calotte de cheveux lisse et brillante**, avec un reflet, qui couvre
 *    presque tout le front. Pas des mèches séparées.
 * 5. **Une petite bouche ouverte** avec une bande de dents blanches.
 * 6. **Des joues roses** fondues, pas des pastilles à bord net.
 *
 * **Déterministe, et c'est la condition de la cohérence.** Aucun tirage n'a
 * lieu dans ce fichier : le même personnage donne toujours le même dessin, et
 * changer une seule caractéristique ne change qu'une seule chose à l'écran.
 *
 * **Ni cou ni épaules : une tête seule.** La demande initiale disait « tête +
 * cou + épaules » ; la référence fournie ensuite est une tête qui remplit son
 * cadre, et c'est elle qui tranche. Une conséquence, signalée plutôt que
 * masquée : l'axe « vêtements visibles au niveau des épaules » disparaît avec
 * elles. `Col` et `colDe` restent — l'état de la vie est toujours calculé —
 * pour que le col revienne sans rien reconstruire le jour où on le voudra.
 *
 * Le dessin se met au point dans `tools/portrait-atelier.mjs`, qui rend les
 * sept coiffures, les cinq humeurs et les sept teints côte à côte dans un vrai
 * navigateur. Tous les défauts trouvés jusqu'ici l'ont été en regardant un
 * rendu, aucun en relisant des coordonnées.
 */

import type { ReactNode } from 'react';
import type { Player } from '../../engine/types.ts';

/* ------------------------------------------------------------------ */
/* Les palettes : des mots vers des couleurs                           */
/* ------------------------------------------------------------------ */

/**
 * Les clés sont exactement les valeurs de `data/cradle.ts`. Un mot qui n'y
 * figurerait pas retombe sur la première entrée plutôt que de ne rien
 * dessiner : un portrait sans peau serait un trou dans l'interface, là où un
 * teint approché reste un visage. Un test relie les deux fichiers, parce que
 * ce repli est parfaitement muet.
 *
 * Trois tons par teint : la chair, son ombre, et le creux qui sert aux traits
 * fins — l'ourlet de l'oreille, le dessous du nez.
 */
const PEAU: Record<string, [string, string, string]> = {
  'très claire': ['#f6dcc8', '#e0b699', '#c99878'],
  claire: ['#eec9a6', '#d7a67c', '#bd8a60'],
  mate: ['#dca675', '#bf8853', '#a46f40'],
  dorée: ['#ce9761', '#ae7a46', '#946235'],
  brune: ['#a76f3d', '#88552e', '#6f4423'],
  foncée: ['#7b4a24', '#61371a', '#4c2a13'],
  'très foncée': ['#56331e', '#402415', '#31190d'],
};

/** La chevelure, son ombre — qui sert aussi aux sourcils — et son reflet. */
const CHEVEUX: Record<string, [string, string, string]> = {
  bruns: ['#493423', '#2f2116', '#6a5038'],
  châtains: ['#6e4d2d', '#4b331e', '#8e6c46'],
  noirs: ['#221e1d', '#100d0d', '#3d3634'],
  blonds: ['#dfa62f', '#b8811c', '#f0c85e'],
  roux: ['#b3541e', '#813a11', '#d17a3c'],
  auburn: ['#7b391b', '#54250f', '#9c5330'],
  'poivre et sel': ['#8e8c88', '#6a6764', '#b4b2ae'],
};

const YEUX: Record<string, string> = {
  marron: '#6b4423',
  noisette: '#9a7b3f',
  verts: '#3f6f43',
  bleus: '#3f6ea6',
  gris: '#6f7d86',
  ambre: '#ab7424',
  noirs: '#241f1c',
};

/**
 * La forme du visage, en trois mesures.
 *
 * `l` est la demi-largeur aux tempes, `machoire` la part de cette largeur que
 * garde la mâchoire, `menton` la hauteur du bas du visage. Mesuré dans un vrai
 * navigateur, la mâchoire varie de 46 à 72 points sur une grille de 200 : les
 * six formes se distinguent réellement, ce dont j'avais douté à tort une fois
 * déjà avant d'aller mesurer.
 */
const VISAGE: Record<string, { l: number; machoire: number; menton: number }> = {
  ovale: { l: 72, machoire: 0.8, menton: 186 },
  ronde: { l: 77, machoire: 0.9, menton: 178 },
  carrée: { l: 75, machoire: 0.98, menton: 181 },
  allongée: { l: 68, machoire: 0.76, menton: 192 },
  'en cœur': { l: 75, machoire: 0.66, menton: 184 },
  anguleuse: { l: 72, machoire: 0.7, menton: 188 },
};

/* ------------------------------------------------------------------ */
/* Ce que le portrait sait dire                                        */
/* ------------------------------------------------------------------ */

/** L'humeur du visage. Elle vient de l'état, jamais d'un tirage. */
export type Humeur = 'joie' | 'calme' | 'lassitude' | 'peine' | 'mal';

/** Ce qu'on voit aux épaules. Cela dit la vie, pas la mode. */
export type Col = 'nu' | 'simple' | 'ecole' | 'travail' | 'detenu' | 'age';

export interface Traits {
  sexe: 'M' | 'F';
  age: number;
  peau: string;
  cheveux: string;
  coiffure: string;
  /** La pilosité du visage — le seul trait qui apparaît avec l'âge. */
  pilosite: string;
  yeux: string;
  visage: string;
  /** Les particularités d'`Appearance` : taches de rousseur, cicatrice… */
  signes: string[];
  humeur: Humeur;
  col: Col;
}

/**
 * L'humeur se lit dans les statistiques, dans cet ordre : ce qui fait le plus
 * mal l'emporte. Un personnage très malheureux mais en bonne santé fait la
 * tête ; un personnage mourant la fait aussi, et c'est la santé qui gagne —
 * on ne sourit pas poliment quand on souffre.
 */
export function humeurDe(p: Player): Humeur {
  if (p.stats.health < 25) return 'mal';
  if (p.stats.happiness < 22) return 'peine';
  if (p.stats.happiness < 45) return 'lassitude';
  if (p.stats.happiness > 74) return 'joie';
  return 'calme';
}

/**
 * Le col dit où en est la vie. C'est l'information que l'en-tête donnait déjà
 * en toutes lettres — « École primaire », « Détenu » — et la reprendre en
 * image évite de la lire deux fois.
 */
export function colDe(p: Player): Col {
  if (p.age < 3) return 'nu';
  if (p.prison) return 'detenu';
  if (p.job) return 'travail';
  if (p.retired || p.age >= 66) return 'age';
  if (p.education.stage !== 'none' && p.education.stage !== 'dropout') return 'ecole';
  return 'simple';
}

/** Les traits d'un joueur, sans aucune décision prise ici. */
export function traitsDe(p: Player): Traits {
  const a = p.appearance;
  return {
    sexe: p.sex === 'F' ? 'F' : 'M',
    age: p.age,
    peau: a.skinTone,
    cheveux: a.hairColor,
    coiffure: a.hairStyle,
    /* Les parties enregistrées avant l'ajout de ce champ n'en ont pas. */
    pilosite: a.facialHair ?? 'rasé',
    yeux: a.eyeColor,
    visage: a.faceShape,
    signes: a.features,
    humeur: humeurDe(p),
    col: colDe(p),
  };
}

/* ------------------------------------------------------------------ */
/* Le dessin                                                           */
/* ------------------------------------------------------------------ */

const canal = (hex: string, i: number) => Number.parseInt(hex.replace('#', '').slice(i, i + 2), 16);
const hexe = (c: number[]) =>
  `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Mélanger vers le blanc. */
function eclaircir(hex: string, t: number): string {
  return hexe([0, 2, 4].map((i) => canal(hex, i) + (255 - canal(hex, i)) * t));
}

/** Mélanger deux couleurs. Sert au grisonnement des cheveux et du poil. */
function melange(a: string, b: string, t: number): string {
  return hexe([0, 2, 4].map((i) => canal(a, i) + (canal(b, i) - canal(a, i)) * t));
}

/** Mélanger vers le noir. */
function assombrir(hex: string, t: number): string {
  return hexe([0, 2, 4].map((i) => canal(hex, i) * (1 - t)));
}

/**
 * Un identifiant de dégradé stable, dérivé des couleurs.
 *
 * Un identifiant fixe ferait que deux portraits de teints différents se
 * voleraient leur dégradé : le premier rendu de la page gagne, et tous les
 * suivants prennent sa couleur — une liste de personnages en affiche vingt.
 * Un identifiant tiré au hasard, lui, changerait à chaque rendu de React. Le
 * dériver des couleurs règle les deux : deux portraits de même teint partagent
 * une définition, deux teints différents n'en partagent aucune.
 */
function cle(...couleurs: string[]): string {
  return couleurs.join('').replaceAll('#', '').toLowerCase();
}

/**
 * Le crâne.
 *
 * **Rond, et c'est le point.** La référence donnée par l'auteur du jeu a une
 * largeur et une hauteur presque égales, des joues pleines et un petit menton
 * arrondi. Les versions précédentes dessinaient un ovale allongé — c'est une
 * des trois choses qui leur donnaient cet air d'avatar générique.
 */
function crane(l: number, machoire: number, menton: number): string {
  const xg = 100 - l;
  const xd = 100 + l;
  const m = l * machoire;
  return `M ${xg},98 C ${xg},52 ${100 - l * 0.56},22 100,22 `
    + `C ${100 + l * 0.56},22 ${xd},52 ${xd},98 `
    + `C ${xd},126 ${100 + m + 9},150 ${100 + m},162 `
    + `C ${100 + m - 11},${menton - 5} ${100 + 22},${menton} 100,${menton} `
    + `C ${100 - 22},${menton} ${100 - m + 11},${menton - 5} ${100 - m},162 `
    + `C ${100 - m - 9},150 ${xg},126 ${xg},98 Z`;
}

/** Un groupe posé à gauche, ou miroité à droite — l'écart suit la largeur du crâne. */
function cote(c: 'g' | 'd', l: number, facteur: number): string {
  const dx = (l - 74) * facteur;
  return c === 'g' ? `translate(${-dx},0)` : `translate(${200 + dx},0) scale(-1,1)`;
}

/** L'oreille : petite, ronde, décollée — et sans contour, comme le reste. */
function oreille(c: 'g' | 'd', l: number, peau: string, ombre: string): ReactNode {
  return (
    <g key={c} transform={cote(c, l, 1)}>
      <ellipse cx={24} cy={112} rx={12.5} ry={16} fill={peau} />
      <ellipse cx={26} cy={113} rx={7} ry={9.5} fill={ombre} opacity={0.55} />
    </g>
  );
}

/**
 * L'œil.
 *
 * Grand et rond, l'iris large, deux éclats : un gros en haut à gauche, un
 * petit en bas à droite. C'est la paire d'éclats qui donne le brillant de la
 * référence ; avec un seul, l'œil reste mat.
 *
 * **La paupière ne mord pas l'œil au repos** : le blanc doit faire un anneau
 * complet autour de l'iris, sinon le regard part vers le haut. Elle descend
 * ensuite pour la fatigue, et c'est une *grande* ellipse posée haut — une
 * petite ellipse a un bord convexe qui fait loucher, et une dalle à bord droit
 * donnait carrément une visière.
 */
function oeil(
  c: 'g' | 'd',
  l: number,
  iris: string,
  peau: string,
  paupiere: number,
): ReactNode {
  const d = paupiere * 24;
  return (
    <g key={c} transform={cote(c, l, 0.45)}>
      <ellipse cx={71} cy={114} rx={17.5} ry={19.5} fill="#fdfaf4" />
      <g clipPath={`url(#${CLIP_OEIL})`}>
        <circle cx={71} cy={114} r={16} fill={`url(#ir-${cle(iris)})`} />
        <circle cx={71} cy={114} r={8.2} fill={assombrir(iris, 0.72)} />
        <circle cx={65} cy={107} r={5.6} fill="#ffffff" />
        <circle cx={78} cy={122} r={2.8} fill="#ffffff" opacity={0.75} />
        <ellipse cx={71} cy={64 + d} rx={26} ry={27} fill={peau} />
      </g>
    </g>
  );
}

/**
 * Le sourcil : fin, discret, à peine plus foncé que les cheveux.
 *
 * Dans la référence il est presque invisible — deux virgules posées loin
 * au-dessus des yeux. Un sourcil épais ramène le dessin vers la bande
 * dessinée, ce qui a déjà été essayé et refusé.
 *
 * **Le signe de la pente comptait, et il était inversé** dans une version
 * précédente. Sur le sourcil de gauche, une pente négative lève l'extrémité
 * *intérieure* : c'est le dessin de la tristesse. Positive, elle la baisse :
 * c'est la colère. Le personnage triste avait donc l'air furieux.
 */
function sourcil(c: 'g' | 'd', l: number, dy: number, pente: number, couleur: string): ReactNode {
  return (
    <g key={c} transform={cote(c, l, 0.45)}>
      <path
        transform={`translate(0,${dy}) rotate(${c === 'g' ? pente : -pente} 84 92)`}
        d="M 56,95 C 62,87 78,84 88,90 C 79,88 65,90 57,97 Z"
        fill={couleur}
        stroke={couleur}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * Le nez : presque rien.
 *
 * Dans la référence c'est un petit renflement — une ombre douce et un éclat,
 * sans aucun trait. Trois autres nez ont été essayés puis jetés : le bloc
 * plein se lisait comme une cicatrice verticale, le bloc flanqué de ses ailes
 * comme un cœur, et le trait d'encre appartenait à une autre langue graphique.
 */
function nez(ombre: string, clair: string): ReactNode {
  return (
    <>
      <ellipse cx={100} cy={134} rx={7.5} ry={5.2} fill={ombre} opacity={0.34} />
      <ellipse cx={98.5} cy={131} rx={3.8} ry={2.4} fill={clair} opacity={0.5} />
    </>
  );
}

/**
 * La bouche.
 *
 * Ouverte et souriante pour la joie, avec sa bande de dents : c'est l'élément
 * le plus caractéristique de la référence. Les quatre autres humeurs la
 * ferment et changent sa courbure — c'est, avec les sourcils, le seul canal
 * expressif qui reste depuis que le portrait s'arrête au menton.
 */
function bouche(humeur: Humeur, gorge: string, levre: string): ReactNode {
  switch (humeur) {
    case 'joie':
      return (
        <>
          <path
            d="M 80,148 C 87,144 113,144 120,148 C 120,166 111,175 100,175 C 89,175 80,166 80,148 Z"
            fill={gorge}
          />
          <path
            d="M 82,149 C 89,146 111,146 118,149 C 117,156 109,160 100,160 C 91,160 83,156 82,149 Z"
            fill="#fffdf8"
          />
          <path
            d="M 88,170 C 92,166 108,166 112,170 C 108,174 92,174 88,170 Z"
            fill={eclaircir(gorge, 0.28)}
          />
        </>
      );
    case 'peine':
      return <path d="M 82,162 C 89,152 111,152 118,162 C 111,166 89,166 82,162 Z" fill={levre} />;
    case 'lassitude':
      return <path d="M 83,155 C 90,151 110,151 117,155 C 111,160 89,160 83,155 Z" fill={levre} />;
    case 'mal':
      return <ellipse cx={100} cy={157} rx={9} ry={7.5} fill={gorge} />;
    default:
      return <path d="M 83,150 C 90,147 110,147 117,150 C 113,161 87,161 83,150 Z" fill={levre} />;
  }
}

/**
 * La barbe.
 *
 * **C'est le seul trait d'apparence qui apparaît avec le temps.** Le reste —
 * teint, yeux, forme du visage — est tiré à la naissance et ne bouge plus. La
 * pilosité, elle, ne se dessine qu'à partir de quinze ans et se remplit
 * jusqu'à vingt-cinq : `densite` porte cette montée.
 *
 * La masse laisse la bouche dégagée. Une barbe qui recouvre la bouche efface
 * la moitié de l'expression — il ne resterait que les sourcils, et sur un
 * portrait qui s'arrête au menton c'est trop peu.
 */
function barbe(style: string, densite: number, couleur: string): ReactNode {
  if (!densite || style === 'rasé') return null;
  const MOUSTACHE = 'M 76,142 C 85,135 115,135 124,142 '
    + 'C 117,149 106,146 100,146 C 94,146 83,149 76,142 Z';
  const MASSE = 'M 28,112 C 26,152 60,188 100,188 C 140,188 174,152 172,112 '
    + 'C 168,138 152,148 136,146 C 128,166 116,176 100,176 '
    + 'C 84,176 72,166 64,146 C 48,148 32,138 28,112 Z';
  const BOUC = 'M 86,166 C 92,161 108,161 114,166 '
    + 'C 114,178 108,184 100,184 C 92,184 86,178 86,166 Z';
  const pieces: Record<string, string[]> = {
    'barbe de trois jours': [MASSE, MOUSTACHE],
    moustache: [MOUSTACHE],
    bouc: [MOUSTACHE, BOUC],
    'barbe pleine': [MASSE, MOUSTACHE],
  };
  /* La barbe de trois jours est la même masse, posée en transparence : c'est
     une ombre sur la peau, pas une matière. */
  const opacite = (style === 'barbe de trois jours' ? 0.34 : 0.95) * densite;
  return (
    <g fill={couleur} opacity={opacite}>
      {(pieces[style] ?? []).map((d) => <path key={d} d={d} />)}
    </g>
  );
}

/**
 * Les rides. Deux pattes d'oie au coin des yeux, deux plis de chaque côté de
 * la bouche. Elles n'existent pas avant quarante-six ans et montent jusqu'à
 * quatre-vingts : un seul nombre les porte.
 */
function rides(force: number, encre: string): ReactNode {
  if (force <= 0) return null;
  const traits = [
    'M 44,104 C 39,108 36,113 36,119',
    'M 46,113 C 41,116 39,120 39,125',
    'M 156,104 C 161,108 164,113 164,119',
    'M 154,113 C 159,116 161,120 161,125',
    'M 88,132 C 82,142 79,152 81,160',
    'M 112,132 C 118,142 121,152 119,160',
  ];
  return (
    <g fill="none" stroke={encre} strokeWidth={2} strokeLinecap="round" opacity={0.34 * force}>
      {traits.map((d) => <path key={d} d={d} />)}
    </g>
  );
}

interface Coiffure {
  /** Ce qui passe derrière la tête. */
  derriere: string;
  /** La calotte, lisse et d'un seul tenant. */
  masse: string;
  /** Le reflet qui court sur le haut du crâne : c'est lui qui donne le verni. */
  reflet: string;
}

/**
 * Sept coiffures, toutes en **calotte lisse**.
 *
 * Pas de mèches cernées, pas de bord dentelé : la référence montre une masse
 * brillante d'un seul tenant. Ce qui distingue les coiffures, c'est la
 * **silhouette** — jusqu'où la masse descend, et comment elle se termine.
 *
 * `courts` est servi par le `default` ; les six autres ont leur `case`, et un
 * test le vérifie — sans quoi une coiffure ajoutée dans `cradle.ts` serait
 * dessinée comme une autre, en silence.
 */
function chevelure(style: string): Coiffure {
  /*
   * La ligne de front, en deux morceaux nommés.
   *
   * Elle s'arrête au-dessus des sourcils : une mèche qui les couvre supprime
   * la moitié de l'expression. Une version antérieure remontait en pointe vers
   * une raie haute, ce qui dégageait un grand triangle de front nu à droite.
   *
   * Deux morceaux *nommés* plutôt qu'une chaîne redécoupée à l'exécution :
   * « bouclés » reprenait la fin de la ligne avec
   * `FRONT.slice(FRONT.indexOf('C 116,66'))`, et le jour où ce point de
   * contrôle a bougé, `indexOf` a renvoyé −1, `slice(-1)` a gardé un seul
   * caractère, et la coiffure rendait un `d` malformé — que SVG ignore en
   * silence.
   */
  const LOBE_D = 'C 182,132 176,138 169,131 ';
  const FRONT = 'C 172,110 166,92 154,80 '
    + 'C 140,68 118,63 98,65 C 78,67 60,72 46,83 '
    + 'C 34,93 27,110 29,127 ';
  const LOBE_G = 'C 24,133 18,132 16,124';

  const CALOTTE = `M 15,124 C 9,62 48,16 100,16 C 152,16 191,62 185,124 `
    + `${LOBE_D}${FRONT}${LOBE_G} Z`;
  const REFLET = 'M 44,66 C 56,44 76,32 100,30 C 78,38 60,50 49,70 Z';

  switch (style) {
    case 'mi-longs':
      return {
        derriere: 'M 18,150 C 12,78 48,8 100,8 C 154,8 188,74 182,150 '
          + 'C 178,168 168,178 158,182 C 166,148 166,106 158,78 '
          + 'C 149,46 128,28 100,28 C 72,28 50,46 41,78 '
          + 'C 33,106 33,148 41,182 C 31,178 22,168 18,150 Z',
        masse: CALOTTE,
        reflet: REFLET,
      };
    case 'longs':
      return {
        derriere: 'M 10,196 C 2,98 42,4 100,4 C 160,4 198,98 190,196 '
          + 'C 180,192 170,188 162,180 C 171,138 169,96 161,70 '
          + 'C 151,38 128,20 100,20 C 72,20 49,38 39,70 '
          + 'C 31,96 29,138 38,180 C 30,188 20,192 10,196 Z',
        masse: CALOTTE,
        reflet: REFLET,
      };
    case 'raides':
      /*
       * La seule coiffure sans balayage : la frange descend droit et la masse
       * arrière tombe en deux rideaux à bord net. C'est ce bord droit qui la
       * distingue des six autres au premier coup d'œil — à condition qu'il
       * reste au-dessus des sourcils, ce que le premier jet ne faisait pas.
       */
      return {
        derriere: 'M 14,182 C 10,76 48,4 100,4 C 152,4 190,76 186,182 '
          + 'L 162,182 C 169,138 169,96 161,70 C 151,38 128,20 100,20 '
          + 'C 72,20 49,38 39,70 C 31,96 31,138 38,182 Z',
        masse: 'M 15,124 C 9,62 48,16 100,16 C 152,16 191,62 185,124 '
          + 'C 182,132 176,138 169,131 C 172,108 173,90 172,78 '
          + 'C 148,66 124,62 100,63 C 76,62 50,68 28,78 '
          + 'C 27,92 28,110 29,127 C 24,133 18,132 16,124 Z',
        reflet: 'M 54,58 C 64,40 80,30 100,28 C 82,34 66,44 58,62 Z',
      };
    case 'ondulés':
      return {
        derriere: 'M 14,156 C 8,78 46,6 100,6 C 156,6 192,74 186,156 '
          + 'C 181,170 168,166 163,178 C 156,168 147,174 143,184 '
          + 'C 153,146 155,100 148,74 C 139,42 126,26 100,26 '
          + 'C 74,26 57,42 48,74 C 41,100 43,146 52,184 '
          + 'C 48,174 40,168 33,178 C 28,166 20,170 14,156 Z',
        masse: CALOTTE,
        reflet: REFLET,
      };
    case 'bouclés': {
      /*
       * Une guirlande d'arcs plutôt qu'un ovale : neuf demi-cercles posés sur
       * une même division, parce qu'à la main ils finissent toujours décalés
       * d'un côté. La guirlande part de la *gauche* et la fermeture repart de
       * la droite ; l'inverse — un premier jet — produisait un peigne en dents
       * de scie coupé net au ras des yeux.
       */
      const n = 9;
      const pt = (i: number) => {
        const a = (i * Math.PI) / n;
        return `${(100 - Math.cos(a) * 86).toFixed(1)},${(118 - Math.sin(a) * 106).toFixed(1)}`;
      };
      let d = `M ${pt(0)} `;
      for (let i = 1; i <= n; i += 1) d += `A 21,21 0 0 1 ${pt(i)} `;
      d += `${LOBE_D}${FRONT}${LOBE_G} Z`;
      return {
        derriere: '',
        masse: d,
        reflet: 'M 56,58 C 66,40 82,30 102,28 C 84,36 70,46 60,62 Z',
      };
    }
    case 'crépus': {
      /*
       * Un halo dense bordé de boucles serrées, et un front dégagé plus haut
       * que sur les autres coiffures. Trois fautes avant d'y arriver : un halo
       * à peine plus large que le crâne — le personnage semblait chauve —, un
       * halo débordant du cadre coupé net, puis une ligne de fermeture passant
       * au *sommet* du crâne au lieu du front, si bien que le halo n'était
       * qu'un anneau autour d'une tête nue.
       */
      const n = 14;
      const pt = (i: number) => {
        const a = (i * Math.PI) / n;
        return `${(100 - Math.cos(a) * 90).toFixed(1)},${(112 - Math.sin(a) * 100).toFixed(1)}`;
      };
      let d = `M ${pt(0)} `;
      for (let i = 1; i <= n; i += 1) d += `A 14,14 0 0 1 ${pt(i)} `;
      d += 'C 188,102 180,86 166,74 C 146,63 124,59 100,60 '
        + 'C 76,59 54,63 34,74 C 20,86 12,102 10,112 Z';
      return {
        derriere: '',
        masse: d,
        reflet: 'M 48,56 C 62,36 82,26 104,24 C 82,32 64,42 52,60 Z',
      };
    }
    default: /* courts */
      return { derriere: '', masse: CALOTTE, reflet: REFLET };
  }
}

/**
 * Cinq humeurs, tenues par trois gestes : la hauteur des sourcils, leur pente,
 * et la paupière qui descend.
 */
const HUMEUR: Record<Humeur, { dy: number; pente: number; paupiere: number }> = {
  joie: { dy: -2, pente: -2, paupiere: 0 },
  calme: { dy: 0, pente: -1, paupiere: 0 },
  lassitude: { dy: 3, pente: -5, paupiere: 0.4 },
  peine: { dy: -2, pente: -12, paupiere: 0.18 },
  mal: { dy: 4, pente: -8, paupiere: 0.5 },
};

/**
 * Le découpage de l'œil, partagé par tous les portraits de la page.
 *
 * Un identifiant par portrait produirait autant de définitions identiques
 * qu'il y a de visages à l'écran. La forme de l'œil ne dépend d'aucune
 * caractéristique : une seule définition suffit.
 */
const CLIP_OEIL = 'portrait-oeil';

/* ------------------------------------------------------------------ */
/* Le composant                                                        */
/* ------------------------------------------------------------------ */

/**
 * `size` est la seule mesure de mise en page : le dessin est fait sur une
 * grille de 200 et se met à l'échelle sans jamais se pixelliser. Mesuré, il
 * reste lisible jusqu'à 46 px, la taille du médaillon de l'en-tête.
 *
 * Le fond est transparent : c'est l'appelant qui décide du disque, du carré ou
 * de rien du tout.
 */
export function Portrait({ traits, size = 46 }: { traits: Traits; size?: number }) {
  const [peau, ombre] = PEAU[traits.peau] ?? PEAU.claire!;
  const [poil, poilOmbre, poilClair] = CHEVEUX[traits.cheveux] ?? CHEVEUX.bruns!;
  const iris = YEUX[traits.yeux] ?? YEUX.marron!;
  const forme = VISAGE[traits.visage] ?? VISAGE.ovale!;
  const { dy, pente, paupiere } = HUMEUR[traits.humeur];

  /*
   * **Ce que l'âge fait au visage, et pourquoi c'est continu.**
   *
   * Trois montées, pas six étapes : un palier se voit au moment où il est
   * franchi — le personnage changerait de tête d'un anniversaire à l'autre,
   * ce qui est exactement ce qu'un portrait ne doit pas faire.
   *
   * `jeunesse` va de 1 à la naissance à 0 à seize ans : crâne large, menton
   * court, grands yeux. `grison` part de quarante-deux ans et monte jusqu'à
   * quatre-vingts. `ride` part de quarante-six.
   */
  const jeunesse = Math.max(0, Math.min(1, (16 - traits.age) / 16));
  const grison = Math.max(0, Math.min(0.85, (traits.age - 42) / 38));
  const ride = Math.max(0, Math.min(1, (traits.age - 46) / 34));
  const GRIS = '#b9b7b2';

  /*
   * Le sexe ne touche que la mâchoire — deux points de large. C'est peu, et
   * c'est voulu : au-delà, un portrait qui s'arrête au menton verse dans le
   * stéréotype plutôt que dans la ressemblance.
   */
  const l = forme.l * (1 + jeunesse * 0.09);
  const menton = forme.menton - jeunesse * 22;
  const machoire = forme.machoire * (traits.sexe === 'M' ? 1.06 : 0.97) + jeunesse * 0.06;

  /*
   * La pilosité n'est dessinée qu'à partir de quinze ans, et elle se remplit
   * jusqu'à vingt-cinq. C'est le seul trait d'apparence qui apparaît avec le
   * temps ; tout le reste est tiré à la naissance et ne bouge plus.
   */
  const densite = traits.sexe === 'M' ? Math.max(0, Math.min(1, (traits.age - 15) / 10)) : 0;

  const { derriere, masse, reflet } = chevelure(traits.coiffure);
  /* Les tracés de cheveux sont écrits pour une demi-largeur de 74 : ils
     suivent le crâne quand il change de forme, sinon la calotte flotte à côté
     de la tempe. */
  const k = l / 74;
  const echelleCheveux = `translate(${(100 * (1 - k)).toFixed(2)},0) scale(${k.toFixed(3)},1)`;

  /* Le poil du visage grisonne un cran plus vite que les cheveux. */
  const poilGris = melange(poil, GRIS, grison);
  const poilOmbreGris = melange(poilOmbre, GRIS, grison);
  const poilClairGris = melange(poilClair, GRIS, grison);
  const poilVisage = melange(poilOmbre, GRIS, Math.min(0.9, grison * 1.2));

  const peauClaire = eclaircir(peau, 0.18);
  const kPeau = cle(peau, ombre);
  const kPoil = cle(poilGris, poilOmbreGris);
  const kIris = cle(iris);
  const kJoue = cle(peau, 'joue');

  /* Sur un teint sombre, une lèvre neutre pose une barre grise au milieu du
     visage : elle doit rester dans les rouges, plus claire que la peau. */
  const sombre = ['brune', 'foncée', 'très foncée'].includes(traits.peau);
  const gorge = sombre ? '#7d3a31' : '#6e2e27';
  const levre = sombre ? '#b5705e' : '#a85c4c';

  const signes = new Set(traits.signes);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={CLIP_OEIL}>
          <ellipse cx={71} cy={114} rx={17.5} ry={19.5} />
        </clipPath>
        <radialGradient id={`pe-${kPeau}`} cx="36%" cy="28%" r="82%">
          <stop offset="0" stopColor={peauClaire} />
          <stop offset=".55" stopColor={peau} />
          <stop offset="1" stopColor={ombre} />
        </radialGradient>
        <linearGradient id={`ch-${kPoil}`} x1="18%" y1="4%" x2="86%" y2="96%">
          <stop offset="0" stopColor={eclaircir(poilGris, 0.2)} />
          <stop offset=".5" stopColor={poilGris} />
          <stop offset="1" stopColor={poilOmbreGris} />
        </linearGradient>
        <radialGradient id={`ir-${kIris}`} cx="40%" cy="32%" r="72%">
          <stop offset="0" stopColor={eclaircir(iris, 0.28)} />
          <stop offset="1" stopColor={assombrir(iris, 0.22)} />
        </radialGradient>
        <radialGradient id={`jo-${kJoue}`}>
          <stop offset="0" stopColor="#e2604a" stopOpacity=".4" />
          <stop offset="1" stopColor="#e2604a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {derriere ? (
        <path d={derriere} fill={`url(#ch-${kPoil})`} transform={echelleCheveux} />
      ) : null}
      {oreille('g', l, peau, ombre)}
      {oreille('d', l, peau, ombre)}
      <path d={crane(l, machoire, menton)} fill={`url(#pe-${kPeau})`} />
      <ellipse cx={100 - l * 0.76} cy={136} rx={20} ry={15} fill={`url(#jo-${kJoue})`} />
      <ellipse cx={100 + l * 0.76} cy={136} rx={20} ry={15} fill={`url(#jo-${kJoue})`} />
      {signes.has('des taches de rousseur') ? (
        <g fill={ombre} opacity={0.55}>
          {[[78, 136], [70, 142], [85, 145], [122, 136], [130, 142], [115, 145]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={1.9} />
          ))}
        </g>
      ) : null}
      <g transform={`translate(100,114) scale(${(1 + jeunesse * 0.14).toFixed(3)}) translate(-100,-114)`}>
        {oeil('g', l, iris, peau, paupiere)}
        {oeil('d', l, iris, peau, paupiere)}
      </g>
      {sourcil('g', l, dy, pente, poilOmbreGris)}
      {sourcil('d', l, dy, pente, poilOmbreGris)}
      {/*
        Le bas du visage suit le menton. Chez l'enfant celui-ci remonte de
        vingt-deux points ; sans ce décalage la bouche débordait de la tête à
        un an. La fossette, elle, est déjà posée par rapport au menton et
        reste donc dehors.
      */}
      <g transform={`translate(0,${(-jeunesse * 13).toFixed(1)})`}>
        {nez(ombre, peauClaire)}
        <g transform="translate(100,152) scale(.88) translate(-100,-152)">
          {bouche(traits.humeur, gorge, levre)}
        </g>
        {barbe(traits.pilosite, densite, poilVisage)}
      </g>
      {signes.has('une fossette au menton') ? (
        <ellipse cx={100} cy={menton - 12} rx={4} ry={2.6} fill={ombre} opacity={0.35} />
      ) : null}
      {rides(ride, assombrir(ombre, 0.3))}
      <g transform={echelleCheveux}>
        <path d={masse} fill={`url(#ch-${kPoil})`} />
        <path d={reflet} fill={poilClairGris} opacity={0.5} />
      </g>
    </svg>
  );
}

/** Le portrait d'un joueur, sans que l'appelant ait à connaître les traits. */
export function PlayerPortrait({ player, size }: { player: Player; size?: number }) {
  return <Portrait traits={traitsDe(player)} size={size} />;
}
