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
  ovale: { l: 13.8, haut: 41, machoire: 0.55, tombe: 0.26 },
  ronde: { l: 15.8, haut: 39, machoire: 0.82, tombe: 0.2 },
  carrée: { l: 15.6, haut: 40.5, machoire: 0.95, tombe: 0.46 },
  allongée: { l: 12.4, haut: 44, machoire: 0.5, tombe: 0.3 },
  'en cœur': { l: 15.2, haut: 41, machoire: 0.3, tombe: 0.12 },
  anguleuse: { l: 14.4, haut: 42.5, machoire: 0.24, tombe: 0.4 },
};

/** Le sommet du crâne. Fixe : c'est le menton qui bouge, pas le front. */
const CIEL = 6;

/**
 * La ligne des épaules, fixe elle aussi.
 *
 * Elle l'était à `menton + 3`, et c'était le défaut : la mâchoire n'avait
 * alors que trois pixels de dégagement, or c'est exactement là que les six
 * visages se distinguent. Un menton caché par un col, ce sont six formes qui
 * se ressemblent. En l'ancrant bas, le cou s'allonge ou se raccourcit selon
 * le visage — ce qui est juste — et la mâchoire reste visible dans tous les
 * cas.
 */
const EPAULES = 50;

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

const COLS: Record<Col, { corps: string; detail?: string }> = {
  // Un nourrisson n'a que ses épaules et une brassière.
  nu: { corps: '#e8e4dd' },
  simple: { corps: '#5d6478' },
  ecole: { corps: '#3f5d8a', detail: '#ffffff' },
  travail: { corps: '#2b3242', detail: '#ffffff' },
  detenu: { corps: '#8a7a4a' },
  age: { corps: '#6b5f57', detail: '#d8cfc4' },
};

/**
 * La bouche, cinq états, tracée à partir du visage plutôt qu'en coordonnées
 * figées : un menton court et un menton long ne portent pas la bouche à la
 * même hauteur. On lit une humeur à la courbure d'une ligne bien avant d'en
 * lire les sourcils.
 */
const BOUCHE: Record<Humeur, (cx: number, y: number) => string> = {
  joie: (x, y) => `M${x - 5.2} ${y - 0.8}q5.2 4.6 10.4 0`,
  calme: (x, y) => `M${x - 3.8} ${y}h7.6`,
  lassitude: (x, y) => `M${x - 3.8} ${y + 0.4}q3.8-1.5 7.6 0`,
  peine: (x, y) => `M${x - 4.6} ${y + 1.6}q4.6-3.8 9.2 0`,
  mal: (x, y) => `M${x - 4} ${y + 0.8}q4-2.8 8 0M${x - 2.4} ${y - 0.6}l1 2.6M${x + 1.4} ${y - 0.6}l1 2.6`,
};

/**
 * Les sourcils confirment l'humeur, ils ne la racontent pas — d'où une simple
 * transformation appliquée au même tracé plutôt que cinq dessins. Les faire
 * pivoter vers l'intérieur ferme le regard, vers l'extérieur l'ouvre.
 */
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
 * **Le défaut qu'on répare ici.** La première version dessinait la calotte
 * comme une courbe indépendante refermée par une ligne droite : à quatre
 * fois la taille réelle, elle rendait un *bandeau creux* — le sommet du crâne
 * restait vide et la chevelure se lisait comme un casque posé.
 *
 * Elles reprennent donc exactement la courbe de la tête, élargie de `dl`, et
 * se referment sur une base horizontale. Une forme qui suit le crâne ne peut
 * pas s'en décoller, quelle que soit la forme du visage.
 *
 * Chacune rend deux pièces : une masse **derrière**, dont la base descend
 * plus ou moins bas selon la longueur, et une frange **devant** le front, qui
 * est la même courbe refermée sur la ligne des sourcils. C'est ce
 * recouvrement qui attache la chevelure au crâne.
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

  /** La masse arrière : la calotte, refermée sur une base horizontale. */
  const masse = (dl: number, bas: number) =>
    `${calotte(dl)}V${bas}h${-(l + dl) * 2}z`;

  /** La frange : la calotte refermée sur une courbe de front. */
  const frange = (dl: number, creux: number) =>
    `${calotte(dl)}q${-(l + dl)} ${-creux} ${-(l + dl) * 2} 0z`;

  /**
   * Une frange festonnée, **engendrée** plutôt qu'écrite.
   *
   * Écrites à la main, les vagues étaient asymétriques : elles retombaient
   * plus bas sur un œil que sur l'autre, ce qui se lisait comme un sourcil de
   * travers plutôt que comme une boucle. Une boucle répétée sur une largeur
   * divisée en parts égales ne peut pas l'être.
   */
  const feston = (dl: number, n: number, creux: number) => {
    const pas = ((l + dl) * 2) / n;
    let d = calotte(dl);
    for (let i = 0; i < n; i += 1) d += `q${-pas / 2} ${-creux} ${-pas} 0`;
    return `${d}z`;
  };

  switch (style) {
    case 'longs':
      /*
       * **Une calotte et deux pans, jamais un rectangle plein.**
       *
       * La masse descendait d'un bloc jusqu'aux épaules : à quatre fois la
       * taille réelle, elle recouvrait entièrement le cou et rendait une dalle
       * noire sous le menton. Des cheveux longs tombent *de part et d'autre* du
       * cou ; c'est ce vide au milieu qui les distingue d'une capuche.
       */
      return {
        arriere: `${masse(1.6, yeux + 2)}`
          + `M${cx - l - 1.6} ${yeux}v${EPAULES - yeux}h4.6V${yeux}z`
          + `M${cx + l + 1.6} ${yeux}v${EPAULES - yeux}h-4.6V${yeux}z`,
        avant: frange(1.6, 5.2),
      };
    case 'mi-longs':
      // Même construction, des pans plus courts : ils s'arrêtent à la mâchoire.
      return {
        arriere: `${masse(1.4, yeux + 2)}`
          + `M${cx - l - 1.4} ${yeux}v${menton - yeux - 2}h4.2V${yeux}z`
          + `M${cx + l + 1.4} ${yeux}v${menton - yeux - 2}h-4.2V${yeux}z`,
        avant: frange(1.4, 5.6),
      };
    case 'bouclés':
      return {
        // Plus large que le crâne, et un bord festonné : ce sont les creux du
        // bord qui disent « boucle », pas la silhouette générale.
        arriere: masse(2.8, yeux + 4),
        avant: feston(2.8, 5, 3.4),
      };
    case 'crépus':
      return {
        // Le volume est au-dessus du crâne, et le bord y est régulier.
        arriere: masse(4.4, yeux + 3),
        avant: frange(4.4, 3.4),
      };
    case 'ondulés':
      return {
        arriere: masse(1.4, yeux + 7),
        avant: feston(1.4, 3, 4.2),
      };
    case 'raides':
      return {
        arriere: masse(1, yeux + 2),
        avant: frange(1, 6.8),
      };
    default: // « courts »
      return {
        arriere: masse(1.1, yeux - 1),
        avant: frange(1.1, 4.6),
      };
  }
}

/**
 * Le portrait.
 *
 * `size` est la seule mesure de mise en page : le dessin est fait sur une
 * grille de 64 et se met à l'échelle sans jamais se pixelliser, ce qu'un
 * emoji ne savait pas faire.
 *
 * Le fond est transparent : c'est l'appelant qui décide du disque, du carré
 * ou de rien du tout, et le portrait ne se bat pas avec lui.
 */
export function Portrait({ traits, size = 46 }: { traits: Traits; size?: number }) {
  const [peau, ombre] = PEAU[traits.peau] ?? PEAU.claire!;
  const [poil, poilOmbre] = CHEVEUX[traits.cheveux] ?? CHEVEUX.bruns!;
  const iris = YEUX[traits.yeux] ?? YEUX.marron!;
  const forme = VISAGE[traits.visage] ?? VISAGE.ovale!;

  /*
   * L'âge se lit au rapport crâne/visage, pas aux rides : un enfant a une tête
   * large et un menton court. Un seul nombre suffit à le dire, et il s'éteint
   * doucement jusqu'à douze ans.
   */
  const jeune = Math.max(0, Math.min(1, (12 - traits.age) / 12));
  const l = forme.l * (1 - jeune * 0.04);
  const menton = forme.haut - jeune * 4.5;
  const machoire = forme.machoire + jeune * 0.12;
  const tombe = forme.tombe;

  const cx = 32;
  const hh = menton - CIEL;
  // Les yeux à la moitié de la hauteur du crâne : c'est la proportion réelle,
  // et l'œil la remarque immédiatement quand on s'en écarte.
  const yeux = CIEL + hh * 0.5;
  const bouche = CIEL + hh * 0.79;
  const cheveux = chevelure(traits.coiffure, l, menton, yeux);
  const col = COLS[traits.col];
  const signes = new Set(traits.signes);
  const trait = { stroke: cerne(peau, 0.34), strokeWidth: 1, fill: 'none' };

  /* Le crâne : deux courbes, une pour la calotte, une pour la mâchoire. La
     seconde se referme sur `machoire`, et c'est tout ce qui distingue les six
     visages les uns des autres. */
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
      {/* Épaules et vêtement, dessinés en premier donc derrière tout. */}
      <path d={`M32 ${EPAULES}q-16 1-22 10V64h44V${EPAULES + 10}q-6-9-22-10z`} fill={col.corps} />
      {col.detail && (
        <path
          d={`M${cx - 6} ${EPAULES + 0.5} 32 ${EPAULES + 9} ${cx + 6} ${EPAULES + 0.5}`
            + `q3.6 1.2 6 3.2L32 64h-.2L${cx - 12} ${EPAULES + 3.7}q2.4-2 6-3.2z`}
          fill={col.detail}
        />
      )}

      {/* Le cou, et l'ombre que le menton y porte. */}
      {/*
        * Le cou s'évase vers les épaules : dessiné en rectangle, il se lisait
        * comme une colonne posée sous la tête. Un trapèze suffit à le rattacher
        * au corps, et l'ombre du menton fait le reste.
        */}
      <path
        d={`M${cx - 4.7} ${menton - 6}h9.4l1.6 ${EPAULES + 4 - menton + 6}h-12.6z`}
        fill={peau}
      />
      <path d={`M${cx - 4.7} ${menton - 6}h9.4v3.2q-4.7 2.5-9.4 0z`} fill={ombre} />

      {/* La masse de cheveux, derrière la tête. */}
      <path d={cheveux.arriere} fill={poilOmbre} />

      {/* Les oreilles, glissées sous le crâne. */}
      {/* Les oreilles sont de la peau, pas de l'ombre : teintées, elles
          ressortaient comme deux poignées. Elles gardent un cerne, qui suffit
          à les détacher du crâne. */}
      <ellipse cx={cx - l - 0.2} cy={yeux + 1.4} rx={1.9} ry={2.8} fill={peau} stroke={cerne(peau, 0.3)} strokeWidth={0.9} />
      <ellipse cx={cx + l + 0.2} cy={yeux + 1.4} rx={1.9} ry={2.8} fill={peau} stroke={cerne(peau, 0.3)} strokeWidth={0.9} />

      <path d={tete} fill={peau} />

      {/* Les yeux : blanc, iris, pupille, éclat. Quatre formes et pas une de
          plus — à quarante-six pixels, le détail devient de la boue. */}
      {[cx - 5.9, cx + 5.9].map((ex) => (
        <g key={ex}>
          <ellipse cx={ex} cy={yeux} rx={3.3} ry={2.4} fill="#fcf8f3" />
          <circle cx={ex} cy={yeux + 0.2} r={1.85} fill={iris} />
          <circle cx={ex} cy={yeux + 0.2} r={0.85} fill="#17120f" />
          <circle cx={ex - 0.65} cy={yeux - 0.5} r={0.45} fill="#ffffff" />
          <path d={`M${ex - 3.3} ${yeux}a3.3 2.4 0 0 1 6.6 0`} {...trait} />
        </g>
      ))}
      {signes.has('de longs cils') && (
        <path
          d={`M${cx - 8.9} ${yeux - 1.8}l-1.2-1.4M${cx - 5.9} ${yeux - 2.6}v-1.6`
            + `M${cx + 8.9} ${yeux - 1.8}l1.2-1.4M${cx + 5.9} ${yeux - 2.6}v-1.6`}
          {...trait}
          stroke={cerne(peau, 0.55)}
        />
      )}

      <path
        d={`M${cx - 9.4} ${yeux - 4.8}q3.5-1.8 6.8-.6M${cx + 9.4} ${yeux - 4.8}q-3.5-1.8-6.8-.6`}
        fill="none"
        stroke={poilOmbre}
        strokeWidth={signes.has('des sourcils épais') ? 2.7 : 1.7}
        strokeLinecap="round"
        transform={SOURCILS[traits.humeur](yeux - 4.8)}
      />
      <path d={`M32 ${yeux + 2.4}v${hh * 0.16}q-1.4 1-2.7.3`} {...trait} strokeWidth={1.1} />
      <path
        d={BOUCHE[traits.humeur](cx, bouche)}
        fill="none"
        stroke={cerne(peau, 0.75)}
        strokeWidth={1.6}
        strokeLinecap="round"
      />

      {/* Les particularités tirées par le moteur, une par une. */}
      {signes.has('des taches de rousseur') && (
        <g fill={ombre} opacity={0.8}>
          {[-8.4, -6.4, -4.6, 4.6, 6.4, 8.4].map((dx, i) => (
            <circle key={dx} cx={cx + dx} cy={yeux + 4 + (i % 2) * 1.4} r={0.58} />
          ))}
        </g>
      )}
      {signes.has('une fossette au menton') && (
        <path d={`M32 ${menton - 3.4}v1.6`} {...trait} strokeWidth={1.1} />
      )}
      {signes.has('un grain de beauté marqué') && (
        <circle cx={cx + 7.6} cy={bouche - 1.4} r={0.9} fill={cerne(peau, 0.8)} />
      )}
      {signes.has('une cicatrice au sourcil') && (
        <path d={`M${cx + 6.8} ${yeux - 6.6}l1.9 3.6`} fill="none" stroke={cerne(peau, 0.65)} strokeWidth={1.2} strokeLinecap="round" />
      )}
      {signes.has('des pommettes hautes') && (
        <path
          d={`M${cx - l + 1} ${yeux + 4.4}q1.9 1.5 3.6 1.7M${cx + l - 1} ${yeux + 4.4}q-1.9 1.5-3.6 1.7`}
          {...trait}
          strokeWidth={0.9}
        />
      )}

      {/* La frange, par-dessus le front. */}
      <path d={cheveux.avant} fill={poil} />
      {signes.has('une mèche rebelle') && (
        <path
          d={`M${cx + l - 4} ${CIEL + 2}q4.5-5.5 6.5-1.5`}
          fill="none"
          stroke={poil}
          strokeWidth={2.3}
          strokeLinecap="round"
        />
      )}

      {/* Le contour, en dernier : sans lui, les aplats se liraient comme des
          pièces posées côte à côte plutôt que comme un visage. */}
      <path d={tete} {...trait} />
    </svg>
  );
}

/** Le portrait d'un joueur, sans que l'appelant ait à connaître les traits. */
export function PlayerPortrait({ player, size }: { player: Player; size?: number }) {
  return <Portrait traits={traitsDe(player)} size={size} />;
}
