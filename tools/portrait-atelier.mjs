/**
 * L'atelier du portrait : un tracé, une page, une capture.
 *
 * **Trois verdicts, et la référence qui tranche.** « Ça se voit que c'est de
 * l'IA » a été dit trois fois de suite, de trois versions différentes : la
 * version en boîtes — des ellipses et des rectangles arrondis empilés —, la
 * version au Bézier à plat, et la version encrée. Chaque fois j'ai deviné
 * l'axe, et chaque fois je me suis trompé ; la dernière allait carrément dans
 * la direction opposée à ce qui était demandé.
 *
 * L'image de référence fournie par l'auteur du jeu dit ceci, et rien d'autre :
 *
 * 1. **Aucun contour.** Pas un trait d'encre nulle part. Le volume est porté
 *    par des **dégradés** — clair en haut à gauche, sombre sur les bords.
 * 2. **Une tête ronde.** Largeur et hauteur presque égales, des joues pleines,
 *    un petit menton. Pas l'ovale allongé des versions précédentes.
 * 3. **De grands yeux ronds**, à l'iris large, avec un gros éclat blanc et un
 *    second plus petit en bas.
 * 4. **Une calotte de cheveux lisse et brillante**, avec un reflet, qui couvre
 *    presque tout le front. Pas des mèches séparées.
 * 5. **Une petite bouche ouverte** avec une bande de dents blanches.
 * 6. **Des joues roses** fondues, pas des pastilles à bord net.
 *
 * Tout ce fichier découle de ces six points. Le reste — la géométrie des
 * coiffures, les humeurs, les teints — s'y plie.
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
  blonds: ['#dfa62f', '#b8811c', '#f0c85e'],
  roux: ['#b3541e', '#813a11', '#d17a3c'],
  auburn: ['#7b391b', '#54250f', '#9c5330'],
  'poivre et sel': ['#8e8c88', '#6a6764', '#b4b2ae'],
};

export const YEUX = {
  marron: '#6b4423', noisette: '#9a7b3f', verts: '#3f6f43', bleus: '#3f6ea6',
  gris: '#6f7d86', ambre: '#ab7424', noirs: '#241f1c',
};

const canal = (hex, i) => Number.parseInt(hex.replace('#', '').slice(i, i + 2), 16);
const hexe = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Mélanger vers le blanc. */
function eclaircir(hex, t) {
  return hexe([0, 2, 4].map((i) => canal(hex, i) + (255 - canal(hex, i)) * t));
}

/** Mélanger vers le noir. */
function assombrir(hex, t) {
  return hexe([0, 2, 4].map((i) => canal(hex, i) * (1 - t)));
}

/**
 * Un identifiant de dégradé stable, dérivé des couleurs.
 *
 * Un identifiant fixe ferait que deux portraits de teints différents se
 * voleraient leur dégradé : le premier rendu gagne, et tous les suivants
 * prennent sa couleur. Un identifiant tiré au hasard, lui, changerait à chaque
 * rendu de React. Le dériver des couleurs règle les deux : deux portraits de
 * même teint partagent une définition, deux teints différents n'en partagent
 * aucune.
 */
function cle(...couleurs) {
  return couleurs.join('').replaceAll('#', '').toLowerCase();
}

/* ── Le visage ────────────────────────────────────────────────────────── */

/**
 * Le crâne.
 *
 * **Rond, et c'est le point.** La référence a une largeur et une hauteur
 * presque égales, des joues pleines et un petit menton arrondi. Les versions
 * précédentes dessinaient un ovale allongé — c'est ce qui leur donnait cet air
 * d'avatar générique plutôt que de personnage.
 */
function crane(l, machoire, menton) {
  const xg = 100 - l;
  const xd = 100 + l;
  const m = l * machoire;
  return `M ${xg},100 C ${xg},54 ${100 - l * 0.58},20 100,20 `
    + `C ${100 + l * 0.58},20 ${xd},54 ${xd},100 `
    + `C ${xd},130 ${100 + m + 10},156 ${100 + m},168 `
    + `C ${100 + m - 12},${menton - 6} ${100 + 20},${menton} 100,${menton} `
    + `C ${100 - 20},${menton} ${100 - m + 12},${menton - 6} ${100 - m},168 `
    + `C ${100 - m - 10},156 ${xg},130 ${xg},100 Z`;
}

/** L'oreille : petite, ronde, décollée — et sans contour, comme le reste. */
function oreille(cote, l, peau, ombre) {
  const dx = l - 74;
  const t = cote === 'g'
    ? `translate(${-dx},0)`
    : `translate(${200 + dx},0) scale(-1,1)`;
  return `<g transform="${t}">`
    + `<ellipse cx="27" cy="116" rx="13" ry="17" fill="${peau}" />`
    + `<ellipse cx="29" cy="117" rx="7" ry="10" fill="${ombre}" opacity=".55" />`
    + '</g>';
}

/**
 * L'œil.
 *
 * Grand et rond, l'iris large, deux éclats : un gros en haut à gauche, un
 * petit en bas à droite. C'est la paire d'éclats qui donne le brillant de la
 * référence ; avec un seul, l'œil reste mat.
 *
 * `paupiere` descend une forme de peau *le long* du bord haut de l'amande.
 * Une dalle à bord droit en travers de l'œil — un premier jet — donnait une
 * visière aux personnages fatigués.
 */
function oeil(cote, l, iris, peau, paupiere) {
  const dx = (l - 74) * 0.45;
  const t = cote === 'g'
    ? `translate(${-dx},0)`
    : `translate(${200 + dx},0) scale(-1,1)`;
  const k = cle(iris, cote);
  const d = paupiere * 24;
  return `<g transform="${t}">`
    + `<clipPath id="oe-${k}"><ellipse cx="71" cy="115" rx="19" ry="21.5" /></clipPath>`
    + `<ellipse cx="71" cy="115" rx="19" ry="21.5" fill="#fdfaf4" />`
    + `<g clip-path="url(#oe-${k})">`
    + `<circle cx="71" cy="115" r="14.5" fill="url(#ir-${cle(iris)}-${cote})" />`
    + `<circle cx="71" cy="115" r="7.4" fill="${assombrir(iris, 0.72)}" />`
    + '<circle cx="66" cy="108.5" r="5.4" fill="#ffffff" />'
    + '<circle cx="78" cy="123" r="2.8" fill="#ffffff" opacity=".75" />'
    + `<ellipse cx="71" cy="${67 + d}" rx="27" ry="26" fill="${peau}" />`
    + '</g>'
    + '</g>';
}

/**
 * Le sourcil : fin, discret, à peine plus foncé que les cheveux.
 *
 * Dans la référence il est presque invisible — deux virgules posées loin
 * au-dessus des yeux. Un sourcil épais ramène le dessin vers la bande
 * dessinée, qui n'est pas ce qui est demandé.
 *
 * **Le signe de la pente comptait, et il était inversé** dans une version
 * précédente. Sur le sourcil de gauche, une pente négative lève l'extrémité
 * *intérieure* : c'est le dessin de la tristesse. Positive, elle la baisse :
 * c'est la colère. Le personnage triste avait donc l'air furieux.
 */
function sourcil(cote, l, dy, pente, couleur) {
  const dx = (l - 74) * 0.45;
  const t = cote === 'g'
    ? `translate(${-dx},0)`
    : `translate(${200 + dx},0) scale(-1,1)`;
  return `<g transform="${t}">`
    + `<path transform="translate(0,${dy}) rotate(${cote === 'g' ? pente : -pente} 84 92)" `
    + 'd="M 56,95 C 62,87 78,84 88,90 C 79,88 65,90 57,97 Z" '
    + `fill="${couleur}" stroke="${couleur}" stroke-width="3.2" stroke-linejoin="round" /></g>`;
}

/**
 * Le nez : presque rien.
 *
 * Dans la référence c'est un petit renflement — une ombre douce et un éclat,
 * sans aucun trait. Les versions précédentes ont essayé le bloc plein (une
 * cicatrice verticale), le bloc flanqué de ses ailes (un cœur) et le trait
 * d'encre (une bande dessinée). Aucun des trois n'est ce qui est demandé.
 */
function nez(ombre, clair) {
  return `<ellipse cx="100" cy="137" rx="8" ry="5.6" fill="${ombre}" opacity=".34" />`
    + `<ellipse cx="98.5" cy="134" rx="4" ry="2.6" fill="${clair}" opacity=".5" />`;
}

/**
 * La bouche.
 *
 * Ouverte et souriante par défaut, avec sa bande de dents : c'est l'élément le
 * plus caractéristique de la référence. Les quatre autres humeurs ferment la
 * bouche et changent sa courbure — c'est le seul canal expressif qui reste
 * avec les sourcils, depuis que le portrait s'arrête au menton.
 */
function bouche(humeur, gorge, levre) {
  switch (humeur) {
    case 'joie':
      return `<path d="M 80,148 C 87,144 113,144 120,148 C 120,166 111,175 100,175 C 89,175 80,166 80,148 Z" fill="${gorge}" />`
        + '<path d="M 82,149 C 89,146 111,146 118,149 C 117,156 109,160 100,160 C 91,160 83,156 82,149 Z" fill="#fffdf8" />'
        + `<path d="M 88,170 C 92,166 108,166 112,170 C 108,174 92,174 88,170 Z" fill="${eclaircir(gorge, 0.28)}" />`;
    case 'peine':
      return `<path d="M 85,160 C 90,152 110,152 115,160 C 110,163 90,163 85,160 Z" fill="${levre}" />`;
    case 'lassitude':
      return `<path d="M 85,155 C 91,152 109,152 115,155 C 110,160 90,160 85,155 Z" fill="${levre}" />`;
    case 'mal':
      return `<ellipse cx="100" cy="157" rx="9" ry="7.5" fill="${gorge}" />`;
    default: /* calme */
      return `<path d="M 84,151 C 90,149 110,149 116,151 C 113,161 87,161 84,151 Z" fill="${levre}" />`;
  }
}

/* ── Les cheveux ──────────────────────────────────────────────────────── */

/**
 * Sept coiffures, toutes en **calotte lisse**.
 *
 * Pas de mèches cernées, pas de bord dentelé : la référence montre une masse
 * brillante d'un seul tenant, avec un reflet. Ce qui distingue les coiffures,
 * c'est la **silhouette** — jusqu'où la masse descend, et comment elle se
 * termine.
 *
 * `reflet` est le trait clair qui court sur le haut du crâne. C'est lui qui
 * donne l'aspect verni ; sans lui la calotte est un bonnet.
 */
function coiffure(nom) {
  /*
   * La ligne de front commune. Elle descend bas — la référence ne laisse voir
   * qu'un doigt de front — mais s'arrête au-dessus des sourcils : une mèche
   * qui les couvre supprime la moitié de l'expression.
   */
  /*
   * Deux morceaux nommés plutôt qu'une chaîne découpée à l'exécution. La
   * version précédente reprenait la fin de la ligne avec
   * `FRONT.slice(FRONT.indexOf('C 116,66'))` : le jour où ce point de contrôle
   * a bougé, `indexOf` a renvoyé −1, `slice(-1)` a gardé un seul caractère, et
   * « bouclés » rendait un `d` malformé — que SVG ignore en silence.
   */
  const TEMPE = 'C 173,90 167,78 158,70 C 148,61 138,56 128,55 ';
  const BALAYAGE = 'C 120,66 110,76 94,80 C 74,85 48,80 30,81 C 26,89 24,97 23,106';
  const FRONT = TEMPE + BALAYAGE;

  const CALOTTE = `M 23,106 C 20,50 52,14 100,14 C 150,14 180,52 177,108 ${FRONT} Z`;
  const REFLET = 'M 52,62 C 62,42 80,30 102,28 C 82,34 66,46 56,66 Z';

  switch (nom) {
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
        derriere: 'M 14,196 C 6,100 42,4 100,4 C 159,4 193,100 185,196 '
          + 'C 176,192 166,188 159,180 C 168,140 166,98 158,72 '
          + 'C 148,40 127,22 100,22 C 73,22 51,40 41,72 '
          + 'C 33,98 31,140 40,180 C 33,188 23,192 14,196 Z',
        masse: CALOTTE,
        reflet: REFLET,
      };
    case 'raides':
      /*
       * La seule coiffure sans raie : la frange descend droit, et la masse
       * arrière tombe en deux rideaux à bord net. C'est ce bord droit qui la
       * distingue des six autres au premier coup d'œil.
       */
      return {
        derriere: 'M 18,182 C 14,78 48,4 100,4 C 152,4 186,78 182,182 '
          + 'L 160,182 C 167,140 167,98 159,72 C 149,40 127,22 100,22 '
          + 'C 73,22 51,40 41,72 C 33,98 33,140 40,182 Z',
        masse: 'M 23,104 C 20,50 52,12 100,12 C 150,12 180,50 177,106 '
          + 'C 175,94 173,86 171,79 C 148,70 124,67 100,68 '
          + 'C 76,67 50,71 29,79 C 26,86 24,95 23,104 Z',
        reflet: 'M 54,58 C 64,40 80,30 100,28 C 82,34 66,44 58,62 Z',
      };
    case 'ondulés':
      return {
        derriere: 'M 18,156 C 12,80 48,8 100,8 C 154,8 188,76 182,156 '
          + 'C 177,170 165,166 160,178 C 153,168 145,174 141,184 '
          + 'C 151,146 153,102 146,76 C 137,44 125,28 100,28 '
          + 'C 75,28 58,44 49,76 C 42,102 45,146 54,184 '
          + 'C 50,174 42,168 35,178 C 30,166 23,170 18,156 Z',
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
      const pt = (i) => {
        const a = (i * Math.PI) / n;
        return `${(100 - Math.cos(a) * 82).toFixed(1)},${(106 - Math.sin(a) * 96).toFixed(1)}`;
      };
      let d = `M ${pt(0)} `;
      for (let i = 1; i <= n; i += 1) d += `A 21,21 0 0 1 ${pt(i)} `;
      d += `C 180,92 172,76 160,66 C 150,58 138,54 128,54 ${BALAYAGE} Z`;
      return { derriere: '', masse: d, reflet: 'M 56,58 C 66,40 82,30 102,28 C 84,36 70,46 60,62 Z' };
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
      const pt = (i) => {
        const a = (i * Math.PI) / n;
        return `${(100 - Math.cos(a) * 88).toFixed(1)},${(104 - Math.sin(a) * 94).toFixed(1)}`;
      };
      let d = `M ${pt(0)} `;
      for (let i = 1; i <= n; i += 1) d += `A 14,14 0 0 1 ${pt(i)} `;
      d += 'C 186,86 178,72 168,64 C 148,54 124,50 100,51 '
        + 'C 76,50 52,54 32,64 C 22,72 14,86 12,104 Z';
      return { derriere: '', masse: d, reflet: 'M 48,56 C 62,36 82,26 104,24 C 82,32 64,42 52,60 Z' };
    }
    default: /* courts */
      return { derriere: '', masse: CALOTTE, reflet: REFLET };
  }
}

/* ── L'humeur ─────────────────────────────────────────────────────────── */

const HUMEUR = {
  joie: { dy: -2, pente: -2, paupiere: 0 },
  calme: { dy: 0, pente: -1, paupiere: 0 },
  lassitude: { dy: 3, pente: -5, paupiere: 0.4 },
  peine: { dy: -2, pente: -12, paupiere: 0.18 },
  mal: { dy: 4, pente: -8, paupiere: 0.5 },
};

/* ── Le portrait ──────────────────────────────────────────────────────── */

export function portrait({
  teint = 'claire', cheveux = 'blonds', yeux = 'marron',
  style = 'courts', humeur = 'joie', taille = 200,
} = {}) {
  const [peau, ombre] = PEAU[teint];
  const [chev, chevOmbre, chevClair] = CHEVEUX[cheveux];
  const iris = YEUX[yeux];
  const { dy, pente, paupiere } = HUMEUR[humeur];
  const { derriere, masse, reflet } = coiffure(style);

  const peauClaire = eclaircir(peau, 0.18);
  const kPeau = cle(peau, ombre);
  const kChev = cle(chev, chevOmbre);
  const kIris = cle(iris);
  const kJoue = cle(peau, 'joue');

  /* Sur un teint sombre, une lèvre neutre pose une barre grise au milieu du
     visage : elle doit rester dans les rouges, plus claire que la peau. */
  const sombre = ['brune', 'foncée', 'très foncée'].includes(teint);
  const gorge = sombre ? '#7d3a31' : '#6e2e27';
  const levre = sombre ? '#b5705e' : '#a85c4c';

  return `<svg viewBox="0 0 200 200" width="${taille}" height="${taille}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="pe-${kPeau}" cx="36%" cy="28%" r="82%">
        <stop offset="0" stop-color="${peauClaire}" />
        <stop offset=".55" stop-color="${peau}" />
        <stop offset="1" stop-color="${ombre}" />
      </radialGradient>
      <linearGradient id="ch-${kChev}" x1="18%" y1="4%" x2="86%" y2="96%">
        <stop offset="0" stop-color="${eclaircir(chev, 0.2)}" />
        <stop offset=".5" stop-color="${chev}" />
        <stop offset="1" stop-color="${chevOmbre}" />
      </linearGradient>
      <radialGradient id="ir-${kIris}-g" cx="40%" cy="32%" r="72%">
        <stop offset="0" stop-color="${eclaircir(iris, 0.28)}" />
        <stop offset="1" stop-color="${assombrir(iris, 0.22)}" />
      </radialGradient>
      <radialGradient id="ir-${kIris}-d" cx="40%" cy="32%" r="72%">
        <stop offset="0" stop-color="${eclaircir(iris, 0.28)}" />
        <stop offset="1" stop-color="${assombrir(iris, 0.22)}" />
      </radialGradient>
      <radialGradient id="jo-${kJoue}">
        <stop offset="0" stop-color="#e2604a" stop-opacity=".4" />
        <stop offset="1" stop-color="#e2604a" stop-opacity="0" />
      </radialGradient>
    </defs>
    ${derriere ? `<path d="${derriere}" fill="url(#ch-${kChev})" />` : ''}
    ${oreille('g', 74, peau, ombre)}${oreille('d', 74, peau, ombre)}
    <path d="${crane(74, 0.82, 184)}" fill="url(#pe-${kPeau})" />
    <ellipse cx="46" cy="140" rx="19" ry="14" fill="url(#jo-${kJoue})" />
    <ellipse cx="154" cy="140" rx="19" ry="14" fill="url(#jo-${kJoue})" />
    ${oeil('g', 74, iris, peau, paupiere)}${oeil('d', 74, iris, peau, paupiere)}
    ${sourcil('g', 74, dy, pente, chevOmbre)}${sourcil('d', 74, dy, pente, chevOmbre)}
    ${nez(ombre, peauClaire)}
    ${bouche(humeur, gorge, levre)}
    <path d="${masse}" fill="url(#ch-${kChev})" />
    <path d="${reflet}" fill="${chevClair}" opacity=".5" />
  </svg>`;
}

/* ── La page d'essai ──────────────────────────────────────────────────── */

const STYLES = ['courts', 'mi-longs', 'longs', 'raides', 'ondulés', 'bouclés', 'crépus'];
const HUMEURS = ['joie', 'calme', 'lassitude', 'peine', 'mal'];

function page() {
  const fig = (svg, legende) => `<figure>${svg}<figcaption>${legende}</figcaption></figure>`;
  const grand = portrait({ taille: 360 });
  const styles = STYLES.map((s) => fig(portrait({ style: s, taille: 150 }), s)).join('');
  const humeurs = HUMEURS.map((h) => fig(portrait({ humeur: h, taille: 150 }), h)).join('');
  const teints = Object.keys(PEAU).map((t) => fig(portrait({ teint: t, cheveux: 'noirs', taille: 130 }), t)).join('');
  const petits = [46, 64, 84, 120].map((s) => fig(portrait({ taille: s }), `${s} px`)).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Atelier</title><style>
    body { margin: 0; padding: 24px; background: #f5f7fd; font: 13px/1.5 ui-sans-serif, system-ui, sans-serif; color: #0a0918; }
    h2 { font-size: 14px; margin: 24px 0 8px; }
    .rang { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
    figure { margin: 0; background: #fff; border: 1px solid #c3cae4; border-radius: 14px; padding: 8px; text-align: center; }
    figcaption { font-size: 11px; color: #474473; margin-top: 4px; }
  </style></head><body>
    <h2>Le tracé, en grand</h2><div class="rang">${fig(grand, 'courts · joie · claire · blonds')}</div>
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
