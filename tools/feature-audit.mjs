/**
 * Génère les rapports d'audit à partir du catalogue.
 *
 * Aucun chiffre de ces fichiers n'est écrit à la main : tout est calculé
 * depuis `src/data/featureCatalog.ts`, dont chaque ligne est elle-même
 * vérifiée par `catalogue.test.ts` contre le code réel. C'est la seule façon
 * qu'un score de couverture veuille dire quelque chose.
 *
 *   npm run catalog
 */

import { writeFileSync } from 'node:fs';
import {
  ALL_FEATURES, STATUS_WEIGHT, byCategory, categories, categoryOf, coverage,
  lostImpact, orphans, workOrder, worstCategory,
} from '../src/data/featureCatalog.ts';
import { allMiniGames } from '../src/engine/minigame.ts';
import '../src/systems/minigames/pickpocket.ts';
import '../src/systems/minigames/burglary.ts';
import '../src/systems/minigames/chase.ts';
import '../src/systems/minigames/escape.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const pct = (x) => `${Math.round(x * 100)} %`;
const STATUSES = ['MISSING', 'PLACEHOLDER', 'BASIC', 'PARTIAL', 'COMPLETE', 'INTERACTIVE'];

/* ------------------------------------------------------------------ */
/* 1. Le catalogue, en JSON                                            */
/* ------------------------------------------------------------------ */

const catalog = {
  generated: 'npm run catalog',
  note: 'Fichier généré. La source est src/data/featureCatalog.ts, vérifiée par catalogue.test.ts.',
  totalFeatures: ALL_FEATURES.length,
  coverage: Number(coverage().toFixed(4)),
  statusWeights: STATUS_WEIGHT,
  features: ALL_FEATURES.map((x) => ({
    path: x.path,
    category: categoryOf(x),
    status: x.status,
    impact: x.impact ?? 3,
    lostImpact: Number(lostImpact(x).toFixed(2)),
    sourceSystem: x.src ?? null,
    UIAvailable: Boolean(x.ui),
    ui: x.ui ?? null,
    gameplayLogic: Boolean(x.src),
    persistence: Boolean(x.pers),
    consequences: Boolean(x.cons),
    events: Boolean(x.ev),
    NPCIntegration: Boolean(x.npc),
    minigame: x.mg ?? null,
    testing: x.test ?? null,
    internalRule: Boolean(x.internal),
    tooling: Boolean(x.tooling),
    feeds: x.deps ?? [],
    notes: x.note ?? null,
  })),
};
writeFileSync(`${ROOT}/reference-feature-catalog.json`, `${JSON.stringify(catalog, null, 2)}\n`);

/* ------------------------------------------------------------------ */
/* 2. Le graphe de dépendances                                         */
/* ------------------------------------------------------------------ */

const graph = { nodes: [], edges: [] };
for (const feature of ALL_FEATURES) {
  graph.nodes.push({
    id: feature.path,
    category: categoryOf(feature),
    status: feature.status,
    impact: feature.impact ?? 3,
  });
  for (const dep of feature.deps ?? []) {
    graph.edges.push({ from: feature.path, to: dep });
  }
}
graph.orphans = orphans().map((x) => x.path);
graph.mostDependedUpon = Object.entries(
  graph.edges.reduce((acc, e) => { acc[e.to] = (acc[e.to] ?? 0) + 1; return acc; }, {}),
).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([to, count]) => ({ target: to, count }));
writeFileSync(`${ROOT}/FEATURE_DEPENDENCIES.json`, `${JSON.stringify(graph, null, 2)}\n`);

/* ------------------------------------------------------------------ */
/* 3. L'audit courant                                                  */
/* ------------------------------------------------------------------ */

function table() {
  const rows = categories().map((category) => {
    const items = byCategory(category);
    const count = (s) => items.filter((x) => x.status === s).length;
    return {
      category,
      total: items.length,
      complete: count('COMPLETE') + count('INTERACTIVE'),
      partial: count('PARTIAL') + count('BASIC'),
      missing: count('MISSING') + count('PLACEHOLDER'),
      interactive: count('INTERACTIVE'),
      score: coverage(items),
    };
  }).sort((a, b) => a.score - b.score);
  return rows;
}

const rows = table();
const worst = worstCategory();

let md = `# Audit du jeu, feuille par feuille

*Généré par \`npm run catalog\` depuis \`src/data/featureCatalog.ts\`. Aucun
chiffre n'est écrit à la main : chaque ligne du catalogue est vérifiée contre
le code par \`catalogue.test.ts\`, qui échoue si une feuille cite un symbole,
un écran, un test ou un mini-jeu qui n'existe pas.*

**${ALL_FEATURES.length} feuilles auditées · couverture globale ${pct(coverage())}**

La couverture pondère chaque feuille par son impact : une capacité
structurante absente coûte plus qu'un détail. Elle monte quand on complète une
branche, et **elle descend quand on ajoute au catalogue une capacité qui
manquait** — c'est voulu : un audit qui ne peut que monter ne sert à rien.

## Ce que veut dire chaque état

| État | Poids | Définition |
| --- | --- | --- |
${STATUSES.map((s) => `| \`${s}\` | ${STATUS_WEIGHT[s]} | ${{
  MISSING: 'N’existe pas.',
  PLACEHOLDER: 'Un bouton ou un texte, presque rien derrière.',
  BASIC: 'Fonctionne, mais c’est un tirage et un effet.',
  PARTIAL: 'Un vrai système, dont des branches manquent.',
  COMPLETE: 'Interface, logique, persistance, conséquences, tests.',
  INTERACTIVE: 'Le joueur agit lui-même et sa performance compte.',
}[s]} |`).join('\n')}

## Par catégorie

| Catégorie | Feuilles | Terminées | Partielles | Absentes | Interactives | Couverture |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${rows.map((r) => `| ${r.category} | ${r.total} | ${r.complete} | ${r.partial} | ${r.missing} | ${r.interactive} | ${pct(r.score)} |`).join('\n')}
| **Total** | **${ALL_FEATURES.length}** | **${rows.reduce((s, r) => s + r.complete, 0)}** | **${rows.reduce((s, r) => s + r.partial, 0)}** | **${rows.reduce((s, r) => s + r.missing, 0)}** | **${rows.reduce((s, r) => s + r.interactive, 0)}** | **${pct(coverage())}** |

## Le prochain chantier

On ne traite pas les feuilles une par une : on termine **la catégorie qui perd
le plus d'impact**, en profondeur, puis la suivante.

| Rang | Catégorie | Impact perdu | Feuilles absentes |
| ---: | --- | ---: | ---: |
${worst.slice(0, 8).map((w, i) => `| ${i + 1} | ${w.category} | ${w.lost.toFixed(1)} | ${w.missing} |`).join('\n')}

## L'arbre complet

`;

const tree = {};
for (const feature of ALL_FEATURES) {
  const [cat, sys] = feature.path.split('/');
  ((tree[cat] ??= {})[sys] ??= []).push(feature);
}
for (const [cat, systems] of Object.entries(tree)) {
  md += `### ${cat}\n\n`;
  for (const [sys, items] of Object.entries(systems)) {
    md += `**${sys}**\n\n`;
    for (const x of items) {
      const leaf = x.path.split('/').slice(2).join(' / ');
      const proof = [
        x.src && `\`${x.src}\``,
        x.mg && `mini-jeu \`${x.mg}\``,
        x.test && `test \`${x.test}\``,
      ].filter(Boolean).join(' · ');
      md += `- \`${x.status}\` ${leaf}${proof ? ` — ${proof}` : ''}${x.note ? ` *(${x.note})*` : ''}\n`;
    }
    md += '\n';
  }
}
writeFileSync(`${ROOT}/CURRENT_GAME_FEATURE_AUDIT.md`, md);

/* ------------------------------------------------------------------ */
/* 4. Ce qui manque                                                    */
/* ------------------------------------------------------------------ */

const order = workOrder(60);
let missing = `# Ce qui manque

*Généré par \`npm run catalog\`. Trié par **impact perdu** — l'impact déclaré
de la feuille multiplié par ce qui lui manque pour être finie — et non par
état : une capacité structurante à moitié faite pèse plus qu'un détail absent.*

**${ALL_FEATURES.filter((x) => x.status === 'MISSING').length} feuilles absentes,
${ALL_FEATURES.filter((x) => x.status === 'PLACEHOLDER' || x.status === 'BASIC').length} à peine ébauchées,
${ALL_FEATURES.filter((x) => x.status === 'PARTIAL').length} incomplètes.**

## Ordre de travail

| Rang | Impact perdu | État | Feuille | Ce qui manque |
| ---: | ---: | --- | --- | --- |
${order.map((x, i) => `| ${i + 1} | ${lostImpact(x).toFixed(1)} | \`${x.status}\` | ${x.path} | ${x.note ?? '—'} |`).join('\n')}

## Toutes les feuilles absentes, par catégorie

`;
for (const category of categories()) {
  const items = byCategory(category).filter((x) => x.status === 'MISSING');
  if (items.length === 0) continue;
  missing += `### ${category} (${items.length})\n\n`;
  for (const x of items.sort((a, b) => (b.impact ?? 3) - (a.impact ?? 3))) {
    missing += `- **${x.path.split('/').slice(1).join(' / ')}** — impact ${x.impact}${x.note ? ` · ${x.note}` : ''}\n`;
  }
  missing += '\n';
}
writeFileSync(`${ROOT}/MISSING_GAMEPLAY.md`, missing);

/* ------------------------------------------------------------------ */
/* 5. Les mini-jeux                                                    */
/* ------------------------------------------------------------------ */

const registered = allMiniGames();
const wanted = ALL_FEATURES.filter(
  (x) => x.mg || /[Mm]ini-jeu/.test(x.path) || /[Mm]ini-jeu/.test(x.note ?? ''),
);
let mini = `# Les mini-jeux

*Généré par \`npm run catalog\`. Un mini-jeu veut dire : **le joueur contrôle
quelque chose**. Une animation suivie d'un tirage n'en est pas un, et
n'apparaît pas comme tel ici.*

## Inscrits au registre (${registered.length})

| Identifiant | Où il sert |
| --- | --- |
${registered.map((g) => {
  const uses = ALL_FEATURES.filter((x) => x.mg === g.id).map((x) => x.path);
  return `| \`${g.id}\` | ${uses.length ? uses.join('<br>') : '— *inscrit mais jamais utilisé*'} |`;
}).join('\n')}

## Ce qui devrait en avoir un

| État | Feuille | Note |
| --- | --- | --- |
${wanted.filter((x) => !x.mg).map((x) => `| \`${x.status}\` | ${x.path} | ${x.note ?? '—'} |`).join('\n')}

## La règle

- **jouer ou simuler** : tout mini-jeu répétitif doit pouvoir être passé, et
  la simulation doit produire un résultat cohérent avec le niveau du
  personnage ;
- **le résultat combine** la compétence du personnage, la performance du
  joueur, la difficulté et le contexte — le hasard pèse peu ;
- **l'échec compte** : rater doit avoir des suites réelles, sinon le mini-jeu
  est une animation.
`;
writeFileSync(`${ROOT}/MINIGAME_AUDIT.md`, mini);

/* ------------------------------------------------------------------ */
/* 6. La profondeur d'interaction                                      */
/* ------------------------------------------------------------------ */

const depth = (x) => {
  let n = 0;
  if (x.ui) n = 1;             // un menu
  if (x.ui && x.src) n = 2;    // une sélection qui mène à quelque chose
  if (x.src && x.cons) n = 3;  // des actions avec des effets
  if (x.ev || x.mg) n = 4;     // un moment joué ou un événement
  if (x.cons && x.pers) n = 5; // des conséquences qui restent
  if (x.deps && x.deps.length > 1 && x.pers) n = 6; // un impact long
  return n;
};
const LEVELS = [
  'aucune interaction',
  'un menu',
  'une sélection',
  'des actions avec effets',
  'un moment joué',
  'des conséquences persistantes',
  'un impact sur le reste de la vie',
];

let inter = `# Profondeur d'interaction

*Généré par \`npm run catalog\`. On mesure, pour chaque feuille existante,
jusqu'où va la chaîne : menu → sélection → actions → moment joué →
conséquences → impact durable. Une feuille qui s'arrête au menu est un
affichage, pas du gameplay.*

| Niveau | Ce que ça veut dire | Feuilles |
| ---: | --- | ---: |
${LEVELS.map((label, i) => {
  const n = ALL_FEATURES.filter((x) => x.status !== 'MISSING' && depth(x) === i).length;
  return `| ${i} | ${label} | ${n} |`;
}).join('\n')}

## Les feuilles qui s'arrêtent trop tôt

Existantes, mais dont la chaîne s'interrompt avant les conséquences durables.

| Niveau | État | Feuille | Note |
| ---: | --- | --- | --- |
${ALL_FEATURES.filter((x) => x.status !== 'MISSING' && !x.tooling && depth(x) < 4)
    .sort((a, b) => (b.impact ?? 3) - (a.impact ?? 3))
    .slice(0, 40)
    .map((x) => `| ${depth(x)} | \`${x.status}\` | ${x.path} | ${x.note ?? '—'} |`).join('\n')}

## Intégration des PNJ

${ALL_FEATURES.filter((x) => x.npc).length} feuilles font réellement intervenir
un personnage non joueur. Les systèmes qui devraient en avoir et n'en ont pas :

${ALL_FEATURES.filter((x) => x.status !== 'MISSING' && !x.npc && !x.tooling && !x.internal
    && /Relations|Camarades|Collègues|Locataires|Organisé|Enfants|Amour/.test(x.path))
    .map((x) => `- ${x.path}`).join('\n') || '- *aucune*'}
`;
writeFileSync(`${ROOT}/INTERACTION_AUDIT.md`, inter);

console.log(
  `Catalogue écrit — ${ALL_FEATURES.length} feuilles, couverture ${pct(coverage())}, `
  + `${ALL_FEATURES.filter((x) => x.status === 'MISSING').length} absentes, `
  + `${orphans().length} orpheline(s). Prochain chantier : ${worst[0].category} `
  + `(${worst[0].lost.toFixed(1)} d’impact perdu).`,
);
