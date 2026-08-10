/**
 * Génère les quatre documents d'audit.
 *
 *   COMPLETE_GAMEPLAY_AUDIT.md   l'audit feuille par feuille
 *   PARITY_REPORT.md             les scores par domaine
 *   MINIGAME_COVERAGE.md         la couverture en mini-jeux
 *   GAMEPLAY_FEATURE_GRAPH.json  le graphe des connexions entre systèmes
 *
 * Aucun de ces fichiers ne s'écrit à la main. Ils sont le reflet de
 * `src/data/gameplayAudit.ts`, lui-même rattaché au code par des tests : une
 * feuille ne peut pas se déclarer aboutie en citant un symbole qui n'existe
 * pas, ni se déclarer incomplète sans dire ce qui lui manque.
 *
 *   npm run audit
 */

import { writeFileSync } from 'node:fs';
import {
  GAMEPLAY_AUDIT, auditProblems, byDepth, orphans, overallScore, scoreByDomain,
  workOrder,
} from '../src/data/gameplayAudit.ts';
import { allMiniGames } from '../src/engine/minigame.ts';
import '../src/systems/minigames/pickpocket.ts';
import '../src/systems/minigames/burglary.ts';
import '../src/systems/minigames/chase.ts';
import '../src/systems/minigames/escape.ts';

const out = (parts) => parts.join('\n');
const url = (name) => new URL(`../${name}`, import.meta.url);

/* ------------------------------------------------------------------ */
/* COMPLETE_GAMEPLAY_AUDIT.md                                          */
/* ------------------------------------------------------------------ */

const LEVELS = {
  MISSING: 'N’existe pas.',
  PLACEHOLDER: 'Un bouton, presque aucune mécanique derrière.',
  BASIC: 'Fonctionne, mais très superficiel : un tirage, un effet.',
  PARTIAL: 'Système intéressant, incomplet.',
  DEEP: 'Suffisamment développé : décisions, conséquences croisées.',
  INTERACTIVE: 'Le joueur agit lui-même, sa performance compte.',
};

function completeAudit() {
  const lines = [];
  const w = (line = '') => lines.push(line);
  const depths = byDepth();

  w('# Audit complet du gameplay');
  w();
  w('> Document généré par `npm run audit` depuis `src/data/gameplayAudit.ts`.');
  w('> Ne pas le modifier à la main.');
  w();
  w('La matrice de parité demande « cette capacité existe-t-elle ? ». Ce');
  w('document pose la question au niveau en dessous, celui qui compte :');
  w('**qu’est-ce que le joueur peut réellement faire ?**');
  w();
  w('On ne classe donc pas « Crime : complet ». On classe séparément le choix');
  w('de la cible, le mini-jeu, la jauge de méfiance, le butin, la fuite,');
  w('l’arrestation, le procès et le casier — chacun avec son niveau réel.');
  w();
  w('| Niveau | Ce que ça veut dire | Nombre |');
  w('| --- | --- | --- |');
  for (const [level, meaning] of Object.entries(LEVELS)) {
    w(`| **${level}** | ${meaning} | ${depths[level]} |`);
  }
  w();
  w(`**${GAMEPLAY_AUDIT.length} feuilles auditées · profondeur globale ${overallScore()} %**`);
  w();
  w('La profondeur globale pondère chaque feuille par son niveau : une feuille');
  w('absente vaut 0, un bouton vide 0,1, un système abouti 0,9, un mini-jeu 1.');
  w('Ce n’est pas un pourcentage d’avancement — c’est une moyenne de');
  w('profondeur, et elle descend quand on ajoute une feuille manquante à');
  w('l’audit. C’est voulu : mieux vaut un score honnête qui baisse qu’un score');
  w('flatteur obtenu en fermant les yeux.');
  w();

  const problems = auditProblems();
  if (problems.length > 0) {
    w('## Incohérences détectées');
    w();
    for (const problem of problems) w(`- ${problem}`);
    w();
  }

  const orphaned = orphans();
  w('## Fonctionnalités orphelines');
  w();
  if (orphaned.length === 0) {
    w('Aucune. Chaque fonctionnalité existante a au moins une conséquence dans');
    w('un autre système — on ne peut en retirer aucune sans que quelque chose');
    w('change ailleurs.');
  } else {
    for (const leaf of orphaned) w(`- **${leaf.domain} > ${leaf.leaf}** ne touche aucun autre système.`);
  }
  w();

  w('## Ordre de travail');
  w();
  w('Priorité d’abord, profondeur ensuite : à priorité égale, ce qui n’existe');
  w('pas du tout passe avant ce qui est seulement superficiel.');
  w();
  w('| # | Domaine | Feuille | Niveau | Ce qui manque |');
  w('| --- | --- | --- | --- | --- |');
  for (const [i, leaf] of workOrder(30).entries()) {
    w(`| ${i + 1} | ${leaf.domain} | ${leaf.system} > ${leaf.leaf} | ${leaf.depth} | ${leaf.gap ?? '—'} |`);
  }
  w();

  const domains = [...new Set(GAMEPLAY_AUDIT.map((l) => l.domain))];
  for (const domain of domains) {
    const leaves = GAMEPLAY_AUDIT.filter((l) => l.domain === domain);
    w(`## ${domain}`);
    w();
    w('| Système | Feuille | Niveau | Manque | Touche |');
    w('| --- | --- | --- | --- | --- |');
    for (const leaf of leaves) {
      w(`| ${leaf.system} | ${leaf.leaf} | **${leaf.depth}** | ${leaf.gap ?? '—'} | ${leaf.connects.join(', ') || '—'} |`);
    }
    w();
  }

  writeFileSync(url('COMPLETE_GAMEPLAY_AUDIT.md'), out(lines));
}

/* ------------------------------------------------------------------ */
/* PARITY_REPORT.md                                                    */
/* ------------------------------------------------------------------ */

function parityReport() {
  const lines = [];
  const w = (line = '') => lines.push(line);
  const scores = scoreByDomain();

  w('# Rapport de parité');
  w();
  w('> Document généré par `npm run audit` depuis `src/data/gameplayAudit.ts`.');
  w('> Ne pas le modifier à la main.');
  w();
  w('Ces pourcentages ne sont pas des estimations : ils sont calculés à partir');
  w('de la profondeur déclarée de chaque feuille de l’audit, et chaque feuille');
  w('non absente doit citer un symbole réellement exporté du projet.');
  w();
  w('```');
  for (const { domain, score, leaves } of [...scores].sort((a, b) => b.score - a.score)) {
    const bar = '█'.repeat(Math.round(score / 5)).padEnd(20, '░');
    w(`${domain.padEnd(22, '.')} ${bar} ${String(score).padStart(3)} %  (${leaves} feuilles)`);
  }
  w('');
  w(`${'GLOBAL'.padEnd(22, '.')} ${'█'.repeat(Math.round(overallScore() / 5)).padEnd(20, '░')} ${String(overallScore()).padStart(3)} %  (${GAMEPLAY_AUDIT.length} feuilles)`);
  w('```');
  w();
  w('## Comment lire ce tableau');
  w();
  w('Un domaine à 80 % n’est pas « presque fini » : c’est un domaine dont les');
  w('feuilles sont en moyenne profondes. Un domaine à 10 % contient surtout des');
  w('boutons et des absences.');
  w();
  w('Le score descend quand on découvre un manque et qu’on l’ajoute à l’audit.');
  w('C’est le comportement recherché.');
  w();

  w('## Les plus faibles, dans l’ordre');
  w();
  for (const { domain, score } of scores.slice(0, 8)) {
    const leaves = GAMEPLAY_AUDIT.filter(
      (l) => l.domain === domain && l.depth !== 'DEEP' && l.depth !== 'INTERACTIVE',
    );
    w(`### ${domain} — ${score} %`);
    w();
    for (const leaf of leaves) w(`- **${leaf.leaf}** (${leaf.depth}) — ${leaf.gap}`);
    w();
  }

  writeFileSync(url('PARITY_REPORT.md'), out(lines));
}

/* ------------------------------------------------------------------ */
/* MINIGAME_COVERAGE.md                                                */
/* ------------------------------------------------------------------ */

/**
 * Les actions qui *mériteraient* un mini-jeu.
 *
 * La liste est tenue à la main parce que c'est un jugement de conception :
 * toutes les actions n'en méritent pas un. Mais le statut, lui, est lu dans
 * le registre — on ne peut pas déclarer un mini-jeu qui n'existe pas.
 */
const MINIGAME_WISHLIST = [
  { action: 'Vol à la tire', game: 'pickpocket' },
  { action: 'Cambriolage', game: 'burglary' },
  { action: 'Fuite après un coup', game: 'chase' },
  { action: 'Évasion', game: 'escape' },
  { action: 'Émeute en détention', game: 'riot' },
  { action: 'Examen du permis', game: 'driving' },
  { action: 'Vol de véhicule', game: 'hotwire' },
  { action: 'Vol à l’étalage', game: 'shoplift' },
  { action: 'Braquage', game: 'heist' },
  { action: 'Entretien d’embauche', game: 'interview' },
  { action: 'Examen scolaire', game: 'exam' },
  { action: 'Concert', game: 'rhythm' },
  { action: 'Audition d’acteur', game: 'audition' },
  { action: 'Match sportif', game: 'sport' },
  { action: 'Séance photo', game: 'photoshoot' },
  { action: 'Mission spatiale', game: 'space' },
  { action: 'Enchères', game: 'auction' },
  { action: 'Jeux de casino', game: 'casino' },
  { action: 'Course hippique', game: 'horserace' },
  { action: 'Campagne électorale', game: 'campaign' },
];

function minigameCoverage() {
  const lines = [];
  const w = (line = '') => lines.push(line);
  const registered = new Map(allMiniGames().map((g) => [g.id, g]));

  w('# Couverture en mini-jeux');
  w();
  w('> Document généré par `npm run audit`. Ne pas le modifier à la main.');
  w();
  w('Une action importante devrait rarement se résoudre par « cliquer, tirer un');
  w('nombre, lire le résultat ». Ce tableau liste les actions qui méritent un');
  w('mini-jeu et dit lesquelles en ont un.');
  w();
  w('Le statut n’est pas déclaratif : il est lu dans le registre des mini-jeux.');
  w('On ne peut pas cocher une case sans que le jeu existe.');
  w();

  const done = MINIGAME_WISHLIST.filter((x) => registered.has(x.game)).length;
  w(`**${done} sur ${MINIGAME_WISHLIST.length} — ${Math.round((done / MINIGAME_WISHLIST.length) * 100)} %**`);
  w();
  w('| Action | Mini-jeu | Statut | Objectif |');
  w('| --- | --- | --- | --- |');
  for (const entry of MINIGAME_WISHLIST) {
    const game = registered.get(entry.game);
    w(`| ${entry.action} | \`${entry.game}\` | ${game ? '**INTERACTIVE**' : 'MISSING'} | ${game ? game.goal : '—'} |`);
  }
  w();
  w('## Ce qu’un mini-jeu doit respecter ici');
  w();
  w('- **aucune logique dans React** : un mini-jeu est un état et une fonction');
  w('  `step()`, si bien que les tests jouent des parties entières sans');
  w('  navigateur et vérifient que bien jouer paie ;');
  w('- **le personnage compte autant que le joueur** : la compétence donne du');
  w('  temps, de la marge et de l’information, elle ne joue pas à sa place ;');
  w('- **on peut ne pas jouer** : « Laisser faire » passe par exactement les');
  w('  mêmes conséquences ;');
  w('- **rejouable** : le plan est tiré au sort à chaque partie.');
  w();

  writeFileSync(url('MINIGAME_COVERAGE.md'), out(lines));
}

/* ------------------------------------------------------------------ */
/* GAMEPLAY_FEATURE_GRAPH.json                                         */
/* ------------------------------------------------------------------ */

function featureGraph() {
  const nodes = GAMEPLAY_AUDIT.map((leaf) => ({
    id: `${leaf.domain}/${leaf.system}/${leaf.leaf}`,
    domain: leaf.domain,
    system: leaf.system,
    leaf: leaf.leaf,
    depth: leaf.depth,
    priority: leaf.priority,
    anchor: leaf.anchor ?? null,
    gap: leaf.gap ?? null,
    connects: leaf.connects,
  }));

  // Combien de feuilles touchent chaque système : c'est ce qui révèle les
  // carrefours du jeu, et les systèmes que personne n'utilise.
  const incoming = {};
  for (const node of nodes) {
    for (const target of node.connects) incoming[target] = (incoming[target] ?? 0) + 1;
  }

  writeFileSync(url('GAMEPLAY_FEATURE_GRAPH.json'), `${JSON.stringify({
    generated: 'npm run audit — ne pas modifier à la main',
    leaves: nodes.length,
    overallDepth: overallScore(),
    byDepth: byDepth(),
    orphans: orphans().map((l) => `${l.domain}/${l.leaf}`),
    hubs: Object.entries(incoming)
      .sort((a, b) => b[1] - a[1])
      .map(([system, count]) => ({ system, incoming: count })),
    nodes,
  }, null, 2)}\n`);
}

/* ------------------------------------------------------------------ */

completeAudit();
parityReport();
minigameCoverage();
featureGraph();

console.log(
  `Audit écrit — ${GAMEPLAY_AUDIT.length} feuilles, profondeur ${overallScore()} %, `
  + `${byDepth().MISSING} absentes, ${orphans().length} orpheline(s), `
  + `${auditProblems().length} incohérence(s).`,
);
