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
import { chromium } from 'playwright';

const PORT = 4188;
const ROOT = new URL('..', import.meta.url).pathname;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
  stdio: 'ignore', cwd: ROOT,
});
process.on('exit', () => { try { server.kill(); } catch { /* déjà arrêté */ } });
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

/** Ce qu'on considère comme touchable, et lisible. */
const TAP_MIN = 44;
const TEXT_MIN = 12;
/** Deux cibles graves plus proches que cela : on en touche une pour l'autre. */
const GAP_MIN = 8;

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
 * La sonde, exécutée dans la page.
 *
 * Écrite d'un bloc et sans dépendance : elle est sérialisée puis évaluée dans
 * le navigateur, où rien de ce fichier n'existe.
 */
const PROBE = `(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out = { overflow: [], small: [], crowded: [], clipped: [], tiny: [], hidden: [], scroll: null };

  const describe = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
      : '';
    const text = (el.textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 34);
    return el.tagName.toLowerCase() + id + cls + (text ? ' « ' + text + ' »' : '');
  };

  // 1. Le débordement horizontal, et qui le cause.
  const doc = document.documentElement;
  out.scroll = { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const style = getComputedStyle(el);
    if (style.position === 'fixed') continue;
    // Ce qui dépasse à droite ou commence à gauche de l'écran.
    if (r.right > vw + 1 || r.left < -1) {
      out.overflow.push({ el: describe(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
    }
  }

  // 2. Les cibles tactiles trop petites, et 3. celles trop serrées.
  //
  // On ne mesure pas la boîte de l'élément mais **ce que le doigt atteint** :
  // une icône de vingt points peut parfaitement avoir une zone de quarante,
  // par un remplissage ou un pseudo-élément étendu, et c'est ce que
  // recommande la règle. Inversement une grande boîte recouverte par autre
  // chose n'est pas touchable. elementFromPoint tranche les deux cas.
  const touchables = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [onclick]')];
  const boxes = [];
  /**
   * Ce qu'on voit vraiment d'un élément.
   *
   * L'intersection de **tous** les cadres qui le découpent, pas seulement du
   * plus proche : une ligne vit dans une carte qui coupe déjà, et cette carte
   * vit dans la zone défilante qui coupe encore. S'arrêter au premier donnait
   * une boîte qui débordait sur la barre du bas alors que rien ne dépasse.
   */
  const visibleBox = (el) => {
    const r = el.getBoundingClientRect();
    let box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (!/(auto|scroll|hidden)/.test(style.overflowY + style.overflowX)) continue;
      const c = node.getBoundingClientRect();
      box = {
        left: Math.max(box.left, c.left), right: Math.min(box.right, c.right),
        top: Math.max(box.top, c.top), bottom: Math.min(box.bottom, c.bottom),
      };
    }
    return {
      ...box,
      get width() { return this.right - this.left; },
      get height() { return this.bottom - this.top; },
    };
  };
  const reach = (el, cx, cy, dx, dy) => {
    const hit = document.elementFromPoint(cx + dx, cy + dy);
    return Boolean(hit) && (hit === el || el.contains(hit) || hit.contains(el));
  };
  const half = ${TAP_MIN} / 2 - 1;
  for (const el of touchables) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    boxes.push({ el, r });
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // Hors de l'écran : ce n'est pas un défaut de taille.
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue;
    // Une boîte déjà au seuil n'a rien à prouver. La sonde ne sert qu'à
    // *rattraper* les petites cibles bien rembourrées — sans elle, un
    // voile ouvert par-dessus la page ferait échouer le test de portée de
    // tout l'écran, y compris d'un bouton qui occupe toute la largeur.
    const bigEnough = r.width >= ${TAP_MIN} - 0.5 && r.height >= ${TAP_MIN} - 0.5;
    if (bigEnough) continue;
    const wide = r.width >= ${TAP_MIN} - 0.5
      || (reach(el, cx, cy, -half, 0) && reach(el, cx, cy, half, 0));
    const tall = r.height >= ${TAP_MIN} - 0.5
      || (reach(el, cx, cy, 0, -half) && reach(el, cx, cy, 0, half));
    if (!wide || !tall) {
      out.small.push({
        el: describe(el),
        w: Math.round(r.width), h: Math.round(r.height),
        axis: !wide && !tall ? 'les deux' : wide ? 'hauteur' : 'largeur',
      });
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      // Deux surfaces différentes ne se disputent pas le doigt : une liste
      // qui court jusqu'à la barre du bas est la disposition normale, pas un
      // piège. La règle vise deux commandes voisines du même plan.
      // La barre de navigation est un contrôle, comme le segmenté : ses
      // onglets sont voisins par construction et aucun n'est destructeur.
      // Ce qu'on traque, ce sont deux commandes distinctes du même plan.
      const inNav = (el) => Boolean(el.closest('.nav, .tabbar'));
      if (inNav(boxes[i].el) || inNav(boxes[j].el)) continue;
      const a = visibleBox(boxes[i].el);
      const b = visibleBox(boxes[j].el);
      if (a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) continue;
      if (boxes[i].el.contains(boxes[j].el) || boxes[j].el.contains(boxes[i].el)) continue;
      // Un contrôle segmenté est **un** contrôle : ses parts sont voisines
      // par construction, et aucune n'est destructrice. La règle vise deux
      // boutons distincts dont l'un serait grave.
      const seg = boxes[i].el.closest('.segmented');
      if (seg && seg === boxes[j].el.closest('.segmented')) continue;
      const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
      const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
      const overlap = dx === 0 && dy === 0;
      const gap = Math.max(dx, dy);
      if (!overlap && gap < ${GAP_MIN}) {
        out.crowded.push({ a: describe(boxes[i].el), b: describe(boxes[j].el), gap: Math.round(gap) });
      }
    }
  }

  // 3 bis. Le texte coupé par une ellipse.
  //
  // Ajouté après coup : l'audit ne regardait que la taille de police et
  // rapportait zéro défaut pendant qu'une capture d'écran montrait
  // « Parco… » et « Proch… » dans la barre de navigation. Une mesure qui ne
  // voit pas ce qu'un coup d'œil voit ne mesure pas la bonne chose.
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent ?? '').trim();
    if (!text) continue;
    const style = getComputedStyle(el);
    if (style.textOverflow !== 'ellipsis' && style.overflow !== 'hidden') continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      out.clipped.push({ el: describe(el), shown: el.clientWidth, needed: el.scrollWidth });
    }
  }

  // 4. Le texte trop petit pour être lu sans zoomer.
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent ?? '').trim();
    if (!text) continue;
    const size = Number.parseFloat(getComputedStyle(el).fontSize);
    if (size && size < ${TEXT_MIN} - 0.01) {
      out.tiny.push({ el: describe(el), size: Math.round(size * 10) / 10 });
    }
  }

  // 5. Ce que la barre du bas recouvre.
  const nav = document.querySelector('.nav, .tabbar');
  const navBox = nav ? nav.getBoundingClientRect() : null;
  // Une feuille ou une modale recouvre la barre : elle ne masque alors rien,
  // et la compter donnerait des dizaines de faux positifs.
  const navOnTop = Boolean(navBox) && (() => {
    const hit = document.elementFromPoint(navBox.left + navBox.width / 2, navBox.top + 4);
    return Boolean(hit) && nav.contains(hit);
  })();
  if (nav && navOnTop) {
    const navTop = navBox.top;
    for (const el of touchables) {
      const r = el.getBoundingClientRect();
      if (r.height === 0 || nav.contains(el)) continue;
      // Ce qui compte, c'est le **recouvrement** : la barre passe-t-elle
      // par-dessus ? Une ligne simplement coupée par le bas de sa propre
      // zone défilante n'est pas masquée, elle attend qu'on défile — et la
      // compter faisait remonter dix-sept faux positifs.
      // Ce qui est découpé par sa propre zone défilante n'est pas masqué :
      // il suffit de faire défiler. On ne regarde donc que ce qu'on voit.
      const v = visibleBox(el);
      const covered = v.height > 0 && v.bottom > navTop + 1 && v.top < navBox.bottom
        && v.right > navBox.left && v.left < navBox.right;
      if (covered) {
        out.hidden.push({ el: describe(el), top: Math.round(r.top), navTop: Math.round(navTop) });
      }
    }
  }

  const dedupe = (list, key) => {
    const seen = new Set();
    return list.filter((x) => {
      const k = key(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  out.overflow = dedupe(out.overflow, (x) => x.el);
  out.small = dedupe(out.small, (x) => x.el + x.axis);
  out.crowded = dedupe(out.crowded, (x) => x.a + x.b);
  out.clipped = dedupe(out.clipped, (x) => x.el);
  out.tiny = dedupe(out.tiny, (x) => x.el + x.size);
  out.hidden = dedupe(out.hidden, (x) => x.el);
  return out;
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

/** Les écrans qu'on visite, et comment on y arrive. */
const SCREENS = [
  { id: 'journal', label: 'Journal de vie', go: async (page) => { await tab(page, /Vie/); } },
  { id: 'parcours', label: 'Parcours', go: async (page) => { await tab(page, /Parcours/); } },
  { id: 'proches', label: 'Proches', go: async (page) => { await tab(page, /Proches/); } },
  { id: 'avoirs', label: 'Avoirs', go: async (page) => { await tab(page, /Avoirs/); } },
  { id: 'agenda', label: 'Agenda', go: async (page) => { await tab(page, /Agenda/); } },
  {
    id: 'fiche',
    label: 'Fiche d’un proche',
    go: async (page) => {
      await tab(page, /Proches/);
      const row = page.locator('button.row').first();
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

async function tab(page, name) {
  const button = page.getByRole('button', { name });
  if (await button.count()) {
    await button.first().click();
    await page.waitForTimeout(320);
  }
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
    } catch {
      // Un écran conditionnel peut ne pas être atteignable sur cette partie :
      // c'est un résultat de jeu, pas une panne.
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
