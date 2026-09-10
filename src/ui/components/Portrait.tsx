/**
 * Le portrait du personnage : tête, cou, épaules.
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
 * depuis le début et qui vaut mieux qu'une bibliothèque de portraits. Le
 * dessin est donc composé de formes pleines cernées d'un trait fin, à la même
 * épaisseur et aux mêmes jonctions rondes que le jeu d'icônes — mais rempli,
 * là où une icône ne l'est jamais : un visage est du *contenu*, pas de la
 * signalétique, et il doit garder sa couleur quand une ligne s'éteint.
 *
 * **Déterministe, et c'est la condition de la cohérence.** Aucun tirage n'a
 * lieu dans ce fichier : le même personnage donne toujours le même dessin, et
 * changer une seule caractéristique ne change qu'une seule chose à l'écran.
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
 * teint approché reste un visage.
 */
const PEAU: Record<string, [string, string]> = {
  'très claire': ['#f7ddc9', '#e6bda1'],
  claire: ['#efc9a8', '#d9a880'],
  mate: ['#dda878', '#c08a58'],
  dorée: ['#cf9963', '#b07c48'],
  brune: ['#a9713f', '#8a5730'],
  foncée: ['#7d4c26', '#63391b'],
  'très foncée': ['#583520', '#412516'],
};

const CHEVEUX: Record<string, [string, string]> = {
  bruns: ['#4a3524', '#33241a'],
  châtains: ['#6f4e2e', '#513821'],
  noirs: ['#211d1c', '#100e0e'],
  blonds: ['#d9b464', '#b88f42'],
  roux: ['#b4551f', '#8c3f14'],
  auburn: ['#7c3a1c', '#5c2812'],
  'poivre et sel': ['#8f8d89', '#6c6a67'],
};

const YEUX: Record<string, string> = {
  marron: '#6b4423',
  noisette: '#9a7b3f',
  verts: '#4a7a49',
  bleus: '#4a7ab0',
  gris: '#78858d',
  ambre: '#b07a2a',
  noirs: '#2a2422',
};

/**
 * **Le cerne se déduit du teint, il n'est pas fixé.**
 *
 * Le contour du visage, l'aile du nez et la bouche étaient une encre sombre
 * constante. Sur les teints clairs, très bien ; sur « très foncée » avec des
 * cheveux noirs, le portrait devenait une masse sans traits — le cerne, les
 * cheveux et la peau avaient la même valeur, et il ne restait que deux taches
 * pâles à la place des yeux.
 *
 * On choisit donc le côté qui contraste : plus sombre sur une peau claire,
 * plus clair sur une peau sombre. C'est ce que fait un illustrateur, et c'est
 * la seule façon d'avoir sept teints lisibles avec un seul dessin.
 */
function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => {
    const v = Number.parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.039_28 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

/** L'encre des traits du visage, pour un teint donné. */
function cerne(peau: string, force: number): string {
  return luminance(peau) > 0.19
    ? `rgba(58,38,26,${force})`
    : `rgba(255,236,222,${force * 0.9})`;
}

/**
 * La forme du visage, en deux nombres : la largeur de la mâchoire et son
 * arrondi. Six mots, six géométries, et le nom du visage se lit dans le
 * dessin — c'est ce qui rend un personnage reconnaissable d'une partie à
 * l'autre.
 */
const VISAGE: Record<string, { l: number; haut: number; machoire: number; tombe: number }> = {
  // `l` : demi-largeur du crâne. `haut` : hauteur du menton dans le cadre.
  // `machoire` : à quelle fraction de la largeur le menton se referme — c'est
  // ce seul nombre qui sépare une mâchoire carrée d'un visage en cœur.
  // `tombe` : à quelle hauteur la mâchoire commence à se refermer. C'est lui,
  // et non la largeur du menton seule, qui sépare un visage carré — dont les
  // côtés descendent droit avant de tourner net — d'un visage en cœur, qui
  // s'effile dès la pommette. Un seul paramètre ne suffisait pas : les six
  // formes se ressemblaient toutes.
  ovale: { l: 20, haut: 57, machoire: 0.55, tombe: 0.26 },
  ronde: { l: 22.4, haut: 54.5, machoire: 0.82, tombe: 0.2 },
  carrée: { l: 22, haut: 56, machoire: 0.95, tombe: 0.46 },
  allongée: { l: 18.2, haut: 60, machoire: 0.5, tombe: 0.3 },
  // Ces deux-là étaient à 0,3 et 0,24 : à cette taille de tête, le menton
  // faisait une goutte pointue et le visage devenait grotesque. Un visage en
  // cœur s'effile, il ne se termine pas en pointe.
  'en cœur': { l: 21.6, haut: 56, machoire: 0.48, tombe: 0.14 },
  anguleuse: { l: 20.6, haut: 57, machoire: 0.44, tombe: 0.4 },
};

/** Le sommet du crâne. Fixe : c'est le menton qui bouge, pas le front. */
const CIEL = 4;

/**
 * **Ni cou ni épaules : une tête seule.**
 *
 * La demande initiale disait « tête + cou + épaules » ; la référence fournie
 * ensuite est une tête qui remplit son cadre, et c'est elle qui tranche. Le
 * cou faisait une colonne sous le menton et volait la moitié de la place.
 *
 * Une conséquence, signalée plutôt que masquée : l'axe « vêtements visibles au
 * niveau des épaules » disparaît avec elles. `Col` et `colDe` restent — l'état
 * de la vie est toujours calculé — pour que le col revienne sans rien
 * reconstruire le jour où on le voudra.
 */

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
 * Mélanger deux couleurs. Sert à tirer d'un teint son éclairé et son ombré
 * sans avoir à écrire trois fois sept valeurs à la main — et surtout sans
 * risquer qu'elles se désaccordent le jour où l'une change.
 */
function melange(a: string, b: string, t: number): string {
  const lire = (h: string) => [0, 2, 4].map((i) => Number.parseInt(h.replace('#', '').slice(i, i + 2), 16));
  const [r1, g1, b1] = lire(a);
  const [r2, g2, b2] = lire(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1!, r2!)}${c(g1!, g2!)}${c(b1!, b2!)}`;
}

/**
 * La bouche, cinq états — **ouverte quand on sourit**.
 *
 * C'est ce qui sépare un visage vivant d'un masque : un sourire fermé est une
 * ligne, un sourire ouvert est une forme avec de la profondeur. Chaque état
 * rend donc une silhouette pleine, et le sourire y ajoute une dent claire.
 */
const BOUCHE: Record<Humeur, (cx: number, y: number, encre: string, k: number) => ReactNode> = {
  joie: (x, y, encre) => (
    <>
      <path d={`M${x - 6.4} ${y - 1.4}q6.4-1.6 12.8 0q-1.4 6.6-6.4 6.6t-6.4-6.6z`} fill={encre} />
      <path d={`M${x - 5.2} ${y - 0.9}q5.2-1 10.4 0q-.5 1.7-5.2 1.7t-5.2-1.7z`} fill="#fffdfa" />
    </>
  ),
  calme: (x, y, encre) => (
    // Une lèvre pleine : le filet d'un pixel qu'elle était disparaissait
    // complètement sur l'aplat du visage.
    <path d={`M${x - 5} ${y - 0.6}q5 3.4 10 0q-2.4 3.4-5 3.4t-5-3.4z`} fill={encre} />
  ),
  lassitude: (x, y, encre) => (
    <path d={`M${x - 4.4} ${y + .4}q4.4-1.6 8.8 0q-4.4 1.6-8.8 0z`} fill={encre} />
  ),
  peine: (x, y, encre) => (
    <path d={`M${x - 5} ${y + 2.4}q5-4.4 10 0q-5-2.2-10 0z`} fill={encre} />
  ),
  mal: (x, y, encre) => (
    <>
      <path d={`M${x - 4.4} ${y + 1.8}q4.4-3.6 8.8 0q-4.4-1.6-8.8 0z`} fill={encre} />
      <path
        d={`M${x - 2.6} ${y - 1}l1 2.2M${x + 1.6} ${y - 1}l1 2.2`}
        stroke={encre}
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
};

/** Les sourcils confirment l'humeur ; ils ne la racontent pas. */
const SOURCILS: Record<Humeur, (ligne: number) => string> = {
  joie: () => 'translate(0 -0.7)',
  calme: () => '',
  lassitude: () => 'translate(0 1.4)',
  // Retourner le tracé autour de sa propre ligne inverse la courbure : le
  // sourcil se relève à l'intérieur, ce qui est le visage de la peine. Le
  // pivot est calculé, jamais codé en dur — il suit la hauteur du visage.
  peine: (y) => `translate(0 ${y * 2 + 1.2}) scale(1 -1)`,
  mal: (y) => `translate(0 ${y * 2 + 2.4}) scale(1 -1)`,
};

/**
 * Les coiffures, construites sur la courbe du crâne.
 *
 * Chacune rend deux pièces : une masse **derrière** la tête, et une frange
 * **devant** le front. C'est ce recouvrement qui attache la chevelure au
 * crâne — sans la pièce avant, elle se lit comme un casque posé.
 *
 * Elles reprennent la courbe de la tête, élargie de `dl` : une forme qui suit
 * le crâne ne peut pas s'en décoller, quelle que soit la forme du visage.
 *
 * Le sexe n'entre pas ici : « longs » est la même coiffure sur un homme et
 * sur une femme, ce qui est tout l'intérêt d'un système de traits.
 */
function chevelure(
  style: string,
  l: number,
  menton: number,
  yeux: number,
): { arriere: string; avant: string } {
  const cx = 32;

  /** La courbe du crâne, élargie de `dl` et remontée d'autant. */
  const calotte = (dl: number) =>
    `M${cx - l - dl} ${yeux - 1}`
    + `C${cx - l - dl} ${CIEL - 2 - dl * 1.4} ${cx + l + dl} ${CIEL - 2 - dl * 1.4} ${cx + l + dl} ${yeux - 1}`;

  const masse = (dl: number, bas: number) => `${calotte(dl)}V${bas}h${-(l + dl) * 2}z`;

  /**
   * La frange, et sa ligne de base.
   *
   * Elle descendait jusqu'aux tempes et **recouvrait les sourcils** : l'humeur
   * du personnage ne se lisait plus du tout, alors que c'est la seule chose
   * qui bouge d'une année à l'autre. Elle s'arrête maintenant au-dessus de la
   * ligne des sourcils, et le creux la remonte encore au milieu du front.
   */
  const frange = (dl: number, creux: number) => {
    // La base suit la taille du crâne : figée, elle repassait sous les
    // sourcils dès que la tête grandissait, et l'humeur redevenait invisible.
    const base = yeux - 8.8 * (l / 14);
    return `M${cx - l - dl} ${base}`
      + `C${cx - l - dl} ${CIEL - 2 - dl * 1.4} ${cx + l + dl} ${CIEL - 2 - dl * 1.4} ${cx + l + dl} ${base}`
      + `q${-(l + dl)} ${-creux} ${-(l + dl) * 2} 0z`;
  };

  /**
   * Un bord festonné, engendré plutôt qu'écrit à la main.
   *
   * Il l'était : une suite de `q` recopiés, et les creux ne tombaient pas aux
   * mêmes abscisses à gauche et à droite — la frange penchait, ce qui se
   * lisait comme un sourcil de travers. Une largeur divisée en parts égales
   * est symétrique par construction.
   */
  const feston = (dl: number, dents: number, creux: number) => {
    const large = (l + dl) * 2;
    const pas = large / dents;
    const base = yeux - 8.8 * (l / 14);
    let d = `M${cx - l - dl} ${base}`
      + `C${cx - l - dl} ${CIEL - 2 - dl * 1.4} ${cx + l + dl} ${CIEL - 2 - dl * 1.4} ${cx + l + dl} ${base}`;
    for (let i = 0; i < dents; i += 1) {
      d += `q${-pas / 2} ${i % 2 ? creux : -creux} ${-pas} 0`;
    }
    return `${d}z`;
  };

  switch (style) {
    case 'longs':
      // Une calotte et deux pans : des cheveux longs tombent *de part et
      // d'autre* du cou, et c'est ce vide au milieu qui les distingue d'une
      // capuche. Une masse pleine recouvrait entièrement le cou.
      return {
        arriere: `${masse(1.8, yeux + 2)}`
          + `M${cx - l - 1.8} ${yeux}v${64 - yeux}h${6 * (l / 14)}V${yeux}z`
          + `M${cx + l + 1.8} ${yeux}v${64 - yeux}h${-6 * (l / 14)}V${yeux}z`,
        avant: frange(1.8, 5.4),
      };
    case 'mi-longs':
      return {
        arriere: `${masse(1.5, yeux + 2)}`
          + `M${cx - l - 1.5} ${yeux}v${menton - yeux - 2}h${5.6 * (l / 14)}V${yeux}z`
          + `M${cx + l + 1.5} ${yeux}v${menton - yeux - 2}h${-5.6 * (l / 14)}V${yeux}z`,
        avant: frange(1.5, 5.8),
      };
    case 'bouclés':
      return { arriere: masse(3, yeux + 4), avant: feston(3, 6, 2.4) };
    case 'crépus':
      return { arriere: masse(4.6, yeux + 3), avant: feston(4.6, 8, 1.6) };
    case 'ondulés':
      return { arriere: masse(1.6, yeux + 7), avant: feston(1.6, 4, 2.2) };
    case 'raides':
      return { arriere: masse(1.1, yeux + 2), avant: frange(1.1, 7) };
    default: // « courts »
      return { arriere: masse(1.2, yeux - 1), avant: frange(1.2, 4.8) };
  }
}

/**
 * Le portrait.
 *
 * **Le style vient d'une référence donnée par l'auteur du jeu**, et il tranche
 * avec le reste de l'interface : aucun contour, des aplats dégradés, de grands
 * yeux, une bouche ouverte, des reflets dans les cheveux. L'argument inverse —
 * faire appartenir le portrait au trait de 1,8 des icônes — était défendable
 * et a été essayé ; il a été écarté. Un visage n'est pas de la signalétique,
 * et il a le droit d'avoir sa propre langue.
 *
 * `size` est la seule mesure de mise en page : le dessin est fait sur une
 * grille de 64 et se met à l'échelle sans jamais se pixelliser.
 *
 * Le fond est transparent : c'est l'appelant qui décide du disque, du carré ou
 * de rien du tout.
 */
export function Portrait({ traits, size = 46 }: { traits: Traits; size?: number }) {
  const [peau, ombre] = PEAU[traits.peau] ?? PEAU.claire!;
  const [poil, poilOmbre] = CHEVEUX[traits.cheveux] ?? CHEVEUX.bruns!;
  const iris = YEUX[traits.yeux] ?? YEUX.marron!;
  const forme = VISAGE[traits.visage] ?? VISAGE.ovale!;

  /*
   * L'âge se lit au rapport crâne/visage, pas aux rides : un enfant a une tête
   * large et un menton court. Un seul nombre suffit, et il s'éteint doucement
   * jusqu'à douze ans.
   */
  const jeune = Math.max(0, Math.min(1, (12 - traits.age) / 12));
  const l = forme.l * (1 - jeune * 0.04);
  const menton = forme.haut - jeune * 4.5;
  const machoire = forme.machoire + jeune * 0.12;
  const tombe = forme.tombe;

  const cx = 32;
  const hh = menton - CIEL;
  /*
   * L'échelle des traits. Les positions étaient écrites en dur pour un crâne
   * de quatorze de demi-largeur ; la tête ayant grandi de moitié, tout ce qui
   * la peuple doit grandir avec elle — sans quoi on obtient un grand visage
   * avec de petits yeux au milieu.
   */
  const k = l / 14;
  // Les yeux à la moitié de la hauteur du crâne : c'est la proportion réelle,
  // et l'œil la remarque immédiatement quand on s'en écarte.
  const yeux = CIEL + hh * 0.5;
  const bouche = CIEL + hh * 0.82;
  const cheveux = chevelure(traits.coiffure, l, menton, yeux);
  const signes = new Set(traits.signes);

  /*
   * L'encre des traits se déduit du teint plutôt que d'être fixée : sur « très
   * foncée » avec des cheveux noirs, une encre sombre constante rendait le
   * visage illisible. On prend le côté qui contraste.
   */
  const encre = cerne(peau, 0.86);
  const clair = melange(peau, '#ffffff', 0.3);
  const poilClair = melange(poil, '#ffffff', 0.26);

  /*
   * Les dégradés portent le volume, à la place du contour. Leurs identifiants
   * viennent des couleurs : deux portraits de même teint partagent la même
   * définition, et deux teints différents ne peuvent pas se voler la leur —
   * ce qui arriverait avec un identifiant fixe dès qu'une liste en affiche
   * plusieurs.
   */
  const cle = `${peau}${poil}`.replaceAll('#', '');
  const idPeau = `p${cle}`;
  const idPoil = `c${cle}`;

  const tete = `M${cx - l} ${yeux - 2}`
    + `C${cx - l} ${CIEL - 2} ${cx + l} ${CIEL - 2} ${cx + l} ${yeux - 2}`
    + `C${cx + l} ${yeux + hh * tombe} ${cx + l * machoire} ${menton} ${cx} ${menton}`
    + `C${cx - l * machoire} ${menton} ${cx - l} ${yeux + hh * tombe} ${cx - l} ${yeux - 2}Z`;

  return (
    <svg
      className="ui-portrait"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={idPeau} cx="50%" cy="34%" r="66%">
          <stop offset="0%" stopColor={clair} />
          <stop offset="100%" stopColor={peau} />
        </radialGradient>
        <linearGradient id={idPoil} x1="18%" y1="0%" x2="86%" y2="100%">
          <stop offset="0%" stopColor={poilClair} />
          <stop offset="62%" stopColor={poil} />
          <stop offset="100%" stopColor={poilOmbre} />
        </linearGradient>
      </defs>

      <path d={cheveux.arriere} fill={`url(#${idPoil})`} />

      {/* Les oreilles, glissées sous le crâne. */}
      <ellipse cx={cx - l - 0.2} cy={yeux + 1.6 * k} rx={2.2 * k} ry={3 * k} fill={ombre} />
      <ellipse cx={cx + l + 0.2} cy={yeux + 1.6 * k} rx={2.2 * k} ry={3 * k} fill={ombre} />

      {/* La tête : un aplat dégradé, sans contour. C'est le dégradé qui donne
          le volume — un cerne le rendrait plat et dur. */}
      <path d={tete} fill={`url(#${idPeau})`} />

      {/* Les pommettes : deux touches chaudes, très transparentes. Elles ne
          se voient pas une par une, elles font que le visage n'est pas gris. */}
      <ellipse cx={cx - l * 0.6} cy={yeux + 5 * k} rx={3.6 * k} ry={2.4 * k} fill="#e0705c" opacity={0.13} />
      <ellipse cx={cx + l * 0.6} cy={yeux + 5 * k} rx={3.6 * k} ry={2.4 * k} fill="#e0705c" opacity={0.13} />

      {/*
        * Les yeux, grands et ronds : c'est eux qu'on regarde, et c'est leur
        * taille qui donne l'âge apparent et la douceur du style demandé. Le
        * blanc, l'iris, la pupille, deux éclats — et une paupière posée au
        * dessus, qui empêche l'œil de flotter.
        */}
      {[cx - 5.8 * k, cx + 5.8 * k].map((ex) => (
        <g key={ex}>
          <ellipse cx={ex} cy={yeux} rx={3.5 * k} ry={3.9 * k} fill="#fdfbf7" />
          <circle cx={ex} cy={yeux + 0.4} r={2.5 * k} fill={iris} />
          <circle cx={ex} cy={yeux + 0.4} r={2.5 * k} fill={melange(iris, '#000000', 0.35)} opacity={0.5} />
          <circle cx={ex} cy={yeux + 0.4} r={1.9 * k} fill={iris} />
          <circle cx={ex} cy={yeux + 0.5 * k} r={1 * k} fill="#17120f" />
          <circle cx={ex - 1 * k} cy={yeux - 1 * k} r={0.85 * k} fill="#ffffff" />
          <circle cx={ex + 1.1 * k} cy={yeux + 1.6 * k} r={0.42 * k} fill="#ffffff" opacity={0.75} />
          {/* La paupière : un arc mince posé sur le haut de l'œil. Pleine,
              elle faisait un dôme sombre et le regard paraissait mi-clos. */}
          {/* La paupière : un liseré, pas un couvercle. Trop épaisse, elle
              fermait le regard — un personnage malade avait l'air mort. */}
          <path
            d={`M${ex - 3.5 * k} ${yeux - 2.1 * k}a${3.5 * k} ${3.9 * k} 0 0 1 ${7 * k} 0q${-3.5 * k}${-1.3 * k} ${-7 * k} 0z`}
            fill={melange(poilOmbre, '#000000', 0.05)}
            opacity={0.85}
          />
        </g>
      ))}
      {signes.has('de longs cils') && (
        <path
          d={`M${cx - 9.4} ${yeux - 2.2}l-1.5-1.3M${cx + 9.4} ${yeux - 2.2}l1.5-1.3`}
          stroke={poilOmbre}
          strokeWidth={1.3}
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Les sourcils : deux arcs pleins, dans la couleur des cheveux. */}
      <path
        d={`M${cx - 9.8 * k} ${yeux - 6.4 * k}q${4 * k}${-2.6 * k} ${7.6 * k}${-0.8 * k}l${-0.5 * k} ${1.9 * k}q${-3.2 * k}${-1.4 * k} ${-6.6 * k} ${0.8 * k}z`}
        fill={poilOmbre}
        transform={SOURCILS[traits.humeur](yeux - 6)}
      />
      <path
        d={`M${cx + 9.8 * k} ${yeux - 6.4 * k}q${-4 * k}${-2.6 * k} ${-7.6 * k}${-0.8 * k}l${0.5 * k} ${1.9 * k}q${3.2 * k}${-1.4 * k} ${6.6 * k} ${0.8 * k}z`}
        fill={poilOmbre}
        transform={SOURCILS[traits.humeur](yeux - 6)}
      />

      {/* Le nez : une ombre douce, pas un trait. Une arête dessinée se lisait
          comme une cicatrice au milieu du visage. */}
      <ellipse cx={cx} cy={yeux + 5.4 * k} rx={2.3 * k} ry={1.5 * k} fill={ombre} opacity={0.55} />

      {BOUCHE[traits.humeur](cx, bouche, encre, k)}

      {/* Les particularités tirées par le moteur. */}
      {signes.has('des taches de rousseur') && (
        <g fill={ombre} opacity={0.7}>
          {[-8.4, -6.4, -4.6, 4.6, 6.4, 8.4].map((dx, i) => (
            <circle key={dx} cx={cx + dx} cy={yeux + 4.4 + (i % 2) * 1.4} r={0.6} />
          ))}
        </g>
      )}
      {signes.has('une fossette au menton') && (
        <ellipse cx={cx} cy={menton - 3.4} rx={0.9} ry={1.3} fill={ombre} opacity={0.6} />
      )}
      {signes.has('un grain de beauté marqué') && (
        <circle cx={cx + 7.4} cy={bouche - 2.4} r={0.9} fill={melange(ombre, '#000000', 0.4)} />
      )}
      {signes.has('une cicatrice au sourcil') && (
        <path
          d={`M${cx + 6.8} ${yeux - 8.4}l2 3.8`}
          stroke={ombre}
          strokeWidth={1.4}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {signes.has('des pommettes hautes') && (
        <>
          <ellipse cx={cx - l * 0.62} cy={yeux + 3.6} rx={3} ry={1.5} fill={clair} opacity={0.55} />
          <ellipse cx={cx + l * 0.62} cy={yeux + 3.6} rx={3} ry={1.5} fill={clair} opacity={0.55} />
        </>
      )}

      {/* La frange, par-dessus le front, et son reflet. */}
      <path d={cheveux.avant} fill={`url(#${idPoil})`} />
      {/*
        * Le reflet : un croissant clair posé sur le haut du crâne.
        *
        * Il était une *copie* de la frange remise à l'échelle : la transformée
        * la décalait hors de la tête et rendait une tache grise flottante à
        * côté du visage. Une forme dessinée à sa place ne peut pas se
        * détacher de ce qu'elle éclaire.
        */}
      <path
        d={`M${cx - l * 0.72} ${CIEL + hh * 0.2}`
          + `q${l * 0.36} ${-hh * 0.19} ${l * 0.96} ${-hh * 0.05}`
          + `q${-l * 0.6} ${hh * 0.07} ${-l * 0.82} ${hh * 0.19}z`}
        fill={melange(poil, '#ffffff', 0.42)}
        opacity={0.65}
      />
      {signes.has('une mèche rebelle') && (
        <path
          d={`M${cx + l - 4} ${CIEL + 2}q4.5-5.5 6.5-1.5`}
          fill="none"
          stroke={poil}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}


/** Le portrait d'un joueur, sans que l'appelant ait à connaître les traits. */
export function PlayerPortrait({ player, size }: { player: Player; size?: number }) {
  return <Portrait traits={traitsDe(player)} size={size} />;
}
