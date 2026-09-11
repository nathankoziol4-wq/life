/**
 * L'atelier du portrait : un tracé, une page, une capture.
 *
 * **Deux verdicts, le même mot.** « Ça se voit que c'est de l'IA, c'est du
 * gribouillage » a été dit une première fois de la version en boîtes — des
 * ellipses et des rectangles arrondis empilés — puis une seconde fois de la
 * version au Bézier qui l'a remplacée. La première critique portait sur les
 * formes ; la seconde porte sur le *parti pris*, et trois défauts la
 * justifiaient :
 *
 * 1. **Symétrie parfaite.** Les deux moitiés du visage étaient l'image miroir
 *    l'une de l'autre, au point près. C'est la signature la plus nette d'un
 *    dessin calculé : aucune main ne produit ça.
 * 2. **Aucun contour.** Des aplats posés bord à bord, sans trait d'encre. Un
 *    visage dessiné a une ligne, et cette ligne change d'épaisseur.
 * 3. **Les cheveux d'un seul tenant.** Une masse lisse au bord arrondi. De
 *    vrais cheveux se terminent en *pointes* et se séparent en mèches.
 *
 * D'où ce qui suit : un contour d'encre, une chevelure faite de mèches
 * distinctes à pointes, un bord de frange dentelé, et une asymétrie assumée
 * sur les sourcils, le crâne et la bouche.
 *
 * Chaque défaut du portrait a été trouvé en regardant un rendu, jamais en
 * relisant des coordonnées — d'où ce fichier, qui rend les sept coiffures, les
 * cinq humeurs et les sept teints côte à côte dans un vrai navigateur.
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

/** Assombrir une couleur, pour en tirer une encre. */
function encrer(hex, t) {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => Math.round(Number.parseInt(n.slice(i, i + 2), 16) * (1 - t)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/* ── Le visage ────────────────────────────────────────────────────────── */

/**
 * Le crâne.
 *
 * **Il n'est pas symétrique, et c'est délibéré.** La tempe droite est un point
 * plus large, la joue droite deux points plus pleine, et le menton tombe une
 * fraction à droite du milieu. À l'échelle du jeu on ne le lit pas
 * consciemment ; ce qu'on lit, c'est l'absence de l'effet miroir qui trahissait
 * le dessin calculé.
 */
const CRANE = 'M 30,94 C 31,48 58,21 100,21 C 143,21 170,49 171,96 '
  + 'C 172,124 166,142 157,157 C 146,177 124,193 101,193 '
  + 'C 78,193 57,176 47,156 C 38,140 29,122 30,94 Z';

/** L'oreille, avec son ourlet. Sans l'ourlet, c'est une virgule collée au crâne. */
function oreille(cote, peau, ink) {
  const t = cote === 'g' ? '' : ' transform="translate(200,0) scale(-1,1)"';
  return `<g${t}>`
    + `<path d="M 38,104 C 26,99 17,108 20,121 C 23,134 34,141 42,137" fill="${peau}" stroke="${ink}" stroke-width="3" stroke-linejoin="round" />`
    + `<path d="M 34,113 C 29,114 27,121 31,127" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity=".55" />`
    + '</g>';
}

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
function oeil(cote, iris, peau, ink, paupiere) {
  const t = cote === 'g' ? '' : ' transform="translate(200,0) scale(-1,1)"';
  const d = paupiere * 20;
  const amande = 'M 59,125 C 65,111 82,106 93,119 C 89,134 68,136 59,125 Z';
  const cil = `M 55,${129 + d} C 60,${110 + d} 82,${103 + d} 96,${118 + d} `
    + `C 92,${114 + d} 86,${111 + d} 79,${111 + d} `
    + `C 69,${112 + d} 61,${119 + d} 58,${130 + d} Z`;
  return `<g${t}>`
    + `<clipPath id="amande-${cote}"><path d="${amande}" /></clipPath>`
    + `<path d="${amande}" fill="#fbf6ef" />`
    + `<g clip-path="url(#amande-${cote})">`
    + `<circle cx="77" cy="122" r="10.6" fill="${iris}" />`
    + `<circle cx="77" cy="122" r="4.8" fill="${encrer(iris, 0.62)}" />`
    + '<circle cx="73.2" cy="117.8" r="2.8" fill="#ffffff" />'
    + `<path d="M 57,118 C 65,109 85,106 96,117 L 96,102 L 57,102 Z" fill="${ink}" opacity=".12" />`
    + (d ? `<path d="M 55,${129 + d} C 60,${110 + d} 82,${103 + d} 96,${118 + d} L 96,100 L 55,100 Z" fill="${peau}" />` : '')
    + '</g>'
    + `<path d="${cil}" fill="${ink}" />`
    + `<path d="M 66,132 C 72,135 80,135 85,132" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" opacity=".5" />`
    + '</g>';
}

/**
 * Le sourcil : épais à la tête, affiné vers la queue.
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
function sourcil(cote, dy, pente, ink) {
  const g = cote === 'g';
  const t = g ? '' : ' transform="translate(200,0) scale(-1,1)"';
  const forme = g
    ? 'M 91,100 C 83,91 66,89 55,98 C 54,100 55,103 57,102 C 68,96 81,98 89,106 C 91,106 92,102 91,100 Z'
    : 'M 91,99 C 84,91 69,89 58,97 C 57,99 58,101 60,100 C 70,95 82,97 89,105 C 91,105 92,101 91,99 Z';
  return `<g${t}><path transform="translate(0,${dy + 4}) rotate(${g ? pente : -pente} 90 102)" `
    + `d="${forme}" fill="${ink}" /></g>`;
}

/**
 * Le nez : deux traits, et rien d'autre.
 *
 * L'arête à droite, le dessous du bout. Le bloc plein a été essayé deux fois —
 * il se lisait d'abord comme une cicatrice verticale, puis, une fois flanqué
 * de ses deux ailes, comme un cœur.
 */
function nez(ink) {
  return `<path d="M 104,120 C 108,134 111,145 109,151 C 106,156 97,156 93,150" `
    + `fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity=".8" />`;
}

/**
 * La bouche.
 *
 * La lèvre haute porte l'arc de Cupidon — deux bosses et un creux au milieu ;
 * la basse est plus pleine et plus claire. Entre les deux, la ligne des
 * lèvres, tracée à l'encre : c'est ce qu'on lit en premier de loin, et c'est
 * la seule partie du visage qu'un rectangle arrondi ne peut pas imiter.
 */
function bouche(humeur, haute, basse, ink) {
  const t = (d, w = 2.6) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" />`;
  switch (humeur) {
    case 'joie':
      return `<path d="M 73,161 C 83,157 91,161 99,161 C 107,161 115,157 125,161 `
        + `C 123,180 107,190 99,190 C 91,190 75,180 73,161 Z" fill="${encrer(haute, 0.35)}" />`
        + `<path d="M 76,162 C 85,159 93,162 99,162 C 105,162 113,159 122,162 `
        + `C 120,169 109,173 99,173 C 89,173 78,169 76,162 Z" fill="#fdfaf5" />`
        + `<path d="M 108,181 C 112,178 116,173 118,168 C 114,176 109,182 104,185 Z" fill="${basse}" opacity=".55" />`
        + t('M 73,161 C 85,165 113,165 125,161');
    case 'peine':
      return `<path d="M 79,171 C 85,161 93,167 99,166 C 105,167 113,161 119,171 `
        + `C 113,176 85,176 79,171 Z" fill="${haute}" />`
        + t('M 79,171 C 87,165 111,165 119,171');
    case 'lassitude':
      return `<path d="M 79,165 C 86,161 93,164 99,164 C 105,164 112,161 119,165 `
        + `C 115,172 83,172 79,165 Z" fill="${haute}" />`
        + t('M 79,165 C 89,168 109,168 119,165', 2.4);
    case 'mal':
      return `<path d="M 87,163 C 91,158 107,158 111,163 `
        + `C 113,172 107,177 99,177 C 91,177 85,172 87,163 Z" fill="${haute}" />`
        + t('M 87,164 C 93,167 105,167 111,164', 2.2);
    default: /* calme */
      return `<path d="M 78,162 C 85,154 93,160 99,159 C 105,160 113,154 120,162 `
        + `C 115,176 83,176 78,162 Z" fill="${haute}" />`
        + `<path d="M 82,166 C 90,171 108,171 116,166 C 113,174 85,174 82,166 Z" fill="${basse}" opacity=".5" />`
        + t('M 78,162 C 89,167 109,167 120,162');
  }
}

/* ── Les cheveux, en mèches ───────────────────────────────────────────── */

/**
 * **La différence qui compte.** Une coiffure n'est pas une masse au bord
 * arrondi : c'est un empilement de mèches, chacune finissant en pointe. La
 * version précédente dessinait un contour lisse, et c'est ce qui la faisait
 * lire comme une perruque en plastique.
 *
 * Chaque coiffure rend `{ derriere, masse, meches }` :
 * - `derriere` passe derrière la tête ;
 * - `masse` est la calotte, dont le **bord bas est dentelé** — chaque dent est
 *   une pointe de mèche ;
 * - `meches` sont les mèches détachées, posées par-dessus, chacune cernée
 *   d'encre pour qu'on voie la séparation.
 *
 * La raie tombe vers x = 134, jamais au milieu : une coiffure symétrique se
 * lit comme un casque.
 */
function coiffure(nom) {
  /*
   * La ligne de front commune : de la raie jusqu'à la tempe gauche, en trois
   * pointes. Elle s'arrête au-dessus des sourcils — une mèche qui les couvre
   * détruit le seul canal d'expression qui reste depuis que le portrait
   * s'arrête au menton.
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

  switch (nom) {
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
        stries: [
          'M 34,86 C 27,122 27,162 34,192',
          'M 168,86 C 175,122 175,162 168,192',
        ],
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
        meches: [BALAI[0]],
        stries: [
          'M 46,88 C 40,116 40,152 50,182',
          'M 156,88 C 162,116 162,152 152,182',
        ],
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
      const pt = (i) => {
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
      const pt = (i) => {
        const a = (i * Math.PI) / n;
        return `${(100 - Math.cos(a) * 86).toFixed(1)},${(118 - Math.sin(a) * 108).toFixed(1)}`;
      };
      let d = `M ${pt(0)} `;
      for (let i = 1; i <= n; i += 1) d += `A 13,13 0 0 1 ${pt(i)} `;
      d += 'C 184,100 178,88 170,80 C 158,73 144,69 130,68 '
        + 'C 122,60 112,62 106,70 C 96,64 86,64 80,71 '
        + 'C 62,73 44,77 30,82 C 22,90 16,101 14,118 Z';
      return {
        derriere: '',
        masse: d,
        meches: [],
        stries: ['M 44,76 C 60,54 88,42 118,46'],
      };
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

/* ── L'humeur ─────────────────────────────────────────────────────────── */

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
  style = 'courts', humeur = 'calme', taille = 200,
} = {}) {
  const [peau, , creux] = PEAU[teint];
  const [chev, chevOmbre, chevClair] = CHEVEUX[cheveux];
  const iris = YEUX[yeux];
  const { dy, pente, paupiere } = HUMEUR[humeur];
  const { derriere, masse, meches, stries = [] } = coiffure(style);

  /*
   * L'encre se déduit du teint, elle n'est pas fixe. Un noir constant sur un
   * teint « très foncée » ne se détache pas, et sur « très claire » il écrase
   * tout. On prend le creux du teint et on l'assombrit.
   */
  const ink = encrer(creux, 0.5);
  const inkCheveux = encrer(chevOmbre, 0.34);
  /* Sur un teint sombre, une lèvre neutre pose une barre grise au milieu du
     visage : elle doit rester dans les rouges, plus claire que la peau. */
  const sombre = ['brune', 'foncée', 'très foncée'].includes(teint);
  const levreHaute = sombre ? '#9d5f50' : '#9d5849';
  const levreBasse = sombre ? '#c48978' : '#bd7261';

  const trait = `stroke="${ink}" stroke-width="3.1" stroke-linejoin="round"`;
  const traitCheveux = `stroke="${inkCheveux}" stroke-width="3.1" stroke-linejoin="round"`;

  return `<svg viewBox="0 0 200 200" width="${taille}" height="${taille}" xmlns="http://www.w3.org/2000/svg">
    ${derriere ? `<path d="${derriere}" fill="${chev}" ${traitCheveux} />` : ''}
    ${oreille('g', peau, ink)}${oreille('d', peau, ink)}
    <path d="${CRANE}" fill="${peau}" ${trait} />
    ${oeil('g', iris, peau, ink, paupiere)}${oeil('d', iris, peau, ink, paupiere)}
    ${sourcil('g', dy, pente, inkCheveux)}${sourcil('d', dy, pente, inkCheveux)}
    ${nez(ink)}
    <g transform="translate(-1,0)">${bouche(humeur, levreHaute, levreBasse, ink)}</g>
    <path d="${masse}" fill="${chev}" ${traitCheveux} />
    ${meches.map((m) => `<path d="${m}" fill="${chev}" ${traitCheveux} />`).join('\n    ')}
    ${meches.slice(0, 2).map((m) => `<path d="${m}" fill="${chevClair}" opacity=".22" />`).join('\n    ')}
    ${stries.map((m) => `<path d="${m}" fill="none" stroke="${inkCheveux}" stroke-width="2.2" stroke-linecap="round" opacity=".5" />`).join('\n    ')}
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
    <h2>Le tracé, en grand</h2><div class="rang">${fig(grand, 'courts · calme · claire')}</div>
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
