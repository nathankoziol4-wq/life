/**
 * Génère `BITLIFE_GAMEPLAY_GAP_ANALYSIS.md` à partir de la matrice de parité.
 *
 * Le document n'est jamais écrit à la main : il est le reflet de
 * `src/data/parity.ts`, qui est lui-même rattaché au code par des tests. Un
 * audit rédigé séparément se périme en trois commits ; celui-ci se régénère.
 *
 *   npm run parity
 */

import { writeFileSync } from 'node:fs';
import { PARITY_MATRIX, nextPriorities, parityScore } from '../src/data/parity.ts';

const { domains, total } = parityScore();
const out = [];
const w = (line = '') => out.push(line);

const STATUS_LABEL = {
  COMPLETE: 'COMPLETE',
  PARTIAL: 'PARTIAL',
  MISSING: 'MISSING',
};

w('# Analyse des écarts de gameplay');
w();
w('> Document généré par `npm run parity` depuis `src/data/parity.ts`.');
w('> Ne pas le modifier à la main : la source est la matrice, et la matrice');
w('> est vérifiée par `src/engine/__bench__/parite.test.ts`, qui échoue si une');
w('> ligne se déclare présente en citant un symbole qui n’existe pas.');
w();
w('La référence fonctionnelle est un simulateur de vie complet du marché. Il');
w('ne s’agit pas d’en copier les textes, les visuels ni le code, mais');
w('d’atteindre la même profondeur : les mêmes types de possibilités, de');
w('sous-menus, d’interactions et de conséquences.');
w();

/* ---------------- Score ---------------- */
w('## Score de parité');
w();
w(`**Total : ${total} %**`);
w();
w('Le score mesure la profondeur atteinte rapportée à la profondeur attendue,');
w('pas le nombre de boutons. Une capacité prioritaire doit être profonde pour');
w('compter comme acquise ; une extension de confort peut rester légère.');
w();
w('| Domaine | Score | Complètes | Partielles | Absentes |');
w('| --- | ---: | ---: | ---: | ---: |');
for (const d of domains) {
  w(`| ${d.domain} | ${d.score} % | ${d.complete} | ${d.partial} | ${d.missing} |`);
}
w();

/* ---------------- Ordre de travail ---------------- */
w('## Ordre de travail recommandé');
w();
w('Priorité la plus haute d’abord, puis profondeur la plus faible : ce sont');
w('les écrans que le joueur ouvre le plus souvent et qui lui rendent le moins.');
w();
for (const e of nextPriorities(PARITY_MATRIX, 16)) {
  w(`${nextPriorities(PARITY_MATRIX, 16).indexOf(e) + 1}. **${e.domain} — ${e.feature}** (priorité ${e.priority}, profondeur ${e.depth}/5)`);
}
w();

/* ---------------- Détail par statut ---------------- */
for (const status of ['MISSING', 'PARTIAL', 'COMPLETE']) {
  const entries = PARITY_MATRIX.filter((e) => e.status === status);
  if (entries.length === 0) continue;

  w(`## ${STATUS_LABEL[status]} — ${entries.length} capacité${entries.length > 1 ? 's' : ''}`);
  w();
  if (status === 'MISSING') w('Rien dans le jeu ne couvre ces besoins.');
  if (status === 'PARTIAL') w('Présent, mais il manque des interactions ou des conséquences.');
  if (status === 'COMPLETE') w('Suffisamment poussé : ne rien casser en passant.');
  w();

  for (const e of entries) {
    w(`### ${e.domain} — ${e.feature}`);
    w();
    w(`*Priorité ${e.priority} · profondeur ${e.depth}/5*`);
    w();
    if (e.ours) w(`**Aujourd’hui :** ${e.ours}`);
    else w('**Aujourd’hui :** rien.');
    if (e.anchor) w(`  <br>*Code : \`${e.anchor}\`*`);
    w();
    if (e.missingInteractions?.length) {
      w('**Interactions manquantes**');
      w();
      for (const item of e.missingInteractions) w(`- ${item}`);
      w();
    }
    if (e.missingConsequences?.length) {
      w('**Conséquences manquantes**');
      w();
      for (const item of e.missingConsequences) w(`- ${item}`);
      w();
    }
    if (e.miniGame) {
      w(`**Mini-jeu attendu :** ${e.miniGame}`);
      w();
    }
  }
}

/* ---------------- Mini-jeux ---------------- */
const games = PARITY_MATRIX.filter((e) => e.miniGame);
w('## Mini-jeux à créer');
w();
w('Chacun doit remplir le même rôle fonctionnel que sa référence sans en');
w('reprendre le plateau, les graphismes ni les règles exactes.');
w();
w('| Domaine | Rôle | Statut |');
w('| --- | --- | --- |');
for (const e of games) w(`| ${e.domain} | ${e.miniGame} | ${e.status} |`);
w();

w('## Condition de fin');
w();
w('Une capacité n’est pas terminée quand un écran lui ressemble. Elle l’est');
w('quand elle est jouable, qu’elle produit des conséquences ailleurs, qu’elle');
w('est sauvegardée, qu’elle possède ses événements et qu’elle est testée.');
w();

writeFileSync(new URL('../BITLIFE_GAMEPLAY_GAP_ANALYSIS.md', import.meta.url), out.join('\n'));
console.log(`Analyse écrite — ${PARITY_MATRIX.length} capacités auditées, parité ${total} %.`);
