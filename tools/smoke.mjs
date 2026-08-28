/**
 * Test de fumée : joue une vie entière dans un vrai navigateur et vérifie
 * qu'aucune erreur n'apparaît en console. Lance lui-même `vite preview`.
 *
 *   npm run smoke
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
// Le pilote de l'évasion : le même code que `measure-evasion.mjs` mesure sur
// le moteur seul, injecté tel quel dans la page (il n'a aucun `import`).
import { makeEscapePilot } from './pilote-evasion.mjs';

const PILOTE = makeEscapePilot.toString();

const PORT = 4173;
const HERE = new URL('..', import.meta.url).pathname;
/*
 * On construit avant de servir : `vite preview` sert `dist/` tel quel, et
 * auditer la construction précédente revient à auditer le jeu d'avant.
 * `audit-parite.mjs` porte l'histoire complète de cette panne-là.
 */
execFileSync('npx', ['vite', 'build'], { cwd: HERE, stdio: 'ignore' });
/*
 * Le port doit être libre, et l'on tue le groupe de processus, pas seulement
 * `npx` : `vite preview` sur un port pris en choisit un autre en silence, et
 * `server.kill()` laissait le serveur derrière lui. `audit-parite.mjs` porte
 * l'histoire complète.
 */
await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', () => reject(new Error(
    `Le port ${PORT} est déjà pris — un serveur d'une exécution précédente traîne.`,
  )));
  probe.once('listening', () => probe.close(() => resolve()));
  probe.listen(PORT, '127.0.0.1');
});
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  cwd: HERE,
  detached: true,
});
const stop = () => {
  try { process.kill(-server.pid, 'SIGKILL'); } catch { /* déjà arrêté */ }
};
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
/**
 * Un vrai téléphone, et le plus étroit de la liste.
 *
 * Le fumigène jouait à 400×860, ce qui n'est la taille d'aucun appareil et
 * cache exactement les défauts que la passe mobile cherche : 360 points de
 * large est le cas contraignant, avec le doigt plutôt que la souris.
 */
const page = await browser.newPage({
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});
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
  const hair = page.locator('button[data-row]').filter({ hasText: /Les cheveux/ }).first();
  if (!(await hair.count())) console.log('visage : ligne « Les cheveux » absente');
  else {
    const before = (await hair.innerText()).replace(/\s+/g, ' ');
    await hair.scrollIntoViewIfNeeded();
    await hair.click();
    await page.waitForTimeout(300);
    const after = (await page.locator('button[data-row]').filter({ hasText: /Les cheveux/ })
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
    if ((await choice.count()) && !(await closed(choice))) { await choice.click({ force: true }); await page.waitForTimeout(90); continue; }
    const cont = page.locator('.overlay').getByRole('button', { name: 'Continuer' });
    if ((await cont.count()) && !(await closed(cont))) { await cont.click({ force: true }); await page.waitForTimeout(90); continue; }
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

/**
 * Une ligne de liste, désignée par son **titre**.
 *
 * `getByText('Marché immobilier')` visait n'importe quel texte de la page. Le
 * jour où le sous-titre d'une *autre* ligne a contenu les mêmes mots — « Tu ne
 * possèdes rien : le marché immobilier est là pour ça » — Playwright a trouvé
 * deux éléments et s'est arrêté net, en plein milieu du parcours. Le jeu
 * n'avait rien perdu ; c'est la façon de le désigner qui était trop large.
 *
 * On vise donc le titre d'une ligne, ce qui est ce qu'on voulait dire.
 */
function row(name) {
  return page.locator('button[data-row]')
    .filter({ has: page.locator('.ui-row-title, .row-title').filter({ hasText: name }) })
    .first();
}

/**
 * Une ligne est-elle refusée ?
 *
 * **Huit endroits de ce fichier posaient la question à l'ancienne classe**,
 * `classList.contains('disabled')`, qui n'existe plus : le vocabulaire de
 * listes marque un refus par l'attribut `data-closed` et la classe
 * `is-closed`. Les huit gardes rendaient donc `false` sur toutes les lignes
 * fermées du jeu, et le parcours cliquait dessus. Playwright attendait alors
 * trente secondes qu'un bouton désactivé devienne cliquable, puis s'arrêtait
 * net — au milieu du parcours, sur une ligne que le jeu refusait pour de
 * bonnes raisons.
 *
 * On garde l'ancienne classe dans la question : elle ne coûte rien, et le
 * jour où un vieil écran resurgirait, la garde tiendrait quand même.
 */
async function closed(locator) {
  if (!(await locator.count())) return true;
  return locator.evaluate((el) => el.hasAttribute('data-closed')
    || el.classList.contains('is-closed')
    || el.classList.contains('disabled')
    || el.getAttribute('aria-disabled') === 'true');
}

/**
 * Clique en s'assurant qu'aucune modale ne bloque — **et qu'il y a quelque
 * chose à cliquer.**
 *
 * Une ligne que le jeu refuse est un résultat de jeu, pas une panne : ce
 * fichier le dit déjà d'une ligne absente. Il ne le disait pas d'une ligne
 * fermée, et Playwright attendait alors trente secondes qu'un bouton
 * désactivé devienne cliquable avant d'arrêter tout le parcours. Trois fois
 * de suite, sur trois lignes différentes, chacune refusée pour une bonne
 * raison.
 */
async function tap(locator, what = '') {
  await clearEvents();
  if (await closed(locator)) {
    console.log('ligne fermée, on passe :', what || (await locator.count() ? '(sans nom)' : 'absente'));
    return false;
  }
  await locator.click();
  await page.waitForTimeout(200);
  return true;
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
  return page.locator('.sheet').last().locator('button[data-row]').first();
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
  // Fermée, c'est-à-dire refusée par le jeu : une raison est affichée à côté,
  // et il n'y a rien à photographier derrière.
  if (await closed(row.first())) { console.log('panneau refusé :', String(name)); return false; }
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

/**
 * Ce qu'un mini-jeu doit tenir sur un téléphone.
 *
 * §116 : aucun n'est terminé s'il ne marche qu'à la souris. On mesure donc,
 * sur la surface ouverte, ce qui empêche réellement de jouer au doigt — la
 * taille de la zone, le fait que le geste ne fasse pas défiler la page, que
 * le doigt change bien quelque chose, et qu'on puisse partir.
 *
 * Le geste est un **vrai geste tactile**, envoyé par le protocole du
 * navigateur (`Input.dispatchTouchEvent`). La version précédente disait le
 * faire et se servait de `page.mouse` : les événements de pointeur passaient
 * bien, mais avec `pointerType: 'mouse'`, et surtout un glissé à la souris
 * **ne fait jamais défiler une page**. La colonne « pas de défilement
 * parasite » ne pouvait donc pas échouer — elle ne mesurait rien.
 */
const seenMiniGames = new Set();

/** Le canal du navigateur, ouvert une fois : c'est lui qui porte le doigt. */
const touch = await page.context().newCDPSession(page);

async function touchDrag(x, y, dx, dy, steps = 10) {
  const point = (i) => [{ x: x + (dx * i) / steps, y: y + (dy * i) / steps, id: 1 }];
  const move = async (i) => {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(i) });
    await page.waitForTimeout(45);
  };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(0) });
  return {
    /** Le début du geste, avant qu'il ne puisse conclure quoi que ce soit. */
    async begun() { await move(1); await move(2); },
    async finish() { for (let i = 3; i <= steps; i++) await move(i); },
    async release() {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    },
  };
}

async function checkMiniGame(hint) {
  const surface = page.locator('.minigame-surface').first();
  if (!(await surface.count())) return;
  const box = await surface.boundingBox();
  if (!box) return;
  // Le jeu se nomme lui-même : la barre porte son objectif, qui lui est
  // propre. Deviner d'après l'endroit du parcours donnait de faux noms dès
  // qu'un écran en ouvrait deux.
  const goal = (await page.locator('.minigame-bar .small').first()
    .textContent().catch(() => '') ?? '').replace(/\s+/g, ' ').trim();
  const name = goal ? goal.slice(0, 46) : hint;
  if (seenMiniGames.has(name)) return;
  seenMiniGames.add(name);

  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.8;

  /*
   * **On écoute ce que le jeu reçoit, pas seulement ce qu'il affiche.**
   *
   * Comparer l'aspect de la scène avant et après le geste paraissait la
   * mesure évidente. Elle ne l'est pas : ces onze jeux ne parlent pas la même
   * langue. La plupart n'écrivent rien dans leur surface — ils déplacent des
   * pions par des styles — et plusieurs bougent tout seuls, poursuivants et
   * faisceaux compris. Selon le jeu, la même mesure disait « ne répond pas »
   * sur un jeu qui répond parfaitement, ou « répond » sur une scène qui
   * n'aurait pas bougé d'un cheveu sans son animation.
   *
   * La question du §115 est plus simple que ça : **est-ce que le doigt
   * arrive ?** On pose donc une oreille sur la surface et l'on compte les
   * événements de pointeur, avec leur nature. Un jeu câblé à la souris seule
   * n'en recevrait aucun de type `touch` — et c'est très exactement le défaut
   * que ce test existe pour attraper.
   */
  await page.evaluate(() => {
    const el = document.querySelector('.minigame-surface');
    if (!el) return;
    const heard = { down: 0, move: 0, mouse: 0, touch: 0, pen: 0 };
    window.__doigt = heard;
    const note = (kind) => (e) => {
      heard[kind] += 1;
      if (e.pointerType in heard) heard[e.pointerType] += 1;
    };
    el.addEventListener('pointerdown', note('down'), true);
    el.addEventListener('pointermove', note('move'), true);
  });

  // **Ce qui est sous le doigt.** Une surface parfaitement jouable ne l'est
  // pas si une modale la recouvre — et c'est exactement ce qui arrivait à la
  // course : elle démarrait derrière le message qui l'annonçait, pendant que
  // les poursuivants avançaient sur un personnage immobile. Aucune des autres
  // mesures ne pouvait le voir.
  const before = await page.evaluate(({ x, y }) => ({
    scroll: document.querySelector('.app-body')?.scrollTop ?? 0,
    scene: document.querySelector('.minigame-surface')?.innerHTML ?? '',
    touchAction: getComputedStyle(document.querySelector('.minigame')).touchAction,
    select: getComputedStyle(document.querySelector('.minigame')).userSelect,
    reachable: Boolean(document.elementFromPoint(x, y)?.closest('.minigame')),
  }), { x: cx, y: cy });

  // Un vrai glissé au doigt, du bas vers le haut : le geste qui, sans
  // `touch-action`, fait défiler la page au lieu de jouer.
  const gesture = await touchDrag(cx, cy, 0, -box.height * 0.5);

  await gesture.begun();
  await gesture.finish();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    scroll: document.querySelector('.app-body')?.scrollTop ?? 0,
    scene: document.querySelector('.minigame-surface')?.innerHTML ?? '',
    heard: window.__doigt ?? { down: 0, move: 0, touch: 0 },
  }));
  await gesture.release();

  // Le bouton du jeu **qu'on est en train de mesurer** : un écran peut en
  // monter deux — la fuite derrière l'évasion — et viser « le premier
  // Partir de la page » tombait sur celui d'un jeu masqué, de hauteur nulle.
  const quit = surface.locator('xpath=ancestor::div[contains(@class,"minigame")][1]')
    .getByRole('button', { name: /Partir/ }).first();
  const quitBox = (await quit.count()) ? await quit.boundingBox() : null;
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });

  console.log(`mini-jeu ${name} —`
    + ` surface ${Math.round(box.width)}×${Math.round(box.height)}`
    + ` · rien ne le recouvre : ${before.reachable}`
    + ` · le doigt arrive : ${after.heard.touch > 0 && after.heard.down > 0}`
    // Trois issues, pas deux : une partie qui s'achève pendant la mesure
    // n'est pas une scène figée, et l'écrire « false » laissait croire à un
    // défaut là où il n'y en a pas. C'est le cas de la table de jeu, où
    // maintenir l'appui veut dire clore la manche.
    + ` · la scène bouge : ${after.scene === ''
      ? 'la partie s’est achevée'
      : String(before.scene !== after.scene)}`
    + ` · pas de défilement parasite : ${before.scroll === after.scroll}`
    + ` · geste capté : ${before.touchAction === 'none'}`
    + ` · sélection bloquée : ${before.select === 'none'}`
    /*
     * Même remarque que pour la scène, et pour la même raison : une partie
     * déjà achevée n'a plus de bouton « Partir » — l'hôte a remplacé la
     * surface par son compte rendu. L'écrire « false » désigne un défaut là
     * où il n'y en a pas, et c'est exactement le genre de faux positif qui
     * fait cesser de lire un rapport.
     */
    + ` · quitter atteignable : ${after.scene === ''
      ? 'partie achevée'
      : Boolean(quitBox) && quitBox.height >= 40}`
    + ` · aucun débordement : ${!overflow}`);
}

/**
 * Avance de `n` années en répondant à tout ce qui se présente.
 *
 * **Et s'arrête quand il n'y a plus d'années à prendre.** Le bouton disparaît
 * à la mort du personnage : la boucle attendait alors trente secondes qu'il
 * revienne, puis faisait échouer tout le parcours sur une fin de vie, qui est
 * un résultat de jeu parfaitement normal. Une vie qui se termine n'est pas
 * une panne de l'interface.
 */
async function ageBy(n) {
  for (let year = 0; year < n; year++) {
    await clearEvents();
    const next = page.getByLabel('Prendre un an');
    if (!(await next.count())) {
      console.log(`la vie s’est arrêtée après ${year} année(s) de plus`);
      return year;
    }
    await next.click({ force: true });
    await page.waitForTimeout(90);
    await clearEvents();
  }
  return n;
}

// Enfance : demander quelque chose à ses parents n'a de sens qu'avant vingt ans.
await ageBy(8);

// La maison, avant l'école : c'est la période que l'audit avait trouvée vide.
await tap(page.getByRole('button', { name: /Études/ }));
await openPanel(/À la maison/, '02c-enfance.png', async () => {
  const outside = page.getByRole('button', { name: /Sortir voir qui est là/ }).first();
  if ((await outside.count()) && !(await closed(outside))) {
    await outside.scrollIntoViewIfNeeded();
    await outside.click();
    await page.waitForTimeout(220);
    await clearEvents();
  }
  const activity = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /histoire|Cuisiner|Jouer dehors|questions/ }).first();
  if ((await activity.count()) && !(await closed(activity))) {
    await activity.scrollIntoViewIfNeeded();
    await activity.click();
    await page.waitForTimeout(280);
    await page.screenshot({ path: `${SHOTS}/02d-avec-qui.png`, fullPage: true });
    const who = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])').first();
    if ((await who.count()) && !(await closed(who))) {
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
await tap(page.getByRole('button', { name: /Gens/ }));
const parentRow = page.locator('.app-body button[data-row]').filter({ hasText: /Père|Mère/ }).first();
if ((await parentRow.count()) && !(await closed(parentRow))) {
  await parentRow.scrollIntoViewIfNeeded();
  await parentRow.click();
  await page.waitForTimeout(280);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/02a-parent.png`, fullPage: true });

  const request = page.locator('.sheet button[data-row]').filter({ hasText: /téléphone|ordinateur|animal|activité|Rentrer plus tard|argent de poche/ }).first();
  if ((await request.count()) && !(await closed(request))) {
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
await tap(page.getByRole('button', { name: /Études/ }));
const enterSchool = page.getByRole('button', { name: /Entrer dans l’établissement/ });
if ((await enterSchool.count()) && !(await closed(enterSchool))) {
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
await tap(page.getByRole('button', { name: /Études/ }));
await page.screenshot({ path: `${SHOTS}/04-parcours.png` });

// Offres d'emploi
const offers = row('Consulter les offres d’emploi');
if (await offers.count()) {
  await tap(offers);
  await page.screenshot({ path: `${SHOTS}/05-offres.png` });
  // Postuler à la première offre non bloquée
  const rows = page.locator('.sheet-body button[data-row]:not([data-closed])');
  const n = await rows.count();
  console.log('Offres accessibles :', n);
  // Un entretien manqué est un résultat de jeu normal ; on en tente
  // plusieurs pour que la suite du parcours ait un emploi à montrer.
  for (let i = 0; i < Math.min(n, 5); i++) {
    const row = page.locator('.sheet-body button[data-row]:not([data-closed])').nth(0);
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
  const member = page.locator('.sheet').last().locator('button[data-row]').last();
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
  const trade = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Petits travaux|Cours particuliers|Créations à vendre|Réparation/ }).first();
  if (!(await trade.count())) { console.log('aucun métier indépendant accessible'); return; }
  await trade.scrollIntoViewIfNeeded();
  await trade.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/04d-tarif.png`, fullPage: true });

  // Une commande, si le carnet en propose une : c'est la partie jouable.
  const gig = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /🟢|🟡|🔴/ }).first();
  if ((await gig.count()) && !(await closed(gig))) {
    await gig.scrollIntoViewIfNeeded();
    await gig.click();
    await page.waitForTimeout(320);
    await clearEvents();
  }

  // L'entreprise : le catalogue, puis la maison si on peut l'ouvrir.
  const tab = page.locator('.sheet').last().getByRole('button', { name: 'Ton entreprise' }).first();
  if ((await tab.count()) && !(await closed(tab))) {
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
await tap(row('Marché immobilier'));
await page.screenshot({ path: `${SHOTS}/08-immobilier.png` });
await tap(page.getByLabel('Retour'));

// Les placements : on ouvre le marché, on place, puis on revend une part.
// Le portefeuille est le seul écran du jeu où l'on peut perdre de l'argent
// en ne faisant rien, alors on vérifie qu'il s'affiche et qu'il répond.
await tap(row('Portefeuille'));
await page.screenshot({ path: `${SHOTS}/08a-placements.png`, fullPage: true });
const asset = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
  .filter({ hasText: /Livret|Fonds large|Obligations/ }).first();
if ((await asset.count()) && !(await closed(asset))) {
  await asset.scrollIntoViewIfNeeded();
  await asset.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/08b-achat.png` });
  const confirm = page.locator('.modal button').filter({ hasText: /Placer/ }).first();
  if ((await confirm.count()) && !(await closed(confirm))) {
    await confirm.click();
    await page.waitForTimeout(300);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/08c-portefeuille.png`, fullPage: true });

    // Et la revente : c'est là que se voient les frais et l'impôt.
    const line = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /placés/ }).first();
    if ((await line.count()) && !(await closed(line))) {
      await line.scrollIntoViewIfNeeded();
      await line.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SHOTS}/08d-vente.png` });
      const sell = page.locator('.modal button').filter({ hasText: /Vendre/ }).first();
      if ((await sell.count()) && !(await closed(sell))) { await sell.click(); await page.waitForTimeout(300); await clearEvents(); }
    }
  }
} else {
  console.log('aucun placement accessible');
}
await closeAllSheets();

// Onglet Proches
await tap(page.getByRole('button', { name: /Gens/ }));
await page.screenshot({ path: `${SHOTS}/09-proches.png` });
const firstPerson = page.locator('.app-body button[data-row]').first();
if (await firstPerson.count()) {
  await tap(firstPerson);
  await page.screenshot({ path: `${SHOTS}/10-fiche-pnj.png` });
  const talk = row('Discuter');
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

  const target = page.locator('.sheet').last().locator('button[data-row]').first();
  if ((await target.count()) && !(await closed(target))) {
    await target.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/12c-minijeu.png` });

    // Jouer : approcher la main d'une poche et maintenir l'appui.
    await checkMiniGame('surface');
  const surface = page.locator('.minigame-surface');
    if (await surface.count()) {
      await checkMiniGame('pickpocket');
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
  if ((await milieu.count()) && !(await closed(milieu))) {
    await milieu.scrollIntoViewIfNeeded();
    await milieu.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/12m-milieu.png`, fullPage: true });
    const join = page.getByRole('button', { name: /Se faire présenter/ }).first();
    if ((await join.count()) && !(await closed(join))) {
      await join.scrollIntoViewIfNeeded();
      await join.click();
      await page.waitForTimeout(250);
      await clearEvents();
    }
    const fence = page.getByRole('button', { name: /Receleur/ }).first();
    if ((await fence.count()) && !(await closed(fence))) {
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

    const house = page.locator('.sheet').last().locator('button[data-row]').first();
    if ((await house.count()) && !(await closed(house))) {
      await house.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/12f-cambriolage.png` });

      // On traverse la maison en visant quelques points successifs : le
      // plan est tiré au sort, on ne peut pas viser une pièce précise.
      const plan = page.locator('.minigame-surface');
      if (await plan.count()) {
        await checkMiniGame('cambriolage');
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
  for (const row of await page.locator('.sheet button[data-row]:not([data-closed])').all()) {
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
  const lawyer = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])').first();
  if ((await lawyer.count()) && !(await closed(lawyer))) {
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
  if ((await observe.count()) && !(await closed(observe))) {
    await observe.scrollIntoViewIfNeeded();
    await observe.click();
    await page.waitForTimeout(220);
    await clearEvents();
  }

  const attempt = sheet.getByRole('button', { name: /Tenter cette nuit/ }).first();
  if ((await attempt.count()) && !(await closed(attempt))) {
    await attempt.scrollIntoViewIfNeeded();
    await attempt.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/12k-cour.png` });

    await checkMiniGame('cour');
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
const sportRow = page.locator('.sheet-body button[data-row]:not([data-closed])').first();
if (await sportRow.count()) { await tap(sportRow); await clearEvents(); }
await tap(page.getByLabel('Retour'));

// Profil, puis la fiche de caractère et la trajectoire.
await tap(page.getByLabel('Profil complet'));
await page.screenshot({ path: `${SHOTS}/14-profil.png` });

await tap(row('Fiche de caractère'));
await page.screenshot({ path: `${SHOTS}/14a-caractere.png`, fullPage: true });
for (const view of ['Ce qu’il vit', 'Tout']) {
  await page.getByRole('button', { name: view }).click({ force: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/14b-caractere-${view === 'Tout' ? 'tout' : 'vie'}.png`, fullPage: true });
}
await closeSheet();

await tap(row('Trajectoire'));
// Ouvrir la première question posable : c'est là que la chaîne de causes
// s'affiche, donc l'endroit qu'il faut vraiment avoir rendu au moins une fois.
const question = page.locator('.sheet .sheet-body button[data-row]').last();
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
await tap(row('Portefeuille'));
await page.screenshot({ path: `${SHOTS}/17-placements.png`, fullPage: true });

const buyable = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
  .filter({ hasText: /Livret|Fonds large|Obligations|Métal/ });
const wanted = Math.min(3, await buyable.count());
for (let i = 0; i < wanted; i++) {
  // On répartit sur plusieurs lignes : c'est la mécanique centrale de
  // l'écran, et elle ne s'affiche qu'à partir de deux positions.
  const row = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Livret|Fonds large|Obligations|Métal/ }).nth(i);
  if (!(await row.count())) break;
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(250);
  if (i === 0) await page.screenshot({ path: `${SHOTS}/17a-achat.png` });
  const confirm = page.locator('.overlay button').filter({ hasText: /Placer/ }).first();
  if ((await confirm.count()) && !(await closed(confirm))) {
    await confirm.click();
    await page.waitForTimeout(250);
  }
  await clearEvents();
}
await page.screenshot({ path: `${SHOTS}/17b-portefeuille.png`, fullPage: true });

// La revente : c'est là que se voient les frais et l'impôt.
const line = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
  .filter({ hasText: /placés/ }).first();
if ((await line.count()) && !(await closed(line))) {
  await line.scrollIntoViewIfNeeded();
  await line.click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/17c-vente.png` });
  const sell = page.locator('.overlay button').filter({ hasText: /Vendre/ }).first();
  if ((await sell.count()) && !(await closed(sell))) { await sell.click(); await page.waitForTimeout(300); }
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
  const mission = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /tournée|paquet|comprendre/ }).first();
  if ((await mission.count()) && !(await closed(mission))) {
    await mission.scrollIntoViewIfNeeded();
    await mission.click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SHOTS}/18b-mission.png`, fullPage: true });
    const go = page.locator('.sheet').last().locator('button.pill').filter({ hasText: /Y aller/ }).first();
    if ((await go.count()) && !(await closed(go))) {
      await go.click();
      await page.waitForTimeout(300);
      await clearEvents();
    }
  } else {
    console.log('aucune mission accessible');
  }

  // Le carnet : chercher quelqu'un.
  const fence = page.getByRole('button', { name: /Receleur/ }).first();
  if ((await fence.count()) && !(await closed(fence))) {
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
await tap(page.getByRole('button', { name: /Études/ }));
await openPanel(/caisse|salarié/, '18-entreprise.png', async () => {
  await page.screenshot({ path: `${SHOTS}/18a-entreprise-complet.png`, fullPage: true });

  // Le levier central : embaucher quand la demande dépasse la capacité.
  const hire = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Embaucher/ }).first();
  if ((await hire.count()) && !(await closed(hire))) {
    await hire.scrollIntoViewIfNeeded();
    await hire.click();
    await page.waitForTimeout(300);
    await clearEvents();
  }

  // La sortie : les repreneurs et leurs clauses.
  const list = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Chercher un repreneur/ }).first();
  if ((await list.count()) && !(await closed(list))) {
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
  const interview = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Donner une interview/ }).first();
  if ((await interview.count()) && !(await closed(interview))) {
    await interview.scrollIntoViewIfNeeded();
    await interview.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/19b-entretien.png`, fullPage: true });
    // On répond aux trois questions : c'est le parcours complet.
    for (let round = 0; round < 3; round++) {
      const answer = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
  const rental = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Loué à|À louer|dossier|Vide depuis/ }).first();
  if (!(await rental.count())) { console.log('aucun bien locatif visible'); return; }
  await rental.scrollIntoViewIfNeeded();
  await rental.click();
  await page.waitForTimeout(320);
  // Surtout pas de `clearEvents` ici : la fiche du bien est elle-même une
  // modale, et le nettoyeur d'événements la refermerait en cliquant sur le
  // voile — on ne verrait jamais la gestion locative.
  const manage = page.getByRole('button', { name: /Gérer la location/ }).first();
  if ((await manage.count()) && !(await closed(manage))) {
    await manage.scrollIntoViewIfNeeded();
    await manage.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/21a-locataire.png`, fullPage: true });

    /*
     * **Lui parler.** La tension — ce que le loyer pèse sur ses revenus —
     * décidait déjà de ses impayés dans le moteur et n'était lisible nulle
     * part. On vérifie qu'elle le devient, et que les arrangements ne
     * s'ouvrent qu'après avoir su.
     */
    {
      const read = async () => (await page.locator('.sheet').last()
        .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      const before = await read();
      const closedFirst = !/Étaler ce qu’il doit/.test(before);

      const visit = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
        .filter({ hasText: /Passer voir/ }).first();
      if (!((await visit.count()) && !(await closed(visit)))) {
        console.log('aucune visite possible — la fixture ne tient plus sa promesse');
      } else {
        await visit.scrollIntoViewIfNeeded();
        await visit.click();
        await page.waitForTimeout(420);
        await clearEvents();
        const after = await read();
        console.log('locataire — on peut passer le voir :', true,
          '· ce que le loyer lui pèse se lit :', /problème|y pense|C’est juste|n’y arrive pas|plus qu’il ne peut/.test(after),
          '· les arrangements n’étaient pas là avant :', closedFirst,
          '· ils le sont après :', /Étaler ce qu’il doit|Baisser le loyer/.test(after),
          '· et chacun dit ce qu’il coûte :', /Ne coûte rien tout de suite|Coûte du revenu|Coûte tout l’arriéré/.test(after));
        await page.screenshot({ path: `${SHOTS}/21c-locataire-parle.png`, fullPage: true });
      }
    }

    // Trancher ce qui attend une décision : travaux, renouvellement, dossier.
    const decision = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Faire les travaux|Aligner sur le marché|Publier l’annonce/ }).first();
    if ((await decision.count()) && !(await closed(decision))) {
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

const heir = page.locator('button[data-row]').filter({ hasText: /ton enfant/ }).first();
if ((await heir.count()) && !(await closed(heir))) {
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
  await tap(page.getByRole('button', { name: /Gens/ }));
  await page.screenshot({ path: `${SHOTS}/20b-famille-reprise.png`, fullPage: true });
  await ageBy(2);
} else {
  console.log('aucun héritier proposé');
}

/* ------------------------------------------------------------------ */
/* Le voyage à deux, depuis une partie fabriquée                       */
/* ------------------------------------------------------------------ */

// L'écran ne dit quelque chose qu'avec des compagnons possibles et de quoi
// partir — et surtout des accords contrastés, sans quoi la lecture affiche la
// même appréciation pour tout le monde et ne montre rien.
await loadSave('fixture-voyage.mjs');
await tap(page.getByRole('button', { name: /Agenda/ }));
await openPanel(/Voyages/, '15a-voyages.png', async () => {
  const read = async () => (await page.locator('.sheet').last()
    .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');

  const together = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Partir avec quelqu’un/ }).first();
  if (!(await together.count())) { console.log('le voyage — l’entrée est absente'); return; }
  await together.scrollIntoViewIfNeeded();
  await together.click();
  await page.waitForTimeout(320);
  await clearEvents();

  // Choisir une destination, puis lire ce qui est annoncé pour chaque proche.
  const dest = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Road trip|Escapade urbaine|Séjour balnéaire/ }).first();
  if (!(await dest.count())) { console.log('le voyage — aucune destination'); return; }
  await dest.scrollIntoViewIfNeeded();
  await dest.click();
  await page.waitForTimeout(320);
  await clearEvents();
  const sheet = await read();
  await page.screenshot({ path: `${SHOTS}/15b-voyage-avec-qui.png`, fullPage: true });

  const judged = /rien à faire ensemble|risque de mal tourner|devrait aller|entendrez bien|exactement le voyage/;
  console.log('le voyage — l’accord est annoncé :', judged.test(sheet),
    '· il se distingue de la relation :', /relation \d+/.test(sheet),
    '· et il est dit que ce n’est pas la même chose :',
    /n’est pas la relation/.test(sheet));

  // Choisir quelqu'un : c'est là que les trois classes s'ouvrent.
  const who = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: judged }).first();
  if ((await who.count()) && !(await closed(who))) {
    await who.scrollIntoViewIfNeeded();
    await who.click();
    await page.waitForTimeout(320);
    await clearEvents();
    const withClasses = await read();
    console.log('  les classes — les trois sont là :',
      /Au plus juste/.test(withClasses) && /Sans se priver/.test(withClasses)
      && /En grand/.test(withClasses),
      '· et elles disent ce qu’elles achètent :',
      /par personne/.test(withClasses));
    await page.screenshot({ path: `${SHOTS}/15c-voyage-classe.png`, fullPage: true });

    // Partir : la situation du séjour doit s'ouvrir, avec ses deux options.
    const cls = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Sans se priver/ }).first();
    if ((await cls.count()) && !(await closed(cls))) {
      await cls.scrollIntoViewIfNeeded();
      await cls.click();
      await page.waitForTimeout(420);
      await clearEvents();
      const stay = await read();
      console.log('  le séjour — une situation arrive :', /Comment tu le prends/.test(stay),
        '· avec des façons de la prendre :', /tomber juste ou à côté/.test(stay));
      await page.screenshot({ path: `${SHOTS}/15d-voyage-sejour.png`, fullPage: true });
    } else {
      console.log('  le séjour — aucune classe ouvrable');
    }
  } else {
    console.log('  les classes — aucun compagnon ouvrable');
  }
});
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* Les obsèques, depuis une partie fabriquée                           */
/* ------------------------------------------------------------------ */

// La scène n'existe que l'année d'un décès de proche, et elle ne montre
// quelque chose que s'il y a **à la fois** des présents et des absents : la
// moitié de l'écran est la liste de ceux qui ne viendront pas, avec leur
// raison. Une vie tirée au hasard donne presque toujours l'un des extrêmes.
await loadSave('fixture-obseques.mjs');
await tap(page.getByRole('button', { name: /Gens/ }));
{
  const read = async () => (await page.locator('.sheet, .app').last()
    .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');

  const entry = page.locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Les obsèques/ }).first();
  if (!(await entry.count())) {
    console.log('les obsèques — l’entrée est absente');
  } else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(360);
    await clearEvents();
    const sheet = await read();
    await page.screenshot({ path: `${SHOTS}/21a-obseques.png`, fullPage: true });

    console.log('les obsèques — les quatre formes sont là :',
      /Ne rien organiser/.test(sheet) && /Chez soi/.test(sheet)
      && /Un service/.test(sheet) && /Tout ce qu’il faut/.test(sheet),
      '· qui viendra et qui ne viendra pas :',
      /Qui viendra/.test(sheet) && /Qui ne viendra pas/.test(sheet),
      '· et chaque absent donne sa raison :',
      /ne vous parlez plus|est détenu|pas parlé depuis|état de faire le voyage|prévenu à temps|vous restait|te doit rien/.test(sheet),
      '· les phrases portent le fait sur lequel elles s’appuient :',
      /Tu l’as connu \d+ ans|Ce qu’il pensait de toi|Vous vous êtes parlé/.test(sheet));

    // Choisir une forme, puis une phrase, puis y aller : le compte de présents
    // affiché en haut doit bouger avec la forme.
    const grand = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Tout ce qu’il faut/ }).first();
    if ((await grand.count()) && !(await closed(grand))) {
      const before = await read();
      await grand.scrollIntoViewIfNeeded();
      await grand.click();
      await page.waitForTimeout(320);
      await clearEvents();
      const after = await read();
      const count = (t) => Number((t.match(/(\d+) personnes?/) ?? [])[1] ?? -1);
      console.log('  la portée s’achète : ', count(before), '→', count(after),
        '·', count(after) >= count(before));
      await page.screenshot({ path: `${SHOTS}/21b-obseques-forme.png`, fullPage: true });
    }

    // Aller le dire soi-même : le geste est porté par le bouton de droite et
    // non par la ligne, qui est fermée. C'est le seul endroit de l'écran où
    // l'on peut encore changer qui sera là.
    const goTell = page.locator('.sheet').last()
      .locator('[data-row][data-closed] button.btn').first();
    if ((await goTell.count())) {
      const before = await read();
      await goTell.scrollIntoViewIfNeeded();
      await goTell.click();
      await page.waitForTimeout(320);
      await clearEvents();
      const after = await read();
      const left = (t) => Number((t.match(/(\d+) visites? possibles?/) ?? [])[1] ?? -1);
      console.log('  aller le dire soi-même :', left(before), '→', left(after),
        '·', left(after) === left(before) - 1);
    } else {
      console.log('  aller le dire soi-même — aucun absent joignable');
    }

    const word = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Que tu ne sais pas quoi dire/ }).first();
    if ((await word.count()) && !(await closed(word))) {
      await word.scrollIntoViewIfNeeded();
      await word.click();
      await page.waitForTimeout(280);
      await clearEvents();
    }

    const go = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Y aller/ }).first();
    if ((await go.count()) && !(await closed(go))) {
      await go.scrollIntoViewIfNeeded();
      await go.click();
      await page.waitForTimeout(460);
      // Le résultat arrive en modale par-dessus la feuille : lire « la dernière
      // feuille » lisait l'écran des obsèques, pas ce qui vient de se passer.
      const outcome = (await page.locator('.overlay')
        .evaluateAll((els) => els.map((el) => el.textContent ?? '').join(' '))
        .catch(() => '')).replace(/\s+/g, ' ');
      console.log('  le jour a lieu :', /est venue|sont venues|Personne n’est venu/.test(outcome),
        '· et il est chiffré :', /Cela t’a coûté/.test(outcome));
      await page.screenshot({ path: `${SHOTS}/21c-obseques-jour.png`, fullPage: true });
      await clearEvents();
    } else {
      console.log('  le jour — « Y aller » est fermé');
    }
  }
}
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* L'équipe, depuis une partie fabriquée                               */
/* ------------------------------------------------------------------ */

// Monter une entreprise, lui faire de la demande puis embaucher demande une
// vie entière et de la chance : la marche serait arrivée sur un écran vide,
// sans salarié à ouvrir ni candidat à comparer.
await loadSave('fixture-equipe.mjs');
await tap(page.getByRole('button', { name: /Études/ }));
await clearEvents();
{
  const read = async () => (await page.locator('.sheet').last()
    .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');

  const venture = row('Le Comptoir') ;
  const entry = (await venture.count())
    ? venture
    : page.locator('button[data-row]').filter({ hasText: /Ouvrir une entreprise|Café/ }).first();
  if (!(await entry.count())) { console.log('l’équipe — entreprise introuvable'); }
  else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(340);
    await clearEvents();

    const crew = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Ceux qui travaillent pour toi|Recruter quelqu’un/ }).first();
    if (!(await crew.count())) {
      console.log('l’équipe — l’entrée n’est pas là');
    } else {
      await crew.scrollIntoViewIfNeeded();
      await crew.click();
      await page.waitForTimeout(340);
      await clearEvents();
      const sheet = await read();
      await page.screenshot({ path: `${SHOTS}/19d-equipe.png`, fullPage: true });

      console.log('l’équipe — les équivalents se lisent :', /équivalent\(s\)/.test(sheet),
        '· ce que vaut chacun aussi :', /Il apprend encore|Il fait l’affaire|Il est bon|Il est très bon|pas deux comme lui/.test(sheet),
        '· et ce qu’il en pense :', /pied dehors|regarde les annonces|rien de plus|bien ici|pour rien au monde/i.test(sheet),
        '· des candidats à comparer :', /Ce qu’il demande|Le minimum qu’il accepte/.test(sheet));

      // Ouvrir un salarié : c'est là que la lecture complète s'affiche.
      const one = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
        .filter({ hasText: /Il apprend encore|Il fait l’affaire|Il est bon|Il est très bon|pas deux comme lui/ }).first();
      if ((await one.count()) && !(await closed(one))) {
        await one.scrollIntoViewIfNeeded();
        await one.click();
        await page.waitForTimeout(320);
        await clearEvents();
        const card = await read();
        console.log('  la fiche — les trois lectures tiennent :',
          /Ce qu’il vaut/.test(card) && /Ce qu’il en pense/.test(card)
          && /Ce qu’il pèse en production/.test(card),
          '· ce qu’on lui verse contre ce qu’il demandait :',
          /% de ce qu’il demandait/.test(card));
        await page.screenshot({ path: `${SHOTS}/19e-salarie.png`, fullPage: true });
        await closeSheet();
      } else {
        console.log('  la fiche — aucun salarié ouvrable');
      }
    }
  }
}
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* La route, depuis une partie fabriquée                               */
/* ------------------------------------------------------------------ */

// L'écran ne montre l'essentiel — ce qu'on porte, ce que ça vaudrait ailleurs,
// la probabilité d'être contrôlé — qu'une fois qu'il y a quelque chose sur les
// bras. Une vie tirée au hasard y arrive les mains vides.
await loadSave('fixture-route.mjs');
await tap(page.getByRole('button', { name: /Agenda/ }));
await openPanel(/Activités illégales/, '18b-illegal-route.png', async () => {
  const read = async () => (await page.locator('.sheet').last()
    .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');

  const entry = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /La route/ }).first();
  if (!(await entry.count())) { console.log('la route — entrée absente'); return; }
  await entry.scrollIntoViewIfNeeded();
  await entry.click();
  await page.waitForTimeout(340);
  await clearEvents();
  const sheet = await read();
  await page.screenshot({ path: `${SHOTS}/18c-route.png`, fullPage: true });

  console.log('la route — la charge se lit :', /de charge sur/.test(sheet),
    '· le risque d’être contrôlé aussi :', /% d’être contrôlé/.test(sheet),
    '· la carte annonce des destinations :', /Tu y gagnerais|Tu y perdrais/.test(sheet),
    '· les marchandises disent leur prix :', /l’unité|jusqu’à/.test(sheet));

  // Regarder une marchandise : c'est là que la carte des régions s'ouvre.
  const good = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Pièces sans numéro|Montres|Verrerie|Minerai|Semences|Bobines/ }).first();
  if ((await good.count()) && !(await closed(good))) {
    await good.scrollIntoViewIfNeeded();
    await good.click();
    await page.waitForTimeout(320);
    await clearEvents();
    const card = await read();
    console.log('  la fiche — encombrement et discrétion :',
      /encombrement/.test(card) && /discret|se remarque|quelconque/.test(card),
      '· ce que ça vaut ailleurs :', /par unité|Moins cher qu’ici/.test(card));
    await page.screenshot({ path: `${SHOTS}/18d-route-marchandise.png`, fullPage: true });
    await closeSheet();
  } else {
    // Une branche qui ne dit rien quand elle ne fait rien est une branche
    // qu'on croit parcourue : c'est exactement le défaut que ce parcours
    // cherche ailleurs dans le jeu.
    console.log('  la fiche — aucune marchandise ouvrable');
  }
});
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* L'arrivée, depuis une partie fabriquée                              */
/* ------------------------------------------------------------------ */

// Les circonstances de naissance sont rares à dessein — un jumeau une vie sur
// trente — et deux vies sur trois n'en portent aucune. Une vie tirée au hasard
// n'aurait donc presque jamais montré la section « Comment tu es arrivé ».
await loadSave('fixture-naissance.mjs');
await tap(page.getByLabel('Profil complet'));
await clearEvents();
{
  const read = async () => (await page.locator('.sheet').last()
    .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
  const sheet = await read();
  await page.screenshot({ path: `${SHOTS}/14d-arrivee.png`, fullPage: true });
  console.log('l’arrivée — la section est là :', /Comment tu es arrivé/.test(sheet),
    '· elle nomme une circonstance :',
    /Jumeau|Né avant terme|Né ailleurs|Enfant trouvé|Une bête déjà là/.test(sheet),
    '· elle dit ce que ça change :',
    /constitution|même âge exact|second pays|parent connu|plus vieille que toi/.test(sheet),
    '· la dette de naissance se lit :', /point\(s\) de constitution à/.test(sheet));
}
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* La bête, depuis une partie fabriquée                                */
/* ------------------------------------------------------------------ */

// Un chien de refuge arrive fermé — ouverture 21 sur 100 — et il faut plusieurs
// années de moments pour l'atteindre. Une vie jouée toute seule n'adopte
// jamais, et l'écran n'aurait montré qu'un animal fraîchement acheté : ni
// lien, ni dressage, ni rien de ce que l'attention achète.
await loadSave('fixture-bete.mjs');
await tap(page.getByRole('button', { name: /Agenda/ }));
await openPanel(/Animaux/, '21d-animaux.png', async () => {
  const read = async () => (await page.locator('.sheet').last()
    .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
  const summary = await read();

  // Le sommaire dit d'abord ce qui est compté : les moments de l'année, et
  // qu'ils se partagent entre toutes les bêtes.
  const counted = /moment(s)? cette année/.test(summary);
  const shared = /se partagent entre toutes/.test(summary);

  // Ouvrir la bête. Le sommaire la nomme par ce qu'on a construit avec elle.
  const pet = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /te suit|te cherche|ne te lâche pas|te reconnaît|Vous vous croisez/ }).first();
  if (!(await pet.count())) {
    console.log('aucune bête visible — la fixture ne tient plus sa promesse');
    return;
  }
  await pet.scrollIntoViewIfNeeded();
  await pet.click();
  await page.waitForTimeout(320);
  await clearEvents();
  const sheet = await read();
  await page.screenshot({ path: `${SHOTS}/21e-bete.png`, fullPage: true });

  /*
   * Les lectures qui comptent vivent dans leur propre carte, jamais dans le
   * « sub » d'une ligne d'action : un `Row` fermé affiche `because` **à la
   * place** de `sub`. Le chantier précédent avait fait disparaître la tension
   * du locataire exactement au moment où on l'apprenait. On vérifie donc
   * qu'elles sont là même quand des actions sont refusées.
   */
  const reads = /Ce que vous avez/.test(sheet)
    && /Ce qu’elle a appris/.test(sheet)
    && /Ce qu’elle laisse voir/.test(sheet);
  const bond = /te suit|te cherche|ne te lâche pas|te reconnaît/.test(sheet);
  const asked = /c’est ce qu’elle demande/.test(sheet);
  const parting = /La confier à quelqu’un/.test(sheet) && /La ramener/.test(sheet);

  console.log('la bête — les moments sont comptés :', counted,
    '· et partagés :', shared,
    '· les trois lectures tiennent :', reads,
    '· le lien se lit :', bond,
    '· elle dit ce qu’elle demande :', asked,
    '· on peut s’en séparer :', parting);

  // Lui donner un moment : le compte doit baisser.
  const before = Number((summary.match(/(\d+) moment/) ?? [])[1] ?? -1);
  const care = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /La sortir|S’en occuper|La dresser/ }).first();
  if ((await care.count()) && !(await closed(care))) {
    await care.scrollIntoViewIfNeeded();
    await care.click();
    await page.waitForTimeout(420);
    await clearEvents();
    const after = await read();
    const left = Number((after.match(/reste (\d+) moment/) ?? [])[1] ?? -1);
    console.log('  un moment donné — il en reste moins :', before < 0 || left < 0 ? 'illisible' : left < before);
    await page.screenshot({ path: `${SHOTS}/21f-bete-moment.png`, fullPage: true });
  } else {
    console.log('  aucun soin possible');
  }
});
await closeAllSheets();

/* ------------------------------------------------------------------ */
/* Le harcèlement, depuis une partie fabriquée                         */
/* ------------------------------------------------------------------ */

// Le tirage annuel plafonne à 20 %, et il faut encore être scolarisé avec une
// classe : une vie jouée toute seule n'ouvre presque jamais cet écran. On
// repart d'une partie où le moteur a ouvert la situation lui-même.
await loadSave('fixture-harcele.mjs');
await goTab(/Études/);
await openPanel(/Entrer dans l’établissement/, '23-ecole.png', async () => {
  const row = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /moqueries|écart|rumeurs|racket|bousculades|prend pour cible/i }).first();
  if (!(await row.count())) { console.log('aucune situation affichée'); return; }
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/23a-harcelement.png`, fullPage: true });

  // Répondre : c'est là que le système existe ou non.
  const answer = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
await goTab(/Études/);
await openPanel(/Entrer dans l’établissement/, '23d-ecole.png', async () => {
  const mates = page.getByRole('button', { name: /Camarades/ }).first();
  if (!(await mates.count())) { console.log('camarades absents'); return; }
  await mates.scrollIntoViewIfNeeded();
  await mates.click();
  await page.waitForTimeout(300);
  const someone = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])').first();
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
await goTab(/Études/);
// La session se rejoint depuis l'onglet, scolarisé ou non : le cycle se
// termine dans la même année que l'examen, et le panneau de l'école
// disparaissait avec le statut d'élève.
{
  const seat = page.locator('button[data-row]').filter({ hasText: /Ta session/ }).first();
  if (!(await seat.count())) console.log('aucune session proposée depuis l’onglet');
  else {
    await seat.scrollIntoViewIfNeeded();
    await seat.click();
    await page.waitForTimeout(420);
    const enter = page.getByRole('button', { name: /Entrer dans la salle/ }).first();
    if (!(await enter.count())) console.log('salle inaccessible depuis l’onglet');
    else {
      await enter.click();
      await page.waitForTimeout(500);
      await checkMiniGame('examen');
      await page.screenshot({ path: `${SHOTS}/25c-copie.png` });
    }
    await closeAllSheets();
  }
}
await openPanel(/Entrer dans l’établissement/, '25-ecole-examen.png', async () => {
  // Le bulletin d'abord : c'est lui qui donne son sens à l'examen.
  const marks = page.getByRole('button', { name: /Ton bulletin/ }).first();
  if ((await marks.count()) && !(await closed(marks))) {
    await marks.scrollIntoViewIfNeeded();
    await marks.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/25a-bulletin.png`, fullPage: true });
    await closeSheet();
  }

  const session = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
  await checkMiniGame('examen');
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
await goTab(/Études/);
await openPanel(/Entrer dans l’établissement/, '24-ecole-sport.png', async () => {
  const row = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
await goTab(/Études/);
await openPanel(/Comédien/, '22-scene.png', async () => {
  await page.screenshot({ path: `${SHOTS}/22a-scene-complet.png`, fullPage: true });

  // Signer un engagement, puis le tenir : c'est le parcours entier du système.
  const offer = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
  await checkMiniGame('scène');
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
  if ((await audition.count()) && !(await closed(audition))) {
    await audition.scrollIntoViewIfNeeded();
    await audition.click();
    await page.waitForTimeout(320);
    await audition.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/22h-auditions.png` });
  }

  // Les essais : ce pour quoi on peut aller se battre, au-dessus de ce qu'on
  // vous propose. C'est le seul endroit du métier où l'on va chercher au lieu
  // d'attendre — et où l'on peut rentrer les mains vides.
  const aim = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /demandé, tu en vaux/ }).first();
  if ((await aim.count()) && !(await closed(aim))) {
    await aim.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/22k-essais.png` });
    await aim.click();
    await page.waitForTimeout(300);
    const approach = page.getByRole('button', { name: /Jouer contre ton type/ }).first();
    if ((await approach.count()) && !(await closed(approach))) {
      await approach.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/22l-approches.png` });
      await approach.click();
      await page.waitForTimeout(320);
      await clearEvents();
      // Le laisser passer par le personnage : l'épreuve elle-même est la même
      // que la prestation, déjà jouée plus haut.
      const auto = page.getByRole('button', { name: /Laisser faire/ }).first();
      if ((await auto.count()) && !(await closed(auto))) {
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
  if ((await sign.count()) && !(await closed(sign))) {
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
await goTab(/Études/);
await openPanel(/Lieutenant|Sergent|Caporal|Commandant|Général/, '23-service.png', async () => {
  await page.screenshot({ path: `${SHOTS}/23a-service-complet.png`, fullPage: true });

  // S'entraîner : le seul levier volontaire sur la préparation.
  const train = page.getByRole('button', { name: /T’entraîner/ }).first();
  if ((await train.count()) && !(await closed(train))) {
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
  const duty = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
  await checkMiniGame('surface');
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
await goTab(/Études/);
await openPanel(/Astronaute|Pilote|Commandant de bord|Chef de programme/, '24-orbite.png', async () => {
  await page.screenshot({ path: `${SHOTS}/24a-orbite-complet.png`, fullPage: true });

  const duty = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
  await checkMiniGame('surface');
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
await goTab(/Études/);
await openPanel(/La mairie/, '25-mandat.png', async () => {
  await page.screenshot({ path: `${SHOTS}/25a-mandat-complet.png`, fullPage: true });

  // Trancher : c'est ce que l'audit reprochait de ne pas exister.
  const option = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
await goTab(/Études/);
await openPanel(/La mairie/, '26-avant-demission.png', async () => {
  const quit = page.getByRole('button', { name: /Démissionner/ }).first();
  if (!(await quit.count())) { console.log('démission indisponible'); return; }
  await quit.scrollIntoViewIfNeeded();
  await quit.click();
  await page.waitForTimeout(320);
  await clearEvents();
});
await closeAllSheets();

await goTab(/Études/);
await openPanel(/Te présenter/, '26a-se-presenter.png', async () => {
  const seat = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /conseil municipal|mairie|assemblée/ }).first();
  if (!(await seat.count())) { console.log('aucun siège accessible'); return; }
  await seat.scrollIntoViewIfNeeded();
  await seat.click();
  await page.waitForTimeout(320);
  await clearEvents();
  await page.screenshot({ path: `${SHOTS}/26b-campagne.png`, fullPage: true });

  // Choisir un axe de programme, lever de l'argent, jouer un coup.
  const plank = page.getByRole('button', { name: /Construire et loger/ }).first();
  if ((await plank.count()) && !(await closed(plank))) {
    await plank.scrollIntoViewIfNeeded();
    await plank.click();
    await page.waitForTimeout(280);
    await clearEvents();
  }
  const fund = page.getByRole('button', { name: /Ta propre fortune/ }).first();
  if ((await fund.count()) && !(await closed(fund))) {
    await fund.scrollIntoViewIfNeeded();
    await fund.click();
    await page.waitForTimeout(280);
    await clearEvents();
  }
  const door = page.getByRole('button', { name: /Le porte-à-porte/ }).first();
  if ((await door.count()) && !(await closed(door))) {
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
  const debate = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /le seul coup qui dépende de toi/i }).first();
  if (!(await debate.count())) { console.log('débat indisponible'); return; }
  await debate.scrollIntoViewIfNeeded();
  await debate.click();
  await page.waitForTimeout(400);
  await checkMiniGame('scène');
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
await goTab(/Études/);
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
  const go = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Partir — \d+ date/ }).first();
  if ((await go.count()) && !(await closed(go))) {
    await go.scrollIntoViewIfNeeded();
    await go.click();
    await page.waitForTimeout(320);
    await page.screenshot({ path: `${SHOTS}/27c-tournee.png` });
    await clearEvents();
  } else {
    console.log('aucune tournée à lancer');
  }

  // Enregistrer quelque chose de neuf.
  const record = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Trois minutes qui décideront|Cinq titres|Six mois enfermé/ }).first();
  if ((await record.count()) && !(await closed(record))) {
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
await goTab(/Gens/);
{
  // Insensible à la casse : l'écran écrit « Fils », et le premier essai
  // cherchait « fils » — il n'a jamais rien trouvé.
  const kid = page.locator('button[data-row]').filter({ hasText: /fils|fille/i }).first();
  if (!(await kid.count())) {
    console.log('aucun enfant à élever');
  } else {
    await kid.scrollIntoViewIfNeeded();
    await kid.click();
    await page.waitForTimeout(360);
    await page.screenshot({ path: `${SHOTS}/32-enfant.png`, fullPage: true });
    const gesture = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Passer du temps avec lui|Suivre sa scolarité|Le cadrer/ }).first();
    if ((await gesture.count()) && !(await closed(gesture))) {
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
  const lesson = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
  const one = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Sur cette vie|Une piste|Sur la lignée/ }).first();
  if (!(await one.count())) { console.log('aucun défi proposé'); return; }
  await one.scrollIntoViewIfNeeded();
  await one.click();
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${SHOTS}/30b-defi.png`, fullPage: true });

  // Le prendre : c'est là que le serment engage.
  const takeIt = page.getByRole('button', { name: /Prendre ce défi/ }).first();
  if ((await takeIt.count()) && !(await closed(takeIt))) {
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
    if ((await first.count()) && !(await closed(first))) {
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
    const entry = page.locator('button[data-row]').filter({ hasText: /La table/ }).first();
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
        await checkMiniGame('surface');
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
await goTab(/Gens/);
{
  const spouse = page.locator('.app-body button[data-row]').filter({ hasText: /Conjoint/ }).first();
  if (!(await spouse.count())) console.log('divorce : aucun conjoint');
  else {
    await spouse.scrollIntoViewIfNeeded();
    await spouse.click();
    await page.waitForTimeout(360);
    const row = page.locator('.sheet').last().locator('button[data-row]').filter({ hasText: /Divorcer/ }).first();
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
      const fight = modal.locator('button[data-row]').filter({ hasText: /pour ce que tu as/ }).first();
      if ((await fight.count()) && !(await closed(fight))) {
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
await goTab(/Gens/);
{
  const who = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('odyssia.save.v1'));
    const n = Object.values(state.npcs).find((x) => Number(x.flags?.grudge ?? 0) >= 40);
    return n ? n.firstName : null;
  });
  if (!who) console.log('rancune : aucun ennemi dans la sauvegarde');
  else {
    const row = page.locator('.app-body button[data-row]').filter({ hasText: who }).first();
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

      const sorry = sheet.locator('button[data-row]:not([data-closed])').filter({ hasText: /S’excuser/ }).first();
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
  const entry = page.locator('button[data-row]').filter({ hasText: /Ce que tu sais faire/ }).first();
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

    const go = sheet.locator('button[data-row]:not([data-closed])').first();
    if (!(await go.count())) console.log('aucune compétence ouverte');
    else {
      const before = (await go.innerText()).replace(/\s+/g, ' ');
      await go.scrollIntoViewIfNeeded();
      await go.click();
      await page.waitForTimeout(420);
      await page.screenshot({ path: `${SHOTS}/35a-seance.png`, fullPage: true });
      await clearEvents();
      /*
       * `.row` était la classe d'avant la migration du vocabulaire de listes ;
       * elle a été remplacée par `[data-row]` et `.ui-row`. Le sélecteur ne
       * trouvait donc plus rien, et le parcours attendait trente secondes une
       * ligne qui n'existait plus sous ce nom.
       */
      const after = (await page.locator('.sheet').last().locator('button[data-row]').first()
        .innerText()).replace(/\s+/g, ' ');
      console.log('savoir-faire — la séance se voit :', before !== after);
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

/*
 * Ce qu'on tient dans la durée.
 *
 * Trois choses doivent être à l'image, et une vie ordinaire n'en montre
 * aucune : un grade déjà décroché, un passage qu'on peut aller chercher, et
 * surtout **le mur** — l'année où l'on tient trop de choses et où plus rien ne
 * monte. Ce mur est la pièce maîtresse du système ; s'il ne s'affichait pas,
 * le joueur perdrait trois années sans savoir pourquoi, et c'est exactement le
 * genre de défaut qu'aucun test unitaire ne voit.
 */
await loadSave('fixture-pratique.mjs');
await goTab(/Agenda/);
{
  const entry = row('Ce que tu tiens');
  if (!(await entry.count())) {
    console.log('tuile « ce que tu tiens » absente de l’Agenda');
  } else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/35b-pratiques.png`, fullPage: true });

    const sheet = page.locator('.sheet').last();
    const body = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    console.log('pratiques — le budget se lit :', /d’attention/.test(body),
      '· le rythme aussi :', /du rythme|plein rythme/.test(body),
      '· le mur est annoncé :', /Tu n’avances plus/.test(body),
      '· un grade porte un nom :', /Ceinture|Un par mois|Ça tient/.test(body));

    // Le passage : la seule décision de l'écran. Il doit être atteignable et
    // annoncer ses chances avant qu'on s'engage.
    const passage = sheet.locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Tenter/ }).first();
    if (!((await passage.count()) && !(await closed(passage)))) {
      console.log('aucun passage ouvert — la fixture ne tient plus sa promesse');
    } else {
      console.log('pratiques — les chances sont écrites :',
        /% de chances/.test((await passage.innerText()).replace(/\s+/g, ' ')));
      await passage.scrollIntoViewIfNeeded();
      await passage.click();
      await page.waitForTimeout(420);
      await page.screenshot({ path: `${SHOTS}/35c-passage.png`, fullPage: true });
      await clearEvents();
    }

    // Lâcher rend la place : le rythme doit remonter dans la même seconde.
    const after = page.locator('.sheet').last();
    const before = (await after.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    const quit = after.locator('button[data-row]').filter({ hasText: /Arrêter/ }).first();
    if ((await quit.count()) && !(await closed(quit))) {
      await quit.scrollIntoViewIfNeeded();
      await quit.click();
      await page.waitForTimeout(420);
      await clearEvents();
      const now = (await page.locator('.sheet').last()
        .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      console.log('pratiques — lâcher change l’année :', before !== now);
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

/*
 * D'où l'on vient.
 *
 * Deux enfances sur sept se posent la question, et il faut ensuite des années
 * pour arriver au moment où toutes les décisions sont encore devant soi. Ce
 * qu'il faut voir à l'image n'est pas la jauge, c'est le **prix** : les
 * chances de chaque piste, ce qu'elle coûte à ceux qui vous ont élevé, et la
 * ligne « laisser tomber » qui fait de la recherche un choix plutôt qu'un
 * couloir.
 */
await loadSave('fixture-origines.mjs');
await goTab(/Agenda/);
{
  const entry = row('D’où tu viens');
  if (!(await entry.count())) {
    console.log('ligne « d’où tu viens » absente de l’Agenda');
  } else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/35d-origines.png`, fullPage: true });

    const sheet = page.locator('.sheet').last();
    const body = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    console.log('origines — la piste se lit :', /sur 100|\/ 100/.test(body),
      '· la tension aussi :', /tension|se sont fermés/.test(body),
      '· le prix chez eux est annoncé :', /leur coûte|ne leur coûte rien/.test(body),
      '· arrêter est proposé :', /Laisser tomber/.test(body));

    // Suivre une piste : la décision ordinaire, avec ses chances écrites.
    const lead = sheet.locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /%/ }).first();
    if (!((await lead.count()) && !(await closed(lead)))) {
      console.log('aucune piste ouverte — la fixture ne tient plus sa promesse');
    } else {
      const before = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      await lead.scrollIntoViewIfNeeded();
      await lead.click();
      await page.waitForTimeout(420);
      await page.screenshot({ path: `${SHOTS}/35e-piste.png`, fullPage: true });
      await clearEvents();
      const after = (await page.locator('.sheet').last()
        .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      console.log('origines — suivre une piste change l’écran :', before !== after);
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

/*
 * Fonder une famille, quand un enfant ne vient pas.
 *
 * Ce qu'il faut voir n'est pas ce qu'on peut acheter, c'est ce que ça demande :
 * un dossier avec son étape, l'examen **ligne par ligne et signé** — la
 * section qui distingue un dossier d'un tirage —, et l'attente que chaque
 * ouverture donne pour ce dossier-ci. Les deux lignes qu'écran remplace
 * promettaient exactement ce qu'elles ne faisaient pas.
 */
await loadSave('fixture-famille.mjs');
await goTab(/Gens/);
{
  const entry = row('Fonder une famille');
  if (!(await entry.count())) {
    console.log('ligne « fonder une famille » absente de Gens');
  } else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/35f-famille.png`, fullPage: true });

    const sheet = page.locator('.sheet').last();
    const body = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    console.log('famille — l’étape du dossier se lit :', /enquête|attente|Dossier en cours/.test(body),
      '· l’examen est chiffré :', /dossier \d+ \/ 100/.test(body),
      '· les poids sont signés :', /\+\d+/.test(body) && /−\d+/.test(body),
      '· l’attente par ouverture :', /an\(s\) d’attente/.test(body),
      '· le total dépensé :', /dépensés/.test(body));

    // Changer ce qu'on accepte : la décision du dossier, et l'attente doit
    // bouger sous les yeux du joueur.
    const before = body;
    const choice = sheet.locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /demande davantage|Deux, qu/ }).first();
    if (!((await choice.count()) && !(await closed(choice)))) {
      console.log('aucune ouverture à choisir — la fixture ne tient plus sa promesse');
    } else {
      await choice.scrollIntoViewIfNeeded();
      await choice.click();
      await page.waitForTimeout(420);
      await clearEvents();
      const after = (await page.locator('.sheet').last()
        .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      console.log('famille — changer ce qu’on accepte change l’attente :', before !== after);
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

/*
 * Le cabinet.
 *
 * Ce qu'il faut voir à l'image est ce qui **n'y est pas** : la compétence.
 * L'écran d'avant l'affichait en clair — « Fiabilité du diagnostic : 60 % » —
 * et choisir son médecin était une soustraction. On vérifie donc qu'on lit des
 * noms, un prix et ce qu'on en dit, et qu'aucun pourcentage de fiabilité ne
 * revient par une porte de derrière.
 */
await goTab(/Agenda/);
await tap(page.getByRole('button', { name: /Médecin/ }), 'Médecin');
{
  const entry = row('Le cabinet');
  if (!(await entry.count())) {
    console.log('ligne « le cabinet » absente du menu Médecin');
  } else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/35g-cabinet.png`, fullPage: true });

    const sheet = page.locator('.sheet').last();
    const body = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    console.log('cabinet — des gens plutôt que des types :', /Généraliste|Spécialiste|Psychologue/.test(body),
      '· ce qu’on en dit :', /repasse|Bien vu|n’en dit rien|du mal|salle d’attente/.test(body),
      '· la compétence reste cachée :', !/Fiabilité|fiabilité/.test(body),
      '· les urgences restent ouvertes :', /Urgences/.test(body));

    // Prendre quelqu'un : la décision qui rend les consultations moins chères
    // et l'apprentissage plus rapide.
    /*
     * Sans l'ancre `^` : le texte d'un bouton commence par son emoji, donc
     * `/^Prendre /` ne correspondait à rien et le parcours annonçait « aucun
     * praticien à prendre » alors que la liste en montrait trois. Même famille
     * de défaut que les désignations trop larges corrigées plus haut dans ce
     * fichier — ici, trop étroite.
     */
    const take = sheet.locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Prendre / }).first();
    if (!((await take.count()) && !(await closed(take)))) {
      console.log('aucun praticien à prendre');
    } else {
      await take.scrollIntoViewIfNeeded();
      await take.click();
      await page.waitForTimeout(420);
      await clearEvents();
      const after = (await page.locator('.sheet').last()
        .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      console.log('cabinet — prendre un médecin se voit :', /le tien|Ton médecin/.test(after));
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

/*
 * La noce.
 *
 * Ce qu'il faut voir n'est pas la liste des lieux — n'importe quel menu en
 * affiche une — mais que **les trois côtés bougent ensemble**. On change de
 * lieu, et le prix, les places et le nombre de proches laissés dehors doivent
 * changer dans le même bandeau, sous les yeux du joueur. C'est le troisième
 * chiffre qui porte tout le système : sans lui, la mairie à quatre places
 * serait toujours le bon calcul, et il n'y aurait rien à arbitrer.
 */
await loadSave('fixture-noce.mjs');
await goTab(/Gens/);
{
  const entry = row('La noce');
  if (!(await entry.count())) {
    console.log('ligne « la noce » absente de Gens');
  } else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/35h-noce.png`, fullPage: true });

    const sheet = page.locator('.sheet').last();
    const read = async () => (await page.locator('.sheet').last()
      .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    const body = await read();
    console.log('noce — le prix est à l’image :', /\$/.test(body),
      '· les places restantes :', /place\(s\) libre\(s\)/.test(body),
      '· ceux qu’on laisse dehors :', /proche\(s\) dehors|personne d’oublié/.test(body),
      '· quatre lieux :', /mairie/i.test(body) && /domaine/i.test(body));

    // Changer de lieu : les trois chiffres doivent bouger ensemble.
    const venue = sheet.locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Un domaine/ }).first();
    if (!((await venue.count()) && !(await closed(venue)))) {
      console.log('aucun lieu à choisir — la fixture ne tient plus sa promesse');
    } else {
      await venue.scrollIntoViewIfNeeded();
      await venue.click();
      await page.waitForTimeout(420);
      await clearEvents();
      console.log('noce — changer de lieu change le bandeau :', body !== (await read()));
    }

    // Et remplir la liste doit refermer le troisième côté.
    const fill = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Inviter au plus proche/ }).first();
    if (!((await fill.count()) && !(await closed(fill)))) {
      console.log('aucune invitation possible');
    } else {
      const before = await read();
      await fill.scrollIntoViewIfNeeded();
      await fill.click();
      await page.waitForTimeout(420);
      await clearEvents();
      const after = await read();
      console.log('noce — inviter fait monter le prix et baisser ceux qui restent dehors :',
        before !== after);
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

/*
 * Donner.
 *
 * Ce qu'il faut voir n'est pas la liste de ce qu'on possède — n'importe quel
 * inventaire en affiche une — mais **ce que le cadeau vaudrait pour cette
 * personne-là**, qui n'est pas son prix. C'est la seule chose qu'un joueur ne
 * devinerait pas, et sans elle il choisirait par le montant. On vérifie aussi
 * que les deux refus sont dits : la dette et le toit.
 */
await loadSave('fixture-donner.mjs');
await goTab(/Gens/);
{
  const entry = row('Donner quelque chose');
  if (!(await entry.count())) {
    console.log('ligne « donner quelque chose » absente de Gens');
  } else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(420);
    const read = async () => (await page.locator('.sheet').last()
      .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');

    // On choisit quelqu'un : la liste des proches vient en premier.
    const who = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])').first();
    if (!(await who.count())) {
      console.log('personne à qui donner — la fixture ne tient plus sa promesse');
    } else {
      await who.click();
      await page.waitForTimeout(420);
      await page.screenshot({ path: `${SHOTS}/35n-donner.png`, fullPage: true });

      const body = await read();
      console.log('donner — les parts se lisent :', /Un coup de main/.test(body),
        '· ce que ça vaut pour lui :', /besoin|apprécié|souviendra|beaucoup|change sa vie/.test(body),
        '· les choses à soi :', /Le deux-pièces|Sévrier/.test(body),
        '· la dette est un refus :', /on ne donne pas une dette|crédit dessus/i.test(body),
        '· le toit aussi :', /là que tu habites/i.test(body));

      const purse = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
        .filter({ hasText: /Un coup de main/ }).first();
      if ((await purse.count()) && !(await closed(purse))) {
        await purse.click();
        await page.waitForTimeout(420);
        await clearEvents();
        console.log('donner — le geste se voit :', body !== (await read()));
      } else {
        console.log('aucune part à donner');
      }
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

/*
 * La maison, quand c'est nous qui la dirigeons.
 *
 * Ce qu'il faut voir, c'est qu'**on ne fait plus la même chose** : trois
 * postes à pourvoir, ce que valent les gens à chacun, et ce qu'un poste vide
 * coûte. Plus la rancune de ceux qu'on ne place pas, qui est la seule chose
 * qu'un joueur ne devinerait pas — et qui finit par lui coûter sa place.
 */
await loadSave('fixture-maison.mjs');
await goTab(/Agenda/);
{
  /*
   * **Une tuile, pas une ligne.** L'Agenda présente ses entrées en grille :
   * `row()` cherche un `button[data-row]` et n'y trouve rien. Le parcours
   * existant du milieu passe par `getByRole` pour cette raison.
   */
  const illegal = page.getByRole('button', { name: /Activités illégales/ }).first();
  if (!(await illegal.count())) {
    console.log('tuile « activités illégales » absente de l’Agenda');
  } else {
    await illegal.scrollIntoViewIfNeeded();
    await illegal.click();
    await page.waitForTimeout(420);
    const milieu = page.getByRole('button', { name: /chaleur/ }).first();
    if (!(await milieu.count())) {
      console.log('milieu introuvable depuis la fixture patron');
    } else {
      await milieu.scrollIntoViewIfNeeded();
      await milieu.click();
      await page.waitForTimeout(420);
      const entry = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
        .filter({ hasText: /La maison/ }).first();
      if (!(await entry.count())) {
        console.log('ligne « la maison » absente — la fixture ne tient plus sa promesse');
      } else {
        await entry.scrollIntoViewIfNeeded();
        await entry.click();
        await page.waitForTimeout(420);
        await page.screenshot({ path: `${SHOTS}/35m-maison.png`, fullPage: true });

        const read = async () => (await page.locator('.sheet').last()
          .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
        const body = await read();
        console.log('maison — l’emprise est chiffrée :', /d’emprise/.test(body),
          '· les trois postes :', /Tenir le terrain/.test(body) && /Faire rentrer/.test(body) && /Tenir au calme/.test(body),
          '· un poste vide dit ce qu’il coûte :', /se perd un peu|il ne rentre presque rien|s’entend/.test(body),
          '· la part se choisit :', /Ce qu’il y a à tenir/.test(body) && /Ce que tu leur laisses/.test(body),
          '· les gens et leurs rancunes :', /Tes gens/.test(body));

        // Pourvoir un poste vide : l'écran doit le refléter.
        const post = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
          .filter({ hasText: /Tenir le terrain/ }).first();
        if (!((await post.count()) && !(await closed(post)))) {
          console.log('aucun poste à pourvoir');
        } else {
          await post.scrollIntoViewIfNeeded();
          await post.click();
          await page.waitForTimeout(420);
          const pick = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
            .filter({ hasNotText: /Personne/ }).first();
          if ((await pick.count()) && !(await closed(pick))) {
            await pick.click();
            await page.waitForTimeout(420);
            await clearEvents();
            console.log('maison — placer quelqu’un se voit :', body !== (await read()));
          } else {
            console.log('personne à placer');
          }
        }
        await closeAllSheets();
      }
    }
  }
}

/* ------------------------------------------------------------------ */

/*
 * Le nom dont on hérite.
 *
 * Ce qu'il faut voir, c'est **la règle** — le nom n'ouvre que son domaine —
 * parce que c'est la seule chose qu'un joueur ne devinerait pas, et parce que
 * c'est elle qui explique pourquoi certaines portes s'ouvrent et pas
 * d'autres. Le chiffre doit être là aussi : c'est ce qu'on perd en changeant
 * de nom, et on ne prend pas cette décision à l'aveugle.
 */
await loadSave('fixture-nom.mjs');
{
  await tap(page.getByLabel('Profil complet'), 'Profil complet');
  await page.waitForTimeout(420);
  const body = (await page.locator('.sheet').last()
    .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
  const named = /Le nom que tu portes/.test(body);
  console.log('nom — la section existe :', named,
    '· ce qu’il vaut est chiffré :', /\d+\/100/.test(body),
    '· la règle est dite :', /que dans son domaine/.test(body),
    '· et qu’il s’efface :', /s’efface un peu/.test(body));
  if (!named) console.log('nom — la fixture ne tient plus sa promesse');
  await page.screenshot({ path: `${SHOTS}/35l-nom.png`, fullPage: true });
  await closeAllSheets();
}

/* ------------------------------------------------------------------ */

/*
 * L'audience.
 *
 * Ce qu'il faut voir, ce sont **les deux jauges et la lecture** : le crédit
 * qui reste, ce qui pèse déjà, et ce qu'on arrive à lire de la charge en
 * cours. La liste des avocats ne doit plus annoncer d'« efficacité chiffrée »
 * — c'était un achat de verdict affiché en clair —, et répondre doit faire
 * bouger les jauges sous les yeux du joueur.
 */
await loadSave('fixture-audience.mjs');
await goTab(/Agenda/);
await tap(page.getByRole('button', { name: /Justice/ }), 'Justice');
{
  const sheet = page.locator('.sheet').last();
  const read = async () => (await page.locator('.sheet').last()
    .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
  const menu = await read();
  console.log('audience — le procès s’annonce :', /Procès en cours/.test(menu),
    '· aucune efficacité chiffrée :', !/efficacité \d+\/100/.test(menu),
    '· ce que l’avocat achète est dit :', /de la vue/.test(menu),
    '· laisser plaider est proposé :', /Laisser plaider/.test(menu));

  const lawyer = sheet.locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Cabinet réputé/ }).first();
  if (!((await lawyer.count()) && !(await closed(lawyer)))) {
    console.log('aucun avocat à choisir — la fixture ne tient plus sa promesse');
  } else {
    await lawyer.scrollIntoViewIfNeeded();
    await lawyer.click();
    await page.waitForTimeout(420);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/35k-audience.png`, fullPage: true });

    const body = await read();
    console.log('audience — le crédit est à l’image :', /crédit \d+/.test(body),
      '· ce qui pèse aussi :', /contre toi|rien ne pèse/.test(body),
      '· la lecture est une fourchette ou rien :', /\d+–\d+|ne sais pas ce qu’ils ont/.test(body),
      '· les trois postures :', /Le reconnaître/.test(body) && /Le contester/.test(body) && /Ne rien dire/.test(body));

    // Répondre : les jauges doivent bouger.
    const stance = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Le reconnaître/ }).first();
    if (!((await stance.count()) && !(await closed(stance)))) {
      console.log('aucune posture à choisir');
    } else {
      await stance.scrollIntoViewIfNeeded();
      await stance.click();
      await page.waitForTimeout(420);
      await clearEvents();
      const after = await read();
      console.log('audience — répondre fait avancer l’audience :', body !== after,
        '· et le compteur suit :', /1\/5|2\/5/.test(after));
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

/*
 * Le dossier, une fois la porte fermée.
 *
 * Ce qu'il faut voir, ce sont **les deux sommes comparables** — ce que la
 * négociation donnerait à coup sûr, ce qu'une victoire vaudrait — et la pesée
 * du dossier **ligne à ligne et signée**, qui est ce qui distingue un dossier
 * d'un tirage. La première version de l'écran n'affichait qu'un montant, du
 * côté du choix prudent ; on vérifie donc qu'il y en a bien deux.
 */
await loadSave('fixture-dossier.mjs');
await goTab(/Études/);
{
  const entry = row('Ton dossier');
  if (!(await entry.count())) {
    console.log('ligne « ton dossier » absente d’Études');
  } else {
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${SHOTS}/35j-dossier.png`, fullPage: true });

    const sheet = page.locator('.sheet').last();
    const body = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    console.log('dossier — le motif se lit :', /Restructuration|Insuffisance|Insubordination|Faute grave/.test(body),
      '· la pesée est signée :', /\+\d/.test(body) && /−\d/.test(body),
      '· ce que le dossier vaut :', /défendre|plaider|pari|opposer|tient pas/.test(body),
      '· les deux sommes :', /Négocier un départ/.test(body) && /Gagner (vaudrait|te rendrait)/.test(body),
      '· ce que ne rien faire ferait :', /s’éteindra d’elle-même/.test(body));

    // Contester : l'écran doit basculer sur l'attente.
    const act = sheet.locator('button[data-row]:not([data-closed])')
      .filter({ hasText: /Contester/ }).first();
    if (!((await act.count()) && !(await closed(act)))) {
      console.log('aucune contestation possible — la fixture ne tient plus sa promesse');
    } else {
      await act.scrollIntoViewIfNeeded();
      await act.click();
      await page.waitForTimeout(420);
      await clearEvents();
      const after = (await page.locator('.sheet').last()
        .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      console.log('dossier — contester ouvre l’attente :', /Encore \d an|issue est proche/.test(after));
    }
    await closeAllSheets();
  }
}

/* ------------------------------------------------------------------ */

/*
 * Ce qui passe par tes mains.
 *
 * Ce qu'il faut voir n'est pas la liste des portions — ce serait un menu de
 * plus — mais que **chacune annonce à l'avance ce qu'elle coûte**, et que le
 * soupçon dise où il retomberait si l'on ne prenait rien. Ces deux chiffres
 * sont toute la décision : sans le premier on choisit à l'aveugle, sans le
 * second s'arrêter est un acte de foi. On vérifie aussi qu'aucune ligne « ne
 * rien prendre » n'est revenue : elle ferait exactement ce que fait le fait
 * de fermer la page.
 */
await loadSave('fixture-bureau.mjs');
await goTab(/Études/);
{
  const office = row('Entrer au bureau');
  if (!(await office.count())) {
    console.log('ligne « entrer au bureau » absente d’Études');
  } else {
    await office.scrollIntoViewIfNeeded();
    await office.click();
    await page.waitForTimeout(420);
    const entry = row('Ce qui passe par tes mains');
    if (!(await entry.count())) {
      console.log('ligne « ce qui passe par tes mains » absente du bureau');
    } else {
      await entry.scrollIntoViewIfNeeded();
      await entry.click();
      await page.waitForTimeout(420);
      await page.screenshot({ path: `${SHOTS}/35i-bureau.png`, fullPage: true });

      const read = async () => (await page.locator('.sheet').last()
        .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
      const body = await read();
      console.log('bureau — la portée est chiffrée :', /à portée/.test(body),
        '· chaque portion annonce son coût :', /soupçon \+\d/.test(body),
        '· ce qu’une année tranquille retirerait :', /ramènerait vers \d/.test(body),
        '· ce que le soupçon dit :', /regarder|anormal|curiosité|trouvera|relevé|posée/.test(body));

      /*
       * Et **aucune ligne** « ne rien prendre » : sur le texte de la page, la
       * vérification se trompait de cible — l'écran explique en toutes lettres
       * que ne rien prendre ne demande aucun geste, et le mot suffisait à la
       * faire échouer. C'est la présence d'une *ligne cliquable* qui est en
       * cause, pas celle des mots.
       */
      const idle = page.locator('.sheet').last()
        .locator('button[data-row]').filter({ hasText: /Ne rien prendre|Rien cette année/ });
      console.log('bureau — aucune ligne « ne rien prendre » :', (await idle.count()) === 0);

      // Se servir : le soupçon doit monter sous les yeux du joueur.
      const take = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
        .filter({ hasText: /Une part/ }).first();
      if (!((await take.count()) && !(await closed(take)))) {
        console.log('aucune portion à prendre — la fixture ne tient plus sa promesse');
      } else {
        await take.scrollIntoViewIfNeeded();
        await take.click();
        await page.waitForTimeout(420);
        await clearEvents();
        const after = await read();
        console.log('bureau — se servir se voit :', body !== after,
          '· et l’année est décidée :', /décidé pour cette année/.test(after));
      }
      await closeAllSheets();
    }
  }
}

/* ------------------------------------------------------------------ */

// La vie des autres : ce qui leur arrive pendant qu'on ne les regarde pas.
// Les trois états qui comptent sont rares par construction — 0,1 % de détenus,
// 6 % de malades, 7 % de partis loin —, si bien qu'une partie prise au hasard
// n'en montrerait aucun et que le parloir ne serait jamais photographié.
await loadSave('fixture-leurs.mjs');
await goTab(/Gens/);
{
  // Qui est dans quel état, d'après la sauvegarde plutôt que d'après un
  // libellé qu'on espère trouver.
  const who = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('odyssia.save.v1'));
    const npcs = Object.values(state.npcs);
    /*
     * Le **nom complet**, pas le prénom.
     *
     * La ligne d'un proche s'intitule « Prénom Nom », et le parcours cherchait
     * la ligne par le prénom seul. Or les prénoms se répètent : dans cette
     * sauvegarde-ci, dix prénoms sont portés par plusieurs vivants — dont
     * celui du malade. Le clic tombait donc sur quelqu'un d'autre, la fiche
     * ne s'ouvrait pas, et le parcours attendait trente secondes une fiche
     * qui n'existait pas. Le jeu n'avait rien perdu : c'est la désignation
     * qui était ambiguë, exactement comme pour `getByText` plus haut.
     */
    const pick = (f) => {
      const n = npcs.find(f);
      return n ? `${n.firstName} ${n.lastName}` : null;
    };
    return {
      dedans: pick((n) => n.alive && n.incarcerated),
      malade: pick((n) => n.alive && n.flags?.illness),
      loin: pick((n) => n.alive && n.flags?.far),
    };
  });
  console.log('leurs vies :', JSON.stringify(who));

  for (const [what, name] of Object.entries(who)) {
    if (!name) { console.log(`aucun ${what}`); continue; }
    // Par le titre de la ligne, et non par n'importe quel texte du bouton :
    // un nom peut apparaître dans le sous-titre d'une autre ligne.
    const who = row(name);
    if (!(await who.count())) { console.log(`${what} : ${name} absent de Proches`); continue; }
    await who.scrollIntoViewIfNeeded();
    await who.click();
    await page.waitForTimeout(340);
    // Une modale d'événement peut s'être glissée entre le clic et la fiche.
    await clearEvents();
    const sheet = page.locator('.sheet').last();
    /*
     * **La fiche s'est-elle ouverte ?** Sans cette garde, `sheet.evaluate`
     * attendait trente secondes une fiche absente puis faisait échouer tout le
     * parcours — sur la deuxième des trois personnes, après que la première
     * avait tout réussi. Le jeu n'avait rien perdu : le clic n'avait
     * simplement pas ouvert de fiche, ce qui est un résultat qu'on note et
     * qu'on dépasse. C'est la même classe de défaut que les cinq réparées
     * plus haut dans ce fichier, au même endroit du même parcours.
     */
    if (!(await sheet.count())) {
      console.log(`${what} : la fiche de ${name} ne s’est pas ouverte`);
      await closeAllSheets();
      continue;
    }
    // `innerText` ne rend que la partie peinte d'un conteneur qui défile : il
    // annonçait « section absente » pour des sections dont il venait de
    // cliquer le bouton. `textContent` dit ce qui existe.
    const body = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    const pills = await sheet.locator('.chips').first().innerText().catch(() => '');
    console.log(`${what} ${name} — ${pills.replace(/\s+/g, ' ')} · histoire ${/Son histoire/.test(body) ? 'oui' : 'NON'}`);
    await page.screenshot({ path: `${SHOTS}/34-${what}.png`, fullPage: true });

    if (what === 'dedans') {
      const go = sheet.locator('button[data-row]:not([data-closed])').filter({ hasText: /Aller le voir/ }).first();
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
await goTab(/Études/);
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
  const option = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /sur la couronne/ }).first();
  if ((await option.count()) && !(await closed(option))) {
    await option.scrollIntoViewIfNeeded();
    await option.click();
    await page.waitForTimeout(320);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/29b-tranche.png`, fullPage: true });
  }

  // La haie : l'allure, et à qui l'on donne du temps.
  const bath = page.getByRole('button', { name: /Aller au contact/ }).first();
  if (!(await bath.count())) { console.log('bain de foule fermé'); return; }
  if (await closed(bath)) {
    console.log('bain de foule indisponible cette année');
    return;
  }
  await bath.scrollIntoViewIfNeeded();
  await bath.click();
  await page.waitForTimeout(400);
  await checkMiniGame('ruelle');
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
  const item = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /siècles?|D’avant toi/ }).first();
  if (!(await item.count())) { console.log('aucun objet ancien'); return; }
  await item.scrollIntoViewIfNeeded();
  await item.click();
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${SHOTS}/28b-objet.png`, fullPage: true });

  // Le faire reprendre : c'est le seul levier, et il coûte.
  const fix = page.getByRole('button', { name: /Le faire reprendre/ }).first();
  if ((await fix.count()) && !(await closed(fix))) {
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
  if (await closed(attic)) {
    console.log('grenier indisponible cette année');
    return;
  }
  await attic.scrollIntoViewIfNeeded();
  await attic.click();
  await page.waitForTimeout(400);
  await checkMiniGame('surface');
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

  // Et surtout : le joueur doit pouvoir choisir. Les jetons du thème clair
  // existaient depuis le début, mais rien dans l'interface ne permettait de
  // les demander — un téléphone réglé en sombre imposait le sombre, sans
  // aucun moyen d'en sortir. On se met donc dans ce cas exact.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(220);
  const imposed = await read();
  await page.locator('.app-header-id').first().click();
  await page.waitForTimeout(420);
  const sheet = page.locator('.sheet').last();
  const apparence = (await sheet.evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
  console.log('thème — le réglage est proposé :', /Apparence/.test(apparence),
    '· trois choix :', ['Clair', 'Sombre', 'Appareil'].filter((t) => apparence.includes(t)).length);

  const clair = sheet.getByRole('button', { name: /Clair/ }).first();
  if (!(await clair.count())) console.log('bouton « clair » absent');
  else {
    await clair.scrollIntoViewIfNeeded();
    await clair.click();
    await page.waitForTimeout(320);
    const chosen = await read();
    const marked = await page.evaluate(() => document.documentElement.dataset.theme);
    console.log('thème — choisir « clair » sur un appareil sombre :',
      marked === 'light' && lum(chosen.bg) > 0.7,
      `(appareil imposait ${lum(imposed.bg).toFixed(2)}, on obtient ${lum(chosen.bg).toFixed(2)})`);
    await page.screenshot({ path: `${SHOTS}/43b-reglage.png`, fullPage: true });
  }
  await closeAllSheets();
  await page.emulateMedia({ colorScheme: null });
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('odyssia.theme.v1');
  });
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
await goTab(/Gens/);
{
  const card = page.locator('button[data-row]').filter({ hasText: /Mère|Père|Frère|Sœur/ }).first();
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
    const rows = await page.locator('.sheet').last().locator('button[data-row]').count();
    const shut = await page.locator('.sheet').last().locator('button[data-row].disabled').count();
    console.log('actions — lignes proposées :', rows, '· dont fermées avec leur raison :', shut);

    // Une action à manière : la modale doit offrir plusieurs tons, et le ton
    // choisi doit être celui qui part.
    const toned = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
      const second = page.locator('.overlay button[data-row]').nth(1);
      if ((await second.count()) && !(await closed(second))) { await second.click(); await page.waitForTimeout(220); }
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
    const lendRow = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
      if ((await send.count()) && !(await closed(send))) { await send.click({ force: true }); await page.waitForTimeout(420); }
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

    const go = page.locator('.sheet').last().locator('button[data-row]').filter({ hasText: /Se relever/ }).first();
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
      const someone = page.locator('.sheet').last().locator('button[data-row]').last();
      const closedBefore = /quelqu’un soit au courant/.test(body);
      if ((await someone.count()) && !(await closed(someone))) {
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
      const enrol = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
await goTab(/Gens/);
{
  const card = page.locator('button[data-row]').filter({ hasText: /Béguin/ }).first();
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

    const go = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
      const walk = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
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
          const reply = page.locator('.sheet').last().locator('button[data-row]').first();
          if ((await reply.count()) && !(await closed(reply))) {
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
  const shop = page.locator('button[data-row]').filter({ hasText: /Boutique/ }).first();
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
    const flea = page.locator('button[data-row]:not([data-closed])').filter({ hasText: /La brocante/ }).first();
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

  const mine = page.locator('button[data-row]').filter({ hasText: /Mes possessions/ }).first();
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

    const row = page.locator('.sheet').last().locator('button[data-row]')
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
      const expert = page.locator('.overlay button[data-row]:not([data-closed])')
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
        const after = (await page.locator('.sheet').last().locator('button[data-row]')
          .filter({ hasText: /Authentifié|Copie|Non expertisé/ }).first()
          .innerText().catch(() => '')).replace(/\s+/g, ' ');
        console.log('objet — la ligne a changé :', Boolean(after) && before !== after);
      }

      // Et la salle des ventes : la seule vente du jeu d'où l'on peut
      // repartir avec son objet.
      const sell = page.locator('.sheet').last().locator('button[data-row]')
        .filter({ hasText: /Authentifié|Copie|Non expertisé/ }).first();
      if ((await sell.count()) && !(await closed(sell))) {
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
  const mate = page.locator('.sheet').last().locator('button[data-row]')
    .filter({ hasText: /relation/ }).first();
  if ((await mate.count()) && !(await closed(mate))) {
    await mate.scrollIntoViewIfNeeded();
    await mate.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/16b-codetenu.png`, fullPage: true });
    await closeSheet();
  }

  // Préparer, puis traverser la cour.
  const observe = page.getByRole('button', { name: /Observer les rondes/ }).first();
  if ((await observe.count()) && !(await closed(observe))) {
    await observe.scrollIntoViewIfNeeded();
    await observe.click();
    await page.waitForTimeout(250);
    await clearEvents();
  }

  /*
   * L'esclandre : la seule activité de la liste qui ouvre une scène plutôt
   * que de se régler par un tirage. On l'ouvre, on tient le doigt en bas — au
   * fond de la cour — et l'on vérifie que la scène se joue et se solde.
   */
  const riot = page.locator('.sheet').last().locator('button[data-row]:not([data-closed])')
    .filter({ hasText: /Provoquer un esclandre/ }).first();
  if ((await riot.count()) && !(await closed(riot))) {
    await riot.scrollIntoViewIfNeeded();
    await riot.click();
    await page.waitForTimeout(400);
    await clearEvents();
    const scene = (await page.locator('.sheet').last()
      .evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ');
    const surface = page.locator('.yard-court').first();
    console.log('la cour — la scène s’ouvre :', (await surface.count()) > 0,
      '· elle dit ce qu’on gagne :', /Ce que tu t’es fait comme nom/.test(scene),
      '· et ce qui arrive :', /Ils vont relever les visages/.test(scene),
      '· la position se lit :', /tu es devant|tu es au fond/.test(scene));
    await page.screenshot({ path: `${SHOTS}/16f-cour.png`, fullPage: true });
    // La scène dure vingt secondes : on la laisse aller au bout plutôt que
    // de la quitter, pour que le règlement soit réellement traversé.
    await page.waitForTimeout(23_000);
    await clearEvents();
    await page.screenshot({ path: `${SHOTS}/16g-cour-soldee.png`, fullPage: true });
  } else {
    console.log('la cour — l’esclandre n’est pas proposé');
  }

  await page.screenshot({ path: `${SHOTS}/16e-suite.png` });
  await clearEvents();
});
if (!jail) console.log('écran de détention introuvable');
await closeAllSheets();

/**
 * Traverser la cour — pour de bon.
 *
 * Trois pilotes ont perdu avant celui-ci, et chaque défaite disait quelque
 * chose : foncer sur la brèche se plante dans un mur (6 % de réussite),
 * contourner les murs se fait repérer (38 %), et un chemin suivi depuis le
 * test — un aller-retour réseau par case — arrive trop tard pour l'appel.
 *
 * Ce pilote-là **tourne dans la page**. C'est ce qui change tout : il décide
 * soixante fois par seconde au lieu de trois, comme un joueur qui regarde
 * l'écran plutôt qu'un robot qui télégraphie ses coups. Sa politique est
 * dans `pilote-evasion.mjs`, partagée avec `measure-evasion.mjs` : le même
 * code est mesuré sur le moteur seul, où l'on peut jouer mille parties, et
 * joué ici, où l'on ne peut en jouer que six.
 *
 * Il ne lit que ce qui est dessiné. Les murs et les abris sont des `div`
 * placés en pourcentage ; les pions et le cône du projecteur aussi. Convertir
 * un pourcentage en case rend la position **exacte** — bien mieux que les
 * rectangles mesurés, dont le demi-point de chevauchement destiné à masquer
 * les coutures donnait 23,1 colonnes et un plan illisible.
 *
 * Une limite, dite ici plutôt que cachée : il envoie des `pointermove` et
 * jamais d'appui. Le jeu s'en contente — on marche, et courir coûte plus cher
 * qu'il ne rapporte — mais un appui synthétique ferait échouer
 * `setPointerCapture`, et une erreur de console ferait échouer le test tout
 * entier. Ce que le doigt fait vraiment est mesuré à part, par
 * `checkMiniGame`, avec le vrai tactile de Playwright.
 */
async function crossTheYard(pilotSource) {
  return page.evaluate(async (source) => {
    const makeEscapePilot = new Function(`return (${source})`)();
    const surface = document.querySelector('.minigame-surface');
    const plan = document.querySelector('.plan');
    if (!surface || !plan) return { ok: false, why: 'pas de cour' };

    const ratio = (plan.style.aspectRatio ?? '').split('/');
    const W = Math.round(Number(ratio[0]));
    const H = Math.round(Number(ratio[1]));
    if (!(W > 2) || !(H > 2)) return { ok: false, why: 'plan sans dimensions' };

    const pct = (value) => Number(String(value).replace('%', '').trim());

    /* --- Le plan, case par case --- */
    const cells = Array.from({ length: W * H }, () => '.');
    for (const el of plan.querySelectorAll('.plan-cell')) {
      const x = Math.round((pct(el.style.left) / 100) * W);
      const y = Math.round((pct(el.style.top) / 100) * H);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      cells[y * W + x] = el.classList.contains('plan-wall') ? '#'
        : el.classList.contains('plan-cover') ? 'C'
          : el.classList.contains('plan-exit') ? 'X' : 'D';
    }

    const tokenAt = (el) => ({
      x: (pct(el.style.left) / 100) * W,
      y: (pct(el.style.top) / 100) * H,
    });

    /**
     * Le faisceau, relu dans son propre style.
     *
     * L'attribut brut plutôt que `el.style.background` : la valeur contient
     * un `var()`, et une propriété raccourcie qui en contient un se
     * sérialise en chaîne vide par la CSSOM. On lirait donc « pas de
     * projecteur » sur un projecteur parfaitement visible.
     */
    const beamAt = (el) => {
      const raw = el.getAttribute('style') ?? '';
      const number = '(-?[\\d.]+(?:e[+-]?\\d+)?)';
      const from = new RegExp(`from\\s+${number}deg`, 'i').exec(raw);
      // La **seconde** borne du dégradé, pas la première : le cône s'écrit
      // « var(--warn-soft) 0deg, var(--warn-soft) Ydeg, transparent 0 », et
      // s'arrêter au premier `deg` lisait une ouverture nulle sur un
      // projecteur bien présent — un défaut muet, le pire genre.
      const stop = new RegExp(`${number}deg,\\s*transparent`, 'i').exec(raw);
      if (!from || !stop) return null;
      const spread = Number(stop[1]) / 2;
      const angle = Number(from[1]) + spread - 90;
      return {
        x: (pct(el.style.left) / 100) * W,
        y: (pct(el.style.top) / 100) * H,
        angle: (angle * Math.PI) / 180,
        half: (spread * Math.PI) / 180,
        range: ((pct(el.style.width) / 100) * W) / 2,
      };
    };

    const read = () => {
      const me = document.querySelector('.plan-player');
      const breach = document.querySelector('.plan-loot');
      const hud = document.querySelector('.scene-hud');
      if (!me || !breach || !hud) return null;
      const text = (hud.textContent ?? '').replace(/\s+/g, ' ');
      const seconds = /dans\s+(\d+)\s*s/.exec(text);
      const gauge = hud.querySelector('.game-gauge-fill');
      return {
        player: tokenAt(me),
        breach: tokenAt(breach),
        guards: [...document.querySelectorAll('.plan-occupant')].map(tokenAt),
        beams: [...document.querySelectorAll('.plan-beam')].map(beamAt).filter(Boolean),
        alert: gauge ? pct(gauge.style.width) : 0,
        spotted: /on te voit/.test(text),
        hidden: /à couvert/.test(text),
        remaining: seconds ? Number(seconds[1]) * 1000 : 40_000,
      };
    };

    const first = read();
    if (!first) return { ok: false, why: 'cour illisible' };
    if (first.beams.length === 0) return { ok: false, why: 'projecteur illisible' };

    const tick = makeEscapePilot({ width: W, height: H, cells });

    /** Une position visée, telle que la main la donnerait. */
    const aim = (cx, cy) => {
      const box = surface.getBoundingClientRect();
      surface.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, composed: true, pointerId: 1, pointerType: 'touch', isPrimary: true,
        clientX: box.left + (cx / W) * box.width,
        clientY: box.top + (cy / H) * box.height,
      }));
    };

    const started = performance.now();
    let last = started;
    let ticks = 0;
    while (performance.now() - started < 60_000) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      if (now - last < 55) continue;
      const view = read();
      // La scène a disparu : soit on est sorti, soit c'est fini.
      if (!view) break;
      const target = tick(view, now - last);
      last = now;
      ticks += 1;
      aim(target.x, target.y);
    }

    const goal = document.querySelector('.minigame-bar .small');
    return {
      ok: true,
      ticks,
      seconds: Math.round((performance.now() - started) / 100) / 10,
      goal: (goal?.textContent ?? '').replace(/\s+/g, ' '),
    };
  }, pilotSource);
}

/**
 * L'évasion, jouée pour de bon — et la course, qui n'existe qu'après elle.
 *
 * Trois choses ont dû être comprises avant que ce bloc marche, et chacune
 * était une raison pour laquelle la course n'était jamais atteinte :
 *
 * **Il faut viser la brèche.** L'écran la montre — c'est ce que le joueur
 * vise. L'ancienne version tapait six points au hasard en remontant l'écran :
 * elle vérifiait que la scène vivait, pas qu'on pouvait en sortir.
 *
 * **Il faut tenir dix secondes.** Mesuré sur le moteur seul, une traversée
 * réussie prend dix secondes en médiane et vingt et une au pire. Trois
 * secondes et demie ne faisaient pas le tiers du chemin.
 *
 * **Il faut plusieurs nuits.** Une tentative par an. Or faire passer une
 * année demande de refermer la feuille : elle recouvre la barre de
 * navigation, et « Prendre un an » n'était pas cliquable — la relance ne
 * relançait rien.
 *
 * **Il faut jouer le jeu.** Traverser en ligne, même en contournant les
 * murs, se fait repérer : la cour a des abris et un projecteur, et c'est de
 * les utiliser qu'il s'agit. C'est le travail de `crossTheYard`, et la
 * raison pour laquelle la course était mesurable en théorie et jamais en
 * pratique.
 */
{
  let escaped = false;
  for (let night = 0; night < 6 && !escaped; night++) {
    await closeAllSheets();
    await goTab(/Agenda/);
    const cell = page.locator('button[data-row]').filter({ hasText: /an\(s\) restants/ }).first();
    if (!(await cell.count())) break;
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await page.waitForTimeout(360);

    // On prépare avant de tenter, comme le ferait n'importe qui : mesuré sur
    // le moteur, la préparation fait passer la traversée de 5,5 % à 14,5 %.
    // Ma réécriture l'avait laissée de côté, et l'évasion partait nue.
    for (const prep of [/Observer les rondes/, /S’entendre avec quelqu’un/, /Repérer/]) {
      const row = page.locator('button[data-row]:not([data-closed])').filter({ hasText: prep }).first();
      if (!(await row.count())) continue;
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await page.waitForTimeout(260);
      await clearEvents();
    }

    const attempt = page.getByRole('button', { name: /Tenter cette nuit/ }).first();
    if (!(await attempt.count()) || await attempt.isDisabled()) {
      await closeAllSheets();
      await ageBy(1);
      continue;
    }
    await attempt.scrollIntoViewIfNeeded();
    await attempt.click();
    await page.waitForTimeout(450);
    if (night === 0) {
      await page.screenshot({ path: `${SHOTS}/16c-cour.png` });
      await checkMiniGame('cour');
    }

    // La traversée elle-même, pilotée depuis la page. On attend que la cour
    // soit là : une nuit a été perdue sur « pas de cour » parce qu'on la
    // lisait 450 ms après le clic, ce qui suffit d'ordinaire et pas toujours.
    await page.waitForSelector('.minigame-surface', { timeout: 4000 }).catch(() => {});
    const crossing = await crossTheYard(PILOTE);
    if (!crossing.ok) console.log(`  nuit ${night + 1} : cour illisible — ${crossing.why}`);
    await page.waitForTimeout(700);
    if (night === 0) await page.screenshot({ path: `${SHOTS}/16d-traversee.png` });

    // Ce que la nuit a donné, dit en clair : sans cela l'échec se résume à
    // une ligne muette, et la prochaine personne refait toute l'enquête.
    const verdict = (await page.locator('.overlay')
      .evaluateAll((els) => els.map((el) => el.textContent ?? '').join(' '))
      .catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 70);
    if (verdict) console.log(`  nuit ${night + 1} : ${verdict}`);

    // On referme le message **avant** de regarder ce qui est à l'écran : la
    // course ne se monte plus derrière lui (voir `StartWhenReady`), donc tant
    // qu'il est là, il n'y a rien à mesurer et la barre est vide. Chercher le
    // jeu d'abord aurait conclu à l'échec d'une nuit réussie.
    await clearEvents();
    await page.waitForTimeout(300);

    const goal = await page.locator('.minigame-bar .small').first().textContent().catch(() => '');
    if (goal && /Rejoindre une sortie/.test(goal)) {
      escaped = true;
      console.log(`  nuit ${night + 1} : le périmètre est franchi`
        + ` — ${crossing.seconds} s, ${crossing.ticks} décisions`);
      await page.screenshot({ path: `${SHOTS}/16f-course.png` });
      await checkMiniGame('course');
      await page.screenshot({ path: `${SHOTS}/16g-course-jouee.png` });
      await clearEvents();
      break;
    }
    await closeAllSheets();
    await ageBy(1);
  }
  if (!escaped) console.log('la course : aucune des six nuits n’a franchi le périmètre');
}

console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'Aucune erreur console.');
await browser.close();
stop();
process.exit(errors.length ? 1 : 0);
