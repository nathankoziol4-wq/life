/**
 * L'audit mobile, mesuré.
 *
 * Un audit écrit à la main est une liste d'opinions : il dit ce qu'un
 * développeur croit avoir vu sur son écran, à sa taille à lui. Celui-ci ouvre
 * le jeu dans un vrai navigateur, à cinq largeurs de téléphone réelles, et
 * mesure ce que le moteur de rendu calcule.
 *
 * Cinq défauts, et ce sont ceux qui empêchent de jouer :
 *
 * - **le débordement** : quelque chose est plus large que l'écran ;
 * - **les cibles trop petites** : moins de 44 points, on ne les touche pas ;
 * - **les cibles trop proches** : deux boutons voisins, dont l'un est grave ;
 * - **le texte trop petit** : sous 12 points, on ne le lit pas sans zoomer ;
 * - **le contenu masqué** : sous la barre du bas, donc hors d'atteinte.
 *
 * Chaque problème sort avec l'élément fautif, sa taille et son écran : un
 * rapport qu'on peut corriger, pas qu'on peut seulement lire.
 *
 *   node tools/audit-mobile.mjs
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { chromium } from 'playwright';

const PORT = 4188;
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

const SHOTS = `${ROOT}.mobile`;
mkdirSync(SHOTS, { recursive: true });

/** Les tailles demandées, du plus petit Android au plus grand iPhone. */
const VIEWPORTS = [
  { id: '360x800', label: 'petit Android', width: 360, height: 800 },
  { id: '375x812', label: 'iPhone standard', width: 375, height: 812 },
  { id: '390x844', label: 'iPhone 14', width: 390, height: 844 },
  { id: '393x852', label: 'Pixel', width: 393, height: 852 },
  { id: '430x932', label: 'grand iPhone', width: 430, height: 932 },
];


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

/* ------------------------------------------------------------------ */
/* Ce qu'on mesure dans la page                                        */
/* ------------------------------------------------------------------ */

/**
 * La sonde est partagée avec l'audit du paysage : même mesure, même seuils,
 * un seul endroit où la corriger.
 */
import { GAP_MIN, PROBE, TAP_MIN, TEXT_MIN } from './sonde-mobile.mjs';

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

/** Les écrans qu'on visite, et comment on y arrive. */
const SCREENS = [
  { id: 'journal', label: 'Journal de vie', go: async (page) => { await tab(page, /Vie/); } },
  { id: 'parcours', label: 'Études', go: async (page) => { await tab(page, /Études/); } },
  { id: 'proches', label: 'Gens', go: async (page) => { await tab(page, /Gens/); } },
  { id: 'avoirs', label: 'Avoirs', go: async (page) => { await tab(page, /Avoirs/); } },
  { id: 'agenda', label: 'Agenda', go: async (page) => { await tab(page, /Agenda/); } },
  {
    id: 'fiche',
    label: 'Fiche d’un proche',
    go: async (page) => {
      await tab(page, /Gens/);
      /*
       * **La première ligne de l'onglet n'est pas un proche.**
       *
       * C'était « Application de rencontre », qui déclenchait une action et
       * n'ouvrait rien ; l'écran mesuré était donc bien une fiche. Le jour où
       * cette ligne s'est mise à ouvrir une feuille de six profils, cet audit
       * a continué de l'appeler « Fiche d'un proche » et de ne plus jamais
       * mesurer une fiche. On saute donc la section des rencontres et l'on
       * prend quelqu'un dans un groupe.
       */
      const groups = page.locator('.ui-section, .section')
        .filter({ hasNotText: 'Rencontrer du monde' });
      const row = groups.first().locator('button[data-row]').first();
      if (await row.count()) { await row.click(); await page.waitForTimeout(400); }
    },
  },
  {
    id: 'profil',
    label: 'Profil',
    go: async (page) => {
      await tab(page, /Vie/);
      const id = page.locator('.app-header-id').first();
      if (await id.count()) { await id.click(); await page.waitForTimeout(400); }
    },
  },
  {
    id: 'sante',
    label: 'Santé',
    go: async (page) => {
      await tab(page, /Agenda/);
      const tile = page.getByRole('button', { name: /Médecin/ }).first();
      if (await tile.count()) { await tile.click(); await page.waitForTimeout(400); }
    },
  },
];

/**
 * Aller sur un onglet — et se plaindre s'il n'existe pas.
 *
 * L'ancienne version se taisait, et c'est ce qui a fait mentir le rapport :
 * la barre a été refaite, « Parcours » est devenu « Études » et « Proches »
 * est devenu « Gens ». Deux entrées du parcours ne cliquaient donc plus rien,
 * et l'audit remesurait le journal en croyant visiter deux autres écrans.
 * « Zéro défaut sur huit écrans » valait pour six.
 */
async function tab(page, name) {
  const button = page.getByRole('button', { name });
  if (!(await button.count())) throw new Error(`onglet introuvable : ${name}`);
  await button.first().click();
  await page.waitForTimeout(320);
}

async function clearEvents(page) {
  for (let i = 0; i < 20; i++) {
    if (!(await page.locator('.overlay').count())) return;
    const choice = page.locator('.overlay .choice').first();
    if (await choice.count()) { await choice.click({ force: true }); await page.waitForTimeout(90); continue; }
    const cont = page.locator('.overlay').getByRole('button', { name: 'Continuer' });
    if (await cont.count()) { await cont.first().click({ force: true }); await page.waitForTimeout(90); continue; }
    await page.locator('.overlay').first().click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(90);
  }
}

const findings = [];
/** Ce que le parcours n'a pas pu ouvrir, dit plutôt qu'avalé. */
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
  await page.waitForTimeout(700);
  await clearEvents(page);

  for (const screen of SCREENS) {
    await clearEvents(page);
    try {
      await screen.go(page);
    } catch (error) {
      // Un écran conditionnel peut ne pas être atteignable sur cette partie :
      // c'est un résultat de jeu, pas une panne. Mais un audit qui se tait
      // mesure alors l'écran précédent en croyant en visiter un autre — c'est
      // exactement ce qui s'est passé quand la barre a été renommée.
      unreachable.push(`${vp.id} · ${screen.label} — ${error.message}`);
      continue;
    }
    await page.waitForTimeout(260);
    const result = await page.evaluate(PROBE);
    findings.push({ viewport: vp, screen, result });
    if (vp.id === '360x800') {
      await page.screenshot({ path: `${SHOTS}/${screen.id}-360.png`, fullPage: false });
    }
    // On referme ce qui a été ouvert avant d'aller ailleurs.
    for (let i = 0; i < 4; i++) {
      const back = page.locator('.sheet-back');
      if (!(await back.count())) break;
      await back.last().click({ force: true });
      await page.waitForTimeout(200);
    }
  }
  await page.close();
}

await browser.close();

/* ------------------------------------------------------------------ */
/* Le rapport                                                          */
/* ------------------------------------------------------------------ */

const total = (key) => findings.reduce((n, f) => n + f.result[key].length, 0);
const worst = (key) => {
  const counts = new Map();
  for (const f of findings) {
    for (const item of f.result[key]) {
      const label = item.el ? (item.axis ? `${item.el} — ${item.axis}` : item.el) : `${item.a} ↔ ${item.b}`;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`AUDIT MOBILE — ${VIEWPORTS.length} largeurs × ${SCREENS.length} écrans`);
console.log(`  débordement horizontal : ${total('overflow')} éléments`);
console.log(`  cibles sous ${TAP_MIN} pt      : ${total('small')}`);
console.log(`  cibles trop serrées     : ${total('crowded')}`);
console.log(`  texte coupé par une ellipse : ${total('clipped')}`);
console.log(`  texte sous ${TEXT_MIN} pt      : ${total('tiny')}`);
console.log(`  masqué par la barre     : ${total('hidden')}`);

const pageScrolls = findings.filter((f) => f.result.scroll.scrollWidth > f.result.scroll.clientWidth + 1);
console.log(`  pages qui défilent latéralement : ${pageScrolls.length} / ${findings.length}`);
if (unreachable.length > 0) {
  console.log(`  écrans non ouverts      : ${unreachable.length}`);
  for (const line of unreachable) console.log(`    ${line}`);
}

const section = (title, key, render) => {
  const rows = worst(key);
  if (rows.length === 0) return `### ${title}\n\nRien à signaler.\n`;
  return `### ${title}\n\n| Élément | Occurrences |\n| --- | --- |\n`
    + rows.slice(0, 30).map(([label, n]) => `| \`${label.replace(/\|/g, '¦')}\` | ${n} |`).join('\n')
    + `\n\n${render ?? ''}\n`;
};

const byScreen = SCREENS.map((s) => {
  const mine = findings.filter((f) => f.screen.id === s.id);
  const sum = (key) => mine.reduce((n, f) => n + f.result[key].length, 0);
  return `| ${s.label} | ${sum('overflow')} | ${sum('small')} | ${sum('crowded')} | ${sum('clipped')} | ${sum('tiny')} | ${sum('hidden')} |`;
}).join('\n');

const report = `# Audit mobile

Mesuré, pas déclaré : le jeu est ouvert dans un vrai navigateur à cinq
largeurs de téléphone, et l'on lit ce que le moteur de rendu calcule. Chaque
ligne ci-dessous désigne un élément réel, avec sa taille réelle.

Seuils retenus : **${TAP_MIN} points** pour une cible tactile, **${TEXT_MIN} points** pour un
texte lisible sans zoomer, **${GAP_MIN} points** entre deux cibles voisines.

## Ce qui a été testé

${VIEWPORTS.map((v) => `- ${v.width}×${v.height} — ${v.label}`).join('\n')}

${SCREENS.map((s) => `- ${s.label}`).join('\n')}

## Le compte

| Écran | Débordement | Cibles < ${TAP_MIN} pt | Cibles serrées | Texte coupé | Texte < ${TEXT_MIN} pt | Masqué |
| --- | --- | --- | --- | --- | --- | --- |
${byScreen}

Total : **${total('overflow')}** débordements, **${total('small')}** cibles trop petites,
**${total('crowded')}** couples trop serrés, **${total('tiny')}** textes illisibles,
**${total('hidden')}** éléments sous la barre.

Pages qui défilent latéralement : **${pageScrolls.length} sur ${findings.length}**.

---

${section(`CRITICAL — ce qui déborde de l’écran`, 'overflow')}
${section(`CRITICAL — ce qu’on ne peut pas toucher (< ${TAP_MIN} pt)`, 'small')}
${section('HIGH — ce que la barre du bas recouvre', 'hidden')}
${section('HIGH — deux cibles trop proches', 'crowded')}
${section('HIGH — texte coupé par une ellipse', 'clipped')}
${section(`MEDIUM — texte sous ${TEXT_MIN} points`, 'tiny')}

---

*Rapport produit par \`tools/audit-mobile.mjs\`. Relancer après chaque
correction : les chiffres sont la seule preuve que quelque chose a bougé.*
`;

writeFileSync(`${ROOT}MOBILE_UX_AUDIT.md`, report);
console.log(`\nRapport écrit : MOBILE_UX_AUDIT.md`);
process.exit(0);
