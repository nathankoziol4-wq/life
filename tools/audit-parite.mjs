/**
 * L'inventaire de ce que le jeu propose, avant et après une migration d'écran.
 *
 * §134. Une refonte d'interface fait disparaître des fonctionnalités sans que
 * personne s'en aperçoive : un écran réécrit oublie une ligne, et la ligne
 * oubliée est une action que le joueur ne peut plus faire alors que le système
 * derrière fonctionne toujours. Le document `UI_FEATURE_PARITY.md` le dit
 * depuis le début — mais un document ne vérifie rien.
 *
 * Cet outil relève **tout ce qui est touchable**, écran par écran : le libellé,
 * la section qui le contient, s'il est ouvert ou fermé, et la raison affichée
 * quand il est fermé. Il écrit `.parite/inventaire.json`, et le compare au
 * témoin versionné dans `tools/parite-temoin.json`.
 *
 * Trois verdicts, et seul le premier est acceptable après une migration :
 *
 * - **rien de perdu** : tout ce qui existait existe encore ;
 * - **des ajouts** : très bien, on les liste ;
 * - **des disparitions** : la migration a mangé quelque chose, et on dit quoi.
 *
 * Le témoin se met à jour délibérément :
 *
 *   node tools/audit-parite.mjs --temoin
 */

import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync,
} from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4195;
const ROOT = new URL('..', import.meta.url).pathname;
const WITNESS = `${ROOT}tools/parite-temoin.json`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
  stdio: 'ignore', cwd: ROOT,
});
process.on('exit', () => { try { server.kill(); } catch { /* déjà arrêté */ } });
await new Promise((r) => setTimeout(r, 3000));

mkdirSync(`${ROOT}.parite`, { recursive: true });
const updateWitness = process.argv.includes('--temoin');

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  for (const dir of readdirSync(root).sort().reverse()) {
    for (const tail of ['chrome-linux/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
      if (existsSync(`${root}/${dir}/${tail}`)) return `${root}/${dir}/${tail}`;
    }
  }
  return undefined;
}

/**
 * Ce qui est touchable, et sous quel titre.
 *
 * On relève le libellé **et** la section : deux lignes peuvent porter le même
 * mot à deux endroits du jeu, et les confondre ferait passer une disparition
 * pour un déplacement.
 *
 * La raison d'un refus compte autant que le refus : « Tu es déjà en couple… »
 * est une information de jeu, pas une absence. Une migration qui garde le
 * bouton et perd la phrase a perdu quelque chose.
 */
const INVENTORY = `(() => {
  const clean = (s) => (s ?? '').replace(/\\s+/g, ' ').trim();

  /*
   * **L'inventaire ne doit pas connaître les classes d'une époque.**
   *
   * Première version : elle lisait « row-title » et « section-title ». La
   * migration du premier écran a renommé les deux en « ui-row-title » et
   * « ui-section-head », et l'outil a rapporté quatre-vingt-huit
   * disparitions — dont vingt amitiés — sur un écran où rien n'avait
   * disparu. Un garde-fou qui hurle au faux positif est pire qu'aucun : on
   * apprend à ne plus le lire.
   *
   * Les deux noms sont donc acceptés, et le repli est le texte de
   * l'élément lui-même.
   */
  const TITLE = '.row-title, .ui-row-title';
  const SUB = '.row-sub, .ui-row-sub';
  const HEAD = '.section-title, .ui-section-head, .section-head, h2, h3';

  const sectionOf = (el) => {
    const section = el.closest('.section, .ui-section, section');
    return clean(section?.querySelector(HEAD)?.textContent).slice(0, 40);
  };

  const items = [];
  const seen = new Set();
  // Les feuilles se superposent : on n'inventorie que le dessus, sinon on
  // compte deux fois ce que la feuille du dessous montre encore.
  const top = document.querySelector('.sheet:last-of-type') ?? document;

  for (const el of top.querySelectorAll('button, [role="button"], a[href]')) {
    const box = el.getBoundingClientRect();
    if (box.height < 2 || box.width < 2) continue;
    const label = clean(el.querySelector(TITLE)?.textContent ?? el.textContent);
    if (!label) continue;
    const key = sectionOf(el) + ' › ' + label.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      section: sectionOf(el),
      label: label.slice(0, 60),
      // « Fermé » se dit de trois façons selon l'âge du composant :
      // l'attribut du navigateur, la classe de l'ancienne ligne, et
      // « data-closed » de la nouvelle — qui refuse l'appui sans se retirer
      // de l'arbre d'accessibilité. Les trois comptent pour la même chose.
      closed: el.disabled === true
        || el.classList.contains('disabled')
        || el.hasAttribute('data-closed'),
      reason: clean(el.querySelector(SUB)?.textContent).slice(0, 70),
    });
  }
  return items;
})()`;

const executablePath = findChromium();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});

const fixture = (name) => execFileSync(
  'node',
  ['--experimental-strip-types', `${ROOT}tools/${name}`],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });

async function loadSave(raw) {
  await page.evaluate((text) => { localStorage.setItem('odyssia.save.v1', text); }, raw);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
}

await loadSave(fixture('fixture-leurs.mjs'));

async function clearEvents() {
  for (let i = 0; i < 25; i++) {
    if (!(await page.locator('.overlay').count())) return;
    const choice = page.locator('.overlay .choice').first();
    if (await choice.count()) { await choice.click({ force: true }); await page.waitForTimeout(120); continue; }
    const cont = page.locator('.overlay').getByRole('button', { name: 'Continuer' });
    if (await cont.count()) { await cont.click({ force: true }); await page.waitForTimeout(120); continue; }
    await page.locator('.overlay').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(120);
  }
}

async function closeSheets() {
  for (let i = 0; i < 5; i++) {
    const back = page.locator('.sheet-back');
    if (!(await back.count())) return;
    await back.last().click({ force: true });
    await page.waitForTimeout(200);
  }
}

const TABS = ['Vie', 'Études', 'Gens', 'Avoirs', 'Agenda'];
const inventory = {};
const missed = [];

await clearEvents();

async function walkTabs(prefix = '') {
for (const label of TABS) {
  await closeSheets();
  const tab = page.locator('.tab-item').filter({ hasText: label }).first();
  if (!(await tab.count())) { missed.push(`onglet ${label} introuvable`); continue; }
  await tab.click();
  await page.waitForTimeout(420);
  await clearEvents();
  inventory[label] = await page.evaluate(INVENTORY);

  // Puis chaque feuille que l'écran ouvre : c'est là que vivent la plupart
  // des actions, et une migration qui perd une feuille perd beaucoup.
  // `data-row` plutôt qu'une classe : viser « button.row » avait cessé
  // d'ouvrir les feuilles du premier écran migré, en silence, et
  // l'inventaire rétrécissait sans qu'une action ait bougé.
  const ROWS = '.app-body button[data-row]';
  const rows = await page.locator(ROWS).all();
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const row = page.locator(ROWS).nth(i);
    if (!(await row.count())) continue;
    // La vue porte le **titre** de la ligne qui l'ouvre, pas son texte
    // entier. Le texte entier contient le sous-titre, donc la présentation :
    // reformuler une ligne renommait la vue, et l'inventaire annonçait
    // vingt-huit disparitions et vingt-huit apparitions pour la même chose.
    const title = row.locator('.row-title, .ui-row-title').first();
    const raw = (await title.count())
      ? await title.textContent().catch(() => '')
      : await row.textContent().catch(() => '');
    const name = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
    await clearEvents();
    if (await page.locator('.sheet').count()) {
      inventory[`${prefix}${label} › ${name}`] = await page.evaluate(INVENTORY);
      await closeSheets();
    }
    await page.waitForTimeout(160);
  }

  /*
   * **Les tuiles ouvrent des panneaux que les lignes n'ouvrent pas.**
   *
   * L'agenda n'est pas fait de lignes mais d'une grille de tuiles : médecin,
   * chirurgie, sport, bien-être, voyages, sorties, jeux d'argent, réseaux,
   * renommée, animaux, démarches, testament, justice, activités illégales.
   * Quatorze panneaux, et pas un seul dans le témoin — la marche ne cliquait
   * que `button[data-row]`.
   *
   * C'est le même angle mort que l'établissement scolaire, trouvé de la même
   * façon : en vérifiant la couverture **avant** de toucher à l'écran plutôt
   * qu'en la supposant.
   */
  const tiles = await page.locator('.app-body button.tile').count();
  for (let i = 0; i < Math.min(tiles, 16); i++) {
    const tile = page.locator('.app-body button.tile').nth(i);
    if (!(await tile.count())) continue;
    const name = (await tile.textContent().catch(() => '') ?? '')
      .replace(/\s+/g, ' ').trim().slice(0, 30);
    await tile.scrollIntoViewIfNeeded().catch(() => {});
    await tile.click({ force: true }).catch(() => {});
    await page.waitForTimeout(420);
    await clearEvents();
    if (await page.locator('.sheet').count()) {
      inventory[`${prefix}${label} ▸ ${name}`] = await page.evaluate(INVENTORY);
      await closeSheets();
    }
    await page.waitForTimeout(140);
  }
}
}

await walkTabs();

/* ------------------------------------------------------------------ */
/* La scolarité, sur une seconde partie                                */
/* ------------------------------------------------------------------ */

/*
 * **L'écran le plus long du jeu n'était pas dans le parcours.**
 *
 * `SchoolScreen.tsx` fait 1 305 lignes — le plus gros fichier du projet — et
 * ne s'ouvre que pour un personnage scolarisé. La partie adulte qui sert au
 * reste de l'inventaire n'y arrive jamais : les vingt et une vues du témoin
 * n'en contenaient pas une seule.
 *
 * Le migrer sans cette passe reviendrait à réécrire mille trois cents lignes
 * sans filet, ce qui est très exactement ce que ce fichier existe pour
 * empêcher. On charge donc une seconde sauvegarde et l'on refait le tour.
 *
 * **Et pas celle de l'examen**, qui paraissait le choix évident : elle tombe
 * pile sur l'année où la session s'ouvre, or c'est la même année où le cycle
 * se termine et où l'on cesse d'être scolarisé. La ligne « entrer dans
 * l'établissement » est justement conditionnée à `inSchool` : le personnage
 * de l'examen ne la voit jamais. C'est le revers exact du défaut corrigé
 * lors de la passe mobile, où la salle d'examen disparaissait avec le statut
 * d'élève.
 *
 * L'élève pris pour cible, lui, est scolarisé par construction : le
 * harcèlement suppose une classe.
 */
await loadSave(fixture('fixture-harcele.mjs'));
await clearEvents();
await walkTabs('élève · ');

// Puis l'établissement lui-même, qui est une feuille et non une ligne.
await closeSheets();
const etudes = page.locator('.tab-item').filter({ hasText: 'Études' }).first();
if (await etudes.count()) {
  await etudes.click();
  await page.waitForTimeout(420);
  await clearEvents();
  const enter = page.getByRole('button', { name: /Entrer dans l’établissement/ }).first();
  if (!(await enter.count())) missed.push('« Entrer dans l’établissement » introuvable');
  else {
    await enter.click({ force: true });
    await page.waitForTimeout(520);
    await clearEvents();
    inventory['élève · L’établissement'] = await page.evaluate(INVENTORY);

    // Et ses panneaux : camarades, personnel, ce qu'on y fait.
    const ROWS = '.sheet button[data-row]';
    const count = await page.locator(ROWS).count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const row = page.locator(ROWS).nth(i);
      if (!(await row.count())) continue;
      const title = row.locator('.row-title, .ui-row-title').first();
      const raw = (await title.count())
        ? await title.textContent().catch(() => '')
        : await row.textContent().catch(() => '');
      const name = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.click({ force: true }).catch(() => {});
      await page.waitForTimeout(420);
      await clearEvents();
      const sheets = await page.locator('.sheet').count();
      if (sheets > 1) {
        inventory[`élève · établissement › ${name}`] = await page.evaluate(INVENTORY);
        const back = page.locator('.sheet-back');
        if (await back.count()) { await back.last().click({ force: true }); await page.waitForTimeout(240); }
      }
    }
  }
}

await browser.close();

/* ------------------------------------------------------------------ */
/* Comparer au témoin                                                  */
/* ------------------------------------------------------------------ */

const flatten = (inv) => {
  const out = new Map();
  for (const [screen, items] of Object.entries(inv)) {
    for (const item of items) out.set(`${screen} ▸ ${item.section} › ${item.label}`, item);
  }
  return out;
};

writeFileSync(`${ROOT}.parite/inventaire.json`, JSON.stringify(inventory, null, 2));

const now = flatten(inventory);
const total = now.size;

if (updateWitness) {
  writeFileSync(WITNESS, JSON.stringify(inventory, null, 2));
  console.log(`témoin écrit : ${total} entrées touchables dans ${Object.keys(inventory).length} vues`);
  if (missed.length > 0) for (const line of missed) console.log(`  non ouvert : ${line}`);
  process.exit(0);
}

if (!existsSync(WITNESS)) {
  console.log('aucun témoin : lance `node tools/audit-parite.mjs --temoin` d’abord');
  process.exit(1);
}

const before = flatten(JSON.parse(readFileSync(WITNESS, 'utf8')));
const lost = [...before.keys()].filter((k) => !now.has(k));
const added = [...now.keys()].filter((k) => !before.has(k));
// Une ligne qui reste mais qui change d'état — ouverte devenue fermée, ou
// l'inverse — n'est pas une disparition. C'est quand même une nouvelle, et
// la taire ferait passer pour identique un écran où plus rien ne se clique.
const flipped = [...now.keys()]
  .filter((k) => before.has(k) && before.get(k).closed !== now.get(k).closed)
  .map((k) => `${k} — ${before.get(k).closed ? 'rouverte' : 'fermée'}`);

console.log(`inventaire : ${total} entrées touchables · témoin : ${before.size}`);
if (missed.length > 0) for (const line of missed) console.log(`  non ouvert : ${line}`);
console.log(`disparues : ${lost.length} · ajoutées : ${added.length}`
  + ` · changées d'état : ${flipped.length}`);
for (const line of flipped.slice(0, 20)) console.log(`  ~ ${line}`);
for (const key of lost.slice(0, 40)) console.log(`  − ${key}`);
for (const key of added.slice(0, 40)) console.log(`  + ${key}`);

process.exit(lost.length > 0 ? 1 : 0);
