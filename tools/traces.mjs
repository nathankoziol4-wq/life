/**
 * Mesurer chaque icône dans un vrai moteur de rendu.
 *
 * **Le défaut que ça attrape.** Un attribut `d` mal formé n'émet aucune
 * erreur : SVG abandonne l'analyse à la première commande illisible et
 * dessine ce qu'il avait compris — souvent rien. `icones.test.ts` vérifie
 * que chaque emoji pointe vers un tracé qui *existe* ; il ne peut pas
 * vérifier que ce tracé *se voit*. Une virgule de trop dans un arc, et la
 * ligne perd son signe exactement comme si le nom était faux.
 *
 * Trois mesures, toutes prises sur le tracé rendu :
 * — longueur, pour trouver les tracés vides ou tronqués ;
 * — boîte englobante, pour trouver ce qui déborde de la grille 24 et se
 *   ferait rogner par le `viewBox` ;
 * — taille, parce qu'une icône qui n'occupe qu'un tiers de sa case paraît
 *   minuscule à côté des autres, et le défaut ne se voit qu'en liste.
 */

import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { findChromium } from './chromium.mjs';

const SOURCE = readFileSync(new URL('../src/ui/components/Icon.tsx', import.meta.url), 'utf8');
const bloc = SOURCE.slice(SOURCE.indexOf('const PATHS'), SOURCE.indexOf('const FROM_EMOJI'));
const traces = [...bloc.matchAll(/^ {2}([a-z]+): '([^']+)',$/gm)].map((m) => [m[1], m[2]]);

// Garde-fou du garde-fou : une analyse cassée ne lirait aucun tracé et
// rendrait un verdict vert sans avoir rien mesuré.
if (traces.length < 100) {
  console.error(`analyse cassée : ${traces.length} tracés lus, on en attend plus de cent`);
  process.exit(1);
}

const executablePath = findChromium();
const navigateur = await chromium.launch(executablePath ? { executablePath } : {});
const page = await navigateur.newPage();
const bilan = await page.evaluate((liste) => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  document.body.append(svg);
  return liste.map(([nom, d]) => {
    const trace = document.createElementNS(ns, 'path');
    trace.setAttribute('d', d);
    svg.append(trace);
    const boite = trace.getBBox();
    const mesure = {
      nom,
      longueur: Math.round(trace.getTotalLength()),
      x: +boite.x.toFixed(1),
      y: +boite.y.toFixed(1),
      l: +boite.width.toFixed(1),
      h: +boite.height.toFixed(1),
    };
    trace.remove();
    return mesure;
  });
}, traces);
await navigateur.close();

const vides = bilan.filter((t) => t.longueur < 4);
const debordent = bilan.filter((t) => t.x < -0.5 || t.y < -0.5 || t.x + t.l > 24.5 || t.y + t.h > 24.5);
const menus = bilan.filter((t) => Math.max(t.l, t.h) < 9);

console.log(`${bilan.length} tracés mesurés dans le navigateur`);
const dire = (titre, lot, format) =>
  console.log(`${titre} : ${lot.length ? lot.map(format).join(' ') : 'aucun'}`);
dire('ne se dessinent pas', vides, (t) => t.nom);
dire('débordent de la grille', debordent, (t) => `${t.nom}(${t.x},${t.y} ${t.l}×${t.h})`);
dire('trop petits pour leur case', menus, (t) => `${t.nom}(${t.l}×${t.h})`);

if (vides.length || debordent.length || menus.length) process.exit(1);
