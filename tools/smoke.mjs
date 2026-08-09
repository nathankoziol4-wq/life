/**
 * Test de fumée : joue une vie entière dans un vrai navigateur et vérifie
 * qu'aucune erreur n'apparaît en console. Lance lui-même `vite preview`.
 *
 *   npm run smoke
 */

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4173;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
  stdio: 'ignore',
  cwd: new URL('..', import.meta.url).pathname,
});
const stop = () => { try { server.kill(); } catch { /* déjà arrêté */ } };
process.on('exit', stop);
await new Promise((r) => setTimeout(r, 3000));

const SHOTS = process.env.SHOTS_DIR ?? new URL('../.smoke', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const errors = [];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${SHOTS}/01-accueil.png` });

// Écran de création, en mode détaillé : c'est là que vivent les curseurs de
// tempérament et les réglages fins de l'environnement.
await page.getByText('Choisir son point de départ').click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Détaillé' }).click({ force: true });
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}/01a-creation.png`, fullPage: true });

// Bouger un curseur de tempérament et vérifier que l'aperçu suit.
const slider = page.locator('.slider .range').first();
await slider.fill('88');
await page.waitForTimeout(250);
await page.screenshot({ path: `${SHOTS}/01b-creation-temperament.png` });

// L'aperçu d'exposition : ce que ce départ met à portée de l'enfant.
await page.getByText('Ce que ce départ met à sa portée').scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.screenshot({ path: `${SHOTS}/01c-creation-exposition.png` });

await page.locator('.sheet-back').last().click({ force: true });
await page.waitForTimeout(300);

// Nouvelle vie
await page.getByText('Commencer une nouvelle vie').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}/02-naissance.png` });

// Fonction : répondre aux événements en attente
async function clearEvents(max = 25) {
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('.overlay').count())) return;
    const choice = page.locator('.overlay .choice').first();
    if (await choice.count()) { await choice.click({ force: true }); await page.waitForTimeout(90); continue; }
    const cont = page.locator('.overlay').getByRole('button', { name: 'Continuer' });
    if (await cont.count()) { await cont.click({ force: true }); await page.waitForTimeout(90); continue; }
    // Modale d'information sans bouton : on ferme par l'arrière-plan.
    await page.locator('.overlay').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(90);
  }
}
/** Clique en s'assurant qu'aucune modale ne bloque. */
async function tap(locator) {
  await clearEvents();
  await locator.click();
  await page.waitForTimeout(200);
}

/**
 * Ferme le panneau le plus haut de la pile.
 *
 * Les fiches s'empilent (profil → caractère → trajectoire) : viser « le
 * bouton Retour » tout court devient ambigu dès le deuxième niveau.
 */
async function closeSheet() {
  await clearEvents();
  const back = page.locator('.sheet-back');
  if (await back.count()) {
    await back.last().click({ force: true });
    await page.waitForTimeout(260);
  }
}

/** Referme toute la pile de panneaux. */
async function closeAllSheets(max = 5) {
  for (let i = 0; i < max && (await page.locator('.sheet').count()); i++) await closeSheet();
}

/** Première ligne cliquable du panneau le plus haut. */
function topRow() {
  return page.locator('.sheet').last().locator('button.row').first();
}

/**
 * Ouvre un panneau de l'école s'il est proposé.
 *
 * Tout est conditionnel : manquer de respect peut faire exclure l'élève, et
 * l'écran n'a alors plus rien à montrer. C'est un vrai résultat de jeu.
 */
async function openSchoolPanel(name, shot, andThen) {
  const row = page.getByRole('button', { name });
  if (!(await row.count())) return false;
  await row.first().click({ force: true });
  await page.waitForTimeout(280);
  await page.screenshot({ path: `${SHOTS}/${shot}` });
  if (andThen) await andThen();
  await closeSheet();
  return true;
}

/** Avance de `n` années en répondant à tout ce qui se présente. */
async function ageBy(n) {
  for (let year = 0; year < n; year++) {
    await clearEvents();
    await page.getByLabel('Prendre un an').click({ force: true });
    await page.waitForTimeout(90);
    await clearEvents();
  }
}

// Adolescence : c'est là que la vie scolaire a quelque chose à montrer.
await ageBy(15);
await tap(page.getByRole('button', { name: /Parcours/ }));
const enterSchool = page.getByRole('button', { name: /Entrer dans l’établissement/ });
if (await enterSchool.count()) {
  await enterSchool.click({ force: true });
  await page.waitForTimeout(280);
  await page.screenshot({ path: `${SHOTS}/03a-ecole.png`, fullPage: true });

  // Les camarades, puis la fiche du premier d'entre eux et une vraie action.
  await openSchoolPanel(/^🧑‍🤝‍🧑 Camarades/, '03b-camarades.png', async () => {
    if (!(await topRow().count())) return;
    await topRow().click({ force: true });
    await page.waitForTimeout(280);
    await page.screenshot({ path: `${SHOTS}/03c-camarade.png`, fullPage: true });
    const tease = page.getByRole('button', { name: /Taquiner/ });
    if (await tease.count()) {
      await tease.first().click({ force: true });
      await page.waitForTimeout(320);
      await clearEvents();
    }
    await closeSheet();
  });

  // Le personnel, et l'insolence — dont la sanction dépend du dossier.
  await openSchoolPanel(/Professeurs et direction/, '03d-professeurs.png', async () => {
    if (!(await topRow().count())) return;
    await topRow().click({ force: true });
    await page.waitForTimeout(280);
    await page.screenshot({ path: `${SHOTS}/03e-professeur.png`, fullPage: true });
    const rude = page.getByRole('button', { name: /Manquer de respect/ });
    if (await rude.count()) {
      await rude.first().click({ force: true });
      await page.waitForTimeout(320);
      await clearEvents();
    }
    await closeSheet();
  });

  await openSchoolPanel(/Clubs et activités/, '03f-clubs.png');
  await openSchoolPanel(/Groupes de la classe/, '03g-groupes.png');

  const skip = page.getByRole('button', { name: /Sécher les cours/ });
  if (await skip.count()) {
    await skip.first().click({ force: true });
    await page.waitForTimeout(320);
    await clearEvents();
  }
}
await closeAllSheets();

await ageBy(7);
await page.screenshot({ path: `${SHOTS}/03-timeline-22ans.png`, fullPage: false });

const age = await page.locator('.header-sub').first().innerText();
console.log('Après 22 années :', age.replace(/\n/g, ' '));

// Onglet Parcours
await tap(page.getByRole('button', { name: /Parcours/ }));
await page.screenshot({ path: `${SHOTS}/04-parcours.png` });

// Offres d'emploi
const offers = page.getByText('Consulter les offres d’emploi');
if (await offers.count()) {
  await tap(offers);
  await page.screenshot({ path: `${SHOTS}/05-offres.png` });
  // Postuler à la première offre non bloquée
  const rows = page.locator('.sheet-body button.row:not(.disabled)');
  const n = await rows.count();
  console.log('Offres accessibles :', n);
  if (n > 0) { await tap(rows.first()); await clearEvents(); }
  const back = page.getByLabel('Retour');
  if (await back.count()) { await tap(back); }
}
await page.screenshot({ path: `${SHOTS}/06-parcours-apres.png` });

// Onglet Avoirs
await tap(page.getByRole('button', { name: /Avoirs/ }));
await page.screenshot({ path: `${SHOTS}/07-avoirs.png` });
await tap(page.getByText('Marché immobilier'));
await page.screenshot({ path: `${SHOTS}/08-immobilier.png` });
await tap(page.getByLabel('Retour'));

// Onglet Proches
await tap(page.getByRole('button', { name: /Proches/ }));
await page.screenshot({ path: `${SHOTS}/09-proches.png` });
const firstPerson = page.locator('.app-body button.row').first();
if (await firstPerson.count()) {
  await tap(firstPerson);
  await page.screenshot({ path: `${SHOTS}/10-fiche-pnj.png` });
  const talk = page.getByText('Discuter');
  if (await talk.count()) { await tap(talk); await clearEvents(); }
  await page.screenshot({ path: `${SHOTS}/11-interaction.png` });
  const back = page.getByLabel('Retour');
  if (await back.count()) await tap(back);
}

// Onglet Agenda
await tap(page.getByRole('button', { name: /Agenda/ }));
await page.screenshot({ path: `${SHOTS}/12-agenda.png` });
await tap(page.getByText('Sport', { exact: true }));
await page.screenshot({ path: `${SHOTS}/13-sport.png` });
const sportRow = page.locator('.sheet-body button.row:not(.disabled)').first();
if (await sportRow.count()) { await tap(sportRow); await clearEvents(); }
await tap(page.getByLabel('Retour'));

// Profil, puis la fiche de caractère et la trajectoire.
await tap(page.getByLabel('Profil complet'));
await page.screenshot({ path: `${SHOTS}/14-profil.png` });

await tap(page.getByText('Fiche de caractère'));
await page.screenshot({ path: `${SHOTS}/14a-caractere.png`, fullPage: true });
for (const view of ['Ce qu’il vit', 'Tout']) {
  await page.getByRole('button', { name: view }).click({ force: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/14b-caractere-${view === 'Tout' ? 'tout' : 'vie'}.png`, fullPage: true });
}
await closeSheet();

await tap(page.getByText('Trajectoire', { exact: true }));
// Ouvrir la première question posable : c'est là que la chaîne de causes
// s'affiche, donc l'endroit qu'il faut vraiment avoir rendu au moins une fois.
const question = page.locator('.sheet .sheet-body button.row').last();
if (await question.count()) await question.click({ force: true });
await page.waitForTimeout(250);
await page.screenshot({ path: `${SHOTS}/14c-trajectoire.png`, fullPage: true });
await closeSheet();

await closeSheet();

// Vieillir jusqu'à la mort
let died = false;
for (let i = 0; i < 110; i++) {
  await clearEvents();
  const btn = page.getByLabel('Prendre un an');
  if (!(await btn.count())) { died = true; break; }
  await btn.click({ force: true });
  await page.waitForTimeout(60);
  await clearEvents();
  if (await page.getByText('Score de vie').count()) { died = true; break; }
}
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOTS}/15-recapitulatif.png`, fullPage: true });
console.log('Mort atteinte :', died);
if (died) {
  const name = await page.locator('.summary-name').innerText().catch(() => '?');
  const dates = await page.locator('.summary-dates').innerText().catch(() => '?');
  const cause = await page.locator('.summary-cause').innerText().catch(() => '?');
  console.log(`Résumé : ${name} — ${dates} — ${cause}`);
}

console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'Aucune erreur console.');
await browser.close();
stop();
process.exit(errors.length ? 1 : 0);
