/**
 * Génère `GAMEPLAY_MISSING_FEATURES_V2.md`.
 *
 * Comme l'analyse des écarts, ce document n'est jamais écrit à la main : il
 * est le reflet de `src/systems/interactiveAudit.ts`, lui-même rattaché au
 * registre des mini-jeux par un test.
 *
 *   npm run audit:interactif
 */

import { writeFileSync } from 'node:fs';
import { auditInteractiveGameplay, nextInteractive } from '../src/systems/interactiveAudit.ts';
import { allMiniGames } from '../src/engine/minigame.ts';
// Les mini-jeux s'inscrivent au registre en étant importés.
import '../src/systems/minigames/pickpocket.ts';
import '../src/systems/minigames/burglary.ts';
import '../src/systems/minigames/chase.ts';
import '../src/systems/minigames/escape.ts';
import '../src/systems/minigames/performance.ts';
import '../src/systems/minigames/docking.ts';
import '../src/systems/minigames/table.ts';
import '../src/systems/minigames/attic.ts';
import '../src/systems/minigames/yard.ts';
import '../src/systems/minigames/walkabout.ts';
import '../src/systems/minigames/infiltration.ts';
import '../src/systems/minigames/exam.ts';

const { entries, problems, score, byLevel } = auditInteractiveGameplay();
const out = [];
const w = (line = '') => out.push(line);

w('# Ce que le joueur peut faire, et ce qu’il ne fait que lire');
w();
w('> Document généré par `npm run audit:interactif` depuis');
w('> `src/systems/interactiveAudit.ts`. Ne pas le modifier à la main.');
w();
w('La matrice de parité demande « cette fonctionnalité existe-t-elle ? ».');
w('Ce document pose une autre question : **le joueur a-t-il quelque chose à');
w('faire, ou seulement quelque chose à lire ?**');
w();
w('| Niveau | Ce que ça veut dire |');
w('| --- | --- |');
w('| **INTERACTIVE** | Un mini-jeu : le joueur agit, sa performance compte. |');
w('| **ARBITRÉE** | Pas de mini-jeu, mais des décisions dont le résultat dépend. |');
w('| **PASSIVE** | Un bouton, un tirage, un texte à lire. |');
w();
w(`**Score d’interactivité : ${score} %**`);
w();
w(`${byLevel.INTERACTIVE} interactives · ${byLevel.ARBITRÉE} arbitrées · ${byLevel.PASSIVE} passives`);
w();
w('Une action arbitrée compte pour une demi-action interactive : décider n’est');
w('pas jouer, mais c’est déjà beaucoup mieux que lire.');
w();

if (problems.length > 0) {
  w('## Incohérences détectées');
  w();
  for (const problem of problems) w(`- ${problem}`);
  w();
}

w('## Ordre de travail');
w();
for (const [i, entry] of nextInteractive(12).entries()) {
  w(`${i + 1}. **${entry.domain} — ${entry.action}** (${entry.level}, priorité ${entry.priority})`);
  if (entry.gap) w(`   <br>*Manque : ${entry.gap}*`);
}
w();

for (const level of ['PASSIVE', 'ARBITRÉE', 'INTERACTIVE']) {
  const list = entries.filter((e) => e.level === level);
  if (list.length === 0) continue;
  w(`## ${level} — ${list.length} action${list.length > 1 ? 's' : ''}`);
  w();
  w('| Domaine | Action | Manque |');
  w('| --- | --- | --- |');
  for (const entry of list) {
    w(`| ${entry.domain} | ${entry.action} | ${entry.gap ?? (entry.miniGame ? `mini-jeu \`${entry.miniGame}\`` : '—')} |`);
  }
  w();
}

w('## Mini-jeux inscrits');
w();
const games = allMiniGames();
if (games.length === 0) {
  w('Aucun pour l’instant.');
} else {
  w('| Identifiant | Catégorie | Objectif |');
  w('| --- | --- | --- |');
  for (const game of games) w(`| \`${game.id}\` | ${game.category} | ${game.goal} |`);
}
w();
w('Chaque mini-jeu est une fonction `step()` sans interface : les tests jouent');
w('des parties entières sans navigateur, et « Résoudre automatiquement » passe');
w('par exactement la même résolution que le jeu manuel.');
w();

writeFileSync(new URL('../GAMEPLAY_MISSING_FEATURES_V2.md', import.meta.url), out.join('\n'));
console.log(`Audit interactif écrit — ${entries.length} actions, ${score} % d’interactivité, ${problems.length} incohérence(s).`);
