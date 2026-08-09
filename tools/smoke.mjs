/**
 * Test de fumée : joue une vie entière dans un vrai navigateur et vérifie
 * qu'aucune erreur n'apparaît en console. Lance lui-même `vite preview`.
 *
 *   npm run smoke
 */

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
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
rmSync(SHOTS, { recursive: true, force: true });
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
 * Ouvre un panneau s'il est proposé, le photographie, puis le referme.
 *
 * Tout est conditionnel : manquer de respect peut faire exclure l'élève, une
 * candidature peut échouer, et l'écran n'a alors rien à montrer. Ce sont de
 * vrais résultats de jeu, pas des pannes.
 */
async function openPanel(name, shot, andThen) {
  await clearEvents();
  const row = page.getByRole('button', { name });
  if (!(await row.count())) { console.log('panneau absent :', String(name)); return false; }
  // Surtout pas de clic forcé : la barre de navigation est fixée en bas de
  // l'écran, et un clic forcé sur une ligne cachée derrière elle atterrit sur
  // l'onglet, qui se referme. On fait défiler, puis on clique normalement.
  await row.first().scrollIntoViewIfNeeded();
  await row.first().click();
  await page.waitForTimeout(280);
  // Une action peut avoir ouvert une modale : on la solde avant de
  // photographier, sinon la capture ne montre que le voile.
  await clearEvents();
  if (!(await page.locator('.sheet').count())) console.log('panneau non ouvert :', String(name));
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

// Enfance : demander quelque chose à ses parents n'a de sens qu'avant vingt ans.
await ageBy(12);
await tap(page.getByRole('button', { name: /Proches/ }));
const parentRow = page.locator('.app-body button.row').filter({ hasText: /Père|Mère/ }).first();
if (await parentRow.count()) {
  await parentRow.scrollIntoViewIfNeeded();
  await parentRow.click();
  await page.waitForTimeout(280);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/02a-parent.png`, fullPage: true });

  const request = page.locator('.sheet button.row').filter({ hasText: /téléphone|ordinateur|animal|activité|Rentrer plus tard|argent de poche/ }).first();
  if (await request.count()) {
    await request.scrollIntoViewIfNeeded();
    await request.click();
    await page.waitForTimeout(320);
    await page.screenshot({ path: `${SHOTS}/02b-demande.png` });
    await clearEvents();
  }
  await closeSheet();
}
await closeAllSheets();

// Adolescence : c'est là que la vie scolaire a quelque chose à montrer.
await ageBy(3);
await tap(page.getByRole('button', { name: /Parcours/ }));
const enterSchool = page.getByRole('button', { name: /Entrer dans l’établissement/ });
if (await enterSchool.count()) {
  await enterSchool.click({ force: true });
  await page.waitForTimeout(280);
  await page.screenshot({ path: `${SHOTS}/03a-ecole.png`, fullPage: true });

  // Les camarades, puis la fiche du premier d'entre eux et une vraie action.
  await openPanel(/^🧑‍🤝‍🧑 Camarades/, '03b-camarades.png', async () => {
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
  await openPanel(/Professeurs et direction/, '03d-professeurs.png', async () => {
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

  await openPanel(/Clubs et activités/, '03f-clubs.png');
  await openPanel(/Groupes de la classe/, '03g-groupes.png');

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
  // Un entretien manqué est un résultat de jeu normal ; on en tente
  // plusieurs pour que la suite du parcours ait un emploi à montrer.
  for (let i = 0; i < Math.min(n, 5); i++) {
    const row = page.locator('.sheet-body button.row:not(.disabled)').nth(0);
    if (!(await row.count())) break;
    await row.click({ force: true });
    await page.waitForTimeout(200);
    await clearEvents();
    if (!(await page.getByLabel('Profil complet').count())) break;
    const header = await page.locator('.header-sub').first().innerText().catch(() => '');
    if (!header.includes('Sans emploi') && !header.includes('Étudiant')) break;
  }
  const back = page.getByLabel('Retour');
  if (await back.count()) { await tap(back); }
}
await page.screenshot({ path: `${SHOTS}/06-parcours-apres.png` });

// Le bureau, si le personnage travaille déjà.
await openPanel(/Entrer au bureau/, '04a-bureau.png', async () => {
  if (!(await topRow().count())) return;
  // La dernière ligne de l'écran est un membre de l'équipe.
  const member = page.locator('.sheet').last().locator('button.row').last();
  await member.click({ force: true });
  await page.waitForTimeout(280);
  await page.screenshot({ path: `${SHOTS}/04b-collegue.png`, fullPage: true });
  const advice = page.getByRole('button', { name: /Demander conseil sur le métier/ });
  if (await advice.count()) {
    await advice.first().click({ force: true });
    await page.waitForTimeout(320);
    await clearEvents();
  }
  await closeSheet();
});


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

// Le vol à la tire : le premier vrai mini-jeu. On le joue pour de bon,
// c'est-à-dire qu'on approche la main et qu'on maintient l'appui.
await openPanel(/Activités illégales/, '12a-illegal.png', async () => {
  const row = page.getByRole('button', { name: /Vol à la tire/ }).first();
  if (!(await row.count())) return;
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/12b-cibles.png`, fullPage: true });

  const target = page.locator('.sheet').last().locator('button.row').first();
  if (await target.count()) {
    await target.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/12c-minijeu.png` });

    // Jouer : approcher la main d'une poche et maintenir l'appui.
    const surface = page.locator('.minigame-surface');
    if (await surface.count()) {
      const box = await surface.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.85);
        await page.mouse.down();
        for (let i = 0; i < 12; i++) {
          await page.mouse.move(
            box.x + box.width * (0.5 + i * 0.002),
            box.y + box.height * (0.85 - i * 0.03),
          );
          await page.waitForTimeout(60);
        }
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${SHOTS}/12d-en-cours.png` });
        await page.mouse.up();
      }
    }
    // On laisse la partie se terminer, puis on solde la modale de résultat.
    await page.waitForTimeout(1200);
    await clearEvents();
  }

  // Le vol à la tire a empilé ses propres panneaux par-dessus celui-ci : on
  // redescend jusqu'à la liste des activités, sinon le clic suivant atterrit
  // sur la surface du mini-jeu précédent.
  for (let i = 0; i < 4 && (await page.locator('.sheet').count()) > 1; i++) await closeSheet();

  // Quelques petits coups pour faire pencher la balance : le cambriolage
  // demande un minimum de métier, et un vol à la tire réussi n'y suffit pas
  // toujours. Un délit ne se retente pas dans l'année, alors on en tente
  // trois différents. On ne force rien au-delà — un personnage encore trop
  // novice est un vrai résultat de jeu, et la suite s'en accommode.
  for (const name of [/Vol à l’étalage/, /Dégradation/, /Petite arnaque/]) {
    const petty = page.getByRole('button', { name });
    if (!(await petty.count())) continue;
    await petty.first().scrollIntoViewIfNeeded();
    await petty.first().click();
    await page.waitForTimeout(180);
    await clearEvents();
  }

  // Le cambriolage, dans la foulée : il est plus long, et il peut déboucher
  // sur une fuite. On le joue assez pour vérifier que les trois phases
  // s'enchaînent — choix de la maison, exploration, course éventuelle.
  const burglary = page.getByRole('button', { name: /Cambriolage/ }).first();
  if (!(await burglary.count())) console.log('cambriolage encore hors de portée');
  else {
    await burglary.scrollIntoViewIfNeeded();
    await burglary.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/12e-maisons.png`, fullPage: true });

    const house = page.locator('.sheet').last().locator('button.row').first();
    if (await house.count()) {
      await house.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/12f-cambriolage.png` });

      // On traverse la maison en visant quelques points successifs : le
      // plan est tiré au sort, on ne peut pas viser une pièce précise.
      const plan = page.locator('.minigame-surface');
      if (await plan.count()) {
        const box = await plan.boundingBox();
        if (box) {
          for (const [fx, fy] of [[0.5, 0.3], [0.8, 0.5], [0.3, 0.7], [0.5, 0.9]]) {
            await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
            await page.mouse.down();
            await page.waitForTimeout(700);
            await page.mouse.up();
          }
          await page.screenshot({ path: `${SHOTS}/12g-en-cours.png` });
          // Si la partie a basculé sur la fuite, on court vers une sortie.
          await page.waitForTimeout(600);
          for (let i = 0; i < 10; i++) {
            await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.12);
            await page.mouse.down();
            await page.waitForTimeout(300);
            await page.mouse.up();
          }
          await page.screenshot({ path: `${SHOTS}/12h-fuite.png` });
        }
      }
      await page.waitForTimeout(1200);
      await clearEvents();
    }
  }
});
await closeAllSheets();

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
