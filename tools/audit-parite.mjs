/**
 * L'inventaire de ce que le jeu propose, avant et après une migration d'écran.
 *
 * §134. Une refonte d'interface fait disparaître des fonctionnalités sans que
 * personne s'en aperçoive : un écran réécrit oublie une ligne, et la ligne
 * oubliée est une action que le joueur ne peut plus faire alors que le système
 * derrière fonctionne toujours. Le document `UI_FEATURE_PARITY.md` le dit
 * depuis le début — mais un document ne vérifie rien.
 *
 * Cet outil relève **toutes les lignes du jeu**, écran par écran : le libellé,
 * la section qui le contient, si l'on peut appuyer dessus, si elle est ouverte
 * ou fermée, et la raison affichée quand elle est fermée. Il écrit
 * `.parite/inventaire.json`, et le compare au témoin versionné dans
 * `tools/parite-temoin.json`.
 *
 * Il ne relevait d'abord que les boutons, ce qui paraissait la même chose et
 * ne l'était pas : une ligne qu'un écran refuse perd souvent son geste, donc
 * sa balise de bouton, donc sa place ici. La moitié de la surface du jeu
 * manquait — dont, très exactement, les refus que ce fichier existe pour
 * surveiller.
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

  /*
   * **Une ligne refusée n'est pas toujours un bouton.**
   *
   * Le relevé ne cherchait que « button, [role=button], a[href] ». Or un
   * écran qui refuse une ligne écrit couramment « onClick={raison ?
   * undefined : … } », et la ligne devient alors un simple bloc : hors de
   * l'arbre d'accessibilité, et hors de cet inventaire. Le garde-fou censé
   * surveiller les refus était donc aveugle à la moitié d'entre eux — les
   * trois lignes « aller voir ailleurs » de la boutique et les deux du
   * grenier n'ont jamais figuré dans un témoin, alors qu'elles portent
   * précisément le genre d'explication que cet outil existe pour protéger.
   *
   * « [data-row] » les rattrape sans rien supposer de leur balise.
   */
  for (const el of top.querySelectorAll('button, [role="button"], a[href], [data-row]')) {
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
      // Tout ce qui est relevé n'est pas un geste : le bilan financier est
      // fait de lignes qui n'affichent qu'un montant. Elles comptent quand
      // même — perdre une ligne de bilan, c'est perdre une information —
      // mais les mélanger aux actions ferait mentir le total.
      acts: el.matches('button, [role="button"], a[href]'),
      // **Muette** : le navigateur la retire de l'arbre d'accessibilité.
      // « acts » ne suffit pas à dire qu'une ligne est annoncée — un
      // « button disabled » est bien un bouton et n'est pourtant lu par
      // aucune voix de synthèse. Les deux façons de faire taire une ligne
      // sont donc comptées séparément : lui retirer sa balise de bouton, et
      // lui poser l'attribut du navigateur.
      mute: el.disabled === true,
      // Une **ligne**, par opposition à un bouton de formulaire. Le contrat
      // n'est pas le même : « Emprunter 0 kr » désactivé pendant qu'aucun
      // montant n'est saisi est l'usage normal de l'attribut, et son libellé
      // dit déjà l'état. Une ligne de liste, elle, porte une explication que
      // le joueur doit pouvoir lire.
      row: el.hasAttribute('data-row'),
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

/*
 * **Combien de lignes ouvrir par onglet.**
 *
 * Six pour tous, au départ — un plafond posé pour borner la durée de la
 * marche. Il bornait aussi ce qu'elle voyait, et cela ne se remarque pas :
 * l'onglet « Avoirs » porte **onze** lignes, donc concession, garage,
 * collections, boutique et possessions n'étaient dans aucun témoin. Quatre
 * des refus de cet écran vivent précisément là. C'est le troisième angle
 * mort du même genre après l'établissement scolaire et les tuiles de
 * l'agenda, et les trois ont été trouvés de la même façon : en vérifiant la
 * couverture avant de toucher à l'écran.
 *
 * Le plafond reste bas pour « Gens », et pour une raison différente : cette
 * liste est homogène. Ouvrir la douzième personne montre la fiche déjà vue
 * onze fois, avec un autre prénom. Ailleurs, chaque ligne est un panneau
 * distinct — les borner, c'est ne pas les regarder.
 */
const ROW_BUDGET = { Gens: 6 };
const ROWS_DEFAULT = 14;
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
  /*
   * **Le préfixe vaut aussi pour l'onglet lui-même.**
   *
   * Cette ligne s'écrivait `inventory[label]`, sans préfixe, alors que les
   * feuilles qu'elle ouvre en portaient un. Chaque passe écrasait donc les
   * cinq écrans d'onglet de la précédente : le témoin ne contenait pas les
   * onglets de la première partie et ceux de la seconde, il contenait deux
   * fois ceux de la **dernière**, sous des noms qui laissaient croire au
   * contraire. Cinquante-trois amitiés, une scolarité et un patrimoine
   * n'étaient comparés à rien.
   *
   * Le défaut ne pouvait pas se voir avec deux passes — les deux parties
   * étant scolarisées, les écrans se ressemblaient assez. La troisième l'a
   * mis en évidence en même temps qu'elle en aggravait l'effet.
   */
  inventory[`${prefix}${label}`] = await page.evaluate(INVENTORY);

  // Puis chaque feuille que l'écran ouvre : c'est là que vivent la plupart
  // des actions, et une migration qui perd une feuille perd beaucoup.
  // `data-row` plutôt qu'une classe : viser « button.row » avait cessé
  // d'ouvrir les feuilles du premier écran migré, en silence, et
  // l'inventaire rétrécissait sans qu'une action ait bougé.
  const ROWS = '.app-body button[data-row]';
  const rows = await page.locator(ROWS).all();
  const budget = ROW_BUDGET[label] ?? ROWS_DEFAULT;
  for (let i = 0; i < Math.min(rows.length, budget); i++) {
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

/**
 * Ouvre les lignes **d'une feuille déjà ouverte**, et relève chaque
 * sous-feuille qu'elles font apparaître.
 *
 * `walkTabs` ne descend que d'un cran : un onglet, puis les feuilles que ses
 * lignes ouvrent. Tout ce qui vit un cran plus bas — le détail d'un objet de
 * famille, celui d'un bien — n'était atteint que par la passe écrite à la
 * main pour l'établissement scolaire. C'est cette passe-là, rendue générale :
 * le prochain écran à ce niveau n'aura pas besoin d'une troisième copie.
 *
 * **Une vue plus profonde n'est pas toujours une feuille de plus.** Premier
 * jet : on comparait le nombre de feuilles empilées avant et après l'appui.
 * L'établissement scolaire empile, donc cela marchait ; les collections
 * *remplacent* la feuille — `if (shown) return <Sheet …>` — si bien que le
 * compte ne bougeait pas et que la marche relevait zéro vue de détail sans
 * rien signaler. Un parcours qui ne trouve rien et n'en dit rien est le même
 * défaut que celui qu'il est censé attraper.
 *
 * Le titre de la feuille du dessus sert donc d'identité : s'il a changé, on
 * est ailleurs, que la feuille se soit empilée ou substituée.
 */
async function walkSheet(prefix, max = 12) {
  const ROWS = '.sheet button[data-row]';
  const TITLE = '.sheet:last-of-type .sheet-title';
  const titleOf = async () => (
    (await page.locator(TITLE).last().textContent().catch(() => '')) ?? ''
  ).replace(/\s+/g, ' ').trim();
  const depth = await page.locator('.sheet').count();
  const before = await titleOf();
  const count = await page.locator(ROWS).count();
  for (let i = 0; i < Math.min(count, max); i++) {
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
    const deeper = (await page.locator('.sheet').count()) > depth;
    if (deeper || (await titleOf()) !== before) {
      inventory[`${prefix}${name}`] = await page.evaluate(INVENTORY);
      const back = page.locator('.sheet-back');
      if (await back.count()) { await back.last().click({ force: true }); await page.waitForTimeout(300); }
    }
  }
  /*
   * On ne se plaint que d'une chose : **n'avoir rien trouvé à ouvrir**.
   *
   * Première version : elle se plaignait aussi d'avoir ouvert des lignes
   * sans relever de vue. Cela paraissait attraper le défaut des collections,
   * où la marche relevait zéro sans rien dire — mais c'est indistinguable
   * d'un écran plat, qui n'a simplement pas de sous-feuilles. La tribune et
   * le service en sont, et l'avertissement se déclenchait sur deux écrans
   * parfaitement sains. Ce fichier le dit plus haut à propos des classes :
   * un garde-fou qui hurle au faux positif est pire qu'aucun, on apprend à
   * ne plus le lire. Un sélecteur qui ne trouve rien, en revanche, est sans
   * ambiguïté — c'est exactement la cécité silencieuse qu'on veut voir.
   */
  if (count === 0) missed.push(`${prefix}aucune ligne à ouvrir`);
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
    await walkSheet('élève · établissement › ', 10);
  }
}

/* ------------------------------------------------------------------ */
/* Une famille qui a gardé des choses, sur une troisième partie        */
/* ------------------------------------------------------------------ */

/*
 * **Deux parties pauvres ne montrent pas ce qu'on possède.**
 *
 * Les deux sauvegardes précédentes sont celles d'adolescents sans rien : sur
 * l'onglet Avoirs, « mes biens », « mon garage », « mes possessions » et
 * « mes emprunts » sont fermés dans les deux, donc leurs quatre panneaux
 * n'ont jamais été ouverts. On mesurait la parité d'un écran de patrimoine
 * sur des personnages qui n'ont pas de patrimoine.
 *
 * Et les collections tiennent le même raisonnement en plus net : un objet de
 * famille ne se voit qu'avec le temps, si bien que le détail d'un objet — ce
 * qu'il a traversé, le faire reprendre, le donner, le vendre — n'était
 * atteignable par aucune des deux.
 *
 * Cette partie-ci a treize objets, une maison et de quoi vivre. Elle ouvre
 * ce que les deux autres ne pouvaient que laisser fermé.
 */
await loadSave(fixture('fixture-heritage.mjs'));
await clearEvents();
await walkTabs('riche · ');

// Puis le détail d'un objet de famille, qui vit un cran plus bas que tout ce
// que la marche par onglets atteint.
await closeSheets();
const avoirs = page.locator('.tab-item').filter({ hasText: 'Avoirs' }).first();
if (await avoirs.count()) {
  await avoirs.click();
  await page.waitForTimeout(420);
  await clearEvents();
  const collections = page
    .getByRole('button', { name: /Ce que la famille a gardé/ }).first();
  if (!(await collections.count())) missed.push('« Ce que la famille a gardé » introuvable');
  else {
    await collections.click({ force: true });
    await page.waitForTimeout(520);
    await clearEvents();
    await walkSheet('riche · collections › ', 6);
  }
}

/* ------------------------------------------------------------------ */
/* Un patron, sur une quatrième partie                                 */
/* ------------------------------------------------------------------ */

/*
 * **Trois parties sans entreprise ne montrent que le catalogue.**
 *
 * `VentureScreen.tsx` est quatre écrans en un : on choisit un métier, ou on
 * le tient ; on choisit une entreprise, ou on la tient. Les trois parties
 * précédentes n'en possèdent aucune, si bien que seules les deux moitiés
 * « choisir » étaient relevées — deux catalogues de lignes grisées. Tout ce
 * qui fait la profondeur de l'écran — le tarif, les commandes, l'effectif, le
 * gérant, la caisse, la revente, la fermeture — n'était sous aucun témoin.
 *
 * Celle-ci tient un café depuis six exercices et vend son temps à côté, avec
 * des commandes en attente. C'est le même raisonnement que pour l'héritage :
 * un écran de gestion se mesure sur quelqu'un qui a quelque chose à gérer.
 *
 * Elle apporte en prime le seul personnage d'âge mûr du lot — les trois
 * autres ont 17, 17 et 29 ans.
 */
await loadSave(fixture('fixture-patron.mjs'));
await clearEvents();
await walkTabs('patron · ');

/* ------------------------------------------------------------------ */
/* Les carrières qui ne s'atteignent pas par hasard                    */
/* ------------------------------------------------------------------ */

/*
 * **Deux mille cent lignes d'écran derrière treize lignes de catalogue.**
 *
 * Quatre écrans — la scène, le service, la tribune, la couronne — totalisent
 * 2 144 lignes. Ce que les quatre parties du parcours en montraient : six
 * entrées pour « jouer, chanter, courir, poser, convaincre », sept pour
 * « l'armée, l'espace, le service », et **rien du tout** pour les deux
 * autres. Leurs sections sont conditionnelles : sans mandat et sans maison
 * régnante, la tribune et la couronne ne s'affichent pas — ce qui est le bon
 * comportement, et ce qui les rendait invisibles à la mesure.
 *
 * Un mandat demande des années de métier politique et un scrutin gagné ;
 * naître dans une maison régnante tient à la graine, à peu près une vie sur
 * cent cinquante. Aucune partie jouée normalement n'y arrive.
 *
 * Les quatre sauvegardes existaient déjà, fabriquées pour les captures
 * d'écran. On ne refait pas un tour complet pour chacune — ce serait quatre
 * minutes de plus pour cinq onglets qu'on a déjà vus quatre fois. On va
 * droit à la section concernée.
 */
async function visitSection({ save, prefix, tab, section, depth = 10 }) {
  await loadSave(fixture(save));
  await clearEvents();
  await closeSheets();
  const t = page.locator('.tab-item').filter({ hasText: tab }).first();
  if (!(await t.count())) { missed.push(`${prefix}onglet ${tab} introuvable`); return; }
  await t.click({ force: true });
  await page.waitForTimeout(460);
  await clearEvents();
  /*
   * La ligne porte un libellé qui dépend de la partie — « Te présenter »,
   * « Ta campagne », ou le nom du mandat détenu. On vise donc la section, qui
   * ne bouge pas, plutôt que le libellé, qui bouge.
   *
   * Mais on vise son **titre**, pas son contenu. `hasText` cherche dans tout
   * le sous-arbre : viser « Placements » attrapait la carte « Patrimoine »,
   * qui affiche une statistique portant ce mot, et qui ne contient aucune
   * ligne. La visite se terminait alors sur « section sans ligne » — signalé,
   * heureusement, par le garde-fou ajouté juste avant.
   */
  const heading = page.locator('.section-title, .ui-section-head, h2, h3')
    .filter({ hasText: section });
  const holder = page.locator('.section, .ui-section').filter({ has: heading }).first();
  if (!(await holder.count())) { missed.push(`${prefix}section « ${section} » absente`); return; }
  const entry = holder.locator('button[data-row]').first();
  if (!(await entry.count())) { missed.push(`${prefix}section « ${section} » sans ligne`); return; }
  await entry.scrollIntoViewIfNeeded().catch(() => {});
  await entry.click({ force: true }).catch(() => {});
  await page.waitForTimeout(560);
  await clearEvents();
  if (!(await page.locator('.sheet').count())) {
    missed.push(`${prefix}« ${section} » n'a ouvert aucune feuille`);
    return;
  }
  inventory[prefix.replace(/ · $/, '')] = await page.evaluate(INVENTORY);
  await walkSheet(prefix, depth);
}

await visitSection({
  save: 'fixture-scene.mjs', prefix: 'scène · ', tab: 'Études', section: 'Sur scène',
});
await visitSection({
  save: 'fixture-elu.mjs', prefix: 'tribune · ', tab: 'Études', section: 'La tribune',
});
await visitSection({
  save: 'fixture-couronne.mjs', prefix: 'couronne · ', tab: 'Études', section: 'La maison',
});
await visitSection({
  save: 'fixture-service.mjs', prefix: 'service · ', tab: 'Études', section: 'Servir',
});
/*
 * Et le portefeuille, pour la même raison que l'entreprise et les objets de
 * famille : les quatre parties du parcours ne détiennent **rien**. La moitié
 * haute de l'écran — ce qu'on détient, la ligne bloquée, la répartition, la
 * vente — n'était donc jamais relevée. La sauvegarde existait déjà mais
 * s'arrêtait à « de quoi placer » : elle gardait la première vie assez riche
 * et n'achetait rien. Elle place maintenant pour de vrai, par `invest`.
 */
await visitSection({
  save: 'fixture-placements.mjs', prefix: 'placements · ', tab: 'Avoirs', section: 'Placements',
});

/* ------------------------------------------------------------------ */
/* Avant qu'une partie existe                                          */
/* ------------------------------------------------------------------ */

/*
 * **Le seul écran qu'aucune sauvegarde ne peut atteindre.**
 *
 * `CreationScreen.tsx` fait 886 lignes et s'affiche *avant* qu'une partie
 * existe : `App` montre l'accueil tant que `state` est nul. Tout le parcours
 * ci-dessus charge une sauvegarde puis recharge la page — il ne peut donc,
 * par construction, jamais y arriver. Ni `walkTabs` ni les visites ciblées ne
 * conviennent non plus : ces écrans-là ne vivent pas dans `.app-body` et
 * n'ont pas d'onglets.
 *
 * On fait donc l'inverse de tout le reste : on **efface** la sauvegarde.
 *
 * **Et l'on fige le hasard.** L'écran tire sa graine par `randomSeed()`, donc
 * par `Math.random()`, et tout ce qu'il affiche en découle : la ville, le
 * logement, les loisirs à portée. Deux exécutions identiques donnaient 33
 * disparitions et 24 apparitions — un témoin qui hurle au faux positif à
 * chaque passage, c'est-à-dire un témoin qu'on apprend à ne plus lire. On
 * remplace donc `Math.random` par une suite fixe, dans la page et sans
 * toucher au jeu : l'écran reste celui du joueur, il montre simplement
 * toujours le même tirage.
 *
 * Cette passe vient en dernier, puisqu'elle laisse le navigateur sans partie.
 */
await page.addInitScript(() => {
  let n = 0x2f6e_2b1;
  Math.random = () => {
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    return ((n >>> 0) % 1_000_000) / 1_000_000;
  };
});
await page.evaluate(() => { localStorage.removeItem('odyssia.save.v1'); });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(900);
await clearEvents();
inventory['accueil'] = await page.evaluate(INVENTORY);

for (const [name, label] of [
  ['création', /Choisir son point de départ/],
  ['création · nom et pays', /Juste un nom et un pays/],
]) {
  const enter = page.getByRole('button', { name: label }).first();
  if (!(await enter.count())) { missed.push(`accueil : « ${label.source} » introuvable`); continue; }
  await enter.click({ force: true });
  await page.waitForTimeout(560);
  await clearEvents();
  inventory[name] = await page.evaluate(INVENTORY);

  // Le mode détaillé double l'écran : chaque réglage y explique ce qu'il
  // change. Sans ce clic, la moitié de la création reste hors du témoin.
  const detail = page.getByRole('button', { name: 'Détaillé' }).first();
  if (await detail.count()) {
    await detail.click({ force: true });
    await page.waitForTimeout(520);
    await clearEvents();
    inventory[`${name} · détaillé`] = await page.evaluate(INVENTORY);
  }

  // Retour à l'accueil pour la porte suivante : recharger est plus sûr que
  // de deviner par où l'écran se referme.
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  await clearEvents();
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
const acts = [...now.values()].filter((i) => i.acts).length;
/*
 * **Les lignes fermées que personne n'annonce**, des deux façons possibles :
 * lui retirer sa balise de bouton, ou lui poser l'attribut `disabled` du
 * navigateur. Les deux la sortent de l'arbre d'accessibilité, et « acts » ne
 * suffisait pas à les distinguer — un `button disabled` est bien un bouton.
 *
 * Restreint aux lignes : un bouton de formulaire désactivé tant que la saisie
 * est invalide est l'usage normal de l'attribut, et son libellé dit l'état.
 */
const silent = [...now.values()]
  .filter((i) => i.row && i.closed && (!i.acts || i.mute)).length;
const count = `${total} entrées relevées, dont ${acts} actionnables`
  + ` · ${silent} refus muets`;

if (updateWitness) {
  writeFileSync(WITNESS, JSON.stringify(inventory, null, 2));
  console.log(`témoin écrit : ${count}, dans ${Object.keys(inventory).length} vues`);
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

console.log(`inventaire : ${count} · témoin : ${before.size}`);
if (missed.length > 0) for (const line of missed) console.log(`  non ouvert : ${line}`);
console.log(`disparues : ${lost.length} · ajoutées : ${added.length}`
  + ` · changées d'état : ${flipped.length}`);
for (const line of flipped.slice(0, 20)) console.log(`  ~ ${line}`);
for (const key of lost.slice(0, 40)) console.log(`  − ${key}`);
for (const key of added.slice(0, 40)) console.log(`  + ${key}`);

/*
 * Deux façons d'échouer désormais. La seconde est nouvelle : le compte des
 * refus muets est tombé à zéro au fil des migrations, et une mesure arrivée à
 * zéro ne vaut que si elle y reste. Elle devient donc une barrière plutôt
 * qu'un chiffre dans un rapport.
 */
if (silent > 0) console.log(`${silent} refus muets — une ligne fermée doit rester annoncée`);
process.exit(lost.length > 0 || silent > 0 ? 1 : 0);
