/**
 * Capture la page d'atelier dans un vrai navigateur.
 *
 * On ne juge pas un dessin en relisant ses coordonnées. Les douze défauts du
 * portrait trouvés jusqu'ici — la mèche qui couvrait les sourcils, le halo qui
 * rendait le personnage chauve, le nez qui se lisait comme une cicatrice — ont
 * tous été vus sur un rendu.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { findChromium } from './chromium.mjs';

const OUT = '/home/user/life/captures';
mkdirSync(OUT, { recursive: true });

const navigateur = await chromium.launch({ executablePath: findChromium() });
const p = await navigateur.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
const erreurs = [];
p.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
await p.goto(`file://${OUT}/atelier.html`);

for (const [nom, selecteur] of [
  ['atelier-grand', '.rang:nth-of-type(1)'],
  ['atelier-coiffures', '.rang:nth-of-type(2)'],
  ['atelier-humeurs', '.rang:nth-of-type(3)'],
  ['atelier-teints', '.rang:nth-of-type(4)'],
  ['atelier-barbes', '.rang:nth-of-type(5)'],
  ['atelier-ages-h', '.rang:nth-of-type(6)'],
  ['atelier-ages-f', '.rang:nth-of-type(7)'],
  ['atelier-tailles', '.rang:nth-of-type(8)'],
]) {
  const cible = p.locator(selecteur);
  if (!(await cible.count())) { console.log(`${nom} : introuvable`); continue; }
  await cible.screenshot({ path: `${OUT}/${nom}.png` });
  console.log(`${nom} → ${OUT}/${nom}.png`);
}

/**
 * Garde-fou : un `d` mal formé est ignoré en silence par SVG. Un tracé de
 * longueur nulle ne se voit pas sur une capture d'ensemble — il se mesure.
 */
const morts = await p.evaluate(() => {
  const out = [];
  for (const path of document.querySelectorAll('svg path')) {
    const l = path.getTotalLength();
    if (l < 4) out.push(`${path.getAttribute('class') ?? '(sans classe)'} : ${l.toFixed(1)}`);
  }
  return out;
});
console.log(morts.length ? `⚠ tracés morts : ${morts.join(' | ')}` : '✓ aucun tracé mort');
console.log(erreurs.length ? `⚠ ${erreurs.length} erreur(s) console : ${erreurs.join(' | ')}` : '✓ aucune erreur console');
await navigateur.close();
