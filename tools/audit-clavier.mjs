/**
 * Le clavier virtuel, mesuré.
 *
 * §18 et §71 : sur un téléphone, écrire est un moment à part. Le clavier
 * occupe la moitié basse de l'écran, la page se réduit d'autant, et tout ce
 * qui était bien placé cesse de l'être. C'était le dernier angle mort de la
 * passe mobile — le rapport disait « aucun champ de saisie n'apparaît dans
 * les huit écrans parcourus », ce qui était vrai du parcours et faux du jeu :
 * il y en a **sept**, et la première chose qu'on y fait est d'écrire son nom.
 *
 * Cinq défauts, et ce sont ceux qui gênent vraiment :
 *
 * - **le zoom d'iOS** : sous 16 points de police, Safari agrandit la page à
 *   la mise au point — et ne la réduit jamais. On finit de taper son nom sur
 *   un jeu deux fois trop grand, sans moyen de revenir.
 * - **le mauvais clavier** : un champ de montant qui ouvre un clavier de
 *   texte, un champ de prénom sans majuscule automatique, une touche Entrée
 *   qui dit « Entrée » là où elle devrait dire « OK ».
 * - **le champ masqué** : le clavier passe par-dessus ce qu'on écrit.
 * - **le bouton hors d'atteinte** : on a écrit, et on ne peut pas valider.
 * - **la cible trop petite** : un champ sous 44 points se rate au doigt.
 *
 * Le clavier lui-même ne s'ouvre pas dans un navigateur piloté. On le simule
 * comme le fait Android — en réduisant la hauteur de la fenêtre — et c'est
 * dit ici plutôt que sous-entendu : cela reproduit fidèlement le cas Android
 * et le cas iOS ≥ 15 pour la mise en page, mais pas la superposition d'iOS
 * ancien, où seule la fenêtre *visuelle* rétrécit.
 *
 *   node tools/audit-clavier.mjs
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { chromium } from 'playwright';

const PORT = 4191;
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

const SHOTS = `${ROOT}.clavier`;
mkdirSync(SHOTS, { recursive: true });

/** Sous ce seuil, iOS agrandit la page à la mise au point. C'est une règle du système. */
const IOS_ZOOM_FLOOR = 16;
/** Un champ se touche comme un bouton. */
const TAP_MIN = 44;
/**
 * Ce que le clavier prend.
 *
 * Un clavier portrait mesure entre 260 et 340 points selon l'appareil et la
 * barre de suggestions. On prend le cas le plus dur des téléphones courants.
 */
const KEYBOARD = 336;

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
/* Ce qu'on lit d'un champ                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que le champ demande au système, et ce que le système en fera.
 *
 * Rien n'est déduit d'un nom de variable : on lit les attributs tels que le
 * navigateur les voit, parce que c'est ce qu'il transmet au clavier.
 */
const READ_FIELDS = `(() => {
  const fields = [...document.querySelectorAll('input, textarea')].filter((el) => {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    // Un curseur et un sélecteur de fichier n'ouvrent pas de clavier.
    return !['range', 'file', 'checkbox', 'radio', 'button', 'submit', 'hidden', 'color'].includes(type);
  });

  const labelOf = (el) => {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.id) {
      const tag = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (tag) return (tag.textContent ?? '').trim();
    }
    const wrap = el.closest('.field, label');
    const tag = wrap?.querySelector('.field-label, label');
    if (tag) return (tag.textContent ?? '').trim();
    return el.getAttribute('placeholder') ?? '';
  };

  return fields.map((el, i) => {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    el.dataset.clavier = String(i);
    return {
      index: i,
      label: labelOf(el).slice(0, 30),
      type: (el.getAttribute('type') ?? 'text').toLowerCase(),
      inputMode: el.getAttribute('inputmode'),
      autoComplete: el.getAttribute('autocomplete'),
      autoCapitalize: el.getAttribute('autocapitalize'),
      autoCorrect: el.getAttribute('autocorrect'),
      spellCheck: el.getAttribute('spellcheck'),
      enterKeyHint: el.getAttribute('enterkeyhint'),
      maxLength: el.getAttribute('maxlength'),
      fontSize: Math.round(Number.parseFloat(style.fontSize) * 10) / 10,
      height: Math.round(box.height * 10) / 10,
    };
  });
})()`;

/**
 * Ce que devient le champ une fois le clavier ouvert.
 *
 * On regarde trois choses, et seulement celles-là : le champ est-il encore
 * visible, quelque chose le recouvre-t-il, et reste-t-il de quoi valider.
 */
const UNDER_KEYBOARD = (index) => `(() => {
  const el = document.querySelector('[data-clavier="${index}"]');
  if (!el) return null;
  el.scrollIntoView({ block: 'center' });
  const box = el.getBoundingClientRect();
  const vh = window.innerHeight;

  const midY = box.top + box.height / 2;
  const hit = document.elementFromPoint(box.left + box.width / 2, midY);
  const visible = box.top >= -1 && box.bottom <= vh + 1;

  // Un bouton pour en finir : valider, fermer, revenir. Sans lui, on a écrit
  // et l'on est coincé — c'est du CRITICAL au sens du §120.
  const buttons = [...document.querySelectorAll('button:not([disabled])')];
  const usable = buttons.filter((b) => {
    const r = b.getBoundingClientRect();
    if (r.height < 1) return false;
    if (r.bottom > vh + 1 || r.top < -1) return false;
    const point = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return Boolean(point) && (b === point || b.contains(point));
  });

  return {
    visible,
    covered: !hit || !(el === hit || el.contains(hit)),
    top: Math.round(box.top),
    bottom: Math.round(box.bottom),
    viewport: vh,
    validators: usable.length,
    firstValidator: usable.length
      ? (usable[0].textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 24)
      : null,
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

/** Là où le jeu demande d'écrire. On y va comme un joueur y va. */
const PLACES = [
  {
    id: 'accueil',
    label: 'Juste un nom et un pays',
    go: async (page) => {
      // Les champs ne sont pas sur l'écran d'accueil : ils sont derrière le
      // troisième bouton, dans une modale. La première version cherchait à
      // la racine et n'y trouvait rien — et le disait, ce qui est le seul
      // point de cet exercice.
      await page.getByRole('button', { name: /Juste un nom et un pays/ }).click();
      await page.waitForTimeout(420);
    },
  },
  {
    id: 'creation',
    label: 'Création détaillée — identité',
    go: async (page) => {
      await page.getByText('Choisir son point de départ').click();
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: 'Détaillé' }).click({ force: true });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'nom',
    label: 'Changement de nom, en cours de partie',
    load: true,
    go: async (page) => {
      await tap(page, /Agenda/);
      // « Changer de nom » vit dans les Démarches, pas sur l'agenda lui-même.
      await open(page, /Démarches/);
      await open(page, /Changer de nom/);
    },
  },
  {
    id: 'montant',
    label: 'Montant d’un emprunt',
    load: true,
    go: async (page) => {
      await tap(page, /Avoirs/);
      await open(page, /Emprunter/);
    },
  },
];

async function tap(page, name) {
  const button = page.getByRole('button', { name });
  if (!(await button.count())) throw new Error(`onglet ${name} introuvable`);
  await button.first().click();
  await page.waitForTimeout(360);
}

/** Ouvrir une ligne, et se plaindre si elle n'est pas là. */
async function open(page, name) {
  const row = page.getByRole('button', { name }).first();
  if (!(await row.count())) throw new Error(`« ${name.source} » introuvable`);
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(440);
}

async function loadSave(page) {
  await page.evaluate((text) => {
    localStorage.setItem('odyssia.save.v1', text);
  }, save);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}

const found = [];
const problems = { zoom: [], keyboard: [], small: [], hidden: [], stuck: [], unlabelled: [] };

for (const place of PLACES) {
  const page = await browser.newPage({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  if (place.load) await loadSave(page);

  try {
    await place.go(page);
  } catch (error) {
    console.log(`${place.id} — inatteignable : ${error.message}`);
    await page.close();
    continue;
  }

  const fields = await page.evaluate(READ_FIELDS);
  if (fields.length === 0) {
    console.log(`${place.id} — aucun champ de saisie trouvé`);
    await page.close();
    continue;
  }

  for (const field of fields) {
    const where = `${place.label} · ${field.label || `champ ${field.index}`}`;
    found.push({ ...field, place: place.id, where });

    if (field.fontSize < IOS_ZOOM_FLOOR) {
      problems.zoom.push({ where, size: field.fontSize });
    }
    if (field.height < TAP_MIN) {
      problems.small.push({ where, height: field.height });
    }
    if (!field.label) problems.unlabelled.push({ where });

    // Le bon clavier : un montant veut des chiffres, un nom veut une
    // majuscule et pas de correction automatique, et toute touche de
    // validation doit dire ce qu'elle fait.
    const wants = field.type === 'number' || /montant|somme|prix/i.test(field.label)
      ? 'numérique' : 'texte';
    const missing = [];
    if (wants === 'numérique' && !field.inputMode) missing.push('inputMode');
    if (wants === 'texte' && !field.autoCapitalize) missing.push('autoCapitalize');
    if (wants === 'texte' && !field.autoComplete) missing.push('autoComplete');
    if (!field.enterKeyHint) missing.push('enterKeyHint');
    if (missing.length > 0) problems.keyboard.push({ where, missing });

    // Puis le clavier lui-même : on rétrécit, on met au point, on regarde.
    await page.locator(`[data-clavier="${field.index}"]`).focus().catch(() => {});
    await page.setViewportSize({ width: 360, height: 800 - KEYBOARD });
    await page.waitForTimeout(320);
    const under = await page.evaluate(UNDER_KEYBOARD(field.index));
    if (under) {
      if (!under.visible || under.covered) {
        problems.hidden.push({ where, top: under.top, bottom: under.bottom, viewport: under.viewport });
      }
      if (under.validators === 0) problems.stuck.push({ where });
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(200);
  }

  await page.locator('[data-clavier="0"]').focus().catch(() => {});
  await page.setViewportSize({ width: 360, height: 800 - KEYBOARD });
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${SHOTS}/${place.id}.png`, fullPage: false });
  await page.close();
}

await browser.close();

/* ------------------------------------------------------------------ */
/* Le rapport                                                          */
/* ------------------------------------------------------------------ */

const count = (list) => list.length;
const lines = [];
lines.push('# Audit du clavier virtuel');
lines.push('');
lines.push('Mesuré par `tools/audit-clavier.mjs`, sur un écran de 360×800 avec');
lines.push('`hasTouch`. Le clavier est simulé comme Android le fait : la fenêtre');
lines.push(`perd ${KEYBOARD} points de haut, et l'on regarde ce que devient le champ.`);
lines.push('');
lines.push(`**${found.length} champs de saisie** dans le jeu, sur ${PLACES.length} endroits visités.`);
lines.push('');
lines.push('Le compte varie d’une partie à l’autre : le champ « ta propre');
lines.push('explication » appartient à une section qui ne s’ouvre que pour');
lines.push('certains points de départ. Ce n’est pas une mesure instable, c’est le');
lines.push('jeu — et mieux vaut le dire que d’arrondir.');
lines.push('');
lines.push('| Défaut | Champs |');
lines.push('| --- | --- |');
lines.push(`| iOS agrandit la page à la mise au point (police < ${IOS_ZOOM_FLOOR} pt) | ${count(problems.zoom)} |`);
lines.push(`| Mauvais clavier ou touche muette | ${count(problems.keyboard)} |`);
lines.push(`| Champ sous ${TAP_MIN} points | ${count(problems.small)} |`);
lines.push('| Champ masqué par le clavier | ' + count(problems.hidden) + ' |');
lines.push('| Rien pour valider une fois le clavier ouvert | ' + count(problems.stuck) + ' |');
lines.push('| Champ sans intitulé | ' + count(problems.unlabelled) + ' |');
lines.push('');

const section = (title, list, render) => {
  if (list.length === 0) return;
  lines.push(`## ${title}`);
  lines.push('');
  for (const item of list) lines.push(`- ${render(item)}`);
  lines.push('');
};

section('Le zoom d’iOS', problems.zoom, (x) => `${x.where} — ${x.size} pt`);
section('Le clavier demandé', problems.keyboard, (x) => `${x.where} — manque : ${x.missing.join(', ')}`);
section('Trop petit pour le doigt', problems.small, (x) => `${x.where} — ${x.height} pt de haut`);
section('Masqué par le clavier', problems.hidden,
  (x) => `${x.where} — de ${x.top} à ${x.bottom}, fenêtre ${x.viewport}`);
section('Impossible à valider', problems.stuck, (x) => x.where);
section('Sans intitulé', problems.unlabelled, (x) => x.where);

lines.push('## Les champs trouvés');
lines.push('');
lines.push('| Où | Type | Police | Hauteur | inputMode | autoCapitalize | enterKeyHint |');
lines.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const f of found) {
  lines.push(`| ${f.where} | \`${f.type}\` | ${f.fontSize} pt | ${f.height} pt |`
    + ` ${f.inputMode ?? '—'} | ${f.autoCapitalize ?? '—'} | ${f.enterKeyHint ?? '—'} |`);
}
lines.push('');

writeFileSync(`${ROOT}MOBILE_KEYBOARD_AUDIT.md`, lines.join('\n'));

console.log(`champs trouvés : ${found.length}`);
for (const [key, list] of Object.entries(problems)) {
  console.log(`${key} : ${list.length}`);
}
console.log('rapport écrit dans MOBILE_KEYBOARD_AUDIT.md');

// Sans cette ligne, le serveur d'aperçu garde la boucle d'événements ouverte
// et l'outil ne rend jamais la main : le rapport est écrit, et l'on attend
// devant un terminal qui ne dit rien.
process.exit(0);
