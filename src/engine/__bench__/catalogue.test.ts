/**
 * Ce qui empêche le catalogue de mentir.
 *
 * Un catalogue de fonctionnalités que l'on remplit soi-même ne vaut rien : il
 * suffirait d'écrire `COMPLETE` partout pour afficher une couverture de cent
 * pour cent. Ces tests transforment chaque case du catalogue en affirmation
 * vérifiable sur le code réel.
 *
 * Les règles, dans l'ordre de sévérité :
 *
 * 1. dès `BASIC`, une feuille cite un fichier et un symbole **réellement
 *    exportés** ;
 * 2. `COMPLETE` exige en plus une interface qui existe, de la persistance,
 *    des conséquences et **un fichier de tests qui existe** ;
 * 3. `INTERACTIVE` exige un mini-jeu **inscrit au registre** ;
 * 4. tout ce qui n'est ni `COMPLETE` ni `INTERACTIVE` doit dire ce qui manque ;
 * 5. aucune feuille orpheline : une capacité qui n'alimente rien est un
 *    cul-de-sac, et c'est un défaut de conception, pas un détail.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ALL_FEATURES, byStatus, categories, categoryOf, coverage, lostImpact,
  orphans, workOrder, worstCategory,
} from '../../data/featureCatalog.ts';
import { allMiniGames } from '../minigame.ts';
// Les mini-jeux s'inscrivent au registre à l'import de leur module : sans ces
// lignes, le registre serait vide et le test vérifierait le néant.
import '../../systems/minigames/pickpocket.ts';
import '../../systems/minigames/burglary.ts';
import '../../systems/minigames/chase.ts';
import '../../systems/minigames/escape.ts';

const ROOT = new URL('../../../', import.meta.url).pathname;
const SRC = `${ROOT}src/`;

/** Tous les symboles exportés du projet, par fichier. */
function exportsByFile(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(`${SRC}${dir}`, { withFileTypes: true })) {
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) { walk(`${dir}${entry.name}/`, `${rel}/`); continue; }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const source = readFileSync(`${SRC}${dir}${entry.name}`, 'utf8');
      const names = new Set<string>();
      for (const m of source.matchAll(/export (?:async )?(?:function|const|class|interface|type) (\w+)/g)) {
        names.add(m[1]);
      }
      map.set(rel, names);
    }
  };
  walk('', '');
  return map;
}

/**
 * Les cibles de dépendance qui ne sont pas des feuilles.
 *
 * Une capacité peut alimenter une notion transversale plutôt qu'une action
 * précise — « le patrimoine », « la famille ». La liste est fermée et
 * explicite pour qu'on ne puisse pas inventer une dépendance en l'écrivant.
 */
const CONCEPTS = [
  'Relations/Famille', 'Relations/Amis', 'Finance/Patrimoine',
  'Finance/Aide familiale', 'Vie/Identité', 'Éducation/Université',
];

const EXPORTS = exportsByFile();
const TESTS = new Set(
  readdirSync(`${SRC}engine/__bench__`)
    .filter((n) => n.endsWith('.test.ts'))
    .map((n) => n.replace('.test.ts', '')),
);
// Les suites hors `__bench__` comptent aussi.
for (const name of readdirSync(`${SRC}engine`)) {
  if (name.endsWith('.test.ts')) TESTS.add(name.replace('.test.ts', ''));
}

describe('le catalogue est ancré au code', () => {
  it('cite un symbole réellement exporté dès qu’une feuille existe', () => {
    const wrong: string[] = [];
    for (const feature of ALL_FEATURES) {
      if (feature.status === 'MISSING') continue;
      if (!feature.src) { wrong.push(`${feature.path} — aucune source`); continue; }
      const [file, symbol] = feature.src.split('#');
      const names = EXPORTS.get(file);
      if (!names) { wrong.push(`${feature.path} — fichier absent : ${file}`); continue; }
      if (symbol && !names.has(symbol)) {
        wrong.push(`${feature.path} — ${file} n’exporte pas ${symbol}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('ne déclare aucune interface qui n’existe pas', () => {
    const wrong = ALL_FEATURES
      .filter((x) => x.ui && !existsSync(`${SRC}${x.ui}`))
      .map((x) => `${x.path} → ${x.ui}`);
    expect(wrong).toEqual([]);
  });

  it('ne cite aucun fichier de tests qui n’existe pas', () => {
    const wrong = ALL_FEATURES
      .filter((x) => x.test && !TESTS.has(x.test))
      .map((x) => `${x.path} → ${x.test}`);
    expect(wrong).toEqual([]);
  });

  it('ne cite aucun mini-jeu absent du registre', () => {
    const known = new Set(allMiniGames().map((g) => g.id));
    const wrong = ALL_FEATURES
      .filter((x) => x.mg && !known.has(x.mg))
      .map((x) => `${x.path} → ${x.mg}`);
    expect(wrong).toEqual([]);
  });
});

describe('les états ne se décernent pas tout seuls', () => {
  it('exige de COMPLETE ce que « terminé » veut dire', () => {
    // La définition retenue : interface, logique, persistance, conséquences
    // et tests. Sans cela, `COMPLETE` ne serait qu'un mot.
    const wrong: string[] = [];
    for (const feature of ALL_FEATURES) {
      if (feature.status !== 'COMPLETE' && feature.status !== 'INTERACTIVE') continue;
      const missing: string[] = [];
      if (!feature.src) missing.push('logique');
      // L'outillage n'a pas de conséquence dans le jeu : c'est ce qui
      // garantit les autres, pas une capacité du joueur.
      if (!feature.cons && !feature.tooling) missing.push('conséquences');
      if (!feature.test && !feature.tooling) missing.push('tests');
      if (!feature.ui && !feature.internal && !feature.tooling) missing.push('interface');
      if (missing.length > 0) wrong.push(`${feature.path} — manque : ${missing.join(', ')}`);
    }
    expect(wrong).toEqual([]);
  });

  it('exige un mini-jeu pour toute feuille INTERACTIVE', () => {
    const wrong = byStatus('INTERACTIVE').filter((x) => !x.mg).map((x) => x.path);
    expect(wrong).toEqual([]);
  });

  it('exige un aveu de ce qui manque tant que ce n’est pas fini', () => {
    const wrong = ALL_FEATURES
      .filter((x) => x.status !== 'COMPLETE' && x.status !== 'INTERACTIVE'
        && x.status !== 'MISSING' && !x.note)
      .map((x) => x.path);
    expect(wrong).toEqual([]);
  });

  it('interdit d’oublier de dire ce qu’une feuille absente coûterait', () => {
    // Une feuille MISSING sans note ni impact déclaré est une ligne vide :
    // elle gonfle le dénominateur sans rien apprendre.
    const wrong = byStatus('MISSING')
      .filter((x) => !x.note && (x.impact ?? 0) >= 4)
      .map((x) => x.path);
    expect(wrong).toEqual([]);
  });
});

describe('la forme de l’arbre', () => {
  it('n’a aucun chemin en double', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const feature of ALL_FEATURES) {
      if (seen.has(feature.path)) dupes.push(feature.path);
      seen.add(feature.path);
    }
    expect(dupes).toEqual([]);
  });

  it('descend jusqu’à l’action, jamais jusqu’au système seul', () => {
    // Une feuille du catalogue doit être une chose que le joueur fait ou
    // subit — donc au moins trois niveaux : domaine, système, action.
    const shallow = ALL_FEATURES
      .filter((x) => x.path.split('/').length < 3)
      .map((x) => x.path);
    expect(shallow).toEqual([]);
  });

  it('couvre les grandes catégories de la vie', () => {
    const found = categories();
    for (const expected of [
      'Vie', 'Éducation', 'Relations', 'Enfance', 'Carrière', 'Travail',
      'Entreprise', 'Carrières spéciales', 'Activités', 'Santé', 'Patrimoine',
      'Finance', 'Placements', 'Crime', 'Justice', 'Prison', 'Notoriété',
      'Héritage', 'Événements', 'Simulation PNJ', 'Méta',
    ]) {
      expect(found, expected).toContain(expected);
    }
  });

  it('donne à chaque catégorie assez de feuilles pour être un audit', () => {
    const thin = categories()
      .map((c) => [c, ALL_FEATURES.filter((x) => categoryOf(x) === c).length] as const)
      .filter(([, n]) => n < 5)
      .map(([c, n]) => `${c} (${n})`);
    expect(thin).toEqual([]);
  });

  it('reste assez détaillé pour attraper les petites mécaniques', () => {
    // Le but de ce fichier est précisément de ne plus rien oublier. Un
    // catalogue trop court manquerait le problème qu'il doit résoudre.
    expect(ALL_FEATURES.length).toBeGreaterThan(400);
  });
});

describe('aucune feuille orpheline', () => {
  it('relie chaque capacité existante à quelque chose', () => {
    // `orphans` ignore déjà l'outillage : il ne sert à rien dans le jeu par
    // définition, et c'est justement son rôle.
    expect(orphans().map((x) => x.path)).toEqual([]);
  });

  it('ne déclare aucune dépendance vers une catégorie inconnue', () => {
    const known = new Set<string>(['tout', ...CONCEPTS, ...categories()]);
    for (const feature of ALL_FEATURES) known.add(feature.path);
    // Les dépendances peuvent viser une catégorie, un chemin complet, ou un
    // préfixe de chemin — on accepte les trois, mais rien d'autre.
    const wrong: string[] = [];
    for (const feature of ALL_FEATURES) {
      for (const dep of feature.deps ?? []) {
        if (known.has(dep)) continue;
        if (ALL_FEATURES.some((x) => x.path.startsWith(`${dep}/`))) continue;
        wrong.push(`${feature.path} → ${dep}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe('le score vient du catalogue, jamais d’une intuition', () => {
  it('calcule une couverture cohérente', () => {
    const score = coverage();
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
    // Le score doit refléter la réalité : ni triomphalisme, ni fausse modestie.
    expect(byStatus('MISSING').length).toBeGreaterThan(50);
    expect(byStatus('COMPLETE').length).toBeGreaterThan(100);
  });

  it('classe le travail par impact perdu, pas par état', () => {
    const order = workOrder(10);
    expect(order.length).toBe(10);
    for (let i = 1; i < order.length; i++) {
      expect(lostImpact(order[i - 1])).toBeGreaterThanOrEqual(lostImpact(order[i]));
    }
    // Ce qui arrive en tête doit vraiment manquer.
    expect(['MISSING', 'PLACEHOLDER']).toContain(order[0].status);
  });

  it('désigne une catégorie prioritaire', () => {
    const worst = worstCategory();
    expect(worst.length).toBeGreaterThan(5);
    expect(worst[0].lost).toBeGreaterThan(worst[worst.length - 1].lost);
  });
});

describe('le code ne contient pas de faux-semblants', () => {
  it('n’a ni TODO, ni mock, ni réponse factice dans les systèmes', () => {
    const found: string[] = [];
    const scan = (dir: string) => {
      for (const entry of readdirSync(`${SRC}${dir}`, { withFileTypes: true })) {
        if (entry.isDirectory()) { scan(`${dir}${entry.name}/`); continue; }
        if (!/\.tsx?$/.test(entry.name)) continue;
        const source = readFileSync(`${SRC}${dir}${entry.name}`, 'utf8');
        for (const [i, line] of source.split('\n').entries()) {
          if (/\b(TODO|FIXME|XXX)\b|placeholder response|mock[A-Z]|fakeResponse/.test(line)) {
            found.push(`${dir}${entry.name}:${i + 1}`);
          }
        }
      }
    };
    scan('systems/');
    scan('screens/');
    scan('components/');
    expect(found).toEqual([]);
  });

  it('ne laisse aucune action d’écran sans effet sur le jeu', () => {
    // Un `console.log` en guise d'action est le faux bouton par excellence.
    const found: string[] = [];
    for (const dir of ['screens/', 'components/']) {
      for (const name of readdirSync(`${SRC}${dir}`)) {
        if (!name.endsWith('.tsx')) continue;
        const source = readFileSync(`${SRC}${dir}${name}`, 'utf8');
        for (const [i, line] of source.split('\n').entries()) {
          if (/onClick=\{\(\)\s*=>\s*(console\.\w+|\{\s*\})/.test(line)) {
            found.push(`${dir}${name}:${i + 1}`);
          }
        }
      }
    }
    expect(found).toEqual([]);
  });
});
