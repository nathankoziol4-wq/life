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
 * **Deux verdicts, le même mot, et ce qu'ils ont chacun corrigé.**
 *
 * La première version empilait des ellipses et des rectangles arrondis : un
 * disque pour le crâne, un rectangle arrondi pour la frange, une pastille par
 * sourcil. Aucune ellipse ne ressemble à une mèche de cheveux, à une paupière
 * ou à une lèvre. D'où le premier verdict de l'auteur du jeu — « ça se voit
 * que c'est de l'IA, c'est du gribouillage » — et le passage aux courbes de
 * Bézier écrites à la main.
 *
 * Le même verdict est tombé sur cette deuxième version, et trois défauts le
 * justifiaient : **symétrie parfaite** — les deux moitiés du visage étaient
 * l'image miroir l'une de l'autre au point près, ce qu'aucune main ne produit ;
 * **aucun contour** — des aplats posés bord à bord, alors qu'un visage dessiné
 * a une ligne d'encre ; **des cheveux d'un seul tenant** — une masse lisse au
 * bord arrondi, quand de vrais cheveux finissent en pointes et se séparent en
 * mèches.
 *
 * Ce que le dessin fait maintenant :
 *
 * - **un contour d'encre** sur le crâne, les oreilles et chaque mèche, dont la
 *   couleur se déduit du teint plutôt que d'être un noir fixe ;
 * - **des mèches distinctes**, fermées et cernées quand elles sont posées sur
 *   la peau, réduites à une striure quand elles sont à l'intérieur de la masse ;
 * - **un bord de frange à pointes**, jamais un arc lisse ;
 * - **une asymétrie assumée** : tempe droite plus large, sourcils dépareillés,
 *   bouche décalée d'un point ;
 * - **une raie décentrée** vers x = 134 et une mèche qui balaie le front en
 *   biais — une coiffure symétrique se lit comme un casque ;
 * - **une paupière haute plus lourde que la basse**, et l'iris qui passe
 *   dessous au lieu de flotter au milieu du blanc ;
 * - **un sourcil qui s'affine vers la tempe** : c'est la variation d'épaisseur
 *   qui le fait lire comme un sourcil ;
 * - **des lèvres avec un arc de Cupidon** et une ligne de partage, qui est ce
 *   qu'on lit en premier de loin.
 *
 * Les aplats restent **plats** : aucun dégradé, aucune ombre large. Une ombre
 * couvrant la moitié droite du visage a été essayée ; sa frontière intérieure
 * traçait une arête nette du front au menton, qui se lisait comme une fissure.
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
  blonds: ['#d8b263', '#b08339', '#eed08e'],
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
  ovale: { l: 70, machoire: 0.8, menton: 192 },
  ronde: { l: 74, machoire: 0.92, menton: 182 },
  carrée: { l: 72, machoire: 1, menton: 186 },
  allongée: { l: 65, machoire: 0.78, menton: 198 },
  'en cœur': { l: 72, machoire: 0.66, menton: 190 },
  anguleuse: { l: 69, machoire: 0.7, menton: 194 },
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

/** Assombrir une couleur, pour en tirer une encre. */
function encrer(hex: string, t: number): string {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => Math.round(Number.parseInt(n.slice(i, i + 2), 16) * (1 - t)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Le crâne, écrit à partir de ses trois mesures.
 *
 * Six courbes : la calotte, les tempes, les pommettes, la mâchoire qui
 * s'incline, le menton. Le piège d'un ovale, c'est qu'il n'a ni pommette ni
 * mâchoire — il rend une patate.
 *
 * **Il n'est pas symétrique, et c'est délibéré.** La tempe droite est un point
 * plus large, la joue droite un peu plus pleine, et le menton tombe une
 * fraction à droite du milieu. À l'échelle du jeu on ne le lit pas
 * consciemment ; ce qu'on lit, c'est l'absence de l'effet miroir qui trahissait
 * le dessin calculé.
 */
function crane(l: number, machoire: number, menton: number): string {
  const xg = 100 - l;
  const xd = 101 + l;
  const m = l * machoire;
  return `M ${xg},94 C ${xg + 1},48 ${100 - l * 0.6},21 100,21 `
    + `C ${100 + l * 0.62},21 ${xd},49 ${xd},96 `
    + `C ${xd + 1},124 ${100 + m + 9},142 ${100 + m},157 `
    + `C ${100 + m - 11},177 124,${menton} 101,${menton} `
    + `C 78,${menton} ${100 - m + 10},176 ${100 - m},156 `
    + `C ${100 - m - 9},140 ${xg - 1},122 ${xg},94 Z`;
}

/** L'oreille, avec son ourlet. Sans l'ourlet, c'est une virgule collée au crâne. */
function oreille(cote: 'g' | 'd', l: number, peau: string, ink: string): ReactNode {
  const dx = l - 70;
  return (
    <g
      key={cote}
      transform={cote === 'g' ? `translate(${-dx},0)` : `translate(${201 + dx},0) scale(-1,1)`}
    >
      <path
        d="M 38,104 C 26,99 17,108 20,121 C 23,134 34,141 42,137"
        fill={peau}
        stroke={ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path
        d="M 34,113 C 29,114 27,121 31,127"
        fill="none"
        stroke={ink}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.55}
      />
    </g>
  );
}

/**
 * Le découpage de l'œil, partagé par tous les portraits de la page.
 *
 * Un identifiant par portrait produirait autant de définitions identiques qu'il
 * y a de visages à l'écran — et une liste de personnages en affiche vingt. La
 * forme de l'amande ne dépend d'aucune caractéristique : une seule définition
 * suffit, et le document reste valide.
 */
const CLIP_OEIL = 'portrait-oeil';
const AMANDE = 'M 59,125 C 65,111 82,106 93,119 C 89,134 68,136 59,125 Z';

/**
 * L'œil.
 *
 * Le cil haut est une **forme pleine à épaisseur variable**, pas un trait :
 * épais au tiers extérieur, effilé vers le coin du nez, et il dépasse
 * légèrement de l'amande — c'est ce dépassement qui fait le regard. Le cil bas
 * n'existe que sur le tiers central ; le tracer en entier cerne l'œil et donne
 * un air de poupée.
 *
 * `paupiere` fait descendre l'ensemble *le long* de la courbe du cil. Une
 * dalle de peau à bord droit en travers de l'œil — le premier jet — donnait
 * une visière aux personnages fatigués.
 */
function oeil(
  cote: 'g' | 'd',
  l: number,
  iris: string,
  peau: string,
  ink: string,
  paupiere: number,
): ReactNode {
  const dx = (l - 70) * 0.35;
  const d = paupiere * 20;
  const bord = `M 55,${129 + d} C 60,${110 + d} 82,${103 + d} 96,${118 + d}`;
  const cil = `${bord} C 92,${114 + d} 86,${111 + d} 79,${111 + d} `
    + `C 69,${112 + d} 61,${119 + d} 58,${130 + d} Z`;
  return (
    <g
      key={cote}
      transform={cote === 'g' ? `translate(${-dx},0)` : `translate(${200 + dx},0) scale(-1,1)`}
    >
      <path d={AMANDE} fill="#fbf6ef" />
      <g clipPath={`url(#${CLIP_OEIL})`}>
        <circle cx={77} cy={122} r={10.6} fill={iris} />
        <circle cx={77} cy={122} r={4.8} fill={encrer(iris, 0.62)} />
        <circle cx={73.2} cy={117.8} r={2.8} fill="#ffffff" />
        {/* L'ombre que porte la paupière sur le haut du globe. Sans elle,
            l'iris est une bille posée sur du blanc. */}
        <path d="M 57,118 C 65,109 85,106 96,117 L 96,102 L 57,102 Z" fill={ink} opacity={0.12} />
        {d ? <path d={`${bord} L 96,100 L 55,100 Z`} fill={peau} /> : null}
      </g>
      <path d={cil} fill={ink} />
      <path
        d="M 66,132 C 72,135 80,135 85,132"
        fill="none"
        stroke={ink}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.5}
      />
    </g>
  );
}

/**
 * Le sourcil : épais à la tête, affiné vers la queue. C'est la variation
 * d'épaisseur qui le fait lire comme un sourcil ; une barre de largeur
 * constante ne dit rien.
 *
 * **Les deux ne sont pas identiques.** Celui de droite est trois points plus
 * court et une fraction plus haut. Deux sourcils jumeaux au point près sont le
 * détail qui trahit le plus vite un visage calculé.
 *
 * **Le signe de la pente comptait, et il était inversé.** Sur le sourcil de
 * gauche, une pente négative lève l'extrémité *intérieure* : c'est le dessin
 * de la tristesse. Une pente positive la baisse : c'est la colère. La première
 * version les avait échangés, et le personnage triste avait l'air furieux.
 */
function sourcil(cote: 'g' | 'd', dy: number, pente: number, ink: string): ReactNode {
  const g = cote === 'g';
  return (
    <g key={cote} transform={g ? undefined : 'translate(200,0) scale(-1,1)'}>
      <path
        transform={`translate(0,${dy + 4}) rotate(${g ? pente : -pente} 90 102)`}
        d={g
          ? 'M 91,100 C 83,91 66,89 55,98 C 54,100 55,103 57,102 C 68,96 81,98 89,106 C 91,106 92,102 91,100 Z'
          : 'M 91,99 C 84,91 69,89 58,97 C 57,99 58,101 60,100 C 70,95 82,97 89,105 C 91,105 92,101 91,99 Z'}
        fill={ink}
      />
    </g>
  );
}

/**
 * Le nez : un trait, et rien d'autre.
 *
 * L'arête à droite qui tourne sous le bout. Le bloc plein a été essayé deux
 * fois — il se lisait d'abord comme une cicatrice verticale, puis, une fois
 * flanqué de ses deux ailes, comme un cœur.
 */
function nez(ink: string): ReactNode {
  return (
    <path
      d="M 104,120 C 108,134 111,145 109,151 C 106,156 97,156 93,150"
      fill="none"
      stroke={ink}
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.8}
    />
  );
}

/**
 * La bouche.
 *
 * La lèvre haute porte l'arc de Cupidon — deux bosses et un creux au milieu ;
 * la basse est plus pleine et plus claire. Entre les deux, la ligne des
 * lèvres, tracée à l'encre : c'est ce qu'on lit en premier de loin, et c'est
 * la seule partie du visage qu'un rectangle arrondi ne peut pas imiter.
 */
function bouche(humeur: Humeur, haute: string, basse: string, ink: string): ReactNode {
  const trait = (d: string, w = 2.6) => (
    <path d={d} fill="none" stroke={ink} strokeWidth={w} strokeLinecap="round" />
  );
  switch (humeur) {
    case 'joie':
      return (
        <>
          <path
            d="M 73,161 C 83,157 91,161 99,161 C 107,161 115,157 125,161 C 123,180 107,190 99,190 C 91,190 75,180 73,161 Z"
            fill={encrer(haute, 0.35)}
          />
          <path
            d="M 76,162 C 85,159 93,162 99,162 C 105,162 113,159 122,162 C 120,169 109,173 99,173 C 89,173 78,169 76,162 Z"
            fill="#fdfaf5"
          />
          <path
            d="M 108,181 C 112,178 116,173 118,168 C 114,176 109,182 104,185 Z"
            fill={basse}
            opacity={0.55}
          />
          {trait('M 73,161 C 85,165 113,165 125,161')}
        </>
      );
    case 'peine':
      return (
        <>
          <path
            d="M 79,171 C 85,161 93,167 99,166 C 105,167 113,161 119,171 C 113,176 85,176 79,171 Z"
            fill={haute}
          />
          {trait('M 79,171 C 87,165 111,165 119,171')}
        </>
      );
    case 'lassitude':
      return (
        <>
          <path
            d="M 79,165 C 86,161 93,164 99,164 C 105,164 112,161 119,165 C 115,172 83,172 79,165 Z"
            fill={haute}
          />
          {trait('M 79,165 C 89,168 109,168 119,165', 2.4)}
        </>
      );
    case 'mal':
      return (
        <>
          <path
            d="M 87,163 C 91,158 107,158 111,163 C 113,172 107,177 99,177 C 91,177 85,172 87,163 Z"
            fill={haute}
          />
          {trait('M 87,164 C 93,167 105,167 111,164', 2.2)}
        </>
      );
    default:
      return (
        <>
          <path
            d="M 78,162 C 85,154 93,160 99,159 C 105,160 113,154 120,162 C 115,176 83,176 78,162 Z"
            fill={haute}
          />
          <path
            d="M 82,166 C 90,171 108,171 116,166 C 113,174 85,174 82,166 Z"
            fill={basse}
            opacity={0.5}
          />
          {trait('M 78,162 C 89,167 109,167 120,162')}
        </>
      );
  }
}

interface Coiffure {
  /** Ce qui passe derrière la tête. */
  derriere: string;
  /** La calotte, dont le bord bas est dentelé : chaque dent est une pointe. */
  masse: string;
  /** Les mèches détachées posées sur le front, cernées d'encre. */
  meches: string[];
  /** Les séparations *à l'intérieur* de la masse, en trait ouvert. */
  stries: string[];
}

/**
 * Sept coiffures, chacune un vrai contour.
 *
 * **La différence qui compte.** Une coiffure n'est pas une masse au bord
 * arrondi : c'est un empilement de mèches, chacune finissant en pointe. La
 * version précédente dessinait un contour lisse, et c'est ce qui la faisait
 * lire comme une perruque en plastique.
 *
 * Une mèche posée sur la peau est une forme fermée et cernée ; une mèche
 * *à l'intérieur* de la masse est une simple striure. Le premier jet cernait
 * les deux, et les latérales rendaient des échardes flottant sur la joue.
 *
 * La raie tombe vers x = 134, jamais au milieu : une coiffure symétrique se
 * lit comme un casque.
 *
 * `courts` est servi par le `default` ; les six autres ont leur `case`, et un
 * test le vérifie — sans quoi une coiffure ajoutée dans `cradle.ts` serait
 * dessinée comme une autre, en silence.
 */
function chevelure(style: string): Coiffure {
  /*
   * La ligne de front commune : de la raie jusqu'à la tempe gauche, en deux
   * pointes. Elle s'arrête au-dessus des sourcils — une mèche qui les couvre
   * détruit le seul canal d'expression qui reste depuis que le portrait
   * s'arrête au menton. Une denture plus marquée a été essayée : elle rendait
   * une découpe aux ciseaux, pas des cheveux.
   */
  const DENTS = 'C 127,58 116,73 104,85 C 100,77 94,75 88,78 '
    + 'C 74,88 54,95 36,93 C 29,100 24,110 23,124';

  const CALOTTE = 'M 23,124 C 18,60 48,9 100,9 C 155,9 184,55 175,127 '
    + 'C 167,112 163,95 157,83 C 150,68 144,56 134,46 ';

  /* Les deux mèches qui balaient le front, communes aux coiffures à raie. */
  const BALAI = [
    'M 137,44 C 127,62 113,77 93,87 C 105,70 115,55 121,40 Z',
    'M 125,55 C 113,71 95,85 70,93 C 89,79 103,65 113,49 Z',
  ];

  switch (style) {
    case 'mi-longs':
      return {
        derriere: 'M 19,152 C 13,79 48,7 100,7 C 157,7 189,75 183,152 '
          + 'C 179,169 170,179 161,183 C 169,150 169,107 161,79 '
          + 'C 152,47 130,29 100,29 C 70,29 47,47 38,79 '
          + 'C 31,107 31,150 39,183 C 29,179 23,169 19,152 Z',
        masse: `${CALOTTE}${DENTS} Z`,
        meches: BALAI,
        stries: ['M 162,86 C 169,112 169,148 162,177'],
      };
    case 'longs':
      return {
        derriere: 'M 15,197 C 7,103 42,5 100,5 C 161,5 195,103 187,197 '
          + 'C 178,193 168,189 161,182 C 170,143 168,101 160,75 '
          + 'C 150,43 128,25 100,25 C 72,25 50,43 40,75 '
          + 'C 32,101 30,143 39,182 C 32,189 24,193 15,197 Z',
        masse: `${CALOTTE}${DENTS} Z`,
        meches: BALAI,
        stries: ['M 34,86 C 27,122 27,162 34,192', 'M 168,86 C 175,122 175,162 168,192'],
      };
    case 'raides':
      /*
       * La seule coiffure sans raie : une frange coupée net, dont le bord garde
       * quand même de très légères pointes — une frange parfaitement droite est
       * une barre, et une barre n'est pas des cheveux.
       */
      return {
        derriere: 'M 19,184 C 15,79 48,5 100,5 C 153,5 185,79 181,184 '
          + 'L 160,184 C 167,141 167,99 159,75 C 150,43 128,25 100,25 '
          + 'C 72,25 50,43 41,75 C 33,99 33,141 40,184 Z',
        masse: 'M 23,120 C 19,61 48,7 100,7 C 155,7 183,55 177,120 '
          + 'C 175,103 173,91 171,83 C 164,88 158,84 152,80 '
          + 'C 145,88 137,83 130,79 C 122,88 114,82 106,79 '
          + 'C 98,88 90,82 82,79 C 74,88 66,83 58,80 '
          + 'C 50,88 40,84 30,82 C 27,92 24,104 23,120 Z',
        meches: [],
        stries: ['M 70,26 C 62,44 59,61 59,79', 'M 131,26 C 139,44 142,61 142,79'],
      };
    case 'ondulés':
      return {
        derriere: 'M 19,158 C 13,81 48,7 100,7 C 157,7 189,77 183,158 '
          + 'C 178,173 166,169 161,181 C 154,171 146,177 142,187 '
          + 'C 152,148 154,103 147,77 C 138,45 126,29 100,29 '
          + 'C 74,29 57,45 48,77 C 41,103 44,148 53,187 '
          + 'C 49,177 41,171 34,181 C 29,169 22,173 19,158 Z',
        masse: `${CALOTTE}${DENTS} Z`,
        meches: [BALAI[0]!],
        stries: ['M 46,88 C 40,116 40,152 50,182', 'M 156,88 C 162,116 162,152 152,182'],
      };
    case 'bouclés': {
      /*
       * Le contour est une guirlande d'arcs, pas un ovale : neuf demi-cercles
       * posés sur une même division, parce qu'à la main ils finissent toujours
       * décalés d'un côté. La guirlande part de la *gauche* et la fermeture
       * repart de la droite ; l'inverse — le premier jet — produisait un peigne
       * en dents de scie coupé net au ras des yeux.
       */
      const n = 9;
      const pt = (i: number) => {
        const a = (i * Math.PI) / n;
        return `${(100 - Math.cos(a) * 80).toFixed(1)},${(120 - Math.sin(a) * 112).toFixed(1)}`;
      };
      let d = `M ${pt(0)} `;
      for (let i = 1; i <= n; i += 1) d += `A 20,20 0 0 1 ${pt(i)} `;
      d += `C 178,104 172,88 164,76 C 154,60 144,50 134,46 ${DENTS} Z`;
      return { derriere: '', masse: d, meches: BALAI, stries: [] };
    }
    case 'crépus': {
      /*
       * Un halo dense bordé de boucles serrées, et un front dégagé plus haut
       * que sur les autres coiffures. Trois fautes avant d'y arriver : un halo
       * à peine plus large que le crâne — le personnage semblait chauve — puis
       * un halo débordant du cadre, coupé net, puis une ligne de fermeture qui
       * passait au *sommet* du crâne au lieu du front, si bien que le halo
       * n'était qu'un anneau autour d'une tête nue.
       */
      const n = 14;
      const pt = (i: number) => {
        const a = (i * Math.PI) / n;
        return `${(100 - Math.cos(a) * 86).toFixed(1)},${(118 - Math.sin(a) * 108).toFixed(1)}`;
      };
      let d = `M ${pt(0)} `;
      for (let i = 1; i <= n; i += 1) d += `A 13,13 0 0 1 ${pt(i)} `;
      d += 'C 184,100 178,88 170,80 C 158,73 144,69 130,68 '
        + 'C 122,60 112,62 106,70 C 96,64 86,64 80,71 '
        + 'C 62,73 44,77 30,82 C 22,90 16,101 14,118 Z';
      return { derriere: '', masse: d, meches: [], stries: ['M 44,76 C 60,54 88,42 118,46'] };
    }
    default: /* courts */
      return {
        derriere: '',
        masse: `${CALOTTE}${DENTS} Z`,
        meches: [...BALAI, 'M 141,44 C 153,59 162,76 166,96 C 157,78 147,61 132,48 Z'],
        stries: [],
      };
  }
}

/**
 * Cinq humeurs, tenues par trois gestes : la hauteur des sourcils, leur pente,
 * et la paupière qui descend. C'est tout ce qui reste comme canal expressif
 * depuis que le portrait s'arrête au menton, et c'est pour ça qu'aucune frange
 * ne descend sur les sourcils.
 */
const HUMEUR: Record<Humeur, { dy: number; pente: number; paupiere: number }> = {
  joie: { dy: -3, pente: -2, paupiere: 0 },
  calme: { dy: 0, pente: -1, paupiere: 0 },
  lassitude: { dy: 3, pente: -6, paupiere: 0.34 },
  peine: { dy: -1, pente: -13, paupiere: 0.16 },
  mal: { dy: 4, pente: -9, paupiere: 0.42 },
};

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
  const [peau, , creux] = PEAU[traits.peau] ?? PEAU.claire!;
  const [poil, poilOmbre, poilClair] = CHEVEUX[traits.cheveux] ?? CHEVEUX.bruns!;
  const iris = YEUX[traits.yeux] ?? YEUX.marron!;
  const forme = VISAGE[traits.visage] ?? VISAGE.ovale!;
  const { dy, pente, paupiere } = HUMEUR[traits.humeur];

  /*
   * L'âge se lit au rapport crâne/visage, pas aux rides : un enfant a une tête
   * large et un menton court. Un seul nombre suffit, et il s'éteint doucement
   * jusqu'à douze ans.
   */
  const jeune = Math.max(0, Math.min(1, (12 - traits.age) / 12));
  const l = forme.l * (1 + jeune * 0.05);
  const menton = forme.menton - jeune * 12;
  const machoire = forme.machoire + jeune * 0.08;

  const { derriere, masse, meches, stries } = chevelure(traits.coiffure);
  /* Les tracés de cheveux sont écrits pour une demi-largeur de 70 : ils
     suivent le crâne quand il change de forme, sinon la mèche flotte à côté
     de la tempe. */
  const k = l / 70;
  const echelleCheveux = `translate(${(100 * (1 - k)).toFixed(2)},0) scale(${k.toFixed(3)},1)`;

  /*
   * L'encre se déduit du teint, elle n'est pas fixe. Un noir constant sur un
   * teint « très foncée » ne se détache pas, et sur « très claire » il écrase
   * tout. On prend le creux du teint et on l'assombrit.
   */
  const ink = encrer(creux, 0.5);
  const inkCheveux = encrer(poilOmbre, 0.34);

  /* Sur un teint sombre, une lèvre neutre pose une barre grise au milieu du
     visage : elle doit rester dans les rouges, plus claire que la peau. */
  const sombre = ['brune', 'foncée', 'très foncée'].includes(traits.peau);
  const levreHaute = sombre ? '#9d5f50' : '#9d5849';
  const levreBasse = sombre ? '#c48978' : '#bd7261';

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
          <path d={AMANDE} />
        </clipPath>
      </defs>
      {derriere ? (
        <path
          d={derriere}
          fill={poil}
          stroke={inkCheveux}
          strokeWidth={3.1}
          strokeLinejoin="round"
          transform={echelleCheveux}
        />
      ) : null}
      {oreille('g', l, peau, ink)}
      {oreille('d', l, peau, ink)}
      <path
        d={crane(l, machoire, menton)}
        fill={peau}
        stroke={ink}
        strokeWidth={3.1}
        strokeLinejoin="round"
      />
      {signes.has('des taches de rousseur') ? (
        <g fill={creux} opacity={0.45}>
          {[[80, 140], [72, 146], [86, 149], [120, 140], [128, 146], [114, 149]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={1.7} />
          ))}
        </g>
      ) : null}
      {oeil('g', l, iris, peau, ink, paupiere)}
      {oeil('d', l, iris, peau, ink, paupiere)}
      {sourcil('g', dy, pente, inkCheveux)}
      {sourcil('d', dy, pente, inkCheveux)}
      {nez(ink)}
      <g transform="translate(-1,0)">{bouche(traits.humeur, levreHaute, levreBasse, ink)}</g>
      {signes.has('une fossette au menton') ? (
        <path
          d={`M 100,${menton - 16} L 100,${menton - 10}`}
          stroke={ink}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.45}
        />
      ) : null}
      <g transform={echelleCheveux}>
        <path
          d={masse}
          fill={poil}
          stroke={inkCheveux}
          strokeWidth={3.1}
          strokeLinejoin="round"
        />
        {meches.map((m) => (
          <path key={m} d={m} fill={poil} stroke={inkCheveux} strokeWidth={3.1} strokeLinejoin="round" />
        ))}
        {meches.slice(0, 2).map((m) => (
          <path key={`clair-${m}`} d={m} fill={poilClair} opacity={0.22} />
        ))}
        {stries.map((m) => (
          <path
            key={m}
            d={m}
            fill="none"
            stroke={inkCheveux}
            strokeWidth={2.2}
            strokeLinecap="round"
            opacity={0.5}
          />
        ))}
      </g>
    </svg>
  );
}

/** Le portrait d'un joueur, sans que l'appelant ait à connaître les traits. */
export function PlayerPortrait({ player, size }: { player: Player; size?: number }) {
  return <Portrait traits={traitsDe(player)} size={size} />;
}
