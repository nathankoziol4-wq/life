/**
 * La forme des menus, mesurée au rendu et non dans la source.
 *
 * **Pourquoi au rendu.** Compter les `<Section>` d'un fichier dit ce que
 * l'écran *peut* montrer, pas ce qu'il montre. Sur `CreationScreen`, la
 * source porte 22 sections dont une seule est précédée d'un garde
 * `advanced &&` — de quoi conclure que la bascule « Rapide / Détaillé » ne
 * sert à rien. C'est faux : le drapeau est employé 21 fois, mais à l'intérieur
 * des sections, sur des cartes et des lignes. Seule la page rendue tranche.
 *
 * **Ce qui est mesuré, et pourquoi ces quatre-là.**
 *
 * - **La hauteur**, en écrans de téléphone. Un menu de six écrans de haut
 *   demande six gestes avant d'en avoir vu le bout.
 * - **Les lignes, et la part qui agit.** Odyssia se joue au menu : une ligne
 *   qui ne sert qu'à être lue n'est pas du bruit, elle peut être ce qu'on est
 *   venu chercher. Le chiffre n'est donc pas un défaut en soi — il devient un
 *   défaut quand il n'y a aucun geste en vue.
 * - **La distance au premier geste.** C'est la mesure qui compte le plus, et
 *   la seule qui manquait : combien de pixels avant la première chose qu'on
 *   puisse faire. Au-delà d'un écran, on demande au joueur de faire confiance
 *   avant de lui montrer pourquoi.
 * - **Les lignes fermées sans raison.** Redondant avec `fermees.test.ts`, qui
 *   lit la source ; ici on voit celles qu'une partie donnée fait réellement
 *   apparaître.
 *
 *   node tools/audit-menus.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';

const PORT = 4179;
const VIEWPORT = { width: 360, height: 800 };

const probe = createServer();
probe.on('error', () => {
  console.log(`Le port ${PORT} est déjà pris — un serveur d'une exécution précédente traîne.`);
  process.exit(1);
});
probe.listen(PORT, '127.0.0.1');
await new Promise((r) => probe.once('listening', r));
await new Promise((r) => probe.close(r));

/*
 * `detached` pour pouvoir tuer le *groupe*.
 *
 * Sans cela, `server.kill()` ne tue que l'enveloppe `npx` : le `vite preview`
 * qu'elle a lancé survit, garde le port, et l'exécution suivante s'arrête sur
 * « le port est déjà pris ». C'est arrivé trois fois avant que la cause soit
 * cherchée du bon côté.
 */
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(), stdio: 'ignore', detached: true,
});
const stop = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* déjà parti */ } };
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });
await new Promise((r) => setTimeout(r, 3500));

const chrome = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(chrome) ? { executablePath: chrome } : {});
const page = await browser.newPage({ ...{ viewport: VIEWPORT }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });

/**
 * La forme de ce qui est à l'écran.
 *
 * `data-row` et `data-closed` viennent du vocabulaire de listes
 * (`ui/components/list.tsx`) ; une ligne actionnable est un `button` que rien
 * ne ferme. La distance au premier geste se mesure depuis le haut du corps
 * défilant, pas depuis la fenêtre : ce qu'on veut savoir est de combien il
 * faut faire défiler, pas où l'élément se trouve à cet instant.
 */
async function shape() {
  return page.evaluate((h) => {
    /*
     * Le conteneur qui défile n'est pas toujours le même : un écran d'onglet
     * vit dans `.app-body`, mais une feuille comme celle de la création a le
     * sien. Viser `.app-body` en dur renvoyait la hauteur du `body`, soit
     * exactement celle de la fenêtre — 800 px pour 137 lignes, ce qui est
     * impossible et aurait été publié comme un fait.
     *
     * On prend donc celui qui déborde le plus, quel qu'il soit.
     */
    const body = [...document.querySelectorAll('*')]
      .filter((el) => el.scrollHeight > el.clientHeight + 8
        && ['auto', 'scroll'].includes(getComputedStyle(el).overflowY))
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0]
      ?? document.scrollingElement ?? document.body;
    /*
     * **Tout ce qui agit, et pas seulement les lignes.**
     *
     * Le premier jet ne comptait que `[data-row]`. Sur l'onglet « Agenda »,
     * quatre sections sur six sont des grilles de `Tile` — des tuiles, pas
     * des lignes — et la mesure les rendait invisibles : elle annonçait
     * quatre sections vides occupant 56 % de l'écran et un premier geste à
     * 477 px. Les deux étaient faux, et j'ai failli refondre un écran qui
     * n'avait rien.
     *
     * On compte donc tout bouton vivant du conteneur mesuré, en retirant le
     * chrome — en-tête et barre de navigation ne sont pas le menu.
     */
    const rows = [...document.querySelectorAll('[data-row]')];
    const chrome = (el) => el.closest('.app-header, .nav, .sheet-header');
    const acts = [...body.querySelectorAll('button')]
      .filter((b) => !b.disabled && !b.hasAttribute('data-closed') && !chrome(b));
    const mute = rows.filter((r) => r.hasAttribute('data-closed')
      && !(r.querySelector('.ui-row-sub')?.textContent ?? '').trim());
    const origin = body.getBoundingClientRect().top - body.scrollTop;
    const first = acts[0] ? Math.round(acts[0].getBoundingClientRect().top - origin) : -1;
    return {
      hauteur: Math.round(body.scrollHeight),
      ecrans: +(body.scrollHeight / h).toFixed(1),
      sections: document.querySelectorAll('.ui-section').length,
      lignes: rows.length,
      agit: acts.length,
      premierGeste: first,
      fermeesMuettes: mute.length,
    };
  }, VIEWPORT.height);
}

const seen = [];
async function look(nom) {
  await page.waitForTimeout(350);
  const m = await shape();
  seen.push({ nom, ...m });
  return m;
}

/*
 * Le détail d'un menu, section par section.
 *
 * La hauteur totale dit qu'un menu est long ; elle ne dit pas *où* il l'est.
 * Sur l'écran de création, c'est ce découpage qui a montré que « Quartier »
 * pesait 1 509 px dans le mode qui promettait d'être rapide, alors que Pays
 * et Ville y étaient en lecture seule — l'inverse de ce qu'on attendait.
 *
 *   node tools/audit-menus.mjs --detail Gens
 */
const DETAIL = process.argv.includes('--detail')
  ? process.argv[process.argv.indexOf('--detail') + 1]
  : null;

async function detail(nom) {
  if (DETAIL !== nom) return;
  const parts = await page.evaluate(() => [...document.querySelectorAll('.ui-section')].map((sec) => {
    const rows = [...sec.querySelectorAll('[data-row]')];
    return {
      titre: (sec.querySelector('.ui-section-head')?.textContent ?? '?').trim().slice(0, 30),
      h: Math.round(sec.getBoundingClientRect().height),
      lignes: rows.length,
      agit: [...sec.querySelectorAll('button')]
        .filter((b) => !b.disabled && !b.hasAttribute('data-closed')).length,
    };
  }));
  const total = parts.reduce((a, b) => a + b.h, 0) || 1;
  console.log(`\n— « ${nom} », section par section —\n`);
  console.log('SECTION'.padEnd(32), 'px'.padStart(7), 'part'.padStart(6), 'lignes'.padStart(7), 'agit'.padStart(5));
  for (const x of parts.sort((a, b) => b.h - a.h)) {
    console.log(x.titre.padEnd(32), String(x.h).padStart(7), `${Math.round((x.h / total) * 100)}%`.padStart(6), String(x.lignes).padStart(7), String(x.agit).padStart(5));
  }
  console.log(`  ${parts.length} sections · ${total} px cumulés\n`);
}

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await look('Accueil');

// L'écran de création, dans ses deux modes : c'est la seule bascule de
// dévoilement progressif du jeu, et la seule façon de savoir ce qu'elle vaut
// est de mesurer la page des deux côtés.
await page.getByText('Choisir son point de départ').click();
const rapide = await look('Création · Rapide');
await page.getByRole('button', { name: 'Détaillé' }).click({ force: true });
const detaille = await look('Création · Détaillé');

// Puis la partie elle-même, onglet par onglet. Les libellés viennent de
// `TabBar.tsx` et non d'une supposition : le premier jet de cet outil visait
// « Toi », « Proches », « Argent », qui n'existent pas — la boucle passait
// donc sans rien mesurer, en silence.
await page.getByRole('button', { name: 'Naître ici' }).click({ force: true });
await page.waitForTimeout(1200);

/**
 * Solder ce qui est ouvert, pour que la mesure porte sur l'écran et non sur
 * le voile qui le couvre.
 */
async function clearEvents() {
  for (let i = 0; i < 24; i += 1) {
    const overlay = page.locator('.overlay');
    if (!(await overlay.count())) return true;
    /*
     * N'importe quel bouton ouvert, et pas seulement « Continuer ».
     *
     * Le premier jet ne cherchait que « Continuer », « Fermer », « Suivant ».
     * Or la plupart des événements d'Odyssia posent une *question* : les
     * boutons portent le choix, pas un acquiescement. Le solde échouait donc
     * dès la petite enfance, et le vieillissement s'arrêtait à deux ans — les
     * cinq onglets se mesuraient alors sur le même écran bloqué, ce qui
     * donnait cinq fois la même hauteur et aurait pu passer pour un résultat.
     */
    const choice = overlay.locator('button:not([data-closed])');
    if (await choice.count()) await choice.first().click({ force: true }).catch(() => {});
    else await overlay.first().click({ position: { x: 5, y: 5 } }).catch(() => {});
    await page.waitForTimeout(120);
  }
  return false;
}

/*
 * **Vieillir avant de mesurer, et c'est tout l'intérêt.**
 *
 * Le premier jet mesurait les onglets sur un nouveau-né : « Vie » faisait
 * 0,8 écran, « Études » 0,7, et le classement qui en sortait ne disait rien —
 * un menu vide n'a pas de problème de hiérarchie. Un personnage de trente ans
 * a un métier, des biens, des proches, un dossier médical : c'est là que les
 * menus portent leur vraie charge, donc là qu'il faut les regarder.
 */
const AGE = 30;
for (let year = 0; year < AGE; year += 1) {
  await clearEvents();
  const button = page.locator('.age-button');
  if (!(await button.count())) break;
  await button.first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(360);
}
await clearEvents();
/*
 * Dire où l'on a réellement abouti, et pas où l'on croyait aller.
 *
 * Sans cette ligne, un vieillissement bloqué passe inaperçu : les cinq
 * onglets se mesurent alors sur le même écran figé et rendent cinq fois la
 * même hauteur, ce qui a exactement l'air d'un résultat.
 */
const arrivee = await page.evaluate(() => ({
  age: document.querySelector('.header-sub')?.textContent?.trim().slice(0, 34) ?? 'sans en-tête',
  bloque: Boolean(document.querySelector('.overlay')),
}));
console.log(`mesuré à « ${arrivee.age} »${arrivee.bloque ? ' — ATTENTION : un voile bloque encore' : ''}\n`);

for (const onglet of ['Vie', 'Études', 'Gens', 'Avoirs', 'Agenda']) {
  const b = page.getByRole('button', { name: onglet, exact: true }).first();
  if (!(await b.count())) { console.log(`onglet « ${onglet} » introuvable`); continue; }
  await b.click({ force: true }).catch(() => {});
  await clearEvents();
  await look(onglet);
  await detail(onglet);
}

console.log('MENU'.padEnd(22), 'hauteur'.padStart(8), 'écrans'.padStart(7), 'sect'.padStart(5), 'lignes'.padStart(7), 'agit'.padStart(5), '1er geste'.padStart(10), 'muettes'.padStart(8));
for (const s of seen) {
  console.log(
    s.nom.padEnd(22), `${s.hauteur}px`.padStart(8), String(s.ecrans).padStart(7),
    String(s.sections).padStart(5), String(s.lignes).padStart(7), String(s.agit).padStart(5),
    (s.premierGeste < 0 ? 'aucun' : `${s.premierGeste}px`).padStart(10),
    String(s.fermeesMuettes).padStart(8),
  );
}

console.log('\n— ce que la bascule « Rapide / Détaillé » change réellement —');
const d = (k) => `${rapide[k]} → ${detaille[k]}`;
console.log(`  hauteur   ${d('hauteur')} px`);
console.log(`  sections  ${d('sections')}`);
console.log(`  lignes    ${d('lignes')}`);
console.log(`  agit      ${d('agit')}`);

/*
 * **Les plafonds, et pourquoi ils vivent ici.**
 *
 * Un test de source ne peut pas les tenir : les sections réservées au mode
 * Détaillé sont enveloppées par blocs, et compter les gardes ligne à ligne
 * annonce 19 sections toujours visibles là où le rendu en montre 12. Seule la
 * page ouverte dit la vérité, donc c'est ici que le plafond a sa place.
 *
 * `RAPIDE_MAX` est posé un peu au-dessus du relevé du jour — 8,7 écrans, contre
 * 15,5 avant que le quartier, le logement et le détail du foyer ne passent au
 * mode Détaillé. Il est fait pour descendre.
 *
 * `ECART_MIN` garde l'autre moitié de la correction : une bascule qui
 * n'écarterait plus les deux modes serait revenue au point de départ, où
 * « Rapide » promettait une simplification et livrait le même mur.
 */
const RAPIDE_MAX = 10;
const ECART_MIN = 1.6;
/*
 * **Le journal ne doit plus grandir avec l'âge.**
 *
 * C'était son défaut : 29 548 px à trente ans, soit 36,9 écrans, et une
 * année de plus à chaque tour — près de cent écrans à quatre-vingts ans, sur
 * l'écran qu'on voit le plus. Il déplie désormais les huit dernières années
 * et garde le reste à un appui.
 *
 * Le plafond vaut donc autant par sa valeur que par le fait qu'il tienne à
 * tout âge : relevé à 13,4 écrans à trente ans et 10,6 à soixante, la
 * différence ne venant plus que de ce qui s'est passé dans ces huit années.
 */
const VIE_MAX = 16;
/*
 * **Le plafond des onglets de jeu.**
 *
 * Une règle plutôt qu'une exception par menu : aucun onglet ne doit demander
 * plus de six écrans de défilement à trente ans. Relevé du jour — Vie 11,5
 * (borné par son dévoilement), Gens 4,8, Avoirs 2,1, Agenda 1,7, Études 1,8.
 *
 * « Vie » a son propre plafond parce que c'est un fil chronologique et non un
 * menu : on y remonte une vie, pas une liste de choix.
 */
const ONGLET_MAX = 6;
const ONGLETS = new Set(['Études', 'Gens', 'Avoirs', 'Agenda']);
const ecart = +(detaille.hauteur / rapide.hauteur).toFixed(2);
console.log(`  écart     ×${ecart}`);

const fautes = [];
if (rapide.ecrans > RAPIDE_MAX) {
  fautes.push(`le mode Rapide fait ${rapide.ecrans} écrans pour un plafond de ${RAPIDE_MAX}`);
}
if (ecart < ECART_MIN) {
  fautes.push(`la bascule n'écarte plus les deux modes que d'un facteur ${ecart} (minimum ${ECART_MIN})`);
}
for (const s of seen) {
  if (s.fermeesMuettes > 0) fautes.push(`${s.nom} : ${s.fermeesMuettes} ligne(s) fermée(s) sans raison`);
  if (s.nom === 'Vie' && s.ecrans > VIE_MAX) {
    fautes.push(`le journal fait ${s.ecrans} écrans pour un plafond de ${VIE_MAX}`);
  }
  if (ONGLETS.has(s.nom) && s.ecrans > ONGLET_MAX) {
    fautes.push(`l'onglet « ${s.nom} » fait ${s.ecrans} écrans pour un plafond de ${ONGLET_MAX}`);
  }
}

if (fautes.length > 0) {
  console.log('\n✗ ' + fautes.join('\n✗ '));
  process.exitCode = 1;
} else {
  console.log('\nLes menus tiennent leurs plafonds.');
}

await browser.close();
stop();
