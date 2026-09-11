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
 * **Ce que la version précédente faisait de travers, et le verdict qui l'a
 * enterrée.** Elle empilait des ellipses et des rectangles arrondis : un
 * disque pour le crâne, un rectangle arrondi pour la frange, une pastille pour
 * chaque sourcil, un ovale pour la bouche. Aucune ellipse ne ressemble à une
 * mèche de cheveux, à une paupière ou à une lèvre — d'où le verdict de
 * l'auteur du jeu, exact : « ça se voit que c'est de l'IA, c'est du
 * gribouillage ». Les formes sont maintenant des courbes de Bézier écrites à
 * la main, avec les quelques choses qui font qu'un visage tient :
 *
 * - **une raie décentrée** vers x = 132, et une mèche qui balaie le front en
 *   biais. Une coiffure symétrique se lit comme un casque, et c'est la faute
 *   la plus visible de la version en boîtes ;
 * - **une paupière haute plus lourde que la basse**, et l'iris qui passe
 *   dessous au lieu de flotter au milieu du blanc ;
 * - **un sourcil qui s'affine vers la tempe** : c'est la variation d'épaisseur
 *   qui le fait lire comme un sourcil, une barre de largeur constante ne dit
 *   rien ;
 * - **des lèvres avec un arc de Cupidon** et une ligne de partage, qui est ce
 *   qu'on lit en premier de loin ;
 * - **un contour de cheveux qui s'imbrique dans le crâne**, au lieu d'être
 *   posé dessus comme un chapeau.
 *
 * Le style est **plat et assumé** : aucun dégradé, aucune ombre large. Une
 * ombre couvrant la moitié droite du visage a été essayée ; sa frontière
 * intérieure traçait une arête nette du front au menton, qui se lisait comme
 * une fissure. À plat, il faut soit rien, soit un liseré qui suit le contour.
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

/**
 * Le crâne, écrit à partir de ses trois mesures.
 *
 * Six courbes : la calotte, les tempes, les pommettes, la mâchoire qui
 * s'incline, le menton. Le piège d'un ovale, c'est qu'il n'a ni pommette ni
 * mâchoire — il rend une patate, et c'est exactement ce que rendait la version
 * en boîtes.
 */
function crane(l: number, machoire: number, menton: number): string {
  const xg = 100 - l;
  const xd = 100 + l;
  const m = l * machoire;
  return `M ${xg},96 C ${xg},50 ${100 - l * 0.6},22 100,22 `
    + `C ${100 + l * 0.6},22 ${xd},50 ${xd},96 `
    + `C ${xd},122 ${100 + m + 8},140 ${100 + m},156 `
    + `C ${100 + m - 11},176 ${100 + 24},${menton} 100,${menton} `
    + `C ${100 - 24},${menton} ${100 - m + 11},176 ${100 - m},156 `
    + `C ${100 - m - 8},140 ${xg},122 ${xg},96 Z`;
}

/**
 * L'oreille, avec son ourlet. Sans l'ourlet, c'est une virgule collée au
 * crâne ; la version précédente en avait fait deux anses.
 */
function oreille(cote: 'g' | 'd', l: number, creux: string): ReactNode {
  const dx = l - 70;
  return (
    <g
      key={cote}
      transform={cote === 'g' ? `translate(${-dx},0)` : `translate(${200 + dx},0) scale(-1,1)`}
    >
      <path d="M 37,104 C 26,98 17,107 20,120 C 23,133 33,140 41,136" />
      <path
        d="M 34,112 C 28,113 26,120 30,126"
        fill="none"
        stroke={creux}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.45}
      />
    </g>
  );
}

/**
 * L'œil.
 *
 * Une amande, pas un cercle : le coin extérieur descend un peu, l'intérieur
 * remonte vers le nez. La paupière haute est un trait épais posé *par-dessus*
 * l'amande — c'est elle qui donne le regard ; la basse est deux fois plus fine.
 *
 * `paupiere` la fait descendre **le long de la courbe du cil**, jamais à plat.
 * Le premier jet posait une dalle de peau à bord droit en travers de l'œil :
 * les personnages fatigués portaient une visière.
 */
/**
 * Le découpage de l'œil, partagé par tous les portraits de la page.
 *
 * Un identifiant par portrait produirait autant de définitions identiques qu'il
 * y a de visages à l'écran — et une liste de personnages en affiche vingt. La
 * forme de l'amande ne dépend d'aucune caractéristique : une seule définition
 * suffit, et le document reste valide.
 */
const CLIP_OEIL = 'portrait-oeil';
const AMANDE = 'M 60,124 C 66,111 82,107 92,119 C 88,133 68,135 60,124 Z';

function oeil(
  cote: 'g' | 'd',
  l: number,
  iris: string,
  peau: string,
  poilOmbre: string,
  creux: string,
  paupiere: number,
): ReactNode {
  const dx = (l - 70) * 0.35;
  const d = paupiere * 20;
  const cil = `M 58,${125 + d} C 64,${109 + d} 83,${105 + d} 94,${119 + d}`;
  return (
    <g
      key={cote}
      transform={cote === 'g' ? `translate(${-dx},0)` : `translate(${200 + dx},0) scale(-1,1)`}
    >
      <path d={AMANDE} fill="#fbf6ef" />
      <g clipPath={`url(#${CLIP_OEIL})`}>
        <circle cx={77} cy={122} r={10.4} fill={iris} />
        <circle cx={77} cy={122} r={4.8} fill="#171210" />
        <circle cx={73.4} cy={118.2} r={2.7} fill="#ffffff" />
        {/* L'ombre que porte la paupière sur le haut du globe. Sans elle,
            l'iris est une bille posée sur du blanc. */}
        <path d="M 58,118 C 66,110 84,107 94,118 L 94,104 L 58,104 Z" fill="#000000" opacity={0.07} />
        {d ? <path d={`${cil} L 94,100 L 58,100 Z`} fill={peau} /> : null}
      </g>
      <path d={cil} fill="none" stroke={poilOmbre} strokeWidth={3.4} strokeLinecap="round" />
      <path
        d="M 62,129 C 70,134 84,133 90,126"
        fill="none"
        stroke={creux}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.45}
      />
    </g>
  );
}

/**
 * Le sourcil : épais à la tête, affiné vers la queue.
 *
 * **Le signe de la pente comptait, et il était inversé.** Sur le sourcil de
 * gauche, une pente négative lève l'extrémité *intérieure* : c'est le dessin
 * de la tristesse. Une pente positive la baisse : c'est la colère. La première
 * version les avait échangés, et le personnage triste avait l'air furieux.
 */
function sourcil(cote: 'g' | 'd', dy: number, pente: number): ReactNode {
  return (
    <g key={cote} transform={cote === 'g' ? undefined : 'translate(200,0) scale(-1,1)'}>
      <path
        transform={`translate(0,${dy}) rotate(${cote === 'g' ? pente : -pente} 90 102)`}
        d="M 90,100 C 82,92 67,90 56,98 C 55,100 56,102 58,101 C 68,96 81,98 88,105 C 90,105 91,102 90,100 Z"
      />
    </g>
  );
}

/**
 * Le nez.
 *
 * Pas de bloc : une ombre le long de l'arête, et le trait du dessous. Le bloc
 * a été essayé deux fois — il se lisait d'abord comme une cicatrice verticale,
 * puis, une fois flanqué de ses deux ailes, comme un cœur.
 */
function nez(ombre: string, creux: string): ReactNode {
  return (
    <>
      <path
        d="M 103,116 C 106,130 110,143 109,150 C 106,155 98,155 95,150 C 99,144 100,130 99,116 Z"
        fill={ombre}
        opacity={0.26}
      />
      <path
        d="M 93,150 C 96,155 104,155 107,150"
        fill="none"
        stroke={creux}
        strokeWidth={2.2}
        strokeLinecap="round"
        opacity={0.85}
      />
    </>
  );
}

/**
 * La bouche.
 *
 * La lèvre haute porte l'arc de Cupidon — deux bosses et un creux au milieu ;
 * la basse est plus pleine. Entre les deux, la ligne des lèvres, qui est ce
 * qu'on lit en premier de loin. Un rectangle arrondi ne peut rien de tout ça.
 */
function bouche(humeur: Humeur, levre: string, pli: string): ReactNode {
  const trait = (d: string) => (
    <path d={d} fill="none" stroke={pli} strokeWidth={1.8} strokeLinecap="round" />
  );
  switch (humeur) {
    case 'joie':
      return (
        <>
          <path
            d="M 74,166 C 84,162 92,166 100,166 C 108,166 116,162 126,166 C 124,184 108,194 100,194 C 92,194 76,184 74,166 Z"
            fill={levre}
          />
          <path
            d="M 77,167 C 86,164 94,167 100,167 C 106,167 114,164 123,167 C 121,174 110,178 100,178 C 90,178 79,174 77,167 Z"
            fill="#fdfaf5"
          />
          {trait('M 74,166 C 86,170 114,170 126,166')}
        </>
      );
    case 'peine':
      return (
        <>
          <path
            d="M 80,176 C 86,166 94,172 100,171 C 106,172 114,166 120,176 C 114,181 86,181 80,176 Z"
            fill={levre}
          />
          {trait('M 80,176 C 88,170 112,170 120,176')}
        </>
      );
    case 'lassitude':
      return (
        <>
          <path
            d="M 80,170 C 87,166 94,169 100,169 C 106,169 113,166 120,170 C 116,177 84,177 80,170 Z"
            fill={levre}
          />
          {trait('M 80,170 C 90,173 110,173 120,170')}
        </>
      );
    case 'mal':
      return (
        <>
          <path
            d="M 88,168 C 92,163 108,163 112,168 C 114,177 108,182 100,182 C 92,182 86,177 88,168 Z"
            fill={levre}
          />
          {trait('M 88,169 C 94,172 106,172 112,169')}
        </>
      );
    default:
      return (
        <>
          <path
            d="M 79,167 C 86,159 94,165 100,164 C 106,165 114,159 121,167 C 116,181 84,181 79,167 Z"
            fill={levre}
          />
          {trait('M 79,167 C 90,172 110,172 121,167')}
        </>
      );
  }
}

/**
 * Sept coiffures, chacune un vrai contour.
 *
 * Chaque style rend trois choses : `derriere` — ce qui passe derrière la tête,
 * `devant` — ce qui retombe sur le front, et `meches` — les traits clairs qui
 * donnent le sens du peigne. Le premier jet ne renvoyait qu'une liste dont
 * tout sauf le premier élément passait devant : les vagues d'« ondulés »
 * rendaient des pavés au milieu des joues.
 *
 * `courts` est servi par le `default` ; les six autres ont leur `case`, et un
 * test le vérifie — sans quoi une coiffure ajoutée dans `cradle.ts` serait
 * dessinée comme une autre, en silence.
 */
function chevelure(style: string): { derriere: string; devant: string; meches: string[] } {
  /*
   * La ligne de front, commune aux coiffures à raie. Elle part de la raie —
   * décentrée vers x = 132, jamais au milieu — et descend en biais jusqu'à la
   * tempe gauche. Elle s'arrête au-dessus des sourcils : une mèche qui les
   * couvre détruit le seul canal d'expression qui reste depuis que le portrait
   * s'arrête au menton.
   */
  const FRANGE = 'C 124,64 110,76 92,84 C 74,92 48,88 36,92 C 29,100 25,112 24,124';

  /*
   * Le devant, commun aux coiffures à raie. La masse dépasse le crâne de dix
   * points au sommet et de six sur les côtés : des cheveux ont du volume. Le
   * premier jet collait au crâne, et la coiffure se lisait comme une calotte
   * peinte sur la tête ; le deuxième laissait une échancrure blanche à la
   * tempe droite, où le contour de retour passait *en dehors* du crâne.
   */
  const DEVANT = 'M 24,124 C 19,62 48,10 100,10 C 154,10 183,56 174,126 '
    + 'C 166,112 162,96 156,84 C 149,69 143,58 132,50 ';

  switch (style) {
    case 'mi-longs':
      return {
        derriere: 'M 20,152 C 14,80 48,8 100,8 C 156,8 188,76 182,152 '
          + 'C 178,168 170,178 161,182 C 168,150 168,108 161,80 '
          + 'C 152,48 130,30 100,30 C 70,30 48,48 39,80 '
          + 'C 32,108 32,150 39,182 C 30,178 24,168 20,152 Z',
        devant: `${DEVANT}${FRANGE} Z`,
        meches: [
          'M 120,42 C 110,60 95,72 76,80',
          'M 133,50 C 123,68 106,80 86,88',
          'M 166,88 C 172,114 172,148 166,176',
        ],
      };
    case 'longs':
      return {
        derriere: 'M 16,200 C 8,104 42,6 100,6 C 160,6 194,104 186,200 '
          + 'C 177,196 168,192 161,185 C 169,144 167,102 159,76 '
          + 'C 149,44 128,26 100,26 C 72,26 51,44 41,76 '
          + 'C 33,102 31,144 39,185 C 32,192 25,196 16,200 Z',
        devant: `${DEVANT}${FRANGE} Z`,
        meches: [
          'M 120,42 C 110,60 95,72 76,80',
          'M 36,84 C 27,122 27,164 34,196',
          'M 166,84 C 175,122 175,164 168,196',
        ],
      };
    case 'raides':
      /*
       * La seule coiffure sans raie : une frange coupée net au-dessus des
       * sourcils. Son bord bas est presque une ligne, et c'est ce qui la
       * distingue des six autres au premier coup d'œil. Le premier jet en
       * faisait une dalle à bord parfaitement droit, posée sur les sourcils.
       */
      return {
        derriere: 'M 20,184 C 16,80 48,6 100,6 C 152,6 184,80 180,184 '
          + 'L 160,184 C 166,142 166,100 159,76 C 150,44 128,26 100,26 '
          + 'C 72,26 50,44 41,76 C 34,100 34,142 40,184 Z',
        devant: 'M 24,120 C 20,62 48,8 100,8 C 154,8 182,56 176,120 '
          + 'C 174,104 172,92 170,84 C 148,79 124,77 100,78 '
          + 'C 76,77 52,79 30,84 C 28,92 25,104 24,120 Z',
        meches: ['M 72,26 C 64,44 60,60 59,78', 'M 128,26 C 136,44 140,60 141,78'],
      };
    case 'ondulés':
      /*
       * Le bord bas ondule : trois creux et trois bosses écrits comme une
       * suite de courbes qui se répondent.
       */
      return {
        derriere: 'M 20,158 C 14,82 48,8 100,8 C 156,8 188,78 182,158 '
          + 'C 177,172 166,168 161,180 C 154,170 147,176 143,186 '
          + 'C 152,148 154,104 147,78 C 138,46 126,30 100,30 '
          + 'C 74,30 58,46 49,78 C 42,104 44,148 53,186 '
          + 'C 49,176 42,170 35,180 C 30,168 23,172 20,158 Z',
        devant: `${DEVANT}${FRANGE} Z`,
        meches: [
          'M 120,42 C 111,60 96,72 78,80',
          'M 49,86 C 42,116 42,152 51,182',
          'M 153,86 C 160,116 160,152 151,182',
        ],
      };
    case 'bouclés': {
      /*
       * Le contour est une guirlande d'arcs, pas un ovale : neuf demi-cercles
       * posés sur une même division, parce qu'à la main ils finissent toujours
       * par se décaler d'un côté.
       *
       * La guirlande part de la *gauche* et la fermeture repart de la droite.
       * L'inverse — qui était le premier jet — produisait un peigne en dents
       * de scie coupé net au ras des yeux.
       */
      const n = 9;
      const pt = (i: number) => {
        const a = (i * Math.PI) / n;
        return `${(100 - Math.cos(a) * 80).toFixed(1)},${(120 - Math.sin(a) * 112).toFixed(1)}`;
      };
      let d = `M ${pt(0)} `;
      for (let i = 1; i <= n; i += 1) d += `A 20,20 0 0 1 ${pt(i)} `;
      d += 'C 178,104 172,88 164,76 C 154,60 142,50 130,46 '
        + 'C 122,62 108,74 90,82 C 72,90 46,88 34,92 C 26,100 21,110 20,120 Z';
      return {
        derriere: '',
        devant: d,
        meches: ['M 119,42 C 109,60 94,72 75,80', 'M 131,50 C 121,68 103,80 83,88'],
      };
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
      d += 'C 184,100 178,88 170,80 C 150,71 124,67 100,68 '
        + 'C 76,67 50,71 30,80 C 22,88 16,100 14,118 Z';
      return {
        derriere: '',
        devant: d,
        meches: ['M 40,92 C 58,64 90,50 124,56', 'M 36,106 C 50,80 78,62 108,58'],
      };
    }
    default: /* courts */
      return {
        derriere: '',
        devant: `${DEVANT}${FRANGE} Z`,
        meches: [
          'M 120,42 C 110,60 95,72 76,80',
          'M 131,48 C 121,66 104,78 84,86',
          'M 140,44 C 150,58 158,74 163,92',
        ],
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
 * grille de 200 et se met à l'échelle sans jamais se pixelliser.
 *
 * Le fond est transparent : c'est l'appelant qui décide du disque, du carré ou
 * de rien du tout.
 */
export function Portrait({ traits, size = 46 }: { traits: Traits; size?: number }) {
  const [peau, ombre, creux] = PEAU[traits.peau] ?? PEAU.claire!;
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

  const { derriere, devant, meches } = chevelure(traits.coiffure);
  /* Les tracés de cheveux sont écrits pour une demi-largeur de 70 : ils
     suivent le crâne quand il change de forme, sinon la mèche flotte à côté
     de la tempe. */
  const k = l / 70;
  const echelleCheveux = `translate(${(100 * (1 - k)).toFixed(2)},0) scale(${k.toFixed(3)},1)`;

  /* Sur un teint sombre, une lèvre neutre pose une barre grise au milieu du
     visage, et la pommette rend deux taches qui se lisent comme des hématomes.
     Les deux se déduisent du teint plutôt que d'être fixés. */
  const sombre = ['brune', 'foncée', 'très foncée'].includes(traits.peau);
  const levre = sombre ? '#ad6d5d' : '#9d5849';
  const pli = sombre ? '#6b3a2c' : '#7d4034';
  const rose = sombre ? 0.07 : 0.13;

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
        <path d={derriere} fill={poil} transform={echelleCheveux} />
      ) : null}
      <g fill={peau}>
        {oreille('g', l, creux)}
        {oreille('d', l, creux)}
      </g>
      <path d={crane(l, machoire, menton)} fill={peau} />
      <ellipse cx={100 - l * 0.61} cy={142} rx={14} ry={8} fill="#d8604a" opacity={rose} />
      <ellipse cx={100 + l * 0.61} cy={142} rx={14} ry={8} fill="#d8604a" opacity={rose} />
      {signes.has('des taches de rousseur') ? (
        <g fill={creux} opacity={0.42}>
          {[
            [82, 138], [74, 144], [88, 147], [118, 138], [126, 144], [112, 147],
          ].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.7} />)}
        </g>
      ) : null}
      {oeil('g', l, iris, peau, poilOmbre, creux, paupiere)}
      {oeil('d', l, iris, peau, poilOmbre, creux, paupiere)}
      <g fill={poilOmbre}>
        {sourcil('g', dy, pente)}
        {sourcil('d', dy, pente)}
      </g>
      {nez(ombre, creux)}
      <g transform="translate(0,-5)">{bouche(traits.humeur, levre, pli)}</g>
      {signes.has('une fossette au menton') ? (
        <path
          d={`M 100,${menton - 16} L 100,${menton - 10}`}
          stroke={creux}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.4}
        />
      ) : null}
      <g transform={echelleCheveux}>
        <path d={devant} fill={poil} />
        {meches.map((m) => (
          <path
            key={m}
            d={m}
            fill="none"
            stroke={poilClair}
            strokeWidth={2.2}
            strokeLinecap="round"
            opacity={0.3}
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
