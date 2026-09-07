/**
 * Une ligne fermée doit dire pourquoi.
 *
 * **Ce que la mesure a trouvé.** Le jeu compte environ cent cinquante lignes
 * qui peuvent se fermer. Une seule ne disait pas pourquoi : l'avocat de
 * divorce qu'on ne peut pas payer, dans `RelationshipsScreen`. Elle devenait
 * grise, son clic disparaissait, et le joueur restait devant une option morte
 * sans savoir ce qui lui manquait.
 *
 * **Pourquoi c'est un défaut de vocabulaire, pas de rédaction.** `Row` rend
 * `because` *à la place* de `sub` quand `closed` est vrai (`list.tsx`) : une
 * ligne fermée sans raison ne perd pas seulement son explication, elle perd
 * aussi la note qu'elle affichait ouverte. Le silence est donc pire que
 * l'absence — l'écran retire de l'information au moment précis où le joueur
 * en a le plus besoin.
 *
 * Ce test lit la source plutôt que le rendu : le rendu ne montre que les
 * lignes qu'une partie donnée fait apparaître, et une branche rarement
 * atteinte est exactement celle qui se serait fait oublier.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;

/** Tous les fichiers d'écran et de composant, à plat. */
function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...sources(path));
    else if (entry.name.endsWith('.tsx')) out.push(path);
  }
  return out;
}

/**
 * Les attributs de chaque `<Row …>` d'un fichier.
 *
 * On avance à la main plutôt qu'avec une expression régulière : un attribut
 * peut contenir des accolades, une ternaire, un `>` de comparaison, et une
 * régie qui s'arrêterait au premier `>` rencontré couperait la balise en
 * plein milieu — donc raterait le `because` qui vient après.
 */
function rowsOf(code: string): string[] {
  const out: string[] = [];
  for (let i = code.indexOf('<Row'); i !== -1; i = code.indexOf('<Row', i + 1)) {
    // « <RowSomething » n'est pas « <Row ».
    if (/[A-Za-z]/.test(code[i + 4] ?? '')) continue;
    let depth = 0;
    let j = i + 4;
    for (; j < code.length; j += 1) {
      const c = code[j]!;
      if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      else if (depth === 0 && c === '>') break;
    }
    out.push(code.slice(i, j));
  }
  return out;
}

describe('les lignes fermées', () => {
  const files = [...sources('screens'), ...sources('ui')];

  it('disent toutes pourquoi elles le sont', () => {
    const mute: string[] = [];
    let closed = 0;
    for (const file of files) {
      const code = readFileSync(join(ROOT, file), 'utf8');
      for (const row of rowsOf(code)) {
        if (!row.includes('closed=')) continue;
        closed += 1;
        if (row.includes('because=')) continue;
        const title = row.match(/title=(?:"([^"]*)"|\{([^}]*)\})/);
        mute.push(`${file} — ${title?.[1] ?? title?.[2] ?? '(sans titre)'}`);
      }
    }
    // Le compte sert de garde-fou au garde-fou : si l'analyse cessait de
    // reconnaître les balises, elle trouverait zéro ligne fermée et le test
    // passerait en ne mesurant plus rien.
    expect(closed, 'plus aucune ligne fermée trouvée : l’analyse a cassé')
      .toBeGreaterThan(100);
    expect(
      mute,
      `ces lignes se ferment sans dire pourquoi :\n  ${mute.join('\n  ')}`,
    ).toEqual([]);
  });

  /**
   * `Row` pose `onClick={closed ? undefined : onClick}` : une ligne fermée
   * avale son geste. Une ligne qui doit rester actionnable une fois fermée
   * met donc son bouton dans `right` — ce que ce test ne peut pas vérifier,
   * mais dont la raison affichée est la contrepartie minimale.
   */
  it('gardent le vocabulaire qui rend ce test vrai', () => {
    const list = readFileSync(join(ROOT, 'ui/components/list.tsx'), 'utf8');
    expect(list, 'Row n’affiche plus `because` à la place de `sub`')
      .toContain('closed && because ? because : sub');
    expect(list, 'Row ne retire plus le clic d’une ligne fermée')
      .toContain('closed ? undefined : onClick');
  });
});
