/**
 * Test de fumée : joue une vie entière dans un vrai navigateur et vérifie
 * qu'aucune erreur n'apparaît en console. Lance lui-même `vite preview`.
 *
 *   npm run smoke
 */

import { execFileSync, spawn } from 'node:child_process';
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
await tap(page.getByRole('button', { name: /Journal/ }));

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
