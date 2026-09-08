/**
 * Le contraste des jetons d'encre, sur toutes les surfaces où ils se posent.
 *
 * **Pourquoi cet outil existe.** Les jetons de `src/ui/theme/tokens.css`
 * portent la matière et le sens, mais rien ne vérifiait qu'un texte s'y lise.
 * Mesuré : `--ink-muted`, qui est la couleur du sous-titre de **chaque ligne**
 * de l'application, rendait 3,90:1 sur blanc — sous le plancher de 4,5:1 que
 * WCAG AA demande pour du texte. Et le blanc est le cas le plus favorable :
 * sur `--surface-sunken`, plus sombre, c'est pire.
 *
 * Deux planchers, et ils ne se confondent pas :
 *
 * - **4,5:1** pour du texte courant (WCAG 2.2, critère 1.4.3) ;
 * - **3:1** pour du texte large — 18,66px en gras ou 24px — et pour ce qui
 *   n'est pas du texte : un chevron, un trait, une jauge (critère 1.4.11).
 *
 *   node tools/contraste.mjs
 */

import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../src/ui/theme/tokens.css', import.meta.url), 'utf8');

/** Les jetons lus dans le fichier, par thème. */
function tokensOf(block) {
  const out = {};
  for (const [, name, value] of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[name] = value;
  }
  return out;
}

// Le thème clair est le premier bloc `:root`, le sombre celui de
// `[data-theme='dark']` — on lit le fichier plutôt que de recopier les valeurs,
// pour que cet outil ne puisse pas mentir après une modification.
/*
 * **Tous les blocs d'un thème, pas le premier.**
 *
 * La matière et le sens vivent dans deux blocs séparés, et le bloc sombre du
 * `@media` passe entre les deux. Découper « du premier `:root,` jusqu'au
 * premier `@media` » ne lisait donc que la matière : les douze couleurs de
 * famille du thème clair étaient invisibles à cet outil, qui annonçait
 * pourtant que tout tenait. On rassemble maintenant chaque bloc, quel que
 * soit son rang dans le fichier.
 */
function blocksOf(selector) {
  const out = {};
  const marker = new RegExp(`${selector}\\s*\\{`, 'g');
  for (const m of CSS.matchAll(marker)) {
    const start = m.index + m[0].length;
    const end = CSS.indexOf('\n}', start);
    Object.assign(out, tokensOf(CSS.slice(start, end === -1 ? undefined : end)));
  }
  return out;
}

const light = blocksOf("(?::root,\\s*)?:root\\[data-theme='light'\\]");
const dark = blocksOf(":root\\[data-theme='dark'\\]");

/*
 * **Le thème sombre a deux sources, et l'outil n'en lisait qu'une.**
 *
 * Le réglage explicite du joueur pose `data-theme='dark'` ; « comme le
 * système » ne pose rien et passe par `@media (prefers-color-scheme: dark)`,
 * sur `:root:not([data-theme='light'])`. Ce sont deux variantes distinctes
 * du même thème, et elles avaient divergé sans que rien ne le signale : le
 * bloc du `@media` portait les couleurs de famille *claires*, donc des
 * pastilles presque blanches sur un fond presque noir, pour tout joueur
 * n'ayant jamais touché au réglage.
 *
 * L'outil annonçait pendant ce temps que tout tenait son plancher — il ne
 * lisait que la variante explicite. Un audit qui bénit un thème qu'il ne
 * regarde pas est pire qu'aucun audit.
 */
const systeme = blocksOf(":root:not\\(\\[data-theme='light'\\]\\)");
const divergences = [...new Set([...Object.keys(dark), ...Object.keys(systeme)])]
  .filter((nom) => dark[nom] !== systeme[nom]);

function luminance(hex) {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? [...n].map((c) => c + c).join('') : n.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Les encres, et le plancher qui revient à chacune.
 *
 * `ink-faint` est la seule à ne pas porter de texte : elle est faite pour un
 * chevron, un trait, une jauge, et le plancher des éléments non textuels est
 * de 3:1. Elle avait pourtant un usage textuel — l'année du fil de vie, en
 * douze points gras — qui est passé à l'encre sourde. Si un écran remet du
 * texte en `--ink-faint`, ce plancher-ci devient faux : c'est le genre de
 * chose que `contraste.test.ts` doit rattraper.
 */
const INKS = [
  { name: 'ink', floor: 4.5, what: 'le texte courant' },
  { name: 'ink-soft', floor: 4.5, what: 'un texte secondaire' },
  { name: 'ink-muted', floor: 4.5, what: 'le sous-titre de chaque ligne' },
  { name: 'ink-faint', floor: 3, what: 'le chevron, les traits — pas du texte' },
];

/** Les fonds sur lesquels une encre peut se poser. */
const GROUNDS = ['surface', 'surface-alt', 'surface-sunken', 'bg', 'bg-deep'];

/*
 * **Les paires de sens, que la table des encres ne voit pas.**
 *
 * Une pastille pose une couleur de famille sur son ton doux : `.pill-good`
 * écrit `--good` sur `--good-soft`. Ni l'une ni l'autre n'est une encre ni un
 * fond, donc les quarante combinaisons ci-dessus les manquaient entièrement —
 * on pouvait refondre toute la palette sans jamais mesurer ce que le joueur
 * lit dans une pastille.
 *
 * Plancher 4,5:1 : le texte d'une pastille est court, mais c'est du texte, et
 * il porte souvent le seul mot qui dise l'état d'une ligne.
 */
const PAIRS = [
  'primary', 'argent', 'sante', 'amour', 'carriere', 'savoir', 'crime',
  'gloire', 'good', 'bad', 'warn', 'accent',
];

function pairs(theme, label) {
  let worst = 0;
  console.log(`\n— pastilles, thème ${label} —\n`);
  for (const name of PAIRS) {
    const ink = theme[name];
    const soft = theme[`${name}-soft`];
    if (!ink || !soft) { console.log(`  ${name.padEnd(10)} — jeton manquant`); continue; }
    const r = ratio(ink, soft);
    if (r < 4.5) worst = Math.max(worst, 4.5 - r);
    console.log(`  ${name.padEnd(10)} ${r.toFixed(2)}${r < 4.5 ? ' ✗' : ''}`);
  }
  return worst;
}

function report() {
let worstFail = 0;
for (const [label, theme] of [['CLAIR', light], ['SOMBRE', dark]]) {
  console.log(`\n— thème ${label} —\n`);
  console.log('ENCRE'.padEnd(14), 'plancher'.padStart(9), GROUNDS.map((g) => g.slice(0, 9).padStart(10)).join(''));
  for (const ink of INKS) {
    const hex = theme[ink.name];
    if (!hex) continue;
    const cells = GROUNDS.map((g) => {
      const bg = theme[g];
      if (!bg) return '—'.padStart(10);
      const r = ratio(hex, bg);
      if (r < ink.floor) worstFail = Math.max(worstFail, ink.floor - r);
      return `${r.toFixed(2)}${r < ink.floor ? '✗' : ' '}`.padStart(10);
    });
    console.log(ink.name.padEnd(14), `${ink.floor}:1`.padStart(9), cells.join(''));
  }
}

worstFail = Math.max(worstFail, pairs(light, 'CLAIR'), pairs(dark, 'SOMBRE'));

console.log('\n(✗ = sous le plancher)');

if (divergences.length) {
  console.log('\n— les deux sources du thème sombre ont divergé —\n');
  for (const nom of divergences) {
    console.log(`  --${nom.padEnd(16)} réglage explicite ${dark[nom] ?? '(absent)'}`
      + `   ·   comme le système ${systeme[nom] ?? '(absent)'}`);
  }
  console.log('\nUn joueur voit une palette ou l’autre selon un réglage qu’il n’a'
    + '\npeut-être jamais touché. Les deux blocs doivent porter les mêmes valeurs.');
  process.exitCode = 1;
} else {
  console.log('\nLes deux sources du thème sombre portent les mêmes valeurs.');
}

if (worstFail > 0) {
  console.log(`\nAu pire, il manque ${worstFail.toFixed(2)} point de contraste.`);
  process.exitCode = 1;
} else {
  console.log('\nToutes les encres tiennent leur plancher, sur toutes les surfaces.');
}
}

// Le rapport ne s'imprime que lancé à la main : importé par un test, ce
// fichier ne doit rien écrire ni fixer de code de sortie.
if (process.argv[1] && process.argv[1].endsWith('contraste.mjs')) report();

export { INKS, GROUNDS, light, dark, systeme, divergences };
