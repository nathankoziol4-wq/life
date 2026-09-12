/**
 * Le portrait à plusieurs âges, capturé dans le vrai jeu.
 *
 * **Pourquoi il existe.** Le jeu choisit entre deux sources de portrait : les
 * images dessinées quand l'une ressemble au personnage, le tracé vectoriel
 * sinon. La bascule dépend de l'âge — les images ne couvrent aujourd'hui
 * qu'une tranche — et c'est exactement le genre de règle qu'on croit tenir
 * jusqu'à ce qu'on la regarde.
 *
 * Il mène une seule vie et la capture à plusieurs âges. Ce qu'on voit est ce
 * que le joueur verra, pas un rendu de composant isolé.
 *
 *   node tools/portrait-ages.mjs [5 14 30 50 70]
 */

import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import { findChromium } from './chromium.mjs';

const AGES = process.argv.slice(2).map(Number).filter((n) => n > 0);
const PALIERS = AGES.length ? AGES : [5, 14, 30, 50, 70];
const PORT = 4176;
const HERE = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../captures/ages', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

execFileSync('npx', ['vite', 'build'], { cwd: HERE, stdio: 'ignore' });
await new Promise((ok, ko) => {
  const s = createServer();
  s.once('error', () => ko(new Error(`Le port ${PORT} est déjà pris.`)));
  s.once('listening', () => s.close(ok));
  s.listen(PORT, '127.0.0.1');
});
const serveur = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', cwd: HERE, detached: true,
});
process.on('exit', () => { try { process.kill(-serveur.pid, 'SIGKILL'); } catch { /* déjà arrêté */ } });
await new Promise((r) => setTimeout(r, 3000));

const navigateur = await chromium.launch({ executablePath: findChromium() });
const page = await navigateur.newPage({
  viewport: { width: 360, height: 800 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true,
});
const erreurs = [];
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
page.on('pageerror', (e) => erreurs.push(e.message));

/** Répondre à tout ce qui se présente : sans ça l'en-tête reste sous un voile. */
async function repondre() {
  for (let i = 0; i < 30; i += 1) {
    if (!(await page.locator('.overlay').count())) return;
    const choix = page.locator('.overlay .choice').first();
    if (await choix.count()) { await choix.click({ force: true }); await page.waitForTimeout(70); continue; }
    const suite = page.locator('.overlay').getByRole('button', { name: 'Continuer' });
    if (await suite.count()) { await suite.click({ force: true }); await page.waitForTimeout(70); continue; }
    await page.locator('.overlay').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(70);
  }
}

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.getByText('Choisir son point de départ').click();
await page.waitForTimeout(400);
await page.locator('.sheet-back').last().click({ force: true });
await page.waitForTimeout(300);
await page.getByText('Commencer une nouvelle vie').click();
await page.waitForTimeout(600);
await repondre();

let age = 0;
const vus = [];
for (const cible of PALIERS) {
  while (age < cible) {
    /*
     * Le bouton d'année s'appelle « Prendre un an » — c'est son intitulé
     * d'accessibilité, pas le texte visible. Un premier jet le cherchait par
     * « ANNÉE », ne le trouvait jamais, et capturait cinq fois le même
     * nouveau-né sans que rien ne le signale.
     */
    const suivant = page.getByLabel('Prendre un an');
    if (!(await suivant.count())) break;
    await suivant.click({ force: true });
    await page.waitForTimeout(110);
    await repondre();
    age += 1;
  }
  const entete = page.locator('.app-header').first();
  if (!(await entete.count())) break;
  const lu = (await entete.innerText()).match(/(\d+)\s*ans?/);
  const reel = lu ? Number(lu[1]) : age;
  await entete.screenshot({ path: `${SHOTS}/${String(reel).padStart(2, '0')}-ans.png` });
  vus.push(reel);
  console.log(`${reel} ans → ${SHOTS}/${String(reel).padStart(2, '0')}-ans.png`);
  if (reel < cible) { console.log('la vie s’est arrêtée avant les paliers suivants'); break; }
}

await navigateur.close();
/* Garde-fou : si l'âge n'avance pas, on capture le même nouveau-né à chaque
   palier, et la planche reste parfaitement crédible. */
console.log(new Set(vus).size === vus.length && vus.length > 1
  ? `✓ ${vus.length} âges distincts capturés : ${vus.join(', ')}`
  : `⚠ les âges capturés ne sont pas distincts (${vus.join(', ')}) : le personnage n’a pas vieilli`);
console.log(erreurs.length ? `⚠ ${erreurs.length} erreur(s) console` : '✓ aucune erreur console');
