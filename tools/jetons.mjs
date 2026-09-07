/**
 * L'adoption des jetons, mesurée sur les écrans.
 *
 * **Pourquoi cet outil existe.** `src/ui/theme/tokens.css` s'ouvre sur une
 * règle — « aucune valeur en dur » — et `components.css` a été écrit pour
 * supprimer 443 corrections d'écrans. Rien ne vérifiait que la règle tenait.
 * Elle ne tenait pas : au moment de cette mesure, les écrans portaient **617
 * `style={{}}` dans 62 fichiers**, contre 575 quelques semaines plus tôt.
 * L'adoption reculait, et personne ne pouvait le voir.
 *
 * **Compter n'est pas juger.** Tous les styles en ligne ne sont pas des
 * valeurs en dur : une largeur de jauge, la position d'un mobile dans un
 * mini-jeu, une couleur choisie par le moteur — ce sont des valeurs calculées
 * à l'exécution, qu'aucun jeton ne peut exprimer. Les compter avec les autres
 * donnerait un chiffre faux dans le sens qui arrange. L'outil les sépare.
 *
 *   node tools/jetons.mjs
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname;

function sources(dir = '') {
  const out = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...sources(path));
    else if (entry.name.endsWith('.tsx')) out.push(path);
  }
  return out;
}

/**
 * Le contenu de chaque `style={{ … }}`, accolades équilibrées.
 *
 * Une expression régulière s'arrêterait à la première accolade fermante, donc
 * couperait `{{ width: `${x}%` }}` en plein milieu et rendrait un fragment.
 */
export function stylesOf(source) {
  // On retire les commentaires avant de lire. Une note qui *explique* pourquoi
  // une règle n'emploie plus telle couleur en cite forcément le code, et le
  // premier jet de cet outil s'y est fait prendre — exactement comme celui de
  // `contraste.test.ts` avant lui.
  const code = source.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/[^\n]*/g, '');
  const out = [];
  for (let i = code.indexOf('style={{'); i !== -1; i = code.indexOf('style={{', i + 1)) {
    let depth = 0;
    let j = i + 7;
    for (; j < code.length; j += 1) {
      const c = code[j];
      if (c === '{') depth += 1;
      else if (c === '}') { depth -= 1; if (depth === 0) break; }
    }
    out.push(code.slice(i + 8, j - 1).replace(/\s+/g, ' ').trim());
  }
  return out;
}

/** Une valeur calculée à l'exécution : rien ne peut la mettre en feuille. */
export const isComputed = (s) => /\$\{|`|\?|\.\w+\s*[*+/-]|\b[a-z][A-Za-z0-9]*\(/.test(s);

/** Les couleurs écrites à la main, la faute la plus lourde : elles ne suivent
    pas le thème, donc elles cassent le mode sombre sans rien signaler. */
export const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(/;

export function measure() {
  const files = sources();
  let computed = 0;
  const literal = [];
  const colours = [];
  for (const file of files) {
    const code = readFileSync(join(ROOT, file), 'utf8');
    for (const style of stylesOf(code)) {
      if (COLOUR.test(style)) colours.push(`${file} — ${style}`);
      if (isComputed(style)) computed += 1;
      else literal.push(`${file} — ${style}`);
    }
  }
  return { files: files.length, computed, literal, colours };
}

if (process.argv[1] && process.argv[1].endsWith('jetons.mjs')) {
  const { computed, literal, colours } = measure();
  const counts = new Map();
  for (const line of literal) {
    const decl = line.split(' — ')[1];
    counts.set(decl, (counts.get(decl) ?? 0) + 1);
  }
  console.log(`styles en ligne : ${computed + literal.length}`);
  console.log(`  calculés à l’exécution : ${computed} (hors de portée d’un jeton)`);
  console.log(`  valeurs en dur         : ${literal.length}`);
  console.log(`  dont couleurs          : ${colours.length}`);
  if (colours.length > 0) {
    console.log('\n— les couleurs en dur, à traiter en premier —');
    for (const c of colours) console.log(`  ${c}`);
  }
  console.log('\n— les valeurs en dur les plus fréquentes —');
  for (const [decl, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(String(n).padStart(4), decl.slice(0, 92));
  }
}
