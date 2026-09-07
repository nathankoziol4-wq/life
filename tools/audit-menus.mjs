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
    const rows = [...document.querySelectorAll('[data-row]')];
    const acts = rows.filter((r) => r.tagName === 'BUTTON' && !r.hasAttribute('data-closed'));
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
for (const onglet of ['Vie', 'Études', 'Gens', 'Avoirs', 'Agenda']) {
  const b = page.getByRole('button', { name: onglet, exact: true }).first();
  if (!(await b.count())) { console.log(`onglet « ${onglet} » introuvable`); continue; }
  await b.click({ force: true }).catch(() => {});
  await look(onglet);
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
}

if (fautes.length > 0) {
  console.log('\n✗ ' + fautes.join('\n✗ '));
  process.exitCode = 1;
} else {
  console.log('\nLes menus tiennent leurs plafonds.');
}

await browser.close();
stop();
