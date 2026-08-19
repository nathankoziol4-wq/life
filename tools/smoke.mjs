/**
 * Test de fumée : joue une vie entière dans un vrai navigateur et vérifie
 * qu'aucune erreur n'apparaît en console. Lance lui-même `vite preview`.
 *
 *   npm run smoke
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
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

/**
 * Comment chaque titre s'écrit à l'écran.
 *
 * Le fumigène ne peut pas importer `data/royalty.ts` — il tourne sur le
 * paquet construit, pas sur les sources — donc la correspondance est ici,
 * mais elle part du titre réellement porté et non d'une liste d'espoirs.
 */
const TITLE_WORDS = {
  baron: 'Baron|Baronne',
  comte: 'Comte|Comtesse',
  duc: 'Duc|Duchesse',
  prince: 'Prince|Princesse',
  souverain: 'Souverain|Souveraine|Roi|Reine',
};

/**
 * Trouver un navigateur, sans obliger l'appelant à s'en souvenir.
 *
 * Playwright cherche la version qu'attend *sa* version à lui, et cette
 * machine n'a pas forcément celle-là : `npm run smoke` échouait d'emblée
 * avec « Executable doesn't exist at …chromium_headless_shell-1234 » alors
 * qu'un chromium parfaitement utilisable était installé à côté. Le test de
 * fumée le plus complet du projet ne doit pas dépendre d'une variable
 * d'environnement qu'on oublie de poser.
 */
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  const wanted = ['chrome-linux/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell'];
  for (const dir of readdirSync(root).sort().reverse()) {
    for (const tail of wanted) {
      const guess = `${root}/${dir}/${tail}`;
      if (existsSync(guess)) return guess;
    }
  }
  return undefined;
}

const executablePath = findChromium();
if (!executablePath) console.log('aucun chromium trouvé : on laisse Playwright choisir');
const browser = await chromium.launch(executablePath ? { executablePath } : {});
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

// L'enveloppe des potentiels hérités : monter l'un doit être refusé tant
// qu'on n'a rien repris ailleurs. C'est toute la règle du système — sans
// elle, composer serait une liste de souhaits et non une décision.
{
  const plus = page.getByRole('button', { name: '+' });
  const moins = page.getByRole('button', { name: '−' });
  if (!(await plus.count())) console.log('héritage : boutons de répartition absents');
  else {
    const full = await plus.evaluateAll((els) => els.map((e) => e.disabled));
    await moins.first().click();
    await page.waitForTimeout(300);
    const freed = await plus.evaluateAll((els) => els.map((e) => e.disabled));
    console.log('héritage — enveloppe pleine au départ :', full.every(Boolean),
      '· un cran repris rouvre un choix :', freed.some((d) => !d));
    await page.screenshot({ path: `${SHOTS}/01d-creation-heritage.png`, fullPage: true });
  }
}

// Le visage : toucher une ligne la fait tourner, et l'aperçu suit. L'aperçu
// passe par le vrai générateur, donc ce qu'on voit là est ce qui naîtra.
{
  const hair = page.locator('button.row').filter({ hasText: /Les cheveux/ }).first();
  if (!(await hair.count())) console.log('visage : ligne « Les cheveux » absente');
  else {
    const before = (await hair.innerText()).replace(/\s+/g, ' ');
    await hair.scrollIntoViewIfNeeded();
    await hair.click();
    await page.waitForTimeout(300);
    const after = (await page.locator('button.row').filter({ hasText: /Les cheveux/ })
      .first().innerText()).replace(/\s+/g, ' ');
    console.log('visage — la ligne tourne :', before !== after);
    await page.screenshot({ path: `${SHOTS}/01e-creation-visage.png`, fullPage: true });
  }
}

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
/**
 * Va sur un onglet, ou n'en fait rien si l'on y est déjà.
 *
 * La barre de navigation *remplace* l'onglet actif : viser son bouton après y
 * être arrivé attend indéfiniment quelque chose qui n'existe plus.
 */
async function goTab(name) {
  await clearEvents();
  const tab = page.getByRole('button', { name });
  if (!(await tab.count())) return;
  // La barre a cinq destinations fixes depuis la refonte : le journal en est
  // une, et un onglet ne se transforme plus sous le doigt. Cliquer l'onglet
  // voulu suffit, qu'on y soit déjà ou non.
  await tab.first().click();
  await page.waitForTimeout(200);
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
await ageBy(8);

// La maison, avant l'école : c'est la période que l'audit avait trouvée vide.
await tap(page.getByRole('button', { name: /Parcours/ }));
await openPanel(/À la maison/, '02c-enfance.png', async () => {
  const outside = page.getByRole('button', { name: /Sortir voir qui est là/ }).first();
  if ((await outside.count()) && !(await outside.evaluate((el) => el.classList.contains('disabled')))) {
    await outside.scrollIntoViewIfNeeded();
    await outside.click();
    await page.waitForTimeout(220);
    await clearEvents();
  }
  const activity = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /histoire|Cuisiner|Jouer dehors|questions/ }).first();
  if (await activity.count()) {
    await activity.scrollIntoViewIfNeeded();
    await activity.click();
    await page.waitForTimeout(280);
    await page.screenshot({ path: `${SHOTS}/02d-avec-qui.png`, fullPage: true });
    const who = page.locator('.sheet').last().locator('button.row:not(.disabled)').first();
    if (await who.count()) {
      await who.click();
      await page.waitForTimeout(280);
      await clearEvents();
    }
  } else {
    console.log('aucune activité familiale accessible');
  }
});
await closeAllSheets();
await tap(page.getByRole('button', { name: /Vie/ }));

await ageBy(4);
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

// À son compte : c'est le seul endroit du jeu où l'on fixe un prix soi-même,
// et l'écran ne vaut que si les deux barres — ce que le tarif promet, ce que
// le travail livre — s'affichent réellement l'une sous l'autre.
// On est déjà sur « Parcours » : la barre de navigation remplace l'onglet
// actif par autre chose, et le rechercher ferait échouer le clic.
await closeAllSheets();
await openPanel(/Vendre ton temps toi-même|Ton métier|Petits services/, '04c-a-son-compte.png', async () => {
  const trade = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Petits travaux|Cours particuliers|Créations à vendre|Réparation/ }).first();
  if (!(await trade.count())) { console.log('aucun métier indépendant accessible'); return; }
  await trade.scrollIntoViewIfNeeded();
  await trade.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/04d-tarif.png`, fullPage: true });

  // Une commande, si le carnet en propose une : c'est la partie jouable.
  const gig = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /🟢|🟡|🔴/ }).first();
  if (await gig.count()) {
    await gig.scrollIntoViewIfNeeded();
    await gig.click();
    await page.waitForTimeout(320);
    await clearEvents();
  }

  // L'entreprise : le catalogue, puis la maison si on peut l'ouvrir.
  const tab = page.locator('.sheet').last().getByRole('button', { name: 'Ton entreprise' }).first();
  if (await tab.count()) {
    await tab.click();
    await page.waitForTimeout(280);
    await page.screenshot({ path: `${SHOTS}/04e-entreprise.png`, fullPage: true });
  }
});
await closeAllSheets();

// Quelques années de plus avant les avoirs : à vingt-deux ans on n'a
// généralement rien à placer, et l'écran de portefeuille n'aurait qu'une
// liste de refus à montrer.
await ageBy(8);

// Onglet Avoirs
await tap(page.getByRole('button', { name: /Avoirs/ }));
await page.screenshot({ path: `${SHOTS}/07-avoirs.png` });
await tap(page.getByText('Marché immobilier'));
await page.screenshot({ path: `${SHOTS}/08-immobilier.png` });
await tap(page.getByLabel('Retour'));

// Les placements : on ouvre le marché, on place, puis on revend une part.
// Le portefeuille est le seul écran du jeu où l'on peut perdre de l'argent
// en ne faisant rien, alors on vérifie qu'il s'affiche et qu'il répond.
await tap(page.getByText('Portefeuille'));
await page.screenshot({ path: `${SHOTS}/08a-placements.png`, fullPage: true });
const asset = page.locator('.sheet').last().locator('button.row:not(.disabled)')
  .filter({ hasText: /Livret|Fonds large|Obligations/ }).first();
if (await asset.count()) {
  await asset.scrollIntoViewIfNeeded();
  await asset.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/08b-achat.png` });
  const confirm = page.locator('.modal button').filter({ hasText: /Placer/ }).first();
  if (await confirm.count()) {
    await confirm.click();
    await page.waitForTimeout(300);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/08c-portefeuille.png`, fullPage: true });

    // Et la revente : c'est là que se voient les frais et l'impôt.
    const line = page.locator('.sheet').last().locator('button.row:not(.disabled)')
      .filter({ hasText: /placés/ }).first();
    if (await line.count()) {
      await line.scrollIntoViewIfNeeded();
      await line.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SHOTS}/08d-vente.png` });
      const sell = page.locator('.modal button').filter({ hasText: /Vendre/ }).first();
      if (await sell.count()) { await sell.click(); await page.waitForTimeout(300); await clearEvents(); }
    }
  }
} else {
  console.log('aucun placement accessible');
}
await closeAllSheets();

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

  // Le milieu : la chaleur, le carnet, les maisons. Il s'ouvre toujours,
  // même pour quelqu'un qui n'a jamais rien fait — c'est là qu'on lit
  // pourquoi tout le reste est fermé.
  const milieu = page.getByRole('button', { name: /chaleur/ }).first();
  if (await milieu.count()) {
    await milieu.scrollIntoViewIfNeeded();
    await milieu.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/12m-milieu.png`, fullPage: true });
    const join = page.getByRole('button', { name: /Se faire présenter/ }).first();
    if ((await join.count()) && !(await join.evaluate((el) => el.classList.contains('disabled')))) {
      await join.scrollIntoViewIfNeeded();
      await join.click();
      await page.waitForTimeout(250);
      await clearEvents();
    }
    const fence = page.getByRole('button', { name: /Receleur/ }).first();
    if ((await fence.count()) && !(await fence.evaluate((el) => el.classList.contains('disabled')))) {
      await fence.scrollIntoViewIfNeeded();
      await fence.click();
      await page.waitForTimeout(250);
      await clearEvents();
    }
    await page.screenshot({ path: `${SHOTS}/12n-milieu-apres.png`, fullPage: true });
    await closeSheet();
  } else {
    console.log('milieu introuvable');
  }


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

  // Aller au bout de la chaîne : commettre ce qui est à portée jusqu'à se
  // faire prendre. C'est le seul chemin vers la prison, et c'est celui qu'un
  // joueur emprunte.
  for (let i = 0; i < 4 && (await page.locator('.sheet').count()) > 1; i++) await closeSheet();
  for (const row of await page.locator('.sheet button.row:not(.disabled)').all()) {
    const label = await row.innerText().catch(() => '');
    if (!/Vol à l’étalage|Dégradation|Petite arnaque|Vol de véhicule|Vol avec violence/.test(label)) continue;
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await page.waitForTimeout(180);
    await clearEvents();
  }
});
await closeAllSheets();

// Le procès, s'il y en a un : sans avocat choisi, il ne se tient jamais et la
// prison reste hors d'atteinte.
await openPanel(/Procès/, '12i-proces.png', async () => {
  const lawyer = page.locator('.sheet').last().locator('button.row:not(.disabled)').first();
  if (await lawyer.count()) {
    await lawyer.scrollIntoViewIfNeeded();
    await lawyer.click();
    await page.waitForTimeout(400);
    await clearEvents();
  }
});
await closeAllSheets();

// La détention, si elle a lieu : l'écran, les codétenus, la préparation, et
// la traversée de la cour.
const jailed = await openPanel(/an\(s\) restants/, '12j-prison.png', async () => {
  const sheet = page.locator('.sheet').last();
  const observe = sheet.getByRole('button', { name: /Observer les rondes/ }).first();
  if (await observe.count()) {
    await observe.scrollIntoViewIfNeeded();
    await observe.click();
    await page.waitForTimeout(220);
    await clearEvents();
  }

  const attempt = sheet.getByRole('button', { name: /Tenter cette nuit/ }).first();
  if ((await attempt.count()) && !(await attempt.evaluate((el) => el.classList.contains('disabled')))) {
    await attempt.scrollIntoViewIfNeeded();
    await attempt.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/12k-cour.png` });

    const yard = page.locator('.minigame-surface');
    if (await yard.count()) {
      const box = await yard.boundingBox();
      if (box) {
        // On remonte vers le périmètre par petits sauts, sans courir : c'est
        // la bonne façon de jouer, et elle suffit à animer la scène.
        for (const fy of [0.75, 0.6, 0.45, 0.3, 0.15, 0.05]) {
          await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * fy);
          await page.mouse.down();
          await page.waitForTimeout(60);
          await page.mouse.up();
          await page.waitForTimeout(600);
        }
        await page.screenshot({ path: `${SHOTS}/12l-traversee.png` });
      }
    }
    await page.waitForTimeout(1200);
    await clearEvents();
  }
});
if (!jailed) console.log('le personnage n’a pas fini en prison cette fois');
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

/* ------------------------------------------------------------------ */
/* Le portefeuille, depuis une partie fabriquée                        */
/* ------------------------------------------------------------------ */

// Une vie ordinaire n'a presque rien de côté à trente ans : l'écran de
// placements n'aurait qu'une liste de refus à montrer. On repart d'une vie
// jouée par le vrai moteur jusqu'à quarante-cinq ans, choisie parce qu'elle
// a réellement accumulé quelque chose.
const loadSave = async (fixture) => {
  const save = execFileSync(
    'node',
    ['--experimental-strip-types', new URL(fixture, import.meta.url).pathname],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  await page.evaluate((raw) => { localStorage.setItem('odyssia.save.v1', raw); }, save);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await clearEvents();
};

await loadSave('fixture-investor.mjs');
await tap(page.getByRole('button', { name: /Avoirs/ }));
await tap(page.getByText('Portefeuille'));
await page.screenshot({ path: `${SHOTS}/17-placements.png`, fullPage: true });

const buyable = page.locator('.sheet').last().locator('button.row:not(.disabled)')
  .filter({ hasText: /Livret|Fonds large|Obligations|Métal/ });
const wanted = Math.min(3, await buyable.count());
for (let i = 0; i < wanted; i++) {
  // On répartit sur plusieurs lignes : c'est la mécanique centrale de
  // l'écran, et elle ne s'affiche qu'à partir de deux positions.
  const row = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Livret|Fonds large|Obligations|Métal/ }).nth(i);
  if (!(await row.count())) break;
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(250);
  if (i === 0) await page.screenshot({ path: `${SHOTS}/17a-achat.png` });
  const confirm = page.locator('.overlay button').filter({ hasText: /Placer/ }).first();
  if (await confirm.count()) {
    await confirm.click();
    await page.waitForTimeout(250);
  }
  await clearEvents();
}
await page.screenshot({ path: `${SHOTS}/17b-portefeuille.png`, fullPage: true });

// La revente : c'est là que se voient les frais et l'impôt.
const line = page.locator('.sheet').last().locator('button.row:not(.disabled)')
  .filter({ hasText: /placés/ }).first();
if (await line.count()) {
  await line.scrollIntoViewIfNeeded();
  await line.click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/17c-vente.png` });
  const sell = page.locator('.overlay button').filter({ hasText: /Vendre/ }).first();
  if (await sell.count()) { await sell.click(); await page.waitForTimeout(300); }
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/17d-apres-vente.png`, fullPage: true });
} else {
  console.log('aucune ligne à revendre');
}
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* Le milieu installé, depuis une partie fabriquée                     */
/* ------------------------------------------------------------------ */

// Une vie ordinaire n'entre jamais dans une organisation criminelle : la
// moitié « maison » de l'écran — rang, respect, territoire, missions — ne
// serait jamais ouverte. La vie est jouée par le vrai moteur et l'admission
// passe par le vrai tirage ; on retente simplement chaque année.
await loadSave('fixture-crook.mjs');
await tap(page.getByRole('button', { name: /Agenda/ }));
const grey = await openPanel(/Activités illégales/, '18-illegal.png', async () => {
  const milieu = page.getByRole('button', { name: /chaleur/ }).first();
  if (!(await milieu.count())) { console.log('milieu introuvable'); return; }
  await milieu.scrollIntoViewIfNeeded();
  await milieu.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/18a-maison.png`, fullPage: true });

  // Une mission : on l'ouvre, on la lit, et on y va.
  const mission = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /tournée|paquet|comprendre/ }).first();
  if (await mission.count()) {
    await mission.scrollIntoViewIfNeeded();
    await mission.click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SHOTS}/18b-mission.png`, fullPage: true });
    const go = page.locator('.sheet').last().locator('button.pill').filter({ hasText: /Y aller/ }).first();
    if (await go.count()) {
      await go.click();
      await page.waitForTimeout(300);
      await clearEvents();
    }
  } else {
    console.log('aucune mission accessible');
  }

  // Le carnet : chercher quelqu'un.
  const fence = page.getByRole('button', { name: /Receleur/ }).first();
  if ((await fence.count()) && !(await fence.evaluate((el) => el.classList.contains('disabled')))) {
    await fence.scrollIntoViewIfNeeded();
    await fence.click();
    await page.waitForTimeout(250);
    await clearEvents();
  }
  await page.screenshot({ path: `${SHOTS}/18c-apres.png`, fullPage: true });
  await closeSheet();
});
if (!grey) console.log('panneau des activités illégales introuvable');
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* La détention et l'évasion, depuis une partie fabriquée              */
/* ------------------------------------------------------------------ */
/* L'entreprise, depuis une partie fabriquée                           */
/* ------------------------------------------------------------------ */

// À vingt-deux ans on n'a ni l'apport ni les exercices : l'écran d'entreprise
// n'aurait qu'un catalogue grisé à montrer, c'est-à-dire l'exact contraire de
// ce qu'il faut vérifier. On repart d'une partie où le moteur a réellement
// ouvert une maison et l'a tenue plusieurs années.
await loadSave('fixture-patron.mjs');
await tap(page.getByRole('button', { name: /Parcours/ }));
await openPanel(/caisse|salarié/, '18-entreprise.png', async () => {
  await page.screenshot({ path: `${SHOTS}/18a-entreprise-complet.png`, fullPage: true });

  // Le levier central : embaucher quand la demande dépasse la capacité.
  const hire = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Embaucher/ }).first();
  if (await hire.count()) {
    await hire.scrollIntoViewIfNeeded();
    await hire.click();
    await page.waitForTimeout(300);
    await clearEvents();
  }

  // La sortie : les repreneurs et leurs clauses.
  const list = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Chercher un repreneur/ }).first();
  if (await list.count()) {
    await list.scrollIntoViewIfNeeded();
    await list.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/18b-repreneurs.png`, fullPage: true });
  } else {
    console.log('aucun repreneur proposé');
  }
});
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* La notoriété, depuis une partie fabriquée                           */
/* ------------------------------------------------------------------ */

// La notoriété se construit sur des décennies : une vie ordinaire n'atteint
// jamais le seuil où l'écran a autre chose à montrer que « Personne ne sait
// qui tu es ». On repart d'une partie où le moteur a produit la notoriété par
// ce qui la produit vraiment — une audience construite publication après
// publication.
await loadSave('fixture-connu.mjs');
await tap(page.getByRole('button', { name: /Agenda/ }));
await openPanel(/Ton nom/, '19-notoriete.png', async () => {
  await page.screenshot({ path: `${SHOTS}/19a-notoriete-complet.png`, fullPage: true });

  // L'entretien : la scène jouable du système.
  const interview = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Donner une interview/ }).first();
  if (await interview.count()) {
    await interview.scrollIntoViewIfNeeded();
    await interview.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/19b-entretien.png`, fullPage: true });
    // On répond aux trois questions : c'est le parcours complet.
    for (let round = 0; round < 3; round++) {
      const answer = page.locator('.sheet').last().locator('button.row:not(.disabled)')
        .filter({ hasText: /^💬/ }).first();
      if (!(await answer.count())) break;
      await answer.scrollIntoViewIfNeeded();
      await answer.click();
      await page.waitForTimeout(260);
      await clearEvents();
    }
    await page.screenshot({ path: `${SHOTS}/19c-apres-entretien.png`, fullPage: true });
  } else {
    console.log('aucune interview proposée');
  }
});
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* Le locatif, depuis une partie fabriquée                             */
/* ------------------------------------------------------------------ */

// Posséder deux logements demande une vie entière et beaucoup de chance :
// l'écran de gestion locative n'aurait jamais été ouvert. On repart d'un
// bailleur dont le bail court depuis cinq ans.
await loadSave('fixture-bailleur.mjs');
await tap(page.getByRole('button', { name: /Avoirs/ }));
await openPanel(/Mes biens/, '21-mes-biens.png', async () => {
  const rental = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Loué à|À louer|dossier|Vide depuis/ }).first();
  if (!(await rental.count())) { console.log('aucun bien locatif visible'); return; }
  await rental.scrollIntoViewIfNeeded();
  await rental.click();
  await page.waitForTimeout(320);
  // Surtout pas de `clearEvents` ici : la fiche du bien est elle-même une
  // modale, et le nettoyeur d'événements la refermerait en cliquant sur le
  // voile — on ne verrait jamais la gestion locative.
  const manage = page.getByRole('button', { name: /Gérer la location/ }).first();
  if (await manage.count()) {
    await manage.scrollIntoViewIfNeeded();
    await manage.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/21a-locataire.png`, fullPage: true });

    // Trancher ce qui attend une décision : travaux, renouvellement, dossier.
    const decision = page.locator('.sheet').last().locator('button.row:not(.disabled)')
      .filter({ hasText: /Faire les travaux|Aligner sur le marché|Publier l’annonce/ }).first();
    if (await decision.count()) {
      await decision.scrollIntoViewIfNeeded();
      await decision.click();
      await page.waitForTimeout(320);
      await clearEvents();
      await page.screenshot({ path: `${SHOTS}/21b-apres-decision.png`, fullPage: true });
    }
  } else {
    console.log('gestion locative absente');
  }
});
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* La lignée, depuis une partie fabriquée                              */
/* ------------------------------------------------------------------ */

// Se marier et avoir des enfants sont des actions du joueur : une vie jouée
// toute seule n'en a jamais, et l'écran de fin n'aurait donc jamais proposé de
// continuer par un descendant. On repart d'une fin de vie construite par le
// moteur, avec deux enfants et une succession réelle.
await loadSave('fixture-lignee.mjs');
await page.screenshot({ path: `${SHOTS}/20-fin-de-vie.png`, fullPage: true });

const heir = page.locator('button.row').filter({ hasText: /ton enfant/ }).first();
if (await heir.count()) {
  const before = await page.locator('.header-sub').first().innerText().catch(() => '');
  await heir.scrollIntoViewIfNeeded();
  await heir.click();
  await page.waitForTimeout(600);
  await clearEvents();
  const after = await page.locator('.header-sub').first().innerText().catch(() => '');
  console.log('reprise de la lignée :', before.replace(/\n/g, ' '), '→', after.replace(/\n/g, ' '));
  await page.screenshot({ path: `${SHOTS}/20a-generation-2.png`, fullPage: false });

  // La famille, vue par le nouveau personnage : c'est là que se voit le
  // recalcul des liens.
  await tap(page.getByRole('button', { name: /Proches/ }));
  await page.screenshot({ path: `${SHOTS}/20b-famille-reprise.png`, fullPage: true });
  await ageBy(2);
} else {
  console.log('aucun héritier proposé');
}

/* ------------------------------------------------------------------ */
/* Le harcèlement, depuis une partie fabriquée                         */
/* ------------------------------------------------------------------ */

// Le tirage annuel plafonne à 20 %, et il faut encore être scolarisé avec une
// classe : une vie jouée toute seule n'ouvre presque jamais cet écran. On
// repart d'une partie où le moteur a ouvert la situation lui-même.
await loadSave('fixture-harcele.mjs');
await goTab(/Parcours/);
await openPanel(/Entrer dans l’établissement/, '23-ecole.png', async () => {
  const row = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /moqueries|écart|rumeurs|racket|bousculades|prend pour cible/i }).first();
  if (!(await row.count())) { console.log('aucune situation affichée'); return; }
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/23a-harcelement.png`, fullPage: true });

  // Répondre : c'est là que le système existe ou non.
  const answer = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Ne rien faire|Répondre en face|Le dire à l’établissement|En parler chez toi|T’appuyer/ })
    .first();
  if (!(await answer.count())) { console.log('aucune réponse ouverte'); return; }
  await answer.scrollIntoViewIfNeeded();
  await answer.click();
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${SHOTS}/23b-reponse.png` });
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/23c-apres-reponse.png`, fullPage: true });
});
await closeAllSheets();

// La fiche d'un camarade : c'est là que vivent les interactions de classe —
// se déclarer, se réconcilier, faire une farce, en parler à un adulte.
await goTab(/Parcours/);
await openPanel(/Entrer dans l’établissement/, '23d-ecole.png', async () => {
  const mates = page.getByRole('button', { name: /Camarades/ }).first();
  if (!(await mates.count())) { console.log('camarades absents'); return; }
  await mates.scrollIntoViewIfNeeded();
  await mates.click();
  await page.waitForTimeout(300);
  const someone = page.locator('.sheet').last().locator('button.row:not(.disabled)').first();
  if (!(await someone.count())) { console.log('aucun camarade listé'); return; }
  await someone.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/23e-camarade.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* L'examen, depuis une partie fabriquée                               */
/* ------------------------------------------------------------------ */

// Une session ne s'ouvre qu'en fin de cycle : il faut tomber pile sur cette
// année-là. On repart d'un élève à la veille de la sienne.
await loadSave('fixture-examen.mjs');
await goTab(/Parcours/);
await openPanel(/Entrer dans l’établissement/, '25-ecole-examen.png', async () => {
  // Le bulletin d'abord : c'est lui qui donne son sens à l'examen.
  const marks = page.getByRole('button', { name: /Ton bulletin/ }).first();
  if (await marks.count()) {
    await marks.scrollIntoViewIfNeeded();
    await marks.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/25a-bulletin.png`, fullPage: true });
    await closeSheet();
  }

  const session = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /brevet|baccalauréat|partiels|soutenance|épreuve pratique/i }).first();
  if (!(await session.count())) { console.log('aucune session affichée'); return; }
  await session.scrollIntoViewIfNeeded();
  await session.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/25b-avant-examen.png`, fullPage: true });

  const enter = page.getByRole('button', { name: /Entrer dans la salle/ }).first();
  if (!(await enter.count())) { console.log('salle inaccessible'); return; }
  await enter.scrollIntoViewIfNeeded();
  await enter.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/25c-copie.png` });

  // Traiter les questions une à une, en tenant l'appui : c'est la bonne façon
  // de jouer, et elle suffit à vérifier que la copie se remplit.
  const paper = page.locator('.minigame-surface');
  if (!(await paper.count())) { console.log('copie absente'); return; }
  const box = await paper.boundingBox();
  if (!box) return;
  // On tourne sur la grille jusqu'à ce que la copie se rende d'elle-même :
  // l'épreuve dure une vingtaine de secondes, et s'arrêter après un tour ne
  // photographierait que le milieu de la partie.
  for (let pass = 0; pass < 4; pass++) {
    for (let cell = 0; cell < 9; cell++) {
      if (!(await page.locator('.minigame-surface').count())) break;
      const x = box.x + box.width * (((cell % 3) + 0.5) / 3);
      const y = box.y + box.height * ((Math.floor(cell / 3) + 0.5) / 3);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.waitForTimeout(900);
      await page.mouse.up();
      if (pass === 0 && cell === 3) {
        await page.screenshot({ path: `${SHOTS}/25d-en-copie.png` });
      }
    }
    if (!(await page.locator('.minigame-surface').count())) break;
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/25e-verdict.png` });
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/25f-apres-examen.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* Le sport scolaire, depuis une partie fabriquée                      */
/* ------------------------------------------------------------------ */

// Il faut passer une sélection — où l'on peut être écarté — puis tenir
// plusieurs saisons pour que le groupe, le brassard et les recruteurs aient
// quelque chose à montrer. On repart d'un lycéen installé dans son équipe.
await loadSave('fixture-sportif.mjs');
await goTab(/Parcours/);
await openPanel(/Entrer dans l’établissement/, '24-ecole-sport.png', async () => {
  const row = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Football|Athlétisme|Basket|Natation|Rugby|Volley|Aviron|Escrime|Gymnastique|Sport scolaire/ })
    .first();
  if (!(await row.count())) { console.log('sport scolaire absent'); return; }
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/24a-filiere.png`, fullPage: true });

  // S'entraîner : l'action de base, celle qui fait monter le niveau.
  const session = page.getByRole('button', { name: /T’entraîner/ }).first();
  if (!(await session.count())) { console.log('entraînement indisponible'); return; }
  await session.scrollIntoViewIfNeeded();
  await session.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/24b-apres-seance.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* Les métiers de scène, depuis une partie fabriquée                   */
/* ------------------------------------------------------------------ */

// On ne devient pas comédien par hasard : il faut s'y lancer, puis tenir assez
// d'engagements pour qu'on vous en propose de sérieux. Une vie jouée toute
// seule n'ouvre donc jamais cet écran. On repart d'une carrière de quinze ans
// construite par le moteur, avec des propositions sur la table.
await loadSave('fixture-scene.mjs');
await goTab(/Parcours/);
await openPanel(/Comédien/, '22-scene.png', async () => {
  await page.screenshot({ path: `${SHOTS}/22a-scene-complet.png`, fullPage: true });

  // Signer un engagement, puis le tenir : c'est le parcours entier du système.
  const offer = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /rôle|publicité|pièce|doublage|figuration|film/i }).first();
  if (!(await offer.count())) { console.log('aucune proposition affichée'); return; }
  await offer.scrollIntoViewIfNeeded();
  await offer.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/22b-engagement.png`, fullPage: true });

  const go = page.getByRole('button', { name: /Y aller/ }).first();
  if (!(await go.count())) { console.log('engagement non signé'); return; }
  await go.scrollIntoViewIfNeeded();
  await go.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/22c-prestation.png` });

  // Jouer : suivre la ligne en gardant le doigt appuyé, ce qui tente aussi
  // les moments. C'est la bonne façon de jouer, et elle suffit à vérifier
  // que la scène vit et que le résultat revient dans la partie.
  const stage = page.locator('.minigame-surface');
  if (!(await stage.count())) { console.log('scène absente'); return; }
  const box = await stage.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  // La prestation dure une vingtaine de secondes : on la joue jusqu'au bout,
  // pour que le résultat revienne réellement dans la partie.
  for (let i = 0; i < 220; i++) {
    // On vise la ligne telle qu'elle est dessinée : le curseur la suit.
    const line = await page.locator('.scene-line').first()
      .evaluate((el) => el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2)
      .catch(() => null);
    if (line === null) break;
    await page.mouse.move(line, box.y + box.height * 0.5);
    await page.waitForTimeout(100);
    if (i === 20) await page.screenshot({ path: `${SHOTS}/22d-en-scene.png` });
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/22e-verdict.png` });
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/22f-apres-prestation.png`, fullPage: true });

  // La troupe : elle est plus bas dans la feuille, donc invisible sur une
  // capture pleine page — le défilement se fait à l'intérieur du panneau.
  const rehearse = page.getByRole('button', { name: /Travailler ensemble/ }).first();
  if (!(await rehearse.count())) { console.log('troupe absente'); return; }
  await rehearse.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/22g-troupe.png` });
  await rehearse.click();
  await page.waitForTimeout(320);
  await clearEvents();

  // Auditionner : la liste des candidats n'apparaît qu'après avoir demandé.
  const audition = page.getByRole('button', { name: /Auditionner un/ }).first();
  if (await audition.count()) {
    await audition.scrollIntoViewIfNeeded();
    await audition.click();
    await page.waitForTimeout(320);
    await audition.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/22h-auditions.png` });
  }

  // Les essais : ce pour quoi on peut aller se battre, au-dessus de ce qu'on
  // vous propose. C'est le seul endroit du métier où l'on va chercher au lieu
  // d'attendre — et où l'on peut rentrer les mains vides.
  const aim = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /demandé, tu en vaux/ }).first();
  if (await aim.count()) {
    await aim.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/22k-essais.png` });
    await aim.click();
    await page.waitForTimeout(300);
    const approach = page.getByRole('button', { name: /Jouer contre ton type/ }).first();
    if (await approach.count()) {
      await approach.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/22l-approches.png` });
      await approach.click();
      await page.waitForTimeout(320);
      await clearEvents();
      // Le laisser passer par le personnage : l'épreuve elle-même est la même
      // que la prestation, déjà jouée plus haut.
      const auto = page.getByRole('button', { name: /Laisser faire/ }).first();
      if (await auto.count()) {
        await auto.scrollIntoViewIfNeeded();
        await auto.click();
        await page.waitForTimeout(320);
        await clearEvents();
      }
      await page.screenshot({ path: `${SHOTS}/22m-apres-essai.png`, fullPage: true });
    }
  } else {
    console.log('aucun essai à portée');
  }

  // S'engager sur la durée : le seul endroit où le métier cesse d'être un
  // enchaînement de coups isolés.
  const sign = page.getByRole('button', { name: /Signer pour \d+ ans/ }).first();
  if (await sign.count()) {
    await sign.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/22i-contrat.png` });
    await sign.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.getByText(/restants sur/).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/22j-engage.png` });
  }
});
await closeAllSheets();

/* ------------------------------------------------------------------ */

// On n'entre pas dans l'armée par hasard, et l'on n'y monte pas en deux ans :
// il faut passer une sélection, tenir les classes, puis mener des missions
// pendant vingt ans. Une vie jouée toute seule n'ouvre donc jamais cet écran.
// On repart d'une carrière construite par le moteur, avec un grade, des
// décorations et des missions sur la table.
await loadSave('fixture-service.mjs');
await goTab(/Parcours/);
await openPanel(/Lieutenant|Sergent|Caporal|Commandant|Général/, '23-service.png', async () => {
  await page.screenshot({ path: `${SHOTS}/23a-service-complet.png`, fullPage: true });

  // S'entraîner : le seul levier volontaire sur la préparation.
  const train = page.getByRole('button', { name: /T’entraîner/ }).first();
  if (await train.count()) {
    await train.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/23b-preparation.png` });
    await train.click();
    await page.waitForTimeout(320);
    await clearEvents();
  }

  // Le grade et les distinctions : l'écran doit dire ce qui manque encore.
  const gap = page.getByText(/il manque/).first();
  if (await gap.count()) {
    await gap.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/23c-grade.png` });
  }

  // Accepter une mission, puis la mener : c'est le parcours entier.
  const duty = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /exigence \d+ · danger/ }).first();
  if (!(await duty.count())) { console.log('aucune mission affichée'); return; }
  await duty.scrollIntoViewIfNeeded();
  await duty.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/23d-mission.png`, fullPage: true });

  const go = page.getByRole('button', { name: /Y aller/ }).first();
  if (!(await go.count())) { console.log('mission non acceptée'); return; }
  await go.scrollIntoViewIfNeeded();
  await go.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/23e-epreuve.png` });

  // Jouer l'approche discrète comme il faut la jouer : avancer par à-coups et
  // s'arrêter devant les passages. Cela suffit à vérifier que la scène vit et
  // que le résultat revient réellement dans la partie.
  const surface = page.locator('.minigame-surface');
  if (!(await surface.count())) { console.log('épreuve absente'); return; }
  const box = await surface.boundingBox();
  if (!box) return;
  for (let i = 0; i < 30; i++) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    await page.waitForTimeout(500);
    if (i === 3) await page.screenshot({ path: `${SHOTS}/23f-en-approche.png` });
    if (!(await page.locator('.minigame-surface').count())) break;
  }
  await page.waitForTimeout(600);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/23g-apres-mission.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */

// Les trois maisons partagent un écran mais pas leur épreuve : l'armée joue
// l'approche discrète, le programme spatial joue l'amarrage — un problème
// d'inertie et non de patience. Sans cette deuxième sauvegarde, la moitié de
// ce qui a été ajouté ne serait jamais ouverte dans un navigateur.
await loadSave('fixture-orbite.mjs');
await goTab(/Parcours/);
await openPanel(/Astronaute|Pilote|Commandant de bord|Chef de programme/, '24-orbite.png', async () => {
  await page.screenshot({ path: `${SHOTS}/24a-orbite-complet.png`, fullPage: true });

  const duty = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /exigence \d+ · danger/ }).first();
  if (!(await duty.count())) { console.log('aucun vol proposé'); return; }
  await duty.scrollIntoViewIfNeeded();
  await duty.click();
  await page.waitForTimeout(320);
  await clearEvents();

  const go = page.getByRole('button', { name: /Y aller/ }).first();
  if (!(await go.count())) { console.log('vol non accepté'); return; }
  await go.scrollIntoViewIfNeeded();
  await go.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/24b-amarrage.png` });

  // Piloter : appuyer du côté du port pour corriger la ligne, en gardant le
  // doigt bas — donc l'approche lente. C'est la bonne façon de jouer, et elle
  // suffit à vérifier que la manœuvre vit et que le résultat revient.
  const surface = page.locator('.minigame-surface');
  if (!(await surface.count())) { console.log('manœuvre absente'); return; }
  const box = await surface.boundingBox();
  if (!box) return;
  const low = box.y + box.height * 0.88;
  await page.mouse.move(box.x + box.width * 0.5, low);
  await page.mouse.down();
  for (let i = 0; i < 160; i++) {
    const spot = await page.evaluate(() => {
      const port = document.querySelector('.dock-port');
      const ship = document.querySelector('.dock-ship');
      if (!port || !ship) return null;
      const p = port.getBoundingClientRect();
      const s = ship.getBoundingClientRect();
      return { port: p.x + p.width / 2, ship: s.x + s.width / 2 };
    }).catch(() => null);
    if (spot === null) break;
    // Viser le port, mais rester dans la zone morte quand on y est presque :
    // sinon on pousse en permanence et le réservoir se vide.
    const target = Math.abs(spot.port - spot.ship) < 12 ? spot.ship : spot.port;
    await page.mouse.move(target, low);
    await page.waitForTimeout(120);
    if (i === 15) await page.screenshot({ path: `${SHOTS}/24c-en-approche.png` });
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/24d-apres-vol.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */

// Un mandat ne s'obtient pas par hasard : douze ans de métier politique, une
// campagne financée et menée, un scrutin gagné. Une vie jouée toute seule
// n'ouvre jamais cet écran. On repart d'un mandat construit par le moteur,
// avec une décision sur le bureau.
await loadSave('fixture-elu.mjs');
await goTab(/Parcours/);
await openPanel(/La mairie/, '25-mandat.png', async () => {
  await page.screenshot({ path: `${SHOTS}/25a-mandat-complet.png`, fullPage: true });

  // Trancher : c'est ce que l'audit reprochait de ne pas exister.
  const option = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /plaît à|fâche/ }).first();
  if (!(await option.count())) { console.log('aucune décision à trancher'); return; }
  await option.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/25b-decision.png` });
  await option.click();
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${SHOTS}/25c-verdict.png` });
  await clearEvents();

  // Ce que chaque bloc en pense : c'est là que la décision se lit.
  const blocs = page.getByText(/Le bloc qui se déplace toujours/).first();
  if (await blocs.count()) {
    await blocs.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/25d-blocs.png` });
  }
  await page.screenshot({ path: `${SHOTS}/25e-apres-decision.png`, fullPage: true });
});
await closeAllSheets();

// Puis la campagne elle-même : on démissionne pour la rouvrir, ce qui est un
// vrai coup du jeu et non une manipulation de l'écran.
await goTab(/Parcours/);
await openPanel(/La mairie/, '26-avant-demission.png', async () => {
  const quit = page.getByRole('button', { name: /Démissionner/ }).first();
  if (!(await quit.count())) { console.log('démission indisponible'); return; }
  await quit.scrollIntoViewIfNeeded();
  await quit.click();
  await page.waitForTimeout(320);
  await clearEvents();
});
await closeAllSheets();

await goTab(/Parcours/);
await openPanel(/Te présenter/, '26a-se-presenter.png', async () => {
  const seat = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /conseil municipal|mairie|assemblée/ }).first();
  if (!(await seat.count())) { console.log('aucun siège accessible'); return; }
  await seat.scrollIntoViewIfNeeded();
  await seat.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/26b-campagne.png`, fullPage: true });

  // Choisir un axe de programme, lever de l'argent, jouer un coup.
  const plank = page.getByRole('button', { name: /Construire et loger/ }).first();
  if (await plank.count()) {
    await plank.scrollIntoViewIfNeeded();
    await plank.click();
    await page.waitForTimeout(280);
    await clearEvents();
  }
  const fund = page.getByRole('button', { name: /Ta propre fortune/ }).first();
  if (await fund.count()) {
    await fund.scrollIntoViewIfNeeded();
    await fund.click();
    await page.waitForTimeout(280);
    await clearEvents();
  }
  const door = page.getByRole('button', { name: /Le porte-à-porte/ }).first();
  if (await door.count()) {
    await door.scrollIntoViewIfNeeded();
    await door.click();
    await page.waitForTimeout(280);
    await clearEvents();
  }
  await page.screenshot({ path: `${SHOTS}/26c-programme.png`, fullPage: true });

  // Les sondages, bloc par bloc : c'est là que se lit tout le système.
  const polls = page.getByText(/Un bloc pèse ce qu’il représente/).first();
  if (await polls.count()) {
    await polls.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/26d-sondages.png` });
  }

  // Le débat, joué comme une prestation.
  const debate = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /le seul coup qui dépende de toi/i }).first();
  if (!(await debate.count())) { console.log('débat indisponible'); return; }
  await debate.scrollIntoViewIfNeeded();
  await debate.click();
  await page.waitForTimeout(400);
  const stage = page.locator('.minigame-surface');
  if (!(await stage.count())) { console.log('débat non ouvert'); return; }
  const box = await stage.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  for (let i = 0; i < 200; i++) {
    const line = await page.locator('.scene-line').first()
      .evaluate((el) => el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2)
      .catch(() => null);
    if (line === null) break;
    await page.mouse.move(line, box.y + box.height * 0.5);
    await page.waitForTimeout(100);
    if (i === 20) await page.screenshot({ path: `${SHOTS}/26e-en-debat.png` });
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/26f-apres-debat.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */

// Un disque ne se voit que des années après avoir été enregistré : il faut du
// métier pour qu'on vous signe, deux ans pour produire un album, et plusieurs
// années encore pour que le classement raconte quelque chose. On repart d'un
// catalogue construit par le moteur, avec une tournée posée mais pas partie.
await loadSave('fixture-disque.mjs');
await goTab(/Parcours/);
await openPanel(/Musicien/, '27-musique.png', async () => {
  const discs = page.getByRole('button', { name: /sortie\(s\)|Enregistrer quelque chose|Dans les|Numéro un|Jamais classé|Sur le podium|Tout en bas/ }).first();
  if (!(await discs.count())) { console.log('le disque est absent'); return; }
  await discs.scrollIntoViewIfNeeded();
  await discs.click();
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${SHOTS}/27a-catalogue.png`, fullPage: true });

  // La tournée posée : c'est le cœur du système, et il est plus bas.
  const road = page.getByText(/Une salle trop grande ne rate pas complètement/).first();
  if (await road.count()) {
    await road.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/27b-la-route.png` });
  }

  // Partir : on découvre ce qu'on valait.
  const go = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Partir — \d+ date/ }).first();
  if (await go.count()) {
    await go.scrollIntoViewIfNeeded();
    await go.click();
    await page.waitForTimeout(320);
    await page.screenshot({ path: `${SHOTS}/27c-tournee.png` });
    await clearEvents();
  } else {
    console.log('aucune tournée à lancer');
  }

  // Enregistrer quelque chose de neuf.
  const record = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Trois minutes qui décideront|Cinq titres|Six mois enfermé/ }).first();
  if (await record.count()) {
    await record.scrollIntoViewIfNeeded();
    await record.click();
    await page.waitForTimeout(320);
    await clearEvents();
  }
  await page.screenshot({ path: `${SHOTS}/27d-apres.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */

// Élever un enfant : la seule boucle complète du jeu — l'enfant qu'on élève
// est le personnage qu'on jouera peut-être ensuite. On repart de la dynastie
// du fixtures d'héritage, qui en a plusieurs.
// Une vie non jouée n'a pas d'enfants — c'est mesuré, zéro sur cent vingt.
// On repart donc d'un parent de deux enfants de treize et neuf ans.
await loadSave('fixture-parent.mjs');
await goTab(/Proches/);
{
  // Insensible à la casse : l'écran écrit « Fils », et le premier essai
  // cherchait « fils » — il n'a jamais rien trouvé.
  const kid = page.locator('button.row').filter({ hasText: /fils|fille/i }).first();
  if (!(await kid.count())) {
    console.log('aucun enfant à élever');
  } else {
    await kid.scrollIntoViewIfNeeded();
    await kid.click();
    await page.waitForTimeout(360);
    await page.screenshot({ path: `${SHOTS}/32-enfant.png`, fullPage: true });
    const gesture = page.locator('.sheet').last().locator('button.row:not(.disabled)')
      .filter({ hasText: /Passer du temps avec lui|Suivre sa scolarité|Le cadrer/ }).first();
    if (await gesture.count()) {
      await gesture.scrollIntoViewIfNeeded();
      await gesture.click();
      await page.waitForTimeout(320);
      await clearEvents();
      await page.screenshot({ path: `${SHOTS}/32a-eleve.png`, fullPage: true });
    } else {
      console.log('aucun geste possible avec cet enfant');
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

// Les langues : la seule chose qui distingue vivre ailleurs de vivre ici
// avec d'autres chiffres. On regarde l'écran chez soi — où tout va bien —
// puis on prend des cours d'une langue qu'on ne parle pas.
await goTab(/Agenda/);
await openPanel(/Tu es d’ici|Tu n’obtiens qu’une part/, '31-langues.png', async () => {
  await page.screenshot({ path: `${SHOTS}/31a-langues.png`, fullPage: true });
  const lesson = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Pas un mot|Quelques mots/ }).first();
  if (!(await lesson.count())) { console.log('aucune langue à apprendre'); return; }
  await lesson.scrollIntoViewIfNeeded();
  await lesson.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/31b-cours.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */

// Les défis : ce que le joueur décide de faire d'une vie. Ils vivent dans
// l'Agenda, se prennent, et la plupart imposent un serment. Le cabinet, lui,
// survit aux parties — on le vide d'abord pour partir d'un état connu.
await page.evaluate(() => { localStorage.removeItem('odyssia.vault.v1'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await goTab(/Agenda/);
await openPanel(/Les défis et le cabinet/, '30-defis.png', async () => {
  await page.screenshot({ path: `${SHOTS}/30a-defis.png`, fullPage: true });

  // Ouvrir un défi : les étapes, et le serment en toutes lettres.
  const one = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /Sur cette vie|Une piste|Sur la lignée/ }).first();
  if (!(await one.count())) { console.log('aucun défi proposé'); return; }
  await one.scrollIntoViewIfNeeded();
  await one.click();
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${SHOTS}/30b-defi.png`, fullPage: true });

  // Le prendre : c'est là que le serment engage.
  const takeIt = page.getByRole('button', { name: /Prendre ce défi/ }).first();
  if (await takeIt.count() && !(await takeIt.evaluate((el) => el.classList.contains('disabled')))) {
    await takeIt.scrollIntoViewIfNeeded();
    await takeIt.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/30c-pris.png`, fullPage: true });
  } else {
    console.log('défi non prenable');
  }
});
await closeAllSheets();

/* ------------------------------------------------------------------ */

// Les occasions : ce qui revient chaque année, et qui remplit les années que
// rien d'autre ne remplissait. Une occasion se présente puis disparaît, et
// tout le reste de ce fumigène solde les modales sans les regarder — il les
// traverserait donc toutes sans jamais en photographier une. On ouvre la
// partie *sur* la scène, modale à l'écran.
{
  const raw = execFileSync(
    'node',
    ['--experimental-strip-types', new URL('fixture-occasion.mjs', import.meta.url).pathname],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  await page.evaluate((save) => { localStorage.setItem('odyssia.save.v1', save); }, raw);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  // Surtout pas de `clearEvents` ici : c'est l'objet même de la vérification.

  const scene = page.locator('.overlay');
  if (!(await scene.count())) {
    console.log('occasion : aucune scène à l’ouverture');
  } else {
    await page.screenshot({ path: `${SHOTS}/33-occasion.png`, fullPage: true });

    // Une modale peut exister et ne rien montrer — c'est arrivé trois fois
    // dans ce projet, et chaque fois le journal était propre. On regarde donc
    // ce que le navigateur a réellement peint.
    const seen = await page.locator('.overlay').first().innerText();
    const choices = await page.locator('.overlay .choice').allInnerTexts();
    console.log('occasion :', seen.replace(/\s+/g, ' ').slice(0, 120));
    console.log('occasion — choix :', choices.length, choices.map((c) => c.replace(/\s+/g, ' ')).join(' / '));
    if (!choices.length) console.log('occasion : scène sans choix');

    const first = page.locator('.overlay .choice').first();
    if (await first.count()) {
      await first.click({ force: true });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/33a-occasion-suite.png`, fullPage: true });
    }
    await clearEvents();
  }

  // Ce qu'on garde d'une occasion se range dans la collection. La sauvegarde
  // en a deux, ramassés en jouant — pas posés à la main.
  await goTab(/Avoirs/);
  const kept = await openPanel(/Ce que la famille a gardé/, '33b-collection.png', async () => {
    const section = page.getByText('Ce que tu as gardé d’une occasion').first();
    if (!(await section.count())) { console.log('souvenirs : section ABSENTE'); return; }
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    // La sauvegarde en porte deux : si l'écran dit « Rien », c'est qu'il ne
    // lit pas ce que la partie sait.
    const empty = await page.getByText('Rien. Il faut y avoir été.').count();
    console.log('souvenirs :', empty ? 'section VIDE alors que la partie en a' : 'section remplie');
    await page.screenshot({ path: `${SHOTS}/33c-souvenirs.png`, fullPage: true });
  });
  if (!kept) console.log('collection introuvable');
  await closeAllSheets();
}

/* ------------------------------------------------------------------ */

// La table. L'ancien casino proposait quatre noms de jeux qui ne différaient
// que par trois nombres : on misait, on tirait, on regardait. Ce qu'il faut
// vérifier ici n'est pas qu'un écran s'ouvre, mais que le pot **monte quand
// on touche** et se **met à l'abri quand on maintient** — c'est-à-dire qu'il
// y a quelque chose à jouer.
await goTab(/Agenda/);
{
  const gamble = page.getByRole('button', { name: /Jeux d’argent/ }).first();
  if (!(await gamble.count())) console.log('table : panneau des jeux absent');
  else {
    await gamble.click();
    await page.waitForTimeout(380);
    const entry = page.locator('button.row').filter({ hasText: /La table/ }).first();
    if (!(await entry.count())) console.log('table : ligne absente');
    else {
      await entry.scrollIntoViewIfNeeded();
      await entry.click();
      await page.waitForTimeout(400);
      // `AmountPicker` rend un `input.range` nu : viser un conteneur `.slider`
      // ne trouvait rien, la mise restait à zéro et le bouton restait grisé.
      const slider = page.locator('input.range').first();
      if (await slider.count()) { await slider.fill('500'); await page.waitForTimeout(220); }
      const sit = page.getByRole('button', { name: /T’asseoir à la table/ }).first();
      if (!(await sit.count()) || await sit.isDisabled()) console.log('table : impossible de s’asseoir');
      else {
        await sit.click();
        await page.waitForTimeout(560);
        const surface = page.locator('.minigame-surface');
        const read = () => page.locator('.sheet').last()
          .evaluate((el) => (el.textContent ?? '').replace(/\s+/g, ' '));
        const pot = (t) => Number((t.match(/Sur le tapis\s*(\d+)/) ?? [])[1] ?? -1);
        const safe = (t) => Number((t.match(/À l’abri\s*(\d+)/) ?? [])[1] ?? -1);
        if (!(await surface.count())) console.log('table : aucune surface de jeu');
        else {
          const box = await surface.boundingBox();
          const start = await read();
          // Trois jetons d'affilée peuvent tomber sur celui qui vide : le pot
          // serait alors à zéro et l'on aurait mesuré la malchance, pas la
          // mécanique. On retourne jusqu'à ce qu'il y ait quelque chose sur
          // le tapis — ce qui arrive forcément, le sac contient une majorité
          // de bons jetons.
          let turned = start;
          for (let i = 0; i < 14 && pot(turned) <= 0; i++) {
            if (!(await surface.count())) break;
            await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
            await page.waitForTimeout(240);
            turned = await read();
          }
          await page.screenshot({ path: `${SHOTS}/39-table.png`, fullPage: true });
          await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
          await page.mouse.down();
          await page.waitForTimeout(700);
          await page.mouse.up();
          await page.waitForTimeout(450);
          const banked = await read();
          console.log(`table — le pot monte : ${pot(turned) > 0 && pot(turned) > pot(start)}`
            + ` · empocher le met à l’abri : ${safe(banked) > safe(turned)}`
            // Lire le sac dépend du personnage : un joueur au jugé ne le voit
            // pas, et c'est le système qui marche. Ce qui doit toujours être
            // vrai, c'est que l'écran dise laquelle des deux situations on
            // est en train de vivre.
            + ` · le sac se lit ou se refuse : ${/Il reste \d+ bon|au jugé/.test(turned)}`);
          await page.screenshot({ path: `${SHOTS}/39a-empoche.png`, fullPage: true });
          await clearEvents();
        }
      }
      await closeAllSheets();
    }
  }
}

/* ------------------------------------------------------------------ */

// Le divorce : la seule décision du jeu qui touche l'argent, les enfants et
// la paix à la fois. L'ancienne procédure comptait les enfants pour fixer une
// pension puis les laissait où ils étaient — c'est ce déplacement, et lui
// seul, que le navigateur doit confirmer.
await loadSave('fixture-divorce.mjs');
await goTab(/Proches/);
{
  const spouse = page.locator('.app-body button.row').filter({ hasText: /Conjoint/ }).first();
  if (!(await spouse.count())) console.log('divorce : aucun conjoint');
  else {
    await spouse.scrollIntoViewIfNeeded();
    await spouse.click();
    await page.waitForTimeout(360);
    const row = page.locator('.sheet').last().locator('button.row').filter({ hasText: /Divorcer/ }).first();
    if (!(await row.count())) console.log('divorce : ligne absente');
    else {
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await page.waitForTimeout(420);
      const modal = page.locator('.overlay').first();
      const body = (await modal.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      const read = () => modal.evaluate((el) => (el.textContent ?? '').replace(/\s+/g, ' '));
      const kept = (t) => (t.match(/Ce qu’il te resterait\s*([\d  ]+)/) ?? [])[1];
      console.log(`divorce — avocats ${['Te défendre', 'qu’on te donne', 'cabinet qui coûte'].filter((x) => body.includes(x)).length}/3`
        + ` · postures ${['amiable', 'pour les enfants', 'pour ce que tu as', 'lâcher du tout'].filter((x) => body.includes(x)).length}/4`
        + ` · garde annoncée ${/Les enfants/.test(body)}`);
      await page.screenshot({ path: `${SHOTS}/38-divorce.png`, fullPage: true });

      const before = await read();
      const fight = modal.locator('button.row').filter({ hasText: /pour ce que tu as/ }).first();
      if (await fight.count()) {
        await fight.click();
        await page.waitForTimeout(300);
        console.log('divorce — changer de posture change l’aperçu :', kept(before) !== kept(await read()));
      }

      const go = modal.getByRole('button', { name: /Engager la procédure/ }).first();
      if (!(await go.count())) console.log('divorce : bouton absent');
      else {
        await go.click();
        await page.waitForTimeout(480);
        await page.screenshot({ path: `${SHOTS}/38a-issue.png`, fullPage: true });
        await clearEvents();
        const moved = await page.evaluate(() => {
          const st = JSON.parse(localStorage.getItem('odyssia.save.v1'));
          const kids = Object.values(st.npcs).filter((n) => ['son', 'daughter'].includes(n.relation) && n.alive);
          return { total: kids.length, away: kids.filter((k) => k.flags?.livesWith).length };
        });
        console.log(`divorce — enfants déplacés : ${moved.away}/${moved.total}`);
      }
      await closeAllSheets();
    }
  }
}

/* ------------------------------------------------------------------ */

// Une inimitié, et les excuses qui la réparent. Une vie jouée par
// l'auto-joueur n'en produit aucune — mesuré, 0 % —, parce qu'un ennemi se
// fabrique par les gestes du joueur. Sans sauvegarde faite exprès, ni la
// pastille ni les excuses ne seraient jamais photographiées.
await loadSave('fixture-rancune.mjs');
await goTab(/Proches/);
{
  const who = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('odyssia.save.v1'));
    const n = Object.values(state.npcs).find((x) => Number(x.flags?.grudge ?? 0) >= 40);
    return n ? n.firstName : null;
  });
  if (!who) console.log('rancune : aucun ennemi dans la sauvegarde');
  else {
    const row = page.locator('.app-body button.row').filter({ hasText: who }).first();
    if (!(await row.count())) console.log(`rancune : ${who} absent de Proches`);
    else {
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await page.waitForTimeout(360);
      const sheet = page.locator('.sheet').last();
      const body = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      const pills = (await sheet.locator('.chips').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
      console.log(`rancune ${who} — ${pills} · grief nommé : ${/te reproche/.test(body)}`);
      await page.screenshot({ path: `${SHOTS}/37-ennemi.png`, fullPage: true });

      const sorry = sheet.locator('button.row:not(.disabled)').filter({ hasText: /S’excuser/ }).first();
      if (!(await sorry.count())) console.log('rancune : excuses indisponibles');
      else {
        await sorry.scrollIntoViewIfNeeded();
        await sorry.click();
        await page.waitForTimeout(420);
        await page.screenshot({ path: `${SHOTS}/37a-excuses.png`, fullPage: true });
        await clearEvents();
        const after = (await page.locator('.sheet').last()
          .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
        console.log('rancune — excuses rebloquées la même année :', /viens d’essayer/.test(after));
      }
      await closeAllSheets();
    }
  }
}

/* ------------------------------------------------------------------ */

// Ce qu'on sait faire. Trois états doivent se distinguer sur la même liste —
// un don connu, un don qu'on cherche encore, une compétence jamais tentée —
// et une séance doit se voir. La première version affichait le palier plutôt
// que le chiffre : payer une séance laissait la ligne rigoureusement
// identique, ce que seul le navigateur pouvait montrer.
await loadSave('fixture-savoir.mjs');
await goTab(/Agenda/);
{
  const entry = page.locator('button.row').filter({ hasText: /Ce que tu sais faire/ }).first();
  if (!(await entry.count())) {
    console.log('ligne « ce que tu sais faire » absente de l’Agenda');
  } else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/35-savoir.png`, fullPage: true });

    const sheet = page.locator('.sheet').last();
    const body = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    console.log('savoir-faire — don connu :', /Ça vient bien|sans effort|Comme tout le monde|Il faut y aller|Ça ne vient pas/.test(body),
      '· en cours :', /tu sauras/.test(body),
      '· jamais tenté :', /jamais essayé/.test(body));

    const go = sheet.locator('button.row:not(.disabled)').first();
    if (!(await go.count())) console.log('aucune compétence ouverte');
    else {
      const before = (await go.innerText()).replace(/\s+/g, ' ');
      await go.scrollIntoViewIfNeeded();
      await go.click();
      await page.waitForTimeout(420);
      await page.screenshot({ path: `${SHOTS}/35a-seance.png`, fullPage: true });
      await clearEvents();
      const after = (await page.locator('.sheet').last().locator('.row').first()
        .innerText()).replace(/\s+/g, ' ');
      console.log('savoir-faire — la séance se voit :', before !== after);
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

// La vie des autres : ce qui leur arrive pendant qu'on ne les regarde pas.
// Les trois états qui comptent sont rares par construction — 0,1 % de détenus,
// 6 % de malades, 7 % de partis loin —, si bien qu'une partie prise au hasard
// n'en montrerait aucun et que le parloir ne serait jamais photographié.
await loadSave('fixture-leurs.mjs');
await goTab(/Proches/);
{
  // Qui est dans quel état, d'après la sauvegarde plutôt que d'après un
  // libellé qu'on espère trouver.
  const who = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('odyssia.save.v1'));
    const npcs = Object.values(state.npcs);
    const pick = (f) => { const n = npcs.find(f); return n ? n.firstName : null; };
    return {
      dedans: pick((n) => n.alive && n.incarcerated),
      malade: pick((n) => n.alive && n.flags?.illness),
      loin: pick((n) => n.alive && n.flags?.far),
    };
  });
  console.log('leurs vies :', JSON.stringify(who));

  for (const [what, name] of Object.entries(who)) {
    if (!name) { console.log(`aucun ${what}`); continue; }
    const row = page.locator('.app-body button.row').filter({ hasText: name }).first();
    if (!(await row.count())) { console.log(`${what} : ${name} absent de Proches`); continue; }
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await page.waitForTimeout(340);
    const sheet = page.locator('.sheet').last();
    // `innerText` ne rend que la partie peinte d'un conteneur qui défile : il
    // annonçait « section absente » pour des sections dont il venait de
    // cliquer le bouton. `textContent` dit ce qui existe.
    const body = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    const pills = await sheet.locator('.chips').first().innerText().catch(() => '');
    console.log(`${what} ${name} — ${pills.replace(/\s+/g, ' ')} · histoire ${/Son histoire/.test(body) ? 'oui' : 'NON'}`);
    await page.screenshot({ path: `${SHOTS}/34-${what}.png`, fullPage: true });

    if (what === 'dedans') {
      const go = sheet.locator('button.row:not(.disabled)').filter({ hasText: /Aller le voir/ }).first();
      if (!(await go.count())) console.log('parloir indisponible');
      else {
        await go.scrollIntoViewIfNeeded();
        await go.click();
        await page.waitForTimeout(420);
        await page.screenshot({ path: `${SHOTS}/34a-parloir.png`, fullPage: true });
        await clearEvents();
        const after = (await page.locator('.sheet').last()
          .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
        console.log('parloir rebloqué la même année :', /déjà allé/.test(after));
      }
    }
    await closeSheet();
  }
}
await closeAllSheets();

/* ------------------------------------------------------------------ */

// Naître dans une maison régnante tient à la graine seule : une vie sur cent
// cinquante environ. L'écran ne serait donc jamais photographié autrement
// qu'à l'état « les maisons », c'est-à-dire vide. On repart d'une sauvegarde
// construite par le moteur : quarante-huit ans, prince, cent quarante-sept
// engagements tenus, une affaire sur le bureau.
await loadSave('fixture-couronne.mjs');
await goTab(/Parcours/);
// Le titre se lit dans la sauvegarde, jamais dans une liste écrite à la main :
// la première version cherchait « Prince|Duc|Comte|Baron », la graine a fini
// par donner un *souverain*, et le panneau de la couronne a cessé d'être
// vérifié sans que rien ne le signale — `openPanel` note l'absence et
// poursuit. Un sélecteur qui ne correspond à rien est un test qui ne teste
// rien.
const crownTitle = await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('odyssia.save.v1'));
  return state.player?.crown?.titleId ?? null;
});
console.log('couronne : titre porté =', crownTitle);
await openPanel(new RegExp(TITLE_WORDS[crownTitle] ?? 'Prince', 'i'), '29-couronne.png', async () => {
  await page.screenshot({ path: `${SHOTS}/29a-couronne.png`, fullPage: true });

  // Trancher l'affaire de l'année : c'est la seule décision de fond que la
  // couronne prend, et aucune option ne contente tout le monde.
  const option = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /sur la couronne/ }).first();
  if (await option.count()) {
    await option.scrollIntoViewIfNeeded();
    await option.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/29b-tranche.png`, fullPage: true });
  }

  // La haie : l'allure, et à qui l'on donne du temps.
  const bath = page.getByRole('button', { name: /Aller au contact/ }).first();
  if (!(await bath.count())) { console.log('bain de foule fermé'); return; }
  if (await bath.evaluate((el) => el.classList.contains('disabled'))) {
    console.log('bain de foule indisponible cette année');
    return;
  }
  await bath.scrollIntoViewIfNeeded();
  await bath.click();
  await page.waitForTimeout(400);
  const alley = page.locator('.minigame-surface');
  if (!(await alley.count())) { console.log('haie non ouverte'); return; }
  const rope = await alley.boundingBox();
  if (!rope) return;
  await page.mouse.move(rope.x + rope.width / 2, rope.y + rope.height / 2);
  // Marcher, s'arrêter une fois sur deux devant quelqu'un, et arriver au bout.
  for (let i = 0; i < 60; i++) {
    if (!(await page.locator('.minigame-surface').count())) break;
    if (i === 4) await page.screenshot({ path: `${SHOTS}/29c-haie.png` });
    const stop = i % 6 === 0 || i % 6 === 1 || i % 6 === 2;
    if (stop) await page.mouse.down();
    await page.waitForTimeout(240);
    if (stop) await page.mouse.up();
  }
  await page.waitForTimeout(900);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/29d-apres-haie.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */

// Un objet de famille ne se voit qu'avec le temps : il faut le trouver, le
// tenir des décennies, le transmettre, et recommencer. On repart d'une
// dynastie de quatre générations construite par le moteur, avec un objet de
// plus d'un siècle dedans.
await loadSave('fixture-heritage.mjs');
await goTab(/Avoirs/);
await openPanel(/Ce que la famille a gardé/, '28-collections.png', async () => {
  await page.screenshot({ path: `${SHOTS}/28a-collections.png`, fullPage: true });

  // Une pièce en particulier : son histoire est ce qui la distingue d'un
  // objet de valeur.
  const item = page.locator('.sheet').last().locator('button.row:not(.disabled)')
    .filter({ hasText: /siècles?|D’avant toi/ }).first();
  if (!(await item.count())) { console.log('aucun objet ancien'); return; }
  await item.scrollIntoViewIfNeeded();
  await item.click();
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${SHOTS}/28b-objet.png`, fullPage: true });

  // Le faire reprendre : c'est le seul levier, et il coûte.
  const fix = page.getByRole('button', { name: /Le faire reprendre/ }).first();
  if (await fix.count()) {
    await fix.scrollIntoViewIfNeeded();
    await fix.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/28c-restaure.png`, fullPage: true });
  }
  await closeSheet();

  // Le grenier : la pièce noire.
  const attic = page.getByRole('button', { name: /Monter au grenier/ }).first();
  if (!(await attic.count())) { console.log('grenier fermé'); return; }
  if (await attic.evaluate((el) => el.classList.contains('disabled'))) {
    console.log('grenier indisponible cette année');
    return;
  }
  await attic.scrollIntoViewIfNeeded();
  await attic.click();
  await page.waitForTimeout(400);
  const surface = page.locator('.minigame-surface');
  if (!(await surface.count())) { console.log('grenier non ouvert'); return; }
  const box = await surface.boundingBox();
  if (!box) return;
  // Balayer en spirale, halo étroit, et ne fouiller que lorsque la lampe est
  // vraiment vive : c'est la bonne façon de jouer.
  for (let i = 0; i < 90; i++) {
    const t = i / 7;
    const spread = Math.min(0.4, 0.05 + i * 0.004);
    await page.mouse.move(
      box.x + box.width * (0.5 + Math.cos(t) * spread),
      box.y + box.height * (0.5 + Math.sin(t * 1.3) * spread),
    );
    await page.waitForTimeout(60);
    if (i === 12) await page.screenshot({ path: `${SHOTS}/28d-grenier.png` });
    const warm = await page.locator('.chips').last().innerText().catch(() => '');
    if (warm.includes('tout près')) {
      await page.mouse.down();
      await page.waitForTimeout(60);
      await page.mouse.up();
      await page.waitForTimeout(120);
    }
    if (!(await page.locator('.minigame-surface').count())) break;
  }
  await page.waitForTimeout(800);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/28e-apres-grenier.png`, fullPage: true });
});
await closeAllSheets();

/* ------------------------------------------------------------------ */

// Les deux thèmes. Un mode sombre que personne n'a regardé n'est pas un mode
// sombre : il suffit d'une couleur oubliée dans un seul bloc pour qu'un texte
// devienne illisible sur un écran qu'on ne teste jamais. On bascule vraiment
// la racine et l'on regarde ce que le navigateur calcule.
await goTab(/Vie/);
{
  const read = () => page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const card = document.querySelector('.feed-event, .card, .sheet');
    const nav = document.querySelector('.tabbar');
    return {
      bg: body.backgroundColor,
      ink: body.color,
      card: card ? getComputedStyle(card).backgroundColor : '',
      nav: nav ? getComputedStyle(nav).backgroundColor : '',
    };
  });

  const light = await read();
  await page.screenshot({ path: `${SHOTS}/43-clair.png`, fullPage: true });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(320);
  const dark = await read();
  await page.screenshot({ path: `${SHOTS}/43a-sombre.png`, fullPage: true });

  // Ce qui doit être vrai : tout change, et rien ne reste blanc sur blanc.
  const lum = (rgb) => {
    const [r, g, b] = (rgb.match(/\d+/g) ?? [0, 0, 0]).map(Number);
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  };
  console.log('thème — le fond bascule :', light.bg !== dark.bg,
    '· les cartes aussi :', light.card !== dark.card,
    '· la barre aussi :', light.nav !== dark.nav);
  console.log('thème — clair : fond', lum(light.bg).toFixed(2), 'texte', lum(light.ink).toFixed(2),
    '· sombre : fond', lum(dark.bg).toFixed(2), 'texte', lum(dark.ink).toFixed(2));
  console.log('thème — le contraste tient dans les deux :',
    Math.abs(lum(light.bg) - lum(light.ink)) > 0.4 && Math.abs(lum(dark.bg) - lum(dark.ink)) > 0.4);

  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  await page.waitForTimeout(220);
}

/* ------------------------------------------------------------------ */

// Ce qu'on peut faire avec quelqu'un. Mesuré avant : le moteur contextuel
// existait — il tenait déjà l'école, le travail et la prison — et **l'écran
// des proches ne s'en servait pas** : il écrivait quatre lignes à la main.
// Le moteur lui-même ne connaissait que dix actions pour une mère, dont huit
// identiques à six, seize et trente-cinq ans. Ce qui doit se voir ici : des
// groupes, des lignes fermées qui disent pourquoi, et une manière à choisir.
await loadSave('fixture-parent.mjs');
await goTab(/Proches/);
{
  const card = page.locator('button.row').filter({ hasText: /Mère|Père|Frère|Sœur/ }).first();
  if (!(await card.count())) console.log('aucun proche dans la liste');
  else {
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/42-actions.png`, fullPage: true });
    const sheet = () => page.locator('.sheet').last()
      .evaluate((el) => (el.textContent ?? '').replace(/\s+/g, ' '));
    const body = await sheet();
    const groups = ['Entretenir le lien', 'Ce qui compte vraiment', 'Argent', 'Conflit']
      .filter((t) => body.includes(t));
    console.log('actions — groupes affichés :', groups.length, '/4', `(${groups.join(', ')})`);
    const rows = await page.locator('.sheet').last().locator('button.row').count();
    const shut = await page.locator('.sheet').last().locator('button.row.disabled').count();
    console.log('actions — lignes proposées :', rows, '· dont fermées avec leur raison :', shut);

    // Une action à manière : la modale doit offrir plusieurs tons, et le ton
    // choisi doit être celui qui part.
    const toned = page.locator('.sheet').last().locator('button.row:not(.disabled)')
      .filter({ hasText: /Te confier|Se disputer|Demander de l’argent/ }).first();
    if (!(await toned.count())) console.log('aucune action à manière proposée');
    else {
      await toned.scrollIntoViewIfNeeded();
      await toned.click();
      await page.waitForTimeout(400);
      const modal = (await page.locator('.overlay')
        .evaluateAll((els) => els.map((el) => el.textContent ?? '').join(' '))
        .catch(() => '')).replace(/\s+/g, ' ');
      const tones = ['Calmement', 'Directement', 'En insistant', 'En disant tout', 'Prudemment', 'En plaisantant']
        .filter((t) => modal.includes(t));
      console.log('actions — manières proposées :', tones.length, `(${tones.join(', ')})`);
      await page.screenshot({ path: `${SHOTS}/42a-maniere.png`, fullPage: true });

      // On en choisit une autre que la première, puis on part.
      const second = page.locator('.overlay button.row').nth(1);
      if (await second.count()) { await second.click(); await page.waitForTimeout(220); }
      const go = page.locator('.overlay').getByRole('button', { name: /Te confier|Se disputer|Demander de l’argent/ }).first();
      if (!(await go.count())) console.log('bouton de départ absent de la modale');
      else {
        await go.click({ force: true });
        await page.waitForTimeout(420);
        const out = (await page.locator('.overlay')
          .evaluateAll((els) => els.map((el) => el.textContent ?? '').join(' '))
          .catch(() => '')).replace(/\s+/g, ' ');
        console.log('actions — la manière choisie donne un résultat :', out.length > 20);
        await page.screenshot({ path: `${SHOTS}/42b-resultat.png`, fullPage: true });
        await clearEvents();
      }
    }

    // Prêter puis réclamer : une décision qui en crée une autre. C'est la
    // seule chose que ce chantier promet et qu'aucun compteur ne montre.
    const lendRow = page.locator('.sheet').last().locator('button.row:not(.disabled)')
      .filter({ hasText: /prêter de l’argent/i }).first();
    if (!(await lendRow.count())) console.log('« prêter » indisponible sur cette fiche');
    else {
      const before = await sheet();
      await lendRow.scrollIntoViewIfNeeded();
      await lendRow.click();
      await page.waitForTimeout(380);
      const slider = page.locator('.overlay input.range').first();
      if (await slider.count()) { await slider.fill('300'); await page.waitForTimeout(200); }
      const send = page.locator('.overlay').getByRole('button', { name: /prêter de l’argent/i }).first();
      if (await send.count()) { await send.click({ force: true }); await page.waitForTimeout(420); }
      await clearEvents();
      const after = await sheet();
      console.log('actions — prêter fait apparaître « réclamer » :',
        !/Réclamer ce qu/.test(before) && /Réclamer ce qu/.test(after));
      await page.screenshot({ path: `${SHOTS}/42c-dette.png`, fullPage: true });
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

// Se relever. Mesuré avant que cet écran existe, sur soixante vies qui font
// ce que le jeu propose : la dépendance atteint cent dans cent pour cent des
// vies, elle redescend de 1,2 point par an, et il n'y avait rien à faire —
// alors que le moteur la lisait partout. Ce qui doit se voir ici : où l'on en
// est, ce que chaque façon d'arrêter coûte, **la chance de rechute avant de
// décider**, et le fait qu'un groupe de parole reste fermé tant que personne
// n'est au courant.
await loadSave('fixture-dependance.mjs');
await goTab(/Agenda/);
{
  const health = page.getByRole('button', { name: /Médecin/ }).first();
  if (!(await health.count())) console.log('panneau de santé absent de l’Agenda');
  else {
    await health.scrollIntoViewIfNeeded();
    await health.click();
    await page.waitForTimeout(400);
    const panel = (await page.locator('.sheet').last()
      .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    console.log('dépendance — la santé annonce ce qui te tient :', /Se relever/.test(panel));

    const go = page.locator('.sheet').last().locator('button.row').filter({ hasText: /Se relever/ }).first();
    if (!(await go.count())) console.log('la ligne « se relever » est absente');
    else {
      await go.scrollIntoViewIfNeeded();
      await go.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/41-relever.png`, fullPage: true });
      const body = (await page.locator('.sheet').last()
        .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      console.log('se relever — les quatre façons :',
        ['T’arrêter seul', 'groupe de parole', 'suivi individuel', 'Une cure']
          .filter((t) => body.includes(t)).length, '/4',
        '· le groupe demande un témoin :', /quelqu’un soit au courant/.test(body),
        '· on peut en parler :', /En parler à quelqu’un/.test(body));

      // Le dire à quelqu'un doit ouvrir le groupe de parole : c'est le seul
      // prix qui ne s'achète pas, et il doit se voir changer l'écran.
      const someone = page.locator('.sheet').last().locator('button.row').last();
      const closedBefore = /quelqu’un soit au courant/.test(body);
      if (await someone.count()) {
        await someone.scrollIntoViewIfNeeded();
        await someone.click();
        await page.waitForTimeout(400);
        const said = (await page.locator('.overlay')
          .evaluateAll((els) => els.map((el) => el.textContent ?? '').join(' '))
          .catch(() => '')).replace(/\s+/g, ' ');
        console.log('se relever — en parler dit ce que ça a donné :',
          /écoute jusqu’au bout|hoche la tête/.test(said));
        await clearEvents();
        const after = (await page.locator('.sheet').last()
          .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
        console.log('se relever — le groupe s’ouvre une fois dit :',
          closedBefore && !/quelqu’un soit au courant/.test(after));
        await page.screenshot({ path: `${SHOTS}/41a-dit.png`, fullPage: true });
      }

      // Et s'inscrire : l'écran doit ensuite annoncer la rechute, la baisse
      // attendue et le coût — avant que l'année ne se joue.
      const enrol = page.locator('.sheet').last().locator('button.row:not(.disabled)')
        .filter({ hasText: /suivi individuel/ }).first();
      if (!(await enrol.count())) console.log('aucun programme ouvert');
      else {
        await enrol.scrollIntoViewIfNeeded();
        await enrol.click();
        await page.waitForTimeout(400);
        await clearEvents();
        const now = (await page.locator('.sheet').last()
          .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
        console.log('se relever — la rechute s’annonce avant de décider :',
          /% de rechute/.test(now), '· ce que l’année retire :', /point\(s\)/.test(now),
          '· retourner jouer est annoncé :', /doublerait la pression|la pression a doublé/.test(now));
        await page.screenshot({ path: `${SHOTS}/41b-inscrit.png`, fullPage: true });
      }
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

// Les rendez-vous. Trois mesures ont commandé ce système, et la troisième est
// celle que le navigateur doit confirmer : la fiche d'un inconnu affichait
// ses cinq traits à la seconde de la rencontre, si bien qu'il n'y avait rien
// à découvrir chez personne — et que les partenaires choisis étaient loyaux
// à 46 %, le hasard exact. Ce qui doit se voir ici : des « ? » là où l'on ne
// sait rien, une soirée qu'on joue moment par moment, et **la même ligne qui
// change** au retour. C'est exactement le piège de la ligne de savoir-faire,
// qui affichait le palier plutôt que le chiffre : payer ne laissait aucune
// trace, et seule une capture d'écran pouvait le dire.
await loadSave('fixture-sortie.mjs');
await goTab(/Proches/);
{
  const card = page.locator('button.row').filter({ hasText: /Béguin/ }).first();
  if (!(await card.count())) console.log('aucun béguin dans la liste des proches');
  else {
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/37-inconnu.png`, fullPage: true });
    const sheet = () => page.locator('.sheet').last()
      .evaluate((el) => (el.textContent ?? '').replace(/\s+/g, ' '));
    const before = await sheet();
    const unknowns = (before.match(/\?/g) ?? []).length;
    console.log('rendez-vous — traits couverts :', unknowns >= 5,
      `(${unknowns})`, '· la sortie est proposée :', /Sortir ensemble/.test(before));

    const go = page.locator('.sheet').last().locator('button.row:not(.disabled)')
      .filter({ hasText: /Proposer une sortie|Passer une soirée/ }).first();
    if (!(await go.count())) console.log('la ligne de sortie est fermée');
    else {
      await go.scrollIntoViewIfNeeded();
      await go.click();
      await page.waitForTimeout(400);
      const places = await page.locator('.sheet').last()
        .evaluate((el) => (el.textContent ?? '').replace(/\s+/g, ' '));
      console.log('rendez-vous — endroits proposés :',
        ['brocante'].length && /Un café|Une longue marche|Un bon restaurant/.test(places));
      await page.screenshot({ path: `${SHOTS}/37a-ou-aller.png`, fullPage: true });

      // La marche est gratuite : elle est ouverte même à qui n'a rien, ce
      // qui rend cette section du fumigène indépendante de la fortune du
      // personnage tiré.
      const walk = page.locator('.sheet').last().locator('button.row:not(.disabled)')
        .filter({ hasText: /Une longue marche/ }).first();
      if (!(await walk.count())) console.log('aucun endroit ouvert');
      else {
        await walk.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${SHOTS}/37b-soiree.png`, fullPage: true });

        // On joue la soirée jusqu'au bout : répondre, lire la réaction,
        // enchaîner. Le nombre de moments dépend de l'endroit.
        let answered = 0;
        let sawReaction = false;
        for (let guard = 0; guard < 12; guard++) {
          const reply = page.locator('.sheet').last().locator('button.row').first();
          if (await reply.count()) {
            await reply.click();
            await page.waitForTimeout(280);
            answered += 1;
            const after = await sheet();
            if (/Ce qui se passe/.test(after)) sawReaction = true;
          }
          const next = page.locator('.sheet').last()
            .getByRole('button', { name: /La suite|Fin de soirée/ });
          if (await next.count()) { await next.first().click(); await page.waitForTimeout(280); continue; }
          const home = page.locator('.sheet').last().getByRole('button', { name: 'Rentrer' });
          if (await home.count()) {
            await home.first().click();
            await page.waitForTimeout(420);
            break;
          }
          if (!(await reply.count())) break;
        }
        console.log('rendez-vous — moments joués :', answered, '· la réaction se lit :', sawReaction);

        const outcome = (await page.locator('.overlay')
          .evaluateAll((els) => els.map((el) => el.textContent ?? '').join(' '))
          .catch(() => '')).replace(/\s+/g, ' ');
        console.log('rendez-vous — la soirée dit ce qu’on a appris :',
          /Tu sais maintenant|Tu n’as rien appris/.test(outcome));
        await page.screenshot({ path: `${SHOTS}/37c-retour.png`, fullPage: true });
        await clearEvents();

        // Et la preuve : la fiche ne dit plus la même chose qu'avant.
        const after = await sheet();
        const left = (after.match(/\?/g) ?? []).length;
        console.log('rendez-vous — la fiche a changé :', after !== before,
          `· traits encore couverts : ${left} (avant ${unknowns})`);
        await page.screenshot({ path: `${SHOTS}/37d-connu.png`, fullPage: true });
      }
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

// Chiner, douter, vendre. Mesuré avant d'écrire le système : **0 % des vies
// jouées possédaient le moindre objet** — la boutique existait, personne n'y
// entrait, parce qu'on y achetait au prix affiché ce qu'on revendrait à 60 %.
// Trois choses doivent donc se voir ici, et aucune ne se voit sur une liste
// vide : d'où vient une pièce, qu'on ne sait pas encore ce que c'est, et ce
// que l'expertise change. C'est le même piège que la ligne de savoir-faire
// qui affichait le palier plutôt que le chiffre : payer ne laissait aucune
// trace à l'écran, et seul le navigateur pouvait le dire.
await loadSave('fixture-chine.mjs');
await goTab(/Avoirs/);
{
  const shop = page.locator('button.row').filter({ hasText: /Boutique/ }).first();
  if (!(await shop.count())) console.log('boutique absente de l’onglet Avoirs');
  else {
    await shop.scrollIntoViewIfNeeded();
    await shop.click();
    await page.waitForTimeout(420);
    // `innerText` ne rend que ce qui est peint : sur un panneau qui défile,
    // il manquerait tout ce qui est sous le pli.
    const body = (await page.locator('.sheet').last()
      .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    console.log('chiner — section « aller voir ailleurs » :', /Aller voir ailleurs/.test(body),
      '· provenances proposées :',
      ['brocante', 'vente après décès', 'lot fermé'].filter((t) => body.toLowerCase().includes(t)).length, '/3');
    await page.screenshot({ path: `${SHOTS}/36-chiner.png`, fullPage: true });

    // Une sortie ne rapporte pas toujours quelque chose : c'est la mécanique.
    // On y va jusqu'à ce qu'il en sorte un objet, ou jusqu'à épuisement des
    // deux sorties annuelles.
    const flea = page.locator('button.row:not(.disabled)').filter({ hasText: /La brocante/ }).first();
    let said = '';
    for (let go = 0; go < 2 && (await flea.count()); go++) {
      await flea.scrollIntoViewIfNeeded();
      await flea.click();
      await page.waitForTimeout(420);
      said = (await page.locator('.overlay').first()
        .evaluate((el) => el.textContent ?? '').catch(() => '')).replace(/\s+/g, ' ');
      await clearEvents();
      if (/Reste à savoir/.test(said)) break;
    }
    console.log('chiner — la sortie dit ce qu’elle a donné :',
      /Reste à savoir|Rien, cette fois|Tu n’avais pas de quoi/.test(said));
    await closeAllSheets();
  }

  const mine = page.locator('button.row').filter({ hasText: /Mes possessions/ }).first();
  if (!(await mine.count())) console.log('« mes possessions » absent de l’onglet Avoirs');
  else {
    await mine.scrollIntoViewIfNeeded();
    await mine.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/36a-possessions.png`, fullPage: true });
    const body = (await page.locator('.sheet').last()
      .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    console.log('objets — ensembles en cours :', /Ce qui se complète/.test(body),
      '· provenance et doute lisibles :', /Non expertisé|Authentifié|Copie/.test(body));

    const row = page.locator('.sheet').last().locator('button.row')
      .filter({ hasText: /Non expertisé/ }).first();
    if (!(await row.count())) console.log('aucun objet dans le doute à ouvrir');
    else {
      const before = (await row.innerText()).replace(/\s+/g, ' ');
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await page.waitForTimeout(400);
      const modal = (await page.locator('.overlay').first()
        .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      console.log('objet — expertise :', /Faire expertiser/.test(modal),
        '· ton propre œil :', /Juger toi-même/.test(modal),
        '· réserve et chances :', /Réserve/.test(modal) && /chances que le marteau/.test(modal));
      await page.screenshot({ path: `${SHOTS}/36b-objet.png`, fullPage: true });

      // Payer l'expertise doit *changer la ligne*. C'est tout l'objet du
      // système : le doute a un prix, et savoir peut faire mal.
      const expert = page.locator('.overlay button.row:not(.disabled)')
        .filter({ hasText: /Faire expertiser/ }).first();
      if (!(await expert.count())) console.log('expertise indisponible');
      else {
        await expert.click();
        await page.waitForTimeout(400);
        // La fiche de l'objet reste ouverte sous le résultat : viser « la
        // première modale » lisait la fiche, pas le verdict.
        const verdict = (await page.locator('.overlay')
          .evaluateAll((els) => els.map((el) => el.textContent ?? '').join(' '))
          .catch(() => '')).replace(/\s+/g, ' ');
        console.log('objet — le verdict tombe :', /Authentifié|Une copie|n’en est pas un/.test(verdict));
        await page.screenshot({ path: `${SHOTS}/36c-verdict.png`, fullPage: true });
        await clearEvents();
        const after = (await page.locator('.sheet').last().locator('button.row')
          .filter({ hasText: /Authentifié|Copie|Non expertisé/ }).first()
          .innerText().catch(() => '')).replace(/\s+/g, ' ');
        console.log('objet — la ligne a changé :', Boolean(after) && before !== after);
      }

      // Et la salle des ventes : la seule vente du jeu d'où l'on peut
      // repartir avec son objet.
      const sell = page.locator('.sheet').last().locator('button.row')
        .filter({ hasText: /Authentifié|Copie|Non expertisé/ }).first();
      if (await sell.count()) {
        await sell.scrollIntoViewIfNeeded();
        await sell.click();
        await page.waitForTimeout(380);
        const go = page.locator('.overlay').getByRole('button', { name: 'Mettre en vente' });
        if (!(await go.count())) console.log('bouton de mise en vente absent');
        else {
          await go.click({ force: true });
          await page.waitForTimeout(420);
          const hammer = (await page.locator('.overlay').first()
            .evaluate((el) => el.textContent ?? '').catch(() => '')).replace(/\s+/g, ' ');
          console.log('vente — le marteau tranche :', /Adjugé|Invendu|marteau ne tombe pas/.test(hammer));
          await page.screenshot({ path: `${SHOTS}/36d-vente.png`, fullPage: true });
          await clearEvents();
        }
      }
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

// Une vie ordinaire ne passe presque jamais quatorze ans en prison : les
// écrans de détention et d'évasion ne seraient donc jamais ouverts dans un
// vrai navigateur. On repart d'une sauvegarde construite par le moteur, par
// le même mécanisme que « Transférer la partie ».
await loadSave('fixture-jailed.mjs');

await tap(page.getByRole('button', { name: /Agenda/ }));
const jail = await openPanel(/an\(s\) restants/, '16-prison.png', async () => {
  await page.screenshot({ path: `${SHOTS}/16a-prison-complet.png`, fullPage: true });

  // Un codétenu : la fiche et ses actions propres à la détention.
  const mate = page.locator('.sheet').last().locator('button.row')
    .filter({ hasText: /relation/ }).first();
  if (await mate.count()) {
    await mate.scrollIntoViewIfNeeded();
    await mate.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/16b-codetenu.png`, fullPage: true });
    await closeSheet();
  }

  // Préparer, puis traverser la cour.
  const observe = page.getByRole('button', { name: /Observer les rondes/ }).first();
  if (await observe.count()) {
    await observe.scrollIntoViewIfNeeded();
    await observe.click();
    await page.waitForTimeout(250);
    await clearEvents();
  }

  const attempt = page.getByRole('button', { name: /Tenter cette nuit/ }).first();
  if (!(await attempt.count())) { console.log('évasion indisponible'); return; }
  await attempt.scrollIntoViewIfNeeded();
  await attempt.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/16c-cour.png` });

  const yard = page.locator('.minigame-surface');
  if (!(await yard.count())) return;
  const box = await yard.boundingBox();
  if (!box) return;
  // On remonte vers le périmètre par petits pas, sans courir : c'est la bonne
  // façon de jouer, et elle suffit à vérifier que la scène vit.
  for (const fy of [0.78, 0.62, 0.48, 0.34, 0.2, 0.08]) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * fy);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: `${SHOTS}/16d-traversee.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/16e-suite.png` });
  await clearEvents();
});
if (!jail) console.log('écran de détention introuvable');
await closeAllSheets();

console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'Aucune erreur console.');
await browser.close();
stop();
process.exit(errors.length ? 1 : 0);
