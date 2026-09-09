/**
 * Le jeu d'icônes, tenu par un test.
 *
 * **Ce qu'il remplace.** Le jeu emploie 1 599 emoji répartis sur 462 formes
 * distinctes. Un emoji rend différemment sur chaque plateforme — un contrat
 * qu'on ne maîtrise pas — il ne prend pas la couleur du texte, et son style
 * figuratif jure avec une interface au trait.
 *
 * **Où en est la migration.** Elle est finie : les 1 599 usages ont leur
 * dessin, portés par 134 tracés — un tracé sert souvent plusieurs emoji,
 * parce que `🏆 🏅 🎖️ 🎗️` disent tous « distinction » et méritent le même
 * signe. Le repli sur l'emoji reste en place dans `Glyph` : il rattrape le jour où un
 * écran neuf emploie un signe qu'on n'a pas encore dessiné.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SOURCE = readFileSync(join(ROOT, 'ui/components/Icon.tsx'), 'utf8');

/** Les tracés définis, lus dans le fichier lui-même. */
const paths = new Set(
  [...SOURCE.slice(SOURCE.indexOf('const PATHS'), SOURCE.indexOf('const FROM_EMOJI'))
    .matchAll(/^\s{2}([a-z]+):\s*'/gm)].map((m) => m[1]!),
);

/** La table emoji → nom de tracé. */
const mapping = new Map(
  [...SOURCE.slice(SOURCE.indexOf('const FROM_EMOJI'), SOURCE.indexOf('/** Le dessin correspondant'))
    .matchAll(/'([^']+)':\s*'([a-z]+)'/g)].map((m) => [m[1]!, m[2]!]),
);

/**
 * Tous les emoji du jeu, avec leur nombre d'usages.
 *
 * **Quatre écritures, et quatre fois le même piège.** Un écran écrit
 * `emoji="🏠"` sur une ligne ; une table de données déclare `{ emoji: '🌾' }` ;
 * une expression calcule `emoji={marge > 0 ? '📈' : '📉'}` ; et les événements,
 * eux, disent `icon: '🎗️'` — un autre mot pour la même chose.
 *
 * Chaque fois, le relevé était propre, complet, et faux. La dernière écriture
 * a été trouvée sur une capture d'écran : un emoji jaune de 42 px au centre
 * d'une modale, dans une interface entièrement au trait. Deux cent quatorze
 * usages, dont trente-neuf sans dessin, et c'est l'élément le plus regardé du
 * jeu après le fil de vie.
 *
 * **Et le pire : l'extension.** Ces tables vivent en `.ts`, pas en `.tsx` :
 * `systems/`, `data/`, `engine/newLife.ts`. Un recensement limité aux `.tsx`
 * a annoncé 100 % de couverture alors que la vraie mesure était 72 %, parce
 * que la plus grosse population d'emoji du projet était hors du champ. Un
 * dénominateur trop petit ne se voit jamais dans le résultat — il donne un
 * chiffre plausible, rond, et rassurant.
 */
const ECRITURES = [
  /emoji="([^"]+)"/g,
  /emoji: '([^']+)'/g,
  /\bicon="([^"]+)"/g,
  /\bicon: '([^']+)'/g,
];

/**
 * La troisième écriture, trouvée après les deux autres.
 *
 * `emoji={marge > 14 ? '🟢' : '🔴'}` — une expression, pas une constante.
 * Elle contient plusieurs signes à la fois, et aucune des deux formes ci-
 * dessus ne l'attrape. Quatre-vingt-six formes s'y cachaient. C'est la
 * troisième fois de suite que ce recensement se croyait complet ; d'où la
 * règle qu'il applique maintenant — on lit l'expression entière, puis on en
 * extrait tout ce qui est un pictogramme, sans présumer de sa place.
 */
const EXPRESSION = /\b(?:emoji|icon)=\{([^}]*)\}/g;
const PICTOGRAMME = /\p{Extended_Pictographic}/u;

/**
 * Ce que l'analyse ne doit pas lire.
 *
 * `Icon.tsx` porte la table de correspondance et des commentaires qui citent
 * les deux écritures ; ce fichier-ci en cite d'autres dans sa propre prose.
 * Un outil qui se lit lui-même mesure son commentaire — le projet a déjà eu
 * ce défaut deux fois (`jetons.mjs`, `contraste.mjs`), et il produit toujours
 * un résultat crédible.
 */
const HORS_CHAMP = /(^|\/)(__bench__|Icon\.tsx)/;

/**
 * Ce qui n'a rien à faire dans le compte.
 *
 * Une poignée d'écrans passent une puce typographique — `·`, `•`, `—`, `…` —
 * là où une ligne n'a pas de signe propre. Aucun des trois défauts de l'emoji
 * ne les touche : elles rendent pareil partout, prennent la couleur du texte,
 * et n'ont pas de style figuratif. Leur donner un dessin serait une perte
 * sèche — une puce deviendrait un tiret, qui ne dit pas la même chose. Elles
 * sortent donc du dénominateur au lieu de peser sur un plancher qu'elles
 * n'ont aucune raison de faire baisser.
 */
const PONCTUATION = new Set(['·', '•', '—', '…', '⋯']);

function usages(): Map<string, number> {
  const out = new Map<string, number>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      if (HORS_CHAMP.test(path)) continue;
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        const source = readFileSync(join(ROOT, path), 'utf8');
        const compter = (signe: string) => {
          if (PONCTUATION.has(signe)) return;
          out.set(signe, (out.get(signe) ?? 0) + 1);
        };
        for (const forme of ECRITURES) {
          for (const m of source.matchAll(forme)) compter(m[1]!);
        }
        for (const m of source.matchAll(EXPRESSION)) {
          for (const q of m[1]!.matchAll(/'([^']+)'/g)) {
            if (PICTOGRAMME.test(q[1]!)) compter(q[1]!);
          }
        }
      }
    }
  };
  walk('');
  return out;
}

describe('le jeu d’icônes', () => {
  /**
   * **Le défaut le plus discret de tout ce système.**
   *
   * `Icon` rend `null` quand le nom ne correspond à aucun tracé. Une faute de
   * frappe dans la table ne casse donc rien : la ligne s'affiche, simplement
   * son signe a disparu. Aucun autre test ne verrait ce blanc.
   */
  it('ne renvoie à aucun tracé qui n’existe pas', () => {
    const orphelins = [...mapping].filter(([, name]) => !paths.has(name));
    expect(
      orphelins.map(([e, n]) => `${e} → ${n}`),
      'ces emoji pointent vers un tracé inexistant : la ligne perdrait son signe en silence',
    ).toEqual([]);
  });

  /**
   * Et l'inverse : un tracé que personne n'emploie est du poids mort. Ce n'est
   * pas une faute, mais le savoir évite de dessiner dans le vide.
   */
  it('n’accumule pas de tracés que personne n’emploie', () => {
    const employes = new Set(mapping.values());
    const inutilises = [...paths].filter((n) => !employes.has(n));
    expect(
      inutilises,
      `ces tracés ne sont reliés à aucun emoji : ${inutilises.join(', ')}`,
    ).toEqual([]);
  });

  /*
   * **Le plancher de couverture.**
   *
   * Relevé du jour : 462 emoji reliés, 1 599 usages sur 1 599, soit 100 %.
   *
   * Le plancher est fixé à 95 et non à 100 pour une raison précise : un écran
   * neuf qui emploie un signe encore jamais dessiné doit pouvoir être écrit,
   * lu et relu sans que la suite passe au rouge — le repli sur l'emoji tient
   * l'écran debout pendant ce temps. Cinq points, c'est quatre-vingts usages :
   * de quoi voir venir un écran, pas de quoi laisser l'interface repartir en
   * emoji. Le baisser demande un commit qui dise pourquoi.
   */
  const FLOOR = 95;

  it('couvre la quasi-totalité des signes du jeu', () => {
    const all = usages();
    let total = 0;
    let drawn = 0;
    for (const [emoji, n] of all) {
      total += n;
      if (mapping.has(emoji)) drawn += n;
    }
    const pct = Math.round((drawn / total) * 100);
    // Garde-fou du garde-fou : une analyse cassée ne trouverait aucun usage
    // et le pourcentage n'aurait plus de sens.
    expect(total, 'plus aucun emoji trouvé dans les écrans : l’analyse a cassé')
      .toBeGreaterThan(300);
    expect(
      pct,
      `${drawn} usages dessinés sur ${total} (${pct} %) pour un plancher de ${FLOOR} %`,
    ).toBeGreaterThanOrEqual(FLOOR);
  });

  /**
   * Le style ne se négocie pas d'une icône à l'autre : même grille, même
   * trait, aucun remplissage, et la couleur prise au texte. Une icône qui
   * s'en écarterait se verrait immédiatement dans une liste.
   */
  it('garde un style unique', () => {
    expect(SOURCE).toContain("viewBox=\"0 0 24 24\"");
    expect(SOURCE).toContain("stroke: 'currentColor'");
    expect(SOURCE).toContain("fill: 'none'");
  });

  /**
   * **Ce qui restait de l'ancien codage par la couleur seule.**
   *
   * Six écrans distinguaient deux ou trois états avec `🟢 🟡 🔴 🔵 ⚪ ⬜` :
   * des disques de forme identique dont toute l'information tenait à la
   * teinte. Un homme sur douze est daltonien ; pour lui ces lignes étaient
   * muettes, et elles l'étaient aussi pour n'importe qui en noir et blanc.
   * WCAG 1.4.1 le nomme : la couleur ne doit jamais être le seul véhicule
   * d'une information.
   *
   * Ils sont remplacés par des formes qui se distinguent sans couleur —
   * flèche montante, tiret, flèche descendante ; cercle vide, cercle plein.
   * La teinte reste, sur l'icône, comme *second* canal.
   *
   * Ce test interdit le retour du premier : rien n'empêcherait un écran neuf
   * d'écrire `emoji="🟢"`, et le défaut serait de nouveau invisible à tout le
   * reste de l'outillage.
   */
  it('n’emploie plus de pastille dont la couleur serait la seule information', () => {
    const pastilles = new Set(['🟢', '🟡', '🔴', '🔵', '🟠', '🟣', '⚪', '⬛', '⬜']);
    const fautives = [...usages().keys()].filter((signe) => pastilles.has(signe) && signe !== '⚪');
    expect(
      fautives,
      'ces signes ne se distinguent que par leur teinte : un joueur daltonien ne les lit pas',
    ).toEqual([]);
  });
});
