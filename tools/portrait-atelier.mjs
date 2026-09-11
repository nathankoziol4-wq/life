/**
 * L'atelier du portrait : un tracé, une page, une capture.
 *
 * **Pourquoi ce fichier existe.** La version précédente empilait des ellipses
 * et des rectangles arrondis. Aucune ellipse ne ressemble à une mèche de
 * cheveux, à une paupière ou à une lèvre — d'où le verdict, juste : « ça se
 * voit que c'est de l'IA, c'est du gribouillage ». Ce qu'on dessine ici, ce
 * sont des courbes de Bézier écrites à la main, avec les choses qui font qu'un
 * visage tient : une raie décentrée, une mèche qui balaie le front en biais,
 * une paupière haute plus lourde que la basse, un sourcil qui s'affine vers la
 * tempe, des lèvres avec un arc de Cupidon.
 *
 * Le fichier écrit une page d'essai ; `--capture` la rend dans un vrai
 * navigateur. Chaque défaut du portrait jusqu'ici a été trouvé en regardant
 * un rendu, jamais en relisant le code.
 */

import { writeFileSync } from 'node:fs';

/* ── La palette, reprise du jeu ───────────────────────────────────────── */

export const PEAU = {
  'très claire': ['#f6dcc8', '#e0b699', '#c99878'],
  claire: ['#eec9a6', '#d7a67c', '#bd8a60'],
  mate: ['#dca675', '#bf8853', '#a46f40'],
  dorée: ['#ce9761', '#ae7a46', '#946235'],
  brune: ['#a76f3d', '#88552e', '#6f4423'],
  foncée: ['#7b4a24', '#61371a', '#4c2a13'],
  'très foncée': ['#56331e', '#402415', '#31190d'],
};

export const CHEVEUX = {
  bruns: ['#493423', '#2f2116', '#6a5038'],
  châtains: ['#6e4d2d', '#4b331e', '#8e6c46'],
  noirs: ['#221e1d', '#100d0d', '#3d3634'],
  blonds: ['#d8b263', '#b08339', '#eed08e'],
  roux: ['#b3541e', '#813a11', '#d17a3c'],
  auburn: ['#7b391b', '#54250f', '#9c5330'],
  'poivre et sel': ['#8e8c88', '#6a6764', '#b4b2ae'],
};

export const YEUX = {
  marron: '#6b4423', noisette: '#9a7b3f', verts: '#3f6f43', bleus: '#3f6ea6',
  gris: '#6f7d86', ambre: '#ab7424', noirs: '#241f1c',
};

/* ── Le visage ────────────────────────────────────────────────────────── */

/**
 * Le crâne.
 *
 * Six courbes : la calotte, les tempes, les pommettes, la mâchoire qui
 * s'incline, le menton. Le piège d'un ovale, c'est qu'il n'a ni pommette ni
 * mâchoire — il rend une patate, et c'est exactement ce que rendait la version
 * en boîtes.
 */
const CRANE = 'M 30,96 C 30,50 58,22 100,22 C 142,22 170,50 170,96 '
  + 'C 170,122 165,140 156,156 C 145,176 124,192 100,192 '
  + 'C 76,192 55,176 44,156 C 35,140 30,122 30,96 Z';

/**
 * L'ombre du visage : un liseré le long du bord droit, et rien de plus.
 *
 * La version précédente couvrait la moitié droite du visage à 42 % d'opacité.
 * Sa frontière intérieure traçait une arête nette du front au menton, qui se
 * lisait comme une fissure. Un dégradé large demande un vrai modelé ; à plat,
 * il faut soit rien, soit un liseré qui suit le contour.
 */
const OMBRE_JOUE = 'M 163,96 C 165,124 160,146 152,160 C 143,176 124,192 100,192 '
  + 'C 118,184 132,168 140,148 C 148,128 152,110 154,92 Z';

/** L'oreille, avec son ourlet. */
function oreille(cote) {
  const g = cote === 'g';
  const t = g ? '' : ' transform="translate(200,0) scale(-1,1)"';
  return `<g${t}>`
    + '<path d="M 37,104 C 26,98 17,107 20,120 C 23,133 33,140 41,136" />'
    + '<path class="trait" d="M 34,112 C 28,113 26,120 30,126" />'
    + '</g>';
}

/**
 * L'œil.
 *
 * Une amande, pas un cercle : le coin extérieur descend un peu, l'intérieur
 * remonte vers le nez. La paupière haute est un trait épais posé *par-dessus*
 * l'amande — c'est elle qui donne le regard ; la basse est deux fois plus fine.
 * L'iris passe sous la paupière haute au lieu de flotter au milieu du blanc,
 * ce qui était le principal effet « bille » de la version précédente.
 */
function oeil(cote, iris, paupiere = 0) {
  const g = cote === 'g';
  const t = g ? '' : ' transform="translate(200,0) scale(-1,1)"';
  const forme = 'M 60,124 C 66,111 82,107 92,119 C 88,133 68,135 60,124 Z';
  /* La paupière descend *le long* de la courbe du cil, jamais à plat. La
     première version posait une dalle de peau à bord droit en travers de
     l'œil : les personnages fatigués portaient une visière. */
  const d = paupiere * 20;
  const cil = `M 58,${125 + d} C 64,${109 + d} 83,${105 + d} 94,${119 + d}`;
  return `<g${t}>`
    + `<clipPath id="oeil-${cote}"><path d="${forme}" /></clipPath>`
    + `<path d="${forme}" fill="#fbf6ef" />`
    + `<g clip-path="url(#oeil-${cote})">`
    + `<circle cx="77" cy="122" r="10.4" fill="${iris}" />`
    + '<circle cx="77" cy="122" r="4.8" fill="#171210" />'
    + '<circle cx="73.4" cy="118.2" r="2.7" fill="#ffffff" />'
    + '<path d="M 58,118 C 66,110 84,107 94,118 L 94,104 L 58,104 Z" fill="#000" opacity=".07" />'
    + (d ? `<path d="${cil} L 94,100 L 58,100 Z" class="peau" />` : '')
    + '</g>'
    + `<path class="cil" d="${cil}" />`
    + '<path class="trait" d="M 62,129 C 70,134 84,133 90,126" />'
    + '</g>';
}

/**
 * Le sourcil.
 *
 * Épais à la tête, affiné vers la queue. Une pastille de largeur constante
 * rend une barre, et une barre ne dit rien : c'est la variation d'épaisseur
 * qui fait lire un sourcil. `dy` le monte ou le descend, `pente` le fait
 * tourner autour de sa tête — le geste de l'inquiétude est de lever la tête,
 * pas de pivoter le tout.
 */
function sourcil(cote, dy = 0, pente = 0) {
  const g = cote === 'g';
  const t = g ? '' : ' transform="translate(200,0) scale(-1,1)"';
  return `<g${t} transform-origin="90 102">`
    + `<path transform="translate(0,${dy}) rotate(${g ? pente : -pente} 90 102)" `
    + 'd="M 90,100 C 82,92 67,90 56,98 C 55,100 56,102 58,101 '
    + 'C 68,96 81,98 88,105 C 90,105 91,102 90,100 Z" />'
    + '</g>';
}

/**
 * Le nez.
 *
 * Pas de bloc : une ombre le long de l'arête à droite, l'aile de chaque narine,
 * et un éclat sur le bout. Le bloc, la version précédente l'avait essayé — il
 * se lisait comme une cicatrice verticale, puis comme une tache.
 */
const NEZ = '<path class="ombre-nez" d="M 103,116 C 106,130 110,143 109,150 '
  + 'C 106,155 98,155 95,150 C 99,144 100,130 99,116 Z" />'
  + '<path class="trait-nez" d="M 93,150 C 96,155 104,155 107,150" />';

/**
 * La bouche.
 *
 * La lèvre haute porte l'arc de Cupidon — deux bosses et un creux au milieu ;
 * la basse est plus pleine. Entre les deux, la ligne des lèvres, qui est ce
 * qu'on lit en premier de loin. Un rectangle arrondi ne peut rien de tout ça.
 */
function bouche(humeur) {
  switch (humeur) {
    case 'joie':
      return '<path class="levres" d="M 74,166 C 84,162 92,166 100,166 C 108,166 116,162 126,166 '
        + 'C 124,184 108,194 100,194 C 92,194 76,184 74,166 Z" />'
        + '<path class="dents" d="M 77,167 C 86,164 94,167 100,167 C 106,167 114,164 123,167 '
        + 'C 121,174 110,178 100,178 C 90,178 79,174 77,167 Z" />'
        + '<path class="pli" d="M 74,166 C 86,170 114,170 126,166" />';
    case 'peine':
      return '<path class="levres" d="M 80,176 C 86,166 94,172 100,171 C 106,172 114,166 120,176 '
        + 'C 114,181 86,181 80,176 Z" />'
        + '<path class="pli" d="M 80,176 C 88,170 112,170 120,176" />';
    case 'lassitude':
      return '<path class="levres" d="M 80,170 C 87,166 94,169 100,169 C 106,169 113,166 120,170 '
        + 'C 116,177 84,177 80,170 Z" />'
        + '<path class="pli" d="M 80,170 C 90,173 110,173 120,170" />';
    case 'mal':
      return '<path class="levres" d="M 88,168 C 92,163 108,163 112,168 '
        + 'C 114,177 108,182 100,182 C 92,182 86,177 88,168 Z" />'
        + '<path class="pli" d="M 88,169 C 94,172 106,172 112,169" />';
    default: /* calme */
      return '<path class="levres" d="M 79,167 C 86,159 94,165 100,164 C 106,165 114,159 121,167 '
        + 'C 116,181 84,181 79,167 Z" />'
        + '<path class="pli" d="M 79,167 C 90,172 110,172 121,167" />';
  }
}

/* ── Les cheveux ──────────────────────────────────────────────────────── */

/**
 * Sept coiffures, chacune un vrai contour.
 *
 * Deux choses les sauvent du gribouillage. **La raie n'est pas au milieu** :
 * elle tombe vers x = 124, et la mèche balaie le front en biais — une
 * coiffure symétrique se lit comme un casque, et c'est la faute la plus
 * visible de la version en boîtes. **Le contour s'imbrique dans le crâne** :
 * la masse descend devant les tempes et passe derrière les oreilles, au lieu
 * d'être posée dessus comme un chapeau.
 *
 * Chaque coiffure rend `{ derriere, devant, meches }` : ce qui passe derrière
 * la tête, ce qui retombe sur le front, et les mèches intérieures qui donnent
 * le sens du peigne.
 */
function coiffure(nom) {
  /*
   * La ligne de front, commune aux coiffures à raie.
   *
   * Elle part de la raie — décentrée vers x = 124, jamais au milieu — et
   * descend en biais jusqu'à la tempe gauche. Elle s'arrête au-dessus des
   * sourcils : la mèche qui les couvre détruit le seul canal d'expression qui
   * reste depuis que le portrait s'arrête au menton.
   */
  const FRANGE = 'C 124,64 110,76 92,84 C 74,92 48,88 36,92 C 29,100 25,112 24,124';

  /*
   * Le devant, commun aux coiffures à raie.
   *
   * La masse dépasse le crâne de dix points au sommet et de six sur les côtés :
   * des cheveux ont du volume. Le premier jet collait au crâne, et la coiffure
   * se lisait comme une calotte peinte sur la tête.
   */
  const DEVANT = 'M 24,124 C 19,62 48,10 100,10 C 154,10 183,56 174,126 '
    + 'C 166,112 162,96 156,84 C 149,69 143,58 132,50 ';

  switch (nom) {
    case 'courts':
      return {
        derriere: '',
        devant: `${DEVANT}${FRANGE} Z`,
        meches: [
          'M 120,42 C 110,60 95,72 76,80',
          'M 131,48 C 121,66 104,78 84,86',
          'M 140,44 C 150,58 158,74 163,92',
        ],
      };
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
        derriere: 'M 16,208 C 8,104 42,6 100,6 C 160,6 194,104 186,208 '
          + 'C 177,203 168,196 161,187 C 169,144 167,102 159,76 '
          + 'C 149,44 128,26 100,26 C 72,26 51,44 41,76 '
          + 'C 33,102 31,144 39,187 C 32,196 25,203 16,208 Z',
        devant: `${DEVANT}${FRANGE} Z`,
        meches: [
          'M 120,42 C 110,60 95,72 76,80',
          'M 36,84 C 27,122 27,166 34,202',
          'M 166,84 C 175,122 175,166 168,202',
        ],
      };
    case 'raides':
      /*
       * La seule coiffure sans raie : une frange droite, coupée net au-dessus
       * des sourcils. Son bord bas est une ligne, pas une courbe — c'est ce qui
       * la distingue des six autres au premier coup d'œil.
       */
      return {
        derriere: 'M 20,184 C 16,80 48,6 100,6 C 152,6 184,80 180,184 '
          + 'L 160,184 C 166,142 166,100 159,76 C 150,44 128,26 100,26 '
          + 'C 72,26 50,44 41,76 C 34,100 34,142 40,184 Z',
        devant: 'M 24,120 C 20,62 48,8 100,8 C 154,8 182,56 176,120 '
          + 'C 174,104 172,92 170,84 C 148,79 124,77 100,78 '
          + 'C 76,77 52,79 30,84 C 28,92 25,104 24,120 Z',
        meches: [
          'M 72,26 C 64,44 60,60 59,78',
          'M 128,26 C 136,44 140,60 141,78',
        ],
      };
    case 'ondulés': {
      /*
       * Le bord bas ondule : trois creux et trois bosses écrits comme une suite
       * de courbes qui se répondent. Posées à la main, elles finissent toujours
       * décalées d'un côté.
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
    }
    case 'bouclés': {
      /*
       * Le contour est une guirlande d'arcs, pas un ovale : neuf demi-cercles
       * posés sur une même division, parce qu'à la main ils finissent toujours
       * par se décaler d'un côté.
       */
      const n = 9;
      const pt = (i) => {
        const a = (i * Math.PI) / n;
        return `${(100 - Math.cos(a) * 80).toFixed(1)},${(120 - Math.sin(a) * 112).toFixed(1)}`;
      };
      let d = `M ${pt(0)} `;
      for (let i = 1; i <= n; i += 1) d += `A 20,20 0 0 1 ${pt(i)} `;
      d += 'C 178,104 172,88 164,76 C 154,60 142,50 130,46 '
        + 'C 122,62 108,74 90,82 C 72,90 46,88 34,92 '
        + 'C 26,100 21,110 20,120 Z';
      return {
        derriere: '',
        devant: d,
        meches: ['M 119,42 C 109,60 94,72 75,80', 'M 131,50 C 121,68 103,80 83,88'],
      };
    }
    default: { /* crépus */
      /*
       * Un halo dense, bordé de boucles serrées, et un front dégagé bien plus
       * haut que sur les autres coiffures. Deux fautes ici avant d'y arriver :
       * un halo à peine plus large que le crâne — le personnage semblait chauve
       * — puis un halo qui débordait du cadre par le haut, coupé net.
       */
      const n = 14;
      const pt = (i) => {
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
  }
}

/* ── L'humeur ─────────────────────────────────────────────────────────── */

/**
 * Cinq humeurs, tenues par trois gestes : la hauteur des sourcils, leur pente
 * autour de la tête, et la paupière qui descend.
 *
 * Le signe compte. Sur le sourcil de gauche, une pente négative lève la tête
 * (côté nez) : c'est le dessin de la tristesse. Une pente positive la baisse :
 * c'est la colère. Le premier jet les avait inversés, et le personnage triste
 * avait l'air furieux.
 */
const HUMEUR = {
  joie: { dy: -3, pente: -2, paupiere: 0 },
  calme: { dy: 0, pente: -1, paupiere: 0 },
  lassitude: { dy: 3, pente: -6, paupiere: 0.34 },
  peine: { dy: -1, pente: -13, paupiere: 0.16 },
  mal: { dy: 4, pente: -9, paupiere: 0.42 },
};

/* ── Le portrait ──────────────────────────────────────────────────────── */

export function portrait({
  teint = 'claire', cheveux = 'châtains', yeux = 'marron',
  style = 'courts', humeur = 'calme', taille = 200, id = 'p',
} = {}) {
  const [peau, ombre, creux] = PEAU[teint];
  const [chev, chevOmbre, chevClair] = CHEVEUX[cheveux];
  const iris = YEUX[yeux];
  const { dy, pente, paupiere } = HUMEUR[humeur];
  const { derriere, devant, meches } = coiffure(style);

  /* Sur les teints sombres, la lèvre doit être plus claire que la peau : une
     encre neutre y posait une barre grise au milieu du visage. */
  const sombre = ['brune', 'foncée', 'très foncée'].includes(teint);
  const levre = sombre ? '#ad6d5d' : '#9d5849';
  /* La pommette est un rouge posé en transparence : sur un teint sombre, la
     même opacité rend deux taches qui se lisent comme des hématomes. */
  const rose = sombre ? '.07' : '.13';
  const pli = sombre ? '#6b3a2c' : '#7d4034';

  return `<svg viewBox="0 0 200 220" width="${taille}" height="${Math.round(taille * 1.1)}" role="img" xmlns="http://www.w3.org/2000/svg">
  <style>
    #${id} .peau { fill: ${peau}; }
    #${id} .ombre { fill: ${ombre}; opacity: .2; }
    #${id} .joue { fill: #d8604a; opacity: ${rose}; }
    #${id} .cheveux { fill: ${chev}; }
    #${id} .cheveux-clair { fill: none; stroke: ${chevClair}; stroke-width: 2.2; stroke-linecap: round; opacity: .3; }
    #${id} .sourcil { fill: ${chevOmbre}; }
    #${id} .cil { fill: none; stroke: ${chevOmbre}; stroke-width: 3.4; stroke-linecap: round; }
    #${id} .trait { fill: none; stroke: ${creux}; stroke-width: 1.5; stroke-linecap: round; opacity: .45; }
    #${id} .ombre-nez { fill: ${ombre}; opacity: .26; }
    #${id} .trait-nez { fill: none; stroke: ${creux}; stroke-width: 2.2; stroke-linecap: round; opacity: .85; }
        #${id} .levres { fill: ${levre}; }
    #${id} .dents { fill: #fdfaf5; }
    #${id} .pli { fill: none; stroke: ${pli}; stroke-width: 1.8; stroke-linecap: round; }
  </style>
  <g id="${id}">
    ${derriere ? `<path class="cheveux" d="${derriere}" />` : ''}
    <g class="peau">${oreille('g')}${oreille('d')}</g>
    <path class="peau" d="${CRANE}" />
    <ellipse class="joue" cx="57" cy="142" rx="14" ry="8" />
    <ellipse class="joue" cx="143" cy="142" rx="14" ry="8" />
    ${oeil('g', iris, paupiere)}${oeil('d', iris, paupiere)}
    <g class="sourcil">${sourcil('g', dy, pente)}${sourcil('d', dy, pente)}</g>
    ${NEZ}
    <g transform="translate(0,-5)">${bouche(humeur)}</g>
    <path class="cheveux" d="${devant}" />
    ${meches.map((m) => `<path class="cheveux-clair" d="${m}" />`).join('\n    ')}
  </g>
</svg>`;
}

/* ── La page d'essai ──────────────────────────────────────────────────── */

const STYLES = ['courts', 'mi-longs', 'longs', 'raides', 'ondulés', 'bouclés', 'crépus'];
const HUMEURS = ['joie', 'calme', 'lassitude', 'peine', 'mal'];

function page() {
  let n = 0;
  const grand = portrait({ taille: 360, id: `p${n++}`, humeur: 'calme' });
  const styles = STYLES.map((s) => `<figure>${portrait({ style: s, taille: 150, id: `p${n++}` })}<figcaption>${s}</figcaption></figure>`).join('');
  const humeurs = HUMEURS.map((h) => `<figure>${portrait({ humeur: h, taille: 150, id: `p${n++}` })}<figcaption>${h}</figcaption></figure>`).join('');
  const teints = Object.keys(PEAU).map((t) => `<figure>${portrait({ teint: t, cheveux: 'noirs', taille: 130, id: `p${n++}` })}<figcaption>${t}</figcaption></figure>`).join('');
  const petits = [46, 64, 84, 120].map((s) => `<figure>${portrait({ taille: s, id: `p${n++}` })}<figcaption>${s} px</figcaption></figure>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Atelier</title><style>
    body { margin: 0; padding: 24px; background: #f5f7fd; font: 13px/1.5 ui-sans-serif, system-ui, sans-serif; color: #0a0918; }
    h2 { font-size: 14px; margin: 24px 0 8px; }
    .rang { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
    figure { margin: 0; background: #fff; border: 1px solid #c3cae4; border-radius: 14px; padding: 8px; text-align: center; }
    figcaption { font-size: 11px; color: #474473; margin-top: 4px; }
  </style></head><body>
    <h2>Le tracé, en grand</h2><div class="rang"><figure>${grand}</figure></div>
    <h2>Les sept coiffures</h2><div class="rang">${styles}</div>
    <h2>Les cinq humeurs</h2><div class="rang">${humeurs}</div>
    <h2>Les sept teints</h2><div class="rang">${teints}</div>
    <h2>Aux tailles du jeu</h2><div class="rang">${petits}</div>
  </body></html>`;
}

if (process.argv[1]?.endsWith('portrait-atelier.mjs')) {
  const out = '/home/user/life/captures/atelier.html';
  writeFileSync(out, page());
  console.log(`écrit ${out}`);
}
