/**
 * L'orientation paysage, mesurée.
 *
 * §105 et §42, et une mise au point d'abord, parce que les rapports
 * précédents disaient « le jeu est conçu en portrait et rien ne la force »
 * comme si cela réglait la question. Ce n'est pas le cas :
 *
 * `manifest.webmanifest` déclare `"orientation": "portrait"`. Cette ligne ne
 * vaut que pour une application **installée**, en mode autonome, et
 * seulement sur Android. Dans un onglet de navigateur — c'est-à-dire pour la
 * quasi-totalité des joueurs — et sur iOS quoi qu'il arrive, tourner le
 * téléphone tourne le jeu. Le verrou existe sur le papier et pas sur
 * l'écran.
 *
 * On mesure donc deux choses.
 *
 * **Ce qui casse quand la hauteur s'effondre.** Un téléphone couché fait 360
 * points de haut au lieu de 800. L'en-tête et la barre du bas ne rétrécissent
 * pas ; ce qui reste au contenu est ce qui décide si le jeu est jouable ou
 * simplement affiché. On y passe la même sonde qu'en portrait —
 * `sonde-mobile.mjs`, mêmes seuils, même code — plus deux mesures qui n'ont
 * de sens que couché.
 *
 * **Ce qui survit à la rotation** (§42). Tourner le téléphone ne doit pas
 * perdre la partie, la feuille ouverte, ni le mini-jeu en cours.
 *
 *   node tools/audit-paysage.mjs
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import { GAP_MIN, PROBE, TAP_MIN, TEXT_MIN } from './sonde-mobile.mjs';

const PORT = 4195;
const ROOT = new URL('..', import.meta.url).pathname;
/*
 * On construit avant de servir : `vite preview` sert `dist/` tel quel, et
 * auditer la construction précédente revient à auditer le jeu d'avant.
 * `audit-parite.mjs` porte l'histoire complète de cette panne-là.
 */
execFileSync('npx', ['vite', 'build'], { cwd: ROOT, stdio: 'ignore' });
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
  stdio: 'ignore', cwd: ROOT, detached: true,
});
process.on('exit', () => {
  try { process.kill(-server.pid, 'SIGKILL'); } catch { /* déjà arrêté */ }
});
await new Promise((r) => setTimeout(r, 3000));

const SHOTS = `${ROOT}.paysage`;
mkdirSync(SHOTS, { recursive: true });

/** Les mêmes appareils qu'en portrait, couchés. */
const VIEWPORTS = [
  { id: '800x360', label: 'petit Android couché', width: 800, height: 360 },
  { id: '812x375', label: 'iPhone standard couché', width: 812, height: 375 },
  { id: '844x390', label: 'iPhone 14 couché', width: 844, height: 390 },
  { id: '932x430', label: 'grand iPhone couché', width: 932, height: 430 },
];

/**
 * Ce qu'il faut au contenu pour que le jeu soit jouable et pas seulement
 * affiché : de quoi montrer un titre, deux lignes et un bouton.
 */
const CONTENT_MIN = 180;

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
 * Ce que le paysage ajoute à la sonde ordinaire.
 *
 * Deux choses, et elles ne se voient qu'en hauteur réduite : combien il reste
 * au contenu une fois l'en-tête et la barre déduits, et si la zone défilante
 * peut réellement atteindre son bas.
 */
const LANDSCAPE_PROBE = `(() => {
  const vh = window.innerHeight;
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), height: Math.round(r.height) };
  };

  const header = box('.app-header') ?? box('.sheet-header');
  const nav = box('.nav, .tabbar');
  const body = document.querySelector('.app-body') ?? document.querySelector('.sheet-body');
  const chrome = (header?.height ?? 0) + (nav?.height ?? 0);

  // Le bas d'une zone défilante est-il atteignable ? Une hauteur nulle ou
  // négative veut dire qu'il n'y a littéralement pas de place pour lire.
  let reachable = null;
  if (body) {
    const before = body.scrollTop;
    body.scrollTop = body.scrollHeight;
    reachable = body.scrollTop + body.clientHeight >= body.scrollHeight - 2;
    body.scrollTop = before;
  }

  return {
    viewport: vh,
    header: header?.height ?? 0,
    nav: nav?.height ?? 0,
    chrome,
    content: Math.max(0, vh - chrome),
    reachable,
    // Une surface de mini-jeu qui déborde par le bas : en paysage, c'est le
    // premier candidat, puisqu'elles sont taillées sur un rapport de forme.
    game: (() => {
      const el = document.querySelector('.minigame-surface');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { height: Math.round(r.height), fits: r.bottom <= vh + 1 };
    })(),
  };
})()`;

/* ------------------------------------------------------------------ */
/* Le parcours                                                         */
/* ------------------------------------------------------------------ */

const executablePath = findChromium();
const browser = await chromium.launch(executablePath ? { executablePath } : {});

const save = execFileSync(
  'node',
  ['--experimental-strip-types', `${ROOT}tools/fixture-investor.mjs`],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

const SCREENS = [
  { id: 'journal', label: 'Journal', go: (page) => tab(page, /Vie/) },
  { id: 'etudes', label: 'Études', go: (page) => tab(page, /Études/) },
  { id: 'gens', label: 'Gens', go: (page) => tab(page, /Gens/) },
  { id: 'avoirs', label: 'Avoirs', go: (page) => tab(page, /Avoirs/) },
  { id: 'agenda', label: 'Agenda', go: (page) => tab(page, /Agenda/) },
  {
    id: 'feuille',
    label: 'La fiche d’un proche',
    go: async (page) => {
      await tab(page, /Gens/);
      // **Une ligne de personne**, pas la première venue. La première ligne
      // de l'onglet est « Application de rencontre », qui ouvre une modale :
      // l'écran mesuré n'était donc pas une feuille, et le test de rotation
      // du §42 attendait une feuille qui n'existait pas. L'audit annonçait
      // « Une feuille ouverte » et regardait autre chose.
      const row = page.locator('.app-body button[data-row]')
        .filter({ hasText: /Père|Mère|Frère|Sœur|Ami|Amie|Épouse|Époux|Fils|Fille|Conjoint/ })
        .first();
      if (!(await row.count())) throw new Error('aucune fiche de proche dans cette partie');
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await page.waitForTimeout(500);
      if (!(await page.locator('.sheet-title').count())) {
        throw new Error('la ligne n’a pas ouvert de feuille');
      }
    },
  },
];

async function tab(page, name) {
  const button = page.getByRole('button', { name });
  if (!(await button.count())) throw new Error(`onglet introuvable : ${name}`);
  await button.first().click();
  await page.waitForTimeout(340);
}

async function clearEvents(page) {
  for (let i = 0; i < 20; i++) {
    if (!(await page.locator('.overlay').count())) return;
    const choice = page.locator('.overlay .choice').first();
    if (await choice.count()) { await choice.click({ force: true }); await page.waitForTimeout(90); continue; }
    const cont = page.locator('.overlay').getByRole('button', { name: 'Continuer' });
    if (await cont.count()) { await cont.click({ force: true }); await page.waitForTimeout(90); continue; }
    await page.locator('.overlay').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(90);
  }
}

const findings = [];
const unreachable = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((raw) => { localStorage.setItem('odyssia.save.v1', raw); }, save);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await clearEvents(page);

  for (const screen of SCREENS) {
    await clearEvents(page);
    try {
      await screen.go(page);
    } catch (error) {
      unreachable.push(`${vp.id} · ${screen.label} — ${error.message}`);
      continue;
    }
    await page.waitForTimeout(240);
    const result = await page.evaluate(PROBE);
    const land = await page.evaluate(LANDSCAPE_PROBE);
    findings.push({ vp, screen, result, land });
    if (vp.id === '800x360') {
      await page.screenshot({ path: `${SHOTS}/${screen.id}-800.png`, fullPage: false });
    }
    for (let i = 0; i < 4; i++) {
      const back = page.locator('.sheet-back');
      if (!(await back.count())) break;
      await back.last().click({ force: true });
      await page.waitForTimeout(180);
    }
  }
  await page.close();
}

/* ------------------------------------------------------------------ */
/* §42 — ce qui survit à la rotation                                   */
/* ------------------------------------------------------------------ */

/**
 * Tourner le téléphone, et regarder ce qui reste.
 *
 * Trois choses doivent survivre, et elles se perdent de trois façons
 * différentes : la partie (une sauvegarde relue de travers), la feuille
 * ouverte (un état d'écran remonté à la racine), le mini-jeu en cours (une
 * boucle qui redémarre parce que la coquille a été démontée).
 */
const rotation = { partie: null, feuille: null, minijeu: null, notes: [] };
{
  const page = await browser.newPage({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2, hasTouch: true, isMobile: true,
  });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((raw) => { localStorage.setItem('odyssia.save.v1', raw); }, save);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await clearEvents(page);

  const identity = () => page.evaluate(() => {
    const header = document.querySelector('.app-header')?.textContent ?? '';
    return header.replace(/\\s+/g, ' ').trim().slice(0, 60);
  });

  const before = await identity();
  await page.setViewportSize({ width: 800, height: 360 });
  await page.waitForTimeout(500);
  const after = await identity();
  rotation.partie = { before, after, kept: Boolean(before) && before === after };

  // Une feuille ouverte survit-elle ?
  //
  // **On vérifie d'abord qu'elle est ouverte.** La première version tournait
  // l'écran puis constatait l'absence de feuille, et écrivait « refermée » —
  // alors que le titre lu valait la chaîne vide, c'est-à-dire qu'aucune
  // feuille n'avait jamais été ouverte. Un échec qu'on n'a pas su provoquer
  // n'est pas un échec, et le rapporter aurait envoyé chercher un défaut
  // inexistant.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(400);
  await clearEvents(page);
  // **Le même chemin que le parcours principal**, qui lui l'ouvre sans faute.
  // La version d'avant refaisait le trajet à la main et avalait l'erreur de
  // l'onglet : elle rapportait « non testée » sans dire qu'elle n'avait même
  // pas atteint la liste.
  try {
    await SCREENS.find((x) => x.id === 'feuille').go(page);
  } catch (error) {
    rotation.notes.push(`la fiche n'a pas pu être ouverte : ${error.message}`);
  }
  {
    const title = ((await page.locator('.sheet-title').first().textContent()
      .catch(() => '')) ?? '').replace(/\\s+/g, ' ').trim();
    if (!title) {
      rotation.notes.push('la fiche ne s’est pas ouverte : rotation d’une feuille non testée');
    } else {
      await page.setViewportSize({ width: 800, height: 360 });
      await page.waitForTimeout(600);
      const stillOpen = (await page.locator('.sheet').count()) > 0;
      const after2 = ((await page.locator('.sheet-title').first().textContent()
        .catch(() => '')) ?? '').replace(/\\s+/g, ' ').trim();
      rotation.feuille = { kept: stillOpen && title === after2, title: title.slice(0, 40) };
      await page.screenshot({ path: `${SHOTS}/rotation-feuille.png` });
    }
  }

  // Un mini-jeu en cours survit-il ?
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(400);
  const jailed = execFileSync(
    'node',
    ['--experimental-strip-types', `${ROOT}tools/fixture-jailed.mjs`],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  await page.evaluate((raw) => { localStorage.setItem('odyssia.save.v1', raw); }, jailed);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await clearEvents(page);
  await tab(page, /Agenda/).catch(() => {});
  const cell = page.locator('button[data-row]').filter({ hasText: /an\(s\) restants/ }).first();
  if (await cell.count()) {
    await cell.click();
    await page.waitForTimeout(440);
    const attempt = page.getByRole('button', { name: /Tenter cette nuit/ }).first();
    if ((await attempt.count()) && !(await attempt.isDisabled())) {
      await attempt.click();
      await page.waitForSelector('.minigame-surface', { timeout: 4000 }).catch(() => {});
      const running = (await page.locator('.minigame-surface').count()) > 0;
      await page.setViewportSize({ width: 800, height: 360 });
      await page.waitForTimeout(600);
      const still = (await page.locator('.minigame-surface').count()) > 0;
      const land = await page.evaluate(LANDSCAPE_PROBE);
      rotation.minijeu = { running, still, fits: land.game?.fits ?? null, height: land.game?.height ?? 0 };
      await page.screenshot({ path: `${SHOTS}/rotation-minijeu.png` });
    } else rotation.notes.push('tentative d’évasion indisponible : mini-jeu non testé à la rotation');
  } else rotation.notes.push('écran de détention introuvable : mini-jeu non testé à la rotation');

  await page.close();
}

await browser.close();

/* ------------------------------------------------------------------ */
/* Le rapport                                                          */
/* ------------------------------------------------------------------ */

const total = (key) => findings.reduce((n, f) => n + f.result[key].length, 0);
const worstContent = findings.length === 0 ? 0
  : Math.min(...findings.map((f) => f.land.content));
const unreachableBottom = findings.filter((f) => f.land.reachable === false);
const tooTight = findings.filter((f) => f.land.content < CONTENT_MIN);

const lines = [];
lines.push('# Audit de l’orientation paysage');
lines.push('');
lines.push('## D’abord : le verrou n’en est pas un');
lines.push('');
lines.push('`manifest.webmanifest` déclare `"orientation": "portrait"`, et les rapports');
lines.push('précédents s’en contentaient — « le jeu est conçu en portrait, rien ne la');
lines.push('force ». Cette ligne ne vaut que pour une application **installée**, en mode');
lines.push('autonome, et seulement sur Android. Dans un onglet de navigateur, et sur iOS');
lines.push('quoi qu’il arrive, tourner le téléphone tourne le jeu.');
lines.push('');
lines.push('Le paysage n’est donc pas un cas exotique : c’est le cas de tout joueur qui');
lines.push('se couche avec son téléphone. Il est mesuré ici avec **la même sonde qu’en');
lines.push('portrait** (`tools/sonde-mobile.mjs`), plus deux mesures qui n’ont de sens');
lines.push('que couché.');
lines.push('');
lines.push('La ligne du manifeste est conservée : elle sert les joueurs qui installent');
lines.push('le jeu sur Android, et elle ne coûte rien aux autres. Elle cesse simplement');
lines.push('de tenir lieu de réponse.');
lines.push('');
lines.push(`Testé sur ${VIEWPORTS.length} tailles × ${SCREENS.length} écrans.`);
lines.push('');

lines.push('## Le compte');
lines.push('');
lines.push('| Mesure | Paysage |');
lines.push('| --- | --- |');
lines.push(`| Débordement horizontal | ${total('overflow')} |`);
lines.push(`| Cibles sous ${TAP_MIN} points | ${total('small')} |`);
lines.push(`| Cibles trop serrées (< ${GAP_MIN} pt) | ${total('crowded')} |`);
lines.push(`| Texte coupé par une ellipse | ${total('clipped')} |`);
lines.push(`| Texte sous ${TEXT_MIN} points | ${total('tiny')} |`);
lines.push(`| Contenu masqué par la barre | ${total('hidden')} |`);
lines.push(`| Écrans dont le bas est inatteignable | ${unreachableBottom.length} |`);
lines.push(`| Écrans laissant moins de ${CONTENT_MIN} pt au contenu | ${tooTight.length} |`);
lines.push('');

lines.push('## Ce qui reste au contenu');
lines.push('');
lines.push('C’est la mesure propre au paysage : la hauteur de l’écran moins l’en-tête et');
lines.push('la barre du bas, qui ne rétrécissaient pas quand le téléphone se couche.');
lines.push('');
lines.push('**Avant correction**, sur 800×360 : en-tête 113 pt, barre 101 pt — soit');
lines.push('**214 points d’habillage sur 360**, 59 % de l’écran, et 146 points laissés');
lines.push('au jeu. Dix-huit des vingt-quatre écrans mesurés passaient sous le seuil.');
lines.push('');
lines.push('La correction ne change pas la mise en page — le jeu reste une colonne, et');
lines.push('c’est la bonne forme. Elle reprend la hauteur à l’habillage, qui n’en avait');
lines.push('pas besoin, en laissant intactes les deux règles qui appartiennent au doigt');
lines.push('et non à l’écran : 44 points pour une cible, 12 pour un texte.');
lines.push('');
lines.push('| Taille | En-tête | Barre | Reste au contenu | |');
lines.push('| --- | --- | --- | --- | --- |');
for (const vp of VIEWPORTS) {
  const f = findings.find((x) => x.vp.id === vp.id && x.screen.id === 'journal');
  if (!f) continue;
  lines.push(`| ${vp.id} — ${vp.label} | ${f.land.header} pt | ${f.land.nav} pt`
    + ` | **${f.land.content} pt** | ${f.land.content >= CONTENT_MIN ? '✅' : '❌'} |`);
}
lines.push('');
lines.push(`Le pire cas mesuré laisse **${worstContent} points** au contenu.`);
lines.push('');

lines.push('## §42 — ce qui survit à la rotation');
lines.push('');
lines.push('| Ce qui doit survivre | Résultat |');
lines.push('| --- | --- |');
lines.push(`| La partie en cours | ${rotation.partie?.kept ? '✅ intacte' : '❌ perdue'} |`);
lines.push(rotation.feuille
  ? `| La feuille ouverte (${rotation.feuille.title}) | ${rotation.feuille.kept ? '✅ toujours là' : '❌ refermée'} |`
  : '| La feuille ouverte | non testée |');
lines.push(rotation.minijeu
  ? `| Le mini-jeu en cours | ${rotation.minijeu.still ? '✅ toujours en cours' : '❌ interrompu'} |`
  : '| Le mini-jeu en cours | non testé |');
if (rotation.minijeu) {
  lines.push(`| La surface du mini-jeu tient dans l’écran | ${rotation.minijeu.fits ? '✅' : '❌'}`
    + ` (${rotation.minijeu.height} pt de haut) |`);
}
lines.push('');
for (const note of rotation.notes) lines.push(`- ${note}`);
if (rotation.notes.length > 0) lines.push('');

const detail = (key, title) => {
  const rows = findings.flatMap((f) => f.result[key].map((item) => ({ f, item })));
  if (rows.length === 0) return;
  lines.push(`## ${title}`);
  lines.push('');
  for (const { f, item } of rows.slice(0, 40)) {
    // Les deux éléments et l'écart, pas seulement le premier : « telle ligne
    // est trop serrée » n'apprend rien tant qu'on ignore de quoi et de
    // combien.
    lines.push(`- ${f.vp.id} · ${f.screen.label} — ${item.el ?? item.a ?? ''}`
      + `${item.b ? ` **et** ${item.b} — ${item.gap} pt d'écart` : ''}`
      + `${item.w ? ` (${item.w}×${item.h})` : ''}`
      + `${item.size ? ` — ${item.size} pt` : ''}`);
  }
  if (rows.length > 40) lines.push(`- … et ${rows.length - 40} autres`);
  lines.push('');
};
detail('overflow', 'Débordement horizontal');
detail('small', `Cibles sous ${TAP_MIN} points`);
detail('crowded', 'Cibles trop serrées');
detail('clipped', 'Texte coupé');
detail('tiny', `Texte sous ${TEXT_MIN} points`);
detail('hidden', 'Masqué par la barre');

if (unreachable.length > 0) {
  lines.push('## Ce que le parcours n’a pas pu ouvrir');
  lines.push('');
  for (const line of unreachable) lines.push(`- ${line}`);
  lines.push('');
}

writeFileSync(`${ROOT}MOBILE_LANDSCAPE_AUDIT.md`, lines.join('\n'));

console.log(`AUDIT PAYSAGE — ${VIEWPORTS.length} tailles × ${SCREENS.length} écrans`);
console.log(`  débordement horizontal  : ${total('overflow')}`);
console.log(`  cibles sous ${TAP_MIN} pt       : ${total('small')}`);
console.log(`  cibles trop serrées      : ${total('crowded')}`);
console.log(`  texte coupé              : ${total('clipped')}`);
console.log(`  texte sous ${TEXT_MIN} pt       : ${total('tiny')}`);
console.log(`  masqué par la barre      : ${total('hidden')}`);
console.log(`  bas inatteignable        : ${unreachableBottom.length}`);
console.log(`  contenu sous ${CONTENT_MIN} pt      : ${tooTight.length} (pire ${worstContent} pt)`);
console.log(`  rotation — partie ${rotation.partie?.kept ? 'ok' : 'PERDUE'}`
  + ` · feuille ${rotation.feuille ? (rotation.feuille.kept ? 'ok' : 'PERDUE') : 'non testée'}`
  + ` · mini-jeu ${rotation.minijeu ? (rotation.minijeu.still ? 'ok' : 'INTERROMPU') : 'non testé'}`);
if (unreachable.length > 0) {
  console.log(`  écrans non ouverts       : ${unreachable.length}`);
  for (const line of unreachable) console.log(`    ${line}`);
}
console.log('rapport écrit dans MOBILE_LANDSCAPE_AUDIT.md');

process.exit(0);
