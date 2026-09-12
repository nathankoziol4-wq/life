/**
 * Les sept coiffures, capturées **dans le vrai jeu**.
 *
 * L'atelier (`portrait-atelier.mjs`) rend le composant isolé sur fond blanc :
 * c'est ce qu'il faut pour mettre un tracé au point, mais ça ne dit pas à quoi
 * ressemble le portrait *posé dans l'interface* — dans le médaillon de
 * l'en-tête à 46 points, sur la surface de la fiche à 84.
 *
 * Ce fichier ne simule rien : il construit le paquet, le sert, et pilote
 * l'écran de création comme le ferait un doigt — il touche la ligne « La
 * coiffure » jusqu'à tomber sur celle qu'il cherche, commence la vie, et
 * capture. Ce qu'on voit est ce que le joueur verra.
 *
 *   node tools/portrait-coiffures.mjs
 */

import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import { findChromium } from './chromium.mjs';

const PORT = 4174;
const HERE = new URL('..', import.meta.url).pathname;
const SHOTS = new URL('../captures/jeu', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const COIFFURES = ['courts', 'mi-longs', 'longs', 'bouclés', 'crépus', 'ondulés', 'raides'];

execFileSync('npx', ['vite', 'build'], { cwd: HERE, stdio: 'ignore' });

/* Le port doit être libre : `vite preview` sur un port pris en choisit un
   autre en silence, et l'on capturerait alors le jeu d'une autre exécution. */
await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', () => reject(new Error(`Le port ${PORT} est déjà pris.`)));
  probe.once('listening', () => probe.close(() => resolve()));
  probe.listen(PORT, '127.0.0.1');
});
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', cwd: HERE, detached: true,
});
const stop = () => { try { process.kill(-server.pid, 'SIGKILL'); } catch { /* déjà arrêté */ } };
process.on('exit', stop);
await new Promise((r) => setTimeout(r, 3000));

const executablePath = findChromium();
const browser = await chromium.launch(executablePath ? { executablePath } : {});

/** Fait tourner une ligne du visage jusqu'à la valeur voulue. */
async function reglerLigne(page, intitule, voulue, tours = 14) {
  for (let i = 0; i < tours; i += 1) {
    const ligne = page.locator('button[data-row]').filter({ hasText: intitule }).first();
    if (!(await ligne.count())) return false;
    const texte = (await ligne.innerText()).replace(/\s+/g, ' ');
    if (texte.includes(voulue)) return true;
    await ligne.scrollIntoViewIfNeeded();
    await ligne.click();
    await page.waitForTimeout(160);
  }
  return false;
}

const resultats = [];

for (const coiffure of COIFFURES) {
  const page = await browser.newPage({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  const erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', (e) => erreurs.push(e.message));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.getByText('Choisir son point de départ').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Détaillé' }).click({ force: true });
  await page.waitForTimeout(300);

  const posee = await reglerLigne(page, /La coiffure/, coiffure);
  /* Le teint et la couleur restent tirés au sort : sept portraits identiques
     à la coiffure près montreraient la coiffure, pas le jeu. */

  /* L'écran de création est un panneau posé sur l'accueil : le bouton de
     départ est dessous, et il faut refermer le panneau pour l'atteindre. Le
     réglage, lui, reste en mémoire. */
  await page.locator('.sheet-back').last().click({ force: true });
  await page.waitForTimeout(400);
  await page.getByText('Commencer une nouvelle vie').click();
  await page.waitForTimeout(600);

  /* Les modales de naissance masquent l'en-tête : on les ferme avant de
     capturer, sinon le médaillon est sous un voile. */
  for (let i = 0; i < 25; i += 1) {
    if (!(await page.locator('.overlay').count())) break;
    const choix = page.locator('.overlay .choice').first();
    if (await choix.count()) { await choix.click({ force: true }); await page.waitForTimeout(120); continue; }
    const suite = page.locator('.overlay').getByRole('button', { name: 'Continuer' });
    if (await suite.count()) { await suite.click({ force: true }); await page.waitForTimeout(120); continue; }
    await page.locator('.overlay').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(120);
  }

  const nom = coiffure.replace('é', 'e');
  const entete = page.locator('.app-header').first();
  const cible = `${SHOTS}/${nom}.png`;
  if (await entete.count()) await entete.screenshot({ path: cible });
  else await page.screenshot({ path: cible });

  /*
   * Le médaillon de l'en-tête est un disque de 46 points : il **coupe** tout
   * ce qui dépasse du cercle, donc les coiffures longues y sont tronquées et
   * se ressemblent toutes. La fiche montre le portrait à 84 points sans
   * découpe — c'est là qu'une coiffure se lit.
   */
  await page.getByLabel('Profil complet').click({ force: true });
  await page.waitForTimeout(500);
  const fiche = page.locator('.profile-card, .sheet-body').first();
  if (await fiche.count()) await fiche.screenshot({ path: `${SHOTS}/${nom}-fiche.png` });

  resultats.push({ coiffure, posee, erreurs: erreurs.length });
  console.log(`${coiffure} — réglée : ${posee} · ${erreurs.length ? `⚠ ${erreurs.length} erreur(s)` : 'aucune erreur'} → ${cible}`);
  await page.close();
}

await browser.close();

/* Garde-fou du garde-fou : si aucune ligne ne s'est réglée, la capture montre
   sept fois la même coiffure tirée au hasard, et le résultat serait crédible. */
const posees = resultats.filter((r) => r.posee).length;
console.log(posees === COIFFURES.length
  ? `✓ les ${posees} coiffures ont bien été posées`
  : `⚠ seules ${posees} coiffures sur ${COIFFURES.length} ont pu être posées : les autres captures montrent un tirage`);
