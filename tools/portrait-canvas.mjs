/**
 * Écrit les planches de la toile Claude Design.
 *
 * Une seule fonction dessine la tête ; les cinq planches l'appellent avec des
 * réglages différents. C'est la raison d'être de ce script : si le crâne bouge,
 * il bouge sur les cinq planches à la fois, sinon la planche des coiffures
 * finirait par montrer une tête que la planche principale n'a plus.
 */
import { writeFileSync } from 'node:fs';

const OUT = new URL('../design/portrait/', import.meta.url).pathname;

/* Les palettes du jeu, recopiées de Portrait.tsx. */
const PEAU = {
  'très claire': ['#f7ddc9', '#e6bda1'], claire: ['#efc9a8', '#d9a880'],
  mate: ['#dda878', '#c08a58'], dorée: ['#cf9963', '#b07c48'],
  brune: ['#a9713f', '#8a5730'], foncée: ['#7d4c26', '#63391b'],
  'très foncée': ['#583520', '#412516'],
};
const CHEVEUX = {
  bruns: ['#4a3524', '#33241a'], châtains: ['#6f4e2e', '#513821'],
  noirs: ['#211d1c', '#100e0e'], blonds: ['#d9b464', '#b88f42'],
  roux: ['#b4551f', '#8c3f14'], auburn: ['#7c3a1c', '#5c2812'],
  'poivre et sel': ['#8f8d89', '#6c6a67'],
};
const YEUX = {
  marron: '#6b4423', noisette: '#9a7b3f', verts: '#4a7a49', bleus: '#4a7ab0',
  gris: '#78858d', ambre: '#b07a2a', noirs: '#2a2422',
};

/* Les jetons d'interface, recopiés de tokens.css. */
const ENCRE = '#0a0918';
const ENCRE_SOURDE = '#474473';
const SURFACE = '#ffffff';
const FOND = '#f5f7fd';
const TRAIT = '#c3cae4';

const div = (style, dedans = '') =>
  `<div class="piece" style="${style}">${dedans}</div>`;

/**
 * Les cheveux, en deux tas : ce qui passe derrière la tête et ce qui retombe
 * devant. Le premier jet ne renvoyait qu'une liste, dont tout sauf le premier
 * élément passait devant — les vagues d'« ondulés » rendaient donc des pavés
 * au milieu des joues.
 */
function cheveux(style, c, co) {
  const b = (l, t, w, h, r, fond = c) =>
    div(`left:${l}px;top:${t}px;width:${w}px;height:${h}px;background:${fond};border-radius:${r};`);

  switch (style) {
    case 'courts':
      return {
        derriere: [b(50, 14, 220, 190, '50% 50% 20% 20% / 60% 60% 24% 24%')],
        devant: [b(56, 16, 208, 88, '50% 50% 40% 40% / 72% 72% 28% 28%')],
      };
    case 'mi-longs':
      return {
        derriere: [b(42, 14, 236, 254, '50% 50% 26% 26% / 50% 50% 22% 22%')],
        devant: [b(54, 16, 212, 94, '50% 50% 44% 44% / 70% 70% 30% 30%')],
      };
    case 'longs':
      return {
        derriere: [b(36, 14, 248, 312, '50% 50% 34% 34% / 42% 42% 16% 16%')],
        devant: [b(54, 16, 212, 96, '50% 50% 46% 46% / 70% 70% 30% 30%')],
      };
    case 'bouclés': {
      /* Sept boucles sur une même division : posées à la main, elles finissent
         toujours par se décaler d'un côté. La calotte séparée qui les coiffait
         traçait un arc net en travers des boucles — la frange reprend donc la
         forme de « courts », qui se fond dans la masse. */
      const boucles = [];
      for (let i = 0; i < 7; i += 1) {
        boucles.push(b(Math.round(46 + (i * 232) / 6 - 28), 8 + Math.abs(3 - i) * 10, 58, 58, '50%'));
      }
      const hairline = [];
      for (let i = 0; i < 4; i += 1) {
        hairline.push(b(Math.round(66 + (i * 188) / 3 - 22), 62, 44, 44, '50%'));
      }
      return {
        derriere: [b(46, 26, 228, 212, '50% 50% 30% 30% / 54% 54% 26% 26%'), ...boucles],
        devant: [b(58, 22, 204, 84, '50% 50% 44% 44% / 72% 72% 28% 28%'), ...hairline],
      };
    }
    case 'crépus': {
      /* Deux fautes successives ici. Le premier jet posait un halo à peine plus
         large que le crâne : il n'en restait qu'un liseré, et le personnage
         semblait chauve. Le second débordait par le haut du cadre, et la coupe
         nette se voyait. Le halo tient maintenant entièrement dans la grille. */
      const halo = [b(22, 16, 276, 250, '50%')];
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * (i + 0.5)) / 6;
        halo.push(b(
          Math.round(160 - Math.cos(a) * 136 - 32),
          Math.round(150 - Math.sin(a) * 112 - 32),
          64, 64, '50%',
        ));
      }
      return { derriere: halo, devant: [b(54, 14, 212, 106, '50% 50% 40% 40% / 66% 66% 34% 34%')] };
    }
    case 'ondulés': {
      /* Les vagues bordent le *bas* de la masse arrière. Posées à hauteur des
         joues, les deux extérieures rendaient des macarons au niveau de la
         mâchoire. */
      const vagues = [];
      for (let i = 0; i < 5; i += 1) {
        vagues.push(b(Math.round(76 + (i * 168) / 4 - 32), 216 + (i % 2) * 16, 64, 64, '50%'));
      }
      return {
        derriere: [b(44, 14, 232, 236, '50% 50% 24% 24% / 56% 56% 22% 22%'), ...vagues],
        devant: [b(56, 16, 208, 92, '52% 48% 44% 44% / 74% 66% 30% 30%')],
      };
    }
    default: /* raides */
      return {
        derriere: [b(46, 12, 228, 262, '46% 46% 6% 6% / 46% 46% 8% 8%')],
        devant: [b(52, 14, 216, 80, '46% 46% 10% 10% / 66% 66% 20% 20%')],
      };
  }
}

/**
 * L'expression : les sourcils, la bouche, et la paupière.
 *
 * C'est le seul canal expressif qui reste depuis que le portrait s'arrête au
 * menton — d'où la règle tenue ailleurs dans le code : la frange ne couvre
 * jamais les sourcils.
 *
 * **Le signe de la rotation comptait, et il était inversé.** Sur le sourcil de
 * gauche, une rotation négative lève l'extrémité *intérieure* : c'est le
 * dessin de la tristesse. La première version donnait donc à « peine » des
 * sourcils froncés vers le centre, et le personnage triste avait l'air furieux.
 */
function expression(humeur, co, bouche) {
  const sourcil = (cote, dy, rot) => div(
    `left:${cote === 'g' ? 100 : 172}px;top:${116 + dy}px;width:48px;height:11px;` +
    `background:${co};border-radius:40% 40% 50% 50%;` +
    `transform:rotate(${cote === 'g' ? rot : -rot}deg);`,
  );
  const levre = (w, h, r, ouverte) => div(
    `left:${Math.round(160 - w / 2)}px;top:228px;width:${w}px;height:${h}px;` +
    `background:${ouverte ? '#6b2d26' : bouche};border-radius:${r};overflow:hidden;`,
    ouverte
      ? `<div style="position:absolute;left:${Math.round(w * 0.12)}px;top:0;width:${Math.round(w * 0.76)}px;height:${Math.round(h * 0.32)}px;background:#fffdfa;border-radius:0 0 40% 40%;"></div>`
      : '',
  );

  switch (humeur) {
    case 'joie':
      return { pieces: [sourcil('g', -8, -3), sourcil('d', -8, -3), levre(66, 34, '12% 12% 50% 50%', true)], paupiere: 0 };
    case 'lassitude':
      return { pieces: [sourcil('g', 3, -7), sourcil('d', 3, -7), levre(50, 9, '40%', false)], paupiere: 0.3 };
    case 'peine':
      return { pieces: [sourcil('g', -1, -15), sourcil('d', -1, -15), levre(46, 17, '50% 50% 12% 12%', false)], paupiere: 0.14 };
    case 'mal':
      return { pieces: [sourcil('g', 4, -11), sourcil('d', 4, -11), levre(30, 11, '50%', false)], paupiere: 0.38 };
    default: /* calme */
      return { pieces: [sourcil('g', 0, -2), sourcil('d', 0, -2), levre(46, 13, '18% 18% 50% 50%', false)], paupiere: 0 };
  }
}

/**
 * La couleur de la bouche fermée, déduite du teint.
 *
 * Sur les trois teints sombres, la première version prenait une encre presque
 * blanche et posait une barre claire au milieu du visage. La bouche doit rester
 * une bouche : plus claire que la peau quand la peau est sombre, plus sombre
 * qu'elle sinon, mais toujours dans les rouges.
 */
function levreDe(teint) {
  return ['brune', 'foncée', 'très foncée'].includes(teint) ? '#b9705e' : '#6b3a30';
}

/** Une tête entière. */
function tete({ peau, peauOmbre, chev, chevOmbre, yeux, style = 'courts', humeur = 'calme', bouche = '#6b3a30' }) {
  const { pieces, paupiere } = expression(humeur, chevOmbre, bouche);
  const oeil = (x) => div(
    `left:${x}px;top:140px;width:40px;height:46px;background:#fdfbf7;border-radius:50%;overflow:hidden;`,
    `<div style="position:absolute;left:8px;top:10px;width:24px;height:26px;background:${yeux};border-radius:50%;"></div>` +
    `<div style="position:absolute;left:14px;top:16px;width:12px;height:13px;background:#17120f;border-radius:50%;"></div>` +
    `<div style="position:absolute;left:11px;top:12px;width:8px;height:8px;background:#ffffff;border-radius:50%;"></div>` +
    (paupiere
      ? `<div style="position:absolute;left:-2px;top:0;width:44px;height:${Math.round(46 * paupiere)}px;background:${peau};border-radius:0 0 40% 40%;"></div>`
      : ''),
  );
  const { derriere, devant } = cheveux(style, chev, chevOmbre);
  return [
    '<!-- les cheveux, derrière -->', ...derriere,
    '<!-- les oreilles -->',
    div(`left:48px;top:150px;width:30px;height:40px;background:${peauOmbre};border-radius:50%;`),
    div(`left:242px;top:150px;width:30px;height:40px;background:${peauOmbre};border-radius:50%;`),
    '<!-- le crâne -->',
    div(`left:62px;top:22px;width:196px;height:262px;background:${peau};border-radius:48% 48% 44% 44% / 40% 40% 60% 60%;`),
    '<!-- les joues -->',
    div('left:88px;top:196px;width:48px;height:30px;background:#e0705c;opacity:.16;border-radius:50%;'),
    div('left:184px;top:196px;width:48px;height:30px;background:#e0705c;opacity:.16;border-radius:50%;'),
    '<!-- les yeux -->', oeil(104), oeil(176),
    '<!-- le nez -->',
    div(`left:148px;top:190px;width:24px;height:16px;background:${peauOmbre};opacity:.6;border-radius:50%;`),
    "<!-- l'expression -->", ...pieces,
    '<!-- les cheveux, devant -->', ...devant,
  ].join('\n    ');
}

const ENTETE = (titre) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; color: ${ENCRE}; }
    .piece { position: absolute; }
    .titre { margin: 0; font-size: 15px; font-weight: 620; letter-spacing: -.01em; }
    .note { margin: 0; font-size: 12px; color: ${ENCRE_SOURDE}; line-height: 1.5; }
    .etiquette { margin: 6px 0 0; font-size: 11px; color: ${ENCRE_SOURDE}; text-align: center; }
    .case { background: ${SURFACE}; border: 1px solid ${TRAIT}; border-radius: 14px; padding: 10px 8px 8px; }
  </style>
</helmet>

<!-- ${titre} -->
`;

const PIED = `</x-dc>
</body>
</html>
`;

/** Une tête réduite, avec son étiquette, pour les planches de variantes. */
function vignette(label, contenu, echelle) {
  return `<div class="case">
    <div style="position: relative; width: ${Math.round(320 * echelle)}px; height: ${Math.round(340 * echelle)}px; overflow: hidden;">
      <div style="position: absolute; left: 0; top: 0; width: 320px; height: 340px; transform: scale(${echelle}); transform-origin: 0 0;">
    ${contenu}
      </div>
    </div>
    <p class="etiquette">${label}</p>
  </div>`;
}

function planche({ titre, note, largeur, hauteur, colonnes, vignettes }) {
  return `${ENTETE(titre)}
<div style="width: ${largeur}px; height: ${hauteur}px; background: ${FOND}; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px;">
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <p class="titre">${titre}</p>
    <p class="note">${note}</p>
  </div>
  <div style="display: grid; grid-template-columns: repeat(${colonnes}, 1fr); gap: 12px;">
    ${vignettes.join('\n    ')}
  </div>
</div>
${PIED}`;
}

/* ── La planche principale : celle qu'on redessine ─────────────────────── */

const principale = `${ENTETE('Portrait')}
<div style="width: 420px; height: 470px; background: ${SURFACE}; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 18px 0 0; box-sizing: border-box;">
  <div style="position: relative; width: 320px; height: 340px;">
    ${tete({
      peau: '{{peau}}', peauOmbre: '{{peauOmbre}}', chev: '{{cheveux}}',
      chevOmbre: '{{cheveuxOmbre}}', yeux: '{{yeux}}', style: 'courts', humeur: 'joie',
    })}
  </div>
  <p class="note" style="max-width: 300px; text-align: center;">Chaque pièce est un calque : cliquez dedans pour la déplacer, la retailler, la recolorer. Les cinq couleurs se règlent dans le panneau.</p>
</div>

<script data-dc-script data-props='{
  "peau": {"editor": "color", "default": "#efc9a8", "section": "Teint", "options": ["#f7ddc9", "#efc9a8", "#dda878", "#cf9963", "#a9713f", "#7d4c26", "#583520"]},
  "peauOmbre": {"editor": "color", "default": "#d9a880", "section": "Teint"},
  "cheveux": {"editor": "color", "default": "#d9b464", "section": "Cheveux", "options": ["#4a3524", "#6f4e2e", "#211d1c", "#d9b464", "#b4551f", "#7c3a1c", "#8f8d89"]},
  "cheveuxOmbre": {"editor": "color", "default": "#b88f42", "section": "Cheveux"},
  "yeux": {"editor": "color", "default": "#6b4423", "section": "Yeux", "options": ["#6b4423", "#9a7b3f", "#4a7a49", "#4a7ab0", "#78858d", "#b07a2a", "#2a2422"]}
}'>
class Component extends DCLogic {
  renderVals() {
    return {
      peau: this.props.peau ?? '#efc9a8',
      peauOmbre: this.props.peauOmbre ?? '#d9a880',
      cheveux: this.props.cheveux ?? '#d9b464',
      cheveuxOmbre: this.props.cheveuxOmbre ?? '#b88f42',
      yeux: this.props.yeux ?? '#6b4423',
    };
  }
}
</script>
${PIED}`;

/* ── Les planches de variantes ─────────────────────────────────────────── */

const STYLES = ['courts', 'mi-longs', 'longs', 'bouclés', 'crépus', 'ondulés', 'raides'];
const HUMEURS = [
  ['joie', 'joie — bonheur > 74'],
  ['calme', 'calme — l’état courant'],
  ['lassitude', 'lassitude — bonheur < 45'],
  ['peine', 'peine — bonheur < 22'],
  ['mal', 'mal — santé < 25'],
];
const ECHELLE = 0.62;

const coiffures = planche({
  titre: 'Les sept coiffures',
  note: 'HAIR_STYLES du jeu. Un personnage en tire une à la naissance et la garde, sauf changement.',
  largeur: 1180, hauteur: 650, colonnes: 4,
  vignettes: STYLES.map((s) => vignette(s, tete({
    peau: PEAU.claire[0], peauOmbre: PEAU.claire[1],
    chev: CHEVEUX.châtains[0], chevOmbre: CHEVEUX.châtains[1],
    yeux: YEUX.marron, style: s, humeur: 'calme',
  }), ECHELLE)),
});

const teints = planche({
  titre: 'Les sept teints',
  note: 'SKIN_TONES du jeu, chacun avec sa couleur d’ombre. Le plus sombre est le cas qui décide : le visage doit y rester lisible.',
  largeur: 1180, hauteur: 650, colonnes: 4,
  vignettes: Object.entries(PEAU).map(([nom, [p, o]]) => vignette(nom, tete({
    peau: p, peauOmbre: o,
    chev: CHEVEUX.noirs[0], chevOmbre: CHEVEUX.noirs[1],
    yeux: YEUX.marron, style: 'courts', humeur: 'calme', bouche: levreDe(nom),
  }), ECHELLE)),
});

const humeurs = planche({
  titre: 'Les cinq humeurs',
  note: 'L’expression se déduit de la santé et du bonheur. Sourcils, bouche et paupière portent tout : le portrait s’arrête au menton.',
  largeur: 1180, hauteur: 400, colonnes: 5,
  vignettes: HUMEURS.map(([h, label]) => vignette(label, tete({
    peau: PEAU.mate[0], peauOmbre: PEAU.mate[1],
    chev: CHEVEUX.bruns[0], chevOmbre: CHEVEUX.bruns[1],
    yeux: YEUX.verts, style: 'courts', humeur: h,
  }), ECHELLE)),
});

const couleurs = planche({
  titre: 'Les sept couleurs de cheveux',
  note: 'HAIR_COLORS du jeu. La couleur d’ombre sert aux sourcils : c’est elle qui tient l’expression.',
  largeur: 1180, hauteur: 650, colonnes: 4,
  vignettes: Object.entries(CHEVEUX).map(([nom, [c, o]]) => vignette(nom, tete({
    peau: PEAU.claire[0], peauOmbre: PEAU.claire[1],
    chev: c, chevOmbre: o, yeux: YEUX.bleus, style: 'mi-longs', humeur: 'calme',
  }), ECHELLE)),
});

const canvas = {
  artboards: [
    { file: 'Main.dc.html', x: 0, y: 0, w: 420, h: 470, title: 'Portrait' },
    { file: 'Humeurs.dc.html', x: 560, y: 0, w: 1180, h: 400, title: 'Humeurs' },
    { file: 'Coiffures.dc.html', x: 560, y: 540, w: 1180, h: 650, title: 'Coiffures' },
    { file: 'Teints.dc.html', x: 1860, y: 540, w: 1180, h: 650, title: 'Teints' },
    { file: 'Couleurs.dc.html', x: 1860, y: -260, w: 1180, h: 650, title: 'Couleurs de cheveux' },
  ],
  annotations: [
    {
      id: 'mode-emploi',
      x: 0, y: 560, w: 420,
      text: 'Redessinez le portrait sur la planche « Portrait ». Les quatre autres montrent les axes que le dessin doit tenir : sept coiffures, sept teints, sept couleurs de cheveux, cinq humeurs. Quand le portrait vous plaît, je porte la géométrie dans le code du jeu.',
    },
  ],
  launch: { view: 'canvas' },
};

const fichiers = {
  'Main.dc.html': principale,
  'Coiffures.dc.html': coiffures,
  'Teints.dc.html': teints,
  'Humeurs.dc.html': humeurs,
  'Couleurs.dc.html': couleurs,
  'canvas.json': `${JSON.stringify(canvas, null, 2)}\n`,
};

for (const [nom, contenu] of Object.entries(fichiers)) {
  writeFileSync(`${OUT}/${nom}`, contenu);
  console.log(`${nom} — ${contenu.length} octets`);
}
