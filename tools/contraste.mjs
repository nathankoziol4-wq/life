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
const light = tokensOf(CSS.slice(CSS.indexOf(':root,'), CSS.indexOf('@media (prefers-color-scheme: dark)')));
const darkStart = CSS.indexOf(":root[data-theme='dark']");
const dark = tokensOf(CSS.slice(darkStart));

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

console.log('\n(✗ = sous le plancher)');
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

export { INKS, GROUNDS, light, dark };
